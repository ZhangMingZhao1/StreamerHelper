const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/(?<=u\/)(.+)/g);

        const config: any = {
            method: "get",
            url: `https://m.gifshow.com/fw/live/${rid[0]}`,
            headers: {
                "user-agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
                cookie: "did=web_",
            },
        };

        axios(config)
            .then(function (response: any) {
                const html: any = response.data;
                const reg: RegExp = /(?<=type="application\/x-mpegURL" src=")(.+?)(?=")/;
                const strs: any = html.match(reg);
                if (strs && strs.length >= 1) {
                    resolve(strs[0].replace(/#38;/g, ""));
                } else {
                    reject(
                        "KUAISHOU=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}