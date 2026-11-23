// render_overview.mjs — 기도문 권리자(주교회의·LEV·ICEL 등)에게 보내는 앱 소개 영상(약 90초).
// 사용: node tools/church_web/video/render_overview.mjs <ko|en> [--seg <raw.mp4> --segcaps <captions.json>] [--out 경로] [--scratch 폴더]
//   앱 화면(Flutter)은 헤드리스로 그릴 수 없어서 기존 화면 캡처(slides/*.jpg)를 정지 화면으로 쓴다.
//   --seg: render_video.mjs <성당id> <lang> --raw --scenes boundary,cross,candle,pray 로 만든 3D 조각(제단 경계·성호·초·기도).
//          --segcaps 는 그 옆에 생기는 <id>_<lang>.captions.json(장면별 시각). 없으면 3D 조각은 건너뛴다.
//   ko: 한국어 자막(교구·주교회의용, 『가톨릭 기도서』 계획표 문구) / en: 영어 자막(ICEL 계획표 문구).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const lang = argv.find((a, i) => !a.startsWith('--') && !['--seg', '--segcaps', '--out', '--scratch', '--crf', '--preset'].includes(argv[i - 1])) || 'ko';
const W = 1280, H = 720, FPS = 30;
const scratch = opt('scratch', path.join(process.env.TMPDIR || '/tmp', 'rosarium_video'));
fs.mkdirSync(scratch, { recursive: true });
const outMp4 = opt('out', path.join(scratch, `overview_${lang}.mp4`));

const T = {
  ko: {
    title: '로사리움(Rosarium) — 묵주 기도를 돕는 무료 앱', tag: '광고·유료 기능·후원이 없고, 개인이 만듭니다.',
    end: '단순화한 가상 모형입니다 · 실제 작품은 넣지 않았습니다', endTag: '기도문은 『가톨릭 기도서』 본문 그대로 싣고, 승인이 어려운 부분은 빼겠습니다.',
    slides: [
      ['today', '오늘의 신비를 골라 묵주 기도를 시작합니다.'],
      ['prayer', '『가톨릭 기도서』의 기도문을 글자와 띄어쓰기, 구두점 그대로 실었습니다.'],
      ['short', '「외운 기도 짧게 보기」는 첫 구절만 보이게 한 것입니다. 기도문을 줄여 고친 것이 아닙니다.'],
      ['decade', '신비 20단의 묵상 문구도 기도서 그대로입니다.'],
      ['more', '합성 음성(AI 음성)으로 기도문을 읽는 기능을 준비했습니다. 승인을 받기 전에는 싣지 않습니다.'],
      ['more', '「기도문 출처」에 출처와 저작권 표기를 적습니다. 승인해 주시면 알려 주시는 문구로 바꾸겠습니다.', 'pan'],
      ['churchlist', '이름난 성당을 단순하게 본뜬 가상 모형 안에서도 기도할 수 있습니다. 들어가기 전에 「실제와 다른 점」을 밝힙니다.']
    ],
    seg: ['경건함을 가장 먼저 지킵니다. 아바타는 제단 계단 앞에서 멈추고, 제단에는 올라갈 수 없습니다.', '성수대 앞에서는 성호를 긋습니다. 기도하는 동작만 있고, 놀이나 싸움은 없습니다.', '초를 봉헌할 때 지향은 정해진 기도 문구에서 고릅니다. 글을 직접 쓸 수 없고 대화 기능도 없습니다.', '자리에 앉거나 무릎을 꿇고 묵주 기도를 바칩니다. 미사나 성사를 흉내 내는 기능은 없습니다.'],
    after: [['candle', '지향은 정해진 문구 가운데에서만 고릅니다. 글을 입력하는 칸이 없습니다.'], ['sitting', '앉아서 기도하는 동안 묵주 기도문이 아래에 나타납니다.']]
  },
  en: {
    title: 'Rosarium — a free, non-commercial app for praying the Rosary', tag: 'This video shows the Korean edition.',
    end: 'A simplified virtual model · No actual artworks are included', endTag: 'What we ask: permission to show the texts, and your choice among the options in the letter. Without your answer, your text is not used.',
    slides: [
      ['today', 'The user chooses the mysteries of the day and begins the Rosary.'],
      ['prayer', 'Here the prayer text appears. In the English edition it would be your text, word for word. (Shown: the Hail Mary in Korean, from the Korean bishops’ prayer book.)'],
      ['short', 'The optional “short view” shows only the opening words of prayers the user knows by heart.'],
      ['decade', 'Each mystery is announced by its name. In English, only the name and the Scripture reference would appear.'],
      ['more', 'Voice exists only for Korean. English prayers are text only: no recording, no synthetic voice, no text-to-speech.'],
      ['more', 'The “Prayer sources” page shows the source and the credit line. Yours would appear here exactly as you specify.', 'pan'],
      ['churchlist', 'The app also has simplified virtual models of famous churches. Before entering, it states how the model differs from the real church.']
    ],
    seg: ['Reverence comes first: the avatar stops at the foot of the altar steps. The sanctuary cannot be entered.', 'At the holy water font one makes the sign of the cross. Only prayerful actions: no games, no combat.', 'A candle is lit with an intention chosen from fixed phrases: no free text, no chat.', 'One sits or kneels and prays the Rosary. Nothing imitates the Mass or the sacraments.'],
    after: [['candle', 'Intentions are chosen only from fixed phrases. There is no text field.'], ['sitting', 'While seated, the rosary prayer text appears below.']]
  }
}[lang];
if (!T) { console.error('언어는 ko 또는 en'); process.exit(2); }

