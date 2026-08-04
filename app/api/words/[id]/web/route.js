// 🕸 เส้นเชื่อมทั้งหมดของคำหนึ่งคำ — ใช้ในหน้ารายละเอียดคำ (ผังใยความคิด)
//
// ตอบ ๔ อย่างที่เจ้าของคลังกำหนดไว้ตอนออกแบบม็อคอัป
//   ① คำนี้ตัดมาจากวลีไหนบ้าง (กดกลับไปได้)
//   ② หรือไม่ได้ตัดจากไหนเลยเพราะเก็บมาเอง
//   ③ เจอในนิยายเรื่องไหนบ้าง
//   ④ อยู่หมวดไหน กิ่งไหนบ้าง
//
// ดึงตอนกดคำเท่านั้น ไม่โหลดมาพร้อมคลังทั้งก้อน (เส้นเชื่อมมีหลายพันเส้น)
import { NextResponse } from 'next/server';
import { getAdmin, normText } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    const db = getAdmin();
    const { id } = await params;

    const me = await db.from('wb_words').select('*').eq('id', id).single();
    if (me.error) throw me.error;
    const w = me.data;

    const [br, nv, mn, up, down] = await Promise.all([
      db.from('wb_word_branches').select('branch_code,category_id,path,is_home').eq('word_id', id),
      db.from('wb_word_novels').select('novel').eq('word_id', id),
      db.from('wb_word_meanings').select('position,meaning').eq('word_id', id).order('position'),
      // วลีแม่ที่คำนี้ถูกตัดออกมา
      db.from('wb_word_links').select('parent_word_id,parent_text,link_kind').eq('child_word_id', id),
      // คำลูกที่ถูกตัดออกจากคำนี้ (ตัวเองเป็นวลีแม่ของใครบ้าง)
      db.from('wb_word_links').select('child_word_id,link_kind').eq('parent_word_id', id),
    ]);

    // ชื่อกิ่งกับนิยามของแต่ละเส้น — เอามาจากทะเบียนกิ่งเพื่อให้ผังแสดงชื่ออังกฤษได้ด้วย
    const codes = (br.data || []).map((b) => b.branch_code).filter(Boolean);
    const meta = codes.length
      ? await db.from('wb_branches').select('code,name_en,definition').in('code', codes)
      : { data: [] };
    const metaOf = new Map((meta.data || []).map((b) => [b.code, b]));

    // ข้อความของคำลูก — ต้องดึงอีกรอบเพราะตาราง links เก็บแต่รหัส
    const kidIds = (down.data || []).map((r) => r.child_word_id).filter(Boolean);
    const kids = kidIds.length
      ? await db.from('wb_words').select('id,text,meaning').in('id', kidIds)
      : { data: [] };

    // วลีแม่ที่อยู่ในคลังจริง → ส่งรหัสไปด้วยเพื่อให้กดกระโดดต่อได้
    const parentIds = (up.data || []).map((r) => r.parent_word_id).filter(Boolean);
    const parents = parentIds.length
      ? await db.from('wb_words').select('id,text').in('id', parentIds)
      : { data: [] };
    const pText = new Map((parents.data || []).map((r) => [r.id, r.text]));

    return NextResponse.json({
      word: {
        id: w.id, text: w.text, kind: w.kind || '', word_form: w.word_form || '', meaning: w.meaning || '',
        category_id: w.category_id, novel: w.novel || '',
      },
      // ④ อยู่หมวดไหน กิ่งไหนบ้าง
      branches: (br.data || []).map((b) => ({
        code: b.branch_code, category_id: b.category_id, path: b.path, is_home: !!b.is_home,
        name_en: (metaOf.get(b.branch_code) || {}).name_en || '',
        definition: (metaOf.get(b.branch_code) || {}).definition || '',
      })),
      // ③ เจอในนิยายเรื่องไหนบ้าง
      novels: (nv.data || []).map((r) => r.novel),
      meanings: (mn.data || []).map((r) => r.meaning),
      // ① ตัดมาจากวลีไหนบ้าง · ว่างเปล่า = ② เก็บมาเอง ไม่ได้ตัดจากไหน
      parents: (up.data || []).map((r) => ({
        id: r.parent_word_id, text: pText.get(r.parent_word_id) || r.parent_text,
        kind: r.link_kind, inLibrary: !!r.parent_word_id,
      })),
      // คำที่ถูกตัดออกไปจากคำนี้ (ใช้ตอนคำที่กดดูเป็นวลีตั้งต้น)
      children: (kids.data || []).map((r) => ({ id: r.id, text: r.text, meaning: r.meaning || '' })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
