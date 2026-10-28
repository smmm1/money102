# DayTogether (ชื่อชั่วคราว)

เว็บจัดการชีวิตส่วนตัวภาษาไทย สร้างจากโปรเจกต์ React + Vite + TypeScript เดิม

## Architecture
- UI: React 19 + TypeScript + Vite และ CSS responsive
- Authentication: Cloudflare Worker API เดิม (/api/auth/*) ใช้ session token ใน sessionStorage
- Persistence ปัจจุบัน: adapter ใน src/CloudAuth.tsx บันทึก JSON snapshot แยกตาม user_id ผ่าน /api/state บน Cloudflare D1
- Calculation: src/daytogether-calculations.mjs ใช้จำนวนเต็มหน่วยสตางค์ กระจายเศษแบบ deterministic และกรอง participant ซ้ำ/ยอดติดลบ/ยอดเกิน safe integer ก่อนคำนวณ
- API validation: Worker จำกัด body และ snapshot, ตรวจโครงสร้าง state ของ DayTogether ก่อนบันทึก และแยกข้อมูลตาม user_id
- Schema: workers/migrations/0001_daytogether.sql เป็น normalized schema foundation พร้อม constraints, indexes และ foreign keys

## Run
```sh
npm install
npm run dev
npm run typecheck
npm run build
npm test
```

## Environment
คัดลอก .env.example เป็น .env แล้วกำหนด VITE_CLOUDFLARE_API_URL ให้ชี้ไปยัง Worker API ห้ามใส่ secret หรือ service-role key ในตัวแปร VITE_* เพราะจะถูกส่งไป browser

## D1
Worker ปัจจุบันต้องมี binding DB และสร้าง app_users, app_sessions, user_app_data ผ่าน ensureSchema โดยอัตโนมัติ
รัน migration schema foundation ด้วย:
```sh
wrangler d1 execute <DATABASE_NAME> --remote --file=workers/migrations/0001_daytogether.sql
```

## ข้อจำกัดที่ยังเหลือ
- UI ปัจจุบันยังบันทึกผ่าน per-user JSON snapshot ไม่ได้อ่าน/เขียน normalized tables จาก migration โดยตรง
- การหารบิลใน UI เริ่มต้นจากค่าใช้จ่ายรายการเดียวและหารเท่ากัน ยังไม่ครอบคลุมการหารแบบกำหนดยอด/เปอร์เซ็นต์หลายรายการเต็มรูปแบบ
- ยังไม่มี E2E suite, version-conflict flow สำหรับแก้โน้ตหลายแท็บ, หรือ storage รูปภาพที่ปลอดภัย จึงยังไม่เปิดปุ่มอัปโหลดภาพ
- ยังไม่มีระบบลืมรหัสผ่าน/ยืนยันอีเมล/ลบบัญชี Authentication
- ต้องทดสอบ API/D1 และสิทธิ์บน environment ที่ deploy จริงก่อนใช้ข้อมูลอ่อนไหว
- ยังไม่ได้ยืนยันว่า Render production deploy ล่าสุดผ่าน; อย่าใช้เป็นหลักฐานว่าระบบพร้อมใช้งานจริง

## Privacy
- ข้อมูลแสดงจาก snapshot ของบัญชีที่เข้าสู่ระบบเท่านั้น; API เดิมตรวจ session และแยก snapshot ด้วย user_id
- โหมดซ่อนข้อมูลซ่อนข้อความบนหน้าจอ ไม่ใช่การเข้ารหัส
- ไฟล์ส่งออกอาจมีข้อมูลส่วนตัว ให้เก็บไว้ในที่ปลอดภัย
- ปุ่มล้างข้อมูลล้างเฉพาะ snapshot ของแอป ไม่ใช่บัญชี authentication
- ไม่มีข้อมูลตัวอย่างที่ถูกสร้างอัตโนมัติและไม่มี Demo Mode แยกใน build นี้
