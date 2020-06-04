import axios from "axios";
import fs from "fs-extra";

function getHuyaSteam(roomId: string) {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.huya.com/${roomId}`).then(data => {
      if (data.data) {
        console.log("huyaHTML获取成功");
        const huyaHTML = data.data;
        if (typeof huyaHTML === "string") {
          const regRes = /"stream": ({.+?})\s*}/.exec(huyaHTML);
          //  console.log('{'+regRes[0]);
          const infoObj = JSON.parse("{" + regRes[0])["stream"];
          //  console.log(infoObj);
          if (infoObj["status"] == 200) {
            console.log("当前连接在线");
            const room_info = infoObj["data"][0]["gameLiveInfo"];
            const streamerName = room_info["nick"];
            // console.log("streamerName", streamerName);
            const len = infoObj["data"][0]["gameStreamInfoList"].length;
            let streamArr = [];
            for (let i = 0; i < len; i++) {
              const stream_info = infoObj["data"][0]["gameStreamInfoList"][i];
              // console.log(stream_info);
              const sHlsUrl = stream_info["sHlsUrl"];
              // console.log('sHlsUrl',sHlsUrl);
              const sStreamName = stream_info["sStreamName"];
              const sHlsUrlSuffix = stream_info["sHlsUrlSuffix"];
              const sHlsAntiCode = stream_info["sHlsAntiCode"];
              const resStream = `${sHlsUrl}/${sStreamName}.${sHlsUrlSuffix}?${sHlsAntiCode}`;

              streamArr.push(resStream);
            }
            const tsStream = streamArr.filter((v, k) => {
              // console.log(v.substr(7,2));
              return v.substr(7, 2) === "tx";
            });
            console.log(tsStream[0]);
            resolve({ steamUrl: tsStream[0], streamName: streamerName });
          } else {
            reject("不在线");
          }
        }
      } else {
        reject("data.data没数据");
      }
    });
  });
}

export default getHuyaSteam;
