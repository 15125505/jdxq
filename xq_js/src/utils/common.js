import {Log} from "../log";
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import {checkQr, payQr, startWork, useSn, workState, zDownloadUserInfo, zUploadInfo} from "./http";
import {genKey} from "./utils";
import {copyText} from "../pack";
import {getConfigInfo} from "../index";
import QRCode from "qrcodejs2";
import {addUser} from "./storage";
import {orangeHero} from "./allHero";

export const hideVip = false;

// 广告内容
const vecAd = [
    {
        title: '为什么没有广告',
        desc: `没有广告不好么？`,
        id: 'ad-2021-07-08-01',
    },
];

export function buyCloud(platform, roleId) {

    (async () => {

        console.log('QRCode:', QRCode);

        // 用户选择加时类型
        const choice = await Swal.fire({
            titleText: "云账号注册/续期",
            html: `<div>当前账号是<b>${platform} ${roleId}</b>，选择付费之前请看清楚，不要弄错了账号。</div>`,
            showConfirmButton: true,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '云60天 ￥6.66',
            denyButtonText: '云180天 ￥18.88',
            cancelButtonText: '关闭',
            denyButtonColor: '#3085d6',
        })
        let priceId = 0;
        if (choice.isConfirmed) {
            priceId = 2;
        } else if (choice.isDenied) {
            priceId = 3;
        } else {
            return;
        }

        // 请求服务器
        const ret = await new Promise((ok, err) => {
            payQr({platform, roleId: roleId.toString(), priceId}, msg => ok(msg), errMsg => err(errMsg));
        });
        if (ret.ErrMsg) {
            await Promise.reject(ret.ErrMsg);
            return;
        }

        /**
         * 定时检查支付结果
         */
        let stop = false;
        const check = () => {
            checkQr({id: ret.Id}, msg => {
                if (msg.ErrMsg) {
                    console.log('检查支付状态失败：', msg.ErrMsg);
                    throw msg.ErrMsg;
                }
                if (!msg.Finished) {
                    !stop && setTimeout(check, 1000);
                    return;
                }
                Swal.fire({
                    icon: 'success',
                    title: '已为您成功增加云时间',
                });
            }, errMsg => console.log("查询支付状态失败：", errMsg));
        }
        setTimeout(check, 1000);

        // 显示二维码
        await Swal.fire({
            titleText: "请用微信扫码",
            html: `<div id="qrcode" style="display: flex; justify-content: center"></div>`,
            footer: `支付结果可能会有延迟，关闭本窗口不影响支付结果。`,
            willOpen() {
                new QRCode(document.getElementById("qrcode"), {
                    text: ret.Qr,
                    width: 128,
                    height: 128,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            },
            showConfirmButton: false,
            showCloseButton: true,
        });
        stop = true;

    })().catch(() => Swal.fire({
        icon: 'error',
        title: '操作过程出现异常...',
    }));

}


/**
 * 获取爬塔需要的次数
 * @param pfnCount
 */
export function getFightCount(pfnCount) {
    Swal.fire({
        title: '请输入爬塔次数',
        text: '爬塔将使用防守阵容进行战斗',
        input: 'number',
        inputValue: localStorage.fightTowerCount,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            if (!v || isNaN(v)) {
                Log.warn('不是合法的数字！');
                return false;
            }
            localStorage.fightTowerCount = v;
            return parseInt(v);
        }
    }).then(v => pfnCount && v.value && pfnCount(v.value));
}


/**
 * @return {Promise<{count: number, countries: string[]} | undefined>}
 */
export async function tidyHeroEx() {


    const v = await Swal.fire({
        title: '英雄升星',
        html: `
 <hr />
 <b>分解通用碎片</b>

<div class="tidy-range">
<span>分解</span>
<button id="decrement1">-</button>
<input id="tidyRange1" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment1">+</button>
<input id="tidyCount1" type="number" min="0" max="1000" value="0" step="1" class="import-text">次4星英雄
</div>

<div class="tidy-range">
<span>分解</span>
<button id="decrement2">-</button>
<input id="tidyRange2" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment2">+</button>
<input id="tidyCount2" type="number" min="0" max="1000" value="0" step="1" class="import-text">次3星英雄
</div>


<div class="tidy-range">
<span>分解</span>
<button id="decrement3">-</button>
<input id="tidyRange3" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment3">+</button>
<input id="tidyCount3" type="number" min="0" max="1000" value="0" step="1" class="import-text">次1,2星英雄
</div>

<ul style="text-align: left">
  <li>碎片会先合成为英雄然后分解为紫魂绿魂。</li>
  <li>1,2星英雄不限定通用碎片。</li>
  <li>达到次数或者没有材料后停止（以下相同）。</li>
  <li>注意留够包裹空间（以下相同）。</li>
</ul>

 <hr />
 <b>紫色4星升5星</b>
<div  class="tidy-country">
  <label><input type="checkbox" value="0">魏</label>
  <label><input type="checkbox" value="1">蜀</label>
  <label><input type="checkbox" value="2">吴</label>
  <label><input type="checkbox" value="3">群</label>
</div>

<div class="tidy-range">
<span>升级</span>
<button id="decrement4">-</button>
<input id="tidyRange4" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment4">+</button>
<input id="tidyCount4" type="number" min="0" max="1000" value="0" step="1" class="import-text">次英雄
</div>
<ul style="text-align: left">
  <li>合成后的英雄会自动分解为碎片。</li>
</ul>
 
 
 <hr />
 <b>升级13星垫子</b>
<div  class="tidy-country">
  <label><input type="checkbox" value="0">魏</label>
  <label><input type="checkbox" value="1">蜀</label>
  <label><input type="checkbox" value="2">吴</label>
  <label><input type="checkbox" value="3">群</label>
</div>

<div class="tidy-range">
<span>升级</span>
<button id="decrement5">-</button>
<input id="tidyRange5" type="range" min="0" max="8" value="0" step="1" style="flex: 1">
<button id="increment5">+</button>
<input id="tidyCount5" class="import-text" min="0" max="8" value="0" step="1" />个13星垫子
</div>

<ul style="text-align: left">
  <li>仅使用英雄碎片，不会动用背包英雄。</li>
  <li><b>只使用不能将星</b>且确定国家的英雄碎片。</li>
</ul>
`,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        didOpen(popup) {
            for (let i = 1; i < 6; i++) {
                const incButton = document.getElementById('increment' + i);
                const decButton = document.getElementById('decrement' + i);
                const countNode = document.getElementById('tidyCount' + i);
                const rangeNode = document.getElementById("tidyRange" + i);
                rangeNode.oninput = function () {
                    countNode.value = this.value;
                };
                countNode.oninput = function () {
                    if (this.value === '') {
                        rangeNode.value = 0;
                        return;
                    }
                    const min = parseInt(this.min);
                    const max = parseInt(this.max);
                    let value = parseInt(this.value);
                    if (isNaN(value) || value < min) {
                        value = min;
                    }
                    if (value > max) {
                        value = max;
                    }
                    this.value = value;
                    rangeNode.value = this.value;
                };
                incButton.addEventListener('click', () => {
                    let value = parseInt(rangeNode.value) + parseInt(rangeNode.step);
                    if (value > parseInt(rangeNode.max)) {
                        value = rangeNode.max;
                    }
                    rangeNode.value = value;
                    countNode.value = value;
                });
                decButton.addEventListener('click', () => {
                    let value = parseInt(rangeNode.value) - parseInt(rangeNode.step);
                    if (value < parseInt(rangeNode.min)) {
                        value = rangeNode.min;
                    }
                    rangeNode.value = value;
                    countNode.value = value;
                });
            }
        },
        preConfirm: v => {
            const param = {
                decompose4: parseInt(document.getElementById('tidyCount1').value),
                decompose3: parseInt(document.getElementById('tidyCount2').value),
                decompose2: parseInt(document.getElementById('tidyCount3').value),
                up: parseInt(document.getElementById('tidyCount4').value),
                count: parseInt(document.getElementById('tidyCount5').value),
                countryUp: [],
                countryCompose: [],
                countries: [],
            };
            const vec = Array.from(document.querySelectorAll('.tidy-country input'));
            const t = {
                '0': 'wei',
                '1': 'shu',
                '2': 'wu',
                '3': 'qun',
            }
            vec.forEach((v, k) => k < 4 ? v.checked && param.countryUp.push(t[k]) : v.checked && param.countryCompose.push(t[k - 4]));
            return param;
        }
    });
    if (!v.isConfirmed) {
        await Promise.reject('用户取消了选择');
        return;
    }
    return v.value;
}

export async function exchange() {

    // 选择国家
    let ret = await Swal.fire({
        title: '请选择需要置换的国家',
        input: 'select',
        inputOptions: {
            wei: '魏国',
            shu: "蜀国",
            wu: "吴国",
            qun: "群雄",
        },
        inputPlaceholder: '选择国家',
        showConfirmButton: true,
        confirmButtonText: '下一步',
        showCancelButton: true,
        cancelButtonText: '取消',
        inputValidator: (value) => {
            return new Promise((resolve) => {
                if (value) {
                    resolve();
                } else {
                    resolve('你需要先选择一个国家');
                }
            })
        }
    });
    if (!ret.isConfirmed) {
        await Promise.reject('用户取消');
        return;
    }
    const country = ret.value;

    // 选择武将
    let html = `<div  class="select-hero">`
    orangeHero.filter(v => v.camp === country).forEach(v => html += `<label><input type="checkbox" value="${v.id}">${v.name}</label>`);
    html += `</div>`
    ret = await Swal.fire({
        title: '请勾选武将',
        footer: '红将和勾选的武将将会在置换时被保留且不参与置换，已升级的英雄不会参与置换',
        html,
        showConfirmButton: true,
        confirmButtonText: '下一步',
        showCancelButton: true,
        cancelButtonText: '取消',
        didOpen(popup) {
            console.log('当前pop的网页内容：', popup);
        },
        preConfirm: (value) => {
            const checkboxes = document.querySelectorAll('.select-hero input[type=checkbox]');
            const heroes = [];
            checkboxes.forEach(v => v.checked && heroes.push(v.value));

            console.log('选中的英雄', heroes)
            if (heroes.length <= 0) {
                Swal.showValidationMessage('至少需要选择一个武将');
                return false;
            }
            return heroes;
        }
    });
    if (!ret.isConfirmed) {
        await Promise.reject('用户取消');
        return;
    }
    const heroes = ret.value;

    // 选择次数
    ret = await Swal.fire({
        title: '请选择需要置换的次数',
        input: 'number',
        inputValue: 1,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            const value = parseInt(v);
            if (v.isNaN || v <= 0) {
                Swal.showValidationMessage('请输入合法的数字');
                return false;
            }
            return value;
        }
    });
    if (!ret.isConfirmed) {
        await Promise.reject('用户取消');
        return;
    }
    const count = ret.value;

    return {country, heroes, count}
}


