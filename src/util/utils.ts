import * as fs from "fs"
import { join } from 'path'
import { StreamInfo } from "type/StreamInfo";
import { EventEmitter } from 'events'
export const RoomTypeArr = ["huya", "bilibili", "douyu"];
export const testRoomTypeArr = (roomType: string) => {
  if (RoomTypeArr.some((type) => type === roomType)) return roomType;
  else return "error";
};
export const getRoomArrInfo = (roomObj: { [key: string]: { denyTime: number, copyright:number, dynamic: string, source: string, desc: string, roomUrl: string, tags: string[], tid: number, deleteLocalFile: boolean, uploadLocalFile: boolean, templateTitle: string } }[]): StreamInfo[] => {
  let roomInfoArr = [];
  for (let roomInfo of roomObj) {
    for (let key in roomInfo) {
      let roomName = key;
      let roomLink = roomInfo[key].roomUrl;
      let roomTags = roomInfo[key].tags
      let roomTid = roomInfo[key].tid
      let deleteLocalFile = roomInfo[key].deleteLocalFile
      let uploadLocalFile = roomInfo[key].uploadLocalFile
      let templateTitle = roomInfo[key].templateTitle
      let desc = roomInfo[key].desc
      let source = roomInfo[key].source
      let dynamic = roomInfo[key].dynamic
      let copyright = roomInfo[key].copyright
      let denyTime = roomInfo[key].denyTime
      roomInfoArr.push({
        roomName,
        roomLink,
        roomTags,
        streamUrl: "",
        roomTid,
        deleteLocalFile,
        uploadLocalFile,
        templateTitle,
        desc,
        source,
        dynamic,
        copyright,
        denyTime
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
