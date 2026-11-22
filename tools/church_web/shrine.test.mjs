// 성모 기도 자리(shrine.js · shrine_places.js): 구조가 확정된 8개 성당에 자리 1곳, 걷기 경계 안, 기존 충돌체·좌석·14처 판·봉헌초와
// 겹치지 않음, 봉헌초 슬롯(맨 끝 14개), 스테이션(서는 자리) 존재·도달 가능. 구조 수정 중인 성 베드로(pending)은 자리 없음.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChurches } from './church_harness.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Places = require('../../assets/church/shrine_places.js');
const Shrine = require('../../assets/church/shrine.js');
const { churches, Logic, Stations, WayCross } = loadChurches();
const READY = ['basic', 'myeongdong', 'lateran', 'stpaul', 'milan', 'danggogae', 'maggiore', 'florence', 'stpeter', 'yeouido', 'assisi'], PENDING = [];
const by = Object.fromEntries(churches.map((c) => [c.id, c]));
const rect = (q) => q.r !== undefined && q.x0 === undefined ? { x0: q.x - q.r, x1: q.x + q.r, z0: q.z - q.r, z1: q.z + q.r } : { x0: Math.min(q.x0, q.x1), x1: Math.max(q.x0, q.x1), z0: Math.min(q.z0, q.z1), z1: Math.max(q.z0, q.z1) };
const overlap = (a, b, e = 0.02) => a.x0 < b.x1 - e && a.x1 > b.x0 + e && a.z0 < b.z1 - e && a.z1 > b.z0 + e;

test('table covers every church: 8 placed, 1 pending', () => {
  assert.deepEqual(Object.keys(Places).sort(), READY.concat(PENDING).sort());
  for (const id of PENDING) { assert.equal(Places[id].pending, true); assert.ok(Places[id].note); assert.equal(Shrine.placeOf(id), null); }
  for (const id of READY) { const p = Places[id]; assert.ok(['mary', 'plain', 'existing', 'pond'].includes(p.kind)); assert.ok(p.label_ko); assert.equal(p.yaw % 90, 0); }
});

for (const id of PENDING) test(`shrine ${id}: pending -> no place, layout untouched`, () => {
  const c = by[id];
  assert.equal(c.layout.shrine, undefined);
  assert.ok(c.layout.candles.stands.every((s) => !s.shrine));
});

