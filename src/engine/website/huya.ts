const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        axios
            .get(url)
            .then(function (response: any) {
                const html: string = response.data;
                const reg: RegExp = /(?<=("stream":[\s]*"))(.+?)(?=("[\s]*\}))/g;
                const result: any = html.match(reg);
                if (result && result.length >= 1) {
                    const infoObj: any = JSON.parse(
                        Buffer.from(result[0], "base64").toString("ascii")
                    );
                    const streamInfoList: any =
                        infoObj.data[0].gameStreamInfoList;
                    //const streamerName = infoObj["data"][0]["gameLiveInfo"]["nick"];
                    const urlInfo1: any = streamInfoList[0];
                    //const urlInfo2 = streamInfoList[1];

                    //可以得到六种链接，m3u8链接最稳定
                    //console.log("阿里的CDN");
                    const aliFLV =
                        urlInfo1["sFlvUrl"] +
                        "/" +
                        urlInfo1["sStreamName"] +
                        ".flv?" +
                        urlInfo1["sFlvAntiCode"];
                    //const aliHLS:string = urlInfo1["sHlsUrl"] + "/" + urlInfo1["sStreamName"] + ".m3u8?" + urlInfo1["sHlsAntiCode"];
                    //const aliP2P = urlInfo1["sP2pUrl"] + "/" + urlInfo1["sStreamName"] + ".slice?" + urlInfo1["newCFlvAntiCode"];

                    //console.log("腾讯的CDN");
                    //const txFLV = urlInfo2["sFlvUrl"] + "/" + urlInfo2["sStreamName"] + ".flv?" + urlInfo2["sFlvAntiCode"];
                    //const txHLS = urlInfo2["sHlsUrl"] + "/" + urlInfo2["sStreamName"] + ".m3u8?" + urlInfo2["sHlsAntiCode"];
                    //const txP2P = urlInfo2["sP2pUrl"] + "/" + urlInfo2["sStreamName"] + ".slice?" + urlInfo2["newCFlvAntiCode"];
                    resolve(aliFLV.replace(/\amp\;/g, ""));
                } else {
                    reject(
                        "HUYA=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
