// Description: 用于定义网络协议的模块
// 所有网络协议遵循以下规则：
// 1. 所有返回给客户端的消息都必须遵循net.Msg的定义
// 2. msg字段的具体内容和协议本身相关，在netRes中定义
// 3. 下方的Login是一个例子，可以根据实际需要进行修改

declare namespace net {

    /**
     * 所有返回的消息都必须遵循本定义
     */
    interface Msg<T> {
        code: number;
        err?: string;
        msg?: T;
    }

    /**
     * 异步返回的消息
     */
    type AsyncMsg<T> = Promise<Msg<T>>;
}

/**
 * 客户端请求的消息参数
 */
declare namespace netParam {

    interface Common {
        platform: string;
        roleId: string;
        code: string;       // 用于校验的code md5(platform+xq+roleId)
        hash: string;       // 密码hash md5(code+xxx+password)
    }


    /**
     * 获取当前用户的登录密码
     */
    interface CheckPassword extends Common {
    }

    /**
     * 设置登录密码
     */
    interface SetPassword extends Common {
        newPassword: string;
    }


    /**
     * 申请获得指定用户的信息
     */
    interface RequestPermission extends Common {
        dstPlatform: string;
        dstRoleId: string;
    }


    /**
     * 获取权限申请列表
     */
    interface RequestList extends Common {
    }


    /**
     * 同意/拒绝指定用户的授权申请
     */
    interface Agree extends Common {
        users: {
            platform: string;
            roleId: string;
            agree: boolean;
        }[];
    }

    /**
     * 请求查看指定用户的配置信息
     */
    interface QuerySetting extends Common {
        dstPlatform: string;
        dstRoleId: string;
    }


}

/**
 * 服务器返回的数据格式
 */
declare namespace netRet {

    /**
     * 获取当前用户的登录密码
     */
    interface CheckPassword {
        result: 'notNeed' | 'ok' | 'wrong';
    }

    /**
     * 设置登录密码
     */
    interface SetPassword {
        result: 'ok';
    }

    /**
     * 请求查看指定用户的配置信息
     */
    interface QuerySetting {
        config: string;
        subs: string;
    }

    /**
     * 申请获得指定用户的信息
     */
    interface RequestPermission {
        result: 'ok';
    }

    /**
     * 获取权限申请列表
     */
    interface RequestList {
        request: {
            platform: string;
            roleId: string;
        }[];
        agree: {
            platform: string;
            roleId: string;
        }[];
    }

    /**
     * 同意/拒绝指定用户的授权申请
     */
    interface Agree {
        result: 'ok';
    }
}

