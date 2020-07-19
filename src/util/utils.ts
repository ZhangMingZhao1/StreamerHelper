import * as fs from "fs"
import { join } from 'path'
export const RoomTypeArr = ["huya", "bilibili", "douyu"];
export const testRoomTypeArr = (roomType: string) => {
  if (RoomTypeArr.some((type) => type === roomType)) return roomType;
  else return "error";
};
export const getRoomArrInfo = (roomObj: { [key: string]: string }[]) => {
  let roomInfoArr = [];
  for (let roomInfo of roomObj) {
    for (let key in roomInfo) {
      let roomTitle = key;
      let roomLink = roomInfo[key];
      const repObj: any = /\.(\S+)\./.exec(roomLink);
      let roomType = testRoomTypeArr(repObj[1]);
      roomInfoArr.push({
        roomTitle,
        roomLink,
        roomType,
      });
    }
  }
  return roomInfoArr;
};

export const deleteFolder = function (path: string) {
  try {
    let files = [];
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path);
      files.forEach((file) => {
        let curPath = join(path, file)
        if (fs.statSync(curPath).isDirectory() === false) {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  } catch (err) {
    throw err
  }
};