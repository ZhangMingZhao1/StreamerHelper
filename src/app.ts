import { downloadStream } from "./engine/message";
import { getRoomArrInfo } from "./util/utils";
import { StreamInfo } from "type/getStreamInfo";
import { getStreamUrl } from "./engine/getUrl";
import { liveStatus } from "./engine/liveStatus"
//0 不在线 1 在线
let pool: any = []
let RoomIds = getRoomArrInfo(require('../templates/info.json').streamerInfo);
const timer = setInterval(() => {
    // console.log(liveStatus)
    // console.log(RoomIds)

    for (let RoomId of RoomIds) {
        getStreamUrl(RoomId.roomTitle,RoomId.roomLink)
            .then((stream: StreamInfo) => {
                // console.log(stream)
                if (liveStatus.get(RoomId.roomLink) !== 1) {
                    liveStatus.set(RoomId.roomLink, 1)
                    pool.push(stream)
                }
            })
            .catch(() => {
                // console.log(err)
                liveStatus.set(RoomId.roomLink, 0)
            });
    }

    if (pool.length >= 1) {
        downloadStream(pool.pop())
    }
}, 30000);
process.on("SIGINT", () => {
    console.log("接收到退出指令，清除定时器\n等待上传完成后，进程自动退出")
    clearInterval(timer)
})