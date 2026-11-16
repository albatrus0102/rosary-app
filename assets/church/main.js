/* main.js — 앱 코어: 렌더러, 카메라, 내 아바타 상태 기계, 이벤트 보고. */
(function (root) {
  'use strict';
  var T = root.THREE, PI = Math.PI;
  var Logic = root.ChurchLogic, post = root.ChurchBridge.post;
  var qs = (function () { var o = {}; try { new URLSearchParams(root.location.search).forEach(function (v, k) { o[k] = v; }); } catch (e) { /* ignore */ } return o; })();

  var canvas = document.getElementById('c');
  var App = {
    started: false, quality: 'high', qMode: 'auto', renderer: null, scene: null, camera: null, world: null, logic: null,
    maxFrames: +(qs.frames || 0), frameCount: 0, done: false, me: null, meAv: null, ctl: null, net: null, crowd: null, cfg: { skin: 1, style: 0, hair: 2, outfit: 6, name: 0 },
    near: { seat: null, candle: null, station: null }, stations: null, markers: null, walkSt: null, pendingWalk: null, turn: null, frames: 0, perfT: 0, t: 0, last: 0, posT: 0, wasMoving: false, stepT: 0, fps: 60,
    camPos: new T.Vector3(), camLook: new T.Vector3(), camInit: false, sitF: 0, spot: null, spotF: 0, spotYaw: 0, spotSeat: false, spotKind: null, seeK: 0, seeW: 0, seeL: 0, avA: 1, rig: null, camCfg: { auto: true, dist: 1, follow: true }, church: 'basic', solo: false, ambient: false
  };
  root.__church = App;

  function wrap(a) { while (a > PI) a -= PI * 2; while (a < -PI) a += PI * 2; return a; }
  // 화질 방식: App.qMode = 'auto'|'high'|'mid'|'low', App.quality = 실제 단계('high'|'mid'|'low'). 자동만 느릴 때 단계를 내린다.
  function setQMode(q) { App.qMode = q === 'low' || q === 'mid' || q === 'high' ? q : 'auto'; App.quality = App.qMode === 'auto' ? 'high' : App.qMode; }
  function autoOn() { return App.qMode === 'auto' && qs.autotier !== '0'; }
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
    applyInset(w, h);
    App.camera.updateProjectionMatrix();
    kick();
  }
  // 아래 패널(성당 묵주 패널)이 덮는 비율만큼 그림을 위로 옮긴다(투영 오프셋: 가운데가 남은 영역의 가운데로).
  function applyInset(w, h) {
    var b = App.inset || 0;
    // 0.72: 아바타(카메라가 보는 머리 높이)가 패널 위 남은 영역의 가운데보다 조금 위에 오게
    if (b > 0) App.camera.setViewOffset(w, h, 0, h * b * 0.72, w, h); else App.camera.clearViewOffset();
  }
  // 그리기 고리 다시 돌리기(감상 모드는 멈춰 있을 때 rAF 를 쉰다)
  function kick() {
    if (!App.started || App.rafOn || App.paused) return;   // 일시정지(pause) 중에는 깨우지 않는다
    App.rafOn = true; App.last = performance.now();
    requestAnimationFrame(loop);
  }
  root.addEventListener('resize', resize);
  root.addEventListener('orientationchange', function () { setTimeout(resize, 150); });

  // '가기' 메뉴의 성모상 줄 이름(shrine_places.go_ko, 기본 '성모상').
  function shrineGoLabel(id) { var P = root.ChurchShrinePlaces, p = P && P[id]; return (p && p.go_ko) || '성모상'; }
  var nearShrineNow = false;   // nearStation 이 고른 곳이 성모상 앞인가(제대 앞과 같은 'altar' 칩이지만 묵주기도를 서서 한다)
  function setNear(seat, candle, station) {
    if (station === undefined) station = null;
    var shr = station === 'altar' && nearShrineNow;
    if (seat === App.near.seat && candle === App.near.candle && station === App.near.station && shr === !!App.near.shrine) return;
    App.near.seat = seat; App.near.candle = candle; App.near.station = station; App.near.shrine = shr;
    if (App.world) App.world.setHighlight(seat, candle);
    post({ e: 'near', seat: seat, candle: candle, station: station, shrine: shr });
  }

  function isTaken(id) { return App.net.isTaken(id) || App.crowd.isTaken(id); }

  // vopts.view: 감상실(ch_glass) 매개변수. 감상실(builder.viewing)은 좌석·스테이션·표식·군중·서버 연결이 없다.
  function loadWorld(id, vopts) {
    if (App.markers) { App.markers.dispose(); App.markers = null; }
    App.walkSt = null; App.pendingWalk = null; App.turn = null;
    if (App.place) App.place.clear();   // 성당 안 사진 창(G-29): 월드를 버리기 전에 판·질감 해제
    if (App.cross) App.cross.clear();   // 십자가의 길 14처 판(SPEC §32)
    if (App.liturgy) App.liturgy.detach();   // 전례 시기 장식(SPEC §33)
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
    if (App.liturgy && !qs.thumb) App.liturgy.attach(w);   // 전례 시기 장식: 지금 시기대로 짓는다
    post({ e: 'stations', church: w.id, candle: stn.candle.length, altar: 1, font: stn.font.length, entrance: 1, cross: App.cross ? App.cross.count() : 0, shrine: stn.candle.some(function (c) { return c.shrine; }) ? 1 : 0, shrineLabel: shrineGoLabel(w.id) });
    if (console && console.log) console.log('[church] world ' + w.id + ' stats', JSON.stringify(w.stats));
  }

  function start(o) {
    o = o || {};
    if (o.avatar) App.cfg = o.avatar;
    if (o.quality) setQMode(o.quality);
    App.hourInit = o.hour === undefined ? (new Date().getHours() + new Date().getMinutes() / 60) : +o.hour;
    var church = o.church || qs.church || 'basic';
    if (!App.started) {
      App.started = true;
      try {
        App.R = root.ChurchRender.create(canvas, { quality: App.quality, autoTier: autoOn() });
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
      App.liturgy = root.ChurchLiturgy || null;
      // 첫 고리는 사진 질감이 준비된 뒤(go) 시작한다. rafOn 을 resize() 보다 먼저 켠다: 예전에는 resize() 안의 kick() 이
      // 고리를 하나 더 띄워 매 vsync 에 장면을 두 번 그렸다(PERF_SCALE.md §1, 2026-11-15 측정: 프레임당 렌더 2회).
      App.rafOn = true;
      resize();
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
    if (o.camera) applyCamCfg(o.camera);
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
    setPraying: function (o) {
      if (!App.meAv) return;
      if (App.me.mode !== 'walk') { App.meAv.setPray(!!o.on); return; }
      // 서서 하는 기도(성모상 앞 묵주기도): 걷기 모드에서도 손을 모은다. 그동안 이동 입력은 받지 않는다.
      App.standPray = !!(o.on && o.stand); App.meAv.setPray(App.standPray, true);
    },
    // 묵주를 든다/내려놓는다(SPEC §32). 서 있을 때(자리로 걸어가는 동안)도 손에 든다. 다른 사람의 묵주는 peerPraying 의 r.
    setRosary: function (o) { App.rosary = !!(o && o.on); if (App.meAv) App.meAv.setRosary(App.rosary); },
    // 아래 패널 비율(0..0.6). 투영을 위로 옮겨 아바타가 패널 위 남은 영역에 보인다(앉은 시점은 앞옆 45° 그대로, 조금 물러난다).
    setViewInset: function (o) {
      App.inset = Math.max(0, Math.min(0.6, +(o && o.bottom) || 0));
      if (App.camera) { applyInset(root.innerWidth || 360, root.innerHeight || 640); App.camera.updateProjectionMatrix(); kick(); }
    },
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
    lightCandle: function (o) {
      if (!App.world) return;
      App.world.lightCandle(o); root.ChurchAudio.chime();
      // 내가 켠 초(o.mine): 그 초 쪽으로 돌아 손을 뻗고 한 걸음 물러나 인사하는 동작. 다른 사람 화면에는 보내지 않는다(서버 초 이벤트에 보낸 사람 id 가 없다).
      if (o.mine && App.me && App.me.mode === 'walk' && App.meAv && App.world.slotPos) {
        var sp0 = App.world.slotPos(o.slot | 0);
        if (sp0) {
          App.turn = { yaw: Math.atan2(-(sp0.x - App.me.x), -(sp0.z - App.me.z)), t: 6.0 };
          App.lightG = { t: 0 };
          if (App.meAv.playLightGesture) App.meAv.playLightGesture();
        }
      }
    },
    // 카메라 설정(설정 > 성당 > 카메라, docs/church/CAMERA.md): autoZoom(벽 피하기) · dist('near'|'normal'|'far') · follow(걸을 때 뒤로 정렬)
    setCamera: function (o) { applyCamCfg(o); },
    setAmbient: function (o) { App.ambient = !!o.on; if (!App.paused) root.ChurchAudio.setAmbient(App.ambient); },
    setHour: function (o) { if (App.world) App.world.setHour(+o.hour); },
    // 전례 시기 장식(SPEC §33): {season, color, week?, feast?, memorial?}. 장면을 시작하기 전에 와도 기억해 둔다.
    setLiturgy: function (o) { if (root.ChurchLiturgy) { root.ChurchLiturgy.set(o); kick(); } },
    setSolo: function (o) {
      App.solo = !!o.on;
      if (!App.crowd) return;
      App.crowd.set(App.solo);
      // 배경 신자가 내가 앉아 있는 자리를 뽑았으면 다시 뽑는다(접속이 끊겨 혼자 모드로 바뀔 때)
      for (var i = 0; i < 8 && App.me && App.me.seat && App.crowd.isTaken(App.me.seat); i++) App.crowd.set(App.solo, true);
    },
    // 화질: 'auto'(기본: 높음에서 시작해 느리면 보통→간단) | 'high' | 'mid' | 'low' (PERF.md §화질 3단계)
    setQuality: function (o) { setQMode(o && o.quality); if (App.R) { App.R.autoTier = autoOn(); App.R.setTier(App.quality, App.world); } resize(); },
    // 성능 표시(진단): 화면 모서리에 fps·프레임 ms·해상도·단계·draw call (perf_hud.js)
    setPerfHud: function (o) { if (root.ChurchPerfHud) root.ChurchPerfHud.set(!!(o && o.on), App); },
    emote: function (o) { if (App.meAv) App.meAv.playEmote(o.e); },
    // 스테이션으로 걸어간다. kind: candle|altar|seat|entrance|font, index: 스탠드/성수대 번호, seat: 특정 좌석 id
    walkTo: function (o) { walkTo(o || {}); },
    cancelWalk: function () { cancelWalk('api'); },
    // Flutter 가 왼쪽 절반 터치를 가로채므로, 거기서 일어난 탭을 화면 좌표(CSS px)로 넘겨 받는다.
    tapAt: function (o) { tapAt(+o.x, +o.y); },
    // 앱 입력 연동: {ext} 앱이 고정 이동 손잡이를 그림(웹 스틱 끔), {pinch,k} 앱이 대신 처리하는 두 손가락 확대, {look,dx,dy} 앱이 대신 읽는 시점 끌기(controls.js)
    setInput: function (o) {
      var c = App.ctl; if (!c || !o) return;
      if (o.ext !== undefined) { c.ext = !!o.ext; if (c.ext) c.setMoveZone(false); }
      if (o.stick) c.setStick(o.stick.cx, o.stick.cy, o.stick.r);   // 앱이 그린 이동 손잡이 원(CSS px)
      if (o.pinch !== undefined) c.extPinch = !!o.pinch;
      if (o.k !== undefined) c.pinchBy(o.k);
      if (o.look !== undefined) c.setLookExt(o.look);   // 앱이 대신 읽는 시점 끌기(손잡이 + 다른 손가락)
      if (o.dx !== undefined || o.dy !== undefined) c.lookBy(o.dx, o.dy);
    },
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
    } else if (kind === 'candle' || kind === 'altar' || kind === 'entrance' || kind === 'font' || kind === 'shrine') {
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
    var list = [['altar', st.altar, false]];
    st.font.forEach(function (f) { list.push(['font', f]); });
    st.candle.forEach(function (c) { if (c.shrine) list.push(['altar', c, true]); });   // 성모상 앞(shrine.js): 제대 앞과 같은 '기도하기' 칩
    for (var i = 0; i < list.length; i++) {
      var k = list[i][0], s = list[i][1], d = Math.hypot(me.x - s.x, me.z - s.z);
      var lim = cur === k ? 2.0 : 1.3;
      if (d <= lim && d < bd) { bd = d; best = k; nearShrineNow = !!list[i][2]; }
    }
    if (!best) nearShrineNow = false;
    return best;
  }

  function updateMe(dt, t) {
    var me = App.me, av = App.meAv, logic = App.logic;
    var mode = me.mode;
    if (mode === 'walk') {
      App.ctl.getMove(joy);
      if (App.standPray) { joy.x = joy.y = 0; }
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
      if (walked) {
        vel.vx = vel.vz = vel.speed = 0; App.turn = { yaw: walked.yaw, t: 0.8 };
        // 기도 자리(제대 앞·성모 기도 자리·봉헌초·14처 판)에 닿으면 '자리 시점'으로 부드럽게 옮긴다(끌면 바로 수동)
        if (walked.kind === 'altar' || walked.kind === 'shrine' || walked.kind === 'candle' || walked.kind === 'cross') App.spot = { yaw: walked.yaw, t0: App.t, seat: false };
      }
      if (App.lightG) {
        // 초 켜기 동작: 걷기 입력이 들어오면 끊고, 아니면 0.9~1.5초에 0.3m 뒤로 물러난 뒤 성호경
        if (vel.speed > 0.05 || me.mode !== 'walk') { App.lightG = null; if (App.meAv && App.meAv.cancelGesture) App.meAv.cancelGesture(); }
        else {
          App.lightG.t += dt;
          if (App.lightG.t > 0.9 && App.lightG.t < 1.5) { pp.x = me.x; pp.z = me.z; logic.moveCircle(pp, Math.sin(me.yaw) * 0.5 * dt, Math.cos(me.yaw) * 0.5 * dt); me.x = pp.x; me.z = pp.z; }
          else if (App.lightG.t >= 6.1) App.lightG = null;
        }
      }
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
        if (App.spot && !App.spot.seat) App.spot = null;   // 다시 걸으면 자리 시점을 놓는다
      } else if (App.turn) {
        // 도착: 대상(스탠드/제대)을 바라본다
        me.yaw += wrap(App.turn.yaw - me.yaw) * Math.min(1, dt * 8);
        App.turn.t -= dt; if (App.turn.t <= 0) App.turn = null;
      }
      me.speed = sp;
      av.setWalk(Math.min(1, sp / 4.0 * 1.05));
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

  var tmpV = new T.Vector3(), spotO = { pitch: 0, D: 0, fwd: 0, up: 0 };
  var CAM_DIST = { near: 0.78, normal: 1, far: 1.25 };
  function applyCamCfg(o) {
    if (!o) return;
    var c = App.camCfg;
    if (o.autoZoom !== undefined) c.auto = !!o.autoZoom;
    if (o.dist !== undefined && CAM_DIST[o.dist]) c.dist = CAM_DIST[o.dist];
    if (o.follow !== undefined) c.follow = !!o.follow;
  }
  var rigI = { mx: 0, fy: 0, mz: 0, yaw: 0, pitch: 0, D: 0, cb: null, guard: null, auto: true, minD: 0 }, rigO = { x: 0, y: 0, z: 0, pitch: 0, dist: 0, lift: 0, fwd: 0, yaw: 0, fp: 0 };
  var CG = root.ChurchCamGuard || { SPOT: { side: 0 }, PRAY: { side: 0 }, spotBlend: function (p, D, b, f, o) { o.pitch = p; o.D = D; o.fwd = o.up = 0; return o; }, avatarAlpha: function () { return 1; } };
  // 앉기·무릎 꿇기 시점(docs/church/CAMERA.md): 앞옆 45°, 트인 쪽(cam_guard prayYaw)
  function prayYawFor(seatId) {
    var si = App.logic.seatInfo(seatId), gd = App.world.camGuard, base = 4.4 * (App.inset ? 1.3 : 1) * App.camCfg.dist;
    if (!si) return 0;
    if (!CG.prayYaw) return si.yaw + (CG.PRAY ? CG.PRAY.side : 0);
    return CG.prayYaw(gd, App.world.cameraBounds, si.x, App.me.y + 1.25, si.z, si.yaw, base * (CG.PRAY.zoom || 1), CG.PRAY.pitch);
  }
  function seeEase(cur, on, dt) { var v = cur + ((on ? 1 : 0) - cur) * Math.min(1, dt * (on ? 10 : 4)); return v < 0.003 ? 0 : v; }
  function updateCamera(dt) {
    var me = App.me, ctl = App.ctl, cam = App.camera, cb = App.world.cameraBounds;
    var seated = me.mode === 'seated' || me.mode === 'sitting' ? 1 : 0;
    App.sitF += (seated - App.sitF) * Math.min(1, dt * 2.5);
    var sf = App.sitF;
    ctl.now = App.t;
    if (!App.camInit && App.rig) App.rig.reset();   // 입장·복원·자리 옮김: 리그 상태(거리·각도·1인칭)를 새로
    // 자리 시점: 앉거나 무릎 꿇으면 앞옆 45°(App.spot.seat, 묵주 패널이 있어도) 또는 기도 자리에 도착하면(App.spot). 화면을 끌면 그 자리에서 끝(수동 조작).
    if (seated && !App.spotSeat) { App.spotSeat = true; if (me.seat) App.spot = { yaw: prayYawFor(me.seat), t0: App.t, seat: true }; }
    else if (!seated && App.spotSeat) { App.spotSeat = false; if (App.spot && App.spot.seat) App.spot = null; }
    var SP = App.spot;
    if (SP && (ctl.dragging || ctl.lastDragT > SP.t0)) SP = App.spot = null;
    if (SP) App.spotKind = SP.seat ? CG.PRAY : CG.SPOT;
    App.spotF += ((SP ? 1 : 0) - App.spotF) * Math.min(1, dt * (SP ? 1.6 : 9));
    if (App.spotF < 0.002) App.spotF = 0;
    if (SP) { App.spotYaw = SP.yaw; ctl.yaw += wrap(SP.yaw + (SP.seat ? 0 : CG.SPOT.side) - ctl.yaw) * (1 - Math.exp(-dt * 2.2)); }
    // 자동 걷기 중에는 카메라가 천천히 아바타 뒤로 돌아 가는 길이 보이게 한다(직접 돌린 뒤 1.5초는 그대로 둔다)
    // ('걸을 때 뒤로 따라가기' 켬일 때만) 조이스틱으로 앞쪽(±70°)으로 걸을 때도 아주 천천히 뒤로 정렬한다. 옆으로 걸을 땐 돌지 않는다(빙빙 돌지 않게).
    // 앉아 있을 때는 끌어서 돌린 방향을 그대로 둔다(사용자 조작이 이긴다).
    var CC = App.camCfg;
    if (CC.follow && App.walkSt && !seated && !ctl.dragging && App.t - ctl.lastDragT > 1.5) ctl.yaw += wrap(me.yaw - ctl.yaw) * (1 - Math.exp(-dt * 1.2));
    else if (CC.follow && !App.walkSt && !seated && !SP && !ctl.dragging && App.t - ctl.lastDragT > 2.5 && Math.hypot(me.vx, me.vz) > 0.6 && Math.abs(wrap(me.yaw - ctl.yaw)) < 1.2)
      ctl.yaw += wrap(me.yaw - ctl.yaw) * (1 - Math.exp(-dt * 0.5));
    var baseD = (7.2 * (1 - sf) + 4.4 * sf) * (App.inset ? 1 + 0.3 * sf : 1) * CC.dist, D = baseD * ctl.zoom;   // 묵주 패널 중에는 조금 물러나 앉은·무릎 꿇은 몸 전체가 보이게
    var pitch = ctl.pitch * (1 - 0.3 * sf);
    if (App.spotF > 0) { CG.spotBlend(pitch, D, baseD, App.spotF, spotO, App.spotKind); pitch = spotO.pitch; D = spotO.D; } else spotO.fwd = spotO.up = 0;
    var fy = me.y + 1.0 + sf * (0.45 - 0.2);
    var dx = Math.sin(ctl.yaw), dz = Math.cos(ctl.yaw);
    // 무릎 꿇으면 몸이 좌석 앞 무릎틀로 나간다: 카메라가 보는 점도 그만큼 앞으로(아바타가 향한 쪽)
    var ko = App.meAv.kneelOffset(), mx = me.x - Math.sin(me.yaw) * ko, mz = me.z - Math.cos(me.yaw) * ko;
    // 카메라 리그(cam_guard createRig — 게임식 cutaway, docs/church/CAMERA.md): 사용자 거리 D 에 가장 가까운 '설 수 있는 자리'(카메라 공간 복셀).
    // 사이의 벽·기둥은 당기지 않고 잘라낸다(아래 seeThru). 자리가 없으면 올리고(높은 3/4·내려다보기)·낮은 천장이면 내리고·그래도 안 되면 옆으로,
    // 어디에도 fpD(1.9m) 를 못 얻으면 1인칭(rigO.fp). '자동 줌' 끔이면 거리·각도를 바꾸지 않는다.
    var gd = App.world.camGuard;
    if (!App.rig) App.rig = CG.createRig ? CG.createRig() : null;
    var capR = App.place ? Math.max(0.3, Math.min(1, App.place.camReach(D))) : 1;   // 좁은 곳의 사진 창을 보는 동안은 카메라를 당긴다(G-29, 밀라노 회랑)
    var cx, cyv, cz;
    if (App.rig) {
      rigI.mx = mx; rigI.fy = fy; rigI.mz = mz; rigI.yaw = ctl.yaw; rigI.pitch = pitch; rigI.D = D * capR; rigI.cb = cb; rigI.guard = gd; rigI.auto = CC.auto;
      rigI.minD = 2.8 - 0.5 * sf;
      App.rig.solve(rigI, dt, rigO);
      cx = rigO.x; cyv = Math.min(cb.yMax, Math.max(0.7, rigO.y)); cz = rigO.z;
      dx = Math.sin(rigO.yaw); dz = Math.cos(rigO.yaw);
    } else {
      var ch0 = Math.cos(pitch) * D, cv0 = Math.sin(pitch) * D;
      cx = mx + dx * ch0; cyv = fy + cv0; cz = mz + dz * ch0; rigO.fwd = 0; rigO.fp = 0;
    }
    // 보는 점: 자리 방향(목표물 쪽)으로 fwd 앞·up 위 — 카메라는 side 만큼 비켜 있어 아바타가 화면 아래 한편에 온다
    // 리그가 카메라를 올렸으면(lift) 걷는 앞쪽(rigO.fwd)을 본다 → 아바타는 화면 아래, 가는 길이 보인다
    var lx = mx - Math.sin(App.spotYaw) * spotO.fwd - dx * rigO.fwd, ly = fy + spotO.up, lz = mz - Math.cos(App.spotYaw) * spotO.fwd - dz * rigO.fwd;
    // 1인칭(좁아서 어떤 3인칭 자리도 없을 때만): 눈 높이에서 카메라 방향 앞을 본다. 아바타는 숨긴다(거대한 반투명 얼굴 대신)
    var fp = rigO.fp || 0;
    if (fp > 0) {
      var eyY = me.y + 1.6 - 0.45 * sf, fdx = -dx, fdz = -dz;
      var ex = me.x + fdx * 0.15, ez = me.z + fdz * 0.15;
      cx += (ex - cx) * fp; cyv += (eyY - cyv) * fp; cz += (ez - cz) * fp;
      lx += (ex + fdx * 6 - lx) * fp; ly += (eyY - 0.7 - ly) * fp; lz += (ez + fdz * 6 - lz) * fp;
    }
    if (!App.camInit || rigO.cut) { App.camPos.set(cx, cyv, cz); App.camLook.set(lx, ly, lz); App.camInit = true; }   // 리그가 시점을 끊었으면(휘돌면 머리에 붙을 때) 따라가지 않고 바로
    var kp = 1 - Math.exp(-dt * (fp > 0 ? 12 : 7)), kl = 1 - Math.exp(-dt * 11);
    App.camPos.x += (cx - App.camPos.x) * kp; App.camPos.y += (cyv - App.camPos.y) * kp; App.camPos.z += (cz - App.camPos.z) * kp;
    // 안전망: 부드럽게 따라가는 중간 위치가 벽·기둥 속이면(굽은 벽 모서리를 돌 때) 목표 자리로 곧장(카메라가 면에 붙어 화면이 벽으로 가득 차지 않게)
    if (gd && CC.auto && fp < 0.5) {
      if (gd.space && App.rig && App.rig.ok) {
        if (!App.rig.ok(App.camPos.x, App.camPos.y, App.camPos.z) && App.rig.ok(cx, cyv, cz)) App.camPos.set(cx, cyv, cz);
      } else {
        var gt = gd.clipWide(mx, fy, mz, App.camPos.x, App.camPos.y, App.camPos.z, 0.08, 0.3);
        if (gt < 1) { App.camPos.x = mx + (App.camPos.x - mx) * gt; App.camPos.y = fy + (App.camPos.y - fy) * gt; App.camPos.z = mz + (App.camPos.z - mz) * gt; }
      }
    }
    // 가림 잘라내기(cutaway): 머리·가슴 → 카메라 선이 면을 지나면 그 면 종류(가는 면 / 넓은 면)를 원뿔 안에서 지운다.
    // 앉기·무릎 꿇기 중에는 낮은 물체(앞 의자 등받이·무릎틀)도. 바닥은 지우지 않는다. 세기는 짧게 녹아들고(0.1초) 풀리면 0.25초에 돌아온다.
    if (gd && gd.see) {
      var occT = false, occW = false;
      if (fp < 0.5) {
        var hy = me.y + 1.55 - 0.45 * sf;
        var t1 = gd.clip(mx, fy, mz, App.camPos.x, App.camPos.y, App.camPos.z, 0), th1 = gd.out.thin;
        var t2 = gd.clip(mx, hy, mz, App.camPos.x, App.camPos.y, App.camPos.z, 0), th2 = gd.out.thin;
        occW = t1 < 1 || t2 < 1; occT = occW || th1 < 1 || th2 < 1;
      }
      var occL = fp < 0.5 && sf > 0.5;
      App.seeK = seeEase(App.seeK, occT, dt); App.seeW = seeEase(App.seeW, occW, dt); App.seeL = seeEase(App.seeL || 0, occL, dt);
      var cdx = App.camPos.x - mx, cdy = App.camPos.y - fy, cdz = App.camPos.z - mz, cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
      // 원뿔 끝: 가슴(앉으면 몸 가운데). 반지름은 화면에서 거의 일정하게(거리 × 0.22, 1.0~2.0m)
      gd.see.set(App.camPos.x, App.camPos.y, App.camPos.z, mx, fy - 0.25 * sf, mz, App.seeK, App.seeW, App.seeL, Math.max(1.0, Math.min(2.0, cdist * 0.22)));
    }
    App.camLook.x += (lx - App.camLook.x) * kl; App.camLook.y += (ly - App.camLook.y) * kl; App.camLook.z += (lz - App.camLook.z) * kl;
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
    // 카메라가 아바타 머리에 가까우면(1.7m 미만, 사용자가 당긴 앉은 시점 정도) 아바타·이름표를 흐리게 — 최소 0.35.
    // 1인칭이면 아바타를 숨긴다. 잘라내지 못한 가림물(인스턴스 촛대 등) 뒤의 몸은 금색 실루엣(X-ray)으로 보인다(avatar.js setXray, 걷는 동안).
    var av = App.meAv;
    if (av && av.setFade) {
      var hx = App.camPos.x - mx, hy2 = App.camPos.y - (me.y + 1.55 - 0.45 * sf), hz = App.camPos.z - mz;
      var aT = CG.avatarAlpha(Math.sqrt(hx * hx + hy2 * hy2 + hz * hz));
      App.avA += (aT - App.avA) * Math.min(1, dt * 10);
      av.setFade(App.avA);
      var hide = fp > 0.15;
      if (av.root.visible === hide && !qs.thumb) av.root.visible = !hide;
      if (av.setXray) av.setXray(me.mode === 'walk' && !hide);
    }
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
    // 같은 vsync(같은 rAF 시각)에 고리가 두 번 들어오면 뒤의 것은 버린다(그 고리는 여기서 끝난다): 어디서 kick·rAF 가 겹쳐도 한 프레임 한 번만 그린다.
    if (now === App.lastNow) return;
    App.lastNow = now;
    if (App.maxFrames && App.frameCount >= App.maxFrames) { App.done = true; App.rafOn = false; return; }
    App.frameCount = (App.frameCount || 0) + 1;
    // 앉아서 가만히 기도하는 동안은 한 프레임 걸러 그린다(약 30fps; 성능 표시·시험 프레임 제한 중에는 끔).
    // 화면은 거의 정지라 차이가 보이지 않고, 발열·배터리를 줄여 다시 걸을 때의 열 제한 버벅임을 막는다. 끌기·일어서기 즉시 60fps.
    if (App.idleSkip && (App.frameCount & 1)) { App.frames++; requestAnimationFrame(loop); return; }
    var raw = (now - App.last) / 1000, dt = Math.min(0.05, raw);
    App.last = now; App.t += dt;
    // 창 감상: 필요할 때만 그린다(입력·활강·페이드·빛 바꾸기). 할 일이 없으면 rAF 를 멈추고 kick() 이 다시 깨운다.
    if (App.view && (App.view.active || App.view.parked)) {
      var busy = false;
      try { busy = App.view.frame(dt); } catch (e) { if (console && console.error) console.error('[church] view frame', e); }
      if (!App.firstFramePosted) { App.firstFramePosted = true; post({ e: 'firstFrame' }); }
      if (busy) requestAnimationFrame(loop); else App.rafOn = false;
      return;
    }
    requestAnimationFrame(loop);
    if (!App.world) return;
    var PH = root.ChurchPerfHud && root.ChurchPerfHud.on ? root.ChurchPerfHud : null, tj = PH ? performance.now() : 0;
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
    if (App.liturgy) App.liturgy.update(dt, App.t);
    if (App.markers) App.markers.update(dt, App.t, App.me, App.camera, App.walkSt ? { kind: App.walkSt.kind, index: App.walkSt.index === undefined ? 0 : App.walkSt.index } : null, App.me.mode === 'walk', { w: vw, h: vh, avoid: myTagRect(vw, vh) });
    App.R.setExposure(App.world.env.exp * (App.expK || 1));
    if (App.R.setGrade) App.R.setGrade(App.world.env.grade);   // 성당 룩(looks.js): 걷기 프로필의 보정·블룸
    App.idleSkip = !PH && !App.maxFrames && qs.idle !== '0' && App.me.mode === 'seated' && !App.walkSt && !App.ctl.dragging && App.t - App.ctl.lastDragT > 2 && App.sitF > 0.98 && !(App.meAv && App.meAv.kneelLin !== App.meAv.kneelTarget);
    var gq = PH ? PH.gpuBegin() : null, tr = PH ? performance.now() : 0;
    var chg = App.R.render(App.scene, App.camera, dt, App.world);
    if (PH) { PH.gpuEnd(gq); PH.frame(raw, performance.now() - tj, performance.now() - tr); }
    if (!App.firstFramePosted) { App.firstFramePosted = true; post({ e: 'firstFrame' }); }   // 앱의 입장 화면을 걷는 신호
    // perf(C-04): fps = 구간 평균(순간값이 아님), tier = 화질 단계, sat = 앉아 있었는지. a:1 은 자동 하향 알림(fps 가 순간값이라 평균에서 뺀다).
    var seatedNow = App.me.mode === 'seated' ? 1 : 0;
    if (chg) { App.quality = chg; post({ e: 'perf', fps: Math.round(1 / Math.max(raw, 0.001)), tier: App.R.tier, sat: seatedNow, a: 1 }); }
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
