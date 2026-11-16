// 실물 성상 3D 스캔(scan3d.js · scan3d_<키>.js, tools/statues/make_scan_pack.mjs):
// 묶음이 풀리는지, 삼각형·용량 예산, 라이선스(CC0·CC BY·CC BY-NC·퍼블릭 도메인만)와 출처 표기(앱·licenses·ASSET_LICENSES),
// 빌더가 쓰는 자리(여의도 제외), 브라우저 비슷한 환경에서 LOD 가 서는지, 묶음이 실패하면 예전 절차 생성이 따로 그려지는지.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..'), assets = path.join(repo, 'assets/church');
const read = (p) => fs.readFileSync(path.join(repo, p), 'utf8');

function sandbox({ head = true, packs = [], failLoad = [] } = {}) {
  const noop = () => {};
  const ctx2d = new Proxy(noop, { get: (t, k) => (k === 'canvas' ? {} : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k === 'getImageData' || k === 'createImageData') ? (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }) : noop), set: () => true });
  const sb = { console, performance, setTimeout, clearTimeout, WebAssembly, Promise, atob: (s) => Buffer.from(s, 'base64').toString('binary') };
  sb.window = sb; sb.self = sb;
  sb.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d, toDataURL: () => '', addEventListener: noop }),
    getElementById: () => null, readyState: 'complete', addEventListener: noop, body: { insertAdjacentHTML: noop },
    head: head ? { appendChild: (el) => { setTimeout(() => (el.onerror ? el.onerror() : null), 1); } } : undefined   // 아직 안 읽힌 묶음 = 읽기 실패
  };
  sb.location = { search: '' }; sb.navigator = { userAgent: 'node' }; sb.Image = function () {};
  vm.createContext(sb);
  const run = (f) => vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sb, { filename: f });
  ['three.min.js', 'three_extras.js', 'palette.js', 'layouts.js', 'shrine_places.js', 'shrine.js', 'scan3d.js', 'scene_logic.js', 'stations.js', 'geo.js', 'photos.js', 'kit_tex.js', 'kit.js', 'glass_placements.js', 'cross_data.js', 'way_cross.js', 'liturgy.js'].forEach(run);
  packs.forEach((k) => run('scan3d_' + k + '.js'));
  failLoad.forEach((k) => { sb.ChurchArt.scans3d[k].load = () => Promise.reject(new Error('test: decode failed')); });
  return { sb, run };
}
const Scan = (() => { const { sb } = sandbox({ head: false }); return sb.ChurchScan3D; })();
const KEYS = Object.keys(Scan.PACKS);
const until = async (fn, ms = 20000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) return false; await new Promise((r) => setTimeout(r, 10)); } return true; };
function build(sb, run, id) {
  run('ch_' + id + '.js');
  const b = sb.ChurchBuilders[id], ctx = sb.ChurchKit.createContext({ layout: b.layout, quality: 'low' });
  b.build(ctx); ctx._prepare();
  return ctx;
}
const scans = (ctx) => ctx.root.children.filter((o) => o.userData && o.userData.scan3d);

test('scan3d: 묶음 표 = 파일, 설정(scan_packs.json)과 일치', () => {
  const files = fs.readdirSync(assets).filter((f) => /^scan3d_[a-z_]+\.js$/.test(f)).map((f) => f.slice(7, -3)).sort();
  assert.deepEqual(files, KEYS.slice().sort());
  const cfg = JSON.parse(read('tools/statues/scan_packs.json')).packs.map((p) => p.key).sort();
  assert.deepEqual(cfg, files);
});

