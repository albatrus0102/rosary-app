/* controls.js — 입력. 화면을 왼쪽/오른쪽 절반으로 나눈다(C-01, Roblox 규약).
   왼쪽 절반(걷는 중에만): 닿은 곳에 떠다니는 스틱이 생긴다. 앱에서는 Flutter 가 이 영역을 가로채 setJoystick 으로 값을 보내고,
   웹 단독(브라우저 미리보기/테스트)에서는 아래 웹 스틱이 같은 일을 한다.
   오른쪽 절반(그리고 앉은 동안 화면 전체): 드래그 = 카메라 회전, 두 손가락 핀치/휠 = 줌. 키보드(WASD/화살표, Q/E)도 유지. */
(function (root) {
  'use strict';
  function create(canvas) {
    var ctl = {
      joyX: 0, joyY: 0, kx: 0, ky: 0,
      yaw: 0, pitch: 0.45, zoom: 1,
      dragging: false, lastDragT: -99, now: 0,
      // 웹 떠다니는 스틱: 왼쪽 절반 터치(걷는 중에만). 값은 [-1,1], y>0 이 앞.
      moveZone: true, webX: 0, webY: 0, webActive: false,
      setJoystick: function (x, y) { ctl.joyX = Math.max(-1, Math.min(1, +x || 0)); ctl.joyY = Math.max(-1, Math.min(1, +y || 0)); },
      // 이동 입력(키보드 우선)
      getMove: function (out) {
        if (ctl.kx !== 0 || ctl.ky !== 0) { var l = Math.sqrt(ctl.kx * ctl.kx + ctl.ky * ctl.ky); out.x = ctl.kx / l; out.y = ctl.ky / l; }
        else if (ctl.webActive) { out.x = ctl.webX; out.y = ctl.webY; }
        else { out.x = ctl.joyX; out.y = ctl.joyY; }
        return out;
      },
      // 터치 x 가 왼쪽(이동) 절반인가
      inMoveZone: function (clientX) { return clientX < (root.innerWidth || canvas.clientWidth || 360) * 0.5; },
      // 걷는 중에만 왼쪽 절반이 이동 영역이다(앉으면 화면 전체가 카메라 영역).
      setMoveZone: function (on) { on = !!on; if (ctl.moveZone === on) return; ctl.moveZone = on; if (!on) releaseMove(); }
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

    var MOVE_R = 56, DEAD = 0.12;
    var pts = {}, count = 0, lastDist = 0, movePid = null, moveO = null;
    var stickEl = null, knobEl = null;
    function stick(show, ox, oy, kx, ky) {
      if (!stickEl && root.document) { stickEl = root.document.getElementById('stick'); knobEl = root.document.getElementById('knob'); }
      if (!stickEl) return;
      stickEl.style.display = show ? 'block' : 'none';
      if (show) {
        stickEl.style.transform = 'translate(' + (ox - 60) + 'px,' + (oy - 60) + 'px)';
        knobEl.style.transform = 'translate(' + (kx) + 'px,' + (ky) + 'px)';
      }
    }
    function releaseMove() {
      if (movePid !== null) delete pts[movePid];
      movePid = null; moveO = null; ctl.webX = ctl.webY = 0; ctl.webActive = false; stick(false);
      recount();
    }
    function recount() {
      var n = 0; for (var k in pts) if (pts[k].role === 'orbit') n++;
      count = n;
      if (n === 0) ctl.dragging = false;
    }
    function orbitIds() { var o = []; for (var k in pts) if (pts[k].role === 'orbit') o.push(k); return o; }
    function pd() { var ks = orbitIds(); var a = pts[ks[0]], b = pts[ks[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    canvas.addEventListener('pointerdown', function (e) {
      var role = 'orbit';
      if (ctl.moveZone && movePid === null && ctl.inMoveZone(e.clientX) && count < 2) role = 'move';
      pts[e.pointerId] = { x: e.clientX, y: e.clientY, role: role };
      if (role === 'move') {
        movePid = e.pointerId; moveO = { x: e.clientX, y: e.clientY };
        ctl.webX = ctl.webY = 0; ctl.webActive = true; stick(true, moveO.x, moveO.y, 0, 0);
      } else {
        recount();
        ctl.dragging = true;
        if (count === 2) lastDist = pd();
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = pts[e.pointerId];
      if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (p.role === 'move') {
        var vx = (e.clientX - moveO.x) / MOVE_R, vy = (e.clientY - moveO.y) / MOVE_R, l = Math.hypot(vx, vy);
        if (l > 1) { vx /= l; vy /= l; l = 1; }
        var live = l >= DEAD;
        ctl.webX = live ? vx : 0; ctl.webY = live ? -vy : 0;
        stick(true, moveO.x, moveO.y, vx * MOVE_R, vy * MOVE_R);
        return;
      }
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
      var p = pts[e.pointerId];
      if (!p) return;
      if (p.role === 'move') { releaseMove(); return; }
      delete pts[e.pointerId];
      recount();
      ctl.lastDragT = ctl.now;
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { ctl.zoom = Math.max(0.55, Math.min(1.6, ctl.zoom * (1 + e.deltaY * 0.001))); e.preventDefault(); }, { passive: false });
    return ctl;
  }
  root.ChurchControls = { create: create };
})(typeof window !== 'undefined' ? window : this);
