// render_video.mjs — 허락 요청 편지에 붙일 짧은 소개 영상(MP4)을 '오프라인 · 결정적'으로 만든다.
// 사용: node tools/church_web/video/render_video.mjs <성당id> <언어: ko|it|en|es|pt> [옵션]
//   옵션: --out <mp4 경로>  --scratch <작업 폴더>  --clip <초>(3D 장면을 이만큼에서 자르고 마침 카드로 — 시험용)
//         --size 1280x720  --quality high|mid|low  --no-audio  --plan <video_plan.md 경로>
// 원리: 앱(assets/church/test.html)을 헤드리스 Chromium(SwiftShader)에 띄우고 requestAnimationFrame 을 가짜로 바꿔,
//   프레임마다 고리를 1/30초(고정)씩 직접 한 번 돌린다(실시간이 아니다 — 프레임당 1~2초). 그림은 같은 JS 작업 안에서 2D 캔버스에
//   자막·카드와 합쳐 JPEG 로 뽑아 ffmpeg 표준 입력(image2pipe)에 바로 흘려보낸다 — 디스크에 프레임 폴더를 만들지 않는다.
//   걷기·초 켜기·앉기는 앱의 진짜 API(walkTo·lightCandle·sit·setRosary …)를 부르므로 배포판과 같은 동작이다.
//   자막은 docs/legal/church_permission/package/<id>/video_plan.md 표에서 읽는다(없으면 공통 문구).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const assets = path.join(repo, 'assets/church');

const argv = process.argv.slice(2);
const pos = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--') || (!a.startsWith('--') && ['--no-audio'].includes(argv[i - 1])));
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const id = pos[0], lang = pos[1] || 'ko';
if (!id) { console.error('사용: render_video.mjs <성당id> <ko|it|en|es|pt> [--clip 초] [--out 경로]'); process.exit(2); }
const [W, H] = opt('size', '1280x720').split('x').map(Number);
const FPS = 30, CLIP = +opt('clip', 0);
const scratch = opt('scratch', path.join(process.env.TMPDIR || '/tmp', 'rosarium_video'));
fs.mkdirSync(scratch, { recursive: true });
const outMp4 = opt('out', path.join(scratch, `${id}_${lang}.mp4`));

// ---------------------------------------------------------------- 문구
const NAMES = {
  stpeter: { it: 'Basilica di San Pietro', en: "St. Peter's Basilica", ko: '성 베드로 대성전' },
  lateran: { it: 'Basilica di San Giovanni in Laterano', en: 'Basilica of St. John Lateran', ko: '라테라노 성 요한 대성전' },
  maggiore: { it: 'Basilica di Santa Maria Maggiore', en: 'Basilica of St. Mary Major', ko: '성 마리아 마조레 대성전' },
  stpaul: { it: 'Basilica di San Paolo fuori le Mura', en: 'Basilica of St. Paul Outside the Walls', ko: '성 밖의 성 바오로 대성전' },
  assisi: { it: "Basilica di San Francesco d'Assisi", en: 'Basilica of St. Francis of Assisi', ko: '아시시 성 프란치스코 대성당' },
  milan: { it: 'Duomo di Milano', en: 'Milan Cathedral', ko: '밀라노 대성당' },
  florence: { it: 'Cattedrale di Santa Maria del Fiore', en: 'Florence Cathedral', ko: '피렌체 대성당' },
  myeongdong: { ko: '명동대성당', en: 'Myeongdong Cathedral', it: 'Cattedrale di Myeongdong' },
  danggogae: { ko: '당고개 순교성지', en: 'Danggogae Martyrs Shrine', it: 'Santuario dei Martiri di Danggogae' },
  yeouido: { ko: '여의도동성당', en: 'Yeouido-dong Church', it: 'Chiesa di Yeouido-dong' },
  basic: { ko: '기본 성당', en: 'Basic church', it: 'Chiesa semplice' }
};
const STR = {
  ko: { title: (n) => `로사리움(Rosarium) — ${n} (단순화한 가상 모형)`, tag: '광고도 결제도 없는 무료 묵주 기도 앱', end: '단순화한 가상 모형입니다 · 실제 작품은 넣지 않았습니다' },
  it: { title: (n) => `Rosarium — ${n} (modello virtuale semplificato)`, tag: 'App di preghiera del Rosario, gratuita e non commerciale', end: 'Modello virtuale semplificato · Nessuna opera reale è stata inserita' },
  en: { title: (n) => `Rosarium — ${n} (simplified virtual model)`, tag: 'A free, non-commercial rosary prayer app', end: 'A simplified virtual model · No actual artworks are included' },
  es: { title: (n) => `Rosarium — ${n} (modelo virtual simplificado)`, tag: 'Aplicación gratuita y sin fines comerciales para rezar el Rosario', end: 'Modelo virtual simplificado · No se incluyen obras reales' },
  pt: { title: (n) => `Rosarium — ${n} (modelo virtual simplificado)`, tag: 'Aplicativo gratuito e sem fins comerciais para rezar o Rosário', end: 'Modelo virtual simplificado · Nenhuma obra real foi incluída' }
}[lang];
if (!STR) { console.error('알 수 없는 언어', lang); process.exit(2); }
const nm = (NAMES[id] || {})[lang] || (NAMES[id] || {}).en || id;

