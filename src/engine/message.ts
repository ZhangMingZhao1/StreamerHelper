import * as dayjs from "dayjs";
import * as fs from "fs"
import { spawn } from "child_process";
import { join } from 'path'
import { emitter } from "../util/utils";
import { StreamInfo } from "../type/StreamInfo";
import {logger} from "../log";
import * as chalk from "chalk";
const rootPath = process.cwd();
const partDuration = "3000"

export class Recorder {
  recorderName: string;
  recorderLink: string
  dirName!: string;
  timeV!: string;
  tags!: string[];
  tid!: Number
  App!: any;
  deleteLocalFile: Boolean;
  uploadLocalFile: Boolean;
  ffmpegProcessEnd: boolean = false;
  ffmpegProcessEndByUser: boolean = false
  constructor(stream: StreamInfo) {
    this.recorderName = stream.roomName
    this.recorderLink = stream.roomLink
    this.deleteLocalFile = stream.deleteLocalFile === undefined ? true : stream.deleteLocalFile
    this.uploadLocalFile = stream.uploadLocalFile === undefined ? true : stream.uploadLocalFile
    this.startRecord(stream)
  }

  startRecord(stream: StreamInfo) {

    logger.info(`开始下载: ${stream.roomName}, 直播流: ${stream.streamUrl}`)
    this.tid = stream.roomTid
    this.timeV = dayjs().format("YYYY-MM-DD");
    this.ffmpegProcessEnd = false
    this.ffmpegProcessEndByUser = false
    this.tags = stream.roomTags
    const cmd = `ffmpeg`;
    let savePath = join(rootPath, "/download")
    let startNumber = 0
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath)
    }
    this.dirName = join(savePath, stream.roomName)
    if (!fs.existsSync(this.dirName)) {
      fs.mkdirSync(this.dirName)
    }
    this.dirName = join(this.dirName, this.timeV)
    if (!fs.existsSync(this.dirName)) {
      fs.mkdirSync(this.dirName)
    } else {
      let ps = fs.readdirSync(this.dirName);
      startNumber = ps.length
    }
    const fileName: string = join(this.dirName, `${stream.roomName}-${this.timeV}-part-%03d.mp4`);
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
    this.App = spawn(cmd, [
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
    this.App.stdout.on("data", (data: any) => {
      logger.info(data.toString("utf8"));
    });
    this.App.stderr.on("data", () => {

      // ffmpeg by default the program logs to stderr ,正常流日志不记录
      // logger.error(data.toString("utf8"));
    });
    this.App.on("exit", (code: number) => {
      this.ffmpegProcessEnd = true
      logger.info(`下载流 ${chalk.red(stream.roomName)} 退出，退出码: ${code}`);
      if (!this.ffmpegProcessEndByUser) {
        emitter.emit('streamDiscon', this)
      }

    });
  };

  stopRecord() {
    this.ffmpegProcessEndByUser = true
    if (!this.ffmpegProcessEnd) {
      this.App.stdin.end('q')
      logger.info(`停止录制 ${chalk.red(this.recorderName)}`)
    }
  }


  recorderStat(): boolean {
    return !this.ffmpegProcessEnd
  }
}

