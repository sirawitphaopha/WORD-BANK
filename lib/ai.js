// lib/ai.js — ตัวกลางรวม "ตัว AI" ทุกเจ้า (provider adapter)
// ---------------------------------------------------------------------------
// หลักคิด: มี "ใบสั่งกลาง" (prompt) ใบเดียว → ส่งให้ยี่ห้อไหนก็ได้ (Gemini/Claude/
// GPT/DeepSeek/Kimi/Qwen/GLM) → ทุกเจ้าคืนผล "รูปแบบเดียวกันเป๊ะ" กลับมา:
//   { items:[{text, original|null, kind, category_id|null, proposed_category|null,
//             subcategory|null, notes:[]}],
//     proposed_categories:[{name_th}] }
// หน้าเว็บไม่ต้องรู้เลยว่าใช้เจ้าไหน → สลับยี่ห้อ/รุ่นในหน้าตั้งค่าได้ทันที
//
// ใบสั่ง (system prompt) ผู้ใช้แก้เองได้ในหน้าตั้งค่า (ส่งมาทาง prompt override)
// ถ้าไม่ส่งมา ใช้ DEFAULT_PROMPT · ส่วน "หมวด+หมวดย่อย+ข้อความ" ระบบเติมให้เอง
//
// กุญแจ (API key) เก็บฝั่งเซิร์ฟเวอร์ใน .env.local เท่านั้น ไม่หลุดเบราว์เซอร์
// ---------------------------------------------------------------------------
import { runEngine } from './engine.js';
import { PROVIDERS } from './providers.js';
import { DEFAULT_PROMPT } from './prompt.js';
import { SUBTREE } from './subtree.js';

// (รายชื่อ/ค่าตั้งของแต่ละเจ้าอยู่ใน lib/providers.js — แก้ชื่อรุ่น/URL/กุญแจที่นั่น)
export { PROVIDERS };

const KINDS = ['word', 'phrase', 'sentence'];

// ===========================================================================
// สร้าง "ข้อความผู้ใช้" — หมวดหลัก + เส้นทางหมวดย่อยทั้งหมด + ข้อความที่ต้องจัด
// (ส่วนนี้ระบบเติมเองอัตโนมัติ ต่อท้ายใบสั่ง)
// ===========================================================================
function flattenPaths(nodes, prefix, acc) {
  for (const n of nodes || []) {
    if (!n || !n.name) continue;
    const path = prefix ? prefix + ' / ' + n.name : n.name;
    acc.push(path);
    if (n.children && n.children.length) flattenPaths(n.children, path, acc);
  }
}

function buildUserPrompt(text, categories) {
  const lines = ['หมวดที่มีอยู่ (Existing categories — ใช้ก่อนเสมอ):'];
  const cats = (categories || []).filter((c) => c && c.id);
  if (!cats.length) {
    lines.push('(ยังไม่มีหมวด)');
  } else {
    for (const c of cats) {
      lines.push(`${c.id} = ${c.name_th || c.n || ''}`);
      const paths = [];
      flattenPaths(SUBTREE[c.id], '', paths);
      if (paths.length) lines.push('   subcategories: ' + paths.join(' · '));
    }
  }
  lines.push('', 'ข้อความที่ต้องจัด (Text to process):', text);
  return lines.join('\n');
}

// ===========================================================================
// แปลงผลดิบจาก AI → รูปแบบสัญญา (กันข้อมูลเพี้ยน/ฟิลด์ขาด)
// ===========================================================================
function extractJson(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) { return null; }
}

// เดาชนิดจากข้อความ (เผื่อ AI ไม่ได้แปะ kind มา)
function guessKind(text) {
  const spaces = (text.match(/\s/g) || []).length;
  if (text.length > 24 || spaces >= 3) return 'sentence';
  if (spaces >= 1) return 'phrase';
  return 'word';
}

