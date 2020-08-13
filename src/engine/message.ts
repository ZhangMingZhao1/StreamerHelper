import * as log4js from "log4js";
import * as dayjs from "dayjs";
import * as fs from "fs"
import { spawn } from "child_process";
import { join } from 'path'
import { upload2bilibili } from '../uploader/caller'
import { liveStreamStatus } from "./liveStreamStatus"
import { StreamInfo } from "type/getStreamInfo";
import { deleteFolder } from '../util/utils'
import { getStreamUrl } from "../engine/getStreamUrl";
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
export const downloadStream = (stream: StreamInfo) => {
  // 每段视频持续时间，单位s
  const partDuration = "3000"
  // let huyaRoomId = getRoomArrInfo(infoJson.streamerInfo)[0].roomLink;
  // let huyaRoomTitle = getRoomArrInfo(infoJson.streamerInfo)[0].roomTitle;
  // console.log("开始下载 ", stream.streamName);
  logger.info(`开始下载: ${stream.streamName}, 直播流: ${stream.streamUrl}`)
  // const cmd = `ffmpeg -i "${streamUrl}" -f mp4 res.MP4`;
  // 命名加上时间戳
  // console.log("streamUrl", stream.streamUrl);
  const timeV = dayjs().format("YYYY-MM-DD");
  const cmd = `ffmpeg`;
  // console.log("11", huyaRoomId + `${timeV}res.MP4`);
  let savePath = join(rootPath, "/download")
  let startNumber = 0
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
  } else { //文件夹存在，说明有视频未上传，接着前面的序号下载
    let ps = fs.readdirSync(dirName);
    startNumber = ps.length
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
  const App = spawn(cmd, [
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
    "-segment_start_number",
    startNumber.toString(),
    fileName,
  ]);
  const tags = stream.streamTags
  const tid = stream.streamTid
  const submit = () => {
    upload2bilibili(dirName, `${stream.streamName} ${timeV}录播`, ``, tid, tags, stream.liveUrl)
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
  }
  let ffmpegStreamEnded: boolean = false;
  let ffmpegStreamEndedByUser: boolean = false
  App.stdout.on("data", (data: any) => {
    // console.log(`stdout: ${data}`);
    logger.info(data.toString("utf8"));
  });
  App.stderr.on("data", () => {

    // ffmpeg by default the program logs to stderr ,正常流日志不记录
    // logger.error(data.toString("utf8"));
  });
  App.on("close", (code: any) => {
    App.removeAllListeners()
    if (ffmpegStreamEndedByUser) {
      return
    }
    ffmpegStreamEnded = true
    // console.log(`子进程退出，退出码 ${code}`);
    logger.info(`子进程退出，退出码 ${code}`);
    // 手动延迟 2min 避免直播流断开，但直播未结束，导致误上传的情况
    // 连续检测三次（to do）
    setTimeout(() => {
      liveStreamStatus.set(stream.liveUrl, 0)
      getStreamUrl(stream.streamName, stream.liveUrl, stream.streamTid, stream.streamTags).then((msg) => {
        // 直播流断开，但直播没断，不需要上传，继续下载
        logger.info(`${msg.liveUrl} 断流，但直播间仍在线，继续下载`)
        // 日期改变，前一天的录播不会再上传，所以这里主动上传
        let timeNow = dayjs().format("YYYY-MM-DD")
        if (timeNow !== timeV) {
          logger.info(`日期改变，上传前一天的录播文件`)
          submit()
        }
      }).catch(() => {
        // 直播和直播流都断开，认为直播结束
        App.removeAllListeners()
        submit()
      })
    }, 120000);

  });
  process.on("SIGINT", () => {
    ffmpegStreamEndedByUser = true
    if (ffmpegStreamEnded === false) {
      ffmpegStreamEnded = true
      App.stdin.end('q')
    }
  })
};