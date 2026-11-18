/**
 * 试炼扫荡模块
 */
import {Base} from "./base";

export class Sweep extends Base {

    /**
     * 构造函数
     */
    constructor(work) {
        super('试炼扫荡', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('Sweep');
    }

    workStart() {

        // 相关参数
        let param = this.config.sweep;
        if (!param) {
            this.err('尚未进行试炼扫荡相关配置！');
            return;
        }
        param.canSweep = false;

        // 查看试炼塔状态
        new Promise((ok, err) => {
            this.cmd.do_get_tower_data(result => {
                if (result.towerData.sweepCount <= 0) {
                    this.info('今日扫荡次数已经用尽！');
                    ok();
                    return;
                }
                if ((result?.towerData?.sweepCost?.count??123) === 123) {
                    this.info('未能获取扫荡开销');
                    ok();
                    return;
                }
                if (result.towerData.sweepCost.count > param.maxGold) {
                    this.info('本次扫荡需要', result.towerData.sweepCost.count, '元宝，超出了预设的', param.maxGold, '元宝');
                    ok();
                    return;
                }
                param.canSweep = true;
                ok();
            }, () => err('查看试炼塔超时'));
        }).then(() => new Promise((ok, err) => {
            // 执行扫荡
            if (!param.canSweep) {
                this.info('今日不再扫荡，明天继续（为避免所有人同时进行，将在明天0点后随机延时一定时间）...');
                this.nextDay(120 + Math.floor(1000 * Math.random()));
                ok();
                return;
            }
            this.info('开始扫荡...');
            this.cmd.do_sweep_tower(() => {
                ok();
                this.nextDelay(1);
            }, () => err('试炼扫荡超时'));
        })).then(() => {
            this.workFinished();
        }).catch(e => {
            this.err('执行出错：', e);
            this.workFinished(600);
        });
    }

}
