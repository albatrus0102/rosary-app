// 사용: node --test tools/church_web/label_fit.test.mjs — 3D 이름표 화면 크기 보정(label_fit.js)의 순수 계산을 확인한다(DOM·WebGL 불필요).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const LF = require('../../assets/church/label_fit.js');
const { PRESETS: P } = LF;
const VIEW_H = 800, FOV = 62;   // 360x800 세로 화면

// 알약의 화면 높이(px)를 월드 높이 h 와 깊이로 되돌려 계산
const pillPx = (h, depth, p) => h * p.pill * LF.pxPerMeter(depth, VIEW_H, FOV);

test('pxPerMeter: 깊이에 반비례하고 화면 높이에 비례한다', () => {
  const a = LF.pxPerMeter(5, 800, 60), b = LF.pxPerMeter(10, 800, 60), c = LF.pxPerMeter(5, 400, 60);
  assert.ok(Math.abs(a / b - 2) < 1e-9);
  assert.ok(Math.abs(a / c - 2) < 1e-9);
  // 시야각 60°, 깊이 5m: 화면 높이 800px 는 2*5*tan(30°)=5.77m
  assert.ok(Math.abs(a - 800 / (2 * 5 * Math.tan(Math.PI / 6))) < 1e-9);
});

test('fit: 알약 화면 높이가 어떤 거리에서도 [minPx, maxPx] 안에 머문다', () => {
  for (const key of ['self', 'peer', 'marker']) {
    const p = P[key];
    for (const d of [0.5, 1, 2, 3, 5, 7.2, 10, 15, 25, 45, 80]) {
      const f = LF.fit(d, VIEW_H, FOV, p);
      assert.ok(f.px >= p.minPx - 1e-9 && f.px <= p.maxPx + 1e-9, `${key} d=${d} px=${f.px}`);
      assert.ok(Math.abs(pillPx(f.h, d, p) - f.px) < 1e-6, `${key} d=${d}: 월드 높이와 px 가 일치`);
    }
  }
});

test('fit: 가까우면 maxPx 로 눌리고 멀면 minPx 로 올라간다. 중간에서는 월드 크기를 그대로 둔다', () => {
  const p = P.peer;
  const near = LF.fit(1, VIEW_H, FOV, p), far = LF.fit(24, VIEW_H, FOV, p);
  assert.equal(near.px, p.maxPx);
  assert.ok(near.h < p.base);          // 월드에서는 기본보다 작게(눌림)
  assert.equal(far.px, p.minPx);
  assert.ok(far.h > p.base);           // 월드에서는 기본보다 크게
  // 자연스러운 크기가 범위 안이면 기본 월드 높이 그대로
  const dMid = 3.4, nat = p.base * p.pill * LF.pxPerMeter(dMid, VIEW_H, FOV);
  assert.ok(nat > p.minPx && nat < p.maxPx, `nat=${nat}`);
  assert.ok(Math.abs(LF.fit(dMid, VIEW_H, FOV, p).h - p.base) < 1e-9);
});

test('내 이름표는 다른 사람·표식보다 작게 머문다(머리 위에 작게)', () => {
  assert.ok(P.self.maxPx < P.peer.maxPx);
  assert.ok(P.self.maxPx <= 20);
  // 기본 추적 카메라(뒤 7.2m, 세로 시야 62°)에서 내 이름표는 14~20px
  const f = LF.fit(7.2, VIEW_H, FOV, P.self);
  assert.ok(f.px >= 14 && f.px <= 20, f.px);
});

test('앞쪽 깊이로 보정하므로 화면 높이가 다른 기기에서도 같은 px 범위', () => {
  for (const vh of [640, 800, 915]) {
    const f = LF.fit(2, vh, 62, P.marker);
    assert.ok(f.px >= P.marker.minPx && f.px <= P.marker.maxPx);
  }
});

