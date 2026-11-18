import * as SparkMD5 from "spark-md5";

// const ServerUrl = 'http://127.0.0.1:5555/workCmd';
// const CloudServerUrl = 'http://127.0.0.1:5001/task';
// const UserSeverUrl = 'http://127.0.0.1:5000/user';
const ServerUrl = 'http://server-2.example.invalid/workCmd';
const CloudServerUrl = 'http://server-2.example.invalid:5001/task';
const UserSeverUrl = 'http://server-2.example.invalid/user';
const QuestionServerUrl = 'http://xq_server-17.example.invalid'

function checkParam(param: { [key: string]: any }) {
    const checkParam = {...param};
    checkParam.check = 12345;
    const str = JSON.stringify(checkParam);
    for (let i = 0; i < str.length; i++) {
        checkParam.check += str.charCodeAt(i);
    }
    return checkParam.check;
}


export async function reqQuestionServer<T>(uri: string, param: { [key: string]: any }): Promise<net.Msg<T>> {
    param.check = checkParam(param);
    const postData = JSON.stringify(param);
    return new Promise((ok, err) => {
        // 请求失败的处理
        const onFail = (reason) => {
            console.warn(Date(), "网络请求出错...", param, "错误：", reason);
            if (typeof reason === 'object') {
                reason = '网络异常' + JSON.stringify(reason);
            }
            err(reason + '');
        };

        // 请求成功的处理
        const onSuccess = (httpStatus, retData) => {
            if (httpStatus !== 200) {
                err(httpStatus.toString());
                return;
            }
            if (typeof retData === 'string') {
                try {
                    retData = JSON.parse(retData);
                } catch (e) {
                    err('解析json失败：' + retData);
                    return;
                }
            }
            ok(retData);
        };


        // 执行网络请求
        if (typeof XMLHttpRequest === 'function') {
            let xhr = new XMLHttpRequest;
            xhr.open('POST', QuestionServerUrl + uri);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.responseType = "json";
            xhr.onload = () => onSuccess(xhr.status, xhr.response);
            xhr.onabort = xhr.onerror = xhr.ontimeout = onFail;
            xhr.send(postData);
        } else {
            let http;
            eval(`http = require('http')`);
            const options = {
                method: 'POST',
                "headers": {
                    "content-type": "application/json",
                }
            };
            const req = http.request(QuestionServerUrl + uri, options, res => {
                let chunks = [];
                res.on('data', d => chunks.push(d));
                res.on('end', () => onSuccess(res.statusCode, Buffer.concat(chunks).toString()));
            });
            req.on('error', error => onFail(error.message));
            req.write(postData);
            req.end();
        }

    })

}

/**
 * 向服务器发起请求并获取反馈数据
 * @param {Object} data
 * @param pfnSuccess
 * @param pfnFail
 */
export function zRequest(data, pfnSuccess = null, pfnFail = null) {

    // data中插入一个字段，然后计算hash值，然后将这个字段改为实际hash值
    data.code = '@XQ_CODE@';
    data.tk = new Date().getTime();
    data.ck = '@XQ_CK@';
    let sendString = JSON.stringify(data);
    data.ck = SparkMD5.hash(sendString);
    sendString = sendString.replace('@XQ_CK@', data.ck);

    // 对数据进行加密
    let postData = new TextEncoder().encode(sendString);
    for (let i = 0; i + 1 < postData.length; i += 2) {
        postData[i] ^= postData[i + 1];
    }

    // 请求失败的处理
    let onFail = (reason) => {
        console.warn(Date(), "网络请求出错...", data, "错误：", reason);
        if (typeof reason === 'object') {
            reason = '网络异常' + JSON.stringify(reason);
        }
        pfnFail && pfnFail(reason + '');
    };

    // 请求成功的处理
    let onSuccess = (httpStatus, retData) => {
        if (httpStatus !== 200) {
            onFail(httpStatus);
            return;
        }

        // 对数据进行解密并返回
        try {

            // 数据解码
            let byteArray = new Uint8Array(retData);
            for (let i = 0; i + 1 < byteArray.length; i += 2) {
                byteArray[i] ^= byteArray[i + 1];
            }
            let retString = new TextDecoder().decode(byteArray);

            // 反馈数据必须携带发送的hash值
            let retNode = JSON.parse(retString);
            if (retNode.ck !== data.ck) {
                onFail('反馈数据没有携带发送hash值');
                return;
            }

            // 反馈数据必须校验通过
            let sk = SparkMD5.hash(retString.replace(retNode.sk, '@xq_sk@'));
            if (sk !== retNode.sk) {
                onFail('反馈数据校验失败：');
                return;
            }
            pfnSuccess && pfnSuccess(retNode.Data);
        } catch (e) {
            onFail(e);
        }
    };

    // 执行网络请求
    if (typeof XMLHttpRequest === 'function') {
        let xhr = new XMLHttpRequest;
        xhr.open('POST', ServerUrl);
        xhr.responseType = "arraybuffer";
        xhr.onload = () => onSuccess(xhr.status, xhr.response);
        xhr.onabort = xhr.onerror = xhr.ontimeout = onFail;
        xhr.send(postData.buffer);
    } else {
        let http;
        eval(`http = require('http')`);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': postData.length
            }
        };
        const req = http.request(ServerUrl, options, res => {
            let chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => onSuccess(res.statusCode, Buffer.concat(chunks)));
        });
        req.on('error', error => onFail(error.message));
        req.write(postData);
        req.end();
    }
}


