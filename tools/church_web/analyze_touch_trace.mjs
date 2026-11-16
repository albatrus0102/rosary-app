#!/usr/bin/env node
// 성당 터치 기록(개발용 APK 의 '터치 기록 보내기', lib/church/church_touch_trace.dart) 분석기.
//
//   node tools/church_web/analyze_touch_trace.mjs <rosarium_touch_*.jsonl> [--json]
//
// 파일 형식(JSON Lines): 첫 줄 머리 {type:'header', device, screen, webview, buildId, counters, jsSummary, ...},
// 그 뒤 한 줄에 한 사건 {t(ms, 기기 시계), s, k, ...}:
//   s:'f'  Flutter 가 본 포인터  k:'p' {ty:down|move|up|cancel, id, x, y, r: stick|look|pinch|view|none|hud|web}
//                                 k:'dec' {what: stick-grab|look-start|pinch-start|view-up|stick-release|screen|church-enter|...}
//   s:'tx' 웹으로 보낸 메시지      k:'msg'|'fail'|'drop' {m: setJoystick|setInput|tapAt|cancelWalk, a: 인자, err}
//   s:'js' 웹이 기록한 것          k:'hdr' {ua,dpr,w,h} | 'p' {ty,id,x,y,pt} | 'in' {a: 받은 setInput, yaw, pitch}
//                                 | 'f' {yaw,pitch,zoom, ly: 앱 시점 입력이 바꾼 yaw, fy: 자동 따라가기가 바꾼 yaw, joy, spd, xl, dr, rig}
//                                 | 'apiMissing' {m} | 'drop' {n}
// 출력: 층별 손가락, 시점 메시지 보냄/받음, 이동 중 yaw 변화(시점 입력 vs 따라가기), 그리고 사슬이 처음 끊긴 곳.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function parseTrace(text) {
  let header = null;
  const events = [];
  const bad = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let o;
    try { o = JSON.parse(line); } catch (e) { bad.push(i + 1); return; }
    if (o && o.type === 'header') { header = o; return; }
    if (o && typeof o.t === 'number') events.push(o);
  });
  events.sort((a, b) => a.t - b.t);
  return { header, events, bad };
}

const isLookMsg = (a) => a && (a.dx !== undefined || a.dy !== undefined);
const inc = (m, k, n = 1) => { m[k] = (m[k] || 0) + n; };

