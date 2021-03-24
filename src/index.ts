import {User} from "@/uploader/User";
import {log4js, logger} from "@/log";
import {Logger} from "log4js";
import * as fs from "fs";
import {join, basename} from "path";
import {emitter} from "@/util/utils";
import {getStreamUrl} from "@/engine/getStreamUrl";
import {StreamInfo} from "@/type/StreamInfo";
import {RoomStatus} from "@/engine/RoomStatus";
import {RecorderType} from "type/RecorderType";

interface personInfo {
    username: string;
    password: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    nickname: string;
    tokenSignDate: string;
    mid: number;
}

class APP {
    personInfo: personInfo
    user: User | undefined;
    private logger: Logger;
    schedule: object;
    recorderPool: RecorderType[];

    constructor() {
        this.personInfo = require('../templates/info.json').personInfo
        this.logger = log4js.getLogger(`APP`)
        this.schedule = {}
        this.recorderPool = []
    }

    init = async () => {
        return new Promise(async (reject) => {
            try {
                this.initUnCaughtException()
                await this.initUser()
                await this.initExitSignal()
                await this.initStreamDisconnect()
                await this.initSchedule()
                // @ts-ignore
                // console.log(this)
                // @ts-ignore
                this.schedule.checkRoom.task(this)

                setTimeout(()=> {
                    // @ts-ignore
                    this.schedule.recycleFile.task(this)
                }, 15000)

            } catch (e) {
                reject(e)
                process.exit(1)
            }
        })
    }

    initUser = async () => {
        return new Promise(async (resolve, reject) => {
            const {
                username,
                password,
                access_token,
                refresh_token,
                expires_in,
                tokenSignDate,
                nickname,
                mid
            }: personInfo = this.personInfo
            this.user = new User(username, password, access_token, refresh_token, expires_in, nickname, tokenSignDate, mid)
            try {
                await this.user.login()
                resolve()
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }
        })
    }

    /*
    * Exec once app.schedule.checkRoom.task()
    *
    * */
    initSchedule = async () => {
        return new Promise(async (resolve,reject) => {

            try {
                fs.readdirSync(join(__dirname, 'schedule')).forEach(path => {
                    let name = basename(path, '.js')
                    this.logger.info(`Load Schedule [${name}]`)
                    let module = require(join(__dirname, 'schedule', path))
                    // @ts-ignore
                    this.schedule[name] = module
                    if (module.schedule) {
                        // @ts-ignore
                        this.schedule[name].timer = setInterval( () => {
                            module.task(this)
                        }, module.schedule.interval);
                    }
                })
                resolve()
            } catch (e) {
                this.logger.error(e)
                reject(e)
            }

        })
    }

    initExitSignal = async () => {
        this.logger.info(`initExitSignal`)
        process.on("SIGINT", () => {
            this.logger.info("Receive exit signal, the process will exit after 3 seconds.")
            this.logger.info("Process exited by user.")
            // @ts-ignore
            clearInterval(this.schedule['checkRoom'].timer)
            emitter.removeAllListeners("streamDisconnect")
            this.recorderPool.forEach((elem: RecorderType) => {
                elem.stopRecord()
            })
            setTimeout(() => {
                process.exit()
            }, 3000);
        })
    }

    initUnCaughtException = () => {
        this.logger.info(`initUnCaughtException`)
        process.on("uncaughtException", (err) => {
            this.logger.error("exception caught: ", err);
        });
    }

    initStreamDisconnect = async () => {
        emitter.on('streamDisconnect', (curRecorder: RecorderType) => {
            this.recorderPool.forEach((elem: RecorderType) => {
                if (elem.recorderName === curRecorder.recorderName) {
                    curRecorder = elem
                }
            })

            setTimeout(() => {
                getStreamUrl(curRecorder.recorderName, curRecorder.recorderLink, curRecorder.tags, curRecorder.tid)
                    .then((stream: StreamInfo) => {
                        // the stream disconnected
                        // but room online
                        // so restart the recorder
                        // continue downloading
                        logger.info(`下载流 ${curRecorder.dirName} 断开，但直播间在线，重启`)
                        curRecorder.startRecord(stream)

                    })
                    .catch(() => {
                        RoomStatus.delete(curRecorder.recorderName)
                    })

            }, 5000);

        })
    }
}

const app = new APP()
app.init().then(r => r)
export {
    app
}
