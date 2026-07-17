// โหลดข้อมูลทั้งหมดตอนเปิดแอป: หมวด + เรื่อง + คำ
import { NextResponse } from 'next/server';
import { getAdmin, mapCategory, mapWord } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdmin();
    const [cats, novels, words] = await Promise.all([
      db.from('wb_categories').select('*').order('position', { ascending: true }),
      db.from('wb_novels').select('title').order('created_at', { ascending: true }),
      db.from('wb_words').select('*').order('created_at', { ascending: false }),
    ]);
    if (cats.error) throw cats.error;
    if (novels.error) throw novels.error;
    if (words.error) throw words.error;
    return NextResponse.json({
      categories: cats.data.map(mapCategory),
      novels: novels.data.map((n) => n.title),
      words: words.data.map(mapWord),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
