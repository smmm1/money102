# DayTogether (ชื่อชั่วคราว)

เว็บจัดการชีวิตส่วนตัวภาษาไทย พัฒนาต่อจาก Money102 โดยคง stack เดิมไว้: React + TypeScript + Vite, Cloudflare Worker API, Cloudflare D1 และ Render

## สถานะสถาปัตยกรรมจริง

- **Frontend:** React 19 + TypeScript + Vite; responsive styles อยู่ใน `src/daytogether.css`
- **Authentication:** Cloudflare Worker มีสมัครสมาชิก/เข้าสู่ระบบ, session, เปลี่ยนรหัสผ่าน, ออกจากระบบ และลบบัญชี
- **Persistence:** แอปส่ง snapshot JSON ของข้อมูลผู้ใช้ผ่าน `GET/PUT /api/state` ไปยังตาราง `user_app_data` ใน Cloudflare D1
- **ป้องกันการเขียนทับข้ามแท็บ:** snapshot write รองรับ compare-and-set ด้วย `expected_updated_at`; การเขียนจาก revision เก่าจะถูกปฏิเสธแทนการเขียนทับเงียบ ๆ ขอบเขตนี้เป็นระดับ snapshot ไม่ใช่ versioning ราย record
- **Schema แยกตาราง:** `workers/migrations/0001_daytogether.sql` เป็น migration ที่เตรียมไว้ แต่ยัง **ไม่ได้ apply กับ production D1** และ frontend/API ยังไม่ได้เปลี่ยนไปใช้ CRUD ผ่านตาราง normalized
- **Hosting:** Render เป็นเป้าหมาย production ตามการตั้งค่าเดิม การแก้ GitHub หรือ merge PR ไม่ใช่หลักฐานว่า production deploy สำเร็จ

## ติดตั้งและรัน

ต้องใช้ Node.js 22 ขึ้นไป

```sh
npm install
npm run dev
```

ตรวจสอบ tests, TypeScript และ production build:

```sh
npm test
npm run check
npm run build
```

## Environment variables

คัดลอก `.env.example` เป็น `.env.local` เมื่อจำเป็น

- `VITE_CLOUDFLARE_API_URL`: URL ของ Cloudflare Worker API; หากเว้นว่าง frontend จะใช้ URL ที่กำหนดไว้ใน `src/CloudAuth.tsx`

ห้ามใส่ Cloudflare API token, database credentials, service-role key หรือ private key ลงใน `VITE_*` เพราะตัวแปรเหล่านี้ถูกส่งไปยัง browser ได้

Cloudflare Worker ต้องมี binding `DB` ชี้ไปยัง D1 database และตั้งค่า `APP_ORIGIN` ให้ตรงกับ origin ที่อนุญาตจริง การเปลี่ยน CORS allowlist ต้องตรวจสอบ origin ก่อนเสมอ

## Authentication และข้อมูล

- สมัครสมาชิก: `POST /api/auth/signup`
- เข้าสู่ระบบ: `POST /api/auth/signin`
- ตรวจ session: `GET /api/auth/me`
- เปลี่ยนรหัสผ่าน: `POST /api/auth/password`
- ลบบัญชีและข้อมูลที่เก็บใน D1: `DELETE /api/auth/account`
- ข้อมูลแอป: `GET/PUT /api/state`
- ออกจากระบบล้าง snapshot ใน memory ของหน้าเว็บและ session token ฝั่ง client
- การลบข้อมูลรายหมวดจะอัปเดต snapshot และยกเลิกการเชื่อมโยงบิลกับมื้ออาหารที่เกี่ยวข้อง
- **ยังไม่มีอีเมลรีเซ็ตรหัสผ่าน** เพราะยังไม่ได้ตั้งค่า email provider และ token-verification flow

## ฟีเจอร์ที่มีใน UI

