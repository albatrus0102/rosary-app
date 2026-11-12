// 창 감상(G-11) 시험 — 색 정확도(ΔE2000)·윤곽 IoU·깜박임·질감 메모리. `node --test` 밖(헤드리스 swiftshader 로 몇 분).
// 사용: node tools/church_web/glasscolor.mjs [--only color,iou,flicker,mem] [--ids a,b] [--size 800x800] [--out dir]
//
// (1) 색: 감상실·기준광('ref')·정면·t2 로 그린 화면을, 같은 화면 사각형에 그린 마스터 사진(art/glass_masters/glass_<id>.webp, 4096,
//     없으면 2k)과 비교한다. 두 그림을 4×4 화소 블록으로 (선형 빛으로) 평균하고, 마스터 알파가 블록 전체에서 ≥250 인(윤곽 안쪽) 블록만
//     CIEDE2000 을 잰다(마스터 축소는 선형 빛 area 평균: grabMaster). 합격: 중앙값 ≤ 1.5, p95 ≤ 4.0, 채도 C*>20 블록의 평균 색상각 이동(부호 있는 평균) |Δh| ≤ 2°.
//     ※ 이 값이 재는 것: '렌더 파이프라인(질감 sRGB 디코드 → 선형 HDR → 최종 패스 → sRGB 출력)이 마스터 사진 값을 바꾸지 않는가'.
//       실제 유리의 색과 맞는지는 재지 않는다(사진 자체가 카메라가 본 색). 화면 리샘플링(GPU 밉맵 vs 2D 캔버스 축소) 차이도 섞여 있다.
//       SwiftShader 는 실기기 GPU 와 다를 수 있다(sRGB 디코드·필터 정밀도). 실기기는 브리지 캡처로 같은 계산을 한다(G2).
// (2) 깜박임: 고정 카메라 10프레임, 프레임마다 불투명 재질 depthFunc Less↔LessEqual(flicker.mjs 와 같은 방법), 32×32 블록 평균 차이 ≤ 2.0.
// (3) 윤곽: 창 판만 흰색으로(그 밖은 숨김) 그린 덮임 마스크(휘도 > 0.5)와 마스터 알파(≥128)의 IoU ≥ 0.98 (장미·랜싯·원형창 3개).
// (4) 메모리: 한 페이지에서 창 30개를 차례로 열면(t1→t2 교차 페이드 포함) 동시에 올라간 창 질감이 끝까지 2장 이하(__church.view.debug().stats).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THRESH as FLICKER_THRESH } from './flicker.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const GM = require('../../assets/church/glass_math.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const root = path.join(repo, 'assets/church');

export const LIMITS = { median: 1.5, p95: 4.0, hue: 2.0, iou: 0.98, flicker: FLICKER_THRESH, resident: 2 };
export const COLOR_IDS = ['rose_notredame_north', 'rose_chartres_north', 'lancet_cologne', 'oculus_florence_donatello', 'dove_stpeter', 'alabaster_stpaul_1', 'medallion_chartres'];
export const IOU_IDS = ['rose_notredame_north', 'lancet_chartres_belle', 'oculus_florence_donatello'];
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

function masterPath(id) {
  const m = path.join(repo, 'art/glass_masters', `glass_${id}.webp`);
  return fs.existsSync(m) ? m : path.join(root, `glass_${id}_2k.webp`);
}

export async function openView(browser, id, { size = '800x800', light = 'ref', tier = 't2', lodbias } = {}) {
  const [W, H] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: 'glass_room', hideui: '1', autotier: '0', msaa: '0', view: id, tier, light, ...(lodbias !== undefined ? { lodbias } : {}) }));
  await page.waitForFunction(() => (window.__churchEvents || []).some((e) => e.e === 'viewReady' || e.e === 'viewError'), null, { timeout: 180000, polling: 250 });
  await page.waitForFunction(() => { const d = __church.view.debug(); return d.idle && d.tierShown === d.tierReq; }, null, { timeout: 180000, polling: 250 });
  return { page, errors };
}

