export interface StreamInfo {
  timeV?: string;
  roomLink: string;
  roomName: string;
  roomTags: string[];
  streamUrl: string;
  roomTid: number;
  dirName?: string;
  templateTitle?: string;
  desc?: string;
  source?: string;
  dynamic?: string;
  copyright?: number;
  deleteLocalFile?: boolean;
  uploadLocalFile?: boolean;
}