test('anchorLift: 알약 아래 가장자리를 기준 높이에 고정한다', () => {
  const p = P.peer;
  for (const h of [0.1, p.base, 0.4, 0.9]) {
    const bottom = LF.anchorLift(h, p) - h * p.pill / 2;     // 기준 높이 대비 알약 아래 가장자리
    const base = -p.base * p.pill / 2;
    assert.ok(Math.abs(bottom - base) < 1e-9, `h=${h}`);
  }
  assert.equal(LF.anchorLift(p.base, p), 0);
});

test('farFade: 다른 사람 이름표는 16m 부터 줄고 22m 에서 사라진다. 표식·내 이름표는 항상 1', () => {
  assert.equal(LF.farFade(5, P.peer), 1);
  assert.equal(LF.farFade(16, P.peer), 1);
  assert.ok(Math.abs(LF.farFade(19, P.peer) - 0.5) < 1e-9);
  assert.equal(LF.farFade(22, P.peer), 0);
  assert.equal(LF.farFade(60, P.peer), 0);
  assert.equal(LF.farFade(60, P.self), 1);
  assert.equal(LF.farFade(60, P.marker), 1);
});

test('depthOf: 카메라 앞쪽 거리(뒤는 음수)', () => {
  const c = { x: 1, y: 2, z: 3 }, f = { x: 0, y: 0, z: -1 };
  assert.equal(LF.depthOf(c, f, 1, 2, -4), 7);
  assert.equal(LF.depthOf(c, f, 5, 9, 5), -2);   // 옆·위로 얼마나 벗어나든 앞쪽 성분만
});

test('overlapRaise: 겹치지 않으면 0, 겹치면 표식을 내 이름표 위로 올릴 px', () => {
  const me = { cx: 180, cy: 400, w: 60, h: 18 };
  // 멀리 떨어진 표식
  assert.equal(LF.overlapRaise(me, { cx: 180, cy: 300, w: 80, h: 22 }), 0);
  assert.equal(LF.overlapRaise(me, { cx: 300, cy: 400, w: 80, h: 22 }), 0);
  // 거의 같은 자리: 올린 뒤 표식 아래 가장자리가 내 이름표 위 가장자리보다 gap 만큼 위
  const lab = { cx: 190, cy: 396, w: 80, h: 22 };
  const r = LF.overlapRaise(me, lab, 3);
  assert.ok(r > 0);
  const raised = { cx: lab.cx, cy: lab.cy - r, w: lab.w, h: lab.h };
  assert.ok(Math.abs((raised.cy + raised.h / 2) - (me.cy - me.h / 2 - 3)) < 1e-9);
  assert.equal(LF.overlapRaise(me, raised, 0), 0);       // 올린 뒤에는 더 올릴 필요 없음
  // 이미 위에 있지만 일부 겹침: 겹친 만큼만
  const r2 = LF.overlapRaise(me, { cx: 180, cy: 384, w: 80, h: 22 }, 0);
  assert.ok(r2 > 0 && r2 < 22);
});

// ---- 이름표 글자 배치(tagLayout): 긴 세례명이 알약(폭 236, 높이 40; 글자 폭 202) 안에 들어가는지 ----
// 캔버스 없이 재는 근사 폭: 한글·전각 1em, 숫자·영문 0.6em, 공백 0.3em, 괄호류 0.4em (굵은 고딕 기준으로 넉넉하게).
const NAMES = require('../../assets/church/baptismal_names.js');
function measure(text, fs) {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.3;
    else if ('()[]'.includes(ch)) em += 0.4;
    else if (ch === '…') em += 1;
    else if (ch.charCodeAt(0) < 0x80) em += 0.6;
    else em += 1;
  }
  return em * fs;
}
const T = LF.TAG;
function assertFits(name) {
  const lay = LF.tagLayout(name, measure);
  assert.ok(lay.lines.length >= 1 && lay.lines.length <= 2, name);
  for (const l of lay.lines) assert.ok(measure(l, lay.fs) <= T.maxW + 1e-6, `${name}: "${l}" ${measure(l, lay.fs)}px @${lay.fs}`);
  assert.ok(lay.w <= T.maxW + 1e-6);
  assert.ok(Math.min(236, lay.w + 34) <= 236);
  // 세로: 줄 중심 ± 글자 높이 절반이 알약(중심 32±20; 글자는 33 기준) 안
  const ys = LF.tagLineYs(lay, 33);
  assert.equal(ys.length, lay.lines.length);
  assert.ok(ys[0] - lay.fs / 2 >= 12 && ys[ys.length - 1] + lay.fs / 2 <= 52, `${name}: 세로 ${ys} @${lay.fs}`);
  if (lay.lines.length === 2) assert.ok(lay.fs <= T.twoFs && lay.fs >= T.twoMinFs, `${name}: ${lay.fs}`);
  else assert.ok(lay.fs >= T.minFs && lay.fs <= T.fs);
  return lay;
}

