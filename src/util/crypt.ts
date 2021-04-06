import * as rsa from 'node-rsa'

function make_sign(post_data: any, APPSECRET: string) {
    const keys = []
    const post_list = []
    for (let i in post_data) {
        keys.push(i)
    }
    keys.sort()
    for (let key of keys) {
        post_list.push(`${key}=${encodeURIComponent(post_data[key])}`)
        // 转义数字必须大写
    }
    return `${post_list.join("&")}${APPSECRET}`
}

function make_rsa(text: string, pubkey: string) {
    let key = new rsa(pubkey)
    key.setOptions({
        encryptionScheme: 'pkcs1'
    })
    return key.encrypt(text, 'base64')
}

export {
    make_sign,
    make_rsa
}
