import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const port = Number(process.env.WEB_PORT || 5173);
const webDir = path.resolve("web");

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.resolve(webDir, `.${pathname}`);

  if (!target.startsWith(webDir) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml"
  };

  res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
  fs.createReadStream(target).pipe(res);
}).listen(port, () => {
  console.log(`Web app running at http://localhost:${port}`);
});
