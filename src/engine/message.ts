import * as log4js from "log4js";
import * as dayjs from "dayjs";
import * as fs from "fs"
import { spawn } from "child_process";
import { join } from 'path'
import { upload2bilibili } from '../uploader/caller'
import { liveStatus } from "./liveStatus"
import { HuyaStreamInfo } from "type/getHuya";
import { deleteFolder } from '../util/utils'
const rootPath = process.cwd();
log4js.configure({
  appenders: {
    cheese: {
      type: "file",
      filename: rootPath + "/logs/artanis.log",
      maxLogSize: 20971520,
      backups: 10,
      encoding: "utf-8",
    },
  },
  categories: { default: { appenders: ["cheese"], level: "info" } },
});

const logger = log4js.getLogger("message");
export const downloadStream = (stream: HuyaStreamInfo) => {
  // 每段视频持续时间，单位s
  const partDuration = "1800"
  // let huyaRoomId = getRoomArrInfo(infoJson.streamerInfo)[0].roomLink;
  // let huyaRoomTitle = getRoomArrInfo(infoJson.streamerInfo)[0].roomTitle;
  // console.log("开始下载 ", stream.streamName);
  logger.info("开始下载 ", stream.streamName)
  // const cmd = `ffmpeg -i "${streamUrl}" -f mp4 res.MP4`;
  // 命名加上时间戳
  // console.log("streamUrl", stream.streamUrl);
  const timeV = dayjs().format("YYYY-MM-DD");
  const cmd = `ffmpeg`;
  // console.log("11", huyaRoomId + `${timeV}res.MP4`);
  let savePath = join(rootPath, "/download")
  if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath)
  }
  let dirName = join(savePath, stream.streamName)
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName)
  }
  dirName = join(dirName, timeV)
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName)
  }
  const fileName: string = join(dirName, `${stream.streamName}-${timeV}-part-%03d.mp4`);
  //伪装了请求头，避免服务器返回403
  const fakeX: any = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh,zh-TW;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ru;q=0.5',
    'Origin': 'https://www.huya.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36'
  }
  let fakeHeaders = ""
  for (let key of Object.keys(fakeX)) {
    fakeHeaders = `${fakeHeaders}${key}: ${fakeX[key]}\r\n`
  }
  const huyaApp = spawn(cmd, [
    "-headers",
    fakeHeaders,
    "-i",
    stream.streamUrl,
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-f",
    "segment",
    "-segment_time",
    partDuration,
    fileName,
  ]);
  let ffmpegStreamEnded: boolean = false;
  huyaApp.stdout.on("data", (data: any) => {
    // console.log(`stdout: ${data}`);
    logger.info(data.toString("utf8"));
  });
  huyaApp.stderr.on("data", (data: any) => {

    // ffmpeg by default the program logs to stderr ,正常流日志不记录
    // logger.error(data.toString("utf8"));
  });
  huyaApp.on("close", async (code: any) => {
    // console.log(`子进程退出，退出码 ${code}`);
    logger.info(`子进程退出，退出码 ${code}`);
    const tags: string[] = []
    tags.push("网络游戏", "电子竞技")
    liveStatus.set(stream.liveUrl, 0)
    upload2bilibili(dirName, `${stream.streamName} ${timeV}录播`, ` 本录播由StreamerHelp强力驱动:  https://github.com/ZhangMingZhao1/StreamerHelper，对您有帮助的话，求个star`, tags, stream.liveUrl)
      .then((message) => {
        logger.info(message)
        try {
          deleteFolder(dirName)
          logger.info(`删除本地文件 ${dirName}`)
        } catch (err) {
          logger.error(`稿件 ${dirName} 删除本地文件失败：${err}`)
        }
      })
      .catch(err => {
        logger.error(`稿件 ${dirName} 投稿失败：${err}`)
      })
  });
  ffmpegStreamEnded = true
  process.on("SIGINT", () => {
    if (ffmpegStreamEnded == false) {
      ffmpegStreamEnded = true
      huyaApp.stdin.end('q')
    }
  })
};