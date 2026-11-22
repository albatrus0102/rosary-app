// 미리 구운 빛 번짐(gi_bake.mjs·assets/church/gi_fx.js, docs/church/RENDER_GI.md) 시험.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { GI, ASSETS, bakeChurch, checkFresh, loadForGI, readGI, unpack, recvKey, makeGather, refEnv } from './gi_bake.mjs';
import { buildBVH } from './ao_bvh.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ids = fs.readdirSync(ASSETS).filter((f) => /^ch_[a-z0-9]+\.js$/.test(f) && f !== 'ch_glass.js').map((f) => f.slice(3, -3)).sort();

function sandbox(files) {
  const sb = { console, location: { search: '' } }; sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ASSETS, f), 'utf8'), sb, { filename: f }));
  return sb;
}
const LUM = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const dec = (q) => Math.pow(2, (q - 128) / 32);
// gi_fx.js giDecode 와 같은 식(셰이더) — 밤 섞기 night(0..1)
function decode4(r, g, b, n, night, lt) {
  const gd = [dec(r), dec(g), dec(b)], yd = Math.max(LUM(...gd), 0.05), yn = dec(n);
  const t = Math.max(0, Math.min(0.5, (yn - 1) * 0.6)), gn = gd.map((v, i) => v * (yn / yd) * (1 + (lt[i] - 1) * t));
  return gd.map((v, i) => v + (gn[i] - v) * night);
}

test('빛 번짐 광선 추적: 햇빛 든 바닥 옆 벽은 밝고(색도 바닥 색), 얇은 벽 너머의 햇빛은 새지 않는다', () => {
  // 바닥(빨강, 위) + 가운데 얇은 벽(x=0, 두께 0.1, 닫힌 상자) + 지붕 없음. 해는 +x 쪽 낮은 고도(10°) → 벽 그림자가 왼쪽 바닥 끝까지, 오른쪽(+x) 바닥만 해가 든다.
  const tris = [], fn = [], two = [], alb = [], emD = [], emA = [], envk = [];
  const quad = (a, b, c, d, n, col) => { tris.push(...a, ...b, ...c, ...a, ...c, ...d); fn.push(...n, ...n); two.push(0, 0); alb.push(...col, ...col); emD.push(0, 0, 0, 0, 0, 0); emA.push(0, 0, 0, 0, 0, 0); envk.push(1, 1); };
  quad([-10, 0, -10], [-10, 0, 10], [10, 0, 10], [10, 0, -10], [0, 1, 0], [0.8, 0.1, 0.1]);
  const W = (x0, x1, col) => {
    quad([x1, 0, -10], [x1, 6, -10], [x1, 6, 10], [x1, 0, 10], [1, 0, 0], col);
    quad([x0, 0, -10], [x0, 0, 10], [x0, 6, 10], [x0, 6, -10], [-1, 0, 0], col);
    quad([x0, 6, -10], [x0, 6, 10], [x1, 6, 10], [x1, 6, -10], [0, 1, 0], col);
  };
  W(-0.05, 0.05, [0.6, 0.6, 0.6]);
  const bvh = buildBVH(new Float32Array(tris), new Float32Array(fn), new Uint8Array(two));
  const z3 = [0, 0, 0], sun = [1, 0.18, 0].map((v) => v / Math.hypot(1, 0.18));
  const env = { sun, sunE: [6, 6, 6], moon: [0, 1, 0], moonE: z3, hsD: z3, hgD: z3, iblD: z3, skyD: z3, hsA: z3, hgA: z3, iblA: z3, skyA: z3 };
  const g = makeGather(bvh, { alb: new Float32Array(alb), emD: new Float32Array(emD), emA: new Float32Array(emA), envk: new Float32Array(envk), lamps: new Float64Array(0), env }, 64), o = new Float64Array(8);
  const lit = g(1, 0.05, 1.0, 0, 1, 0, 0, o).slice(0, 3);     // 벽 오른쪽 면(해 든 바닥을 본다)
  const dark = g(2, -0.05, 1.0, 0, -1, 0, 0, o).slice(0, 3);  // 벽 왼쪽 면(그늘진 바닥만 본다 — 해는 벽 너머)
  assert.ok(lit[0] > 0.1, 'lit ' + lit);
  assert.ok(lit[0] > lit[1] * 3, '빨간 바닥 색이 번진다 ' + lit);
  assert.ok(dark[0] < lit[0] * 0.05, '얇은 벽 너머로 새지 않는다 ' + dark + ' vs ' + lit);
  // 벽 속(두 면 사이)의 점: 거의 모든 광선이 뒷면 → 묻힘
  const inside = g(3, 0, 1.0, 0, 1, 0, 0, o);
  assert.ok(inside[6] > 0.7, '벽 속 점은 묻힘 ' + inside[6]);
  // 결정적
  assert.deepEqual(Array.from(g(1, 0.05, 1.0, 0, 1, 0, 0, new Float64Array(8)).slice(0, 3)), Array.from(lit));
});

