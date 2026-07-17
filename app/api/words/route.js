// บันทึกคำเข้าคลัง (bulk) จากหน้าตรวจทาน
// รับ: { novel, newCategories:[{id,name_th,color,glyph}], words:[{text,original_text,meaning,category_id}] }
import { NextResponse } from 'next/server';
import { getAdmin, mapWord } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const db = getAdmin();
    const body = await req.json();
    const novel = (body.novel || '').trim();
    const newCats = Array.isArray(body.newCategories) ? body.newCategories : [];
    const words = Array.isArray(body.words) ? body.words : [];

    // 1) หมวดใหม่ที่เสนอ → บันทึกก่อน (proposed = false เพราะยืนยันแล้ว)
    if (newCats.length) {
      const rows = newCats.map((c, i) => ({
        id: c.id,
        name_th: c.name_th,
        name_en: c.name_en || '',
        color: c.color || '#8f6b4a',
        glyph: c.glyph || '✦',
        position: 100 + i,
        proposed: false,
      }));
      const r = await db.from('wb_categories').upsert(rows, { onConflict: 'id' });
      if (r.error) throw r.error;
    }

    // 2) เรื่องใหม่ → เพิ่มเข้า wb_novels (ถ้ายังไม่มี)
    if (novel && novel !== 'ไม่ระบุเรื่อง') {
      await db.from('wb_novels').upsert({ title: novel }, { onConflict: 'title' });
    }

    // 3) บันทึกคำ
    if (!words.length) return NextResponse.json({ words: [] });
    const rows = words
      .filter((w) => w.text && w.text.trim())
      .map((w) => ({
        text: w.text.trim(),
        original_text: w.original_text || null,
        meaning: (w.meaning || '').trim() || null,
        category_id: w.category_id || 'c8',
        kind: w.kind || null,
        subpath: w.subpath || null,
        subcategory: w.subpath ? String(w.subpath).split(' / ').pop() : null,
        novel: novel || null,
        reviewed: true,
      }));
    const ins = await db.from('wb_words').insert(rows).select('*');
    if (ins.error) throw ins.error;
    return NextResponse.json({ words: ins.data.map(mapWord) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