const decoded = {};
for (const key of KEYS) test(`scan3d ${key}: 풀린다 · 예산 · 출처`, async () => {
  const { sb } = sandbox({ head: false, packs: [key] }), P = sb.ChurchArt.scans3d[key], M = P.meta;
  const g = await P.load(sb.THREE);
  decoded[key] = M;
  assert.equal(g.near.index.count, M.tris * 3); assert.equal(g.far.index.count, M.farTris * 3);
  assert.ok(M.verts < 65536, 'u16 index');
  const pos = g.near.attributes.position.array, nor = g.near.attributes.normal.array;
  assert.equal(pos.length, M.verts * 3);
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < pos.length; i += 3) { assert.ok(Number.isFinite(pos[i] + pos[i + 1] + pos[i + 2])); y0 = Math.min(y0, pos[i + 1]); y1 = Math.max(y1, pos[i + 1]); }
  assert.ok(Math.abs(y0) < 0.01 && Math.abs(y1 - M.h) < 0.01, `바닥 0 · 높이 ${M.h}`);
  for (let i = 0; i < nor.length; i += 3 * 97) { const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]); assert.ok(l > 0.95 && l < 1.05, 'unit normal'); }
  for (const ix of [g.near.index.array, g.far.index.array]) for (let i = 0; i < ix.length; i++) assert.ok(ix[i] < M.verts);
  assert.equal(!!g.near.attributes.color, Scan.PACKS[key].kind === 'color');
  // 삼각형 예산(T-80 2차): 주인공(피에타, 여러 인물 군상) 근거리 80–120k · 원거리 6–10k, 나머지 근거리 20–40k · 원거리 ≤ 5k.
  // 36k·20k 에서는 얼굴이 뭉개지고 각졌다(얼굴은 몸에 비해 작아 고른 단순화가 먼저 지운다) — 얼굴 구역(scan_packs.json detail)에 몫을 따로 준다.
  if (key === 'pieta') { assert.ok(M.tris >= 80000 && M.tris <= 120000, M.tris); assert.ok(M.farTris >= 6000 && M.farTris <= 10000, M.farTris); }
  else { assert.ok(M.tris >= 20000 && M.tris <= 40000, M.tris); assert.ok(M.farTris <= 5000, M.farTris); }
  assert.ok(M.farTris * 5 <= M.tris);
  const bytes = fs.statSync(path.join(assets, 'scan3d_' + key + '.js')).size;
  assert.ok(bytes <= (key === 'pieta' ? 540 : 230) * 1024, `${key} ${bytes}B`);
  // 얼굴 구역: 설정의 detail 구 안에 근거리 정점이 넉넉히(얼굴 몫이 살아 있다)
  const pc = JSON.parse(read('tools/statues/scan_packs.json')).packs.find((p) => p.key === key);
  assert.ok(pc.detail && pc.detail.length && pc.detailShare >= 0.2, 'detail regions');
  for (const r of pc.detail) {
    let n = 0; for (let i = 0; i < pos.length; i += 3) if ((pos[i] - r.c[0]) ** 2 + (pos[i + 1] - r.c[1]) ** 2 + (pos[i + 2] - r.c[2]) ** 2 < r.r * r.r) n++;
    assert.ok(n >= 2500, `${key} detail ${r.c} verts ${n}`);
  }
  // 라이선스: CC0 · CC BY · CC BY-NC · 퍼블릭 도메인만(SA·ND 안 됨). 출처는 앱·licenses·ASSET_LICENSES 에 모두 있다.
  const src = M.src;
  assert.ok(src && src.title && src.author && src.url && src.license && src.licenseUrl && src.changes, 'meta.src');
  assert.match(src.license, /^(CC0 1\.0|CC BY 4\.0|CC BY-NC 4\.0|Public Domain \(Public Domain Mark 1\.0\))$/);
  assert.doesNotMatch(src.license, /SA|ND/);
  for (const f of ['lib/domain/art_credits.dart', 'licenses/STATUE_SCANS.md', 'docs/church/ASSET_LICENSES.md']) assert.ok(read(f).includes(src.url), `${f} 에 ${src.url}`);
  const credits = read('lib/domain/art_credits.dart'), at = credits.indexOf(src.url), block = credits.slice(credits.lastIndexOf('ArtCredit(', at), credits.indexOf('),', at));
  assert.match(block, /변경: 축소·재질 변경/); assert.match(block, /스캔: /);
  if (/CC BY/.test(src.license)) assert.ok(block.includes('https://creativecommons.org/licenses/by'), 'CC BY 라이선스 주소');
});

test('scan3d: 앱 용량 예산(압축 ≤ 3MB) · 대용은 실제 작품 이름을 달지 않는다', () => {
  let raw = 0, gz = 0;
  for (const f of ['scan3d.js'].concat(KEYS.map((k) => 'scan3d_' + k + '.js'))) { const b = fs.readFileSync(path.join(assets, f)); raw += b.length; gz += zlib.gzipSync(b, { level: 9 }).length; }
  assert.ok(gz <= 3 * 1024 * 1024, `gz ${gz}`);
  assert.ok(raw <= 1.4 * 1024 * 1024, `raw ${raw}`);
  for (const k of KEYS) if (k !== 'pieta') assert.doesNotMatch(Scan.PACKS[k].label, /아르놀포|베르니니|미켈란젤로|마이아노/);
  assert.equal(Scan.PACKS.pieta.label, '피에타(미켈란젤로)');
});

