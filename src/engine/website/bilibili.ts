import {logger} from "../../log";

const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/(?<=\/)\d{2,}/g);
        axios
            .get(
                `https://api.live.bilibili.com/room/v1/Room/room_init?id=${rid}`
            )
            .then(function (response: any) {
                const data: any = response.data;
		if (data["code"] != 0 || data["data"]["live_time"] < 0) {
                    reject(
                        "BILIBILI=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
                const real_id: string = data["data"]["room_id"];
                const config: any = {
                    method: "get",
                    url: `https://api.live.bilibili.com/xlive/web-room/v1/playUrl/playUrl?cid=${real_id}&platform=h5&qn=10000`,
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                    },
                };

                axios(config).then(function (response: any) {
                    const html: any = response.data;
                    logger.trace(`获取哔哩哔哩房间 ${rid} 的推流信息 ${JSON.stringify(html, null, 2)}`)
                    const links: any = html["data"]["durl"];
                    let m3u8_url = links[0]["url"];
                    resolve(m3u8_url);
                });
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
