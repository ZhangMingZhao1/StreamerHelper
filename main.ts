import { app, BrowserWindow } from "electron";
import getHuyaSteam from "./engine/huya/message";
import * as path from "path";

getHuyaSteam();
