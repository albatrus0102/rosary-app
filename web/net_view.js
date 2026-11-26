/* net_view.js — 다른 사람(피어) 아바타 보기 + 내 자세 내보내기. 서버와 무관하다(어떤 전송이든 호스트가 받아 넘긴다).
   들어오는 것: setPeers([{id, x, z, yaw, state, seat, avatar}], {partial}) — 지금 보이는 사람 목록(스냅숏).
     state: 'walk'(서서 다님) | 'sit'(앉음). seat: 좌석 번호(0..) 또는 null. avatar: {g, skin, style, hair, outfit, label}. cup: 든 음료(coffee.js 종류) 또는 null.
     partial: true 면 목록에 없는 사람을 지우지 않는다(일부만 보낸 갱신). 기본 false = 목록에 없는 사람은 GRACE_MS 뒤 지운다.
   나가는 것: createPoseSender({hz, idleMs, seatedIdleMs, send}) — 걷는 동안 hz(기본 3)로(5 cm·0.05 rad 넘게 움직였을 때만), 서서 가만히 있으면 idleMs(기본 10초)마다 한 번, 앉아 있으면 seatedIdleMs(기본 0 = 보내지 않음). 상태 바뀜은 바로.
   보간: 사람마다 받은 표본(받은 시각·x·z·yaw)을 4개까지 두고, 지금보다 delay(받는 간격의 약 1.6배, 180~900ms) 앞의 자리를 그린다.
     순간 이동(한 표본에 TELEPORT_M 넘게 뜀, 또는 SNAP_GAP_MS 넘게 끊겼다 다시 옴)은 보간하지 않고 그 자리로 옮긴다.
     STALE_MS 동안 새 표본이 없는 사람은 지운다(연결이 끊긴 채 남은 유령 방지).
   순수 계산(createInterp·createPoseSender·createTable)은 three.js 없이 Node 에서도 돈다(test/net_view.test.mjs). */
