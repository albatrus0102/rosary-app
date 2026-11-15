// 당고개 순교성지(ch_danggogae.js) 전용 시험: 설계서(docs/church/interiors/danggogae.md §6)의 좌표가 실제 빌더에서 그대로 나오는지.
//  좌석 84 · 14처 14곳(창 무리 사이, 왼쪽 벽 제대 쪽에서 1처) · 걷기 경계/충돌(문 구멍만 통한다) · 스폰 · 제대/봉헌초 스테이션 ·
//  전례 장식 상태 12개 · 성능 예산 상한(메시·삼각형·충돌체·점광원·스프라이트·반사 바닥) · 권리 지킴(사진 창·진본 자리 없음).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChurches } from './church_harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { churches, Kit, Logic, Stations, WayCross, Liturgy, CrossData } = loadChurches();
const c = churches.find((x) => x.id === 'danggogae');
const lay = c.layout, B = lay.bounds;
const L = Logic.create(lay, { colliders: c.colliders, zones: c.zones }), S = Stations.create(L);
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const free = (x, z) => { const p = { x, z }; return !L.moveCircle(p, 0, 0); };

test('danggogae: 레이아웃 — 84석, 경계, 입구 홀 스폰', () => {
  assert.equal(lay.id, 'danggogae'); assert.equal(lay.scalePercent, 100);
  assert.deepEqual({ ...B }, { x0: -7.25, x1: 7.25, z0: -11, z1: 15.6 });
  assert.deepEqual([lay.spawn.x, lay.spawn.z, lay.spawn.r], [0, 14.4, 0]);
  assert.equal(L.seats.length, 84);
  for (const g of ['L', 'R']) assert.equal(L.seats.filter((s) => s.g === g).length, 42);
  // 줄 z 와 좌석 x(설계 §6.8)
  const zs = [...new Set(L.seats.map((s) => +s.z.toFixed(2)))].sort((a, b) => a - b);
  assert.deepEqual(zs, [-2.4, -0.5, 1.4, 3.3, 5.2, 7.1, 9.0]);
  const xs = [...new Set(L.seats.filter((s) => s.g === 'R').map((s) => +s.x.toFixed(2)))].sort((a, b) => a - b);
  assert.deepEqual(xs, [1.35, 2.05, 2.75, 3.45, 4.15, 4.85]);
  // 모든 좌석이 경계 안이고 입구에서 걸어서 닿는다
  for (const s of L.seats) {
    assert.ok(s.x > B.x0 && s.x < B.x1 && s.z > B.z0 && s.z < B.z1, s.id);
    const sp = L.standPos(s.id);
    assert.ok(S.isReachable(sp.x, sp.z), s.id + ' 닿지 않음');
  }
  assert.ok(!lay.fonts, '성수대 성호 긋기 자리는 만들지 않는다');
});

