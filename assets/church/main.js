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

  // 프레임 박자(frame_pace.js, RENDER_V3.md §5): dt 를 vsync 배수로 맞추고, 90Hz 이상 화면에서 못 따라가면 절반 주기로 고정한다. ?pace=0 이면 끔.
  var Pace = root.ChurchFramePace ? root.ChurchFramePace.create({ enabled: qs.pace !== '0' }) : { div: 1, frames: 0, tick: function () { this.frames++; }, work: function () {}, snap: function (r) { return r; } };
  App.pace = Pace;

  // 각을 −π…π 로(반복 없이 — 아주 큰 값·무한·NaN 에서도 바로 끝난다. 예전 while 은 1e17 같은 값에서 영원히 돌았다)
  function wrap(a) { if (!(a > -1e9 && a < 1e9)) return 0; a = (a + PI) % (PI * 2); if (a < 0) a += PI * 2; return a - PI; }
  // 화질 방식: App.qMode = 'auto'|'high'|'mid'|'low', App.quality = 실제 단계('high'|'mid'|'low'). 자동만 느릴 때 단계를 내린다.
  function setQMode(q) { App.qMode = q === 'low' || q === 'mid' || q === 'high' ? q : 'auto'; App.quality = App.qMode === 'auto' ? 'high' : App.qMode; }
  function autoOn() { return App.qMode === 'auto' && qs.autotier !== '0'; }
  function r2(v) { return Math.round(v * 100) / 100; }

  function viewing() { return !!(App.view && App.view.active); }
  // 창 감상 중에는 기기 화소 비율(최대 3, low 는 1.5)까지 올린다(GLASS_APP_PLAN §4.6: 정지 시 그리지 않으므로 부하가 오히려 적다)
  function pixelRatio() {
    var d = root.devicePixelRatio || 1, TT = root.ChurchRender && root.ChurchRender.TIERS, tc = TT ? TT[App.quality === 'low' ? 'low' : (App.quality === 'mid' ? 'mid' : 'high')] : null;
    return Math.min(d, App.quality === 'low' ? (tc ? tc.maxDpr : 1.5) : (viewing() ? 3 : (tc ? tc.maxDpr : 2)));
  }
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
    if (!App.started || App.paused) return;   // 일시정지(pause) 중에는 깨우지 않는다
    // 고리가 돈다고 적혀 있어도(rafOn) 1초 넘게 한 번도 들어오지 않았으면 죽은 것으로 보고 다시 띄운다(같은 vsync 에 겹친 고리는 loop 가 버린다)
    if (App.rafOn && performance.now() - (App.loopT || 0) < 1000) return;
    App.rafOn = true; App.last = performance.now(); App.loopT = App.last;
    requestAnimationFrame(loop);
  }
  root.addEventListener('resize', resize);
  root.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  // 다시 보이면 고리를 확인한다(숨어 있는 동안 rAF 가 오지 않았다 — kick 은 살아 있는 고리는 건드리지 않는다)
  if (document.addEventListener) document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  // '가기' 메뉴의 성모상 줄 이름(shrine_places.go_ko, 기본 '성모상').
  function shrineGoLabel(id) { var P = root.ChurchShrinePlaces, p = P && P[id]; return (p && p.go_ko) || '성모상'; }
  var nearShrineNow = false;
  function groundFn(logic) { return logic && logic.multi ? function (x, z, y) { return logic.floorY(x, z, y + 0.2); } : null; }
  // 여러 층 성당이면 pos·restored 에 발 높이 y 를 붙인다(이어 들어갈 때 같은 층으로). 한 층 성당의 이벤트 모양은 그대로
  function posEv(o) { if (App.logic && App.logic.multi && App.me && typeof App.me.fy === 'number') o.y = r2(App.me.fy); return o; }   // nearStation 이 고른 곳이 성모상 앞인가(제대 앞과 같은 'altar' 칩이지만 묵주기도를 서서 한다)
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
    App.aoHoldT = 0;
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
    // 여러 층 성당: 발을 디딜 바닥 = 그 자리의 지금 층 바닥(계단 단마다 발이 단 위에 놓인다). 한 층 성당은 예전처럼 루트 높이
    if (App.meAv.setGround) App.meAv.setGround(groundFn(w.logic));
    if (App.place) App.place.load(w);   // 이 성당의 진본 사진 창을 비동기로 건다(없거나 못 읽으면 절차적 유리 그대로)
    var sp = w.layout.spawn;
    var me = App.me;
    me.x = sp.x; me.z = sp.z; me.yaw = sp.r || 0; me.fy = w.logic.floorY(sp.x, sp.z, sp.y === undefined ? null : sp.y); me.y = me.fy; me.vx = 0; me.vz = 0; me.mode = 'walk'; me.seat = null;
    App.net.setMySeat(null);
    App.ctl.yaw = me.yaw; App.camInit = false;
    App.meAv.setSeated(false); App.meAv.setPray(false);
    App.rosary = false; App.meAv.setRosary(false, App.rosaryLook);
    App.near.seat = App.near.candle = undefined; App.near.station = null;
    // 스테이션(촛불 봉헌대·제대 앞·성수대): 걸어서 가는 자리와 표식
    App.stations = root.ChurchStations.create(w.logic);
    var stn = App.stations.stations();
    if (!qs.thumb && qs.markers !== '0') App.markers = root.ChurchMarkers.create(w.group, App.stations, w.logic);
    // 십자가의 길 14처 판: 자리는 바로 유도하고(cross 개수), 그림은 비동기로 싣는다(?cross=0 이면 끔)
    if (App.cross && !qs.thumb && qs.cross !== '0') App.cross.load(w);
    if (App.liturgy && !qs.thumb) App.liturgy.attach(w);   // 전례 시기 장식: 지금 시기대로 짓는다
    var stEv = { e: 'stations', church: w.id, candle: stn.candle.length, altar: 1, font: stn.font.length, entrance: 1, cross: App.cross ? App.cross.count() : 0, shrine: stn.candle.some(function (c) { return c.shrine; }) ? 1 : 0, shrineLabel: shrineGoLabel(w.id) };
    // 여러 층 성당(아시시): '가기' 시트의 층 줄(이름 목록, walkTo{kind:'level', index})
    if (stn.levels && stn.levels.length) stEv.levels = stn.levels.map(function (l) { return l.label; });
    post(stEv);
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
      if (TR.on) App.ctl.trace = tracePtr;
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
      App.rafOn = true; App.loopT = performance.now();
      resize();
      watchStart();
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
    if (qs.x !== undefined && qs.z !== undefined) { App.me.x = +qs.x; App.me.z = +qs.z; if (App.logic && App.logic.multi) { App.me.fy = App.logic.floorY(App.me.x, App.me.z, qs.y !== undefined ? +qs.y : App.me.fy); App.me.y = App.me.fy; } }   // 여러 층: ?y= 로 층
    if (qs.yaw !== undefined) { App.ctl.yaw = (+qs.yaw) * PI / 180; App.me.yaw = App.ctl.yaw; }
    if (qs.pitch !== undefined) App.ctl.pitch = (+qs.pitch) * PI / 180;
    if (qs.cam) setViewMode(qs.cam);   // 시험·확인 샷: ?cam=fp|tp|auto
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
    if (App.logic && App.logic.seatFloor) me.fy = App.logic.seatFloor(seatId);   // 좌석이 놓인 층
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
    if (App.logic && App.logic.multi && typeof me.fy === 'number') s.y = r2(me.mode === 'seated' || me.mode === 'sitting' ? App.logic.seatFloor(me.seat) : me.fy);   // 여러 층: 층
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
    lifeAck('paused');
  }
  function resume() {
    if (!App.paused) { lifeAck('resumed'); return; }
    App.paused = false;
    if (App.ambient) { try { root.ChurchAudio.setAmbient(true); } catch (e) { /* ignore */ } }
    else { try { root.ChurchAudio.resume(); } catch (e) { /* ignore */ } }   // 오르간은 꺼져 있어도 발소리가 켜져 있으면 다시 깨운다
    kick();   // App.last 를 지금으로 맞추고 다시 그린다(멈춰 있던 시간만큼 건너뛰지 않는다)
    lifeAck('resumed');
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
      var ry = seat ? logic.seatFloor(seat) : logic.floorY(x, z, typeof o.y === 'number' && isFinite(o.y) ? o.y : null);   // 여러 층: 저장된 높이(y)의 층
      pp.x = x; pp.z = z; logic.moveCircle(pp, 0, 0, undefined, ry);   // 벽·가구 안이면 밀어낸다
      me.fy = logic.floorY(pp.x, pp.z, ry);
      me.mode = 'walk'; me.seat = null; me.x = pp.x; me.z = pp.z; me.yaw = r;
      App.net.setMySeat(null);
      App.meAv.setSeated(false); App.meAv.setPray(false);
      App.near.seat = App.near.candle = undefined; App.near.station = null;
    }
    if (o.look && typeof o.look === 'object') App.rosaryLook = o.look;
    App.rosary = !!o.rosary; App.meAv.setRosary(App.rosary, App.rosaryLook);
    if (sat) me.fy = logic.seatFloor(seat);
    me.y = logic.multi ? me.fy : logic.floorY(me.x, me.z);
    App.meAv.setPose(me.x, me.y, me.z, me.yaw);
    App.camInit = false; App.wasMoving = false;
    if (sat) post({ e: 'seated', seat: seat });
    post(posEv({ e: 'restored', seat: sat ? seat : null, lost: seat && !sat ? 1 : 0, x: r2(me.x), z: r2(me.z), r: r2(me.yaw) }));
    if (!sat && o.walk && o.walk.kind) walkTo(o.walk);
    kick();
  }

  // ---- 터치 기록(개발용 빌드에서 앱이 setInput({trace:true}) 로 켠다) ----
  // 웹이 받은 포인터 이벤트(controls.js trace), 받은 setInput, 그 결과 yaw/pitch, 그 프레임에 자동 따라가기가 yaw 를 바꿨는가, 카메라 리그 상태를
  // 모아 0.5초마다 {e:'trace', s:요약, items:[...]} 로 앱에 보낸다. 꺼져 있으면 아무것도 하지 않는다.
  var TR = { on: false, items: [], drop: 0, timer: null, mv: {}, ins: 0, looks: 0, ks: 0, ly: 0, fy: 0, fol: 0, lastF: 0, fYaw: 0, lastPost: 0 };
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function tr(it) { it.t = Date.now(); if (TR.items.length < 1200) TR.items.push(it); else TR.drop++; }
  function traceOn(on) {
    if (TR.on === on) return;
    TR.on = on;
    if (App.ctl) App.ctl.trace = on ? tracePtr : null;
    if (TR.timer) { clearInterval(TR.timer); TR.timer = null; }
    if (!on) { TR.items = []; return; }
    var nav = root.navigator || {};
    tr({ k: 'hdr', ua: nav.userAgent || '', dpr: root.devicePixelRatio || 1, w: root.innerWidth || 0, h: root.innerHeight || 0 });
    TR.timer = setInterval(traceFlush, 500);
  }
  function tracePtr(ty, e) {
    if (ty === 'move') {   // 움직임은 손가락마다 30ms 에 한 번만
      var now = Date.now(), l = TR.mv[e.pointerId] || 0;
      if (now - l < 30) return;
      TR.mv[e.pointerId] = now;
    } else if (ty !== 'down') delete TR.mv[e.pointerId];
    tr({ k: 'p', ty: ty, id: e.pointerId, x: Math.round(e.clientX), y: Math.round(e.clientY), pt: e.pointerType || '' });
  }
  // 프레임 표본: 무엇이 움직이는 동안(손가락·조이스틱·yaw 변화) 0.1초에 한 번. ly = 그동안 앱 시점 입력이 바꾼 yaw, fy = 자동 따라가기가 바꾼 yaw.
  function traceFrame(ctl, me) {
    var now = Date.now();
    if (now - TR.lastF < 100) return;
    var moving = ctl.joyX !== 0 || ctl.joyY !== 0 || Math.hypot(me.vx, me.vz) > 0.05;
    var active = moving || ctl.dragging || ctl.extLook || TR.ly !== 0 || TR.fy !== 0 || Math.abs(ctl.yaw - TR.fYaw) > 1e-4;
    if (!active) return;
    TR.lastF = now; TR.fYaw = ctl.yaw;
    tr({ k: 'f', yaw: r3(ctl.yaw), pitch: r3(ctl.pitch), zoom: r3(ctl.zoom), ly: r3(TR.ly), fy: r3(TR.fy), joy: [r3(ctl.joyX), r3(ctl.joyY)],
      spd: r3(Math.hypot(me.vx, me.vz)), ext: ctl.ext ? 1 : 0, xl: ctl.extLook ? 1 : 0, dr: ctl.dragging ? 1 : 0, mode: me.mode, walk: App.walkSt ? 1 : 0,
      rig: { o: rigO.opt === undefined ? -1 : rigO.opt, fp: r3(rigO.fp || 0), d: r3(rigO.dist || 0), auto: App.camCfg && App.camCfg.auto ? 1 : 0 },
      spot: App.spot ? 1 : 0, wp: ctl.pointerCount ? ctl.pointerCount() : 0 });
    TR.ly = 0; TR.fy = 0;
  }
  function traceFlush() {
    if (!TR.on) return;
    var now = Date.now();
    if (!TR.items.length && now - TR.lastPost < 2000) return;   // 조용할 때는 2초에 한 번(살아 있음 표시)만
    TR.lastPost = now;
    var c = App.ctl, items = TR.items, drop = TR.drop;
    TR.items = []; TR.drop = 0;
    post({ e: 'trace', s: { ins: TR.ins, looks: TR.looks, ks: TR.ks, fol: TR.fol, yaw: c ? r3(c.yaw) : 0, pitch: c ? r3(c.pitch) : 0, zoom: c ? r3(c.zoom) : 0,
      ext: c && c.ext ? 1 : 0, xl: c && c.extLook ? 1 : 0, dr: c && c.dragging ? 1 : 0, wp: c && c.pointerCount ? c.pointerCount() : 0,
      follow: App.camCfg && App.camCfg.follow ? 1 : 0 },
      items: items, drop: drop });
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
      if (!seat) seat = App.logic.nearestSeat(me.x, me.z, isTaken, undefined, me.fy);
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
    // o.look(선택, T-86): 든 묵주의 색·재질(rosary_looks.js 항목). 들고 있는 중에 다시 보내면(기도 중 묵주 바꾸기) 바로 바뀐다. 없으면 지금 모습 유지.
    setRosary: function (o) { App.rosary = !!(o && o.on); if (o && o.look && typeof o.look === 'object') App.rosaryLook = o.look; if (App.meAv) App.meAv.setRosary(App.rosary, App.rosaryLook); },
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
    peerPraying: function (o) { if (App.net) App.net.peerPraying(o.id, !!o.on, o.ms === undefined ? -1 : o.ms, o.k ? 1 : 0, o.r ? 1 : 0, o.rs); },
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
    setViewMode: function (o) { setViewMode(o && o.mode); },   // 시점: auto · fp(1인칭 고정) · tp(뒤에서 보기 고정), docs/church/CAMERA_MODES.md
    setAmbient: function (o) { App.ambient = !!o.on; if (!App.paused) root.ChurchAudio.setAmbient(App.ambient); },
    setSteps: function (o) { root.ChurchAudio.setSteps(o || {}); },   // 발소리: {on, chant, vol} (audio.js setSteps)
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
    tapAt: function (o) { if (domTap(+o.x, +o.y)) return; tapAt(+o.x, +o.y); },
    // 앱 입력 연동(controls.js). 걷는 동안 앱(Flutter)이 3D 화면 위의 모든 손가락을 맡아 읽고 여기로 보낸다(웹뷰는 그 손가락을 받지 않는다).
    //   {ext} 앱이 고정 이동 손잡이를 그림(웹 스틱 끔), {stick} 손잡이 원(CSS px),
    //   {look} 앱이 읽는 시점 손가락이 닿아 있는가(그동안 자동 따라가기가 시점을 빼앗지 않는다), {dx,dy} 시점 끌기(CSS px = 논리 px),
    //   {k} 두 손가락 확대(손가락 사이 거리 배율, >1 벌림), {pinch} 예전 앱 확대 표시(호환), {trace} 터치 기록(개발용 빌드).
    setInput: function (o) {
      if (o && o.trace !== undefined) traceOn(!!o.trace);
      var c = App.ctl; if (!c || !o) return;
      var y0 = c.yaw;
      if (o.ext !== undefined) { c.ext = !!o.ext; if (c.ext) c.setMoveZone(false); }
      if (o.stick) c.setStick(o.stick.cx, o.stick.cy, o.stick.r);   // 앱이 그린 이동 손잡이 원(CSS px)
      if (o.pinch !== undefined) c.extPinch = !!o.pinch;
      if (o.look !== undefined) c.setLookExt(o.look);   // 앱이 읽는 시점 손가락(on/off)
      if (o.k !== undefined) c.pinchBy(o.k);
      if (o.dx !== undefined || o.dy !== undefined) c.lookBy(o.dx, o.dy);
      if (TR.on) {
        TR.ins++; if (o.dx !== undefined || o.dy !== undefined) TR.looks++; if (o.k !== undefined) TR.ks++;
        TR.ly += c.yaw - y0;
        if (o.trace === undefined) tr({ k: 'in', a: o, yaw: r3(c.yaw), pitch: r3(c.pitch) });
      }
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
    } else if (kind === 'candle' || kind === 'altar' || kind === 'entrance' || kind === 'font' || kind === 'shrine' || kind === 'level') {
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
  // 앱이 3D 화면 위의 손가락을 맡는 동안(걷는 중)은 웹 단추(성능 표시의 '10초 기록' 등)가 직접 눌리지 않는다:
  // 앱이 넘긴 탭 자리에 웹 단추가 있으면 그것을 누른다.
  function domTap(x, y) {
    try {
      if (!(x >= 0) || !(y >= 0) || !document.elementFromPoint) return false;
      var el = document.elementFromPoint(x, y);
      while (el && el !== document.body) {
        if (el.tagName === 'BUTTON') { el.click(); return true; }
        el = el.parentElement;
      }
    } catch (e) { /* ignore */ }
    return false;
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
      if (s.y !== undefined && me.fy !== undefined && Math.abs(s.y - me.fy) > 1.0) continue;   // 여러 층: 바로 위·아래층의 자리는 아니다
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
          if (App.lightG.t > 0.9 && App.lightG.t < 1.5) { pp.x = me.x; pp.z = me.z; logic.moveCircle(pp, Math.sin(me.yaw) * 0.5 * dt, Math.cos(me.yaw) * 0.5 * dt, undefined, me.fy); me.x = pp.x; me.z = pp.z; }
          else if (App.lightG.t >= 6.1) App.lightG = null;
        }
      }
      var k = Math.min(1, dt * 12);
      me.vx += (vel.vx - me.vx) * k; me.vz += (vel.vz - me.vz) * k;
      var sp = Math.sqrt(me.vx * me.vx + me.vz * me.vz);
      if (sp > 0.02) {
        pp.x = me.x; pp.z = me.z;
        logic.moveCircle(pp, me.vx * dt, me.vz * dt, undefined, me.fy);   // 여러 층: 지금 층의 충돌체만
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
      av.setWalk(Math.min(1, sp / logic.C.WALK_SPEED * 1.05));   // 걸음 값 = 속도 / 최고 속도(scene_logic WALK_SPEED). 다리는 실제 이동량으로 움직인다
      if (!av.takeStep && sp > 0.6) { App.stepT -= dt; if (App.stepT <= 0) { App.stepT = 0.42; root.ChurchAudio.footstep(Math.random() < 0.5, sp); } }   // 발 디딤을 알려 주지 않는 아바타(glb)만 시간 간격으로
      // 여러 층: 지금 발 높이(me.fy)에서 한 걸음 안의 가장 높은 바닥 → 계단을 오르내리며 층이 바뀐다(한 층 성당은 예전과 같은 값)
      var fy = logic.floorY(me.x, me.z, me.fy);
      me.fy = fy;
      // 몸 높이는 계단을 비탈처럼(scene_logic bodyY — 단마다 몸·카메라가 툭툭 오르지 않게). 카메라는 이 루트를 따른다(골반 오르내림이 아니다)
      var byT = sp > 0.05 && logic.bodyY ? logic.bodyY(me.x, me.z, fy, me.vx / sp, me.vz / sp) : fy;
      me.y += (byT - me.y) * Math.min(1, dt * 14);
      // pos 이벤트
      var moving = sp > 0.05;
      if (moving) {
        App.posT += dt;
        if (App.posT >= 0.1 || !App.wasMoving) { App.posT = 0; post(posEv({ e: 'pos', x: r2(me.x), z: r2(me.z), r: r2(me.yaw), m: 1 })); }
      } else if (App.wasMoving) { post(posEv({ e: 'pos', x: r2(me.x), z: r2(me.z), r: r2(me.yaw), m: 0 })); App.posT = 0; }
      App.wasMoving = moving;
      // 가까운 좌석/촛불
      var seat = logic.nearestSeat(me.x, me.z, isTaken, undefined, me.fy);
      var cs = logic.nearestCandleSlot(me.x, me.z, function (s) { return App.world.isLit(s); }, undefined, me.fy);
      if (cs === null) cs = logic.nearestCandleSlot(me.x, me.z, null, undefined, me.fy);
      setNear(seat, cs, nearStation(me));
      if (walked) post({ e: 'walkDone', kind: walked.kind, index: walked.index === undefined ? 0 : walked.index, seat: walked.seat || null });
    } else if (mode === 'sitting' || mode === 'standing') {
      me.t += dt;
      var dur = mode === 'sitting' ? 0.8 : 0.55, u = Math.min(1, me.t / dur), s = u * u * (3 - 2 * u);
      me.x = me.fx + (me.tx - me.fx) * s; me.z = me.fz + (me.tz - me.fz) * s;
      me.yaw = me.fyaw + wrap(me.tyaw - me.fyaw) * s;
      var fy2 = logic.floorY(me.x, me.z, me.fy);
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
          post(posEv({ e: 'pos', x: r2(me.x), z: r2(me.z), r: r2(me.yaw), m: 0 }));
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
    // 발소리: 아바타가 실제로 발을 디딘 순간에(벽에 막혀 제자리면 나지 않는다). docs/church/WALK_GAIT.md
    var stepEv = av.takeStep ? av.takeStep() : null;
    // 실제로 닿은 때(이 프레임보다 lag 초 앞) + 한 프레임에 낸다 → 걸음 간격이 프레임 경계와 상관없이 고르다(절뚝거리는 소리 없음)
    if (stepEv) root.ChurchAudio.footstep(stepEv.side > 0, stepEv.v, Math.max(0, dt - (stepEv.lag || 0)));
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
  // 시점 모드(앱 위쪽 도구 줄 「시점」, docs/church/CAMERA_MODES.md): auto(좁으면 자동 1인칭 — 기본) · fp(1인칭 고정) · tp(뒤에서 보기 고정)
  var VIEW_MODES = { auto: 1, fp: 1, tp: 1 };
  function setViewMode(m) { App.camCfg.view = VIEW_MODES[m] ? m : 'auto'; kick(); }
  var rigI = { mx: 0, fy: 0, mz: 0, yaw: 0, pitch: 0, D: 0, cb: null, guard: null, auto: true, minD: 0, drag: false }, rigO = { x: 0, y: 0, z: 0, pitch: 0, dist: 0, lift: 0, fwd: 0, yaw: 0, fp: 0 };
  var viewS = null, viewI = { guard: null, floorAt: null, mx: 0, mz: 0, foot: 0, cb: null, boom: 99, rigFp: false, mode: 'auto', block: false }, viewO = { f: 0, want: false };
  var compS = null, compI = { mx: 0, fy: 0, mz: 0, cx: 0, cy: 0, cz: 0, ex: 0, ey: 0, ez: 0, fp: 0, cut: false, init: false }, compO = { x: 0, y: 0, z: 0 };
  var floorFn = null, floorLogic = null;
  function floorAtFor(logic) {
    if (floorLogic !== logic) { floorLogic = logic; floorFn = logic ? function (x, z, y) { return logic.multi ? logic.floorY(x, z, y) : (logic.floorY(x, z) || 0); } : null; }
    return floorFn;
  }
  var CG = root.ChurchCamGuard || { SPOT: { side: 0 }, PRAY: { side: 0 }, spotBlend: function (p, D, b, f, o) { o.pitch = p; o.D = D; o.fwd = o.up = 0; return o; }, avatarAlpha: function () { return 1; } };
  // 앉기·무릎 꿇기 시점(docs/church/CAMERA.md): 앞옆 45°, 트인 쪽(cam_guard prayYaw)
  function prayYawFor(seatId) {
    var si = App.logic.seatInfo(seatId), gd = App.world.camGuard, base = 4.4 * (App.inset ? 1.3 : 1) * App.camCfg.dist;
    if (!si) return 0;
    if (!CG.prayYaw) return si.yaw + (CG.PRAY ? CG.PRAY.side : 0);
    return CG.prayYaw(gd, App.world.cameraBounds, si.x, App.me.y + 1.25, si.z, si.yaw, base * (CG.PRAY.zoom || 1), CG.PRAY.pitch);
  }
  var fol = { follow: false, walkSt: false, seated: false, spot: false, t: 0, meYaw: 0, speed: 0, dt: 0 };
  function seeEase(cur, on, dt) { var v = cur + ((on ? 1 : 0) - cur) * Math.min(1, dt * (on ? 10 : 4)); return v < 0.003 ? 0 : v; }
  function updateCamera(dt) {
    var me = App.me, ctl = App.ctl, cam = App.camera, cb = App.world.cameraBounds;
    var seated = me.mode === 'seated' || me.mode === 'sitting' ? 1 : 0;
    App.sitF += (seated - App.sitF) * Math.min(1, dt * 2.5);
    var sf = App.sitF;
    ctl.now = App.t;
    if (!App.camInit && App.rig) App.rig.reset();   // 입장·복원·자리 옮김: 리그 상태(거리·각도·1인칭)를 새로
    if (!viewS && CG.createView) { viewS = CG.createView(); compS = CG.createCompose(); }
    if (!App.camInit && viewS) { viewS.reset(); compS.reset(); }
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
    // (controls.js followStep: 사용자가 끄는 중 — 웹 손가락이든 앱이 읽는 손가락(extLook)이든 — 에는 돌리지 않는다)
    var CC = App.camCfg;
    fol.follow = CC.follow; fol.walkSt = !!App.walkSt; fol.seated = !!seated; fol.spot = !!SP; fol.t = App.t; fol.meYaw = me.yaw; fol.speed = Math.hypot(me.vx, me.vz); fol.dt = dt;
    var fyaw = root.ChurchControls.followStep(ctl, fol);
    if (TR.on) { TR.fy += fyaw; if (fyaw !== 0) TR.fol++; }
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
      rigI.minD = 2.8 - 0.5 * sf; rigI.drag = !!ctl.dragging;
      App.rig.solve(rigI, dt, rigO);
      // 끌기 시작: 리그가 덧붙였던 각도(올리기·돌기)를 사용자 각도로 넘긴다 → 그 뒤로는 사용자가 끈 각도를 리그가 덮지 않는다(스프링 암은 거리만)
      if (rigO.baked) { ctl.yaw += rigO.bakeYaw; ctl.pitch = clampN(rigO.bakePitch / (1 - 0.3 * sf), 0.06, 1.25); }
      cx = rigO.x; cyv = Math.min(cb.yMax, Math.max(App.logic && App.logic.multi && typeof me.fy === 'number' ? me.fy + 0.7 : 0.7, rigO.y)); cz = rigO.z;   // 카메라 바닥: 바닥 위 0.7m(여러 층은 그 층 바닥 — 1층 로비가 0 아래인 여의도동)
      dx = Math.sin(rigO.yaw); dz = Math.cos(rigO.yaw);
    } else {
      var ch0 = Math.cos(pitch) * D, cv0 = Math.sin(pitch) * D;
      cx = mx + dx * ch0; cyv = fy + cv0; cz = mz + dz * ch0; rigO.fwd = 0; rigO.fp = 0;
    }
    // 보는 점: 자리 방향(목표물 쪽)으로 fwd 앞·up 위 — 카메라는 side 만큼 비켜 있어 아바타가 화면 아래 한편에 온다
    // 리그가 카메라를 올렸으면(lift) 걷는 앞쪽(rigO.fwd)을 본다 → 아바타는 화면 아래, 가는 길이 보인다
    var lx = mx - Math.sin(App.spotYaw) * spotO.fwd - dx * rigO.fwd, ly = fy + spotO.up, lz = mz - Math.cos(App.spotYaw) * spotO.fwd - dz * rigO.fwd;
    // 1인칭(시점 모드 — 좁은 곳 자동·고정, cam_guard createView): 0.5초에 걸쳐 눈 높이로 들어가 그 자리에서 둘러본다(끌기 = 고개 돌리기·들기).
    // 앉기·무릎 꿇기·기도 자리 시점 중에는 쓰지 않는다(기도 카메라 그대로, 일어나면 지금 모드로 돌아온다).
    var foot = typeof me.fy === 'number' && App.logic && App.logic.multi ? me.fy : me.y, fp = 0;
    if (viewS) {
      viewI.guard = gd; viewI.floorAt = floorAtFor(App.logic); viewI.mx = me.x; viewI.mz = me.z; viewI.foot = foot; viewI.cb = cb;
      viewI.boom = App.rig && CC.auto ? rigO.boom : 99; viewI.rigFp = !!(App.rig && CC.auto && rigO.fpOn); viewI.mode = CC.view || 'auto';
      viewI.block = !!(seated || SP || App.spotF > 0.05 || me.mode === 'sitting' || me.mode === 'standing');
      viewS.step(viewI, dt, viewO);   // 입장·복원(리셋 뒤 첫 프레임)은 섞지 않고 그 자리 모드로
      fp = viewO.f;
    } else fp = rigO.fp || 0;
    var eyY = me.y + 1.6 - 0.45 * sf, ex = me.x, ez = me.z;
    if (fp > 0) {
      // 보는 방향 = 사용자 방향(ctl.yaw). 위아래는 끈 각도: 기본(0.45)이면 조금 아래, 아래로 끌면(pitch 커짐) 발밑까지, 위로 끌면 위(그 위는 ctl.look 올려다보기)
      var fdx = -Math.sin(ctl.yaw), fdz = -Math.cos(ctl.yaw), lp = clampN(-(ctl.pitch - 0.3) * 0.8, -0.9, 0.3), lc = Math.cos(lp) * 6;
      lx += (ex + fdx * lc - lx) * fp; ly += (eyY + Math.sin(lp) * 6 - ly) * fp; lz += (ez + fdz * lc - lz) * fp;
    }
    // 카메라 놓기(cam_guard createCompose): 피벗만 부드럽게 따라가고 팔(거리·각도)은 리그가 정한 그대로 — 빠르게 돌려도 원의 현을 가로질러
    // 벽 속으로 파고들었다가 '곧장 목표로' 끊기는 일(앞뒤로 튐)이 없다. 1인칭이면 눈 쪽으로 fp 만큼 섞는다.
    if (compS) {
      compI.mx = mx; compI.fy = fy; compI.mz = mz; compI.cx = cx; compI.cy = cyv; compI.cz = cz; compI.ex = ex; compI.ey = eyY; compI.ez = ez;
      compI.fp = fp; compI.cut = !!rigO.cut; compI.init = !App.camInit;
      compS.step(compI, dt, compO);
      App.camPos.set(compO.x, compO.y, compO.z);
    } else {
      if (fp > 0) { cx += (ex - cx) * fp; cyv += (eyY - cyv) * fp; cz += (ez - cz) * fp; }
      if (!App.camInit) App.camPos.set(cx, cyv, cz);
      var kp0 = 1 - Math.exp(-dt * 7);
      App.camPos.x += (cx - App.camPos.x) * kp0; App.camPos.y += (cyv - App.camPos.y) * kp0; App.camPos.z += (cz - App.camPos.z) * kp0;
    }
    if (!App.camInit || rigO.cut) { App.camLook.set(lx, ly, lz); App.camInit = true; }   // 리그가 시점을 끊었으면(휘돌면 머리에 붙을 때) 따라가지 않고 바로
    var kl = 1 - Math.exp(-dt * (fp > 0.05 && fp < 0.95 ? 16 : 11));
    // 1인칭: 가까운 면이 잘려 보이지 않게 near 평면을 당긴다(눈은 벽에서 몸 반지름 0.3m 까지 다가간다)
    var nearW = fp > 0.5 ? 0.1 : 0.3;
    if (cam.near !== nearW) { cam.near = nearW; cam.updateProjectionMatrix(); }
    // 공간 격자가 없는 옛 가드만: 카메라 → 피벗 선이 면에 닿으면 그 앞으로(공간 격자가 있으면 리그의 스프링 암이 벽 속에 서지 않게 한다)
    if (gd && CC.auto && fp < 0.5 && !(gd.space && App.rig)) {
      var gt = gd.clipWide(mx, fy, mz, App.camPos.x, App.camPos.y, App.camPos.z, 0.08, 0.3);
      if (gt < 1) { App.camPos.x = mx + (App.camPos.x - mx) * gt; App.camPos.y = fy + (App.camPos.y - fy) * gt; App.camPos.z = mz + (App.camPos.z - mz) * gt; }
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
    if (TR.on) traceFrame(ctl, me);
    // 카메라가 아바타 머리에 가까우면(1.7m 미만, 사용자가 당긴 앉은 시점 정도) 아바타·이름표를 흐리게 — 최소 0.35.
    // 1인칭이면 아바타를 숨긴다. 잘라내지 못한 가림물(인스턴스 촛대 등) 뒤의 몸은 금색 실루엣(X-ray)으로 보인다(avatar.js setXray, 걷는 동안).
    var av = App.meAv;
    if (av && av.setFade) {
      var hx = App.camPos.x - mx, hy2 = App.camPos.y - (me.y + 1.55 - 0.45 * sf), hz = App.camPos.z - mz;
      // 1인칭으로 들어가는 동안은 눈이 머리에 닿기 전에 흐려지고(fp 0.25~0.7) 다 들어가면 숨긴다 — 머리 속이 보이지 않게
      var fpA = fp <= 0.25 ? 1 : fp >= 0.7 ? 0 : 1 - (fp - 0.25) / 0.45;
      var aT = CG.avatarAlpha(Math.sqrt(hx * hx + hy2 * hy2 + hz * hz)) * fpA;
      App.avA += (aT - App.avA) * Math.min(1, dt * 10);
      av.setFade(App.avA);
      var hide = fp > 0.7;
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

  // ---- 그리기 고리 지킴(2026-11-23, 여의도동 '멎음' 제보 — docs/church/interiors/yeouido.md §9.9) ----
  // ① 한 부분의 예외가 고리 전체를 끊거나 그 뒤(그리기)를 매 프레임 건너뛰지 않게 부분마다 try/catch(오류는 jsError 로 앱 '문제 알리기'에)
  // ② 내 위치·카메라에 NaN/무한이 생기면 마지막 정상값으로 되돌린다 ③ 1초마다 심장 박동 {e:'hb'}(그린 프레임 수·상태)을 앱에 보내
  //    앱이 멈춤(박동 끊김·그린 수가 안 늘어남·WebGL 문맥 잃음)을 알아채고 '다시 불러오기'를 내민다 ④ 보이는데 고리가 2.5초 넘게 안 돌면 스스로 다시 띄운다
  var rafAsked = false, meGood = { x: 0, z: 0, y: 0, fy: 0, yaw: 0, ok: false }, camGood = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, yaw: 0, pitch: 0.45, zoom: 1, ok: false };
  function reqFrame() { rafAsked = true; requestAnimationFrame(loop); }
  function frameErr(part, e) {
    App.frameErrN = (App.frameErrN || 0) + 1; App.frameErrPart = part;
    var B = root.ChurchBridge;
    if (B && B.jsError) B.jsError('frame', part + ': ' + ((e && e.message) || e), '', 0, 0, e && e.stack);
    if (console && console.error && App.frameErrN < 20) console.error('[church] frame ' + part, e);
  }
  function okNum(v) { return typeof v === 'number' && v > -1e7 && v < 1e7; }   // 유한하고 말이 되는 좌표(NaN·무한·폭주 값 거름)
  function guardMe() {
    var me = App.me; if (!me) return;
    if (okNum(me.x) && okNum(me.z) && okNum(me.y) && okNum(me.yaw) && (me.fy === undefined || okNum(me.fy)) && okNum(me.vx) && okNum(me.vz)) {
      meGood.x = me.x; meGood.z = me.z; meGood.y = me.y; meGood.fy = me.fy; meGood.yaw = me.yaw; meGood.ok = true; return;
    }
    frameErr('nan', new Error('me ' + [me.x, me.z, me.y, me.fy, me.yaw].join(',')));
    if (meGood.ok) { me.x = meGood.x; me.z = meGood.z; me.y = meGood.y; me.fy = meGood.fy; me.yaw = meGood.yaw; }
    else { me.x = App.logic && App.logic.spawn ? App.logic.spawn.x : 0; me.z = App.logic && App.logic.spawn ? App.logic.spawn.z : 0; me.y = me.fy = 0; me.yaw = 0; }
    me.vx = me.vz = 0; App.walkSt = null;
  }
  function guardCam() {
    var c = App.ctl, p = App.camPos, l = App.camLook;
    if (okNum(p.x) && okNum(p.y) && okNum(p.z) && okNum(l.x) && okNum(l.y) && okNum(l.z) && okNum(c.yaw) && okNum(c.pitch) && okNum(c.zoom)) {
      if (Math.abs(c.yaw) > 1000) c.yaw = wrap(c.yaw);   // 오래 돌려 쌓인 각을 접는다(값이 커지면 각 계산이 느려지고 정밀도를 잃는다)
      camGood.px = p.x; camGood.py = p.y; camGood.pz = p.z; camGood.lx = l.x; camGood.ly = l.y; camGood.lz = l.z; camGood.yaw = c.yaw; camGood.pitch = c.pitch; camGood.zoom = c.zoom; camGood.ok = true; return;
    }
    frameErr('nan', new Error('camera ' + [p.x, p.y, p.z, c.yaw, c.pitch, c.zoom].join(',')));
    if (!okNum(c.yaw)) c.yaw = camGood.ok ? camGood.yaw : 0;
    if (!okNum(c.pitch)) c.pitch = camGood.ok ? camGood.pitch : 0.45;
    if (!okNum(c.zoom)) c.zoom = camGood.ok ? camGood.zoom : 1;
    if (camGood.ok) { p.set(camGood.px, camGood.py, camGood.pz); l.set(camGood.lx, camGood.ly, camGood.lz); }
    App.camInit = false; if (App.rig && App.rig.reset) App.rig.reset();
    if (App.camera) { App.camera.position.copy(p); if (camGood.ok) App.camera.lookAt(l); }
  }
  // 일시정지·재개를 받았다는 답(앱의 '문제 알리기' 발자취에 남는다): 고리가 돌던 중인가(raf), 마지막 고리 뒤 몇 ms(age), 지금까지 그린 프레임(f)
  function lifeAck(s) { post({ e: 'life', s: s, raf: App.rafOn ? 1 : 0, age: Math.round(performance.now() - (App.loopT || 0)), f: App.drawn || 0 }); }
  function glCtx() { try { return App.renderer && App.renderer.getContext ? App.renderer.getContext() : null; } catch (e) { return null; } }
  var watchOn = false;
  function watchStart() {
    if (watchOn) return;
    watchOn = true;
    // WebGL 문맥을 잃으면(앱이 뒤로 갔을 때 메모리 압박 등) three.js 는 조용히 그리기를 건너뛴다 — 화면이 마지막 그림에서 멎는다.
    // 알리고(오류 기록 + {e:'gl'}), 되찾으면 고리를 다시 깨운다. 되찾지 못하면 앱이 '다시 불러오기'를 내민다(심장 박동 st:'gl').
    if (canvas && canvas.addEventListener) {
      canvas.addEventListener('webglcontextlost', function () {
        App.glLost = true; App.glLostN = (App.glLostN || 0) + 1;
        var B = root.ChurchBridge; if (B && B.jsError) B.jsError('webgl', 'context lost', '', 0, 0, '');
        post({ e: 'gl', lost: 1 });
      }, false);
      canvas.addEventListener('webglcontextrestored', function () { App.glLost = false; post({ e: 'gl', lost: 0 }); kick(); }, false);
    }
    setInterval(heartbeat, 1000);
  }
  // 심장 박동(1초마다): f = 그린 프레임 수(앱은 이것이 늘어나는지 본다), l = 고리가 돈 수, st = run|paused|view|hidden|gl, age = 마지막 고리 뒤 ms,
  // err = 프레임 안 예외 수, heal = 스스로 다시 띄운 수. 보이는데(run) 고리가 2.5초 넘게 안 돌면(아주 느린 한 프레임은 넘기게) 다시 띄우고 오류 기록에 남긴다.
  function heartbeat() {
    if (!App.started) return;
    var t = performance.now(), age = t - (App.loopT || t), hidden = !!(document && document.hidden), gl = glCtx();
    if (gl && gl.isContextLost && gl.isContextLost() && !App.glLost) { App.glLost = true; post({ e: 'gl', lost: 1 }); }
    var st = App.paused ? 'paused' : (App.view && (App.view.active || App.view.parked)) ? 'view' : App.glLost ? 'gl' : hidden ? 'hidden' : 'run';
    if (st === 'run' && age > 2500) {
      App.loopHeal = (App.loopHeal || 0) + 1;
      var B = root.ChurchBridge; if (B && B.jsError) B.jsError('stall', 'render loop restarted', '', 0, 0, 'age ' + Math.round(age) + ' rafOn ' + (App.rafOn ? 1 : 0));
      App.rafOn = false; kick();
    }
    post({ e: 'hb', f: App.drawn || 0, l: App.loopN || 0, st: st, age: Math.round(age), err: App.frameErrN || 0, heal: App.loopHeal || 0 });
  }
  function loop(now) {
    App.loopT = performance.now(); App.loopN = (App.loopN || 0) + 1;
    rafAsked = false;
    try { frame(now); } catch (e) {
      frameErr('loop', e);
      if (!rafAsked && !App.paused && App.rafOn) reqFrame();   // 예외가 다음 프레임 요청 전에 났어도 고리는 이어 간다
    }
  }
  function frame(now) {
    if (App.paused) { App.rafOn = false; return; }   // 보이지 않는 동안: 다음 프레임을 청하지 않는다(resume 이 kick 으로 다시 깨운다)
    // 같은 vsync(같은 rAF 시각)에 고리가 두 번 들어오면 뒤의 것은 버린다(그 고리는 여기서 끝난다): 어디서 kick·rAF 가 겹쳐도 한 프레임 한 번만 그린다.
    if (now === App.lastNow) return;
    App.lastNow = now;
    if (App.maxFrames && App.frameCount >= App.maxFrames) { App.done = true; App.rafOn = false; return; }
    App.frameCount = (App.frameCount || 0) + 1;
    var tcP = App.R && root.ChurchRender && root.ChurchRender.TIERS ? root.ChurchRender.TIERS[App.R.tier] : null;
    Pace.tick(now, !App.maxFrames && !(tcP && !tcP.pace));
    // 앉아서 가만히 기도하는 동안은 한 프레임 걸러 그린다(약 30fps; 성능 표시·시험 프레임 제한 중에는 끔).
    // 화면은 거의 정지라 차이가 보이지 않고, 발열·배터리를 줄여 다시 걸을 때의 열 제한 버벅임을 막는다. 끌기·일어서기 즉시 60fps.
    // 고주사율(90Hz 이상) 화면에서 매 vsync 를 못 따라가면 절반 주기로 고정한다(Pace: 들쭉날쭉한 70~90fps 보다 고른 60fps 가 부드럽다).
    var div = (App.idleSkip ? 2 : 1) * Pace.div;
    if (div > 1 && (Pace.frames % div)) { App.frames++; reqFrame(); return; }
    var raw = Pace.snap((now - App.last) / 1000), dt = Math.min(0.05, raw);
    App.last = now; App.t += dt;
    // 창 감상: 필요할 때만 그린다(입력·활강·페이드·빛 바꾸기). 할 일이 없으면 rAF 를 멈추고 kick() 이 다시 깨운다.
    if (App.view && (App.view.active || App.view.parked)) {
      var busy = false;
      try { busy = App.view.frame(dt); } catch (e) { if (console && console.error) console.error('[church] view frame', e); }
      if (!App.firstFramePosted) { App.firstFramePosted = true; post({ e: 'firstFrame' }); }
      if (busy) reqFrame(); else App.rafOn = false;
      return;
    }
    reqFrame();
    if (!App.world) return;
    // 성당에 들어온 직후 구운 AO(ao_<성당>.js)가 붙기 전에는 그리지 않는다(최대 0.5초, 그 사이 화면은 직전 그림): AO 없는 프레임이 번쩍이지 않게
    if (App.world.aoPending && App.world.aoPending()) {
      var pn = performance.now(); if (!App.aoHoldT) App.aoHoldT = pn;
      if (pn - App.aoHoldT < 500) return;
    }
    var PH = root.ChurchPerfHud && root.ChurchPerfHud.on ? root.ChurchPerfHud : null, tj = PH ? performance.now() : 0;
    try { App.ctl.setMoveZone(App.me.mode === 'walk'); updateMe(dt, App.t); } catch (e) { frameErr('me', e); }
    guardMe();
    try { if (App.world && App.world.setViewer) App.world.setViewer(App.me.y); } catch (e) { frameErr('levels', e); }   // 여러 층: 보는 층만 그린다(world.js levelVis)
    try { updateCamera(dt); } catch (e) { frameErr('camera', e); }
    guardCam();
    // 3D 이름표 크기 보정: 카메라 행렬을 갱신하고 아바타·표식에 알린다
    var vw = root.innerWidth || 360, vh = root.innerHeight || 640;
    try {
      App.camera.updateMatrixWorld();
      App.camera.matrixWorldInverse.copy(App.camera.matrixWorld).invert();
      root.ChurchAvatar.setView(App.camera, vh);
    } catch (e) { frameErr('view', e); }
    try { App.net.setFocus(App.me.x, App.me.z); App.net.update(dt, App.t, now); } catch (e) { frameErr('net', e); }
    try { App.crowd.update(dt, App.t); } catch (e) { frameErr('crowd', e); }
    try { App.world.update(dt, App.t, App.me, App.camera); } catch (e) { frameErr('world', e); }
    try { if (App.place) App.place.update(dt, App.me, App.camera); } catch (e) { frameErr('place', e); }
    try { if (App.cross) App.cross.update(dt, App.me, App.camera); } catch (e) { frameErr('cross', e); }
    try { if (App.liturgy) App.liturgy.update(dt, App.t); } catch (e) { frameErr('liturgy', e); }
    try { if (App.markers) App.markers.update(dt, App.t, App.me, App.camera, App.walkSt ? { kind: App.walkSt.kind, index: App.walkSt.index === undefined ? 0 : App.walkSt.index } : null, App.me.mode === 'walk', { w: vw, h: vh, avoid: myTagRect(vw, vh) }); } catch (e) { frameErr('markers', e); }
    // RENDER_V4 §5 피사계 심도: 앉아·무릎 꿇고 기도하거나, 성모상 앞에서(또는 서서 기도하며) 1.2초 넘게 멈춰 있을 때만 먼 배경을 살짝 흐린다(초점 = 아바타). 걷는 동안은 0.
    try {
    if (App.R.dof) {
      var dm = App.me.mode, stillHere = dm === 'walk' && !App.walkSt && (App.near.shrine || App.standPray) && Math.abs(App.me.vx || 0) + Math.abs(App.me.vz || 0) < 0.05;
      App.dofStill = stillHere ? (App.dofStill || 0) + dt : 0;
      var dofWant = qs.dof !== '0' && (dm === 'seated' || dm === 'sitting' || App.dofStill > 1.2) ? 1 : 0;
      App.dofA = (App.dofA || 0) + (dofWant - (App.dofA || 0)) * Math.min(1, dt / (dofWant ? 0.9 : 0.3));
      if (App.dofA < 0.002) App.dofA = 0;
      var avp = App.meAv.root.position, cpos = App.camera.position;
      var fdx = avp.x - cpos.x, fdy = avp.y + 1.1 - cpos.y, fdz = avp.z - cpos.z;
      App.R.dof.focus = Math.max(1.2, Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz)); App.R.dof.amount = App.dofA;
    }
    if (App.world.haze) App.R.haze = App.world.haze;
    App.R.setExposure(App.world.env.exp * (App.expK || 1));
    if (App.R.setGrade) App.R.setGrade(App.world.env.grade);   // 성당 룩(looks.js): 걷기 프로필의 보정·블룸
    } catch (e) { frameErr('look', e); }
    App.idleSkip = !PH && !App.maxFrames && qs.idle !== '0' && App.me.mode === 'seated' && !App.walkSt && !App.ctl.dragging && App.t - App.ctl.lastDragT > 2 && App.sitF > 0.98 && !(App.meAv && App.meAv.kneelLin !== App.meAv.kneelTarget);
    var gq = PH ? PH.gpuBegin() : null, tr = PH ? performance.now() : 0;
    var tw0 = performance.now();
    var chg = null;
    try { chg = App.R.render(App.scene, App.camera, dt, App.world); if (!App.glLost) App.drawn = (App.drawn || 0) + 1; } catch (e) { frameErr('render', e); }
    Pace.work(performance.now() - tw0);
    // 반사 탐침(probe_fx.js): 성당에 들어와 처음 그린 뒤(그림자 맵·AO 가 준비된 뒤) 한 번에 굽는다 — 입장 화면이 아직 덮고 있으므로 firstFrame 을 한 프레임 미룬다.
    // 그 뒤에는 시간대가 크게 바뀔 때만 프레임마다 한 면씩(멈칫 없음). 사진 창이 다 올라오면 한 번 더(반사에 진본 창이 비치게).
    var prbFirst = App.world.probePending && App.world.probePending();
    if (App.world.probeStep) {
      if (App.place && App.world.probes && !App.world.prbPhotos && (prbFirst || App.t - (App.prbCheckT || 0) > 1)) {
        App.prbCheckT = App.t;
        try { if (App.place.debug().pending === 0) { App.world.prbPhotos = true; if (!prbFirst) App.world.probes.markDirty('photos', true); } } catch (e) { App.world.prbPhotos = true; }
      }
      try { App.world.probeStep(App.renderer); } catch (e) { if (console && console.warn) console.warn('[church] probe', e); }
    }
    if (PH) { PH.gpuEnd(gq); PH.frame(raw, performance.now() - tj, performance.now() - tr); }
    if (!App.firstFramePosted && !prbFirst) { App.firstFramePosted = true; post({ e: 'firstFrame' }); }   // 앱의 입장 화면을 걷는 신호
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
