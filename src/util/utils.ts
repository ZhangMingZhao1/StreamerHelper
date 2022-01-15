import * as fs from "fs"
import { join } from 'path'
import { EventEmitter } from 'events'
export const RoomTypeArr = ["huya", "bilibili", "douyu"];
export const testRoomTypeArr = (roomType: string) => {
  if (RoomTypeArr.some((type) => type === roomType)) return roomType;
  else return "error";
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
