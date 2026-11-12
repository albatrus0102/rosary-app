/* main.js — 앱 코어: 렌더러, 카메라, 내 아바타 상태 기계, 이벤트 보고. */
(function (root) {
  'use strict';
  var T = root.THREE, PI = Math.PI;
  var Logic = root.ChurchLogic, post = root.ChurchBridge.post;
  var qs = (function () { var o = {}; try { new URLSearchParams(root.location.search).forEach(function (v, k) { o[k] = v; }); } catch (e) { /* ignore */ } return o; })();

  var canvas = document.getElementById('c');
  var App = {
    started: false, quality: 'high', renderer: null, scene: null, camera: null, world: null, logic: null,
    maxFrames: +(qs.frames || 0), frameCount: 0, done: false, me: null, meAv: null, ctl: null, net: null, crowd: null, cfg: { skin: 1, style: 0, hair: 2, outfit: 6, name: 0 },
    near: { seat: null, candle: null, station: null }, stations: null, markers: null, walkSt: null, pendingWalk: null, turn: null, frames: 0, perfT: 0, t: 0, last: 0, posT: 0, wasMoving: false, stepT: 0, fps: 60,
    camPos: new T.Vector3(), camLook: new T.Vector3(), camInit: false, sitF: 0, church: 'basic', solo: false, ambient: false
  };
  root.__church = App;

  function wrap(a) { while (a > PI) a -= PI * 2; while (a < -PI) a += PI * 2; return a; }
  function r2(v) { return Math.round(v * 100) / 100; }

  function pixelRatio() { var d = root.devicePixelRatio || 1; return Math.min(d, App.quality === 'low' ? 1.5 : 2); }
  function resize() {
    if (!App.renderer) return;
    var w = root.innerWidth || 360, h = root.innerHeight || 640;
    App.R.resize(w, h, pixelRatio());
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    App.camera.aspect = w / h;
    // 세로 화면에서는 시야를 넓힌다
    App.camera.fov = w / h < 0.8 ? 62 : 52;
    App.camera.updateProjectionMatrix();
  }
  root.addEventListener('resize', resize);
  root.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  function setNear(seat, candle, station) {
    if (station === undefined) station = null;
    if (seat === App.near.seat && candle === App.near.candle && station === App.near.station) return;
    App.near.seat = seat; App.near.candle = candle; App.near.station = station;
    if (App.world) App.world.setHighlight(seat, candle);
    post({ e: 'near', seat: seat, candle: candle, station: station });
  }

  function isTaken(id) { return App.net.isTaken(id) || App.crowd.isTaken(id); }

  function loadWorld(id) {
    if (App.markers) { App.markers.dispose(); App.markers = null; }
    App.walkSt = null; App.pendingWalk = null; App.turn = null;
    if (App.world) { App.world.dispose(); App.world = null; }
    var w = root.ChurchWorld.create(App.scene, { church: id, quality: App.R.tier, hour: App.hourInit, renderer: App.renderer });
    if (App.R.envTex) w.setEnvironment(App.R.envTex);
    App.world = w; App.logic = w.logic; App.church = w.id;
    App.net.setLogic(w.logic); App.crowd.setLogic(w.logic);
    var sp = w.layout.spawn;
    var me = App.me;
    me.x = sp.x; me.z = sp.z; me.yaw = sp.r || 0; me.y = w.logic.floorY(sp.x, sp.z); me.vx = 0; me.vz = 0; me.mode = 'walk'; me.seat = null;
    App.net.setMySeat(null);
    App.ctl.yaw = me.yaw; App.camInit = false;
    App.meAv.setSeated(false); App.meAv.setPray(false);
    App.near.seat = App.near.candle = undefined; App.near.station = null;
    // 스테이션(촛불 봉헌대·제대 앞·성수대): 걸어서 가는 자리와 표식
    App.stations = root.ChurchStations.create(w.logic);
    var stn = App.stations.stations();
    if (!qs.thumb && qs.markers !== '0') App.markers = root.ChurchMarkers.create(w.group, App.stations, w.logic);
    post({ e: 'stations', church: w.id, candle: stn.candle.length, altar: 1, font: stn.font.length, entrance: 1 });
    if (console && console.log) console.log('[church] world ' + w.id + ' stats', JSON.stringify(w.stats));
  }

  function start(o) {
    o = o || {};
    if (o.avatar) App.cfg = o.avatar;
    if (o.quality) App.quality = o.quality === 'low' ? 'low' : 'high';
    App.hourInit = o.hour === undefined ? (new Date().getHours() + new Date().getMinutes() / 60) : +o.hour;
    var church = o.church || qs.church || 'basic';
    if (!App.started) {
      App.started = true;
      try {
        App.R = root.ChurchRender.create(canvas, { quality: App.quality, autoTier: qs.autotier !== '0' });
        App.renderer = App.R.renderer;
      } catch (e) {
        document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;left:8px;top:8px;color:#fff;font:12px sans-serif">WebGL을 사용할 수 없습니다.</div>');
        if (console && console.error) console.error('[church] WebGL init failed', e);
        App.started = false; return;
      }
      App.scene = new T.Scene();
      App.camera = new T.PerspectiveCamera(52, 1, 0.3, 700);
      App.meAvReady = false;
      App.ctl = root.ChurchControls.create(canvas);
      App.ctl.onTap = function (x, y) { tapAt(x, y); };
      App.ctl.onMoveTouch = function () { cancelWalk('touch'); };
      App.me = { x: 0, z: 17, y: 0, yaw: 0, vx: 0, vz: 0, mode: 'walk', seat: null, t: 0, fx: 0, fz: 0, fyaw: 0, tx: 0, tz: 0, tyaw: 0, pendingStand: false, speed: 0 };
      App.meAv = new root.ChurchAvatar.Avatar(App.cfg, {});
      App.scene.add(App.meAv.root);
      root.ChurchRenderUtil.markCaster(App.meAv.root);
      App.net = root.ChurchNetView.create(App.scene);
      App.crowd = root.ChurchNetView.createCrowd(App.scene);
      resize();
      loadWorld(church);
      App.last = performance.now();
      var go = function () { App.last = performance.now(); requestAnimationFrame(loop); };
      if (root.ChurchPhotos) root.ChurchPhotos.whenReady(go, 2500); else go();
    } else {
      App.meAv.setConfig(App.cfg);
      if (church !== App.church) loadWorld(church);
      resize();
    }
    if (o.hour !== undefined) App.world.setHour(+o.hour);
    if (o.solo !== undefined) { App.solo = !!o.solo; App.crowd.set(App.solo); }
    if (o.ambient !== undefined) { App.ambient = !!o.ambient; root.ChurchAudio.setAmbient(App.ambient); }
    // 테스트용 URL 초기 자세
    if (qs.x !== undefined && qs.z !== undefined) { App.me.x = +qs.x; App.me.z = +qs.z; }
    if (qs.yaw !== undefined) { App.ctl.yaw = (+qs.yaw) * PI / 180; App.me.yaw = App.ctl.yaw; }
    if (qs.pitch !== undefined) App.ctl.pitch = (+qs.pitch) * PI / 180;
    if (qs.zoom !== undefined) App.ctl.zoom = +qs.zoom;
    if (qs.thumb) App.meAv.root.visible = false;
    if (qs.thumb && App.world.builder.thumb) {   // 썸네일 카메라(빌더가 지정)
      var th = App.world.builder.thumb;
      if (th.x !== undefined) { App.me.x = th.x; App.me.z = th.z; }
      if (th.yaw !== undefined) { App.ctl.yaw = th.yaw * PI / 180; App.me.yaw = App.ctl.yaw; }
      if (th.pitch !== undefined) App.ctl.pitch = th.pitch * PI / 180;
      if (th.zoom !== undefined) App.ctl.zoom = th.zoom;
      if (th.hour !== undefined) App.world.setHour(th.hour);
    }
  }

  // ---- 내 아바타 ----
  function beginSit(seatId) {
    var me = App.me, sp = App.logic.seatPos(seatId);
    if (!sp) return;
    cancelWalk('sit');
    me.mode = 'sitting'; me.seat = seatId; me.t = 0; me.fx = me.x; me.fz = me.z; me.fyaw = me.yaw;
    me.tx = sp.x; me.tz = sp.z; me.tyaw = sp.yaw; me.pendingStand = false;
    App.net.setMySeat(seatId);
    App.meAv.setSeated(true); App.meAv.setWalk(0);
    setNear(null, null);
    me.vx = me.vz = 0;
  }
  function beginStand() {
    var me = App.me, st = App.logic.standPos(me.seat);
    me.mode = 'standing'; me.t = 0; me.fx = me.x; me.fz = me.z; me.fyaw = me.yaw;
    me.tx = st.x; me.tz = st.z; me.tyaw = st.yaw;
    App.meAv.setSeated(false); App.meAv.setPray(false);
  }

  var api = {
    init: function (o) { start(o); },
    setChurch: function (o) { if (o.church && o.church !== App.church) loadWorld(o.church); },
    setJoystick: function (o) { if (App.ctl) App.ctl.setJoystick(o.x, o.y); },
    sit: function (o) {
      if (!App.started || App.me.mode !== 'walk') return;
      var seat = o && o.seat, me = App.me;
      if (seat) {
        var si = App.logic.seatInfo(seat);
        if (!si || isTaken(seat) || Math.hypot(si.x - me.x, si.z - me.z) > 3.2) seat = null;
      }
      if (!seat) seat = App.logic.nearestSeat(me.x, me.z, isTaken);
      if (seat) beginSit(seat);
    },
    stand: function () {
      var me = App.me;
      if (!App.started) return;
      if (me.mode === 'seated') beginStand();
      else if (me.mode === 'sitting') me.pendingStand = true;
    },
    setPraying: function (o) { if (App.meAv && App.me.mode !== 'walk') App.meAv.setPray(!!o.on); },
    setAvatar: function (o) { if (o.avatar) { App.cfg = o.avatar; if (App.meAv) App.meAv.setConfig(o.avatar); } },
    setPeers: function (o) { if (App.net) App.net.setPeers(o.peers || [], o.seats || {}); },
    peerJoin: function (o) { if (App.net && o.peer) App.net.peerJoin(o.peer); },
    peerLeave: function (o) { if (App.net) App.net.peerLeave(o.id, !!o.aoi); },
    peerSnap: function (o) { if (App.net && o.p) App.net.peerSnap(o.p); },
    peerSeat: function (o) { if (App.net) App.net.peerSeat(o.id, o.seat); },
    peerStand: function (o) { if (App.net) App.net.peerStand(o.id); },
    peerPraying: function (o) { if (App.net) App.net.peerPraying(o.id, !!o.on, o.ms === undefined ? -1 : o.ms); },
    peerEmote: function (o) { if (App.net) App.net.peerEmote(o.id, o.e); },
    setCandles: function (o) { if (App.world) App.world.setCandles(o.candles || []); },
    lightCandle: function (o) { if (App.world) { App.world.lightCandle(o); root.ChurchAudio.chime(); } },
    setAmbient: function (o) { App.ambient = !!o.on; root.ChurchAudio.setAmbient(App.ambient); },
    setHour: function (o) { if (App.world) App.world.setHour(+o.hour); },
    setSolo: function (o) { App.solo = !!o.on; if (App.crowd) App.crowd.set(App.solo); },
    setQuality: function (o) { App.quality = o.quality === 'low' ? 'low' : 'high'; if (App.R) { App.R.autoTier = App.quality === 'high' && qs.autotier !== '0'; App.R.setTier(App.quality, App.world); } resize(); },
    emote: function (o) { if (App.meAv) App.meAv.playEmote(o.e); },
    // 스테이션으로 걸어간다. kind: candle|altar|seat|entrance|font, index: 스탠드/성수대 번호, seat: 특정 좌석 id
    walkTo: function (o) { walkTo(o || {}); },
    cancelWalk: function () { cancelWalk('api'); },
    // Flutter 가 왼쪽 절반 터치를 가로채므로, 거기서 일어난 탭을 화면 좌표(CSS px)로 넘겨 받는다.
    tapAt: function (o) { tapAt(+o.x, +o.y); },
    setSeatTaken: function (o) {
      if (!App.net || !o.seat) return;
      App.net.occ[o.seat] = o.id || '?';
      var me = App.me;
      if (me && me.seat === o.seat && (me.mode === 'seated' || me.mode === 'sitting')) {
        App.net.setMySeat(null);
        // 즉시 일어서서 통로로 돌려보낸다
        var st = App.logic.standPos(me.seat);
        me.mode = 'standing'; me.t = 0; me.fx = me.x; me.fz = me.z; me.fyaw = me.yaw; me.tx = st.x; me.tz = st.z; me.tyaw = st.yaw;
        App.meAv.setSeated(false); App.meAv.setPray(false);
        me.seat = null;
      }
    }
  };
  App.api = api;

  // ---- 자동 걷기(스테이션으로 가기) ----
  var wv = { vx: 0, vz: 0, speed: 0, yaw: 0, done: false, stuck: false };
  function cancelWalk(reason) {
    App.pendingWalk = null;
    var w = App.walkSt;
    if (!w) return;
    App.walkSt = null;
    post({ e: 'walkCancel', kind: w.kind, why: reason || '' });
  }
  function failWalk(kind, why) { App.walkSt = null; post({ e: 'walkFail', kind: kind, why: why || '' }); }
  function startWalk(o) {
    var S = App.stations, me = App.me, kind = o.kind, tg = null;
    if (!S) return;
    if (kind === 'seat') {
      if (o.seat && !isTaken(o.seat)) tg = S.seatStation(o.seat);
      if (!tg) tg = S.nearestFreeSeat(me, isTaken);
    } else if (kind === 'candle' || kind === 'altar' || kind === 'entrance' || kind === 'font') {
      tg = S.station(kind, o.index, me);
    }
    if (!tg) { failWalk(kind, 'none'); return; }
    var d = Math.hypot(tg.x - me.x, tg.z - me.z);
    var path = d < 0.15 ? { pts: [{ x: me.x, z: me.z }, { x: tg.x, z: tg.z }], len: d } : S.findPath(me, tg);
    if (!path) { failWalk(kind, 'nopath'); return; }
    App.walkSt = S.startWalk(path, tg, kind, tg.index);
    App.walkSt.seat = tg.id;
    App.turn = null;
    post({ e: 'walkStart', kind: kind, m: Math.round(path.len) });
  }
  function walkTo(o) {
    if (!App.started || !App.stations || !o || !o.kind) return;
    var me = App.me;
    if (me.mode !== 'walk') {
      // 앉아 있으면 먼저 일어선 뒤 걷는다
      App.pendingWalk = o;
      if (me.mode === 'seated') beginStand(); else if (me.mode === 'sitting') me.pendingStand = true;
      return;
    }
    startWalk(o);
  }
  function tapAt(x, y) {
    if (!App.markers || !App.camera || App.me.mode !== 'walk' || !(x >= 0) || !(y >= 0)) return;
    var w = root.innerWidth || 360, h = root.innerHeight || 640;
    var hit = App.markers.pick(x / w * 2 - 1, -(y / h * 2 - 1), App.camera, w, h);
    if (hit) walkTo({ kind: hit.kind, index: hit.index });
  }

  var joy = { x: 0, y: 0 }, vel = { vx: 0, vz: 0, speed: 0, yaw: 0 }, pp = { x: 0, z: 0 };

  // 제대 앞/성수대 자리에 서 있나(드나들 때 깜빡이지 않게 들어갈 때 1.3m, 나갈 때 2.0m). 촛불은 near.candle 이 따로 맡는다.
  function nearStation(me) {
    var S = App.stations;
    if (!S) return null;
    var st = S.stations(), best = null, bd = 1e9, cur = App.near.station;
    var list = [['altar', st.altar]];
    st.font.forEach(function (f) { list.push(['font', f]); });
    for (var i = 0; i < list.length; i++) {
      var k = list[i][0], s = list[i][1], d = Math.hypot(me.x - s.x, me.z - s.z);
      var lim = cur === k ? 2.0 : 1.3;
      if (d <= lim && d < bd) { bd = d; best = k; }
    }
    return best;
  }

  function updateMe(dt, t) {
    var me = App.me, av = App.meAv, logic = App.logic;
    var mode = me.mode;
    if (mode === 'walk') {
      App.ctl.getMove(joy);
      var walked = null;   // 이번 프레임에 도착한 자동 걷기
      var W = App.walkSt;
      if (W && joy.x * joy.x + joy.y * joy.y > 0.04) { cancelWalk('input'); W = null; }   // 스틱·키보드는 자동 걷기를 끊는다
      if (W) {
        App.stations.stepWalk(W, me, dt, wv);
        if (wv.done) { walked = { kind: W.kind, index: W.index, seat: W.seat, yaw: W.target.yaw }; App.walkSt = null; W = null; }
        else if (wv.stuck || W.t > 90) {
          // 끼었다: 지금 자리에서 길을 다시 찾는다(두 번까지). 안 되면 실패.
          var np = W.t > 90 || W.replans >= 2 ? null : App.stations.findPath(me, W.target);
          if (!np) { failWalk(W.kind, 'stuck'); W = null; }
          else { var nw = App.stations.startWalk(np, W.target, W.kind, W.index); nw.replans = W.replans + 1; nw.seat = W.seat; nw.t = W.t; App.walkSt = W = nw; }
        }
      }
      if (W) { vel.vx = wv.vx; vel.vz = wv.vz; vel.speed = wv.speed; vel.yaw = wv.yaw; }
      else logic.joyToVelocity(joy.x, joy.y, App.ctl.yaw, vel);
      if (walked) { vel.vx = vel.vz = vel.speed = 0; App.turn = { yaw: walked.yaw, t: 0.8 }; }
      var k = Math.min(1, dt * 12);
      me.vx += (vel.vx - me.vx) * k; me.vz += (vel.vz - me.vz) * k;
      var sp = Math.sqrt(me.vx * me.vx + me.vz * me.vz);
      if (sp > 0.02) {
        pp.x = me.x; pp.z = me.z;
        logic.moveCircle(pp, me.vx * dt, me.vz * dt);
        me.x = pp.x; me.z = pp.z;
      } else { me.vx = me.vz = 0; sp = 0; }
      if (vel.speed > 0.05) {
        var df = wrap(vel.yaw - me.yaw);
        me.yaw += df * Math.min(1, dt * 11);
        App.turn = null;
      } else if (App.turn) {
        // 도착: 대상(스탠드/제대)을 바라본다
        me.yaw += wrap(App.turn.yaw - me.yaw) * Math.min(1, dt * 8);
        App.turn.t -= dt; if (App.turn.t <= 0) App.turn = null;
      }
      me.speed = sp;
      av.setWalk(Math.min(1, sp / 3.2 * 1.05));
      if (sp > 0.6) { App.stepT -= dt; if (App.stepT <= 0) { App.stepT = 0.42; root.ChurchAudio.footstep(Math.random() < 0.5); } }
      var fy = logic.floorY(me.x, me.z);
      me.y += (fy - me.y) * Math.min(1, dt * 14);
      // pos 이벤트
      var moving = sp > 0.05;
      if (moving) {
        App.posT += dt;
        if (App.posT >= 0.1 || !App.wasMoving) { App.posT = 0; post({ e: 'pos', x: r2(me.x), z: r2(me.z), r: r2(me.yaw), m: 1 }); }
      } else if (App.wasMoving) { post({ e: 'pos', x: r2(me.x), z: r2(me.z), r: r2(me.yaw), m: 0 }); App.posT = 0; }
      App.wasMoving = moving;
      // 가까운 좌석/촛불
      var seat = logic.nearestSeat(me.x, me.z, isTaken);
      var cs = logic.nearestCandleSlot(me.x, me.z, function (s) { return App.world.isLit(s); });
      if (cs === null) cs = logic.nearestCandleSlot(me.x, me.z, null);
      setNear(seat, cs, nearStation(me));
      if (walked) post({ e: 'walkDone', kind: walked.kind, index: walked.index === undefined ? 0 : walked.index, seat: walked.seat || null });
    } else if (mode === 'sitting' || mode === 'standing') {
      me.t += dt;
      var dur = mode === 'sitting' ? 0.8 : 0.55, u = Math.min(1, me.t / dur), s = u * u * (3 - 2 * u);
      me.x = me.fx + (me.tx - me.fx) * s; me.z = me.fz + (me.tz - me.fz) * s;
      me.yaw = me.fyaw + wrap(me.tyaw - me.fyaw) * s;
      var fy2 = logic.floorY(me.x, me.z);
      me.y += (fy2 - me.y) * Math.min(1, dt * 14);
      av.setWalk(0);
      if (u >= 1) {
        if (mode === 'sitting') {
          me.mode = 'seated';
          post({ e: 'seated', seat: me.seat });
          if (me.pendingStand) { me.pendingStand = false; beginStand(); }
        } else {
          me.mode = 'walk'; me.seat = null; me.vx = me.vz = 0;
          App.net.setMySeat(null);
          post({ e: 'stood' });
          post({ e: 'pos', x: r2(me.x), z: r2(me.z), r: r2(me.yaw), m: 0 });
          App.wasMoving = false; App.near.seat = App.near.candle = undefined; App.near.station = null;
          if (App.pendingWalk) { var pw = App.pendingWalk; App.pendingWalk = null; startWalk(pw); }
        }
      }
    } else { av.setWalk(0); }
    av.setPose(me.x, me.y, me.z, me.yaw);
    av.update(dt, t);
  }

  var tmpV = new T.Vector3();
  function updateCamera(dt) {
    var me = App.me, ctl = App.ctl, cam = App.camera, cb = App.world.cameraBounds;
    var seated = me.mode === 'seated' || me.mode === 'sitting' ? 1 : 0;
    App.sitF += (seated - App.sitF) * Math.min(1, dt * 2.5);
    var sf = App.sitF;
    ctl.now = App.t;
    if (seated && !ctl.dragging && App.t - ctl.lastDragT > 1.2) {
      ctl.yaw += wrap((me.seat ? App.logic.seatInfo(me.seat).yaw : 0) - ctl.yaw) * (1 - Math.exp(-dt * 1.8));
    }
    // 자동 걷기 중에는 카메라가 천천히 아바타 뒤로 돌아 가는 길이 보이게 한다(직접 돌린 뒤 1.5초는 그대로 둔다)
    if (App.walkSt && !seated && !ctl.dragging && App.t - ctl.lastDragT > 1.5) ctl.yaw += wrap(me.yaw - ctl.yaw) * (1 - Math.exp(-dt * 1.6));
    var D = (7.2 * (1 - sf) + 4.4 * sf) * ctl.zoom;
    var pitch = ctl.pitch * (1 - 0.3 * sf);
    var fy = me.y + 1.0 + sf * (0.45 - 0.2);
    var dx = Math.sin(ctl.yaw), dz = Math.cos(ctl.yaw);
    // 벽 쪽(경계)에 가까우면 거리를 줄여서 같은 각도(pitch)를 유지한다. 예전에는 경계에서 잘라 내고
    // 높이만 올려서, 입구 근처에서는 화면을 정면 높이까지 내릴 수 없었다(조금 걸어야 가능했다).
    var reach = 1;
    if (dx > 1e-4) reach = Math.min(reach, (cb.x1 - me.x) / (dx * Math.cos(pitch) * D));
    else if (dx < -1e-4) reach = Math.min(reach, (cb.x0 - me.x) / (dx * Math.cos(pitch) * D));
    if (dz > 1e-4) reach = Math.min(reach, (cb.z1 - me.z) / (dz * Math.cos(pitch) * D));
    else if (dz < -1e-4) reach = Math.min(reach, (cb.z0 - me.z) / (dz * Math.cos(pitch) * D));
    reach = Math.max(0.3, Math.min(1, reach));
    var Dd = D * reach;
    var ch = Math.cos(pitch) * Dd, cv = Math.sin(pitch) * Dd;
    var desX = me.x + dx * ch, desZ = me.z + dz * ch, desY = fy + cv;
    var cx = Math.max(cb.x0, Math.min(cb.x1, desX)), cz = Math.max(cb.z0, Math.min(cb.z1, desZ));
    var cyv = desY;
    cyv = Math.min(cb.yMax, Math.max(0.7, cyv));
    if (!App.camInit) { App.camPos.set(cx, cyv, cz); App.camLook.set(me.x, fy, me.z); App.camInit = true; }
    var kp = 1 - Math.exp(-dt * 7), kl = 1 - Math.exp(-dt * 11);
    App.camPos.x += (cx - App.camPos.x) * kp; App.camPos.y += (cyv - App.camPos.y) * kp; App.camPos.z += (cz - App.camPos.z) * kp;
    App.camLook.x += (me.x - App.camLook.x) * kl; App.camLook.y += (fy - App.camLook.y) * kl; App.camLook.z += (me.z - App.camLook.z) * kl;
    cam.position.copy(App.camPos);
    cam.lookAt(App.camLook);
  }

  function loop(now) {
    if (App.maxFrames && App.frameCount >= App.maxFrames) { App.done = true; return; }
    requestAnimationFrame(loop);
    App.frameCount = (App.frameCount || 0) + 1;
    var raw = (now - App.last) / 1000, dt = Math.min(0.05, raw);
    App.last = now; App.t += dt;
    if (!App.world) return;
    App.ctl.setMoveZone(App.me.mode === 'walk');
    updateMe(dt, App.t);
    updateCamera(dt);
    App.net.setFocus(App.me.x, App.me.z);
    App.net.update(dt, App.t, now);
    App.crowd.update(dt, App.t);
    App.world.update(dt, App.t, App.me, App.camera);
    if (App.markers) App.markers.update(dt, App.t, App.me, App.camera, App.walkSt ? { kind: App.walkSt.kind, index: App.walkSt.index === undefined ? 0 : App.walkSt.index } : null, App.me.mode === 'walk');
    App.R.setExposure(App.world.env.exp * (App.expK || 1));
    var chg = App.R.render(App.scene, App.camera, dt, App.world);
    // perf(C-04): fps = 구간 평균(순간값이 아님), tier = 화질 단계, sat = 앉아 있었는지. a:1 은 자동 하향 알림(fps 가 순간값이라 평균에서 뺀다).
    var seatedNow = App.me.mode === 'seated' ? 1 : 0;
    if (chg) { App.quality = 'low'; post({ e: 'perf', fps: Math.round(1 / Math.max(raw, 0.001)), tier: App.R.tier, sat: seatedNow, a: 1 }); }
    // 시뮬레이션 dt 는 0.05초로 잘리므로 fps 는 실제 경과 시간(raw, 백그라운드 복귀 대비 1초 상한)으로 잰다.
    App.frames++; App.perfT += Math.min(raw, 1);
    // 첫 표본은 4초 뒤(입장 후 5초 안에 느린지 판단할 수 있게), 이후 5초마다.
    if (App.perfT >= (App.perfSent ? 5 : 4)) {
      App.fps = Math.round(App.frames / App.perfT);
      App.perfSent = true;
      post({ e: 'perf', fps: App.fps, tier: App.R.tier, sat: seatedNow });
      App.frames = 0; App.perfT = 0;
    }
  }

  root.ChurchAPI._bind({ api: api });
  function boot() {
    post({ e: 'ready' });
    // Flutter 없이 열었을 때(index.html 직접 열기 / 브라우저 미리보기)
    setTimeout(function () { if (!App.started) start({}); }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : this);
