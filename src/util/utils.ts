
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
