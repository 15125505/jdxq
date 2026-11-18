import {Base} from "./base";
import {getTime} from "../utils/tool";

export class ReceiveStrength extends Base {


    constructor(work) {
        super('赠送体力', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('ReceiveStrength');
    }

    workStart() {
        this.realWork().catch(e => {
            this.err(`出现错误：`, e);
            this.workFinished(300);
        })
    }

    async realWork() {
        const cur = new Date(getTime() * 1000);
        if (cur.getHours() < 9) {
            this.info('为了保证通关文书的每日任务，一键送体力在9点之前不自动执行。');
            const now = cur.getHours() * 3600 + cur.getMinutes() * 60 + cur.getSeconds();
            this.workFinished(9 * 3600 - now);
            return;
        }
        const result = await new Promise((ok, err) => this.cmd.do_one_click_send_recv_strength(res => ok(res), () => err('一键赠送体力失败')));
        this.info('一件赠送体力完成，当前体力：', result.datamergeIncr.user.user_strength);
        this.nextDay(9 * 3600);
        this.workFinished();
    }
}