export async function getArenaCount() {
    const v = await Swal.fire({
        title: '请输入比武次数',
        text: '本功能仅仅为了避免长时间无聊的刷比武，建议尽量手动进行。为避免激化玩家矛盾，战斗对手是机器人。为避免辅助影响到手动玩家的乐趣，也为避免辅助影响游戏平衡，周日不能使用本功能。',
        input: 'number',
        inputValue: localStorage.arenaCount,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            if (!v || isNaN(v)) {
                Log.warn('不是合法的数字！');
                return false;
            }
            localStorage.arenaCount = v;
            return parseInt(v);
        }
    });
    return v?.value ?? 0;
}


/**
 * 获取需要查看第几封邮件战报
 * @param pfnIndex
 */
export function getMailIndex(pfnIndex) {
    Swal.fire({
        title: '需要查看第几封属臣战报',
        text: '请输入战报序号',
        input: 'number',
        inputValue: 1,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            if (!v || isNaN(v)) {
                Log.warn('不是合法的数字！');
                return false;
            }
            return parseInt(v);
        }
    }).then(v => v.value && pfnIndex(v.value));
}


/**
 * 选择需要登录的账号
 * @param {Array.<Object>} vec   -- 用户信息列表
 * @param {number} curUserIndex   -- 当前选中的用户索引
 * @param {function(Array.<Object>, number)} pfnUserSelChange -- 新的列表和用户选中的项
 */
