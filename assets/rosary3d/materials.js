/* materials.js — 묵주 재질(PBR, MeshPhysicalMaterial)과 절차적 텍스처(캔버스로 그린 나뭇결·진주 미세 요철·벨벳·금속 결).
   외부 이미지 없이 만든다(라이선스·용량·file:// 텍스처 제약을 피한다). 텍스처는 묵주마다 한 번만 만들어 모든 알이 나눠 쓴다.
   RosaryMaterials = { create(renderer, quality) → { get(name), backdrop(theme), dispose() } } */
(function (root) {
  'use strict';
  var T = root.THREE;

  // ---- 3D 값 노이즈(주기 없는 해시) ----
  function hash(x, y, z) { var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise3(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    function L(a, b, t) { return a + (b - a) * t; }
    return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
             L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  }
  function fbm3(x, y, z, oct) { var a = 0.5, f = 1, s = 0; for (var i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // 나뭇결: 구 UV(u = 둘레, v = 극→극)를 원기둥 좌표로 돌려 u 방향으로 이음매 없이 감기게 한다.
  // pal: [밝은 바탕, 중간, 어두운 결] (sRGB 0..255), seed 로 묵주(알·십자가)마다 무늬를 달리한다.
  function woodCanvases(size, pal, seed, flat) {
    var c = canvas(size, size), b = canvas(size, size), r = canvas(size, size);
    var cx = c.getContext('2d'), bx = b.getContext('2d'), rx = r.getContext('2d');
    var ci = cx.createImageData(size, size), bi = bx.createImageData(size, size), ri = rx.createImageData(size, size);
    for (var j = 0; j < size; j++) {
      for (var i = 0; i < size; i++) {
        var u = i / size, v = j / size, px, py, pz;
        if (flat) { px = u * 3.0; py = 0; pz = v * 3.0; }
        else { px = Math.cos(u * 2 * Math.PI) * 0.9; py = Math.sin(u * 2 * Math.PI) * 0.9; pz = v * 2.6; }
        var w1 = fbm3(px * 0.9 + seed, py * 0.9, pz * 0.5, 4);
        var w2 = fbm3(px * 2.3, py * 2.3 + seed, pz * 1.2, 3);
        var g = pz * 1.5 + px * 0.5 + 3.4 * w1;
        var g2 = pz * 2.2 - py * 0.4 + 2.2 * w2 + 1.3 * w1;
        var thick = 2.2 + 5 * fbm3(px * 1.7 + 3, py * 1.7, pz * 0.9 + seed, 2);   // 결 굵기가 곳곳에서 달라진다
        var streak = Math.pow(1 - Math.abs(Math.sin(g * 2.4)), thick) * 0.95 + Math.pow(1 - Math.abs(Math.sin(g2 * 4.1)), 16) * 0.45;
        var broad = smooth(Math.min(1, Math.max(0, fbm3(px * 0.8 + 9, py * 0.8, pz * 0.45 + seed, 3) * 1.9 - 0.62)));
        var fiber = fbm3(px * 26, py * 26, pz * 2.4 + seed, 2);          // 결 방향 섬유
        var dark = Math.min(1, streak * 0.75 + broad * 0.6 + (fiber - 0.5) * 0.2 + 0.08);
        var t1 = Math.max(0, Math.min(1, dark));
        var R = t1 < 0.5 ? mix(pal[0][0], pal[1][0], t1 * 2) : mix(pal[1][0], pal[2][0], (t1 - 0.5) * 2);
        var G = t1 < 0.5 ? mix(pal[0][1], pal[1][1], t1 * 2) : mix(pal[1][1], pal[2][1], (t1 - 0.5) * 2);
        var B = t1 < 0.5 ? mix(pal[0][2], pal[1][2], t1 * 2) : mix(pal[1][2], pal[2][2], (t1 - 0.5) * 2);
        var k = (j * size + i) * 4;
        ci.data[k] = R; ci.data[k + 1] = G; ci.data[k + 2] = B; ci.data[k + 3] = 255;
        var hgt = 200 - streak * 70 - (fiber - 0.5) * 60;               // 결은 살짝 패여 있다
        bi.data[k] = bi.data[k + 1] = bi.data[k + 2] = Math.max(0, Math.min(255, hgt)); bi.data[k + 3] = 255;
        var rough = 150 + streak * 50 + (fiber - 0.5) * 40;             // 결 안쪽은 덜 반들거린다
        ri.data[k] = ri.data[k + 1] = ri.data[k + 2] = Math.max(0, Math.min(255, rough)); ri.data[k + 3] = 255;
      }
    }
    cx.putImageData(ci, 0, 0); bx.putImageData(bi, 0, 0); rx.putImageData(ri, 0, 0);
    return { color: c, bump: b, rough: r };
  }

  function noiseCanvas(size, scale, oct, lo, hi, seed) {
    var c = canvas(size, size), x = c.getContext('2d'), im = x.createImageData(size, size);
    for (var j = 0; j < size; j++) for (var i = 0; i < size; i++) {
      var u = i / size, a = u * 2 * Math.PI;
      var n = fbm3(Math.cos(a) * scale, Math.sin(a) * scale, (j / size) * scale * 2 + seed, oct);
      var v = Math.max(0, Math.min(255, mix(lo, hi, n))), k = (j * size + i) * 4;
      im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); return c;
  }

  // 벨벳 천 바탕: 가운데가 조금 밝은 비네트 + 고운 천 결.
  function velvetCanvas(size, base) {
    var c = canvas(size, size), x = c.getContext('2d'), im = x.createImageData(size, size);
    for (var j = 0; j < size; j++) for (var i = 0; i < size; i++) {
      var dx = i / size - 0.5, dy = j / size - 0.46, d = Math.sqrt(dx * dx * 1.3 + dy * dy);
      var vig = 1.12 - 0.85 * smooth(Math.min(1, d * 1.55));
      var fab = 0.94 + 0.12 * fbm3(i * 0.9, j * 0.9, 3, 2) + 0.05 * fbm3(i * 0.05, j * 0.05, 7, 3);
      var k = (j * size + i) * 4;
      im.data[k] = Math.min(255, base[0] * vig * fab); im.data[k + 1] = Math.min(255, base[1] * vig * fab); im.data[k + 2] = Math.min(255, base[2] * vig * fab); im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); return c;
  }

  function create(renderer, quality) {
    var low = quality === 'low';
    var aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    var made = {}, textures = [];
    function tex(cv, srgb, repeat) {
      var t = new T.CanvasTexture(cv);
      if (srgb) t.encoding = T.sRGBEncoding;
      t.anisotropy = aniso; t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping;
      if (repeat) { t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); }
      textures.push(t); return t;
    }
    var TS = low ? 256 : 512;
    var BUILD = {
      oliveWood: function () {
        var w = woodCanvases(TS, [[214, 172, 110], [150, 98, 50], [66, 38, 18]], 1.7, false);
        return new T.MeshPhysicalMaterial({ map: tex(w.color, true), bumpMap: tex(w.bump), bumpScale: 0.006, roughnessMap: tex(w.rough), roughness: 0.55,
          metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.38, sheen: 0.15, sheenRoughness: 0.6, sheenColor: new T.Color(0xffe2b8), envMapIntensity: 0.9 });
      },
      oliveWoodDark: function () {
        var w = woodCanvases(TS, [[188, 146, 92], [128, 84, 44], [58, 34, 16]], 4.2, true);
        return new T.MeshPhysicalMaterial({ map: tex(w.color, true), bumpMap: tex(w.bump), bumpScale: 0.01, roughnessMap: tex(w.rough), roughness: 0.6,
          metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.85 });
      },
      cordBrown: function () {
        // 꼬인 끈: 사선 줄무늬 범프
        var c = canvas(64, 64), x = c.getContext('2d');
        x.fillStyle = '#888'; x.fillRect(0, 0, 64, 64);
        for (var i = -64; i < 128; i += 10) { x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, 64); x.stroke(); }
        var t = tex(c, false); t.wrapT = T.RepeatWrapping; t.repeat.set(1, 6);
        return new T.MeshPhysicalMaterial({ color: 0x4a2c18, roughness: 0.8, bumpMap: t, bumpScale: 0.006, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new T.Color(0x9c7454), envMapIntensity: 0.6 });
      },
      pearl: function () {
        var n = noiseCanvas(low ? 128 : 256, 6, 4, 90, 170, 3.3);
        return new T.MeshPhysicalMaterial({ color: 0xc9b99d, roughness: 0.16, metalness: 0.05, bumpMap: tex(n), bumpScale: 0.003,
          clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.0, sheenRoughness: 0.3, sheenColor: new T.Color(0xf6d8d0),
          iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [320, 680], envMapIntensity: 1.5, specularIntensity: 1 });
      },
      crystalBlue: function () {
        return new T.MeshPhysicalMaterial({ color: 0xd6e6ff, metalness: 0, roughness: 0.02, transmission: 1, ior: 1.6, thickness: 1.1,
          attenuationColor: new T.Color(0x2c6cf0), attenuationDistance: 0.85, specularIntensity: 1, specularColor: new T.Color(0xffffff),
          envMapIntensity: 2.4, flatShading: true, clearcoat: 0.6, clearcoatRoughness: 0.02 });
      },
      gold: function () {
        var n = noiseCanvas(128, 14, 3, 80, 140, 5.1);
        return new T.MeshPhysicalMaterial({ color: 0xe8bd6a, metalness: 1, roughness: 0.26, roughnessMap: tex(n, false, 2), envMapIntensity: 1.25, clearcoat: 0.2, clearcoatRoughness: 0.2 });
      },
      goldBright: function () { return new T.MeshPhysicalMaterial({ color: 0xf0c978, metalness: 1, roughness: 0.2, envMapIntensity: 1.35 }); },
      silver: function () {
        var n = noiseCanvas(128, 16, 3, 70, 130, 8.4);
        return new T.MeshPhysicalMaterial({ color: 0xe4e6ea, metalness: 1, roughness: 0.18, roughnessMap: tex(n, false, 2), envMapIntensity: 1.3 });
      },
      antiqueSilver: function () {
        var n = noiseCanvas(128, 10, 4, 90, 200, 2.2);
        return new T.MeshPhysicalMaterial({ color: 0xa9a59c, metalness: 1, roughness: 0.42, roughnessMap: tex(n, false, 2), envMapIntensity: 1.0 });
      }
    };
    function get(name) { if (!made[name]) made[name] = (BUILD[name] || BUILD.silver)(); return made[name]; }
    var BACK = { navy: [30, 40, 66], black: [22, 21, 24], ivory: [226, 214, 192] };
    var backMat = null;
    function backdrop(theme) {
      var base = BACK[theme] || BACK.navy;
      if (!backMat) backMat = new T.MeshPhysicalMaterial({ roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.55, envMapIntensity: 0.35 });
      if (backMat.map) backMat.map.dispose();
      backMat.map = tex(velvetCanvas(low ? 256 : 512, base), true);
      backMat.sheenColor = new T.Color(theme === 'ivory' ? 0xfff3df : 0x6f7fa6).multiplyScalar(theme === 'black' ? 0.35 : 0.6);
      backMat.needsUpdate = true;
      return backMat;
    }
    function dispose() { textures.forEach(function (t) { t.dispose(); }); Object.keys(made).forEach(function (k) { made[k].dispose(); }); if (backMat) backMat.dispose(); }
    return { get: get, backdrop: backdrop, dispose: dispose };
  }
  root.RosaryMaterials = { create: create, fbm3: fbm3 };
})(typeof window !== 'undefined' ? window : this);
