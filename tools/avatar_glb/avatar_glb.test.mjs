// 캐릭터 glb 파이프라인(CLI 로직) 시험: node --test tools/avatar_glb/avatar_glb.test.mjs   (준비: cd tools/avatar_glb && npm install)
// 순수 규칙(뼈 이름·동작 이름·틴트 슬롯·검증·루트 모션) + 스탠드인으로 character/anims/validate/pack 엔드투엔드(FBX 변환 없이 glb 입력).
// 렌더 시험(로드·애니메이션·LOD·틴트·dispose·군중 비용)은 runtime_check.mjs (Playwright, node --test 밖).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeBoneName, clipNameFor, tintSlotFor, validateSummary, stripRootMotion, REQUIRED_BONES, MIXAMO_65, CLIPS, CLIP_NAMES, LIMITS, isUpperBody } from './lib/rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avglb-test-'));

test('bone names: mixamorig prefixes, Blender suffixes and armature paths are stripped', () => {
  for (const [a, b] of [['mixamorig:Hips', 'Hips'], ['mixamorig1:LeftHandIndex1', 'LeftHandIndex1'], ['mixamorig9:Spine2', 'Spine2'], ['mixamorig_Head', 'Head'], ['mixamorigHips', 'Hips'], ['mixamorig2LeftHandThumb1', 'LeftHandThumb1'],
    ['MIXAMORIG:Neck', 'Neck'], ['mixamorig:LeftArm.001', 'LeftArm'], ['Armature|mixamorig:Hips', 'Hips'], ['Hips', 'Hips'], ['Body', 'Body'], ['', ''], [null, '']]) {
    assert.equal(normalizeBoneName(a), b, String(a));
  }
  assert.equal(MIXAMO_65.length, 65);
  assert.equal(new Set(MIXAMO_65).size, 65);
  for (const b of REQUIRED_BONES) assert.ok(MIXAMO_65.includes(b), b);
  assert.ok(isUpperBody('mixamorig:RightHandThumb2') && isUpperBody('Head') && !isUpperBody('Hips') && !isUpperBody('LeftUpLeg') && !isUpperBody('Spine'));
});

test('clip names: Mixamo file/take names map to the canonical app names', () => {
  const cases = {
    'Idle.fbx': 'idle', 'Breathing Idle.fbx': 'idle', 'Walking.fbx': 'walk', 'Female Walk.fbx': 'walk', 'Stand To Sit.fbx': 'sit_down', 'Standing To Sitting.fbx': 'sit_down',
    'Sitting Idle.fbx': 'sit_idle', 'Sitting.fbx': 'sit_idle', 'Sit To Stand.fbx': 'stand_up', 'Sitting To Standing.fbx': 'stand_up', 'Praying.fbx': 'pray',
    'Standing To Kneeling.fbx': 'kneel_down', 'Kneeling Idle.fbx': 'kneel_idle', 'Kneeling To Standing.fbx': 'kneel_up', 'Bow.fbx': 'bow', 'Quick Formal Bow.fbx': 'bow',
    'Waving.fbx': 'wave', 'Standing Greeting.fbx': 'wave', 'anim_kneel_idle.fbx': 'kneel_idle', 'dir/anim_walk.glb': 'walk', 'C:\\x\\Sit To Stand.fbx': 'stand_up',
    'Samba Dancing.fbx': null, 'mixamo.com': null
  };
  for (const [src, want] of Object.entries(cases)) assert.equal(clipNameFor(src), want, src);
  for (const n of CLIP_NAMES) assert.equal(clipNameFor(n + '.fbx'), n);
  assert.deepEqual(CLIP_NAMES.filter((n) => CLIPS[n].need), ['idle', 'walk', 'sit_down', 'sit_idle', 'stand_up']);
});

