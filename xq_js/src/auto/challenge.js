import {Base} from "./base";

/**
 * 执行方法：
 * window.work.challenge.startOnce({camp: 'wu', level: 7});
 */
export class Challenge extends Base {

    constructor(work) {
        super('名将之路');
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    /**
     * 开始一次性任务
     * @param param
     */
    once(param) {

        // 获取当前名将之路阵容
        new Promise((ok, err) => {
            this.cmd.do_onGetTroop(param.camp, result =>{
                param.troop = result.troop;
                param.tacticId = result.tacticId;
                ok();
            }, ()=>err('获取战斗阵容超时'));
        }).then(() => new Promise((ok, err) => {
            // 执行攻击
            this.cmd.do_onChallenge(param.camp, param.level, param.troop, param.tacticId, result => {
                console.log('战斗结果：', result);
                if (result.isWin) {
                    this.warn('经过', result.battleData.record.rounds.length, '轮鏖战，挑战成功！！！');
                } else {
                    this.info('经过', result.battleData.record.rounds.length, '轮鏖战，挑战还是失败了...');
                }
                ok();
            }, () => err('获取我方攻击阵容超时'));
        })).then(() => this.onceWorkFinished()).catch(e => {
            this.err('执行出错：', e);
            this.onceWorkFinished();
        });
    }
}
