/* kit.js — 장면 빌더 도구 모음. RoomKit.createContext(opts) -> ctx (README.md 「빌더 API」 참고)
   PBR 재질(광택·옻칠 나무·금속), 사진 질감 표면(surf), 실제 개구부가 있는 벽 + 투명 유리창(ctx.window), 접촉 AO 데칼, 계단·바닥 구역·충돌체.
   color 만 쓰는 box/cyl/... 도 그대로 동작한다. 모든 도형은 재질별 합친 배치(draw call 1)에 들어간다. */
(function (root) {
  'use strict';
  var T = root.THREE, G = root.RoomGeo, Geo = G.Geo;
  var PI = Math.PI;


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
    plaster: { photo: 'plaster', tile: 2.0, roughness: 0.95, normalScale: 0.5, envK: 0.9, fb: 'plaster' },
    stucco: { photo: 'stucco', tile: 1.6, roughness: 0.95, normalScale: 0.8, envK: 0.8, fb: 'plaster' },
    wood_floor: { photo: 'wood_floor', tile: 2.0, clearcoat: 0.25, ccRough: 0.3, normalScale: 0.4, envK: 0.9, fb: 'wood' },
    wood_dark: { photo: 'wood_dark', tile: 1.2, clearcoat: 0.45, ccRough: 0.25, normalScale: 0.3, envK: 0.9, fb: 'wood' },
    wood_light: { photo: 'wood_light', tile: 1.2, clearcoat: 0.3, ccRough: 0.3, normalScale: 0.3, envK: 0.9, fb: 'woodLight' },
    paving: { photo: 'paving', tile: 2.4, roughness: 0.9, normalScale: 0.8, envK: 0.6, fb: 'stone' },
    asphalt: { photo: 'asphalt', tile: 4.0, roughness: 0.95, normalScale: 0.6, envK: 0.5, fb: 'asphalt' },
    grass: { photo: 'grass', tile: 2.0, roughness: 1.0, normalScale: 0.8, envK: 0.4, fb: 'grass' },
    soil: { photo: 'soil', tile: 1.5, roughness: 1.0, normalScale: 0.8, envK: 0.4, fb: 'soil' },
    concrete: { photo: 'concrete', tile: 2.0, roughness: 0.9, normalScale: 0.6, envK: 0.6, fb: 'plaster' },
    cork: { photo: 'cork', tile: 0.8, roughness: 0.95, normalScale: 0.6, envK: 0.5, fb: 'cork' },
    jute: { photo: 'jute', tile: 0.8, roughness: 1.0, normalScale: 0.7, envK: 0.4, fb: 'jute' }
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
    ctx.occupied = {};   // 지금 앉은 사람이 있는 좌석 id 표(main.js 가 매 프레임 world.setOccupied 로 채운다 — 빌더 onUpdate 가 읽는다)

    // ---- 배치(정점색 합친 지오메트리). 재질별로 따로 모인다 ----
    var B_ = {
      solid: new G.Batch(11), gloss: new G.Batch(12), wood: new G.Batch(14), metal: new G.Batch(15),
      glass: new G.Batch(16), glassRefl: new G.Batch(17), glow: new G.Batch(13), outside: new G.Batch(18)
    };
    var solid = ctx.solid = B_.solid, glass = ctx.glass = B_.glass, glow = ctx.glow = B_.glow;
    ctx.gloss = B_.gloss; ctx.woodB = B_.wood; ctx.metalB = B_.metal; ctx.outsideB = B_.outside;
    var decalB = new G.Batch(19); decalB.enableUV(1, 1);
    // _prepare 에서 장면 하나의 칸을 아틀라스 한 장에 그리고 UV 를 그 칸으로 옮긴다. 무늬 없는 유리(납틀 뒷판·옅은 유리)는 UV −1 = 질감 무시.
    var S_ = ctx._ = {
      colliders: [], zones: [], lights: [], glows: [], beams: [], hourHooks: [], updateHooks: [],
      cameraBounds: null, sky: { outside: false }, thumb: null, lamps: [],
      walls: [], windows: [], panes: [], taps: [], floors: [], surfBatches: {}, physMats: [], items: [], aoOn: true, aoOpts: {}, aoDefer: !!opts.aoDefer,
      lampSlots: [], batches: B_, planes: [], floorRects: []
    };

    // ---- 질감/사진 ----
    var tex = ctx.tex = root.RoomKitTex.make(rand);
    var Ph = root.RoomPhotos;
    ctx.hasPhoto = function (name) { return !!(Ph && Ph.has(name)); };
    // ctx.photoTex(name, {repeat:[rx,ry], enc:'srgb'|'linear', fallback: ()=>CanvasTexture}) -> THREE.Texture (그림은 비동기로 교체)
    ctx.photoTex = function (name, o) {
      o = o || {};
      var fb = o.fallback ? o.fallback() : null;
      if (!Ph) return fb || tex.plaster({});
      return Ph.get(name, { repeat: o.repeat, enc: o.enc, fallbackCanvas: fb && fb.image ? fb.image : null });
    };
    function fallbackFor(kind) {
      switch (kind) {
        case 'checker': return tex.checker({});
        case 'brick': return tex.brick({ brick: 0x9a948c, mortar: 0xc9c2b6 });
        case 'wood': return tex.wood({ base: 0x8a5a36, dark: 0x6a4026, planks: 6 });
        case 'woodLight': return tex.wood({ base: 0xc89a66, dark: 0xa87a4c, planks: 6 });
        case 'stone': return tex.pattern('stone', { c1: 0xb8b2a8, c2: 0x9a958c });
        case 'asphalt': return tex.plaster({ base: 0x3c3d40, noise: 0.12 });
        case 'grass': return tex.plaster({ base: 0x5f7f3a, noise: 0.18 });
        case 'soil': return tex.plaster({ base: 0x5a4330, noise: 0.15 });
        case 'cork': return tex.plaster({ base: 0xb5895a, noise: 0.2 });
        case 'jute': return tex.plaster({ base: 0xb9a582, noise: 0.12 });
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
      if (def.photo && !Ph) {   // 사진 질감 모듈(photos.js)이 없으면 절차 생성 대체 질감
        var fq = fallbackFor(def.fb).clone(); fq.needsUpdate = true; fq.wrapS = fq.wrapT = T.RepeatWrapping; if (rep) fq.repeat.set(rep[0], rep[1]);
        m.map = fq;
      } else if (def.photo) {
        var fb = fallbackFor(def.fb);
        m.map = (def.decal && Ph.getDecal) ? Ph.getDecal(def.photo, def.decal, { repeat: rep, fallbackCanvas: fb.image }) : Ph.get(def.photo, { repeat: rep, fallbackCanvas: fb.image });
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
      // 같은 질감·같은 재질 값의 판은 _prepare 에서 한 메시로 합친다(mergePlanes). 키 = 질감(또는 표면 이름)·광택·색·면.
      if (!o.mat && (o.tex || typeof o.surf === 'string') && !o.override) S_.planes.push({ m: m, key: (o.tex ? 'tex:' + o.tex.uuid : 'surf:' + o.surf) + '|' + o.gloss + '|' + o.color + '|' + o.side, snap: matSnap(m) });
      return m;
    };
    // 만든 뒤 빌더가 손댄 판(재질 값·보이기·그림자·자식·이름·창 대역)은 합치지 않는다. 반복(repeat)은 UV 에 구워 넣어 화면은 같다.
    function matSnap(m) {
      var t = m.material;
      return [t.uuid, t.alphaTest, t.metalness, t.roughness, t.emissive ? t.emissive.getHex() : -1, t.emissiveIntensity, t.opacity, t.transparent, t.color ? t.color.getHex() : -1, t.side, t.clearcoat, t.envMapIntensity, t.map ? t.map.uuid : '', t.normalMap ? t.normalMap.uuid : '', t.depthWrite, t.polygonOffset].join(',');
    }
    function mergePlanes() {
      if (/[?&]planemerge=0/.test((root.location && root.location.search) || '')) return;
      var used = {}, by = {};
      ctx.root.traverse(function (o) { if (o.isMesh && o.material) used[o.material.uuid] = (used[o.material.uuid] || 0) + 1; });
      var fb = {};
      S_.planes.forEach(function (p) {
        var m = p.m;
        if (m.parent !== ctx.root || !m.visible || m.children.length || m.name || fb[m.uuid] || m.castShadow || m.renderOrder || used[m.material.uuid] !== 1 || matSnap(m) !== p.snap || Object.keys(m.userData).length) return;
        (by[p.key] = by[p.key] || []).push(m);
      });
      Object.keys(by).forEach(function (k) {
        var list = by[k];
        if (list.length < 2) return;
        var n = list.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [], v = new T.Vector3(), nm = new T.Matrix3();
        list.forEach(function (m, i) {
          m.updateMatrix();
          nm.getNormalMatrix(m.matrix);
          var g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, rep = m.material.map ? m.material.map.repeat : { x: 1, y: 1 };
          for (var j = 0; j < 4; j++) {
            v.fromBufferAttribute(P, j).applyMatrix4(m.matrix); pos[i * 12 + j * 3] = v.x; pos[i * 12 + j * 3 + 1] = v.y; pos[i * 12 + j * 3 + 2] = v.z;
            v.fromBufferAttribute(N, j).applyMatrix3(nm).normalize(); nor[i * 12 + j * 3] = v.x; nor[i * 12 + j * 3 + 1] = v.y; nor[i * 12 + j * 3 + 2] = v.z;
            uv[i * 8 + j * 2] = U.getX(j) * rep.x; uv[i * 8 + j * 2 + 1] = U.getY(j) * rep.y;
          }
          var I = g.index.array;
          for (j = 0; j < I.length; j++) idx.push(I[j] + i * 4);
        });
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeBoundingSphere();
        var mat = list[0].material;
        ['map', 'normalMap', 'roughnessMap', 'emissiveMap'].forEach(function (key) { if (mat[key]) mat[key].repeat.set(1, 1); });
        var mm = new T.Mesh(geo, mat);
        mm.receiveShadow = true; mm.name = 'planes';
        list.forEach(function (m) {
          ctx.root.remove(m); m.geometry.dispose();
          if (m.material !== mat) { ['map', 'normalMap', 'roughnessMap'].forEach(function (key) { var t = m.material[key]; if (t && t !== mat[key] && t.dispose) t.dispose(); }); m.material.dispose(); }
        });
        ctx.root.add(mm);
        stats.meshes -= n - 1; stats.mergedPlanes = (stats.mergedPlanes || 0) + n;
      });
    }
    ctx.floor = function (o) {
      var w = o.x1 - o.x0, d = o.z1 - o.z0, y = num(o.y, 0);
      var m = ctx.plane({ x: (o.x0 + o.x1) / 2, y: y, z: (o.z0 + o.z1) / 2, rx: -PI / 2, w: w, h: d, tex: o.tex, surf: o.surf, color: o.color, tile: o.tile, gloss: o.gloss, mat: o.mat });
      if (o.zone && y > 0) ctx.floorZone({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y: y });
      var gl = o.gloss === undefined ? ((o.surf || o.tex) ? 0.75 : 0) : (o.gloss === true ? 0.9 : o.gloss);
      S_.floorRects.push({ x0: Math.min(o.x0, o.x1), x1: Math.max(o.x0, o.x1), z0: Math.min(o.z0, o.z1), z1: Math.max(o.z0, o.z1), y: y });
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
    ctx.addCollider = function (c) {
      if (S_.colRange && c.y0 === undefined && c.y1 === undefined) c = Object.assign({}, c, { y0: S_.colRange.y0, y1: S_.colRange.y1 });
      S_.colliders.push(c); return c;
    };
    // 여러 층: 이후 높이 없는 충돌체의 높이 범위 {y0,y1}(null 이면 끔 — 모든 층에서 막음). 한 층 장면은 부르지 않는다.
    ctx.setColliderRange = function (r) { S_.colRange = r ? { y0: r.y0, y1: r.y1 } : null; };
    ctx.floorZone = function (z) { S_.zones.push(z); return z; };
    // 투명 유리 판(반사막, 양면): pts = 네 꼭짓점 [[x,y,z]…] (문 유리·진열장 등)
    ctx.glassPane = function (pts) {
      var a = pts[0], b = pts[1], c = pts[2], d = pts[3], cx = (a[0] + c[0]) / 2, cy = (a[1] + c[1]) / 2, cz = (a[2] + c[2]) / 2;
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      B_.glassRefl.addQuad(a, b, c, d, 0xffffff, [cx + nx, cy + ny, cz + nz]);
      B_.glassRefl.addQuad(a, d, c, b, 0xffffff, [cx - nx, cy - ny, cz - nz]);
    };
    // 누르기 자리: 화면에서 이 점(반경 r m) 근처를 누르면 main.js 가 {e:'tap', id} 를 보낸다(문·판 등)
    ctx.addTapTarget = function (o) { S_.taps.push({ id: String(o.id), x: o.x, y: o.y, z: o.z, r: o.r || 0.5 }); };
    ctx.setCameraBounds = function (b) { S_.cameraBounds = b; };
    ctx.setSky = function (o) { S_.sky = o || {}; };
    ctx.onHour = function (fn) { S_.hourHooks.push(fn); };
    ctx.onUpdate = function (fn) { S_.updateHooks.push(fn); };
    // 시간대 값(env)을 적용 직전에 고친다(감상실: 빛 상태별 실내 조명). fn(env, hour)
    ctx.envOverride = function (fn) { S_.envOverride = fn; };
    // gKey: 양식·부분(body|head|disc)·변주 → 칸 이름(등록). gAdd: 칸 안 좌표(0..1) UV 로 유리 삼각형을 넣고 범위를 적는다.
    var G_GAIN = 1.0;   // 납선·물감 선이 덮는 몫만큼 밝혀 예전 색유리와 비슷한 평균 밝기(룩의 glassK 로 최종 조절)
    ctx.MAX_LIGHTS = 3;   // 빌더 점광원 상한(성능: 반구광 + 해 + 점광 3)
    ctx.setAO = function (o) { if (o === false) S_.aoOn = false; else { S_.aoOn = true; S_.aoOpts = o || {}; } };
    ctx.addLight = function (o) {
      if (S_.lights.length >= ctx.MAX_LIGHTS) { if (root.console) console.warn('[room] at most ' + ctx.MAX_LIGHTS + ' builder point lights; ignored'); return null; }
      S_.lights.push(o); return o;
    };
    var flameTex = null, glowTex = null;
    function getGlowTex() {
      if (glowTex) return glowTex;
      glowTex = G.canvasTexture(64, 64, function (g, w, h) {
        var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, false);
      return glowTex;
    }
    ctx._getGlowTex = getGlowTex;
    ctx.addGlow = function (o) {
      var sp = new T.Sprite(new T.SpriteMaterial({ map: getGlowTex(), color: o.color === undefined ? 0xffc977 : o.color, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.6 }));
      var s = o.size || 1.5;
      sp.position.set(o.x, o.y, o.z); sp.scale.set(s, s, 1);
      ctx.root.add(sp);
      S_.glows.push({ sp: sp, size: s, pulse: o.pulse || 0, phase: rand() * 6.28, base: 0.6, kind: o.kind || 'lamp', level: o.level });   // level: 여러 층 장면에서 그 층(levelVis id)을 볼 때만 그린다
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



    // ---- 창(지연 생성: 벽을 뚫은 개구부 안에 유리·창살) ----
    function windowFrame(o) {
      var n = o.face, nl = Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 1;
      var nx = n[0] / nl, nz = n[1] / nl;
      return { nx: nx, nz: nz, ux: nz, uz: -nx };
    }
    function topRise(top, w) { return top === 'pointed' ? w * 0.72 : (top === 'round' || top === 'trefoil' ? w / 2 : 0); }
    // ctx.window({x, y(창턱), z, face:[nx,nz](실내 쪽), w, h, top:'none'|'round'|'pointed', mullions:[u…](세로 창살, 중심 기준 m), transoms:[v…](가로 창살, 창턱 기준 m),
    //   frameColor, frameW, sill(실내 창턱 판, 기본 y>0.05 일 때), opening(true면 구멍만 — 문·통로), beam(햇빛 무늬, 기본 true)})
    // 같은 면의 ctx.wall 에 실제 구멍을 뚫고, 구멍 안에 투명 유리(반사막) + 나무/금속 틀을 넣는다.
    ctx.window = function (o) {
      var spec = Object.assign({}, o); spec.F = windowFrame(o); spec.top = o.top || 'none';
      S_.windows.push(spec);
      return spec;
    };

    function buildWindow(o) {
      if (o.opening) return;   // 구멍만(문·통로): 빌더가 문짝을 따로 그린다
      var F = o.F, w = o.w, h = o.h, top = o.top;
      var hosted = !!o.host, tdepth = hosted ? o.host.t : 0.2;
      var gd = hosted ? -tdepth * 0.5 : 0.02;     // 유리 깊이(벽 안쪽 면 기준, 실내 방향 +): 벽 두께 가운데
      function P(u, v, d) { return [o.x + F.ux * u + F.nx * (d || 0), o.y + v, o.z + F.uz * u + F.nz * (d || 0)]; }
      var hint = P(0, h / 2, 2), hintOut = P(0, h / 2, -2);
      var rs = topRise(top, w), archPts = rs > 0.01 ? profilePts(top === 'pointed' ? 'pointed' : 'round', w / 2, rs, Q(12)) : null;
      // 유리(투명 반사막, 안·밖 양쪽 면)
      var poly = [[-w / 2, 0], [w / 2, 0], [w / 2, h]];
      if (archPts) { for (var i = archPts.length - 1; i >= 0; i--) poly.push([archPts[i][0], h + archPts[i][1]]); }
      poly.push([-w / 2, h]);
      var cen = P(0, (h + rs) / 2, gd), vin = [], vout = [];
      for (i = 0; i < poly.length; i++) {
        var q1 = P(poly[i][0], poly[i][1], gd), q2 = P(poly[(i + 1) % poly.length][0], poly[(i + 1) % poly.length][1], gd);
        vin.push(cen[0], cen[1], cen[2], q1[0], q1[1], q1[2], q2[0], q2[1], q2[2]);
        vout.push(cen[0], cen[1], cen[2], q2[0], q2[1], q2[2], q1[0], q1[1], q1[2]);
      }
      B_.glassRefl.addTris(vin, 0xffffff, hint, { vary: 0 });
      B_.glassRefl.addTris(vout, 0xffffff, hintOut, { vary: 0 });
      S_.panes.push({ x: o.x, z: o.z, y: o.y, w: w, h: h + rs, nx: F.nx, nz: F.nz });
      // 틀: 바깥 테 + 창살(세로 mullions, 가로 transoms). 틀 두께 fw, 깊이 fd(유리 둘레)
      var fc = o.frameColor === undefined ? 0x5e4129 : o.frameColor, fw = o.frameW === undefined ? 0.06 : o.frameW, fd = Math.min(0.12, tdepth * 0.8);
      var wallAng = Math.atan2(F.nx, F.nz), fb = o.frameMat ? (B_[o.frameMat] || B_.wood) : B_.wood;
      function fbox(u, v, bw, bh, d0, dd) { fb.add(Geo.box(), fc, { x: o.x + F.ux * u + F.nx * d0, y: o.y + v, z: o.z + F.uz * u + F.nz * d0, ry: wallAng, sx: bw, sy: bh, sz: dd, flat: true, vary: 0.02 }); }
      if (o.frame !== false) {
        fbox(-w / 2 + fw / 2, 0, fw, h, gd, fd);
        fbox(w / 2 - fw / 2, 0, fw, h, gd, fd);
        fbox(0, 0, w, fw, gd, fd);
        if (!archPts) fbox(0, h - fw, w, fw, gd, fd);
        (o.mullions || []).forEach(function (u) { fbox(u, 0, fw * 0.8, h, gd, fd * 0.8); });
        (o.transoms || []).forEach(function (v) { fbox(0, v - fw * 0.4, w, fw * 0.8, gd, fd * 0.8); });
        if (archPts) {
          for (i = 0; i < archPts.length - 1; i++) {
            var a0 = archPts[i], a1 = archPts[i + 1], du = a1[0] - a0[0], dv = a1[1] - a0[1], l = Math.sqrt(du * du + dv * dv);
            var pm0 = P((a0[0] + a1[0]) / 2, h + (a0[1] + a1[1]) / 2, gd);
            var qf = new T.Quaternion().setFromAxisAngle(new T.Vector3(F.nx, 0, F.nz), Math.atan2(dv, du)).multiply(new T.Quaternion().setFromEuler(new T.Euler(0, wallAng, 0, 'YXZ')));
            fb.add(Geo.boxC(), fc, { x: pm0[0], y: pm0[1], z: pm0[2], q: qf, sx: l * 1.08, sy: fw, sz: fd, flat: true, vary: 0.02 });
          }
        }
        var sill = o.sill === undefined ? o.y > 0.05 : o.sill;
        if (sill) {   // 실내 창턱 판(벽 안쪽 면에서 조금 나온다)
          var sd = (hosted ? tdepth * 0.5 : 0) + 0.06;
          fbox(0, -0.035, w + 0.08, 0.035, (gd + sd) / 2 + 0.0, sd - gd);
        }
      }
      if (o.beam !== false) {
        ctx.addWindowBeam({ x: o.x + F.nx * gd, y: o.y + h * 0.55, z: o.z + F.nz * gd, face: [F.nx, F.nz], w: w, h: h * 0.9, colors: o.beamColors || [0xfff1d6, 0xffe8c4, 0xfff6e6], reach: o.beamReach, top: top, win: o });
      }
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


    // 따로 모아 메시로 세운다. 묶음 객체는 그대로 두고 안의 배열만 잠시 바꿔 끼우므로 빌더가 붙잡아 둔 solid 같은 참조도 따라온다.
    // 표면 질감 묶음·빛 번짐 스프라이트·AO 는 다루지 않는다(스캔 실패 때의 대체 그림용).
    ctx.lateDraw = function (fn, name) {
      var keys = ['solid', 'gloss', 'wood', 'metal', 'glow'], saved = {};
      keys.forEach(function (k) { var b = B_[k]; saved[k] = [b.p, b.n, b.c, b.u, b.vertexCount]; b.p = []; b.n = []; b.c = []; if (b.u) b.u = []; b.vertexCount = 0; });
      try { fn(); } catch (e) { if (root.console) console.warn('[room] lateDraw', e); }
      keys.forEach(function (k) {
        var b = B_[k], nb = new G.Batch(1), sv = saved[k];
        nb.p = b.p; nb.n = b.n; nb.c = b.c; nb.u = b.u; nb.uvTile = b.uvTile; nb.vertexCount = b.vertexCount;
        b.p = sv[0]; b.n = sv[1]; b.c = sv[2]; b.u = sv[3]; b.vertexCount = sv[4];
        if (!nb.p.length) return;
        var grp = nb.build(mats[k], (name || 'late') + '_' + k, { cast: false, receive: true });
        if (k === 'glow') grp.children.forEach(function (m) { m.renderOrder = 1; });
        ctx.root.add(grp); stats.meshes += grp.children.length;
      });
    };
    // 못 세우면(node 시험·?scan3d=0) fallback 을 지금 그리고 false.
    ctx.scan = function (o, fallback) {
      var S3 = root.RoomScan3D;
      if (S3 && S3.place(ctx, o, fallback ? function () { ctx.lateDraw(fallback, 'scan_fallback_' + o.key); } : null)) return true;
      if (fallback) fallback();
      return false;
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
      var m = new T.MeshStandardMaterial({ map: t, roughness: 0.95, color: 0xffffff, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.05 });
      // 벨벳 결(T-13): 보풀 명암을 요철로만 입힌다(색·무늬는 그대로, 질감 1장 추가·draw call 변화 없음). low 에서는 생략.
      if (!low && Ph && Ph.has('velvet')) { var vb = Ph.get('velvet', { enc: 'linear', repeat: [wid / 0.6, len / 0.6] }); m.bumpMap = vb; m.bumpScale = 2.5; }
      // 밤·어두운 룩에서 카펫이 완전한 검정으로 뭉개지지 않게 자체 밝기를 조금(낮 0.05 → 밤 0.2, 질감 색 그대로) 준다(world.js applyEnv 가 갱신)
      S_.physMats.push({ m: m, envK: 0.2, cc: 0, em: 0, lift: [0.05, 0.2] });
      var mesh = new T.Mesh(new T.PlaneGeometry(wid, len), m);
      mesh.rotation.x = -PI / 2; if (!along) mesh.rotation.z = PI / 2;
      mesh.position.set((o.x0 + o.x1) / 2, y + 0.012, (o.z0 + o.z1) / 2); mesh.receiveShadow = true;
      ctx.root.add(mesh); stats.meshes++;
      ctx.boxAABB({ x0: o.x0, x1: o.x1, z0: o.z0, z1: o.z1, y0: y, y1: y + 0.008, color: ctx.shade(c, 0.5), vary: 0 });
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
    // 바닥판(ctx.floor)과 같은 높이에서 판 안쪽을 위로 보는 배치 삼각형(문·아치 개구부 문지방 윗면, 같은 높이에 겹쳐 깐 상자 윗면 등)은 판에 완전히 덮여 보이지 않아야 하는데,
    // 깊이가 같아 두 면이 서로 번갈아 비친다(z-fighting, 2026-11-16 사용자 보고 "발 앞의 줄"). 판이 이미 덮는 자리이므로 그 삼각형을 뺀다(화면의 보이는 면은 판 하나만 남는다).
    // 높이 차 1.5mm 이내일 때만: 완전히 덮이면 빼고, 판 가장자리에 걸치면 1.2cm 가라앉힌다. 정점 수만 줄고 draw call 은 그대로다. ?dropcovered=0 으로 끄고 비교할 수 있다.
    function dropCoveredTops() {
      if (/[?&]dropcovered=0/.test((root.location && root.location.search) || '') || !S_.floorRects.length) return;
      var R = S_.floorRects, dropped = 0, sunk = 0, TOL = 0.0015, E = 0.001;
      function at(y, x, z) {   // (x, z) 가 같은 높이의 바닥판 어느 하나 안에 있나
        for (var r = 0; r < R.length; r++) { var f = R[r]; if (Math.abs(f.y - y) <= TOL && x >= f.x0 - E && x <= f.x1 + E && z >= f.z0 - E && z <= f.z1 + E) return true; }
        return false;
      }
      // 0 = 판이 덮지 않는다, 1 = 일부만 덮는다(무게중심은 덮임), 2 = 완전히 덮인다(세 꼭짓점·세 변 중점·무게중심 모두 판 안, 판 여럿의 합집합도 된다)
      function cover(P, i) {
        var y = P[i + 1];
        if (Math.abs(P[i + 4] - y) > TOL || Math.abs(P[i + 7] - y) > TOL) return 0;
        var ax = P[i], az = P[i + 2], bx = P[i + 3], bz = P[i + 5], cx = P[i + 6], cz = P[i + 8];
        if (!at(y, (ax + bx + cx) / 3, (az + bz + cz) / 3)) return 0;
        return at(y, ax, az) && at(y, bx, bz) && at(y, cx, cz) && at(y, (ax + bx) / 2, (az + bz) / 2) && at(y, (bx + cx) / 2, (bz + cz) / 2) && at(y, (cx + ax) / 2, (cz + az) / 2) ? 2 : 1;
      }
      function sweep(b) {
        var P = b.p, N = b.n, C = b.c, U = b.u, w = 0, t, n = P.length / 9;
        for (t = 0; t < n; t++) {
          var i = t * 9, cv = N[i + 1] > 0.999 ? cover(P, i) : 0;
          if (cv === 2) { dropped++; continue; }
          if (cv === 1) { P[i + 1] -= 0.012; P[i + 4] -= 0.012; P[i + 7] -= 0.012; sunk++; }   // 걸친 면: 판 아래로 1.2cm 가라앉혀(판 위로 못 올라오게) 판이 이긴다
          if (w !== t) { for (var k = 0; k < 9; k++) { P[w * 9 + k] = P[i + k]; N[w * 9 + k] = N[i + k]; C[w * 9 + k] = C[i + k]; } if (U) for (k = 0; k < 6; k++) U[w * 6 + k] = U[t * 6 + k]; }
          w++;
        }
        if (w !== n) { P.length = w * 9; N.length = w * 9; C.length = w * 9; if (U) U.length = w * 6; b.vertexCount = w * 3; }
      }
      Object.keys(B_).forEach(function (k) { if (k !== 'glass' && k !== 'glassRefl' && k !== 'glow') sweep(B_[k]); });
      Object.keys(S_.surfBatches).forEach(function (k) { sweep(S_.surfBatches[k].batch); });
      S_.droppedCovered = dropped; S_.sunkCovered = sunk;
    }
    ctx._prepare = function () {
      matchWindows();
      buildWalls();
      S_.windows.forEach(buildWindow);
      dropCoveredTops();
      var items = [];
      var opts = S_.aoOpts;
      // AO: 'low' 와 미리 구운 AO 가 없는 경우는 예전처럼 정점 색에 근사 AO(bakeAO)를 곱한다.
      // aoDefer(높음·보통, world.js 가 켬)이면 색은 그대로 두고 ao_fx.js 가 ao_<장면>.js(ao_bake.mjs 로 광선 추적한 값)를 aoBake 속성으로 붙인다
      // (간접광·환경 반사에 곱하고 직사광에는 일부만 — 햇빛 든 자리가 까맣게 죽지 않게). 구운 값이 맞지 않으면 같은 근사 AO 를 속성으로 넣는다.
      function addItem(name, batch, material, cast, receive, ao) {
        if (!batch.p.length) return;
        var it = { name: name, batch: batch, material: material, cast: cast, receive: receive, ao: !!(ao && S_.aoOn) };
        if (it.ao && !S_.aoDefer) batch.bakeAO(opts);
        items.push(it);
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
      try { mergePlanes(); } catch (e) { if (root.console) console.warn('[room] mergePlanes', e); }
      S_.items = items;
      return items;
    };

    return ctx;
  }


  root.RoomKit = { createContext: createContext, profilePts: profilePts, profileFn: profileFn, SURFACES: SURFACES };
})(typeof window !== 'undefined' ? window : this);
