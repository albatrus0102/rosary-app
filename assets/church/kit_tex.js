/* kit_tex.js — 캔버스 생성 질감(대리석 격자, 바닥 문양, 벽돌, 나뭇결, 모자이크, 회벽, 코퍼 천장). ctx.tex 로 노출된다. */
(function (root) {
  'use strict';
  var G = root.ChurchGeo;
  var css = G.css;

  function make(rand) {
    var cache = {};
    function memo(key, w, h, draw) {
      if (!cache[key]) cache[key] = G.canvasTexture(w, h, draw);
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
    var tex = {
      // 2x2 대리석 체스판 한 타일
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
      custom: function (w, h, draw) { return G.canvasTexture(w, h, draw); },
      shade: shadeCss
    };
    return tex;
  }
  root.ChurchKitTex = { make: make };
})(typeof window !== 'undefined' ? window : this);
