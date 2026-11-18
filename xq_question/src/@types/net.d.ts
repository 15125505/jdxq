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

    /**
     * 客户端获取问题
     */
    interface GetQuestion {
        roleId: string;
        check: number;
        question: string;
    }

    interface UpdateQuestion {
        roleId: string;
        check: number;
        question: string;
        answer: string;
    }
}

/**
 * 服务器返回的数据格式
 */
declare namespace netRet {


    /**
     * 客户端获取问题
     */
    type GetQuestion = string;
    /**
     * 客户端更新问题
     */
    type UpdateQuestion = string;
}

