
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
    isFail?: boolean;
    uploadLocalFile?: boolean;


    deleteLocalFile?: boolean;
    denyTime?: number;


    videoParts?: videoParts;
}


interface videoParts {
    succeedUploaded?: succeedUploaded[];
    failUpload?:failUpload;
}

export interface succeedUploaded {
    desc: string;
    title: string
    filename: string;
    path: string;
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
