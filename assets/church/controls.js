/* controls.js — 입력. 화면을 왼쪽/오른쪽 절반으로 나눈다(C-01, Roblox 규약).
   왼쪽 절반(걷는 중에만): 닿은 곳에 떠다니는 스틱이 생긴다. 앱에서는 Flutter 가 이 영역을 가로채 setJoystick 으로 값을 보내고,
   웹 단독(브라우저 미리보기/테스트)에서는 아래 웹 스틱이 같은 일을 한다.
   오른쪽 절반(그리고 앉은 동안 화면 전체): 드래그 = 카메라 회전, 두 손가락 핀치/휠 = 줌. 키보드(WASD/화살표, Q/E)도 유지.
   창 감상 모드(ctl.viewMode, G-07): 화면 전체가 감상 제스처 — 한 손가락 끌기 = onView('pan',{dx,dy}), 두 손가락 = onView('pinch',{k,cx,cy}),
   휠 = pinch, 두 번 탭 = onView('dtap'), 탭 = onView('tap'). 걷기·카메라 회전 값은 건드리지 않는다. */
(function (root) {
  'use strict';
  function create(canvas) {
    var ctl = {
      joyX: 0, joyY: 0, kx: 0, ky: 0,
      yaw: 0, pitch: 0.45, look: 0, zoom: 1,
      dragging: false, lastDragT: -99, now: 0,
      // 웹 떠다니는 스틱: 왼쪽 절반 터치(걷는 중에만). 값은 [-1,1], y>0 이 앞.
      moveZone: true, webX: 0, webY: 0, webActive: false,
      // 탭(거의 안 움직이고 짧게 뗌) -> onTap(clientX, clientY). 이동 영역(왼쪽 절반)에 처음 닿으면 onMoveTouch() (자동 걷기 취소용).
      onTap: null, onMoveTouch: null,
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
      setMoveZone: function (on) { on = !!on; if (ctl.moveZone === on) return; ctl.moveZone = on; if (!on) releaseMove(); },
      // 창 감상 제스처
      viewMode: false, onView: null,
      setViewMode: function (on) { on = !!on; if (ctl.viewMode === on) return; ctl.viewMode = on; vpts = {}; vLast = 0; if (on) { releaseMove(); ctl.moveZone = false; pts = {}; recount(); } }
    };
    // ---- 감상 제스처(viewMode) ----
    var vpts = {}, vLast = 0, vTap = null;
    function vIds() { return Object.keys(vpts); }
    function vGeom() { var k = vIds(), a = vpts[k[0]], b = vpts[k[1]]; return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
    function vEmit(kind, o) { if (ctl.onView) { try { ctl.onView(kind, o || {}); } catch (e) { if (root.console) console.error('[church] view gesture', e); } } }
    function vDown(e) {
      vpts[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: Date.now(), moved: 0, alone: vIds().length === 0 };
      if (vIds().length >= 2) { var g = vGeom(); vLast = g.d; for (var k in vpts) vpts[k].alone = false; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    function vMove(e) {
      var p = vpts[e.pointerId];
      if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.sx, e.clientY - p.sy));
      var n = vIds().length;
      if (n >= 2) {
        var g = vGeom();
        if (vLast > 0 && g.d > 0) vEmit('pinch', { k: g.d / vLast, cx: g.cx, cy: g.cy });
        vLast = g.d;
      } else if (n === 1) vEmit('pan', { dx: dx, dy: dy });
    }
    function vUp(e) {
      var p = vpts[e.pointerId];
      if (!p) return;
      delete vpts[e.pointerId];
      if (vIds().length >= 2) vLast = vGeom().d; else vLast = 0;
      var isTap = e.type === 'pointerup' && p.alone && p.moved < 12 && Date.now() - p.t0 < 350;
      if (!isTap) return;
      var now = Date.now();
      if (vTap && now - vTap.t < 330 && Math.hypot(e.clientX - vTap.x, e.clientY - vTap.y) < 40) { vTap = null; vEmit('dtap', { x: e.clientX, y: e.clientY }); }
      else { vTap = { t: now, x: e.clientX, y: e.clientY }; vEmit('tap', { x: e.clientX, y: e.clientY }); }
    }
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
    function countAll() { var n = 0; for (var k in pts) n++; return n; }
    function orbitIds() { var o = []; for (var k in pts) if (pts[k].role === 'orbit') o.push(k); return o; }
    function pd() { var ks = orbitIds(); var a = pts[ks[0]], b = pts[ks[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    canvas.addEventListener('pointerdown', function (e) {
      if (ctl.viewMode) { vDown(e); return; }
      var role = 'orbit';
      if (ctl.moveZone && movePid === null && ctl.inMoveZone(e.clientX) && count < 2) role = 'move';
      pts[e.pointerId] = { x: e.clientX, y: e.clientY, role: role, sx: e.clientX, sy: e.clientY, t0: Date.now(), alone: countAll() === 0, moved: 0 };
      if (role === 'move') {
        if (ctl.onMoveTouch) ctl.onMoveTouch();
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
      if (ctl.viewMode) { vMove(e); return; }
      var p = pts[e.pointerId];
      if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.sx, e.clientY - p.sy));
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
        // 아래로 끌면 시점이 올라가고, 맨 아래(수평)에서 더 위로 끌면 천장을 올려다본다(look).
        var dp = dy * 0.004;
        if (dp < 0 && ctl.pitch + dp < 0.06) {
          ctl.look = Math.min(1.35, ctl.look + (0.06 - (ctl.pitch + dp)));
          ctl.pitch = 0.06;
        } else if (dp > 0 && ctl.look > 0) {
          var take = Math.min(ctl.look, dp);
          ctl.look -= take;
          ctl.pitch = Math.min(1.25, ctl.pitch + (dp - take));
        } else {
          ctl.pitch = Math.max(0.06, Math.min(1.25, ctl.pitch + dp));
        }
      }
      ctl.lastDragT = ctl.now;
    });
    function up(e) {
      if (ctl.viewMode) { vUp(e); return; }
      var p = pts[e.pointerId];
      if (!p) return;
      // 탭: 안 끌었고(10px 이하) 짧고(450ms 이하) 한 손가락일 때만(취소 이벤트는 제외)
      var isTap = e.type === 'pointerup' && p.alone && p.moved < 10 && Date.now() - p.t0 < 450;
      if (p.role === 'move') { releaseMove(); if (isTap && ctl.onTap) ctl.onTap(e.clientX, e.clientY); return; }
      delete pts[e.pointerId];
      recount();
      ctl.lastDragT = ctl.now;
      if (isTap && ctl.onTap) ctl.onTap(e.clientX, e.clientY);
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) {
      if (ctl.viewMode) { vEmit('pinch', { k: Math.exp(-e.deltaY * 0.0015), cx: e.clientX, cy: e.clientY }); e.preventDefault(); return; }
      ctl.zoom = Math.max(0.55, Math.min(1.6, ctl.zoom * (1 + e.deltaY * 0.001))); e.preventDefault(); }, { passive: false });
    return ctl;
  }
  root.ChurchControls = { create: create };
})(typeof window !== 'undefined' ? window : this);
