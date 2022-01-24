import { StreamerInfo } from "@/type/config";

export interface RecorderTask {
    streamerInfo: StreamerInfo,
    recorderName: string,
    timeV: string,
    streamUrl: string,
    dirName: string
}