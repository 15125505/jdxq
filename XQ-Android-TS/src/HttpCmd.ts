/**
 * 网络通信的实现模块
 */

export interface AppUpParam {
    au: string;
    uid: number;
    ci: string;
    ua: string;
    wss: string;
    name?: string;
    nick?: string;
    server?: number;
    ro?: number;
}

class HttpCmd {

    // readonly Server = "http://192.0.2.1:5000/";
    readonly Server = "http://server-5.example.invalid/i/";

    /**
     * 上传用户信息
     */
    async appUp(
        param: AppUpParam,
    ): Promise<{
        R: number, // roleId
        K: string, // key
        P: string, //platform
        S: string, // server
        U: string, // Name
        N: string, // Nick
    }> {
        return await this.httpReq('appUp', {...param}, {P: "p", S: 123, R: 123, K: 'k', U: 'u', N: 'n'});
    }


    /**
     * 判断两个符合json格式的对象类型是否一致，所有属性的类型完全一致视为相同
     * @param a
     * @param b
     */
    protected isSameType(a: any, b: any): boolean {

        // 类型不同直接返回false
        let [typeA, typeB] = [typeof a, typeof b];
        if (typeA !== typeB) {
            return false;
        }

        // 如果是基础类型，直接返回基础类型比较结果
        if ([typeof 1, typeof '1', typeof true, 'bigint', 'undefined'].includes(typeA)) {
            return true;
        }

        // 基础类型之外，只处理不为null的object类型
        if (typeA !== 'object' || a === null || b === null) {
            return false;
        }

        // 根据length是否为undefined来确定是否为对象
        let [typeALen, typeBLen] = [typeof a.length, typeof b.length];
        if (typeALen !== typeBLen) {
            return false;
        }

        // 处理数组
        if (typeALen === 'number') {

            // 任何一个数组为空，视为类型一致
            if (a.length === 0 || b.length === 0) {
                return true;
            }
            return this.isSameType(a[0], b[0]);
        }

        // 处理对象
        for (let key in a) {
            if (!this.isSameType(a[key], b[key])) {
                // console.log(b, '中字段：', key, '不符合要求（类型不对或者有缺失）');
                return false;
            }
        }
        for (let key in b) {
            if (!this.isSameType(a[key], b[key])) {
                // console.log(b, '中字段：', key, '是多余的');
                return false;
            }
        }
        return true;
    }

    /**
     * 网络请求
     * @param cmdName       请求的命令名称
     * @param reqParam      请求参数
     * @param expectRet     期望的返回对象，如果该参数有效，那么本函数会对结果进行校验，与该参数类型不一致将视为返回数据有误
     * @param method        请求方式
     */
    protected async httpReq(cmdName: string, reqParam: {
        [key: string]: string | number | boolean
    }, expectRet?: any, method: 'Get' | 'Post' = 'Post') {

        // 根据模式确定服务器地址
        const server = this.Server;

        // 发起网络请求
        const xhr = new XMLHttpRequest;
        xhr.responseType = "arraybuffer";
        const retBuff = await new Promise((ok, err) => {
            xhr.onload = () => xhr.status === 200 ? ok(xhr.response) : err(`网络请求出错(${xhr.status})`);
            xhr.onabort = xhr.onerror = xhr.ontimeout = () => err('网络请求失败');
            if (method === 'Get') {
                xhr.open('GET', server + cmdName + '?' + Array.from(Object.keys(reqParam), v => `${v}=${encodeURIComponent(reqParam[v])}`).join('&'));
                xhr.send();
            } else {
                xhr.open('POST', server + cmdName);
                xhr.setRequestHeader('content-type', 'application/octet-stream');
                xhr.send(this.encodedString(JSON.stringify(reqParam)).buffer);
            }
        });

        // 对收到的数据进行解码并解析json对象
        let retObj = JSON.parse(this.decodeData(retBuff));
        if (typeof retObj?.code !== 'number') {
            throw new Error('服务器返回了异常的数据');
        }
        if (retObj.code !== 0) {
            return Promise.reject(`${retObj.err}`);
        }
        if (expectRet && !this.isSameType(expectRet, retObj.msg)) {
            console.error('服务器返回的数据格式不符合预期：', expectRet, '服务器返回的：', retObj.msg);
            throw new Error('反馈数据格式错误');
        }
        return retObj.msg;
    }

    /**
     * 生成加密后的内容
     * @param src
     */
    encodedString(src: string): Uint8Array {
        const data = new Uint8Array(this.string2Bytes(src));
        for (let i = 0; i < data.length; i++) {
            data[i] ^= 0x64;
        }
        return data;
    }

    /**
     * 对数据进行解密
     */
    decodeData(data: any): string {
        const byteArray = new Uint8Array(data);
        for (let i = 0; i < byteArray.length; i++) {
            byteArray[i] ^= 0x64;
        }
        return this.bytes2String(byteArray);
    }

    /**
     * 字符串转字节数组
     */
    string2Bytes(str: string) {
        let out = [], p = 0;
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            } else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            } else if (
                ((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
                ((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
                c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            } else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };

    /**
     * 字节数组转字符串
     */
    bytes2String(bytes: Uint8Array) {
        let out = [], pos = 0, c = 0;
        while (pos < bytes.length) {
            let c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            } else if (c1 > 191 && c1 < 224) {
                let c2 = bytes[pos++];
                out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
            } else if (c1 > 239 && c1 < 365) {
                let c2 = bytes[pos++];
                let c3 = bytes[pos++];
                let c4 = bytes[pos++];
                let u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) -
                    0x10000;
                out[c++] = String.fromCharCode(0xD800 + (u >> 10));
                out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
            } else {
                let c2 = bytes[pos++];
                let c3 = bytes[pos++];
                out[c++] =
                    String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
            }
        }
        return out.join('');
    };
}

export const gHttpCmd = new HttpCmd();