for (const id of READY) test(`shrine ${id}: one place, clear, lightable, reachable`, () => {
  const c = by[id], lay = c.layout, p = Places[id], sh = lay.shrine, b = lay.bounds;
  assert.ok(sh, 'layout.shrine');
  const mine = lay.candles.stands.filter((s) => s.shrine);
  assert.equal(mine.length, 1);
  assert.equal(sh.stand, lay.candles.stands.length - 1, 'shrine stand is the last stand (existing slot ids unchanged)');
  assert.ok(mine[0].slots >= 12 && mine[0].slots <= 20);
  const fp = Shrine.footprint(p);
  assert.ok(fp.x0 >= b.x0 - 0.35 && fp.x1 <= b.x1 + 0.35 && fp.z0 >= b.z0 - 0.35 && fp.z1 <= b.z1 + 0.35, 'inside walk bounds');
  // 충돌체: 자리 충돌체가 들어 있고, 다른 충돌체·좌석 줄과 겹치지 않는다(existing 은 성상 받침과 맞닿기만)
  const own = c.colliders.filter((q) => q.x0 === fp.x0 && q.x1 === fp.x1 && q.z0 === fp.z0 && q.z1 === fp.z1);
  assert.equal(own.length, 1, 'own collider registered once');
  // 여러 층 성당(자리표 fy): 다른 층의 충돌체(높이 범위가 성상 층과 겹치지 않는 것)는 견주지 않는다
  const sameLevel = (q) => sh.fy === undefined || q.y0 === undefined || (q.y1 >= sh.fy + 0.15 && q.y0 <= sh.fy + 1.7);
  for (const q of c.colliders) if (q !== own[0] && sameLevel(q)) assert.ok(!overlap(fp, rect(q)), `overlaps collider ${JSON.stringify(q)}`);
  const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), st = S.stations();
  for (const q of L.bands) assert.ok(!overlap(fp, q), 'overlaps a pew row');
  // 다른 봉헌초 대·14처 판과 떨어져 있다
  lay.candles.stands.forEach((s) => { if (!s.shrine) assert.ok(Math.hypot(s.x - p.x, s.z - p.z) > 3, 'too close to a candle stand'); });
  const cw = WayCross.derive({ layout: lay, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  for (const q of cw.plaques || []) assert.ok(Math.hypot(q.x - p.x, q.z - p.z) > 1.2, 'too close to a cross plaque');
  // 슬롯: 맨 끝 14개, 서는 자리에서 닿는다
  const slots = L.slots.filter((s) => s.stand === sh.stand);
  assert.equal(slots.length, mine[0].slots);
  assert.equal(slots[0].slot, L.slots.length - slots.length);
  slots.forEach((s) => assert.ok(s.x >= fp.x0 && s.x <= fp.x1 && s.z >= fp.z0 && s.z <= fp.z1, 'slot on the stand'));
  // 스테이션: 무릎틀 바로 앞, 걸어서 갈 수 있고 초에 닿는다
  const stn = st.candle.find((q) => q.shrine);
  assert.ok(stn && stn.label === p.label_ko && stn.index === sh.stand);
  const f = Shrine.face(p), d = (stn.x - p.x) * f[0] + (stn.z - p.z) * f[1], lat = Math.abs((stn.x - p.x) * f[1] - (stn.z - p.z) * f[0]);
  if (p.kind === 'pond') assert.ok(d > 2.6 && d < 3.2 && lat < 0.6, `station in front of the pond (d ${d.toFixed(2)}, lat ${lat.toFixed(2)})`);
  else assert.ok(d > 1.35 && d < 2.0 && lat < 0.6, `station in front of the kneeler (d ${d.toFixed(2)}, lat ${lat.toFixed(2)})`);
  assert.ok(S.free(stn.x, stn.z, stn.y) && S.findPath(lay.spawn, stn), 'reachable from spawn');
  assert.ok(slots.some((s) => Math.hypot(s.x - stn.x, s.z - stn.z) <= 1.8));
  assert.equal(L.floorY(stn.x, stn.z, stn.y), sh.fy === undefined ? sh.y : sh.fy, 'station on the same floor as the shrine');
});

test('shrine danggogae: 입구 홀 오른쪽 성모상 앞 둥근 연못(지름 1.5m) — 원형 슬롯 18칸이 물 안에 있고 서로 겹치지 않는다', () => {
  const c = by.danggogae, lay = c.layout, p = Places.danggogae, st = lay.candles.stands;
  assert.equal(p.kind, 'pond');
  assert.ok(p.x > 6 && p.z > 11.4 && p.z < 15.6, '입구 홀 오른쪽(성당 문을 바라볼 때 +x)');
  assert.equal(st.length, 1, '입구 홀의 옛 48칸 봉헌초는 없애고 연못으로 일원화');
  assert.ok(st[0].pond && st[0].float && st[0].ring.length === 2);
  assert.equal(st[0].slots, 18); assert.equal(st[0].ring.reduce((n, r) => n + r.n, 0), 18);
  const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones });
  assert.equal(L.slots.length, 18);
  assert.ok(Math.abs(Math.hypot(st[0].x - p.x, st[0].z - p.z) - 1.5) < 1e-6, '연못 중심은 성상 앞 1.5m');
  for (const s of L.slots) {
    assert.ok(Math.hypot(s.x - st[0].x, s.z - st[0].z) <= Shrine.POND.R - 0.12, '물 안');
    assert.equal(s.float, true); assert.ok(Math.abs(s.y - Shrine.POND.WATER_Y) < 1e-9);
    for (const t of L.slots) if (t !== s) assert.ok(Math.hypot(s.x - t.x, s.z - t.z) > 0.24, '초끼리 겹침');
  }
  assert.equal(Shrine.POND.R * 2, 1.5);
});

test('shrine statues: 입체 성모상 — 자리마다 깊이·색 묶음(statue3d_<img>.js ≤ 200KB), 마조레만 성화 사진 그대로', () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../assets/church');
  const want = { danggogae: 'plain_white', basic: 'immaculate_blue', lateran: 'immaculate_blue', stpaul: 'immaculate_blue', milan: 'immaculate_blue', florence: 'immaculate_blue', myeongdong: 'hanbok_rosary' };
  for (const [id, key] of Object.entries(want)) assert.equal(Places[id].img, key, id);
  assert.equal(Places.maggiore.img, undefined); assert.equal(Places.stpeter.img, 'immaculate_blue');   // 성 베드로: 제대 위 입체 성모상(그림 제단화는 배경만) / 마조레: 성화 사진
  for (const key of new Set(Object.values(want))) {
    const src = fs.readFileSync(path.join(dir, 'statue3d_' + key + '.js'), 'utf8');
    assert.ok(src.length <= 200 * 1024, key + ' ' + src.length);
    const win = {}; new Function('window', src)(win);
    const a = win.ChurchArt.statues3d[key];
    assert.equal(a.w, 512); assert.equal(a.h, 1024); assert.ok(a.src.startsWith('data:image/webp;base64,') && a.depth.startsWith('data:image/png;base64,'));
    assert.ok(a.dw * 2 === a.dh && a.dw >= 96 && a.dw <= 128, 'depth grid');
    assert.ok(a.zmax > 0.08 && a.zmax < 0.25, 'front relief depth (m) ' + a.zmax);
  }
  assert.ok(Shrine.STATUE.H >= 1.3 && Shrine.STATUE.H <= 1.5);
  assert.ok(Shrine.STATUE.BACK > -0.245 && Shrine.STATUE.BACK + 0.25 < 0.28, '벽감 뒤판 앞, 앞면이 받침 위');
});

