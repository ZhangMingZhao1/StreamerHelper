import * as fs from "fs";
import * as querystring from 'querystring'
import * as terminalImage from 'terminal-image'
import { Logger } from "log4js";

import { $axios } from "../http";
import { log4js } from "../log";
import * as crypt from '@/util/crypt'

const md5 = require('md5-node')

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
    private _refresh_token: string | undefined;
    private _expires_in: number | undefined;
    private _nickname: string | '';
    private _tokenSignDate: Date | string;


    constructor(username: string, password: string, access_token: string = '', refresh_token: string = '', expires_in: number = 0, nickname: string = '', tokenSignDate: string, mid: number) {
        this.APPKEY = "aae92bc66f3edfab";
        this.APPSECRET = "af125a0d5279fd576c1b4418a3e8276d"
        this._username = username;
        this._password = password;
        this._access_token = access_token || '';
        this._refresh_token = refresh_token || '';
        this._expires_in = expires_in || undefined;
        this._nickname = nickname || '';
        this._tokenSignDate = tokenSignDate || '';
        this.logger = log4js.getLogger('User')
        this._mid = mid || 0;
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
            const text = fs.readFileSync('./templates/info.json')
            const obj = JSON.parse(text.toString())
            obj.personInfo = {
                nickname: this._nickname,
                username: this._username,
                password: this._password,
                access_token: this._access_token,
                refresh_token: this._refresh_token,
                expires_in: this._expires_in,
                tokenSignDate: this._tokenSignDate,
                mid: this._mid
            }
            const stringifies = JSON.stringify(obj, null, '  ')
            fs.writeFileSync('./templates/info.json', stringifies)
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
        if (!this._username) return this.logger.error(`Check your username !!`)
        if (!this._password) return this.logger.error(`Check your password !!`)

        try {
            await this.checkToken()

            // Judge Refresh Token
            const time = Math.floor((new Date().valueOf() - new Date(this._tokenSignDate).valueOf()) / 1000)
            if (this._tokenSignDate && this._expires_in && time >= this._expires_in / 2) await this.refreshToken()


        } catch (e) {
            await this.loginAccount()
            this.logger.error(e)
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
                        expires_in: undefined
                    }
                }: { code: number, message: string, data: { access_token: string; mid: number; refresh_token: string; expires_in: number | undefined } } = await $axios.$request({
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
                this._tokenSignDate = new Date()
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
        return new Promise(async (resolve, reject) => {
            this.logger.info(`Check token ${this._access_token}`)
            if (this._access_token === "") {
                this.logger.error(`Access Token not define`)
                reject()
            }
            let url = `https://api.snm0516.aisee.tv/x/tv/account/myinfo?access_key=${this._access_token}`
            try {
                const { code, message, data: { mid, name } } = await $axios.$get(url)
                if (code !== 0) {
                    this.logger.error(`An error occurred when try to auth by access_token: ${message}`)
                    reject()
                }
                this.logger.info(`Token is valid. ${mid} ${name}`)
                this._mid = mid
                this._nickname = name
                await this.sync()
                resolve(true)
            } catch (err) {
                this.logger.error(`An error occurred when try to check token: ${err}`)
                reject(err)
            }
        })

    }

    refreshToken = async () => {

        return new Promise<void>(async (resolve, reject) => {
            let url: string = 'https://passport.bilibili.com/api/v2/oauth2/refresh_token'

            let data: any = {
                access_token: this._access_token,
                refresh_token: this._refresh_token,
                access_key: this._access_token,
                actionKey: 'appkey',
                platform: 'android',
                appkey: this.APPKEY,
                build: 5511400,
                devices: 'android',
                mobi_app: 'android',
                ts: parseInt(String(new Date().valueOf() / 1000))
            }

            data.sign = md5(crypt.make_sign(data, this.APPSECRET))

            const headers: any = {}

            if (this.sessionID) {
                headers.cookie += `sid:${this.sessionID}; `
            }
            if (this.JSESSIONID) {
                headers.cookie += `JSESSIONID:${this.JSESSIONID}; `
            }

            try {
                const {
                    code,
                    data: {
                        "token_info": {
                            mid, access_token, refresh_token, expires_in
                        }
                    } = {
                        token_info: {
                            mid: 0,
                            access_token: '',
                            refresh_token: '',
                            expires_in: 0
                        }
                    }
                } = await $axios.$request({ url, data: querystring.stringify(data), headers, method: "post" })

                // auth fail { message: 'user not login', ts: 1612252355, code: -101 }

                if (code === 0) {
                    this._mid = mid
                    this._access_token = access_token
                    this._refresh_token = refresh_token
                    this._expires_in = expires_in
                    this._tokenSignDate = new Date()

                    this.logger.info(`Token refresh succeed !!`)
                    this.logger.info(`access_token ${access_token}`)
                    this.logger.info(`refresh_token ${refresh_token}`)
                    this.logger.info(`expires_in ${expires_in}`)

                    await this.sync()
                    resolve()
                } else if (code === -101) {
                    this.logger.error(`Access Token expire ...`)
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
