import {getUserInfo, updateChestCount, updateTowerCount} from "./utils/http";
import {Log} from "./log";

/**
 * vip管理类
 */
export class Vip {

    /**
     * 初始化
     * @param {Object} param
     * @param {string} param.platform
     * @param {string} param.userId - 玩家的用户Id
     * @param {string} param.roleId - 玩家的角色Id
     * @param {number} param.serverId - 玩家的服务器Id
     * @param {number} param.partitionId - 玩家的大区Id
     * @param {string} param.userName - 玩家名称
     * @param {string} param.nick - 玩家昵称
     * @param {number} param.vipLevel - vip等级
     * @param {number} param.vipExp - vip经验
     * @param {function} pfnOK 初始化成功的回调
     * @param {function} pfnFail 初始化失败的回调
     * @param {function} pfnUpdateStatus 状态更新的回调
     */
    constructor(param, pfnOK, pfnFail, pfnUpdateStatus) {
        this.user = param;
        this.pfnUpdateStatus = pfnUpdateStatus;
        getUserInfo(param, (ret) => {
            // todo: 测试阶段，所有的用户，自动升级vip等级
            this.VipLevel = 2;
            this.TowerCount = ret.TowerCount;
            this.ChestCount = ret.ChestCount;
            this.VipTime = ret.VipTime;
            this.Players = ret.Players;
            this.newTowerCount = 0;         // 当前新增还未上报的爬塔次数
            if (!this.VipLevel) {
                this.userName = '免费用户';
                this.maxTowerCount = 100;
                this.maxChessCount = 12;
            } else {
                this.userName = 'VIP用户';
                this.maxTowerCount = 1000000;
                this.maxChessCount = 1000;
            }
            console.log('尊敬的' + this.userName, "您今天已使用小乔爬塔次数：", ret.TowerCount, "占矿次数：", ret.ChestCount);
            this.updateStatus();

            // 今天结束之后，需要重置当前次数
            this.timerReset = setTimeout(this.resetCount.bind(this), ret.LeftTime * 1000);
            pfnOK();
        }, () => {
            Log.err("前往江东失败！");
            pfnFail();
        });
    }

    updateStatus() {
        this.pfnUpdateStatus && this.pfnUpdateStatus();
    }

    release() {
        clearTimeout(this.timerReset);
    }

    isReady() {
        return this.maxChessCount > 0;
    }

    isVip() {
        return this.VipLevel > 0;
    }

    /**
     * 定时重置挖矿次数
     */
    resetCount() {
        console.log('现在应该是0点，复位各种次数。。。');
        this.TowerCount = 0;
        this.ChestCount = 0;
        this.newTowerCount = 0;
        this.timerReset = setTimeout(this.resetCount.bind(this), 86400 * 1000);
        this.updateStatus();
    }

    /**
     * 添加一次爬塔次数（在爬塔完成之后调用）
     */
    addTowerCount(forceUpdate) {

        // 当前新增次数加1
        this.newTowerCount++;

        // 如果新增次数大于30，那么上报服务器一次
        if (this.newTowerCount >= 30 || forceUpdate) {
            updateTowerCount({
                platform: this.user.platform,
                roleId: this.user.roleId,
                newCount: this.newTowerCount,
            }, (curCount) => {
                this.TowerCount = curCount;
                this.updateStatus();
            }, () => console.error('上报爬塔次数失败'));
            this.newTowerCount = 0;
        }

        this.updateStatus();
    }

    /**
     * 当前是否可以爬塔
     * @returns {boolean}
     */
    canTower() {
        console.log('当前爬塔次数：', this.TowerCount + this.newTowerCount, "尚未上报的次数：", this.newTowerCount);
        return this.TowerCount + this.newTowerCount < this.maxTowerCount;
    }


    /**
     * 添加一次采矿次数
     */
    addChestCount() {
        this.ChestCount++;
        updateChestCount({
            platform: this.user.platform,
            roleId: this.user.roleId,
            newCount: 1,
        }, (curCount) => {
            this.ChestCount = curCount;
            this.updateStatus();
        }, () => console.error('上报挖矿次数失败'));
        this.updateStatus();
    }

    /**
     * 当前是否可以采矿
     * @returns {boolean}
     */
    canChest() {
        if (this.ChestCount >= this.maxChessCount) {
            Log.info("---您今天的占矿次数已经用尽，请明天继续或升级为江东小乔VIP。");
            return false;
        }
        return true;
    }

}
