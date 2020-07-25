const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/[0-9]+(?=\?)*/g);
        axios
            .get(
                `https://fx1.service.kugou.com/video/pc/live/pull/v3/streamaddr?roomId=${rid[0]}&ch=fx&version=1.0&streamType=1-2-5&platform=7&ua=fx-flash&kugouId=0&layout=1`
            )
            .then(function (response: any) {
                const json: any = response.data;
                if (json && json["code"] == 0) {
                    resolve(json["data"]["horizontal"][0]["httpflv"][0]);
                } else {
                    reject(
                        "KUGOU=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