// 화면의 창 사각형(px) + 렌더 화소
export async function grabRender(page) {
  return page.evaluate(() => {
    const A = __church, c = document.getElementById('c'), m = A.view.meshes().glass, cam = A.camera;
    A.view.renderNow();
    const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
    const px = Array.from(g.getImageData(0, 0, c.width, c.height).data);
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox, pts = [[bb.min.x, bb.max.y], [bb.max.x, bb.min.y]].map(([x, y]) => { const v = new THREE.Vector3(x, y, 0).applyMatrix4(m.matrixWorld).project(cam); return [(v.x + 1) / 2 * c.width, (1 - v.y) / 2 * c.height]; });
    return { W: c.width, H: c.height, rect: [pts[0][0], pts[0][1], pts[1][0], pts[1][1]], px };
  });
}

// 마스터를 같은 화면 사각형으로 줄인 RGBA. 2D 캔버스의 drawImage 축소는 감마(sRGB) 공간에서 평균해 고운 납선 부분이 어둡게 나오므로,
// 원본 화소를 선형 빛으로 바꿔 화면 화소 칸에 모아(box/area) 평균한다(GPU 밉맵과 같은 선형 평균). 알파는 그대로 평균.
export async function grabMaster(page, id, W, H, rect) {
  const b64 = fs.readFileSync(masterPath(id)).toString('base64');
  return page.evaluate(async ({ b64, W, H, rect }) => {
    const img = new Image(); img.src = 'data:image/webp;base64,' + b64; await img.decode();
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const src = g.getImageData(0, 0, sw, sh).data;
    const lut = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; lut[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    const acc = new Float64Array(W * H * 5);
    const kx = (rect[2] - rect[0]) / sw, ky = (rect[3] - rect[1]) / sh;
    for (let y = 0; y < sh; y++) {
      const dy = Math.floor(rect[1] + (y + 0.5) * ky); if (dy < 0 || dy >= H) continue;
      for (let x = 0; x < sw; x++) {
        const dx = Math.floor(rect[0] + (x + 0.5) * kx); if (dx < 0 || dx >= W) continue;
        const i = (y * sw + x) * 4, o = (dy * W + dx) * 5, a = src[i + 3] / 255;
        acc[o] += lut[src[i]] * a; acc[o + 1] += lut[src[i + 1]] * a; acc[o + 2] += lut[src[i + 2]] * a; acc[o + 3] += a; acc[o + 4] += 1;
      }
    }
    const out = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const n = acc[i * 5 + 4]; if (!n) continue;
      const a = acc[i * 5 + 3];
      for (let k = 0; k < 3; k++) { const v = a > 0 ? acc[i * 5 + k] / a : 0; out[i * 4 + k] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
      out[i * 4 + 3] = Math.round(255 * a / n);
    }
    return Array.from(out);
  }, { b64, W, H, rect });
}

export function compareColor(R, M, W, H, rect, B = 4) {
  const x0 = Math.ceil(rect[0]), y0 = Math.ceil(rect[1]), x1 = Math.floor(rect[2]), y1 = Math.floor(rect[3]);
  const des = [], hues = []; let wsum = 0, hsum = 0;
  for (let by = y0; by + B <= y1; by += B) for (let bx = x0; bx + B <= x1; bx += B) {
    let ok = true; const r = [0, 0, 0], m = [0, 0, 0];
    for (let y = by; y < by + B && ok; y++) for (let x = bx; x < bx + B; x++) {
      const i = (y * W + x) * 4;
      if (M[i + 3] < 250) { ok = false; break; }
      for (let k = 0; k < 3; k++) { r[k] += GM.s2l(R[i + k] / 255); m[k] += GM.s2l(M[i + k] / 255); }
    }
    if (!ok) continue;
    const n = B * B, to8 = (v) => GM.l2s(v / n) * 255;
    const L1 = GM.srgbToLab(to8(m[0]), to8(m[1]), to8(m[2])), L2 = GM.srgbToLab(to8(r[0]), to8(r[1]), to8(r[2]));
    des.push(GM.deltaE2000(L1[0], L1[1], L1[2], L2[0], L2[1], L2[2]));
    const C = Math.hypot(L1[1], L1[2]);
    if (C > 20) { const dh = GM.hueDiff(GM.hueDeg(L1[1], L1[2]), GM.hueDeg(L2[1], L2[2])); hues.push(dh); wsum += C; hsum += dh * C; }
  }
  des.sort((a, b) => a - b);
  const habs = hues.map(Math.abs).sort((a, b) => a - b);
  return { blocks: des.length, median: +GM.percentile(des, 0.5).toFixed(3), p95: +GM.percentile(des, 0.95).toFixed(3), max: +des[des.length - 1].toFixed(2),
    hueMean: hues.length ? +(hsum / wsum).toFixed(3) : 0, hueAbsMedian: habs.length ? +GM.percentile(habs, 0.5).toFixed(3) : 0, hueBlocks: hues.length };
}

async function colorTest(browser, id, o) {
  const { page, errors } = await openView(browser, id, o);
  const r = await grabRender(page);
  const M = await grabMaster(page, id, r.W, r.H, r.rect);
  const res = compareColor(r.px, M, r.W, r.H, r.rect);
  const b16 = compareColor(r.px, M, r.W, r.H, r.rect, 16);   // 참고: 16×16 블록(리샘플링 차이를 더 지운 '색만'의 값)
  res.b16 = { median: b16.median, p95: b16.p95, hueMean: b16.hueMean };
  if (o.out) await page.screenshot({ path: path.join(o.out, `color_${id}.png`) });
  await page.close();
  res.pass = res.median <= LIMITS.median && res.p95 <= LIMITS.p95 && Math.abs(res.hueMean) <= LIMITS.hue && res.blocks > 500;
  return { id, ...res, errors };
}

async function iouTest(browser, id, o) {
  const { page, errors } = await openView(browser, id, o);
  const r0 = await grabRender(page);
  await page.evaluate(() => {
    const A = __church, keep = A.view.meshes().glass; A.__hid = [];
    A.scene.traverse((x) => { if ((x.isMesh || x.isSprite || x.isPoints) && x !== keep && x.visible) { x.visible = false; A.__hid.push(x); } });
    A.renderer.setClearColor(0x000000); A.view.setDebug(1);
  });
  const r = await grabRender(page);
  const M = await grabMaster(page, id, r.W, r.H, r.rect);
  let inter = 0, uni = 0;
  for (let i = 0; i < r.W * r.H; i++) {
    const a = r.px[i * 4] + r.px[i * 4 + 1] + r.px[i * 4 + 2] > 3 * 127.5, b = M[i * 4 + 3] >= 128;
    if (a && b) inter++; if (a || b) uni++;
  }
  // 화면 가로세로비 vs 카탈로그 비율(1% 이내)
  const cat = JSON.parse(fs.readFileSync(path.join(root, 'glass_catalog.json'), 'utf8')).windows.find((w) => w.id === id);
  const ar = (r.rect[2] - r.rect[0]) / (r.rect[3] - r.rect[1]), arErr = Math.abs(ar / cat.aspect_w_over_h - 1);
  await page.close();
  const iou = inter / Math.max(1, uni);
  return { id, iou: +iou.toFixed(4), aspectErr: +arErr.toFixed(4), pass: iou >= LIMITS.iou && arErr <= 0.01, errors, rect: r0.rect.map((v) => Math.round(v)) };
}

async function flickerTest(browser, id, o) {
  const { page, errors } = await openView(browser, id, { ...o, size: '640x640' });
  const r = await page.evaluate((N) => {
    const A = __church, c = document.getElementById('c'), W = c.width, H = c.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true });
    const mats = []; A.scene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []); ms.forEach((m) => { if (!m.transparent && m.depthTest !== false && mats.indexOf(m) < 0) mats.push(m); }); });
    const orig = mats.map((m) => m.depthFunc);
    function grab(f) { const df = (f % 2) ? THREE.LessEqualDepth : THREE.LessDepth; mats.forEach((m) => { m.depthFunc = df; }); A.view.renderNow(); g.drawImage(c, 0, 0); return g.getImageData(0, 0, W, H).data; }
    let prev = grab(0); const acc = new Float32Array(W * H);
    for (let f = 1; f <= N; f++) { const cur = grab(f); for (let i = 0, p = 0; i < W * H; i++, p += 4) acc[i] += (Math.abs(cur[p] - prev[p]) + Math.abs(cur[p + 1] - prev[p + 1]) + Math.abs(cur[p + 2] - prev[p + 2])) / 3 / N; prev = cur; }
    mats.forEach((m, i) => { m.depthFunc = orig[i]; });
    let worst = 0, sum = 0;
    for (let by = 0; by < Math.ceil(H / 32); by++) for (let bx = 0; bx < Math.ceil(W / 32); bx++) {
      let s = 0, n = 0; for (let y = by * 32; y < Math.min(H, by * 32 + 32); y++) for (let x = bx * 32; x < Math.min(W, bx * 32 + 32); x++) { s += acc[y * W + x]; n++; }
      worst = Math.max(worst, s / n);
    }
    for (let i = 0; i < W * H; i++) sum += acc[i];
    return { worst: +worst.toFixed(3), mean: +(sum / (W * H)).toFixed(4), idle: A.view.debug().idle };
  }, 10);
  await page.close();
  return { id, ...r, pass: r.worst <= LIMITS.flicker, errors };
}

