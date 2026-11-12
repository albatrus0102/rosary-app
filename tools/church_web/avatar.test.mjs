// 사용: node --test tools/church_web/avatar.test.mjs — 아바타 지오메트리 예산(삼각형 수)과 색상표 모양을 확인한다(DOM·WebGL 불필요).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const ctx = vm.createContext({ console, Math, Date, Float32Array, Uint16Array, Uint8Array });
ctx.window = ctx;
for (const f of ['three.min.js', 'palette.js', 'geo.js', 'avatar.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const A = ctx.ChurchAvatar, P = ctx.ChurchPalette;

test('palette sizes and HEX format', () => {
  assert.equal(P.skin.length, 4);
  assert.equal(P.styles.length, 4);
  assert.equal(P.hair.length, 10);
  assert.equal(P.outfit.length, 12);
  for (const c of [...P.skin, ...P.hair, ...P.outfit]) assert.match(c, /^#[0-9A-F]{6}$/);
});

test('avatar triangle budgets per LOD', () => {
  const s = A.stats();
  for (let i = 0; i < 4; i++) {
    assert.ok(s.near['style' + i] <= 6000, `near style ${i}: ${s.near['style' + i]}`);
    assert.ok(s.mid['style' + i] <= 1500, `mid style ${i}: ${s.mid['style' + i]}`);
  }
  for (const n of s.far) assert.ok(n <= 400, `far impostor: ${n}`);
});

test('realistic adult proportions', () => {
  assert.equal(A.HEIGHT, 1.7);
});
