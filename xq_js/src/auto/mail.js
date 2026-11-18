import {Base} from "./base";

export class Mail extends Base {
    constructor(work) {
        super('邮件', work.configInfo, work.getRoleInfo());

        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('Mail');
    }

    /**
     * 当前这轮任务开始
     */
    workStart() {

        // 执行工作
        this.realWork().catch(e => {
            this.err('出现错误：', e);
            this.workFinished(300);
        });
    }

    async realWork() {

        // 获取有附件的邮件列表
        const result = await new Promise((ok, err) => this.cmd.do_get_mail_list(res => ok(res), () => err('获取邮件列表失败')));
        console.log('邮件列表返回：', result);
        let keys = Object.keys(result.datamerge.mail);
        keys = keys.filter(v => result.datamerge.mail[v].hasAttachment);

        // 逐个领取邮件
        for (let i = 0; i < keys.length; i++) {

            // 检查附件中是否有体力
            const key = keys[i];
            const result1 = await new Promise((ok, err) => this.cmd.do_get_mail_content(key, result.datamerge.mail[key].type, res => ok(res), () => err('查看邮件内容失败')));
            if (result1.mailContent.items.find(v => v.item === 'user_strength')) {
                continue;
            }

            // 如果没有体力，那么领取该附件
            const result2 = await new Promise((ok, err) => this.cmd.do_pick_up(key, res => ok(res), () => err('领取邮件内容失败')));
            this.log('成功领取附件：', result1.mailContent.title);
        }

        this.workFinished(3600);
    }

}