test('기준 조명: 낮은 해가 있고(당고개 지하 성당은 0), 밤은 해 대신 달·등불, 창은 낮이 밤보다 밝다', () => {
  const s = refEnv('stpeter'), d = refEnv('danggogae');
  assert.ok(LUM(...s.sunE) > 1 && s.sun[1] > 0.5, '성 베드로 11시 해');
  assert.equal(LUM(...d.sunE), 0, '당고개: keyK 0');
  assert.ok(LUM(...s.skyD) > LUM(...s.skyA) * 2, '낮 창 > 밤 창');
  assert.ok(s.lamp > s.lampDay, '밤 등불 > 낮 등불');
});

test('굽기는 결정적이다(작업자 수와 무관하게 바이트까지 같다) — 당고개, 광선 8개', async () => {
  const H1 = await loadForGI(['danggogae']), H2 = await loadForGI(['danggogae']);
  const c1 = H1.churches.find((c) => c.id === 'danggogae'), c2 = H2.churches.find((c) => c.id === 'danggogae');
  const a = await bakeChurch(c1, H1, { rays: 8, workers: 1 });
  const b = await bakeChurch(c2, H2, { rays: 8, workers: 3 });
  assert.equal(a.text, b.text);
});

let H = null;
async function harness() { if (!H) H = await loadForGI(null); return H; }

test('gi_<성당>.js 가 모든 성당에 있고 지금 빌더 지오메트리와 맞다(새 성당·빌더를 고쳤으면: node tools/church_web/gi_bake.mjs <성당>)', async () => {
  const h = await harness();
  const have = h.churches.map((c) => c.id).sort();
  assert.deepEqual(have, ids, 'harness 가 찾는 성당 = ch_*.js');
  const r = checkFresh(h.churches);
  assert.deepEqual(r.filter((x) => !x.ok), [], JSON.stringify(r.filter((x) => !x.ok)));
  assert.ok(r.length >= 10);
});

test('gi_<성당>.js 크기·형식: 성당마다 ≤ 0.35MB(목표 0.3MB), 평면 길이 = 점 수·격자, 앱 쪽 열쇠 번호 매기기가 굽기와 같은 점 수', async () => {
  const h = await harness();
  const sb = sandbox(['three.min.js', 'gi_fx.js']), F = sb.ChurchGIFx;
  for (const id of ids) {
    const f = path.join(ASSETS, 'gi_' + id + '.js'), size = fs.statSync(f).size;
    assert.ok(size <= 0.35 * 1024 * 1024, id + ' ' + size);
    const d = readGI(id);
    assert.equal(d.v, GI.v); assert.equal(d.q, 32); assert.equal(d.key, GI.key);
    const u = unpack(d);
    assert.equal(u.rest, 0, id + ' 남는 바이트');
    assert.ok(d.f.w > 10 && d.f.h > 10 && d.f.cell > 0.1 && d.f.cell <= 0.5, id + ' 바닥 격자');
    // 앱의 unpack 도 같은 길이로 끝난다
    const zlib = await import('node:zlib');
    const raw = zlib.inflateRawSync(Buffer.from(d.z, 'base64'));
    assert.ok(F.unpack(new Uint8Array(raw), d.nR, d.f.w * d.f.h), id + ' 앱 unpack');
    const c = h.churches.find((x) => x.id === id), targets = c.prepare().filter((it) => it.ao);
    const m = F.mapRecv(targets, d.key);
    assert.equal(m.count, d.nR, id + ' 점 수(앱 열쇠 = 굽기 열쇠)');
  }
});

