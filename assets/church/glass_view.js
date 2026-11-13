/* glass_view.js — 스테인드글라스 감상 모드(G-05 창 재질, G-07 감상 모드, G-08 감상실 연결).
   ChurchGlassView.create(App, H) -> view. H = {start(o), loadWorld(id, {view}), kick(), post(o)}
   브리지: viewWindow({win, mode:'room'|'church', tier:'t1'|'t2', light:'ref'|'sun'|'night', hour?}), endView(), setViewLight({light,hour}),
           setViewTier({tier}), resetView(). 이벤트: viewReady, viewEnd, viewError, viewPerf, viewGesture (SPEC §22).
   - 창 판: 사진(알파 윤곽) 한 장, draw call 1. 조명·안개·SSAO·그림자 없음. 출력 = tex.rgb(선형) × 투과량 × 색조. 알파 0 으로 써서
     최종 패스가 보정·톤매핑을 건너뛴다(render.js) → 기준광에서 화면 값 = 사진 값. 윤곽은 알파 0.5 등고선을 화면 미분으로 1px 부드럽게.
   - 질감: t1(1k)을 먼저 보여 주고 t2(2k)가 오면 0.25초 교차 페이드. 동시에 올라가 있는 창 질감은 최대 2장(교체·종료 때 해제).
     file:// 에서는 WebGL 이 파일 그림을 못 읽으므로(교차 출처) gpack_<id>_<1k|2k>.js(data URI) 를 script 로 읽는다. http(s) 나 base 가 있으면 .webp 를 직접.
   - 필요할 때만 그린다: 입력·활강·페이드·빛 바꾸기 때만 프레임을 그리고, 멈추면 rAF 를 멈춘다(main.js). */
