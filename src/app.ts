import * as log4js from "log4js";
import * as dayjs from "dayjs";
import { getRoomArrInfo } from "./util/utils";
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
const logger = log4js.getLogger("message");
let pool: any = []
let recorderPool: Recorder[] = []
const Rooms = getRoomArrInfo(require('../templates/info.json').streamerInfo);
const timer = setInterval(() => {
    for (let room of Rooms) {
        let curRecorder: Recorder
        let curRecorderIndex: number
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
                    pool.push(stream)
                } else {
                    if (curRecorder && curRecorder.recorderStat() === false) {
                        // the recorder is running
                        // but the stream disconnected
                        // and room online
                        // so restart the recorder
                        let timeNow = dayjs().format("YYYY-MM-DD")
                        if (timeNow !== curRecorder.timeV) {
                            logger.info(`日期改变，上传前一天的录播文件`)
                            submit(curRecorder.dirName, curRecorder.recorderName, curRecorder.recorderLink, curRecorder.timeV, curRecorder.tags, curRecorder.tid)
                        }
                        curRecorder.startRecord(stream)
                    }
                }
            })
            .catch(() => {
                RoomStatus.set(room.roomName, 0)
                if (curRecorder) {
                    // room offline
                    // but the stream isn't disconnected
                    // so stop the recorder
                    // and submit
                    if (curRecorder.recorderStat() === true) {
                        curRecorder.stopRecord()
                    }
                    submit(curRecorder.dirName, curRecorder.recorderName, curRecorder.recorderLink, curRecorder.timeV, curRecorder.tags,curRecorder.tid)
                    recorderPool.splice(curRecorderIndex, 1);
                }
            });
    }
    while (pool.length >= 1) {
        recorderPool.push(new Recorder(pool.pop()))
    }
}, 300000);

process.on("SIGINT", () => {
    console.log("Receive exit signal, clear the Interval, exit process.\nThe process exits when the upload task is complete.")
    recorderPool.forEach((elem: Recorder) => {
        elem.stopRecord()
    })
    clearInterval(timer)
})


const submit = (dirName: string, roomName: string, roomLink: string, timeV: string, tags: string[], tid: Number) => {
    if (uploadStatus.get(dirName) === 1) {
        logger.info(`目录 ${dirName} 正在上传中，避免重复上传，取消此次上传任务`)
        return
    }
    uploadStatus.set(dirName, 1)
    upload2bilibili(dirName, `${roomName} ${timeV}录播`, ` 本录播由StreamerHelper强力驱动:  https://github.com/ZhangMingZhao1/StreamerHelper，对您有帮助的话，求个star`, tags, roomLink, tid)
        .then((message) => {
            uploadStatus.set(dirName, 0)
            logger.info(message)
            try {
                deleteFolder(dirName)
                logger.info(`删除本地文件 ${dirName}`)
            } catch (err) {
                logger.error(`稿件 ${dirName} 删除本地文件失败：${err}`)
            }
        })
        .catch(err => {
            uploadStatus.set(dirName, 0)
            logger.error(`稿件 ${dirName} 投稿失败：${err}`)
        })
}