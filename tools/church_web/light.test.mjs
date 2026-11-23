// 빛의 성당(ch_light.js, 가상 성당 1단계) 시험: 등록 · 창 20개의 묵주 순서 · 제단 출입 금지 · 건물 밖으로 못 나감 ·
// 이 성당만 걷는 속도 1.1 m/s · 순례 정거장 46곳(걸을 수 있는 곳·묵주 순서·제단 정거장은 난간 밖) · 구역(Z1~Z7).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const RV = require('../../assets/church/reverence.js');
const Pilgrim = require('../../assets/church/light_pilgrim.js');

const { churches } = loadChurches();
const light = churches.find((c) => c.id === 'light');
const B = light.builder;
const L = Logic.create(light.layout, { colliders: light.colliders, zones: light.zones });

// 스폰에서 걸어서 닿는 칸(0.5 m 격자, 이웃 4방향 + 가운데 점까지 비어 있어야 이어진다)
const CELL = 0.5, b = light.layout.bounds;
const NX = Math.ceil((b.x1 - b.x0) / CELL), NZ = Math.ceil((b.z1 - b.z0) / CELL);
const tmp = { x: 0, z: 0 };
const freeAt = (x, z) => { tmp.x = x; tmp.z = z; return !L.moveCircle(tmp, 0, 0) && Math.abs(tmp.x - x) < 1e-9 && Math.abs(tmp.z - z) < 1e-9; };
const cx = (i) => b.x0 + (i + 0.5) * CELL, cz = (j) => b.z0 + (j + 0.5) * CELL;
const reach = new Uint8Array(NX * NZ);
(function flood() {
  const free = new Int8Array(NX * NZ).fill(-1);
  const isFree = (i, j) => { const k = j * NX + i; if (free[k] < 0) free[k] = freeAt(cx(i), cz(j)) ? 1 : 0; return free[k] === 1; };
  const si = Math.floor((L.spawn.x - b.x0) / CELL), sj = Math.floor((L.spawn.z - b.z0) / CELL);
  assert.ok(isFree(si, sj), '스폰이 비어 있다');
  const q = [si, sj]; reach[sj * NX + si] = 1;
  while (q.length) {
    const j = q.pop(), i = q.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ || reach[nj * NX + ni]) continue;
      if (!isFree(ni, nj) || !freeAt((cx(i) + cx(ni)) / 2, (cz(j) + cz(nj)) / 2)) continue;
      reach[nj * NX + ni] = 1; q.push(ni, nj);
    }
  }
})();
const reachable = (x, z) => {
  const i = Math.floor((x - b.x0) / CELL), j = Math.floor((z - b.z0) / CELL);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < NX && jj < NZ && reach[jj * NX + ii]) return true; }
  return false;
};
// 건물(+광장) 바닥 모양: 이 밖의 칸에 닿으면 벽이 새는 것
function inside(x, z, tol = 0.35) {
  const r = Math.hypot(x, z);
  return (Math.abs(x) <= 24 + tol && z >= 186 - tol && z <= 206.5 + tol) ||            // 광장
    (Math.abs(x) <= 9 + tol && z >= 142 - tol && z <= 186 + tol) ||                     // 전실 세로 팔
    (Math.abs(x) <= 30 + tol && z >= 150 - tol && z <= 168 + tol) ||                    // 전실 가로대
    (Math.abs(x) <= 8 + tol && z >= 80 - tol && z <= 142 + tol) ||                      // 구슬 회랑
    (Math.hypot(x, z - 68.5) <= 12 + tol) ||                                            // 메달 홀
    (Math.abs(x) <= 4.5 + tol && z >= 54 - tol && z <= 58 + tol) ||                     // 로툰다 서문 통로
    r <= 57.6 + tol;                                                                    // 로툰다(경당 고리 포함)
}

