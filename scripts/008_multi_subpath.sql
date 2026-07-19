-- 008 — คำหนึ่งติดได้หลายหมวดย่อย
-- เหตุผล: วลีหนึ่งอยู่ได้หลายกิ่งจริง ๆ (เช่น "ใจสั่นระริก" = ความรัก และ ความตื่นเต้น)
-- เดิมเก็บได้อันเดียว (subpath text) ต้องเลือกทิ้งอันอื่น
--
-- subpaths = อาร์เรย์เส้นทางหมวดย่อย เช่น ["อารมณ์ / ความรัก", "อารมณ์ / ความตื่นเต้น"]
-- subpath  = คงไว้เป็น "หมวดย่อยหลัก" (= subpaths ตัวแรกเสมอ) เพื่อให้โค้ด/ไฟล์ส่งออกเดิมไม่พัง

alter table wb_words  add column if not exists subpaths jsonb not null default '[]'::jsonb;
alter table wb_review add column if not exists subpaths jsonb not null default '[]'::jsonb;

-- ย้ายข้อมูลเดิม: หมวดย่อยอันเดียวที่มีอยู่ → กลายเป็นสมาชิกตัวแรกของอาร์เรย์
update wb_words
   set subpaths = jsonb_build_array(subpath)
 where coalesce(subpath, '') <> '' and jsonb_array_length(subpaths) = 0;

update wb_review
   set subpaths = jsonb_build_array(subpath)
 where coalesce(subpath, '') <> '' and jsonb_array_length(subpaths) = 0;

-- ค้นคำตามกิ่งได้เร็ว (หน้าคลังคำวนสร้างต้นไม้จากค่านี้)
create index if not exists wb_words_subpaths_idx  on wb_words  using gin (subpaths);
create index if not exists wb_review_subpaths_idx on wb_review using gin (subpaths);
