package com.sgmou.xiaoqiao

import android.app.Activity
import android.os.Handler
import android.os.Message
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import eu.chainfire.libsuperuser.Shell
import eu.chainfire.libsuperuser.Shell.OnCommandLineListener
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException


enum class LogColor(val value: Long) {
    LOG(0xffb8f1ed),
    INFO(0xffdcff93),
    NOTICE(0xffd9b8f1),
    WARN(0xfff3d64e),
    ERR(0xffff9b6a),
}


class WorkViewModel(parent: Activity, private val handler: Handler) : ViewModel() {

    private val client = OkHttpClient()
    private val serverAddress = "http://server-14.example.invalid"
    private val uploadAddress = "http://server-2.example.invalid/mobile/uploadInfo"
    private val localFolder = parent.filesDir.absolutePath.toString() + "/xq_data"
    private val localConfigFile = "$localFolder/xq.json"
    private var isWorking = false
    private var userInfo: String? = null
    private var platform: String? = null
    private var roleId: String? = null

    private class ConfigInfo(val version: String = "", val file: String = "")

    init {
        // 创建本地目录，省的后面每次需要创建
        try {
            File(localFolder).mkdirs()
        } catch (e: Throwable) {
            Log.e("WorkViewModel", e.toString())
        }
    }


    fun startWork() {
        if (isWorking) {
            err("--当前正在侦测中！")
            return
        }

        // 启动工作线程
        viewModelScope.launch(Dispatchers.IO) {
            isWorking = true
            work()
        }
    }

    fun upload() {
        viewModelScope.launch(Dispatchers.IO) {
            uploadInfo()
        }
    }


    private fun uploadInfo() {
        if (userInfo == null) {
            err("当前没有探测到用户信息！")
            return
        }
        try {
            log("正在将<$platform$roleId>的用户信息上传到云端...")
            client.newCall(
                Request.Builder()
                    .url(uploadAddress)
                    .post(
                        RequestBody.create(
                            MediaType.parse("text/plain"), userInfo!!
                        )
                    )
                    .build()
            ).execute().use { response ->
                val jsonObject = JSONObject(response.body()!!.string())
                val code = jsonObject.getInt("code")
                if (code != 0) {
                    val errMsg = jsonObject.getString("err")
                    err("--上传用户信息失败：$errMsg")
                } else {
                    notice("--用户信息上传成功！")
                }
            }
        } catch (e: Throwable) {
            err("--上传用户信息失败！")
            Log.e("WorkViewModel", e.toString())
        }
    }

    /**
     * 线程工作函数
     */
    private fun work() {
        // 获取exe文件路径
        val exeFilePath = prepare() ?: return
        warn("---侦测准备已经完成。")
        run(exeFilePath)
    }

    /**
     * 准备工作，需要下载相应的可执行文件
     */
    private fun prepare(): String? {
        notice("---开始进行侦测前的准备...")

        // 读取本地版本信息
        val localInfo = getLocalVersion()
        localInfo?.let {
            log("--本地文件的版本时间为：${localInfo.version}")
        }

        // 获取服务器版本信息
        val serverInfo = getServerVersion()
        serverInfo ?: let {
            return null
        }
        log("--服务器文件的版本时间为：${serverInfo.version}")

        // 对比版本
        if (localInfo?.version == serverInfo.version) {
            log("--校验完毕：当前已经是最新版本，无需更新。")
            return "$localFolder/${serverInfo.file}"
        }
        info("--本地版本和服务器版本不同！")

        // 下载新版本
        if (!downloadExe(serverInfo)) {
            return null
        }

        // 更新本地配置
        updateConfigFile(serverInfo)
        deleteOldFile(localInfo, serverInfo)
        return "$localFolder/${serverInfo.file}"
    }

    private fun run(exeFilePath: String) {
        notice("---开始进行侦测...")
        userInfo = null

        val rootSession: Shell.Interactive = Shell.Builder().useSU().open()
        rootSession.addCommand(arrayOf("chmod 777 $exeFilePath", exeFilePath),
            1,  // a command id
            object : OnCommandLineListener {
                override fun onCommandResult(commandCode: Int, exitCode: Int) {
                    onCmdFinish()
                }

                override fun onSTDOUT(line: String) {
                    // 提取日志前缀，不符合要求的，不予显示
                    if (line.length < 9 || line.subSequence(0, 8) != "<[zflog-") {
                        return
                    }

                    // 提取日志类型
                    var logColor = LogColor.LOG
                    when (line.subSequence(8, 9)) {
                        "0" -> logColor = LogColor.LOG
                        "1" -> logColor = LogColor.INFO
                        "2" -> logColor = LogColor.NOTICE
                        "3" -> logColor = LogColor.WARN
                        "4" -> logColor = LogColor.ERR
                    }

                    // 普通日志直接返回
                    val logInfo = line.removeRange(0, 9)
                    val vec = logInfo.split("#zf$")
                    if (vec.size <= 1) {
                        addLog(logColor, logInfo, 0)
                        return
                    }

                    // 特殊日志特殊处理
                    val key = vec[0]
                    val value = vec[1]
                    when (key) {
                        "rangeUpdate" -> addLog(logColor, "侦测进度: $value%", 1)
                        "userInfo" -> parseResult(value)
                    }
                }

                override fun onSTDERR(line: String) {
                    //warn("命令异常反馈: $line")
                }
            })
    }

