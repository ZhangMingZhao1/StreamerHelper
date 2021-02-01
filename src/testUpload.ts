import {upload2bilibili} from "./uploader/caller";
import {uploadStatus} from "./uploader/uploadStatus";
import {logger} from "./log";
const dirName = '/Users/zsnmwy/code/StreamerHelper/download/MrH4U/2021-01-31'
const tags = [
    "英雄联盟",
    "电子竞技",
    "iG"
]
const roomLink = 'https://live.bilibili.com/12563070'
const tid = 121
upload2bilibili(dirName, `测试录播`, ` 测试的稿件描述`, tags, roomLink, tid)
    .then((message) => {
        uploadStatus.set(dirName, 0)
        logger.info(message)
    })
    .catch(err => {
        uploadStatus.set(dirName, 0)
        logger.error(`稿件 ${dirName} 投稿失败：${err}`)
    })
