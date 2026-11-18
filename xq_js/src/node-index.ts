import {formatTime, initPack} from "./pack";
import {WorkEx} from "./work/workEx";
import {getTask, taskReport, zUploadInfo} from "./utils/http";
import {Log} from "./log";

console.log(Date(), '--node进程正常启动...');

// 任务开始
start();

/**
 * 任务开始的地方
 */
function start() {

    // 初始化编解码模块
    initPack();

    // 临时的测试模块


    // 开启30个任务
    for (let i = 0; i < 40; i++) {
        setTimeout(() => workProcess(i), i * 1000);
    }
}

// 测试函数

function updateUser(vec, work) {
    const lastVec = work.configInfo.chest.vecSubs;
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
    console.log(`----本次用户库更新，共计更新用户${updateCount}个，增加用户${addCount}个，目前用户库有${lastVec.length}个用户。`);

    // 更新当前配置参数
    work.configInfo.chest.vecSubs = lastVec;

    // 上传属臣库到服务器
    zUploadInfo({
        platform: work.userInfo.platform,
        roleId: work.userInfo.roleId.toString(),
        userInfo: '',
        configInfo: '',
        subInfo: JSON.stringify(lastVec),
    }, (ret) => {
        if (ret.ErrMsg) {
            console.error("---属臣数据上传到江东云失败：", ret.ErrMsg);
            return;
        }
        console.log("---属臣数据已经被成功上传到江东云！");
    }, () => console.error("上传属臣数据到江东云失败！"));
}

/**
 * 任务过程
 */
function workProcess(id) {

    // console.log(new Date().Format('MM-dd hh:mm:ss'), "任务", id, "已经启动...");

    // 任务重试过程
    let retry = (reason) => {
        let delay = 30000;
        if (reason !== '没有符合条件的记录') {
            console.log(formatTime(new Date(), 'MM-dd hh:mm:ss'), "任务", id, "已经结束：", reason, "30秒后自动重启");
            delay += 30000;
        }
        setTimeout(() => workProcess(id), delay);
    };

    // 首先向服务器获取一个任务，如果任务获取成功，那么开始执行任务，如果获取失败，那么30秒之后，继续执行一轮
    getTask((ret) => {

        console.log(formatTime(new Date(), 'MM-dd hh:mm:ss'), "任务", id, "获得任务");

        // 如果没有获取到任务，那么直接退出
        if (ret.ErrMsg) {
            retry(ret.ErrMsg);
            return;
        }

        // 解析用户数据
        let data = {
            userInfo: undefined,
            configInfo: undefined
        };
        try {
            data.userInfo = JSON.parse(ret.UserInfo);
            data.configInfo = JSON.parse(ret.ConfigInfo);
            if (!ret.SubInfo) {
                ret.SubInfo = '[]';
            }
            data.configInfo.chest.vecSubs = JSON.parse(ret.SubInfo);
            console.log(formatTime(new Date(), 'MM-dd hh:mm:ss'), "任务", id, "用户数据解析完成：", data);
        } catch (e) {
            taskReport({ok: 0, errMsg: '解析用户数据失败，需要重新上传用户信息并确保配置信息已经上传', platform: ret.Platform, roleId: ret.RoleId, logs: ''});
            retry("解析用户数据失败");
            return;
        }

        // 启动任务
        const work = new WorkEx(
            data.userInfo,
            data.configInfo,
            vec => updateUser(vec, work),
            () => 0,
            () => 0,
            reason => setTimeout(() => {
                taskReport({ok: 0, errMsg: reason, platform: ret.Platform, roleId: ret.RoleId, logs: ''});
                retry(reason);
            }, 2000),
            () => {
                retry('意外中断需要重新启动');
            },
            () => taskReport({
                ok: 1,
                errMsg: '',
                platform: ret.Platform,
                roleId: ret.RoleId,
                logs: Log.getBuff(ret.Platform + ret.RoleId)
            })
        )
    }, (err) => retry(err));
}

// 进程真正结束的时候，输出下面的内容
process.on('exit', function (code) {
    console.log(Date(), '--node进程已经完全退出:', code);
});
