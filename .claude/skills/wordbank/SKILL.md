---
name: wordbank
description: บริบทและกฎเฉพาะโปรเจกต์ คลังคำ (Word Bank) — เว็บเก็บคำศัพท์สำหรับนักเขียนนิยาย · โครงสร้าง เทคโนโลยี ฐานข้อมูล วิธีทำงานต่อ · โหลดก่อนแก้โปรเจกต์นี้ (อ่านคู่กับ working-with-gun และ CLAUDE.md)
---

# คลังคำ (Word Bank) — สกิลเฉพาะโปรเจกต์

> อ่านคู่กับสกิลกลาง `working-with-gun` (กฎการทำงาน) และ `CLAUDE.md` (รายละเอียดเต็ม) · ไฟล์นี้ = สรุปสั้นให้จับทางเร็ว

## นี่คืออะไร
เว็บส่วนตัวสำหรับนักเขียนนิยาย เก็บคำงาม/วลี/ประโยค ให้ระบบช่วยแก้สะกด แยกวลี จัดหมวดอัตโนมัติ
5 หน้า: **เพิ่มคำ** → **ตรวจทาน** (แบ่งเป็นช่อ) → **คลังคำ** (ต้นไม้หมวดย่อย 3 ชั้น ยุบขยาย + สารบัญ) → **ประวัติ AI** → **เกี่ยวกับ**
ธีมกระดาษวรรณกรรม ครีม+หมึกน้ำตาล ฟอนต์ลายมือ Charmonman

## เทคโนโลยี (ย่อ)
- Next.js 15 (App Router) + React 19 · **JavaScript ไม่ใช่ TypeScript**
- Supabase (Postgres) ตาราง `wb_` ฝากในโปรเจกต์ tb-calculator (ref `ryewggkhunpuipgkgbfv`)
- **ไม่มีล็อกอิน** · RLS deny-all · เข้า DB ผ่าน API route (service_role) เท่านั้น
- **ตัวจัดคำ = ระบบ AI สลับหลายเจ้า** (`lib/ai.js` + `lib/providers.js`) 8 ตัวเลือก: พื้นฐาน(heuristic ฟรี) + Gemini/Claude/GPT/DeepSeek/Kimi/Qwen/GLM
  - OpenAI-compatible 5 เจ้าใช้ตัวแปลงเดียว · Gemini/Claude แยก (Claude ใช้ `@anthropic-ai/sdk`)
  - กุญแจอยู่ `.env.local` ฝั่งเซิร์ฟเวอร์ · เลือกเจ้า+รุ่นในหน้าเพิ่มคำ/ตั้งค่า
  - prompt แก้บนหน้าเว็บได้ (2 กรอบ อังกฤษ/ไทย · ส่งอังกฤษอย่างเดียว) ค่าเริ่มต้น `lib/prompt.js` (สวมบทนักภาษาศาสตร์ + บังคับสกัดเยอะ)
  - 🔧 GPT-5.x = reasoning ล็อค temperature=1 (`callOpenAICompatible` ไม่ส่ง temp ถ้า model ขึ้นต้น gpt-5) · เทสแล้ว: GPT-5.1/4.1/Gemini สกัดดี · 5.6/5.4 สกัดน้อย · model IDs เปลี่ยนบ่อย (ค้น developers.openai.com)
  - ทุกเจ้ามีปุ่ม "🔗 ขอกุญแจ" (keyUrl) · หน้าตรวจทานมีปุ่ม **⬇ ส่งออก** (.txt ไว้เทียบผลข้ามโมเดล — `exportReview`)

## แผนที่ไฟล์ (แก้ตรงไหน)
- แก้ UI/หน้า/ต้นไม้/สารบัญ/settings/prompt editor → `components/WordBankApp.jsx` (class เดียว ทั้งแอป)
- แก้ระบบ AI (การเชื่อมต่อ/normalize/usage) → `lib/ai.js` · เพิ่ม/แก้เจ้าหรือชื่อรุ่น → `lib/providers.js` · โลโก้แบรนด์ → `lib/brandIcons.jsx` · ราคา token → `lib/pricing.js` · prompt เริ่มต้น → `lib/prompt.js`
- แก้คำตรวจทานบนคลาวด์ → `app/api/review/` · ประวัติ AI → `app/api/logs/` + `renderAiLog()` ใน jsx
- แก้ตัวจัดคำพื้นฐาน (heuristic) → `lib/engine.js`
- แก้ API → `app/api/{bootstrap,process,words,categories}/`
- โครงต้นไม้หมวดย่อย + อังกฤษ + คำบรรยาย → `lib/subtree.js` (+ `lib/catmeta.js`) — สร้างจาก .docx อย่าแก้มือ
- นำเข้าคำใหม่ → `scripts/import_tree.mjs` (อ่าน `scripts/vocab_tree.json` + `.env.local`)
- สี/badge/pill → `lib/colors.js`

