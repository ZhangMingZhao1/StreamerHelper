const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/[0-9]+(?=\?)*/)![0];
        axios.get(`https://fanxing.kugou.com/${rid}`)
            .then((response: any) => {
                const match: any = response.data.match(/roomId=(\d+)/)
                let roomId: string = rid; 
                if (match) {
                    roomId = match[1]
                }
                const config: any = {
                    method: "get",
                    url: `https://fx1.service.kugou.com/video/pc/live/pull/mutiline/streamaddr?std_rid=${roomId}`,
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (120 - 100 + 1)) + 100}.0.0.0 Safari/537.36`,
                        'Referer': url,
                    },
                    params: {
                        appid: '1010',
                        version: '1000',
                        std_plat: 7,
                        std_kid: 0,
                        std_imei: '',
                        streamType: '1-2-4-5-8',
                        targetLiveTypes: '1-5-6',
                        ua: 'fx-flash',
                        supportEncryptMode: 1,
                        _: Date.now()
                    }
                }
                axios(config)
                    .then((response: any) => {
                        const html: any = response.data;
                        if (html['code'] != 0 || html.data['lines'].length == 0) {
                            reject(
                                "KUGOU=>No match results:Maybe the roomid is error,or this room is not open!"
                            )
                        }
                        const streamInfoList: any = html.data['lines'].pop()['streamProfiles']
                        const streamInfo = streamInfoList.reduce((prev: any, curr: any) => {
                            return (prev.rate > curr.rate) ? prev : curr;
                        })
                        const streamUrl: string = streamInfo['httpsFlv'][0]
                        resolve(streamUrl)
                    })
                    .catch((error: any) => {
                        reject(error)
                    })
            })
            .catch((error: any) => {
                reject(error)
            })
    });
}
