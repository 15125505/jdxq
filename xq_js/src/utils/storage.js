import {Log} from "../log";
import {updateUserInfo} from "./common";

/**
 * 缓存操作模块
 */

const ZUserKey = 'zUsers';       // 存储当前系统中用户的key

/**
 * @typedef {Object} ZUser 系统中存储的用户信息节点
 * @property {string} platform 用户平台
 * @property {number} roleId
 * @property {string} authorCode
 * @property {string} gameId
 * @property {string} clientId
 * @property {string} clientVer
 * @property {string} deviceId
 * @property {string} code
 * @property {string} server 服务器地址
 */


/**
 * 添加一个探测到的新用户。
 * @param {ZUser} user 用户信息
 */
export function addUser(user) {

    // 每次添加新用户之前，首先载入配置中的用户
    loadUser();

    // 找到和这个目前一样的用户
    !user.platform && (user.platform = '');
    let index = window.vecUser.findIndex(u => u.roleId === user.roleId && u.platform === user.platform);
    if (index < 0) {
        window.vecUser.push(user);
        Log.warn("--添加一个新用户", user.roleId);
    } else {
        let found = window.vecUser[index];
        if (found.authorCode === user.authorCode
            // && found.code === user.code
            && found.gameId === user.gameId
            && found.clientId === user.clientId
            && found.clientVer === user.clientVer
            && found.server === user.server
            && found.deviceId === user.deviceId) {
            Log.warn('--该用户早已被探测过且信息无变化...');
        } else {
            found.authorCode = user.authorCode;
            // found.code = user.code;
            found.gameId = user.gameId;
            found.clientId = user.clientId;
            found.clientVer = user.clientVer;
            found.deviceId = user.deviceId;
            found.server = user.server;
            Log.warn('--更新用户', user.roleId, '的登录信息。');
        }
    }
    saveUser();
}

/**
 * 更新用户信息
 * @param platform
 * @param roleId
 * @param serverId
 * @param name
 */
export function updateUser(platform, roleId, serverId, name) {
    let index = window.vecUser.findIndex(u => u.roleId === roleId && u.platform === platform);
    if (index < 0) {
        return;
    }
    window.vecUser[index].serverId = serverId;
    window.vecUser[index].name = name;
    saveUser();
}

/**
 * 从系统中删除一个用户
 * @param {string} platform
 * @param {number} roleId
 */
export function removeUser(platform, roleId) {
    let index = window.vecUser.findIndex(u => u.roleId === roleId && u.platform === platform);
    if (index >= 0) {
        Log.warn('--删除用户:', roleId);
        window.vecUser.splice(index, 1);
        saveUser();
    }
}

/**
 * 从本地缓存中，载入当前已经探测到的用户信息
 * @param {boolean} showLog 是否显示日志
 */
export function loadUser(showLog = false) {
    let paramInfo = localStorage[ZUserKey];
    if (!paramInfo) {
        window.vecUser = [];
        return;
    }
    window.vecUser = JSON.parse(paramInfo);
    vecUser.forEach((u) => {
        !u.platform && (u.platform = '');
        if (!showLog) {
            return;
        }
        let info = u.roleId;
        u.serverId && (info += ` <span class="cr2">${u.platform} ${u.serverId}</span>区 `);
        u.name && (info += `<span class="cr2">${u.name}</span>`);
        Log.info('---当前已探测用户：', info);
    });
}

/**
 *
 */

/**
 * 保存用户信息到缓存
 */
export function saveUser() {
    window.vecUser && (localStorage[ZUserKey] = JSON.stringify(window.vecUser));
    updateUserInfo();
    Log.info('--保存用户信息，当前已经探测到', window.vecUser.length, '个用户。')
}

