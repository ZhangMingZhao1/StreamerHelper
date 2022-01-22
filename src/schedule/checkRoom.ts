import * as dayjs from "dayjs";
import * as chalk from 'chalk'

import { getStreamUrl } from "@/engine/getStreamUrl";
import { RoomStatus } from "@/engine/roomStatus";
import { getExtendedLogger } from "@/log";
import { Scheduler } from "@/type/scheduler";
import { Recorder } from "@/engine/message";
import { RecorderTask } from "@/type/recorderTask";

const roomCheckTime = global.config.StreamerHelper.roomCheckTime
const checkTime = roomCheckTime ? roomCheckTime * 1000 : 10 * 60 * 1000
const rooms = global.config.streamerInfo;
const logger = getExtendedLogger(`checkRoom`)
const loggerCheck = getExtendedLogger(`check`)
const interval = checkTime

export default new Scheduler(interval, async function () {

    loggerCheck.info(`Start checkRoom. Interval ${interval / 1000}s`)
    loggerCheck.debug(`Rooms ${JSON.stringify(rooms, null, 2)}`)
    loggerCheck.debug(`recorderPool: ${JSON.stringify(global.app.recorderPool)}`)

    for (const room of rooms) {
        let curRecorder: Recorder | undefined;
        let curRecorderText: string = ''
        logger.info(`正在检查直播 ${chalk.red(room.name)} ${room.roomUrl}`)

        if (global.app.recorderPool.has(room.name)) {
            logger.debug(`global.app.recorderPool.has ${room.name}`)
            curRecorder = global.app.recorderPool.get(room.name)
            curRecorderText = getTipsString(curRecorder!) + curRecorderText
        }

        const recorderTask: RecorderTask = {
            streamerInfo: room,
            timeV: "",
            dirName: "",
            recorderName: room.name,
            streamUrl: "",
        };

        try {
            recorderTask.streamUrl = await getStreamUrl(room.roomUrl)
            // with no-error, the room online
            logger.debug(`stream ${JSON.stringify(recorderTask, null, 2)}`)
            if (RoomStatus.has(room.name)) {
                // 上次检测后认为房间在线
                if (curRecorder) {
                    if (curRecorder.recorderStat() === false) {
                        // 房间在线但是直播流断开，重启
                        logger.info(`下载流 ${curRecorder.recorderTask.dirName} 断开，但直播间在线，重启`)
                        curRecorder.startRecord(recorderTask.streamUrl)

                    } else if (curRecorder.recorderStat() === true) {
                        logger.debug(`${curRecorder.recorderTask.recorderName} 正在录制中...`)
                        // 正在录制中...
                    }
                } else {
                    // 之前认为在线，但不存在 Recorder，这种情况不应该出现
                    const tmp = new Recorder(recorderTask)
                    tmp.startRecord()
                    global.app.recorderPool.set(room.name, tmp)
                }
            } else {
                // 上次检测后认为房间不在线
                RoomStatus.set(room.name, 1)
                if (curRecorder) {
                    // 之前认为不在线，但存在 Recorder，这种情况不应该出现
                    // Recorder 可能未退出
                    curRecorder.kill()
                } else {
                    // start a new recorder
                    const tmp = new Recorder(recorderTask)
                    tmp.startRecord()
                    global.app.recorderPool.set(room.name, tmp)
                }
            }
        } catch (e) {
            // 房间不在线，进入投稿流程
            RoomStatus.delete(room.name)
            if (curRecorder) {
                if (curRecorder.recorderStat()) {
                    // 房间不在线，但仍在录制，先停止录制
                    curRecorder.stopRecord()
                }
                logger.info(`Will delete Recorder ${curRecorder.recorderTask.recorderName} ${curRecorder.recorderTask.recorderName}`)
                global.app.recorderPool.delete(curRecorder.recorderTask.recorderName)
                logger.info(`Deleted recorder: ${curRecorder.recorderTask.recorderName}`)
            }

        }
        if (curRecorderText)
            curRecorderText += `
检测间隔 ${chalk.yellow(`${interval / 1000}s`)}
系统时间 ${chalk.green(dayjs().format('YYYY-MM-DD hh:mm:ss'))}
`
        loggerCheck.info(curRecorderText);

    }
    function getTipsString(curRecorder: Recorder) {
        return `
直播间名称 ${chalk.red(curRecorder.recorderTask.recorderName)}
直播间地址 ${curRecorder.recorderTask.streamerInfo.roomUrl}
时间 ${chalk.cyan(curRecorder.recorderTask.timeV)}
是否删除本地文件 ${curRecorder.recorderTask.streamerInfo.deleteLocalFile ? chalk.yellow('是') : chalk.red('否')}
是否上传本地文件 ${curRecorder.recorderTask.streamerInfo.uploadLocalFile ? chalk.yellow('是') : chalk.red('否')} 
`
    }
})