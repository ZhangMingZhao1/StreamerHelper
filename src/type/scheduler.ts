export class Scheduler {
    private _interval: number
    private async _task() {
    }

    public get interval(): number {
        return this._interval
    }

    public get task() {
        return this._task
    }

    constructor(interval: number, task: () => Promise<any>) {
        this._interval = interval
        this._task = task
    }
}