// 공통(계획표가 없을 때) 자막 — 마지막 4개가 경건함 장면
const COMMON = {
  ko: ['성당에 들어서면 먼저 「실제와 다른 단순한 가상 모형」이라는 안내가 나옵니다.', '신랑을 따라 제대 쪽으로 천천히 걷습니다. 크기와 모양은 단순하게 줄인 것입니다.', '벽과 창은 단순한 모양과 색으로만 표현했습니다.', '실제 작품의 사진이나 그림은 넣지 않았습니다.', '앱이 쓴 기둥·천장도 단순한 형태입니다.', '둘러보는 시점은 손가락으로 돌릴 수 있습니다.', '여기까지가 둘러보기입니다.',
    '존중이 먼저입니다: 아바타는 제단 계단 앞에서 멈추고, 그 안으로는 들어가지 못합니다.', '성호경 동작만 합니다. 놀이나 대결은 없습니다.', '정해진 지향 문구 가운데 하나를 골라 초를 봉헌합니다. 글을 입력하는 칸도, 대화도 없습니다.', '자리에 앉거나 무릎 꿇고 묵주 기도를 바칩니다. 미사나 성사를 흉내 내는 기능은 없습니다.'],
  it: ['Prima di entrare, l’app avvisa che si tratta di un modello semplificato, diverso dalla chiesa reale.', 'Si cammina lentamente lungo la navata verso l’altare. Le proporzioni sono semplificate.', 'Pareti e finestre sono forme e colori semplici.', 'Non sono state inserite fotografie o immagini di opere reali.', 'Colonne e volte sono forme semplici.', 'La visuale si può girare con il dito.', 'Fin qui, la visita.',
    'La riverenza viene prima di tutto: l’avatar si ferma ai piedi dei gradini. Nel presbiterio non si entra.', 'Si fa il segno della croce. Solo gesti di preghiera: niente giochi, niente combattimenti.', 'Si accende una candela scegliendo l’intenzione fra frasi già fissate: nessun testo libero, nessuna chat.', 'Ci si siede o ci si inginocchia e si prega il Rosario. Nessuna funzione imita la Messa o i Sacramenti.'],
  en: ['Before entering, the app says this is a simplified model, not the real church.', 'We walk slowly up the nave toward the altar. Proportions are simplified.', 'Walls and windows are plain shapes and colours.', 'No photographs or images of real artworks are included.', 'Columns and vaults are simple forms.', 'The view can be turned with a finger.', 'That is the tour.',
    'Reverence comes first: the avatar stops at the foot of the altar steps and cannot go further.', 'Only the sign of the cross. No games, no fighting.', 'A candle is offered by choosing from fixed intentions: no free text, no chat.', 'One sits or kneels and prays the Rosary. Nothing imitates the Mass or the Sacraments.'],
  es: ['Antes de entrar, la aplicación avisa de que es un modelo simplificado, distinto de la iglesia real.', 'Caminamos despacio por la nave hacia el altar. Las proporciones están simplificadas.', 'Muros y ventanas son formas y colores sencillos.', 'No se incluyen fotografías ni imágenes de obras reales.', 'Columnas y bóvedas son formas simples.', 'La vista se puede girar con el dedo.', 'Hasta aquí, el recorrido.',
    'La reverencia es lo primero: el avatar se detiene al pie de las gradas del altar y no puede avanzar.', 'Solo el gesto de la señal de la cruz. Sin juegos ni peleas.', 'Se enciende una vela eligiendo entre intenciones ya fijadas: sin texto libre ni chat.', 'Uno se sienta o se arrodilla y reza el Rosario. Nada imita la Misa ni los Sacramentos.'],
  pt: ['Antes de entrar, o aplicativo avisa que é um modelo simplificado, diferente da igreja real.', 'Caminhamos devagar pela nave em direção ao altar. As proporções são simplificadas.', 'Paredes e janelas são formas e cores simples.', 'Não há fotografias nem imagens de obras reais.', 'Colunas e abóbadas são formas simples.', 'A vista pode ser girada com o dedo.', 'Até aqui, o passeio.',
    'A reverência vem primeiro: o avatar para ao pé dos degraus do altar e não pode avançar.', 'Apenas o gesto do sinal da cruz. Sem jogos nem lutas.', 'Acende-se uma vela escolhendo entre intenções já fixadas: sem texto livre nem chat.', 'Senta-se ou ajoelha-se e reza-se o Rosário. Nada imita a Missa nem os Sacramentos.']
}[lang];

