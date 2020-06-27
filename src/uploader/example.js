const {
    login,
    upload
} = require('./index.js')
login('username', 'password')
    .then(r => {
        let parts = []
        parts.push({
            path: "part1_path",
            title: "part1_title",
            desc: "part1_desc"
        })
        parts.push({
            path: "part2_path",
            title: "part2_title",
            desc: "part2_desc"
        })
        upload(
            r.access_token,
            r.sid,
            r.mid,
            parts,
            copyright = 1,
            title = 'title',
            tid = 171,
            tag = ["tag1", "tag2"].join(','),
            desc = "description",
            source = 'source_url', )
    })