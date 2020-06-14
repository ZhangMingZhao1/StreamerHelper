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
  //分P文件的大小,   1000约等于1KB
  const onePSize = 100000000; //100MB
  // 虎牙消息监听
  const pool: any = [];
  let huyaRoomId = getRoomArrInfo(infoJson.streamerInfo)[0].roomLink;
  let huyaRoomTitle = getRoomArrInfo(infoJson.streamerInfo)[0].roomTitle;
  console.log("huyaRoomId: ", huyaRoomId); // prints "ping"

  getHuya(huyaRoomId)
    .then((stream: HuyaStreamInfo) => {
      // const cmd = `ffmpeg -i "${streamUrl}" -f mp4 res.MP4`;
      // 命名加上时间戳
      const timeV = dayjs().format("YYYY-MM-DD");
      const cmd = `ffmpeg`;

      //循环执行获取命令 扩展名前加序号
      //暂时还没写退出for循环判断
      for (let i = 1; true; i++) {
        const fileName: string = `${huyaRoomTitle}-${timeV}-res-${i}.MP4`;
        console.log(fileName);
        //伪装了请求头，避免服务器返回403
        const fakeUA: string =
          "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36\r\n";
        const fakeX: string = "X-Forwarded-For: 14.223.23.12\r\n";
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

        process.on("exit", function () {
          huyaApp.stdin.end("q");
        });

        //计时变量
        let startTime = Date.now();
        //文件大小池
        let fileSizePool: any[] = [];
        //文件是否存在池
        let fileBool: Boolean[] = [];
        (function () {
          while (true) {
            //手动耗时5秒，每过5秒运行一次判断
            while (Date.now() - startTime > 5000) {
              startTime = Date.now();
              //文件是否存在
              console.log(fs.existsSync(fileName));
              fileBool.push(fs.existsSync(fileName));
              //如果超过10次判断，文件都不存在，则减少i的值，重复这次for循环
              if (fileBool.length > 10 && !fileBool[fileBool.length - 1]) {
                i--;
                huyaApp.stdin.end("q");
                return;
              }

              if (fs.existsSync(fileName)) {
                const fileSize = fs.statSync(fileName).size;
                fileSizePool.push(fileSize);
                //如果文件大小一直未改变，则说明直播流断开（或者网络断开），可以进行下次循环
                if (
                  fileSizePool.length > 10 &&
                  fileSizePool[fileSizePool.length - 1] ==
                    fileSizePool[fileSizePool.length - 6]
                ) {
                  huyaApp.stdin.end("q");
                  //process.exit();
                  return;
                }
                logger.info(`${fileName} 文件大小 ${fileSize}`);
                //文件大小
                console.log(`文件大小 ${fileSize}`);
                //分P大小判断，文件大于XXX，进入下次循环
                if (fileSize > onePSize) {
                  huyaApp.stdin.end("q");
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
