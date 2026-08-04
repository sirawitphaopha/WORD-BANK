// 🕸 หน้ารายละเอียดคำ — ผังใยความคิด
//
// เจ้าของคลังสั่งทำเอง 26 ก.ค. 2569 แล้วติมา 4 รอบกว่าจะลงตัว
//   รอบ 1 การ์ด 4 กล่องเรียงกัน → _"มันดูมองยากมากกก จืดชืดมากกก"_
//   รอบ 2 แผนผังกิ่งไม้วาดหมึกเต็มหน้า → _"เอาตรง ๆ นะ เวอร์ไป"_
//   รอบ 3 ป๊อปอัปเรียบ ไม่มีสีไม่มีเส้น → _"เราก็บอกว่ามันจืดดด คำหลักกลืนไปกับทุกอย่างเลย"_
//   รอบ 4 ✅ ป๊อปอัปแนวนอน ซ้ายผัง ขวาช่องแก้ไข
//
// 🔒 สิ่งที่เจ้าของคลังสั่งว่าห้ามตัดออก
//   ① คำที่แตกออกมา ระบายคนละสีในตัววลี (จานสีชุดเดียวกับหน้าตรวจทาน)
//   ② เส้นลากจากคำที่ระบายสี ไปหาชิปคำสีเดียวกัน
//   ③ กิ่งแยกไปหาหมวด แล้วหมวดแยกไปหากิ่งย่อย แบบ mind map
//   ④ คำหลักต้องเด่นชัด (กรอบหนา เงา ตัวใหญ่ ป้ายแดงชาด)
//   ⑤ เส้นต้องงอก ไม่ใช่ขึ้นเต็มค้าง · เส้นประต้องงอกเป็นเส้นประตั้งแต่แรก
//   🚫 ห้ามมีจุดวิ่งไปตามเส้น — _"ไม่เอาแบบส่งสัญญาณประสาทแบบนี้ ไม่สวย"_
//
// ตอบ ๔ คำถามที่เจ้าของคลังกำหนด: แตกมาจากวลีไหน · หรือเก็บมาเอง · เจอเรื่องไหน · อยู่กิ่งไหน
import React from 'react';
import { PAL } from '../helpers';

const esc = (s) => String(s == null ? '' : s);

// ─────────────────────────────────────────────────────────────
// วาดเส้นโยง — ยกมาจากม็อคอัปที่เจ้าของคลังเคาะแล้ว แก้เฉพาะที่จำเป็น
//
// 🔴 วัดตำแหน่งด้วย offsetLeft/offsetTop ไม่ใช่ getBoundingClientRect
//    การ์ดทุกใบมีแอนิเมชันลอยขึ้น (translateY + scale) ตอนเปิด
//    getBoundingClientRect บวกการขยับนั้นเข้ามาด้วย = วัดได้คนละค่าทุกเสี้ยววินาที
//    ทำให้ระบบเข้าใจว่าเลย์เอาต์เปลี่ยน แล้ววาดใหม่ทับ เส้นที่กำลังงอกถูกรีเซ็ตกลางคัน
//    offset* มาจากการจัดหน้าล้วน ไม่นับ transform → นิ่งตั้งแต่เฟรมแรก
// ─────────────────────────────────────────────────────────────
let drawSig = '', animKey = '', animAt = 0;

