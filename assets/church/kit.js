/* kit.js — 성당 빌더 도구 모음. ChurchKit.createContext(opts) -> ctx (docs/church/BUILDER_API.md 참고) */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, Geo = G.Geo;
  var PI = Math.PI;

  var JEWEL = [0xe0556b, 0x4f86e0, 0xf2c94c, 0x5cb97f, 0xf28d4a, 0x9b6bd1, 0x4cc2c2, 0xf08fb0, 0x3b5fc0, 0xd94a4a];

  function num(v, d) { return v === undefined ? d : v; }

  // 프로파일 높이 함수: 반폭 a, 상승 rise
  function profileFn(type, a, rise) {
    if (type === 'pointed') {
      var R = (a * a + rise * rise) / (2 * a), cx = R - a;
      return function (u) { var uu = Math.abs(u); var d = uu + cx; var v = R * R - d * d; return v > 0 ? Math.sqrt(v) : 0; };
    }
    if (type === 'segmental') {
      var Rs = (a * a + rise * rise) / (2 * rise);
      return function (u) { var v = Rs * Rs - u * u; return v > 0 ? Math.sqrt(v) - (Rs - rise) : 0; };
    }
    return function (u) { var q = 1 - (u * u) / (a * a); return q > 0 ? rise * Math.sqrt(q) : 0; };
  }
  // 프로파일 점열(왼쪽 스프링라인 -> 오른쪽), n 분할
  function profilePts(type, a, rise, n) {
    var f = profileFn(type, a, rise), out = [];
    for (var i = 0; i <= n; i++) {
      var u = -a + (2 * a * i) / n;
      out.push([u, f(u)]);
    }
    return out;
  }

  function createContext(opts) {
    var layout = opts.layout;
    var scale = (layout.scalePercent || 100) / 100;
    var low = opts.quality === 'low';
    function Q(n) { return low ? Math.max(4, Math.round(n * 0.6)) : n; }
    var rand = G.rng(1234);

    var ctx = {
      THREE: T, layout: layout, scale: scale, S: function (m) { return m * scale; }, quality: opts.quality || 'high',
      root: new T.Group(), rng: G.rng,
      color: function (c) { return G.toColor(c); },
      mix: function (a, b, t) { return G.toColor(a).clone().lerp(G.toColor(b), t).getHex(); },
      shade: function (c, k) { var col = G.toColor(c).clone(); col.r = Math.min(1, col.r * k); col.g = Math.min(1, col.g * k); col.b = Math.min(1, col.b * k); return col.getHex(); },
      add: function (o) { ctx.root.add(o); return o; },
      mesh: function (g, m) { var me = new T.Mesh(g, m); ctx.root.add(me); stats.meshes++; return me; }
    };
    var stats = { meshes: 0 };
    ctx.stats = stats;

    var solid = ctx.solid = new G.Batch(11), glass = ctx.glass = new G.Batch(12), glow = ctx.glow = new G.Batch(13);
    var S_ = ctx._ = {
      colliders: [], zones: [], lights: [], glows: [], flames: [], beams: [], hourHooks: [], updateHooks: [],
      cameraBounds: null, sky: { outside: false }, texMeshes: [], thumb: null, candleStands: [], lamps: []
    };

    // ---- 재질 ----
    var mats = ctx.mats = {
      solid: new T.MeshLambertMaterial({ vertexColors: true }),
      glass: new T.MeshBasicMaterial({ vertexColors: true }),
      glow: new T.MeshBasicMaterial({ vertexColors: true }),
      lambert: function (o) {
        o = o || {};
        var m = new T.MeshLambertMaterial({ color: o.color === undefined ? 0xffffff : o.color, map: o.tex || null, side: o.side === undefined ? T.FrontSide : o.side, transparent: o.opacity !== undefined && o.opacity < 1, opacity: num(o.opacity, 1) });
        return m;
      },
      basic: function (o) {
        o = o || {};
        return new T.MeshBasicMaterial({ color: o.color === undefined ? 0xffffff : o.color, map: o.tex || null, side: o.side === undefined ? T.FrontSide : o.side, transparent: !!o.transparent, opacity: num(o.opacity, 1) });
      }
    };

    // ---- 질감 ----
    var tex = ctx.tex = root.ChurchKitTex.make(rand);
    // 외부(CC0/MIT) 질감: 즉시 절차 생성 대체 질감을 돌려주고, 로드되면 그림을 바꿔 끼운다. 실패해도 장면은 그대로.
    var remote = {};
    ctx.loadTexture = function (url, fallbackFactory) {
      if (remote[url]) return remote[url];
      var t = fallbackFactory ? fallbackFactory() : tex.plaster({});
      remote[url] = t;
      try {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () { t.image = img; t.needsUpdate = true; };
        img.onerror = function () { /* 대체 질감 유지 */ };
        img.src = url;
      } catch (e) { /* ignore */ }
      return t;
    };
    function cloneTex(t, rx, ry) {
      var c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = T.RepeatWrapping; c.repeat.set(rx, ry); c.anisotropy = 4; return c;
    }

    // ---- 개별 면 ----
    function surfaceMat(o, w, h) {
      var tile = o.tile === undefined ? 2 : o.tile;
      var tw = Array.isArray(tile) ? tile[0] : tile, th = Array.isArray(tile) ? tile[1] : tile;
      if (o.mat) return o.mat;
      if (o.tex) return new T.MeshLambertMaterial({ map: cloneTex(o.tex, w / tw, h / th), color: o.color === undefined ? 0xffffff : o.color, side: o.side === undefined ? T.FrontSide : o.side });
      return new T.MeshLambertMaterial({ color: o.color === undefined ? 0xcccccc : o.color, side: o.side === undefined ? T.FrontSide : o.side });
    }
    ctx.plane = function (o) {
      var m = new T.Mesh(new T.PlaneGeometry(o.w, o.h), surfaceMat(o, o.w, o.h));
      m.position.set(o.x || 0, o.y || 0, o.z || 0);
      m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
      ctx.root.add(m); stats.meshes++;
      return m;
    };
    ctx.floor = function (o) {
      var w = o.x1 - o.x0, d = o.z1 - o.z0, y = num(o.y, 0);
      var m = ctx.plane({ x: (o.x0 + o.x1) / 2, y: y, z: (o.z0 + o.z1) / 2, rx: -PI / 2, w: w, h: d, tex: o.tex, color: o.color, tile: o.tile });
      if (o.zone && y > 0) ctx.floorZone({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y: y });
      return m;
    };
    ctx.ceilingFlat = function (o) {
      return ctx.plane({ x: (o.x0 + o.x1) / 2, y: o.y, z: (o.z0 + o.z1) / 2, rx: PI / 2, w: o.x1 - o.x0, h: o.z1 - o.z0, tex: o.tex, color: o.color, tile: o.tile });
    };
    ctx.wallFace = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), n = o.facing || [0, 1];
      return ctx.plane({ x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2, z: (o.z0 + o.z1) / 2, ry: Math.atan2(n[0], n[1]), w: len, h: o.y1 - o.y0, tex: o.tex, color: o.color, tile: o.tile });
    };

    // ---- 충돌/바닥/카메라/조명 등록 ----
    ctx.addCollider = function (c) { S_.colliders.push(c); return c; };
    ctx.floorZone = function (z) { S_.zones.push(z); return z; };
    ctx.setCameraBounds = function (b) { S_.cameraBounds = b; };
    ctx.setSky = function (o) { S_.sky = o || {}; };
    ctx.onHour = function (fn) { S_.hourHooks.push(fn); };
    ctx.onUpdate = function (fn) { S_.updateHooks.push(fn); };
    ctx.addLight = function (o) {
      if (S_.lights.length >= 1) { if (root.console) console.warn('[church] only one builder point light allowed; ignored'); return null; }
      S_.lights.push(o); return o;
    };
    var flameTex = null, glowTex = null;
    function getFlameTex() {
      if (flameTex) return flameTex;
      flameTex = G.canvasTexture(64, 96, function (g, w, h) {
        var gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.7, w * 0.5);
        gr.addColorStop(0, 'rgba(255,240,170,0.55)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.beginPath(); g.moveTo(w / 2, h * 0.08);
        g.bezierCurveTo(w * 0.85, h * 0.45, w * 0.78, h * 0.78, w / 2, h * 0.8);
        g.bezierCurveTo(w * 0.22, h * 0.78, w * 0.15, h * 0.45, w / 2, h * 0.08);
        var fg = g.createLinearGradient(0, h * 0.1, 0, h * 0.8);
        fg.addColorStop(0, '#fff3b0'); fg.addColorStop(0.6, '#ffb338'); fg.addColorStop(1, '#ff7a1a');
        g.fillStyle = fg; g.fill();
        g.beginPath(); g.ellipse(w / 2, h * 0.64, w * 0.1, h * 0.12, 0, 0, 6.28); g.fillStyle = '#fffbe0'; g.fill();
      }, false);
      return flameTex;
    }
    function getGlowTex() {
      if (glowTex) return glowTex;
      glowTex = G.canvasTexture(64, 64, function (g, w, h) {
        var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, false);
      return glowTex;
    }
    ctx._getFlameTex = getFlameTex; ctx._getGlowTex = getGlowTex;
    ctx.addGlow = function (o) {
      var sp = new T.Sprite(new T.SpriteMaterial({ map: getGlowTex(), color: o.color === undefined ? 0xffc977 : o.color, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.6 }));
      var s = o.size || 1.5;
      sp.position.set(o.x, o.y, o.z); sp.scale.set(s, s, 1);
      ctx.root.add(sp);
      S_.glows.push({ sp: sp, size: s, pulse: o.pulse || 0, phase: rand() * 6.28, base: 0.6, kind: o.kind || 'lamp' });
      return sp;
    };
    ctx.addFlame = function (o) {
      var sp = new T.Sprite(new T.SpriteMaterial({ map: getFlameTex(), blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
      var s = o.scale || 1;
      sp.position.set(o.x, o.y, o.z); sp.scale.set(0.13 * s, 0.2 * s, 1);
      ctx.root.add(sp);
      S_.flames.push({ sp: sp, sx: 0.13 * s, sy: 0.2 * s, phase: rand() * 6.28 });
      return sp;
    };
    ctx.addWindowBeam = function (o) { S_.beams.push(o); };

    // ---- 기본 도형 ----
    function fl(o, d) { return o.flat === undefined ? d : o.flat; }
    ctx.box = function (o) {
      solid.add(Geo.box(), o.color, { x: o.x, y: o.y, z: o.z, ry: o.ry, rx: o.rx, rz: o.rz, sx: o.w, sy: o.h, sz: o.d, flat: fl(o, true), vary: o.vary, c2: o.c2 });
    };
    ctx.boxAABB = function (o) {
      ctx.box({ x: (o.x0 + o.x1) / 2, y: o.y0, z: (o.z0 + o.z1) / 2, w: o.x1 - o.x0, h: o.y1 - o.y0, d: o.z1 - o.z0, color: o.color, vary: o.vary, flat: o.flat });
    };
    ctx.cyl = function (o) {
      var r = o.r === undefined ? 0.5 : o.r;
      var rt = o.rTop === undefined ? r : o.rTop;
      solid.add(Geo.cyl(o.seg || 10, r > 0 ? rt / r : 0), o.color, { x: o.x, y: o.y, z: o.z, ry: o.ry, sx: r, sy: o.h, sz: r, flat: fl(o, true), vary: o.vary, c2: o.c2 });
    };
    ctx.cone = function (o) { ctx.cyl({ x: o.x, y: o.y, z: o.z, r: o.r, rTop: 0, h: o.h, seg: o.seg || 8, color: o.color, flat: o.flat, vary: o.vary, c2: o.c2 }); };
    ctx.sphere = function (o) {
      var r = o.r === undefined ? 0.5 : o.r;
      solid.add(Geo.sph(o.w || 12, o.h || 8), o.color, { x: o.x, y: o.y, z: o.z, ry: o.ry, sx: o.sx !== undefined ? o.sx : r, sy: o.sy !== undefined ? o.sy : r, sz: o.sz !== undefined ? o.sz : r, flat: fl(o, false), vary: o.vary, c2: o.c2 });
    };
    ctx.ico = function (o) {
      var r = o.r === undefined ? 0.5 : o.r;
      solid.add(Geo.ico(o.detail || 0), o.color, { x: o.x, y: o.y, z: o.z, ry: o.ry, sx: o.sx !== undefined ? o.sx : r, sy: o.sy !== undefined ? o.sy : r, sz: o.sz !== undefined ? o.sz : r, flat: fl(o, true), vary: o.vary, c2: o.c2 });
    };
    // 임의 방향 보(p0->p1)
    ctx.beam3 = function (p0, p1, t, d, color, batch) { (batch || solid).addBeam(p0, p1, t, d, color, { vary: 0.03 }); };

    ctx.wall = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), t = num(o.t, 0.5);
      var cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, ry = Math.atan2(-dz, dx);
      if (o.tex) {
        var geo = new T.BoxGeometry(len, o.h, t).translate(0, o.h / 2, 0);
        var tile = o.tile || 2, tw = Array.isArray(tile) ? tile[0] : tile, th = Array.isArray(tile) ? tile[1] : tile;
        var m = new T.Mesh(geo, new T.MeshLambertMaterial({ map: cloneTex(o.tex, len / tw, o.h / th), color: o.color === undefined ? 0xffffff : o.color }));
        m.position.set(cx, num(o.y, 0), cz); m.rotation.y = ry; ctx.root.add(m); stats.meshes++;
      } else {
        solid.add(Geo.box(), o.color === undefined ? 0xf2e6cf : o.color, { x: cx, y: num(o.y, 0), z: cz, ry: ry, sx: len, sy: o.h, sz: t, flat: true, vary: o.vary });
      }
      if (o.collide !== false) {
        var ax = Math.abs(dx), az = Math.abs(dz);
        if (az < 1e-6) ctx.addCollider({ x0: Math.min(o.x0, o.x1), x1: Math.max(o.x0, o.x1), z0: cz - t / 2, z1: cz + t / 2 });
        else if (ax < 1e-6) ctx.addCollider({ x0: cx - t / 2, x1: cx + t / 2, z0: Math.min(o.z0, o.z1), z1: Math.max(o.z0, o.z1) });
        else {
          var n = Math.ceil(len / 1.0);
          for (var i = 0; i <= n; i++) ctx.addCollider({ x: o.x0 + dx * i / n, z: o.z0 + dz * i / n, r: t / 2 + 0.1 });
        }
      }
    };

    // ---- 기둥 ----
    function capital(o, x, y, z, r, color) {
      var type = o.capital === undefined ? 'doric' : o.capital;
      var cc = o.capColor === undefined ? color : o.capColor;
      if (type === 'none') return 0;
      var ch = r * 0.9;
      if (type === 'block') { ctx.box({ x: x, y: y, z: z, w: r * 2.6, h: r * 0.9, d: r * 2.6, color: cc }); return r * 0.9; }
      if (type === 'doric') {
        ctx.cyl({ x: x, y: y, z: z, r: r * 1.0, rTop: r * 1.35, h: r * 0.5, seg: 12, color: cc });
        ctx.box({ x: x, y: y + r * 0.5, z: z, w: r * 2.9, h: r * 0.35, d: r * 2.9, color: cc });
        return r * 0.85;
      }
      if (type === 'ionic') {
        ctx.cyl({ x: x, y: y, z: z, r: r, rTop: r * 1.2, h: r * 0.35, seg: 12, color: cc });
        ctx.box({ x: x, y: y + r * 0.35, z: z, w: r * 3.2, h: r * 0.4, d: r * 2.2, color: cc, ry: o.ry });
        var ca = Math.cos(o.ry || 0), sa = Math.sin(o.ry || 0);
        [-1, 1].forEach(function (sg) {
          ctx.cyl({ x: x + sg * r * 1.45 * ca, y: y + r * 0.1, z: z - sg * r * 1.45 * sa, r: r * 0.55, h: r * 0.65, seg: 10, color: ctx.shade(cc, 0.92), ry: o.ry });
          ctx.cyl({ x: x + sg * r * 1.45 * ca, y: y + r * 0.2, z: z - sg * r * 1.45 * sa, r: r * 0.25, h: r * 0.46, seg: 8, color: ctx.shade(cc, 0.75), ry: o.ry });
        });
        ctx.box({ x: x, y: y + r * 0.75, z: z, w: r * 3.0, h: r * 0.18, d: r * 2.6, color: cc, ry: o.ry });
        return r * 0.93;
      }
      // corinthian / composite
      ctx.cyl({ x: x, y: y, z: z, r: r * 1.0, rTop: r * 1.45, h: r * 1.2, seg: 12, color: cc });
      for (var k = 0; k < 8; k++) {
        var a = k * PI / 4;
        ctx.ico({ x: x + Math.cos(a) * r * 1.1, y: y + r * 0.55, z: z + Math.sin(a) * r * 1.1, sx: r * 0.32, sy: r * 0.55, sz: r * 0.32, color: ctx.shade(cc, 0.9), detail: 0 });
      }
      ctx.box({ x: x, y: y + r * 1.2, z: z, w: r * 3.1, h: r * 0.3, d: r * 3.1, color: cc });
      return r * 1.5 * (ch / ch);
    }
    ctx.column = function (o) {
      var r = num(o.r, 0.4), y = num(o.y, 0), h = o.h, color = o.color === undefined ? 0xe9dcc3 : o.color;
      var style = o.style || 'round', x = o.x, z = o.z;
      var baseH = 0;
      if (o.base !== false) {
        var bh = r * 0.55;
        ctx.box({ x: x, y: y, z: z, w: r * 2.5, h: bh * 0.6, d: r * 2.5, color: o.capColor === undefined ? color : o.capColor });
        ctx.cyl({ x: x, y: y + bh * 0.6, z: z, r: r * 1.25, rTop: r * 1.05, h: bh * 0.4, seg: 12, color: color });
        baseH = bh;
      }
      var capH = (o.capital === 'none' || style === 'engaged' && o.capital === undefined) ? 0 : (function () {
        var t = o.capital === undefined ? 'doric' : o.capital;
        return t === 'corinthian' || t === 'composite' ? r * 1.5 : (t === 'ionic' ? r * 0.93 : (t === 'block' ? r * 0.9 : r * 0.85));
      })();
      var shaftH = h - baseH - capH;
      var sy = y + baseH;
      if (o.tex) {
        var geo = new T.CylinderGeometry(r * 0.92, r, shaftH, 16, 1).translate(0, shaftH / 2, 0);
        var mm = new T.Mesh(geo, new T.MeshLambertMaterial({ map: cloneTex(o.tex, 4, shaftH / 2), color: o.color === undefined ? 0xffffff : o.color }));
        mm.position.set(x, sy, z); ctx.root.add(mm); stats.meshes++;
      } else if (style === 'square') {
        ctx.box({ x: x, y: sy, z: z, w: r * 2, h: shaftH, d: r * 2, color: color, ry: o.ry });
      } else if (style === 'pier') {
        ctx.box({ x: x, y: sy, z: z, w: r * 1.5, h: shaftH, d: r * 1.5, color: color, ry: o.ry });
        for (var k = 0; k < 4; k++) {
          var a = k * PI / 2 + (o.ry || 0);
          ctx.cyl({ x: x + Math.cos(a) * r * 0.85, y: sy, z: z + Math.sin(a) * r * 0.85, r: r * 0.42, h: shaftH, seg: 8, color: ctx.shade(color, 0.96) });
          var a2 = a + PI / 4;
          ctx.cyl({ x: x + Math.cos(a2) * r * 0.95, y: sy, z: z + Math.sin(a2) * r * 0.95, r: r * 0.22, h: shaftH, seg: 6, color: ctx.shade(color, 0.9) });
        }
      } else if (style === 'twisted') {
        ctx.cyl({ x: x, y: sy, z: z, r: r * 0.62, h: shaftH, seg: 10, color: ctx.shade(color, 0.85) });
        var n = Q(26);
        for (var s = 0; s < 3; s++) for (var i = 0; i < n; i++) {
          var ang = i * 0.55 + s * 2.094;
          ctx.cyl({ x: x + Math.cos(ang) * r * 0.55, y: sy + (shaftH * i) / n, z: z + Math.sin(ang) * r * 0.55, r: r * 0.34, h: (shaftH / n) * 1.5, seg: 6, color: color, vary: 0.06 });
        }
      } else if (style === 'fluted') {
        ctx.cyl({ x: x, y: sy, z: z, r: r, rTop: r * 0.9, h: shaftH, seg: 16, color: color, flat: true });
      } else {
        ctx.cyl({ x: x, y: sy, z: z, r: r, rTop: r * 0.9, h: shaftH, seg: 14, color: color, flat: false });
      }
      if (capH > 0) capital(o, x, sy + shaftH, z, r, color);
      if (o.collide !== false) ctx.addCollider({ x: x, z: z, r: r * 1.15 });
    };

    // ---- 아치 / 아케이드 ----
    function archPoints(type, span, rise, n) {
      if (type === 'trefoil') type = 'pointed';
      var a = span / 2;
      if (type === 'horseshoe') {
        var pts = [], R = a * 1.12;
        for (var i = 0; i <= n; i++) { var ang = -0.35 + (PI + 0.7) * (1 - i / n); pts.push([Math.cos(ang) * R, Math.sin(ang) * R + (num(rise, a) - R) * 0 ]); }
        return pts;
      }
      var rs = rise === undefined ? (type === 'pointed' ? a * 1.45 : a) : rise;
      if (type === 'segmental' && rise === undefined) rs = a * 0.45;
      return profilePts(type === 'round' ? 'round' : type, a, rs, n);
    }
    ctx.arch = function (o) {
      var n = Q(o.seg || 14), t = num(o.t, 0.4), depth = num(o.depth, 0.5);
      var pts = archPoints(o.type || 'round', o.span, o.rise, n);
      var color = o.color === undefined ? 0xe3d6bb : o.color, axis = o.axis || 'x';
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i], p1 = pts[i + 1];
        // 중심선을 바깥쪽으로 t/2 만큼 밀어낸다(안쪽 면이 개구부 경계)
        var du = p1[0] - p0[0], dv = p1[1] - p0[1], l = Math.sqrt(du * du + dv * dv) || 1;
        var nu = -dv / l, nv = du / l; // 위쪽 법선
        var mu = (p0[0] + p1[0]) / 2 + nu * t / 2, mv = (p0[1] + p1[1]) / 2 + nv * t / 2, ang = Math.atan2(dv, du);
        if (axis === 'x') solid.add(Geo.boxC(), color, { x: o.x + mu, y: o.y + mv, z: o.z, rz: ang, sx: l * 1.06, sy: t, sz: depth, flat: true });
        else solid.add(Geo.boxC(), color, { x: o.x, y: o.y + mv, z: o.z + mu, rx: -ang, sx: depth, sy: t, sz: l * 1.06, flat: true });
      }
    };
    ctx.arcade = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), ux = dx / len, uz = dz / len;
      var n = Math.max(1, Math.round(len / o.spacing)), sp = len / n, pr = num(o.pierR, 0.45), h = o.h, y = num(o.y, 0);
      var axis = Math.abs(dx) > Math.abs(dz) ? 'x' : 'z';
      for (var i = 0; i <= n; i++) {
        ctx.column({ x: o.x0 + ux * sp * i, z: o.z0 + uz * sp * i, y: y, h: h, r: pr, style: o.style || 'round', capital: o.capital, base: o.base, color: o.color, capColor: o.capColor, collide: o.collide });
      }
      for (i = 0; i < n; i++) {
        var cx = o.x0 + ux * sp * (i + 0.5), cz = o.z0 + uz * sp * (i + 0.5);
        ctx.arch({ x: cx, z: cz, y: y + h, span: sp - pr * 2, rise: o.rise, axis: axis, type: o.type || 'round', color: o.archColor || o.color, depth: num(o.depth, pr * 1.6), t: num(o.archT, 0.35) });
      }
      if (o.topY) {
        var wallBot = y + h + (o.rise !== undefined ? o.rise : (o.type === 'pointed' ? (sp - pr * 2) * 0.72 : (sp - pr * 2) / 2)) * 0.85;
        if (o.topY > wallBot) ctx.wall({ x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1, y: wallBot, h: o.topY - wallBot, t: num(o.wallT, pr * 1.6), color: o.wallColor === undefined ? o.color : o.wallColor, collide: false });
      }
    };

    // ---- 궁륭 ----
    ctx.vault = function (o) {
      var type = o.type || 'barrel', color = o.color === undefined ? 0xf4ead6 : o.color, y = o.y, rise = o.rise;
      var ribColor = o.ribColor === undefined ? ctx.shade(color, 0.7) : o.ribColor;
      var cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
      var hint = [cx, y - 0.5, cz];
      var cTop = G.toColor(color), cLow = cTop.clone().multiplyScalar(0.92);
      if (type === 'flat') {
        solid.addQuad([o.x0, y, o.z0], [o.x1, y, o.z0], [o.x1, y, o.z1], [o.x0, y, o.z1], color, [cx, y - 1, cz]);
        return;
      }
      if (type === 'barrel') {
        var axis = o.axis || 'z', prof = o.profile || 'round';
        var a = axis === 'z' ? (o.x1 - o.x0) / 2 : (o.z1 - o.z0) / 2;
        var n = Q(o.seg || 20);
        var pts = profilePts(prof, a, rise, n);
        var zA = axis === 'z' ? o.z0 : o.x0, zB = axis === 'z' ? o.z1 : o.x1;
        var segs = o.tex ? 1 : 1;
        for (var i = 0; i < n; i++) {
          var p0 = pts[i], p1 = pts[i + 1];
          var c0 = cLow.clone().lerp(cTop, Math.min(1, p0[1] / rise)), c1 = cLow.clone().lerp(cTop, Math.min(1, p1[1] / rise));
          var A, B, C, D;
          if (axis === 'z') {
            A = [cx + p0[0], y + p0[1], zA]; B = [cx + p1[0], y + p1[1], zA]; C = [cx + p1[0], y + p1[1], zB]; D = [cx + p0[0], y + p0[1], zB];
          } else {
            A = [zA, y + p0[1], cz + p0[0]]; B = [zA, y + p1[1], cz + p1[0]]; C = [zB, y + p1[1], cz + p1[0]]; D = [zB, y + p0[1], cz + p0[0]];
          }
          solid.addTris([].concat(A, B, C, A, C, D), [c0, c1, c1, c0, c1, c0], hint);
        }
        if (o.ribs) {
          var every = o.ribs.every || 5, rt = num(o.ribs.t, 0.35), rd = num(o.ribs.d, 0.5);
          var span = zB - zA, cnt = Math.max(1, Math.round(span / every));
          for (var r = 0; r <= cnt; r++) {
            var zz = zA + (span * r) / cnt;
            ctx.vaultRib({ axis: axis, center: axis === 'z' ? cx : cz, pos: zz, y: y, a: a, rise: rise, profile: prof, t: rt, d: rd, color: ribColor });
          }
        }
        return;
      }
      // groin / ribbed / sail: 칸(bays) 반복
      var bays = o.bays || [1, 1], nx = bays[0], nz = bays[1];
      var bw = (o.x1 - o.x0) / nx, bd = (o.z1 - o.z0) / nz;
      var res = Q(type === 'sail' ? 8 : 10);
      var prof2 = o.pointed || o.profile === 'pointed' ? 'pointed' : 'round';
      var ax = bw / 2, az = bd / 2;
      var fu = profileFn(prof2, ax, rise), fv = profileFn(prof2, az, rise);
      var sailK = rise / (Math.SQRT2 * Math.min(ax, az));
      function H(u, v) {
        if (type === 'sail') { var q = 2 * Math.min(ax, az) * Math.min(ax, az) - 0; var uu = u / ax * Math.min(ax, az), vv = v / az * Math.min(ax, az); var m = 2 * Math.pow(Math.min(ax, az), 2) - uu * uu - vv * vv; return (m > 0 ? Math.sqrt(m) : 0) * sailK; }
        return Math.min(fu(u), fv(v));
      }
      for (var bx = 0; bx < nx; bx++) for (var bz = 0; bz < nz; bz++) {
        var ox = o.x0 + bw * (bx + 0.5), oz = o.z0 + bd * (bz + 0.5);
        for (var i2 = 0; i2 < res; i2++) for (var j2 = 0; j2 < res; j2++) {
          var u0 = -ax + 2 * ax * i2 / res, u1 = -ax + 2 * ax * (i2 + 1) / res, v0 = -az + 2 * az * j2 / res, v1 = -az + 2 * az * (j2 + 1) / res;
          var h00 = H(u0, v0), h10 = H(u1, v0), h11 = H(u1, v1), h01 = H(u0, v1);
          var ck = cLow.clone().lerp(cTop, Math.min(1, (h00 + h11) / (2 * rise)));
          solid.addQuad([ox + u0, y + h00, oz + v0], [ox + u1, y + h10, oz + v0], [ox + u1, y + h11, oz + v1], [ox + u0, y + h01, oz + v1], ck, [ox, y - 1, oz]);
        }
        if (type === 'ribbed') {
          var rt2 = num(o.ribT, 0.28), rn = Q(12);
          for (var k2 = 0; k2 < rn; k2++) {
            var ua = -ax + 2 * ax * k2 / rn, ub = -ax + 2 * ax * (k2 + 1) / rn;
            var va = -az + 2 * az * k2 / rn, vb = -az + 2 * az * (k2 + 1) / rn;
            var d1a = [ox + ua, y + H(ua, va) - 0.05, oz + va], d1b = [ox + ub, y + H(ub, vb) - 0.05, oz + vb];
            var d2a = [ox + ua, y + H(ua, -va) - 0.05, oz - va], d2b = [ox + ub, y + H(ub, -vb) - 0.05, oz - vb];
            solid.addBeam(d1a, d1b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
            solid.addBeam(d2a, d2b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
            // 횡단 아치(칸 경계)
            if (o.crossRibs !== false) {
              var e1a = [ox + ua, y + fu(ua) - 0.04, oz - az], e1b = [ox + ub, y + fu(ub) - 0.04, oz - az];
              solid.addBeam(e1a, e1b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
              if (bz === nz - 1) { var e2a = [ox + ua, y + fu(ua) - 0.04, oz + az], e2b = [ox + ub, y + fu(ub) - 0.04, oz + az]; solid.addBeam(e2a, e2b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 }); }
              var f1a = [ox - ax, y + fv(va) - 0.04, oz + va], f1b = [ox - ax, y + fv(vb) - 0.04, oz + vb];
              solid.addBeam(f1a, f1b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
              if (bx === nx - 1) { var f2a = [ox + ax, y + fv(va) - 0.04, oz + va], f2b = [ox + ax, y + fv(vb) - 0.04, oz + vb]; solid.addBeam(f2a, f2b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 }); }
            }
          }
          ctx.sphere({ x: ox, y: y + H(0, 0) - 0.15, z: oz, r: 0.28, color: o.bossColor === undefined ? 0xd9b45a : o.bossColor, flat: true, w: 8, h: 6 });
        }
      }
    };
    // 횡단 늑골(프로파일 링)
    ctx.vaultRib = function (o) {
      var n = Q(16), pts = profilePts(o.profile || 'round', o.a - 0.15, o.rise - 0.15, n);
      for (var i = 0; i < n; i++) {
        var p0 = pts[i], p1 = pts[i + 1];
        var A, B;
        if (o.axis === 'z') { A = [o.center + p0[0], o.y + p0[1] - 0.05, o.pos]; B = [o.center + p1[0], o.y + p1[1] - 0.05, o.pos]; }
        else { A = [o.pos, o.y + p0[1] - 0.05, o.center + p0[0]]; B = [o.pos, o.y + p1[1] - 0.05, o.center + p1[0]]; }
        solid.addBeam(A, B, o.t, o.d, o.color, { vary: 0.03 });
      }
    };

    // ---- 돔 / 반돔 ----
    function windowPolys(cx, y, cz, nx, nz, w, h, top, pattern, colors, seed) { /* placeholder replaced below */ }
    ctx.dome = function (o) {
      var seg = Q(o.seg || 20), rings = Q(o.rings || 7), r = o.r, rise = o.rise, y = o.y, cx = o.x, cz = o.z;
      var color = o.color === undefined ? 0xf3ead8 : o.color, bands = o.bands;
      var topY = y;
      if (o.drum) {
        var D = o.drum, dh = D.h, wN = D.windows || 8;
        var dcol = D.color === undefined ? color : D.color;
        for (var s = 0; s < seg; s++) {
          var a0 = s / seg * PI * 2, a1 = (s + 1) / seg * PI * 2;
          solid.addQuad([cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [cx + Math.cos(a1) * r, y + dh, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y + dh, cz + Math.sin(a0) * r], dcol, [cx, y + dh / 2, cz]);
        }
        for (var wI = 0; wI < wN; wI++) {
          var ang = (wI + 0.5) / wN * PI * 2;
          var nxw = -Math.cos(ang), nzw = -Math.sin(ang);
          ctx.window({ x: cx + Math.cos(ang) * (r - 0.02), z: cz + Math.sin(ang) * (r - 0.02), y: y + dh * 0.12, face: [nxw, nzw], w: num(D.w, Math.min(2.2, r * PI * 2 / wN * 0.5)), h: dh * 0.6, top: D.top || 'round', colors: D.colors, seed: wI + 5, beam: D.beam !== false, pattern: D.pattern || 'lancet', beamReach: r * 0.9 });
        }
        topY = y + dh;
      }
      for (var i = 0; i < rings; i++) {
        var p0 = i / rings * PI / 2, p1 = (i + 1) / rings * PI / 2;
        var r0 = r * Math.cos(p0), r1 = r * Math.cos(p1), y0 = topY + rise * Math.sin(p0), y1 = topY + rise * Math.sin(p1);
        var bc = bands ? bands[i % bands.length] : color;
        var cc = G.toColor(bc).clone().multiplyScalar(0.9 + 0.1 * (i / rings));
        for (var s2 = 0; s2 < seg; s2++) {
          var b0 = s2 / seg * PI * 2, b1 = (s2 + 1) / seg * PI * 2;
          if (i === rings - 1) {
            solid.addTris([cx + Math.cos(b0) * r0, y0, cz + Math.sin(b0) * r0, cx + Math.cos(b1) * r0, y0, cz + Math.sin(b1) * r0, cx, y1, cz], cc, [cx, topY, cz]);
          } else {
            solid.addQuad([cx + Math.cos(b0) * r0, y0, cz + Math.sin(b0) * r0], [cx + Math.cos(b1) * r0, y0, cz + Math.sin(b1) * r0], [cx + Math.cos(b1) * r1, y1, cz + Math.sin(b1) * r1], [cx + Math.cos(b0) * r1, y1, cz + Math.sin(b0) * r1], cc, [cx, topY, cz]);
          }
        }
      }
      if (o.ribs !== 0) {
        var rn = o.ribs === undefined ? 16 : o.ribs, rc = o.ribColor === undefined ? ctx.shade(color, 0.7) : o.ribColor;
        for (var k = 0; k < rn; k++) {
          var ak = k / rn * PI * 2, pts = [];
          for (var m = 0; m <= rings * 2; m++) { var pp = m / (rings * 2) * PI / 2; pts.push([cx + Math.cos(ak) * r * Math.cos(pp) * 0.99, topY + rise * Math.sin(pp) - 0.04, cz + Math.sin(ak) * r * Math.cos(pp) * 0.99]); }
          for (m = 0; m < pts.length - 1; m++) solid.addBeam(pts[m], pts[m + 1], 0.22, 0.35, rc, { vary: 0.02 });
        }
      }
      if (o.lantern) {
        var L = o.lantern, lr = num(L.r, r * 0.18), lh = num(L.h, 2), ly = topY + rise - 0.1;
        glow.add(Geo.cyl(10, 1), 0xfff0c8, { x: cx, y: ly, z: cz, sx: lr, sy: lh, sz: lr, flat: true, vary: 0 });
        ctx.cyl({ x: cx, y: ly + lh, z: cz, r: lr * 1.3, rTop: lr * 0.2, h: lh * 0.5, seg: 10, color: 0xd9b45a });
        ctx.cyl({ x: cx, y: ly - 0.05, z: cz, r: lr * 1.2, h: 0.12, seg: 10, color: 0xe3d6bb });
        for (var q = 0; q < 6; q++) { var aq = q / 6 * PI * 2; ctx.cyl({ x: cx + Math.cos(aq) * lr, y: ly, z: cz + Math.sin(aq) * lr, r: 0.06, h: lh, seg: 4, color: 0xe3d6bb }); }
        if (L.beam !== false) {
          for (var bq = 0; bq < 4; bq++) {
            var ab = bq / 4 * PI * 2 + 0.4;
            ctx.addWindowBeam({ x: cx + Math.cos(ab) * lr, y: ly + lh / 2, z: cz + Math.sin(ab) * lr, face: [-Math.cos(ab), -Math.sin(ab)], w: lr * 1.2, h: lh * 0.8, colors: [0xfff1c0, 0xffe39a, 0xfff6dc], reach: r * 1.2, dome: true });
          }
        }
      }
      if (o.oculus) glow.add(Geo.cyl(10, 1), 0xfff6dc, { x: cx, y: topY + rise - 0.02, z: cz, sx: r * 0.12, sy: 0.02, sz: r * 0.12, flat: true, vary: 0 });
    };
    ctx.apse = function (o) {
      var cx = o.cx, cz = o.cz, r = o.r, y = num(o.y, 0), h = o.h, rise = num(o.rise, r * 0.9);
      var dir = o.dir || [0, -1];
      var base = Math.atan2(dir[1], dir[0]);
      var color = o.color === undefined ? 0xf2e6cf : o.color;
      var n = Q(o.seg || 18);
      var domeColor = o.mosaic ? (o.domeColor === undefined ? 0xd8aa3c : o.domeColor) : (o.domeColor === undefined ? color : o.domeColor);
      var bands = o.bands;
      for (var i = 0; i < n; i++) {
        var a0 = base - PI / 2 + PI * i / n, a1 = base - PI / 2 + PI * (i + 1) / n;
        var x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
        solid.addQuad([x0, y, z0], [x1, y, z1], [x1, y + h, z1], [x0, y + h, z0], color, [cx, y + h / 2, cz]);
      }
      var rings = Q(6);
      for (var ri = 0; ri < rings; ri++) {
        var p0 = ri / rings * PI / 2, p1 = (ri + 1) / rings * PI / 2;
        var r0 = r * Math.cos(p0), r1 = r * Math.cos(p1), yy0 = y + h + rise * Math.sin(p0), yy1 = y + h + rise * Math.sin(p1);
        var bc = bands ? bands[ri % bands.length] : domeColor;
        var cc = G.toColor(bc).clone().multiplyScalar(0.92 + 0.08 * ri / rings);
        for (var j = 0; j < n; j++) {
          var b0 = base - PI / 2 + PI * j / n, b1 = base - PI / 2 + PI * (j + 1) / n;
          if (ri === rings - 1) {
            solid.addTris([cx + Math.cos(b0) * r0, yy0, cz + Math.sin(b0) * r0, cx + Math.cos(b1) * r0, yy0, cz + Math.sin(b1) * r0, cx, yy1, cz], cc, [cx - dir[0] * 0.01, y + h, cz - dir[1] * 0.01]);
          } else {
            solid.addQuad([cx + Math.cos(b0) * r0, yy0, cz + Math.sin(b0) * r0], [cx + Math.cos(b1) * r0, yy0, cz + Math.sin(b1) * r0], [cx + Math.cos(b1) * r1, yy1, cz + Math.sin(b1) * r1], [cx + Math.cos(b0) * r1, yy1, cz + Math.sin(b0) * r1], cc, [cx, y + h, cz]);
          }
        }
      }
      if (o.collide !== false) {
        var cn = Math.max(6, Math.round(PI * r / 1.0)), cr = 0.8;
        for (var k = 0; k <= cn; k++) {
          var ak = base - PI / 2 + PI * k / cn;
          ctx.addCollider({ x: cx + Math.cos(ak) * (r + cr - 0.05), z: cz + Math.sin(ak) * (r + cr - 0.05), r: cr });
        }
      }
    };

    // ---- 창 ----
    var stainedDefault = JEWEL;
    function shrinkPoly(poly, k) {
      var cx = 0, cy = 0, i;
      for (i = 0; i < poly.length; i++) { cx += poly[i][0]; cy += poly[i][1]; }
      cx /= poly.length; cy /= poly.length;
      var out = [];
      for (i = 0; i < poly.length; i++) out.push([cx + (poly[i][0] - cx) * k, cy + (poly[i][1] - cy) * k]);
      return out;
    }
    // 창 로컬 좌표(u 오른쪽, v 위)의 다각형들을 3D로 옮긴다
    function windowFrame(o) {
      var n = o.face, nl = Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 1;
      var nx = n[0] / nl, nz = n[1] / nl;
      return { nx: nx, nz: nz, ux: nz, uz: -nx };
    }
    ctx.window = function (o) {
      var F = windowFrame(o), w = o.w, h = o.h, top = o.top || 'round', pattern = o.pattern || 'lancet';
      var rand2 = G.rng(o.seed || 1);
      var colors = o.colors && o.colors.length ? o.colors : stainedDefault;
      var off = 0.04, frameOff = 0.07;
      function P(u, v, d) { return [o.x + F.ux * u + F.nx * (d || 0), o.y + v, o.z + F.uz * u + F.nz * (d || 0)]; }
      var hint = P(0, h / 2, 2);
      var cells = [];
      var cols = pattern === 'solid' ? 1 : (pattern === 'grid' ? Math.max(3, Math.round(w / 0.45)) : (w > 1.6 ? 3 : 2));
      var rows = pattern === 'solid' ? 1 : Math.max(2, Math.round(h / (pattern === 'grid' ? 0.45 : 0.75)));
      var i, j;
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        cells.push([[-w / 2 + w * i / cols, h * j / rows], [-w / 2 + w * (i + 1) / cols, h * j / rows], [-w / 2 + w * (i + 1) / cols, h * (j + 1) / rows], [-w / 2 + w * i / cols, h * (j + 1) / rows]]);
      }
      var outline = [[-w / 2, 0], [w / 2, 0]];
      var archPts = null;
      if (top === 'round' || top === 'trefoil' || top === 'pointed') {
        var rs = top === 'pointed' ? w * 0.72 : w / 2;
        archPts = profilePts(top === 'pointed' ? 'pointed' : 'round', w / 2, rs, Q(top === 'pointed' ? 8 : 10));
        var ctr = [0, h], inner = [];
        for (i = 0; i < archPts.length; i++) inner.push([archPts[i][0] * 0.38, h + (archPts[i][1] - 0) * 0.38]);
        var segN = archPts.length - 1;
        for (i = 0; i < segN; i += 1) {
          cells.push([[archPts[i][0], h + archPts[i][1]], [archPts[i + 1][0], h + archPts[i + 1][1]], [inner[i + 1][0], inner[i + 1][1]], [inner[i][0], inner[i][1]]]);
        }
        cells.push(inner.map(function (p) { return [p[0], p[1]]; }).concat([[inner[inner.length - 1][0], h], [inner[0][0], h]]));
      }
      // 어두운 납 틀 배경
      var back = [[-w / 2, 0], [w / 2, 0], [w / 2, h]];
      if (archPts) { for (i = archPts.length - 1; i >= 0; i--) back.push([archPts[i][0], h + archPts[i][1]]); } else back.push([-w / 2, h]); // placeholder, fixed below
      var backPoly = [[-w / 2, 0], [w / 2, 0], [w / 2, h]];
      if (archPts) { for (i = archPts.length - 1; i >= 0; i--) backPoly.push([archPts[i][0], h + archPts[i][1]]); }
      backPoly.push([-w / 2, h]);
      // 팬 삼각분할(블록 다각형은 볼록하지 않지만 중심점이 안쪽이라 괜찮음)
      var cxm = 0, cym = h * 0.7;
      var vb = [];
      for (i = 0; i < backPoly.length; i++) {
        var pa = backPoly[i], pb = backPoly[(i + 1) % backPoly.length];
        var A = P(cxm, cym, off * 0.5), B = P(pa[0], pa[1], off * 0.5), C = P(pb[0], pb[1], off * 0.5);
        vb.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
      }
      solid.addTris(vb, 0x3a2d28, hint, { vary: 0 });
      var beamColors = [];
      for (var ci = 0; ci < cells.length; ci++) {
        var poly = shrinkPoly(cells[ci], 0.9);
        var pick = colors[Math.floor(rand2() * colors.length)];
        var col = G.toColor(pick);
        if (beamColors.length < 3 && ci < cols * rows && rand2() < 0.4) beamColors.push(pick);
        var vv = [], p0 = P(poly[0][0], poly[0][1], off);
        for (var k = 1; k < poly.length - 1; k++) {
          var q1 = P(poly[k][0], poly[k][1], off), q2 = P(poly[k + 1][0], poly[k + 1][1], off);
          vv.push(p0[0], p0[1], p0[2], q1[0], q1[1], q1[2], q2[0], q2[1], q2[2]);
        }
        glass.addTris(vv, col, hint, { vary: 0.08 });
      }
      while (beamColors.length < 3) beamColors.push(colors[Math.floor(rand2() * colors.length)]);
      if (o.frame !== false) {
        var fc = o.frameColor === undefined ? 0xe3d6bb : o.frameColor, ft = 0.16;
        var wallAng = Math.atan2(F.nx, F.nz); // 상자를 벽면에 정렬
        var fd = 0.14;
        function fbox(u, v, bw, bh) { solid.add(Geo.box(), fc, { x: o.x + F.ux * u + F.nx * frameOff, y: o.y + v, z: o.z + F.uz * u + F.nz * frameOff, ry: wallAng, sx: bw, sy: bh, sz: fd, flat: true, vary: 0.02 }); }
        fbox(-w / 2 - ft / 2, 0, ft, h);
        fbox(w / 2 + ft / 2, 0, ft, h);
        fbox(0, -0.12, w + ft * 2 + 0.1, 0.16);
        if (archPts) {
          for (i = 0; i < archPts.length - 1; i++) {
            var a0 = archPts[i], a1 = archPts[i + 1];
            var pm0 = P((a0[0] + a1[0]) / 2, h + (a0[1] + a1[1]) / 2, frameOff);
            var du = a1[0] - a0[0], dv = a1[1] - a0[1], l = Math.sqrt(du * du + dv * dv);
            var outU = -dv / l, outV = du / l;
            var pmx = pm0[0] + F.ux * outU * ft / 2, pmz = pm0[2] + F.uz * outU * ft / 2, pmy = pm0[1] + outV * ft / 2;
            var bq = new T.Quaternion().setFromEuler(new T.Euler(0, wallAng, 0, 'YXZ'));
            var bq2 = new T.Quaternion().setFromAxisAngle(new T.Vector3(F.nx, 0, F.nz), -Math.atan2(dv, du) * (F.ux > 0 || F.uz > 0 ? 1 : 1) * 0);
            // 회전: 법선축 기준으로 (u,v) 평면에서 각도 만큼
            var qa = new T.Quaternion().setFromAxisAngle(new T.Vector3(F.nx, 0, F.nz), -Math.atan2(dv, du) * 1 * -1);
            // u축 방향이 월드에서 (ux,0,uz) 이므로 기울기는 법선축 회전
            var qf = qa.clone().multiply(bq);
            solid.add(Geo.boxC(), fc, { x: pmx, y: pmy, z: pmz, q: qf, sx: l * 1.08, sy: ft, sz: fd, flat: true, vary: 0.02 });
          }
        }
      }
      if (o.beam !== false) {
        ctx.addWindowBeam({ x: o.x, y: o.y + h * 0.55, z: o.z, face: [F.nx, F.nz], w: w, h: h * 0.9, colors: beamColors, reach: o.beamReach });
      }
    };
    ctx.rose = function (o) {
      var F = windowFrame(o), rand2 = G.rng(o.seed || 2), r = o.r, pet = o.petals || 12, off = 0.04;
      var colors = o.colors && o.colors.length ? o.colors : JEWEL;
      function P(u, v, d) { return [o.x + F.ux * u + F.nx * (d || 0), o.y + v, o.z + F.uz * u + F.nz * (d || 0)]; }
      var hint = P(0, 0, 2);
      var seg = 40, vb = [], i;
      for (i = 0; i < seg; i++) {
        var a0 = i / seg * PI * 2, a1 = (i + 1) / seg * PI * 2, c = P(0, 0, off * 0.5), b = P(Math.cos(a0) * r, Math.sin(a0) * r, off * 0.5), d = P(Math.cos(a1) * r, Math.sin(a1) * r, off * 0.5);
        vb.push(c[0], c[1], c[2], b[0], b[1], b[2], d[0], d[1], d[2]);
      }
      solid.addTris(vb, 0x3a2d28, hint, { vary: 0 });
      function ringCell(r0, r1, a0, a1, col) {
        var A = P(Math.cos(a0) * r0, Math.sin(a0) * r0, off), B = P(Math.cos(a1) * r0, Math.sin(a1) * r0, off), C = P(Math.cos(a1) * r1, Math.sin(a1) * r1, off), D = P(Math.cos(a0) * r1, Math.sin(a0) * r1, off);
        glass.addTris([A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]], col, hint, { vary: 0.08 });
      }
      for (i = 0; i < pet; i++) {
        var pa = i / pet * PI * 2 + 0.05, pb = (i + 1) / pet * PI * 2 - 0.05;
        ringCell(r * 0.66, r * 0.95, pa, pb, G.toColor(colors[Math.floor(rand2() * colors.length)]));
        ringCell(r * 0.3, r * 0.6, pa, pb, G.toColor(colors[Math.floor(rand2() * colors.length)]));
      }
      for (i = 0; i < 8; i++) ringCell(0, r * 0.24, i / 8 * PI * 2, (i + 1) / 8 * PI * 2 - 0.02, G.toColor(colors[(i * 3) % colors.length]));
      if (o.frame !== false) {
        var wallAng = Math.atan2(F.nx, F.nz), fc = o.frameColor === undefined ? 0xe3d6bb : o.frameColor;
        for (i = 0; i < 24; i++) {
          var aa = (i + 0.5) / 24 * PI * 2, pp = P(Math.cos(aa) * (r + 0.08), Math.sin(aa) * (r + 0.08), 0.07);
          var qa = new T.Quaternion().setFromAxisAngle(new T.Vector3(F.nx, 0, F.nz), -(aa + PI / 2) * -1);
          var qf = qa.multiply(new T.Quaternion().setFromEuler(new T.Euler(0, wallAng, 0, 'YXZ')));
          solid.add(Geo.boxC(), fc, { x: pp[0], y: pp[1], z: pp[2], q: qf, sx: r * PI * 2 / 24 * 1.1, sy: 0.18, sz: 0.14, flat: true });
        }
      }
      if (o.beam) ctx.addWindowBeam({ x: o.x, y: o.y, z: o.z, face: [F.nx, F.nz], w: r * 1.6, h: r * 1.6, colors: colors.slice(0, 3), reach: o.beamReach });
    };

    // ---- 조각상 / 벽감 ----
    ctx.statue = function (o) {
      var h = num(o.h, 1.7), y = num(o.y, 0), kind = o.kind || 'saint';
      var robe = o.robe === undefined ? (kind === 'mary' ? 0xf4f0ea : 0xe6dccb) : o.robe, mantle = o.mantle === undefined ? (kind === 'mary' ? 0x7aa6e0 : 0xb9a58a) : o.mantle, skin = o.skin === undefined ? 0xf3dcc4 : o.skin;
      var s = h / 1.7, ry = num(o.ry, 0);
      var ca = Math.cos(ry), sa = Math.sin(ry);
      function pt(lx, lz) { return [o.x + lx * ca + lz * sa, o.z - lx * sa + lz * ca]; }
      ctx.cyl({ x: o.x, y: y, z: o.z, r: 0.32 * s, rTop: 0.14 * s, h: h * 0.72, seg: 9, color: robe });
      var back = pt(0, 0.12 * s);
      ctx.cyl({ x: back[0], y: y + h * 0.04, z: back[1], r: 0.36 * s, rTop: 0.18 * s, h: h * 0.7, seg: 8, color: mantle, ry: ry });
      ctx.sphere({ x: o.x, y: y + h * 0.82, z: o.z, r: 0.17 * s, color: skin, w: 10, h: 8 });
      ctx.sphere({ x: o.x, y: y + h * 0.88, z: o.z + 0, r: 0.185 * s, sy: 0.12 * s, color: mantle, w: 8, h: 4 });
      if (o.halo !== false) glow.add(Geo.cyl(14, 1), 0xf2d27a, { x: o.x, y: y + h * 0.82, z: o.z, sx: 0.28 * s, sy: 0.02, sz: 0.28 * s, rx: PI / 2 + 0.0, ry: ry, flat: true, vary: 0 });
      if (kind === 'angel') {
        [-1, 1].forEach(function (sg) { var p = pt(sg * 0.28 * s, 0.14 * s); ctx.box({ x: p[0], y: y + h * 0.45, z: p[1], w: 0.08 * s, h: h * 0.4, d: 0.32 * s, color: 0xffffff, ry: ry, rz: sg * 0.4 }); });
      }
      if (kind === 'christ') { var arm = pt(0, -0.15 * s); ctx.box({ x: arm[0], y: y + h * 0.55, z: arm[1], w: 0.5 * s, h: 0.07 * s, d: 0.08 * s, color: robe, ry: ry }); }
    };
    ctx.statueNiche = function (o) {
      var F = windowFrame(o), w = num(o.w, 1.4), h = num(o.h, 2.6), axis = Math.abs(F.nx) > Math.abs(F.nz) ? 'z' : 'x';
      // 어두운 오목 뒤판
      ctx.box({ x: o.x + F.nx * 0.03, y: o.y, z: o.z + F.nz * 0.03, w: Math.abs(F.ux) > 0.5 ? w : 0.06, h: h, d: Math.abs(F.uz) > 0.5 ? w : 0.06, color: o.back === undefined ? 0x8b7b6b : o.back, ry: 0 });
      ctx.arch({ x: o.x + F.nx * 0.06, y: o.y + h, z: o.z + F.nz * 0.06, span: w, rise: w * 0.55, t: 0.16, depth: 0.12, axis: axis, type: 'round', color: o.frame === undefined ? 0xe8e0d0 : o.frame });
      var ry = Math.atan2(-F.nx, -F.nz) + PI; // 정면이 실내(+n)를 향하게
      ctx.statue({ x: o.x + F.nx * 0.25, z: o.z + F.nz * 0.25, y: o.y + 0.05, ry: Math.atan2(F.nx, F.nz) + PI, h: h * 0.78, kind: o.kind, robe: o.robe, mantle: o.mantle, skin: o.skin, halo: o.halo });
    };

    // ---- 제대·성소 가구 ----
    ctx.altar = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), w = num(o.w, 2.6), d = num(o.d, 1.1), h = num(o.h, 1.0), ry = num(o.ry, 0), style = o.style || 'table';
      var color = o.color === undefined ? 0xf4efe6 : o.color;
      var ca = Math.cos(ry), sa = Math.sin(ry);
      function pt(lx, lz) { return [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; }
      if (style === 'table') {
        [-1, 1].forEach(function (sg) { var p = pt(sg * (w / 2 - 0.35), 0); ctx.box({ x: p[0], y: y, z: p[1], w: 0.5, h: h - 0.14, d: d * 0.85, color: ctx.shade(color, 0.96), ry: ry }); });
        ctx.box({ x: x, y: y + h * 0.35, z: z, w: w - 0.9, h: 0.2, d: d * 0.7, color: ctx.shade(color, 0.9), ry: ry });
        ctx.box({ x: x, y: y + h - 0.14, z: z, w: w, h: 0.14, d: d, color: color, ry: ry });
      } else {
        ctx.box({ x: x, y: y, z: z, w: w * 0.92, h: h - 0.14, d: d * 0.9, color: color, ry: ry });
        ctx.box({ x: x, y: y + h - 0.14, z: z, w: w, h: 0.14, d: d, color: ctx.shade(color, 1.04), ry: ry });
      }
      if (o.cloth !== false) {
        ctx.box({ x: x, y: y + h, z: z, w: w * 1.02, h: 0.03, d: d * 1.02, color: 0xfffaf0, ry: ry });
        var f = pt(0, d / 2 + 0.01);
        ctx.box({ x: f[0], y: y + h * 0.55, z: f[1], w: w * 0.9, h: h * 0.43, d: 0.03, color: 0xfffaf0, ry: ry });
        ctx.box({ x: f[0], y: y + h * 0.9, z: f[1], w: w * 0.9, h: 0.07, d: 0.04, color: 0xd9b45a, ry: ry });
      }
      var nc = o.candles === undefined ? 2 : o.candles;
      for (var i = 0; i < nc; i++) {
        var lx = nc === 1 ? 0 : -w / 2 + 0.25 + (w - 0.5) * i / (nc - 1);
        var p = pt(lx, -d * 0.2);
        ctx.cyl({ x: p[0], y: y + h + 0.03, z: p[1], r: 0.07, rTop: 0.04, h: 0.35, seg: 6, color: 0xd9b45a });
        ctx.cyl({ x: p[0], y: y + h + 0.38, z: p[1], r: 0.05, h: 0.3, seg: 6, color: 0xfff6e0 });
        ctx.addFlame({ x: p[0], y: y + h + 0.78, z: p[1], scale: 1.0 });
      }
      if (o.flowers !== false) {
        [-1, 1].forEach(function (sg) {
          var p = pt(sg * (w / 2 + 0.55), 0.1);
          ctx.cyl({ x: p[0], y: y, z: p[1], r: 0.16, rTop: 0.22, h: 0.4, seg: 8, color: 0xf0e8dc });
          for (var k = 0; k < 7; k++) ctx.ico({ x: p[0] + (Math.random() - 0.5) * 0.25, y: y + 0.55 + Math.random() * 0.25, z: p[1] + (Math.random() - 0.5) * 0.25, r: 0.13, color: [0xffffff, 0xfff0f5, 0xffd9e6, 0xf6f6e6][k % 4], detail: 0 });
        });
      }
      if (o.collide !== false) ctx.addCollider({ x0: x - (Math.abs(ca) > 0.5 ? w : d) / 2 - 0.1, x1: x + (Math.abs(ca) > 0.5 ? w : d) / 2 + 0.1, z0: z - (Math.abs(ca) > 0.5 ? d : w) / 2 - 0.1, z1: z + (Math.abs(ca) > 0.5 ? d : w) / 2 + 0.1 });
    };
    ctx.baldachin = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), w = num(o.w, 5), d = num(o.d, 5), h = num(o.h, 5), ch = num(o.canopyH, 1.4);
      var gold = o.gold === undefined ? 0xc99a45 : o.gold;
      var cols = o.columns || 4;
      var pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
      for (var i = 0; i < cols && i < 4; i++) ctx.column({ x: x + pts[i][0], z: z + pts[i][1], y: y, h: h, r: num(o.r, 0.32), style: o.style || 'twisted', capital: 'composite', color: o.color === undefined ? 0x7a5a38 : o.color, capColor: gold, collide: true });
      ctx.box({ x: x, y: y + h, z: z, w: w + 0.9, h: 0.35, d: d + 0.9, color: gold });
      ctx.box({ x: x, y: y + h + 0.35, z: z, w: w + 0.4, h: ch * 0.4, d: d + 0.4, color: o.color === undefined ? 0x6b4a2e : o.color });
      for (var k = 0; k < 4; k++) {
        var p = pts[k];
        solid.addBeam([x + p[0], y + h + 0.6, z + p[1]], [x, y + h + ch + 0.6, z], 0.18, 0.18, gold);
      }
      ctx.sphere({ x: x, y: y + h + ch + 0.75, z: z, r: 0.3, color: gold, flat: false });
      if (o.cross !== false) { ctx.box({ x: x, y: y + h + ch + 0.95, z: z, w: 0.1, h: 0.7, d: 0.1, color: gold }); ctx.box({ x: x, y: y + h + ch + 1.35, z: z, w: 0.4, h: 0.1, d: 0.1, color: gold }); }
    };
    ctx.pulpit = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), h = num(o.h, 1.2), ry = num(o.ry, 0), c = o.color === undefined ? 0x7a5236 : o.color, style = o.style || 'ambo';
      if (style === 'ambo') {
        ctx.box({ x: x, y: y, z: z, w: 0.7, h: h - 0.1, d: 0.5, color: c, ry: ry });
        ctx.box({ x: x, y: y + h - 0.1, z: z, w: 0.9, h: 0.12, d: 0.7, color: ctx.shade(c, 1.15), ry: ry, rx: -0.25 });
        ctx.box({ x: x, y: y + h + 0.02, z: z, w: 0.6, h: 0.05, d: 0.4, color: 0xf6f0e0, ry: ry, rx: -0.25 });
        ctx.addCollider({ x: x, z: z, r: 0.55 });
      } else {
        var ph = num(o.h, 3.2);
        ctx.cyl({ x: x, y: y, z: z, r: 0.28, h: ph - 0.9, seg: 8, color: c });
        ctx.cyl({ x: x, y: y + ph - 1.0, z: z, r: 0.75, rTop: 0.9, h: 1.0, seg: 8, color: ctx.shade(c, 1.1) });
        ctx.cyl({ x: x, y: y + ph, z: z, r: 0.95, rTop: 0.95, h: 0.08, seg: 8, color: 0xd9b45a });
        ctx.cone({ x: x, y: y + ph + 0.9, z: z, r: 1.05, h: 1.6, seg: 8, color: c });
        for (var i = 0; i < 4; i++) { var a = i * PI / 2 + PI / 4; ctx.cyl({ x: x + Math.cos(a) * 0.85, y: y + ph + 0.08, z: z + Math.sin(a) * 0.85, r: 0.05, h: 0.82, seg: 5, color: 0xd9b45a }); }
        ctx.addCollider({ x: x, z: z, r: 0.95 });
      }
    };
    ctx.tabernacle = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), ry = num(o.ry, 0);
      ctx.box({ x: x, y: y, z: z, w: 1.0, h: 1.1, d: 0.9, color: 0xe8e0d0, ry: ry });
      ctx.box({ x: x, y: y + 1.1, z: z, w: 0.62, h: 0.55, d: 0.5, color: 0xd9b45a, ry: ry });
      ctx.cone({ x: x, y: y + 1.65, z: z, r: 0.38, h: 0.3, seg: 8, color: 0xe6c260 });
      ctx.box({ x: x, y: y + 1.95, z: z, w: 0.06, h: 0.26, d: 0.06, color: 0xd9b45a });
      ctx.box({ x: x, y: y + 2.05, z: z, w: 0.18, h: 0.05, d: 0.05, color: 0xd9b45a });
      ctx.addCollider({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.55, z1: z + 0.55 });
      if (o.lamp !== false) {
        var lx = x + 1.1;
        ctx.cyl({ x: lx, y: y, z: z, r: 0.05, h: 2.1, seg: 6, color: 0xd9b45a });
        ctx.cyl({ x: lx, y: y, z: z, r: 0.16, rTop: 0.08, h: 0.12, seg: 8, color: 0xd9b45a });
        glow.add(Geo.cyl(8, 1), 0xff5a4a, { x: lx, y: y + 2.1, z: z, sx: 0.1, sy: 0.28, sz: 0.1, flat: true, vary: 0 });
        ctx.addGlow({ x: lx, y: y + 2.25, z: z, size: 0.9, color: 0xff4030, pulse: 0.15, kind: 'always' });
        ctx.addCollider({ x: lx, z: z, r: 0.2 });
      }
    };
    ctx.crucifix = function (o) {
      var x = o.x, y = o.y, z = o.z, h = num(o.h, 3.6), ry = num(o.ry, 0), wood = 0x6a4429;
      var ca = Math.cos(ry), sa = Math.sin(ry);
      function pt(lx, lz) { return [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; }
      ctx.box({ x: x, y: y, z: z, w: h * 0.08, h: h, d: h * 0.06, color: wood, ry: ry });
      ctx.box({ x: x, y: y + h * 0.62, z: z, w: h * 0.56, h: h * 0.07, d: h * 0.06, color: wood, ry: ry });
      var f = pt(0, h * 0.05);
      ctx.sphere({ x: f[0], y: y + h * 0.7, z: f[1], r: h * 0.045, color: 0xf2d8bf, w: 8, h: 6 });
      ctx.box({ x: f[0], y: y + h * 0.42, z: f[1], w: h * 0.09, h: h * 0.26, d: h * 0.04, color: 0xf2d8bf, ry: ry });
      ctx.box({ x: f[0], y: y + h * 0.64, z: f[1], w: h * 0.44, h: h * 0.035, d: h * 0.035, color: 0xf2d8bf, ry: ry });
      ctx.box({ x: f[0], y: y + h * 0.36, z: f[1], w: h * 0.1, h: h * 0.07, d: h * 0.05, color: 0xffffff, ry: ry });
      ctx.box({ x: f[0], y: y + h * 0.22, z: f[1], w: h * 0.06, h: h * 0.16, d: h * 0.035, color: 0xf2d8bf, ry: ry });
      if (o.glow !== false) ctx.addGlow({ x: x + sa * 0.3, y: y + h * 0.62, z: z + ca * 0.3, size: h * 1.1, color: 0xffe2a0, kind: 'always' });
    };
    ctx.chandelier = function (o) {
      var x = o.x, y = o.y, z = o.z, chain = num(o.chain, 1.5), r = num(o.r, 0.8), tiers = o.tiers || 1;
      ctx.cyl({ x: x, y: y, z: z, r: 0.025, h: chain, seg: 4, color: 0x3a3430 });
      for (var t = 0; t < tiers; t++) {
        var rr = r * (1 - t * 0.35), yy = y - t * 0.5;
        var n = 8 + t * 2;
        ctx.cyl({ x: x, y: yy - 0.05, z: z, r: rr, h: 0.05, seg: 12, color: 0x2e2a26 });
        for (var i = 0; i < n; i++) {
          var a = i / n * PI * 2;
          var px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
          ctx.cyl({ x: px, y: yy, z: pz, r: 0.03, h: 0.18, seg: 4, color: 0xf3ead0 });
          glow.add(Geo.sph(6, 4), 0xffd78a, { x: px, y: yy + 0.24, z: pz, s: 0.06, flat: true, vary: 0 });
        }
      }
      ctx.addGlow({ x: x, y: y + 0.2, z: z, size: r * 3.2, color: 0xffc977, kind: 'lamp', pulse: 0.05 });
    };
    ctx.lantern = function (o) {
      var chain = num(o.chain, 1.2);
      ctx.cyl({ x: o.x, y: o.y + 0.2, z: o.z, r: 0.02, h: chain, seg: 4, color: 0x3a3430 });
      ctx.cone({ x: o.x, y: o.y + 0.22, z: o.z, r: 0.2, h: 0.15, seg: 6, color: 0x3a3430 });
      glow.add(Geo.cyl(6, 1), 0xffd78a, { x: o.x, y: o.y - 0.15, z: o.z, sx: 0.14, sy: 0.35, sz: 0.14, flat: true, vary: 0 });
      ctx.addGlow({ x: o.x, y: o.y, z: o.z, size: 1.6, color: 0xffc977, kind: 'lamp' });
    };
    ctx.holyFont = function (o) {
      var y = num(o.y, 0);
      ctx.cyl({ x: o.x, y: y, z: o.z, r: 0.28, rTop: 0.2, h: 0.85, seg: 8, color: 0xd8d0c0 });
      ctx.cyl({ x: o.x, y: y + 0.85, z: o.z, r: 0.38, rTop: 0.48, h: 0.18, seg: 10, color: 0xe8e0d0 });
      glow.add(Geo.cyl(10, 1), 0x9fd3f0, { x: o.x, y: y + 1.0, z: o.z, sx: 0.4, sy: 0.02, sz: 0.4, flat: true, vary: 0 });
      ctx.addCollider({ x: o.x, z: o.z, r: 0.42 });
    };
    ctx.steps = function (o) {
      var n = o.n || 2, dir = o.dir || [0, -1], color = o.color === undefined ? 0xe4dccb : o.color;
      var x0 = o.x0, x1 = o.x1, z0 = o.z0, z1 = o.z1;
      for (var i = 0; i < n; i++) {
        var yTop = o.y0 + (o.y1 - o.y0) * (i + 1) / n;
        var frac0 = i / n, frac1 = 1;
        var bx0 = x0, bx1 = x1, bz0 = z0, bz1 = z1;
        if (dir[1] !== 0) { var span = z1 - z0; if (dir[1] < 0) { bz1 = z1 - span * i / n; bz0 = z0; } else { bz0 = z0 + span * i / n; bz1 = z1; } }
        else { var spx = x1 - x0; if (dir[0] < 0) { bx1 = x1 - spx * i / n; bx0 = x0; } else { bx0 = x0 + spx * i / n; bx1 = x1; } }
        // 단 i: 앞쪽에서 i번째 폭만큼 줄어든 바닥판
        ctx.boxAABB({ x0: bx0, x1: bx1, z0: bz0, z1: bz1, y0: o.y0, y1: yTop, color: ctx.shade(color, 1 - 0.02 * i) });
        ctx.floorZone({ x0: bx0, x1: bx1, z0: bz0, z1: bz1, y: yTop });
      }
    };
    ctx.carpet = function (o) {
      var y = num(o.y, 0) + 0.015, c = o.color === undefined ? 0xb8434b : o.color, b = o.border === undefined ? 0xd9b45a : o.border;
      ctx.boxAABB({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y0: y, y1: y + 0.012, color: c, vary: 0, flat: true });
      var bw = 0.1;
      ctx.boxAABB({ x0: o.x0, x1: o.x0 + bw, z0: o.z0, z1: o.z1, y0: y + 0.012, y1: y + 0.02, color: b, vary: 0 });
      ctx.boxAABB({ x0: o.x1 - bw, x1: o.x1, z0: o.z0, z1: o.z1, y0: y + 0.012, y1: y + 0.02, color: b, vary: 0 });
    };
    // 둥근 메달리온 띠(프리즈): 벽면(facing)을 따라 원판 반복
    ctx.medallionFrieze = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.round(len / num(o.spacing, 2.4)));
      var f = o.facing || [0, 1], ry = Math.atan2(f[0], f[1]);
      var gold = o.gold === undefined ? 0xd9b45a : o.gold;
      ctx.box({ x: (o.x0 + o.x1) / 2 + f[0] * 0.04, y: o.y, z: (o.z0 + o.z1) / 2 + f[1] * 0.04, w: Math.abs(dx) > Math.abs(dz) ? len : 0.08, h: o.h, d: Math.abs(dz) >= Math.abs(dx) ? len : 0.08, color: o.color === undefined ? 0x2f4f9a : o.color });
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n, px = o.x0 + dx * t + f[0] * 0.09, pz = o.z0 + dz * t + f[1] * 0.09;
        var rr = o.h * 0.4;
        solid.add(Geo.cyl(14, 1), gold, { x: px, y: o.y + o.h / 2, z: pz, ry: ry, rx: PI / 2, sx: rr, sy: 0.05, sz: rr, flat: true, vary: 0 });
        solid.add(Geo.cyl(14, 1), o.inner === undefined ? 0xf3ead8 : o.inner, { x: px + f[0] * 0.03, y: o.y + o.h / 2, z: pz + f[1] * 0.03, ry: ry, rx: PI / 2, sx: rr * 0.72, sy: 0.05, sz: rr * 0.72, flat: true, vary: 0 });
      }
    };
    // 벽면 띠(코니스/몰딩)
    ctx.cornice = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), f = o.facing || [0, 1], t = num(o.depth, 0.25);
      var ry = Math.atan2(-dz, dx);
      solid.add(Geo.box(), o.color === undefined ? 0xe8dcc3 : o.color, { x: (o.x0 + o.x1) / 2 + f[0] * t / 2, y: o.y, z: (o.z0 + o.z1) / 2 + f[1] * t / 2, ry: ry, sx: len, sy: num(o.h, 0.3), sz: t, flat: true });
    };
    // 반원 벽기둥(벽에 붙은 기둥) + 벽감 연속: 편의 함수
    ctx.pilaster = function (o) { ctx.column({ x: o.x, z: o.z, y: o.y, h: o.h, r: o.r || 0.4, style: 'round', capital: o.capital || 'corinthian', color: o.color, capColor: o.capColor, collide: o.collide, ry: o.ry }); };

    // ---- 좌석 ----
    ctx.renderSeats = function (lay, style, o) {
      o = o || {};
      var wood = o.wood === undefined ? 0x9b6a45 : o.wood, seatC = o.seat === undefined ? 0xc08c5a : o.seat, backC = o.back === undefined ? 0x82553a : o.back;
      var Lg = root.ChurchLogic;
      var bands = Lg.rowBands(lay);
      var seats = Lg.seatsOf(lay);
      var bySR = {};
      for (var i = 0; i < seats.length; i++) { var s = seats[i]; (bySR[s.g + s.row] = bySR[s.g + s.row] || []).push(s); }
      for (var b = 0; b < bands.length; b++) {
        var B = bands[b], f = B.f, e = B.e;
        var yawb = Math.atan2(-f[0], -f[1]);   // 앞이 f
        var len = Math.sqrt(Math.pow(B.end[0] - B.start[0], 2) + Math.pow(B.end[1] - B.start[1], 2));
        var mx = (B.start[0] + B.end[0]) / 2, mz = (B.start[1] + B.end[1]) / 2;
        // 등받이 띠: seat + f*(0.1..0.6) 안쪽 0.08..0.5 근처(앞줄 등받이)
        var bx = mx + f[0] * 0.32, bz = mz + f[1] * 0.32;
        var ry = Math.atan2(e[0] * 0 + f[0] * -1, f[1] * -1) ; // 길이축이 e가 되도록
        var angE = Math.atan2(-e[1], e[0]);
        if (style === 'chair') {
          solid.add(Geo.box(), backC, { x: bx, y: 0, z: bz, ry: angE, sx: len, sy: 0.95, sz: 0.14, flat: true, vary: 0.02 });
          solid.add(Geo.box(), wood, { x: bx, y: 0.5, z: bz, ry: angE, sx: len, sy: 0.08, sz: 0.2, flat: true, vary: 0.02 });
        } else {
          solid.add(Geo.box(), backC, { x: bx + f[0] * 0.04, y: 0, z: bz + f[1] * 0.04, ry: angE, sx: len, sy: 1.05, sz: 0.17, flat: true, vary: 0.02 });
          solid.add(Geo.box(), wood, { x: bx + f[0] * 0.04, y: 1.03, z: bz + f[1] * 0.04, ry: angE, sx: len + 0.04, sy: 0.06, sz: 0.24, flat: true, vary: 0.02 });
          // 앞줄 무릎받이(기도대)
          solid.add(Geo.box(), wood, { x: bx - f[0] * 0.25, y: 0.12, z: bz - f[1] * 0.25, ry: angE, sx: len - 0.3, sy: 0.07, sz: 0.2, flat: true, vary: 0.02 });
        }
        // 좌석판(이 줄 앉는 사람 뒤쪽 통로 쪽): seat 중심에서 -f*0.09 ...
        var seatRow = bySR[B.g + B.row] || [];
        if (style === 'chair') {
          for (var q = 0; q < seatRow.length; q++) {
            var st = seatRow[q];
            solid.add(Geo.box(), seatC, { x: st.x + f[0] * 0.02, y: 0.38, z: st.z + f[1] * 0.02, ry: angE, sx: 0.46, sy: 0.07, sz: 0.46, flat: true });
            solid.add(Geo.box(), wood, { x: st.x - f[0] * 0.2, y: 0.45, z: st.z - f[1] * 0.2, ry: angE, sx: 0.46, sy: 0.55, sz: 0.06, flat: true });
            [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(function (lg) {
              solid.add(Geo.box(), wood, { x: st.x + e[0] * lg[0] + f[0] * lg[1], y: 0, z: st.z + e[1] * lg[0] + f[1] * lg[1], sx: 0.05, sy: 0.38, sz: 0.05, flat: true });
            });
          }
        } else {
          var px = mx + f[0] * 0.0 - f[0] * 0.09, pz = mz - f[1] * 0.09;
          px = mx - f[0] * 0.09; pz = mz - f[1] * 0.09;
          // 좌석판: seat 위치(= 선 중심에서 약간 뒤)
          var sc = seatRow.length ? seatRow[Math.floor(seatRow.length / 2)] : null;
          var sx0 = (seatRow.length ? (seatRow[0].x + seatRow[seatRow.length - 1].x) / 2 : mx) - f[0] * 0.0, sz0 = (seatRow.length ? (seatRow[0].z + seatRow[seatRow.length - 1].z) / 2 : mz);
          solid.add(Geo.box(), seatC, { x: sx0 + f[0] * 0.0, y: 0.4, z: sz0, ry: angE, sx: len, sy: 0.06, sz: 0.5, flat: true, vary: 0.02 });
          solid.add(Geo.box(), wood, { x: sx0 + f[0] * 0.05, y: 0, z: sz0 + f[1] * 0.05, ry: angE, sx: len - 0.15, sy: 0.4, sz: 0.3, flat: true, vary: 0.02 });
          // 줄 양끝 옆판
          [-1, 1].forEach(function (sg) {
            var ex = sg < 0 ? B.start : B.end;
            solid.add(Geo.box(), wood, { x: ex[0] + f[0] * 0.0, y: 0, z: ex[1] + f[1] * 0.0, ry: angE, sx: 0.12, sy: 1.15, sz: 0.85, flat: true, vary: 0.02 });
          });
        }
      }
    };

    // ---- 촛불대 가구 ----
    ctx.candleStand = function (i, o) {
      o = o || {};
      var slots = root.ChurchLogic.candleSlots(layout).filter(function (s) { return s.stand === i; });
      var st = layout.candles.stands[i];
      var wood = o.wood === undefined ? 0x6e4a31 : o.wood, metal = o.metal === undefined ? 0x3b3430 : o.metal;
      var f = st.face || [-1, 0], fl = Math.sqrt(f[0] * f[0] + f[1] * f[1]) || 1; f = [f[0] / fl, f[1] / fl];
      var cols = st.cols || 8, pitch = st.pitch || 0.7, rows = Math.ceil(st.slots / cols);
      var width = cols * pitch + 0.2;
      var ry = Math.atan2(-f[0], -f[1]) * 0 + Math.atan2(f[0], f[1]);
      var step = st.step || 0.35, y0 = st.y0 === undefined ? 0.8 : st.y0, ystep = st.ystep || 0.35;
      // 계단식 단: 행마다 상판
      var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (var r = 0; r < rows; r++) {
        var rowSlots = slots.filter(function (s) { return s.row === r; });
        if (!rowSlots.length) continue;
        var sx = rowSlots[0].x, sz = rowSlots[0].z, yy = rowSlots[0].y;
        // 단은 face 법선 방향 깊이 step 만큼. 중심 = 슬롯 줄 중앙, 안쪽으로 (step/2 + 0.12) 이동
        var cx = 0, cz = 0;
        rowSlots.forEach(function (s) { cx += s.x; cz += s.z; });
        cx /= rowSlots.length; cz /= rowSlots.length;
        var bw = (cols - 1) * pitch + 0.5, depth = step + 0.2;
        var ccx = cx - f[0] * (step / 2 - 0.1), ccz = cz - f[1] * (step / 2 - 0.1);
        var along = Math.abs(f[0]) > 0.5;
        // 단 몸체(바닥에서 상판까지)
        ctx.box({ x: ccx, y: 0, z: ccz, w: along ? depth : bw, h: yy - 0.07, d: along ? bw : depth, color: wood });
        ctx.box({ x: ccx, y: yy - 0.07, z: ccz, w: along ? depth + 0.06 : bw + 0.06, h: 0.07, d: along ? bw + 0.06 : depth + 0.06, color: ctx.shade(wood, 1.18) });
        var hx = (along ? depth : bw) / 2 + 0.05, hz = (along ? bw : depth) / 2 + 0.05;
        minX = Math.min(minX, ccx - hx); maxX = Math.max(maxX, ccx + hx); minZ = Math.min(minZ, ccz - hz); maxZ = Math.max(maxZ, ccz + hz);
      }
      // 뒷판 + 장식
      var back = [st.x - f[0] * (step * (rows - 1) + 0.55), st.z - f[1] * (step * (rows - 1) + 0.55)];
      var along2 = Math.abs(f[0]) > 0.5;
      ctx.box({ x: back[0], y: 0, z: back[1], w: along2 ? 0.2 : width + 0.2, h: y0 + ystep * (rows - 1) + 0.9, d: along2 ? width + 0.2 : 0.2, color: ctx.shade(wood, 0.8) });
      for (var c = 0; c < 2; c++) ctx.addGlow({ x: back[0] + f[0] * 0.3, y: y0 + ystep * (rows - 1) + 0.55, z: back[1] + f[1] * 0.3 + (along2 ? (c ? 1 : -1) * 2 : 0), size: 0.01, color: 0x000000, kind: 'none' });
      ctx.addCollider({ x0: minX, x1: maxX, z0: minZ, z1: maxZ });
      S_.candleStands.push({ i: i, bounds: { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ } });
    };

    // ---- 바깥 풍경 ----
    ctx.ground = function (o) {
      o = o || {};
      var m = new T.Mesh(new T.PlaneGeometry(o.size || 800, o.size || 800), new T.MeshLambertMaterial({ color: o.color === undefined ? 0xa8d08a : o.color }));
      m.rotation.x = -PI / 2; m.position.y = num(o.y, -0.05); ctx.root.add(m); stats.meshes++;
      S_.groundMesh = m;
      return m;
    };
    ctx.path = function (o) {
      ctx.boxAABB({ x0: o.x0, x1: o.x1, y0: -0.045, y1: -0.02, z0: o.z0, z1: o.z1, color: o.color === undefined ? 0xe6cfa5 : o.color, vary: 0.02 });
      var rr = G.rng(21), n = Math.floor((o.z1 - o.z0) / 1.6);
      for (var i = 0; i < n; i++) {
        var z = o.z0 + 0.8 + i * 1.6 + rr() * 0.4, x = (o.x0 + o.x1) / 2 + (rr() - 0.5) * (o.x1 - o.x0) * 0.4;
        ctx.cyl({ x: x, y: -0.03, z: z, r: 0.5 + rr() * 0.25, h: 0.05, seg: 7, color: ctx.shade(0xc9bfb0, 0.95 + rr() * 0.12) });
      }
    };
    function tree(x, z, h, rr, palette, y) {
      var trunk = 0x8b6a4f, foli = palette[Math.floor(rr() * palette.length)];
      var kind = rr() < 0.35 ? 'pine' : 'round';
      if (kind === 'pine') {
        ctx.cyl({ x: x, y: y, z: z, r: h * 0.04, h: h * 0.3, seg: 5, color: trunk });
        for (var k = 0; k < 4; k++) ctx.cone({ x: x, y: y + h * (0.2 + 0.2 * k), z: z, r: h * (0.3 - 0.05 * k), h: h * 0.38, seg: 6, color: ctx.shade(foli, 0.9 + 0.05 * k), flat: true });
      } else {
        ctx.cyl({ x: x, y: y, z: z, r: h * 0.05, rTop: h * 0.035, h: h * 0.5, seg: 5, color: trunk });
        var n = 3;
        for (var q = 0; q < n; q++) ctx.ico({ x: x + (rr() - 0.5) * h * 0.3, y: y + h * (0.5 + 0.13 * q), z: z + (rr() - 0.5) * h * 0.3, r: h * (0.28 - 0.04 * q), color: ctx.shade(foli, 0.95 + 0.05 * q), detail: 1 });
      }
    }
    ctx.scatterTrees = function (o) {
      var rr = G.rng(o.seed || 5), pal = o.palette || [0x8fcf8c, 0x7fc383, 0xa5d68a, 0xf4a6c0, 0xf2c077, 0x6bb88f];
      var count = Math.round(o.count * (low ? 0.6 : 1));
      for (var i = 0; i < count; i++) {
        var x = o.x0 + rr() * (o.x1 - o.x0), z = o.z0 + rr() * (o.z1 - o.z0), skip = false;
        (o.exclude || []).forEach(function (e) { if (x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1) skip = true; });
        if (skip) continue;
        tree(x, z, (o.minH || 4) + rr() * ((o.maxH || 8) - (o.minH || 4)), rr, pal, num(o.y, -0.05));
        // 가끔 바위
        if (rr() < 0.25) ctx.ico({ x: x + 2 + rr() * 2, y: -0.2, z: z + rr() * 3, sx: 0.7 + rr(), sy: 0.5 + rr() * 0.5, sz: 0.7 + rr(), color: ctx.shade(0xb8b0a8, 0.9 + rr() * 0.15), detail: 0 });
      }
    };
    ctx.hills = function (o) {
      o = o || {};
      var rr = G.rng(9), n = o.count || 14, R = o.radius || 190;
      for (var i = 0; i < n; i++) {
        var a = i / n * PI * 2 + rr() * 0.3;
        ctx.ico({ x: Math.cos(a) * R, y: -2, z: Math.sin(a) * R, sx: 40 + rr() * 30, sy: 14 + rr() * 16, sz: 40 + rr() * 30, color: ctx.mix(o.color === undefined ? 0x9dc89a : o.color, 0xc7b6d8, rr() * 0.5), detail: 1 });
      }
    };

    return ctx;
  }

  root.ChurchKit = { createContext: createContext, profilePts: profilePts, profileFn: profileFn, JEWEL: JEWEL };
})(typeof window !== 'undefined' ? window : this);
