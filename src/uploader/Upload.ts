import {log4js} from "../log";
import {Logger} from "log4js";
import {VideoPart} from "type/VideoPart";
import {join} from "path";
import {$axios} from "@/http";
import {uploadStatus} from "@/uploader/uploadStatus";
import {StreamInfo} from "type/StreamInfo";
import {app} from "@/index";
import {FileStatus} from "type/FileStatus";
const fs = require('fs');
const crypt = require("../util/crypt")
const chalk = require('chalk')
const crypto = require('crypto')
const querystring = require('querystring');
const FormData = require('form-data');
export class Upload {
    private readonly APPSECRET: string;
    private readonly videoPartLimitSizeInput: number;
    private readonly filePath: string;
    private readonly mid: number;
    private readonly access_token: string;
    private readonly logger: Logger;
    private readonly copyright: number;
    private readonly cover: any;
    private readonly desc: any;
    private readonly no_reprint: any;
    private readonly open_elec: number;
    private readonly source: string;
    private readonly tags: string[];
    private readonly tid: number;
    private readonly title: string;
    private readonly dynamic: string;

    private readonly uploadLocalFile: Boolean;
    private readonly recorderName: string;

    constructor(stream: StreamInfo) {
        this.logger = log4js.getLogger(`Upload ${stream.roomName}`)
        this.APPSECRET = "af125a0d5279fd576c1b4418a3e8276d"
        this.filePath = stream.dirName || ''
        this.access_token = require('../../templates/info.json').personInfo.access_token || 'xxx'
        this.mid = require('../../templates/info.json').personInfo.mid || 0
        this.copyright = stream.copyright || 2
        this.cover = ''
        this.desc = stream.desc || `${stream.roomName} 直播间 ${stream.roomLink}`
        this.no_reprint = 0
        this.open_elec = 1
        this.source = stream.source || `${stream.roomName} 直播间 ${stream.roomLink}`
        this.tags = stream.roomTags
        this.tid = stream.roomTid
        this.title = this.getTitle(stream || '')
        this.dynamic = stream.dynamic || `${stream.roomName} 直播间 ${stream.roomLink}`
        this.videoPartLimitSizeInput = require('../../templates/info.json').StreamerHelper.videoPartLimitSize || 100
        this.uploadLocalFile = stream.uploadLocalFile || true
        this.recorderName = stream.roomName || ''
    }

    upload = async () => {
        return new Promise(async (resolve, reject) => {

            if (!this.uploadLocalFile) return this.logger.info(`User config => ${this.recorderName} uploadLocalFile ${this.uploadLocalFile}. Upload give up...`)

            if (!this.filePath) return this.logger.error(`filePath is not set...`)

            try {
                this.logger.info(`Check Upload`)

                if (uploadStatus.get(this.filePath) === 1) return this.logger.error(`目录 ${this.filePath} 正在上传中，避免重复上传，取消此次上传任务`)


                this.logger.info(`开始上传稿件 ${this.filePath}`)

                // Get video path
                this.logger.info(`Get Video Parts ... PATH ${this.filePath}`)
                const videoParts: VideoPart[] = await this.getVideoParts(this.filePath)

                if (!videoParts) return

                // Upload video part
                this.logger.info(`Start to upload videoParts ...`)
                const videos = await this.preUploadVideoPart(videoParts) || []
                this.logger.info(`Upload videoParts END`)
                this.logger.info(`videos ${JSON.stringify(videos, null, 2)}`)

                // Post video
                this.logger.info(`Try to post video ...`)
                await this.postVideo(videos)

                // Delete Dir

                uploadStatus.set(this.filePath, 0)
                // @ts-ignore
                app.schedule.recycleFile.task()

                // Write status to file
                const fileStatusPath = join(this.filePath, 'fileStatus.json')

                if (fs.existsSync(fileStatusPath)) {
                    const text = fs.readFileSync(fileStatusPath)
                    const obj :FileStatus = JSON.parse(text.toString())
                    obj.isPost = true
                    const stringifies = JSON.stringify(obj, null, '  ')
                    fs.writeFileSync(fileStatusPath, stringifies)
                    this.logger.info(`Write Content ${JSON.stringify(obj, null, 2)}`)
                }
                // if (this.deleteLocalFile) {
                //     try {
                //         deleteFolder(this.filePath)
                //         logger.info(`删除本地文件 ${this.filePath}`)
                //     } catch (err) {
                //         logger.error(`稿件 ${this.filePath} 删除本地文件失败：${err}`)
                //     }
                // } else {
                //     logger.info(`读取用户配置，取消删除本地文件`)
                // }
                resolve()
            } catch (e) {
                uploadStatus.set(this.filePath, 0)
                this.logger.error(e)
                reject()
            }
        })
    }

