import * as fs from "fs"
import { join } from 'path'
import { spawn, ChildProcess } from "child_process";

import * as dayjs from "dayjs";
import * as chalk from "chalk";
import { Logger } from "log4js";

import { emitter, FileHound } from "@/util/utils";
import { getExtendedLogger } from "@/log";
import { FileStatus } from "@/type/fileStatus";
import { roomPathStatus } from "@/engine/roomPathStatus";
import { uploadStatus } from "@/uploader/uploadStatus";
import { RecorderTask } from "@/type/recorderTask";

const rootPath = process.cwd();
const saveRootPath = join(rootPath, "/download")
const partDuration = "3000"

export class Recorder {
  private savePath!: string;
  private App!: ChildProcess;
  private ffmpegProcessEnd: boolean = false;
  private ffmpegProcessEndByUser: boolean = false
  private logger: Logger;
  private readonly _recorderTask: RecorderTask;
  private readonly videoExt = 'mp4'
  private isPost: boolean

  public get recorderTask() {
    return this._recorderTask
  }

  constructor(recorderTask: RecorderTask) {
    this.ffmpegProcessEnd = false
    this.ffmpegProcessEndByUser = false

    this._recorderTask = recorderTask

    this.isPost = false
    this._recorderTask.timeV = `${dayjs().format("YYYY-MM-DD")} ${this.getTitlePostfix()}`;

    this.logger = getExtendedLogger(`Recorder ${this._recorderTask.recorderName}`)
  }

  startRecord(_streamUrl: string | undefined = undefined) {
    this._recorderTask.streamUrl = _streamUrl ?? this._recorderTask.streamUrl
    this.ffmpegProcessEnd = false

    this.logger.info(`开始下载: ${this._recorderTask.recorderName}, 直播流: ${this._recorderTask.streamUrl}`)

    const pathWithRecorderName = join(saveRootPath, this._recorderTask.recorderName)
    let startNumber = 0

    if (!fs.existsSync(pathWithRecorderName)) {
      fs.mkdirSync(pathWithRecorderName)
    }

    const pathWithTimeV = join(pathWithRecorderName, this._recorderTask.timeV)
    this.savePath = pathWithTimeV

    this.syncFileStatus(pathWithTimeV)

    if (!fs.existsSync(pathWithTimeV)) {
      fs.mkdirSync(pathWithTimeV)
    } else if (this.isPost || uploadStatus.get(pathWithTimeV) === 1) {
      // 正在上传或者已经投稿
      const curTime = dayjs().format("HH-mm")
      const newPath = `${pathWithTimeV} ${curTime}`
      roomPathStatus.delete(this.savePath)
      this.savePath = newPath
      this._recorderTask.timeV = `${this._recorderTask.timeV} ${curTime}`
      fs.mkdirSync(newPath)
    } else {
      const ps = FileHound
        .create()
        .ext(this.videoExt)
        .path(join(this.savePath))
        .findSync()
        .length;
      startNumber = ps - 1 > 0 ? ps - 1 : 0
    }

    this.logger.info(`记录相关信息到文件 ${chalk.red(this._recorderTask.recorderName)}，目录：${this.savePath}`)
    this.writeInfoToFileStatus(this.savePath, this._recorderTask)

    const fileName: string = join(this.savePath, `${this._recorderTask.recorderName}-${this._recorderTask.timeV}-part-%03d.${this.videoExt}`);
    const fakeX: any = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (120 - 100 + 1)) + 100}.0.0.0 Safari/537.36`
    }
    let fakeHeaders = ""

    for (const key of Object.keys(fakeX)) {
      fakeHeaders = `${fakeHeaders}${key}: ${fakeX[key]}\r\n`
    }

    const cmd = `ffmpeg`;
    this.App = spawn(cmd, [
      "-headers",
      fakeHeaders,
      "-i",
      this._recorderTask.streamUrl,
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
      "-reset_timestamps", 
      "1",
      fileName,
    ], {
      windowsHide: true
    });

    roomPathStatus.set(this.savePath, 1)

    this.App.stdout?.on("data", (data: any) => {
      this.logger.info(`FFmpeg error: ${data.toString("utf8")}`);
    });
    this.App.stderr?.on("data", () => {

      // ffmpeg by default the program logs to stderr ,正常流日志不记录
      // logger.error(data.toString("utf8"));
    });
    this.App.on("exit", (code: number) => {
      this.ffmpegProcessEnd = true

      this.logger.info(`下载流 ${chalk.red(this._recorderTask.recorderName)} 退出，退出码: ${code}，目录：${this.savePath}`);
      this.logger.info(`记录退出时间 ${chalk.red(this._recorderTask.recorderName)}`)

      this.writeInfoToFileStatus(this.savePath, this._recorderTask)

      if (!this.ffmpegProcessEndByUser) {
        emitter.emit('streamDisconnect', this)
      }

      roomPathStatus.delete(this.savePath)
    });
  };

  stopRecord() {
    this.ffmpegProcessEndByUser = true
    if (!this.ffmpegProcessEnd) {
      this.App.stdin?.end('q')

      this.logger.info(`停止录制 ${chalk.red(this._recorderTask.recorderName)}`)
      this.logger.info(`记录退出时间 ${chalk.red(this._recorderTask.recorderName)}`)

      this.writeInfoToFileStatus(this.savePath, this._recorderTask)

      roomPathStatus.delete(this.savePath)
    }
  }


  recorderStat(): boolean {
    return !this.ffmpegProcessEnd
  }

  kill() {
    return this.App.kill()
  }

  private writeInfoToFileStatus(dirName: string, recorderTask: RecorderTask) {
    const fileStatusPath = join(dirName, 'fileStatus.json')

    if (!fs.existsSync(fileStatusPath)) {
      // new File
      const obj: FileStatus = {
        path: this.savePath,
        recorderName: this._recorderTask.recorderName,
        recorderLink: this._recorderTask.streamerInfo.roomUrl,
        tags: this._recorderTask.streamerInfo.tags,
        tid: this._recorderTask.streamerInfo.tid,
        startRecordTime: new Date(),
        uploadLocalFile: this._recorderTask.streamerInfo.uploadLocalFile,
        deleteLocalFile: this._recorderTask.streamerInfo.deleteLocalFile,
        isPost: false,
        isFailed: false,
        delayTime: recorderTask.streamerInfo.delayTime ?? 2,
        templateTitle: recorderTask.streamerInfo.templateTitle || '',
        desc: recorderTask.streamerInfo.desc || '',
        source: recorderTask.streamerInfo.source || '',
        dynamic: recorderTask.streamerInfo.dynamic || '',
        copyright: recorderTask.streamerInfo.copyright ?? 2,
        timeV: this._recorderTask.timeV
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

  private syncFileStatus(dirName: string) {
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

