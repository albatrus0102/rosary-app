// 미리 굽는 AO(ao_bake.mjs·ao_bvh.mjs·assets/church/ao_fx.js, docs/church/RENDER_V3.md §2) 시험.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { buildBVH, makeTracer, hemiDirs, aoAt } from './ao_bvh.mjs';
import { bakeChurch, checkFresh, loadForBake, encodePNG, checksum, ASSETS, B64, BAKE } from './ao_bake.mjs';

// 바닥(20×20, 위) + 상자(1×1×1, 바깥 법선) — 상자 밑동의 바닥은 어둡고, 먼 바닥은 열려 있다
function scene() {
  const tris = [], fn = [], two = [];
  const quad = (a, b, c, d, n) => { tris.push(...a, ...b, ...c, ...a, ...c, ...d); fn.push(...n, ...n); two.push(0, 0); };
  quad([-10, 0, -10], [-10, 0, 10], [10, 0, 10], [10, 0, -10], [0, 1, 0]);
  const B = (x0, y0, z0, x1, y1, z1) => {
    quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
    quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]);
  };
  B(-0.5, 0, -0.5, 0.5, 1, 0.5);
  return buildBVH(new Float32Array(tris), new Float32Array(fn), new Uint8Array(two));
}

test('AO 광선 추적: 상자 밑동은 어둡고 먼 바닥·상자 윗면은 열려 있다, 묻힌 점은 뒷면을 가림으로 치지 않는다', () => {
  const bvh = scene(), tr = makeTracer(bvh), dirs = hemiDirs(32), o = [0, 0];
  const open = aoAt(tr, dirs, 2, 6, 0, 6, 0, 1, 0, o)[0];
  const foot = aoAt(tr, dirs, 2, 0.55, 0, 0, 0, 1, 0, o)[0];
  const top = aoAt(tr, dirs, 2, 0, 1, 0, 0, 1, 0, o)[0];
  const wallLow = aoAt(tr, dirs, 2, 0.5, 0.05, 0, 1, 0, 0, o)[0];
  assert.ok(open > 0.99, 'open ' + open);
  assert.ok(top > 0.99, 'top ' + top);
  assert.ok(foot < 0.8, 'foot ' + foot);
  assert.ok(wallLow < 0.85, 'wall low ' + wallLow);
  const inside = aoAt(tr, dirs, 2, 0, 0.5, 0, 0, 1, 0, o);
  assert.ok(inside[1] > 0.9, '상자 속 점은 묻힘 ' + inside[1]);
  // 결정적: 같은 입력 → 같은 값
  assert.equal(aoAt(tr, dirs, 2, 0.55, 0, 0, 0, 1, 0, [0, 0])[0], foot);
});

test('PNG 인코더: 서명·크기·결정적', () => {
  const rgb = new Uint8Array(5 * 3 * 3); for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) & 255;
  const a = encodePNG(5, 3, rgb), b = encodePNG(5, 3, rgb);
  assert.deepEqual(a, b);
  assert.equal(a.slice(1, 4).toString(), 'PNG');
  assert.equal(a.readUInt32BE(16), 5); assert.equal(a.readUInt32BE(20), 3);
});

test('굽기는 결정적이다(작업자 수와 무관하게 바이트까지 같다) — 당고개, 광선 8개', async () => {
  const H1 = await loadForBake(['danggogae']), H2 = await loadForBake(['danggogae']);
  const c1 = H1.churches.find((c) => c.id === 'danggogae'), c2 = H2.churches.find((c) => c.id === 'danggogae');
  const a = await bakeChurch(c1, H1.Logic, { rays: 8, workers: 1 });
  const b = await bakeChurch(c2, H2.Logic, { rays: 8, workers: 3 });
  assert.equal(a.text, b.text);
  a.data.b.forEach((e) => { assert.equal(e.d.length, e.n); assert.ok(/^[A-Za-z0-9+/]*$/.test(e.d)); });
  assert.ok(a.data.f && a.data.f.w > 10 && a.data.f.h > 10, 'floor map');
});

test('ao_<성당>.js 가 지금 빌더 지오메트리와 맞다(빌더를 고쳤으면: node tools/church_web/ao_bake.mjs <성당>)', async () => {
  const H = await loadForBake(null);
  const r = checkFresh(H.churches);
  const bad = r.filter((x) => !x.ok);
  assert.deepEqual(bad, [], JSON.stringify(bad));
  assert.ok(r.length >= 10);
});

test('ao_<성당>.js 크기·형식: 정점 글자 수 = 정점 수, 성당마다 ≤ 600KB, 합 ≤ 3.5MB, 바닥 PNG 크기 = 격자', () => {
  const files = fs.readdirSync(ASSETS).filter((f) => /^ao_[a-z]+\.js$/.test(f) && f !== 'ao_fx.js');
  assert.ok(files.length >= 10, files.join(','));
  let total = 0;
  files.forEach((f) => {
    const src = fs.readFileSync(path.join(ASSETS, f), 'utf8');
    total += src.length;
    assert.ok(src.length <= 600 * 1024, f + ' ' + src.length);
    const sb = { window: {} }; vm.createContext(sb); vm.runInContext(src, sb);
    const id = f.slice(3, -3), d = sb.window.ChurchAOBake[id];
    assert.equal(d.v, BAKE.v); assert.equal(d.rays, BAKE.rays);
    d.b.forEach((e) => assert.equal(e.d.length, e.n, f + ' ' + e.name));
    assert.ok(d.f, f + ' floor');
    const png = Buffer.from(d.f.png.split(',')[1], 'base64');
    assert.equal(png.readUInt32BE(16), d.f.w); assert.equal(png.readUInt32BE(20), d.f.h);
    assert.ok(d.f.cell > 0.05 && d.f.cell <= 0.25);
  });
  assert.ok(total <= 3.5 * 1024 * 1024, 'total ' + total);
});

test('앱 쪽 해독(ao_fx.js)이 굽기와 같은 식: 검사합·64단계 글자 → 가림 바이트·근사 AO 대체', () => {
  const sb = { THREE: { Vector4: function () {}, Vector2: function () {} } }; sb.window = sb;
  vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ASSETS, 'ao_fx.js'), 'utf8'), sb);
  const F = sb.ChurchAOFx;
  const P = [1.25, -3.5, 7, 0.001, 2, -9.75];
  assert.equal(F.checksum(P), checksum(P));
  assert.equal(F.B64, B64);
  const occ = F.decode('A/g', 3);
  assert.deepEqual(Array.from(occ), [255, 0, 255 - Math.round(32 * 255 / 63)]);   // 'A' = 0(막힘) → 가림 255, '/' = 63(열림) → 0
  const h = F.heuristic({ p: [0, 0, 0, 0, 5, 0], n: [1, 0, 0, 1, 0, 0] });
  assert.ok(h[0] > 80 && h[1] < 5, Array.from(h).join(','));   // 벽 밑동은 어둡게, 높은 곳은 열림
});
