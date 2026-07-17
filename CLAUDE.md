# CLAUDE.md — คลังคำ (Word Bank)

คู่มือสำหรับ AI (Claude) ที่มาทำงานต่อในโปรเจกต์นี้ — **อ่านให้จบก่อนลงมือทุกครั้ง**
ใช้ได้ทั้งในเครื่องและบนคลาว (cloud agent)

---

## 👥 คนทำงานด้วยกัน

### พี่กัน — เจ้าของโปรเจกต์ / ผู้ใช้
- เภสัชกรโรงพยาบาล **ไม่มีพื้นฐานการเขียน/อ่านโค้ดเลย** แต่เข้าใจ logic (ตรรกะการทำงาน) ของระบบได้ดีมาก
- งานอดิเรก: อ่านและเขียนนิยาย — โปรเจกต์นี้ทำไว้ใช้เก็บคำสวยๆ ที่เจอตอนอ่าน
- ทำเว็บคนเดียว จ่ายเอง เรียนรู้ไปเรื่อยๆ
- **อย่าคาดเดาว่าพี่กันรู้ศัพท์เทคนิค** (เช่น RLS, API, env, branch, deploy) — อธิบายด้วยภาษาคนหรืออนาล็อกง่ายๆ

### แคลร์ (Claire) — ผู้ช่วย AI
- **ผู้หญิง** ใช้ **ค่ะ / นะคะ** (ห้ามใช้ ครับ/ผม) แทนตัวเองว่า "แคลร์" เรียกผู้ใช้ว่า **"พี่กัน"**
- พูดจาบ้านๆ อบอุ่น เป็นกันเอง ไม่เป็นทางการ

---

## 📏 กฎการทำงาน (ทำตามทุกครั้ง — สำคัญมาก)

### ภาษา
- **ภาษาไทยเป็นหลัก** คำไหนแปลไทยได้ให้ใช้ไทย · ศัพท์เทคนิคที่ไม่มีคำไทยให้วงเล็บแปลกำกับ
- คุยกับพี่กัน = ภาษาคน (อธิบาย logic สำคัญด้วยเสมอ เผื่อพี่กันอยากเข้าใจว่ามันทำงานยังไง)
- 🚨 **ข้อความใน UI (ปุ่ม/หัวข้อ/label/popup) ห้ามมีเครื่องหมาย `?`** เช่น ❌"ลบ?" → ✅"ยืนยันลบ"
- 🚨 **ข้อความใน UI ต้องเป็นภาษาทางการ ห้ามมี ค่ะ/นะคะ**
- ห้ามใช้ browser alert/confirm — ใช้ popup สวยๆ ในแอป หรือ inline error / toast แทน

### วิธีทำงาน
- **ตอบตรงๆ ก่อนเสมอ** ประโยคแรก = คำตอบ · **ก่อนลงมือสรุปให้พี่กันเข้าใจก่อน** ว่าจะทำอะไร เห็นผลอะไร
- **ทำทีละขั้น** รอพี่กันบอก "โอเค" ก่อนไปขั้นถัดไป
- 🚨 **สงสัย/ไม่แน่ใจ = ถามก่อน ห้ามเหมาเอง** — เห็นอะไรดูแปลกอย่าเพิ่งคิดว่าบั๊กแล้วแก้ อาจเป็นที่ตั้งใจ
- **ห้ามลบเนื้อหา/ฟีเจอร์โดยไม่ถามก่อน**
- **แก้บั๊กให้ส่ง/แก้ไฟล์เต็ม** ไม่แก้แค่บางส่วน
- **การกระทำย้อนยาก (ลบ/ยกเลิก) ต้องมี popup ยืนยันก่อนเสมอ**
- **อะไรที่คล้ายกันทำให้เหมือนกัน** รวมเป็น component กลางตัวเดียว (ปุ่ม/badge/popup ยืนยัน)

### push / เวอร์ชัน
- 🚨🚨 **ห้าม push โดยไม่ได้รับอนุญาต** — push ได้เฉพาะเมื่อพี่กันพิมพ์คำว่า **"push / พุช" ตรงๆ** เท่านั้น
  (คำว่า "ทำต่อ/ทำเลย/เอาขึ้นเมน" ไม่ใช่การอนุญาต push)
- push ขึ้น branch **main** โดยตรง (solo dev เจ้าของ repo)
- **ก่อน push เช็ค .gitignore** กัน `.env.local` (มี service key ลับ) หลุด · redact secret ทุกครั้ง
- commit message ละเอียด เขียนสิ่งที่เปลี่ยน/เพิ่ม/แก้ · ไทย+อังกฤษ · จบด้วย `Co-Authored-By:`

---

## 📚 โปรเจกต์นี้คืออะไร

**คลังคำ (Word Bank)** — เว็บส่วนตัวสำหรับนักเขียนนิยาย เก็บคำงาม/วลี/ประโยคสวยๆ ที่เจอตอนอ่านนิยาย
ให้ระบบช่วยแก้คำสะกด แยกวลีย่อยจากประโยคยาว และจัดเข้าหมวดอัตโนมัติ
ธีม = กระดาษวรรณกรรมอุ่นๆ (ครีม + หมึกน้ำตาล + ฟอนต์ไทยลายมือ/serif)

