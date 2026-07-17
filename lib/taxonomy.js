// หมวดย่อย (subcategory) — คำนวณจาก taxonomy ในโค้ด เหมือนต้นแบบ
// ใช้ตอนจัดกลุ่มในหน้าคลังคำ
import { SUBTAX } from './data.js';

let _sm = null;
function subMaps() {
  if (_sm) return _sm;
  const idx = {}, order = {};
  Object.keys(SUBTAX).forEach((cid) => {
    order[cid] = [];
    idx[cid] = {};
    SUBTAX[cid].split('|').forEach((seg) => {
      const parts = seg.split('::');
      const name = parts[0];
      order[cid].push(name);
      (parts[1] || '').split(',').forEach((t) => {
        t = t.trim();
        if (t) idx[cid][t] = name;
      });
    });
  });
  _sm = { idx, order };
  return _sm;
}

// หาว่าคำ text อยู่หมวดย่อยไหนของหมวด cid
export function subFor(cid, text) {
  const m = subMaps().idx[cid] || {};
  if (m[text]) return m[text];
  for (const t in m) {
    if (t.length >= 4 && (text.indexOf(t) >= 0 || t.indexOf(text) >= 0)) return m[t];
  }
  return 'อื่น ๆ ในหมวดนี้';
}

// ลำดับหมวดย่อยของหมวด cid
export function subOrder(cid) {
  return (subMaps().order[cid] || []).concat(['อื่น ๆ ในหมวดนี้']);
}
