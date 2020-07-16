const md5 = require('md5-node')
const crypto = require('crypto')
const fs = require('fs')
const cookie = require('cookie-parse')
const superagent = require('superagent')
const crypt = require("./util/crypt.js")
const log4js = require("log4js");

const rootPath = process.cwd();
const APPKEY = 'aae92bc66f3edfab'
const APPSECRET = 'af125a0d5279fd576c1b4418a3e8276d'
const logger = log4js.getLogger("message");

async function getKey() {
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
        const sid = cookie.parse(result.header['set-cookie'][0]).sid
        return {
            sid: sid,
            hash: data.hash,
            key: data.key
        }
    } catch (err) {
        // console.log(err)
        logger.info(err)
    }
}

async function login(username, password) {

    let data = await getKey()
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
        const result = await superagent
            .post(url)
            .set(headers)
            .set('Cookie', `sid=${data.sid};`)
            .type('form')
            .send(post_data)
        const res = JSON.parse(result.text);
        return {
            access_token: res.data.access_token,
            mid: res.data.mid,
            sid: data.sid
        }
    } catch (err) {
        // console.log(err)
        logger.info(err)
    }
}
async function upload_chunk(upload_url, server_file_name, local_file_name, chunk_data, chunk_size, chunk_id, chunk_total_num, retryTimes) {
    let chunkHash = crypto.createHash('md5')
    for (let v of chunk_data) {
        chunkHash.update(v)
    }
    let files = {
        'version': (null, '2.0.0.1054'),
        'filesize': (null, chunk_size),
        'chunk': (null, chunk_id),
        'chunks': (null, chunk_total_num),
        'md5': (null, chunkHash.digest('hex')),
    }
    try {
        const r = await superagent
            .post(upload_url)
            .set('Cookie', `PHPSESSID=${server_file_name};`)
            .field(files)
            .attach('file', Buffer.concat(chunk_data), 'application/octet-stream')
            .retry(retryTimes)
        // console.log(`chunk #${chunk_id} upload ended, returns: ${r.text}`)
        logger.info(`chunk #${chunk_id} upload ended, returns: ${r.text}`)
    } catch (err) {
        // console.log(err)
        logger.info(err)
    }
}
async function upload_video_part(access_token, sid, mid, video_part, retryTimes) {
    return new Promise(async (resolve, reject) => {
        const headers = {
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': '',
            'Accept-Encoding': 'gzip,deflate',
        }

        const r = await superagent
            .get(`http://member.bilibili.com/preupload?access_key=${access_token}&mid=${mid}&profile=ugcfr%2Fpc3`)
            .set(headers)
            .set('Cookie', `sid=${sid};`)
            .type('form')

        const pre_upload_data = JSON.parse(r.text)
        const upload_url = pre_upload_data['url']
        const complete_upload_url = pre_upload_data['complete']

        const server_file_name = pre_upload_data['filename']
        const local_file_name = video_part.path
        const chunkSize = 1024 * 1024 * 5 //每 chunk 5M

        let fileSize = fs.statSync(video_part.path).size
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
                try {
                    nowChunk++
                    // console.log(`正在上传 ${local_file_name} 第 ${nowChunk}/${chunkNum} 分块`);
                    logger.info(`正在上传 ${local_file_name} 第 ${nowChunk}/${chunkNum} 分块`)
                    fileStream.pause()
                    await upload_chunk(upload_url, server_file_name, local_file_name, readBuffers, readLength, nowChunk, chunkNum, retryTimes)
                    fileStream.resume()
                    readLength = 0
                    readBuffers = []
                } catch (err) {
                    // console.log(err.response.text);
                    logger.info(err.response.text)
                    reject(err.response.text)
                }
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
            try {
                await superagent
                    .post(complete_upload_url)
                    .set(headers)
                    .send(post_data)
            } catch (err) {
                // console.log(err)
                logger.info(err)
            }
            resolve(server_file_name)
        })
        fileStream.on('error', (error) => {
            logger.info(error)
        })
    })
}

async function upload(access_token, sid, mid, parts, copyright, title, tid, tag, desc, source = '', cover = '', no_reprint = 0, open_elec = 1) {
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
    for (let video_part of parts) {
        video_part.server_file_name = await upload_video_part(access_token, sid, mid, video_part, 5)
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
    const result = await superagent
        .post("http://member.bilibili.com/x/vu/client/add")
        .query(params)
        .set(headers)
        .set('Cookie', `sid=${sid};`)
        .send(post_data)
    // console.log("Upload ended, returns:", result.text)
    logger.info("Upload ended, returns:", result.text)
}

module.exports = {
    login,
    upload
}