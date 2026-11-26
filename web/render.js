/* render.js — 렌더러 설정(sRGB 출력·ACES 톤매핑·물리 기반 조명), PMREM 환경광(RoomEnvironment), 후처리(블룸·색보정·피사계 심도), 화질 단계, 자동 하향.
   화질 단계: 'high'(블룸·MSAA 4·바닥 반사·그림자) | 'mid'(블룸 저해상도·MSAA 2·반사 끔·그림자) | 'low'(후처리 없음).
   그림자 맵은 해가 움직일 때만 다시 그린다(정적 장면만, 아바타는 발밑 그림자). 바닥 반사끼리 서로를 다시 그리지 않는다.
   RoomRender.create(canvas, {quality}) -> R. 다른 파일은 R.render(scene, camera, dt) 만 부르면 된다. */
(function (root) {
  'use strict';
  var T = root.THREE, X = root.ThreeX || {};

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

  // 최종 패스(G-04): 장면 걷기 = 예전과 같은 색보정(채도 0.94·난색 +3%·비네트) + ACES(three r149 와 같은 식),
  // 감상 프로필 = 보정 없음 + Khronos PBR Neutral(색상각 보존). 사진 창(GlassView 재질)은 알파 0 을 써서 표시하고,
  // 그 화소는 어느 프로필에서든 보정·톤매핑을 건너뛴다(1.0 이하 항등, 넘치면 색상 보존 어깨) → 화면 값 = 사진 값.
  // (2026-11-15, PERF_SCALE.md §2) 후처리 합치기: 예전에는 AO 합성(전해상도 HalfFloat 쓰기)·블룸 더하기(전해상도 읽고-쓰기)·최종 패스가 따로 돌았다.
  // 이제 최종 패스 한 번이 beauty × AO(반해상도, 깊이 가중 업샘플) + 블룸을 같은 식으로 계산한다 → 전해상도 패스 2개(모바일 대역폭의 큰 몫)가 없어진다.
  // 블룸 밝은 부분 추출도 AO 를 곱한 값으로 한다(예전 입력 = AO 합성 결과와 같은 값).
  var AO_GLSL = 'uniform sampler2D tAO; uniform sampler2D tDF; uniform sampler2D tDH; uniform vec2 halfRes; uniform float bilat; uniform float aoOn;\n' +
    'float aoAt(vec2 uv){ if (aoOn < 0.5) return 1.0; if (bilat < 0.5) return texture2D(tAO, uv).r;\n' +
    ' float df = texture2D(tDF, uv).x; vec2 p = uv * halfRes - 0.5; vec2 f = fract(p); vec2 b0 = (floor(p) + 0.5) / halfRes; vec2 px = vec2(1.0) / halfRes; float s = 0.0, w = 0.0;\n' +
    ' for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) { vec2 q = b0 + vec2(float(i), float(j)) * px; float bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);\n' +
    '  float dw = 1.0 / (1e-5 + abs(texture2D(tDH, q).x - df) * 400.0); float ww = bw * dw + 1e-6; s += texture2D(tAO, q).r * ww; w += ww; }\n' +
    ' return s / w; }\n';
  function aoUniforms() { return { tAO: { value: null }, tDF: { value: null }, tDH: { value: null }, halfRes: { value: new T.Vector2(1, 1) }, bilat: { value: 1 }, aoOn: { value: 0 } }; }
  // RENDER_V4 §4·§5: 피사계 심도(먼 배경만 흐리게 — 초점 거리의 1.35배부터 3.2배까지 서서히, 앞쪽은 흐리지 않는다)와 불꽃 위 아지랑이(아주 작은 굴절 흔들림).
  var FX_GLSL = '#include <packing>\nuniform sampler2D tFx; uniform float fxOn; uniform sampler2D tDepthF; uniform vec2 uNF; uniform sampler2D tDof; uniform float dofOn; uniform vec3 uDof;\n' +
    'uniform vec4 uHaze[4]; uniform float hazeOn; uniform float uTime; uniform float uAspect;\n' +
    'float dofCoc(vec2 uv){ float z = -perspectiveDepthToViewZ(texture2D(tDepthF, uv).x, uNF.x, uNF.y); return smoothstep(uDof.x * 1.35, uDof.x * 3.2, z) * uDof.y; }\n' +
    // 불꽃 하나: 화면 (x, y) 바로 위, 크기 z(화면 높이 비율), 세기 w. 불꽃 위 0.3~3배 높이의 좁은 기둥에서만, 0.5~1화소 흔들린다.
    'vec2 hazeOff(vec2 uv){ vec2 o = vec2(0.0); for (int i = 0; i < 4; i++) { vec4 h = uHaze[i]; if (h.w <= 0.0) continue;\n' +
    '  vec2 d = uv - h.xy; d.x *= uAspect; float yy = d.y / h.z, xx = d.x / (h.z * 0.5);\n' +
    '  float m = exp(-xx * xx) * smoothstep(0.3, 1.0, yy) * (1.0 - smoothstep(1.8, 3.4, yy)); if (m < 0.01) continue;\n' +
    '  float ph = yy * 5.0 - uTime * 4.2; o += m * h.w * h.z * vec2(0.022 * sin(ph + 1.7 * sin(xx * 2.3 + uTime * 1.3)), 0.012 * cos(ph * 0.83)); }\n' +
    ' return o; }\n';
  var DOF_SHADER = {
    uniforms: { tDiffuse: { value: null }, tDepthF: { value: null }, uNF: { value: null }, uDof: { value: null }, uPx: { value: null } },   // 벡터 값은 패스를 만들 때(THREE 가 실린 뒤)
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: '#include <packing>\nuniform sampler2D tDiffuse; uniform sampler2D tDepthF; uniform vec2 uNF; uniform vec3 uDof; uniform vec2 uPx; varying vec2 vUv;\n' +
      'float cocAt(vec2 uv){ float z = -perspectiveDepthToViewZ(texture2D(tDepthF, uv).x, uNF.x, uNF.y); return smoothstep(uDof.x * 1.35, uDof.x * 3.2, z); }\n' +
      'void main(){ vec3 acc = texture2D(tDiffuse, vUv).rgb; float wsum = 1.0;\n' +
      ' for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996 + 0.5; float r = sqrt((float(i) + 0.5) / 12.0) * 2.6;\n' +
      '  vec2 q = vUv + vec2(cos(a), sin(a)) * r * uPx; float w = cocAt(q) + 0.02; acc += texture2D(tDiffuse, q).rgb * w; wsum += w; }\n' +
      ' gl_FragColor = vec4(acc / wsum, 1.0); }'
  };
  var FINAL_SHADER = {
    uniforms: { tDiffuse: { value: null }, vignette: { value: 0.16 }, sat: { value: 0.94 }, warm: { value: 0.03 }, uExposure: { value: 1 }, curve: { value: 0 }, glassOn: { value: 1 }, con: { value: 0 },
      tAO: { value: null }, tDF: { value: null }, tDH: { value: null }, halfRes: { value: null }, bilat: { value: 1 }, aoOn: { value: 0 }, tBloom: { value: null }, bloomOn: { value: 0 }, bloomView: { value: 0 },
      // RENDER_V4: fx(빛줄기·먼지, 반·¼ 해상도 가산) · 피사계 심도(먼 배경만, 반해상도 흐림) · 불꽃 위 아지랑이(화면 영역 4곳)
      tFx: { value: null }, fxOn: { value: 0 }, tDepthF: { value: null }, uNF: { value: null }, tDof: { value: null }, dofOn: { value: 0 }, uDof: { value: null },
      uHaze: { value: null }, hazeOn: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float vignette; uniform float sat; uniform float warm; uniform float uExposure; uniform float curve; uniform float glassOn; uniform float con; varying vec2 vUv;\n' +
      'uniform sampler2D tBloom; uniform float bloomOn; uniform float bloomView;\n' + AO_GLSL + FX_GLSL +
      'vec3 acesFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }\n' +
      'vec3 acesTM(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));\n' +
      ' const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));\n' +
      ' c *= uExposure / 0.6; c = I * c; c = acesFit(c); c = O * c; return clamp(c, 0.0, 1.0); }\n' +
      NEUTRAL_GLSL +
      'vec3 glassTM(vec3 c){ float p = max(c.r, max(c.g, c.b)); if (p <= 1.0) return c; float w = 1.0 - 1.0 / (1.0 + 0.6 * (p - 1.0)); return mix(c / p, vec3(1.0), w); }\n' +
      'void main(){ vec2 uv = vUv; if (hazeOn > 0.5) uv += hazeOff(vUv); vec4 s = texture2D(tDiffuse, uv);\n' +
      ' if (dofOn > 0.5) s.rgb = mix(s.rgb, texture2D(tDof, vUv).rgb, dofCoc(vUv));\n' +
      // 예전 AO 합성: rgb × mix(1, AO, 알파) (사진 창 화소 = 알파 0 은 AO 없음)
      ' s.rgb *= mix(1.0, aoAt(vUv), clamp(s.a, 0.0, 1.0));\n' +
      // 예전 블룸 더하기(혼합 상태를 식으로): 걷기 = rgb += 블룸·블룸알파·대상 알파(사진 창에는 번지지 않음, 알파 그대로), 감상 = rgb += 블룸·블룸알파, 알파 += 블룸알파²
      ' if (bloomOn > 0.5) { vec4 t = texture2D(tBloom, vUv); vec3 ad = t.rgb * t.a; if (bloomView > 0.5) { s.rgb += ad; s.a += t.a * t.a; } else s.rgb += ad * s.a; }\n' +
      ' if (fxOn > 0.5) s.rgb += texture2D(tFx, vUv).rgb;\n' +
      ' vec3 c = s.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 g = mix(vec3(l), c, sat); g *= vec3(1.0 + warm, 1.0, 1.0 - warm);\n' +
      ' float d = distance(vUv, vec2(0.5)); g *= 1.0 - vignette * smoothstep(0.3, 0.9, d);\n' +
      ' vec3 sc = curve > 0.5 ? neutralTM(g * uExposure) : acesTM(g);\n' +
      ' sc = mix(sc, sc * sc * (3.0 - 2.0 * sc), con);\n' +
      ' float m = glassOn * clamp(1.0 - s.a, 0.0, 1.0);\n' +
      ' gl_FragColor = vec4(mix(sc, glassTM(max(c, vec3(0.0))), m), 1.0);\n' +
      '#include <encodings_fragment>\n}'
  };

  function FINAL_LITE() {
    var f = FINAL_SHADER.fragmentShader.replace("if (hazeOn > 0.5) uv += hazeOff(vUv);", '').replace(" if (dofOn > 0.5) s.rgb = mix(s.rgb, texture2D(tDof, vUv).rgb, dofCoc(vUv));\n", '');
    return { uniforms: FINAL_SHADER.uniforms, vertexShader: FINAL_SHADER.vertexShader, fragmentShader: f };
  }
  function b64ToBuf(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

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

  // 화질 단계 표(RENDER_V3.md §1). 무거운 것은 전부 여기 단계 뒤에 둔다. low 는 예전 비용 그대로(후처리·그림자·구운 AO 없음).
  //  msaa: 장면 렌더 타깃 표본 수 · ssao: 반해상도 SSAO · bloomDiv: 블룸 사슬 해상도 나눗수(1 = 1/2 부터, 2 = 1/4 부터, 0 = 블룸 없음)
  //  reflect: 바닥 거울 반사 · shadow: 해 그림자 맵 · aoBake: 미리 구운 AO(정점 + 바닥 지도, ao_fx.js) · aoK: 구운 AO 세기(high 는 SSAO 와 겹쳐 조금 약하게)
  //  specAA: 법선 지도 반짝임 줄이기 · maxDpr: 화소 비율 상한 · pace: 고주사율(90Hz 이상) 화면에서 못 따라가면 절반 주기로 고정(main.js)
  //  probes·probeRes: 장면 안 반사 탐침 수·큐브 한 면 크기(probe_fx.js, RENDER_V4.md §2; 장면을 지을 때의 단계 크기로 고정)
  //  probeMix·probeDesat: 거울 반사 중 탐침 몫(나머지는 예전 HDRI — 금이 어두운 실내에서 구리색으로 죽지 않게)·탐침 색 바래기
  //  shafts·shaftK·fxDiv·motes: 부드러운 빛줄기(그림자 맵·깊이로 가림)·세기·fx 패스 해상도 나눗수·먼지 입자 수(shaft_fx.js, §3)
  var TIERS = {
    high: { msaa: 4, ssao: false, bloomDiv: 1, reflect: true, shadow: true, aoBake: true, aoK: 1.0, gi: 1, specAA: 1, maxDpr: 2, pace: true, probes: 2, probeRes: 128, probeMix: 0.75, probeDesat: 0.25, shafts: true, shaftK: 1, fxDiv: 2, motes: 640, dof: 0.6, haze: 1 },
    mid: { msaa: 2, ssao: false, bloomDiv: 2, reflect: false, shadow: true, aoBake: true, aoK: 1.25, gi: 1, specAA: 1, maxDpr: 2, pace: true, probes: 1, probeRes: 64, probeMix: 0.7, probeDesat: 0.25, shafts: true, shaftK: 0.9, fxDiv: 4, motes: 220, dof: 0.45, haze: 0.6 },
    low: { msaa: 0, ssao: false, bloomDiv: 0, reflect: false, shadow: false, aoBake: false, aoK: 0, gi: 0, specAA: 0, maxDpr: 1.5, pace: true, probes: 0, probeRes: 0, shafts: false, shaftK: 0, fxDiv: 0, motes: 0, dof: 0, haze: 0 }
  };
  function tierOf(q) { return q === 'low' ? 'low' : (q === 'mid' ? 'mid' : 'high'); }

  // 화면 전체 삼각형 하나(three examples 의 FullScreenQuad 와 같은 일, 정점 셰이더는 clip 좌표를 그대로 쓴다)
  function fsQuad(mat) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    g.setAttribute('uv', new T.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    var m = new T.Mesh(g, mat); m.frustumCulled = false;
    return { mesh: m, cam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }

  function create(canvas, opts) {
    opts = opts || {};
    var R = { tier: tierOf(opts.quality), autoTier: opts.autoTier !== false, composer: null, envTex: null, frameMs: 0, sampleT: 0, sampleN: 0, tierChanged: null, exposure: 1,
      resScale: 1, stats: { shadowRenders: 0, reflectRenders: 0, frames: 0, fxDraws: 0, dofDraws: 0 } };
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
    if (!R.envTex && X.RoomEnvironment) {
      try { R.envTex = pmrem.fromScene(new X.RoomEnvironment(), 0.04).texture; R.envSource = 'RoomEnvironment'; } catch (e) { /* ignore */ }
    }
    pmrem.dispose();

    // ---- 후처리 ----
    var W = 800, H = 450, PR = 1, curScene = null, curCam = null, ssao = null, bloom = null, finalPass = null, rpass = null;
    var curWorld = null, fxRT = null, dofRT = null, _cc = new T.Color();
    R.dof = { focus: 3, amount: 0 };   // main.js 가 채운다(초점 거리 m, 0..1)
    R.haze = [];                         // world.js 가 채운다: [{x, y(화면 0..1), size, k}] 최대 4
    // SSAO 는 반해상도(AO 는 흐린 신호라 화면 차이는 거의 없고, 법선 패스·AO 셰이더 비용이 1/4). ?aofull=1 이면 예전처럼 전해상도.
    var aoDiv = /[?&]aofull=1/.test(root.location ? root.location.search : '') ? 1 : 2;
    function aoW() { return Math.max(2, Math.round(W * PR / aoDiv)); }
    function aoH() { return Math.max(2, Math.round(H * PR / aoDiv)); }
    var postMerge = !/[?&]postmerge=0/.test(root.location ? root.location.search : ''), aoU = aoUniforms(), bloomHP = null;
    // UnrealBloomPass(r149).render 와 같은 순서(추출 → 밉 블러 → 합성)이되, 추출은 AO 를 곱하고 마지막 '입력 위에 더하기'는 하지 않는다.
    function bloomRender(r, writeBuffer, readBuffer) {
      var b = bloom, oac = r.autoClear;
      r.getClearColor(b._oldClearColor); b.oldClearAlpha = r.getClearAlpha();
      r.autoClear = false; r.setClearColor(b.clearColor, 0);
      var hu = bloomHP.uniforms;
      hu.tDiffuse.value = readBuffer.texture; hu.luminosityThreshold.value = b.threshold;
      b.fsQuad.material = bloomHP; r.setRenderTarget(b.renderTargetBright); r.clear(); b.fsQuad.render(r);
      var inp = b.renderTargetBright;
      for (var i = 0; i < b.nMips; i++) {
        var m = b.separableBlurMaterials[i];
        b.fsQuad.material = m;
        m.uniforms.colorTexture.value = inp.texture; m.uniforms.direction.value = X.UnrealBloomPass.BlurDirectionX;
        r.setRenderTarget(b.renderTargetsHorizontal[i]); r.clear(); b.fsQuad.render(r);
        m.uniforms.colorTexture.value = b.renderTargetsHorizontal[i].texture; m.uniforms.direction.value = X.UnrealBloomPass.BlurDirectionY;
        r.setRenderTarget(b.renderTargetsVertical[i]); r.clear(); b.fsQuad.render(r);
        inp = b.renderTargetsVertical[i];
      }
      var cu = b.compositeMaterial.uniforms;
      b.fsQuad.material = b.compositeMaterial;
      cu.bloomStrength.value = b.strength; cu.bloomRadius.value = b.radius; cu.bloomTintColors.value = b.bloomTintColors;
      r.setRenderTarget(b.renderTargetsHorizontal[0]); r.clear(); b.fsQuad.render(r);
      r.setClearColor(b._oldClearColor, b.oldClearAlpha); r.autoClear = oac;
    }
    function ensureComposer() {
      if (R.composer || !X.EffectComposer || !curScene) return;
      var TC = TIERS[R.tier];
      var rt = new T.WebGLRenderTarget(Math.round(W * PR), Math.round(H * PR), { type: T.HalfFloatType, format: T.RGBAFormat, samples: (gl2 && !/[?&]msaa=0/.test(root.location ? root.location.search : '')) ? TC.msaa : 0 });
      try { rt.depthTexture = new T.DepthTexture(Math.round(W * PR), Math.round(H * PR), T.UnsignedIntType); } catch (e) { /* 16비트 깊이로 폴백 */ }
      var c = new X.EffectComposer(renderer, rt);
      // renderTarget2 는 rt 의 복제인데, three r149 의 복제 깊이 질감은 같은 GL 질감(Source)을 공유한다.
      // AO 합성이 readBuffer 의 깊이를 읽으면서 writeBuffer 에 그리므로 따로 만든다(아니면 피드백 루프로 검게 나온다).
      if (rt.depthTexture) { try { c.renderTarget2.depthTexture = new T.DepthTexture(rt.width, rt.height, T.UnsignedIntType); } catch (e) { /* ignore */ } }
      c.setPixelRatio(PR); c.setSize(W, H);
      rpass = new X.RenderPass(curScene, curCam);
      c.addPass(rpass);
      var search = root.location ? root.location.search : '';
      if (TC.ssao && X.SSAOPass && !/[?&]ao=0/.test(search)) {
        ssao = new X.SSAOPass(curScene, curCam, aoW(), aoH());
        ssao.kernelRadius = 0.9; ssao.minDistance = 0.00015; ssao.maxDistance = 0.0035;
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
        ssao.aoMix = aoMix;   // ?postmerge=0 (예전 경로: 따로 합성) 비교용
        ssao.needsSwap = !postMerge;
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
          aoU.tAO.value = me.blurRenderTarget.texture; aoU.tDF.value = readBuffer.depthTexture || null; aoU.tDH.value = me.normalRenderTarget.depthTexture;
          aoU.bilat.value = readBuffer.depthTexture ? 1 : 0; aoU.halfRes.value.set(me.width, me.height); aoU.aoOn.value = 1;
          if (postMerge) return;   // 합성은 블룸 추출·최종 패스가 aoAt() 로 한다(전해상도 쓰기 없음)
          var mu = aoMix.uniforms;
          mu.tAO.value = me.blurRenderTarget.texture; mu.tBeauty.value = readBuffer.texture;
          mu.tDF.value = aoU.tDF.value; mu.tDH.value = aoU.tDH.value; mu.bilat.value = aoU.bilat.value;
          mu.halfRes.value.set(me.width, me.height);
          me.renderPass(r, aoMix, writeBuffer);
          aoU.aoOn.value = 0;
        };
        // 쓰지 않는 beauty 타깃은 비운다(메모리)
        try { ssao.beautyRenderTarget.setSize(1, 1); ssao.beautyRenderTarget.setSize = function () {}; } catch (e) { /* ignore */ }
        c.addPass(ssao);
      }
      // RENDER_V4 §3: fx 패스 — 부드러운 빛줄기·먼지(world.fx.scene)를 반(high)·¼(mid) 해상도 HalfFloat 에 가산으로 그린다.
      // 장면 깊이(readBuffer.depthTexture)·해 그림자 맵으로 가리므로 장면 패스에서는 빼고, 최종 패스가 더한다(블룸에는 들어가지 않는다 = 빛줄기가 번져 뿌옇게 되지 않는다).
      if (TC.fxDiv) {
        fxRT = new T.WebGLRenderTarget(2, 2, { type: gl2 ? T.HalfFloatType : T.UnsignedByteType, format: T.RGBAFormat, depthBuffer: false, stencilBuffer: false, generateMipmaps: false });
        c.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: false,
          setSize: function (w, h) { fxRT.setSize(Math.max(2, Math.round(w / TC.fxDiv)), Math.max(2, Math.round(h / TC.fxDiv))); },
          render: function (r, wb, rb) {
            var fw = curWorld && curWorld.fx;
            if (!fw || !fw.active() || R.profile !== 'walk') return;
            fw.prepare(curCam, rb.depthTexture || null, fxRT.width, fxRT.height);
            var oac = r.autoClear; r.getClearColor(_cc); var oca = r.getClearAlpha();
            r.autoClear = false; r.setRenderTarget(fxRT); r.setClearColor(0x000000, 0); r.clear(true, false, false);
            r.render(fw.scene, curCam);
            r.setClearColor(_cc, oca); r.autoClear = oac;
            R.stats.fxDraws++;
            finalPass.uniforms.fxOn.value = 1;
          },
          dispose: function () { fxRT.dispose(); } });
      }
      if (TC.dof) {
        dofRT = new T.WebGLRenderTarget(2, 2, { type: gl2 ? T.HalfFloatType : T.UnsignedByteType, format: T.RGBAFormat, depthBuffer: false, stencilBuffer: false, generateMipmaps: false });
        var dofMat = new T.ShaderMaterial(DOF_SHADER), dofQuad = fsQuad(dofMat);
        dofMat.uniforms.uNF.value = new T.Vector2(0.3, 700); dofMat.uniforms.uDof.value = new T.Vector3(3, 0, 0); dofMat.uniforms.uPx.value = new T.Vector2(1, 1);
        dofMat.depthTest = false; dofMat.depthWrite = false;
        c.addPass({ enabled: true, needsSwap: false, clear: false, renderToScreen: false,
          setSize: function (w, h) { dofRT.setSize(Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2))); },
          render: function (r, wb, rb) {
            if (!(R.dof.amount > 0.003) || R.profile !== 'walk' || !rb.depthTexture) return;
            var u = dofMat.uniforms;
            u.tDiffuse.value = rb.texture; u.tDepthF.value = rb.depthTexture; u.uNF.value.set(curCam.near, curCam.far);
            u.uDof.value.set(R.dof.focus, R.dof.amount, 0); u.uPx.value.set(1 / dofRT.width, 1 / dofRT.height);
            r.setRenderTarget(dofRT); r.render(dofQuad.mesh, dofQuad.cam);
            R.stats.dofDraws++;
            var fu = finalPass.uniforms; fu.dofOn.value = 1; fu.tDof.value = dofRT.texture; fu.uDof.value.set(R.dof.focus, R.dof.amount * TC.dof, 0);
          },
          dispose: function () { dofRT.dispose(); dofMat.dispose(); dofQuad.mesh.geometry.dispose(); } });
      }
      if (X.UnrealBloomPass) {
        bloom = new X.UnrealBloomPass(new T.Vector2(W, H), 0.3, 0.55, 0.92);
        // 보통(mid): 블룸 사슬을 한 단계 더 작게(1/4 해상도부터). 높음은 예전 그대로(1/2). addPass 가 곧바로 setSize 를 부르므로 그 전에 바꾼다.
        if (TC.bloomDiv > 1) { var bs = bloom.setSize.bind(bloom); bloom.setSize = function (w, h) { bs(Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2))); }; }
        c.addPass(bloom);
        if (postMerge) {
          // 밝은 부분 추출 = 예전 셰이더(LuminosityHighPass) × AO. 마지막 '입력 위에 더하기' 패스는 하지 않는다(최종 패스가 tBloom 을 읽는다).
          var hpU = T.UniformsUtils.merge([bloom.highPassUniforms, aoUniforms()]);
          hpU.smoothWidth.value = bloom.highPassUniforms.smoothWidth.value;
          bloomHP = new T.ShaderMaterial({ uniforms: hpU, vertexShader: bloom.materialHighPassFilter.vertexShader, depthTest: false, depthWrite: false,
            fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 defaultColor; uniform float defaultOpacity; uniform float luminosityThreshold; uniform float smoothWidth; varying vec2 vUv;\n' + AO_GLSL +
              'void main(){ vec4 texel = texture2D(tDiffuse, vUv); texel.rgb *= mix(1.0, aoAt(vUv), clamp(texel.a, 0.0, 1.0)); float v = dot(texel.xyz, vec3(0.299, 0.587, 0.114));\n' +
              ' vec4 outputColor = vec4(defaultColor.rgb, defaultOpacity); float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v); gl_FragColor = mix(outputColor, texel, alpha); }' });
          bloom.render = bloomRender;
        }
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
      finalPass = new X.ShaderPass(/[?&]v4fs=0/.test(root.location ? root.location.search : '') ? FINAL_LITE() : FINAL_SHADER);   // ?v4fs=0: 측정용(심도·아지랑이 코드를 뺀 최종 패스)
      finalPass.material.toneMapped = false;
      (function () {
        var fu = finalPass.uniforms;
        fu.uNF.value = new T.Vector2(0.3, 700); fu.uDof.value = new T.Vector3(3, 0, 0); fu.uHaze.value = [new T.Vector4(), new T.Vector4(), new T.Vector4(), new T.Vector4()];
        var fr = finalPass.render.bind(finalPass);
        finalPass.render = function (r, wb, rb, dt, mask) { fu.tDepthF.value = rb.depthTexture || null; if (!rb.depthTexture) fu.dofOn.value = 0; return fr(r, wb, rb, dt, mask); };
      })();
      // AO 유니폼은 최종 패스·블룸 추출이 같은 객체를 나눠 쓴다(SSAO 패스가 프레임마다 채운다)
      ['tAO', 'tDF', 'tDH', 'halfRes', 'bilat', 'aoOn'].forEach(function (k) { finalPass.uniforms[k] = aoU[k]; if (bloomHP) bloomHP.uniforms[k] = aoU[k]; });
      c.addPass(finalPass);
      R.composer = c;
      applyProfile();
    }
    function disposeComposer() {
      if (!R.composer) return;
      try { R.composer.renderTarget1.dispose(); R.composer.renderTarget2.dispose(); } catch (e) { /* ignore */ }
      if (ssao && ssao.dispose) ssao.dispose();
      if (bloom && bloom.dispose) bloom.dispose();
      if (bloomHP) bloomHP.dispose();
      if (fxRT) fxRT.dispose(); if (dofRT) dofRT.dispose();
      R.composer = null; ssao = bloom = finalPass = rpass = bloomHP = fxRT = dofRT = null; aoU.aoOn.value = 0;
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
    // 장면 룩(looks.js → world env.grade): 걷기 프로필에서만 최종 패스·블룸 값을 바꾼다. g 가 null 이면 예전 값.
    R.grade = null;
    R.setGrade = function (g) {
      R.grade = g || null;
      if (R.profile !== 'walk') return;
      if (!g) { applyProfile(); return; }
      if (finalPass) { var u = finalPass.uniforms; u.sat.value = g.sat; u.warm.value = g.warm; u.vignette.value = g.vig; u.con.value = g.con; }
      if (bloom) {
        bloom.threshold = g.bloomT; bloom.strength = g.bloomS * (R.tier === 'mid' ? g.midBloomS : 1); bloom.radius = g.bloomR;
        // RENDER_V4 §8: 임계 아래로 부드러운 어깨(사진의 하이라이트 번짐) — 예전 0.01 은 딱 끊겨 얼룩졌다
        if (bloomHP && g.bloomKnee !== undefined) bloomHP.uniforms.smoothWidth.value = Math.max(0.01, g.bloomKnee);
      }
    };
    R.setProfile = function (p, o) { R.profile = p === 'view' ? 'view' : 'walk'; R.profileOpts = o || {}; applyProfile(); };
    R.passes = function () { return { ssao: !!(ssao && ssao.enabled), bloom: !!(bloom && bloom.enabled), curve: finalPass ? finalPass.uniforms.curve.value : -1, tier: R.tier }; };
    // 시험·측정용(perf_compare.mjs): 패스 켜고 끄기
    // 측정용(perf_compare.mjs): v4 가 더한 렌더 타깃 메모리(MB) — fx(빛줄기) · 심도 흐림
    R.v4Mem = function () {
      var mb = function (rt, bpp) { return rt ? rt.width * rt.height * bpp / 1048576 : 0; };
      return { fxMB: +mb(fxRT, gl2 ? 8 : 4).toFixed(2), dofMB: +mb(dofRT, gl2 ? 8 : 4).toFixed(2) };
    };
    R._dbg = function () { return { ssao: ssao, bloom: bloom, finalPass: finalPass, rpass: rpass, composer: R.composer }; };

    // ---- 그림자 맵 캐시: 정적 장면만 그린다. 움직이는 물체(markCaster 로 표시한 아바타 등)는 그리는 동안만 castShadow 를 끈다 ----
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
    // 반사에 비치지 않아도 되는 것(PERF_SCALE.md §2): 화면 UI(이름표·표식·강조 고리 = renderOrder 7~99)와 점(먼지·별).
    var noRefl = [], noReflAt = -1e9, noReflScene = null;
    var noReflVis = [];
    function noReflVisit(o) { if (o.isPoints || (o.renderOrder >= 7 && o.renderOrder < 100)) noRefl.push(o); }
    function guardReflectors(world) {
      if (!world || !world.group) return;
      var ch = world.group.children;
      if (ch.length === R._guardN && world.group === R._guardG) return;   // 월드·자식 수가 바뀔 때만 다시 살핀다
      R._guardN = ch.length; R._guardG = world.group;
      for (var i = 0; i < ch.length; i++) {
        var o = ch[i];
        if (!o.userData.reflector || o.userData.guarded) continue;
        guardOne(o);
      }
    }
    function guardOne(o) {
      var ob = o.onBeforeRender;
      o.onBeforeRender = function (r, sc, cam) {
        if (R._inAux) return;   // 다른 반사·SSAO 법선 패스 안에서는 갱신하지 않는다(지난 프레임 반사 질감을 그대로 쓴다)
        R._inAux = true; R.stats.reflectRenders++;
        var now = performance.now();
        if (sc !== noReflScene || now - noReflAt > 1000) { noRefl.length = 0; sc.traverse(noReflVisit); noReflAt = now; noReflScene = sc; }
        var hid = R._reflHide !== false ? noRefl.length : 0, k;
        for (k = 0; k < hid; k++) { noReflVis[k] = noRefl[k].visible; noRefl[k].visible = false; }
        try { ob.call(this, r, sc, cam); } finally { R._inAux = false; for (k = 0; k < hid; k++) noRefl[k].visible = noReflVis[k]; }
      };
      o.userData.guarded = true;
    }

    // 매 프레임: 렌더 + 프레임 시간 평균(3초)으로 자동 하향. 반환: 단계가 바뀌었으면 새 단계 문자열
    R.render = function (scene, camera, dt, world) {
      curScene = scene; curCam = camera; curWorld = world || null;
      var TC0 = TIERS[R.tier];
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
        if (finalPass) {
          var fu = finalPass.uniforms;
          fu.uExposure.value = renderer.toneMappingExposure;
          aoU.aoOn.value = 0;   // SSAO 패스가 이번 프레임에 돌면 1 로 채운다
          fu.bloomOn.value = postMerge && bloom && bloom.enabled ? 1 : 0; fu.bloomView.value = R.profile === 'view' ? 1 : 0;
          fu.tBloom.value = bloom ? bloom.renderTargetsHorizontal[0].texture : null;
          fu.fxOn.value = 0; fu.dofOn.value = 0; fu.tFx.value = fxRT ? fxRT.texture : null;   // fx·심도 패스가 이번 프레임에 돌면 1
          fu.uNF.value.set(camera.near, camera.far); fu.uTime.value = (fu.uTime.value + (dt || 0)) % 1000; fu.uAspect.value = W / Math.max(1, H);
          var hz = TC0.haze ? R.haze : null, hn = 0;
          for (var hi = 0; hi < 4; hi++) {
            var hv = fu.uHaze.value[hi], h0 = hz && hz[hi];
            if (h0 && h0.k > 0.01) { hv.set(h0.x, h0.y, h0.size, h0.k * TC0.haze); hn++; } else hv.set(0, 0, 1, 0);
          }
          fu.hazeOn.value = hn && R.profile === 'walk' ? 1 : 0;
        }
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
        if (R.autoTier && R.tier === 'high' && avg > 40) { R.setTier('mid', world); changed = 'mid'; }
        else if (R.autoTier && R.tier === 'mid' && avg > 45) { R.setTier('low', world); changed = 'low'; }
        R.sampleT = 0; R.sampleN = 0; R.frameMs = 0;
      }
      return changed;
    };
    // 아바타 등 동적 물체의 그림자 설정
    R.markCaster = markCaster;
    root.RoomRenderUtil = { markCaster: markCaster };
    return R;
  }

  root.RoomRender = { create: create, tierOf: tierOf, TIERS: TIERS };
  root.RoomRenderUtil = root.RoomRenderUtil || { markCaster: markCaster };
})(typeof window !== 'undefined' ? window : this);
