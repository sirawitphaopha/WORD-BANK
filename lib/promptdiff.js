// เทียบคำสั่ง AI (prompt) สองฉบับ แล้วบอกว่าบรรทัดไหนเพิ่ม ลบ หรือเหมือนเดิม
// ใช้แสดงผลแบบเดียวกับ GitHub: บรรทัดเพิ่ม = พื้นเขียว · บรรทัดที่ถูกลบ = พื้นแดง ขีดฆ่า
//
// วิธีคิด: หา LCS (ลำดับบรรทัดที่ยาวที่สุดซึ่งปรากฏในทั้งสองฉบับตามลำดับเดิม)
// บรรทัดที่อยู่ใน LCS = ไม่เปลี่ยน · ที่เหลือฝั่งเก่า = ถูกลบ · ที่เหลือฝั่งใหม่ = เพิ่มเข้ามา
// prompt ยาวสุดตอนนี้ ~120 บรรทัด ตาราง LCS จึงเล็กมาก ไม่ต้องกังวลเรื่องความเร็ว

function lcsTable(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    }
  }
  return d;
}

// คืนอาร์เรย์ [{ t: 'same'|'add'|'del', text }] เรียงตามลำดับที่ควรแสดงผล
export function diffLines(oldText, newText) {
  const a = String(oldText || '').split('\n');
  const b = String(newText || '').split('\n');
  const d = lcsTable(a, b);
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ t: 'same', text: a[i] }); i++; j++; }
    else if (d[i + 1][j] >= d[i][j + 1]) { out.push({ t: 'del', text: a[i] }); i++; }
    else { out.push({ t: 'add', text: b[j] }); j++; }
  }
  while (i < a.length) out.push({ t: 'del', text: a[i++] });
  while (j < b.length) out.push({ t: 'add', text: b[j++] });
  return out;
}

// นับสรุปว่าเพิ่ม/ลบกี่บรรทัด ไว้โชว์เป็นตัวเลขย่อ (+12 −3)
export function diffStat(rows) {
  return {
    add: rows.filter((r) => r.t === 'add').length,
    del: rows.filter((r) => r.t === 'del').length,
  };
}

// ย่อบล็อกที่ไม่เปลี่ยนยาว ๆ ให้เหลือหัวท้ายอย่างละ N บรรทัด แล้วคั่นด้วยตัวย่อ
// (prompt ส่วนใหญ่เหมือนเดิม ถ้าโชว์หมดจะหาจุดที่เปลี่ยนไม่เจอ)
export function collapseSame(rows, keep = 2) {
  const out = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    if (run.length <= keep * 2 + 1) out.push(...run);
    else {
      out.push(...run.slice(0, keep));
      out.push({ t: 'skip', text: '⋯ เหมือนเดิมอีก ' + (run.length - keep * 2) + ' บรรทัด ⋯' });
      out.push(...run.slice(-keep));
    }
    run = [];
  };
  rows.forEach((r) => { if (r.t === 'same') run.push(r); else { flush(); out.push(r); } });
  flush();
  return out;
}
