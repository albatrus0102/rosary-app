import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../analytics/device_reporter.dart';
import '../backup/backup_data.dart';
import '../backup/backup_registry.dart';
import '../backup/backup_service.dart';
import '../church/church_touch_trace.dart';
import '../church/dev_glass.dart';
import '../stats/prayer_stats_store.dart';
import 'diag_recorder.dart';
import 'diag_sanitize.dart';

/// 「오류 기록 보내기」 파일 한 벌을 만든다(JSON Lines, 한 줄에 JSON 하나).
///
/// 1. 머리 `{type:'header', format:'rosarium-diag', v:1, app, buildId, os, model, screen, fold, locale, theme,
///    settings, stats, backup, counts}`
/// 2. (개발용 빌드만, 기록이 있으면) 터치 기록 요약 `{type:'touchTrace', …}`
/// 3. 오류 줄(`k:'e'`, 오래된 것부터) — [DiagRecorder] 참고
/// 4. 발자취 줄(`k:'c'`, 오래된 것부터)
/// 5. 끝 표시 `{type:'end', errors, crumbs}` — 잘린 파일을 알아본다
///
/// 개인정보: 설정은 백업 등록부([BackupRegistry])가 `backup`으로 분류한 키 중 값이 숫자·참거짓·짧은 코드인 것만
/// 싣는다(뺀 키·비밀 키·등록부에 없는 키·글 값·[personalKeys]는 싣지 않는다). 기도 기록은 개수만.
/// 백업 상태는 폴더 상태 코드·실패 횟수·사유 코드·경과 시간(시간 단위)만 — 폴더 이름·경로·URI 없음.
/// 분석기: `node tools/diag/analyze_error_report.mjs <파일>`.
abstract final class DiagReport {
  static const String format = 'rosarium-diag';
  static const int version = 1;

  /// 등록부가 backup 으로 분류했어도 사람의 글·이름이 들어 있어 싣지 않는 키(값 모양과 상관없이).
  static const Set<String> personalKeys = {
    'church_avatar', // 아바타 JSON — 세례명
    'skin_customs', // 내가 만든 스킨 JSON — 이름
    'church_solo_candles_v1', // 봉헌초 JSON
  };

  /// 파일 이름(`rosarium-diag-20261116-093000.txt`). 글 파일이라 누구나 열어 볼 수 있다.
  static String fileName(DateTime now) {
    String two(int v) => v.toString().padLeft(2, '0');
    return 'rosarium-diag-${now.year}${two(now.month)}${two(now.day)}-'
        '${two(now.hour)}${two(now.minute)}${two(now.second)}.txt';
  }

  /// 싣는 설정(키 → 값). 위 규칙을 지난 것만.
  static Map<String, Object> safeSettings(SharedPreferences prefs) {
    final out = <String, Object>{};
    final doc = BackupCollector.collect(prefs, now: DateTime(2000));
    for (final e in doc.prefs.entries) {
      final k = e.key;
      final spec = BackupRegistry.specFor(k);
      if (spec == null || spec.role != PrefRole.backup) continue;
      if (BackupRegistry.looksSecret(k) || personalKeys.contains(k)) continue;
      final v = e.value.value;
      if (v is bool || v is int) {
        out[k] = v;
      } else if (v is double) {
        out[k] = (v * 1000).round() / 1000;
      } else if (v is String) {
        if (v.isNotEmpty && DiagSanitize.isCode(v)) out[k] = v;
      } else if (v is List) {
        out[k] = 'list:${v.length}';
      }
    }
    return out;
  }

  static double? _agoH(DateTime? t, DateTime now) =>
      t == null ? null : (now.difference(t).inMinutes / 60 * 10).round() / 10;

  /// 백업 상태(사유 코드·횟수·경과 시간). 이름·경로 없음.
  static Map<String, Object?> backupState(BackupService b, DateTime now) {
    final s = b.auto.status;
    final v = b.vault;
    return {
      'supported': s.supported,
      'autoWanted': s.wanted,
      'autoOn': s.on,
      'folder': s.folder.state.name,
      'folderCode': DiagSanitize.value(s.folder.code),
      'failN': s.failN,
      'failCode': DiagSanitize.value(s.failCode),
      'everOk': s.everOk,
      'autoLastOkAgoH': _agoH(s.lastOkAt, now),
      'lastBackupAgoH': _agoH(b.lastBackupAt, now),
      'lastFileAgoH': _agoH(b.lastFileAt, now),
      'records': b.recordCount,
      'vaultReady': v.ready,
      'vaultOffer': v.offer != null,
      'vaultLastError': v.lastError == null
          ? null
          : DiagSanitize.value(v.lastError),
      'vaultLastWriteAgoH': _agoH(v.lastWriteAt, now),
    };
  }

