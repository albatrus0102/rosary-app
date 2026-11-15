// 개발용 임시 유리(E-4, docs/church/GLASS_DEV_PIPELINE.md) 순수 시험: 대응표·anchor·판 계산·릴리스 차단·해제·QA Gallery·밀라노 건축 확장.
// 렌더 시험(화면 캡처·실제 WebGL 해제)은 tools/church_web/milan55_shots.mjs (헤드리스, node --test 밖).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { measureMilan, makeSandbox, runFiles, CORE } from './milan_openings.mjs';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const assets = path.join(repo, 'assets/church');
const DG = require('../../assets/church/dev/devglass.js');
const table = require('../../assets/church/dev/devglass_milan.js');
const GP = require('../../assets/church/glass_placements.js');
const Logic = require('../../assets/church/scene_logic.js');
const Stations = require('../../assets/church/stations.js');

const m = measureMilan();
const anchors = m.anchors, byKey = Object.fromEntries(anchors.map((a) => [a.key, a]));
const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const M = 4.512, XN = M, XA = 2 * M, XW = 3 * M, XT = 20.2, ZF = 34.9, zk = (k) => ZF - M * k, ZCH = (zk(11) + zk(9)) / 2;
const CH = { mouth: 2.8, end: 1.4, depth: 3.12, wallT: 0.7 };   // ch_milan.js CHAP(경당 평면)
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);   // vm 샌드박스에서 온 값은 구조만 견준다

// ---------- 대응표 ----------
test('table: 55 rows, every row is a dev-only placeholder (never release approved, never a historical match)', () => {
  assert.equal(table.church, 'milan');
  assert.equal(table.rows.length, 55);
  assert.equal(table.release_approved, false);
  assert.equal(table.texture_matches_historical_work, false);
  const ids = new Set();
  table.rows.forEach((r, i) => {
    assert.equal(r.dev_id, 'DEV-' + String(i + 1).padStart(3, '0'));
    assert.ok(!ids.has(r.dev_id)); ids.add(r.dev_id);
    assert.strictEqual(r.release_approved, false, r.dev_id);
    assert.strictEqual(r.texture_matches_historical_work, false, r.dev_id);
    assert.ok(['confirmed', 'probable', 'assumed', 'unplaced'].includes(r.certainty), r.dev_id);
    if (r.hang === false) assert.ok(r.anchor && r.hold_ko && r.hold_ko.length > 3, r.dev_id + ': 보류에는 자리와 까닭');
    assert.ok(typeof r.placement_evidence === 'string' && r.placement_evidence.length > 3, r.dev_id);
    assert.ok(typeof r.evidence_ko === 'string' && r.evidence_ko.length > 8, r.dev_id + ' 근거');
    assert.equal(r.anchor === null, r.certainty === 'unplaced', r.dev_id + ': anchor 없음 ⇔ unplaced');
    assert.ok(['contain', 'cover'].includes(r.fit));
  });
});

test('table: matches the source sheet (art/glass_milan55) — evidence, ids and texture sizes', () => {
  const src = JSON.parse(fs.readFileSync(path.join(repo, 'art/glass_milan55/milan_55_claude_placement.json'), 'utf8'));
  assert.equal(src.rows.length, 55);
  src.rows.forEach((s, i) => {
    const r = table.rows[i];
    assert.equal(r.dev_id, s.dev_id);
    assert.equal(r.placement_evidence, s.placement_evidence, r.dev_id);
    assert.equal(r.plan_id, s.plan_id); assert.equal(r.archive_id, s.archive_id);
    assert.equal(s.release_approved, false); assert.equal(s.texture_matches_historical_work, false);
    assert.deepEqual(r.px, pngSize(path.join(repo, 'art/glass_milan55', s.texture_file)), r.dev_id + ' px');
  });
});

test('table: dev placeholders are not in the authentic placement table or the catalog', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(assets, 'glass_catalog.json'), 'utf8'));
  const catIds = new Set(cat.windows.map((w) => w.id));
  const placed = JSON.stringify(GP.churches);
  for (const r of table.rows) {
    assert.ok(!catIds.has(r.dev_id) && !catIds.has(r.texture));
    assert.ok(!placed.includes(r.dev_id));
  }
  assert.ok(!/DEV-0|devglass|milan55/.test(fs.readFileSync(path.join(assets, 'glass_placements.js'), 'utf8')));
  // 진본 사진 창은 그대로: 밀라노의 진본 자리는 여전히 하나(apse_center_lower)
  assert.deepEqual(GP.winsOf('milan'), ['milan_apse_lower']);
  assert.equal(m.glassSlots.length, 1);
  assert.equal(m.glassSlots[0].win, 'milan_apse_lower');
});