function normalize(raw, categories) {
  const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('ตัว AI ตอบกลับมาไม่ใช่รูปแบบที่อ่านได้ ลองใหม่อีกครั้ง');
  }
  const validIds = new Set((categories || []).map((c) => c && c.id).filter(Boolean));
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const text = String(it.text || '').trim();
    if (text.length < 1) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    let cid = it.category_id;
    if (cid != null && !validIds.has(cid)) cid = null; // รหัสหมวดมั่ว → ปล่อยให้ UI ตั้ง default
    const proposed = it.proposed_category != null ? String(it.proposed_category).trim() : null;
    const kind = KINDS.includes(it.kind) ? it.kind : guessKind(text);
    const notes = Array.isArray(it.notes)
      ? it.notes.map((n) => String(n)).filter(Boolean).slice(0, 3)
      : [];
    out.push({
      text,
      original: it.original != null && String(it.original).trim() ? String(it.original).trim() : null,
      kind,
      category_id: cid != null ? cid : null,
      proposed_category: proposed || null,
      subcategory: it.subcategory != null && String(it.subcategory).trim() ? String(it.subcategory).trim() : null,
      notes,
    });
  }
  const pcSet = new Set();
  (Array.isArray(parsed.proposed_categories) ? parsed.proposed_categories : []).forEach((pc) => {
    const name = pc && (pc.name_th || pc.name) ? String(pc.name_th || pc.name).trim() : '';
    if (name) pcSet.add(name);
  });
  out.forEach((it) => { if (it.proposed_category) pcSet.add(it.proposed_category); });
  return { items: out, proposed_categories: [...pcSet].map((name_th) => ({ name_th })) };
}

// ===========================================================================
// ตัวเรียกแต่ละชนิด (รับ system = ใบสั่ง ที่อาจถูกผู้ใช้แก้)
// ===========================================================================

// (ก) OpenAI-compatible — ใช้ซ้ำได้ 5 เจ้า: GPT / DeepSeek / Kimi / Qwen / GLM
async function callOpenAICompatible(cfg, apiKey, text, categories, system) {
  const body = {
    model: cfg.model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: buildUserPrompt(text, categories) },
    ],
  };
  if (cfg.jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${cfg.label} ตอบกลับผิดพลาด (${res.status}) ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content : '';
  return normalize(content, categories);
}

// (ข) Gemini — รูปแบบเฉพาะของ Google
async function callGemini(cfg, apiKey, text, categories, system) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(text, categories) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${cfg.label} ตอบกลับผิดพลาด (${res.status}) ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content
    ? data.candidates[0].content.parts : null;
  const content = parts && parts.length ? parts.map((p) => p.text || '').join('') : '';
  return normalize(content, categories);
}

// (ค) Claude — ใช้ SDK ทางการ (@anthropic-ai/sdk)
async function callClaude(cfg, apiKey, text, categories, system) {
  let Anthropic;
  try {
    Anthropic = (await import('@anthropic-ai/sdk')).default;
  } catch (e) {
    throw new Error('ยังไม่ได้ติดตั้งชุดเชื่อมต่อ Claude (รัน npm install @anthropic-ai/sdk)');
  }
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: cfg.model,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: buildUserPrompt(text, categories) }],
  });
  const content = Array.isArray(msg.content)
    ? msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    : '';
  return normalize(content, categories);
}

// ===========================================================================
// ทางเข้าเดียว — หน้าเว็บ/route เรียกตัวนี้ตัวเดียว
// ===========================================================================
export async function runAI({ text, categories, provider, model, prompt }) {
  const key = PROVIDERS[provider] ? provider : 'basic';
  const base = PROVIDERS[key];

  // พื้นฐาน (heuristic) — ไม่ต้องใช้กุญแจ (ยังไม่รองรับ prompt แก้เอง)
  if (base.kind === 'local') return runEngine(text);

  // เจ้าอื่นต้องมีกุญแจใน .env.local
  const apiKey = process.env[base.envKey];
  if (!apiKey) {
    throw new Error(`ยังไม่ได้ตั้งกุญแจของ ${base.label} — ใส่ค่า ${base.envKey} ในไฟล์ .env.local ก่อน`);
  }

  // เลือกรุ่นที่ผู้ใช้เลือก (ถ้าอยู่ในรายการที่อนุญาต) ไม่งั้นใช้รุ่นเริ่มต้น
  const allowed = Array.isArray(base.models) ? base.models.map((m) => m.id) : [];
  const useModel = model && allowed.includes(model) ? model : base.model;
  const cfg = { ...base, model: useModel };

  // ใบสั่ง — ใช้ที่ผู้ใช้แก้ (ถ้ามี) ไม่งั้นค่าเริ่มต้น
  const system = prompt && String(prompt).trim() ? String(prompt) : DEFAULT_PROMPT;

  if (cfg.kind === 'openai') return callOpenAICompatible(cfg, apiKey, text, categories, system);
  if (cfg.kind === 'gemini') return callGemini(cfg, apiKey, text, categories, system);
  if (cfg.kind === 'claude') return callClaude(cfg, apiKey, text, categories, system);
  return runEngine(text);
}
