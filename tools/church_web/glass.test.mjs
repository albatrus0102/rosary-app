// 창 감상(G1) 순수 계산 시험: 카탈로그 조회·실제 크기 추정·카메라 구도·확대/이동 한계·질감 단계·색 함수·CIEDE2000·빛 상태.
// 렌더 시험(ΔE·IoU·깜박임·메모리)은 tools/church_web/glasscolor.mjs (헤드리스, node --test 밖).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const GM = require('../../assets/church/glass_math.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const cat = JSON.parse(fs.readFileSync(path.join(assets, 'glass_catalog.json'), 'utf8'));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

test('catalog index and lookup', () => {
  const idx = GM.indexCatalog(cat);
  assert.equal(Object.keys(idx).length, cat.windows.length);
  assert.equal(GM.lookup(idx, 'rose_chartres_north').id, 'rose_chartres_north');
  for (const bad of ['', 'A', '../x', 'toString', 'constructor', 'x'.repeat(41), null, 3]) assert.equal(GM.lookup(idx, bad), null, String(bad));
  assert.equal(GM.lookup(idx, 'no_such_window'), null);
});

test('every catalog window has bundled 1k/2k files and a file:// data pack', () => {
  for (const w of cat.windows) {
    for (const t of ['t1', 't2']) {
      const px = GM.tierPx(w, t);
      assert.ok(px && px[0] > 0 && px[1] > 0, w.id + ' ' + t);
      assert.ok(fs.existsSync(path.join(assets, GM.tierFile(w.id, t))), GM.tierFile(w.id, t));
      assert.ok(fs.existsSync(path.join(assets, GM.packFile(w.id, t))), GM.packFile(w.id, t) + ' (node tools/church_web/build_glasspack.mjs)');
    }
    assert.equal(Math.max(...GM.tierPx(w, 't2')), w.files['2k'].px[0] >= w.files['2k'].px[1] ? w.files['2k'].px[0] : w.files['2k'].px[1]);
  }
  assert.ok(fs.existsSync(path.join(assets, 'glass_catalog.js')));
});

test('sizeOf keeps the photo aspect and uses known sizes', () => {
  for (const w of cat.windows) {
    const s = GM.sizeOf(w);
    assert.ok(s.w > 0.1 && s.h > 0.1 && s.w < 40 && s.h < 40, w.id);
    assert.ok(near(s.w / s.h, w.aspect_w_over_h, 1e-9), w.id + ' aspect');
    assert.ok(s.status === 'known' || s.status === 'est');
  }
  const byId = GM.indexCatalog(cat);
  const cn = GM.sizeOf(byId.rose_chartres_north);                     // 폭만 앎
  assert.ok(near(cn.w, 10.5) && near(cn.h, 10.5 / byId.rose_chartres_north.aspect_w_over_h) && cn.status === 'known');
  const ad = GM.sizeOf(byId.augsburg_daniel);                         // 높이만 앎(est)
  assert.ok(near(ad.h, 2.2) && ad.status === 'est');
  const pc = GM.sizeOf(byId.panel_crucified);                         // 둘 다 앎: 높이 기준, 폭은 사진 비율
  assert.ok(near(pc.h, 0.869) && near(pc.w, 0.869 * byId.panel_crucified.aspect_w_over_h) && pc.status === 'known');
  assert.ok(Math.abs(pc.w / 0.435 - 1) < 0.02, 'real width within 2%');
  const dv = GM.sizeOf(byId.dove_stpeter);                            // 모름 -> 형태 기본값
  assert.equal(dv.status, 'est'); assert.ok(near(dv.h, 3.5));
  // 사진 비율과 실제 비율이 2% 넘게 다르면 사진 모양을 지킨다
  const odd = GM.sizeOf({ aspect_w_over_h: 1, real_size_m: { width: 2, height: 1, status: 'known' } });   // 2% 넘게 다르면(카탈로그 오류) 그래도 사진 모양
  assert.ok(near(odd.w, 1) && near(odd.h, 1));
});