- **หน้าหลัก:** สรุปจากข้อมูลที่บันทึกจริง ทางลัดไปทุกหมวด เพิ่มรายการด่วน และโหมดซ่อนข้อมูลส่วนตัว
- **ออมเงิน:** เป้าหมาย ฝาก/ถอน ประวัติ และคำนวณยอดเป็นสตางค์; การถอนตรวจยอดของกองที่เลือก
- **สุขภาพ:** บันทึกน้ำหนัก ความดัน ชีพจร การนอนข้ามวัน น้ำดื่ม อาการ และออกกำลังกาย; แก้ไข/ลบได้; มีกราฟ 7/30/90 วันและคงช่องว่างในวันที่ไม่มีข้อมูล; วันเวลาแสดงตาม timezone ที่เลือก
- **โน้ต/ไดอารี:** ค้นหา แท็ก ปักหมุด autosave แบบ debounce เก็บถาวร และกรองตามประเภท แท็ก และช่วงวันที่; การเขียน snapshot จาก revision เก่าจะไม่เขียนทับข้อมูลใหม่โดยเงียบ ๆ
- **หารตัง:** หลายรายการต่อบิล ผู้จ่ายหนึ่งคนหรือหลายคน ผู้ร่วมแต่ละรายการ แบ่งเท่ากัน/ยอดกำหนดเอง/เปอร์เซ็นต์ ค่าบริการ ภาษี และส่วนลดทั้งบิล; คำนวณเป็นสตางค์พร้อมกระจายเศษตามสัดส่วน; มีตัวอย่างส่วนแบ่งสด การบันทึก/ยกเลิกการชำระ และรองรับบิลที่ไม่ได้รวมผู้ใช้ปัจจุบัน
- **หมูกระทะ:** ประวัติร้าน มื้อ เพื่อน ยอดส่วนตัว คะแนน และความทรงจำ; เชื่อมไปกลับกับบิล; แยกยอดที่ไม่ทราบออกจากยอดศูนย์
- **ตั้งค่า:** ชื่อแสดงผล ธีม timezone หมวดสุขภาพ การ์ด Dashboard โหมดซ่อนข้อมูล ส่งออก JSON/CSV เปลี่ยนรหัสผ่าน ลบข้อมูลรายหมวด และลบบัญชี
- **Responsive navigation:** sidebar บน desktop และ bottom navigation พร้อมเมนูเพิ่มเติมบน mobile

## ข้อจำกัดที่ยังเหลือก่อนเรียกว่าพร้อมใช้งานเต็มตามสเปก

1. ข้อมูลแอปยังเก็บเป็น JSON snapshot ใน D1 ไม่ใช่ CRUD ผ่าน normalized tables; migration ที่เตรียมไว้ยังไม่ถูก apply กับ production
2. ยังไม่มีอีเมลรีเซ็ตรหัสผ่าน
3. การตั้งค่าภาษี ค่าบริการ และส่วนลดของบิลคำนวณได้แล้ว แต่ยังต้องทำ browser E2E ตรวจ flow กับบัญชีจริงและตรวจการแสดงผลทุกขนาดหน้าจอ
4. ยังไม่มี private photo storage สำหรับรูปมื้ออาหาร จึงไม่มีปุ่มอัปโหลดรูปที่อ้างว่าใช้งานได้
5. การป้องกันการเขียนทับทำงานระดับ snapshot ไม่ใช่ versioning ราย record; การแก้ไขโน้ตหลายแท็บจะตรวจ conflict ที่ระดับข้อมูลรวม ไม่ใช่ merge ราย field
6. ยังต้องทำ browser E2E กับบัญชีจริงให้ครบ: CRUD ทุกหมวดหลัง refresh, responsive, session expiry, API/offline failure และการแยกสิทธิ์ผู้ใช้
7. ยังไม่ได้ยืนยันสถานะ production deploy จาก Render ในการแก้ไข GitHub รอบล่าสุด

## Tests

GitHub Actions ตรวจ unit tests, TypeScript และ production build รวมถึง calculation tests สำหรับการหารยอด/เศษสตางค์ ผู้จ่ายหลายคน การแบ่งเฉพาะผู้ร่วมรายการ ภาษี ค่าบริการ ส่วนลดตามสัดส่วน การชำระเกิน การนอนข้ามวัน ค่าใช้จ่ายส่วนตัวหมูกระทะ การกรองวันในกราฟสุขภาพ การจัดรูปแบบวันที่ตาม timezone การตรวจ snapshot/API และการป้องกัน CSV formula injection

การผ่าน CI ไม่ทดแทนการทดสอบ end-to-end บน production จริง
