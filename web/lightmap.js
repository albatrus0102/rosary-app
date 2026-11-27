/* lightmap.js — PC 에서 Blender(Cycles CPU)로 구운 라이트맵(pc_bake/bake.py)을 붙인다. 없으면 아무것도 하지 않는다(구운 AO·빛 번짐 그대로).
   - 대상 고르기 collectTargets(ctx, items): 굽기 내보내기(tools/lm_export.mjs, Node)와 앱이 **같은 함수**로 같은 목록·같은 이름을 만든다.
     배치(solid·wood·surf_* …)는 배치 하나 = 대상 하나, 빌더가 직접 만든 메시(판·그네 등)는 이름(그룹·표면) + 순번. 유리·발광·데칼·식물 카드·앱 정원은 뺀다.
     재질을 다른 메시와 나눠 쓰는 메시·아주 큰 판(먼 땅)은 '가림만'(굽기 장면에는 들어가지만 라이트맵은 받지 않는다).
   - 붙이기: lightmaps/<장면>/manifest.json + uv2.bin(대상마다 정점 uv2, Uint16) + day/·night/<대상>.png.
     three 의 lightMap(uv2)을 쓰고, 셰이더를 조금 고친다: RGBM 풀기 · 낮/밤 두 장 섞기(env.night) · 이 재질의 간접 확산광 = 라이트맵만
     (반구광·HDRI 확산·구운 AO·빛 번짐은 끈다 — 굽기에 이미 들어 있다) · 점광원 확산은 끈다(등불은 굽기에 들어 있다, 거울 반사 하이라이트는 남김) ·
     해/달 직사광은 manifest 의 key 가 'realtime' 이면 실시간 그대로(그림자 맵 → 걷는 사람 그림자가 남는다), 'baked' 면 끈다.
   - 검사: 대상마다 정점 수·위치 검사합이 manifest 와 같아야 붙인다(빌더를 고치고 다시 굽지 않았으면 그 대상만 예전 길).
   RoomLightmap.attach(o) → {stats, pending(), onEnv(env, lookK), dispose()} · RoomLightmap.decode(rgba, enc) (시험용) */