test('shrine 3D mesh: 명동(한복 그림 성상)·마조레(성화)를 뺀 모든 성모 자리가 Meshy 입체 성모상(mary_meshy)을 쓴다, 그림 변위는 예비', () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../assets/church');
  for (const id of READY) {
    const p = Places[id];
    if (id === 'myeongdong' || id === 'maggiore') { assert.equal(p.mesh, undefined, id + ' 는 입체 메쉬 없음'); continue; }
    assert.equal(p.mesh, 'mary_meshy', id);
    assert.ok(p.img && fs.existsSync(path.join(dir, 'statue3d_' + p.img + '.js')), id + ': 예비 그림 성상 묶음');
  }
  assert.equal(Places.myeongdong.img, 'hanbok_rosary');
  const src = fs.readFileSync(path.join(dir, 'statue3d_mary_meshy.js'), 'utf8');
  assert.ok(src.length <= 1024 * 1024, 'pack ≤ 1MB ' + src.length);
  const win = { atob: (s) => Buffer.from(s, 'base64').toString('binary') };
  new Function('window', 'atob', src)(win, win.atob);
  const a = win.ChurchArt.statues3d.mary_meshy;
  assert.ok(a.mesh && typeof a.load === 'function');
  assert.ok(a.meta.tris >= 25000 && a.meta.tris <= 40000, 'near tris ' + a.meta.tris);
  assert.ok(a.meta.farTris >= 4000 && a.meta.farTris <= 12000, 'far tris ' + a.meta.farTris);
  assert.ok(a.meta.h > 1.9 && a.meta.h < 1.91 && Math.abs(a.meta.min[1] - Shrine.MESH.Y_MIN) < 0.001, 'bounds');
  assert.equal(a.meta.src.generator, 'Meshy AI', 'Meshy 약관 2.4: 식별 표지(meta.src) 보존');
  assert.equal(a.meta.src.gltfAssetGenerator, 'xpostprocessing');
  assert.equal(a.meta.src.license, 'CC BY 4.0');
  assert.ok(Shrine.MESH.S * a.meta.h >= 1.4 && Shrine.MESH.S * a.meta.h <= 1.7, '성상 높이(받침 포함) 1.4~1.7m');
});

test('shrine 3D mesh: 묶음이 풀려 나온 기하 — 정점 공유·법선 단위길이·+Z 쪽 앞면', async () => {
  const fs = require('node:fs'), path = require('node:path');
  const T = require('../../assets/church/three.min.js');
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../assets/church');
  const win = {}; new Function('window', 'atob', fs.readFileSync(path.join(dir, 'statue3d_mary_meshy.js'), 'utf8'))(win, (s) => Buffer.from(s, 'base64').toString('binary'));
  const r = await win.ChurchArt.statues3d.mary_meshy.load(T);
  assert.equal(r.near.attributes.position, r.far.attributes.position, '정점 버퍼 공유');
  assert.equal(r.near.index.count / 3, r.meta.tris); assert.equal(r.far.index.count / 3, r.meta.farTris);
  const n = r.near.attributes.normal.array, P = r.near.attributes.position.array;
  for (let i = 0; i < n.length; i += 3 * 97) assert.ok(Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1) < 0.01, 'unit normal');
  // 얼굴(위쪽 앞)은 +Z 쪽: 머리 높이(y > 0.5) 정점의 z 최대가 최소보다 앞(+)에 치우친다
  let zs = 0, c = 0; for (let i = 0; i < P.length; i += 3) if (P[i + 1] > 0.55 && P[i + 1] < 0.75) { zs += P[i + 2]; c++; }
  assert.ok(zs / c > 0.0, '얼굴 높이 정점 평균 z > 0 (앞 +Z) ' + zs / c);
  for (const g of [r.near, r.far]) {   // 인덱스가 정점과 맞게 풀렸는지: 긴 변(> 0.1m)을 가진 삼각형은 평평한 받침 면뿐(≤ 3%)
    const I = g.index.array; let long = 0;
    for (let t = 0; t < I.length; t += 3) { const e = (i, j) => Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]); if (Math.max(e(I[t], I[t + 1]), e(I[t + 1], I[t + 2]), e(I[t], I[t + 2])) > 0.1) long++; }
    assert.ok(long / (I.length / 3) < (g === r.near ? 0.03 : 0.3), 'long-edge tris ' + long);
  }
  assert.ok(r.near.boundingSphere.radius > 0.9 && r.near.boundingSphere.radius < 1.1);
});

