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
                    const streamInfoList: any =infoObj.data[0].gameStreamInfoList;
                    const huyacdn = 'AL';
                    const urlInfo1 = infoObj.data[0]['gameStreamInfoList'];
                    const urlInfo2 = infoObj.vMultiStreamInfo;
                    let ratio = urlInfo2[0]['iBitRate'];
                    const ibitrateList = [];
                    const sdisplaynameList = [];
                    urlInfo2.forEach((key) => {
						ibitrateList.push(key['iBitRate']);
						sdisplaynameList.push(key['sDisplayName']);
						if (sdisplaynameList.length > new Set(sdisplaynameList).size) {
							ratio = Math.max(ibitrateList);
						}
					});
                    let jsonstream = urlInfo1[0];
                    const jsonstream = urlInfo1.find(cdn => cdn['sCdnType'] === huyacdn);
                    const absurl = `${jsonstream["sFlvUrl"]}/${jsonstream["sStreamName"]}.${jsonstream["sFlvUrlSuffix"]}?${jsonstream["sFlvAntiCode"]}`;
                    const streamurl = html.unescape(absurl) + "&ratio=" + ratio;
                    resolve(streamurl.replace(/\amp\;/g, ""));
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
}sults:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
