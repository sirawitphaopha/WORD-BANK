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
import { DEFAULT_PROMPT, PROVIDER_NOTES } from './prompt.js';
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

// livePaths = กิ่งหมวดย่อยที่ใช้จริงในคลังตอนนี้ (รวมกิ่งที่ผู้ใช้สร้างเองหลังตั้งต้น)
// ต้องรวมกับ SUBTREE เสมอ ไม่งั้น AI จะไม่รู้จักกิ่งใหม่ แล้วจัดคำมั่วเมื่อคลังโต
function buildUserPrompt(text, categories, livePaths) {
  const lines = ['หมวดที่มีอยู่ (Existing categories — ใช้ก่อนเสมอ):'];
  const cats = (categories || []).filter((c) => c && c.id);
  if (!cats.length) {
    lines.push('(ยังไม่มีหมวด)');
  } else {
    for (const c of cats) {
      lines.push(`${c.id} = ${c.name_th || c.n || ''}`);
      const paths = [];
      flattenPaths(SUBTREE[c.id], '', paths);
      const live = (livePaths && livePaths[c.id]) || [];
      const all = [...new Set([...paths, ...live])];
      if (all.length) lines.push('   subcategories: ' + all.join(' · '));
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

// ผู้ใช้จงใจใส่จุดไข่ปลา (…) แทนบริบทของเรื่อง และตัวอักษร A B C แทนชื่อตัวละคร
// AI จะแปลงจุดไข่ปลาเป็นคำใบ้ [ชื่อคน] และเว้นวรรครอบตัวอักษรให้ — นั่น "ไม่ใช่การแก้สะกด"
// ฟังก์ชันนี้เทียบว่าคำก่อน-หลังต่างกันแค่เรื่องพวกนี้หรือไม่ (ถ้าใช่ ตัด original + note แก้สะกด ทิ้ง)
function placeholderOnlyDiff(before, after) {
  const strip = (s) => String(s || '')
    .replace(/\[[^\]]*\]/g, '')   // คำใบ้ในวงเล็บเหลี่ยม
    .replace(/[….]+/g, '')        // จุดไข่ปลาทุกแบบ
    .replace(/[A-Za-z]/g, '')     // ตัวอักษรแทนชื่อตัวละคร
    .replace(/\s+/g, '');         // ช่องว่างที่เพิ่ม/หายไป
  return strip(before) === strip(after);
}

function normalize(raw, categories) {
  const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('ตัว AI ตอบกลับมาไม่ใช่รูปแบบที่อ่านได้ ลองใหม่อีกครั้ง');
  }
  const validIds = new Set((categories || []).map((c) => c && c.id).filter(Boolean));
  const catNameById = {};
  (categories || []).forEach((c) => { if (c && c.id) catNameById[c.id] = c.name_th || c.n || ''; });
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
    let notes = Array.isArray(it.notes)
      ? it.notes.map((n) => String(n)).filter(Boolean).slice(0, 3)
      : [];
    const rawSubs = Array.isArray(it.subcategories) ? it.subcategories : (it.subcategories ? [it.subcategories] : []);
    // AI ชอบเผลอเอา "ชื่อหมวด" มาเป็นชั้นแรกของเส้นทาง (เช่น "บุคลิกภาพและลักษณะนิสัย / ความแข็งกร้าว")
    // ทั้งที่คำอยู่ในหมวดนั้นอยู่แล้ว → ตัดชั้นแรกทิ้ง ไม่งั้นต้นไม้จะมีชั้นซ้ำชื่อหมวดโผล่มาเปล่า ๆ
    const catName = String((catNameById && catNameById[cid]) || '').trim();
    const subs = [...new Set([...rawSubs, it.subcategory]
      .map((s) => String(s || '').trim())
      .map((s) => {
        if (!catName || !s) return s;
        const head = s.split(' / ')[0].trim();
        return head === catName ? s.split(' / ').slice(1).join(' / ').trim() : s;
      })
      .filter(Boolean))];
    let original = it.original != null && String(it.original).trim() ? String(it.original).trim() : null;
    // ต่างกันแค่จุดไข่ปลา/คำใบ้/ช่องว่างรอบชื่อตัวละคร → ไม่ใช่การแก้สะกด ห้ามขึ้นป้าย "แก้สะกดแล้ว"
    if (original && placeholderOnlyDiff(original, text)) {
      original = null;
      notes = notes.filter((n) => !/แก้สะกด|สะกดผิด|spell/i.test(n));
    }
    out.push({
      text,
      original,
      kind,
      category_id: cid != null ? cid : null,
      proposed_category: proposed || null,
      // หมวดย่อยหลายกิ่งได้ (คำหนึ่งอยู่ได้หลายที่จริง ๆ) — รองรับทั้ง subcategories (อาร์เรย์ ของใหม่)
      // และ subcategory (เดี่ยว ของเดิม/AI ที่ดื้อไม่ทำตามสัญญาใหม่)
      subcategory: subs[0] || null,   // อันแรก = หมวดย่อยหลัก (เข้ากันได้กับโค้ดเดิม)
      subcategories: subs,
      // เหตุผลสั้น ๆ ที่ AI เขียนกำกับการจัดหมวด (มีเฉพาะคำที่กำกวม/หลายกิ่ง/เสนอกิ่งใหม่)
      // ตัดที่ 200 ตัวอักษร กัน AI ร่ายยาวจนเปลือง token และการ์ดล้น
      // ความหมายสั้น ๆ ที่ AI เขียนให้ (ช่องนี้มีอยู่เดิมแล้ว เดิมผู้ใช้กรอกเอง)
      meaning: it.meaning != null && String(it.meaning).trim() ? String(it.meaning).trim().slice(0, 120) : '',
      reason: it.reason != null && String(it.reason).trim() ? String(it.reason).trim().slice(0, 200) : null,
      source: it.source != null && String(it.source).trim() ? String(it.source).trim() : null, // ประโยคต้นทางที่คำนี้ถูกสกัดออกมา (null = พิมพ์เอง/ประโยคเต็ม)
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
async function callOpenAICompatible(cfg, apiKey, text, categories, system, live) {
  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: buildUserPrompt(text, categories, live) },
    ],
  };
  // GPT-5.x ล็อค temperature ไว้ที่ 1 (ใส่ค่าอื่น = error) · รุ่นอื่นใช้ 0.2 ให้ผลนิ่ง
  if (!/^gpt-5/.test(cfg.model)) body.temperature = 0.2;
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
  const u = data.usage || {};
  return { ...normalize(content, categories), usage: { in: u.prompt_tokens || 0, out: u.completion_tokens || 0 } };
}

// (ข) Gemini — รูปแบบเฉพาะของ Google
async function callGemini(cfg, apiKey, text, categories, system, live) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(text, categories, live) }] }],
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
  const u = data.usageMetadata || {};
  return { ...normalize(content, categories), usage: { in: u.promptTokenCount || 0, out: u.candidatesTokenCount || 0 } };
}

