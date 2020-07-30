const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        axios
            .get(url)
            .then(function (response: any) {
                const html: string = response.data;
                if (html.indexOf('直播已结束')!= -1){
                    reject(
                        "DOUYIN=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
                const rid: any = html.match(
                    /(?<="room_id_str":")(.+?)(?=",")/g
                );
                axios
                    .get(
                        `https://webcast-hl.amemv.com/webcast/room/reflow/info/?room_id=${rid[0]}&live_id=1`
                    )
                    .then(function (response: any) {
                        const json: any = response.data;
                        if (json && json["status_code"] == 0) {
                            resolve(
                                json["data"]["room"]["stream_url"][
                                    "rtmp_pull_url"
                                ]
                            );
                        } else {
                            reject(
                                "DOUYIN=>No match results:Maybe the roomid is error,or this room is not open!"
                            );
                        }
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
