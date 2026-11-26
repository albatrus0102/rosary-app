// PC 라이트맵 키트(pc_bake): uv2 펼치기 · 내보내기 최신 · 빛/대상 manifest 형식 · RGBM(파이썬 ↔ JS) · 앱 로더(작은 합성 라이트맵) · 파이썬 도우미 · 실행기
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unwrap, rectsOverlap } from '../tools/lm_unwrap.mjs';
import { loadRooms, WEB } from '../tools/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENE = path.join(ROOT, 'pc_bake/scene');
const TJ = JSON.parse(fs.readFileSync(path.join(SCENE, 'house_targets.json'), 'utf8'));
const LJ = JSON.parse(fs.readFileSync(path.join(SCENE, 'house_lights.json'), 'utf8'));
const py = (code, args = []) => spawnSync('python3', ['-I', '-c', code, ...args], { encoding: 'utf8', cwd: ROOT });

function box(P, x, y, z, w, h, d, ry = 0) {   // 축 상자(삼각형 12) — ry 로 돌림
  const c = Math.cos(ry), s = Math.sin(ry), v = (a, b, e) => [x + a * c + e * s, y + b, z - a * s + e * c];
  const q = (a, b, cc, dd) => { P.push(...a, ...b, ...cc, ...a, ...cc, ...dd); };
  const X = w / 2, Z = d / 2, p = [v(-X, 0, -Z), v(X, 0, -Z), v(X, 0, Z), v(-X, 0, Z), v(-X, h, -Z), v(X, h, -Z), v(X, h, Z), v(-X, h, Z)];
  q(p[0], p[1], p[2], p[3]); q(p[7], p[6], p[5], p[4]); q(p[0], p[4], p[5], p[1]); q(p[1], p[5], p[6], p[2]); q(p[2], p[6], p[7], p[3]); q(p[3], p[7], p[4], p[0]);
}

test('uv2 펼치기: 조각 직사각형이 겹치지 않고, 모든 uv 가 [0,1] 안·제 조각 안(여백 pad 지킴), 판은 축에 맞춰 꽉 찬다', () => {
  const P = [];
  for (let i = 0; i < 30; i++) box(P, (i % 6) * 0.7, 0, Math.floor(i / 6) * 0.9, 0.2 + (i % 4) * 0.15, 0.1 + (i % 3) * 0.4, 0.3, i * 0.37);
  const pad = 4, u = unwrap(P, { tpm: 64, pad, maxSize: 2048 });
  assert.equal(rectsOverlap(u.rects), null);
  assert.equal(u.charts, 30 * 6);
  assert.ok(u.w % 4 === 0 && u.h % 4 === 0 && u.w <= 2048 && u.h <= 2048);
  for (let i = 0; i < u.uv.length; i++) assert.ok(u.uv[i] >= 0 && u.uv[i] <= 1);
  // 삼각형마다 세 꼭짓점이 어떤 조각 직사각형의 안쪽(여백 안)에 있다
  for (let t = 0; t < P.length / 9; t++) {
    const xs = [0, 1, 2].map((j) => u.uv[t * 6 + j * 2] * u.w), ys = [0, 1, 2].map((j) => u.uv[t * 6 + j * 2 + 1] * u.h);
    const r = u.rects.find((q) => xs.every((x) => x >= q.x + pad - 1e-3 && x <= q.x + q.w - pad + 1e-3) && ys.every((y) => y >= q.y + pad - 1e-3 && y <= q.y + q.h - pad + 1e-3));
    assert.ok(r, 'triangle ' + t + ' outside its padded chart');
  }
  // 2×1 m 판(삼각형 2, 45° 돌림): 대각선이 아니라 변을 따라 → 꽉 찬 직사각형
  const Q = [], c = Math.SQRT1_2, pt = (a, b) => [a * c - b * c, 0, a * c + b * c];
  Q.push(...pt(0, 0), ...pt(2, 0), ...pt(2, 1), ...pt(0, 0), ...pt(2, 1), ...pt(0, 1));
  const q = unwrap(Q, { tpm: 32, pad: 4 });
  assert.equal(q.charts, 1);
  assert.equal(q.texels, 64 * 32);
});

