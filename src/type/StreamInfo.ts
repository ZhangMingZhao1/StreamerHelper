export interface StreamInfo {
  roomLink: string;
  roomName: string;
  roomTags: string[];
  streamUrl: string;
  roomTid: Number;
  deleteLocalFile?: Boolean;
  uploadLocalFile?: Boolean;
}
