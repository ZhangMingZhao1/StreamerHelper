import { remoteVideoPart } from "./video";

export interface FileStatus {
    path?: string;
    recorderName?: string;
    recorderLink?: string;
    tags?: string[];
    tid?: number;
    templateTitle?: string;
    desc?: string;
    source?: string;
    dynamic?: string;
    copyright?: number;
    timeV?: string;
    startRecordTime?: Date;
    endRecordTime?: Date;
    isPost?: boolean;
    isFailed?: boolean;
    uploadLocalFile?: boolean;
    deleteLocalFile?: boolean;
    delayTime?: number;
    videoParts?: videoParts;
}

interface videoParts {
    succeedUploaded?: succeedUploaded[];
    failUpload?:failUpload;
}


export interface succeedUploaded extends remoteVideoPart{
    localFilePath: string
}

export interface failUpload{
    path?: string;
    uploadUrl?: string;
    completeUploadUrl?: string;
    serverFileName?: string;
    uploadStartTime?: number
    deadline?: number
    succeedUploadChunk?: number
    succeedTotalLength?: number
}