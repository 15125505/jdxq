// Create by maintainer
// Description: 古籍阁功能
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";
import {getTime} from "../utils/tool";

export class BooksDraw extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('古籍阁', work.configInfo, work.getRoleInfo());
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

        // 进入古籍阁
        this.info('开始查看古籍阁...');
        const info = await new Promise<any>((ok, err) => this.cmd.do_ancient_books_draw_info((result: any) => ok(result), () => err('获取古籍阁信息超时')));
        if (info.draw_data.common.data.freeRemain == 0) {
            this.info('当前古籍阁免费次数已用完，今日不再进行抽取！');
            this.nextDay(10);
            return;
        }
        const now = getTime();
        if (now < info.draw_data.common.data.freeTimestamp) {
            const waitTime = info.draw_data.common.data.freeTimestamp - now;
            this.info('免费领取还需要等待', waitTime, '秒');
            this.nextDelay(waitTime);
            return;
        }

        // 开始抽取
        this.info('开始领取免费古籍阁福利...');
        const result = await new Promise<any>((ok, err) => this.cmd.do_ancient_books_draw((result: any) => ok(result), () => err('古籍阁抽取超时')));
        if (result.data.freeRemain == 0) {
            this.info('当前古籍阁免费次数已用完，今日不再进行抽取！');
            this.nextDay(10);
            return;
        }
        this.nextDelay(result.data.freeTimestamp - getTime());
    }

}
