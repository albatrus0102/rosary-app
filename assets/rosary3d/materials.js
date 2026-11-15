/* materials.js — 묵주 재질(PBR, MeshPhysicalMaterial)과 절차적 텍스처(캔버스로 그린 나뭇결·진주 미세 요철·벨벳·금속 결).
   외부 이미지 없이 만든다(라이선스·용량·file:// 텍스처 제약을 피한다). 텍스처는 묵주마다 한 번만 만들어 모든 알이 나눠 쓴다.
   RosaryMaterials = { create(renderer, quality) → { get(name), backdrop(theme), dispose() } } */
(function (root) {
  'use strict';
  var T = root.THREE;

  // ---- 3D 값 노이즈(주기 없는 해시) ----
  // 순열표 해시(Math.sin 해시보다 3~4배 빠르다: 묵주를 바꿀 때 텍스처 생성 시간을 줄인다)
  var PERM = new Uint8Array(512), RV = new Float32Array(256);
  (function () { var sd = 1234567, i; function r() { sd = (sd * 16807) % 2147483647; return sd / 2147483647; } var p = []; for (i = 0; i < 256; i++) { p.push(i); RV[i] = r(); } for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; } for (i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
  function hash(x, y, z) { return RV[PERM[PERM[PERM[x & 255] + (y & 255)] + (z & 255)]]; }
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
        var thick = 1.4 + 3.2 * fbm3(px * 1.7 + 3, py * 1.7, pz * 0.9 + seed, 2);   // 결 굵기가 곳곳에서 달라진다
        var fq = pal[3] ? pal[3][0] : 1;
        var streak = Math.pow(1 - Math.abs(Math.sin(g * 2.4 * fq)), thick) * 0.95 + Math.pow(1 - Math.abs(Math.sin(g2 * 4.1 * fq)), 16) * 0.45;
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

  // 범용 절차 화가: 구 UV 를 원기둥 좌표(이음매 없음)로 돌려 fn(px,py,pz,u,v) → [r,g,b, 높이 0..1, 거칠기 0..1, 금속 0..1] 를 칠한다.
  function paint(size, fn, wantMetal) {
    var names = ['color', 'bump', 'rough'].concat(wantMetal ? ['metal'] : []), out = {}, ims = {}, ctx = {};
    names.forEach(function (n) { out[n] = canvas(size, size); ctx[n] = out[n].getContext('2d'); ims[n] = ctx[n].createImageData(size, size); });
    for (var j = 0; j < size; j++) for (var i = 0; i < size; i++) {
      var u = i / size, v = j / size, a = u * 2 * Math.PI;
      var r = fn(Math.cos(a), Math.sin(a), v * 3.1, u, v), k = (j * size + i) * 4;
      ims.color.data[k] = r[0]; ims.color.data[k + 1] = r[1]; ims.color.data[k + 2] = r[2]; ims.color.data[k + 3] = 255;
      ims.bump.data[k] = ims.bump.data[k + 1] = ims.bump.data[k + 2] = r[3] * 255; ims.bump.data[k + 3] = 255;
      ims.rough.data[k] = ims.rough.data[k + 1] = ims.rough.data[k + 2] = r[4] * 255; ims.rough.data[k + 3] = 255;
      if (wantMetal) { ims.metal.data[k] = ims.metal.data[k + 1] = ims.metal.data[k + 2] = (r[5] || 0) * 255; ims.metal.data[k + 3] = 255; }
    }
    names.forEach(function (n) { ctx[n].putImageData(ims[n], 0, 0); });
    return out;
  }
  function lerp3(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

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
        var w = woodCanvases(TS, [[210, 164, 98], [146, 92, 44], [62, 34, 14]], 1.7, false);
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
        // 진주: 크림색 몸빛은 낮추고, 매끈한 표면 반사(클리어코트)와 얇은 막 간섭(무지갯빛 오리엔트)으로 광택을 낸다.
        var n = noiseCanvas(low ? 128 : 256, 6, 4, 90, 170, 3.3);
        return new T.MeshPhysicalMaterial({ color: 0x9c8d78, roughness: 0.28, metalness: 0.6, bumpMap: tex(n), bumpScale: 0.0025,
          clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0, sheenRoughness: 0.25, sheenColor: new T.Color(0xd9b8c4),
          iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [240, 460], envMapIntensity: 2.4, specularIntensity: 1 });
      },
      crystalBlue: function () {
        // 수정: 굴절(transmission·ior)로 바탕이 비치고, 두꺼운 곳일수록 푸르게(attenuation). 파셋마다 반사가 갈린다.
        // r149 는 알 속 내부 반사를 그리지 못해 어두운 바탕에서 검게 죽으므로, 알 속에서 흩어진 빛만큼의 옅은 몸빛(emissive)을 더한다.
        return new T.MeshPhysicalMaterial({ color: 0xb5d2ff, metalness: 0, roughness: 0.015, transmission: 0.95, ior: 2.0, thickness: 0.8,
          attenuationColor: new T.Color(0x4d8cff), attenuationDistance: 0.9, emissive: new T.Color(0x1a4fb8), emissiveIntensity: 0.38, specularIntensity: 1, specularColor: new T.Color(0xffffff),
          envMapIntensity: 3.0, flatShading: true, clearcoat: 1, clearcoatRoughness: 0.01 });
      },
      ebony: function () {
        // 흑단: 깊은 검정 + 은은한 갈색 결, 반광택(오일 마감)
        var w = woodCanvases(TS, [[64, 52, 44], [34, 27, 23], [12, 10, 9], [2.2]], 6.1, false);
        return new T.MeshPhysicalMaterial({ map: tex(w.color, true), bumpMap: tex(w.bump), bumpScale: 0.004, roughnessMap: tex(w.rough), roughness: 0.42,
          clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1.1 });
      },
      rosewood: function () {
        // 로즈우드: 적갈색, 굵고 가는 결이 겹친 복합 무늬
        var w = woodCanvases(TS, [[138, 60, 36], [98, 38, 22], [44, 14, 8], [3.1]], 8.3, false);
        return new T.MeshPhysicalMaterial({ map: tex(w.color, true), bumpMap: tex(w.bump), bumpScale: 0.006, roughnessMap: tex(w.rough), roughness: 0.5,
          clearcoat: 0.55, clearcoatRoughness: 0.28, sheen: 0.2, sheenColor: new T.Color(0xffb38a), envMapIntensity: 1.0 });
      },
      rosewoodCross: function () {
        var w = woodCanvases(TS, [[160, 76, 46], [108, 44, 24], [48, 18, 9], [1.4]], 3.3, true);
        return new T.MeshPhysicalMaterial({ map: tex(w.color, true), bumpMap: tex(w.bump), bumpScale: 0.005, roughnessMap: tex(w.rough), roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3 });
      },
      glassGreen: function () {
        // 손으로 녹여 만든 유리: 맑은 초록 속에 짙고 옅은 소용돌이 줄, 기포, 표면의 잔물결(범프)
        var c = paint(low ? 128 : 256, function (x, y, z, u, v) {
          var n = fbm3(x * 1.6, y * 1.6, z * 0.9, 3), b = fbm3(x * 6, y * 6, z * 3 + 2, 2);
          var sw = 0.5 + 0.5 * Math.sin(u * 6.283 * 3 + v * 9 + n * 4);
          var bub = Math.pow(clamp01(1 - Math.abs(noise3(x * 11 + 3, y * 11, z * 7) - 0.9) * 22), 2);
          var col = lerp3([196, 246, 214], [40, 150, 96], clamp01(sw * 0.8 + n * 0.3 - 0.05));
          col = lerp3(col, [255, 255, 255], bub * 0.7);
          return [col[0], col[1], col[2], 0.45 + 0.35 * n + 0.2 * b, 0.04 + bub * 0.2];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), bumpMap: tex(c.bump), bumpScale: 0.014, roughnessMap: tex(c.rough), roughness: 1,
          transmission: 1, ior: 1.52, thickness: 0.7, attenuationColor: new T.Color(0x3fbf7f), attenuationDistance: 1.4,
          emissive: new T.Color(0x0e5a34), emissiveIntensity: 0.22, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.8, specularIntensity: 1 });
      },
      amethyst: function () {
        // 자수정: 보라 결정, 끝으로 갈수록 짙어지는 색띠(셰브런)와 맑은 부분의 편차
        var c = paint(low ? 128 : 256, function (x, y, z, u, v) {
          var n = fbm3(x * 1.3, y * 1.3, z * 0.8 + 4, 4);
          var band = 0.5 + 0.5 * Math.sin((Math.abs(v - 0.5) * 9 + n * 3) * 2.2);
          var t = clamp01(band * 0.7 + n * 0.5 - 0.1);
          var col = lerp3([226, 196, 250], [126, 62, 196], t);
          return [col[0], col[1], col[2], 0.5, 0.04];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), roughness: 0.02, transmission: 0.94, ior: 1.65, thickness: 1.0,
          attenuationColor: new T.Color(0x8a3fd6), attenuationDistance: 1.0, emissive: new T.Color(0x3b1170), emissiveIntensity: 0.4,
          flatShading: true, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 2.8, specularIntensity: 1 });
      },
      roseQuartz: function () {
        // 장미석: 반투명 분홍, 안쪽에 우윳빛 결(실금·구름)
        var c = paint(low ? 128 : 256, function (x, y, z) {
          var n = fbm3(x * 1.4, y * 1.4, z * 0.7 + 8, 4), vein = Math.pow(1 - Math.abs(Math.sin((z * 2.4 + x * 1.3 + n * 4) * 3)), 18);
          var col = lerp3([255, 214, 224], [240, 160, 184], n);
          col = lerp3(col, [255, 244, 246], vein * 0.85);
          return [col[0], col[1], col[2], 0.5 + vein * 0.1, 0.12 + vein * 0.2];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), roughnessMap: tex(c.rough), roughness: 0.6, transmission: 0.45, ior: 1.54, thickness: 1.4,
          attenuationColor: new T.Color(0xf590aa), attenuationDistance: 1.8, emissive: new T.Color(0xb04a68), emissiveIntensity: 0.3,
          clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.4 });
      },
      amber: function () {
        // 호박: 따뜻한 반투명 황금색, 안쪽 흐름 무늬와 작은 내포물
        var c = paint(low ? 128 : 256, function (x, y, z) {
          var n = fbm3(x * 1.2, y * 1.2, z * 0.6 + 2, 4), flow = 0.5 + 0.5 * Math.sin((z * 3 + n * 5) * 1.6);
          var inc = noise3(x * 14, y * 14, z * 9) > 0.93 ? 1 : 0;
          var col = lerp3([255, 196, 92], [176, 82, 18], clamp01(flow * 0.6 + n * 0.5 - 0.15));
          col = lerp3(col, [70, 34, 10], inc * 0.8);
          return [col[0], col[1], col[2], 0.5 + 0.2 * n, 0.1 + inc * 0.4];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), roughnessMap: tex(c.rough), roughness: 1, transmission: 0.8, ior: 1.54, thickness: 1.1,
          attenuationColor: new T.Color(0xd06a10), attenuationDistance: 0.9, emissive: new T.Color(0x6e2c04), emissiveIntensity: 0.42,
          clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.8 });
      },
      lapis: function () {
        // 청금석: 깊은 청색 바탕 + 흰 방해석 줄 + 금빛 황철석 점(금속 맵으로 점만 금속)
        var c = paint(TS, function (x, y, z) {
          var n = fbm3(x * 2.2, y * 2.2, z * 1.2 + 5, 4), m = fbm3(x * 5, y * 5, z * 3, 3);
          var calc = Math.pow(clamp01(1 - Math.abs(m - 0.55) * 9), 3) * 0.55;
          var py = (noise3(x * 48 + 1, y * 48, z * 30) > 0.9 && noise3(x * 7, y * 7, z * 4 + 9) > 0.45) ? 1 : 0;
          var col = lerp3([52, 82, 186], [14, 24, 84], clamp01(n * 1.3 - 0.15));
          col = lerp3(col, [200, 206, 222], calc);
          if (py) col = [224, 184, 96];
          return [col[0], col[1], col[2], 0.5 + py * 0.3 - calc * 0.1, py ? 0.25 : 0.32 + calc * 0.2, py];
        }, true);
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), bumpMap: tex(c.bump), bumpScale: 0.003, roughnessMap: tex(c.rough), roughness: 1,
          metalnessMap: tex(c.metal), metalness: 1, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 1.3 });
      },
      jade: function () {
        // 옥: 부드러운 녹색 얼룩과 밝은 구름, 기름 같은 은은한 광택(안쪽 투광은 약한 투과 + 몸빛)
        var c = paint(low ? 128 : 256, function (x, y, z) {
          var n = fbm3(x * 1.8, y * 1.8, z * 1.0 + 11, 5), cl = fbm3(x * 0.8 + 3, y * 0.8, z * 0.5, 3);
          var col = lerp3([120, 190, 134], [24, 104, 58], clamp01(n * 1.4 - 0.2));
          col = lerp3(col, [196, 228, 196], clamp01((cl - 0.58) * 3) * 0.55);
          return [col[0], col[1], col[2], 0.5, 0.28];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), roughness: 0.35, transmission: 0.55, ior: 1.6, thickness: 1.6,
          attenuationColor: new T.Color(0x2f8a52), attenuationDistance: 0.7, emissive: new T.Color(0x0f3a22), emissiveIntensity: 0.3,
          clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1.4 });
      },
      silverCarved: function () {
        // 세공 은구슬: 마름모 격자 + 꽃잎 음각, 홈은 거칠고 검게(산화), 돋은 면은 반들반들
        var c = paint(TS, function (x, y, z, u, v) {
          var a = u * 16, b = v * 10, d1 = Math.abs(((a + b) % 2 + 2) % 2 - 1), d2 = Math.abs(((a - b) % 2 + 2) % 2 - 1);
          var groove = Math.max(1 - Math.min(d1, d2) * 9, 0);
          var cx = (((a) % 2) + 2) % 2 - 1, cy2 = (((b + 1) % 2) + 2) % 2 - 1, pet = Math.abs(Math.hypot(cx, cy2) - 0.45) < 0.08 ? 1 : 0;
          var g = clamp01(groove + pet), n = fbm3(x * 8, y * 8, z * 6, 2);
          var col = lerp3([230, 228, 222], [60, 56, 52], g * 0.85);
          return [col[0] * (0.9 + 0.1 * n), col[1] * (0.9 + 0.1 * n), col[2] * (0.9 + 0.1 * n), 1 - g * 0.8, 0.22 + g * 0.5];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), bumpMap: tex(c.bump), bumpScale: 0.02, roughnessMap: tex(c.rough), roughness: 1, metalness: 1, envMapIntensity: 1.7 });
      },
      goldPlated: function () {
        // 금도금: 따뜻한 금속광 + 미세한 두드림 결(망치 자국)
        var c = paint(TS, function (x, y, z) {
          var n = noise3(x * 18, y * 18, z * 12), f = fbm3(x * 40, y * 40, z * 26, 2);
          var dent = Math.pow(n, 3);
          return [250, 206, 122, 0.6 - dent * 0.2 + f * 0.1, 0.16 + dent * 0.1 + f * 0.06];
        });
        return new T.MeshPhysicalMaterial({ color: 0xffffff, map: tex(c.color, true), bumpMap: tex(c.bump), bumpScale: 0.004, roughnessMap: tex(c.rough), roughness: 1, metalness: 1, envMapIntensity: 2.0, clearcoat: 0.3, clearcoatRoughness: 0.15 });
      },
      ceramic: function () {
        // 세라믹: 흰 유약 위 손으로 그린 쪽빛 꽃과 띠, 붓 자국 같은 미세 굴곡, 유약 광택
        var c = paint(TS, function (x, y, z, u, v) {
          var n = fbm3(x * 2, y * 2, z * 1.5 + 6, 3), wob = 0.012 * Math.sin(u * 40);
          var band = (Math.abs(v - 0.28 + wob) < 0.022 || Math.abs(v - 0.72 + wob) < 0.022) ? 1 : 0;
          var pu = (u * 6) % 1 - 0.5, pv = (v - 0.5) * 3.2, rr = Math.hypot(pu, pv), ang = Math.atan2(pv, pu);
          var petal = rr < 0.28 * (0.6 + 0.4 * Math.abs(Math.cos(ang * 2.5))) && rr > 0.05 ? 1 : 0;
          var dot = rr < 0.05 ? 1 : 0;
          var ink = clamp01(band + petal * (0.75 + 0.25 * n));
          var col = lerp3([244, 240, 230], [38, 72, 150], ink);
          if (dot) col = [196, 150, 60];
          return [col[0] * (0.97 + 0.03 * n), col[1] * (0.97 + 0.03 * n), col[2], 0.5 + 0.25 * n + ink * 0.05, 0.12 + 0.1 * n];
        });
        return new T.MeshPhysicalMaterial({ map: tex(c.color, true), bumpMap: tex(c.bump), bumpScale: 0.006, roughnessMap: tex(c.rough), roughness: 1,
          clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 });
      },
      cordBlack: function () { return new T.MeshPhysicalMaterial({ color: 0x1a1716, roughness: 0.8, sheen: 0.6, sheenColor: new T.Color(0x5a5550), envMapIntensity: 0.6 }); },
      cordRed: function () { return new T.MeshPhysicalMaterial({ color: 0x8e1c22, roughness: 0.7, sheen: 0.8, sheenColor: new T.Color(0xff8a8a), envMapIntensity: 0.7 }); },
      cordBlue: function () { return new T.MeshPhysicalMaterial({ color: 0x24407e, roughness: 0.75, sheen: 0.7, sheenColor: new T.Color(0x9ab4ff), envMapIntensity: 0.7 }); },
      cordAmber: function () { return new T.MeshPhysicalMaterial({ color: 0x6a4214, roughness: 0.75, sheen: 0.6, sheenColor: new T.Color(0xd8a050), envMapIntensity: 0.7 }); },
      roseGold: function () { return new T.MeshPhysicalMaterial({ color: 0xeab09a, metalness: 1, roughness: 0.24, envMapIntensity: 1.5 }); },
      bronze: function () { return new T.MeshPhysicalMaterial({ color: 0xb0804a, metalness: 1, roughness: 0.36, envMapIntensity: 1.3 }); },
      gold: function () {
        var n = noiseCanvas(128, 14, 3, 80, 140, 5.1);
        return new T.MeshPhysicalMaterial({ color: 0xe8bd6a, metalness: 1, roughness: 0.26, roughnessMap: tex(n, false, 2), envMapIntensity: 1.25, clearcoat: 0.2, clearcoatRoughness: 0.2 });
      },
      goldBright: function () { return new T.MeshPhysicalMaterial({ color: 0xf0c978, metalness: 1, roughness: 0.2, envMapIntensity: 1.35 }); },
      silver: function () {
        var n = noiseCanvas(128, 16, 3, 70, 130, 8.4);
        return new T.MeshPhysicalMaterial({ color: 0xf0f2f5, metalness: 1, roughness: 0.24, roughnessMap: tex(n, false, 2), envMapIntensity: 1.9 });
      },
      antiqueSilver: function () {
        var n = noiseCanvas(128, 10, 4, 90, 200, 2.2);
        return new T.MeshPhysicalMaterial({ color: 0xc4beb2, metalness: 1, roughness: 0.4, roughnessMap: tex(n, false, 2), envMapIntensity: 1.5 });
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
