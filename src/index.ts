import * as fs from "fs";

import { User } from "@/uploader/user";
import { getExtendedLogger } from "@/log";
import { Logger } from "log4js";
import { join, basename } from "path";
import { changeFileStatus, emitter } from "@/util/utils";
import { Scheduler } from "./type/scheduler";
import { Recorder } from "./engine/message";
import { Config } from "./type/config";
import { FileStatus } from "./type/fileStatus";
import { FileHound } from "@/util/utils"

type Schedulers = {
    [key: string]: {
        scheduler: Scheduler,
        timer?: NodeJS.Timer
    }
}

export class App {
    private _logger: Logger;
    private _user!: User; // will init in initUser()
    private _schedulers: Schedulers;
    private _recorderPool: Map<string, Recorder>;
    private _config: Config;
    static _i: any;

    get logger(): Logger {
        return this._logger
    }

    get user(): User {
        return this._user;
    }

    get schedulers(): Schedulers {
        return this._schedulers
    }

    get recorderPool(): Map<string, Recorder> {
        return this._recorderPool
    }

    get config(): Config {
        return this._config
    }

    constructor() {
        global.config = this._config = require('../templates/info.json')

        this._logger = getExtendedLogger(`APP`)
        this._schedulers = {}
        this._recorderPool = new Map<string, Recorder>()

        if (!fs.existsSync(join(process.cwd(), '/download'))) {
            fs.mkdirSync(join(process.cwd(), '/download'))
        }

    }

    static getInstance() {
        if (!App._i) {
            App._i = new App()
        }
        return App._i
    }

    init = async () => {
        return new Promise<void>(async (_, reject) => {

            try {
                this.initUnCaughtException()
                await this.initUser()
                await this.initExitSignal()
                await this.initStreamDisconnect()
                await this.initSyncFileStatus()
                await this.initSchedule()
            } catch (e) {
                return reject(e)
            }
        })
    }

    initUser = async () => {
        this._logger.info(`initUser`)
        return new Promise<void>(async (resolve, reject) => {

            this._user = new User(global.config.personInfo)

            try {
                await this._user.login()
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
                const schedulerFiles = await fs.promises.readdir(join(__dirname, 'schedule'));
                schedulerFiles.forEach(async (fileName) => {
                    const schedulerFileName = basename(fileName, '.js')
                    const scheduleModule: Scheduler = (await import(join(__dirname, 'schedule', fileName))).default

                    this._logger.info(`Load Schedule [${schedulerFileName}]`)

                    this._schedulers[schedulerFileName] = { scheduler: scheduleModule }

                    if (typeof (scheduleModule.interval) === 'number') {
                        scheduleModule.task()

                        this._schedulers[schedulerFileName].timer = setInterval(() => {
                            scheduleModule.task()
                        }, scheduleModule.interval);
                    }

                })

                resolve()
            } catch (e) {
                this._logger.error(e)
                reject(e)
            }

        })
    }

    initExitSignal = async () => {

        this._logger.info(`initExitSignal`)

        process.on("SIGINT", () => {
            this._logger.info("Receive exit signal, the process will exit after 3 seconds.")
            this._logger.info("Process exited by user.")

            for (const key in this._schedulers) {
                if (this._schedulers[key].timer) {
                    clearInterval(this._schedulers[key].timer as NodeJS.Timer)
                }
            }

            emitter.removeAllListeners("streamDisconnect")

            this._recorderPool.forEach((elem: Recorder) => {
                elem.stopRecord()
            })

            setTimeout(() => {
                process.exit()
            }, 3000);
        })
    }

    initUnCaughtException = () => {

        this._logger.info(`initUnCaughtException`)

        process.on("uncaughtException", (err) => {
            this._logger.error("exception caught: ", err);
        });
    }

    initStreamDisconnect = async () => {

        emitter.on('streamDisconnect', (curRecorder: Recorder) => {
            this._logger.info(`Recorder ${curRecorder.recorderTask.recorderName} 退出: `)

        })
    }

    initSyncFileStatus = async () => {
        const files: string[] = await FileHound.create()
            .paths(join(process.cwd(), "/download"))
            .match('fileStatus.json')
            .ext('json')
            .find();



        for (const file of files) {
            const text = fs.readFileSync(file)
            const obj: FileStatus = JSON.parse(text.toString())

            this.logger.debug(`Sync fileStatus: ${file} ${JSON.stringify(obj, null, 2)}`)

            const streamer = this.config.streamerInfo.find(elem => elem.name === obj.recorderName)
            if (!streamer)
                continue

            changeFileStatus({
                uploadLocalFile: streamer.uploadLocalFile,
                deleteLocalFile: streamer.deleteLocalFile,
                templateTitle: streamer.templateTitle,
                delayTime: streamer.delayTime,
                desc: streamer.desc,
                source: streamer.source,
                dynamic: streamer.dynamic,
                copyright: streamer.copyright,
                recorderLink: streamer.roomUrl,
                tid: streamer.tid,
                tags: streamer.tags
            }, file)

        }
    }
}

global.app = App.getInstance()
global.app.init().catch(global.app.logger.error)