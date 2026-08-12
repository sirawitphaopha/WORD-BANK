// เก็บกวาดเส้นโยง "คำ ↔ วลีแม่" ที่เสียอยู่ในคลัง
// รัน: node scripts/clean_wordlink.mjs          (ดูผลอย่างเดียว)
//      node scripts/clean_wordlink.mjs --write  (ลบจริง)
// เครื่องนี้ไม่มี Python จึงเขียนด้วย Node
//
// ลบ 2 กรณีเท่านั้น — เจ้าของคลังสั่งเอง 12 ส.ค. 2569 _"10 เส้นนั้น เอาออกสิ มันก็เห็นอยู่ตรงหน้าว่าคนละคำ"_
//   1. เส้นลอย — ชี้ไปหาคำหรือวลีที่ไม่มีในคลังแล้ว (วลีแม่ถูกลบไปตั้งแต่ 3 ส.ค. แต่เส้นค้าง)
//   2. คำไม่ได้อยู่ในวลีนั้นจริง (เช่น "ขี้ริ้วขี้เหร่" โยงไปหา "คนขี้ริ้ว" ซึ่งกลับด้านกัน)
// 🛡 นอกจาก 2 กรณีนี้ ห้ามแตะเส้นอื่นเด็ดขาด
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const DATA = 'wordbank/data/';
const LINKF = DATA + 'word_sources.jsonl';
const R = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const links = R(LINKF);
const words = R(DATA + 'words.jsonl');
const ids = new Set(words.map((w) => w.id));

const isBroken = (l) => {
  if (!ids.has(l.word_id) || !ids.has(l.parent_id)) return 'วลีแม่หรือคำถูกลบไปแล้ว';
  if (l.parent_text && l.word_text && !l.parent_text.includes(l.word_text.trim())) return 'คำไม่ได้อยู่ในวลีนั้นจริง';
  return null;
};

const drop = [], keep = [];
for (const l of links) { const r = isBroken(l); if (r) drop.push({ l, r }); else keep.push(l); }

console.log('เส้นทั้งหมดตอนนี้', links.length);
console.log('จะลบ', drop.length, 'เส้น · เหลือ', keep.length, 'เส้น\n');
drop.forEach((d, i) => console.log(`${i + 1}. "${d.l.word_text}" → "${String(d.l.parent_text).slice(0, 34)}"\n   เหตุ: ${d.r}`));

if (!WRITE) { console.log('\n(ดูผลอย่างเดียว · ใส่ --write เพื่อลบจริง)'); process.exit(0); }

fs.copyFileSync(LINKF, LINKF + '.bak2');
fs.writeFileSync(LINKF, keep.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');

// ── ด่านหลังลบ ─────────────────────────────────────────────────────────
const after = R(LINKF);
const bad = [];
if (after.length !== keep.length) bad.push('จำนวนเส้นไม่ตรง');
for (let i = 0; i < keep.length; i++) if (JSON.stringify(after[i]) !== JSON.stringify(keep[i])) { bad.push(`เส้นที่เก็บไว้บรรทัด ${i + 1} เพี้ยน`); break; }
if (after.some((l) => isBroken(l))) bad.push('ยังมีเส้นเสียเหลืออยู่');
const wc = R(DATA + 'words.jsonl').length;
if (wc !== words.length) bad.push(`จำนวนคำเปลี่ยน ${words.length} → ${wc}`);

if (bad.length) { console.error('\n🔴 ตรวจหลังลบไม่ผ่าน:'); bad.forEach((b) => console.error('  ' + b)); process.exit(1); }
console.log(`\n✅ ลบแล้ว ${drop.length} เส้น · เหลือ ${after.length} เส้น · จำนวนคำเท่าเดิม ${wc} คำ`);
console.log('   สำเนาก่อนลบเก็บไว้ที่ ' + LINKF + '.bak2');