export function getSelUser(vec, curUserIndex, pfnUserSelChange) {

    // 保证当前选中项是合法的
    if (!curUserIndex || curUserIndex > vec.length) {
        curUserIndex = 0;
    }

    // 创建需要弹出的东西
    let innerHTML = `<div class="pop-user" style="min-height: 200px">`;
    vec.forEach((v, k) => innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center">
                <div style="flex: 1; padding: 10px; margin: 5px; background: ${curUserIndex === k ? 'rgba(0, 255, 0, 0.3)' : 'rgba(200, 200, 200, 0.3)'} ; cursor: pointer" onclick="onSelUser(this)">${v.platform} ${v.roleId} ${v.serverId ? v.serverId : ''} ${v.name ? v.name : ''} </div>
                <div style="color: cornflowerblue; cursor: pointer" onclick="onDelUser(this)">删除</div>
            </div>
    `);
    innerHTML += `</div>`;

    // 创建需要返回的数组
    let vecRet = [].concat(vec);

    // 弹出对话框
    let dlg = Swal.fire({
        title: '请选择用户',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
    }).then((result) => {
        result.value && pfnUserSelChange(vecRet, curUserIndex);
    });

    // 更新选中项的颜色
    let updateSel = homeNode => {
        for (let i = 0; i < homeNode.children.length; i++) {
            homeNode.children[i].firstElementChild.style.background = curUserIndex === i ? 'rgba(0, 255, 0, 0.3)' : 'rgba(200, 200, 200, 0.3)';
        }
    };

    // 获取当前项的索引值
    let getItemIndex = e => {
        let pNode = e.parentNode;
        let ppNode = pNode.parentNode;
        for (let i = 0; i < ppNode.children.length; i++) {
            if (ppNode.children[i] === pNode) {
                return i;
            }
        }
    };

    // 选中用户
    window.onSelUser = (e) => {
        curUserIndex = getItemIndex(e);
        updateSel(e.parentNode.parentNode);
    };

    // 删除用户
    window.onDelUser = (e) => {

        // 获取索引值
        let index = getItemIndex(e);

        // 删除数据
        vecRet.splice(index, 1);
        if (index <= curUserIndex && curUserIndex > 0) {
            curUserIndex--;
        }
        if (curUserIndex >= vecRet.length) {
            curUserIndex = vecRet.length - 1;
        }

        // 删除UI上的数据
        let homeNode = e.parentNode.parentNode;
        homeNode.removeChild(e.parentNode);
        updateSel(homeNode);
    }

}

/**
 * 获取剿匪配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getJiaofeiParam(platform, roleId) {
    let paramKey = 'jiaofei_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            fei1: true,
            fei2: true,
            fei3: true,
            feiLevel: 1000,
            friendFeiLevel: 1000,
            maxStrength: 10000,
        };
    }
    return param;
}

/**
 * 获取Boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getBossParam(platform, roleId) {
    let paramKey = 'boss_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            strength: 100,
        };
    }
    return param;
}


/**
 * 获取攻城配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */

/**
 * 获取军团boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getLegionBossParam(platform, roleId) {
    let paramKey = 'legionBoss_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            count: 2,
        };
    }
    return param;
}

/**
 * 获取试炼奖励参数
 */
export function getTowerRewardParam(platform, roleId) {
    let paramKey = 'towerReward_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            hours: 4,
        };
    }
    return param;
}

/**
 * 获取珍宝阁配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getShopParam(platform, roleId) {
    let paramKey = 'shop_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            vec: [],
            freeRefresh: false,
            moneyRefresh: false,
            raffle: false,
        };
    }
    return param;
}

/**
 * 获取扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getSweepParam(platform, roleId) {
    let paramKey = 'sweep_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            maxGold: 0,
        };
    }
    return param;
}

/**
 * 获取名将扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @returns {*}
 */
export function getOnSweepParam(platform, roleId) {
    let paramKey = 'onSweep_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            maxGold: 0,
        };
    }
    return param;
}

/**
 * 设置剿匪配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setJiaofeiParam(platform, roleId, param) {
    let paramKey = 'jiaofei_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 设置Boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setBossParam(platform, roleId, param) {
    let paramKey = 'boss_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 设置珍宝阁配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setShopParam(platform, roleId, param) {
    let paramKey = 'shop_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 设置扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setSweepParam(platform, roleId, param) {
    let paramKey = 'sweep_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 设置名将扫荡配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setOnSweepParam(platform, roleId, param) {
    let paramKey = 'onSweep_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 设置剿匪配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */

/**
 * 设置军团Boss配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setLegionBossParam(platform, roleId, param) {
    let paramKey = 'legionBoss_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 设置试炼塔奖励信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 */
export function setTowerRewardParam(platform, roleId, param) {
    let paramKey = 'towerReward_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}

/**
 * 配置剿匪参数
 * @param {string} platform
 * @param {number} roleId
 * @param {boolean} isVip
 * @param {function} pfnOK
 */
export function jiaofeiConfig(platform, roleId, isVip, pfnOK) {

    // 取出上次保存的配置信息
    let param = getJiaofeiParam(platform, roleId);

    // 是否允许编辑
    let enableEdit = isVip;

    // 创建需要弹出的东西
    let innerHTML = `
<div style="text-align: left">
    <div>
        <label>
            <input id="fei1" type="checkbox" ${param.fei1 ? 'checked' : ''} ${enableEdit}><span>黄巾兵</span>
        </label>
        <label>
            <input id="fei2" type="checkbox" ${param.fei2 ? 'checked' : ''} ${enableEdit}><span>山贼</span>
        </label>
        <label>
            <input id="fei3" type="checkbox" ${param.fei3 ? 'checked' : ''} ${enableEdit}><span>流寇</span>
        </label>
    </div>
    <div><label>
        达到 <input class="swal2-input" id="feiLevel" type="number" placeholder="匪徒等级" value="${param.feiLevel}"> 级的陌生人家盗匪
    </label></div>
    <div><label>
        达到 <input class="swal2-input" id="friendFeiLevel" type="number" placeholder="匪徒等级" value="${param.friendFeiLevel}"> 级的好友家盗匪
    </label></div>
    <div><label>
        超过 <input class="swal2-input" id="maxStrength" type="number" placeholder="体力" value="${param.maxStrength}"> 的体力会用于剿匪
    </label></div>
    <div>剿匪1小时检查一次。</div>
</div>
`;
    // 弹出对话框
    Swal.fire({
        title: '请设置剿匪条件',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
            let param = {};
            param.fei1 = document.getElementById('fei1').checked;
            param.fei2 = document.getElementById('fei2').checked;
            param.fei3 = document.getElementById('fei3').checked;
            param.feiLevel = parseInt(document.getElementById('feiLevel').value);
            param.friendFeiLevel = parseInt(document.getElementById('friendFeiLevel').value);
            param.maxStrength = parseInt(document.getElementById('maxStrength').value);
            if (param.feiLevel <= 0 || param.friendFeiLevel <= 0 || param.maxStrength < 10 || param.maxStrength >= 10000) {
                Swal.showValidationMessage(`请检查输入的参数是否合法！`);
                return false;
            }
            if (!param.fei1 && !param.fei2 && !param.fei3) {
                Log.warn('--剿匪设置：由于没有选择任何一个剿匪项，下次启动时自动剿匪将停止！');
            }
            setJiaofeiParam(platform, roleId, param);
            pfnOK && pfnOK();
            return true;
        }
    });
}

/**
 * 配置剿匪参数
 * @param {string} platform
 * @param {number} roleId
 */
export async function bossConfig(platform, roleId) {

    // 取出上次保存的配置信息
    const param = getBossParam(platform, roleId);

    // 弹出对话框
    const res = await Swal.fire({
        title: '请设置打Boss时保留的体力',
        input: 'number',
        inputValue: param.strength,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        inputAttributes: {
            min: 0,
            max: 1000,
            step: 10,
        },
        inputValidator: (value) => {
            if (!value) {
                return '请输入一个数值';
            }
            if (value < 0 || value > 1000) {
                return '数值必须在0和1000之间';
            }
            return null;
        },
        footer: '战斗使用城门左侧阵容，即大矿阵容。超出设置的体力，才会被用于打自家门前boss，请合理设置这个值，记住得低于剿匪的保留体力设置。否则的话，剿匪把体力用到低于这个值了，就没体力打boss了。',
    });
    if (!res.isConfirmed) {
        return;
    }
    setBossParam(platform, roleId, {strength: res.value})
}


/**
 * 攻城掠地参数设置
 * @param {string} platform
 * @param {number} roleId
 * @param {function} pfnOK
 */

/**
 * 军团Boss参数
 * @param {string} platform
 * @param {number} roleId
 * @param {function} pfnOK
 */
export function legionBossConfig(platform, roleId, pfnOK) {

    // 取出上次保存的配置信息
    let param = getLegionBossParam(platform, roleId);

    Swal.fire({
        title: '军团远征挑战BOSS次数',
        text: '注意：超过两次将花费元宝',
        input: 'number',
        inputAttributes: {
            min: 1,
            max: 4,
        },
        inputValue: param.count,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            if (!v || isNaN(v) || v < 1 || v > 4) {
                Swal.showValidationMessage(`请检查输入的参数是否合法！`);
                return false;
            }
            param.count = v;
            setLegionBossParam(platform, roleId, param);
            pfnOK && pfnOK();
            return true;
        }
    });
}

/**
 * 试炼奖励参数
 * @param {string} platform
 * @param {number} roleId
 */
export async function towerRewardConfig(platform, roleId) {

    // 取出上次保存的配置信息
    const param = getTowerRewardParam(platform, roleId);
    await Swal.fire({
        title: '领取试炼奖励最大间隔时间',
        text: '注意：最小间隔1小时，奖励积累达到设定时间或奖励已满则自动收取。',
        input: 'number',
        inputAttributes: {
            min: 1,
            max: 100,
        },
        inputValue: param.hours,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            if (!v || isNaN(v)) {
                Swal.showValidationMessage(`请检查输入的参数是否合法！`);
                return false;
            }
            setTowerRewardParam(platform, roleId, {hours: parseInt(v)});
            return v;
        }
    });

}

/**
 * 珍宝阁参数
 * @param {string} platform
 * @param {number} roleId
 * @param {function} pfnOK
 */
export function shopConfig(platform, roleId, pfnOK) {

    // 取出上次保存的配置信息
    let param = getShopParam(platform, roleId);

    // 配置信息
    let items = [
        {money: 'user_yuanbao', checked: false, off: 10, name: '勘探罗盘', item: "item:60005"},
        {money: 'user_yuanbao', checked: false, off: 10, name: '指点迷津', item: "item:1037"},
        {money: 'user_yuanbao', checked: false, off: 10, name: '高级招募令', item: "item:1005"},
        {money: 'user_yuanbao', checked: false, off: 10, name: '名将令', item: "item:1013"},
        {money: 'user_yuanbao', checked: false, off: 10, name: '情报值', item: 'item:1014'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '武魂', item: 'item:1001'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '紫魂', item: 'item:1002'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '蓝田玉', item: 'item:1003'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '四星武将碎片', item: 'shard_all_none_4'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '三星武将碎片', item: 'shard_all_none_3'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '金色祈愿符', item: 'item:1011'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '比武券', item: 'item:4003'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '银色祈愿符', item: 'item:1010'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '灵玉', item: 'item:1008'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '乌金', item: 'item:1026'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '祝福宝石', item: 'item:1027'},
        {money: 'user_yuanbao', checked: false, off: 10, name: '褪魔锤', item: 'item:1034'},
        {money: 'user_chip', checked: false, off: 10, name: '武魂', item: 'item:1001'},
        {money: 'user_chip', checked: false, off: 10, name: '紫魂', item: 'item:1002'},
        {money: 'user_chip', checked: false, off: 10, name: '蓝田玉', item: 'item:1003'},
        {money: 'user_chip', checked: false, off: 10, name: '四星武将碎片', item: 'shard_all_none_4'},
        {money: 'user_chip', checked: false, off: 10, name: '三星武将碎片', item: 'shard_all_none_3'},
        {money: 'user_chip', checked: false, off: 10, name: '比武券', item: 'item:4003'},
        {money: 'user_chip', checked: false, off: 10, name: '银色祈愿符', item: 'item:1010'},
    ];

    // 使用当前用户配置，对当前内容进行更新
    items.forEach(v => {
        let node = param.vec.find(vv => v.money === vv.money && v.item === vv.item);
        if (node) {
            v.off = node.off;
            v.checked = node.checked;
        }
    });

    // 配置信息
    let itemString = ``;
    items.forEach(v => {
        itemString += `<div><label class="buy-item shop-config-item"><input type="checkbox" ${v.checked ? 'checked' : ''}> 使用<b>${v.money === 'user_yuanbao' ? '元宝' : '铜钱'}</b>购买<input class="off" type="number" value="${v.off}">折或更加优惠的<b>${v.name}</b></label></div>`
    });

    // 创建需要弹出的东西
    let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left; font-size: 17px">
    <div>购买珍宝阁物品，会导致元宝或银两减少，请谨慎设置。</div>
    <div style="display: flex; flex-direction: column; max-height: 300px; overflow-y: auto">
    ${itemString}
    </div>
    <label><input type="checkbox" id="freeRefresh" ${param.freeRefresh ? 'checked' : ''}> 所有符合条件的物品购买完成后，自动免费刷新。</label>
    <label><input type="checkbox" id="moneyRefresh" ${param.moneyRefresh ? 'checked' : ''}> 所有符合条件的物品购买完成后，自动免费和元宝刷新。</label>
    <label><input type="checkbox" id="raffle" ${param.raffle ? 'checked' : ''}> 自动刷新购买福星阁高抽。</label>
    <div>注意：拖动右侧滚动条可以看到更多勾选项。</div>
</div>
`;


    // 弹出对话框
    Swal.fire({
        title: '请设置需要购买的内容',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
            let param = {
                vec: [],
                freeRefresh: false,
                moneyRefresh: false,
                raffle: false,
            };
            let vec = document.querySelectorAll('.shop-config-item');
            vec.forEach((v, k) => {
                let node = {
                    money: items[k].money,
                    item: items[k].item,
                };
                let vec1 = v.querySelectorAll('input');
                node.checked = vec1[0].checked;
                node.off = parseInt(vec1[1].value);
                param.vec.push(node);
            });
            param.moneyRefresh = document.getElementById('moneyRefresh').checked;
            param.freeRefresh = document.getElementById('freeRefresh').checked;
            param.raffle = document.getElementById('raffle').checked;

            console.log('当前用户参数：', param);
            for (let i = 0; i < param.vec.length; i++) {
                if (param.vec[i].off <= 0 || param.vec[i].off > 10) {
                    Swal.showValidationMessage(`折扣值只允许在1~10之间，请检查输入是否合法！`);
                    return false;
                }
            }
            setShopParam(platform, roleId, param);
            pfnOK && pfnOK();
            return true;
        }
    });

}

