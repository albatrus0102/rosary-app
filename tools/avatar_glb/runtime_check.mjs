#!/usr/bin/env node
// 런타임 시험(Playwright chromium + SwiftShader): 스탠드인 → CLI 빌드 → apack → harness.html(file://) 에서 avatar_glb.js 를 돌린다.
//   node tools/avatar_glb/runtime_check.mjs [--shots 폴더] [--samba Samba_Dancing.fbx] [--perf-frames 40]
// 확인: 로드·애니메이션 재생·LOD 전환·틴트(재질 슬롯/마스크)·포즈 공유·dispose 메모리 회수, 80명 군중 프레임 비용(코드 아바타 대비), 스크린샷.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { makeStandin } from './make_standin.mjs';
import { writePack } from './avatar_glb.mjs';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const shots = path.resolve(opt('--shots', path.join(here, 'work/shots')));
const samba = opt('--samba', null);
const perfFrames = +opt('--perf-frames', 40);
fs.mkdirSync(shots, { recursive: true });

const work = path.join(here, 'work'), out = path.join(work, 'out'), packDir = path.join(work, 'pack');
const cli = (...a) => execFileSync(process.execPath, [path.join(here, 'avatar_glb.mjs'), ...a], { encoding: 'utf8' });
console.log('# 1. 스탠드인 + CLI');
await makeStandin(path.join(work, 'standin_pack'));
console.log(cli('all', path.join(work, 'standin_pack'), '--out', out));
for (const id of ['S01', 'S02', 'anims']) writePack(path.join(out, id + '.glb'), id, packDir);
const packs = ['S01', 'S02', 'anims'];
let viaThree = null;
if (samba) {
  console.log(cli('character', samba, '--id', 'SAMBA', '-o', path.join(out, 'SAMBA.glb')));
  try { cli('anims', samba, '--name', 'idle=' + samba, '-o', path.join(out, 'anims_samba.glb')); } catch (e) { console.log(String(e.stdout || e).split('\n').slice(0, 6).join('\n')); }
  writePack(path.join(out, 'SAMBA.glb'), 'SAMBA', packDir); writePack(path.join(out, 'anims_samba.glb'), 'anims_samba', packDir);
  packs.push('SAMBA', 'anims_samba');
  // 대안 변환(--via three: Playwright 안 three r149 FBXLoader → GLTFExporter)과 fbx2gltf 결과 비교
  console.log(cli('character', samba, '--via', 'three', '--id', 'SAMBA3', '-o', path.join(out, 'SAMBA3.glb')).split('\n').slice(-9).join('\n'));
  const { inspectFile } = await import('./lib/gltf_ops.mjs');
  const m1 = (await inspectFile(path.join(out, 'SAMBA.glb'))).meta, m2 = (await inspectFile(path.join(out, 'SAMBA3.glb'))).meta;
  viaThree = { fbx2gltf: [m1.height, m1.hipsY, m1.thigh, m1.shin], three: [m2.height, m2.hipsY, m2.thigh, m2.shin] };
}

console.log('# 2. 런타임');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.goto('file://' + path.join(here, 'harness.html') + '?packs=' + packs.join(','));
await page.waitForFunction(() => window.__ready);
const results = {};
// 스크린샷: page.screenshot 은 SwiftShader 에서 이전 합성 프레임을 돌려줄 때가 있어(성호 프레임이 모두 같게 찍힘) 캔버스를 직접 읽는다.
async function shot(file, clip) {
  const b64 = await page.evaluate(() => H.renderer.domElement.toDataURL('image/png').split(',')[1]);
  let img = sharp(Buffer.from(b64, 'base64'));
  if (clip) img = img.extract({ left: clip.x, top: clip.y, width: clip.width, height: clip.height });
  await img.toFile(file);
}
const check = (name, ok, detail) => { results[name] = { ok: !!ok, detail }; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };

if (viaThree) check('convert.via_three', viaThree.three.every((v, i) => Math.abs(v - viaThree.fbx2gltf[i]) < 0.005), viaThree);
const base = await page.evaluate(() => H.info());
const loadMs = await page.evaluate(async (samba) => {
  const t0 = performance.now();
  await H.ready(['S01', 'S02'], 'anims');
  if (samba) { await ChurchGlb.load('SAMBA'); await ChurchGlb.loadAnims('anims_samba'); }
  ChurchGlb.setCatalog({ F: ['S01', 'S02'], M: ['S01'], anims: { F: 'anims', M: 'anims' } });
  return performance.now() - t0;
}, !!samba);
const st = await page.evaluate(() => ChurchGlb.stats());
check('load', st.types.S01 && st.types.S02 && st.anims.includes('anims'), { ms: Math.round(loadMs), stats: st });

