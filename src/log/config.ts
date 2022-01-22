import * as log4js from "log4js";

const logLevel = require('../../templates/info.json').StreamerHelper.debug ? "debug" : "info"

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
            appenders: ["cheese", "console"], level: logLevel
        },
        memory: {
            appenders: ["memory"], level: "info"
        },
        check: {
            appenders: ["console"], level: "debug"
        },
        default: {
            appenders: ["cheese", "console"], level: logLevel
        },
    },
});

export { log4js }
