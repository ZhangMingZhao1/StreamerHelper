import * as log4js from "log4js";
import * as dayjs from "dayjs";
import { getRoomArrInfo, emitter } from "./util/utils";
import { StreamInfo } from "type/StreamInfo";
import { getStreamUrl } from "./engine/getStreamUrl";
import { RoomStatus } from "./engine/RoomStatus"
import { Recorder } from "./engine/message";
import { upload2bilibili } from './uploader/caller'
import { uploadStatus } from "./uploader/uploadStatus"
import { deleteFolder } from './util/utils'
log4js.configure({
    appenders: {
        cheese: {
            type: "file",
            filename: process.cwd() + "/logs/artanis.log",
            maxLogSize: 20971520,
            backups: 10,
            encoding: "utf-8",
        },
    },
    categories: { default: { appenders: ["cheese"], level: "info" } },
});

const Rooms = getRoomArrInfo(require('../templates/info.json').streamerInfo);
const logger = log4js.getLogger("message");
let recorderPool: Recorder[] = []

// event of stream disconnected
emitter.on('streamDiscon', (curRecorder: Recorder) => {
    recorderPool.forEach((elem: Recorder) => {
        if (elem.recorderName === curRecorder.recorderName) {
            curRecorder = elem
        }
    })

    setTimeout(() => {
        getStreamUrl(curRecorder.recorderName, curRecorder.recorderLink, curRecorder.tags, curRecorder.tid)
            .then((stream: StreamInfo) => {
                // the stream disconnected
                // but room online
                let timeNow = dayjs().format("YYYY-MM-DD")
                if (timeNow !== curRecorder.timeV) {
                    logger.info(`日期改变，上传前一天的录播文件`)
                    if (curRecorder.uploadLocalFile)
                        submit(curRecorder.dirName, curRecorder.recorderName, curRecorder.recorderLink, curRecorder.timeV, curRecorder.tags, curRecorder.tid, curRecorder.deleteLocalFile)
                }
                // so restart the recorder
                // continue downloading
                logger.info(`下载流 ${curRecorder.dirName} 断开，但直播间在线，重启`)
                curRecorder.startRecord(stream)

            })
            .catch(() => {
                RoomStatus.set(curRecorder.recorderName, 0)
            })

    }, 5000);

})



const F = () => {
    for (let room of Rooms) {
        let curRecorder: Recorder
        let curRecorderIndex: number
        // get current Recorder
        recorderPool.forEach((elem: Recorder, index: number) => {
            if (elem.recorderName === room.roomName) {
                curRecorder = elem
                curRecorderIndex = index
            }
        })
        getStreamUrl(room.roomName, room.roomLink, room.roomTags, room.roomTid)
            .then((stream: StreamInfo) => {
                if (RoomStatus.get(room.roomName) !== 1) {
                    RoomStatus.set(room.roomName, 1)
                    stream.deleteLocalFile = room.deleteLocalFile
                    stream.uploadLocalFile = room.uploadLocalFile
                    recorderPool.push(new Recorder(stream))
                } else if (curRecorder.ffmpegProcessEnd === true) {
                    recorderPool.push(new Recorder(stream))
                }

            })
            .catch(() => {
                // room offline
                // it is time to submit
                RoomStatus.set(room.roomName, 0)
                if (curRecorder) {
                    // but the stream isn't disconnected
                    // so stop the recorder before submit
                    setTimeout(() => {
                        if (curRecorder.recorderStat() === true) {
                            curRecorder.stopRecord()
                        }
                        // submit
                        if (curRecorder.uploadLocalFile) {
                            logger.info(`准备投稿 ${curRecorder.recorderName}`)
                            submit(curRecorder.dirName, curRecorder.recorderName, curRecorder.recorderLink, curRecorder.timeV, curRecorder.tags, curRecorder.tid, curRecorder.deleteLocalFile)
                        }
                        recorderPool.splice(curRecorderIndex, 1);
                    }, 5000);
                }
            })
    }
}

F()
const timer = setInterval(F, 120000);

process.on("SIGINT", () => {
    console.log("Receive exit signal, the process will exit after 3 seconds.")
    logger.info("Process exited by user.")
    clearInterval(timer)
    emitter.removeAllListeners("streamDiscon")
    recorderPool.forEach((elem: Recorder) => {
        elem.stopRecord()
    })
    setTimeout(() => {
        process.exit()
    }, 3000);
})
const submit = (dirName: string, roomName: string, roomLink: string, timeV: string, tags: string[], tid: Number, deleteLocalFile: Boolean) => {
    if (uploadStatus.get(dirName) === 1) {
        logger.error(`目录 ${dirName} 正在上传中，避免重复上传，取消此次上传任务`)
        return
    }
    uploadStatus.set(dirName, 1)
    upload2bilibili(dirName, `${roomName} ${timeV}录播`, ` 本录播由StreamerHelper强力驱动:  https://github.com/ZhangMingZhao1/StreamerHelper，对您有帮助的话，求个star`, tags, roomLink, tid)
        .then((message) => {
            uploadStatus.set(dirName, 0)
            logger.info(message)
            if (deleteLocalFile) {
                try {
                    deleteFolder(dirName)
                    logger.info(`删除本地文件 ${dirName}`)
                } catch (err) {
                    logger.error(`稿件 ${dirName} 删除本地文件失败：${err}`)
                }
            }
        })
        .catch(err => {
            uploadStatus.set(dirName, 0)
            logger.error(`稿件 ${dirName} 投稿失败：${err}`)
        })
}