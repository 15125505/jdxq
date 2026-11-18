import './style.css';
import {Log} from "./log";
import {gDataProcess} from "./dataProcess";

window.log = t => Log.log(t);
window.info = t => Log.info(t);
window.warn = t => Log.warn(t);
window.err = t => Log.err(t);
window.clear = () => Log.clear();
window.appVersion = verName => Log.warn("当前app版本：", verName);
window.usage = () => {
    Log.log(`使用说明：
    1. 首次使用需要<a href="#" onclick="caUsage()">配置证书</a>。
    2. 点击顶部<b>启动侦测</b>按钮，进入侦测状态。
    3. 然后打开游戏即可，侦测成功后，app上会有成功提醒，并收到推送通知，<a href="#" onclick="usage2()">收不到通知看这儿</a>。
注意：
    1. 某些平台侦测时会遇到游戏进不去但侦测能成功，侦测成功后停止侦测即可正常游戏。
    2. 微信用户，建议使用<a href="#" onclick="openUrl('https://server-8.example.invalid/3kingdoms/huaxiayjl.apk')">胡莱三国微信端App</a>打开游戏，qq浏览器目前会有概率自动跳转到微信（因此不再推荐）。
    3. QQ用户，建议直接在QQ中打开游戏。
    4. 微信端的胡莱App等平台可以直接侦测，但抖音用户、腾讯动漫等平台用户，需要<a href="#" onclick="usage1()">额外的侦测方法</a>。
    5. <a href="#" onclick="usage3()">交流和反馈。</a>`);
};
window.usage1 = () => Log.log(`附加侦测说明：
    1. 抖音、腾讯动漫等软件，之所以不能直接侦测，是因为它们自身的设计导致配置的证书对它们无效。
    2. 在伏羲x这种带Xposed的环境中，安装JustTrustMe这种工具后，在其中运行抖音等软件的游戏，就能成功侦测（教程以后提供）。
    3. 目前测试过的所有不能直接侦测的App，都能使用这种方式完成侦测。`);
window.usage2 = () => Log.log(`推送通知说明：
    1. 如果没有点击同意发送通知，那肯定收不到通知。
    2. 对于有些手机，比如小米，它可能会自动将通知归于不重要通知里面。
    3. 即便是允许通知了，如果没有悬浮通知权限，依然无法弹出侦测成功的通知。
    4. 因此如果收不到通知，请仔细检查自己手机上对本app的通知设置。`);
window.usage3 = () => Log.log(`交流平台：
    官方公众号：江东彩云。
    QQ群1：已移除
    QQ群2：已移除
    QQ群3：已移除
    QQ群4：已移除
    QQ群5：已移除
    QQ群6：已移除`);
window.dataIn = (url: string, recv: string, send: string, ua: string) => gDataProcess.dataIn(url, recv, send, ua);
window.test = () => {
    fetch('https://server-6.example.invalid/', {
        cache: 'no-cache'
    }).then(response => {
        if (response.ok) {
            Log.info("恭喜，验证通过，您已经成功配置过证书！");
        } else {
            Log.err("校验证书失败！")
        }
    }).catch(error => {
        Log.err("校验证书失败，请检查证书是否已经成功配置！");
    });
}
window.openUrl = url => Android.openUrl(url);
window.caUsage = () => {
    Log.log(`证书配置说明：
    1. 每个手机只需要配置一次证书。
    2. <a href="#" onclick="test()">点击检查证书是否配置成功</a>。
    3. 以前使用代理方式侦测时配置过证书的手机无需再次配置。
    4. <a href="#" onclick="openUrl('http://server-6.example.invalid/ca.html')">证书的安装方法可以点击此处查看</a>。`)
}


window.usage();

