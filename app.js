const request = require('request');
const axios = require('axios');
const fs = require('fs-extra');
const log4js = require('log4js');
const cheerio = require('cheerio');
let $ ;
let logger = log4js.getLogger('app');

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


axios.get("https://www.huya.com/danuancheng2018")
    .then(data=>{
        if(data.data) {
            logger.info("huyaHTML获取成功");
            const huyaHTML = data.data;
            // console.log(typeof huyaHTML);
            if(typeof huyaHTML === 'string') {
             const regRes =  /"stream": ({.+?})\s*}/.exec(huyaHTML);;
            //  console.log('{'+regRes[0]);
             const resObj = JSON.parse('{'+regRes[0]);
             console.log(resObj);
            
            }
            // $ = cheerio.load(huyaHTML)
           
        }
        try {
            fs.outputFileSync('huya3.html',data.data);
        } catch (error) {
            logger.error("写html文件出错: \n"+error);
        }
       
    })

