// สร้างไฟล์ข้อมูลผลทดสอบ AI (lib/aitest.js) จากช่อคำจริงใน Supabase
//
// ▶️ วิธีใช้:  node scripts/gen_aitest.mjs 6 11
//    (6 = ช่อแรก, 11 = ช่อสุดท้าย ที่ใช้ชุดคำมาตรฐานชุดเดียวกัน)
//
// 🎯 ทำไมต้องมีสคริปต์นี้: เทสรอบหน้าจะได้ไม่ต้องนั่งคัดลอกตัวเลขทีละช่อง
//    รันคำสั่งเดียว ข้อมูลในหน้ารายงานอัปเดตครบทั้งตารางสรุปและตารางเทียบรายคำ
//
// ⚠️ ข้อควรระวังที่เคยพลาดมาแล้ว: "กิ่งใหม่" ที่คำนวณจากสคริปต์นี้เทียบกับคลังคำ + subtree.js
//    เหมือนที่หน้าเว็บใช้ (knownPaths) ห้ามเทียบกับคลังคำอย่างเดียว ไม่งั้นได้ตัวเลขคนละชุดกับที่เห็นบนจอ

import fs from 'node:fs';
import path from 'node:path';
import { SUBTREE } from '../lib/subtree.js';

const [, , fromArg, toArg] = process.argv;
const FROM = Number(fromArg || 6);
const TO = Number(toArg || 11);

// อ่านกุญแจจาก .env.local (ไม่ใช้ dotenv เพื่อไม่ต้องเพิ่ม dependency)
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const URL_ = env.SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error('ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน .env.local');

