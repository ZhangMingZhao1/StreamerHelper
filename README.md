<p align="center">
<img src="https://s1.ax1x.com/2020/07/22/UbKCpq.png" alt="StreamerHelper" width="100px">
</p>
<h1 align="center">StreamerHelper</h1>

> 🍰 Never miss your Streamer again

[![MIT](https://img.shields.io/github/license/ZhangMingZhao1/StreamerHelper?color=red)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/npm)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/package.json)
[![nodejs version](https://img.shields.io/npm/v/node?color=23&label=node&logoColor=white)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/package.json)

## Introduction

主播直播助手，部署后，后台批量监测各个平台主播是否在线，并实时录制直播保存为视频文件，停播后投稿到b站。（关于版权问题，投稿的参数默认一律设置的转载，简介处默认放的有主播房间号）

## Installation

修改templates/info.json文件：
- personInfo为你的要上传的b站账号和密码，
- access_token 支持access_token验证,避免频繁登录造成出现验证码登录(已知bug:错误的token验证错误后无法触发登录的流程)
- streamerInfo为你要批量录制的主播，key为标题信息，value为包含主播直播地址和标签数组的对象。像移动端的直播地址，可进入APP点分享按钮，复制分享链接中的URL，如抖音的https://v.douyin.com/J2Nw8YM/
- tags为投稿标签，不能为空，总数量不能超过12个， 并且单个不能超过20个字，否则稿件投稿失败
- tid为投稿分区，详见表：[tid表](https://github.com/FortuneDayssss/BilibiliUploader/wiki/Bilibili%E5%88%86%E5%8C%BA%E5%88%97%E8%A1%A8)
- uploadLocalFile为是否投稿，填false表示仅下载，不上传，不填写该字段则默认上传
- deleteLocalFile为是否在投稿后删除本地文件，该选项仅在uploadLocalFile设置为true时启用，不填写该字段则默认删除

```json
{
  "StreamerHelper": {
    "debug": false, #Debug开关
    "roomCheckTime": 120, #房间检测间隔，秒
    "videoPartLimitSize": 100 #小于此大小的文件不上传，MB，解决主播断流问题出现很多小切片导致上传审核失败
  },
  "personInfo": {
    "username": "",
    "password": "",
    "access_token": ""
  },
  "streamerInfo": [
    {
      "iGNing": {
        "uploadLocalFile": true,
        "deleteLocalFile": false,
        "roomUrl": "https://www.huya.com/980312",
        "tid": 121,
        "tags": [
          "英雄联盟",
          "电子竞技",
          "iG"
        ]
      }
    }
  ]
}
```

#### Docker

配置文件: `/app/templates/info.json`

视频目录: `/app/download`

容器的保活使用docker提供的`restart`参数，不再使用PM2。

DNS参数可以根据地区以及实际情况进行配置。

```shell
docker run --name stream -itd -v /path/to/config/info.json:/app/templates/info.json -v /path/to/download/:/app/download --dns 114.114.114.114 --restart always zsnmwy/streamerhelper
```

#### 安装ffmpeg

mac:
```bash
brew update
brew install ffmpeg
```
linux:
```
sudo add-apt-repository ppa:djcj/hybrid
sudo apt-get update
sudo apt-get install ffmpeg
```

部署：
```bash
npm i -g pm2
git clone https://github.com/ZhangMingZhao1/StreamerHelper.git && cd StreamerHelper
npm i
npm run serve
```

## Environment

我们的机器在下面环境下完美运行:

阿里云轻量应用服务器，内存2g，CPU 1核，Ubuntu 18.04，同时检测两个主播。

| Node.js | npm | TypeScript|
| ---- | ---- | ---- |
| 12.18.2 | 6.14.5 |3.9.6 |


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
- [ ] 支持twitch
- [ ] 增加一个独立脚本遍历download文件夹下的视频文件重新上传(重启上传的折中解决办法，还有解决第一次账号密码配置错误失败上传的问题)

## Example
<img src="https://i.loli.net/2020/11/12/MUNDe1bPR2iGfpB.jpg" alt="例子" width="500">

见：https://space.bilibili.com/3356199 或者 https://space.bilibili.com/11314291

## Tips

建议使用管口大的vps，否则上传下载速度可能会受影响。更新后请及时git pull重新pm2 restart app。vps比较低配的话配置的主播数量不要太多，也要注意vps的磁盘大小。日志文件会自动创建，在./logs/下。


有问题加qq群1142141023，备注streamerHelper

## 请开发者喝杯咖啡 

**您的捐赠和star是开发者持续维护的最大动力!**
<br>
<img src="https://i.loli.net/2020/11/12/gWbme18FhpSVCJy.png" width = "200"  alt="" />
<img src="https://i.loli.net/2020/11/12/l1kirIpOa2voDhM.png" width = "200"  alt=""  />
