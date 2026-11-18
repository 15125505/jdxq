// 作者： maintainer
// 描述: paramEx.ts
// 日期: 2023-10-14

/**
 * 获取军团祈愿配置信息
 */
export function getDonateParam(platform: string, roleId: string): data.DonateParam {
    const param = localStorage['donate_' + platform + roleId];
    if (param) {
        return JSON.parse(param);
    }
    return {
        country: 4,
        goldDonateTimes: 0,
    };
}

/**
 * 设置军团祈愿配置信息
 */
export function setDonateParam(platform: string, roleId: string, param: data.DonateParam) {
    localStorage['donate_' + platform + roleId] = JSON.stringify(param);
}
