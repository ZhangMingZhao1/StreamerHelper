export interface Config {
    StreamerHelper: {
        debug: boolean,
        roomCheckTime: number,
        recycleCheckTime: number,
        videoPartLimitSize: number,
        enableUpload: boolean
    },
    personInfo: PersonInfo,
    streamerInfo: StreamerInfo[]
}

export interface PersonInfo {
    nickname: string,
    access_token: string,
    refresh_token: string,
    expires_in: number,
    tokenSignDate: number,
    mid: number
}

export interface StreamerInfo {
    name: string,
    uploadLocalFile: boolean,
    deleteLocalFile: boolean,
    templateTitle: string,
    delayTime: number,
    desc: string,
    source: string,
    dynamic: string,
    copyright: number,
    roomUrl: string,
    tid: number,
    tags: string[]

}