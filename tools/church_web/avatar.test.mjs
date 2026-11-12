// 사용: node --test tools/church_web/avatar.test.mjs — 아바타(클레이 스타일) 지오메트리 예산(삼각형 수)과 색상표 모양을 확인한다(DOM·WebGL 불필요).
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
  assert.equal(P.stylesF.length, 4);
  assert.equal(P.stylesM.length, 4);
  assert.equal(P.hair.length, 10);
  assert.equal(P.outfit.length, 12);
  assert.equal(P.pants.length, 12);
  for (const c of [...P.skin, ...P.hair, ...P.outfit, ...P.pants]) assert.match(c, /^#[0-9A-F]{6}$/);
});

test('baptismal name lists: 60+ per gender, unique, within the wire cap, legacy names all present', () => {
  const CAP = 100; // 서버 NAME_MAX(99) + 1
  for (const list of [P.namesF, P.namesM]) {
    assert.ok(list.length >= 60 && list.length <= CAP, `length ${list.length}`);
    assert.equal(new Set(list).size, list.length);
    for (const n of list) assert.ok(n.length >= 2 && n.length <= 8, n);
  }
  assert.equal(P.namesLegacy.length, 40);
  P.namesLegacy.forEach((n, i) => assert.ok((i < 20 ? P.namesF : P.namesM).includes(n), `legacy ${i} ${n}`));
  assert.deepEqual(P.namesF.slice(0, 3), ['마리아', '안나', '엘리사벳']);
  assert.deepEqual(P.namesM.slice(0, 3), ['요셉', '베드로', '바오로']);
});

test('avatar triangle budgets per LOD for all 8 gender/style combinations', () => {
  const s = A.stats();
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < 4; i++) {
      assert.ok(s.near[`g${g}s${i}`] <= 6000, `near g${g} style ${i}: ${s.near[`g${g}s${i}`]}`);
      assert.ok(s.mid[`g${g}s${i}`] <= 1500, `mid g${g} style ${i}: ${s.mid[`g${g}s${i}`]}`);
    }
  }
  for (let i = 0; i < 4; i++) {
    assert.ok(s.near['style' + i] <= 6000 && s.mid['style' + i] <= 1500);
  }
  for (const n of s.far) assert.ok(n <= 400, `far impostor: ${n}`);
});

test('normalizeCfg: new format keeps g/style/name, legacy format is migrated', () => {
  const n = A.normalizeCfg;
  assert.deepEqual({ ...n({ g: 1, skin: 2, style: 3, hair: 9, outfit: 11, name: 70 }) }, { g: 1, skin: 2, style: 3, hair: 9, outfit: 11, name: 70 });
  assert.deepEqual({ ...n({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: 64 }) }.name, 64);
  // 옛 형식: name 22 = 요한(남성) → 남성 목록의 요한, 머리 모양 3(곱슬) → 웨이브(2)
  const old = n({ skin: 1, style: 3, hair: 2, outfit: 5, name: 22 });
  assert.equal(old.g, 1);
  assert.equal(P.namesM[old.name], '요한');
  assert.equal(old.style, 2);
  const oldF = n({ skin: 1, style: 2, hair: 2, outfit: 5, name: 4 });
  assert.equal(oldF.g, 0);
  assert.equal(P.namesF[oldF.name], '데레사');
  assert.equal(oldF.style, 3);
  // 범위를 벗어난 값은 허용 범위로 맞춘다
  const wild = n({ g: 1, skin: 99, style: -3, hair: 123, outfit: 77, name: 1000 });
  assert.ok(wild.skin < 4 && wild.style < 4 && wild.hair < 10 && wild.outfit < 12 && wild.name < P.namesM.length);
  assert.equal(n(undefined).g, 0);
});

test('avatar builds for every gender/style with a name tag', () => {
  for (let g = 0; g < 2; g++) for (let st = 0; st < 4; st++) {
    const av = new A.Avatar({ g, skin: 1, style: st, hair: 2, outfit: 3, name: 5 }, {});
    assert.equal(av.cfg.g, g);
    assert.ok(av.tag, 'tag sprite');
    av.setLod(1); av.setLod(2); av.setLod(0);
    av.setConfig({ g: 1 - g, skin: 0, style: st, hair: 0, outfit: 0, name: 1 });
    assert.equal(av.cfg.g, 1 - g);
  }
});

test('realistic adult proportions', () => {
  assert.equal(A.HEIGHT, 1.7);
});
