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

  function viewing() { return !!(App.view && App.view.active); }
  // 창 감상 중에는 기기 화소 비율(최대 3, low 는 1.5)까지 올린다(GLASS_APP_PLAN §4.6: 정지 시 그리지 않으므로 부하가 오히려 적다)
  function pixelRatio() { var d = root.devicePixelRatio || 1; return Math.min(d, App.quality === 'low' ? 1.5 : (viewing() ? 3 : 2)); }
  function resize() {
    if (!App.renderer) return;
    var w = root.innerWidth || 360, h = root.innerHeight || 640;
    App.R.resize(w, h, pixelRatio());
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    App.camera.aspect = w / h;
    if (viewing()) { App.view.onResize(); App.camera.updateProjectionMatrix(); kick(); return; }
    // 세로 화면에서는 시야를 넓힌다
    App.camera.fov = w / h < 0.8 ? 62 : 52;
    App.camera.updateProjectionMatrix();
    kick();
  }
  // 그리기 고리 다시 돌리기(감상 모드는 멈춰 있을 때 rAF 를 쉰다)
  function kick() {
    if (!App.started || App.rafOn || App.paused) return;   // 일시정지(pause) 중에는 깨우지 않는다
    App.rafOn = true; App.last = performance.now();
    requestAnimationFrame(loop);
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

  // vopts.view: 감상실(ch_glass) 매개변수. 감상실(builder.viewing)은 좌석·스테이션·표식·군중·서버 연결이 없다.
  function loadWorld(id, vopts) {
    if (App.markers) { App.markers.dispose(); App.markers = null; }
    App.walkSt = null; App.pendingWalk = null; App.turn = null;
    if (App.place) App.place.clear();   // 성당 안 사진 창(G-29): 월드를 버리기 전에 판·질감 해제
    if (App.cross) App.cross.clear();   // 십자가의 길 14처 판(SPEC §32)
    if (App.world) { App.world.dispose(); App.world = null; }
    if (App.view) App.view.unpark();
    var w = root.ChurchWorld.create(App.scene, { church: id, quality: App.R.tier, hour: App.hourInit, renderer: App.renderer, view: vopts && vopts.view });
    if (App.R.envTex) w.setEnvironment(App.R.envTex);
    App.world = w; App.logic = w.logic; App.church = w.id;
    kick();
    if (w.builder.viewing) {
      var vs = w.layout.spawn, vme = App.me;
      vme.x = vs.x; vme.z = vs.z; vme.yaw = 0; vme.y = 0; vme.vx = vme.vz = 0; vme.mode = 'walk'; vme.seat = null;
      App.stations = null; App.near.seat = App.near.candle = undefined; App.near.station = null;
      if (console && console.log) console.log('[church] view room ' + w.id + ' stats', JSON.stringify(w.stats));
      return;
    }
    App.net.setLogic(w.logic); App.crowd.setLogic(w.logic);
    if (App.place) App.place.load(w);   // 이 성당의 진본 사진 창을 비동기로 건다(없거나 못 읽으면 절차적 유리 그대로)
    var sp = w.layout.spawn;
    var me = App.me;
    me.x = sp.x; me.z = sp.z; me.yaw = sp.r || 0; me.y = w.logic.floorY(sp.x, sp.z); me.vx = 0; me.vz = 0; me.mode = 'walk'; me.seat = null;
    App.net.setMySeat(null);
    App.ctl.yaw = me.yaw; App.camInit = false;
    App.meAv.setSeated(false); App.meAv.setPray(false);
    App.rosary = false; App.meAv.setRosary(false);
    App.near.seat = App.near.candle = undefined; App.near.station = null;
    // 스테이션(촛불 봉헌대·제대 앞·성수대): 걸어서 가는 자리와 표식
    App.stations = root.ChurchStations.create(w.logic);
    var stn = App.stations.stations();
    if (!qs.thumb && qs.markers !== '0') App.markers = root.ChurchMarkers.create(w.group, App.stations, w.logic);
    // 십자가의 길 14처 판: 자리는 바로 유도하고(cross 개수), 그림은 비동기로 싣는다(?cross=0 이면 끔)
    if (App.cross && !qs.thumb && qs.cross !== '0') App.cross.load(w);
    post({ e: 'stations', church: w.id, candle: stn.candle.length, altar: 1, font: stn.font.length, entrance: 1, cross: App.cross ? App.cross.count() : 0 });
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
      App.meAv = new root.ChurchAvatar.Avatar(App.cfg, { self: true });
      App.scene.add(App.meAv.root);
      root.ChurchRenderUtil.markCaster(App.meAv.root);
      App.net = root.ChurchNetView.create(App.scene);
      App.crowd = root.ChurchNetView.createCrowd(App.scene);
      App.view = root.ChurchGlassView.create(App, { start: start, loadWorld: loadWorld, kick: kick, post: post, resize: resize });
      if (root.ChurchGlassPlace) App.place = root.ChurchGlassPlace.create(App, { post: post });
      if (root.ChurchWayCross) App.cross = root.ChurchWayCross.create(App, { post: post });
      resize();
      App.rafOn = true;   // 첫 고리는 사진 질감이 준비된 뒤(go) 시작한다
      loadWorld(church);
      App.last = performance.now();
      var go = function () { App.last = performance.now(); requestAnimationFrame(loop); };
      if (root.ChurchPhotos) root.ChurchPhotos.whenReady(go, 2500); else go();
    } else {
      App.meAv.setConfig(App.cfg);
      if (viewing() && !o.church) church = App.church;              // 감상 중 init 재호출: 장면을 바꾸지 않는다
      else if (viewing() && church !== App.church) App.view.api.endView();
      if (church !== App.church) loadWorld(church);
      resize();
    }
    if (o.hour !== undefined) App.world.setHour(+o.hour);
    if (o.solo !== undefined) { App.solo = !!o.solo; App.crowd.set(App.solo); }
    if (o.ambient !== undefined) { App.ambient = !!o.ambient; if (!App.paused) root.ChurchAudio.setAmbient(App.ambient); }
    // 테스트용 URL 초기 자세
    if (qs.x !== undefined && qs.z !== undefined) { App.me.x = +qs.x; App.me.z = +qs.z; }
    if (qs.yaw !== undefined) { App.ctl.yaw = (+qs.yaw) * PI / 180; App.me.yaw = App.ctl.yaw; }
    if (qs.pitch !== undefined) App.ctl.pitch = (+qs.pitch) * PI / 180;
    if (qs.look !== undefined) App.ctl.look = Math.max(0, Math.min(1.35, (+qs.look) * PI / 180 || 0));   // 끌기와 같은 상한(77°): 90° 를 넘기면 시선이 뒤로 뒤집힌다
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
    App.posture = 'sit'; me.standWait = false; applyPosture(false);
    setNear(null, null);
    me.vx = me.vz = 0;
  }
  // 기도 자세(SPEC §28.4): 'sit' 앉아서 | 'kneel' 무릎 꿇고. 앉아 있을 때만 적용하고, 전환이 끝나면 posture 이벤트를 보낸다.
  function applyPosture(notify) {
    var me = App.me, kneel = App.posture === 'kneel' && (me.mode === 'seated' || me.mode === 'sitting') && !me.standWait;
    App.meAv.setKneel(kneel, kneel ? App.logic.kneelSpot(me.seat) : null);
    me.postureNote = notify ? (kneel ? 'kneel' : 'sit') : null;
  }
  function beginStand() {
    var me = App.me, st = App.logic.standPos(me.seat);
    // 무릎 꿇고 있었으면 먼저 앉은 자세로 돌아온 다음 일어난다
    if (App.meAv.kneelAmt > 0.12) { me.standWait = true; App.meAv.setKneel(false); me.postureNote = null; return; }
    me.standWait = false;
    me.mode = 'standing'; me.t = 0; me.fx = me.x; me.fz = me.z; me.fyaw = me.yaw;
    me.tx = st.x; me.tz = st.z; me.tyaw = st.yaw;
    App.meAv.setSeated(false); App.meAv.setPray(false);
  }

  // ---- 일시정지·복원(보이지 않는 동안 그리기·소리를 멈추고, 돌아오면 그 자리에서 잇는다) ----
  function fin(v, d) { v = +v; return isFinite(v) ? v : d; }
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // 지금 상태(위치·좌석·자세·카메라·걷는 목적지). 감상실·창 감상 중에는 null.
  function snapshot() {
    var me = App.me, ctl = App.ctl;
    if (!App.started || !me || !ctl || !App.world || App.world.builder.viewing || viewing()) return null;
    var sit = me.mode === 'seated' || (me.mode === 'sitting' && !me.pendingStand);
    var x = me.x, z = me.z, r = me.yaw;
    if (me.mode === 'standing') { x = me.tx; z = me.tz; r = me.tyaw; }
    else if (me.mode === 'sitting' && me.pendingStand) { x = me.fx; z = me.fz; r = me.fyaw; }
    var s = { e: 'state', church: App.church, x: r2(x), z: r2(z), r: r2(r), seat: sit ? me.seat : null, posture: sit && App.posture === 'kneel' ? 'kneel' : 'sit',
      cy: r2(ctl.yaw), cp: r2(ctl.pitch), cz: r2(ctl.zoom), cl: r2(ctl.look) };
    if (App.rosary) s.rosary = 1;
    var w = App.walkSt || App.pendingWalk;
    if (w && w.kind) s.walk = { kind: w.kind, index: w.index === undefined ? 0 : w.index, seat: w.seat || null };
    return s;
  }
  function pause() {
    if (App.paused) return;
    App.paused = true;
    if (App.ctl) App.ctl.setJoystick(0, 0);
    if (App.me && !App.walkSt) App.me.vx = App.me.vz = 0;   // 스틱으로 걷던 관성도 멈춘다(자동 걷기는 돌아와서 잇는다)
    var A = root.ChurchAudio;
    try { A.setAmbient(false); if (A.ctx && A.ctx.suspend) A.ctx.suspend(); } catch (e) { /* ignore */ }
    var s = snapshot();
    if (s) post(s);
  }
  function resume() {
    if (!App.paused) return;
    App.paused = false;
    if (App.ambient) { try { root.ChurchAudio.setAmbient(true); } catch (e) { /* ignore */ } }
    kick();   // App.last 를 지금으로 맞추고 다시 그린다(멈춰 있던 시간만큼 건너뛰지 않는다)
  }
  // 새 장면(WebView 를 다시 만든 뒤)에 저장해 둔 상태를 적용한다. 좌석에 이미 누가 있으면 그 줄 통로에 세운다. → {e:'restored'}
  function restore(o) {
    if (!App.started || !App.world || App.world.builder.viewing || viewing() || !o) return;
    if (o.church && o.church !== App.church) return;
    var me = App.me, ctl = App.ctl, logic = App.logic;
    cancelWalk('restore'); App.turn = null;
    ctl.yaw = fin(o.cy, ctl.yaw); ctl.pitch = clampN(fin(o.cp, ctl.pitch), 0.06, 1.25);
    ctl.zoom = clampN(fin(o.cz, ctl.zoom), 0.55, 1.6); ctl.look = clampN(fin(o.cl, 0), 0, 1.35);
    var seat = typeof o.seat === 'string' && logic.seatInfo(o.seat) ? o.seat : null, sat = false;
    // 혼자 모드의 배경 신자가 내 자리에 앉았으면 자리를 다시 뽑는다
    for (var i = 0; seat && i < 8 && App.crowd.isTaken(seat) && !App.net.isTaken(seat); i++) App.crowd.set(App.solo, true);
    me.vx = me.vz = 0; me.pendingStand = false; me.standWait = false; me.t = 0;
    if (seat && !isTaken(seat)) {
      var sp = logic.seatPos(seat);
      me.mode = 'seated'; me.seat = seat; me.x = sp.x; me.z = sp.z; me.yaw = sp.yaw;
      App.net.setMySeat(seat);
      App.meAv.setSeated(true); App.meAv.setWalk(0);
      App.posture = o.posture === 'kneel' ? 'kneel' : 'sit'; applyPosture(false);
      App.sitF = 1; setNear(null, null); sat = true;
    } else {
      var x = fin(o.x, me.x), z = fin(o.z, me.z), r = fin(o.r, me.yaw);
      if (seat) { var st = logic.standPos(seat); x = st.x; z = st.z; r = st.yaw; }
      pp.x = x; pp.z = z; logic.moveCircle(pp, 0, 0);   // 벽·가구 안이면 밀어낸다
      me.mode = 'walk'; me.seat = null; me.x = pp.x; me.z = pp.z; me.yaw = r;
      App.net.setMySeat(null);
      App.meAv.setSeated(false); App.meAv.setPray(false);
      App.near.seat = App.near.candle = undefined; App.near.station = null;
    }
    App.rosary = !!o.rosary; App.meAv.setRosary(App.rosary);
    me.y = logic.floorY(me.x, me.z);
    App.meAv.setPose(me.x, me.y, me.z, me.yaw);
    App.camInit = false; App.wasMoving = false;
    if (sat) post({ e: 'seated', seat: seat });
    post({ e: 'restored', seat: sat ? seat : null, lost: seat && !sat ? 1 : 0, x: r2(me.x), z: r2(me.z), r: r2(me.yaw) });
    if (!sat && o.walk && o.walk.kind) walkTo(o.walk);
    kick();
  }

  var api = {
    init: function (o) { start(o); },
    // 보이지 않는 동안(다른 탭·다른 화면·앱 백그라운드) 그리기 고리와 소리를 멈춘다. 멈추면서 {e:'state'} 로 지금 상태를 알린다.
    pause: function () { pause(); },
    resume: function () { resume(); },
    getState: function () { var s = snapshot(); if (s) post(s); },
    restore: function (o) { restore(o); },
    setChurch: function (o) { if (o.church && o.church !== App.church) { if (viewing()) App.view.api.endView(); if (o.church !== App.church) loadWorld(o.church); } },
    // 창 감상(G-07, SPEC §22): 실제 처리는 glass_view.js
    viewWindow: function (o) { if (!App.started) start({ church: 'glass_room', quality: o && o.quality }); App.view.api.viewWindow(o); },
    endView: function () { if (App.view) App.view.api.endView(); },
    setViewLight: function (o) { if (App.view) App.view.api.setViewLight(o); },
    setViewTier: function (o) { if (App.view) App.view.api.setViewTier(o); },
    resetView: function () { if (App.view) App.view.api.resetView(); },
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
    // 묵주를 든다/내려놓는다(SPEC §32). 서 있을 때(자리로 걸어가는 동안)도 손에 든다. 다른 사람의 묵주는 peerPraying 의 r.
    setRosary: function (o) { App.rosary = !!(o && o.on); if (App.meAv) App.meAv.setRosary(App.rosary); },
    // 기도 자세 고르기. 앉아 있지 않으면 무시한다(다음에 앉아도 적용하지 않는다: 앉은 뒤 Flutter 가 다시 보낸다).
    setPrayerPosture: function (o) {
      var me = App.me, p = o && o.posture === 'kneel' ? 'kneel' : 'sit';
      if (!App.meAv || !me || (me.mode !== 'seated' && me.mode !== 'sitting') || me.standWait) return;
      App.posture = p; applyPosture(true);
    },
    setAvatar: function (o) { if (o.avatar) { App.cfg = o.avatar; if (App.meAv) App.meAv.setConfig(o.avatar); } },
    setPeers: function (o) { if (App.net) App.net.setPeers(o.peers || [], o.seats || {}); },
    peerJoin: function (o) { if (App.net && o.peer) App.net.peerJoin(o.peer); },
    peerLeave: function (o) { if (App.net) App.net.peerLeave(o.id, !!o.aoi); },
    peerSnap: function (o) { if (App.net && o.p) App.net.peerSnap(o.p); },
    peerSeat: function (o) { if (App.net) App.net.peerSeat(o.id, o.seat); },
    peerStand: function (o) { if (App.net) App.net.peerStand(o.id); },
    peerPraying: function (o) { if (App.net) App.net.peerPraying(o.id, !!o.on, o.ms === undefined ? -1 : o.ms, o.k ? 1 : 0, o.r ? 1 : 0); },
    peerEmote: function (o) { if (App.net) App.net.peerEmote(o.id, o.e); },
    setCandles: function (o) { if (App.world) App.world.setCandles(o.candles || []); },
    lightCandle: function (o) { if (App.world) { App.world.lightCandle(o); root.ChurchAudio.chime(); } },
    setAmbient: function (o) { App.ambient = !!o.on; if (!App.paused) root.ChurchAudio.setAmbient(App.ambient); },
    setHour: function (o) { if (App.world) App.world.setHour(+o.hour); },
    setSolo: function (o) {
      App.solo = !!o.on;
      if (!App.crowd) return;
      App.crowd.set(App.solo);
      // 배경 신자가 내가 앉아 있는 자리를 뽑았으면 다시 뽑는다(접속이 끊겨 혼자 모드로 바뀔 때)
      for (var i = 0; i < 8 && App.me && App.me.seat && App.crowd.isTaken(App.me.seat); i++) App.crowd.set(App.solo, true);
    },
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
    } else if (kind === 'cross') {
      tg = App.cross ? App.cross.station(o.index) : null;   // 십자가의 길 n처 판 앞(index 0..13)
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
    if (viewing()) return;
    if (!App.camera || App.me.mode !== 'walk' || !(x >= 0) || !(y >= 0)) return;
    var w = root.innerWidth || 360, h = root.innerHeight || 640;
    var hit = App.markers ? App.markers.pick(x / w * 2 - 1, -(y / h * 2 - 1), App.camera, w, h) : null;
    if (hit) { walkTo({ kind: hit.kind, index: hit.index }); return; }
    // 십자가의 길 판을 누르면 그 판 앞으로 걷는다(도착하면 Flutter 가 묵상 시트를 연다)
    var ci = App.cross ? App.cross.pick(x / w * 2 - 1, -(y / h * 2 - 1), App.camera) : -1;
    if (ci >= 0) { walkTo({ kind: 'cross', index: ci }); return; }
    // 표식이 아니면 사진 창을 눌렀는지 본다(G-29) → {e:'glassTap'}
    if (App.place) App.place.tap(x / w * 2 - 1, -(y / h * 2 - 1), App.camera);
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
    } else {
      av.setWalk(0);
      if (me.standWait && av.kneelAmt <= 0.12) beginStand();
      else if (me.postureNote && av.kneelLin === av.kneelTarget) { post({ e: 'posture', posture: me.postureNote, seat: me.seat }); me.postureNote = null; }
    }
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
    // 무릎 꿇으면 몸이 좌석 앞 무릎틀로 나간다: 카메라가 보는 점도 그만큼 앞으로(아바타가 향한 쪽)
    var ko = App.meAv.kneelOffset(), mx = me.x - Math.sin(me.yaw) * ko, mz = me.z - Math.cos(me.yaw) * ko;
    // 벽 쪽(경계)에 가까우면 거리를 줄여서 같은 각도(pitch)를 유지한다. 예전에는 경계에서 잘라 내고
    // 높이만 올려서, 입구 근처에서는 화면을 정면 높이까지 내릴 수 없었다(조금 걸어야 가능했다).
    var reach = 1;
    if (dx > 1e-4) reach = Math.min(reach, (cb.x1 - mx) / (dx * Math.cos(pitch) * D));
    else if (dx < -1e-4) reach = Math.min(reach, (cb.x0 - mx) / (dx * Math.cos(pitch) * D));
    if (dz > 1e-4) reach = Math.min(reach, (cb.z1 - mz) / (dz * Math.cos(pitch) * D));
    else if (dz < -1e-4) reach = Math.min(reach, (cb.z0 - mz) / (dz * Math.cos(pitch) * D));
    if (App.place) reach = Math.min(reach, App.place.camReach(D));   // 좁은 곳의 사진 창을 보는 동안은 카메라를 당긴다(G-29, 밀라노 회랑)
    reach = Math.max(0.3, Math.min(1, reach));
    var Dd = D * reach;
    var ch = Math.cos(pitch) * Dd, cv = Math.sin(pitch) * Dd;
    var desX = mx + dx * ch, desZ = mz + dz * ch, desY = fy + cv;
    var cx = Math.max(cb.x0, Math.min(cb.x1, desX)), cz = Math.max(cb.z0, Math.min(cb.z1, desZ));
    var cyv = desY;
    cyv = Math.min(cb.yMax, Math.max(0.7, cyv));
    if (!App.camInit) { App.camPos.set(cx, cyv, cz); App.camLook.set(mx, fy, mz); App.camInit = true; }
    var kp = 1 - Math.exp(-dt * 7), kl = 1 - Math.exp(-dt * 11);
    App.camPos.x += (cx - App.camPos.x) * kp; App.camPos.y += (cyv - App.camPos.y) * kp; App.camPos.z += (cz - App.camPos.z) * kp;
    App.camLook.x += (mx - App.camLook.x) * kl; App.camLook.y += (fy - App.camLook.y) * kl; App.camLook.z += (mz - App.camLook.z) * kl;
    // 천장 올려다보기: ctl.look(라디안)만큼 시선을 위로 든다. 아바타를 보는 시선과 부드럽게 섞는다.
    // 걷기 시작하면 서서히 원래 시점으로 돌아온다.
    if (ctl.look > 0 && me.mode === 'walk' && Math.hypot(me.vx, me.vz) > 0.6 && !ctl.dragging) {
      ctl.look = Math.max(0, ctl.look - dt * 1.2);
    }
    var lookTarget = App.camLook;
    if (ctl.look > 0.001) {
      var wl = Math.min(1, ctl.look / 0.2);
      var ca = Math.cos(ctl.look), sa = Math.sin(ctl.look);
      var gx = App.camPos.x - dx * ca * 20, gy = App.camPos.y + sa * 20, gz = App.camPos.z - dz * ca * 20;
      lookTarget = tmpV.set(App.camLook.x + (gx - App.camLook.x) * wl, App.camLook.y + (gy - App.camLook.y) * wl, App.camLook.z + (gz - App.camLook.z) * wl);
    }
    cam.position.copy(App.camPos);
    cam.lookAt(lookTarget);
  }

  // 내 이름표의 화면 사각형(CSS px). 표식 이름표가 이 위를 덮지 않게 피하는 데 쓴다(우선순위: 내 이름 > 표식).
  var tagV = new T.Vector3();
  function myTagRect(vw, vh) {
    var av = App.meAv, tg = av && av.tag;
    if (!tg || !tg.visible || !(av.tagPx > 0)) return null;
    tagV.set(av.root.position.x, av.root.position.y + tg.position.y, av.root.position.z).project(App.camera);
    if (tagV.z > 1) return null;
    // 이름표 알약 + 그 아래 머리(0.3m)까지를 '내 이름 자리'로 본다: 표식 이름표가 내 머리를 덮지 않게.
    var head = 0.3 * av.tagPpm, w = Math.max(av.tagPx * 3.84, 0.4 * av.tagPpm), h = av.tagPx + head;
    return { cx: (tagV.x * 0.5 + 0.5) * vw, cy: (-tagV.y * 0.5 + 0.5) * vh + head / 2, w: w, h: h };
  }

  function loop(now) {
    if (App.paused) { App.rafOn = false; return; }   // 보이지 않는 동안: 다음 프레임을 청하지 않는다(resume 이 kick 으로 다시 깨운다)
    if (App.maxFrames && App.frameCount >= App.maxFrames) { App.done = true; App.rafOn = false; return; }
    App.frameCount = (App.frameCount || 0) + 1;
    var raw = (now - App.last) / 1000, dt = Math.min(0.05, raw);
    App.last = now; App.t += dt;
    // 창 감상: 필요할 때만 그린다(입력·활강·페이드·빛 바꾸기). 할 일이 없으면 rAF 를 멈추고 kick() 이 다시 깨운다.
    if (App.view && (App.view.active || App.view.parked)) {
      var busy = false;
      try { busy = App.view.frame(dt); } catch (e) { if (console && console.error) console.error('[church] view frame', e); }
      if (busy) requestAnimationFrame(loop); else App.rafOn = false;
      return;
    }
    requestAnimationFrame(loop);
    if (!App.world) return;
    App.ctl.setMoveZone(App.me.mode === 'walk');
    updateMe(dt, App.t);
    updateCamera(dt);
    // 3D 이름표 크기 보정: 카메라 행렬을 갱신하고 아바타·표식에 알린다
    var vw = root.innerWidth || 360, vh = root.innerHeight || 640;
    App.camera.updateMatrixWorld();
    App.camera.matrixWorldInverse.copy(App.camera.matrixWorld).invert();
    root.ChurchAvatar.setView(App.camera, vh);
    App.net.setFocus(App.me.x, App.me.z);
    App.net.update(dt, App.t, now);
    App.crowd.update(dt, App.t);
    App.world.update(dt, App.t, App.me, App.camera);
    if (App.place) App.place.update(dt, App.me, App.camera);
    if (App.cross) App.cross.update(dt, App.me, App.camera);
    if (App.markers) App.markers.update(dt, App.t, App.me, App.camera, App.walkSt ? { kind: App.walkSt.kind, index: App.walkSt.index === undefined ? 0 : App.walkSt.index } : null, App.me.mode === 'walk', { w: vw, h: vh, avoid: myTagRect(vw, vh) });
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

  // 시험용: ?view=<창 id>&vmode=room|church&tier=t1|t2&light=ref|sun|night&vhour=10
  if (qs.view) setTimeout(function () { var t = setInterval(function () { if (!App.started) return; clearInterval(t); api.viewWindow({ win: qs.view, mode: qs.vmode || 'room', tier: qs.tier || 't2', light: qs.light || 'ref', hour: qs.vhour === undefined ? undefined : +qs.vhour }); }, 50); }, 0);
  root.ChurchAPI._bind({ api: api });
  function boot() {
    post({ e: 'ready' });
    // Flutter 없이 열었을 때(index.html 직접 열기 / 브라우저 미리보기)
    setTimeout(function () { if (!App.started) start({}); }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : this);
