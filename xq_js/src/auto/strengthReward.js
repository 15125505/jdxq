/**
 * 体力管理模块
 */
import {Base} from "./base";
import {getTime} from "../utils/tool";

export class StrengthReward extends Base {

    constructor(work) {
        super('免费体力', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.start();
    }

    workStart() {
        new Promise((ok, err) => {
            let cur = new Date(getTime() * 1000);
            let now = cur.getHours() * 3600 + cur.getMinutes() * 60 + cur.getSeconds();
            let s1 = 11 * 3600 + 1, s2 = 13 * 3600, s3 = 18 * 3600 + 1, s4 = 20 * 3600;
            if (now < s1) {
                this.nextDelay(s1 - now);
                ok();
            } else if (now < s2) {
                this.nextDelay(s3 - now);
                this.getReward(ok, err);
            } else if (now < s3) {
                this.nextDelay(s3 - now);
                ok();
            } else if (now < s4) {
                this.nextDelay(s1 + 86400 - now);
                this.getReward(ok, err);
            } else {
                this.nextDelay(s1 + 86400 - now);
                ok();
            }
        }).then(() => {
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    /**
     * 领取奖励
     */
    getReward(ok) {
        this.cmd.doStrengthReward((result)=>{
            try {
                this.warn('体力领取成功，当前体力为：', result.datamergeIncr.user.user_strength);
            } catch (e) {
                this.err('领取体力出错：', e);
            }
            ok();
        }, ()=>{
            // this.warn('没有收到体力增加的消息，可能已经领取过了，10分钟之后再看看...');
            // this.nextDelay(10 * 60);
            ok();
        })
    }

}
