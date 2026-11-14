// 전례 시기 장식(SPEC §33, assets/church/liturgy.js) 시험.
//  - plan(): 성당 8곳 × 시기 전부가 예외 없이 계획을 내고, 장식 충돌체가 좌석·촛불 봉헌대·성수대·제대 앞·14처 서는 자리·걷는 길을 막지 않는다.
//  - build(): 실제 빌더 재질로 지어도 그리는 물체 3개 이하(천·소품·빛 점), 다시 짓고 해제하면 지오메트리·재질·충돌체가 남지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChurches } from './church_harness.mjs';

const { churches, Logic, Stations, WayCross, Liturgy, THREE } = loadChurches();
// vm 샌드박스에서 온 객체는 원형이 달라 deepStrictEqual 이 어긋난다: JSON 으로 평평하게 한 뒤 비교
const eq = (a, b, m) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);
const R = 0.35;   // 아바타 반경 여유

const STATES = {
  advent1: { season: 'advent', color: 'violet', week: 1 },
  advent3: { season: 'advent', color: 'rose', week: 3 },
  advent4: { season: 'advent', color: 'violet', week: 4 },
  christmas: { season: 'christmas', color: 'white', feast: 'christmas' },
  lent: { season: 'lent', color: 'violet' },
  laetare: { season: 'lent', color: 'rose', week: 4 },
  goodfriday: { season: 'triduum', color: 'red', feast: 'goodFriday' },
  easter: { season: 'easter', color: 'white', feast: 'easter' },
  pentecost: { season: 'easter', color: 'red', feast: 'pentecost' },
  ordinary: { season: 'ordinary', color: 'green' },
  souls: { season: 'ordinary', color: 'violet', memorial: true },
  allsaints: { season: 'ordinary', color: 'white', memorial: true, feast: 'allSaints' }
};
const SIX = ['advent1', 'christmas', 'lent', 'easter', 'ordinary', 'souls'];

function distTo(c, x, z) {   // 점에서 충돌체까지 거리(안이면 0)
  if (c.r !== undefined) return Math.max(0, Math.hypot(x - c.x, z - c.z) - c.r);
  const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1);
  return Math.hypot(dx, dz);
}
const mk = (c) => { const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }); return { L, S: Stations.create(L) }; };
const cross = (c, L, S) => WayCross.derive({ layout: c.layout, logic: L, stations: S, walls: c.walls, windows: c.windows, roses: c.roses, glassSlots: c.glassSlots });

test('normalize: 모르는 값은 안전한 기본값으로', () => {
  eq(Liturgy.normalize(null), { season: 'none', color: 'green', week: 0, feast: '', memorial: false });
  assert.equal(Liturgy.normalize({ season: 'xmas' }).season, 'none');
  assert.equal(Liturgy.normalize({ season: 'lent', color: 'pink' }).color, 'violet');
  assert.equal(Liturgy.normalize({ season: 'easter' }).color, 'white');
  assert.equal(Liturgy.normalize({ season: 'advent', week: 99 }).week, 7);
  // 추모 장식은 연중 시기에만
  assert.equal(Liturgy.normalize({ season: 'advent', memorial: true }).memorial, false);
  eq(Liturgy.plan('basic', { season: 'none' }).items, []);
  eq(Liturgy.plan('nochurch', STATES.lent).items, []);
});

test('모든 성당에 장식 자리 표가 있다', () => {
  for (const c of churches) assert.ok(Liturgy.PLACES[c.id], c.id + ': PLACES 에 없음');
  assert.equal(churches.length, 8);
});

test('시기별 장식 구성', () => {
  const kinds = (id, s, low) => Liturgy.plan(id, STATES[s], low).items.map((i) => i.kind);
  eq(kinds('basic', 'ordinary'), ['frontal', 'fall', 'tabveil']);
  eq(kinds('basic', 'advent1'), ['frontal', 'fall', 'tabveil', 'wreath']);
  eq(kinds('basic', 'christmas'), ['frontal', 'fall', 'tabveil', 'tree', 'crib', 'poinsettia', 'poinsettia']);
  eq(kinds('basic', 'lent'), ['frontal', 'fall', 'tabveil', 'veil', 'lentcross']);
  eq(kinds('basic', 'easter'), ['frontal', 'fall', 'tabveil', 'paschal', 'lily', 'lily']);
  eq(kinds('basic', 'souls'), ['frontal', 'fall', 'tabveil', 'memorial']);
  // 성금요일: 제대를 벗긴다(천 없음) + 붉은 천
  eq(kinds('basic', 'goodfriday'), ['veil', 'lentcross']);
  assert.equal(Liturgy.plan('basic', STATES.goodfriday).items[0].color, 'red');
  // 사순 제4주일(장미색): 제대 천은 장미색, 가림천은 자색 그대로
  const la = Liturgy.plan('basic', STATES.laetare).items;
  assert.equal(la.find((i) => i.kind === 'frontal').color, 'rose');
  assert.equal(la.find((i) => i.kind === 'veil').color, 'violet');
  // 대림환: 주차만큼 켠다
  for (const w of [1, 2, 3, 4]) assert.equal(Liturgy.plan('milan', { season: 'advent', week: w }).items.find((i) => i.kind === 'wreath').lit, w);
  // 사순에는 꽃이 없다
  for (const c of churches) assert.ok(!Liturgy.plan(c.id, STATES.lent).items.some((i) => i.kind === 'lily' || i.kind === 'poinsettia'));
  // low 는 추모 촛불 수를 줄인다
  assert.ok(Liturgy.plan('basic', STATES.souls, true).items.find((i) => i.kind === 'memorial').n < Liturgy.plan('basic', STATES.souls, false).items.find((i) => i.kind === 'memorial').n);
});