export function drawWordWeb(map, svg, cur) {
  if (!map || !svg) return;
  const R = map.getBoundingClientRect();
  const off = (el) => {
    let x = 0, y = 0, n = el;
    while (n && n !== map) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (!n) { const b = el.getBoundingClientRect(); return { x: b.left - R.left, y: b.top - R.top }; }
    return { x, y };
  };
  const rel = (el) => { const p = off(el); return { x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight }; };
  // คำที่ระบายสีในวลีเป็นข้อความไหลบรรทัด ไม่ใช่กล่อง — ถ้าตกบรรทัดต้องเอาชิ้นแรก
  // และหารกลับด้วยอัตราย่อของการ์ดที่กำลังลอยขึ้น ไม่งั้นความกว้างขยับทีละเศษพิกเซล
  const relMark = (el) => {
    const b = el.getClientRects()[0] || el.getBoundingClientRect(), p = off(el);
    const card = el.closest('[data-el=hero]');
    const s = card && card.offsetWidth ? card.getBoundingClientRect().width / card.offsetWidth : 1;
    return { x: p.x, y: p.y, w: b.width / (s || 1), h: b.height / (s || 1) };
  };
  const f = (v) => (+v).toFixed(1);
  const V = (x, y1, y2) => `M${f(x)} ${f(y1)}L${f(x)} ${f(y2)}`;
  const H = (y, x1, x2) => `M${f(x1)} ${f(y)}L${f(x2)} ${f(y)}`;
  const poly = (pts) => {
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const ux = Math.sign(p.x - a.x), uy = Math.sign(p.y - a.y);
      const vx = Math.sign(b.x - p.x), vy = Math.sign(b.y - p.y);
      if (ux === vx && uy === vy) continue;
      const r = Math.max(0, Math.min(9, Math.hypot(p.x - a.x, p.y - a.y) / 2, Math.hypot(b.x - p.x, b.y - p.y) / 2));
      d += `L${f(p.x - ux * r)} ${f(p.y - uy * r)}Q${f(p.x)} ${f(p.y)} ${f(p.x + vx * r)} ${f(p.y + vy * r)}`;
    }
    const e = pts[pts.length - 1];
    return d + `L${f(e.x)} ${f(e.y)}`;
  };
  const orth = (x1, y1, x2, y2, my) => (Math.abs(x2 - x1) < 2 ? V(x1, y1, y2)
    : poly([{ x: x1, y: y1 }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: y2 }]));
  const elbow = (x1, y1, x2, y2) => {
    const r = Math.max(2, Math.min(9, Math.abs(y2 - y1), Math.abs(x2 - x1)));
    return `M${f(x1)} ${f(y1)}L${f(x1)} ${f(y2 - r)}Q${f(x1)} ${f(y2)} ${f(x1 + r)} ${f(y2)}L${f(x2)} ${f(y2)}`;
  };

  const P = [], dots = [];
  const hero = map.querySelector('[data-el=hero]');
  if (hero) {
    const hb = rel(hero), hbot = hb.y + hb.h;
    // ① วลีแม่ที่อยู่เหนือคำหลัก → ลากลงมาหาคำหลัก
    [...map.querySelectorAll('[data-el=par]')].forEach((el) => {
      const b = rel(el), pbot = b.y + b.h;
      P.push([orth(b.x + b.w / 2, pbot, hb.x + hb.w / 2, hb.y, pbot + (hb.y - pbot) * 0.5), 'var(--primary,#6b4f2a)', 1.7, 0.5, 0]);
    });

    // ② คำที่แตกออก → เส้นจากคำที่ระบายสีในวลี ไปหาชิปสีเดียวกัน
    const marks = [...hero.querySelectorAll('[data-m]')];
    const leaves = [...map.querySelectorAll('[data-el=leaf]')];
    if (leaves.length) {
      const boxes = leaves.map((el) => ({ el, b: rel(el) })), rows = [];
      boxes.forEach((o) => {
        const r = rows.find((x) => Math.abs(x.top - o.b.y) < 6);
        if (r) { r.items.push(o); r.bot = Math.max(r.bot, o.b.y + o.b.h); }
        else rows.push({ top: o.b.y, bot: o.b.y + o.b.h, items: [o] });
      });
      rows.sort((x, y) => x.top - y.top);
      const mapW = map.clientWidth;
      const spineL = Math.max(5, Math.min(...boxes.map((o) => o.b.x)) - 14);
      const spineR = Math.min(mapW - 5, Math.max(...boxes.map((o) => o.b.x + o.b.w)) + 14);
      const roomL = Math.min(...boxes.map((o) => o.b.x)) - spineL >= 10;
      const roomR = spineR - Math.max(...boxes.map((o) => o.b.x + o.b.w)) >= 10;
      const hc = hb.x + hb.w / 2;
      let prev = hbot;
      rows.forEach((r) => {
        const gap = r.top - prev;
        r.band = [prev + gap * (rows.length > 1 ? 0.22 : 0.3), prev + gap * 0.82];
        prev = r.bot;
        r.conns = [];
        r.items.forEach((o) => {
          const i = +o.el.dataset.k, txt = o.el.textContent;
          let m = marks.find((x) => +x.dataset.m === i), dash = 0;
          // คำลูกที่ซ้อนอยู่ในคำลูกตัวยาวกว่า ระบายสีทับกันไม่ได้
          // → ลากเส้นประออกจากคำยาวที่ครอบมันแทน · ทุกชิปต้องมีเส้น ห้ามมีชิปลอย
          if (!m) { m = marks.find((x) => x.textContent.includes(txt)); dash = 1; }
          if (!m) return;
          const a = relMark(m);
          r.conns.push({
            k: i,
            sx: Math.min(Math.max(a.x + a.w / 2, hb.x + 10), hb.x + hb.w - 10),
            cx: o.b.x + o.b.w / 2, top: o.b.y, c: PAL[i % PAL.length], dash,
          });
        });
        const nn = r.conns.length;
        [...r.conns].sort((p, q) => Math.abs(q.cx - hc) - Math.abs(p.cx - hc))
          .forEach((o, k) => { o.lane = r.band[0] + (nn > 1 ? k * (r.band[1] - r.band[0]) / (nn - 1) : 0); });
      });
      rows.forEach((r, ri) => r.conns.forEach((o, k) => {
        const right = roomR && (o.cx > hc || !roomL);
        const spine = right ? spineR - k * 3.5 : spineL + k * 3.5;
        const y0 = rows[0].band[0] - 5 - k * 3.5;
        const pts = ri === 0
          ? [{ x: o.sx, y: hbot }, { x: o.sx, y: o.lane }, { x: o.cx, y: o.lane }, { x: o.cx, y: o.top }]
          : [{ x: o.sx, y: hbot }, { x: o.sx, y: y0 }, { x: spine, y: y0 },
             { x: spine, y: o.lane }, { x: o.cx, y: o.lane }, { x: o.cx, y: o.top }];
        P.push([poly(pts), o.c, o.dash ? 1.3 : 1.9, o.dash ? 0.55 : 0.95, o.dash, o.k]);
        dots.push([o.sx, hbot, o.c, 2.4, 0.9, P.length - 1, 0]);
      }));
    }

    // ③ ลำต้นของหมวด: เส้นตั้งเส้นเดียวจากใต้การ์ด แตกข้อศอกเข้าแต่ละหมวด
    const nodes = [...map.querySelectorAll('[data-el=catnode]')];
    if (nodes.length) {
      const trunk = Math.max(6, hb.x + 15);
      const stop = rel(nodes[nodes.length - 1]);
      P.push([V(trunk, hbot, stop.y + 17), 'var(--line,#ddcba4)', 1.6, 1, 0]);
      dots.push([trunk, hbot, 'var(--primary,#6b4f2a)', 3, 0.45, P.length - 1, 0]);
      nodes.forEach((node) => {
        const a = rel(node), c = node.dataset.col || 'var(--primary,#6b4f2a)';
        P.push([elbow(trunk, Math.max(hbot, a.y - 10), a.x, a.y + 17), c, 1.8, 0.9, 0, null, node.dataset.c]);
      });
    }
  }

  // ④ ในแต่ละหมวด: รางตั้งหนึ่งรางต่อหนึ่งชั้น แตกเส้นสั้นเข้าลูกของชั้นนั้น
  map.querySelectorAll('[data-el=catrow]').forEach((row) => {
    const node = row.querySelector('[data-el=catnode]');
    if (!node) return;
    const a = rel(node), c = node.dataset.col || 'var(--primary,#6b4f2a)';
    const nodes = [...row.querySelectorAll('[data-el=tnode]')].map((el) => ({ b: rel(el), id: el.dataset.id, p: el.dataset.p }));
    if (!nodes.length) return;
    const anchor = (o) => o.b.y + Math.min(o.b.h / 2, 15);
    const byId = new Map(nodes.map((o) => [o.id, o])), groups = new Map();
    nodes.forEach((o) => { const k = o.p || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
    groups.forEach((kids, pid) => {
      const par = byId.get(pid);
      let railX, startY;
      const deep = !!par;
      if (par) { railX = par.b.x + 11; startY = par.b.y + par.b.h - 1; }
      else if (kids[0].b.y > a.y + a.h - 4) { railX = a.x + 20; startY = a.y + a.h; }
      else { railX = a.x + a.w + 15; startY = a.y + 17; P.push([H(startY, a.x + a.w, railX), c, 1.6, 0.7, 0, null, node.dataset.c]); }
      P.push([V(railX, startY, anchor(kids[kids.length - 1])), c, deep ? 1.2 : 1.4, deep ? 0.5 : 0.6, 0, null, node.dataset.c]);
      kids.forEach((o) => {
        const y = anchor(o);
        P.push([H(y, railX, o.b.x), c, deep ? 1.2 : 1.4, deep ? 0.55 : 0.65, 0, null, node.dataset.c]);
        dots.push([o.b.x, y, c, deep ? 1.7 : 2, 0.7, P.length - 1, 1]);
      });
    });
  });

  // 🔴 ต้นเหตุที่เส้น "ไม่งอก" — ถ้าวาดใหม่ทุกครั้งที่ถูกเรียก เส้นที่กำลังงอกจะถูกแทนที่ด้วยเส้นเต็ม
  //    ถ้าตำแหน่งทุกชิ้นเหมือนเดิมเป๊ะ ไม่ต้องวาดใหม่ ปล่อยให้งอกต่อจนจบ
  const sig = map.clientWidth + 'x' + map.clientHeight + '|' + cur + '|'
    + P.map((x) => x[0]).join('') + '|' + dots.map((d) => f(d[0]) + ',' + f(d[1])).join(';');
  if (sig === drawSig && svg.childNodes.length) return;
  drawSig = sig;
  svg.setAttribute('viewBox', `0 0 ${map.clientWidth} ${map.clientHeight}`);
  const seq = (i) => 0.3 + i * 0.055;

  // 🪡 เส้นประต้องงอก "เป็นเส้นประตั้งแต่แรก" ไม่ใช่งอกทึบแล้วแวบเป็นประตอนจบ
  //    ทำด้วยหน้ากาก: วาดเส้นประเต็มเส้นไว้ แล้วเอาหน้ากาก (เส้นทึบหนากว่า) บังไว้หมด
  //    หน้ากากใช้กลไกงอกเดิม → เปิดไล่จากต้นเส้น ตาเห็นขีดประโผล่ทีละขีดตามแนวเส้น
  //    ⚠️ ต้องตั้ง maskUnits="userSpaceOnUse" พร้อมกรอบเต็มผัง — ค่าตั้งต้นอิงกรอบของรูป
  //       ซึ่งเส้นตรงมีความสูงเป็นศูนย์ หน้ากากจะแบนจนบังเส้นหายทั้งเส้น
  let defs = '';
  const MW = map.clientWidth, MH = map.clientHeight;
  const body = P.map(([d, c, w, o, dash, lk, grp], i) => {
    let extra = ' data-anim="1"';
    if (dash) {
      defs += `<mask id="wwmk${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}">`
        + `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w + 6}" stroke-linejoin="round" stroke-linecap="round"`
        + ` data-anim="1" style="animation-delay:${seq(i).toFixed(2)}s"/></mask>`;
      extra = ` stroke-dasharray="4 5" mask="url(#wwmk${i})"`;
    }
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${o}"`
      + (lk != null ? ` data-leaf="${lk}"` : '') + (grp != null ? ` data-cat="${grp}"` : '')
      + `${extra} style="animation-delay:${seq(i).toFixed(2)}s"/>`;
  }).join('')
    // จุดต่อผุดตรงจังหวะที่เส้นนั้นงอกมาถึงพอดี ไม่ใช่ผุดพร้อมกันหมด
    + dots.map(([x, y, c, r, o, pi, end]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${c}" opacity="${o}"`
      + ` style="transform-box:fill-box;transform-origin:center;animation:wwDot .34s cubic-bezier(.2,.9,.3,1) ${(seq(pi || 0) + (end ? 1 : 0.1)).toFixed(2)}s both"/>`).join('');
  svg.innerHTML = (defs ? `<defs>${defs}</defs>` : '') + body;
  // เก็บกวาดเส้นยาวศูนย์ — เกิดตอนกิ่งชั้นนั้นมีลูกตัวเดียวและอยู่ระดับเดียวกับราง
  svg.querySelectorAll('path').forEach((q) => { if (q.getTotalLength() < 2) q.remove(); });

  // ใช้ transition ไม่ใช่ animation เพื่อให้จบที่ dashoffset 0 เสมอ แม้ถูกขัดกลางทาง
  const fresh = animKey !== cur || performance.now() - animAt < 2200;
  if (animKey !== cur) { animKey = cur; animAt = performance.now(); }
  if (fresh) svg.querySelectorAll('path[data-anim]').forEach((q) => {
    const L = q.getTotalLength().toFixed(0), d = q.style.animationDelay || '0s';
    q.style.strokeDasharray = L; q.style.strokeDashoffset = L;
    q.getBoundingClientRect();                       // บังคับให้เบราว์เซอร์รับค่าก่อนเริ่มวิ่ง
    q.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.22,.9,.28,1) ${d}`;
    q.style.strokeDashoffset = '0';
  });
}

// ─────────────────────────────────────────────────────────────
// ระบายสีคำที่แตกออกมา ลงในตัววลี — คนละสีต่อคำ ตามจานสีหน้าตรวจทาน
// คืน { html, used } · used = ชุดลำดับคำที่หาเจอในวลีจริง (ที่เหลือจะโยงด้วยเส้นประ)
// ─────────────────────────────────────────────────────────────
function paint(text, kids) {
  const t = String(text || '');
  const hits = [];
  kids.forEach((k, i) => {
    const s = String(k || '').trim();
    if (!s) return;
    let from = 0, at;
    while ((at = t.indexOf(s, from)) !== -1) { hits.push({ a: at, b: at + s.length, i }); from = at + 1; }
  });
  // คำยาวได้สิทธิ์ก่อน — คำสั้นที่ซ้อนอยู่ข้างในจะโยงด้วยเส้นประแทน
  hits.sort((x, y) => (y.b - y.a) - (x.b - x.a) || x.a - y.a);
  const taken = [], used = new Set();
  hits.forEach((h) => {
    if (taken.some((o) => h.a < o.b && o.a < h.b)) return;
    taken.push(h); used.add(h.i);
  });
  taken.sort((x, y) => x.a - y.a);
  const out = [];
  let pos = 0;
  taken.forEach((h, n) => {
    if (h.a > pos) out.push(<span key={'t' + n}>{t.slice(pos, h.a)}</span>);
    out.push(
      <span key={'m' + n} data-m={h.i} style={{
        background: PAL[h.i % PAL.length] + '38', color: '#33291f',
        borderBottom: '2px solid ' + PAL[h.i % PAL.length], borderRadius: '3px', padding: '0 1px',
      }}>{t.slice(h.a, h.b)}</span>
    );
    pos = h.b;
  });
  if (pos < t.length) out.push(<span key="tz">{t.slice(pos)}</span>);
  return { nodes: out, used };
}

// ─────────────────────────────────────────────────────────────
// ต้นไม้ของกิ่งในหมวดหนึ่ง — แตกเส้นทาง " / " เป็นชั้น แล้วยุบชั้นที่ใช้ร่วมกัน
// ─────────────────────────────────────────────────────────────
function tree(paths) {
  const rows = [], seen = new Map();
  paths.forEach((p) => {
    const segs = String(p.path || '').split(' / ').filter(Boolean);
    let key = '';
    segs.forEach((s, d) => {
      const parent = key;
      key = key ? key + ' / ' + s : s;
      if (seen.has(key)) return;
      seen.set(key, 1);
      rows.push({ id: key, p: parent, name: s, depth: d, leaf: d === segs.length - 1,
                  code: d === segs.length - 1 ? p.code : '', en: d === segs.length - 1 ? p.name_en : '' });
    });
  });
  return rows;
}

// ═════════════════════════════════════════════════════════════
export function renderWordWeb(app) {
  const S = app.state;
  const w = S.wordWeb;
  if (!w) return null;
  const mob = S.isMobile;
  const cats = S.categories || [];
  const catOf = (id) => cats.find((c) => c.id === id) || { n: id, c: '#8a8175' };
  const kids = (w.children || []).map((c) => c.text);
  const pt = paint(w.word && w.word.text, kids);

  // จัดกิ่งตามหมวด — หมวดที่มีกิ่งเยอะอยู่บน
  const byCat = new Map();
  (w.branches || []).forEach((b) => {
    if (!byCat.has(b.category_id)) byCat.set(b.category_id, []);
    byCat.get(b.category_id).push(b);
  });
  const catList = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);

  const card = { background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '12px' };
  const secHead = { fontSize: '9.5px', letterSpacing: '.22em', textTransform: 'uppercase', color: '#b0a184', marginBottom: '9px' };

  return (
    <div onClick={app.closeWordWeb} style={{ position: 'fixed', inset: 0, background: 'rgba(58,47,40,.45)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 75, padding: mob ? '10px' : '24px', animation: 'wbfade .2s ease' }}>
      <div onClick={app.stop} style={{ background: 'var(--panel,#f7f0e0)', border: '1px solid #e0d0ac', borderRadius: '16px', width: mob ? '100%' : 'min(1080px,100%)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 70px rgba(58,47,40,.35)', display: mob ? 'block' : 'grid', gridTemplateColumns: mob ? undefined : 'minmax(0,1fr) 320px' }}>

        {/* ── ซ้าย · ผังใยความคิด ─────────────────────────── */}
        <div style={{ padding: mob ? '18px 14px' : '24px 26px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ fontFamily: 'var(--font-trirong),serif', fontSize: '19px', fontWeight: 600, color: '#33291f' }}>รายละเอียดคำ</div>
            <div style={{ height: '1px', flex: 1, background: '#ddcba4' }} />
            {w.loading && <span style={{ fontSize: '12px', color: '#b0a184' }}>กำลังโหลด…</span>}
            <button onClick={app.closeWordWeb} aria-label="ปิด" style={{ border: 'none', background: 'none', color: '#b0a184', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          <div ref={app._wwRef} data-el="map" style={{ position: 'relative', minWidth: 0 }}>
            <svg data-el="svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }} />

            {/* ① วลีแม่ที่คำนี้ถูกตัดออกมา · ไม่มีเลย = เก็บมาเอง */}
            {(w.parents || []).length > 0 && (
              <div style={{ position: 'relative', zIndex: 1, marginBottom: '30px' }}>
                <div style={secHead}>ตัดมาจากวลี</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {w.parents.map((p, i) => (
                    <button key={i} data-el="par" onClick={() => p.inLibrary && app.openWordWeb(p.id)}
                      title={p.inLibrary ? 'กดเพื่อดูวลีนี้' : 'วลีนี้ยังไม่อยู่ในคลัง'}
                      style={{ ...card, textAlign: 'left', padding: '9px 13px', maxWidth: '100%', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.6, color: '#5c5044', cursor: p.inLibrary ? 'pointer' : 'default', borderStyle: p.inLibrary ? 'solid' : 'dashed', animation: 'wwRise .45s cubic-bezier(.2,.8,.25,1) both' }}>
                      {esc(p.text)}
                      {p.kind === 'picked_from' && <span style={{ fontSize: '10px', color: '#b0a184', marginLeft: '6px' }}>เส้นเชื่อมย้อนหลัง</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ④ คำหลัก — ต้องเด่นชัด กรอบหนา เงา ตัวใหญ่ ป้ายแดงชาด */}
            <div data-el="hero" style={{ overflow: 'hidden', position: 'relative', zIndex: 1, background: 'var(--surface,#fffdf6)', border: '2px solid var(--primary,#6b4f2a)', borderRadius: '15px', padding: '16px 22px 15px', boxShadow: '0 14px 30px -18px rgba(40,28,14,.6)', textAlign: 'center', marginBottom: kids.length ? '74px' : '54px', animation: 'wwRise .5s cubic-bezier(.2,.8,.25,1) both' }}>
              <span style={{ display: 'inline-block', fontSize: '9.5px', letterSpacing: '.22em', textTransform: 'uppercase', color: '#fdf6e8', background: 'var(--accent,#9c3b2b)', borderRadius: '12px', padding: '2px 11px', marginBottom: '9px', lineHeight: 1.9, animation: 'wwBadge .42s cubic-bezier(.2,.9,.3,1) .28s both' }}>
                {(w.parents || []).length ? 'คำที่กำลังดู' : 'วลีตั้งต้น'}
              </span>
              <div style={{ fontSize: mob ? '21px' : 'clamp(22px,2.4vw,30px)', fontWeight: 700, lineHeight: 1.55, color: '#33291f', wordBreak: 'break-word' }}>{pt.nodes}</div>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,.5) 50%,transparent 62%)', animation: 'wwShine 1s ease .45s 1 both' }} />
              <div style={{ fontSize: '12px', color: '#a99b83', marginTop: '8px' }}>
                {['เกาะอยู่ ' + (w.branches || []).length + ' กิ่ง ใน ' + byCat.size + ' หมวด']
                  .concat((w.novels || []).length > 1 ? ['เจอใน ' + w.novels.length + ' เรื่อง'] : [])
                  .concat((w.parents || []).length ? [] : ['เก็บมาเอง ไม่ได้ตัดจากวลีไหน']).join(' · ')}
              </div>
              {(w.meanings || []).length > 0 && (
                <div style={{ fontSize: '13.5px', color: '#5c5044', marginTop: '6px', paddingTop: '7px', borderTop: '1px solid #eadfc4', display: 'inline-block', textAlign: 'left' }}>
                  {w.meanings.map((m, i) => <div key={i}>{w.meanings.length > 1 ? '· ' : ''}{esc(m)}</div>)}
                </div>
              )}
            </div>

            {/* ② คำที่แตกออกไป — ชิปสีเดียวกับที่ระบายในวลี */}
            {kids.length > 0 && (
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '26px' }}>
                <div style={{ ...secHead, whiteSpace: 'nowrap', paddingTop: '9px', marginBottom: 0 }}>แตกออกเป็น</div>
                <div style={{ display: 'flex', gap: '24px 9px', flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
                  {w.children.map((k, i) => (
                    <button key={k.id} className="wwleaf" data-el="leaf" data-k={i} onClick={() => app.openWordWeb(k.id)}
                      title={k.meaning || 'กดเพื่อดูคำนี้'}
                      style={{ border: 'none', borderRadius: '20px', padding: '6px 15px', fontFamily: 'inherit', fontSize: '15px', color: '#fffaf0', cursor: 'pointer', lineHeight: 1.6, background: PAL[i % PAL.length], boxShadow: '0 6px 14px -8px rgba(40,28,14,.75),inset 0 1px 0 rgba(255,255,255,.22)', opacity: pt.used.has(i) ? 1 : 0.62, animation: `wwPop .42s cubic-bezier(.2,.85,.3,1) ${(0.42 + i * 0.06).toFixed(2)}s both` }}>
                      {esc(k.text)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ③ จากนิยาย — ใช้โครงเดียวกับหมวดเป๊ะ เส้นจะได้ตรงเหมือนกัน */}
            {(w.novels || []).length > 0 && (
              <div data-el="catrow" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: mob ? '18px' : '34px', alignItems: 'start', marginBottom: '14px' }}>
                <div data-el="catnode" data-c="nv" data-col="var(--accent,#9c3b2b)" style={{ alignSelf: 'start', background: 'var(--accent,#9c3b2b)', color: '#fff6ec', borderRadius: '11px', padding: '8px 13px', whiteSpace: 'nowrap', boxShadow: '0 7px 16px -10px rgba(40,28,14,.8)', animation: 'wwSlide .45s cubic-bezier(.2,.8,.25,1) .46s both' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>จากนิยาย</div>
                  <div style={{ fontSize: '11px', opacity: 0.92 }}>{w.novels.length} เรื่อง</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '2px', minWidth: 0 }}>
                  {w.novels.map((v, i) => (
                    <div key={v} data-el="tnode" data-id={'nv.' + i} data-p="" style={{ ...card, borderLeft: '4px solid var(--accent,#9c3b2b)', borderRadius: '0 11px 11px 0', padding: '7px 11px', fontSize: '13.5px', lineHeight: 1.65, color: '#33291f', animation: `wwSlide .4s cubic-bezier(.2,.8,.25,1) ${(0.52 + i * 0.055).toFixed(2)}s both` }}>{esc(v)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ④ หมวด → กิ่ง → กิ่งย่อย แบบ mind map */}
            {catList.map(([cid, list], ci) => {
              const c = catOf(cid);
              const rows = tree(list);
              return (
                <div key={cid} data-el="catrow" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: mob ? '18px' : '34px', alignItems: 'start', marginBottom: '14px' }}>
                  <div data-el="catnode" data-c={cid} data-col={c.c} style={{ alignSelf: 'start', background: c.c, color: '#fffaf0', borderRadius: '11px', padding: '8px 13px', whiteSpace: 'nowrap', boxShadow: '0 7px 16px -10px rgba(40,28,14,.8)', animation: `wwSlide .45s cubic-bezier(.2,.8,.25,1) ${(0.54 + ci * 0.1).toFixed(2)}s both` }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{c.n}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>{list.length} กิ่ง</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', paddingTop: '2px', minWidth: 0 }}>
                    {rows.map((b, j) => (
                      <div key={b.id} data-el="tnode" data-id={b.id} data-p={b.p}
                        style={{ ...card, marginLeft: b.depth * (mob ? 12 : 20) + 'px', borderLeft: '4px solid ' + c.c, borderRadius: '0 11px 11px 0', padding: '7px 11px', minWidth: 0, opacity: b.leaf ? 1 : 0.82, animation: `wwSlide .4s cubic-bezier(.2,.8,.25,1) ${(0.6 + ci * 0.1 + j * 0.055).toFixed(2)}s both` }}>
                        <span style={{ fontSize: b.leaf ? '13.5px' : '12.5px', fontWeight: b.leaf ? 600 : 400, color: b.leaf ? '#33291f' : '#7a6a4f', lineHeight: 1.6 }}>
                          {esc(b.name)}
                          {b.en && <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, color: '#8d7f68', letterSpacing: '.03em' }}>{esc(b.en)}</span>}
                        </span>
                        {b.code && <span style={{ display: 'block', fontSize: '10px', color: '#b0a184', letterSpacing: '.04em', marginTop: '2px' }}>{b.code}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ขวา · ช่องแก้ไข (ชุดเดียวกับหน้าต่างแก้ไขคำเดิม) ──────── */}
        <div style={{ padding: mob ? '0 14px 18px' : '24px 22px', borderLeft: mob ? 'none' : '1px solid #e6d9bb', borderTop: mob ? '1px solid #e6d9bb' : 'none', background: 'rgba(255,253,246,.5)' }}>
          <div style={{ ...secHead, marginTop: mob ? '14px' : 0 }}>แก้ไข</div>
          <button onClick={() => { app.closeWordWeb(); app.openEdit(w.word.id); }}
            style={{ width: '100%', padding: '11px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#5c5044', fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer', marginBottom: '14px' }}>
            ✎ เปิดหน้าต่างแก้ไขคำนี้
          </button>
          <div style={{ fontSize: '12px', color: '#8d7f68', lineHeight: 1.9 }}>
            <div style={{ ...secHead, marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #eadfc4' }}>สรุป</div>
            <div>ชนิด · {({ word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' })[w.word && w.word.kind] || 'ไม่ระบุ'}</div>
            <div>รูปแบบคำ · {(w.word && w.word.word_form) || 'ยังไม่ได้ระบุ'}</div>
            <div>กิ่งที่เกาะอยู่ · {(w.branches || []).length} เส้น</div>
            <div>หมวด · {byCat.size}</div>
            <div>ความหมาย · {(w.meanings || []).length}</div>
            <div>เจอในเรื่อง · {(w.novels || []).length}</div>
            <div>{(w.parents || []).length ? 'ตัดมาจาก · ' + w.parents.length + ' วลี' : 'เก็บมาเอง ไม่ได้ตัดจากวลีไหน'}</div>
            {(w.children || []).length > 0 && <div>แตกออกเป็น · {w.children.length} คำ</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
