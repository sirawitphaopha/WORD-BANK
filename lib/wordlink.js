// 🕸 ระบบโยงอัตโนมัติ — "คำนี้ไปโผล่อยู่ในวลีไหนบ้างในคลัง"
//
// พี่กันสั่ง 12 ส.ค. 2569 — _"ทำระบบโยงอัตโนมัตินี้เลย"_
//
// 🎯 ปัญหาที่แก้
//    เดิมเว็บโยงเส้นได้เฉพาะตอน AI สกัดคำในรอบนั้นแล้วบอกมาว่าตัดจากวลีไหน (ช่อง source)
//    ถ้าเก็บคำใหม่เข้ามา แล้วคำนั้นไปโผล่อยู่ในวลีเก่าที่นอนอยู่ในคลังแล้ว → ระบบไม่รู้เลย
//    ผลคือคำเดียวกันอยู่ 2 ที่โดยไม่รู้จักกัน — ตรวจเจอ 450 คู่เมื่อ 12 ส.ค. 2569
//
// 🔑 เส้นที่ระบบนี้สร้าง = ชนิด 'contains' (คำนี้โผล่อยู่ในวลีนี้)
//    **คนละชนิดกับ 'source' (ตัดมาจากวลีนี้)** เพราะเราไม่มีหลักฐานว่าตัดมาจริง
//    ตารางเก็บ unique (คำลูก, วลีแม่, ชนิด) จึงอยู่ร่วมกันได้ ไม่ทับกัน
//
// 🚨 ตัวกรองคำพ้องตัวอักษร — จุดสำคัญที่สุดของไฟล์นี้
//    การค้นข้อความล้วนจะเจอคำที่บังเอิญตัวอักษรซ้อนกัน แต่คนละคำสนิท
//      `เรี่ย` (ห้อยต่ำเฉียดพื้น) ไปโผล่ใน `หมดเรี่ยวหมดแรง` → คนละคำ
//      `โครม` (เสียงของหนักตก)  ไปโผล่ใน `ครึกโครม`        → คนละคำ
//      `คลี่` (กางของที่พับ)      ไปโผล่ใน `คลี่คลายปัญหา`     → คนละคำ
//    → ใช้ตัวซอยคำไทยของเอนจิน (Intl.Segmenter) เช็คว่าคำนั้นตรงกับ "ขอบคำ" จริงไหม
//    ⚠️ ตัวซอยคำไม่แม่น 100% (ลอง 10 คู่พลาด 2) จึงยอมให้ผ่านถ้าคำตรงกับ token ต่อเนื่องพอดี

const MIN_LEN = 4;          // คำสั้นกว่านี้ไม่โยง เสี่ยงพ้องกันสูงเกินไป
export const LINK_KIND = 'contains';

let _seg = null;
function seg() {
  if (_seg === null) {
    try { _seg = new Intl.Segmenter('th', { granularity: 'word' }); }
    catch { _seg = false; }   // เอนจินไม่รองรับ → ปิดตัวกรอง (ดูหมายเหตุใน isWordBoundary)
  }
  return _seg;
}

/**
 * คำนี้อยู่ใน "ขอบคำ" ของวลีจริงไหม (ไม่ใช่แค่ตัวอักษรบังเอิญซ้อน)
 * ผ่านเมื่อ: คำตรงกับ token เดียว หรือตรงกับ token ที่ต่อเนื่องกันพอดี
 */
export function isWordBoundary(word, phrase) {
  const s = seg();
  if (!s) return true;        // ไม่มีตัวซอยคำ = ไม่กรอง (ยอมให้ผ่านดีกว่าตัดของถูกทิ้ง)
  const toks = [...s.segment(phrase)].map((t) => t.segment);
  const w = word.trim();
  let acc = '';
  for (let i = 0; i < toks.length; i++) {
    acc = '';
    for (let j = i; j < toks.length; j++) {
      acc += toks[j];
      if (acc === w) return true;     // ตรงพอดีกับ token เดียวหรือหลาย token ต่อกัน
      if (acc.length > w.length) break;
    }
  }
  return false;
}

