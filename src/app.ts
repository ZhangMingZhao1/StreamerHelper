import * as dayjs from 'dayjs';
import * as fs from 'fs';
import { join } from 'path';
import { getRoomArrInfo, emitter } from './util/utils';
import { StreamInfo } from 'type/StreamInfo';
import { getStreamUrl } from './engine/getStreamUrl';
import { RoomStatus } from './engine/RoomStatus';
import { Recorder } from './engine/message';
import { upload2bilibili } from './uploader/caller';
import { uploadStatus } from './uploader/uploadStatus';
import { deleteFolder } from './util/utils';
import { memoryInfo } from './util/memory';
import { logger, memoryLogger } from './log';
const chalk = require('chalk');
const checkTime =
    parseInt(
        String(
            require('../templates/info.json').StreamerHelper.roomCheckTime *
                1000
        )
    ) || 120000;

const Rooms = getRoomArrInfo(require('../templates/info.json').streamerInfo);

let recorderPool: Recorder[] = [];

// event of stream disconnected
emitter.on('streamDiscon', (curRecorder: Recorder) => {
    recorderPool.forEach((elem: Recorder) => {
        if (elem.recorderName === curRecorder.recorderName) {
            curRecorder = elem;
        }
    });

    setTimeout(() => {
        getStreamUrl(
            curRecorder.recorderName,
            curRecorder.recorderLink,
            curRecorder.tags,
            curRecorder.tid
        )
            .then((stream: StreamInfo) => {
                // the stream disconnected
                // but room online
                let timeNow = dayjs().format('YYYY-MM-DD');
                if (timeNow !== curRecorder.timeV) {
                    logger.info(`日期改变，上传前一天的录播文件`);
                    if (curRecorder.uploadLocalFile)
                        submit(
                            curRecorder.dirName,
                            curRecorder.recorderName,
                            curRecorder.recorderLink,
                            curRecorder.timeV,
                            curRecorder.tags,
                            curRecorder.tid,
                            curRecorder.deleteLocalFile
                        );
                    else {
                        logger.info(`读取用户配置，取消上传`);
                    }
                }
                // so restart the recorder
                // continue downloading
                logger.info(
                    `下载流 ${curRecorder.dirName} 断开，但直播间在线，重启`
                );
                curRecorder.startRecord(stream);
            })
            .catch(() => {
                RoomStatus.set(curRecorder.recorderName, 0);
            });
    }, 5000);
});

const F = () => {
    let curRecorderText: string = '';
    for (let room of Rooms) {
        console.log(
            `正在检查直播 ${chalk.red(room.roomName)} ${room.roomLink}`
        );
        let curRecorder: Recorder;
        let curRecorderIndex: number;
        // get current Recorder
        recorderPool.forEach((elem: Recorder, index: number) => {
            if (elem.recorderName === room.roomName) {
                curRecorder = elem;
                curRecorderIndex = index;
                curRecorderText =
                    `
    直播间名称 ${chalk.red(curRecorder.recorderName)}
    直播间地址 ${curRecorder.recorderLink}
    时间 ${chalk.cyan(curRecorder.timeV)}
    是否删除本地文件 ${
        curRecorder.deleteLocalFile ? chalk.yellow('是') : chalk.red('否')
    }
    是否上传本地文件 ${
        curRecorder.uploadLocalFile ? chalk.yellow('是') : chalk.red('否')
    } 
` + curRecorderText;
                logger.trace(
                    `curRecorder: ${JSON.stringify(
                        curRecorder,
                        null,
                        2
                    )} curRecorderIndex: ${JSON.stringify(
                        curRecorderIndex,
                        null,
                        2
                    )}`
                );
            }
        });
        getStreamUrl(room.roomName, room.roomLink, room.roomTags, room.roomTid)
            .then((stream: StreamInfo) => {
                logger.debug(`stream ${JSON.stringify(stream, null, 2)}`);
                if (RoomStatus.get(room.roomName) !== 1) {
                    RoomStatus.set(room.roomName, 1);
                    stream.deleteLocalFile = room.deleteLocalFile;
                    stream.uploadLocalFile = room.uploadLocalFile;
                    recorderPool.push(new Recorder(stream));
                } else if (curRecorder.ffmpegProcessEnd) {
                    recorderPool.push(new Recorder(stream));
                }
            })
            .catch(() => {
                // room offline
                // it is time to submit
                RoomStatus.set(room.roomName, 0);
                if (curRecorder) {
                    // but the stream isn't disconnected
                    // so stop the recorder before submit
                    setTimeout(() => {
                        if (curRecorder.recorderStat()) {
                            curRecorder.stopRecord();
                        }
                        // submit
                        if (curRecorder.uploadLocalFile) {
                            logger.debug(`curRecorder ${curRecorder}`);
                            logger.info(`准备投稿 ${curRecorder.recorderName}`);
                            submit(
                                curRecorder.dirName,
                                curRecorder.recorderName,
                                curRecorder.recorderLink,
                                curRecorder.timeV,
                                curRecorder.tags,
                                curRecorder.tid,
                                curRecorder.deleteLocalFile
                            );
                        } else {
                            logger.info(`读取用户配置，取消上传`);
                        }
                        recorderPool.splice(curRecorderIndex, 1);
                    }, 5000);
                }
            });
    }

    if (curRecorderText)
        curRecorderText += `
    检测间隔 ${chalk.yellow(`${checkTime / 1000}s`)}
    系统时间 ${chalk.green(dayjs().format('YYYY-MM-DD hh:mm:ss'))}
    `;
    console.log(curRecorderText);
};

