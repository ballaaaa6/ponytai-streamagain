import fs from "node:fs";
import path from "node:path";
import { buildRtmpUrl } from "../agent/stream-manager.js";

const required = [
  "README.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "TODO.md",
  ".gitignore",
  "web/index.html",
  "web/styles.css",
  "web/app.js",
  "functions/api/[[path]].js",
  "agent/server.js"
];

for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) {
    throw new Error(`Missing ${file}`);
  }
}

const url = buildRtmpUrl({
  platform: "youtube",
  streamKey: "abc"
});

if (url !== "rtmp://a.rtmp.youtube.com/live2/abc") {
  throw new Error("RTMP URL builder failed.");
}

console.log("Project check passed.");
