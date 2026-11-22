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

// 발소리 표본 하나의 소리 결(「터덜」 진단, WALK_GAIT.md §6): 200 Hz 아래 에너지 몫, 스펙트럼 무게중심(Hz), 소리 길이, 최고점에서 -20/-40 dB 로 줄기까지(ms, 5ms RMS 포락선)
function fftMag2(x) {   // 실수 신호 → |X|² (길이는 2의 거듭제곱으로 0 채움)
  let n = 1; while (n < x.length) n <<= 1;
  const re = new Float64Array(n), im = new Float64Array(n); re.set(x);
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
  const m = new Float64Array(n / 2); for (let i = 0; i < n / 2; i++) m[i] = re[i] * re[i] + im[i] * im[i];
  return { m, df: 1 };
}
export function stepTimbre(d, rate) {
  const { m } = fftMag2(d), n = m.length * 2, df = rate / n;
  let tot = 0, low = 0, cen = 0, aw = 0;
  // A 가중(IEC 61672): 귀가 실제로 느끼는 크기 — 같은 최고값이라도 1~4 kHz 소리가 100~300 Hz 소리보다 크게 들린다
  const Aw = (f) => { const f2 = f * f, r = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2)); return r * r * 1.2589 ** 2; };
  for (let i = 1; i < m.length; i++) { tot += m[i]; cen += m[i] * i * df; aw += m[i] * Aw(i * df); if (i * df < 200) low += m[i]; }
  const w = Math.max(1, Math.round(rate * 0.005)), env = [];
  for (let i = 0; i + w <= d.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += d[j] * d[j]; env.push(Math.sqrt(s / w)); }
  let pk = 0; for (let i = 1; i < env.length; i++) if (env[i] > env[pk]) pk = i;
  // decay20_ms: 최고점(뒤꿈치)에서 처음으로 -20 dB 아래로 떨어지기까지(울림 길이), tail40_ms: 최고점부터 마지막으로 -40 dB 위에 있던 때까지(앞꿈치·끌림까지 들리는 길이)
  const thr = (db) => env[pk] * Math.pow(10, -db / 20);
  let first = env.length; for (let i = pk; i < env.length; i++) if (env[i] < thr(20)) { first = i; break; }
  let last = pk; for (let i = pk; i < env.length; i++) if (env[i] >= thr(40)) last = i;
  // aExpDb: 최고값 1(0 dBFS)일 때 A 가중 소리 에너지(dB, Σ x_A² / 표본율 — 짧은 소리끼리 크기 비교). 파스발: Σ|X|²·2 / N = Σ x²
  return { aExpDb: 10 * Math.log10(Math.max(1e-12, aw * 2 / n / rate)), lowFrac: low / tot, centroidHz: cen / tot, len_ms: d.length / rate * 1000, decay20_ms: (first - pk) * w / rate * 1000, tail40_ms: (last - pk + 1) * w / rate * 1000 };
}
export function stepTimbres(A, rate = 44100) { return A.synthSteps(rate, 4).map((d) => stepTimbre(d, rate)); }

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
