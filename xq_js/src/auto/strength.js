/**
 * 体力管理模块
 */
import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Strength extends Base {

    constructor(work) {
        super('体力', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        // this.start();
    }

    workStart() {

        // 相关参数
        let param = {
            remainTimes: 0,
        };

        new Promise((ok, err) => {

            // 获取当前体力上限的增加情况
            this.cmd.doStrengthAdInfo(result => {

                // 获取当前可以看广告的次数
                param.remainTimes = result.watchAds?.remainTimes ?? 0;
                let delay = result.watchAds.watchAdLimitTimeoutAt + 10 - getTime();

                // 如果还没到时间，那么等到指定时间再重新检查
                if (delay > 0) {
                    param.remainTimes = 0;
                    this.nextDelay(delay + Math.floor(60 * Math.random()));
                } else {
                    this.nextDelay(600);
                }
                ok();
            }, () => err('获取体力详情超时'));

        }).then(() => new Promise((ok, err) => {

            // 如果不需要增加体力，直接进入下一步
            if (param.remainTimes === 0) {
                ok();
                return;
            }

            // 执行体力上限增加操作
            this.cmd.doStrengthAd(result => {
                this.nextDelay(86410);
                ok();
            }, () => err('增加体力上限超时'))
        })).then(() => {
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {
        // 相关参数
        let param = {
            remainTimes: 0,
        };

    }

}
