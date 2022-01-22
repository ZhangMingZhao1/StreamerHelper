import * as fs from 'fs'
import { join } from "path";

import * as chalk from 'chalk'
import * as crypto from 'crypto';
import * as querystring from 'querystring'
import * as formData from 'form-data'
import { Logger } from "log4js";

import * as crypt from '@/util/crypt'
import { getExtendedLogger } from "@/log";
import { localVideoPart, remoteVideoPart, uploadVideoPartInfo } from "@/type/video";
import { $axios } from "@/http";
import { uploadStatus } from "@/uploader/uploadStatus";
import { failUpload, FileStatus, succeedUploaded } from "@/type/fileStatus";
import { RecorderTask } from '@/type/recorderTask';
import { changeFileStatus } from '@/util/utils';

export class uploader {

    private readonly APPSECRET: string;
    private readonly videoPartLimitSizeInput: number;
    private readonly dirName: string;
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
    private uploadStart: number;
    private succeedUploaded: succeedUploaded[] | undefined
    private isUploadFail: boolean | undefined;
    private failUpload: failUpload | undefined;
    private succeedUploadChunk: number;
    private succeedTotalLength: number;

    constructor(recorderTask: RecorderTask) {
        this.logger = getExtendedLogger(`Upload ${recorderTask.recorderName}`)
        this.logger.debug(`Upload Stream Info ${JSON.stringify(recorderTask, null, 2)}`)
        this.APPSECRET = "af125a0d5279fd576c1b4418a3e8276d"
        this.dirName = recorderTask.dirName || ''
        this.access_token = global.app.user?.access_token || 'xxx'
        this.mid = global.config.personInfo.mid || 0
        this.videoPartLimitSizeInput = global.config.StreamerHelper.videoPartLimitSize ?? 100
        this.copyright = recorderTask.streamerInfo.copyright || 2
        this.cover = ''
        this.desc = recorderTask.streamerInfo.desc || `Powered By StreamerHelper. https://github.com/ZhangMingZhao1/StreamerHelper`
        this.no_reprint = 0
        this.open_elec = 1
        this.source = recorderTask.streamerInfo.source || `${recorderTask.recorderName} 直播间: ${recorderTask.streamerInfo.roomUrl}`
        this.tags = recorderTask.streamerInfo.tags
        this.tid = recorderTask.streamerInfo.tid
        this.title = `${recorderTask.recorderName} ${recorderTask.timeV} 录播`
            || this.renderTitle(recorderTask.streamerInfo.templateTitle || "", { time: recorderTask.timeV, name: recorderTask.recorderName })
        this.dynamic = recorderTask.streamerInfo.dynamic || `${recorderTask.recorderName} 直播间: ${recorderTask.streamerInfo.roomUrl}`
        this.uploadLocalFile = recorderTask.streamerInfo.uploadLocalFile || true
        this.recorderName = recorderTask.recorderName || ''
        this.deadline = 0
        this.uploadStart = 0
        this.succeedTotalLength = 0
        this.succeedUploadChunk = 0
    }

    upload = async () => {
        return new Promise<void>(async (resolve, reject) => {

            if (!this.uploadLocalFile) return this.logger.info(`User config => ${this.recorderName} uploadLocalFile ${this.uploadLocalFile}. Upload give up...`)

            if (!this.dirName) return this.logger.error(`filePath is not set...`)

            try {
                this.logger.info(`Check Upload`)

                if (uploadStatus.get(this.dirName) === 1) return this.logger.error(`目录 ${this.dirName} 正在上传中，避免重复上传，取消此次上传任务`)

                this.logger.info(`开始上传稿件 ${this.dirName}`)
                this.logger.info(`锁定稿件文件目录，避免重复上传 ${this.dirName}`)
                uploadStatus.set(this.dirName, 1)
                const fileStatusPath = join(this.dirName, 'fileStatus.json')

                if (fs.existsSync(fileStatusPath)) {
                    const text = fs.readFileSync(fileStatusPath)
                    const obj = JSON.parse(text.toString()) as FileStatus
                    this.logger.debug(`Read fileStatus.json ${JSON.stringify(obj, null, 2)}`)
                    this.succeedUploaded = obj?.videoParts?.succeedUploaded
                    this.isUploadFail = obj.isFailed

                    if (obj.isFailed) {
                        this.failUpload = obj.videoParts?.failUpload
                        this.succeedTotalLength = obj.videoParts?.failUpload?.succeedTotalLength || 0
                        this.succeedUploadChunk = obj.videoParts?.failUpload?.succeedUploadChunk || 0
                        this.uploadStart = obj.videoParts?.failUpload?.uploadStartTime || 0
                        this.deadline = obj.videoParts?.failUpload?.deadline || 0
                    }

                }

                // Get video path
                this.logger.info(`Get Video Parts ... PATH ${this.dirName}`)
                const localVideos = this.getLocalVideos(this.dirName)

                if (localVideos.length === 0 && !this.succeedUploaded) {
                    return reject(`${this.dirName} 上传目录为空，或视频文件均不满足上传大小限制`)
                }

                this.logger.info(`Start to upload videoParts ...`)
                let remoteVideos: remoteVideoPart[] = await this.uploadVideoParts(localVideos) || []
                this.logger.info(`Upload videoParts END, remoteVideos: ${remoteVideos}`)

                if (this.succeedUploaded) {
                    this.logger.info(`Found succeed uploaded videos ... Concat ...`)
                    remoteVideos = remoteVideos.concat(this.succeedUploaded)
                    this.logger.info(JSON.stringify(remoteVideos, null, 2))
                }
                remoteVideos = remoteVideos.map((video: remoteVideoPart, index: number) => {
                    video.title = `P${index + 1}`
                    return video
                })
                this.logger.info(`videos ${JSON.stringify(remoteVideos, null, 2)}`)
                this.logger.info(`Try to post videos ...`)
                await this.postVideo(remoteVideos)
                uploadStatus.delete(this.dirName)
                this.logger.info(`Upload Success.`)
                changeFileStatus({ isPost: true }, fileStatusPath)
                resolve()
            } catch (e) {
                uploadStatus.delete(this.dirName)
                reject(e)
            }
        })
    }

