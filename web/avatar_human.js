/* avatar_human.js — 반실사 몸(8명, 번호 0..7 = F1..F4, M1..M4) 읽기·메시·재질. avatar.js 가 뼈·자세·걸음을 그대로 쓰고 몸(메시)만 바꿔 끼운다.
   자료: avatar/human.json + human.bin(tools/human_build.py 가 만든다 — 몸 바탕은 MakeHuman CC0, 나머지 자작) + 얼굴 그림 face_<id>.jpg + 공유 질감(iris·hair·knit_n).
   - load(base): 한 번 읽는다(비동기). ready() 가 참이 되면 RoomAvatar 가 만든 아바타들을 다시 맞춘다(onReady 고리).
   - cfgFor(n, over): 번호 → {n, id, g, hairColor, outfit:{card,rib,top,pants,belt,shoe}}. over = {hairColor, outfitColor(카디건), pantsColor, topColor} 로 바꾼다.
   - meshes(avatar, n, lod, cfg): 그 아바타의 뼈대에 묶은 SkinnedMesh 들(살·눈·옷·머리카락·안경).
   삼각형(가까이 LOD0): 살 4.2k + 눈 0.3k + 옷 5.3k + 머리카락 3.9~4.7k ≈ 14.5k / LOD1 약 3.4k / LOD2 는 avatar.js 임포스터. */
