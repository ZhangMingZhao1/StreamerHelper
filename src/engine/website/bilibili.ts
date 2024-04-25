const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/(?<=\/)\d{2,}/g);
        const roomInitUrl = `https://api.live.bilibili.com/room/v1/Room/room_init?id=${rid}`
        const roomPlayInfoUrl = `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo`
        const config: any = {
            method: "get",
            url: '',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (120 - 100 + 1)) + 100}.0.0.0 Safari/537.36`,
                // 由于 bilibili 限制，需登录才可获取最高码率
                'Cookie': `${global.app.user.cookies}`,
                'Referer': url
            },
            params: {}
        };
        config.url = roomInitUrl
        axios(config)
            .then(function (response: any) {
                const data: any = response.data;
                if (data["code"] != 0 || data["data"]["live_status"] != 1) {
                    reject(
                        "BILIBILI=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
                const real_id: string = data["data"]["room_id"];
                config.url = roomPlayInfoUrl
                config.params = {
                    'room_id': real_id,
                    'protocol': '0,1', // 0: http_stream, 1: http_hls
                    'format': '0,1,2',
                    'codec': '0,1',
                    'qn': 10000,
                    'platform': 'html5', // web, html5, android, ios
                    'dolby': '5',
                }
                axios(config)
                .then(function (response: any) {
                    const html: any = response.data;
                    if (html['code'] != 0) {
                        reject(
                            "BILIBILI=>No match results:Maybe the roomid is error,or this room is not open!"
                        );
                    }
                    const streamInfoList: any = html['data']['playurl_info']['playurl']['stream']
                    let m3u8_url: string = ''
                    streamInfoList.forEach((streamInfo: any) => {
                        if (streamInfo['format'][0]['format_name'] === 'flv') {
                            // 选取最高码率
                            const codec = streamInfo['format'][0]['codec'].reduce((prev: any, curr: any) => {
                                return (prev.current_qn >= curr.current_qn) ? prev : curr;
                            })
                            const baseUrl = codec['base_url']
                            const urlInfo: any = codec['url_info'][0]
                            m3u8_url = urlInfo['host'] + baseUrl + urlInfo['extra']
                        }
                    })
                    resolve(m3u8_url);
                })
                .catch((error: any) => {
                    reject(error)
                })
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