test('pack: 55 images at the original resolution (no upscaling), flagged not release approved', { skip: !fs.existsSync(path.join(assets, 'dev/gpack_dev_milan.js')) && 'pack not generated' }, () => {
  const txt = fs.readFileSync(path.join(assets, 'dev/gpack_dev_milan.js'), 'utf8');
  const pack = JSON.parse(txt.slice(txt.indexOf(']=') + 2, txt.lastIndexOf(';')));
  assert.equal(pack.kind, 'orig'); assert.equal(pack.release_approved, false);
  assert.equal(Object.keys(pack.images).length, 55);
  for (const r of table.rows) {
    const im = pack.images[r.texture];
    assert.ok(im, r.texture);
    assert.deepEqual([im.w, im.h], r.px, r.dev_id + ' 팩 크기 = 원본 크기');
    assert.ok(im.src.startsWith('data:image/webp;base64,'));
    // WebP 머리말(VP8X)의 캔버스 크기도 같다
    const b = Buffer.from(im.src.slice(23, 23 + 64), 'base64');
    if (b.toString('ascii', 12, 16) === 'VP8X') assert.deepEqual([1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)], r.px, r.dev_id + ' webp');
  }
});

// ---------- anchor ----------
test('anchors: the builder exports one keyed anchor per opening, keys unique, equal to the measured openings', () => {
  assert.equal(m.openings.length, 78);
  assert.equal(anchors.length, 78);
  const keys = anchors.map((a) => a.key);
  assert.equal(new Set(keys).size, keys.length, 'duplicate anchor key');
  for (const o of m.openings) {
    assert.ok(o.anchor, 'opening without builder anchor: ' + o.key);
    const a = byKey[o.key];
    assert.equal(a.kind, o.kind, o.key);
    assert.ok(near(a.w, o.w, 0.011) && near(a.sill, o.sill, 0.011) && near(a.apex, o.apex, 0.011), o.key + ' size');
    assert.ok(Math.hypot(a.x - o.x, a.z - o.z) < 0.05 && near(a.y, o.y, 0.011), o.key + ' position');
    assert.ok(near(a.nx, o.nx, 0.002) && near(a.nz, o.nz, 0.002), o.key + ' normal');
  }
  // 예전부터 있던 개구부는 위치로 추론한 key 와 같다(측랑·익랑·후진·고창·티부리오)
  for (const o of m.openings) if (/^(aisle|trWest|trEast|trEnd|apse_|clere|tiburio)/.test(o.key)) assert.equal(o.key, o.inferredKey);
  const count = (re) => keys.filter((k) => re.test(k)).length;
  assert.deepEqual([count(/^aisle/), count(/^tr(West|East|End)/), count(/^chap/), count(/^amb/), count(/^apse/), count(/^cfDoor/), count(/^cfLower/), count(/^cfUpper/), count(/^clere/), count(/^tiburio/)],
    [16, 8, 8, 0, 3, 5, 5, 3, 22, 8]);
});

test('side order as the avatar sees it: facing the altar, DEV-001 is the first window on the right, DEV-039 the first on the left', () => {
  const row = (id) => table.rows.find((r) => r.dev_id === id), a = (id) => byKey[row(id).anchor];
  // +x = 남 = 제대를 볼 때 오른쪽, 입구는 +z
  assert.ok(a('DEV-001').x > 13 && a('DEV-039').x < -13);
  for (let i = 1; i < 8; i++) assert.ok(a('DEV-00' + i).z > a('DEV-00' + (i + 1)).z, 'south order');
  for (let i = 39; i > 32; i--) assert.ok(a('DEV-0' + i).z > a('DEV-0' + (i - 1)).z, 'north order');
  assert.ok(a('DEV-019').x > 0 && near(a('DEV-020').x, 0) && a('DEV-021').x < 0, 'apse: south / center / north');
  // 벽을 따라 도는 순서(남): P09 서쪽 벽 → P10 → 경당 P11~13 → P14 → P15 동쪽 벽
  const zs = ['DEV-009', 'DEV-010', 'DEV-011', 'DEV-012', 'DEV-013', 'DEV-014', 'DEV-015'].map((id) => a(id).z);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] < zs[i - 1], 'south transept order ' + i);
});

