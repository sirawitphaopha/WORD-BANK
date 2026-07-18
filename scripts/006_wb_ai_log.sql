-- 006_wb_ai_log.sql — ประวัติการใช้ AI จัดคำ (เก็บทุกอย่าง)
-- เก็บทุกครั้งที่เรียก AI: เจ้าไหน/รุ่นอะไร, ข้อความที่เข้ามา, คำที่แยกได้,
-- คำที่บันทึกจริง, คำที่ข้ามเพราะซ้ำ, token, ค่าใช้จ่ายประมาณ, เวลาที่ใช้, สำเร็จ/พลาด
-- → เอาไว้ดูย้อนหลัง + สรุปยอด token/ค่าใช้จ่าย ว่าเจ้าไหนคุ้ม/จัดดีสุด
-- RLS deny-all เข้าผ่าน service_role (API route) เท่านั้น

create table if not exists wb_ai_log (
  id           uuid primary key default gen_random_uuid(),
  provider     text,                 -- รหัสเจ้า (gemini/claude/gpt/...)
  provider_label text,               -- ชื่อโชว์ (Gemini, Claude, ...)
  model        text,                 -- รหัสรุ่นที่ใช้จริง
  novel        text,                 -- เรื่อง/นิยายของคำชุดนี้
  input_text   text,                 -- ข้อความดิบที่ส่งเข้าไป (เก็บเต็ม)
  input_chars  int default 0,        -- จำนวนตัวอักษรที่เข้า
  item_count   int default 0,        -- จำนวนคำที่ AI แยกออกมา (เข้าหน้าตรวจทาน)
  extracted_count int default 0,     -- ในนั้นเป็นคำที่สกัดจากประโยคกี่คำ
  items_json   jsonb default '[]'::jsonb, -- รายการคำที่แยกได้ (ข้อความล้วน)
  saved_count  int default 0,        -- คำที่กดบันทึกเข้าคลังจริง (เติมทีหลังตอนบันทึก)
  skipped_count int default 0,       -- คำที่ข้ามเพราะซ้ำกับคลัง
  tokens_in    int default 0,        -- token ขาเข้า (ถ้าเจ้านั้นรายงานมา)
  tokens_out   int default 0,        -- token ขาออก
  cost_usd     numeric(12,6) default 0, -- ค่าใช้จ่ายประมาณ (ดอลลาร์) จากราคาต่อ token
  duration_ms  int default 0,        -- เวลาที่ใช้ประมวลผล (มิลลิวินาที)
  status       text default 'success', -- success / error
  error        text,                 -- ข้อความผิดพลาด (ถ้าพลาด)
  created_at   timestamptz default now()
);

create index if not exists wb_ai_log_time_idx on wb_ai_log (created_at desc);

alter table wb_ai_log enable row level security;
-- ไม่สร้าง policy = deny-all (มีแต่ service_role ผ่านได้)