test('tint slots from material names', () => {
  for (const [m, s] of [['skin', 'skin'], ['Skin_MAT', 'skin'], ['body_skin', 'skin'], ['Face', 'skin'], ['Hair', 'hair'], ['hair_cards', 'hair'], ['Alpha_Body_MAT', null], ['cloth', null], ['skirt', null], ['', null]]) {
    assert.equal(tintSlotFor(m), s, m);
  }
});

test('root motion: detrend keeps sway but removes drift; relative keeps intended travel', () => {
  const n = 31, v = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v[i * 3] = 0.02 * Math.sin(i); v[i * 3 + 1] = 1; v[i * 3 + 2] = 1.3 * i / 30; }
  const d = stripRootMotion(v, 'detrend');
  assert.ok(Math.abs(d.drift - 1.3) < 0.01);
  assert.ok(Math.abs(d.values[(n - 1) * 3 + 2]) < 1e-6 && Math.abs(d.values[2]) < 1e-6);
  assert.equal(d.values[1], 1);
  const r = stripRootMotion(v, 'relative');
  assert.equal(r.values[2], 0);
  assert.ok(Math.abs(r.values[(n - 1) * 3 + 2] - 1.3) < 1e-5);
  assert.equal(v[2 + 3 * 30], Math.fround(1.3), 'input untouched');
});

const goodChar = () => ({ kind: 'character', bytes: 300e3, joints: MIXAMO_65.slice(), skinJoints: 52, lods: [7900, 3990, 1490], textures: [{ name: 'base', w: 1024, h: 1024, mime: 'image/webp' }], materials: ['skin', 'hair', 'cloth'], height: 1.7 });
test('validate: a good character passes; each limit produces a Korean error', () => {
  assert.deepEqual(validateSummary(goodChar()), { ok: true, errors: [], warnings: [] });
  const cases = [
    [{ bytes: LIMITS.bytes + 1 }, /용량/], [{ skinJoints: 66 }, /스킨 뼈 66/], [{ lods: [9000, 4000, 1500] }, /LOD0 삼각형 9000/], [{ lods: [8000, 4000] }, /LOD 2단계/],
    [{ textures: [{ name: 'b', w: 2048, h: 1024, mime: 'image/webp' }] }, /2048x1024/], [{ height: 170 }, /단위 cm/],
    [{ joints: MIXAMO_65.filter((b) => !/Hand(Index|Middle|Ring|Pinky|Thumb)/.test(b)) }, /손가락.*65 joints/], [{ joints: MIXAMO_65.filter((b) => b !== 'Spine1') }, /Spine1/]
  ];
  for (const [patch, re] of cases) {
    const v = validateSummary({ ...goodChar(), ...patch });
    assert.equal(v.ok, false, JSON.stringify(patch));
    assert.ok(v.errors.some((e) => re.test(e)), v.errors.join(' | '));
  }
  assert.ok(validateSummary({ ...goodChar(), lods: [8300, 4100, 1550] }).ok, 'within 5% slack');
  const w = validateSummary({ ...goodChar(), materials: ['Body', 'Cloth', 'Shoes', 'Hat'], textures: [{ name: 'b', w: 1024, h: 1024, mime: 'image/png' }] });
  assert.ok(w.ok);
  assert.ok(w.warnings.some((x) => /재질 4개/.test(x)) && w.warnings.some((x) => /WebP/.test(x)) && w.warnings.some((x) => /틴트/.test(x)));
});