test('frameDistance fits the window into the screen at the given fill', () => {
  const t = Math.tan(17.5 * Math.PI / 180);
  assert.ok(near(GM.frameDistance(1, 1, 1, 35, 0.84), 1 / (2 * t * 0.84)));
  for (const [w, h, a] of [[10.5, 16.3, 0.45], [10.5, 16.3, 1.78], [4, 1, 0.45], [0.5, 2, 1.78], [12.9, 12.9, 0.42]]) {
    const d = GM.frameDistance(w, h, a, 35, 0.84);
    const visH = 2 * d * t, visW = visH * a;
    assert.ok(h <= visH * 0.84 + 1e-9 && w <= visW * 0.84 + 1e-9, `${w}x${h}@${a}`);
    assert.ok(near(h / visH, 0.84, 1e-9) || near(w / visW, 0.84, 1e-9), 'one side touches the fill');
  }
});

test('zoomFov is an exact magnification and zoomMax clamps by texture resolution', () => {
  assert.ok(near(GM.zoomFov(35, 1), 35));
  const r = Math.tan(GM.zoomFov(35, 4) * Math.PI / 360) / Math.tan(35 * Math.PI / 360);
  assert.ok(near(r, 0.25, 1e-12));
  assert.equal(GM.zoomMax([1414, 2048], [300, 434]), 8);            // t2 큰 질감, 작은 화면 -> 상한 8
  assert.ok(near(GM.zoomMax([707, 1024], [463, 672]), 1024 * 2 / 672, 1e-9));
  assert.equal(GM.zoomMax([100, 100], [600, 600]), 1);               // 질감이 화면보다 작으면 확대 없음
  assert.equal(GM.zoomMax(null, [1, 1]), 1);
  // 같은 화면에서 t1 의 한계는 t2 보다 작거나 같다
  assert.ok(GM.zoomMax([707, 1024], [400, 580]) <= GM.zoomMax([1414, 2048], [400, 580]));
});

test('pan is locked at 1x, bounded when zoomed, and pinch keeps the point under the fingers', () => {
  const d = GM.frameDistance(2, 3, 0.5, 35, 0.84);
  const hv1 = GM.halfVisible(d, 35, 0.5, 1), hv4 = GM.halfVisible(d, 35, 0.5, 4);
  assert.deepEqual(GM.clampPan(5, -5, 2, 3, hv1), { x: 0, y: 0 });
  const c = GM.clampPan(5, -5, 2, 3, hv4);
  assert.ok(c.x > 0 && c.x < 2 && c.y < 0 && c.y > -3);
  assert.ok(near(c.x, 2 * 0.54 - hv4.hx) && near(c.y, -(3 * 0.54 - hv4.hy)));
  const p = GM.pinchPan(0.1, -0.2, 0.5, -0.3, hv1, hv4);
  assert.ok(near(0.1 + 0.5 * hv1.hx, p.x + 0.5 * hv4.hx) && near(-0.2 - 0.3 * hv1.hy, p.y - 0.3 * hv4.hy));
  assert.equal(GM.easeInOut(0), 0); assert.equal(GM.easeInOut(1), 1); assert.ok(near(GM.easeInOut(0.5), 0.5));
});

test('tier selection and file names', () => {
  assert.equal(GM.selectTier('t2', { maxTex: 8192 }), 't2');
  assert.equal(GM.selectTier('t1', { maxTex: 8192 }), 't1');
  assert.equal(GM.selectTier('t3', {}), 't2');                        // T3 는 G2: 모르는 값은 t2
  assert.equal(GM.selectTier('t2', { maxTex: 1024 }), 't1');
  assert.equal(GM.selectTier('t2', { deviceMemory: 1 }), 't1');
  assert.equal(GM.tierFile('dove_stpeter', 't1'), 'glass_dove_stpeter_1k.webp');
  assert.equal(GM.tierFile('dove_stpeter', 't2'), 'glass_dove_stpeter_2k.webp');
  assert.equal(GM.packFile('dove_stpeter', 't2'), 'gpack_dove_stpeter_2k.js');
  assert.ok(near(GM.texMb(2048, 2048), 21.333, 1e-3));
});

