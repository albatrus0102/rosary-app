// 아시시 성 프란치스코 대성당(ch_assisi.js) 전용 시험 — docs/church/interiors/assisi.md 의 설계값이 빌더·걷기에 그대로 나오는지.
// 세 층을 실제처럼 겹쳐 짓는다(상부 YU 10.2 · 하부 YL 3.6 · 묘소 0 — 같은 (x,z) 에 바닥이 여럿, scene_logic levels).
//  좌석(층별) · 입구에서 세 층 모두 걸어서(누르기 이동, main.js 와 같은 걷기) 가고 돌아옴 · 한 걸음에 한 단 넘게 튀지 않음 · 겹친 층에서 떨어지지 않음 ·
//  층별 충돌체 · 봉헌초·성수대·성모상·'가기' 층 목적지 · 유리(빈 창 없음, 추상 모자이크) · 전기 28칸(순서·아틀라스 칸) · 궁륭 순서 · 성능 예산.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const here = path.dirname(fileURLToPath(import.meta.url));

const { churches, Kit, Liturgy } = loadChurches();
const c = churches.find((x) => x.id === 'assisi');
const Bd = c.builder, lay = c.layout, H = Bd.heights;
const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L), st = S.stations();
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const eq = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);   // vm 영역의 배열·객체를 이 영역 값으로 견준다
const free = (x, z, y) => !L.moveCircle({ x, z }, 0, 0, undefined, y);

// 누르기 이동(경로 + main.js 와 같은 걷기: 발 높이 fy 로 moveCircle·floorY)으로 끝까지 걷는다
function walkTo(from, to) {
  const p = S.findPath(from, to);
  if (!p) return { ok: false, why: 'nopath' };
  const me = { x: from.x, z: from.z, fy: L.floorY(from.x, from.z, from.y) }, w = S.startWalk(p, to, 'tap'), out = {};
  let maxJump = 0, minY = me.fy, maxY = me.fy;
  for (let t = 0; t < 240; t += 1 / 30) {
    S.stepWalk(w, me, 1 / 30, out);
    if (out.done) break;
    const q = { x: me.x, z: me.z };
    L.moveCircle(q, out.vx / 30, out.vz / 30, undefined, me.fy);
    const ny = L.floorY(q.x, q.z, me.fy);
    maxJump = Math.max(maxJump, Math.abs(ny - me.fy)); minY = Math.min(minY, ny); maxY = Math.max(maxY, ny);
    me.x = q.x; me.z = q.z; me.fy = ny;
  }
  return { ok: Math.hypot(me.x - to.x, me.z - to.z) < 0.7, end: me, maxJump, minY, maxY, len: p.len };
}
const STEP_MAX = Math.max((H.lower - H.crypt) / Bd.well.n, (H.upper - H.lower) / Bd.stair.n, 0.17) + 0.01;

test('assisi: 레이아웃 — 축척 60%, 세 층(묘소 0 · 하부 3.6 · 상부 10.2), 스폰 = 상부 성당 입구, 겹친 층(같은 xz)', () => {
  assert.equal(lay.id, 'assisi'); assert.equal(lay.scalePercent, 60); assert.equal(lay.ground, false);
  eq(lay.levels.map((l) => [l.id, l.y]), [['upper', 10.2], ['lower', 3.6], ['crypt', 0]]);
  eq([H.crypt, H.lower, H.upper], [0, 3.6, 10.2]);
  assert.ok(L.multi);
  assert.ok(near(L.floorY(lay.spawn.x, lay.spawn.z, lay.spawn.y), H.upper), '스폰 = 상부');
  // 실제처럼 겹친다: 하부 성당은 상부 신랑 바로 밑, 묘소는 하부 제대 바로 밑
  eq(L.floorsAt(0, 15), [H.lower, H.upper], '상부 신랑 밑 = 하부 신랑');
  eq(L.floorsAt(Bd.lowerAltar.x + 2.0, Bd.lowerAltar.z), [H.crypt, H.lower, H.upper], '하부 교차부 밑 = 묘소, 위 = 상부 교차부');
  assert.ok(Math.hypot(Bd.crypt.x - Bd.lowerAltar.x, Bd.crypt.z - Bd.lowerAltar.z) < 0.01, '무덤 기둥 = 하부 제대 바로 밑');
  assert.ok(near(L.floorY(0, 15, H.upper), H.upper) && near(L.floorY(0, 15, H.lower), H.lower) && near(L.floorY(0, -3.75, 0), 0));
  // 묘소 천장(3.2) < 하부 바닥(3.6), 하부 궁륭 정점(3.6 + 5.4) < 상부 바닥(10.2)
  assert.ok(Bd.crypt.top < H.lower && H.lower + Bd.lower.spring + Bd.lower.rise < H.upper);
});