## ฐานข้อมูล
`wb_categories` (id c0..c8) · `wb_novels` · `wb_words`(text, meaning, category_id, **kind** word/phrase/sentence, **subpath** หมวดย่อย 3 ชั้นคั่น " / ", **highlight**, novel, ...) · `wb_review`(คำตรวจทานบนคลาวด์ — id=r_xxx, text, source ประโยคต้นทาง, kind, subpath, novel, ...) · `wb_ai_log`(ประวัติ AI — provider, model, tokens_in/out, cost_usd, item/saved/skipped_count, duration_ms, status) · RLS deny-all ทุกตาราง · **Supabase dev=prod ตัวเดียว รัน SQL ครั้งเดียวพอ**

## รัน
```
npm install · npm run dev (localhost:3000) · npm run build (เช็ค error)
```
🚨 **ห้ามรัน build ขณะ dev เปิด** (.next ชน Cannot find module) — หยุด dev + ลบ .next ก่อน

## repo / deploy
- github.com/sirawitphaopha/WORD-BANK branch **main**
- deploy แล้ว บน Cloudflare **Workers** (@opennextjs/cloudflare · ไม่ใช่ Pages) — word-bank.siravitphoapha9928.workers.dev
- ⚠️ env vars บน Cloudflare ต้องตั้งที่ **Settings → Variables and Secrets (runtime)** ไม่ใช่ Build (โค้ดอ่าน process.env ตอน runtime)

