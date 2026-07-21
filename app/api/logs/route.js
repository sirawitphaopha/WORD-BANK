// ประวัติการใช้ AI (wb_ai_log)
// GET  → รายการล่าสุด (200) + สรุปยอดรวมต่อเจ้า (จำนวนครั้ง/token/ค่าใช้จ่าย/พลาด)
// POST { action:'saved', id, saved_count, skipped_count } → เติมจำนวนคำที่บันทึกจริง
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdmin();
    // รายการล่าสุด (มีข้อความเต็มไว้กดดูรายละเอียด)
    const list = await db.from('wb_ai_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (list.error) throw list.error;
    // สรุปยอดรวม (คอลัมน์ที่มีแน่ ๆ) — ต่อเจ้า + ต่อรุ่น (byModel) ทุกแถว
    const stat = await db.from('wb_ai_log').select('provider,provider_label,model,tokens_in,tokens_out,cost_usd,item_count,extracted_count,saved_count,duration_ms,status').limit(10000);
    if (stat.error) throw stat.error;
    // คอลัมน์ใหม่ (scripts/012 · ช่อ/พิมพ์เข้า/กิ่งใหม่) — ดึงแยก + กลืน error ถ้ายังไม่ได้รัน migration
    let extra = null;
    try {
      const ex = await db.from('wb_ai_log').select('batch_code,typed_count,new_branch_count').limit(10000);
      if (!ex.error) extra = ex.data;
    } catch (e) { /* คอลัมน์ยังไม่มี */ }

    const byProvider = {}, byModel = {};
    let totalCost = 0, totalTokens = 0, totalCalls = 0, totalErrors = 0, totalExtracted = 0, totalSaved = 0;
    for (const r of stat.data) {
      const key = r.provider || 'unknown';
      if (!byProvider[key]) byProvider[key] = { provider: key, label: r.provider_label || key, calls: 0, errors: 0, tokensIn: 0, tokensOut: 0, cost: 0, items: 0, saved: 0 };
      const b = byProvider[key];
      b.calls++; totalCalls++;
      if (r.status === 'error') { b.errors++; totalErrors++; }
      b.tokensIn += r.tokens_in || 0;
      b.tokensOut += r.tokens_out || 0;
      b.cost += Number(r.cost_usd || 0);
      b.items += r.item_count || 0;
      b.saved += r.saved_count || 0;
      // ต่อรุ่น (byModel) — เวลาเฉลี่ยนับเฉพาะที่สำเร็จ (error duration ไม่สะท้อนความเร็วจริง)
      const mk = r.model || r.provider_label || 'unknown';
      if (!byModel[mk]) byModel[mk] = { model: mk, provider: key, label: r.provider_label || key, calls: 0, errors: 0, tokensIn: 0, tokensOut: 0, cost: 0, extracted: 0, saved: 0, durationMs: 0, okCalls: 0 };
      const m = byModel[mk];
      m.calls++;
      if (r.status === 'error') m.errors++; else { m.okCalls++; m.durationMs += r.duration_ms || 0; }
      m.tokensIn += r.tokens_in || 0;
      m.tokensOut += r.tokens_out || 0;
      m.cost += Number(r.cost_usd || 0);
      m.extracted += r.extracted_count || 0;
      m.saved += r.saved_count || 0;
      totalCost += Number(r.cost_usd || 0);
      totalTokens += (r.tokens_in || 0) + (r.tokens_out || 0);
      totalExtracted += r.extracted_count || 0;
      totalSaved += r.saved_count || 0;
    }
    let totalBatches = 0, totalTyped = 0, totalNewBranch = 0;
    if (extra) for (const r of extra) {
      if (r.batch_code) totalBatches++;
      totalTyped += r.typed_count || 0;
      totalNewBranch += r.new_branch_count || 0;
    }
    return NextResponse.json({
      logs: list.data,
      summary: {
        byProvider: Object.values(byProvider),
        byModel: Object.values(byModel),
        totalCost, totalTokens, totalCalls, totalErrors, totalExtracted, totalSaved,
        totalBatches, totalTyped, totalNewBranch, hasBatchStats: !!extra,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const db = getAdmin();
    const body = await req.json();
    if (body.action === 'saved' && body.id) {
      const up = await db.from('wb_ai_log').update({
        saved_count: body.saved_count || 0,
        skipped_count: body.skipped_count || 0,
      }).eq('id', body.id);
      if (up.error) throw up.error;
      return NextResponse.json({ ok: true });
    }
    // ผูกช่อ + เก็บสถิติช่อลง log (คำนวณฝั่งเว็บให้เลข "กิ่งใหม่" ตรงหน้าเว็บ) · scripts/012
    // ถ้าคอลัมน์ยังไม่มี (พี่กันยังไม่รัน 012) → กลืน error เงียบ ไม่พังระบบ (logging หลักไม่กระทบ)
    if (body.action === 'batchStats' && body.id) {
      try {
        await db.from('wb_ai_log').update({
          batch_code: body.batch_code || null,
          batch_no: body.batch_no || null,
          typed_count: body.typed_count || 0,
          restored_count: body.restored_count || 0,
          new_branch_count: body.new_branch_count || 0,
        }).eq('id', body.id);
      } catch (e) { /* คอลัมน์ยังไม่มี = fail เงียบ */ }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
