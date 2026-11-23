/* probe_fx.js — 성당 안 반사 탐침(docs/church/RENDER_V4.md §2). 금·청동·대리석·광택 재질의 거울 반사를 바깥 HDRI 대신 '이 성당 안'에서 찍은 큐브맵으로.
   - 탐침 자리·상자는 probe_places.js(tools/church_web/probe_bake.mjs 가 지오메트리 광선으로 잰 값): 신랑 가운데·성소. high 2개(위치로 섞음), mid 1개, low 없음.
   - 굽기: CubeCamera 6면(정적 성당만 — 아바타·빛줄기·먼지·표식·바닥 거울은 숨김) → PMREM. 입장 때는 첫 프레임 뒤 한 번에(입장 화면 아래, main.js 가 firstFrame 을 한 프레임 미룬다),
     그 뒤에는 시간대가 크게 바뀔 때만(해 방향 12° / 밤 정도 0.15 / 사진 창이 다 올라옴, 최소 20초 간격, setHour 는 바로) 프레임마다 한 면씩 나눠 굽는다(멈칫 없음).
   - 셰이더: 재질은 복제하지 않고 onBeforeCompile 을 잇는다(ao_fx 와 같은 방식, 캐시 키 '|prb1'). 거울 반사(radiance·clearcoat)만 탐침으로 바꾸고 확산 IBL(조도)은 예전 HDRI 그대로
     → 벽·대리석의 밝기는 그대로, 반사에 비치는 것만 실내가 된다. 박스 투영(시차 보정): 탐침 상자와 반사 광선의 교점 방향으로 읽는다(거칠수록 덜).
   - 1차(RENDER_V3) 반사 가림(ao_fx 의 indirectSpecular × aoSO)은 이 값 뒤에 곱해지므로 그대로 동작한다.
   ChurchProbes.create(o) → P: P.patch(mat, k) · P.bakeNow(renderer) · P.step(renderer) · P.markDirty(why, force) · P.onEnv(env) · P.setTier(t) · P.stats · P.dispose() */