  static String? _fold(Map<String, Object?> screen) {
    final f = screen['features'];
    if (f is! List || f.isEmpty) return 'none';
    final first = f.first;
    return first is Map ? '${first['type']}:${first['state']}' : 'none';
  }

  /// 머리 한 줄(맵). [device]가 없으면 기기 정보 칸은 비운다.
  static Map<String, Object?> header({
    required DiagRecorder recorder,
    required DateTime now,
    DeviceInfoSnapshot? device,
    SharedPreferences? prefs,
    PrayerStatsStore? stats,
    BackupService? backup,
    Map<String, Object?>? screen,
  }) {
    final scr = screen ?? ChurchTouchTrace.screenInfo();
    final dispatcher = ui.PlatformDispatcher.instance;
    final recs = stats?.records;
    final weekAgo = now.subtract(const Duration(days: 7));
    final settings = prefs == null
        ? const <String, Object>{}
        : safeSettings(prefs);
    return {
      'type': 'header',
      'format': format,
      'v': version,
      'exportedAt': now.toIso8601String(),
      'tzOffsetMin': now.timeZoneOffset.inMinutes,
      'app': device?.appVersion ?? '',
      'buildId': ChurchTouchTrace.buildId,
      'devBuild': DevGlass.enabled,
      'mode': kReleaseMode ? 'release' : (kProfileMode ? 'profile' : 'debug'),
      'platform': defaultTargetPlatform.name,
      'os': device?.os ?? '',
      'model': device?.model ?? '',
      'locale': device?.locale ?? dispatcher.locale.toLanguageTag(),
      'screen': scr,
      'fold': _fold(scr),
      'textScale': (dispatcher.textScaleFactor * 100).round() / 100,
      'theme': {
        'brightness': dispatcher.platformBrightness.name,
        'skin': settings['skin_id'] ?? 'default',
        'dynamicColor': settings['use_dynamic_color'],
      },
      'settings': settings,
      'stats': {
        'records': recs?.length,
        'last7d': recs?.where((r) => r.at.isAfter(weekAgo)).length,
        'completed': recs?.where((r) => r.completed).length,
      },
      if (backup != null) 'backup': backupState(backup, now),
      'session': recorder.session,
      'counts': {
        'errors': recorder.errors.length,
        'crumbs': recorder.crumbs.length,
        'dropped': recorder.dropped,
        'unexpected': recorder.unexpectedCount,
      },
    };
  }

  /// 파일 내용 전체.
  static String build({
    required DiagRecorder recorder,
    required DateTime now,
    DeviceInfoSnapshot? device,
    SharedPreferences? prefs,
    PrayerStatsStore? stats,
    BackupService? backup,
    Map<String, Object?>? screen,
    bool includeTouchTrace = true,
  }) {
    final b = StringBuffer();
    void line(Object o) => b.writeln(jsonEncode(o));
    line(
      header(
        recorder: recorder,
        now: now,
        device: device,
        prefs: prefs,
        stats: stats,
        backup: backup,
        screen: screen,
      ),
    );
    // 개발용 빌드: 성당 터치 기록이 있으면 요약(머리·셈)만 붙인다(전체는 「터치 기록 보내기」).
    if (includeTouchTrace &&
        ChurchTouchTrace.on &&
        ChurchTouchTrace.instance.length > 0) {
      final h = Map<String, Object?>.of(ChurchTouchTrace.instance.header())
        ..['type'] = 'touchTrace';
      line(h);
    }
    final errs = recorder.errors;
    final crumbs = recorder.crumbs;
    for (final e in errs) {
      line(e);
    }
    for (final c in crumbs) {
      line(c);
    }
    line({'type': 'end', 'errors': errs.length, 'crumbs': crumbs.length});
    return b.toString();
  }

  /// 미리보기에 보일 짧은 요약(한국어 줄 몇 개).
  static List<String> previewLines(
    Map<String, Object?> header, {
    DiagRecorder? recorder,
  }) {
    final counts = header['counts'];
    final c = counts is Map ? counts : const {};
    final settings = header['settings'];
    final out = <String>[
      '앱 ${_or(header['app'], '판 모름')} · ${_or(header['os'], '기기 모름')} · ${_or(header['model'], '')}'
          .trim(),
      '오류 ${c['errors'] ?? 0}건 · 최근 동작 ${c['crumbs'] ?? 0}건',
      '설정 값 ${settings is Map ? settings.length : 0}개(숫자·켜짐/꺼짐만) · 기도 기록은 개수만',
      if (header['backup'] != null) '백업 상태(폴더 상태·실패 사유 코드)',
    ];
    final last = recorder?.errors.isNotEmpty == true
        ? recorder!.errors.last
        : null;
    if (last != null) {
      out.add('마지막 오류: ${last['type']} — ${last['msg']}');
    }
    return out;
  }

  static String _or(Object? v, String fallback) {
    final s = v?.toString() ?? '';
    return s.isEmpty ? fallback : s;
  }
}