test('등록: 빌더 블록·레이아웃·가상 성당 표시, 실제 치수(100%)', () => {
  for (const page of ['index.html', 'test.html']) {
    const s = fs.readFileSync(path.join(assets, page), 'utf8');
    assert.match(s, /<script src="ch_light\.js"><\/script>/, page);
  }
  assert.equal(light.layout.id, 'light');
  assert.equal(light.layout.scalePercent, 100);
  assert.equal(light.layout.fictional, true);
  assert.equal(B.fictional, true);
  // 출시 빌드에서 숨김: 창 그림 팩 폴더는 번들 제외 목록에 있고 pubspec 에 없다(Flutter 쪽 관문은 test/release_gate_test.dart)
  const hidden = fs.readFileSync(path.resolve(here, '../release_hidden_assets.txt'), 'utf8');
  assert.match(hidden, /^assets\/church\/light\/$/m);
  assert.doesNotMatch(fs.readFileSync(path.resolve(here, '../../pubspec.yaml'), 'utf8'), /- assets\/church\/light\//);
  const gate = fs.readFileSync(path.resolve(here, '../../lib/app/release_gate.dart'), 'utf8');
  assert.match(gate, /unreleasedChurchIds = \{'light'\}/);
});

test('신비 경당 20칸: 서문에서 시계 방향으로 환희 1~5 → 빛 1~5 → [제단] → 고통 1~5 → 영광 1~5, 창은 파일 이름으로', () => {
  const keys = JSON.parse(JSON.stringify(B.chapels.map((c) => c.key)));   // vm 안 배열 → 이 쪽 배열
  assert.deepEqual(keys, Pilgrim.mysteryOrder);
  assert.equal(keys.length, 20);
  for (let i = 1; i < 20; i++) assert.ok(B.chapels[i].theta < B.chapels[i - 1].theta, '시계 방향(설계 각이 줄어든다) ' + keys[i]);
  assert.ok(B.chapels[0].theta < 165 && B.chapels[0].theta > 150, '환희 1단은 서문(입구) 바로 북쪽');
  const l5 = B.chapels[9], s1 = B.chapels[10];
  assert.ok(l5.theta > 15 && s1.theta < -15, '제단(동, ±15°)은 빛 5단과 고통 1단 사이');
  // 북문(80~100) 은 환희 5단과 빛 1단 사이, 남문(−100~−80)은 고통 5단과 영광 1단 사이
  assert.ok(B.chapels[4].theta > 100 && B.chapels[5].theta < 80);
  assert.ok(B.chapels[14].theta > -80 && B.chapels[15].theta < -100);
  // 창 팩: 신비마다 art/light_cathedral/windows/<key>.webp 에서 만든 그림(파일 이름만 바꾸면 다시 걸린다)
  const packSrc = fs.readFileSync(path.join(assets, 'light/gpack_light.js'), 'utf8');
  const pack = JSON.parse(packSrc.slice(packSrc.indexOf('{'), packSrc.lastIndexOf('}') + 1));
  for (const k of keys) {
    assert.equal(pack.src[k], 'art/light_cathedral/windows/' + k + '.webp', k);
    assert.ok(pack.near[k] && pack.near[k].w > 0 && pack.far.cells[k], k);
  }
  // 창은 경당 뒷벽 가운데(반지름 56.4)를 향해 안쪽을 본다
  for (const c of B.chapels) {
    assert.ok(Math.abs(Math.hypot(c.window.x, c.window.z) - 56.38) < 0.05, c.key);
    assert.ok(c.window.nx * c.window.x + c.window.nz * c.window.z < 0, c.key + ' 법선이 안쪽');
  }
  assert.equal(B.partitions.length, 24);
});

test('제단(난간 뒤)은 걸어 들어갈 수 없다: 금지 구역 + 난간·칸막이, 제대·감실은 닿지 않는다', () => {
  const rv = L.reverence;
  assert.ok(rv && rv.zone, '금지 구역');
  assert.ok(rv.zone.z1 <= -24.1 && rv.zone.z0 <= -70 && rv.zone.x0 <= -13 && rv.zone.x1 >= 13, JSON.stringify(rv.zone));
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    if (!reach[j * NX + i]) continue;
    const x = cx(i), z = cz(j);
    assert.ok(!(z < -24.2 && Math.abs(x) < 13), `제단 안 (${x},${z})에 닿음`);
  }
  for (const p of [[0, -40], [0, -50], [0, -66], [-12, -45], [12, -45], [0, -27]]) assert.ok(!reachable(p[0], p[1]), '닿음: ' + p);
  // 제대 앞 자리(난간 앞)는 닿는다
  assert.ok(reachable(0, -22.9));
  // 누르기 이동(경로 탐색)도 들어가지 못한다
  const S = Stations.create(L);
  assert.equal(S.findPath({ x: 0, z: -20 }, { x: 0, z: -38 }), null);
});

