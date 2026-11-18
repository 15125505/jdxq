// 作者： maintainer
// 描述: QuenchingCfg
// 日期: 2023-12-15

import Swal from "sweetalert2";

/**
 * 获取淬炼配置信息
 */
export function getQuenchingParam(): data.QuenchingParam {
    const param = localStorage['Quenching_00000'];
    if (param) {
        return JSON.parse(param);
    }
    return {
        name: "",
        mode: 1,
        count: 100,
        level: 4,
        pos: 0,
        minCount: 100,
    };
}


/**
 * 设置淬炼配置信息
 */
export function setQuenchingParam(param: data.QuenchingParam) {
    localStorage['Quenching_00000'] = JSON.stringify(param);
}

declare global {
    interface Window {
        onModeChange?: (mode: number) => void;
    }
}

/**
 * 淬炼配置信息配置
 */
export async function quenchingConfig() {

    // 取出上次保存的配置信息
    const param = getQuenchingParam();

    // html
    const innerHTML = `
<div style="text-align: left">
    <div>
        <label for="Quenching-name">请输入武将名</label>
        <input style="width: 200px" class="swal2-input"  id="Quenching-name" value="${param.name}">
    </div>
    <div>洗练位置
        <select class="swal2-select" id="Quenching-pos">
            <option value="0" ${param.pos == 0 ? 'selected' : ''}>武器</option>
            <option value="1" ${param.pos == 1 ? 'selected' : ''}>帽子</option>
            <option value="2" ${param.pos == 2 ? 'selected' : ''}>衣服</option>
            <option value="3" ${param.pos == 3 ? 'selected' : ''}>鞋子</option>
        </select>
    </div>
    <div>
        <input class="swal2-radio" type="radio" id="Quenching-mode-1" onchange="onModeChange(1)" name="Quenching-mode" value="1" ${param.mode == 1 ? 'checked' : ''}>
        <label for="Quenching-mode-1">直接洗练指定次数</label>
        <input class="swal2-radio" type="radio" id="Quenching-mode-2" onchange="onModeChange(2)" name="Quenching-mode" value="2" ${param.mode == 2 ? 'checked' : ''}>
        <label for="Quenching-mode-2">洗练到开新孔</label>
    </div>
    <div style="display: ${param.mode == 1 ? 'block' : 'none'}">
        <label for="Quenching-count">直接洗练</label>
        <input class="swal2-input" type="number" id="Quenching-count" value="${param.count}">
        <label for="Quenching-count">次</label>
    </div>
    <div style="display: ${param.mode == 2 ? 'block' : 'none'}">
        <label for="Quenching-level">洗练到开</label>
        <input class="swal2-input" type="number" id="Quenching-level" value="${param.level}">
        <label for="Quenching-level">孔</label>
        <br>
        <label for="Quenching-minCount">剩余</label>
        <input class="swal2-input" type="number" id="Quenching-minCount" value="${param.minCount}">
        <label for="Quenching-minCount">次以内时遇红色停止</label>
    </div>
</div>
`;

    window.onModeChange = mode => {
        param.mode = mode;
        document.getElementById('Quenching-count').parentElement.style.display = mode == 1 ? 'block' : 'none';
        document.getElementById('Quenching-level').parentElement.style.display = mode == 2 ? 'block' : 'none';
        console.log(document.getElementById('Quenching-count').parentElement, document.getElementById('Quenching-level').parentElement);
    };

    // 选择次数
    const ret = await Swal.fire({
        title: '快速洗练设置',
        html: innerHTML,
        footer: '请将需要洗练的英雄，设置为头像防守阵容的第一个，考虑到洗练失误的后果极其严重，因此需要用户手动输入需要洗练的英雄名称进行核验，只有名称和位置都匹配，才会进行洗练',
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
            param.name = (document.getElementById('Quenching-name') as HTMLInputElement).value;
            param.pos = parseInt((document.getElementById('Quenching-pos') as HTMLSelectElement).value);
            param.mode = parseInt((document.querySelector('input[name="Quenching-mode"]:checked') as HTMLInputElement).value);
            param.count = parseInt((document.getElementById('Quenching-count') as HTMLInputElement).value);
            param.level = parseInt((document.getElementById('Quenching-level') as HTMLInputElement).value);
            param.minCount = parseInt((document.getElementById('Quenching-minCount') as HTMLInputElement).value);
            if (!param.name) {
                Swal.showValidationMessage("必须输入武将名");
                return false;
            }
        }
    });
    if (!ret.isConfirmed) {
        await Promise.reject('用户取消');
        return;
    }

    console.log('用户选择：', param);
    setQuenchingParam(param);

    return param;
}
