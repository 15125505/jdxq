import {genKey, tRequest, zRequest} from "./utils";

/**
 * @typedef {Object} GetUserInfoRet
 * @property {number} VipLevel - vip等级
 * @property {number} TowerCount - 今日已经爬塔的次数
 * @property {number} ChestCount - 今日已经采矿的次数
 * @property {number} LeftTime - 今天剩余时间：秒
 * @property {string} VipTime - Vip到期时间
 * @property {Array.<{UserId: string, Level: number}>} Players - 为用户推荐的玩家信息
 */

/**
 * 获取用户信息
 * @param {Object} param
 * @param {string} param.userId - 玩家的用户Id
 * @param {string} param.platform
 * @param {string} param.roleId - 玩家的角色Id
 * @param {number} param.serverId - 玩家的服务器Id
 * @param {number} param.partitionId - 玩家的大区Id
 * @param {string} param.userName - 玩家名称
 * @param {string} param.nick - 玩家昵称
 * @param {number} param.vipExp - vip经验
 * @param {number} param.vipLevel - vip等级
 * @param {function(GetUserInfoRet)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function getUserInfo(param, pfnSuccess, pfnFail) {
    param.cmdName = "getUserInfo";
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * 上传信息
 * @param {Object} param
 * @param {string} param.platform       - 玩家所在平台
 * @param {string} param.roleId         - 玩家的角色Id
 * @param {string} param.userInfo       - 用户登录信息
 * @param {string} param.configInfo     - 用户配置
 * @param {string} param.subInfo        - 属臣库
 * @param pfnSuccess
 * @param pfnFail
 */
export function zUploadInfo(param, pfnSuccess, pfnFail) {
    param.cmdName = "uploadInfo";
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * 下载信息
 * @param {Object} param
 * @param {string} param.platform       - 玩家所在平台
 * @param {string} param.roleId         - 玩家的角色Id
 * @param {boolean} param.configInfo     - 用户配置
 * @param {boolean} param.subInfo        - 属臣库
 * @param pfnSuccess
 * @param pfnFail
 */
export function zDownloadInfo(param, pfnSuccess, pfnFail) {
    param.cmdName = "downloadInfo";
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * 下载用户信息
 * @param {Object} param
 * @param {string} param.platform       - 玩家所在平台
 * @param {string} param.roleId         - 玩家的角色Id
 */
export async function zDownloadUserInfo(param) {
    param.cmdName = "downloadUserInfo";
    return new Promise((ok, err) => zRequest(param, res => ok(res), errMsg => err(errMsg)));
}

/**
 * @typedef {Object} UseSnRet
 * @property {string} VipTime - Vip到期时间
 */

/**
 * 获取用户信息
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId - 玩家的角色Id
 * @param {string} param.sn - 注册码
 * @param {function(UseSnRet)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function useSn(param, pfnSuccess, pfnFail) {
    param.cmdName = "useSn";
    zRequest(param, pfnSuccess, pfnFail);
}


/**
 * 更新爬塔信息
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId - 玩家的角色Id
 * @param {number} param.newCount - 新增的用户最近的爬塔次数
 * @param {function(number)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function updateTowerCount(param, pfnSuccess, pfnFail) {
    param.cmdName = "updateTowerCount";
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * 更新采矿信息
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId - 玩家的角色Id
 * @param {number} param.newCount - 新增的用户最近的采矿次数
 * @param {function(number)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function updateChestCount(param, pfnSuccess, pfnFail) {
    param.cmdName = "updateChestCount";
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * 获取一次性任务
 * @param {{platform:string, roleId: string}} param
 * @return {Promise<{Work:string, ErrMsg:string}>}
 */
export async function getOnceWork(param) {
    param.cmdName = "getOnceWork";
    return new Promise((ok, err) => {
        zRequest(param, msg => ok(msg), e => err(e));
    })
}

/**
 * 获取支付二维码
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {number} param.priceId
 * @param {function({Qr: string, Id: number, ErrMsg: string})} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function payQr(param, pfnSuccess = null, pfnFail = null) {
    param.cmdName = 'payQr';
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * 状态查询
 * @param {Object} param
 * @param {number} param.id
 * @param {function({Finished: boolean, ErrMsg: string})} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function checkQr(param, pfnSuccess = null, pfnFail = null) {
    param.cmdName = 'checkQr';
    zRequest(param, pfnSuccess, pfnFail);
}

/**
 * @typedef {Object} GetTaskRet
 * @property {string} Platform - 用户信息
 * @property {string} RoleId - 用户信息
 * @property {string} UserInfo - 用户信息
 * @property {string} ConfigInfo - 用户配置
 * @property {string} SubInfo - 用户属臣库
 * @property {string} ErrMsg - 错误信息
 */

/**
 * 获取一个需要执行的任务
 * @param {function(GetTaskRet)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function getTask(pfnSuccess, pfnFail) {

    const taskKey = typeof process !== 'undefined' ? process.env.JDXQ_TASK_KEY : '';
    if (!taskKey) {
        pfnFail && pfnFail('未配置 JDXQ_TASK_KEY');
        return;
    }
    tRequest("/getTask", {k: taskKey}, pfnSuccess, pfnFail);
}

/**
 * 上报任务状态
 * @param {Object} param
 * @param {number} param.ok
 * @param {string} param.errMsg
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {string} param.logs
 * @param {function(string)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function taskReport(param, pfnSuccess = null, pfnFail = null) {
    tRequest("/taskReport", param, pfnSuccess, pfnFail);
}

/**
 * 工作开始
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {function(string)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function startWork(param, pfnSuccess = null, pfnFail = null) {
    param.key = genKey(param.platform, param.roleId);
    tRequest("/start", param, pfnSuccess, pfnFail, false);
}

/**
 * 状态查询
 * @param {Object} param
 * @param {string} param.platform
 * @param {string} param.roleId
 * @param {function(Object)} pfnSuccess 执行成功的回调
 * @param {function(string)} pfnFail 执行成功的回调，回调参数为失败原因
 */
export function workState(param, pfnSuccess = null, pfnFail = null) {
    param.key = genKey(param.platform, param.roleId);
    tRequest("/state", param, pfnSuccess, pfnFail, false);
}
