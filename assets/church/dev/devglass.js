/* dev/devglass.js — 개발용 임시 유리(모든 성당 공용). docs/church/GLASS_DEV_PIPELINE.md
   ※ 이 폴더(assets/church/dev/)는 pubspec.yaml 의 assets 에 없다 → 일반(배포) APK 에 들어가지 않는다(tools/build_dev_apk.sh 만 임시로 넣는다).
   하는 일: 성당 빌더가 내보낸 창 개구부 anchor(ctx._.glassAnchors: key·위치·방향·크기) 위에, 대응표(dev/devglass_<church>.js)가 정한
   개발용 임시 시안 그림을 실내 쪽 판으로 건다. 진본 대응표(glass_placements.js)·카탈로그·창 정보 시트와는 완전히 따로다.
   켜지는 조건(셋 다): ① URL 에 devglass=1 (Flutter 는 --dart-define=ROSARIUM_DEV_GLASS=true 일 때만 붙인다)
                      ② 그 성당의 표와 그림 팩(dev/gpack_dev_<set>.js)이 실제로 있다 ③ 행의 release_approved 가 true 가 아니면 ①이 있어야만 건다.
   꺼져 있으면 아무것도 바꾸지 않는다(절차적 유리 그대로).
   구조: ChurchWorld.create 를 감싸서(world.js·main.js 는 고치지 않는다) 성당을 지은 직후 attach, world.update 에서 페이드·밤 밝기,
         world.dispose 직전에 판·질감·재질을 해제한다(stats.created/disposed 로 누수 확인).
   그리기: 긴 변 512px 이하 그림은 실행 중에 아틀라스 한 장으로 묶어 draw call 1, 그보다 큰 그림은 그림마다 1. 뒤판(어두운 납틀색) 1.
           판은 그림 비율 그대로(contain, 늘리지 않음). 재질은 사진 창과 같은 유리 셰이더(ChurchGlassView.shaders). */
