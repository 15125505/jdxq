// Create by maintainer
// Description: 自动答题
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";
import {reqQuestionServer} from "../utils/utils";

export class Answer extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('自动答题', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.start();
    }


    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 1. 获取题目
        const info = await new Promise<any>((ok, err) => this.cmd.do_get_qingdian_act_info((result: any) => ok(result), () => err('获取答题信息超时')));
        console.log('答题信息：', info);
        const item = info.costItem?.[0]?.item;
        const itemName = this.user.getItemName(item);
        const count = this.cmd.gameUser[item] ?? 0;
        this.log('当前拥有免费答题次数：', info.freeCount, '次，另外可以使用', itemName, '答题：', count, '次');

        // 如果没有答题次数了，那么就等待一小时后再次尝试
        if (count + info.freeCount <= 0) {
            this.nextDay(3600);
            this.info('没有答题次数了，等待一小时后再次尝试...');
            return;
        }

        // 2. 获取题目
        const info2 = await new Promise<any>((ok, err) => this.cmd.do_questionnaire_info((result: any) => ok(result), () => err('获取答题信息超时')));
        console.log('题目信息：', info);
        this.log('题目：', info2.question.topic);
        this.log('选项：', JSON.stringify(info2.question.options));

        // 3. 从题库获取答案
        this.log('尝试从江东小乔题库获取答案...');
        const xqAnswer = await reqQuestionServer<netRet.GetQuestion>('/q', {
            roleId: this.user.getRoleId(),
            check: 1,
            question: info2.question.topic,
        });
        let answer = [];
        let needUpdate = false;
        const options = info2.question.options.map((v: string) => v.substring(2));
        if (xqAnswer.code == 0) {
            this.log('题库给出的答案：', xqAnswer.msg);
            const found = options.findIndex((v: string) => v == xqAnswer.msg);
            if (found >= 0) {
                answer = [found + 1];
            } else {
                this.warn('题库给出的答案不在选项中，下面将进行随机作答，答题完成后，新的题目会自动录入题库，感谢你为江东小乔所有用户做出的贡献...');
                answer = [3];
                needUpdate = true;
            }
        } else if (xqAnswer.code == 101) {
            this.warn('题库没有收录这个题目，下面将进行随机作答，答题完成后，新的题目会自动录入题库，感谢你为江东小乔所有用户做出的贡献...');
            answer = [3];
            needUpdate = true;
        } else {
            this.err('获取题库时返回错误：', xqAnswer.err);
            this.nextDay(600);
            return;
        }
        console.log('答案：', xqAnswer);

        // 4. 答题
        const result = await new Promise<any>((ok, err) => this.cmd.do_questionnaire_answer(answer, info2.question.id, (result: any) => ok(result), () => err('答题超时')));
        this.info('回答', result.result ? '正确！' : '错误...', `当前回答是《${options[result.playerAnswer[0] - 1]}》，正确答案是《${options[result.stardardAnswer[0] - 1]}》`);
        if (!result.result) {
            this.nextDay(600);
            needUpdate = true;
        }

        // 5. 更新题库
        if (needUpdate) {
            this.log('新的答案将被录入题库，感谢你为江东小乔所有用户做出的贡献...');
            const updateResult = await reqQuestionServer<netRet.UpdateQuestion>('/u', {
                roleId: this.user.getRoleId(),
                check: 1,
                question: info2.question.topic,
                answer: options[result.stardardAnswer[0] - 1],
            });
            if (updateResult.code == 0) {
                this.log('更新题库成功！');
            } else {
                this.err('更新题库失败：', updateResult.err);
            }
        }
        this.nextDelay(1);
        return
    }
}
