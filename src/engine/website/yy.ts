const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/\d{3,}/g);
        if (!rid) {
            reject(
                "YY=>No match results:Maybe the roomid is error,or this room is not open!"
            );
        }
        const config: any = {
            method: "get",
            url: `http://interface.yy.com/hls/new/get/${rid[0]}/${rid[0]}/1200?source=wapyy&callback=jsonp3`,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                referer: `http://wap.yy.com/mobileweb/${rid[0]}`,
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36",
            },
        };

        axios(config)
            .then(function (response: any) {
                const html: string = response.data;
                const jsons: any = html.match(/\(([\W\w]*)\)/);
                const flv_url: any = JSON.parse(
                    jsons[0].replace("(", "").replace(")", "")
                );
                resolve(flv_url["hls"]);
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
