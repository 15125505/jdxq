package im.cmd.xq

import android.util.Base64
import android.util.Log
import im.cmd.xq.netbare.http.HttpIndexedInterceptor
import im.cmd.xq.netbare.http.HttpInterceptorFactory
import im.cmd.xq.netbare.http.HttpRequestChain
import im.cmd.xq.netbare.http.HttpResponseChain
import org.json.JSONObject
import java.nio.ByteBuffer
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.GZIPInputStream
import java.nio.charset.StandardCharsets
import kotlin.experimental.xor

/**
 * 创建 StreamNode 结构来存储接收到的数据。
 */
class StreamNode {
    var send = ByteArray(0)
    var recv = ByteArray(0)
}


/**
 * 拦截器反例1：打印请求url
 */
class HttpUrlPrintInterceptor : HttpIndexedInterceptor() {

    companion object {
        const val TAG = "XQURL"

        const val Server = "http://server-5.example.invalid/i/"

        fun createFactory(): HttpInterceptorFactory {
            return HttpInterceptorFactory { HttpUrlPrintInterceptor() }
        }
    }

    private val streamMap = mutableMapOf<String, StreamNode>()

    private fun appendBytes(original: ByteArray, newBytes: ByteArray): ByteArray {
        val result = ByteArray(original.size + newBytes.size)
        System.arraycopy(original, 0, result, 0, original.size)
        System.arraycopy(newBytes, 0, result, original.size, newBytes.size)
        return result
    }

    override fun intercept(chain: HttpRequestChain, buffer: ByteBuffer, index: Int) {

        // 并非胡莱三国的包，不予处理
        if (!chain.request().url().contains("-hlsg.")) {
            chain.process(buffer)
            return
        }

        // 从map中获取当前节点
        val node = streamMap.getOrPut(chain.request().url()) { StreamNode() }

        // 取出当前数据并加入到缓冲区
        val bufferCopy = buffer.duplicate()
        val newBytes = ByteArray(bufferCopy.remaining())
        bufferCopy.get(newBytes)
        if (index == 0) {
            node.send = newBytes
        } else {
            node.send = appendBytes(node.send, newBytes)
        }


        chain.process(buffer)
    }

    override fun intercept(chain: HttpResponseChain, buffer: ByteBuffer, index: Int) {

        // 并非胡莱三国的包，不予处理
        if (!chain.response().url().contains("-hlsg.")) {
            chain.process(buffer)
            return
        }

        // 从map中获取当前节点
        val node = streamMap.getOrPut(chain.response().url()) { StreamNode() }

        // 取出当前数据并加入到缓冲区
        val bufferCopy = buffer.duplicate()
        val newBytes = ByteArray(bufferCopy.remaining())
        bufferCopy.get(newBytes)
        if (index == 0) {
            node.recv = newBytes
        } else {
            node.recv = appendBytes(node.recv, newBytes) // 追加数据到 recv 对象
        }

        // 检查收到的数据是否完整
        val str = processHttpResponse(node.recv)
        if (str != "") {
            Log.i(TAG, "数据已经完整：$str")
            processData(
                chain.response().url(),
                str,
                processHttpResponse(node.send),
                chain.response().requestHeaders()["User-Agent"]?.get(0) ?: ""
            )
        }

        chain.process(buffer)
    }

    /**
     * 处理数据
     */
    private fun processData(url: String, recv: String, send: String, ua: String) {
        Log.e(TAG, "url: $url\n\nrecv: $recv\n\nsend: $send\n\nua: $ua")
        ZZ.dataIn(
            Base64.encodeToString(url.toByteArray(), Base64.DEFAULT),
            Base64.encodeToString(recv.toByteArray(), Base64.DEFAULT),
            Base64.encodeToString(send.toByteArray(), Base64.DEFAULT),
            Base64.encodeToString(ua.toByteArray(), Base64.DEFAULT)
        )

    }


    interface OnServerResponseListener {
        fun onResponse(result: String)
        fun onError(errorMsg: String)
    }

