import {Base} from "./base";

export class PassThrough extends Base {

    constructor(work) {
        super('过关斩将', null, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    /**
     * 开始一次性任务
     * @param param
     */
    once(param) {

        // 当前状态
        param = {};

        // 首先获取当前状态（获取当前关卡cur_level、获取当前难度cur_pattern、检查当前是否可以open_box）
        new Promise((ok, err) => {
            this.cmd.do_pass_through_sys_get_levels(result => {
                console.log('过关斩将状态：', result);
                param.state = result;
                ok();
            }, () => err('获取当前状态失败'));
        }).then(() => new Promise((ok, err) => {
            // 如果当前状态可以领取，那么执行open_box
            param.state.extra_boxs.forEach(v => {
                !v.is_open && this.cmd.do_pass_through_sys_open_box(v.id, result => console.log('领取', v.id, '层奖励：', result));
            });
            ok();
        })).then(() => this.onceWorkFinished()).catch(e => {
            this.err('执行出错：', e);
            this.onceWorkFinished();
        });
    }
}
