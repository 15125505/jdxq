import {Base} from "./base";
import {getTime, randomRangeInt} from "../utils/tool";
import {formatTime} from "../pack";


export class Snake extends Base {
    constructor(work) {
        super('贪吃蛇', work.configInfo, work.getRoleInfo());

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

        // 首先检查贪吃蛇是否已经启动
        const result = await new Promise((ok, err) => this.cmd.do_click_soldier(res => ok(res), () => err('获取贪吃蛇超时')));
        const now = formatTime(getTime() * 1000, "yyyy-MM-dd hh:mm:ss");
        if (!result.isStartActivity || now <= result.startTime || now >= result.endTime) {
            this.warn('贪吃蛇不在启动时间内！')
            this.nextDay(randomRangeInt(5, 50));
            this.workFinished();
            return;
        }

        // 查看贪吃蛇详情
        const result1 = await new Promise((ok, err) => this.cmd.do_snake_info(res => ok(res), () => err('获取贪吃蛇详情超时')));

        // 查看奖励详情
        const result2 = await new Promise((ok, err) => this.cmd.do_get_snake_reward_info(res => ok(res), () => err('获取贪吃蛇奖励信息超时')));
        if (result2.curTotalScore >= 50000 && result2.has_draw_reward_stage.length === 0) {
            this.warn('当前贪吃蛇奖励已经全部领取，今日不再继续！')
            this.nextDay(randomRangeInt(5, 50));
            this.workFinished();
            return;
        }

        // 完成贪吃蛇
        while (1) {
            await this.sleep(randomRangeInt(5, 5));
            const result3 = await new Promise((ok, err) => this.cmd.do_finish_snake(res => ok(res), () => err('完成贪吃蛇游戏超时')));
            this.log('完成贪吃蛇游戏，当前总积分', result3.new_score);
            if (result3.new_score >= 50000) {
                break;
            }
        }

        // 领取奖励
        const result4 = await new Promise((ok, err) => this.cmd.do_get_snake_reward_info(res => ok(res), () => err('获取贪吃蛇奖励信息超时')));
        const vec = Object.keys(result4.stageRewards);
        for (let i = 0; i < vec.length; i++) {
            const key = vec[i];
            if (result4.has_draw_reward_stage.findIndex(v => v.toString() === key) >= 0) {
                continue;
            }
            const result5 = await new Promise((ok, err) => this.cmd.do_receive_snake_reward(parseInt(key), res => ok(res), () => err('领取贪吃蛇奖励超时')));
        }
        this.warn('当前贪吃蛇奖励已经全部领取，今日不再继续！')
        this.nextDay(randomRangeInt(5, 50));
        this.workFinished();
    }


}
