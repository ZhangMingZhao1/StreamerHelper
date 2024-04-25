export interface Config {
    StreamerHelper: {
        debug: boolean,
        roomCheckTime: number,
        recycleCheckTime: number,
        videoPartLimitSize: number,
        logLevel: LogLevel,
        push: {
            mail: {
                enable: boolean,
                host: string,
                port: number,
                from: string,
                pwd: string,
                to: string,
                secure: boolean

            },
            wechat: {
                enable: boolean,
                sendKey: string
            }
        }
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
    mid: number,
    cookies: string
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

export type LogLevel = "ALL" | "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | "MARK" | "OFF"