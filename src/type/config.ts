export interface Config {
    StreamerHelper: {
        debug: boolean,
        roomCheckTime: number,
        recycleCheckTime: number,
        videoPartLimitSize: number
    },
    personInfo: PersonInfo,
    streamerInfo: {
        [key: string]: StreamerInfo
    }[]
}

export interface PersonInfo {
    nickname: string,
    username: string,
    password: string,
    access_token: string,
    refresh_token: string,
    expires_in: number,
    tokenSignDate: string,
    mid: number
}

export interface StreamerInfo {
    uploadLocalFile: boolean,
    deleteLocalFile: boolean,
    templateTitle: string,
    delayTime: number,
    desc: string,
    source: string,
    dynamic: string,
    copyright: 2,
    roomUrl: string,
    tid: number,
    tags: string[]

}