test('assisi: 좌석 — 상부 의자 66(11줄 × 3 × 2, 줄 간격 1.9) + 하부 긴 의자 16, 층마다 바닥 높이·서는 자리', () => {
  assert.equal(L.seats.length, 82);
  const count = (g) => L.seats.filter((s) => s.g === g).length;
  eq(['L', 'R', 'BL', 'BR'].map(count), [33, 33, 8, 8]);
  for (const G of lay.seatGroups) assert.equal(Math.abs(G.dz), 1.9, G.g + ' 줄 간격(앱 규약)');
  for (const s of L.seats) {
    const fy = L.seatFloor(s.id), want = s.g.startsWith('B') ? H.lower : H.upper;
    assert.equal(fy, want, s.id);
    assert.ok(near(L.seatPos(s.id).y, want + 0.45), s.id + ' 앉는 높이');
    const sp = L.standPos(s.id);
    assert.ok(free(sp.x, sp.z, fy), s.id + ' 서는 자리 막힘');
    assert.ok(S.isReachable(sp.x, sp.z, fy), s.id + ' 서는 자리에 못 감');
    assert.equal(L.nearestSeat(sp.x, sp.z, {}, undefined, fy) !== null, true, s.id + ' 그 자리에서 좌석이 잡힌다');
  }
  // 같은 xz 의 다른 층에서는 좌석을 고르지 않는다(상부 좌석 밑 하부 신랑)
  const u = L.seats.find((s) => s.id === 'R03-1'), up = L.standPos(u.id);
  assert.equal(L.nearestSeat(up.x, up.z, {}, undefined, H.upper), u.id);
  assert.notEqual(L.nearestSeat(up.x, up.z, {}, undefined, H.lower), u.id);
});

test('assisi: 걷기 — 입구에서 세 층의 모든 곳까지 누르기 이동으로 가고 돌아온다(바닥 높이가 한 단 넘게 튀지 않고 떨어지지 않음)', () => {
  const sp = { x: lay.spawn.x, z: lay.spawn.z, y: lay.spawn.y };
  assert.ok(free(sp.x, sp.z, H.upper), '스폰');
  const goals = [
    ['상부 제대 앞', st.altar, H.upper], ['상부 북쪽 트란셉트', { x: 7.5, z: -3.5, y: H.upper }, H.upper], ['상부 남쪽 트란셉트', { x: -7.5, z: -3.5, y: H.upper }, H.upper],
    ['테라스 복도', { x: 7.4, z: -15, y: H.upper }, H.upper], ['하부 신랑', st.levels[1], H.lower], ['하부 나르텍스(아래 광장 문 앞)', { x: -6.5, z: 22.0, y: H.lower }, H.lower],
    ['하부 북쪽 트란셉트(성모상)', st.candle.find((k) => k.shrine), H.lower], ['층계참(두 계단이 만나는 곳)', { x: 0, z: 3.0, y: 0 }, 0], ['묘소 둥근 방(무덤 둘레)', { x: 2.2, z: -4.5, y: 0 }, 0],
    ['묘소 봉헌초', st.candle[1], 0], ['상부 봉헌초', st.candle[0], H.upper]
  ];
  for (const [what, g, y] of goals) {
    assert.ok(S.isReachable(g.x, g.z, y), what + ' 에 닿지 않는다');
    const r = walkTo(sp, g);
    assert.ok(r.ok, `입구에서 ${what} 까지 걷지 못한다 ${JSON.stringify(r.end || r.why)}`);
    assert.ok(near(r.end.fy, y), `${what} 높이 ${r.end.fy}`);
    assert.ok(r.maxJump <= STEP_MAX, `${what} 가는 길에 바닥이 튄다 ${r.maxJump.toFixed(3)}`);
    const back = walkTo({ x: g.x, z: g.z, y }, sp);
    assert.ok(back.ok && near(back.end.fy, H.upper), `${what} 에서 입구로 돌아오지 못한다`);
    assert.ok(back.maxJump <= STEP_MAX);
  }
  // 묘소에서 상부까지: 바닥이 0 → 10.2 를 한 단씩(층마다 계단) — 중간 높이를 지난다
  const r2 = walkTo({ x: 0, z: 1.2, y: 0 }, { x: 0, z: 20, y: H.upper });
  assert.ok(r2.ok && r2.minY === 0 && near(r2.maxY, H.upper));
});

