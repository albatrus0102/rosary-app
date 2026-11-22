// 렌더 v4(docs/church/RENDER_V4.md) 정적 시험: 단계 표(탐침·빛줄기·먼지·심도·아지랑이), 반사 탐침 셰이더 고치기, 탐침 자리, 빛줄기·먼지 셰이더 규칙.
// 실제 화면·성능은 perf_compare.mjs·flicker.mjs(헤드리스, node --test 밖)로 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const A = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/church');
const read = (f) => fs.readFileSync(path.join(A, f), 'utf8');

function sandbox(files, extra = {}) {
  const sb = { console, performance, ...extra };
  sb.window = sb; sb.self = sb; sb.location = sb.location || { search: '' };
  sb.document = { createElement: () => ({ getContext: () => null, style: {} }), addEventListener() {} };
  vm.createContext(sb);
  files.forEach((f) => vm.runInContext(read(f), sb, { filename: f }));
  return sb;
}

test('단계 표: 탐침·빛줄기·먼지·심도·아지랑이는 high 전부, mid 줄임, low 없음', () => {
  const T = sandbox(['render.js'], { THREE: {} }).ChurchRender.TIERS;
  const H = T.high, M = T.mid, L = T.low;
  assert.equal(L.probes, 0); assert.equal(L.shafts, false); assert.equal(L.motes, 0); assert.equal(L.fxDiv, 0); assert.equal(L.dof, 0); assert.equal(L.haze, 0);
  assert.equal(H.probes, 2); assert.equal(M.probes, 1);
  assert.ok(M.probeRes < H.probeRes && (H.probeRes & (H.probeRes - 1)) === 0 && (M.probeRes & (M.probeRes - 1)) === 0, '큐브 크기는 2의 거듭제곱, mid 가 작다');
  assert.ok(H.shafts && M.shafts);
  assert.ok(M.fxDiv > H.fxDiv && H.fxDiv >= 2, 'fx 패스는 전해상도가 아니다(high ½, mid ¼)');
  assert.ok(H.motes >= 300 && H.motes <= 1000 && M.motes < H.motes, '먼지: high 수백~천, mid 더 적게');
  assert.ok(M.dof > 0 && M.dof <= H.dof && M.haze <= H.haze && M.shaftK <= H.shaftK);
});

test('반사 탐침: three r149 큐브 UV 함수를 이름만 바꿔 복제한다(HDRI 쪽과 겹치지 않고 상수는 균일값)', () => {
  const sb = sandbox(['three.min.js', 'probe_fx.js']);
  const P = sb.ChurchProbes, T = sb.THREE;
  const src = T.ShaderChunk.cube_uv_reflection_fragment, cp = P.cubeUVCopy(src);
  for (const tok of ['CUBEUV_TEXEL_WIDTH', 'CUBEUV_TEXEL_HEIGHT', 'CUBEUV_MAX_MIP', 'cubeUV_', 'getFace(', 'getUV(', 'bilinearCubeUV(', 'roughnessToMip(', 'textureCubeUV(', '#ifdef ENVMAP_TYPE_CUBE_UV']) {
    assert.ok(!cp.includes(tok), '남은 토큰 ' + tok);
  }
  for (const tok of ['prbCubeUV(', 'prbBilinear(', 'uPrbCU.x', 'uPrbCU.z', 'prbCU_minMipLevel']) assert.ok(cp.includes(tok), tok);
  // PMREM 크기 → three 의 generateCubeUVSize 와 같은 값(128 큐브 = 높이 512)
  const cu = P.cubeUVSize(512);
  assert.ok(Math.abs(cu[0] - 1 / 384) < 1e-12 && Math.abs(cu[1] - 1 / 512) < 1e-12 && cu[2] === 7);
  const c64 = P.cubeUVSize(256); assert.ok(Math.abs(c64[0] - 1 / 336) < 1e-12 && c64[2] === 6, '64 큐브: 폭은 최소 3×112');
});

