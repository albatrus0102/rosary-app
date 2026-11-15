/* glass_place.js — G-29 성당 안 진본 창: 걸어 다니는 성당의 창 자리(world.glassSlots())에 사진 창을 건다.
   ChurchGlassPlace.create(App, H) -> P.  H = {post(o)}
   - (2026-11-15, PERF_SCALE.md §3) 창 스트리밍: 창이 성당마다 수십 개로 늘어도 버티도록 두 층으로 그린다(규칙은 glass_stream.js).
     · 먼 창: 입장 때 gpack_far_<성당>.js(창마다 긴 변 256px 사본) 한 파일을 읽어 아틀라스 한 장에 모으고, 모든 자리를 한 지오메트리로 그린다(draw call 1).
     · 가까운 창: 화면에 크게 보일 수 있는 창만 1k 질감(gpack_<id>_1k.js)을 올린다. 동시 상주 수·MB 는 화질 단계별 상한, 넘치면 LRU 해제.
       판단은 '거리 기준 크기'라 고개만 돌릴 때는 읽기·업로드가 없다. 디코드는 메인 스레드 밖(createImageBitmap), 업로드는 프레임당 1장.
     · ?gstream=0: 예전 방식(입장 때 창 id 마다 1k 를 모두 올림, 먼 층 없음) — 비교·시험용.
     · ?gstress=N: 스트레스 시험용 가짜 창 N개(측랑 벽을 따라, 서로 다른 질감 id)를 더한다(PERF_SCALE.md §5).
   - 처음엔 빌더가 만든 절차적 유리가 보이고, 질감이 오면 0.25초 교차 페이드로 그 앞 1.2cm 에 사진 판이 덮인다.
     못 읽으면 아무것도 하지 않는다(절차적 유리 그대로 = 안전한 폴백). 성당을 바꾸면 모두 해제한다.
   - 재질은 감상 모드와 같은 유리 셰이더(ChurchGlassView.shaders): 조명·안개·SSAO·그림자 없음, 알파 0 표시로 최종 패스의 색보정·톤매핑을 건너뛴다
     → 걷기('walk') 프로필에서도 화면 값 = 사진 값. 밤에는 투과량을 낮춘다(바깥 빛이 없으므로).
   - 같은 사진을 쓰는 자리는 한 지오메트리로 합친다(창 id 당 draw call 1).
   - 가까이(시야 안 + 거리)·탭: {e:'glassNear', id|null, slot} / {e:'glassTap', id, slot} (SPEC §27). */
