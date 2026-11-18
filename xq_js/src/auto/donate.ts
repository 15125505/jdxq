// Create by maintainer
// Description: 中军帐功能
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";
import {getTime} from "../utils/tool";

export class Donate extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('军团祈愿', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Donate');
    }

    /**
     * 刚刚配置完成后的消息响应
     */
    onConfigOK() {
        if (this.isWorking) {
            this.startNow();
        } else {
            this.start();
        }
    }

    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        const param = this.work.configInfo.donate as data.DonateParam;
        let nextDelay = -1;

        // 首先查看是否可以进行军团祈愿，如果不可以，直接返回
        await new Promise<any>((ok, err) => this.cmd.do_is_can_enter_donate_card((result: any) => ok(result), () => err('检查是否可以军团祈愿超时')));

        // 然后进入军团祈愿，查看是否可以领取奖励
        const enter = await new Promise<any>((ok, err) => this.cmd.do_enter_donate_hall((result: any) => ok(result), () => err('获取军团祈愿信息超时')));

        // 检查是否可以领取祈愿完成奖励
        console.log('军团祈愿信息：', enter.donateCardInfo.user_wishes.rewardReceiveState, enter.donateCardInfo.user_wishes.rewardCompleteState);
        if (enter.donateCardInfo.user_wishes.rewardReceiveState == 0 && enter.donateCardInfo.user_wishes.rewardCompleteState == 1) {
            await new Promise<any>((ok, err) => this.cmd.do_get_complete_wish_reward((result: any) => ok(result), () => err('领取军团祈愿完成奖励超时')));
            this.info('成功领取军团祈愿全部完成奖励！');
        }

        // 如果可以领取奖励，那么领取奖励
        let rewardWishId = 0, canWish = false;
        let choice = [1, 2, 3, 4];
        enter.donateCardInfo.user_wishes.wishList.forEach((wish: any) => {
            if (!wish.wishId) {
                // 没有奖励碎片，说明这是一个空节点
                console.log('发现空节点，可以进行祈愿');
                canWish = true;
                return;
            }
            choice = choice.filter(v => v != wish.wishId);
            if (wish.isComplete && !wish.isReceive) {
                rewardWishId = wish.wishId;
                nextDelay = 3;
            }
        });
        if (rewardWishId > 0) {
            await new Promise<any>((ok, err) => this.cmd.do_get_wish(rewardWishId, (result: any) => ok(result), () => err('领取军团祈愿奖励超时')));
        }

        // 查看是否可以进行祈愿，如果可以，那么进行祈愿
        const nextTime = enter.donateCardInfo.user_wishes.nextWishTimeStamp - getTime();
        if (canWish) {
            let wishId = param.country;
            if (choice.find(v => v == wishId) == undefined) {
                wishId = choice[0];
            }
            if (nextTime > 0) {
                this.log('下次祈愿时间：', nextTime, '秒后');
                if (nextDelay < 0 || nextDelay > nextTime) {
                    nextDelay = nextTime;
                }
            } else {
                await new Promise<any>((ok, err) => this.cmd.do_add_shard_wish(wishId, (result: any) => ok(result), () => err('军团祈愿超时')));
                this.log('成功进行一次军团祈愿！');
                nextDelay = 3;
            }
        }

        // 进入军团祈愿列表，查看是否还有剩余的帮助次数
        const list = await new Promise<any>((ok, err) => this.cmd.do_legion_wish_list((result: any) => ok(result), () => err('获取军团祈愿列表超时')));
        this.log(`当前已经进行了${list.nowDonateTimes.free}次免费助力和${list.nowDonateTimes.notFree}次元宝助力，当前有${list.f_legion_wish.length}个需助力成员`);

        // 进行助力
        const canDonate = list.nowDonateTimes.free < list.allDonateTime.free || list.nowDonateTimes.notFree < Math.min(param.goldDonateTimes, list.allDonateTime.notFree);
        if (canDonate && list.f_legion_wish.length > 0) {
            const target = list.f_legion_wish[0];
            await new Promise<any>((ok, err) => this.cmd.do_help_donate_card(target.wishId, target.userId,  (result: any) => ok(result), () => err('军团祈愿助力超时')));
            this.log('成功助力军团成员：', target.userName);
            nextDelay = 3;
        }

        // 如果没有下次执行时间，那么设置为1800秒
        if (nextDelay < 0 || nextDelay > 1800) {
            nextDelay = 1800;
        }
        this.nextDelay(nextDelay);
    }

}
