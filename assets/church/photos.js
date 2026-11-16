/* photos.js — 사진 질감 로더. tex_pack.js / tex_pack_<id>.js 의 data URI 에서 읽는다(없으면 절차 생성 대체).
   ChurchPhotos.get(name, {enc:'srgb'|'linear'}) -> THREE.Texture (즉시 반환, 그림은 비동기로 교체된다). name 예: 'marble_white', 'marble_white_n', 'marble_white_r' */
(function (root) {
  'use strict';
  var T = root.THREE;
  var pending = 0, listeners = [];

  function pack() { return root.ChurchTexPack || {}; }
  function fileOf(name) { return 'tex_' + name + '.jpg'; }
  function has(name) { return !!pack()[fileOf(name)]; }

  function placeholder(kind) {
    var c = document.createElement('canvas'); c.width = c.height = 2;
    var g = c.getContext('2d');
    g.fillStyle = kind === 'n' ? '#8080ff' : (kind === 'r' ? '#ffffff' : '#9a9690');
    g.fillRect(0, 0, 2, 2);
    return c;
  }
  function done() { pending--; if (pending <= 0) { var l = listeners.slice(); listeners.length = 0; l.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); } }

  var imgs = {};   // file -> {img|null, texs:[]}
  function entry(name) {
    var f = fileOf(name);
    if (imgs[f]) return imgs[f];
    var e = imgs[f] = { img: null, texs: [] };
    var url = pack()[f];
    if (url) {
      pending++;
      var img = new Image();
      img.onload = function () { e.img = img; e.texs.forEach(function (t) { t.image = img; t.needsUpdate = true; t.userData.loaded = true; }); if (e.after) e.after.splice(0).forEach(function (f) { try { f(); } catch (er) { /* ignore */ } }); done(); };
      img.onerror = function () { done(); };
      img.src = url;
    }
    return e;
  }
  // fallbackCanvas: 사진이 없을 때 쓸 절차 생성 캔버스(선택). o.repeat=[rx,ry]. 호출마다 새 Texture(그림은 공유).
  function get(name, o) {
    o = o || {};
    var kind = /_n$/.test(name) ? 'n' : (/_r$/.test(name) ? 'r' : 'c');
    var e = entry(name);
    var tex = new T.Texture(e.img || o.fallbackCanvas || placeholder(kind));
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.anisotropy = 8;
    tex.encoding = (o.enc === 'linear' || kind !== 'c') ? T.LinearEncoding : T.sRGBEncoding;
    if (o.repeat) tex.repeat.set(o.repeat[0], o.repeat[1]);
    tex.needsUpdate = true;
    tex.userData.photo = name;
    if (e.img) tex.userData.loaded = true; else e.texs.push(tex);
    return tex;
  }
  // 사진 + 회색조 데칼(줄눈 등)을 곱해 한 장으로 합친 질감(2026-11-16, ChatGPT 줄눈 데칼). 같은 (사진, 데칼) 쌍은 캔버스 한 장을 공유하고,
  // 두 그림이 다 읽히면 캔버스로 바꿔 끼운다(그 전엔 사진만 보인다). 원본 사진은 GPU 에 올라가지 않는 한 메모리를 쓰지 않는다.
  var comps = {};
  function getDecal(name, decal, o) {
    o = o || {};
    var key = name + '*' + decal, c = comps[key], ea = entry(name), eb = entry(decal);
    var tex = get(name, o);
    if (!c) {
      c = comps[key] = { canvas: null, texs: [] };
      var build = function () {
        if (c.canvas || !ea.img || !eb.img) return;
        try {
          var cv = document.createElement('canvas'); cv.width = ea.img.width; cv.height = ea.img.height;
          var g = cv.getContext('2d'); g.drawImage(ea.img, 0, 0);
          g.globalCompositeOperation = 'multiply'; g.drawImage(eb.img, 0, 0, cv.width, cv.height);
          c.canvas = cv;
          c.texs.forEach(function (t) { t.image = cv; t.needsUpdate = true; });
        } catch (er) { /* 합성 실패: 사진만 */ }
      };
      c.build = build;
      if (ea.img && eb.img) build(); else { (ea.after = ea.after || []).push(build); (eb.after = eb.after || []).push(build); }
    }
    if (c.canvas) { tex.image = c.canvas; tex.needsUpdate = true; } else c.texs.push(tex);
    return tex;
  }
  function whenReady(fn, timeoutMs) {
    if (pending <= 0) { fn(); return; }
    var called = false;
    function go() { if (!called) { called = true; fn(); } }
    listeners.push(go);
    setTimeout(go, timeoutMs || 3000);
  }
  root.ChurchPhotos = { get: get, getDecal: getDecal, has: has, whenReady: whenReady, pending: function () { return pending; }, names: function () { return Object.keys(pack()).map(function (f) { return f.replace(/^tex_/, '').replace(/\.jpg$/, ''); }); } };
})(typeof window !== 'undefined' ? window : this);
