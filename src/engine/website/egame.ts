const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/[0-9]+/g);
        const config: any = {
            method: "post",
            url: `https://share.egame.qq.com/cgi-bin/pgg_async_fcgi?param={"0":{"module":"pgg_live_read_svr","method":"get_live_and_profile_info","param":{"anchor_id":${rid[0]},"layout_id":"hot","index":1,"other_uid":0}}}`,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "Content-Encoding": "gzip",
            },
        };
        axios(config)
            .then(function (response: any) {
                const jsons: any = response.data;
                if (jsons["ecode"] == 0) {
                    resolve(
                        jsons["data"]["0"]["retBody"]["data"]["video_info"][
                            "stream_infos"
                        ][0]["play_url"]
                    );
                } else {
                    reject(
                        "EGAME=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