// (ค) Claude — ใช้ SDK ทางการ (@anthropic-ai/sdk)
async function callClaude(cfg, apiKey, text, categories, system, live) {
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
    messages: [{ role: 'user', content: buildUserPrompt(text, categories, live) }],
  });
  const content = Array.isArray(msg.content)
    ? msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    : '';
  const u = msg.usage || {};
  return { ...normalize(content, categories), usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } };
}

// ===========================================================================
// ทางเข้าเดียว — หน้าเว็บ/route เรียกตัวนี้ตัวเดียว
// ===========================================================================
// ---------- ตาข่ายกันคำหาย ----------
// 🚨 ปัญหาจริงที่เจอจากการทดสอบ 19 ก.ค. 2569 (ดู docs/AI-MODEL-TEST.md):
//    ตระกูล GPT กลืนบรรทัดที่ผู้ใช้พิมพ์เข้ามาเอง โดยไม่แจ้งเตือน — GPT-4.1 หาย 3 คำ · GPT-5.1 หาย 2 คำ
//    ทุกกรณีมีลักษณะเดียวกัน: ผู้ใช้พิมพ์คำเดี่ยวแยกบรรทัด (ทรุดลง · อลหม่าน · ดุจดั่ง)
//    แต่คำนั้นไปปรากฏอยู่ในประโยคยาวบรรทัดอื่นด้วย AI จึงตีความว่าซ้ำแล้วตัดทิ้ง
//    ผู้ใช้เก็บคำมา 31 คำ ได้กลับ 28 คำ โดยไม่มีอะไรบอก = ข้อมูลหายเงียบ ๆ ซึ่งรับไม่ได้
//
// หลักการแก้: กฎใน prompt กันไว้ชั้นแรก · ชั้นนี้เป็นตาข่ายรับท้ายที่ไม่พึ่ง AI เลย
//    ระบบนับบรรทัดเข้าเทียบผลออกเอง ขาดอันไหนเติมกลับให้ครบ แล้วติดป้ายบอกผู้ใช้ว่าเป็นคำที่ระบบเติม