/**
 * หาเส้น "พบร่วมกัน" ของคำชุดหนึ่ง เทียบกับคลังทั้งหมด — ค้น 2 ทาง
 *   ทาง ก · คำเดี่ยวที่เพิ่งเก็บ  → ไปโผล่ในวลีเก่าที่มีอยู่ในคลังไหม
 *   ทาง ข · วลีที่เพิ่งเก็บ       → มีคำเดี่ยวเก่าของคลังอยู่ข้างในไหม
 *
 * @param  rows   คำในคลังทั้งหมด [{id,text,kind}]
 * @param  items  คำที่เพิ่งบันทึกรอบนี้ [{id,text,kind}]
 * @param  has    ฟังก์ชันเช็คว่ามีเส้นนี้อยู่แล้วไหม (childId, parentText) => bool
 * @return [{ child_id, child_text, parent_id, parent_text }]
 */
export function findCooccur(rows, items, has = () => false) {
  const isMulti = (r) => r.kind !== 'word';
  const norm = (s) => String(s || '').trim();

  const libWords  = rows.filter((r) => !isMulti(r) && norm(r.text).length >= MIN_LEN);
  const libPhrase = rows.filter((r) => isMulti(r));
  const out = [];
  const seen = new Set();

  const push = (child, parent) => {
    if (!child?.id || !parent?.id || child.id === parent.id) return;
    const key = child.id + '|' + norm(parent.text);
    if (seen.has(key)) return;
    if (has(child.id, norm(parent.text))) return;
    seen.add(key);
    out.push({
      child_id: child.id, child_text: norm(child.text),
      parent_id: parent.id, parent_text: norm(parent.text),
    });
  };

  for (const it of items) {
    const t = norm(it.text);
    if (!t) continue;

    if (!isMulti(it) && t.length >= MIN_LEN) {
      // ทาง ก — คำเดี่ยวที่เพิ่งเก็บ ไปโผล่ในวลีเก่าไหม
      for (const p of libPhrase) {
        const pt = norm(p.text);
        if (pt === t || !pt.includes(t)) continue;
        if (!isWordBoundary(t, pt)) continue;
        push(it, p);
      }
    } else if (isMulti(it)) {
      // ทาง ข — วลีที่เพิ่งเก็บ มีคำเดี่ยวเก่าอยู่ข้างในไหม
      for (const w of libWords) {
        const wt = norm(w.text);
        if (wt === t || !t.includes(wt)) continue;
        if (!isWordBoundary(wt, t)) continue;
        push(w, it);
      }
    }
  }
  return out;
}

/**
 * ทำงานจริงกับฐานข้อมูล — อ่านคลัง หาเส้นที่ขาด แล้วเขียนเพิ่ม
 * 🛡 เพิ่มอย่างเดียว ไม่ลบไม่แก้เส้นเดิมสักเส้น
 */
export async function autoLink(db, items) {
  const got = await db.from('wb_words').select('id,text,kind');
  if (got.error) throw got.error;
  const rows = got.data || [];

  const ids = items.map((i) => i.id).filter(Boolean);
  let has = () => false;
  if (ids.length) {
    const cur = await db.from('wb_word_links').select('child_word_id,parent_text').in('child_word_id', ids);
    if (!cur.error) {
      const set = new Set((cur.data || []).map((l) => l.child_word_id + '|' + String(l.parent_text).trim()));
      has = (cid, ptext) => set.has(cid + '|' + ptext);
    }
  }

  const found = findCooccur(rows, items, has);
  if (!found.length) return { added: 0, links: [] };

  const ins = await db.from('wb_word_links').upsert(
    found.map((f) => ({
      child_word_id: f.child_id,
      parent_word_id: f.parent_id,
      parent_text: f.parent_text,
      link_kind: LINK_KIND,
    })),
    { onConflict: 'child_word_id,parent_text,link_kind', ignoreDuplicates: true },
  ).select('id');
  if (ins.error) throw ins.error;

  return { added: (ins.data || []).length, links: found };
}

