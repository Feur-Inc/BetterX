package com.feurinc.betterx.android

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.File
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.Charset
import java.util.Locale
import java.util.concurrent.Executors

class BetterXBridge(private val activity: Activity, private val bridgeToken: String) {
  private val executor = Executors.newCachedThreadPool()
  private val syncPrefs = activity.getSharedPreferences("betterx_sync", Context.MODE_PRIVATE)
  private val localPrefs = activity.getSharedPreferences("betterx_local", Context.MODE_PRIVATE)
  private val themeDir = File(activity.filesDir, "betterx-themes").apply { mkdirs() }

  fun handle(messageJson: String, reply: (String) -> Unit) {
    if (messageJson.length > MAX_MESSAGE_CHARS) {
      reply(failure("", IllegalArgumentException("Bridge request is too large")))
      return
    }
    executor.execute {
      val id = runCatching { JSONObject(messageJson).optString("id") }.getOrDefault("")
      val response = runCatching {
        val request = JSONObject(messageJson)
        if (request.optString("token") != bridgeToken) {
          throw SecurityException("Invalid BetterX bridge capability")
        }
        val type = request.optString("type")
        val result = when (type) {
          "STORAGE_GET" -> handleStorageGet(request)
          "STORAGE_SET" -> handleStorageSet(request)
          "STORAGE_REMOVE" -> handleStorageRemove(request)
          "PROXY_IMAGE" -> handleProxyImage(request.optString("url"))
          "PROXY_FETCH" -> handleProxyFetch(request)
          "OPEN_URL" -> handleOpenUrl(request.optString("url"))
          else -> throw IllegalArgumentException("Unknown bridge action: $type")
        }
        success(id, result)
      }.getOrElse { failure(id, it) }

      reply(response)
    }
  }

  private fun handleStorageGet(request: JSONObject): JSONObject {
    val area = requireStorageArea(request.optString("area"))
    val keys = request.optJSONArray("keys")
    val result = JSONObject()

    val requestedKeys = when {
      keys != null -> (0 until keys.length()).mapNotNull { keys.optString(it).takeIf { value -> value.isNotBlank() } }
      area == "local" -> listLocalKeys()
      else -> syncPrefs.all.keys.toList()
    }

    for (key in requestedKeys) {
      val value = readStoredValue(area, key)
      result.put(key, jsonValue(value))
    }

    return result
  }

  private fun handleStorageSet(request: JSONObject): JSONObject {
    val area = requireStorageArea(request.optString("area"))
    val items = request.optJSONObject("items") ?: JSONObject()

    for (key in items.keys()) {
      val value = items.opt(key)
      writeStoredValue(area, key, value)
    }

    return JSONObject()
  }

  private fun handleStorageRemove(request: JSONObject): JSONObject {
    val area = requireStorageArea(request.optString("area"))
    val keys = request.optJSONArray("keys") ?: JSONArray()

    for (index in 0 until keys.length()) {
      val key = keys.optString(index).takeIf { it.isNotBlank() } ?: continue
      removeStoredValue(area, key)
    }

    return JSONObject()
  }

  private fun handleProxyImage(url: String): JSONObject {
    if (url.isBlank()) throw IllegalArgumentException("Missing image URL")

    val connection = openConnection(url, "GET", null, null, false)
    return try {
      val status = connection.responseCode
      validateNetworkUrl(connection.url.toString())
      if (status !in 200..299) throw IllegalArgumentException("Image request failed ($status)")
      val bytes = readBodyBytes(connection)
      val mime = connection.contentType?.substringBefore(';')?.trim().takeUnless { value -> value.isNullOrBlank() } ?: "image/png"
      val dataUrl = "data:$mime;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
      JSONObject().put("dataUrl", dataUrl)
    } finally {
      connection.disconnect()
    }
  }

