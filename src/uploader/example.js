const {
    login,
    upload
} = require('./index.js')
login('18753828709', 'li12345')
    .then(r => {
        let parts = []
        parts.push({
            path: "C:/Users/1aoMn/Desktop/huya/BilibiliUploader/zzt-2020-06-26-part-000.mp4",
            title: "part1_title",
            desc: "part1_desc"
        })
        upload(
            r.access_token,
            r.sid,
            r.mid,
            parts,
            copyright = 2,
            title = '姿 姿 态1',
            tid = 171,
            tag = ["英雄联盟", "LOL"].join(','),
            desc = "",
            source = 'https://www.huya.com/333003', )
    })
    //access_token, sid, mid, parts, copyright, title, tid, tag, desc, source = '', cover = '', no_reprint = 0, open_elec = 1