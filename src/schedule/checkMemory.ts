import * as os from 'os';

import { getExtendedLogger } from "@/log";
import { Scheduler } from '@/type/scheduler'

const logger = getExtendedLogger(`memory`)

// node进程占用的内存总量 实际堆内存的使用量 表示堆内存的总量。
const { rss, heapUsed, heapTotal } = process.memoryUsage();
// 系统空闲内存
const sysFree = os.freemem();
// 系统总内存
const sysTotal = os.totalmem();

const memoryInfo = `系统内存占用率: ${1 - sysFree / sysTotal}, 堆内存占用率: ${heapUsed / heapTotal},  Node占用系统内存的比例: ${rss / sysTotal}`;

const interval = 1000 * 60 * 2


export default new Scheduler(interval, async function () {
    logger.info(`${new Date().toLocaleString()}: ${memoryInfo}`)
})
