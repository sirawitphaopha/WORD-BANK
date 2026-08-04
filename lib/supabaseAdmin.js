// Supabase client ฝั่งเซิร์ฟเวอร์เท่านั้น (ใช้ service_role key — ห้ามหลุดไปเบราว์เซอร์)
// ตารางทั้งหมดขึ้นต้น wb_ และเปิด RLS แบบ deny-all → มีแต่ service_role ที่ผ่านได้
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

let _client = null;

export function getAdmin() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ใน .env.local');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// หมวดย่อยของคำหนึ่ง — เก็บเป็นอาร์เรย์ (subpaths) โดย subpath เดิม = อันแรกเสมอ
// รับได้ทั้งของเก่า (string เดี่ยว) และของใหม่ (array) · ตัดค่าว่าง/ซ้ำ
export function toPaths(subpaths, subpath) {
  const arr = Array.isArray(subpaths) ? subpaths : [];
  const all = [...arr, subpath].map((s) => String(s || '').trim()).filter(Boolean);
  return [...new Set(all)];
}

// รายชื่อ "กิ่งหมวดย่อยที่ใช้จริงในคลัง" แยกตามหมวด — ป้อนกลับให้ AI รู้จักกิ่งที่งอกใหม่
// (lib/subtree.js เป็นไฟล์นิ่งจากตอนตั้งต้น ไม่มีกิ่งใหม่ที่ผู้ใช้สร้างเอง)
export async function livePathsByCat(db) {
  const out = {};
  const add = (cid, paths) => {
    if (!cid) return;
    if (!out[cid]) out[cid] = new Set();
    paths.forEach((p) => { if (p) out[cid].add(p); });
  };

  // แหล่งที่ 1: ทะเบียนกิ่ง (wb_branches) — รวมกิ่งที่ยังไม่มีคำอยู่เลย
  // สำคัญ: ถ้าไม่มีแหล่งนี้ กิ่งที่ผู้ใช้สร้างไว้แต่ยังไม่ได้ใส่คำจะหายไปจากสายตา AI
  // แล้ว AI จะประดิษฐ์กิ่งความหมายซ้ำขึ้นมาใหม่ (ปัญหาที่วัดได้จริงในการทดสอบ)
  try {
    const br = await db.from('wb_branches').select('category_id, path');
    if (!br.error && br.data) br.data.forEach((row) => add(row.category_id, [row.path]));
  } catch (e) { /* ยังไม่ได้รัน scripts/009 ก็ไม่เป็นไร ตกไปใช้แหล่งที่ 2 */ }

  // แหล่งที่ 2: กิ่งที่มีคำอยู่จริงในคลัง — เผื่อมีกิ่งที่ยังไม่ได้ลงทะเบียน
  const res = await db.from('wb_words').select('category_id, subpath, subpaths');
  if (!res.error && res.data) res.data.forEach((row) => add(row.category_id, toPaths(row.subpaths, row.subpath)));

  Object.keys(out).forEach((k) => { out[k] = [...out[k]]; });
  return out;
}

// ลงทะเบียนกิ่งใหม่เข้า wb_branches — เรียกตอนบันทึกคำเข้าคลัง
// ทำแบบ fire-and-forget: ถ้าล้มเหลวห้ามให้กระทบการบันทึกคำ (ทะเบียนกิ่งเป็นข้อมูลเสริม ไม่ใช่ข้อมูลหลัก)
export async function registerBranches(db, rows, source) {
  try {
    const seen = new Set();
    const add = [];
    (rows || []).forEach((r) => {
      const cid = r && (r.category_id || r.category);
      if (!cid) return;
      toPaths(r.subpaths, r.subpath).forEach((p) => {
        const k = cid + '|' + p;
        if (seen.has(k)) return;
        seen.add(k);
        add.push({ category_id: cid, path: p, code: tempBranchCode(cid, p), source: source || 'user' });
      });
    });
    if (!add.length) return 0;
    // กิ่งที่มีอยู่แล้วให้ข้ามไป ไม่ทับของเดิม (ค่า source กับ code เดิมจะคงไว้)
    const r = await db.from('wb_branches').upsert(add, { onConflict: 'category_id,path', ignoreDuplicates: true });
    return r.error ? 0 : add.length;
  } catch (e) { return 0; }
}

// ══════════════════════════════════════════════════════════════════
// 🕸 ระบบใยแมงมุม — ตารางเส้นเชื่อม (scripts/014_word_web.sql)
//
// 🔑 หลักคิดของทั้งก้อนนี้: "ไม่มีคำว่าข้าม มีแต่สร้างใหม่กับเพิ่มเส้น"
//    คำซ้ำไม่ใช่ของเสีย แต่คือคำเดียวกันที่เจอในบริบทใหม่
//    เจอซ้ำ = เพิ่มเฉพาะเส้นที่ยังไม่มี · ไม่ทิ้ง และไม่สร้างแถวใหม่
//    (เจ้าของคลังสั่งเอง 31 ก.ค. — "มันซ้ำแค่วลี แต่ทั้งชื่อนิยายก็ไม่ซ้ำนะ และอาจจะไปหมวดใหม่ได้")
// ══════════════════════════════════════════════════════════════════

