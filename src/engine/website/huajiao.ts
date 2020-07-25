const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/[0-9]+/g);
        const tt: any = Date.now();
        axios
            .get(
                `https://h.huajiao.com/api/getFeedInfo?sid=${tt}&liveid=${rid}`
            )
            .then(function (response: any) {
                const jsons: any = response.data;
                if (jsons["data"]) {
                    resolve(jsons["data"]["live"]["main"]);
                } else {
                    reject(
                        "HUAJIAO=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
