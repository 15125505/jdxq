/**
 * 用于编解码的文件
 */
import {Log} from "./log";

export function initPack() {

    // 创建的编解码函数库
    work();

    // 对Date的扩展，将 Date 转化为指定格式的String
    // 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
    // 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
    // 例子：
    // (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
    // (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
    Date.prototype.Format = function (fmt) { //author: meizz
        var o = {
            "M+": this.getMonth() + 1,                 //月份
            "d+": this.getDate(),                    //日
            "h+": this.getHours(),                   //小时
            "m+": this.getMinutes(),                 //分
            "s+": this.getSeconds(),                 //秒
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度
            "S": this.getMilliseconds()             //毫秒
        };
        if (/(y+)/.test(fmt))
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt))
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    };
}

/**
 * 时间格式化函数
 * @param {Date | number} tm 需要格式的时间
 * @param {string} format 格式，如： yyyy-MM-dd h:m:s
 * @returns {string} 返回按照格式输出的结果
 */
export function formatTime(tm, format) {
    if (typeof tm === 'number') {
        tm = new Date(tm);
    }
    let date = {
        "M+": tm.getMonth() + 1,
        "d+": tm.getDate(),
        "h+": tm.getHours(),
        "m+": tm.getMinutes(),
        "s+": tm.getSeconds(),
        "q+": Math.floor((tm.getMonth() + 3) / 3),
        "S+": tm.getMilliseconds()
    };
    if (/(y+)/i.test(format)) {
        format = format.replace(RegExp.$1, (tm.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (let k in date) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ?
                date[k] : ("00" + date[k]).substr(("" + date[k]).length));
        }
    }
    return format;
}

// 复制文本
export function copyText(text) {
    let tag = document.createElement('textarea');
    tag.value = text;
    document.body.appendChild(tag);
    tag.select();
    document.execCommand('copy');
    document.body.removeChild(tag);
}


function r(r, e) {
    return null != e && "undefined" != typeof Symbol && e[Symbol.hasInstance] ? !!e[Symbol.hasInstance](r) : r instanceof e
}

function e(r) {
    return (e = "function" == typeof Symbol && "symbol" == n(Symbol.iterator) ? function (r) {
        return void 0 === r ? "undefined" : n(r)
    } : function (r) {
        return r && "function" == typeof Symbol && r.constructor === Symbol && r !== Symbol.prototype ? "symbol" : void 0 === r ? "undefined" : n(r)
    })(r)
}

var n = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (r) {
    return typeof r
} : function (r) {
    return r && "function" == typeof Symbol && r.constructor === Symbol && r !== Symbol.prototype ? "symbol" : typeof r
};


