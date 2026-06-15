# Architecture

Ponytai StreamAgain is split into three parts.

## Cloudflare Control Plane

The `web/` directory is a static Cloudflare Pages app. It calls same-origin API routes from `functions/`.

## Cloudflare R2

R2 stores uploaded videos and small JSON control documents:

- video objects under `videos/`
- queued jobs under `_control/jobs.json`
- agent heartbeat under `_control/agent.json`
- stream history under `_control/history.json`

The application enforces a 5GB storage cap before uploads and imports.

## Windows PC Agent

The `agent/` directory runs on the user's PC. It polls Cloudflare for queued jobs, downloads the selected video from R2, and starts FFmpeg locally.

This is required because Cloudflare Pages and Workers are not suitable for long-running RTMP streaming. A PC or VPS still has to perform the actual FFmpeg stream.