(function (root, factory) {
  var DG = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = DG;
  root.ChurchDevGlass = DG;
})(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';
  var FRONT = 0.03, BACK = 0.018;          // 유리 평면에서 실내 쪽으로: 그림 판 3cm, 뒤판 1.8cm (메달리온 유리 1.2cm 보다 앞)
  var FADE = 0.25, NIGHT_K = 0.05, ATLAS_MAX = 512, GUT = 4, LEAD = 0x14100d;
  var tables = {}, packs = {};
  var stats = { created: 0, disposed: 0, meshes: 0, attaches: 0, clears: 0, errors: 0 };
  var cur = null;                          // 지금 붙어 있는 인스턴스(성당 하나)

  function register(t) { if (t && t.church) tables[t.church] = t; return t; }
  function enabled() { try { return /[?&]devglass=1(&|$)/.test((root.location && root.location.search) || ''); } catch (e) { return false; } }
  function packName(t) {
    var m = null;
    try { m = /[?&]devpack=([a-z0-9_]+)/.exec(root.location.search || ''); } catch (e) { /* ignore */ }
    return m && t.packs && t.packs[m[1]] ? m[1] : 'orig';
  }
  function packFile(t) { var n = packName(t); return (t.packs && t.packs[n]) || t.pack; }

  /* ---- 순수 계산(Node 시험: tools/church_web/devglass.test.mjs) ----
     plan(table, anchors, {dev, sizes}) → [{dev_id, anchor, status, why, certainty, rect?}]
       status: 'placed'(판을 건다) | 'qa'(성당 안에 걸지 않음: why 'unplaced' = anchor 없음, 'hold' = hang:false) | 'skipped'(걸려 했으나 못 건다: why)
       rect: {x, y, z(판 가운데), nx, nz, yawDeg, w, h, uv:[u0,v0,u1,v1], box:{w, y0, y1}, cover(상자를 덮는 비율), rest:'lead'|'glass', bx, bz(뒤판 가운데)} */
  function plan(table, anchors, o) {
    o = o || {};
    var by = {}, used = {}, out = [];
    (anchors || []).forEach(function (a) { by[a.key] = a; });
    (table.rows || []).forEach(function (r) {
      var res = { dev_id: r.dev_id, anchor: r.anchor || null, certainty: r.certainty || (r.anchor ? 'assumed' : 'unplaced'), status: 'qa', why: '' };
      out.push(res);
      if (!r.anchor) { res.why = 'unplaced'; return; }
      if (r.hang === false) { res.why = 'hold'; res.hold_ko = r.hold_ko || ''; return; }
      // 릴리스 차단(3겹 중 셋째): 승인되지 않은 행은 개발 플래그가 있어야만 건다
      if (r.release_approved !== true && !o.dev) { res.status = 'skipped'; res.why = 'not_release_approved'; return; }
      var a = by[r.anchor];
      if (!a) { res.status = 'skipped'; res.why = 'no_such_anchor'; return; }
      if (a.kind && a.kind !== 'glass') { res.status = 'skipped'; res.why = 'anchor_not_glass'; return; }
      if (used[r.anchor]) { res.status = 'skipped'; res.why = 'duplicate_anchor:' + used[r.anchor]; return; }
      var px = (o.sizes && o.sizes[r.texture]) || r.px;
      if (!px || !(px[0] > 0) || !(px[1] > 0)) { res.status = 'skipped'; res.why = 'no_texture_size'; return; }
      used[r.anchor] = r.dev_id;
      var y0 = a.sill, y1 = a.apex;
      if (r.region === 'above_photo' && a.photoH > 0) y0 = a.sill + a.photoH + 0.06;   // 진본 사진(아래)은 그대로 두고 그 위에만
      var bw = a.w, bh = y1 - y0, asp = px[0] / px[1], w, h, uv = [0, 0, 1, 1], al = r.align || 'top';
      if (r.fit === 'cover') {
        w = bw; h = bh;
        if (asp > bw / bh) { var ku = (bw / bh) / asp; uv[0] = (1 - ku) / 2; uv[2] = 1 - uv[0]; }
        else { var kv = asp / (bw / bh); if (al === 'top') uv[1] = 1 - kv; else if (al === 'bottom') uv[3] = kv; else { uv[1] = (1 - kv) / 2; uv[3] = 1 - uv[1]; } }
      } else if (asp > bw / bh) { w = bw; h = bw / asp; } else { w = bh * asp; h = bh; }
      var cy = al === 'top' ? y1 - h / 2 : (al === 'bottom' ? y0 + h / 2 : (y0 + y1) / 2);
      var cover = (w * h) / (bw * bh), rest = r.rest || (cover >= 0.75 ? 'lead' : 'glass');
      res.status = 'placed';
      res.rect = { x: a.x + a.nx * FRONT, y: cy, z: a.z + a.nz * FRONT, nx: a.nx, nz: a.nz, yawDeg: Math.atan2(a.nx, a.nz) * 180 / Math.PI,
        w: w, h: h, uv: uv, box: { w: bw, y0: y0, y1: y1 }, cover: cover, rest: rest, bx: a.x + a.nx * BACK, bz: a.z + a.nz * BACK, texture: r.texture, px: px };
    });
    return out;
  }
  function summary(pl) {
    var s = { total: pl.length, placed: 0, qa: 0, skipped: 0, confirmed: 0, probable: 0, assumed: 0, hold: 0 };
    pl.forEach(function (p) {
      s[p.status]++;
      if (p.status === 'placed') { if (p.certainty === 'assumed') s.assumed++; else if (p.certainty === 'probable') s.probable++; else s.confirmed++; }
      if (p.status === 'qa' && p.why === 'hold') s.hold++;
    });
    return s;
  }

  // 작은 그림 묶기(선반 채우기): items [{id, w, h}] → {w, h, at:{id:{x,y,w,h}}}. 사이마다 GUT*2 px 투명 여백(밉맵 번짐 막이)
  function packAtlas(items, maxW) {
    var list = items.slice().sort(function (a, b) { return b.h - a.h || (a.id < b.id ? -1 : 1); });
    var x = GUT, y = GUT, rowH = 0, W = 0, at = {};
    list.forEach(function (it) {
      if (x + it.w + GUT > maxW && x > GUT) { x = GUT; y += rowH + 2 * GUT; rowH = 0; }
      at[it.id] = { x: x, y: y, w: it.w, h: it.h };
      x += it.w + 2 * GUT; rowH = Math.max(rowH, it.h); W = Math.max(W, x - GUT);
    });
    function pot(v) { var p = 16; while (p < v) p *= 2; return p; }
    return { w: pot(W), h: pot(y + rowH + GUT), at: at };
  }

  /* ---- 여기부터 브라우저(THREE) ---- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { if (s.parentNode) s.parentNode.removeChild(s); res(); };
      s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('script ' + src)); };
      document.head.appendChild(s);
    });
  }
  var packFlight = {};
  function loadPack(t) {
    var f = packFile(t), P = root.ChurchDevGlassPack = root.ChurchDevGlassPack || {};
    if (packs[f]) return Promise.resolve(packs[f]);
    if (!packFlight[f]) {
      packFlight[f] = (P[f] ? Promise.resolve() : loadScript('dev/' + f)).then(function () {
        var p = P[f]; delete packFlight[f];
        if (!p || !p.images) throw new Error('dev pack ' + f);
        packs[f] = p; return p;
      }, function (e) { delete packFlight[f]; throw e; });
    }
    return packFlight[f];
  }
  function loadImg(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('img')); }; im.src = src; });
  }
  function post(o) { try { if (root.ChurchBridge) root.ChurchBridge.post(o); } catch (e) { /* ignore */ } }
  function badge(text) {
    // Flutter 안에서는 Flutter 가 배지를 그린다(lib/church/dev_glass.dart). 브라우저(test.html·캡처)에서만 DOM 배지.
    if (typeof document === 'undefined' || !document.body || !document.body.appendChild || (root.FlutterChurch && root.FlutterChurch.postMessage)) return;
    var el = document.getElementById('devglass-badge');
    if (!text) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'devglass-badge';
      el.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:5;padding:4px 12px;border-radius:999px;background:rgba(74,35,12,.86);color:#ffdcc2;font:600 12px/1.4 sans-serif;pointer-events:none;white-space:nowrap';
      document.body.appendChild(el);
    }
    el.textContent = text;
  }

  function attach(world, renderer) {
    var T = root.THREE, t = tables[world.id];
    var S_ = world.ctx && world.ctx._, anchors = (S_ && S_.glassAnchors) || [];
    var inst = { church: world.id, state: 'off', planned: [], meshes: [], textures: [], mats: [], token: {}, fade: 0, summary: null, pack: null, ms: 0 };
    if (!t || !enabled() || !root.ChurchGlassView || !renderer) { post({ e: 'devGlass', church: world.id, placed: 0, total: t ? t.rows.length : 0, on: 0 }); badge(null); return null; }
    stats.attaches++;
    inst.state = 'loading';
    inst.planned = plan(t, anchors, { dev: true });
    inst.summary = summary(inst.planned);
    var tok = inst.token, t0 = (root.performance && performance.now()) || 0;
    var caps = renderer.capabilities, tier = function () { return (root.__church && root.__church.R && root.__church.R.tier) || 'high'; };

    function tex(src) {
      var x = src.getContext ? new T.CanvasTexture(src) : new T.Texture(src);
      x.encoding = caps.isWebGL2 ? T.sRGBEncoding : T.LinearEncoding;
      x.generateMipmaps = true; x.minFilter = T.LinearMipmapLinearFilter; x.magFilter = T.LinearFilter;
      x.wrapS = x.wrapT = T.ClampToEdgeWrapping; x.premultiplyAlpha = false;
      x.anisotropy = tier() === 'low' ? Math.min(4, caps.getMaxAnisotropy()) : caps.getMaxAnisotropy();
      x.needsUpdate = true;
      inst.textures.push(x); stats.created++;
      return x;
    }
    function quads(list, uvOf, size) {
      var n = list.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = [], c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      list.forEach(function (q, i) {
        var s = size(q), rx = q.nz, rz = -q.nx, u = uvOf ? uvOf(q) : [0, 0, 1, 1];
        for (var k = 0; k < 4; k++) {
          pos[i * 12 + k * 3] = s.x + rx * s.w / 2 * c[k][0]; pos[i * 12 + k * 3 + 1] = s.y + s.h / 2 * c[k][1]; pos[i * 12 + k * 3 + 2] = s.z + rz * s.w / 2 * c[k][0];
          uv[i * 8 + k * 2] = c[k][0] > 0 ? u[2] : u[0]; uv[i * 8 + k * 2 + 1] = c[k][1] > 0 ? u[3] : u[1];
        }
        idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      });
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx);
      g.computeBoundingSphere();
      return g;
    }
    function glassMesh(list, map, uvOf, name) {
      var S = root.ChurchGlassView.shaders;
      var mat = new T.ShaderMaterial({
        uniforms: { uMapA: { value: map }, uMapB: { value: null }, uMix: { value: 0 }, uBias: { value: 0 }, uK: { value: 1 }, uTint: { value: new T.Vector3(1, 1, 1) }, uRefl: { value: new T.Vector3(0, 0, 0) },
          uDecode: { value: caps.isWebGL2 ? 0 : 1 }, uSelfTone: { value: 0 }, uDebug: { value: 0 }, uFade: { value: 0 } },
        vertexShader: S.vs, fragmentShader: S.fs, extensions: { derivatives: true },
        fog: false, lights: false, toneMapped: false, transparent: true, depthWrite: true,
        blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor,
        blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor
      });
      var m = new T.Mesh(quads(list, uvOf, function (q) { return q; }), mat);
      m.name = name; m.renderOrder = 5.5; m.frustumCulled = list.length < 2;
      m.userData.noAO = true; m.userData.devGlass = list.map(function (q) { return q.dev_id + '@' + q.anchor; });
      m.castShadow = false; m.receiveShadow = false;
      inst.meshes.push(m); inst.mats.push(mat); stats.meshes++;
      world.group.add(m);
      return m;
    }

    loadPack(t).then(function (pack) {
      if (tok.dead) return null;
      inst.pack = packFile(t);
      var want = inst.planned.filter(function (p) { return p.status === 'placed'; });
      // 팩에 없는 그림은 건너뛴다. 팩의 실제 크기로 다시 계산한다(고해상도로 바꿔 끼워도 표의 px 를 고칠 필요가 없다).
      var sizes = {};
      Object.keys(pack.images).forEach(function (k) { sizes[k] = [pack.images[k].w, pack.images[k].h]; });
      inst.planned = plan(t, anchors, { dev: true, sizes: sizes });
      inst.planned.forEach(function (p) { if (p.status === 'placed' && !pack.images[p.rect.texture]) { p.status = 'skipped'; p.why = 'not_in_pack'; delete p.rect; } });
      inst.summary = summary(inst.planned);
      want = inst.planned.filter(function (p) { return p.status === 'placed'; });
      var ids = []; want.forEach(function (p) { if (ids.indexOf(p.rect.texture) < 0) ids.push(p.rect.texture); });
      return Promise.all(ids.map(function (id) { return loadImg(pack.images[id].src).then(function (im) { return { id: id, im: im, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height }; }); })).then(function (imgs) {
        if (tok.dead) return;
        var list = want.map(function (p) { var q = p.rect; q.dev_id = p.dev_id; q.anchor = p.anchor; return q; });
        var small = imgs.filter(function (i) { return Math.max(i.w, i.h) <= ATLAS_MAX; }), big = imgs.filter(function (i) { return Math.max(i.w, i.h) > ATLAS_MAX; });
        // 뒤판(납틀색): 그림이 덮지 못한 곳이 '임시 그림은 여기까지'로 보이게. rest:'glass' 인 창은 뒤판 없이 기존 절차적 유리가 보인다.
        var leads = list.filter(function (q) { return q.rest === 'lead'; });
        if (leads.length) {
          var lm = new T.MeshBasicMaterial({ color: LEAD, fog: false });
          var lmesh = new T.Mesh(quads(leads, null, function (q) { return { x: q.bx, y: (q.box.y0 + q.box.y1) / 2, z: q.bz, w: q.box.w, h: q.box.y1 - q.box.y0 }; }), lm);
          lmesh.name = 'devglass-lead'; lmesh.frustumCulled = false; lmesh.userData.noAO = true; lmesh.castShadow = false; lmesh.receiveShadow = false; lmesh.visible = false;
          inst.meshes.push(lmesh); inst.mats.push(lm); inst.lead = lmesh; stats.meshes++;
          world.group.add(lmesh);
        }
        if (small.length) {
          var A = packAtlas(small, 2048), cv = document.createElement('canvas'); cv.width = A.w; cv.height = A.h;
          var g = cv.getContext('2d');
          small.forEach(function (i) { var r = A.at[i.id]; g.drawImage(i.im, r.x, r.y); });
          var ax = tex(cv), sm = {};
          small.forEach(function (i) { sm[i.id] = 1; });
          glassMesh(list.filter(function (q) { return sm[q.texture]; }), ax, function (q) {
            var r = A.at[q.texture], u = q.uv;
            return [(r.x + u[0] * r.w) / A.w, 1 - (r.y + (1 - u[1]) * r.h) / A.h, (r.x + u[2] * r.w) / A.w, 1 - (r.y + (1 - u[3]) * r.h) / A.h];
          }, 'devglass-atlas');
          inst.atlas = { w: A.w, h: A.h, n: small.length };
        }
        big.forEach(function (i) {
          glassMesh(list.filter(function (q) { return q.texture === i.id; }), tex(i.im), function (q) { return q.uv; }, 'devglass-' + i.id);
        });
        inst.state = 'fading'; inst.fade = 0; inst.ms = Math.round(((root.performance && performance.now()) || 0) - t0);
        var s = inst.summary;
        post({ e: 'devGlass', church: world.id, set: t.set || '', placed: s.placed, total: s.total, probable: s.probable, assumed: s.assumed, on: 1 });
        badge('개발용 임시 시안 · 실제 작품 아님 · ' + s.placed + '/' + s.total);
        if (root.console) console.log('[church] devglass ' + world.id + ' ' + JSON.stringify(s) + ' meshes ' + inst.meshes.length + ' ' + inst.ms + 'ms');
      });
    }).catch(function (e) {
      if (tok.dead) return;
      inst.state = 'error'; stats.errors++;
      post({ e: 'devGlass', church: world.id, placed: 0, total: t.rows.length, on: 0 });
      badge(null);
      if (root.console) console.warn('[church] devglass ' + world.id + ': ' + (e && e.message));
    });

    inst.update = function (dt) {
      if (inst.state !== 'fading' && inst.state !== 'ready') return;
      if (inst.state === 'fading') { inst.fade += dt; if (inst.fade >= FADE) inst.state = 'ready'; }
      var env = world.env, night = env && env.night ? env.night : 0, k = 1 + (NIGHT_K - 1) * night;
      var self = tier() !== 'low' && root.ThreeX && root.ThreeX.EffectComposer ? 0 : 1, f = inst.state === 'ready' ? 1 : Math.min(1, inst.fade / FADE);
      for (var i = 0; i < inst.mats.length; i++) {
        var m = inst.mats[i];
        if (!m.uniforms) continue;
        m.uniforms.uFade.value = f; m.uniforms.uK.value = k; m.uniforms.uSelfTone.value = self;
        m.blendSrcAlpha = self ? T.OneFactor : T.ZeroFactor;
        var r = 0.012 * night; m.uniforms.uRefl.value.set(r, r * 0.7, r * 0.45);
      }
      if (inst.lead) inst.lead.visible = f >= 0.5;
    };
    inst.clear = function () {
      if (tok.dead) return;
      tok.dead = true; stats.clears++;
      inst.meshes.forEach(function (m) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); });
      inst.mats.forEach(function (m) { m.dispose(); });
      inst.textures.forEach(function (x) { x.dispose(); stats.disposed++; });
      stats.meshes -= inst.meshes.length;
      inst.meshes = []; inst.mats = []; inst.textures = []; inst.lead = null; inst.state = 'gone';
      if (cur === inst) cur = null;
      badge(null);
    };
    cur = inst;
    return inst;
  }

  // world.js 를 고치지 않고 끼어든다: 성당을 지은 직후 attach, update·dispose 에 얹는다.
  function install() {
    var W = root.ChurchWorld;
    if (!W || W.__devGlass) return;
    var create = W.create;
    W.create = function (scene, opts) {
      var w = create.apply(this, arguments), inst = null;
      try { inst = attach(w, opts && opts.renderer); } catch (e) { stats.errors++; if (root.console) console.warn('[church] devglass attach', e); }
      if (inst) {
        var upd = w.update, disp = w.dispose;
        w.update = function (dt) { upd.apply(w, arguments); inst.update(dt); };
        w.dispose = function () { inst.clear(); disp.apply(w, arguments); };
        w.devGlass = inst;
      }
      return w;
    };
    W.__devGlass = true;
  }
  if (typeof document !== 'undefined' && root.ChurchWorld) install();

  return {
    register: register, tables: tables, enabled: enabled, plan: plan, summary: summary, packAtlas: packAtlas, install: install, stats: stats,
    FRONT: FRONT, BACK: BACK, ATLAS_MAX: ATLAS_MAX,
    current: function () { return cur; },
    debug: function () {
      return { enabled: enabled(), stats: JSON.parse(JSON.stringify(stats)), church: cur ? cur.church : null, state: cur ? cur.state : 'off', summary: cur ? cur.summary : null,
        pack: cur ? cur.pack : null, atlas: cur ? cur.atlas || null : null, meshes: cur ? cur.meshes.map(function (m) { return m.name; }) : [], ms: cur ? cur.ms : 0,
        rows: cur ? cur.planned.map(function (p) { return { dev_id: p.dev_id, anchor: p.anchor, status: p.status, why: p.why, certainty: p.certainty, rect: p.rect ? { x: p.rect.x, y: p.rect.y, z: p.rect.z, yawDeg: p.rect.yawDeg, w: p.rect.w, h: p.rect.h, cover: p.rect.cover, rest: p.rect.rest } : null }; }) : [] };
    }
  };
});
