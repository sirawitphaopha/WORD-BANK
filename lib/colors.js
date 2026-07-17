// ตัวช่วยเรื่องสี — พอร์ตจากต้นแบบ (badge/pill/dot ของหมวด + soft/mono mode)

export function rgba(hex, a) {
  hex = hex.replace('#', '');
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ผสมสี a เข้าหา b ตามสัดส่วน t (0..1)
export function mix(a, b, t) {
  a = a.replace('#', '');
  b = b.replace('#', '');
  const pa = parseInt(a, 16), pb = parseInt(b, 16);
  const ch = (o) => Math.round(((pa >> o) & 255) * (1 - t) + ((pb >> o) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function shade(hex) {
  return mix(hex, '#2e241c', 0.42);
}

// badge วงกลมเลขไทยของหมวด
export function badge(cat, mono) {
  const b = { display: 'grid', placeItems: 'center', flex: 'none', width: '26px', height: '26px', borderRadius: '50%', fontSize: '13px', fontWeight: '600', lineHeight: '1' };
  if (mono) return { ...b, background: 'transparent', color: '#5c5044', border: '1.5px solid #c9b78f' };
  return { ...b, background: rgba(cat.c, 0.16), color: shade(cat.c), border: '1px solid ' + rgba(cat.c, 0.4) };
}

// pill (dropdown เลือกหมวดในการ์ด/ตาราง)
export function pill(cat, mono) {
  const b = { padding: '5px 11px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', outline: 'none', maxWidth: '190px' };
  if (mono) return { ...b, background: '#efe4cc', color: '#4a3f35', border: '1px solid #d8c7a2' };
  return { ...b, background: rgba(cat.c, 0.14), color: shade(cat.c), border: '1px solid ' + rgba(cat.c, 0.38) };
}

// จุดสีของหมวด
export function dot(cat, mono) {
  return { flex: 'none', width: '9px', height: '9px', borderRadius: '50%', background: mono ? '#b0a184' : cat.c };
}