test('건물 밖으로 나갈 수 없다: 스폰에서 닿는 모든 칸이 건물·광장 바닥 안이고, 북·남문은 닫혀 있다', () => {
  let n = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    if (!reach[j * NX + i]) continue;
    n++;
    assert.ok(inside(cx(i), cz(j)), `건물 밖 (${cx(i)}, ${cz(j)})`);
  }
  assert.ok(n > 30000, '닿는 칸이 너무 적다: ' + n);
  // 북문 밖(세례당 자리)·남문 밖(회랑 자리)은 닿지 않는다(2단계)
  assert.ok(!reachable(-62, 0) && !reachable(62, 0));
  // 주요 곳은 닿는다: 광장 · 전실 가로대 끝 · 구슬 방 · 메달 홀 · 로툰다 · 경당 · 반대편 경당
  for (const p of [[0, 200], [-28, 159], [27, 159], [0, 133], [0, 111], [0, 88], [0, 69], [0, 0], [0, 38], [-38, 0], [38, 0], [0, 49.5]]) assert.ok(reachable(p[0], p[1]), '닿지 않음: ' + p);
});

test('걷는 속도: 빛의 성당만 1.1 m/s(조이스틱·누르기 이동), 다른 성당은 그대로 WALK_SPEED', () => {
  assert.equal(light.layout.walkSpeed, 1.1);
  assert.equal(L.walkSpeed, 1.1);
  const o = {};
  L.joyToVelocity(0, 1, 0, o);
  assert.ok(Math.abs(o.speed - 1.1) < 1e-9 && Math.abs(o.vz + 1.1) < 1e-9);
  const S = Stations.create(L), w = S.startWalk({ pts: [{ x: 0, z: 0 }, { x: 0, z: -10 }], len: 10 }, { x: 0, z: -10 }, 'altar'), out = {};
  S.stepWalk(w, { x: 0, z: 0 }, 0.016, out);
  assert.ok(Math.abs(out.speed - 1.1) < 1e-9, '누르기 이동 ' + out.speed);
  for (const c of churches) {
    if (c.id === 'light') continue;
    assert.equal(c.layout.walkSpeed, undefined, c.id);
    const Lc = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones, reverence: false });
    assert.equal(Lc.walkSpeed, Logic.C.WALK_SPEED, c.id);
    Lc.joyToVelocity(0, 1, 0, o);
    assert.ok(Math.abs(o.speed - Logic.C.WALK_SPEED) < 1e-9, c.id);
  }
  // 문(광장) → 제대 앞 걷는 길: 3분 안팎(설계 「문 → 제단 앞 210 m」)
  const S2 = Stations.create(L), path2 = S2.findPath({ x: 0, z: 186.5 }, { x: 0, z: -22.9 });
  assert.ok(path2, '길');
  const sec = path2.len / 1.1;
  assert.ok(sec > 170 && sec < 220, `문 → 제대 앞 ${path2.len.toFixed(0)} m, ${sec.toFixed(0)} 초`);
});

test('순례 정거장 46곳: 설계 문구 그대로, 걸을 수 있는 곳, 묵주 순서, 제단 정거장은 난간 밖', () => {
  const st = Pilgrim.stops;
  assert.equal(st.length, 46);
  st.forEach((s, i) => { assert.equal(s.n, i + 1); assert.ok(s.title && s.what && s.meaning, s.id); });
  assert.equal(st[0].title, '광장의 묵주 지도');
  assert.equal(st[26].title, '제단 앞');
  assert.equal(st[26].meaning, '최후의 만찬과 수난 사이에 제대가 있다. 미사는 그 둘을 하나로 잇는다');
  assert.equal(st[45].what, '로툰다 바닥 돌 상감이 구슬 59알의 묵주를 그리며 입구로 되돌아간다');
  // 신비 정거장: 경당 순서와 같다(15~19 환희, 22~26 빛, 32~36 고통, 40~44 영광)
  const myst = st.filter((s) => s.kind === 'mystery');
  assert.deepEqual(myst.map((s) => s.window), Pilgrim.mysteryOrder);
  assert.deepEqual(myst.map((s) => s.n), [15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 32, 33, 34, 35, 36, 40, 41, 42, 43, 44]);
  myst.forEach((s) => { const c = B.chapels.find((cc) => cc.key === s.window); assert.ok(Math.hypot(s.at.x - c.center.x, s.at.z - c.center.z) < 0.05, s.id); });
  for (const s of st) {
    if (!s.built) { assert.ok(s.zone === 'Z6' || s.zone === 'Z7', s.id); assert.ok(!reachable(s.at.x, s.at.z), s.id + ' 2단계 자리는 아직 닫혀 있다'); continue; }
    assert.ok(reachable(s.at.x, s.at.z), `${s.id} ${s.title} (${s.at.x}, ${s.at.z}) 에 닿지 않음`);
    assert.ok(!L.reverence.inZone(s.at.x, s.at.z, 0.3), s.id + ' 금지 구역 안');
    assert.equal(B.zoneOf(s.at.x, s.at.z), s.zone, s.id + ' 구역');
  }
  for (const n of [27, 28, 29, 30, 31]) { const s = st[n - 1]; assert.ok(s.at.z > -24.2, s.id + ' 난간 밖'); assert.ok(s.look.z < -24.4, s.id + ' 제단 쪽을 본다'); }
  // 순서: 큰 흐름은 입구 → 로툰다(정거장 1~12 의 z 가 줄어든다)
  for (let i = 1; i < 12; i++) assert.ok(st[i].at.z <= st[i - 1].at.z + 25, st[i].id);
});

