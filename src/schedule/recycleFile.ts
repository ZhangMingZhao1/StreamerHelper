// 定时回收文件以及处理上传失败的文件夹
import { log4js } from "@/log";
import * as fs from "fs";
const FileHound = require('filehound')
import { join } from 'path'

import { FileStatus } from "@/type/fileStatus";
import { deleteFolder } from "@/util/utils";
import { uploadStatus } from "@/uploader/uploadStatus";
import { uploader } from "@/uploader";
import { StreamInfo } from "@/type/streamInfo";
import { RoomStatusPath } from "@/engine/roomPathStatus";
import { Scheduler } from "@/type/scheduler";
const logger = log4js.getLogger(`recycleFile`);
const recycleCheckTime = require("../../templates/info.json").recycleCheckTime
const interval = recycleCheckTime ? recycleCheckTime * 1000 : 5 * 60 * 1000
// const interval = 1000 * 20
export default new Scheduler(interval, async function () {
    logger.info(`Task recycleFile Start ...`)

    function _deleteLocalFile(obj: FileStatus) {
        logger.info(`Try to delete local directory: ${obj.path}`)

        if (!obj.path) throw (`NOT FOUND THE FILE PATH`);
        if (RoomStatusPath.get(obj.path) === 1) throw (`该目录正在存放录制文件 跳过 ${obj.recorderName} ${obj.path}`);

        if (uploadStatus.get(obj.path) === 1) throw (`该目录正在上传 跳过 ${obj.recorderName} ${obj.path}`)

        if (!obj.endRecordTime) {
            logger.info(`Not Fount endRecordTime... Use startRecordTime ${obj.startRecordTime} to replace`)
            obj.endRecordTime = obj.startRecordTime
        }

        const curTime = Math.floor((new Date().valueOf() - new Date(obj.endRecordTime as Date).valueOf()) / (1000 * 60 * 60 * 24))
        const delayTime = obj.delayTime ?? require('../../templates/info.json').StreamerHelper.delayTime ?? 2

        if (curTime >= delayTime && obj.isPost) {
            logger.info(`Time to delete file ${obj.path}`)
            try {
                deleteFolder(obj.path || '')
                logger.info(`Directory deleted successfully: ${obj.path}`)
            } catch (e) {
                throw (`Failed to delete directory: ${obj.path},error: ${e}`)
            }
        }
    }

    function _uploadLocalFile(obj: FileStatus) {

        logger.info(`Try to upload local directory: ${obj.path}`)

        if (!obj.path) throw (`NOT FOUND THE FILE PATH`);

        if (RoomStatusPath.get(obj.path) === 1) throw (`该目录正在存放录制文件，跳过 ${obj.recorderName} ${obj.path}`);

        if (uploadStatus.get(obj.path) === 1) throw (`该目录正在上传，跳过 ${obj.recorderName} ${obj.path}`)

        let stream: StreamInfo = {
            copyright: obj.copyright,
            deleteLocalFile: obj.deleteLocalFile,
            desc: obj.desc,
            dirName: obj.path,
            dynamic: obj.dynamic,
            roomLink: obj.recorderLink || '',
            roomName: obj.recorderName || '',
            roomTags: obj.tags || [],
            roomTid: obj.tid || 0,
            source: obj.source,
            streamUrl: '',
            templateTitle: obj.templateTitle,
            uploadLocalFile: obj.uploadLocalFile,
            timeV: obj.timeV
        }


        logger.info(`NEW Upload Task ${stream.roomName} ${stream.dirName}`);
        const uploadTask = new uploader(stream)
        uploadTask.upload()
            .catch((e) => {
                logger.error(e)
            })
            .finally(() =>
                uploadStatus.delete(stream.dirName as string)
            )

    }

    const files: string[] = await FileHound.create()
        .paths(join(process.cwd(), "/download"))
        .match('fileStatus.json')
        .ext('json')
        .find();

    if (!files) return

    for (const file of files) {
        const text = fs.readFileSync(file)
        const obj: FileStatus = JSON.parse(text.toString())

        logger.debug(`fileStatus: ${file} ${JSON.stringify(obj, null, 2)}`)
        try {
            //  Check uploadLocalFile
            if (obj.uploadLocalFile && !obj.isPost) _uploadLocalFile(obj)
        } catch (e) {
            logger.error(e)
        }

        try {
            //  Check deleteLocalFile
            if (obj.deleteLocalFile) _deleteLocalFile(obj)
        } catch (e) {
            logger.error(e)
        }

    }
})