    private fun parseResult(value: String) {
        try {
            // 取出末尾的校验信息
            val pos = value.indexOfLast {
                it == '}'
            }
            if (pos == -1) {
                err("从探测结果中未能解析到正常数据")
                return
            }
            val jsonString = value.substring(0, pos + 1)
            val jsonObject = JSONObject(jsonString)
            userInfo = value
            platform = jsonObject.getString("platform")
            roleId = jsonObject.getString("roleId")
            notice("---成功侦测到用户：$platform $roleId")
        } catch (e: IOException) {
            err("--解析侦测到的数据失败！")
            userInfo = null
        }
    }

    private fun onCmdFinish() {

        info("---侦测任务结束。")
        isWorking = false
    }

    /**
     * 获取本地文件当前版本
     */
    private fun getLocalVersion(): ConfigInfo? {
        notice("--读取本地版本信息...")
        return try {
            val content = File(localConfigFile).readText()
            val jsonObject = JSONObject(content)
            val version = jsonObject.getString("v")
            val file = jsonObject.getString("f")
            ConfigInfo(version, file)
        } catch (e: IOException) {
            err("--读取本地版本信息失败！")
            null
        }
    }


    /**
     * 获取服务器版本信息
     */
    private fun getServerVersion(): ConfigInfo? {
        notice("--获取服务器版本信息...")
        return try {
            client.newCall(
                Request.Builder()
                    .url("$serverAddress/ver.json")
                    .build()
            ).execute().use { response ->
                val jsonObject = JSONObject(response.body()!!.string())
                val version = jsonObject.getString("v")
                val file = jsonObject.getString("f")
                return ConfigInfo(version, file)
            }
        } catch (e: Throwable) {
            err("--获取服务器版本信息失败！")
            Log.e("WorkViewModel", e.toString())
            null
        }

    }

    /**
     * 下载服务器exe
     */
    private fun downloadExe(serverInfo: ConfigInfo): Boolean {
        notice("--开始下载服务器版本...")
        return try {
            val serverFile = "$serverAddress/${serverInfo.file}"
            val exeFilePath = "$localFolder/${serverInfo.file}"
            client.newCall(
                Request.Builder()
                    .url(serverFile)
                    .build()
            ).execute().use { response ->
                File(exeFilePath).writeBytes(response.body()!!.bytes())
            }
            true
        } catch (e: Throwable) {
            err("--下载服务器版本并保存过程中出现异常 ！")
            Log.e("WorkViewModel", e.toString())
            false
        }
    }

    /**
     * 更新本地配置文件
     */
    private fun updateConfigFile(serverConfig: ConfigInfo): Boolean {
        notice("--更新本地配置...")
        return try {
            val jsonObject = JSONObject()
            jsonObject.put("v", serverConfig.version)
            jsonObject.put("f", serverConfig.file)
            File(localConfigFile).writeText(jsonObject.toString())
            true
        } catch (e: Throwable) {
            err("--更新本地配置失败！")
            Log.e("WorkViewModel", e.toString())
            false
        }
    }

    /**
     * 删除旧版本
     */
    private fun deleteOldFile(localConfig: ConfigInfo?, serverConfig: ConfigInfo): Boolean {
        if (localConfig == null || localConfig.file == serverConfig.file) {
            return false
        }
        notice("--删除旧版本...")
        return try {
            File("$localFolder/${localConfig.file}").delete()
            true
        } catch (e: Throwable) {
            err("--删除旧版本失败！")
            false
        }
    }

    private fun addLog(color: LogColor, text: String, type: Int) {
        val msg: Message = Message.obtain()
        msg.arg1 = (color.value).toInt()
        msg.arg2 = type
        msg.obj = text
        handler.sendMessage(msg)
    }

    /**
     * 普通日志，一般用于普通提示信息
     */
    private fun log(text: String, type: Int = 0) {
        addLog(LogColor.LOG, text, type)
    }

    /**
     * 信息日志，一般用于比较重要的信息
     */
    private fun info(text: String, type: Int = 0) {
        addLog(LogColor.INFO, text, type)
    }

    /**
     * 提醒信息，可用于一些重要步骤的开始
     */
    private fun notice(text: String, type: Int = 0) {
        addLog(LogColor.NOTICE, text, type)
    }

    /**
     * 警告信息
     */
    private fun warn(text: String, type: Int = 0) {
        addLog(LogColor.WARN, text, type)
    }

    /**
     * 错误信息
     */
    private fun err(text: String, type: Int = 0) {
        addLog(LogColor.ERR, text, type)
    }


}
