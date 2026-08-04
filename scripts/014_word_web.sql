-- ============================================================
-- 014 · ระบบใยแมงมุม — ตารางเส้นเชื่อมของคลังคำ
--
-- 🎯 แก้ปัญหาที่เจ้าของคลังจับได้เอง 31 ก.ค. 2569
--    _"มันซ้ำแค่วลี แต่ทั้งชื่อนิยายก็ไม่ซ้ำนะ และอาจจะไปหมวดใหม่ได้"_
--
--    โครงเดิมเก็บ "ความเกี่ยวข้อง" เป็นข้อความก๊อปไว้ในตัวคำเอง ไม่ใช่เส้นเชื่อมที่มีตัวตน
--    ผลคือ 3 อย่างนี้ทำไม่ได้เลย
--      · คำเดียวติดกิ่งข้ามหมวด   (category_id เป็นคอลัมน์เดี่ยว)  → คลังมี 1,591 คำ
--      · คำเดียวเจอหลายนิยาย      (novel เป็นคอลัมน์เดี่ยว)         → คลังมี 137 คำ
--      · จำได้ว่าคำนี้ตัดมาจากวลีไหน (ไม่มีคอลัมน์ source เลย)      → คลังมี 1,170 เส้น
--
-- 🔑 หลักคิด: "ไม่มีคำว่าข้าม มีแต่สร้างใหม่กับเพิ่มเส้น"
--    คำซ้ำไม่ใช่ของเสีย แต่คือคำเดียวกันที่เจอในบริบทใหม่
--    เจอซ้ำ = เพิ่มเส้นที่ยังไม่มี ไม่ใช่ทิ้ง และไม่ใช่สร้างแถวใหม่
--
-- 🛡 ไฟล์นี้ **ไม่ลบ ไม่แก้ ไม่ย้ายข้อมูลเดิมสักแถว** — สร้างของใหม่อย่างเดียว
--    รันซ้ำกี่ครั้งก็ได้ ผลเหมือนเดิม (idempotent)
--    คอลัมน์เดิมใน wb_words ยังอยู่ครบและยังใช้ได้เหมือนเดิม → หน้าเว็บทุกหน้าไม่พัง
--
-- แบบเต็มอยู่ที่ docs/word-dedup-design.md
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- ส่วน ก · เติมช่องที่ขาดในตารางเดิม
-- ────────────────────────────────────────────────────────────

-- 🔴 บั๊กเดิม: หน้าตรวจทานเก็บ "คำนี้ตัดมาจากประโยคไหน" ไว้ใน wb_review.source
--    แต่ตอนกดบันทึกเข้าคลัง ข้อมูลนี้หายทุกครั้ง เพราะ wb_words ไม่มีคอลัมน์รองรับ
alter table wb_words add column if not exists source text;

-- รหัสประจำคำจากไฟล์ (wordbank/data/words.jsonl) — คำนวณจากตัวข้อความล้วน
-- มีไว้ให้ตอนนำเข้าจับคู่แถวได้โดยไม่ต้องเทียบข้อความยาว ๆ ทีละครั้ง
alter table wb_words add column if not exists ext_id text;
create unique index if not exists wb_words_ext_id_idx
  on wb_words (ext_id) where ext_id is not null;

-- ทะเบียนกิ่งยังไม่มีช่องเก็บ "รหัสกิ่งถาวร" ชื่ออังกฤษ และนิยาม
-- ทั้งสามอย่างมีอยู่แล้วในไฟล์ wordbank/data/branches.jsonl
-- 🔒 รหัสกิ่งผูกกับเส้นทางภาษาไทย ห้ามเลื่อนเด็ดขาด
alter table wb_branches add column if not exists code       text;
alter table wb_branches add column if not exists name_en    text;
alter table wb_branches add column if not exists definition text;
create unique index if not exists wb_branches_code_idx
  on wb_branches (code) where code is not null;


-- ────────────────────────────────────────────────────────────
-- ส่วน ข · ตารางเส้นเชื่อม 4 ตัว
-- ────────────────────────────────────────────────────────────

-- ① คำ ↔ กิ่ง — 1 แถว = คำ 1 คำ ติดกิ่ง 1 กิ่ง
-- 🔑 category_id อยู่ที่ "เส้น" ไม่ใช่ที่ "คำ" → คำเดียวข้ามหมวดได้จริง
create table if not exists wb_word_branches (
  id           bigserial primary key,
  word_id      uuid not null references wb_words(id) on delete cascade,
  branch_code  text not null,                      -- รหัสกิ่งถาวร เช่น A01-00-000
  category_id  text not null references wb_categories(id),
  path         text not null,                      -- เส้นทางเต็ม คั่นด้วย " / "
  is_home      boolean not null default false,     -- true = หมวดบ้านหลัก (ต้องมีคำละ 1 เส้น)
  source       text not null default 'import',     -- import · user · ai · review
  added_at     timestamptz not null default now(),
  unique (word_id, branch_code)
);
create index if not exists wb_word_branches_word_idx   on wb_word_branches (word_id);
create index if not exists wb_word_branches_branch_idx on wb_word_branches (branch_code);
create index if not exists wb_word_branches_cat_idx    on wb_word_branches (category_id);