    getLocalVideos(path: string): localVideoPart[] {

        const videoPartLimitSize = this.videoPartLimitSizeInput * 1024 * 1024
        this.logger.info(`videoPartLimitSize ${videoPartLimitSize}`)
        this.logger.info(`succeedUploaded ${JSON.stringify(this.succeedUploaded, null, 2)}`)
        const localVideoParts: localVideoPart[] = []
        let videoIndex = 0

        fs.readdirSync(path).forEach((shortPath: string) => {
            const fullPath = join(path, shortPath)
            const fileSize = fs.statSync(fullPath).size
            this.logger.debug(`fileSize ${fileSize}`)

            if (fileSize < videoPartLimitSize) {
                this.logger.info(`${chalk.red('放弃该分P上传')} ${fullPath}, 文件大小 ${Math.round(fileSize / 1024 / 1024)}M, 限制${this.videoPartLimitSizeInput}M`)
            } else if (this.succeedUploaded && this.succeedUploaded.find(item => item.localFilePath === fullPath)) {
                this.logger.info(`该分P已经上传成功，跳过 ${fullPath}`)
            } else {
                if (this.isUploadFail && this.failUpload?.path === fullPath && (this?.failUpload?.deadline ?? 0) > ((this?.failUpload?.uploadStartTime ?? 0) + 7200)) {
                    this.logger.info(`Push upload error video to videoParts`)
                    localVideoParts.push({
                        isFailed: true,
                        localFilePath: this.failUpload?.path,
                        title: `P${videoIndex + 1}`,
                        desc: ``,
                        fileSize
                    })
                } else {
                    localVideoParts.push({
                        localFilePath: fullPath,
                        title: `P${videoIndex + 1}`,
                        desc: ``,
                        fileSize,
                        isFailed: false
                    })
                    videoIndex++
                }
            }
        })

        this.logger.info(`Final videoParts ${JSON.stringify(localVideoParts, null, 2)}`)
        return localVideoParts
    }

