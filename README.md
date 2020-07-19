<p align="center">
<img src="https://images.cnblogs.com/cnblogs_com/zhangmingzhao/1808511/o_2007171221041.png" alt="StreamerHelper" width="100px">
</p>
<h1 align="center">StreamerHelper</h1>

> 🍰 Never miss your Streamer again

[![MIT](https://img.shields.io/apm/l/vim-mode?style=flat-square)](https://github.com/ZhangMingZhao1/StreamerHelper/blob/master/LICENSE)

## Introduction

主播直播助手，部署后，后台批量监测主播是否在线，并录制视频，停播后投稿到b站。（关于版权问题，投稿的参数默认一律设置的转载，简介处默认放的有主播房间号）

## Installation

修改templates/info.json文件：
personInfo为你的要上传的b站账号和密码，
streamerInfo为你要批量录制的主播，key为标题信息，value为主播地址，目前支持虎牙平台。

```json
{
  "personInfo": {
    "username": "",
    "password": ""
  },
  "streamerInfo": [
    {
      "gushouyu": "https://www.huya.com/gushouyu",
      "wanmei": "https://www.huya.com/wanmei"
    }
  ]
}
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



## TodoList

- [x] 虎牙
- [x] 自动监测主播在线
- [x] 自动上传b站
- [x] 多p下载多p上传
- [x] 支持多个主播
- [ ] 除虎牙外的多个平台：斗鱼，twitch, b站直播..（开发的差不多了，即将合并）
- [ ] 爬虫定时区间，节省服务器流量...
- [ ] 重启后同时检测本地是否有上传失败的视频文件，并上传。

## Example
<img src="https://images.cnblogs.com/cnblogs_com/zhangmingzhao/1808511/o_2007170908082.png" alt="例子" width="700">

见：https://space.bilibili.com/3356199 或者 https://space.bilibili.com/11314291

## Tips

建议使用管口大的vps，否则上传下载速度可能会受影响。更新后请及时git pull重新pm2 restart app。vps比较低配的话配置的主播数量不要太多，也要注意vps的磁盘大小。


有问题加qq群1142141023，备注streamerHelper
