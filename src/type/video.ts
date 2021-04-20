export interface VideoPart {
    title: string;
    desc: string;
    path?: string | undefined;
    filename?: string;
    server_file_name?: string;
    fileSize?: number;
    isFailed?: boolean;
}

export interface localVideoPart {
    isFailed: boolean
    localFilePath: string,
    title: string,
    desc: string,
    fileSize: number
}

export interface remoteVideoPart {
    title: string;
    desc: string;
    filename: string; // server file name
}

export interface uploadVideoPartInfo {
    uploadUrl: string;
    completeUploadUrl: string;
    serverFileName: string;
}