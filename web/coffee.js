/* coffee.js — 공방 커피 카운터: 컵 4종(3D) · 주문 흐름(순수 로직) · 바리스타 NPC · 내 컵/다른 사람 컵 보이기.
   돈은 어디에도 없다(모두 무료·가상). 글자·상표 없음.
   - 메뉴 4: americano(도자기 머그) · latte(넓은 잔 + 받침 + 라떼 아트 그림) · iced(투명 유리잔 + 얼음 + 빨대) · tea(찻잔 + 받침, 홍차).
   - 흐름(받으러 가기): orderCoffee(kind) → 바리스타가 약 3초 만든다(몸짓) → 카운터 위 픽업 자리에 컵 → 내가 가까이 가면(1.3 m) 집어 든다
     → 오른손에 든다(팔 자세 바뀜) → 아무 좌석에 앉으면 그 좌석의 컵 자리(책상·카운터·그네 옆 탁자)에 내려놓고, 일어서면 다시 든다.
     컵 자리가 없는 좌석이면 든 채로 앉는다. 새로 주문하면 들고 있던 컵은 사라진다(한 사람 한 잔).
   - 나가는 이벤트: nearCounter {on} · coffeeOrdered {kind} · coffeeReady {kind}(컵이 카운터에 놓임) · coffeePicked {kind}. 들어오는 것: orderCoffee {kind}.
   - 다른 사람: setPeers 의 cup 필드('americano'|'latte'|'iced'|'tea'|null) — 걷는 사람은 손에, 컵 자리가 있는 좌석에 앉은 사람은 그 자리에.
   - 바리스타: avatar.js 몸(앞치마) — 카운터 뒤 통로(layout.coffee.barista 사각형) 안에서만, 숨쉬기·고개 돌림은 몸이 하고,
     손님(나)이 3 m 안이면 그쪽으로 돌아서고, 만드는 동안 기계 쪽으로 돌아 '음료 만들기' 몸짓. 통로 전체가 충돌체(ch_house planColliders 'barista').
   - 자리로 가져다 주기(2026-11-26, 앱 결정 #1061 ⑥ 「자리로 가져다 드릴게요」): 앉은 채 주문하면(orderCoffee(kind, {seat}) 또는 앉아서 orderCoffee(kind))
     바리스타가 약 3초 만들고 → 컵을 손에 들고 걸을 수 있는 길(stations.js findPath — 사람이 걷는 길과 같다, 가구를 뚫지 않는다)로 그 좌석까지 →
     컵 자리에 내려놓는 그 순간 coffeeReady {kind, seat} → 카운터 뒤로 돌아간다. 창가 책상은 책상 옆에 서서 책상 위에, 바 스툴은 통로 안에서 카운터 너머로,
     그네는 앞문으로 나가 마당 탁자(호스트가 setSeatAnchors 로 옮길 수 있다)에. coffeePicked 는 카운터에서 집을 때만.
     배달 중에 일어나거나 자리를 떠나도 컵은 그 좌석 자리에 놓는다(되가져가지 않는다) — 그 좌석에 다시 앉으면 내 컵, 그 자리에서 일어서면 다시 든다.
     가는 길에 사람이 0.5 m 앞에 있으면 멈춰 기다린다(최대 2초, 그 뒤 비켜 간다 — 사람은 충돌체가 아니다).
     다른 사람 화면: 호스트가 setBaristaJob({kind, seat, startAt}) 를 모두에게 보내면 같은 걸음을 같은 때 재생한다(결정적 — 무작위 없음). 보내지 않으면 내 화면에서만.
   Logic 은 THREE 없이 Node 에서 시험한다(test/coffee.test.mjs). */