(function (root) {
  'use strict';
  var T = root.THREE;
  var SKIP_ITEMS = { glass: 1, glassRefl: 1, glow: 1, aodecal: 1 };
  var HUGE_R = 60;   // 경계 구 반지름(m) 이 이보다 크면 가림만(먼 땅·하늘 판)

  function checksum(P) { var s = 0; for (var i = 0; i < P.length; i++) s += P[i] * ((i % 13) + 1); return s; }
  function matOf(o) { return Array.isArray(o.material) ? o.material[0] : o.material; }
  function litMat(m) { return !!(m && m.isMeshStandardMaterial && !m.transparent && !(m.alphaTest > 0) && m.visible !== false && m.depthWrite !== false); }
  function underGarden(o, top) { for (var p = o.parent; p && p !== top; p = p.parent) if (/^garden/.test(p.name || '')) return true; return false; }
  function surfOf(o, S) {
    var pl = S && S.planes; if (!pl) return '';
    for (var i = 0; i < pl.length; i++) if (pl[i].m === o) { var m = /^surf:([^|]+)/.exec(pl[i].key); return m ? m[1] : 'tex'; }
    return '';
  }
  function clean(s) { return String(s).replace(/[^A-Za-z0-9_]+/g, '_').slice(0, 40) || 'mesh'; }
  /** 메시 지오메트리 → 낱개 삼각형 로컬 위치(Float32Array 삼각형×9) */
  function soupLocal(g) {
    var p = g.attributes.position, ix = g.index, n = ix ? ix.count : p.count, out = new Float32Array(n * 3);
    for (var k = 0; k < n; k++) { var v = ix ? ix.getX(k) : k; out[k * 3] = p.getX(v); out[k * 3 + 1] = p.getY(v); out[k * 3 + 2] = p.getZ(v); }
    return out;
  }

  /** 굽기 대상 목록(내보내기·앱 공통). items: kit _prepare() 결과. 반환 [{id, kind:'item'|'mesh', lm, item|mesh, n(정점), sum}] */
  function collectTargets(ctx, items) {
    var S = ctx._ || {}, out = [], useCount = {}, groups = [];
    items.forEach(function (it) { if (it.group) groups.push(it.group); });
    function inItemGroup(o) { for (var p = o.parent; p; p = p.parent) if (groups.indexOf(p) >= 0) return true; return false; }
    items.forEach(function (it) {
      if (SKIP_ITEMS[it.name] || it.decal || !it.batch || !it.batch.p.length || !litMat(it.material)) return;
      useCount[it.material.uuid] = (useCount[it.material.uuid] || 0) + 1;
      out.push({ id: clean(it.name), kind: 'item', lm: true, item: it, n: it.batch.p.length / 3, sum: checksum(it.batch.p) });
    });
    var meshes = [], seq = {};
    ctx.root.updateMatrixWorld(true);
    ctx.root.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || !o.geometry.attributes.position || !o.geometry.attributes.normal) return;
      if (inItemGroup(o) || underGarden(o, ctx.root) || (o.userData && (o.userData.plantCards || o.userData.noLightmap))) return;
      var m = matOf(o); if (!litMat(m)) return;
      var vis = true; for (var p = o; p; p = p.parent) if (p.visible === false) vis = false;
      if (!vis) return;
      meshes.push(o); useCount[m.uuid] = (useCount[m.uuid] || 0) + 1;
    });
    meshes.forEach(function (o) {
      var base = o.name ? clean(o.name) : (o.parent && o.parent !== ctx.root && o.parent.name ? clean(o.parent.name) : '');
      if (!base) { var sf = surfOf(o, S); base = sf ? 'plane_' + clean(sf) : 'mesh'; }
      var k = seq[base] || 0; seq[base] = k + 1;
      var P = soupLocal(o.geometry), g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      var r = g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
      out.push({ id: base + '_' + k, kind: 'mesh', lm: useCount[matOf(o).uuid] === 1 && r < HUGE_R, mesh: o, n: P.length / 3, sum: checksum(P), soup: P });
    });
    return out;
  }

  // ---- RGBM / 선형 풀기(셰이더와 같은 식; pc_bake/lmcodec.py encode 의 짝) ----
  // rgbm: v = rgb·a, L = range · v^gamma · linear: L = range · rgb^gamma
  function decode(rgba, enc) {
    var g = enc.gamma || 1, R = enc.range || 1, k = enc.encoding === 'rgbm' ? rgba[3] : 1;
    return [R * Math.pow(rgba[0] * k, g), R * Math.pow(rgba[1] * k, g), R * Math.pow(rgba[2] * k, g)];
  }

  // ---- 가벼운 노이즈 제거(선택): 표본이 적은 굽기의 「모래알」 반점을 5×5 양방향(bilateral) 필터로 — 경계(빛·그늘 가장자리)는 지킨다 ----
  // data: RGBA Uint8 (RGBM 또는 선형), 밝기 L 로 디코드해서 섞고 다시 같은 방식으로 담는다. 빈 텍셀(RGBM a=0·완전 검정)은 건드리지도 섞지도 않는다.
  // sigmaS: 거리(px), sigmaR: 밝기 차이(상대 — 0.4 = 40% 차이에서 무게 e^-0.5; 빛·그늘 경계는 보통 2배 넘게 차이 나서 남는다)
  function denoise(data, w, h, enc, o) {
    o = o || {};
    var sS = o.sigmaS || 1.6, sR = o.sigmaR || 0.4, R = 2, rgbm = enc.encoding === 'rgbm', G = enc.gamma || 1, RG = enc.range || 1;
    var n = w * h, L = new Float32Array(n * 3), ok = new Uint8Array(n), i, k;
    for (i = 0; i < n; i++) {
      var a = rgbm ? data[i * 4 + 3] / 255 : 1;
      if (rgbm ? data[i * 4 + 3] === 0 : (data[i * 4] | data[i * 4 + 1] | data[i * 4 + 2]) === 0) continue;
      ok[i] = 1;
      for (k = 0; k < 3; k++) L[i * 3 + k] = RG * Math.pow(data[i * 4 + k] / 255 * a, G);
    }
    var ws = []; for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) ws.push(Math.exp(-(dx * dx + dy * dy) / (2 * sS * sS)));
    var out = new Uint8ClampedArray(data), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!ok[i]) continue;
      var l0 = (L[i * 3] + L[i * 3 + 1] * 2 + L[i * 3 + 2]) / 4 + 1e-4, sr = 0, sg = 0, sb = 0, sw = 0, q = 0;
      for (dy = -R; dy <= R; dy++) for (dx = -R; dx <= R; dx++, q++) {
        var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var j = yy * w + xx; if (!ok[j]) continue;
        var lj = (L[j * 3] + L[j * 3 + 1] * 2 + L[j * 3 + 2]) / 4, d = (lj - l0) / (l0 * sR + 1e-4), wt = ws[q] * Math.exp(-0.5 * d * d);
        sr += L[j * 3] * wt; sg += L[j * 3 + 1] * wt; sb += L[j * 3 + 2] * wt; sw += wt;
      }
      var c = [sr / sw, sg / sw, sb / sw], v = c.map(function (t) { return Math.pow(Math.max(0, t) / RG, 1 / G); });
      if (rgbm) {
        var m = Math.min(1, Math.max(v[0], v[1], v[2], 1e-6)), aa = Math.max(1, Math.ceil(m * 255)) / 255;
        for (k = 0; k < 3; k++) out[i * 4 + k] = Math.round(Math.min(1, v[k] / aa) * 255);
        out[i * 4 + 3] = Math.round(aa * 255);
      } else for (k = 0; k < 3; k++) out[i * 4 + k] = Math.round(Math.min(1, v[k]) * 255);
    }
    return out;
  }
  // 그림(Image)을 캔버스로 읽어 노이즈를 지운 캔버스를 돌려준다(캔버스가 없으면 그대로)
  function denoiseImage(im, enc, o) {
    try {
      var d = root.document; if (!d || !im || !im.width) return im;
      var c = d.createElement('canvas'); c.width = im.width; c.height = im.height;
      var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      var id = g.getImageData(0, 0, c.width, c.height);
      id.data.set(denoise(id.data, c.width, c.height, enc, o));
      g.putImageData(id, 0, 0);
      return c;
    } catch (e) { return im; }   // 교차 출처 등 — 그대로
  }

  var LM_PARS = 'uniform sampler2D uLMNight;\nuniform float uLMMix;\nuniform vec2 uLMEnc;\nuniform float uLMK;\nuniform float uLMKey;\n' +
    'vec3 lmDecode( vec4 t ) {\n#ifdef LM_RGBM\n\tvec3 v = t.rgb * t.a;\n#else\n\tvec3 v = t.rgb;\n#endif\n\treturn uLMEnc.x * pow( max( v, vec3( 0.0 ) ), vec3( uLMEnc.y ) );\n}\n';
  // lights_fragment_maps 대신: 간접 확산 = 라이트맵(낮·밤 섞기) × 세기 — 반구광·주변광·HDRI 확산은 버린다
  var LM_MAPS = '#if defined( RE_IndirectDiffuse )\n\t#ifdef USE_LIGHTMAP\n' +
    '\t\tvec3 lmD = lmDecode( texture2D( lightMap, vUv2 ) ), lmN = lmDecode( texture2D( uLMNight, vUv2 ) );\n' +
    '\t\tirradiance = mix( lmD, lmN, uLMMix ) * uLMK * lightMapIntensity;\n\t#endif\n#endif\n' +
    '#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n\tradiance += getIBLRadiance( geometry.viewDir, geometry.normal, material.roughness );\n' +
    '\t#ifdef USE_CLEARCOAT\n\t\tclearcoatRadiance += getIBLRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness );\n\t#endif\n#endif\n';
  var fragBegin = null;
  // lights_fragment_begin: 점광원 확산을 버리고(반사는 남김), 해/달(방향광) 확산은 uLMKey 만큼
  function lightsBegin() {
    if (fragBegin) return fragBegin;
    var src = T.ShaderChunk.lights_fragment_begin, call = 'RE_Direct( directLight, geometry, material, reflectedLight );';
    var iP = src.indexOf('#if ( NUM_POINT_LIGHTS > 0 )'), iS = src.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )'), iD = src.indexOf('#if ( NUM_DIR_LIGHTS > 0 )'), iR = src.indexOf('#if ( NUM_RECT_AREA_LIGHTS > 0 )');
    if (iP < 0 || iS < iP || iD < iS || iR < iD) return null;
    var pt = src.slice(iP, iS).replace(call, '{ vec3 lmDD = reflectedLight.directDiffuse; ' + call + ' reflectedLight.directDiffuse = lmDD; }');
    var dr = src.slice(iD, iR).replace(call, '{ vec3 lmDD = reflectedLight.directDiffuse; ' + call + ' reflectedLight.directDiffuse = mix( lmDD, reflectedLight.directDiffuse, uLMKey ); }');
    if (pt.indexOf('lmDD') < 0 || dr.indexOf('lmDD') < 0) return null;
    fragBegin = src.slice(0, iP) + pt + src.slice(iS, iD) + dr + src.slice(iR);
    return fragBegin;
  }

  function patch(mat, U, enc, dayTex) {
    if (mat.userData.lmFx) return false;
    var fb = lightsBegin(); if (!fb) return false;
    mat.userData.lmFx = true;
    mat.lightMap = dayTex; mat.lightMapIntensity = 1;
    mat.defines = Object.assign({}, mat.defines || {}, { LM_ON: '' });
    if (enc.encoding === 'rgbm') mat.defines.LM_RGBM = '';
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      for (var k in U) sh.uniforms[k] = U[k];
      // aoMap 은 kit(useUvForAo)이 첫 UV 로 읽게 했으므로 vUv2 는 라이트맵만 쓴다 → aoMap 반복(uv2Transform)을 타지 않게 그대로 둔다
      sh.vertexShader = sh.vertexShader.replace('#include <uv2_vertex>', '#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n\tvUv2 = uv2;\n#endif');
      sh.fragmentShader = LM_PARS + sh.fragmentShader.replace('#include <lights_fragment_begin>', fb).replace('#include <lights_fragment_maps>', LM_MAPS);
    };
    mat.customProgramCacheKey = function () { return prevKey + '|lm1'; };
    mat.needsUpdate = true;
    return true;
  }

  /** 대상 하나의 uv2(Float32, 낱개 삼각형 정점 순)를 그 메시(들)에 붙인다 */
  function applyUV(t, uv, cap) {
    if (t.kind === 'item') {
      (t.item.group ? t.item.group.children : []).forEach(function (m, ci) {
        if (!m.isMesh) return;
        var g = m.geometry, n = g.attributes.position.count, a = new Float32Array(n * 2), c = cap[ci];
        if (c && c.triIds) { var ids = c.triIds; for (var i = 0; i < ids.length; i++) for (var j = 0; j < 6; j++) a[i * 6 + j] = uv[ids[i] * 6 + j]; }
        else if (c && c.vRange) a.set(uv.subarray(c.vRange[0] * 2, c.vRange[0] * 2 + n * 2));
        else return;
        g.setAttribute('uv2', new T.BufferAttribute(a, 2));
      });
    } else {
      var o = t.mesh, g0 = o.geometry, g = g0.index ? g0.toNonIndexed() : g0;
      g.setAttribute('uv2', new T.BufferAttribute(uv, 2));
      if (g !== g0) o.geometry = g;   // 공유 지오메트리(Geo 캐시)는 버리지 않는다
    }
  }

  function texOf(img) {
    var t = img.isTexture ? img : new T.Texture(img);
    t.flipY = false; t.generateMipmaps = false; t.minFilter = t.magFilter = T.LinearFilter;
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.encoding = T.LinearEncoding; t.needsUpdate = true;
    return t;
  }
  function dflt(o) {
    var base = o.base || 'lightmaps/';
    return {
      json: o.fetchJSON || function (u, cb) { if (!root.fetch) { cb(null); return; } root.fetch(u).then(function (r) { return r.ok ? r.json() : null; }).then(cb, function () { cb(null); }); },
      bin: o.fetchBin || function (u, cb) { if (!root.fetch) { cb(null); return; } root.fetch(u).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(cb, function () { cb(null); }); },
      img: o.loadImage || function (u, cb) { if (!root.Image) { cb(null); return; } var im = new Image(); im.onload = function () { cb(im); }; im.onerror = function () { cb(null); }; im.src = u; },
      dir: base + o.id + '/'
    };
  }

  /** world.js 가 장면을 지은 직후(구운 AO 보다 먼저 — triIds 를 잡아 두려고) 부른다.
   *  o: {id, ctx, items, base?, fetchJSON?, fetchBin?, loadImage?, off?} */
  function attach(o) {
    var st = { id: o.id, state: 'loading', applied: 0, stale: 0, missing: 0, targets: 0, ms: 0 };
    var U = { uLMNight: { value: null }, uLMMix: { value: 0 }, uLMEnc: { value: new T.Vector2(1, 1) }, uLMK: { value: 1 }, uLMKey: { value: 1 } };
    var disposed = false, texs = [], keyK = [1, 1], targets = null, caps = [];
    var api = {
      stats: st, uniforms: U,
      pending: function () { return st.state === 'loading'; },
      onEnv: function (env, lookK) {
        var n = env && env.night !== undefined ? env.night : 0;
        U.uLMMix.value = n; U.uLMK.value = lookK === undefined ? 1 : lookK;
        U.uLMKey.value = keyK[0] + (keyK[1] - keyK[0]) * n;
      },
      dispose: function () { disposed = true; texs.forEach(function (t) { t.dispose(); }); }
    };
    if (o.off || /[?&]lm=0/.test((root.location && root.location.search) || '')) { st.state = 'off'; return api; }
    try { targets = collectTargets(o.ctx, o.items); } catch (e) { st.state = 'error'; if (root.console) console.warn('[room] lightmap targets', e); return api; }
    // triIds 는 구운 AO·빛 번짐이 다 쓴 뒤 놓으므로(ao_fx triUsers) 지금 참조를 잡아 둔다
    caps = targets.map(function (t) { return t.kind === 'item' && t.item.group ? t.item.group.children.map(function (m) { return { triIds: m.userData.triIds || null, vRange: m.userData.vRange || null }; }) : null; });
    var L = dflt(o), t0 = (root.performance || Date).now();
    function fail(state) { if (!disposed) { st.state = state; st.ms = Math.round((root.performance || Date).now() - t0); } }
    L.json(L.dir + 'manifest.json', function (man) {
      if (disposed) return;
      if (!man || man.format !== 'room-lightmap' || !man.targets || !man.times || !man.times.day || !man.times.night) { fail('none'); return; }
      L.bin(L.dir + (man.uv2 || 'uv2.bin'), function (buf) {
        if (disposed) return;
        if (!buf) { fail('none'); return; }
        var u16 = new Uint16Array(buf), byId = {}, jobs = [];
        man.targets.forEach(function (e) { byId[e.id] = e; });
        targets.forEach(function (t, ti) {
          if (!t.lm) return;
          var e = byId[t.id];
          if (!e || !e.files || !e.files.day || !e.files.night) { st.missing++; return; }
          if (e.n !== t.n || Math.abs(e.sum - t.sum) > 1e-6 * Math.max(1, Math.abs(t.sum)) || (e.off + e.n * 2) > u16.length) { st.stale++; return; }
          jobs.push({ t: t, e: e, ti: ti });
        });
        st.targets = jobs.length;
        if (!jobs.length) { fail(st.stale ? 'stale' : 'none'); return; }
        var enc = { encoding: man.encoding || 'rgbm', range: man.range || 1, gamma: man.gamma || 1 };
        // 노이즈 제거: o.denoise true/false, 아니면(기본 'auto') 굽기 표본이 256 보다 적을 때(manifest info.samples — 모르면 켠다). 캔버스(2D) 비용은 기기에서 0.3~0.6초쯤
        var dn = o.denoise === undefined || o.denoise === null || o.denoise === 'auto' ? !(man.info && man.info.samples >= 256) : !!o.denoise;
        st.denoise = dn;
        U.uLMEnc.value.set(enc.range, enc.gamma);
        keyK = [man.times.day.key === 'baked' ? 0 : 1, man.times.night.key === 'baked' ? 0 : 1];
        var left = jobs.length;
        jobs.forEach(function (j) {
          var got = {}, n2 = 2;
          ['day', 'night'].forEach(function (tm) {
            L.img(L.dir + j.e.files[tm], function (im) {
              got[tm] = im;
              if (--n2) return;
              if (!disposed && got.day && got.night) {
                var uv = new Float32Array(j.e.n * 2);
                for (var i = 0; i < uv.length; i++) uv[i] = u16[j.e.off + i] / 65535;
                if (dn) { got.day = denoiseImage(got.day, enc); got.night = denoiseImage(got.night, enc); }
                var td = texOf(got.day), tn = texOf(got.night); texs.push(td, tn);
                // 재질마다 밤 지도가 다르므로 균일 변수를 재질마다 복제(세기·섞기는 공용 값을 가리킨다)
                var UM = { uLMNight: { value: tn }, uLMMix: U.uLMMix, uLMEnc: U.uLMEnc, uLMK: U.uLMK, uLMKey: U.uLMKey };
                var mat = j.t.kind === 'item' ? j.t.item.material : matOf(j.t.mesh);
                try { applyUV(j.t, uv, caps[j.ti] || []); if (patch(mat, UM, enc, td)) st.applied++; } catch (e) { if (root.console) console.warn('[room] lightmap', j.t.id, e); }
              } else st.missing++;
              if (--left === 0) { st.state = st.applied ? 'on' : 'none'; st.ms = Math.round((root.performance || Date).now() - t0); }
            });
          });
        });
      });
    });
    return api;
  }

  root.RoomLightmap = { attach: attach, denoise: denoise, collectTargets: collectTargets, decode: decode, checksum: checksum, soupLocal: soupLocal, lightsBegin: lightsBegin, LM_MAPS: LM_MAPS, LM_PARS: LM_PARS };
})(typeof window !== 'undefined' ? window : this);
