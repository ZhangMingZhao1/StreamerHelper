const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/[0-9]{4,}/g);

        axios
            .get(
                `https://api.cc.163.com/v1/activitylives/anchor/lives?anchor_ccid=${rid[0]}`
            )
            .then(function (response: any) {
                const jsons: any = response.data;
                if (jsons["data"]) {
                    const channel_id: string =
                        jsons["data"][rid[0]]["channel_id"];

                    axios
                        .get(
                            `https://cc.163.com/live/channel/?channelids=${channel_id}`
                        )
                        .then(function (response: any) {
                            resolve(response.data["data"][0]["sharefile"]);
                        });
                } else {
                    reject(
                        "CC=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
