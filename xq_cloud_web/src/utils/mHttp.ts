// 作者： ZF
// 描述: mHttp
// 日期: 2024-07-04

import axios, {AxiosResponse} from "axios";

const Server = 'http://server-15.example.invalid';

class MHttp {


    /**
     * 检查当前登录密码
     */
    async checkPassword(param: netParam.CheckPassword): Promise<netRet.CheckPassword> {
        return this.request("/checkPassword", param);
    }

    /**
     * 设置登录密码
     */
    async setPassword(param: netParam.SetPassword): Promise<netRet.SetPassword> {
        return this.request("/setPassword", param);
    }

    /**
     * 获取权限申请列表
     */
    async requestList(param: netParam.RequestList): Promise<netRet.RequestList> {
        return this.request("/requestList", param);
    }

    /**
     * 同意/拒绝指定用户的授权申请
     */
    async agree(param: netParam.Agree): Promise<netRet.Agree> {
        return this.request("/agree", param);
    }

    /**
     * 查询指定用户的配置信息
     */
    async querySetting(param: netParam.QuerySetting): Promise<netRet.QuerySetting> {
        return this.request("/querySetting", param);
    }

    /**
     * 申请获得指定用户的信息
     */
    async requestPermission(param: netParam.RequestPermission): Promise<netRet.RequestPermission> {
        return this.request("/requestPermission", param);
    }


    /**
     * 向服务器发起请求
     */
    private async request<Ret = any, Param = any>(uri: string, param: Param): Promise<Ret> {
        console.log("-----请求：", uri, param);

        const result = await axios.post(Server + uri, param, {headers: {'Content-Type': 'application/json'}});
        if (result.data.code == 0) {
            return result.data.msg as any as Ret;
        }

        console.error("-----服务器返回错误：", result.data);
        await Promise.reject(result.data.err);
    }

}

export const gMHttp = new MHttp();
