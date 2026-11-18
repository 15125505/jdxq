package im.cmd.xq

import android.annotation.SuppressLint
import android.webkit.WebView

class ZZ {
    companion object {
        @SuppressLint("StaticFieldLeak")
        private var webView: WebView? = null

        fun init(webView: WebView) {
            this.webView = webView
        }

        fun log(txt: String) {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:log(`$txt`)")
            }
        }

        fun info(txt: String) {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:info(`$txt`)")
            }
        }

        fun warn(txt: String) {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:warn(`$txt`)")
            }
        }

        fun err(txt: String) {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:err(`$txt`)")
            }
        }

        fun clear() {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:clear()")
            }
        }

        fun usage() {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:usage()")
            }
        }

        fun dataIn(url: String, recv: String, send: String, ua: String) {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:dataIn(`$url`, `$recv`, `$send`, `$ua`)")
            }
        }

        fun appVersion(verName: String) {
            main?.runOnUiThread {
                webView?.loadUrl("javascript:appVersion(`$verName`)")
            }
        }
    }
}
