const fs = require('fs-extra')
exports.getBinaryFiles=(url)=> {
    return new Promise((resolve, reject) => {
      // url = path.join(url,font)
      console.log('binary url:' + url);
      const dataArr = [];
      let len = 0;
      const stream = fs.createReadStream(url);

      stream.on('data', chunk => {
        // console.log(Buffer.isBuffer(chunk));
        dataArr.push(chunk);
        len += chunk.length;
      });

      stream.on('end', chunk => {
        //数组转Buffer
        const	result = Buffer.concat(dataArr, len);
        console.log('len:' + len);
        resolve(result);
      });

      stream.on('error', error => {
        console.log(error);
        reject(error);
      });
    });
  }