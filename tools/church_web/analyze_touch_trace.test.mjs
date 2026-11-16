// analyze_touch_trace.mjs 를 합성 기록으로 시험한다: 정상 사슬, setInput 이 웹에 없던 고장(이번 제보), 따라가기가 되돌림, 동시 터치 없음.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseTrace, analyze, format } from './analyze_touch_trace.mjs';

const T0 = 1_763_000_000_000;
const header = { type: 'header', format: 'rosarium-touch-trace', v: 1, buildId: 'abc123-11161200',
  device: { manufacturer: 'samsung', model: 'SM-F946N', device: 'q5q', android: '14', sdk: 34, app: '0.1.0+1' },
  screen: { logical: [882, 1104], dpr: 2.4, features: [{ type: 'fold', state: 'postureFlat', bounds: [441, 0, 441, 1104] }] },
  webview: { plugin: 'webview_flutter 4.14.1', ua: 'Mozilla/5.0 Chrome/131.0' } };

/** 손잡이를 잡고 걷다가(0ms) 다른 손가락으로 시점을 돌리는(200~800ms) 기록. opts 로 사슬의 한 곳을 끊는다. */
function synth(opts = {}) {
  const ev = [];
  const at = (ms, o) => ev.push({ t: T0 + ms, ...o });
  at(0, { s: 'f', k: 'p', ty: 'down', id: 3, r: 'stick', x: 80, y: 1000 });
  at(1, { s: 'f', k: 'dec', what: 'stick-grab', id: 3 });
  for (let i = 0; i < 30; i++) at(10 + i * 33, { s: 'tx', k: 'msg', m: 'setJoystick', a: { x: 0, y: 0.9 } });
  at(200, { s: 'f', k: 'p', ty: 'down', id: 4, r: opts.secondRole || 'look', x: 600, y: 500 });
  at(201, { s: 'f', k: 'dec', what: 'look-start', id: 4 });
  at(202, { s: 'tx', k: 'msg', m: 'setInput', a: { look: true } });
  if (opts.apiMissing) at(205, { s: 'js', k: 'apiMissing', m: 'setInput' });
  for (let i = 0; i < 15; i++) {
    const ms = 240 + i * 33;
    at(ms, { s: 'f', k: 'p', ty: 'move', id: 4, r: opts.secondRole || 'look', x: 600 + i * 8, y: 500 });
    if (!opts.notSent) at(ms + 1, { s: 'tx', k: 'msg', m: 'setInput', a: { dx: 8, dy: 0 } });
    if (!opts.noWeb) {
      at(ms + 6, { s: 'js', k: 'in', a: { dx: 8, dy: 0 }, yaw: 0.2 - i * 0.052 });
      at(ms + 10, { s: 'js', k: 'f', yaw: 0.2 - i * 0.052, ly: -0.052, fy: opts.followUndo ? 0.05 : 0, xl: 1, dr: 1, joy: [0, 0.9], spd: 1.3, rig: { o: 0, fp: 0 } });
    }
  }
  at(800, { s: 'f', k: 'p', ty: 'up', id: 4, r: opts.secondRole || 'look' });
  at(801, { s: 'tx', k: 'msg', m: 'setInput', a: { look: false } });
  at(1000, { s: 'tx', k: 'msg', m: 'setJoystick', a: { x: 0, y: 0 } });
  at(1001, { s: 'f', k: 'p', ty: 'up', id: 3, r: 'stick' });
  return [JSON.stringify(header), ...ev.map((e) => JSON.stringify(e))].join('\n') + '\n';
}

test('정상 기록: 사슬 이상 없음, 보냄=받음, 이동 중 yaw 는 시점 입력으로만 바뀐다', () => {
  const r = analyze(parseTrace(synth()));
  assert.equal(r.chain.broken, null, format(r));
  assert.equal(r.messages.lookSent, 15);
  assert.equal(r.messages.lookReceived, 15);
  assert.deepEqual(r.pointers.flutterDownByRole, { stick: 1, look: 1 });
  assert.equal(r.episodes.length, 1);
  assert.equal(r.episodes[0].lookMoves, 15);
  assert.ok(r.whileWalking.yawFromLook > 0.7);
  assert.equal(r.whileWalking.yawFromFollow, 0);
  const txt = format(r);
  assert.match(txt, /SM-F946N/);
  assert.match(txt, /사슬 이상 없음/);
});

test('이번 제보의 고장: 웹에 setInput 이 없으면 send-ok 에서 끊겼다고 짚는다', () => {
  const r = analyze(parseTrace(synth({ apiMissing: true, noWeb: true })));
  assert.equal(r.chain.broken.name, 'send-ok');
  assert.match(r.chain.broken.why, /setInput/);
  assert.deepEqual(r.messages.apiMissing, ['setInput']);
});

test('웹 기록이 전혀 없으면 web-trace 에서 끊긴다(setInput 이 웹에 안 닿음)', () => {
  const r = analyze(parseTrace(synth({ noWeb: true })));
  assert.equal(r.chain.broken.name, 'web-trace');
});

test('Flutter 가 움직임을 봤는데 보내지 않으면 look-sent', () => {
  const r = analyze(parseTrace(synth({ notSent: true })));
  assert.equal(r.chain.broken.name, 'look-sent');
});

test('자동 따라가기가 되돌리면 not-undone', () => {
  const r = analyze(parseTrace(synth({ followUndo: true })));
  assert.equal(r.chain.broken.name, 'not-undone');
  assert.ok(r.whileWalking.followWhileLookHeld > 0);
});

test('두 번째 손가락이 HUD 에 닿았으면 동시 구간이 없다고 알려 준다', () => {
  const r = analyze(parseTrace(synth({ secondRole: 'hud' })));
  assert.equal(r.chain.broken.name, 'stick+look-together');
  assert.match(r.chain.broken.why, /HUD/);
});

test('명령줄: 파일을 읽어 요약을 찍는다(깨진 줄은 건너뜀)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-'));
  const file = path.join(dir, 'rosarium_touch.jsonl');
  fs.writeFileSync(file, synth() + '{not json\n');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = execFileSync(process.execPath, [path.join(here, 'analyze_touch_trace.mjs'), file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.match(out, /성당 터치 기록 요약/);
  assert.match(out, /시점 보냄 15 \/ 받음 15/);
  const json = JSON.parse(execFileSync(process.execPath, [path.join(here, 'analyze_touch_trace.mjs'), file, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(json.chain.broken, null);
  fs.rmSync(dir, { recursive: true });
});
