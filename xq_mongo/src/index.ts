import {gHttpServer} from "./core/httpServer";
import Log from "crlog";
import {Permission} from "./app/permission";

Log.showStack = true;

// 处理未捕获的异常以及未处理的promise异常，注意，这个事情非常重要，否则一些第三方库的不合理使用可能会导致服务器崩溃
process.on('uncaughtException', (err) => {
    Log.error('未曾捕获的全局异常: ', err);
});
process.on('unhandledRejection', (reason, promise) => {
    Log.error('未曾捕获的Rejection:', promise, 'reason:', reason);
});

gHttpServer.init({
    port: parseInt(process.env.PORT ?? '5000'),
    encrypt: false,          // 如果需要加密，将该项设置为true，否则可以删除该项
    allowOrigin: true,      // 如果需要跨域，将该项设置为true，否则可以删除该项
}, [new Permission()]);
