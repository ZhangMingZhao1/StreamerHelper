const md5 = require('md5-node')
const crypto = require('crypto')
const fs = require('fs')
const cookie = require('cookie-parse')
const superagent = require('superagent')
const crypt = require("../util/crypt")
const {logger} = require('../log')

const rootPath = process.cwd();
const APPKEY = 'aae92bc66f3edfab'
const APPSECRET = 'af125a0d5279fd576c1b4418a3e8276d'


const delay = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function auth_by_token(access_key) {
    return new Promise(async (resolve, reject) => {
        if (access_key === "") {
            logger.error(`Access_key undefined, try to use the account to auth`)
            return reject()
        }
        let url = `https://api.snm0516.aisee.tv/x/tv/account/myinfo?access_key=${access_key}`
        try {
            const result = await superagent
                .get(url)
            const data = JSON.parse(result.text)
            if (data.code !== 0) {
                logger.error(`An error occurred when try to auth by access_token: ${data.message}`)
                reject()
            }
            logger.info(`Use access_token to auth`)
            resolve(data.data.mid)
        } catch (err) {
            logger.error(`An error occurred when try to auth by access_token: ${err}`)
            reject()
        }
    })

}

function get_key() {
    return new Promise(async (resolve, reject) => {
        let post_data = {
            'appkey': APPKEY,
            'platform': "pc",
            'ts': String(parseInt(new Date() / 1000))
        };
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': "application/json, text/javascript, */*; q=0.01"
        }
        post_data["sign"] = md5(crypt.make_sign(post_data, APPSECRET))
        let url = "https://passport.bilibili.com/api/oauth2/getKey"
        try {
            const result = await superagent
                .post(url)
                .type('form')
                .set(headers)
                .send(post_data)
            const data = JSON.parse(result.text).data
            resolve({
                hash: data.hash,
                key: data.key
            })
        } catch (err) {
            // console.log(err)
            // logger.info(err)
            reject(`An error occurred when getKey: ${err}`)
        }
    })
}

function login(username, password) {
    return new Promise(async (resolve, reject) => {
        let data
        try {
            data = await get_key()
        } catch (error) {
            return reject(`An error occurred when login: ${error}`)
        }
        const encoded_password = crypt.make_rsa(`${data.hash}${password}`, data.key)
        const url = "https://passport.bilibili.com/api/oauth2/login"
        const headers = {
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': '',
            'Accept-Encoding': 'gzip,deflate',
        }
        let post_data = {
            'appkey': APPKEY,
            'password': encoded_password,
            'platform': "pc",
            'ts': String(parseInt(new Date() / 1000)),
            'username': username
        }
        post_data["sign"] = md5(crypt.make_sign(post_data, APPSECRET))
        try {
            logger.debug(`Login Post Data: ${post_data}`)
            const result = await superagent
                .post(url)
                .set(headers)
                .type('form')
                .send(post_data)
            const res = JSON.parse(result.text);
            if (res.code !== 0) {
                return reject(`An error occurred when login: ${res.message}`)
            }
            resolve({
                access_token: res.data.access_token,
                mid: res.data.mid,
            })
        } catch (err) {
            // console.log(err)
            // logger.info(err)
            reject(`An error occurred when login: ${res}`)
        }
    })
}

function upload_chunk(upload_url, server_file_name, local_file_name, chunk_data, chunk_size, chunk_id, chunk_total_num, retryTimes) {
    return new Promise(async (resolve, reject) => {
        let chunkHash = crypto.createHash('md5')
        for (let v of chunk_data) {
            chunkHash.update(v)
        }
        let files = {
            'version': ('2.0.0.1054'),
            'filesize': (chunk_size),
            'chunk': (chunk_id),
            'chunks': (chunk_total_num),
            'md5': (chunkHash.digest('hex')),
        }
        for (let i = 1; i <= retryTimes; i++) {
            try {
                const r = await superagent
                    .post(upload_url)
                    .set('Cookie', `PHPSESSID=${server_file_name};`)
                    .field(files)
                    .attach('file', Buffer.concat(chunk_data), 'application/octet-stream')
                // console.log(`chunk #${chunk_id} upload ended, returns: ${r.text}`)
                logger.info(`chunk #${chunk_id} upload ended, returns: ${r.text}`)
                return resolve()
            } catch (err) {
                // console.log(err)
                //手动暂停 10s
                logger.error(`Upload chunk error: ${err} , retry in 10 seconds...`)
                if (i === retryTimes) {
                    return reject(`An error occurred when upload chunk: ${err}`)
                }
                await delay(10000)
            }
        }
    })
}

