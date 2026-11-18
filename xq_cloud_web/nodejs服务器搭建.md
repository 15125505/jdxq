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
echo "$myName ALL=(ALL) ALL" >>"/etc/sudoers"

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
VERSION=v18.16.1
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

* 安装pm2

``` sh
sudo npm config set registry=http://registry.npm.taobao.org # 改为使用阿里云镜像
sudo npm install pm2 -g # 创建进程管理模块

```

## 3. 创建工程

### 1. 安装依赖项

```sh

# 初始化项目
npm init -y

# 安装必要的组件
npm i ts-loader typescript webpack webpack-cli webpack-merge -D

```

### 2.配置webpack打包工具

* 创建`webpack.common.js`并输入以下内容：

```js
const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    target: 'node'
};

```

* 创建`webpack.dev.js`并输入以下内容：

```js
const {merge} = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require("path");

module.exports = merge(common, {
    output: {
        filename: 'dev.js'
    },
    mode: 'development',
    devtool: 'inline-source-map',
});

```

* 创建`webpack.prod.js`并输入以下内容：

```js
const {merge} = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
});

```

* 创建`tsconfig.json`后输入如下内容：

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es5",
    "sourceMap": true
  }
}

```

### 3. 配置快捷命令

* 在`package.json`中的`script`节点中加入如下内容：

``` json
  "scripts": {
    "build": "webpack --config webpack.prod.js",
    "watch": "webpack --config webpack.prod.js --watch",
    "start": "webpack --config webpack.dev.js --watch"
  },

 ```

### 4. 创建入口源文件

* 创建文件`src/index.ts`

```ts
console.log('hahaha');
```

现在应该可以使用`npm run start`去打包测试脚本，也可以使用`npm run build`去打包正式内容了。

## 4. 项目打包发布
