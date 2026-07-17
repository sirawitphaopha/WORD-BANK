// ตัวจัดคำ — ส่งต่อให้ "ตัว AI" ที่ผู้ใช้เลือกในหน้าตั้งค่า
// รองรับ: พื้นฐาน (heuristic) / Gemini / Claude / GPT / DeepSeek / Kimi / Qwen / GLM
// ตัวเลือก provider ส่งมาจากหน้าเว็บ · กุญแจอยู่ฝั่งเซิร์ฟเวอร์ (.env.local) เท่านั้น
// รายละเอียดการเชื่อมต่อทั้งหมดอยู่ใน lib/ai.js
import { NextResponse } from 'next/server';
import { runAI } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const text = (body && body.text ? String(body.text) : '').trim();
    if (!text) return NextResponse.json({ items: [], proposed_categories: [] });
    const provider = body && body.provider ? String(body.provider) : 'basic';
    const model = body && body.model ? String(body.model) : '';
    const prompt = body && body.prompt ? String(body.prompt) : '';
    const categories = body && Array.isArray(body.categories) ? body.categories : [];
    const result = await runAI({ text, categories, provider, model, prompt });
    return NextResponse.json(result);
  } catch (e) {
    // ส่งข้อความ error ภาษาไทย (เช่น ยังไม่ได้ตั้งกุญแจ) กลับไปให้ UI แสดง
    return NextResponse.json({ error: e.message || 'จัดคำไม่สำเร็จ' }, { status: 200 });
  }
}