## กฎสำคัญของโปรเจกต์นี้ (นอกจากสกิลกลาง)
- 🚨 **push เสร็จ = เขียน `docs/SESSION-YYYY-MM-DD.md` แล้ว push ตามทันที** (หลายรอบต่อวันเติม b/c/d) · เขียนละเอียดแบบ commit (ต้นเหตุบั๊ก+วิธีแก้+วิธีพิสูจน์+บทเรียน+งานค้าง) · 🎯 **เหตุผล: Claude บนคลาวด์เห็นแต่ repo ไม่เห็นความจำในเครื่อง — ไฟล์นี้คือสิ่งเดียวที่ทำให้มันรู้จักพี่กันและทำงานต่อได้** เขียนให้ AI ที่ไม่เคยคุยกับพี่กันอ่านรู้เรื่อง เก็บบริบท/ชื่อเรียก/ข้อที่เคยถูกท้วงไว้ครบ · 🔑 **เอาออกเฉพาะของลับ** (อีเมล/กุญแจ/โทเคน/รหัสผ่าน) · 🔁 **วันไหนยังไม่มีไฟล์ ให้เขียนย้อนหลังจากบันทึกในโฟลเดอร์ความจำทันที ห้ามแต่งเอง ห้ามข้ามวัน** · ✍️ **เกณฑ์: เขียนแบบที่แคลร์เองเปิดมาอ่านแล้วทำงานต่อได้ทันทีโดยไม่ต้องมีบริบทอื่น** (ห้ามตัวย่อส่วนตัว · ชื่อฟังก์ชัน/ไฟล์/คอลัมน์ครบ · บั๊กต้องมี อาการ+ต้นเหตุ+วิธีแก้/พิสูจน์) · เขียนฉบับเดียวใช้ทั้งความจำและ docs
- 🔤 **ฟอนต์ฝังในเว็บผ่าน `next/font/google`** (`app/layout.js`) ในโค้ดใช้ `var(--font-xxx)` — ฟอนต์ใหม่ต้องฝังแบบนี้เสมอ **ห้าม `<link>` CDN**
- ข้อความ UI ภาษาทางการ ไม่มี ค่ะ/นะคะ ไม่มีเครื่องหมาย `?`
- หน้าคลังคำเปิดมา**ยุบหมวดไว้ก่อน** (กันหน่วง 679 การ์ด)
- 🚨 **ทุกปุ่ม action สำคัญต้องผ่านป๊อปยืนยันกลาง** `askConfirm({title,msg,okLabel,danger,onOk})` + `renderConfirm()` (คลิกนอกป๊อปไม่ปิด)
- เมนู = แบนเนอร์บนเสมอ 4 หน้า (เพิ่มคำ/ตรวจทาน/คลังคำ/ประวัติ AI) · ตรวจทานมี **5 มุมมอง** (การ์ด/ตาราง/คอลัมน์[8 หมวดแนวนอนแถวเดียว]/✂จับกลุ่มประโยค/📖แบบคลังคำ) · ป้าย ⚠มีในคลัง (แดงกระพริบ) · ✂แยกจากประโยค (ทองเด่น) · **ไม่มีปุ่มทิ้งทั้งหมด** (ใช้เลือกทั้งหมด→ลบที่เลือก)
- 🌿 **ช่อคำ (batch)** — กดจัดคำ = ช่อใหม่**ต่อท้าย ไม่ทับ** · หน้าตรวจทานเปิดทีละช่อ (แท็บ) · ใน `renderReview` ใช้ `const S = {...ST, review: คำเฉพาะช่อที่เปิด}` ทุกมุมมองจึงถูกย่อขอบเขตให้เอง · เมธอด `batchList/activeBatchId/batchItems/setBatch/deleteBatch/normBatches` + `WordBankApp.thNum()` · บันทึก/ลบทีละช่อ · คำซ้ำ 2 ทาง (⚠ กับคลัง · ↺ ข้ามช่อ กดกระโดดได้) · ตรึงแท็บ+แถบเครื่องมือ `top:69px` (แถบสถิติอยู่นอกก้อนตรึง) · คอลัมน์ `batch/batch_no/batch_at/batch_ai` ใน wb_review (`scripts/007`)
- **หน้าเกี่ยวกับ** (`renderAbout`) — ๖ บล็อก เลขไทย + ฟอนต์ลายมือ · สถานะกุญแจ AI มาจาก `aiReady` ใน `/api/bootstrap` (true/false ล้วน ห้ามส่งค่ากุญแจ) · โลโก้ Next/React/Supabase/Cloudflare อยู่ใน `lib/brandIcons.jsx` แล้ว · **VERSION = 0.0.0.0 ยังไม่เริ่มนับ เลื่อนเมื่อพี่กันสั่งเท่านั้น**
- 🌿 **หมวดย่อยหลายกิ่ง** — `subpaths` jsonb ทั้ง 2 ตาราง (`scripts/008`) · `subpath` = กิ่งหลัก = อันแรก เขียนคู่เสมอ · `WordBankApp.pathsOf()` / `knownPaths()` / `pathTags()` · กิ่งใหม่ป้าย ✦ · คำโผล่ทุกกิ่งในคลัง (`spread()`)
- 🔴 **ซ้ำ = คำเดียวกันในกิ่งเดียวกัน** (ป้ายแดง) · คนละกิ่ง = ป้ายม่วง ↺ อยู่ N กิ่ง · ระบบแค่บอก ไม่ลบให้
- 🌐 **AI เห็นกิ่งสด** `livePathsByCat()` → process → buildUserPrompt (ห้ามลืม ไม่งั้น AI ประดิษฐ์กิ่งซ้ำ) · prompt ห้ามขึ้นต้นกิ่งด้วยชื่อหมวด (มีตัวตัดใน normalize กันอีกชั้น)
- 💾 **ผลไม่หายแม้รีเฟรช** — เว็บตั้ง bMeta ก่อนยิง → process เขียน wb_review ทันทีที่ AI ตอบ · ยกเลิก = action removeBatch
- 🚨 **keepalive/sendBeacon 64KB** เกินแล้วเงียบ (เคยทำช่อหาย) → ใช้เฉพาะตอนปิดหน้า+body เล็ก · ทุกการกด = persistReviewNow
- คำตรวจทานขึ้นคลาวด์ (`wb_review`) sync ทุก mutation ผ่าน persistReview→scheduleReviewPush · หน้าโหลด AI มีนับวินาที/ยกเลิก/กันข้อความหาย · เลือก AI โชว์**โลโก้จริง** · ป๊อป alert:true = เตือน AI ล้มเหลว
- แกะ .docx: list ilvl 0/1/2 = หมวดย่อย 3 ชั้น · วงเล็บ: (แปล:X)/เว้นวรรค(X)=ความหมาย · คำ(X)ติด=รวมวลี+เก็บ highlight · (เน้น...)=คำบรรยาย · (ใช้...)=ทิ้ง

## ถัดไป (ดู `idea.md` ใน repo)
แปะชนิดคำเก่าย้อนหลัง 679 คำ (แคลร์ทำเองได้ ไม่ใช้ API) · โหมด "แคลร์จัดคำผ่านแชท" · ระบบไฮไลต์คำเน้น (field highlight) · ระบบล็อกอิน (ถ้าต้องการ)
✅ เสร็จแล้ว: ระบบ AI หลายเจ้า · deploy Cloudflare · คำตรวจทานขึ้นคลาวด์ · ประวัติการใช้ AI (log+token+ค่าใช้จ่าย) · 5 มุมมองตรวจทาน · โลโก้จริง
