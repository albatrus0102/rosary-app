/* controls.js — 조이스틱 입력(Flutter) + 캔버스 드래그 카메라 회전 + 핀치/휠 줌 + 키보드(WASD/화살표, Q/E) */
(function (root) {
  'use strict';
  function create(canvas) {
    var ctl = {
      joyX: 0, joyY: 0, kx: 0, ky: 0,
      yaw: 0, pitch: 0.45, zoom: 1,
      dragging: false, lastDragT: -99, now: 0,
      setJoystick: function (x, y) { ctl.joyX = Math.max(-1, Math.min(1, +x || 0)); ctl.joyY = Math.max(-1, Math.min(1, +y || 0)); },
      // 이동 입력(키보드 우선)
      getMove: function (out) {
        if (ctl.kx !== 0 || ctl.ky !== 0) { var l = Math.sqrt(ctl.kx * ctl.kx + ctl.ky * ctl.ky); out.x = ctl.kx / l; out.y = ctl.ky / l; }
        else { out.x = ctl.joyX; out.y = ctl.joyY; }
        return out;
      }
    };
    var keys = {};
    function recalc() {
      ctl.kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      ctl.ky = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    }
    root.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (k === 'q') ctl.yaw += 0.15; else if (k === 'e') ctl.yaw -= 0.15;
      keys[k] = true; recalc();
    });
    root.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; recalc(); });
    root.addEventListener('blur', function () { keys = {}; recalc(); });

    var pts = {}, count = 0, lastDist = 0;
    function pd() { var ks = Object.keys(pts); var a = pts[ks[0]], b = pts[ks[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    canvas.addEventListener('pointerdown', function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      count = Object.keys(pts).length;
      ctl.dragging = true;
      if (count === 2) lastDist = pd();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = pts[e.pointerId];
      if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (count >= 2) {
        var d = pd();
        if (lastDist > 0) ctl.zoom = Math.max(0.55, Math.min(1.6, ctl.zoom * (lastDist / d)));
        lastDist = d;
      } else {
        ctl.yaw -= dx * 0.0065;
        ctl.pitch = Math.max(0.12, Math.min(1.25, ctl.pitch + dy * 0.004));
      }
      ctl.lastDragT = ctl.now;
    });
    function up(e) {
      delete pts[e.pointerId];
      count = Object.keys(pts).length;
      if (count === 0) ctl.dragging = false;
      ctl.lastDragT = ctl.now;
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { ctl.zoom = Math.max(0.55, Math.min(1.6, ctl.zoom * (1 + e.deltaY * 0.001))); e.preventDefault(); }, { passive: false });
    return ctl;
  }
  root.ChurchControls = { create: create };
})(typeof window !== 'undefined' ? window : this);
