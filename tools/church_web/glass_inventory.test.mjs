// 스테인드글라스 전수 목록(glass_inventory.mjs, docs/church/GLASS_INVENTORY.md)으로 지키는 것:
// 실제 건물에 색유리가 있는 창 자리는 배포판에서 비거나(무늬 없는 옅은 판) 자리표시(예전 절차적 색 격자)로 남지 않는다.
// 권리가 살아 있는 창 자리는 추상 양식만, 실제가 옅은·무색·설화석고인 자리는 그 재질 그대로다. 개발용 유리(dev/)는 배포판 목록에 없다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { inventory, summary } from './glass_inventory.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const GEN = require('../../assets/church/glass_gen.js');
const CHURCHES = ['basic', 'stpeter', 'lateran', 'maggiore', 'stpaul', 'milan', 'florence', 'myeongdong', 'danggogae', 'yeouido'];
const inv = inventory();

test('inventory: every church is listed and every opening has a real-building entry', () => {
  assert.deepEqual(Object.keys(inv).sort(), CHURCHES.slice().sort());
  for (const id of CHURCHES) {
    assert.ok(inv[id].length > 0, id + ': no openings measured');
    for (const r of inv[id]) {
      assert.ok(r.real && r.real.kind && r.real.what !== '?', id + ' ' + r.key + ': real window not classified');
      assert.ok(!/^other_/.test(r.key), id + ' ' + r.key + ': opening without a key (adapter rule missing)');
    }
  }
});

test('release: no window opening is blank or a placeholder (stained positions show a photo or generated stained glass)', () => {
  const gaps = [];
  for (const id of CHURCHES) for (const r of inv[id]) if (!r.ok) gaps.push(id + ' ' + r.key + ': ' + r.gap + ' (real ' + r.real.kind + ', model ' + r.model.release + ')');
  assert.deepEqual(gaps, []);
  const s = summary(inv);
  for (const id of CHURCHES) assert.equal(s[id].cells, 0, id + ': old procedural colour grid left');
});

test('release: copyright-protected windows only get abstract generated glass (no figures, no copy of the work)', () => {
  let n = 0;
  for (const id of CHURCHES) for (const r of inv[id]) {
    if (r.real.kind !== 'stained_protected') continue;
    n++;
    const m = /^gen:([^ ]+)/.exec(r.model.release);
    assert.ok(m, id + ' ' + r.key + ': protected window should be generated abstract glass, got ' + r.model.release);
    for (const st of m[1].split('+')) {
      const S = GEN.STYLES[st];
      assert.ok(S && S.body === 'abstract' && S.head === 'abstract' && S.disc === 'abstract', id + ' ' + r.key + ': style ' + st + ' is not abstract');
    }
  }
  assert.ok(n >= 19, 'protected windows found: ' + n);   // 밀라노 15(V07·V26·V37·V39·V44·V46·V47·티부리오 8) + 마조레 1 + 명동 1 + 여의도 2
});

test('release: positions with plain, clear or alabaster glass stay plain (no figurative colour windows there)', () => {
  for (const id of CHURCHES) for (const r of inv[id]) {
    if (!['plain', 'clear', 'alabaster'].includes(r.real.kind)) continue;
    const m = r.model.release;
    assert.ok(m === 'plain' || /^photo:/.test(m) || /^gen:(clear|clear_warm|alabaster|florence_plain|grisaille)$/.test(m), id + ' ' + r.key + ': ' + r.real.kind + ' shown as ' + m);
  }
});

test('generator: every style used in a church fits one atlas page (≤ 2048×1024 at 256px cells) and has a beam tint', () => {
  const used = {};
  for (const id of CHURCHES) for (const r of inv[id]) { const m = /^gen:([^ ]+)/.exec(r.model.release) || (r.model.fallback && /^gen:([^ ]+)/.exec(r.model.fallback)); if (m) for (const st of m[1].split('+')) (used[id] = used[id] || new Set()).add(st); }
  for (const [id, set] of Object.entries(used)) {
    const tiles = {};
    for (const st of set) {
      const S = GEN.STYLES[st];
      assert.ok(S, 'unknown style ' + st);
      for (let v = 0; v < (S.variants || 1); v++) tiles[st + '|body|' + v] = { style: st, part: 'body', variant: v };
      tiles[st + '|head|0'] = { style: st, part: 'head', variant: 0 };
      for (let v = 0; v < (S.discs || 1); v++) tiles[st + '|disc|' + v] = { style: st, part: 'disc', variant: v };
      const b = GEN.beam(st);
      assert.equal(b.length, 3);
      b.forEach((c) => assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff));
    }
    // 최악(양식마다 몸통·머리·원창을 다 쓸 때)이 아니라 실제 쓰는 칸만 따지면 더 작다 — 여기서는 원창을 안 쓰는 양식의 원창 칸을 빼지 않는 보수적 상한
    const L = GEN.layout(tiles, 8, 8);
    assert.ok(L.fits, id + ': atlas does not fit even 2048×2048');
  }
});

test('release bundle: generator is shipped code, never dev glass; pages load it before kit.js', () => {
  const src = fs.readFileSync(path.join(assets, 'glass_gen.js'), 'utf8');
  assert.ok(!/devglass|DEV-0|milan55|ROSARIUM_DEV_GLASS/.test(src), 'glass_gen.js must not reference dev glass');
  for (const html of ['index.html', 'test.html']) {
    const h = fs.readFileSync(path.join(assets, html), 'utf8'), i = (f) => h.indexOf('<script src="' + f + '"');
    assert.ok(i('glass_gen.js') > 0 && i('glass_gen.js') < i('kit.js'), html + ': glass_gen.js before kit.js');
  }
  // 생성 무늬는 실제 작품 이름·작가를 담지 않는다(창작 무늬; 시대·짜임만)
  assert.ok(!/Hajnal|Carpi|Bertini|Ghiberti|이남규|하이날 1995 장미창의/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'no artist names in drawing code');
});
