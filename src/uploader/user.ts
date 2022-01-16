import * as fs from "fs";

import * as querystring from 'querystring'
import * as terminalImage from 'terminal-image'
import { Logger } from "log4js";

import { $axios } from "../http";
import { log4js } from "../log";
import * as crypt from '@/util/crypt'
import { BiliAPIResponse, LoginResponse, GetQRCodeResponse, GetUserInfoResponse } from "@/type/biliAPIResponse";
import { PersonInfo } from "@/type/config";

const md5 = require('md5-node')
const qrcode = require('qrcode-terminal')
const qr2image = require('qr-image')

export class User {
    private readonly APPKEY: string
    private readonly APPSECRET: string

    private _access_token: string;
    private _mid: number;
    private _password: string;
    private _username: string;
    private logger: Logger;
    private sessionID: string | undefined;
    private JSESSIONID: string | undefined;
    private _refresh_token: string;
    private _expires_in: number;
    private _nickname: string | undefined;
    private _tokenSignDate: number;


    constructor(personInfo: PersonInfo) {
        this.APPKEY = "aae92bc66f3edfab";
        this.APPSECRET = "af125a0d5279fd576c1b4418a3e8276d"
        this._username = personInfo.username;
        this._password = personInfo.password;
        this._access_token = personInfo.access_token;
        this._refresh_token = personInfo.refresh_token;
        this._expires_in = personInfo.expires_in;
        this._nickname = personInfo.nickname;
        this._tokenSignDate = personInfo.tokenSignDate;
        this.logger = log4js.getLogger('User')
        this._mid = personInfo.mid || 0;
    }

    get access_token(): string {
        return this._access_token;
    }

    set access_token(value: string) {
        this._access_token = value;
    }

    get password(): string {
        return this._password;
    }

    set password(value: string) {
        this._password = value;
    }

    get username(): string {
        return this._username;
    }

