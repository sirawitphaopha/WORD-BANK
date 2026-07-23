// ห้องพักคำตรวจทาน (wb_review) — เก็บคำที่ AI แยกเสร็จแต่ยังไม่บันทึกเข้าคลัง บนคลาวด์
// คลาวด์เป็นหลัก · ฝั่งเว็บ optimistic (อัปเดตจอก่อน แล้วยิงมาที่นี่เบื้องหลัง)
//
// POST { action } :
//   replace {novel, items:[...]}  → แทนที่ทั้งชุด (ลบเก่าทิ้ง + ใส่ใหม่)  ใช้ตอน AI จัดเสร็จ
//   update  {id, patch:{...}}      → แก้ทีละคำ (ตัวคำ/ความหมาย/หมวด/ชนิด)
//   remove  {ids:[...]}            → ลบบางคำ
//   clear   {}                     → ล้างทั้งห้อง (ทิ้งทั้งหมด / หลังบันทึกเข้าคลัง)
import { NextResponse } from 'next/server';
import { getAdmin, reviewRow, mapReview, tombstoneBatches, untombstoneBatches, deletedBatches } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// filter ที่ match ทุกแถว (Supabase บังคับต้องมี filter ตอน delete)
const ALL = (q) => q.not('id', 'is', null);

// GET — ดึงคำตรวจทานสด + รายชื่อช่อที่ถูกลบ (tombstone) ไว้ให้ฝั่งเว็บซิงค์อัตโนมัติข้ามแท็บ/เครื่อง
export async function GET() {
  try {
    const db = getAdmin();
    const [review, dead] = await Promise.all([
      db.from('wb_review').select('*').order('position', { ascending: true }),
      deletedBatches(db),
    ]);
    if (review.error) throw review.error;
    const reviewNovel = review.data.length ? (review.data[0].novel || 'ไม่ระบุเรื่อง') : '';
    return NextResponse.json({ review: review.data.map(mapReview), deletedBatches: dead, reviewNovel });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const db = getAdmin();
    const body = await req.json();
    const action = body.action;

    if (action === 'replace') {
      const novel = (body.novel || '').trim() || null;
      const items = Array.isArray(body.items) ? body.items : [];
      const del = await ALL(db.from('wb_review').delete());
      if (del.error) throw del.error;
      if (items.length) {
        const rows = items.filter((r) => r && r.text && r.text.trim()).map((r, i) => reviewRow(r, i, novel));
        const ins = await db.from('wb_review').insert(rows);
        if (ins.error) throw ins.error;
        // ช่อที่เพิ่งใส่กลับเข้ามา = ไม่ใช่ช่อที่ลบแล้ว → เอาป้าย tombstone ออก
        await untombstoneBatches(db, rows.map((r) => r.batch));
      }
      return NextResponse.json({ ok: true, count: items.length });
    }

    if (action === 'update') {
      const id = body.id;
      const p = body.patch || {};
      if (!id) return NextResponse.json({ error: 'ไม่มี id' }, { status: 400 });
      // แปลงชื่อฟิลด์ฝั่ง UI → คอลัมน์ DB (เฉพาะที่ส่งมา)
      const row = {};
      if ('text' in p) row.text = (p.text || '').trim();
      if ('meaning' in p) row.meaning = (p.meaning || '').trim() || null;
      if ('kind' in p) row.kind = p.kind || null;
      if ('category' in p) row.category_id = p.category || null;
      if ('subpath' in p) row.subpath = p.subpath || null;
      if ('proposedNew' in p) row.proposed_new = !!p.proposedNew;
      if (!Object.keys(row).length) return NextResponse.json({ ok: true });
      const up = await db.from('wb_review').update(row).eq('id', id);
      if (up.error) throw up.error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'remove') {
      const ids = Array.isArray(body.ids) ? body.ids : [];
      if (ids.length) {
        const del = await db.from('wb_review').delete().in('id', ids);
        if (del.error) throw del.error;
      }
      // ปักป้าย tombstone ให้ช่อที่ถูกลบหมดทั้งช่อ (กันตาข่ายฟื้นกลับ)
      await tombstoneBatches(db, body.deadBatches);
      return NextResponse.json({ ok: true });
    }

    // ลบทั้งช่อ — ใช้ตอนผู้ใช้กดยกเลิกระหว่าง AI ทำงาน (เซิร์ฟเวอร์อาจเขียนช่อนั้นลงไปแล้ว)
    if (action === 'removeBatch') {
      const b = body.batch ? String(body.batch) : '';
      if (!b) return NextResponse.json({ ok: true });
      const del = await db.from('wb_review').delete().eq('batch', b);
      if (del.error) throw del.error;
      await tombstoneBatches(db, [b]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'clear') {
      const del = await ALL(db.from('wb_review').delete());
      if (del.error) throw del.error;
      // ปักป้ายทุกช่อที่ถูกล้าง (ฝั่งเว็บส่ง batches มา) กันเครื่องอื่นฟื้นกลับ
      await tombstoneBatches(db, body.batches);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
