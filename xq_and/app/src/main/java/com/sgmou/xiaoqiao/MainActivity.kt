package com.sgmou.xiaoqiao

import android.app.AlertDialog
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.text.DateFormat
import java.util.*

const val LOG_TAG = "-------"

/**
 * 用于启动工作协程的handle
 */
class WorkThreadHandler(private val main: MainActivity) : Handler() {
    override fun handleMessage(msg: Message) {
        super.handleMessage(msg)
        main.addLog(msg.arg1, msg.obj.toString(), msg.arg2)
    }
}

class MainActivity : AppCompatActivity() {

    // 用于在主线程中接收线程消息
    private var handler = WorkThreadHandler(this);

    // 用于开启协程
    private var model: WorkViewModel? = null

    // 上次日志的时间
    private var timeLastShowTime: Date? = null
    private var timeLastLog: Date? = null


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        model = WorkViewModel(this, handler)

        notice("---使用说明：")
        log("    1. 启动游戏")
        log("    2. 回到本软件点击侦测")
        log("    3. 侦测成功后，可以将用户信息上传到江东云")
        notice("---注意事项：")
        log("    1. 本软件运行需要root权限，请使用root过的安卓手机，或者在“虚拟大师”这样能获得root权限的模拟器中使用")
        log("    2. 由于本人时间精力有限，本软件仅仅完成用户信息侦测上传，挂机功能需要配合“江东云”实现")
    }


    fun onProb(view: View) {
        model?.startWork()
    }

    fun onUpload(view: View) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("上传用户信息")
        builder.setMessage("确定要上传最近一次成功侦测到的用户信息到云端吗？")
        builder.setPositiveButton("确定上传") { _, _ -> model?.upload() }
        builder.setNegativeButton("我再想想") { _, _ ->  }
        val alert = builder.create()
        alert.show()
    }


    /**
     * 添加日志
     */
    fun addLog(color: Int, text: String, type: Int = 0) {
        Log.d(LOG_TAG, text + "type:$type")
        val linear = findViewById<LinearLayout>(R.id.log_layout)

        // 如果记录条数超过1000，那么删除最早的记录
        while (linear.childCount > 1000) {
            linear.removeViewAt(0)
        }

        // 如果传入的type为1，那么修改上次的同类数据
        if (type == 1 && linear.childCount > 0) {
            val newNode = linear.getChildAt(linear.childCount - 1) as TextView
            if (newNode.hint == "1") {
                newNode.text = text
                return
            }
        }

        // 如果当前时间，距离上次显示时间超过3分钟，而且距离上条记录超过5秒钟，那么插入一条时间日期
        val nowTick = Date().time
        if (timeLastShowTime == null || timeLastLog == null || (nowTick - timeLastShowTime!!.time) > 3 * 60000 && (nowTick - timeLastLog!!.time) > 5000) {
            val textView = TextView(this)
            textView.text = DateFormat.getDateTimeInstance().format(Date())
            textView.setTextColor((0x66000000).toInt())
            textView.setTextIsSelectable(true)
            textView.textSize = 12.0f
            textView.gravity = Gravity.CENTER
            linear.addView(textView)
            timeLastShowTime = Date()
        }

        // 添加当前记录
        val textView = TextView(this)
        textView.text = text
        if (type != 0) {
            textView.hint = type.toString()
        }
        textView.setTextColor((0x660000ff).toInt())
        textView.setBackgroundColor(color) //android:textIsSelectable="true"
        textView.setTextIsSelectable(true)
        linear.addView(textView)
        timeLastLog = Date()

        // 自动滚动到底部
        Handler(Looper.getMainLooper()).postDelayed({
            val scrollView = findViewById<ScrollView>(R.id.log_scroll_view)
            scrollView.fullScroll(ScrollView.FOCUS_DOWN);
        }, 200)
    }


    /**
     * 普通日志，一般用于普通提示信息
     */
    private fun log(text: String) {
        addLog((0xffb8f1ed).toInt(), text)
    }


    /**
     * 普通日志，一般用于普通提示信息
     */
    private fun log(text: String, type: Int = 0) {
        addLog((0xffb8f1ed).toInt(), text, type)
    }

    /**
     * 信息日志，一般用于比较重要的信息
     */
    private fun info(text: String, type: Int = 0) {
        addLog((0xffdcff93).toInt(), text, type)
    }

    /**
     * 提醒信息，可用于一些重要步骤的开始
     */
    private fun notice(text: String, type: Int = 0) {
        addLog((0xffd9b8f1).toInt(), text, type)
    }

    /**
     * 警告信息
     */
    private fun warn(text: String, type: Int = 0) {
        addLog((0xfff3d64e).toInt(), text, type)
    }

    /**
     * 错误信息
     */
    private fun err(text: String, type: Int = 0) {
        addLog((0xffff9b6a).toInt(), text, type)
    }
}

