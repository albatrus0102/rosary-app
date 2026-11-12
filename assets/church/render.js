/* render.js — 렌더러 설정(sRGB 출력·ACES 톤매핑·물리 기반 조명), PMREM 환경광, 후처리(AO·블룸·색보정), 화질 단계(high/low), 자동 하향.
   ChurchRender.create(canvas, {quality}) -> R. 다른 파일은 R.render(scene, camera, dt) 만 부르면 된다. */
(function (root) {
  'use strict';
  var T = root.THREE, X = root.ThreeX || {};

  var FINAL_SHADER = {
    uniforms: { tDiffuse: { value: null }, vignette: { value: 0.16 }, sat: { value: 0.94 }, warm: { value: 0.03 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float vignette; uniform float sat; uniform float warm; varying vec2 vUv;\n' +
      'void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat); c *= vec3(1.0 + warm, 1.0, 1.0 - warm);\n' +
      ' float d = distance(vUv, vec2(0.5)); c *= 1.0 - vignette * smoothstep(0.3, 0.9, d); gl_FragColor = vec4(c, 1.0);\n' +
      '#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
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
        // 법선 패스에서 스프라이트·포인트·하늘이 끼어들지 않도록 숨긴다
        var orig = ssao.renderOverride.bind(ssao);
        ssao.renderOverride = function (r, mat, target, cc, ca) {
          var hidden = [];
          curScene.traverse(function (o) { if ((o.isSprite || o.isPoints || o.userData.noAO || (o.material && (o.material.transparent || o.material.blending === T.AdditiveBlending)) || (o.material && o.material.side === T.BackSide)) && o.visible) { o.visible = false; hidden.push(o); } });
          orig(r, mat, target, cc, ca);
          hidden.forEach(function (o) { o.visible = true; });
        };
        c.addPass(ssao);
      }
      if (X.UnrealBloomPass) { bloom = new X.UnrealBloomPass(new T.Vector2(W, H), 0.3, 0.55, 0.92); c.addPass(bloom); }
      finalPass = new X.ShaderPass(FINAL_SHADER);
      c.addPass(finalPass);
      R.composer = c;
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
