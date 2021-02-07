import {StreamInfo} from "type/StreamInfo";

export interface RecorderType {
    recorderName: string;
    recorderLink: string
    dirName: string;
    timeV: string;
    tags: string[];
    tid: number
    App: any;
    deleteLocalFile: boolean;
    uploadLocalFile: boolean;
    ffmpegProcessEnd: boolean;
    ffmpegProcessEndByUser: boolean;

    stopRecord(): void;

    startRecord(stream: StreamInfo): void;
}