// ---------- 판 계산 ----------
const planned = DG.plan(table, anchors, { dev: true });
test('plan: all 55 rows are either placed in the church or QA-only; no duplicate anchors', () => {
  const s = DG.summary(planned);
  assert.deepEqual(s, { total: 55, placed: 42, qa: 13, skipped: 0, confirmed: 35, probable: 7, assumed: 0, hold: 6 });
  const used = new Set();
  for (const p of planned) {
    assert.ok(['placed', 'qa'].includes(p.status), p.dev_id + ' ' + p.status + ' ' + p.why);
    if (p.status !== 'placed') { assert.ok(['unplaced', 'hold'].includes(p.why)); continue; }
    assert.ok(!used.has(p.anchor), 'anchor used twice: ' + p.anchor); used.add(p.anchor);
    assert.equal(byKey[p.anchor].kind, 'glass');
  }
  assert.deepEqual(planned.filter((p) => p.why === 'unplaced').map((p) => p.dev_id), ['DEV-049', 'DEV-050', 'DEV-051', 'DEV-052', 'DEV-053', 'DEV-054', 'DEV-055']);
  // 성구실 창 6개(V16~18, V22~24)는 성구실 방을 짓기 전까지 보류: QA Gallery 에만
  const hold = planned.filter((p) => p.why === 'hold');
  assert.deepEqual(hold.map((p) => p.dev_id), ['DEV-016', 'DEV-017', 'DEV-018', 'DEV-022', 'DEV-023', 'DEV-024']);
  assert.ok(hold.every((p) => p.hold_ko === '성구실 미구현' && !byKey[p.anchor]));
  // 같은 anchor 를 두 행이 가리키면 둘째는 걸지 않는다
  const dup = { rows: [table.rows[0], { ...table.rows[1], anchor: table.rows[0].anchor }] };
  assert.equal(DG.plan(dup, anchors, { dev: true })[1].why, 'duplicate_anchor:DEV-001');
});

test('plan: panels keep the texture aspect (no stretching), sit inside the opening box, face the room, 3cm in front of the glass', () => {
  for (const p of planned.filter((q) => q.status === 'placed')) {
    const r = p.rect, a = byKey[p.anchor], row = table.rows.find((x) => x.dev_id === p.dev_id);
    assert.ok(Math.abs(r.w / r.h - row.px[0] / row.px[1]) / (row.px[0] / row.px[1]) < 0.01, p.dev_id + ' aspect');
    assert.ok(r.w <= a.w + 1e-6 && r.y + r.h / 2 <= a.apex + 1e-6 && r.y - r.h / 2 >= a.sill - 1e-6, p.dev_id + ' inside box');
    assert.ok(near(r.w, a.w, 1e-6) || near(r.h, r.box.y1 - r.box.y0, 1e-6), p.dev_id + ' contain touches the box');
    assert.ok(near(r.y + r.h / 2, a.apex, 1e-6), p.dev_id + ' top aligned');
    assert.deepEqual(r.uv, [0, 0, 1, 1]);
    assert.ok(near(r.x, a.x + a.nx * DG.FRONT, 1e-6) && near(r.z, a.z + a.nz * DG.FRONT, 1e-6), p.dev_id + ' plane offset');
    assert.ok(near(r.yawDeg, a.yawDeg, 0.02) || near(Math.abs(r.yawDeg - a.yawDeg), 360, 0.02), p.dev_id + ' yaw');
    assert.ok(['lead', 'glass'].includes(r.rest));
    assert.equal(r.rest, r.cover >= 0.75 ? 'lead' : 'glass');
  }
});

test('plan: DEV-020 hangs only above the authentic photo of the apse centre window', () => {
  const a = byKey.apse_center, p = planned.find((q) => q.dev_id === 'DEV-020');
  assert.ok(a.photoH > 2.7 && a.photoH < 2.8);
  assert.ok(p.rect.y - p.rect.h / 2 >= a.sill + a.photoH + 0.05, 'dev panel must not cover the photo');
  assert.ok(near(p.rect.box.y0, a.sill + a.photoH + 0.06, 1e-6));
  const s = m.glassSlots[0];
  assert.ok(p.rect.box.y0 > s.y + s.h / 2, 'box starts above the photo slot');
});

test('plan: cover fit crops the texture instead of stretching it', () => {
  const t = { rows: [{ ...table.rows[6], fit: 'cover' }] }, p = DG.plan(t, anchors, { dev: true })[0], a = byKey.aisleS_b7;
  assert.ok(near(p.rect.w, a.w) && near(p.rect.h, a.h));
  const [u0, v0, u1, v1] = p.rect.uv, px = table.rows[6].px;
  assert.ok(near(((u1 - u0) * px[0]) / ((v1 - v0) * px[1]), a.w / a.h, 1e-6), 'visible part has the opening aspect');
  assert.ok(near(v1, 1) && v0 > 0, 'top aligned: the bottom is cropped');
});

// ---------- 릴리스 차단 ----------
test('release gate (JS): without the dev flag nothing unapproved is placed', () => {
  const off = DG.plan(table, anchors, { dev: false });
  assert.equal(off.filter((p) => p.status === 'placed').length, 0);
  assert.ok(off.filter((p) => p.anchor && p.why !== 'hold').every((p) => p.why === 'not_release_approved'));
  assert.equal(DG.enabled(), false, 'no location → disabled');
  // 플래그 판정: devglass=1 일 때만
  const flag = (search) => { const sb = { location: { search } }; sb.window = sb; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(assets, 'dev/devglass.js'), 'utf8'), sb); return sb.ChurchDevGlass.enabled(); };
  assert.equal(flag('?church=milan&devglass=1'), true);
  assert.equal(flag('?devglass=1&church=milan'), true);
  assert.equal(flag('?church=milan'), false);
  assert.equal(flag('?devglass=0'), false);
  assert.equal(flag('?devglass=10'), false);
  assert.equal(flag('?xdevglass=1'), false);
});

