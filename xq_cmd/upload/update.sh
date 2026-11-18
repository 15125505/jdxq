#!/bin/bash

uploadFile="tmpAndroid"       # 刚刚上传的临时文件名称
distVer="ver.json"              # 版本文件
distFolder="remote"             # 实际工作文件夹名称
timeFileName="uploadTime"       # 用于记录文件上传时间的文件名称

# 将上传的文件改名为当前时间
saveNewFile()
{
    echo '---将刚刚上传的文件改名'

    if [ ! -f "$uploadFile" ]; then
        echo '    当前没有新上传的文件！'
        return 1
    fi

    fileTime=$(date "+%Y-%m-%d %H:%M:%S")
    fileName="xq_and"$(date "+%Y_%m_%d-%H_%M_%S")
    mv $uploadFile $fileName
    return 0
}

# 更新配置文件
updateVersion() 
{
    echo '---更新配置文件'
    echo '{"v":"'$fileTime'","f":"'$fileName'"}' > $distVer
    return 0
}

# 逐个执行所有操作
work() {
    saveNewFile
    if [ $? -ne 0 ]; then
        echo '    saveNewFile操作失败！'
        return
    fi

    updateVersion
    if [ $? -ne 0 ]; then
        echo '    updateVersion操作失败！'
        return
    fi

    echo  '---所有操作成功完成！'
}

work


