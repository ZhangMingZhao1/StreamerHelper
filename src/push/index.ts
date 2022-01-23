import { LogLevel } from "@/type/config";
import { mail } from "@/push/mail";
import { wechat } from "@/push/wechat";

type AllowTypes = keyof typeof global.config.StreamerHelper.push
export type PushFunc = (level: LogLevel, ...args: string[]) => void

const pushConfig = global.config.StreamerHelper.push
const enables = Object.keys(pushConfig).filter(elem => pushConfig[elem as AllowTypes].enable) as Array<AllowTypes>
const pushFuncMap = new Map<AllowTypes, PushFunc>(
    [
        ["mail", mail],
        ["wechat", wechat]
    ]
)

export const pushMsg = async (level: LogLevel, ...args: string[]) => {

    for (const enable of enables) {
        const pushFunc = pushFuncMap.get(enable)
        
        if (pushFunc) {
            pushFunc(level, ...args)
        }
    }

}