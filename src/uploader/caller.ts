import * as fs from "fs"
import { auth_token, login, upload } from './index'
import { VideoPart } from "type/VideoPart";
import { join } from 'path'
import {logger} from "../log";

const { access_token, username, password } = require('../../templates/info.json').personInfo

function readDirSync(path: string) {
    let paths: string[] = []
    let pa = fs.readdirSync(path);
    pa.forEach(function (ele: string) {
        paths.push(join(path, ele))
    })
    return paths
}

function upload2bilibili(dirName: string, title: string, desc: string, tags: string[], source: string, tid: Number) {
    return new Promise((resolve, reject) => {
        const paths = readDirSync(dirName)
        let parts: VideoPart[] = []
        for (let key in paths) {
            parts.push({
                path: paths[key],
                title: `P${parseInt(key) + 1}`,
                desc: ""
            })
        }
        logger.debug(`paths: ${paths} parts: ${parts}`)
        auth_token(access_token).then(r => {
            upload(dirName, access_token, r, parts, 2, title, tid, tags.join(','), desc, source).then(message => {
                resolve(message)
            }).catch(err => {
                logger.trace(err)
                reject(err)
            })
        }).catch(() => {
            login(username, password).then(r => {
                const text = fs.readFileSync('./templates/info.json')
                const obj = JSON.parse(text.toString())
                obj.personInfo.access_token = r.access_token
                const stringified = JSON.stringify(obj, null, '  ')
                fs.writeFileSync('./templates/info.json', stringified)
                //用户密码登录
                upload(dirName, r.access_token, r.mid, parts, 2, title, tid, tags.join(','), desc, source).then(message => {
                    resolve(message)
                }).catch(err => {
                    logger.trace(err)
                    reject(err)
                })
            }).catch(err => {
                reject(err)
            })

        })
    })
}
export { upload2bilibili }