test('내보내기 최신: pc_bake/scene 이 지금 빌더와 같다(다르면 node tools/lm_export.mjs)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/lm_export.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('manifest 형식: 대상·uv2.bin·화질표·연기 시험 · 빛(등 9종·포털·해/달·하늘)', () => {
  assert.equal(TJ.format, 'room-lightmap-export');
  const uv = fs.statSync(path.join(SCENE, TJ.uv2)).size;
  let off = 0;
  for (const t of TJ.targets) {
    assert.match(t.id, /^[A-Za-z0-9_]+$/);
    assert.ok(t.n > 0 && t.n % 3 === 0 && Number.isFinite(t.sum));
    if (!t.lm) continue;
    assert.equal(t.off, off, t.id); off += t.n * 2;
    assert.ok(t.w % 4 === 0 && t.h % 4 === 0 && t.w <= TJ.base.maxSize && t.texels > 0);
  }
  assert.equal(uv, off * 2);
  assert.equal(new Set(TJ.targets.map((t) => t.id)).size, TJ.targets.length);
  for (const q of ['smoke', 'fast', 'normal', 'high']) { const Q = TJ.quality[q]; assert.ok(Q.samples > 0 && Q.keySamples > 0 && Q.scale > 0 && Q.maxSize >= 256); }
  assert.ok(TJ.smoke.targets.length === 2 && TJ.smoke.targets.every((id) => TJ.targets.some((t) => t.id === id && t.lm)));
  assert.equal(LJ.format, 'room-lightmap-lights');
  const types = new Set(LJ.lamps.map((l) => l.type));
  for (const k of ['pendant', 'down', 'eave', 'wall', 'barn', 'street', 'desk', 'floor', 'counter']) assert.ok(types.has(k), k);
  assert.equal(LJ.lamps.filter((l) => l.type === 'pendant').length, 2);
  assert.equal(LJ.lamps.filter((l) => l.type === 'down').length, 7);
  for (const l of LJ.lamps) {
    assert.ok(['point', 'spot'].includes(l.light) && l.pos.length === 3 && l.color.length === 3);
    assert.ok(l.intensity.night > l.intensity.day && l.intensity.day > 0, l.name);
    if (l.light === 'spot') assert.ok(l.angle > 0 && l.dir[1] < 0);
  }
  assert.equal(LJ.portals.length, 3);
  for (const p of LJ.portals) assert.equal(Math.hypot(...p.normal), 1);
  assert.deepEqual(LJ.portals.find((p) => p.name.startsWith('door')).normal, [0, 0, -1]);   // 문은 정면 벽 — 안쪽(-z)을 본다
  for (const tm of ['day', 'night']) {
    const T = LJ.times[tm];
    assert.ok(['realtime', 'baked'].includes(T.key.mode) && Math.abs(Math.hypot(...T.key.dir) - 1) < 1e-5 && T.key.dir[1] > 0);
    assert.ok(T.world.up.every((v) => v > 0) && T.world.down.every((v) => v > 0));
  }
  assert.ok(LJ.times.day.key.irradiance[0] > 20 * LJ.times.night.key.irradiance[0]);
});