// 계획표(video_plan.md)에서 장면 자막 읽기: 표 행 2..12 → 투어 7개 + 경건함 4개(제단 경계·성호·초·기도). 1행(제목)·13행(마침)은 카드가 대신한다.
function readCaptions() {
  const pf = opt('plan', path.join(repo, 'docs/legal/church_permission/package', id, 'video_plan.md'));
  if (fs.existsSync(pf)) {
    const rows = fs.readFileSync(pf, 'utf8').split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
    if (rows.length === 13) return rows.slice(1, 12).map((r) => r[3]);
  }
  return COMMON;
}
const CAPS = readCaptions();

// ---------------------------------------------------------------- 브라우저
const fontB64 = (f) => 'data:font/otf;base64,' + fs.readFileSync(path.join(repo, 'assets/fonts', f)).toString('base64');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { window.__raf = null; window.requestAnimationFrame = (cb) => { window.__raf = cb; return 1; }; });
await page.goto(`file://${assets}/test.html?church=${id}&hideui=1&autotier=0&quality=${opt('quality', 'high')}&pace=0&markers=0&idle=0`);
await page.waitForFunction(() => window.__church && window.__church.world && window.__church.started, null, { timeout: 600000, polling: 500 });

await page.evaluate(async ({ fonts, W, H }) => {
  for (const [n, w, d] of fonts) { const f = new FontFace(n, `url(${d})`, { weight: w }); await f.load(); document.fonts.add(f); }
  const A = window.__church, PI = Math.PI;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const g = out.getContext('2d');
  const wrap = (a) => { a = (a + PI) % (PI * 2); if (a < 0) a += PI * 2; return a - PI; };
  const V = window.__vid = { n: 0, tw: null, hold: false, rel: 0, spin: 0 };
  const ease = (t) => t * t * (3 - 2 * t);
  function lines(text, maxW, font) {
    g.font = font; const words = text.split(/(\s+)/), res = []; let cur = '';
    for (const w of words) { const t = cur + w; if (g.measureText(t).width > maxW && cur.trim()) { res.push(cur.trim()); cur = w.trimStart(); } else cur = t; }
    if (cur.trim()) res.push(cur.trim());
    return res;
  }
  function caption(text, a) {
    if (!text || a <= 0) return;
    const fs = Math.round(H * 0.039), font = `500 ${fs}px Pretendard`, L = lines(text, W * 0.82, font), lh = Math.round(fs * 1.38);
    const y0 = H - Math.round(H * 0.06) - (L.length - 1) * lh;
    const grad = g.createLinearGradient(0, H - lh * (L.length + 2.2), 0, H);
    grad.addColorStop(0, 'rgba(10,8,18,0)'); grad.addColorStop(1, 'rgba(10,8,18,' + (0.62 * a) + ')');
    g.fillStyle = grad; g.fillRect(0, H - lh * (L.length + 2.2), W, lh * (L.length + 2.2));
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    L.forEach((s, i) => {
      g.shadowColor = 'rgba(0,0,0,' + (0.85 * a) + ')'; g.shadowBlur = fs * 0.25; g.shadowOffsetY = 2;
      g.fillStyle = 'rgba(250,244,232,' + a + ')'; g.fillText(s, W / 2, y0 + i * lh);
    });
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }
  function card(c) {
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#2b2440'); grad.addColorStop(1, '#1c1830');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const a = c.a === undefined ? 1 : c.a;
    const fs1 = Math.round(H * 0.058), fs2 = Math.round(H * 0.036);
    const L1 = lines(c.l1, W * 0.78, `600 ${fs1}px Pretendard`), lh1 = Math.round(fs1 * 1.3);
    const L2 = c.l2 ? lines(c.l2, W * 0.7, `500 ${fs2}px Pretendard`) : [], lh2 = Math.round(fs2 * 1.4);
    const total = L1.length * lh1 + (L2.length ? fs2 * 1.2 + L2.length * lh2 : 0);
    let y = H / 2 - total / 2 + lh1 / 2;
    g.font = `600 ${fs1}px Pretendard`; g.fillStyle = 'rgba(246,236,218,' + a + ')';
    L1.forEach((s) => { g.fillText(s, W / 2, y); y += lh1; });
    if (L2.length) {
      y += fs2 * 0.5; g.fillStyle = 'rgba(200,168,106,' + a + ')'; g.fillRect(W / 2 - 60, y - fs2 * 0.9, 120, 2); y += fs2 * 0.4;
      g.font = `500 ${fs2}px Pretendard`; g.fillStyle = 'rgba(227,208,175,' + a + ')';
      L2.forEach((s) => { g.fillText(s, W / 2, y); y += lh2; });
    }
  }
  // 한 프레임: 가짜 rAF 고리를 한 번 돌리고(그리기), 합성해 JPEG 데이터 URL 을 돌려준다.
  V.step = (c) => {
    const t = 5000 + (V.n++) * 1000 / 30, me = A.me, ctl = A.ctl;
    if (c.cardOnly) { card(c.card); return { url: out.toDataURL('image/jpeg', 0.92) }; }
    if (c.camTo) { const k = c.camTo; V.tw = { f: 0, n: Math.max(1, k.frames | 0), from: { yaw: ctl.yaw, pitch: ctl.pitch, zoom: ctl.zoom, look: ctl.look }, to: k }; if (k.hold !== undefined) V.hold = !!k.hold; if (k.rel !== undefined) V.rel = k.rel; if (k.spin !== undefined) V.spin = k.spin; }
    if (c.release) { V.hold = false; V.tw = null; }
    if (c.pad) A.ctl.setJoystick(c.pad[0], c.pad[1]);
    if (c.do) { try { new Function('A', 'api', c.do)(A, A.api); } catch (e) { window.__vidErr = String(e); } }
    // 카메라: 끌기처럼 시점을 직접 쥔다(앱의 자동 따라가기가 빼앗지 않게 lastDragT 를 갱신). 놓으면 앱의 따라가기가 다시 이어받는다.
    if (V.hold || V.tw) {
      ctl.lastDragT = A.t;
      let target = V.rel + (V.spinAcc = (V.spinAcc || 0) + V.spin);
      const wantYaw = me.yaw + target;
      if (V.tw) {
        const w = V.tw, u = ease(Math.min(1, ++w.f / w.n)), to = w.to;
        ctl.yaw = w.from.yaw + wrap(wantYaw - w.from.yaw) * u;
        if (to.pitch !== undefined) ctl.pitch = w.from.pitch + (to.pitch - w.from.pitch) * u;
        if (to.zoom !== undefined) ctl.zoom = w.from.zoom + (to.zoom - w.from.zoom) * u;
        if (to.look !== undefined) ctl.look = w.from.look + (to.look - w.from.look) * u;
        if (w.f >= w.n) V.tw = null;
      } else ctl.yaw = wantYaw;
    }
    const cb = window.__raf; window.__raf = null;
    if (!c.skip && cb) cb(t);
    g.drawImage(A.renderer.domElement, 0, 0, W, H);
    if (c.cap) caption(c.cap.text, c.cap.a);
    if (c.black > 0) { g.fillStyle = 'rgba(28,24,48,' + Math.min(1, c.black) + ')'; g.fillRect(0, 0, W, H); }
    const L = A.logic;
    return { url: out.toDataURL('image/jpeg', 0.92), st: { mode: me.mode, walking: !!A.walkSt, x: me.x, z: me.z, yaw: me.yaw, nearCandle: A.near.candle, aoPending: !!(A.world.aoPending && A.world.aoPending()), spd: me.speed, kneel: A.meAv.kneelAmt, err: A.frameErrN || 0, vErr: window.__vidErr || null } };
  };
}, { fonts: [['Pretendard', 500, fontB64('Pretendard-Medium.otf')], ['Pretendard', 600, fontB64('Pretendard-SemiBold.otf')]], W, H });

