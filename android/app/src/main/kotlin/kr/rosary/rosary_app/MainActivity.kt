package kr.rosary.rosary_app

import android.content.ClipData
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    // 묵주 화면의 차등 진동(T-81): timings = [쉼, 울림, 쉼, 울림 …](ms), amplitude 1..255.
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "rosarium/vibrate").setMethodCallHandler { call, result ->
            if (call.method != "pattern") { result.notImplemented(); return@setMethodCallHandler }
            try {
                val timings = (call.argument<List<Int>>("timings") ?: listOf(0, 25)).map { it.toLong() }.toLongArray()
                val amp = (call.argument<Int>("amplitude") ?: 180).coerceIn(1, 255)
                val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= 31) {
                    (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION") getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= 26) {
                        val amps = IntArray(timings.size) { i -> if (i % 2 == 1) amp else 0 }
                        val effect = if (vibrator.hasAmplitudeControl()) VibrationEffect.createWaveform(timings, amps, -1)
                                     else VibrationEffect.createWaveform(timings, -1)
                        vibrator.vibrate(effect)
                    } else {
                        @Suppress("DEPRECATION") vibrator.vibrate(timings, -1)
                    }
                }
                result.success(null)
            } catch (e: Exception) {
                result.error("vibrate", e.message, null)
            }
        }
        // 개발용 '터치 기록 보내기'(lib/church/church_touch_trace.dart, 개발용 APK 에서만 부른다):
        // 앱 문서 폴더의 기록 파일을 다운로드 폴더에 복사하고(Android 10+, 권한 없이 MediaStore) 공유 시트를 연다.
        // 돌려주는 값: 보여 줄 저장 위치('Download/<이름>'), 다운로드에 못 쓰면 null(앱은 문서 폴더 경로를 보여 준다).
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "rosarium/devshare").setMethodCallHandler { call, result ->
            if (call.method != "shareFile") { result.notImplemented(); return@setMethodCallHandler }
            try {
                val src = File(call.argument<String>("path") ?: "")
                if (!src.isFile) { result.error("share", "no file", null); return@setMethodCallHandler }
                val name = call.argument<String>("name") ?: src.name
                val mime = call.argument<String>("mime") ?: "text/plain"
                var uri: Uri? = null
                if (Build.VERSION.SDK_INT >= 29) {
                    val values = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, name)
                        put(MediaStore.MediaColumns.MIME_TYPE, mime)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                    uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    if (uri != null) {
                        contentResolver.openOutputStream(uri)?.use { out -> src.inputStream().use { it.copyTo(out) } }
                    }
                }
                if (uri == null) { result.success(null); return@setMethodCallHandler }
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = mime
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, name)
                    clipData = ClipData.newRawUri(name, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                val chooser = Intent.createChooser(send, "터치 기록 보내기").apply {
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(chooser)
                result.success(Environment.DIRECTORY_DOWNLOADS + "/" + name)
            } catch (e: Exception) {
                result.error("share", e.message, null)
            }
        }
    }
}
