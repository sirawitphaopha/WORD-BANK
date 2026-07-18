// ตัวจัดคำ — ส่งต่อให้ "ตัว AI" ที่ผู้ใช้เลือกในหน้าตั้งค่า
// รองรับ: พื้นฐาน (heuristic) / Gemini / Claude / GPT / DeepSeek / Kimi / Qwen / GLM
// ตัวเลือก provider ส่งมาจากหน้าเว็บ · กุญแจอยู่ฝั่งเซิร์ฟเวอร์ (.env.local) เท่านั้น
// รายละเอียดการเชื่อมต่อทั้งหมดอยู่ใน lib/ai.js
// ทุกครั้งที่เรียก AI จะบันทึกลง wb_ai_log (เจ้า/รุ่น/token/ค่าใช้จ่าย/เวลา/สำเร็จ-พลาด)
import { NextResponse } from 'next/server';
import { runAI } from '@/lib/ai';
import { getAdmin } from '@/lib/supabaseAdmin';
import { PROVIDERS } from '@/lib/providers';
import { estCost } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// บันทึก log (ไม่ให้ error ของ log กระทบ response หลัก) → คืน id ถ้าได้
async function writeLog(row) {
  try {
    const db = getAdmin();
    const ins = await db.from('wb_ai_log').insert(row).select('id').single();
    if (ins.error) return null;
    return ins.data ? ins.data.id : null;
  } catch (e) { return null; }
}

export async function POST(req) {
  const started = Date.now();
  let provider = 'basic', model = '', text = '', novel = '';
  try {
    const body = await req.json();
    text = (body && body.text ? String(body.text) : '').trim();
    provider = body && body.provider ? String(body.provider) : 'basic';
    model = body && body.model ? String(body.model) : '';
    novel = body && body.novel ? String(body.novel) : '';
    const prompt = body && body.prompt ? String(body.prompt) : '';
    const categories = body && Array.isArray(body.categories) ? body.categories : [];
    if (!text) return NextResponse.json({ items: [], proposed_categories: [] });

    const result = await runAI({ text, categories, provider, model, prompt });
    const items = Array.isArray(result.items) ? result.items : [];
    const usedModel = result.model || model || '';
    const usage = result.usage || { in: 0, out: 0 };
    const extracted = items.filter((it) => it && (it.source || (Array.isArray(it.notes) && it.notes.some((n) => /แยกจากประโยค/.test(n))))).length;
    const label = (PROVIDERS[provider] && PROVIDERS[provider].label) || provider;

    // บันทึก log สำเร็จ + คืน id ให้ฝั่งเว็บ (ไว้เติมจำนวนคำที่บันทึกจริงตอนกดบันทึก)
    const aiLogId = await writeLog({
      provider, provider_label: label, model: usedModel, novel: novel || null,
      input_text: text, input_chars: text.length,
      item_count: items.length, extracted_count: extracted,
      items_json: items.map((it) => it.text),
      tokens_in: usage.in || 0, tokens_out: usage.out || 0,
      cost_usd: estCost(usedModel, usage.in || 0, usage.out || 0),
      duration_ms: Date.now() - started, status: 'success',
    });
    return NextResponse.json({ ...result, aiLogId });
  } catch (e) {
    // บันทึก log ที่พลาดด้วย (จะได้เห็นว่าเจ้าไหนล่ม/เต็มโควตาบ่อย)
    const label = (PROVIDERS[provider] && PROVIDERS[provider].label) || provider;
    await writeLog({
      provider, provider_label: label, model: model || '', novel: novel || null,
      input_text: text, input_chars: text.length,
      duration_ms: Date.now() - started, status: 'error',
      error: (e && e.message ? String(e.message) : 'จัดคำไม่สำเร็จ').slice(0, 500),
    });
    return NextResponse.json({ error: e.message || 'จัดคำไม่สำเร็จ' }, { status: 200 });
  }
}
