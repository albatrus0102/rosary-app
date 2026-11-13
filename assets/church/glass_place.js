/* glass_place.js — G-29 성당 안 진본 창: 걸어 다니는 성당의 창 자리(world.glassSlots())에 사진 창을 건다.
   ChurchGlassPlace.create(App, H) -> P.  H = {post(o)}
   - 성당에 들어오면(loadWorld) 그 성당 대응표(glass_placements.js)의 창만 비동기로 읽는다(gpack_<id>_1k.js → 1k 질감, 창 id 당 1장).
     처음엔 빌더가 만든 절차적 유리가 보이고, 질감이 오면 0.25초 교차 페이드로 그 앞 1.2cm 에 사진 판이 덮인다.
     못 읽으면 아무것도 하지 않는다(절차적 유리 그대로 = 안전한 폴백). 성당을 바꾸면 모두 해제한다.
   - 재질은 감상 모드와 같은 유리 셰이더(ChurchGlassView.shaders): 조명·안개·SSAO·그림자 없음, 알파 0 표시로 최종 패스의 색보정·톤매핑을 건너뛴다
     → 걷기('walk') 프로필에서도 화면 값 = 사진 값. 밤에는 투과량을 낮춘다(바깥 빛이 없으므로).
   - 같은 사진을 쓰는 자리는 한 지오메트리로 합친다(창 id 당 draw call 1).
   - 가까이(시야 안 + 거리)·탭: {e:'glassNear', id|null, slot} / {e:'glassTap', id, slot} (SPEC §27). */
