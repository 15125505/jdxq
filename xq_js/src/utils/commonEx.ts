// 作者： maintainer
// 描述: 新的通用模块
// 日期: 2023-10-14


import Swal from "sweetalert2";

/**
 * 获取军团祈愿配置信息
 */
export function getDonateParam(platform: string, roleId: number): data.DonateParam {
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
export function setDonateParam(platform: string, roleId: number, param: data.DonateParam) {
    localStorage['donate_' + platform + roleId] = JSON.stringify(param);
}

/**
 * 军团祈愿配置信息配置
 */
export async function donateConfig(platform: string, roleId: number) {

    // 取出上次保存的配置信息
    const param = getDonateParam(platform, roleId);

    // 创建需要弹出的东西
    const innerHTML = `
<div style="text-align: left">
    <div>优先祈愿
        <select class="swal2-select" id="donate-country">
            <option value="1" ${param.country == 1 ? 'selected' : ''}>蜀国</option>
            <option value="2" ${param.country == 2 ? 'selected' : ''}>魏国</option>
            <option value="3" ${param.country == 3 ? 'selected' : ''}>群雄</option>
            <option value="4" ${param.country == 4 ? 'selected' : ''}>吴国</option>
        </select>碎片
    </div>
    <div><label>
        花费元宝助力他人 <input class="swal2-input narrow-input" id="donate-goldDonateTimes" type="number" value="${param.goldDonateTimes}"> 次军团祈愿，免费次数自动使用，不会浪费。
    </label></div>
</div>
`;

    // 选择次数
    const ret = await Swal.fire({
        title: '军团祈愿设置',
        html: innerHTML,
        footer: '军团祈愿自动助力当前列表中第一个目标，如果希望指定目标，请手动进行军团祈愿',
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消'
    });
    if (!ret.isConfirmed) {
        await Promise.reject('用户取消');
        return;
    }

    param.country = parseInt((document.getElementById('donate-country') as HTMLSelectElement).value);
    param.goldDonateTimes = parseInt((document.getElementById('donate-goldDonateTimes') as HTMLInputElement).value);
    if (param.goldDonateTimes < 0) {
        param.goldDonateTimes = 0;
    }
    if (param.goldDonateTimes > 5) {
        param.goldDonateTimes = 5;
    }
    console.log('用户选择：', param);
    setDonateParam(platform, roleId, param);
}
