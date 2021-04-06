import * as dayjs from "dayjs";
import * as chalk from 'chalk'

import { getStreamUrl } from "@/engine/getStreamUrl";
import { StreamInfo } from "@/type/streamInfo";
import { RoomStatus } from "@/engine/roomStatus";
import { getRoomArrInfo } from "@/util/utils";
import { log4js } from "@/log";
import { uploadStatus } from "@/uploader/uploadStatus";
import { RoomStatusPath } from "@/engine/roomPathStatus";
import { Scheduler } from "@/type/scheduler";
import { App } from "..";
import { RecorderType } from "@/type/recorderType";
import { Recorder } from "@/engine/message";

const checkTime = parseInt(String(require('../../templates/info.json').StreamerHelper.roomCheckTime * 1000)) || 120 * 1000
const rooms = getRoomArrInfo(require('../../templates/info.json').streamerInfo);
const logger = log4js.getLogger(`checkRoom`)
const loggerCheck = log4js.getLogger(`check`)
const interval = checkTime

export default new Scheduler(interval, async function (app: App) {
    if (app === undefined) {
        return
    }
    loggerCheck.info(`RoomStatus ${JSON.stringify(RoomStatus, null, 2)} UploadStatus ${JSON.stringify(uploadStatus, null, 2)}`)
    console.log(RoomStatus);
    console.log(uploadStatus);
    loggerCheck.info(`Start checkRoom. Interval ${interval / 1000}s`)
    let curRecorderText: string = ''
    let curRecorder: RecorderType | undefined;
    let curRecorderIndex: number | undefined
    loggerCheck.debug(`Rooms ${JSON.stringify(rooms, null, 2)}`)
    for (const room of rooms) {
        loggerCheck.info(`正在检查直播 ${chalk.red(room.roomName)} ${room.roomLink}`)
        // get current Recorder
        // console.log(`app.recorderPool`, app.recorderPool);
        app.recorderPool.forEach((elem: RecorderType, index: number) => {
            if (elem.recorderName === room.roomName) {
                curRecorder = elem
                curRecorderIndex = index
                curRecorderText = getTipsString(curRecorder) + curRecorderText
                logger.trace(`curRecorder: ${JSON.stringify(curRecorder, null, 2)} curRecorderIndex: ${JSON.stringify(curRecorderIndex, null, 2)}`)
            }
        })

        loggerCheck.debug(`room ${JSON.stringify(room, null, 2)}`)
        let stream: StreamInfo = {
            roomLink: room.roomLink,
            roomName: room.roomName,
            roomTags: room.roomTags,
            roomTid: room.roomTid,
            streamUrl: "",
            deleteLocalFile: room.deleteLocalFile,
            uploadLocalFile: room.uploadLocalFile,
            templateTitle: room.templateTitle,
            desc: room.desc,
            source: room.source,
            dynamic: room.dynamic,
            copyright: room.copyright,
            delayTime: room.delayTime
        };

        try {
            const tmpStream = await getStreamUrl(room.roomName, room.roomLink, room.roomTags, room.roomTid)

            // Merge streamUrl
            stream = Object.assign(stream, tmpStream)

            logger.debug(`stream ${JSON.stringify(stream, null, 2)}`)
            // start a recorder
            if (RoomStatus.get(room.roomName) !== 1 || curRecorder && curRecorder.ffmpegProcessEnd) {
                if (curRecorder) {
                    logger.info(`下载流 ${curRecorder.dirName} 断开，但直播间在线，重启`)
                    curRecorder.stopRecord()
                    app.recorderPool.splice(curRecorderIndex as number, 1)
                }
                RoomStatus.set(room.roomName, 1)
                const tmp = new Recorder(stream)
                tmp.startRecord(stream)
                app.recorderPool.push(tmp)
            }
            console.log(`app.recorderPool`, app.recorderPool);
        } catch (e) {
            // room offline
            // it is time to submit
            RoomStatus.delete(room.roomName)
            if (curRecorder) {
                // but the stream isn't disconnected
                // so stop the recorder before submit
                if (curRecorder.recorderStat()) {
                    curRecorder.stopRecord()
                }
                setTimeout(() => {
                    logger.info(`Room offline ${room.roomName}`)
                    // submit
                    if (curRecorder && curRecorder.uploadLocalFile) {
                        app.schedulers.recycleFile.scheduler.task(app)
                    } else {
                        logger.info(`读取用户配置，取消上传`)
                    }
                    app.recorderPool.splice(curRecorderIndex as number, 1);
                }, 25 * 1000);
            }

        }
    }

    if (curRecorderText)
        curRecorderText += `
检测间隔 ${chalk.yellow(`${interval / 1000}s`)}
系统时间 ${chalk.green(dayjs().format('YYYY-MM-DD hh:mm:ss'))}
`

    loggerCheck.info(curRecorderText);
    loggerCheck.info(`RoomStatus ${JSON.stringify(RoomStatus, null, 2)} UploadStatus ${JSON.stringify(uploadStatus, null, 2)}`)
    console.log("RoomStatus", RoomStatus);
    console.log("uploadStatus", uploadStatus);
    console.log("RoomStatusPath", RoomStatusPath);

    function getTipsString(curRecorder: RecorderType) {
        return `
直播间名称 ${chalk.red(curRecorder.recorderName)}
直播间地址 ${curRecorder.recorderLink}
时间 ${chalk.cyan(curRecorder.timeV)}
是否删除本地文件 ${curRecorder.deleteLocalFile ? chalk.yellow('是') : chalk.red('否')}
是否上传本地文件 ${curRecorder.uploadLocalFile ? chalk.yellow('是') : chalk.red('否')} 
`
    }
})