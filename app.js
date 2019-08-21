const request = require('request');
const axios = require('axios');
const fs = require('fs-extra');
const log4js = require('log4js');

log4js.configure({
    appenders: {
      out: { type: 'stdout' },
      app: { type: 'file', filename: 'info.log' }
    },
    categories: {
         // getLogger 参数为空时，默认使用该分类
      default: { appenders: [ 'out', 'app' ], level: 'debug' }
    }
  });

let logger = log4js.getLogger('app');
axios.get("https://www.huya.com/alon520")
    .then(data=>{
        if(data.data) {
            logger.info("访问huya网站成功");
        }
        try {
            fs.outputFileSync('huya2.html',JSON.stringify(data.data));
        } catch (error) {
            logger.error("写html文件出错: \n"+error);
        }
       
    })

