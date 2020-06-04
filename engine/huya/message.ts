const log4js = require("log4js");
const dayjs = require("dayjs");
const rootPath = process.cwd();
const { ipcMain, ipcRenderer } = require("electron");
const { spawn } = require("child_process");
import getHuya from "./getHuyaStreamUrl";
log4js.configure({
  appenders: {
    cheese: {
      type: "file",
      filename: rootPath + "/logs/artanis.log",
      maxLogSize: 20971520,
      backups: 10,
      encoding: "utf-8"
    }
  },
  categories: { default: { appenders: ["cheese"], level: "info" } }
});

const logger = log4js.getLogger("message");

export default () => {
  // 虎牙消息监听
  const pool: any = [];
  ipcMain.on("asynchuya-message", (event, huyaRoomId) => {
    console.log("huyaRoomId: ", huyaRoomId); // prints "ping"
    if (huyaRoomId !== "stop") {
      getHuya(huyaRoomId).then(
        (stream: { streamUrl: string; streamName: string }) => {
          // const cmd = `ffmpeg -i "${streamUrl}" -f mp4 res.MP4`;
          // 命名加上时间戳
          const timeV = dayjs().format("YYYY-MM-DD");
          const cmd = `ffmpeg`;
          const huyaApp = spawn(cmd, [
            "-i",
            stream.streamUrl,
            "-f",
            "mp4",
            huyaRoomId + `${timeV}res.MP4`
          ]);
          // 发送
          event.sender.send("processInfo", {
            pid: huyaApp.pid,
            name: stream.streamName
          });

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
        }
      );
    } else {
      if (pool.length) {
        pool[0].kill();
        logger.error(`手动关闭了下载`);
      }
    }
  });

  // ipcMain.on('asynchuya-stop-message', (event,message)=> {
  //   console.log(message);
  //   const cmd = 'kill SIGTERM'
  //   // if(message==='stop') {
  //   //   exec(cmd, (err:any, stdout:any, stderr:any)=>{
  //   //     if(err) {
  //   //       console.log(err);
  //   //     }
  //   //     console.log('stdout', stdout)
  //   //     console.log('stderr', stderr);
  //   //   })
  //   // }
  // })
};
