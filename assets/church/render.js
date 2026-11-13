/* render.js — 렌더러 설정(sRGB 출력·ACES 톤매핑·물리 기반 조명), PMREM 환경광, 후처리(AO·블룸·색보정), 화질 단계(high/low), 자동 하향.
   프로필(G-04): 'walk'(성당 걷기, 예전 그대로) | 'view'(창 감상: 보정 끔·Neutral·SSAO 끔·블룸은 햇빛 HDR 만). R.setProfile(p, {bloom}).
   ChurchRender.create(canvas, {quality}) -> R. 다른 파일은 R.render(scene, camera, dt) 만 부르면 된다. */
(function (root) {
  'use strict';
  var T = root.THREE, X = root.ThreeX || {};

  // Khronos PBR Neutral (https://github.com/KhronosGroup/ToneMapping/tree/main/PBR_Neutral). glass_math.js neutral() 과 같은 식.
  var NEUTRAL_GLSL = 'vec3 neutralTM(vec3 color){ const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;\n' +
    ' float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= offset;\n' +
    ' float peak = max(color.r, max(color.g, color.b)); if (peak < startCompression) return color;\n' +
    ' float d = 1.0 - startCompression; float newPeak = 1.0 - d * d / (peak + d - startCompression); color *= newPeak / peak;\n' +
    ' float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0); return mix(color, vec3(newPeak), g); }\n';
  // low 화질(후처리 없음)의 감상 프로필: three 의 CustomToneMapping 을 Neutral 로 바꾼다(재질별 toneMapped 가 그대로 동작).
  if (T && T.ShaderChunk && T.ShaderChunk.tonemapping_pars_fragment && T.ShaderChunk.tonemapping_pars_fragment.indexOf('neutralTM') < 0) {
    T.ShaderChunk.tonemapping_pars_fragment = T.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }',
      NEUTRAL_GLSL + 'vec3 CustomToneMapping( vec3 color ) { return neutralTM( color * toneMappingExposure ); }');
  }

  // 최종 패스(G-04): 성당 걷기 = 예전과 같은 색보정(채도 0.94·난색 +3%·비네트) + ACES(three r149 와 같은 식),
  // 감상 프로필 = 보정 없음 + Khronos PBR Neutral(색상각 보존). 사진 창(GlassView 재질)은 알파 0 을 써서 표시하고,
  // 그 화소는 어느 프로필에서든 보정·톤매핑을 건너뛴다(1.0 이하 항등, 넘치면 색상 보존 어깨) → 화면 값 = 사진 값.
  var FINAL_SHADER = {
    uniforms: { tDiffuse: { value: null }, vignette: { value: 0.16 }, sat: { value: 0.94 }, warm: { value: 0.03 }, uExposure: { value: 1 }, curve: { value: 0 }, glassOn: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float vignette; uniform float sat; uniform float warm; uniform float uExposure; uniform float curve; uniform float glassOn; varying vec2 vUv;\n' +
      'vec3 acesFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }\n' +
      'vec3 acesTM(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));\n' +
      ' const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));\n' +
      ' c *= uExposure / 0.6; c = I * c; c = acesFit(c); c = O * c; return clamp(c, 0.0, 1.0); }\n' +
      NEUTRAL_GLSL +
      'vec3 glassTM(vec3 c){ float p = max(c.r, max(c.g, c.b)); if (p <= 1.0) return c; float w = 1.0 - 1.0 / (1.0 + 0.6 * (p - 1.0)); return mix(c / p, vec3(1.0), w); }\n' +
      'void main(){ vec4 s = texture2D(tDiffuse, vUv); vec3 c = s.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 g = mix(vec3(l), c, sat); g *= vec3(1.0 + warm, 1.0, 1.0 - warm);\n' +
      ' float d = distance(vUv, vec2(0.5)); g *= 1.0 - vignette * smoothstep(0.3, 0.9, d);\n' +
      ' vec3 sc = curve > 0.5 ? neutralTM(g * uExposure) : acesTM(g);\n' +
      ' float m = glassOn * clamp(1.0 - s.a, 0.0, 1.0);\n' +
      ' gl_FragColor = vec4(mix(sc, glassTM(max(c, vec3(0.0))), m), 1.0);\n' +
      '#include <encodings_fragment>\n}'
  };

  function b64ToBuf(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  // 아바타 등 동적 물체: 그림자 설정 + Lambert 재질을 PBR(Standard)로 교체해 환경광을 받게 한다(교체본은 원본당 하나).
  var upgraded = {};
  function upgradeMaterial(m) {
    if (!m.isMeshLambertMaterial) return m;
    if (upgraded[m.uuid]) return upgraded[m.uuid];
    var n = new T.MeshStandardMaterial({ color: m.color, map: m.map, vertexColors: m.vertexColors, roughness: 0.72, metalness: 0, envMapIntensity: 0.9, side: m.side, transparent: m.transparent, opacity: m.opacity });
    upgraded[m.uuid] = n;
    return n;
  }
  function markCaster(obj) {
    obj.traverse(function (o) {
      if (o.isMesh && o.material && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; o.material = upgradeMaterial(o.material); }
    });
  }

  function create(canvas, opts) {
    opts = opts || {};
    var R = { tier: opts.quality === 'low' ? 'low' : 'high', autoTier: opts.autoTier !== false, composer: null, envTex: null, frameMs: 0, sampleT: 0, sampleN: 0, tierChanged: null, exposure: 1 };
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    R.renderer = renderer;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = R.tier === 'high';
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0xc7d0da, 1);
    renderer.info.autoReset = false;
    var gl2 = renderer.capabilities.isWebGL2;

    // ---- 환경광(PMREM) ----
    var pmrem = new T.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    R.envSource = 'none';
    try {
      if (root.ChurchEnvHDR && X.RGBELoader) {
        var d = new X.RGBELoader().parse(b64ToBuf(root.ChurchEnvHDR.b64));
        var tex = new T.DataTexture(d.data, d.width, d.height, d.format, d.type);
        tex.mapping = T.EquirectangularReflectionMapping;
        tex.minFilter = tex.magFilter = T.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
        R.envTex = pmrem.fromEquirectangular(tex).texture; tex.dispose();
        R.envSource = root.ChurchEnvHDR.name;
      }
    } catch (e) { if (root.console) console.warn('[church] HDR env failed, using procedural', e); }
    if (!R.envTex && X.RoomEnvironment) {
      try { R.envTex = pmrem.fromScene(new X.RoomEnvironment(), 0.04).texture; R.envSource = 'RoomEnvironment'; } catch (e) { /* ignore */ }
    }
    pmrem.dispose();

    // ---- 후처리 ----
    var W = 800, H = 450, PR = 1, curScene = null, curCam = null, ssao = null, bloom = null, finalPass = null, rpass = null;
    function ensureComposer() {
      if (R.composer || !X.EffectComposer || !curScene) return;
      var rt = new T.WebGLRenderTarget(Math.round(W * PR), Math.round(H * PR), { type: T.HalfFloatType, format: T.RGBAFormat, samples: (gl2 && !/[?&]msaa=0/.test(root.location ? root.location.search : '')) ? 4 : 0 });
      try { rt.depthTexture = new T.DepthTexture(Math.round(W * PR), Math.round(H * PR), T.UnsignedIntType); } catch (e) { /* 16비트 깊이로 폴백 */ }
      var c = new X.EffectComposer(renderer, rt);
      c.setPixelRatio(PR); c.setSize(W, H);
      rpass = new X.RenderPass(curScene, curCam);
      c.addPass(rpass);
      var search = root.location ? root.location.search : '';
      if (X.SSAOPass && !/[?&]ao=0/.test(search)) {
        ssao = new X.SSAOPass(curScene, curCam, Math.round(W * PR), Math.round(H * PR));
        ssao.kernelRadius = 0.9; ssao.minDistance = 0.00015; ssao.maxDistance = 0.0035;
        // SSAOPass 는 장면 전체를 자기 beautyRenderTarget 에 다시 그린다. 그 타깃엔 깊이 텍스처가 없어 three r149 가
        // 16비트 깊이 버퍼(DEPTH_COMPONENT16)를 잡는다 → near 0.3 에서 10m 거리 깊이 해상도 ≈5mm, 30m ≈5cm.
        // 벽 위 프레스코·판(1~2cm 앞)이 같은 깊이로 뭉개져 카메라가 조금만 움직여도 줄무늬로 깜빡였다(라테라노 '벽 깜빡임').
        // 32비트(UnsignedInt → DEPTH_COMPONENT24) 깊이 텍스처를 붙여 RenderPass 와 같은 정밀도로 그린다.
        try { var bt = ssao.beautyRenderTarget; bt.depthTexture = new T.DepthTexture(bt.width, bt.height, T.UnsignedIntType); } catch (e) { /* 16비트로 폴백 */ }
        // 법선 패스에서 스프라이트·포인트·하늘이 끼어들지 않도록 숨긴다
        var orig = ssao.renderOverride.bind(ssao);
        ssao.renderOverride = function (r, mat, target, cc, ca) {
          var hidden = [];
          curScene.traverse(function (o) { if ((o.isSprite || o.isPoints || o.userData.noAO || (o.material && (o.material.transparent || o.material.blending === T.AdditiveBlending)) || (o.material && o.material.side === T.BackSide)) && o.visible) { o.visible = false; hidden.push(o); } });
          orig(r, mat, target, cc, ca);
          hidden.forEach(function (o) { o.visible = true; });
        };
        // 사진 창 화소(G-29, beauty 알파 0 표시)에는 AO 를 곱하지 않는다: 마지막 'AO 곱하기' 합성만 알파로 가린 재질로 바꾼다
        // (알파 1 인 나머지 화소는 예전과 같은 값 = AO × 장면). 창 판 자체는 noAO 라 AO 계산에도 들어가지 않는다.
        var aoMix = new T.ShaderMaterial({
          uniforms: { tAO: { value: null }, tBeauty: { value: null } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: 'uniform sampler2D tAO; uniform sampler2D tBeauty; varying vec2 vUv; void main(){ vec3 ao = texture2D(tAO, vUv).rgb; float a = clamp(texture2D(tBeauty, vUv).a, 0.0, 1.0); gl_FragColor = vec4(mix(vec3(1.0), ao, a), 1.0); }',
          transparent: true, depthTest: false, depthWrite: false, toneMapped: false, blending: T.CustomBlending, blendEquation: T.AddEquation,
          blendSrc: T.DstColorFactor, blendDst: T.ZeroFactor, blendSrcAlpha: T.DstAlphaFactor, blendDstAlpha: T.ZeroFactor
        });
        var rp = ssao.renderPass.bind(ssao), ssaoRef = ssao;
        ssao.renderPass = function (r, mat, target, cc, ca) {
          if (mat === ssaoRef.copyMaterial && mat.blending === T.CustomBlending) { aoMix.uniforms.tAO.value = ssaoRef.blurRenderTarget.texture; aoMix.uniforms.tBeauty.value = ssaoRef.beautyRenderTarget.texture; mat = aoMix; }
          rp(r, mat, target, cc, ca);
        };
        c.addPass(ssao);
      }
      if (X.UnrealBloomPass) {
        bloom = new X.UnrealBloomPass(new T.Vector2(W, H), 0.3, 0.55, 0.92); c.addPass(bloom);
        // 블룸을 장면에 더하는 마지막 합성(G-29): 예전(AdditiveBlending = 블룸 rgb × 블룸 알파를 더함)과 같은 값을 미리 곱해서 내보내고,
        // 걷기 프로필에서는 '대상 알파'를 곱해 더한다 → 사진 창 화소(알파 0 표시)에는 주변의 밝은 금·돌 블룸이 번지지 않고(창 색 불변, 알파 표시도 유지),
        // 그 밖의 화소(알파 1)는 예전과 같은 값. 감상 프로필은 예전 식 그대로(applyProfile).
        var mc = bloom.materialCopy;
        if (mc) {
          mc.fragmentShader = 'uniform float opacity; uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 t = texture2D(tDiffuse, vUv) * opacity; gl_FragColor = vec4(t.rgb * t.a, t.a); }';
          mc.blending = T.CustomBlending; mc.blendEquation = T.AddEquation; mc.blendDst = T.OneFactor; mc.blendDstAlpha = T.OneFactor;
          mc.needsUpdate = true;
        }
      }
      finalPass = new X.ShaderPass(FINAL_SHADER);
      finalPass.material.toneMapped = false;
      c.addPass(finalPass);
      R.composer = c;
      applyProfile();
    }
    function disposeComposer() {
      if (!R.composer) return;
      try { R.composer.renderTarget1.dispose(); R.composer.renderTarget2.dispose(); } catch (e) { /* ignore */ }
      if (ssao && ssao.dispose) ssao.dispose();
      if (bloom && bloom.dispose) bloom.dispose();
      R.composer = null; ssao = bloom = finalPass = rpass = null;
    }

    R.resize = function (w, h, pr) {
      W = w; H = h; PR = pr;
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      if (R.composer) { R.composer.setPixelRatio(pr); R.composer.setSize(w, h); if (ssao && ssao.setSize) ssao.setSize(Math.round(w * pr), Math.round(h * pr)); }
    };
    R.setTier = function (t, world) {
      if (t === R.tier && (world ? world.tier === t : true)) return;
      R.tier = t;
      renderer.shadowMap.enabled = t === 'high';
      if (t === 'low') disposeComposer();
      if (world) world.setTier(t, renderer);
    };
    R.setExposure = function (e) { renderer.toneMappingExposure = e; };

    // ---- 프로필(G-04) ----
    R.profile = 'walk'; R.profileOpts = {};
    function applyProfile() {
      var v = R.profile === 'view', o = R.profileOpts || {};
      if (finalPass) {
        var u = finalPass.uniforms;
        u.curve.value = v ? 1 : 0; u.sat.value = v ? 1 : 0.94; u.warm.value = v ? 0 : 0.03; u.vignette.value = v ? 0 : 0.16;
      }
      // 감상: SSAO 끔(유리·창틀이 어두워지지 않게, 8비트 beauty 타깃도 피한다). 블룸은 햇빛의 HDR(>1.6)만, 강도 0.15·반경 0.4.
      if (ssao) ssao.enabled = !v;
      if (bloom) {
        var mc = bloom.materialCopy;
        if (mc && mc.blending === T.CustomBlending) { mc.blendSrc = v ? T.OneFactor : T.DstAlphaFactor; mc.blendSrcAlpha = v ? T.SrcAlphaFactor : T.ZeroFactor; }
        bloom.enabled = !v || !!o.bloom;
        if (v) { bloom.threshold = 1.6; bloom.strength = 0.15; bloom.radius = 0.4; } else { bloom.threshold = 0.92; bloom.strength = 0.3; bloom.radius = 0.55; }
      }
      var tm = v ? T.CustomToneMapping : T.ACESFilmicToneMapping;
      if (renderer.toneMapping !== tm) renderer.toneMapping = tm;   // low 화질 경로(후처리 없음)만 영향. 사진 창은 toneMapped:false.
    }
    R.setProfile = function (p, o) { R.profile = p === 'view' ? 'view' : 'walk'; R.profileOpts = o || {}; applyProfile(); };
    R.passes = function () { return { ssao: !!(ssao && ssao.enabled), bloom: !!(bloom && bloom.enabled), curve: finalPass ? finalPass.uniforms.curve.value : -1 }; };

    // 매 프레임: 렌더 + 프레임 시간 평균(3초)으로 자동 하향. 반환: 단계가 바뀌었으면 새 단계 문자열
    R.render = function (scene, camera, dt, world) {
      curScene = scene; curCam = camera;
      renderer.info.reset();
      var t0 = performance.now();
      if (R.tier === 'high' && X.EffectComposer) {
        ensureComposer();
        if (rpass) { rpass.scene = scene; rpass.camera = camera; }
        if (ssao) { ssao.scene = scene; ssao.camera = camera; }
        renderer.shadowMap.needsUpdate = true;
        if (finalPass) finalPass.uniforms.uExposure.value = renderer.toneMappingExposure;
        R.composer.render(dt);
      } else {
        renderer.shadowMap.needsUpdate = false;
        renderer.render(scene, camera);
      }
      var ms = performance.now() - t0;
      R.sampleT += dt * 1000; R.sampleN++; R.frameMs += dt * 1000;
      var changed = null;
      if (R.sampleT >= 3000) {
        var avg = R.frameMs / R.sampleN;
        R.lastAvgMs = avg;
        if (R.autoTier && R.tier === 'high' && avg > 45) { R.setTier('low', world); changed = 'low'; }
        R.sampleT = 0; R.sampleN = 0; R.frameMs = 0;
      }
      return changed;
    };
    // 아바타 등 동적 물체의 그림자 설정
    R.markCaster = markCaster;
    root.ChurchRenderUtil = { markCaster: markCaster };
    return R;
  }

  root.ChurchRender = { create: create };
  root.ChurchRenderUtil = root.ChurchRenderUtil || { markCaster: markCaster };
})(typeof window !== 'undefined' ? window : this);
