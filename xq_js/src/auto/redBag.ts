// Create by maintainer
// Description: 军团红包功能
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";

export class RedBag extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('军团红包', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('RedBag');
    }


    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 获取军团红包列表
        const redBagList = await new Promise<any>((ok, err) => this.cmd.do_get_legion_red_bag_info((result: any) => ok(result), () => err('获取军团红包列表失败')));

        if (!redBagList.redBagInfos.length) {
            this.info('当前军团没有红包！');
        }

        // 找出所有还没有领取的红包，进行领取
        for (let i = 0; i < redBagList.redBagInfos.length; i++) {
            const redBag = redBagList.redBagInfos[i];
            if (redBag.isOpen) {
                continue;
            }
            this.info('开始领取', redBag.userName, '的红包');
            await new Promise<any>((ok, err) => this.cmd.do_get_legion_red_bag_reward(redBag.id, (result: any) => ok(result), () => err('领取红包失败')));
            this.info('领取红包成功！');
        }

        this.nextDelay(300);
    }

}
