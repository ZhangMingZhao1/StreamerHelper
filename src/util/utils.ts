import * as fs from "fs"
import { join } from 'path'
import { StreamInfo } from "type/StreamInfo";
import { EventEmitter } from 'events'
export const RoomTypeArr = ["huya", "bilibili", "douyu"];
export const testRoomTypeArr = (roomType: string) => {
  if (RoomTypeArr.some((type) => type === roomType)) return roomType;
  else return "error";
};
export const getRoomArrInfo = (roomObj: { [key: string]: { roomUrl: string, tags: string[], tid: number, deleteLocalFile: boolean, uploadLocalFile: boolean } }[]): StreamInfo[] => {
  let roomInfoArr = [];
  for (let roomInfo of roomObj) {
    for (let key in roomInfo) {
      let roomName = key;
      let roomLink = roomInfo[key].roomUrl;
      let roomTags = roomInfo[key].tags
      let roomTid = roomInfo[key].tid
      let deleteLocalFile = roomInfo[key].deleteLocalFile
      let uploadLocalFile = roomInfo[key].uploadLocalFile
      // const repObj: any = /\.(\S+)\./.exec(roomLink);
      // let roomType = testRoomTypeArr(repObj[1]);
      roomInfoArr.push({
        roomName,
        roomLink,
        roomTags,
        streamUrl: "",
        roomTid,
        deleteLocalFile,
        uploadLocalFile
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
        if (!fs.statSync(curPath).isDirectory()) {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  } catch (err) {
    throw err
  }
};

export const emitter = new EventEmitter();
