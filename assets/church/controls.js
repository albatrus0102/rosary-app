/* controls.js — 입력. 이동 영역은 왼쪽 아래 고정 손잡이 원(+작은 여백)뿐이다(C-01; 예전 '왼쪽 절반'은 확대·시점 끌기를 막아 없앴다).
   원 안(걷는 중에만): 앱에서는 Flutter 가 이 원을 가로채 setJoystick 으로 값을 보내고,
   웹 단독(브라우저 미리보기/테스트)에서는 아래 웹 스틱이 같은 일을 한다.
   그 밖의 모든 곳(왼쪽 포함, 앉은 동안은 화면 전체): 드래그 = 카메라 회전, 두 손가락 핀치/휠 = 줌. 키보드(WASD/화살표, Q/E)도 유지.
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
      // 앱(Flutter)이 고정 이동 손잡이를 그린다(ext): 웹은 스틱을 만들지 않고 화면 전체를 시점 회전·핀치로 쓴다.
      // extPinch: 손가락 하나가 앱 손잡이 위에 있어 웹이 한 손가락만 보는 핀치 — 그동안 한 손가락 회전을 멈춘다(확대는 pinchBy).
      ext: false, extPinch: false,
      // extLook: 걷는 동안 앱(Flutter)이 3D 화면 위 손가락을 모두 맡아 읽고(안드로이드 웹뷰는 손잡이를 잡은 채 닿은 다른 손가락의 움직임을
      // 받지 못한다) setInput{look,dx,dy,k} 로 보낸다. look=true 인 동안(앱의 시점 손가락이 닿아 있음) 끌기 상태로 쳐 자동 따라가기가 쉬고,
      // 웹이 혹시 같은 손가락을 받아도 한 번 더 돌리지 않는다.
      extLook: false,
      // 시점 회전 한 번(화면 px 끌기량). 웹 한 손가락 끌기와 앱이 보내는 lookBy 가 같은 식을 쓴다.
      lookBy: function (dx, dy) {
        // 빠진 축은 0(앱은 한 축만 바뀌어도 둘 다 보내지만, 한쪽이 없다고 끌기 전체를 버리지 않는다)
        dx = dx === undefined ? 0 : +dx; dy = dy === undefined ? 0 : +dy; if (!isFinite(dx) || !isFinite(dy)) return;
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
        ctl.lastDragT = ctl.now;
        if (ctl.extLook) ctl.dragging = true;   // 앱이 끄는 동안은 자동 따라가기가 시점을 빼앗지 않는다
      },
      // 앱이 시점 끌기를 대신 읽는 시작/끝. 끝나면 웹에 남은 시점 손가락이 없을 때만 끌기 상태를 푼다.
      setLookExt: function (on) {
        on = !!on; if (ctl.extLook === on) return; ctl.extLook = on;
        if (on) { ctl.dragging = true; } else { recount(); }
        ctl.lastDragT = ctl.now;
      },
      pinchBy: function (k) { k = +k; if (k > 0 && isFinite(k)) ctl.zoom = Math.max(0.55, Math.min(1.6, ctl.zoom / k)); ctl.lastDragT = ctl.now; },
      setJoystick: function (x, y) { ctl.joyX = Math.max(-1, Math.min(1, +x || 0)); ctl.joyY = Math.max(-1, Math.min(1, +y || 0)); },
      // 이동 입력(키보드 우선)
      getMove: function (out) {
        if (ctl.kx !== 0 || ctl.ky !== 0) { var l = Math.sqrt(ctl.kx * ctl.kx + ctl.ky * ctl.ky); out.x = ctl.kx / l; out.y = ctl.ky / l; }
        else if (ctl.webActive) { out.x = ctl.webX; out.y = ctl.webY; }
        else { out.x = ctl.joyX; out.y = ctl.joyY; }
        return out;
      },
      // 터치 x 가 왼쪽(이동) 절반인가
      // 이동 영역은 '고정 손잡이 원'(+작은 여백)뿐이다. 화면 왼쪽 절반 전체가 아니다(왼쪽에서도 시점 끌기·핀치가 되어야 한다).
      // 앱(Flutter)이 실제로 그린 원은 setInput({stick}) 으로 받고(접는 화면·안전 영역에 따라 바뀜), 아직 못 받았으면 왼쪽 아래 기본 원.
      stick: null,
      setStick: function (cx, cy, r) { cx = +cx; cy = +cy; r = +r; ctl.stick = (isFinite(cx) && isFinite(cy) && r > 0) ? { cx: cx, cy: cy, r: r } : null; },
      stickCircle: function () {
        if (ctl.stick) return ctl.stick;
        var h = root.innerHeight || canvas.clientHeight || 640;
        return { cx: 8 + 66, cy: h - 8 - 66, r: 66 };   // ChurchMoveZone 기본(지름 132, 여백 8)
      },
      inMoveZone: function (clientX, clientY) {
        var c = ctl.stickCircle(), m = 8;
        return Math.hypot(clientX - c.cx, clientY - c.cy) <= c.r + m;
      },
      // 걷는 중에만 왼쪽 절반이 이동 영역이다(앉으면 화면 전체가 카메라 영역).
      setMoveZone: function (on) { on = !!on; if (ctl.moveZone === on) return; ctl.moveZone = on; if (!on) releaseMove(); },
      // 터치 기록(개발용 빌드, main.js 가 켠다): trace(type, e) — 웹이 받은 포인터 이벤트마다. 꺼져 있으면 null(비용 없음).
      trace: null,
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
      if (n === 0) ctl.dragging = !!ctl.extLook;
    }
    function countAll() { var n = 0; for (var k in pts) n++; return n; }
    function orbitIds() { var o = []; for (var k in pts) if (pts[k].role === 'orbit') o.push(k); return o; }
    function pd() { var ks = orbitIds(); var a = pts[ks[0]], b = pts[ks[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    canvas.addEventListener('pointerdown', function (e) {
      if (ctl.trace) ctl.trace('down', e);
      if (ctl.viewMode) { vDown(e); return; }
      var role = 'orbit';
      if (!ctl.ext && ctl.moveZone && movePid === null && ctl.inMoveZone(e.clientX, e.clientY)) role = 'move';
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
      if (ctl.trace) ctl.trace('move', e);
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
      } else if (!ctl.extPinch && !ctl.extLook) {
        ctl.lookBy(dx, dy);
      }
      ctl.lastDragT = ctl.now;
    });
    function up(e) {
      if (ctl.trace) ctl.trace(e.type === 'pointercancel' ? 'cancel' : 'up', e);
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
    ctl.pointerCount = countAll;
    return ctl;
  }
  function wrapA(a) { if (!(a > -1e9 && a < 1e9)) return 0; var T2 = Math.PI * 2; a = (a + Math.PI) % T2; if (a < 0) a += T2; return a - Math.PI; }   // 반복 없이(큰 값에서 끝나지 않던 while 대신)
  // 걸을 때 카메라가 아바타 뒤로 천천히 도는 '자동 따라가기' 한 프레임(main.js updateCamera). 돌린 양(라디안)을 돌려준다.
  // 사용자가 시점을 끄는 동안은 절대 돌리지 않는다: 웹 손가락(dragging)이든 앱이 대신 읽는 손가락(extLook)이든 같다.
  // s: { follow(설정 '걸을 때 뒤로 따라가기'), walkSt(자동 걷기 중), seated, spot(자리 시점 중), t(초), meYaw, speed(m/s), dt }
  function followStep(ctl, s) {
    if (!s.follow || s.seated || ctl.dragging || ctl.extLook) return 0;
    var before = ctl.yaw, since = s.t - ctl.lastDragT;
    if (s.walkSt) {
      if (since > 1.5) ctl.yaw += wrapA(s.meYaw - ctl.yaw) * (1 - Math.exp(-s.dt * 1.2));
    } else if (!s.spot && since > 2.5 && s.speed > 0.6 && Math.abs(wrapA(s.meYaw - ctl.yaw)) < 1.2) {
      ctl.yaw += wrapA(s.meYaw - ctl.yaw) * (1 - Math.exp(-s.dt * 0.5));
    }
    return ctl.yaw - before;
  }
  root.ChurchControls = { create: create, followStep: followStep };
})(typeof window !== 'undefined' ? window : this);