// ---------------------------------------------------------------- ffmpeg 입력
const vidTmp = path.join(scratch, `${id}_${lang}.video.mp4`);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', vidTmp], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res) => ff.on('close', res));
let frames = 0; const caps = []; let curCap = null, capStart = 0;
const t0 = Date.now();

async function frame(c = {}) {
  if (curCap && !c.cardOnly) {
    const f = frames - capStart, left = curCap.n - f;
    c.cap = { text: curCap.text, a: Math.max(0, Math.min(1, f / 9, left / 9)) };
    if (f >= curCap.n) curCap = null;
  }
  const r = await page.evaluate((cc) => window.__vid.step(cc), c);
  ff.stdin.write(Buffer.from(r.url.split(',')[1], 'base64'));
  frames++;
  if (frames % 150 === 0) console.log(`  ${(frames / FPS).toFixed(0)}s 분량 · 경과 ${((Date.now() - t0) / 1000).toFixed(0)}s · ${JSON.stringify(r.st || {})}`);
  return r.st;
}
const sec = (s) => Math.round(s * FPS);
function say(text, seconds) { curCap = { text, n: sec(seconds) }; capStart = frames; caps.push({ start: frames / FPS, end: frames / FPS + seconds, text }); }
async function hold(seconds, c = {}) { const n = sec(seconds); let st; for (let i = 0; i < n; i++) st = await frame(i === 0 ? c : {}); return st; }
// 조건이 참이 될 때까지(최대 seconds) 프레임을 낸다. 참이 된 상태를 돌려준다.
async function until(pred, seconds, c = {}) { const n = sec(seconds); let st; for (let i = 0; i < n; i++) { st = await frame(i === 0 ? c : {}); if (i > 2 && pred(st)) return { st, i }; } return { st, i: n, timeout: true }; }
const clipLeft = () => !CLIP || frames / FPS < CLIP + 3.2;