(function (root) {
  'use strict';
  var T = root.THREE, GM = root.ChurchGlassMath;
  var FOV = 35, GLIDE = 0.9, RESET = 0.4, FADE = 0.25;
  // 밉 LOD 치우침: 삼선형 필터는 축소할 때 이상적인 면적 평균보다 흐리다. -0.5 면 화면 화소 크기에 더 가깝다(밉맵·이방성으로 모아레 억제).
  var LOD_BIAS = (function () { try { var m = /[?&]lodbias=(-?[0-9.]+)/.exec(root.location.search); return m ? +m[1] : -0.5; } catch (e) { return -0.5; } })();

  var GLASS_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var SRGB_GLSL = 'vec3 s2l(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }\n';
  var GLASS_FS = 'uniform sampler2D uMapA; uniform sampler2D uMapB; uniform float uMix; uniform float uBias; uniform float uK; uniform vec3 uTint; uniform vec3 uRefl;\n' +
    'uniform float uDecode; uniform float uSelfTone; uniform float uDebug; uniform float uFade; varying vec2 vUv;\n' + SRGB_GLSL +
    'vec3 glassTM(vec3 c){ float p = max(c.r, max(c.g, c.b)); if (p <= 1.0) return c; float w = 1.0 - 1.0 / (1.0 + 0.6 * (p - 1.0)); return mix(c / p, vec3(1.0), w); }\n' +
    'void main(){\n' +
    ' vec4 a = texture2D(uMapA, vUv, uBias);\n' +
    ' if (uMix > 0.0) a = mix(a, texture2D(uMapB, vUv, uBias), uMix);\n' +
    ' if (uDecode > 0.5) a.rgb = s2l(a.rgb);\n' +
    ' float fw = max(fwidth(a.a), 1e-4);\n' +
    ' float cov = clamp((a.a - 0.5) / fw + 0.5, 0.0, 1.0) * uFade;\n' +
    ' if (cov < 0.004) discard;\n' +
    ' vec3 c = a.rgb * uK * uTint + uRefl;\n' +
    ' if (uDebug > 0.5) c = vec3(1.0);\n' +
    ' if (uSelfTone > 0.5) c = glassTM(c);\n' +
    ' gl_FragColor = vec4(c, cov);\n' +
    '#include <encodings_fragment>\n}';
  // 창 둘레 돌 뒤판 위의 빛 번짐 + 윤곽 바로 바깥의 얇은 그늘(창틀). 색 = 흐린 밉(bias)으로 읽은 창 색 × 알파.
  var GLOW_VS = 'uniform vec4 uMapXf; varying vec2 vW; void main(){ vW = uv * uMapXf.xy + uMapXf.zw; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  // 빛 번짐 색은 창 그림을 96px 로 줄여 흐린 작은 질감(uPatch, 알파를 곱해 검정 위에 합성, 이방성 없음)에서 읽는다.
  // (창 질감을 큰 bias 로 읽으면 개구부 바깥의 clamp 영역에서 이방성 필터가 축 방향 줄무늬를 만든다.) 그늘(창틀)은 판 안쪽에서만 창 알파로.
  var GLOW_FS = 'uniform sampler2D uMap; uniform sampler2D uPatch; uniform float uHasPatch; uniform float uGlow; uniform float uRim; uniform float uDecode; uniform float uFall; uniform vec3 uTint; varying vec2 vW;\n' + SRGB_GLSL +
    'void main(){ vec2 uc = clamp(vW, 0.0, 1.0); float od = length((vW - uc) * vec2(uFall, uFall));\n' +
    ' vec3 fc = uHasPatch > 0.5 ? texture2D(uPatch, uc).rgb : vec3(0.0);\n' +
    ' float fall = exp(-od * 3.0);\n' +
    ' vec3 glow = fc * uGlow * uTint * fall;\n' +
    ' float rim = 0.0; if (od <= 0.0) { float na = texture2D(uMap, vW, 1.5).a; rim = smoothstep(0.02, 0.45, na); }\n' +
    ' gl_FragColor = vec4(glow, 1.0 - uRim * rim);\n' +
    '#include <encodings_fragment>\n}';

  // gpack_<id>_<1k|2k>.js(data URI) 를 script 로 읽어 Image 로 돌려준다. 감상 모드와 성당 안 창(glass_place.js)이 같이 쓴다:
  // 같은 팩을 동시에 부르면 한 번만 읽고 같은 Image 를 나눠 쓴다(문자열은 디코드 뒤 GC 되게 바로 놓는다).
  var packFlight = {};
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { s.parentNode && s.parentNode.removeChild(s); res(); };
      s.onerror = function () { s.parentNode && s.parentNode.removeChild(s); rej(new Error('script ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadPackImage(id, tier) {
    var key = GM.packKey(id, tier);
    if (packFlight[key]) return packFlight[key];
    var P = root.ChurchGlassPack = root.ChurchGlassPack || {};
    var got = P[key] ? Promise.resolve() : loadScript(GM.packFile(id, tier));
    var pr = got.then(function () {
      var uri = P[key]; delete P[key];
      if (!uri) throw new Error('texture');
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(img); }; img.onerror = function () { rej(new Error('texture')); };
        img.src = uri;
      });
    });
    packFlight[key] = pr;
    var done = function () { if (packFlight[key] === pr) delete packFlight[key]; };
    pr.then(done, done);
    return pr;
  }

  function create(App, H) {
    var post = H.post;
    var V = {
      active: false, parked: false, mode: 'room', win: null, entry: null, size: null, light: 'ref', hour: 10, tierReq: 't2', tierShown: null,
      // 카메라 상태
      zoom: 1, panX: 0, panY: 0, dist: 1, zMax: 8, zoomPeak: 1, panned: false,
      stats: { created: 0, disposed: 0, resident: 0, peak: 0, texMb: 0, loads: 0, errors: 0, frames: 0 },
      params: null
    };
    var slot = null, glassMesh = null, glowMesh = null, patchMesh = null, glassMat = null, glowMat = null, patchMat = null, patchTex = null;
    var texs = [];           // 올라가 있는 창 질감 [{id,tier,tex,mb}]
    var token = 0, prev = null, t0 = 0, readyPosted = false, enterT = 0, fade = null, anim = null, dirty = true, hidden = [];
    var perfTimer = null, perfFrames = 0, perfBusy = 0, gestT = {};
    var caps = null;
    var tmpQ = new T.Quaternion(), tmpV = new T.Vector3(), upV = new T.Vector3(0, 1, 0);

    function gl() { return App.renderer ? App.renderer.getContext() : null; }
    function capsOf() {
      if (caps) return caps;
      var r = App.renderer;
      caps = { maxTex: r ? r.capabilities.maxTextureSize : 0, aniso: r ? r.capabilities.getMaxAnisotropy() : 1, gl2: r ? r.capabilities.isWebGL2 : false, deviceMemory: root.navigator && root.navigator.deviceMemory };
      return caps;
    }
    function isHttp() { var p = root.location ? root.location.protocol : ''; return p === 'http:' || p === 'https:'; }

    // ---------------- 카탈로그 ----------------
    var catIndex = null, catPromise = null;
    function loadCatalog() {
      if (catIndex) return Promise.resolve(catIndex);
      if (catPromise) return catPromise;
      var p;
      if (root.ChurchGlassCatalog) p = Promise.resolve(root.ChurchGlassCatalog);
      else if (isHttp()) p = fetch((V.base || '') + 'glass_catalog.json').then(function (r) { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); });
      else p = loadScript('glass_catalog.js').then(function () { return root.ChurchGlassCatalog; });
      catPromise = p.then(function (cat) { catIndex = GM.indexCatalog(cat); return catIndex; }, function (e) { catPromise = null; throw e; });
      return catPromise;
    }

    // ---------------- 질감 ----------------
    function loadImage(id, tier) {
      var base = V.base;
      if (base || isHttp()) {
        return new Promise(function (res, rej) {
          var img = new Image();
          if (base && /^https?:/.test(base)) img.crossOrigin = 'anonymous';
          img.onload = function () { res(img); }; img.onerror = function () { rej(new Error('texture')); };
          img.src = (base || '') + GM.tierFile(id, tier);
        });
      }
      return loadPackImage(id, tier);
    }
    function tainted(img) {
      try { var c = document.createElement('canvas'); c.width = c.height = 1; var g = c.getContext('2d'); g.drawImage(img, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1); return false; } catch (e) { return true; }
    }
    function sumMb() { var s = 0; texs.forEach(function (t) { s += t.mb; }); return s; }
    function countStats() { V.stats.resident = texs.length; V.stats.peak = Math.max(V.stats.peak, texs.length); V.stats.texMb = Math.round(sumMb() * 10) / 10; }
    function disposeTex(rec) {
      var i = texs.indexOf(rec);
      if (i >= 0) texs.splice(i, 1);
      if (rec.tex) { rec.tex.dispose(); rec.tex = null; V.stats.disposed++; }
      countStats();
    }
    function disposeAllTex() { texs.slice().forEach(disposeTex); if (patchTex) { patchTex.dispose(); patchTex = null; } }
    // 새 질감을 올리기 전에 자리를 만든다(최대 2장): 보이는 것(keep)을 빼고 오래된 것부터 해제
    function makeRoom(keep) {
      while (texs.length >= 2) {
        var victim = null;
        for (var i = 0; i < texs.length; i++) if (keep.indexOf(texs[i]) < 0) { victim = texs[i]; break; }
        if (!victim) victim = texs[0];
        disposeTex(victim);
      }
    }
    function upload(img, id, tier, keep) {
      makeRoom(keep || []);
      var c = capsOf(), tex = new T.Texture(img);
      tex.encoding = c.gl2 ? T.sRGBEncoding : T.LinearEncoding;   // WebGL1 은 셰이더에서 sRGB 를 푼다(uDecode)
      tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
      tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.anisotropy = c.aniso; tex.premultiplyAlpha = false;
      tex.needsUpdate = true;
      var g = gl();
      if (g) g.getError();
      App.renderer.initTexture(tex);
      var err = g ? g.getError() : 0;
      if (g && err === g.OUT_OF_MEMORY) { tex.dispose(); throw new Error('memory'); }
      var rec = { id: id, tier: tier, tex: tex, mb: GM.texMb(img.naturalWidth || img.width, img.naturalHeight || img.height), w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, img: img };
      texs.push(rec); V.stats.created++; countStats();
      return rec;
    }
    function fail(reason, tok) {
      if (tok !== undefined && tok !== token) return;
      V.stats.errors++;
      post({ e: 'viewError', win: V.win, reason: reason });
    }
    function reasonOf(e) { var m = e && e.message; return m === 'memory' || m === 'webgl' || m === 'texture' ? m : (e && e.name === 'SecurityError' ? 'texture' : (/script|catalog/.test(m || '') ? 'texture' : 'unknown')); }

    // 질감을 받아 창 판에 건다(첫 질감이면 바로, 아니면 교차 페이드)
    function fetchTier(id, tier, tok) {
      V.stats.loads++;
      var ts = performance.now();
      return loadImage(id, tier).then(function (img) {
        if (tok !== token) return null;
        if (!isHttp() && !V.base) { /* data URI 는 교차 출처가 아니다 */ } else if (tainted(img)) throw new Error('texture');
        if (img.decode) return img.decode().catch(function () { /* 이미 디코드 */ }).then(function () { return img; });
        return img;
      }).then(function (img) {
        if (!img || tok !== token || !glassMat) return null;
        var cur = currentRec();
        var rec = upload(img, id, tier, cur ? [cur] : []);
        rec.ms = Math.round(performance.now() - ts);
        applyTex(rec);
        return rec;
      });
    }
    function currentRec() { var u = glassMat && glassMat.uniforms.uMapA.value; for (var i = 0; i < texs.length; i++) if (texs[i].tex === u) return texs[i]; return null; }
    function applyTex(rec) {
      var u = glassMat.uniforms, cur = currentRec();
      if (!cur) {
        u.uMapA.value = rec.tex; u.uMix.value = 0;
        V.tierShown = rec.tier; V.readyRec = rec;
      } else {
        u.uMapB.value = rec.tex; u.uMix.value = 0;
        fade = { t: 0, rec: rec, from: cur };
      }
      if (glowMat) glowMat.uniforms.uMap.value = (cur || rec).tex;
      updateZoomMax(rec);
      buildPatchTex(rec.img);
      rec.img = null;
      dirty = true; H.kick();
    }
    function endFade() {
      if (!fade) return;
      var u = glassMat.uniforms, f = fade; fade = null;
      u.uMapA.value = f.rec.tex; u.uMapB.value = null; u.uMix.value = 0;
      if (glowMat) glowMat.uniforms.uMap.value = f.rec.tex;
      V.tierShown = f.rec.tier;
      disposeTex(f.from);
    }
    // 바닥 색빛(햇빛): 창 질감을 64px 로 줄여 흐리게(알파 곱) 한 작은 캔버스 질감
    function buildPatchTex(img) {
      if (!img || patchTex) return;
      try {
        var c = document.createElement('canvas'), a = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
        c.width = a >= 1 ? 96 : Math.max(8, Math.round(96 * a)); c.height = a >= 1 ? Math.max(8, Math.round(96 / a)) : 96;
        var g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        if ('filter' in g) g.filter = 'blur(1.2px)';
        g.drawImage(img, 0, 0, c.width, c.height);
        patchTex = new T.CanvasTexture(c); patchTex.encoding = T.sRGBEncoding; patchTex.anisotropy = 1;
        patchTex.wrapS = patchTex.wrapT = T.ClampToEdgeWrapping; patchTex.minFilter = T.LinearFilter; patchTex.generateMipmaps = false;
        if (patchMat) { patchMat.map = patchTex; patchMat.needsUpdate = true; }
        if (glowMat) { glowMat.uniforms.uPatch.value = patchTex; glowMat.uniforms.uHasPatch.value = 1; }
      } catch (e) { /* 색빛 없이 */ }
    }

    // ---------------- 창 판·빛 번짐·바닥 색빛 ----------------
    function disposeMeshes() {
      [glassMesh, glowMesh, patchMesh].forEach(function (m) { if (m) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); } });
      glassMesh = glowMesh = patchMesh = null; glassMat = glowMat = patchMat = null;
    }
    function buildMeshes(s, w, h, withGlow) {
      disposeMeshes();
      var c = capsOf(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(s.nx, 0, s.nz));
      glassMat = new T.ShaderMaterial({
        uniforms: { uMapA: { value: null }, uMapB: { value: null }, uMix: { value: 0 }, uBias: { value: LOD_BIAS }, uK: { value: 1 }, uTint: { value: new T.Vector3(1, 1, 1) }, uRefl: { value: new T.Vector3(0, 0, 0) },
          uDecode: { value: c.gl2 ? 0 : 1 }, uSelfTone: { value: 0 }, uDebug: { value: 0 }, uFade: { value: 1 } },
        vertexShader: GLASS_VS, fragmentShader: GLASS_FS, extensions: { derivatives: true },
        fog: false, lights: false, toneMapped: false, transparent: false, depthWrite: true,
        blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
        blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor
      });
      glassMesh = new T.Mesh(new T.PlaneGeometry(w, h), glassMat);
      glassMesh.position.set(s.x, s.y, s.z); glassMesh.quaternion.copy(q);
      glassMesh.renderOrder = 1; glassMesh.userData.noAO = true; glassMesh.userData.glassView = true; glassMesh.castShadow = false; glassMesh.receiveShadow = false;
      glassMesh.frustumCulled = false;
      App.world.group.add(glassMesh);
      if (withGlow && s.open) {
        var ow = s.open.x1 - s.open.x0, oh = s.open.y1 - s.open.y0;
        glowMat = new T.ShaderMaterial({
          uniforms: { uMap: { value: null }, uPatch: { value: null }, uHasPatch: { value: 0 }, uGlow: { value: 0.1 }, uRim: { value: 0.35 }, uDecode: { value: c.gl2 ? 0 : 1 }, uTint: { value: new T.Vector3(1, 1, 1) },
            uFall: { value: 4.0 }, uMapXf: { value: new T.Vector4(ow / w, oh / h, (s.open.x0 - (s.x - w / 2)) / w, (s.open.y0 - (s.y - h / 2)) / h) } },
          vertexShader: GLOW_VS, fragmentShader: GLOW_FS, fog: false, lights: false, toneMapped: false, transparent: true, depthWrite: false,
          blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.SrcAlphaFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor
        });
        glowMesh = new T.Mesh(new T.PlaneGeometry(ow, oh), glowMat);
        glowMesh.position.set((s.open.x0 + s.open.x1) / 2, (s.open.y0 + s.open.y1) / 2, s.backZ + 0.004);
        glowMesh.renderOrder = 2; glowMesh.userData.noAO = true; glowMesh.frustumCulled = false;
        App.world.group.add(glowMesh);
        // 바닥 색빛(햇빛 때만 보임)
        var pg = new T.BufferGeometry();
        pg.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3));
        pg.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2));
        patchMat = new T.MeshBasicMaterial({ map: patchTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
        patchMesh = new T.Mesh(pg, patchMat); patchMesh.frustumCulled = false; patchMesh.renderOrder = 3; patchMesh.visible = false; patchMesh.userData.noAO = true;
        App.world.group.add(patchMesh);
      }
    }
    // 빛 상태 적용: 투과량·색조·반사·빛 번짐·바닥 색빛·방 조명(ch_glass 의 envOverride)
    function applyLight() {
      var st = GM.lightState(V.light, V.hour);
      if (V.params) { V.params.light = V.light; V.params.hour = V.hour; }
      if (glassMat) {
        var u = glassMat.uniforms;
        u.uK.value = st.k; u.uTint.value.set(st.tint[0], st.tint[1], st.tint[2]);
        var r = st.refl * (V.light === 'night' ? 1 : 0);
        u.uRefl.value.set(r * 1.0, r * 0.7, r * 0.45);
      }
      if (glowMat) { glowMat.uniforms.uGlow.value = st.glow * Math.min(st.k, 1.5); glowMat.uniforms.uTint.value.set(st.tint[0], st.tint[1], st.tint[2]); glowMat.uniforms.uRim.value = V.light === 'night' ? 0.15 : 0.35; }
      if (patchMesh) {
        var on = V.light === 'sun' && st.patch > 0.01 && slot && slot.open;
        patchMesh.visible = !!on;
        if (on) placePatch(st);
      }
      if (App.R) App.R.setProfile('view', { bloom: V.light === 'sun' });
      if (App.world && V.mode === 'room') App.world.setHour(V.light === 'sun' ? V.hour : App.world.hour());
      dirty = true; H.kick();
    }
    function placePatch(st) {
      var L = [-st.sun[0], -st.sun[1], -st.sun[2]];
      if (L[1] > -0.03) { patchMesh.visible = false; return; }
      var w = V.size.w, h = V.size.h, s = slot, y0 = s.y - h / 2, y1 = s.y + h / 2, x0 = s.x - w / 2, x1 = s.x + w / 2;
      function proj(x, y) { var t = -(y - 0.004) / L[1]; return [x + L[0] * t, 0.004, s.z + L[2] * t]; }
      var A = proj(x0, y0), B = proj(x1, y0), C = proj(x1, y1), D = proj(x0, y1);
      var p = patchMesh.geometry.attributes.position.array, P = [A, B, C, A, C, D];
      for (var i = 0; i < 6; i++) { p[i * 3] = P[i][0]; p[i * 3 + 1] = P[i][1]; p[i * 3 + 2] = P[i][2]; }
      patchMesh.geometry.attributes.position.needsUpdate = true;
      var k = 2.2 * st.patch;
      patchMat.color.setRGB(k * st.tint[0], k * st.tint[1], k * st.tint[2]);
      if (!patchMat.map && patchTex) { patchMat.map = patchTex; patchMat.needsUpdate = true; }
    }

    // ---------------- 카메라 ----------------
    function aspect() { return App.camera.aspect || 1; }
    function frameCam() {
      if (!slot || !V.size) return;
      V.dist = GM.frameDistance(V.size.w, V.size.h, aspect(), FOV, 0.84);
    }
    function targetPose(zoom, px, py, out) {
      var s = slot, d = V.dist, rx = s.nz, rz = -s.nx;
      out.pos.set(s.x + s.nx * d + rx * px, s.y + py, s.z + s.nz * d + rz * px);
      out.fov = GM.zoomFov(FOV, zoom);
      out.look.set(out.pos.x - s.nx, out.pos.y, out.pos.z - s.nz);
      return out;
    }
    var poseA = { pos: new T.Vector3(), look: new T.Vector3(), fov: FOV }, poseB = { pos: new T.Vector3(), look: new T.Vector3(), fov: FOV };
    var qA = new T.Quaternion(), qB = new T.Quaternion(), m4 = new T.Matrix4();
    function quatLook(pos, look, out) { m4.lookAt(pos, look, upV); return out.setFromRotationMatrix(m4); }
    function startGlide(fromPos, fromQuat, fromFov, dur) {
      anim = { t: 0, dur: dur, p0: fromPos.clone(), q0: fromQuat.clone(), f0: fromFov };
      dirty = true; H.kick();
    }
    function applyCamera(dt) {
      var cam = App.camera;
      targetPose(V.zoom, V.panX, V.panY, poseB);
      if (anim) {
        anim.t += dt;
        var u = GM.easeInOut(anim.t / anim.dur);
        quatLook(poseB.pos, poseB.look, qB);
        cam.position.lerpVectors(anim.p0, poseB.pos, u);
        cam.quaternion.slerpQuaternions(anim.q0, qB, u);
        cam.fov = anim.f0 + (poseB.fov - anim.f0) * u;
        if (anim.t >= anim.dur) anim = null;
      } else {
        cam.position.copy(poseB.pos); quatLook(poseB.pos, poseB.look, cam.quaternion); cam.fov = poseB.fov;
      }
      cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    function updateZoomMax(rec) {
      if (!V.size || !rec) return;
      var vw = root.innerWidth || 360, vh = root.innerHeight || 640;
      var css = GM.windowCss(V.size.w, V.size.h, V.dist, FOV, vw, vh);
      V.zMax = GM.zoomMax([rec.w, rec.h], css, 8, 2);
      if (V.zoom > V.zMax) { V.zoom = V.zMax; clampPan(); }
    }
    function clampPan() {
      var hv = GM.halfVisible(V.dist, FOV, aspect(), V.zoom), c = GM.clampPan(V.panX, V.panY, V.size.w, V.size.h, hv);
      V.panX = c.x; V.panY = c.y;
    }
    function gesture(kind) {
      var now = performance.now();
      if (gestT[kind] && now - gestT[kind] < 1500) return;
      gestT[kind] = now;
      post({ e: 'viewGesture', kind: kind });
    }
    function onView(kind, o) {
      if (!V.active || !slot) return;
      var vh = root.innerHeight || 640, vw = root.innerWidth || 360;
      if (kind === 'pinch') {
        if (anim) { anim = null; }
        var z0 = V.zoom, z1 = GM.clamp(z0 * o.k, 1, V.zMax);
        if (z1 === z0) return;
        var hv0 = GM.halfVisible(V.dist, FOV, aspect(), z0), hv1 = GM.halfVisible(V.dist, FOV, aspect(), z1);
        var sx = (o.cx / vw) * 2 - 1, sy = -((o.cy / vh) * 2 - 1);
        var p = GM.pinchPan(V.panX, V.panY, sx, sy, hv0, hv1);
        V.zoom = z1; V.panX = p.x; V.panY = p.y; clampPan();
        V.zoomPeak = Math.max(V.zoomPeak, V.zoom);
        gesture('zoom');
      } else if (kind === 'pan') {
        if (V.zoom <= 1.02) return;
        var hv = GM.halfVisible(V.dist, FOV, aspect(), V.zoom), kpx = 2 * hv.hy / vh;
        V.panX -= o.dx * kpx; V.panY += o.dy * kpx; clampPan();
        V.panned = true;
        gesture('pan');
      } else if (kind === 'dtap') { api.resetView(); return; } else return;
      dirty = true; H.kick();
    }

    // ---------------- 프레임 ----------------
    function hideAvatars(on) {
      if (on) {
        App.scene.children.forEach(function (o) { if (o.userData && o.userData.avatar && o.visible) { o.visible = false; hidden.push(o); } });
      } else { hidden.forEach(function (o) { o.visible = true; }); hidden.length = 0; }
    }
    // main.js loop 가 감상 중에 부른다. 반환: 다음 프레임도 필요한가
    V.frame = function (dt) {
      if (V.parked) return false;
      if (!V.active) return false;
      perfBusy += dt;
      hideAvatars(true);
      if (fade) { fade.t += dt; glassMat.uniforms.uMix.value = Math.min(1, fade.t / FADE); }
      if (glassMat) glassMat.uniforms.uSelfTone.value = App.R.tier === 'high' && root.ThreeX && root.ThreeX.EffectComposer ? 0 : 1;
      applyCamera(dt);
      if (App.world) { App.world.setSkyCenter(App.camera.position); App.R.setExposure(App.world.env.exp); }   // 하늘·해 스프라이트는 카메라를 따라간다(안 하면 원점에 남아 창을 가린다)
      App.R.render(App.scene, App.camera, dt, App.world);
      V.stats.frames++; perfFrames++;
      if (fade && fade.t >= FADE) { endFade(); dirty = true; }
      else dirty = false;
      if (!readyPosted && V.readyRec && glassMat && glassMat.uniforms.uMapA.value) {
        readyPosted = true; enterT = performance.now();
        post({ e: 'viewReady', win: V.win, tier: V.readyRec.tier, ms: Math.round(performance.now() - t0) });
      }
      return !!(anim || fade || dirty);
    };
    V.idle = function () { return !(anim || fade || dirty); };

    // ---------------- 들어가기·나가기 ----------------
    function savePrev() {
      if (prev) return;
      var me = App.me, c = App.ctl, cam = App.camera;
      prev = { church: App.started && App.world && !App.world.builder.viewing ? App.church : null,
        me: me ? { x: me.x, z: me.z, y: me.y, yaw: me.yaw, mode: me.mode, seat: me.seat } : null,
        ctl: c ? { yaw: c.yaw, pitch: c.pitch, look: c.look, zoom: c.zoom } : null,
        cam: cam ? { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov } : null,
        camPos: App.camPos.clone(), camLook: App.camLook.clone(), autoTier: App.R ? App.R.autoTier : true };
    }
    function startPerf() {
      if (perfTimer) return;
      perfFrames = 0; perfBusy = 0;
      perfTimer = setInterval(function () {
        if (!V.active) return;
        var fps = perfBusy > 0.05 ? Math.round(perfFrames / Math.max(perfBusy, 1e-3)) : 0;
        post({ e: 'viewPerf', win: V.win, fps: fps, texMb: Math.round(sumMb() * 10) / 10 });
        perfFrames = 0; perfBusy = 0;
      }, 5000);
    }
    function stopPerf() { if (perfTimer) { clearInterval(perfTimer); perfTimer = null; } }

    function enter(entry, o, tok) {
      var first = !V.active;
      V.entry = entry; V.size = GM.sizeOf(entry);
      var cam = App.camera, fromPos = cam.position.clone(), fromQuat = cam.quaternion.clone(), fromFov = cam.fov;
      // 이전 창 정리
      disposeMeshes(); disposeAllTex(); fade = null; V.readyRec = null; V.tierShown = null; readyPosted = false;
      V.zoom = 1; V.panX = V.panY = 0; V.zoomPeak = 1; V.panned = false; V.zMax = 8;
      if (first) { V.active = true; V.parked = false; startPerf(); if (App.R) { App.R.autoTier = false; } App.ctl.setViewMode(true); App.ctl.onView = onView; }
      if (App.markers && App.markers.holder) App.markers.holder.visible = false;
      if (V.mode === 'room') {
        V.params = { w: V.size.w, h: V.size.h, light: V.light, hour: V.hour };
        H.loadWorld('glass_room', { view: V.params });
        slot = App.world.viewSlot;
        App.world.setViewMode(true, App.renderer);
        buildMeshes(slot, V.size.w, V.size.h, true);
        frameCam();
        // 방 뒤쪽 조금 낮은 곳에서 창 앞으로 활강
        targetPose(1, 0, 0, poseA);
        if (first || !fromPos) {
          fromPos = new T.Vector3(slot.x + V.size.w * 0.12, Math.max(1.4, slot.y - V.size.h * 0.18), slot.z + V.dist * 1.35);
          fromQuat = quatLook(fromPos, new T.Vector3(slot.x, slot.y, slot.z), new T.Quaternion()); fromFov = 50;
        }
        startGlide(fromPos, fromQuat, fromFov, first ? GLIDE : GLIDE * 0.6);
      } else {
        // 지금 성당의 가장 가까운 창 자리(앞쪽에 있는 것)
        // G-29: 그 창이 이 성당의 제자리에 걸려 있으면 그 자리(판은 걸린 사진 판 4mm 앞). 아니면 앞쪽의 가장 가까운 창 자리.
        var slots = App.world.windowSlots(), me = App.me, best = null, bd = 1e9;
        var placed = App.place ? App.place.slotFor(V.win, me) : null;
        if (placed) { best = { x: placed.x + placed.nx * 0.004, y: placed.y, z: placed.z + placed.nz * 0.004, nx: placed.nx, nz: placed.nz, w: placed.w, h: placed.h }; slots = []; }
        slots.forEach(function (s) {
          var dx = me.x - s.x, dz = me.z - s.z, front = dx * s.nx + dz * s.nz;
          if (front < 0.3) return;
          var d = Math.hypot(dx, dz) + Math.abs(s.y - 1.6) * 0.5;
          if (d < bd) { bd = d; best = s; }
        });
        if (!best) { V.mode = 'room'; enter(entry, o, tok); return; }   // 앞에 창 자리가 없으면 감상실로
        var a = +entry.aspect_w_over_h || 1, w = best.w, h = best.h;
        if (a > w / h) h = w / a; else w = h * a;
        slot = { x: best.x, y: best.y, z: best.z, nx: best.nx, nz: best.nz, w: w, h: h };
        V.size = { w: w, h: h, status: 'slot' };
        App.world.setViewMode(true, App.renderer);
        buildMeshes(slot, w, h, false);
        frameCam();
        startGlide(fromPos, fromQuat, fromFov, GLIDE);
      }
      if (App.R) App.R.setProfile('view', { bloom: V.light === 'sun' });
      applyLight();
      H.resize();
      // 질감: t1 먼저, t2 가 요청이면 이어서(교차 페이드)
      var want = V.tierReq;
      // 번들에 2k 가 없으면(files['2k'].bundled === false, 앱 번들 정책) gpack_2k 가 없으므로 1k 만 쓴다. base(서버)를 주면 서버에 있을 수 있다.
      var f2 = entry.files && entry.files['2k'];
      if (want === 't2' && !V.base && f2 && f2.bundled === false) want = V.tierReq = 't1';
      var chain = fetchTier(V.win, want === 't2' ? 't1' : want, tok);
      if (want === 't2') chain = chain.then(function (r) { if (tok !== token || !r) return null; return fetchTier(V.win, 't2', tok); });
      chain.catch(function (e) { fail(reasonOf(e), tok); });
    }

    var api = {
      viewWindow: function (o) {
        o = o || {};
        var win = o.win;
        V.mode = o.mode === 'church' ? 'church' : 'room';
        V.light = o.light === 'sun' || o.light === 'night' ? o.light : 'ref';
        if (o.hour !== undefined && isFinite(+o.hour)) V.hour = +o.hour;
        if (typeof o.base === 'string') V.base = o.base;
        if (typeof win !== 'string' || !GM.ID_RE.test(win)) { post({ e: 'viewError', win: typeof win === 'string' ? win.slice(0, 40) : null, reason: 'unknown' }); return; }
        if (!App.started) H.start({ church: 'glass_room', quality: o.quality, hour: V.hour });
        if (!App.renderer) { post({ e: 'viewError', win: win, reason: 'webgl' }); return; }
        if (V.mode === 'church' && (!App.world || App.world.builder.viewing)) V.mode = 'room';
        V.tierReq = GM.selectTier(o.tier, capsOf());
        var tok = ++token;
        t0 = performance.now();
        if (!V.active) savePrev();
        V.win = win;
        loadCatalog().then(function (idx) {
          if (tok !== token) return;
          var entry = GM.lookup(idx, win);
          if (!entry) { fail('unknown', tok); return; }
          enter(entry, o, tok);
        }).catch(function (e) { fail(reasonOf(e), tok); });
      },
      endView: function () {
        if (!V.active) return;
        token++;
        var secs = readyPosted ? (performance.now() - enterT) / 1000 : 0;
        post({ e: 'viewEnd', win: V.win, seconds: Math.round(secs), zoomMax: Math.round(V.zoomPeak * 10) / 10, panned: !!V.panned });
        disposeMeshes(); disposeAllTex(); fade = null; anim = null;
        V.active = false; stopPerf();
        App.ctl.setViewMode(false); App.ctl.onView = null;
        if (App.R) { App.R.setProfile('walk'); App.R.autoTier = prev ? prev.autoTier : true; }
        hideAvatars(false);
        var p = prev; prev = null; slot = null;
        if (V.mode === 'room') {
          if (p && p.church) {
            H.loadWorld(p.church);
            restore(p);
          } else { V.parked = true; }   // 바로 감상으로 열린 경우: 방을 둔 채 그리지 않는다(다음 init/setChurch 가 깨운다)
        } else {
          App.world.setViewMode(false, App.renderer);
          if (App.markers && App.markers.holder) App.markers.holder.visible = true;
          restore(p);
        }
        H.resize();
        H.kick();
      },
      setViewLight: function (o) {
        o = o || {};
        if (o.light === 'ref' || o.light === 'sun' || o.light === 'night') V.light = o.light;
        if (o.hour !== undefined && isFinite(+o.hour)) V.hour = +o.hour;
        if (V.active) applyLight();
      },
      setViewTier: function (o) {
        var t = GM.selectTier(o && (o.tier || o), capsOf());
        V.tierReq = t;
        if (!V.active || !V.entry || V.tierShown === t) return;
        var tok = token;
        fetchTier(V.win, t, tok).catch(function (e) { fail(reasonOf(e), tok); });
      },
      resetView: function () {
        if (!V.active || !slot) return;
        var cam = App.camera;
        var p0 = cam.position.clone(), q0 = cam.quaternion.clone(), f0 = cam.fov;
        V.zoom = 1; V.panX = V.panY = 0;
        startGlide(p0, q0, f0, RESET);
        gesture('reset');
      }
    };
    function restore(p) {
      if (!p) return;
      var me = App.me;
      if (p.me && me) {
        me.x = p.me.x; me.z = p.me.z; me.y = p.me.y; me.yaw = p.me.yaw;
        if ((p.me.mode === 'seated' || p.me.mode === 'sitting') && p.me.seat && App.logic.seatPos(p.me.seat)) {
          var sp = App.logic.seatPos(p.me.seat);
          me.mode = 'seated'; me.seat = p.me.seat; me.x = sp.x; me.z = sp.z; me.yaw = sp.yaw;
          App.net.setMySeat(p.me.seat); App.meAv.setSeated(true);
        }
      }
      if (p.ctl) { App.ctl.yaw = p.ctl.yaw; App.ctl.pitch = p.ctl.pitch; App.ctl.look = p.ctl.look; App.ctl.zoom = p.ctl.zoom; }
      App.camPos.copy(p.camPos); App.camLook.copy(p.camLook); App.camInit = true;
      if (p.cam) { App.camera.position.copy(p.cam.pos); App.camera.quaternion.copy(p.cam.quat); }
    }
    // 화면 크기가 바뀌면 구도를 다시 잡는다
    V.onResize = function () {
      if (!V.active || !slot) return;
      frameCam(); clampPan();
      var cur = currentRec(); if (cur) updateZoomMax(cur);
      dirty = true;
    };
    V.unpark = function () { V.parked = false; };
    V.api = api;
    // 시험·디버그: __church.view.debug()
    V.debug = function () {
      return { active: V.active, mode: V.mode, win: V.win, tierShown: V.tierShown, tierReq: V.tierReq, zoom: V.zoom, zMax: V.zMax, panX: V.panX, panY: V.panY, dist: V.dist,
        size: V.size, slot: slot, idle: V.idle(), anim: !!anim, fade: !!fade, light: V.light, hour: V.hour, stats: JSON.parse(JSON.stringify(V.stats)), resident: texs.map(function (t) { return t.id + ':' + t.tier; }),
        passes: App.R && App.R.passes ? App.R.passes() : null };
    };
    V.setDebug = function (k) { if (glassMat) glassMat.uniforms.uDebug.value = k; if (glowMesh) glowMesh.visible = !k; dirty = true; H.kick(); };
    V.renderNow = function () { dirty = true; return V.frame(0); };
    V.meshes = function () { return { glass: glassMesh, glow: glowMesh, patch: patchMesh }; };
    // WebGL 문맥을 잃으면 알린다(감상 중이면)
    if (App.renderer && App.renderer.domElement) {
      App.renderer.domElement.addEventListener('webglcontextlost', function (e) {
        if (V.active) { post({ e: 'viewError', win: V.win, reason: 'webgl' }); token++; }
      });
    }
    return V;
  }

  root.ChurchGlassView = { create: create, FOV: FOV, shaders: { vs: GLASS_VS, fs: GLASS_FS }, loadPackImage: loadPackImage };
})(typeof window !== 'undefined' ? window : this);
