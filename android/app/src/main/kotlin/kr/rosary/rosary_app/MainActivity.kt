package kr.rosary.rosary_app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Parcelable
import androidx.core.content.FileProvider
import java.io.File
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

        // 통계 이미지 카드 공유(lib/stats/share/image_share.dart). 파일은 앱 캐시 share/ 에 쓰고
        // FileProvider uri 로 넘긴다(res/xml/file_paths.xml).
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "rosarium/share").setMethodCallHandler { call, result ->
            val path = call.argument<String>("path")
            if (path == null) { result.error("share", "path 없음", null); return@setMethodCallHandler }
            try {
                val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", File(path))
                when (call.method) {
                    "shareImage" -> { startImageChooser(uri, false); result.success("image") }
                    "shareStory" -> result.success(shareStory(uri))
                    else -> result.notImplemented()
                }
            } catch (e: Exception) {
                result.error("share", e.message, null)
            }
        }
    }

    private val instagramPkg = "com.instagram.android"

    /** 일반 이미지 공유 시트. [instagramFirst]면 인스타그램을 맨 앞(EXTRA_INITIAL_INTENTS)에 둔다. */
    private fun startImageChooser(uri: Uri, instagramFirst: Boolean) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val chooser = Intent.createChooser(send, "공유")
        if (instagramFirst) {
            val ig = Intent(send).setPackage(instagramPkg)
            if (packageManager.queryIntentActivities(ig, 0).isNotEmpty()) {
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf<Parcelable>(ig))
            }
        }
        startActivity(chooser)
    }

    private fun facebookAppId(): String = try {
        val ai = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
        ai.metaData?.get("kr.rosary.rosaryapp.FACEBOOK_APP_ID")?.toString() ?: ""
    } catch (e: Exception) { "" }

    /** 인스타그램 스토리. Facebook 앱 ID 가 있고 인스타그램이 ADD_TO_STORY 를 받으면 스토리 화면을 열고
     *  ("story"), 아니면 인스타그램을 맨 앞에 둔 일반 공유 시트로 연다("sheet"). */
    private fun shareStory(uri: Uri): String {
        val appId = facebookAppId()
        if (appId.isNotBlank()) {
            val story = Intent("com.instagram.share.ADD_TO_STORY").apply {
                setDataAndType(uri, "image/png")
                setPackage(instagramPkg)
                putExtra("source_application", appId)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            if (packageManager.queryIntentActivities(story, 0).isNotEmpty()) {
                grantUriPermission(instagramPkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                startActivity(story)
                return "story"
            }
        }
        startImageChooser(uri, true)
        return "sheet"
    }
}
