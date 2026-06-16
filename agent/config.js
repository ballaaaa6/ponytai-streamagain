import fs from "node:fs";
import path from "node:path";

export function loadConfig() {
  loadDotEnv();

  const cwd = process.cwd();
  const dataDir = path.join(cwd, ".data");
  const videoRoot = path.resolve(process.env.VIDEO_ROOT || path.join(cwd, "videos"));

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(videoRoot, { recursive: true });

  return {
    port: Number(process.env.PORT || 8787),
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
    videoEncoder: process.env.VIDEO_ENCODER || "h264_nvenc",
    videoRoot,
    dataDir,
    cloudApiUrl: process.env.CLOUD_API_URL || "",
    cloudAgentName: process.env.CLOUD_AGENT_NAME || "desktop-agent",
    cloudPollMs: Number(process.env.CLOUD_POLL_MS || 120000),
    keepAliveUrl: process.env.RENDER_KEEPALIVE_URL || process.env.SELF_URL || "",
    keepAliveMs: Number(process.env.RENDER_KEEPALIVE_MS || 300000),
    streamAutoRestart: process.env.STREAM_AUTO_RESTART !== "false"
  };
}

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