test('release gate (packaging): assets/church/dev is not in pubspec, nothing outside dev/ carries or statically loads the placeholders', () => {
  const pub = fs.readFileSync(path.join(repo, 'pubspec.yaml'), 'utf8');
  const listed = pub.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- assets/'));
  assert.ok(listed.includes('- assets/church/'));
  assert.ok(!listed.some((l) => /church\/dev|_devbundle|glass_milan55/.test(l)), 'dev assets must not be listed in pubspec.yaml');
  assert.ok(!/glass_milan55|gpack_dev/.test(pub));
  // Flutter 는 'assets/church/' 항목으로 그 폴더의 파일만 싣는다(하위 폴더 제외) → dev/ 아래에만 있어야 한다
  const top = fs.readdirSync(assets).filter((f) => fs.statSync(path.join(assets, f)).isFile());
  for (const f of top) {
    assert.ok(!/^(gpack_dev|devglass|ch_qa)/.test(f), 'dev file in the bundled folder: ' + f);
    if (!/\.(js|json)$/.test(f) || f === 'three.min.js' || f === 'three_extras.js' || f.startsWith('gpack_') || f.startsWith('cross_pack') || f.startsWith('tex_pack') || f === 'env_church.js') continue;
    const s = fs.readFileSync(path.join(assets, f), 'utf8');
    assert.ok(!/gpack_dev|DEV-0\d\d|milan55/.test(s), f + ' mentions dev placeholders');
    assert.ok(!/<script src="dev\//.test(s), f + ' loads dev/ statically');
  }
  for (const page of ['index.html', 'test.html']) {
    const s = fs.readFileSync(path.join(assets, page), 'utf8');
    const hooks = s.match(/dev\/[a-z_]+\.js/g) || [];
    assert.deepEqual(hooks, ['dev/devglass_boot.js'], page);
    assert.ok(s.includes("if(/[?&]devglass=1(&|$)/.test(location.search))document.write('<script src=\"dev/devglass_boot.js\">"), page + ': gated by the flag');
  }
  // 코어는 dev 모듈을 모른다(끼어드는 쪽은 dev/devglass.js)
  for (const f of ['main.js', 'world.js', 'kit.js', 'render.js', 'glass_place.js', 'glass_view.js', 'bridge.js', 'ch_milan.js']) {
    assert.ok(!/ChurchDevGlass|devglass/.test(fs.readFileSync(path.join(assets, f), 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), f + ' references the dev module');
  }
});

test('devglass off: the milan builder output does not depend on the flag (same glass, same anchors)', () => {
  const on = measureMilan({ search: '?church=milan&devglass=1' });
  assert.equal(on.glassTriangles, m.glassTriangles);
  same(on.anchors, m.anchors);
  same(on.stats, m.stats);
  assert.equal(on.colliders.length, m.colliders.length);
});

// ---------- 해제(누수) ----------
function devSandbox(search) {
  const sb = makeSandbox();
  sb.location.search = search;
  runFiles(sb, CORE.concat(['ch_milan.js']));
  const groups = [];
  sb.ChurchWorld = { create: (scene, opts) => { const b = sb.ChurchBuilders[opts.church], ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: 'low' }); b.build(ctx); const w = { id: opts.church, ctx, builder: b, group: new sb.THREE.Group(), env: { night: 0 }, updates: 0, disposed: 0, update() { this.updates++; }, dispose() { this.disposed++; } }; groups.push(w.group); return w; } };
  sb.ChurchGlassView = { shaders: { vs: 'void main(){gl_Position=vec4(0.0);}', fs: 'void main(){gl_FragColor=vec4(1.0);}' } };
  sb.Image = function () { const im = this; im.naturalWidth = 0; Object.defineProperty(im, 'src', { set(v) { const k = sb.__sizes[v]; im.naturalWidth = im.width = k[0]; im.naturalHeight = im.height = k[1]; Promise.resolve().then(() => im.onload && im.onload()); } }); };
  sb.document.head = { appendChild() { throw new Error('pack must already be in memory'); } };
  sb.Promise = Promise;
  runFiles(sb, ['dev/devglass.js', 'dev/devglass_milan.js', 'dev/ch_qa_glass.js']);
  // 가짜 팩(그림 대신 크기만): 실제 팩 파일 없이도 로더 경로를 탄다
  const images = {}; sb.__sizes = {};
  for (const r of table.rows) { const src = 'fake:' + r.texture; images[r.texture] = { w: r.px[0], h: r.px[1], src }; sb.__sizes[src] = r.px; }
  sb.ChurchDevGlassPack = { 'gpack_dev_milan.js': { set: 'milan55', kind: 'orig', images } };
  const renderer = { capabilities: { isWebGL2: true, getMaxAnisotropy: () => 4 } };
  return { sb, renderer, groups };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('dispose: entering and leaving 6 times frees every dev texture, material and mesh (milan and QA Gallery)', async () => {
  const { sb, renderer } = devSandbox('?devglass=1');
  const D = sb.ChurchDevGlass;
  assert.equal(D.enabled(), true);
  let texDisposed = 0, geoDisposed = 0, matDisposed = 0;
  for (let i = 0; i < 6; i++) {
    const id = i % 2 ? 'qa_milan55' : 'milan';
    const w = sb.ChurchWorld.create(null, { church: id, renderer });
    assert.ok(w.devGlass, 'attached');
    await tick(); await tick(); await tick();
    assert.equal(w.devGlass.state, 'fading');
    const sum = w.devGlass.summary;
    assert.equal(sum.placed, id === 'milan' ? 42 : 55);
    // 아틀라스 1 + 큰 그림 3 + 뒤판 1 = draw call 5
    same(Array.from(w.group.children, (c) => c.name), ['devglass-lead', 'devglass-atlas', 'devglass-DEV-001', 'devglass-DEV-002', 'devglass-DEV-003']);
    assert.equal(w.devGlass.textures.length, 4);
    for (const c of w.group.children) { c.geometry.addEventListener('dispose', () => geoDisposed++); c.material.addEventListener('dispose', () => matDisposed++); }
    for (const x of w.devGlass.textures) x.addEventListener('dispose', () => texDisposed++);
    const quads = w.group.children.filter((c) => c.name !== 'devglass-lead').reduce((n, c) => n + c.geometry.index.count / 6, 0);
    assert.equal(quads, sum.placed, 'one quad per placed row');
    w.update(0.1); w.update(0.2);
    assert.equal(w.devGlass.state, 'ready');
    assert.equal(w.updates, 2, 'the original update still runs');
    for (const mt of w.devGlass.mats) if (mt.uniforms) assert.equal(mt.uniforms.uFade.value, 1);
    w.dispose();
    assert.equal(w.disposed, 1, 'the original dispose still runs');
    assert.equal(w.group.children.length, 0);
    assert.equal(w.devGlass.state, 'gone');
    w.dispose();   // 두 번 불러도 한 번만 해제
  }
  assert.equal(D.stats.created, 24);
  assert.equal(D.stats.disposed, 24);
  assert.equal(D.stats.meshes, 0);
  assert.deepEqual([texDisposed, geoDisposed, matDisposed], [24, 30, 30]);
  assert.equal(D.current(), null);
  assert.equal(D.stats.errors, 0);
});

test('dispose: leaving before the pictures arrive creates nothing; flag off or other churches attach nothing', async () => {
  const { sb, renderer } = devSandbox('?devglass=1');
  const w = sb.ChurchWorld.create(null, { church: 'milan', renderer });
  w.dispose();
  await tick(); await tick(); await tick();
  assert.equal(w.group.children.length, 0);
  assert.equal(sb.ChurchDevGlass.stats.created, 0);
  const off = devSandbox('?church=milan');
  const w2 = off.sb.ChurchWorld.create(null, { church: 'milan', renderer: off.renderer });
  await tick();
  assert.equal(w2.devGlass, undefined);
  assert.equal(w2.group.children.length, 0);
  assert.equal(off.sb.ChurchDevGlass.stats.attaches, 0);
});

test('atlas: small pictures are packed without overlap inside a power-of-two canvas', () => {
  const items = table.rows.filter((r) => Math.max(r.px[0], r.px[1]) <= DG.ATLAS_MAX).map((r) => ({ id: r.texture, w: r.px[0], h: r.px[1] }));
  assert.equal(items.length, 52);
  const A = DG.packAtlas(items, 2048);
  assert.ok(A.w <= 2048 && A.h <= 2048 && (A.w & (A.w - 1)) === 0 && (A.h & (A.h - 1)) === 0);
  const rs = items.map((i) => A.at[i.id]);
  rs.forEach((r, i) => {
    assert.ok(r.x >= 4 && r.y >= 4 && r.x + r.w <= A.w - 4 && r.y + r.h <= A.h - 4);
    for (let j = i + 1; j < rs.length; j++) { const q = rs[j]; assert.ok(r.x + r.w + 8 <= q.x || q.x + q.w + 8 <= r.x || r.y + r.h + 8 <= q.y || q.y + q.h + 8 <= r.y, 'overlap'); }
  });
});

// ---------- QA Gallery ----------
test('QA Gallery: dev-only builder with all 55 pictures at their own aspect, labelled by status', () => {
  const { sb } = devSandbox('?devglass=1');
  const b = sb.ChurchBuilders.qa_milan55;
  assert.ok(b && b.viewing === true && b.devOnly === true);
  assert.ok(!fs.existsSync(path.join(assets, 'ch_qa_glass.js')), 'the QA builder lives in dev/ only');
  const ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: 'low' });
  b.build(ctx);
  const A = ctx._.glassAnchors;
  assert.equal(A.length, 55);
  assert.equal(new Set(A.map((a) => a.key)).size, 55);
  const cnt = {};
  A.forEach((a) => { cnt[a.status] = (cnt[a.status] || 0) + 1; });
  same(cnt, { placed: 35, hold: 6, probable: 7, unplaced: 7 });
  const pl = sb.ChurchDevGlass.plan(sb.ChurchDevGlass.tables.qa_milan55, A, { dev: true });
  assert.equal(pl.filter((p) => p.status === 'placed').length, 55);
  pl.forEach((p, i) => { const px = table.rows[i].px; assert.ok(Math.abs(p.rect.w / p.rect.h - px[0] / px[1]) < 0.01 * px[0] / px[1], p.dev_id); assert.ok(p.rect.h <= 3.4 + 1e-6 && p.rect.w <= 1.6 + 1e-6); });
  // 같은 벽에서 이웃 그림이 겹치지 않고 방 안에 있다
  for (const side of [1, -1]) {
    const L = A.filter((a) => Math.sign(a.x) === side).sort((p, q) => q.z - p.z);
    for (let i = 1; i < L.length; i++) assert.ok(L[i - 1].z - L[i - 1].w / 2 - (L[i].z + L[i].w / 2) >= 0.5, 'gap between pictures');
    assert.ok(L.every((a) => a.z > 0.5 && a.z < b.layout.bounds.z1));
  }
  // 걸을 수 있다: 스폰이 경계 안, 방 끝까지 충돌 없이
  const Lg = Logic.create(b.layout, { colliders: ctx._.colliders, zones: ctx._.zones }), p = { x: b.layout.spawn.x, z: b.layout.spawn.z };
  assert.equal(Lg.moveCircle(p, 0, 0), false);
  for (let i = 0; i < 400; i++) Lg.moveCircle(p, 0, -0.2);
  assert.ok(p.z < 1.5, 'walked to the far end: ' + p.z);
  // 서버·레이아웃 목록에 들어가지 않는다
  assert.ok(!sb.ChurchLayouts.ids().includes('qa_milan55'));
});

