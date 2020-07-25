import {StreamInfo} from "type/getStreamInfo";

const regs: any = [
    [/www\.huya\.com/g, require("./website/huya")],
    [/fanxing\.kugou\.com/g, require("./website/kugou")],
    [/v\.douyin\.com/g, require("./website/douyin")],
    [/live\.bilibili\.com/g, require("./website/bilibili")],
    [/live\.ixigua\.com/g,require("./website/ixigua")],
    [/now\.qq\.com/g,require("./website/now")],
    [/www\.zhanqi\.tv/g,require("./website/zhanqi")],
    [/www\.yy\.com/g,require("./website/yy")],
    [/cc\.163\.com/g,require("./website/cc")],
    [/egame\.qq\.com/g,require("./website/egame")],
    [/www\.huajiao\.com/g,require("./website/huajiao")]
];

export function getStreamUrl(title:string,url: string): Promise<StreamInfo> {
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
               (value: any)=> {
                   resolve({ streamUrl: value, streamName: title, liveUrl: url });
               }
           ).catch((e:any)=>{
               reject(e);
           });
       } else {
           reject(`This link is not supported`);
       }

    })


}
