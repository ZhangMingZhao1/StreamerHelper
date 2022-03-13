<p align="center">
<img src="https://s1.ax1x.com/2020/07/22/UbKCpq.png" alt="StreamerHelper" width="100px">
</p>
<h1 align="center">StreamerHelper</h1>

> 🍰 Never miss your Streamer again

[![MIT](https://img.shields.io/github/license/ZhangMingZhao1/StreamerHelper?color=red)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/npm)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/package.json)
[![nodejs version](https://img.shields.io/npm/v/node?color=23&label=node&logoColor=white)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/package.json)

## Introduction

StreamerHelper 是一个主播录制工具，可以实时录制各平台直播保存为视频文件，并向B站自动投稿已缓存的文件。目前支持的平台有虎牙、斗鱼、B站、非洲台等。

（关于版权问题，投稿的参数默认一律设置的转载，简介处默认放有直播间链接）

## 部署

### 容器部署

首先安装 Docker。

```shell
# 本文以 /home/StreamerHelper/ 文件夹为例，作为应用的根目录。

# 拉取 Docker 镜像
docker pull umuoy1/streamerhelper
# 创建挂载目录
mkdir /home/StreamerHelper && cd /home/StreamerHelper && mkdir download/
# 下载配置文件保存到本地
curl https://raw.githubusercontent.com/umuoy1/StreamerHelper/master/templates/info-example.json >> info.json
```

通过以下指令运行容器。

```shell
docker run --name sh -itd \
-v /home/StreamerHelper/info.json:/app/templates/info.json \
-v /home/StreamerHelper/download:/app/download \
--dns 114.114.114.114 \
--restart always umuoy1/streamerhelper
```

如果没有配置`access_token`，则需要扫码登录。<br />具体操作方法如下，在控制台查看容器日志打印出二维码，然后通过B站移动客户端扫码登录。

```shell
# 打印日志中的二维码
docker logs sh
```

如果控制台无法正常显示二维码。<br />登陆成功后，录制任务自动开始。

### 直接部署

#### Linux & macOS

1. 安装 Node.js，本文推荐使用 nvm 进行版本管理，安装 nvm 请参考[官方教程](https://github.com/nvm-sh/nvm#install--update-script)，本教程不再赘述。

```shell
# 通过 nvm 安装 Node.js
nvm install --lts

# 检查安装成功
node -v
npm -v
```

2. 安装 FFmpeg

```shell
# Ubuntu
sudo add-apt-repository universe
sudo apt update
sudo apt install ffmpeg

# Debian
sudo apt update
sudo apt install ffmpeg

# CentOS 7
sudo yum install epel-release
sudo yum localinstall --nogpgcheck https://download1.rpmfusion.org/free/el/rpmfusion-free-release-7.noarch.rpm
sudo yum install ffmpeg ffmpeg-devel

# CentOS 8
sudo yum-config-manager --add-repo=https://negativo17.org/repos/epel-multimedia.repo
sudo dnf install ffmpeg

# macOS
brew update
brew install ffmpeg

# 检查安装成功
ffmpeg
```

3. 安装 pm2

```shell
npm i -g pm2 --registry=https://registry.npmmirror.com
# --registry=https://registry.npmmirror.com 为 npm 官方源代理
```

4. 部署 StreamerHelper

```shell
git clone https://github.com/ZhangMingZhao1/StreamerHelper.git && cd StreamerHelper
npm i
npm run serve
```

#### Windows

1. 安装 nvm 和 Node.js，直接从官方 [Release](https://github.com/coreybutler/nvm-windows/releases) 页面下载安装包运行即可。
1. 安装 FFmpeg

从[官网](https://www.gyan.dev/ffmpeg/builds/)下载二进制文件，解压到指定位置，比如`C:\`，然后将`bin`目录添加到系统环境变量`path`中。<br />![image.png](https://cdn.nlark.com/yuque/0/2022/png/2449869/1646933147291-0c0904c6-1bad-4928-b5b4-90dd8cc2cba3.png#clientId=u99c2965e-fc8e-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=166&id=ub8668617&margin=%5Bobject%20Object%5D&name=image.png&originHeight=166&originWidth=664&originalType=binary&ratio=1&rotation=0&showTitle=false&size=14851&status=done&style=none&taskId=ueb1fb458-7d9a-4515-8918-e3ed5e16298&title=&width=664)<br />![image.png](https://cdn.nlark.com/yuque/0/2022/png/2449869/1646933184677-cf6978f1-6798-4908-9ecc-3e0ffab15e32.png#clientId=u99c2965e-fc8e-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=275&id=uc1dbe64f&margin=%5Bobject%20Object%5D&name=image.png&originHeight=275&originWidth=573&originalType=binary&ratio=1&rotation=0&showTitle=false&size=19923&status=done&style=none&taskId=ue7820758-f308-43ce-93e5-6a4a6141a58&title=&width=573)

3. 安装 pm2

```shell
npm i -g pm2 --registry=https://registry.npmmirror.com
# --registry=https://registry.npmmirror.com 为 npm 官方源代理
```

4. 部署 StreamerHelper

```shell
git clone https://github.com/ZhangMingZhao1/StreamerHelper.git && cd StreamerHelper
npm i
npm run serve
```

### 修改配置

#### 配置说明

目前不支持配置的热更新，更新配置后需要重启使配置生效。<br />配置项的说明如下，加粗表示必填字段: <br />_字段名(默认值): 字段说明_

- **StreamerHelper**:
  - debug(false): 调试开关。
  - recycleCheckTime(300): 投稿检测间隔，单位秒。
  - roomCheckTime(600): 录制检测间隔，单位秒。
  - videoPartLimitSize(100): 投稿时忽略小于此大小的文件。
  - logLevel("error"): 此级别之上（包括）的日志将被推送，可选"TRACE"|"DEBUG"|"INFO"|"WARN"|"ERROR"。
  - **push**:
    - mail:
      - enable(true): 是否开启，开启时，以下字段均为必填。
      - host: STMP 服务主机。
      - port(465): STMP 服务端口。
      - from: STMP 服务邮箱，同时作为发送者邮箱。
      - pwd: STMP 服务密码。
      - to: 接受者邮箱。
      - secure(true): 是否开启安全服务
    - wechat:
      - enable: 是否开启，开启时，以下字段均为必填，该功能通过 [Server 酱](https://sct.ftqq.com/)实现。
      - sendKey: Server 酱 sendKey
- **personInfo**: 以下字段均为自动生成，如果选择 access_token 登录，需要手动填写 access_token。
  - nickname
  - access_token
  - refresh_token
  - expires_in
  - tokenSignDate
  - mid
- **streamerInfo**: 一个数组，描述录制信息。
  - **name**: 主播名。
  - uploadLocalFile(true): 是否投稿。
  - deleteLocalFile(true): 是否删除本地视频文件。
  - delayTime(2): 投稿成功后延迟删除本地文件的时间(需要 deleteLocalFile 为 true)，单位天。
  - templateTitle({{name}} {{time}} 录播): 稿件标题，支持占位符 `{{name}} {{time}}`。
  - desc(Powered By StreamerHelper. [https://github.com/ZhangMingZhao1/StreamerHelper](https://github.com/ZhangMingZhao1/StreamerHelper)): 稿件描述。
  - source({{name}} 直播间: {{roomUrl}}): 稿件直播源(需要copyright为2)。
  - dynamic({{name}} 直播间: {{roomUrl}}): 稿件动态。
  - copyright(2): 稿件来源，1 为自制 2 为转载。
  - **roomUrl**: 直播间地址。
  - **tid**: 稿件分区，详见[tid表](https://github.com/FortuneDayssss/BilibiliUploader/wiki/Bilibili%E5%88%86%E5%8C%BA%E5%88%97%E8%A1%A8)
  - **tags**: 稿件标签，至少一个，总数量不能超过12个，并且单个不能超过20个字，否则稿件投稿失败

#### 例子

```json
{
  "StreamerHelper": {
    "debug": false,
    "roomCheckTime": 600,
    "recycleCheckTime": 1800,
    "videoPartLimitSize": 100
      "logLevel": "error",
    "push": {
      "mail": {
        "enable": true,
        "host": "smtp.qq.com",
        "port": 465,
        "from": "***@qq.com",
        "pwd": "***",
        "to": "***@gmail.com",
        "secure": true
      },
      "wechat": {
        "enable": true,
        "sendKey": "***"
      }
    }
  },
  "personInfo": {
    "nickname": "",
    "access_token": "",
    "refresh_token": "",
    "expires_in": 0,
    "tokenSignDate": 0,
    "mid": 0
  },
  "streamerInfo": [
    {
      "name": "主播1",
      "uploadLocalFile": true,
      "deleteLocalFile": true,
      "templateTitle": "{{name}}{{time}} 直播",
      "delayTime": 0,
      "desc": "",
      "source": "",
      "dynamic": "",
      "copyright": 2,
      "roomUrl": "https://live.xxx.com/111",
      "tid": 121,
      "tags": [
        "tag1",
        "tag2",
        "tag3"
      ]
    },
    {
      "name": "主播2",
      "uploadLocalFile": true,
      "deleteLocalFile": false,
      "templateTitle": "{{name}}{{time}} 直播",
      "delayTime": 1,
      "desc": "",
      "source": "",
      "dynamic": "",
      "copyright": 2,
      "roomUrl": "https://live.xxx.com/222",
      "tid": 171,
      "tags": [
        "tag1",
        "tag2",
        "tag3"
      ]
    }
  ]
}
```




## Environment

我们的测试机器配置以及环境如下：
|cpu|mem|bps|OS|Node.js|
|-|-|-|-|-|
|Intel i5-4590 @ 3.30GHz|2GB|100m|Ubuntu 18.04|12.18.3|

可以同时下载4个主播，不会产生卡顿。


## Contributor
<a class="mr-2" data-hovercard-type="user" data-hovercard-url="/users/ZhangMingZhao1/hovercard" data-octo-click="hovercard-link-click" data-octo-dimensions="link_type:self" href="https://github.com/ZhangMingZhao1">
          <img class="d-block avatar-user" src="https://avatars3.githubusercontent.com/u/29058747?s=64&amp;v=4" width="50" height="50" alt="@ZhangMingZhao1">
</a>
<a class="mr-2" href="https://github.com/umuoy1">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/57709713?s=64&amp;v=4" width="50" height="50" alt="@umuoy1">
</a>
<a class="mr-2" href="https://github.com/ni00">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/56543214?s=64&amp;v=4" width="50" height="50" alt="@ni00">
</a>
<a class="mr-2" href="https://github.com/daofeng2015">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/14891398?s=64&v=4" width="50" height="50" alt="@daofeng2015">
</a>
<a class="mr-2" href="https://github.com/FortuneDayssss">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/12007115?s=64&v=4" width="50" height="50" alt="@FortuneDayssss">
</a>
<a class="mr-2" href="https://github.com/bulai0408">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/31983330?s=64&v=4" width="50" height="50" alt="@bulai0408">
</a>
<a class="mr-2" href="https://github.com/zsnmwy">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/35299017?s=64&v=4" width="50" height="50" alt="@zsnmwy">
</a>

<br>
<br>

Thanks：
  
<div>
<a class="mr-2" href="https://github.com/ForgQi">
          <img class="d-block avatar-user" src="https://avatars3.githubusercontent.com/u/34411314?s=64&amp;v=4" width="50" height="50" alt="@ForgQi">
</a><a class="mr-2"  href="https://github.com/FortuneDayssss">
          <img class="d-block avatar-user" src="https://avatars2.githubusercontent.com/u/12007115?s=460&u=f6e499824dbba4197ddb5b7bf113e6641e933d6b&v=4" width="50" height="50" alt="@FortuneDayssss">
</a>
</div>

## TodoList

- [x] 支持斗鱼，虎牙，b站直播，afreeca，抖音直播，快手直播，西瓜直播，花椒直播，YY 直播，战旗直播，酷狗繁星，NOW 直播，CC 直播，企鹅电竞直播
- [x] 自动监测主播在线
- [x] 自动上传b站
- [x] 多p下载多p上传
- [x] 支持多个主播
- [x] tag可配置，对应在info.json的每个主播
- [x] 支持access_token验证，防验证码
- [x] 重启后同时检测本地是否有上传失败的视频文件，并上传。
- [x] 爬虫定时区间，节省服务器流量，现支持配置房间检测间隔
- [x] 支持docker部署
- [x] 上传文件大小监测，解决主播断流问题出现很多小切片导致上传审核失败
- [x] 增加一个独立脚本遍历download文件夹下的视频文件重新上传(重启上传的折中解决办法，还有解决第一次账号密码配置错误失败上传的问题)
- [ ] 支持twitch
- [ ] 规范化log，完善debug log

## Example
<img src="https://i.loli.net/2020/11/12/MUNDe1bPR2iGfpB.jpg" alt="例子" width="500">

见：https://space.bilibili.com/3356199 或者 https://space.bilibili.com/11314291

## Tips

建议使用管口大的vps，否则上传下载速度可能会受影响。更新后请及时拉取像或git pull重新pm2 stop && npm run serve。vps比较低配的话配置的主播数量不要太多，也要注意vps的磁盘大小。日志文件会自动创建，在./logs/下。


有问题加qq群1142141023，备注streamerHelper

## 请开发者喝杯咖啡 

**您的捐赠和star是开发者持续维护的最大动力!**
<br>
<img src="https://i.loli.net/2020/11/12/gWbme18FhpSVCJy.png" width = "200"  alt="" />
<img src="https://i.loli.net/2020/11/12/l1kirIpOa2voDhM.png" width = "200"  alt=""  />