// ---------------------------------------------------------------- 워밍업(셰이더·AO 준비: 실제 시간이 필요한 구간은 영상에 넣지 않는다)
{
  let ok = false;
  for (let i = 0; i < 400 && !ok; i++) { const r = await page.evaluate(() => window.__vid.step({ skip: false })); ok = i > 8 && !r.st.aoPending; if (!ok) await new Promise((rs) => setTimeout(rs, 100)); }
  for (let i = 0; i < 20; i++) await page.evaluate(() => window.__vid.step({}));
}
const api = (js) => ({ do: js });

// ---------------------------------------------------------------- 시나리오
// 1) 제목 카드
{ const n = sec(4.5); for (let i = 0; i < n; i++) await frame({ cardOnly: true, card: { l1: STR.title(nm), l2: STR.tag, a: Math.min(1, i / 12, (n - i) / 12) } }); }
// 2) 입구: 둘러보기
await frame({ camTo: { frames: 1, rel: 0, pitch: 0.32, zoom: 1.0, hold: true } });
let fade = 1;
say(CAPS[0], 5.5);
for (let i = 0; i < sec(0.6); i++) await frame({ black: 1 - i / sec(0.6) });
await frame({ camTo: { frames: sec(5), rel: Math.PI * 0.55, pitch: 0.28, zoom: 1.05, hold: true } });
await hold(2.2);
await frame({ camTo: { frames: sec(3), rel: -Math.PI * 0.45, pitch: 0.3, zoom: 1.05, hold: true } });
await hold(2.0);
// 3) 걷기(제대 쪽) — 앱의 진짜 걷기. 카메라는 뒤에서 느리게 따라간다(놓으면 앱의 따라가기).
await frame({ camTo: { frames: sec(2.5), rel: 0, pitch: 0.4, zoom: 1.0, hold: false }, release: false, ...api(`api.walkTo({kind:'altar'})`) });
await frame({ release: true });
let tourIdx = 1;
const tourCaps = CAPS.slice(1, 7);
let walkSec = 0;
for (const tc of tourCaps) {
  if (!clipLeft()) break;
  say(tc, 6);
  // 매 자막마다 시점을 조금씩 바꾼다: 뒤 · 올려다보기 · 옆 · 뒤
  const v = [{ rel: 0.5, pitch: 0.35, look: 0 }, { rel: 0, pitch: 0.55, look: 0.5 }, { rel: -0.6, pitch: 0.3, look: 0 }, { rel: 0, pitch: 0.4, look: 0 }, { rel: 0.4, pitch: 0.38, look: 0 }, { rel: 0, pitch: 0.4, look: 0 }][tourIdx - 1] || { rel: 0, pitch: 0.4, look: 0 };
  tourIdx++;
  await frame({ camTo: { frames: sec(2), hold: true, zoom: 1.0, ...v } });
  const r = await until((st) => !st.walking, 6);
  walkSec += 6;
  if (!(await page.evaluate(() => !!window.__church.walkSt))) break;
}
await frame({ release: true });
// 4) 제단 경계: 도착하면 더 가려고 해도 서 있는 모습
if (clipLeft()) {
  await until((st) => !st.walking, 60, { release: true });
  say(CAPS[7], 8);
  await hold(1.2);
  await frame({ pad: [0, 1], camTo: { frames: sec(1.5), rel: Math.PI * 0.2, pitch: 0.3, zoom: 0.9, hold: true } });   // 앞으로 밀기(제단 쪽)
  await hold(3.2);
  await frame({ pad: [0, 0] });
  await hold(1.6);
  await frame({ release: true });
}
// 5) 성호 긋기(성수대가 있으면 그 앞에서)
if (clipLeft()) {
  const hasFont = await page.evaluate(() => (window.__church.stations.stations().font || []).length > 0);
  say(CAPS[8], 7.5);
  if (hasFont) { await frame({ ...api(`api.walkTo({kind:'font',index:0})`), camTo: { frames: sec(2), rel: 0.3, pitch: 0.4, zoom: 1.0, hold: false } }); await frame({ release: true }); await until((st) => !st.walking, 40); }
  await frame({ ...api(`A.meAv.playEmote(1)`), camTo: { frames: sec(2), rel: Math.PI * 0.85, pitch: 0.22, zoom: 0.62, hold: true } });
  await hold(5.5);
  await frame({ release: true });
}
// 6) 초 켜기
if (clipLeft()) {
  say(CAPS[9], 9);
  await frame({ ...api(`api.walkTo({kind:'candle',index:0})`), camTo: { frames: sec(2), rel: 0.2, pitch: 0.42, zoom: 1.0, hold: false } });
  await frame({ release: true });
  await until((st) => !st.walking, 60);
  await hold(1.0);
  await frame({ ...api(`api.lightCandle({slot: A.near.candle === undefined || A.near.candle === null ? 0 : A.near.candle, mine: true, intention: 0, until: Date.now() + 864e5})`), camTo: { frames: sec(2), rel: Math.PI * 0.7, pitch: 0.25, zoom: 0.7, hold: true } });
  await hold(6);
  await frame({ release: true });
}
// 7) 앉아 묵주 기도 → 무릎 꿇기
if (clipLeft()) {
  say(CAPS[10], 11);
  await frame({ ...api(`api.walkTo({kind:'seat'})`), camTo: { frames: sec(2), rel: 0, pitch: 0.42, zoom: 1.0, hold: false } });
  await frame({ release: true });
  await until((st) => !st.walking, 60);
  await frame(api(`api.sit({})`));
  await until((st) => st.mode === 'seated', 4);
  await frame(api(`api.setRosary({on:true}); api.setPraying({on:true});`));
  await hold(5);
  await frame(api(`api.setPrayerPosture({posture:'kneel'})`));
  await hold(5);
}
// 8) 마침 넓은 시점
if (CLIP === 0 || true) {
  await frame({ camTo: { frames: sec(4), rel: Math.PI * 0.35, pitch: 0.75, zoom: 1.6, hold: true, spin: 0.004 } });
  await hold(4.5);
  for (let i = 0; i < sec(0.8); i++) await frame({ black: i / sec(0.8) });
}
// 9) 마침 카드
{ const n = sec(4.5); for (let i = 0; i < n; i++) await frame({ cardOnly: true, card: { l1: STR.end, l2: 'Rosarium', a: Math.min(1, i / 12, (n - i) / 12) } }); }

