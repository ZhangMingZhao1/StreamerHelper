const axios = require("axios");

import { randomInt } from "crypto";
const md5 = require('md5-node')

const processAnticode = (anticode: string, sStreamName: string): string => {
    const queryParamsMap: Map<string, string> = new Map()
    for (const queryParam of anticode.split('&')) {
        const [k, v] = queryParam.split('=')
        if (k === 'fm') {
            // decodedString example: DWq8BcJ3h6DJt6TY_$0_$1_$2_$3
            queryParamsMap.set('fm', Buffer.from(decodeURIComponent(v), "base64").toString('utf-8'))
        } else {
            queryParamsMap.set(k, v)
        }
    }
    const platformId = 100
    const uid = randomInt(12340000, 12349999)
    const convertUid = (uid << 8 | uid >>> (32 - 8)) >>> 0
    const seqid: number = uid + Date.now()
    const fs: string = queryParamsMap.get('fs')!
    const ctype: string = queryParamsMap.get('ctype')!
    const wsTime: string = queryParamsMap.get('wsTime')!
    const wsSecretHash: string = md5(`${seqid}|${ctype}|${platformId}`)
    // 构造 ws_secret_hash
    // $0 $1 $2 $3 分别替换为 convertUid、sStreamName、ws_secret_hash、wsTime
    let fm: string = queryParamsMap.get('fm')!
    fm = fm.replace('$0', convertUid.toString())
    fm = fm.replace('$1', sStreamName)
    fm = fm.replace('$2', wsSecretHash)
    fm = fm.replace('$3', queryParamsMap.get('wsTime')!)
    const wsSecret = md5(fm)
    return `wsSecret=${wsSecret}&wsTime=${wsTime}&seqid=${seqid}&ctype=${ctype}&ver=1&fs=${fs}&u=${convertUid}&t=${platformId}&sv=2401090219&sdk_sid=${Date.now()}&codec=264`
}

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        axios
            .get(url)
            .then(function (response: any) {
                const html: string = response.data;
                const result: any = html.split('stream: ')[1].split('};')
                if (result && result.length >= 1) {
                    const infoObj: any = JSON.parse(result[0]);
                    const streamInfoList: any =
                        infoObj.data[0].gameStreamInfoList;
                    //const streamerName = infoObj["data"][0]["gameLiveInfo"]["nick"];
                    const urlInfo1: any = streamInfoList[0];
                    //const urlInfo2 = streamInfoList[1];

                    //可以得到六种链接，m3u8链接最稳定
                    const aliFLV =
                        urlInfo1["sFlvUrl"] +
                        "/" +
                        urlInfo1["sStreamName"] +
                        ".flv?" +
                        processAnticode(urlInfo1['sFlvAntiCode'], urlInfo1['sStreamName']);
                    //const aliHLS:string = urlInfo1["sHlsUrl"] + "/" + urlInfo1["sStreamName"] + ".m3u8?" + urlInfo1["sHlsAntiCode"];
                    //const aliP2P = urlInfo1["sP2pUrl"] + "/" + urlInfo1["sStreamName"] + ".slice?" + urlInfo1["newCFlvAntiCode"];
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
