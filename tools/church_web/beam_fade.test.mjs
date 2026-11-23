// 가산 빛줄기 판(world.js beamMat): 카메라가 판 가까이·판 속에 있거나 판을 정면으로 마주 볼 때 사라지고 가산 세기에 상한이 있는지(화면 하얗게 날아감 방지).
// 화면 측정 자료: 아시시 상부 신랑 정면 창(low, 11시) 포화 화소 53.6% → 0.3%. 여기서는 셰이더 조각이 빠지지 않았는지만 소스로 지킨다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fs.readFileSync(fileURLToPath(new URL('../../assets/church/world.js', import.meta.url)), 'utf8');
const m = src.match(/beamMat\.onBeforeCompile = function[\s\S]*?\n    \};/);

test('beamMat: 카메라 거리·판 면 거리·정면 시선 감쇠와 세기 상한이 있다', () => {
  assert.ok(m, 'beamMat.onBeforeCompile 블록');
  const b = m[0];
  assert.match(b, /smoothstep\([^)]*bmD\)/, '카메라 거리 감쇠');
  assert.match(b, /smoothstep\([^)]*bmC \* bmD\)/, '판 면까지 거리 감쇠');
  assert.match(b, /smoothstep\([^)]*bmC\)/, '정면 시선 감쇠');
  assert.match(b, /min\(diffuseColor\.rgb, vec3\(0\.5\)\)/, '가산 세기 상한');
  assert.match(src, /beamMat\.extensions = \{ derivatives: true \}/);
});
