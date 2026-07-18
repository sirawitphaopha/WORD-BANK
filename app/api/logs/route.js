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
    // สรุปยอดรวมต่อเจ้า (ดึงเฉพาะคอลัมน์เบา ทุกแถว)
    const stat = await db.from('wb_ai_log').select('provider,provider_label,tokens_in,tokens_out,cost_usd,item_count,saved_count,status').limit(10000);
    if (stat.error) throw stat.error;

    const byProvider = {};
    let totalCost = 0, totalTokens = 0, totalCalls = 0, totalErrors = 0;
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
      totalCost += Number(r.cost_usd || 0);
      totalTokens += (r.tokens_in || 0) + (r.tokens_out || 0);
    }
    return NextResponse.json({
      logs: list.data,
      summary: { byProvider: Object.values(byProvider), totalCost, totalTokens, totalCalls, totalErrors },
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
    return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
