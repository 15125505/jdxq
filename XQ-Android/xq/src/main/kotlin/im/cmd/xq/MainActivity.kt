package im.cmd.xq

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import im.cmd.xq.netbare.NetBare
import im.cmd.xq.netbare.NetBareConfig
import im.cmd.xq.netbare.NetBareListener
import im.cmd.xq.netbare.http.HttpInterceptorFactory
import im.cmd.xq.netbare.http.WssInterceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import kotlin.experimental.xor


@SuppressLint("StaticFieldLeak")
var main: Activity? = null

class MainActivity : AppCompatActivity(), NetBareListener {

    companion object {
        private const val REQUEST_CODE_PREPARE = 1
    }

    private lateinit var mNetBare: NetBare
    private lateinit var mActionButton: Button


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        main = this
        mNetBare = NetBare.get()

        // 初始化日志模块
        ZZ.init(findViewById(R.id.web_view))
        initWeb()

        // 开始和停止按钮
        mActionButton = findViewById(R.id.action)
        mActionButton.setOnClickListener {
            if (mNetBare.isActive) {
                ZZ.info("停止侦测...")
                mNetBare.stop()
            } else {
                ZZ.info("启动侦测...")
                prepareNetBare()
            }
        }

        // 清除日志
        findViewById<Button>(R.id.clear).setOnClickListener {
            ZZ.clear()
        }

        // 使用说明
        findViewById<Button>(R.id.readme).setOnClickListener {
            ZZ.usage()

        }

        // 监听NetBare服务的启动和停止
        mNetBare.registerNetBareListener(this)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initWeb() {

        // 刚刚进来的时候，只显示加载框
        val loadingProgressBar: ProgressBar = findViewById(R.id.loading_progress_bar)
        val layout: View = findViewById(R.id.content_layout)
        loadingProgressBar.visibility = View.VISIBLE
        layout.visibility = View.INVISIBLE

        // 初始化WebView
        val webView = findViewById<View>(R.id.web_view) as WebView
        val settings = webView.settings
        settings.javaScriptEnabled = true // 启用 JavaScript
        settings.allowFileAccess = true // 允许 WebView 访问文件系统
        settings.allowContentAccess = true // 允许访问内容 URL
        settings.allowFileAccessFromFileURLs = true // 允许从文件 URL 加载其他文件
        settings.allowUniversalAccessFromFileURLs = true // 允许从文件 URL 跨域访问
        settings.setSupportZoom(false) // 禁用缩放
        settings.cacheMode = WebSettings.LOAD_NO_CACHE // 不使用缓存
        settings.databaseEnabled = false // 禁用数据库
        settings.domStorageEnabled = true // 启用 DOM 存储
        webView.webViewClient = WebViewClient() // 设置 WebViewClient
        webView.addJavascriptInterface(WebAppInterface(this), "Android")


        Thread {
            // 下载必要的内容
            class FileInfo(val name: String, val url: String, var file: File? = null)
            val vec = arrayOf(
                FileInfo("index.html", "http://server-6.example.invalid/bin/i.bin"),
                FileInfo("index.js", "http://server-6.example.invalid/bin/j.bin")
            )

            // 尝试下载文件，如果发生异常则弹出提示框
            try {
                for (v in vec) {
                    val binData = downloadData(v.url)
                    val binRet = xor(binData, 0x49)
                    val rawText = String(binRet, Charsets.UTF_8)
                    v.file = File(cacheDir, v.name)
                    v.file?.writeText(rawText, Charsets.UTF_8)
                }
            } catch (e: Exception) {
                // 弹出提示框，提示用户网络异常
                runOnUiThread {
                    AlertDialog.Builder(this)
                        .setTitle("网络异常")
                        .setMessage("加载必须的初始化数据时发生异常，可能是本地网络异常。")
                        .setPositiveButton("重试") { _, _ ->
                            initWeb()
                        }
                        .show()
                }
                return@Thread
            }

            // 加载文件
            runOnUiThread {
                webView.loadUrl("file://${vec[0].file?.absolutePath}")
                loadingProgressBar.visibility = View.GONE
                layout.visibility = View.VISIBLE
            }

            // 延迟一会之后删除文件
            Thread.sleep(500)
            ZZ.appVersion(applicationContext.packageManager.getPackageInfo(packageName, 0).versionName)
            for (v in vec) {
                v.file?.delete()
            }

        }.start()
    }

    // 下载数据
    private fun downloadData(url: String): ByteArray {
        val request = Request.Builder()
            .url(url)
            .build()
        val response = OkHttpClient().newCall(request).execute()
        if (response.isSuccessful) {
            response.body?.bytes()?.let {
                return it
            }
        }
        throw IOException("Failed to download $url: ${response.code} ${response.message}")
    }

    // 异或函数
    private fun xor(buffer: ByteArray, value: Int): ByteArray {
        val result = ByteArray(buffer.size)
        for (i in buffer.indices) {
            result[i] = (buffer[i] xor value.toByte())
        }
        return result
    }


    override fun onDestroy() {
        super.onDestroy()
        mNetBare.unregisterNetBareListener(this)
        mNetBare.stop()
    }

    override fun onServiceStarted() {
        runOnUiThread {
            ZZ.info("侦测开始，打开游戏会自动完成侦测...")
            mActionButton.setText(R.string.stop_netbare)
        }
    }

    override fun onServiceStopped() {
        runOnUiThread {
            ZZ.info("侦测已经停止！")
            mActionButton.setText(R.string.start_netbare)
        }
    }

    private fun prepareNetBare() {

        // 配置VPN
        val intent = NetBare.get().prepare()
        if (intent != null) {
            startActivityForResult(intent, REQUEST_CODE_PREPARE)
            ZZ.info("等待服务启动...")
            return
        }
        // 启动NetBare服务
        val config = NetBareConfig.defaultHttpConfig(
            App.getInstance().getJSK(),
            interceptorFactories()
        ).newBuilder()
            // 示例：只抓取特定域名，其他域名放行
            // .addAllowedHost("echo.websocket.org") 
            // .addAllowedHost("your.target.domain")
            .build()

        mNetBare.start(config)

    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode == Activity.RESULT_OK && requestCode == REQUEST_CODE_PREPARE) {
            prepareNetBare()
        } else {
            ZZ.warn("侦测服务未能启动...")
        }
    }

    private fun interceptorFactories(): List<HttpInterceptorFactory> {
        return listOf(
            HttpUrlPrintInterceptor.createFactory(),
            WssInterceptor.createFactory()
        )
    }

}
