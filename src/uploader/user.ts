import * as fs from "fs";

import * as querystring from 'querystring'
import { Logger } from "log4js";
const md5 = require('md5-node')
const qrcode = require('qrcode-terminal')
const qr2image = require('qr-image')

import { $axios } from "@/http";
import { getExtendedLogger } from "@/log";
import * as crypt from '@/util/crypt'
import { BiliAPIResponse, LoginResponse, GetQRCodeResponse, GetUserInfoResponse } from "@/type/biliAPIResponse";
import { PersonInfo } from "@/type/config";

export class User {

    private _access_token: string;
    private _mid: number;
    private logger: Logger;
    private sessionID: string | undefined;
    private JSESSIONID: string | undefined;
    private _refresh_token: string;
    private _expires_in: number;
    private _nickname: string | undefined;
    private _tokenSignDate: number;


    constructor(personInfo: PersonInfo) {
        this._access_token = personInfo.access_token;
        this._refresh_token = personInfo.refresh_token;
        this._expires_in = personInfo.expires_in;
        this._nickname = personInfo.nickname;
        this._tokenSignDate = personInfo.tokenSignDate;
        this.logger = getExtendedLogger('User')
        this._mid = personInfo.mid || 0;
    }

    get access_token(): string {
        return this._access_token;
    }

    set access_token(value: string) {
        this._access_token = value;
    }

    /**
     * 同步个人数据到配置文件
     */
    sync = async () => {
        this.logger.info(`Sync User info ...`)

        try {
            const text = await fs.promises.readFile('./templates/info.json')
            const infoObj = JSON.parse(text.toString())
            infoObj.personInfo = {
                nickname: this._nickname,
                access_token: this._access_token,
                refresh_token: this._refresh_token,
                expires_in: this._expires_in,
                tokenSignDate: this._tokenSignDate,
                mid: this._mid
            }
            const stringified = JSON.stringify(infoObj, null, '  ')
            fs.promises.writeFile('./templates/info.json', stringified)
            this.logger.info(`Sync User info ... DONE: ${JSON.stringify(infoObj.personInfo, null, 2)}`)
        } catch (e) {
            this.logger.error("An error occurred when sync user info:", e)
        }

    }

    login = async () => {

        try {
            await this.checkToken()
            // Judge Refresh Token
            const time = Math.floor((Date.now() - (this._tokenSignDate || 0)) / 1000)

            if (time >= (this._expires_in || 0) / 2) {
                await this.refreshToken()
                await this.sync()
            }
        } catch (e) {
            // await this.loginAccount()
            try {
                const QRData = await this.getQRCode()
                qrcode.generate(QRData.url, { small: true })
                qr2image.image(QRData.url).pipe(fs.createWriteStream("./qrcode.png"))
                await this.loginByQRCode(QRData)
                await this.checkToken()
                await fs.promises.unlink('./qrcode.png')
                await this.sync()
            } catch (error) {
                throw (error)
            }
        }

    }

    checkToken = async () => {
        return new Promise<void>(async (resolve, reject) => {
            this.logger.info(`Check token ${this._access_token}`)
            if (this._access_token === "") {
                this.logger.error(`Access Token not define`)
                return reject()
            }
            const url = `https://api.snm0516.aisee.tv/x/tv/account/myinfo?access_key=${this._access_token}`
            try {
                const { data: { data, code, message } } = await $axios.request<BiliAPIResponse<GetUserInfoResponse>>({
                    url
                })

                this.logger.debug('Get user info response: ')
                this.logger.debug(JSON.stringify(data, null, 2))

                if (code !== 0) {
                    this.logger.error(`An error occurred when try to auth by access_token: ${message}`)
                    return reject()
                }
                this.logger.info(`Token is valid. ${data.mid} ${data.name}`)
                this._mid = data.mid
                this._nickname = data.name
                resolve()
            } catch (err) {
                this.logger.error(`An error occurred when try to check token: ${err}`)
                reject(err)
            }
        })

    }

    refreshToken = async () => {

        return new Promise<void>(async (resolve, reject) => {
            const url: string = 'https://passport.bilibili.com/x/passport-login/oauth2/refresh_token'

            const params: any = {
                access_token: this._access_token,
                refresh_token: this._refresh_token,
                access_key: this._access_token,
                actionKey: 'appkey',
                platform: 'android',
                appkey: "4409e2ce8ffd12b8",
                build: 5511400,
                devices: 'android',
                mobi_app: 'android',
                ts: parseInt(String(new Date().valueOf() / 1000))
            }

            params.sign = md5(crypt.make_sign(params, "59b43e04ad6965f34319062b478f83dd"))

            const headers: any = {}

            if (this.sessionID) {
                headers.cookie += `sid:${this.sessionID}; `
            }
            if (this.JSESSIONID) {
                headers.cookie += `JSESSIONID:${this.JSESSIONID}; `
            }

            try {
                const { data: {
                    data: {
                        token_info
                    }, code, message
                } } = await $axios.request<BiliAPIResponse<LoginResponse>>({ url, data: querystring.stringify(params), headers, method: "post" })
                if (code === 0) {
                    this._mid = token_info.mid
                    this._access_token = token_info.access_token
                    this._refresh_token = token_info.refresh_token
                    this._expires_in = token_info.expires_in
                    this._tokenSignDate = Date.now()

                    this.logger.info(`Token refresh succeed !!`)
                    resolve()
                } else {
                    this.logger.error(`An error occurred when RefreshToken: ${message}`)
                    reject()
                }
            } catch (e) {
                this.logger.error(`An error occurred when RefreshToken:`, e)
                reject()
            }
        })
    }

    loginByQRCode = async (QRData: GetQRCodeResponse) => {
        return new Promise<void>(async (resolve) => {


            const params: any = {
                "appkey": "4409e2ce8ffd12b8",
                "local_id": "0",
                "auth_code": QRData.auth_code,
                'ts': (+new Date()).toString().substr(0, 10)
            }
            params.sign = md5(crypt.make_sign(params, "59b43e04ad6965f34319062b478f83dd"))

            while (true) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 2 * 1000);
                })
                const { data: {
                    code,
                    message,
                    data
                } } = await $axios.request<BiliAPIResponse<LoginResponse>>({
                    url: "http://passport.bilibili.com/x/passport-tv-login/qrcode/poll",
                    method: "post",
                    params
                })
                this.logger.debug('login by qrcode res: ')
                if (code === 0) {
                    this.logger.info("LOGIN BY QRCODE SUCCESS")
                    this._access_token = data.token_info.access_token
                    this._refresh_token = data.token_info.refresh_token
                    this._mid = data.token_info.mid
                    this._expires_in = data.token_info.expires_in
                    return resolve()
                } else {
                    this.logger.debug(message)
                }
            }

        })
    }

    getQRCode = async () => {
        return new Promise<GetQRCodeResponse>(async (resolve, reject) => {
            const params: any = {
                "appkey": "4409e2ce8ffd12b8",
                "local_id": "0",
                'ts': (+new Date()).toString().substr(0, 10)
            }
            params.sign = md5(crypt.make_sign(params, "59b43e04ad6965f34319062b478f83dd"))
            const { data: {
                code, message, data
            } } = await $axios.request<BiliAPIResponse<GetQRCodeResponse>>({
                url: "http://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
                method: "post",
                params
            })
            this.logger.debug('Get QRCode response: ')
            if (code !== 0) {
                return reject(message)
            }
            resolve(data)
        })
    }
}