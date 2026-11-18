/**
 * 珍宝阁模块
 */
import {Base} from "./base";
import {randomRangeInt} from "../utils/tool";

export class Shop extends Base {

    /**
     * 构造函数
     */
    constructor(work) {
        super('珍宝阁', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('Shop');
    }


    workStart() {

        // 相关参数
        let param = this.config.shop;
        if (!param) {
            this.err('尚未进行珍宝阁相关配置！');
            return;
        }
        param.toBuy = [];
        this.realWork(param).catch(e => {
            this.err('执行出错：', e);
            this.workFinished(600);
        });
    }

    async realWork(param) {

        // 首先检查是否可以设置了福星阁
        let nextDelay = await this.checkRaffle(param);

        // 获取当前身上的武将结晶数量
        const coinCount = this.cmd.gameUser['item:1006'] ?? 0;

        // 查看珍宝阁
        const result = await new Promise((ok, err) => this.cmd.do_get_assign_store('black_market', res => ok(res), () => err('查看珍宝阁超时')));

        // 找出需要购买的物品
        result.productList.forEach(v => {
            if (!v.canBuy) {
                return;
            }

            // 检查当前是否可以购买武将结晶 {"productId":"GaoJiSuiPian","item":{"count":50,"item":"shard_wei_CaoZhinew_5"},"price":{"count":5000,"item":"item:1006","off":1},"canBuy":1}
            if (v.productId === 'GaoJiSuiPian') {

                // 检查武将结晶数量
                if (coinCount < v.price.count) {
                    this.warn('当前武将结晶不够，跳过武将结晶兑换！');
                    return;
                }

                // 提取当前武将的ID
                let match = v.item.item.match(/shard_.*_(.*?)_/)?.[1];
                if (!match) {
                    return;
                }
                const heroId = 'Hero_' + match;
                if (this.config.shopEx?.heroIds?.includes(heroId)) {
                    const node = {
                        id: v.productId,
                        name: this.user.getHeroName(heroId) + '碎片',
                    };
                    param.toBuy.push(node);
                    this.info(node.name, '根据当前设置需要进行兑换！')
                }
                return;
            }

            let configItem = param.vec.find(vv => vv.money === v.price.item && vv.item === v.item.item);
            if (!configItem) {
                return;
            }
            if (configItem.checked && v.price.off <= configItem.off / 10) {
                let node = {
                    id: v.productId,
                    name: `${v.item.count}个${this.user.getItemName(v.item.item)} (${this.user.getItemName(v.price.item)}购买)`
                };
                this.info(`[${v.price.off * 10}折]物品：[${node.name}]，在预设的[${configItem.off}折]以内！`);
                param.toBuy.push(node);
            }
        });

        // 执行购买
        await this.buy(param);

        // 检查买完之后是否需要刷新
        param.canRefresh = (param.freeRefresh || param.moneyRefresh) && result.remainRefreshCount > 0 && !result.refreshCost;
        if (param.moneyRefresh && result.remainRefreshCount > 0) {
            param.canRefresh = true;
        }
        this.nextDelay(Math.floor(Math.min(nextDelay, result.remainResetTime + randomRangeInt(0, 200))));

        // 执行刷新
        if (!param.canRefresh) {
            this.info('珍宝阁不再刷新，明天继续（为避免所有人同时购买，将在明天0点后随机延时一定时间）...');
            this.workFinished();
            return;
        }
        this.info('开始刷新珍宝阁...');
        await new Promise((ok, err) => this.cmd.do_refresh_assign_store('black_market', () => ok(), () => err('刷新珍宝阁超时')));
        this.workFinished(1);
    }

    /**
     * 珍宝阁购买物品
     * @param param
     */
    async buy(param) {
        if (!param.toBuy.length) {
            this.warn('当前所有需要购买的物品已经购买完成！');
            return;
        }
        let node = param.toBuy.shift();
        this.log('开始购买：', node.name);
        await new Promise((ok, err) => this.cmd.do_assign_store_buy_product('black_market', node.id, res => ok(res), () => err('购买超时')));
        await this.buy(param);
    }

    /**
     * 检查福星阁
     * @return {Promise<number>} 返回下次检查的时间
     */
    async checkRaffle(param) {

        if (!param.raffle) {
            return 86400;
        }

        // 如果当前福星数量不够800直接返回
        const curCount = this.cmd.gameUser?.['item:1012'] ?? 0;
        if (curCount < 800) {
            this.log('当前身上福星只有', curCount, '个，今天不再检查福星阁！');
            return 86400;
        }

        // 首先，查看是否可以购买高抽
        const result = await new Promise((ok, err) => this.cmd.do_get_assign_store('raffle', res => ok(res), () => err('查看福星阁超时')));
        const item = result.productList.find(v => v.productId === 'wish_GaoChou');
        if (!item) {
            this.err('福星阁没有找到高抽，今日不再检查福星阁！');
            return 86400;
        }

        // 如果当前购买数量为0，而且当前不可以刷新，那么返回
        if (item.remainBuyCount === 0 && result.remainResetTime !== 0) {
            return result.remainResetTime;
        }

        // 如果当前可以购买，那么购买
        if (item.remainBuyCount > 0) {
            await new Promise((ok, err) => this.cmd.do_assign_store_buy_product('raffle', 'wish_GaoChou', res => ok(res), () => err('购买福星阁高抽超时')));
            this.info('购买福星阁高抽成功...');
        } else {
            await new Promise((ok, err) => this.cmd.do_refresh_assign_store('raffle', res => ok(res), () => err('刷新福星阁高抽超时')));
            this.info('免费刷新福星阁成功...');
        }
        return await this.checkRaffle(param);
    }

}
