package kr.rosary.rosary_app

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

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
    }
}
