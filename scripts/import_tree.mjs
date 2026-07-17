// นำเข้าคลังคำจริง (ต้นไม้ 3 ชั้น) จาก vocab_tree.json → Supabase
// รันครั้งเดียว: node scripts/import_tree.mjs <path-to-vocab_tree.json>
// อ่านคีย์จาก .env.local (ไม่ echo คีย์)
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
function readEnv() {
  const txt = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const env = {};
  txt.split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); });
  return env;
}
const env = readEnv();
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const src = process.argv[2] || 'vocab_tree.json';
const words = JSON.parse(fs.readFileSync(src, 'utf8'));

const base = Date.now();
const rows = words.map((w, i) => ({
  text: w.text,
  meaning: w.meaning || null,
  category_id: w.category_id,
  subcategory: (w.subpath || '').split(' / ')[0] || null,
  subpath: w.subpath || null,
  highlight: w.highlight || null,
  novel: null,
  reviewed: true,
  created_at: new Date(base - i * 3600000).toISOString(),
}));

async function main() {
  const del = await db.from('wb_words').delete().gte('created_at', '2000-01-01');
  if (del.error) throw del.error;
  console.log('ลบคำเดิมแล้ว');
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const r = await db.from('wb_words').insert(chunk);
    if (r.error) throw r.error;
    console.log('ใส่แล้ว', Math.min(i + 200, rows.length), '/', rows.length);
  }
  const { count } = await db.from('wb_words').select('*', { count: 'exact', head: true });
  console.log('รวมในฐานข้อมูล:', count);
}
main().catch(e => { console.error('ERROR', e.message); process.exit(1); });
