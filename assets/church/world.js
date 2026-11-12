/* world.js — 월드 코어: 빌더 실행, 조명/하늘/시간대, 창 빛줄기, 촛불대 렌더, 먼지. ChurchWorld.create(scene, opts) */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, PI = Math.PI;

  // ---- 시간대 키프레임 (부드러운 파스텔/따뜻한 톤: style_lowpoly 참고) ----
  var KEYS = [
    { h: 0,    top: 0x0b1236, hor: 0x26325f, hs: 0x6a7ab8, hg: 0x2e3358, hi: 0.78, dc: 0x8c9de0, di: 0.18, fog: 0x1c2447, glass: 0x4c5c9c, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x3a4570, amb: 0.0 },
    { h: 5,    top: 0x0b1236, hor: 0x26325f, hs: 0x6a7ab8, hg: 0x2e3358, hi: 0.78, dc: 0x8c9de0, di: 0.18, fog: 0x1c2447, glass: 0x4c5c9c, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x3a4570, amb: 0.0 },
    { h: 6.5,  top: 0x9bb3e0, hor: 0xffcaa6, hs: 0xffe2cc, hg: 0xc9b3a0, hi: 0.85, dc: 0xffd2a8, di: 0.5, fog: 0xf0d8c6, glass: 0xc9b0a8, beam: 0.55, candle: 0.55, lamp: 0.55, cloud: 0xffdcc8, amb: 0.5 },
    { h: 9,    top: 0x9fcdf2, hor: 0xfff0dc, hs: 0xfff6e8, hg: 0xd2c0a4, hi: 0.95, dc: 0xfff0d2, di: 0.62, fog: 0xf6ead8, glass: 0xffffff, beam: 1, candle: 0.3, lamp: 0.3, cloud: 0xffffff, amb: 1 },
    { h: 16,   top: 0x9fcdf2, hor: 0xfff0dc, hs: 0xfff3e0, hg: 0xd2c0a4, hi: 0.95, dc: 0xffe6bf, di: 0.6, fog: 0xf6ead8, glass: 0xffffff, beam: 1, candle: 0.3, lamp: 0.3, cloud: 0xffffff, amb: 1 },
    { h: 17.7, top: 0xb7a6dc, hor: 0xffc79c, hs: 0xffd9b8, hg: 0xc4a58f, hi: 0.82, dc: 0xffb98a, di: 0.55, fog: 0xf2cfc0, glass: 0xffd9c0, beam: 0.85, candle: 0.55, lamp: 0.55, cloud: 0xffd6c6, amb: 0.8 },
    { h: 19,   top: 0x7b6aa8, hor: 0xff9f84, hs: 0xffb89a, hg: 0x9a7c88, hi: 0.66, dc: 0xff9a66, di: 0.42, fog: 0xc89aa0, glass: 0xd89a8c, beam: 0.25, candle: 0.85, lamp: 0.85, cloud: 0xf0a8b8, amb: 0.3 },
    { h: 20.5, top: 0x2d2c6c, hor: 0x8a5a8c, hs: 0x7a6aa8, hg: 0x4a3f60, hi: 0.6, dc: 0xa08ad0, di: 0.22, fog: 0x4a3f68, glass: 0x7a6a9c, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x6a5a90, amb: 0.05 },
    { h: 22,   top: 0x0b1236, hor: 0x26325f, hs: 0x6a7ab8, hg: 0x2e3358, hi: 0.78, dc: 0x8c9de0, di: 0.18, fog: 0x1c2447, glass: 0x4c5c9c, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x3a4570, amb: 0.0 },
    { h: 24,   top: 0x0b1236, hor: 0x26325f, hs: 0x6a7ab8, hg: 0x2e3358, hi: 0.78, dc: 0x8c9de0, di: 0.18, fog: 0x1c2447, glass: 0x4c5c9c, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x3a4570, amb: 0.0 }
  ];
  var COLOR_KEYS = ['top', 'hor', 'hs', 'hg', 'dc', 'fog', 'glass', 'cloud'];
  var NUM_KEYS = ['hi', 'di', 'beam', 'candle', 'lamp', 'amb'];
  var _ca = new T.Color(), _cb = new T.Color();

  function sampleEnv(hour, out) {
    var h = ((hour % 24) + 24) % 24, i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
    var a = KEYS[i], b = KEYS[i + 1], t = (h - a.h) / (b.h - a.h);
    t = t * t * (3 - 2 * t);
    for (var k = 0; k < COLOR_KEYS.length; k++) {
      var key = COLOR_KEYS[k];
      _ca.setHex(a[key]); _cb.setHex(b[key]);
      if (!out[key]) out[key] = new T.Color();
      out[key].copy(_ca).lerp(_cb, t);
    }
    for (k = 0; k < NUM_KEYS.length; k++) out[NUM_KEYS[k]] = a[NUM_KEYS[k]] + (b[NUM_KEYS[k]] - a[NUM_KEYS[k]]) * t;
    out.hour = h;
    out.day = out.amb;
    out.night = Math.max(0, Math.min(1, 1 - out.hi / 0.95 * 1.0 - out.di * 0.2 + 0.2));
    out.night = (h >= 20.5 || h < 5.2) ? 1 : (h > 19 ? (h - 19) / 1.5 : (h < 6.5 ? 1 - (h - 5) / 1.5 : 0));
    out.night = Math.max(0, Math.min(1, out.night));
    out.dusk = Math.max(0, 1 - Math.abs(h - 18.8) / 1.6) + Math.max(0, 1 - Math.abs(h - 6.4) / 1.0) * 0.8;
    // 태양 방향 (낮에는 높이, 해질녘에는 낮게)
    var el = Math.sin(PI * (h - 6) / 13) ; // 6시 0, 12.5시 1, 19시 0
    var elev = el > 0 ? el : 0.0;
    var azim = -0.9 + 1.8 * Math.max(0, Math.min(1, (h - 6) / 13));
    var moon = el <= 0;
    var e2 = moon ? 0.45 : 0.08 + elev * 1.2;
    out.sunDir = out.sunDir || [0, 1, 0];
    out.sunDir[0] = Math.sin(azim) * Math.cos(e2);
    out.sunDir[1] = Math.sin(e2);
    out.sunDir[2] = Math.cos(azim) * Math.cos(e2);
    out.moon = moon;
    return out;
  }

  function create(scene, opts) {
    var id = opts.church || 'basic';
    var builder = root.ChurchBuilders[id] || root.ChurchBuilders.basic;
    if (!root.ChurchBuilders[id]) id = 'basic';
    var layout = builder.layout || root.ChurchLayouts.get(id);
    var low = opts.quality === 'low';

    var ctx = root.ChurchKit.createContext({ layout: layout, quality: opts.quality });
    var S = ctx._;
    var ret = null;
    try { ret = builder.build(ctx); } catch (e) { if (root.console) console.error('[church] builder error', e); }
    if (ret) {
      if (ret.colliders) ret.colliders.forEach(function (c) { S.colliders.push(c); });
      if (ret.floorZones) ret.floorZones.forEach(function (z) { S.zones.push(z); });
      if (ret.group) ctx.root.add(ret.group);
    }
    var logic = root.ChurchLogic.create(layout, { colliders: S.colliders, zones: S.zones });

    var world = new T.Group();
    world.name = 'world-' + id;
    scene.add(world);
    world.add(ctx.root);
    var solidGroup = ctx.solid.build(ctx.mats.solid, 'solid');
    var glassGroup = ctx.glass.build(ctx.mats.glass, 'glass');
    var glowGroup = ctx.glow.build(ctx.mats.glow, 'glow');
    ctx.root.add(solidGroup); ctx.root.add(glassGroup); ctx.root.add(glowGroup);

    var stats = { vertices: (solidGroup.userData.vertexCount || 0) + (glassGroup.userData.vertexCount || 0) + (glowGroup.userData.vertexCount || 0), meshes: ctx.stats.meshes + solidGroup.children.length + glassGroup.children.length + glowGroup.children.length, colliders: S.colliders.length, seats: logic.seats.length };

    // ---- 조명 ----
    var bnd = layout.bounds, dim = Math.max(bnd.x1 - bnd.x0, bnd.z1 - bnd.z0);
    var hemi = new T.HemisphereLight(0xffffff, 0xcccccc, 0.9);
    var dirLight = new T.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 5);
    var candleLight = new T.PointLight(0xffa860, 0, 11, 1.4);
    scene.add(hemi); scene.add(dirLight); scene.add(candleLight);
    var bLight = null;
    if (S.lights.length) {
      var sl = S.lights[0];
      bLight = new T.PointLight(sl.color === undefined ? 0xffc27a : sl.color, 0, sl.distance || 14, 1.3);
      bLight.position.set(sl.x, sl.y, sl.z);
      scene.add(bLight);
    }
    scene.fog = new T.Fog(0xf6ead8, dim * 0.7, Math.max(110, dim * 2.4));

    // ---- 하늘 ----
    var skyGeo = new T.SphereGeometry(300, 24, 16);
    var skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
    skyGeo.setAttribute('color', new T.BufferAttribute(skyCol, 3));
    var sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10; sky.frustumCulled = false;
    scene.add(sky);
    var glowTex = ctx._getGlowTex();
    var sun = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xfff1c8, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    sun.scale.set(90, 90, 1); sun.renderOrder = -9; scene.add(sun);
    var moonSp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xdfe6ff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    moonSp.scale.set(34, 34, 1); moonSp.renderOrder = -9; scene.add(moonSp);
    var starGeo = new T.BufferGeometry(), sp = new Float32Array(260 * 3), srnd = G.rng(77);
    for (var i = 0; i < 260; i++) {
      var th = srnd() * PI * 2, ph = Math.acos(0.05 + srnd() * 0.95);
      sp[i * 3] = 280 * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = 280 * Math.cos(ph); sp[i * 3 + 2] = 280 * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
    var stars = new T.Points(starGeo, new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.renderOrder = -9; stars.frustumCulled = false; scene.add(stars);
    var cloudB = new G.Batch(31), crnd = G.rng(5);
    for (i = 0; i < 9; i++) {
      var ca = crnd() * PI * 2, cr = 170 + crnd() * 90, cy = 60 + crnd() * 55;
      for (var k = 0; k < 5; k++) cloudB.add(G.Geo.ico(1), 0xffffff, { x: Math.cos(ca) * cr + (k - 2) * 14 + crnd() * 6, y: cy + crnd() * 5, z: Math.sin(ca) * cr + crnd() * 8, sx: 16 + crnd() * 10, sy: 6 + crnd() * 3, sz: 12 + crnd() * 6, flat: true, vary: 0.03 });
    }
    var cloudMat = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
    var clouds = cloudB.build(cloudMat, 'clouds');
    scene.add(clouds);

    // ---- 창 빛줄기 ----
    var beamTex = G.canvasTexture(32, 64, function (g, w, h) {
      var img = g.createImageData(w, h);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var a = x / (w - 1), b = y / (h - 1);
        var edge = Math.min(1, Math.min(a, 1 - a) * 5);
        var v = edge * edge * (3 - 2 * edge) * (1 - 0.8 * b) * Math.min(1, (1 - b) * 4 + 0.2);
        var o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * v); img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, false);
    var patchTex = G.canvasTexture(32, 32, function (g, w, h) {
      var img = g.createImageData(w, h);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var a = Math.min(x, w - 1 - x) / (w / 2), b = Math.min(y, h - 1 - y) / (h / 2);
        var v = Math.min(1, a * 2.2) * Math.min(1, b * 2.2); v = v * v * (3 - 2 * v);
        var o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * v); img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, false);
    var beamMat = new T.MeshBasicMaterial({ map: beamTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: 0 });
    var patchMat = new T.MeshBasicMaterial({ map: patchTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: 0 });
    var bp = [], bu = [], bc = [], pp = [], pu = [], pc = [];
    var floorY0 = 0;
    S.beams.forEach(function (b, bi) {
      var n = b.face, nl = Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 1, nx = n[0] / nl, nz = n[1] / nl, ux = nz, uz = -nx;
      var alpha = b.dome ? 1.05 : 0.5, ca2 = Math.cos(alpha), sa2 = Math.sin(alpha), skew = b.dome ? 0 : 0.22;
      var dx = nx * ca2 + ux * skew * ca2, dz = nz * ca2 + uz * skew * ca2, dy = -sa2;
      var reach = b.reach || 11, w = b.w, hh = b.h;
      var colors = b.colors && b.colors.length ? b.colors : [0xfff1c0];
      var topY = b.y + hh / 2, botY = Math.max(0.4, b.y - hh / 2);
      var LT = Math.min(topY / sa2, reach / ca2), LB = Math.min(botY / sa2, reach / ca2);
      var sheets = low ? 1 : 3;
      for (var s = 0; s < sheets; s++) {
        var off = sheets === 1 ? 0 : (s - 1) * w * 0.34;
        var col = G.toColor(colors[(s + bi) % colors.length]).clone().multiplyScalar(0.36);
        var cx0 = b.x + ux * off, cz0 = b.z + uz * off;
        var T0 = [cx0, topY, cz0], B0 = [cx0, botY, cz0];
        var T1 = [cx0 + dx * LT, topY + dy * LT, cz0 + dz * LT], B1 = [cx0 + dx * LB, botY + dy * LB, cz0 + dz * LB];
        bp.push(T0[0], T0[1], T0[2], B0[0], B0[1], B0[2], B1[0], B1[1], B1[2], T0[0], T0[1], T0[2], B1[0], B1[1], B1[2], T1[0], T1[1], T1[2]);
        bu.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
        for (var q = 0; q < 6; q++) bc.push(col.r, col.g, col.b);
        if (s === 1 || sheets === 1) {
          // 바닥 빛무늬
          if (LB >= botY / sa2 - 1e-3 && LT >= topY / sa2 - 1e-3) {
            var pcol = G.toColor(colors[(s + bi + 1) % colors.length]).clone().multiplyScalar(0.36);
            var fy = floorY0 + 0.04, hw = w * 0.5;
            var q0 = [B1[0] - ux * hw, fy, B1[2] - uz * hw], q1 = [B1[0] + ux * hw, fy, B1[2] + uz * hw], q2 = [T1[0] + ux * hw, fy, T1[2] + uz * hw], q3 = [T1[0] - ux * hw, fy, T1[2] - uz * hw];
            pp.push(q0[0], q0[1], q0[2], q1[0], q1[1], q1[2], q2[0], q2[1], q2[2], q0[0], q0[1], q0[2], q2[0], q2[1], q2[2], q3[0], q3[1], q3[2]);
            pu.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
            for (q = 0; q < 6; q++) pc.push(pcol.r, pcol.g, pcol.b);
          }
        }
      }
    });
    function mkMesh(p, u, c, mat) {
      if (!p.length) return null;
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(p), 3));
      g.setAttribute('uv', new T.BufferAttribute(new Float32Array(u), 2));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(c), 3));
      var m = new T.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5; world.add(m); return m;
    }
    var beamMesh = mkMesh(bp, bu, bc, beamMat), patchMesh = mkMesh(pp, pu, pc, patchMat);

    // ---- 먼지 ----
    var dustN = low ? 0 : 70, dustPos = new Float32Array(dustN * 3), dustSeed = [], drnd = G.rng(91);
    for (i = 0; i < dustN; i++) {
      dustSeed.push([drnd() * 6.28, drnd() * 6.28, 0.2 + drnd() * 0.4]);
      dustPos[i * 3] = bnd.x0 * 0.7 + drnd() * (bnd.x1 - bnd.x0) * 0.7; dustPos[i * 3 + 1] = 1.2 + drnd() * 5; dustPos[i * 3 + 2] = bnd.z0 * 0.8 + drnd() * (bnd.z1 - bnd.z0) * 0.8;
    }
    var dustBase = dustPos.slice();
    var dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
    var dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xfff3cf, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    dust.frustumCulled = false;
    if (dustN) world.add(dust);

    // ---- 촛불대 ----
    var slots = logic.slots, nSlots = slots.length;
    var candleGeo = new T.CylinderGeometry(0.055, 0.06, 0.2, 7).translate(0, 0.1, 0);
    var candleMat = new T.MeshLambertMaterial({ color: 0xffffff });
    var candles = new T.InstancedMesh(candleGeo, candleMat, Math.max(1, nSlots));
    var cupGeo = new T.CylinderGeometry(0.085, 0.065, 0.09, 8).translate(0, 0.045, 0);
    var cups = new T.InstancedMesh(cupGeo, new T.MeshLambertMaterial({ color: 0x8f2a36 }), Math.max(1, nSlots));
    var m4 = new T.Matrix4(), zeroM = new T.Matrix4().makeScale(0, 0, 0), tc = new T.Color();
    var INTENT_COL = [0xfff0d8, 0xffd6e0, 0xd9ecff, 0xe6deff, 0xffe9a8, 0xd8f2d0, 0xffd2b0, 0xf0e0c8];
    var slotY0 = [];
    for (i = 0; i < nSlots; i++) {
      var floorH = logic.floorY(slots[i].x, slots[i].z);
      slotY0[i] = floorH + slots[i].y;
      m4.makeTranslation(slots[i].x, slotY0[i], slots[i].z); cups.setMatrixAt(i, m4);
      candles.setMatrixAt(i, zeroM); candles.setColorAt(i, tc.setHex(0xffffff));
    }
    cups.instanceMatrix.needsUpdate = true;
    candles.instanceMatrix.needsUpdate = true; if (candles.instanceColor) candles.instanceColor.needsUpdate = true;
    if (nSlots) { world.add(cups); world.add(candles); }
    var lit = {}, litCount = 0, flames = {};
    var flameMat = new T.SpriteMaterial({ map: ctx._getFlameTex(), blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false });

    function lightSlot(c) {
      var s = c.slot | 0;
      if (s < 0 || s >= nSlots) return;
      if (!lit[s]) litCount++;
      lit[s] = { intention: c.intention | 0, until: c.until || 0 };
      m4.makeTranslation(slots[s].x, slotY0[s] + 0.05, slots[s].z);
      candles.setMatrixAt(s, m4);
      candles.setColorAt(s, tc.setHex(INTENT_COL[(c.intention | 0) % 8]));
      candles.instanceMatrix.needsUpdate = true; candles.instanceColor.needsUpdate = true;
      if (!flames[s]) {
        var f = new T.Sprite(flameMat);
        f.scale.set(0.1, 0.16, 1); f.renderOrder = 6;
        f.position.set(slots[s].x, slotY0[s] + 0.3, slots[s].z);
        world.add(f); flames[s] = { sp: f, ph: Math.random() * 6.28 };
      }
      flames[s].sp.visible = true;
    }
    function unlightSlot(s) {
      if (!lit[s]) return;
      delete lit[s]; litCount--;
      candles.setMatrixAt(s, zeroM); candles.instanceMatrix.needsUpdate = true;
      if (flames[s]) flames[s].sp.visible = false;
    }

    // ---- 가까운 좌석/촛불 강조 ----
    var ringTex = G.canvasTexture(64, 64, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,230,150,0)'); gr.addColorStop(0.7, 'rgba(255,230,150,0.9)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, false);
    var seatRing = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), new T.MeshBasicMaterial({ map: ringTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    seatRing.rotation.x = -PI / 2; seatRing.visible = false; seatRing.renderOrder = 7; world.add(seatRing);
    var candleRing = new T.Sprite(new T.SpriteMaterial({ map: ringTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    candleRing.scale.set(0.5, 0.5, 1); candleRing.visible = false; candleRing.renderOrder = 7; world.add(candleRing);

    var env = {}, curHour = opts.hour === undefined ? 12 : opts.hour, clock = 0, envTimer = 99;
    var tmpC = new T.Color();
    var camPos = new T.Vector3();

    function applyEnv() {
      sampleEnv(curHour, env);
      hemi.color.copy(env.hs); hemi.groundColor.copy(env.hg); hemi.intensity = env.hi * 0.7;
      dirLight.color.copy(env.dc); dirLight.intensity = env.di * 0.75;
      dirLight.position.set(env.sunDir[0] * 40, Math.max(6, env.sunDir[1] * 40), env.sunDir[2] * 40);
      tmpC.copy(env.hor).lerp(env.fog, 0.35);
      scene.fog.color.copy(env.fog);
      if (opts.renderer) opts.renderer.setClearColor(env.hor);
      ctx.mats.glass.color.copy(env.glass);
      cloudMat.color.copy(env.cloud);
      // 하늘 정점색: 위(top) -> 지평선(hor) + 해 방향 번짐
      var pos = skyGeo.attributes.position, sd = env.sunDir, sunGlow = _ca.set(0xffb070);
      for (var v = 0; v < pos.count; v++) {
        var x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v), l = Math.sqrt(x * x + y * y + z * z);
        var yn = y / l, t = Math.max(0, yn); t = Math.pow(t, 0.7);
        var d = (x * sd[0] + y * sd[1] + z * sd[2]) / l;
        var g2 = d > 0 ? Math.pow(d, 6) * (0.25 + env.dusk * 0.6) * (env.night > 0.9 ? 0 : 1) : 0;
        var rr = env.hor.r + (env.top.r - env.hor.r) * t + sunGlow.r * g2;
        var gg = env.hor.g + (env.top.g - env.hor.g) * t + sunGlow.g * g2;
        var bb = env.hor.b + (env.top.b - env.hor.b) * t + sunGlow.b * g2;
        if (yn < 0) { rr = env.hor.r; gg = env.hor.g; bb = env.hor.b; }
        skyCol[v * 3] = rr; skyCol[v * 3 + 1] = gg; skyCol[v * 3 + 2] = bb;
      }
      skyGeo.attributes.color.needsUpdate = true;
      sun.visible = !env.moon; moonSp.visible = env.moon;
      sun.material.color.setHex(env.dusk > 0.3 ? 0xffb070 : 0xfff1c8);
      stars.material.opacity = env.night * 0.9;
      moonSp.material.opacity = Math.max(0.2, env.night);
      candleLight.userData.k = env.candle;
      if (bLight) { bLight.userData.k = S.lights[0].kind === 'always' ? 1 : env.lamp; }
      for (var gI = 0; gI < S.glows.length; gI++) {
        var gl = S.glows[gI];
        gl.sp.visible = gl.kind !== 'none';
        gl.k = gl.kind === 'always' ? 1 : (gl.kind === 'lamp' ? Math.max(0.25, env.lamp) : 1);
      }
      for (var hI = 0; hI < S.hourHooks.length; hI++) { try { S.hourHooks[hI](env); } catch (e) { /* ignore */ } }
    }
    applyEnv();

    var stand0 = (layout.candles && layout.candles.stands && layout.candles.stands[0]) || null;
    var cb = S.cameraBounds || { x0: bnd.x0, x1: bnd.x1, z0: bnd.z0, z1: bnd.z1, yMax: 9 };

    var api = {
      id: id, layout: layout, logic: logic, group: world, env: env, ctx: ctx, builder: builder, stats: stats,
      cameraBounds: { x0: cb.x0 !== undefined ? cb.x0 : bnd.x0, x1: cb.x1 !== undefined ? cb.x1 : bnd.x1, z0: cb.z0 !== undefined ? cb.z0 : bnd.z0, z1: cb.z1 !== undefined ? cb.z1 : bnd.z1, yMax: cb.yMax || 9 },
      hour: function () { return curHour; },
      setHour: function (h) { curHour = ((h % 24) + 24) % 24; applyEnv(); },
      setCandles: function (list) {
        var keep = {};
        (list || []).forEach(function (c) { keep[c.slot] = 1; lightSlot(c); });
        Object.keys(lit).forEach(function (s) { if (!keep[s]) unlightSlot(+s); });
      },
      lightCandle: lightSlot,
      isLit: function (s) { return !!lit[s]; },
      litCount: function () { return litCount; },
      setHighlight: function (seatId, slot) {
        if (seatId) {
          var sp2 = logic.seatPos(seatId);
          seatRing.position.set(sp2.x, sp2.y + 0.02, sp2.z); seatRing.visible = true;
        } else seatRing.visible = false;
        if (slot !== null && slot !== undefined && slots[slot]) {
          candleRing.position.set(slots[slot].x, slotY0[slot] + 0.2, slots[slot].z); candleRing.visible = true;
        } else candleRing.visible = false;
      },
      setSkyCenter: function (p) { sky.position.copy(p); sun.position.set(p.x + env.sunDir[0] * 250, p.y + env.sunDir[1] * 250, p.z + env.sunDir[2] * 250); moonSp.position.set(p.x - env.sunDir[0] * 200 * 0 + 60, p.y + 150, p.z + 200); stars.position.copy(p); clouds.position.set(p.x, 0, p.z); },
      update: function (dt, t, focus, camera) {
        clock += dt;
        envTimer += dt;
        curHour += dt / 3600;   // 실시간 흐름
        if (envTimer > 5) { envTimer = 0; applyEnv(); }
        // 불꽃
        for (var k in flames) {
          var f = flames[k];
          if (!f.sp.visible) continue;
          var fl = 1 + 0.18 * Math.sin(t * 13 + f.ph) + 0.1 * Math.sin(t * 23 + f.ph * 2);
          f.sp.scale.set(0.1 * (1 - 0.05 * (fl - 1)), 0.16 * fl, 1);
        }
        for (var i2 = 0; i2 < S.flames.length; i2++) {
          var ff = S.flames[i2], q = 1 + 0.16 * Math.sin(t * 12 + ff.phase) + 0.08 * Math.sin(t * 21 + ff.phase * 2);
          ff.sp.scale.set(ff.sx * (1.02 - 0.05 * (q - 1)), ff.sy * q, 1);
        }
        for (var g3 = 0; g3 < S.glows.length; g3++) {
          var gl = S.glows[g3];
          if (gl.kind === 'none') continue;
          gl.sp.material.opacity = gl.base * (gl.k === undefined ? 1 : gl.k) * (1 + gl.pulse * Math.sin(t * 2 + gl.phase));
        }
        // 촛불 빛: 가까운 촛불대로 이동
        if (stand0 && focus) {
          var best = null, bd = 1e9;
          layout.candles.stands.forEach(function (st2) { var d2 = (st2.x - focus.x) * (st2.x - focus.x) + (st2.z - focus.z) * (st2.z - focus.z); if (d2 < bd) { bd = d2; best = st2; } });
          var bf = best.face || [-1, 0]; candleLight.position.set(best.x + bf[0] * 0.9, 1.9, best.z + bf[1] * 0.9);
        }
        var cl = Math.min(1.4, 0.05 + litCount * 0.018) * (candleLight.userData.k === undefined ? 1 : candleLight.userData.k) * 1.4;
        candleLight.intensity = litCount ? cl : 0;
        if (bLight) bLight.intensity = (S.lights[0].intensity || 1) * (bLight.userData.k === undefined ? 1 : bLight.userData.k) * 1.2;
        // 빛줄기
        var bk = env.beam * (0.8 + 0.2 * Math.sin(clock * 0.6));
        if (beamMesh) beamMat.opacity = bk * 0.85;
        if (patchMesh) patchMat.opacity = bk * 0.9;
        dust.material.opacity = env.beam * 0.6;
        if (dustN && env.beam > 0.02) {
          var arr = dustGeo.attributes.position.array;
          for (var d = 0; d < dustN; d++) {
            var sd2 = dustSeed[d];
            arr[d * 3] = dustBase[d * 3] + Math.sin(clock * sd2[2] + sd2[0]) * 0.6;
            arr[d * 3 + 1] = dustBase[d * 3 + 1] + Math.sin(clock * sd2[2] * 0.7 + sd2[1]) * 0.5;
            arr[d * 3 + 2] = dustBase[d * 3 + 2] + Math.cos(clock * sd2[2] + sd2[1]) * 0.6;
          }
          dustGeo.attributes.position.needsUpdate = true;
        }
        clouds.rotation.y += dt * 0.0015;
        if (seatRing.visible) { var pl = 0.85 + 0.15 * Math.sin(t * 5); seatRing.scale.set(pl, pl, 1); }
        if (candleRing.visible) { var pl2 = 0.45 + 0.08 * Math.sin(t * 6); candleRing.scale.set(pl2, pl2, 1); }
        for (var h2 = 0; h2 < S.updateHooks.length; h2++) S.updateHooks[h2](dt, t);
        if (camera) api.setSkyCenter(camera.position);
      },
      dispose: function () {
        [world, sky, sun, moonSp, stars, clouds, hemi, dirLight, candleLight, bLight].forEach(function (o) {
          if (!o) return;
          scene.remove(o);
          if (o.traverse) o.traverse(function (n) {
            if (n.geometry && n.geometry.dispose) n.geometry.dispose();
            if (n.material) { var ms = Array.isArray(n.material) ? n.material : [n.material]; ms.forEach(function (m) { if (m.map && m.map.dispose && m.map !== glowTex) m.map.dispose(); m.dispose && m.dispose(); }); }
          });
        });
      }
    };
    return api;
  }

  root.ChurchWorld = { create: create, sampleEnv: sampleEnv, KEYS: KEYS };
})(typeof window !== 'undefined' ? window : this);
