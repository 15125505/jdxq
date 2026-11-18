/**
 * 用于存储时间信息的节点
 */
let timeInfo = {
    lastTime: 0,
    lastUpdateTime: new Date().getTime(),
};

/**
 * 获取当前系统时间戳，单位和服务器时间戳一致，都是秒
 * @returns {number}
 */
export function getTime() {
    if (!timeInfo.lastTime) {
        return Math.floor(new Date().getTime() / 1000);
    }
    let delta = new Date().getTime() - timeInfo.lastUpdateTime;
    return timeInfo.lastTime + Math.floor(delta / 1000);
}

/**
 * 根据服务器时间更新当前时间
 * @param serverTime
 */
export function setTime(serverTime) {
    timeInfo.lastTime = serverTime;
    timeInfo.lastUpdateTime = new Date().getTime();
}

/**
 * 获取当前时间是否已经就绪
 * @return {boolean}
 */
export function isTimeReady() {
    return !!timeInfo.lastTime;
}


/**
 返回一个在[min, max)范围之内的随机整数
 */
export function randomRangeInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
