package im.cmd.xq

import android.app.Application
import android.content.Context
import im.cmd.xq.netbare.NetBare
import im.cmd.xq.netbare.NetBareUtils
import im.cmd.xq.netbare.ssl.JKS
import me.weishu.freereflection.BuildConfig
import me.weishu.reflection.Reflection
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class App : Application() {

    companion object {
        const val JSK_ALIAS = "xiaoqiao"

        private lateinit var sInstance: App

        fun getInstance(): App {
            return sInstance
        }
    }

    private lateinit var mJKS: JKS

    override fun onCreate() {
        super.onCreate()


        sInstance = this

        // 创建自签证书
        mJKS = JKS(
            this, JSK_ALIAS, JSK_ALIAS.toCharArray(), JSK_ALIAS, JSK_ALIAS,
            JSK_ALIAS, JSK_ALIAS, JSK_ALIAS
        )

        // 初始化NetBare
        NetBare.get().attachApplication(this, BuildConfig.DEBUG)
    }


    /**
     * 复制Raw资源目录下的文件到指定目录下
     *
     * @param rawFileId Raw资源id
     * @param dst 目标文件
     */
    @Throws(IOException::class)
    private fun copyFileFromRawToDisk(rawFileId: Int, dst: File) {
        // 获取Raw资源输入流
        val inputStream = resources.openRawResource(rawFileId)
        // 获取输出流
        val outputStream = FileOutputStream(dst)
        // 复制数据
        val buffer = ByteArray(1024)
        var length: Int
        while (inputStream.read(buffer).also { length = it } > 0) {
            outputStream.write(buffer, 0, length)
        }
        // 关闭流
        outputStream.flush()
        outputStream.close()
        inputStream.close()
    }

    fun getJSK(): JKS {
        return mJKS
    }

    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        // On android Q, we can't access Java8EngineWrapper with reflect.
        if (NetBareUtils.isAndroidQ()) {
            Reflection.unseal(base)
        }
    }

}