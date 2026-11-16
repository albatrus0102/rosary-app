package kr.rosary.rosary_app

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.File
import java.io.FileNotFoundException

/**
 * 백업 파일(과 오류 기록 파일)을 공유 시트로 보낼 때만 쓰는 읽기 전용 공급자(androidx 없이).
 * `cache/backup_share/` 안의 파일 이름 하나만 내주고, 받는 앱에는 그 URI 의 읽기 권한만 준다
 * (매니페스트 exported=false + grantUriPermissions).
 */
class BackupShareProvider : ContentProvider() {
    companion object {
        const val DIR = "backup_share"
        const val AUTHORITY_SUFFIX = ".backupshare"
        private val NAME_RE = Regex("^[A-Za-z0-9._-]{1,80}$")
    }

    override fun onCreate(): Boolean = true

    private fun fileFor(uri: Uri): File? {
        val name = uri.lastPathSegment ?: return null
        if (!NAME_RE.matches(name)) return null
        val ctx = context ?: return null
        val dir = File(ctx.cacheDir, DIR)
        val f = File(dir, name)
        return if (f.isFile && f.parentFile?.canonicalPath == dir.canonicalPath) f else null
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        if (mode != "r") throw SecurityException("read only")
        val f = fileFor(uri) ?: throw FileNotFoundException()
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?,
    ): Cursor? {
        val f = fileFor(uri) ?: return null
        val cols = arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)
        return MatrixCursor(cols, 1).apply { addRow(arrayOf<Any>(f.name, f.length())) }
    }

    // 오류 기록(.txt)은 글, 백업(.json)은 JSON.
    override fun getType(uri: Uri): String =
        if ((uri.lastPathSegment ?: "").endsWith(".txt")) "text/plain" else "application/json"

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0

    override fun update(
        uri: Uri,
        values: ContentValues?,
        selection: String?,
        selectionArgs: Array<out String>?,
    ): Int = 0
}