/**
 * 扫荡参数
 * @param {string} platform
 * @param {number} roleId
 * @param {function} pfnOK
 */
export function sweepConfig(platform, roleId, pfnOK) {

    // 取出上次保存的配置信息
    let param = getSweepParam(platform, roleId);

    // 用户配置
    Swal.fire({
        title: '请选择试炼扫荡元宝上限',
        text: '使用的元宝超出设置后不会扫荡',
        input: 'select',
        inputValue: param.maxGold,
        inputOptions: {
            '0': '仅仅使用免费扫荡',
            '50': '50元宝以内扫荡',
            '100': '100元宝以内扫荡',
            '150': '150元宝以内扫荡',
        },
        inputPlaceholder: '选择扫荡规模',
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            console.log('当前选择：', v);
            if (!v || isNaN(v)) {
                Swal.showValidationMessage(`不是合法的选择！`);
                return false;
            }
            setSweepParam(platform, roleId, {maxGold: parseInt(v)});
            return parseInt(v);
        }
    }).then(v => v.value && pfnOK(v.value));

}

/**
 * 名将之路扫荡参数
 * @param {string} platform
 * @param {number} roleId
 * @param {function} pfnOK
 */
export function onSweepConfig(platform, roleId, pfnOK) {

    // 取出上次保存的配置信息
    let param = getOnSweepParam(platform, roleId);

    // 用户配置
    Swal.fire({
        title: '名将之路元宝买次数设置',
        text: '次数购买的单价超出设置后停止购买',
        input: 'select',
        inputValue: param.maxGold,
        inputOptions: {
            '0': '不购买扫荡次数',
            '200': '购买200元宝以内的次数',
            '400': '购买400元宝以内的次数',
            '600': '购买600元宝以内的次数',
        },
        inputPlaceholder: '选择购买次数',
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: (v) => {
            console.log('当前选择：', v);
            if (!v || isNaN(v)) {
                Swal.showValidationMessage(`不是合法的选择！`);
                return false;
            }
            setOnSweepParam(platform, roleId, {maxGold: parseInt(v)});
            return parseInt(v);
        }
    }).then(v => v.value && pfnOK(v.value));

}

/**
 * 获取采矿配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {boolean} isVip
 * @returns {*}
 */
export function getChestParam(platform, roleId, isVip) {
    let paramKey = 'chest_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = {
            findInFriend: false,
            findInRank: false,
            findInSub: false,
        };
    }
    return param;
}

/**
 * 设置采矿配置信息
 * @param {string} platform
 * @param {number} roleId
 * @param {Object} param
 * @returns {*}
 */
export function setChestParam(platform, roleId, param) {
    let paramKey = 'chest_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(param);
}


/**
 * 采矿设置
 * @param {string} platform
 * @param {number} roleId 角色Id
 * @param {boolean} isVip 是否vip
 * @param {function({findInFriend: boolean, findInRank: boolean, findInFriendSub: boolean, findInRankSub: boolean, updateNow: boolean})} pfnOK
 */