(function (root) {
  'use strict';
  var T = root.THREE;

  // three r149 cube_uv_reflection_fragment 를 이름만 바꿔 복제한다(탐침 질감 크기가 HDRI 와 달라도 되게 상수 → 균일값). HDRI 쪽 함수와 이름이 겹치지 않는다.
  function cubeUVCopy(src) {
    return src.replace(/#ifdef ENVMAP_TYPE_CUBE_UV/, '#if 1')
      .replace(/\bcubeUV_/g, 'prbCU_')
      .replace(/\bgetFace\b/g, 'prbFace').replace(/\bgetUV\b/g, 'prbUV').replace(/\bbilinearCubeUV\b/g, 'prbBilinear')
      .replace(/\broughnessToMip\b/g, 'prbRoughMip').replace(/\btextureCubeUV\b/g, 'prbCubeUV')
      .replace(/\bCUBEUV_TEXEL_WIDTH\b/g, 'uPrbCU.x').replace(/\bCUBEUV_TEXEL_HEIGHT\b/g, 'uPrbCU.y').replace(/\bCUBEUV_MAX_MIP\b/g, 'uPrbCU.z');
  }
  // PMREM 질감 높이 → (텍셀 폭, 텍셀 높이, 최대 밉) — WebGLProgram generateCubeUVSize 와 같은 식
  function cubeUVSize(h) { var mm = Math.log2(h) - 2; return [1 / (3 * Math.max(Math.pow(2, mm), 112)), 1 / h, mm]; }

  var F_PARS = 'uniform sampler2D uPrbA;\nuniform sampler2D uPrbB;\nuniform vec3 uPrbCU;\nuniform vec4 uPrbPA;\nuniform vec4 uPrbPB;\n' +
    'uniform vec3 uPrbMinA;\nuniform vec3 uPrbMaxA;\nuniform vec3 uPrbMinB;\nuniform vec3 uPrbMaxB;\nuniform vec4 uPrbK;\nuniform float uPrbM;\nvarying vec3 vPrbW;\n';
  // uPrbK: x = 탐침 몫(0 = HDRI 그대로, 1 = 탐침만), y = 세기, z = 탐침 수(1 | 2), w = 탐침 색 바래기(실내 돌·나무 색이 금을 구리색으로 물들이지 않게). uPrbPA/PB: 탐침 위치, w = 쓸 수 있음(1)
  function F_FUNCS() {
    return '\n#if defined( USE_ENVMAP )\n#if defined( ENVMAP_TYPE_CUBE_UV )\n' + cubeUVCopy(T.ShaderChunk.cube_uv_reflection_fragment) + '\n' +
      'vec3 prbBox( vec3 d, vec3 c, vec3 bmin, vec3 bmax, float r ) {\n' +
      '  vec3 dd = d + vec3( 1e-5 ) * step( abs( d ), vec3( 1e-5 ) );\n' +
      '  vec3 tf = max( ( bmax - vPrbW ) / dd, ( bmin - vPrbW ) / dd );\n' +
      '  float t = min( min( tf.x, tf.y ), tf.z );\n' +
      '  vec3 ins = step( bmin, vPrbW ) * step( vPrbW, bmax );\n' +
      '  float k = ins.x * ins.y * ins.z * ( 1.0 - r * r ) * step( 0.0, t );\n' +
      '  return normalize( mix( d, vPrbW + d * t - c, k ) );\n}\n' +
      // irr = 이미 잰 HDRI 확산 조도(iblIrradiance, envMapIntensity 포함): 거울 반사의 (1 - 탐침 몫)은 이것으로 채운다 → HDRI 를 다시 읽지 않는다(질감 읽기 수 = 예전과 같음)
      'vec3 prbRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 irr ) {\n' +
      // 굽기 전(입장 화면 아래 첫 프레임)에는 탐침 몫 0 → 흐린 HDRI(조도)만. HDRI 거울 반사를 다시 읽는 갈래를 두지 않는다(갈래마다 질감 읽기가 늘어나는 GPU·SwiftShader 대비)
      '  if ( uPrbK.x < 0.001 ) return irr * RECIPROCAL_PI;\n' +
      '  vec3 rv = reflect( - viewDir, normal );\n' +
      '  rv = normalize( mix( rv, normal, roughness * roughness ) );\n' +
      '  rv = inverseTransformDirection( rv, viewMatrix );\n' +
      '  vec3 pr = vec3( 0.0 ); float w = 0.0;\n' +
      '#ifdef PRB_TWO\n' +   // 두 번째 탐침 코드는 high 로 지은 성당만(mid 는 갈래 자체가 없다)
      '  if ( uPrbK.z > 1.5 && uPrbPB.w > 0.5 ) {\n' +
      '    vec3 ab = uPrbPB.xyz - uPrbPA.xyz;\n' +
      '    w = smoothstep( 0.35, 0.65, dot( vPrbW - uPrbPA.xyz, ab ) / max( dot( ab, ab ), 1e-3 ) );\n' +
      '  }\n' +
      '  if ( w < 0.999 ) pr = prbCubeUV( uPrbA, prbBox( rv, uPrbPA.xyz, uPrbMinA, uPrbMaxA, roughness ), roughness ).rgb;\n' +   // 두 탐침은 섞이는 띠에서만 둘 다 읽는다
      '  if ( w > 0.001 ) pr = mix( pr, prbCubeUV( uPrbB, prbBox( rv, uPrbPB.xyz, uPrbMinB, uPrbMaxB, roughness ), roughness ).rgb, w );\n' +
      '#endif\n' +
      '  pr = mix( pr, vec3( dot( pr, vec3( 0.2126, 0.7152, 0.0722 ) ) ), uPrbK.w ) * ( uPrbK.y * uPrbM );\n' +
      '  return mix( irr * RECIPROCAL_PI, pr, uPrbK.x );\n}\n' +
      '#else\nvec3 prbRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 irr ) { return getIBLRadiance( viewDir, normal, roughness ); }\n#endif\n#endif\n';
  }
  var V_PARS = 'varying vec3 vPrbW;\n';
  var V_MAIN = '\n\t{ vec4 prbWp = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\n\tprbWp = instanceMatrix * prbWp;\n#endif\n\tvPrbW = ( modelMatrix * prbWp ).xyz; }\n';
  function lightsMaps() {
    return T.ShaderChunk.lights_fragment_maps
      .replace('radiance += getIBLRadiance( geometry.viewDir, geometry.normal, material.roughness );', 'radiance += prbRadiance( geometry.viewDir, geometry.normal, material.roughness, iblIrradiance );')
      .replace('clearcoatRadiance += getIBLRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness );', 'clearcoatRadiance += prbRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness, iblIrradiance );');
  }

  // 어떤 재질이 탐침 반사를 받나: 금속(금·청동)·코팅(대리석·광택·칠한 나무)·매끈한 면. 거친 회반죽·돌은 반사가 거의 없어 예전 그대로.
  function wants(m) {
    if (!m || !m.isMeshStandardMaterial || m.transparent) return false;
    return (m.metalness || 0) >= 0.3 || (m.clearcoat || 0) > 0 || (!m.roughnessMap && (m.roughness || 1) <= 0.35) || !!(m.userData && m.userData.prbCC);
  }

  function createUniforms() {
    return {
      uPrbA: { value: null }, uPrbB: { value: null }, uPrbCU: { value: new T.Vector3(1, 1, 0) },
      uPrbPA: { value: new T.Vector4(0, 0, 0, 0) }, uPrbPB: { value: new T.Vector4(0, 0, 0, 0) },
      uPrbMinA: { value: new T.Vector3(-1e4, -1e4, -1e4) }, uPrbMaxA: { value: new T.Vector3(1e4, 1e4, 1e4) },
      uPrbMinB: { value: new T.Vector3(-1e4, -1e4, -1e4) }, uPrbMaxB: { value: new T.Vector3(1e4, 1e4, 1e4) },
      uPrbK: { value: new T.Vector4(0, 1, 1, 0.25) }
    };
  }

  function patch(mat, U, k, two) {
    if (!mat || mat.userData.prbFx || !mat.isMeshStandardMaterial) return false;
    mat.userData.prbFx = true;
    var MU = { value: k === undefined ? 1 : k };
    mat.userData.prbM = MU;
    var prev = mat.onBeforeCompile, prevKey = '';
    try { prevKey = String(mat.customProgramCacheKey()); } catch (e) { prevKey = ''; }
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (sh.vertexShader.indexOf('#include <project_vertex>') < 0 || sh.fragmentShader.indexOf('#include <lights_fragment_maps>') < 0 || sh.fragmentShader.indexOf('#include <envmap_physical_pars_fragment>') < 0) return;
      for (var key in U) sh.uniforms[key] = U[key];
      sh.uniforms.uPrbM = MU;
      sh.vertexShader = V_PARS + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + V_MAIN);
      sh.fragmentShader = F_PARS + sh.fragmentShader
        .replace('#include <envmap_physical_pars_fragment>', '#include <envmap_physical_pars_fragment>' + F_FUNCS())
        .replace('#include <lights_fragment_maps>', lightsMaps());
    };
    if (two) mat.defines = Object.assign({}, mat.defines || {}, { PRB_TWO: '' });
    mat.customProgramCacheKey = function () { return prevKey + '|prb1'; };
    mat.needsUpdate = true;
    return true;
  }

  // 탐침을 찍는 동안 숨기는 것: 성당(world.group) 밖의 장면 물체(아바타·군중·해·달·별), 점(먼지), 화면 UI(renderOrder 7~99), 가산 빛줄기, 바닥 거울
  function hideFor(scene, keep, out) {
    out.length = 0;
    var ch = scene.children;
    for (var i = 0; i < ch.length; i++) {
      var o = ch[i];
      if (!o.visible || o.isLight || keep.indexOf(o) >= 0) continue;
      out.push(o);
    }
    for (var j = 0; j < keep.length; j++) {
      if (!keep[j] || !keep[j].traverse || keep[j].isLight) continue;
      keep[j].traverse(function (n) {
        if (!n.visible || n === keep[j]) return;
        if (n.isPoints || n.isLine || n.userData.reflector || n.userData.noProbe || (n.renderOrder >= 7 && n.renderOrder < 100) || n.userData.dynamic) out.push(n);
      });
    }
    return out;
  }

  /** o: {scene, keep:[world.group, sky, …], places: probe_places 항목 {p:[[x,y,z],…], box:[[x0,y0,z0,x1,y1,z1],…]}, tier, tiers(TIERS), see(cam_guard 균일값 | null)} */
  function create(o) {
    var U = createUniforms(), tiers = o.tiers, tier = o.tier, cfg = tiers[tier] || {};
    var res = cfg.probeRes || 64, places = o.places || null;
    var st = { probes: 0, bakes: 0, faces: 0, lastMs: 0, firstMs: 0, res: res, pending: true, why: '', patched: 0, memMB: 0 };
    var P = { uniforms: U, stats: st };
    if (!places || !places.p || !places.p.length) { st.pending = false; P.patch = function () { return false; }; P.step = P.bakeNow = P.markDirty = P.onEnv = P.setTier = P.dispose = function () {}; return P; }
    var NP = Math.min(2, places.p.length), cubeRT = null, cubeCam = null, outs = [null, null], pmrem = null, hidden = [];
    var job = null, lastBakeT = -1e9, envKey = null, dirty = true, force = true;
    var maxP = (function () { var m = /[?&]probes=(\d)/.exec((root.location && root.location.search) || ''); return m ? +m[1] : 9; })();   // 개발용: ?probes=1 이면 탐침 수 상한(비용 견주기)
    function want() { var c = tiers[tier] || {}; return Math.min(NP, c.probes || 0, maxP); }

    function ensure(renderer) {
      if (cubeRT) return;
      cubeRT = new T.WebGLCubeRenderTarget(res, { type: T.HalfFloatType, generateMipmaps: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
      cubeCam = new T.CubeCamera(0.1, 700, cubeRT);
      pmrem = new T.PMREMGenerator(renderer);
    }
    function renderFace(renderer, k, f) {
      var p = places.p[k];
      cubeCam.position.set(p[0], p[1], p[2]); cubeCam.updateMatrixWorld(true);
      var su = typeof o.see === 'function' ? o.see() : o.see, see = su && su.k ? su.k.value : null, s0 = 0, s1 = 0, s2 = 0;
      if (su && su.mute) { su.mute(); see = null; } else if (see) { s0 = see[0]; s1 = see[1]; s2 = see[2]; see[0] = see[1] = see[2] = 0; }   // 카메라 가림 잘라내기(cam_guard — 원뿔·단면·위층·카메라 둘레)를 끈다
      hideFor(o.scene, o.keep, hidden);
      for (var i = 0; i < hidden.length; i++) hidden[i].visible = false;
      var oldT = renderer.getRenderTarget(), oldSU = renderer.shadowMap.needsUpdate, oldXR = renderer.xr.enabled;
      renderer.shadowMap.needsUpdate = false; renderer.xr.enabled = false;
      try {
        renderer.setRenderTarget(cubeRT, f);
        renderer.render(o.scene, cubeCam.children[f]);
      } finally {
        renderer.setRenderTarget(oldT); renderer.shadowMap.needsUpdate = oldSU; renderer.xr.enabled = oldXR;
        for (i = 0; i < hidden.length; i++) hidden[i].visible = true;
        if (su && su.unmute) su.unmute(); else if (see) { see[0] = s0; see[1] = s1; see[2] = s2; }
      }
      st.faces++;
    }
    function finish(renderer, k) {
      cubeRT.texture.needsPMREMUpdate = false;
      var out = pmrem.fromCubemap(cubeRT.texture, outs[k]);   // 첫 번째는 새로 만들고, 다음부터는 같은 대상에 다시 쓴다(할당 없음)
      outs[k] = out;
      var tex = out.texture, cu = cubeUVSize(tex.image.height);
      U.uPrbCU.value.set(cu[0], cu[1], cu[2]);
      var p = places.p[k], b = places.box[k];
      if (k === 0) { U.uPrbA.value = tex; U.uPrbPA.value.set(p[0], p[1], p[2], 1); U.uPrbMinA.value.set(b[0], b[1], b[2]); U.uPrbMaxA.value.set(b[3], b[4], b[5]); }
      else { U.uPrbB.value = tex; U.uPrbPB.value.set(p[0], p[1], p[2], 1); U.uPrbMinB.value.set(b[0], b[1], b[2]); U.uPrbMaxB.value.set(b[3], b[4], b[5]); }
      var w = out.width, h = out.height, n = 0;
      for (var q = 0; q < 2; q++) if (outs[q]) n++;
      st.memMB = +((n * w * h * 8 + res * res * 6 * 12) / 1048576).toFixed(2);
      st.probes = n;
    }
    function apply() { var n = Math.max(want(), U.uPrbPA.value.w > 0.5 ? 1 : 0), c = tiers[tier] || tiers.mid || {}; if (!want()) c = tiers.mid || c; U.uPrbK.value.z = n; U.uPrbK.value.w = c.probeDesat === undefined ? 0.25 : c.probeDesat; U.uPrbK.value.x = n > 0 && U.uPrbPA.value.w > 0.5 ? (c.probeMix === undefined ? 1 : c.probeMix) : 0; }

    P.setSee = function (f) { o.see = f; };
    P.patch = function (mat, k) { if (patch(mat, U, k, Math.min(NP, cfg.probes || 0) > 1)) { st.patched++; return true; } return false; };
    P.wants = wants;
    /** 입장 때(첫 프레임 뒤, 입장 화면 아래): 모든 탐침을 한 번에 굽는다 */
    P.bakeNow = function (renderer) {
      if (!want()) { st.pending = false; return; }
      var t0 = (root.performance || Date).now();
      ensure(renderer);
      for (var k = 0; k < want(); k++) { for (var f = 0; f < 6; f++) renderFace(renderer, k, f); finish(renderer, k); }
      st.bakes++; st.pending = false; dirty = false; force = false; job = null; lastBakeT = t0;
      st.lastMs = Math.round(((root.performance || Date).now() - t0) * 10) / 10; if (!st.firstMs) st.firstMs = st.lastMs;
      apply();
    };
    /** 매 프레임(그린 뒤): 다시 구울 일이 있으면 한 면씩. 반환: 이번 프레임에 일을 했는가 */
    P.step = function (renderer) {
      if (st.pending || !want()) return false;
      var now = (root.performance || Date).now();
      if (!job) {
        if (!dirty || (!force && now - lastBakeT < (o.minGapMs || 20000))) return false;
        job = { k: 0, f: 0, t0: now }; dirty = false; force = false;
      }
      ensure(renderer);
      if (job.f < 6) { renderFace(renderer, job.k, job.f); job.f++; return true; }
      finish(renderer, job.k);
      job.k++; job.f = 0;
      if (job.k >= want()) { st.bakes++; lastBakeT = now; st.lastMs = Math.round((now - job.t0) * 10) / 10; job = null; apply(); }
      return true;
    };
    P.markDirty = function (why, f) { dirty = true; st.why = why || ''; if (f) force = true; };
    /** applyEnv 마다: 해 방향 12° 또는 밤 정도 0.15 넘게 바뀌면 다시 굽는다 */
    P.onEnv = function (env) {
      if (!env || !env.sunDir) return;
      var sd = env.sunDir;
      if (!envKey) { envKey = [sd[0], sd[1], sd[2], env.night || 0, env.moon ? 1 : 0]; return; }
      var dot = sd[0] * envKey[0] + sd[1] * envKey[1] + sd[2] * envKey[2];
      if (dot < Math.cos(12 * Math.PI / 180) || Math.abs((env.night || 0) - envKey[3]) > 0.15 || (env.moon ? 1 : 0) !== envKey[4]) {
        envKey = [sd[0], sd[1], sd[2], env.night || 0, env.moon ? 1 : 0];
        P.markDirty('env', false);
      }
    };
    P.resetEnvKey = function () { envKey = null; };
    P.setTier = function (t) {
      tier = t;
      // low 로 내려가면(자동 하향) 다시 굽지 않고 두 번째 탐침만 놓는다 — 첫 탐침은 그대로 읽는다(셰이더가 이미 고쳐져 있어 HDRI 갈래로 되돌리면 흐려진다)
      if (!want()) { if (outs[1]) { outs[1].dispose(); outs[1] = null; U.uPrbB.value = null; U.uPrbPB.value.w = 0; } job = null; }
      apply();
      if (want() > st.probes) P.markDirty('tier', true);
    };
    P.targets = function () { return { cube: cubeRT, outs: outs }; };   // 시험·측정용
    P.pending = function () { return st.pending && want() > 0; };
    function free() {
      if (cubeRT) cubeRT.dispose();
      outs.forEach(function (x) { if (x) x.dispose(); });
      if (pmrem) pmrem.dispose();
      cubeRT = null; cubeCam = null; outs = [null, null]; pmrem = null; U.uPrbA.value = U.uPrbB.value = null; U.uPrbPA.value.w = U.uPrbPB.value.w = 0; U.uPrbK.value.x = 0;
      st.probes = 0; st.memMB = 0;
    }
    P.dispose = free;
    apply();
    return P;
  }

  root.ChurchProbes = { create: create, patch: patch, wants: wants, cubeUVCopy: cubeUVCopy, cubeUVSize: cubeUVSize, createUniforms: createUniforms };
})(typeof window !== 'undefined' ? window : this);
