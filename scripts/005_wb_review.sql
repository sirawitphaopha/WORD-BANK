-- 005_wb_review.sql — ตาราง "ห้องพักคำก่อนตรวจทาน" (คลาวด์)
-- คำที่ AI แยกเสร็จแล้วแต่ยังไม่กดบันทึกเข้าคลัง เก็บที่นี่
-- → เปิดหน้าตรวจทานเครื่องไหนก็เห็นคำที่ค้าง ไม่หายตอนรีเฟรช/เปลี่ยนเครื่อง
-- แยกจาก wb_words (คลังจริง) · กดบันทึกเข้าคลัง = ย้ายจากที่นี่ไป wb_words แล้วลบทิ้ง
-- RLS deny-all เหมือนตารางอื่น เข้าได้ผ่าน service_role (API route) เท่านั้น

create table if not exists wb_review (
  id            text primary key,           -- ใช้ id ที่ฝั่งเว็บสร้าง (r_xxx) เพื่อ sync ตรงกัน
  text          text not null,
  original      text,                        -- ข้อความเดิมก่อนแก้สะกด (ถ้ามี)
  meaning       text,
  kind          text,                        -- word / phrase / sentence
  category_id   text,
  subpath       text,                        -- เส้นทางหมวดย่อย คั่นด้วย " / "
  source        text,                        -- ประโยคต้นทางที่คำนี้ถูกสกัดออกมา (null = พิมพ์เอง/ประโยคเต็ม)
  proposed_new  boolean default false,       -- อยู่ในหมวดที่ AI เพิ่งเสนอใหม่
  notes         jsonb default '[]'::jsonb,   -- โน้ตของ AI เช่น "แก้สะกด: ... → ..."
  novel         text,                        -- เรื่อง/นิยายที่คำชุดนี้มาจาก
  position      int default 0,               -- ลำดับการแสดง
  created_at    timestamptz default now()
);

create index if not exists wb_review_pos_idx on wb_review (position, created_at);

alter table wb_review enable row level security;
-- ไม่สร้าง policy ใดๆ = deny-all (มีแต่ service_role ที่ข้ามได้)
