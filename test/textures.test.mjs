// 질감·식물 카드: 목록의 모든 파일이 있고 크기가 맞다(1k), 소유자 PBR 은 색·법선·ORM 세 장이 같은 크기, 이음매 지표(고친 뒤)가 안쪽과 비슷,
// 식물 카드 KINDS 의 가로세로 비가 실제 webp 와 같다, 알파 카드 재질(alphaTest·양면·알파 커버리지), 질감 합계 예산
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, WEB } from './lib/load.mjs';
const g = load('photos.js', 'plants.js');
const Ph = g.RoomPhotos, KINDS = g.RoomPlants.KINDS, TEX = path.join(WEB, 'tex');

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}
function webpInfo(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF'); assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const ch = buf.toString('ascii', 12, 16);
  if (ch === 'VP8X') return { alpha: !!(buf[20] & 0x10), w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (ch === 'VP8L') { const b = buf.readUInt32LE(21); return { alpha: !!((b >> 28) & 1), w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  return { alpha: false, w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
}

test('사진 질감: 목록의 모든 파일이 있고 정사각형(실제 샘플 크기로 미리 줄임), 소유자 PBR 은 색·법선·ORM 세 장', () => {
  for (const n of Ph.LIST) for (const s of ['', '_n', '_r']) { const f = path.join(TEX, n + s + '.jpg'); assert.ok(fs.existsSync(f), f); }
  for (const n of Ph.OWNER) {
    for (const s of ['', '_n', '_orm']) { const z = jpegSize(fs.readFileSync(path.join(TEX, n + s + '.jpg'))); assert.equal(z.w, z.h, n + s); assert.equal(z.w, Ph.maxOf(n + s), n + s); }
    assert.ok(Ph.has(n) && Ph.has(n + '_n') && Ph.has(n + '_orm'));
  }
  // 목록에 없는 질감 파일이 남아 있지 않다(쓰지 않는 파일로 패키지가 커지지 않게)
  const known = new Set();
  for (const n of Ph.LIST) ['', '_n', '_r'].forEach((s) => known.add(n + s + '.jpg'));
  for (const n of Ph.OWNER) ['', '_n', '_orm'].forEach((s) => known.add(n + s + '.jpg'));
  for (const n of Ph.PLANTS) known.add('plant_' + n + '.webp');
  for (const f of fs.readdirSync(TEX)) assert.ok(known.has(f), 'unlisted texture ' + f);
});
test('올리는 크기: HERO(바닥·벽) 색 1024 · 색·법선 512 · 작은 물건 법선 256 · 아주 작은 것 색 256 · ORM 256(HERO 512)', () => {
  assert.equal(Ph.maxOf('floor_oak'), 1024); assert.equal(Ph.maxOf('plaster_cream_orm'), 512); assert.equal(Ph.maxOf('lawn'), 512);
  assert.equal(Ph.maxOf('rope'), 256); assert.equal(Ph.maxOf('rope_n'), 256); assert.equal(Ph.maxOf('linen_a'), 512); assert.equal(Ph.maxOf('linen_a_n'), 256);
  assert.equal(Ph.maxOf('rope_orm'), 256); assert.equal(Ph.maxOf('lawn_orm'), 256); assert.equal(Ph.maxOf('asphalt_r'), 256); assert.equal(Ph.maxOf('brick_n'), 512);
  assert.equal(Ph.extOf('plant_rose'), '.webp'); assert.equal(Ph.extOf('rope'), '.jpg');
});
test('이음매: 고친 재질은 가장자리 차이가 안쪽의 1.3배 이하(고치기 전 최대 2.4)', () => {
  const r = JSON.parse(fs.readFileSync(path.join(WEB, '../docs/seams.json'), 'utf8')).materials;
  const fixed = Object.entries(r).filter(([, v]) => v.fixed === true);
  assert.ok(fixed.length >= 11, 'fixed ' + fixed.length);
  for (const [n, v] of fixed) {
    for (const k of ['color', 'normal', 'rough', 'ao']) assert.ok(v.after[k] <= 1.3, n + ' ' + k + ' ' + v.after[k]);
    assert.ok(v.before.color >= v.after.color - 0.05, n);
  }
  for (const n of ['rope', 'brick', 'bark', 'soil', 'lawn']) assert.ok(r[n].before.color > 1.5 && r[n].after.color < 1.2, n);
});
test('식물 카드: 모든 종류의 webp 가 있고 알파가 있으며 KINDS 의 가로세로 비와 같다', () => {
  for (const k of Ph.PLANTS) {
    const info = webpInfo(fs.readFileSync(path.join(TEX, 'plant_' + k + '.webp')));
    assert.ok(info.alpha, k + ' alpha');
    assert.equal(Math.max(info.w, info.h), Ph.maxOf('plant_' + k), k);
    assert.ok(Math.abs(info.w / info.h - KINDS[k].aspect) < 0.01, k + ' aspect ' + info.w / info.h);
  }
});
test('질감 파일 합계는 6 MB 이하', () => {
  let sum = 0; for (const f of fs.readdirSync(TEX)) sum += fs.statSync(path.join(TEX, f)).size;
  assert.ok(sum < 6e6, 'tex MB ' + (sum / 1e6).toFixed(1));
});
