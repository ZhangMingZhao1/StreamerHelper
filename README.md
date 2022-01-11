<p align="center">
<img src="https://s1.ax1x.com/2020/07/22/UbKCpq.png" alt="StreamerHelper" width="100px">
</p>
<h1 align="center">StreamerHelper</h1>

> 🍰 Never miss your Streamer again

[![MIT](https://img.shields.io/github/license/ZhangMingZhao1/StreamerHelper?color=red)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/npm)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/package.json)
[![nodejs version](https://img.shields.io/npm/v/node?color=23&label=node&logoColor=white)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/package.json)

## Introduction

StreamerHelper 部署后，会在后台批量监测各个平台主播是否在线，并实时录制直播保存为视频文件，停播后投稿到b站。

（关于版权问题，投稿的参数默认一律设置的转载，简介处默认放有直播间链接）

## Installation
### 录播配置

```shell
cp templates/info-example.json templates/info.json
```

### Docker 部署（推荐）

配置文件: `/app/templates/info.json`

视频目录: `/app/download`

容器的保活使用docker提供的`restart`参数，不再使用PM2。

DNS参数可以根据地区以及实际情况进行配置。

```shell
# 本地编译
docker build -t streamerhelper .
# /your_project_path/info.json 指你配置好的info.json文件的绝对路径，后面的同理。
docker run --name stream -itd -v /your_project_path/info.json:/app/templates/info.json -v /your_project_path/download/:/app/download --dns 114.114.114.114 --restart always streamerhelper
```

<br></br>
### 直接部署到本机环境上
#### 安装 Node.js

```shell
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs
```
#### 安装 ffmpeg

```shell
# Mac
brew update
brew install ffmpeg
```

```shell
# Linux
sudo add-apt-repository ppa:djcj/hybrid
sudo apt-get update
sudo apt-get install ffmpeg
```

#### 运行：
```shell
npm i -g pm2
# 如果装不动，添加 --registry=https://registry.npm.taobao.org 参数，npm i 同理
git clone https://github.com/ZhangMingZhao1/StreamerHelper.git && cd StreamerHelper
npm i
npm run serve
```
## Configuration
`info.json`中字段的含义
### StreamerHelper
| 字段            | 说明          | 可选值               |是否必填|默认值|
| --------------- | ----------------------- | -------------------- |---|--|
|debug|debug开关，开启后会有多余的记录|true/false|否|false|
|recycleCheckTime|检测本地文件上传以及删除的间隔||否|300(s)|
|roomCheckTime|检测直播间的间隔||否|600(s)|
|videoPartLimitSize|小于此大小的文件不上传||否|100(mb)|
streamerInfo是一个数组，包括多个对象，每个对象的`key`为录制主播的名称。

### personInfo
| 字段            | 说明                         |是否必填|
| --------------- | ------------------ |---|
|nickname|B站昵称|否|
|username|B站账号，用于登录投稿|是|
|password|B站密码|是|
|access_token|用于鉴权的`token`凭证|否|
|refresh_token||否|
|expires_in||否|
|tokenSignDate||否|
|mid||否|

### streamerInfo
是一个数组，数组元素的`key`为直播间名称，也作为投稿的默认标题。
|字段|说明|可选值|是否必填|默认值|
|---|---|---|---|--|
|uploadLocalFile|是否投稿|true/false|否|true|
|deleteLocalFile|是否删除本地视频文件|true/false|否|true|
|delayTime|投稿成功后延迟删除本地文件的时间(需要deleteLocalFile为true)||否|2(天)|
|templateTile|稿件标题||否|直播间名称|
|desc|稿件描述||否|Powered By StreamerHelper. https://github.com/ZhangMingZhao1/StreamerHelper|
|source|稿件直播源(需要copyright为2)||否|{直播间名称} 直播间 {直播间地址}|
|dynamic|稿件粉丝动态||否|{直播间名称} 直播间 {直播间地址}|
|copyright|稿件来源，1为自制2为转载|1/2|否|2|
|roomUrl|直播间地址||是||
|tid|稿件分区|详见[tid表](https://github.com/FortuneDayssss/BilibiliUploader/wiki/Bilibili%E5%88%86%E5%8C%BA%E5%88%97%E8%A1%A8)|是|为空会导致投稿失败|
|tags|稿件标签||是|至少一个，总数量不能超过12个，并且单个不能超过20个字，否则稿件投稿失败|

### Example：
```javascript
{
  "StreamerHelper": {
    "debug": false,
    "recycleCheckTime": 1800,
    "roomCheckTime": 600,
    "videoPartLimitSize": 100
  },
  "personInfo": {
    "nickname": "",
    "username": "StreamerHelper",
    "password": "StreamerHelper",
    "access_token": "",
    "refresh_token": "",
    "expires_in": "",
    "tokenSignDate": "",
    "mid": 0
  },
  "streamerInfo": [
    {
      "iGNing": {
        "uploadLocalFile": true,
        "deleteLocalFile": true,
        "delayTime": 1,
        "templateTitle": "",
        "desc": "Powered By SteamerHelper",
        "source": "",
        "dynamic": "",
        "copyright": 2,
        "roomUrl": "https://www.huya.com/980312",
        "tid": 121,
        "tags": [
          "英雄联盟",
          "电子竞技",
          "iG",
          "鞋皇"
        ]
      }
    },{
      "浪子彦": {
        "uploadLocalFile": true,
        "deleteLocalFile": true,
        "delayTime": 2,
        "templateTitle": "",
        "desc": "",
        "source": "",
        "dynamic": "",
        "copyright": 2,
        "roomUrl": "https://www.huya.com/lzy861016",
        "tid": 171,
        "tags": [
          "英雄联盟",
          "电子竞技",
          "浪子彦",
          "录播"
        ]
      }
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
