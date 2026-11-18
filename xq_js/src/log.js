let isAutoScroll = true;
let logDiv, allLogs = {};

export class Log {

    // 设置自动滚动
    static setAutoScroll(isAuto) {
        isAutoScroll = isAuto;
    }

    // 普通日志
    static log() {
        let txt = '';
        Array.prototype.slice.call(arguments).forEach(function (item) {
            txt += item + ' ';
        });
        this.logEx(0, txt);
    }

    // 提示信息
    static info() {
        let txt = '';
        Array.prototype.slice.call(arguments).forEach(function (item) {
            txt += item + ' ';
        });
        this.logEx(1, txt);
    }

    // 警告信息
    static warn() {
        let txt = '';
        Array.prototype.slice.call(arguments).forEach(function (item) {
            txt += item + ' ';
        });
        this.logEx(2, txt);
    }

    // 错误信息
    static err() {
        let txt = '';
        Array.prototype.slice.call(arguments).forEach(function (item) {
            txt += item + ' ';
        });
        this.logEx(3, txt);
    }

    // 清除日志
    static clear() {
        if (!logDiv) {
            return;
        }
        logDiv.innerHTML = '';
    }

    /**
     * 日志添加函数
     * @param {number} level 0~3
     * @param {string} txt
     * @param {string} userRoleInfo 用户角色信息
     */
    static logEx(level, txt, userRoleInfo = '') {

        // 初始化logDiv，初始化不成功说明是node环境，直接输出日志即可
        if (!logDiv && typeof document === 'object') {
            logDiv = document.getElementById('log');
        }
        if (!logDiv) {

            // 输出屏幕日志
            console.log(level, userRoleInfo, txt);

            // 记入日志缓存
            Log.addBuff(userRoleInfo, txt);

            return;
        }

        // 如果记录条数超过100，自动删除20%
        const maxCount = 1000;
        if (logDiv.childNodes.length >= maxCount) {
            for (let i = 0; i < maxCount / 5; i++) {
                logDiv.removeChild(logDiv.childNodes[0]);
            }
        }

        // 添加新的记录
        let node = document.createElement('div');
        node.setAttribute('class', 'log');
        switch (level) {
            case 1:
                node.innerHTML = '<div class="log1">' + new Date().Format('dd日 hh:mm:ss') + '</div><div class="log2 cr1">' + txt + '</div>';
                break;
            case 2:
                node.innerHTML = '<div class="log1">' + new Date().Format('dd日 hh:mm:ss') + '</div><div class="log2 cr2">' + txt + '</div>';
                break;
            case 3:
                node.innerHTML = '<div class="log1">' + new Date().Format('dd日 hh:mm:ss') + '</div><div class="log2 cr3">' + txt + '</div>';
                break;
            default:
                node.innerHTML = '<div class="log1">' + new Date().Format('dd日 hh:mm:ss') + '</div><div class="log2 cr0">' + txt + '</div>';
        }
        logDiv.appendChild(node);

        // 滚动以便新记录可见
        isAutoScroll && document.getElementById('bottom').scrollIntoView();
    }

    /**
     * 添加日志缓存
     * @param userRoleInfo
     * @param txt
     */
    static addBuff(userRoleInfo, txt) {
        let vec = allLogs[userRoleInfo];
        if (!vec) {
            vec = [];
            allLogs[userRoleInfo] = vec;
        }
        if (vec.length >= 5) {
            vec.shift();
        }
        vec.push(new Date().Format('dd日 hh:mm:ss ') + txt);
    }

    /**
     * 获取日志缓存
     * @param userRoleInfo
     * @return {string}
     */
    static getBuff(userRoleInfo) {
        let vec = allLogs[userRoleInfo];
        if (!vec) {
            return '';
        }
        allLogs[userRoleInfo] = [];
        let ret = '';
        vec.forEach(v => ret += v + '<br>');
        return ret;
    }
}
