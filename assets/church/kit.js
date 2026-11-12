/* kit.js — 성당 빌더 도구 모음. ChurchKit.createContext(opts) -> ctx (docs/church/BUILDER_API.md 참고)
   v3 사실감 개편: PBR 재질(광택 대리석·옻칠 나무·금속 금), 사진 질감 표면(surf), 실제 개구부가 있는 벽+창, 접촉 AO 데칼.
   기존 빌더 코드(color만 쓰는 box/cyl/...)는 그대로 동작하고 자동으로 더 좋아 보인다. */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.ChurchGeo, Geo = G.Geo;
  var PI = Math.PI;

  var JEWEL = [0xc02845, 0x2a5fc7, 0xe0a800, 0x2f9a5a, 0xe07020, 0x7a45b8, 0x1fa3a8, 0xd8609a, 0x1f3f9c, 0xb02020];

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
  function profilePts(type, a, rise, n) {
    var f = profileFn(type, a, rise), out = [];
    for (var i = 0; i <= n; i++) { var u = -a + (2 * a * i) / n; out.push([u, f(u)]); }
    return out;
  }

  // ---- 표면(사진/절차 질감 + PBR 파라미터) 기본 사전 ----
  // photo: tex_<photo>.jpg(+_n,_r) ; tile: 질감 한 번이 덮는 미터
  var SURFACES = {
    marble_white: { photo: 'marble_white', tile: 1.6, clearcoat: 0.85, ccRough: 0.05, normalScale: 0.35, envK: 1.3, fb: 'marble' },
    marble_black: { photo: 'marble_black', tile: 1.6, clearcoat: 0.9, ccRough: 0.04, normalScale: 0.35, envK: 1.4, fb: 'marbleDark' },
    marble_beige: { photo: 'marble_beige', tile: 1.6, clearcoat: 0.8, ccRough: 0.06, normalScale: 0.3, envK: 1.2, fb: 'marbleBeige' },
    marble_rose: { photo: 'marble_rose', tile: 1.6, clearcoat: 0.8, ccRough: 0.06, normalScale: 0.3, envK: 1.2, fb: 'marbleBeige' },
    marble_checker: { photo: 'marble_checker', tile: 2.4, clearcoat: 0.85, ccRough: 0.05, normalScale: 0.3, envK: 1.3, fb: 'checker' },
    limestone: { photo: 'limestone', tile: 1.8, clearcoat: 0.1, ccRough: 0.4, normalScale: 0.6, envK: 1.2, fb: 'marbleBeige' },
    plaster: { photo: 'plaster', tile: 2.6, roughness: 0.95, normalScale: 0.6, envK: 1.1, color: 0xf2eadc, fb: 'plaster' },
    stone_grey: { photo: 'stone_grey', tile: 2.6, roughness: 0.9, normalScale: 0.7, envK: 0.7, fb: 'plaster' },
    brick_grey: { photo: 'brick_grey', tile: 2.4, roughness: 0.9, normalScale: 0.9, envK: 0.6, fb: 'brick' },
    wood_dark: { photo: 'wood_dark', tile: 1.4, clearcoat: 0.55, ccRough: 0.22, normalScale: 0.5, envK: 1.0, fb: 'wood' },
    wood_cherry: { photo: 'wood_cherry', tile: 1.4, clearcoat: 0.6, ccRough: 0.18, normalScale: 0.4, envK: 1.0, fb: 'wood' },
    mosaic_gold: { photo: 'mosaic_gold', tile: 1.6, metalness: 0.75, roughness: 0.38, envK: 1.6, emissive: 0.08, fb: 'mosaic' },
    gold_relief: { photo: 'gold_relief', tile: 3.0, metalness: 0.7, roughness: 0.4, envK: 1.4, fb: 'mosaic' },
    fresco_dome: { photo: 'fresco_dome', tile: 6.0, roughness: 0.92, envK: 0.5, fb: 'plaster' }
  };

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

    // ---- 배치(정점색 합친 지오메트리). 재질별로 따로 모인다 ----
    var B_ = {
      solid: new G.Batch(11), gloss: new G.Batch(12), wood: new G.Batch(14), metal: new G.Batch(15),
      glass: new G.Batch(16), glassRefl: new G.Batch(17), glow: new G.Batch(13), outside: new G.Batch(18)
    };
    var solid = ctx.solid = B_.solid, glass = ctx.glass = B_.glass, glow = ctx.glow = B_.glow;
    ctx.gloss = B_.gloss; ctx.woodB = B_.wood; ctx.metalB = B_.metal; ctx.outsideB = B_.outside;
    var decalB = new G.Batch(19); decalB.enableUV(1, 1);
    var S_ = ctx._ = {
      colliders: [], zones: [], lights: [], glows: [], flames: [], beams: [], hourHooks: [], updateHooks: [],
      cameraBounds: null, sky: { outside: false }, thumb: null, candleStands: [], lamps: [],
      walls: [], windows: [], roses: [], floors: [], surfBatches: {}, physMats: [], items: [], aoOn: true, aoOpts: {},
      lampSlots: [], batches: B_
    };

    // ---- 질감/사진 ----
    var tex = ctx.tex = root.ChurchKitTex.make(rand);
    var Ph = root.ChurchPhotos;
    ctx.hasPhoto = function (name) { return !!(Ph && Ph.has(name)); };
    // ctx.photoTex(name, {repeat:[rx,ry], enc:'srgb'|'linear', fallback: ()=>CanvasTexture}) -> THREE.Texture (그림은 비동기로 교체)
    ctx.photoTex = function (name, o) {
      o = o || {};
      var fb = o.fallback ? o.fallback() : null;
      return Ph.get(name, { repeat: o.repeat, enc: o.enc, fallbackCanvas: fb && fb.image ? fb.image : null });
    };
    function fallbackFor(kind) {
      switch (kind) {
        case 'marble': return tex.checker({ c1: 0xf4efe6, c2: 0xf4efe6 });
        case 'marbleDark': return tex.checker({ c1: 0x33343a, c2: 0x2a2b30 });
        case 'marbleBeige': return tex.checker({ c1: 0xe3d3b8, c2: 0xe3d3b8 });
        case 'checker': return tex.checker({});
        case 'brick': return tex.brick({ brick: 0x9a948c, mortar: 0xc9c2b6 });
        case 'wood': return tex.wood({ base: 0x6a3f28, dark: 0x4a2a1a });
        case 'mosaic': return tex.mosaic({});
        default: return tex.plaster({});
      }
    }
    var extRemote = {};
    ctx.loadTexture = function (url, fallbackFactory) {
      if (extRemote[url]) return extRemote[url];
      var t = fallbackFactory ? fallbackFactory() : tex.plaster({});
      extRemote[url] = t;
      try {
        var img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = function () { t.image = img; t.needsUpdate = true; };
        img.src = url;
      } catch (e) { /* ignore */ }
      return t;
    };

    // ---- 표면 사전 / 재질 ----
    ctx.surfaces = SURFACES;
    ctx.defineSurface = function (name, def) { SURFACES[name] = def; return def; };
    function surfDef(s) {
      if (!s) return null;
      if (typeof s === 'string') {
        var d = SURFACES[s];
        if (!d && Ph && Ph.has(s)) d = SURFACES[s] = { photo: s, tile: 2, roughness: 0.8, envK: 0.8, fb: 'plaster' };
        if (!d) { d = { fb: 'plaster', tile: 2, roughness: 0.85, envK: 0.7 }; }
        d.__name = s;
        return d;
      }
      if (s.isTexture) return { tex: s, tile: 2, roughness: 0.8, envK: 0.8, __name: 'tex' + s.uuid };
      return s;
    }
    function surfKey(s) { return typeof s === 'string' ? s : (s.isTexture ? 'tex' + s.uuid : (s.__key || (s.__key = 'def' + Math.random().toString(36).slice(2)))); }
    function tileOf(def) { var t = def.tile || 2; return Array.isArray(t) ? t : [t, t]; }
    function physMat(def, o) {
      o = o || {};
      var hasR = def.photo && Ph && Ph.has(def.photo + '_r'), hasN = def.photo && Ph && Ph.has(def.photo + '_n');
      var rep = o.repeat;
      var m = new T.MeshPhysicalMaterial({
        color: def.color === undefined ? 0xffffff : def.color,
        roughness: hasR ? 1 : num(def.roughness, 0.7), metalness: num(def.metalness, 0),
        clearcoat: low ? 0 : num(def.clearcoat, 0), clearcoatRoughness: num(def.ccRough, 0.1), envMapIntensity: num(def.envK, 1),
        vertexColors: !!o.vertex, side: def.side === undefined ? T.FrontSide : def.side
      });
      if (def.photo) {
        var fb = fallbackFor(def.fb);
        m.map = Ph.get(def.photo, { repeat: rep, fallbackCanvas: fb.image });
        if (hasN) { m.normalMap = Ph.get(def.photo + '_n', { repeat: rep, enc: 'linear' }); m.normalScale = new T.Vector2(num(def.normalScale, 0.5), num(def.normalScale, 0.5)); }
        if (hasR) m.roughnessMap = Ph.get(def.photo + '_r', { repeat: rep, enc: 'linear' });
      } else if (def.tex) {
        var t0 = def.tex.clone(); t0.needsUpdate = true; t0.wrapS = t0.wrapT = T.RepeatWrapping; if (rep) t0.repeat.set(rep[0], rep[1]);
        m.map = t0;
      }
      if (!hasN && def.normalScale !== 0 && def.rough !== false && !def.noNoise) {
        var nn = tex.noiseNormal({ strength: def.noiseStrength || 1.2 }).clone(); nn.needsUpdate = true; nn.wrapS = nn.wrapT = T.RepeatWrapping;
        if (rep) nn.repeat.set(rep[0] * 2, rep[1] * 2); else nn.repeat.set(2, 2);
        m.normalMap = nn; m.normalScale = new T.Vector2(0.15, 0.15);
      }
      if (!hasR && (def.clearcoat || def.roughness !== undefined) && def.rough !== false && !def.noNoise) {
        var rm = tex.roughMap({ base: 1, vary: 0.0 }).clone(); rm.needsUpdate = true; rm.wrapS = rm.wrapT = T.RepeatWrapping;
        // 거칠기 변화: roughness 값에 곱해지는 노이즈(0.75~1.0)
        var rn = tex.roughMap({ base: 0.88, vary: 0.12 }).clone(); rn.needsUpdate = true; rn.wrapS = rn.wrapT = T.RepeatWrapping;
        if (rep) rn.repeat.set(rep[0] * 2, rep[1] * 2); else rn.repeat.set(2, 2);
        m.roughnessMap = rn;
      }
      if (def.emissive) { m.emissive = new T.Color(0xffd890); m.emissiveIntensity = def.emissive; if (m.map) m.emissiveMap = m.map; }
      S_.physMats.push({ m: m, envK: num(def.envK, 1), cc: num(def.clearcoat, 0), em: def.emissive || 0 });
      return m;
    }
    function stdMat(o) {
      var cc = o.clearcoat || 0;
      var m = (cc || o.physical) ? new T.MeshPhysicalMaterial({ vertexColors: true, roughness: o.roughness, metalness: o.metalness || 0, clearcoat: low ? 0 : cc, clearcoatRoughness: o.ccRough === undefined ? 0.12 : o.ccRough, envMapIntensity: o.envK || 1 })
        : new T.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness, metalness: o.metalness || 0, envMapIntensity: o.envK || 1 });
      S_.physMats.push({ m: m, envK: o.envK || 1, cc: cc, em: 0 });
      return m;
    }
    var mats = ctx.mats = {
      solid: stdMat({ roughness: 0.84, envK: 0.7 }),
      gloss: stdMat({ roughness: 0.16, clearcoat: 0.8, ccRough: 0.05, envK: 1.3 }),
      wood: stdMat({ roughness: 0.5, clearcoat: 0.55, ccRough: 0.22, envK: 1.0 }),
      metal: stdMat({ roughness: 0.3, metalness: 1.0, envK: 1.6 }),
      outside: stdMat({ roughness: 0.95, envK: 0.5 }),
      glass: new T.MeshBasicMaterial({ vertexColors: true, fog: true }),
      glassRefl: new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false, envMapIntensity: 1.2, vertexColors: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      glow: new T.MeshBasicMaterial({ vertexColors: true, fog: true }),
      decal: new T.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0x000000, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true }),
      lambert: function (o) { o = o || {}; return new T.MeshStandardMaterial({ color: o.color === undefined ? 0xffffff : o.color, map: o.tex || null, roughness: 0.85, side: o.side === undefined ? T.FrontSide : o.side, transparent: o.opacity !== undefined && o.opacity < 1, opacity: num(o.opacity, 1) }); },
      basic: function (o) { o = o || {}; return new T.MeshBasicMaterial({ color: o.color === undefined ? 0xffffff : o.color, map: o.tex || null, side: o.side === undefined ? T.FrontSide : o.side, transparent: !!o.transparent, opacity: num(o.opacity, 1) }); },
      standard: function (o) { return new T.MeshPhysicalMaterial(o || {}); },
      surface: function (name, o) { return physMat(surfDef(name), o); }
    };
    mats.glassRefl.vertexColors = false;

    // ---- 재질 배치 선택 ----
    function isGold(c) {
      if (c === undefined) return false;
      var col = G.toColor(c); var hsl = {}; col.getHSL(hsl);
      // getHSL 은 선형 공간 값: 금색 ≈ 색상 36~52도, 채도 높음
      return hsl.h >= 0.095 && hsl.h <= 0.15 && hsl.s > 0.42 && hsl.l > 0.2 && hsl.l < 0.8 && (col.r > col.b * 1.9);
    }
    function surfBatchFor(s) {
      var key = surfKey(s);
      if (!S_.surfBatches[key]) {
        var def = surfDef(s), t = tileOf(def), b = new G.Batch(40 + Object.keys(S_.surfBatches).length);
        b.enableUV(t[0], t[1]);
        S_.surfBatches[key] = { batch: b, def: def };
      }
      return S_.surfBatches[key].batch;
    }
    ctx.surfBatch = surfBatchFor;
    function pick(o) {
      var s = o.surf || (o.tex && o.tex.isTexture ? o.tex : null);
      if (s) return surfBatchFor(s);
      var m = o.mat || (o.metal ? 'metal' : (o.gloss ? 'gloss' : (o.lacquer ? 'wood' : null)));
      if (!m && isGold(o.color)) m = 'metal';
      return B_[m] || B_.solid;
    }
    function colOf(o, d) { return o.color === undefined ? ((o.surf || (o.tex && o.tex.isTexture)) ? 0xffffff : d) : o.color; }

    // ---- 개별 면(질감, 각각 draw call 1) ----
    function planeMat(o, w, h) {
      var tile = o.tile === undefined ? 2 : o.tile;
      var tw = Array.isArray(tile) ? tile[0] : tile, th = Array.isArray(tile) ? tile[1] : tile;
      if (o.mat && o.mat.isMaterial) return o.mat;
      var gloss = o.gloss === undefined ? (o.surf || o.tex ? 0.75 : 0.3) : (o.gloss === true ? 0.9 : o.gloss);
      if (o.surf) { var d = surfDef(o.surf); var t2 = tileOf(d); return physMat(Object.assign({}, d, o.override || {}), { repeat: [w / t2[0], h / t2[1]] }); }
      if (o.tex) {
        var def = { tex: o.tex, roughness: 1.0 - gloss * 0.85, clearcoat: gloss > 0.5 ? (gloss - 0.4) : 0, ccRough: 0.08, envK: 0.8 + gloss * 0.5, color: o.color, side: o.side };
        return physMat(def, { repeat: [w / tw, h / th] });
      }
      var m = new T.MeshStandardMaterial({ color: o.color === undefined ? 0xcccccc : o.color, roughness: 0.9, side: o.side === undefined ? T.FrontSide : o.side });
      S_.physMats.push({ m: m, envK: 0.6, cc: 0, em: 0 });
      return m;
    }
    ctx.plane = function (o) {
      var m = new T.Mesh(new T.PlaneGeometry(o.w, o.h), planeMat(o, o.w, o.h));
      m.position.set(o.x || 0, o.y || 0, o.z || 0);
      m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
      m.receiveShadow = true;
      ctx.root.add(m); stats.meshes++;
      return m;
    };
    ctx.floor = function (o) {
      var w = o.x1 - o.x0, d = o.z1 - o.z0, y = num(o.y, 0);
      var m = ctx.plane({ x: (o.x0 + o.x1) / 2, y: y, z: (o.z0 + o.z1) / 2, rx: -PI / 2, w: w, h: d, tex: o.tex, surf: o.surf, color: o.color, tile: o.tile, gloss: o.gloss, mat: o.mat });
      if (o.zone && y > 0) ctx.floorZone({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y: y });
      var gl = o.gloss === undefined ? ((o.surf || o.tex) ? 0.75 : 0) : (o.gloss === true ? 0.9 : o.gloss);
      var rf = o.reflect === undefined ? gl >= 0.6 : !!o.reflect;
      if (rf && S_.floors.length < 2) S_.floors.push({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y: y, strength: typeof o.reflect === 'number' ? o.reflect : 0.35 + 0.3 * gl });
      return m;
    };
    ctx.ceilingFlat = function (o) {
      var m = ctx.plane({ x: (o.x0 + o.x1) / 2, y: o.y, z: (o.z0 + o.z1) / 2, rx: PI / 2, w: o.x1 - o.x0, h: o.z1 - o.z0, tex: o.tex, surf: o.surf, color: o.color, tile: o.tile, gloss: o.gloss === undefined ? 0.5 : o.gloss });
      m.castShadow = true;
      if (o.metal && m.material) { m.material.metalness = 0.8; m.material.roughness = 0.4; }
      return m;
    };
    ctx.wallFace = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), n = o.facing || [0, 1];
      return ctx.plane({ x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2, z: (o.z0 + o.z1) / 2, ry: Math.atan2(n[0], n[1]), w: len, h: o.y1 - o.y0, tex: o.tex, surf: o.surf, color: o.color, tile: o.tile });
    };

    // ---- 충돌/바닥/카메라/조명 등록 ----
    ctx.addCollider = function (c) { S_.colliders.push(c); return c; };
    ctx.floorZone = function (z) { S_.zones.push(z); return z; };
    ctx.setCameraBounds = function (b) { S_.cameraBounds = b; };
    ctx.setSky = function (o) { S_.sky = o || {}; };
    ctx.onHour = function (fn) { S_.hourHooks.push(fn); };
    ctx.onUpdate = function (fn) { S_.updateHooks.push(fn); };
    ctx.setAO = function (o) { if (o === false) S_.aoOn = false; else { S_.aoOn = true; S_.aoOpts = o || {}; } };
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
      var sp = new T.Sprite(new T.SpriteMaterial({ map: getFlameTex(), color: 0xffffff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
      var s = o.scale || 1;
      sp.position.set(o.x, o.y, o.z); sp.scale.set(0.13 * s, 0.2 * s, 1);
      ctx.root.add(sp);
      S_.flames.push({ sp: sp, sx: 0.13 * s, sy: 0.2 * s, phase: rand() * 6.28 });
      return sp;
    };
    ctx.addWindowBeam = function (o) { S_.beams.push(o); };
    // 접촉 AO 데칼(바닥에 놓는 부드러운 어두운 사각형). x0,x1,z0,z1,y, 크기는 이미 번짐 포함.
    ctx.aoDecal = function (o) {
      var y = num(o.y, 0) + 0.012, pad = num(o.pad, 0.18);
      var x0 = o.x0 - pad, x1 = o.x1 + pad, z0 = o.z0 - pad, z1 = o.z1 + pad;
      decalB.addQuad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], 0x000000, [(x0 + x1) / 2, y + 1, (z0 + z1) / 2], null, [0, 0, 1, 0, 1, 1, 0, 1]);
    };
    ctx.aoDecalCircle = function (o) { ctx.aoDecal({ x0: o.x - o.r, x1: o.x + o.r, z0: o.z - o.r, z1: o.z + o.r, y: o.y, pad: o.pad === undefined ? o.r * 0.5 : o.pad }); };

    // ---- 기본 도형 ----
    function fl(o, d) { return o.flat === undefined ? d : o.flat; }
    ctx.box = function (o) {
      pick(o).add(Geo.box(), colOf(o, 0xcccccc), { x: o.x, y: o.y, z: o.z, ry: o.ry, rx: o.rx, rz: o.rz, sx: o.w, sy: o.h, sz: o.d, flat: fl(o, true), vary: o.vary, c2: o.c2 });
    };
    ctx.boxAABB = function (o) {
      ctx.box({ x: (o.x0 + o.x1) / 2, y: o.y0, z: (o.z0 + o.z1) / 2, w: o.x1 - o.x0, h: o.y1 - o.y0, d: o.z1 - o.z0, color: o.color, vary: o.vary, flat: o.flat, surf: o.surf, mat: o.mat, gloss: o.gloss, metal: o.metal });
    };
    ctx.cyl = function (o) {
      var r = o.r === undefined ? 0.5 : o.r;
      var rt = o.rTop === undefined ? r : o.rTop;
      pick(o).add(Geo.cyl(o.seg || 10, r > 0 ? rt / r : 0), colOf(o, 0xcccccc), { x: o.x, y: o.y, z: o.z, ry: o.ry, sx: r, sy: o.h, sz: r, flat: fl(o, true), vary: o.vary, c2: o.c2 });
    };
    ctx.cone = function (o) { ctx.cyl({ x: o.x, y: o.y, z: o.z, r: o.r, rTop: 0, h: o.h, seg: o.seg || 8, color: o.color, flat: o.flat, vary: o.vary, c2: o.c2, surf: o.surf, mat: o.mat, metal: o.metal }); };
    ctx.sphere = function (o) {
      var r = o.r === undefined ? 0.5 : o.r;
      pick(o).add(Geo.sph(o.w || 12, o.h || 8), colOf(o, 0xcccccc), { x: o.x, y: o.y, z: o.z, ry: o.ry, sx: o.sx !== undefined ? o.sx : r, sy: o.sy !== undefined ? o.sy : r, sz: o.sz !== undefined ? o.sz : r, flat: fl(o, false), vary: o.vary, c2: o.c2 });
    };
    ctx.ico = function (o) {
      var r = o.r === undefined ? 0.5 : o.r;
      pick(o).add(Geo.ico(o.detail || 0), colOf(o, 0xcccccc), { x: o.x, y: o.y, z: o.z, ry: o.ry, sx: o.sx !== undefined ? o.sx : r, sy: o.sy !== undefined ? o.sy : r, sz: o.sz !== undefined ? o.sz : r, flat: fl(o, true), vary: o.vary, c2: o.c2 });
    };
    ctx.beam3 = function (p0, p1, t, d, color, batch) { (batch || pick({ color: color })).addBeam(p0, p1, t, d, color, { vary: 0.03 }); };

    // ---- 벽(지연 생성: 창 구멍을 뚫고 몰딩을 붙인다) ----
    ctx.wall = function (o) {
      var rec = { x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1, y: num(o.y, 0), h: o.h, t: num(o.t, 0.5), color: o.color === undefined ? 0xf2e6cf : o.color, surf: o.surf || (o.tex ? o.tex : null), mat: o.mat, vary: o.vary, plinth: o.plinth, crown: o.crown, plinthColor: o.plinthColor, crownColor: o.crownColor };
      S_.walls.push(rec);
      if (o.collide !== false) {
        var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), t = rec.t, cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
        var ax = Math.abs(dx), az = Math.abs(dz);
        if (az < 1e-6) ctx.addCollider({ x0: Math.min(o.x0, o.x1), x1: Math.max(o.x0, o.x1), z0: cz - t / 2, z1: cz + t / 2 });
        else if (ax < 1e-6) ctx.addCollider({ x0: cx - t / 2, x1: cx + t / 2, z0: Math.min(o.z0, o.z1), z1: Math.max(o.z0, o.z1) });
        else { var n = Math.ceil(len / 1.0); for (var i = 0; i <= n; i++) ctx.addCollider({ x: o.x0 + dx * i / n, z: o.z0 + dz * i / n, r: t / 2 + 0.1 }); }
      }
      return rec;
    };

    // ---- 기둥 ----
    function capital(o, x, y, z, r, color, bs) {
      var type = o.capital === undefined ? 'doric' : o.capital;
      var cc = o.capColor === undefined ? color : o.capColor;
      var base = { surf: bs.surf, mat: bs.mat, gloss: bs.gloss, metal: o.capMetal };
      function P(extra) { return Object.assign({}, base, extra); }
      if (type === 'none') return 0;
      if (type === 'block') { ctx.box(P({ x: x, y: y, z: z, w: r * 2.6, h: r * 0.9, d: r * 2.6, color: cc })); return r * 0.9; }
      if (type === 'doric') {
        ctx.cyl(P({ x: x, y: y, z: z, r: r * 1.0, rTop: r * 1.35, h: r * 0.5, seg: 14, color: cc }));
        ctx.box(P({ x: x, y: y + r * 0.5, z: z, w: r * 2.9, h: r * 0.35, d: r * 2.9, color: cc }));
        return r * 0.85;
      }
      if (type === 'ionic') {
        ctx.cyl(P({ x: x, y: y, z: z, r: r, rTop: r * 1.2, h: r * 0.35, seg: 14, color: cc }));
        ctx.box(P({ x: x, y: y + r * 0.35, z: z, w: r * 3.2, h: r * 0.4, d: r * 2.2, color: cc, ry: o.ry }));
        var ca = Math.cos(o.ry || 0), sa = Math.sin(o.ry || 0);
        [-1, 1].forEach(function (sg) {
          ctx.cyl(P({ x: x + sg * r * 1.45 * ca, y: y + r * 0.1, z: z - sg * r * 1.45 * sa, r: r * 0.55, h: r * 0.65, seg: 14, color: ctx.shade(cc, 0.94), ry: o.ry, flat: false }));
          ctx.cyl(P({ x: x + sg * r * 1.45 * ca, y: y + r * 0.2, z: z - sg * r * 1.45 * sa, r: r * 0.25, h: r * 0.46, seg: 10, color: ctx.shade(cc, 0.78), ry: o.ry }));
        });
        ctx.box(P({ x: x, y: y + r * 0.75, z: z, w: r * 3.0, h: r * 0.18, d: r * 2.6, color: cc, ry: o.ry }));
        return r * 0.93;
      }
      // corinthian / composite
      ctx.cyl(P({ x: x, y: y, z: z, r: r * 1.0, rTop: r * 1.45, h: r * 1.2, seg: 14, color: cc }));
      for (var k = 0; k < 8; k++) {
        var a = k * PI / 4;
        ctx.ico(P({ x: x + Math.cos(a) * r * 1.1, y: y + r * 0.55, z: z + Math.sin(a) * r * 1.1, sx: r * 0.32, sy: r * 0.55, sz: r * 0.32, color: ctx.shade(cc, 0.92), detail: 0 }));
      }
      ctx.box(P({ x: x, y: y + r * 1.2, z: z, w: r * 3.1, h: r * 0.3, d: r * 3.1, color: cc }));
      return r * 1.5;
    }
    ctx.column = function (o) {
      var r = num(o.r, 0.4), y = num(o.y, 0), h = o.h, color = o.color === undefined ? 0xe9dcc3 : o.color;
      var style = o.style || 'round', x = o.x, z = o.z;
      var bs = { surf: o.surf, mat: o.mat, gloss: o.gloss };
      function P(extra) { return Object.assign({}, bs, extra); }
      var baseH = 0;
      if (o.base !== false) {
        var bh = r * 0.7;
        ctx.box(P({ x: x, y: y, z: z, w: r * 2.6, h: bh * 0.45, d: r * 2.6, color: o.capColor === undefined ? color : o.capColor }));
        ctx.cyl(P({ x: x, y: y + bh * 0.45, z: z, r: r * 1.35, rTop: r * 1.1, h: bh * 0.3, seg: 16, color: color, flat: false }));
        ctx.cyl(P({ x: x, y: y + bh * 0.75, z: z, r: r * 1.12, rTop: r * 1.02, h: bh * 0.25, seg: 16, color: color, flat: false }));
        baseH = bh;
      }
      var capH = (o.capital === 'none' || style === 'engaged' && o.capital === undefined) ? 0 : (function () {
        var t = o.capital === undefined ? 'doric' : o.capital;
        return t === 'corinthian' || t === 'composite' ? r * 1.5 : (t === 'ionic' ? r * 0.93 : (t === 'block' ? r * 0.9 : r * 0.85));
      })();
      var shaftH = h - baseH - capH;
      var sy = y + baseH;
      if (style === 'square') {
        ctx.box(P({ x: x, y: sy, z: z, w: r * 2, h: shaftH, d: r * 2, color: color, ry: o.ry }));
      } else if (style === 'pier') {
        ctx.box(P({ x: x, y: sy, z: z, w: r * 1.5, h: shaftH, d: r * 1.5, color: color, ry: o.ry }));
        for (var k = 0; k < 4; k++) {
          var a = k * PI / 2 + (o.ry || 0);
          ctx.cyl(P({ x: x + Math.cos(a) * r * 0.85, y: sy, z: z + Math.sin(a) * r * 0.85, r: r * 0.42, h: shaftH, seg: 10, color: ctx.shade(color, 0.97), flat: false }));
          var a2 = a + PI / 4;
          ctx.cyl(P({ x: x + Math.cos(a2) * r * 0.95, y: sy, z: z + Math.sin(a2) * r * 0.95, r: r * 0.22, h: shaftH, seg: 8, color: ctx.shade(color, 0.92), flat: false }));
        }
      } else if (style === 'twisted') {
        ctx.cyl({ x: x, y: sy, z: z, r: r * 0.62, h: shaftH, seg: 10, color: ctx.shade(color, 0.85), mat: o.mat || 'metal' });
        var n = Q(30);
        for (var s = 0; s < 3; s++) for (var i = 0; i < n; i++) {
          var ang = i * 0.55 + s * 2.094;
          ctx.cyl({ x: x + Math.cos(ang) * r * 0.55, y: sy + (shaftH * i) / n, z: z + Math.sin(ang) * r * 0.55, r: r * 0.34, h: (shaftH / n) * 1.5, seg: 8, color: color, vary: 0.04, flat: false, mat: o.mat || 'metal' });
        }
      } else if (style === 'fluted') {
        // 홈 기둥: 24각 + 가는 홈(어두운 세로선) 흉내
        var seg = Q(24);
        ctx.cyl(P({ x: x, y: sy, z: z, r: r, rTop: r * 0.9, h: shaftH, seg: seg, color: color, flat: true }));
      } else {
        ctx.cyl(P({ x: x, y: sy, z: z, r: r, rTop: r * 0.9, h: shaftH, seg: Q(20), color: color, flat: false }));
      }
      if (capH > 0) capital(o, x, sy + shaftH, z, r, color, bs);
      if (o.collide !== false) ctx.addCollider({ x: x, z: z, r: r * 1.15 });
      if (o.ao !== false) ctx.aoDecalCircle({ x: x, z: z, r: r * 1.5, y: y });
    };

    // ---- 아치 / 아케이드 ----
    function archPoints(type, span, rise, n) {
      if (type === 'trefoil') type = 'pointed';
      var a = span / 2;
      if (type === 'horseshoe') {
        var pts = [], R = a * 1.12;
        for (var i = 0; i <= n; i++) { var ang = -0.35 + (PI + 0.7) * (1 - i / n); pts.push([Math.cos(ang) * R, Math.sin(ang) * R]); }
        return pts;
      }
      var rs = rise === undefined ? (type === 'pointed' ? a * 1.45 : a) : rise;
      if (type === 'segmental' && rise === undefined) rs = a * 0.45;
      return profilePts(type === 'round' ? 'round' : type, a, rs, n);
    }
    ctx.arch = function (o) {
      var n = Q(o.seg || 16), t = num(o.t, 0.4), depth = num(o.depth, 0.5);
      var pts = archPoints(o.type || 'round', o.span, o.rise, n);
      var color = colOf(o, 0xe3d6bb), axis = o.axis || 'x', b = pick(o);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i], p1 = pts[i + 1];
        var du = p1[0] - p0[0], dv = p1[1] - p0[1], l = Math.sqrt(du * du + dv * dv) || 1;
        var nu = -dv / l, nv = du / l;
        var mu = (p0[0] + p1[0]) / 2 + nu * t / 2, mv = (p0[1] + p1[1]) / 2 + nv * t / 2, ang = Math.atan2(dv, du);
        if (axis === 'x') b.add(Geo.boxC(), color, { x: o.x + mu, y: o.y + mv, z: o.z, rz: ang, sx: l * 1.06, sy: t, sz: depth, flat: true });
        else b.add(Geo.boxC(), color, { x: o.x, y: o.y + mv, z: o.z + mu, rx: -ang, sx: depth, sy: t, sz: l * 1.06, flat: true });
      }
    };
    ctx.arcade = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), ux = dx / len, uz = dz / len;
      var n = Math.max(1, Math.round(len / o.spacing)), sp = len / n, pr = num(o.pierR, 0.45), h = o.h, y = num(o.y, 0);
      var axis = Math.abs(dx) > Math.abs(dz) ? 'x' : 'z';
      for (var i = 0; i <= n; i++) {
        ctx.column({ x: o.x0 + ux * sp * i, z: o.z0 + uz * sp * i, y: y, h: h, r: pr, style: o.style || 'round', capital: o.capital, base: o.base, color: o.color, capColor: o.capColor, collide: o.collide, surf: o.surf, mat: o.mat, gloss: o.gloss });
      }
      for (i = 0; i < n; i++) {
        var cx = o.x0 + ux * sp * (i + 0.5), cz = o.z0 + uz * sp * (i + 0.5);
        ctx.arch({ x: cx, z: cz, y: y + h, span: sp - pr * 2, rise: o.rise, axis: axis, type: o.type || 'round', color: o.archColor || o.color, depth: num(o.depth, pr * 1.6), t: num(o.archT, 0.35), surf: o.surf, mat: o.mat });
      }
      if (o.topY) {
        var wallBot = y + h + (o.rise !== undefined ? o.rise : (o.type === 'pointed' ? (sp - pr * 2) * 0.72 : (sp - pr * 2) / 2)) * 0.85;
        if (o.topY > wallBot) ctx.wall({ x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1, y: wallBot, h: o.topY - wallBot, t: num(o.wallT, pr * 1.6), color: o.wallColor === undefined ? o.color : o.wallColor, collide: false, surf: o.wallSurf || o.surf, plinth: false, crown: false });
      }
    };

    // ---- 궁륭 ----
    ctx.vault = function (o) {
      var type = o.type || 'barrel', color = o.color === undefined ? 0xf4ead6 : o.color, y = o.y, rise = o.rise;
      var ribColor = o.ribColor === undefined ? ctx.shade(color, 0.7) : o.ribColor;
      var cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
      var hint = [cx, y - 0.5, cz];
      var cTop = G.toColor(color), cLow = cTop.clone().multiplyScalar(0.9);
      var vb = o.surf ? surfBatchFor(o.surf) : pick({ mat: o.mat, color: color });
      var dT = o.surf ? tileOf(surfDef(o.surf)) : [1, 1];
      var rb = pick({ color: ribColor, mat: o.ribMat, surf: o.ribSurf });
      if (type === 'flat') {
        vb.addQuad([o.x0, y, o.z0], [o.x1, y, o.z0], [o.x1, y, o.z1], [o.x0, y, o.z1], color, [cx, y - 1, cz]);
        return;
      }
      if (type === 'barrel') {
        var axis = o.axis || 'z', prof = o.profile || 'round';
        var a = axis === 'z' ? (o.x1 - o.x0) / 2 : (o.z1 - o.z0) / 2;
        var n = Q(o.seg || 24);
        var pts = profilePts(prof, a, rise, n);
        var zA = axis === 'z' ? o.z0 : o.x0, zB = axis === 'z' ? o.z1 : o.x1;
        for (var i = 0; i < n; i++) {
          var p0 = pts[i], p1 = pts[i + 1];
          var c0 = cLow.clone().lerp(cTop, Math.min(1, p0[1] / rise)), c1 = cLow.clone().lerp(cTop, Math.min(1, p1[1] / rise));
          var A, B, C, D;
          if (axis === 'z') {
            A = [cx + p0[0], y + p0[1], zA]; B = [cx + p1[0], y + p1[1], zA]; C = [cx + p1[0], y + p1[1], zB]; D = [cx + p0[0], y + p0[1], zB];
          } else {
            A = [zA, y + p0[1], cz + p0[0]]; B = [zA, y + p1[1], cz + p1[0]]; C = [zB, y + p1[1], cz + p1[0]]; D = [zB, y + p0[1], cz + p0[0]];
          }
          var opts2 = null;
          if (o.surf) {
            var len2 = zB - zA, arcU = (i / n) * 2 * a * 1.2;
            opts2 = { uvs: [arcU / dT[0], 0, (arcU + 2 * a / n * 1.2) / dT[0], 0, (arcU + 2 * a / n * 1.2) / dT[0], len2 / dT[1], arcU / dT[0], 0, (arcU + 2 * a / n * 1.2) / dT[0], len2 / dT[1], arcU / dT[0], len2 / dT[1]] };
          }
          vb.addTris([].concat(A, B, C, A, C, D), [c0, c1, c1, c0, c1, c0], hint, opts2);
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
      var bays = o.bays || [1, 1], nx = bays[0], nz = bays[1];
      var bw = (o.x1 - o.x0) / nx, bd = (o.z1 - o.z0) / nz;
      var res = Q(type === 'sail' ? 8 : 10);
      var prof2 = o.pointed || o.profile === 'pointed' ? 'pointed' : 'round';
      var ax = bw / 2, az = bd / 2;
      var fu = profileFn(prof2, ax, rise), fv = profileFn(prof2, az, rise);
      var sailK = rise / (Math.SQRT2 * Math.min(ax, az));
      function H(u, v) {
        if (type === 'sail') { var uu = u / ax * Math.min(ax, az), vv = v / az * Math.min(ax, az); var m = 2 * Math.pow(Math.min(ax, az), 2) - uu * uu - vv * vv; return (m > 0 ? Math.sqrt(m) : 0) * sailK; }
        return Math.min(fu(u), fv(v));
      }
      for (var bx = 0; bx < nx; bx++) for (var bz = 0; bz < nz; bz++) {
        var ox = o.x0 + bw * (bx + 0.5), oz = o.z0 + bd * (bz + 0.5);
        for (var i2 = 0; i2 < res; i2++) for (var j2 = 0; j2 < res; j2++) {
          var u0 = -ax + 2 * ax * i2 / res, u1 = -ax + 2 * ax * (i2 + 1) / res, v0 = -az + 2 * az * j2 / res, v1 = -az + 2 * az * (j2 + 1) / res;
          var h00 = H(u0, v0), h10 = H(u1, v0), h11 = H(u1, v1), h01 = H(u0, v1);
          var ck = cLow.clone().lerp(cTop, Math.min(1, (h00 + h11) / (2 * rise)));
          vb.addQuad([ox + u0, y + h00, oz + v0], [ox + u1, y + h10, oz + v0], [ox + u1, y + h11, oz + v1], [ox + u0, y + h01, oz + v1], ck, [ox, y - 1, oz]);
        }
        if (type === 'ribbed') {
          var rt2 = num(o.ribT, 0.28), rn = Q(14);
          for (var k2 = 0; k2 < rn; k2++) {
            var ua = -ax + 2 * ax * k2 / rn, ub = -ax + 2 * ax * (k2 + 1) / rn;
            var va = -az + 2 * az * k2 / rn, vb2 = -az + 2 * az * (k2 + 1) / rn;
            var d1a = [ox + ua, y + H(ua, va) - 0.05, oz + va], d1b = [ox + ub, y + H(ub, vb2) - 0.05, oz + vb2];
            var d2a = [ox + ua, y + H(ua, -va) - 0.05, oz - va], d2b = [ox + ub, y + H(ub, -vb2) - 0.05, oz - vb2];
            rb.addBeam(d1a, d1b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
            rb.addBeam(d2a, d2b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
            if (o.crossRibs !== false) {
              var e1a = [ox + ua, y + fu(ua) - 0.04, oz - az], e1b = [ox + ub, y + fu(ub) - 0.04, oz - az];
              rb.addBeam(e1a, e1b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
              if (bz === nz - 1) { var e2a = [ox + ua, y + fu(ua) - 0.04, oz + az], e2b = [ox + ub, y + fu(ub) - 0.04, oz + az]; rb.addBeam(e2a, e2b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 }); }
              var f1a = [ox - ax, y + fv(va) - 0.04, oz + va], f1b = [ox - ax, y + fv(vb2) - 0.04, oz + vb2];
              rb.addBeam(f1a, f1b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 });
              if (bx === nx - 1) { var f2a = [ox + ax, y + fv(va) - 0.04, oz + va], f2b = [ox + ax, y + fv(vb2) - 0.04, oz + vb2]; rb.addBeam(f2a, f2b, rt2, rt2 * 1.2, ribColor, { vary: 0.02 }); }
            }
          }
          ctx.sphere({ x: ox, y: y + H(0, 0) - 0.15, z: oz, r: 0.28, color: o.bossColor === undefined ? 0xd9b45a : o.bossColor, flat: true, w: 8, h: 6 });
        }
      }
    };
    ctx.vaultRib = function (o) {
      var n = Q(16), pts = profilePts(o.profile || 'round', o.a - 0.15, o.rise - 0.15, n);
      var rb = pick({ color: o.color, mat: o.mat, surf: o.surf });
      for (var i = 0; i < n; i++) {
        var p0 = pts[i], p1 = pts[i + 1];
        var A, B;
        if (o.axis === 'z') { A = [o.center + p0[0], o.y + p0[1] - 0.05, o.pos]; B = [o.center + p1[0], o.y + p1[1] - 0.05, o.pos]; }
        else { A = [o.pos, o.y + p0[1] - 0.05, o.center + p0[0]]; B = [o.pos, o.y + p1[1] - 0.05, o.center + p1[0]]; }
        rb.addBeam(A, B, o.t, o.d, o.color, { vary: 0.03 });
      }
    };

    // ---- 돔 / 반돔 ----
    ctx.dome = function (o) {
      var seg = Q(o.seg || 28), rings = Q(o.rings || 9), r = o.r, rise = o.rise, y = o.y, cx = o.x, cz = o.z;
      var color = o.color === undefined ? 0xf3ead8 : o.color, bands = o.bands;
      var topY = y;
      var vb = o.surf ? surfBatchFor(o.surf) : pick({ mat: o.mat, color: color });
      var dT = o.surf ? tileOf(surfDef(o.surf)) : [1, 1];
      var db = pick({ mat: o.mat, color: color, surf: o.drum && o.drum.surf });
      if (o.drum) {
        var D = o.drum, dh = D.h, wN = D.windows || 8;
        var dcol = D.color === undefined ? color : D.color;
        for (var s = 0; s < seg; s++) {
          var a0 = s / seg * PI * 2, a1 = (s + 1) / seg * PI * 2;
          db.addQuad([cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [cx + Math.cos(a1) * r, y + dh, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y + dh, cz + Math.sin(a0) * r], dcol, [cx, y + dh / 2, cz]);
        }
        for (var wI = 0; wI < wN; wI++) {
          var ang = (wI + 0.5) / wN * PI * 2;
          var nxw = -Math.cos(ang), nzw = -Math.sin(ang);
          ctx.window({ x: cx + Math.cos(ang) * (r - 0.02), z: cz + Math.sin(ang) * (r - 0.02), y: y + dh * 0.12, face: [nxw, nzw], w: num(D.w, Math.min(2.2, r * PI * 2 / wN * 0.5)), h: dh * 0.6, top: D.top || 'round', colors: D.colors, seed: wI + 5, beam: D.beam !== false, pattern: D.pattern || 'lancet', beamReach: r * 0.9, painted: true });
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
          var uvq = null;
          if (o.surf) {
            var uu0 = b0 / (PI * 2) * (o.surfRepeat || 3) * 2 * PI * r / dT[0] / (o.surfRepeat || 3), uu1 = b1 / (PI * 2) * 2 * PI * r / dT[0];
            var vv0 = (i / rings), vv1 = ((i + 1) / rings);
            uu0 = b0 / (PI * 2) * (o.surfRepeat || 3); uu1 = b1 / (PI * 2) * (o.surfRepeat || 3);
            uvq = [uu0, vv0 * (o.surfV || 1), uu1, vv0 * (o.surfV || 1), uu1, vv1 * (o.surfV || 1), uu0, vv1 * (o.surfV || 1)];
          }
          if (i === rings - 1) {
            vb.addTris([cx + Math.cos(b0) * r0, y0, cz + Math.sin(b0) * r0, cx + Math.cos(b1) * r0, y0, cz + Math.sin(b1) * r0, cx, y1, cz], cc, [cx, topY, cz], uvq ? { uvs: [uvq[0], uvq[1], uvq[2], uvq[3], (uvq[0] + uvq[2]) / 2, uvq[5]] } : null);
          } else {
            vb.addQuad([cx + Math.cos(b0) * r0, y0, cz + Math.sin(b0) * r0], [cx + Math.cos(b1) * r0, y0, cz + Math.sin(b1) * r0], [cx + Math.cos(b1) * r1, y1, cz + Math.sin(b1) * r1], [cx + Math.cos(b0) * r1, y1, cz + Math.sin(b0) * r1], cc, [cx, topY, cz], null, uvq);
          }
        }
      }
      if (o.ribs !== 0) {
        var rn = o.ribs === undefined ? 16 : o.ribs, rc = o.ribColor === undefined ? ctx.shade(color, 0.7) : o.ribColor;
        var rbb = pick({ color: rc, mat: o.ribMat });
        for (var k = 0; k < rn; k++) {
          var ak = k / rn * PI * 2, pts = [];
          for (var m = 0; m <= rings * 2; m++) { var pp = m / (rings * 2) * PI / 2; pts.push([cx + Math.cos(ak) * r * Math.cos(pp) * 0.99, topY + rise * Math.sin(pp) - 0.04, cz + Math.sin(ak) * r * Math.cos(pp) * 0.99]); }
          for (m = 0; m < pts.length - 1; m++) rbb.addBeam(pts[m], pts[m + 1], 0.22, 0.35, rc, { vary: 0.02 });
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
      var n = Q(o.seg || 24);
      var domeColor = o.mosaic ? (o.domeColor === undefined ? 0xd8aa3c : o.domeColor) : (o.domeColor === undefined ? color : o.domeColor);
      var bands = o.bands;
      var wb = pick({ color: color, mat: o.mat, surf: o.surf });
      var dsurf = o.domeSurf || (o.mosaic && ctx.hasPhoto('mosaic_gold') ? 'mosaic_gold' : null);
      var db = dsurf ? surfBatchFor(dsurf) : pick({ color: domeColor, mat: o.mosaic ? 'metal' : o.mat });
      var dT = dsurf ? tileOf(surfDef(dsurf)) : [1, 1];
      for (var i = 0; i < n; i++) {
        var a0 = base - PI / 2 + PI * i / n, a1 = base - PI / 2 + PI * (i + 1) / n;
        var x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
        wb.addQuad([x0, y, z0], [x1, y, z1], [x1, y + h, z1], [x0, y + h, z0], color, [cx, y + h / 2, cz]);
      }
      var rings = Q(8);
      for (var ri = 0; ri < rings; ri++) {
        var p0 = ri / rings * PI / 2, p1 = (ri + 1) / rings * PI / 2;
        var r0 = r * Math.cos(p0), r1 = r * Math.cos(p1), yy0 = y + h + rise * Math.sin(p0), yy1 = y + h + rise * Math.sin(p1);
        var bc = bands ? bands[ri % bands.length] : domeColor;
        var cc = dsurf ? G.toColor(0xffffff).clone().multiplyScalar(0.95 + 0.05 * ri / rings) : G.toColor(bc).clone().multiplyScalar(0.92 + 0.08 * ri / rings);
        for (var j = 0; j < n; j++) {
          var b0 = base - PI / 2 + PI * j / n, b1 = base - PI / 2 + PI * (j + 1) / n;
          var uvq = dsurf ? [j / n * 2.2, ri / rings * 1.4, (j + 1) / n * 2.2, ri / rings * 1.4, (j + 1) / n * 2.2, (ri + 1) / rings * 1.4, j / n * 2.2, (ri + 1) / rings * 1.4] : null;
          if (ri === rings - 1) {
            db.addTris([cx + Math.cos(b0) * r0, yy0, cz + Math.sin(b0) * r0, cx + Math.cos(b1) * r0, yy0, cz + Math.sin(b1) * r0, cx, yy1, cz], cc, [cx - dir[0] * 0.01, y + h, cz - dir[1] * 0.01], uvq ? { uvs: [uvq[0], uvq[1], uvq[2], uvq[3], (uvq[0] + uvq[2]) / 2, uvq[5]] } : null);
          } else {
            db.addQuad([cx + Math.cos(b0) * r0, yy0, cz + Math.sin(b0) * r0], [cx + Math.cos(b1) * r0, yy0, cz + Math.sin(b1) * r0], [cx + Math.cos(b1) * r1, yy1, cz + Math.sin(b1) * r1], [cx + Math.cos(b0) * r1, yy1, cz + Math.sin(b0) * r1], cc, [cx, y + h, cz], null, uvq);
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

    // ---- 창(지연 생성: 벽을 뚫은 개구부 안에 유리·창살) ----
    function windowFrame(o) {
      var n = o.face, nl = Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 1;
      var nx = n[0] / nl, nz = n[1] / nl;
      return { nx: nx, nz: nz, ux: nz, uz: -nx };
    }
    function topRise(top, w) { return top === 'pointed' ? w * 0.72 : (top === 'round' || top === 'trefoil' ? w / 2 : 0); }
    ctx.window = function (o) {
      var spec = Object.assign({}, o); spec.F = windowFrame(o); spec.top = o.top || 'round'; spec.pattern = o.pattern || 'lancet';
      S_.windows.push(spec);
      return spec;
    };
    ctx.rose = function (o) { var s = Object.assign({}, o); s.F = windowFrame(o); S_.roses.push(s); return s; };

    var stainedDefault = JEWEL;
    function shrinkPoly(poly, k) {
      var cx = 0, cy = 0, i;
      for (i = 0; i < poly.length; i++) { cx += poly[i][0]; cy += poly[i][1]; }
      cx /= poly.length; cy /= poly.length;
      var out = [];
      for (i = 0; i < poly.length; i++) out.push([cx + (poly[i][0] - cx) * k, cy + (poly[i][1] - cy) * k]);
      return out;
    }
    function buildWindow(o) {
      var F = o.F, w = o.w, h = o.h, top = o.top, pattern = o.pattern;
      var rand2 = G.rng(o.seed || 1);
      var colors = o.colors && o.colors.length ? o.colors : stainedDefault;
      var hosted = !!o.host, tdepth = hosted ? o.host.t : 0.3;
      var gd = hosted ? -Math.min(0.28, tdepth * 0.5) : 0.04;     // 유리 깊이(벽 안쪽 면 기준, 실내 방향 +)
      function P(u, v, d) { return [o.x + F.ux * u + F.nx * (d || 0), o.y + v, o.z + F.uz * u + F.nz * (d || 0)]; }
      var hint = P(0, h / 2, 2);
      var cells = [];
      var cols = pattern === 'solid' ? 1 : (pattern === 'grid' ? Math.max(3, Math.round(w / 0.4)) : (w > 1.5 ? 3 : 2));
      var rows = pattern === 'solid' ? 1 : Math.max(2, Math.round(h / (pattern === 'grid' ? 0.4 : 0.7)));
      var i, j;
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        cells.push([[-w / 2 + w * i / cols, h * j / rows], [-w / 2 + w * (i + 1) / cols, h * j / rows], [-w / 2 + w * (i + 1) / cols, h * (j + 1) / rows], [-w / 2 + w * i / cols, h * (j + 1) / rows]]);
      }
      var archPts = null;
      if (top === 'round' || top === 'trefoil' || top === 'pointed') {
        var rs = topRise(top, w);
        archPts = profilePts(top === 'pointed' ? 'pointed' : 'round', w / 2, rs, Q(top === 'pointed' ? 10 : 12));
        var inner = [];
        for (i = 0; i < archPts.length; i++) inner.push([archPts[i][0] * 0.38, h + archPts[i][1] * 0.38]);
        for (i = 0; i < archPts.length - 1; i++) cells.push([[archPts[i][0], h + archPts[i][1]], [archPts[i + 1][0], h + archPts[i + 1][1]], [inner[i + 1][0], inner[i + 1][1]], [inner[i][0], inner[i][1]]]);
        cells.push(inner.map(function (p) { return [p[0], p[1]]; }).concat([[inner[inner.length - 1][0], h], [inner[0][0], h]]));
      }
      // 납선 배경(어두운 면)
      var backPoly = [[-w / 2, 0], [w / 2, 0], [w / 2, h]];
      if (archPts) { for (i = archPts.length - 1; i >= 0; i--) backPoly.push([archPts[i][0], h + archPts[i][1]]); }
      backPoly.push([-w / 2, h]);
      var vb = [];
      for (i = 0; i < backPoly.length; i++) {
        var pa = backPoly[i], pb = backPoly[(i + 1) % backPoly.length];
        var A = P(0, h * 0.7, gd - 0.05), Bq = P(pa[0], pa[1], gd - 0.05), C = P(pb[0], pb[1], gd - 0.05);
        vb.push(A[0], A[1], A[2], Bq[0], Bq[1], Bq[2], C[0], C[1], C[2]);
      }
      B_.glow.addTris(vb, 0x0b0807, hint, { vary: 0 });
      var beamColors = [];
      for (var ci = 0; ci < cells.length; ci++) {
        var poly = shrinkPoly(cells[ci], 0.92);
        var pick2 = colors[Math.floor(rand2() * colors.length)];
        var col = G.toColor(pick2);
        if (beamColors.length < 3 && ci < cols * rows && rand2() < 0.4) beamColors.push(pick2);
        // 중심에서 가장자리로 어두워지는 유리(스테인드글라스 특유의 빛 번짐)
        var cu = 0, cv = 0, vv = [], vcols = [];
        for (var pi = 0; pi < poly.length; pi++) { cu += poly[pi][0]; cv += poly[pi][1]; }
        cu /= poly.length; cv /= poly.length;
        var cen = P(cu, cv, gd), cLight = col.clone().multiplyScalar(1.35 * (0.9 + rand2() * 0.2)), cDark = col.clone().multiplyScalar(0.72);
        for (var k = 0; k < poly.length; k++) {
          var q1 = P(poly[k][0], poly[k][1], gd), q2 = P(poly[(k + 1) % poly.length][0], poly[(k + 1) % poly.length][1], gd);
          vv.push(cen[0], cen[1], cen[2], q1[0], q1[1], q1[2], q2[0], q2[1], q2[2]);
          vcols.push(cLight, cDark, cDark);
        }
        glass.addTris(vv, vcols, hint, { vary: 0.1 });
        B_.glassRefl.addTris(vv, 0xffffff, hint, { vary: 0 });
      }
      while (beamColors.length < 3) beamColors.push(colors[Math.floor(rand2() * colors.length)]);
      if (o.frame !== false) {
        var fc = o.frameColor === undefined ? 0xd8cdb8 : o.frameColor, ft = 0.14, fd = hosted ? Math.min(0.5, tdepth * 0.9) : 0.14;
        var wallAng = Math.atan2(F.nx, F.nz);
        function fbox(u, v, bw, bh, d0, dd) { B_.solid.add(Geo.box(), fc, { x: o.x + F.ux * u + F.nx * d0, y: o.y + v, z: o.z + F.uz * u + F.nz * d0, ry: wallAng, sx: bw, sy: bh, sz: dd, flat: true, vary: 0.02 }); }
        // 돌 틀(안쪽 면에 돌출)
        fbox(-w / 2 - ft / 2, 0, ft, h, 0.06, 0.14);
        fbox(w / 2 + ft / 2, 0, ft, h, 0.06, 0.14);
        fbox(0, -0.13, w + ft * 2 + 0.16, 0.14, 0.1, 0.24);   // 창턱
        // 창살(세로·가로)
        for (i = 1; i < cols; i++) fbox(-w / 2 + w * i / cols, 0, 0.035, h, gd + 0.03, 0.05);
        for (j = 1; j < rows; j++) fbox(0, h * j / rows, w, 0.035, gd + 0.03, 0.05);
        if (archPts) {
          for (i = 0; i < archPts.length - 1; i++) {
            var a0 = archPts[i], a1 = archPts[i + 1];
            var du = a1[0] - a0[0], dv = a1[1] - a0[1], l = Math.sqrt(du * du + dv * dv);
            var outU = -dv / l, outV = du / l;
            var pm0 = P((a0[0] + a1[0]) / 2, h + (a0[1] + a1[1]) / 2, 0.06);
            var pmx = pm0[0] + F.ux * outU * ft / 2, pmz = pm0[2] + F.uz * outU * ft / 2, pmy = pm0[1] + outV * ft / 2;
            var qf = new T.Quaternion().setFromAxisAngle(new T.Vector3(F.nx, 0, F.nz), Math.atan2(dv, du)).multiply(new T.Quaternion().setFromEuler(new T.Euler(0, wallAng, 0, 'YXZ')));
            B_.solid.add(Geo.boxC(), fc, { x: pmx, y: pmy, z: pmz, q: qf, sx: l * 1.08, sy: ft, sz: 0.14, flat: true, vary: 0.02 });
            // 창살 호(가는)
          }
        }
      }
      if (o.beam !== false) {
        ctx.addWindowBeam({ x: o.x + F.nx * gd, y: o.y + h * 0.55, z: o.z + F.nz * gd, face: [F.nx, F.nz], w: w, h: h * 0.9, colors: beamColors, reach: o.beamReach, top: top, win: o });
      }
    }
    function buildRose(o) {
      var F = o.F, rand2 = G.rng(o.seed || 2), r = o.r, pet = o.petals || 12, off = 0.04;
      var colors = o.colors && o.colors.length ? o.colors : JEWEL;
      function P(u, v, d) { return [o.x + F.ux * u + F.nx * (d || 0), o.y + v, o.z + F.uz * u + F.nz * (d || 0)]; }
      var hint = P(0, 0, 2);
      var seg = 40, vb = [], i;
      for (i = 0; i < seg; i++) {
        var a0 = i / seg * PI * 2, a1 = (i + 1) / seg * PI * 2, c = P(0, 0, off * 0.5), b = P(Math.cos(a0) * r, Math.sin(a0) * r, off * 0.5), d = P(Math.cos(a1) * r, Math.sin(a1) * r, off * 0.5);
        vb.push(c[0], c[1], c[2], b[0], b[1], b[2], d[0], d[1], d[2]);
      }
      B_.glow.addTris(vb, 0x0b0807, hint, { vary: 0 });
      function ringCell(r0, r1, a0, a1, col) {
        var A = P(Math.cos(a0) * r0, Math.sin(a0) * r0, off), B = P(Math.cos(a1) * r0, Math.sin(a1) * r0, off), C = P(Math.cos(a1) * r1, Math.sin(a1) * r1, off), D = P(Math.cos(a0) * r1, Math.sin(a0) * r1, off);
        var v = [A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]];
        glass.addTris(v, col, hint, { vary: 0.1 });
        B_.glassRefl.addTris(v, 0xffffff, hint, { vary: 0 });
      }
      for (i = 0; i < pet; i++) {
        var pa = i / pet * PI * 2 + 0.05, pb = (i + 1) / pet * PI * 2 - 0.05;
        ringCell(r * 0.66, r * 0.95, pa, pb, G.toColor(colors[Math.floor(rand2() * colors.length)]));
        ringCell(r * 0.3, r * 0.6, pa, pb, G.toColor(colors[Math.floor(rand2() * colors.length)]));
      }
      for (i = 0; i < 8; i++) ringCell(0, r * 0.24, i / 8 * PI * 2, (i + 1) / 8 * PI * 2 - 0.02, G.toColor(colors[(i * 3) % colors.length]));
      if (o.frame !== false) {
        var wallAng = Math.atan2(F.nx, F.nz), fc = o.frameColor === undefined ? 0xd8cdb8 : o.frameColor;
        for (i = 0; i < 24; i++) {
          var aa = (i + 0.5) / 24 * PI * 2, pp = P(Math.cos(aa) * (r + 0.08), Math.sin(aa) * (r + 0.08), 0.07);
          var qa = new T.Quaternion().setFromAxisAngle(new T.Vector3(F.nx, 0, F.nz), (aa + PI / 2));
          var qf = qa.multiply(new T.Quaternion().setFromEuler(new T.Euler(0, wallAng, 0, 'YXZ')));
          B_.solid.add(Geo.boxC(), fc, { x: pp[0], y: pp[1], z: pp[2], q: qf, sx: r * PI * 2 / 24 * 1.1, sy: 0.18, sz: 0.14, flat: true });
        }
      }
      if (o.beam) ctx.addWindowBeam({ x: o.x, y: o.y, z: o.z, face: [F.nx, F.nz], w: r * 1.6, h: r * 1.6, colors: colors.slice(0, 3), reach: o.beamReach });
    }

    // ---- 벽 생성(창 구멍) ----
    function matchWindows() {
      S_.windows.forEach(function (wn) {
        if (wn.painted) return;
        var F = wn.F;
        for (var i = 0; i < S_.walls.length; i++) {
          var w = S_.walls[i], dx = w.x1 - w.x0, dz = w.z1 - w.z0;
          var axisX = Math.abs(dz) < 1e-6, axisZ = Math.abs(dx) < 1e-6;
          if (!axisX && !axisZ) continue;
          var smin = axisX ? Math.min(w.x0, w.x1) : Math.min(w.z0, w.z1), smax = axisX ? Math.max(w.x0, w.x1) : Math.max(w.z0, w.z1);
          var c = axisX ? w.z0 : w.x0, along = axisX ? wn.x : wn.z, across = axisX ? wn.z : wn.x;
          var nAxis = axisX ? F.nz : F.nx;
          if (Math.abs(nAxis) < 0.95) continue;
          if (Math.abs(across - c) > w.t / 2 + 0.45) continue;
          if (along - wn.w / 2 < smin - 0.05 || along + wn.w / 2 > smax + 0.05) continue;
          var rise = topRise(wn.top, wn.w);
          if (wn.y < w.y - 0.02 || wn.y + wn.h + rise > w.y + w.h + 0.05) continue;
          wn.host = w; wn.hostAxisX = axisX; w.windows = w.windows || []; w.windows.push(wn);
          // 창 평면을 벽 안쪽 면으로 정렬
          var sgn = nAxis > 0 ? 1 : -1, inner = c + sgn * w.t / 2;
          if (axisX) wn.z = inner; else wn.x = inner;
          return;
        }
      });
    }
    function buildWalls() {
      S_.walls.forEach(function (w) {
        var dx = w.x1 - w.x0, dz = w.z1 - w.z0, len = Math.sqrt(dx * dx + dz * dz), t = w.t, h = w.h, y0 = w.y;
        var b = w.surf ? surfBatchFor(w.surf) : (w.mat ? B_[w.mat] : B_.solid);
        var col = w.surf ? (w.color === 0xf2e6cf ? 0xffffff : w.color) : w.color;
        var axisX = Math.abs(dz) < 1e-6, axisZ = Math.abs(dx) < 1e-6;
        var cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2;
        function piece(s0, s1, ya, yb) {
          if (s1 - s0 < 1e-3 || yb - ya < 1e-3) return;
          if (axisX) b.add(Geo.box(), col, { x: (s0 + s1) / 2, y: ya, z: cz, sx: s1 - s0, sy: yb - ya, sz: t, flat: true, vary: w.vary });
          else b.add(Geo.box(), col, { x: cx, y: ya, z: (s0 + s1) / 2, sx: t, sy: yb - ya, sz: s1 - s0, flat: true, vary: w.vary });
        }
        if (!axisX && !axisZ) {
          b.add(Geo.box(), col, { x: cx, y: y0, z: cz, ry: Math.atan2(-dz, dx), sx: len, sy: h, sz: t, flat: true, vary: w.vary });
          return;
        }
        var smin = axisX ? Math.min(w.x0, w.x1) : Math.min(w.z0, w.z1), smax = axisX ? Math.max(w.x0, w.x1) : Math.max(w.z0, w.z1);
        var c = axisX ? cz : cx;
        var holes = (w.windows || []).slice().sort(function (a, b2) { return (axisX ? a.x : a.z) - (axisX ? b2.x : b2.z); });
        var cur = smin;
        holes.forEach(function (wn) {
          var sc = axisX ? wn.x : wn.z, hw = wn.w / 2, s0 = sc - hw, s1 = sc + hw, rise = topRise(wn.top, wn.w), sill = wn.y, spring = wn.y + wn.h, topH = spring + rise;
          piece(cur, s0, y0, y0 + h);
          piece(s0, s1, y0, sill);
          piece(s0, s1, topH, y0 + h);
          // 아치 위 모서리(spandrel) 채움
          if (rise > 0.01) {
            var pts = profilePts(wn.top === 'pointed' ? 'pointed' : 'round', hw, rise, Q(wn.top === 'pointed' ? 10 : 12));
            [-1, 1].forEach(function (sg) {
              var half = [];
              for (var i = 0; i < pts.length; i++) { var u = pts[i][0]; if (sg < 0 ? u <= 1e-6 : u >= -1e-6) half.push([sc + u, spring + pts[i][1]]); }
              if (sg > 0) half.reverse();
              // 경계: corner(sc+sg*hw, topH) -> half[0] ... half[last]
              var corner = [sc + sg * hw, topH];
              var ptsList = half.slice();
              var vs0 = [], vs1 = [];
              function pos(s, yy, a) { return axisX ? [s, yy, a] : [a, yy, s]; }
              var a0 = c - t / 2, a1 = c + t / 2;
              for (var k = 0; k < ptsList.length - 1; k++) {
                var P0 = ptsList[k], P1 = ptsList[k + 1];
                var tri0 = [].concat(pos(corner[0], corner[1], a1), pos(P0[0], P0[1], a1), pos(P1[0], P1[1], a1));
                var tri1 = [].concat(pos(corner[0], corner[1], a0), pos(P0[0], P0[1], a0), pos(P1[0], P1[1], a0));
                b.addTris(tri0, col, pos(corner[0], corner[1], a1 + 1), { vary: 0 });
                b.addTris(tri1, col, pos(corner[0], corner[1], a0 - 1), { vary: 0 });
                // 아치 안쪽 면(창 중심을 향함)
                var hintC = pos(sc, spring, c);
                b.addTris([].concat(pos(P0[0], P0[1], a0), pos(P1[0], P1[1], a0), pos(P1[0], P1[1], a1), pos(P0[0], P0[1], a0), pos(P1[0], P1[1], a1), pos(P0[0], P0[1], a1)), col, hintC, { vary: 0 });
              }
              // 세로 옆면(창 옆 개구부 면) 은 상자의 면으로 이미 있음
            });
          }
          cur = s1;
        });
        piece(cur, smax, y0, y0 + h);
        // 걸레받이와 처마 돌림띠(입체감)
        var along = len, plinth = w.plinth === undefined ? (y0 < 0.01 && h >= 2.5) : w.plinth, crown = w.crown === undefined ? (h >= 3.5) : w.crown;
        function slab(ya, hh, grow, colr) {
          if (axisX) b.add(Geo.box(), colr, { x: (smin + smax) / 2, y: ya, z: cz, sx: smax - smin + (grow > 0 ? 0 : 0), sy: hh, sz: t + grow * 2, flat: true, vary: 0.02 });
          else b.add(Geo.box(), colr, { x: cx, y: ya, z: (smin + smax) / 2, sx: t + grow * 2, sy: hh, sz: smax - smin, flat: true, vary: 0.02 });
        }
        if (plinth) { slab(y0, 0.28, 0.07, w.plinthColor === undefined ? (w.surf ? 0xd0d0d0 : ctx.shade(w.color, 0.82)) : w.plinthColor); slab(y0 + 0.28, 0.07, 0.05, w.plinthColor === undefined ? (w.surf ? 0xe0e0e0 : ctx.shade(w.color, 0.9)) : w.plinthColor); }
        if (crown) {
          var cc2 = w.crownColor === undefined ? (w.surf ? 0xe8e8e8 : ctx.shade(w.color, 1.02)) : w.crownColor;
          slab(y0 + h - 0.32, 0.12, 0.05, cc2); slab(y0 + h - 0.2, 0.1, 0.1, cc2); slab(y0 + h - 0.1, 0.1, 0.16, ctx.shade(cc2, 0.95));
        }
        // 벽 밑 접촉 AO
        if (y0 < 0.01 && w.aoDecal !== false) {
          if (axisX) ctx.aoDecal({ x0: smin, x1: smax, z0: cz - t / 2 - 0.0, z1: cz + t / 2, y: 0, pad: 0.35 });
          else ctx.aoDecal({ x0: cx - t / 2, x1: cx + t / 2, z0: smin, z1: smax, y: 0, pad: 0.35 });
        }
      });
    }

    // ---- 조각상 / 벽감 ----
    ctx.statue = function (o) {
      var h = num(o.h, 1.7), y = num(o.y, 0), kind = o.kind || 'saint';
      var robe = o.robe === undefined ? (kind === 'mary' ? 0xf4f0ea : 0xe6dccb) : o.robe, mantle = o.mantle === undefined ? (kind === 'mary' ? 0x7aa6e0 : 0xb9a58a) : o.mantle, skin = o.skin === undefined ? 0xf3dcc4 : o.skin;
      var s = h / 1.7, ry = num(o.ry, 0);
      var ca = Math.cos(ry), sa = Math.sin(ry);
      function pt(lx, lz) { return [o.x + lx * ca + lz * sa, o.z - lx * sa + lz * ca]; }
      var mt = o.marble === false ? undefined : 'gloss';
      ctx.cyl({ x: o.x, y: y, z: o.z, r: 0.32 * s, rTop: 0.14 * s, h: h * 0.72, seg: 12, color: robe, mat: mt, flat: false });
      var back = pt(0, 0.12 * s);
      ctx.cyl({ x: back[0], y: y + h * 0.04, z: back[1], r: 0.36 * s, rTop: 0.18 * s, h: h * 0.7, seg: 10, color: mantle, ry: ry, mat: mt });
      ctx.sphere({ x: o.x, y: y + h * 0.82, z: o.z, r: 0.17 * s, color: skin, w: 12, h: 10, mat: mt });
      ctx.sphere({ x: o.x, y: y + h * 0.88, z: o.z, r: 0.185 * s, sy: 0.12 * s, color: mantle, w: 10, h: 5, mat: mt });
      if (o.halo !== false) glow.add(Geo.cyl(16, 1), 0xf2d27a, { x: o.x, y: y + h * 0.82, z: o.z, sx: 0.28 * s, sy: 0.02, sz: 0.28 * s, rx: PI / 2, ry: ry, flat: true, vary: 0 });
      if (kind === 'angel') {
        [-1, 1].forEach(function (sg) { var p = pt(sg * 0.28 * s, 0.14 * s); ctx.box({ x: p[0], y: y + h * 0.45, z: p[1], w: 0.08 * s, h: h * 0.4, d: 0.32 * s, color: 0xffffff, ry: ry, rz: sg * 0.4, mat: mt }); });
      }
      if (kind === 'christ') { var arm = pt(0, -0.15 * s); ctx.box({ x: arm[0], y: y + h * 0.55, z: arm[1], w: 0.5 * s, h: 0.07 * s, d: 0.08 * s, color: robe, ry: ry, mat: mt }); }
    };
    ctx.statueNiche = function (o) {
      var F = windowFrame(o), w = num(o.w, 1.4), h = num(o.h, 2.6), axis = Math.abs(F.nx) > Math.abs(F.nz) ? 'z' : 'x';
      ctx.box({ x: o.x + F.nx * 0.03, y: o.y, z: o.z + F.nz * 0.03, w: Math.abs(F.ux) > 0.5 ? w : 0.06, h: h, d: Math.abs(F.uz) > 0.5 ? w : 0.06, color: o.back === undefined ? 0x6f6458 : o.back, ry: 0 });
      ctx.arch({ x: o.x + F.nx * 0.06, y: o.y + h, z: o.z + F.nz * 0.06, span: w, rise: w * 0.55, t: 0.16, depth: 0.12, axis: axis, type: 'round', color: o.frame === undefined ? 0xe8e0d0 : o.frame, mat: 'gloss' });
      ctx.statue({ x: o.x + F.nx * 0.25, z: o.z + F.nz * 0.25, y: o.y + 0.05, ry: Math.atan2(F.nx, F.nz) + PI, h: h * 0.78, kind: o.kind, robe: o.robe, mantle: o.mantle, skin: o.skin, halo: o.halo });
    };

    // ---- 제대·성소 가구 ----
    ctx.altar = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), w = num(o.w, 2.6), d = num(o.d, 1.1), h = num(o.h, 1.0), ry = num(o.ry, 0), style = o.style || 'table';
      var color = o.color === undefined ? 0xf4efe6 : o.color;
      var ms = o.surf || (ctx.hasPhoto('marble_white') ? 'marble_white' : null);
      var ca = Math.cos(ry), sa = Math.sin(ry);
      function pt(lx, lz) { return [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; }
      var mk = { surf: ms, mat: ms ? undefined : 'gloss' };
      if (style === 'table') {
        [-1, 1].forEach(function (sg) { var p = pt(sg * (w / 2 - 0.35), 0); ctx.box(Object.assign({ x: p[0], y: y, z: p[1], w: 0.5, h: h - 0.14, d: d * 0.85, color: ctx.shade(color, 0.96), ry: ry }, mk)); });
        ctx.box(Object.assign({ x: x, y: y + h * 0.35, z: z, w: w - 0.9, h: 0.2, d: d * 0.7, color: ctx.shade(color, 0.9), ry: ry }, mk));
        ctx.box(Object.assign({ x: x, y: y + h - 0.14, z: z, w: w, h: 0.14, d: d, color: color, ry: ry }, mk));
      } else {
        ctx.box(Object.assign({ x: x, y: y, z: z, w: w * 0.92, h: h - 0.14, d: d * 0.9, color: color, ry: ry }, mk));
        ctx.box(Object.assign({ x: x, y: y + h - 0.14, z: z, w: w, h: 0.14, d: d, color: ctx.shade(color, 1.04), ry: ry }, mk));
        ctx.box({ x: x, y: y + h * 0.5, z: z + (ca * (d / 2 + 0.03)), w: w * 0.5, h: 0.04, d: 0.03, color: 0xd9b45a, ry: ry });
      }
      if (o.cloth !== false) {
        ctx.box({ x: x, y: y + h, z: z, w: w * 1.02, h: 0.03, d: d * 1.02, color: 0xf7f1e4, ry: ry, mat: 'solid' });
        var f = pt(0, d / 2 + 0.01);
        ctx.box({ x: f[0], y: y + h * 0.5, z: f[1], w: w * 0.92, h: h * 0.5, d: 0.03, color: 0xf7f1e4, ry: ry, mat: 'solid' });
        ctx.box({ x: f[0], y: y + h * 0.9, z: f[1], w: w * 0.92, h: 0.07, d: 0.04, color: 0xd9b45a, ry: ry });
        ctx.box({ x: f[0], y: y + h * 0.52, z: f[1], w: w * 0.92, h: 0.03, d: 0.04, color: 0xd9b45a, ry: ry });
      }
      var nc = o.candles === undefined ? 2 : o.candles;
      for (var i = 0; i < nc; i++) {
        var lx = nc === 1 ? 0 : -w / 2 + 0.25 + (w - 0.5) * i / (nc - 1);
        var p = pt(lx, -d * 0.2);
        ctx.cyl({ x: p[0], y: y + h + 0.03, z: p[1], r: 0.07, rTop: 0.04, h: 0.35, seg: 10, color: 0xd9b45a, flat: false });
        ctx.cyl({ x: p[0], y: y + h + 0.38, z: p[1], r: 0.05, h: 0.3, seg: 10, color: 0xfff6e0, mat: 'solid', flat: false });
        ctx.addFlame({ x: p[0], y: y + h + 0.78, z: p[1], scale: 1.0 });
      }
      if (o.flowers !== false) {
        [-1, 1].forEach(function (sg) {
          var p = pt(sg * (w / 2 + 0.55), 0.1);
          ctx.cyl({ x: p[0], y: y, z: p[1], r: 0.16, rTop: 0.22, h: 0.4, seg: 12, color: 0xf0e8dc, mat: 'gloss', flat: false });
          for (var k = 0; k < 9; k++) ctx.ico({ x: p[0] + (rand() - 0.5) * 0.28, y: y + 0.55 + rand() * 0.28, z: p[1] + (rand() - 0.5) * 0.28, r: 0.12, color: [0xffffff, 0xfff0f5, 0xffd9e6, 0xf6f6e6][k % 4], detail: 1, mat: 'solid' });
        });
      }
      ctx.aoDecal({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y: y, pad: 0.35 });
      if (o.collide !== false) ctx.addCollider({ x0: x - (Math.abs(ca) > 0.5 ? w : d) / 2 - 0.1, x1: x + (Math.abs(ca) > 0.5 ? w : d) / 2 + 0.1, z0: z - (Math.abs(ca) > 0.5 ? d : w) / 2 - 0.1, z1: z + (Math.abs(ca) > 0.5 ? d : w) / 2 + 0.1 });
    };
    ctx.baldachin = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), w = num(o.w, 5), d = num(o.d, 5), h = num(o.h, 5), ch = num(o.canopyH, 1.4);
      var gold = o.gold === undefined ? 0xc99a45 : o.gold;
      var cols = o.columns || 4;
      var pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
      for (var i = 0; i < cols && i < 4; i++) ctx.column({ x: x + pts[i][0], z: z + pts[i][1], y: y, h: h, r: num(o.r, 0.32), style: o.style || 'twisted', capital: 'composite', color: o.color === undefined ? 0x6e4a2e : o.color, capColor: gold, collide: true, mat: 'metal' });
      ctx.box({ x: x, y: y + h, z: z, w: w + 0.9, h: 0.35, d: d + 0.9, color: gold });
      ctx.box({ x: x, y: y + h + 0.35, z: z, w: w + 0.4, h: ch * 0.4, d: d + 0.4, color: o.color === undefined ? 0x5a3c24 : o.color, mat: 'metal' });
      for (var k = 0; k < 4; k++) {
        var p = pts[k];
        ctx.beam3([x + p[0], y + h + 0.6, z + p[1]], [x, y + h + ch + 0.6, z], 0.18, 0.18, gold);
      }
      ctx.sphere({ x: x, y: y + h + ch + 0.75, z: z, r: 0.3, color: gold, flat: false });
      if (o.cross !== false) { ctx.box({ x: x, y: y + h + ch + 0.95, z: z, w: 0.1, h: 0.7, d: 0.1, color: gold }); ctx.box({ x: x, y: y + h + ch + 1.35, z: z, w: 0.4, h: 0.1, d: 0.1, color: gold }); }
    };
    ctx.pulpit = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), h = num(o.h, 1.2), ry = num(o.ry, 0), c = o.color === undefined ? 0x5a3624 : o.color, style = o.style || 'ambo';
      if (style === 'ambo') {
        ctx.box({ x: x, y: y, z: z, w: 0.7, h: h - 0.1, d: 0.5, color: c, ry: ry, mat: 'wood' });
        ctx.box({ x: x, y: y + h - 0.1, z: z, w: 0.9, h: 0.12, d: 0.7, color: ctx.shade(c, 1.15), ry: ry, rx: -0.25, mat: 'wood' });
        ctx.box({ x: x, y: y + h + 0.02, z: z, w: 0.6, h: 0.05, d: 0.4, color: 0xf6f0e0, ry: ry, rx: -0.25, mat: 'solid' });
        ctx.addCollider({ x: x, z: z, r: 0.55 });
      } else {
        var ph = num(o.h, 3.2);
        ctx.cyl({ x: x, y: y, z: z, r: 0.28, h: ph - 0.9, seg: 12, color: c, mat: 'wood' });
        ctx.cyl({ x: x, y: y + ph - 1.0, z: z, r: 0.75, rTop: 0.9, h: 1.0, seg: 12, color: ctx.shade(c, 1.1), mat: 'wood' });
        ctx.cyl({ x: x, y: y + ph, z: z, r: 0.95, rTop: 0.95, h: 0.08, seg: 12, color: 0xd9b45a });
        ctx.cone({ x: x, y: y + ph + 0.9, z: z, r: 1.05, h: 1.6, seg: 12, color: c, mat: 'wood' });
        for (var i = 0; i < 4; i++) { var a = i * PI / 2 + PI / 4; ctx.cyl({ x: x + Math.cos(a) * 0.85, y: y + ph + 0.08, z: z + Math.sin(a) * 0.85, r: 0.05, h: 0.82, seg: 6, color: 0xd9b45a }); }
        ctx.addCollider({ x: x, z: z, r: 0.95 });
      }
    };
    ctx.tabernacle = function (o) {
      var x = o.x, z = o.z, y = num(o.y, 0), ry = num(o.ry, 0);
      ctx.box({ x: x, y: y, z: z, w: 1.0, h: 1.1, d: 0.9, color: 0xe8e0d0, ry: ry, mat: 'gloss' });
      ctx.box({ x: x, y: y + 1.1, z: z, w: 0.62, h: 0.55, d: 0.5, color: 0xd9b45a, ry: ry });
      ctx.cone({ x: x, y: y + 1.65, z: z, r: 0.38, h: 0.3, seg: 10, color: 0xe6c260 });
      ctx.box({ x: x, y: y + 1.95, z: z, w: 0.06, h: 0.26, d: 0.06, color: 0xd9b45a });
      ctx.box({ x: x, y: y + 2.05, z: z, w: 0.18, h: 0.05, d: 0.05, color: 0xd9b45a });
      ctx.addCollider({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.55, z1: z + 0.55 });
      if (o.lamp !== false) {
        var lx = x + 1.1;
        ctx.cyl({ x: lx, y: y, z: z, r: 0.05, h: 2.1, seg: 8, color: 0xd9b45a });
        ctx.cyl({ x: lx, y: y, z: z, r: 0.16, rTop: 0.08, h: 0.12, seg: 10, color: 0xd9b45a });
        glow.add(Geo.cyl(10, 1), new T.Color(0xff5a4a).multiplyScalar(2.2), { x: lx, y: y + 2.1, z: z, sx: 0.1, sy: 0.28, sz: 0.1, flat: true, vary: 0 });
        ctx.addGlow({ x: lx, y: y + 2.25, z: z, size: 0.9, color: 0xff4030, pulse: 0.15, kind: 'always' });
        ctx.addCollider({ x: lx, z: z, r: 0.2 });
      }
    };
    ctx.crucifix = function (o) {
      var x = o.x, y = o.y, z = o.z, h = num(o.h, 3.6), ry = num(o.ry, 0), wood = 0x5a3822;
      var ca = Math.cos(ry), sa = Math.sin(ry);
      function pt(lx, lz) { return [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; }
      ctx.box({ x: x, y: y, z: z, w: h * 0.08, h: h, d: h * 0.06, color: wood, ry: ry, mat: 'wood' });
      ctx.box({ x: x, y: y + h * 0.62, z: z, w: h * 0.56, h: h * 0.07, d: h * 0.06, color: wood, ry: ry, mat: 'wood' });
      var f = pt(0, h * 0.05);
      ctx.sphere({ x: f[0], y: y + h * 0.7, z: f[1], r: h * 0.045, color: 0xeed8c0, w: 12, h: 8, mat: 'gloss' });
      ctx.box({ x: f[0], y: y + h * 0.42, z: f[1], w: h * 0.09, h: h * 0.26, d: h * 0.04, color: 0xeed8c0, ry: ry, mat: 'gloss' });
      ctx.box({ x: f[0], y: y + h * 0.64, z: f[1], w: h * 0.44, h: h * 0.035, d: h * 0.035, color: 0xeed8c0, ry: ry, mat: 'gloss' });
      ctx.box({ x: f[0], y: y + h * 0.36, z: f[1], w: h * 0.1, h: h * 0.07, d: h * 0.05, color: 0xffffff, ry: ry, mat: 'gloss' });
      ctx.box({ x: f[0], y: y + h * 0.22, z: f[1], w: h * 0.06, h: h * 0.16, d: h * 0.035, color: 0xeed8c0, ry: ry, mat: 'gloss' });
      if (o.glow !== false) ctx.addGlow({ x: x + sa * 0.3, y: y + h * 0.62, z: z + ca * 0.3, size: h * 1.1, color: 0xffe2a0, kind: 'always' });
    };
    ctx.chandelier = function (o) {
      var x = o.x, y = o.y, z = o.z, chain = num(o.chain, 1.5), r = num(o.r, 0.8), tiers = o.tiers || 1;
      ctx.cyl({ x: x, y: y, z: z, r: 0.025, h: chain, seg: 5, color: 0x2e2a26, mat: 'metal' });
      for (var t = 0; t < tiers; t++) {
        var rr = r * (1 - t * 0.35), yy = y - t * 0.5;
        var n = 8 + t * 2;
        ctx.cyl({ x: x, y: yy - 0.05, z: z, r: rr, h: 0.05, seg: 20, color: 0x3a3430, mat: 'metal' });
        for (var i = 0; i < n; i++) {
          var a = i / n * PI * 2;
          var px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
          ctx.cyl({ x: px, y: yy, z: pz, r: 0.03, h: 0.18, seg: 6, color: 0xf3ead0, mat: 'solid' });
          glow.add(Geo.sph(6, 4), new T.Color(0xffd78a).multiplyScalar(2.5), { x: px, y: yy + 0.24, z: pz, s: 0.06, flat: true, vary: 0 });
        }
      }
      ctx.addGlow({ x: x, y: y + 0.2, z: z, size: r * 3.2, color: 0xffc977, kind: 'lamp', pulse: 0.05 });
    };
    ctx.lantern = function (o) {
      var chain = num(o.chain, 1.2);
      ctx.cyl({ x: o.x, y: o.y + 0.2, z: o.z, r: 0.02, h: chain, seg: 5, color: 0x2e2a26, mat: 'metal' });
      ctx.cone({ x: o.x, y: o.y + 0.22, z: o.z, r: 0.2, h: 0.15, seg: 8, color: 0x2e2a26, mat: 'metal' });
      glow.add(Geo.cyl(8, 1), new T.Color(0xffd78a).multiplyScalar(2.2), { x: o.x, y: o.y - 0.15, z: o.z, sx: 0.14, sy: 0.35, sz: 0.14, flat: true, vary: 0 });
      ctx.addGlow({ x: o.x, y: o.y, z: o.z, size: 1.6, color: 0xffc977, kind: 'lamp' });
    };
    ctx.holyFont = function (o) {
      var y = num(o.y, 0);
      ctx.cyl({ x: o.x, y: y, z: o.z, r: 0.28, rTop: 0.2, h: 0.85, seg: 14, color: 0xd8d0c0, mat: 'gloss', flat: false });
      ctx.cyl({ x: o.x, y: y + 0.85, z: o.z, r: 0.38, rTop: 0.48, h: 0.18, seg: 16, color: 0xe8e0d0, mat: 'gloss', flat: false });
      glow.add(Geo.cyl(12, 1), 0x9fd3f0, { x: o.x, y: y + 1.0, z: o.z, sx: 0.4, sy: 0.02, sz: 0.4, flat: true, vary: 0 });
      ctx.addCollider({ x: o.x, z: o.z, r: 0.42 });
      ctx.aoDecalCircle({ x: o.x, z: o.z, r: 0.45, y: y });
    };
    ctx.steps = function (o) {
      var n = o.n || 2, dir = o.dir || [0, -1], color = o.color === undefined ? 0xe4dccb : o.color;
      var x0 = o.x0, x1 = o.x1, z0 = o.z0, z1 = o.z1;
      for (var i = 0; i < n; i++) {
        var yTop = o.y0 + (o.y1 - o.y0) * (i + 1) / n;
        var bx0 = x0, bx1 = x1, bz0 = z0, bz1 = z1;
        if (dir[1] !== 0) { var span = z1 - z0; if (dir[1] < 0) { bz1 = z1 - span * i / n; bz0 = z0; } else { bz0 = z0 + span * i / n; bz1 = z1; } }
        else { var spx = x1 - x0; if (dir[0] < 0) { bx1 = x1 - spx * i / n; bx0 = x0; } else { bx0 = x0 + spx * i / n; bx1 = x1; } }
        ctx.boxAABB({ x0: bx0, x1: bx1, z0: bz0, z1: bz1, y0: o.y0, y1: yTop, color: ctx.shade(color, 1 - 0.02 * i), surf: o.surf, mat: o.surf ? undefined : 'gloss' });
        ctx.floorZone({ x0: bx0, x1: bx1, z0: bz0, z1: bz1, y: yTop });
      }
    };
    // 양탄자: 천 질감(테두리 줄무늬·메달리온) + 약간의 두께. pattern:false 면 단색.
    ctx.carpet = function (o) {
      var y = num(o.y, 0), w = o.x1 - o.x0, l = o.z1 - o.z0;
      var c = o.color === undefined ? 0x8a2433 : o.color, b = o.border === undefined ? 0xc9a24b : o.border;
      var t = tex.carpet({ color: c, border: b }).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping;
      var along = l >= w; var len = along ? l : w, wid = along ? w : l;
      t.repeat.set(1, Math.max(1, len / (wid * 2)));
      var m = new T.MeshStandardMaterial({ map: t, roughness: 0.95, color: 0xffffff });
      S_.physMats.push({ m: m, envK: 0.2, cc: 0, em: 0 });
      var mesh = new T.Mesh(new T.PlaneGeometry(wid, len), m);
      mesh.rotation.x = -PI / 2; if (!along) mesh.rotation.z = PI / 2;
      mesh.position.set((o.x0 + o.x1) / 2, y + 0.012, (o.z0 + o.z1) / 2); mesh.receiveShadow = true;
      ctx.root.add(mesh); stats.meshes++;
      ctx.boxAABB({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y0: y, y1: y + 0.008, color: ctx.shade(c, 0.5), vary: 0 });
    };
    ctx.medallionFrieze = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.round(len / num(o.spacing, 2.4)));
      var f = o.facing || [0, 1], ry = Math.atan2(f[0], f[1]);
      var gold = o.gold === undefined ? 0xd9b45a : o.gold;
      ctx.box({ x: (o.x0 + o.x1) / 2 + f[0] * 0.04, y: o.y, z: (o.z0 + o.z1) / 2 + f[1] * 0.04, w: Math.abs(dx) > Math.abs(dz) ? len : 0.08, h: o.h, d: Math.abs(dz) >= Math.abs(dx) ? len : 0.08, color: o.color === undefined ? 0x2a4488 : o.color, surf: o.surf });
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n, px = o.x0 + dx * t + f[0] * 0.09, pz = o.z0 + dz * t + f[1] * 0.09;
        var rr = o.h * 0.4;
        pick({ color: gold }).add(Geo.cyl(20, 1), gold, { x: px, y: o.y + o.h / 2, z: pz, ry: ry, rx: PI / 2, sx: rr, sy: 0.05, sz: rr, flat: true, vary: 0 });
        pick({ color: o.inner === undefined ? 0xf3ead8 : o.inner, mat: 'gloss' }).add(Geo.cyl(20, 1), o.inner === undefined ? 0xf3ead8 : o.inner, { x: px + f[0] * 0.03, y: o.y + o.h / 2, z: pz + f[1] * 0.03, ry: ry, rx: PI / 2, sx: rr * 0.72, sy: 0.05, sz: rr * 0.72, flat: true, vary: 0 });
      }
    };
    // 단계 몰딩 코니스
    ctx.cornice = function (o) {
      var dx = o.x1 - o.x0, dz = o.z1 - o.z0, len = Math.sqrt(dx * dx + dz * dz), f = o.facing || [0, 1], t = num(o.depth, 0.25), hh = num(o.h, 0.3);
      var ry = Math.atan2(-dz, dx), color = o.color === undefined ? 0xe8dcc3 : o.color;
      var b = pick({ color: color, surf: o.surf, mat: o.mat });
      var steps = [[0.5, 0.0, 0.35], [0.8, 0.0, 0.3], [1.0, 0.0, 0.35]];
      var yy = o.y, d0 = 0;
      steps.forEach(function (st, i) {
        var dd = t * st[0], hh2 = hh * st[2];
        b.add(Geo.box(), color, { x: (o.x0 + o.x1) / 2 + f[0] * dd / 2, y: yy, z: (o.z0 + o.z1) / 2 + f[1] * dd / 2, ry: ry, sx: len, sy: hh2, sz: dd, flat: true, vary: 0.02 });
        yy += hh2;
      });
    };
    ctx.pilaster = function (o) { ctx.column({ x: o.x, z: o.z, y: o.y, h: o.h, r: o.r || 0.4, style: 'round', capital: o.capital || 'corinthian', color: o.color, capColor: o.capColor, collide: o.collide, ry: o.ry, surf: o.surf }); };

    // ---- 좌석 (실제 비율의 신자석: 등받이·팔걸이 옆판·기도대·좌석판) ----
    ctx.renderSeats = function (lay, style, o) {
      o = o || {};
      var woodSurf = o.surf === undefined ? 'wood_dark' : o.surf;
      var useSurf = woodSurf && ctx.hasPhoto(woodSurf) ? woodSurf : null;
      var wood = o.wood === undefined ? 0x6d4429 : o.wood, seatC = o.seat === undefined ? 0x7a4c2e : o.seat, backC = o.back === undefined ? 0x5f3a24 : o.back, cushion = o.cushion;
      function W(color) { return useSurf ? { surf: useSurf, color: ctx.shade(0xffffff, color === wood ? 0.95 : 0.8) } : { mat: 'wood', color: color }; }
      var Lg = root.ChurchLogic;
      var bands = Lg.rowBands(lay);
      var seats = Lg.seatsOf(lay);
      var bySR = {};
      for (var i = 0; i < seats.length; i++) { var s = seats[i]; (bySR[s.g + s.row] = bySR[s.g + s.row] || []).push(s); }
      var bb = (useSurf ? surfBatchFor(useSurf) : B_.wood);
      function bx(color, x, y, z, ry, sx, sy, sz) { bb.add(Geo.box(), color, { x: x, y: y, z: z, ry: ry, sx: sx, sy: sy, sz: sz, flat: true, vary: 0.03 }); }
      for (var b = 0; b < bands.length; b++) {
        var Bd = bands[b], f = Bd.f, e = Bd.e;
        var len = Math.sqrt(Math.pow(Bd.end[0] - Bd.start[0], 2) + Math.pow(Bd.end[1] - Bd.start[1], 2));
        var mx = (Bd.start[0] + Bd.end[0]) / 2, mz = (Bd.start[1] + Bd.end[1]) / 2;
        var angE = Math.atan2(-e[1], e[0]);
        var colW = useSurf ? 0xffffff : wood, colB = useSurf ? 0xe8d8d0 : backC, colS = useSurf ? 0xf0e0d8 : seatC;
        var cx = mx + f[0] * 0.3, cz = mz + f[1] * 0.3;       // 앞줄 등받이 위치(충돌 띠 중앙)
        if (style === 'chair') {
          bx(colB, cx, 0, cz, angE, len, 0.95, 0.07);
          bx(colW, cx, 0.5, cz, angE, len, 0.06, 0.12);
        } else {
          // 등받이 판(살짝 뒤로 기울인 느낌: 두 겹) + 상단 레일 + 하단 패널(그림자 틈)
          bx(colB, cx, 0.32, cz, angE, len, 0.62, 0.07);                 // 하단 패널(넓은 널빤지)
          bx(colW, cx, 0.27, cz, angE, len, 0.07, 0.12);                  // 하단 가로대(몰딩)
          bx(colB, cx + f[0] * 0.01, 0.92, cz + f[1] * 0.01, angE, len, 0.28, 0.06);  // 상단 널
          bx(colW, cx + f[0] * 0.02, 1.07, cz + f[1] * 0.02, angE, len, 0.06, 0.15);  // 상단 둥근 레일
          // 기도대(앞줄 뒷면에서 앉는 사람 쪽으로 튀어나온 무릎받이)
          bx(colW, cx - f[0] * 0.22, 0.13, cz - f[1] * 0.22, angE, len - 0.2, 0.08, 0.28);
          if (cushion !== false) {
            var cb = B_.solid; var kc = o.kneelerColor === undefined ? 0x6f2b2f : o.kneelerColor;
            cb.add(Geo.box(), kc, { x: cx - f[0] * 0.22, y: 0.21, z: cz - f[1] * 0.22, ry: angE, sx: len - 0.3, sy: 0.035, sz: 0.22, flat: true, vary: 0.03 });
          }
        }
        var seatRow = bySR[Bd.g + Bd.row] || [];
        if (style === 'chair') {
          for (var q = 0; q < seatRow.length; q++) {
            var st = seatRow[q];
            bx(colS, st.x + f[0] * 0.02, 0.4, st.z + f[1] * 0.02, angE, 0.46, 0.06, 0.46);
            bx(colW, st.x - f[0] * 0.2, 0.46, st.z - f[1] * 0.2, angE, 0.46, 0.5, 0.05);
            [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(function (lg) { bx(colW, st.x + e[0] * lg[0] + f[0] * lg[1], 0, st.z + e[1] * lg[0] + f[1] * lg[1], 0, 0.05, 0.4, 0.05); });
          }
        } else {
          var sx0 = (seatRow.length ? (seatRow[0].x + seatRow[seatRow.length - 1].x) / 2 : mx), sz0 = (seatRow.length ? (seatRow[0].z + seatRow[seatRow.length - 1].z) / 2 : mz);
          bx(colS, sx0, 0.4, sz0, angE, len, 0.05, 0.52);                  // 좌석판
          bx(colW, sx0 + f[0] * 0.02, 0.0, sz0 + f[1] * 0.02, angE, len - 0.1, 0.4, 0.34);   // 좌석 아래 몸통
          bx(colS, sx0 - f[0] * 0.18, 0.44, sz0 - f[1] * 0.18, angE, len, 0.05, 0.14);        // 좌석 뒤쪽 가장자리 모서리 몰딩
          // 앉는 사람 뒤쪽 낮은 등받이(통로 쪽)는 충돌 때문에 생략. 대신 줄 양 끝 옆판(팔걸이 겸 장식): 높고 둥근 윗면 + 원형 장식
          [Bd.start, Bd.end].forEach(function (ex, ei) {
            bx(colW, ex[0], 0, ex[1], angE, 0.09, 1.18, 0.9);
            bb.add(Geo.cyl(14, 1), colW, { x: ex[0], y: 1.18, z: ex[1], rz: PI / 2, ry: angE, sx: 0.45, sy: 0.09, sz: 0.45, flat: true, vary: 0.02 });
            bb.add(Geo.cyl(16, 1), colB, { x: ex[0] + (ei ? -0.05 : 0.05) * e[0], y: 0.78, z: ex[1] + (ei ? -0.05 : 0.05) * e[1], rz: PI / 2, ry: angE, sx: 0.2, sy: 0.02, sz: 0.2, flat: true, vary: 0 });
          });
        }
        // 바닥 접촉 AO
        ctx.aoDecal({ x0: Math.min(Bd.start[0], Bd.end[0]) - 0.1, x1: Math.max(Bd.start[0], Bd.end[0]) + 0.1, z0: Math.min(Bd.start[1], Bd.end[1]) - 0.1, z1: Math.max(Bd.start[1], Bd.end[1]) + 0.1, y: 0, pad: 0.12 });
        void st;
      }
    };

    // ---- 촛불대 가구 ----
    ctx.candleStand = function (i, o) {
      o = o || {};
      var slots = root.ChurchLogic.candleSlots(layout).filter(function (s) { return s.stand === i; });
      var st = layout.candles.stands[i];
      var wood = o.wood === undefined ? 0x4a2c1c : o.wood;
      var f = st.face || [-1, 0], fl2 = Math.sqrt(f[0] * f[0] + f[1] * f[1]) || 1; f = [f[0] / fl2, f[1] / fl2];
      var cols = st.cols || 8, pitch = st.pitch || 0.7, rows = Math.ceil(st.slots / cols);
      var width = cols * pitch + 0.2;
      var step = st.step || 0.35, y0 = st.y0 === undefined ? 0.8 : st.y0, ystep = st.ystep || 0.35;
      var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (var r = 0; r < rows; r++) {
        var rowSlots = slots.filter(function (s) { return s.row === r; });
        if (!rowSlots.length) continue;
        var yy = rowSlots[0].y;
        var cx = 0, cz = 0;
        rowSlots.forEach(function (s) { cx += s.x; cz += s.z; });
        cx /= rowSlots.length; cz /= rowSlots.length;
        var bw = (cols - 1) * pitch + 0.5, depth = step + 0.2;
        var ccx = cx - f[0] * (step / 2 - 0.1), ccz = cz - f[1] * (step / 2 - 0.1);
        var along = Math.abs(f[0]) > 0.5;
        ctx.box({ x: ccx, y: 0, z: ccz, w: along ? depth : bw, h: yy - 0.07, d: along ? bw : depth, color: wood, mat: 'wood' });
        ctx.box({ x: ccx, y: yy - 0.07, z: ccz, w: along ? depth + 0.06 : bw + 0.06, h: 0.07, d: along ? bw + 0.06 : depth + 0.06, color: ctx.shade(wood, 1.4), mat: 'wood' });
        var hx = (along ? depth : bw) / 2 + 0.05, hz = (along ? bw : depth) / 2 + 0.05;
        minX = Math.min(minX, ccx - hx); maxX = Math.max(maxX, ccx + hx); minZ = Math.min(minZ, ccz - hz); maxZ = Math.max(maxZ, ccz + hz);
      }
      var back = [st.x - f[0] * (step * (rows - 1) + 0.55), st.z - f[1] * (step * (rows - 1) + 0.55)];
      var along2 = Math.abs(f[0]) > 0.5;
      ctx.box({ x: back[0], y: 0, z: back[1], w: along2 ? 0.2 : width + 0.2, h: y0 + ystep * (rows - 1) + 0.45, d: along2 ? width + 0.2 : 0.2, color: ctx.shade(wood, 0.8), mat: 'wood' });
      ctx.aoDecal({ x0: minX, x1: maxX, z0: minZ, z1: maxZ, y: 0, pad: 0.3 });
      ctx.addCollider({ x0: minX, x1: maxX, z0: minZ, z1: maxZ });
      S_.candleStands.push({ i: i, bounds: { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ } });
    };

    // ---- 바깥 풍경 ----
    ctx.ground = function (o) {
      o = o || {};
      var m = new T.Mesh(new T.PlaneGeometry(o.size || 800, o.size || 800), new T.MeshStandardMaterial({ color: o.color === undefined ? 0x7ea36a : o.color, roughness: 1 }));
      S_.physMats.push({ m: m.material, envK: 0.5, cc: 0, em: 0 });
      m.rotation.x = -PI / 2; m.position.y = num(o.y, -0.05); ctx.root.add(m); stats.meshes++;
      S_.groundMesh = m; m.receiveShadow = false;
      return m;
    };
    ctx.path = function (o) {
      var ob = B_.outside;
      ob.add(Geo.box(), o.color === undefined ? 0xc9b48c : o.color, { x: (o.x0 + o.x1) / 2, y: -0.045, z: (o.z0 + o.z1) / 2, sx: o.x1 - o.x0, sy: 0.025, sz: o.z1 - o.z0, flat: true, vary: 0.02 });
      var rr = G.rng(21), n = Math.floor((o.z1 - o.z0) / 1.6);
      for (var i = 0; i < n; i++) {
        var z = o.z0 + 0.8 + i * 1.6 + rr() * 0.4, x = (o.x0 + o.x1) / 2 + (rr() - 0.5) * (o.x1 - o.x0) * 0.4;
        ob.add(Geo.cyl(7, 1), ctx.shade(0xaaa498, 0.95 + rr() * 0.12), { x: x, y: -0.03, z: z, sx: 0.5 + rr() * 0.25, sy: 0.05, sz: 0.5 + rr() * 0.25, flat: true });
      }
    };
    function tree(x, z, h, rr, palette, y) {
      var ob = B_.outside;
      var trunk = 0x6b5038, foli = palette[Math.floor(rr() * palette.length)];
      var kind = rr() < 0.35 ? 'pine' : 'round';
      if (kind === 'pine') {
        ob.add(Geo.cyl(6, 1), trunk, { x: x, y: y, z: z, sx: h * 0.04, sy: h * 0.3, sz: h * 0.04, flat: true });
        for (var k = 0; k < 4; k++) ob.add(Geo.cyl(8, 0), ctx.shade(foli, 0.8 + 0.05 * k), { x: x, y: y + h * (0.2 + 0.2 * k), z: z, sx: h * (0.3 - 0.05 * k), sy: h * 0.38, sz: h * (0.3 - 0.05 * k), flat: true });
      } else {
        ob.add(Geo.cyl(6, 0.7), trunk, { x: x, y: y, z: z, sx: h * 0.05, sy: h * 0.5, sz: h * 0.05, flat: true });
        for (var q = 0; q < 3; q++) ob.add(Geo.ico(1), ctx.shade(foli, 0.85 + 0.06 * q), { x: x + (rr() - 0.5) * h * 0.3, y: y + h * (0.5 + 0.13 * q), z: z + (rr() - 0.5) * h * 0.3, r: h * (0.28 - 0.04 * q), flat: true, vary: 0.05 });
      }
    }
    ctx.scatterTrees = function (o) {
      var rr = G.rng(o.seed || 5), pal = o.palette || [0x6f9a5a, 0x5f8f55, 0x7ca862, 0x9a7a52, 0x6a9a6a, 0x84a35a];
      var count = Math.round(o.count * (low ? 0.6 : 1));
      for (var i = 0; i < count; i++) {
        var x = o.x0 + rr() * (o.x1 - o.x0), z = o.z0 + rr() * (o.z1 - o.z0), skip = false;
        (o.exclude || []).forEach(function (e) { if (x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1) skip = true; });
        if (skip) continue;
        tree(x, z, (o.minH || 4) + rr() * ((o.maxH || 8) - (o.minH || 4)), rr, pal, num(o.y, -0.05));
        if (rr() < 0.25) B_.outside.add(Geo.ico(0), ctx.shade(0x9a948c, 0.9 + rr() * 0.15), { x: x + 2 + rr() * 2, y: -0.2, z: z + rr() * 3, sx: 0.7 + rr(), sy: 0.5 + rr() * 0.5, sz: 0.7 + rr(), flat: true });
      }
    };
    ctx.hills = function (o) {
      o = o || {};
      var rr = G.rng(9), n = o.count || 14, R = o.radius || 190;
      for (var i = 0; i < n; i++) {
        var a = i / n * PI * 2 + rr() * 0.3;
        B_.outside.add(Geo.ico(1), ctx.mix(o.color === undefined ? 0x7c9a78 : o.color, 0xa8a0b8, rr() * 0.5), { x: Math.cos(a) * R, y: -2, z: Math.sin(a) * R, sx: 40 + rr() * 30, sy: 14 + rr() * 16, sz: 40 + rr() * 30, flat: true });
      }
    };

    // ---- 최종 준비: 벽 생성, 창, AO 굽기 -> 그릴 항목 목록 ----
    ctx._prepare = function () {
      matchWindows();
      buildWalls();
      S_.windows.forEach(buildWindow);
      S_.roses.forEach(buildRose);
      var items = [];
      var opts = S_.aoOpts;
      function addItem(name, batch, material, cast, receive, ao) {
        if (!batch.p.length) return;
        if (ao && S_.aoOn) batch.bakeAO(opts);
        items.push({ name: name, batch: batch, material: material, cast: cast, receive: receive });
      }
      addItem('solid', B_.solid, mats.solid, true, true, true);
      addItem('gloss', B_.gloss, mats.gloss, true, true, true);
      addItem('wood', B_.wood, mats.wood, true, true, true);
      addItem('metal', B_.metal, mats.metal, true, true, true);
      addItem('glass', B_.glass, mats.glass, false, false, false);
      addItem('glassRefl', B_.glassRefl, mats.glassRefl, false, false, false);
      addItem('glow', B_.glow, mats.glow, false, false, false);
      addItem('outside', B_.outside, mats.outside, false, true, false);
      Object.keys(S_.surfBatches).forEach(function (k) {
        var e = S_.surfBatches[k];
        if (!e.batch.p.length) return;
        var m = physMat(e.def, { vertex: true });
        addItem('surf_' + k, e.batch, m, true, true, true);
      });
      if (decalB.p.length) {
        var tt = G.canvasTexture(64, 64, function (g, w, h) {
          var im = g.createImageData(w, h);
          for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
            var a = Math.min(x, w - 1 - x) / (w / 2), b = Math.min(y, h - 1 - y) / (h / 2);
            var v = Math.min(a, b); v = Math.max(0, Math.min(1, v * 1.6)); v = v * v * (3 - 2 * v);
            var o2 = (y * w + x) * 4; im.data[o2] = im.data[o2 + 1] = im.data[o2 + 2] = 0; im.data[o2 + 3] = v * 255;
          }
          g.putImageData(im, 0, 0);
        }, false);
        mats.decal.map = tt; mats.decal.needsUpdate = true;
        items.push({ name: 'aodecal', batch: decalB, material: mats.decal, cast: false, receive: false, decal: true });
      }
      S_.items = items;
      return items;
    };

    return ctx;
  }

  root.ChurchKit = { createContext: createContext, profilePts: profilePts, profileFn: profileFn, JEWEL: JEWEL, SURFACES: SURFACES };
})(typeof window !== 'undefined' ? window : this);
