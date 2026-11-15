// 위키미디어 공용 사진 판(C-15): 그림 묶음(art_*.js)과 그것을 쓰는 빌더가 서로 맞는지.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rd = (f) => fs.readFileSync(new URL('../../assets/church/' + f, import.meta.url), 'utf8');
const PACKS = { florence: ['tolentino', 'hawkwood', 'dante'], stpaul: ['apse', 'tombFront', 'tombFloor'], stpeter: ['pieta', 'peter'] };

test('그림 묶음: 성당마다 키가 다 있고, 한 점은 대략 200KB(모자이크 240KB) 이하의 손실 WebP 다', () => {
  for (const [church, keys] of Object.entries(PACKS)) {
    const src = rd('art_' + church + '.js');
    const m = src.match(/\.(\w+) = (\{.*\});\s*$/s);
    assert.equal(m[1], church);
    const pack = JSON.parse(m[2]);
    assert.deepEqual(Object.keys(pack).sort(), [...keys].sort());
    for (const k of keys) {
      const a = pack[k], b = Buffer.from(a.src.split(',')[1], 'base64');
      assert.ok(a.src.startsWith('data:image/webp;base64,'), k);
      assert.ok(b.length <= 240 * 1024, church + '.' + k + ' ' + b.length);
      assert.ok(Math.max(a.w, a.h) >= 640 && Math.max(a.w, a.h) <= 2048, church + '.' + k + ' ' + a.w + 'x' + a.h);
    }
    assert.match(src, /licenses\//, '묶음 머리말에 출처 문서가 적혀 있다');
  }
});

test('빌더: 묶음의 키를 읽고, 도형으로 만든 피에타·청동상 인물은 남아 있지 않다', () => {
  const sp = rd('ch_stpeter.js'), pa = rd('ch_stpaul.js');
  for (const k of PACKS.stpeter) assert.ok(sp.includes("artPhoto('" + k + "'"), k);
  for (const k of PACKS.stpaul) assert.ok(pa.includes("artPhoto('" + k + "'"), k);
  assert.ok(!/피에타 경당: 흰 조각군/.test(sp) && !/몸\(청동\)/.test(sp), '상자·원뿔·공 인물이 남아 있다');
  assert.ok(pa.includes('uv2.push(i2 / N, j2 / R)'), '반돔 UV 는 (둘레각, 올림각) — 사진을 그 격자에 펴 두었다');
  assert.ok(!/그리스도\(가운데\) \+ 양옆 성인/.test(pa), '반돔의 도형 인물이 남아 있다');
});
