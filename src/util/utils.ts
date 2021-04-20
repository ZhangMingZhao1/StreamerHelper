import * as fs from "fs"
import { join } from 'path'
import { StreamInfo } from "@/type/streamInfo";
import { EventEmitter } from 'events'
export const RoomTypeArr = ["huya", "bilibili", "douyu"];
export const testRoomTypeArr = (roomType: string) => {
  if (RoomTypeArr.some((type) => type === roomType)) return roomType;
  else return "error";
};
export const getRoomArrInfo = (roomObj: { [key: string]: { delayTime: number, copyright: number, dynamic: string, source: string, desc: string, roomUrl: string, tags: string[], tid: number, deleteLocalFile: boolean, uploadLocalFile: boolean, templateTitle: string } }[]): StreamInfo[] => {
  const roomInfoArr = [];
  for (const roomInfo of roomObj) {
    for (const key in roomInfo) {
      const roomName = key;
      const roomLink = roomInfo[key].roomUrl;
      const roomTags = roomInfo[key].tags
      const roomTid = roomInfo[key].tid
      const deleteLocalFile = roomInfo[key].deleteLocalFile
      const uploadLocalFile = roomInfo[key].uploadLocalFile
      const templateTitle = roomInfo[key].templateTitle
      const desc = roomInfo[key].desc
      const source = roomInfo[key].source
      const dynamic = roomInfo[key].dynamic
      const copyright = roomInfo[key].copyright
      const delayTime = roomInfo[key].delayTime
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
        delayTime
      });
    }
  }
  return roomInfoArr;
};

export const deleteFolder = function (path: string) {
  try {
    if (fs.existsSync(path)) {
      const files = fs.readdirSync(path);
      files.forEach((file) => {
        const curPath = join(path, file)
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
