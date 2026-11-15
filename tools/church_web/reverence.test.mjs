// 불경 방지(reverence.js) 시험: 모든 성당에서 제단 출입 금지 구역에 들어갈 수 없고(걷기·경로·좌표 복원·남의 좌표),
// 제대·감실이 구역 안(또는 충돌체 안)이며, 신자 자리(좌석·촛불대·제대 앞)는 구역 밖에서 닿을 수 있고, 인사 이모트가 걸러지는지.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadChurches } from './church_harness.mjs';
const require = createRequire(import.meta.url);
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');
const RV = require('../../assets/church/reverence.js');

const { churches } = loadChurches();
const mk = (c) => { const L = Logic.create(c.layout, { colliders: c.colliders, zones: c.zones }); return { L, S: Stations.create(L) }; };
const inside = (rv, x, z) => rv.inZone(x, z, 0);

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

for (const c of churches) {
  test(`reverence ${c.id}: 제단 금지 구역이 있고 제대·감실을 덮는다`, () => {
    const { L } = mk(c);
    const rv = L.reverence;
    assert.ok(rv && rv.zone, 'zone derived');
    const B = c.layout.bounds;
    for (const s of c.ctx._.sacred || []) {
      if (s.x < B.x0 || s.x > B.x1 || s.z < B.z0 || s.z > B.z1) continue;          // 걸을 수 없는 바깥(지하 등)
      const blocked = !RV.freeAt(L.colliders.filter((k) => !k.keep), s.x, s.z, 0.3);
      assert.ok(inside(rv, s.x, s.z) || blocked, `${s.k} @${s.x},${s.z} 이 구역 밖인데 충돌체도 없다`);
    }
  });

  test(`reverence ${c.id}: 신자 자리(좌석·촛불대·제대 앞·입구)는 구역 밖이고 닿는다`, () => {
    const { L, S } = mk(c);
    const rv = L.reverence, st = S.stations();
    assert.ok(!rv.inZone(st.altar.x, st.altar.z, 0.2), `제대 앞 자리 ${st.altar.x},${st.altar.z} 가 구역 안`);
    assert.ok(S.isReachable(st.altar.x, st.altar.z), '제대 앞 자리에 닿는다');
    // 제대 앞 자리는 제단 첫 계단 앞(신자석 쪽): 제대가 놓인 단보다 낮다(단이 성당 폭 전체여도 같은 규칙)
    const zf = rv.zone, inner = { x: zf.station.x, z: zf.station.z };
    const fy = L.floorY(st.altar.x, st.altar.z), fyIn = L.floorY(inner.x, inner.z);
    assert.ok(fyIn <= 0.02 ? fy <= 0.02 : fy < fyIn - 0.05, `제대 앞 자리 바닥 ${fy} 이 제단 ${fyIn} 보다 낮지 않다`);
    assert.ok(!inside(rv, c.layout.spawn.x, c.layout.spawn.z), '입구');
    for (const s of L.seats) {
      assert.ok(!inside(rv, s.x, s.z), `좌석 ${s.id} 가 구역 안`);
      const sp = L.standPos(s.id);
      assert.ok(!inside(rv, sp.x, sp.z), `좌석 ${s.id} 앞이 구역 안`);
    }
    for (const cs of st.candle) assert.ok(!inside(rv, cs.x, cs.z) && S.isReachable(cs.x, cs.z), `촛불대 ${cs.index}`);
  });

  test(`reverence ${c.id}: 걷기·경로·좌표 복원으로 구역에 못 들어간다`, () => {
    const { L, S } = mk(c);
    const rv = L.reverence, st = S.stations(), z = rv.zone;
    // (1) 제대 앞에서 제대 쪽으로 계속 밀기(좌우로 비틀며)
    const p = { x: st.altar.x, z: st.altar.z };
    for (let i = 0; i < 600; i++) {
      const wob = Math.sin(i * 0.05) * 1.2;
      L.moveCircle(p, (z.axis.x + -z.axis.z * wob) * 0.05, (z.axis.z + z.axis.x * wob) * 0.05);
      assert.ok(!inside(rv, p.x, p.z), `밀기 ${i}: ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
    }
    // (2) 아무렇게나 걷기 3000걸음
    const r = rng(7); const q = { x: c.layout.spawn.x, z: c.layout.spawn.z };
    let a = 0;
    for (let i = 0; i < 3000; i++) {
      if (r() < 0.05) a = r() * Math.PI * 2;
      L.moveCircle(q, Math.cos(a) * 0.12, Math.sin(a) * 0.12);
      assert.ok(!inside(rv, q.x, q.z), `걷기 ${i}`);
    }
    // (3) 제대 위를 눌러 걸어가기: 경로가 구역을 지나지 않는다
    const alt = { x: (z.x0 + z.x1) / 2, z: z.axis.z < 0 ? z.z1 - 1.5 : z.z0 + 1.5 };
    // 경로의 끝점은 누른 자리 그대로지만, 걷기 물리(moveCircle)가 구역 가장자리에서 멈춘다(main.js 와 같은 걷기)
    const path = S.findPath(c.layout.spawn, alt);
    if (path) {
      const me = { x: c.layout.spawn.x, z: c.layout.spawn.z, vx: 0, vz: 0 }, w = S.startWalk(path, alt, 'tap'), out = {}, m = { x: 0, z: 0 };
      for (let t = 0; t < 120; t += 1 / 30) {
        S.stepWalk(w, me, 1 / 30, out);
        if (out.done) break;
        m.x = me.x; m.z = me.z; L.moveCircle(m, out.vx / 30, out.vz / 30); me.x = m.x; me.z = m.z;
        assert.ok(!inside(rv, me.x, me.z), `누르기 이동 ${me.x.toFixed(2)},${me.z.toFixed(2)}`);
      }
    }
    // (4) 저장된 좌표 복원(main.js: moveCircle(pp,0,0)) — 제대 위 좌표는 밀려난다
    const pp = { x: alt.x, z: alt.z }; L.moveCircle(pp, 0, 0);
    assert.ok(!inside(rv, pp.x, pp.z), '복원 좌표');
  });

  test(`reverence ${c.id}: 남이 보낸 제대 위 좌표는 구역 앞으로 내린다(clamp)`, () => {
    const { L } = mk(c);
    const rv = L.reverence;
    for (const R of rv.rects) {
      const p = { x: (R.x0 + R.x1) / 2, z: (R.z0 + R.z1) / 2 };
      assert.equal(rv.clamp(p), true);
      assert.ok(!inside(rv, p.x, p.z), `${p.x},${p.z}`);
    }
    const o = { x: c.layout.spawn.x, z: c.layout.spawn.z };
    assert.equal(rv.clamp(o), false, '입구는 그대로');
  });
}

test('reverence: 인사(손 흔들기)는 입구 가까이에서 걸을 때만, 금지 이모트 번호는 무시', () => {
  const c = churches.find((k) => k.id === 'basic');
  const { L, S } = mk(c);
  const rv = L.reverence, sp = c.layout.spawn, alt = S.stations().altar;
  assert.equal(rv.emoteFor(0, { x: sp.x, z: sp.z, busy: false }), 0);
  assert.equal(rv.emoteFor(0, { x: alt.x, z: alt.z, busy: false }), 2, '제대 앞: 고개 숙임으로');
  assert.equal(rv.emoteFor(0, { x: sp.x, z: sp.z, busy: true }), 2, '앉음·기도 중');
  assert.equal(rv.emoteFor(0, { x: 0, z: 0, busy: false }), 2, '신랑 한가운데');
  assert.equal(rv.emoteFor(1, { x: alt.x, z: alt.z, busy: true }), 1, '성호경은 언제나');
  assert.equal(rv.emoteFor(2, { x: alt.x, z: alt.z, busy: true }), 2, '고개 숙임은 언제나');
  assert.equal(rv.emoteFor(7, { x: sp.x, z: sp.z }), -1);
  RV.active = rv;
  const av = { sitTarget: 0, prayTarget: 1, root: { position: { x: sp.x, z: sp.z } } };
  assert.equal(RV.filterEmote(0, av), 2, '기도 중인 아바타');
  av.prayTarget = 0; assert.equal(RV.filterEmote(0, av), 0);
});

test('reverence: setColliders 로 다시 지어도 금지 구역이 남는다', () => {
  const c = churches[0];
  const { L } = mk(c);
  L.setColliders(c.colliders);
  assert.ok(L.colliders.some((k) => k.keep));
});

test('피렌체: 북 측랑 그림 3점은 진본 사진 팩(art_florence.js)으로, 14처 판은 그림 틀과 겹치지 않는다', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../../assets/church/ch_florence.js', import.meta.url), 'utf8');
  assert.ok(!/function horse\(/.test(src), '도형으로 그린 말 탄 사람 그림이 남아 있다');
  const art = fs.readFileSync(new URL('../../assets/church/art_florence.js', import.meta.url), 'utf8');
  for (const k of ['tolentino', 'hawkwood', 'dante']) assert.ok(art.includes('"' + k + '":{"w":'), k);
  const c = churches.find((k) => k.id === 'florence');
  const frames = c.ctx._.artFrames || [];
  assert.equal(frames.length, 3);
  const PW = 0.7 / 2 + 0.1, Y0 = 1.35 - 0.1, Y1 = 1.35 + 0.7 * 504 / 248 + 0.1;   // way_cross.js 판 크기(+여유)
  for (const p of c.layout.crossWay.plaques) {
    for (const f of frames) {
      if (Math.abs(p.x - f.x) > 0.6) continue;
      const zHit = p.z + PW > f.z0 && p.z - PW < f.z1, yHit = Y1 > f.y0 && Y0 < f.y1;
      assert.ok(!(zHit && yHit), `14처 판 z ${p.z} 가 그림 ${f.key} 틀(${f.z0.toFixed(2)}~${f.z1.toFixed(2)})과 겹친다`);
    }
  }
});
