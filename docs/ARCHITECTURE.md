# Architecture

Ponytai StreamAgain แยกเป็นสองส่วน

## Web control panel

อยู่ใน `web/` และเป็น static app deploy บน Cloudflare Pages ได้ ไม่มี server-side runtime บน Cloudflare

## Local agent

อยู่ใน `agent/` และรันบนเครื่องผู้ใช้ ใช้ Node.js เปิด HTTP API ที่ `localhost:8787` เพื่อ:

- อ่านรายการวิดีโอจาก `VIDEO_ROOT`
- สร้าง RTMP URL จาก platform และ stream key
- spawn FFmpeg process
- ติดตามสถานะและหยุดงาน stream

## Why local agent is required

Browser และ Cloudflare Pages ไม่สามารถส่ง path จริงของไฟล์ในเครื่องให้ FFmpeg ได้ และ Cloudflare Workers ไม่เหมาะกับงาน long-running video streaming ดังนั้น FFmpeg ต้องรันบนเครื่องผู้ใช้หรือ VPS
