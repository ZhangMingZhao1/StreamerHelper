const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/[0-9]+/g);
        axios
            .get(`https://www.douyu.com/${rid}`)
            .then(function (response: any) {
                const html: string = response.data;
                const reg: RegExp = /(?<=streamUrl\s*=\s*".*live\/)(.+?)(?=_.*\.flv)/;
                const strs: any = html.match(reg);
                if (strs && strs.length >= 1) {
                    const real_url =
                        "http://tx2play1.douyucdn.cn/live/" +
                        strs[0] +
                        ".flv?uuid=";
                    resolve(real_url);
                } else {
                    reject(
                        "DOUYU=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
