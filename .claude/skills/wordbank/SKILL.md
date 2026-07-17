---
name: wordbank
description: บริบทและกฎเฉพาะโปรเจกต์ คลังคำ (Word Bank) — เว็บเก็บคำศัพท์สำหรับนักเขียนนิยาย · โครงสร้าง เทคโนโลยี ฐานข้อมูล วิธีทำงานต่อ · โหลดก่อนแก้โปรเจกต์นี้ (อ่านคู่กับ working-with-gun และ CLAUDE.md)
---

# คลังคำ (Word Bank) — สกิลเฉพาะโปรเจกต์

> อ่านคู่กับสกิลกลาง `working-with-gun` (กฎการทำงาน) และ `CLAUDE.md` (รายละเอียดเต็ม) · ไฟล์นี้ = สรุปสั้นให้จับทางเร็ว

## นี่คืออะไร
เว็บส่วนตัวสำหรับนักเขียนนิยาย เก็บคำงาม/วลี/ประโยค ให้ระบบช่วยแก้สะกด แยกวลี จัดหมวดอัตโนมัติ
3 หน้า: **เพิ่มคำ** → **ตรวจทาน** → **คลังคำ** (ต้นไม้หมวดย่อย 3 ชั้น ยุบขยาย + สารบัญ)
ธีมกระดาษวรรณกรรม ครีม+หมึกน้ำตาล ฟอนต์ลายมือ Charmonman

## เทคโนโลยี (ย่อ)
- Next.js 15 (App Router) + React 19 · **JavaScript ไม่ใช่ TypeScript**
- Supabase (Postgres) ตาราง `wb_` ฝากในโปรเจกต์ tb-calculator (ref `ryewggkhunpuipgkgbfv`)
- **ไม่มีล็อกอิน** · RLS deny-all · เข้า DB ผ่าน API route (service_role) เท่านั้น
- **ตัวจัดคำ = ระบบ AI สลับหลายเจ้า** (`lib/ai.js` + `lib/providers.js`) 8 ตัวเลือก: พื้นฐาน(heuristic ฟรี) + Gemini/Claude/GPT/DeepSeek/Kimi/Qwen/GLM
  - OpenAI-compatible 5 เจ้าใช้ตัวแปลงเดียว · Gemini/Claude แยก (Claude ใช้ `@anthropic-ai/sdk`)
  - กุญแจอยู่ `.env.local` ฝั่งเซิร์ฟเวอร์ · เลือกเจ้า+รุ่นในหน้าเพิ่มคำ/ตั้งค่า
  - prompt แก้บนหน้าเว็บได้ (2 กรอบ อังกฤษ/ไทย · ส่งอังกฤษอย่างเดียว) ค่าเริ่มต้น `lib/prompt.js`

## แผนที่ไฟล์ (แก้ตรงไหน)
- แก้ UI/หน้า/ต้นไม้/สารบัญ/settings/prompt editor → `components/WordBankApp.jsx` (class เดียว ทั้งแอป)
- แก้ระบบ AI (การเชื่อมต่อ/normalize/prompt builder) → `lib/ai.js` · เพิ่ม/แก้เจ้าหรือชื่อรุ่น → `lib/providers.js` · แก้ prompt เริ่มต้น → `lib/prompt.js`
- แก้ตัวจัดคำพื้นฐาน (heuristic) → `lib/engine.js`
- แก้ API → `app/api/{bootstrap,process,words,categories}/`
- โครงต้นไม้หมวดย่อย + อังกฤษ + คำบรรยาย → `lib/subtree.js` (+ `lib/catmeta.js`) — สร้างจาก .docx อย่าแก้มือ
- นำเข้าคำใหม่ → `scripts/import_tree.mjs` (อ่าน `scripts/vocab_tree.json` + `.env.local`)
- สี/badge/pill → `lib/colors.js`

## ฐานข้อมูล
`wb_categories` (id c0..c8) · `wb_novels` · `wb_words`(text, meaning, category_id, **kind** ชนิด word/phrase/sentence, **subpath** เส้นทางหมวดย่อย 3 ชั้นคั่น " / ", **highlight** คำเน้น, novel, ...) · RLS deny-all

## รัน
```
npm install · npm run dev (localhost:3000) · npm run build (เช็ค error)
```
🚨 **ห้ามรัน build ขณะ dev เปิด** (.next ชน Cannot find module) — หยุด dev + ลบ .next ก่อน

## repo / deploy
- github.com/sirawitphaopha/WORD-BANK branch **main**
- ยังไม่ deploy · Next.js มี server → Cloudflare **Workers** (ไม่ใช่ Pages)

## กฎสำคัญของโปรเจกต์นี้ (นอกจากสกิลกลาง)
- ข้อความ UI ภาษาทางการ ไม่มี ค่ะ/นะคะ ไม่มีเครื่องหมาย `?`
- หน้าคลังคำเปิดมา**ยุบหมวดไว้ก่อน** (กันหน่วง 679 การ์ด)
- 🚨 **ทุกปุ่ม action สำคัญต้องผ่านป๊อปยืนยันกลาง** `askConfirm({title,msg,okLabel,danger,onOk})` + `renderConfirm()` (คลิกนอกป๊อปไม่ปิด)
- เมนู = แบนเนอร์บนเสมอ (เอา sidebar ออกแล้ว) · ตรวจทานมี ป้ายชนิด/หมวดย่อย/⚠มีในคลัง/✂แยกจากประโยค · deploy อยู่ Cloudflare Workers (word-bank.siravitphoapha9928.workers.dev)
- แกะ .docx: list ilvl 0/1/2 = หมวดย่อย 3 ชั้น · วงเล็บ: (แปล:X)/เว้นวรรค(X)=ความหมาย · คำ(X)ติด=รวมวลี+เก็บ highlight · (เน้น...)=คำบรรยาย · (ใช้...)=ทิ้ง

## ถัดไป (ดู `idea.md` ใน repo)
โหมด "แคลร์จัดคำผ่านแชท" (ไม่ใช้ API) · แปะชนิดคำเก่าย้อนหลัง · deploy Cloudflare Workers · ระบบไฮไลต์คำเน้น (field highlight) · ระบบล็อกอิน (ถ้าต้องการ)