test('scan3d: 빌더가 쓰는 자리 = 표(PACKS.churches), 여의도는 손대지 않음', () => {
  const use = {};
  for (const f of fs.readdirSync(assets).filter((x) => /^ch_[a-z]+\.js$/.test(x))) {
    const s = fs.readFileSync(path.join(assets, f), 'utf8'), id = f.slice(3, -3);
    const RX = { crucifix: /crucifix\(\{[^}]*scan: true/, pieta: /key: 'pieta'/, angel: /key: 'angel'/, st_peter: /'st_peter'/, st_paul: /'st_paul'/ };
    for (const k of KEYS) if (RX[k].test(s)) (use[k] = use[k] || []).push(id);
  }
  for (const k of KEYS) assert.deepEqual((use[k] || []).sort(), Array.from(Scan.PACKS[k].churches).sort(), k);
  assert.doesNotMatch(read('assets/church/ch_yeouido.js'), /ctx\.scan\(|scan: true/);
  for (const h of ['index.html', 'test.html']) assert.match(read('assets/church/' + h), /<script src="scan3d\.js"><\/script>/);
});

test('scan3d: 브라우저가 아니면(document.head 없음) 세우지 않고 예전 절차 생성', () => {
  const { sb, run } = sandbox({ head: false });
  const ctx = build(sb, run, 'stpaul');
  assert.equal(scans(ctx).length, 0);
  assert.equal(sb.ChurchScan3D.place(ctx, { key: 'st_paul', x: 0, y: 0, z: 0 }), false);
  let drawn = 0; assert.equal(ctx.scan({ key: 'st_paul', x: 0, y: 0, z: 0 }, () => { drawn++; }), false); assert.equal(drawn, 1);
});

test('scan3d: 세운 자리(성 바오로·라테라노·성 베드로·명동) — LOD 2단, 높이·바닥·방향', async () => {
  const want = {
    stpaul: [['st_peter', -4.5, 1.82, -13.2, 2.5], ['st_paul', 4.5, 1.82, -13.2, 2.5], ['crucifix', null, null, null, 2.8]],
    lateran: [['st_peter', -5.28, 1.3, -4.1, 2.44], ['st_paul', 5.28, 1.3, -4.1, 2.44]],
    stpeter: [['pieta', 13.37, 1.5, 30.15, 1.74]],
    myeongdong: [['crucifix', 3.5, null, -13.0, 4.4], ['angel', -3.35, null, -28.2, 1.45], ['angel', 3.35, null, -28.2, 1.45]],
  };
  for (const id of Object.keys(want)) {
    const { sb, run } = sandbox({ packs: KEYS });
    const ctx = build(sb, run, id), L = scans(ctx);
    assert.equal(L.length, want[id].length, id);
    assert.ok(await until(() => L.every((o) => o.visible)), id + ' visible');
    const T = sb.THREE;
    for (const [key, x, y, z, h] of want[id]) {
      const o = L.find((q) => q.userData.scan3d === key && (x === null || Math.abs(q.position.x - x) < 0.6));
      assert.ok(o, `${id} ${key}`);
      assert.equal(o.levels.length, 2); assert.equal(o.levels[0].object.material, o.levels[1].object.material);
      assert.ok(o.levels[1].distance >= 5);
      o.updateMatrixWorld(true);
      const bb = new T.Box3().setFromObject(o.levels[0].object);
      assert.ok(Math.abs(bb.max.y - bb.min.y - h) < 0.02, `${id} ${key} h`);
      if (y !== null) assert.ok(Math.abs(bb.min.y - y) < 0.02, `${id} ${key} floor ${bb.min.y}`);
      if (z !== null) assert.ok(Math.abs((bb.min.z + bb.max.z) / 2 - z) < 0.6, `${id} ${key} z`);
    }
    // 바닥 반사(Reflector)의 가상 카메라에는 그리지 않는다(성상마다 draw call 1 만)
    const main = new T.PerspectiveCamera(), refl = new T.PerspectiveCamera(), rf = new T.Object3D(); rf.isReflector = true; rf.camera = refl; ctx.root.add(rf);
    const o0 = L[0]; main.position.copy(o0.position); main.updateMatrixWorld(); refl.position.copy(o0.position); refl.updateMatrixWorld();
    o0.update(refl); assert.ok(o0.levels.every((l) => !l.object.visible), 'hidden in reflection');
    o0.update(main); assert.ok(o0.levels[0].object.visible && !o0.levels[1].object.visible, 'near level in main view');
    // 같은 성당 안 같은 종류 재질은 하나(대리석 상 여럿 → 재질 1)
    const mats = new Set(L.map((o) => o.levels[0].object.material.name));
    assert.ok(mats.size <= 3);
  }
});

test('scan3d: 묶음이 늦게 실패하면 LOD 를 빼고 예전 절차 생성을 따로 그린다(lateDraw)', async () => {
  const { sb, run } = sandbox({ packs: ['st_peter', 'crucifix'], failLoad: ['st_peter'] });   // st_paul 은 안 읽힘(script onerror)
  const ctx = build(sb, run, 'stpaul');
  assert.equal(scans(ctx).length, 3);
  const ok = await until(() => ctx.root.children.filter((o) => /^scan_fallback_st_(peter|paul)_/.test(o.name)).length >= 2);
  assert.ok(ok, 'fallback groups');
  const L = scans(ctx);
  assert.equal(L.length, 1); assert.equal(L[0].userData.scan3d, 'crucifix');
  const fb = ctx.root.children.filter((o) => /^scan_fallback_/.test(o.name));
  assert.ok(fb.every((g) => g.children.length > 0 && g.children.every((m) => m.geometry.attributes.position.count > 0)));
  // 묶음 배열은 원래대로 돌아와 있다(다시 지어도 같은 기하)
  assert.ok(ctx._.batches.solid.p.length > 0);
});

test('scan3d: 대리석 재질은 무광·스스로 밝히지 않음 + 열쇠 빛(성상 재질에만, 장면 빛 추가 없음) · 피에타 앞 방탄유리 없음', async () => {
  for (const k of ['marble', 'marbleLit']) {
    const m = Scan.MAT[k];
    assert.ok(m.roughness >= 0.6 && m.roughness <= 0.75, k + ' roughness');
    assert.ok(!m.emissive, k + ' emissive');
    assert.ok(m.envMapIntensity <= 0.4, k + ' env');
    assert.ok(m.key && m.key.intensity > 0 && m.key.dir[1] > 0 && m.key.dir[2] > 0 && m.key.dir[0] < 0, k + ' key light: 위·앞·왼쪽');
  }
  const { sb, run } = sandbox({ packs: ['pieta'] });
  const ctx = build(sb, run, 'stpeter'), L = scans(ctx);
  assert.ok(await until(() => L.every((o) => o.visible)));
  const mat = L[0].levels[0].object.material;
  assert.equal(mat.name, 'scan3d_marbleLit');
  assert.equal(typeof mat.onBeforeCompile, 'function');
  const sh = { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <lights_fragment_end>' };
  mat.onBeforeCompile(sh);
  assert.ok(sh.uniforms.scanKeyDir && sh.uniforms.scanKeyCol && /vScanKey/.test(sh.vertexShader) && /BRDF_Lambert/.test(sh.fragmentShader));
  let lights = 0; ctx.root.traverse((o) => { if (o.isLight) lights++; });
  const { sb: sb0, run: run0 } = sandbox({ head: false }), ctx0 = build(sb0, run0, 'stpeter');
  let lights0 = 0; ctx0.root.traverse((o) => { if (o.isLight) lights0++; });
  assert.equal(lights, lights0, '장면 빛 수 그대로');
  // 방탄유리 반사 막: 스캔을 세우면 피에타 경당 어귀(x ≈ 11.6, z 28.25–32.05)에 없다, 사진 판(스캔 못 세움)이면 있다
  const pane = (c) => { const p = c._.batches.glassRefl.p; for (let i = 0; i < p.length; i += 3) if (Math.abs(p[i] - 11.61) < 0.05 && p[i + 2] > 28 && p[i + 2] < 32.2) return true; return false; };
  assert.equal(pane(ctx), false); assert.equal(pane(ctx0), true);
});
