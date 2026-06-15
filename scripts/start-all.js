import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["agent/server.js"], { stdio: "inherit", windowsHide: true }),
  spawn(process.execPath, ["scripts/dev-server.js"], { stdio: "inherit", windowsHide: true })
];

process.on("SIGINT", () => {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
});
