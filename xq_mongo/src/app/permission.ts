import {Process} from "../core/process";
import {gDb} from "../conf/dbConfig";
import SparkMD5 from "spark-md5";
import {MongoClient} from "mongodb";
import Log from "crlog";
import zlib from "zlib";

const Debug = false;

// 权限管理
export class Permission extends Process {

    init() {

        // 检查密码
        this.msgFunc.set('/checkPassword', this.onCheckPassword);

        // 设置密码
        this.msgFunc.set('/setPassword', this.onSetPassword);

        // 请求权限
        this.msgFunc.set('/requestPermission', this.onRequestPermission);

        // 请求权限列表
        this.msgFunc.set('/requestList', this.onRequestList);

        // 同意/拒绝权限
        this.msgFunc.set('/agree', this.onAgree);

        // 查询配置
        this.msgFunc.set('/querySetting', this.onQuerySetting);

        return this;
    }

    // 获取mongo连接
    async getClient() {
        for (let i = 0; i < 10; i++) {
            if (gDb.mongo) {
                return gDb.mongo;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    /**
     * 检查code并获取数据库连接
     */
    async getClientEx(param: netParam.Common): Promise<{
        client?: MongoClient;
        err?: { code: number, err: string }
    }> {

        // 获取数据库连接
        const client = await this.getClient();
        if (!client) {
            Log.error('数据库出现异常');
            return {err: {code: 1000, err: '数据库出现异常'}};
        }
        if (Debug) {
            return {client};
        }


        // 检查code是否有效
        const key = SparkMD5.hash(param.platform + 'xq' + param.roleId);
        if (key != param.code) {
            Log.error('账号信息校验失败');
            return {err: {code: 1001, err: '账号信息校验失败'}};
        }

        // 检查密码是否有效
        const ret = await client.db('xq').collection('user').findOne({
            platform: param.platform,
            roleId: param.roleId
        }, {projection: {password: 1}});
        if (!ret) {
            Log.info('该用户没有设置密码');
            return {client};
        }

        // 计算用户密码的hash值
        const hash = SparkMD5.hash(param.code + 'xxx' + ret.password);
        if (hash != param.hash) {
            return {err: {code: 1002, err: '密码错误'}};
        }

        return {client};
    }

    // 检查密码
    async onCheckPassword(param: netParam.CheckPassword): net.AsyncMsg<netRet.CheckPassword> {

        // 获取连接
        const clientEx = await this.getClientEx(param);
        if (clientEx.err) {
            return clientEx.err;
        }
        return {code: 0, msg: {result: 'ok'}};
    }

    // 设置登录密码
    async onSetPassword(param: netParam.SetPassword): net.AsyncMsg<netRet.SetPassword> {

        // 获取连接
        const clientEx = await this.getClientEx(param);
        if (clientEx.err) {
            return clientEx.err;
        }
        const client = clientEx.client;

        // 设置密码
        const ret = await client.db('xq').collection('user').updateOne({
            platform: param.platform,
            roleId: param.roleId,
        }, {
            $set: {password: param.newPassword},
        }, {upsert: true});

        console.log('设置密码的反馈：', ret);

        return {code: 0, msg: {result: 'ok'}};
    }

    /**
     * 申请获取指定用户的配置信息
     */
    async onRequestPermission(param: netParam.RequestPermission): net.AsyncMsg<netRet.RequestPermission> {

        // 获取连接
        const clientEx = await this.getClientEx(param);
        if (clientEx.err) {
            return clientEx.err;
        }
        const client = clientEx.client;

        // 在用户表中查询目标记录
        const collection = client.db('xq').collection<data.User>('user');
        const result = await collection.findOneAndUpdate(
            {platform: param.dstPlatform, roleId: param.dstRoleId},
            {$set: {platform: param.dstPlatform, roleId: param.dstRoleId}},
            {upsert: true, returnDocument: 'after'});
        console.log('目标记录：', result);

        // 如果目标记录中存在，无需任何处理，如果没有，加入并更新
        if (!result.request) {
            result.request = [];
        }
        if (result.request.find(v => v.platform == param.platform && v.roleId == param.roleId)) {
            return {code: 0, msg: {result: 'ok'}};
        }
        result.request.push({platform: param.platform, roleId: param.roleId});

        // 更新到数据库
        await collection.updateOne({
            platform: param.dstPlatform, roleId: param.dstRoleId
        }, {
            $set: {request: result.request}
        });

        return {code: 0, msg: {result: 'ok'}};
    }

    /**
     * 获取权限申请列表
     */
    async onRequestList(param: netParam.RequestList): net.AsyncMsg<netRet.RequestList> {

        // 获取连接
        const clientEx = await this.getClientEx(param);
        if (clientEx.err) {
            return clientEx.err;
        }
        const client = clientEx.client;

        // 在用户表中查询目标记录
        const collection = client.db('xq').collection<data.User>('user');
        const result = await collection.findOne({platform: param.platform, roleId: param.roleId});
        console.log('目标记录：', result);

        return {code: 0, msg: {request: result?.request ?? [], agree: result?.agree ?? []}};
    }


    /**
     * 同意/拒绝指定用户的授权申请
     */
    async onAgree(param: netParam.Agree): net.AsyncMsg<netRet.Agree> {

        // 获取连接
        const clientEx = await this.getClientEx(param);
        if (clientEx.err) {
            return clientEx.err;
        }
        const client = clientEx.client;

        // 在用户表中查询目标记录
        const collection = client.db('xq').collection<data.User>('user');
        const key = {platform: param.platform, roleId: param.roleId};
        const result = await collection.findOneAndUpdate(key, {$set: key}, {upsert: true, returnDocument: 'after'});
        console.log('目标记录：', result);

        // 然后，将所有同意的请求，加入到agree中
        if (!result.agree) {
            result.agree = [];
        }
        if (!result.request) {
            result.request = [];
        }
        param.users.forEach(u => {

            // 删除请求
            const index = result.request.findIndex(v => v.platform == u.platform && v.roleId == u.roleId);
            if (index >= 0) {
                result.request?.splice(index, 1);
            }

            // 删除不同意
            const agreeIndex = result.agree.findIndex(v => v.platform == u.platform && v.roleId == u.roleId);
            if (agreeIndex >= 0 && !u.agree) {
                result.agree.splice(agreeIndex, 1);
            }

            // 添加同意
            if (agreeIndex < 0 && u.agree) {
                result.agree.push({platform: u.platform, roleId: u.roleId});
            }

        });

        // 更新到数据库
        await collection.updateOne(key, {$set: {agree: result.agree, request: result.request}});
        return {code: 0, msg: {result: 'ok'}};
    }

    /**
     * 请求查看指定用户的配置信息
     */
    async onQuerySetting(param: netParam.QuerySetting): net.AsyncMsg<netRet.QuerySetting> {

        // 获取连接
        const clientEx = await this.getClientEx(param);
        if (clientEx.err) {
            return clientEx.err;
        }
        const client = clientEx.client;

        // 在用户表中查询目标记录
        const collection = client.db('xq').collection<data.User>('user');
        const key = {platform: param.dstPlatform, roleId: param.dstRoleId};
        const result = await collection.findOneAndUpdate(key, {$set: key}, {upsert: true, returnDocument: 'after'});

        // 如果没有权限，直接返回失败
        if (!result.agree?.find(v => v.platform == param.platform && v.roleId == param.roleId)) {
            console.log('当前agree', result, '目标', param.dstPlatform, param.dstRoleId, param);
            return {code: 3, err: '您没有权限获取该用户的配置，请首先向该用户申请，待对方同意之后重试'}
        }

        // 临时填充为测试代码
        // param.dstPlatform = '';

        // 查询sql数据库，获得该用户的配置
        const [rows] = await gDb.pool.query(`select config_info, sub_info from xq.cloud where platform = ? and role_id = ?`, [param.dstPlatform, param.dstRoleId]);
        const setting = (rows as { config_info: string, sub_info: Buffer }[])[0];
        if (!setting) {
            return {code: 4, err: '没有找到该用户的配置信息'};
        }

        // 对sub_info进行gzip解压
        const msg: netRet.QuerySetting = {config: setting.config_info, subs: ''};
        try {
            msg.subs = zlib.gunzipSync(setting.sub_info).toString();
        } catch (e) {
            console.error('解压sub_info失败', e);
        }

        // 返回结果
        return {code: 0, msg};
    }
}

