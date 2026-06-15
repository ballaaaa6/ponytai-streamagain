# Ponytai StreamAgain

Ponytai StreamAgain is a Cloudflare-hosted control panel for rerunning local video files to RTMP destinations. Videos are stored in Backblaze B2 with an application cap of 5GB. A Windows PC agent downloads queued videos from B2 and runs FFmpeg locally.

## How It Works

- Cloudflare Pages hosts the web control panel.
- Cloudflare Pages Functions provide the API.
- Backblaze B2 stores uploaded videos and control data.
- The Windows PC agent polls Cloudflare for queued stream jobs.
- FFmpeg runs on the PC and streams to YouTube, Facebook, Twitch, TikTok, or custom RTMP.
- The default FFmpeg mode uses `-c copy` to avoid re-encoding and reduce CPU usage.

Cloudflare Pages, Functions, and object storage do not replace the FFmpeg streaming machine. The PC or a VPS is still required for long-running RTMP output.

## Fast Setup

1. Install Node.js and FFmpeg.
2. Deploy the Cloudflare Pages app.
3. Install the Windows startup agent:

```powershell
cd /d D:\antigravity\streamagain
npm.cmd run install-startup
```

4. Open the web app:

```text
https://ponytai-streamagain.pages.dev
```

5. Upload videos in the `Videos` page.
6. Create a stream in `New live stream`.
7. Add a destination stream key.
8. Click `Start Livestream`.

If the PC agent is offline, jobs can still be queued in the cloud. FFmpeg starts when the PC agent comes online.

## Manual Agent Command

Use this only if the startup task is not installed:

```powershell
cd /d D:\antigravity\streamagain
npm.cmd run agent
```

In Windows Command Prompt, use `cd /d` when changing drives.

## Backblaze B2 Storage Cap

The app caps video storage at 5GB total to stay comfortably under free storage. The UI shows used space, remaining space, and upload rejection when the limit would be exceeded.

## Cloudflare Pages Settings

- Build command: leave empty
- Build output directory: `web`
- Secrets required:
  - `B2_KEY_ID`
  - `B2_APPLICATION_KEY`
  - `B2_BUCKET_NAME`

## File Compatibility

Copy mode is efficient but expects platform-compatible media. MP4 with H.264 video and AAC audio is the safest choice. If a platform rejects a file, transcode the file first or add a future transcoding preset.

## Security Notes

- Stream keys are stored in Cloudflare control data for queued jobs.
- Do not share the public app URL with people you do not trust.
- A future production version should add authentication before public use.