function upload_video_part(access_token, mid, video_part, retryTimes) {
    return new Promise(async (resolve, reject) => {
        const headers = {
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': '',
            'Accept-Encoding': 'gzip,deflate',
        }
        let r
        try {
            r = await superagent
                .get(`http://member.bilibili.com/preupload?access_key=${access_token}&mid=${mid}&profile=ugcfr%2Fpc3`)
                .set(headers)
                .type('form')
        } catch (err) {
            return reject(`An error occurred when fetch previous upload data: ${err}`)
        }

        const pre_upload_data = JSON.parse(r.text)
        const upload_url = pre_upload_data['url']
        const complete_upload_url = pre_upload_data['complete']

        const server_file_name = pre_upload_data['filename']
        const local_file_name = video_part.path
        const chunkSize = 1024 * 1024 * 5 //每 chunk 5M

        let fileSize
        try {
            fileSize = fs.statSync(video_part.path).size
        } catch (error) {
            return reject(`An error occurred when get videofile stat: ${error}`)
        }
        let chunkNum = Math.ceil(fileSize / chunkSize)
        let fileStream = fs.createReadStream(video_part.path)
        let readBuffers = []
        let readLength = 0
        let totalReadLength = 0
        let nowChunk = 0
        let fileHash = crypto.createHash('md5')

        // console.log(`开始上传 ${local_file_name}，文件大小：${fileSize}，分块数量：${chunkNum}`);
        logger.info(`开始上传 ${local_file_name}，文件大小：${fileSize}，分块数量：${chunkNum}`)
        fileStream.on('data', async (chunk) => {
            readBuffers.push(chunk)
            readLength += chunk.length
            totalReadLength += chunk.length
            fileHash.update(chunk)
            if (readLength >= chunkSize || totalReadLength === fileSize) {
                nowChunk++
                // console.log(`正在上传 ${local_file_name} 第 ${nowChunk}/${chunkNum} 分块`);
                logger.info(`正在上传 ${local_file_name} 第 ${nowChunk}/${chunkNum} 分块`)
                fileStream.pause()
                try {
                    await upload_chunk(upload_url, server_file_name, local_file_name, readBuffers, readLength, nowChunk, chunkNum, retryTimes)
                } catch (err) {
                    return reject(`An error occurred when upload video part: ${err}`)
                }
                fileStream.resume()
                readLength = 0
                readBuffers = []
                // console.log(err.response.text);
                // logger.info(err.response.text)
            }
        })
        fileStream.on('end', async () => {
            let post_data = {
                'chunks': chunkNum,
                'filesize': fileSize,
                'md5': fileHash.digest('hex'),
                'name': local_file_name,
                'version': '2.0.0.1054',
            }

            for (let i = 1; i <= 5; i++) {
                try {
                    let r = await superagent
                        .post(complete_upload_url)
                        .set(headers)
                        .send(post_data)
                    // console.log(r.text)
                    logger.info(`video part ${video_part.path} ${video_part.title} uplaod ended, returns ${r.text}`)
                    return resolve(server_file_name)
                } catch (err) {
                    // console.log(err)
                    // logger.info(err)
                    logger.error(`Merge file error: ${err}, retry in 10 seconds...`)
                    if (i === 5) {
                        return reject(`An error occurred when merge file: ${err}`)
                    }
                    await delay(10000)
                }

            }
        })
        fileStream.on('error', (error) => {
            logger.error(`An error occurred while listening fileStream: ${error}`)
        })
    })
}

function upload(dirName, access_token, mid, parts, copyright, title, tid, tag, desc, source = '', cover = '', no_reprint = 0, open_elec = 1) {
    return new Promise(async (resolve, reject) => {
        const headers = {
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
            'User-Agent': '',
        }
        let post_data = {
            'build': 1054,
            'copyright': copyright,
            'cover': cover,
            'desc': desc,
            'no_reprint': no_reprint,
            'open_elec': open_elec,
            'source': source,
            'tag': tag,
            'tid': tid,
            'title': title,
            'videos': []
        }
        logger.info(`开始上传稿件 ${dirName}`)
        // console.log(parts)
        logger.debug(`parts: ${parts}`)
        for (let video_part of parts) {
            try {
                video_part.server_file_name = await upload_video_part(access_token, mid, video_part, 5)
            } catch (err) {
                return reject(`An error occurred when upload: ${err}`)
            }
            // console.log("server_file_name:  ", video_part.server_file_name)
            post_data['videos'].push({
                "desc": video_part.desc,
                "filename": video_part.server_file_name,
                "title": video_part.title
            })
        }
        let params = {
            'access_key': access_token
        }
        params['sign'] = crypt.make_sign(params, APPSECRET)
        for (let i = 1; i <= 5; i++) {
            try {
                const result = await superagent
                    .post("http://member.bilibili.com/x/vu/client/add")
                    .query(params)
                    .set(headers)
                    .send(post_data)
                // console.log("Upload ended, returns:", result.text)
                if (JSON.parse(result.text).code !== 0) {
                    return reject(`Upload failed: ${result.text}`)
                }
                logger.info(`Upload ended, returns:, ${result.text}`)
                return resolve(`Upload ended, returns:, ${result.text}`)
            } catch (err) {
                logger.error(`Final upload error: ${err}, retry in 10 seconds...`)
                if (i === 5) {
                    return reject(`An error occurred when final upload: ${err}`)
                }
                await delay(10000)
            }
        }
    })
}

module.exports = {
    auth_token: auth_by_token,
    login,
    upload
}