// ---------- 밀라노 건축 확장(E-4) ----------
test('counter-facade: 5 doors, 5 lower and 3 upper windows on the aisle centre lines, clear of the pilasters', () => {
  const cols = { n2: -(XA + XW) / 2, n1: -(XN + XA) / 2, c: 0, s1: (XN + XA) / 2, s2: (XA + XW) / 2 };
  for (const [nm, x] of Object.entries(cols)) {
    const d = byKey['cfDoor_' + nm], lo = byKey['cfLower_' + nm], up = byKey['cfUpper_' + nm];
    assert.ok(d && lo, nm);
    assert.equal(d.kind, 'door'); assert.equal(lo.kind, 'glass');
    assert.ok(near(d.x, x, 1e-3) && near(lo.x, x, 1e-3), nm + ' on the aisle centre line');
    assert.ok(near(d.sill, 0) && lo.sill > d.apex + 0.5, nm + ' lower window above the door');
    if (nm === 'n2' || nm === 's2') assert.equal(up, undefined); else { assert.ok(near(up.x, x, 1e-3)); assert.ok(up.sill > lo.apex + 0.8, nm + ' upper above lower'); assert.ok(up.apex - up.spring > up.w / 2 + 0.2, nm + ' upper window is pointed'); }
    assert.ok(near(lo.apex - lo.spring, lo.w / 2, 1e-6), nm + ' lower window is round-headed (rise = half width)');
    assert.ok(near(d.nz, -1) && near(lo.nz, -1), 'faces the nave');
  }
  // 벽기둥(기둥줄 ±XN, ±XA, 폭 1.3 + 머리 돌출 0.1) 과 겹치지 않는다. 스플레이(0.3)까지 넣어도.
  for (const a of anchors.filter((q) => q.key.startsWith('cf'))) {
    for (const px of [-XA, -XN, XN, XA]) assert.ok(Math.abs(a.x - px) >= a.w / 2 + 0.3 + 0.75, a.key + ' overlaps the pilaster at x=' + px);
    assert.ok(Math.abs(a.x) + a.w / 2 + 0.3 < XW - 0.5, a.key + ' inside the side walls');
  }
  assert.ok(m.openings.every((o) => !o.hidden));
  // 하단 창 크기 = 실제 유리 치수 × 0.47
  const c = byKey.cfLower_c, s = byKey.cfLower_s2;
  assert.ok(near(c.w, 3.43 * 0.47, 0.01) && near(c.h, 7.69 * 0.47, 0.01));
  assert.ok(near(s.w, 2.46 * 0.47, 0.01) && near(s.h, 6.2 * 0.47, 0.01));
  const uc = byKey.cfUpper_c, us = byKey.cfUpper_s1;
  assert.ok(near(uc.w, 3.3 * 0.47, 0.01) && near(uc.h, 9.88 * 0.47, 0.01));
  assert.ok(near(us.w, 2.53 * 0.47, 0.01) && near(us.h, 5.75 * 0.47, 0.01));
  // 조사 E-2 의 좌우: 안에서 정문을 볼 때 왼쪽(+x) → 오른쪽(-x) 하단 V43·V42·V45·V41·V40, 상단 V46·V47·V44
  const at = (v) => byKey[table.rows.find((r) => r.v_id === v).anchor].x;
  assert.ok(at('V43') > at('V42') && at('V42') > at('V45') && at('V45') > at('V41') && at('V41') > at('V40'));
  assert.ok(at('V46') > at('V47') && at('V47') > at('V44') && near(at('V44'), at('V41'), 1e-3) && near(at('V46'), at('V42'), 1e-3));
  // 입구 스폰·성수대 앞은 그대로 비어 있다
  const L = Logic.create(m.layout, { colliders: m.colliders, zones: m.zones });
  for (const q of [[0, 32.5], [0, 33.9], [6.77, 33.6], [-6.77, 33.6], [11.28, 33.6], [-11.28, 33.6]]) assert.equal(L.moveCircle({ x: q[0], z: q[1] }, 0, 0), false, 'blocked at ' + q);
});

