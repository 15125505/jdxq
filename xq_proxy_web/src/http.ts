const UserSeverUrl = 'http://server-5.example.invalid/i/user/';

// const UserSeverUrl = 'http://localhost:5555/user';

/**
 * 向服务器发起请求并获取反馈数据
 * @param {string} path
 * @param {Object} data
 * @return {Promise<void>}
 */
async function ttRequest(path: string, data: { [key: string]: string }) {

    // url拼接
    const url = UserSeverUrl + path;

    // 参数拼接
    let urlParam = '';
    Object.keys(data).forEach((v) => {
        urlParam += `${encodeURIComponent(v)}=${encodeURIComponent(data[v])}&`
    });
    if (urlParam.length > 0) {
        urlParam = urlParam.substring(0, urlParam.length - 1);
    }

    // 执行网络请求
    const retData: { code: number, err?: string, msg?: any } = await new Promise((ok, err) => {
        const xhr = new XMLHttpRequest;
        xhr.open('POST', url);
        xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
        xhr.responseType = "json";
        xhr.onload = () => ok(xhr.response);
        xhr.onabort = () => err("操作终止");
        xhr.onerror = () => err("网络出错");
        xhr.ontimeout = () => err("访问超时");
        xhr.send(urlParam);
    })

    // 校验返回值
    if (retData?.code === 0) {
        return retData.msg;
    } else {
        await Promise.reject(retData?.err);
    }
}

/**
 * 获取最近侦测的用户
 */
export async function recentUser(param: { t: string }): Promise<{ C: number, P: string, U: string }> {
    return ttRequest("recentUser", param);
}

/**
 * 获取指定用户的角色Id
 */
export async function getRoleId(param: { t: string, p: string, u: string }): Promise<{ R: string, K: string }> {
    return ttRequest("getRoleId", param);
}
