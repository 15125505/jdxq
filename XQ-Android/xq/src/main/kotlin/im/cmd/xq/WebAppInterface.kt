package im.cmd.xq

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import android.widget.Toast

class WebAppInterface(private val mContext: Context) {

    @JavascriptInterface
    fun showToast(toast: String) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        main?.startActivity(intent)
    }
    @JavascriptInterface
    fun notice(title: String, content: String) {
        main?.sendBroadcast(Intent(main, NotificationReceiver::class.java).apply {
            putExtra("title", title)
            putExtra("text", content)
        })
    }
}
