const log4js = require("log4js");
const dayjs = require("dayjs");
const fs = require("fs");
const infoJson = require("../../../templates/info.json");
import {getRoomArrInfo} from "../../util/utils";
import {HuyaStreamInfo} from "type/getHuya";

const rootPath = process.cwd();
const {spawn} = require("child_process");
import getHuya from "./getHuyaStreamUrl";

log4js.configure({
    appenders: {
        cheese: {
            type: "file",
            filename: rootPath + "/logs/artanis.log",
            maxLogSize: 20971520,
            backups: 10,
            encoding: "utf-8",
        },
    },
    categories: {default: {appenders: ["cheese"], level: "info"}},
});

const logger = log4js.getLogger("message");

export const getHuyaSteam = () => {
    // 虎牙消息监听
    const pool: any = [];
    let huyaRoomId = getRoomArrInfo(infoJson.streamerInfo)[0].roomLink;
    let huyaRoomTitle = getRoomArrInfo(infoJson.streamerInfo)[0].roomTitle;
    console.log("huyaRoomId: ", huyaRoomId); // prints "ping"

    getHuya(huyaRoomId)
        .then((stream: HuyaStreamInfo) => {
            // const cmd = `ffmpeg -i "${streamUrl}" -f mp4 res.MP4`;
            // 命名加上时间戳
            // console.log("streamUrl", stream.streamUrl);
            const timeV = dayjs().format("YYYY-MM-DD");
            const cmd = `ffmpeg`;
            // console.log("11", huyaRoomId + `${timeV}res.MP4`);

            //循环执行获取命令 扩展名前加序号
            //暂时还没写退出for循环判断
            for (let i = 1; true; i++) {
                const fileName: string = `${huyaRoomTitle}-${timeV}-res-${i}.MP4`;
                console.log(fileName);
                const fakeUA:string =  "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36\r\n";
                const fakeX:string = "X-Forwarded-For: 14.223.23.12\r\n";
                console.log(stream.streamUrl);
                const huyaApp = spawn(cmd, [
                    "-headers",
                    fakeUA,
                    "-headers",
                    fakeX,
                    "-i",
                    stream.streamUrl,
                    "-f",
                    "mp4",
                    fileName,
                ]);
                // console.log("huyaApp", huyaApp);
                pool.push(huyaApp);
                huyaApp.stdout.on("data", (data: any) => {
                     //console.log(`stdout: ${data}`);
                    logger.info(data.toString("utf8"));
                });
                huyaApp.stderr.on("data", (data: any) => {
                     //console.error(`stderr: ${data}`);
                    logger.info(data.toString("utf8"));
                });
                huyaApp.on("close", (code: any) => {
                    // console.log(`子进程退出，退出码 ${code}`);
                    logger.info(`子进程退出，退出码 ${code}`);
                });
                process.on('SIGINT', () => {
                    //console.log('Received SIGINT. Close the child process.');
                    huyaApp.stdin.end('q', () => {
                        process.exit();
                    });
                });
                process.on( 'exit', function() {
                    console.log( "never see this log message" )
                })

                //当文件大小满足条件时，杀死进程，跳出while循环，进入下一次for循环
                let startTime = Date.now();
                let fileSizePool:any[] = [];
                let fileBool:Boolean[] = [];
                (function(){
                while (true) {
                    //手动耗时5秒
                    while (Date.now() - startTime > 5000) {
                        startTime = Date.now();
                        //文件是否存在
                        console.log(fs.existsSync(fileName));
                        fileBool.push(fs.existsSync(fileName));
                        if (fileBool.length >10 && fileBool[fileBool.length-1]==false){
                            i--;
                            return;
                        }
                        if (fs.existsSync(fileName)) {
                            const fileSize = fs.statSync(fileName).size;
                            fileSizePool.push(fileSize);
                            if (fileSizePool.length >10 && fileSizePool[fileSizePool.length-1]==fileSizePool[fileSizePool.length-6]){
                                return;
                            }
                            logger.info(`${fileName} 文件大小 ${fileSize}`);
                            console.log(`文件大小 ${fileSize}`);
                            //大于10MB分P
                            if (fileSize > 10000000) {
                                //TODO:关闭方式错误
                                huyaApp.kill("SIGINT");
                                spawn(cmd, ["q"]);
                                //huyaApp.kill();
                                console.log(`已关闭 P${i} 进程`);
                                return;
                            }
                        }
                    }
                }
                })();
            }
        })
        .catch((errorInfo) => {
            console.log("errorInfo", errorInfo);
        });
};
