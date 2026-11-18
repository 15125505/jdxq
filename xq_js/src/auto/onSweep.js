import {Base} from "./base";

export class OnSweep extends Base {


    constructor(work) {
        super('名将扫荡', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('OnSweep');
    }

    workStart() {

        // 相关参数
        let param = this.config.onSweep;
        if (!param) {
            param = {
                maxGold: 0
            };
        }
        param.canWork = false;
        param.canBuy = false;

        new Promise((ok, err) => {
            // 检查是否需要元宝增加次数
            if (!param.maxGold) {
                ok();
                return;
            }

            // 根据当前价格，确定当前是否需要购买
            this.cmd.do_preBuySweep(result => {
                if (result.buyFee.count <= param.maxGold) {
                    param.canBuy = true;
                }
                ok();
            }, () => {
                // err("获取名将之路次数购买的价格超时");
                param.canBuy = false;
                ok();
            });
        }).then(() => new Promise((ok, err) => {
            // 无需购买直接返回
            if (!param.canBuy) {
                ok();
                return;
            }

            // 购买名将之路次数
            this.cmd.do_buySweep(result => {
                this.info('元宝购买扫荡次数成功。');
                ok();
            }, () => err("购买名将之路次数超时"));
        })).then(() => new Promise((ok, err) => {
            // 查看扫荡面板
            this.cmd.do_onCamp(result => {
                param.canWork = result.lsCount > 0;
                let maxLevel = 0;
                Object.keys(result.camps).forEach(key => {
                    let node = result.camps[key];
                    if (node.curLevel > maxLevel) {
                        param.camp = key;
                        param.level = node.curLevel;
                        maxLevel = node.curLevel;
                    }
                });
                ok();
            }, () => err("获取名将之路信息超时"));
        })).then(() => new Promise((ok, err) => {
            if (!param.canWork) {
                ok();
                return;
            }
            this.info('开始扫荡', param.camp, '的第', param.level, '层');
            this.cmd.do_onSweep(param.level, param.camp, result => {
                result.datamergeIncr && this.info('扫荡成功！');
                ok();
            }, () => err('扫荡超时'));
        })).then(() => {
            if (param.canWork) {
                this.nextDelay(1);
            } else {
                this.nextDay(Math.floor(Math.random() * 1000));
                this.warn('今日已经完成，明天继续。')
            }
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

}
