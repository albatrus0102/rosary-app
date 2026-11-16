// bridge.js 가 웹 장면의 JS 오류를 {e:'jsError'} 로 Flutter 에 넘기는지(로사리움 「오류 기록 보내기」, lib/diag).
// 실행: node --test tools/church_web/js_error_bridge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(root, 'assets', 'church', f), 'utf8');

function load(buf) {
  const handlers = {};
  const posted = [];
  const win = {
    console: { log() {}, error() {} },
    addEventListener(t, f) { (handlers[t] ||= []).push(f); },
    FlutterChurch: { postMessage: (s) => posted.push(JSON.parse(s)) },
    __churchErrBuf: buf,
  };
  win.window = win;
  vm.runInNewContext(read('bridge.js'), win);
  const fire = (t, ev) => (handlers[t] || []).forEach((f) => f(ev));
  return { win, posted, fire, handlers };
}

test('처리되지 않은 오류·거부된 Promise 를 jsError 로 넘긴다(파일은 이름만)', () => {
  const { posted, fire } = load([]);
  const err = new TypeError('x is undefined');
  fire('error', { message: 'Uncaught TypeError: x is undefined', filename: 'file:///android_asset/flutter_assets/assets/church/main.js?v=2', lineno: 120, colno: 7, error: err });
  fire('unhandledrejection', { reason: new Error('pack stpeter') });
  assert.equal(posted.length, 2);
  assert.deepEqual(
    { e: posted[0].e, kind: posted[0].kind, src: posted[0].src, line: posted[0].line, col: posted[0].col },
    { e: 'jsError', kind: 'error', src: 'main.js', line: 120, col: 7 },
  );
  assert.match(posted[0].stack, /TypeError/);
  assert.equal(posted[1].kind, 'rejection');
  assert.equal(posted[1].msg, 'pack stpeter');
  // Flutter 쪽 판정(DiagJs.handleRaw)이 보는 머리 모양
  assert.ok(JSON.stringify(posted[0]).startsWith('{"e":"jsError"'));
});

test('같은 문구는 한 번, 한 페이지에서 30건까지', () => {
  const { posted, fire } = load([]);
  for (let i = 0; i < 5; i++) fire('error', { message: 'same', lineno: 1 });
  assert.equal(posted.length, 1);
  for (let i = 0; i < 50; i++) fire('error', { message: 'm' + i, lineno: i });
  assert.equal(posted.length, 30);
});

test('bridge.js 앞 스크립트의 오류(index.html 이 모아 둔 것)를 넘기고 버퍼를 닫는다', () => {
  const { win, posted } = load([['error', 'SyntaxError: Unexpected token', 'three_extras.js', 3, 1, '']]);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].src, 'three_extras.js');
  assert.equal(win.__churchErrBuf, null);
  assert.match(read('index.html'), /window\.__churchErrBuf=\[\][\s\S]*<script src="three\.min\.js">/, 'index.html 첫 스크립트가 버퍼를 연다');
});

test('API 메서드가 던지면 kind:api 로 넘긴다', () => {
  const { win, posted } = load([]);
  win.ChurchAPI._bind({ api: { sit() { throw new Error('no seat'); } } });
  win.ChurchAPI.sit({});
  assert.equal(posted.length, 1);
  assert.equal(posted[0].kind, 'api');
  assert.equal(posted[0].msg, 'sit: no seat');
});

test('addEventListener 가 없는 곳(시험 상자)에서도 bridge.js 가 뜬다', () => {
  const win = { console };
  win.window = win;
  vm.runInNewContext(read('bridge.js'), win);
  assert.equal(typeof win.ChurchAPI.init, 'function');
});