// ตัดสิ่งที่ AI มีสิทธิ์แก้ได้ออก เพื่อเทียบว่าเป็น "บรรทัดเดียวกัน" หรือไม่
// (ช่องเติมคำ [ชื่อคน] · จุดไข่ปลา · เว้นวรรค · ไม้ยมกที่พิมพ์ต่างกัน)
function lineKey(s) {
  return String(s || '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[….]+/g, '')
    .replace(/\s+/g, '')
    .trim();
}

// คืน { items, restored } — restored = บรรทัดที่ AI ทำหาย แล้วระบบเติมกลับให้
function restoreMissingLines(text, items, categories) {
  const lines = String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return { items, restored: [] };

  // คำที่ AI คืนมา (ทั้งคำที่ผู้ใช้พิมพ์และคำที่ AI สกัดเพิ่ม) เก็บเป็นกุญแจไว้เทียบ
  const have = new Set(items.map((it) => lineKey(it && it.text)).filter(Boolean));
  const restored = [];
  const seenLine = new Set();

  lines.forEach((line) => {
    const k = lineKey(line);
    if (!k || seenLine.has(k)) return; // บรรทัดซ้ำเป๊ะในข้อความเข้า = ตั้งใจให้เหลืออันเดียว
    seenLine.add(k);
    if (have.has(k)) return;
    restored.push(line);
  });

  if (!restored.length) return { items, restored: [] };

  // เติมกลับเข้าไปในผล พร้อมหมายเหตุให้ผู้ใช้เห็นชัดว่าคำนี้ระบบเติม ไม่ใช่ AI จัดให้
  // ตั้งใจไม่เดาหมวดให้ ปล่อยเป็น null เพื่อให้ผู้ใช้เลือกเอง (เดาผิดแย่กว่าไม่เดา)
  const add = restored.map((line) => ({
    text: line,
    original: null,
    meaning: '',
    kind: guessKind(line),
    category_id: null,
    proposed_category: null,
    subcategories: [],
    source: null,
    notes: ['⚠ ระบบเติมกลับ — AI ตัดคำนี้ทิ้ง'],
  }));
  return { items: [...items, ...add], restored };
}

export async function runAI({ text, categories, provider, model, prompt, livePaths }) {
  const key = PROVIDERS[provider] ? provider : 'basic';
  const base = PROVIDERS[key];

  // พื้นฐาน (heuristic) — ไม่ต้องใช้กุญแจ (ยังไม่รองรับ prompt แก้เอง) · ไม่ใช้ token
  if (base.kind === 'local') return { ...runEngine(text), usage: { in: 0, out: 0 }, model: 'basic', provider: key };

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
  const baseSystem = prompt && String(prompt).trim() ? String(prompt) : DEFAULT_PROMPT;
  // ต่อท้ายคำสั่งเสริมเฉพาะเจ้า (ถ้ามี) — แก้จุดอ่อนที่วัดได้จริงของตระกูลนั้น เช่น GPT ไม่ให้หลายกิ่ง/ตัดบรรทัดทิ้ง
  // ต่อท้ายเสมอแม้ผู้ใช้แก้คำสั่งเอง เพราะเป็นการอุดจุดอ่อนของโมเดล ไม่ใช่การเปลี่ยนวิธีจัดคำ
  const note = PROVIDER_NOTES[key];
  const system = note ? baseSystem + '\n\n' + note : baseSystem;

  let result;
  if (cfg.kind === 'openai') result = await callOpenAICompatible(cfg, apiKey, text, categories, system, livePaths);
  else if (cfg.kind === 'gemini') result = await callGemini(cfg, apiKey, text, categories, system, livePaths);
  else if (cfg.kind === 'claude') result = await callClaude(cfg, apiKey, text, categories, system, livePaths);
  else result = { ...runEngine(text), usage: { in: 0, out: 0 } };

  // ตาข่ายกันคำหาย — ทำหลังสุด ครอบทุกเจ้า AI พร้อมกัน
  const fixed = restoreMissingLines(text, Array.isArray(result.items) ? result.items : [], categories);
  return { ...result, items: fixed.items, restored: fixed.restored, model: useModel, provider: key };
}