-- ② คำ ↔ นิยาย — 1 แถว = คำ 1 คำ เจอในเรื่อง 1 เรื่อง
-- คำซ้ำข้ามเล่ม 137 คำ อยู่แถวเดียวแต่มีเส้นนี้ 2 เส้น (โยง ไม่ใช่ลบ)
create table if not exists wb_word_novels (
  id            bigserial primary key,
  word_id       uuid not null references wb_words(id) on delete cascade,
  novel         text not null,
  first_seen_at timestamptz not null default now(),
  unique (word_id, novel)
);
create index if not exists wb_word_novels_word_idx  on wb_word_novels (word_id);
create index if not exists wb_word_novels_novel_idx on wb_word_novels (novel);


-- ③ คำลูก ↔ วลีแม่ — 1 แถว = คำลูก 1 คำ ตัดมาจากวลีแม่ 1 วลี
-- 🔑 ผูกด้วยรหัสแถว ไม่ใช่ข้อความ · ไม่มีเส้นเลย = "เก็บมาเอง ไม่ได้ตัดจากไหน"
-- คำเดียวตัดมาจากหลายวลีได้ (คลังมี 52 คำแบบนี้) = หลายเส้น ไม่ใช่หลายแถว
create table if not exists wb_word_links (
  id              bigserial primary key,
  child_word_id   uuid not null references wb_words(id) on delete cascade,
  parent_word_id  uuid references wb_words(id) on delete set null,
  parent_text     text not null,                   -- เก็บข้อความไว้ด้วย เผื่อวลีแม่ยังไม่อยู่ในคลัง
  link_kind       text not null default 'source',  -- source = ตัดมาตอนเก็บ · picked_from = เส้นเชื่อมย้อนหลัง
  added_at        timestamptz not null default now(),
  unique (child_word_id, parent_text, link_kind)
);
create index if not exists wb_word_links_child_idx  on wb_word_links (child_word_id);
create index if not exists wb_word_links_parent_idx on wb_word_links (parent_word_id);


-- ④ ความหมาย — 1 แถว = 1 ความหมายของคำนั้น
-- 🔑 เป็นตารางแยก ไม่ใช่ช่องเดียวในคำ → เพิ่มความหมายใหม่ได้โดยไม่ทับของเดิม
-- คำที่ตีความได้หลายทางเก็บได้ครบทุกทาง (คลังมี 3,519 ช่องจาก 2,809 คำ)
create table if not exists wb_word_meanings (
  id        bigserial primary key,
  word_id   uuid not null references wb_words(id) on delete cascade,
  position  int not null default 0,                -- ลำดับความหมาย เริ่มที่ 0
  meaning   text not null,
  added_at  timestamptz not null default now(),
  unique (word_id, meaning)
);
create index if not exists wb_word_meanings_word_idx on wb_word_meanings (word_id);


-- ────────────────────────────────────────────────────────────
-- ส่วน ค · RLS ปิดตายทุกตาราง (เหมือนตารางอื่นทั้งหมด)
--          เข้าถึงได้เฉพาะ service_role ผ่าน API route ฝั่งเซิร์ฟเวอร์
-- ────────────────────────────────────────────────────────────
alter table wb_word_branches enable row level security;
alter table wb_word_novels   enable row level security;
alter table wb_word_links    enable row level security;
alter table wb_word_meanings enable row level security;

drop policy if exists wb_word_branches_deny_all on wb_word_branches;
drop policy if exists wb_word_novels_deny_all   on wb_word_novels;
drop policy if exists wb_word_links_deny_all    on wb_word_links;
drop policy if exists wb_word_meanings_deny_all on wb_word_meanings;

create policy wb_word_branches_deny_all on wb_word_branches for all using (false) with check (false);
create policy wb_word_novels_deny_all   on wb_word_novels   for all using (false) with check (false);
create policy wb_word_links_deny_all    on wb_word_links    for all using (false) with check (false);
create policy wb_word_meanings_deny_all on wb_word_meanings for all using (false) with check (false);


-- ────────────────────────────────────────────────────────────
-- ส่วน ง · มุมมองสรุป — ไว้เช็คว่าข้อมูลเข้าครบไหม
--          (ไม่ใช่ตาราง ไม่กินที่ · ลบทิ้งได้ตลอด)
-- ────────────────────────────────────────────────────────────
create or replace view wb_word_web as
select
  w.id,
  w.text,
  w.kind,
  (select count(*) from wb_word_branches b where b.word_id = w.id) as branch_count,
  (select count(distinct b.category_id) from wb_word_branches b where b.word_id = w.id) as category_count,
  (select count(*) from wb_word_novels  n where n.word_id = w.id) as novel_count,
  (select count(*) from wb_word_links   l where l.child_word_id = w.id) as parent_count,
  (select count(*) from wb_word_meanings m where m.word_id = w.id) as meaning_count
from wb_words w;


-- ────────────────────────────────────────────────────────────
-- ✅ เช็คว่ารันผ่านไหม — คัดลอกไปรันต่อได้เลย
-- ────────────────────────────────────────────────────────────
-- select table_name from information_schema.tables
--  where table_name in ('wb_word_branches','wb_word_novels','wb_word_links','wb_word_meanings')
--  order by table_name;
--   → ต้องได้ 4 แถว
--
-- select column_name from information_schema.columns
--  where table_name = 'wb_words' and column_name in ('source','ext_id');
--   → ต้องได้ 2 แถว
--
-- select column_name from information_schema.columns
--  where table_name = 'wb_branches' and column_name in ('code','name_en','definition');
--   → ต้องได้ 3 แถว
