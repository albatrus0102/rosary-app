// 구운 AO(web/ao_house.js)가 지금 빌더의 지오메트리와 맞는가(빌더를 고치고 다시 굽지 않으면 실패: node tools/ao_bake.mjs house)
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFresh, loadForBake } from '../tools/ao_bake.mjs';
test('ao_house.js 최신', async () => {
  const H = await loadForBake(['house']);
  const r = checkFresh(H.rooms);
  assert.equal(r.length, 1);
  assert.ok(r[0].ok, 'stale: ' + r[0].why + ' — node tools/ao_bake.mjs house');
});
test('gi_house.js 최신', async () => {
  const { checkFresh: giFresh, loadForGI } = await import('../tools/gi_bake.mjs');
  const H = await loadForGI(['house']);
  const r = giFresh(H.rooms);
  assert.ok(r[0].ok, 'stale: ' + r[0].why + ' — node tools/gi_bake.mjs house');
});
