// แก้ไข / ลบ คำเดี่ยว ในคลัง
import { NextResponse } from 'next/server';
import { getAdmin, mapWord } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    const db = getAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch = {};
    if (body.text != null) patch.text = String(body.text).trim();
    if (body.meaning != null) patch.meaning = String(body.meaning).trim() || null;
    if (body.category_id != null) patch.category_id = body.category_id;
    if (body.novel != null) patch.novel = String(body.novel).trim() || null;
    const r = await db.from('wb_words').update(patch).eq('id', id).select('*').single();
    if (r.error) throw r.error;
    return NextResponse.json({ word: mapWord(r.data) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const db = getAdmin();
    const { id } = await params;
    const r = await db.from('wb_words').delete().eq('id', id);
    if (r.error) throw r.error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
