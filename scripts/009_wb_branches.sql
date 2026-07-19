-- ตาราง wb_branches — ทะเบียนชื่อกิ่งหมวดย่อยทั้งหมด
--
-- 🎯 ปัญหาที่แก้: ตอนนี้ชื่อกิ่งกระจายอยู่ 2 ที่ที่ไม่ตรงกัน
--    (1) lib/subtree.js  = โครงตั้งต้นที่แปลงมาจากไฟล์ .docx ของผู้ใช้ (อยู่ในโค้ด ฐานข้อมูลมองไม่เห็น)
--    (2) wb_words.subpath = กิ่งที่มีคำอยู่จริง
--    ผลคือ query ฐานข้อมูลได้ตัวเลข "กิ่งใหม่" ไม่ตรงกับที่หน้าเว็บแสดง (เคยพลาดจริง 19 ก.ค. 2569
--    query บอกว่าช่อ ๗-๘ มีกิ่งใหม่ 3 กิ่ง แต่หน้าเว็บแสดง 0 เพราะเว็บนับ subtree.js ด้วย)
--    และกิ่งที่ยังไม่มีคำอยู่เลย จะหายไปจากสายตา AI ทันที ทำให้ AI ประดิษฐ์กิ่งซ้ำความหมายขึ้นมาใหม่
--
-- ✅ หลังมีตารางนี้: ชื่อกิ่งอยู่ที่เดียว ตรวจสอบด้วย query ได้ตรงกับหน้าเว็บ
--    และ AI เห็นกิ่งครบทุกกิ่งรวมกิ่งที่ยังว่างอยู่

create table if not exists wb_branches (
  id           bigserial primary key,
  category_id  text not null,
  path         text not null,                       -- เส้นทางเต็ม คั่นด้วย " / " เช่น "การขยับแขนและมือ / สัมผัสและหยิบจับ"
  source       text not null default 'user',        -- seed = มาจากโครงตั้งต้น · user = ผู้ใช้สร้างเอง · ai = AI เสนอแล้วผู้ใช้รับ
  created_at   timestamptz not null default now(),
  unique (category_id, path)
);

create index if not exists wb_branches_cat_idx on wb_branches (category_id);

-- RLS ปิดตายเหมือนตารางอื่น เข้าถึงได้เฉพาะ service_role ผ่าน API route ฝั่งเซิร์ฟเวอร์
alter table wb_branches enable row level security;
drop policy if exists wb_branches_deny_all on wb_branches;
create policy wb_branches_deny_all on wb_branches for all using (false) with check (false);

-- เติมกิ่งที่มีคำอยู่จริงในคลังเข้าไปก่อน (ทั้ง subpath เดี่ยวและ subpaths หลายกิ่ง)
-- ส่วนโครงตั้งต้นจาก subtree.js เติมด้วยสคริปต์ scripts/seed_branches.mjs เพราะอยู่ในโค้ด ไม่ใช่ในฐานข้อมูล
insert into wb_branches (category_id, path, source)
select distinct w.category_id, trim(p.path), 'user'
from wb_words w
cross join lateral (
  select w.subpath as path
  union all
  select jsonb_array_elements_text(coalesce(w.subpaths, '[]'::jsonb))
) p
where w.category_id is not null
  and coalesce(trim(p.path), '') <> ''
on conflict (category_id, path) do nothing;
