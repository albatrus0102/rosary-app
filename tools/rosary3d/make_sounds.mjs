// 사용: node tools/rosary3d/make_sounds.mjs — 묵주 화면 효과음(assets/sounds/r_*.wav)을 코드로 합성한다(외부 음원 없음, 각 ≤30KB).
// 묵주알 접촉음(짧은 나무·유리 딸깍), 낮은 단음(주님의 기도), 높이 다른 종 2회(성모송 10번 완료), 은은한 종(다음 신비), 잔잔한 종(5단 완료).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/sounds');
let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
function wav(name, rate, secs, fn) {
  const n = Math.round(rate * secs), buf = Buffer.alloc(44 + n * 2), data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = fn(i / rate);
  let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v));
  const fade = Math.round(rate * 0.04);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const g = i > n - fade ? (n - i) / fade : 1; buf.writeInt16LE(Math.round((data[i] / peak) * 0.82 * g * 32767), 44 + i * 2); }
  fs.writeFileSync(path.join(out, name), buf); console.log(name, (buf.length / 1024).toFixed(1) + 'KB');
}
const bellPartials = [[0.5, 0.35, 1.6], [1, 1, 1.0], [1.183, 0.45, 0.8], [1.506, 0.32, 0.6], [2.0, 0.28, 0.45], [2.514, 0.16, 0.3], [3.011, 0.1, 0.22]];
function bell(t, f0, len) { if (t < 0) return 0; let v = 0; const att = Math.min(1, t / 0.003); for (const [r, a, d] of bellPartials) v += a * Math.sin(2 * Math.PI * f0 * r * t) * Math.exp(-t / (len * d)); return v * att; }
// 묵주알 접촉음: 짧은 잡음 + 감쇠 공명
wav('r_bead.wav', 22050, 0.09, (t) => Math.exp(-t / 0.006) * rnd() * 0.5 + Math.exp(-t / 0.018) * (Math.sin(2 * Math.PI * 2150 * t) * 0.6 + Math.sin(2 * Math.PI * 3420 * t) * 0.35 + Math.sin(2 * Math.PI * 5100 * t) * 0.18));
// 낮은 단음(G3)
wav('r_low.wav', 22050, 0.5, (t) => Math.min(1, t / 0.01) * Math.exp(-t / 0.16) * (Math.sin(2 * Math.PI * 196 * t) + 0.35 * Math.sin(2 * Math.PI * 392 * t) + 0.12 * Math.sin(2 * Math.PI * 588 * t)));
// 높이 다른 종 2회(A5 → E5)
wav('r_bells2.wav', 16000, 0.9, (t) => bell(t, 880, 0.22) * 0.8 + bell(t - 0.26, 659, 0.3));
// 은은한 종(D5)
wav('r_bell_soft.wav', 16000, 0.9, (t) => bell(t, 587, 0.34) * 0.9);
// 잔잔한 종(G4 + 옅은 D5)
wav('r_bell_end.wav', 16000, 0.92, (t) => bell(t, 392, 0.4) + 0.35 * bell(t - 0.02, 587, 0.3));
