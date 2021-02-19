export interface VideoPart {
    title: string;
    desc: string;
    path?: string | undefined;
    filename?: string;
    server_file_name?: string;
    fileSize?: number;
    isFail?: boolean;
}
