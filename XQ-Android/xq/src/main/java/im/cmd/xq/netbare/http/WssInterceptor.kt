package im.cmd.xq.netbare.http

import android.util.Log
import im.cmd.xq.netbare.ws.WebSocketCallback
import im.cmd.xq.netbare.ws.WebSocketReader
import java.io.InputStream
import java.nio.ByteBuffer

/**
 * An interceptor that detects and captures WebSocket (WSS) data.
 */
class WssInterceptor : HttpIndexedInterceptor() {

    companion object {
        private const val TAG = "WssInterceptor"

        fun createFactory(): HttpInterceptorFactory {
            return HttpInterceptorFactory { WssInterceptor() }
        }
    }

    private var requestReader: WebSocketReader? = null
    private var responseReader: WebSocketReader? = null

    private var requestInputStream: BufferInputStream? = null
    private var responseInputStream: BufferInputStream? = null

    override fun intercept(chain: HttpRequestChain, buffer: ByteBuffer, index: Int) {
        val session = chain.request().session()
        
        if (index == 0) {
            // Header is already parsed by HttpHeaderParseInterceptor
            val upgrade = session.requestHeaders["Upgrade"]?.firstOrNull()
            if (upgrade?.equals("websocket", ignoreCase = true) == true) {
                session.isWebSocket = true
                Log.d(TAG, "Detected WebSocket upgrade request for ${chain.request().url()}")
            }
        } else if (session.isWebSocket) {
            // This is WebSocket data
            try {
                if (requestReader == null) {
                    val bis = BufferInputStream()
                    requestInputStream = bis
                    requestReader = WebSocketReader(bis, true, object : WebSocketCallback {
                        override fun onReadMessage(text: String) {
                            Log.i(TAG, "WSS Request Text: $text")
                        }

                        override fun onReadMessage(bytes: ByteArray) {
                            Log.i(TAG, "WSS Request Binary: ${bytes.size} bytes")
                        }

                        override fun onReadPing(payload: ByteArray) {}
                        override fun onReadPong(payload: ByteArray) {}
                        override fun onReadClose(code: Int, reason: String) {
                            Log.d(TAG, "WSS Request Closed: $code $reason")
                        }
                    })
                }
                requestInputStream?.feed(buffer)
                while ((requestInputStream?.available() ?: 0) > 0) {
                    requestReader?.processNextFrame()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing WSS request frame", e)
            }
        }

        chain.process(buffer)
    }

    override fun intercept(chain: HttpResponseChain, buffer: ByteBuffer, index: Int) {
        val session = chain.response().session()

        if (index == 0) {
            if (session.isWebSocket && session.code == 101) {
                Log.d(TAG, "WebSocket upgrade confirmed for ${chain.response().url()}")
            }
        } else if (session.isWebSocket) {
            try {
                if (responseReader == null) {
                    val bis = BufferInputStream()
                    responseInputStream = bis
                    responseReader = WebSocketReader(bis, false, object : WebSocketCallback {
                        override fun onReadMessage(text: String) {
                            Log.i(TAG, "WSS Response Text: $text")
                        }

                        override fun onReadMessage(bytes: ByteArray) {
                            Log.i(TAG, "WSS Response Binary: ${bytes.size} bytes")
                        }

                        override fun onReadPing(payload: ByteArray) {}
                        override fun onReadPong(payload: ByteArray) {}
                        override fun onReadClose(code: Int, reason: String) {
                            Log.d(TAG, "WSS Response Closed: $code $reason")
                        }
                    })
                }
                responseInputStream?.feed(buffer)
                while ((responseInputStream?.available() ?: 0) > 0) {
                    responseReader?.processNextFrame()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing WSS response frame", e)
            }
        }

        chain.process(buffer)
    }

    /**
     * A simple InputStream that can be fed with ByteBuffers.
     */
    private class BufferInputStream : InputStream() {
        private val buffers = mutableListOf<ByteArray>()
        private var currentBufferIndex = 0
        private var currentPos = 0

        fun feed(buffer: ByteBuffer) {
            val bytes = ByteArray(buffer.remaining())
            buffer.duplicate().get(bytes)
            buffers.add(bytes)
        }

        override fun read(): Int {
            if (currentBufferIndex >= buffers.size) return -1
            val buffer = buffers[currentBufferIndex]
            if (currentPos >= buffer.size) {
                currentBufferIndex++
                currentPos = 0
                return read()
            }
            return buffer[currentPos++].toInt() and 0xFF
        }

        override fun available(): Int {
            var total = 0
            for (i in currentBufferIndex until buffers.size) {
                val buffer = buffers[i]
                total += if (i == currentBufferIndex) buffer.size - currentPos else buffer.size
            }
            return total
        }
    }
}