test('ambulatory: the straight outer walls stay blind (the real windows P16~18, P22~24 belong to the sacristies)', () => {
  assert.equal(anchors.filter((a) => a.key.startsWith('amb') || a.key.startsWith('sac')).length, 0);
  assert.ok(!anchors.some((a) => Math.abs(Math.abs(a.x) - XA) < 1 && a.z < zk(12) - 0.5 && a.z > -29.5 && a.sill < 15), 'no opening in the ambulatory side walls');
});

test('transept windows: enlarged towards the real proportions (sill 1.7m, apex 10.7m, real widths x 0.47)', () => {
  for (const k of ['trEndS_west', 'trEndS_east', 'trEndN_west', 'trEndN_east', 'trEastS', 'trEastN']) { const a = byKey[k]; assert.ok(near(a.w, 3.53 * 0.47, 0.01) && near(a.h, 9.0, 0.01) && near(a.apex, 10.7, 0.01), k); }
  for (const k of ['trWestS', 'trWestN']) { const a = byKey[k]; assert.ok(near(a.w, 3.0 * 0.47, 0.01) && near(a.h, 9.0, 0.01), k); }
  // 그 칸의 궁륭 꼭대기(11.28m) 아래
  for (const a of anchors.filter((q) => /^tr(End|West|East)/.test(q.key))) assert.ok(a.apex + 0.3 * 1.3 + 0.1 < 11.28, a.key);
});

