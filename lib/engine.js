// ตัวช่วยจัดคำแบบพื้นฐาน (heuristic) — พอร์ตจาก runEngine ในต้นแบบ
// ทำงานฝั่งเซิร์ฟเวอร์ (ใน /api/process) เพื่อให้สลับเป็น Claude API จริงได้ทีหลัง
// โดยไม่ต้องแตะ UI — แค่เปลี่ยน body ของ runEngine ให้เรียก Claude แล้วคืนรูปแบบเดียวกัน
import { MISSPELL, SEED } from './data.js';

// สร้าง index: คำในคลังตัวอย่าง → หมวด (c0..c8)
let _idx = null;
function seedIndex() {
  if (_idx) return _idx;
  const m = new Map();
  SEED.trim().split('\n').forEach((ln) => {
    const p = ln.split('|');
    if (p[0]) m.set(p[0].trim(), 'c' + (p[1] || '8').trim());
  });
  _idx = m;
  return m;
}
let _terms = null;
function seedTerms() {
  if (_terms) return _terms;
  _terms = [...seedIndex().keys()].filter((t) => t.length >= 3).sort((a, b) => b.length - a.length);
  return _terms;
}

// แก้คำสะกดผิด → คืน { text, original(ถ้ามีการแก้), changes }
function applySpell(text) {
  const d = MISSPELL;
  let t = text;
  const ch = [];
  for (const k in d) {
    if (t.indexOf(k) >= 0) {
      ch.push({ from: k, to: d[k] });
      t = t.split(k).join(d[k]);
    }
  }
  return { text: t, original: ch.length ? text : null, changes: ch };
}

// แยกวลีย่อยจากประโยคยาว
function extract(line, terms) {
  const found = [];
  for (const t of terms) {
    const i = line.indexOf(t);
    if (i >= 0) found.push([i, t]);
  }
  found.sort((a, b) => a[0] - b[0]);
  const res = [];
  let end = -1;
  for (const [i, t] of found) {
    if (i >= end) { res.push(t); end = i + t.length; }
  }
  if (res.length >= 2) return res;
  const ws = line.split(/\s+/).filter((w) => w.length >= 2);
  if (ws.length >= 2) return ws;
  return [line];
}

// จัดหมวด — ใช้หมวดเดิมก่อน ไม่เข้าค่อยเสนอหมวดใหม่
function categorize(t, idx, proposed) {
  // คำเกี่ยวกับกลิ่น → เสนอหมวดใหม่ "กลิ่นและการรับรส"
  if (t.indexOf('กลิ่น') >= 0) {
    const name = 'กลิ่นและการรับรส';
    if (!proposed.includes(name)) proposed.push(name);
    return { category_id: null, proposed_category: name, matched: false };
  }
  if (idx.has(t)) return { category_id: idx.get(t), proposed_category: null, matched: true };
  for (const [term, cid] of idx) {
    if (term.length >= 4 && (t.indexOf(term) >= 0 || term.indexOf(t) >= 0)) {
      return { category_id: cid, proposed_category: null, matched: true };
    }
  }
  const H = [
    ['c6', ['สตาร์ต', 'ช็อก', 'ล็อก', 'เบรก', 'อีเมล', 'เว็บ', 'กราฟ']],
    ['c3', ['เสียง', 'กรีด', 'ครวญ', 'สะอื้น', 'แผด', 'ตวาด', 'พึมพำ', 'กระซิบ', 'คำราม', 'ครืด']],
    ['c2', ['มอง', 'จ้อง', 'เหลียว', 'ยิ้ม', 'เดิน', 'วิ่ง', 'ก้ม', 'พยัก', 'นั่ง', 'ผงะ', 'ชะงัก', 'กระโจน', 'คว้า', 'กระชาก', 'สะบัด', 'หัน', 'ย่อง', 'ทรุด']],
    ['c4', ['กลัว', 'เศร้า', 'โกรธ', 'รัก', 'ตกใจ', 'สับสน', 'เหงา', 'ทุกข์', 'ขนลุก', 'สั่น', 'เจ็บ', 'วิงวอน', 'เกลียด', 'ตื่น', 'ระทม', 'อาฆาต', 'หวาด']],
    ['c0', ['แสง', 'เงา', 'มืด', 'ฟ้า', 'ฝน', 'หมอก', 'บ้าน', 'คฤหาสน์', 'บันได', 'ป่า', 'โคม', 'เทียน', 'ราตรี', 'จันทร์', 'สลัว']],
    ['c1', ['ใบหน้า', 'ผม', 'ริมฝีปาก', 'ร่าง', 'ผิว', 'แก้ม', 'คาง', 'จมูก', 'แผล', 'เลือด', 'เขี้ยว', 'คิ้ว', 'ดวงตา']],
  ];
  for (const [cid, ks] of H) {
    if (ks.some((k) => t.indexOf(k) >= 0)) return { category_id: cid, proposed_category: null, matched: true };
  }
  return { category_id: 'c8', proposed_category: null, matched: false };
}

// ตัวจัดคำหลัก — คืนตามสัญญาใน README:
// { items:[{text, original|null, category_id|null, proposed_category|null, subcategory|null, notes:[]}],
//   proposed_categories:[{name_th}] }
export function runEngine(text) {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const idx = seedIndex(), terms = seedTerms();
  const proposed = [], out = [], seen = new Set();

  const push = (part, fromSentence) => {
    part = part.trim().replace(/^[,\-–—•\s]+/, '').replace(/[,\s]+$/, '');
    if (part.length < 2) return;
    const sp = applySpell(part), t = sp.text;
    if (seen.has(t)) return;
    seen.add(t);
    const cr = categorize(t, idx, proposed);
    const notes = [];
    if (sp.original) notes.push('✎ ' + sp.changes.map((c) => c.from + ' → ' + c.to).join(', '));
    if (fromSentence) notes.push('แยกจากประโยค');
    notes.push(cr.proposed_category ? 'เสนอหมวดใหม่' : (cr.matched ? 'จัดเข้าหมวดเดิม' : 'ยังไม่แน่ใจหมวด'));
    out.push({
      text: t,
      original: sp.original,
      category_id: cr.category_id,
      proposed_category: cr.proposed_category,
      subcategory: null,
      notes,
    });
  };

  for (const line of lines) {
    if (line.indexOf(',') >= 0) {
      line.split(',').forEach((p) => push(p, false));
    } else if (line.length > 22 && /\s/.test(line)) {
      const parts = extract(line, terms);
      const fromSentence = parts.length > 1;
      parts.forEach((p) => push(p, fromSentence));
    } else {
      push(line, false);
    }
  }

  return { items: out, proposed_categories: proposed.map((name_th) => ({ name_th })) };
}
