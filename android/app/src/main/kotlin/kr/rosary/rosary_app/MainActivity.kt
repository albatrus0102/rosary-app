package kr.rosary.rosary_app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    /** 백업 채널(자동 백업 폴더·내보내기·가져오기). 결과는 [onActivityResult]로 돌아온다. */
    private var backup: BackupBridge? = null

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (backup?.onActivityResult(requestCode, resultCode, data) == true) return
        super.onActivityResult(requestCode, resultCode, data)
    }

    // 묵주 화면의 차등 진동(T-81): timings = [쉼, 울림, 쉼, 울림 …](ms), amplitude 1..255.
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        backup = BackupBridge(this).also {
            MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "rosarium/backup").setMethodCallHandler(it)
        }
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
    }
}
