import {Base} from "./base";
import {getTime, randomRangeInt} from "../utils/tool";


export class ShareTreasure extends Base {
    constructor(work) {
        super('分享宝箱', work.configInfo, work.getRoleInfo());

        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('ShareTreasure');
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

        // 首先获取领奖界面详情
        const result = await new Promise((ok, err) => this.cmd.do_share_treasure_info(res => ok(res), () => err('查看宝箱分享状态超时')));
        if (!result.treasureDisplay) {
            this.nextDay(0);
            this.workFinished();
            return;
        }
        const names = ['普通', '高级', '至尊'];
        const now = getTime();
        this.log('当前左侧宝箱品质', names[result.treasureDisplay[0].treasureLevel], '剩余时间：', result.treasureDisplay[0].timestamp - now < 0 ? 0 : result.treasureDisplay[0].timestamp - now, '秒');
        this.log('当前右侧宝箱品质', names[result.treasureDisplay[1].treasureLevel], '剩余时间：', result.treasureDisplay[1].timestamp - now < 0 ? 0 : result.treasureDisplay[1].timestamp - now, '秒');
        this.log('今日已经完成', result.alreadyPick, '次分享，累计完成', result.specialReward.currentIndex, '次分享');

        // 检查是否可以领取最终奖励，如果可以，领取最终奖励
        const reward = result.specialReward;
        for (let i = 0; i < 8; i++) {
            if (reward.boxStage[i]?.stage !== 1) {
                continue;
            }
            if (reward.currentIndex >= reward.stagePoint[i]) {
                this.log('领取成功分享', reward.stagePoint[i], '次宝箱的奖励...');
                await new Promise((ok, err) => this.cmd.do_get_share_treasure_final(i, res => ok(res), () => err('领取宝箱分享阶段奖励超时')));
            }
        }

        // 如果当前已经达到最大领奖次数，那么明天再来
        if (result.maxPickLimit === result.alreadyPick) {
            this.log('今日宝箱分享任务已经完成！');
            this.nextDay(randomRangeInt(0, 10));
            this.workFinished();
            return;
        }

        // 等待宝箱都就绪后再来检查
        const maxTime = Math.min(result.treasureDisplay[0].timestamp, result.treasureDisplay[1].timestamp);
        if (now <= maxTime) {
            this.log('当前宝箱就绪还需要', maxTime - now + 1, '秒...');
            this.workFinished(maxTime - now + 1);
            return;
        }

        // 找到一个符合当前要求的宝箱，如果找不到，就将当前已经就绪的宝箱放弃
        // 如果当前可以领奖，检查宝箱类型，如果是今日第一次领取，那么必须为至尊宝箱才领取，如果为第2、3、4次，必须为高级或以上才领取，如果为5和6次，随意领取
        let pos = result.treasureDisplay.findIndex(v => {
            if (v.timestamp >= now) {
                return false;
            }
            if (result.alreadyPick === 0) {
                return v.treasureLevel >= 2;
            } else if (result.alreadyPick <= 3) {
                return v.treasureLevel >= 1;
            } else {
                return true;
            }
        });
        if (pos === -1) {
            for (let i = 0; i < 2; i++) {
                if (result.treasureDisplay[i].timestamp >= now) {
                    continue;
                }
                this.log('由于没有找到符合品质的宝箱，暂时放弃宝箱', i + 1);
                await new Promise((ok, err) => this.cmd.do_quit_share_treasure(i, res => ok(res), () => err('领取宝箱分享阶段奖励超时')));
            }
            this.workFinished(1);
            return;
        }

        // 领取一个宝箱
        const level = result.treasureDisplay[pos].treasureLevel;
        this.log('开始领取一个', names[level] ?? '未知', '宝箱...');
        await new Promise((ok, err) => this.cmd.do_get_share_treasure(pos, res => ok(res), () => err('领取宝箱分享阶段奖励超时')));
        this.workFinished(1);
    }
}