    set username(value: string) {
        this._username = value;
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
                username: this._username,
                password: this._password,
                access_token: this._access_token,
                refresh_token: this._refresh_token,
                expires_in: this._expires_in,
                tokenSignDate: this._tokenSignDate,
                mid: this._mid
            }
            const stringified = JSON.stringify(infoObj, null, '  ')
            fs.promises.writeFile('./templates/info.json', stringified)
            this.logger.info(`Sync User info ... DONE`)
        } catch (e) {
            this.logger.error(e)
        }

    }

    //
    /**
     * 登陆 Check username && password => checkToken => getKey => auth(Username) => auth(captcha)
     */
    login = async () => {
        // if (!this._username) return this.logger.error(`Check your username !!`)
        // if (!this._password) return this.logger.error(`Check your password !!`)

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

    loginAccount = async () => {
        return new Promise<void>(async (resolve, reject) => {

            const { hash, key }: any = await this.getKey()
            const encoded_password = crypt.make_rsa(`${hash}${this._password}`, key)
            const url = "https://passport.bilibili.com/api/oauth2/login"
            const headers: any = {
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': '',
                'Accept-Encoding': 'gzip,deflate',
                'cookie': ''
            }
            if (this.sessionID) {
                headers.cookie += `sid:${this.sessionID}; `
            }
            if (this.JSESSIONID) {
                headers.cookie += `JSESSIONID:${this.JSESSIONID}; `
            }
            let data: { appkey: string | undefined; password: string; platform: string; ts: number; username: string; sign?: string | undefined } = {
                'appkey': this.APPKEY,
                'password': encoded_password,
                'platform': "pc",
                'ts': parseInt(String(new Date().valueOf() / 1000)),
                'username': this._username
            }
            data.sign = md5(crypt.make_sign(data, this.APPSECRET))
            try {
                this.logger.debug(`Login Post Data: ${JSON.stringify(data, null, 2)}`)

                const {
                    code,
                    message,
                    data: { access_token, mid, refresh_token, expires_in } = {
                        access_token: '',
                        mid: 0,
                        refresh_token: '',
                        expires_in: 15552000
                    }
                }: { code: number, message: string, data: { access_token: string; mid: number; refresh_token: string; expires_in: number } } = await $axios.$request({
                    method: "POST",
                    url,
                    data: querystring.stringify(data),
                    headers
                })

                this.logger.debug(`code ${code} message ${message} access-token ${access_token} mid ${mid} refresh_token ${refresh_token} expires_in ${expires_in}`)

                // captcha error
                if (code === -105) {
                    await this.getCapcha()
                }

                if (code !== 0) {
                    this.logger.error(`An error occurred when login: ${message}`)
                    return
                }
                this._access_token = access_token
                this._mid = mid
                this._refresh_token = refresh_token
                this._expires_in = expires_in
                this._tokenSignDate = Date.now()
                this.logger.info(`mid ${mid}`)
                this.logger.info(`access-token ${access_token}`)
                this.logger.info(`token expires_in ${expires_in}s`)
                this.logger.info(`refresh_token ${refresh_token}`)
                this.logger.info(`Login succeed !!`)
                await this.sync()
                resolve()
            } catch (err) {
                this.logger.error(err)
                reject(err)
            }
        })

    }

    getKey = async () => {
        return new Promise(async (resolve, reject) => {
            this.logger.debug(`start getKey`)
            let url = "https://passport.bilibili.com/api/oauth2/getKey"
            let data: { appkey: string | undefined; platform: string; ts: string; sign?: string } = {
                'appkey': this.APPKEY,
                'platform': "pc",
                'ts': (+new Date()).toString().substr(0, 10)
            };
            data.sign = md5(crypt.make_sign(data, this.APPSECRET))

            this.logger.debug(`getKey data ${JSON.stringify(data)} APPSECRET ${this.APPSECRET}`)

            const headers: any = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': "application/json, text/javascript, */*; q=0.01",
                'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36"
            }


            try {
                if (this.sessionID) {
                    headers.cookie += `sid:${this.sessionID}; `
                }
                if (this.JSESSIONID) {
                    headers.cookie += `JSESSIONID:${this.JSESSIONID}; `
                }

                const {
                    resHeaders,
                    code,
                    data: { hash, key }
                }: { resHeaders: { "set-cookie": string }; code: number; data: { hash: string; key: string; } } = await $axios.$request({
                    method: "post",
                    url,
                    data: querystring.stringify(data),
                    headers
                })

                this.logger.debug(`Get key \n ${key} hash ${hash} code ${code} \n resHeaders ${JSON.stringify(resHeaders, null, 2)} ${this.sessionID}`)
                this.logger.debug(`${resHeaders["set-cookie"]}`)
                const regex = /^sid=([\w]*)/g;

                for (const resHeader of resHeaders["set-cookie"]) {
                    let tmp = resHeader.match(regex)
                    if (tmp) {
                        this.sessionID = tmp[0].split("=")[1]
                        this.logger.info(`sessionID ${this.sessionID}`)
                    }
                }

                if (code !== 0) {
                    this.logger.error(`Get key error ,  code ${code}`)
                    reject()
                }
                resolve({ hash, key })
            } catch (e) {
                this.logger.error(`An error occurred when getKey: ${e}`)
                reject(`An error occurred when getKey: ${e}`)
            }
        })

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
                this.logger.debug(data)

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
                this.logger.error(e)
                reject()
            }
        })
    }

    // loginCaptcha = async () => {}

    // DEV
    getCapcha = async () => {

        return new Promise(async () => {
            const headers: any = {
                'User-Agent': '',
                'Accept-Encoding': 'gzip,deflate',
                cookie: ''
            }
            if (this.sessionID) {
                headers.cookie = headers.cookie + `sid:${this.sessionID}; `
            }
            if (this.JSESSIONID) {
                headers.cookie = headers.cookie + `JSESSIONID:${this.JSESSIONID}; `
            }
            const data: any = {
                'appkey': this.APPKEY,
                'platform': 'pc',
                'ts': parseInt(String(new Date().valueOf() / 1000)),
            }
            data['sign'] = md5(crypt.make_sign(data, this.APPSECRET))

            let url = 'https://passport.bilibili.com/captcha'

            console.log(JSON.stringify(headers, null, 2));
            const dataImg = await $axios.request({
                url,
                method: "get",
                headers,
                responseType: "arraybuffer",
                params: querystring.stringify(data)
            })
            console.log(dataImg);
            console.log(await terminalImage.buffer(dataImg.data));
            const regex = /^JSESSIONID=([\w]*)/g;

            for (const headerElement of dataImg.headers["set-cookie"]) {
                let tmp = headerElement.match(regex)
                if (tmp) {
                    this.JSESSIONID = tmp[0].split("=")[1]
                    this.logger.info(`JSESSIONID ${this.JSESSIONID}`)
                }
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

// const {
//     username,
//     password,
//     access_token,
//     refresh_token,
//     expires_in,
//     tokenSignDate,
//     nickname
// } = require('../../templates/info.json').personInfo
// const user = new User(username, password, access_token, refresh_token, expires_in, nickname, tokenSignDate)
//
// // user.getKey().then(r => console.log(r))
//
// user.login().then(r => console.log(r))
//
// // user.refreshToken().then(r => console.log(r))
//
// // user.getCapcha().then(r => console.log(r))
