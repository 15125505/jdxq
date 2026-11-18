/**
 * 将这些函数加入的外部可以调用的函数中
 */
declare interface Window {
    log: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    err: (message: string) => void;
    clear: () => void;                                                      // 清除日志
    usage: () => void;                                                      // 显示使用说明
    usage1: () => void;                                                      // 显示使用说明
    usage2: () => void;                                                      // 显示使用说明
    usage3: () => void;                                                      // 显示使用说明
    dataIn: (url: string, recv: string, send: string, ua: string) => void;  // 输入侦测到的信息
    appVersion: (verName: string) => void;                                  // 用于让app设置但版本号
    test: () => void;               // 证书测试
    openUrl: (url: string) => void; // 打开链接
    reCheck: (id: string) => void;  // 重新检查用户信息
    caUsage: () => void;            // 证书说明
    zfTest: () => void;             // 自己的测试函数
}


declare namespace Android {

    // 打开链接
    function openUrl(url: string): void;

    // 推送通知
    function notice(title: string, msg: string): void;
}
