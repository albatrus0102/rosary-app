// 룩 프리셋(looks.js)·화질 단계(render.js·main.js) 정적 시험. 실제 화면은 look_shots.mjs·glassplace.mjs·flicker.mjs 로 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets/church');
const read = (f) => fs.readFileSync(path.join(assets, f), 'utf8');

function loadLooks() {
  const sb = {}; sb.window = sb; vm.createContext(sb);
  vm.runInContext(read('looks.js'), sb);
  return sb.ChurchLooks;
}

test('looks: stpeter is active, every other church has a draft, default equals the previous final pass values', () => {
  const L = loadLooks();
  const ids = fs.readdirSync(assets).filter((f) => /^ch_[a-z]+\.js$/.test(f) && f !== 'ch_glass.js').map((f) => f.slice(3, -3));
  assert.deepEqual(Object.keys(L.LOOKS), ['stpeter']);   // 화면으로 검증한 것만 기본 적용
  for (const id of ids) assert.ok(L.LOOKS[id] || L.DRAFTS[id], 'look or draft for ' + id);
  assert.equal(L.get('milan').id, 'default');
  const d = L.get('nowhere');
  assert.equal(d.id, 'default');
  // 예전(G-04) 걷기 프로필 값: 채도 0.94, 난색 0.03, 비네트 0.16, 대비 없음, 블룸 0.92/0.3/0.55, 배율 1
  assert.deepEqual([d.sat, d.warm, d.vig, d.con, d.bloomT, d.bloomS, d.bloomR], [0.94, 0.03, 0.16, 0, 0.92, 0.3, 0.55]);
  for (const k of ['keyK', 'ambK', 'expK', 'envK', 'lampK', 'candleK', 'beamK', 'reflK', 'dustK']) assert.equal(d[k], 1, k);
  assert.equal(d.dust, 90);
});

test('looks: values stay in safe ranges and night blends linearly', () => {
  const L = loadLooks();
  for (const id of [...Object.keys(L.LOOKS), ...Object.keys(L.DRAFTS)]) {
    const l = { ...L.get('x'), ...(L.LOOKS[id] || L.DRAFTS[id]), night: (L.LOOKS[id] || L.DRAFTS[id]).night || {} };
    for (const n of [0, 0.5, 1]) {
      const b = L.blend(l, n, {});
      assert.ok(b.expK >= 0.6 && b.expK <= 1.2, id + ' expK');
      assert.ok(b.ambK >= 0.3 && b.ambK <= 1.2, id + ' ambK');
      assert.ok(b.con >= 0 && b.con <= 0.5, id + ' con');
      assert.ok(b.vig >= 0 && b.vig <= 0.45, id + ' vig');
      assert.ok(b.bloomT >= 0.6 && b.bloomS <= 0.8, id + ' bloom');
      assert.ok(b.sat >= 0.85 && b.sat <= 1.1, id + ' sat');
    }
    assert.ok(l.dust >= 0 && l.dust <= 200, id + ' dust (Points 1개, 정점 수 한도)');
  }
  const sp = L.get('stpeter'), h = L.blend(sp, 0.5, {});
  assert.ok(Math.abs(h.lampK - (sp.lampK + sp.night.lampK) / 2) < 1e-9);
});

test('render: three tiers, low has no composer, glass pixels keep the alpha-0 path, cached shadows, no nested reflections', () => {
  const r = read('render.js');
  assert.match(r, /function tierOf\(q\) \{ return q === 'low' \? 'low' : \(q === 'mid' \? 'mid' : 'high'\); \}/);
  assert.match(r, /if \(R\.tier !== 'low' && X\.EffectComposer\)/);
  assert.match(r, /float m = glassOn \* clamp\(1\.0 - s\.a, 0\.0, 1\.0\);/);   // 사진 창: 보정·톤매핑 건너뜀
  assert.match(r, /sc = mix\(sc, sc \* sc \* \(3\.0 - 2\.0 \* sc\), con\);/);   // 대비는 톤매핑 뒤, 창 마스크 앞
  assert.match(r, /renderer\.shadowMap\.needsUpdate = !!shadowNow;/);
  assert.match(r, /if \(R\._inAux\) return;/);
  assert.match(r, /c\.renderTarget2\.depthTexture = new T\.DepthTexture/);
  assert.match(r, /if \(hiT && X\.SSAOPass/);   // mid 는 SSAO 없음
  const m = read('main.js');
  assert.match(m, /function setQMode\(q\) \{ App\.qMode = q === 'low' \|\| q === 'mid' \|\| q === 'high' \? q : 'auto';/);
  assert.match(m, /function autoOn\(\) \{ return App\.qMode === 'auto'/);
  for (const f of ['index.html', 'test.html']) {
    const h = read(f);
    assert.ok(h.indexOf('looks.js') > 0 && h.indexOf('looks.js') < h.indexOf('world.js'), f + ' loads looks.js before world.js');
    assert.ok(h.indexOf('perf_hud.js') > 0 && h.indexOf('perf_hud.js') < h.indexOf('main.js'), f + ' loads perf_hud.js');
  }
});