    uploadVideoParts = async (localVideoParts: localVideoPart[]) => {
        return new Promise<remoteVideoPart[]>(async (resolve, reject) => {

            this.logger.info(`uploadVideoPart Start ...`)
            const remoteVideos: remoteVideoPart[] = []

            for (let i = 0; i < localVideoParts.length; i++) {
                const { fileSize: fileSize = 0, localFilePath = '', title = '', desc = '', isFailed } = localVideoParts[i]

                try {
                    let uploadUrl = '', completeUploadUrl = '', serverFileName = '';

                    if (isFailed) {
                        uploadUrl = this.failUpload?.uploadUrl || ''
                        completeUploadUrl = this.failUpload?.completeUploadUrl || ''
                        serverFileName = this.failUpload?.serverFileName || ''
                        this.logger.info(`Get Fail Video Upload Status serverFileName ${serverFileName} uploadUrl${uploadUrl} completeUploadUrl${completeUploadUrl}`)
                    } else {
                        // {uploadUrl, completeUploadUrl, serverFileName}: any = await this.getPreUploadData()
                        const result = await this.getPreUploadData()
                        uploadUrl = result.uploadUrl
                        completeUploadUrl = result.completeUploadUrl
                        serverFileName = result.serverFileName
                    }

                    this.logger.debug(`path ${localFilePath} serverFileName ${serverFileName} uploadUrl${uploadUrl} completeUploadUrl${completeUploadUrl}`)
                    const videoOnServer = await this.uploadVideoPart(fileSize, localFilePath, title, desc, uploadUrl, completeUploadUrl, serverFileName, isFailed)
                    remoteVideos.push(videoOnServer)

                    // Record upload succeed videos
                    const fileStatusPath = join(this.dirName, 'fileStatus.json')

                    if (fs.existsSync(fileStatusPath)) {
                        const text = fs.readFileSync(fileStatusPath)
                        const obj: FileStatus = JSON.parse(text.toString())

                        if (!obj.videoParts) obj.videoParts = {};

                        if (!obj.videoParts.succeedUploaded) obj.videoParts.succeedUploaded = [];

                        const result = obj.videoParts.succeedUploaded.find(item => item.localFilePath === localFilePath)

                        if (result) {
                            this.logger.info(`Found Exist Video ${localFilePath}`);
                            continue
                        }

                        obj.videoParts.succeedUploaded.push({ ...videoOnServer, localFilePath })
                        this.logger.info(`Record Succeed video ${JSON.stringify(videoOnServer, null, 2)}`)
                        const stringfied = JSON.stringify(obj, null, '  ')
                        fs.writeFileSync(fileStatusPath, stringfied)
                        this.logger.info(`Write Content ${JSON.stringify(obj, null, 2)}`)
                    }
                } catch (e) {
                    uploadStatus.delete(this.dirName)
                    return reject(e)
                }
            }
            resolve(remoteVideos)
        })
    }

    getPreUploadData = async (): Promise<uploadVideoPartInfo> => {
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
                    reject(`Get preUpload Request Fail ...`)
                }

                this.logger.debug(`_getPreUploadData url ${url}`)
                this.logger.debug(`_getPreUploadData filename ${filename}`)
                this.logger.debug(`_getPreUploadData complete ${complete}`)
                const uploadUrl: string = url, completeUploadUrl: string = complete, serverFileName: string = filename;
                const params = uploadUrl.split('?')[1]
                const { deadline, uploadstart } = querystring.parse(params)

                if (deadline)
                    this.deadline = parseInt(deadline as string)

                if (this.uploadStart)
                    this.uploadStart = parseInt(uploadstart as string)

