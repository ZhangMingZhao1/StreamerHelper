const fs = require('fs')
const Path = require('path');
const log4js = require("log4js");
const rootPath = process.cwd()
log4js.configure({
    appenders: {
        cheese: {
            type: "file",
            filename: rootPath + "/logs/artanis.log",
            maxLogSize: 20971520,
            backups: 10,
            encoding: "utf-8",
        },
    },
    categories: {
        default: {
            appenders: ["cheese"],
            level: "info"
        }
    },
});

const {
    login,
    upload
} = require('./index.js')
let deleteFolder = function (path) {
    try {
        let files = [];
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path);
            files.forEach((file) => {
                let curPath = Path.join(path, file)
                if (fs.statSync(curPath).isDirectory() === false) {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    } catch (err) {
        throw err
    }
}

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
        let dirName = "D:/xxx"
        // must be a Dir
        const paths = readDirSync(dirName)
        let parts = []
        for (let key in paths) {
            parts.push({
                path: paths[key],
                title: `P${parseInt(key)+1}`,
                desc: ""
            })
        }
        upload(dirName, r.access_token, r.sid, r.mid, parts, 2, "example title", 171, ["tag1", "tag2"].join(','), "", "live url", )
            .then(() => {
                // deleteFolder(dirName)
            })
            .catch(err => {
                console.log(err)
                return
            })
    })
    .catch(err => {
        console.log(err)
        return
    })