import { getHuyaStream } from "./message";
import { getRoomArrInfo } from "../../util/utils";
import { HuyaStreamInfo } from "type/getHuya";
import getHuya from "./getHuyaStreamUrl";
const fs = require('fs');
const path = require('path')
let { liveStatus } = require("../../type/liveStatus")
//0 不在线 1 在线
let pool: any = []
let infoFileName = path.join(process.cwd(), "/templates/info.json")
const timer = setInterval(async () => {
    // console.log(liveStatus)
    let huyaRoomIds = getRoomArrInfo(JSON.parse(fs.readFileSync(infoFileName)).streamerInfo);
    // console.log(huyaRoomIds)
    for (let huyaRoomId of huyaRoomIds) {
        await getHuya(huyaRoomId.roomLink)
            .then((stream: HuyaStreamInfo) => {
                // console.log(stream)
                if (liveStatus.get(huyaRoomId.roomLink) != 1) {
                    liveStatus.set(huyaRoomId.roomLink, 1)
                    pool.push(stream)
                }
            }).catch(() => {
                // console.log(err)
                liveStatus.set(huyaRoomId.roomLink, 0)
            });
    }
    if (pool.length >= 1) {
        getHuyaStream(pool.pop())
    }
}, 5000);
process.on("SIGINT", () => {
    console.log("接收到退出指令，清除定时器\n等待上传完成后，进程自动退出")
    clearInterval(timer)
})