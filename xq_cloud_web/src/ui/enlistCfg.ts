// 作者： maintainer
// 描述: enlistCfg
// 日期: 2023-12-15

/**
 * 获取招贤纳士配置信息
 */
export function getEnlistParam(platform: string, roleId: string): data.EnlistParam {
    const param = localStorage['enlist_' + platform + roleId];
    if (param) {
        return JSON.parse(param);
    }
    return {
        country: 'wei',
    };
}


/**
 * 设置招贤纳士配置信息
 */
export function setEnlistParam(platform: string, roleId: string, param: data.EnlistParam) {
    localStorage['enlist_' + platform + roleId] = JSON.stringify(param);
}