(function (root) {
  'use strict';
  var T = root.THREE, GM = root.ChurchGlassMath, GS = root.ChurchGlassStream;
  var FADE = 0.25, NEAR_EVERY = 0.25, NIGHT_K = 0.08, PLAN_EVERY = 0.25;
  var QS = (root.location && root.location.search) || '';
  var LEGACY = /[?&]gstream=0/.test(QS) || !GS;
  var PHOTOK_Q = (function () { var m = /[?&]photok=([0-9.]+)/.exec(QS); return m ? +m[1] : 0; })();   // 시험용: 밝기 이득 고정(1 = 사진 값 그대로)
  var STRESS0 = (function () { var m = /[?&]gstress=(\d+)/.exec(QS); return m ? Math.min(400, +m[1]) : 0; })();

  function create(App, H) {
    var post = H.post, STRESS = STRESS0;
    var groups = [], slots = [], token = 0, pending = 0, nearCur = null, nearT = 0, lastNearId, planT = 0;
    var stats = { created: 0, disposed: 0, resident: 0, texMb: 0, loads: 0, errors: 0, farMb: 0, uploads: 0, evicted: 0, decodeMs: 0, uploadMsMax: 0 };
    var far = null;                 // {state, tex, mesh, mat, rects, mb, fade, slotOf}
    var decoding = 0, upQ = [], church = null, lastEvict = null;
    var vDir = new T.Vector3(), vTo = new T.Vector3(), ray = new T.Raycaster(), vN = new T.Vector2();

    function count() {
      var n = 0, mb = 0;
      groups.forEach(function (g) { if (g.tex) { n++; mb += g.mb; } });
      stats.resident = n; stats.texMb = Math.round((mb + (far && far.tex ? far.mb : 0)) * 10) / 10; stats.farMb = far && far.tex ? Math.round(far.mb * 10) / 10 : 0;
    }
    function caps() { return App.renderer.capabilities; }
    function tier() { return App.R && App.R.tier ? App.R.tier : 'high'; }

    function glassMaterial(tex) {
      var S = root.ChurchGlassView.shaders;
      return new T.ShaderMaterial({
        uniforms: { uMapA: { value: tex }, uMapB: { value: null }, uMix: { value: 0 }, uBias: { value: 0 }, uK: { value: 1 }, uTint: { value: new T.Vector3(1, 1, 1) }, uRefl: { value: new T.Vector3(0, 0, 0) },
          uDecode: { value: caps().isWebGL2 ? 0 : 1 }, uSelfTone: { value: 0 }, uDebug: { value: 0 }, uFade: { value: 0 }, uGain: { value: 1 } },
        vertexShader: S.vs, fragmentShader: S.fs, extensions: { derivatives: true },
        fog: false, lights: false, toneMapped: false, transparent: true, depthWrite: true,
        blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
        blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor
      });
    }
    // 자리들 → 사각형 판 지오메트리. uvOf(s) 가 [u0,v0,u1,v1] 을 주면 그 칸(아틀라스)으로, 없으면 0..1.
    function quadGeo(list, uvOf) {
      var n = list.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [];
      list.forEach(function (s, i) {
        var rx = s.nz, rz = -s.nx, hw = s.w / 2, hh = s.h / 2, o = i * 12, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]], r = uvOf ? uvOf(s) : [0, 0, 1, 1];
        for (var k = 0; k < 4; k++) {
          pos[o + k * 3] = s.x + rx * hw * c[k][0]; pos[o + k * 3 + 1] = s.y + hh * c[k][1]; pos[o + k * 3 + 2] = s.z + rz * hw * c[k][0];
          uv[i * 8 + k * 2] = c[k][0] > 0 ? r[2] : r[0]; uv[i * 8 + k * 2 + 1] = c[k][1] > 0 ? r[3] : r[1];
        }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      });
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      return geo;
    }
    function buildMesh(g) {
      var mat = glassMaterial(g.tex);
      // 먼 층(같은 자리, renderOrder 5.5) 위에 그린다: 같은 평면이라 깊이 차이를 조금 당긴다
      if (far) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1; }
      var mesh = new T.Mesh(quadGeo(g.slots), mat);
      // 투명 대기열에서 빛줄기·먼지·빛 번짐(renderOrder ≤ 5) 뒤, 불꽃(6)·표식(7)·이름표(8) 앞에 그린다:
      // 창 앞을 지나는 빛줄기(가산 혼합)가 사진 색을 물들이거나 알파 표시(톤매핑 건너뛰기)를 흐리지 않게. 불투명한 것(기둥·등·아바타)은 깊이로 가린다.
      mesh.renderOrder = 5.5;
      if (far) mesh.renderOrder = 5.6;   // 가까운 창은 먼 층 바로 뒤(위)에
      mesh.userData.noAO = true; mesh.userData.glassPlace = g.win; mesh.castShadow = false; mesh.receiveShadow = false;
      g.mesh = mesh; g.mat = mat;
      App.world.group.add(mesh);
    }
    function setTexParams(tex, flip) {
      var c = caps();
      tex.encoding = c.isWebGL2 ? T.sRGBEncoding : T.LinearEncoding;
      tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
      tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.premultiplyAlpha = false; tex.flipY = flip;
      // 이방성: 비스듬히 보는 창(측랑·드럼)이 흐려지지 않게. 간단 모드(low)는 4배까지만(약한 GPU 의 표본 수를 줄인다, 밉맵은 그대로라 반짝임은 없다).
      tex.anisotropy = tier() === 'low' ? Math.min(4, c.getMaxAnisotropy()) : c.getMaxAnisotropy();
    }
    function upload(img, bitmap) {
      var tex = new T.Texture(img);
      setTexParams(tex, !bitmap);
      tex.userData.w = img.naturalWidth || img.width; tex.userData.h = img.naturalHeight || img.height;   // 닫은 뒤에도 크기(메모리 추정)
      tex.needsUpdate = true;
      var gl = App.renderer.getContext();
      gl.getError();
      var t0 = performance.now();
      App.renderer.initTexture(tex);
      stats.uploadMsMax = Math.max(stats.uploadMsMax, Math.round((performance.now() - t0) * 10) / 10);
      if (gl.getError() === gl.OUT_OF_MEMORY) { tex.dispose(); throw new Error('memory'); }
      // 올린 뒤에는 CPU 쪽 그림을 놓는다(ImageBitmap 은 바로 닫는다; 질감은 다시 올릴 일이 없다)
      if (bitmap && img.close) { try { img.close(); } catch (e) { /* ignore */ } }
      return tex;
    }

    function disposeNear(g) {
      if (g.mesh) { if (g.mesh.parent) g.mesh.parent.remove(g.mesh); g.mesh.geometry.dispose(); g.mat.dispose(); g.mesh = null; g.mat = null; }
      if (g.tex) { g.tex.dispose(); g.tex = null; stats.disposed++; }
      g.near = g.near === 'error' ? 'error' : 'none'; g.tok = (g.tok || 0) + 1;
    }
    function disposeGroup(g) { disposeNear(g); g.state = 'gone'; }
    function disposeFar() {
      if (!far) return;
      if (far.mesh) { if (far.mesh.parent) far.mesh.parent.remove(far.mesh); far.mesh.geometry.dispose(); far.mat.dispose(); }
      if (far.tex) { far.tex.dispose(); stats.disposed++; }
      far = null;
    }
    // 사진이 다 덮이면 그 자리의 절차적 대역(비둘기 조형 등)과 앞을 가리는 빛 번짐을 끈다
    function settle(g) {
      if (g.settled) return;
      g.settled = true;
      g.slots.forEach(function (s) {
        (s.fallback || []).forEach(function (m) { m.visible = false; });
        (s.glows || []).forEach(function (e) { e.kind = 'none'; if (e.sp) e.sp.visible = false; });
      });
    }
    function groupState(g) {
      if (g.near === 'ready') return g.fade >= FADE ? 'ready' : 'fading';
      if (far && far.state === 'ready' && far.rects[g.win]) return far.fade >= FADE ? 'ready' : 'fading';
      if (g.near === 'error' && (!far || far.state !== 'loading')) return 'error';
      if (!LEGACY && far && far.state !== 'loading' && !far.rects[g.win] && g.near === 'none') return 'idle';
      return 'loading';
    }

    function clear() {
      token++;
      groups.forEach(disposeGroup);
      disposeFar();
      groups = []; slots = []; pending = 0; nearCur = null; upQ = []; decoding = 0; church = null;
      count();
      if (lastNearId) { lastNearId = null; post({ e: 'glassNear', id: null }); }
    }

    // 스트레스 시험(?gstress=N): 측랑 쪽 벽을 따라 가짜 창 자리 N개. 그림은 실제 창(src)을 돌려 쓰지만 질감 id 는 모두 다르다.
    function stressSlots(world, real) {
      var srcs = []; real.forEach(function (s) { if (srcs.indexOf(s.win) < 0) srcs.push(s.win); });
      if (!srcs.length) srcs = ['dove_stpeter', 'alabaster_stpaul_1', 'oculus_florence_donatello', 'milan_apse_lower'];
      var B = world.layout.bounds, cb = world.cameraBounds || B, out = [], per = Math.ceil(STRESS / 2), XW = Math.min(-cb.x0, cb.x1) - 0.3;   // 카메라가 갈 수 있는 벽 안쪽
      for (var k = 0; k < STRESS; k++) {
        var side = k % 2 ? 1 : -1, i = Math.floor(k / 2), z = B.z1 - 4 - (B.z1 - B.z0 - 8) * (per > 1 ? i / (per - 1) : 0.5);
        var src = srcs[k % srcs.length];
        out.push({ win: 'stress_' + k, src: src, slot: 'stress', index: k, shape: 'rect', x: side * XW, y: 4.2, z: z, nx: -side, nz: 0, w: 1.4, h: 2.8 });
      }
      return out;
    }

    // 성당을 지은 직후(main.js loadWorld). 감상실이면 아무것도 걸지 않는다.
    function load(world) {
      clear();
      if (!world || world.builder.viewing || !world.glassSlots || !root.ChurchGlassView) return;
      slots = world.glassSlots();
      if (STRESS) slots = slots.concat(stressSlots(world, slots));
      if (!slots.length) return;
      church = world.id;
      var by = {}, tok = token;
      slots.forEach(function (s) {
        if (!GM.ID_RE.test(s.win)) return;
        var g = by[s.win];
        if (!g) { g = by[s.win] = { id: s.win, win: s.win, src: s.src || s.win, slots: [], state: 'loading', near: 'none', fade: 0, tex: null, mesh: null, mat: null, mb: 0, used: 0, tok: 0 }; groups.push(g); }
        s.group = g; g.slots.push(s);
      });
      if (LEGACY) { groups.forEach(function (g) { startNear(g, tok); }); return; }
      loadFar(world.id, tok);
    }

    // ---- 먼 층: 성당 팩 하나 → 아틀라스 한 장 ----
    function loadFar(id, tok) {
      far = { state: 'loading', tex: null, mesh: null, mat: null, rects: {}, mb: 0, fade: 0 };
      var key = 'far_' + id, P = root.ChurchGlassPack = root.ChurchGlassPack || {}, t0 = performance.now();
      pending++;
      (P[key] ? Promise.resolve() : GS.loadScript('gpack_far_' + id + '.js')).then(function () {
        var pack = P[key]; delete P[key];
        if (!pack) throw new Error('far pack');
        var items = [];
        groups.forEach(function (g) { if (pack[g.src] && items.every(function (it) { return it.id !== g.win; })) items.push({ id: g.win, src: g.src }); });
        if (!items.length) throw new Error('far pack empty');
        var dec = {};
        return Promise.all(items.map(function (it) {
          if (dec[it.src]) return dec[it.src].then(function (o) { it.img = o.img; });
          dec[it.src] = GS.decodeUri(pack[it.src], false);
          return dec[it.src].then(function (o) { it.img = o.img; });
        })).then(function () { return items; });
      }).then(function (items) {
        if (tok !== token) return;
        var cell = GS.budget(tier()).cell, gl2 = caps().isWebGL2;
        items.forEach(function (it) { it.aspect = (it.img.width || 1) / (it.img.height || 1); });
        var L = GS.layoutAtlas(items, cell, { pot: !gl2, cols: Math.min(8, Math.max(1, Math.ceil(Math.sqrt(items.length)))) });
        var cv = document.createElement('canvas'); cv.width = L.w; cv.height = L.h;
        var g2 = cv.getContext('2d'); g2.imageSmoothingQuality = 'high';
        items.forEach(function (it) { var r = L.rects[it.id]; g2.drawImage(it.img, r.x, r.y, r.w, r.h); });
        items.forEach(function (it) { if (it.img.close) { try { it.img.close(); } catch (e) { /* ignore */ } } });
        var tex = new T.CanvasTexture(cv);
        setTexParams(tex, true);
        tex.userData.w = L.w; tex.userData.h = L.h;
        App.renderer.initTexture(tex);
        cv.width = cv.height = 1;   // 올린 뒤 CPU 쪽 캔버스를 놓는다
        far.tex = tex; far.mb = GS.texMb(L.w, L.h); far.rects = L.rects; stats.created++;
        var list = slots.filter(function (s) { return s.group && L.rects[s.group.win]; });
        far.list = list;
        var mat = glassMaterial(tex), mesh = new T.Mesh(quadGeo(list, function (s) { var r = L.rects[s.group.win]; return [r.u0, r.v0, r.u1, r.v1]; }), mat);
        mesh.renderOrder = 5.5; mesh.userData.noAO = true; mesh.userData.glassPlace = 'far'; mesh.castShadow = false; mesh.receiveShadow = false;
        list.forEach(function (s, i) { s.farIdx = i; });
        far.mesh = mesh; far.mat = mat; far.state = 'fading'; far.fade = 0; far.ms = Math.round(performance.now() - t0);
        App.world.group.add(mesh);
        pending--; count();
      }).catch(function (e) {
        if (tok !== token) return;
        far.state = 'error'; pending--;
        if (root.console) console.warn('[church] glass far ' + id + ': ' + (e && e.message));
      });
    }
    // 먼 층에서 그룹의 자리들을 숨기거나(가까운 질감이 다 덮었을 때) 되살린다
    function farShow(g, on) {
      if (!far || !far.mesh || g.farHidden === !on) return;
      g.farHidden = !on;
      var pos = far.mesh.geometry.attributes.position;
      g.slots.forEach(function (s) {
        if (s.farIdx === undefined) return;
        var o = s.farIdx * 12, rx = s.nz, rz = -s.nx, hw = s.w / 2, hh = s.h / 2, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (var k = 0; k < 4; k++) {
          pos.array[o + k * 3] = on ? s.x + rx * hw * c[k][0] : s.x; pos.array[o + k * 3 + 1] = on ? s.y + hh * c[k][1] : s.y; pos.array[o + k * 3 + 2] = on ? s.z + rz * hw * c[k][0] : s.z;
        }
      });
      pos.needsUpdate = true;
    }

    // ---- 가까운 층: 창 id 당 1k 질감 ----
    function startNear(g, tok) {
      if (g.near !== 'none') return;
      g.near = 'loading'; g.tok++; pending++; stats.loads++; decoding++;
      var my = g.tok, t0 = performance.now(), key = GM.packKey(g.src, 't1'), P = root.ChurchGlassPack = root.ChurchGlassPack || {};
      (P[key] ? Promise.resolve() : GS.loadScript(GM.packFile(g.src, 't1'))).then(function () {
        var uri = P[key]; delete P[key];
        if (!uri) throw new Error('texture');
        return LEGACY ? decodeLegacy(uri) : GS.decodeUri(uri, true);
      }).then(function (o) {
        decoding--;
        if (tok !== token || my !== g.tok) { if (o.img.close) o.img.close(); return; }
        stats.decodeMs = Math.max(stats.decodeMs, Math.round(performance.now() - t0));
        g.t0 = t0;
        upQ.push({ g: g, o: o, tok: my });
        if (LEGACY) flushUploads(99);
      }).catch(function (e) {
        decoding--;
        if (tok !== token || my !== g.tok) return;
        g.near = 'error'; g.state = 'error'; stats.errors++; pending--;
        if (root.console) console.warn('[church] glass place ' + g.win + ': ' + (e && e.message));
      });
    }
    function decodeLegacy(uri) {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res({ img: img, bitmap: false }); }; img.onerror = function () { rej(new Error('texture')); };
        img.src = uri;
      }).then(function (o) { return o.img.decode ? o.img.decode().then(function () { return o; }, function () { return o; }) : o; });
    }
    // 업로드는 프레임당 n장(기본 1): 큰 질감 여러 장이 한 프레임에 몰려 튀지 않게
    function flushUploads(n) {
      while (n-- > 0 && upQ.length) {
        var q = upQ.shift(), g = q.g;
        if (q.tok !== g.tok) { if (q.o.img.close) q.o.img.close(); continue; }
        try {
          g.tex = upload(q.o.img, q.o.bitmap);
        } catch (e) {
          g.near = 'error'; stats.errors++; pending--; continue;
        }
        g.mb = GM.texMb(q.o.img.naturalWidth || q.o.img.width || g.tex.image.width, q.o.img.naturalHeight || q.o.img.height || g.tex.image.height);
        if (!(g.mb > 0)) g.mb = 3;
        stats.created++; stats.uploads++;
        buildMesh(g);
        g.near = 'ready'; g.fade = 0; g.ms = Math.round(performance.now() - g.t0); g.used = performance.now();
        pending--; count();
      }
    }

    // 스트리밍 판단(0.25초마다): 원하는 창 읽기 시작·넘치는 질감 해제
    function plan(cam) {
      if (LEGACY || !groups.length) return;
      var rr = App.renderer, hpx = rr.domElement.height || 800, fov = (cam.fov || 60) * Math.PI / 180;
      cam.getWorldDirection(vDir);
      var view = { cam: { x: cam.position.x, y: cam.position.y, z: cam.position.z, dir: [vDir.x, vDir.y, vDir.z], cosHalf: Math.cos(Math.min(1.4, fov * 0.5 * Math.max(1, cam.aspect || 1)) + 0.15) },
        focal: hpx / (2 * Math.tan(fov / 2)), cell: far && far.state !== 'error' ? GS.budget(tier()).cell : 0 };
      var bud = GS.budget(tier());
      var r = GS.plan(groups, view, bud);
      if (r.evict.length) lastEvict = { evict: r.evict.slice(), want: r.want.slice(), res: groups.filter(function (g) { return g.near === 'ready' || g.near === 'loading'; }).map(function (g) { return g.win + ':' + g.near + ':' + Math.round(g.mb * 10) / 10; }) };
      var now = performance.now();
      r.want.forEach(function (id) { var g = byId(id); if (g && g.near === 'ready') g.used = now; });
      r.evict.forEach(function (id) {
        var g = byId(id);
        if (!g) return;
        farShow(g, true);
        if (g.near === 'loading') pending--;
        disposeNear(g); stats.evicted++;
      });
      for (var i = 0; i < r.load.length && decoding < 1; i++) startNear(byId(r.load[i]), token);
      count();
    }
    function byId(id) { for (var i = 0; i < groups.length; i++) if (groups[i].win === id) return groups[i]; return null; }

    function nearLimit(s) { return Math.max(4.5, s.y * 0.9 + s.h * 0.5); }
    function findNear(me, cam) {
      cam.getWorldDirection(vDir);
      var best = null, bs = -1e9;
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (!s.group || s.group.state !== 'ready' || s.src) continue;   // 스트레스 시험 자리는 알리지 않는다
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

    function tuneMat(mat, k, self, night, win) {
      var u = mat.uniforms, env = App.world && App.world.env, pw = env && env.photoWin && win ? env.photoWin[win] : 0;
      u.uK.value = k; u.uSelfTone.value = self;
      if (u.uGain) u.uGain.value = PHOTOK_Q || (env && env.photoK ? env.photoK : 1) * (pw || 1);   // looks.js photoK · photoWin
      // 후처리가 없을 때(low)는 캔버스에 바로 그린다: 알파 0 표시가 캔버스 알파로 남지 않게 보통 알파 합성으로 바꾼다
      mat.blendSrcAlpha = self ? T.OneFactor : T.ZeroFactor;
      var r = 0.012 * night; u.uRefl.value.set(r, r * 0.7, r * 0.45);
    }
    // 매 프레임(main.js loop, 걷기 중)
    function update(dt, me, cam) {
      if (!groups.length) return;
      flushUploads(1);
      var env = App.world && App.world.env, night = env && env.night ? env.night : 0;
      var k = 1 + (NIGHT_K - 1) * night, self = App.R.tier !== 'low' && root.ThreeX && root.ThreeX.EffectComposer ? 0 : 1;
      if (far && far.mat) {
        if (far.state === 'fading') { far.fade += dt; if (far.fade >= FADE) { far.state = 'ready'; groups.forEach(function (g) { if (far.rects[g.win]) settle(g); }); } }
        far.mat.uniforms.uFade.value = far.state === 'ready' ? 1 : Math.min(1, far.fade / FADE);
        tuneMat(far.mat, k, self, night);
      }
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.mat) {
          if (g.near === 'ready' && g.fade < FADE) { g.fade += dt; if (g.fade >= FADE) { settle(g); farShow(g, false); } }
          g.mat.uniforms.uFade.value = Math.min(1, g.fade / FADE);
          tuneMat(g.mat, k, self, night, g.win);
        }
        g.state = groupState(g);
      }
      planT += dt;
      if (cam && planT >= PLAN_EVERY) { planT = 0; plan(cam); }
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
        if (!s.group || s.group.state !== 'ready' || s.src) continue;
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
      // 개발자 스위치(성능 표시의 '창 55 스트레스'): 다음 load 부터 가짜 창 n개를 더한다
      setStress: function (n) { STRESS = Math.max(0, Math.min(400, n | 0)); },
      load: load, clear: clear, update: update, pick: pick, tap: tap, slotFor: slotFor, stats: stats,
      slots: function () { return slots; },
      // 걷기 카메라 거리 비율(0..1). 지금 보고 있는 창 자리가 camMax(미터)를 정했으면 D 를 그만큼으로 줄인다. 아니면 1.
      camReach: function (D) { return nearCur && nearCur.camMax > 0 && D > 0 ? Math.min(1, nearCur.camMax / D) : 1; },
      // 시험용: 지금 카메라로 스트리밍 판단을 바로 한 번 한다(헤드리스 도구가 프레임을 몰아 돌릴 때)
      plan: function () { if (App.camera) plan(App.camera); },
      // 시험용(glassplace.mjs 색 측정): 그 창의 1k 를 판단 없이 올린다. 업로드는 update() 가 한다 → Promise(가까운 층 상태)
      prefetch: function (win) {
        var g = byId(win);
        if (!g || LEGACY) return Promise.resolve(g ? g.near : 'none');
        if (g.near === 'none') startNear(g, token);
        return new Promise(function (res) {
          (function poll() { if (g.near === 'ready' || g.near === 'error' || g.state === 'gone') res(g.near); else { flushUploads(1); setTimeout(poll, 50); } })();
        });
      },
      debug: function () {
        return { pending: pending, decoding: decoding, upQ: upQ.length, lastEvict: lastEvict, near: lastNearId || null, stats: JSON.parse(JSON.stringify(stats)), slots: slots.length, legacy: LEGACY, stress: STRESS,
          far: far ? { state: far.state, mb: Math.round(far.mb * 10) / 10, n: Object.keys(far.rects).length, ms: far.ms || 0 } : null,
          groups: groups.map(function (g) { return { win: g.win, state: g.state, near: g.near, slots: g.slots.length, ms: g.ms || 0, mb: Math.round(g.mb * 10) / 10 }; }) };
      },
      // 시험용: 유리 화소만 흰색으로(윤곽 측정)
      setDebug: function (k) { if (far && far.mat) far.mat.uniforms.uDebug.value = k; groups.forEach(function (g) { if (g.mat) g.mat.uniforms.uDebug.value = k; }); }
    };
  }

  root.ChurchGlassPlace = { create: create, FADE: FADE };
})(typeof window !== 'undefined' ? window : this);