test('validate: anims require the five base clips; warns on missing optional clips and root drift', () => {
  const clips = ['idle', 'walk', 'sit_down', 'sit_idle', 'stand_up'].map((name) => ({ name, duration: 1.2, drift: name === 'walk' ? 1.4 : 0 }));
  const ok = validateSummary({ kind: 'anims', bytes: 60e3, joints: MIXAMO_65, clips });
  assert.ok(ok.ok, ok.errors.join());
  assert.ok(ok.warnings.some((w) => /권장 동작 없음.*pray/.test(w)) && ok.warnings.some((w) => /walk.*1\.40m/.test(w)));
  const bad = validateSummary({ kind: 'anims', bytes: 60e3, joints: MIXAMO_65, clips: [...clips.slice(0, 3), { name: 'dance', duration: 2 }, { name: 'bow', duration: 0.1 }] });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /필수 동작 없음: sit_idle, stand_up/.test(e)) && bad.errors.some((e) => /bow.*짧음/.test(e)) && bad.warnings.some((w) => /dance/.test(w)));
  assert.ok(validateSummary({ kind: 'anims', bytes: LIMITS.animBytes + 1, joints: MIXAMO_65, clips }).errors.some((e) => /동작 묶음/.test(e)));
});

// ---- 엔드투엔드(스탠드인 glb → CLI)
let standin;
test('standin: Mixamo-compatible skeleton, cm armature, two character layouts and five clips', async () => {
  const { makeStandin } = await import('./make_standin.mjs');
  const r = await makeStandin(path.join(tmp, 'pack'));
  standin = r;
  assert.equal(r.bones, 65);
  assert.ok(r.tris > 8000 && r.tris < 20000, String(r.tris));
  assert.deepEqual(r.clips.sort(), ['Idle', 'Sit To Stand', 'Sitting Idle', 'Stand To Sit', 'Walking']);
  for (const f of ['S01_standin/S01_standin.glb', 'S02_single/S02_single.glb', 'S02_single/tint_mask.png', 'anim/Walking.glb']) assert.ok(fs.existsSync(path.join(tmp, 'pack', f)), f);
});

