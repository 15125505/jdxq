# node云服务器初始化说明

## 1. 配置远程访问

```sh

# 腾讯服务器需要修改密码策略
sudo sed -i 's/^password.*pam_pwquality\.so.*$/password    requisite                                    pam_pwquality.so minlen=6 try_first_pass local_users_only retry=3 authtok_type= enforce_for_root ocredit=0 lcredit=0 ucredit=0 dcredit=0/' /etc/pam.d/system-auth

# 配置信息
myName=maintainer  # 用户名
myPwd="${JDXQ_SUDO_PASSWORD:?Set JDXQ_SUDO_PASSWORD}"

# 添加用户并设置密码
useradd $myName
echo "$myPwd" | passwd $myName --stdin

# 检查用户是否在sudo列表中，如果不在则添加
echo "" >>"/etc/sudoers"
echo "$myName ALL=(ALL) 	ALL" >>"/etc/sudoers"

# 修改ssh端口：将其中的#Port 22改为Port 60022
sed -i "s/\s*#\?Port\s\+22\s*/Port 60022/" /etc/ssh/sshd_config

# 禁止ssh远程登录
sed -i "s/\s*#\?PermitRootLogin\s\+yes\s*/PermitRootLogin no/" /etc/ssh/sshd_config

# 重启ssh生效
systemctl restart sshd

```


## 2. 创建nodejs环境（新版本，直接下载bin文件）

```sh
sudoPwd="${JDXQ_SUDO_PASSWORD:?Set JDXQ_SUDO_PASSWORD}"
echo "$sudoPwd" | sudo -S yum install tar vim wget crontabs -y   # 安装一些必要的工具
VERSION=v14.17.5
DISTRO=linux-x64
wget https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.xz # 下载版本
sudo mkdir -p /usr/local/lib/nodejs
sudo tar -xJvf node-$VERSION-$DISTRO.tar.xz -C /usr/local/lib/nodejs 
sudo ln -s /usr/local/lib/nodejs/node-$VERSION-$DISTRO/bin/node /usr/bin/node
sudo ln -s /usr/local/lib/nodejs/node-$VERSION-$DISTRO/bin/npm /usr/bin/npm
sudo ln -s /usr/local/lib/nodejs/node-$VERSION-$DISTRO/bin/npx /usr/bin/npx
sudo ln -s /usr/local/lib/nodejs/node-$VERSION-$DISTRO/bin/pm2 /usr/bin/pm2

# 下面可以验证一下
node -v
npm version
npx -v
```

### 3. 准备代码

* 服务器端准备好对应的目录

``` sh
sudo npm config set registry=http://registry.npm.taobao.org # 改为使用阿里云镜像
sudo npm install pm2 -g # 创建进程管理模块
mkdir ~/xq_node   # 创建这个目录
cd ~/xq_node # 进入对应目录
npm init -y # 初始化node环境
npm install ws@8.5.0 # 安装websocket模块
npm install chalk@4.1.0 # 安装日志显示模块

# 创建PM2配置文件
echo "let count = require('os').totalmem() > 1500000000 ? 20 : 10;" > createConfig.js
echo "let str = 'module.exports = {\n  apps: [\n';" >> createConfig.js
echo 'for (let i=0; i<count; i++) str += `    { name: "node${i}", script: "act.js", max_memory_restart: "90M", watch: false },\n`;' >> createConfig.js
echo "str += '  ]\n};\n';" >> createConfig.js
echo "require('fs').writeFile('work.config.js', str, ()=>0);" >> createConfig.js
node createConfig.js


# 创建工作脚本并赋予执行权限
echo '#!bin/bash' > update.sh
echo '' >> update.sh
echo 'cd /home/maintainer/xq_node' >> update.sh
echo '' >> update.sh
echo 'pm2 delete all' >> update.sh
echo 'wget http://resource.example.invalid/REDACTED -O act.js' >> update.sh
echo 'pm2 start work.config.js' >> update.sh
echo '' >> update.sh
chmod +x update.sh


```

### 4. 设置开机自动启动

``` sh
echo "[Unit]
Description=xqNode
After=network.target
[Service]
Type=forking
User=maintainer
Group=maintainer
ExecStart=/bin/bash /home/maintainer/xq_node/update.sh
ExecReload=/bin/bash /home/maintainer/xq_node/update.sh
ExecStop=pm2 delete all
PrivateTmp=true
TimeoutStartSec=600
[Install]
WantedBy=multi-user.target
" >xqNode.service
chmod 754 xqNode.service
echo "$sudoPwd" | sudo -S mv xqNode.service /lib/systemd/system/xqNode.service
echo "$sudoPwd" | sudo -S systemctl enable xqNode # 保证开机启动

```

### 5. 设置电脑凌晨自动重启并对内存进行优化

以下内容暂时忽略。

```

# 切换到root用户
su

# 保证开机启动
systemctl enable crond.service

# 立即启动这个服务
systemctl start crond.service

# 进入编辑模式添加一个系统服务
crontab -e

# 下面这条记录表示凌晨4点13分重启服务器，实际配置时尽量保证每个服务器重启时间不同，目前先设置为几号服务器就4点零几分启动吧，另外周五凌晨7点也自动重启一下服务器
13 4 * * * /sbin/reboot
13 7 * * 5 /sbin/reboot

# 改完之后重启该服务使其生效
systemctl restart crond.service

# 关闭阿里云的dnf软件自动更新服务（这个是导致服务器某些时间访问不了的罪魁祸首）
systemctl stop dnf-makecache.timer
systemctl disable dnf-makecache.timer

# 添加swap
fallocate -l 1G /swapfile   # 创建文件
chmod 600 /swapfile         # 设置权限
mkswap /swapfile            # 告知系统将该文件用于swap
swapon /swapfile            # 开始使用该swap

# 使swap永久生效（可以重启后使用free -m观察效果）
vim /etc/fstab  # 打开这个文件，文件末尾添加下面这行内容
/swapfile   swap    swap    sw  0   0


```

### 6. 实际工作

* 切换到root后可以使用`reboot`重启服务器
* centos端进入`~/xq_node`
* 启动或重启任务：`source update.sh`
* 停止任务：`pm2 delete all`
* 查看任务状态：`pm2 list`
* 查看任务日志：`pm2 logs`
