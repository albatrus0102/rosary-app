/* render.js — 렌더러 설정(sRGB 출력·ACES 톤매핑·물리 기반 조명), PMREM 환경광, 후처리(AO·블룸·색보정), 화질 단계(high/low), 자동 하향.
   프로필(G-04): 'walk'(성당 걷기, 예전 그대로) | 'view'(창 감상: 보정 끔·Neutral·SSAO 끔·블룸은 햇빛 HDR 만). R.setProfile(p, {bloom}).
   화질 단계(PERF.md §화질 3단계): 'high'(SSAO 반해상도·블룸·MSAA 4·바닥 반사·그림자) | 'mid'(SSAO 끔·블룸 저해상도·MSAA 2·반사 끔·그림자) | 'low'(후처리 없음).
   같은 화질에서 비용 줄이기(PERF.md §2026-11 최적화): 그림자 맵은 해가 움직일 때만 다시 그린다(정적 성당만, 아바타는 발밑 그림자),
   SSAO 는 RenderPass 결과(MSAA)를 그대로 쓰고 장면을 다시 그리지 않는다, 바닥 반사끼리 서로를 다시 그리지 않는다.
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
    uniforms: { tDiffuse: { value: null }, vignette: { value: 0.16 }, sat: { value: 0.94 }, warm: { value: 0.03 }, uExposure: { value: 1 }, curve: { value: 0 }, glassOn: { value: 1 }, con: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float vignette; uniform float sat; uniform float warm; uniform float uExposure; uniform float curve; uniform float glassOn; uniform float con; varying vec2 vUv;\n' +
      'vec3 acesFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }\n' +
      'vec3 acesTM(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));\n' +
      ' const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));\n' +
      ' c *= uExposure / 0.6; c = I * c; c = acesFit(c); c = O * c; return clamp(c, 0.0, 1.0); }\n' +
      NEUTRAL_GLSL +
      'vec3 glassTM(vec3 c){ float p = max(c.r, max(c.g, c.b)); if (p <= 1.0) return c; float w = 1.0 - 1.0 / (1.0 + 0.6 * (p - 1.0)); return mix(c / p, vec3(1.0), w); }\n' +
      'void main(){ vec4 s = texture2D(tDiffuse, vUv); vec3 c = s.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 g = mix(vec3(l), c, sat); g *= vec3(1.0 + warm, 1.0, 1.0 - warm);\n' +
      ' float d = distance(vUv, vec2(0.5)); g *= 1.0 - vignette * smoothstep(0.3, 0.9, d);\n' +
      ' vec3 sc = curve > 0.5 ? neutralTM(g * uExposure) : acesTM(g);\n' +
      ' sc = mix(sc, sc * sc * (3.0 - 2.0 * sc), con);\n' +
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
  // 움직이는 물체는 태양 그림자 맵에 그리지 않는다(맵은 해가 움직일 때만 다시 그리므로 아바타 그림자가 남게 된다; 아바타는 발밑 그림자 판이 있다).
  function markCaster(obj) {
    obj.traverse(function (o) {
      if (o.isMesh && o.material && !o.material.transparent) { o.receiveShadow = true; o.material = upgradeMaterial(o.material); }
    });
    obj.userData.dynamic = true;
  }

  function tierOf(q) { return q === 'low' ? 'low' : (q === 'mid' ? 'mid' : 'high'); }

  function create(canvas, opts) {
    opts = opts || {};
    var R = { tier: tierOf(opts.quality), autoTier: opts.autoTier !== false, composer: null, envTex: null, frameMs: 0, sampleT: 0, sampleN: 0, tierChanged: null, exposure: 1,
      resScale: 1, stats: { shadowRenders: 0, reflectRenders: 0, frames: 0 } };
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    R.renderer = renderer;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = R.tier !== 'low';
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
    // SSAO 는 반해상도(AO 는 흐린 신호라 화면 차이는 거의 없고, 법선 패스·AO 셰이더 비용이 1/4). ?aofull=1 이면 예전처럼 전해상도.
    var aoDiv = /[?&]aofull=1/.test(root.location ? root.location.search : '') ? 1 : 2;
    function aoW() { return Math.max(2, Math.round(W * PR / aoDiv)); }
    function aoH() { return Math.max(2, Math.round(H * PR / aoDiv)); }
    function ensureComposer() {
      if (R.composer || !X.EffectComposer || !curScene) return;
      var hiT = R.tier === 'high';
      var rt = new T.WebGLRenderTarget(Math.round(W * PR), Math.round(H * PR), { type: T.HalfFloatType, format: T.RGBAFormat, samples: (gl2 && !/[?&]msaa=0/.test(root.location ? root.location.search : '')) ? (hiT ? 4 : 2) : 0 });
      try { rt.depthTexture = new T.DepthTexture(Math.round(W * PR), Math.round(H * PR), T.UnsignedIntType); } catch (e) { /* 16비트 깊이로 폴백 */ }
      var c = new X.EffectComposer(renderer, rt);
      // renderTarget2 는 rt 의 복제인데, three r149 의 복제 깊이 질감은 같은 GL 질감(Source)을 공유한다.
      // AO 합성이 readBuffer 의 깊이를 읽으면서 writeBuffer 에 그리므로 따로 만든다(아니면 피드백 루프로 검게 나온다).
      if (rt.depthTexture) { try { c.renderTarget2.depthTexture = new T.DepthTexture(rt.width, rt.height, T.UnsignedIntType); } catch (e) { /* ignore */ } }
      c.setPixelRatio(PR); c.setSize(W, H);
      rpass = new X.RenderPass(curScene, curCam);
      c.addPass(rpass);
      var search = root.location ? root.location.search : '';
      if (hiT && X.SSAOPass && !/[?&]ao=0/.test(search)) {
        ssao = new X.SSAOPass(curScene, curCam, aoW(), aoH());
        ssao.kernelRadius = 0.9; ssao.minDistance = 0.00015; ssao.maxDistance = 0.0035;
        // (2026-11) SSAOPass 는 원래 장면 전체를 자기 beautyRenderTarget 에 한 번 더 그리고(바닥 반사도 다시 돈다) RenderPass 결과를 버렸다.
        // 이제 RenderPass 결과(readBuffer, MSAA·32비트 깊이)를 그대로 쓴다: 장면은 법선 패스(반해상도)만 더 그린다.
        // 예전 '벽 깜빡임'(16비트 깊이) 대책은 그대로 유지된다: 색은 RenderPass 의 32비트 깊이로, AO 깊이는 법선 패스 깊이로 계산.
        // 법선 패스에서 스프라이트·포인트·하늘이 끼어들지 않도록 숨긴다
        var hideList = [];
        var orig = ssao.renderOverride.bind(ssao);
        ssao.renderOverride = function (r, mat, target, cc, ca) {
          hideList.length = 0;
          curScene.traverseVisible(function (o) { if (o.isSprite || o.isPoints || o.isLine || o.userData.noAO || (o.material && (o.material.transparent || o.material.blending === T.AdditiveBlending || o.material.side === T.BackSide))) hideList.push(o); });
          for (var i = 0; i < hideList.length; i++) hideList[i].visible = false;
          R._inAux = true;
          orig(r, mat, target, cc, ca);
          R._inAux = false;
          for (i = 0; i < hideList.length; i++) hideList[i].visible = true;
        };
        // 합성 1패스: 화면 = beauty × mix(1, AO, beauty 알파). 사진 창 화소(G-29, 알파 0 표시)에는 AO 를 곱하지 않는다.
        // AO 는 반해상도라 깊이를 보며 4점 가중 업샘플(가장자리 번짐 방지)한다.
        var aoMix = new T.ShaderMaterial({
          uniforms: { tAO: { value: null }, tBeauty: { value: null }, tDF: { value: null }, tDH: { value: null }, halfRes: { value: new T.Vector2(1, 1) }, bilat: { value: 1 } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: 'uniform sampler2D tAO; uniform sampler2D tBeauty; uniform sampler2D tDF; uniform sampler2D tDH; uniform vec2 halfRes; uniform float bilat; varying vec2 vUv;\n' +
            'void main(){ vec4 b = texture2D(tBeauty, vUv); float ao;\n' +
            ' if (bilat > 0.5) { float df = texture2D(tDF, vUv).x; vec2 p = vUv * halfRes - 0.5; vec2 f = fract(p); vec2 b0 = (floor(p) + 0.5) / halfRes; vec2 px = vec2(1.0) / halfRes; float s = 0.0, w = 0.0;\n' +
            '  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) { vec2 q = b0 + vec2(float(i), float(j)) * px; float bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);\n' +
            '   float dw = 1.0 / (1e-5 + abs(texture2D(tDH, q).x - df) * 400.0); float ww = bw * dw + 1e-6; s += texture2D(tAO, q).r * ww; w += ww; }\n' +
            '  ao = s / w; } else ao = texture2D(tAO, vUv).r;\n' +
            ' float a = clamp(b.a, 0.0, 1.0); gl_FragColor = vec4(b.rgb * mix(1.0, ao, a), b.a); }',
          depthTest: false, depthWrite: false, toneMapped: false, blending: T.NoBlending
        });
        var ssaoRef = ssao;
        ssao.aoMix = aoMix;
        ssao.needsSwap = true;
        // EffectComposer.setSize 가 모든 패스에 전해상도를 넘기므로 AO 는 여기서 나눈다
        var ssaoSet = ssao.setSize.bind(ssao);
        ssao.setSize = function (w, h) { ssaoSet(Math.max(2, Math.round(w / aoDiv)), Math.max(2, Math.round(h / aoDiv))); };
        ssao.render = function (r, writeBuffer, readBuffer) {
          var me = ssaoRef;
          if (!r.capabilities.isWebGL2) me.noiseTexture.format = T.LuminanceFormat;
          me.overrideVisibility();
          me.renderOverride(r, me.normalMaterial, me.normalRenderTarget, 0x7777ff, 1);
          me.restoreVisibility();
          var u = me.ssaoMaterial.uniforms;
          u.kernelRadius.value = me.kernelRadius; u.minDistance.value = me.minDistance; u.maxDistance.value = me.maxDistance;
          u.tDiffuse.value = readBuffer.texture;
          me.renderPass(r, me.ssaoMaterial, me.ssaoRenderTarget);
          me.renderPass(r, me.blurMaterial, me.blurRenderTarget);
          var mu = aoMix.uniforms;
          mu.tAO.value = me.blurRenderTarget.texture; mu.tBeauty.value = readBuffer.texture;
          mu.tDF.value = readBuffer.depthTexture || null; mu.tDH.value = me.normalRenderTarget.depthTexture; mu.bilat.value = readBuffer.depthTexture ? 1 : 0;
          mu.halfRes.value.set(me.width, me.height);
          me.renderPass(r, aoMix, writeBuffer);
        };
        // 쓰지 않는 beauty 타깃은 비운다(메모리)
        try { ssao.beautyRenderTarget.setSize(1, 1); ssao.beautyRenderTarget.setSize = function () {}; } catch (e) { /* ignore */ }
        c.addPass(ssao);
      }
      if (X.UnrealBloomPass) {
        bloom = new X.UnrealBloomPass(new T.Vector2(W, H), 0.3, 0.55, 0.92);
        // 보통(mid): 블룸 사슬을 한 단계 더 작게(1/4 해상도부터). 높음은 예전 그대로(1/2). addPass 가 곧바로 setSize 를 부르므로 그 전에 바꾼다.
        if (!hiT) { var bs = bloom.setSize.bind(bloom); bloom.setSize = function (w, h) { bs(Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2))); }; }
        c.addPass(bloom);
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
      if (R.composer) { R.composer.setPixelRatio(pr); R.composer.setSize(w, h); }
    };
    R.setTier = function (t, world) {
      t = tierOf(t);
      if (t === R.tier && (world ? world.tier === t : true)) return;
      var was = R.tier;
      R.tier = t;
      renderer.shadowMap.enabled = t !== 'low';
      if (t !== was) disposeComposer();   // 단계마다 패스 구성이 다르다(다음 프레임에 새로 만든다)
      R.shadowDirty = true;
      if (world) world.setTier(t, renderer);
    };
    R.setExposure = function (e) { renderer.toneMappingExposure = e; };

    // ---- 프로필(G-04) ----
    R.profile = 'walk'; R.profileOpts = {};
    function applyProfile() {
      var v = R.profile === 'view', o = R.profileOpts || {};
      if (finalPass) {
        var u = finalPass.uniforms;
        u.curve.value = v ? 1 : 0; u.sat.value = v ? 1 : 0.94; u.warm.value = v ? 0 : 0.03; u.vignette.value = v ? 0 : 0.16; u.con.value = 0;
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
    // 성당 룩(looks.js → world env.grade): 걷기 프로필에서만 최종 패스·블룸 값을 바꾼다. g 가 null 이면 예전 값.
    R.grade = null;
    R.setGrade = function (g) {
      R.grade = g || null;
      if (R.profile !== 'walk') return;
      if (!g) { applyProfile(); return; }
      if (finalPass) { var u = finalPass.uniforms; u.sat.value = g.sat; u.warm.value = g.warm; u.vignette.value = g.vig; u.con.value = g.con; }
      if (bloom) { bloom.threshold = g.bloomT; bloom.strength = g.bloomS * (R.tier === 'mid' ? g.midBloomS : 1); bloom.radius = g.bloomR; }
    };
    R.setProfile = function (p, o) { R.profile = p === 'view' ? 'view' : 'walk'; R.profileOpts = o || {}; applyProfile(); };
    R.passes = function () { return { ssao: !!(ssao && ssao.enabled), bloom: !!(bloom && bloom.enabled), curve: finalPass ? finalPass.uniforms.curve.value : -1, tier: R.tier }; };
    // 시험·측정용(perf_compare.mjs): 패스 켜고 끄기
    R._dbg = function () { return { ssao: ssao, bloom: bloom, finalPass: finalPass, rpass: rpass, composer: R.composer }; };

    // ---- 그림자 맵 캐시: 정적 성당만 그린다. 움직이는 물체(markCaster 로 표시한 아바타 등)는 그리는 동안만 castShadow 를 끈다 ----
    var dynStash = [];
    function hideDynamicCasters(scene) {
      dynStash.length = 0;
      var ch = scene.children;
      for (var i = 0; i < ch.length; i++) {
        if (!ch[i].userData.dynamic) continue;
        ch[i].traverse(function (o) { if (o.castShadow) { o.castShadow = false; dynStash.push(o); } });
      }
    }
    function restoreDynamicCasters() { for (var i = 0; i < dynStash.length; i++) dynStash[i].castShadow = true; dynStash.length = 0; }
    // ---- 바닥 반사끼리 서로를 다시 그리지 않게(반사 속 반사는 세기 0.35 × 0.35 로 보이지 않는데 장면을 통째로 한 번 더 그렸다) ----
    function guardReflectors(world) {
      if (!world || !world.group) return;
      world.group.children.forEach(function (o) {
        if (!o.userData.reflector || o.userData.guarded) return;
        var ob = o.onBeforeRender;
        o.onBeforeRender = function (r, sc, cam) {
          if (R._inAux) return;   // 다른 반사·SSAO 법선 패스 안에서는 갱신하지 않는다(지난 프레임 반사 질감을 그대로 쓴다)
          R._inAux = true; R.stats.reflectRenders++;
          try { ob.call(this, r, sc, cam); } finally { R._inAux = false; }
        };
        o.userData.guarded = true;
      });
    }

    // 매 프레임: 렌더 + 프레임 시간 평균(3초)으로 자동 하향. 반환: 단계가 바뀌었으면 새 단계 문자열
    R.render = function (scene, camera, dt, world) {
      curScene = scene; curCam = camera;
      renderer.info.reset();
      var t0 = performance.now();
      var shadowNow = renderer.shadowMap.enabled && (R.shadowDirty || (world && world.shadowDirty) || R.shadowEveryFrame);
      if (shadowNow) { if (world) world.shadowDirty = false; R.shadowDirty = false; R.stats.shadowRenders++; hideDynamicCasters(scene); }
      renderer.shadowMap.needsUpdate = !!shadowNow;
      guardReflectors(world);
      if (R.tier !== 'low' && X.EffectComposer) {
        ensureComposer();
        if (rpass) { rpass.scene = scene; rpass.camera = camera; }
        if (ssao) { ssao.scene = scene; ssao.camera = camera; }
        if (finalPass) finalPass.uniforms.uExposure.value = renderer.toneMappingExposure;
        R.composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }
      if (shadowNow) restoreDynamicCasters();
      R.stats.frames++;
      var ms = performance.now() - t0;
      R.lastRenderMs = ms;
      R.sampleT += dt * 1000; R.sampleN++; R.frameMs += dt * 1000;
      var changed = null;
      if (R.sampleT >= 3000) {
        var avg = R.frameMs / R.sampleN;
        R.lastAvgMs = avg;
        // 자동 하향(안전장치): 높음 → 보통 → 간단. 해상도는 낮추지 않는다(선명도 유지). 3초 평균 프레임 간격 기준.
        if (R.autoTier && R.tier === 'high' && avg > 40) { R.setTier('mid', world); changed = 'mid'; }
        else if (R.autoTier && R.tier === 'mid' && avg > 45) { R.setTier('low', world); changed = 'low'; }
        R.sampleT = 0; R.sampleN = 0; R.frameMs = 0;
      }
      return changed;
    };
    // 아바타 등 동적 물체의 그림자 설정
    R.markCaster = markCaster;
    root.ChurchRenderUtil = { markCaster: markCaster };
    return R;
  }

  root.ChurchRender = { create: create, tierOf: tierOf };
  root.ChurchRenderUtil = root.ChurchRenderUtil || { markCaster: markCaster };
})(typeof window !== 'undefined' ? window : this);
