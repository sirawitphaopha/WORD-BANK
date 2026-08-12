// แก้ไข / ลบ คำเดี่ยว ในคลัง
import { NextResponse } from 'next/server';
import { getAdmin, mapWord, toPaths } from '@/lib/supabaseAdmin';
import { relinkWord, sweepBrokenLinks } from '@/lib/wordlink';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    const db = getAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch = {};
    if (body.text != null) patch.text = String(body.text).trim();
    if (body.meaning != null) patch.meaning = String(body.meaning).trim() || null;
    // รูปแบบคำ (คำซ้อน/คำซ้ำ/คำประสม/คำทับศัพท์) — ว่าง = ยังไม่ได้ดู เก็บเป็น null
    if (body.word_form !== undefined) patch.word_form = String(body.word_form || '').trim() || null;
    if (body.category_id != null) patch.category_id = body.category_id;
    if (body.novel != null) patch.novel = String(body.novel).trim() || null;
    // แก้หมวดย่อยได้หลายกิ่ง (subpath เดี่ยว = กิ่งหลัก เก็บคู่กันไว้เสมอ)
    if (body.subpaths != null || body.subpath != null) {
      const paths = toPaths(body.subpaths, body.subpath);
      patch.subpaths = paths;
      patch.subpath = paths[0] || null;
      patch.subcategory = paths[0] ? String(paths[0]).split(' / ').pop() : null;
    }
    const r = await db.from('wb_words').update(patch).eq('id', id).select('*').single();
    if (r.error) throw r.error;

    // 🕸 แก้ข้อความคำ = เส้นโยงเดิมไม่จริงอีกต่อไป → ล้างเส้นที่ระบบสร้างแล้วค้นใหม่
    //    (เจ้าของคลังเตือนเอง 12 ส.ค. — คำสะกดผิดที่หลุดเข้ามาแล้วมาแก้ทีหลัง จะทิ้งเส้นผิดค้างไว้)
    //    🚨 ล้มแล้วห้ามทำให้การแก้คำพัง แต่ต้องรายงานกลับ ห้ามเงียบ
    let relink = null;
    if (patch.text != null) {
      try { relink = await relinkWord(db, id); }
      catch (e) { relink = { error: e.message }; }
    }
    return NextResponse.json({ word: mapWord(r.data), relink });
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

    // 🧹 ลบคำแล้วเส้นที่ชี้มาหามันจะค้าง (เก็บข้อความวลีแม่ไว้ด้วย จึงไม่หายเองตาม cascade)
    //    เคยเจอจริง 5 เส้นชี้ไปหาคำที่ถูกลบตั้งแต่ 3 ส.ค. แต่ไม่มีใครเก็บกวาด
    let swept = null;
    try { swept = await sweepBrokenLinks(db); }
    catch (e) { swept = { error: e.message }; }
    return NextResponse.json({ ok: true, swept });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