test('shrine statueMesh: 변위 격자 — 실루엣 밖 정점 제거·가장자리 1칸, 앞면 감김, 삼각형 예산(≤ 30k / 원거리 ≤ 5k)', () => {
  // 타원 실루엣(112×224)에 반타원 깊이: 그림 성상과 같은 크기의 격자
  const dw = 112, dh = 224, d = new Float32Array(dw * dh), sd = new Float32Array(dw * dh);
  for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) {
    const x = (i - 55.5) / 44, y = (j - 111.5) / 104, r = Math.hypot(x, y);
    d[j * dw + i] = r < 1 ? 0.15 * Math.sqrt(1 - r * r) + 0.002 : 0; sd[j * dw + i] = (r - 1) * 44;
  }
  const inside = d.filter((v) => v > 0).length;
  const m = Shrine.statueMesh(d, dw, dh, 0.71, 1.42, 1, sd), far = Shrine.statueMesh(d, dw, dh, 0.71, 1.42, 3, sd);
  assert.ok(m.verts > inside && m.verts < inside * 1.1, 'inside + one ring');
  assert.ok(m.tris <= 30000 && m.tris > inside * 1.8, 'near tris ' + m.tris);
  assert.ok(far.tris <= 5000 && far.tris > 1500, 'far tris ' + far.tris);
  let front = 0, maxOut = 0;
  for (let t = 0; t < m.idx.length; t += 3) {
    const P = (k) => m.pos.slice(m.idx[t + k] * 3, m.idx[t + k] * 3 + 3), a = P(0), b = P(1), c = P(2);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nz > 0) front++;
  }
  assert.equal(front, m.tris, 'every triangle faces +z (front)');
  for (let v = 0; v < m.verts; v++) {   // 바깥 고리 정점은 윤곽(타원) 위로 옮겨졌다
    const x = m.pos[v * 3] / 0.71 * 111 / 44, y = (1.42 - m.pos[v * 3 + 1]) / 1.42 * 223, r = Math.hypot(x, (y - 111.5) / 104);
    if (m.pos[v * 3 + 2] === 0) maxOut = Math.max(maxOut, Math.abs(r - 1) * 44);
  }
  assert.ok(maxOut < 0.6, 'ring snapped to silhouette (cells) ' + maxOut.toFixed(2));
  m.uv.forEach((u) => assert.ok(u >= -0.01 && u <= 1.01));
});

// 모든 성당의 성모 자리: 실제 성상(입체 성모상 묶음) 또는 실제 성화 사진이 있고(절차 그림 자리표시 아님), '가기' 메뉴에 성모상 줄이 있다.
for (const id of READY) test(`shrine ${id}: 실제 성모상(또는 성화 사진) + 가기 '성모상' 도착지(성상을 바라봄)`, () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../assets/church');
  const p = Places[id];
  if (p.img) {
    assert.ok(fs.existsSync(path.join(dir, 'statue3d_' + p.img + '.js')), 'statue3d bundle for ' + id);
    if (p.kind === 'existing') assert.ok(p.altar_h > 0.5 && p.altar_d < 0, 'altar_d/altar_h');   // 제대 위 성모상(성 베드로)
  } else {
    assert.equal(p.icon, true, id + ': img 도 icon 도 없음 = 성상이 없다');
    assert.ok(/salus/.test(fs.readFileSync(path.join(dir, 'art_maggiore.js'), 'utf8').slice(0, 400000)), '성화 사진 묶음');
    assert.ok(p.go_ko && p.go_ko !== '성모상', '성상이 아니라 성화이므로 가기 줄 이름이 다르다');
  }
  const c = by[id], L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L);
  const tg = S.station('shrine', undefined, c.layout.spawn);
  assert.ok(tg && tg.shrine, 'station(shrine)');
  assert.ok(S.findPath(c.layout.spawn, tg), 'walkable');
  const want = Math.atan2(-(p.x - tg.x), -(p.z - tg.z)), dy = Math.atan2(Math.sin(tg.yaw - want), Math.cos(tg.yaw - want));
  assert.ok(Math.abs(dy) < 0.01, 'faces the statue');
});