test('glass curve is the identity up to 1.0 and hue-preserving above', () => {
  for (let i = 0; i < 500; i++) {
    const r = Math.random(), g = Math.random(), b = Math.random();
    assert.deepEqual(GM.glassCurve(r, g, b), [r, g, b]);
  }
  const o = GM.glassCurve(2.4, 1.2, 0.3);
  assert.ok(Math.max(...o) <= 1 + 1e-12 && o[0] >= o[1] && o[1] >= o[2]);
  assert.ok(near(GM.glassCurve(1, 0.5, 0.2)[1], 0.5));                // 1.0 에서 연속
  assert.deepEqual(GM.glassCurve(3, 3, 3).map((v) => +v.toFixed(9)), [1, 1, 1]);
});

test('Khronos PBR Neutral reference values', () => {
  const g = GM.neutral(0.5, 0.5, 0.5);
  assert.ok(near(g[0], 0.46) && near(g[1], 0.46));
  const hi = GM.neutral(4, 2, 1);
  assert.ok(hi[0] <= 1 && hi[0] >= hi[1] && hi[1] >= hi[2]);
  let prev = -1; for (let v = 0; v <= 8; v += 0.05) { const y = GM.neutral(v, v, v)[0]; assert.ok(y >= prev - 1e-12); prev = y; }
});

test('CIEDE2000 matches Sharma et al. test data', () => {
  const S = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425], [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 0, 0], [50, -1, 2], 2.3669], [[50, 2.5, 0], [73, 25, -18], 27.1492], [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[50, -0.001, 2.49], [50, 0.0011, -2.49], 4.7461], [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045], [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373], [[90.9257, -0.5406, -0.9208], [88.6381, -0.8985, -0.7239], 1.5381]
  ];
  for (const [a, b, e] of S) assert.ok(near(GM.deltaE2000(...a, ...b), e, 1e-4), `${a} ${b} -> ${GM.deltaE2000(...a, ...b)}`);
  const w = GM.srgbToLab(255, 255, 255), k = GM.srgbToLab(0, 0, 0);
  assert.ok(near(w[0], 100, 1e-3) && Math.abs(w[1]) < 0.01 && Math.abs(w[2]) < 0.01 && near(k[0], 0, 1e-9));
  assert.ok(near(GM.hueDiff(350, 10), 20) && near(GM.hueDiff(10, 350), -20));
});

test('light states: ref reproduces the photo, night is dark, sun follows the hour', () => {
  const r = GM.lightState('ref');
  assert.deepEqual([r.k, ...r.tint, r.patch, r.refl], [1, 1, 1, 1, 0, 0]);
  assert.equal(GM.lightState('bogus').k, 1);
  assert.ok(GM.lightState('night').k <= 0.04);
  const m = GM.lightState('sun', 8.5), e = GM.lightState('sun', 17.5), n = GM.lightState('sun', 23);
  assert.ok(m.patch > 0.2 && m.k > 1.5, 'east window lit by the morning sun');
  assert.ok(e.patch === 0 && e.k > 0.6 && e.k < 1.3, 'back-lit in the evening');
  assert.ok(n.k <= 0.2 && n.patch === 0);
  assert.ok(GM.lightState('sun', 6.1).tint[2] < 0.85 && GM.lightState('sun', 12).tint[2] >= 1, 'low sun is amber');
});

test('the glass shader has no procedural variation (same key -> same pixels)', () => {
  const src = fs.readFileSync(path.join(assets, 'glass_view.js'), 'utf8');
  const fs0 = src.slice(src.indexOf('var GLASS_FS'), src.indexOf('var GLOW_VS'));
  assert.ok(fs0.length > 200);
  for (const bad of ['rand', 'noise', 'hash', 'fract(', 'sin(', 'time', 'seed']) assert.ok(!fs0.includes(bad), bad);
});
