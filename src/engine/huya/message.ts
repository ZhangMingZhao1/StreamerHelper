const log4js = require("log4js");
const dayjs = require("dayjs");
const fs = require("fs");
const infoJson = require("../../../templates/info.json");
import { getRoomArrInfo } from "../../util/utils";
import { HuyaStreamInfo } from "type/getHuya";

const rootPath = process.cwd();
const { spawn } = require("child_process");
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
  categories: { default: { appenders: ["cheese"], level: "info" } },
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
        for (let i = 1;true;i++){
            const fileName:string = `${huyaRoomTitle}-${timeV}-res-${i}.MP4`;
            console.log(fileName);
            const huyaApp = new spawn(cmd, [
                "-i",
                stream.streamUrl,
                "-f",
                "mp4",
                fileName,
            ]);
            // console.log("huyaApp", huyaApp);
            pool.push(huyaApp);
            huyaApp.stdout.on("data", (data: any) => {
                // console.log(`stdout: ${data}`);
                logger.info(data.toString("utf8"));
            });
            huyaApp.stderr.on("data", (data: any) => {
                // console.error(`stderr: ${data}`);
                logger.info(data.toString("utf8"));
            });
            huyaApp.on("close", (code: any) => {
                // console.log(`子进程退出，退出码 ${code}`);
                logger.info(`子进程退出，退出码 ${code}`);
            });

            //当文件大小满足条件时，杀死进程，跳出while循环，进入下一次for循环
            while (true) {
                //手动耗时5秒
                let startTime = Date.now();
                while (Date.now() - startTime < 5000){
                }
                //文件是否存在
                console.log(fs.existsSync(fileName));
                if (fs.existsSync(fileName)) {
                    const fileSize = fs.statSync(fileName).size;
                    logger.info(`${fileName} 文件大小 ${fileSize}`);
                    console.log(`文件大小 ${fileSize}`);
                    //大于10MB分P
                    if (fileSize > 10000000) {
                        console.log(`关闭 P${1} 进程`);
                        //spawn('kill', [huyaApp.pid]);
                        //huyaApp.kill();不知道有木有用
                        huyaApp.stdin.end('q', () => {
                            process.exit();
                        });
                        break;
                    }
                }
            }

        }
    })
    .catch((errorInfo) => {
      console.log("errorInfo", errorInfo);
    });
};
