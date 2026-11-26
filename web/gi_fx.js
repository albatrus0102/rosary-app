/* gi_fx.js — 미리 구운 '빛 번짐'(gi_<장면>.js, tools/gi_bake.mjs)을 붙인다().
   - 정점: 굽기와 같은 열쇠(위치 25cm·법선 약 15° 칸)로 정점을 훑어 점 번호를 다시 매기고(처음 나온 순서), 그 점의 값을 aoGI 속성(4바이트)으로 붙인다.
     xyz = 낮의 RGB 비(로그, 1단 = 32단계, 128 = 1), w = 밤의 휘도 비. 밤 색 = 낮 색 × (밤 휘도 / 낮 휘도) + 등불 색조(평균보다 밝은 곳만 조금).
   - 바닥: 위에서 본 격자 질감 1장(RGBA 같은 식). 1차 AO 바닥 지도가 '여기가 걷는 바닥'이라고 한 화소(aoFW)에서만 정점 값 대신 쓴다.
   - 셰이더: 1차 AO(ao_fx.js) 블록 안 gifx 표지(MARK) 자리에서 간접 확산광(반구광 + HDRI 확산)에만 곱한다: indirectDiffuse *= mix(1, gi, uGIK).
     직사광·거울 반사·자체발광은 그대로. 값은 장면 평균이 1 이라 전체 밝기(룩 조정)는 그대로, 곳마다의 색·밝기만 달라진다.
   - 세기 uGIK = 단계(render.js TIERS.gi) × 룩(looks.js giK) × (밤으로 갈수록 nk 쪽: 밤 간접광이 약한 장면일수록 변화도 덜) — 밤에 번짐이 빛나지 않게.
   비용: 정점 속성 4바이트 + varying 1개(vec3) + (위를 보는 바닥 화소만) 질감 1번. draw call·패스·프로그램 수는 그대로(같은 재질, 캐시 키 '|gifx1').
   RoomGIFx.attach(o) → {uniforms, stats, pending(), onEnv(env, tierK, lookK), dispose()} */