test('반사 탐침: 금속·코팅·매끈한 재질만 고치고, 거울 반사만 바꾸고(확산 IBL 그대로), 1차 반사 가림(ao_fx)이 그 뒤에 곱해진다', () => {
  const sb = sandbox(['three.min.js', 'ao_fx.js', 'probe_fx.js']);
  const T = sb.THREE, P = sb.ChurchProbes;
  assert.equal(P.wants(new T.MeshStandardMaterial({ metalness: 1, roughness: 0.3 })), true, '금속');
  assert.equal(P.wants(new T.MeshPhysicalMaterial({ roughness: 0.7, clearcoat: 0.8 })), true, '대리석(코팅)');
  assert.equal(P.wants(new T.MeshStandardMaterial({ roughness: 0.9 })), false, '회반죽');
  assert.equal(P.wants(new T.MeshStandardMaterial({ metalness: 1, transparent: true })), false, '투명');
  assert.equal(P.wants(new T.MeshBasicMaterial()), false);
  const m = new T.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3, clearcoat: 0.5 });
  sb.ChurchAOFx.patch(m, sb.ChurchAOFx.createUniforms());   // world.js 순서: ao_fx → 탐침 → cam_guard
  const U = P.createUniforms();
  assert.equal(P.patch(m, U, 1.6, true), true);
  assert.ok('PRB_TWO' in m.defines, 'high: 두 번째 탐침 갈래');
  assert.equal(P.patch(m, U, 1.6), false, '두 번 고치지 않는다');
  assert.match(m.customProgramCacheKey(), /\|aofx1\|prb1$/);
  const L = T.ShaderLib.physical, sh = { uniforms: T.UniformsUtils.clone(L.uniforms), vertexShader: L.vertexShader, fragmentShader: L.fragmentShader };
  m.onBeforeCompile(sh, null);
  const f = sh.fragmentShader;
  assert.ok(!f.includes('#include <lights_fragment_maps>'), 'lights_fragment_maps 를 펼쳐서 바꿨다');
  assert.ok(f.includes('radiance += prbRadiance( geometry.viewDir, geometry.normal, material.roughness, iblIrradiance );'));
  assert.ok(f.includes('clearcoatRadiance += prbRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness, iblIrradiance );'));
  assert.ok(f.includes('iblIrradiance += getIBLIrradiance( geometry.normal );'), '확산 IBL 은 HDRI 그대로');
  assert.ok(f.indexOf('prbRadiance( geometry.viewDir') < f.indexOf('reflectedLight.indirectSpecular *= aoSO'), '탐침 반사 뒤에 반사 가림');
  assert.ok(f.includes('prbBox(') && f.includes('uPrbMinA'), '박스 투영');
  assert.ok(f.includes('return mix( irr * RECIPROCAL_PI, pr, uPrbK.x );'), '탐침 밖 몫은 이미 잰 HDRI 조도로(HDRI 를 다시 읽지 않는다)');
  const m1 = new T.MeshStandardMaterial({ metalness: 1 }); P.patch(m1, U, 1, false); assert.ok(!m1.defines || !('PRB_TWO' in m1.defines), 'mid: 한 탐침 갈래만');
  assert.ok(f.includes('if ( w < 0.999 ) pr = prbCubeUV( uPrbA') && f.includes('if ( w > 0.001 ) pr = mix( pr, prbCubeUV( uPrbB'), '두 탐침은 섞이는 띠에서만 둘 다 읽는다');
  assert.ok(sh.vertexShader.includes('vPrbW = ( modelMatrix * prbWp ).xyz;'));
  assert.equal(sh.uniforms.uPrbM.value, 1.6);
  for (const k of Object.keys(U)) assert.equal(sh.uniforms[k], U[k], '공유 균일값 ' + k);
});

test('탐침 자리(probe_places.js): 모든 성당에 신랑·성소 2개, 탐침은 자기 상자 안, 상자는 실내 크기', () => {
  const sb = sandbox(['probe_places.js']), PP = sb.ChurchProbePlaces;
  const ids = fs.readdirSync(A).filter((f) => /^ch_[a-z]+\.js$/.test(f) && f !== 'ch_glass.js').map((f) => f.slice(3, -3));
  for (const id of ids) {
    const e = PP[id];
    assert.ok(e && e.p.length === 2 && e.box.length === 2, id);
    e.p.forEach((p, k) => {
      const b = e.box[k];
      assert.ok(p[0] > b[0] && p[0] < b[3] && p[1] > b[1] && p[1] < b[4] && p[2] > b[2] && p[2] < b[5], id + ' 탐침 ' + k + ' 이 상자 안');
      assert.ok(b[3] - b[0] >= 5 && b[4] - b[1] >= 3.5 && b[5] - b[2] >= 8, id + ' 상자 크기');
      assert.ok(p[1] - b[1] > 1.5 && p[1] - b[1] < 4, id + ' 탐침 높이(바닥 위 2~3m)');
    });
    assert.ok(e.p[1][2] < e.p[0][2], id + ' 성소 탐침이 제대 쪽(-z)');
  }
});