test('앱 열쇠(gi_fx.js mapRecv)가 굽기 열쇠(recvKey)와 정점마다 같은 점을 가리킨다 — 명동', async () => {
  const h = await harness();
  const sb = sandbox(['three.min.js', 'gi_fx.js']), F = sb.ChurchGIFx;
  const c = h.churches.find((x) => x.id === 'myeongdong'), targets = c.prepare().filter((it) => it.ao);
  const m = F.mapRecv(targets, GI.key), keys = new Map();
  targets.forEach((it, k) => {
    const P = it.batch.p, N = it.batch.n, ref = m.refs[k];
    for (let i = 0; i < ref.length; i++) {
      const key = recvKey(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
      if (!keys.has(key)) keys.set(key, keys.size);
      assert.equal(ref[i], keys.get(key));
    }
  });
});

test('밝기 보존: 성당마다 넓이 가중 평균 휘도(복원값)가 낮·밤·해질녘 섞기 모두 1 ± 5%, 변화 폭은 0.4~2.6 안', async () => {
  const h = await harness();
  const sb = sandbox(['three.min.js', 'gi_fx.js']), F = sb.ChurchGIFx;
  const zlib = await import('node:zlib');
  for (const id of ids) {
    const d = readGI(id), c = h.churches.find((x) => x.id === id), targets = c.prepare().filter((it) => it.ao), b = c.layout.bounds;
    const up = F.unpack(new Uint8Array(zlib.inflateRawSync(Buffer.from(d.z, 'base64'))), d.nR, d.f.w * d.f.h), rec = up.rec;
    const m = F.mapRecv(targets, d.key), area = new Float64Array(d.nR);
    targets.forEach((it, k) => {
      const P = it.batch.p, ref = m.refs[k];
      for (let i = 0; i + 8 < P.length; i += 9) {
        const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
        if (cx < b.x0 - 0.35 || cx > b.x1 + 0.35 || cz < b.z0 - 0.35 || cz > b.z1 + 0.35) continue;   // 실내만(굽기와 같은 기준)
        const ax = P[i + 3] - P[i], ay = P[i + 4] - P[i + 1], az = P[i + 5] - P[i + 2], bx = P[i + 6] - P[i], by = P[i + 7] - P[i + 1], bz = P[i + 8] - P[i + 2];
        const a3 = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 3;
        for (let q = 0; q < 3; q++) area[ref[i / 3 + q]] += a3;
      }
    });
    for (const night of [0, 0.5, 1]) {
      let s = 0, w = 0, lo = Infinity, hi = 0;
      for (let r = 0; r < d.nR; r++) {
        if (!area[r]) continue;
        const g = decode4(rec[r * 4], rec[r * 4 + 1], rec[r * 4 + 2], rec[r * 4 + 3], night, d.lt), Y = LUM(...g);
        s += Y * area[r]; w += area[r]; if (Y < lo) lo = Y; if (Y > hi) hi = Y;
      }
      const mean = s / w;
      assert.ok(mean > 0.95 && mean < 1.05, id + ' night ' + night + ' 평균 휘도 ' + mean.toFixed(4));
      assert.ok(lo >= 0.4 && hi <= 2.6, id + ' 범위 ' + lo.toFixed(2) + '~' + hi.toFixed(2));
    }
    assert.ok(d.nk >= 0.35 && d.nk <= 1, id + ' nk');
  }
});

test('화질 단계: high·mid 에만 빛 번짐, low 는 없음(구운 AO 도 없는 단계) — world.js 가 단계 표로 거른다', () => {
  const T = sandbox(['three.min.js', 'render.js']).ChurchRender.TIERS;
  assert.ok(T.high.gi > 0 && T.mid.gi > 0, 'high·mid');
  assert.equal(T.low.gi, 0, 'low 는 끈다');
  assert.equal(T.low.aoBake, false, 'low 는 ao_fx 자체가 없다(빛 번짐은 그 블록 안에 붙는다)');
  const w = fs.readFileSync(path.join(ASSETS, 'world.js'), 'utf8');
  assert.match(w, /giWant = !!root\.ChurchGIFx && !!\(tierCfg && tierCfg\[tier\]\.gi > 0\)/);
  assert.match(w, /if \(giWant && aoFx\)/, 'ao_fx 가 붙은 재질에만');
  assert.match(w, /giFx\.onEnv\(env, tierCfg \? tierCfg\[tier\]\.gi : 1/, '단계 바꾸기(applyEnv)마다 세기 갱신 — 자동 하향으로 low 가 되면 0');
  for (const f of ['index.html', 'test.html']) {
    const html = fs.readFileSync(path.join(ASSETS, f), 'utf8');
    assert.ok(html.indexOf('<script src="gi_fx.js">') > html.indexOf('<script src="ao_fx.js">') && html.indexOf('<script src="gi_fx.js">') < html.indexOf('<script src="world.js">'), f);
  }
});

test('밤 세기: 밤으로 갈수록 nk 쪽으로 줄고(빛나지 않게), 단계 0 이면 0, 룩 배율을 따른다', () => {
  const F = sandbox(['three.min.js', 'gi_fx.js']).ChurchGIFx;
  assert.equal(F.strength(0, 0.6, 1, 1), 1);
  assert.ok(Math.abs(F.strength(1, 0.6, 1, 1) - 0.6) < 1e-9);
  assert.ok(F.strength(0.5, 0.6, 1, 1) < 1 && F.strength(0.5, 0.6, 1, 1) > 0.6);
  assert.equal(F.strength(1, 0.6, 0, 1), 0, 'low');
  assert.ok(Math.abs(F.strength(0, 0.6, 1, 0.5) - 0.5) < 1e-9, '룩 giK');
  for (const id of ids) {
    const d = readGI(id);
    assert.ok(F.strength(1, d.nk, 1, 1) <= F.strength(0, d.nk, 1, 1), id);
  }
  // world.js 는 env.night 를 넘긴다(시간대 → 밤 섞기)
  const src = fs.readFileSync(path.join(ASSETS, 'gi_fx.js'), 'utf8');
  assert.match(src, /envK\.night = env && env\.night !== undefined \? env\.night : 0/);
  assert.match(src, /return mix\( gd, gn, night \);/);
});

test('재질은 복제하지 않는다: ao_fx 가 고친 재질에 한 번만, 캐시 키 |aofx1|gifx1(탐침은 그 뒤), 간접 확산광에만 곱한다', () => {
  const sb = sandbox(['three.min.js', 'ao_fx.js', 'gi_fx.js', 'probe_fx.js']);
  const T = sb.THREE, A = sb.ChurchAOFx, G = sb.ChurchGIFx, P = sb.ChurchProbes;
  const U = G.createUniforms();
  const plain = new T.MeshStandardMaterial({ roughness: 0.8 });
  assert.equal(G.patch(plain, U), false, 'ao_fx 가 안 고친 재질(아바타·묵주 등)은 그대로');
  assert.equal(G.patch(new T.MeshBasicMaterial(), U), false, '유리·발광(기본 재질)');
  const m = new T.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3, clearcoat: 0.5 }), m2 = new T.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3, clearcoat: 0.5 });
  [m, m2].forEach((x) => { A.patch(x, A.createUniforms()); assert.equal(G.patch(x, U), true); });
  assert.equal(G.patch(m, U), false, '두 번 고치지 않는다');
  P.patch(m, P.createUniforms(), 1.6, true);
  assert.match(m.customProgramCacheKey(), /\|aofx1\|gifx1\|prb1$/);
  const m3 = new T.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3, clearcoat: 0.5 }); A.patch(m3, A.createUniforms()); G.patch(m3, G.createUniforms());
  assert.match(m2.customProgramCacheKey(), /\|aofx1\|gifx1$/);
  assert.equal(m2.customProgramCacheKey(), m3.customProgramCacheKey(), '같은 설정 재질 = 같은 프로그램 키(재질·균일값마다 새 프로그램이 생기지 않는다)');
  const n = 128 / 255;
  assert.deepEqual(Array.from(m.defaultAttributeValues.aoGI), [n, n, n, n], '속성 없는 메시 = 비 1');
  const L = T.ShaderLib.physical, sh = { uniforms: T.UniformsUtils.clone(L.uniforms), vertexShader: L.vertexShader, fragmentShader: L.fragmentShader };
  m.onBeforeCompile(sh, null);
  const f = sh.fragmentShader, v = sh.vertexShader;
  assert.ok(!f.includes(G.MARK), '표지를 바꿔 넣었다');
  const iAO = f.indexOf('reflectedLight.indirectDiffuse *= aoT;'), iGI = f.indexOf('reflectedLight.indirectDiffuse *= mix( vec3( 1.0 ), giV, uGIK );');
  assert.ok(iAO > 0 && iGI > iAO, '간접 확산광에 AO 다음으로 곱한다');
  assert.ok(f.indexOf('aoFW') > 0 && f.indexOf('texture2D( uGIFloor') > iAO, '바닥 지도(AO 바닥 무게를 같이)');
  assert.ok(!/\.directDiffuse \*= [^;]*giV/.test(f) && !/indirectSpecular \*= [^;]*giV/.test(f), '직사광·거울 반사에는 곱하지 않는다');
  assert.ok(v.includes('vGI = giDecode( aoGI, uGINight, uGITint );'));
  for (const k of Object.keys(U)) assert.equal(sh.uniforms[k], U[k], '공유 균일값 ' + k);
});

