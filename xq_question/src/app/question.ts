import {Process} from "../core/process";
import {gDb} from "../conf/dbConfig";
import Log from "crlog";


export class Question extends Process {

    init(): void {
        this.msgFunc.set('/q', this.onGetQuestion);
        this.msgFunc.set('/u', this.onUpdateQuestion);
    }

    async onGetQuestion(param: netParam.GetQuestion): net.AsyncMsg<netRet.GetQuestion> {
        const check = this.checkParam(param);
        if (check != param.check) {
            Log.error('请求数据', param, '校验失败', check)
            return {code: 1, err: '参数错误'};
        }
        const [rows] = await gDb.pool.query(`select answer
                                             from xq.question
                                             where question = ?`, [param.question]);     // 如果sql语句异常，会抛出异常
        const answer = (rows as { answer: string }[])[0]?.answer; // 如果没有查询到结果，rows是一个空数组
        if (!answer) {
            return {code: 101, err: '问题尚未收录'};
        }
        return {code: 0, msg: answer};
    }

    async onUpdateQuestion(param: netParam.UpdateQuestion): net.AsyncMsg<netRet.UpdateQuestion> {

        const check = this.checkParam(param);
        if (check != param.check) {
            Log.error('请求数据 ', param, '校验失败', check)
            return {code: 1, err: '参数错误'};
        }

        // 首先检查问题是否存在
        const [rows] = await gDb.pool.query(`select answer
                                             from xq.question
                                             where question = ?`, [param.question]);
        const answer = (rows as { answer: string }[])[0]?.answer; // 如果没有查询到结果，rows是一个空数组

        // 如果不存在，那么插入问题
        if (!answer) {
            await gDb.pool.execute(`insert into xq.question(question, answer, role_id)
                                    values (?, ?, ?)`, [param.question, param.answer, param.roleId]);
            return {code: 0, msg: 'thanks for your contribution!'};
        }

        // 如果存在，那么检查问题答案是否一致
        if (answer == param.answer) {
            return {code: 0, msg: '答案已经存在!'};
        }

        // 如果存在，那么更新问题答案
        await gDb.pool.execute(`update xq.question
                                set answer      = ?,
                                    update_time = current_timestamp,
                                    role_id     = ?
                                where question = ?`, [param.answer, param.question, param.roleId]);
        return {code: 0, msg: 'thanks for modify!'};
    }

    checkParam(param: { [key: string]: any }) {
        const checkParam = {...param};
        checkParam.check = 12345;
        const str = JSON.stringify(checkParam);
        for (let i = 0; i < str.length; i++) {
            checkParam.check += str.charCodeAt(i);
        }
        return checkParam.check;
    }

}