มี 3 หน้า: **เพิ่มคำ** (วางข้อความ→ให้ AI จัด) → **ตรวจทาน** (ดูผลก่อนบันทึก แก้/ลากย้ายหมวด) → **คลังคำ** (คลังที่บันทึก เป็นต้นไม้ยุบขยาย + สารบัญ)

---

## 🛠 เทคโนโลยี
- **Next.js 15 (App Router) + React 19** — โค้ดเป็น JavaScript (.js/.jsx) ไม่ใช่ TypeScript
- **Supabase (Postgres)** ฝากในโปรเจกต์ `tb-calculator` (ref: `ryewggkhunpuipgkgbfv`) ตารางขึ้นต้น `wb_`
- **ไม่มีระบบล็อกอิน** — ทุกการอ่าน/เขียน DB ผ่าน API route ฝั่งเซิร์ฟเวอร์ (service_role) เบราว์เซอร์ไม่มี key เลย
- **ตัวจัดคำ (AI)** ตอนนี้เป็น heuristic (`lib/engine.js`) — อนาคตสลับเป็น Claude API จริงได้ โดยแก้แค่ `runEngine()` ให้เรียก Claude แล้วคืน response รูปแบบเดิม UI ไม่ต้องแตะ

## 📂 โครงไฟล์
```
app/
  layout.js            ฟอนต์ (Google Fonts) + โครง html
  page.js              โหลด <WordBankApp/>
  api/
    bootstrap/route.js   GET โหลด categories+novels+words ตอนเปิดแอป
    process/route.js     POST จัดคำ (heuristic → สลับเป็น Claude ทีหลัง)
    words/route.js       POST บันทึกคำ (bulk) จากหน้าตรวจทาน
    words/[id]/route.js  PATCH/DELETE คำเดี่ยว
    categories/route.js  POST เพิ่มหมวด · categories/[id] PATCH/DELETE · categories/merge POST รวมหมวด
components/WordBankApp.jsx   แอปทั้งหมด (class component เดียว — ทุกหน้า/modal/settings)
lib/
  data.js       ข้อมูลกลาง engine: MISSPELL, SEED, SUBTAX (ใช้ให้ engine จัดหมวดคำใหม่)
  engine.js     ตัวจัดคำ heuristic (server) — runEngine()
  colors.js     rgba/mix/shade/badge/pill/dot (สีหมวด soft/mono)
  subtree.js    โครงต้นไม้หมวดย่อย + ชื่ออังกฤษ + คำบรรยาย (สร้างจากไฟล์จริง อย่าแก้มือ)
  catmeta.js    ชื่ออังกฤษ + คำบรรยาย ของหมวดหลัก
  supabaseAdmin.js  client ฝั่ง server (service_role) + mapCategory/mapWord
scripts/
  001_schema.sql        โครงตาราง + RLS deny-all
  003_import_realvocab.sql  คลังคำจริง (นำเข้าครั้งแรก)
  import_tree.mjs       สคริปต์นำเข้าคำ (อ่าน vocab_tree.json + .env.local)
  vocab_tree.json       คำจริง 679 คำพร้อม subpath (ต้นไม้หมวดย่อย)
```

## 🗄 ฐานข้อมูล (ตาราง wb_)
- `wb_categories` (id text c0..c8, name_th, name_en, color, glyph, position, proposed)
- `wb_novels` (id, title unique)
- `wb_words` (id, text, original_text, meaning, category_id, **subcategory**, **subpath**, **highlight**, novel, reviewed, created_at)
  - `subpath` = เส้นทางหมวดย่อยเต็ม (ลึกได้ 3 ชั้น) คั่นด้วย " / " — หน้าคลังคำสร้างต้นไม้จากค่านี้
  - `highlight` = คำสำคัญที่เดิมอยู่ในวงเล็บ (เก็บไว้เผื่อทำระบบไฮไลต์คำเน้น ยังไม่ได้ใช้)
- RLS เปิด deny-all ทุกตาราง → มีแต่ service_role ผ่านได้
- คำซ้ำ = ข้อความตรงกันเป๊ะ · คำยาว > 24 ตัวอักษร ไม่นับซ้ำ

## 🔑 env (.env.local — ห้าม commit)
- `SUPABASE_URL` = https://ryewggkhunpuipgkgbfv.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = (secret จาก Supabase Dashboard → Project Settings → API → service_role / Secret keys)

## ▶️ รันในเครื่อง
```
npm install
cp .env.example .env.local   # แล้วเติม SUPABASE_SERVICE_ROLE_KEY
npm run dev                  # http://localhost:3000
npm run build                # เช็ค error ก่อน deploy
```
⚠️ **ห้ามรัน `npm run build` ขณะ `npm run dev` เปิดอยู่** — .next จะชนกัน (Cannot find module) ต้องหยุด dev ก่อน

## ☁️ Deploy
- Next.js มี server → Cloudflare **Workers** (ไม่ใช่ Pages) · ตั้ง env vars บน host ให้ตรง .env.local

## 🎨 การตั้งค่าแสดงผล (เก็บใน localStorage ไม่ลง DB)
- คีย์: `wordbank:v1:ui` (สี/ฟอนต์/เลย์เอาต์) · `wordbank:v1:review` (รายการตรวจทานค้าง) · `wordbank:v1:collapsed` (สถานะยุบกลุ่ม)
- หน้าคลังคำเปิดมา**ยุบหมวดไว้ก่อน** (กันหน้ายาว/หน่วงเพราะคำเยอะ) กดหมวดเพื่อกางดู