export function chestConfig(platform, roleId, isVip, pfnOK) {

    // 取出上次保存的配置信息
    let paramKey = 'chest_' + platform + roleId;
    let param = getChestParam(platform, roleId, isVip);

    // 创建需要弹出的东西
    let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left">
    <div style="display: flex; flex-direction: column">
        <label>
            <input id="findInFriend" type="checkbox" ${param.findInFriend ? 'checked' : ''}><span>在好友家中找矿</span>
        </label>
        <label>
            <input id="findInRank" type="checkbox" ${param.findInRank ? 'checked' : ''}><span>在试炼排行榜用户家中找矿</span>
        </label>
        <label>
            <input id="findInSub" type="checkbox" ${param.findInSub ? 'checked' : ''}><span>在用户库中找矿</span>
        </label>   
    </div>
    <div style="padding: 8px 0">注意：选择<b style="color: yellowgreen">在用户库中找矿</b>时，需要先建立用户（矿号）库，建立方法请点击主界面<b style="color: yellowgreen">矿号</b>按钮。</div>
</div>
`;

    // 弹出对话框
    Swal.fire({
        title: '采矿设置',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
            let param = {};
            param.findInFriend = document.getElementById('findInFriend').checked;
            param.findInRank = document.getElementById('findInRank').checked;
            param.findInSub = document.getElementById('findInSub').checked;
            localStorage[paramKey] = JSON.stringify(param);
            pfnOK && pfnOK(param);
            return true;
        }
    });
}

/**
 * 矿号设置
 * @param platform
 * @param roleId
 * @param isWorking
 * @param pfnOK
 */
export function subsConfig(platform, roleId, isWorking, pfnOK) {

    // 获取矿号数量
    let count = getSubs(platform, roleId).length;

    // 创建需要弹出的东西
    let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left">
    <div style="display: flex; flex-direction: column">
        <label>
            <input id="findInFriend" type="checkbox"><span>获取好友并遍历其子属臣</span>
        </label>
        <label>
            <input id="findInRank" type="checkbox"><span>获取排行榜用户并遍历其子属臣</span>
        </label>
        <label>
            <input id="findInLord" type="checkbox"><span>将用户的主公也加入到用户库</span>
        </label>
    </div>
    <div style="padding: 8px 0">注意：<br>1.主界面点击<b style="color: yellowgreen">开始</b>之后，才可以更新用户库。<br>2.更新用户库不会<b style="color: yellowgreen">删除</b>已有用户，只会<b style="color: yellowgreen">追加</b>或<b style="color: yellowgreen">更新</b>数据。<br>3.当前用户库中已经有<b style="color: yellowgreen">${count}</b>个用户。<br>4.更新用户库时间比较长，但并不需要经常进行。</div>
</div>
`;

    // 弹出对话框
    Swal.fire({
        title: '更新用户库（矿号）',
        html: innerHTML,
        showConfirmButton: isWorking,
        confirmButtonText: '立即更新',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
            let param = {};
            param.findInFriend = document.getElementById('findInFriend').checked;
            param.findInRank = document.getElementById('findInRank').checked;
            param.findInLord = document.getElementById('findInLord').checked;
            if (!param.findInFriend && !param.findInRank) {
                Swal.showValidationMessage(`您没有勾选必选项（前两项至少选中一个）。`);
                return false;
            }
            pfnOK && pfnOK(param);
            return true;
        }
    });
}


/**
 * 检查某个功能是否需要自动启动
 * @param {string} platform
 * @param {number} roleId
 * @param {string} funcName
 */
export function isFuncStarted(platform, roleId, funcName) {
    let param = getStartParam(platform, roleId);
    return !!param.find(v => v === funcName);
}

/**
 * 获取当前的启动配置参数
 * @param platform
 * @param roleId
 * @returns {*}
 */
export function getStartParam(platform, roleId) {
    let paramKey = 'start_' + platform + roleId;
    let param = localStorage[paramKey];
    if (param) {
        param = JSON.parse(param);
    } else {
        param = [];
    }
    return param;
}

/**
 * 设置当前的启动配置参数
 * @param platform
 * @param roleId
 * @param vecFuncName
 */
export function setStartParam(platform, roleId, vecFuncName) {
    let paramKey = 'start_' + platform + roleId;
    localStorage[paramKey] = JSON.stringify(vecFuncName);
}


/**
 * 采矿设置
 * @param {Array.<{name:string, desc:string, descEx?:string}>} vecFunc 参与选择的功能列表
 * @param {string} platform
 * @param {number} roleId 角色Id
 * @param {function(Array.<string>)} pfnOK
 */
