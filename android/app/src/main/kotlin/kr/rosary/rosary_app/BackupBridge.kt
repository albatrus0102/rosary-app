package kr.rosary.rosary_app

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.DocumentsContract
import android.util.Log
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.Calendar
import java.util.concurrent.Executors

/**
 * 백업 채널 `rosarium/backup` (Dart: lib/backup/backup_platform.dart).
 *
 * 독서공방 MainActivity 의 autoBackupPickFolder·autoBackupFolderReady·autoBackupWrite·autoBackupLatestRead·
 * autoBackupFolderState·autoBackupReleaseFolder 를 옮겼다.
 *  - 자동 백업 폴더: SAF 트리(ACTION_OPEN_DOCUMENT_TREE) + takePersistableUriPermission. 폴더 URI 는 이 앱 전용
 *    네이티브 SharedPreferences([PREFS])에만 둔다 — Flutter 설정 파일 밖이라 백업 파일에도 실리지 않는다.
 *  - 쓰기 직전마다 [probe] 로 지속 권한·폴더 존재·쓰기 가능을 다시 잰다(권한 회수·폴더 삭제·재설치를 잡는다).
 *  - 새 파일은 임시 이름(.part.json)으로 끝까지 쓰고 fsync 한 뒤 renameDocument 로 최종 이름으로 바꾼다(B-13).
 *  - 지우기는 [isOurName] 을 통과한 이름만 — 사용자가 그 폴더에 둔 다른 파일·수동 내보내기는 절대 건드리지 않는다.
 *  - 폴더 IPC(드라이브 폴더면 네트워크까지)는 메인 스레드를 막지 않게 [io] 에서 하고 결과만 메인으로 돌려준다.
 *  - 실패는 사유 코드(경로·URI 없음)로 돌려주고 로그를 남긴다(조용히 삼키지 않는다).
 */
class BackupBridge(private val activity: Activity) : MethodChannel.MethodCallHandler {

    companion object {
        private const val TAG = "RosariumBackup"
        const val REQ_TREE = 7101
        const val REQ_CREATE = 7102
        const val REQ_OPEN = 7103
        private const val PREFS = "rosarium_backup_native"
        private const val KEY_TREE = "tree_uri"

        /** 읽기 상한(바이트). Dart 쪽 BackupFormat.maxFileChars(2천만 자)와 같은 크기대. */
        const val MAX_READ_BYTES = 40L * 1024 * 1024
        const val MAX_WRITE_CHARS = 20 * 1024 * 1024

        private val FINAL_RE = Regex("^rosarium-backup-(\\d{4})(\\d{2})(\\d{2})-(\\d{2})(\\d{2})(\\d{2})\\.json$")
        private val TEMP_RE = Regex("^rosarium-backup-(\\d{4})(\\d{2})(\\d{2})-(\\d{2})(\\d{2})(\\d{2})\\.part\\.json$")
        private val SHARE_NAME_RE = Regex("^[A-Za-z0-9._-]{1,80}$")

        private fun validStamp(m: MatchResult): Boolean {
            val g = m.groupValues.drop(1).map { it.toInt() }
            return try {
                val c = Calendar.getInstance()
                c.isLenient = false
                c.clear()
                c.set(g[0], g[1] - 1, g[2], g[3], g[4], g[5])
                c.timeInMillis // lenient=false 면 없는 날짜(2월 31일·25시)에서 던진다
                true
            } catch (e: Exception) {
                false
            }
        }

        /** 우리가 만든 자동 백업 최종 파일 이름인가(형식 + 실제 달력 날짜). */
        fun isFinalName(name: String): Boolean = FINAL_RE.matchEntire(name)?.let(::validStamp) ?: false

        /** 쓰다 끊긴 우리 임시 파일 이름인가. */
        fun isTempName(name: String): Boolean = TEMP_RE.matchEntire(name)?.let(::validStamp) ?: false

        /** 지워도 되는 이름: 우리 형식만. */
        fun isOurName(name: String): Boolean = isFinalName(name) || isTempName(name)

        fun tempNameOf(finalName: String): String = finalName.removeSuffix(".json") + ".part.json"

        fun errName(e: Throwable): String = (e.javaClass.simpleName.ifEmpty { "Exception" }).take(40)
    }

    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val pending = HashMap<Int, MethodChannel.Result>()
    private var stagedSave: File? = null