const cli = (...a) => { try { return { code: 0, out: execFileSync(process.execPath, [path.join(here, 'avatar_glb.mjs'), ...a], { encoding: 'utf8', stdio: 'pipe' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; } };

test('cli all: builds characters + anims that pass validate (LODs, bones, WebP, meshopt, metadata)', async () => {
  assert.ok(standin, 'standin first');
  const out = path.join(tmp, 'out');
  const r = cli('all', path.join(tmp, 'pack'), '--out', out, '--json');
  assert.equal(r.code, 0, r.out);
  const json = JSON.parse(r.out.slice(r.out.indexOf('\n[') + 1));
  const by = Object.fromEntries(json.map((x) => [path.basename(x.file), x]));
  assert.deepEqual(Object.keys(by).sort(), ['S01.glb', 'S02.glb', 'anims.glb']);
  for (const id of ['S01', 'S02']) {
    const s = by[id + '.glb'].summary;
    assert.equal(s.kind, 'character');
    assert.equal(s.lods.length, 3);
    s.lods.forEach((t, i) => assert.ok(t <= LIMITS.tris[i] * LIMITS.trisSlack && t > LIMITS.tris[i] * 0.8, `${id} LOD${i} ${t}`));
    assert.ok(s.skinJoints <= 65 && s.skinJoints >= 50, String(s.skinJoints));
    assert.ok(s.bytes < LIMITS.bytes, String(s.bytes));
    assert.ok(s.textures.every((t) => t.mime === 'image/webp' && t.w <= 1024), JSON.stringify(s.textures));
    assert.ok(Math.abs(s.meta.height - 1.84) < 0.05 && Math.abs(s.meta.hipsY - 1.0) < 0.01, 'metres after baking Armature 0.01: ' + s.meta.height);
    assert.ok(s.meta.thigh > 0.4 && s.meta.shin > 0.4 && s.meta.seatDrop > 0.05);
    assert.ok(by[id + '.glb'].warnings.some((w) => /0\.01/.test(w)));
  }
  assert.deepEqual(by['S01.glb'].summary.tintSlots, [['skin', 'skin'], ['hair', 'hair'], ['cloth', null]]);
  assert.ok(by['S01.glb'].summary.meta.tintRef.skin && by['S01.glb'].summary.meta.tintRef.hair);
  assert.equal(by['S02.glb'].summary.tintMask, true);
  const a = by['anims.glb'].summary;
  assert.deepEqual(a.clips.map((c) => c.name).sort(), ['idle', 'sit_down', 'sit_idle', 'stand_up', 'walk']);
  assert.ok(Math.abs(a.meta.clips.walk.drift - 1.43) < 0.05, 'In Place off detected');
  assert.ok(a.meta.clips.walk.speed > 0.5 && a.meta.clips.walk.speed < 3, String(a.meta.clips.walk.speed));
  assert.ok(Math.abs(a.meta.restHipsY - 1.0) < 0.01);
  // 정규화된 뼈 이름, 이동 트랙은 Hips 만
  const { NodeIO } = await import('@gltf-transform/core');
  const { getIO } = await import('./lib/gltf_ops.mjs');
  const io = await getIO(); void NodeIO;
  const doc = await io.read(path.join(out, 'anims.glb'));
  for (const an of doc.getRoot().listAnimations()) for (const ch of an.listChannels()) {
    assert.ok(!/mixamorig/.test(ch.getTargetNode().getName()));
    if (ch.getTargetPath() === 'translation') assert.equal(ch.getTargetNode().getName(), 'Hips');
    assert.notEqual(ch.getTargetPath(), 'scale');
  }
  const walk = doc.getRoot().listAnimations().find((x) => x.getName() === 'walk');
  const ht = walk.listChannels().find((c) => c.getTargetPath() === 'translation').getSampler().getOutput();
  const e0 = ht.getElement(0, []), e1 = ht.getElement(ht.getCount() - 1, []);
  assert.ok(Math.abs(e1[2] - e0[2]) < 0.01, 'walk in place');
  const cdoc = await io.read(path.join(out, 'S01.glb'));
  assert.ok(cdoc.getRoot().listExtensionsUsed().some((x) => x.extensionName === 'EXT_meshopt_compression'));
  assert.ok(cdoc.getRoot().listNodes().every((n) => !/mixamorig/.test(n.getName()) && n.getScale().every((k) => Math.abs(k - 1) < 1e-6)));
});

test('cli validate/inspect exit codes; pack writes a <script> data pack that round-trips', () => {
  const out = path.join(tmp, 'out');
  const v = cli('validate', path.join(out, 'S01.glb'), path.join(out, 'anims.glb'));
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, /=> 통과/);
  const bad = cli('character', path.join(tmp, 'pack/S01_standin/S01_standin.glb'), '--id', 'BIG', '-o', path.join(out, 'BIG.glb'), '--lods', '9500,4000,1500');
  assert.equal(bad.code, 1);
  assert.match(bad.out, /LOD0 삼각형 \d+ > 한도 8000/);
  assert.equal(cli('character', 'x.glb', '--id', '../evil').code, 1);
  const p = cli('pack', path.join(out, 'S01.glb'), '--id', 'S01', '--out', path.join(tmp, 'packs'));
  assert.equal(p.code, 0, p.out);
  const js = fs.readFileSync(path.join(tmp, 'packs/apack_S01.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(js, ctx);
  assert.deepEqual(Buffer.from(ctx.window.ChurchAvatarPack.S01, 'base64'), fs.readFileSync(path.join(out, 'S01.glb')));
  assert.equal(cli('pack', path.join(out, 'S01.glb'), '--id', "x';alert(1)//").code, 1);
});

test('bundle policy: no standin/test models or packs inside assets/church', () => {
  const assets = path.resolve(here, '../../assets/church');
  const files = fs.readdirSync(assets);
  assert.ok(!files.some((f) => /\.(glb|gltf|fbx)$/i.test(f) || /^apack_/.test(f)), files.filter((f) => /glb|apack/.test(f)).join());
  const ign = fs.readFileSync(path.join(here, '.gitignore'), 'utf8');
  for (const d of ['out/', 'work/', 'dist/', '*.fbx']) assert.ok(ign.includes(d), d);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
