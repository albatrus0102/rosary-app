import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/analytics/device_reporter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _Info implements DeviceInfoProvider {
  @override
  Future<DeviceInfoSnapshot> read() async => const DeviceInfoSnapshot(
    model: 'Pixel 8',
    os: 'Android 14 (SDK 34)',
    appVersion: '1.0.0+3',
    locale: 'ko-KR',
  );
}

class _MemId implements DeviceIdStore {
  @override
  Future<String> getOrCreate() async => 'dev-1';
}

void main() {
  setUp(() {
    DeviceReporter.debugReset();
    SharedPreferences.setMockInitialValues({});
  });

  test('uploads only model/os/app_version/locale/device_id', () async {
    final up = FakeEventUploader();
    final ok = await DeviceReporter.report(
      uploader: up,
      consent: (k) => k == 'diagnostics',
      deviceIdStore: _MemId(),
      infoProvider: _Info(),
    );
    expect(ok, isTrue);
    expect(up.devices, hasLength(1));
    expect(up.devices.single, {
      'device_id': 'dev-1',
      'model': 'Pixel 8',
      'os': 'Android 14 (SDK 34)',
      'app_version': '1.0.0+3',
      'locale': 'ko-KR',
    });
  });

  test('once per app start', () async {
    final up = FakeEventUploader();
    Future<bool> go() => DeviceReporter.report(
      uploader: up,
      consent: (_) => true,
      deviceIdStore: _MemId(),
      infoProvider: _Info(),
    );
    expect(await go(), isTrue);
    expect(await go(), isFalse);
    expect(up.devices, hasLength(1));
    expect(DeviceReporter.reportedThisStart, isTrue);
  });

  test(
    'nothing without diagnostics consent; retried after it is granted',
    () async {
      final up = FakeEventUploader();
      var on = false;
      Future<bool> go() => DeviceReporter.report(
        uploader: up,
        consent: (_) => on,
        deviceIdStore: _MemId(),
        infoProvider: _Info(),
      );
      expect(await go(), isFalse);
      expect(up.devices, isEmpty);
      on = true;
      expect(await go(), isTrue);
      expect(up.devices, hasLength(1));
    },
  );

  test('failure does not throw and is retried on the next call', () async {
    final up = FakeEventUploader()..failing = true;
    Future<bool> go() => DeviceReporter.report(
      uploader: up,
      consent: (_) => true,
      deviceIdStore: _MemId(),
      infoProvider: _Info(),
    );
    expect(await go(), isFalse);
    up.failing = false;
    expect(await go(), isTrue);
  });

  test('device id is a persisted random UUID v4 under device_id_v1', () async {
    final store = PrefsDeviceIdStore();
    final id = await store.getOrCreate();
    expect(
      id,
      matches(
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ),
      ),
    );
    expect(
      (await SharedPreferences.getInstance()).getString('device_id_v1'),
      id,
    );
    expect(await PrefsDeviceIdStore().getOrCreate(), id);
    SharedPreferences.setMockInitialValues({});
    expect(await PrefsDeviceIdStore().getOrCreate(), isNot(id));
  });
}
