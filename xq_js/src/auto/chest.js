/**
 * 自动采矿模块
 */
import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Chest extends Base {

    /**
     * 构造函数
     * @param {WorkEx} work
     */
    constructor(work) {

        super('矿产领取', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.start();
    }

    /**
     * 当前这轮任务开始
     */
    workStart() {

        // 采矿相关参数
        let param = {};

        // 获取小镇，获取需要采矿的内容
        new Promise((ok, err) => {
            this.findFirstChest(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            this.openChest(ok, err, param);
        })).then(()=>{
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(300);
        });
    }

    /**
     * 找到家中最早需要摘取的矿
     */
    findFirstChest(ok, err, param) {
        this.cmd.getTownInfo(this.user.getRoleId(), (result) => {
            let myChest = result.town.myChest;
            for (let i = 0; i < myChest.length; i++) {
                let node = myChest[i];
                if (!param.chest || node.timestamp < param.chest.timestamp) {
                    param.chest = node;
                }
            }
            ok();
        }, () => err('查看自家小镇超时'));
    }

    /**
     * 领取占矿奖励
     */
    openChest(ok, err, param) {

        // 如果没有可以领取的矿，说明家中没有矿，那么过会再来检查（其实这个不需要，因为如果占矿成功会触发立即检查）
        if (!param.chest) {
            this.work.hChest1.onConfigOK();
            this.nextDelay(600);
            ok();
            return;
        }

        // 如果当前已经可以领取，那么执行领取操作，1秒钟后继续检查
        let nowTime = getTime();
        let chest = param.chest;
        if (chest.timestamp + 2 < nowTime) {
            this.info('有一个', this.getChestName(chest.chestTypeId), '可以领取了');
            this.cmd.openChest(chest.chestId, chest.chestTypeId, chest.townId, chest.timestamp, (result) => {
                this.warn('领取', this.getChestName(chest.chestTypeId), '奖励成功' );
                this.work.hChest1.onConfigOK();
                this.nextDelay(1);
                ok();
            }, () => err('领取采矿奖励失败：如果确实有矿没领取，过会儿会自动重试领取，无需担心。'));
            return;
        }

        // 如果当前还不能领取，那么计算领取时间
        this.nextDelay(chest.timestamp - nowTime + 2);
        ok();
    }

    // 根据矿等级获取矿名称
    getChestName(chestTypeId) {
        switch (chestTypeId) {
            case 0:
                return '大矿';
            case 1:
                return '中矿';
            case 2:
                return '小矿';
            default:
                return '神秘矿' + chestTypeId;
        }
    }

}
