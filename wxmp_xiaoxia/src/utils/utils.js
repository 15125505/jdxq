/**
 * @return {string}
 */
import {ServerAddr} from "./common";

export function GetQueryString(name) {
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    let r = window.location.search.substr(1).match(reg);//search,查询？后面的参数，并匹配正则
    if (!r) {
        return "";
    }
    return unescape(r[2]);
}

/**
 * 用于访问我们自己服务器的http请求函数，兼容微信
 * @param {function(*)} pfnSuccess 请求成功的回调函数
 * @param {function} pfnFail 请求失败的回调函数
 * @param {string} path 用户请求的具体地址，如： "login"
 * @param {Object} data 用户请求的内容 如果当前为GET请求，那么将以kv方式拼接，如果是POST请求，将作为json发送
 * @param {string} method 用户请求的类型，默认为 "GET"
 */
export function zReq(path, data, pfnSuccess = null, pfnFail = null, method = "GET") {
    zRequest(path, data, (code, msg, err)=> {
        if (code === 0) {
            pfnSuccess && pfnSuccess(msg);
            return;
        }
        console.log('服务器返回错误：', err);
        pfnFail && pfnFail(err);
    }, pfnFail, method);
}


/**
 * 用于访问我们自己服务器的http请求函数，兼容微信
 * @param {function(number, Object, string)} pfnSuccess 请求成功的回调函数
 * @param {function} pfnFail 请求失败的回调函数
 * @param {string} path 用户请求的具体地址，如： "login"
 * @param {Object} data 用户请求的内容 如果当前为GET请求，那么将以kv方式拼接，如果是POST请求，将作为json发送
 * @param {string} method 用户请求的类型，默认为 "GET"
 */
export function zRequest(path, data, pfnSuccess = null, pfnFail = null, method = "GET") {

    // 请求失败的处理
    let onFail = (reason) => {
        console.error("网络请求出错...", path, data, "错误：", reason);
        pfnFail && pfnFail(reason + '');
    };

    // 请求成功的处理
    let onSuccess = (httpStatus, retData) => {
        console.log(httpStatus, "-----请求", path, data, "返回", retData);
        if (httpStatus !== 200) {
            onFail(httpStatus);
            return;
        }
        if (!retData || typeof retData.code !== 'number') {
            onFail("服务器返回的内容异常");
            return;
        }
        pfnSuccess && pfnSuccess(retData.code, retData.msg, retData.err);
    };

    // 拼接完整路径
    let url = path.substr(0, 1) === "/" ? ServerAddr + path : ServerAddr + "/" + path;

    // 如果是GET模式，那么需要将参数进行拼接
    let urlParam = '';
    if (method === "GET") {
        let keys = Object.keys(data);
        keys.forEach((v) => {
            urlParam += `${encodeURIComponent(v)}=${encodeURIComponent(data[v])}&`
        });
        if (urlParam.length > 0) {
            urlParam = urlParam.substr(0, urlParam.length - 1);
        }
    }
    if (urlParam.length > 0 && url[url.length - 1] !== '?') {
        url += '?';
    }
    url += urlParam;

    // 如果是Post模式，那么参数将作为json发送给服务器
    let postData;
    if (method === "POST") {
        postData = JSON.stringify(data);
    }

    // 执行网络请求
    let xhr = new XMLHttpRequest;
    xhr.open(method, url, true);
    xhr.responseType = "json";
    xhr.onload = () => onSuccess(xhr.status, xhr.response);
    xhr.onabort = ()=>onFail('onabort');
    xhr.ontimeout = ()=>onFail('ontimeout');
    xhr.onerror = ()=>onFail('网络出错');
    xhr.send(postData);
}

// 复制文本
export function copyText(text) {
    let tag = document.createElement('input');
    tag.setAttribute('id', 'cp_hgz_input');
    tag.value = text;
    document.getElementsByTagName('body')[0].appendChild(tag);
    document.getElementById('cp_hgz_input').select();
    document.execCommand('copy');
    document.getElementById('cp_hgz_input').remove();
}
