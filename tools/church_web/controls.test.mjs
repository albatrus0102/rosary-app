// controls.js 입력 규칙: 웹 단독(왼쪽 절반 = 스틱)과 앱 연동(ext: 화면 전체 = 시점 회전·핀치, extPinch: 앱이 처리하는 확대).
// 실행: node tools/church_web/controls.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'church');
function make() {
  const handlers = {};
  const win = { innerWidth: 400, addEventListener() {}, document: null, console };
  win.window = win;
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'controls.js'), 'utf8'), win);
  const canvas = { clientWidth: 400, addEventListener(t, f) { handlers[t] = f; }, setPointerCapture() {} };
  const ctl = win.ChurchControls.create(canvas);
  const ev = (type, id, x, y) => handlers[type]({ type, pointerId: id, clientX: x, clientY: y });
  return { ctl, ev };
}
const move = (c) => c.ctl.getMove({ x: 0, y: 0 });

{ // 웹 단독: 왼쪽 절반을 끌면 걷는다(시점은 그대로)
  const c = make(); const yaw = c.ctl.yaw;
  c.ev('pointerdown', 1, 80, 400); c.ev('pointermove', 1, 80, 340);
  assert.ok(move(c).y > 0.9); assert.equal(c.ctl.yaw, yaw);
  c.ev('pointerup', 1, 80, 340); assert.equal(move(c).y, 0);
}
{ // 앱 연동(ext): 왼쪽 절반도 시점 회전, 스틱은 생기지 않는다
  const c = make(); c.ctl.ext = true; const yaw = c.ctl.yaw;
  c.ev('pointerdown', 1, 80, 400); c.ev('pointermove', 1, 120, 400);
  assert.equal(c.ctl.webActive, false); assert.equal(move(c).x, 0); assert.notEqual(c.ctl.yaw, yaw);
  c.ev('pointerup', 1, 120, 400);
}
{ // 앱 연동: 한 손가락이 왼쪽에 닿아 있어도 두 손가락이면 확대/축소
  const c = make(); c.ctl.ext = true; const z = c.ctl.zoom;
  c.ev('pointerdown', 1, 80, 400); c.ev('pointerdown', 2, 300, 400);
  const yaw = c.ctl.yaw;
  c.ev('pointermove', 2, 380, 400);   // 벌린다 → 가까이(zoom 작아짐)
  assert.ok(c.ctl.zoom < z); assert.equal(c.ctl.yaw, yaw);
  c.ev('pointerup', 1, 80, 400); c.ev('pointerup', 2, 380, 400);
}
{ // 앱이 처리하는 확대(extPinch): 한 손가락 끌기로 시점이 돌지 않고, pinchBy 가 같은 방향으로 줌을 바꾼다(범위 제한)
  const c = make(); c.ctl.ext = true; c.ctl.extPinch = true; const yaw = c.ctl.yaw, z = c.ctl.zoom;
  c.ev('pointerdown', 1, 300, 400); c.ev('pointermove', 1, 340, 380);
  assert.equal(c.ctl.yaw, yaw);
  c.ctl.pinchBy(1.25); assert.ok(Math.abs(c.ctl.zoom - z / 1.25) < 1e-9);
  c.ctl.pinchBy(100); assert.equal(c.ctl.zoom, 0.55);
  c.ctl.pinchBy(0.001); assert.equal(c.ctl.zoom, 1.6);
  c.ctl.pinchBy(NaN); c.ctl.pinchBy(0); assert.equal(c.ctl.zoom, 1.6);
  c.ctl.extPinch = false; c.ev('pointermove', 1, 380, 380); assert.notEqual(c.ctl.yaw, yaw);
}
console.log('controls.test: ok');
