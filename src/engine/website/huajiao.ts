const axios = require("axios");

export function main(url: string) {
    return new Promise((resolve, reject) => {
        if (url.indexOf('user') != -1) {
            // 主页地址，可以多次获取直播流
            const uid = url.match(/(?<=user\/)(\d+)/g)![0];
            axios.get(`https://webh.huajiao.com/User/getUserFeeds?_callback=padding&uid=${uid}&fmt=jsonp&_=${Date.now()}`)
            .then((response: any) => {
                const data = response.data.replace('/**/padding(', '').replace(');','')
                const feedInfos = JSON.parse(data).data['feeds']
                const feedInfo = feedInfos.find((feedInfo: any) => feedInfo.type === 1)
                if (!feedInfo || !feedInfo['relay']) {
                    reject(
                        "HUAJIAO=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
                const streamUrl: string = `http://al2-flv.live.huajiao.com/${feedInfo['relay']['channel']}/${feedInfo['feed']['sn']}.flv`
                resolve(streamUrl)
            })
            .catch((error: any) => {
                reject(error);
            })
        } else if (url.indexOf('l') != -1) {
            // 当次直播地址，只能获取该次直播的直播流
            const rid = url.match(/(?<=l\/)(\d+)/g)![0];
            axios.get(`https://www.huajiao.com/l/${rid}`)
                .then((response: any) => {
                    const data: any = response.data;
                    const feedInfo: any = JSON.parse(data.split('var feed = ')[1].split(';\n')[0])
                    const uid = feedInfo['author']['uid']
                    // 提醒用户更换主页链接
                    global.app.logger.warn(`HUAJIAO => roomUrl: ${url} 只能录制当次直播，请更换 roomUrl 为 https://www.huajiao.com/user/${uid}`)
                    if (feedInfo && feedInfo['feed']['duration'] != '00:00:00') {
                        reject(
                            "HUAJIAO=>No match results:Maybe the roomid is error,or this room is not open!"
                        );
                    }
                    const streamUrl: string = `http://al2-flv.live.huajiao.com/${feedInfo['relay']['channel']}/${feedInfo['feed']['sn']}.flv`
                    resolve(streamUrl)
                })
                .catch((error: any) => {
                    global.app.logger.warn(`HUAJIAO => roomUrl: ${url} 只能录制当次直播，请更换 roomUrl 为 https://www.huajiao.com/user/xxxx`)
                    reject(error);
                });
        } else {
            reject(
                "HUAJIAO=>No match results:Maybe the roomid is error,or this room is not open!"
            );
        }
    });
}
