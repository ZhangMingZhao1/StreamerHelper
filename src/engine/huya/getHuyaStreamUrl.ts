import axios from "axios";
import { HuyaStreamInfo } from "type/getHuya";

function getHuyaSteam(url: string): Promise<HuyaStreamInfo> {
  return new Promise((resolve, reject) => {
    axios
      .get(`${url}`)
      .then((data: any) => {
        if (data.data) {
          // console.log("huyaHTML获取成功");
          const huyaHTML = data.data;
          if (typeof huyaHTML === "string") {
             const regRes: any = huyaHTML.split("hyPlayerConfig =")[1].split("};")[0] + "}";
            if (regRes && JSON.parse(regRes)["stream"]) {
                const infoObj = JSON.parse(Buffer.from((JSON.parse(regRes)["stream"]),'base64').toString());
                const streamInfoList = infoObj.data[0].gameStreamInfoList;
                const streamerName = infoObj["data"][0]["gameLiveInfo"]["nick"];
                const urlInfo1 = streamInfoList[0];
                //const urlInfo2 = streamInfoList[1];

                //可以得到六种链接，m3u8链接最稳定
                //console.log("阿里的CDN");
                const aliFLV = urlInfo1["sFlvUrl"] + "/" + urlInfo1["sStreamName"] + ".flv?" + urlInfo1["sFlvAntiCode"];
                // const aliHLS = urlInfo1["sHlsUrl"] + "/" + urlInfo1["sStreamName"] + ".m3u8?" + urlInfo1["sHlsAntiCode"];
                //const aliP2P = urlInfo1["sP2pUrl"] + "/" + urlInfo1["sStreamName"] + ".slice?" + urlInfo1["newCFlvAntiCode"];

                //console.log("腾讯的CDN");
                //const txFLV = urlInfo2["sFlvUrl"] + "/" + urlInfo2["sStreamName"] + ".flv?" + urlInfo2["sFlvAntiCode"];
                //const txHLS = urlInfo2["sHlsUrl"] + "/" + urlInfo2["sStreamName"] + ".m3u8?" + urlInfo2["sHlsAntiCode"];
                //const txP2P = urlInfo2["sP2pUrl"] + "/" + urlInfo2["sStreamName"] + ".slice?" + urlInfo2["newCFlvAntiCode"];

                resolve({ streamUrl: aliFLV.replace("amp;",""), streamName: streamerName });

            }else{
                reject("不在线");
            }
          }
        } else {
          reject("data.data没数据");
        }
      })
      .catch((err) => {
        console.log("axios.get error", err);
      });
  });
}

export default getHuyaSteam;
