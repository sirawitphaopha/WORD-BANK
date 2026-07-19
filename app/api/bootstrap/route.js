// โหลดข้อมูลทั้งหมดตอนเปิดแอป: หมวด + เรื่อง + คำ
import { NextResponse } from 'next/server';
import { getAdmin, mapCategory, mapWord, mapReview } from '@/lib/supabaseAdmin';
import { PROVIDERS, PROVIDER_ORDER } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdmin();
    const [cats, novels, words, review] = await Promise.all([
      db.from('wb_categories').select('*').order('position', { ascending: true }),
      db.from('wb_novels').select('title').order('created_at', { ascending: true }),
      db.from('wb_words').select('*').order('created_at', { ascending: false }),
      db.from('wb_review').select('*').order('position', { ascending: true }),
    ]);
    if (cats.error) throw cats.error;
    if (novels.error) throw novels.error;
    if (words.error) throw words.error;
    if (review.error) throw review.error;
    // เรื่องของคำที่ค้างในห้องพัก (โชว์ที่หัวหน้าตรวจทาน)
    const reviewNovel = review.data.length ? (review.data[0].novel || 'ไม่ระบุเรื่อง') : '';
    // AI เจ้าไหนใส่กุญแจไว้แล้วบ้าง — ส่งกลับเป็น true/false เท่านั้น ตัวกุญแจไม่ออกจากเซิร์ฟเวอร์
    const aiReady = {};
    PROVIDER_ORDER.forEach((k) => {
      const p = PROVIDERS[k];
      if (!p) return;
      aiReady[k] = p.needsKey === false ? true : !!(p.envKey && process.env[p.envKey]);
    });
    return NextResponse.json({
      categories: cats.data.map(mapCategory),
      novels: novels.data.map((n) => n.title),
      words: words.data.map(mapWord),
      review: review.data.map(mapReview),
      reviewNovel,
      aiReady,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
