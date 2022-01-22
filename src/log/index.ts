import { log4js } from "@/log/config";

export function getExtendedLogger(category?: string | undefined): log4js.Logger {
    return extend(log4js.getLogger(category))
}

const ALL_VALUE = Number.MIN_VALUE,
    TRACE = 5000,
    DEBUG = 10000,
    INFO = 20000,
    WARN = 30000,
    ERROR = 40000,
    FATAL = 50000,
    MARK = 9007199254740992,
    OFF = Number.MAX_VALUE


const levels: any = {
    ALL: { value: ALL_VALUE, colour: 'grey' },
    TRACE: { value: TRACE, colour: 'blue' },
    DEBUG: { value: DEBUG, colour: 'cyan' },
    INFO: { value: INFO, colour: 'green' },
    WARN: { value: WARN, colour: 'yellow' },
    ERROR: { value: ERROR, colour: 'red' },
    FATAL: { value: FATAL, colour: 'magenta' },
    MARK: { value: MARK, colour: 'grey' }, // 2^53
    OFF: { value: OFF, colour: 'grey' }
}

const extendHandler: ProxyHandler<log4js.Logger> = {
    get: (obj: any, prop) => {
        const propName = prop.toString().toUpperCase()
        const level = levels[propName]
        if (level && level.value >= WARN) {
            // 推送至用户
            console.log("should push tu user")
        }

        return obj[prop]

    }
}

function extend(logger: log4js.Logger) {
    return new Proxy<log4js.Logger>(logger, extendHandler)
}