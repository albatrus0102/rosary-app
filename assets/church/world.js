/* world.js — 월드 코어: 빌더 실행, 물리 기반 조명, 태양 그림자, 하늘/시간대, 창 빛줄기·색 빛무늬, 촛불대, 먼지, 바닥 반사(Reflector).
   ChurchWorld.create(scene, opts) */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, PI = Math.PI;

  // ---- 시간대 키프레임 (실제 건축 사진 톤: 낮은 채도의 따뜻한 돌, 강한 명암) ----
  // hi: 반구광, di/dc: 태양(달) 세기/색, exp: 노출, envK: 환경광 세기, gk: 유리 발광, beam: 빛줄기
  var KEYS = [
    { h: 0,    top: 0x040810, hor: 0x121a38, hs: 0x3a4a80, hg: 0x1a1d30, hi: 0.85, dc: 0x7f90d0, di: 0.6, fog: 0x0d1228, glass: 0x35467f, gk: 0.9, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x2a3560, amb: 0.0, exp: 1.3, envK: 0.32 },
    { h: 5,    top: 0x040810, hor: 0x121a38, hs: 0x3a4a80, hg: 0x1a1d30, hi: 0.85, dc: 0x7f90d0, di: 0.6, fog: 0x0d1228, glass: 0x35467f, gk: 0.9, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x2a3560, amb: 0.0, exp: 1.3, envK: 0.32 },
    { h: 6.5,  top: 0x7f9fd0, hor: 0xffc79a, hs: 0xffe6cf, hg: 0x9a8268, hi: 1.0, dc: 0xffc590, di: 2.4, fog: 0xd9baa0, glass: 0xd0b8a8, gk: 0.9, beam: 0.6, candle: 0.55, lamp: 0.55, cloud: 0xffdcc8, amb: 0.5, exp: 1.0, envK: 1.1 },
    { h: 9,    top: 0x6ea6e6, hor: 0xe2ecf5, hs: 0xdfe9ff, hg: 0xa8987e, hi: 1.25, dc: 0xfff1da, di: 6.5, fog: 0xc7d0da, glass: 0xffffff, gk: 0.85, beam: 1, candle: 0.3, lamp: 0.3, cloud: 0xffffff, amb: 1, exp: 0.95, envK: 1.6 },
    { h: 16,   top: 0x6ea6e6, hor: 0xe8e8e8, hs: 0xe8ecff, hg: 0xa8987e, hi: 1.25, dc: 0xffe9c8, di: 6.2, fog: 0xcbd0d6, glass: 0xffffff, gk: 0.85, beam: 1, candle: 0.3, lamp: 0.3, cloud: 0xffffff, amb: 1, exp: 0.95, envK: 1.6 },
    { h: 17.7, top: 0x8d9fdc, hor: 0xffb98a, hs: 0xffddc0, hg: 0x8a7058, hi: 0.95, dc: 0xffb36e, di: 5.6, fog: 0xe0b8a0, glass: 0xffc8a0, gk: 1.0, beam: 0.9, candle: 0.55, lamp: 0.55, cloud: 0xffd6c6, amb: 0.8, exp: 1.0, envK: 1.2 },
    { h: 19,   top: 0x5a4b92, hor: 0xff8a66, hs: 0xffb08c, hg: 0x6a5060, hi: 0.6, dc: 0xff8a50, di: 2.4, fog: 0xa87a88, glass: 0xd89a8c, gk: 1.1, beam: 0.3, candle: 0.85, lamp: 0.85, cloud: 0xf0a8b8, amb: 0.3, exp: 1.08, envK: 0.7 },
    { h: 20.5, top: 0x1c1c52, hor: 0x5a4072, hs: 0x6a5a98, hg: 0x2e2840, hi: 0.7, dc: 0x9080c0, di: 0.7, fog: 0x2f2750, glass: 0x5a4f88, gk: 0.95, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x5a4a88, amb: 0.05, exp: 1.2, envK: 0.28 },
    { h: 22,   top: 0x040810, hor: 0x121a38, hs: 0x3a4a80, hg: 0x1a1d30, hi: 0.85, dc: 0x7f90d0, di: 0.6, fog: 0x0d1228, glass: 0x35467f, gk: 0.9, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x2a3560, amb: 0.0, exp: 1.3, envK: 0.32 },
    { h: 24,   top: 0x040810, hor: 0x121a38, hs: 0x3a4a80, hg: 0x1a1d30, hi: 0.85, dc: 0x7f90d0, di: 0.6, fog: 0x0d1228, glass: 0x35467f, gk: 0.9, beam: 0, candle: 1.0, lamp: 1.0, cloud: 0x2a3560, amb: 0.0, exp: 1.3, envK: 0.32 }
  ];
  var COLOR_KEYS = ['top', 'hor', 'hs', 'hg', 'dc', 'fog', 'glass', 'cloud'];
  var NUM_KEYS = ['hi', 'di', 'gk', 'beam', 'candle', 'lamp', 'amb', 'exp', 'envK'];
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
    out.night = (h >= 20.5 || h < 5.2) ? 1 : (h > 19 ? (h - 19) / 1.5 : (h < 6.5 ? 1 - (h - 5) / 1.5 : 0));
    out.night = Math.max(0, Math.min(1, out.night));
    out.dusk = Math.max(0, 1 - Math.abs(h - 18.8) / 1.6) + Math.max(0, 1 - Math.abs(h - 6.4) / 1.0) * 0.8;
    // 태양 경로(성당 방위: 제대=동쪽(-z), 입구=서쪽(+z), 오른쪽 벽(+x)=남쪽): 아침 제대 뒤에서 떠서 정오에 +x(남쪽) 높이, 저녁 입구 쪽으로 진다. 최고 고도 약 55도.
    var el = Math.sin(PI * (h - 6) / 13);
    var elev = el > 0 ? el : 0.0;
    var phi = PI * Math.max(0, Math.min(1, (h - 6) / 13));
    var moon = el <= 0;
    var e2 = moon ? 0.5 : 0.07 + elev * 0.9;
    out.sunDir = out.sunDir || [0, 1, 0];
    out.sunDir[0] = (moon ? -0.5 : Math.sin(phi)) * Math.cos(e2);
    out.sunDir[1] = Math.sin(e2);
    out.sunDir[2] = (moon ? 0.8 : -Math.cos(phi)) * Math.cos(e2);
    out.moon = moon;
    return out;
  }

  var REFLECTOR_SHADER = {
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0.4 } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;\n#include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){ vUv = textureMatrix * vec4(position, 1.0); vWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: 'uniform vec3 color; uniform sampler2D tDiffuse; uniform float strength; varying vec4 vUv; varying vec3 vWorld;\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\n vec4 base = texture2DProj(tDiffuse, vUv);\n float f = pow(1.0 - clamp(normalize(cameraPosition - vWorld).y, 0.0, 1.0), 3.0);\n float a = clamp(strength * (0.16 + 0.84 * f), 0.0, 1.0);\n gl_FragColor = vec4(base.rgb * color, a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
  };

  function create(scene, opts) {
    var id = opts.church || 'basic';
    var builder = root.ChurchBuilders[id] || root.ChurchBuilders.basic;
    if (!root.ChurchBuilders[id]) id = 'basic';
    var layout = builder.layout || root.ChurchLayouts.get(id);
    var tier = opts.quality === 'low' ? 'low' : (opts.quality === 'mid' ? 'mid' : 'high');
    var low = tier === 'low';
    // 성당별 룩 프리셋(looks.js, LOOK_DEV.md): 조명 배율·톤·블룸·먼지
    var look = root.ChurchLooks ? root.ChurchLooks.get(id) : null, lookV = {};

    var ctx = root.ChurchKit.createContext({ layout: layout, quality: low ? 'low' : 'high' });
    ctx.view = opts.view || null;   // 감상실(ch_glass) 매개변수: 창 크기·빛 상태(GlassView 가 소유)
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
    var items = [];
    try { items = ctx._prepare(); } catch (e) { if (root.console) console.error('[church] prepare error', e); }
    var vcount = 0, mcount = ctx.stats.meshes;
    var shadowCasters = [];
    items.forEach(function (it) {
      var grp = it.batch.build(it.material, it.name, { cast: it.cast, receive: it.receive });
      if (it.decal) grp.children.forEach(function (m) { m.renderOrder = 3; });
      if (it.name === 'glass' || it.name === 'glow') grp.children.forEach(function (m) { m.renderOrder = 1; });
      if (it.name === 'glassRefl' || it.name === 'aodecal') grp.userData.noAO = true;
      if (it.name === 'glassRefl') grp.children.forEach(function (m) { m.renderOrder = 4; });
      ctx.root.add(grp);
      vcount += grp.userData.vertexCount || 0; mcount += grp.children.length;
    });
    // 바닥 판·평면 메쉬도 그림자를 받는다
    var stats = { vertices: vcount, meshes: mcount, colliders: S.colliders.length, seats: logic.seats.length };

    // ---- 조명 ----
    var bnd = layout.bounds, dim = Math.max(bnd.x1 - bnd.x0, bnd.z1 - bnd.z0);
    var cbx = S.cameraBounds || {};
    var hemi = new T.HemisphereLight(0xffffff, 0x888888, 0.4);
    var dirLight = new T.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 30, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.bias = -0.0004; dirLight.shadow.normalBias = 0.035;
    var target = new T.Object3D(); target.position.set((bnd.x0 + bnd.x1) / 2, 0, (bnd.z0 + bnd.z1) / 2);
    scene.add(target); dirLight.target = target;
    var candleLight = new T.PointLight(0xffa860, 0, 12, 2);
    scene.add(hemi); scene.add(dirLight); scene.add(candleLight);
    var bLight = null;
    if (S.lights.length) {
      var sl = S.lights[0];
      bLight = new T.PointLight(sl.color === undefined ? 0xffc27a : sl.color, 0, (sl.distance || 14) * 1.2, 2);
      bLight.position.set(sl.x, sl.y, sl.z);
      scene.add(bLight);
    }
    var sceneFog = new T.Fog(0xc7d0da, dim * 0.8, Math.max(130, dim * 2.6));
    scene.fog = sceneFog;
    var yMax = (S.cameraBounds && S.cameraBounds.yMax) || 14;

    // ---- 하늘 ----
    var skyGeo = new T.SphereGeometry(300, 24, 16);
    var skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
    skyGeo.setAttribute('color', new T.BufferAttribute(skyCol, 3));
    var sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    // 하늘은 불투명 목록의 맨 마지막에 그린다(깊이 시험으로 가려진 화소는 건너뛴다: 실내에서는 거의 전부). 예전 -10(맨 먼저)은 매 패스 전 화면을 한 번 더 칠했다.
    sky.renderOrder = 1000; sky.frustumCulled = false;
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
    var clouds = cloudB.build(cloudMat, 'clouds', { receive: false });
    scene.add(clouds);

    // ---- 창 빛줄기 + 색 빛무늬 (태양 방향에 맞춰 매 시간대 갱신) ----
    var noiseTex = G.canvasTexture(64, 128, function (g, w, h) {
      var img = g.createImageData(w, h);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var a = x / (w - 1), b = y / (h - 1);
        var edge = Math.min(1, Math.min(a, 1 - a) * 4.5); edge = edge * edge * (3 - 2 * edge);
        var streak = 0.75 + 0.25 * Math.sin(a * 23 + Math.sin(b * 6) * 2) * Math.sin(a * 9 + 1);
        var v = edge * streak * (1 - 0.7 * b) * Math.min(1, (1 - b) * 4 + 0.15);
        var o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * Math.max(0, v)); img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, false, true);
    var patchTex = G.canvasTexture(32, 32, function (g, w, h) {
      var img = g.createImageData(w, h);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var a = Math.min(x, w - 1 - x) / (w / 2), b = Math.min(y, h - 1 - y) / (h / 2);
        var v = Math.min(1, a * 2.4) * Math.min(1, b * 2.4); v = v * v * (3 - 2 * v);
        var o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * v); img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, false, true);
    var beamMat = new T.MeshBasicMaterial({ map: noiseTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: 1 });
    var patchMat = new T.MeshBasicMaterial({ map: patchTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    var beamList = [], SHEETS = low ? 1 : 3;
    S.beams.forEach(function (b, bi) {
      var n = b.face, nl = Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 1;
      beamList.push({ b: b, nx: n[0] / nl, nz: n[1] / nl, bi: bi, colors: (b.colors && b.colors.length ? b.colors : [0xfff1c0]).map(function (c) { return G.toColor(c).clone(); }) });
    });
    var nB = beamList.length;
    var bpArr = new Float32Array(nB * SHEETS * 18), bcArr = new Float32Array(nB * SHEETS * 18), buArr = new Float32Array(nB * SHEETS * 12);
    var ppArr = new Float32Array(nB * 18), pcArr = new Float32Array(nB * 18), puArr = new Float32Array(nB * 12);
    for (i = 0; i < nB * SHEETS; i++) buArr.set([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], i * 12);
    for (i = 0; i < nB; i++) puArr.set([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], i * 12);
    function mkBeamMesh(p, u, c, mat) {
      if (!p.length) return null;
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(p, 3));
      g.setAttribute('uv', new T.BufferAttribute(u, 2));
      g.setAttribute('color', new T.BufferAttribute(c, 3));
      var m = new T.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5; world.add(m); return m;
    }
    var beamMesh = mkBeamMesh(bpArr, buArr, bcArr, beamMat), patchMesh = mkBeamMesh(ppArr, puArr, pcArr, patchMat);
    var floorY0 = 0;
    var Lv = new T.Vector3();
    function updateBeams(env) {
      if (!nB) return;
      for (var bi = 0; bi < nB; bi++) {
        var e = beamList[bi], b = e.b, nx = e.nx, nz = e.nz, ux = nz, uz = -nx;
        var dx, dy, dz, vis;
        if (b.dome) {
          var al = 1.05; dx = nx * Math.cos(al); dz = nz * Math.cos(al); dy = -Math.sin(al); vis = env.beam * 0.85;
        } else {
          Lv.set(-env.sunDir[0], -env.sunDir[1], -env.sunDir[2]).normalize();
          dx = Lv.x; dy = Lv.y; dz = Lv.z;
          var cosI = dx * nx + dz * nz;               // 실내로 들어오는 방향 성분
          vis = (dy < -0.02 && !env.moon) ? Math.max(0, Math.min(1, (cosI - 0.08) * 2.4)) * env.beam : 0;
        }
        var hz = Math.sqrt(dx * dx + dz * dz) || 1e-3, sa2 = Math.max(0.05, -dy), reach = b.reach || 12, w = b.w, hh = b.h;
        var topY = b.y + hh / 2, botY = Math.max(0.3, b.y - hh / 2);
        var LT = Math.min(topY / sa2, reach / hz), LB = Math.min(botY / sa2, reach / hz);
        var colors = e.colors;
        for (var s = 0; s < SHEETS; s++) {
          var off = SHEETS === 1 ? 0 : (s - (SHEETS - 1) / 2) * w * 0.4;
          var col = colors[(s + bi) % colors.length];
          var cx0 = b.x + ux * off, cz0 = b.z + uz * off;
          var o = (bi * SHEETS + s) * 18;
          var T0 = [cx0, topY, cz0], B0 = [cx0, botY, cz0];
          var T1 = [cx0 + dx * LT, topY + dy * LT, cz0 + dz * LT], B1 = [cx0 + dx * LB, botY + dy * LB, cz0 + dz * LB];
          var P6 = [T0, B0, B1, T0, B1, T1];
          for (var q = 0; q < 6; q++) {
            bpArr[o + q * 3] = P6[q][0]; bpArr[o + q * 3 + 1] = P6[q][1]; bpArr[o + q * 3 + 2] = P6[q][2];
            bcArr[o + q * 3] = col.r * 0.75 * vis; bcArr[o + q * 3 + 1] = col.g * 0.75 * vis; bcArr[o + q * 3 + 2] = col.b * 0.75 * vis;
          }
          if (s === (SHEETS === 1 ? 0 : 1)) {
            var po = bi * 18, hw = w * 0.5, fy = floorY0 + 0.03;
            var pcol = colors[(bi + 1) % colors.length];
            var floorHit = (LB >= botY / sa2 - 1e-3 && LT >= topY / sa2 - 1e-3);
            var f2 = floorHit ? vis : 0;
            var Q6 = [[B1[0] - ux * hw, fy, B1[2] - uz * hw], [B1[0] + ux * hw, fy, B1[2] + uz * hw], [T1[0] + ux * hw, fy, T1[2] + uz * hw], [B1[0] - ux * hw, fy, B1[2] - uz * hw], [T1[0] + ux * hw, fy, T1[2] + uz * hw], [T1[0] - ux * hw, fy, T1[2] - uz * hw]];
            for (q = 0; q < 6; q++) {
              ppArr[po + q * 3] = Q6[q][0]; ppArr[po + q * 3 + 1] = Q6[q][1]; ppArr[po + q * 3 + 2] = Q6[q][2];
              pcArr[po + q * 3] = pcol.r * 0.8 * f2; pcArr[po + q * 3 + 1] = pcol.g * 0.8 * f2; pcArr[po + q * 3 + 2] = pcol.b * 0.8 * f2;
            }
          }
        }
      }
      if (beamMesh) { beamMesh.geometry.attributes.position.needsUpdate = true; beamMesh.geometry.attributes.color.needsUpdate = true; }
      if (patchMesh) { patchMesh.geometry.attributes.position.needsUpdate = true; patchMesh.geometry.attributes.color.needsUpdate = true; }
    }

    // ---- 먼지 ----
    var dustN = low ? 0 : (look ? look.dust : 90), dustPos = new Float32Array(dustN * 3), dustSeed = [], drnd = G.rng(91);
    for (i = 0; i < dustN; i++) {
      dustSeed.push([drnd() * 6.28, drnd() * 6.28, 0.2 + drnd() * 0.4]);
      dustPos[i * 3] = bnd.x0 * 0.7 + drnd() * (bnd.x1 - bnd.x0) * 0.7; dustPos[i * 3 + 1] = 1.2 + drnd() * 5; dustPos[i * 3 + 2] = bnd.z0 * 0.8 + drnd() * (bnd.z1 - bnd.z0) * 0.8;
    }
    var dustBase = dustPos.slice();
    var dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
    var dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xfff3cf, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    dust.frustumCulled = false;
    if (dustN) world.add(dust);

    // ---- 촛불대 ----
    var slots = logic.slots, nSlots = slots.length;
    var candleGeo = new T.CylinderGeometry(0.05, 0.055, 0.2, 10).translate(0, 0.1, 0);
    var candleMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    var candles = new T.InstancedMesh(candleGeo, candleMat, Math.max(1, nSlots));
    var cupGeo = new T.CylinderGeometry(0.075, 0.055, 0.09, 12).translate(0, 0.045, 0);
    var cupMat = new T.MeshPhysicalMaterial({ color: 0x7a1822, roughness: 0.15, metalness: 0.1, clearcoat: 0.8 });
    var cups = new T.InstancedMesh(cupGeo, cupMat, Math.max(1, nSlots));
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
    candles.castShadow = false; cups.castShadow = false;
    if (nSlots) { world.add(cups); world.add(candles); }
    var lit = {}, litCount = 0, flames = {};
    var flameMat = new T.SpriteMaterial({ map: ctx._getFlameTex(), color: new T.Color(1.6, 1.4, 1.0), blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false });

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

    // ---- 바닥 반사(Reflector, 고화질 전용) ----
    var reflectors = [];
    function buildReflectors(renderer) {
      if (!root.ThreeX || !root.ThreeX.Reflector || reflectors.length || !S.floors.length) return;
      var dpr = renderer ? renderer.getPixelRatio() : 1;
      var W = Math.max(256, Math.round((root.innerWidth || 800) * dpr * 0.5)), H = Math.max(256, Math.round((root.innerHeight || 450) * dpr * 0.5));
      S.floors.forEach(function (f) {
        var r = new root.ThreeX.Reflector(new T.PlaneGeometry(f.x1 - f.x0, f.z1 - f.z0), { textureWidth: W, textureHeight: H, clipBias: 0.003, color: 0xffffff, shader: REFLECTOR_SHADER, multisample: 0 });
        r.material.transparent = true; r.material.depthWrite = false; r.material.polygonOffset = true; r.material.polygonOffsetFactor = -2; r.material.polygonOffsetUnits = -2;
        r.material.uniforms.strength.value = f.strength * (look ? look.reflK : 1);
        r.rotation.x = -PI / 2; r.position.set((f.x0 + f.x1) / 2, f.y + 0.006, (f.z0 + f.z1) / 2); r.renderOrder = 2;
        r.userData.reflector = true;
        world.add(r); reflectors.push(r);
      });
    }
    function disposeReflectors() {
      reflectors.forEach(function (r) { world.remove(r); if (r.dispose) r.dispose(); if (r.getRenderTarget) { var rt = r.getRenderTarget(); if (rt) rt.dispose(); } });
      reflectors.length = 0;
    }

    var env = {}, curHour = opts.hour === undefined ? 12 : opts.hour, clock = 0, envTimer = 99;
    var tmpC = new T.Color();
    var lastSunKey = '';
    var fitV = new T.Vector3(), fitR = new T.Vector3(), fitU = new T.Vector3(), fitF = new T.Vector3(), upV = new T.Vector3(0, 1, 0);
    function fitShadow() {
      var sd = env.sunDir, D = Math.max(60, dim * 1.6);
      fitF.set(-sd[0], -sd[1], -sd[2]).normalize();
      fitR.crossVectors(fitF, upV); if (fitR.lengthSq() < 1e-6) fitR.set(1, 0, 0); fitR.normalize();
      fitU.crossVectors(fitR, fitF).normalize();
      var minR = 1e9, maxR = -1e9, minU = 1e9, maxU = -1e9, minF = 1e9, maxF = -1e9;
      var x0 = bnd.x0 - 1, x1 = bnd.x1 + 1, z0 = bnd.z0 - 2, z1 = bnd.z1 + 2, yy1 = yMax + 2;
      for (var xi = 0; xi < 2; xi++) for (var yi = 0; yi < 2; yi++) for (var zi = 0; zi < 2; zi++) {
        fitV.set(xi ? x1 : x0, yi ? yy1 : -0.2, zi ? z1 : z0).sub(target.position);
        var r = fitV.dot(fitR), u = fitV.dot(fitU), f = fitV.dot(fitF);
        minR = Math.min(minR, r); maxR = Math.max(maxR, r); minU = Math.min(minU, u); maxU = Math.max(maxU, u); minF = Math.min(minF, f); maxF = Math.max(maxF, f);
      }
      dirLight.position.set(target.position.x + sd[0] * D, target.position.y + sd[1] * D, target.position.z + sd[2] * D);
      var cam = dirLight.shadow.camera;
      cam.left = minR; cam.right = maxR; cam.bottom = minU; cam.top = maxU; cam.near = Math.max(0.5, D + minF - 2); cam.far = D + maxF + 2;
      cam.updateProjectionMatrix();
      dirLight.updateMatrixWorld(); target.updateMatrixWorld();
      dirLight.shadow.needsUpdate = true;
      api.shadowDirty = true;   // render.js: 그림자 맵은 이때만 다시 그린다(해가 움직일 때, 5초마다·시간 바꿀 때)
    }
    var envTex = null;
    var lkC = new T.Color();
    // 룩 적용: 시간대 값에 곱하고 섞는다. 감상 모드(사진 창)에서는 적용하지 않는다(그때 env.grade 는 null).
    function applyLook() {
      env.grade = null; env.dustK = 1; env.dustNight = 0;
      if (!look || api.viewMode) return;
      var L = root.ChurchLooks.blend(look, env.night, lookV);
      env.di *= L.keyK; if (L.keyTintK) env.dc.lerp(lkC.setHex(look.keyTint), L.keyTintK);
      env.hi *= L.ambK; if (L.ambTintK) { env.hs.lerp(lkC.setHex(look.ambTint), L.ambTintK); env.hg.lerp(lkC, L.ambTintK * 0.5); }
      env.exp *= L.expK; env.envK *= L.envK; env.lamp *= L.lampK; env.candle *= L.candleK; env.beam *= L.beamK;
      if (L.fogTintK) env.fog.lerp(lkC.setHex(look.fogTint), L.fogTintK);
      env.grade = L; env.dustK = L.dustK; env.dustNight = L.dustNight;
    }

    function applyEnv() {
      sampleEnv(curHour, env);
      if (S.envOverride) { try { S.envOverride(env, curHour); } catch (e) { if (root.console) console.warn('[church] envOverride', e); } }
      applyLook();
      var hiT = tier !== 'low';   // 후처리(톤·블룸)가 있는 단계
      hemi.color.copy(env.hs); hemi.groundColor.copy(env.hg); hemi.intensity = env.hi * (hiT ? 1 : 1.3);
      dirLight.color.copy(env.dc); dirLight.intensity = env.di * (hiT ? 1 : 0.35);
      fitShadow();
      sceneFog.color.copy(env.fog);
      if (opts.renderer) opts.renderer.setClearColor(env.hor);
      ctx.mats.glass.color.copy(env.glass).multiplyScalar(env.gk);
      cloudMat.color.copy(env.cloud);
      for (var pm = 0; pm < S.physMats.length; pm++) { var p = S.physMats[pm]; p.m.envMapIntensity = p.envK * env.envK; }
      cupMat.envMapIntensity = env.envK;
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
        skyCol[v * 3] = rr * 1.6; skyCol[v * 3 + 1] = gg * 1.6; skyCol[v * 3 + 2] = bb * 1.6;
      }
      skyGeo.attributes.color.needsUpdate = true;
      sun.visible = !env.moon; moonSp.visible = env.moon;
      sun.material.color.setHex(env.dusk > 0.3 ? 0xffb070 : 0xfff1c8).multiplyScalar(2.2);
      stars.material.opacity = env.night * 0.9;
      moonSp.material.opacity = Math.max(0.2, env.night);
      candleLight.userData.k = env.candle;
      if (bLight) { bLight.userData.k = S.lights[0].kind === 'always' ? 1 : env.lamp; }
      for (var gI = 0; gI < S.glows.length; gI++) {
        var gl = S.glows[gI];
        gl.sp.visible = gl.kind !== 'none';
        gl.k = gl.kind === 'always' ? 1 : (gl.kind === 'lamp' ? Math.max(0.25, env.lamp) : 1);
      }
      updateBeams(env);
      for (var hI = 0; hI < S.hourHooks.length; hI++) { try { S.hourHooks[hI](env); } catch (e) { /* ignore */ } }
    }

    var stand0 = (layout.candles && layout.candles.stands && layout.candles.stands[0]) || null;
    var cb = S.cameraBounds || { x0: bnd.x0, x1: bnd.x1, z0: bnd.z0, z1: bnd.z1, yMax: 9 };

    var api = {
      id: id, layout: layout, logic: logic, group: world, env: env, look: look, ctx: ctx, builder: builder, stats: stats, tier: tier, scene: scene,
      cameraBounds: { x0: cb.x0 !== undefined ? cb.x0 : bnd.x0, x1: cb.x1 !== undefined ? cb.x1 : bnd.x1, z0: cb.z0 !== undefined ? cb.z0 : bnd.z0, z1: cb.z1 !== undefined ? cb.z1 : bnd.z1, yMax: cb.yMax || 9 },
      reflectorCount: function () { return reflectors.length; },
      hour: function () { return curHour; },
      setHour: function (h) { curHour = ((h % 24) + 24) % 24; applyEnv(); },
      // PMREM 환경 텍스처 연결
      setEnvironment: function (tex) { envTex = tex; scene.environment = tex; },
      // 'high' | 'mid' | 'low' 전환: 그림자(high·mid)·바닥 반사(high)·코팅(high·mid)·먼지(high·mid) on/off
      setTier: function (t, renderer) {
        tier = t === 'low' ? 'low' : (t === 'mid' ? 'mid' : 'high'); api.tier = tier;
        var hi = tier !== 'low';
        dirLight.castShadow = hi && !api.viewMode;
        if (tier === 'high' && !api.viewMode) buildReflectors(renderer); else disposeReflectors();
        for (var pm = 0; pm < S.physMats.length; pm++) {
          var p = S.physMats[pm];
          if (p.m.clearcoat !== undefined) { var want = hi ? p.cc : 0; if (p.m.clearcoat !== want) { p.m.clearcoat = want; p.m.needsUpdate = true; } }
          p.m.needsUpdate = true;
        }
        beamMat.needsUpdate = true;
        api.shadowDirty = true;
        if (dust) dust.visible = hi && !api.viewMode;
        if (env && env.sunDir) applyEnv();
      },
      // 창 감상 모드(G-07): 그림자·바닥 반사·안개·먼지·빛줄기를 끈다(사진 창 색을 바꾸지 않게, 정지 시 그리지 않게).
      viewMode: false,
      setViewMode: function (on, renderer) {
        on = !!on; api.viewMode = on;
        dirLight.castShadow = !on && tier !== 'low';
        scene.fog = on ? null : sceneFog;
        if (on) disposeReflectors(); else if (tier === 'high') buildReflectors(renderer);
        if (dust) dust.visible = !on && tier !== 'low';
        api.shadowDirty = true;
        if (beamMesh) beamMesh.visible = !on;
        if (patchMesh) patchMesh.visible = !on;
        if (env && env.sunDir) applyEnv();
      },
      // 감상실의 창 자리(ch_glass 가 정한다): {x,y,z 중심, nx,nz 실내 방향, w,h, depth}
      viewSlot: S.viewSlot || null,
      // 이 성당 빌더가 만든 창 자리(ctx.window / ctx.rose): 'church' 감상 모드용. {x,y(중심),z,nx,nz,w,h,kind}
      windowSlots: function () {
        var out = [];
        S.windows.forEach(function (o) {
          if (o.painted) return;
          var rise = o.top === 'pointed' ? o.w * 0.72 : (o.top === 'round' || o.top === 'trefoil' ? o.w / 2 : 0);
          var gd = o.host ? -Math.min(0.28, o.host.t * 0.5) : 0.04;
          out.push({ kind: 'window', x: o.x + o.F.nx * (gd + 0.012), y: o.y + (o.h + rise) / 2, z: o.z + o.F.nz * (gd + 0.012), nx: o.F.nx, nz: o.F.nz, w: o.w, h: o.h + rise });
        });
        S.roses.forEach(function (o) { out.push({ kind: 'rose', x: o.x + o.F.nx * 0.06, y: o.y, z: o.z + o.F.nz * 0.06, nx: o.F.nx, nz: o.F.nz, w: o.r * 2, h: o.r * 2 }); });
        return out;
      },
      // G-29: 진본 사진 창을 걸 자리(빌더가 ctx.window/ctx.rose 에 photo 를 넘겼거나 ctx.glassSlot 으로 알린 것).
      // {win, slot, index, shape, x, y(중심), z, nx, nz(실내 방향), w, h}. 판은 절차적 유리 1.2cm 앞.
      glassSlots: function () {
        var out = [];
        function add(o, s) { s.win = o.photo.win; s.slot = o.photo.slot; s.index = o.photo.index; s.shape = o.photo.shape; out.push(s); }
        S.windows.forEach(function (o) {
          if (o.painted || !o.photo) return;
          var rise = o.top === 'pointed' ? o.w * 0.72 : (o.top === 'round' || o.top === 'trefoil' ? o.w / 2 : 0);
          var gd = (o.host ? -Math.min(0.28, o.host.t * 0.5) : 0.04) + 0.012;
          add(o, { x: o.x + o.F.nx * gd, y: o.y + (o.h + rise) / 2, z: o.z + o.F.nz * gd, nx: o.F.nx, nz: o.F.nz, w: o.w, h: o.h + rise });
        });
        S.roses.forEach(function (o) { if (o.photo) add(o, { x: o.x + o.F.nx * 0.052, y: o.y, z: o.z + o.F.nz * 0.052, nx: o.F.nx, nz: o.F.nz, w: o.r * 2, h: o.r * 2 }); });
        (S.glassSlots || []).forEach(function (s) { out.push(s); });
        return out;
      },
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
      setSkyCenter: function (p) { sky.position.copy(p); sun.position.set(p.x + env.sunDir[0] * 250, p.y + env.sunDir[1] * 250, p.z + env.sunDir[2] * 250); moonSp.position.set(p.x + 60, p.y + 150, p.z + 200); stars.position.copy(p); clouds.position.set(p.x, 0, p.z); },
      update: function (dt, t, focus, camera) {
        clock += dt;
        envTimer += dt;
        curHour += dt / 3600;
        if (envTimer > 5) { envTimer = 0; applyEnv(); }
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
        if (stand0 && focus) {
          var best = null, bd = 1e9;
          layout.candles.stands.forEach(function (st2) { var d2 = (st2.x - focus.x) * (st2.x - focus.x) + (st2.z - focus.z) * (st2.z - focus.z); if (d2 < bd) { bd = d2; best = st2; } });
          var bf = best.face || [-1, 0]; candleLight.position.set(best.x + bf[0] * 0.9, 1.9, best.z + bf[1] * 0.9);
        }
        var cl = Math.min(60, 8 + litCount * 1.2) * (candleLight.userData.k === undefined ? 1 : candleLight.userData.k);
        candleLight.intensity = litCount ? cl : 0;
        if (bLight) bLight.intensity = (S.lights[0].intensity || 1) * 22 * (bLight.userData.k === undefined ? 1 : bLight.userData.k);
        var bk = 0.85 + 0.15 * Math.sin(clock * 0.6);
        if (beamMesh) { beamMat.opacity = bk * (tier !== 'low' ? 0.8 : 1); beamMesh.visible = !api.viewMode; }
        if (patchMesh) patchMat.opacity = (tier !== 'low' ? 0.7 : 1) * bk;
        dust.material.opacity = api.viewMode ? 0 : Math.min(1, env.beam * 0.7 * (env.dustK || 1) + (env.dustNight || 0) * env.night);
        if (dustN && dust.material.opacity > 0.02) {
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
        disposeReflectors();
        [world, sky, sun, moonSp, stars, clouds, hemi, dirLight, target, candleLight, bLight].forEach(function (o) {
          if (!o) return;
          scene.remove(o);
          if (o.traverse) o.traverse(function (n) {
            if (n.geometry && n.geometry.dispose) n.geometry.dispose();
            if (n.material) { var ms = Array.isArray(n.material) ? n.material : [n.material]; ms.forEach(function (m) { ['map', 'normalMap', 'roughnessMap', 'emissiveMap'].forEach(function (k) { if (m[k] && m[k].dispose && m[k] !== glowTex) m[k].dispose(); }); m.dispose && m.dispose(); }); }
          });
        });
        if (dirLight.shadow && dirLight.shadow.map) dirLight.shadow.map.dispose();
      }
    };
    applyEnv();
    api.setTier(tier, opts.renderer);
    return api;
  }

  root.ChurchWorld = { create: create, sampleEnv: sampleEnv, KEYS: KEYS };
})(typeof window !== 'undefined' ? window : this);
