// เขียนตารางผลทดสอบฉบับเต็มลงในเอกสาร docs/AI-MODEL-TEST.md
//
// ▶️ วิธีใช้:  node scripts/gen_aitest_md.mjs      (ต้องรัน gen_aitest.mjs ให้เสร็จก่อน)
//
// 🎯 ทำไมต้องมี: ช่อคำในตาราง wb_review เป็นข้อมูลชั่วคราว เดี๋ยวก็ถูกลบทิ้ง
//    ตารางในเอกสารนี้คือที่เก็บถาวรที่อ่านได้โดยไม่ต้องเปิดเว็บหรือต่อฐานข้อมูล
//    (อีกชุดหนึ่งอยู่ใน lib/aitest.js สำหรับให้หน้าเว็บใช้)
//
// สคริปต์จะแทนที่เนื้อหาระหว่างเครื่องหมายคั่นสองอัน ไม่แตะส่วนที่เขียนด้วยมือ

import fs from 'node:fs';
import path from 'node:path';
import { AI_TEST as D } from '../lib/aitest.js';

const CATS = {
  c0: 'สภาพแวดล้อมและบรรยากาศ', c1: 'รูปลักษณ์และสรีระ', c2: 'กิริยาและการเคลื่อนไหว',
  c3: 'เสียงและการเปล่งเสียง', c4: 'จิตใจและอารมณ์', c5: 'คำปรุงแต่งและสำนวน',
  c6: 'คำทับศัพท์ที่มักสะกดผิด', c7: 'บุคลิกภาพและลักษณะนิสัย', c8: 'อื่น ๆ',
};
const START = '<!-- ตาราง-เริ่ม (สร้างอัตโนมัติด้วย scripts/gen_aitest_md.mjs อย่าแก้ด้วยมือ) -->';
const END = '<!-- ตาราง-จบ -->';

const TH = (n) => String(n).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[+d]);
const shortOf = (b) => {
  const r = D.runs.find((x) => x.batch === b);
  const s = (r?.ai || '').split('·').map((x) => x.trim());
  return (s[1] || s[0] || '').replace(/\s*·.*$/, '');
};
const AGREE = { full: '🟢 ตรงกันหมด', branch: '🟡 กิ่งต่าง', cat: '🔴 หมวดต่าง', single: '⚪ มีตัวเดียว' };
const esc = (s) => String(s).replace(/\|/g, '\\|');

// ช่องในตาราง: ชื่อหมวดย่อ + กิ่ง (แสดงเฉพาะปลายทางถ้าเส้นทางยาว เพราะตารางจะกว้างเกินอ่าน)
function cell(c) {
  if (!c) return '—';
  const cat = (CATS[c.cat] || c.cat || '—').replace('และการเปล่งเสียง', '').replace('และลักษณะนิสัย', '');
  if (!c.paths.length) return `${esc(cat)}<br>*(ไม่มีกิ่ง)*`;
  const tails = c.paths.map((p) => {
    const seg = p.split(' / ');
    return seg.length > 1 ? `${esc(seg[seg.length - 1])}` : esc(p);
  });
  return `${esc(cat)}<br>${tails.join('<br>')}`;
}

function table(pane, title, note) {
  const head = ['คำ', 'ผล', ...D.runs.map((r) => `ช่อ ${TH(r.batch)}<br>${shortOf(r.batch)}`)];
  const lines = [
    `### ${title}`, '',
    note, '',
    '| ' + head.join(' | ') + ' |',
    '|' + head.map((_, i) => (i === 0 ? ':--' : ':-:')).join('|') + '|',
  ];
  pane.rows.forEach((row) => {
    lines.push('| **' + esc(row.text) + '** | ' + AGREE[row.agree] + ' | ' + D.runs.map((r) => cell(row.by[r.batch])).join(' | ') + ' |');
  });
  const t = pane.tally, base = t.total - t.single || 1;
  lines.push('', `**สรุป** — เทียบได้ ${base} คำ · 🟢 ตรงกันหมด ${t.full} (${Math.round(t.full / base * 100)}%) · 🟡 หมวดตรงแต่กิ่งต่าง ${t.branch} (${Math.round(t.branch / base * 100)}%) · 🔴 หมวดต่างกัน ${t.cat} (${Math.round(t.cat / base * 100)}%)` + (t.single ? ` · ⚪ มีโมเดลเดียวที่สกัด ${t.single} คำ จึงเทียบไม่ได้` : ''));
  return lines.join('\n');
}

const out = [
  START, '',
  '## ภาคผนวก ก — ตารางผลดิบฉบับเต็ม',
  '',
  '> สร้างอัตโนมัติจาก `lib/aitest.js` ด้วยคำสั่ง `node scripts/gen_aitest_md.mjs`',
  '> **เก็บไว้ที่นี่เพราะช่อคำใน `wb_review` เป็นข้อมูลชั่วคราว เดี๋ยวถูกลบทิ้ง** ตารางนี้จึงเป็นหลักฐานถาวรที่อ่านได้โดยไม่ต้องเปิดเว็บ',
  '> ช่องในตารางแสดง **ชื่อหมวดหลัก** บรรทัดบน และ **กิ่งย่อยเฉพาะปลายทาง** บรรทัดล่าง (ดูเส้นทางเต็มได้ในหน้าเว็บ)',
  '',
  '### รุ่นที่ใช้ในแต่ละช่อ', '',
  '| ช่อ | รุ่น | พบคำ | พิมพ์เข้า | สกัดเพิ่ม | กิ่งใหม่ | หลายกิ่ง |',
  '|:-:|:--|:-:|:-:|:-:|:-:|:-:|',
  ...D.runs.map((r) => `| ${TH(r.batch)} | ${r.ai} | ${r.found} | ${r.typed}/31${r.typed < 31 ? ' 🔴' : ''} | ${r.extracted} | ${r.newBranchKinds ? `${r.newBranchKinds} กิ่ง / ${r.newBranchWords} คำ` : '0'} | ${r.multiBranch} |`),
  '',
  table(D.typed, 'ก.๑ คำที่พิมพ์เข้าไปเอง (31 คำ)', 'คำชุดนี้คือชุดคำมาตรฐานเวอร์ชัน ๑ ที่วางเข้าไปทุกรอบ ทุกโมเดลควรเก็บครบทั้ง 31 คำ'),
  '',
  table(D.extracted, 'ก.๒ คำที่ AI สกัดเพิ่มจากประโยคยาว', 'คำชุดนี้ไม่ได้พิมพ์เข้าไป แต่ AI ดึงออกมาจากประโยคยาวเอง จึงไม่จำเป็นต้องเหมือนกันทุกโมเดล — ช่องที่เป็น — คือโมเดลนั้นไม่ได้สกัดคำนี้ออกมา'),
  '', END,
].join('\n');

const docPath = path.join(process.cwd(), 'docs', 'AI-MODEL-TEST.md');
let doc = fs.readFileSync(docPath, 'utf8');
const i = doc.indexOf(START), j = doc.indexOf(END);
doc = i >= 0 && j > i ? doc.slice(0, i) + out + doc.slice(j + END.length) : doc.trimEnd() + '\n\n---\n\n' + out + '\n';
fs.writeFileSync(docPath, doc);

console.log(`✅ เขียนตารางลง docs/AI-MODEL-TEST.md แล้ว`);
console.log(`   คำที่พิมพ์เข้า ${D.typed.rows.length} แถว · คำที่สกัด ${D.extracted.rows.length} แถว · ${D.runs.length} คอลัมน์โมเดล`);
console.log(`   ขนาดเอกสารรวม ${(doc.length / 1024).toFixed(1)} KB`);
