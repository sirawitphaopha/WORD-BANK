// Supabase client ฝั่งเซิร์ฟเวอร์เท่านั้น (ใช้ service_role key — ห้ามหลุดไปเบราว์เซอร์)
// ตารางทั้งหมดขึ้นต้น wb_ และเปิด RLS แบบ deny-all → มีแต่ service_role ที่ผ่านได้
import { createClient } from '@supabase/supabase-js';

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
        add.push({ category_id: cid, path: p, source: source || 'user' });
      });
    });
    if (!add.length) return 0;
    // กิ่งที่มีอยู่แล้วให้ข้ามไป ไม่ทับของเดิม (ค่า source เดิมจะคงไว้)
    const r = await db.from('wb_branches').upsert(add, { onConflict: 'category_id,path', ignoreDuplicates: true });
    return r.error ? 0 : add.length;
  } catch (e) { return 0; }
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
