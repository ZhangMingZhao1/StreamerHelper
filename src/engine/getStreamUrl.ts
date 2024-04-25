const regs: any = [
    [/www\.huya\.com/, require("./website/huya")],
    [/fanxing\.kugou\.com/, require("./website/kugou")],
    [/live\.douyin\.com/, require("./website/douyin")],
    [/live\.bilibili\.com/, require("./website/bilibili")],
    [/live\.ixigua\.com/, require("./website/ixigua")],
    [/now\.qq\.com/, require("./website/now")],
    [/www\.zhanqi\.tv/, require("./website/zhanqi")],
    [/www\.yy\.com/, require("./website/yy")],
    [/cc\.163\.com/, require("./website/cc")],
    [/egame\.qq\.com/, require("./website/egame")],
    [/www\.huajiao\.com/, require("./website/huajiao")],
    [/live\.kuaishou\.com/, require("./website/kuaishou")],
    [/play\.afreecatv\.com/, require("./website/afreecatv")],
    [/www\.douyu\.com/, require("./website/douyu")]
];

export function getStreamUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        //循环正则判断直播站点类型
        let website: any = null;
        regs.forEach((item: any) => {
            if (item[0].test(url)) {
                website = item[1];
            }
        });
        if (website) {
            const result: any = website.main(url);
            result.then(
                (value: any) => {
                    resolve(value);
                }
            ).catch((e: any) => {
                reject(e);
            });
        } else {
            reject(`This link is not supported`);
        }

    })


}