/** 손잡이 손가락과 장면 손가락(look/pinch)이 동시에 닿아 있던 구간들 [{t0, t1, stick, view}] */
function multiTouchEpisodes(ev) {
  const down = new Map();   // id -> role
  const out = [];
  let cur = null;
  for (const e of ev) {
    if (e.s !== 'f' || e.k !== 'p') continue;
    if (e.ty === 'down') down.set(e.id, e.r);
    const roles = [...down.values()];
    const both = roles.includes('stick') && roles.some((r) => r === 'look' || r === 'pinch');
    if (both && !cur) cur = { t0: e.t, t1: e.t, stick: null, view: [] };
    if (cur) {
      cur.t1 = e.t;
      for (const [id, r] of down) {
        if (r === 'stick') cur.stick = id;
        else if ((r === 'look' || r === 'pinch') && !cur.view.includes(id)) cur.view.push(id);
      }
    }
    if (e.ty === 'up' || e.ty === 'cancel') down.delete(e.id);
    const still = [...down.values()];
    if (cur && !(still.includes('stick') && still.some((r) => r === 'look' || r === 'pinch'))) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

/** 조이스틱이 0 이 아니던 구간들(보낸 setJoystick 기준) */
function stickIntervals(ev) {
  const out = [];
  let on = null;
  for (const e of ev) {
    if (e.s !== 'tx' || e.m !== 'setJoystick' || e.k !== 'msg') continue;
    const moving = Math.abs(+e.a.x || 0) > 0 || Math.abs(+e.a.y || 0) > 0;
    if (moving && on === null) on = e.t;
    if (!moving && on !== null) { out.push([on, e.t]); on = null; }
  }
  if (on !== null) out.push([on, ev.length ? ev[ev.length - 1].t : on]);
  return out;
}

const within = (t, a, b, pad = 0) => t >= a - pad && t <= b + pad;

export function analyze({ header, events }) {
  const ev = events;
  const f = ev.filter((e) => e.s === 'f');
  const tx = ev.filter((e) => e.s === 'tx');
  const js = ev.filter((e) => e.s === 'js');
  const r = { header: header || null, span: ev.length ? [ev[0].t, ev[ev.length - 1].t] : null, counts: {} };

  // 1) 층별 손가락
  const fDown = {}, fMove = {};
  for (const e of f) if (e.k === 'p') { if (e.ty === 'down') inc(fDown, e.r || '?'); if (e.ty === 'move') inc(fMove, e.r || '?'); }
  const jsPtr = {};
  for (const e of js) if (e.k === 'p') inc(jsPtr, e.ty);
  r.pointers = { flutterDownByRole: fDown, flutterMoveByRole: fMove, webPointerEvents: jsPtr };
  r.decisions = {};
  for (const e of f) if (e.k === 'dec') inc(r.decisions, e.what);

  // 2) 메시지 보냄/받음
  const sentLook = tx.filter((e) => e.k === 'msg' && e.m === 'setInput' && isLookMsg(e.a));
  const sentPinch = tx.filter((e) => e.k === 'msg' && e.m === 'setInput' && e.a && e.a.k !== undefined);
  const recvLook = js.filter((e) => e.k === 'in' && isLookMsg(e.a));
  const recvPinch = js.filter((e) => e.k === 'in' && e.a && e.a.k !== undefined);
  r.messages = {
    setJoystick: tx.filter((e) => e.k === 'msg' && e.m === 'setJoystick').length,
    lookSent: sentLook.length,
    lookReceived: recvLook.length,
    pinchSent: sentPinch.length,
    pinchReceived: recvPinch.length,
    lookOnOff: tx.filter((e) => e.k === 'msg' && e.m === 'setInput' && e.a && e.a.look !== undefined).map((e) => e.a.look),
    failures: tx.filter((e) => e.k === 'fail').map((e) => `${e.m}: ${e.err}`),
    droppedBeforeInit: tx.filter((e) => e.k === 'drop').length,
    apiMissing: [...new Set(js.filter((e) => e.k === 'apiMissing').map((e) => e.m))],
    webTraceItems: js.length,
    webDropped: js.filter((e) => e.k === 'drop').reduce((s, e) => s + (e.n || 0), 0),
  };

  // 3) 이동 중 yaw 변화(웹 프레임 표본 ly/fy 합)
  const frames = js.filter((e) => e.k === 'f');
  const stick = stickIntervals(ev);
  let lookYaw = 0, followYaw = 0, followWhileLook = 0, n = 0;
  for (const e of frames) {
    if (!stick.some(([a, b]) => within(e.t, a, b, 150))) continue;
    n++; lookYaw += Math.abs(e.ly || 0); followYaw += Math.abs(e.fy || 0);
    if (e.xl && e.fy) followWhileLook += Math.abs(e.fy);
  }
  const rigModes = {};
  for (const e of frames) if (e.rig) inc(rigModes, `o${e.rig.o}${e.rig.fp > 0.5 ? '-fp' : ''}`);
  r.whileWalking = { stickIntervals: stick.length, frames: n, yawFromLook: +lookYaw.toFixed(3), yawFromFollow: +followYaw.toFixed(3), followWhileLookHeld: +followWhileLook.toFixed(3), rigModes };

  // 4) 손잡이 + 시점 손가락 동시 구간과 사슬
  const eps = multiTouchEpisodes(ev);
  r.episodes = eps.map((p) => {
    const inEp = (e) => within(e.t, p.t0, p.t1, 0);
    const lookMoves = f.filter((e) => e.k === 'p' && e.ty === 'move' && p.view.includes(e.id) && inEp(e)).length;
    const sent = sentLook.filter((e) => within(e.t, p.t0, p.t1, 100));
    const recv = recvLook.filter((e) => within(e.t, p.t0, p.t1, 1000));
    const fr = frames.filter((e) => within(e.t, p.t0, p.t1, 300));
    const ly = fr.reduce((s, e) => s + Math.abs(e.ly || 0), 0);
    const fy = fr.reduce((s, e) => s + Math.abs(e.fy || 0), 0);
    const fails = tx.filter((e) => e.k === 'fail' && e.m === 'setInput' && within(e.t, p.t0, p.t1, 100)).length;
    return { t0: p.t0, ms: p.t1 - p.t0, stick: p.stick, view: p.view, lookMoves, lookSent: sent.length, lookReceived: recv.length, fails, frames: fr.length, yawFromLook: +ly.toFixed(3), yawFromFollow: +fy.toFixed(3) };
  });
  r.chain = chain(r, f, js);
  return r;
}

/** 사슬: 손가락(Flutter) → 역할 → 보냄 → 웹이 받음 → yaw 변화 → 따라가기가 안 되돌림. 처음 끊긴 곳을 돌려준다. */
function chain(r, f, js) {
  const steps = [];
  const ok = (name, pass, why) => { steps.push({ name, ok: !!pass, why }); return !!pass; };
  const roles = r.pointers.flutterDownByRole;
  const total = Object.values(roles).reduce((a, b) => a + b, 0);
  const done = () => ({ steps, broken: steps.find((s) => !s.ok) || null });
  if (!ok('flutter-pointers', total > 0, total ? `${total}개 손가락` : 'Flutter 가 본 손가락이 없다(기록이 켜지지 않았거나 다른 화면에서 찍음)')) return done();
  const ep = r.episodes;
  if (!ok('stick+look-together', ep.length > 0,
    ep.length ? `${ep.length}번` : `손잡이와 장면 손가락이 동시에 닿은 적이 없다. 역할별 down: ${JSON.stringify(roles)}` +
      (roles.hud ? ' — 두 번째 손가락이 HUD(단추·칩) 위에 닿았을 수 있다' : '') + (roles.web ? ' — 입력 층이 없을 때(앉음) 웹이 받았다' : ''))) return done();
  const best = ep.reduce((a, b) => (b.ms > a.ms ? b : a));
  const at = `구간 t=${best.t0} (${best.ms}ms)`;
  if (!ok('flutter-look-moves', best.lookMoves > 0, best.lookMoves ? `${at}: 시점 손가락 움직임 ${best.lookMoves}` : `${at}: 시점 손가락이 움직이지 않았다(또는 Flutter 가 move 를 받지 못함)`)) return done();
  if (!ok('look-sent', best.lookSent > 0, best.lookSent ? `${best.lookSent}개 보냄` : `${at}: 움직임은 있는데 setInput{dx,dy} 를 보내지 않았다(앱 입력 층/appLook 고장)`)) return done();
  if (!ok('send-ok', best.fails === 0 && !r.messages.apiMissing.includes('setInput'),
    r.messages.apiMissing.includes('setInput') ? '웹에 ChurchAPI.setInput 이 없다(bridge.js METHODS) — 호출이 버려짐' : best.fails ? `보내기 실패 ${best.fails}: ${r.messages.failures[0]}` : '실패 없음')) return done();
  if (!ok('web-trace', js.length > 0, js.length ? `웹 기록 ${js.length}개` : '웹 기록이 하나도 없다: setInput{trace:true} 가 웹에 닿지 않았다 — setInput 자체가 웹에 닿지 않는 고장일 가능성이 크다')) return done();
  if (!ok('look-received', best.lookReceived > 0, best.lookReceived ? `${best.lookReceived}개 받음 / ${best.lookSent}개 보냄` : `${at}: 보낸 ${best.lookSent}개 중 웹이 받은 것이 없다`)) return done();
  if (!ok('yaw-changed', best.yawFromLook > 0, best.yawFromLook ? `시점 입력으로 yaw ${best.yawFromLook} rad` : '받았는데 yaw 가 바뀌지 않았다(controls.lookBy/값 단위 확인)')) return done();
  ok('not-undone', best.yawFromFollow <= best.yawFromLook * 0.5,
    `따라가기 ${best.yawFromFollow} rad vs 시점 ${best.yawFromLook} rad` + (best.yawFromFollow > best.yawFromLook * 0.5 ? ' — 자동 따라가기가 시점을 되돌린다' : ''));
  return done();
}

export function format(r) {
  const L = [];
  const h = r.header || {};
  const d = h.device || {}, s = h.screen || {}, w = h.webview || {};
  L.push('== 성당 터치 기록 요약 ==');
  L.push(`기기: ${d.manufacturer || '?'} ${d.model || '?'} (${d.device || '?'}) Android ${d.android || '?'} SDK ${d.sdk || '?'} · 앱 ${d.app || '?'} · 빌드 ${h.buildId || '-'}`);
  L.push(`화면: 논리 ${JSON.stringify(s.logical || '?')} DPR ${s.dpr || '?'} · 접힘 ${JSON.stringify((s.features || []).map((x) => `${x.type}/${x.state}`))}`);
  L.push(`웹뷰: ${w.plugin || '?'} · UA ${w.ua || '?'}`);
  if (r.span) L.push(`기간: ${((r.span[1] - r.span[0]) / 1000).toFixed(1)}초`);
  L.push('');
  L.push(`[층별 손가락] Flutter down: ${JSON.stringify(r.pointers.flutterDownByRole)} move: ${JSON.stringify(r.pointers.flutterMoveByRole)}`);
  L.push(`             웹이 받은 포인터: ${JSON.stringify(r.pointers.webPointerEvents)}`);
  L.push(`[분류 결정] ${JSON.stringify(r.decisions)}`);
  const m = r.messages;
  L.push(`[메시지] 시점 보냄 ${m.lookSent} / 받음 ${m.lookReceived} · 확대 보냄 ${m.pinchSent} / 받음 ${m.pinchReceived} · setJoystick ${m.setJoystick}`);
  L.push(`         look on/off ${m.lookOnOff.length}회 · 실패 ${m.failures.length} · init 전 버림 ${m.droppedBeforeInit} · 웹 기록 ${m.webTraceItems}(버림 ${m.webDropped})`);
  if (m.apiMissing.length) L.push(`         !! 웹에 없는 메서드: ${m.apiMissing.join(', ')}`);
  if (m.failures.length) L.push(`         !! 첫 실패: ${m.failures[0]}`);
  const ww = r.whileWalking;
  L.push(`[이동 중 yaw] 조이스틱 구간 ${ww.stickIntervals} · 프레임 ${ww.frames} · 시점 입력 ${ww.yawFromLook} rad · 따라가기 ${ww.yawFromFollow} rad (시점 손가락 중 따라가기 ${ww.followWhileLookHeld}) · 리그 ${JSON.stringify(ww.rigModes)}`);
  L.push(`[손잡이+시점 동시 구간] ${r.episodes.length}개`);
  for (const e of r.episodes.slice(0, 8)) {
    L.push(`  t=${e.t0} ${e.ms}ms stick#${e.stick} view#${e.view.join(',')}: 움직임 ${e.lookMoves} → 보냄 ${e.lookSent} → 받음 ${e.lookReceived} → yaw ${e.yawFromLook} (따라가기 ${e.yawFromFollow})${e.fails ? ` 실패 ${e.fails}` : ''}`);
  }
  L.push('');
  L.push('[사슬]');
  for (const st of r.chain.steps) L.push(`  ${st.ok ? 'OK ' : 'XX '} ${st.name}: ${st.why}`);
  L.push(r.chain.broken ? `>> 처음 끊긴 곳: ${r.chain.broken.name} — ${r.chain.broken.why}` : '>> 사슬 이상 없음(손가락 → 보냄 → 받음 → yaw 변화)');
  return L.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) {
  const file = process.argv[2];
  if (!file) { console.error('사용법: node tools/church_web/analyze_touch_trace.mjs <trace.jsonl> [--json]'); process.exit(2); }
  const t = parseTrace(fs.readFileSync(file, 'utf8'));
  if (t.bad.length) console.error(`읽지 못한 줄: ${t.bad.slice(0, 10).join(', ')}${t.bad.length > 10 ? ' …' : ''}`);
  const r = analyze(t);
  console.log(process.argv.includes('--json') ? JSON.stringify(r, null, 2) : format(r));
}