(function (root) {
  'use strict';
  var T = root.THREE;
  var H = { meta: null, bin: null, ok: false, loading: false, base: 'avatar/', listeners: [], geo: {}, tex: {}, mats: {} };
  var N_AV = 8;

  function load(base) {
    if (H.ok || H.loading || root.RoomNoHuman) return;
    if (base) H.base = base;
    if (typeof fetch !== 'function') return;
    H.loading = true;
    Promise.all([fetch(H.base + 'human.json').then(function (r) { if (!r.ok) throw new Error('json ' + r.status); return r.json(); }),
      fetch(H.base + 'human.bin').then(function (r) { if (!r.ok) throw new Error('bin ' + r.status); return r.arrayBuffer(); })])
      .then(function (res) {
        H.meta = res[0]; H.bin = res[1]; H.ok = true; H.loading = false;
        H.listeners.splice(0).forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      })
      .catch(function (e) { H.loading = false; H.err = String(e && e.message || e); if (root.console) console.warn('[human] ' + H.err); });
  }
  // 이미 읽은 자료로(Node 시험·호스트가 따로 받은 경우): meta = human.json 객체, bin = ArrayBuffer
  function loadFrom(meta, bin) { H.meta = meta; H.bin = bin; H.ok = true; H.loading = false; H.listeners.splice(0).forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }
  function onReady(f) { if (H.ok) f(); else H.listeners.push(f); }

  function cfgFor(n, over) {
    n = ((n | 0) % N_AV + N_AV) % N_AV;
    var a = H.meta ? H.meta.avatars[n] : { id: 'F1', g: n >= 4 ? 1 : 0, hairColor: 0x1a1410, outfit: {} };
    var o = {}; for (var k in a.outfit) o[k] = a.outfit[k];
    var hc = a.hairColor;
    if (over) {
      if (over.hairColor !== undefined && over.hairColor !== null) hc = colorNum(over.hairColor, hc);
      if (over.outfitColor !== undefined && over.outfitColor !== null) { var cc = colorNum(over.outfitColor, o.card); if (o.rib === o.card) o.rib = cc; o.card = cc; }
      if (over.pantsColor !== undefined && over.pantsColor !== null) o.pants = colorNum(over.pantsColor, o.pants);
      if (over.topColor !== undefined && over.topColor !== null) o.top = colorNum(over.topColor, o.top);
    }
    return { n: n, id: a.id, g: a.g, hairColor: hc, outfit: o };
  }
  function colorNum(v, d) {
    if (typeof v === 'number' && isFinite(v)) return v & 0xffffff;
    if (typeof v === 'string' && /^#?[0-9a-f]{6}$/i.test(v)) return parseInt(v.replace('#', ''), 16);
    return d;
  }

  // ---- 기하: 묶음(.bin)에서 BufferGeometry ----
  function attr(off, Ctor, count, size, norm) { return new T.BufferAttribute(new Ctor(H.bin, off, count * size), size, !!norm); }
  function geom(name) {
    if (H.geo[name]) return H.geo[name];
    var p = H.meta.parts[name]; if (!p) return null;
    var g = new T.BufferGeometry(), nv = p.nv;
    var pos = new Float32Array(nv * 3), pi = new Int16Array(H.bin, p.pos, nv * 3);
    for (var i = 0; i < nv * 3; i++) pos[i] = pi[i] / 8192;
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', attr(p.nrm, Int8Array, nv, 3, true));
    var uv = new Float32Array(nv * 2), ui = new Uint16Array(H.bin, p.uv, nv * 2);
    for (i = 0; i < nv * 2; i++) uv[i] = ui[i] / 4096;
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    var si = new Uint16Array(nv * 4), s8 = new Uint8Array(H.bin, p.si, nv * 4);
    for (i = 0; i < nv * 4; i++) si[i] = s8[i];
    g.setAttribute('skinIndex', new T.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', attr(p.sw, Uint8Array, nv, 4, true));
    if (p.reg !== undefined) g.userData.reg = new Uint8Array(H.bin, p.reg, nv);
    if (p.knit !== undefined) { var kn = new Float32Array(nv), k8 = new Uint8Array(H.bin, p.knit, nv); for (i = 0; i < nv; i++) kn[i] = k8[i]; g.setAttribute('knit', new T.BufferAttribute(kn, 1)); }
    if (p.hdir !== undefined) g.setAttribute('hdir', attr(p.hdir, Int8Array, nv, 3, true));
    g.setIndex(new T.BufferAttribute(new Uint16Array(H.bin, p.idx, p.ni), 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(0, 0.85, 0), 1.25);
    g.userData.tris = p.tris;
    // 머리카락: 두피 덮개(reg 0, 앞쪽 삼각형) / 가닥 띠(reg 1) 두 무리 — 덮개는 불투명, 띠는 알파
    if (p.hdir !== undefined && g.userData.reg) {
      var idx = g.index.array, r = g.userData.reg, cap = 0;
      while (cap < idx.length && r[idx[cap]] === 0) cap += 3;
      g.clearGroups(); g.addGroup(0, cap, 0); g.addGroup(cap, idx.length - cap, 1);
    }
    H.geo[name] = g;
    return g;
  }
  // 옷 색: 영역(0 카디건 1 시보리 2 안 셔츠 3 바지 4 벨트 5 신발 6 밑창 7 단추) → 정점 색(아바타마다 한 번)
  var REGK = ['card', 'rib', 'top', 'pants', 'belt', 'shoe', 'sole', 'btn'];
  function clothGeom(name, outfit) {
    var key = name + ':' + REGK.map(function (k) { return outfit[k]; }).join(',');
    if (H.geo[key]) return H.geo[key];
    var base = geom(name); if (!base) return null;
    var g = new T.BufferGeometry();
    for (var a in base.attributes) g.setAttribute(a, base.attributes[a]);
    g.setIndex(base.index); g.boundingSphere = base.boundingSphere; g.userData.tris = base.userData.tris;
    var r = base.userData.reg, n = r.length, col = new Float32Array(n * 3), c = new T.Color(), tab = [];
    var pal = { sole: 0xf3f0ea, btn: 0x5a4030 };
    REGK.forEach(function (k, i) { c.set(outfit[k] !== undefined ? outfit[k] : (pal[k] !== undefined ? pal[k] : 0xcccccc)); tab[i] = [c.r, c.g, c.b]; });
    for (var i = 0; i < n; i++) { var t = tab[r[i]] || tab[0]; col[i * 3] = t[0]; col[i * 3 + 1] = t[1]; col[i * 3 + 2] = t[2]; }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    H.geo[key] = g;
    return g;
  }

  // ---- 질감·재질 ----
  function tex(file, srgb, rep) {
    if (H.tex[file]) return H.tex[file];
    var t = root.document && root.document.createElementNS ? new T.TextureLoader().load(H.base + file) : new T.Texture();   // Node 시험: 빈 질감
    if (srgb) t.encoding = T.sRGBEncoding;
    if (rep) t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    H.tex[file] = t;
    return t;
  }
  // 피부: 빛을 감싸 들이는 조명(wrap) + 붉은 산란 근사 — 그림자 경계가 붉게 부드러워진다(SSS 흉내, 셰이더 한 줄)
  function skinPatch(mat) {
    mat.onBeforeCompile = function (sh) {
      var ch = T.ShaderChunk.lights_physical_pars_fragment;
      var a = 'float dotNL = saturate( dot( geometry.normal, directLight.direction ) );';
      var b = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
      if (ch.indexOf(a) < 0 || ch.indexOf(b) < 0) return;
      ch = ch.replace(a, 'float nlW = dot( geometry.normal, directLight.direction );\n\tfloat dotNL = saturate( nlW );')
        .replace(b, b + '\n\treflectedLight.directDiffuse += directLight.color * material.diffuseColor * vec3( 0.30, 0.11, 0.07 ) * saturate( ( nlW + 0.5 ) / 1.5 ) * ( 1.0 - dotNL );');
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', ch);
    };
    mat.customProgramCacheKey = function () { return 'hskin'; };
  }
  // 머리카락 결 방향 빛(Kajiya-Kay 근사): 가닥 방향(hdir)에 수직인 반사 띠 + 조금 아래로 밀린 색 띠
  function hairPatch(mat) {
    mat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdir;\nvarying vec3 vHdir;')
        .replace('#include <skinnormal_vertex>', '#include <skinnormal_vertex>\n\tvec3 hT = hdir;\n#ifdef USE_SKINNING\n\thT = vec4( skinMatrix * vec4( hdir, 0.0 ) ).xyz;\n#endif')
        .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n\tvHdir = normalize( normalMatrix * hT );');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdir;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#if NUM_DIR_LIGHTS > 0\n\t{ vec3 Lh = directionalLights[0].direction; vec3 Vh = normalize( vViewPosition ); vec3 Hh = normalize( Lh + Vh ); vec3 Th = normalize( vHdir );\n\t  float th = dot( Th, Hh ), s1 = pow( sqrt( max( 0.0, 1.0 - th * th ) ), 90.0 ), th2 = dot( normalize( Th + normal * 0.25 ), Hh ), s2 = pow( sqrt( max( 0.0, 1.0 - th2 * th2 ) ), 30.0 );\n\t  totalEmissiveRadiance += directionalLights[0].color * ( s1 * 0.22 + s2 * 0.18 * diffuseColor.rgb * 2.0 ) * saturate( dot( normal, Lh ) + 0.3 ); }\n#endif');
    };
    mat.customProgramCacheKey = function () { return 'hhair'; };
  }
  // 니트·바지 결: 법선 지도 한 장(2×2 칸)에서 정점의 knit 칸(0 꽈배기 · 1 고무뜨기 · 2 능직 · 3 매끈)을 반복해 읽는다
  function clothPatch(mat) {
    mat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float knit;\nvarying float vKnit;').replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvKnit = knit;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vKnit;')
        .replace('vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;', 'vec2 kc = vec2( mod( vKnit, 2.0 ), floor( vKnit * 0.5 ) ) * 0.5;\n\tvec3 mapN = textureGrad( normalMap, kc + fract( vUv ) * 0.5, dFdx( vUv ) * 0.5, dFdy( vUv ) * 0.5 ).xyz * 2.0 - 1.0;');
    };
    mat.customProgramCacheKey = function () { return 'hcloth'; };
  }
  function mats(kind, key, c) {
    var k = kind + ':' + key;
    if (H.mats[k]) return H.mats[k];
    var m;
    if (kind === 'skin') { m = new T.MeshStandardMaterial({ map: tex(c, true, true), roughness: 0.55, metalness: 0, envMapIntensity: 0.6 }); skinPatch(m); }
    else if (kind === 'eye') m = new T.MeshStandardMaterial({ map: tex('iris.jpg', true), roughness: 0.12, metalness: 0, envMapIntensity: 1.2 });
    else if (kind === 'cloth') { m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, normalMap: tex('knit_n.jpg', false), normalScale: new T.Vector2(0.9, 0.9), envMapIntensity: 0.6, side: T.DoubleSide }); clothPatch(m); }
    else if (kind === 'hairCap') m = new T.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0, envMapIntensity: 0.4 });
    else if (kind === 'hair') { m = new T.MeshStandardMaterial({ color: c, map: tex('hair.png', true, true), alphaTest: 0.42, side: T.DoubleSide, roughness: 0.55, metalness: 0, envMapIntensity: 0.5 }); m.alphaToCoverage = true; hairPatch(m); }
    else if (kind === 'glass') m = new T.MeshStandardMaterial({ color: 0x3b3632, roughness: 0.35, metalness: 0.8 });
    H.mats[k] = m;
    return m;
  }
  function hairMats(color) { return [mats('hairCap', color, new T.Color(color).multiplyScalar(0.85)), mats('hair', color, color)]; }

  // 둥근 안경(M4): 머리 뼈에 붙인 고리 둘 + 다리 + 코다리
  var glassGeo = null;
  function glasses(meta) {
    if (!glassGeo) {
      var parts = [], e = meta.eyes, R = 0.021;
      e.forEach(function (c) { var t = new T.TorusGeometry(R, 0.0013, 6, 28); t.translate(c[0], c[1] + 0.002, c[2] - 0.016); parts.push(t); });
      var br = new T.CylinderGeometry(0.0012, 0.0012, Math.abs(e[0][0] - e[1][0]) - 2 * R, 6); br.rotateZ(Math.PI / 2); br.translate(0, e[0][1] + 0.008, e[0][2] - 0.016); parts.push(br);
      e.forEach(function (c) { var s = Math.sign(c[0]), L = 0.1; var t = new T.CylinderGeometry(0.0012, 0.0012, L, 5); t.rotateX(Math.PI / 2); t.translate(c[0] + s * (R + 0.004), c[1] + 0.006, c[2] - 0.016 + L / 2); parts.push(t); });
      glassGeo = mergeGeos(parts);
    }
    return glassGeo;
  }
  function mergeGeos(list) {
    var pos = [], nor = [], idx = [], off = 0;
    list.forEach(function (g) {
      g = g.index ? g : g; var p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index.array;
      for (var i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += p.length / 3;
    });
    var g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g2.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g2.setIndex(idx);
    return g2;
  }

  // 한 아바타·한 단계(LOD 0|1)의 메시들
  function meshes(skeleton, headBone, hc, lod, bindM) {
    var n = hc.n, a = H.meta.avatars[n], out = [];
    function sk(g, m) { var s = new T.SkinnedMesh(g, m); s.bind(skeleton, bindM); s.castShadow = true; s.receiveShadow = true; out.push(s); return s; }
    sk(geom('skin' + n + '_' + lod), mats('skin', a.id, a.face));
    if (lod === 0) sk(geom('eyes' + n), mats('eye', 'e'));
    sk(clothGeom('cloth' + a.g + '_' + lod, hc.outfit), mats('cloth', 'c'));
    sk(geom('hair' + n + '_' + lod), hairMats(hc.hairColor));
    if (a.glasses && lod === 0) {
      var gm = new T.Mesh(glasses(a), mats('glass', 'g'));
      gm.position.set(-headBone.userData.rest[0], -headBone.userData.rest[1], -headBone.userData.rest[2]);
      gm.castShadow = true; gm.userData.rigid = true; out.push(gm);
    }
    return out;
  }
  function tris(n, lod) {
    if (!H.ok) return 0;
    var a = H.meta.avatars[n], P = H.meta.parts, t = P['skin' + n + '_' + lod].tris + P['cloth' + a.g + '_' + lod].tris + P['hair' + n + '_' + lod].tris;
    if (lod === 0) t += P['eyes' + n].tris + (a.glasses ? 448 : 0);
    return t;
  }

  root.RoomHuman = {
    load: load, loadFrom: loadFrom, onReady: onReady, ready: function () { return H.ok; }, error: function () { return H.err || null; },
    cfgFor: cfgFor, meshes: meshes, tris: tris, count: N_AV, meta: function () { return H.meta; },
    ids: ['F1', 'F2', 'F3', 'F4', 'M1', 'M2', 'M3', 'M4']
  };
})(typeof window !== 'undefined' ? window : this);
