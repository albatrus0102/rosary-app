package kr.rosary.rosary_app

import android.content.ClipData
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Parcelable
import androidx.core.content.FileProvider
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
