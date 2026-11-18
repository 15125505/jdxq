// Create by maintainer
// Description: 军团红包功能
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";

export class Qindian extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('庆典奖励', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.start();
    }


    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 获取庆典奖励
        const result = await this.cmd.do_qingdian_memory_reward();
        console.log('庆典奖励:', result);
        this.nextDay(0);
    }

}