const slideDir = path.join(here, 'slides');
const imgB64 = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(slideDir, n + '.jpg')).toString('base64');
const fontB64 = (f) => 'data:font/otf;base64,' + fs.readFileSync(path.join(repo, 'assets/fonts', f)).toString('base64');

// 3D 조각의 프레임을 풀어 둔다(작업 폴더 안, 끝나면 지운다)
let segFrames = [], segDir = null, segCaps = [];
if (opt('seg')) {
  segDir = path.join(scratch, 'overview_segframes'); fs.rmSync(segDir, { recursive: true, force: true }); fs.mkdirSync(segDir, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', opt('seg'), '-vf', `scale=${W}:${H}`, '-q:v', '2', path.join(segDir, '%05d.jpg')]);
  segFrames = fs.readdirSync(segDir).sort();
  if (opt('segcaps')) segCaps = JSON.parse(fs.readFileSync(opt('segcaps'), 'utf8'));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent('<canvas id="c" width="1280" height="720"></canvas>');
const names = [...new Set([...T.slides.map((s) => s[0]), ...T.after.map((s) => s[0])])];
await page.evaluate(async ({ fonts, imgs, W, H }) => {
  for (const [n, w, d] of fonts) { const f = new FontFace(n, `url(${d})`, { weight: w }); await f.load(); document.fonts.add(f); }
  const IM = {};
  for (const [k, d] of Object.entries(imgs)) { const im = new Image(); im.src = d; await im.decode(); IM[k] = im; }
  const g = document.getElementById('c').getContext('2d');
  const out = document.getElementById('c');
  function lines(text, maxW, font) {
    g.font = font; const words = text.split(/(\s+)/), res = []; let cur = '';
    for (const w of words) { const t = cur + w; if (g.measureText(t).width > maxW && cur.trim()) { res.push(cur.trim()); cur = w.trimStart(); } else cur = t; }
    if (cur.trim()) res.push(cur.trim()); return res;
  }
  const bg = () => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b2440'); gr.addColorStop(1, '#1c1830'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  window.__ov = {
    card(c) {
      bg(); g.textAlign = 'center'; g.textBaseline = 'middle'; const a = c.a;
      const fs1 = Math.round(H * 0.056), fs2 = Math.round(H * 0.034);
      const L1 = lines(c.l1, W * 0.78, `600 ${fs1}px Pretendard`), lh1 = Math.round(fs1 * 1.3), L2 = c.l2 ? lines(c.l2, W * 0.7, `500 ${fs2}px Pretendard`) : [], lh2 = Math.round(fs2 * 1.4);
      const total = L1.length * lh1 + (L2.length ? fs2 * 1.2 + L2.length * lh2 : 0); let y = H / 2 - total / 2 + lh1 / 2;
      g.font = `600 ${fs1}px Pretendard`; g.fillStyle = 'rgba(246,236,218,' + a + ')'; L1.forEach((s) => { g.fillText(s, W / 2, y); y += lh1; });
      if (L2.length) { y += fs2 * 0.5; g.fillStyle = 'rgba(200,168,106,' + a + ')'; g.fillRect(W / 2 - 60, y - fs2 * 0.9, 120, 2); y += fs2 * 0.4; g.font = `500 ${fs2}px Pretendard`; g.fillStyle = 'rgba(227,208,175,' + a + ')'; L2.forEach((s) => { g.fillText(s, W / 2, y); y += lh2; }); }
      return out.toDataURL('image/jpeg', 0.92);
    },
    // 앱 화면 + 오른쪽 설명(글). u: 0..1 진행(천천히 확대), a: 투명도. pan: 아래쪽 부분을 보여 준다.
    slide(c) {
      bg(); const im = IM[c.img], a = c.a, u = c.u;
      const ph = H * 0.9, sc = ph / im.height, pw = im.width * sc;
      const cx = W * 0.30, x = cx - pw / 2, y = (H - ph) / 2;
      g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 40; g.shadowOffsetY = 10; rr(x, y, pw, ph, 26); g.fillStyle = '#000'; g.fill(); g.restore();
      g.save(); g.globalAlpha = a; rr(x, y, pw, ph, 26); g.clip();
      const z = 1 + 0.06 * u, sh = c.pan ? (im.height - im.height / z) * u : (im.height - im.height / z) * 0.2;
      g.drawImage(im, 0, sh, im.width, im.height / z, x, y, pw, ph); g.restore();
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      const fs = Math.round(H * 0.047), lh = Math.round(fs * 1.45), L = lines(c.text, W * 0.46, `500 ${fs}px Pretendard`);
      const ty = H / 2 - (L.length * lh) / 2 + fs * 0.9, tx = W * 0.52;
      g.fillStyle = 'rgba(200,168,106,' + a + ')'; g.fillRect(tx, ty - fs * 1.5, 56, 3);
      g.font = `500 ${fs}px Pretendard`; g.fillStyle = 'rgba(246,236,218,' + a + ')'; L.forEach((s, i) => g.fillText(s, tx, ty + i * lh));
      return out.toDataURL('image/jpeg', 0.92);
    },
    // 3D 조각 프레임 위에 아래 자막
    seg(c) {
      g.drawImage(c.frame, 0, 0, W, H);
      if (c.text && c.a > 0) {
        const fs = Math.round(H * 0.039), font = `500 ${fs}px Pretendard`, L = lines(c.text, W * 0.82, font), lh = Math.round(fs * 1.38), y0 = H - Math.round(H * 0.06) - (L.length - 1) * lh;
        const gr = g.createLinearGradient(0, H - lh * (L.length + 2.2), 0, H); gr.addColorStop(0, 'rgba(10,8,18,0)'); gr.addColorStop(1, 'rgba(10,8,18,' + 0.62 * c.a + ')'); g.fillStyle = gr; g.fillRect(0, H - lh * (L.length + 2.2), W, lh * (L.length + 2.2));
        g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        L.forEach((s, i) => { g.shadowColor = 'rgba(0,0,0,' + 0.85 * c.a + ')'; g.shadowBlur = fs * 0.25; g.shadowOffsetY = 2; g.fillStyle = 'rgba(250,244,232,' + c.a + ')'; g.fillText(s, W / 2, y0 + i * lh); });
        g.shadowColor = 'transparent'; g.shadowBlur = 0;
      }
      return out.toDataURL('image/jpeg', 0.92);
    },
    async segFrame(b64) { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); return im; }
  };
}, { fonts: [['Pretendard', 500, fontB64('Pretendard-Medium.otf')], ['Pretendard', 600, fontB64('Pretendard-SemiBold.otf')]], imgs: Object.fromEntries(names.map((n) => [n, imgB64(n)])), W, H });

