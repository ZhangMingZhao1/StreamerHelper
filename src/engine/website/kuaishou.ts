const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/(?<=u\/)(.+)/g);
        const session = axios.create({
            baseURL: 'https://live.kuaishou.com',
            headers: {
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (120 - 100 + 1)) + 100}.0.0.0 Safari/537.36`
            }
        })
        // 首页低风控生成 did cookie
        session.get('/')
            .then(() => {
                const delay = Math.floor(Math.random() * 1000) + 3000
                // 延迟3-4秒以防风控
                setTimeout(() => {
                    session.get(`/u/${rid}`)
                        .then((response: any) => {
                            const errorKeys = ['错误代码22', '主播尚未开播']
                            errorKeys.forEach((errorKey) => {
                                if (response.data.indexOf(errorKey) != -1) {
                                    reject(
                                        "KUAISHOU=>No match results:Maybe the roomid is error,or this room is not open!"
                                    );
                                }
                            })
                            session.get(`/live_api/liveroom/livedetail?principalId=${rid}`)
                                .then((response: any) => {
                                    const roomInfo: any = response.data.data
                                    if (roomInfo['result'] == 1) {
                                        const streamInfoList: any = roomInfo['liveStream']['playUrls'][0]['adaptationSet']['representation']
                                        // 不登录只能录制标清码率？ ===> 只在前端限制了
                                        // 录制最高码率
                                        const streamInfo = streamInfoList.reduce((prev: any, curr: any) => {
                                            return (prev.bitrate > curr.bitrate) ? prev : curr;
                                        })
                                        const streamUrl: string = streamInfo['url']
                                        resolve(streamUrl)
                                    } else {
                                        reject(
                                            "KUAISHOU=>No match results:Maybe the roomid is error,or this room is not open!"
                                        );
                                    }
                                })
                                .catch((error: any) => {
                                    reject(error)
                                })
                        })
                        .catch((error: any) => {
                            reject(error)
                        })
                }, delay)
            })
            .catch((error: any) => {
                reject(error);
            })
    });
}