function work() {

    // 编码函数
    function n(n) {
        function t(n) {
            switch (e(n)) {
                case "undefined":
                    i(n);
                    break;
                case "boolean":
                    !function (r) {
                        a(r ? 195 : 194)
                    }(n);
                    break;
                case "number":
                    !function (r) {
                        if (isFinite(r) && Math.floor(r) === r)
                            if (r >= 0 && r <= 127) a(r);
                            else if (r < 0 && r >= -32) a(r);
                            else if (r > 0 && r <= 255) f([204, r]);
                            else if (r >= -128 && r <= 127) f([208, r]);
                            else if (r > 0 && r <= 65535) f([205, r >>> 8, r]);
                            else if (r >= -32768 && r <= 32767) f([209, r >>> 8, r]);
                            else if (r > 0 && r <= 4294967295) f([206, r >>> 24, r >>> 16, r >>> 8, r]);
                            else if (r >= -2147483648 && r <= 2147483647) f([210, r >>> 24, r >>> 16, r >>> 8, r]);
                            else if (r > 0 && r <= 0x10000000000000000) {
                                var e = r / s,
                                    n = r % s;
                                f([211, e >>> 24, e >>> 16, e >>> 8, e, n >>> 24, n >>> 16, n >>> 8, n])
                            } else r >= -0x8000000000000000 && r <= 0x8000000000000000 ? (a(211), u(r)) : f(r < 0 ? [211, 128, 0, 0, 0, 0, 0, 0, 0] : [207, 255, 255, 255, 255, 255, 255, 255, 255]);
                        else c || (l = new ArrayBuffer(8), c = new DataView(l)), c.setFloat64(0, r), a(203), f(new Uint8Array(l))
                    }(n);
                    break;
                case "string":
                    !function (r) {
                        var e = function (r) {
                                for (var e = !0, n = r.length, t = 0; t < n; t++)
                                    if (r.charCodeAt(t) > 127) {
                                        e = !1;
                                        break
                                    }
                                for (var i = 0, o = new Uint8Array(r.length * (e ? 1 : 4)), a = 0; a !== n; a++) {
                                    var f = r.charCodeAt(a);
                                    if (f < 128) o[i++] = f;
                                    else {
                                        if (f < 2048) o[i++] = f >> 6 | 192;
                                        else {
                                            if (f > 55295 && f < 56320) {
                                                if (++a >= n) throw new Error("UTF-8 encode: incomplete surrogate pair");
                                                var u = r.charCodeAt(a);
                                                if (u < 56320 || u > 57343) throw new Error("UTF-8 encode: second surrogate character 0x" + u.toString(16) + " at index " + a + " out of range");
                                                f = 65536 + ((1023 & f) << 10) + (1023 & u), o[i++] = f >> 18 | 240, o[i++] = f >> 12 & 63 | 128
                                            } else o[i++] = f >> 12 | 224;
                                            o[i++] = f >> 6 & 63 | 128
                                        }
                                        o[i++] = 63 & f | 128
                                    }
                                }
                                return e ? o : o.subarray(0, i)
                            }(r),
                            n = e.length;
                        n <= 31 ? a(160 + n) : f(n <= 255 ? [217, n] : n <= 65535 ? [218, n >>> 8, n] : [219, n >>> 24, n >>> 16, n >>> 8, n]), f(e)
                    }(n);
                    break;
                case "object":
                    null === n ? i(n) : r(n, Date) ? function (r) {
                        var e = r.getTime() / 1e3;
                        if (0 === r.getMilliseconds() && e >= 0 && e < 4294967296) f([214, 255, e >>> 24, e >>> 16, e >>> 8, e]);
                        else if (e >= 0 && e < 17179869184) {
                            var n = 1e6 * r.getMilliseconds();
                            f([215, 255, n >>> 22, n >>> 14, n >>> 6, n << 2 >>> 0 | e / s, e >>> 24, e >>> 16, e >>> 8, e])
                        } else {
                            var t = 1e6 * r.getMilliseconds();
                            f([199, 12, 255, t >>> 24, t >>> 16, t >>> 8, t]), u(e)
                        }
                    }(n) : Array.isArray(n) ? o(n) : r(n, Uint8Array) || r(n, Uint8ClampedArray) ? function (r) {
                        var e = r.length;
                        f(e <= 15 ? [196, e] : e <= 65535 ? [197, e >>> 8, e] : [198, e >>> 24, e >>> 16, e >>> 8, e]), f(r)
                    }(n) : r(n, Int8Array) || r(n, Int16Array) || r(n, Uint16Array) || r(n, Int32Array) || r(n, Uint32Array) || r(n, Float32Array) || r(n, Float64Array) ? o(n) : function (r) {
                        var e = 0;
                        for (var n in r) e++;
                        for (var i in e <= 15 ? a(128 + e) : f(e <= 65535 ? [222, e >>> 8, e] : [223, e >>> 24, e >>> 16, e >>> 8, e]), r) t(i), t(r[i])
                    }(n)
            }
        }

        function i(r) {
            a(192)
        }

        function o(r) {
            var e = r.length;
            e <= 15 ? a(144 + e) : f(e <= 65535 ? [220, e >>> 8, e] : [221, e >>> 24, e >>> 16, e >>> 8, e]);
            for (var n = 0; n < e; n++) t(r[n])
        }

        function a(r) {
            if (y.length < d + 1) {
                for (var e = 2 * y.length; e < d + 1;) e *= 2;
                var n = new Uint8Array(e);
                n.set(y), y = n
            }
            y[d] = r, d++
        }

        function f(r) {
            if (y.length < d + r.length) {
                for (var e = 2 * y.length; e < d + r.length;) e *= 2;
                var n = new Uint8Array(e);
                n.set(y), y = n
            }
            y.set(r, d), d += r.length
        }

        function u(r) {
            var e, n;
            r >= 0 ? (e = r / s, n = r % s) : (r++, e = ~(e = Math.abs(r) / s), n = ~(n = Math.abs(r) % s)), f([e >>> 24, e >>> 16, e >>> 8, e, n >>> 24, n >>> 16, n >>> 8, n])
        }

        var l, c, s = 4294967296,
            y = new Uint8Array(128),
            d = 0;
        return t(n), y.subarray(0, d)
    }

    // 解码函数
    function t(n) {
        function t() {
            var r = n[d++];
            if (r >= 0 && r <= 127) return r;
            if (r >= 128 && r <= 143) return u(r - 128);
            if (r >= 144 && r <= 159) return l(r - 144);
            if (r >= 160 && r <= 191) return c(r - 160);
            if (192 === r) return null;
            if (193 === r) throw new Error("Invalid byte code 0xc1 found.");
            if (194 === r) return !1;
            if (195 === r) return !0;
            if (196 === r) return f(-1, 1);
            if (197 === r) return f(-1, 2);
            if (198 === r) return f(-1, 4);
            if (199 === r) return s(-1, 1);
            if (200 === r) return s(-1, 2);
            if (201 === r) return s(-1, 4);
            if (202 === r) return a(4);
            if (203 === r) return a(8);
            if (204 === r) return o(1);
            if (205 === r) return o(2);
            if (206 === r) return o(4);
            if (207 === r) return o(8);
            if (208 === r) return i(1);
            if (209 === r) return i(2);
            if (210 === r) return i(4);
            if (211 === r) return i(8);
            if (212 === r) return s(1);
            if (213 === r) return s(2);
            if (214 === r) return s(4);
            if (215 === r) return s(8);
            if (216 === r) return s(16);
            if (217 === r) return c(-1, 1);
            if (218 === r) return c(-1, 2);
            if (219 === r) return c(-1, 4);
            if (220 === r) return l(-1, 2);
            if (221 === r) return l(-1, 4);
            if (222 === r) return u(-1, 2);
            if (223 === r) return u(-1, 4);
            if (r >= 224 && r <= 255) return r - 256;
            throw console.debug("msgpack array:", n), new Error("Invalid byte value '" + r + "' at index " + (d - 1) + " in the MessagePack binary data (length " + n.length + "): Expecting a range of 0 to 255. This is not a byte array.")
        }

        function i(r) {
            for (var e = 0, t = !0; r-- > 0;)
                if (t) {
                    var i = n[d++];
                    e += 127 & i, 128 & i && (e -= 128), t = !1
                } else e *= 256, e += n[d++];
            return e
        }

        function o(r) {
            for (var e = 0; r-- > 0;) e *= 256, e += n[d++];
            return e
        }

        function a(r) {
            var e = new DataView(n.buffer, d, r);
            return d += r, 4 === r ? e.getFloat32(0, !1) : 8 === r ? e.getFloat64(0, !1) : void 0
        }

        function f(r, e) {
            r < 0 && (r = o(e));
            var t = n.subarray(d, d + r);
            return d += r, t
        }

        function u(r, e) {
            r < 0 && (r = o(e));
            for (var n = {}; r-- > 0;) n[t()] = t();
            return n
        }

        function l(r, e) {
            r < 0 && (r = o(e));
            for (var n = []; r-- > 0;) n.push(t());
            return n
        }

        function c(r, e) {
            r < 0 && (r = o(e));
            var t = d;
            return d += r,
                function (r, e, n) {
                    var t = e,
                        i = "";
                    for (n += e; t < n;) {
                        var o = r[t++];
                        if (o > 127)
                            if (o > 191 && o < 224) {
                                if (t >= n) throw new Error("UTF-8 decode: incomplete 2-byte sequence");
                                o = (31 & o) << 6 | 63 & r[t++]
                            } else if (o > 223 && o < 240) {
                                if (t + 1 >= n) throw new Error("UTF-8 decode: incomplete 3-byte sequence");
                                o = (15 & o) << 12 | (63 & r[t++]) << 6 | 63 & r[t++]
                            } else {
                                if (!(o > 239 && o < 248)) throw new Error("UTF-8 decode: unknown multibyte start 0x" + o.toString(16) + " at index " + (t - 1));
                                if (t + 2 >= n) throw new Error("UTF-8 decode: incomplete 4-byte sequence");
                                o = (7 & o) << 18 | (63 & r[t++]) << 12 | (63 & r[t++]) << 6 | 63 & r[t++]
                            }
                        if (o <= 65535) i += String.fromCharCode(o);
                        else {
                            if (!(o <= 1114111)) throw new Error("UTF-8 decode: code point 0x" + o.toString(16) + " exceeds UTF-16 reach");
                            o -= 65536, i += String.fromCharCode(o >> 10 | 55296), i += String.fromCharCode(1023 & o | 56320)
                        }
                    }
                    return i
                }(n, t, r)
        }

        function s(r, e) {
            r < 0 && (r = o(e));
            var n = o(1),
                t = f(r);
            switch (n) {
                case 255:
                    return function (r) {
                        if (4 === r.length) {
                            var e = (r[0] << 24 >>> 0) + (r[1] << 16 >>> 0) + (r[2] << 8 >>> 0) + r[3];
                            return new Date(1e3 * e)
                        }
                        if (8 === r.length) {
                            var n = (r[0] << 22 >>> 0) + (r[1] << 14 >>> 0) + (r[2] << 6 >>> 0) + (r[3] >>> 2),
                                t = (3 & r[3]) * y + (r[4] << 24 >>> 0) + (r[5] << 16 >>> 0) + (r[6] << 8 >>> 0) + r[7];
                            return new Date(1e3 * t + n / 1e6)
                        }
                        if (12 === r.length) {
                            var o = (r[0] << 24 >>> 0) + (r[1] << 16 >>> 0) + (r[2] << 8 >>> 0) + r[3];
                            d -= 8;
                            var a = i(8);
                            return new Date(1e3 * a + o / 1e6)
                        }
                        throw new Error("Invalid data length for a date value.")
                    }(t)
            }
            return {
                type: n,
                data: t
            }
        }

        var y = 4294967296,
            d = 0;
        if (r(n, ArrayBuffer) && (n = new Uint8Array(n)), "object" != e(n) || void 0 === n.length) throw new Error("Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.");
        if (!n.length) throw new Error("Invalid argument: The byte array to deserialize is empty.");
        r(n, Uint8Array) || (n = new Uint8Array(n));
        var h = t();
        return n.length, h
    }

    var i = {
        encode: n,
        decode: t
    };
    window.MP = i
}


function base64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

window.d = function (base64String) {
    let ret = MP.decode(base64ToUint8Array(base64String));
    JSON.stringify(ret);
    console.log(JSON.stringify(ret, null, 4));
};

export function decodeString(base64String) {

    // 显示需要解码的原始内容
    Log.info('<span onclick="onCopy(this)">解码：\n' + base64String + '</span>');

    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    // 执行解码
    try {
        // base64解码出的二进制数据
        let src = window.atob(base64);

        // 如果前面4个字节是mask，直接删除
        let direction = 'send = ';
        let start = 0;
        if (src.substr(0, 4) === 'mask') {
            start = 4;
            direction = 'ret = ';
        }

        // 二进制数据转utf8array
        const outputArray = new Uint8Array(src.length - start);
        for (let i = start; i < src.length; ++i) {
            outputArray[i - start] = src.charCodeAt(i);
        }

        // 执行解码
        let ret = MP.decode(outputArray);
        Log.warn(`<span onclick="onCopy(this)">${direction}${JSON.stringify(ret, null, 4)};</span>`);
    } catch (e) {
        Log.err('非法输入！');
    }
}

window.onCopy = function (e) {
    console.log('用户点击复制', e, e.innerText);
    copyText(e.innerText);
};
