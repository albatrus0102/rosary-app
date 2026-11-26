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
      order: function (kind) {
        var k = kindOf(kind); if (!k) return [];
        L.kind = k; L.phase = 'brewing'; L.t = 0; L.seat = null;
        return [{ e: 'coffeeOrdered', kind: k }];
      },
      // me: {x, z, seated(bool), seat(번호|null)}. 반환: 나가는 이벤트 목록
      tick: function (dt, me) {
        var ev = [];
        var nr = !!(me && !me.seated && L.isNear(me.x, me.z));
        if (nr !== L.nearOn) { L.nearOn = nr; ev.push({ e: 'nearCounter', on: nr }); }
        if (L.phase === 'brewing') { L.t += dt; if (L.t >= L.brewSec) { L.phase = 'ready'; ev.push({ e: 'coffeeReady', kind: L.kind }); } }
        if (L.phase === 'ready' && me && !me.seated && cfg.pickup) {
          var dx = me.x - cfg.pickup.x, dz = me.z - cfg.pickup.z;
          if (dx * dx + dz * dz <= L.pickR * L.pickR) { L.phase = 'held'; ev.push({ e: 'coffeePicked', kind: L.kind }); }
        }
        return ev;
      },
      give: function (kind) { var k = kindOf(kind); if (!k) { L.phase = 'idle'; L.kind = null; L.seat = null; return; } L.kind = k; L.phase = 'held'; L.seat = null; },
      onSit: function (seatIdx) { if (L.phase === 'held' && L.spotFor(seatIdx)) { L.phase = 'placed'; L.seat = seatIdx; } },
      onStand: function () { if (L.phase === 'placed') { L.phase = 'held'; L.seat = null; } },
      // 지금 컵이 어디 있나: {where:'none'|'counter'|'hand'|'spot', kind, pos?}
      cupState: function () {
        if (!L.kind || L.phase === 'idle' || L.phase === 'brewing') return { where: 'none', kind: L.kind };
        if (L.phase === 'ready') return { where: 'counter', kind: L.kind, pos: cfg.pickup };
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
    function placeMyCup() {
      var st = L.cupState();
      if (st.where === 'none') { if (myCup && myCup.parent) myCup.parent.remove(myCup); if (app.meAv) app.meAv.setHold(false); return; }
      if (!myCup || myKind !== st.kind) { if (myCup && myCup.parent) myCup.parent.remove(myCup); myCup = makeCup(T, st.kind); myKind = st.kind; }
      if (st.where === 'hand') { attachToHand(app.meAv, myCup, scene); app.meAv.setHold(true); }
      else { if (myCup.parent !== scene) { if (myCup.parent) myCup.parent.remove(myCup); scene.add(myCup); } myCup.userData.held = null; myCup.position.set(st.pos.x, st.pos.y, st.pos.z); myCup.rotation.set(0, 0.6, 0); if (app.meAv) app.meAv.setHold(false); }
    }
    function emit(list) { list.forEach(function (e) { post(e); }); }
    var api = {
      logic: L,
      barista: bar,
      order: function (kind) {
        var ev = L.order(kind); if (!ev.length) return false;
        brewT = L.brewSec; if (bar) bar.playGesture('brew', L.brewSec);
        placeMyCup(); emit(ev); return true;
      },
      give: function (kind) { L.give(kind); if (app.me && app.me.mode === 'seated' && app.me.seat) L.onSit(app.logic.seatIndex(app.me.seat)); placeMyCup(); },
      onSit: function (i) { L.onSit(i); placeMyCup(); },
      onStand: function () { L.onStand(); placeMyCup(); },
      update: function (dt, t) {
        var me = app.me, seated = me.mode !== 'walk';
        var ev = L.tick(dt, { x: me.x, z: me.z, seated: seated });
        if (ev.length) { placeMyCup(); emit(ev); }
        if (myCup && myCup.userData.held) followHand(myCup.userData.held, myCup);
        if (bar) {
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
        }
      },
      // 다른 사람 컵(net_view 가 매 프레임 부른다): holder = 보기 기록 v, kind = rec.cup, seatIdx = 앉은 좌석 번호 또는 null
      syncPeer: function (v, av, kind, seatIdx) {
        var k = kindOf(kind), where = peerCupWhere(k, seatIdx, cfg.cupSpots);
        if (where === 'none') { if (v.cup && v.cup.parent) v.cup.parent.remove(v.cup); v.cup = null; v.cupKind = null; if (av) av.setHold(false); return; }
        if (!v.cup || v.cupKind !== k) { if (v.cup && v.cup.parent) v.cup.parent.remove(v.cup); v.cup = makeCup(T, k); v.cupKind = k; }
        if (where === 'hand') { attachToHand(av, v.cup, scene); av.setHold(true); }
        else { var s = cfg.cupSpots[seatIdx]; if (v.cup.parent !== scene) { if (v.cup.parent) v.cup.parent.remove(v.cup); scene.add(v.cup); } v.cup.userData.held = null; v.cup.position.set(s.x, s.y, s.z); av.setHold(false); }
      },
      state: function () { return L.cupState(); }
    };
    return api;
  }

  var C = { KINDS: KINDS, NUM: NUM, kindOf: kindOf, Logic: Logic, peerCupWhere: peerCupWhere, makeCup: makeCup, create: create };
  root.RoomCoffee = C;
  if (typeof module === 'object' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : this);