/**
 * 🧹 เก็บกวาดเส้นที่เสีย — เส้นที่ "โกหก" เพราะข้อมูลเปลี่ยนไปหลังจากที่โยงไว้
 *
 * เจ้าของคลังเตือนเอง 12 ส.ค. 2569 — _"คำใหม่ที่เข้าคลัง ต้องผ่านการตรวจทานเรียบร้อยแล้วนะ
 * ถ้าพิมพ์ผิดแล้วเข้ามาก็พังได้"_
 *
 * เส้นเสีย 2 แบบที่เจอจริงในคลัง (10 เส้น เมื่อ 12 ส.ค.)
 *   ① ชี้ไปหาคำหรือวลีที่ถูกลบไปแล้ว — วลีแม่ถูกลบตั้งแต่ 3 ส.ค. แต่เส้นยังค้าง
 *   ② คำไม่ได้อยู่ในวลีนั้นจริง — เช่น "ขี้ริ้วขี้เหร่" โยงไปหา "คนขี้ริ้ว" ซึ่งกลับด้านกัน
 *
 * 🛡 ลบเฉพาะ 2 แบบนี้ ห้ามแตะเส้นอื่น
 */
export async function sweepBrokenLinks(db) {
  const [got, links] = await Promise.all([
    db.from('wb_words').select('id,text'),
    db.from('wb_word_links').select('id,child_word_id,parent_word_id,parent_text'),
  ]);
  if (got.error) throw got.error;
  if (links.error) throw links.error;

  const text = new Map((got.data || []).map((w) => [w.id, String(w.text || '').trim()]));
  const dead = [];
  for (const l of links.data || []) {
    const ct = text.get(l.child_word_id);
    if (ct === undefined) { dead.push(l.id); continue; }                    // ① คำลูกหายไป
    if (l.parent_word_id && !text.has(l.parent_word_id)) { dead.push(l.id); continue; }  // ① วลีแม่หายไป
    const pt = String(l.parent_text || '').trim();
    if (pt && ct && !pt.includes(ct)) dead.push(l.id);                      // ② คำไม่ได้อยู่ในวลีจริง
  }
  if (!dead.length) return { removed: 0 };

  const del = await db.from('wb_word_links').delete().in('id', dead).select('id');
  if (del.error) throw del.error;
  return { removed: (del.data || []).length };
}

/**
 * ✏️ คำถูกแก้ข้อความ → เส้นเดิมของคำนั้นไม่จริงอีกต่อไป ต้องล้างแล้วค้นใหม่
 *
 * ทำ 3 อย่าง
 *   ① อัปเดตข้อความวลีแม่ในเส้นที่ชี้มาหาคำนี้ (คำนี้เป็นแม่ของคนอื่น)
 *   ② ลบเส้นชนิด "พบร่วมกัน" ทั้งหมดที่เกี่ยวกับคำนี้ — คำเปลี่ยน = ความจริงเปลี่ยน
 *      🔑 ปลอดภัยเพราะเส้นชนิดนี้คำนวณใหม่ได้เสมอ ต่างจากเส้น "ตัดมาจาก" ที่เป็นประวัติจริง
 *   ③ ค้นใหม่ตามข้อความใหม่
 */
export async function relinkWord(db, wordId) {
  const w = await db.from('wb_words').select('id,text,kind').eq('id', wordId).single();
  if (w.error) throw w.error;
  const row = w.data;

  // ① คำนี้เป็นวลีแม่ของเส้นไหนอยู่ → อัปเดตข้อความให้ตรงของใหม่
  await db.from('wb_word_links').update({ parent_text: row.text }).eq('parent_word_id', wordId);

  // ② ล้างเส้น "พบร่วมกัน" ที่เกี่ยวกับคำนี้ทั้ง 2 ทาง
  await db.from('wb_word_links').delete().eq('link_kind', LINK_KIND).eq('child_word_id', wordId);
  await db.from('wb_word_links').delete().eq('link_kind', LINK_KIND).eq('parent_word_id', wordId);

  // ③ ค้นใหม่ + เก็บกวาดเส้นที่เสียไปพร้อมกัน
  const [auto, swept] = await Promise.all([
    autoLink(db, [{ id: row.id, text: row.text, kind: row.kind }]),
    sweepBrokenLinks(db),
  ]);
  return { added: auto.added, removed: swept.removed };
}
