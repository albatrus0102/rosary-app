#!/usr/bin/env node
// 캐릭터 glb 파이프라인 CLI. 준비: (cd tools/avatar_glb && npm install)
//
//   node tools/avatar_glb/avatar_glb.mjs convert  <in.fbx> [-o out.glb] [--via fbx2gltf|three]
//   node tools/avatar_glb/avatar_glb.mjs character <캐릭터.fbx|glb> --id F01 [-o out/F01.glb] [--tex 1024] [--lods 8000,4000,1500]
//                                       [--mat 원래재질=skin,머리재질=hair] [--textures 서비스.glb] [--mask mask.png] [--via ...] [--no-meshopt]
//   node tools/avatar_glb/avatar_glb.mjs anims    <anim_*.fbx|dir ...> [-o out/anims_F.glb] [--name 정규이름=파일 ...] [--via ...]
//   node tools/avatar_glb/avatar_glb.mjs validate <glb ...> [--json]
//   node tools/avatar_glb/avatar_glb.mjs inspect  <glb>
//   node tools/avatar_glb/avatar_glb.mjs pack     <glb> --id F01 [--out tools/avatar_glb/out]   → apack_<id>.js (file:// WebView 용 <script> 데이터 팩)
//   node tools/avatar_glb/avatar_glb.mjs all      <character_pack 폴더> [--out tools/avatar_glb/out]  (폴더 규약: docs/art/CHARACTER_3D_PIPELINE.md §4)
//
// 종료 코드: 0 통과, 1 검증 실패/오류. 보고서는 사람이 읽는 표 + (--json) JSON.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildCharacter, buildAnims, inspectFile, convertFbx } from './lib/gltf_ops.mjs';
import { validateSummary, clipNameFor, LIMITS } from './lib/rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEF_OUT = path.join(here, 'out');

