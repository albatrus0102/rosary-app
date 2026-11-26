/* main.js — 앱 코어: 렌더러, 카메라, 내 아바타 상태 기계(걷기·앉기·서기), 다른 사람 보기, 이벤트 보고.
   호스트 연결은 bridge.js(Room3D). 장면(빌더)은 ch_<id>.js 가 RoomBuilders 에 등록한다. */
(function (root) {
  'use strict';
  var T = root.THREE, PI = Math.PI;
  var post = root.RoomBridge.post;
  var qs = (function () { var o = {}; try { new URLSearchParams(root.location.search).forEach(function (v, k) { o[k] = v; }); } catch (e) { /* ignore */ } return o; })();

  var canvas = document.getElementById('c');
  var App = {
    started: false, quality: 'high', qMode: 'auto', renderer: null, scene: null, camera: null, world: null, logic: null,
    maxFrames: +(qs.frames || 0), frameCount: 0, done: false, me: null, meAv: null, ctl: null, net: null, cfg: { g: 0, skin: 1, style: 0, hair: 2, outfit: 6, label: '' },
    near: { seat: null }, markers: null, frames: 0, perfT: 0, t: 0, last: 0, wasMoving: false, stepT: 0, fps: 60,
    camPos: new T.Vector3(), camLook: new T.Vector3(), camInit: false, sitF: 0, spot: null, spotF: 0, spotYaw: 0, spotSeat: false, spotKind: null, avA: 1,
    camCfg: { auto: true, dist: 1, follow: true }, room: 'house', hostSeats: {}, pose: null
  };
  root.__room = App;

  var Pace = root.RoomFramePace ? root.RoomFramePace.create({ enabled: qs.pace !== '0' }) : { div: 1, frames: 0, tick: function () { this.frames++; }, work: function () {}, snap: function (r) { return r; } };
  App.pace = Pace;

  function wrap(a) { if (!(a > -1e9 && a < 1e9)) return 0; a = (a + PI) % (PI * 2); if (a < 0) a += PI * 2; return a - PI; }
  function setQMode(q) { App.qMode = q === 'low' || q === 'mid' || q === 'high' ? q : 'auto'; App.quality = App.qMode === 'auto' ? 'high' : App.qMode; }
  function autoOn() { return App.qMode === 'auto' && qs.autotier !== '0'; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function pixelRatio() {
    var d = root.devicePixelRatio || 1, TT = root.RoomRender && root.RoomRender.TIERS, tc = TT ? TT[App.quality === 'low' ? 'low' : (App.quality === 'mid' ? 'mid' : 'high')] : null;
    return Math.min(d, tc ? tc.maxDpr : 2);
  }
  function resize() {
    if (!App.renderer) return;
    var w = root.innerWidth || 360, h = root.innerHeight || 640;
    App.R.resize(w, h, pixelRatio());
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    App.camera.aspect = w / h;
    App.camera.fov = w / h < 0.8 ? 62 : 52;   // 세로 화면에서는 시야를 넓힌다
    applyInset(w, h);
    App.camera.updateProjectionMatrix();
    kick();
  }
  // 아래 패널(호스트 UI)이 덮는 비율만큼 그림을 위로 옮긴다(투영 오프셋)
  function applyInset(w, h) {
    var b = App.inset || 0;
    if (b > 0) App.camera.setViewOffset(w, h, 0, h * b * 0.72, w, h); else App.camera.clearViewOffset();
  }
  function kick() {
    if (!App.started || App.paused) return;
    if (App.rafOn && performance.now() - (App.loopT || 0) < 1000) return;
    App.rafOn = true; App.last = performance.now(); App.loopT = App.last;
    requestAnimationFrame(loop);
  }
  root.addEventListener('resize', resize);
  root.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  if (document.addEventListener) document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  function groundFn(logic) { return logic && logic.multi ? function (x, z, y) { return logic.floorY(x, z, y + 0.2); } : null; }
  function setNear(seat) {
    if (seat === App.near.seat) return;
    App.near.seat = seat;
    if (App.world) App.world.setHighlight(seat);
  }
  // 좌석이 찼나: 화면에 보이는 사람(net) 또는 호스트가 알려 준 점유(setSeats)
  function isTaken(id) {
    if (!App.logic) return false;
    var i = App.logic.seatIndex(id), hs = App.hostSeats[i];
    if (hs && hs.taken && !hs.mine) return true;
    return App.net.isTaken(id);
  }
  function seatSpots(w) {
    return w.logic.seats.map(function (s, i) { return { kind: 'seat', index: i, x: s.x, z: s.z, y: w.logic.seatFloor(s.id), label: (w.layout.seatLabels && w.layout.seatLabels[i]) || ('자리 ' + (i + 1)), labelY: 1.35 }; });
  }
  // 표식 숨김: 찬 자리·내 자리, 그리고 나와 다른 쪽(실내/바깥)에 있는 자리(벽 너머로 이름표가 떠 보이지 않게)
  function refreshMarkers() {
    if (!App.markers || !App.logic) return;
    var meIn = App.me ? roomDepth(App.me.x, App.me.z) > -0.2 : true;
    App.logic.seats.forEach(function (s, i) { App.markers.setHidden(i, isTaken(s.id) || (App.me && App.me.seat === s.id) || (roomDepth(s.x, s.z) > 0) !== meIn); });
  }

  function loadWorld(id) {
    if (App.markers) { App.markers.dispose(); App.markers = null; }
    if (App.world) { App.world.dispose(); App.world = null; }
    App.aoHoldT = 0;
    var w = root.RoomWorld.create(App.scene, { room: id, quality: App.R.tier, hour: App.hourInit, renderer: App.renderer });
    if (App.R.envTex) w.setEnvironment(App.R.envTex);
    if (App.fixedClock) w.setClock(false);
    App.world = w; App.logic = w.logic; App.room = w.id;
    App.net.setLogic(w.logic);
    if (App.meAv.setGround) App.meAv.setGround(groundFn(w.logic));
    var sp = w.layout.spawn, me = App.me;
    me.x = sp.x; me.z = sp.z; me.yaw = sp.r || 0; me.fy = w.logic.floorY(sp.x, sp.z, sp.y === undefined ? null : sp.y); me.y = me.fy; me.vx = 0; me.vz = 0; me.mode = 'walk'; me.seat = null;
    App.net.setMySeat(null);
    App.ctl.yaw = me.yaw; App.camInit = false;
    App.meAv.setSeated(false);
    App.near.seat = undefined;
    if (!qs.thumb && qs.markers !== '0') App.markers = root.RoomMarkers.create(w.group, seatSpots(w), w.logic);
    // 커피 카운터(coffee.js — 장면 layout.coffee 가 있을 때만): 바리스타·내 컵·다른 사람 컵
    App.coffee = null;
    try { if (root.RoomCoffee && w.layout.coffee) { App.coffee = root.RoomCoffee.create(App, post); if (App.coffee && App.net.setCupHook) App.net.setCupHook(App.coffee.syncPeer); } } catch (e) { frameErr('coffee', e); }
    refreshMarkers();
    if (App.pending) { var pd = App.pending; App.pending = null; if (pd.garden) hook('garden', pd.garden); if (pd.skin) hook('skin', pd.skin); Object.keys(pd.panels || {}).forEach(function (k) { hook('panel', k, pd.panels[k]); }); }
    kick();
    if (console && console.log && qs.verbose) console.log('[room] world ' + w.id + ' stats', JSON.stringify(w.stats));
  }
  // 빌더 고리(builder.hooks: garden(list) · panel(id, data) · skin(name)): 장면이 없으면 기억해 두었다가 지은 뒤 적용
  function hook(name, a, b) {
    var hk = App.world && App.world.hooks;
    if (!hk) { var P = App.pending = App.pending || { panels: {} }; if (name === 'panel') P.panels[a] = b; else P[name] = a; return; }
    if (typeof hk[name] === 'function') { try { hk[name](a, b); } catch (e) { root.RoomBridge.jsError('hook', name + ': ' + (e && e.message), '', 0); } kick(); }
  }

  function start(o) {
    o = o || {};
    if (o.avatar) App.cfg = o.avatar;
    if (o.quality) setQMode(o.quality);
    App.hourInit = o.hour === undefined ? (new Date().getHours() + new Date().getMinutes() / 60) : +o.hour;
    var room = o.room || qs.room || 'house';
    if (!App.started) {
      App.started = true;
      try {
        App.R = root.RoomRender.create(canvas, { quality: App.quality, autoTier: autoOn() });
        App.renderer = App.R.renderer;
      } catch (e) {
        if (console && console.error) console.error('[room] WebGL init failed', e);
        post({ e: 'glFail', msg: String((e && e.message) || e).slice(0, 200) });
        App.started = false; return;
      }
      App.scene = new T.Scene();
      App.camera = new T.PerspectiveCamera(52, 1, 0.3, 700);
      App.ctl = root.RoomControls.create(canvas);
      App.ctl.onTap = function (x, y) { tapAt(x, y); };
      App.me = { x: 0, z: 0, y: 0, yaw: 0, vx: 0, vz: 0, mode: 'walk', seat: null, t: 0, fx: 0, fz: 0, fyaw: 0, tx: 0, tz: 0, tyaw: 0, pendingStand: false, speed: 0 };
      App.meAv = new root.RoomAvatar.Avatar(App.cfg, { self: true });
      App.scene.add(App.meAv.root);
      root.RoomRenderUtil.markCaster(App.meAv.root);
      App.net = root.RoomNetView.create(App.scene);
      App.net.setSeatOffset(function (id) { return App.world ? App.world.seatOffset(id) : null; });
      App.pose = root.RoomNetView.createPoseSender({ hz: o.poseHz || 3, send: function (p) { p.e = 'myPose'; post(p); } });
      App.rafOn = true; App.loopT = performance.now();
      resize();
      watchStart();
      loadWorld(room);
      App.last = performance.now();
      requestAnimationFrame(loop);
    } else {
      App.meAv.setConfig(App.cfg);
      if (room !== App.room) loadWorld(room);
      resize();
    }
    if (o.hour !== undefined) App.world.setHour(+o.hour);
    if (o.fixedClock) { App.fixedClock = true; App.world.setClock(false); }
    if (o.camera) applyCamCfg(o.camera);
    // 시험용 URL 초기 자세
    if (qs.x !== undefined && qs.z !== undefined) { App.me.x = +qs.x; App.me.z = +qs.z; }
    if (qs.yaw !== undefined) { App.ctl.yaw = (+qs.yaw) * PI / 180; App.me.yaw = App.ctl.yaw; }
    if (qs.pitch !== undefined) App.ctl.pitch = (+qs.pitch) * PI / 180;
    if (qs.cam) setViewMode(qs.cam);
    if (qs.zoom !== undefined) App.ctl.zoom = +qs.zoom;
    if (qs.look !== undefined) App.ctl.look = Math.max(0, Math.min(1.35, (+qs.look) * PI / 180 || 0));
    if (qs.thumb !== undefined) {   // 썸네일 카메라(빌더 thumbs[n] 또는 thumb): 아바타 숨김
      App.meAv.root.visible = false;
      var B = App.world.builder, th = (B.thumbs && B.thumbs[+qs.thumb || 0]) || B.thumb;
      if (th) {
        if (th.x !== undefined) { App.me.x = th.x; App.me.z = th.z; }
        if (th.yaw !== undefined) { App.ctl.yaw = th.yaw * PI / 180; App.me.yaw = App.ctl.yaw; }
        if (th.pitch !== undefined) App.ctl.pitch = th.pitch * PI / 180;
        if (th.zoom !== undefined) App.ctl.zoom = th.zoom;
        if (th.look !== undefined) App.ctl.look = th.look * PI / 180;   // 시선 올리기(도)
        if (th.hour !== undefined && qs.hour === undefined) App.world.setHour(th.hour);
      }
    }
  }

  // ---- 내 아바타: 앉기·서기 ----
  function beginSit(seatId) {
    var me = App.me, sp = App.logic.seatPos(seatId);
    if (!sp) return;
    // 좌석에서 멀면(1.6m 넘게) 먼저 좌석 옆 서는 자리로 옮긴다(미끄러지듯 먼 거리를 끌려가지 않게)
    if (Math.hypot(sp.x - me.x, sp.z - me.z) > 1.6) {
      var st = App.logic.standPos(seatId);
      me.x = st.x; me.z = st.z; me.yaw = sp.yaw; App.meAv.setPose(me.x, me.y, me.z, me.yaw); App.meAv.snapPose(); App.camInit = false;
    }
    App.ctl.setJoystick(0, 0);
    me.fy = App.logic.seatFloor(seatId);
    me.mode = 'sitting'; me.seat = seatId; me.t = 0; me.fx = me.x; me.fz = me.z; me.fyaw = me.yaw;
    me.tx = sp.x; me.tz = sp.z; me.tyaw = sp.yaw; me.pendingStand = false;
    App.net.setMySeat(seatId);
    App.meAv.setSeated(true); App.meAv.setWalk(0);
    setNear(null); refreshMarkers();
    me.vx = me.vz = 0;
  }
  function beginStand() {
    var me = App.me, st = App.logic.standPos(me.seat);
    me.mode = 'standing'; me.t = 0; me.fx = me.x; me.fz = me.z; me.fyaw = me.yaw;
    me.tx = st.x; me.tz = st.z; me.tyaw = st.yaw;
    App.meAv.setSeated(false);
  }

  // ---- 일시정지·재개·정리 ----
  function pause() {
    if (App.paused) return;
    App.paused = true;
    if (App.ctl) App.ctl.setJoystick(0, 0);
    if (App.me) App.me.vx = App.me.vz = 0;
    try { root.RoomAudio.suspend(); } catch (e) { /* ignore */ }
  }
  function resume() {
    if (!App.paused) return;
    App.paused = false;
    try { root.RoomAudio.resume(); } catch (e) { /* ignore */ }
    kick();
  }
  function dispose() {
    pause();
    if (App.markers) { App.markers.dispose(); App.markers = null; }
    if (App.net) App.net.clear();
    if (App.world) { App.world.dispose(); App.world = null; }
    if (App.watchTimer) { clearInterval(App.watchTimer); App.watchTimer = null; }
    try { if (App.renderer) { App.renderer.dispose(); if (App.renderer.forceContextLoss) App.renderer.forceContextLoss(); } } catch (e) { /* ignore */ }
    App.started = false; App.disposed = true; App.renderer = null;
  }
  function seatIdOf(o) {
    if (!App.logic || !o) return null;
    var i = o.i !== undefined ? o.i : (o.value !== undefined ? o.value : o.seat);
    if (typeof i === 'number') return App.logic.seatAt(i);
    return typeof i === 'string' && App.logic.seatInfo(i) ? i : null;
  }

  var api = {
    init: function (o) { start(o); },
    pause: pause, resume: resume, dispose: dispose,
    // 좌석 점유(호스트 RTDB 등): [{i, taken, mine?}] 또는 {seats:[…]}. 내가 앉은 좌석을 남이 가져가면 일어선다.
    setSeats: function (o) {
      var list = Array.isArray(o) ? o : (o.seats || o.value || []), map = {};
      list.forEach(function (s) { if (s && s.i !== undefined) map[s.i | 0] = { taken: !!s.taken, mine: !!s.mine }; });
      App.hostSeats = map;
      var me = App.me;
      if (me && me.seat && (me.mode === 'seated' || me.mode === 'sitting')) {
        var hs = map[App.logic.seatIndex(me.seat)];
        if (hs && hs.taken && !hs.mine) { if (me.mode === 'seated') beginStand(); else me.pendingStand = true; }
      }
      refreshMarkers();
    },
    setMe: function (o) { var a = o.avatar || o; App.cfg = a; if (App.meAv) App.meAv.setConfig(a); },
    setHour: function (o) { var h = o.hour !== undefined ? o.hour : o.value; if (App.world && isFinite(+h)) { App.world.setHour(+h); kick(); } else if (isFinite(+h)) App.hourInit = +h; },
    setTimerText: function (o) { hook('panel', 'timer', { text: o.text !== undefined ? String(o.text) : String(o.value || '') }); },
    setPanel: function (o) { if (o && o.id) hook('panel', String(o.id), o.data || {}); },
    setGarden: function (o) { hook('garden', Array.isArray(o) ? o : (o.list || o.value || [])); },
    setSkin: function (o) { hook('skin', o.skin || o.value || o.name); },
    // 다른 사람: [{id, x, z, yaw, state:'walk'|'sit', seat, avatar}] (net_view.js)
    setPeers: function (o) { if (App.net) { App.net.setPeers(Array.isArray(o) ? o : (o.peers || o.value || []), { partial: !!o.partial }); refreshMarkers(); } },
    sit: function (o) {
      if (!App.started || App.me.mode !== 'walk') return;
      var seat = seatIdOf(o);
      if (seat && isTaken(seat)) seat = null;
      if (!seat && !(o && (o.i !== undefined || o.value !== undefined))) seat = App.logic.nearestSeat(App.me.x, App.me.z, isTaken, undefined, App.me.fy);
      if (seat) beginSit(seat);
    },
    stand: function () {
      var me = App.me;
      if (!App.started) return;
      if (me.mode === 'seated') beginStand();
      else if (me.mode === 'sitting') me.pendingStand = true;
    },
    setJoystick: function (o) { if (App.ctl) App.ctl.setJoystick(+o.x || 0, +o.y || 0); },
    setQuality: function (o) { setQMode(o && (o.quality || o.value)); if (App.R) { App.R.autoTier = autoOn(); App.R.setTier(App.quality, App.world); } resize(); },
    setPerfHud: function (o) { if (root.RoomPerfHud) root.RoomPerfHud.set(!!(o && (o.on || o.value)), App); },
    setSteps: function (o) { root.RoomAudio.setSteps(o || {}); },
    setPoseRate: function (o) { if (App.pose) App.pose.setRate(o.hz !== undefined ? o.hz : o.value); },
    setViewInset: function (o) {
      App.inset = Math.max(0, Math.min(0.6, +(o && (o.bottom !== undefined ? o.bottom : o.value)) || 0));
      if (App.camera) { applyInset(root.innerWidth || 360, root.innerHeight || 640); App.camera.updateProjectionMatrix(); kick(); }
    },
    setCamera: function (o) { applyCamCfg(o); },
    tapAt: function (o) { tapAt(+o.x, +o.y); },
    // 커피 주문(무료·가상): {kind:'americano'|'latte'|'iced'|'tea'} → 약 3초 뒤 {e:'coffeeReady', kind}, 카운터에서 집으면 {e:'coffeePicked'}
    orderCoffee: function (o) { if (App.coffee) App.coffee.order(o && (o.kind || o.value)); kick(); },
    // 들고 있는 컵 되돌리기(다시 열었을 때 호스트가 기억한 컵): {kind} 또는 {kind:null}(없앰)
    setMyCup: function (o) { if (App.coffee) App.coffee.give(o && (o.kind !== undefined ? o.kind : o.value)); kick(); }
  };
  App.api = api;

  // 누르기: 좌석 표식·의자 → {e:'seatTap', i}(앉히는 결정은 호스트가: 자리 잡기 뒤 sit({i})), 빌더 누르기 자리(addTapTarget) → {e:'tap', id}
  var pv = new T.Vector3();
  function tapAt(x, y) {
    if (!App.camera || !App.logic || !(x >= 0) || !(y >= 0)) return;
    var w = root.innerWidth || 360, h = root.innerHeight || 640;
    if (App.me.mode === 'walk' && App.markers) {
      var hit = App.markers.pick(x / w * 2 - 1, -(y / h * 2 - 1), App.camera, w, h);
      if (hit && hit.kind === 'seat') { post({ e: 'seatTap', i: hit.index }); return; }
    }
    // 의자 자체(좌석 높이 0.5m 점, 화면 44px 안) — 앉아 있으면 내 좌석은 빼고
    var best = -1, bd = 44 * 44;
    App.logic.seats.forEach(function (s, i) {
      if (App.me.seat === s.id) return;
      pv.set(s.x, App.logic.seatFloor(s.id) + 0.55, s.z).project(App.camera);
      if (pv.z > 1) return;
      var dx = (pv.x * 0.5 + 0.5) * w - x, dy = (-pv.y * 0.5 + 0.5) * h - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { post({ e: 'seatTap', i: best }); return; }
    var taps = App.world.taps || [];
    for (var k = 0; k < taps.length; k++) {
      var tp = taps[k];
      pv.set(tp.x, tp.y, tp.z).project(App.camera);
      if (pv.z > 1) continue;
      var rpx = Math.max(36, tp.r * h / (2 * Math.tan(App.camera.fov * PI / 360) * Math.max(0.5, App.camera.position.distanceTo(new T.Vector3(tp.x, tp.y, tp.z)))));
      var ex = (pv.x * 0.5 + 0.5) * w - x, ey = (-pv.y * 0.5 + 0.5) * h - y;
      if (ex * ex + ey * ey < rpx * rpx) { post({ e: 'tap', id: tp.id }); return; }
    }
  }

  // 앉은 사람이 있는 좌석 id 표(나·보이는 사람·호스트가 알려 준 점유)
  var occMap = {};
  function occupiedMap() {
    for (var k in occMap) delete occMap[k];
    var me = App.me, lg = App.logic;
    if (me && me.seat && (me.mode === 'seated' || me.mode === 'sitting')) occMap[me.seat] = 1;
    App.net.table.peers.forEach(function (r) { if (r.st === 'sit') { var id = typeof r.seat === 'number' ? lg.seatAt(r.seat) : r.seat; if (id) occMap[id] = 1; } });
    for (var i in App.hostSeats) if (App.hostSeats[i].taken) { var sid = lg.seatAt(+i); if (sid) occMap[sid] = 1; }
    return occMap;
  }
  var joy = { x: 0, y: 0 }, vel = { vx: 0, vz: 0, speed: 0, yaw: 0 }, pp = { x: 0, z: 0 };
  var CTL = root.RoomControls;

  function updateMe(dt, t) {
    var me = App.me, av = App.meAv, logic = App.logic;
    var mode = me.mode;
    if (mode === 'walk') {
      App.ctl.getMove(joy);
      if (CTL && CTL.shapeJoy) CTL.shapeJoy(joy.x, joy.y, joy);
      logic.joyToVelocity(joy.x, joy.y, App.ctl.yaw, vel);
      if (CTL && CTL.moveStep) CTL.moveStep(me, vel.vx, vel.vz, dt, false);
      else { var k = 1 - Math.exp(-dt * 12); me.vx += (vel.vx - me.vx) * k; me.vz += (vel.vz - me.vz) * k; me.mvx = me.vx; me.mvz = me.vz; }
      var sp = Math.sqrt(me.vx * me.vx + me.vz * me.vz);
      if (sp > 0.02 || me.mvx * me.mvx + me.mvz * me.mvz > 4e-4) {
        pp.x = me.x; pp.z = me.z;
        logic.moveCircle(pp, me.mvx * dt, me.mvz * dt, undefined, me.fy);
        me.x = pp.x; me.z = pp.z;
      } else { me.vx = me.vz = 0; sp = 0; }
      if (vel.speed > 0.05) me.yaw += wrap(vel.yaw - me.yaw) * (1 - Math.exp(-dt * (CTL && CTL.FEEL ? CTL.FEEL.turnRate : 11)));
      me.speed = sp;
      av.setWalk(Math.min(1, sp / logic.walkSpeed * 1.05));
      if (!av.takeStep && sp > 0.6) { App.stepT -= dt; if (App.stepT <= 0) { App.stepT = 0.42; root.RoomAudio.footstep(Math.random() < 0.5, sp); } }
      var fy = logic.floorY(me.x, me.z, me.fy);
      me.fy = fy;
      var byT = sp > 0.05 && logic.bodyY ? logic.bodyY(me.x, me.z, fy, me.vx / sp, me.vz / sp) : fy;
      me.y += (byT - me.y) * (1 - Math.exp(-dt * 14));
      App.wasMoving = sp > 0.05;
      if (qs.thumb === undefined) setNear(logic.nearestSeat(me.x, me.z, isTaken, undefined, me.fy));
    } else if (mode === 'sitting' || mode === 'standing') {
      me.t += dt;
      var dur = mode === 'sitting' ? 0.8 : 0.55, u = Math.min(1, me.t / dur), s = u * u * (3 - 2 * u);
      me.x = me.fx + (me.tx - me.fx) * s; me.z = me.fz + (me.tz - me.fz) * s;
      me.yaw = me.fyaw + wrap(me.tyaw - me.fyaw) * s;
      var fy2 = logic.floorY(me.x, me.z, me.fy);
      me.y += (fy2 - me.y) * (1 - Math.exp(-dt * 14));
      av.setWalk(0);
      if (u >= 1) {
        if (mode === 'sitting') {
          me.mode = 'seated';
          post({ e: 'sat', i: logic.seatIndex(me.seat) });
          if (App.coffee) App.coffee.onSit(logic.seatIndex(me.seat));
          if (me.pendingStand) { me.pendingStand = false; beginStand(); }
        } else {
          var si = logic.seatIndex(me.seat);
          me.mode = 'walk'; me.seat = null; me.vx = me.vz = 0;
          App.net.setMySeat(null);
          post({ e: 'stood', i: si });
          if (App.coffee) App.coffee.onStand();
          App.wasMoving = false; App.near.seat = undefined; refreshMarkers();
        }
      }
    } else av.setWalk(0);
    var so = (me.mode === 'seated' || me.mode === 'sitting') && me.seat ? App.world.seatOffset(me.seat) : null;   // 흔들리는 자리(그네)
    if (so) av.setPose(me.x + so.x, me.y + so.y, me.z + so.z, me.yaw); else av.setPose(me.x, me.y, me.z, me.yaw);
    av.update(dt, t);
    var stepEv = av.takeStep ? av.takeStep() : null;
    if (stepEv) root.RoomAudio.footstep(stepEv.side > 0, stepEv.v, Math.max(0, dt - (stepEv.lag || 0)));
    // 내 자세 내보내기(onMyPose → {e:'myPose'}). 앉는 중·앉음은 'sit' + 좌석 번호
    var seated = me.mode === 'seated' || me.mode === 'sitting';
    App.pose.tick(performance.now(), { x: me.x, z: me.z, yaw: me.yaw, state: seated ? 'sit' : 'walk', seat: seated ? logic.seatIndex(me.seat) : null });
  }

  var tmpV = new T.Vector3(), spotO = { pitch: 0, D: 0, fwd: 0, up: 0 };
  var CAM_DIST = { near: 0.78, normal: 1, far: 1.25 };
  function applyCamCfg(o) {
    if (!o) return;
    var c = App.camCfg;
    if (o.autoZoom !== undefined) c.auto = !!o.autoZoom;
    if (o.dist !== undefined && CAM_DIST[o.dist]) c.dist = CAM_DIST[o.dist];
    if (o.follow !== undefined) c.follow = !!o.follow;
    if (o.view !== undefined) setViewMode(o.view);
  }
  var VIEW_MODES = { fp: 1, tp: 1 };
  function setViewMode(m) { App.camCfg.view = VIEW_MODES[m] ? m : 'tp'; kick(); }
  var cutS = null, cutI = { guard: null, cx: 0, cy: 0, cz: 0, mx: 0, my: 0, mz: 0, hy: 0, foot: 0, low: false, fp: 0 }, cutO = {};
  var folS = null;
  var CG = root.RoomCamGuard || { SPOT: { side: 0 }, SEATV: { side: 0 }, spotBlend: function (p, D, b, f, o) { o.pitch = p; o.D = D; o.fwd = o.up = 0; return o; }, avatarAlpha: function () { return 1; } };
  // 앉은 시점: 앞옆 45°, 가림이 적은 쪽(cam_guard seatViewYaw — 앉을 때 한 번)
  function seatYawFor(seatId) {
    var si = App.logic.seatInfo(seatId), gd = App.world.camGuard, base = 4.4 * (App.inset ? 1.3 : 1) * App.camCfg.dist;
    if (!si) return 0;
    // layout.seatView.side(라디안): 앉은 사람 뒤에서 그만큼 비켜 본다(창·벽을 마주 보는 좌석 — 앞에서 보면 카메라가 벽 밖으로 나간다).
    // 두 쪽 중 카메라 자리가 지붕 아래(실내) 안쪽 깊은 쪽을 고른다.
    var SV = App.world.layout.seatView;
    if (SV && SV.side !== undefined) {
      var best = si.yaw + SV.side, bd = -1e9, Dv = base * (CG.SEATV ? CG.SEATV.zoom || 1 : 1);
      [1, -1].forEach(function (sg) {
        var y = si.yaw + sg * SV.side, cx = si.x + Math.sin(y) * Dv, cz = si.z + Math.cos(y) * Dv, d = roomDepth(cx, cz);
        if (d > bd) { bd = d; best = y; }
      });
      return best;
    }
    if (!CG.seatViewYaw) return si.yaw + (CG.SEATV ? CG.SEATV.side : 0);
    return CG.seatViewYaw(gd, App.world.cameraBounds, si.x, App.me.y + 1.25, si.z, si.yaw, base * (CG.SEATV.zoom || 1), CG.SEATV.pitch);
  }
  var fol = { follow: false, walkSt: false, seated: false, spot: false, t: 0, meYaw: 0, speed: 0, dt: 0 };
  // 카메라 = 부드러운 피벗(아바타 가슴) + 사용자 각도·거리 그대로의 팔. 벽이 카메라를 밀지 않고, 카메라 쪽 가림물은 셰이더가 지운다(cam_guard createCut).
  function updateCamera(dt) {
    var me = App.me, ctl = App.ctl, cam = App.camera;
    var seated = me.mode === 'seated' || me.mode === 'sitting' ? 1 : 0;
    App.sitF += (seated - App.sitF) * (1 - Math.exp(-dt * 2.5));
    var sf = App.sitF;
    ctl.now = App.t;
    if (!folS && CTL && CTL.createFollow) folS = CTL.createFollow();
    if (!cutS && CG.createCut) cutS = CG.createCut();
    if (!App.camInit) { if (folS) folS.reset(); if (cutS) cutS.reset(); ctl.zoomSnap = true; App.fpLin = (App.camCfg.view === 'fp' && !seated) ? 1 : 0; }
    if (CTL && CTL.stepLook) CTL.stepLook(ctl, dt); else ctl.zoomS = ctl.zoom;
    if (seated && !App.spotSeat) { App.spotSeat = true; if (me.seat) App.spot = { yaw: seatYawFor(me.seat), t0: App.t, seat: true }; }
    else if (!seated && App.spotSeat) { App.spotSeat = false; if (App.spot && App.spot.seat) App.spot = null; }
    var SP = App.spot;
    if (SP && (ctl.dragging || ctl.lastDragT > SP.t0)) SP = App.spot = null;
    if (SP) App.spotKind = SP.seat ? CG.SEATV : CG.SPOT;
    App.spotF += ((SP ? 1 : 0) - App.spotF) * (1 - Math.exp(-dt * (SP ? 1.6 : 9)));
    if (App.spotF < 0.002) App.spotF = 0;
    if (SP) { App.spotYaw = SP.yaw; ctl.yaw += wrap(SP.yaw + (SP.seat ? 0 : CG.SPOT.side) - ctl.yaw) * (1 - Math.exp(-dt * 2.2)); }
    var CC = App.camCfg;
    fol.follow = CC.follow; fol.walkSt = false; fol.seated = !!seated; fol.spot = !!SP; fol.t = App.t; fol.meYaw = me.yaw; fol.speed = Math.hypot(me.vx, me.vz); fol.dt = dt;
    if (CTL && CTL.followStep) CTL.followStep(ctl, fol);
    var FE = CTL && CTL.FEEL ? CTL.FEEL : { boomDist: 7.2, pitchDefault: 0.45, lookDrop: 0 };
    // 좁은 실내(지붕 아래)에서는 빌더가 준 짧은 팔(layout.camDist), 바깥은 기본 팔. 드나들 때 1초쯤에 걸쳐 바뀐다
    var inRoom = !!(App.world.layout.roofs && inside(App.world.layout.roofs, me.x, me.z));
    var boomT = inRoom && App.world.layout.camDist ? App.world.layout.camDist : FE.boomDist;
    if (!App.camInit || !App.boom) App.boom = boomT; else App.boom += (boomT - App.boom) * (1 - Math.exp(-dt * 2.5));
    var boom = App.boom;
    var baseD = (boom * (1 - sf) + 4.4 * sf * Math.min(1, boom / 5)) * (App.inset ? 1 + 0.3 * sf : 1) * CC.dist, D = baseD * (ctl.zoomS > 0 ? ctl.zoomS : ctl.zoom);
    var pitch = ctl.pitch * (1 - 0.3 * sf);
    if (App.spotF > 0) { CG.spotBlend(pitch, D, baseD, App.spotF, spotO, App.spotKind); pitch = spotO.pitch; D = spotO.D; } else spotO.fwd = spotO.up = 0;
    var tmx = me.x, tmz = me.z, tfy = me.y + 1.0 + sf * (0.45 - 0.2);
    var pv2 = folS ? folS.step(tmx, tfy, tmz, dt, !App.camInit) : { x: tmx, y: tfy, z: tmz };
    var mx = pv2.x, fy = pv2.y, mz = pv2.z, dx = Math.sin(ctl.yaw), dz = Math.cos(ctl.yaw);
    var ch0 = Math.cos(pitch) * D, cx = mx + dx * ch0, cyv = fy + Math.sin(pitch) * D, cz = mz + dz * ch0;
    var lx = mx - Math.sin(App.spotYaw) * spotO.fwd, ly = fy + spotO.up - FE.lookDrop * (1 - sf) * (1 - App.spotF), lz = mz - Math.cos(App.spotYaw) * spotO.fwd;
    // 1인칭(setCamera({view:'fp'}) 으로 고른 때만): 눈 높이로 들어가 둘러본다. 앉는 중에는 쓰지 않는다.
    var block = !!(seated || SP || App.spotF > 0.05 || me.mode === 'sitting' || me.mode === 'standing');
    var fpT = CC.view === 'fp' && !block ? 1 : 0, fbT = (CTL && CTL.FEEL ? CTL.FEEL.fpBlend : 0.5), fl0 = App.fpLin || 0;
    App.fpLin = fl0 < fpT ? Math.min(fpT, fl0 + dt / fbT) : Math.max(fpT, fl0 - dt / fbT);
    var fp = App.fpLin * App.fpLin * (3 - 2 * App.fpLin);
    var eyY = me.y + 1.6 - 0.45 * sf, ex = me.x, ez = me.z;
    if (fp > 0) {
      var fdx = -Math.sin(ctl.yaw), fdz = -Math.cos(ctl.yaw), lp = clampN(-(ctl.pitch - (FE.pitchDefault - 0.15)) * 0.8, -0.9, 0.3), lc = Math.cos(lp) * 6;
      lx += (ex + fdx * lc - lx) * fp; ly += (eyY + Math.sin(lp) * 6 - ly) * fp; lz += (ez + fdz * lc - lz) * fp;
      cx += (ex - cx) * fp; cyv += (eyY - cyv) * fp; cz += (ez - cz) * fp;
    }
    // 천장 아래로(카메라 높이 상한: 빌더 cameraBounds.yMax — 낮은 실내에서 천장을 뚫고 지붕 위로 나가지 않게, 실내에 있을 때만)
    var cbd = App.world.cameraBounds;
    if (inRoom && cbd && cbd.yMax && cyv > cbd.yMax) cyv = cbd.yMax;
    App.camPos.set(cx, cyv, cz);
    if (!App.camInit) { App.camLook.set(lx, ly, lz); App.camInit = true; }
    var kl = 1 - Math.exp(-dt * (fp > 0.05 && fp < 0.95 ? 16 : 11));
    var nearW = fp > 0.5 ? 0.1 : 0.2;
    if (cam.near !== nearW) { cam.near = nearW; cam.updateProjectionMatrix(); }
    var gd = App.world.camGuard;
    if (gd && gd.see && cutS) {
      cutI.guard = gd; cutI.cx = App.camPos.x; cutI.cy = App.camPos.y; cutI.cz = App.camPos.z;
      cutI.mx = mx; cutI.my = fy - 0.25 * sf; cutI.mz = mz; cutI.hy = me.y + 1.55 - 0.45 * sf;
      cutI.foot = me.y; cutI.low = sf > 0.5; cutI.fp = fp;
      cutS.step(cutI, dt, cutO); App.cut = cutO;
    }
    App.camLook.x += (lx - App.camLook.x) * kl; App.camLook.y += (ly - App.camLook.y) * kl; App.camLook.z += (lz - App.camLook.z) * kl;
    if (ctl.look > 0 && me.mode === 'walk' && Math.hypot(me.vx, me.vz) > 0.6 && !ctl.dragging) ctl.look = Math.max(0, ctl.look - dt * 1.2);
    var lookTarget = App.camLook;
    if (ctl.look > 0.001) {
      var wl = Math.min(1, ctl.look / 0.2), ca = Math.cos(ctl.look), sa = Math.sin(ctl.look);
      var gx = App.camPos.x - dx * ca * 20, gy = App.camPos.y + sa * 20, gz = App.camPos.z - dz * ca * 20;
      lookTarget = tmpV.set(App.camLook.x + (gx - App.camLook.x) * wl, App.camLook.y + (gy - App.camLook.y) * wl, App.camLook.z + (gz - App.camLook.z) * wl);
    }
    cam.position.copy(App.camPos);
    cam.lookAt(lookTarget);
    var av = App.meAv;
    if (av && av.setFade) {
      var hx = App.camPos.x - mx, hy2 = App.camPos.y - (me.y + 1.55 - 0.45 * sf), hz = App.camPos.z - mz;
      var fpA = fp <= 0.25 ? 1 : fp >= 0.7 ? 0 : 1 - (fp - 0.25) / 0.45;
      var aT = CG.avatarAlpha(Math.sqrt(hx * hx + hy2 * hy2 + hz * hz)) * fpA;
      App.avA += (aT - App.avA) * (1 - Math.exp(-dt * 10));
      av.setFade(App.avA);
      var hide = fp > 0.7;
      if (av.root.visible === hide && qs.thumb === undefined) av.root.visible = !hide;
      if (av.setXray) av.setXray(me.mode === 'walk' && !hide);
    }
  }
  // 지붕 아래 사각형 안으로 얼마나 깊은가(밖이면 음수)
  function roomDepth(x, z) {
    var R = App.world.layout.roofs || [], best = -1e9;
    R.forEach(function (r) { best = Math.max(best, Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z)); });
    return best;
  }
  function inside(rects, x, z) { for (var i = 0; i < rects.length; i++) { var r = rects[i]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true; } return false; }

  var tagV = new T.Vector3();
  function myTagRect(vw, vh) {
    var av = App.meAv, tg = av && av.tag;
    if (!tg || !tg.visible || !(av.tagPx > 0)) return null;
    tagV.set(av.root.position.x, av.root.position.y + tg.position.y, av.root.position.z).project(App.camera);
    if (tagV.z > 1) return null;
    var head = 0.3 * av.tagPpm, w = Math.max(av.tagPx * 3.84, 0.4 * av.tagPpm), h = av.tagPx + head;
    return { cx: (tagV.x * 0.5 + 0.5) * vw, cy: (-tagV.y * 0.5 + 0.5) * vh + head / 2, w: w, h: h };
  }

  var rafAsked = false, meGood = { x: 0, z: 0, y: 0, fy: 0, yaw: 0, ok: false }, camGood = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, yaw: 0, pitch: 0.45, zoom: 1, ok: false };
  function reqFrame() { rafAsked = true; requestAnimationFrame(loop); }
  function frameErr(part, e) {
    App.frameErrN = (App.frameErrN || 0) + 1; App.frameErrPart = part;
    root.RoomBridge.jsError('frame', part + ': ' + ((e && e.message) || e), '', 0);
    if (console && console.error && App.frameErrN < 20) console.error('[room] frame ' + part, e);
  }
  function okNum(v) { return typeof v === 'number' && v > -1e7 && v < 1e7; }
  function guardMe() {
    var me = App.me; if (!me) return;
    if (okNum(me.x) && okNum(me.z) && okNum(me.y) && okNum(me.yaw) && (me.fy === undefined || okNum(me.fy)) && okNum(me.vx) && okNum(me.vz)) {
      meGood.x = me.x; meGood.z = me.z; meGood.y = me.y; meGood.fy = me.fy; meGood.yaw = me.yaw; meGood.ok = true; return;
    }
    frameErr('nan', new Error('me ' + [me.x, me.z, me.y, me.fy, me.yaw].join(',')));
    if (meGood.ok) { me.x = meGood.x; me.z = meGood.z; me.y = meGood.y; me.fy = meGood.fy; me.yaw = meGood.yaw; }
    else { var s0 = App.logic && App.logic.spawn; me.x = s0 ? s0.x : 0; me.z = s0 ? s0.z : 0; me.y = me.fy = 0; me.yaw = 0; }
    me.vx = me.vz = 0;
  }
  function guardCam() {
    var c = App.ctl, p = App.camPos, l = App.camLook;
    if (okNum(p.x) && okNum(p.y) && okNum(p.z) && okNum(l.x) && okNum(l.y) && okNum(l.z) && okNum(c.yaw) && okNum(c.pitch) && okNum(c.zoom)) {
      if (Math.abs(c.yaw) > 1000) c.yaw = wrap(c.yaw);
      camGood.px = p.x; camGood.py = p.y; camGood.pz = p.z; camGood.lx = l.x; camGood.ly = l.y; camGood.lz = l.z; camGood.yaw = c.yaw; camGood.pitch = c.pitch; camGood.zoom = c.zoom; camGood.ok = true; return;
    }
    frameErr('nan', new Error('camera ' + [p.x, p.y, p.z, c.yaw, c.pitch, c.zoom].join(',')));
    if (!okNum(c.yaw)) c.yaw = camGood.ok ? camGood.yaw : 0;
    if (!okNum(c.pitch)) c.pitch = camGood.ok ? camGood.pitch : 0.45;
    if (!okNum(c.zoom)) c.zoom = camGood.ok ? camGood.zoom : 1;
    if (camGood.ok) { p.set(camGood.px, camGood.py, camGood.pz); l.set(camGood.lx, camGood.ly, camGood.lz); }
    App.camInit = false;
  }
  function glCtx() { try { return App.renderer && App.renderer.getContext ? App.renderer.getContext() : null; } catch (e) { return null; } }
  var watchOn = false;
  function watchStart() {
    if (watchOn) return;
    watchOn = true;
    // WebGL 문맥을 잃으면 알리고({e:'contextLost'}), 되찾으면 다시 그린다({e:'contextRestored'}). 못 되찾으면 호스트가 장면을 다시 띄운다.
    if (canvas && canvas.addEventListener) {
      canvas.addEventListener('webglcontextlost', function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); App.glLost = true; App.glLostN = (App.glLostN || 0) + 1; post({ e: 'contextLost' }); }, false);
      canvas.addEventListener('webglcontextrestored', function () { App.glLost = false; post({ e: 'contextRestored' }); kick(); }, false);
    }
    App.watchTimer = setInterval(heartbeat, 1000);
  }
  function heartbeat() {
    if (!App.started) return;
    var t = performance.now(), age = t - (App.loopT || t), hidden = !!(document && document.hidden), gl = glCtx();
    if (gl && gl.isContextLost && gl.isContextLost() && !App.glLost) { App.glLost = true; post({ e: 'contextLost' }); }
    var st = App.paused ? 'paused' : App.glLost ? 'gl' : hidden ? 'hidden' : 'run';
    if (st === 'run' && age > 2500 && !App.done) { App.loopHeal = (App.loopHeal || 0) + 1; App.rafOn = false; kick(); }
    post({ e: 'hb', f: App.drawn || 0, st: st, err: App.frameErrN || 0 });
  }
  function loop(now) {
    App.loopT = performance.now(); App.loopN = (App.loopN || 0) + 1;
    rafAsked = false;
    try { frame(now); } catch (e) {
      frameErr('loop', e);
      if (!rafAsked && !App.paused && App.rafOn) reqFrame();
    }
  }
  function frame(now) {
    if (App.paused || !App.started) { App.rafOn = false; return; }
    if (now === App.lastNow) return;
    App.lastNow = now;
    if (App.maxFrames && App.frameCount >= App.maxFrames) { App.done = true; App.rafOn = false; return; }
    var tcP = App.R && root.RoomRender && root.RoomRender.TIERS ? root.RoomRender.TIERS[App.R.tier] : null;
    Pace.tick(now, !App.maxFrames && !(tcP && !tcP.pace));
    // 앉아서 가만히 있는 동안은 한 프레임 걸러 그린다(약 30fps — 발열·배터리 절약). 끌기·일어서기 즉시 60fps.
    var div = (App.idleSkip ? 2 : 1) * Pace.div;
    if (div > 1 && (Pace.frames % div)) { App.frames++; reqFrame(); return; }
    var raw = Pace.snap((now - App.last) / 1000), dt = Math.min(0.05, raw);
    App.last = now; App.t += dt;
    reqFrame();
    if (!App.world) return;
    App.frameCount = (App.frameCount || 0) + 1;
    var PH = root.RoomPerfHud && root.RoomPerfHud.on ? root.RoomPerfHud : null, tj = PH ? performance.now() : 0;
    try { App.ctl.setMoveZone(App.me.mode === 'walk'); updateMe(dt, App.t); } catch (e) { frameErr('me', e); }
    guardMe();
    try { if (App.world.setViewer) App.world.setViewer(App.me.y); } catch (e) { frameErr('levels', e); }
    try { updateCamera(dt); } catch (e) { frameErr('camera', e); }
    guardCam();
    var vw = root.innerWidth || 360, vh = root.innerHeight || 640;
    try {
      App.camera.updateMatrixWorld();
      App.camera.matrixWorldInverse.copy(App.camera.matrixWorld).invert();
      root.RoomAvatar.setView(App.camera, vh);
    } catch (e) { frameErr('view', e); }
    try { App.world.setOccupied(occupiedMap()); } catch (e) { frameErr('occ', e); }
    try { App.net.setFocus(App.me.x, App.me.z); App.net.update(dt, App.t, performance.now()); } catch (e) { frameErr('net', e); }
    try { App.world.update(dt, App.t, App.me, App.camera); } catch (e) { frameErr('world', e); }
    try { if (App.coffee) App.coffee.update(dt, App.t); } catch (e) { frameErr('coffee', e); }
    try { if (App.markers) { refreshMarkers(); App.markers.update(dt, App.t, App.me, App.camera, null, App.me.mode === 'walk', { w: vw, h: vh, avoid: myTagRect(vw, vh) }); } } catch (e) { frameErr('markers', e); }
    try {
      if (App.R.dof) {
        var dm = App.me.mode, dofWant = qs.dof !== '0' && (dm === 'seated' || dm === 'sitting') ? 1 : 0;   // 앉아 있으면 먼 배경을 살짝 흐린다(초점 = 아바타)
        App.dofA = (App.dofA || 0) + (dofWant - (App.dofA || 0)) * Math.min(1, dt / (dofWant ? 0.9 : 0.3));
        if (App.dofA < 0.002) App.dofA = 0;
        var avp = App.meAv.root.position, cpos = App.camera.position;
        var fdx = avp.x - cpos.x, fdy = avp.y + 1.1 - cpos.y, fdz = avp.z - cpos.z;
        App.R.dof.focus = Math.max(1.2, Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz)); App.R.dof.amount = App.dofA * 0.6;
      }
      App.R.setExposure(App.world.env.exp * (App.expK || 1));
      if (App.R.setGrade) App.R.setGrade(App.world.env.grade);
    } catch (e) { frameErr('look', e); }
    App.idleSkip = !PH && !App.maxFrames && qs.idle !== '0' && App.me.mode === 'seated' && !App.ctl.dragging && App.t - App.ctl.lastDragT > 2 && App.sitF > 0.98 && App.net.visibleCount() === 0;
    var gq = PH ? PH.gpuBegin() : null, tr = PH ? performance.now() : 0;
    var tw0 = performance.now(), chg = null;
    try { chg = App.R.render(App.scene, App.camera, dt, App.world); if (!App.glLost) App.drawn = (App.drawn || 0) + 1; } catch (e) { frameErr('render', e); }
    Pace.work(performance.now() - tw0);
    if (PH) { PH.gpuEnd(gq); PH.frame(raw, performance.now() - tj, performance.now() - tr); }
    if (!App.firstFramePosted) { App.firstFramePosted = true; post({ e: 'firstFrame' }); }
    if (chg) { App.quality = chg; post({ e: 'tierDown', tier: App.R.tier, fps: Math.round(1 / Math.max(raw, 0.001)) }); }
    App.frames++; App.perfT += Math.min(raw, 1);
    if (App.perfT >= (App.perfSent ? 5 : 4)) {
      App.fps = Math.round(App.frames / App.perfT);
      App.perfSent = true;
      post({ e: 'perf', fps: App.fps, tier: App.R.tier });
      App.frames = 0; App.perfT = 0;
    }
  }

  root.Room3D._bind({ api: api });
  function boot() {
    post({ e: 'ready' });
    setTimeout(function () { if (!App.started && !App.disposed && !root.RoomNoAutoStart) start({}); }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : this);