// ---- A. 줄 세우기: 틴트(재질 슬롯 S01 / 마스크 S02), 코드 아바타 비교
const tint = await page.evaluate(() => {
  const P = ChurchPalette, out = [];
  const cfgs = [[0, 0], [1, 3], [2, 5], [3, 8]];
  cfgs.forEach(([sk, hr], i) => { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: sk, hair: hr, outfit: 0, name: 1, nv: 2 }, { type: 'S01', anims: 'anims' }), -2.4 + i * 0.8, 0, 0); out.push(a); });
  [[0, 0], [3, 6]].forEach(([sk, hr], i) => { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: sk, hair: hr, outfit: 1, name: 2, nv: 2 }, { type: 'S02', anims: 'anims' }), 0.8 + i * 0.8, 0, 0); out.push(a); });
  H.add(new ChurchAvatar.Avatar({ g: 0, skin: 1, hair: 3, outfit: 2, name: 3, nv: 2 }, {}), 2.6, 0, 0);
  H.view(0, 1.3, -6.2, 0, 0.95, 0); H.step(45);
  const skinMat = (a) => a.meshes[0].find((m) => /skin/i.test(m.material.name));
  return {
    slot: out.slice(0, 4).map((a) => skinMat(a).material.color.getHexString()),
    maskProgramShared: out[4].meshes[0][0].material.customProgramCacheKey() === out[5].meshes[0][0].material.customProgramCacheKey(),
    maskHasMap: !!ChurchGlb.types.S02.mask, info: H.info()
  };
});
check('tint.slot', new Set(tint.slot).size === 4, tint.slot);
check('tint.mask', tint.maskHasMap && tint.maskProgramShared, { programs: tint.info.prog });
await shot(path.join(shots, 'A_lineup_tint.png'));

// ---- B. 애니메이션·상태·이모트
const anim = await page.evaluate(() => {
  H.clear();
  const mk = (x, z, f) => { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: 1, hair: 2, outfit: 0, name: 5, nv: 2 }, { type: 'S01', anims: 'anims' }), x, z, 0); f && f(a); return a; };
  // 앉는 자리(의자: 앉은 사람 뒤 = +z 쪽 등받이), 무릎 받침은 앞(-z → 우리 쪽)
  H.bench(-1.6, 0, 0.45); H.bench(-0.8, 0, 0.45); H.bench(0, 0, 0.45); H.kneeler(0, 0, 0.55, 0.15);
  const walker = mk(-3.2, 0, (a) => a.setWalk(0.45));
  const sit = mk(-1.6, 0, (a) => { a.setSeated(true); });
  const pray = mk(-0.8, 0, (a) => { a.setSeated(true); a.setPray(true); });
  const kneel = mk(0, 0, (a) => { a.setSeated(true); a.setPray(true); a.setKneel(true, { fwd: 0.55, y: 0.15, rail: true }); });
  const cross = mk(1.0, 0), candle = mk(1.9, 0), wave = mk(2.8, 0), bow = mk(3.7, 0);
  const q0 = walker.B.LeftUpLeg.quaternion.clone();
  H.step(30);
  const moved = walker.B.LeftUpLeg.quaternion.angleTo(q0);
  cross.playEmote(1); candle.playEmote(3); wave.playEmote(0); bow.playEmote(2);
  H.step(42);   // 1.4s: 성호는 가슴~왼어깨, 촛불은 손을 뻗은 상태
  H.view(0.3, 1.5, -6.4, 0.3, 0.8, 0); H.step(1, 0.0001);
  const hipsSit = sit.B.Hips.matrixWorld.elements[13], hipsKneel = kneel.B.Hips.matrixWorld.elements[13];
  const rh = cross.B.RightHand.matrixWorld.elements, hd = cross.B.Head.matrixWorld.elements;
  return { moved, hipsSit, hipsKneel, kneelOff: kneel.kneelOffset(), crossHandY: rh[13], headY: hd[13], states: [sit.base, kneel.base], w: Object.assign({}, sit.w) };
});
check('anim.walk', anim.moved > 0.05, anim.moved);
check('anim.sitFit', Math.abs(anim.hipsSit - (0.45 + 0.169 + 0.05)) < 0.06, anim);
check('anim.kneel', anim.states[1] === 'kneel' && anim.kneelOff > 0.4, { hipsKneel: anim.hipsKneel, off: anim.kneelOff });
await shot(path.join(shots, 'B_states_emotes.png'));
// 성호 경로 4장면
const crossFrames = [];
for (const [i, tt] of [[0, 0.55], [1, 1.25], [2, 1.95], [3, 2.6]]) {
  await page.evaluate(([tt]) => {
    H.clear(); const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: 1, hair: 2, outfit: 0, name: 5, nv: 2 }, { type: 'S01', anims: 'anims' }), 0, 0, 0);
    H.step(10); a.playEmote(1); H.step(Math.round(tt * 30)); H.view(-0.9, 1.5, -1.9, 0, 1.3, 0); H.step(1, 0.0001);
  }, [tt]);
  const p = path.join(shots, `C_cross_${i}.png`); await shot(p, { x: 340, y: 0, width: 600, height: 720 }); crossFrames.push(p);
}
// ---- LOD 전환·삼각형
const lod = await page.evaluate(() => {
  H.clear(); const out = [];
  for (let l = 0; l < 3; l++) { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: 1, hair: 2, outfit: 0, name: 5, nv: 2 }, { type: 'S01', anims: 'anims' }), -0.8 + l * 0.8, 0, 0); a.setLod(l); out.push(a); }
  ChurchGlb.CFG.sharePose = false; out[2].setLod(1); out[2].setLod(2); ChurchGlb.CFG.sharePose = true;
  H.view(0, 1.2, -2.6, 0, 0.95, 0); H.step(20);
  return out.map((a) => ({ lod: a.lod, vis: a.meshes.map((l) => l.filter((m) => m.visible).length), tris: a.meshes[a.lod].reduce((s, m) => s + m.geometry.index.count / 3, 0) }));
});
check('lod', lod[0].vis[0] > 0 && lod[1].vis[1] > 0 && lod[2].vis[2] > 0 && lod[0].tris > lod[1].tris && lod[1].tris > lod[2].tris, lod.map((x) => x.tris));
await shot(path.join(shots, 'D_lod012.png'));

