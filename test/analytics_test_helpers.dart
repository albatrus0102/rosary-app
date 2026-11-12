// ignore_for_file: depend_on_referenced_packages
import 'package:fake_async/fake_async.dart' show FakeAsync;
import 'package:rosary_app/analytics/analytics.dart';

/// fakeAsync 안에서 `Analytics.init`을 동기적으로 끝낸다.
Analytics initIn(
  FakeAsync fa, {
  required FakeEventUploader uploader,
  ConsentGate? consent,
  String? userId = 'user-1',
  QueueStore? store,
  DateTime Function()? now,
  int batchSize = 20,
  int maxQueue = 500,
  bool trackAppOpen = false,
  bool throwOnUnknownEvent = true,
  String? sessionId,
}) {
  Analytics? out;
  Analytics.init(
    uploader: uploader,
    consent: consent ?? (_) => true,
    userId: userId,
    appVersion: '1.0.0+1',
    platform: 'android',
    now: now,
    store: store ?? MemoryQueueStore(),
    batchSize: batchSize,
    maxQueue: maxQueue,
    observeLifecycle: false,
    trackAppOpen: trackAppOpen,
    throwOnUnknownEvent: throwOnUnknownEvent,
    sessionIdGenerator: sessionId == null ? null : () => sessionId,
  ).then((a) => out = a);
  fa.flushMicrotasks();
  return out!;
}
