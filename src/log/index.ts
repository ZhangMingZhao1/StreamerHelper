import * as log4js from "log4js";
const logStatus :string = require('../../templates/info.json').StreamerHelper.debug ? "debug" : "info"

log4js.configure({
    appenders: {
        cheese: {
            type: "file",
            filename: process.cwd() + "/logs/artanis.log",
            maxLogSize: 20971520,
            backups: 10,
            encoding: "utf-8",
        },
        memory: {
            type: "file",
            filename: process.cwd() + "/logs/memory.log",
            maxLogSize: 20971520,
            backups: 10,
            encoding: "utf-8",
        },
        console: {
            type: "console"
        }
    },
    categories: {
        cheese: {
            appenders: ["cheese", "console"], level: logStatus
        },
        memory: {
            appenders: ["memory"], level: "info"
        },
        default: {
            appenders: ["cheese", "console"], level: logStatus
        },
    },
});

const logger = log4js.getLogger("cheese");
const memoryLogger = log4js.getLogger("memory");

export {
    logger,
    memoryLogger
}
