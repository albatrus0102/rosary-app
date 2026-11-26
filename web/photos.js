/* photos.js — 사진 질감(tex/<이름>.jpg, 법선 tex/<이름>_n.jpg)을 비동기로 읽어 three 질감에 꽂는다. kit.js 의 surf 가 쓴다.
   - 목록(RoomPhotos.LIST)에 있는 이름만 '있다'(has)고 답한다. 색 <이름>.jpg + 법선 _n + 거칠기 _r(PBR). 읽기 전·실패하면 절차 생성 대체 그림(fallbackCanvas)이 그대로 남는다(오프라인·파일 없음 안전).
   - 경로 바꾸기: 페이지에서 photos.js 앞에 window.RoomPhotoBase = '경로/' (기본 'tex/').
   - 칸 바꿔 끼우기(선택): window.RoomPhotoMap = { wood_floor: 'url', … } — 색 지도만 그 그림으로(법선·거칠기는 쓰지 않는다: 다른 그림의 결과 맞지 않으므로).
     못 읽으면 기본 tex/<이름>.jpg 로, 그것도 못 읽으면 절차 생성 그림으로 돌아간다(README 「질감 칸」).
   - 질감은 모두 CC0(ambientCG) — README 「라이선스」. 새 사진은 tex/ 에 넣고 LIST 에 이름을 더한다(1k 이하 JPG 권장, 이 패키지는 색 512·법선 256). */
(function (root) {
  'use strict';
  var T = root.THREE;
  var LIST = ['wood_floor', 'wood_dark', 'wood_light', 'plaster', 'stucco', 'paving', 'asphalt', 'grass', 'soil', 'concrete', 'cork', 'jute'];
  var idx = {};
  LIST.forEach(function (n) { idx[n] = 1; idx[n + '_n'] = 1; idx[n + '_r'] = 1; });
  function mapOf(n) { var M = root.RoomPhotoMap; return M && typeof M[n] === 'string' && M[n] ? M[n] : null; }
  var base = root.RoomPhotoBase || 'tex/', imgs = {}, waiting = 0, readyCbs = [];
  function flat(normal) {
    var c = document.createElement('canvas'); c.width = c.height = 4;
    var g = c.getContext('2d'); g.fillStyle = normal ? '#8080ff' : '#bbbbbb'; g.fillRect(0, 0, 4, 4);
    return c;
  }
  function load(name) {
    var r = imgs[name];
    if (r) return r;
    r = imgs[name] = { img: new Image(), ok: false, failed: false, cbs: [] };
    waiting++;
    var alt = mapOf(name);
    r.img.onload = function () { r.ok = true; waiting--; r.cbs.forEach(function (f) { f(); }); r.cbs = []; done(); };
    r.img.onerror = function () {
      if (alt) { alt = null; r.img.src = base + name + '.jpg'; return; }   // 바꿔 끼운 그림이 없으면 기본 사진으로
      r.failed = true; waiting--; r.cbs = []; done();
    };
    r.img.src = alt || base + name + '.jpg';
    return r;
  }
  function done() { if (waiting > 0) return; var c = readyCbs; readyCbs = []; c.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }
  var P = {
    LIST: LIST,
    has: function (name) { var m = /^(.*)_(n|r)$/.exec(name); if (m && mapOf(m[1])) return false; return !!idx[name]; },
    // get(name, {repeat:[rx,ry], enc:'srgb'|'linear', fallbackCanvas}) -> THREE.Texture (그림은 읽히면 바뀐다)
    get: function (name, o) {
      o = o || {};
      var lin = o.enc === 'linear' || /_n$|_r$/.test(name);
      var t = new T.Texture(o.fallbackCanvas || flat(/_n$/.test(name)));
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
      t.encoding = lin ? T.LinearEncoding : T.sRGBEncoding;
      if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
      t.needsUpdate = true; t.userData.photo = name;
      if (!idx[name]) return t;
      var r = load(name);
      function put() { t.dispose(); t.image = r.img; t.needsUpdate = true; }   // 크기가 바뀌므로 GPU 질감을 놓고 새로 올린다(WebGL2 고정 크기 저장소)
      if (r.ok) put(); else if (!r.failed) r.cbs.push(put);
      return t;
    },
    // 지금 읽는 중인 사진이 모두 끝나면(또는 ms 가 지나면) cb
    whenReady: function (cb, ms) {
      var fired = false; function f() { if (!fired) { fired = true; cb(); } }
      if (waiting <= 0) { f(); return; }
      readyCbs.push(f); setTimeout(f, ms || 3000);
    },
    pending: function () { return waiting; }
  };
  root.RoomPhotos = P;
})(typeof window !== 'undefined' ? window : this);