export function startConfig(vecFunc, platform, roleId, pfnOK) {

    // 取出上次保存的配置信息
    let param = getStartParam(platform, roleId);

    // 准备配置项
    let items = '';
    vecFunc.forEach(item => {
        items += `<label>`;
        items += `<input class="option" type="checkbox" onclick="onChangeOption()" name="${item.name}" ${param.find(v => v === item.name) ? 'checked' : ''}><span style="opacity: 0.8">${item.desc}</span>`;
        item.descEx && (items += `<br><span style="font-size: 14px; color: yellowgreen; padding-left: 20px">${item.descEx}</span>`);
        items += `</label>`;
    });

    // 创建需要弹出的东西
    let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left; font-size: 17px">
    <label><input id="checkAll" onchange="onChangeCheckAll(this)" type="checkbox">全部（点击此处全选或全部不选）</label>
    <div style="display: flex; flex-direction: column; max-height: 300px; overflow-y: auto">
    ${items}
    </div>
    <div>注意：有部分功能是无需设置，直接默认运行的。设置修改后将在下次“开始”时生效。</div>
</div>
`;

    // 用户点击了全选按钮，需要根据当前选中状态，修改下面所有的选项的状态
    window.onChangeCheckAll = function (e) {
        e.style.opacity = '1';
        document.querySelectorAll('.option').forEach(v => {
            v.checked = e.checked;
        });
    };

    // 用户点击了某个按钮，需要根据当前所有按钮的选中状态，修改全选按钮的状态
    window.onChangeOption = function () {
        let isSomeItemCheck = false;    // 是否有被选中的项
        let isSomeItemNoCheck = false;  // 是否有没有被选中的项
        document.querySelectorAll('.option').forEach(v => v.checked ? (isSomeItemCheck = true) : (isSomeItemNoCheck = true));
        let item = document.getElementById('checkAll');
        item.checked = isSomeItemCheck;
        if (isSomeItemCheck && isSomeItemNoCheck) {
            item.style.opacity = '0.5';
        } else {
            item.style.opacity = '1';
        }
    };

    // 弹出对话框
    Swal.fire({
        title: '选择本次启动的功能',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        onOpen: () => onChangeOption(),
        preConfirm: () => {
            let param = [];
            document.querySelectorAll('.option').forEach(v => v.checked && param.push(v.name));
            console.log('选中的内容有：', param);
            setStartParam(platform, roleId, param);
            pfnOK && pfnOK(param);
            return true;
        }
    });
}

/**
 * 显示帮助信息
 */
export function showHelp() {
    let innerHTML = `
<div style="text-align: left; font-size: 13px; line-height: 20px; height: 400px; overflow-y: auto">
<h2 id="1">1. 侦测账号总是不能成功</h2>
<p>一些如游戏窗口找不到或者软件权限不够这种比较简单的问题，此处就不说了，下面说一下两种比较隐蔽的问题。</p>
<ul>
<li>问题情形之一： 没找对游戏进程导致无法侦测成功。<ul>
<li>原因：这种情况，最近才比较频繁的在微信用户中出现，原因是微信近期对小游戏的进程调度模式进行了变更。以前每个微信小游戏是一个独立进程，而现在，不同的微信小程序，可能会公用部分进程，一个微信小程序也可能用多个进程。这种情况，就会导致有时候小乔没能找到正确的游戏进程。</li>
<li>解决方法：安装老版本的微信是一个解决方法，但这是一个很多人不能接受的馊主意，暂且忽略。推荐的解决方法是使用江东小乔3.9版本。3.9版本是我为了解决这个问题而新开发的一个版本，它是能保证不会找错进程的。</li></ul></li>
<li>问题情形之二：小乔没能在游戏进程中侦测到需要的内容导致无法侦测成功。<ul>
<li>原因：小乔启动的必要数据，有部分只存在于游戏和服务器成功建立连接之后的一段时间内（这个时间和电脑配置有关）。如果错过了，就不可能再侦测到了。比如提示你侦测不到关键信息的时候，就不要再尝试重新侦测了，你尝试一万次也没用。</li>
<li>解决方法：从上面的原因就可以得知，触发游戏重连是能让游戏进程中重新出现这些数据的有效手段。触发游戏重连的手段有很多，下面我按照推荐程度由低到高说一下。<ul>
<li>方法1：重启游戏，肯定会触发重连。但重新加载整个游戏，有时候还是挺慢的。</li>
<li>方法2：微信区可以用手机顶号，比如你电脑登录了游戏，你手机再登一次，电脑上会提示你在别处登录了，你确定并重连，自然会触发重连。这个手段，仅对微信区有效，并且需要手机电脑配合操作，还是略显繁琐。</li>
<li>方法3：你在小乔上点一下开始，游戏中如果弹出了错误提示，你点一下确定，这个时候自然也就触发了重连。这是最方便的方法，也是推荐的方法。唯一的缺点就是需要你曾经成功侦测过一次，因为只有这样，你才能在小乔点开始。</li></ul></li></ul></li>
</ul>
<h2 id="2">2. 刚刚侦测的账号，一点开始就立即失效</h2>
<p>一般来说，建议“触发重连”重新侦测一次，如果连续3次都这样。那么请继续向下看。</p>
<ul>
<li>问题情形之一：你当前侦测的那个账号，不是你点开始的那个账号。这种情况，眼神好使一点就能自己解决。</li>
<li>问题情形之二：侦测到的数据确实是有问题的。<ul>
<li>原因：有些电脑的微信，登录了很长时间一直没有退出过。因为微信的小游戏进程调度模式的变化，再加上微信有时候有一些bug，这样导致游戏进程会一直常驻在系统中，即便游戏关闭了，游戏进程中依旧会残留一些之前的数据。如果小乔侦测到了这些数据，就会发生这种情况。</li>
<li>解决方法：解决问题的思路，就是让那些残留的进程消失掉，然后重新打开游戏。下面是几种常见方法：<ul>
<li>方法1：重启一下电脑，当然可以保证万无一失。</li>
<li>方法2：如果不想重启电脑的话，重启一下微信，也可以保证万无一失。</li>
<li>方法3：如果微信也不想重启的话，那么在进程管理器中确保杀光所有的"WeChatAppEx.exe"进程也可以。</li></ul></li></ul></li>
</ul>
</div>
    `;

    Swal.fire({
        title: '常见问题',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        width: 700,
    }).then(() => 0);
}

/**
 * 显示VIP说明
 */
export function showVipDesc() {

    // 创建需要弹出的东西
    let innerHTML = `
<div style="text-align: left; font-size: 17px; height: 340px;  overflow-y: auto">
    <ul>
        <li> 云功能初衷
            <ol>
              <li>目前辅助需要一直在电脑上开着</li>
              <li>有用户表示无法保证电脑一直开着</li>
              <li>有用户抱怨电脑一直开着费电</li>
              <li>有用户觉得电脑夜晚开着噪声太大，影响休息</li>
              <li>有用户认为电脑一直开会导致电脑寿命降低</li>
              <li>除了电脑寿命方面，以上内容我觉得都有道理</li>
            </ol>    
        </li>
        <li> 云功能可以做到的
            <ol>
              <li>在启动云端工作之后，电脑可以关闭</li>
              <li>使用手机或电脑，查询及控制云端状态</li>
            </ol>    
        </li>
        <li> <span style="color: #080">暂时</span>云功能做不到的
            <ol>
              <li>云功能无法和本地功能同时运行</li>
              <li>云端日志将不能如本地那样完整和实时</li>
              <li>对电脑端功能不熟悉的用户不建议使用云功能</li>
            </ol>    
        </li>
        <li> 云功能会员说明
            <ol>
              <li>必须注册为云功能会员才能使用云功能</li>
              <li>可以使用专门的注册码成为云功能会员</li>
              <li>注册码在公众号上限量免费获取</li>
              <li>限量的原因将在最下面说明</li>
            </ol>    
        </li>
        <li> 开始云端工作的方法
            <ol>
              <li>上传登录信息以及配置等信息</li>
              <li>登录信息如果失效，那么将需要重新上传</li>
              <li>点击<span style="color: #080">云开始</span>即可</li>
              <li><span style="color: #080">配置和属臣</span>等信息并不需要每次上传</li>
            </ol>    
        </li>       
        <li> 停止云端工作的方法
            <ol>
              <li>本地辅助开始工作时，云端会自动停止</li>
              <li>手动登录游戏时，云端也会自动停止</li>
            </ol>    
        </li>
        <li> 手机端操作的方法
            <ol>
              <li>复制网页端地址发到手机上</li>
              <li>在手机上用网页端查看或控制开始</li>
              <li>该地址切勿告诉别人</li>
            </ol>    
        </li>
        <li> 云功能的顾虑
            <ol>
              <li>不知道会否受到不可抗力的阻止</li>
              <li>如果所有人都能用云，我们扛不住这个成本</li>
              <li>因此注册码虽然免费但限量供应</li>
            </ol>    
        </li>
    </ul>
</div>
    `;

    Swal.fire({
        title: '云功能说明',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
    });
}

/**
 * 显示购买说明
 */
export function showBuyDesc() {
    let innerHTML = `请前往微信公众号<span style="font-weight: bold" class="cr2">江东小乔</span>进行购买。`;
    Swal.fire('注册码购买', innerHTML, 'info');
}

/**
 * 使用注册码对话框
 */
export function showUseSn(platform, roleId) {

    // 弹出注册码输入对话框
    Swal.fire({
        title: '使用注册码',
        text: '注册码已经不再提供获取方式，本页面仅供用于之前尚未的注册码',
        input: 'text',
        inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off',
        },
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        showLoaderOnConfirm: true,
        preConfirm: (v) => {
            if (!v || !v.length) {
                Swal.showValidationMessage("注册码不能为空");
                return false;
            }
            return new Promise((ok, err) => {
                useSn({sn: v, platform: platform, roleId: roleId + ''}, ret => {
                    ok(ret);
                }, errMsg => {
                    err(errMsg);
                });
            }).then(ret => {
                if (ret.ErrMsg) {
                    Swal.showValidationMessage(ret.ErrMsg);
                    return;
                }
                return ret;
            }).catch(error => {
                Swal.showValidationMessage(`请求出错: ${error}`)
            });
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then(ret => {
        if (!ret.value) {
            return;
        }
        Swal.fire('注册码使用成功', `当前有效期至： ${ret.value.VipTime}`, 'success');
    });
}

/**
 * 弹出公众号提示
 */
export function showWxmp() {
    Swal.fire({
        background: '#fff url(http://server-9.example.invalid/ax/img/wxmp.jpg)',
        padding: '213px 600px 0 0',
        showConfirmButton: false,
    });
}

/**
 * 弹出上传信息参数选择对话框
 */
export function uploadInfo(user) {

    // 创建需要弹出的东西
    let innerHTML = `
<div style="text-align: left">
    <div style="display: flex; flex-direction: column">
        <label>
            <input id="u-info" type="checkbox"><span>当前用户的登录信息（该项仅云用户需要勾选）</span>
        </label>
        <label>
            <input id="config-info" type="checkbox"><span>当前用户的配置信息（包括功能项以及各种详细设置）</span>
        </label>
        <label>
            <input id="sub-info" type="checkbox"><span>当前用户的用户库（矿号）</span>
        </label>
    </div>
    <div>
    注意：如果当前并非云用户，即便上传了用户登录信息，也不会有任何作用。<br>
    注意：数据上传时，如云端已有该项数据将被覆盖。
    </div>
</div>
`;

    // 弹出对话框
    Swal.fire({
        title: '上传信息到江东',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        showLoaderOnConfirm: true,
        preConfirm: () => {
            let param = {};
            param.userInfo = document.getElementById('u-info').checked;
            param.config = document.getElementById('config-info').checked;
            param.sub = document.getElementById('sub-info').checked;
            if (param.userInfo <= 0 && param.config <= 0 && param.sub <= 0) {
                Swal.showValidationMessage(`您没有勾选任何需要上传的内容！`);
                return false;
            }
            let sendParam = {
                platform: user.platform,
                roleId: user.roleId + '',
                userInfo: '',
                configInfo: '',
                subInfo: ''
            };
            if (param.userInfo) {
                sendParam.userInfo = JSON.stringify(user);
            }
            if (param.config) {
                let configInfo = getConfigInfo(user.platform, user.roleId);
                sendParam.configInfo = JSON.stringify(configInfo);
            }
            if (param.sub) {
                sendParam.subInfo = JSON.stringify(getSubs(user.platform, user.roleId));
            }
            return new Promise((ok, err) => {
                zUploadInfo(sendParam, (ret) => {
                    if (ret.ErrMsg) {
                        Log.err("---数据上传到江东云失败：", ret.ErrMsg);
                        err(ret.ErrMsg);
                        return;
                    }
                    Log.info("---数据已经被成功上传到江东云！");
                    ok();
                }, () => err("上传数据到江东云失败！"));
            }).then(() => Swal.fire(
                '江东云',
                '数据已经成功被上传到江东云。',
                'success'
            )).catch(errMsg => Swal.fire(
                '江东云',
                errMsg,
                'error'
            ));
        }
    });
}

/**
 * 弹出下载信息参数选择对话框
 */
export function downloadInfo(pfnOK) {

    // 创建需要弹出的东西
    let innerHTML = `
<div style="text-align: left">
    <div style="display: flex; flex-direction: column">
        <label>
            <input id="config-info" type="checkbox"><span>当前用户的配置信息（包括功能项以及各种详细设置）</span>
        </label>
        <label>
            <input id="sub-info" type="checkbox"><span>当前用户的用户库（矿号）</span>
        </label>
    </div>
    <div>说明：本功能主要为了方便那些经常换电脑的用户。<br>注意：下载的内容，是最近一次上传的内容。</div>
</div>
`;

    // 弹出对话框
    Swal.fire({
        title: '从江东云下载信息',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        preConfirm: () => {
            let param = {};
            param.config = !!document.getElementById('config-info').checked;
            param.sub = !!document.getElementById('sub-info').checked;
            if (param.config <= 0 && param.sub <= 0) {
                Swal.showValidationMessage(`您没有勾选任何需要下载的内容！`);
                return false;
            }
            return param;
        }
    }).then(result => result.value && pfnOK && pfnOK(result.value));

}

/**
 * 弹出开始工作对话框
 * @param {string} platform
 * @param {string} roleId
 */
export function startWorkDlg(platform, roleId) {

    // 创建需要弹出的东西
    let innerHTML = `
<div style="text-align: left">
    <ul>
        <li>点击开始之后，云端工作将在一分钟之内开始</li>
        <li>云端开始后本地将会被踢下线</li>
        <li>如需停止云端，在本地开始或手动进入游戏即可</li>
    </ul>
</div>
`;

    // 弹出对话框
    Swal.fire({
        title: '开始云端工作',
        html: innerHTML,
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        showLoaderOnConfirm: true,
        preConfirm(inputValue) {
            console.log('开始：', inputValue);
            if (!inputValue) {
                return;
            }
            return new Promise((ok, err) => {
                startWork({platform: platform, roleId: roleId},
                    retString => ok(retString),
                    errString => err(errString));
            }).catch(errString => {
                Swal.fire('江东云', errString, 'error');
            });
        }
    }).then(ret => {
        Swal.fire('江东云', ret.value, ret.value.indexOf('成功开始') >= 0 ? 'success' : 'warning');
    });
}

/**
 * 查看云端状态
 * @param platform
 * @param roleId
 */
export function showWorkState(platform, roleId) {
    workState({platform: platform, roleId: roleId},
        ret => {
            if (ret.ErrMsg) {
                Swal.fire(ret.ErrMsg);
                return;
            }
            if (ret.UserInfoErr === 'SYS_LOGOUT_OTHER_LOGIN') {
                ret.UserInfoErr = '账号在其它地方登录'
            }
            Swal.fire({
                title: '云状态',
                html: `
<div class="cloud_state"> <div>当前状态</div> <div>${ret.State === 0 ? '停止: ' + ret.UserInfoErr : '工作中'}</div></div>
<div class="cloud_state"> <div>用户登录信息</div> <div>${ret.IsUserInfoOK ? '已经上传' : '尚未上传'}</div></div>
<div class="cloud_state"> <div>配置信息</div> <div>${ret.IsConfigOK ? '已经上传' : '尚未上传'}</div></div>
<div class="cloud_state"> <div>属臣库</div> <div>${ret.IsSubOK ? '已经上传' : '尚未上传'}</div></div>
<div class="cloud_state"> <div>登录信息上传时间</div> <div>${ret.UserInfoTime}</div></div>
<div class="cloud_state"> <div>云端最近更新时间</div> <div>${ret.WorkTime}</div></div>
<div class="cloud_state"> <div>账号状态</div> <div>${ret.VipState}</div></div>
`,
                showConfirmButton: false,
            });
            ret.Logs && Log.info('---云端最近日志：<br><br>' + ret.Logs);
        },
        errString => Swal.fire(errString));
}

/**
 * 查看网页端
 * @param platform
 * @param roleId
 */
export function showCloudManage(platform, roleId) {

    let url = `http://server-7.example.invalid/?p=${encodeURIComponent(platform)}&r=${roleId}&k=${genKey(platform, roleId)}`;
    Swal.fire({
        title: '网页端',
        html: `
<div>您可以在浏览器中打开下方地址对云账号进行简单管理。下面的地址是本账号的唯一管理地址（切勿透露给别人）。</div>
<div style="text-align: left; word-break: break-all; color: #0078e7">${url}<div>
`,
        showConfirmButton: true,
        confirmButtonText: '复制地址',
    }).then(result => {
        if (!result.value) {
            return;
        }
        copyText(url);
        Swal.fire('链接地址已经复制到剪切板！');
    });
}