// ---- 포즈 공유 + dispose
const pool = await page.evaluate(() => {
  H.clear();
  const list = [];
  for (let i = 0; i < 20; i++) { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: i % 4, hair: i % 10, outfit: 0, name: i, nv: 2 }, { type: 'S01', anims: 'anims' }), (i % 5) - 2, 4 + Math.floor(i / 5), 0); a.setSeated(true); a.setPray(i % 2 === 0); a.snapPose(); a.setLod(2); list.push(a); }
  H.step(10);
  const pools = ChurchGlb.stats().pools;
  list[0].setSeated(false); H.step(3);
  const pools2 = ChurchGlb.stats().pools;
  H.clear(); H.step(1);
  const afterClear = ChurchGlb.stats();
  return { pools, pools2, afterClear };
});
check('pose.share', pool.pools === 2 && pool.pools2 === 3 && pool.afterClear.pools === 0, pool);
// ---- 군중 비용: 80명(내 1 + LOD0 15 + LOD1 24 + LOD2 40), 앉음·기도·걷기 섞음. glb(공유 켬/끔) vs 코드 아바타
// SwiftShader 프레임 시간은 흔들림이 커서 세 방식을 번갈아 3회 재고 중앙값을 쓴다.
const perfRuns = { code: [], glb_share: [], glb_noshare: [] };
for (let round = 0; round < 3; round++) for (const mode of ['code', 'glb_share', 'glb_noshare']) {
  const r = await page.evaluate(([mode, n]) => {
    H.clear();
    ChurchGlb.CFG.sharePose = mode === 'glb_share';
    for (let i = 0; i < 80; i++) {
      const cfg = { g: i % 2, skin: i % 4, hair: i % 10, outfit: i % 12, style: i % 4, name: i, nv: 2 };
      const a = mode === 'code' ? new ChurchAvatar.Avatar(cfg, { self: i === 0 }) : new ChurchGlb.GlbAvatar(cfg, { type: 'S01', anims: 'anims', self: i === 0 });
      const row = Math.floor(i / 8), col = i % 8;
      H.add(a, -3.5 + col, 2 + row * 1.6, 0);
      if (i % 8 === 7) a.setWalk(0.4); else { a.setSeated(true); a.setPray(i % 3 !== 0); }
      a.snapPose();
      a.setLod(i < 16 ? 0 : i < 40 ? 1 : 2);
    }
    H.view(0, 3.2, -3, 0, 0.8, 9);
    return H.perf(n);
  }, [mode, perfFrames]);
  perfRuns[mode].push(r);
}
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const perf = {};
for (const [mode, runs] of Object.entries(perfRuns)) {
  perf[mode] = { update: +med(runs.map((r) => r.update)).toFixed(2), render: +med(runs.map((r) => r.render)).toFixed(1), total: +med(runs.map((r) => r.total)).toFixed(1), calls: runs[0].calls, tris: runs[0].tris };
  console.log('perf', mode, JSON.stringify(perf[mode]));
}
perf.ratio = { total: +(perf.glb_share.total / perf.code.total).toFixed(2), update: +(perf.glb_share.update / perf.code.update).toFixed(2), tris: +(perf.glb_share.tris / perf.code.tris).toFixed(2) };
console.log('perf ratio glb/code', JSON.stringify(perf.ratio));
await shot(path.join(shots, 'E_crowd80_glb.png'));
await page.evaluate(() => { H.clear(); ChurchGlb.CFG.sharePose = true; });

