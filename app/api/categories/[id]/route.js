// เปลี่ยนชื่อ / ลบ หมวด
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    const db = getAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch = {};
    if (body.name_th != null) patch.name_th = String(body.name_th).trim();
    const r = await db.from('wb_categories').update(patch).eq('id', id);
    if (r.error) throw r.error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const db = getAdmin();
    const { id } = await params;
    // ลบได้เฉพาะหมวดที่ไม่มีคำ
    const cnt = await db.from('wb_words').select('id', { count: 'exact', head: true }).eq('category_id', id);
    if ((cnt.count || 0) > 0) {
      return NextResponse.json({ error: 'ยังมีคำอยู่ในหมวดนี้' }, { status: 400 });
    }
    const r = await db.from('wb_categories').delete().eq('id', id);
    if (r.error) throw r.error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
