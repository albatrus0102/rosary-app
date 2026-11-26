/* controls.js — 입력. 이동 영역은 왼쪽 아래 고정 손잡이 원(+작은 여백)뿐이다(C-01; 예전 '왼쪽 절반'은 확대·시점 끌기를 막아 없앴다).
   원 안(걷는 중에만): 앱에서는 호스트 가 이 원을 가로채 setJoystick 으로 값을 보내고,
   웹 단독(브라우저 미리보기/테스트)에서는 아래 웹 스틱이 같은 일을 한다.
   그 밖의 모든 곳(왼쪽 포함, 앉은 동안은 화면 전체): 드래그 = 카메라 회전, 두 손가락 핀치/휠 = 줌. 키보드(WASD/화살표, Q/E)도 유지.
   창 감상 모드(ctl.viewMode, G-07): 화면 전체가 감상 제스처 — 한 손가락 끌기 = onView('pan',{dx,dy}), 두 손가락 = onView('pinch',{k,cx,cy}),
   휠 = pinch, 두 번 탭 = onView('dtap'), 탭 = onView('tap'). 걷기·카메라 회전 값은 건드리지 않는다. */
(function (root) {
  'use strict';
  function create(canvas) {
    var ctl = {
      joyX: 0, joyY: 0, kx: 0, ky: 0,
      yaw: 0, pitch: FEEL.pitchDefault, look: 0, zoom: 1,
      // 손맛(FEEL, stepLook): zoomS = 카메라가 쓰는 부드러운 줌(zoom = 사용자가 정한 목표), vYaw·vPitch = 끌기 각속도(rad/s, 손을 떼면 관성으로 줄어든다),
      // accYaw·accPitch = 이번 프레임에 끌어서 돌린 양(stepLook 이 속도로 바꾸고 비운다)
      zoomS: 1, zoomV: 0, vYaw: 0, vPitch: 0, accYaw: 0, accPitch: 0, held: false, coast: false, walkFwdT: 0,
      dragging: false, lastDragT: -99, now: 0,
      // 웹 떠다니는 스틱: 왼쪽 절반 터치(걷는 중에만). 값은 [-1,1], y>0 이 앞.
      moveZone: true, webX: 0, webY: 0, webActive: false,
      // 탭(거의 안 움직이고 짧게 뗌) -> onTap(clientX, clientY). 이동 영역(왼쪽 절반)에 처음 닿으면 onMoveTouch() (자동 걷기 취소용).
      onTap: null, onMoveTouch: null,
      // 앱(호스트)이 고정 이동 손잡이를 그린다(ext): 웹은 스틱을 만들지 않고 화면 전체를 시점 회전·핀치로 쓴다.
      // extPinch: 손가락 하나가 앱 손잡이 위에 있어 웹이 한 손가락만 보는 핀치 — 그동안 한 손가락 회전을 멈춘다(확대는 pinchBy).
      ext: false, extPinch: false,
      // extLook: 걷는 동안 앱(호스트)이 3D 화면 위 손가락을 모두 맡아 읽고(안드로이드 웹뷰는 손잡이를 잡은 채 닿은 다른 손가락의 움직임을
      // 받지 못한다) setInput{look,dx,dy,k} 로 보낸다. look=true 인 동안(앱의 시점 손가락이 닿아 있음) 끌기 상태로 쳐 자동 따라가기가 쉬고,
      // 웹이 혹시 같은 손가락을 받아도 한 번 더 돌리지 않는다.
      extLook: false,
      // 시점 회전 한 번(화면 px 끌기량). 웹 한 손가락 끌기와 앱이 보내는 lookBy 가 같은 식을 쓴다.
      lookBy: function (dx, dy) {
        // 빠진 축은 0(앱은 한 축만 바뀌어도 둘 다 보내지만, 한쪽이 없다고 끌기 전체를 버리지 않는다)
        dx = dx === undefined ? 0 : +dx; dy = dy === undefined ? 0 : +dy; if (!isFinite(dx) || !isFinite(dy)) return;
        ctl.yaw -= dx * 0.0065; ctl.accYaw -= dx * 0.0065;
        // 아래로 끌면 시점이 올라가고, 맨 아래(수평)에서 더 위로 끌면 천장을 올려다본다(look).
        var dp = dy * 0.004, p0 = ctl.pitch;
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
        ctl.accPitch += ctl.pitch - p0;   // 손을 뗀 뒤 관성(stepLook)은 실제로 움직인 pitch 만큼(천장 올려다보기 look 은 관성 없음)
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
      // 앱(호스트)이 실제로 그린 원은 setInput({stick}) 으로 받고(접는 화면·안전 영역에 따라 바뀜), 아직 못 받았으면 왼쪽 아래 기본 원.
      stick: null,
      setStick: function (cx, cy, r) { cx = +cx; cy = +cy; r = +r; ctl.stick = (isFinite(cx) && isFinite(cy) && r > 0) ? { cx: cx, cy: cy, r: r } : null; },
      stickCircle: function () {
        if (ctl.stick) return ctl.stick;
        var h = root.innerHeight || canvas.clientHeight || 640;
        return { cx: 8 + 66, cy: h - 8 - 66, r: 66 };   // RoomMoveZone 기본(지름 132, 여백 8)
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
    function vEmit(kind, o) { if (ctl.onView) { try { ctl.onView(kind, o || {}); } catch (e) { if (root.console) console.error('[room] view gesture', e); } } }
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
    if (!s.follow || s.seated || ctl.dragging || ctl.extLook || ctl.coast) { ctl.walkFwdT = 0; return 0; }
    var F = FEEL, before = ctl.yaw, since = s.t - ctl.lastDragT, df = wrapA(s.meYaw - ctl.yaw);
    if (s.walkSt) {
      if (since > 1.5) ctl.yaw += df * (1 - Math.exp(-s.dt * 1.2));
    } else if (F.recenter && !s.spot && since > F.recenterIdle && s.speed > F.recenterSpeed && Math.abs(df) < F.recenterCone) {
      ctl.walkFwdT = (ctl.walkFwdT || 0) + s.dt;
      var u = (ctl.walkFwdT - F.recenterWalk) / F.recenterRamp; u = u < 0 ? 0 : u > 1 ? 1 : u;
      if (u > 0) ctl.yaw += df * (1 - Math.exp(-s.dt * F.recenterRate * u * u * (3 - 2 * u)));
    } else ctl.walkFwdT = 0;
    return ctl.yaw - before;
  }
  // ---- 손맛(게임식 카메라·걷기,  §손맛) — 휴대폰에서 써 본 뒤 고칠 값은 모두 여기 ----
  // 모든 감쇠는 dt 기반 지수식(exp(−dt/τ) · 임계 감쇠 스프링 닫힌 꼴)이라 30·60·120Hz 에서 같게 느껴진다. 긴 프레임은 main.js 가 dt ≤ 0.05초로 자른다.
  var FEEL = {
    // 기본 구도(게임식 3인칭, 2026-11-23): 팔 길이 boomDist(m) × 줌, 팔 각도 pitchDefault(rad, 약 11°) → 카메라는 발 위 약 2m(머리 조금 위),
    boomDist: 5.0, pitchDefault: 0.2, lookDrop: 0.25,
    // 시점 관성: 끄는 동안 각속도를 lookVelTau 로 고르게 재고, 손을 떼면 그 속도(상한 lookMaxYaw·lookMaxPitch)로 계속 돌다가 lookFriction(τ, 초)으로 줄어 멈춘다
    // (초당 2rad 로 뗐으면 약 0.45초에 멈추고 τ × 속도 ≈ 0.24rad 더 돈다). 거의 멈춘 채 뗐거나(lookStop 아래) 탭이면 바로 멈춘다. 다시 닿으면 즉시 멈춘다.
    lookVelTau: 0.05, lookFriction: 0.12, lookStop: 0.04, lookMaxYaw: 5.0, lookMaxPitch: 2.5,
    // pitch 범위(끌기와 같은 값)와 탄성 끝: 관성으로 끝에 가까워지면(lookSoft rad 안) 속도를 더 빨리 죽여 부드럽게 선다(딱 멈추지 않는다)
    pitchMin: 0.06, pitchMax: 1.25, lookSoft: 0.15, lookEdgeTau: 0.04,
    // 줌: 핀치·휠·설정이 정한 zoom 으로 zoomS 가 임계 감쇠 스프링(각진동수 zoomOmega)으로 따라간다 — 튀지 않고 조금 미끄러지듯
    zoomOmega: 12,
    // 따라가기: 카메라 피벗(아바타 가슴)은 임계 감쇠 스프링(followOmega, 높이는 followOmegaY) — 출발·정지에 살짝 늦고 넘치거나 출렁이지 않는다.
    // 걷는 속도에서 늦음 = 2 × 속도 / ω(1.4m/s 에 약 0.3m). followSnap(m) 넘게 떨어지면(순간 이동) 바로
    followOmega: 9, followOmegaY: 12, followSnap: 1.5,
    // 카메라가 아주 천천히(recenterRate /s, recenterRamp 초에 걸쳐 세짐) 아바타 뒤로 돈다. 끄려면 recenter: false
    recenter: true, recenterIdle: 2.0, recenterWalk: 1.0, recenterRate: 0.45, recenterRamp: 1.5, recenterCone: 1.2, recenterSpeed: 0.6,
    // 걷기: 손잡이 속도로 가속 τ moveAccelTau(0.3초에 92%), 손을 떼면(또는 느려지면) moveDecelTau 로 미끄러지듯 선다(1.4m/s 에서 약 0.32초·0.1m), 몸 돌리기 turnRate /s.
    // moveDecelTau 를 더 늘리면 멈추는 동안 디딘 발이 미끄러진다(gait.test 「출발·정지」 미끄러짐 5% — 0.08 에서 5.0%, 0.09 에서 5.6%)
    // 누르기 이동(자동 걷기)은 길을 따라가야 해서 예전처럼 빠르게(autoWalkRate /s)
    moveAccelTau: 0.12, moveDecelTau: 0.075, moveStop: 0.02, turnRate: 9, autoWalkRate: 12,
    // 손잡이: 가운데 joyDead 안은 0, 그 밖은 0..1 로 다시 펴서 joyLinear·u + (1 − joyLinear)·u² (가운데 근처는 2차 — 천천히 정확하게 걷기)
    joyDead: 0.12, joyLinear: 0.35,
    // 1인칭(「시점」 단추로 고를 때만): 눈으로 들어가고 나오는 시간(초, smoothstep)
    fpBlend: 0.5
  };
  // 임계 감쇠 스프링 한 축(닫힌 꼴 — dt 에 상관없이 정확): s = {x, v}, 목표 x1, 각진동수 w
  function spring1(s, x1, w, dt) {
    var e = s.x - x1, a = s.v + w * e, ex = Math.exp(-w * dt);
    s.x = x1 + (e + a * dt) * ex; s.v = (s.v - w * a * dt) * ex;
    return s.x;
  }
  var SP1 = { x: 0, v: 0 };
  // 프레임마다 한 번(main.js updateCamera): 끌기 속도 재기 → 손을 떼면 관성, 줌 스프링. 관성으로 도는 동안은 '만지는 중'으로 친다(자동 따라가기 쉼)
  function stepLook(ctl, dt) {
    var F = FEEL, held = !!(ctl.dragging || ctl.extLook);
    if (!(dt > 0)) dt = 0;
    if (held) {
      if (!ctl.held) { ctl.vYaw = 0; ctl.vPitch = 0; }   // 닿는 순간: 관성 멈춤(탭은 바로 선다)
      if (dt > 1e-4) {
        var kv = 1 - Math.exp(-dt / F.lookVelTau);
        ctl.vYaw += (ctl.accYaw / dt - ctl.vYaw) * kv; ctl.vPitch += (ctl.accPitch / dt - ctl.vPitch) * kv;
      }
      ctl.coast = false;
    } else {
      if (ctl.held) {   // 뗀 순간: 속도 상한, 거의 멈춘 채 뗐으면 바로 선다
        ctl.vYaw = Math.max(-F.lookMaxYaw, Math.min(F.lookMaxYaw, ctl.vYaw)); ctl.vPitch = Math.max(-F.lookMaxPitch, Math.min(F.lookMaxPitch, ctl.vPitch));
        if (Math.abs(ctl.vYaw) < F.lookStop * 2) ctl.vYaw = 0;
        if (Math.abs(ctl.vPitch) < F.lookStop * 2) ctl.vPitch = 0;
      }
      var ex = Math.exp(-dt / F.lookFriction), mv = F.lookFriction * (1 - ex);   // 지수 감속의 정확한 적분: 이동 = v·τ·(1 − e^(−dt/τ))
      if (ctl.vYaw !== 0) { ctl.yaw += ctl.vYaw * mv; ctl.vYaw *= ex; if (Math.abs(ctl.vYaw) < F.lookStop) ctl.vYaw = 0; }
      if (ctl.vPitch !== 0) {
        var dp = ctl.vPitch * mv, edge = ctl.vPitch > 0 ? F.pitchMax - ctl.pitch : ctl.pitch - F.pitchMin;
        if (edge < F.lookSoft) {   // 탄성 끝: 가까울수록 더 빨리 죽인다 → 끝에 닿기 전에 부드럽게 선다
          var u = Math.max(0, edge) / F.lookSoft;
          dp *= u; ctl.vPitch *= Math.exp(-dt / F.lookEdgeTau * (1 - u));
        }
        ctl.pitch = Math.max(F.pitchMin, Math.min(F.pitchMax, ctl.pitch + dp));
        ctl.vPitch *= ex; if (Math.abs(ctl.vPitch) < F.lookStop) ctl.vPitch = 0;
      }
      ctl.coast = ctl.vYaw !== 0 || ctl.vPitch !== 0;
      if (ctl.coast) ctl.lastDragT = ctl.now;
    }
    ctl.held = held; ctl.accYaw = 0; ctl.accPitch = 0;
    // 줌 스프링(zoom = 목표). 처음·순간 복원은 zoomSnap 으로
    if (ctl.zoomSnap || !(ctl.zoomS > 0)) { ctl.zoomS = ctl.zoom; ctl.zoomV = 0; ctl.zoomSnap = false; }
    else { SP1.x = ctl.zoomS; SP1.v = ctl.zoomV; spring1(SP1, ctl.zoom, F.zoomOmega, dt); ctl.zoomS = SP1.x; ctl.zoomV = SP1.v; }
  }
  // 카메라 피벗 따라가기(임계 감쇠, 축마다). s = createFollow(); s.step(x,y,z, dt, snap) → s.x,s.y,s.z
  function createFollow() {
    var s = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ok: false }, A = { x: 0, v: 0 };
    s.step = function (x, y, z, dt, snap) {
      var F = FEEL;
      if (!s.ok || snap || Math.abs(x - s.x) + Math.abs(y - s.y) + Math.abs(z - s.z) > F.followSnap) { s.x = x; s.y = y; s.z = z; s.vx = s.vy = s.vz = 0; s.ok = true; return s; }
      A.x = s.x; A.v = s.vx; spring1(A, x, F.followOmega, dt); s.x = A.x; s.vx = A.v;
      A.x = s.z; A.v = s.vz; spring1(A, z, F.followOmega, dt); s.z = A.x; s.vz = A.v;
      A.x = s.y; A.v = s.vy; spring1(A, y, F.followOmegaY, dt); s.y = A.x; s.vy = A.v;
      return s;
    };
    s.reset = function () { s.ok = false; };
    return s;
  }
  // 손잡이 값(x,y: -1..1) → 걷기 입력(가운데 죽은 구역 + 부드러운 곡선). 방향은 그대로, 크기만 바꾼다
  function shapeJoy(x, y, out) {
    var F = FEEL, m = Math.sqrt(x * x + y * y);
    if (!(m > F.joyDead)) { out.x = 0; out.y = 0; return out; }
    var u = (Math.min(1, m) - F.joyDead) / (1 - F.joyDead), s = u * (F.joyLinear + (1 - F.joyLinear) * u);
    out.x = x / m * s; out.y = y / m * s;
    return out;
  }
  // 걷기 속도 한 프레임(me.vx·vz → 목표 tvx·tvz): 빨라질 때 moveAccelTau, 느려질 때 moveDecelTau(자동 걷기는 auto=true — autoWalkRate)
  // me.mvx·mvz = 이 프레임의 평균 속도(지수식의 정확한 적분 — 이동은 mvx·dt 로 해야 30·60·120Hz 에서 같은 거리를 간다)
  function moveStep(me, tvx, tvz, dt, auto) {
    var F = FEEL, tau;
    if (auto) tau = 1 / F.autoWalkRate;
    else {
      var cur = me.vx * me.vx + me.vz * me.vz, tgt = tvx * tvx + tvz * tvz;
      tau = tgt >= cur ? F.moveAccelTau : F.moveDecelTau;
    }
    var e = Math.exp(-dt / tau), avg = dt > 1e-6 ? tau / dt * (1 - e) : 1;
    me.mvx = tvx + (me.vx - tvx) * avg; me.mvz = tvz + (me.vz - tvz) * avg;
    me.vx = tvx + (me.vx - tvx) * e; me.vz = tvz + (me.vz - tvz) * e;
    if (tvx === 0 && tvz === 0 && me.vx * me.vx + me.vz * me.vz < F.moveStop * F.moveStop) { me.vx = 0; me.vz = 0; }
    return me;
  }
  root.RoomControls = { create: create, followStep: followStep, FEEL: FEEL, stepLook: stepLook, createFollow: createFollow, shapeJoy: shapeJoy, moveStep: moveStep, spring1: spring1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RoomControls;   // 시험(Node)
})(typeof window !== 'undefined' ? window : this);
