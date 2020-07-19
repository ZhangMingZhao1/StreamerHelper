const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/(?<=roomid=)([0-9]+)/g);
        if (!rid) {
            reject(
                "NOW=>No match results:Maybe the roomid is error,or this room is not open!"
            );
        }
        axios
            .get(
                `https://now.qq.com/cgi-bin/now/web/room/get_live_room_url?room_id=${rid[0]}&platform=8`
            )
            .then(function (response: any) {
                const jsons: any = response.data;
                const hls_url: any = jsons["result"]["raw_hls_url"];
                resolve(hls_url);
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
