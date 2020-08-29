import { readdirSync, statSync } from 'fs'
import { login, upload } from './index'
import { VideoPart } from "type/VideoPart";
import { join } from 'path'

const { username, password } = require('../../templates/info.json').personInfo

function getPaths(path: string) {
    let paths: string[] = []
    let pa = readdirSync(path);
    pa.forEach(function (ele: string) {
        paths.push(join(path, ele))
    })
    return paths
}

function upload2bilibili(dirName: string, title: string, desc: string, tags: string[], source: string, tid: Number) {
    return new Promise((resolve, reject) => {
        login(username, password).then(r => {
            const paths = getPaths(dirName)
            let parts: VideoPart[] = []
            for (let key in paths) {
                if (statSync(paths[key]).size > 1000) {
                    parts.push({
                        path: paths[key],
                        title: `P${parseInt(key) + 1}`,
                        desc: ""
                    })
                }
            }
            upload(dirName, r.access_token, r.sid, r.mid, parts, 2, title, tid, tags.join(','), desc, source).then(message => {
                resolve(message)
            }).catch(err => {
                reject(err)
            })
        }).catch(err => {
            reject(err)
        })
    })
}
export { upload2bilibili }