(function (root) {
  'use strict';
  var T = root.THREE;
  var LUMV = 'vec3( 0.2126, 0.7152, 0.0722 )';
  // 바이트 → 비(로그 32단계): 굽기(gi_bake.mjs qz)와 같은 식. 128 = 1.
  var DEC_GLSL = 'vec3 giDecode( vec4 c, float night, vec3 tint ) {\n' +
    '\tvec3 gd = exp2( ( c.xyz * 255.0 - 128.0 ) / 32.0 );\n' +
    '\tfloat yd = max( dot( gd, ' + LUMV + ' ), 0.05 );\n' +
    '\tfloat yn = exp2( ( c.w * 255.0 - 128.0 ) / 32.0 );\n' +
    '\tvec3 gn = gd * ( yn / yd ) * mix( vec3( 1.0 ), tint, clamp( ( yn - 1.0 ) * 0.6, 0.0, 0.5 ) );\n' +
    '\treturn mix( gd, gn, night );\n}\n';
  var V_PARS = 'attribute vec4 aoGI;\nuniform float uGINight;\nuniform vec3 uGITint;\nvarying vec3 vGI;\n' + DEC_GLSL;
  var V_MAIN = '\n\tvGI = giDecode( aoGI, uGINight, uGITint );\n';
  var F_PARS = 'uniform float uGIK;\nuniform float uGINight;\nuniform vec3 uGITint;\nuniform sampler2D uGIFloor;\nuniform vec4 uGIFloorR;\nuniform float uGIFloorOn;\nvarying vec3 vGI;\n' + DEC_GLSL;
  // ao_fx.js F_AO 블록 안(aoFW = 바닥 지도 무게, vAOW = 월드 위치가 보이는 자리)
  var F_GI = '{ vec3 giV = vGI;\n' +
    '\t  if ( uGIFloorOn > 0.5 && aoFW > 0.0 ) giV = mix( giV, giDecode( texture2D( uGIFloor, clamp( ( vAOW.xz - uGIFloorR.xy ) * uGIFloorR.zw, 0.0, 1.0 ) ), uGINight, uGITint ), aoFW );\n' +
    '\t  reflectedLight.indirectDiffuse *= mix( vec3( 1.0 ), giV, uGIK );\n' +
    '#ifdef GI_DEBUG\n\t  reflectedLight.directDiffuse = vec3( 0.0 ); reflectedLight.directSpecular = vec3( 0.0 ); reflectedLight.indirectSpecular = vec3( 0.0 ); reflectedLight.indirectDiffuse = giV * 0.3; totalEmissiveRadiance = vec3( 0.0 );\n#endif\n' +
    '\t}\n';
  var MARK = '/*gifx*/';
  var DEBUG = /[?&]gidbg=1/.test((root.location && root.location.search) || '');   // 개발용: 빛 번짐 비만 보이기(회색 세상)
  var KQ = /[?&]gik=([0-9.]+)/.exec((root.location && root.location.search) || ''), KDEV = KQ ? +KQ[1] : 1;   // 개발용: 세기 배율(?gik=0 = 속성만 붙이고 효과 0)

  function createUniforms() {
    return { uGIK: { value: 0 }, uGINight: { value: 0 }, uGITint: { value: new T.Vector3(1, 1, 1) }, uGIFloor: { value: null }, uGIFloorR: { value: new T.Vector4(0, 0, 0, 0) }, uGIFloorOn: { value: 0 } };
  }

  // 재질 한 개에(복제하지 않음, ao_fx 가 고친 재질의 onBeforeCompile 뒤에 잇는다). 프로그램 캐시 키에 '|gifx1' 을 붙인다.
  function patch(mat, U) {
    if (!mat || mat.userData.giFx || !mat.userData.aoFx) return false;
    mat.userData.giFx = true;
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (sh.fragmentShader.indexOf(MARK) < 0 || sh.vertexShader.indexOf('#include <project_vertex>') < 0) return;
      for (var k in U) sh.uniforms[k] = U[k];
      sh.vertexShader = V_PARS + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + V_MAIN);
      sh.fragmentShader = F_PARS + sh.fragmentShader.replace(MARK, F_GI);
    };
    mat.customProgramCacheKey = function () { return prevKey + '|gifx1'; };
    if (DEBUG) mat.defines = Object.assign({}, mat.defines || {}, { GI_DEBUG: '' });
    var dv = mat.defaultAttributeValues || {}, n = 128 / 255;
    mat.defaultAttributeValues = Object.assign({}, dv, { aoGI: [n, n, n, n] });   // 속성 없는 메시: 비 1(그대로)
    mat.needsUpdate = true;
    return true;
  }

  // 정수 6개를 두 낱말로 싸서 열린 주소 해시에 넣는다. 처음 나온 열쇠에 다음 번호 → 굽기의 점 번호와 같다.
  // 반환: 배치마다 Int32Array(정점 → 점 번호), 점 수. nHint: 예상 점 수(표 크기)
  function mapper(K, size) {
    var bits = 10; while ((1 << bits) < size * 2 + 16) bits++;
    var sz = 1 << bits, mask = sz - 1, k1s = new Int32Array(sz), k2s = new Int32Array(sz), vals = new Int32Array(sz), inv = 1 / K, cap = sz >> 1, M = { count: 0, over: false };
    M.add = function (P, N) {
      var n = P.length / 3, ref = new Int32Array(n), next = M.count;
      for (var i = 0, j = 0; i < n; i++, j += 3) {
        var k1 = (Math.round(P[j] * inv) + 2048) | ((Math.round(P[j + 1] * inv) + 2048) << 12);
        var k2 = (Math.round(P[j + 2] * inv) + 2048) | ((Math.round(N[j] * 4) + 4) << 12) | ((Math.round(N[j + 1] * 4) + 4) << 16) | ((Math.round(N[j + 2] * 4) + 4) << 20);
        var h = (Math.imul(k1 ^ Math.imul(k2, 0x85ebca77), 0x9e3779b1) >>> (32 - bits));
        while (vals[h] && (k1s[h] !== k1 || k2s[h] !== k2)) h = (h + 1) & mask;
        if (!vals[h]) { if (next >= cap) { M.over = true; return null; } k1s[h] = k1; k2s[h] = k2; vals[h] = ++next; }
        ref[i] = vals[h] - 1;
      }
      M.count = next;
      return ref;
    };
    return M;
  }
  function mapRecv(targets, K, nHint) {
    var tot = 0; targets.forEach(function (it) { tot += it.batch.p.length / 3; });
    var M = mapper(K, Math.min(tot, nHint || tot)), out = [];
    for (var t = 0; t < targets.length; t++) { var r = M.add(targets[t].batch.p, targets[t].batch.n); if (!r) return nHint ? mapRecv(targets, K) : null; out.push(r); }
    return { refs: out, count: M.count };
  }

  // 압축 풀기: 8개 평면(점 4 그대로 + 바닥 4 차분) → 점 RGBA 바이트, 바닥 RGBA 바이트
  function unpack(raw, nR, nF) {
    var rec = new Uint8Array(nR * 4), flo = new Uint8Array(nF * 4), p = 0;
    function plane(dst, n, ch, dlt) { var prev = 128, i; if (dlt) { for (i = 0; i < n; i++) { prev = (prev + raw[p++]) & 255; dst[i * 4 + ch] = prev; } } else for (i = 0; i < n; i++) dst[i * 4 + ch] = raw[p++]; }
    if (raw.length !== (nR + nF) * 4) return null;
    plane(rec, nR, 1, false); plane(rec, nR, 0, false); plane(rec, nR, 2, false); plane(rec, nR, 3, false);   // 점: 그대로
    plane(flo, nF, 1, true); plane(flo, nF, 0, true); plane(flo, nF, 2, true); plane(flo, nF, 3, true);       // 바닥 격자: 차분
    // R, B = G + 2 × 차, 밤 = 2 × 값(2단계 간격)
    var c2 = function (v, g) { var s = v >= 128 ? v - 256 : v, r = g + 2 * s; return r < 0 ? 0 : (r > 255 ? 255 : r); };
    [rec, flo].forEach(function (a) { for (var i = 0; i < a.length; i += 4) { var g = a[i + 1]; a[i] = c2(a[i], g); a[i + 2] = c2(a[i + 2], g); a[i + 3] = a[i + 3] * 2; } });
    return { rec: rec, flo: flo };
  }
  function inflate(b64, cb) {
    try {
      if (!root.DecompressionStream || !root.Response || !root.Blob || !root.atob) { cb(null); return; }
      var bin = root.atob(b64), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var st = new root.Blob([u]).stream().pipeThrough(new root.DecompressionStream('deflate-raw'));
      new root.Response(st).arrayBuffer().then(function (ab) { cb(new Uint8Array(ab)); }, function () { cb(null); });
    } catch (e) { cb(null); }
  }

  // 그룹(geo.js Batch.build: vRange 또는 triIds)의 메시마다 aoGI 속성. triIds 는 ao_fx 와 같이 쓰므로 둘 다 끝난 뒤 놓는다(triUsers)
  function release(group) { group.children.forEach(function (m) { var ud = m.userData; if (ud.triIds) { ud.triUsers = (ud.triUsers || 1) - 1; if (ud.triUsers <= 0) ud.triIds = null; } }); }
  function applyGI(group, ref, rec) {
    group.children.forEach(function (m) {
      if (!m.isMesh) return;
      var g = m.geometry, n = g.attributes.position.count, a = new Uint8Array(n * 4), ud = m.userData, i, r, s, q;
      if (ud.triIds) { var ids = ud.triIds; for (i = 0; i < ids.length; i++) for (q = 0; q < 3; q++) { r = ref[ids[i] * 3 + q] * 4; s = (i * 3 + q) * 4; a[s] = rec[r]; a[s + 1] = rec[r + 1]; a[s + 2] = rec[r + 2]; a[s + 3] = rec[r + 3]; } }
      else if (ud.vRange) { var v0 = ud.vRange[0]; for (i = 0; i < n; i++) { r = ref[v0 + i] * 4; s = i * 4; a[s] = rec[r]; a[s + 1] = rec[r + 1]; a[s + 2] = rec[r + 2]; a[s + 3] = rec[r + 3]; } }
      else return;
      g.setAttribute('aoGI', new T.BufferAttribute(a, 4, true));
    });
  }

  // 고친 재질을 쓰는데 속성이 없는 메시(인스턴스 기둥·판·빌더가 직접 지은 메시)에 중립 속성을 붙인다.
  // WebGL2 의 '속성 배열이 없을 때 쓰는 기본값'(vertexAttrib*)은 VAO 가 아니라 맥락 전체의 상태라서, three 가 VAO 를 처음 만들 때 한 번만 넣은 기본값이
  // 다른 프로그램의 같은 자리 기본값으로 덮여 엉뚱한 값(예: 1.0 → 비 16배, 기둥이 하얗게 탄다)을 읽는다 → 기본값에 기대지 않는다. aoOcc(ao_fx)도 같이.
  function cover(root0) {
    var n0 = 0;
    if (!root0 || !root0.traverse) return 0;
    root0.traverse(function (m) {
      if (!m.isMesh || !m.geometry || !m.geometry.attributes || !m.geometry.attributes.position) return;
      var ms = Array.isArray(m.material) ? m.material : [m.material], gi = false, ao = false;
      ms.forEach(function (x) { if (x && x.userData) { if (x.userData.giFx) gi = true; if (x.userData.aoFx) ao = true; } });
      var g = m.geometry, n = g.attributes.position.count;
      if (gi && !g.attributes.aoGI) { g.setAttribute('aoGI', new T.BufferAttribute(new Uint8Array(n * 4).fill(128), 4, true)); n0++; }
      if (ao && !g.attributes.aoOcc) { g.setAttribute('aoOcc', new T.BufferAttribute(new Uint8Array(n), 1, true)); n0++; }
    });
    return n0;
  }

  var loading = {};
  function loadScript(id, cb) {
    if (root.RoomGIBake && root.RoomGIBake[id]) { cb(true); return; }
    if (loading[id]) { loading[id].push(cb); return; }
    loading[id] = [cb];
    var done = function (ok) { var l = loading[id] || []; delete loading[id]; l.forEach(function (f) { try { f(ok); } catch (e) { if (root.console) console.warn('[room] gifx', e); } }); };
    try {
      var sc = document.createElement('script'); sc.src = 'gi_' + id + '.js'; sc.async = true;
      sc.onload = function () { if (sc.parentNode) sc.parentNode.removeChild(sc); done(!!(root.RoomGIBake && root.RoomGIBake[id])); };
      sc.onerror = function () { done(false); };
      document.head.appendChild(sc);
    } catch (e) { done(false); }
  }

  /** 세기: 단계 × 룩 × (낮 1 → 밤 nk). 순수 함수(시험용) */
  function strength(night, nk, tierK, lookK) {
    var n = Math.max(0, Math.min(1, night || 0)), k = nk === undefined ? 1 : nk;
    return Math.max(0, (tierK || 0) * (lookK === undefined ? 1 : lookK) * (1 + (k - 1) * n));
  }

  /** world.js 가 높음·보통에서 ao_fx 다음에 부른다. o: {id, items(배치 항목 + group), mats(ao_fx 가 고친 재질), root(월드 그룹 — 속성 없는 메시에 중립 속성)} */
  function attach(o) {
    var U = createUniforms(), st = { id: o.id, patched: 0, applied: 0, stale: 0, floor: false, done: false, ms: 0, recv: 0, why: '' };
    o.mats.forEach(function (m) { if (patch(m, U)) st.patched++; });
    st.covered = cover(o.root);
    var targets = o.items.filter(function (it) { return it.ao && it.group; });
    var disposed = false, ready = false, floorTex = null, meta = { nk: 1, lt: [1, 1, 1] }, envK = { night: 0, tierK: 0, lookK: 1 };
    function finish(why) { st.why = why || st.why; st.done = true; targets.forEach(function (it) { release(it.group); }); }
    function apply(ok) {
      if (disposed) { finish('disposed'); return; }
      var data = ok ? root.RoomGIBake[o.id] : null;
      if (data) { try { delete root.RoomGIBake[o.id]; } catch (e) { /* ignore */ } }
      if (!data || !data.b || data.b.length !== targets.length) { finish(data ? 'batch count' : 'no data'); return; }
      var C = root.RoomAOFx && root.RoomAOFx.checksum;
      for (var k = 0; k < targets.length; k++) {
        var P = targets[k].batch.p, e = data.b[k];
        if (e.n !== P.length / 3 || (C && Math.abs(C(P) - e.s) > 1e-6 * Math.max(1, Math.abs(e.s)))) { st.stale++; }
      }
      if (st.stale) { if (root.console) console.warn('[room] gi_' + o.id + '.js 가 지금 지오메트리와 다릅니다(' + st.stale + '개 배치) — node tools/room_web/gi_bake.mjs ' + o.id); finish('stale'); return; }
      inflate(data.z, function (raw) {
        if (disposed) { finish('disposed'); return; }
        var t0 = (root.performance || Date).now();
        var nF = data.f.w * data.f.h, up = raw ? unpack(raw, data.nR, nF) : null;
        if (!up) { finish(raw ? 'size' : 'inflate'); return; }
        // 정점 → 점 번호(해시)는 배치 하나씩 다음 틱으로 나눠 한다(한 번에 긴 작업이 되지 않게 — 입장 직후 AO 대기 시간 안).
        var M = mapper(data.key || 0.25, data.nR), k2 = 0, msAll = (root.performance || Date).now() - t0;
        function step() {
          if (disposed) { finish('disposed'); return; }
          var t1 = (root.performance || Date).now();
          while (k2 < targets.length) {
            var it = targets[k2], ref = M.add(it.batch.p, it.batch.n);
            if (!ref) { finish('recv'); return; }
            applyGI(it.group, ref, up.rec); st.applied++; k2++;
            if ((root.performance || Date).now() - t1 > 6) break;
          }
          msAll += (root.performance || Date).now() - t1;
          if (k2 < targets.length) { setTimeout(step, 0); return; }
          if (M.count !== data.nR) { if (root.console) console.warn('[room] gi_' + o.id + '.js 점 수가 다릅니다(' + M.count + ' != ' + data.nR + ')'); st.applied = 0; targets.forEach(function (it3) { it3.group.children.forEach(function (m) { if (m.geometry) m.geometry.deleteAttribute('aoGI'); }); }); finish('recv'); return; }
          st.recv = M.count;
          var t2 = (root.performance || Date).now(), f = data.f;
          floorTex = new T.DataTexture(up.flo, f.w, f.h, T.RGBAFormat, T.UnsignedByteType);
          floorTex.flipY = false; floorTex.generateMipmaps = false; floorTex.minFilter = floorTex.magFilter = T.LinearFilter;
          floorTex.wrapS = floorTex.wrapT = T.ClampToEdgeWrapping; floorTex.needsUpdate = true;
          U.uGIFloor.value = floorTex;
          U.uGIFloorR.value.set(f.x0, f.z0, 1 / (f.w * f.cell), 1 / (f.h * f.cell));
          U.uGIFloorOn.value = 1; st.floor = true;
          meta.nk = data.nk === undefined ? 1 : data.nk; meta.lt = data.lt || [1, 1, 1];
          U.uGITint.value.set(meta.lt[0], meta.lt[1], meta.lt[2]);
          st.covered += cover(o.root);
          ready = true; update();
          st.ms = Math.round((msAll + (root.performance || Date).now() - t2) * 10) / 10;
          finish('');
        }
        step();
      });
    }
    function update() {
      U.uGINight.value = Math.max(0, Math.min(1, envK.night));
      U.uGIK.value = ready ? strength(envK.night, meta.nk, envK.tierK, envK.lookK) * KDEV : 0;
    }
    if (!targets.length) finish('no targets'); else loadScript(o.id, apply);
    return {
      uniforms: U, stats: st, meta: meta,
      pending: function () { return !st.done; },
      /** 시간대·단계가 바뀔 때(world.js applyEnv·setTier): env.night, 단계 세기(TIERS.gi), 룩 세기(looks.js giK) */
      onEnv: function (env, tierK, lookK) { envK.night = env && env.night !== undefined ? env.night : 0; envK.tierK = tierK || 0; envK.lookK = lookK === undefined ? 1 : lookK; update(); },
      dispose: function () { disposed = true; if (floorTex) floorTex.dispose(); U.uGIFloor.value = null; U.uGIFloorOn.value = 0; }
    };
  }

  root.RoomGIFx = { attach: attach, patch: patch, cover: cover, createUniforms: createUniforms, mapRecv: mapRecv, unpack: unpack, strength: strength, MARK: MARK };
})(typeof window !== 'undefined' ? window : this);