  private fun handleProxyFetch(request: JSONObject): JSONObject {
    val url = request.optString("url")
    if (url.isBlank()) throw IllegalArgumentException("Missing fetch URL")

    val method = if (request.has("method") && !request.isNull("method")) {
      request.optString("method").takeIf { it.isNotBlank() }?.uppercase(Locale.US)
    } else {
      null
    }
    val headers = request.optJSONObject("headers")
    val body = if (request.has("body") && !request.isNull("body")) request.optString("body") else null
    val requestMethod = method ?: if (body != null) "POST" else "GET"
    val includeCredentials = request.optString("credentials") == "include"
    if (requestMethod !in ALLOWED_METHODS) throw IllegalArgumentException("Unsupported request method")
    if (body != null && body.length > MAX_REQUEST_BODY_CHARS) {
      throw IllegalArgumentException("Request body is too large")
    }

    val connection = openConnection(url, requestMethod, headers, body, includeCredentials)
    return try {
      val status = connection.responseCode
      validateNetworkUrl(connection.url.toString())
      val text = readBodyText(connection)
      val json = runCatching { JSONTokener(text).nextValue() }.getOrNull()

      if (includeCredentials) applyResponseCookies(url, connection)

      JSONObject()
        .put("ok", status in 200..299)
        .put("status", status)
        .put("text", text)
        .put("json", jsonValue(json))
    } finally {
      connection.disconnect()
    }
  }

  private fun handleOpenUrl(url: String): JSONObject {
    if (url.isBlank()) throw IllegalArgumentException("Missing URL")
    val parsed = Uri.parse(url)
    if (parsed.scheme != "https" && parsed.scheme != "http") {
      throw IllegalArgumentException("Only HTTP(S) URLs may be opened")
    }

    activity.runOnUiThread {
      activity.startActivity(Intent(Intent.ACTION_VIEW, parsed))
    }
    return JSONObject().put("opened", true)
  }

  private fun openConnection(
    url: String,
    method: String,
    headers: JSONObject?,
    body: String?,
    includeCredentials: Boolean,
  ): HttpURLConnection {
    val parsed = validateNetworkUrl(url)
    val connection = parsed.openConnection() as HttpURLConnection
    connection.requestMethod = method
    connection.instanceFollowRedirects = true
    connection.connectTimeout = 20_000
    connection.readTimeout = 20_000
    connection.doInput = true
    connection.useCaches = false

    headers?.keys()?.forEach { key ->
      if (key == null) return@forEach
      if (key.lowercase(Locale.US) in BLOCKED_HEADERS) return@forEach
      connection.setRequestProperty(key, headers.optString(key, ""))
    }

    if (includeCredentials) {
      val cookie = android.webkit.CookieManager.getInstance().getCookie(url)
      if (!cookie.isNullOrBlank() && connection.getRequestProperty("Cookie").isNullOrBlank()) {
        connection.setRequestProperty("Cookie", cookie)
      }
    }

    if (body != null) {
      connection.doOutput = true
      connection.setRequestProperty(
        "Content-Type",
        headers?.optString("Content-Type")?.takeIf { it.isNotBlank() } ?: "application/json",
      )
      connection.outputStream.bufferedWriter(Charset.forName("UTF-8")).use { writer ->
        writer.write(body)
      }
    }

    return connection
  }

