// 🕸 รันระบบโยงอัตโนมัติกับไฟล์คลัง (ยังไม่ขึ้นฐานข้อมูล)
// รัน: node scripts/apply_autolink.mjs          (ดูผลอย่างเดียว)
//      node scripts/apply_autolink.mjs --write  (เขียนจริง)
//
// ใช้ตรรกะตัวเดียวกับระบบโยงอัตโนมัติในเว็บ (lib/wordlink.js) เป๊ะ
// ต่างกันแค่ที่เก็บ — ตัวในเว็บเขียนลงฐานข้อมูล ตัวนี้เขียนลงไฟล์คลัง
// พอคลังขึ้นฐานข้อมูลทีหลัง เส้นพวกนี้จะตามไปพร้อมกันเอง
//
// 🛡 เพิ่มอย่างเดียว ไม่ลบไม่แก้เส้นเดิมสักเส้น
import fs from 'fs';
import { findCooccur, LINK_KIND } from '../lib/wordlink.js';

const WRITE = process.argv.includes('--write');
const DATA = 'wordbank/data/';
const LINKF = DATA + 'word_sources.jsonl';
const R = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const words = R(DATA + 'words.jsonl');
const before = R(LINKF);

const rows = words.map((w) => ({ id: w.id, text: w.text, kind: w.kind }));
const have = new Set(before.map((l) => l.word_id + '|' + String(l.parent_text).trim()));
const found = findCooccur(rows, rows, (cid, pt) => have.has(cid + '|' + pt));

const byId = new Map(words.map((w) => [w.id, w]));
const add = found.map((f) => ({
  word_id: f.child_id,
  word_text: f.child_text,
  parent_text: f.parent_text,
  parent_id: f.parent_id,
  link_kind: LINK_KIND,
}));

// ── ด่านก่อนเขียน ──────────────────────────────────────────────────────
const stop = [];
for (const a of add) {
  const c = byId.get(a.word_id), p = byId.get(a.parent_id);
  if (!c || !p) { stop.push(`เส้นชี้ไปคำที่ไม่มีในคลัง: ${a.word_text}`); continue; }
  if (!p.text.includes(c.text.trim())) stop.push(`คำไม่ได้อยู่ในวลีจริง: ${a.word_text}`);
  if (c.id === p.id) stop.push(`เส้นชี้หาตัวเอง: ${a.word_text}`);
}
const keys = add.map((a) => a.word_id + '|' + a.parent_text);
if (new Set(keys).size !== keys.length) stop.push('เส้นใหม่ซ้ำกันเอง');

if (stop.length) {
  console.error('🔴 ไม่ผ่านด่านตรวจ ไม่แตะไฟล์เลย:');
  stop.slice(0, 15).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

const kindOf = (arr) => arr.reduce((m, l) => ((m[l.link_kind || 'source'] = (m[l.link_kind || 'source'] || 0) + 1), m), {});
console.log('คำในคลัง            ', words.length);
console.log('เส้นเดิม            ', before.length, JSON.stringify(kindOf(before)));
console.log('เส้นใหม่ที่จะเพิ่ม   ', add.length, '(ชนิด ' + LINK_KIND + ' = คำนี้โผล่อยู่ในวลีนี้)');
console.log('รวมหลังเพิ่ม        ', before.length + add.length);

if (!WRITE) {
  console.log('\nตัวอย่าง 6 เส้นแรก:');
  add.slice(0, 6).forEach((a) => console.log(`  "${a.word_text}" ⊂ "${a.parent_text.slice(0, 42)}"`));
  console.log('\n(ดูผลอย่างเดียว · ใส่ --write เพื่อเขียนจริง)');
  process.exit(0);
}

fs.copyFileSync(LINKF, LINKF + '.bak3');
fs.appendFileSync(LINKF, add.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');

// ── ด่านหลังเขียน ──────────────────────────────────────────────────────
const after = R(LINKF);
const bad = [];
if (after.length !== before.length + add.length) bad.push('จำนวนเส้นรวมไม่ตรง');
for (let i = 0; i < before.length; i++) {
  if (JSON.stringify(after[i]) !== JSON.stringify(before[i])) { bad.push(`เส้นเดิมบรรทัด ${i + 1} ถูกแก้`); break; }
}
const wc = R(DATA + 'words.jsonl').length;
if (wc !== words.length) bad.push(`จำนวนคำเปลี่ยน ${words.length} → ${wc}`);

if (bad.length) { console.error('\n🔴 ตรวจหลังเขียนไม่ผ่าน:'); bad.forEach((b) => console.error('  ' + b)); process.exit(1); }

// อัปเดตไฟล์สถิติให้ตรงความจริง
const st = JSON.parse(fs.readFileSync(DATA + '_stats.json', 'utf8'));
st.stats['เส้นเชื่อมไปวลีแม่'] = after.length;
st.stats['คำที่ตัดมาจากวลีแม่'] = new Set(after.filter((l) => (l.link_kind || 'source') === 'source').map((l) => l.word_id)).size;
st.stats['คำที่โผล่ในวลีอื่นด้วย'] = new Set(after.filter((l) => l.link_kind === LINK_KIND).map((l) => l.word_id)).size;
if (st.rows) st.rows.word_sources = after.length;
fs.writeFileSync(DATA + '_stats.json', JSON.stringify(st, null, 1), 'utf8');

console.log(`\n✅ เขียนแล้ว ${add.length} เส้น · รวม ${after.length} เส้น · เส้นเดิมไม่ถูกแตะ · คำเท่าเดิม ${wc} คำ`);
console.log('   สำเนาก่อนแก้เก็บไว้ที่ ' + LINKF + '.bak3');