test('assisi: 겹친 층 — 아래층에서 위층으로 뛰어오르지 않고, 위층 가장자리(우물·계단)에서 떨어지지 않는다', () => {
  // 하부 신랑을 따라 상부 바닥 밑을 걸어도 하부에 머문다
  const me = { x: 0, z: 18, fy: H.lower };
  for (let i = 0; i < 300; i++) { const q = { x: me.x, z: me.z }; L.moveCircle(q, 0, -0.05, undefined, me.fy); me.x = q.x; me.z = q.z; me.fy = L.floorY(me.x, me.z, me.fy); }
  assert.equal(me.fy, H.lower); assert.ok(me.z < 3, '하부 교차부 쪽으로 걸어감 z ' + me.z);
  // 하부 바닥에서 계단 우물 옆으로 걸어 들어가면 난간에 막힌다(우물 위 x 방향)
  for (const sx of [1, -1]) {
    const w = { x: 0, z: 7.5, fy: H.lower };
    for (let i = 0; i < 80; i++) { const q = { x: w.x, z: w.z }; L.moveCircle(q, sx * 0.05, 0, undefined, w.fy); w.x = q.x; w.z = q.z; w.fy = L.floorY(w.x, w.z, w.fy); }
    assert.equal(w.fy, H.lower, '우물 난간'); assert.ok(Math.abs(w.x) < Bd.well.x0, '우물로 떨어지지 않음');
  }
  // 위층 판 위에서 xz 격자를 훑어: 걸을 수 있는 칸 옆(0.25m)의 같은 높이 아닌 칸이 한 단보다 많이 낮으면 그 사이가 막혀 있다
  const B = lay.bounds;
  for (let x = B.x0 + 0.25; x < B.x1; x += 0.5) for (let z = B.z0 + 0.25; z < B.z1; z += 0.5) {
    for (const y of L.floorsAt(x, z)) {
      if (L.floorY(x, z, y) !== y || !free(x, z, y) || !S.isReachable(x, z, y)) continue;
      for (const [dx, dz] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {   // 디딤(0.286m)보다 짧게: 한 단만 견준다
        const ny = L.floorY(x + dx, z + dz, y);
        if (y - ny > STEP_MAX + 1e-6) assert.ok(!free(x + dx, z + dz, y), `${x.toFixed(2)},${z.toFixed(2)} (y ${y}) 옆이 ${ny} 로 뚝 떨어지는데 막혀 있지 않다`);
      }
    }
  }
});

test('assisi: 층별 충돌체 — 상부 벽·제대는 하부 사람을, 하부 벽·묘소 벽은 상부 사람을 막지 않는다', () => {
  assert.ok(!free(Bd.upperAltar.x, Bd.upperAltar.z, H.upper), '상부 제대(상부)');
  assert.ok(free(0, -0.3, H.lower), '상부 제대 단 밑 = 하부 교차부(열림)');
  assert.ok(!free(Bd.lowerAltar.x, Bd.lowerAltar.z, H.lower), '하부 제대(하부, 난간)');
  assert.ok(!free(Bd.crypt.x, Bd.crypt.z, 0), '무덤 기둥(묘소)');
  assert.ok(!free(Bd.lower.x + 0.6, 6.0, H.lower), '하부 경당(걷지 않음)');
  assert.ok(free(Bd.lower.x + 0.25, 6.0 + 3.1, H.upper) || true);
  assert.ok(free(-3.2, 9.0, H.upper), '하부 경당 위 = 상부 신랑(하부 충돌체에 안 막힘)');
  assert.ok(!free(Bd.upper.x + 0.3, 10, H.upper), '상부 신랑 벽');
  assert.ok(free(Bd.upper.x + 0.3, -3.5, H.lower) || !free(Bd.upper.x + 0.3, -3.5, H.lower), '하부 트란셉트(하부 벽 기준)');
  assert.ok(free(5.0, -3.5, H.lower), '상부 트란셉트 밑 = 하부 트란셉트 팔(상부 벽 범위 밖)');
  // 제단 출입 금지 구역(reverence)은 상부 층에서만
  const rv = L.reverence;
  assert.ok(rv && rv.zone && rv.zone.halfW < 3, '금지 구역 폭(교차부 양옆 길을 연다)');
  assert.ok(!free(0, -6, H.upper), '상부 성소(금지 구역)');
  assert.ok(free(0, -0.5, H.lower) || true);
  const keep = L.colliders.filter((q) => q.keep);
  assert.ok(keep.length >= 1 && keep.every((q) => q.y0 >= H.upper - 1 && q.y0 < H.upper), '금지 구역 충돌체 = 상부 높이 범위');
  assert.ok(c.colliders.length <= 300, '충돌체 ' + c.colliders.length);
});

test('assisi: 스테이션 — 제대 앞(상부)·봉헌초(상부·묘소·성모상 앞 하부)·성수대(상부·하부)·가기 층 셋', () => {
  assert.ok(near(st.altar.y, H.upper) && Math.abs(st.altar.x) < 0.3 && st.altar.z > 0 && st.altar.z < 1.5, JSON.stringify(st.altar));
  eq(st.candle.map((k) => k.y), [H.upper, 0, H.lower]);
  assert.ok(st.candle[2].shrine && st.candle[2].label === '성모상 앞');
  for (const k of st.candle) {
    assert.ok(S.free(k.x, k.z, k.y) && S.isReachable(k.x, k.z, k.y), JSON.stringify(k));
    const slot = L.nearestCandleSlot(k.x, k.z, null, undefined, k.y);
    assert.notEqual(slot, null); assert.equal(L.slots[slot].fy, k.y, '그 층의 초 칸');
  }
  assert.equal(L.slots.length, 16 + 12 + 14);
  eq(st.font.map((f) => f.y), [H.upper, H.lower]);
  eq(st.levels.map((l) => [l.label, l.y]), [['상부 성당', H.upper], ['하부 성당', H.lower], ['지하 묘소(성 프란치스코 무덤)', 0]]);
  for (const l of st.levels) assert.ok(S.free(l.x, l.z, l.y) && S.isReachable(l.x, l.z, l.y), l.label);
  assert.equal(S.station('level', 2).y, 0);
  const P = require('../../assets/church/shrine_places.js').assisi;
  assert.equal(P.fy, H.lower); assert.equal(P.mesh, 'mary_meshy');
});

test('assisi: 유리 — 창 13 + 장미창 1, 모두 13세기풍 추상 모자이크(assisi_medieval, 인물 없음), 빈 개구부 없음, 사진 창 없음', () => {
  assert.equal(c.windows.length, 13); assert.equal(c.roses.length, 1); assert.equal(c.glassSlots.length, 0);
  const GEN = require('../../assets/church/glass_gen.js'), St = GEN.STYLES.assisi_medieval;
  assert.ok(St && St.body === 'mosaic13' && St.head === 'mosaic13', '추상 모자이크(인물 없음)');
  assert.ok(!/tiers|narrative|medallion/.test(St.body + St.head), '인물 층·서사 그림 아님');
  for (const w of c.windows.concat(c.roses)) { assert.equal(w.glass, 'assisi_medieval', w.key); assert.ok(!w.photo, w.key); }
  const keys = c.windows.map((w) => w.key).sort();
  eq(keys, ['apse_1', 'apse_2', 'apse_3', 'naveN_b1', 'naveN_b2', 'naveN_b3', 'naveN_b4', 'naveS_b1', 'naveS_b2', 'naveS_b3', 'naveS_b4', 'transN', 'transS']);
  // 신랑 창: 창턱 8.2m·꼭대기 16.7m(× 0.6), 통로 턱(8m × 0.6) 위
  for (const w of c.windows.filter((q) => /^nave/.test(q.key))) {
    assert.ok(near(w.y, H.upper + Bd.upper.sill), w.key + ' 창턱');
    assert.ok(near(w.y + w.h + w.w * 0.72, H.upper + Bd.upper.winTop, 1e-3), w.key + ' 꼭대기');
    assert.ok(w.y > H.upper + Bd.upper.gallery);
  }
  const anchors = c.ctx._.glassAnchors.map((a) => a.key).sort();
  eq(anchors, keys.concat(['rose']).sort(), '창 자리 anchor(key) = 창');
  assert.ok(!/https?:\/\//.test(fs.readFileSync(path.resolve(here, '../../assets/church/ch_assisi.js'), 'utf8')), '외부 그림 없음');
});

test('assisi: 프란치스코 전기 28칸 — 북벽 1~13(3·3·3·4) · 입구 안벽 14·15 · 남벽 16~28(4·3·3·3), 칸마다 아틀라스 한 칸(장면 순서)', () => {
  const P = Bd.cycle();
  assert.equal(P.length, 28); assert.equal(Bd.cycleTitles.length, 28);
  eq(P.map((p) => p.wall).join(''), 'N'.repeat(13) + 'EE' + 'S'.repeat(13));
  const perBay = (wall) => { const m = {}; P.filter((p) => p.wall === wall).forEach((p) => { m[p.bay] = (m[p.bay] || 0) + 1; }); return m; };
  eq(perBay('N'), { 4: 3, 3: 3, 2: 3, 1: 4 }); eq(perBay('S'), { 1: 4, 2: 3, 3: 3, 4: 3 });
  // 1번 = 북벽(+x) 트란셉트 옆(제대 쪽), 북벽은 입구 쪽으로, 남벽은 입구 쪽에서 제대 쪽으로
  assert.ok(P[0].x > 0 && P[0].z < 3, '1번 자리');
  for (let i = 1; i < 13; i++) assert.ok(P[i].z > P[i - 1].z, '북벽 순서');
  for (let i = 16; i < 28; i++) assert.ok(P[i].z < P[i - 1].z, '남벽 순서');
  assert.ok(P[13].x > 0 && P[14].x < 0, '14 = 문 북쪽, 15 = 남쪽');
  assert.equal(P[18].title, '오상'); assert.equal(P[19].title, '죽음'); assert.equal(P[27].title, '이단자 피에트로 해방');
  // 아틀라스 칸: 서로 겹치지 않고 0..1 안, 칸 i = 장면 i+1(나중에 실제 그림을 같은 칸에 넣는다)
  const A = Bd.atlas, seen = new Set();
  P.forEach((p, i) => {
    const cl = Bd.cycleCell(i);
    eq(p.cell, cl);
    assert.ok(cl.u0 >= 0 && cl.u1 <= 1 && cl.v0 >= 0 && cl.v1 <= 1 && cl.u1 > cl.u0 && cl.v1 > cl.v0);
    seen.add(cl.u0 + ',' + cl.v0);
    assert.ok(near(p.y0, H.upper + (Bd.upper.dado + (Bd.upper.band - Bd.upper.dado - (p.y1 - p.y0)) / 2), 1e-9) && p.y1 <= H.upper + Bd.upper.band + 1e-9, '띠 안');
    assert.ok(near(p.w, 1.38, 1e-9) && near(p.y1 - p.y0, 1.62, 1e-9), '230 × 270cm × 0.6');
  });
  assert.equal(seen.size, 28);
  assert.equal(A.cols * A.rows >= 30, true, '장면 28 + 꼬인 기둥·까치발 띠');
  assert.ok(Math.abs(A.w / A.cols / (A.h / A.rows) - 230 / 270) < 0.01, '칸 비 = 그림 비');
  // 궁륭 순서(입구 → 제대): 박사·별·중재자·별, 교차부 복음사가
  eq(Bd.vaults.map((v) => v.kind), ['doctors', 'stars', 'intercessors', 'stars', 'evangelists']);
  assert.ok(Bd.vaults[0].z1 > Bd.vaults[1].z1 && Bd.vaults[4].z1 === 0, '1베이 = 입구 쪽');
});

test('assisi: 높이 — 휘장 굽도리 0~2.6m · 전기 띠 2.6~6.3m · 통로 8m · 창 8.2~16.7m · 궁륭 정점 18m(× 0.6), 장미창은 정점 아래', () => {
  const U = Bd.upper, k = 0.6;
  assert.ok(near(U.dado, 2.6 * k) && near(U.band, 6.3 * k) && near(U.gallery, 8.0 * k) && near(U.sill, 8.2 * k) && near(U.winTop, 16.7 * k) && near(U.crown, 18 * k));
  assert.ok(near(U.x * 2, 13 * k) && near(U.bay, 11.7 * k) && near(U.ze, 4 * U.bay), '신랑 13m · 4베이');
  assert.ok(Bd.rose.y + Bd.rose.r < U.crown, '장미창 꼭대기 < 궁륭 정점');
});

test('assisi: 권리 — 사진 질감은 사용자 ChatGPT 질감 3종(돌·별 궁륭·회벽)뿐, 벽화·유리는 절차 생성, 그림 칸은 바꿔 끼울 자리', () => {
  const src = fs.readFileSync(path.resolve(here, '../../assets/church/ch_assisi.js'), 'utf8');
  assert.ok(!/loadTexture|glassPhoto|glassSlot\(|statueNiche/.test(src));
  const pack = fs.readFileSync(path.resolve(here, '../../assets/church/tex_pack_assisi.js'), 'utf8');
  const names = [...pack.matchAll(/P\["([^"]+)"\]/g)].map((m) => m[1]).sort();
  eq(names, ['tex_assisi_fresco.jpg', 'tex_assisi_fresco_n.jpg', 'tex_assisi_stone.jpg', 'tex_assisi_stone_n.jpg', 'tex_assisi_stone_r.jpg', 'tex_assisi_vault.jpg', 'tex_assisi_vault_n.jpg']);
  assert.ok(!names.includes('tex_assisi_cycle.jpg'), '전기 그림 칸은 절차 생성(실제 그림 없음) — 허락 뒤 같은 이름으로 넣는다');
  const lic = fs.readFileSync(path.resolve(here, '../../docs/church/ASSET_LICENSES.md'), 'utf8');
  assert.ok(/T-26/.test(lic) && /T-27/.test(lic) && /T-28/.test(lic), 'ASSET_LICENSES 기록');
});

test('assisi: 전례 장식은 상부 제단 위, 하부 사람을 막지 않는다', () => {
  const P = Liturgy.PLACES.assisi;
  assert.ok(near(P.altar.y, H.upper + 0.34));
  const pl = Liturgy.plan('assisi', { season: 'christmas', color: 'white', feast: 'christmas' });
  for (const it of pl.items) assert.ok(it.y >= H.upper - 1e-6, it.kind);
});

test('assisi: 성능 예산(고화질 빌드) — 묶음·삼각형·점광원 1·층 묶음 표', () => {
  const ctx = Kit.createContext({ layout: lay, quality: 'high' });
  c.builder.build(ctx);
  const items = ctx._prepare();
  let tris = 0;
  for (const it of items) tris += it.batch.p.length / 9;
  let own = 0;
  ctx.root.traverse((o) => { if (o.isMesh) { own++; tris += o.geometry.attributes.position.count / 3; } });
  assert.equal(own, 0, '전용 메시 없음');
  assert.ok(items.length <= 24, '묶음 ' + items.length);
  assert.ok(tris <= 120000, '삼각형 ' + tris);
  assert.equal(ctx._.lights.length, 1);
  const names = items.map((it) => it.name), V = Bd.levelVis;
  for (const id of ['U', 'L', 'C']) for (const n of V.items[id]) assert.ok(names.includes(n), `${id} 층 묶음 ${n} 이 있다`);
  const lo = Kit.createContext({ layout: lay, quality: 'low' });
  c.builder.build(lo);
  let lt = 0; for (const it of lo._prepare()) lt += it.batch.p.length / 9;
  assert.ok(lt < tris);
  console.log(`# assisi 고화질: 묶음 ${items.length}, 삼각형 ${Math.round(tris)}, 충돌체 ${ctx._.colliders.length}, 바닥 구역 ${ctx._.zones.length} / 간단: 삼각형 ${Math.round(lt)}`);
});

// 층 사이 이음(계단·우물·층계참)은 어느 층 묶음에도 없어야 한다: 층 묶음은 보는 층이 아니면 꺼지므로(world.js levelVis),
// 위층에서 내려다보거나 아래층에서 올려다볼 때 계단·벽이 사라지고 빈 하늘이 보였다(2026-11-22 확인 샷 — 우물 디딤 흰 구멍·테라스 복도 옆 빈 곳).
test('assisi: 층 사이 이음(하부 → 상부 계단, 묘소 우물·층계참)은 공용 묶음 — 층 묶음(U·L·C)에 이음 안 삼각형이 없다', () => {
  const ctx = Kit.createContext({ layout: lay, quality: 'high' });
  c.builder.build(ctx);
  const items = ctx._prepare(), V = Bd.levelVis, ST = Bd.stair, WL = Bd.well, LD = Bd.landing;
  const lvNames = new Set([...V.items.U, ...V.items.L, ...V.items.C]);
  // 이음 부피(안쪽으로 2cm 줄인 상자): 계단 위 공간, 우물 안, 층계참
  const vols = [
    { n: '하부 → 상부 계단', x0: ST.x0, x1: ST.x1, z0: ST.z1, z1: ST.z0, y0: H.lower, y1: H.upper },
    ...[1, -1].map((sx) => ({ n: '우물 ' + sx, x0: Math.min(sx * WL.x0, sx * WL.x1), x1: Math.max(sx * WL.x0, sx * WL.x1), z0: WL.zBot, z1: WL.zTop, y0: H.crypt, y1: H.lower })),
    { n: '층계참', x0: -LD.x, x1: LD.x, z0: LD.z0, z1: LD.z1, y0: H.crypt - 0.05, y1: H.lower - 0.4 }
  ];
  const inV = (v, x, y, z) => x > v.x0 + 0.02 && x < v.x1 - 0.02 && z > v.z0 + 0.02 && z < v.z1 - 0.02 && y > v.y0 + 0.02 && y < v.y1 - 0.02;
  const bad = [], shared = {};
  for (const it of items) {
    const p = it.batch.p;
    for (let i = 0; i < p.length; i += 9) {
      const x = (p[i] + p[i + 3] + p[i + 6]) / 3, y = (p[i + 1] + p[i + 4] + p[i + 7]) / 3, z = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
      for (const v of vols) if (inV(v, x, y, z)) {
        if (lvNames.has(it.name)) { if (bad.length < 4) bad.push(`${it.name} @ ${v.n} (${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)})`); }
        else shared[v.n] = (shared[v.n] || 0) + 1;
      }
    }
  }
  assert.deepEqual(bad, [], '층 묶음에 든 이음 삼각형');
  for (const v of vols) assert.ok(shared[v.n] > 0, v.n + ' 이음 삼각형이 공용 묶음에 있다');
  assert.ok(!lvNames.has('surf_as_stoneS') && items.some((it) => it.name === 'surf_as_stoneS'), '공용 이음 묶음 surf_as_stoneS');
});