test('danggogae: 걷기 — 스폰은 비어 있고, 뒷벽은 문 구멍(폭 2m)으로만 통하며, 제대 벽·기둥 뒤로는 못 간다', () => {
  assert.ok(free(lay.spawn.x, lay.spawn.z));
  // 문 구멍 가운데는 통하고, 문 옆 벽은 막힌다
  for (const z of [11.0, 11.2, 11.4]) assert.ok(free(0, z), '문 구멍 z=' + z);
  for (const x of [-6.5, -4.3, -1.6, 1.6, 4.3, 6.5]) assert.ok(!free(x, 11.2), '뒷벽 x=' + x);
  // 입구 → 제대 앞 길은 문 구멍(|x| < 1)을 지난다
  const st = S.stations(), p = S.findPath(lay.spawn, st.altar);
  assert.ok(p && p.len < 24, '입구→제대 길');
  for (let i = 1; i < p.pts.length; i++) {
    const a = p.pts[i - 1], b = p.pts[i];
    if ((a.z - 11.2) * (b.z - 11.2) <= 0 && a.z !== b.z) { const x = a.x + (b.x - a.x) * (11.2 - a.z) / (b.z - a.z); assert.ok(Math.abs(x) < 1.0, '문 구멍 밖으로 벽을 지남 x=' + x); }
  }
  // 제단: 계단으로 올라간다(높이 0.34), 제대·제대 벽·기둥 뒤 모서리는 막힌다
  assert.ok(near(L.floorY(0, -7.6), 0.34)); assert.ok(near(L.floorY(0, -5.0), 0));
  assert.ok(L.floorY(0, -6.0) > 0.1 && L.floorY(0, -6.0) < 0.34, '계단 단');
  assert.ok(!free(0, -8.6), '제대'); assert.ok(!free(0, -10.7), '제대 벽 가운데'); assert.ok(!free(-5.6, -8.9), '제대 벽 사선 면');
  assert.ok(!free(-6.8, -8), '기둥 뒤 모서리'); assert.ok(!free(6.35, -6.65), '기둥');
  assert.ok(free(-3.4, -8.6) && free(3.2, -8.0), '제단 위 통로');
  // 가구: 감실·독서대·사제석·해설대·피아노·성수대·봉헌초
  for (const [x, z, n] of [[-2.4, -10.0, '감실'], [-2.7, -7.5, '독서대'], [3.8, -9.5, '사제석'], [-5.3, -5.3, '해설대'], [5.3, -5.2, '피아노'], [-1.7, 12.0, '성수대'], [5.45, 13.5, '연못'], [6.95, 13.5, '성모상']]) assert.ok(!free(x, z), n);
  assert.ok(c.colliders.length <= 60, '충돌체 ' + c.colliders.length);
});

test('danggogae: 스테이션 — 제대 앞(0, -7.6) 축 유도, 봉헌초 = 입구 홀 오른쪽 성모상 앞 연못', () => {
  const st = S.stations();
  assert.equal(st.altar.how, 'axis');
  assert.ok(near(st.altar.x, 0) && near(st.altar.z, -7.6), JSON.stringify(st.altar));
  assert.ok(st.altar.z < lay.spawn.z - 15);
  assert.equal(st.candle.length, 1);   // 성모상 앞 연못 하나(shrine.js kind 'pond')
  assert.ok(st.candle[0].shrine && st.candle[0].x > 3.6 && st.candle[0].x < 4.4 && near(st.candle[0].z, 13.5, 0.3), JSON.stringify(st.candle[0]));
  assert.ok(S.free(st.candle[0].x, st.candle[0].z) && S.isReachable(st.candle[0].x, st.candle[0].z));
  assert.notEqual(L.nearestCandleSlot(st.candle[0].x, st.candle[0].z, null), null);
  assert.equal(L.slots.length, 18);   // 연못 위 원형 2겹(6 + 12)
  assert.equal(st.font.length, 0);
});