test('transept chapels: walkable inside the bounds, closed by walls, three lancets each (+ upper window)', () => {
  const lay = m.layout, B = lay.bounds;
  same([B.x0, B.x1], [-23.52, 23.52]);
  assert.ok(B.x1 > XT + CH.depth);
  const L = Logic.create(lay, { colliders: m.colliders, zones: m.zones }), S = Stations.create(L);
  for (const sg of [1, -1]) {
    const SD = sg > 0 ? 'S' : 'N';
    for (const k of ['w', 'c', 'e', 'upper']) assert.ok(byKey['chap' + SD + '_' + k], 'chap' + SD + '_' + k);
    const c = byKey['chap' + SD + '_c'], w = byKey['chap' + SD + '_w'], e = byKey['chap' + SD + '_e'];
    assert.ok(near(c.nx, -sg) && near(c.z, ZCH, 1e-3));
    assert.ok(w.z > ZCH && e.z < ZCH && w.nz < 0 && e.nz > 0 && w.nx * sg < 0 && e.nx * sg < 0, 'side windows face the chapel centre');
    const up = byKey['chap' + SD + '_upper'];
    assert.ok(up.sill > 8.2 + 3.3 + 1.0 && near(up.x, sg * (XT + 0.52), 0.02) && up.w >= 3 && up.h >= 6, 'large pointed window above the chapel arch, in the transept end wall');
    for (const a of [c, w, e]) assert.ok(near(a.w, 2.18 * 0.47, 0.01) && near(a.h, 16.36 * 0.47, 0.01), a.key + ' = real 2.18 x 16.36 m x 0.47');
    // 반육각형: 사선 면은 끝 면과 60° 를 이룬다
    assert.ok(near(Math.abs(w.nz), Math.cos(Math.PI / 6), 0.01) && near(Math.abs(e.nx), 0.5, 0.01), 'half hexagon');
    // 경당 안: 걸을 수 있고 입구에서 걸어서 닿는다
    const inside = [[sg * 20.6, ZCH], [sg * 21.5, ZCH], [sg * 21.5, ZCH + 1.5], [sg * 21.5, ZCH - 1.5], [sg * 21.75, ZCH]];
    for (const q of inside) {
      assert.ok(q[0] > B.x0 && q[0] < B.x1);
      assert.equal(L.moveCircle({ x: q[0], z: q[1] }, 0, 0), false, 'chapel floor blocked at ' + q);
      assert.ok(S.isReachable(q[0], q[1]), 'chapel not reachable at ' + q);
    }
    const path = S.findPath({ x: lay.spawn.x, z: lay.spawn.z }, { x: sg * 21.6, z: ZCH });
    assert.ok(path && path.len > 40 && path.len < 80, 'path from the entrance into the chapel');
    // 벽이 막는다: 경당 안에서 어느 쪽으로 걸어도 평면(사다리꼴) 밖으로 나가지 못한다
    for (let ang = 0; ang < 360; ang += 15) {
      const p = { x: sg * 21.5, z: ZCH }, dx = Math.cos(ang * Math.PI / 180) * 0.1, dz = Math.sin(ang * Math.PI / 180) * 0.1;
      for (let i = 0; i < 120; i++) L.moveCircle(p, dx, dz);
      const d = p.x * sg - XT;   // 끝 벽 안쪽 면에서의 깊이
      if (d > 0.5) {
        assert.ok(d < CH.depth - 0.2, `ang ${ang}: walked through the end wall (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
        const hw = d <= CH.wallT ? CH.mouth : CH.mouth + (CH.end - CH.mouth) * (d - CH.wallT) / (CH.depth - CH.wallT);
        assert.ok(Math.abs(p.z - ZCH) < hw + 0.05, `ang ${ang}: walked through a side wall (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      }
    }
    // 익랑 끝 벽은 입구 아치 밖에서는 여전히 막혀 있다
    for (const z of [-3.4, -17.0, ZCH + CH.mouth + 0.5, ZCH - CH.mouth - 0.5]) {
      const p = { x: sg * 18.5, z };
      for (let i = 0; i < 80; i++) L.moveCircle(p, sg * 0.1, 0);
      assert.ok(p.x * sg < XT, 'end wall open at z=' + z);
    }
    // 건물 밖(경당 옆 빈 곳)은 닿지 않는다
    assert.ok(!S.isReachable(sg * 22.5, ZCH + 5.5) && !S.isReachable(sg * 22.5, 5));
  }
  // 좌석·촛불대·스폰은 그대로
  assert.equal(L.seats.length, 120);
  same(lay.candles.stands.filter((s) => !s.shrine).map((s) => [s.x, s.z]), [[-11.7, 10.09], [11.7, 10.09]]);
});

test('way of the cross: 14 plaques on pilaster faces, none on a window, door or chapel arch', () => {
  const P = m.layout.crossWay.plaques;
  assert.equal(P.length, 14);
  for (const p of P) {
    const onAisle = Math.abs(Math.abs(p.x) - (XW - 0.574)) < 0.01, onEnd = Math.abs(Math.abs(p.x) - (XT - 0.574)) < 0.01;
    assert.ok(onAisle || onEnd);
    assert.ok([1, 2, 3, 4, 7, 9, 11].some((k) => near(p.z, zk(k), 1e-3)), 'on a pilaster line');
    // 같은 벽면의 개구부와 수평으로 겹치지 않는다(판 폭 0.7)
    for (const a of anchors) {
      if (a.nx * p.face[0] + a.nz * p.face[1] < 0.7) continue;
      if (Math.abs((a.x - p.x) * p.face[0] + (a.z - p.z) * p.face[1]) > 1.2) continue;
      const along = Math.abs((a.x - p.x) * p.face[1] - (a.z - p.z) * p.face[0]);
      assert.ok(along > a.w / 2 + 0.3 + 0.35, `plaque at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) overlaps ${a.key}`);
    }
    if (onEnd) assert.ok(Math.abs(p.z - ZCH) > CH.mouth + 0.3 + 0.35, 'clear of the chapel arch');
  }
});

// ---------- 보고서 ----------
test('report: docs/church/MILAN_55_RESULT.md is up to date with the table and the builder', async () => {
  const { results } = await import('./milan55_report.mjs');
  const { rows, summary } = results();
  assert.equal(rows.length, 55);
  assert.equal(rows.filter((r) => r.status === 'placed').length, summary.placed);
  assert.ok(rows.filter((r) => r.status === 'placed').every((r) => r.transform && r.opening && r.anchor));
  assert.ok(rows.filter((r) => r.status !== 'placed').every((r) => r.why && !r.transform));
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [path.join(here, 'milan55_report.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
