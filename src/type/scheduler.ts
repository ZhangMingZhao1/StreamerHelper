import { App } from ".."

export class Scheduler {
    interval: number
    async task(_app: App) {
    }
    constructor(interval: number, task: (app: App) => Promise<void>) {
        this.interval = interval
        this.task = task
    }
}