// โยงเส้น "คำเดี่ยว ← ตัดมาจาก → วลีแม่" ลงไฟล์คลังจริง
// รัน: node scripts/apply_wordlink.mjs          (ดูผลอย่างเดียว ไม่เขียน)
//      node scripts/apply_wordlink.mjs --write  (เขียนจริง)
// เครื่องนี้ไม่มี Python จึงเขียนด้วย Node
//
// 🛡 หลักการ: เพิ่มเส้นอย่างเดียว ห้ามลบ ห้ามแก้เส้นเดิมสักเส้น
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const DATA = 'wordbank/data/';
const LINKF = DATA + 'word_sources.jsonl';

const readJSONL = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const pairs = JSON.parse(fs.readFileSync('docs/wordlink/pairs.json', 'utf8'));
const P = new Map(pairs.map((p, i) => [i + 1, p]));
const ans = [
  ...readJSONL('docs/wordlink/out-1.jsonl'),
  ...readJSONL('docs/wordlink/out-2.jsonl'),
].sort((a, b) => a.n - b.n);

const words = readJSONL(DATA + 'words.jsonl');
const byId = new Map(words.map((w) => [w.id, w]));
const linksBefore = readJSONL(LINKF);

// ── ด่านก่อนแตะอะไร ────────────────────────────────────────────────────
const stop = [];
if (ans.length !== pairs.length) stop.push(`คำตอบ ${ans.length} ไม่เท่าโจทย์ ${pairs.length}`);
for (let i = 1; i <= pairs.length; i++) if (!ans.find((a) => a.n === i)) stop.push(`ขาดข้อ ${i}`);

const take = ans.filter((a) => a.verdict === 'ตัดมา');
const seen = new Set(linksBefore.map((l) => l.word_id + '|' + l.parent_id));
const add = [];
for (const a of take) {
  const p = P.get(a.n);
  const w = byId.get(p.word_id), m = byId.get(p.phrase_id);
  if (!w) { stop.push(`ข้อ ${a.n}: ไม่พบรหัสคำในคลัง`); continue; }
  if (!m) { stop.push(`ข้อ ${a.n}: ไม่พบรหัสวลีในคลัง`); continue; }
  if (w.text.trim() !== p.word) stop.push(`ข้อ ${a.n}: ตัวคำในคลังไม่ตรงกับโจทย์`);
  if (m.text !== p.phrase) stop.push(`ข้อ ${a.n}: ตัววลีในคลังไม่ตรงกับโจทย์`);
  if (!m.text.includes(w.text.trim())) stop.push(`ข้อ ${a.n}: คำไม่ได้อยู่ในวลีจริง`);
  const key = w.id + '|' + m.id;
  if (seen.has(key)) continue;      // มีเส้นอยู่แล้ว ไม่เพิ่มซ้ำ
  seen.add(key);
  add.push({ word_id: w.id, word_text: w.text, parent_text: m.text, parent_id: m.id, link_kind: 'source' });
}

if (stop.length) {
  console.error('🔴 ไม่ผ่านด่านตรวจ ไม่แตะไฟล์เลย:');
  stop.slice(0, 20).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

console.log('คำตอบทั้งหมด        ', ans.length);
console.log('  ตัดมา (จะโยง)     ', take.length);
console.log('  เก็บแยก (ไม่โยง)  ', ans.filter((a) => a.verdict === 'เก็บแยก').length);
console.log('  ไม่เกี่ยวกัน (ห้ามโยง)', ans.filter((a) => a.verdict === 'ไม่เกี่ยวกัน').length);
console.log('เส้นเดิมในคลัง       ', linksBefore.length);
console.log('เส้นใหม่ที่จะเพิ่ม    ', add.length);
console.log('รวมหลังเพิ่ม         ', linksBefore.length + add.length);

if (!WRITE) { console.log('\n(ดูผลอย่างเดียว · ใส่ --write เพื่อเขียนจริง)'); process.exit(0); }

// ── เขียน · ต่อท้ายอย่างเดียว ──────────────────────────────────────────
fs.copyFileSync(LINKF, LINKF + '.bak');
fs.appendFileSync(LINKF, add.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');

// ── ด่านหลังเขียน ──────────────────────────────────────────────────────
const after = readJSONL(LINKF);
const bad = [];
if (after.length !== linksBefore.length + add.length) bad.push('จำนวนเส้นรวมไม่ตรง');
for (let i = 0; i < linksBefore.length; i++) {
  if (JSON.stringify(after[i]) !== JSON.stringify(linksBefore[i])) { bad.push(`เส้นเดิมบรรทัด ${i + 1} ถูกแก้`); break; }
}
// เส้นซ้ำ: คลังมีของเดิมซ้ำอยู่แล้ว 13 เส้นก่อนเริ่มงานนี้
// จึงตรวจว่า "ซ้ำไม่เพิ่มขึ้น" แทนที่จะตรวจว่าไม่มีซ้ำเลย
const dupOf = (arr) => { const k = arr.map((l) => l.word_id + '|' + l.parent_id); return k.length - new Set(k).size; };
const dupBefore = dupOf(linksBefore), dupAfter = dupOf(after);
if (dupAfter > dupBefore) bad.push(`เส้นซ้ำเพิ่มขึ้น ${dupBefore} → ${dupAfter}`);
else console.log(`   เส้นซ้ำที่มีอยู่เดิม ${dupBefore} เส้น · หลังเพิ่มยังเท่าเดิม ${dupAfter} เส้น (ไม่ได้เกิดจากงานนี้)`);
const wc = readJSONL(DATA + 'words.jsonl').length;
if (wc !== words.length) bad.push(`จำนวนคำเปลี่ยน ${words.length} → ${wc}`);

if (bad.length) { console.error('🔴 ตรวจหลังเขียนไม่ผ่าน:'); bad.forEach((b) => console.error('  ' + b)); process.exit(1); }

console.log('\n✅ เขียนแล้ว · เส้นเดิมไม่ถูกแตะสักเส้น · จำนวนคำเท่าเดิม ' + wc + ' คำ');
console.log('   สำเนาก่อนแก้เก็บไว้ที่ ' + LINKF + '.bak');