test('danggogae: 십자가의 길 14곳 — 창 무리 사이, 1처 = 왼쪽 벽 제대 쪽, 14처 = 오른쪽 벽 제대 쪽, 티에폴로 연작', () => {
  const r = WayCross.derive({ layout: lay, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
  assert.equal(r.why, 'ok');
  assert.equal(r.plaques.length, 14);
  const Z = [-3.6, -1.1, 0.9, 3.4, 5.65, 7.9, 10.15];   // 설계 §6.7 표
  r.plaques.forEach((p, i) => {
    const left = i < 7, z = left ? Z[i] : Z[13 - i];
    assert.equal(p.side, left ? 'L' : 'R', p.n + '처 벽');
    assert.ok(near(p.x, left ? -7.176 : 7.176, 0.01), p.n + '처 x ' + p.x);
    assert.ok(near(p.z, z, 0.01), p.n + '처 z ' + p.z);
    assert.ok(near(Math.abs(p.stand.x), 5.95, 0.26) && near(p.stand.z, z, 0.41), p.n + '처 서는 자리');
    assert.ok(S.free(p.stand.x, p.stand.z) && S.isReachable(p.stand.x, p.stand.z), p.n + '처 서는 자리');
    // 판(반폭 0.35)이 어느 창 줄(반폭 0.25 + 틀 0.045)과도 겹치지 않는다
    for (const lz of c.builder.lancets) assert.ok(Math.abs(p.z - lz) > 0.35 + 0.25 + 0.045 + 0.05, `${p.n}처 판이 창(z ${lz})과 겹침`);
  });
  assert.equal(lay.crossWay.start, 'L');
  assert.equal(CrossData.series.churches.danggogae, 'tiepolo');
});

test('danggogae: 창 28판(옆벽마다 한 줄 + 한 쌍 3무리), 사진 창·장미창·빛줄기 없음', () => {
  assert.deepEqual([...c.builder.lancets], [-5.0, -2.7, -2.1, 1.9, 2.5, 6.5, 7.1]);
  assert.equal(c.windows.length, 28);
  for (const s of [-1, 1]) {
    const ws = c.windows.filter((w) => Math.sign(w.x) === s);
    assert.equal(ws.length, 14);
    for (const w of ws) {
      assert.ok(near(Math.abs(w.x), 7.25) && w.painted && w.beam === false && !w.photo, '벽을 뚫지 않는 빛 상자');
      assert.equal(w.F.nx, -s); assert.equal(w.w, 0.5);
    }
    assert.equal(ws.filter((w) => w.top === 'flat' && w.y === 0.75 && w.h === 1.9).length, 7);
    assert.equal(ws.filter((w) => w.top === 'pointed' && w.y === 2.95).length, 7);
  }
  assert.equal(c.roses.length, 0); assert.equal(c.glassSlots.length, 0);
  assert.equal(c.ctx._.beams.length, 0, '지하: 햇빛 빛줄기 없음');
  // 권리(설계 §4): 사진·모사 자산을 싣지 않는다 — 전용 사진 묶음이 없고(절차 생성), 빌더에 그림·사진 주소가 없다
  const src = fs.readFileSync(path.resolve(here, '../../assets/church/ch_danggogae.js'), 'utf8');
  assert.ok(!/https?:\/\//.test(src) && !/loadTexture|glassPhoto|statue\(|statueNiche/.test(src));
});

test('danggogae: 전례 장식 — 상태 12개가 계획을 내고 제단 위 자리에 놓인다', () => {
  const P = Liturgy.PLACES.danggogae;
  assert.deepEqual([P.altar.x, P.altar.z, P.altar.y], [0, -8.6, 0.34]);
  const STATES = {
    advent1: { season: 'advent', color: 'violet', week: 1 }, advent3: { season: 'advent', color: 'rose', week: 3 }, advent4: { season: 'advent', color: 'violet', week: 4 },
    christmas: { season: 'christmas', color: 'white', feast: 'christmas' }, lent: { season: 'lent', color: 'violet' }, laetare: { season: 'lent', color: 'rose', week: 4 },
    goodfriday: { season: 'triduum', color: 'red', feast: 'goodFriday' }, easter: { season: 'easter', color: 'white', feast: 'easter' }, pentecost: { season: 'easter', color: 'red', feast: 'pentecost' },
    ordinary: { season: 'ordinary', color: 'green' }, souls: { season: 'ordinary', color: 'violet', memorial: true }, allsaints: { season: 'ordinary', color: 'white', memorial: true, feast: 'allSaints' }
  };
  const kinds = (n) => [...Liturgy.plan('danggogae', STATES[n]).items.map((i) => i.kind)];   // vm 샌드박스 배열 → 이쪽 배열
  assert.deepEqual(kinds('ordinary'), ['frontal', 'fall', 'tabveil']);
  assert.deepEqual(kinds('advent1'), ['frontal', 'fall', 'tabveil', 'wreath']);
  assert.deepEqual(kinds('christmas'), ['frontal', 'fall', 'tabveil', 'tree', 'crib', 'poinsettia', 'poinsettia']);
  assert.deepEqual(kinds('lent'), ['frontal', 'fall', 'tabveil', 'veil', 'lentcross']);
  assert.deepEqual(kinds('goodfriday'), ['veil', 'lentcross']);
  assert.deepEqual(kinds('easter'), ['frontal', 'fall', 'tabveil', 'paschal', 'lily', 'lily']);
  const st = S.stations();
  for (const n of Object.keys(STATES)) {
    const pl = Liturgy.plan('danggogae', STATES[n]);
    for (const it of pl.items) {
      // 모두 제단(계단 뒤) 위: 높이 0.34, 계단 앞·신자석 쪽으로 나오지 않는다
      assert.ok(it.z < -6.4 && it.z > -11 && Math.abs(it.x) < 6.35, `${n} ${it.kind}`);
      if (it.kind !== 'veil') assert.ok(near(it.y, 0.34), `${n} ${it.kind} 높이`);
    }
    // 장식을 넣어도 스테이션과 14처가 그대로다
    const L2 = Logic.create(lay, { colliders: c.colliders.concat(pl.colliders), zones: c.zones }), S2 = Stations.create(L2), st2 = S2.stations();
    assert.ok(near(st2.altar.x, st.altar.x) && near(st2.altar.z, st.altar.z), n + ' 제대 앞');
    const r2 = WayCross.derive({ layout: lay, logic: L2, stations: S2, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });
    assert.equal(r2.plaques.length, 14, n);
  }
  // 십자고상 가림천은 빌더의 십자가(아래 끝 높이·크기)와 같은 자리
  const v = Liturgy.plan('danggogae', STATES.lent).items.find((i) => i.kind === 'veil');
  assert.deepEqual([v.x, v.y, v.z, v.h], [0, 2.19, -10.72, 1.9]);
});

test('danggogae: 성능 예산(고화질 빌드) — 메시·삼각형·점광원·스프라이트·반사 바닥 상한', () => {
  const ctx = Kit.createContext({ layout: lay, quality: 'high' });
  c.builder.build(ctx);
  const items = ctx._prepare();
  let tris = 0;
  for (const it of items) tris += it.batch.p.length / 9;
  let own = 0;   // 빌더가 직접 넣은 메시(한지 빛 판, 빛 번짐, 뒷벽 묶음 2)
  ctx.root.traverse((o) => { if (o.isMesh) { own++; tris += o.geometry.attributes.position.count / 3; } });
  const meshes = items.length + own;
  assert.equal(own, 4, '전용 메시');
  assert.equal(ctx.stats.meshes, own, 'stats.meshes 가 전용 메시 수와 같다(ctx.plane·ctx.mesh 를 쓰지 않는다)');
  assert.ok(meshes <= 20, '빌더 메시 ' + meshes + ' (설계 목표: 장면 전체 34 이하)');
  assert.ok(tris <= 50000, '삼각형 ' + tris);
  assert.ok(tris >= 15000, '삼각형이 너무 적다(빌드가 비었나) ' + tris);
  assert.equal(ctx._.lights.length, 1, '점광원 1개');
  assert.equal(ctx._.lights[0].kind, 'always');
  assert.equal(ctx._.glows.length + ctx._.flames.length, 0, '스프라이트(개별 draw call) 없음: 빛은 발광 면과 빛 번짐 메시로');
  assert.equal(ctx._.floors.length, 0, '바닥 반사 없음(나무 마루)');
  assert.ok(ctx._.cameraBounds && ctx._.cameraBounds.yMax <= 4.0, '낮은 천장: 카메라 yMax');
  assert.ok(ctx._.colliders.length <= 60);
  // 간단 화질은 더 가볍다
  const lo = Kit.createContext({ layout: lay, quality: 'low' });
  c.builder.build(lo);
  let lt = 0; for (const it of lo._prepare()) lt += it.batch.p.length / 9;
  lo.root.traverse((o) => { if (o.isMesh) lt += o.geometry.attributes.position.count / 3; });
  assert.ok(lt < tris, 'low ' + lt + ' < high ' + tris);
  console.log(`# danggogae 고화질: 빌더 메시 ${meshes}(묶음 ${items.length} + 전용 ${own}), 삼각형 ${Math.round(tris)}, 충돌체 ${ctx._.colliders.length} / 간단: 삼각형 ${Math.round(lt)}`);
});
