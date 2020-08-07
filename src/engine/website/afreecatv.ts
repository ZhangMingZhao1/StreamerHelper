const superagent = require('superagent')

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
        let data = {
            "bid": bid,
            "mode": "landing",
            "player_type": "html5"
        }
        try {
            let r = await superagent
                .post(CHANNEL_API_URL)
                .set(headers)
                .send(data)
            resolve(JSON.parse(r.text).CHANNEL)
        } catch (err) {
            reject(err)
        }
    })
}

function getHlsKey(broadcast: string, bid: string, quality: string) {
    return new Promise(async (resolve, reject) => {
        let data = {
            "bid": bid,
            "bno": broadcast,
            "pwd": "",
            "quality": quality,
            "type": "pwd"
        }
        try {
            let res = await superagent
                .post(CHANNEL_API_URL)
                .set(headers)
                .send(data)
            resolve(JSON.parse(res.text).CHANNEL)
        } catch (err) {
            reject(err)
        }
    })
}

function getStreamInfo(broadcast: string, quality: string, cdn: string, rmd: string) {
    return new Promise(async (resolve, reject) => {
        let params = {
            "return_type": cdn,
            "broad_key": `${broadcast}-flash-${quality}-hls`
        }
        try {
            let res = await superagent
                .get(`${rmd}${STREAM_INFO_URLS}`)
                .query(params)
            resolve(JSON.parse(res.text))
        } catch (error) {
            reject(error)
        }
    })
}

function getHlsStream(broadcast: string, bid: string, quality: string, cdn: string, rmd: string) {
    return new Promise(async (resolve, reject) => {
        try {
            let keyjson: any = await getHlsKey(broadcast, bid, quality)
            if (keyjson.RESULT !== CHANNEL_RESULT_OK) {
                reject()
                return
            }
            let key = keyjson["AID"]
            let info: any = await getStreamInfo(broadcast, quality, cdn, rmd)
            if (info.view_url) {
                resolve(`${info.view_url}?aid=${key}`)
                return
            }
            resolve()
        } catch (error) {
            reject(error)
        }
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