test('RGBM: 파이썬(bake.py lmcodec) 인코딩 → 앱(lightmap.js) 풀기가 같은 조도', () => {
  const vals = [[0, 0, 0], [0.003, 0.002, 0.001], [0.2, 0.5, 1], [3, 2, 1], [12, 9, 6], [60, 40, 20]];
  const r = py('import sys,json; sys.path.insert(0,"pc_bake"); import lmcodec as c; print(json.dumps([c.encode_rgbm_px(v) for v in json.loads(sys.argv[1])]))', [JSON.stringify(vals)]);
  assert.equal(r.status, 0, r.stderr);
  const enc = JSON.parse(r.stdout);
  globalThis.window = globalThis.window || globalThis;
  const sb = { THREE: {} }; sb.window = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(WEB, 'lightmap.js'), 'utf8'), sb);
  vals.forEach((v, i) => {
    const d = sb.RoomLightmap.decode(enc[i].map((b) => b / 255), { encoding: 'rgbm', range: 64, gamma: 2.2 });
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(d[k] - v[k]) <= 0.02 * v[k] + 2e-4, JSON.stringify([v, d]));
  });
});

test('파이썬 도우미: PNG 8/16비트 · 진행률·남은 시간 · 이어 굽기 기록 · manifest · bake.py 문법', () => {
  const code = String.raw`
import sys, os, json, tempfile, math
sys.path.insert(0, 'pc_bake')
import lmcodec as c
d = tempfile.mkdtemp()
img = [[[x * 7 % 256, y * 13 % 256, (x + y) % 256, 255] for x in range(5)] for y in range(3)]
c.write_png(os.path.join(d, 'a.png'), img, 8)
w, h, bits, ch, rows = c.read_png(os.path.join(d, 'a.png'))
assert (w, h, bits, ch) == (5, 3, 8, 4) and rows[0:4] == bytes(img[0][0]) and rows[-4:] == bytes(img[2][4])
c.write_png(os.path.join(d, 'b.png'), c.encode_linear16([[[1.0, 2.0, 64.0]]]), 16)
w, h, bits, ch, rows = c.read_png(os.path.join(d, 'b.png'))
assert (bits, ch) == (16, 3) and rows[-2:] == b'\xff\xff'
t = [0.0]
p = c.Progress(100, clock=lambda: t[0])
p.skip(20); t[0] = 10; p.step(20)
assert abs(p.pct() - 40) < 1e-9 and abs(p.eta() - 30) < 1e-9 and 'ETA 30s' in p.line('x')
q = {'samples': 16, 'keySamples': 4, 'scale': 0.25, 'maxSize': 512}
assert c.size_for(204, 220, q) == (51, 55) and c.size_for(4000, 100, q) == (512, 13)
tg = {'id': 'wood', 'n': 6, 'sum': 1.5, 'off': 0, 'kind': 'item', 'lm': True}
sig = c.job_sig(tg, q, 'smoke', 'day', 'h')
assert c.is_done(d, 'day', 'wood', sig) is None
os.makedirs(os.path.join(d, 'day')); open(os.path.join(d, 'day', 'wood.png'), 'wb').write(b'x')
c.mark_done(d, 'day', 'wood', sig, {'file': 'day/wood.png', 'w': 4, 'h': 4})
assert c.is_done(d, 'day', 'wood', sig) and c.is_done(d, 'day', 'wood', dict(sig, samples=99)) is None
L = {'times': {'day': {'hour': 11, 'key': {'mode': 'realtime'}}, 'night': {'hour': 22, 'key': {'mode': 'realtime'}}}}
m = c.build_manifest({'scene': 'house', 'targets': [tg]}, L, d, 'smoke', ['day', 'night'])
assert m['format'] == 'room-lightmap' and m['complete'] is False and m['targets'][0]['files'] == {'day': 'day/wood.png'}
m = c.build_manifest({'scene': 'house', 'targets': [tg]}, L, d, 'smoke', ['day'])
assert m['complete'] is True and m['times']['night']['key'] == 'realtime'
import py_compile; py_compile.compile('pc_bake/bake.py', doraise=True, cfile=os.path.join(d, 'bake.pyc'))
print('ok')
`;
  const r = py(code);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'ok');
});

