const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        let rid: any = url.match(/(?<=(rid\=))(.+)/g);
        if (rid==null || rid.length==0){
            rid = url.match(/([0-9])+/g);
        }
        axios
            .get(
                `https://service-428niun7-1257334448.sh.apigw.tencentcs.com/release/douyu?rid=${rid[0]}`
            )
            .then(function (response: any) {
                const txt: string = response.data;
                if (
                    String(txt).indexOf("error") > -1 ||
                    String(txt).indexOf("未开播") > -1
                ) {
                    reject(
                        "EGAME=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                } else {
                    resolve(String(txt));
                }
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
