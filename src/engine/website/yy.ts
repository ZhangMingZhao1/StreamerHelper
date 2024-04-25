const axios = require("axios");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        const rid: any = url.match(/\d{3,}/g);
        if (!rid) {
            reject(
                "YY=>No match results:Maybe the roomid is error,or this room is not open!"
            );
        }
        const secTime = Math.trunc(Date.now() / 1000)
        const milTime = Date.now() 
        const data: any = {
            head: {
                "seq": milTime,
                "appidstr": "0",
                "bidstr": "121",
                "cidstr": rid[0],
                "sidstr": rid[0],
                "uid64": 0,
                "client_type": 108,
                "client_ver": "5.11.0-alpha.4",
                "stream_sys_ver": 1,
                "app": "yylive_web",
                "playersdk_ver": "5.11.0-alpha.4",
                "thundersdk_ver": "0",
                "streamsdk_ver": "5.11.0-alpha.4"
            }, 
            client_attribute: {
                "client": "web",
                "model": "",
                "cpu": "",
                "graphics_card": "",
                "os": "chrome",
                "osversion": "114.0.0.0",
                "vsdk_version": "",
                "app_identify": "",
                "app_version": "",
                "business": "",
                "width": "1536",
                "height": "864",
                "scale": "",
                "client_type": 8,
                "h265": 0 
            },
            avp_parameter: {
                "version": 1,
                "client_type": 8,
                "service_type": 0,
                "imsi": 0,
                "send_time": secTime,
                "line_seq": -1,
                "gear": 4,
                "ssl": 1,
                "stream_format": 0
            }
        }
        const config: any = {
            method: "post",
            url: `https://stream-manager.yy.com/v3/channel/streams?uid=0&cid=${rid[0]}&sid=${rid[0]}&appid=0&sequence=${milTime}&encode=json`,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                'Referer': `https://www.yy.com/`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * (120 - 100 + 1)) + 100}.0.0.0 Safari/537.36",
            },
            data: data
        };
        axios(config)
            .then(function (response: any) {
                const data: any = response.data;
                if (!data || !data['avp_info_res']) {
                    reject(
                        "YY=>No match results:Maybe the roomid is error,or this room is not open!"
                    );
                }
                const streamInfo: object = data['avp_info_res']['stream_line_addr']
                const streamUrl: any = Object.values(streamInfo)[0]['cdn_info']['url']
                resolve(streamUrl);
            })
            .catch(function (error: any) {
                reject(error);
            });
    });
}
