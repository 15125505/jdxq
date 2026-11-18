/**
 * 分享模块
 */
import {Base} from "./base";

export class Share extends Base {

    constructor(work) {
        super('奖励', null, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    /**
     * 开始一次性任务
     * @param param
     */
    once(param) {
        param = {};
        let sceneId = 28;

        // 获取周任务，必须经过这个步骤，才能成功
        this.cmd.do_get_week_act_info('purpose_share_1');

        // 分享准备
        if (!this.binded) {
            this.cmd.send(this.user.make_cmd('game', 'orient_share_bind', {functionId : 'orient_share_24'}));
            this.binded = true;
        }
        this.cmd.send(this.user.make_cmd('game', 'orient_share_recall', {sceneId : sceneId, opNum: 0}));

        // 开始分享
        new Promise((ok, err) => {
            this.cmd.do_orient_share(sceneId, result => {
                console.log('分享结果：', result);
                param.todayDrawCnt = result.todayDrawCnt;           // 已经抽奖的次数
                param.todayRemainCnt = result.todayRemainCnt;       // 剩余抽奖次数
                param.todayCanDrawCnt = result.todayCanDrawCnt;     // 可以抽奖次数
                ok();
            }, ()=>err('分享失败'));
        }).then(() => new Promise((ok, err) => {
            console.log('开始抽奖....');
            this.cmd.do_orient_share_draw('orient_share_24', result => {
                console.log('抽奖结果：', result);
                ok();
            }, ()=>err('抽奖失败'));
        })).then(() => {
            this.onceWorkFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.onceWorkFinished();
        });
    }

}