async function memTest(browser, o) {
  const cat = JSON.parse(fs.readFileSync(path.join(root, 'glass_catalog.json'), 'utf8'));
  const ids = cat.windows.map((w) => w.id).slice(0, 30);
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + root + '/test.html?' + new URLSearchParams({ church: 'glass_room', hideui: '1', autotier: '0', msaa: '0', quality: 'low' }));
  await page.waitForFunction(() => window.__church && window.__church.world && window.__church.view, null, { timeout: 180000 });
  const trace = [];
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k];
    // 반은 t2 가 다 올라오기 전에(페이드 도중) 다음 창으로 넘긴다
    await page.evaluate((id) => ChurchAPI.viewWindow({ win: id, mode: 'room', tier: 't2', light: 'ref' }), id);
    await page.waitForFunction((id) => { const d = __church.view.debug(); return d.win === id && d.tierShown; }, id, { timeout: 120000, polling: 50 });
    if (k % 2 === 0) await page.waitForFunction(() => { const d = __church.view.debug(); return d.idle && d.tierShown === 't2'; }, null, { timeout: 120000, polling: 50 });
    trace.push(await page.evaluate(() => __church.view.debug().stats));
  }
  await page.evaluate(() => ChurchAPI.endView());
  const end = await page.evaluate(() => ({ stats: __church.view.debug().stats, ev: (window.__churchEvents || []).filter((e) => e.e === 'viewEnd' || e.e === 'viewError') }));
  await page.close();
  const peak = Math.max(...trace.map((s) => s.peak));
  const pass = peak <= LIMITS.resident && end.stats.resident === 0 && end.stats.created === end.stats.disposed && !end.ev.some((e) => e.e === 'viewError');
  return { windows: ids.length, peak, created: end.stats.created, disposed: end.stats.disposed, residentAfterEnd: end.stats.resident, maxMb: Math.max(...trace.map((s) => s.texMb)), events: end.ev, pass, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), o = {};
  let only = ['color', 'iou', 'flicker', 'mem'], ids = null;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--only') only = a[++i].split(','); else if (a[i] === '--ids') ids = a[++i].split(',');
    else if (a[i] === '--size') o.size = a[++i]; else if (a[i] === '--out') o.out = a[++i]; else if (a[i] === '--lodbias') o.lodbias = a[++i];
  }
  if (o.out) fs.mkdirSync(o.out, { recursive: true });
  const browser = await chromium.launch({ args: ARGS });
  let ok = true;
  const show = (r) => { console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${JSON.stringify(r)}`); ok = ok && r.pass && !(r.errors && r.errors.length); };
  if (only.includes('color')) for (const id of ids || COLOR_IDS) show(await colorTest(browser, id, o));
  if (only.includes('iou')) for (const id of ids || IOU_IDS) show(await iouTest(browser, id, o));
  if (only.includes('flicker')) for (const id of (ids || ['rose_notredame_north', 'dove_stpeter'])) show(await flickerTest(browser, id, o));
  if (only.includes('mem')) show(await memTest(browser, o));
  console.log('limits', JSON.stringify(LIMITS));
  await browser.close();
  process.exit(ok ? 0 : 1);
}
