// controls.js 입력 규칙: 웹 단독(왼쪽 아래 손잡이 원 안 = 스틱, 그 밖 = 시점·핀치)과 앱 연동(ext: 화면 전체 = 시점 회전·핀치, extPinch: 앱이 처리하는 확대).
// 실행: node tools/church_web/controls.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'church');
function make() {
  const handlers = {};
  const win = { innerWidth: 400, innerHeight: 800, addEventListener() {}, document: null, console };
  win.window = win;
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'controls.js'), 'utf8'), win);
  const canvas = { clientWidth: 400, addEventListener(t, f) { handlers[t] = f; }, setPointerCapture() {} };
  const ctl = win.ChurchControls.create(canvas);
  const ev = (type, id, x, y) => handlers[type]({ type, pointerId: id, clientX: x, clientY: y });
  return { ctl, ev };
}
const move = (c) => c.ctl.getMove({ x: 0, y: 0 });

{ // 웹 단독: 왼쪽 아래 손잡이 원(기본: 중심 (74,726), 반지름 66) 안에서 끌면 걷는다(시점은 그대로)
  const c = make(); const yaw = c.ctl.yaw;
  c.ev('pointerdown', 1, 80, 720); c.ev('pointermove', 1, 80, 660);
  assert.ok(move(c).y > 0.9); assert.equal(c.ctl.yaw, yaw);
  c.ev('pointerup', 1, 80, 660); assert.equal(move(c).y, 0);
}
{ // 이동 영역 기하: 원(+8 여백) 안만. 왼쪽 절반의 나머지는 시점 끌기다.
  const c = make();
  assert.equal(c.ctl.inMoveZone(74, 726), true);          // 중심
  assert.equal(c.ctl.inMoveZone(74 + 66 + 8, 726), true);  // 여백 끝
  assert.equal(c.ctl.inMoveZone(74 + 66 + 9, 726), false);
  assert.equal(c.ctl.inMoveZone(80, 400), false);          // 왼쪽 절반 한가운데
  assert.equal(c.ctl.inMoveZone(20, 100), false);          // 왼쪽 위
  assert.equal(c.ctl.inMoveZone(300, 726), false);         // 오른쪽 아래
  // 앱이 알려 준 실제 원(펼침/접힘·안전 영역·오른쪽 손잡이로 바뀜)을 따른다
  c.ctl.setStick(330, 500, 66);
  assert.equal(c.ctl.inMoveZone(330, 500), true);
  assert.equal(c.ctl.inMoveZone(74, 726), false);
  c.ctl.setStick(NaN, 1, 66); assert.equal(c.ctl.stick, null);   // 잘못된 값은 기본 원으로
  assert.equal(c.ctl.inMoveZone(74, 726), true);
}
{ // 웹 단독: 왼쪽 절반(원 밖)에서 끌면 걷지 않고 시점이 돈다, 왼쪽에서도 두 손가락 핀치가 된다
  const c = make(); const yaw = c.ctl.yaw, z = c.ctl.zoom;
  c.ev('pointerdown', 1, 80, 300); c.ev('pointermove', 1, 130, 300);
  assert.equal(c.ctl.webActive, false); assert.equal(move(c).y, 0); assert.notEqual(c.ctl.yaw, yaw);
  c.ev('pointerdown', 2, 150, 300); c.ev('pointermove', 2, 250, 300);   // 둘 다 왼쪽 절반 근처에서 벌린다
  assert.ok(c.ctl.zoom < z);
  c.ev('pointerup', 1, 130, 300); c.ev('pointerup', 2, 250, 300);
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
