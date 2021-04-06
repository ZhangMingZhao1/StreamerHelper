const axios = require("axios");
const CryptoJS = require("crypto-js");
const uuid = require("uuid");

export function main(url: string) {
    return new Promise(function (resolve, reject) {
        let rid: any = url.match(/(?<=www.douyu.com\/)(.+)/g);
        if (rid == null || rid.length == 0) {
            rid = url.match(/([0-9])+/g);
        }
        axios
            .get(`https://www.douyu.com/swf_api/homeH5Enc?rids=${rid}`)
            .then(function (response: any) {
                CryptoJS.toString();
                let request_time: any = Date.now();
                request_time = request_time.toString().substr(0, request_time.toString().length - 3)
                let device_id = uuid.v4();
                device_id = device_id.toString().replace(/\-/g, '');
                const sign_algorithm_data: any = response.data;
                if (sign_algorithm_data['error'] != 0) {
                    reject('DOUYU=>Get douyu sign algorithm fail.');
                }

                let sign_alg_gen: string = sign_algorithm_data['data'][`room${rid}`];
                sign_alg_gen = sign_alg_gen.replace(/eval\(strc\)/g, 'strc.toString();')
                let sign_alg: string = 'dummy'
                let result: string = 'dummy'

                // generate sign algorithm
                eval(sign_alg_gen + `sign_alg=ub98484234(1,1,1);`)

                sign_alg = sign_alg.substr(1, sign_alg.lastIndexOf('}'))
                sign_alg = sign_alg.replace('function', 'function foo')

                // use sign algorithm, sign(room_id, device_uuid, utc10_timestamp)
                eval(sign_alg + `;result=foo('${rid}', '${device_id}', '${request_time}');`)

                if (result == 'dummy') {
                    reject('DOUYU=>Douyu sign fail')
                }

                const sign: any = result.match(/(?<=sign=)(.+)/g);
                let version: any = result.match(/(?<=v=)(.+)&did/g);
                version = version.toString().substr(0, version.toString().length - 4)


                const post_data: string = `cdn=tct-h5&did=${device_id}&iar=1&ive=0&rate=0&v=${version}&tt=${request_time}&sign=${sign}`
                axios
                    .post(`https://www.douyu.com/lapi/live/getH5Play/${rid}`, post_data, {
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Origin': 'https://www.douyu.com',
                            'Referer': `https://www.douyu.com/${rid}`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(function (response: any) {
                        let h5_play_data: any = response.data
                        if (h5_play_data['error'] != 0) {
                            reject('DOUYU=>No match results:' + h5_play_data['msg'])
                        }
                        let stream_url: string = h5_play_data['data']['rtmp_url'] + "/" + h5_play_data['data']['rtmp_live']
                        resolve(String(stream_url));
                    })
                    .catch(function (error: any) {
                        reject(error);
                    });

            })
            .catch(function (error: any) {
                reject(error);
            });

    });
}