// ทำข้อความให้เป็นมาตรฐานก่อนเทียบ — ตัดช่องว่างหัวท้าย + ยุบช่องว่างซ้อน
// 🚨 ห้ามแปลงตัวอักษรใด ๆ นอกจากนี้เด็ดขาด
//    คำไทยที่ต่างกันแค่วรรณยุกต์คือคนละคำ (`เต็มเหนียว` ≠ `เต็มเหนี่ยว`)
//    การเดาว่าสองคำ "น่าจะ" เป็นคำเดียวกัน = เสี่ยงยุบคำที่เจ้าของคลังตั้งใจแยก
export function normText(t) {
  return String(t == null ? '' : t).trim().replace(/\s+/g, ' ');
}

// รหัสชั่วคราวของกิ่งที่ผู้ใช้หรือ AI เพิ่งสร้างจากหน้าเว็บ
// รหัสถาวร (A01-00-000) ออกโดย scripts/gen_branch_codes.py ซึ่งรันตอนเกลาโครงกิ่ง
// กิ่งที่เกิดกลางทางจึงยังไม่มีรหัส แต่ตารางเส้นเชื่อมบังคับให้มี → ออกรหัสชั่วคราวให้ก่อน
// คำนวณจาก (หมวด + เส้นทาง) จึงได้ค่าเดิมทุกครั้ง ไม่ขึ้นกับลำดับหรือเวลา
export function tempBranchCode(categoryId, path) {
  return 'U-' + createHash('sha1').update(categoryId + '|' + path).digest('hex').slice(0, 8);
}

// map "หมวด|เส้นทาง" → รหัสกิ่ง · ใช้ตอนเขียนเส้นเชื่อมคำกับกิ่ง
export async function branchCodeMap(db) {
  const out = new Map();
  const r = await db.from('wb_branches').select('category_id,path,code');
  (r.data || []).forEach((b) => {
    if (b.code) out.set(b.category_id + '|' + b.path, b.code);
  });
  return out;
}