(function (root) {
  'use strict';
  var KINDS = ['americano', 'latte', 'iced', 'tea'];
  // 독서공방 음료 번호: 3 아메리카노(머그) · 2 라떼 · 5 홍차(찻잔) · 7 아이스 커피(유리잔). 다른 번호의 모양 대체: 1 → 머그, 4·6 → 라떼 잔.
  var NUM = { 1: 'americano', 2: 'latte', 3: 'americano', 4: 'latte', 5: 'tea', 6: 'latte', 7: 'iced' };
  function kindOf(k) {
    if (typeof k === 'number' || (typeof k === 'string' && /^\d+$/.test(k))) return NUM[+k] || null;
    k = typeof k === 'string' ? k.toLowerCase() : ''; if (k === 'black tea' || k === 'blacktea') k = 'tea'; return KINDS.indexOf(k) >= 0 ? k : null;
  }

  // ---- 순수 로직 ----
  // cfg: {near:{x0,x1,z0,z1}, pickup:{x,y,z}, cupSpots:[{x,y,z}|null], brewSec, pickR}
  function Logic(cfg) {
    cfg = cfg || {};
    var L = {
      phase: 'idle',   // idle | brewing | ready(카운터 위) | held(손에) | placed(좌석 자리에)
      kind: null, t: 0, seat: null, nearOn: false,
      brewSec: cfg.brewSec || 3, pickR: cfg.pickR || 1.3,
      isNear: function (x, z) { var n = cfg.near; return !!n && x >= n.x0 && x <= n.x1 && z >= n.z0 && z <= n.z1; },
      spotFor: function (seatIdx) { var s = cfg.cupSpots && cfg.cupSpots[seatIdx]; return s || null; },
      sitting: null,   // 지금 앉은 좌석 번호(내 몸)
      deliverTo: null, // 배달할 좌석 번호(없으면 카운터에서 받기)
      order: function (kind, o) {
        var k = kindOf(kind); if (!k) return [];
        var seat = o && typeof o.seat === 'number' ? o.seat : null;
        L.kind = k; L.phase = 'brewing'; L.t = 0; L.seat = null; L.deliverTo = seat !== null && L.spotFor(seat) ? seat : null;
        var e = { e: 'coffeeOrdered', kind: k }; if (L.deliverTo !== null) e.seat = L.deliverTo;
        return [e];
      },
      // 바리스타가 컵을 좌석 자리에 놓았다(실행 쪽이 부른다)
      delivered: function () {
        if (L.phase !== 'carry') return [];
        L.phase = 'placed'; L.seat = L.deliverTo; L.deliverTo = null;
        return [{ e: 'coffeeReady', kind: L.kind, seat: L.seat }];
      },
      // me: {x, z, seated(bool), seat(번호|null)}. 반환: 나가는 이벤트 목록
      tick: function (dt, me) {
        var ev = [];
        var nr = !!(me && !me.seated && L.isNear(me.x, me.z));
        if (nr !== L.nearOn) { L.nearOn = nr; ev.push({ e: 'nearCounter', on: nr }); }
        if (L.phase === 'brewing') { L.t += dt; if (L.t >= L.brewSec) { if (L.deliverTo !== null) L.phase = 'carry'; else { L.phase = 'ready'; ev.push({ e: 'coffeeReady', kind: L.kind }); } } }
        if (L.phase === 'ready' && me && !me.seated && cfg.pickup) {
          var dx = me.x - cfg.pickup.x, dz = me.z - cfg.pickup.z;
          if (dx * dx + dz * dz <= L.pickR * L.pickR) { L.phase = 'held'; ev.push({ e: 'coffeePicked', kind: L.kind }); }
        }
        return ev;
      },
      give: function (kind) { var k = kindOf(kind); if (!k) { L.phase = 'idle'; L.kind = null; L.seat = null; return; } L.kind = k; L.phase = 'held'; L.seat = null; L.deliverTo = null; },
      onSit: function (seatIdx) { L.sitting = seatIdx; if (L.phase === 'held' && L.spotFor(seatIdx)) { L.phase = 'placed'; L.seat = seatIdx; } },
      // 일어서면 그 좌석에 놓인 내 컵만 다시 든다(다른 좌석에 배달된 컵은 그 자리에 둔다)
      onStand: function () { if (L.phase === 'placed' && L.seat === L.sitting) { L.phase = 'held'; L.seat = null; } L.sitting = null; },
      // 지금 컵이 어디 있나: {where:'none'|'counter'|'hand'|'spot', kind, pos?}
      cupState: function () {
        if (!L.kind || L.phase === 'idle' || L.phase === 'brewing') return { where: 'none', kind: L.kind };
        if (L.phase === 'ready') return { where: 'counter', kind: L.kind, pos: cfg.pickup };
        if (L.phase === 'carry') return { where: 'barista', kind: L.kind, seat: L.deliverTo };
        if (L.phase === 'placed') return { where: 'spot', kind: L.kind, pos: L.spotFor(L.seat), seat: L.seat };
        return { where: 'hand', kind: L.kind };
      }
    };
    return L;
  }
  // 다른 사람 컵 자리: 앉았고 그 좌석에 컵 자리가 있으면 'spot', 아니면 'hand'(컵이 있을 때)
  function peerCupWhere(kind, seatIdx, cupSpots) {
    if (!kindOf(kind)) return 'none';
    if (seatIdx !== null && seatIdx !== undefined && cupSpots && cupSpots[seatIdx]) return 'spot';
    return 'hand';
  }

  // ---- 컵 모양(THREE) ----
  var matCache = null, artTex = null;
  function mats(T) {
    if (matCache) return matCache;
    function std(o) { return new T.MeshStandardMaterial(o); }
    matCache = {
      ceramic: std({ color: 0xf3efe7, roughness: 0.28, metalness: 0 }),
      mugBody: std({ color: 0x5f6f73, roughness: 0.35 }),   // 머그: 회청 유약
      coffee: std({ color: 0x2a160c, roughness: 0.15 }),
      tea: std({ color: 0x7a2e10, roughness: 0.1, transparent: true, opacity: 0.92 }),
      milk: std({ color: 0xd9b48a, roughness: 0.4 }),
      glass: new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide }),
      iced: std({ color: 0x5a3420, roughness: 0.2, transparent: true, opacity: 0.88 }),
      ice: new T.MeshPhysicalMaterial({ color: 0xeaf4f8, roughness: 0.08, transparent: true, opacity: 0.55, depthWrite: false }),
      straw: std({ color: 0x2f3a32, roughness: 0.5 })
    };
    return matCache;
  }
  function latteArt(T) {
    if (artTex) return artTex;
    var c = root.document && root.document.createElement ? root.document.createElement('canvas') : null;
    if (!c || !c.getContext) return null;
    c.width = c.height = 128;
    var g = c.getContext('2d');
    if (!g || !g.createRadialGradient) return null;
    var gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, '#c9935c'); gr.addColorStop(0.85, '#9a6236'); gr.addColorStop(1, '#5e3418');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    // 하트 + 로제타 잎 무늬(우유 거품)
    g.fillStyle = '#f4e9d8';
    g.beginPath(); g.moveTo(64, 96); g.bezierCurveTo(20, 62, 36, 28, 64, 48); g.bezierCurveTo(92, 28, 108, 62, 64, 96); g.fill();
    g.fillStyle = '#c9935c'; g.beginPath(); g.moveTo(64, 88); g.bezierCurveTo(40, 64, 48, 46, 64, 58); g.bezierCurveTo(80, 46, 88, 64, 64, 88); g.fill();
    g.fillStyle = '#f4e9d8'; g.beginPath(); g.ellipse(64, 66, 9, 12, 0, 0, 6.29); g.fill();
    g.fillRect(63, 30, 2, 40);
    artTex = new T.CanvasTexture(c); artTex.encoding = T.sRGBEncoding;
    return artTex;
  }
  function lathe(T, pts, seg) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 24); }
  // 원점 = 컵(받침) 바닥 가운데. 크기는 실제 컵(m).
  function makeCup(T, kind) {
    var M = mats(T), g = new T.Group(); g.name = 'cup_' + kind; g.userData.cup = kind;
    function add(geo, m, x, y, z) { var me = new T.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; }
    if (kind === 'americano') {   // 머그: 두께 있는 원통(안·밖) + 손잡이 + 커피 면
      add(lathe(T, [[0, 0], [0.04, 0], [0.042, 0.004], [0.042, 0.095], [0.037, 0.095], [0.036, 0.01], [0, 0.01]], 28), M.mugBody);
      var h = add(new T.TorusGeometry(0.024, 0.0065, 8, 16, Math.PI * 1.2), M.mugBody, 0.044, 0.05, 0); h.rotation.z = -Math.PI * 0.6;
      add(new T.CircleGeometry(0.0362, 24).rotateX(-Math.PI / 2), M.coffee, 0, 0.082, 0);
    } else if (kind === 'latte') {   // 넓은 잔 + 받침 + 라떼 아트
      add(lathe(T, [[0, 0], [0.075, 0], [0.078, 0.006], [0.07, 0.011], [0, 0.011]], 32), M.ceramic);   // 받침
      add(lathe(T, [[0, 0.011], [0.028, 0.011], [0.046, 0.03], [0.055, 0.07], [0.052, 0.07], [0.043, 0.032], [0.026, 0.018], [0, 0.018]], 32), M.ceramic);
      var hl = add(new T.TorusGeometry(0.016, 0.005, 8, 14, Math.PI * 1.1), M.ceramic, 0.058, 0.05, 0); hl.rotation.z = -Math.PI * 0.55;
      var at = latteArt(T), am = at ? new T.MeshStandardMaterial({ map: at, roughness: 0.45 }) : M.milk;
      add(new T.CircleGeometry(0.0505, 32).rotateX(-Math.PI / 2), am, 0, 0.064, 0);
    } else if (kind === 'iced') {   // 유리잔(투명) + 커피 + 얼음 3 + 빨대
      add(lathe(T, [[0.032, 0], [0.04, 0.14], [0.0385, 0.14], [0.031, 0.006], [0, 0.006]], 28), M.glass);
      add(new T.CylinderGeometry(0.036, 0.03, 0.11, 24), M.iced, 0, 0.061, 0);
      [[0.012, 0.105, 0.008, 0.3], [-0.014, 0.11, -0.006, 1.1], [0.002, 0.098, -0.016, 2.0]].forEach(function (c) { var m = add(new T.BoxGeometry(0.02, 0.02, 0.02), M.ice, c[0], c[1], c[2]); m.rotation.set(c[3], c[3] * 0.7, 0.2); });
      var st = add(new T.CylinderGeometry(0.0035, 0.0035, 0.2, 8), M.straw, 0.012, 0.12, 0.004); st.rotation.z = -0.18;
    } else {   // tea: 낮고 넓은 찻잔 + 받침 + 홍차
      add(lathe(T, [[0, 0], [0.07, 0], [0.073, 0.005], [0.066, 0.01], [0, 0.01]], 32), M.ceramic);
      add(lathe(T, [[0, 0.01], [0.022, 0.01], [0.04, 0.022], [0.05, 0.05], [0.047, 0.05], [0.037, 0.024], [0.02, 0.016], [0, 0.016]], 32), M.ceramic);
      var ht = add(new T.TorusGeometry(0.014, 0.0045, 8, 14, Math.PI * 1.1), M.ceramic, 0.052, 0.036, 0); ht.rotation.z = -Math.PI * 0.55;
      add(new T.CircleGeometry(0.0455, 28).rotateX(-Math.PI / 2), M.tea, 0, 0.044, 0);
    }
    return g;
  }

  // 손에 든 컵: 손 뼈(holdAnchor)의 월드 자리에서 아바타 앞쪽으로 조금, 아래로 조금 — 컵은 늘 곧게 선다(손 뼈 방향을 따라 기울지 않게).
  // 장면에 두고 매 프레임 옮긴다(몸을 바꿔 끼워도 holdAnchor 만 있으면 된다). cup.userData.held = 그 아바타.
  var _hv = null;
  function followHand(av, cup) {
    var T = root.THREE, a = av.holdAnchor ? av.holdAnchor() : null; if (!a) return false;
    _hv = _hv || new T.Vector3();
    a.updateWorldMatrix(true, false); a.getWorldPosition(_hv);
    var yaw = av.root.rotation.y, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    cup.position.set(_hv.x + fx * 0.035, _hv.y - 0.075, _hv.z + fz * 0.035);
    cup.rotation.set(0, yaw, 0);
    cup.userData.held = av;
    return true;
  }
  function attachToHand(av, cup, scene) {
    if (cup.parent !== scene) { if (cup.parent) cup.parent.remove(cup); scene.add(cup); }
    return followHand(av, cup);
  }

  // ---- 실행(장면·바리스타·내 컵·다른 사람 컵) ----
  // app: main.js App(world·meAv·me·logic·net) / post: 이벤트 보내기
  function create(app, post) {
    var T = root.THREE, layout = app.world && app.world.layout, cfg = layout && layout.coffee;
    if (!cfg || !T) return null;
    var L = Logic(cfg), scene = app.scene, myCup = null, myKind = null;
    // 바리스타: 중성 색 옷 + 앞치마. 몸 약속(bodyToCfg) 으로 만든다
    var AV = root.RoomAvatar, bar = null, bc = cfg.barista, barYaw = bc.yaw, brewT = 0;
    if (AV && AV.Avatar) {
      var bcfg = AV.bodyToCfg ? AV.bodyToCfg({ gender: 'm', face: 1, hair: 2, hairColor: 1, outfit: 9, label: '' }) : { g: 1 };
      bar = new AV.Avatar(bcfg, { showTag: false });
      bar.setApron(0x4a4038);
      bar.setPose(bc.x, layout.floorZones ? layout.floorZones[0].y : 0, bc.z, bc.yaw); bar.snapPose();
      scene.add(bar.root);
      if (root.RoomRenderUtil) root.RoomRenderUtil.markCaster(bar.root);
    }
    var fy = layout.floorZones ? layout.floorZones[0].y : 0;
    // 배달 길 찾기: 사람이 걷는 충돌체에서 바리스타 통로(카운터 뒤)만 뺀 격자 — 통로 끝(exit)으로 나와 사람과 같은 길을 걷는다
    var nav = null, SL = root.RoomLogic, ST = root.RoomStations;
    function getNav() {
      if (nav || !SL || !ST || !app.logic) return nav;
      var hm0 = cfg.home || bc, keep = app.logic.colliders.filter(function (c) { return !(c.k === 0 && hm0.x > c.x0 && hm0.x < c.x1 && hm0.z > c.z0 && hm0.z < c.z1); });   // 통로 상자 = 집(home)을 품은 상자
      var lg = SL.create(layout, { colliders: keep, zones: app.logic.layoutZones ? app.logic.layoutZones() : [] });
      nav = ST.create(lg, { cell: 0.15, radius: 0.25, speed: 1.25 });
      return nav;
    }
    var seatAnchor = [];   // 호스트가 바꾼 자리(setSeatAnchors): [{cup, book, serve}]
    function cupSpot(i) { var a = seatAnchor[i]; return (a && a.cup) || (cfg.cupSpots && cfg.cupSpots[i]) || null; }
    function serveSpot(i) { var a = seatAnchor[i]; return (a && a.serve) || (cfg.serve && cfg.serve[i]) || null; }
    L.spotFor = function (i) { return cupSpot(i); };
    // 바리스타 일: {kind, seat, mine, cup(Object3D), st:'brew'|'out'|'go'|'place'|'back'|'in', w(걷기), t}
    var job = null, jobs = [], wv = {}, BAR_V = 1.25;
    function home() { return cfg.home || { x: bc.x, z: bc.z }; }
    function pathTo(from, to, inside) {
      if (inside) return { pts: [{ x: from.x, z: from.z }, { x: to.x, z: to.z }], len: Math.hypot(to.x - from.x, to.z - from.z) };
      var N = getNav(); return N ? N.findPath(from, to) : null;
    }
    function startJob(j) {
      job = j; j.t = 0; j.st = 'brew';
      if (bar) bar.playGesture('brew', L.brewSec);
      brewT = L.brewSec;
    }
    // 걷기: 길(w)을 따라 바리스타를 옮긴다. 사람(나·다른 사람)이 0.5m 앞이면 멈춘다(최대 2초)
    function walkBar(dt) {
      var p = bar.root.position, me = { x: p.x, z: p.z }, N = getNav() || { stepWalk: ST.create(app.logic).stepWalk };
      N.stepWalk(job.w, me, dt, wv, BAR_V);
      if (wv.done) return true;
      var block = false, fx = wv.vx / (wv.speed || 1), fz = wv.vz / (wv.speed || 1);
      function near(x, z) { var dx = x - p.x, dz = z - p.z, f = dx * fx + dz * fz; return f > 0 && f < 0.55 && Math.abs(dx * fz - dz * fx) < 0.4; }
      if (app.me && app.me.mode === 'walk' && near(app.me.x, app.me.z)) block = true;
      if (app.net && app.net.table) app.net.table.peers.forEach(function (r) { if (r.st !== 'sit' && near(r.x, r.z)) block = true; });
      job.wait = block ? (job.wait || 0) + dt : 0;
      var go = !block || job.wait > 2;
      var nx = p.x + (go ? wv.vx * dt : 0), nz = p.z + (go ? wv.vz * dt : 0);
      var want = wv.speed > 0.05 ? wv.yaw : barYaw, d = want - barYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      barYaw += d * Math.min(1, dt * 8);
      bar.setWalk(go ? Math.min(1, wv.speed / 2.2 * 1.05) : 0);
      bar.setPose(nx, app.logic ? app.logic.floorY(nx, nz) : fy, nz, barYaw);
      return false;
    }
    function jobCup(j) { if (!j.cup) j.cup = makeCup(T, j.kind); return j.cup; }
    function updateJob(dt, t) {
      var j = job, p = bar.root.position;
      j.t += dt;
      if (j.st === 'brew') {
        brewT -= dt;
        var want = Math.atan2(-(bc.machine.x - p.x), -(bc.machine.z - p.z)), d0 = want - barYaw; while (d0 > Math.PI) d0 -= Math.PI * 2; while (d0 < -Math.PI) d0 += Math.PI * 2;
        barYaw += d0 * Math.min(1, dt * 3); bar.setPose(p.x, p.y, p.z, barYaw); bar.setWalk(0);
        if (j.t >= L.brewSec) {
          var sv = serveSpot(j.seat);
          if (!sv) { j.st = 'done'; return; }
          attachToHand(bar, jobCup(j), scene); bar.setHold(true);
          // 통로 안(바 스툴 — 카운터 너머로 건넨다)이면 바로, 아니면 통로 끝(exit)으로 나간 다음 길 찾기
          if (sv.across) { j.w = (getNav() || ST.create(app.logic)).startWalk(pathTo(p, sv, true), sv); j.st = 'go'; }
          else { j.w = (getNav() || ST.create(app.logic)).startWalk(pathTo(p, cfg.exit || p, true), cfg.exit); j.st = 'out'; }
          j.t = 0;
        }
      } else if (j.st === 'out' || j.st === 'go' || j.st === 'back' || j.st === 'in') {
        if (j.cup && j.cup.userData.held) followHand(bar, j.cup);
        if (!walkBar(dt) && j.t < 60) return;
        j.t = 0;
        if (j.st === 'out') { var sv2 = serveSpot(j.seat), pp = pathTo(p, sv2); if (!pp) { j.st = 'place'; return; } j.w = getNav().startWalk(pp, sv2); j.st = 'go'; }
        else if (j.st === 'go') j.st = 'place';
        else if (j.st === 'back') { j.w = (getNav() || ST.create(app.logic)).startWalk(pathTo(p, home(), true), home()); j.st = 'in'; }
        else { j.st = 'done'; }
      } else if (j.st === 'place') {
        // 컵 자리를 보고 내려놓는다(0.7초): 가운데에서 컵이 자리에 놓이고 그 순간 coffeeReady
        var cs = cupSpot(j.seat);
        var w2 = Math.atan2(-(cs.x - p.x), -(cs.z - p.z)), d1 = w2 - barYaw; while (d1 > Math.PI) d1 -= Math.PI * 2; while (d1 < -Math.PI) d1 += Math.PI * 2;
        barYaw += d1 * Math.min(1, dt * 6); bar.setPose(p.x, p.y, p.z, barYaw); bar.setWalk(0);
        if (j.cup && j.cup.userData.held) followHand(bar, j.cup);
        if (j.t > 0.45 && !j.put) {
          j.put = true; bar.setHold(false);
          if (j.mine) { if (j.cup && j.cup.parent) j.cup.parent.remove(j.cup); emit(L.delivered()); placeMyCup(); }
          else if (j.cup) { j.cup.userData.held = null; j.cup.position.set(cs.x, cs.y, cs.z); j.cup.rotation.set(0, 0.6, 0); j.leftCup = j.cup; }
          post({ e: 'baristaPlaced', seat: j.seat, kind: j.kind, mine: !!j.mine });
        }
        if (j.t > 0.8) {
          var cfgSv = serveSpot(j.seat);
          if (cfgSv && cfgSv.across) { j.w = (getNav() || ST.create(app.logic)).startWalk(pathTo(p, home(), true), home()); j.st = 'in'; }
          else { var pb = pathTo(p, cfg.exit || home()); j.w = getNav().startWalk(pb || pathTo(p, cfg.exit || home(), true), cfg.exit || home()); j.st = 'back'; }
          j.t = 0;
        }
      }
    }
    function placeMyCup() {
      var st = L.cupState();
      if (st.where === 'none' || st.where === 'barista') { if (myCup && myCup.parent) myCup.parent.remove(myCup); if (app.meAv) app.meAv.setHold(false); return; }
      if (!myCup || myKind !== st.kind) { if (myCup && myCup.parent) myCup.parent.remove(myCup); myCup = makeCup(T, st.kind); myKind = st.kind; }
      if (st.where === 'hand') { attachToHand(app.meAv, myCup, scene); app.meAv.setHold(true); }
      else { if (myCup.parent !== scene) { if (myCup.parent) myCup.parent.remove(myCup); scene.add(myCup); } myCup.userData.held = null; myCup.position.set(st.pos.x, st.pos.y, st.pos.z); myCup.rotation.set(0, 0.6, 0); if (app.meAv) app.meAv.setHold(false); }
    }
    function emit(list) { list.forEach(function (e) { post(e); }); }
    function mySeatIdx() { return app.me && app.me.mode === 'seated' && app.me.seat ? app.logic.seatIndex(app.me.seat) : null; }
    var api = {
      logic: L,
      barista: bar,
      // kind, o: {seat} — 앉아 있으면 seat 를 안 줘도 지금 좌석으로 가져다 준다. 카운터 앞(서서)이면 예전처럼 받으러 가기
      order: function (kind, o) {
        var seat = o && typeof o.seat === 'number' ? o.seat : mySeatIdx();
        var ev = L.order(kind, seat !== null ? { seat: seat } : null); if (!ev.length) return false;
        if (job && job.mine && job.cup && job.cup.parent) job.cup.parent.remove(job.cup);
        if (L.deliverTo !== null) { if (bar) { jobs.length = 0; startJob({ kind: L.kind, seat: L.deliverTo, mine: true }); } else { L.phase = 'carry'; emit(L.delivered()); } }
        else { brewT = L.brewSec; if (bar) bar.playGesture('brew', L.brewSec); }
        placeMyCup(); emit(ev); return true;
      },
      // 다른 사람 주문의 배달(호스트가 모든 사람에게 같은 일을 보낸다): {kind, seat, startAt(ms, performance.now 기준이 아니라 Date.now)}
      job: function (o) {
        var k = kindOf(o && o.kind); if (!k || typeof o.seat !== 'number') return false;
        var j = { kind: k, seat: o.seat | 0, mine: false, at: +o.startAt || 0 };
        if (job && job.st !== 'done') jobs.push(j); else if (bar) startJob(j);
        return true;
      },
      setSeatAnchors: function (list) {
        (Array.isArray(list) ? list : []).forEach(function (a) { if (!a || typeof a.i !== 'number') return; var o = seatAnchor[a.i] || (seatAnchor[a.i] = {}); ['cup', 'book', 'serve'].forEach(function (k) { if (a[k]) o[k] = a[k]; }); });
        placeMyCup();
      },
      bookSpot: function (i) { var a = seatAnchor[i]; return (a && a.book) || (layout.bookSpots && layout.bookSpots[i]) || null; },
      jobState: function () { return job ? { st: job.st, seat: job.seat, kind: job.kind, x: bar.root.position.x, z: bar.root.position.z } : null; },
      give: function (kind) { L.give(kind); if (app.me && app.me.mode === 'seated' && app.me.seat) L.onSit(app.logic.seatIndex(app.me.seat)); placeMyCup(); },
      onSit: function (i) { L.onSit(i); placeMyCup(); },
      onStand: function () { L.onStand(); placeMyCup(); },
      update: function (dt, t) {
        var me = app.me, seated = me.mode !== 'walk';
        var ev = L.tick(dt, { x: me.x, z: me.z, seated: seated });
        if (ev.length) { placeMyCup(); emit(ev); }
        if (myCup && myCup.userData.held) followHand(myCup.userData.held, myCup);
        if (!bar) return;
        if (job && job.st === 'done') { if (job.leftCup && job.leftCup.parent) job.leftCup.parent.remove(job.leftCup); bar.setHold(false); job = null; }   // 다른 사람 컵은 그 사람의 cup 필드가 이어받는다
        if (!job && jobs.length && (!jobs[0].at || Date.now() >= jobs[0].at)) startJob(jobs.shift());
        if (job) { updateJob(dt, t); bar.update(dt, t); return; }
        // 바리스타 방향: 만드는 중이면 기계(+x) 쪽, 내가 3 m 안이면 나를, 아니면 손님 쪽(기본)
        var want = bc.yaw, dx = me.x - bc.x, dz = me.z - bc.z;
        if (brewT > 0) { brewT -= dt; want = Math.atan2(-(bc.machine.x - bc.x), -(bc.machine.z - bc.z)); }
        else if (dx * dx + dz * dz < 9 && app.meAv && app.meAv.root.visible) want = Math.atan2(-dx, -dz);   // 썸네일(내 몸 숨김)에서는 손님 쪽 그대로
        var d = want - barYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        barYaw += d * Math.min(1, dt * 3);
        // 통로 밖으로 나가지 않게(제자리 + 살짝 좌우 — 만들 때 기계 앞으로 반 걸음)
        var bx = brewT > 0 ? bc.x + 0.08 : bc.x, bz = brewT > 0 ? Math.max(bc.z0, Math.min(bc.z1, bc.machine.z + 0.25)) : bc.z;
        var p = bar.root.position, nx = p.x + (bx - p.x) * Math.min(1, dt * 2), nz = p.z + (bz - p.z) * Math.min(1, dt * 2);
        nx = Math.max(bc.x0, Math.min(bc.x1, nx)); nz = Math.max(bc.z0, Math.min(bc.z1, nz));
        var mv = Math.hypot(nx - p.x, nz - p.z) / Math.max(dt, 1e-3);
        bar.setWalk(Math.min(1, mv / 1.2));
        bar.setPose(nx, fy, nz, barYaw);
        bar.update(dt, t);
      },
      // 다른 사람 컵(net_view 가 매 프레임 부른다): holder = 보기 기록 v, kind = rec.cup, seatIdx = 앉은 좌석 번호 또는 null
      syncPeer: function (v, av, kind, seatIdx) {
        var k = kindOf(kind), where = peerCupWhere(k, seatIdx, (cfg.cupSpots || []).map(function (c, i) { return cupSpot(i); }));
        if (where === 'none') { if (v.cup && v.cup.parent) v.cup.parent.remove(v.cup); v.cup = null; v.cupKind = null; if (av) av.setHold(false); return; }
        if (!v.cup || v.cupKind !== k) { if (v.cup && v.cup.parent) v.cup.parent.remove(v.cup); v.cup = makeCup(T, k); v.cupKind = k; }
        if (where === 'hand') { attachToHand(av, v.cup, scene); av.setHold(true); }
        else { var s = cupSpot(seatIdx); if (v.cup.parent !== scene) { if (v.cup.parent) v.cup.parent.remove(v.cup); scene.add(v.cup); } v.cup.userData.held = null; v.cup.position.set(s.x, s.y, s.z); av.setHold(false); }
      },
      state: function () { return L.cupState(); }
    };
    return api;
  }

  var C = { KINDS: KINDS, NUM: NUM, kindOf: kindOf, Logic: Logic, peerCupWhere: peerCupWhere, makeCup: makeCup, create: create };
  root.RoomCoffee = C;
  if (typeof module === 'object' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : this);