for (const c of churches) {
  test(`liturgy ${c.id}: 장식이 좌석·스테이션·걷는 길을 막지 않는다`, () => {
    const { L, S } = mk(c);
    const st = S.stations(), sp = c.layout.spawn;
    const cr = cross(c, L, S);
    assert.equal(cr.plaques.length, 14);
    // 걷는 길(장식을 모르는 격자로 찾은 경로): 입구·제대 앞에서 모든 스테이션과 좌석 표본으로
    const targets = [st.altar, ...st.candle, ...st.font, ...cr.plaques.map((p) => p.stand)];
    const seatIds = L.seatIds.filter((_, i) => i % Math.max(1, Math.floor(L.seatIds.length / 14)) === 0);
    for (const id of seatIds) { const s = S.seatStation(id); if (s) targets.push(s); }
    const paths = [];
    for (const from of [sp, st.altar, ...st.candle]) for (const t of targets) { const p = S.findPath(from, t); if (p) paths.push(p); }
    assert.ok(paths.length >= targets.length, 'paths');
    for (const name of Object.keys(STATES)) {
      const pl = Liturgy.plan(c.id, STATES[name], false);
      assert.ok(pl.items.length >= 1, name);
      const B = c.layout.bounds;
      for (const it of pl.items) {
        assert.ok(Number.isFinite(it.x) && Number.isFinite(it.y) && Number.isFinite(it.z), name + ' ' + it.kind);
        assert.ok(it.x > B.x0 && it.x < B.x1 && it.z > B.z0 && it.z < B.z1, `${name} ${it.kind} 성당 밖`);
      }
      for (const col of pl.colliders) {
        const tag = `${c.id} ${name} ${JSON.stringify(col)}`;
        // 스테이션: 서는 자리에서 넉넉히 떨어진다
        assert.ok(distTo(col, sp.x, sp.z) > 2, tag + ' 입구');
        assert.ok(distTo(col, st.altar.x, st.altar.z) > R + 0.45, tag + ' 제대 앞 ' + distTo(col, st.altar.x, st.altar.z).toFixed(2));
        for (const k of st.candle) { assert.ok(distTo(col, k.x, k.z) > 1.0, tag + ' 촛불 봉헌 자리'); assert.ok(distTo(col, k.stand.x, k.stand.z) > 1.5, tag + ' 촛불 봉헌대'); }
        for (const f of st.font) assert.ok(distTo(col, f.x, f.z) > 1.0, tag + ' 성수대');
        for (const p of cr.plaques) assert.ok(distTo(col, p.stand.x, p.stand.z) > R + 0.4, tag + ` ${p.n}처 서는 자리`);
        // 좌석·무릎틀
        for (const s of L.seats) assert.ok(distTo(col, s.x, s.z) > 0.9, tag + ' 좌석 ' + s.id);
        // 걷는 길
        for (const p of paths) {
          for (let i = 1; i < p.pts.length; i++) {
            const a = p.pts[i - 1], b = p.pts[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15));
            for (let q = 0; q <= n; q++) {
              const x = a.x + (b.x - a.x) * q / n, z = a.z + (b.z - a.z) * q / n;
              assert.ok(distTo(col, x, z) > R, tag + ` 걷는 길을 막음 (${x.toFixed(2)}, ${z.toFixed(2)})`);
            }
          }
        }
      }
      // 장식 충돌체를 넣고 다시 유도해도 스테이션이 그대로다(자정에 시기가 바뀌어도 표식·서는 자리가 움직이지 않는다)
      const L2 = Logic.create(c.layout, { colliders: c.colliders.concat(pl.colliders), zones: c.zones }), S2 = Stations.create(L2), st2 = S2.stations();
      eq([st2.altar.x, st2.altar.z], [st.altar.x, st.altar.z], name + ' 제대 앞 자리가 바뀜');
      eq(st2.candle.map((k) => [k.x, k.z]), st.candle.map((k) => [k.x, k.z]), name + ' 촛불 자리');
      eq(st2.font.map((k) => [k.x, k.z]), st.font.map((k) => [k.x, k.z]), name + ' 성수대 자리');
      for (const t of [st2.altar, ...st2.candle, ...st2.font]) assert.ok(S2.findPath(sp, t), name + ' 스테이션에 닿지 않음');
    }
  });
}