test('ao_fx 와 triIds 를 같이 쓴다: 둘 다 쓴 뒤에야 놓는다(triUsers)', () => {
  const src = fs.readFileSync(path.join(ASSETS, 'ao_fx.js'), 'utf8'), g = fs.readFileSync(path.join(ASSETS, 'gi_fx.js'), 'utf8'), w = fs.readFileSync(path.join(ASSETS, 'world.js'), 'utf8');
  assert.match(src, /ud\.triUsers = \(ud\.triUsers \|\| 1\) - 1; if \(ud\.triUsers <= 0\) ud\.triIds = null;/);
  assert.match(g, /ud\.triUsers = \(ud\.triUsers \|\| 1\) - 1; if \(ud\.triUsers <= 0\) ud\.triIds = null;/);
  assert.match(w, /m\.userData\.triUsers = 2/);
  assert.match(w, /ChurchGIFx\.attach\(\{ id: id, items: items, mats: aoMats, root: world \}\)/, '속성 없는 메시에 중립 속성(cover)');
  assert.ok(src.includes('/*gifx*/'), 'ao_fx 블록 안 표지');
});

test('gi_<성당>.js 의 배치(정점 수·검사합)가 ao_<성당>.js 와 같다(굽기 하네스의 캔버스 추적이 지오메트리를 바꾸지 않는다)', () => {
  for (const id of ids) {
    const g = readGI(id), src = fs.readFileSync(path.join(ASSETS, 'ao_' + id + '.js'), 'utf8'), ao = JSON.parse(/=(\{.*\});\s*$/s.exec(src)[1]);
    assert.equal(g.b.length, ao.b.length, id);
    g.b.forEach((e, k) => { assert.equal(e.name, ao.b[k].name, id); assert.equal(e.n, ao.b[k].n, id + ' ' + e.name); assert.ok(Math.abs(e.s - ao.b[k].s) <= 1e-6 * Math.max(1, Math.abs(e.s)), id + ' ' + e.name + ' 검사합'); });
  }
});