    private fun toServer(jsonObject: JSONObject, url: String, listener: OnServerResponseListener) {

        Thread {
            try {
                // 数据加密
                val bytes = jsonObject.toString().toByteArray(Charsets.UTF_8)
                for (i in bytes.indices) {
                    bytes[i] = bytes[i] xor 0x64
                }

                // 发送数据
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.doOutput = true
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/octet-stream")
                connection.setRequestProperty("Accept", "application/octet-stream")
                connection.outputStream.write(bytes)
                connection.outputStream.flush()
                connection.outputStream.close()
                val inputStream = connection.inputStream
                val result = inputStream.readBytes()
                inputStream.close()

                // 解密数据
                for (i in result.indices) {
                    result[i] = result[i] xor 0x64
                }

                // 返回结果
                listener.onResponse(String(result, Charsets.UTF_8))

            } catch (e: Exception) {
                // 处理异常
                listener.onError(e.message ?: "Unknown error occurred.")
            }
        }.start()
    }


    private fun processHttpResponse(response: ByteArray): String {
        try {
            val responseStr = response.toString(StandardCharsets.UTF_8)
            val headerEndIndex = responseStr.indexOf("\r\n\r\n")
            if (headerEndIndex == -1) {
                return ""
            }

            val headerStr = responseStr.substring(0, headerEndIndex)
            val isChunked = headerStr.contains("Transfer-Encoding: chunked", ignoreCase = true)
            val isGzip = headerStr.contains("Content-Encoding: gzip", ignoreCase = true)
            val bodyStartIndex = headerEndIndex + 4

            val body: ByteArray
            if (isChunked) {
                val chunkedBody = response.copyOfRange(bodyStartIndex, response.size)
                body = decodeChunked(chunkedBody)
            } else {
                body = response.copyOfRange(bodyStartIndex, response.size)
            }

            return if (isGzip && body.isNotEmpty()) {
                decompressGzip(body)
            } else {
                body.toString(StandardCharsets.UTF_8)
            }
        } catch (e: Exception) {
            Log.e(TAG, "body解析出现异常：$e")
            return ""
        }
    }


    /**
     * 解码 chunked 编码的 HTTP 响应体。
     *
     * @param chunkedBody 一个包含 chunked 编码数据的 ByteArray。
     * @return 解码后的 ByteArray。如果在解码过程中遇到错误，则返回空 ByteArray。
     */
    private fun decodeChunked(chunkedBody: ByteArray): ByteArray {
        val result = ByteArrayOutputStream()
        val inputStream = ByteArrayInputStream(chunkedBody)

        while (true) {
            // 读取并解析每个 chunk 的大小
            val chunkSizeLine = inputStream.readLine() ?: break
            val chunkSize = chunkSizeLine.toIntOrNull(16) ?: 0

            // 当遇到大小为 0 的 chunk 时，表示数据已经结束
            if (chunkSize == 0) {
                break
            }

            // 读取 chunk 数据，并将其写入结果
            val chunkData = ByteArray(chunkSize)
            inputStream.read(chunkData, 0, chunkSize)
            result.write(chunkData)

            // 读取并忽略 chunk 之后的 CRLF
            inputStream.readLine()
        }

        return result.toByteArray()
    }

    @Throws(IOException::class)
    fun ByteArrayInputStream.readLine(): String? {
        val sb = StringBuilder()
        var char: Int
        while (this.read().also { char = it } != -1) {
            if (char == '\r'.toInt()) {
                this.mark(1)
                if (this.read() == '\n'.toInt()) {
                    break
                }
                this.reset()
                break
            } else if (char == '\n'.toInt()) {
                break
            } else {
                sb.append(char.toChar())
            }
        }
        return if (sb.isNotEmpty()) sb.toString() else null
    }

    /**
     * 对gzip数据进行解压
     */
    private fun decompressGzip(compressed: ByteArray): String {
        GZIPInputStream(ByteArrayInputStream(compressed)).use { gzipInputStream ->
            ByteArrayOutputStream().use { byteArrayOutputStream ->
                gzipInputStream.copyTo(byteArrayOutputStream)
                return byteArrayOutputStream.toString(StandardCharsets.UTF_8.name())
            }
        }
    }
}

