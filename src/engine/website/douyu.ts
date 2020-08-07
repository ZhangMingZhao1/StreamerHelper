var exec = require('child_process').exec;

export function main(url: string) {
  return new Promise(function (resolve, reject) {
    const roomdId = url.split('com/')[1];
    exec(`python3 ~/Downloads/douyu.py ${roomdId}`, function (
      error: any,
      stdout: any,
    ) {
      if (error) {
        throw error;
      }
      if (stdout.length > 1) {
        resolve(stdout);
      }
      reject('something error');
    });
  });
}
