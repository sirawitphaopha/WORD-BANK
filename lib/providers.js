// lib/providers.js — ทะเบียนรายชื่อ "ตัว AI" (ข้อมูลล้วน ไม่มีการเชื่อมต่อ)
// แยกออกมาเพื่อให้ทั้งฝั่งเบราว์เซอร์ (หน้าตั้งค่า) และฝั่งเซิร์ฟเวอร์ (lib/ai.js)
// import ได้อย่างปลอดภัย โดยไม่ลากชุดเชื่อมต่อ (SDK) ติดไปฝั่งเบราว์เซอร์
//
// 🔧 แต่ละเจ้ามี:
//   model  = รหัสรุ่นเริ่มต้น (ถ้าผู้ใช้ไม่ได้เลือกรุ่นเอง)
//   models = รายชื่อรุ่นให้เลือก — แต่ละตัว { id: 'รหัสจริงที่ส่งไป API', name: 'ชื่อโชว์ในเมนู' }
// โลโก้จริงของแต่ละเจ้าอยู่ใน lib/brandIcons.jsx (อ้างด้วย key เดียวกัน เช่น gemini/claude)
// ชื่อรุ่นอาจเปลี่ยนตามที่ผู้ให้บริการอัปเดต — ถ้าเลือกแล้ว error ว่าไม่มีรุ่นนี้
// หรือรุ่นไหนหาย ให้มาแก้รายการตรงนี้จุดเดียว (ดูรายชื่อรุ่นล่าสุดจากหน้าเอกสารของแต่ละเจ้า)
export const PROVIDERS = {
  basic: {
    label: 'พื้นฐาน (ในเครื่อง)', kind: 'local', needsKey: false,
  },
  gemini: {
    label: 'Gemini (Google)', kind: 'gemini', envKey: 'GEMINI_API_KEY',
    model: 'gemini-3.1-flash-lite',
    // เติมเงินแล้ว = เสียเงินทุกรุ่น (22 ก.ค. 2569 · เอา "ฟรี/ครั้งต่อวัน" ออกจากชื่อทั้งหมด) · เทสกับบัญชีจริงแล้ว
    // ⭐ คะแนนดาว = ผลเทสชุดคำมาตรฐาน (ล่าสุด v2 · เทส 14 รุ่น 21 ก.ค. 2569 · ดู lib/aitest.js scores) · รุ่นที่ยังไม่ได้เทสห้ามใส่ดาว
    // 🏆 ผลเทสชุดคำมาตรฐาน v1 (19 ก.ค. 2569 · ดู docs/AI-MODEL-TEST.md): Gemini ชนะทุกมิติ
    //    เก็บคำที่พิมพ์เข้าครบ 31/31 ทุกรอบ + เป็นตระกูลเดียวที่ให้หมวดย่อยหลายกิ่งต่อคำได้
    // (2.5-flash/2.5-pro/3-pro ปิดรับผู้ใช้ใหม่ 404 จึงไม่ใส่)
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (🧠 Thinking) | ★★★★★ 5.0 — ดีสุด' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (🧠 Thinking) | ★★★★☆ 4.0' },
      { id: 'gemini-3.1-flash-lite::min', name: 'Gemini 3.1 Flash Lite (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (🧠 Thinking) | ยังไม่ได้เทส — ใหม่' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (🧠 Thinking) | ★★★★½ 4.5 — คุ้มสุด' },
      { id: 'gemini-3.5-flash::min', name: 'Gemini 3.5 Flash (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (🧠 Thinking) | ยังไม่ได้เทส — ใหม่สุด' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (🧠 Thinking) | ★★★½☆ 3.5' },
      { id: 'gemini-3-flash-preview::min', name: 'Gemini 3 Flash (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
    ],
    keyUrl: 'https://aistudio.google.com/prompts/new_chat',
  },
  claude: {
    label: 'Claude (Anthropic)', kind: 'claude', envKey: 'ANTHROPIC_API_KEY',
    model: 'claude-opus-4-8',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ],
    keyUrl: 'https://platform.claude.com/dashboard',
  },
  gpt: {
    label: 'GPT (OpenAI)', kind: 'openai', envKey: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4.1',
    // เทสสกัดคำแล้ว (2026-07-18): 5.1 สกัดเยอะสุด(5) · 5.5/4.1 ดี(3) · 5.6/5.4 สกัดน้อย(0-1) · 4o-mini มักว่าง
    // 🚨 ผลเทสชุดคำมาตรฐาน v1 (19 ก.ค. 2569 · ดู docs/AI-MODEL-TEST.md) — ข้อเสียของ GPT ทั้งตระกูล:
    //    (1) กลืนคำที่ผู้ใช้พิมพ์เข้าหายไปโดยไม่แจ้งเตือน (4.1 หาย 3 คำ · 5.1 หาย 2 คำ)
    //    (2) ไม่ยอมให้หมวดย่อยหลายกิ่งต่อคำเลย ได้ 0 ทั้ง 3 รุ่นที่เทส ทั้งที่ prompt สั่งเหมือน Gemini
    //    → ถ้าต้องการคำครบหรือหลายกิ่ง ให้ใช้ Gemini
    models: [
      // GPT-5.x = reasoning model · 2 โหมด: Thinking (ดีฟอลต์ · ดาว=V2) + คิดธรรมดา (id ลงท้าย "::min" = reasoning_effort 'none')
      // ตัด mini/nano ออกแล้ว (พี่กันสั่ง 22 ก.ค.) · โหมดคิดธรรมดายังไม่ได้เทส (V2 เทสแต่ thinking)
      { id: 'gpt-5.1', name: 'GPT-5.1 (🧠 Thinking) | ★★★½☆ 3.5 — ดีสุดในกลุ่ม GPT' },
      { id: 'gpt-5.1::min', name: 'GPT-5.1 (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
      { id: 'gpt-5.4', name: 'GPT-5.4 (🧠 Thinking) | ★★★½☆ 3.5 — สกัดเยอะสุด' },
      { id: 'gpt-5.4::min', name: 'GPT-5.4 (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
      { id: 'gpt-5.5', name: 'GPT-5.5 (🧠 Thinking) | ★★★½☆ 3.5 — สกัดเยอะ' },
      { id: 'gpt-5.5::min', name: 'GPT-5.5 (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna (🧠 Thinking) | ★★★★☆ 4.0 — ถูก+ดี' },
      { id: 'gpt-5.6-luna::min', name: 'GPT-5.6 Luna (💬 คิดธรรมดา) | ยังไม่ได้เทส' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra (🧠 Thinking) | ★★½☆☆ 2.5' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol (🧠 Thinking) | ★½☆☆☆ 1.5 — ⛔ ไม่แนะนำ' },
      { id: 'gpt-4.1', name: 'GPT-4.1 (💬 คิดธรรมดา) | ★★★☆☆ 3.0 — สกัดดี' },
    ],
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  deepseek: {
    label: 'DeepSeek', kind: 'openai', envKey: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com', jsonMode: true,
    model: 'deepseek-v4-flash',
    // อัปเดต 2026-07-22 · ดึงจาก /models จริง + ยิงเทสผ่าน · ของเก่า deepseek-chat/reasoner (V3/R1) เลิกใช้แล้ว
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash · เร็ว ถูก' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro · เก่งกว่า' },
    ],
    keyUrl: 'https://platform.deepseek.com/usage',
  },
  kimi: {
    label: 'Kimi (Moonshot)', kind: 'openai', envKey: 'MOONSHOT_API_KEY',
    baseURL: 'https://api.moonshot.ai/v1',
    model: 'kimi-k3',
    // อัปเดต 2026-07-22 · ของเก่า (kimi-k2-0905/moonshot-v1-*) ตายหมดแล้ว 404 · ใหม่ยิงเทสผ่าน
    models: [
      { id: 'kimi-k3', name: 'Kimi K3 · ใหม่สุด' },
      { id: 'kimi-k2.6', name: 'Kimi K2.6' },
    ],
    keyUrl: 'https://platform.kimi.ai/console/account',
  },
  qwen: {
    label: 'Qwen (Alibaba)', kind: 'openai', envKey: 'DASHSCOPE_API_KEY',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.6-flash',
    // อัปเดต 2026-07-22 · ยิงเทสผ่าน ตอบไทยดี · qwen-plus/max/turbo เก่ายังใช้ได้แต่มีรุ่นใหม่กว่า
    models: [
      { id: 'qwen3.7-max', name: 'Qwen3.7 Max · เก่งสุด' },
      { id: 'qwen3.6-plus', name: 'Qwen3.6 Plus · สมดุล' },
      { id: 'qwen3.6-flash', name: 'Qwen3.6 Flash · เร็ว ถูก' },
    ],
    keyUrl: 'https://modelstudio.console.alibabacloud.com/ap-southeast-1?spm=5176.12818093_47.console-base_search-panel.dtab-product_sfm.1fd47b6bHv4jj0&tab=dashboard#/efm/model_experience_center/text',
  },
  glm: {
    label: 'GLM (Zhipu)', kind: 'openai', envKey: 'ZHIPU_API_KEY',
    baseURL: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6',
    // อัปเดต 2026-07-22 · glm-4-flash ตายแล้ว (Unknown Model) · เพิ่มรุ่นใหม่ glm-5.x/4.7 (ยิงเทสผ่าน)
    models: [
      { id: 'glm-5.2', name: 'GLM-5.2 · ใหม่สุด' },
      { id: 'glm-5', name: 'GLM-5' },
      { id: 'glm-4.7', name: 'GLM-4.7' },
      { id: 'glm-4.6', name: 'GLM-4.6' },
    ],
    keyUrl: 'https://z.ai/manage-apikey/account',
  },
  grok: {
    label: 'Grok (xAI)', kind: 'openai', envKey: 'XAI_API_KEY',
    baseURL: 'https://api.x.ai/v1',
    model: 'grok-4',
    // ⏳ เพิ่มโครงไว้ก่อน 22 ก.ค. 2569 · ยังไม่มีกุญแจ → ยังไม่ได้ probe/เทส · ยังไม่มีโลโก้จริง (โชว์ไอคอนเฟืองชั่วคราว)
    //    รอพี่กันเอา XAI_API_KEY มาใส่ .env.local แล้วแคลร์ยิง GET /models หารุ่นปัจจุบัน + ยิงเทส + ใส่ดาว + ใส่โลโก้จริง (brandIcons.jsx)
    //    รุ่นข้างล่างเป็นตัวเดา (placeholder) ต้องยืนยันด้วย /models ก่อนใช้จริง — xAI ใช้มาตรฐาน OpenAI-compatible
    models: [
      { id: 'grok-4', name: 'Grok 4 · รอ probe (ยังไม่ยืนยันรุ่น)' },
      { id: 'grok-3', name: 'Grok 3 · รอ probe (ยังไม่ยืนยันรุ่น)' },
    ],
    keyUrl: 'https://console.x.ai/',
  },
  llama: {
    label: 'Llama (Meta)', kind: 'openai', envKey: 'LLAMA_API_KEY',
    baseURL: 'https://api.llama.com/compat/v1',
    model: 'Llama-4-Maverick',
    // ⏳ เพิ่มโครงไว้ก่อน 22 ก.ค. 2569 · Meta = เฟซบุค · ยังไม่มีกุญแจ → ยังไม่ได้ probe/เทส · ยังไม่มีโลโก้จริง (โชว์ไอคอนเฟืองชั่วคราว)
    //    รอ LLAMA_API_KEY ใน .env.local แล้วแคลร์ยิง GET /models หารุ่นปัจจุบัน + ยิงเทส + ใส่ดาว + ใส่โลโก้จริง
    //    endpoint (api.llama.com/compat/v1) + รุ่นเป็นตัวเดา ต้องยืนยันก่อนใช้จริง — Meta มี Llama API แบบ OpenAI-compatible
    models: [
      { id: 'Llama-4-Maverick', name: 'Llama 4 Maverick · รอ probe (ยังไม่ยืนยันรุ่น)' },
      { id: 'Llama-4-Scout', name: 'Llama 4 Scout · รอ probe (ยังไม่ยืนยันรุ่น)' },
    ],
    keyUrl: 'https://llama.developer.meta.com/',
  },
};

// ลำดับที่จะโชว์ในหน้าตั้งค่า
export const PROVIDER_ORDER = ['basic', 'gemini', 'claude', 'gpt', 'deepseek', 'kimi', 'qwen', 'glm', 'grok', 'llama'];