test('속성 없는 메시(인스턴스 기둥·판)에 중립 aoGI·aoOcc 를 붙인다 — WebGL2 기본 속성값은 맥락 전체 상태라 기대지 않는다', () => {
  const sb = sandbox(['three.min.js', 'ao_fx.js', 'gi_fx.js']), T = sb.THREE;
  const m = new T.MeshStandardMaterial(); sb.ChurchAOFx.patch(m, sb.ChurchAOFx.createUniforms()); sb.ChurchGIFx.patch(m, sb.ChurchGIFx.createUniforms());
  const g = new T.Group(), inst = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), m, 3), plain = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial());
  g.add(inst); g.add(plain);
  assert.equal(sb.ChurchGIFx.cover(g), 2);
  const a = inst.geometry.attributes.aoGI;
  assert.ok(a && a.itemSize === 4 && a.normalized && Array.from(a.array).every((v) => v === 128), '비 1');
  assert.ok(inst.geometry.attributes.aoOcc && Array.from(inst.geometry.attributes.aoOcc.array).every((v) => v === 0), '가림 0');
  assert.ok(!plain.geometry.attributes.aoGI, '고치지 않은 재질의 메시는 그대로');
  assert.equal(sb.ChurchGIFx.cover(g), 0, '두 번 붙이지 않는다');
});
