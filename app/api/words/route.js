// บันทึกคำเข้าคลัง (bulk) จากหน้าตรวจทาน
// รับ: { novel, newCategories:[{id,name_th,color,glyph}], words:[{text,original_text,meaning,category_id}] }
import { NextResponse } from 'next/server';
import { getAdmin, mapWord, toPaths, registerBranches } from '@/lib/supabaseAdmin';

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
      .map((w) => {
        // คำหนึ่งติดได้หลายกิ่ง — subpath (เดี่ยว) = กิ่งหลัก = อันแรกของ subpaths เสมอ
        const paths = toPaths(w.subpaths, w.subpath);
        return {
        text: w.text.trim(),
        original_text: w.original_text || null,
        meaning: (w.meaning || '').trim() || null,
        reason: (w.reason || '').trim() || null,   // เหตุผลที่ AI เขียนกำกับการจัดหมวด ติดไปกับคำตลอด
        category_id: w.category_id || 'c8',
        kind: w.kind || null,
        subpath: paths[0] || null,
        subpaths: paths,
        subcategory: paths[0] ? String(paths[0]).split(' / ').pop() : null,
        novel: novel || null,
        reviewed: true,
        };
      });
    const ins = await db.from('wb_words').insert(rows).select('*');
    if (ins.error) throw ins.error;
    // ลงทะเบียนกิ่งที่ใช้ในรอบนี้เข้าทะเบียนกิ่ง (wb_branches) — กิ่งเดิมถูกข้าม ไม่ทับ
    // ทำแบบ fire-and-forget ถ้าล้มเหลวไม่กระทบการบันทึกคำ
    registerBranches(db, rows, 'user').catch(() => {});
    return NextResponse.json({ words: ins.data.map(mapWord) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