test('빛줄기·먼지 셰이더: 해 그림자 맵·장면 깊이로 가리고, 먼지는 화소보다 작아도 반짝이지 않으며, 움직임 줄이기면 멈춘다', () => {
  const src = read('shaft_fx.js');
  assert.match(src, /mix\(uLitMin, 1\.0, shLit\(vW\)\)/, '빛줄기: 그늘은 옅게, 해가 닿는 곳이 가장 밝다');
  assert.match(src, /shSoft\(vZ, 0\.9\)/, '빛줄기: 벽·바닥에 닿는 곳이 부드럽다(soft particles)');
  assert.match(src, /float S = max\(s, 2\.5\); gl_PointSize = S; vE = \(s \* s\) \/ \(S \* S\)/, '먼지: 최소 2.5화소, 밝기는 넓힌 면적만큼 나눔');
  assert.match(src, /mix\(vec3\(dot\(vCol, vec3\(0\.2126, 0\.7152, 0\.0722\)\)\), vCol, 0\.5\)/, '색유리 빛은 공기 속에서 절반 바랜다(채도 높은 광선 금지)');
  const sb = sandbox(['three.min.js', 'shaft_fx.js']), T = sb.THREE;
  const g = new T.BufferGeometry();
  const nq = 2, pos = new Float32Array(nq * 18), col = new Float32Array(nq * 18);
  for (let q = 0; q < nq; q++) { const P6 = [[0, 5, 0], [0, 3, 0], [4, 0, 1], [0, 5, 0], [4, 0, 1], [4, 2, 1]]; P6.forEach((p, i) => { pos.set([p[0] + q * 3, p[1], p[2]], q * 18 + i * 3); col.set(q ? [0, 0, 0] : [0.6, 0.55, 0.4], q * 18 + i * 3); }); }
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(nq * 12), 2));
  let seed = 1; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const S = sb.ChurchShafts.create({ geometry: g, profile: null, nMotes: 200, rng });
  assert.equal(S.scene.children.length, 2, '빛줄기 1 + 먼지 1 = draw call 2');
  S.updateMotes();
  const mp = S.motes.geometry.attributes.position.array, mc = S.motes.geometry.attributes.aCol.array;
  for (let i = 0; i < 200; i++) {
    assert.ok(mp[i * 3] >= -0.4 && mp[i * 3] <= 4.4, '먼지는 밝은 판(첫 판) 둘레에만: x ' + mp[i * 3]);
    assert.ok(mc[i * 3] > 0, '밝기 = 판 세기');
  }
  S.reduced = true; S.setTime(10); assert.equal(S.uniforms.uT.value, 0, '움직임 줄이기: 시간이 멈춘다');
  S.reduced = false; S.setTime(3); assert.equal(S.uniforms.uT.value, 3);
});

test('연결: 스크립트 순서, low 는 예전 가산 판, 장면 패스에서 빼고 fx 패스·최종 패스에서 더한다, 심도는 먼 쪽만', () => {
  for (const f of ['index.html', 'test.html']) {
    const h = read(f), w = h.indexOf('<script src="world.js">');
    for (const s of ['probe_places.js', 'probe_fx.js', 'shaft_fx.js']) assert.ok(h.indexOf('<script src="' + s + '">') > 0 && h.indexOf('<script src="' + s + '">') < w, f + ' ' + s);
  }
  const w = read('world.js');
  assert.match(w, /var beamList = \[\], SHEETS = low \? 1 : 3;/);
  assert.match(w, /softOn = !!shafts && !!\(tierCfg && tierCfg\[tier\]\.shafts\);/);
  assert.match(w, /beamMesh\.visible = !softOn && !api\.viewMode/);
  assert.match(w, /var dustN = \(low \|\| shafts\) \? 0/, '예전 무작위 먼지(반짝이)는 빛줄기 먼지로 바뀐다');
  const r = read('render.js');
  assert.match(r, /if \(fxOn > 0\.5\) s\.rgb \+= texture2D\(tFx, vUv\)\.rgb;/);
  assert.ok(r.indexOf('if (fxOn > 0.5) s.rgb += texture2D(tFx, vUv).rgb;') > r.indexOf("if (bloomOn > 0.5)"), '빛줄기는 블룸 뒤에 더한다(번져 뿌옇게 되지 않게)');
  assert.match(r, /return smoothstep\(uDof\.x \* 1\.35, uDof\.x \* 3\.2, z\) \* uDof\.y;/, '심도: 초점보다 먼 배경만');
  const m = read('main.js');
  assert.match(m, /if \(!App\.firstFramePosted && !prbFirst\)/, '첫 탐침 굽기는 입장 화면 아래(firstFrame 한 프레임 미룸)');
  assert.match(m, /dm === 'seated' \|\| dm === 'sitting' \|\| App\.dofStill > 1\.2/, '심도는 기도·멈춰 바라볼 때만');
  const L = sandbox(['looks.js']).ChurchLooks;
  const d = L.get('nowhere');
  assert.equal(d.shaftK, 1); assert.equal(d.moteK, 1); assert.equal(d.prbK, 1);
  for (const id of Object.keys(L.LOOKS)) { const l = L.get(id); assert.ok(l.shaftK >= 0 && l.shaftK <= 1.5 && l.moteK >= 0 && l.moteK <= 1.5, id); }
});
