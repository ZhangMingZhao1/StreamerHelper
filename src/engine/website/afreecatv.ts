const axios = require("axios");
const qs = require("qs")
const CHANNEL_API_URL = "http://live.afreecatv.com/afreeca/player_live_api.php"
const STREAM_INFO_URLS = `/broad_stream_assign.html`
const CHANNEL_RESULT_OK = 1
const QUALITYS = ["original", "hd", "sd"]

let headers = {
    'Proxy-Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': '*/*',
    'Origin': 'http://play.afreecatv.com',
    'Referer': '',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh,zh-TW;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ru;q=0.5',

}

function getChannelInfo(bid: string) {
    return new Promise(async (resolve, reject) => {
        const config: any = {
            method: "post",
            url: CHANNEL_API_URL,
            headers: headers,
            data: qs.stringify({
                "bid": bid,
                "mode": "landing",
                "player_type": "html5"
            })
        }
        try {
            let r = await axios(config)
            resolve(r.data.CHANNEL)
        } catch (err) {
            console.log(err)
            reject(err)
        }
    })
}

function getHlsKey(broadcast: string, bid: string, quality: string) {
    return new Promise(async (resolve, reject) => {
        const config: any = {
            method: "post",
            url: CHANNEL_API_URL,
            headers: headers,
            data: qs.stringify({
                "bid": bid,
                "bno": broadcast,
                "pwd": "",
                "quality": quality,
                "type": "pwd"
            })
        }
        try {
            let res = await axios(config)
            resolve(res.data.CHANNEL)
        } catch (err) {
            reject(err)
        }
    })
}

function getStreamInfo(broadcast: string, quality: string, cdn: string, rmd: string) {
    return new Promise(async (resolve, reject) => {
        const config: any = {
            method: "post",
            url: `${rmd}${STREAM_INFO_URLS}`,
            headers: headers,
            params: {
                "return_type": cdn,
                "broad_key": `${broadcast}-flash-${quality}-hls`
            }
        }
        try {
            let res = await axios(config)
            resolve(res.data)
        } catch (error) {
            reject(error)
        }
    })
}

function getHlsStream(broadcast: string, bid: string, quality: string, cdn: string, rmd: string) {
    return new Promise<void | string>(async (resolve, reject) => {
        let keyjson: any
        try {
            keyjson = await getHlsKey(broadcast, bid, quality)
        } catch (error) {
            reject(error)
        }
        if (!keyjson || keyjson.RESULT !== CHANNEL_RESULT_OK) {
            reject()
            return
        }
        let key = keyjson["AID"]
        let info: any
        try {
            info = await getStreamInfo(broadcast, quality, cdn, rmd)
        } catch (err) {
            reject()
            return
        }
        if (info && info.view_url) {
            resolve(`${info.view_url}?aid=${key}`)
            return
        }
        resolve()
    })
}

export function main(url: string) {
    return new Promise(async (resolve, reject) => {
        headers['Referer'] = url
        let m = url.match(/com\/(\S*)\//g)
        let bid
        if (m) {
            bid = m[0].split('/')[1]
        } else {
            reject(
                "AFREECATV=>Room not exists!"
            );
            return
        }
        try {
            const channel: any = await getChannelInfo(bid)
            if (channel.BPWD === 'Y') {
                reject("AFREECATV=>Stream is Password-Protected")
            } else if (channel.RESULT === -6) {
                reject("AFREECATV=>Login required")
            } else if (channel.RESULT !== CHANNEL_RESULT_OK)
                reject(
                    "AFREECATV=>No match results:Maybe the roomid is error,or this room is not open!"
                );
            const broadcast: string = channel["BNO"]
            const rmd: string = channel["RMD"]
            const cdn: string = channel["CDN"]
            if (!(broadcast && rmd && cdn)) {
                reject(
                    "AFREECATV=>No match results:Maybe the roomid is error,or this room is not open!"
                );
                return
            }
            for (let qkey of QUALITYS) {
                try {
                    let hls_stream = await getHlsStream(broadcast, bid, qkey, cdn, rmd)
                    if (hls_stream) {
                        resolve(hls_stream)
                        return
                    }

                } catch (error) {
                    reject(`AFREECATV=>Error: ${error}`)
                }
            }
        } catch (error) {
            reject(
                "AFREECATV=>No match results:Maybe the roomid is error,or this room is not open!"
            );
        }
    })
}