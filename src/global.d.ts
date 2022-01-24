export interface global {}
declare global {
  var config: import("./type/config").Config
  var app: import("index").App
}