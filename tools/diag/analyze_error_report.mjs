#!/usr/bin/env node
// 로사리움 「오류 기록 보내기」 파일 분석기(lib/diag/diag_report.dart 가 만든 rosarium-diag-*.txt).
//
//   node tools/diag/analyze_error_report.mjs <rosarium-diag-*.txt> [--json] [--crumbs N]
//
// 파일 형식(JSON Lines, 한 줄에 JSON 하나):
//   {type:'header', format:'rosarium-diag', v:1, app, buildId, mode, os, model, screen, fold, locale, theme, settings, stats, backup, session, counts}
//   {type:'touchTrace', ...}                         개발용 빌드만(성당 터치 기록 요약)
//   {k:'e', id, t, src, type, msg, stack, lib, n, last, d, x}   오류(src: flutter|platform|js|native|native_crash|caught|bootstrap)
//   {k:'c', t, lv, ev, d}                            발자취(lv: i 동작 · d 데이터 경로 · w 주의)
//   {type:'end', errors, crumbs}                     끝 표시(없으면 잘린 파일)
// 출력: 기기·앱 머리, 오류 종류별 수, 마지막 오류와 스택, 그 직전 발자취(기본 30개), 백업 상태와 사유 코드, 실행(세션) 흐름.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function parseReport(text) {
  let header = null;
  let end = null;
  let touchTrace = null;
  const errors = [];
  const crumbs = [];
  const bad = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let o;
    try { o = JSON.parse(line); } catch (e) { bad.push(i + 1); return; }
    if (!o || typeof o !== 'object') { bad.push(i + 1); return; }
    if (o.type === 'header') header = o;
    else if (o.type === 'end') end = o;
    else if (o.type === 'touchTrace') touchTrace = o;
    else if (o.k === 'e') errors.push(o);
    else if (o.k === 'c') crumbs.push(o);
  });
  const byT = (a, b) => (a.t || 0) - (b.t || 0);
  errors.sort(byT);
  crumbs.sort(byT);
  return { header, errors, crumbs, end, touchTrace, bad };
}

const inc = (m, k, n = 1) => { m[k] = (m[k] || 0) + n; };

/** 백업·데이터 경로 사건의 사유 코드 모음: [{ev, code, n, lastT}] */
function reasonCodes(crumbs) {
  const m = new Map();
  for (const c of crumbs) {
    const ev = c.ev || '';
    const isBackupish = /^(autobackup|backup|vault|import|restore|records|save_fail|diag_export)/.test(ev);
    if (!isBackupish && c.lv !== 'd') continue;
    const d = c.d || {};
    const code = d.code ?? d.out ?? d.err ?? '';
    const key = `${ev}|${code}`;
    const cur = m.get(key) || { ev, code: String(code), n: 0, lastT: 0 };
    cur.n++;
    cur.lastT = Math.max(cur.lastT, c.t || 0);
    m.set(key, cur);
  }
  return [...m.values()].sort((a, b) => b.lastT - a.lastT);
}

export function analyze(rep, { crumbsBefore = 30 } = {}) {
  const { header, errors, crumbs } = rep;
  const bySrc = {};
  const byType = {};
  let total = 0;
  for (const e of errors) {
    const n = e.n || 1;
    total += n;
    inc(bySrc, e.src || '?', n);
    inc(byType, `${e.src || '?'}:${e.type || '?'}`, n);
  }
  const last = errors.length ? errors[errors.length - 1] : null;
  const lastT = last ? (last.last || last.t) : null;
  const pivot = last ? last.t : null;
  const before = (pivot == null ? crumbs : crumbs.filter((c) => c.t <= pivot)).slice(-crumbsBefore);
  const sessions = crumbs.filter((c) => c.ev === 'app_start').map((c) => ({ t: c.t, sess: c.d && c.d.sess }));
  const lastScreen = [...before].reverse().find((c) => c.ev === 'route' || c.ev === 'screen');
  return {
    header,
    truncated: !rep.end,
    badLines: rep.bad,
    errorCount: { entries: errors.length, total, bySrc, byType },
    unexpected: errors.filter((e) => e.x).length,
    lastError: last,
    lastErrorT: lastT,
    crumbsBefore: before,
    lastScreen: lastScreen ? (lastScreen.d && (lastScreen.d.to || lastScreen.d.id)) : null,
    backup: header && header.backup ? header.backup : null,
    reasons: reasonCodes(crumbs),
    sessions,
    touchTrace: rep.touchTrace,
    crumbCount: crumbs.length,
  };
}

