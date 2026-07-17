// สร้างไฟล์ 002_seed.sql จากข้อมูลกลางใน lib/data.js
// รัน: node scripts/gen_seed.mjs > scripts/002_seed.sql
import { DEF_CATS, NOVELS, SUBTAX, parseSeed } from '../lib/data.js';

const esc = (s) => (s == null ? '' : String(s)).replace(/'/g, "''");
const out = [];

out.push('-- ข้อมูลตั้งต้นคลังคำ (สร้างอัตโนมัติจาก lib/data.js — อย่าแก้มือ)');
out.push('-- ล้างของเดิมก่อน (idempotent) เฉพาะตาราง wb_');
out.push('truncate wb_words, wb_subcategories, wb_novels, wb_categories restart identity cascade;');
out.push('');

// หมวดหมู่
out.push('insert into wb_categories (id, name_th, name_en, color, glyph, position, proposed) values');
out.push(DEF_CATS.map((c, i) =>
  `  ('${esc(c.id)}','${esc(c.name_th)}','${esc(c.name_en)}','${esc(c.color)}','${esc(c.glyph)}',${i},false)`
).join(',\n') + ';');
out.push('');

// เรื่อง/นิยาย
out.push('insert into wb_novels (title) values');
out.push(NOVELS.map((n) => `  ('${esc(n)}')`).join(',\n') + ';');
out.push('');

// หมวดย่อย (taxonomy อ้างอิง)
const subRows = [];
Object.keys(SUBTAX).forEach((cid) => {
  SUBTAX[cid].split('|').forEach((seg, i) => {
    const name = seg.split('::')[0];
    subRows.push(`  ('${esc(cid)}','${esc(name)}',${i})`);
  });
});
out.push('insert into wb_subcategories (category_id, name_th, position) values');
out.push(subRows.join(',\n') + ';');
out.push('');

// คำ ~200 คำ (created_at เหลื่อมกันให้เรียงลำดับมีความหลากหลาย)
const words = parseSeed();
out.push('insert into wb_words (text, meaning, category_id, novel, reviewed, created_at) values');
out.push(words.map((w, i) => {
  const offset = (i * 13) % 210;
  const meaning = w.meaning ? `'${esc(w.meaning)}'` : 'null';
  return `  ('${esc(w.text)}',${meaning},'${esc(w.category_id)}','${esc(w.novel)}',true, now() - interval '${offset} days')`;
}).join(',\n') + ';');
out.push('');

console.log(out.join('\n'));
