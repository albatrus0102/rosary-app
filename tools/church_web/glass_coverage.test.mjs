// 밀라노 모든 유리 창에 그림 칸(lancet)이 빈틈없이 걸린다 — 절차적 색 격자·팔각 도형이 비치지 않는다.
// (사용자 보고: "밀라노 스테인드글라스 양쪽에 이상한 도형") 개발용 임시 유리(dev/devglass.js)의 순수 계산 + 밀라노 빌더 원본 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { measureMilan } from './milan_openings.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const DG = require('../../assets/church/dev/devglass.js');
const table = require('../../assets/church/dev/devglass_milan.js');
const anchors = measureMilan().anchors;
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const glass = anchors.filter((x) => x.kind === 'glass');

test('coverage: every Milan glass opening is fully covered by image lancets (own row, or a borrowed neighbour image)', () => {
  const pl = DG.plan(table, anchors, { dev: true });
  const by = new Map();
  for (const p of pl.filter((q) => q.status === 'placed')) by.set(p.anchor, p);
  for (const f of pl.fillers) { assert.ok(!by.has(f.anchor), 'filler on an already placed window: ' + f.anchor); by.set(f.anchor, f); }
  for (const a of glass) {
    const p = by.get(a.key);
    assert.ok(p, 'glass opening without any image: ' + a.key);
    assert.equal(p.lancets.length, Math.max(1, a.lights || 1), a.key + ': one strip per lancet');
    assert.ok(near(p.lancets.reduce((n, q) => n + q.w, 0), a.w), a.key + ': strips span the opening width');
    const tex = p.texture || p.rect.texture, px = table.rows.find((r) => r.texture === tex).px;
    const y0 = Math.min(...p.lancets.map((q) => q.y - q.h / 2)), y1 = Math.max(...p.lancets.map((q) => q.y + q.h / 2));
    assert.ok(near(y1, a.apex) || (p.rect && near(y1, p.rect.box.y1)), a.key + ': reaches the arch top');
    assert.ok(y0 >= a.sill - 1e-6, a.key + ': not below the sill');
    for (const q of p.lancets) {
      assert.ok(q.uv.every((v) => v >= -1e-9 && v <= 1 + 1e-9), a.key + ': uv inside the image');
      const ua = Math.abs(q.uv[2] - q.uv[0]) * px[0], va = Math.abs(q.uv[3] - q.uv[1]) * px[1];
      assert.ok(near(ua / va, q.w / q.h, 0.01 * q.w / q.h), a.key + ': picture aspect kept (cover, no stretch)');
    }
  }
  assert.equal(glass.filter((a) => by.has(a.key)).length, glass.length, 'every glass opening covered exactly once');
  // 문(cfDoor_*): 문짝 위 아치 부채꼴 유리도 덮는다
  for (const a of anchors.filter((x) => x.kind === 'door' && x.apex - x.spring > 0.3)) {
    const f = by.get(a.key);
    assert.ok(f && f.lancets.length === 1, 'door fan light uncovered: ' + a.key);
    assert.ok(near(f.lancets[0].y - f.lancets[0].h / 2, a.spring) && near(f.lancets[0].y + f.lancets[0].h / 2, a.apex), a.key + ': spring..apex');
  }
});

test('coverage: borrowed images are atlas-sized (no new texture, no extra big draw call), some mirrored', () => {
  const pl = DG.plan(table, anchors, { dev: true });
  assert.ok(pl.fillers.length >= 30);
  for (const f of pl.fillers) {
    const px = table.rows.find((r) => r.texture === f.texture).px;
    assert.ok(Math.max(px[0], px[1]) <= DG.ATLAS_MAX, f.anchor + ': donor ' + f.texture);
  }
  assert.ok(pl.fillers.some((f) => f.lancets[0].uv[0] > f.lancets[0].uv[2]), 'mirrored fillers exist');
});

test('coverage: Milan procedural glass no longer draws octagon medallions or the blue/red checker ground', () => {
  const src = fs.readFileSync(path.join(assets, 'ch_milan.js'), 'utf8');
  assert.ok(!/GROUND\[/.test(src), 'checker ground removed');
  assert.ok(!/win\.medal\)/.test(src.replace(/medal: /g, '')), 'medallion branch removed');
  assert.ok(!/oct\.push/.test(src), 'octagon polygon removed');
});