function parseArgs(argv) {
  const o = { _: [], name: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') o.out = argv[++i];
    else if (a === '--name') o.name.push(argv[++i]);
    else if (a === '--json') o.json = true;
    else if (a === '--no-meshopt') o.meshopt = false;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}
const kb = (b) => (b / 1024).toFixed(1) + 'KB';
const gz = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;

/** 사람이 읽는 보고서 */
export function formatReport(file, s, v, extra = []) {
  const L = [];
  L.push(`== ${path.basename(file)} (${s.kind}) ${kb(s.bytes)}`);
  if (s.kind === 'character') {
    L.push(`  삼각형 LOD0/1/2: ${s.lods.join(' / ')}  (한도 ${LIMITS.tris.join(' / ')})`);
    L.push(`  스킨 뼈: ${s.skinJoints} (한도 ${LIMITS.joints})   재질: ${s.materials.join(', ')}  틴트: ${s.tintSlots.map(([m, t]) => `${m}→${t || '-'}`).join(', ')}${s.tintMask ? ' +마스크' : ''}`);
    L.push(`  텍스처: ${s.textures.length ? s.textures.map((t) => `${t.name || '?'} ${t.w}x${t.h} ${t.mime} ${kb(t.bytes)}`).join(', ') : '없음'}`);
    const m = s.meta || {};
    L.push(`  키 ${m.height}m  Hips ${m.hipsY}m  허벅지 ${m.thigh} 종아리 ${m.shin}  앉음 살두께 ${m.seatDrop}  무릎 앞 ${m.kneeFront}  발목 ${m.ankleY}`);
  } else {
    const cm = (s.meta && s.meta.clips) || {};
    L.push(`  클립 ${s.clips.length}: ` + s.clips.map((c) => `${c.name} ${c.duration.toFixed(2)}s${cm[c.name] && cm[c.name].speed ? ` ${cm[c.name].speed}m/s` : ''}`).join(', '));
  }
  for (const x of extra) L.push('  ' + x);
  for (const e of v.errors) L.push('  [오류] ' + e);
  for (const w of v.warnings) L.push('  [경고] ' + w);
  L.push(v.ok ? '  => 통과' : '  => 실패');
  return L.join('\n');
}

function listInputs(args) {
  const files = [];
  for (const a of args) {
    if (fs.existsSync(a) && fs.statSync(a).isDirectory()) for (const f of fs.readdirSync(a).sort()) { if (/\.(fbx|glb|gltf)$/i.test(f)) files.push(path.join(a, f)); }
    else files.push(a);
  }
  return files;
}
function parseMap(s) { const m = {}; if (!s) return m; for (const kv of s.split(',')) { const [k, v] = kv.split('='); if (k && v) m[k.trim()] = v.trim(); } return m; }

export async function cmdCharacter(input, o) {
  const id = o.id || path.basename(input).replace(/\.\w+$/, '');
  if (!/^[A-Za-z0-9_]{1,24}$/.test(id)) throw new Error('--id 는 영문·숫자·_ 1~24자: ' + id);
  const out = o.out || path.join(DEF_OUT, id + '.glb');
  const r = await buildCharacter({
    input, out, id, via: o.via, tex: o.tex ? +o.tex : undefined, lods: o.lods ? o.lods.split(',').map(Number) : undefined,
    matMap: parseMap(o.mat), textures: o.textures, mask: o.mask, meshopt: o.meshopt, workDir: path.join(here, 'work')
  });
  const v = validateSummary(r.summary);
  v.warnings.unshift(...r.warnings);
  return { file: out, summary: r.summary, v, extra: [`입력 삼각형 ${r.summary.inputTris}, 뼈 이름 정규화 ${r.summary.renamed}개, gzip ${kb(gz(out))}`] };
}
export async function cmdAnims(inputs, o) {
  const named = {};
  for (const n of o.name) { const [k, v] = n.split('='); named[path.resolve(v)] = k; }
  const files = listInputs(inputs);
  const out = o.out || path.join(DEF_OUT, 'anims.glb');
  const r = await buildAnims(files.map((f) => ({ file: f, name: named[path.resolve(f)] })), { out, via: o.via, meshopt: o.meshopt, workDir: path.join(here, 'work') });
  const v = validateSummary(r.summary);
  v.warnings.unshift(...r.warnings);
  return { file: out, summary: r.summary, v, extra: [`입력 ${files.length}개: ` + files.map((f) => `${path.basename(f)}→${named[path.resolve(f)] || clipNameFor(f) || '?'}`).join(', ')] };
}
/** apack_<id>.js: (window.ChurchAvatarPack=window.ChurchAvatarPack||{})['<id>']='<base64 glb>'; */
export function writePack(glb, id, outDir) {
  if (!/^[A-Za-z0-9_]{1,24}$/.test(id)) throw new Error('bad id ' + id);
  const b64 = fs.readFileSync(glb).toString('base64');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `apack_${id}.js`);
  fs.writeFileSync(out, `/* avatar_glb.mjs pack 로 생성(직접 고치지 말 것): ${path.basename(glb)} */\n(window.ChurchAvatarPack=window.ChurchAvatarPack||{})['${id}']='${b64}';\n`);
  return { out, bytes: fs.statSync(out).size, gzip: gz(out) };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = parseArgs(rest);
  const results = [];
  if (cmd === 'convert') {
    const r = await convertFbx(o._[0], o.out ? path.dirname(o.out) : path.join(here, 'work'), o.via || 'fbx2gltf');
    if (o.out && r.file !== o.out) fs.renameSync(r.file, o.out);
    console.log(r.log); console.log('wrote', o.out || r.file); return 0;
  } else if (cmd === 'character') {
    results.push(await cmdCharacter(o._[0], o));
  } else if (cmd === 'anims') {
    results.push(await cmdAnims(o._, o));
  } else if (cmd === 'validate' || cmd === 'inspect') {
    for (const f of o._) { const s = await inspectFile(f); results.push({ file: f, summary: s, v: validateSummary(s), extra: [`gzip ${kb(gz(f))}`] }); }
  } else if (cmd === 'pack') {
    const r = writePack(o._[0], o.id || path.basename(o._[0]).replace(/\.\w+$/, ''), o.out || DEF_OUT);
    console.log(`wrote ${r.out} ${kb(r.bytes)} (gzip ${kb(r.gzip)} ≈ APK 증가분)`); return 0;
  } else if (cmd === 'all') {
    // character_pack/<ID>_*/*.fbx (캐릭터 With Skin), character_pack/anim/*.fbx (동작). 성별 접두(F/M)별 동작 묶음이 있으면 anim_F/, anim_M/.
    const dir = o._[0], outDir = o.out || DEF_OUT;
    for (const d of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, d);
      if (!fs.statSync(p).isDirectory()) continue;
      if (/^anim(_[A-Z])?$/i.test(d)) {
        const r = await cmdAnims([p], { ...o, name: o.name, out: path.join(outDir, (d === 'anim' ? 'anims' : 'anims_' + d.slice(5)) + '.glb') });
        results.push(r); continue;
      }
      const fbx = fs.readdirSync(p).filter((f) => /\.(fbx|glb)$/i.test(f) && !/^anim/i.test(f));
      if (!fbx.length) continue;
      const id = d.split('_')[0];
      const mask = fs.existsSync(path.join(p, 'tint_mask.png')) ? path.join(p, 'tint_mask.png') : undefined;
      const svc = fs.readdirSync(p).find((f) => /^service.*\.glb$/i.test(f));
      results.push(await cmdCharacter(path.join(p, fbx.find((f) => /\.fbx$/i.test(f)) || fbx[0]), { ...o, id, out: path.join(outDir, id + '.glb'), mask, textures: svc ? path.join(p, svc) : undefined }));
    }
  } else {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 13).join('\n').replace(/^\/\/ ?/gm, ''));
    return cmd ? 1 : 0;
  }
  let ok = true;
  for (const r of results) { console.log(formatReport(r.file, r.summary, r.v, r.extra)); ok = ok && r.v.ok; }
  if (o.json) console.log(JSON.stringify(results.map((r) => ({ file: r.file, ok: r.v.ok, errors: r.v.errors, warnings: r.v.warnings, summary: { ...r.summary, joints: undefined } })), null, 1));
  return ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error('오류:', e.message); if (process.env.DEBUG) console.error(e.stack); process.exit(1); });
}
