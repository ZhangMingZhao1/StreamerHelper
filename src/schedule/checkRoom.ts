import {Recorder} from "@/engine/message";
import {getStreamUrl} from "@/engine/getStreamUrl";
import {StreamInfo} from "type/StreamInfo";
import {RoomStatus} from "@/engine/RoomStatus";
import * as dayjs from "dayjs";
import {getRoomArrInfo} from "@/util/utils";
import {log4js} from "@/log";
import {RecorderType} from "type/RecorderType";
import {uploadStatus} from "@/uploader/uploadStatus";
import {RoomStatusPath} from "@/engine/RoomStatusPath";
const chalk = require('chalk');
const checkTime = parseInt(String(require('../../templates/info.json').StreamerHelper.roomCheckTime * 1000)) || 120000
const Rooms = getRoomArrInfo(require('../../templates/info.json').streamerInfo);
const logger = log4js.getLogger(`checkRoom`)
const loggerCheck = log4js.getLogger(`check`)
module.exports = {
    schedule: {
        interval: checkTime
    },
    // @ts-ignore
    task: async function (app) {
        logger.info(`RoomStatus ${JSON.stringify(RoomStatus, null, 2)} UploadStatus ${JSON.stringify(uploadStatus, null, 2)}`)
        console.log(RoomStatus);
        console.log(uploadStatus);
        logger.info(`Start checkRoom. Interval ${checkTime / 1000}s`)
        let curRecorderText: string = ''
        let curRecorder: any;
        let curRecorderIndex: number
        loggerCheck.debug(`Rooms ${JSON.stringify(Rooms, null, 2)}`)
        for (let room of Rooms) {
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
                denyTime: room.denyTime
            };

            try {
                const tmpStream = await getStreamUrl(room.roomName, room.roomLink, room.roomTags, room.roomTid)

                // Merge streamUrl
                stream = Object.assign(stream, tmpStream)

                logger.debug(`stream ${JSON.stringify(stream, null, 2)}`)

                if (RoomStatus.get(room.roomName) !== 1 || curRecorder.ffmpegProcessEnd) {
                    let tmp = new Recorder(stream)
                    tmp.startRecord(stream)
                    app.recorderPool.push(tmp)
                }
                if (RoomStatus.get(room.roomName) !== 1) {
                    RoomStatus.set(room.roomName, 1)
                }
                // console.log(`app.recorderPool`, app.recorderPool);
            } catch (e) {
                // room offline
                // it is time to submit
                RoomStatus.set(room.roomName, 0)
                if (curRecorder) {
                    // but the stream isn't disconnected
                    // so stop the recorder before submit
                    setTimeout(() => {
                        if (curRecorder.recorderStat()) {
                            curRecorder.stopRecord()
                        }
                        // submit
                        if (curRecorder.uploadLocalFile) {
                            app.schedule.recycleFile.task()
                        } else {
                            logger.info(`读取用户配置，取消上传`)
                        }
                        app.recorderPool.splice(curRecorderIndex, 1);
                    }, 25000);
                }
            }
        }

        if (curRecorderText) curRecorderText += `
    检测间隔 ${chalk.yellow(`${checkTime / 1000}s`)}
    系统时间 ${chalk.green(dayjs().format('YYYY-MM-DD hh:mm:ss'))}
    `

        loggerCheck.info(curRecorderText);
        loggerCheck.info(`RoomStatus ${JSON.stringify(RoomStatus, null, 2)} UploadStatus ${JSON.stringify(uploadStatus, null, 2)}`)
        console.log("RoomStatus",RoomStatus);
        console.log("uploadStatus", uploadStatus);
        console.log("RoomStatusPath", RoomStatusPath);

        function getTipsString(curRecorder: Recorder) {
            return `
    直播间名称 ${chalk.red(curRecorder.recorderName)}
    直播间地址 ${curRecorder.recorderLink}
    时间 ${chalk.cyan(curRecorder.timeV)}
    是否删除本地文件 ${curRecorder.deleteLocalFile ? chalk.yellow('是') : chalk.red('否')}
    是否上传本地文件 ${curRecorder.uploadLocalFile ? chalk.yellow('是') : chalk.red('否')} 
`
        }
    },

};
