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
for (const f of ['three.min.js', 'palette.js', 'baptismal_names.js', 'geo.js', 'label_fit.js', 'avatar.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const A = ctx.ChurchAvatar, P = ctx.ChurchPalette, N = ctx.ChurchNames;
const known = JSON.parse(fs.readFileSync(path.resolve(root, '../../tools/names/known_names.json'), 'utf8'));

test('palette sizes and HEX format', () => {
  assert.equal(P.skin.length, 4);
  assert.equal(P.stylesF.length, 4);
  assert.equal(P.stylesM.length, 4);
  assert.equal(P.hair.length, 10);
  assert.equal(P.outfit.length, 12);
  assert.equal(P.pants.length, 12);
  for (const c of [...P.skin, ...P.hair, ...P.outfit, ...P.pants]) assert.match(c, /^#[0-9A-F]{6}$/);
});

test('baptismal names: one unified list within the wire cap, old lists map into it by name', () => {
  const CAP = 4096; // 서버 NAME_MAX(4095) + 1
  const list = Array.from(N.list);
  assert.ok(list.length >= 3774 && list.length <= CAP, `length ${list.length}`);
  assert.equal(new Set(list).size, list.length);
  for (const n of list) assert.ok(n.length >= 1 && n === n.trim() && !/[|\t\n]/.test(n), n);
  assert.equal(list[N.def], '마리아');
  assert.equal(P.namesF, undefined);
  // 옛 성별별 목록·옛 40개 목록의 모든 이름이 같은 이름의 새 인덱스를 갖는다
  assert.deepEqual(Array.from(N.oldF).map((i) => list[i]), known.female);
  assert.deepEqual(Array.from(N.oldM).map((i) => list[i]), known.male);
  assert.deepEqual(Array.from(N.legacy).map((i) => list[i]), known.legacy);
  assert.deepEqual(Array.from(N.oldF.slice(0, 3)).map((i) => list[i]), ['마리아', '안나', '엘리사벳']);
  assert.deepEqual(Array.from(N.oldM.slice(0, 3)).map((i) => list[i]), ['요셉', '베드로', '바오로']);
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

test('normalizeCfg: nv 2 keeps the unified name index, older formats are migrated by name', () => {
  const n = A.normalizeCfg, list = N.list;
  assert.deepEqual({ ...n({ g: 1, skin: 2, style: 3, hair: 9, outfit: 11, name: 3700, nv: 2 }) }, { g: 1, skin: 2, style: 3, hair: 9, outfit: 11, name: 3700, nv: 2 });
  assert.equal(n({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: list.length - 1, nv: 2 }).name, list.length - 1);
  assert.equal(n({ skin: 0, style: 0, hair: 0, outfit: 0, name: 5, nv: 2 }).g, 0);
  // 이미 옮긴 값을 다시 넣어도 그대로다
  const once = n({ g: 1, skin: 1, style: 1, hair: 1, outfit: 1, name: 3 });
  assert.deepEqual({ ...n(once) }, { ...once });
  // 옛 성별별 형식(nv 없음, g 있음): 여 4 = 아녜스, 남 3 = 요한, 남 70 = 파트리치오
  assert.equal(list[n({ g: 0, skin: 0, style: 0, hair: 0, outfit: 0, name: 4 }).name], '아녜스');
  assert.equal(list[n({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 3 }).name], '요한');
  assert.equal(list[n({ g: 1, skin: 0, style: 0, hair: 0, outfit: 0, name: 70 }).name], '파트리치오');
  for (let i = 0; i < known.female.length; i++) assert.equal(list[n({ g: 0, name: i }).name], known.female[i]);
  for (let i = 0; i < known.male.length; i++) assert.equal(list[n({ g: 1, name: i }).name], known.male[i]);
  // 가장 옛 형식(g 없음): name 22 = 요한(남성), 머리 모양 3(곱슬) → 웨이브(2)
  const old = n({ skin: 1, style: 3, hair: 2, outfit: 5, name: 22 });
  assert.equal(old.g, 1);
  assert.equal(list[old.name], '요한');
  assert.equal(old.style, 2);
  const oldF = n({ skin: 1, style: 2, hair: 2, outfit: 5, name: 4 });
  assert.equal(oldF.g, 0);
  assert.equal(list[oldF.name], '데레사');
  assert.equal(oldF.style, 3);
  // 범위를 벗어난 값은 허용 범위로 맞춘다(이름은 기본 이름 마리아)
  const wild = n({ g: 1, skin: 99, style: -3, hair: 123, outfit: 77, name: 1000 });
  assert.ok(wild.skin < 4 && wild.style < 4 && wild.hair < 10 && wild.outfit < 12);
  assert.equal(list[wild.name], '마리아');
  assert.equal(list[n({ g: 0, name: 99999, nv: 2 }).name], '마리아');
  assert.equal(list[n({ g: 0, name: -5, nv: 2 }).name], list[0]);
  assert.equal(n({ g: 0, name: 7, nv: 3 }).name, N.oldF[7]);
  assert.equal(n(undefined).g, 0);
});

test('realistic adult proportions', () => {
  assert.equal(A.HEIGHT, 1.7);
});
