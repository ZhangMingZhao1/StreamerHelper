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
personInfo为你的要上传的b站账号和密码，
streamerInfo为你要批量录制的主播，key为标题信息，value为包含主播直播地址和标签数组的对象。像移动端的直播地址，可进入APP点分享按钮，复制分享链接中的URL，如抖音的https://v.douyin.com/J2Nw8YM/
需要注意，tags不能为空，总数量不能超过12个， 并且单个不能超过20个字，否则稿件投稿失败

```json
{
  "personInfo": {
    "username": "",
    "password": ""
  },
  "streamerInfo": [
    {
      "iGNing直播第一视角": {
        "roomUrl": "https://www.huya.com/980312",
        "tags": [
          "英雄联盟",
          "电子竞技",
          "iG"
        ]
      },
      "罗永浩抖音直播": {
        "roomUrl": "https://v.douyin.com/J2Nw8YM/",
        "tags": [
          "网络红人",
          "罗老师"
        ]
      }
    }
  ]
}
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
brew install ffmpeg
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


## Core Contributor
<a class="mr-2" data-hovercard-type="user" data-hovercard-url="/users/ZhangMingZhao1/hovercard" data-octo-click="hovercard-link-click" data-octo-dimensions="link_type:self" href="https://github.com/ZhangMingZhao1">
          <img class="d-block avatar-user" src="https://avatars3.githubusercontent.com/u/29058747?s=64&amp;v=4" width="50" height="50" alt="@ZhangMingZhao1">
</a>
<a class="mr-2" href="https://github.com/umuoy1">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/57709713?s=64&amp;v=4" width="50" height="50" alt="@umuoy1">
</a>
<a class="mr-2" href="https://github.com/ni00">
          <img class="d-block avatar-user" src="https://avatars1.githubusercontent.com/u/56543214?s=64&amp;v=4" width="50" height="50" alt="@ni00">
</a>

<br>
<br>

Thanks：
  
<div>
<a class="mr-2" href="/ForgQi">
          <img class="d-block avatar-user" src="https://avatars3.githubusercontent.com/u/34411314?s=64&amp;v=4" width="50" height="50" alt="@ForgQi">
</a><a class="mr-2"  href="https://github.com/FortuneDayssss">
          <img class="d-block avatar-user" src="https://avatars2.githubusercontent.com/u/12007115?s=460&u=f6e499824dbba4197ddb5b7bf113e6641e933d6b&v=4" width="50" height="50" alt="@FortuneDayssss">
</a>
</div>

## TodoList

- [x] 支持虎牙，b站直播，抖音直播，快手直播，西瓜直播，花椒直播，YY 直播，战旗直播，酷狗繁星，NOW 直播，CC 直播，企鹅电竞直播
- [x] 自动监测主播在线
- [x] 自动上传b站
- [x] 多p下载多p上传
- [x] 支持多个主播
- [x] tag可配置，对应在info.json的每个主播
- [ ] 支持twitch, afreeca，斗鱼
- [ ] 爬虫定时区间，节省服务器流量...
- [ ] 重启后同时检测本地是否有上传失败的视频文件，并上传。
- [ ] 增加一个独立脚本遍历download文件夹下的视频文件重新上传(重启上传的折中解决办法，还有解决第一次账号密码配置错误失败上传的问题)

## Example
<img src="https://images.cnblogs.com/cnblogs_com/zhangmingzhao/1808511/o_2007170908082.png" alt="例子" width="700">

见：https://space.bilibili.com/3356199 或者 https://space.bilibili.com/11314291

## Tips

建议使用管口大的vps，否则上传下载速度可能会受影响。更新后请及时git pull重新pm2 restart app。vps比较低配的话配置的主播数量不要太多，也要注意vps的磁盘大小。日志文件会自动创建，在./logs/下。


有问题加qq群1142141023，备注streamerHelper
