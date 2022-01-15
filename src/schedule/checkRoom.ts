import * as dayjs from "dayjs";
import * as chalk from 'chalk'

import { getStreamUrl } from "@/engine/getStreamUrl";
import { RoomStatus } from "@/engine/roomStatus";
import { log4js } from "@/log";
import { Scheduler } from "@/type/scheduler";
import { Recorder } from "@/engine/message";
import { RecorderTask } from "@/type/recorderTask";

const roomCheckTime = global.config.StreamerHelper.roomCheckTime
const checkTime = roomCheckTime ? roomCheckTime * 1000 : 10 * 60 * 1000
const rooms = global.config.streamerInfo;
const logger = log4js.getLogger(`checkRoom`)
const loggerCheck = log4js.getLogger(`check`)
const interval = checkTime

export default new Scheduler(interval, async function () {

    loggerCheck.info(`Start checkRoom. Interval ${interval / 1000}s`)
    loggerCheck.debug(`Rooms ${JSON.stringify(rooms, null, 2)}`)

    for (const room of rooms) {
        let curRecorder: Recorder | undefined;
        let curRecorderText: string = ''
        let curRecorderIndex: number | undefined
        logger.info(`正在检查直播 ${chalk.red(room.name)} ${room.roomUrl}`)

        global.app.recorderPool.forEach((recorder: Recorder, index: number) => {
            if (recorder.recorderName === room.name) {
                curRecorder = recorder
                curRecorderIndex = index
                curRecorderText = getTipsString(curRecorder) + curRecorderText
            }
        })

        const recorderTask: RecorderTask = {
            streamerInfo: room,
            timeV: "",
            dirName: "",
            recorderName: room.name,
            streamUrl: "",
        };

        try {
            recorderTask.streamUrl = await getStreamUrl(room.roomUrl)

            logger.debug(`stream ${JSON.stringify(recorderTask, null, 2)}`)
            // start a recorder
            if (RoomStatus.get(room.name) !== 1 && !curRecorder) {
                RoomStatus.set(room.name, 1)
                const tmp = new Recorder(recorderTask)
                tmp.startRecord(recorderTask)
                global.app.recorderPool.push(tmp)
            } else if (curRecorder?.recorderStat() === false) {
                logger.info(`下载流 ${curRecorder.dirName} 断开，但直播间在线，重启`)
                curRecorder.startRecord(recorderTask)
            }
        } catch (e) {
            // room offline
            // it is time to submit
            RoomStatus.delete(room.name)
            // but the stream isn't disconnected
            // so stop the recorder before submit
            if (curRecorder?.recorderStat()) {
                curRecorder.stopRecord()
            }
            // 保证同一时刻一个直播间只有一个Recorder
            if (curRecorder) {
                logger.info(`Will delete Recorder ${curRecorder.dirName} ${curRecorder.recorderName} Index ${curRecorderIndex}`)
                const p = global.app.recorderPool.splice(curRecorderIndex as number, 1)
                logger.info(`Deleted recorder: ${p.length}`)
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
直播间名称 ${chalk.red(curRecorder.recorderName)}
直播间地址 ${curRecorder.recorderLink}
时间 ${chalk.cyan(curRecorder.timeV)}
是否删除本地文件 ${curRecorder.deleteLocalFile ? chalk.yellow('是') : chalk.red('否')}
是否上传本地文件 ${curRecorder.uploadLocalFile ? chalk.yellow('是') : chalk.red('否')} 
`
    }
})