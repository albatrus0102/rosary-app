// 독서공방 끼워 넣기 요청(2차): 엔진 JS 에 한글 글자 없음 + setStrings · 걸음 보내기 박동 설정 · 미리 줄인 질감 · 음료 번호
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, WEB } from './lib/load.mjs';
const g = load('strings.js', 'photos.js', 'coffee.js', 'net_view.js');

// 주석·정규식을 뺀 코드(문자열 글자는 남긴다)
function codeOnly(src) {
  let out = '', i = 0, last = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, j + 1); i = j + 1; last = 's'; continue;
    }
    if (c === '/' && ('(,=:[!&|?{};+-*%<>~^'.includes(last) || last === '')) {
      let j = i + 1, cls = false; while (j < n && (src[j] !== '/' || cls) && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      i = j + 1; last = 'r'; continue;
    }
    out += c; if (!/\s/.test(c)) last = c; i++;
  }
  return out;
}
test('엔진 JS 에 한글 글자(문자열) 없음 — 화면 글자는 호스트가 setStrings·setPanel 로 준다(주석은 괜찮다)', () => {
  const bad = [];
  for (const f of fs.readdirSync(WEB)) {
    if (!f.endsWith('.js') || /^three/.test(f) || /^(ao|gi)_[a-z]+\.js$/.test(f)) continue;
    codeOnly(fs.readFileSync(path.join(WEB, f), 'utf8')).split('\n').forEach((ln, k) => { if (/[가-힣ㄱ-ㆎ]/.test(ln)) bad.push(f + ': ' + ln.trim().slice(0, 80)); });
  }
  assert.deepEqual(bad, []);
  // 검사기 자체 확인: 주석 속 한글은 빠지고 문자열 속 한글은 잡힌다
  assert.ok(!/[가-힣]/.test(codeOnly("var a = 1; // 한글\n/* 한글 */ var b = /x/g;")));
  assert.ok(/[가-힣]/.test(codeOnly("var a = '한글';")));
});
test('RoomStrings: 중립 영어 기본값, set 은 아는 키만·모양 맞는 값만, 바뀌면 알림, null 은 기본으로', () => {
  const S = g.RoomStrings; S.reset();
  assert.equal(S.get('seatFree'), 'Free seat'); assert.equal(S.seatLabel(3, ['a', 'b', 'c', 'Counter']), 'Counter'); assert.equal(S.seatLabel(9), 'Seat 10');
  let got = null; const off = S.on((ch) => { got = ch; });
  assert.deepEqual(S.set({ seatFree: '빈자리', seatLabels: ['창가 1'], unknown: 'x', boardNotes: 'not array' }), ['seatFree', 'seatLabels']);
  assert.deepEqual(got, ['seatFree', 'seatLabels']);
  assert.equal(S.seatLabel(0), '창가 1'); assert.equal(S.seatLabel(1), 'Seat 2');
  S.set({ seatFree: null }); assert.equal(S.get('seatFree'), 'Free seat');
  off(); S.reset();
});
test('걸음 보내기 박동: 걷는 중 3 Hz(5 cm·0.05 rad 넘게 움직일 때만), 서 있으면 10초마다, 앉으면 박동 없음(상태 바뀔 때만) — 설정 가능', () => {
  const sent = [], P = g.RoomNetView.createPoseSender({ send: (p) => sent.push(p) });
  let t = 0, x = 0;
  P.tick(t, { x, z: 0, yaw: 0, state: 'walk', seat: null });                 // 첫 번
  for (let i = 0; i < 30; i++) { t += 100; x += 0.12; P.tick(t, { x, z: 0, yaw: 0, state: 'walk', seat: null }); }   // 3초 걷기
  assert.ok(sent.length >= 8 && sent.length <= 11, 'walk 3Hz: ' + sent.length);
  for (let i = 0; i < 5; i++) { t += 100; P.tick(t, { x, z: 0.02, yaw: 0.01, state: 'walk', seat: null }); }   // 멈춘 뒤 마지막 자리 한 번
  const n0 = sent.length;
  for (let i = 0; i < 90; i++) { t += 100; P.tick(t, { x, z: 0.02, yaw: 0.01, state: 'walk', seat: null }); }   // 9초 거의 가만히(2 cm)
  assert.equal(sent.length, n0, 'no send while still < 10 s');
  for (let i = 0; i < 15; i++) { t += 100; P.tick(t, { x, z: 0.02, yaw: 0.01, state: 'walk', seat: null }); }
  assert.equal(sent.length, n0 + 1, 'heartbeat at 10 s');
  P.tick(t += 100, { x, z: 0, yaw: 0, state: 'sit', seat: 2 }); const n1 = sent.length;
  for (let i = 0; i < 600; i++) { t += 100; P.tick(t, { x, z: 0, yaw: 0, state: 'sit', seat: 2 }); }      // 60초 앉음
  assert.equal(sent.length, n1, 'no heartbeat while seated');
  P.tick(t += 100, { x, z: 0, yaw: 0, state: 'walk', seat: null }); assert.equal(sent.length, n1 + 1, 'state change sends at once');
  // 설정: 걷기 5 Hz, 서 있음 2초, 앉음 30초
  P.setRate({ hz: 5, idleSec: 2, seatedIdleSec: 30, minMove: 0.1 });
  assert.equal(P.rate(), 5); assert.deepEqual(P.config(), { hz: 5, idleMs: 2000, seatedIdleMs: 30000, minMove: 0.1, minTurn: 0.05 });
  P.setRate(4); assert.equal(P.rate(), 4);
});
test('질감은 실제로 샘플되는 크기로 실려 있다(photos.js maxOf 와 같음), 합계 6 MB 이하', () => {
  const Ph = g.RoomPhotos, TEX = path.join(WEB, 'tex');
  const size = (b) => { if (b.toString('ascii', 0, 4) === 'RIFF') { const ch = b.toString('ascii', 12, 16); if (ch === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]; if (ch === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; } return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]; }
    let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], L = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + L; } return null; };
  let sum = 0;
  for (const f of fs.readdirSync(TEX)) {
    const b = fs.readFileSync(path.join(TEX, f)); sum += b.length;
    const name = f.replace(/\.(jpg|webp)$/, ''), [w, h] = size(b);
    assert.equal(Math.max(w, h), Ph.maxOf(name), f + ' ' + w + 'x' + h);
  }
  assert.ok(sum <= 6e6, 'tex MB ' + (sum / 1e6).toFixed(2));
});
test('음료 번호: 3 머그(아메리카노) · 2 라떼 · 5 홍차 · 7 아이스, 대체 1→머그 · 4·6→라떼 — orderCoffee·setMyCup·setPeers cup 모두', () => {
  const k = g.RoomCoffee.kindOf;
  assert.deepEqual([3, 2, 5, 7, 1, 4, 6].map(k), ['americano', 'latte', 'tea', 'iced', 'americano', 'latte', 'latte']);
  assert.equal(k('3'), 'americano'); assert.equal(k(8), null); assert.equal(k(0), null);
  const T = g.RoomNetView.createTable();
  T.set([{ id: 'a', cup: 7 }, { id: 'b', cup: '2' }, { id: 'c', cup: 9 }], 0);
  assert.equal(T.peers.get('a').cup, 'iced'); assert.equal(T.peers.get('b').cup, 'latte'); assert.equal(T.peers.get('c').cup, null);
  // 앉은 자리에서 주문(setMyCup): 앉아 있으면 바로 그 좌석 컵 자리에
  const { layout } = { layout: { coffee: { cupSpots: [{ x: 1, y: 0.9, z: 2 }] } } };
  const L = g.RoomCoffee.Logic(layout.coffee); L.give(5); L.onSit(0);
  assert.deepEqual(L.cupState(), { where: 'spot', kind: 'tea', pos: { x: 1, y: 0.9, z: 2 }, seat: 0 });
});
