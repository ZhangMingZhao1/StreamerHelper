import * as dayjs from "dayjs"
const nodemailer = require("nodemailer")

import { PushFunc } from "@/push";
import { LogLevel } from "@/type/config";

export const mail: PushFunc = async (level: LogLevel, ...args: string[]) => {

    const mailConfig = global.config.StreamerHelper.push.mail

    const transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port,
        secure: mailConfig.secure,
        auth: {
            user: mailConfig.from,
            pass: mailConfig.pwd,
        },
    });

    const msg = args.join(";")
    const html = `<p>告警信息: ${msg}</p>   <p>级别: ${level}</p>  <p>时间: ${dayjs().format()}</p>
    `

    transporter.sendMail({
        from: mailConfig.from,
        to: mailConfig.to,
        subject: `StreamerHelper 发生 ${level} 级别告警`,
        html,
    })
}