# DayTogether (ชื่อชั่วคราว)

เว็บจัดการชีวิตส่วนตัวภาษาไทย พัฒนาต่อจากโครงสร้าง Money102 ที่มีอยู่ โดยยังใช้ Vite + React + TypeScript, Cloudflare Worker API, Cloudflare D1 และ Render เป็นเป้าหมาย production

## Architecture ปัจจุบัน

- **Frontend:** React 19 + TypeScript + Vite; responsive CSS อยู่ใน `src/daytogether.css`
- **Authentication:** Cloudflare Worker จัดการสมัคร/เข้าสู่ระบบ และ session token
- **Persistence ที่แอปใช้อยู่ตอนนี้:** key `lamoon-daytogether-v1` ถูกส่งผ่าน API `/api/state` ไปยังตาราง `user_app_data` ของ D1 เป็น JSON snapshot ต่อผู้ใช้
- **Schema รุ่นแยกตาราง:** `workers/migrations/0001_daytogether.sql` เป็น migration ที่เตรียมไว้สำหรับ data model แบบ normalized แต่ยัง **ไม่ได้ apply กับ production D1 และยังไม่ได้เปลี่ยน frontend ให้ CRUD ผ่านตารางเหล่านั้น** การ commit ไฟล์ migration ไม่ได้เปลี่ยนฐานข้อมูลจริง
- **Hosting:** ใช้การตั้งค่า Render เดิมเมื่อ deploy จาก branch ที่เชื่อมไว้ ไม่มีการสั่ง deploy จากเอกสารนี้

## ติดตั้งและรัน

ต้องใช้ Node.js 22 ขึ้นไป

```sh
npm install
npm run dev
```

ตรวจสอบ build และ unit tests:

```sh
npm test
npm run build
```

## Environment variables

Frontend ใช้ตัวแปรต่อไปนี้เมื่อจำเป็น:

- `VITE_CLOUDFLARE_API_URL`: URL ของ Cloudflare Worker API ที่ใช้กับ frontend; ถ้าไม่กำหนด จะใช้ URL Worker ที่ตั้งไว้ใน `src/CloudAuth.tsx`

ห้ามใส่ Cloudflare API token, D1 credentials, service-role secrets หรือ private key ลงใน `VITE_*` variables เพราะค่ากลุ่มนี้ถูกส่งไปยัง browser ได้

Cloudflare Worker ต้องมี binding `DB` ชี้ไปยัง D1 database และตั้งค่า `APP_ORIGIN` ให้ตรงกับ origin ที่อนุญาตจริง การเพิ่ม origin ต้องตรวจสอบก่อนเปลี่ยน CORS allowlist ใน Worker

## Authentication และข้อมูล

- สมัครสมาชิกใช้ `POST /api/auth/signup`; เข้าสู่ระบบใช้ `POST /api/auth/signin`
- ข้อมูลแอปปัจจุบันเก็บใน snapshot ต่อบัญชี ผ่าน `GET/PUT /api/state`
- การออกจากระบบล้าง snapshot ที่อยู่ใน memory ของหน้าเว็บ
- ระบบส่งอีเมลสำหรับรีเซ็ตรหัสผ่านยังไม่ได้ตั้งค่า หน้า “ลืมรหัสผ่าน” จึงแจ้งข้อจำกัดตรง ๆ และไม่ได้แกล้งส่งลิงก์
- การเก็บเป็น snapshot ทำให้ข้อมูลยังอยู่ใน D1 และแยกตาม user_id แต่ยังไม่มี CRUD แบบ normalized, optimistic locking ระดับ record, transaction แยกบิล/รายการย่อย หรือ RLS ระดับตารางตาม migration
- อย่า apply `workers/migrations/0001_daytogether.sql` กับ production จนกว่าจะ backup, ตรวจสอบ foreign keys, และเปลี่ยน API ให้ใช้ schema นี้พร้อมทดสอบ migration/rollback

## ฟีเจอร์ที่อยู่ใน UI รุ่นนี้