    private val prefs get() = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val resolver get() = activity.contentResolver

    private fun reply(result: MethodChannel.Result, map: Map<String, Any?>) {
        main.post {
            try {
                result.success(map)
            } catch (e: Exception) {
                NativeDiag.record("backup:reply", e)
                Log.w(TAG, "reply failed: ${errName(e)}")
            }
        }
    }

    private fun code(c: String) = mapOf("code" to c)

    private fun background(result: MethodChannel.Result, work: () -> Map<String, Any?>) {
        io.execute {
            val out = try {
                work()
            } catch (e: OutOfMemoryError) {
                NativeDiag.record("backup:io", e)
                code("too_big")
            } catch (e: Exception) {
                NativeDiag.record("backup:io", e)
                Log.w(TAG, "backup io failed: ${errName(e)}")
                code("io:" + errName(e))
            }
            reply(result, out)
        }
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "pickFolder" -> startForResult(REQ_TREE, result) {
                Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
                    addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or
                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION,
                    )
                }
            }
            "folderState" -> background(result) {
                val p = probe()
                mapOf("code" to p.second, "name" to p.third)
            }
            "writeFolderFile" -> {
                val name = call.argument<String>("name") ?: ""
                val content = call.argument<String>("content") ?: ""
                if (!isFinalName(name)) return reply(result, code("bad_name"))
                if (content.isEmpty()) return reply(result, code("empty"))
                if (content.length > MAX_WRITE_CHARS) return reply(result, code("too_big"))
                background(result) { writeFolderFile(name, content.toByteArray(Charsets.UTF_8)) }
            }
            "listFolderFiles" -> background(result) {
                val tree = probe().first ?: return@background code("no_folder")
                val files = children(tree).filter { isOurName(it.name) }
                    .map { mapOf("name" to it.name, "size" to it.size) }
                mapOf("code" to "ok", "files" to files)
            }
            "readFolderFile" -> {
                val name = call.argument<String>("name") ?: ""
                if (!isFinalName(name)) return reply(result, code("bad_name"))
                background(result) {
                    val tree = probe().first ?: return@background code("no_folder")
                    val doc = children(tree).firstOrNull { it.name == name }
                        ?: return@background code("not_found")
                    if (doc.size > MAX_READ_BYTES) return@background code("too_big")
                    val uri = DocumentsContract.buildDocumentUriUsingTree(tree, doc.id)
                    val bytes = resolver.openInputStream(uri)?.use { readBounded(it) }
                        ?: return@background code("too_big")
                    mapOf("code" to "ok", "text" to String(bytes, Charsets.UTF_8))
                }
            }
            "deleteFolderFile" -> {
                val name = call.argument<String>("name") ?: ""
                // 🚩 우리 형식이 아니면 절대 지우지 않는다(Dart 판정과 별개로 한 번 더).
                if (!isOurName(name)) return reply(result, code("bad_name"))
                background(result) {
                    val tree = probe().first ?: return@background code("no_folder")
                    val doc = children(tree).firstOrNull { it.name == name }
                        ?: return@background code("not_found")
                    val ok = DocumentsContract.deleteDocument(
                        resolver,
                        DocumentsContract.buildDocumentUriUsingTree(tree, doc.id),
                    )
                    code(if (ok) "ok" else "delete_failed")
                }
            }
            "releaseFolder" -> background(result) {
                val prev = prefs.getString(KEY_TREE, null)
                if (prev != null) {
                    try {
                        resolver.releasePersistableUriPermission(
                            Uri.parse(prev),
                            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
                        )
                    } catch (e: Exception) {
                        Log.i(TAG, "release permission: ${errName(e)}") // 이미 없는 권한 — 끄기는 계속한다
                    }
                }
                prefs.edit().remove(KEY_TREE).commit()
                code("ok")
            }
            "saveDocument" -> {
                val name = safeName(call.argument<String>("name") ?: "rosarium-export.json")
                val content = call.argument<String>("content") ?: ""
                val mime = safeMime(call.argument<String>("mime"))
                if (content.isEmpty()) return reply(result, code("empty"))
                if (pending.containsKey(REQ_CREATE)) return reply(result, code("busy"))
                try {
                    val stage = File(activity.cacheDir, "backup_save_pending.json")
                    stage.writeBytes(content.toByteArray(Charsets.UTF_8))
                    stagedSave = stage
                } catch (e: Exception) {
                    NativeDiag.record("backup:stage", e)
                    Log.w(TAG, "stage save failed: ${errName(e)}")
                    return reply(result, code("io:" + errName(e)))
                }
                startForResult(REQ_CREATE, result) {
                    Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = mime
                        putExtra(Intent.EXTRA_TITLE, name)
                    }
                }
            }
            "shareFile" -> {
                val name = safeName(call.argument<String>("name") ?: "rosarium-export.json")
                val content = call.argument<String>("content") ?: ""
                val mime = safeMime(call.argument<String>("mime"))
                if (content.isEmpty()) return reply(result, code("empty"))
                try {
                    val uri = stageShare(listOf(name to content)).first()
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = mime
                        putExtra(Intent.EXTRA_STREAM, uri)
                        putExtra(Intent.EXTRA_SUBJECT, name)
                        clipData = ClipData.newRawUri(name, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    activity.startActivity(Intent.createChooser(send, null))
                    reply(result, code("ok"))
                } catch (e: Exception) {
                    NativeDiag.record("backup:share", e)
                    Log.w(TAG, "share failed: ${errName(e)}")
                    reply(result, code("io:" + errName(e)))
                }
            }
            // 여러 파일을 한 번에(오류 기록 + 백업 파일, lib/diag). 받는 앱에는 그 URI 들의 읽기 권한만 준다.
            "shareFiles" -> {
                val raw = call.argument<List<Map<String, Any?>>>("files") ?: emptyList()
                val files = raw.mapNotNull { f ->
                    val n = f["name"] as? String ?: return@mapNotNull null
                    val c = f["content"] as? String ?: return@mapNotNull null
                    if (c.isEmpty()) null else Triple(safeName(n), c, safeMime(f["mime"] as? String))
                }.distinctBy { it.first }.take(4)
                if (files.isEmpty()) return reply(result, code("empty"))
                try {
                    val uris = ArrayList(stageShare(files.map { it.first to it.second }))
                    val send = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                        type = if (files.map { it.third }.distinct().size == 1) files[0].third else "*/*"
                        putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                        putExtra(Intent.EXTRA_SUBJECT, files[0].first)
                        val clip = ClipData.newRawUri(files[0].first, uris[0])
                        for (i in 1 until uris.size) clip.addItem(ClipData.Item(uris[i]))
                        clipData = clip
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    activity.startActivity(Intent.createChooser(send, null))
                    reply(result, code("ok"))
                } catch (e: Exception) {
                    NativeDiag.record("backup:shareFiles", e)
                    Log.w(TAG, "share files failed: ${errName(e)}")
                    reply(result, code("io:" + errName(e)))
                }
            }
            "openDocument" -> startForResult(REQ_OPEN, result) {
                Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(
                        Intent.EXTRA_MIME_TYPES,
                        arrayOf("application/json", "text/plain", "application/octet-stream"),
                    )
                }
            }
            else -> result.notImplemented()
        }
    }

    /** 공유 폴더(cache/backup_share)를 비우고 파일들을 쓴 뒤 공급자 URI 들을 돌려준다. */
    private fun stageShare(files: List<Pair<String, String>>): List<Uri> {
        val dir = File(activity.cacheDir, BackupShareProvider.DIR)
        dir.mkdirs()
        dir.listFiles()?.forEach { it.delete() } // 지난 공유 파일은 남기지 않는다
        return files.map { (name, content) ->
            File(dir, name).writeBytes(content.toByteArray(Charsets.UTF_8))
            Uri.parse("content://${activity.packageName}${BackupShareProvider.AUTHORITY_SUFFIX}/$name")
        }
    }

    /** 허용하는 파일 종류만(그 밖은 JSON). */
    private fun safeMime(m: String?): String = when (m) {
        "text/plain" -> "text/plain"
        else -> "application/json"
    }

    private fun safeName(name: String): String {
        val n = name.replace(Regex("[^A-Za-z0-9._-]"), "_").take(80)
        return if (n.isBlank()) "rosarium-export.json" else n
    }

    private fun startForResult(req: Int, result: MethodChannel.Result, make: () -> Intent) {
        if (pending.containsKey(req)) return reply(result, code("busy"))
        try {
            pending[req] = result
            @Suppress("DEPRECATION")
            activity.startActivityForResult(make(), req)
        } catch (e: Exception) {
            pending.remove(req)
            NativeDiag.record("backup:picker", e)
            Log.w(TAG, "start picker failed: ${errName(e)}")
            reply(result, code("no_picker"))
        }
    }

    /** MainActivity.onActivityResult 가 부른다. 우리 요청이면 true. */
    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        if (requestCode != REQ_TREE && requestCode != REQ_CREATE && requestCode != REQ_OPEN) return false
        val result = pending.remove(requestCode) ?: return true
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            if (requestCode == REQ_CREATE) clearStaged()
            reply(result, code("cancelled"))
            return true
        }
        when (requestCode) {
            REQ_TREE -> background(result) { takeFolder(uri) }
            REQ_CREATE -> background(result) {
                val stage = stagedSave ?: return@background code("no_stage")
                try {
                    val os = resolver.openOutputStream(uri, "wt")
                        ?: return@background code("open_failed")
                    os.use {
                        it.write(stage.readBytes())
                        it.flush()
                        (it as? FileOutputStream)?.fd?.sync()
                    }
                    code("ok")
                } finally {
                    clearStaged()
                }
            }
            REQ_OPEN -> background(result) {
                val bytes = resolver.openInputStream(uri)?.use { readBounded(it) }
                    ?: return@background code("too_big")
                mapOf("code" to "ok", "text" to String(bytes, Charsets.UTF_8))
            }
        }
        return true
    }

    private fun clearStaged() {
        try {
            stagedSave?.delete()
        } catch (e: Exception) {
            Log.i(TAG, "staged cleanup: ${errName(e)}")
        }
        stagedSave = null
    }

    private fun takeFolder(uri: Uri): Map<String, Any?> {
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        resolver.takePersistableUriPermission(uri, flags)
        val prev = prefs.getString(KEY_TREE, null)
        if (prev != null && prev != uri.toString()) {
            try {
                resolver.releasePersistableUriPermission(Uri.parse(prev), flags)
            } catch (e: Exception) {
                Log.i(TAG, "release old folder: ${errName(e)}")
            }
        }
        // commit: 고른 폴더가 바로 디스크에 굳어야 다음 실행에도 같은 폴더를 쓴다.
        prefs.edit().putString(KEY_TREE, uri.toString()).commit()
        val p = probe()
        return mapOf("code" to p.second, "name" to p.third)
    }

    /** (쓸 수 있으면 트리 URI, 사유 코드, 폴더 표시 이름). 사유: ok·never·no_perm:p<n>·read_only·gone·no_create·err:<예외>. */
    private fun probe(): Triple<Uri?, String, String?> {
        val stored = prefs.getString(KEY_TREE, null) ?: return Triple(null, "never", null)
        return try {
            val uri = Uri.parse(stored)
            val perms = resolver.persistedUriPermissions
            val mine = perms.filter { it.uri == uri }
            when {
                mine.isEmpty() -> Triple(null, "no_perm:p" + perms.size.coerceIn(0, 999), null)
                mine.none { it.isWritePermission } -> Triple(null, "read_only", null)
                else -> {
                    val rootDoc = DocumentsContract.buildDocumentUriUsingTree(
                        uri,
                        DocumentsContract.getTreeDocumentId(uri),
                    )
                    var flags = -1
                    var name: String? = null
                    resolver.query(
                        rootDoc,
                        arrayOf(
                            DocumentsContract.Document.COLUMN_FLAGS,
                            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                        ),
                        null, null, null,
                    )?.use { c ->
                        if (c.moveToFirst()) {
                            flags = c.getInt(0)
                            name = c.getString(1)
                        }
                    }
                    when {
                        flags < 0 -> Triple(null, "gone", null)
                        flags and DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE == 0 ->
                            Triple(null, "no_create", name)
                        else -> Triple(uri, "ok", name)
                    }
                }
            }
        } catch (e: SecurityException) {
            Triple(null, "no_perm:sec", null)
        } catch (e: IllegalArgumentException) {
            Triple(null, "gone", null) // 폴더가 지워지면 공급자가 이것을 던진다
        } catch (e: java.io.FileNotFoundException) {
            Triple(null, "gone", null)
        } catch (e: Exception) {
            NativeDiag.record("backup:probe", e)
            Triple(null, "err:" + errName(e), null)
        }
    }

    private data class Child(val id: String, val name: String, val size: Long)

    private fun children(tree: Uri): List<Child> {
        val out = ArrayList<Child>()
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
            tree,
            DocumentsContract.getTreeDocumentId(tree),
        )
        resolver.query(
            childrenUri,
            arrayOf(
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_SIZE,
            ),
            null, null, null,
        )?.use { c ->
            while (c.moveToNext()) {
                val id = c.getString(0) ?: continue
                val name = c.getString(1) ?: continue
                // 디렉터리는 이름이 우리 형식이어도 절대 후보가 아니다(deleteDocument 는 하위까지 지운다).
                if (c.getString(2) == DocumentsContract.Document.MIME_TYPE_DIR) continue
                out.add(Child(id, name, if (c.isNull(3)) -1L else c.getLong(3)))
            }
        }
        return out
    }

    private fun supportsRename(doc: Uri): Boolean = try {
        resolver.query(doc, arrayOf(DocumentsContract.Document.COLUMN_FLAGS), null, null, null)?.use { c ->
            c.moveToFirst() && (c.getInt(0) and DocumentsContract.Document.FLAG_SUPPORTS_RENAME) != 0
        } ?: false
    } catch (e: Exception) {
        false // 기능 탐지 — 모르면 최종 이름으로 바로 쓴다
    }

    private fun writeFolderFile(name: String, bytes: ByteArray): Map<String, Any?> {
        val probe = probe()
        val tree = probe.first ?: return code("no_folder:" + probe.second)
        val rootDoc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
        var doc = DocumentsContract.createDocument(resolver, rootDoc, "application/json", tempNameOf(name))
        var renameTo: String? = name
        if (doc != null && !supportsRename(doc)) {
            try {
                DocumentsContract.deleteDocument(resolver, doc)
            } catch (e: Exception) {
                Log.i(TAG, "temp cleanup: ${errName(e)}")
            }
            doc = DocumentsContract.createDocument(resolver, rootDoc, "application/json", name)
            renameTo = null
        }
        if (doc == null) return code("create")
        return try {
            val os = resolver.openOutputStream(doc, "w") ?: throw java.io.IOException("no stream")
            os.use {
                it.write(bytes)
                it.flush()
                (it as? FileOutputStream)?.fd?.sync()
            }
            if (renameTo != null) {
                DocumentsContract.renameDocument(resolver, doc, renameTo)
                    ?: throw java.io.IOException("rename returned null")
            }
            code("ok")
        } catch (e: Exception) {
            // 반쪽 파일을 남기지 않는다(방금 만든 우리 문서만 지운다).
            try {
                DocumentsContract.deleteDocument(resolver, doc)
            } catch (e2: Exception) {
                Log.i(TAG, "failed doc cleanup: ${errName(e2)}")
            }
            NativeDiag.record("backup:write", e)
            Log.w(TAG, "folder write failed: ${errName(e)}")
            code("write:" + errName(e))
        }
    }

    /** 상한까지만 읽는다. 넘으면 null(호출부가 too_big). */
    private fun readBounded(ins: InputStream): ByteArray? {
        val out = ByteArrayOutputStream()
        val buf = ByteArray(64 * 1024)
        var total = 0L
        while (true) {
            val n = ins.read(buf)
            if (n < 0) break
            total += n
            if (total > MAX_READ_BYTES) return null
            out.write(buf, 0, n)
        }
        return out.toByteArray()
    }
}
