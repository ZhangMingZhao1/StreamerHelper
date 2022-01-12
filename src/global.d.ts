declare namespace NodeJS {
    export interface Global {
        config: import("./type/config").Config,
        app: import("index").App
    }
}
