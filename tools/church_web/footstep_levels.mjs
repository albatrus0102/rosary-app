// 발소리 크기 대 음악 크기(dBFS): node tools/church_web/footstep_levels.mjs [--json out.json]
// ① 앱 성가 4곡(assets/music/*.m4a, ffmpeg 로 풀어) 평균 RMS·조용한 구간(0.4초 RMS 의 하위 10%)
// ② 성당 오르간 패드(assets/church/audio.js)를 Chromium OfflineAudioContext 로 20초 그려 화음 유지 구간 RMS
// ③ 발소리 표본(audio.js synthSteps) 최고값·RMS 와 stepGain 이 정한 실제 크기(음량 설정별)
// 결과로 audio.js LEVELS(CHANT_RMS_DB, ORGAN_RMS_DB)를 맞춘다. 해석: docs/church/WALK_GAIT.md
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../../assets');
const dB = (x) => 20 * Math.log10(Math.max(x, 1e-9));

function rmsStats(f32, rate) {
  let s = 0, pk = 0; for (const x of f32) { s += x * x; pk = Math.max(pk, Math.abs(x)); }
  const win = Math.floor(rate * 0.4), wins = [];
  for (let i = 0; i + win <= f32.length; i += win) { let a = 0; for (let j = i; j < i + win; j++) a += f32[j] * f32[j]; const r = Math.sqrt(a / win); if (r > 1e-4) wins.push(r); }
  wins.sort((a, b) => a - b);
  return { rmsDb: dB(Math.sqrt(s / f32.length)), peakDb: dB(pk), quiet10Db: dB(wins[Math.floor(wins.length * 0.1)] || 0) };
}

export function chantLevels() {
  const dir = path.join(assets, 'music');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.m4a')).sort().map((f) => {
    const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.join(dir, f), '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    const a = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
    return { file: f, ...rmsStats(a, 22050) };
  });
}

export async function organLevel() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.evaluate(() => { const SR = 44100; window.AudioContext = function () { const c = new OfflineAudioContext(2, SR * 20, SR); window.__off = c; return c; }; });
  await page.addScriptTag({ path: path.join(assets, 'church/audio.js') });
  const res = await page.evaluate(async () => {
    const A = window.ChurchAudio; A.setAmbient(true);
    const buf = await window.__off.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1), SR = buf.sampleRate, out = {};
    const seg = (t0, t1) => { let s = 0, pk = 0, n = 0; for (let i = Math.floor(t0 * SR); i < Math.floor(t1 * SR); i++) { const m = (L[i] + R[i]) / 2; s += m * m; pk = Math.max(pk, Math.abs(m)); n++; } return { rms: Math.sqrt(s / n), pk }; };
    out.hold = seg(6, 12); out.all = seg(3, 20);
    // 옛 발소리(고치기 전 audio.js footstep: 50ms 감쇠 노이즈 → 대역 통과 700/900Hz Q0.8 → 0.11 → 오르간 master 0.16)를 같은 식으로 그려 잰다
    const c2 = new OfflineAudioContext(1, SR, SR), nb = c2.createBuffer(1, Math.floor(SR * 0.05), SR), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 3);
    const s2 = c2.createBufferSource(); s2.buffer = nb; const f2 = c2.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 0.8;
    const g2 = c2.createGain(); g2.gain.value = 0.11 * 0.16; s2.connect(f2); f2.connect(g2); g2.connect(c2.destination); s2.start();
    const b2 = (await c2.startRendering()).getChannelData(0); let pk2 = 0, e2 = 0; for (let i = 0; i < SR * 0.06; i++) { pk2 = Math.max(pk2, Math.abs(b2[i])); e2 += b2[i] * b2[i]; }
    out.oldStep = { pk: pk2, rms: Math.sqrt(e2 / (SR * 0.06)) };
    return out;
  });
  await browser.close();
  return { holdRmsDb: dB(res.hold.rms), holdPeakDb: dB(res.hold.pk), avgRmsDb: dB(res.all.rms), oldStepPeakDb: dB(res.oldStep.pk), oldStepRmsDb: dB(res.oldStep.rms) };
}

export function loadAudio() {
  const ctx = { addEventListener() {} }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(assets, 'church/audio.js'), 'utf8'), ctx);
  return ctx.ChurchAudio;
}
export function stepLevels(A) {
  return A.synthSteps(44100, 4).map((d) => { const s = rmsStats(d, 44100); let e = 0; for (const x of d) e += x * x; return { len_ms: Math.round(d.length / 44.1), peakDb: s.peakDb, rmsDb: dB(Math.sqrt(e / d.length)) }; });
}

if (process.argv[1] && process.argv[1].endsWith('footstep_levels.mjs')) {
  const ji = process.argv.indexOf('--json');
  const A = loadAudio();
  const chant = chantLevels();
  const organ = await organLevel();
  const steps = stepLevels(A);
  const table = [];
  for (const vol of [0.05, 0.1, 0.3, 0.6, 1.0]) {
    const chantRef = Math.min(...chant.map((c) => c.rmsDb)) + dB(vol);
    const gc = dB(A.stepGain({ chant: true, vol })), go = dB(A.stepGain({ organ: true, vol }));
    table.push({ vol, chantRmsDb: +chantRef.toFixed(1), stepPeakWithChantDb: +gc.toFixed(1), belowChant: +(chantRef - gc).toFixed(1), organRmsDb: +organ.holdRmsDb.toFixed(1), stepPeakWithOrganDb: +go.toFixed(1), belowOrgan: +(organ.holdRmsDb - go).toFixed(1) });
  }
  const res = { chant, organ, steps, table, LEVELS: A.LEVELS };
  console.log(JSON.stringify(res, (k, v) => (typeof v === 'number' ? +v.toFixed(2) : v), 1));
  if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(res, null, 1));
}
