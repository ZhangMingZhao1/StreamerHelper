const request = require("request");
const axios = require("axios");
const fs = require("fs-extra");
const log4js = require("log4js");
const cheerio = require("cheerio");
let logger = log4js.getLogger("app");

log4js.configure({
  appenders: {
    out: { type: "stdout" },
    app: { type: "file", filename: "info.log" }
  },
  categories: {
    // getLogger 参数为空时，默认使用该分类
    default: { appenders: ["out", "app"], level: "debug" }
  }
});

axios.get("https://www.huya.com/616527").then(data => {
  if (data.data) {
    logger.info("huyaHTML获取成功");
    const huyaHTML = data.data;
    // console.log(typeof huyaHTML);
    if (typeof huyaHTML === "string") {
      const regRes = /"stream": ({.+?})\s*}/.exec(huyaHTML);
      //  console.log('{'+regRes[0]);
      const infoObj = JSON.parse("{" + regRes[0])["stream"];
      //  console.log(infoObj);
      if (infoObj["status"] == 200) {
        logger.info("当前连接在线");
        const room_info = infoObj["data"][0]["gameLiveInfo"];
        const streamerName = room_info["nick"];
        const len = infoObj["data"][0]["gameStreamInfoList"].length;
        let cur = null;
        for (let i = 0; i < len; i++) {
          const stream_info = infoObj["data"][0]["gameStreamInfoList"][i];
          // console.log(stream_info);
          const sHlsUrl = stream_info["sHlsUrl"];
          const sStreamName = stream_info["sStreamName"];
          const sHlsUrlSuffix = stream_info["sHlsUrlSuffix"];
          const sHlsAntiCode = stream_info["sHlsAntiCode"];
          const resStream = `${sHlsUrl}/${sStreamName}.${sHlsUrlSuffix}?${sHlsAntiCode}`;
          if(i==0) {
            cur = resStream;
          }
          // console.log(resStream);
        }
        console.log(cur);
      }
    }
  }
  try {
    fs.outputFileSync("huya3.html", data.data);
  } catch (error) {
    logger.error("写html文件出错: \n" + error);
  }
});
