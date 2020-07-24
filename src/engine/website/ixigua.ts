const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        axios
            .get(url)
            .then(function (response: any) {
                const html: string = response.data;
                const reg: RegExp = /(?<=playInfo\"\:)(.+?)(?=\,\"authStatus)/;
                const strs: any = html.match(reg);
                if (strs && strs.length >= 1) {
                    const links: any = JSON.parse(strs[0]);
                    resolve(links[0]["FlvUrl"].replace("\u002F", "/"));
                } else {
                    reject(
                        "IXIGUA=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
