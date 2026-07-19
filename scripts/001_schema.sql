-- ============================================================
-- คลังคำ (Word Bank) — โครงฐานข้อมูล
-- ฝากในโปรเจกต์ Supabase: tb-calculator (ryewggkhunpuipgkgbfv)
-- ตารางทุกตัวขึ้นต้นด้วย wb_ เพื่อไม่ให้ปนกับแอปอื่นในโปรเจกต์เดียวกัน
-- ไม่มีระบบล็อกอิน → เข้าถึงผ่าน service_role ฝั่งเซิร์ฟเวอร์เท่านั้น
-- RLS เปิดแบบ deny-all (ไม่มี policy) → anon key อ่าน/เขียนอะไรไม่ได้เลย
-- ============================================================

-- หมวดหมู่ (id เป็น text เช่น c0..c8 หรือหมวดที่ผู้ใช้เพิ่มเอง)
create table if not exists wb_categories (
  id text primary key,
  name_th text not null,
  name_en text,
  color text,
  glyph text,
  position int default 0,
  proposed boolean default false,
  created_at timestamptz default now()
);

-- รายชื่อเรื่อง/นิยาย (ไว้เติมช่องเลือกเรื่อง)
create table if not exists wb_novels (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  created_at timestamptz default now()
);

-- คำ/วลี/ประโยคที่เก็บ (novel เก็บเป็นชื่อเรื่องตรงๆ ให้ตรงกับต้นแบบ)
create table if not exists wb_words (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  original_text text,
  meaning text,
  category_id text references wb_categories(id) on delete set null,
  -- หมวดย่อยของคำ — เดิม 3 ช่องนี้ถูกเพิ่มเข้าฐานข้อมูลด้วยมือตอนนำเข้าคำจาก .docx ครั้งแรก (17 ก.ค. 2569)
  --  แต่ลืมเขียนกำกับในสคีมา ทำให้รันสคริปต์ไล่ลำดับ 001→010 บนฐานเปล่าแล้วพังที่ 003 — ยกมาไว้ที่นี่ให้ครบ
  subcategory text,             -- หมวดย่อยหลัก = ชั้นบนสุดของ subpath
  subpath text,                 -- เส้นทางหมวดย่อยเต็ม คั่นด้วย " / " (ลึกได้ 3 ชั้น)
  highlight text,               -- คำเน้นที่เดิมอยู่ในวงเล็บ (เก็บไว้เผื่อทำระบบไฮไลต์)
  novel text,
  reviewed boolean default true,
  created_at timestamptz default now()
);
create index if not exists wb_words_text_idx on wb_words(text);
create index if not exists wb_words_category_idx on wb_words(category_id);

-- หมวดย่อย (taxonomy อ้างอิง — แอปคำนวณหมวดย่อยจากโค้ดด้วย เก็บไว้เผื่ออนาคต)
create table if not exists wb_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id text references wb_categories(id) on delete cascade,
  name_th text not null,
  position int default 0
);

-- เปิด RLS ทุกตาราง แบบ deny-all (ไม่มี policy = anon เข้าไม่ได้ / service_role ผ่านได้)
alter table wb_categories enable row level security;
alter table wb_novels enable row level security;
alter table wb_words enable row level security;
alter table wb_subcategories enable row level security;
