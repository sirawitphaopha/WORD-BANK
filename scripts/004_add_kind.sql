-- เพิ่มคอลัมน์ kind ให้ wb_words: ชนิดของคำ = 'word' | 'phrase' | 'sentence'
-- (หมวดย่อย subpath / subcategory มีอยู่แล้วจากสคีมาเดิม)
-- AI แปะชนิดให้ตอนจัดคำ · ผู้ใช้กดเปลี่ยนได้ในหน้าตรวจทาน · ใช้กรองในหน้าคลังคำ
ALTER TABLE wb_words ADD COLUMN IF NOT EXISTS kind text;
