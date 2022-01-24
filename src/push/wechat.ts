import * as dayjs from "dayjs"

import { $axios } from "@/http"
import { LogLevel } from "@/type/config"

export const wechat = async (level: LogLevel, ...args: string[]) => {
    return new Promise((_, reject) => {
        const msg = args.join(";")
        const desp = `告警信息: ${msg}\n   \n级别: ${level}\n  \n时间: ${dayjs().format()}`

        const params = {
            text: decodeURIComponent(`StreamerHelper 发生 ${level} 级别告警`),
            desp: decodeURIComponent(desp)
        }

        $axios.request({
            url: `https://sctapi.ftqq.com/${global.config.StreamerHelper.push.wechat.sendKey}.send`,
            method: "post",
            params
        }).catch(err => {
            reject(err)
        })

    })
}