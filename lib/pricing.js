// lib/pricing.js — ราคาต่อ 1 ล้าน token (ดอลลาร์ USD) ต่อรุ่น [ขาเข้า, ขาออก]
// ⚠️ เป็น "ค่าประมาณ" ราคาจริงเปลี่ยนบ่อย ดูจากหน้าราคาของแต่ละเจ้าเป็นหลัก
// ใช้คำนวณค่าใช้จ่ายคร่าวๆ ในหน้าประวัติการใช้ AI · รุ่นที่ไม่มีในตาราง = คิดเป็น 0
export const PRICING = {
  // Gemini
  'gemini-3.1-pro-preview': [1.25, 5],
  'gemini-3.1-flash-lite': [0.10, 0.40],
  'gemini-3.5-flash': [0.30, 1.20],
  'gemini-3-flash-preview': [0.15, 0.60],
  // Claude
  'claude-opus-4-8': [15, 75],
  'claude-sonnet-5': [3, 15],
  'claude-haiku-4-5': [0.80, 4],
  // GPT (OpenAI)
  'gpt-4.1-mini': [0.40, 1.60],
  'gpt-4.1': [2, 8],
  'gpt-4.1-nano': [0.10, 0.40],
  'gpt-4o': [2.50, 10],
  'gpt-4o-mini': [0.15, 0.60],
  // DeepSeek
  'deepseek-chat': [0.27, 1.10],
  'deepseek-reasoner': [0.55, 2.19],
  // Kimi (Moonshot)
  'kimi-k2-0905-preview': [0.60, 2.50],
  'moonshot-v1-128k': [2, 2],
  'moonshot-v1-32k': [1, 1],
  'moonshot-v1-8k': [0.30, 0.30],
  // Qwen (Alibaba)
  'qwen-plus': [0.40, 1.20],
  'qwen-max': [1.60, 6.40],
  'qwen-turbo': [0.05, 0.20],
  // GLM (Zhipu)
  'glm-4.6': [0.60, 2.20],
  'glm-4.5': [0.60, 2.20],
  'glm-4.5-air': [0.20, 1.10],
  'glm-4-flash': [0, 0],
};

// คำนวณค่าใช้จ่ายประมาณ (USD) จาก token ขาเข้า/ออก
export function estCost(model, tokensIn, tokensOut) {
  const p = PRICING[model];
  if (!p) return 0;
  return ((tokensIn || 0) * p[0] + (tokensOut || 0) * p[1]) / 1e6;
}