(function (root) {
  'use strict';
  var PI = Math.PI;
  var DEF = { MAX_VISIBLE: 40, TELEPORT_M: 2.5, SNAP_GAP_MS: 2500, STALE_MS: 8000, GRACE_MS: 1500, DELAY_MIN: 180, DELAY_MAX: 900, DELAY_K: 1.6, SAMPLES: 4 };

  function angDiff(a, b) { var d = (b - a) % (PI * 2); if (d > PI) d -= PI * 2; if (d < -PI) d += PI * 2; return d; }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }

  // ---- 표본 보간기(한 사람) ----
  // push(t, x, z, yaw): 받은 시각 t(ms). sample(rt, out): rt(ms) 의 자리 → out {x, z, yaw, snapped}. delay(): 지금 쓰는 지연(ms).
  function createInterp(o) {
    o = o || {};
    var C = { TELEPORT_M: num(o.teleport, DEF.TELEPORT_M), SNAP_GAP_MS: num(o.snapGap, DEF.SNAP_GAP_MS), N: o.samples || DEF.SAMPLES,
      DMIN: num(o.delayMin, DEF.DELAY_MIN), DMAX: num(o.delayMax, DEF.DELAY_MAX), DK: num(o.delayK, DEF.DELAY_K) };
    var s = [], gap = 0, snapped = false;   // gap: 받는 간격 이동 평균(ms)
    var I = {
      count: function () { return s.length; },
      last: function () { return s.length ? s[s.length - 1] : null; },
      delay: function () { return Math.max(C.DMIN, Math.min(C.DMAX, (gap || 333) * C.DK)); },
      push: function (t, x, z, yaw) {
        var L = s.length ? s[s.length - 1] : null;
        if (L && t <= L.t) t = L.t + 1;   // 같은 시각에 두 번 오면 1ms 뒤로
        if (L) {
          var dx = x - L.x, dz = z - L.z, jump = Math.sqrt(dx * dx + dz * dz) > C.TELEPORT_M, late = t - L.t > C.SNAP_GAP_MS;
          if (jump || late) { s.length = 0; snapped = true; }   // 순간 이동·긴 끊김: 지난 표본을 버리고 새 자리에서 시작
          else gap = gap ? gap + (t - L.t - gap) * 0.25 : t - L.t;
        }
        s.push({ t: t, x: x, z: z, yaw: yaw });
        if (s.length > C.N) s.shift();
      },
      sample: function (rt, out) {
        out = out || {};
        out.snapped = snapped; snapped = false;
        var n = s.length;
        if (!n) return null;
        if (n === 1 || rt <= s[0].t) { out.x = s[0].x; out.z = s[0].z; out.yaw = s[0].yaw; return out; }
        if (rt >= s[n - 1].t) { out.x = s[n - 1].x; out.z = s[n - 1].z; out.yaw = s[n - 1].yaw; return out; }   // 앞지르지 않는다(끝 표본에 머문다)
        var a = 0;
        while (a < n - 2 && rt > s[a + 1].t) a++;
        var A = s[a], B = s[a + 1], f = (rt - A.t) / Math.max(1, B.t - A.t);
        out.x = A.x + (B.x - A.x) * f; out.z = A.z + (B.z - A.z) * f; out.yaw = A.yaw + angDiff(A.yaw, B.yaw) * f;
        return out;
      }
    };
    return I;
  }

  // ---- 피어 표(누가 있나·좌석 점유·오래된 사람 지우기). 그리기와 따로(순수). ----
  // 들고 있는 음료(coffee.js 종류) — 모르는 값은 없음(null)
  var CUPS = ['americano', 'latte', 'iced', 'tea'], CUPN = { 1: 'americano', 2: 'latte', 3: 'americano', 4: 'latte', 5: 'tea', 6: 'latte', 7: 'iced' };   // 음료 번호(coffee.js NUM 과 같다)
  function cupOf(c) { if (typeof c === 'number' || (typeof c === 'string' && /^\d+$/.test(c))) return CUPN[+c] || null; return typeof c === 'string' && CUPS.indexOf(c) >= 0 ? c : null; }
  function createTable(o) {
    o = o || {};
    var STALE = num(o.staleMs, DEF.STALE_MS), GRACE = num(o.graceMs, DEF.GRACE_MS);
    var peers = new Map();
    function norm(p) {
      var st = p.state === 'sit' || p.state === 's' ? 'sit' : 'walk';
      var seat = p.seat === null || p.seat === undefined || p.seat === '' ? null : p.seat;
      return { st: st, seat: st === 'sit' ? seat : null };
    }
    var T = {
      peers: peers,
      // 반환: {added:[id], removed:[id], changed:[id]} — 그리기 쪽이 아바타를 만들고 치운다
      set: function (list, now, opts) {
        var ev = { added: [], removed: [], changed: [] }, seen = {};
        (list || []).forEach(function (p) {
          if (!p || p.id === undefined || p.id === null) return;
          var id = String(p.id), n = norm(p), rec = peers.get(id);
          seen[id] = 1;
          if (!rec) {
            rec = { id: id, avatar: p.avatar || {}, cup: cupOf(p.cup), st: n.st, seat: n.seat, seen: now, upd: now, missing: 0, interp: createInterp(o.interp), x: num(p.x, 0), z: num(p.z, 0), yaw: num(p.yaw, 0) };
            peers.set(id, rec); ev.added.push(id);
          } else {
            if (p.avatar && JSON.stringify(p.avatar) !== JSON.stringify(rec.avatar)) { rec.avatar = p.avatar; ev.changed.push(id); }
            if (n.st !== rec.st || n.seat !== rec.seat) { rec.st = n.st; rec.seat = n.seat; if (ev.changed.indexOf(id) < 0) ev.changed.push(id); }
            var cp = cupOf(p.cup); if (cp !== rec.cup) { rec.cup = cp; if (ev.changed.indexOf(id) < 0) ev.changed.push(id); }
            rec.missing = 0; rec.seen = now;
          }
          var x = num(p.x, rec.x), z = num(p.z, rec.z), yaw = num(p.yaw, rec.yaw);
          var L = rec.interp.last();
          // 같은 자리·같은 방향이 다시 오면 표본을 더하지 않는다(멈춘 사람) — 그러나 살아 있음(seen)은 갱신
          if (!L || Math.abs(L.x - x) > 1e-3 || Math.abs(L.z - z) > 1e-3 || Math.abs(angDiff(L.yaw, yaw)) > 1e-3) { rec.interp.push(now, x, z, yaw); rec.upd = now; }
          rec.x = x; rec.z = z; rec.yaw = yaw;
        });
        if (!(opts && opts.partial)) peers.forEach(function (rec, id) { if (!seen[id] && !rec.missing) rec.missing = now; });
        T.sweep(now, ev);
        return ev;
      },
      // 오래된 사람 지우기: 목록에서 빠진 지 GRACE 넘음, 또는 STALE 동안 아무 소식 없음
      sweep: function (now, ev) {
        ev = ev || { added: [], removed: [], changed: [] };
        peers.forEach(function (rec, id) {
          if ((rec.missing && now - rec.missing > GRACE) || now - rec.seen > STALE) { peers.delete(id); ev.removed.push(id); }
        });
        return ev;
      },
      remove: function (id) { id = String(id); if (peers.has(id)) { peers.delete(id); return true; } return false; },
      seatOwner: function (seat) { var who = null; peers.forEach(function (rec) { if (rec.st === 'sit' && rec.seat === seat) who = rec.id; }); return who; },
      clear: function () { peers.clear(); }
    };
    return T;
  }

  // ---- 내 자세 내보내기(onMyPose) ----
  // createPoseSender({hz: 3, minMove: 0.05 m, minTurn: 0.05 rad, idleMs: 10000(옛 이름 keepAliveMs), seatedIdleMs: 0, send(pose)}). tick(now, pose) 를 매 프레임 부른다.
  // pose = {x, z, yaw, state, seat}. 상태(앉음·일어남·좌석)가 바뀌면 박자를 기다리지 않고 바로 보낸다.
  function createPoseSender(o) {
    o = o || {};
    // 박동(독서공방 기본): 걷는 중 hz(3)로 — 5 cm·0.05 rad 넘게 움직였을 때만, 서서 가만히 있으면 idleMs(10초)마다 한 번, 앉아 있으면 seatedIdleMs(0 = 없음). 상태 바뀜은 바로.
    var hz = Math.max(0.5, Math.min(10, num(o.hz, 3))), minMove = num(o.minMove, 0.05), minTurn = num(o.minTurn, 0.05), idleMs = num(o.idleMs, num(o.keepAliveMs, 10000)), seatedIdleMs = num(o.seatedIdleMs, 0);
    var last = null, lastT = -1e9, sent = 0;
    var S = {
      // setRate(3) 또는 setRate({hz, idleSec|idleMs, seatedIdleSec|seatedIdleMs, minMove, minTurn}) — 0 이면 그 박동 없음
      setRate: function (h) {
        if (h && typeof h === 'object') {
          if (h.hz !== undefined) hz = Math.max(0.5, Math.min(10, num(h.hz, hz)));
          if (h.idleSec !== undefined) idleMs = Math.max(0, num(h.idleSec, idleMs / 1000) * 1000); else if (h.idleMs !== undefined) idleMs = Math.max(0, num(h.idleMs, idleMs));
          if (h.seatedIdleSec !== undefined) seatedIdleMs = Math.max(0, num(h.seatedIdleSec, seatedIdleMs / 1000) * 1000); else if (h.seatedIdleMs !== undefined) seatedIdleMs = Math.max(0, num(h.seatedIdleMs, seatedIdleMs));
          if (h.minMove !== undefined) minMove = Math.max(0, num(h.minMove, minMove));
          if (h.minTurn !== undefined) minTurn = Math.max(0, num(h.minTurn, minTurn));
          return;
        }
        hz = Math.max(0.5, Math.min(10, num(h, hz)));
      },
      config: function () { return { hz: hz, idleMs: idleMs, seatedIdleMs: seatedIdleMs, minMove: minMove, minTurn: minTurn }; },
      rate: function () { return hz; },
      sent: function () { return sent; },
      tick: function (now, p) {
        if (!p) return false;
        var stateChg = !last || last.state !== p.state || last.seat !== p.seat;
        var due = now - lastT >= 1000 / hz;
        var moved = !last || Math.hypot(p.x - last.x, p.z - last.z) > minMove || Math.abs(angDiff(last.yaw, p.yaw)) > minTurn;
        var sitting = p.state === 'sit', keep = sitting ? seatedIdleMs : idleMs;
        if (stateChg || (!sitting && due && moved) || (keep > 0 && now - lastT >= keep)) {
          last = { x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, yaw: Math.round(p.yaw * 100) / 100, state: p.state, seat: p.seat === undefined ? null : p.seat };
          lastT = now; sent++;
          if (o.send) { try { o.send({ x: last.x, z: last.z, yaw: last.yaw, state: last.state, seat: last.seat, t: Math.round(now) }); } catch (e) { /* 보내는 쪽 오류는 고리를 막지 않는다 */ } }
          return true;
        }
        return false;
      }
    };
    return S;
  }

  // ---- 그리기(three.js·avatar.js 가 있을 때만) ----
  function create(scene, opts) {
    opts = opts || {};
    var T3 = root.THREE, Av = root.RoomAvatar && root.RoomAvatar.Avatar;
    var logic = null, mySeat = null, table = createTable(opts), views = new Map(), pool = [], tmp = {};
    var MAXV = opts.maxVisible || DEF.MAX_VISIBLE, focus = { x: 0, z: 0 }, selT = 99, seatOff = null, cupHook = null;
    function walkTop() { return (logic && logic.walkSpeed) || (root.RoomLogic && root.RoomLogic.C.WALK_SPEED) || 2.2; }
    function seatId(seat) { if (seat === null || seat === undefined || !logic) return null; return typeof seat === 'number' ? logic.seatAt(seat) : seat; }
    function acquire(cfg) {
      var a = pool.pop();
      if (a) a.setConfig(cfg); else a = new Av(cfg, {});
      a.lod = -1; a.setLod(0);
      scene.add(a.root);
      if (root.RoomRenderUtil) root.RoomRenderUtil.markCaster(a.root);
      return a;
    }
    function release(id) {
      var v = views.get(id); if (!v) return;
      if (cupHook) cupHook(v, v.av, null, null);
      scene.remove(v.av.root); pool.push(v.av); views.delete(id);
    }
    function apply(ev) {
      ev.removed.forEach(release);
      ev.changed.forEach(function (id) {
        var v = views.get(id), rec = table.peers.get(id);
        if (!v || !rec) return;
        v.av.setConfig(rec.avatar);
        var sid = seatId(rec.seat);
        if (rec.st === 'sit' && sid && v.sid !== sid) {
          // 앉기(2026-11-26 원인 6): 지금 자리에서 좌석 방향으로 돌아선 뒤(yaw 보간) 뒤로 내려앉는다 — main.js 와 같은 순서
          var r0 = v.av.root, spq = logic && logic.seatPos(sid), turn = spq ? Math.abs(angDiff(r0.rotation.y, spq.yaw)) : 0;
          v.sid = sid; v.ax = r0.position.x; v.az = r0.position.z; v.ayaw = r0.rotation.y; v.ay = r0.position.y;
          v.td = turn > 0.2 ? 0.3 + 0.45 * turn / Math.PI : 0; v.sd = 0.9; v.anim = v.td + v.sd; v.at = 0;
          if (v.av.setSeatFit && logic && logic.seatFit) v.av.setSeatFit(logic.seatFit(sid));
        }
        else if (rec.st !== 'sit' && v.sid) { v.sid = null; v.blend = 0.5; v.anim = 0; if (v.av.setSitProgress) v.av.setSitProgress(null); }
      });
      selT = 99;
    }
    var api = {
      table: table,
      setLogic: function (l) { logic = l; },
      setSeatOffset: function (fn) { seatOff = typeof fn === 'function' ? fn : null; },   // 흔들리는 자리(그네): 앉은 아바타를 같은 만큼 옮긴다
      setMySeat: function (s) { mySeat = s; },
      setCupHook: function (fn) { cupHook = typeof fn === 'function' ? fn : null; },   // 다른 사람 컵(coffee.js syncPeer)
      count: function () { return table.peers.size; },
      visibleCount: function () { return views.size; },
      // seat: 좌석 id. 내가 앉은 좌석은 빼고, 남이 앉은 좌석이면 true
      isTaken: function (sid) {
        if (!logic || sid === mySeat) return false;
        var taken = false, idx = logic.seatIndex(sid);
        table.peers.forEach(function (rec) { if (rec.st === 'sit' && (rec.seat === idx || rec.seat === sid)) taken = true; });
        return taken;
      },
      setPeers: function (list, o2, now) { apply(table.set(list, now === undefined ? performance.now() : now, o2)); },
      removePeer: function (id) { if (table.remove(id)) release(String(id)); },
      clear: function () { table.peers.forEach(function (rec, id) { release(id); }); table.clear(); },
      setFocus: function (x, z) { focus.x = x; focus.z = z; },
      // 가까운 MAXV 명만 아바타를 둔다(나머지는 표에만)
      select: function () {
        var list = [];
        table.peers.forEach(function (rec) { var dx = rec.x - focus.x, dz = rec.z - focus.z; rec.d2 = dx * dx + dz * dz; list.push(rec); });
        list.sort(function (a, b) { return a.d2 - b.d2; });
        var want = {};
        list.slice(0, MAXV).forEach(function (rec) { want[rec.id] = 1; });
        views.forEach(function (v, id) { if (!want[id]) release(id); });
        list.slice(0, MAXV).forEach(function (rec) {
          if (views.has(rec.id) || !Av) return;
          var av = acquire(rec.avatar);
          if (av.setGround && logic && logic.multi) av.setGround(function (x, z, y) { return logic.floorY(x, z, y + 0.2); });
          views.set(rec.id, { av: av, fresh: true, sid: null, anim: 0, ax: 0, az: 0, blend: 0, speed: 0, px: rec.x, pz: rec.z });
        });
      },
      update: function (dt, t, now) {
        selT += dt;
        if (selT > 0.5) { selT = 0; apply(table.sweep(now)); api.select(); }
        views.forEach(function (v, id) {
          var rec = table.peers.get(id), av = v.av; if (!rec) return;
          av.setLod(rec.d2 > 900 ? 2 : (rec.d2 > 324 ? 1 : 0));
          var x, z, r, fl = 0, walk = 0, sid = rec.st === 'sit' ? seatId(rec.seat) : null;
          if (sid && logic && logic.seatInfo(sid)) {
            var sp = logic.seatPos(sid);
            fl = logic.seatFloor(sid);
            var sitP = 1;
            if (v.anim > 0 && !v.fresh) {
              v.anim -= dt; v.at += dt;
              if (v.at < v.td) { x = v.ax; z = v.az; fl = v.ay; r = v.ayaw + angDiff(v.ayaw, sp.yaw) * sm01(v.at / v.td); sitP = -1; }
              else {
                var u = Math.min(1, (v.at - v.td) / v.sd), mv = sm01(u / 0.85); sitP = sm01((u - 0.15) / 0.85);
                x = v.ax + (sp.x - v.ax) * mv; z = v.az + (sp.z - v.az) * mv; r = v.ayaw + angDiff(v.ayaw, sp.yaw) * sm01(u / 0.5);
                fl = v.ay + (fl - v.ay) * sitP;
              }
            } else { x = sp.x; z = sp.z; r = sp.yaw; }
            v.sid = sid;
            var so = seatOff ? seatOff(sid) : null; if (so && sitP >= 1) { x += so.x; z += so.z; fl += so.y; }
            if (sitP < 0) { av.setSeated(false); if (av.setSitProgress) av.setSitProgress(null); }
            else { av.setSeated(true); if (av.setSitProgress) av.setSitProgress(v.anim > 0 ? sitP : null); }
            if (v.fresh) { av.setPose(x, fl, z, r); av.snapPose(); }
          } else {
            var o = rec.interp.sample(now - rec.interp.delay(), tmp);
            if (!o) { x = rec.x; z = rec.z; r = rec.yaw; } else { x = o.x; z = o.z; r = o.yaw; }
            if (o && o.snapped) v.fresh = true;   // 순간 이동: 보간 없이 옮긴다
            if (v.blend > 0) { v.blend -= dt; var kb = Math.min(1, dt * 9); v.px += (x - v.px) * kb; v.pz += (z - v.pz) * kb; x = v.px; z = v.pz; } else { v.px = x; v.pz = z; }
            var p0 = av.root.position, sp2 = v.fresh ? 0 : Math.sqrt((x - p0.x) * (x - p0.x) + (z - p0.z) * (z - p0.z)) / Math.max(dt, 1e-3);
            v.speed += (sp2 - v.speed) * Math.min(1, dt * 8);
            walk = v.speed > 0.12 ? Math.min(1, v.speed / walkTop()) : 0;
            fl = logic ? logic.floorY(x, z, rec.fy) : 0; rec.fy = fl;
            av.setSeated(false);
            if (walk > 0 && !v.fresh) r = av.root.rotation.y + angDiff(av.root.rotation.y, r) * Math.min(1, dt * 12);
          }
          av.setWalk(walk);
          av.setPose(x, sid ? fl : (v.fresh ? fl : p0y(av, fl, dt)), z, r);
          if (v.fresh) { v.fresh = false; av.root.position.y = fl; av.snapPose(); }
          if (cupHook) cupHook(v, av, rec.cup, sid && logic ? logic.seatIndex(sid) : null);
          av.update(dt, t);
        });
      }
    };
    function sm01(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
    function p0y(av, fl, dt) { var y = av.root.position.y; return y + (fl - y) * Math.min(1, dt * 14); }
    return api;
  }

  var NV = { create: create, createInterp: createInterp, createTable: createTable, createPoseSender: createPoseSender, angDiff: angDiff, DEF: DEF };
  root.RoomNetView = NV;
  if (typeof module === 'object' && module.exports) module.exports = NV;
})(typeof window !== 'undefined' ? window : this);