// ---- Samba(실제 Mixamo 뼈대·fbx2gltf 변환): 기도 손·성호·무릎 꿇기·촛불 오버레이
if (samba) {
  const sb = await page.evaluate(() => {
    H.clear();
    const mk = (x, f) => { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: 2, hair: 1, outfit: 0, name: 7, nv: 2 }, { type: 'SAMBA', anims: 'anims_samba' }), x, 0, 0); f && f(a); return a; };
    H.kneeler(1.0, 0, 0.55, 0.15);
    const idle = mk(-2.0), pray = mk(-1.0, (a) => a.setPray(true)), kneel = mk(1.0, (a) => { a.setSeated(true); a.setPray(true); a.setKneel(true, { fwd: 0.55, y: 0.15, rail: true }); });
    const cross = mk(0, (a) => a.playEmote(1)), candle = mk(2.0, (a) => a.playEmote(3));
    pray.prayAmt = 1; pray.prayTarget = 1;
    H.step(40); H.view(0, 1.5, -6.0, 0, 0.9, 0); H.step(1, 0.0001);
    return { ok: true, bones: ChurchGlb.stats().types.SAMBA };
  });
  check('samba.overlay', sb.ok, sb.bones);
  await shot(path.join(shots, 'F_samba_overlays.png'));
}

// ---- dispose(이름표 텍스처는 avatar.js 가 이름별로 캐시하므로 이미 쓴 이름 하나만): 아바타 해제(뼈 텍스처·재질 사본 회수) → 캐릭터 종류 해제(공유 지오메트리·텍스처 회수)
const disp = await page.evaluate(() => {
  H.clear(); H.step(1);
  const t0 = H.info();
  for (let i = 0; i < 30; i++) { const a = H.add(new ChurchGlb.GlbAvatar({ g: 0, skin: i % 4, hair: i % 10, outfit: 0, name: 5, nv: 2 }, { type: i % 2 ? 'S02' : 'S01', anims: 'anims' }), (i % 6) - 3, 2 + Math.floor(i / 6), 0); a.setLod(i % 3); a.setSeated(i % 2 === 0); }
  H.view(0, 2, -4, 0, 0.8, 4); H.step(5);
  const mid = H.info(), matsMid = ChurchGlb.stats().types.S01.mats;
  H.clear(); H.step(1);
  const t1 = H.info(), st1 = ChurchGlb.stats();
  const ids = Object.keys(ChurchGlb.types), geos = new Set(); let fired = 0;
  ids.forEach((id) => ChurchGlb.types[id].lods.forEach((l) => l.forEach((p) => geos.add(p.geometry))));
  geos.forEach((g) => g.addEventListener('dispose', () => fired++));
  ids.forEach((id) => ChurchGlb.types[id].dispose());
  H.step(1);
  return { t0, mid, matsMid, t1, users: Object.values(st1.types).map((x) => x.users), matsAfter: Object.values(st1.types).map((x) => x.mats), pools: st1.pools, geos: geos.size, fired, t2: H.info(), left: Object.keys(ChurchGlb.types).length };
});
check('dispose.avatars', disp.t1.tex <= disp.t0.tex && disp.users.every((u) => u === 0) && disp.matsAfter.every((m) => m === 0) && disp.pools === 0 && disp.mid.tex > disp.t0.tex, { t0: disp.t0, mid: disp.mid, t1: disp.t1, matsMid: disp.matsMid });
check('dispose.types', disp.fired === disp.geos && disp.left === 0 && disp.t2.geo < disp.t1.geo && disp.t2.tex <= disp.t1.tex, { geos: disp.geos, fired: disp.fired, t1: disp.t1, t2: disp.t2 });

check('no page errors', errors.filter((e) => !/GPU stall|WebGL: INVALID|Automatic fallback/.test(e)).length === 0, errors.slice(0, 8));
await browser.close();
fs.writeFileSync(path.join(shots, 'runtime_results.json'), JSON.stringify({ results, perf, crossFrames }, null, 1));
const fails = Object.entries(results).filter(([, r]) => !r.ok).map(([k]) => k);
console.log(fails.length ? 'FAILED: ' + fails.join(', ') : 'ALL PASS', '→', shots);
process.exit(fails.length ? 1 : 0);
