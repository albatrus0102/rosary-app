import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 네이티브(안드로이드) 쪽 백업 계약을 소스로 지킨다 — 기기 없이 잴 수 없는 「되돌릴 수 없는 자리」.
void main() {
  const main = 'android/app/src/main';
  String read(String p) => File('$main/$p').readAsStringSync();

  group('안드로이드 자동 백업 규칙(독서공방 2026-08-20 사고)', () {
    for (final f in [
      'res/xml/data_extraction_rules.xml',
      'res/xml/backup_rules.xml',
    ]) {
      test('$f: 금고 폴더를 담고, exclude·끝 슬래시가 없다', () {
        // 머리말 주석의 설명 글은 빼고 실제 규칙만 본다.
        final x = read(f).replaceAll(RegExp(r'<!--.*?-->', dotAll: true), '');
        expect(x, contains('<include domain="file" path="backup_vault" />'));
        // include 하나라도 있으면 「지정한 것만」 — exclude 를 섞으면 빈 백업이 될 수 있었다.
        expect(x.contains('<exclude'), isFalse);
        expect(RegExp(r'path="[^"]*/"').hasMatch(x), isFalse);
        // 비밀이 사는 곳(공유 설정 원본·키스토어)은 담지 않는다.
        expect(x.contains('sharedpref'), isFalse);
      });
    }

    test('매니페스트가 두 규칙과 공유 공급자를 단다', () {
      final m = read('AndroidManifest.xml');
      expect(
        m,
        contains('android:dataExtractionRules="@xml/data_extraction_rules"'),
      );
      expect(m, contains('android:fullBackupContent="@xml/backup_rules"'));
      expect(m, contains('android:name=".BackupShareProvider"'));
      expect(
        m,
        contains(r'android:authorities="${applicationId}.backupshare"'),
      );
      expect(m, contains('android:exported="false"'));
    });

    test('금고 폴더 이름이 Dart와 같다', () {
      final dart = File('lib/backup/backup_vault.dart').readAsStringSync();
      expect(dart, contains("/backup_vault'"));
    });
  });

  group('BackupBridge.kt 가드', () {
    final kt = read('kotlin/kr/rosary/rosary_app/BackupBridge.kt');

    test('지우기는 우리 이름 형식을 통과한 것만(deleteFolderFile 가드)', () {
      final i = kt.indexOf('"deleteFolderFile" ->');
      expect(i, greaterThan(0));
      final body = kt.substring(i, kt.indexOf('"releaseFolder" ->'));
      final guard = body.indexOf('if (!isOurName(name)) return');
      final del = body.indexOf('DocumentsContract.deleteDocument');
      expect(guard, greaterThan(0), reason: '이름 가드가 없다');
      expect(guard, lessThan(del), reason: '가드가 지우기보다 먼저여야 한다');
    });

    test('자동 백업 이름 규칙이 Dart와 같다', () {
      expect(
        kt,
        contains(
          r'^rosarium-backup-(\\d{4})(\\d{2})(\\d{2})-(\\d{2})(\\d{2})(\\d{2})\\.json$',
        ),
      );
      final dart = File('lib/backup/auto_backup.dart').readAsStringSync();
      expect(
        dart,
        contains(
          r"r'^rosarium-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$'",
        ),
      );
    });

    test('폴더 쓰기: 임시 이름 → fsync → 이름 바꾸기, 실패하면 방금 만든 문서를 지운다', () {
      final i = kt.indexOf('private fun writeFolderFile');
      final body = kt.substring(i, kt.indexOf('private fun readBounded'));
      expect(body, contains('tempNameOf(name)'));
      expect(body, contains('fd?.sync()'));
      expect(body, contains('renameDocument'));
      expect(body.indexOf('val probe = probe()'), greaterThanOrEqualTo(0));
      expect(body, contains('DocumentsContract.deleteDocument(resolver, doc)'));
    });

    test('폴더 상태 사유 코드가 Dart 해석과 맞는다', () {
      for (final c in [
        '"never"',
        '"no_perm:p"',
        '"read_only"',
        '"gone"',
        '"no_create"',
        '"ok"',
      ]) {
        expect(kt, contains(c), reason: c);
      }
    });

    test('디렉터리는 이름이 맞아도 후보가 아니다', () {
      expect(kt, contains('MIME_TYPE_DIR) continue'));
    });

    test('MainActivity 가 채널과 결과를 잇는다', () {
      final m = read('kotlin/kr/rosary/rosary_app/MainActivity.kt');
      expect(m, contains('"rosarium/backup"'));
      expect(
        m,
        contains('backup?.onActivityResult(requestCode, resultCode, data)'),
      );
    });
  });
}
