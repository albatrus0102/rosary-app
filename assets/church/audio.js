/* audio.js — WebAudio 합성 소리: 파이프오르간풍 패드(느린 화음 + 합성 잔향), 발소리, 촛불 종소리.
   setAmbient(true) 이후에만 소리가 난다. 사용자 제스처 전에는 AudioContext 를 resume 하지 못할 수 있어 제스처 시 다시 시도한다. */
(function (root) {
  'use strict';
  var Ctx = root.AudioContext || root.webkitAudioContext;
  var A = { on: false, ctx: null, master: null, wet: null, timer: 0, chordIdx: 0, noiseBuf: null, lastStep: 0 };
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
  A.resume = function () { if (A.on && A.ctx && A.ctx.state === 'suspended') { try { A.ctx.resume(); } catch (e) { /* ignore */ } } };
  A.footstep = function (alt) {
    if (!A.on || !A.ctx || A.ctx.state !== 'running') return;
    var c = A.ctx, s = c.createBufferSource(); s.buffer = A.noiseBuf;
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = alt ? 700 : 900; f.Q.value = 0.8;
    var g = c.createGain(); g.gain.value = 0.11;
    s.connect(f); f.connect(g); g.connect(A.master); s.start();
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
