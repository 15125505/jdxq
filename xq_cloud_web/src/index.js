import './style.css';
import {Log} from "./log";
import {getQueryVariable, initDate} from "./common";
import {gConfig, TestDlg} from "./config";
import {gConfigEx} from "./configEx";
import Swal from 'sweetalert2';


// 初始化日期格式化函数（这句代码必须放在日志之前）
initDate();

// 实际工作过程
function init() {
    Log.warn('★★★欢迎使用江东云管理页面★★★');
    Log.warn(`        尊敬而可爱的小乔用户们，我是江东小乔的作者，我很遗憾但不得不给大家通知一个沉痛的消息，小乔将从<b class="cr1">2027年1月2号</b>开始陆续关停所有的服务器。
        我很感谢大家对小乔的支持，就在今天，还有1个用户在续期江东云，就在最近的24个小时，还有400多个用户设备1600多个游戏账号依旧在使用江东小乔。而我已经有两年多没有对小乔进行任何维护和更新了，这一点实在是很抱歉，对不起我的支持者们。
        因为我个人的原因，我没有持续的时间和精力进行维护。其实中途有很多次，我试图重新捡起来进行游戏方面的维护，但因为退游太久，我对游戏失去熟悉感，几乎都不知道这个游戏怎么玩了，重新捡起来的成本非常高，结果没能继续下去。
        由于各个服务器的运行成本远超收入（事实上虽然有人充值，但我收入一直是0，我是收不到用户费用的），再考虑到之前买的一些核心服务器和数据库都陆续将到期，我因此不得不停用小乔的服务器。
        原本，我是想抽时间改造小乔，让小乔本身不依赖于我的服务器能继续使用，但我发现因为长时间不接触小乔的代码，我对代码也失去了熟悉感，而且要修改的内容比想象的多很多，不是修改单一软件能完成的（小乔本身有将近20个子项目），于是我只能非常尴尬的选择直接关停。
        为了尽我所能对我的支持者们进行尽可能弥补，我作出如下决定：
            1. 从2026年1月1日之后的所有充值，用户可以来找我申请退款。退款需要提供订单号（格式是这样的：450000057920261116944160xxxx），请将订单号发送到 <b class="cr1">maintainer@example.invalid</b>，我收到邮件后会在3天（如果账号太多我忙不过来的话，最迟7天）之内完成退款，退款金额将全额原路返回到付款的微信号。由于微信仅仅支持一年以内的退款，超过一年的订单请原谅我无法处理。
            2. 我会抽时间，将江东小乔的全部源码脱敏后进行开源，如果有朋友有兴趣继续维护这一套，我非常欢迎。
        我还记得疫情期间江东小乔的诞生，我记得那些游戏中的朋友和小乔带来的朋友们，那段时光给我带来过很多快乐。我看到数据库中那21万个曾经使用过小乔的用户ID，心中有感慨，我很遗憾不能让辅助永远陪伴大家，但我不会忘记这曾经的一段岁月。
        再次对曾经支持过小乔的所有用户表示最真诚的感谢！
        -- 2026年11月18日`);

    // 各种详细设置
    document.getElementById("chest-config").addEventListener('click', () => gConfig.onChestConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("jiaofei").addEventListener('click', () => gConfig.jiaofeiConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("boss").addEventListener('click', () => gConfig.bossConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("legion-boss").addEventListener('click', () => gConfig.legionBossConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("shop").addEventListener('click', () => gConfig.shopConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("sweep").addEventListener('click', () => gConfig.sweepConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("on-sweep").addEventListener('click', () => gConfig.onSweepConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("tower-reward").addEventListener('click', () => gConfig.towerRewardConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("donate").addEventListener('click', () => gConfigEx.donateConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("enlist").addEventListener('click', () => gConfigEx.enlistConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("shopEx").addEventListener('click', () => gConfigEx.shopExConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("adventure").addEventListener('click', () => gConfigEx.adventureConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("melee").addEventListener('click', () => gConfigEx.meleeConfig().catch(e => Log.err("--失败：", e)));
    document.getElementById("slg").addEventListener('click', () => gConfigEx.slgConfig().catch(e => Log.err("--失败：", e)));

    // 一次性任务
    document.getElementById("auto-tower").addEventListener('click', () => gConfig.towerFight().catch(e => Log.err("--失败：", e)));
    document.getElementById("auto-arena").addEventListener('click', () => gConfig.autoArena().catch(e => Log.err("--失败：", e)));
    document.getElementById("auto-practice").addEventListener('click', () => gConfig.autoPractice().catch(e => Log.err("--失败：", e)));
    document.getElementById("subs").addEventListener('click', () => gConfig.subs().catch(e => Log.err("--失败：", e)));
    document.getElementById("tidy-hero").addEventListener('click', () => gConfig.tidyHero().catch(e => Log.err("--失败：", e)));
    document.getElementById("exchange").addEventListener('click', () => gConfig.exchange().catch(e => Log.err("--失败：", e)));

    let param = {
        platform: decodeURIComponent(getQueryVariable('p')),
        roleId: getQueryVariable('r'),
        key: getQueryVariable('k'),
    };
    if (!param.roleId || !param.key) {
        Log.warn("--当前网页地址有误，请在江东小乔上获取正确的页面地址！");
        return;
    }
    gConfig.init(param);
    gConfigEx.init(param);

    onState();
}

// 清除日志按钮的消息响应
window.onClearLog = Log.clear;

// 用户改变勾选了日志滚动
window.onLogScroll = e => Log.setAutoScroll(e.checked);

// 开始
window.onStart = () => gConfig.start().catch(e => Log.err("--失败：", e));

// 状态
window.onState = () => gConfig.state().catch(e => Log.err("--失败：", e));

// 上传
window.onUploadSetting = () => gConfig.upload().catch(e => Log.err("--失败：", e));

// 状态
window.onDownloadSetting = () => gConfig.download().catch(e => Log.err("--失败：", e));

// 使能项设置
window.onFuncEnable = () => gConfig.onFuncEnable().catch(e => Log.err("出现错误：", e));

// 用户购买
window.onBuyCloud = () => Swal.fire({icon: 'info', titleText: '支付功能已经关闭', confirmButtonText: '知道了'});

// 实际工作过程
init();

// 测试按钮
window.onTest = () => TestDlg().then(result => console.log('反馈信息：', result)).catch(e => console.error('弹出错误信息', e));
