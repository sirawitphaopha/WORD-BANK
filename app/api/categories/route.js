// เพิ่มหมวดใหม่
import { NextResponse } from 'next/server';
import { getAdmin, mapCategory } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const PAL = ['#8f6b4a', '#5f7f92', '#a86a79', '#6f8a56', '#7c6a99', '#3f7d6c'];

export async function POST(req) {
  try {
    const db = getAdmin();
    const body = await req.json();
    const name = (body.name_th || '').trim();
    if (!name) return NextResponse.json({ error: 'ต้องมีชื่อหมวด' }, { status: 400 });
    const cnt = await db.from('wb_categories').select('id', { count: 'exact', head: true });
    const pos = cnt.count || 0;
    const id = body.id || ('c' + Date.now().toString(36));
    const row = {
      id,
      name_th: name,
      name_en: '',
      color: PAL[pos % PAL.length],
      glyph: '✦',
      position: pos,
      proposed: false,
    };
    const r = await db.from('wb_categories').insert(row).select('*').single();
    if (r.error) throw r.error;
    return NextResponse.json({ category: mapCategory(r.data) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