let statusItem = document.getElementById("status");

/**
 * 更新状态栏
 */
export function updateStatus() {

    // 如果当前没有进入工作状态，那么不显示任何内容
    if (!window.work) {
        statusItem.innerHTML = '';
        return;
    }
    let user = getCurUser();
    if (!user) {
        return;
    }

    // 如果当前已经进入工作状态，那么显示该用户的账号信息
    let roleId = work.userInfo.roleId;
    let platform = work.userInfo.platform;
    let innerHTML = `ID：<span class="cr1">${platform} ${roleId}</span>`;
    if (user) {
        user.serverId && (innerHTML += ` 区服：<span class="cr1">${user.serverId}</span>`);
        user.name && (innerHTML += ` 昵称：<span class="cr1">${user.name}</span>`);
    }

    // 如果当前vip信息已经获取，那么显示vip信息
    if (work.vip && work.vip.isReady()) {
        if (!hideVip) {
            // innerHTML += ` 类型：<span class="${work.vip.isVip() ? 'cr2' : 'cr1'}">${work.vip.isVip() ? 'VIP用户' : '免费用户'}</span>`;
            // work.vip.isVip() && (innerHTML += ` VIP到期时间：<span class="cr1">${work.vip.VipTime}</span>`);
        }
        innerHTML += `<br>今日已爬塔次数：<span class="cr1">${work.vip.TowerCount + work.vip.newTowerCount}</span>`;
        !work.vip.isVip() && (innerHTML += ` 剩余可爬塔次数：<span class="cr1">${work.vip.maxTowerCount - work.vip.TowerCount - work.vip.newTowerCount}</span>`);
        innerHTML += ` 今日已占矿次数：<span class="cr1">${work.vip.ChestCount}</span>`;
        !work.vip.isVip() && (innerHTML += ` 剩余可占矿次数：<span class="cr1">${work.vip.maxChessCount - work.vip.ChestCount}</span>`);
    }

    statusItem.innerHTML = innerHTML;
}

