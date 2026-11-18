import {Base} from "./base";
import {getTime} from "../utils/tool";

export class TowerReward extends Base {

    constructor(work) {
        super('试炼塔奖励', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('TowerReward');
    }

    /**
     * 当前这轮任务开始
     */
    workStart() {
        this.realWork(this.work.configInfo?.towerReward?.hours??100).catch(e => {
            this.err('出现错误：', e);
            this.workFinished(300);
        });
    }

    async realWork(hours) {

        console.log('当前设置的领取间隔时间：', hours);

        // 检查试炼塔状态
        const result = await new Promise((ok, err) => this.cmd.do_get_tower_data(res => ok(res), () => err('获取试炼塔奖励超时')));

        // 如果当前没满，检查已经过去多久
        if (getTime() < result.towerData.maxTimestamp) {
            let passedTime = getTime() - result.towerData.timestamp;
            if (passedTime < hours * 3600) {
                this.workFinished(hours * 3600 - passedTime);
                return;
            }
        }

        // 已经过去的时间
        await new Promise((ok, err) => this.cmd.getTowerRewards(res => ok(res), () => err('获取试炼塔奖励超时')));
        this.info("获取试炼塔奖励成功！");
        this.workFinished(1);
    }
}
