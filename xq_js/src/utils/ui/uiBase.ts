// 作者： maintainer
// 描述: uiBase
// 日期: 2024-02-20

import {gUI} from "./uiTool";

export abstract class UiBase<ParamType = any> {

    protected constructor(platform: string, roleId: number, defaultParam: ParamType, paramKey: string) {
        this.platform = platform;
        this.roleId = roleId;
        this.defaultParam = defaultParam;
        if (paramKey[paramKey.length - 1] != '_') {
            paramKey += '_';
        }
        this.paramKey = paramKey + platform + roleId;
    }

    get param(): ParamType {

        // 尝试从本地存储中获取并解析配置信息，如果失败则返回默认值
        const param = localStorage[this.paramKey];
        if (param) {
            try {
                return JSON.parse(param);
            } catch (e) {
                console.error('解析配置信息失败', e);
            }
        }
        return this.defaultParam;
    }

    set param(value: ParamType) {
        localStorage[this.paramKey] = JSON.stringify(value);
    }

    /**
     * 根据配置项获取用户输入
     */
    protected async getUserParam(param: ui.UserParam) {
        return await gUI.getUserParam(param, true);
    }

    abstract showConfig(): Promise<void>;

    readonly defaultParam: ParamType;
    readonly platform: string;
    readonly roleId: number;
    readonly paramKey: string;
}