/**
 * 向服务器发起请求并获取反馈数据
 * @param {string} path -- 请求地址，如 “/getTask”
 * @param {Object} data
 * @param pfnSuccess
 * @param pfnFail
 * @param isCloud
 */
export function tRequest(path, data, pfnSuccess = null, pfnFail = null, isCloud = true) {

    // url拼接
    let url = CloudServerUrl + path;
    if (!isCloud) {
        url = UserSeverUrl + path;
    }

    // 参数拼接
    let urlParam = '';
    Object.keys(data).forEach((v) => {
        urlParam += `${encodeURIComponent(v)}=${encodeURIComponent(data[v])}&`
    });
    if (urlParam.length > 0) {
        urlParam = urlParam.substr(0, urlParam.length - 1);
    }

    // 请求失败的处理
    let onFail = (reason) => {
        console.warn(Date(), "网络请求出错...", data, "错误：", reason);
        if (typeof reason === 'object') {
            // reason = JSON.stringify(reason);
            reason = '网络异常';
        }
        pfnFail && pfnFail(reason);
    };

    // 请求成功的处理
    let onSuccess = (httpStatus, retData) => {
        if (httpStatus !== 200) {
            onFail(httpStatus);
            return;
        }

        // 对数据进行解密并返回
        try {
            let retNode;
            if (typeof window === 'object') {
                retNode = retData;
            } else {
                retNode = retNode = JSON.parse(retData + '');
            }
            if (retNode.code === 0) {
                pfnSuccess && pfnSuccess(retNode.msg && retNode.msg);
            } else {
                pfnFail && pfnFail(retNode.err);
            }
        } catch (e) {
            console.log("解析反馈数据失败：", e);
            onFail(e);
        }
    };

    // 执行网络请求
    if (typeof XMLHttpRequest === 'function') {
        let xhr = new XMLHttpRequest;
        xhr.open('POST', url);
        xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
        xhr.responseType = "json";
        xhr.onload = () => onSuccess(xhr.status, xhr.response);
        xhr.onabort = xhr.onerror = xhr.ontimeout = onFail;
        xhr.send(urlParam);
    } else {
        let http;
        eval(`http = require('http')`);
        const options = {
            method: 'POST',
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
            }
        };
        const req = http.request(url, options, res => {
            let chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => onSuccess(res.statusCode, Buffer.concat(chunks)));
        });
        req.on('error', error => onFail(error.message));
        req.write(urlParam);
        req.end();
    }
}

/**
 * 创建key
 * @param {string} platform
 * @param {string} roleId
 */
export function genKey(platform, roleId) {
    return SparkMD5.hash(platform + 'xq' + roleId);
}

/**
 * 创建hallId
 * @param roleId
 * @param serverTime
 */
export function genHallId(roleId, serverTime) {
    return SparkMD5.hash(roleId + 'get_hall_info' + Math.ceil(serverTime / 60));
}

export function zmd5(src) {
    return SparkMD5.hash(src);
}

/**
 * 创建infoHall
 * @param roleId
 * @param serverTime
 */
export function genInfoHall(roleId, serverTime) {
    return SparkMD5.hash(roleId + 'info_hall' + Math.ceil(serverTime / 60));
}

/**
 * 创建infoHall
 * @param roleId
 * @param serverTime
 */
export function genInfoHall2(roleId, serverTime) {
    return SparkMD5.hash(roleId + 'hall_info' + Math.ceil(serverTime / 60));
}

/**
 * 创建 checkParam
 * @param roleId
 * @param serverTime
 */
export function genCheckParam(roleId, serverTime) {
    return SparkMD5.hash(roleId + 'param' + Math.ceil(serverTime / 60));
}

/**
 * 创建extId
 * @param serverTime
 */
export function genExtId(serverTime) {
    return SparkMD5.hash('ext_id' + Math.ceil(serverTime / 60));
}

/**
 * gameInfo
 * @param serverTime
 */
export function genGameInfo(serverTime) {
    return SparkMD5.hash('info_game' + Math.ceil(serverTime / 60));
}

/**
 * userInfo
 * @param roleId
 * @param serverTime
 */
export function genUserInfo(roleId, serverTime) {
    return SparkMD5.hash(Math.ceil(serverTime / 60) + 'info_check');
}

/**
 * playInfo
 * @param roleId
 * @param serverTime
 */
export function genPlayInfo(roleId, serverTime) {
    return SparkMD5.hash(roleId + 'play_info' + Math.ceil(serverTime / 60));
}

/**
 * paramInfo
 * @param roleId
 * @param serverTime
 */
export function genParamInfo(roleId, serverTime) {
    let n = 0, a = 0;
    let e = serverTime || "00000000", t = Math.floor(1e4 * Math.random()) + 1e4;
    n === e ? ++a : a = 0, n = e;
    let i = "00";
    i = (i + a).slice(-2);
    let s = '';
    for (let o = ("" + e).slice(-8) + i + ("" + t).slice(-4), r = SparkMD5.hash(o), _ = SparkMD5.hash(o + r), s = "", l = 0; l < _.length; ++l) {
        s += _[l];
        o[l] && (s += o[l]);
    }
    return s;
}

