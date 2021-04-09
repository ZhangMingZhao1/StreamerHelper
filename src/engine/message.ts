import * as dayjs from "dayjs";
import * as fs from "fs"
import { spawn } from "child_process";
import { join } from 'path'
import * as chalk from "chalk";
import { Logger } from "log4js";

import { emitter } from "@/util/utils";
import { StreamInfo } from "@/type/streamInfo";
import { log4js } from "../log";
import { FileStatus } from "@/type/fileStatus";
import { RoomStatusPath } from "@/engine/roomPathStatus";
import { uploadStatus } from "@/uploader/uploadStatus";

const rootPath = process.cwd();
const partDuration = "3000"

export class Recorder {
  recorderName: string;
  recorderLink: string
  dirName!: string;
  timeV!: string;
  tags!: string[];
  tid!: number
  App!: any;
  deleteLocalFile: boolean;
  uploadLocalFile: boolean;
  ffmpegProcessEnd: boolean = false;
  ffmpegProcessEndByUser: boolean = false
  private logger: Logger;
  private readonly stream: StreamInfo;
  private isPost: boolean
  constructor(stream: StreamInfo) {
    this.recorderName = stream.roomName
    this.recorderLink = stream.roomLink
    this.deleteLocalFile = stream.deleteLocalFile === undefined ? true : stream.deleteLocalFile
    this.uploadLocalFile = stream.uploadLocalFile === undefined ? true : stream.uploadLocalFile
    this.tid = stream.roomTid
    this.timeV = `${dayjs().format("YYYY-MM-DD")} ${this.getTitlePostfix()}`;
    this.ffmpegProcessEnd = false
    this.ffmpegProcessEndByUser = false
    this.tags = stream.roomTags
    this.logger = log4js.getLogger(`Recorder ${this.recorderName}`)
    this.stream = stream
    this.isPost = false
  }

  startRecord(stream: StreamInfo) {
    if (!this.recorderName) return
    stream.timeV = this.timeV
    this.logger.info(`开始下载: ${stream.roomName}, 直播流: ${stream.streamUrl}`)
    const cmd = `ffmpeg`;
    const savePath = join(rootPath, "/download")
    let startNumber = 0
    this.dirName = join(savePath, stream.roomName)
    if (!fs.existsSync(this.dirName)) {
      fs.mkdirSync(this.dirName)
    }
    this.dirName = join(this.dirName, this.timeV)
    this.readFileStatus(this.dirName)
    if (!fs.existsSync(this.dirName)) {
      fs.mkdirSync(this.dirName)
    } else if (this.isPost || uploadStatus.get(this.dirName) === 1) {
      const newPath = `${this.dirName} ${dayjs().format("HH-mm")}`
      this.dirName = newPath
      this.timeV = `${this.timeV} ${dayjs().format("HH-mm")}`
      fs.mkdirSync(newPath)
    } else {
      const ps = fs.readdirSync(this.dirName);
      startNumber = ps.length
    }

    this.logger.info(`记录相关信息到文件 ${chalk.red(this.recorderName)}，目录：${this.dirName}`)
    this.writeInfoToFileStatus(this.dirName, stream)

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
    RoomStatusPath.set(this.dirName, 1)
    this.App.stdout.on("data", (data: any) => {
      this.logger.info(data.toString("utf8"));
    });
    this.App.stderr.on("data", () => {

      // ffmpeg by default the program logs to stderr ,正常流日志不记录
      // logger.error(data.toString("utf8"));
    });
    this.App.on("exit", (code: number) => {
      this.ffmpegProcessEnd = true
      this.logger.info(`下载流 ${chalk.red(stream.roomName)} 退出，退出码: ${code}，目录：${this.dirName}`);
      this.logger.info(`记录退出时间 ${chalk.red(this.recorderName)}`)
      this.writeInfoToFileStatus(this.dirName, stream)
      if (!this.ffmpegProcessEndByUser) {
        emitter.emit('streamDisconnect', this)
      }
      RoomStatusPath.delete(this.dirName)
    });
  };

  stopRecord() {
    this.ffmpegProcessEndByUser = true
    if (!this.ffmpegProcessEnd) {
      this.App.stdin.end('q')
      this.logger.info(`停止录制 ${chalk.red(this.recorderName)}`)
      this.logger.info(`记录退出时间 ${chalk.red(this.recorderName)}`)
      this.writeInfoToFileStatus(this.dirName, this.stream)
      RoomStatusPath.delete(this.dirName)
    }
  }


  recorderStat(): boolean {
    return !this.ffmpegProcessEnd
  }

  private writeInfoToFileStatus(dirName: string, stream: StreamInfo) {
    const fileStatusPath = join(dirName, 'fileStatus.json')

    if (!fs.existsSync(fileStatusPath)) {
      // new File
      const obj: FileStatus = {
        path: this.dirName,
        recorderName: this.recorderName,
        recorderLink: this.recorderLink,
        tags: this.tags,
        tid: this.tid,
        startRecordTime: new Date(),
        uploadLocalFile: this.uploadLocalFile,
        deleteLocalFile: this.deleteLocalFile,
        isPost: false,
        isFailed: false,
        delayTime: stream.delayTime ?? 2,
        templateTitle: stream.templateTitle || '',
        desc: stream.desc || '',
        source: stream.source || '',
        dynamic: stream.dynamic || '',
        copyright: stream.copyright ?? 2,
        timeV: this.timeV
      }
      fs.writeFileSync(fileStatusPath, JSON.stringify(obj, null, '  '))
      this.logger.info(`Create fileStatus.json: ${JSON.stringify(obj, null, 2)}`)
    } else {
      // When ffmpeg exit, write endRecordTime to file
      const obj: FileStatus = {
        endRecordTime: new Date()
      }
      const text = fs.readFileSync(fileStatusPath)
      const tmpObj = JSON.parse(text.toString()) as FileStatus
      Object.assign(tmpObj, obj)
      const stringifies = JSON.stringify(tmpObj, null, '  ')
      fs.writeFileSync(fileStatusPath, stringifies)
      this.logger.info(`Write Content - endRecordTime ${JSON.stringify(tmpObj, null, 2)}`)
    }
  }

  private readFileStatus(dirName: string) {
    const fileStatusPath = join(dirName, 'fileStatus.json')

    if (fs.existsSync(fileStatusPath)) {
      const text = fs.readFileSync(fileStatusPath)
      const obj = JSON.parse(text.toString()) as FileStatus
      this.isPost = obj.isPost || false
    }
  }

  private getTitlePostfix() {
    const hour = parseInt(dayjs().format("HH"))

    if (hour >= 0 && hour < 6) return '凌晨'

    if (hour >= 6 && hour < 12) return '早上'

    if (hour >= 12 && hour < 18) return '下午'

    if (hour >= 18 && hour < 24) return '晚上'
    return ''
  }
}

