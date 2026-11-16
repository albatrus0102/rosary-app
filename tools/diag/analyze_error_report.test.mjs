// analyze_error_report.mjs 를 합성 오류 기록으로 시험한다.
// 실행: node --test tools/diag/analyze_error_report.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseReport, analyze, format } from './analyze_error_report.mjs';

const T0 = 1_763_000_000_000;
const header = {
  type: 'header', format: 'rosarium-diag', v: 1, exportedAt: '2026-11-16T09:30:00.000', tzOffsetMin: 540,
  app: '0.1.0+1', buildId: 'abc123', mode: 'release', devBuild: false, platform: 'android',
  os: 'Android 14 (SDK 34)', model: 'samsung SM-F946N', locale: 'ko-KR',
  screen: { logical: [882, 1104], dpr: 2.4, features: [{ type: 'fold', state: 'postureFlat', bounds: [441, 0, 441, 1104] }] },
  fold: 'fold:postureFlat', textScale: 1.15, theme: { brightness: 'dark', skin: 'advent', dynamicColor: false },
  settings: { haptic: true, prayer_mode: 'solo', church_id: 'myeongdong' },
  stats: { records: 42, last7d: 5, completed: 30 },
  backup: { supported: true, autoWanted: true, autoOn: false, folder: 'noPermission', folderCode: 'no_perm:p0', failN: 3,
    failCode: 'no_folder:no_perm:p0', everOk: true, autoLastOkAgoH: 50.5, lastBackupAgoH: 50.5, lastFileAgoH: null, records: 42,
    vaultReady: true, vaultOffer: false, vaultLastError: null, vaultLastWriteAgoH: 0.1 },
  session: 3, counts: { errors: 3, crumbs: 45, dropped: 0, unexpected: 1 },
};

function synth({ end = true, noErrors = false } = {}) {
  const lines = [JSON.stringify(header)];
  const errs = noErrors ? [] : [
    { k: 'e', id: 'a.0', t: T0 + 1000, src: 'js', type: 'error', msg: 'Uncaught TypeError: x is undefined', n: 1, d: { file: 'main.js', line: 120 } },
    { k: 'e', id: 'a.1', t: T0 + 2000, src: 'native', type: 'SecurityException', msg: 'no perm', lib: 'backup:probe', n: 2 },
    { k: 'e', id: 'b.0', t: T0 + 90_000, src: 'flutter', type: 'StateError', msg: 'Bad state: No element', n: 4, last: T0 + 95_000, x: true,
      lib: 'widgets library', stack: '#0 ListBase.first (dart:collection)\n#1 _PrayerScreenState.build (package:rosary_app/ui/prayer_screen.dart:120:7)' },
  ];
  for (const e of errs) lines.push(JSON.stringify(e));
  const crumbs = [];
  crumbs.push({ k: 'c', t: T0, lv: 'i', ev: 'app_start', d: { sess: 3 } });
  for (let i = 0; i < 40; i++) crumbs.push({ k: 'c', t: T0 + 100 + i * 1000, lv: 'i', ev: 'route', d: { op: 'push', to: i % 2 ? 'prayer' : 'settings' } });
  crumbs.push({ k: 'c', t: T0 + 50_000, lv: 'd', ev: 'autobackup_fail', d: { code: 'no_folder:no_perm:p0', n: 3 } });
  crumbs.push({ k: 'c', t: T0 + 60_000, lv: 'd', ev: 'autobackup_fail', d: { code: 'no_folder:no_perm:p0', n: 4 } });
  crumbs.push({ k: 'c', t: T0 + 85_000, lv: 'i', ev: 'prayer_start', d: { set: 'joyful', mode: 'solo' } });
  crumbs.push({ k: 'c', t: T0 + 89_000, lv: 'i', ev: 'screen', d: { id: 'prayer' } });
  crumbs.push({ k: 'c', t: T0 + 120_000, lv: 'i', ev: 'prayer_finish', d: { completed: false } });
  for (const c of crumbs) lines.push(JSON.stringify(c));
  if (end) lines.push(JSON.stringify({ type: 'end', errors: errs.length, crumbs: crumbs.length }));
  return lines.join('\n') + '\n';
}

test('머리·오류 수·마지막 오류·직전 발자취·백업 사유 코드를 뽑는다', () => {
  const r = analyze(parseReport(synth()));
  assert.equal(r.truncated, false);
  assert.equal(r.errorCount.entries, 3);
  assert.equal(r.errorCount.total, 7); // 1 + 2 + 4
  assert.deepEqual(r.errorCount.bySrc, { flutter: 4, native: 2, js: 1 });
  assert.equal(r.lastError.type, 'StateError');
  assert.equal(r.unexpected, 1);
  // 마지막 오류(t=T0+90s) 이전의 발자취만, 최근 30개
  assert.equal(r.crumbsBefore.length, 30);
  assert.ok(r.crumbsBefore.every((c) => c.t <= T0 + 90_000));
  assert.equal(r.crumbsBefore.at(-1).ev, 'screen');
  assert.ok(!r.crumbsBefore.some((c) => c.ev === 'prayer_finish'), '오류 뒤 발자취는 「직전」에 넣지 않는다');
  assert.equal(r.lastScreen, 'prayer');
  const fail = r.reasons.find((x) => x.ev === 'autobackup_fail');
  assert.equal(fail.code, 'no_folder:no_perm:p0');
  assert.equal(fail.n, 2);
  assert.deepEqual(r.sessions, [{ t: T0, sess: 3 }]);
  const txt = format(r);
  for (const want of [/SM-F946N/, /Android 14/, /fold:postureFlat/, /StateError ×4/, /prayer_screen\.dart:120/,
    /no_folder:no_perm:p0/, /자동 백업 켬\(지금 멈춤\)/, /출처별: flutter 4 · native 2 · js 1/, /직전 발자취 30개/]) {
    assert.match(txt, want);
  }
});

test('오류가 없으면 최근 발자취를 보이고, 끝 표시가 없으면 잘렸다고 알린다', () => {
  const r = analyze(parseReport(synth({ end: false, noErrors: true })), { crumbsBefore: 10 });
  assert.equal(r.lastError, null);
  assert.equal(r.crumbsBefore.length, 10);
  assert.equal(r.crumbsBefore.at(-1).ev, 'prayer_finish');
  assert.equal(r.truncated, true);
  const txt = format(r);
  assert.match(txt, /오류 없음/);
  assert.match(txt, /잘렸을 수 있다/);
});

test('깨진 줄은 세고 넘어간다', () => {
  const rep = parseReport(synth() + '{not json\n');
  assert.equal(rep.bad.length, 1);
  assert.equal(rep.errors.length, 3);
});

test('명령줄: 파일을 읽어 요약을 찍고 --json 도 된다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rosarium-diag-'));
  try {
    const f = path.join(dir, 'rosarium-diag-20261116-093000.txt');
    fs.writeFileSync(f, synth());
    const me = fileURLToPath(new URL('./analyze_error_report.mjs', import.meta.url));
    const txt = execFileSync(process.execPath, [me, f], { encoding: 'utf8' });
    assert.match(txt, /== 마지막 오류 ==/);
    const j = JSON.parse(execFileSync(process.execPath, [me, f, '--json'], { encoding: 'utf8' }));
    assert.equal(j.lastError.type, 'StateError');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
