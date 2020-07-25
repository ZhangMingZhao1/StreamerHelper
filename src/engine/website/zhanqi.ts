const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/([0-9]{3,})/g);
        if (!rid) {
            reject(
                "ZHANQI=>No match results:Maybe the roomid is error,or this room is not open!"
            );
        }
        axios
            .get(
                `https://m.zhanqi.tv/api/static/v2.1/room/domain/${rid[0]}.json`
            )
            .then(function (response: any) {
                const jsons: any = response.data;
                const videoId: string = jsons["data"]["videoId"];
                const flv_url: any = `https://dlhdl-cdn.zhanqi.tv/zqlive/${videoId}.flv`;
                resolve(flv_url);
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
