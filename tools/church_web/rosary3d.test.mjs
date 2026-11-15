// 사용: node --test tools/church_web/rosary3d.test.mjs — 묵주 3D(assets/rosary3d)의 순수 계산과 정의를 확인한다(DOM·WebGL 불필요).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../../assets/rosary3d/layout.js');
const D = require('../../assets/rosary3d/defs.js');
const dart = fs.readFileSync(new URL('../../lib/rosary3d/rosary_model.dart', import.meta.url), 'utf8');

test('59알 구조: 십자가 1, 큰 알 6, 작은 알 53, 메달(고리 양끝 같은 메달)', () => {
  const k = (x) => L.nodes.filter((n) => n.kind === x).length;
  assert.equal(L.nodeCount, 62);
  assert.equal(k('cross'), 1); assert.equal(k('big'), 6); assert.equal(k('small'), 53); assert.equal(k('medal'), 2);
  assert.equal(L.beadIndexOfNode.filter((b) => b >= 0).length, 59);
});

test('스텝 → 위치: 단조 증가, 성모송·주님의 기도는 알 위, 영광송·구원의 기도는 체인 위', () => {
  let prev = -1;
  for (let s = 0; s < L.STEP_COUNT; s++) { const p = L.stepPos(s); assert.ok(p >= prev, 'step ' + s); prev = p; }
  for (let d = 1; d <= 5; d++) {
    const base = 7 + (d - 1) * 13;
    assert.equal(L.nodes[L.stepPos(base)].kind, 'big');
    for (let n = 1; n <= 10; n++) assert.equal(L.nodes[L.stepPos(base + n)].kind, 'small');
    assert.ok(L.stepPos(base + 11) % 1 > 0 && L.stepPos(base + 12) % 1 > 0);
  }
  assert.equal(L.stepPos(72), 61);
});

test('Dart 매핑(rosary_model.dart)과 같은 규칙', () => {
  for (const frag of ['if (step == 6) return 4.5;', 'if (step >= 72) return 61;', "r == 11 ? 0.35 : 0.65", 'd == 1 ? 5 : 17 + (d - 2) * 11']) assert.ok(dart.includes(frag), frag);
});

test('A안 배치: 고리가 닫히고(61 = 메달 자리) 꼬리는 메달 아래로', () => {
  for (const id of D.ORDER) {
    const def = D.get(id), dims = { small: def.bead.small, big: def.bead.big * def.bead.aspect, cross: def.cross.height + 0.6, medal: def.medal.height, gap: def.link.gap };
    const s = L.arcLengths(dims), a = L.aLayout(s, dims);
    assert.ok(Math.hypot(a.pts[61].x - a.pts[6].x, a.pts[61].y - a.pts[6].y) < 1e-6, id);
    for (let i = 0; i < 6; i++) assert.ok(a.pts[i].y < a.pts[6].y, id + ' tail ' + i);
    // 이웃 알이 겹치지 않는다(간격 ≥ 반지름 합의 95%)
    for (let i = 7; i < 60; i++) {
      const r = (k) => (L.nodes[k].kind === 'big' ? dims.big : dims.small) / 2;
      if (L.nodes[i + 1].kind === 'medal') continue;
      assert.ok(Math.hypot(a.pts[i + 1].x - a.pts[i].x, a.pts[i + 1].y - a.pts[i].y) >= (r(i) + r(i + 1)) * 0.95, id + ' ' + i);
    }
  }
});

test('C안 배치: 현재 위치가 가장 앞, 위쪽이 다음 알', () => {
  const s = L.arcLengths({ small: 1, big: 1.3, cross: 6, medal: 1.9, gap: 0.45 });
  const c = L.cLayout(s, 10, { R: 3, front: 2, thetaMax: 1.3 });
  assert.ok(c[11].y > 0 && c[9].y < 0);
  assert.ok(c[10].z > c[11].z && c[10].z > c[9].z);
});

test('묵주 정의: Flutter 목록과 id 가 같고, 알 모양·연결·십자가가 서로 다르다', () => {
  for (const id of D.ORDER) assert.ok(dart.includes(`'${id}',`), id);
  const shapes = new Set(D.ORDER.map((i) => D.get(i).bead.shape)), links = new Set(D.ORDER.map((i) => D.get(i).link.type)), crosses = new Set(D.ORDER.map((i) => D.get(i).cross.type));
  assert.equal(shapes.size, 3); assert.equal(links.size, 3); assert.equal(crosses.size, 3);
});

test('효과음: 코드 합성 WAV 5개, 각 30KB 이하', () => {
  for (const f of ['r_bead', 'r_low', 'r_bells2', 'r_bell_soft', 'r_bell_end']) {
    const st = fs.statSync(new URL(`../../assets/sounds/${f}.wav`, import.meta.url));
    assert.ok(st.size <= 30 * 1024, f + ' ' + st.size);
  }
});
