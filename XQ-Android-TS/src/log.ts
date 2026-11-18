
export class Log {

    static isAutoScroll: boolean = true;
    static logDiv: (HTMLElement | null);

    // 设置自动滚动
    static setAutoScroll(isAuto: boolean) {
        this.isAutoScroll = isAuto;
    }

    // 普通日志
    static log(...txt: string[]) {
        this.logEx(0, txt);
    }

    // 提示信息
    static info(...txt: string[]) {
        this.logEx(1, txt);
    }

    // 警告信息
    static warn(...txt: string[]) {
        this.logEx(2, txt);
    }

    // 错误信息
    static err(...txt: string[]) {
        this.logEx(3, txt);
    }

    // 清除日志
    static clear() {
        if (!this.logDiv) {
            return;
        }
        this.logDiv.innerHTML = '';
    }

    /**
     * 日志添加函数
     * @param {number} level 0~3
     * @param {string} txt
     */
    static logEx(level: number, txt: string[]) {

        // 初始化logDiv，初始化不成功说明是node环境，直接输出日志即可
        if (!this.logDiv && typeof document === 'object') {
            this.logDiv = document.getElementById('log');
        }
        if (!this.logDiv) {
            return
        }

        // 如果记录条数超过100，自动删除20%
        const maxCount = 1000;
        if ((this.logDiv.childNodes.length ?? 0) >= maxCount) {
            for (let i = 0; i < maxCount / 5; i++) {
                this.logDiv.removeChild(this.logDiv.childNodes[0]);
            }
        }


        // 添加新的记录
        const node = document.createElement('div');
        node.setAttribute('class', 'log');
        switch (level) {
            case 1:
                node.innerHTML = '<div class="log1">' + formatTime(new Date(), 'dd日 hh:mm:ss') + '</div><div class="log2 crBlue">' + txt.join(' ') + '</div>';
                break;
            case 2:
                node.innerHTML = '<div class="log1">' + formatTime(new Date(), 'dd日 hh:mm:ss') + '</div><div class="log2 crOrange">' + txt.join(' ') + '</div>';
                break;
            case 3:
                node.innerHTML = '<div class="log1">' + formatTime(new Date(), 'dd日 hh:mm:ss') + '</div><div class="log2 crRed">' + txt.join(' ') + '</div>';
                break;
            default:
                node.innerHTML = '<div class="log1">' + formatTime(new Date(), 'dd日 hh:mm:ss') + '</div><div class="log2 crGreen">' + txt.join(' ') + '</div>';
        }
        this.logDiv.appendChild(node);

        // 滚动以便新记录可见
        this.isAutoScroll && document.getElementById('bottom')?.scrollIntoView();
    }

}


/**
 * 时间格式化函数
 * @param {Date | number} time 需要格式的时间
 * @param {string} format 格式，如： yyyy-MM-dd h:m:s
 * @returns {string} 返回按照格式输出的结果
 */
export function formatTime(time: Date | number, format: string): string {
    if (typeof time === 'number') {
        time = new Date(time);
    }
    const date: { [key: string]: number } = {
        "y+": time.getFullYear(),
        "M+": time.getMonth() + 1,
        "d+": time.getDate(),
        "h+": time.getHours(),
        "m+": time.getMinutes(),
        "s+": time.getSeconds(),
        "q+": Math.ceil(time.getMonth() / 3),
        "S+": time.getMilliseconds()
    };
    for (let k in date) {
        format = format.replace(new RegExp(k), match => match.length == 1 ? date[k].toString() : ('00' + date[k]).slice(-match.length));
    }
    return format;
}
