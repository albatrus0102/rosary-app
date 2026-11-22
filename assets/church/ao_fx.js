/* ao_fx.js — 미리 구운 AO(ao_<성당>.js, tools/church_web/ao_bake.mjs)를 붙이고, 정적 재질에 '게임식' 조명 보정을 넣는다(docs/church/RENDER_V3.md).
   - 정점 AO: 합친 정적 배치의 정점마다 광선 추적 가림(aoOcc 속성, 0 = 열림). 간접광·환경 반사에 곱하고 직사광에는 일부(uAODir)만.
   - 바닥 AO 지도: 위에서 내려다본 격자(R=AO, G=바닥 높이, B=유효). 위를 보는 면이 그 칸의 바닥 높이 ±4cm 안일 때만 쓴다(의자 앉는 면 등은 제외).
   - 거울 반사 가림(specular occlusion): 구석·의자 밑의 환경 반사(HDRI)가 하얗게 뜨지 않게.
   - 법선 지도 반짝임 줄이기(specular AA, Tokuyoshi·Kaplanyan 식): 화면에서 법선이 빨리 변하는 화소는 거칠기를 넓힌다(먼 대리석·금박이 지글거리지 않게).
   비용: 정점 속성 1바이트 + varying 4개 + (위를 보는 면만) 질감 1번. draw call·패스는 그대로. 'low' 화질은 붙이지 않는다(예전 정점 색 근사 AO).
   구운 값이 지금 지오메트리와 맞지 않으면(빌더를 고치고 다시 굽지 않음) 같은 자리에 예전 근사 AO 를 넣는다(화면이 깨지지 않는다).
   ChurchAOFx.attach(world, opts) → {uniforms, stats, pending()} */
