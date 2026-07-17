// ตัวจัดคำ — ตอนนี้ใช้ heuristic (lib/engine.js)
// อนาคตสลับเป็น Claude API จริง: แทนที่ runEngine(text) ด้วยการเรียก Claude
// แล้วคืนรูปแบบ response เดิม (สัญญาใน README) โดย UI ไม่ต้องแก้
import { NextResponse } from 'next/server';
import { runEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const text = (body && body.text ? String(body.text) : '').trim();
    if (!text) return NextResponse.json({ items: [], proposed_categories: [] });
    // categories = body.categories (เผื่อใช้ตอนต่อ Claude จริง) — heuristic ยังไม่ต้องใช้
    const result = runEngine(text);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