test('앱 로더: 작은 합성 라이트맵 → lightMap·uv2·RGBM 셰이더·낮밤 섞기, 안 맞으면 그 대상만 예전 길, 없으면 아무것도 안 바뀜', () => {
  const H = loadRooms({ quality: 'high', photos: true, aoDefer: true, only: ['house'] });
  const c = H.rooms[0], sb = H.sandbox, T = H.THREE;
  vm.runInContext(fs.readFileSync(path.join(WEB, 'lightmap.js'), 'utf8'), sb, { filename: 'lightmap.js' });
  const items = c.prepare();
  items.forEach((it) => { it.group = it.batch.build(it.material, it.name, { spatial: true }); c.ctx.root.add(it.group); });   // world.js 처럼
  const uvBuf = fs.readFileSync(path.join(SCENE, TJ.uv2)), u16 = new Uint16Array(uvBuf.buffer.slice(uvBuf.byteOffset, uvBuf.byteOffset + uvBuf.length));
  const row = (id) => TJ.targets.find((t) => t.id === id);
  const tiny = () => { const d = new Uint8Array(4 * 4 * 4).fill(200); return new T.DataTexture(d, 4, 4); };
  const pick = ['solid', 'surf_wood_dark', 'plane_wood_floor_0', 'surf_cork'];
  const man = { format: 'room-lightmap', v: 1, encoding: 'rgbm', range: 64, gamma: 2.2, uv2: 'uv2.bin', times: { day: { key: 'realtime' }, night: { key: 'baked' } },
    targets: pick.map((id) => ({ id, n: row(id).n, sum: id === 'surf_cork' ? row(id).sum + 1 : row(id).sum, off: row(id).off, files: { day: 'day/' + id + '.png', night: 'night/' + id + '.png' } })) };
  const loads = [];
  const lm = sb.RoomLightmap.attach({ id: 'house', ctx: c.ctx, items, fetchJSON: (u, cb) => cb(u.endsWith('house/manifest.json') ? man : null), fetchBin: (u, cb) => cb(u.endsWith('uv2.bin') ? u16.buffer : null), loadImage: (u, cb) => { loads.push(u); cb(tiny()); } });
  assert.equal(lm.stats.state, 'on');
  assert.equal(lm.stats.applied, 3);
  assert.equal(lm.stats.stale, 1);                     // 검사합이 다른 코르크는 붙이지 않는다
  assert.equal(loads.length, 6);
  const solid = items.find((it) => it.name === 'solid'), cork = items.find((it) => it.name === 'surf_cork');
  assert.ok(solid.material.lightMap && 'LM_ON' in solid.material.defines && 'LM_RGBM' in solid.material.defines);
  assert.ok(!cork.material.lightMap && !(cork.material.defines && 'LM_ON' in cork.material.defines));
  // uv2: 메시 정점 = 배치 정점(vRange 또는 공간 덩어리 triIds) 순으로 uv2.bin 과 같다
  const checkItem = (it) => {
    const R = row(it.name); let n = 0;
    it.group.children.forEach((m) => {
      const a = m.geometry.attributes.uv2.array, ud = m.userData;
      for (let v = 0; v < a.length / 2; v += 7) {
        const bv = ud.triIds ? ud.triIds[Math.floor(v / 3)] * 3 + (v % 3) : ud.vRange[0] + v;
        assert.equal(a[v * 2], Math.fround(u16[R.off + bv * 2] / 65535)); assert.equal(a[v * 2 + 1], Math.fround(u16[R.off + bv * 2 + 1] / 65535)); n++;
      }
    });
    assert.ok(n > 0);
  };
  checkItem(solid); checkItem(items.find((it) => it.name === 'surf_wood_dark'));
  const fl = c.ctx.root.getObjectByProperty('uuid', sb.RoomLightmap.collectTargets(c.ctx, items).find((t) => t.id === 'plane_wood_floor_0').mesh.uuid);
  assert.equal(fl.geometry.index, null);                // 판은 낱개 삼각형으로 바꿔 uv2 를 붙인다
  assert.equal(fl.geometry.attributes.uv2.count, row('plane_wood_floor_0').n);
  // 셰이더: 실제 three 조각(physical)에 고리를 돌려 본다
  const sh = { uniforms: {}, vertexShader: T.ShaderLib.physical.vertexShader, fragmentShader: T.ShaderLib.physical.fragmentShader };
  solid.material.onBeforeCompile(sh, {});
  assert.ok(sh.fragmentShader.includes('lmDecode') && sh.fragmentShader.includes('lmDD') && sh.fragmentShader.includes('uLMKey'));
  assert.ok(!sh.fragmentShader.includes('#include <lights_fragment_maps>') && !sh.fragmentShader.includes('#include <lights_fragment_begin>'));
  assert.ok(sh.vertexShader.includes('vUv2 = uv2;') && sh.uniforms.uLMNight.value);
  assert.ok(solid.material.customProgramCacheKey().endsWith('|lm1'));
  // 낮/밤: env.night 로 섞고, 해/달 실시간 몫(key)은 manifest(낮 realtime → 1, 밤 baked → 0)
  lm.onEnv({ night: 0 }); assert.deepEqual([sh.uniforms.uLMMix.value, sh.uniforms.uLMKey.value], [0, 1]);
  lm.onEnv({ night: 1 }, 0.8); assert.deepEqual([sh.uniforms.uLMMix.value, sh.uniforms.uLMKey.value, sh.uniforms.uLMK.value], [1, 0, 0.8]);
  // ao_fx·gi_fx: LM_ON 재질은 확산 AO·빛 번짐을 건너뛴다(같은 #ifndef 안)
  const ao = fs.readFileSync(path.join(WEB, 'ao_fx.js'), 'utf8');
  assert.ok(/#ifndef LM_ON[\s\S]*indirectDiffuse \*= aoT[\s\S]*gifx[\s\S]*#endif/.test(ao));
  // 없을 때: 아무것도 바꾸지 않는다(구운 AO·빛 번짐 그대로)
  const H2 = loadRooms({ quality: 'high', photos: true, aoDefer: true, only: ['house'] }), c2 = H2.rooms[0];
  vm.runInContext(fs.readFileSync(path.join(WEB, 'lightmap.js'), 'utf8'), H2.sandbox);
  const it2 = c2.prepare();
  const lm2 = H2.sandbox.RoomLightmap.attach({ id: 'house', ctx: c2.ctx, items: it2, fetchJSON: (u, cb) => cb(null), fetchBin: (u, cb) => cb(null), loadImage: (u, cb) => cb(null) });
  assert.equal(lm2.stats.state, 'none');
  assert.ok(it2.every((it) => !it.material || !it.material.lightMap));
});

test('실행기·안내: ps1 은 BOM(한글 PowerShell 5.1), cmd 는 ASCII, 판 찾기·직접 고르기·다운로드 주소 · README_PC 명령', () => {
  const ps = fs.readFileSync(path.join(ROOT, 'pc_bake/run_bake.ps1'));
  assert.deepEqual([...ps.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const s = ps.toString('utf8');
  for (const k of ['--version', 'Blender Foundation', 'steamapps', 'Uninstall', 'Get-Command blender.exe', 'blender_path.txt', '-PickBlender', 'Test-Supported', 'https://www.blender.org/download/', 'SetThreadExecutionState']) assert.ok(s.includes(k), k);
  const cmd = fs.readFileSync(path.join(ROOT, 'pc_bake/run_bake.cmd'));
  assert.ok([...cmd].every((b) => b < 128));
  const rd = fs.readFileSync(path.join(ROOT, 'pc_bake/README_PC.md'), 'utf8');
  for (const k of ['https://github.com/albatrus0102/rosary-app/archive/refs/heads/share/reading-journal-house.zip', 'rosary-app-share-reading-journal-house', 'Blender 5.3\\blender.exe" --version', 'run_bake.ps1" -Quality smoke', 'run_bake.cmd" smoke', '-PickBlender', 'run_bake.cmd" pick']) assert.ok(rd.includes(k), k);
});
