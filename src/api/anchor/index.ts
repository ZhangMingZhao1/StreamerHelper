import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'ffmpeg';

interface IStreamInfo {
  anchorName: string;
  date: string;
  streamName: string;
}

const router = express.Router();
const filterDs_Store = (i: string) => i !== '.DS_Store';

// 主页路由
router.get('/getLiveAnchorInfo', async (req, res) => {
  const downloadPath = path.join(__dirname, '../../../download');
  const liveAnchorNames = fs.readdirSync(downloadPath);
  const promises: Promise<any>[] = [];
  liveAnchorNames.filter(filterDs_Store).forEach((anchorName) => {
    const currentAnchorPath = `${downloadPath}/${anchorName}`;
    const currentAnchor = fs.readdirSync(currentAnchorPath);
    currentAnchor.filter(filterDs_Store).forEach((date) => {
      const currentAnchorDatePath = `${currentAnchorPath}/${date}`;
      const currentAnchorStream = fs.readdirSync(currentAnchorDatePath);
      currentAnchorStream.forEach((streamName) => {
        const currentAnchorStreamPath = `${currentAnchorDatePath}/${streamName}`;
        const promise = new ffmpeg(currentAnchorStreamPath).then((t) => {
          const currentStreamInfo = {
            anchorName,
            date,
            streamName,
            duration: (t.metadata.duration as any).raw,
          };
          return currentStreamInfo;
        });
        promises.push(promise);
      });
    });
  });
  const r = await Promise.all(promises);
  res.send(r);
});

export default router;
