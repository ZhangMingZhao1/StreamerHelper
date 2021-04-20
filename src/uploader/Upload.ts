import {log4js} from "../log";
import {Logger} from "log4js";
import {VideoPart} from "type/VideoPart";
import {join} from "path";
import {$axios} from "@/http";
import {uploadStatus} from "@/uploader/uploadStatus";
import {StreamInfo} from "type/StreamInfo";
import {app} from "@/index";
import {failUpload, FileStatus, succeedUploaded} from "type/FileStatus";

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
    private deadline: number;
    private uploadStartTime: number;
    private succeedUploaded: succeedUploaded[] | undefined
    private isUploadFail: boolean | undefined;
    private failUpload: failUpload | undefined;
    private succeedUploadChunk: number;
    private succeedTotalLength: number;

    constructor(stream: StreamInfo) {
        this.logger = log4js.getLogger(`Upload ${stream.roomName}`)
        this.logger.debug(`Upload Stream Info ${JSON.stringify(stream, null, 2)}`)
        this.APPSECRET = "af125a0d5279fd576c1b4418a3e8276d"
        this.filePath = stream.dirName || ''
        this.access_token = app.user?.access_token || 'xxx'
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
        this.deadline = 0
        this.uploadStartTime = 0
        this.succeedTotalLength = 0
        this.succeedUploadChunk = 0
    }

    upload = async () => {
        return new Promise(async (resolve, reject) => {

            if (!this.uploadLocalFile) return this.logger.info(`User config => ${this.recorderName} uploadLocalFile ${this.uploadLocalFile}. Upload give up...`)

            if (!this.filePath) return this.logger.error(`filePath is not set...`)

            try {
                this.logger.info(`Check Upload`)

                if (uploadStatus.get(this.filePath) === 1) return this.logger.error(`目录 ${this.filePath} 正在上传中，避免重复上传，取消此次上传任务`)


                this.logger.info(`开始上传稿件 ${this.filePath}`)

                this.logger.info(`锁定稿件文件目录，避免重复上传 ${this.filePath}`)
                uploadStatus.set(this.filePath, 1)

                const fileStatusPath = join(this.filePath, 'fileStatus.json')
                if (fs.existsSync(fileStatusPath)) {
                    const text = fs.readFileSync(fileStatusPath)
                    const obj: FileStatus = JSON.parse(text.toString())
                    this.logger.debug(`Read fileStatus.json ${JSON.stringify(obj, null, 2)}`)
                    this.succeedUploaded = obj?.videoParts?.succeedUploaded
                    this.isUploadFail = obj.isFail
                    if (obj.isFail) {
                        this.failUpload = obj.videoParts?.failUpload
                        this.succeedTotalLength = obj.videoParts?.failUpload?.succeedTotalLength || 0
                        this.succeedUploadChunk = obj.videoParts?.failUpload?.succeedUploadChunk || 0
                        this.uploadStartTime = obj.videoParts?.failUpload?.uploadStartTime || 0
                        this.deadline = obj.videoParts?.failUpload?.deadline || 0
                    }
                }

                // Get video path
                this.logger.info(`Get Video Parts ... PATH ${this.filePath}`)
                const videoParts: VideoPart[] = await this.getVideoParts(this.filePath)

                if (!videoParts) return

                // Upload video part
                this.logger.info(`Start to upload videoParts ...`)
                let videos: any = await this.UploadVideoPart(videoParts) || []
                this.logger.info(`Upload videoParts END`)

                if (this.succeedUploaded) {
                    this.logger.info(`Found succeed uploaded videos ... Concat ...`)
                    videos = this.succeedUploaded.concat(videos)
                    videos = videos.map((video: { title: string; }, index: number) => {
                        video.title = `P${index + 1}`
                        return video
                    })
                    this.logger.info(JSON.stringify(videos, null, 2))
                }

                this.logger.info(`videos ${JSON.stringify(videos, null, 2)}`)

                // Post video
                this.logger.info(`Try to post video ...`)
                await this.postVideo(videos)

                // Delete Dir

                uploadStatus.delete(this.filePath)

                // Write status to file

                this.changeFileStatus({isPost: true})

                // @ts-ignore
                app.schedule.recycleFile.task()
                resolve()
            } catch (e) {
                uploadStatus.delete(this.filePath)
                this.logger.error(e)
                reject()
            }
        })
    }

    getVideoParts(path: string) {
        // this.logger.info(`Get Video Parts ... PATH ${path}`)

        const videoPartLimitSize = this.videoPartLimitSizeInput * 1024 * 1024
        this.logger.info(`videoPartLimitSize ${videoPartLimitSize}`)
        this.logger.info(`succeedUploaded ${JSON.stringify(this.succeedUploaded, null, 2)}`)
        let videoParts: VideoPart[] = []
        let videoIndex = 0
        fs.readdirSync(path).forEach((shortPath: string) => {
            let fullPath = join(path, shortPath)
            let fileSize = fs.statSync(fullPath).size
            this.logger.debug(`fileSize ${fileSize}`)
            if (fileSize < videoPartLimitSize) {
                this.logger.info(`${chalk.red('放弃该分P上传')} ${fullPath}, 文件大小 ${Math.round(fileSize / 1024 / 1024)}M, 限制${this.videoPartLimitSizeInput}M`)
            } else if (this.succeedUploaded && this.succeedUploaded.find(item => item.path === fullPath)) {
                this.logger.info(`该分P已经上传成功，跳过 ${fullPath}`)
            } else { // @ts-ignore
                if (this.isUploadFail && this.failUpload?.path === fullPath && this?.failUpload?.deadline > (this?.failUpload?.uploadStartTime + 7200)) {
                    this.logger.info(`Push upload error video to videoParts`)
                    videoParts.push({
                        isFail: true,
                        path: this.failUpload?.path,
                        title: `P${videoIndex + 1}`,
                        desc: ``,
                        fileSize
                    })
                } else {
                    videoParts.push({
                        path: fullPath,
                        title: `P${videoIndex + 1}`,
                        desc: ``,
                        fileSize
                    })
                    videoIndex++
                }
            }
        })

        this.logger.info(`Final videoParts ${JSON.stringify(videoParts, null, 2)}`)
        return videoParts
    }

    UploadVideoPart = async (videoParts: VideoPart[]) => {
        return new Promise(async (resolve, reject) => {
            this.logger.info(`uploadVideoPart Start ...`)

            const videos: { desc: string; filename: string; title: string }[] = []

            for (let i = 0; i < videoParts.length; i++) {
                let {fileSize = 0, path = '', title = '', desc = '', isFail = false} = videoParts[i]

                try {
                    let uploadUrl = '', completeUploadUrl = '', serverFileName = '';
                    if (isFail) {
                        uploadUrl = this.failUpload?.uploadUrl || ''
                        completeUploadUrl = this.failUpload?.completeUploadUrl || ''
                        serverFileName = this.failUpload?.serverFileName || ''
                        this.logger.info(`Get Fail Video Upload Status serverFileName ${serverFileName} uploadUrl${uploadUrl} completeUploadUrl${completeUploadUrl}`)
                    } else {
                        // {uploadUrl, completeUploadUrl, serverFileName}: any = await this.getPreUploadData()
                        const result = await this.getPreUploadData()
                        if (typeof result !== "boolean") {
                            uploadUrl = result.uploadUrl
                            completeUploadUrl = result.completeUploadUrl
                            serverFileName = result.serverFileName
                        }
                    }

                    this.logger.debug(`path ${path} serverFileName ${serverFileName} uploadUrl${uploadUrl} completeUploadUrl${completeUploadUrl}`)
                    let video: any = await this.uploadVideoPart(fileSize, path, title, desc, uploadUrl, completeUploadUrl, serverFileName, isFail)
                    videos.push(video)

                    // Record upload succeed videos
                    const fileStatusPath = join(this.filePath, 'fileStatus.json')
                    if (fs.existsSync(fileStatusPath)) {
                        const text = fs.readFileSync(fileStatusPath)
                        const obj: FileStatus = JSON.parse(text.toString())

                        if (!obj.videoParts) obj.videoParts = {};
                        if (!obj.videoParts.succeedUploaded) obj.videoParts.succeedUploaded = [];

                        const result = obj.videoParts.succeedUploaded.find(item => item.path === video.path)
                        if (result) return this.logger.info(`Fond Exist Video ${video.path}`);

                        obj.videoParts.succeedUploaded.push(video)
                        this.logger.info(`Record Succeed video ${JSON.stringify(video, null, 2)}`)

                        const stringifies = JSON.stringify(obj, null, '  ')
                        fs.writeFileSync(fileStatusPath, stringifies)
                        this.logger.info(`Write Content ${JSON.stringify(obj, null, 2)}`)
                    }


                } catch (e) {
                    this.logger.error(e)
                    uploadStatus.delete(this.filePath)
                    reject(e)
                    break
                }
            }
            resolve(videos)
        })
    }

    getPreUploadData = async (): Promise<{ uploadUrl: string; completeUploadUrl: string; serverFileName: string; } | boolean> => {
        return new Promise((async (resolve, reject) => {
            this.logger.debug(`getPreUploadData Start ...`)
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

                this.logger.debug(`_getPreUploadData url ${url}`)
                this.logger.debug(`_getPreUploadData filename ${filename}`)
                this.logger.debug(`_getPreUploadData complete ${complete}`)
                const uploadUrl: string = url, completeUploadUrl: string = complete, serverFileName: string = filename;

                const {deadline, uploadstart} = querystring.parse(uploadUrl)

                this.deadline = deadline
                this.uploadStartTime = uploadstart
                this.logger.debug(`_getPreUploadData deadline ${this.deadline} uploadStartTime ${this.uploadStartTime}`)
                resolve({uploadUrl, completeUploadUrl, serverFileName})
            } catch (e) {
                uploadStatus.delete(this.filePath)
                this.logger.error(`_getPreUploadData ${JSON.stringify(e, null, 2)}`)
                reject(`_getPreUploadData ${JSON.stringify(e, null, 2)}`)
            }
        }))
    }

    uploadVideoPart = async (fileSize: number, path: string, title: string, desc: string, uploadUrl: any, completeUploadUrl: any, serverFileName: any, isResume: boolean = false) => {
        return new Promise(async (resolve, reject) => {
            let fileHash = crypto.createHash('md5')

            const chunkSize = 1024 * 1024 * 5 //每 chunk 5M
            let chunkNum = Math.ceil(fileSize / chunkSize)

            let succeedUpload = isResume ? this.succeedUploadChunk : -1
            let nowChunk = 0

            this.logger.info(`开始上传 ${path}，文件大小：${fileSize}，分块数量：${chunkNum}`)

            let fileStream = fs.createReadStream(path, {highWaterMark: chunkSize})
            fileStream.on('data', async (chunk: any) => {

                if (nowChunk >= succeedUpload) {
                    fileHash.update(chunk)
                    this.logger.info(`正在上传 第 ${nowChunk + 1}/${chunkNum} 分块 ${path} succeedUpload ${succeedUpload}`)
                    fileStream.pause()
                    try {
                        this.logger.debug(` nowChunk ${nowChunk} succeedUpload ${succeedUpload} uploadUrl ${uploadUrl}, serverFileName ${serverFileName}, path ${path}, chunk.length ${chunk.length}, nowChunk + 1 ${nowChunk + 1}, chunkNum ${chunkNum}`)
                        await this.upload_chunk(uploadUrl, serverFileName, path, chunk, chunk.length, nowChunk + 1, chunkNum)
                    } catch (err) {
                        fileStream.destroy()

                        uploadStatus.delete(this.filePath)

                        this.changeFileStatus({
                            isFail: true,
                            videoParts: {
                                failUpload: {
                                    path,
                                    uploadUrl,
                                    completeUploadUrl,
                                    serverFileName,
                                    succeedUploadChunk: nowChunk === 0 ? -1 : nowChunk - 1,
                                    deadline: this.deadline,
                                    uploadStartTime: this.uploadStartTime,
                                    succeedTotalLength: this.succeedTotalLength
                                }
                            }
                        })

                        reject(`An error occurred when upload video part: chunk ${nowChunk + 1}/${chunkNum} 分块 ${path} ${err}`)
                    }

                    if (nowChunk + 1 === chunkNum) {

                        setTimeout(async ()=> {

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
                                const {OK, info} = await $axios.$request({
                                    method: "POST",
                                    url: completeUploadUrl,
                                    headers,
                                    data: querystring.stringify(post_data)
                                })
                                this.logger.info(`video part ${path} ${title} upload end, returns OK ${OK} info ${info}`)

                                if (info.match('error')) {
                                    this.logger.error(`Filesize error`)
                                    const fileStatusPath = join(this.filePath, 'fileStatus.json')
                                    if (fs.existsSync(fileStatusPath)) {
                                        const text = fs.readFileSync(fileStatusPath)
                                        const obj: FileStatus = JSON.parse(text.toString())
                                        if (obj.videoParts) {
                                            obj.videoParts.failUpload = {}
                                            const stringifies = JSON.stringify(obj, null, 2)
                                            fs.writeFileSync(fileStatusPath, stringifies)
                                            this.logger.error(`DELETE failUpload Record`)
                                        }
                                    }
                                    uploadStatus.delete(this.filePath)
                                    reject(info)
                                }


                                resolve({
                                    desc,
                                    title,
                                    filename: serverFileName,
                                    path
                                })
                            } catch (err) {
                                uploadStatus.delete(this.filePath)
                                this.logger.error(`Merge file error: ${JSON.stringify(err, null, 2)}`)
                                reject(err)
                            }

                        }, 5000)
                    }

                    fileStream.resume()
                }
                nowChunk++
            })

            fileStream.on('error', (error: any) => {
                this.logger.error(`An error occurred while listening fileStream: ${error}`)
                uploadStatus.delete(this.filePath)
                fileStream.destroy()
                reject(error)
            })
        })

    }


    upload_chunk = async (uploadUrl: any, serverFileName: any, path: any, chunk_data: Uint8Array, chunk_size: any, chunk_id: any, chunk_total_num: any) => {

        return new Promise(async (resolve, reject) => {
            try {
                let chunkHash = crypto.createHash('md5')
                chunkHash.update(chunk_data)
                let form = new FormData()
                form.append('version', '2.0.0.1054')
                form.append('filesize', chunk_size)
                form.append('chunk', chunk_id)
                form.append('chunks', chunk_total_num)
                form.append('md5', chunkHash.digest('hex'))
                // @ts-ignore
                form.append('file', chunk_data, 'application/octet-stream')

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
                this.logger.info(`chunk #${chunk_id}/${chunk_total_num} upload ended, returns: ${JSON.stringify(result)} \n ${path}`)
                if (result.info !== "Successful.") {
                    reject(`Upload Chunk #${chunk_id}/${chunk_total_num} Return Outside Of Expect: ${result.info}`)
                }
                resolve()
            } catch (e) {
                this.logger.error(`Upload chunk error: ${e} ...`)
                uploadStatus.delete(this.filePath)
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
                    this.logger.info(`Post End ${code} message ${message} ttl ${ttl} aid ${aid} bvid ${bvid}`)
                    resolve(`Post End: ${code} message ${message} ttl ${ttl} aid ${aid} bvid${bvid}`)
                } else {
                    uploadStatus.delete(this.filePath)
                    reject(`Upload fails, returns:, ${code} message ${message} ttl ${ttl} aid ${aid} bvid ${bvid}`)
                }

            } catch (err) {
                uploadStatus.delete(this.filePath)
                this.logger.error(err)
            }
        })
    }

    getTitle = (stream: StreamInfo) => {
        return `${stream.roomName} ${stream.timeV} 录播`
    }

    changeFileStatus = (status: FileStatus) => {
        // Merge a `source` object to a `target` recursively
        const merge = (target: any, source:any ) => {
            // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
            for (const key of Object.keys(source)) {
                if (source[key] instanceof Object) Object.assign(source[key], merge(target[key], source[key]))
            }

            // Join `target` and modified `source`
            Object.assign(target || {}, source)
            return target
        }

        const fileStatusPath = join(this.filePath, 'fileStatus.json')

        if (fs.existsSync(fileStatusPath)) {
            const text = fs.readFileSync(fileStatusPath)
            const obj: FileStatus = JSON.parse(text.toString())
            merge(obj, status)
            const stringifies = JSON.stringify(obj, null, 2)
            fs.writeFileSync(fileStatusPath, stringifies)
            this.logger.info(`Write Content ${JSON.stringify(obj, null, 2)}`)
        }
    }
}