async function rest(table, query) {
  const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

// ---- ดึงข้อมูล ----
const rows = await rest('wb_review', `select=text,source,batch_no,batch_ai,category_id,subpath,subpaths&batch_no=gte.${FROM}&batch_no=lte.${TO}&limit=2000`);
const words = await rest('wb_words', 'select=subpath,subpaths&limit=5000');

// ---- กิ่งที่ "รู้จักอยู่แล้ว" = โครงตั้งต้น + กิ่งที่มีคำอยู่จริงในคลัง (ตรงกับ knownPaths ในหน้าเว็บ) ----
const known = new Set();
const walk = (nodes, prefix) => (nodes || []).forEach((n) => {
  const p = prefix ? prefix + ' / ' + n.name : n.name;
  known.add(p);
  walk(n.children, p);
});
Object.values(SUBTREE).forEach((tree) => walk(tree, ''));
const pathsOf = (r) => [...new Set([...(Array.isArray(r.subpaths) ? r.subpaths : []), r.subpath].map((s) => String(s || '').trim()).filter(Boolean))];
words.forEach((w) => pathsOf(w).forEach((p) => known.add(p)));

// ---- รวมคำที่เขียนต่างกันเล็กน้อยให้เป็นคำเดียวกัน ----
// เช่น "รอบ ๆ" กับ "รอบๆ" · "[...]อย่างน่าหวุดหวิด" กับ "[เหตุการณ์] อย่างน่าหวุดหวิด"
// (แต่ละโมเดลเติมคำใบ้ในวงเล็บไม่เหมือนกัน จึงต้องตัดวงเล็บทิ้งก่อนจับคู่)
const norm = (s) => String(s || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '').replace(/ๆ/g, 'ๆ');

const isExt = (r) => String(r.source || '').trim() !== '';
const batches = [...new Set(rows.map((r) => r.batch_no))].sort((a, b) => a - b);

// ---- สรุปรายช่อ ----
const runs = batches.map((b) => {
  const items = rows.filter((r) => r.batch_no === b);
  const ext = items.filter(isExt).length;
  const newPaths = new Map();
  items.forEach((r) => pathsOf(r).forEach((p) => { if (!known.has(p)) newPaths.set(p, (newPaths.get(p) || 0) + 1); }));
  return {
    batch: b,
    ai: items[0]?.batch_ai || '',
    found: items.length,
    typed: items.length - ext,
    extracted: ext,
    newBranchKinds: newPaths.size,
    newBranchWords: [...newPaths.values()].reduce((a, c) => a + c, 0),
    newBranches: [...newPaths.entries()].sort((a, b2) => b2[1] - a[1]).map(([p, n]) => ({ path: p, n })),
    multiBranch: items.filter((r) => pathsOf(r).length > 1).length,
  };
});

// ---- ตารางเทียบรายคำ (แกนหลักของรายงาน "จัดกลุ่มตรงกันไหม") ----
function buildMatrix(onlyExtracted) {
  const byKey = new Map();
  rows.filter((r) => isExt(r) === onlyExtracted).forEach((r) => {
    const k = norm(r.text);
    if (!byKey.has(k)) byKey.set(k, { text: r.text, cells: {} });
    const e = byKey.get(k);
    if (r.text.length > e.text.length) e.text = r.text; // เก็บฉบับที่เขียนเต็มที่สุดไว้แสดง
    e.cells[r.batch_no] = { cat: r.category_id || '', paths: pathsOf(r) };
  });
  return [...byKey.values()].map((e) => {
    const cells = Object.values(e.cells);
    const cats = new Set(cells.map((c) => c.cat));
    const sps = new Set(cells.map((c) => c.paths.join(' + ') || '(ไม่มีกิ่ง)'));
    return {
      text: e.text,
      models: cells.length,
      cats: cats.size,
      branches: sps.size,
      // เห็นพ้อง = ทุกโมเดลที่ทำคำนี้ ให้หมวดเดียวกันและกิ่งชุดเดียวกัน
      agree: cells.length >= 2 && cats.size === 1 && sps.size === 1 ? 'full'
        : cells.length < 2 ? 'single'
        : cats.size === 1 ? 'branch' : 'cat',
      by: e.cells,
    };
  }).sort((a, b) => b.cats - a.cats || b.branches - a.branches || a.text.localeCompare(b.text, 'th'));
}

const typedMatrix = buildMatrix(false);
const extMatrix = buildMatrix(true);
const tally = (m) => ({
  total: m.length,
  full: m.filter((x) => x.agree === 'full').length,
  branch: m.filter((x) => x.agree === 'branch').length,
  cat: m.filter((x) => x.agree === 'cat').length,
  single: m.filter((x) => x.agree === 'single').length,
});

const data = {
  version: 1,
  runFrom: FROM, runTo: TO,
  runs,
  typed: { tally: tally(typedMatrix), rows: typedMatrix },
  extracted: { tally: tally(extMatrix), rows: extMatrix },
};

const out = `// ผลการทดสอบโมเดล AI — ไฟล์ข้อมูลล้วน สร้างอัตโนมัติ อย่าแก้ด้วยมือ
// สร้างจาก: node scripts/gen_aitest.mjs ${FROM} ${TO}
// อ่านคำอธิบายวิธีทดสอบและการตีความได้ที่ docs/AI-MODEL-TEST.md
//
// agree: 'full'=ทุกโมเดลจัดตรงกันหมด · 'branch'=หมวดเดียวกันแต่กิ่งต่าง · 'cat'=หมวดต่างกัน · 'single'=มีโมเดลเดียวที่ทำคำนี้
export const AI_TEST = ${JSON.stringify(data, null, 1)};
`;
fs.writeFileSync(path.join(process.cwd(), 'lib', 'aitest.js'), out);

console.log(`✅ เขียน lib/aitest.js แล้ว (${(out.length / 1024).toFixed(1)} KB)`);
console.log(`   ช่อ ${FROM}-${TO} · ${runs.length} รอบ`);
runs.forEach((r) => console.log(`   ช่อ ${r.batch} ${r.ai.slice(0, 32).padEnd(34)} พบ ${r.found} · พิมพ์เข้า ${r.typed} · สกัด ${r.extracted} · กิ่งใหม่ ${r.newBranchKinds} กิ่ง/${r.newBranchWords} คำ · หลายกิ่ง ${r.multiBranch}`));
const t = data.typed.tally, e = data.extracted.tally;
console.log(`   คำที่พิมพ์เข้า ${t.total} คำ → ตรงกันหมด ${t.full} · กิ่งต่าง ${t.branch} · หมวดต่าง ${t.cat}`);
console.log(`   คำที่สกัดมา  ${e.total} คำ → ตรงกันหมด ${e.full} · กิ่งต่าง ${e.branch} · หมวดต่าง ${e.cat} · มีโมเดลเดียวทำ ${e.single}`);
