// ตัวช่วย/ค่าคงที่กลาง — แยกจาก WordBankApp เพื่อให้ไฟล์หน้าต่าง ๆ import ได้โดยไม่วนลูป (circular)
export const VERSION = '0.0.0.0'; // ยังไม่เริ่มนับเวอร์ชัน — เลื่อนเมื่อพี่กันสั่งเท่านั้น
export function thNum(n) { return String(n).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[+d]); }
export function aiModel(ai) { if (!ai) return ''; const i = ai.indexOf(' · '); return i >= 0 ? ai.slice(i + 3) : ai; }
export function shortDate(at) { const d = new Date(at); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String((d.getFullYear() + 543) % 100).padStart(2, '0'); }
export function pathsOf(r) {
  const arr = Array.isArray(r && r.subpaths) ? r.subpaths : [];
  const all = [...arr, r && r.subpath].map((s) => String(s || '').trim()).filter(Boolean);
  return [...new Set(all)];
}
