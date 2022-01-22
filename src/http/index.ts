import axios, { AxiosInstance ,AxiosResponse} from 'axios'
import * as rax from 'retry-axios';

import { getExtendedLogger } from "@/log";

const headers = {
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': '',
    'Accept-Encoding': 'gzip,deflate',
}
const logger = getExtendedLogger(`HTTP`)

const $axios: AxiosInstance & {
    [key: string]: any
} = axios.create({ headers, withCredentials: true })

$axios.defaults.raxConfig = {
    instance: $axios,
    retry: 5,
    retryDelay: 1000,
    httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT', 'POST'],
    noResponseRetries: 5,
    onRetryAttempt: err => {
        const cfg = rax.getConfig(err);
        logger.error(`Retry attempt #${cfg && cfg.currentRetryAttempt}`);
    }
}

rax.attach($axios)

for (const method of ['request', 'delete', 'get', 'head', 'options', 'post', 'put', 'patch']) {
    $axios['$' + method] = function () { return this[method].apply(this, arguments).then((res: AxiosResponse) => res && (res.data.resHeaders = res.headers) && res.data) }
}

export {
    $axios
}