test('구역 Z1~Z7: 자리마다 구역, 이웃 구역은 함께 그린다', () => {
  const zo = B.zoneOf;
  assert.equal(zo(0, 200), 'Z1'); assert.equal(zo(0, 159), 'Z1'); assert.equal(zo(0, 111), 'Z2'); assert.equal(zo(0, 69), 'Z3');
  assert.equal(zo(0, 0), 'Z4'); assert.equal(zo(-49, 5), 'Z5'); assert.equal(zo(0, -45), 'Z5b'); assert.equal(zo(-70, 0), 'Z6'); assert.equal(zo(70, 0), 'Z7');
  for (const z of B.zones) assert.ok(B.visible[z].indexOf(z) >= 0 || z === 'Z6' || z === 'Z7', z);
  assert.ok(B.visible.Z3.indexOf('Z4') >= 0 && B.visible.Z4.indexOf('Z3') >= 0, '메달 홀 ↔ 로툰다');
});

test('성능 예산(지오메트리): 구역 묶음 + 인스턴스 삼각형이 폰 예산(화면 17만) 안', () => {
  const st = B.runtime.stats;
  const zoneTris = Object.values(st.tris).reduce((a, c) => a + c, 0);
  assert.ok(zoneTris + st.instTris < 170000, `삼각형 ${zoneTris} + 인스턴스 ${st.instTris}`);
  assert.ok(light.colliders.length < 300, '충돌체 ' + light.colliders.length);
});

test('스캔 성상(light/ — 사도·경배 천사·메달 홀 성모자): 표 = 파일, 출처 표기(앱·licenses·ASSET_LICENSES), 묶음 예산, 빌더가 쓰는 자리', () => {
  const Scan = require('../../assets/church/scan3d.js');
  const keys = Object.keys(Scan.DEV_PACKS).sort();
  const files = fs.readdirSync(path.join(assets, 'light')).filter((f) => /^scan3d_[a-z_]+\.js$/.test(f)).map((f) => f.slice(7, -3)).sort();
  assert.deepEqual(files, keys);
  const repo = path.resolve(here, '../..'), read = (p) => fs.readFileSync(path.join(repo, p), 'utf8');
  const src = read('assets/church/ch_light.js') + read('assets/church/shrine_places.js');
  for (const k of keys) {
    const d = Scan.DEV_PACKS[k];
    assert.equal(d.dir, 'light/'); assert.deepEqual(Array.from(d.churches), ['light']);
    assert.ok(!Scan.PACKS[k], k + ' 는 앱 공용 표(PACKS)와 겹치지 않는다');
    const body = fs.readFileSync(path.join(assets, 'light', 'scan3d_' + k + '.js'), 'utf8');
    assert.ok(body.length <= 230 * 1024, k + ' ' + body.length);
    const url = (body.match(/https:\/\/sketchfab\.com\/3d-models\/[0-9a-f]{32}/) || [])[0];
    assert.ok(url, k + ' 원본 주소');
    for (const f of ['lib/domain/art_credits.dart', 'licenses/STATUE_SCANS.md', 'docs/church/ASSET_LICENSES.md']) assert.ok(read(f).includes(url), `${f} 에 ${url}`);
    assert.ok(src.includes("'" + k + "'"), k + ' 를 빛의 성당이 쓴다');
  }
  // 메달 홀 성모상: 실물 스캔(크루즐로바), 예비는 앱 공용 Meshy 성모상
  const Places = require('../../assets/church/shrine_places.js');
  assert.equal(Places.light.scan, 'madonna_kruzlowa'); assert.equal(Places.light.mesh, 'mary_meshy'); assert.equal(Places.light.kind, 'existing');
  // 바닥에 십자가를 두지 않는다(로툰다 묵주 상감 1단계 판의 늘어진 줄·십자가 제거 — 사용자 지시)
  assert.doesNotMatch(read('assets/church/ch_light.js'), /35\.9, 36\.1, 0x8a6a35/);
});
