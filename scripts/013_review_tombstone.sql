-- 013_review_tombstone.sql — ป้าย "ช่อนี้ตั้งใจลบแล้ว" (tombstone / soft-delete marker)
--
-- ปัญหา (บั๊กจริง 23 ก.ค. 2569): "ตาข่ายกันช่อหาย" ตอนเปิดแอปจะดันช่อที่อยู่ในเครื่อง
--   แต่ไม่มีในคลาวด์ กลับขึ้นคลาวด์อัตโนมัติ (กันช่อหายตอนปิดหน้ากลางคัน)
--   → มันแยกไม่ออกว่า "ยังไม่ซิงค์" กับ "ตั้งใจลบจากอีกเครื่อง/แท็บ"
--   → ลบช่อบนเครื่องนึง อีกเครื่อง(ที่ยังมีช่อค้าง)พอเปิดมาก็ดันกลับขึ้นคลาวด์ = ช่อเด้งกลับ วนไม่จบ
--
-- วิธีแก้: จำ "ช่อที่ตั้งใจลบ" ไว้ในตารางนี้ · ตาข่ายเห็นป้ายนี้แล้วจะไม่ฟื้นช่อกลับ + ลบออกจากเครื่องให้ตรงกัน
--   batch = รหัสช่อ (เดียวกับ wb_review.batch) · ลบทีเดียวหลายครั้ง = upsert (idempotent)
--
-- รันครั้งเดียวใน Supabase (dev=prod ตัวเดียวกัน)

create table if not exists public.wb_review_deleted (
  batch      text primary key,
  deleted_at timestamptz not null default now()
);

-- RLS deny-all เหมือนตาราง wb_ อื่น ๆ (มีแต่ service_role ผ่านได้ · เบราว์เซอร์ไม่มีสิทธิ์)
alter table public.wb_review_deleted enable row level security;

comment on table public.wb_review_deleted is 'ป้ายช่อที่ตั้งใจลบ (tombstone) — กันตาข่ายกันช่อหายฟื้นช่อที่ลบไปแล้ว';
