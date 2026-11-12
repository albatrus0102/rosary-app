/* kit_tex.js — 캔버스 생성 질감(절차 생성). 사진 질감이 없을 때의 대체이자, 법선/거칠기 변화·양탄자 같은 보조 질감. ctx.tex 로 노출된다.
   색 질감은 sRGB, 데이터 질감(법선·거칠기)은 선형. */
(function (root) {
  'use strict';
  var G = root.ChurchGeo;
  var css = G.css;

  function make(rand) {
    var cache = {};
    function memo(key, w, h, draw, linear) {
      if (!cache[key]) cache[key] = G.canvasTexture(w, h, draw, true, linear);
      return cache[key];
    }
    function shadeCss(c, k) {
      var col = G.toColor(c).clone();
      col.r = Math.min(1, col.r * k); col.g = Math.min(1, col.g * k); col.b = Math.min(1, col.b * k);
      return '#' + col.getHexString();
    }
    function speckle(g, w, h, n, alpha, dark) {
      for (var i = 0; i < n; i++) {
        g.fillStyle = (dark ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + (rand() * alpha) + ')';
        g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
      }
    }
    // 값 노이즈 높이맵 (size×size, 0..1)
    function heightNoise(size, octaves, seedK) {
      var h = new Float32Array(size * size), amp = 1, tot = 0;
      for (var o = 0; o < octaves; o++) {
        var cells = 4 << o, grid = [];
        for (var i = 0; i < cells * cells; i++) grid.push(rand());
        for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
          var fx = x / size * cells, fy = y / size * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
          tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          var a = grid[(y0 % cells) * cells + (x0 % cells)], b = grid[(y0 % cells) * cells + ((x0 + 1) % cells)], c = grid[((y0 + 1) % cells) * cells + (x0 % cells)], d = grid[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
          h[y * size + x] += amp * ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty);
        }
        tot += amp; amp *= 0.5;
      }
      for (var k = 0; k < h.length; k++) h[k] /= tot;
      return h;
    }
    var tex = {
      // 2x2 대리석 체스판 한 타일 (절차 생성 대체)
      checker: function (o) {
        o = o || {};
        var c1 = o.c1 === undefined ? 0xf4efe6 : o.c1, c2 = o.c2 === undefined ? 0xd9cfc0 : o.c2, S = o.size || 256;
        var key = 'checker' + c1 + '_' + c2 + '_' + S + (o.veins === false ? 'n' : 'v');
        return memo(key, S, S, function (g, w, h) {
          var half = w / 2;
          for (var j = 0; j < 2; j++) for (var i = 0; i < 2; i++) {
            g.fillStyle = css((i + j) % 2 ? c2 : c1); g.fillRect(i * half, j * half, half, half);
          }
          if (o.veins !== false) {
            g.lineWidth = 1;
            for (var v = 0; v < 26; v++) {
              g.strokeStyle = 'rgba(120,100,90,' + (0.05 + rand() * 0.1) + ')';
              g.beginPath();
              var x = rand() * w, y = rand() * h;
              g.moveTo(x, y);
              for (var s = 0; s < 4; s++) { x += (rand() - 0.5) * 60; y += (rand() - 0.2) * 40; g.lineTo(x, y); }
              g.stroke();
            }
            speckle(g, w, h, 160, 0.12, false);
          }
          g.strokeStyle = 'rgba(90,70,60,0.35)'; g.lineWidth = 2;
          g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(half, 0); g.lineTo(half, h); g.moveTo(0, half); g.lineTo(w, half); g.stroke();
        });
      },
      // 바닥 문양: diamond, stripes, herringbone, stone, octagon, cosmati, terrazzo
      pattern: function (kind, o) {
        o = o || {};
        var c1 = o.c1 === undefined ? 0xf1e7d3 : o.c1, c2 = o.c2 === undefined ? 0xc9a98a : o.c2, c3 = o.c3 === undefined ? 0x8a5a4a : o.c3, S = o.size || 256;
        var key = 'pat' + kind + c1 + '_' + c2 + '_' + c3 + '_' + S;
        return memo(key, S, S, function (g, w, h) {
          g.fillStyle = css(c1); g.fillRect(0, 0, w, h);
          var i, j;
          if (kind === 'diamond') {
            g.fillStyle = css(c2);
            g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.lineTo(0, h / 2); g.closePath(); g.fill();
            g.fillStyle = css(c3);
            g.beginPath(); g.moveTo(w / 2, h * 0.28); g.lineTo(w * 0.72, h / 2); g.lineTo(w / 2, h * 0.72); g.lineTo(w * 0.28, h / 2); g.closePath(); g.fill();
          } else if (kind === 'stripes') {
            for (i = 0; i < 8; i++) { g.fillStyle = css(i % 2 ? c2 : c1); g.fillRect(0, i * h / 8, w, h / 8); }
          } else if (kind === 'herringbone') {
            for (j = 0; j < 8; j++) for (i = 0; i < 4; i++) {
              g.fillStyle = css(rand() < 0.5 ? c1 : c2);
              g.fillRect(i * w / 4 + (j % 2) * 4, j * h / 8, w / 4 - 3, h / 8 - 2);
              g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(i * w / 4, j * h / 8, 1, h / 8);
            }
          } else if (kind === 'stone') {
            var y = 0;
            while (y < h) {
              var rh = 40 + rand() * 40, x = 0;
              while (x < w) {
                var cw = 40 + rand() * 60;
                g.fillStyle = css(G.toColor(rand() < 0.5 ? c1 : c2).clone().multiplyScalar(0.92 + rand() * 0.12));
                g.fillRect(x, y, cw - 2, rh - 2);
                x += cw;
              }
              y += rh;
            }
          } else if (kind === 'octagon') {
            g.fillStyle = css(c2);
            var a = w * 0.3;
            g.beginPath();
            for (i = 0; i < 8; i++) { var an = Math.PI / 8 + i * Math.PI / 4; g.lineTo(w / 2 + Math.cos(an) * w * 0.46, h / 2 + Math.sin(an) * h * 0.46); }
            g.closePath(); g.fill();
            g.fillStyle = css(c3);
            [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { g.fillRect(p[0] - a * 0.25, p[1] - a * 0.25, a * 0.5, a * 0.5); });
          } else if (kind === 'cosmati') {
            g.fillStyle = css(c1); g.fillRect(0, 0, w, h);
            var rings = [[0.46, c3], [0.40, c1], [0.34, c2], [0.26, c1], [0.2, c3], [0.1, c2]];
            rings.forEach(function (r) { g.fillStyle = css(r[1]); g.beginPath(); g.arc(w / 2, h / 2, w * r[0], 0, 6.2832); g.fill(); });
            g.fillStyle = css(c2);
            for (i = 0; i < 12; i++) { var an2 = i * Math.PI / 6; g.beginPath(); g.arc(w / 2 + Math.cos(an2) * w * 0.3, h / 2 + Math.sin(an2) * h * 0.3, 5, 0, 6.2832); g.fill(); }
            g.strokeStyle = css(c3); g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
            [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { g.fillStyle = css(c2); g.beginPath(); g.arc(p[0], p[1], w * 0.14, 0, 6.2832); g.fill(); });
          } else { // terrazzo
            speckle(g, w, h, 500, 1, true);
            for (i = 0; i < 80; i++) { g.fillStyle = css(rand() < 0.5 ? c2 : c3); g.beginPath(); g.arc(rand() * w, rand() * h, 1 + rand() * 3, 0, 6.28); g.fill(); }
          }
          g.strokeStyle = 'rgba(80,60,50,0.18)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
        });
      },
      brick: function (o) {
        o = o || {};
        var b = o.brick === undefined ? 0xb7a595 : o.brick, m = o.mortar === undefined ? 0xe2d9cc : o.mortar;
        var cols = o.cols || 6, rows = o.rows || 12, vary = o.vary === undefined ? 0.08 : o.vary, S = o.size || 256;
        return memo('brick' + b + '_' + m + '_' + cols + '_' + rows + '_' + vary + '_' + S, S, S, function (g, w, h) {
          g.fillStyle = css(m); g.fillRect(0, 0, w, h);
          var bw = w / cols, bh = h / rows;
          for (var j = 0; j < rows; j++) for (var i = -1; i < cols; i++) {
            var off = (j % 2) * bw / 2;
            g.fillStyle = css(G.toColor(b).clone().multiplyScalar(1 - vary + rand() * vary * 2));
            g.fillRect(i * bw + off + 1, j * bh + 1, bw - 2, bh - 2);
          }
        });
      },
      ashlar: function (o) { o = o || {}; return tex.brick({ brick: o.base === undefined ? 0xcfc6b8 : o.base, mortar: o.mortar === undefined ? 0xa89e90 : o.mortar, cols: 3, rows: 4, vary: 0.05, size: 256 }); },
      wood: function (o) {
        o = o || {};
        var base = o.base === undefined ? 0xa9714b : o.base, dark = o.dark === undefined ? 0x7a4a2f : o.dark, planks = o.planks || 4, dirx = o.direction === 'x', S = o.size || 256;
        return memo('wood' + base + '_' + dark + '_' + planks + '_' + dirx + '_' + S, S, S, function (g, w, h) {
          for (var p = 0; p < planks; p++) {
            g.fillStyle = css(G.toColor(base).clone().multiplyScalar(0.9 + rand() * 0.2));
            if (dirx) g.fillRect(0, p * h / planks, w, h / planks); else g.fillRect(p * w / planks, 0, w / planks, h);
          }
          for (var i = 0; i < 90; i++) {
            g.strokeStyle = 'rgba(' + (rand() < 0.5 ? '60,35,20,' : '255,220,180,') + (0.06 + rand() * 0.1) + ')';
            g.beginPath();
            if (dirx) { var yy = rand() * h; g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + rand() * 6 - 3, w * 0.6, yy + rand() * 6 - 3, w, yy + rand() * 4 - 2); }
            else { var xx = rand() * w; g.moveTo(xx, 0); g.bezierCurveTo(xx + rand() * 6 - 3, h * 0.3, xx + rand() * 6 - 3, h * 0.6, xx + rand() * 4 - 2, h); }
            g.stroke();
          }
          g.strokeStyle = css(dark); g.lineWidth = 2;
          for (p = 0; p < planks; p++) { g.beginPath(); if (dirx) { g.moveTo(0, p * h / planks); g.lineTo(w, p * h / planks); } else { g.moveTo(p * w / planks, 0); g.lineTo(p * w / planks, h); } g.stroke(); }
        });
      },
      mosaic: function (o) {
        o = o || {};
        var base = o.base === undefined ? 0xd8aa3c : o.base, accent = o.accent === undefined ? 0x2f4f9a : o.accent, n = o.tesserae || 24, S = o.size || 256;
        return memo('mos' + base + '_' + accent + '_' + n + '_' + S + (o.gold === false ? 'n' : 'g'), S, S, function (g, w, h) {
          var t = w / n;
          for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
            var c = G.toColor(base).clone().multiplyScalar(0.82 + rand() * 0.34);
            if (rand() < 0.07) c = G.toColor(accent).clone().multiplyScalar(0.8 + rand() * 0.4);
            g.fillStyle = '#' + c.getHexString(); g.fillRect(i * t, j * t, t - 1, t - 1);
          }
        });
      },
      plaster: function (o) {
        o = o || {};
        var base = o.base === undefined ? 0xf3ead8 : o.base, nz = o.noise === undefined ? 0.05 : o.noise;
        return memo('pl' + base + '_' + nz, 128, 128, function (g, w, h) {
          g.fillStyle = css(base); g.fillRect(0, 0, w, h);
          speckle(g, w, h, 700 * (nz / 0.05), 0.5 * nz * 4, true); speckle(g, w, h, 500, 0.4 * nz * 4, false);
        });
      },
      coffer: function (o) {
        o = o || {};
        var base = o.base === undefined ? 0x23305f : o.base, gold = o.gold === undefined ? 0xe0b84a : o.gold, border = o.border === undefined ? 0xb98a2e : o.border, n = o.n || 3, S = o.size || 256;
        return memo('cof' + base + '_' + gold + '_' + border + '_' + n + '_' + S, S, S, function (g, w, h) {
          g.fillStyle = css(gold); g.fillRect(0, 0, w, h);
          var c = w / n, pad = c * 0.14;
          for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
            var x = i * c, y = j * c;
            g.fillStyle = css(border); g.fillRect(x + pad * 0.5, y + pad * 0.5, c - pad, c - pad);
            g.fillStyle = css(base); g.fillRect(x + pad, y + pad, c - pad * 2, c - pad * 2);
            g.fillStyle = css(gold); g.beginPath(); g.arc(x + c / 2, y + c / 2, c * 0.2, 0, 6.2832); g.fill();
            g.fillStyle = css(base); g.beginPath(); g.arc(x + c / 2, y + c / 2, c * 0.1, 0, 6.2832); g.fill();
            g.fillStyle = css(gold);
            for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; g.beginPath(); g.arc(x + c / 2 + Math.cos(a) * c * 0.3, y + c / 2 + Math.sin(a) * c * 0.3, c * 0.04, 0, 6.2832); g.fill(); }
          }
        });
      },
      // 법선 맵(높이 노이즈의 소벨). 대리석/회반죽의 미세한 요철용. strength 높을수록 거칠다.
      noiseNormal: function (o) {
        o = o || {};
        var S = o.size || 256, st = o.strength === undefined ? 2.0 : o.strength, oct = o.octaves || 4;
        return memo('nn' + S + '_' + st + '_' + oct, S, S, function (g, w, h) {
          var hm = heightNoise(S, oct), img = g.createImageData(S, S);
          for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
            var l = hm[y * S + (x + S - 1) % S], r = hm[y * S + (x + 1) % S], u = hm[((y + S - 1) % S) * S + x], d = hm[((y + 1) % S) * S + x];
            var nx = (l - r) * st * 8, ny = (u - d) * st * 8, nz = 1, len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            var o2 = (y * S + x) * 4;
            img.data[o2] = (nx / len * 0.5 + 0.5) * 255; img.data[o2 + 1] = (ny / len * 0.5 + 0.5) * 255; img.data[o2 + 2] = (nz / len * 0.5 + 0.5) * 255; img.data[o2 + 3] = 255;
          }
          g.putImageData(img, 0, 0);
        }, true);
      },
      // 거칠기 변화 맵(green 채널 사용). base 평균, vary 변화량
      roughMap: function (o) {
        o = o || {};
        var S = o.size || 256, base = o.base === undefined ? 0.5 : o.base, vary = o.vary === undefined ? 0.3 : o.vary;
        return memo('rm' + S + '_' + base + '_' + vary, S, S, function (g, w, h) {
          var hm = heightNoise(S, 4), img = g.createImageData(S, S);
          for (var i = 0; i < S * S; i++) {
            var v = Math.max(0, Math.min(1, base + (hm[i] - 0.5) * vary * 2)) * 255;
            img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
          }
          g.putImageData(img, 0, 0);
        }, true);
      },
      // 양탄자: 가로 폭 방향(u)에 테두리 줄무늬, 길이(v) 방향으로 메달리온 반복
      carpet: function (o) {
        o = o || {};
        var base = o.color === undefined ? 0x7d1f2c : o.color, trim = o.border === undefined ? 0xc9a24b : o.border, S = 256;
        return memo('carpet' + base + '_' + trim, S, S * 2, function (g, w, h) {
          g.fillStyle = css(base); g.fillRect(0, 0, w, h);
          var dark = css(G.toColor(base).clone().multiplyScalar(0.7)), light = css(G.toColor(base).clone().multiplyScalar(1.25));
          for (var y = 0; y < h; y += 2) { g.fillStyle = (y / 2) % 2 ? dark : light; g.globalAlpha = 0.09; g.fillRect(0, y, w, 1); }
          g.globalAlpha = 1;
          g.strokeStyle = css(trim); g.lineWidth = 6; g.strokeRect(10, 0, w - 20, h);
          g.lineWidth = 2; g.strokeRect(22, 0, w - 44, h);
          g.fillStyle = css(trim);
          for (var m = 0; m < 2; m++) {
            var cy = h * (0.25 + m * 0.5);
            g.globalAlpha = 0.85; g.beginPath(); g.ellipse(w / 2, cy, w * 0.2, w * 0.26, 0, 0, 6.2832); g.lineWidth = 3; g.strokeStyle = css(trim); g.stroke();
            g.globalAlpha = 0.5; g.beginPath(); g.ellipse(w / 2, cy, w * 0.1, w * 0.14, 0, 0, 6.2832); g.fill();
          }
          g.globalAlpha = 1;
          speckle(g, w, h, 900, 0.22, true);
        });
      },
      custom: function (w, h, draw) { return G.canvasTexture(w, h, draw); },
      shade: shadeCss
    };
    return tex;
  }
  root.ChurchKitTex = { make: make };
})(typeof window !== 'undefined' ? window : this);