ff.stdin.end(); await ffDone;
const st = await page.evaluate(() => ({ err: window.__church.frameErrN || 0, vErr: window.__vidErr || null }));
await browser.close();
const dur = frames / FPS;
console.log(`영상 ${dur.toFixed(1)}s (${frames}프레임), 렌더 ${((Date.now() - t0) / 1000).toFixed(0)}s, 앱 프레임 오류 ${st.err}, 스크립트 오류 ${st.vErr}, 페이지 오류 ${errors.length}`);
errors.slice(0, 5).forEach((e) => console.log('  !', e.slice(0, 200)));
fs.writeFileSync(path.join(scratch, `${id}_${lang}.captions.json`), JSON.stringify(caps, null, 1));

// ---------------------------------------------------------------- 소리(오르간 한 곡을 아주 작게, 페이드) + 마무리
const organ = path.join(repo, 'assets/music/organ_ave_maria.m4a');
if (!flag('no-audio') && fs.existsSync(organ)) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', vidTmp, '-stream_loop', '-1', '-i', organ, '-t', String(dur), '-map', '0:v', '-map', '1:a',
    '-af', `volume=0.16,afade=t=in:st=0:d=3,afade=t=out:st=${(dur - 3.5).toFixed(2)}:d=3.5`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-shortest', '-movflags', '+faststart', outMp4]);
  fs.unlinkSync(vidTmp);
} else fs.renameSync(vidTmp, outMp4);
// 12장 접촉표(눈으로 훑기)
const sheet = outMp4.replace(/\.mp4$/, '_sheet.jpg');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', outMp4, '-vf', `fps=12/${dur.toFixed(2)},scale=426:240,tile=4x3:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', sheet]);
console.log('파일', outMp4, (fs.statSync(outMp4).size / 1048576).toFixed(1) + 'MB', '접촉표', sheet);
