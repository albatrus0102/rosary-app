package kr.rosary.rosary_app

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File

/**
 * 안드로이드 쪽 오류 기록(Dart: lib/diag/diag_sources.dart `DiagNative`, 채널 `rosarium/diag`).
 *
 *  - [record]: 채널 처리 중 잡은 예외(백업·공유·진동 …)를 최근 [CAP]개 고리에 쌓는다. Dart 가 `drain` 으로 가져가
 *    오류 기록에 옮긴다(가져가면 비운다). 예외 종류·짧은 문구·앞 몇 줄의 스택만 — Dart 쪽에서 한 번 더 거른다.
 *  - [installCrashHandler]: 앱을 끝내는 자바 예외를 앱 전용 파일([CRASH_FILE])에 한 줄 남기고 원래 처리기로 넘긴다.
 *    다음 실행의 `drain` 이 한 번 넘겨주고 지운다.
 *  - 자동 전송은 없다. 사용자가 「오류 기록 보내기」로 직접 보낼 때만 파일에 실린다.
 */
object NativeDiag {
    private const val TAG = "RosariumDiag"
    private const val CAP = 50
    private const val CRASH_FILE = "diag_native_crash.json"
    private val ring = ArrayDeque<Map<String, Any?>>()
    @Volatile private var installed = false

    private fun stackOf(e: Throwable, lines: Int = 10): String =
        e.stackTrace.take(lines).joinToString("\n") { "at ${it.className}.${it.methodName}:${it.lineNumber}" }

    private fun typeOf(e: Throwable): String = (e.javaClass.simpleName.ifEmpty { "Throwable" }).take(60)

    /** 잡은 예외 하나. [tag]는 어디서(채널·메서드 이름). 절대 던지지 않는다. */
    @Synchronized
    fun record(tag: String, e: Throwable) {
        try {
            ring.addLast(
                mapOf(
                    "t" to System.currentTimeMillis(),
                    "tag" to tag.take(40),
                    "type" to typeOf(e),
                    "msg" to (e.message ?: "").take(200),
                    "stack" to stackOf(e),
                ),
            )
            while (ring.size > CAP) ring.removeFirst()
        } catch (x: Throwable) {
            Log.w(TAG, "record failed: ${x.javaClass.simpleName}")
        }
    }

    /** 쌓인 것 전부(가져가면 비운다). */
    @Synchronized
    fun drainEntries(): List<Map<String, Any?>> {
        val out = ring.toList()
        ring.clear()
        return out
    }

    /** 지난 실행을 끝낸 예외(있으면 한 번 주고 지운다). */
    fun takeCrash(ctx: Context): Map<String, Any?>? {
        return try {
            val f = File(ctx.filesDir, CRASH_FILE)
            if (!f.isFile) return null
            val j = JSONObject(f.readText())
            f.delete()
            mapOf(
                "t" to j.optLong("t"),
                "type" to j.optString("type"),
                "msg" to j.optString("msg"),
                "stack" to j.optString("stack"),
                "thread" to j.optString("thread"),
            )
        } catch (e: Exception) {
            Log.w(TAG, "crash read failed: ${e.javaClass.simpleName}")
            null
        }
    }

    /** 앱을 끝내는 예외를 파일에 남기는 처리기를 한 번 단다(원래 처리기는 그대로 불린다). */
    fun installCrashHandler(ctx: Context) {
        if (installed) return
        installed = true
        val app = ctx.applicationContext
        val prev = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, e ->
            try {
                val j = JSONObject()
                j.put("t", System.currentTimeMillis())
                j.put("type", typeOf(e))
                j.put("msg", (e.message ?: "").take(200))
                j.put("stack", stackOf(e, 14))
                j.put("thread", thread.name.take(40))
                File(app.filesDir, CRASH_FILE).writeText(j.toString())
            } catch (x: Throwable) {
                Log.w(TAG, "crash write failed: ${x.javaClass.simpleName}")
            }
            prev?.uncaughtException(thread, e)
        }
    }
}
