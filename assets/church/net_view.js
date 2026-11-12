/* net_view.js — 다른 접속자 아바타(200ms 스냅샷 보간, 가까운 80명만 그림, aoi 숨김) + 혼자 모드 배경 신자(NPC) */
(function (root) {
  'use strict';
  var T = root.THREE, Av = root.ChurchAvatar.Avatar;
  var MAX_VISIBLE = 80, DELAY = 200;
  var PI = Math.PI;

  function angDiff(a, b) { var d = (b - a) % (PI * 2); if (d > PI) d -= PI * 2; if (d < -PI) d += PI * 2; return d; }

  function create(scene) {
    var logic = null;
    var peers = new Map();       // id -> rec (숨겨진 것 포함, 가벼운 레코드)
    var occ = {};                // seatId -> peerId
    var mySeat = null;
    var pool = [];               // 재사용 아바타
    var visible = [];            // 현재 그려지는 rec 배열
    var selTimer = 99;
    var focus = { x: 0, z: 0 };
    var list = [];

    function acquire(cfg) {
      var a = pool.pop();
      if (a) { a.setConfig(cfg); a.lod = -1; } else a = new Av(cfg, {});
      scene.add(a.root);
      return a;
    }
    function release(rec) {
      if (!rec.view) return;
      scene.remove(rec.view.root);
      pool.push(rec.view);
      rec.view = null;
    }
    function mkRec(p) {
      return {
        id: p.id, cfg: p.avatar || {}, x: +p.x || 0, z: +p.z || 0, r: +p.r || 0, st: p.st || 'w', seat: p.seat || null, ms: p.ms === undefined ? -1 : p.ms,
        hidden: false, view: null, s: new Float64Array(12), n: 0, blend: 0, anim: 0, ax: 0, az: 0, speed: 0, px: 0, pz: 0, fresh: true
      };
    }
    function pushSample(rec, x, z, r, now) {
      var s = rec.s, n = rec.n;
      if (n >= 3) { s[0] = s[3]; s[1] = s[4]; s[2] = s[5]; s[3] = s[6]; s[4] = s[7]; s[5] = s[8]; s[6] = s[9]; s[7] = s[10]; s[8] = s[11]; n = 2; }
      // 레이아웃: [t,x,z,r]를 3개 보관하려면 12칸 필요 -> 평탄화
      rec.s[n * 4] = now; rec.s[n * 4 + 1] = x; rec.s[n * 4 + 2] = z; rec.s[n * 4 + 3] = r;
      rec.n = n + 1;
      rec.x = x; rec.z = z; rec.r = r;
    }
    // 위 pushSample 의 시프트 루틴을 4칸 단위로 다시 정의(정확한 버전)
    pushSample = function (rec, x, z, r, now) {
      var s = rec.s;
      if (rec.n >= 3) { for (var i = 0; i < 8; i++) s[i] = s[i + 4]; rec.n = 2; }
      var o = rec.n * 4;
      s[o] = now; s[o + 1] = x; s[o + 2] = z; s[o + 3] = r;
      rec.n++;
      rec.x = x; rec.z = z; rec.r = r;
    };

    var api = {
      setLogic: function (l) { logic = l; },
      setMySeat: function (s) { mySeat = s; },
      occ: occ,
      count: function () { return peers.size; },
      visibleCount: function () { return visible.length; },
      isTaken: function (seat) { return occ[seat] !== undefined && seat !== mySeat; },
      clear: function () {
        peers.forEach(function (rec) { release(rec); });
        peers.clear(); visible.length = 0;
        for (var k in occ) delete occ[k];
      },
      setPeers: function (arr, seats) {
        api.clear();
        (arr || []).forEach(function (p) { api.peerJoin(p, true); });
        if (seats) for (var k in seats) occ[k] = seats[k];
        selTimer = 99;
      },
      peerJoin: function (p, quiet) {
        if (!p || p.id === undefined) return;
        var rec = peers.get(p.id);
        if (rec) {
          rec.cfg = p.avatar || rec.cfg; rec.hidden = false;
          if (rec.view) rec.view.setConfig(rec.cfg);
          if (p.x !== undefined) { rec.x = +p.x; rec.z = +p.z; rec.r = +p.r || 0; rec.n = 0; pushSample(rec, rec.x, rec.z, rec.r, performance.now()); }
          if (p.st) rec.st = p.st;
        } else {
          rec = mkRec(p); peers.set(p.id, rec);
          pushSample(rec, rec.x, rec.z, rec.r, performance.now());
        }
        if (p.seat && p.seat !== rec.seat) { rec.seat = p.seat; occ[p.seat] = p.id; }
        selTimer = 99;
      },
      peerLeave: function (id, aoi) {
        var rec = peers.get(id);
        if (!rec) return;
        if (aoi) { rec.hidden = true; release(rec); var vi = visible.indexOf(rec); if (vi >= 0) visible.splice(vi, 1); return; }
        if (rec.seat && occ[rec.seat] === id) delete occ[rec.seat];
        release(rec);
        var i = visible.indexOf(rec); if (i >= 0) visible.splice(i, 1);
        peers.delete(id);
      },
      peerSnap: function (arr) {
        var now = performance.now();
        for (var i = 0; i < arr.length; i++) {
          var e = arr[i], rec = peers.get(e[0]);
          if (!rec) continue;
          if (rec.hidden) { rec.hidden = false; rec.n = 0; selTimer = 99; }
          if (e[4]) { rec.st = e[4]; }
          if (!rec.seat) pushSample(rec, +e[1], +e[2], +e[3] || 0, now);
        }
      },
      peerSeat: function (id, seat) {
        var rec = peers.get(id); if (!rec) return;
        if (rec.seat && occ[rec.seat] === id) delete occ[rec.seat];
        rec.seat = seat; occ[seat] = id; rec.st = 's';
        if (rec.view) { rec.anim = 0.7; rec.ax = rec.x; rec.az = rec.z; } else rec.anim = 0;
        if (logic) { var sp = logic.seatPos(seat); if (sp) { rec.x = sp.x; rec.z = sp.z; rec.r = sp.yaw; } }
      },
      peerStand: function (id) {
        var rec = peers.get(id); if (!rec) return;
        var sp = rec.seat && logic ? logic.standPos(rec.seat) : null;
        if (rec.seat && occ[rec.seat] === id) delete occ[rec.seat];
        rec.seat = null; rec.st = 'w'; rec.ms = -1;
        if (sp) { rec.x = sp.x; rec.z = sp.z; rec.r = sp.yaw; rec.n = 0; pushSample(rec, sp.x, sp.z, sp.yaw, performance.now()); rec.blend = 0.6; rec.px = sp.x; rec.pz = sp.z; }
      },
      peerPraying: function (id, on, ms) { var rec = peers.get(id); if (!rec) return; rec.st = on ? 'p' : 's'; rec.ms = on ? ms : -1; },
      peerEmote: function (id, e) { var rec = peers.get(id); if (rec && rec.view) rec.view.playEmote(e); },
      setFocus: function (x, z) { focus.x = x; focus.z = z; },
      select: function () {
        list.length = 0;
        peers.forEach(function (rec) {
          if (rec.hidden) return;
          var dx = rec.x - focus.x, dz = rec.z - focus.z; rec.d2 = dx * dx + dz * dz; list.push(rec);
        });
        if (list.length > MAX_VISIBLE) { list.sort(function (a, b) { return a.d2 - b.d2; }); list.length = MAX_VISIBLE; }
        var want = new Set(list);
        for (var i = visible.length - 1; i >= 0; i--) if (!want.has(visible[i])) { release(visible[i]); visible.splice(i, 1); }
        for (i = 0; i < list.length; i++) {
          var rec = list[i];
          if (!rec.view) {
            rec.view = acquire(rec.cfg);
            rec.fresh = true;
            visible.push(rec);
          }
        }
      },
      update: function (dt, t, now) {
        selTimer += dt;
        if (selTimer > 0.35) { selTimer = 0; api.select(); }
        var rt = now - DELAY;
        for (var i = 0; i < visible.length; i++) {
          var rec = visible[i], v = rec.view;
          if (!v) continue;
          v.setLod(rec.d2 > 900 ? 2 : (rec.d2 > 324 ? 1 : 0));
          var x, z, r, walk = 0, fl = 0;
          if (rec.seat && logic) {
            var sp = logic.seatPos(rec.seat);
            fl = logic.floorY(sp.x, sp.z);
            if (rec.anim > 0 && !rec.fresh) {
              rec.anim -= dt;
              var k = 1 - Math.max(0, rec.anim) / 0.7, ks = k * k * (3 - 2 * k);
              x = rec.ax + (sp.x - rec.ax) * ks; z = rec.az + (sp.z - rec.az) * ks; r = sp.yaw;
            } else { x = sp.x; z = sp.z; r = sp.yaw; }
            v.setSeated(true); v.setPray(rec.st === 'p');
            if (rec.fresh) { v.setPose(x, fl, z, r); v.snapPose(); }
          } else {
            var s = rec.s, n = rec.n;
            if (n === 0) { x = rec.x; z = rec.z; r = rec.r; }
            else if (n === 1 || rt <= s[0]) { x = s[1]; z = s[2]; r = s[3]; }
            else {
              var a = 0;
              while (a < n - 2 && rt > s[(a + 1) * 4]) a++;
              var o0 = a * 4, o1 = o0 + 4, span = s[o1] - s[o0];
              var f = span > 1 ? Math.min(1, Math.max(0, (rt - s[o0]) / span)) : 1;
              x = s[o0 + 1] + (s[o1 + 1] - s[o0 + 1]) * f; z = s[o0 + 2] + (s[o1 + 2] - s[o0 + 2]) * f;
              r = s[o0 + 3] + angDiff(s[o0 + 3], s[o1 + 3]) * f;
            }
            if (rec.blend > 0) { rec.blend -= dt; var kb = Math.min(1, dt * 9); rec.px += (x - rec.px) * kb; rec.pz += (z - rec.pz) * kb; x = rec.px; z = rec.pz; }
            var pxx = v.root.position.x, pzz = v.root.position.z;
            var sp2 = Math.sqrt((x - pxx) * (x - pxx) + (z - pzz) * (z - pzz)) / Math.max(dt, 1e-3);
            if (rec.fresh) sp2 = 0;
            rec.speed += (sp2 - rec.speed) * Math.min(1, dt * 8);
            walk = rec.speed > 0.35 ? Math.min(1, rec.speed / 3.2 + 0.2) : 0;
            fl = logic ? logic.floorY(x, z) : 0;
            v.setSeated(false); v.setPray(false);
            if (walk > 0) r = v.root.rotation.y + angDiff(v.root.rotation.y, r) * Math.min(1, dt * 12);
          }
          v.setWalk(walk);
          v.setPose(x, rec.seat ? fl : (v.root.position.y + (fl - v.root.position.y) * Math.min(1, dt * 14)), z, r);
          if (rec.fresh) { rec.fresh = false; if (!rec.seat) { v.root.position.y = fl; v.snapPose(); } }
          v.update(dt, t);
        }
      }
    };
    return api;
  }

  // ---- 혼자 모드: 배경 신자(NPC) ----
  function createCrowd(scene) {
    var logic = null, on = false, sit = [], walkers = [], taken = {};
    var rnd = root.ChurchGeo.rng(Date.now() & 0xffff);
    function rcfg() { return { skin: (rnd() * 4) | 0, style: (rnd() * 4) | 0, hair: (rnd() * 10) | 0, outfit: (rnd() * 12) | 0, name: (rnd() * 40) | 0 }; }
    var api = {
      setLogic: function (l) { logic = l; if (on) api.set(true, true); },
      isTaken: function (id) { return taken[id] !== undefined; },
      set: function (flag, force) {
        if (flag === on && !force) return;
        // 정리
        sit.concat(walkers).forEach(function (n) { scene.remove(n.av.root); });
        sit = []; walkers = []; taken = {};
        on = flag;
        if (!on || !logic) return;
        var ids = logic.seatIds.slice(), count = Math.min(ids.length, 6 + ((rnd() * 5) | 0));
        for (var i = 0; i < count && ids.length; i++) {
          var k = (rnd() * ids.length) | 0, id = ids.splice(k, 1)[0];
          var sp = logic.seatPos(id), av = new Av(rcfg(), {});
          av.setSeated(true); av.setPray(true); av.nod = true; av.nodPh = rnd() * 6;
          av.setPose(sp.x, logic.floorY(sp.x, sp.z), sp.z, sp.yaw); av.snapPose();
          scene.add(av.root); sit.push({ av: av, id: id }); taken[id] = 1;
        }
        var sp0 = logic.spawn;
        for (i = 0; i < 2; i++) {
          var wv = new Av(rcfg(), {});
          var n = { av: wv, x: sp0.x + (i ? -1.4 : 1.4), z: sp0.z - 4 - i * 6, tx: 0, tz: 0, stuck: 0, lx: 0, lz: 0, pause: 0 };
          n.lx = n.x; n.lz = n.z;
          wv.setPose(n.x, 0, n.z, 0); scene.add(wv.root); walkers.push(n);
          pick(n);
        }
      },
      update: function (dt, t) {
        if (!on) return;
        for (var i = 0; i < sit.length; i++) sit[i].av.update(dt, t);
        for (i = 0; i < walkers.length; i++) {
          var n = walkers[i];
          if (n.pause > 0) { n.pause -= dt; n.av.setWalk(0); n.av.update(dt, t); continue; }
          var dx = n.tx - n.x, dz = n.tz - n.z, d = Math.sqrt(dx * dx + dz * dz);
          if (d < 0.4) { n.pause = 1.5 + rnd() * 3; pick(n); continue; }
          var sp = 0.8 * dt, p = { x: n.x, z: n.z };
          logic.moveCircle(p, dx / d * sp, dz / d * sp);
          n.x = p.x; n.z = p.z;
          n.stuck += dt;
          if (n.stuck > 1.2) { if (Math.hypot(n.x - n.lx, n.z - n.lz) < 0.3) { pick(n); } n.lx = n.x; n.lz = n.z; n.stuck = 0; }
          var yaw = Math.atan2(-dx, -dz), cur = n.av.root.rotation.y;
          var df = (yaw - cur) % (PI * 2); if (df > PI) df -= PI * 2; if (df < -PI) df += PI * 2;
          n.av.setWalk(1);
          n.av.setPose(n.x, logic.floorY(n.x, n.z), n.z, cur + df * Math.min(1, dt * 4));
          n.av.update(dt, t);
        }
      }
    };
    function pick(n) {
      var sp = logic.spawn, tries = 0;
      do {
        n.tx = sp.x + (rnd() - 0.5) * 8; n.tz = sp.z - rnd() * 14;
        var p = { x: n.tx, z: n.tz }, hit = logic.moveCircle(p, 0, 0);
        tries++;
        if (!hit) break;
      } while (tries < 20);
    }
    return api;
  }

  root.ChurchNetView = { create: create, createCrowd: createCrowd };
})(typeof window !== 'undefined' ? window : this);
