import {Log} from "../log";
import {getTime, isTimeReady} from "../utils/tool";

export class Base {

    /**
     * 构造函数
     * @param moduleName    -- 模块名称，用于日志部分的模块前缀
     * @param config    -- 配置信息，其中的vecEnable用于判断该模块是否允许启动
     * @param userRoleInfo  -- 这是用于日志模块的
     */
    constructor(moduleName, config, userRoleInfo) {
        this.moduleName = moduleName;
        this.config = config;
        this.userRoleInfo = userRoleInfo;

        /**
         * 当前是否处于工作状态，工作状态下，会启动定时检查
         */
        this.isWorking = false;

        /**
         * 当前定时任务即将执行的时刻，如果当前时间超过了这个时刻，就会触发一轮新任务
         * @type {number}
         */
        this.time = getTime();

        /**
         * 当前是否需要立即触发一轮任务，该字段无视计数
         * @type {boolean}
         */
        this.checkNow = false;

        /**
         * 当前是否正在一轮任务执行过程中，每一轮任务完成后，需要明确标记该字段为false，否则会导致后续新一轮任务无法开始
         * @type {boolean}
         */
        this.isChecking = false;

        /**
         * 是否正在进行一次性任务
         * @type {boolean}
         */
        this.onceWorking = false;
    }

    log(...args) {
        Log.logEx(0, this.text(args), this.userRoleInfo);
    }

    info(...args) {
        Log.logEx(1, this.text(args), this.userRoleInfo);
    }

    warn(...args) {
        Log.logEx(2, this.text(args), this.userRoleInfo);
    }

    err(...args) {
        Log.logEx(3, this.text(args), this.userRoleInfo);
    }

    /**
     * @return {string}
     */
    text(args) {
        let text = '--【' + this.moduleName + '】';
        args.forEach(v => text += ' ' + v);
        return text;
    }

    /**
     * 开始定时任务
     */
    start() {
        if (this.isWorking) {
            this.err('当前已经开始了。');
            return;
        }
        this.info('开始...');
        this.isWorking = true;
        this.time = getTime();
        this.timerCheck = setInterval(this.checkTimeTask.bind(this), 1000);
    }

    /**
     * 根据设置启动任务
     * @param {string} name
     */
    startOnSet(name) {

        if (this.config.vecEnable.indexOf(name) >= 0) {
            this.start();
        } else {
            this.warn('当前已设置为不自动启动。');
        }
    }

    /**
     * 停止定时任务
     */
    stop() {
        if (!this.isWorking) {
            return;
        }
        this.info('停止...');
        this.isWorking = false;
        clearInterval(this.timerCheck);
    }

    /**
     * 立即开始一轮定时任务
     */
    startNow() {
        !this.isWorking && this.start();
        this.checkNow = true;
        this.warn('请求立即开始一轮任务...');
    }

    /**
     * 立即开始一轮定时任务
     */
    startNowOnSet(name) {
        if (this.config.vecEnable.indexOf(name) >= 0) {
            this.startNow();
        } else {
            this.warn('当前已设置为不自动进行。');
        }
    }

    /**
     * 开始一次性任务
     */
    startOnce(param) {
        if (this.onceWorking) {
            this.err('已经在工作中了！');
            return;
        }
        this.warn('开始一次性任务...');
        this.onceWorking = true;
        this.once(param);
    }

    /**
     * 定时器任务
     */
    checkTimeTask() {

        // 如果时间还没有就绪，那么直接返回
        if (!isTimeReady()) {
            return;
        }

        // isChecking表示当前是否正在执行一轮检查之中
        if (this.isChecking) {
            return;
        }

        // 等待计数器
        if (getTime() < this.time && !this.checkNow) {
            return;
        }
        this.isChecking = true;
        this.checkNow = false;
        this.warn('开始一轮任务...');
        this.workStart();
    }

    /**
     * 需要被派生类重载的工作函数，每一轮检查从这个函数开始
     */
    workStart() {
    }

    /**
     * 一次性任务
     */
    once(param) {
    }

    /**
     * 派生类需要调用此函数，来确定这一轮任务结束
     * @param {number} nextDelay 下次任务间隔时间（秒）
     */
    workFinished(nextDelay = 0) {
        if (nextDelay !== 0) {
            this.nextDelay(nextDelay);
        }
        this.isChecking = false;
        this.warn('本轮工作结束。', this.timeString(this.time - getTime()), '之后进行下一轮工作。');
    }

    onceWorkFinished() {
        this.onceWorking = false;
        this.warn('一次性任务结束。')
    }

    /**
     * 设置下次任务执行的时间
     * @param {number} sec 下次任务间隔时间（秒），本轮任务结束后，将在这个时间之后执行下一轮任务
     */
    nextDelay(sec) {
        sec < 1 && (sec = 1);
        this.time = getTime() + sec;
    }

    /**
     * 设置下次任务的时间为第二天之后若干时间
     * @param {number} sec 秒
     */
    nextDay(sec) {
        let tmNow = new Date(getTime() * 1000);
        let nextDelay = 86400 - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds() + sec;
        this.nextDelay(nextDelay);
    }

    async sleep(sec) {
        return new Promise(ok => setTimeout(() => ok(), sec * 1000));
    }

    /**
     * 将秒数显示的漂亮一点
     * @param seconds
     */
    timeString(seconds) {
        let leftTimeString = '';
        if (seconds >= 3600) {
            leftTimeString += Math.floor(seconds / 3600) + '小时';
        }
        if (seconds >= 60) {
            let tmp = Math.floor(seconds % 3600 / 60);
            if (tmp > 0) {
                leftTimeString += tmp + '分钟'
            }
        }
        (seconds % 60) && (leftTimeString += Math.floor(seconds % 60) + '秒');
        return leftTimeString;
    }
}
