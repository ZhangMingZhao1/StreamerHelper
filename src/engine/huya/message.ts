const log4js = require("log4js");
const dayjs = require("dayjs");
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
      const huyaApp = spawn(cmd, [
        "-i",
        stream.streamUrl,
        "-f",
        "mp4",
        `${huyaRoomTitle}-${timeV}-res.MP4`,
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
    })
    .catch((errorInfo) => {
      console.log("errorInfo", errorInfo);
    });
};