- หน้าหลักพร้อมสรุปจากข้อมูลที่บันทึก
- ออมเงิน: เป้าหมาย, ฝาก/ถอน, ประวัติ และยอดคำนวณเป็นสตางค์
- สุขภาพ: บันทึกค่าตัวเลข/ข้อความตามหมวด น้ำหนัก ความดัน การนอน ดื่มน้ำ อาการ และออกกำลังกาย; CRUD และกราฟแนวโน้ม 7/30/90 วันสำหรับข้อมูลตัวเลข (แบบฟอร์มยังไม่ได้แยกฟิลด์เฉพาะทุกชนิด)
- โน้ต/ไดอารี: ค้นหา, แท็ก, ปักหมุด, แก้ไข และลบ
- หารตัง: หลายรายการต่อบิล, เลือกผู้จ่ายหนึ่งคนหรือแบ่งยอดที่ออกระหว่างหลายคน (ยอดผู้จ่ายรวมต้องเท่ากับยอดรายการ), เลือกผู้ร่วมแต่ละรายการ, แบ่งเท่ากัน/กำหนดยอด/เปอร์เซ็นต์, ยอดรวมสด, แนะนำการเคลียร์ยอด และบันทึก/ยกเลิกการชำระ
- หมูกระทะ: ร้าน, วัน, เพื่อน, ยอดส่วนตัว, คะแนนและความทรงจำ; เชื่อมไปกลับกับบิลได้
- ตั้งค่า: ชื่อแสดงผล, ธีม, timezone, ซ่อนข้อมูล, ส่งออก JSON และ CSV สำหรับโน้ต ออมเงิน สุขภาพ บิล และประวัติมื้ออาหาร
- desktop sidebar และ mobile bottom navigation พร้อมเมนูเพิ่มเติม

## ข้อจำกัดที่ยังเหลือก่อนเรียกว่าพร้อมใช้งานเต็มตามสเปก

1. API ยังใช้ snapshot JSON ไม่ได้ใช้ migration แบบ normalized ที่เพิ่มเข้ามา
2. Forgot-password email flow ยังไม่พร้อม เพราะไม่มี provider ส่งอีเมลและ token verification
3. หารตังยังไม่รองรับส่วนลด/ภาษี/ค่าบริการอัตโนมัติ และยังต้องทดสอบ flow ทั้งสร้างบิล แก้ไขบิล และเคลียร์ยอดบนเบราว์เซอร์จริง
4. private photo storage, การลบบัญชี และการลบข้อมูลรายหมวดยังไม่ได้ทำ
5. บันทึกโน้ตยังไม่มี autosave ที่ยืนยันจาก backend ต่อ revision และยังไม่มี conflict resolution ระหว่างแท็บ
6. การเก็บข้อมูลใน snapshot ยังไม่มี versioning ต่อ record และไม่ควรถือว่าเทียบเท่า normalized transactional storage
7. แบบฟอร์มสุขภาพแยกความดันตัวบน/ตัวล่างและคำนวณชั่วโมงนอนข้ามวันแล้ว แต่ยังไม่มีตัวเลือกคุณภาพการนอน และปุ่มน้ำ 250/500 mL ยังเป็นการกรอกค่าลัดที่ต้องกดบันทึกเอง ไม่ได้บันทึกทันที
8. ต้องทดสอบ end-to-end กับบัญชีจริงและตรวจ deploy logs ของ Render ก่อนยืนยัน production readiness

## Unit tests

ไฟล์ทดสอบปัจจุบันครอบคลุมการหารยอดและเศษสตางค์, การแบ่งเฉพาะผู้ร่วมรายการ, ยอดกำหนดเอง/เปอร์เซ็นต์, ผู้จ่ายหลายคน, การตรวจยอดชำระเกิน, การนอนข้ามวัน, CSV formula injection, การตรวจ snapshot/API และการย้ายข้อมูลเก่า การทดสอบการรวมข้อมูลตาม timezone และ browser E2E กับบัญชีจริงยังไม่ครบ
