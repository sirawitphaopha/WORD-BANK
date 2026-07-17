// รวมหมวด: ย้ายคำจากหมวด from → to แล้วลบหมวด from
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const db = getAdmin();
    const body = await req.json();
    const from = body.from, to = body.to;
    if (!from || !to || from === to) {
      return NextResponse.json({ error: 'เลือกสองหมวดที่ต่างกัน' }, { status: 400 });
    }
    const up = await db.from('wb_words').update({ category_id: to }).eq('category_id', from);
    if (up.error) throw up.error;
    const del = await db.from('wb_categories').delete().eq('id', from);
    if (del.error) throw del.error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
