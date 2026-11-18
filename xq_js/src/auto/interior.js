import {Base} from "./base";

/**
 * 经过确认：内政任务没有bug
 * 执行方法：
 * window.work.interior.startOnce();
 */
export class Interior extends Base {
    constructor(work) {
        super('内政');
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    /**
     * 开始一次性任务
     * @param param
     */
    once(param) {

        // 获取内政任务列表
        // 完成这个任务
        // 完成这个任务的事件
        param = {};

        // 获取内政任务列表
        new Promise((ok, err) => {
            this.cmd.do_task_list(result => {
                console.log('---任务列表：', result);
                if (!result.taskList.taskList.length) {
                    err('当前没有任务');
                    return;
                }
                let node = result.taskList.taskList[0];
                if (node.status !== 3) {
                    err('当前没有可以完成的任务');
                    return;
                }
                param.taskId = node.taskId;
                this.log('尝试完成', node.star, '星任务：', node.name);
                ok();
            }, () => err('获取内政任务列表超时'));
        }).then(() => new Promise((ok, err) => {
            // 完成这个任务
            this.cmd.do_task_finish(param.taskId, result=>{
                console.log('---任务完成的反馈：', result);
                ok();
            }, ()=>err('完成任务超时'));
        })).then(() => new Promise((ok, err) => {
            // 完成这个任务的事件
            this.cmd.do_task_event_finish(param.taskId, result=>{
                console.log('---任务完成的反馈：', result);
                ok();
            }, ()=>err('完成任务超时'));
        })).then(() => this.onceWorkFinished()).catch(e => {
            this.err('执行出错：', e);
            this.onceWorkFinished();
        });
    }

}
