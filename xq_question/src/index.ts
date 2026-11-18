import {gHttpServer} from "./core/httpServer";
import {Question} from "./app/question";
import {rebootAll, start} from "./rebootServer";
import Log from "crlog";

// 处理未捕获的异常以及未处理的promise异常，注意，这个事情非常重要，否则一些第三方库的不合理使用可能会导致服务器崩溃
process.on('uncaughtException', (err) => {
    Log.error('未曾捕获的全局异常: ', err);
});
process.on('unhandledRejection', (reason, promise) => {
    Log.error('未曾捕获的Rejection:', promise, 'reason:', reason);
});

// 如果启动时带上参数reboot，那么重启所有服务器
const cmd = process.argv[2];
if (cmd) {
    if (cmd == 'reboot') {
        rebootAll().catch(e => console.log('重启服务器失败', e));
    } else {
        Log.warn('带上参数reboot可以重启所有服务器');
    }
} else {
    start();
    gHttpServer.init({
        port: parseInt(process.env.PORT ?? '5000'),
        // encrypt: true,          // 如果需要加密，将该项设置为true，否则可以删除该项
        allowOrigin: true,      // 如果需要跨域，将该项设置为true，否则可以删除该项
    }, [new Question()]);
}

