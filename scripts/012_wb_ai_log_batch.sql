-- 012 — ผูก "ช่อ (batch)" เข้ากับ log การใช้ AI + เก็บสถิติช่อถาวร (idea O)
-- แนวคิด: 1 ช่อ = 1 การเรียก AI = 1 แถว wb_ai_log อยู่แล้ว → เติมคอลัมน์ให้ wb_ai_log
--         กลายเป็น "log ช่อ" ถาวร (ไม่หายแม้คำย้ายเข้าคลัง) สำหรับหน้า "ประวัติ & สถิติ"
--
-- batch_code        = รหัสช่อ (= wb_review.batch เช่น b_1721...) ผูก log กับช่อในตรวจทาน
-- batch_no          = เลขช่อที่โชว์ (ช่อที่ ๑, ๒, ๓ ...) เหมือน wb_review.batch_no
-- typed_count       = จำนวนวลี/คำที่ "พิมพ์เข้า" (นับบรรทัดที่มีข้อความในกล่องวางคำ)
-- restored_count    = จำนวนคำที่ "ตาข่ายกันคำหาย" เติมกลับให้ (AI ตัดทิ้ง)
-- new_branch_count  = จำนวน "กิ่งใหม่" ที่ AI สร้าง (ยังไม่มีในคลัง) — คำนวณฝั่งเว็บด้วย knownPaths
--                     (ให้ตรงกับตัวเลขบนหน้าเว็บเป๊ะ · ห้ามคำนวณจาก server เพราะคนละมาตรฐาน)
--
-- ▶️ รันครั้งเดียวใน Supabase → SQL Editor (คลาวด์รันไม่ได้ พี่กันรันเอง · รันจากมือถือได้)
-- ก่อนรัน: คอลัมน์ยังไม่มี → การอัปเดตสถิติช่อ (action batchStats) จะ fail เงียบ ไม่กระทบ log หลัก
-- หลังรัน: ช่อใหม่ทุกช่อจะเริ่มบันทึกสถิติครบ (ช่อเก่าก่อนหน้าไม่มีข้อมูลย้อนหลัง แสดง "—")

alter table wb_ai_log add column if not exists batch_code       text;
alter table wb_ai_log add column if not exists batch_no         integer;
alter table wb_ai_log add column if not exists typed_count       integer;
alter table wb_ai_log add column if not exists restored_count    integer;
alter table wb_ai_log add column if not exists new_branch_count  integer;

create index if not exists wb_ai_log_batch_code_idx on wb_ai_log (batch_code);
