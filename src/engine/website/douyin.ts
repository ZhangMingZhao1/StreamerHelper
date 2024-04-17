const axios = require("axios");

function buildUrl(roomId: string): string {
    const url = new URL(`https://live.douyin.com/webcast/room/web/enter/?web_rid=${roomId}`)
    url.searchParams.set('aid', '6383')
    url.searchParams.set('device_platform', 'web')
    url.searchParams.set('browser_language', 'zh-CN')
    url.searchParams.set('browser_platform', 'Win32')
    url.searchParams.set('browser_name', 'Chrome')
    url.searchParams.set('browser_version', '92.0.4515.159')
    return url.toString()
}

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const roomId = url.split('douyin.com/')[1].split('/')[0].split('?')[0]
        axios
            .get('https://live.douyin.com/1-2-3-4-5-6-7-8-9-0')
            .then((response: any) => {
                const ttwidCookieValue: string = response.headers['set-cookie'].find((cookie: string) => cookie.startsWith('ttwid=')).split(';')[0].split('=')[1]
                const headers = {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (120 - 100 + 1)) + 100}.0.0.0 Safari/537.36`,
                    'Cookie': `ttwid=${ttwidCookieValue}`
                }
                axios
                    .get(buildUrl(roomId), {headers: headers})
                    .then(function (response: any) {
                        const res: any = response.data;
                        const roomInfo: any = res.data.data
                        if (roomInfo.length == 0 || roomInfo[0]['status'] != 2) {
                            reject(
                                "DOUYIN=>No match results:Maybe the roomid is error,or this room is not open!"
                            )
                        }
                        const stream: string = roomInfo[0]['stream_url']['live_core_sdk_data']['pull_data']['stream_data']
                        const streamData: any = JSON.parse(stream)['data']
                        // 原画origin 蓝光uhd 超清hd 高清sd 标清ld 流畅md 仅音频ao
                        // 选择原画画质
                        const streamUrl: string = streamData['origin']['main']['flv']
                        resolve(streamUrl)
                    })
                    .catch(function (error: any) {
                        reject(error);
                    });
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
