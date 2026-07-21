'use client';
import { PROVIDERS } from '@/lib/providers';
import { DEFAULT_PROMPT_EN } from '@/lib/prompt';
import { thNum, aiModel, DRAFT_KEY, PAL } from '@/components/helpers';

export function processActions(app) {
  app.loadAiLogs = async () => {
    app.setState({ aiLogLoading: true });
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      app.setState({ aiLogs: data.logs || [], aiSummary: data.summary || null, aiLogLoading: false });
    } catch (e) {
      app.setState({ aiLogLoading: false });
      app.flash('โหลดประวัติไม่สำเร็จ');
    }
  };
  app.pasteClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t || !t.trim()) { app.flash('คลิปบอร์ดว่าง — คัดลอกข้อความมาก่อน'); return; }
      app.setState((s) => ({ addText: s.addText.trim() ? s.addText.trim() + '\n' + t.trim() : t.trim() }));
      app.flash('วางข้อความแล้ว');
    } catch (e) {
      app.flash('เบราว์เซอร์ไม่อนุญาตให้วางอัตโนมัติ กด Ctrl+V ในช่องได้');
    }
  };

  // ---------- process (Add → Review) ----------
  app.process = async () => {
    const text = app.state.addText.trim();
    if (!text) { app.flash('ยังไม่มีข้อความให้จัด'); return; }
    const provider = app.eff('aiProvider', 'basic');
    const model = app.eff('aiModel:' + provider, '');
    // ชื่อเจ้า/รุ่นสำหรับโชว์บนหน้าโหลด
    const base = PROVIDERS[provider] || { label: provider, models: [] };
    // ชื่อรุ่นในทะเบียน providers.js มีคะแนนดาว/คำอธิบายต่อท้ายด้วย " · " (เช่น "GPT-5.1 · ★★★☆☆ 3.0 ...")
    // เก็บชื่อเต็ม (มีดาว) ไว้ → จอคอม/หน้าโหลดโชว์ดาวได้ · มือถือค่อยตัดเหลือชื่อรุ่นล้วนตอนแสดง (aiModel)
    const modelName = (base.models || []).reduce((a, m) => a || (m.id === model ? m.name : ''), '') || model || '';
    // เซฟข้อความกันหาย (เผลอรีเฟรชระหว่างรอ) + เตรียมตัวยกเลิก
    try { localStorage.setItem(DRAFT_KEY, text); } catch (e) {}
    app._abort = new AbortController();
    const started = Date.now();
    // ตั้งข้อมูลช่อไว้ล่วงหน้า ส่งไปกับคำขอ — เซิร์ฟเวอร์จะเขียนผลลงคลาวด์ทันทีที่ AI ตอบ
    // (ปิด/รีเฟรชหน้าระหว่างรอ ผลที่จ่ายเงินไปแล้วก็ไม่หาย) · รู้เลขช่อตั้งแต่แรกจึงยกเลิกได้ตรงช่อ
    const prevAll = app.normBatches(app.state.review);
    const bMeta = {
      id: 'b_' + Date.now().toString(36),
      no: prevAll.reduce((mx, r) => Math.max(mx, r.batchNo || 1), 0) + 1,
      at: Date.now(),
      ai: modelName || (base.label || provider), // เก็บชื่อรุ่นเต็ม (มีดาว) · จอคอมโชว์เต็ม มือถือตัดเหลือรุ่นล้วน · ไม่มีรุ่น (พื้นฐาน) เก็บชื่อเจ้า
      novel: app.state.novelInput.trim() || 'ไม่ระบุเรื่อง',
      startPos: prevAll.length,
    };
    app._pendingBatch = bMeta;
    app.setState({ processing: true, procStep: 0, procElapsed: 0, procProviderKey: provider, procProvider: base.label || provider, procModel: modelName, draftRestored: false });
    let i = 0; clearInterval(app._proc);
    app._proc = setInterval(() => { i++; if (i < 3) app.setState({ procStep: i }); }, 560);
    clearInterval(app._sec); // นับวินาทีที่ใช้ไป
    app._sec = setInterval(() => app.setState({ procElapsed: Math.round((Date.now() - started) / 1000) }), 1000);
    try {
      const res = await fetch('/api/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: app._abort.signal,
        body: JSON.stringify({
          text, provider, model,
          prompt: app.eff('aiPromptEn', '') || DEFAULT_PROMPT_EN,
          categories: app.state.categories.map((c) => ({ id: c.id, name_th: c.n })),
          batch: bMeta,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const proposedCats = [], nameToId = {};
      (data.proposed_categories || []).forEach((pc, idx) => {
        const id = 'c' + Date.now().toString(36) + idx;
        proposedCats.push({ id, n: pc.name_th, en: '', c: PAL[idx % PAL.length], k: '✦', proposed: true });
        nameToId[pc.name_th] = id;
      });
      // ===== ช่อใหม่ =====  ต่อท้ายคำที่ค้างอยู่เดิม ไม่ทับ (แก้บั๊กคำค้างหาย)
      // ใช้ข้อมูลช่อชุดเดียวกับที่ส่งไปให้เซิร์ฟเวอร์ ผลในเครื่องกับบนคลาวด์จึงเป็นช่อเดียวกันเป๊ะ
      const prevReview = app.normBatches(app.state.review);
      const bId = bMeta.id, bNo = bMeta.no, bAt = bMeta.at, bAi = bMeta.ai, bNovel = bMeta.novel;
      let n = 0;
      const fresh = (data.items || []).map((it) => {
        n++;
        const cat = it.category_id || nameToId[it.proposed_category] || 'c8';
        return { id: 'r_' + bAt.toString(36) + '_' + n + '_' + Math.random().toString(36).slice(2, 6), text: it.text, original: it.original, kind: it.kind || '', subpath: (it.subcategories && it.subcategories[0]) || it.subcategory || '', subpaths: Array.isArray(it.subcategories) ? it.subcategories : (it.subcategory ? [it.subcategory] : []), category: cat, proposedNew: !!it.proposed_category, meaning: it.meaning || '', reason: it.reason || '', selected: false, notes: it.notes || [], source: it.source || '', batch: bId, batchNo: bNo, batchAt: bAt, batchAi: bAi, novel: bNovel };
      });
      const review = [...prevReview, ...fresh];
      const categories = proposedCats.length ? [...app.state.categories, ...proposedCats] : app.state.categories;
      const wait = Math.max(0, 1780 - (Date.now() - started));
      setTimeout(() => {
        clearInterval(app._proc); clearInterval(app._sec);
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} // จัดเสร็จแล้ว ข้อความไปอยู่หน้าตรวจทาน ลบตัวสำรองได้
        app.setState({
          categories, review, processing: false, page: 'review', addText: '',
          activeBatch: bId, // เปิดช่อใหม่ให้เลย
          reviewNovel: bNovel,
          lastAiLogId: data.aiLogId || null, // ไว้เติมจำนวนคำที่บันทึกจริงลง log ตอนกดบันทึก
        }, () => {
          app.toTop();
          app.persistReviewNow(); // ช่อใหม่ = ส่งขึ้นคลาวด์ทันที ห้ามรอ debounce (เคยหายเพราะรีเฟรชแทรกกลางคัน)
          // มีคำค้างจากช่อก่อน → แจ้งอย่างเดียวว่าตอนนี้มีกี่ช่อ ช่อละกี่คำ (ไม่ถามให้เลือก คำเก่าอยู่ครบเสมอ)
          if (prevReview.length) {
            const list = app.batchList(review);
            const lines = list.map((b) => '• ช่อที่ ' + thNum(b.no) + (b.novel ? ' · ' + b.novel : '') + '  —  ' + b.count + ' คำ');
            app.askConfirm({
              alert: true, tone: 'info', icon: '🌿', okLabel: 'ไปหน้าตรวจทาน',
              title: 'เพิ่มเป็นช่อที่ ' + thNum(bNo) + ' แล้ว',
              msg: 'คำรอตรวจทานที่มีอยู่ตอนนี้\n\n' + lines.join('\n') + '\n\nรวม ' + list.length + ' ช่อ ' + review.length + ' คำ',
            });
          }
          // 🚨 ตาข่ายกันคำหายทำงาน — ต้องบอกผู้ใช้เสมอ ไม่ใช่เติมกลับเงียบ ๆ
          // (บางรุ่นตัดบรรทัดที่พิมพ์เข้ามาทิ้ง โดยเฉพาะคำเดี่ยวที่ไปซ้ำกับคำในประโยคยาวบรรทัดอื่น)
          const restored = Array.isArray(data.restored) ? data.restored : [];
          if (restored.length) {
            const show = restored.slice(0, 12).map((w) => '• ' + w).join('\n');
            setTimeout(() => app.askConfirm({
              alert: true, tone: 'warn', icon: '🛟', okLabel: 'เข้าใจแล้ว',
              title: 'ระบบเติมคำที่ AI ตัดทิ้งกลับให้ ' + restored.length + ' คำ',
              msg: 'AI รุ่นนี้ตัดบรรทัดที่พิมพ์เข้ามาทิ้ง ระบบตรวจเจอและเติมกลับให้แล้ว\n\n' + show
                + (restored.length > 12 ? '\n… และอีก ' + (restored.length - 12) + ' คำ' : '')
                + '\n\nคำเหล่านี้ยังไม่ได้จัดหมวด ติดป้าย "⚠ ระบบเติมกลับ" ไว้ในหน้าตรวจทาน เลือกหมวดให้ได้เลย',
            }), prevReview.length ? 400 : 0);
          }
        });
      }, wait);
    } catch (e) {
      clearInterval(app._proc); clearInterval(app._sec);
      // ยกเลิกเอง (กดปุ่มยกเลิก) → เงียบๆ คงข้อความไว้ครบ ไม่ขึ้น error
      if (e && e.name === 'AbortError') { app.setState({ processing: false }); return; }
      app.setState({ processing: false });
      // AI ล้มเหลว (เช่น โควตาเต็ม/รุ่นล่ม) → เตือนใหญ่กลางจอ ข้อความที่พิมพ์ยังอยู่ครบ retry ได้
      const detail = e && e.message ? String(e.message) : 'ไม่ทราบสาเหตุ';
      app.askConfirm({
        alert: true, danger: true, okLabel: 'รับทราบ',
        title: 'AI จัดคำไม่สำเร็จ',
        msg: 'ระบบ AI กรองคำไม่สำเร็จรอบนี้\n\nสาเหตุ: ' + detail + '\n\nข้อความที่พิมพ์ไว้ยังอยู่ครบ ลองกดจัดคำใหม่อีกครั้ง หรือสลับไปใช้ AI เจ้าอื่น/รุ่นอื่น (บางรุ่นอาจเต็มโควตาชั่วคราว)',
      });
    }
  };

  // ยกเลิกการจัดคำระหว่างรอ (ผ่านป๊อปยืนยัน) — ข้อความยังอยู่ครบ
  app.cancelProcess = () => {
    app.askConfirm({ title: 'ยกเลิกการจัดคำ', msg: 'หยุดการทำงานของ AI รอบนี้ ข้อความที่พิมพ์ไว้จะยังอยู่ครบ', okLabel: 'ยกเลิกการจัดคำ', danger: true, onOk: () => {
      if (app._abort) { try { app._abort.abort(); } catch (e) {} }
      clearInterval(app._proc); clearInterval(app._sec);
      // เซิร์ฟเวอร์อาจเขียนช่อนี้ลงคลาวด์ไปแล้ว (มันเขียนทันทีที่ AI ตอบ) → สั่งลบช่อนั้นทิ้งให้ตรงกัน
      const b = app._pendingBatch;
      if (b && b.id) {
        fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removeBatch', batch: b.id }) }).catch(() => {});
      }
      app._pendingBatch = null;
      app.setState({ processing: false });
      app.flash('ยกเลิกการจัดคำแล้ว');
    } });
  };
}
