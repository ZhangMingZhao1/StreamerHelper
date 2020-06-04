export const getRoomArrInfo = (roomObj: { [key: string]: string }) => {
  // 暂时只支持一个把。。
  let roomInfo = [];
  for (let key in roomObj) {
    let roomInfo = key;
    let roomLink = roomObj[key];
    let roomType = /\.(\S+)\./.exec(roomLink)[1];
  }
};
