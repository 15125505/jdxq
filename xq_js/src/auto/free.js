import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Free extends Base {

    constructor(work) {
        super('免费资源', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Free');
    }

    workStart() {

        let param = {
            giftEveryDay: false,
            sign: false,
        };

        new Promise((ok, err) => {
            this.info('检查限购礼包...');
            this.cmd.do_get_act_info('xiangou', result => {
                param.giftEveryDay = !result.gift_everyday_info.gift_everyday_has_got;
                ok();
            }, () => err('查看限购礼包超时'));
        }).then(() => this.everyDayBuy()).then(() => new Promise((ok, err) => {
            this.info('尝试领取尊享卡礼包...');
            this.cmd.do_get_common_rewards('reward.id.zxk');
            ok();
        })).then(() => new Promise((ok, err) => {
            this.info('检查签到状态...');
            this.cmd.do_sign_info(result => {
                param.sign = result.todaySignStatus === 0;
                param.signDays = result.signDays;
                ok();
            }, () => err('查看签到状态超时'));
        })).then(() => new Promise((ok, err) => {
            if (!param.giftEveryDay) {
                ok();
                return;
            }
            this.log('领取每日限购福利...');
            this.cmd.do_take_gift_everyday(() => ok(), () => err("领取每日限购福利超时"));
        })).then(() => new Promise((ok, err) => {
            if (!param.sign) {
                ok();
                return;
            }
            this.log('完成第', param.signDays + 1, '次签到');
            this.cmd.do_sign(param.signDays, () => ok(), () => err('签到超时'));
        })).then(() => new Promise((ok, err) => {
            this.dbfWorship(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.storyWorship(ok, err, param);
        })).then(() => {
            let tmNow = new Date(getTime() * 1000);
            let nextDelay = 86400 - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds();
            this.nextDelay(nextDelay);
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    // 检查每日商店
    async everyDayBuy() {

        this.log('检查每日商店...');

        // 获取每日商店信息
        const storeInfo = await new Promise((ok, err) => this.cmd.do_act_everyday_store(result => ok(result), () => ok()));
        if (!storeInfo) {
            this.info('查看每日商店超时...')
            return;
        }
        console.log('每日商店信息：', storeInfo);

        // 遍历每日商店的所有物品
        for (let v of storeInfo?.giftInfos ?? []) {
            // 进行购买
            console.log('物品...', v);
            if (v.curBuyCount >= v.limitBuyCount) {
                console.log('物品', v.name, '已经卖光...');
                continue;
            }
            if (v.price !== '0' || v.price_diamond !== '0') {
                console.log('物品', v.name, '不能免费领取。。。');
                continue;
            }
            this.info('正在领取每日商店中的：', v.name);
            await new Promise((ok, err) => this.cmd.do_act_everyday_store_buy_product(v.id, () => ok(), () => {
                this.warn('领取', v.name, '失败');
                ok();
            }));
            this.info('领取：', v.name, '成功！');
        }

        this.log('每日商店检查完毕。');
    }

    // 完成逐鹿朝拜
    dbfWorship(ok, err, param) {

        // 如果同服朝拜列表没有初始化，首先初始化同服朝拜列表
        if (!param.vecSS) {
            param.vecSS = [];
            this.info('检查逐鹿同服榜单...');
            this.cmd.do_dbf_match_enter(this.user.uinfo.serverId, "SS", (result) => {
                result.worshipPeople.forEach(v => !v.isWorship && v.userId && param.vecSS.push({
                    userId: v.userId,
                    name: v.name
                }));
                setTimeout(() => this.dbfWorship(ok, err, param), 1000);
            }, () => err('获取逐鹿同服状态超时'));
            return;
        }

        // 如果混服朝拜列表没有初始化，首先初始化同服朝拜列表
        if (!param.vecMS) {
            param.vecMS = [];
            this.info('检查逐鹿混服榜单...');
            this.cmd.do_dbf_match_enter(this.user.uinfo.serverId, "MS", (result) => {
                result.worshipPeople.forEach(v => !v.isWorship && v.userId && param.vecMS.push({
                    userId: v.userId,
                    name: v.name
                }));
                setTimeout(() => this.dbfWorship(ok, err, param), 1000);
            }, () => err('获取逐鹿混服状态超时'));
            return;
        }

        // 如果有需要朝拜的同服，那么进行同服朝拜
        if (param.vecSS.length > 0) {
            let user = param.vecSS.shift();
            this.info(`完成对(${user.name})的逐鹿同服朝拜...`);
            this.cmd.do_dbf_match_worship(this.user.uinfo.serverId, 'SS', user.userId, (result) => {
                setTimeout(() => this.dbfWorship(ok, err, param), 1000);
            }, () => err('逐鹿同服朝拜超时'));
            return;
        }

        // 如果有需要朝拜的同服，那么进行混服朝拜
        if (param.vecMS.length > 0) {
            let user = param.vecMS.shift();
            this.info(`完成对(${user.name})的逐鹿混服朝拜...`);
            this.cmd.do_dbf_match_worship(this.user.uinfo.serverId, 'MS', user.userId, (result) => {
                setTimeout(() => this.dbfWorship(ok, err, param), 1000);
            }, () => err('逐鹿混服朝拜超时'));
            return;
        }

        ok();
    }

    // 完成主线膜拜
    storyWorship(ok, err, param) {

        // 如果同服朝拜列表没有初始化，首先初始化同服朝拜列表
        if (!param.vecStory) {
            param.vecStory = [];
            this.info('检查主线通关排行榜...');
            this.cmd.do_story_rank((result) => {
                let count = result.worship.totalCount - result.worship.count;
                for (let i = 0; i < result.ranks.length && count > 0; i++) {
                    let user = result.ranks[i];
                    if (user.oneCount !== 0) {
                        continue;
                    }
                    param.vecStory.push({uid: user.uid, name: user.name});
                    count--;
                }
                setTimeout(() => this.storyWorship(ok, err, param), 1000);
            }, () => err('获取主线排行榜超时'));
            return;
        }

        // 如果有需要朝拜的用户，那么进行朝拜
        if (param.vecStory.length > 0) {
            let user = param.vecStory.shift();
            this.info(`完成对主线排行榜大神(${user.name})的膜拜...`);
            this.cmd.do_story_worship(user.uid, (result) => {
                setTimeout(() => this.storyWorship(ok, err, param), 1000);
            }, () => err('主线排行榜膜拜超时'));
            return;
        }

        ok();
    }


}
