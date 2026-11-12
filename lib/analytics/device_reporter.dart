import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'analytics.dart';

/// `devices` 표에 올라가는 정보. 광고 ID·정확한 위치·IP·시리얼 번호는 없다.
class DeviceInfoSnapshot {
  const DeviceInfoSnapshot({
    required this.model,
    required this.os,
    required this.appVersion,
    required this.locale,
  });

  final String model;
  final String os;
  final String appVersion;
  final String locale;
}

/// 기기 정보 읽기(테스트에서 가짜로 바꾼다).
abstract class DeviceInfoProvider {
  Future<DeviceInfoSnapshot> read();
}

/// `device_info_plus` / `package_info_plus` 구현.
class PlatformDeviceInfoProvider implements DeviceInfoProvider {
  const PlatformDeviceInfoProvider();

  @override
  Future<DeviceInfoSnapshot> read() async {
    var model = 'unknown';
    var os = defaultTargetPlatform.name;
    try {
      final plugin = DeviceInfoPlugin();
      if (defaultTargetPlatform == TargetPlatform.android) {
        final a = await plugin.androidInfo;
        model = '${a.manufacturer} ${a.model}'.trim();
        os = 'Android ${a.version.release} (SDK ${a.version.sdkInt})';
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final i = await plugin.iosInfo;
        model = i.utsname.machine;
        os = '${i.systemName} ${i.systemVersion}';
      }
    } catch (_) {}
    var appVersion = '';
    try {
      final p = await PackageInfo.fromPlatform();
      appVersion = '${p.version}+${p.buildNumber}';
    } catch (_) {}
    return DeviceInfoSnapshot(
      model: model,
      os: os,
      appVersion: appVersion,
      locale: PlatformDispatcher.instance.locale.toLanguageTag(),
    );
  }
}

/// 기기마다 한 번 만들어 보관하는 무작위 UUID(계정·하드웨어와 무관).
abstract class DeviceIdStore {
  Future<String> getOrCreate();
}

/// `shared_preferences` 키 `device_id_v1`에 저장한다.
class PrefsDeviceIdStore implements DeviceIdStore {
  PrefsDeviceIdStore({this._prefs});

  static const String key = 'device_id_v1';
  final SharedPreferences? _prefs;

  @override
  Future<String> getOrCreate() async {
    final p = _prefs ?? await SharedPreferences.getInstance();
    final existing = p.getString(key);
    if (existing != null && existing.isNotEmpty) return existing;
    final id = Analytics.newUuid();
    await p.setString(key, id);
    return id;
  }
}

/// 앱을 켤 때마다 한 번, `diagnostics` 동의가 켜져 있으면 기기 정보를 올린다.
abstract final class DeviceReporter {
  static bool _done = false;

  /// 이번 앱 실행에서 이미 올렸는지.
  static bool get reportedThisStart => _done;

  @visibleForTesting
  static void debugReset() => _done = false;

  /// 올렸으면 true. 동의가 꺼져 있거나 실패하면 false(예외는 던지지 않으며 다음 호출에서
  /// 다시 시도한다). 이번 실행에서 이미 성공했으면 아무것도 하지 않고 false.
  static Future<bool> report({
    required EventUploader uploader,
    required ConsentGate consent,
    DeviceIdStore? deviceIdStore,
    DeviceInfoProvider infoProvider = const PlatformDeviceInfoProvider(),
  }) async {
    if (_done) return false;
    try {
      if (!consent(ConsentKinds.diagnostics)) return false;
      final id = await (deviceIdStore ?? PrefsDeviceIdStore()).getOrCreate();
      final info = await infoProvider.read();
      await uploader.uploadDevice({
        'device_id': id,
        'model': info.model,
        'os': info.os,
        'app_version': info.appVersion,
        'locale': info.locale,
      });
      _done = true;
      return true;
    } catch (_) {
      return false;
    }
  }
}