(function (root) {
  'use strict';
  var T = root.THREE, GM = root.ChurchGlassMath;
  var FADE = 0.25, NEAR_EVERY = 0.25, NIGHT_K = 0.05;

  function create(App, H) {
    var post = H.post;
    var groups = [], slots = [], token = 0, pending = 0, nearCur = null, nearT = 0, lastNearId;
    var stats = { created: 0, disposed: 0, resident: 0, texMb: 0, loads: 0, errors: 0 };
    var vDir = new T.Vector3(), vTo = new T.Vector3(), ray = new T.Raycaster(), vN = new T.Vector2();

    function count() { var n = 0, mb = 0; groups.forEach(function (g) { if (g.tex) { n++; mb += g.mb; } }); stats.resident = n; stats.texMb = Math.round(mb * 10) / 10; }

    function buildMesh(g) {
      var S = root.ChurchGlassView.shaders, caps = App.renderer.capabilities, n = g.slots.length;
      var pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [];
      g.slots.forEach(function (s, i) {
        var rx = s.nz, rz = -s.nx, hw = s.w / 2, hh = s.h / 2, o = i * 12, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (var k = 0; k < 4; k++) {
          pos[o + k * 3] = s.x + rx * hw * c[k][0]; pos[o + k * 3 + 1] = s.y + hh * c[k][1]; pos[o + k * 3 + 2] = s.z + rz * hw * c[k][0];
          uv[i * 8 + k * 2] = c[k][0] > 0 ? 1 : 0; uv[i * 8 + k * 2 + 1] = c[k][1] > 0 ? 1 : 0;
        }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      });
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      var mat = new T.ShaderMaterial({
        uniforms: { uMapA: { value: g.tex }, uMapB: { value: null }, uMix: { value: 0 }, uBias: { value: 0 }, uK: { value: 1 }, uTint: { value: new T.Vector3(1, 1, 1) }, uRefl: { value: new T.Vector3(0, 0, 0) },
          uDecode: { value: caps.isWebGL2 ? 0 : 1 }, uSelfTone: { value: 0 }, uDebug: { value: 0 }, uFade: { value: 0 } },
        vertexShader: S.vs, fragmentShader: S.fs, extensions: { derivatives: true },
        fog: false, lights: false, toneMapped: false, transparent: true, depthWrite: true,
        blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
        blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor
      });
      var mesh = new T.Mesh(geo, mat);
      // 투명 대기열에서 빛줄기·먼지·빛 번짐(renderOrder ≤ 5) 뒤, 불꽃(6)·표식(7)·이름표(8) 앞에 그린다:
      // 창 앞을 지나는 빛줄기(가산 혼합)가 사진 색을 물들이거나 알파 표시(톤매핑 건너뛰기)를 흐리지 않게. 불투명한 것(기둥·등·아바타)은 깊이로 가린다.
      mesh.renderOrder = 5.5;
      mesh.userData.noAO = true; mesh.userData.glassPlace = g.win; mesh.castShadow = false; mesh.receiveShadow = false;
      g.mesh = mesh; g.mat = mat;
      App.world.group.add(mesh);
    }

    function upload(img) {
      var caps = App.renderer.capabilities, tex = new T.Texture(img);
      tex.encoding = caps.isWebGL2 ? T.sRGBEncoding : T.LinearEncoding;
      tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
      tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.premultiplyAlpha = false;
      // 이방성: 비스듬히 보는 창(측랑·드럼)이 흐려지지 않게. 간단 모드(low)는 4배까지만(약한 GPU 의 표본 수를 줄인다, 밉맵은 그대로라 반짝임은 없다).
      tex.anisotropy = App.R.tier === 'low' ? Math.min(4, caps.getMaxAnisotropy()) : caps.getMaxAnisotropy();
      tex.needsUpdate = true;
      var gl = App.renderer.getContext();
      gl.getError();
      App.renderer.initTexture(tex);
      if (gl.getError() === gl.OUT_OF_MEMORY) { tex.dispose(); throw new Error('memory'); }
      return tex;
    }

    function disposeGroup(g) {
      if (g.mesh) { if (g.mesh.parent) g.mesh.parent.remove(g.mesh); g.mesh.geometry.dispose(); g.mat.dispose(); g.mesh = null; g.mat = null; }
      if (g.tex) { g.tex.dispose(); g.tex = null; stats.disposed++; }
      g.state = 'gone';
    }
    // 사진이 다 덮이면 그 자리의 절차적 대역(비둘기 조형 등)과 앞을 가리는 빛 번짐을 끈다
    function settle(g) {
      g.slots.forEach(function (s) {
        (s.fallback || []).forEach(function (m) { m.visible = false; });
        (s.glows || []).forEach(function (e) { e.kind = 'none'; if (e.sp) e.sp.visible = false; });
      });
    }

    function clear() {
      token++;
      groups.forEach(disposeGroup);
      groups = []; slots = []; pending = 0; nearCur = null;
      count();
      if (lastNearId) { lastNearId = null; post({ e: 'glassNear', id: null }); }
    }

    // 성당을 지은 직후(main.js loadWorld). 감상실이면 아무것도 걸지 않는다.
    function load(world) {
      clear();
      if (!world || world.builder.viewing || !world.glassSlots || !root.ChurchGlassView) return;
      slots = world.glassSlots();
      if (!slots.length) return;
      var by = {}, tok = token;
      slots.forEach(function (s) {
        if (!GM.ID_RE.test(s.win)) return;
        var g = by[s.win];
        if (!g) { g = by[s.win] = { win: s.win, slots: [], state: 'loading', fade: 0, tex: null, mesh: null, mat: null, mb: 0 }; groups.push(g); }
        s.group = g; g.slots.push(s);
      });
      groups.forEach(function (g) {
        pending++; stats.loads++;
        var t0 = performance.now();
        root.ChurchGlassView.loadPackImage(g.win, 't1').then(function (img) {
          if (img.decode) return img.decode().catch(function () { /* 이미 디코드 */ }).then(function () { return img; });
          return img;
        }).then(function (img) {
          if (tok !== token) return;
          g.tex = upload(img);
          g.mb = GM.texMb(img.naturalWidth || img.width, img.naturalHeight || img.height);
          stats.created++;
          buildMesh(g);
          g.state = 'fading'; g.fade = 0; g.ms = Math.round(performance.now() - t0);
          pending--; count();
        }).catch(function (e) {
          if (tok !== token) return;
          g.state = 'error'; stats.errors++; pending--;
          if (root.console) console.warn('[church] glass place ' + g.win + ': ' + (e && e.message));
        });
      });
    }

    function nearLimit(s) { return Math.max(4.5, s.y * 0.9 + s.h * 0.5); }
    function findNear(me, cam) {
      cam.getWorldDirection(vDir);
      var best = null, bs = -1e9;
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (!s.group || s.group.state !== 'ready') continue;
        var dx = me.x - s.x, dz = me.z - s.z, front = dx * s.nx + dz * s.nz;
        if (front < 0.2) continue;
        var cur = s === nearCur, d = Math.hypot(dx, dz), lim = nearLimit(s) * (cur ? 1.25 : 1);
        if (d > lim) continue;
        vTo.set(s.x - cam.position.x, s.y - cam.position.y, s.z - cam.position.z);
        var dot = vTo.dot(vDir) / (vTo.length() || 1);
        if (dot < (cur ? 0.45 : 0.64)) continue;
        var score = dot - 0.3 * d / lim + (cur ? 0.12 : 0);
        if (score > bs) { bs = score; best = s; }
      }
      return best;
    }

    // 매 프레임(main.js loop, 걷기 중)
    function update(dt, me, cam) {
      if (!groups.length) return;
      var env = App.world && App.world.env, night = env && env.night ? env.night : 0;
      var k = 1 + (NIGHT_K - 1) * night, self = App.R.tier === 'high' && root.ThreeX && root.ThreeX.EffectComposer ? 0 : 1;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (!g.mat) continue;
        var u = g.mat.uniforms;
        if (g.state === 'fading') { g.fade += dt; if (g.fade >= FADE) { g.state = 'ready'; settle(g); } }
        u.uFade.value = g.state === 'ready' ? 1 : Math.min(1, g.fade / FADE);
        u.uK.value = k; u.uSelfTone.value = self;
        // 후처리가 없을 때(low)는 캔버스에 바로 그린다: 알파 0 표시가 캔버스 알파로 남지 않게 보통 알파 합성으로 바꾼다
        g.mat.blendSrcAlpha = self ? T.OneFactor : T.ZeroFactor;
        var r = 0.012 * night; u.uRefl.value.set(r, r * 0.7, r * 0.45);
      }
      nearT += dt;
      if (nearT >= NEAR_EVERY && me && cam) {
        nearT = 0;
        var s = me.mode === 'walk' ? findNear(me, cam) : null;
        nearCur = s;
        var id = s ? s.win : null;
        if (id !== lastNearId) { lastNearId = id; post(s ? { e: 'glassNear', id: id, slot: s.slot } : { e: 'glassNear', id: null }); }
      }
    }

    // 화면 좌표(NDC)로 사진 창을 고른다. 가장 가까운 창 자리 또는 null.
    function pick(nx, ny, cam) {
      if (!slots.length) return null;
      vN.set(nx, ny); ray.setFromCamera(vN, cam);
      var o = ray.ray.origin, d = ray.ray.direction, best = null, bt = 1e9;
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (!s.group || s.group.state !== 'ready') continue;
        var den = d.x * s.nx + d.z * s.nz;
        if (den > -1e-4) continue;                       // 뒤에서 보거나 평행
        var t = ((s.x - o.x) * s.nx + (s.z - o.z) * s.nz) / den;
        if (t <= 0 || t >= bt || t > 120) continue;
        var px = o.x + d.x * t - s.x, py = o.y + d.y * t - s.y, pz = o.z + d.z * t - s.z;
        var a = (px * s.nz - pz * s.nx) / (s.w / 2), b = py / (s.h / 2);
        var hit = s.shape === 'circle' || s.shape === 'ellipse' ? a * a + b * b <= 1 : (Math.abs(a) <= 1 && Math.abs(b) <= 1);
        if (hit) { bt = t; best = s; }
      }
      return best;
    }
    function tap(nx, ny, cam) {
      var s = pick(nx, ny, cam);
      if (!s) return false;
      post({ e: 'glassTap', id: s.win, slot: s.slot });
      return true;
    }
    // 'church' 감상 모드: 그 창이 걸린 자리 중 나와 가장 가까운 것
    function slotFor(win, me) {
      var best = null, bd = 1e9;
      slots.forEach(function (s) {
        if (s.win !== win) return;
        var d = Math.hypot(me.x - s.x, me.z - s.z);
        if (d < bd) { bd = d; best = s; }
      });
      return best;
    }

    return {
      load: load, clear: clear, update: update, pick: pick, tap: tap, slotFor: slotFor, stats: stats,
      slots: function () { return slots; },
      // 걷기 카메라 거리 비율(0..1). 지금 보고 있는 창 자리가 camMax(미터)를 정했으면 D 를 그만큼으로 줄인다. 아니면 1.
      camReach: function (D) { return nearCur && nearCur.camMax > 0 && D > 0 ? Math.min(1, nearCur.camMax / D) : 1; },
      debug: function () {
        return { pending: pending, near: lastNearId || null, stats: JSON.parse(JSON.stringify(stats)), slots: slots.length,
          groups: groups.map(function (g) { return { win: g.win, state: g.state, slots: g.slots.length, ms: g.ms || 0, mb: Math.round(g.mb * 10) / 10 }; }) };
      },
      // 시험용: 유리 화소만 흰색으로(윤곽 측정)
      setDebug: function (k) { groups.forEach(function (g) { if (g.mat) g.mat.uniforms.uDebug.value = k; }); }
    };
  }

  root.ChurchGlassPlace = { create: create, FADE: FADE };
})(typeof window !== 'undefined' ? window : this);