const vidTmp = path.join(scratch, `overview_${lang}.video.mp4`);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', opt('preset', 'slow'), '-crf', opt('crf', '23'), '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', vidTmp], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((r) => ff.on('close', r));
let frames = 0;
const push = (url) => { ff.stdin.write(Buffer.from(url.split(',')[1], 'base64')); frames++; };
const sec = (s) => Math.round(s * FPS);
const fade = (i, n) => Math.max(0, Math.min(1, i / 9, (n - i) / 9));
async function card(l1, l2, s) { const n = sec(s); for (let i = 0; i < n; i++) push(await page.evaluate((c) => window.__ov.card(c), { l1, l2, a: fade(i, n) })); }
async function slide(img, text, pan, s = 6.2) { const n = sec(s); for (let i = 0; i < n; i++) push(await page.evaluate((c) => window.__ov.slide(c), { img, text, pan: !!pan, u: i / n, a: fade(i, n) })); }

await card(T.title, T.tag, 4.5);
for (const [img, text, pan] of T.slides) await slide(img, text, pan, Math.max(5.2, Math.min(7.5, text.length / (lang === 'ko' ? 7.5 : 15))));
if (segFrames.length) {
  const caps = segCaps.length ? segCaps : [];
  for (let i = 0; i < segFrames.length; i++) {
    const t = i / FPS; let text = '', a = 0;
    caps.forEach((c, k) => { if (t >= c.start && t < c.end) { text = T.seg[k] || ''; a = Math.max(0, Math.min(1, (t - c.start) * FPS / 9, (c.end - t) * FPS / 9)); } });
    const b64 = fs.readFileSync(path.join(segDir, segFrames[i])).toString('base64');
    push(await page.evaluate(async (c) => { const fr = await window.__ov.segFrame(c.b64); return window.__ov.seg({ frame: fr, text: c.text, a: c.a }); }, { b64, text, a }));
  }
  fs.rmSync(segDir, { recursive: true, force: true });
}
for (const [img, text] of T.after) await slide(img, text, false, Math.max(5.2, Math.min(7, text.length / (lang === 'ko' ? 7.5 : 15))));
await card(T.end, T.endTag, 5);
ff.stdin.end(); await ffDone; await browser.close();
const dur = frames / FPS;
const organ = path.join(repo, 'assets/music/organ_salve_regina.m4a');
if (!argv.includes('--no-audio') && fs.existsSync(organ)) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vidTmp, '-stream_loop', '-1', '-i', organ, '-t', String(dur), '-map', '0:v', '-map', '1:a', '-af', `volume=0.16,afade=t=in:st=0:d=3,afade=t=out:st=${(dur - 3.5).toFixed(2)}:d=3.5`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-shortest', '-movflags', '+faststart', outMp4]);
  fs.unlinkSync(vidTmp);
} else fs.renameSync(vidTmp, outMp4);
const sheet = outMp4.replace(/\.mp4$/, '_sheet.jpg');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', outMp4, '-vf', `fps=12/${dur.toFixed(2)},scale=426:240,tile=4x3:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', sheet]);
console.log(`영상 ${dur.toFixed(1)}s`, outMp4, (fs.statSync(outMp4).size / 1048576).toFixed(1) + 'MB', '접촉표', sheet);
