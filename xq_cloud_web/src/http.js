const UserSeverUrl = 'http://server-2.example.invalid/user';
// const UserSeverUrl = 'http://localhost:5555/user';

/**
 * 向服务器发起请求并获取反馈数据
 * @param {string} path
 * @param {Object} data
 * @return {Promise<void>}
 */
async function ttRequest(path, data) {

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
    const retData = await new Promise((ok, err) => {
        const xhr = new XMLHttpRequest;
        xhr.open('POST', url);
        xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
        xhr.responseType = "json";
        xhr.onload = () => {
            if (xhr.status === 200) {
                ok(xhr.response);
            } else {
                err('请求出错 - ' + xhr.statusText);
            }
        }
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
 * 工作开始
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.key
 * @return {Promise<string>}
 */
export async function startWork(param) {
    return ttRequest("/start", param);
}

/**
 * 状态查询
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.key
 * @return {Promise<{
       ErrMsg:       string,
       State:        number,
       IsUserInfoOK: boolean,
       IsConfigOK:   boolean,
       IsSubOK:      boolean,
       UserInfoTime: string,
       UserInfoErr:  string,
       WorkTime:     string,
       VipState:     string,
       Logs:         string,
       VipTime:      string,
       LeftDays:     number,
  }>}
 // ErrMsg       string
 // State        int     // 当前工作状态 0.停止 1.开始
 // IsUserInfoOK bool    // 用户信息是否已经上传
 // IsConfigOK   bool    // 配置信息是否已经上传
 // IsSubOK      bool    // 属臣库是否已经上传
 // UserInfoTime string  // 用户信息上传的时间
 // UserInfoErr  string  // 如果用户信息已经上传，而且当前状态为停止，那么此处为停止原因
 // WorkTime     string  // 任务上次被接管的时间
 // VipState     string  // vip状态
 // Logs         string  // 最近日志
 // VipTime      string  // vip时间 为空表示不是vip
 // LeftDays     float64 // 剩余天数 小于0表示已经过期
 */
export async function workState(param) {
    return ttRequest("/state", param);
}

/**
 * 下载配置信息
 * @param {{platform:string, roleId: string, key:string}}param
 * @return {Promise<string>}
 */
export async function downloadInfo(param) {
    return  ttRequest("/download", param);
}


/**
 * 上传配置信息
 * @param {{platform:string, roleId: string, key:string, setting: string}}param
 * @return {Promise<string>}
 */
export async function uploadInfo(param) {
    return  ttRequest("/upload", param);
}


/**
 * 获取支付二维码
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.key
 * @param {number} param.priceId
 * @return {Promise<{Qr: string, Id: number, ErrMsg: string}>}
 */
export async function payQr(param) {
    return ttRequest("/payQr", param);
}

/**
 * 状态查询
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.key
 * @param {number} param.id
 * @return {Promise<{Finished: boolean, ErrMsg: string}>}
 */
export function checkQr(param) {
    return ttRequest("/checkQr", param);
}

/**
 * 添加一次性任务
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.key
 * @param {string} param.info
 * @return {Promise<string>}
 */
export function addOnceWork(param) {
    return ttRequest("/addOnceWork", param);
}

/**
 * 获取矿号数量
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.key
 * @return {Promise<string>}
 */
export function getSubCount(param) {
    return ttRequest("/getSubCount", param);
}
