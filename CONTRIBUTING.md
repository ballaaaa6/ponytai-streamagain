# Contributing

ขอบคุณที่ช่วยพัฒนา Ponytai StreamAgain

## แนวทาง

- แก้ให้เล็กและชัดก่อน
- อย่า commit stream key, token, หรือไฟล์ `.env`
- ทดสอบด้วย `npm.cmd run check`
- ถ้าแตะ agent ให้ลองเริ่ม/หยุด stream อย่างน้อยหนึ่งงาน

## โครงสร้าง

- `web/` หน้าเว็บที่ deploy บน Cloudflare Pages ได้
- `agent/` local agent ที่รันบนเครื่องผู้ใช้
- `scripts/` เครื่องมือช่วยรันและตรวจงาน
- `docs/` เอกสารแนวคิดและ TODO เชิงเทคนิค