// เขียนเส้นเชื่อมทั้ง 4 ชุดของคำชุดหนึ่ง
//   entries = [{ id, text, category_id, paths[], novels[], meanings[], parents[{text,kind}] }]
// ทุกตารางมี unique อยู่แล้ว จึง upsert แบบข้ามของซ้ำได้ปลอดภัย → รันซ้ำไม่เกิดเส้นซ้อน
// 🛡 ล้มเหลวไม่ทำให้การบันทึกคำพัง (คำอยู่ใน wb_words แล้ว) แต่คืนจำนวนที่เขียนได้จริงเสมอ
export async function writeWordWeb(db, entries) {
  const stat = { branches: 0, novels: 0, meanings: 0, links: 0 };
  try {
    const list = (entries || []).filter((e) => e && e.id);
    if (!list.length) return stat;
    const codeOf = await branchCodeMap(db);
    const idOf = new Map(list.map((e) => [normText(e.text), e.id]));

    const brRows = [], nvRows = [], mnRows = [], lkRows = [];
    list.forEach((e) => {
      (e.paths || []).forEach((p, i) => {
        const path = String(p || '').trim();
        if (!path) return;
        const cid = e.category_id || 'c8';
        brRows.push({
          word_id: e.id, branch_code: codeOf.get(cid + '|' + path) || tempBranchCode(cid, path),
          category_id: cid, path, is_home: i === 0, source: e.source || 'review',
        });
      });
      (e.novels || []).forEach((n) => {
        const novel = String(n || '').trim();
        if (novel && novel !== 'ไม่ระบุเรื่อง') nvRows.push({ word_id: e.id, novel });
      });
      (e.meanings || []).forEach((m, i) => {
        const meaning = String(m || '').trim();
        if (meaning) mnRows.push({ word_id: e.id, position: i, meaning });
      });
      (e.parents || []).forEach((p) => {
        const parent_text = normText(p && p.text);
        if (!parent_text || parent_text === normText(e.text)) return;   // คำไม่โยงหาตัวเอง
        lkRows.push({
          child_word_id: e.id, parent_word_id: idOf.get(parent_text) || null,
          parent_text, link_kind: (p && p.kind) || 'source',
        });
      });
    });

    const put = async (table, rows, onConflict, key) => {
      if (!rows.length) return;
      // ตัดซ้ำในก้อนเดียวกันก่อน ไม่งั้น upsert จะเถียงกันเองใน batch
      const seen = new Set();
      const uniq = rows.filter((r) => {
        const k = key(r);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      const r = await db.from(table).upsert(uniq, { onConflict, ignoreDuplicates: true });
      if (!r.error) stat[table.replace('wb_word_', '')] = uniq.length;
    };
    await put('wb_word_branches', brRows, 'word_id,branch_code', (r) => r.word_id + '|' + r.branch_code);
    await put('wb_word_novels', nvRows, 'word_id,novel', (r) => r.word_id + '|' + r.novel);
    await put('wb_word_meanings', mnRows, 'word_id,meaning', (r) => r.word_id + '|' + r.meaning);
    await put('wb_word_links', lkRows, 'child_word_id,parent_text,link_kind',
      (r) => r.child_word_id + '|' + r.parent_text + '|' + r.link_kind);
    return stat;
  } catch (e) { return stat; }
}

// map แถวจาก DB → รูปแบบที่ UI ใช้ (n/c/k เหมือนต้นแบบ)
export function mapCategory(row) {
  return { id: row.id, n: row.name_th, en: row.name_en || '', c: row.color || '#8a8175', k: row.glyph || '•', proposed: !!row.proposed };
}
// แถวห้องพักตรวจทาน (wb_review) → รูปแบบที่ UI ใช้ในหน้าตรวจทาน
export function mapReview(row) {
  return {
    id: row.id,
    text: row.text,
    original: row.original || null,
    meaning: row.meaning || '',
    kind: row.kind || '',
    wordForm: row.word_form || '',       // คำนี้สร้างขึ้นยังไง (คำซ้อน/คำซ้ำ/คำประสม/คำทับศัพท์)
    category: row.category_id || 'c8',
    subpath: row.subpath || '',
    subpaths: toPaths(row.subpaths, row.subpath),
    source: row.source || '',
    reason: row.reason || '',
    proposedNew: !!row.proposed_new,
    notes: Array.isArray(row.notes) ? row.notes : [],
    // ช่อคำ — แต่ละรอบที่กดจัดคำ = หนึ่งช่อ (ดู scripts/007)
    batch: row.batch || 'b_legacy',
    batchNo: row.batch_no || 1,
    batchAt: row.batch_at ? Number(row.batch_at) : 0,
    batchAi: row.batch_ai || '',
    novel: row.novel || '',
    selected: false,
  };
}
// review item (ฝั่ง UI) → แถวสำหรับเก็บลง wb_review
export function reviewRow(r, i, novel) {
  return {
    id: r.id,
    text: (r.text || '').trim(),
    original: r.original || null,
    meaning: (r.meaning || '').trim() || null,
    kind: r.kind || null,
    word_form: r.wordForm || null,
    category_id: r.category || null,
    // subpath = หมวดย่อยหลัก (อันแรกของ subpaths) เก็บคู่กันเสมอเพื่อความเข้ากันได้กับของเดิม
    subpath: toPaths(r.subpaths, r.subpath)[0] || null,
    subpaths: toPaths(r.subpaths, r.subpath),
    source: r.source || null,
    reason: r.reason || null,
    proposed_new: !!r.proposedNew,
    notes: Array.isArray(r.notes) ? r.notes : [],
    // เรื่องเก็บรายคำ (แต่ละช่ออาจคนละเรื่อง) — ถ้าคำไม่มีเรื่องของตัวเอง ใช้เรื่องที่ส่งมาเป็นค่ากลาง
    novel: r.novel || novel || null,
    batch: r.batch || 'b_legacy',
    batch_no: r.batchNo || 1,
    batch_at: r.batchAt || null,
    batch_ai: r.batchAi || null,
    position: i,
  };
}
// ---------- tombstone ช่อที่ตั้งใจลบ (กันตาข่ายกันช่อหายฟื้นกลับ · ดู scripts/013) ----------
// upsert ป้าย "ลบแล้ว" ของช่อ · ล้มไม่ throw (ตารางอาจยังไม่ได้สร้าง = ตกไปทำงานแบบเดิม)
export async function tombstoneBatches(db, batches) {
  const list = [...new Set((batches || []).filter(Boolean).map(String))];
  if (!list.length) return;
  try { await db.from('wb_review_deleted').upsert(list.map((b) => ({ batch: b })), { onConflict: 'batch' }); }
  catch (e) { /* ตารางยังไม่มี ก็ไม่เป็นไร */ }
}
// เอาป้าย "ลบแล้ว" ออก (เมื่อช่อถูกสร้าง/ใส่กลับเข้ามาจริง)
export async function untombstoneBatches(db, batches) {
  const list = [...new Set((batches || []).filter(Boolean).map(String))];
  if (!list.length) return;
  try { await db.from('wb_review_deleted').delete().in('batch', list); } catch (e) {}
}
// ดึงรายชื่อช่อที่ถูกลบ (ให้ฝั่งเว็บรู้ว่าห้ามฟื้นช่อไหน)
export async function deletedBatches(db) {
  try {
    const r = await db.from('wb_review_deleted').select('batch');
    if (!r.error && Array.isArray(r.data)) return r.data.map((x) => x.batch).filter(Boolean);
  } catch (e) {}
  return [];
}

export function mapWord(row) {
  return {
    id: row.id,
    text: row.text,
    original: row.original_text || null,
    kind: row.kind || '',
    category: row.category_id || 'c8',
    subcategory: row.subcategory || '',
    subpath: row.subpath || '',
    subpaths: toPaths(row.subpaths, row.subpath),
    highlight: row.highlight || '',
    meaning: row.meaning || '',
    reason: row.reason || '',
    novel: row.novel || 'ไม่ระบุ',
    date: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    reviewed: row.reviewed !== false,
  };
}
