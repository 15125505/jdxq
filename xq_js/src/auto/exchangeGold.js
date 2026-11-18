import {Base} from "./base";

export class ExchangeGold extends Base {


    constructor(work) {
        super('免费点金', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('ExchangeGold');
    }

    workStart() {

        let param = {
            canExchange: false, // 是否可以点金
            canChest: false,    // 是否可以领取15次点金奖励
        };
        new Promise((ok, err) => {
            // 查看点金面板
            this.cmd.do_get_exchange_gold_data(result => {
                param.canExchange = result.price === 0 && result.count > 0;
                param.canChest = result.chestPointMax <= result.chestPoint;
                this.info('当前点金价格：', result.price, '当前累积点金次数：', result.chestPoint, '上限次数：', result.chestPointMax);
                ok();
            }, () => err("查看点金面板超时"));
        }).then(() => new Promise((ok, err) => {
            if (!param.canExchange) {
                ok();
                return;
            }
            this.info('开始一次免费点金...');
            this.cmd.do_exchange_gold(result => {
                result.datamergeIncr && this.info('免费点金成功！');
                ok();
            }, () => err('免费点金超时'))
        })).then(() => new Promise((ok, err) => {
            if (!param.canChest) {
                ok();
                return;
            }
            this.info('开始领取15次点金累计奖励...');
            this.cmd.do_exchange_chest(result => {
                result.datamergeIncr && this.info('领取15次点金累计奖励成功！');
                ok();
            }, () => err('领取15次点金累计奖励超时'))
        })).then(() => {
            if (param.canExchange) {
                this.nextDelay(1);
            } else {
                this.nextDay(Math.floor(Math.random() * 1000));
                this.warn('今日点金已经完成，明天继续。')
            }
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

}
