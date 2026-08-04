// บันทึกคำเข้าคลัง (bulk) จากหน้าตรวจทาน
//
// 🕸 ตั้งแต่ 3 ส.ค. 2569 ทำงานตามระบบใยแมงมุม (scripts/014_word_web.sql)
//    _"ไม่มีคำว่าข้าม มีแต่สร้างใหม่กับเพิ่มเส้น"_
//
//    เดิม: คำที่ข้อความตรงกับของในคลัง → **ทิ้งเงียบ ๆ**
//          ทำให้คำเดียวกันที่เจอในนิยายคนละเรื่อง หรืออยากใส่หมวดที่สอง หายไปทั้งดุ้น
//          (เจ้าของคลังจับได้เอง 31 ก.ค. — "มันซ้ำแค่วลี แต่ทั้งชื่อนิยายก็ไม่ซ้ำนะ")
//    ใหม่: คำที่มีอยู่แล้ว → ไม่สร้างแถวใหม่ แต่ **ไล่เพิ่มเฉพาะเส้นที่ยังไม่มี**
//          (กิ่ง · นิยาย · ความหมาย · วลีแม่) แล้วรายงานให้ผู้ใช้เห็นว่าเพิ่มให้กี่เส้น
//
// รับ: { novel, newCategories:[{id,name_th,color,glyph}], words:[{text,...,source,sourceOthers}] }
// คืน: { words:[], created, linked, links:{branches,novels,meanings,links} }
import { NextResponse } from 'next/server';
import {
  getAdmin, mapWord, toPaths, registerBranches, normText, writeWordWeb,
} from '@/lib/supabaseAdmin';

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

    if (!words.length) {
      return NextResponse.json({ words: [], created: 0, linked: 0, links: {} });
    }

    // 3) เตรียมคำ — ยุบคำที่ส่งมาซ้ำกันเองในรอบเดียวก่อน (รวมกิ่ง/ความหมาย/วลีแม่เข้าด้วยกัน)
    const prep = new Map();
    words.forEach((w) => {
      const text = normText(w.text);
      if (!text) return;
      const cur = prep.get(text) || {
        text, original_text: w.original_text || null, kind: w.kind || null,
        word_form: w.word_form || null,
        category_id: w.category_id || 'c8', reason: null,
        paths: [], meanings: [], parents: [],
      };
      toPaths(w.subpaths, w.subpath).forEach((p) => {
        if (!cur.paths.includes(p)) cur.paths.push(p);
      });
      const m = normText(w.meaning);
      if (m && !cur.meanings.includes(m)) cur.meanings.push(m);
      const rs = normText(w.reason);
      if (rs && !cur.reason) cur.reason = rs;
      // วลีแม่ — คำนี้ถูกตัดออกมาจากประโยคไหน (ช่องที่หายไปทุกครั้งก่อนหน้านี้)
      [].concat(w.source || [], w.sourceOthers || []).forEach((s) => {
        const t = normText(s);
        if (t && t !== text && !cur.parents.some((p) => p.text === t)) {
          cur.parents.push({ text: t, kind: 'source' });
        }
      });
      if (!cur.kind && w.kind) cur.kind = w.kind;
      if (!cur.word_form && w.word_form) cur.word_form = w.word_form;
      prep.set(text, cur);
    });
    const items = [...prep.values()];
    if (!items.length) {
      return NextResponse.json({ words: [], created: 0, linked: 0, links: {} });
    }

    // 4) หาว่าคำไหนมีในคลังอยู่แล้ว
    //    🚨 เทียบข้อความแบบตรงตัวเท่านั้น ห้ามเทียบ "ใกล้เคียง"
    //       คำไทยที่ต่างกันแค่วรรณยุกต์คือคนละคำ (เต็มเหนียว ≠ เต็มเหนี่ยว)
    const found = await db.from('wb_words').select('*').in('text', items.map((i) => i.text));
    if (found.error) throw found.error;
    const exist = new Map((found.data || []).map((r) => [normText(r.text), r]));

    const fresh = items.filter((i) => !exist.has(i.text));
    const again = items.filter((i) => exist.has(i.text));

    // 5) คำใหม่ → สร้างแถว · คอลัมน์เดิมยังเขียนคู่กันเหมือนเดิม เพื่อไม่ให้หน้าเว็บเดิมพัง
    let created = [];
    if (fresh.length) {
      const rows = fresh.map((w) => ({
        text: w.text,
        original_text: w.original_text,
        meaning: w.meanings.join(' · ') || null,
        reason: w.reason,
        category_id: w.category_id,
        kind: w.kind,
        word_form: w.word_form,
        subpath: w.paths[0] || null,
        subpaths: w.paths,
        subcategory: w.paths[0] ? String(w.paths[0]).split(' / ').pop() : null,
        // 🔴 ช่องที่หายมาตลอด — เพิ่งมีคอลัมน์รองรับใน scripts/014
        source: w.parents[0] ? w.parents[0].text : null,
        novel: novel || null,
        reviewed: true,
      }));
      const ins = await db.from('wb_words').insert(rows).select('*');
      if (ins.error) throw ins.error;
      created = ins.data || [];
    }

    // 6) คำที่มีอยู่แล้ว → ❌ ห้ามข้าม ❌ ห้ามสร้างแถวใหม่
    //    ✅ เติมช่องที่ยังว่างในแถวเดิม (ไม่ทับของที่มีอยู่) แล้วไปเพิ่มเส้นในขั้นที่ 7
    const touched = [];
    for (const w of again) {
      const row = exist.get(w.text);
      const patch = {};
      if (!row.meaning && w.meanings.length) patch.meaning = w.meanings.join(' · ');
      if (!row.reason && w.reason) patch.reason = w.reason;
      if (!row.source && w.parents[0]) patch.source = w.parents[0].text;
      if (!row.kind && w.kind) patch.kind = w.kind;
      if (!row.word_form && w.word_form) patch.word_form = w.word_form;
      // กิ่งในหมวดเดียวกับบ้านหลักเดิม ที่ยังไม่ได้ติด → เติมเข้า subpaths ให้หน้าเว็บเดิมเห็นด้วย
      if (w.category_id === row.category_id) {
        const have = toPaths(row.subpaths, row.subpath);
        const add = w.paths.filter((p) => !have.includes(p));
        if (add.length) {
          const all = [...have, ...add];
          patch.subpaths = all;
          if (!row.subpath) { patch.subpath = all[0]; patch.subcategory = String(all[0]).split(' / ').pop(); }
        }
      }
      if (Object.keys(patch).length) {
        const up = await db.from('wb_words').update(patch).eq('id', row.id).select('*').single();
        if (!up.error && up.data) { touched.push(up.data); continue; }
      }
      touched.push(row);
    }

    // 7) เขียนเส้นเชื่อมของ "ทุกคำในรอบนี้" ทั้งคำใหม่และคำที่มีอยู่แล้ว
    //    ตารางมี unique อยู่แล้ว เส้นที่มีซ้ำจะถูกข้ามเอง → เพิ่มเฉพาะเส้นที่ยังไม่มีจริง ๆ
    const idOf = new Map([...created, ...touched].map((r) => [normText(r.text), r.id]));
    const links = await writeWordWeb(db, items.map((w) => ({
      id: idOf.get(w.text),
      text: w.text,
      category_id: w.category_id,
      paths: w.paths,
      novels: novel ? [novel] : [],
      meanings: w.meanings,
      parents: w.parents,
      source: 'review',
    })));

    // ลงทะเบียนกิ่งที่ใช้รอบนี้เข้าทะเบียนกิ่ง — fire-and-forget ล้มไม่กระทบการบันทึกคำ
    registerBranches(db, items.map((w) => ({
      category_id: w.category_id, subpath: w.paths[0], subpaths: w.paths,
    })), 'user').catch(() => {});

    return NextResponse.json({
      words: [...created, ...touched].map(mapWord),
      created: created.length,      // คำที่เพิ่งเข้าคลังรอบนี้
      linked: touched.length,       // คำที่มีอยู่แล้ว แล้วได้เส้นเพิ่ม
      links,                        // เส้นที่เขียนไปจริง แยกตามชนิด
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