/**
 * 更新用户信息显示栏
 */
export function updateUserInfo(index = -1) {

    // 获取需要更新的控件
    let btChange = document.getElementById('btChange');
    let divUserInfo = document.getElementById('user-info');

    // 没有账号被侦测的情况下，不能切换用户
    if (!window.vecUser) {
        window.vecUser = [];
    }
    if (!window.vecUser.length) {
        btChange.disabled = true;
        divUserInfo.innerHTML = `当前没有任何被侦测到的用户`;
        window.curUserIndex = -1;
        return;
    }
    btChange.disabled = false;

    // 读取上次保存的用户索引值
    if (index < 0) {
        index = parseInt(localStorage.curUserIndex);
        if (isNaN(index)) {
            index = 0;
        }
    }

    // 如果索引超出范围，那么默认为第一个
    if (index >= window.vecUser.length) {
        index = 0;
    }
    let v = window.vecUser[index];
    divUserInfo.innerHTML = `${v.platform} ${v.roleId} ${v.serverId ? v.serverId + '区' : ''} ${v.name ? v.name : ''}`;

    // 保存当前索引值
    localStorage.curUserIndex = index;
    window.curUserIndex = index;


}

/**
 * 获取当前选中的用户
 */
export function getCurUser() {

    // 没有用户直接返回
    if (!window.vecUser || !window.vecUser.length) {
        Log.err('--目前没有用户被侦测到，请先侦测...');
        return;
    }

    // 如果索引值不合法，那么首先更新一下用户信息
    if (window.curUserIndex < 0 || window.curUserIndex >= window.vecUser) {
        updateUserInfo();
    }

    // 返回当前用户
    return window.vecUser[window.curUserIndex];
}

/**
 * 获取用户属臣库
 * @param platform
 * @param roleId
 */
export function getSubs(platform, roleId) {
    let subString = localStorage[`SubUser_${platform}_${roleId}`];
    if (!subString) {
        return [];
    }
    return JSON.parse(subString);
}

/**
 * 更新用户属臣库
 * @param platform
 * @param roleId
 * @param vec
 */
export function setSubs(platform, roleId, vec) {
    localStorage[`SubUser_${platform}_${roleId}`] = JSON.stringify(vec);
}

/**
 * 更新用户属臣库
 * @param platform
 * @param roleId
 * @param vec
 */
export function updateSubs(platform, roleId, vec) {
    let lastVec = getSubs(platform, roleId);
    let updateCount = 0, addCount = 0;
    vec.forEach(v => {
        let user = lastVec.find(vv => vv.u === v.u);
        if (!user) {
            lastVec.push(v);
            addCount++;
        } else {
            user.l = v.l;
            updateCount++;
        }
    });
    lastVec.sort((a, b) => a.l - b.l);
    Log.warn(`----本次用户库更新，共计更新用户${updateCount}个，增加用户${addCount}个，目前用户库有${lastVec.length}个用户。`);
    localStorage[`SubUser_${platform}_${roleId}`] = JSON.stringify(lastVec);
}

/**
 * 初始化广告模块
 */
export function initAd() {
    /**
     * 显示指定索引的广告
     * @param index
     */
    window.showAd = index => {
        console.log('显示广告信息', vecAd[index]);
        let node = vecAd[index];
        let html = `
<div style="">
    <div style="border-bottom: 1px solid #e8eaec; font-size: 20px; font-weight: bold; padding-bottom: 5px">${node.title}</div>
    <div style="text-align: left; font-size: 15px; color: #515a6e; padding: 5px 0">${node.desc}</div>
`;
        if (node.img) {
            html += `<div style="width: 100%; padding-bottom: 33%; background: url(${node.img}) center center no-repeat; background-size: contain"></div>`;
        }
        html += '</div>';
        Swal.fire({
            html: html,
            showConfirmButton: false,
        }).then(() => {
            localStorage[node.id] = 'read';
            updateAd(vecAd);
        });
    };

    /**
     * 更新广告模块
     */
    window.updateAd = () => {
        // 找到对应的广告位
        let ad = document.getElementById('ad');
        if (!ad) {
            return;
        }
        let html = '';

        // 从本地存储更新广告的已读标记
        let isAllRead = true;
        vecAd.forEach(v => {
            v.isRead = !!localStorage[v.id];
            !v.isRead && (isAllRead = false)
        });

        // 添加标题内容
        html += `<div class=""><div class="ad-button">没有广告了${!isAllRead ? '<span class="red-point"></span>' : ''}</div></div>`;

        // 添加菜单部分
        html += `<div class="ad-menu">`;
        vecAd.forEach((v, index) => {
            html += `<div class="menu-item" onclick="showAd(${index})"><div>${v.title}${!v.isRead ? '<span class="red-point"></span>' : ''}</div></div>`;
        });
        html += `</div>`;

        // 更新广告部分
        ad.innerHTML = html;
    };

    // 更新广告模块
    updateAd();
}

/**
 * 检查当前用户是否在有效期
 */
export function checkUserValid(authorCode) {
    const info = JSON.parse(window.atob(authorCode));
    const utime = new Date(info.utime);
    console.log('解析出来的信息：', info, utime);
    if (utime.getTime() + 86400 * 1000 * 7 < new Date().getTime()) {
        Log.err("当前账号被侦测的时间距离现在太久了，请重新侦测后再试！");
        return false;
    }
    return true;
}

/**
 * 显示用户云信息下载对话框
 */
export async function showUserDownload() {
    const res = await Swal.fire({
        title: '云侦测',
        text: '鉴于微信的升级导致电脑端的侦测效率下降，手机端目前的侦测效率更高。本功能用于将手机侦测到的用户信息，同步到江东小乔的电脑端。在下方输入云链接地址，然后点击“确定”即可将云端的侦测信息，下载到本地。',
        input: 'text',
        inputValue: localStorage.getItem("lastUrl") ?? "",
        showConfirmButton: true,
        confirmButtonText: '确定',
        showCancelButton: true,
        cancelButtonText: '取消',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        preConfirm: (v) => {

            // 保存用户输入
            localStorage.setItem('lastUrl', v);

            // 提取用户的platform和uid，并进行校验
            const m = /http:\/\/server-7.example.invalid\/\?p=([^&]*)&r=([^&]*)&k=([^&]*)/.exec(v);
            if (!m) {
                Swal.showValidationMessage('请输入合法的云链接！');
                return false;
            }

            // 提取用户的platform和uid
            const p = m[1], r = m[2], k = m[3];
            if (k !== genKey(p, r)) {
                Swal.showValidationMessage('请输入合法的云链接！！！');
                return false;
            }
            return {p, r};
        }
    });
    if (!res.isConfirmed) {
        return;
    }

    const userInfo = await zDownloadUserInfo({platform: res.value.p, roleId: res.value.r});
    if (userInfo.ErrMsg) {
        Log.err("获取云侦测信息失败：", userInfo.ErrMsg);
        return;
    }
    console.log('服务器反馈结果：', userInfo);
    addUser(JSON.parse(userInfo.UserInfo));
}
