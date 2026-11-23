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
    vertexShader: 'uniform mat4 textureMatrix; attribute float aK; varying float vK; varying vec4 vUv; varying vec3 vWorld;\n#include <common>\n#include <logdepthbuf_pars_vertex>\nvoid main(){ vK = aK; vUv = textureMatrix * vec4(position, 1.0); vWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: 'uniform vec3 color; uniform sampler2D tDiffuse; uniform float strength; varying float vK; varying vec4 vUv; varying vec3 vWorld;\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\n vec4 base = texture2DProj(tDiffuse, vUv);\n float f = pow(1.0 - clamp(normalize(cameraPosition - vWorld).y, 0.0, 1.0), 3.0);\n float a = clamp(strength * vK * (0.16 + 0.84 * f), 0.0, 1.0);\n gl_FragColor = vec4(base.rgb * color, a);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
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

    // 미리 구운 AO(ao_fx.js, RENDER_V3.md §2): 높음·보통의 성당(감상실 제외)은 정점 색에 근사 AO 를 굽지 않고 ao_<성당>.js 를 붙인다
    var tierCfg = root.ChurchRender && root.ChurchRender.TIERS ? root.ChurchRender.TIERS : null;
    var aoDefer = !low && !builder.viewing && !!root.ChurchAOFx && !!(tierCfg ? tierCfg[tier].aoBake : true);
    var ctx = root.ChurchKit.createContext({ layout: layout, quality: low ? 'low' : 'high', aoDefer: aoDefer });
    ctx.view = opts.view || null;   // 감상실(ch_glass) 매개변수: 창 크기·빛 상태(GlassView 가 소유)
    var S = ctx._;
    var ret = null;
    try { ret = builder.build(ctx); } catch (e) { if (root.console) console.error('[church] builder error', e); }
    if (ret) {
      if (ret.colliders) ret.colliders.forEach(function (c) { S.colliders.push(c); });
      if (ret.floorZones) ret.floorZones.forEach(function (z) { S.zones.push(z); });
      if (ret.group) ctx.root.add(ret.group);
    }
    if (root.ChurchShrine && !builder.viewing) { try { root.ChurchShrine.build(ctx, layout); } catch (e) { /* 성모 기도 자리(shrine.js) */ } }
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
      var grp = it.batch.build(it.material, it.name, { cast: it.cast, receive: it.receive, spatial: true });
      it.group = grp;
      if (it.decal) grp.children.forEach(function (m) { m.renderOrder = 3; });
      if (it.name === 'glass' || it.name === 'glow') grp.children.forEach(function (m) { m.renderOrder = 1; });
      if (it.name === 'glassRefl' || it.name === 'aodecal') grp.userData.noAO = true;
      if (it.name === 'glassRefl') grp.children.forEach(function (m) { m.renderOrder = 4; });
      ctx.root.add(grp);
      vcount += grp.userData.vertexCount || 0; mcount += grp.children.length;
    });
    // 바닥 판·평면 메쉬도 그림자를 받는다
    var stats = { vertices: vcount, meshes: mcount, colliders: S.colliders.length, seats: logic.seats.length };
    // 여러 층(빌더 levelVis = {levels:[{id,y0,y1}], items:{층 id:[묶음 이름 'surf_…'…]}}): 보는 사람(아바타·카메라) 높이가 그 층 범위 안일 때만 그 층 묶음을 그린다.
    // 다른 층 실내는 그리지 않아 draw call·삼각형이 더해지지 않는다. cam_guard·AO·탐침은 만들 때(전부 보일 때) 한 번 모은다.
    var levelVis = null;
    if (builder.levelVis && logic.multi) {
      levelVis = { def: builder.levelVis, groups: {}, viewer: null, key: '' };
      items.forEach(function (it) {
        Object.keys(builder.levelVis.items || {}).forEach(function (lid) {
          if (builder.levelVis.items[lid].indexOf(it.name) >= 0) (levelVis.groups[lid] = levelVis.groups[lid] || []).push(it.group);
        });
      });
    }
    function applyLevelVis(camY) {
      if (!levelVis) return;
      var ys = [camY], key = '';
      if (levelVis.viewer !== null) ys.push(levelVis.viewer);
      levelVis.def.levels.forEach(function (L) {
        var on = false;
        for (var q = 0; q < ys.length; q++) if (ys[q] >= L.y0 && ys[q] <= L.y1) on = true;
        key += on ? '1' : '0'; L._on = on;
      });
      if (key === levelVis.key) return;
      levelVis.key = key;
      levelVis.def.levels.forEach(function (L) { (levelVis.groups[L.id] || []).forEach(function (g) { g.visible = L._on; }); });
      // 층을 정한 빛 무리 스프라이트(addGlow level): 그 층을 볼 때만(다른 층에서는 바닥에 가려 보이지 않는데 draw call 만 든다)
      var on = {}; levelVis.def.levels.forEach(function (L) { on[L.id] = L._on; });
      S.glows.forEach(function (gl) { if (gl.level !== undefined) { gl.off = !on[gl.level]; gl.sp.visible = gl.kind !== 'none' && !gl.off; } });
    }
    // 여러 층 룩(빌더 levelLook = [{ y0, y1, expK, ambK, ambTint, ambTintK, light }]): 층마다 노출·반구광(세기·색)을 따로 둔다 — 창 없는 하부 성당·묘소에
    // 눈이 적응한 듯 밝게(성당 룩 looks.js 위에 곱한다). y0..y1 = 그 층 값을 그대로 쓰는 발 높이 띠, 띠 사이(계단)는 높이로 선형 보간 → 계단을 오르내리면 서서히 바뀐다.
    // 순간 이동('가기')도 시간 상수 0.6초로 따라간다. light = 그 층의 빌더 점광원(자리·색·세기·거리·kind): 점광원은 늘 하나(addLight)이고
    // 보는 층이 바뀌면 0.25초에 꺼졌다가 그 층 자리로 옮겨 0.5초에 켜진다(광원 수·셰이더 프로그램 그대로). levelLook 이 없는 성당은 예전 그대로.
    var levelLook = null, LL_TAU = 0.6;
    if (builder.levelLook && logic.multi) {
      levelLook = { def: builder.levelLook.slice().sort(function (a, b) { return a.y0 - b.y0; }), cur: null, li: -2, fade: 1, base: { exp: 1, hi: 0, hs: new T.Color(), hg: new T.Color() }, tg: { expK: 1, ambK: 1, tintK: 0, tint: new T.Color() }, tc: new T.Color() };
    }
    function llSample(y, out) {
      var E = levelLook.def, a = E[0], b = E[0], t = 0;
      if (y >= E[E.length - 1].y0) a = b = E[E.length - 1];
      else for (var i = 0; i < E.length; i++) {
        if (y <= E[i].y1) { a = b = E[i]; break; }
        if (i + 1 < E.length && y < E[i + 1].y0) { a = E[i]; b = E[i + 1]; t = (y - a.y1) / Math.max(1e-6, b.y0 - a.y1); break; }
      }
      function v(o, k, d) { return o[k] === undefined ? d : o[k]; }
      out.expK = v(a, 'expK', 1) + (v(b, 'expK', 1) - v(a, 'expK', 1)) * t;
      out.ambK = v(a, 'ambK', 1) + (v(b, 'ambK', 1) - v(a, 'ambK', 1)) * t;
      out.tintK = v(a, 'ambTintK', 0) + (v(b, 'ambTintK', 0) - v(a, 'ambTintK', 0)) * t;
      out.tint.setHex(v(a, 'ambTint', 0xffffff)).lerp(levelLook.tc.setHex(v(b, 'ambTint', 0xffffff)), t);
      return out;
    }
    // 그 높이에서 점광원을 둘 층(띠가 가장 가까운 층; 그 층에 light 가 없으면 -1)
    function llLightIdx(y) {
      var E = levelLook.def, best = -1, bd = 1e9;
      for (var i = 0; i < E.length; i++) { var d = y < E[i].y0 ? E[i].y0 - y : (y > E[i].y1 ? y - E[i].y1 : 0); if (d < bd) { bd = d; best = i; } }
      return best >= 0 && E[best].light ? best : -1;
    }
    // applyEnv 가 시간대·성당 룩으로 정한 값(바탕)을 적어 둔다 — 층 배율은 프레임마다 이 바탕에 곱한다
    function llBase() {
      if (!levelLook) return;
      var B = levelLook.base; B.exp = env.exp; B.hi = hemi.intensity; B.hs.copy(hemi.color); B.hg.copy(hemi.groundColor);
      if (levelLook.cur) llApply();
    }
    function llApply() {
      var B = levelLook.base, C = levelLook.cur;
      env.exp = B.exp * C.expK;
      hemi.intensity = B.hi * C.ambK;
      hemi.color.copy(B.hs).lerp(C.tint, C.tintK); hemi.groundColor.copy(B.hg).lerp(C.tint, C.tintK * 0.5);
    }
    function llUpdate(dt, camera) {
      var y = levelVis && levelVis.viewer !== null ? levelVis.viewer : (camera ? camera.position.y - 1.6 : 0);
      var tg = llSample(y, levelLook.tg);
      if (!levelLook.cur) levelLook.cur = { expK: tg.expK, ambK: tg.ambK, tintK: tg.tintK, tint: tg.tint.clone() };
      else {
        var k = Math.min(1, Math.max(0, dt) / LL_TAU), C = levelLook.cur;
        C.expK += (tg.expK - C.expK) * k; C.ambK += (tg.ambK - C.ambK) * k; C.tintK += (tg.tintK - C.tintK) * k; C.tint.lerp(tg.tint, k);
      }
      llApply();
      if (!bLight) return;
      var want = llLightIdx(y);
      if (levelLook.li === -2) { levelLook.li = want; levelLook.fade = 1; llPlace(); }
      else if (want !== levelLook.li) { levelLook.fade -= dt / 0.25; if (levelLook.fade <= 0) { levelLook.fade = 0; levelLook.li = want; llPlace(); } }
      else levelLook.fade = Math.min(1, levelLook.fade + dt / 0.5);
    }
    function llPlace() {
      var sl = levelLook.li >= 0 ? levelLook.def[levelLook.li].light : null;
      if (!sl) return;
      bSpec = sl;
      bLight.position.set(sl.x, sl.y, sl.z); bLight.color.setHex(sl.color === undefined ? 0xffc27a : sl.color); bLight.distance = (sl.distance || 14) * 1.2;
    }

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
    var bLight = null, bSpec = S.lights[0] || null;   // bSpec: 지금 점광원의 자리·세기(여러 층 룩이 층마다 바꾼다)
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
      // fb: 빛무늬가 닿는 바닥 높이 — 여러 층 성당은 창 안쪽 1.5m 의 맨 위 바닥(창이 있는 층), 한 층은 0(예전 그대로)
      beamList.push({ b: b, nx: n[0] / nl, nz: n[1] / nl, bi: bi, fb: logic.multi ? logic.floorY(b.x + n[0] / nl * 1.5, b.z + n[1] / nl * 1.5) : 0, colors: (b.colors && b.colors.length ? b.colors : [0xfff1c0]).map(function (c) { return G.toColor(c).clone(); }) });
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
        if (b.dome && !softOn) {
          var al = 1.05; dx = nx * Math.cos(al); dz = nz * Math.cos(al); dy = -Math.sin(al); vis = env.beam * 0.85;
        } else {
          Lv.set(-env.sunDir[0], -env.sunDir[1], -env.sunDir[2]).normalize();
          dx = Lv.x; dy = Lv.y; dz = Lv.z;
          var cosI = dx * nx + dz * nz;               // 실내로 들어오는 방향 성분
          vis = (dy < -0.02 && !env.moon) ? Math.max(0, Math.min(1, (cosI - 0.08) * 2.4)) * env.beam : 0;
        }
        var hz = Math.sqrt(dx * dx + dz * dz) || 1e-3, sa2 = Math.max(0.05, -dy), reach = b.reach || 12, w = b.w, hh = b.h;
        var fb0 = e.fb || 0, topY = b.y + hh / 2, botY = Math.max(fb0 + 0.3, b.y - hh / 2);
        var LT = Math.min((topY - fb0) / sa2, reach / hz), LB = Math.min((botY - fb0) / sa2, reach / hz);
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
            var po = bi * 18, hw = w * 0.5, fy = floorY0 + fb0 + 0.03;
            var pcol = colors[(bi + 1) % colors.length];
            var floorHit = (LB >= (botY - fb0) / sa2 - 1e-3 && LT >= (topY - fb0) / sa2 - 1e-3);
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
      if (shafts && softOn) shafts.updateMotes();
    }
    // 부드러운 빛줄기·먼지(shaft_fx.js, RENDER_V4.md §3): high·mid 는 같은 판 기하를 render.js fx 패스(그림자 맵·깊이로 가림)에서 그린다. low 는 위의 가산 판 그대로.
    var shafts = null, softOn = false, reducedMotion = false;
    try { reducedMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reducedMotion = false; }
    if (beamMesh && root.ChurchShafts && tierCfg && !builder.viewing && !/[?&]shafts=0/.test((root.location && root.location.search) || '')) {
      var mN = tierCfg[tier].motes || 0;
      if (look && !(look.dust > 0)) mN = 0;
      try { shafts = root.ChurchShafts.create({ geometry: beamMesh.geometry, profile: noiseTex, nMotes: low ? 0 : Math.max(mN, tierCfg.high.motes || 0), rng: G.rng(93) }); } catch (e) { if (root.console) console.warn('[church] shafts', e); shafts = null; }
      if (shafts) shafts.reduced = reducedMotion;
    }

    // ---- 먼지 ----
    var dustN = (low || shafts) ? 0 : (look ? look.dust : 90), dustPos = new Float32Array(dustN * 3), dustSeed = [], drnd = G.rng(91);
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
    var candleMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, emissive: 0x6a3a14, emissiveIntensity: 0.55 });   // 켜진 초만 보인다(꺼진 칸은 배율 0): 촛농이 불빛에 따뜻하게 물든다
    var candles = new T.InstancedMesh(candleGeo, candleMat, Math.max(1, nSlots));
    var cupGeo = new T.CylinderGeometry(0.075, 0.055, 0.09, 12).translate(0, 0.045, 0);
    // 컵 = 살짝 비치는 색유리. 인스턴스 색 = 유리색, 인스턴스 속성 aGlow(0 꺼짐 / 1 켜짐) = 안쪽 불빛이 유리를 물들이는 자체발광(draw call +0).
    var cupMat = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.05, clearcoat: 0.9, transparent: true, opacity: 0.86 });
    cupMat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vColor.rgb * vGlow * 1.25;');
    };
    var cups = new T.InstancedMesh(cupGeo, cupMat, Math.max(1, nSlots));
    var cupGlow = new T.InstancedBufferAttribute(new Float32Array(Math.max(1, nSlots)), 1);
    cupGeo.setAttribute('aGlow', cupGlow);
    var m4 = new T.Matrix4(), zeroM = new T.Matrix4().makeScale(0, 0, 0), tc = new T.Color();
    // 봉헌초 색(번호는 서버·저장소와 같아 바꾸지 않는다): 0 흰/투명 1 루비 빨강 2 황금 노랑 3 코발트 파랑 4 에메랄드 초록 5 로즈 분홍 6 보라 7 호박. 값 = 컵(유리)색. 촛농은 항상 상아색.
    // 색마다 정해진 뜻은 붙이지 않는다(가톨릭에 색-지향 규정 없음).
    var CANDLE_COLORS = [0xe4ecee, 0xc01c34, 0xf2b929, 0x2c62d2, 0x1f9d5c, 0xea7aa2, 0x8b5bd4, 0xe58a1f];
    var CUP_DEFAULT = 0xc01c34, CUP_EMPTY = 0x9aa4a8, WAX_IVORY = 0xfff3dc, DIM = 0.5;
    function dimC(hex, k) { tc.setHex(hex); tc.multiplyScalar(k); return tc; }
    var slotY0 = [], floats = [], tv = new T.Vector3(), CANDLE_CHECK = 0;
    for (i = 0; i < nSlots; i++) {
      var floorH = logic.floorY(slots[i].x, slots[i].z, slots[i].fy);   // 여러 층: 스탠드가 선 층(fy). 한 층은 세 번째 인자를 무시한다
      slotY0[i] = floorH + slots[i].y;
      m4.makeTranslation(slots[i].x, slotY0[i], slots[i].z);
      if (slots[i].float) { floats.push(i); m4.copy(zeroM); }   // 물 위에 뜬 초: 붉은 유리 받침 없이 납작한 초(원반)만 뜬다
      cups.setMatrixAt(i, m4); cups.setColorAt(i, dimC(CUP_EMPTY, 0.38));
      candles.setMatrixAt(i, zeroM); candles.setColorAt(i, tc.setHex(0xffffff));
    }
    cups.instanceMatrix.needsUpdate = true; if (cups.instanceColor) cups.instanceColor.needsUpdate = true;
    candles.instanceMatrix.needsUpdate = true; if (candles.instanceColor) candles.instanceColor.needsUpdate = true;
    candles.castShadow = false; cups.castShadow = false;
    if (nSlots) { world.add(cups); world.add(candles); }
    var lit = {}, litCount = 0;
    // 모든 불꽃(봉헌초 + 제단·촛대)을 InstancedMesh 하나로(kit.js createFlameBatch): 촛불을 켜도 draw call 이 늘지 않는다. 인스턴스 0..nSlots-1 = 봉헌초 칸.
    var fb = root.ChurchKit.createFlameBatch(nSlots + S.flames.length);
    for (i = 0; i < nSlots; i++) fb.alloc();
    var altarFlames = S.flames.map(function (h) { var idx = fb.alloc(); h._i = idx; h._v = false; return h; });
    function syncAltarFlames() {
      for (var q = 0; q < altarFlames.length; q++) {
        var h = altarFlames[q];
        if (h.visible === h._v) continue;
        h._v = h.visible;
        if (h.visible) fb.set(h._i, h.x, h.y, h.z, 1.3 * h.scale, h.phase, 0, 0); else fb.clear(h._i);
      }
    }
    syncAltarFlames();
    var f = fb.mesh; f.renderOrder = 6;   // 불꽃은 사진 판(glass_place.js)·빛줄기 뒤, 표식·이름표 앞
    ctx.root.add(f);
    try { if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) fb.setReducedMotion(true); } catch (e) { /* 없으면 그대로 */ }
    // 내 초 표시: 인스턴스 속성 하나(aMine: 0 남의 초 / 1 내 초(받침 금빛 고리) / 2 방금 켠 내 초(맥동 고리 + 큰 불꽃)). 내 초 목록은 기기에만 둔다(localStorage, 24시간).
    var clockT = 0, mineKey = 'rosarium_mine_' + id, mineMap = {};
    try { mineMap = JSON.parse((root.localStorage && root.localStorage.getItem(mineKey)) || '{}') || {}; } catch (e) { mineMap = {}; }
    function saveMine() { try { if (root.localStorage) root.localStorage.setItem(mineKey, JSON.stringify(mineMap)); } catch (e) { /* 저장 불가 */ } }
    var labelSp = null, labelT0 = -99;
    function showMineLabel(s) {
      if (!labelSp) {
        var tex = G.canvasTexture(128, 48, function (g, w2, h2) {
          g.fillStyle = 'rgba(40,24,6,0.78)'; g.beginPath(); g.moveTo(14, 4); g.arcTo(w2 - 4, 4, w2 - 4, h2 - 4, 18); g.arcTo(w2 - 4, h2 - 4, 4, h2 - 4, 18); g.arcTo(4, h2 - 4, 4, 4, 18); g.arcTo(4, 4, w2 - 4, 4, 18); g.fill();
          g.strokeStyle = '#ffd36a'; g.lineWidth = 3; g.stroke();
          g.fillStyle = '#ffe9a8'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('내 초', w2 / 2, h2 / 2 + 1);
        }, false);
        labelSp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
        labelSp.scale.set(0.42, 0.16, 1); labelSp.renderOrder = 9; labelSp.visible = false; world.add(labelSp);
      }
      labelSp.position.set(slots[s].x, slotY0[s] + 0.62, slots[s].z); labelSp.material.opacity = 1; labelSp.visible = true; labelT0 = clockT;
    }
    function flameAt(s, x, z, y, fresh) {
      var f0 = slots[s].float, ml = lit[s] ? lit[s].mine : 0;
      fb.set(s, x, y + (f0 ? 0.19 : 0.34), z, f0 ? 0.95 : 1.15, (s * 2.399) % 6.28, f0 ? 0.34 : 0.4, f0 ? 0.19 : 0.34, fresh ? clockT : (lit[s] ? lit[s].t0 : -100), ml);
    }

    function lightSlot(c, fresh) {
      var s = c.slot | 0;
      if (s < 0 || s >= nSlots) return;
      var prev = lit[s], isNew = !prev, mine = prev ? prev.mine : 0;
      if (!prev) litCount++;
      if (c.mine) {
        if (mine !== 2 && fresh) { mine = 2; fresh = true; } else if (!mine) mine = 1;
        mineMap[s] = c.until || (Date.now() + 864e5); saveMine();
      } else if (!prev && mineMap[s] && (mineMap[s] > Date.now())) mine = 1;
      var col = (c.color === undefined || c.color === null || !(c.color >= 0 && c.color < CANDLE_COLORS.length)) ? -1 : (c.color | 0);
      lit[s] = { intention: c.intention | 0, until: c.until || 0, color: col, mine: mine, t0: (fresh && (isNew || mine === 2)) ? clockT : (prev ? prev.t0 : -100) };
      fresh = !!(fresh && (isNew || (c.mine && mine === 2)));
      if (fresh && mine === 2) showMineLabel(s);
      var fl0 = slots[s].float;   // 뜬 초는 납작한 원반 초(반지름 0.09, 높이 0.08)
      m4.makeTranslation(slots[s].x, slotY0[s] + (fl0 ? 0 : 0.05), slots[s].z);
      if (fl0) m4.scale(tv.set(1.7, 0.4, 1.7));
      candles.setMatrixAt(s, m4);
      candles.setColorAt(s, tc.setHex(WAX_IVORY));
      cups.setColorAt(s, tc.setHex(col >= 0 ? CANDLE_COLORS[col] : CUP_DEFAULT)); cups.instanceColor.needsUpdate = true;
      cupGlow.setX(s, 1); cupGlow.needsUpdate = true;
      candles.instanceMatrix.needsUpdate = true; candles.instanceColor.needsUpdate = true;
      flameAt(s, slots[s].x, slots[s].z, slotY0[s], false);
      // 촛불을 막 켠 순간(RENDER_V4 §7): 0.4초 동안 그 자리 둘레가 따뜻하게 밝아진다(봉헌대 점광원 세기 +60% 봉우리 + 그 컵의 자체발광). 화면 번쩍임이 아니다.
      if (fresh && isNew && !fl0) { flare.s = s; flare.t0 = clockT; flare.on = true; }
    }
    var flare = { s: -1, t0: -99, on: false, e: 0 };
    // 불꽃 위 아지랑이(RENDER_V4 §6): 카메라 5m 안, 화면 안에 있는 불꽃 가운데 가까운 4개 → render.js 최종 패스가 그 위 좁은 기둥만 아주 조금 흔든다. 움직임 줄이기·low 면 없음
    var hazeOut = [{ x: 0, y: 0, size: 0, k: 0 }, { x: 0, y: 0, size: 0, k: 0 }, { x: 0, y: 0, size: 0, k: 0 }, { x: 0, y: 0, size: 0, k: 0 }], hazeD = [9, 9, 9, 9], hzV = new T.Vector3();
    function hazeTry(cam, x, y, z, tf) {
      var dx = x - cam.position.x, dy = y - cam.position.y, dz = z - cam.position.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 25) return;
      var d = Math.sqrt(d2), slot = -1;
      for (var q = 0; q < 4; q++) if (d < hazeD[q] && (slot < 0 || hazeD[q] > hazeD[slot])) slot = q;
      if (slot < 0) return;
      hzV.set(x, y, z).project(cam);
      if (hzV.z > 1 || hzV.x < -1.1 || hzV.x > 1.1 || hzV.y < -1.1 || hzV.y > 1.0) return;
      var o = hazeOut[slot];
      hazeD[slot] = d; o.x = hzV.x * 0.5 + 0.5; o.y = hzV.y * 0.5 + 0.5;
      o.size = 0.09 * tf / (d * 2 * Math.tan(cam.fov * PI / 360));   // 불꽃 위 9cm 를 화면 높이 비율로
      o.k = 1 - Math.max(0, Math.min(1, (d - 2.5) / 2.5));
    }
    function updateHaze(cam) {
      for (var q = 0; q < 4; q++) { hazeD[q] = 9; hazeOut[q].k = 0; }
      if (reducedMotion || tier === 'low' || api.viewMode) return;
      for (var ls in lit) { var si = +ls; if (slots[si].float) continue; hazeTry(cam, slots[si].x, slotY0[si] + 0.42, slots[si].z, 1); }
      for (var q2 = 0; q2 < altarFlames.length; q2++) { var hf = altarFlames[q2]; if (hf.visible) hazeTry(cam, hf.x, hf.y + 0.08 * hf.scale, hf.z, hf.scale || 1); }
    }
    function flareEnv(e) { return e < 0 ? 0 : (e < 0.07 ? e / 0.07 : Math.exp(-(e - 0.07) / 0.12)); }
    function unlightSlot(s) {
      if (!lit[s]) return;
      var oc = lit[s].color;   // 다 탄 컵은 유리색을 그대로 두되 어둡게(안쪽 불빛 없음)
      delete lit[s]; litCount--;
      if (mineMap[s]) { delete mineMap[s]; saveMine(); }
      candles.setMatrixAt(s, zeroM); candles.instanceMatrix.needsUpdate = true;
      cups.setColorAt(s, (oc >= 0 ? dimC(CANDLE_COLORS[oc], DIM) : dimC(CUP_EMPTY, 0.38))); cups.instanceColor.needsUpdate = true;
      cupGlow.setX(s, 0); cupGlow.needsUpdate = true;
      fb.clear(s);
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
      // 높이가 3cm 안으로 같은 바닥들은 거울 평면 하나(반사 렌더 1번)로 묶는다(PERF_SCALE.md §2): 예전에는 바닥마다 장면 전체를 한 번씩 더 그렸다.
      // 1.2cm 높은 제단 구역 바닥이 반사에서 2.4cm 어긋나는 것은 보이지 않는다. 바닥마다 세기가 다르면 정점 값(aK)으로 넘긴다.
      var groups = [];
      S.floors.forEach(function (f) {
        var g = null;
        for (var i = 0; i < groups.length; i++) if (Math.abs(groups[i].y - f.y) <= 0.03) { g = groups[i]; break; }
        if (!g) groups.push(g = { y: f.y, fl: [] });
        g.fl.push(f);
      });
      groups.forEach(function (g) {
        var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        g.fl.forEach(function (f) { x0 = Math.min(x0, f.x0); x1 = Math.max(x1, f.x1); z0 = Math.min(z0, f.z0); z1 = Math.max(z1, f.z1); });
        var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, n = g.fl.length;
        var pos = new Float32Array(n * 12), kk = new Float32Array(n * 4), idx = [];
        g.fl.forEach(function (f, i) {
          // 반사판 지역 좌표(XY 평면, +Z 가 위): x = 월드 x, y = -월드 z, z = 높이 차
          var c = [[f.x0, f.z1], [f.x1, f.z1], [f.x1, f.z0], [f.x0, f.z0]];
          for (var k = 0; k < 4; k++) { pos[i * 12 + k * 3] = c[k][0] - cx; pos[i * 12 + k * 3 + 1] = -(c[k][1] - cz); pos[i * 12 + k * 3 + 2] = f.y - g.y; kk[i * 4 + k] = f.strength; }
          idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
        });
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aK', new T.BufferAttribute(kk, 1)); geo.setIndex(idx);
        var r = new root.ThreeX.Reflector(geo, { textureWidth: W, textureHeight: H, clipBias: 0.003, color: 0xffffff, shader: REFLECTOR_SHADER, multisample: 0 });
        r.material.transparent = true; r.material.depthWrite = false; r.material.polygonOffset = true; r.material.polygonOffsetFactor = -2; r.material.polygonOffsetUnits = -2;
        r.material.uniforms.strength.value = look ? look.reflK : 1;
        r.rotation.x = -PI / 2; r.position.set(cx, g.y + 0.006, cz); r.renderOrder = 2;
        r.userData.reflector = true; r.userData.floors = n;
        world.add(r); reflectors.push(r);
      });
    }
    function disposeReflectors() {
      reflectors.forEach(function (r) { world.remove(r); if (r.dispose) r.dispose(); if (r.getRenderTarget) { var rt = r.getRenderTarget(); if (rt) rt.dispose(); } if (r.geometry) r.geometry.dispose(); });
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
      // render.js: 그림자 맵은 이때만 다시 그린다. 예전에는 5초마다(applyEnv) 무조건 다시 그려 걷는 중 5초마다 한 프레임이 튀었다(2048² 맵 + 모든 그림자 물체).
      // 이제 해 방향이 0.35° 넘게 움직였을 때만(실시간 시계로 약 1.5분마다) 또는 시간·단계를 바꿀 때만 다시 그린다. 맵은 그린 때의 행렬로 계속 읽으므로 어긋나지 않는다.
      var dd = sd[0] * shDir[0] + sd[1] * shDir[1] + sd[2] * shDir[2];
      if (shForce || dd < SHADOW_COS) { shDir[0] = sd[0]; shDir[1] = sd[1]; shDir[2] = sd[2]; shForce = false; api.shadowDirty = true; }
    }
    var shDir = [0, 0, 0], shForce = true, SHADOW_COS = Math.cos(0.35 * PI / 180);
    var envTex = null;
    var lkC = new T.Color();
    // 룩 적용: 시간대 값에 곱하고 섞는다. 감상 모드(사진 창)에서는 적용하지 않는다(그때 env.grade 는 null).
    function applyLook() {
      env.grade = null; env.dustK = 1; env.dustNight = 0; env.glassK = 1; env.photoK = 1; env.photoWin = null;
      if (!look || api.viewMode) return;
      var L = root.ChurchLooks.blend(look, env.night, lookV);
      env.di *= L.keyK; if (L.keyTintK) env.dc.lerp(lkC.setHex(look.keyTint), L.keyTintK);
      env.hi *= L.ambK; if (L.ambTintK) { env.hs.lerp(lkC.setHex(look.ambTint), L.ambTintK); env.hg.lerp(lkC, L.ambTintK * 0.5); }
      env.exp *= L.expK; env.envK *= L.envK; env.lamp *= L.lampK; env.candle *= L.candleK; env.beam *= L.beamK;
      if (L.fogTintK) env.fog.lerp(lkC.setHex(look.fogTint), L.fogTintK);
      env.grade = L; env.dustK = L.dustK; env.dustNight = L.dustNight;
      env.glassK = L.glassK; env.photoK = L.photoK; env.photoWin = look.photoWin || null;   // 유리 밝기(looks.js 한 곳)
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
      ctx.mats.glass.color.copy(env.glass).multiplyScalar(env.gk * (env.glassK || 1));
      cloudMat.color.copy(env.cloud);
      for (var pm = 0; pm < S.physMats.length; pm++) { var p = S.physMats[pm]; p.m.envMapIntensity = p.envK * env.envK; if (p.lift) p.m.emissiveIntensity = p.lift[0] + (p.lift[1] - p.lift[0]) * env.night; }
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
      fb.setNight(env.night);
      if (bLight) { bLight.userData.k = bSpec.kind === 'always' ? 1 : env.lamp; }
      for (var gI = 0; gI < S.glows.length; gI++) {
        var gl = S.glows[gI];
        gl.sp.visible = gl.kind !== 'none' && !gl.off;
        gl.k = gl.kind === 'always' ? 1 : (gl.kind === 'lamp' ? Math.max(0.25, env.lamp) : 1);
      }
      updateBeams(env);
      if (probes) probes.onEnv(env);
      if (giFx) giFx.onEnv(env, tierCfg ? tierCfg[tier].gi : 1, look && look.giK !== undefined ? look.giK : 1);
      for (var hI = 0; hI < S.hourHooks.length; hI++) { try { S.hourHooks[hI](env); } catch (e) { /* ignore */ } }
      llBase();
    }

    var stand0 = (layout.candles && layout.candles.stands && layout.candles.stands[0]) || null;
    var cb = S.cameraBounds || { x0: bnd.x0, x1: bnd.x1, z0: bnd.z0, z1: bnd.z1, yMax: 9 };

    // 구운 AO·바닥 AO 지도·반사 가림·반짝임 줄이기(ao_fx.js). cam_guard 가 재질을 잇기 전에 붙인다(프로그램 캐시 키 순서).
    var aoFx = null, giFx = null;
    if (aoDefer) {
      var aoMats = [];
      S.physMats.forEach(function (p) { if (aoMats.indexOf(p.m) < 0) aoMats.push(p.m); });
      items.forEach(function (it) { if (it.material && aoMats.indexOf(it.material) < 0) aoMats.push(it.material); });
      // 빛 번짐(gi_fx.js, RENDER_GI.md): 높음·보통(TIERS.gi > 0). triIds(배치 → 메시 정점 대응)를 AO 와 같이 쓰므로 둘 다 붙인 뒤에 놓는다.
      var giWant = !!root.ChurchGIFx && !!(tierCfg && tierCfg[tier].gi > 0) && !/[?&]gi=0/.test((root.location && root.location.search) || '');
      if (giWant) items.forEach(function (it) { if (it.ao && it.group) it.group.children.forEach(function (m) { if (m.userData.triIds) m.userData.triUsers = 2; }); });
      try { aoFx = root.ChurchAOFx.attach({ id: id, items: items, mats: aoMats, aoOpts: S.aoOpts }); } catch (e) { if (root.console) console.warn('[church] aofx', e); aoFx = null; }
      if (giWant && aoFx) { try { giFx = root.ChurchGIFx.attach({ id: id, items: items, mats: aoMats, root: world }); } catch (e) { if (root.console) console.warn('[church] gifx', e); giFx = null; } }
    }
    // 성당 안 반사 탐침(probe_fx.js, RENDER_V4.md §2): 금·청동·대리석·광택 재질의 거울 반사를 이 성당 안에서 찍은 큐브맵으로. low·감상실은 없음.
    var probes = null;
    var prbPlaces = root.ChurchProbePlaces && root.ChurchProbePlaces[id];
    if (!low && !builder.viewing && root.ChurchProbes && prbPlaces && tierCfg && tierCfg[tier].probes > 0 && !/[?&]probe=0/.test((root.location && root.location.search) || '')) {
      try {
        probes = root.ChurchProbes.create({ scene: scene, keep: [world, sky], places: prbPlaces, tier: tier, tiers: tierCfg, see: null });
        var prbMats = [];
        S.physMats.forEach(function (p) { if (prbMats.indexOf(p.m) < 0) prbMats.push(p.m); });
        items.forEach(function (it) { if (it.material && prbMats.indexOf(it.material) < 0) prbMats.push(it.material); });
        // 재질 배율 = 그 재질의 환경 반사 배율(kit 의 envK: 금 1.6·대리석 1.3 …, applyEnv 전 envMapIntensity) × 성당 룩 prbK. 시간대 envK 는 곱하지 않는다(탐침은 그 시각의 실내를 찍은 것)
        prbMats.forEach(function (m) { if (probes.wants(m)) probes.patch(m, (m.envMapIntensity || 1) * (look && look.prbK !== undefined ? look.prbK : 1)); });
      } catch (e) { if (root.console) console.warn('[church] probes', e); probes = null; }
    }
    function applyAOTier() {
      if (!aoFx) return;
      var tc = tierCfg ? tierCfg[tier] : null, u = aoFx.uniforms;
      u.uAOK.value = (tc ? tc.aoK : 1) * (look && look.aoK !== undefined ? look.aoK : 1);
      u.uAODir.value = look && look.aoDir !== undefined ? look.aoDir : 0.6;
      u.uSpecAA.value = tc ? tc.specAA : 1;
    }
    var api = {
      id: id, layout: layout, logic: logic, group: world, env: env, look: look, ctx: ctx, builder: builder, stats: stats, tier: tier, scene: scene,
      cameraBounds: { x0: cb.x0 !== undefined ? cb.x0 : bnd.x0, x1: cb.x1 !== undefined ? cb.x1 : bnd.x1, z0: cb.z0 !== undefined ? cb.z0 : bnd.z0, z1: cb.z1 !== undefined ? cb.z1 : bnd.z1, yMax: cb.yMax || 9, pitchMax: cb.pitchMax },   // pitchMax: 카메라 리그 올림 상한(빌더가 줄 때만 — 여의도동 계단 홀)
      // 3인칭 카메라 가드(cam_guard.js): 카메라가 설 수 있는 실내 공간 + 사이 가림물 잘라내기(docs/church/CAMERA.md)
      camGuard: (function () {
        if (!root.ChurchCamGuard) return null;
        var sp = layout.spawn || { x: 0, z: 0 }, fy0 = 0;
        try { fy0 = logic.floorY(sp.x, sp.z) || 0; } catch (e) { /* ignore */ }
        // 카메라 공간 복셀(걷는 자리·바닥 높이·카메라 상자 밖 통로) + 가림 잘라내기(seeThru)
        try {
          var go = root.ChurchCamGuard.spaceOpts ? root.ChurchCamGuard.spaceOpts(logic, layout, S.zones) : {};
          // 여러 층: 기준 = 맨 아래층 바닥(묘소), 삼각형마다 그 층 바닥(go.levelBase), 공간은 카메라 상자 yMax 까지
          if (logic.multi && go.levelLow !== undefined) { fy0 = go.levelLow; go.spaceTop = cb.yMax; }
          go.bounds = cb; go.yLow = fy0 + 1.05;
          return root.ChurchCamGuard.build(ctx.root, go);
        } catch (e) { if (root.console) console.warn('[church] camGuard', e); return null; }
      })(),
      reflectorCount: function () { return reflectors.length; },
      // 여러 층: 보는 사람(내 아바타) 발 높이 — main.js 가 프레임마다 준다. 지금 그리는 층 표(시험·진단): levelKey() '110' 처럼 levels 순서
      setViewer: function (y) { if (levelVis) levelVis.viewer = typeof y === 'number' ? y : null; },
      levelKey: function () { return levelVis ? levelVis.key : ''; },
      // 여러 층 룩의 지금 배율(시험·진단): { expK, ambK, tintK, light: 점광원을 둔 층 번호, fade } — levelLook 이 없으면 null
      levelLookNow: function () { return levelLook && levelLook.cur ? { expK: levelLook.cur.expK, ambK: levelLook.cur.ambK, tintK: levelLook.cur.tintK, light: levelLook.li, fade: levelLook.fade } : null; },
      showLevelsAt: function (y) { if (levelVis) { levelVis.viewer = null; levelVis.key = ''; applyLevelVis(y); } },
      hour: function () { return curHour; },
      setHour: function (h) { curHour = ((h % 24) + 24) % 24; shForce = true; if (probes) { probes.resetEnvKey(); probes.markDirty('hour', true); } applyEnv(); },
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
        softOn = !!shafts && !!(tierCfg && tierCfg[tier].shafts);
        if (beamMesh) beamMesh.visible = !softOn && !api.viewMode;
        if (shafts && shafts.motes) shafts.motes.geometry.setDrawRange(0, Math.min(shafts.nMotes, tierCfg[tier].motes || 0));
        api.shadowDirty = true;
        if (dust) dust.visible = hi && !api.viewMode;
        applyAOTier();
        if (probes) probes.setTier(tier);
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
        if (beamMesh) beamMesh.visible = !on && !softOn;
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
        (list || []).forEach(function (c) { keep[c.slot] = 1; lightSlot(c, false); });
        Object.keys(lit).forEach(function (s) { if (!keep[s]) unlightSlot(+s); });
      },
      lightCandle: function (c) { lightSlot(c, true); },
      slotPos: function (s) { return slots[s] ? { x: slots[s].x, y: slotY0[s], z: slots[s].z } : null; },
      colorOf: function (s) { return lit[s] ? lit[s].color : -1; },
      isMine: function (s) { return lit[s] ? lit[s].mine : 0; },
      mineLabelVisible: function () { return !!(labelSp && labelSp.visible); },
      flameBatch: fb,
      setReducedMotion: function (b) { fb.setReducedMotion(!!b); reducedMotion = !!b; if (shafts) shafts.reduced = !!b; },
      reducedMotion: function () { return reducedMotion; },
      // fx 패스(render.js): 부드러운 빛줄기·먼지. active() 가 거짓이면 패스를 건너뛴다(밤·감상·low)
      haze: hazeOut,
      flare: flare,
      fx: {
        active: function () { return !!(shafts && softOn && !api.viewMode && shafts.visibleWork() && env.beam > 0.001); },
        scene: shafts ? shafts.scene : null,
        prepare: function (cam, depthTex, w, h) { shafts.setShadow(dirLight); shafts.prepare(cam, depthTex, w, h); }
      },
      shafts: shafts,
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
        // 다 탄 초(until 이 지난 초)는 스스로 꺼진다. 5초에 한 번만 본다.
        if (t - CANDLE_CHECK > 5 || t < CANDLE_CHECK) {
          CANDLE_CHECK = t;
          var nowMs = Date.now();
          for (var ls in lit) if (lit[ls].until > 0 && lit[ls].until <= nowMs) unlightSlot(+ls);
        }
        // 물 위에 뜬 초: 아주 천천히 까딱이며 제자리에서 맴돈다(인스턴스 행렬 몇 개만 갱신)
        if (floats.length) {
          for (var fi = 0; fi < floats.length; fi++) {
            var fs = floats[fi], fph = fs * 1.7, fS = slots[fs];
            var fx2 = fS.x + 0.012 * Math.sin(t * 0.31 + fph), fz2 = fS.z + 0.012 * Math.cos(t * 0.27 + fph * 1.3), fy2 = slotY0[fs] + 0.004 * Math.sin(t * 0.9 + fph);
            if (!lit[fs]) continue;
            m4.makeTranslation(fx2, fy2, fz2).scale(tv.set(1.7, 0.4, 1.7)); candles.setMatrixAt(fs, m4);
            flameAt(fs, fx2, fz2, fy2, false);
          }
          candles.instanceMatrix.needsUpdate = true;
        }
        clock += dt;
        envTimer += dt;
        curHour += dt / 3600;
        if (envTimer > 5) { envTimer = 0; applyEnv(); }
        clockT = t; fb.setTime(t); syncAltarFlames();
        if (labelSp && labelSp.visible) { var la = t - labelT0; if (la > 5 || la < 0) labelSp.visible = false; else labelSp.material.opacity = la < 3.5 ? 1 : Math.max(0, 1 - (la - 3.5) / 1.5); }   // 깜박임은 셰이더(시간 uniform 하나)
        for (var g3 = 0; g3 < S.glows.length; g3++) {
          var gl = S.glows[g3];
          if (gl.kind === 'none') continue;
          gl.sp.material.opacity = gl.base * (gl.k === undefined ? 1 : gl.k) * (1 + gl.pulse * Math.sin(t * 2 + gl.phase));
        }
        if (stand0 && focus) {
          var best = null, bd = 1e9;
          // 여러 층: 봉헌대 바닥 높이(fy)도 거리에 넣고, 빛은 그 봉헌대 바닥 + 1.9m 에 둔다(예전에는 늘 1.9 — 위층 봉헌대 빛이 아래층 안에 켜졌다)
          var fyF = focus.fy !== undefined ? focus.fy : (focus.y || 0);
          layout.candles.stands.forEach(function (st2) { var dy2 = (st2.fy || 0) - fyF, d2 = (st2.x - focus.x) * (st2.x - focus.x) + (st2.z - focus.z) * (st2.z - focus.z) + dy2 * dy2 * 9; if (d2 < bd) { bd = d2; best = st2; } });
          var bf = best.face || [-1, 0]; candleLight.position.set(best.x + bf[0] * 0.9, (best.fy || 0) + 1.9, best.z + bf[1] * 0.9);
        }
        var cl = Math.min(60, 8 + litCount * 1.2) * (candleLight.userData.k === undefined ? 1 : candleLight.userData.k);
        candleLight.intensity = litCount ? cl : 0;
        if (flare.on) {
          var fe = flareEnv(t - flare.t0), fs3 = flare.s;
          if (t - flare.t0 > 0.6 || !lit[fs3]) { flare.on = false; fe = 0; if (lit[fs3]) { cupGlow.setX(fs3, 1); cupGlow.needsUpdate = true; } }
          else {
            // 점광원은 봉헌대 앞(1m) 그대로 두고 세기만 올린다(초 쪽으로 옮기면 봉헌대 앞면이 뒤에서 비쳐 오히려 어두워졌다 — 화면 비교)
            candleLight.intensity += 0.6 * cl * fe;
            cupGlow.setX(fs3, 1 + 1.4 * fe); cupGlow.needsUpdate = true;
          }
          flare.e = fe;
        }
        if (camera) updateHaze(camera);
        if (levelLook) llUpdate(dt, camera);
        if (bLight) bLight.intensity = (bSpec.intensity || 1) * 22 * (bSpec.kind === 'always' ? 1 : env.lamp) * (levelLook ? levelLook.fade : 1);
        var bk = 0.85 + 0.15 * Math.sin(clock * 0.6);
        if (beamMesh) { beamMat.opacity = bk * (tier !== 'low' ? 0.8 : 1); beamMesh.visible = !api.viewMode && !softOn; }
        if (shafts) {
          shafts.setTime(clock);
          var tcs = tierCfg[tier] || {};
          shafts.shaftK = (look && look.shaftK !== undefined ? look.shaftK : 1) * (tcs.shaftK || 0);
          shafts.moteK = shafts.reduced ? 0 : (look && look.moteK !== undefined ? look.moteK : 1) * (tcs.motes ? 1 : 0);
        }
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
        if (levelVis && camera) applyLevelVis(camera.position.y);
      },
      aoFx: aoFx,
      giFx: giFx,
      probes: probes,
      // 반사 탐침: 첫 굽기 전인가(main.js 가 첫 프레임 뒤 한 번에 굽고 firstFrame 을 한 프레임 미룬다) / 그린 뒤 프레임마다 나눠 굽기
      probePending: function () { return !!(probes && probes.pending()); },
      probeStep: function (renderer) {
        if (!probes || api.viewMode) return false;
        if (probes.pending()) { probes.bakeNow(renderer); return true; }
        return probes.step(renderer);
      },
      // 구운 AO 가 아직 붙지 않았는가(main.js 가 성당에 들어온 직후 잠깐(≤0.5초) 그리기를 미룬다: AO 없는 한 프레임이 번쩍이지 않게)
      aoPending: function () { return !!(aoFx && aoFx.pending()) || !!(giFx && giFx.pending()); },
      dispose: function () {
        if (aoFx) aoFx.dispose();
        if (giFx) giFx.dispose();
        if (probes) probes.dispose();
        if (shafts) shafts.dispose();
        disposeReflectors(); fb.dispose();
        var texs = new Set();
        function texOf(m) {
          for (var k in m) { var t = m[k]; if (t && t.isTexture && !t.isRenderTargetTexture && t !== envTex) texs.add(t); }
          if (m.uniforms) for (var u in m.uniforms) { var v = m.uniforms[u] && m.uniforms[u].value; if (v && v.isTexture && !v.isRenderTargetTexture && v !== envTex) texs.add(v); }
        }
        [world, sky, sun, moonSp, stars, clouds, hemi, dirLight, target, candleLight, bLight].forEach(function (o) {
          if (!o) return;
          scene.remove(o);
          if (o.traverse) o.traverse(function (n) {
            if (n.geometry && n.geometry.dispose) n.geometry.dispose();
            if (n.material) { var ms = Array.isArray(n.material) ? n.material : [n.material]; ms.forEach(function (m) { texOf(m); m.dispose && m.dispose(); }); }
          });
        });
        // 재질이 쓰던 질감을 한 번씩 놓는다(예전에는 map 등 4종만, 빛 번짐 질감(glowTex)은 빼고 놓아 성당을 바꿀 때마다 질감이 쌓였다: PERF_SCALE.md §4 누수)
        texs.forEach(function (t) { t.dispose(); });
        if (glowTex && glowTex.dispose) glowTex.dispose();
        if (dirLight.shadow && dirLight.shadow.map) dirLight.shadow.map.dispose();
      }
    };
    if (probes && api.camGuard) probes.setSee(function () { return api.camGuard.see; });
    applyEnv();
    api.setTier(tier, opts.renderer);
    return api;
  }

  root.ChurchWorld = { create: create, sampleEnv: sampleEnv, KEYS: KEYS };
})(typeof window !== 'undefined' ? window : this);