                this.logger.debug(`_getPreUploadData deadline ${this.deadline} uploadStartTime ${this.uploadStart}`)
                resolve({ uploadUrl, completeUploadUrl, serverFileName })
            } catch (e) {
                uploadStatus.delete(this.dirName)
                reject(`_getPreUploadData: ${e}`)
            }
        }))
    }

    uploadVideoPart = async (fileSize: number, path: string, title: string, desc: string, uploadUrl: any, completeUploadUrl: any, serverFileName: any, isResume: boolean = false) => {
        return new Promise<remoteVideoPart>(async (resolve, reject) => {

            const fileHash = crypto.createHash('md5')
            const chunkSize = 1024 * 1024 * 5 //每 chunk 5M
            const chunkNum = Math.ceil(fileSize / chunkSize)
            const successUploadedChunks = isResume ? this.succeedUploadChunk : -1
            const fileStream = fs.createReadStream(path)
            let readBuffers: Buffer = Buffer.from('')
            let readLength = 0
            let totalReadLength = 0
            let nowChunk = 0
            this.logger.info(`开始上传 ${path}，文件大小：${fileSize}，分块数量：${chunkNum}， succeedUploa：${successUploadedChunks}`)

            fileStream.on('data', async (chunk: any) => {

                readBuffers = Buffer.concat([readBuffers, chunk], readLength + chunk.length)
                readLength += chunk.length
                totalReadLength += chunk.length
                fileHash.update(chunk)

                if (readLength >= chunkSize || totalReadLength === fileSize) {
                    nowChunk++

                    if (nowChunk >= successUploadedChunks) {
                        this.logger.info(`正在上传 第 ${nowChunk}/${chunkNum} 分块 ${path}`)
                        fileStream.pause()

                        try {
                            this.logger.debug(` nowChunk ${nowChunk} succeedUpload ${successUploadedChunks} uploadUrl ${uploadUrl}, serverFileName ${serverFileName}, path ${path}, chunk.length ${chunk.length}, nowChunk + 1 ${nowChunk + 1}, chunkNum ${chunkNum}`)
                            await this.uploadChunk(uploadUrl, serverFileName, path, readBuffers, readBuffers.length, nowChunk, chunkNum)
                        } catch (err) {
                            fileStream.destroy()
                            uploadStatus.delete(this.dirName)
                            changeFileStatus({
                                isFailed: true,
                                videoParts: {
                                    failUpload: {
                                        path,
                                        uploadUrl,
                                        completeUploadUrl,
                                        serverFileName,
                                        succeedUploadChunk: nowChunk === 0 ? -1 : nowChunk,
                                        deadline: this.deadline,
                                        uploadStartTime: this.uploadStart,
                                        succeedTotalLength: this.succeedTotalLength
                                    }
                                }
                            }, join(this.dirName, 'fileStatus.json'))

                            return reject(`An error occurred when upload video part: chunk ${nowChunk}/${chunkNum} 分块 ${path} ${err}`)
                        }
                    }

                    fileStream.resume()
                    readLength = 0
                    readBuffers = Buffer.from('')
                }
            })
            fileStream.on('end', async () => {
                const post_data = {
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
                    const { OK, info } = await $axios.$request({
                        method: "POST",
                        url: completeUploadUrl,
                        headers,
                        data: querystring.stringify(post_data)
                    })

                    this.logger.info(`video part ${path} ${title} upload end, returns OK ${OK} info ${info}`)

                    if (parseInt(OK) !== 1 || info.match('error')) {
                        this.logger.error(`Filesize error`)
                        const fileStatusPath = join(this.dirName, 'fileStatus.json')
                        if (fs.existsSync(fileStatusPath)) {
                            const text = fs.readFileSync(fileStatusPath)
                            const obj: FileStatus = JSON.parse(text.toString())
                            if (obj.videoParts) {
                                obj.videoParts.failUpload = {}
                                const stringifies = JSON.stringify(obj, null, 2)
                                fs.writeFileSync(fileStatusPath, stringifies)
                                this.logger.info(`DELETE failUpload Record`)
                            }
                        }
                        uploadStatus.delete(this.dirName)
                        return reject(info)
                    }

                    resolve({
                        desc,
                        title,
                        filename: serverFileName
                    })
                } catch (err) {
                    uploadStatus.delete(this.dirName)
                    reject(`Merge file error: ${JSON.stringify(err, null, 2)}`)
                }
            })
            fileStream.on('error', (error: any) => {
                uploadStatus.delete(this.dirName)
                fileStream.destroy()
                reject(`An error occurred while listening fileStream: ${error}`)
            })
        })

    }


    uploadChunk = async (uploadUrl: any, serverFileName: any, path: any, chunk_data: Buffer, chunk_size: any, chunk_id: any, chunk_total_num: any) => {
        return new Promise<void>(async (resolve, reject) => {

            try {
                const chunkHash = crypto.createHash('md5')
                chunkHash.update(chunk_data)
                const form = new formData()
                form.append('version', '2.0.0.1054')
                form.append('filesize', chunk_size)
                form.append('chunk', chunk_id)
                form.append('chunks', chunk_total_num)
                form.append('md5', chunkHash.digest('hex'))
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
                this.logger.info(`chunk #${chunk_id}/${chunk_total_num} upload ended, returns: ${result.OK}\nPath: ${path}`)

                if (result.info !== "Successful.") {
                    reject(`Upload Chunk #${chunk_id}/${chunk_total_num} Return Outside Of Expect: ${result.info}`)
                }

                resolve()
            } catch (e) {
                uploadStatus.delete(this.dirName)
                reject(`Upload chunk error: ${e} ...`)
            }
        })

    }

    postVideo = async (remoteVideos: remoteVideoPart[]) => {
        return new Promise<void>(async (resolve, reject) => {

            const headers = {
                'Connection': 'keep-alive',
                'Content-Type': 'application/json',
                'User-Agent': '',
            }
            const post_data: any = {
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
                'videos': remoteVideos
            }
            const params: any = {
                'access_key': this.access_token
            }
            params['sign'] = crypt.make_sign(params, this.APPSECRET)
            this.logger.debug(`postData ${JSON.stringify(post_data, null, 2)} params${JSON.stringify(params, null, 2)}`)

            try {
                const url = "https://member.bilibili.com/x/vu/client/add"

                const {
                    code = -1,
                    message = '',
                    ttl = -1,
                    data: { aid, bvid } = { aid: 0o0000, bvid: 'xxxxx' }
                }: { code: number; message: string; ttl: number; data: { aid: number, bvid: string; } } = await $axios.$request({
                    method: "POST",
                    url,
                    data: post_data,
                    params,
                    headers
                })

                if (code === 0) {
                    this.logger.info(`Post End ${code} message ${message} ttl ${ttl} aid ${aid} bvid ${bvid}`)
                    resolve()
                } else {
                    uploadStatus.delete(this.dirName)
                    reject(`Upload fails, returns:, ${code} message ${message} ttl ${ttl} aid ${aid} bvid ${bvid}`)
                }

            } catch (err) {
                uploadStatus.delete(this.dirName)
                reject(err)
            }
        })
    }

    renderTitle = (template: string, context: any) => {
        return template.replace(/\{\{(.*?)\}\}/g, (_, key) => context[key] || "")
    }
}
