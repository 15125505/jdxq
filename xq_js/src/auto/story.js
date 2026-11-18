import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Story extends Base {


    constructor(work) {
        super('主线征收', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Story');
    }

    workStart() {

        let param = {
            needReap : false,
        };
        new Promise((ok, err) => {
            this.cmd.doStoryReapInfo((result)=>{
                let nowTime = getTime();
                if (nowTime > result.nextReapTime + 3) {
                    param.needReap = true;
                    this.info('当前已经可以征收了');
                } else {
                    this.nextDelay(result.nextReapTime + 3 - nowTime);
                    this.info('当前还不可以征收，剩余时间：', result.nextReapTime + 3 - nowTime, "秒")
                }
                if (result.passLevelCount < 10) {
                    param.needReap = false;
                    this.nextDelay(3600);
                    this.info('考虑到当前主线通关层数还不到10层，暂不进行主线征收...');
                }
                ok();
            }, ()=>err("获取主线征收状态超时"));
        }).then(() => new Promise((ok, err) => {
            if (!param.needReap) {
                ok();
                return;
            }
            this.cmd.doStoryReap(result=>{
                if (!result.datamergeIncr || !result.datamergeIncr.user) {
                    err('获取征收结果失败');
                    return;
                }
                let m = result.datamergeIncr.user;
                let info = '';
                Object.getOwnPropertyNames(m).forEach(v => {
                    info += "\n    " + this.user.getItemName(v) + ": " + m[v];
                });
                this.info("收获奖励若干，当前状态变更为：", info);
                this.nextDelay(86400);
                ok();
            }, ()=>err('获取征收奖励结果失败'))
        })).then(() => {
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

}