    getVideoParts(path: string) {
        // this.logger.info(`Get Video Parts ... PATH ${path}`)

        const videoPartLimitSize = this.videoPartLimitSizeInput * 1024 * 1024
        this.logger.info(`videoPartLimitSize ${videoPartLimitSize}`)
        let videoParts: VideoPart[] = []
        let videoIndex = 0
        fs.readdirSync(path).forEach((shortPath: string) => {
            let fullPath = join(path, shortPath)
            let fileSize = fs.statSync(fullPath).size
            this.logger.debug(`fileSize ${fileSize}`)
            if (fileSize < videoPartLimitSize) {
                this.logger.info(`${chalk.red('放弃该分P上传')} ${fullPath}, 文件大小 ${Math.round(fileSize / 1024 / 1024)}M, 限制${this.videoPartLimitSizeInput}M`)
            } else {
                videoParts.push({
                    path: fullPath,
                    title: `P${videoIndex + 1}`,
                    desc: ``,
                    fileSize
                })
                videoIndex++
            }
        })

        this.logger.info(`Final videoParts ${JSON.stringify(videoParts, null, 2)}`)
        return videoParts
    }

    preUploadVideoPart = async (videoParts: VideoPart[]) => {
        return new Promise(async (resolve, reject) => {
            this.logger.info(`uploadVideoPart Start ...`)

            const videos: { desc: string; filename: string; title: string }[] = []

            for (let i = 0; i < videoParts.length; i++) {
                let {fileSize = 0, path = '', title = '', desc = ''} = videoParts[i]

                try {
                    let {uploadUrl, completeUploadUrl, serverFileName}: any = await this.getPreUploadData()
                    this.logger.debug(`path ${path} serverFileName ${serverFileName} uploadUrl${uploadUrl} completeUploadUrl${completeUploadUrl}`)
                    let video: any = await this.uploadVideoPart(fileSize, path, title, desc, uploadUrl, completeUploadUrl, serverFileName)
                    videos.push(video)
                } catch (e) {
                    this.logger.error(e)
                    uploadStatus.set(this.filePath, 0)
                    reject(e)
                }
            }
            resolve(videos)
        })
    }

    getPreUploadData = async (): Promise<{ uploadUrl: string; completeUploadUrl: string; serverFileName: string; } | boolean> => {
        return new Promise((async (resolve, reject) => {
            this.logger.info(`_getPreUploadData Start ...`)
            const headers = {
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': '',
                'Accept-Encoding': 'gzip,deflate',
            }

            try {
                const preUrl = `http://member.bilibili.com/preupload?access_key=${this.access_token}&mid=${this.mid}&profile=ugcfr%2Fpc3`
                const {
                    OK = 0,
                    url = '',
                    complete = '',
                    filename = ''
                }: { OK: number, url: string; complete: string; filename: string } = await $axios.$request({
                    method: "get",
                    headers,
                    url: preUrl
                })

                if (OK !== 1) {
                    this.logger.error(`Get preUpload Request Fail ...`)
                    reject()
                }

                this.logger.info(`_getPreUploadData url ${url}`)
                this.logger.info(`_getPreUploadData filename ${filename}`)
                this.logger.info(`_getPreUploadData complete ${complete}`)
                const uploadUrl: string = url, completeUploadUrl: string = complete, serverFileName: string = filename;
                resolve({uploadUrl, completeUploadUrl, serverFileName})
            } catch (e) {
                uploadStatus.set(this.filePath, 0)
                this.logger.error(`_getPreUploadData ${JSON.stringify(e, null, 2)}`)
                reject(`_getPreUploadData ${JSON.stringify(e, null, 2)}`)
            }
        }))
    }

    uploadVideoPart = async (fileSize: number, path: string, title: string, desc: string, uploadUrl: any, completeUploadUrl: any, serverFileName: any) => {
        return new Promise(async (resolve, reject) => {

            const chunkSize = 1024 * 1024 * 5 //每 chunk 5M
            let chunkNum = Math.ceil(fileSize / chunkSize)
            let fileStream = fs.createReadStream(path)
            let readBuffers: any[] = []
            let readLength = 0
            let totalReadLength = 0
            let nowChunk = 0
            let fileHash = crypto.createHash('md5')
            this.logger.info(`开始上传 ${path}，文件大小：${fileSize}，分块数量：${chunkNum}`)

            fileStream.on('data', async (chunk: any) => {
                readBuffers.push(chunk)
                readLength += chunk.length
                totalReadLength += chunk.length
                fileHash.update(chunk)
                if (readLength >= chunkSize || totalReadLength === fileSize) {
                    nowChunk++
                    this.logger.info(`正在上传 ${path} 第 ${nowChunk}/${chunkNum} 分块`)
                    fileStream.pause()
                    try {
                        await this.upload_chunk(uploadUrl, serverFileName, path, readBuffers, readLength, nowChunk, chunkNum)
                    } catch (err) {
                        uploadStatus.set(this.filePath, 0)
                        reject(`An error occurred when upload video part: ${err}`)
                    }
                    fileStream.resume()
                    readLength = 0
                    readBuffers = []
                }
            })

            fileStream.on('end', async () => {
                let post_data = {
                    'chunks': chunkNum,
                    'filesize': fileSize,
                    'md5': fileHash.digest('hex'),
                    'name': path,
                    'version': '2.0.0.1054',
                }

                try {
                    const headers = {
                        'Connection': 'keep-alive',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': '',
                        'Accept-Encoding': 'gzip,deflate',
                    }
                    const result = await $axios.$request({
                        method: "POST",
                        url: completeUploadUrl,
                        headers,
                        data: querystring.stringify(post_data)
                    })
                    this.logger.info(`video part ${path} ${title} upload end, returns ${JSON.stringify(result, null, 2)}`)
                    uploadStatus.delete(this.filePath)
                    resolve({
                        desc,
                        title,
                        filename: serverFileName
                    })
                } catch (err) {

                    this.logger.error(`Merge file error: ${JSON.stringify(err, null, 2)}`)
                    reject(err)
                }

            })

            fileStream.on('error', (error: any) => {
                this.logger.error(`An error occurred while listening fileStream: ${error}`)
                uploadStatus.set(this.filePath, 0)
                reject(error)
            })
        })

    }


