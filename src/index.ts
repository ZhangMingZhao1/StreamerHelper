import { User } from "@/uploader/user";
import { log4js } from "@/log";
import { Logger } from "log4js";
import * as fs from "fs";
import { join, basename } from "path";
import { emitter } from "@/util/utils";
import { Scheduler } from "./type/scheduler";
import { Recorder } from "./engine/message";
import { RoomStatus } from "./engine/roomStatus";
import { uploadStatus } from "./uploader/uploadStatus";
import { RoomStatusPath } from "./engine/roomPathStatus";

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

type Schedulers = {
    [key: string]: {
        scheduler: Scheduler,
        timer?: NodeJS.Timer
    }
}

class App {
    private logger: Logger;
    personInfo: personInfo
    user?: User;
    schedulers: Schedulers;
    recorderPool: Recorder[];

    constructor() {
        this.personInfo = require('../templates/info.json').personInfo
        this.logger = log4js.getLogger(`APP`)
        this.schedulers = {}
        this.recorderPool = []
        if (!fs.existsSync(join(process.cwd(), '/download'))) {
            fs.mkdirSync(join(process.cwd(), '/download'))
        }
    }

    init = async () => {
        return new Promise<void>(async (reject) => {
            try {
                this.initUnCaughtException()
                await this.initUser()
                await this.initExitSignal()
                await this.initStreamDisconnect()
                await this.initSchedule()
            } catch (e) {
                return reject(e)
            }
        })
    }

    initUser = async () => {
        return new Promise<void>(async (resolve, reject) => {
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
                reject(e)
            }
        })
    }

    /*
    * Exec once app.schedule.checkRoom.task()
    *
    * */
    initSchedule = async () => {
        return new Promise<void>(async (resolve, reject) => {
            try {
                setInterval(()=>{
                    this.logger.info(`RoomStatus ${RoomStatus} UploadStatus ${uploadStatus} RoomPathStatus ${RoomStatusPath}`)
                    this.logger.info(`RecorderPool size ${this.recorderPool.length} RecorderPool `)
                    this.recorderPool.forEach((elem: Recorder, index: number) => {
                        this.logger.info(`index ${index} recorder ${elem.recorderName} dir ${elem.dirName}`)
                    })
                },20000)
                fs.readdirSync(join(__dirname, 'schedule')).forEach(async (fileName) => {
                    const schedulerFileName = basename(fileName, '.js')
                    this.logger.info(`Load Schedule [${schedulerFileName}]`)
                    const scheduleModule: Scheduler = (await import(join(__dirname, 'schedule', fileName))).default
                    this.schedulers[schedulerFileName] = { scheduler: scheduleModule }
                    if (typeof (scheduleModule.interval) === 'number') {
                        this.schedulers[schedulerFileName].timer = setInterval(() => {
                            scheduleModule.task(this)
                        }, scheduleModule.interval);
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
            for (const key in this.schedulers) {
                if (this.schedulers[key].timer) {
                    clearInterval(this.schedulers[key].timer as NodeJS.Timer)
                }
            }
            emitter.removeAllListeners("streamDisconnect")
            this.recorderPool.forEach((elem: Recorder) => {
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
        emitter.on('streamDisconnect', (curRecorder: Recorder) => {
            this.recorderPool.forEach((elem: Recorder) => {
                if (elem.recorderName === curRecorder.recorderName) {
                    curRecorder = elem
                    this.logger.info(`有一个Recorder退出`)
                    this.logger.info(curRecorder)
                }
            })

        })
    }
}

const app = new App()


app.init().then(r => r).catch(e => log4js.getLogger(`APP`).error(e))


export {
    App,
    app
}
