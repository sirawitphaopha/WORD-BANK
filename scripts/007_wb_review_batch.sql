-- 007 — ระบบ "ช่อคำ" ในห้องพักตรวจทาน (wb_review)
-- ทุกครั้งที่กดจัดคำ = สร้างช่อใหม่ ต่อท้ายของเดิม (ไม่ทับ) → คำที่ยังไม่บันทึกไม่มีทางหาย
-- หน้าตรวจทานเลือกดูทีละช่อ (แท็บ) จะได้ไม่ต้องเรนเดอร์การ์ดทุกช่อพร้อมกัน
--
-- batch     = รหัสช่อ (เช่น b_1721...)  ใช้จัดกลุ่มและเลือกแท็บ
-- batch_no  = ลำดับช่อที่โชว์บนแท็บ (ช่อที่ ๑, ๒, ๓ ...)
-- batch_at  = เวลาที่จัดคำช่อนั้น (มิลลิวินาที) ไว้โชว์เวลาบนหัวช่อ
-- batch_ai  = เจ้า/รุ่น AI ที่จัดช่อนั้น (เช่น "GPT · GPT-5.1") ไว้เทียบผลข้ามช่อ
-- novel     = มีอยู่แล้ว แต่จากนี้เก็บ "รายคำ" (แต่ละช่ออาจคนละเรื่องกัน)

alter table wb_review add column if not exists batch     text;
alter table wb_review add column if not exists batch_no  integer;
alter table wb_review add column if not exists batch_at  bigint;
alter table wb_review add column if not exists batch_ai  text;

-- คำที่ค้างอยู่ก่อนมีระบบช่อ → ยกทั้งหมดเป็นช่อที่ 1
update wb_review
   set batch    = coalesce(batch, 'b_legacy'),
       batch_no = coalesce(batch_no, 1)
 where batch is null or batch_no is null;

create index if not exists wb_review_batch_idx on wb_review (batch);