function ts(t, tzMin) {
  if (typeof t !== 'number') return '?';
  const d = new Date(t + (tzMin || 0) * 60000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function rel(t, pivot) {
  if (pivot == null || typeof t !== 'number') return '';
  const s = (t - pivot) / 1000;
  const a = Math.abs(s);
  const txt = a < 120 ? `${s.toFixed(1)}s` : a < 7200 ? `${(s / 60).toFixed(1)}m` : `${(s / 3600).toFixed(1)}h`;
  return (s > 0 ? '+' : '') + txt;
}

function detail(d) {
  if (!d || typeof d !== 'object') return '';
  return Object.entries(d).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ');
}

export function format(r) {
  const h = r.header || {};
  const tz = h.tzOffsetMin || 0;
  const out = [];
  const p = (s = '') => out.push(s);
  p('== 기기·앱 ==');
  if (!r.header) p('머리 줄 없음 — 로사리움 오류 기록 파일이 맞는지 확인');
  else {
    p(`앱 ${h.app || '?'}${h.buildId ? ` (빌드 ${h.buildId})` : ''} · ${h.mode || '?'}${h.devBuild ? ' · 개발용' : ''}`);
    p(`${h.os || '?'} · ${h.model || '?'} · ${h.locale || '?'}`);
    const sc = h.screen || {};
    const lg = Array.isArray(sc.logical) ? sc.logical.join('x') : '?';
    p(`화면 ${lg} dpr ${sc.dpr ?? '?'} · 접힘 ${h.fold || '?'} · 글자 배율 ${h.textScale ?? '?'}`);
    const th = h.theme || {};
    p(`테마 ${th.brightness || '?'} · 스킨 ${th.skin || '?'}${th.dynamicColor != null ? ` · 기기 색 ${th.dynamicColor}` : ''}`);
    p(`보낸 시각 ${h.exportedAt || '?'} · 실행 #${h.session ?? '?'}`);
    const st = h.stats || {};
    p(`기도 기록 ${st.records ?? '?'}건(7일 ${st.last7d ?? '?'} · 마침 ${st.completed ?? '?'})`);
    const s = h.settings || {};
    const keys = Object.keys(s);
    if (keys.length) p(`설정 ${keys.length}개: ${keys.map((k) => `${k}=${s[k]}`).join(' ')}`);
  }
  if (r.truncated) p('⚠ 끝 표시가 없다 — 파일이 잘렸을 수 있다');
  if (r.badLines && r.badLines.length) p(`⚠ 읽지 못한 줄 ${r.badLines.length}개: ${r.badLines.slice(0, 10).join(',')}`);
  p();
  p(`== 오류 ${r.errorCount.total}건(${r.errorCount.entries}줄, 예상 못 한 것 ${r.unexpected}줄) ==`);
  const src = Object.entries(r.errorCount.bySrc).sort((a, b) => b[1] - a[1]);
  if (!src.length) p('오류 없음');
  else {
    p('출처별: ' + src.map(([k, v]) => `${k} ${v}`).join(' · '));
    for (const [k, v] of Object.entries(r.errorCount.byType).sort((a, b) => b[1] - a[1]).slice(0, 15)) p(`  ${String(v).padStart(4)}  ${k}`);
  }
  p();
  const e = r.lastError;
  p('== 마지막 오류 ==');
  if (!e) p('없음');
  else {
    p(`${ts(e.t, tz)} [${e.src}] ${e.type}${(e.n || 1) > 1 ? ` ×${e.n}(마지막 ${ts(e.last, tz)})` : ''}${e.x ? ' · 안내 띄움' : ''}`);
    if (e.lib) p(`곳: ${e.lib}`);
    if (e.d) p(`세부: ${detail(e.d)}`);
    p(`문구: ${e.msg || ''}`);
    if (e.stack) p(String(e.stack).split('\n').map((l) => '  ' + l).join('\n'));
    if (r.lastScreen) p(`그때 화면: ${r.lastScreen}`);
  }
  p();
  p(`== ${e ? '마지막 오류 직전' : '최근'} 발자취 ${r.crumbsBefore.length}개 ==`);
  for (const c of r.crumbsBefore) {
    p(`${rel(c.t, e ? e.t : null).padStart(8)}  ${ts(c.t, tz).slice(11)}  ${c.lv === 'd' ? 'D' : c.lv === 'w' ? 'W' : ' '} ${c.ev}${c.d ? '  ' + detail(c.d) : ''}`);
  }
  p();
  p('== 백업 상태 ==');
  const b = r.backup;
  if (!b) p('머리에 백업 상태 없음');
  else {
    p(`자동 백업 ${b.autoWanted ? '켬' : '끔'}(지금 ${b.autoOn ? '동작' : '멈춤'}) · 폴더 ${b.folder}(${b.folderCode}) · 연속 실패 ${b.failN}${b.failCode ? ` 사유 ${b.failCode}` : ''} · 성공한 적 ${b.everOk ? '있음' : '없음'}`);
    p(`마지막 자동 ${b.autoLastOkAgoH ?? '-'}시간 전 · 마지막 백업 ${b.lastBackupAgoH ?? '-'}시간 전 · 파일 저장 ${b.lastFileAgoH ?? '-'}시간 전 · 기록 ${b.records}`);
    p(`기기 안 금고 ${b.vaultReady ? '준비됨' : '준비 전'}${b.vaultOffer ? ' · 되살리기 제안 중' : ''}${b.vaultLastError ? ` · 마지막 오류 ${b.vaultLastError}` : ''}`);
  }
  if (r.reasons.length) {
    p('사유 코드(발자취):');
    for (const x of r.reasons.slice(0, 20)) p(`  ${String(x.n).padStart(4)}  ${x.ev}${x.code ? ` code=${x.code}` : ''}  (마지막 ${ts(x.lastT, tz)})`);
  }
  p();
  p(`== 실행 ${r.sessions.length}번(발자취 ${r.crumbCount}개 안) ==`);
  for (const s of r.sessions.slice(-10)) p(`  #${s.sess}  ${ts(s.t, tz)}`);
  if (r.touchTrace) {
    p();
    p(`== 터치 기록 요약(개발용) == ${r.touchTrace.count ?? '?'}개 · ${JSON.stringify(r.touchTrace.counters || {})}`);
  }
  return out.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  if (!file) {
    console.error('사용법: node tools/diag/analyze_error_report.mjs <rosarium-diag-*.txt> [--json] [--crumbs N]');
    process.exit(2);
  }
  const ci = args.indexOf('--crumbs');
  const n = ci >= 0 ? Number(args[ci + 1]) || 30 : 30;
  const r = analyze(parseReport(fs.readFileSync(file, 'utf8')), { crumbsBefore: n });
  console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : format(r));
}
