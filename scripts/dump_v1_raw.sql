-- dump_v1_raw.sql — ดึงข้อมูลดิบผลทดสอบ AI "เวอร์ชัน 1" (ช่อ ๖–๑๑ · เทส 19 ก.ค. 2569) ออกมาให้ครบ
--
-- ทำไมต้องมีไฟล์นี้: V1 เก็บดิบไม่ครบเหมือน V2 · ใน lib/aitest.js มีแค่ "สรุปการจัดกลุ่มรายคำ" + คะแนน
--                    ยังขาด ความหมาย/เหตุผล/ประโยคต้นทาง รายคำ (จาก wb_review) และ โทเคน/ราคา/เวลา รายช่อ (จาก wb_ai_log)
-- ▶️ วิธีใช้: เปิด Supabase → SQL Editor → New query → วางทั้งไฟล์นี้ → Run → คัดลอกผล JSON ทั้งก้อนส่งให้แคลร์
--            แคลร์จะเซฟเป็น docs/AI-MODEL-TEST-v1-raw.json ให้ (โครงเดียวกับ v2-raw)
--
-- หมายเหตุสำคัญ:
--  • wb_ai_log (โทเคน/ราคา/เวลา/โมเดล) เป็น "ประวัติ" ไม่ถูกลบตอนล้างช่อ → V1 ส่วนนี้น่าจะยังอยู่ครบ แม้ลบช่อไปแล้ว
--  • wb_review (คำรายตัว + ความหมาย/เหตุผล) = ส่วนที่จะหายถ้าเคยลบช่อ ๖–๑๑ ไปแล้ว → ถ้า v1_review_words ได้ [] ว่าง แปลว่าถูกลบไปแล้ว กู้ไม่ได้
--  • ท้ายผลมี all_batches = รายชื่อทุกช่อที่ยังเหลือใน wb_review ตอนนี้ (ใช้ดูว่าช่อไหนจริง/ช่อไหน junk ที่อยากลบ)
--
-- ⚠️ บทเรียน (21 ก.ค.): คอลัมน์ `batch` เป็น text (id ช่อ) · เลขช่อ ๖–๑๑ อยู่ที่ `batch_no` → กรองด้วย batch_no
--    กันพลาดชนิดข้อมูล ใช้ batch_no::text in (...) (ปลอดภัยไม่ว่าคอลัมน์เป็นเลขหรือตัวหนังสือ)

select json_build_object(
  'all_batches', (
    select coalesce(json_agg(row_to_json(s) order by s.batch_no, s.batch), '[]'::json)
    from (
      select batch, batch_no, batch_ai, novel, count(*) as n
      from wb_review
      group by batch, batch_no, batch_ai, novel
    ) s
  ),
  'v1_review_words', (
    select coalesce(json_agg(row_to_json(w) order by w.batch_no, w.position), '[]'::json)
    from (
      select batch, batch_no, batch_ai, batch_at, novel, position,
             text, original, kind, category_id, subpath, subpaths,
             source, meaning, reason, proposed_new, notes
      from wb_review
      where batch_no::text in ('6','7','8','9','10','11')
    ) w
  ),
  'v1_ai_log', (
    select coalesce(json_agg(row_to_json(l) order by l.created_at), '[]'::json)
    from (
      select created_at, provider, provider_label, model, status,
             tokens_in, tokens_out, cost_usd, duration_ms,
             input_chars, item_count, extracted_count, saved_count, skipped_count, error
      from wb_ai_log
      where created_at >= '2026-07-19' and created_at < '2026-07-20'
    ) l
  )
) as v1_dump;
