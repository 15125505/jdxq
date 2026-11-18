// Create by maintainer
// Description: 南征北战
// Date: 2023-08-12 18:02

import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";
import {getTime} from "../utils/tool";

export class Adventure extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('南征北战', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Adventure');
    }

    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        this.info('开始检查南征北战...');

        // 获取用户设置，如果没有设置，自动停止
        const cfg = this.work.configInfo.adventure as data.AdventureParam;

        // 检查当前是否在活动时间内 临时去掉时间检查
        // const mainState = await this.cmd.do_get_travell_list();
        // const now = getTime();
        // const start = mainState.travell_list?.[0].startTime;
        // const end = mainState.travell_list?.[0].endTime;
        // if (now < start || now > end) {
        //     this.warn('当前不在南征北战活动时间内，将停止南征北战。');
        //     return this.nextDay(0);
        // }

        // 获取南征北战信息，如果活动未开启，尝试进行开启
        const info = await this.cmd.do_adventure_info();
        if (info.status == 0) {

            this.info('南征北战未开启，下面将开启...');

            // 获取城门防守阵容
            const allTroop = await new Promise<any>((ok, err) => this.cmd.getAllTroop((res: any) => ok(res), () => err('获取战斗阵容失败')));
            const troops = [allTroop.troop['rob_defense_0'], allTroop.troop['rob_defense_1'], allTroop.troop['rob_defense_2']];
            const tactics = [this.user.uinfo.userTactic['rob_defense_0'], this.user.uinfo.userTactic['rob_defense_1'], this.user.uinfo.userTactic['rob_defense_2']];

            // 获取用户设置的主力阵容位置
            const pos = cfg?.mainTroop ?? 0;
            this.info(`当前设置主力阵容位置：${pos + 1}，城门左侧防守阵容将被放置${pos + 1}号位置`);
            if (pos != 0) {
                [troops[0], troops[pos]] = [troops[pos], troops[0]];
                [tactics[0], tactics[pos]] = [tactics[pos], tactics[0]];
            }

            // 开启南征北战
            await this.cmd.do_start_adventure(troops, tactics);
            this.info('南征北战已成功开启。');
        } else if (info.status == 2 && info.hasReward) {

            // 领取南征北战奖励
            this.info('南征北战已结束，下面将领取奖励...');
            await this.cmd.do_get_adventure_reward();
            this.info('南征北战奖励已领取。');
            this.nextDelay(1);
            return;
        }

        // 获取当前的行军状态，如果有未处理的事件，先处理事件
        const state = await this.cmd.do_get_adventure();

        // 显示当前状态
        this.info(`当前剩余行军次数：${state.exploreCount.current}次，耐力：${state.endurance.current}/${state.endurance.max}，本轮跑马总时间：${(state.adventureTime.max / 3600).toFixed(1)}小时，已经跑了${(state.adventureTime.cur / 3600).toFixed(1)}小时`);
        if (state.exploreCount.recoverTime.length > 0) {
            this.info(`下次行军次数恢复剩余时间：${state.exploreCount.recoverTime[0] - getTime()}秒`);
        }

        // 如果有未处理的事件，先处理事件
        if (state.eventInfo?.event) {
            await this.handleEvent(state.eventInfo.event);
            this.nextDelay(1);
            return;
        }

        // 如果耐力不足，进行恢复
        if (state.endurance.current < state.endurance.max) {
            if (cfg?.resume) {
                this.info('当前耐力不足，将使用元宝恢复耐力...');
                await this.cmd.do_recover_endurance();
                this.info('耐力恢复成功。')
                this.nextDelay(1);
                return;
            } else {
                this.info('当前耐力不足，根据当前设置，将放弃使用元宝恢复耐力。');
            }
        }


        // 检查神秘商店
        if (state.limitShop.product?.length > 0) {
            await this.shop();
        }

        // 如果没有次数了，那么进行等待
        if (state.exploreCount.current == 0) {
            const delay = state.exploreCount.recoverTime[0] - getTime();
            this.info(`当前行军次数已用完，等待${delay}秒之后行军次数恢复...`);
            this.nextDelay(delay);
            return;
        }

        // 如果有神秘商店而且配置为神秘商店时停止行军，并且当前次数没有满，停止行军
        if (state.limitShop.product?.length > 0 && cfg?.stopOnShop && state.exploreCount.current < state.exploreCount.max) {
            this.info('当前遇到神秘商店，并且当前行军次数未满，根据当前设置，将停止行军。');
            const delay = Math.min(state.exploreCount.recoverTime[0], state.limitShop.expireTs) - getTime();
            this.nextDelay(delay);
            return;
        }

        // 进行一次行军
        this.info('开始行军...');
        const res = await this.cmd.do_explore_once();
        await this.handleEvent(res.event);
        this.nextDelay(1);
    }

    /**
     * 进行物品购买
     */
    async shop() {

        // 获取神秘商店的物品
        const res = await this.cmd.do_get_explore_shop();

        // 获取当前用户的配置信息
        const cfg = this.work.configInfo.adventure as data.AdventureParam;
        const vec = [{item: 'item:1002', price: cfg?.shop?.item1 ?? 0, name: '英魂'},
            {item: 'item:1003', price: cfg?.shop?.item2 ?? 0, name: '蓝田玉'},
            {item: 'item:1005', price: cfg?.shop?.item3 ?? 0, name: '高级招募令'},
            {item: 'item:1008', price: cfg?.shop?.item4 ?? 0, name: '灵玉'},
            {item: 'item:1010', price: cfg?.shop?.item5 ?? 0, name: '银色祈愿符'},
            {item: 'item:1011', price: cfg?.shop?.item6 ?? 0, name: '金色祈愿符'},
            {item: 'item:1013', price: cfg?.shop?.item7 ?? 0, name: '名将令'},
            {item: 'item:1021', price: cfg?.shop?.item8 ?? 0, name: '御龙币'},
            {item: 'item:1027', price: cfg?.shop?.item9 ?? 0, name: '祝福宝石'},
            {item: 'item:1037', price: cfg?.shop?.item10 ?? 0, name: '指点迷津'},
            {item: 'item:40008', price: cfg?.shop?.item11 ?? 0, name: '精锐兵符礼包'}];

        // 遍历所有物品
        for (let i = 0; i < res.shopList.length; i++) {
            const item = res.shopList[i];

            // 获取物品信息
            const itemId = Object.keys(item.boxInfo)[0];
            const count = item.boxInfo[itemId];
            const price = item.price;
            const status = item.status;
            const name = this.user.getItemName(itemId);

            // 在配置中查找物品
            const v = vec.find(v => v.item == itemId);
            if (!v) {
                continue;
            }

            const sPrice = price / count;
            this.info(`神秘商店出现配置中的物品：${name} * ${count}，价格：${price}元宝， 单价：${sPrice.toFixed(1)}元宝，状态：${status ? '可购买' : '售罄'}`);

            // 检查物品是否售罄
            if (!status) {
                this.info(`物品${name}已售罄，将放弃购买。`);
                continue;
            }

            // 检查物品价格是否需要购买
            if (sPrice > v.price) {
                this.info(`物品${name}单位价格${sPrice.toFixed(1)}元宝高于配置价格${v.price}元宝，将放弃购买。`);
                continue;
            }

            // 执行购买
            this.warn(`开始购买物品：${name} * ${count}，将花费：${price}元宝……`);
            await this.cmd.do_buy_goods(i);
        }
    }

    /**
     * 处理事件
     */
    async handleEvent(event: { type: string, ID: string, name: string, targetUser?: { name: string } }) {

        this.info(`触发事件：${event.name}`);

        const cfg = this.work.configInfo.adventure;

        // 锦囊妙计 直接获得奖励
        if (event.type == '1') {
            return
        }

        // 一帆风顺
        if (event.type == '2') {
            if (cfg?.event2) {
                this.info('根据当前设置，将使用元宝加速。');
            } else {
                this.info('根据当前设置，将放弃元宝加速。');
            }
            const res = await this.cmd.do_finish_reward_explore(event.type, event.ID, cfg?.event2 ? 1 : 0);
            return
        }

        // 兵荒马乱
        if (event.type == '3') {
            const res = await this.cmd.do_finish_reward_explore(event.type, event.ID, 1);
            res.reward?.forEach(r => Object.keys(r.boxInfo).forEach(v => this.info(`获得宝箱，包含物品${this.user.getItemName(v)} * ${r.boxInfo[v]}`)));
            return
        }

        // 十面埋伏
        if (event.type == '4') {
            const res = await this.cmd.do_finish_fighting_explore(event.type, event.ID, cfg?.event4 ? 1 : 0, cfg?.mainTroop ?? 0, [], '');
            if (cfg?.event4) {
                this.info(`遭遇${event.targetUser?.name ?? '敌人'}的战斗${res.combatResult ? '胜利！！！' : '失败。。。'}`);
            } else {
                this.info('根据当前设置，放弃与玩家战斗。');
            }
            return
        }

        // 神秘商店
        if (event.type == '5') {
            return;
        }

        // 烽火狼烟
        if (event.type == '6') {

            // 获取城门防守左侧阵容
            const allTroop = await new Promise<any>((ok, err) => this.cmd.getAllTroop((res: any) => ok(res), () => err('获取战斗阵容失败')));
            const troop = allTroop.troop['rob_defense_0'];
            const tacticId = this.user.uinfo.userTactic['rob_defense_0'];

            // 进行战斗
            const res = await this.cmd.do_finish_fighting_explore(event.type, event.ID, 1, 0, troop, tacticId);
            this.info(`遭遇${event.targetUser?.name ?? '敌人'}的战斗${res.combatResult ? '胜利！！！' : '失败。。。'}`)
        }
    }

}
