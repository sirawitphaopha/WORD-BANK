// ตัวช่วย/ค่าคงที่กลาง — แยกจาก WordBankApp เพื่อให้ไฟล์หน้าต่าง ๆ import ได้โดยไม่วนลูป (circular)
import { PROVIDERS } from '@/lib/providers'; // ข้อมูลล้วนใน lib/ (ไม่ import กลับมา components → ไม่วน)
export const VERSION = '0.0.0.0'; // ยังไม่เริ่มนับเวอร์ชัน — เลื่อนเมื่อพี่กันสั่งเท่านั้น
export const UI_KEY = 'wordbank:v1:ui';
export const REVIEW_KEY = 'wordbank:v1:review';
export const DRAFT_KEY = 'wordbank:v1:draft';
export const PAL = ['#8f6b4a', '#5f7f92', '#a86a79', '#6f8a56', '#7c6a99', '#3f7d6c'];
export function thNum(n) { return String(n).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[+d]); }
// ชื่อ/คำนำหน้าเจ้า AI ทั้งหมด (ไว้ดูว่า string ป้ายช่อเป็นรูปแบบเก่า "เจ้า · รุ่น" หรือไม่)
const AI_PREFIXES = new Set();
for (const p of Object.values(PROVIDERS)) { if (p && p.label) { AI_PREFIXES.add(p.label); AI_PREFIXES.add(p.label.split(' ')[0]); } }
// ชื่อรุ่น AI สำหรับป้ายช่อ — คืน "ชื่อรุ่นล้วน" ตัดทั้งชื่อเจ้าที่ซ้ำ และคะแนนดาว/คำอธิบายที่ต่อท้าย
//  · รูปแบบเก่าในฐาน: "เจ้า · รุ่น" (เช่น "Gemini · Gemini 3.1 Pro", "GPT · GPT-4.1") → เอา segment ที่ 2
//  · รูปแบบใหม่: ชื่อรุ่นในทะเบียนมีดาวต่อท้าย "GPT-5.1 · ★★★☆☆ 3.0 ..." → เอา segment แรก
//  แยกด้วยการดูว่า segment แรกเป็น "ชื่อเจ้า" เป๊ะไหม (เก่า) หรือเป็นชื่อรุ่น (ใหม่)
export function aiModel(ai) {
  if (!ai) return '';
  const parts = ai.split(' · ').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return ai.trim();
  if (AI_PREFIXES.has(parts[0])) return parts[1]; // เก่า: เจ้า · รุ่น
  return parts[0];                                 // ใหม่: รุ่น · ดาว/คำอธิบาย
}
const _esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// เดา "เจ้า AI" จากชื่อรุ่นที่เก็บในช่อ (ป้ายช่อไม่ได้เก็บเจ้าไว้ → เทียบกับทะเบียนรุ่น)
export function providerOf(ai) {
  if (!ai) return '';
  const s = ai.trim();
  for (const [key, p] of Object.entries(PROVIDERS)) if ((p.models || []).some((m) => m.name === s)) return key; // ตรงชื่อรุ่นเต็ม (ใหม่)
  const modelPart = s.split(' · ')[0].trim();
  for (const [key, p] of Object.entries(PROVIDERS)) if ((p.models || []).some((m) => m.name.split(' · ')[0].trim() === modelPart)) return key; // ตรงชื่อรุ่น
  for (const [key, p] of Object.entries(PROVIDERS)) if (p.label === modelPart || p.label.split(' ')[0] === modelPart) return key; // เก่า "เจ้า · รุ่น"
  return '';
}
// ประกอบป้ายชื่อ AI ของช่อ → { key: เจ้า(ไว้เลือกไอคอน), label: ชื่อเจ้า, verNote: "รุ่น · ดาว · คำอธิบายวรรคแรก" }
//  ตัด "แบรนด์ซ้ำ" ออกจากชื่อรุ่นและคำอธิบาย (เช่น GPT-5.1→5.1, "ดีสุดในกลุ่ม GPT"→"ดีสุดในกลุ่ม") · เอาคำอธิบายแค่วรรคแรก
export function aiParts(ai) {
  if (!ai) return { key: '', label: '', verNote: '' };
  const key = providerOf(ai);
  const base = key ? PROVIDERS[key] : null;
  const label = base ? base.label : '';
  const brand = label ? label.split(' ')[0] : '';
  if (label && ai.trim() === label) return { key, label, verNote: '' }; // เก็บแค่ชื่อเจ้า (เช่น "พื้นฐาน") ไม่มีรุ่น
  let s = ai;
  const p0 = ai.split(' · ');
  if (p0.length > 1 && (p0[0].trim() === label || p0[0].trim() === brand)) s = p0.slice(1).join(' · '); // เก่า: ตัดเจ้าออกก่อน
  const parts = s.split(' · ');
  let version = (parts[0] || '').trim();
  if (brand) { const re = new RegExp('^' + _esc(brand) + '[\\s-]*', 'i'); const v2 = version.replace(re, '').trim(); if (v2) version = v2; }
  let star = '', note = '';
  if (parts[1]) { const m = parts[1].match(/^([★☆½]+\s*[\d.]*)\s*(.*)$/); if (m) { star = m[1].trim(); note = m[2].trim(); } else { note = parts[1].trim(); } }
  if (brand && note) note = note.replace(new RegExp('\\s*' + _esc(brand) + '\\s*', 'gi'), ' ').replace(/\s+/g, ' ').trim();
  let vn = version;
  if (star) vn += ' · ' + star;
  if (note) vn += ' · ' + note;
  return { key, label, verNote: vn.trim() };
}
export function shortDate(at) { const d = new Date(at); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String((d.getFullYear() + 543) % 100).padStart(2, '0'); }
export function pathsOf(r) {
  const arr = Array.isArray(r && r.subpaths) ? r.subpaths : [];
  const all = [...arr, r && r.subpath].map((s) => String(s || '').trim()).filter(Boolean);
  return [...new Set(all)];
}
