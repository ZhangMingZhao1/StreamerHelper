const {
    login,
    upload
} = require('./uploader/index')
const {
    username,
    password
} = require('../templates/info.json').personInfo
const fs = require('fs')
function readDirSync(path) {
    let paths = []
    let pa = fs.readdirSync(path);
    pa.forEach(function (ele, index) {
        paths.push(path + "\\" + ele)
    })
    return paths
}
async function upload2bilibili(dirName, title, desc, tags) {
    const r = await login(username, password)
    const paths = readDirSync(dirName)
    let parts = []
    for (let key in paths) {
        parts.push({
            path: paths[key],
            title: `part${key}`,
            desc: ""
        })
    }
    await upload(
        r.access_token,
        r.sid,
        r.mid,
        parts,
        1,
        title,
        171,
        tags.join(','),
        desc,
        '', )
}
module.exports = {
    upload2bilibili
}