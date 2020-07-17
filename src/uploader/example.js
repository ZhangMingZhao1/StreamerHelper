const {
    login,
    upload
} = require('./index.js')
const fs = require('fs')
const Path = require('path');
const {
    rejects
} = require('assert');

function readDirSync(path) {
    let paths = []
    let pa = fs.readdirSync(path);
    pa.forEach(function (ele, index) {
        paths.push(Path.join(path, ele))
    })
    return paths
}
login('', '')
    .then(r => {
        let dirName = "D:/web/StreamerHelper/download/Zz1tai姿态/2020-07-15"
        const paths = readDirSync(dirName)
        let parts = []
        for (let key in paths) {
            parts.push({
                path: paths[key],
                title: `part${key}`,
                desc: ""
            })
        }
        upload(
            r.access_token,
            r.sid,
            r.mid,
            parts,
            2,
            "炫神 2020-07-13录播",
            171,
            ["英雄联盟", "LOL"].join(','),
            "",
            "https://www.huya.com/840747", )
    })
//access_token, sid, mid, parts, copyright, title, tid, tag, desc, source = '', cover = '', no_reprint = 0, open_elec = 1