test('tagLayout: short names stay on one line at the base size', () => {
  for (const n of ['마리아', '요셉', '스콜라스티카']) {
    const lay = assertFits(n);
    assert.deepEqual(lay.lines, [n]);
    assert.equal(lay.fs, T.fs);
  }
  // 조금 긴 이름은 한 줄로 두고 글자만 줄인다
  const mid = assertFits('알렉산데르 사울리');
  assert.equal(mid.lines.length, 1);
  assert.ok(mid.fs < T.fs && mid.fs >= T.minFs);
});

test('tagLayout: the five longest names fit the pill on two lines without losing text', () => {
  const longest = Array.from(NAMES.list).sort((a, b) => measure(b, 16) - measure(a, 16)).slice(0, 5);
  assert.ok(longest.includes('바울라 몬탈 포르네스(성 요셉 데 갈라산즈의)'));
  for (const n of longest) {
    const lay = assertFits(n);
    assert.equal(lay.lines.length, 2, n);
    // 말줄임 없이 전부 보인다(나눈 자리의 공백 하나만 빠진다)
    assert.equal(lay.lines.join('').replace(/ /g, ''), n.replace(/ /g, ''), n);
    // 가운데 근처에서 나뉜다: 두 줄의 폭 차이가 전체의 절반 이하
    const [a, b] = lay.lines.map((l) => measure(l, lay.fs));
    assert.ok(Math.abs(a - b) <= (a + b) / 2, `${n}: ${lay.lines.join(' / ')}`);
  }
  // 16px 한 줄에 겨우 드는 이름은 한 줄, 조금만 넘쳐도 두 줄(가운데에 가장 가까운 공백에서)
  assert.deepEqual(LF.tagLayout('히야친토 조르다노 안살로네', measure), { fs: 16, lines: ['히야친토 조르다노 안살로네'], w: measure('히야친토 조르다노 안살로네', 16) });
  assert.deepEqual(LF.tagLayout('히야친토 조르다노 안살로네', (t, fs) => measure(t, fs) * 1.1).lines, ['히야친토', '조르다노 안살로네']);
  assert.deepEqual(LF.tagLayout('바울라 몬탈 포르네스(성 요셉 데 갈라산즈의)', measure).lines, ['바울라 몬탈 포르네스', '(성 요셉 데 갈라산즈의)']);
});

test('tagLayout: every bundled name fits the pill; ellipsis only as a last resort', () => {
  let two = 0, cut = 0;
  for (const n of NAMES.list) {
    const lay = assertFits(n);
    if (lay.lines.length === 2) two++;
    if (lay.lines.join('').includes('…')) cut++;
  }
  assert.ok(two > 0 && two < NAMES.list.length / 10, `two-line names: ${two}`);
  assert.equal(cut, 0);
  // 나눌 곳이 없는 아주 긴 글도 두 줄 + 말줄임으로 알약 안에 든다
  const lay = assertFits('가'.repeat(60));
  assert.equal(lay.lines.length, 2);
  assert.ok(lay.lines[1].endsWith('…'));
  // 폭이 실제보다 30% 넓게 재져도(글꼴 차이) 넘치지 않는다
  const wide = (t, fs) => measure(t, fs) * 1.3;
  for (const n of NAMES.list) for (const l of LF.tagLayout(n, wide).lines) assert.ok(wide(l, LF.tagLayout(n, wide).fs) <= T.maxW + 1e-6, n);
});
