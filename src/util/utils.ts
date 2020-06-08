export const RoomTypeArr = ["huya", "bilibili", "douyu"];
export const testRoomTypeArr = (roomType: string) => {
  if (RoomTypeArr.some((type) => type === roomType)) return roomType;
  else return "error";
};
export const getRoomArrInfo = (roomObj: { [key: string]: string }) => {
  // 暂时只支持一个把。。
  let roomInfoArr = [];
  for (let key in roomObj) {
    let roomTitle = key;
    let roomLink = roomObj[key];
    const repObj: any = /\.(\S+)\./.exec(roomLink);
    let roomType = testRoomTypeArr(repObj[1]);
    roomInfoArr.push({
      roomTitle,
      roomLink,
      roomType,
    });
  }
  return roomInfoArr;
};
