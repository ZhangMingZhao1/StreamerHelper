import axios from 'axios'
import {NuxtAxiosInstance} from "../type";
const axiosRetry = require('axios-retry');
const headers = {
    'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': '',
        'Accept-Encoding': 'gzip,deflate',
}

// @ts-ignore
const $axios :NuxtAxiosInstance = axios.create({ headers , withCredentials: true})
axiosRetry($axios, { retries: 6 , retryDelay: (retryCount :number) => {
    return retryCount * 2500
    }});
for (const method of ['request', 'delete', 'get', 'head', 'options', 'post', 'put', 'patch']) {
    // @ts-ignore
    $axios['$' + method] = function () { return this[method].apply(this, arguments).then(res => res && (res.data.resHeaders = res.headers) && res.data) }
}

export {
    $axios
}
