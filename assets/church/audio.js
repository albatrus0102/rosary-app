/* audio.js — WebAudio 합성 소리: 파이프오르간풍 패드(느린 화음 + 합성 잔향), 발소리, 촛불 종소리.
   오르간·종소리는 setAmbient(true) 이후에만 소리가 난다. 사용자 제스처 전에는 AudioContext 를 resume 하지 못할 수 있어 제스처 시 다시 시도한다.
   발소리(docs/church/WALK_GAIT.md §소리): 아바타가 발을 디딜 때(avatar.js takeStep) 아주 작게. 앱이 setSteps({on, chant, vol})로 켜고
   (성당 소리 설정·성삼일 침묵을 따른다), 짧고 가벼운 돌바닥 「톡」(낮은 쿵 없음, 90 ms), 크기는 늘 음악보다 작다 — 음악이 울리면 그 음악의 평소 크기(RMS)보다 18 dB, 없으면 12 dB 아래이고
   음악 음량 설정(vol)을 따라 내려간다(stepGain). 소리 자료는 파일 없이 처음 한 번 합성한다(돌바닥 6가지). */
(function (root) {
  'use strict';
  var Ctx = root.AudioContext || root.webkitAudioContext;
  var A = { on: false, ctx: null, master: null, wet: null, timer: 0, chordIdx: 0, noiseBuf: null, lastStep: 0, steps: { on: null, chant: false, vol: 0.3 }, stepBufs: null, stepBus: null, stepIdx: 0 };
  // 크기 기준(dBFS, tools/church_web/footstep_levels.mjs 로 잰 값). CHANT: 앱 성가 4곡(assets/music) 중 가장 작은 곡의 평균(RMS),
  // ORGAN: 이 파일의 오르간 패드가 화음을 유지하는 동안의 출력 RMS. 발소리 표본은 최고값 1(0 dBFS)로 만든다.
  // STEP_TRIM_DB: 2026-11-22 2차 — 새 발소리(1~2 kHz 「톡」)는 같은 최고값이면 옛 저음 「툭」보다 귀에 약 1 dB 크게 들려(A 가중 에너지) 3 dB 더 낮춘다.
  var LEVELS = { CHANT_RMS_DB: -21.3, ORGAN_RMS_DB: -38.5, MUSIC_MARGIN_DB: 18, QUIET_MARGIN_DB: 12, VOL_DEFAULT: 0.3, STEP_TRIM_DB: -3 };
  A.LEVELS = LEVELS;
  function db(x) { return 20 * Math.log(Math.max(x, 1e-6)) / Math.LN10; }
  // 발소리 최고값(선형 이득). s = {organ: 오르간 패드가 울리나, chant: 앱 성가가 울리나, vol: 음악 음량 설정 0..1}
  A.stepGain = function (s) {
    var vol = Math.min(1, Math.max(0.01, +s.vol || LEVELS.VOL_DEFAULT)), ref;
    if (s.chant) ref = LEVELS.CHANT_RMS_DB + db(vol);                                       // 성가: 그 음량 그대로
    else if (s.organ) ref = LEVELS.ORGAN_RMS_DB + Math.min(0, db(vol / LEVELS.VOL_DEFAULT));  // 오르간(음량 고정): 설정을 낮추면 함께 내려가고 올려도 오르간보다 커지지 않는다
    else ref = LEVELS.CHANT_RMS_DB + db(vol);                                               // 음악이 없으면 음량 설정을 기준으로
    var margin = s.chant || s.organ ? LEVELS.MUSIC_MARGIN_DB : LEVELS.QUIET_MARGIN_DB;
    return Math.pow(10, (ref - margin + LEVELS.STEP_TRIM_DB) / 20);
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
  var CHORDS = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67], [43, 50, 55, 58, 62], [50, 57, 62, 66, 69], [45, 52, 57, 61, 64]];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensure() {
    if (A.ctx || !Ctx) return !!A.ctx;
    try {
      var c = new Ctx();
      A.ctx = c;
      A.master = c.createGain(); A.master.gain.value = 0; A.master.connect(c.destination);
      // 합성 잔향(노이즈 감쇠 임펄스)
      var len = Math.floor(c.sampleRate * 3.4), ir = c.createBuffer(2, len, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = ir.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      var conv = c.createConvolver(); conv.buffer = ir;
      A.wet = c.createGain(); A.wet.gain.value = 0.9;
      conv.connect(A.wet); A.wet.connect(A.master);
      A.conv = conv;
      var dry = c.createGain(); dry.gain.value = 0.35; dry.connect(A.master); A.dry = dry;
      // 오르간 파형
      var n = 10, real = new Float32Array(n), imag = new Float32Array(n), amps = [0, 1, 0.45, 0.3, 0.16, 0.1, 0.06, 0.04, 0.02, 0.01];
      for (i = 0; i < n; i++) imag[i] = amps[i];
      A.wave = c.createPeriodicWave(real, imag);
      // 발소리용 노이즈
      var nb = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate), nd = nb.getChannelData(0);
      for (i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 3);
      A.noiseBuf = nb;
      // 발소리: 오르간(master)과 따로 바로 출력으로(오르간이 꺼져 있어도 들리게). 크기는 stepGain 이 소리마다 정한다.
      A.stepBus = c.createGain(); A.stepBus.gain.value = 1; A.stepBus.connect(c.destination);
      A.stepBufs = A.synthSteps(c.sampleRate, 6).map(function (d) { var b = c.createBuffer(1, d.length, c.sampleRate); b.getChannelData(0).set(d); return b; });
    } catch (e) { A.ctx = null; return false; }
    return true;
  }

  function playChord() {
    if (!A.on || !A.ctx) return;
    var c = A.ctx, t0 = c.currentTime, notes = CHORDS[A.chordIdx % CHORDS.length];
    A.chordIdx++;
    var dur = 11;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3;
    var g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 3.2); g.gain.setValueAtTime(0.5, t0 + dur - 4.5); g.gain.linearRampToValueAtTime(0, t0 + dur + 3);
    lp.connect(g); g.connect(A.conv); g.connect(A.dry);
    var oscs = [];
    notes.forEach(function (m, i) {
      [-5, 4].forEach(function (cents) {
        var o = c.createOscillator(); o.setPeriodicWave(A.wave); o.frequency.value = mtof(m); o.detune.value = cents + (Math.random() - 0.5) * 3;
        var og = c.createGain(); og.gain.value = (i === 0 ? 0.55 : 0.28) / 2;
        o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + dur + 3.2); oscs.push(o);
      });
    });
    // 낮은 페달 음
    var bass = c.createOscillator(); bass.type = 'sine'; bass.frequency.value = mtof(notes[0] - 12);
    var bg = c.createGain(); bg.gain.value = 0.28; bass.connect(bg); bg.connect(lp); bass.start(t0); bass.stop(t0 + dur + 3.2);
    A.timer = setTimeout(playChord, (dur - 1.5) * 1000);
  }

  A.setAmbient = function (on) {
    A.on = !!on;
    if (on) {
      if (!ensure()) return;
      try { if (A.ctx.state === 'suspended') A.ctx.resume(); } catch (e) { /* ignore */ }
      var t = A.ctx.currentTime;
      A.master.gain.cancelScheduledValues(t); A.master.gain.setTargetAtTime(0.16, t, 1.2);
      clearTimeout(A.timer); A.chordIdx = A.chordIdx || 0; playChord();
    } else if (A.ctx) {
      clearTimeout(A.timer);
      var t2 = A.ctx.currentTime;
      A.master.gain.cancelScheduledValues(t2); A.master.gain.setTargetAtTime(0, t2, 0.4);
    }
  };
  function stepsOn() { return A.steps.on === null ? A.on : !!A.steps.on; }   // 앱이 setSteps 를 보내지 않았으면(옛 앱) 오르간 설정을 따른다
  A.resume = function () { if ((A.on || stepsOn()) && A.ctx && A.ctx.state === 'suspended') { try { A.ctx.resume(); } catch (e) { /* ignore */ } } };
  // 앱(Flutter)이 알려 준다: on = 성당 소리 설정(성삼일 침묵·백그라운드면 false), chant = 앱 성가가 울리는 중, vol = 음악 음량 설정(0..1)
  A.setSteps = function (o) {
    o = o || {};
    A.steps = { on: !!o.on, chant: !!o.chant, vol: o.vol === undefined ? LEVELS.VOL_DEFAULT : +o.vol };
    if (A.steps.on && ensure()) A.resume();
  };
  // 발을 디딜 때 한 번. alt = 오른발(조금 다른 표본), v = 걷는 속도(m/s; 느리면 더 작게)
  A.footstep = function (alt, v) {
    if (!stepsOn() || !A.ctx || A.ctx.state !== 'running' || !A.stepBufs) return;
    var c = A.ctx, s = c.createBufferSource();
    // 같은 표본을 잇달아 내지 않는다(기계적으로 들리지 않게): 6개 가운데 지난번과 다른 것, 재생 속도 ±6%, 크기 −2.5~0 dB
    var nb = A.stepBufs.length, k = (A.stepIdx + 1 + Math.floor(Math.random() * (nb - 1))) % nb;
    A.stepIdx = k; s.buffer = A.stepBufs[k];
    s.playbackRate.value = 0.94 + Math.random() * 0.12;
    var sp = v === undefined ? 1.2 : +v, soft = 0.55 + 0.45 * Math.min(1, Math.max(0, sp / 1.4));   // 천천히 걸으면 살살
    var g = c.createGain(); g.gain.value = A.stepGain({ organ: A.on, chant: A.steps.chant, vol: A.steps.vol }) * soft * (0.75 + Math.random() * 0.25);
    s.connect(g); g.connect(A.stepBus); s.start();
  };
  A.chime = function () {
    if (!A.on || !A.ctx || A.ctx.state !== 'running') return;
    var c = A.ctx, t = c.currentTime;
    [1568, 2093].forEach(function (fr, i) {
      var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
      var g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 / (i + 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g); g.connect(A.conv); g.connect(A.master); o.start(t); o.stop(t + 1.7);
    });
  };
  // 첫 사용자 제스처에서 resume 재시도
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { root.addEventListener(ev, function () { A.resume(); }, { passive: true }); });
  root.ChurchAudio = A;
})(typeof window !== 'undefined' ? window : this);
