/* audio.js — WebAudio 합성 발소리(공유판: 발소리만). 아바타가 발을 디딜 때(avatar.js takeStep) 아주 작게, 짧은 「톡」(90 ms).
   소리 자료는 파일 없이 처음 한 번 합성한다(6가지). 사용자 제스처 전에는 AudioContext 를 resume 하지 못할 수 있어 제스처 때 다시 시도한다.
   setSteps({on, vol}) 로 켠다(기본 꺼짐). vol = 앱 소리 크기 설정(0..1). */
(function (root) {
  'use strict';
  var Ctx = root.AudioContext || root.webkitAudioContext;
  var A = { ctx: null, steps: { on: false, vol: 0.3 }, stepBufs: null, stepBus: null, stepIdx: 0 };
  var LEVELS = { REF_RMS_DB: -21.3, MARGIN_DB: 12, VOL_DEFAULT: 0.3, STEP_TRIM_DB: -3 };
  A.LEVELS = LEVELS;
  function db(x) { return 20 * Math.log(Math.max(x, 1e-6)) / Math.LN10; }
  // 발소리 최고값(선형 이득): 소리 크기 설정(vol)을 기준으로 MARGIN_DB 만큼 작게
  A.stepGain = function (vol) {
    vol = Math.min(1, Math.max(0.01, +vol || LEVELS.VOL_DEFAULT));
    return Math.pow(10, (LEVELS.REF_RMS_DB + db(vol) - LEVELS.MARGIN_DB + LEVELS.STEP_TRIM_DB) / 20);
  };
  // 발소리 합성(순수 계산, 시험에서도 부른다): 부드러운 신발이 돌바닥을 가볍게 딛는 소리 — 짧은 뒤꿈치 「톡」(1.2~2.4 kHz 띠 잡음 + 400 Hz 언저리의 아주 짧은 몸통)
  // + 35~55 ms 뒤 더 작은 앞꿈치 소리(2.5~4 kHz) + 아주 옅은 끌림. 250 Hz 높은 통과로 낮은 「쿵」을 걷어 낸다.
  // 옛 소리(2026-11-22 1차)는 95~128 Hz 사인 「툭」이 30 ms 감쇠로 길게 울려 200 Hz 아래 에너지가 19~52%, -20 dB 까지 75~95 ms, 길이 160 ms 라 「터덜」 거렸다(WALK_GAIT.md §6).
  // 최고값 1 로 맞춘 Float32Array 를 n 개(조금씩 다르게) 돌려준다. 길이 90 ms.
  A.synthSteps = function (rate, n) {
    var out = [], seed = 12345;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; }
    function u01() { return rnd() * 0.5 + 0.5; }
    function reso(fc, bw) { var r = Math.exp(-Math.PI * bw / rate); return { r: r, c: 2 * r * Math.cos(2 * Math.PI * fc / rate), g: 1 - r, y1: 0, y2: 0 }; }
    function run(f, x) { var y = f.g * x + f.c * f.y1 - f.r * f.r * f.y2; f.y2 = f.y1; f.y1 = y; return y; }
    for (var v = 0; v < (n || 6); v++) {
      var len = Math.floor(rate * 0.09), d = new Float32Array(len), i;
      var fh = 1200 + 1200 * u01(), ft = 2500 + 1500 * u01(), fb = 330 + 160 * u01();
      var toe = Math.floor(rate * (0.035 + 0.02 * u01())), toeA = 0.28 + 0.15 * u01(), scuff = 0.05 + 0.05 * u01();
      var Rh = reso(fh, 1400), Rt = reso(ft, 1800), Rb = reso(fb, 220), Rs = reso(1800, 2600);
      var hpY = 0, hpX = 0, hpA = Math.exp(-2 * Math.PI * 250 / rate);   // 1극 높은 통과 250 Hz
      for (i = 0; i < len; i++) {
        var t = i / rate, x = rnd();
        var eh = Math.exp(-t / 0.007) * Math.min(1, t / 0.0008);
        var tt = (i - toe) / rate, et = tt > 0 ? toeA * Math.exp(-tt / 0.006) * Math.min(1, tt / 0.0008) : 0;
        var es = scuff * Math.exp(-t / 0.02) * Math.min(1, t / 0.004);
        var y = 3.0 * run(Rh, x) * eh + 3.2 * run(Rt, x) * et + 0.6 * run(Rb, x) * Math.exp(-t / 0.004) + 1.5 * run(Rs, x) * es;
        var hp = hpA * (hpY + y - hpX); hpX = y; hpY = hp;
        d[i] = hp;
      }
      var pk = 0; for (i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i]));
      for (i = 0; i < len; i++) d[i] /= pk || 1;
      for (i = 0; i < 64; i++) d[len - 1 - i] *= i / 64;   // 끝을 0 으로
      out.push(d);
    }
    return out;
  };
  function ensure() {
    if (A.ctx || !Ctx) return !!A.ctx;
    try {
      var c = new Ctx();
      A.ctx = c;
      A.stepBus = c.createGain(); A.stepBus.gain.value = 1; A.stepBus.connect(c.destination);
      A.stepBufs = A.synthSteps(c.sampleRate, 6).map(function (d) { var b = c.createBuffer(1, d.length, c.sampleRate); b.getChannelData(0).set(d); return b; });
    } catch (e) { A.ctx = null; return false; }
    return true;
  }
  A.resume = function () { if (A.steps.on && A.ctx && A.ctx.state === 'suspended') { try { A.ctx.resume(); } catch (e) { /* ignore */ } } };
  A.suspend = function () { if (A.ctx && A.ctx.suspend) { try { A.ctx.suspend(); } catch (e) { /* ignore */ } } };
  A.setSteps = function (o) {
    o = o || {};
    A.steps = { on: !!o.on, vol: o.vol === undefined ? LEVELS.VOL_DEFAULT : +o.vol };
    if (A.steps.on && ensure()) A.resume();
  };
  // 발을 디딜 때 한 번. alt = 오른발(조금 다른 표본), v = 걷는 속도(m/s; 느리면 더 작게), delay = 이만큼 뒤에 낸다(s, 0..0.1 — 프레임 안 착지 시각 맞추기)
  A.footstep = function (alt, v, delay) {
    if (!A.steps.on || !A.ctx || A.ctx.state !== 'running' || !A.stepBufs) return;
    var c = A.ctx, s = c.createBufferSource();
    // 같은 표본을 잇달아 내지 않는다(기계적으로 들리지 않게): 6개 가운데 지난번과 다른 것, 재생 속도 ±6%, 크기 −2.5~0 dB
    var nb = A.stepBufs.length, k = (A.stepIdx + 1 + Math.floor(Math.random() * (nb - 1))) % nb;
    A.stepIdx = k; s.buffer = A.stepBufs[k];
    s.playbackRate.value = 0.94 + Math.random() * 0.12;
    var sp = v === undefined ? 1.2 : +v, soft = 0.55 + 0.45 * Math.min(1, Math.max(0, sp / 1.4));   // 천천히 걸으면 살살
    var g = c.createGain(); g.gain.value = A.stepGain(A.steps.vol) * soft * (0.75 + Math.random() * 0.25);
    var dl = +delay > 0 ? Math.min(0.1, +delay) : 0;
    s.connect(g); g.connect(A.stepBus); s.start(dl > 0 ? c.currentTime + dl : 0);
  };
  // 첫 사용자 제스처에서 resume 재시도
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { if (root.addEventListener) root.addEventListener(ev, function () { A.resume(); }, { passive: true }); });
  root.RoomAudio = A;
})(typeof window !== 'undefined' ? window : this);