    upload_chunk = async (uploadUrl: any, serverFileName: any, path: any, chunk_data: Uint8Array[], chunk_size: any, chunk_id: any, chunk_total_num: any) => {

        return new Promise(async (resolve, reject) => {
            let chunkHash = crypto.createHash('md5')
            for (let v of chunk_data) {
                chunkHash.update(v)
            }

            try {
                let form = new FormData()
                form.append('version', '2.0.0.1054')
                form.append('filesize', chunk_size)
                form.append('chunk', chunk_id)
                form.append('chunks', chunk_total_num)
                form.append('md5', chunkHash.digest('hex'))
                // @ts-ignore
                form.append('file', Buffer.concat(chunk_data), 'application/octet-stream')

                const formHeaders = form.getHeaders();

                let headers = {
                    Cookie: `PHPSESSID=${serverFileName};`,
                    ...formHeaders
                }

                const result = await $axios.$request({
                    method: "POST",
                    url: uploadUrl,
                    headers,
                    data: form.getBuffer()
                })
                this.logger.info(`chunk #${chunk_id} upload ended, returns: ${JSON.stringify(result)} \n ${path}`)
                resolve()
            } catch (e) {
                    this.logger.error(`Upload chunk error: ${e} ...`)
                    uploadStatus.set(this.filePath, 0)
                reject(e)
            }
        })


    }


    postVideo = async (videos: any) => {
        return new Promise(async (resolve, reject) => {
            const headers = {
                'Connection': 'keep-alive',
                'Content-Type': 'application/json',
                'User-Agent': '',
            }

            let post_data: any = {
                'build': 1054,
                'copyright': this.copyright,
                'cover': this.cover,
                'desc': this.desc,
                'no_reprint': this.no_reprint,
                'open_elec': this.open_elec,
                'source': this.source,
                'tag': this.tags.join(','),
                'tid': this.tid,
                'title': this.title,
                'dynamic': this.dynamic,
                'videos': videos
            }


            let params: any = {
                'access_key': this.access_token
            }
            params['sign'] = crypt.make_sign(params, this.APPSECRET)

            this.logger.debug(`postData ${JSON.stringify(post_data, null, 2)} params${JSON.stringify(params, null, 2)}`)

            try {
                let url = "https://member.bilibili.com/x/vu/client/add"

                const {
                    code = -1,
                    message = '',
                    ttl = -1,
                    data: {aid, bvid} = {aid: 0o0000, bvid: 'xxxxx'}
                }: { code: number; message: string; ttl: number; data: { aid: number, bvid: string; } } = await $axios.$request({
                    method: "POST",
                    url,
                    data: post_data,
                    params,
                    headers
                })

                if (code === 0) {
                    this.logger.info(`Post End ${code} message ${message} ttl ${ttl} aid ${aid} bvid${bvid}}`)
                    resolve(`Post End: ${code} message ${message} ttl ${ttl} aid ${aid} bvid${bvid}`)
                } else {
                    uploadStatus.set(this.filePath, 0)
                    reject(`Upload fails, returns:, ${code} message ${message} ttl ${ttl} aid ${aid} bvid${bvid}}`)
                }

            } catch (err) {
                uploadStatus.set(this.filePath, 0)
                this.logger.error(err)
            }
        })
    }

    getTitle = (stream: StreamInfo) => {
        return `${stream.roomName} ${stream.timeV} 录播`
    }
}


// const path = `/Users/zsnmwy/code/StreamerHelper/download/MrH4U/2021-01-31`
//
// const upload = new Upload(path, `测试稿件`, `测试构建的描述`, `MrH4U 2021-01-31`, 121, [
//     "英雄联盟",
//     "电子竞技",
//     "iG"
// ], `MrH4U 粉丝动态`)
//
// upload.upload().then(r => r)
