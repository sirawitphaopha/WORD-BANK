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
    label: 'พื้นฐาน (ในเครื่อง)', tag: 'ฟรี', kind: 'local', needsKey: false,
  },
  gemini: {
    label: 'Gemini', tag: 'ฟรี', kind: 'gemini', envKey: 'GEMINI_API_KEY',
    model: 'gemini-3.1-flash-lite',
    // เทสกับบัญชีแล้วทุกตัว · Pro = จ่ายเงิน (เปิด billing แล้ว) · Flash = ฟรี
    // ⭐ คะแนนดาว = ผลเทสชุดคำมาตรฐาน v1 เท่านั้น · รุ่นที่ยังไม่ได้เทสห้ามใส่ดาว (เขียนว่า "ยังไม่ได้เทส")
    // 🏆 ผลเทสชุดคำมาตรฐาน v1 (19 ก.ค. 2569 · ดู docs/AI-MODEL-TEST.md): Gemini ชนะทุกมิติ
    //    เก็บคำที่พิมพ์เข้าครบ 31/31 ทุกรอบ + เป็นตระกูลเดียวที่ให้หมวดย่อยหลายกิ่งต่อคำได้
    // (2.5-flash/2.5-pro/3-pro ปิดรับผู้ใช้ใหม่ 404 จึงไม่ใส่)
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro · ★★★★★ 5.0 ดีที่สุด (จ่ายเงิน)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite · 500/วัน ฟรี' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash · ★★★★☆ 4.5 คุ้มสุด · 20/วัน ฟรี' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash · 20/วัน ฟรี' },
    ],
    keyUrl: 'https://aistudio.google.com/prompts/new_chat',
  },
  claude: {
    label: 'Claude', tag: 'pro', kind: 'claude', envKey: 'ANTHROPIC_API_KEY',
    model: 'claude-opus-4-8',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ],
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  gpt: {
    label: 'GPT (OpenAI)', tag: 'pro', kind: 'openai', envKey: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4.1',
    // เทสสกัดคำแล้ว (2026-07-18): 5.1 สกัดเยอะสุด(5) · 5.5/4.1 ดี(3) · 5.6/5.4 สกัดน้อย(0-1) · 4o-mini มักว่าง
    // 🚨 ผลเทสชุดคำมาตรฐาน v1 (19 ก.ค. 2569 · ดู docs/AI-MODEL-TEST.md) — ข้อเสียของ GPT ทั้งตระกูล:
    //    (1) กลืนคำที่ผู้ใช้พิมพ์เข้าหายไปโดยไม่แจ้งเตือน (4.1 หาย 3 คำ · 5.1 หาย 2 คำ)
    //    (2) ไม่ยอมให้หมวดย่อยหลายกิ่งต่อคำเลย ได้ 0 ทั้ง 3 รุ่นที่เทส ทั้งที่ prompt สั่งเหมือน Gemini
    //    → ถ้าต้องการคำครบหรือหลายกิ่ง ให้ใช้ Gemini
    models: [
      { id: 'gpt-5.1', name: 'GPT-5.1 · ★★★☆☆ 3.0 ดีสุดในกลุ่ม GPT · เคยทำคำหาย 2' },
      { id: 'gpt-4.1', name: 'GPT-4.1 · ★★☆☆☆ 2.5 สกัดดีแต่เคยทำคำหาย 3' },
      { id: 'gpt-5.5', name: 'GPT-5.5 · ยังไม่ได้เทส' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini · ถูกกว่า · ยังไม่ได้เทส' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol · ★☆☆☆☆ 1.5 ⛔ ไม่แนะนำ · สกัดได้ 2 คำ สร้างกิ่ง 10' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra · ยังไม่ได้เทส' },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna · ถูก · ยังไม่ได้เทส' },
      { id: 'gpt-5.4', name: 'GPT-5.4 · ยังไม่ได้เทส' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini · ถูก' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano · ถูกสุด' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini · เก่า ถูกสุด' },
    ],
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  deepseek: {
    label: 'DeepSeek', tag: 'ถูกมาก', kind: 'openai', envKey: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com', jsonMode: true,
    model: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
    ],
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  kimi: {
    label: 'Kimi (Moonshot)', tag: 'จีน', kind: 'openai', envKey: 'MOONSHOT_API_KEY',
    baseURL: 'https://api.moonshot.ai/v1',
    model: 'kimi-k2-0905-preview',
    models: [
      { id: 'kimi-k2-0905-preview', name: 'Kimi K2 (0905)' },
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128k' },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32k' },
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8k' },
    ],
    keyUrl: 'https://platform.moonshot.ai/console/api-keys',
  },
  qwen: {
    label: 'Qwen (Alibaba)', tag: 'จีน', kind: 'openai', envKey: 'DASHSCOPE_API_KEY',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'qwen-turbo', name: 'Qwen Turbo' },
    ],
    keyUrl: 'https://bailian.console.alibabacloud.com/',
  },
  glm: {
    label: 'GLM (Zhipu)', tag: 'จีน', kind: 'openai', envKey: 'ZHIPU_API_KEY',
    baseURL: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6',
    models: [
      { id: 'glm-4.6', name: 'GLM-4.6' },
      { id: 'glm-4.5', name: 'GLM-4.5' },
      { id: 'glm-4.5-air', name: 'GLM-4.5 Air' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
    ],
    keyUrl: 'https://z.ai/manage-apikey/apikey-list',
  },
};

// ลำดับที่จะโชว์ในหน้าตั้งค่า
export const PROVIDER_ORDER = ['basic', 'gemini', 'claude', 'gpt', 'deepseek', 'kimi', 'qwen', 'glm'];