const submit = (
    dirName: string,
    roomName: string,
    roomLink: string,
    timeV: string,
    tags: string[],
    tid: Number,
    deleteLocalFile: Boolean
) => {
    logger.debug(`submit uploadStatus: ${uploadStatus}`);
    if (uploadStatus.get(dirName) === 1) {
        logger.error(
            `目录 ${dirName} 正在上传中，避免重复上传，取消此次上传任务`
        );
        return;
    }
    uploadStatus.set(dirName, 1);
    upload2bilibili(
        dirName,
        `${roomName} ${timeV}录播`,
        ` 本录播由StreamerHelper强力驱动:  https://github.com/ZhangMingZhao1/StreamerHelper，对您有帮助的话，求个star`,
        tags,
        roomLink,
        tid
    )
        .then((message) => {
            uploadStatus.set(dirName, 0);
            logger.info(message);
            if (deleteLocalFile) {
                try {
                    deleteFolder(dirName);
                    logger.info(`删除本地文件 ${dirName}`);
                } catch (err) {
                    logger.error(`稿件 ${dirName} 删除本地文件失败：${err}`);
                }
            } else {
                logger.info(`读取用户配置，取消删除本地文件`);
            }
        })
        .catch((err) => {
            uploadStatus.set(dirName, 0);
            logger.error(`稿件 ${dirName} 投稿失败：${err}`);
        });
};

// 启动时检测所有未上传文件
const cwd = process.cwd();
const downloadFolder = join(cwd, '/download');
const streamerFolders = fs.readdirSync(downloadFolder);

streamerFolders.forEach((streamerFolderName) => {
    // 获取对应的直播间对象
    const roomObj = Rooms.find((item) => item.roomName === streamerFolderName);
    if (!roomObj || !roomObj.uploadLocalFile) return;
    const streamerFolderPath = join(downloadFolder, streamerFolderName);
    const videoFolders = fs.readdirSync(streamerFolderPath);
    videoFolders.forEach((videoFolderName) => {
        const videoFolderPath = join(streamerFolderPath, videoFolderName);
        logger.info(`检测到未上传稿件 ${videoFolderPath}，即将上传`);
        // 中间文件名
        const newVideoFolderPath =
            videoFolderPath +
            `-intermediate-${Math.random().toString(36).substring(2)}`;
        try {
            fs.renameSync(videoFolderPath, newVideoFolderPath);
        } catch (err) {
            logger.error(`重命名文件夹 ${videoFolderPath} 失败：${err}`);
        }
        submit(
            newVideoFolderPath,
            roomObj.roomName,
            roomObj.roomLink,
            videoFolderName,
            roomObj.roomTags,
            roomObj.roomTid,
            roomObj.deleteLocalFile ? true : false
        );
    });
});

F();

const timer = setInterval(F, 120000);

process.on('SIGINT', () => {
    console.log('Receive exit signal, the process will exit after 3 seconds.');
    logger.info('Process exited by user.');
    clearInterval(timer);
    emitter.removeAllListeners('streamDiscon');
    recorderPool.forEach((elem: Recorder) => {
        elem.stopRecord();
    });
    setTimeout(() => {
        process.exit();
    }, 3000);
});

setInterval(() => {
    memoryLogger.info(`${new Date().toLocaleString()}: ${memoryInfo}`);
}, 10000);