(function (root) {
  'use strict';
  var T = root.THREE;
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', LUT = null;
  function lut() {
    if (LUT) return LUT;
    LUT = new Uint8Array(128);
    for (var i = 0; i < 64; i++) LUT[B64.charCodeAt(i)] = 255 - Math.round(i * 255 / 63);   // 가림(occlusion) 바이트
    return LUT;
  }
  function checksum(P) { var s = 0; for (var i = 0; i < P.length; i++) s += P[i] * ((i % 13) + 1); return s; }
  function decode(str, n) {
    var L = lut(), out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = L[str.charCodeAt(i) & 127];
    return out;
  }
  // 예전 근사 AO(geo.js Batch.bakeAO 와 같은 식) → 가림 바이트
  function heuristic(B, o) {
    o = o || {};
    var fk = o.floor === undefined ? 0.36 : o.floor, uk = o.under === undefined ? 0.28 : o.under, fh = o.height || 0.5, ck = o.ceil === undefined ? 0.0 : o.ceil;
    var P = B.p, N = B.n, n = P.length / 3, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var y = P[i * 3 + 1], ny = N[i * 3 + 1], f = Math.exp(-Math.max(0, y) / fh), k = 1;
      if (Math.abs(ny) < 0.7) k -= fk * f; else if (ny < -0.5) k -= uk * (y < 3 ? 1 : 0.4);
      if (ck && y > (o.ceilY || 8)) k -= ck * Math.min(1, (y - (o.ceilY || 8)) / 3);
      if (k < 0.2) k = 0.2;
      out[i] = Math.round((1 - k) * 255);
    }
    return out;
  }

  function createUniforms() {
    return {
      uAOK: { value: 1 }, uAODir: { value: 0.4 }, uSpecAA: { value: 1 },
      uFloorAO: { value: null }, uFloorR: { value: new T.Vector4(0, 0, 0, 0) }, uFloorH: { value: new T.Vector2(0, 1) }, uFloorOn: { value: 0 }
    };
  }

  var V_PARS = 'attribute float aoOcc;\nvarying float vAOo;\nvarying vec3 vAOW;\n';
  var V_MAIN = '\n\tvAOo = aoOcc;\n\tvec4 aoWp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n\taoWp = instanceMatrix * aoWp;\n#endif\n\tvAOW = (modelMatrix * aoWp).xyz;\n';
  var F_PARS = 'uniform float uAOK;\nuniform float uAODir;\nuniform float uSpecAA;\nuniform sampler2D uFloorAO;\nuniform vec4 uFloorR;\nuniform vec2 uFloorH;\nuniform float uFloorOn;\nvarying float vAOo;\nvarying vec3 vAOW;\n';
  // 법선 지도 반짝임: 화면 미분으로 법선 분산을 재어 GGX 알파(= 거칠기²)에 더한다(상한 0.18)
  var F_SPECAA = '\n#if defined( USE_NORMALMAP ) || defined( USE_BUMPMAP )\n\t{ vec3 aaDx = dFdx( normal ), aaDy = dFdy( normal );\n' +
    '\t  float aaK = min( 0.5 * ( dot( aaDx, aaDx ) + dot( aaDy, aaDy ) ), 0.18 ) * uSpecAA;\n' +
    '\t  material.roughness = min( sqrt( material.roughness * material.roughness + aaK ), 1.0 ); }\n#endif\n';
  var F_AO = '\n\t{ float aoV = 1.0 - vAOo; float aoFW = 0.0;\n' +
    '\t  if ( uFloorOn > 0.5 ) {\n' +
    '\t    vec3 aoUp = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );\n' +
    '\t    if ( dot( geometryNormal, aoUp ) > 0.7 ) {\n' +
    '\t      vec2 fuv = ( vAOW.xz - uFloorR.xy ) * uFloorR.zw;\n' +
    '\t      if ( fuv.x > 0.0 && fuv.y > 0.0 && fuv.x < 1.0 && fuv.y < 1.0 ) {\n' +
    '\t        vec3 fs = texture2D( uFloorAO, fuv ).rgb;\n' +
    '\t        float fw = fs.b * ( 1.0 - smoothstep( 0.035, 0.07, abs( vAOW.y - ( uFloorH.x + fs.g * uFloorH.y ) ) ) );\n' +
    '\t        aoV = mix( aoV, fs.r, fw ); aoFW = fw;\n' +
    '\t      }\n\t    }\n\t  }\n' +
    '\t  float aoT = clamp( mix( 1.0, aoV, uAOK ), 0.12, 1.0 );\n' +
    '\t  reflectedLight.indirectDiffuse *= aoT;\n' +
    '\t  /*gifx*/\n' +   // 빛 번짐(gi_fx.js)이 이 자리에 간접 확산광 곱하기를 넣는다(aoFW = 바닥 지도 무게를 같이 쓴다)
    '\t  reflectedLight.directDiffuse *= mix( 1.0, aoT, uAODir );\n' +
    '\t  float aoNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n' +
    '\t  float aoSO = saturate( pow( aoNV + aoT, exp2( - 16.0 * material.roughness - 1.0 ) ) - 1.0 + aoT );\n' +
    '\t  reflectedLight.indirectSpecular *= aoSO;\n' +
    '#ifdef USE_CLEARCOAT\n\t  clearcoatSpecular *= mix( 1.0, aoSO, 0.8 );\n#endif\n' +
    '#ifdef AO_DEBUG\n\t  reflectedLight.directDiffuse = vec3( 0.0 ); reflectedLight.directSpecular = vec3( 0.0 ); reflectedLight.indirectSpecular = vec3( 0.0 ); reflectedLight.indirectDiffuse = vec3( aoV * aoV ) * 0.45; totalEmissiveRadiance = vec3( 0.0 );\n#endif\n' +
    '\t}\n';
  var DEBUG = /[?&]aodbg=1/.test((root.location && root.location.search) || '');   // 개발용: AO 만 보이기

  // 재질 한 개에 붙인다(복제하지 않음, 기존 onBeforeCompile 뒤에 잇는다 — cam_guard.patchSee 와 같은 방식). 속성이 없는 메시는 0(열림).
  function patch(mat, U) {
    if (!mat || mat.userData.aoFx || !(mat.isMeshStandardMaterial)) return false;
    mat.userData.aoFx = true;
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (sh.vertexShader.indexOf('#include <project_vertex>') < 0 || sh.fragmentShader.indexOf('#include <aomap_fragment>') < 0) return;
      for (var k in U) sh.uniforms[k] = U[k];
      sh.vertexShader = V_PARS + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + V_MAIN);
      sh.fragmentShader = F_PARS + sh.fragmentShader
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>' + F_SPECAA)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>' + F_AO);
    };
    mat.customProgramCacheKey = function () { return prevKey + '|aofx1'; };
    if (DEBUG) { mat.defines = Object.assign({}, mat.defines || {}, { AO_DEBUG: '' }); mat.clearcoat = 0; }
    var dv = mat.defaultAttributeValues || {};
    mat.defaultAttributeValues = Object.assign({}, dv, { aoOcc: [0, 0] });   // 없는 메시: 가림 0
    mat.needsUpdate = true;
    return true;
  }

  // 배치 항목(kit _prepare 의 items, it.ao)과 만든 그룹(geo.js Batch.build: vRange 또는 triIds)에 가림 바이트를 붙인다
  function applyOcc(group, occ) {
    group.children.forEach(function (m) {
      if (!m.isMesh) return;
      var g = m.geometry, n = g.attributes.position.count, a = new Uint8Array(n), ud = m.userData;
      // triIds 는 빛 번짐(gi_fx.js)도 쓴다: 쓰는 쪽 수(triUsers, world.js 가 정함)만큼 다 쓴 뒤에 놓는다
      if (ud.triIds) { var ids = ud.triIds; for (var i = 0; i < ids.length; i++) { var s = ids[i] * 3; a[i * 3] = occ[s]; a[i * 3 + 1] = occ[s + 1]; a[i * 3 + 2] = occ[s + 2]; } ud.triUsers = (ud.triUsers || 1) - 1; if (ud.triUsers <= 0) ud.triIds = null; }
      else if (ud.vRange) a.set(occ.subarray(ud.vRange[0], ud.vRange[0] + n));
      else return;
      g.setAttribute('aoOcc', new T.BufferAttribute(a, 1, true));
    });
  }

  var loading = {};
  function loadScript(id, cb) {
    if (root.ChurchAOBake && root.ChurchAOBake[id]) { cb(true); return; }
    if (loading[id]) { loading[id].push(cb); return; }
    loading[id] = [cb];
    var done = function (ok) { var l = loading[id] || []; delete loading[id]; l.forEach(function (f) { try { f(ok); } catch (e) { if (root.console) console.warn('[church] aofx', e); } }); };
    try {
      var sc = document.createElement('script'); sc.src = 'ao_' + id + '.js'; sc.async = true;
      sc.onload = function () { if (sc.parentNode) sc.parentNode.removeChild(sc); done(!!(root.ChurchAOBake && root.ChurchAOBake[id])); };
      sc.onerror = function () { done(false); };
      document.head.appendChild(sc);
    } catch (e) { done(false); }
  }

  /** world.js 가 높음·보통에서 부른다. o: {id, items(배치 항목 + group), mats(고칠 재질), aoOpts} */
  function attach(o) {
    var U = createUniforms(), st = { id: o.id, baked: 0, stale: 0, heuristic: 0, floor: false, patched: 0, done: false, ms: 0 };
    o.mats.forEach(function (m) { if (patch(m, U)) st.patched++; });
    var targets = o.items.filter(function (it) { return it.ao && it.group; });
    var disabled = /[?&]aobake=0/.test((root.location && root.location.search) || '');
    var disposed = false, floorTex = null;
    function apply(ok) {
      if (disposed) return;
      var t0 = (root.performance || Date).now();
      var data = ok && !disabled ? root.ChurchAOBake[o.id] : null;
      if (data) { try { delete root.ChurchAOBake[o.id]; } catch (e) { /* ignore */ } }   // 붙인 뒤 문자열(최대 약 450KB)을 놓는다 — 다시 들어오면 파일을 다시 읽는다(수 ms)
      var list = data && data.b && data.b.length === targets.length ? data.b : null;
      targets.forEach(function (it, k) {
        var e = list ? list[k] : null, P = it.batch.p, occ = null;
        if (e && e.n === P.length / 3 && Math.abs(checksum(P) - e.s) <= 1e-6 * Math.max(1, Math.abs(e.s))) { occ = decode(e.d, e.n); st.baked++; }
        else { if (e) st.stale++; occ = heuristic(it.batch, o.aoOpts); st.heuristic++; }
        applyOcc(it.group, occ);
      });
      if (data && list && st.stale === 0 && data.f && data.f.png && root.Image) {
        var f = data.f, img = new Image();
        img.onload = function () {
          if (disposed) return;
          floorTex = new T.Texture(img);
          floorTex.flipY = false; floorTex.generateMipmaps = false; floorTex.minFilter = floorTex.magFilter = T.LinearFilter;
          floorTex.wrapS = floorTex.wrapT = T.ClampToEdgeWrapping; floorTex.needsUpdate = true;
          U.uFloorAO.value = floorTex;
          U.uFloorR.value.set(f.x0, f.z0, 1 / (f.w * f.cell), 1 / (f.h * f.cell));
          U.uFloorH.value.set(f.h0, f.hr);
          U.uFloorOn.value = 1; st.floor = true; st.done = true;
        };
        img.onerror = function () { st.done = true; };
        img.src = f.png;
      } else st.done = true;
      if (st.stale && root.console) console.warn('[church] ao_' + o.id + '.js 가 지금 지오메트리와 다릅니다(' + st.stale + '개 배치) — node tools/church_web/ao_bake.mjs ' + o.id);
      st.ms = Math.round(((root.performance || Date).now() - t0) * 10) / 10;
    }
    if (!targets.length) { st.done = true; } else loadScript(o.id, apply);
    return {
      uniforms: U, stats: st,
      pending: function () { return !st.done; },
      dispose: function () { disposed = true; if (floorTex) floorTex.dispose(); U.uFloorAO.value = null; }
    };
  }

  root.ChurchAOFx = { attach: attach, patch: patch, createUniforms: createUniforms, checksum: checksum, decode: decode, heuristic: heuristic, B64: B64 };
})(typeof window !== 'undefined' ? window : this);
