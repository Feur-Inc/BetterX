package com.feurinc.betterx.android

import android.app.Dialog
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.os.Message
import android.util.Log
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.util.UUID

class MainActivity : AppCompatActivity() {
  private val tag = "BetterXAndroid"
  private val mobileChromeUserAgent =
    "Mozilla/5.0 (Linux; Android 14; SM-G970U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36"
  private val popupLoginButtonProbe =
    """
      (function() {
        return Boolean(document.querySelector('a[data-testid="loginButton"][href="/login"]'));
      })();
    """.trimIndent()
  private lateinit var webView: WebView
  private lateinit var bridge: BetterXBridge
  private val bridgeToken = UUID.randomUUID().toString()
  private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
  private var popupDialog: Dialog? = null
  private var popupWebView: WebView? = null
  private var popupTrustedXFlow = false

  private val pickDocument = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
    pendingFileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
    pendingFileCallback = null
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

    bridge = BetterXBridge(this, bridgeToken)
    webView = WebView(this)
    setContentView(
      webView,
      ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ),
    )

    configureWebView()
    registerScripts()
    webView.loadUrl("https://x.com/")
  }

  private fun configureWebView() {
    configureWebView(webView, isPopup = false)
  }

  private fun configureWebView(target: WebView, isPopup: Boolean) {
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(target, true)

    with(target.settings) {
      javaScriptEnabled = true
      domStorageEnabled = true
      databaseEnabled = true
      javaScriptCanOpenWindowsAutomatically = true
      setSupportMultipleWindows(true)
      mediaPlaybackRequiresUserGesture = false
      useWideViewPort = true
      loadWithOverviewMode = true
      cacheMode = WebSettings.LOAD_DEFAULT
      mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
      userAgentString = mobileChromeUserAgent
    }

    if (WebViewFeature.isFeatureSupported(WebViewFeature.REQUESTED_WITH_HEADER_ALLOW_LIST)) {
      WebSettingsCompat.setRequestedWithHeaderOriginAllowList(target.settings, emptySet())
    }

    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
      WebSettingsCompat.setWebAuthenticationSupport(
        target.settings,
        WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_BROWSER,
      )
    }

    target.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val url = request?.url ?: return false

        if (request.isForMainFrame && shouldOpenExternally(url, isPopup)) {
          openExternally(url)
          if (isPopup) destroyPopupWindow()
          return true
        }

        return when (url.scheme) {
          "http", "https" -> false
          else -> {
            Log.w(tag, "Blocked non-HTTP navigation: ${url.scheme}")
            if (isPopup) destroyPopupWindow()
            true
          }
        }
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        if (!isPopup) return

        val popup = view ?: return
        val currentUrl = url?.let(Uri::parse) ?: return
        if (popup !== popupWebView || popupTrustedXFlow) return

        if (!isXRootUrl(currentUrl)) {
          openExternally(currentUrl)
          destroyPopupWindow()
          return
        }

        popup.evaluateJavascript(popupLoginButtonProbe) { result ->
          if (popup !== popupWebView || popupTrustedXFlow) return@evaluateJavascript

          val hasLoginButton = result?.contains("true") == true
          if (hasLoginButton) {
            popupTrustedXFlow = true
          } else {
            openExternally(currentUrl)
            destroyPopupWindow()
          }
        }
      }
    }

    target.webChromeClient = object : WebChromeClient() {
      override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
        Log.d(
          tag,
          "${consoleMessage.messageLevel()} ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()} ${consoleMessage.message()}",
        )
        return true
      }

      override fun onCreateWindow(
        view: WebView,
        isDialog: Boolean,
        isUserGesture: Boolean,
        resultMsg: Message,
      ): Boolean {
        return createPopupWindow(resultMsg)
      }

      override fun onCloseWindow(window: WebView) {
        if (window === popupWebView) {
          destroyPopupWindow()
        }
      }

      override fun onShowFileChooser(
        view: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams,
      ): Boolean {
        if (isPopup) return false

        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = filePathCallback

        val acceptTypes = fileChooserParams.acceptTypes
          .filter { it.isNotBlank() }
          .ifEmpty { listOf("*/*") }
          .toTypedArray()

        pickDocument.launch(acceptTypes)
        return true
      }
    }
  }

  private fun createPopupWindow(resultMsg: Message): Boolean {
    destroyPopupWindow()
    popupTrustedXFlow = false

    val popup = WebView(this)
    configureWebView(popup, isPopup = true)

    val dialog = Dialog(this)
    dialog.window?.setBackgroundDrawable(ColorDrawable(Color.BLACK))
    dialog.setContentView(
      popup,
      ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ),
    )
    dialog.setCancelable(true)
    dialog.setOnDismissListener {
      if (popupWebView === popup) {
        popupWebView = null
      }
      popup.removeAllViews()
      popup.destroy()
      if (popupDialog === dialog) {
        popupDialog = null
      }
    }

    popupDialog = dialog
    popupWebView = popup

    val transport = resultMsg.obj as WebView.WebViewTransport
    transport.webView = popup
    resultMsg.sendToTarget()

    dialog.show()
    return true
  }

  private fun destroyPopupWindow() {
    popupTrustedXFlow = false
    popupDialog?.setOnDismissListener(null)
    popupDialog?.dismiss()
    popupDialog = null

    popupWebView?.apply {
      removeAllViews()
      destroy()
    }
    popupWebView = null
  }

  private fun isXHost(uri: Uri): Boolean {
    val host = uri.host?.lowercase() ?: return false
    return host == "x.com" || host == "twitter.com" || host.endsWith(".x.com") || host.endsWith(".twitter.com")
  }

  private fun isXRootUrl(uri: Uri): Boolean {
    if (!isXHost(uri)) return false
    val path = uri.path.orEmpty()
    return path.isEmpty() || path == "/"
  }

  private fun shouldOpenExternally(uri: Uri, isPopup: Boolean): Boolean {
    val isHttp = uri.scheme == "http" || uri.scheme == "https"
    if (!isHttp) return false
    if (uri.scheme != "https") return true

    if (!isXHost(uri)) {
      return true
    }

    if (!isPopup) {
      return false
    }

    if (popupTrustedXFlow) {
      return false
    }

    return !isXRootUrl(uri)
  }

  private fun registerScripts() {
    val origins = setOf(
      "https://x.com",
      "https://twitter.com",
      "https://*.x.com",
      "https://*.twitter.com",
    )

    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      WebViewCompat.addWebMessageListener(
        webView,
        "BetterXAndroid",
        origins,
        object : WebViewCompat.WebMessageListener {
          override fun onPostMessage(
            view: WebView,
            message: androidx.webkit.WebMessageCompat,
            sourceOrigin: Uri,
            isMainFrame: Boolean,
            replyProxy: androidx.webkit.JavaScriptReplyProxy,
          ) {
            if (!isMainFrame) return
            val payload = message.data?.toString() ?: return
            bridge.handle(payload) { reply -> replyProxy.postMessage(reply) }
          }
        },
      )
    } else {
      Log.w(tag, "Web message listener not supported; Android bridge disabled")
    }

    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      Log.w(tag, "Document-start JavaScript not supported; BetterX may load late")
      return
    }

    addDocumentStartScript("main-world.js", origins)
    addDocumentStartScript("early-logo.js", origins)
    addDocumentStartScript("content.js", origins)
  }

  private fun addDocumentStartScript(assetName: String, origins: Set<String>) {
    var script = assets.open("betterx/$assetName").bufferedReader(Charsets.UTF_8).use { it.readText() }
    if (assetName == "content.js") {
      script = script.replace("__BETTERX_NATIVE_TOKEN__", bridgeToken)
    }
    WebViewCompat.addDocumentStartJavaScript(webView, script, origins)
  }

  private fun openExternally(url: Uri) {
    runCatching {
      startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, url))
    }.onFailure {
      Log.w(tag, "Failed to open external URL: $url", it)
    }
  }

  override fun onBackPressed() {
    if (webView.canGoBack()) {
      webView.goBack()
    } else {
      super.onBackPressed()
    }
  }

  override fun onDestroy() {
    destroyPopupWindow()
    bridge.close()
    webView.destroy()
    super.onDestroy()
  }
}