// ---- 짓기·교체·해제 ----
function fakeWorld(c, tier) {
  const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones });
  return { id: c.id, ctx: c.ctx, tier, group: new THREE.Group(), logic: L, builder: c.builder, env: { envK: 1 } };
}
function census(group) {
  let meshes = 0, points = 0, verts = 0;
  group.traverse((o) => { if (o.isMesh) { meshes++; verts += o.geometry.attributes.position.count; } if (o.isPoints) { points++; } });
  return { meshes, points, verts };
}

test('build: 성당 8곳 × 시기 6종 × 화질 2단, 그리기 호출·정점 예산 안, 해제하면 남는 것이 없다', () => {
  const rows = [];
  for (const c of churches) {
    for (const tier of ['high', 'low']) {
      const w = fakeWorld(c, tier), base = w.logic.colliders.length;
      let made = 0, disposed = 0;
      const track = (g) => g.traverse((o) => { if (o.geometry) { made++; o.geometry.addEventListener('dispose', () => { disposed++; }); } });
      Liturgy.set({ season: 'none' });
      Liturgy.attach(w);
      assert.equal(w.group.children.length, 0, 'none 은 아무것도 짓지 않는다');
      for (const name of SIX) {
        Liturgy.set(STATES[name]);
        assert.equal(w.group.children.length, 1, `${c.id} ${name}: 장식 그룹은 하나`);
        const g = w.group.children[0], cs = census(g), s = Liturgy.stats();
        track(g);
        assert.equal(cs.meshes + cs.points, s.calls);
        assert.ok(s.calls <= 3, `${c.id} ${name} ${tier}: 그리는 물체 ${s.calls}`);   // 천 + 소품 + 빛 점
        assert.ok(cs.verts === s.verts && s.verts < (tier === 'low' ? 5000 : 14000), `${c.id} ${name} ${tier}: 정점 ${s.verts}`);
        assert.equal(w.logic.colliders.length, base + s.colliders, '충돌체는 지금 장식 것만');
        g.traverse((o) => { if (o.isMesh) { assert.equal(o.castShadow, false); const p = o.geometry.attributes.position.array; for (let i = 0; i < p.length; i++) assert.ok(Number.isFinite(p[i]), 'NaN 정점'); } });
        if (tier === 'high') rows.push(`${c.id.padEnd(11)} ${name.padEnd(9)} calls ${s.calls} verts ${String(s.verts).padStart(5)} lights ${String(s.lights).padStart(2)} colliders ${s.colliders}`);
        // 같은 시기를 다시 보내면 다시 짓지 않는다
        Liturgy.set(STATES[name]);
        assert.equal(w.group.children[0], g);
      }
      // 화질 단계가 바뀌면 update 가 다시 짓는다
      const before = w.group.children[0];
      w.tier = tier === 'low' ? 'high' : 'low';
      Liturgy.update(0.016, 1);
      assert.notEqual(w.group.children[0], before);
      track(w.group.children[0]);
      Liturgy.update(0.016, 2);
      Liturgy.detach();
      assert.equal(w.group.children.length, 0, '해제 뒤 그룹이 남음');
      assert.equal(w.logic.colliders.length, base, '해제 뒤 충돌체가 남음');
      assert.equal(disposed, made, `지오메트리 해제 ${disposed}/${made}`);
      eq(Liturgy.stats(), { items: 0, verts: 0, calls: 0, lights: 0, colliders: 0 });
    }
  }
  console.log('\n장식 통계(high):\n' + rows.join('\n'));
});

test('성당 공용 재질은 해제하지 않는다 + 감상실에는 짓지 않는다', () => {
  const c = churches[0], w = fakeWorld(c, 'high');
  let shared = 0;
  c.ctx.mats.solid.addEventListener('dispose', () => { shared++; });
  c.ctx.mats.metal.addEventListener('dispose', () => { shared++; });
  Liturgy.set(STATES.christmas); Liturgy.attach(w); Liturgy.set(STATES.easter); Liturgy.detach();
  assert.equal(shared, 0);
  const v = fakeWorld(c, 'high'); v.builder = { viewing: true };
  Liturgy.attach(v);
  assert.equal(v.group.children.length, 0);
  Liturgy.detach(); Liturgy.set({ season: 'none' });
});