  private fun readBodyBytes(connection: HttpURLConnection): ByteArray {
    if (connection.contentLengthLong > MAX_RESPONSE_BYTES) {
      throw IllegalArgumentException("Response is too large")
    }
    val stream = runCatching { connection.inputStream }.getOrNull() ?: connection.errorStream
    return stream?.use { input ->
      val output = ByteArrayOutputStream()
      val buffer = ByteArray(16 * 1024)
      var total = 0
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        total += count
        if (total > MAX_RESPONSE_BYTES) throw IllegalArgumentException("Response is too large")
        output.write(buffer, 0, count)
      }
      output.toByteArray()
    } ?: ByteArray(0)
  }

  private fun requireStorageArea(area: String): String {
    if (area != "sync" && area != "local") throw IllegalArgumentException("Invalid storage area")
    return area
  }

  private fun validateNetworkUrl(rawUrl: String): URL {
    val parsed = URL(rawUrl)
    val loopback = parsed.host.equals("localhost", ignoreCase = true) ||
      parsed.host == "127.0.0.1" || parsed.host == "::1"
    if (parsed.protocol != "https" && !(parsed.protocol == "http" && loopback)) {
      throw IllegalArgumentException("HTTPS is required outside loopback")
    }
    if (parsed.userInfo != null) throw IllegalArgumentException("URL credentials are not allowed")
    return parsed
  }

  fun close() {
    executor.shutdownNow()
  }

  private fun readBodyText(connection: HttpURLConnection): String {
    val bytes = readBodyBytes(connection)
    val charset = connection.contentType
      ?.substringAfter("charset=", "UTF-8")
      ?.substringBefore(';')
      ?.trim()
      .takeUnless { it.isNullOrBlank() }
      ?: "UTF-8"
    return String(bytes, Charset.forName(charset))
  }

  private fun applyResponseCookies(url: String, connection: HttpURLConnection) {
    val cookies = connection.headerFields.entries
      .firstOrNull { (key, _) -> key.equals("Set-Cookie", ignoreCase = true) }
      ?.value
      ?: return
    val cookieManager = android.webkit.CookieManager.getInstance()
    for (cookie in cookies) {
      if (!cookie.isNullOrBlank()) cookieManager.setCookie(url, cookie)
    }
    cookieManager.flush()
  }

  private fun readStoredValue(area: String, key: String): Any? {
    if (area == "local" && key.startsWith(THEME_CSS_PREFIX)) {
      return readThemeCss(key.removePrefix(THEME_CSS_PREFIX))
    }

    val prefs = prefsFor(area)
    val raw = prefs.getString(key, null) ?: return null
    return decodeJsonValue(raw)
  }

  private fun writeStoredValue(area: String, key: String, value: Any?) {
    if (area == "local" && key.startsWith(THEME_CSS_PREFIX)) {
      writeThemeCss(key.removePrefix(THEME_CSS_PREFIX), value?.toString() ?: "")
      return
    }

    prefsFor(area).edit().putString(key, jsonString(value)).apply()
  }

  private fun removeStoredValue(area: String, key: String) {
    if (area == "local" && key.startsWith(THEME_CSS_PREFIX)) {
      deleteThemeCss(key.removePrefix(THEME_CSS_PREFIX))
      return
    }

    prefsFor(area).edit().remove(key).apply()
  }

  private fun prefsFor(area: String) = if (area == "local") localPrefs else syncPrefs

  private fun listLocalKeys(): List<String> {
    val keys = localPrefs.all.keys.toMutableList()
    keys.addAll(listThemeCssKeys().map { THEME_CSS_PREFIX + it })
    return keys
  }

  private fun listThemeCssKeys(): List<String> {
    return themeDir.listFiles()?.mapNotNull { Uri.decode(it.name) } ?: emptyList()
  }

  private fun readThemeCss(id: String): String {
    val file = themeFile(id)
    return if (file.exists()) file.readText(Charsets.UTF_8) else ""
  }

  private fun writeThemeCss(id: String, css: String) {
    themeFile(id).writeText(css, Charsets.UTF_8)
  }

  private fun deleteThemeCss(id: String) {
    themeFile(id).delete()
  }

  private fun themeFile(id: String): File {
    return File(themeDir, Uri.encode(id) ?: id.replace('/', '_'))
  }

  private fun decodeJsonValue(raw: String): Any? {
    return runCatching {
      val value = JSONTokener(raw).nextValue()
      if (value == JSONObject.NULL) null else value
    }.getOrElse { raw }
  }

  private fun jsonString(value: Any?): String {
    return when (val v = jsonValue(value)) {
      null, JSONObject.NULL -> "null"
      is String -> JSONObject.quote(v)
      is JSONObject, is JSONArray -> v.toString()
      is Boolean, is Number -> v.toString()
      else -> JSONObject.quote(v.toString())
    }
  }

  private fun jsonValue(value: Any?): Any? {
    return when (value) {
      null, JSONObject.NULL -> JSONObject.NULL
      is JSONObject -> value
      is JSONArray -> value
      is Boolean, is Number, is String -> value
      is Map<*, *> -> JSONObject().apply {
        for ((key, nested) in value) put(key.toString(), jsonValue(nested))
      }
      is Iterable<*> -> JSONArray().apply {
        for (nested in value) put(jsonValue(nested))
      }
      is Array<*> -> JSONArray().apply {
        for (nested in value) put(jsonValue(nested))
      }
      else -> value.toString()
    }
  }

  private fun success(id: String, result: Any?): String {
    return JSONObject()
      .put("id", id)
      .put("ok", true)
      .put("result", jsonValue(result))
      .toString()
  }

  private fun failure(id: String, error: Throwable): String {
    return JSONObject()
      .put("id", id)
      .put("ok", false)
      .put("error", error.message ?: error.toString())
      .toString()
  }

  private companion object {
    const val THEME_CSS_PREFIX = "bx_theme_css_"
    const val MAX_MESSAGE_CHARS = 5_000_000
    const val MAX_REQUEST_BODY_CHARS = 2_000_000
    const val MAX_RESPONSE_BYTES = 10_000_000
    val ALLOWED_METHODS = setOf("GET", "POST", "PUT", "PATCH", "DELETE")
    val BLOCKED_HEADERS = setOf("cookie", "host", "origin", "referer")
  }
}
