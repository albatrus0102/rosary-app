/* tour.js — 둘러보기(약 60~90초): 입구에서 걸어 들어와 → 천장을 올려다보고 → 제대 쪽으로 가다 제단 경계에서 멈추고 →
   (성수대가 있는 모형만) 성호 → 초 켜기(정해진 지향) → 앉아 기도 → 마침 넓은 시점. 끝나면 자유롭게 걷는다.
   자막은 페이지가 넘긴 D.captions(video_plan.md 의 자막 줄, 받는 분의 언어와 같을 때만)를 쓰고, 없는 줄은 i18n 기본 자막.
   장면을 몰기만 한다(ChurchAPI). 사용자의 아무 입력(키·누름·휠·단추)이 오면 바로 멈추고 자유 모드로 넘어간다. */
(function (root) {
  'use strict';
  var S = root.DemoShell, I = root.DemoI18N, D = root.DEMO, L = S.L, doc = root.document;
  var caps = D.captions || {}, gen = I.captions[S.lang] || I.captions.en;
  function cap(k) { return caps[k] || gen[k] || ''; }
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

  S.runTour = function () {
    if (S.tour || S.mode !== 'free') return;
    var T = S.tour = { armed: false, stopped: false, t0: Date.now(), log: [] };
    var abortRes; T.aborted = new Promise(function (r) { abortRes = r; });
    $('tourbar').hidden = false; $('hud').hidden = true; $('joy').hidden = true;
    S.caption('');
    function $(id) { return doc.getElementById(id); }
    function mark(s) { T.log.push([Math.round((Date.now() - T.t0) / 100) / 10, s]); }
    T.stop = function () {
      if (T.stopped) return;
      T.stopped = true; abortRes();
      S.api('setJoystick', { x: 0, y: 0 }); S.api('cancelWalk');
      if (S.closeIntent && S.intentBox) S.closeIntent();
      S.caption(''); S.tour = null;
      $('tourbar').hidden = true; $('hud').hidden = false; $('joy').hidden = !S.touch; S.updateActs(); mark('stop');
      root.__tourLog = T.log;
    };
    // 시작 누름이 끝난 뒤부터 입력을 듣는다
    setTimeout(function () { T.armed = true; }, 400);

    function sleep(ms) { return Promise.race([new Promise(function (r) { setTimeout(r, ms); }), T.aborted]); }
    function frame() { return Promise.race([new Promise(function (r) { requestAnimationFrame(r); }), T.aborted]); }
    // 걷기 끝(도착·실패·취소) 기다림. 아바타가 움직이는 동안은 계속 기다리고(느린 기기에서도 끝까지 걷는다),
    // 9초 넘게 꼼짝 않거나 150초가 지나면 멈추고 다음으로 넘어간다.
    async function walk(kind) {
      S.api('walkTo', { kind: kind });
      var t0 = Date.now(); S.lastMove = t0;
      while (!T.stopped) {
        var ev = await Promise.race([S.waitEvent(function (o) { return o.e === 'walkDone' || o.e === 'walkFail' || o.e === 'walkCancel'; }, 3000), T.aborted]);
        if (T.stopped) return null;
        if (ev) return ev.e === 'walkDone' ? ev : null;
        if (Date.now() - S.lastMove > 9000 || Date.now() - t0 > 150000) { S.api('cancelWalk'); return null; }
      }
      return null;
    }
    // 시점 끌기를 ms 동안 부드럽게(dy<0 이면 위를 본다)
    async function look(dy, ms) {
      var t0 = performance.now(), sent = 0;
      while (!T.stopped) {
        var k = Math.min(1, (performance.now() - t0) / ms), tg = dy * ease(k), d = tg - sent;
        sent = tg; if (d) S.api('setInput', { dy: d });
        if (k >= 1) break;
        await frame();
      }
    }
    async function zoomOut(steps) { for (var i = 0; i < steps && !T.stopped; i++) { S.api('setInput', { k: 0.93 }); await sleep(120); } }

    (async function () {
      try {
        S.setView('tp');
        // 1. 들어와서 신랑 따라 걷기
        mark('walk-in'); S.caption(cap('intro'));
        S.api('setJoystick', { x: 0, y: 0.6 });
        await sleep(4000); if (T.stopped) return;
        S.caption(cap('walk')); await sleep(4500); if (T.stopped) return;
        S.api('setJoystick', { x: 0, y: 0 });
        // 2. 천장(궁륭) 올려다보기
        mark('vault'); S.caption(cap('vault'));
        await look(-380, 2600); if (T.stopped) return;
        await sleep(2800); if (T.stopped) return;
        await look(380, 2200); if (T.stopped) return;
        // 3. 제대 쪽으로 — 제단 경계에서 멈춘다(들어가지 못한다)
        mark('altar'); S.caption('');
        var al = await walk('altar'); if (T.stopped) return;
        S.caption(cap('altar'));
        // 도착한 자리가 제단 경계다. 더 가려고 해도 가지 못하는 모습을 잠깐 보인다.
        if (al) { S.api('setJoystick', { x: 0, y: 1 }); await sleep(2200); S.api('setJoystick', { x: 0, y: 0 }); }
        await sleep(2600); if (T.stopped) return;
        // 4. 성수대에서 성호(성수대가 있는 성 베드로·아시시 모형만)
        if (S.stations && S.stations.font > 0) {
          mark('cross'); S.caption('');
          var f = await walk('font'); if (T.stopped) return;
          if (f) { S.caption(cap('cross')); S.api('emote', { e: 1 }); await sleep(6200); if (T.stopped) return; }
        }
        // 5. 초 켜기 — 정해진 지향 목록에서 하나(글 입력 칸이 없다)
        if (S.stations && S.stations.candle > 0) {
          mark('candle'); S.caption('');
          var c = await walk('candle'); if (T.stopped) return;
          if (c) {
            S.caption(cap('candle'));
            await Promise.race([S.waitEvent(function (o) { return o.e === 'near' && o.candle !== null && o.candle !== undefined; }, 1500), T.aborted]);
            if (S.near.candle !== null && S.near.candle !== undefined) await Promise.race([S.lightHere(true, 0), T.aborted]);
            if (T.stopped) return;
            await sleep(5200); if (T.stopped) return;
          }
        }
        // 6. 앉아서 묵주 기도
        mark('sit'); S.caption('');
        var s = await walk('seat'); if (T.stopped) return;
        if (s) {
          S.caption(cap('sit'));
          S.api('sit', { seat: s.seat || undefined });
          await Promise.race([S.waitEvent(function (o) { return o.e === 'seated'; }, 8000), T.aborted]); if (T.stopped) return;
          await sleep(7500); if (T.stopped) return;
        }
        // 7. 마침: 일어나 넓은 시점으로
        mark('outro'); S.caption(cap('outro'));
        if (S.seated) { S.api('stand'); await Promise.race([S.waitEvent(function (o) { return o.e === 'stood'; }, 6000), T.aborted]); if (T.stopped) return; }
        S.setView('tp'); await zoomOut(6); await sleep(4200); if (T.stopped) return;
        mark('end'); T.stop(); S.toast(L.tourEnd);
      } catch (e) { if (root.console) console.error('[demo] tour', e); T.stop(); }
    })();
  };
})(window);
