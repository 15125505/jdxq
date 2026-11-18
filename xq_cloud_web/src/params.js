import {getDonateParam} from "./paramEx";
import {getEnlistParam} from "./ui/enlistCfg";
import {UiShopEx} from "./ui/uiShopEx";
import {UiAdventure} from "./ui/uiAdventure";
import {UiMelee} from "./ui/uiMelee";
import {UiSlg} from "./ui/uiSlg";

/**
 * 获取本地缓存中的用户配置信息
 * @param platform
 * @param roleId
 */
export function getConfigInfo(platform, roleId) {
    return {
        vecEnable: getStartParam(platform, roleId),
        chest: getChestParam(platform, roleId),
        jiaofei: getJiaofeiParam(platform, roleId),
        shop: getShopParam(platform, roleId),
        sweep: getSweepParam(platform, roleId),
        onSweep: getOnSweepParam(platform, roleId),
        boss: getBossParam(platform, roleId),
        legionBoss: getLegionBossParam(platform, roleId),
        towerReward: getTowerRewardParam(platform, roleId),
        donate: getDonateParam(platform, roleId),
        enlist: getEnlistParam(platform, roleId),
        shopEx: new UiShopEx(platform, roleId).param,
        adventure: new UiAdventure(platform, roleId).param,
        melee: new UiMelee(platform, roleId).param,
        slg: new UiSlg(platform, roleId).param,
    }
}

/**
 * 获取当前的启动配置参数
 * @param platform
 * @param roleId
 * @returns {*}
 */
export function getStartParam(platform, roleId) {
    let paramKey = 'start_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = [];
    }
    return param;
}

/**
 * 设置当前的启动配置参数
 * @param platform
 * @param roleId
 * @param vecFuncName
 */
export function setStartParam(platform, roleId, vecFuncName) {
    let paramKey = 'start_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(vecFuncName);
}


/**
 * 获取采矿配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getChestParam(platform, roleId) {
    let paramKey = 'chest_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            findInFriend: false,
            findInRank: false,
            findInSub: false,
        };
    }
    return param;
}

/**
 * 设置采矿配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 * @returns {*}
 */
export function setChestParam(platform, roleId, param) {
    let paramKey = 'chest_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}


/**
 * 获取剿匪配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getJiaofeiParam(platform, roleId) {
    let paramKey = 'jiaofei_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            fei1: true,
            fei2: true,
            fei3: true,
            feiLevel: 1000,
            friendFeiLevel: 1000,
            maxStrength: 10000,
        };
    }
    return param;
}

/**
 * 设置剿匪配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setJiaofeiParam(platform, roleId, param) {
    let paramKey = 'jiaofei_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 获取Boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getBossParam(platform, roleId) {
    let paramKey = 'boss_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            strength: 100,
        };
    }
    return param;
}

/**
 * 设置Boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setBossParam(platform, roleId, param) {
    let paramKey = 'boss_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}


/**
 * 获取军团boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getLegionBossParam(platform, roleId) {
    let paramKey = 'legionBoss_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            count: 2,
        };
    }
    return param;
}

/**
 * 设置军团Boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setLegionBossParam(platform, roleId, param) {
    let paramKey = 'legionBoss_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}


/**
 * 获取珍宝阁配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getShopParam(platform, roleId) {
    let paramKey = 'shop_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            vec: [],
            freeRefresh: false,
            moneyRefresh: false,
            raffle: false,
        };
    }
    return param;
}

/**
 * 设置珍宝阁配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setShopParam(platform, roleId, param) {
    let paramKey = 'shop_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 获取扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getSweepParam(platform, roleId) {
    let paramKey = 'sweep_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            maxGold: 0,
        };
    }
    return param;
}

/**
 * 设置扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setSweepParam(platform, roleId, param) {
    let paramKey = 'sweep_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}


/**
 * 获取名将扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getOnSweepParam(platform, roleId) {
    let paramKey = 'onSweep_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            maxGold: 0,
        };
    }
    return param;
}

/**
 * 设置名将扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setOnSweepParam(platform, roleId, param) {
    let paramKey = 'onSweep_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 获取试炼奖励参数
 */
export function getTowerRewardParam(platform, roleId) {
    let paramKey = 'towerReward_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            hours: 4,
        };
    }
    return param;
}

/**
 * 设置试炼塔奖励信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setTowerRewardParam(platform, roleId, param) {
    let paramKey = 'towerReward_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}



