// เติมกิ่งจากโครงตั้งต้น (lib/subtree.js) เข้าตาราง wb_branches
//
// ▶️ วิธีใช้:  node scripts/seed_branches.mjs        (ดูอย่างเดียว ไม่เขียน)
//            node scripts/seed_branches.mjs --write  (เขียนจริง)
//
// 🎯 ทำไมต้องมีสคริปต์แยก: โครงตั้งต้นอยู่ในโค้ด (แปลงมาจากไฟล์ .docx ของผู้ใช้ตอนตั้งระบบ)
//    ฐานข้อมูลมองไม่เห็น จึงต้องยกมาเติมด้วยสคริปต์ ทำครั้งเดียวหลังรัน scripts/009_wb_branches.sql
//    รันซ้ำได้ปลอดภัย (ใช้ on conflict do nothing)

import fs from 'node:fs';
import path from 'node:path';
import { SUBTREE } from '../lib/subtree.js';

const WRITE = process.argv.includes('--write');

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const URL_ = env.SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error('ไม่พบกุญแจ Supabase ใน .env.local');

// แผ่ต้นไม้เป็นเส้นทางเต็มทุกชั้น (ชั้นแรก + ชั้นลูก + ชั้นหลาน)
const rows = [];
const walk = (cid, nodes, prefix) => (nodes || []).forEach((n) => {
  if (!n || !n.name) return;
  const p = prefix ? prefix + ' / ' + n.name : n.name;
  rows.push({ category_id: cid, path: p, source: 'seed' });
  walk(cid, n.children, p);
});
Object.entries(SUBTREE).forEach(([cid, tree]) => walk(cid, tree, ''));

console.log(`โครงตั้งต้นมีทั้งหมด ${rows.length} กิ่ง จาก ${Object.keys(SUBTREE).length} หมวด`);
Object.keys(SUBTREE).forEach((cid) => {
  console.log(`   ${cid}: ${rows.filter((r) => r.category_id === cid).length} กิ่ง`);
});

if (!WRITE) {
  console.log('\n(ยังไม่ได้เขียนลงฐานข้อมูล — ใส่ --write เพื่อเขียนจริง)');
  process.exit(0);
}

// แบ่งส่งทีละก้อน กัน payload ใหญ่เกิน
let done = 0;
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200);
  const r = await fetch(`${URL_}/rest/v1/wb_branches?on_conflict=category_id,path`, {
    method: 'POST',
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(chunk),
  });
  if (!r.ok) throw new Error(`เขียนไม่สำเร็จ: ${r.status} ${await r.text()}`);
  done += chunk.length;
  console.log(`   ส่งแล้ว ${done}/${rows.length}`);
}
console.log('✅ เติมกิ่งตั้งต้นเรียบร้อย (กิ่งที่มีอยู่แล้วถูกข้ามไป ไม่ทับของเดิม)');
