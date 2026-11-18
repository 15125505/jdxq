// 作者： maintainer
// 描述: enlistCfg
// 日期: 2023-12-15

import Swal from "sweetalert2";

/**
 * 获取招贤纳士配置信息
 */
export function getEnlistParam(platform: string, roleId: number): data.EnlistParam {
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
export function setEnlistParam(platform: string, roleId: number, param: data.EnlistParam) {
    localStorage['enlist_' + platform + roleId] = JSON.stringify(param);
}

/**
 * 招贤纳士配置信息配置
 */
export async function enlistConfig(platform: string, roleId: number) {

    // 取出上次保存的配置信息
    const param = getEnlistParam(platform, roleId);

    // 创建需要弹出的东西
    const innerHTML = `
<div style="text-align: left">
    <div>自动设置
        <select class="swal2-select" id="enlist-country">
            <option value="wei" ${param.country == 'wei' ? 'selected' : ''}>魏国</option>
            <option value="shu" ${param.country == 'shu' ? 'selected' : ''}>蜀国</option>
            <option value="wu" ${param.country == 'wu' ? 'selected' : ''}>吴国</option>
            <option value="qun" ${param.country == 'qun' ? 'selected' : ''}>群雄</option>
        </select>为目标
    </div>
</div>
`;

    // 选择次数
    const ret = await Swal.fire({
        title: '招贤纳士设置',
        html: innerHTML,
        footer: '没有设置心选英雄时，将自动使用上面设置的英雄',
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消'
    });
    if (!ret.isConfirmed) {
        await Promise.reject('用户取消');
        return;
    }

    param.country = (document.getElementById('enlist-country') as HTMLSelectElement).value;
    console.log('用户选择：', param);
    setEnlistParam(platform, roleId, param);
}
