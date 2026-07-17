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

// map แถวจาก DB → รูปแบบที่ UI ใช้ (n/c/k เหมือนต้นแบบ)
export function mapCategory(row) {
  return { id: row.id, n: row.name_th, en: row.name_en || '', c: row.color || '#8a8175', k: row.glyph || '•', proposed: !!row.proposed };
}
export function mapWord(row) {
  return {
    id: row.id,
    text: row.text,
    original: row.original_text || null,
    category: row.category_id || 'c8',
    subcategory: row.subcategory || '',
    subpath: row.subpath || '',
    highlight: row.highlight || '',
    meaning: row.meaning || '',
    novel: row.novel || 'ไม่ระบุ',
    date: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    reviewed: row.reviewed !== false,
  };
}
