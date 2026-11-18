import {Base} from "./base";
import {randomRangeInt} from "../utils/tool";


export class Trophy extends Base {
    constructor(work) {
        super('赛季杯', work.configInfo, work.getRoleInfo());

        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.start();
    }

    /**
     * 当前这轮任务开始
     */
    workStart() {

        // 执行工作
        this.realWork().catch(e => {
            this.err('出现错误：', e);
            this.workFinished(300);
        });
    }

    async realWork() {

        // 直接领取
        this.info('尝试领取赛季杯每日奖励...');
        const result = await new Promise((ok, err) => this.cmd.do_trophy_match(res => ok(res), () => ok()));
        this.nextDay(randomRangeInt(5, 50));
        this.workFinished();
    }
}
