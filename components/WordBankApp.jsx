'use client';
// คลังคำ (Word Bank) — แอปหลัก พอร์ตจากต้นแบบ WordBank.dc.html
// เก็บข้อมูลจริงบน Supabase ผ่าน API (แทน localStorage ในต้นแบบ)
// การตั้งค่าแสดงผล (ui) ยังเก็บใน localStorage
import React from 'react';
import { rgba, mix, shade, badge, pill, dot } from '@/lib/colors';
import { SUBTREE } from '@/lib/subtree';
import { CATMETA } from '@/lib/catmeta';
import { PROVIDERS, PROVIDER_ORDER } from '@/lib/providers';
import { BrandIcon } from '@/lib/brandIcons';
import { DEFAULT_PROMPT_EN, DEFAULT_PROMPT_TH } from '@/lib/prompt';

export const VERSION = '0.0.0.0'; // ยังไม่เริ่มนับเวอร์ชัน — เลื่อนเมื่อพี่กันสั่งเท่านั้น
const UI_KEY = 'wordbank:v1:ui';
const REVIEW_KEY = 'wordbank:v1:review';
const DRAFT_KEY = 'wordbank:v1:draft'; // ข้อความที่กำลังจัด — เซฟกันหายตอนเผลอรีเฟรชระหว่างรอ AI
const PAL = ['#8f6b4a', '#5f7f92', '#a86a79', '#6f8a56', '#7c6a99', '#3f7d6c'];

export default class WordBankApp extends React.Component {
  state = {
    page: 'add', novelInput: '', addText: '',
    library: [], novels: [], categories: [],
    review: [], reviewNovel: '',
    activeBatch: '',     // ช่อที่กำลังเปิดดูในหน้าตรวจทาน (แสดงทีละช่อ กันหน้าหน่วงตอนมีหลายช่อ)
    processing: false, procStep: 0,
    procElapsed: 0, procProvider: '', procProviderKey: '', procModel: '', // หน้าโหลด: วินาทีที่ใช้ + เจ้า/รุ่นที่กำลังใช้
    draftRestored: false, // มีข้อความค้างจากรอบก่อนที่กู้กลับมา (โชว์แถบแจ้ง)
    lastAiLogId: null,    // id แถว log ของรอบ AI ล่าสุด (เติมจำนวนคำที่บันทึกจริงตอนกดบันทึก)
    aiLogs: [], aiSummary: null, aiLogLoading: false, aiLogFilter: 'all', // หน้าประวัติการใช้ AI
    aiReady: {},          // AI เจ้าไหนใส่กุญแจไว้แล้ว (true/false ล้วน มาจากเซิร์ฟเวอร์) — ใช้ในหน้าเกี่ยวกับ
    q: '', filterCat: 'all', filterNovel: 'all', filterKind: 'all', sort: 'recent', libView: 'cards',
    confirmId: null, toast: '',
    modal: null, ui: {}, exactFilter: '', dupOnly: false, editing: null,
    mergeFrom: '', mergeTo: '', newCatName: '',
    loading: true, loadError: '',
    collapsed: {}, // สถานะยุบกลุ่มในหน้าคลังคำ (key = anchor id)
    promptOpen: false,   // กล่องคำสั่ง AI ในหน้าเพิ่มคำ — ยุบไว้ก่อน
    promptUnlock: false, // ต้องกด "เปิดแก้ไข" ก่อนถึงแก้คำสั่งได้ (กันเผลอลบ) · ล็อกใหม่ทุกครั้งที่โหลด
    confirm: null,       // ป๊อปอัปยืนยันกลาง {title,msg,okLabel,danger,onOk}
    reviewSort: null,    // การเรียงในตารางตรวจทาน {key,dir}
    srcCollapsed: {},    // ยุบ/ขยายกลุ่มประโยคต้นทาง ในมุมมอง "จับกลุ่มประโยค"
    treeCollapsed: {},   // ยุบ/ขยายหมวด ในมุมมอง "แบบคลังคำ" (ต้นไม้หมวด→หมวดย่อย)
    editCard: null,      // id การ์ดที่กำลังแก้คำหลัก (การ์ดประโยคตั้งต้นที่ไฮไลต์อยู่ กดเพื่อแก้)
  };
  toggleSrc = (key) => this.setState((s) => ({ srcCollapsed: { ...s.srcCollapsed, [key]: !s.srcCollapsed[key] } }));
  toggleTree = (key) => this.setState((s) => ({ treeCollapsed: { ...s.treeCollapsed, [key]: !s.treeCollapsed[key] } }));
  // เรียงตารางตรวจทาน: กดหัวคอลัมน์วน asc → desc → ไม่เรียง
  toggleReviewSort = (key) => this.setState((s) => ({ reviewSort: s.reviewSort && s.reviewSort.key === key ? (s.reviewSort.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' } }));

  // ---------- ป๊อปอัปยืนยันกลาง (ใช้ทุกปุ่มที่มี action สำคัญ) ----------
  askConfirm = (opts) => this.setState({ confirm: { ...opts } });
  closeConfirm = () => this.setState({ confirm: null });
  renderConfirm() {
    const c = this.state.confirm;
    if (!c) return null;
    // คลิกนอกป๊อป (backdrop) = ไม่ปิด ต้องกดปุ่มเอง (กันเผลอ)
    // โหมด alert = แจ้งเตือนอย่างเดียว (ปุ่มเดียว ไม่มียกเลิก) มีไอคอนใหญ่ เช่น AI ล้มเหลว
    const isAlert = !!c.alert;
    const info = c.tone === 'info'; // โทนแจ้งให้ทราบ (เขียว ไม่กระพริบ) — ต่างจากโทนเตือนล้มเหลว (แดง)
    return (
      <div style={{ position: 'fixed', inset: 0, background: isAlert ? 'rgba(48,30,26,.55)' : 'rgba(58,47,40,.42)', zIndex: 95, display: 'grid', placeItems: 'center', padding: '20px', animation: 'wbfade .18s ease' }}>
        <div style={{ background: 'var(--surface,#fffdf6)', border: '1px solid ' + (isAlert ? (info ? '#cbdcb8' : '#e8b4a8') : '#e0d0ac'), borderRadius: '16px', padding: isAlert ? '32px 30px 26px' : '26px 28px', width: 'min(' + (isAlert ? '460' : '410') + 'px,92vw)', boxShadow: '0 24px 64px rgba(58,47,40,.32)', textAlign: isAlert ? 'center' : 'left' }}>
          {isAlert && <div style={{ width: '66px', height: '66px', margin: '0 auto 16px', borderRadius: '50%', background: info ? '#e9efe1' : '#fbe7e2', display: 'grid', placeItems: 'center', fontSize: '34px', animation: info ? 'none' : 'wbalert 1.1s ease-in-out infinite' }}>{c.icon || '⚠'}</div>}
          <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: isAlert ? '23px' : '20px', color: isAlert ? (info ? '#4f6b3c' : '#9c3b2b') : '#33291f', marginBottom: c.msg ? '10px' : '20px' }}>{c.title}</div>
          {c.msg ? <div style={{ fontSize: '14.5px', color: '#6f6252', lineHeight: 1.6, marginBottom: '24px', whiteSpace: 'pre-line', textAlign: isAlert && c.msg.indexOf('\n') >= 0 ? 'left' : undefined }}>{c.msg}</div> : null}
          <div style={{ display: 'flex', gap: '10px', justifyContent: isAlert ? 'center' : 'flex-end' }}>
            {!isAlert && <button onClick={this.closeConfirm} style={{ padding: '10px 18px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', fontSize: '14.5px', cursor: 'pointer' }}>ยกเลิก</button>}
            <button onClick={() => { const ok = c.onOk; this.closeConfirm(); if (ok) ok(); }} style={{ padding: isAlert ? '11px 34px' : '10px 22px', border: 'none', borderRadius: '9px', background: c.danger ? 'var(--accent,#9c3b2b)' : 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}>{c.okLabel || 'ยืนยัน'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- lifecycle ----------
  componentWillUnmount() {
    if (this._onUnload && typeof window !== 'undefined') window.removeEventListener('beforeunload', this._onUnload);
    clearInterval(this._proc); clearInterval(this._sec); clearTimeout(this._rvPush);
    this._flushReview(true);
  }
  async componentDidMount() {
    // ปิด/รีเฟรชหน้า → รีบ sync คำตรวจทานที่ค้างขึ้นคลาวด์ก่อน (กันหาย)
    this._onUnload = () => this._flushReview(true);
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', this._onUnload);
    let ui = {}, review = [], collapsed = {}, hadCollapsed = false, draft = '';
    try {
      const su = localStorage.getItem(UI_KEY);
      if (su) { const p = JSON.parse(su); if (p && typeof p === 'object') ui = p; }
      const rv = localStorage.getItem(REVIEW_KEY);
      if (rv) { const r = JSON.parse(rv); if (Array.isArray(r) && r.length) review = this.normBatches(r); }
      const cl = localStorage.getItem('wordbank:v1:collapsed');
      if (cl) { const p = JSON.parse(cl); if (p && typeof p === 'object') { collapsed = p; hadCollapsed = true; } }
      const dr = localStorage.getItem(DRAFT_KEY);
      if (dr && typeof dr === 'string' && dr.trim()) draft = dr;
    } catch (e) {}
    // มีข้อความค้าง (เผลอรีเฟรช/ปิดหน้าระหว่างรอ AI) → กู้กลับมาใส่ช่องพิมพ์ + แจ้งเตือน
    const patch = { ui, review, collapsed, activeBatch: this.activeBatchId(review, '') };
    if (draft) { patch.addText = draft; patch.draftRestored = true; }
    this.setState(patch);
    try {
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const cats = data.categories || [];
      // ครั้งแรก (ยังไม่เคยตั้งค่ายุบ) → ยุบทุกหมวดไว้ก่อน กันหน้ายาว/หน่วงตอนโหลดคำ 679 ใบ
      let col = this.state.collapsed;
      if (!hadCollapsed) { col = {}; cats.forEach((c) => { col['g-' + c.id] = 1; }); }
      const base2 = { categories: cats, novels: data.novels || [], library: data.words || [], loading: false, collapsed: col, aiReady: data.aiReady || {} };
      const cloudReview = this.normBatches(Array.isArray(data.review) ? data.review : [], data.reviewNovel);
      if (cloudReview.length) {
        // คลาวด์มีคำค้าง → ใช้เป็นแหล่งหลัก ทับของในเครื่อง (เปิดเครื่องไหนก็เห็นตรงกัน)
        base2.review = cloudReview;
        base2.activeBatch = this.activeBatchId(cloudReview, '');
        base2.reviewNovel = data.reviewNovel || this.state.reviewNovel || 'ไม่ระบุเรื่อง';
        this.setState(base2, () => { try { localStorage.setItem(REVIEW_KEY, JSON.stringify(cloudReview)); } catch (e) {} });
      } else if (this.state.review.length) {
        // คลาวด์ว่าง แต่ในเครื่องมีค้าง (sync รอบก่อนยังไม่ถึง) → ดันขึ้นคลาวด์
        this.setState(base2, this.scheduleReviewPush);
      } else {
        this.setState(base2);
      }
    } catch (e) {
      this.setState({ loading: false, loadError: e.message || 'โหลดข้อมูลไม่สำเร็จ' });
    }
  }

  persistUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(this.state.ui || {})); } catch (e) {} };
  // เซฟลงเบราว์เซอร์ (ทันที) + sync ขึ้นคลาวด์ (หน่วง 0.5 วิ กันยิงถี่ตอนพิมพ์)
  persistReview = () => {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(this.state.review)); } catch (e) {}
    this.scheduleReviewPush();
  };
  scheduleReviewPush = () => {
    this._rvPending = { action: 'replace', novel: this.state.reviewNovel, items: this.state.review };
    clearTimeout(this._rvPush);
    this._rvPush = setTimeout(() => this._flushReview(false), 500);
  };
  _flushReview = (beacon) => {
    const payload = this._rvPending;
    if (!payload) return;
    this._rvPending = null; clearTimeout(this._rvPush);
    try {
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon('/api/review', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } else {
        fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
      }
    } catch (e) {}
  };

  // ---------- ช่อคำ (batch) ----------
  // ทุกครั้งที่กดจัดคำ = ช่อใหม่ ต่อท้ายของเดิม คำที่ยังไม่บันทึกจึงไม่มีทางถูกทับ
  // หน้าตรวจทานเปิดทีละช่อ (แท็บ) — 3 ช่อ ช่อละ 40 คำ ก็ไม่ต้องเรนเดอร์ 120 การ์ดพร้อมกัน
  static thNum(n) { return String(n).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[+d]); }
  // คำที่ค้างมาก่อนมีระบบช่อ → ยกเป็นช่อที่ ๑
  normBatches(list, fallbackNovel) {
    return (list || []).map((r) => r && r.batch ? r : { ...r, batch: 'b_legacy', batchNo: 1, batchAt: r.batchAt || 0, batchAi: r.batchAi || '', novel: r.novel || fallbackNovel || '' });
  }
  batchList(review) {
    const src = review || this.state.review;
    const m = new Map();
    src.forEach((r) => {
      const id = r.batch || 'b_legacy';
      if (!m.has(id)) m.set(id, { id, no: r.batchNo || 1, at: r.batchAt || 0, ai: r.batchAi || '', novel: r.novel || '', count: 0 });
      m.get(id).count++;
    });
    return [...m.values()].sort((a, b) => a.no - b.no);
  }
  // ช่อที่เปิดอยู่ — ถ้าช่อที่จำไว้หายไปแล้ว (บันทึก/ลบไป) ให้ตกไปที่ช่อล่าสุด
  activeBatchId(review, prefer) {
    const list = this.batchList(review);
    if (!list.length) return '';
    const want = prefer !== undefined ? prefer : this.state.activeBatch;
    return list.some((b) => b.id === want) ? want : list[list.length - 1].id;
  }
  batchItems(review, id) {
    const src = review || this.state.review;
    const bid = id || this.activeBatchId(src);
    return src.filter((r) => (r.batch || 'b_legacy') === bid);
  }
  // เปลี่ยนช่อ = ล้างการเลือกเดิม (กันเผลอสั่งงานกับคำในช่อที่ไม่ได้มองอยู่)
  setBatch = (id) => this.setState((s) => ({ activeBatch: id, review: s.review.map((r) => r.selected ? { ...r, selected: false } : r) }));
  // ลบทั้งช่อ (ผ่านป๊อปยืนยัน) — ขอบเขตชัด ไม่ใช่ปุ่มทิ้งทั้งหมดแบบเดิม
  deleteBatch = (b) => {
    this.askConfirm({
      title: 'ลบทั้งช่อที่ ' + WordBankApp.thNum(b.no), danger: true, okLabel: 'ลบทั้งช่อ',
      msg: 'นำคำในช่อนี้ทั้ง ' + b.count + ' คำ ออกจากรายการตรวจทาน ช่ออื่นไม่กระทบ',
      onOk: () => this.setState((s) => {
        const rest = s.review.filter((r) => (r.batch || 'b_legacy') !== b.id);
        return { review: rest, activeBatch: this.activeBatchId(rest, '') };
      }, () => { this.persistReview(); this.flash('ลบช่อที่ ' + WordBankApp.thNum(b.no) + ' แล้ว'); }),
    });
  };

  // ---------- helpers ----------
  flash(msg) { this.setState({ toast: msg }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: '' }), 2400); }
  stop = (e) => { e.stopPropagation(); };
  onNav = (p) => () => { this.setState({ page: p, confirmId: null }); if (p === 'ailog') this.loadAiLogs(); };
  // โหลดประวัติการใช้ AI (เรียกตอนเข้าหน้า + ปุ่มรีเฟรช)
  loadAiLogs = async () => {
    this.setState({ aiLogLoading: true });
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.setState({ aiLogs: data.logs || [], aiSummary: data.summary || null, aiLogLoading: false });
    } catch (e) {
      this.setState({ aiLogLoading: false });
      this.flash('โหลดประวัติไม่สำเร็จ');
    }
  };
  setUi = (key, val) => () => { const ui = { ...this.state.ui, [key]: val }; this.setState({ ui }, this.persistUi); };
  resetSettings = () => this.setState({ ui: {} }, this.persistUi);
  openSettings = () => this.setState({ modal: 'settings' });
  closeSettings = () => this.setState({ modal: null });

  // วางข้อความจากคลิปบอร์ด (ที่พี่กันคัดลอกมา) ลงช่องเพิ่มคำเลย
  pasteClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t || !t.trim()) { this.flash('คลิปบอร์ดว่าง — คัดลอกข้อความมาก่อน'); return; }
      this.setState((s) => ({ addText: s.addText.trim() ? s.addText.trim() + '\n' + t.trim() : t.trim() }));
      this.flash('วางข้อความแล้ว');
    } catch (e) {
      this.flash('เบราว์เซอร์ไม่อนุญาตให้วางอัตโนมัติ กด Ctrl+V ในช่องได้');
    }
  };

  // ---------- process (Add → Review) ----------
  process = async () => {
    const text = this.state.addText.trim();
    if (!text) { this.flash('ยังไม่มีข้อความให้จัด'); return; }
    const provider = this.eff('aiProvider', 'basic');
    const model = this.eff('aiModel:' + provider, '');
    // ชื่อเจ้า/รุ่นสำหรับโชว์บนหน้าโหลด
    const base = PROVIDERS[provider] || { label: provider, models: [] };
    const modelName = (base.models || []).reduce((a, m) => a || (m.id === model ? m.name : ''), '') || model || '';
    // เซฟข้อความกันหาย (เผลอรีเฟรชระหว่างรอ) + เตรียมตัวยกเลิก
    try { localStorage.setItem(DRAFT_KEY, text); } catch (e) {}
    this._abort = new AbortController();
    const started = Date.now();
    this.setState({ processing: true, procStep: 0, procElapsed: 0, procProviderKey: provider, procProvider: base.label || provider, procModel: modelName, draftRestored: false });
    let i = 0; clearInterval(this._proc);
    this._proc = setInterval(() => { i++; if (i < 3) this.setState({ procStep: i }); }, 560);
    clearInterval(this._sec); // นับวินาทีที่ใช้ไป
    this._sec = setInterval(() => this.setState({ procElapsed: Math.round((Date.now() - started) / 1000) }), 1000);
    try {
      const res = await fetch('/api/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: this._abort.signal,
        body: JSON.stringify({
          text, provider, model,
          prompt: this.eff('aiPromptEn', '') || DEFAULT_PROMPT_EN,
          categories: this.state.categories.map((c) => ({ id: c.id, name_th: c.n })),
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
      const prevReview = this.normBatches(this.state.review);
      const maxNo = prevReview.reduce((a, r) => Math.max(a, r.batchNo || 1), 0);
      const bId = 'b_' + Date.now().toString(36);
      const bNo = maxNo + 1;
      const bAt = Date.now();
      const bAi = (base.label || provider) + (modelName ? ' · ' + modelName : '');
      const bNovel = this.state.novelInput.trim() || 'ไม่ระบุเรื่อง';
      let n = 0;
      const fresh = (data.items || []).map((it) => {
        n++;
        const cat = it.category_id || nameToId[it.proposed_category] || 'c8';
        return { id: 'r_' + bAt.toString(36) + '_' + n + '_' + Math.random().toString(36).slice(2, 6), text: it.text, original: it.original, kind: it.kind || '', subpath: it.subcategory || '', category: cat, proposedNew: !!it.proposed_category, meaning: '', selected: false, notes: it.notes || [], source: it.source || '', batch: bId, batchNo: bNo, batchAt: bAt, batchAi: bAi, novel: bNovel };
      });
      const review = [...prevReview, ...fresh];
      const categories = proposedCats.length ? [...this.state.categories, ...proposedCats] : this.state.categories;
      const wait = Math.max(0, 1780 - (Date.now() - started));
      setTimeout(() => {
        clearInterval(this._proc); clearInterval(this._sec);
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} // จัดเสร็จแล้ว ข้อความไปอยู่หน้าตรวจทาน ลบตัวสำรองได้
        this.setState({
          categories, review, processing: false, page: 'review', addText: '',
          activeBatch: bId, // เปิดช่อใหม่ให้เลย
          reviewNovel: bNovel,
          lastAiLogId: data.aiLogId || null, // ไว้เติมจำนวนคำที่บันทึกจริงลง log ตอนกดบันทึก
        }, () => {
          this.persistReview();
          // มีคำค้างจากช่อก่อน → แจ้งอย่างเดียวว่าตอนนี้มีกี่ช่อ ช่อละกี่คำ (ไม่ถามให้เลือก คำเก่าอยู่ครบเสมอ)
          if (prevReview.length) {
            const list = this.batchList(review);
            const lines = list.map((b) => '• ช่อที่ ' + WordBankApp.thNum(b.no) + (b.novel ? ' · ' + b.novel : '') + '  —  ' + b.count + ' คำ');
            this.askConfirm({
              alert: true, tone: 'info', icon: '🌿', okLabel: 'ไปหน้าตรวจทาน',
              title: 'เพิ่มเป็นช่อที่ ' + WordBankApp.thNum(bNo) + ' แล้ว',
              msg: 'คำรอตรวจทานที่มีอยู่ตอนนี้\n\n' + lines.join('\n') + '\n\nรวม ' + list.length + ' ช่อ ' + review.length + ' คำ',
            });
          }
        });
      }, wait);
    } catch (e) {
      clearInterval(this._proc); clearInterval(this._sec);
      // ยกเลิกเอง (กดปุ่มยกเลิก) → เงียบๆ คงข้อความไว้ครบ ไม่ขึ้น error
      if (e && e.name === 'AbortError') { this.setState({ processing: false }); return; }
      this.setState({ processing: false });
      // AI ล้มเหลว (เช่น โควตาเต็ม/รุ่นล่ม) → เตือนใหญ่กลางจอ ข้อความที่พิมพ์ยังอยู่ครบ retry ได้
      const detail = e && e.message ? String(e.message) : 'ไม่ทราบสาเหตุ';
      this.askConfirm({
        alert: true, danger: true, okLabel: 'รับทราบ',
        title: 'AI จัดคำไม่สำเร็จ',
        msg: 'ระบบ AI กรองคำไม่สำเร็จรอบนี้\n\nสาเหตุ: ' + detail + '\n\nข้อความที่พิมพ์ไว้ยังอยู่ครบ ลองกดจัดคำใหม่อีกครั้ง หรือสลับไปใช้ AI เจ้าอื่น/รุ่นอื่น (บางรุ่นอาจเต็มโควตาชั่วคราว)',
      });
    }
  };

  // ยกเลิกการจัดคำระหว่างรอ (ผ่านป๊อปยืนยัน) — ข้อความยังอยู่ครบ
  cancelProcess = () => {
    this.askConfirm({ title: 'ยกเลิกการจัดคำ', msg: 'หยุดการทำงานของ AI รอบนี้ ข้อความที่พิมพ์ไว้จะยังอยู่ครบ', okLabel: 'ยกเลิกการจัดคำ', danger: true, onOk: () => {
      if (this._abort) { try { this._abort.abort(); } catch (e) {} }
      clearInterval(this._proc); clearInterval(this._sec);
      this.setState({ processing: false });
      this.flash('ยกเลิกการจัดคำแล้ว');
    } });
  };
  get procText() { return ['กำลังตรวจและแก้คำสะกด…', 'กำลังแยกวลีย่อยที่น่าเก็บ…', 'กำลังจัดเข้าหมวดหมู่…'][this.state.procStep] || ''; }

  // ---------- review actions (transient) ----------
  updateReview(id, patch) { this.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, ...patch } : r) }), this.persistReview); }
  toggleSel(id) { this.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, selected: !r.selected } : r) })); }
  // เลือกทั้งหมด = เฉพาะคำในช่อที่เปิดอยู่
  selectAll = (e) => { const v = e.target.checked; const bid = this.activeBatchId(); this.setState((s) => ({ review: s.review.map((r) => (r.batch || 'b_legacy') === bid ? { ...r, selected: v } : r) })); };
  removeReview(id) { this.askConfirm({ title: 'ลบคำนี้', msg: 'นำคำนี้ออกจากรายการตรวจทาน', okLabel: 'ลบ', danger: true, onOk: () => this._removeReview(id) }); }
  _removeReview(id) { this.setState((s) => ({ review: s.review.filter((r) => r.id !== id) }), this.persistReview); }
  bulkMove = (e) => { const cid = e.target.value; if (!cid) return; this.setState((s) => ({ review: s.review.map((r) => r.selected ? { ...r, category: cid, proposedNew: false, selected: false } : r) }), this.persistReview); e.target.value = ''; this.flash('ย้ายหมวดแล้ว'); };
  bulkDelete = () => { const n = this.state.review.filter((r) => r.selected).length; if (!n) return; this.askConfirm({ title: 'ลบที่เลือก', msg: 'นำคำที่เลือก ' + n + ' คำ ออกจากรายการตรวจทาน', okLabel: 'ลบ', danger: true, onOk: () => this.setState((s) => ({ review: s.review.filter((r) => !r.selected) }), this.persistReview) }); };
  clearSel = () => this.setState((s) => ({ review: s.review.map((r) => ({ ...r, selected: false })) }));
  discard = () => { if (!this.state.review.length) return; this.askConfirm({ title: 'ทิ้งทั้งหมด', msg: 'ล้างรายการตรวจทานทั้งหมด คำที่ยังไม่บันทึกจะหายไป', okLabel: 'ทิ้งทั้งหมด', danger: true, onOk: () => { this.setState({ review: [], page: 'add' }, this.persistReview); this.flash('ล้างรายการตรวจทานแล้ว'); } }); };
  // ลบคำที่มีในคลังอยู่แล้ว (ซ้ำ) ออกจากหน้าตรวจทานรวดเดียว
  removeDuplicates = (ids) => {
    const lib = new Set(this.state.library.map((w) => (w.text || '').trim()));
    const idSet = ids && ids.length ? new Set(ids) : null; // ถ้าส่ง ids มา = ลบเฉพาะที่แสดงในมุมมองนั้น
    const dups = this.state.review.filter((r) => lib.has((r.text || '').trim()) && (!idSet || idSet.has(r.id)));
    if (!dups.length) { this.flash('ไม่มีคำซ้ำกับคลัง'); return; }
    const dupIds = new Set(dups.map((r) => r.id));
    this.askConfirm({ title: 'ลบคำซ้ำ', msg: 'ลบคำที่มีในคลังแล้ว ' + dups.length + ' คำ ออกจากรายการตรวจทาน', okLabel: 'ลบคำซ้ำ', danger: true, onOk: () => { this.setState((s) => ({ review: s.review.filter((r) => !dupIds.has(r.id)) }), this.persistReview); this.flash('ลบคำซ้ำออก ' + dups.length + ' คำ'); } });
  };
  // ส่งออกผลตรวจทานเป็นไฟล์ .txt (ไว้เทียบผลระหว่าง AI แต่ละเจ้า/รุ่น)
  exportReview = () => {
    const S = this.state;
    const items = this.batchItems(); // ส่งออกเฉพาะช่อที่เปิดอยู่ (ไว้เทียบผลข้ามช่อ = ข้าม AI)
    if (!items.length) { this.flash('ยังไม่มีคำให้ส่งออก'); return; }
    const bMeta = this.batchList().find((x) => x.id === this.activeBatchId()) || { no: 1, ai: '', novel: '' };
    const catName = {}; S.categories.forEach((c) => { catName[c.id] = c.n; });
    const t = new Date(Date.now() + 7 * 3600 * 1000);
    const p2 = (n) => String(n).padStart(2, '0');
    const date = t.getUTCDate() + '/' + (t.getUTCMonth() + 1) + '/' + (t.getUTCFullYear() + 543) + ' ' + p2(t.getUTCHours()) + ':' + p2(t.getUTCMinutes());
    const extracted = items.filter((r) => (r.source || '').trim()).length;
    const lines = [
      'คลังคำ — ผลตรวจทาน (ไว้เทียบ AI)',
      'ช่อที่ ' + WordBankApp.thNum(bMeta.no),
      'เรื่อง: ' + (bMeta.novel || S.reviewNovel || '-'),
      'AI: ' + (bMeta.ai || S.procProvider || '-'),
      'วันที่: ' + date,
      'จำนวน: ' + items.length + ' คำ (สกัดจากประโยค ' + extracted + ')',
      '────────────────────────────',
    ];
    items.forEach((r, i) => {
      let l = (i + 1) + '. ' + r.text + '  [' + (r.kind || '-') + ']  หมวด: ' + (catName[r.category] || r.category || '-');
      if (r.subpath) l += ' / ' + r.subpath;
      if ((r.original || '').trim() && r.original !== r.text) l += '  (ต้นฉบับ: ' + r.original + ')';
      if ((r.meaning || '').trim()) l += '  ความหมาย: ' + r.meaning;
      if ((r.source || '').trim()) l += '  ✂ จาก: ' + r.source;
      lines.push(l);
    });
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tag = (bMeta.ai || S.procModel || S.procProvider || 'ai').replace(/[^\wก-๙.-]/g, '');
      a.href = url; a.download = 'ตรวจทาน_ช่อ' + bMeta.no + '_' + (bMeta.novel || S.reviewNovel || 'คลังคำ') + '_' + tag + '.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.flash('ส่งออกไฟล์แล้ว');
    } catch (e) { this.flash('ส่งออกไม่สำเร็จ'); }
  };

  // ---------- save (Review → Library) ----------
  // บันทึกเฉพาะ "ช่อที่เปิดอยู่" — ช่ออื่นยังค้างรอตรวจทานต่อ
  save = () => {
    const items = this.batchItems();
    if (!items.length) return;
    const b = this.batchList().find((x) => x.id === this.activeBatchId()) || { no: 1 };
    this.askConfirm({ title: 'บันทึกช่อที่ ' + WordBankApp.thNum(b.no) + ' เข้าคลัง', msg: 'บันทึกคำในช่อนี้ ' + items.length + ' คำ เข้าคลัง (คำที่ซ้ำกับคลังจะถูกข้ามให้อัตโนมัติ)\nช่ออื่นยังอยู่ครบ', okLabel: 'บันทึก', danger: false, onOk: this._save });
  };
  _save = async () => {
    const { categories } = this.state;
    const bid = this.activeBatchId();
    const review = this.batchItems(null, bid);
    if (!review.length) return;
    const reviewNovel = (review[0] && review[0].novel) || this.state.reviewNovel;
    const newCategories = categories.filter((c) => c.proposed).map((c) => ({ id: c.id, name_th: c.n, color: c.c, glyph: c.k }));
    const allWords = review.map((r) => ({ text: r.text.trim(), original_text: r.original || null, meaning: (r.meaning || '').trim(), category_id: r.category, kind: r.kind || null, subpath: r.subpath || null })).filter((w) => w.text);
    // ข้ามคำที่มีในคลังอยู่แล้ว (ข้อความตรงกันเป๊ะ) — ไม่เขียนทับ ไม่สร้างซ้ำ
    const libSet = new Set(this.state.library.map((w) => (w.text || '').trim()));
    const words = allWords.filter((w) => !libSet.has(w.text));
    const skipped = allWords.length - words.length;
    if (!words.length) { this.flash(skipped ? 'ทุกคำมีในคลังอยู่แล้ว ไม่มีคำใหม่ให้บันทึก' : 'ยังไม่มีคำให้บันทึก'); return; }
    const novel = reviewNovel;
    try {
      const res = await fetch('/api/words', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel, newCategories, words }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const saved = data.words || [];
      const nv = (novel && novel !== 'ไม่ระบุเรื่อง' && !this.state.novels.includes(novel)) ? [novel, ...this.state.novels] : this.state.novels;
      // เอาเฉพาะคำในช่อนี้ออก — ช่ออื่นยังค้างอยู่ ถ้ายังเหลือช่อ อยู่หน้าตรวจทานต่อ
      const rest = this.state.review.filter((r) => (r.batch || 'b_legacy') !== bid);
      this.setState({
        library: [...saved, ...this.state.library],
        categories: this.state.categories.map((c) => c.proposed ? { ...c, proposed: false } : c),
        novels: nv, review: rest,
        activeBatch: this.activeBatchId(rest, ''),
        page: rest.length ? 'review' : 'library',
      }, this.persistReview);
      this.flash('บันทึกเข้าคลังแล้ว ' + saved.length + ' คำ' + (skipped ? ' (ข้ามที่มีอยู่แล้ว ' + skipped + ' คำ)' : '') + (rest.length ? ' · ยังเหลืออีก ' + rest.length + ' คำในช่ออื่น' : ''));
      // เติมจำนวนคำที่บันทึกจริง + ข้ามเพราะซ้ำ ลง log ของรอบ AI นี้
      if (this.state.lastAiLogId) {
        fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'saved', id: this.state.lastAiLogId, saved_count: saved.length, skipped_count: skipped }) }).catch(() => {});
        this.setState({ lastAiLogId: null });
      }
    } catch (e) {
      this.flash('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  // ---------- category management ----------
  openCats = () => this.setState({ modal: 'cats', mergeFrom: '', mergeTo: '' });
  closeCats = () => this.setState({ modal: null });
  catCount(id) { return this.state.library.filter((w) => w.category === id).length + this.state.review.filter((r) => r.category === id).length; }
  renameCat(id) {
    return (e) => {
      const v = e.target.value;
      this.setState((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, n: v } : c) }));
      clearTimeout(this['_rn' + id]);
      this['_rn' + id] = setTimeout(() => {
        fetch('/api/categories/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_th: v }) }).catch(() => {});
      }, 500);
    };
  }
  removeCat(id) {
    return async () => {
      if (this.catCount(id) > 0) { this.flash('ย้ายคำออกก่อนถึงจะลบหมวดได้'); return; }
      const prev = this.state.categories;
      this.setState((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
      try {
        const res = await fetch('/api/categories/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      } catch (e) { this.setState({ categories: prev }); this.flash('ลบหมวดไม่สำเร็จ'); }
    };
  }
  onMergeFrom = (e) => this.setState({ mergeFrom: e.target.value });
  onMergeTo = (e) => this.setState({ mergeTo: e.target.value });
  merge = async () => {
    const { mergeFrom, mergeTo } = this.state;
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) { this.flash('เลือกสองหมวดที่ต่างกันก่อน'); return; }
    const prev = { library: this.state.library, categories: this.state.categories, review: this.state.review };
    this.setState((s) => ({
      library: s.library.map((w) => w.category === mergeFrom ? { ...w, category: mergeTo } : w),
      review: s.review.map((r) => r.category === mergeFrom ? { ...r, category: mergeTo } : r),
      categories: s.categories.filter((c) => c.id !== mergeFrom),
      mergeFrom: '', mergeTo: '',
    }), this.persistReview);
    try {
      const res = await fetch('/api/categories/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: mergeFrom, to: mergeTo }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.flash('รวมหมวดแล้ว');
    } catch (e) { this.setState(prev); this.flash('รวมหมวดไม่สำเร็จ'); }
  };
  onNewCatName = (e) => this.setState({ newCatName: e.target.value });
  addCat = async () => {
    const n = this.state.newCatName.trim();
    if (!n) return;
    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_th: n }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.setState((s) => ({ categories: [...s.categories, data.category], newCatName: '' }));
      this.flash('เพิ่มหมวดแล้ว');
    } catch (e) { this.flash('เพิ่มหมวดไม่สำเร็จ'); }
  };

  // ---------- library actions ----------
  onQ = (e) => this.setState({ q: e.target.value });
  onFilterNovel = (e) => this.setState({ filterNovel: e.target.value });
  onSort = (e) => this.setState({ sort: e.target.value });
  setLibView = (v) => () => this.setState({ libView: v });
  setFilterCat = (id) => () => this.setState({ filterCat: id });
  clearExact = () => this.setState({ exactFilter: '' });
  toggleDupOnly = () => this.setState((s) => ({ dupOnly: !s.dupOnly, exactFilter: '' }));

  // ---------- ยุบ/ขยาย + สารบัญ ----------
  persistCollapsed = () => { try { localStorage.setItem('wordbank:v1:collapsed', JSON.stringify(this.state.collapsed)); } catch (e) {} };
  toggleCollapse = (key) => (e) => { if (e) e.stopPropagation(); this.setState((s) => { const c = { ...s.collapsed }; if (c[key]) delete c[key]; else c[key] = 1; return { collapsed: c }; }, this.persistCollapsed); };
  collapseAll = (keys) => () => { const c = {}; keys.forEach((k) => { c[k] = 1; }); this.setState({ collapsed: c }, this.persistCollapsed); };
  expandAll = () => this.setState({ collapsed: {} }, this.persistCollapsed);
  jumpTo = (id, openKeys) => () => {
    this.setState((s) => { const c = { ...s.collapsed }; (openKeys || []).forEach((k) => delete c[k]); return { collapsed: c }; }, () => {
      requestAnimationFrame(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
  };
  askDelete(id) { return () => this.setState({ confirmId: id }); }
  cancelDelete = () => this.setState({ confirmId: null });
  doDelete(id) {
    return async () => {
      const prev = this.state.library;
      this.setState((s) => ({ library: s.library.filter((w) => w.id !== id), confirmId: null }));
      try {
        const res = await fetch('/api/words/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        this.flash('ลบคำแล้ว');
      } catch (e) { this.setState({ library: prev }); this.flash('ลบไม่สำเร็จ'); }
    };
  }
  openEdit(w) { return () => this.setState({ modal: 'edit', editing: { ...w } }); }
  onEditField(f) { return (e) => this.setState((s) => ({ editing: { ...s.editing, [f]: e.target.value } })); }
  saveEdit = async () => {
    const ed = this.state.editing; if (!ed) return;
    const patch = { text: ed.text.trim(), meaning: (ed.meaning || '').trim(), category: ed.category, novel: ed.novel };
    const prev = this.state.library;
    this.setState((s) => ({ library: s.library.map((w) => w.id === ed.id ? { ...w, ...patch } : w), modal: null, editing: null }));
    try {
      const res = await fetch('/api/words/' + ed.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: patch.text, meaning: patch.meaning, category_id: patch.category, novel: patch.novel }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.flash('บันทึกการแก้ไขแล้ว');
    } catch (e) { this.setState({ library: prev }); this.flash('บันทึกไม่สำเร็จ'); }
  };
  cancelEdit = () => this.setState({ modal: null, editing: null });
  deleteFromEdit = async () => {
    const ed = this.state.editing; if (!ed) return;
    const prev = this.state.library;
    this.setState((s) => ({ library: s.library.filter((w) => w.id !== ed.id), modal: null, editing: null }));
    try {
      const res = await fetch('/api/words/' + ed.id, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.flash('ลบคำแล้ว');
    } catch (e) { this.setState({ library: prev }); this.flash('ลบไม่สำเร็จ'); }
  };

  eff(k, d) { const U = this.state.ui || {}; return U[k] != null ? U[k] : d; }

  render() {
    const S = this.state;
    const monoMode = this.eff('categoryColor', 'soft') === 'mono';
    const accent = this.eff('accent', '#9c3b2b');
    const primary = this.eff('primary', '#6f4e37');
    const paper = this.eff('paper', '#f2e8d2');
    const navStyle = 'tabs'; // ใช้แบนเนอร์บนเสมอ (เอา sidebar ออกแล้ว)
    const spell = this.eff('spellDisplay', 'highlight');
    const effLayout = this.eff('reviewLayout', 'cards');
    const rootStyle = {
      minHeight: '100vh', color: '#3a2f28',
      background: 'linear-gradient(' + mix(paper, '#ffffff', 0.32) + ',' + paper + ')',
      fontFamily: "var(--font-sarabun),system-ui,sans-serif", fontSize: '16px', lineHeight: '1.55',
      '--accent': accent, '--primary': primary, '--paper': paper,
      '--surface': mix(paper, '#ffffff', 0.7), '--panel': mix(paper, '#ffffff', 0.48),
    };
    const catMap = {}; S.categories.forEach((c) => { catMap[c.id] = c; });
    const getCat = (id) => catMap[id] || { id, n: 'อื่น ๆ', c: '#8a8175', k: '•' };

    if (S.loading) {
      return (
        <div style={rootStyle}>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '46px', height: '46px', border: '4px solid #e6d4b0', borderTopColor: accent, borderRadius: '50%', margin: '0 auto 16px', animation: 'wbspin 1s linear infinite' }} />
              <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '26px', color: accent }}>คลังคำ</div>
              <div style={{ color: '#8a7d6d', marginTop: '4px' }}>กำลังเปิดคลัง…</div>
            </div>
          </div>
        </div>
      );
    }
    if (S.loadError) {
      return (
        <div style={rootStyle}>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '20px' }}>
            <div style={{ textAlign: 'center', maxWidth: '440px' }}>
              <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>เปิดคลังไม่สำเร็จ</div>
              <p style={{ color: '#8a7d6d' }}>ยังเชื่อมต่อฐานข้อมูลไม่ได้ ตรวจค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ .env.local แล้วเปิดใหม่อีกครั้ง</p>
              <p style={{ color: '#c1a98f', fontSize: '13px', marginTop: '10px' }}>{S.loadError}</p>
            </div>
          </div>
        </div>
      );
    }

    // ----- nav -----
    const navBtn = (active, side) => {
      const base = side
        ? { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', border: 'none', borderRadius: '9px', fontSize: '15.5px', cursor: 'pointer', textAlign: 'left', fontFamily: "var(--font-sarabun),sans-serif" }
        : { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', border: 'none', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: "var(--font-sarabun),sans-serif", transition: 'all .15s' };
      if (active) return { ...base, background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, boxShadow: side ? 'none' : '0 3px 10px rgba(111,78,55,.3)' };
      return { ...base, background: side ? 'transparent' : 'rgba(255,255,255,.35)', color: '#7a6a52' };
    };
    const navItems = [['add', 'เพิ่มคำ', 0], ['review', 'ตรวจทาน', S.review.length], ['library', 'คลังคำ', S.library.length], ['ailog', 'ประวัติ AI', 0], ['about', 'เกี่ยวกับ', 0]].map(([id, label, badgeN]) => ({ id, label, active: S.page === id, badgeN }));
    const badgeStyle = (active) => ({ marginLeft: '2px', fontSize: '12px', fontWeight: 700, minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', display: 'inline-grid', placeItems: 'center', background: active ? 'rgba(255,255,255,.22)' : '#e2d3b0', color: active ? '#fbf3e2' : '#8a7159' });

    const isAdd = S.page === 'add', isReview = S.page === 'review', isLibrary = S.page === 'library', isAiLog = S.page === 'ailog', isAbout = S.page === 'about';

    return (
      <div style={rootStyle}>
        <datalist id="wb-novels">{S.novels.map((nv) => <option key={nv} value={nv} />)}</datalist>

        <button onClick={this.openSettings} title="ตั้งค่าการแสดงผล" style={{ position: 'fixed', top: '16px', right: '18px', zIndex: 55, padding: '9px 18px', borderRadius: '20px', border: '1px solid #d8c7a2', background: 'var(--surface,#fffdf6)', color: 'var(--primary,#6f4e37)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,90,50,.16)' }}>ตั้งค่า</button>

        {navStyle === 'tabs' && (
          <header style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '13px clamp(20px,3vw,40px)', background: 'linear-gradient(180deg, rgba(255,255,255,.4), var(--panel,#f7f0e0))', borderBottom: '1px solid ' + rgba(primary, 0.16), boxShadow: '0 3px 16px rgba(120,90,50,.07)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}>
              <span style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: '34px', color: 'var(--accent,#9c3b2b)', lineHeight: 1, marginTop: '8px' }}>คลังคำ</span>
              <span style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '20px', color: '#b09a72', fontWeight: 400 }}>Word&nbsp;Bank</span>
            </div>
            <span style={{ width: '1px', height: '28px', background: rgba(primary, 0.22) }} />
            <nav style={{ display: 'flex', gap: '7px' }}>
              {navItems.map((n) => (
                <button key={n.id} onClick={this.onNav(n.id)} style={navBtn(n.active, false)}>
                  <span>{n.label}</span>{n.badgeN > 0 && <span style={badgeStyle(n.active)}>{n.badgeN}</span>}
                </button>
              ))}
            </nav>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '17px', color: '#b3a488', whiteSpace: 'nowrap', paddingRight: '112px' }}>“เก็บคำงาม ไว้แต่งเรื่องของเราเอง”</span>
          </header>
        )}

        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh' }}>
          <main style={{ flex: 1, minWidth: 0, padding: '40px clamp(16px,2.5vw,40px) 72px' }}>
            {isAdd && this.renderAdd()}
            {isReview && this.renderReview(getCat, monoMode, spell, effLayout)}
            {isLibrary && this.renderLibrary(getCat, monoMode, accent)}
            {isAiLog && this.renderAiLog()}
            {isAbout && this.renderAbout()}
          </main>
        </div>

        {S.processing && this.renderProcessing(accent)}
        {S.modal === 'edit' && this.renderEditModal()}
        {S.modal === 'cats' && this.renderCatModal(monoMode)}
        {S.modal === 'settings' && this.renderSettings(monoMode, navStyle, spell, effLayout, accent, primary, paper)}
        {this.renderConfirm()}
        {S.toast && (
          <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#3a2f28', color: '#fbf3e2', padding: '13px 26px', borderRadius: '24px', fontSize: '15px', zIndex: 80, boxShadow: '0 8px 24px rgba(58,47,40,.35)', animation: 'wbtoast .28s ease' }}>{S.toast}</div>
        )}
      </div>
    );
  }

  // ============ ADD ============
  renderAdd() {
    const S = this.state;
    const lc = S.addText.split('\n').filter((l) => l.trim()).length;
    const lineHint = S.addText.trim() ? (lc + ' บรรทัด · ราว ' + S.addText.trim().length + ' ตัวอักษร') : 'ยังว่างอยู่';
    const novelChips = S.novels.slice(0, 5);
    const howSteps = [
      { n: '๑', t: 'แก้คำสะกดผิดก่อนเป็นอันดับแรก', d: 'เช่น “หายสายสูญ” → “หายสาบสูญ”, “ระแวกบ้าน” → “ละแวกบ้าน”' },
      { n: '๒', t: 'แยกวลีย่อยที่น่าเก็บออกจากประโยคยาว', d: 'ไม่โยนทั้งประโยคเป็นก้อนเดียว แต่หยิบเฉพาะคำงาม ๆ' },
      { n: '๓', t: 'จัดเข้าหมวด โดยยึดหมวดเดิมก่อน', d: 'ถ้าไม่มีหมวดที่เหมาะ จะเสนอหมวดใหม่ให้พิจารณา' },
    ];
    return (
      <section style={{ maxWidth: '1040px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: '0 0 8px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>เพิ่มคำเข้าคลัง</h1>
        <p style={{ fontSize: '17px', color: '#6f6252', maxWidth: '620px', margin: '0 0 30px', textWrap: 'pretty' }}>วางข้อความที่เก็บมาจากการอ่าน จะเป็นคำเดี่ยว วลี หรือทั้งประโยคปนกันก็ได้ แล้วให้ AI ช่วยแก้คำสะกด แยกวลีย่อย และจัดเข้าหมวดให้อัตโนมัติ</p>

        <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#5c5044', margin: '0 0 8px' }}>เรื่อง / นิยายที่คำชุดนี้มาจาก</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', maxWidth: '620px' }}>
          <input list="wb-novels" value={S.novelInput} onChange={(e) => this.setState({ novelInput: e.target.value })} placeholder="พิมพ์ชื่อเรื่องใหม่ หรือเลือกจากที่มี" style={{ flex: 1, minWidth: '240px', padding: '12px 14px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
          {S.novels.length > 0 && (
            <select value="" onChange={(e) => { if (e.target.value) this.setState({ novelInput: e.target.value }); }} style={{ padding: '12px 12px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none', cursor: 'pointer', maxWidth: '200px' }}>
              <option value="">▾ เลือกเรื่องที่มี</option>
              {S.novels.map((nv) => <option key={nv} value={nv}>{nv}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', margin: '12px 0 26px' }}>
          {novelChips.map((c) => (
            <button key={c} onClick={() => this.setState({ novelInput: c })} style={{ padding: '5px 12px', border: '1px solid #ddcba4', borderRadius: '20px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>{c}</button>
          ))}
        </div>

        <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#5c5044', margin: '0 0 8px' }}>ข้อความที่เก็บมา</label>
        {S.draftRestored && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#5a6a3a', background: '#eef3dc', border: '1px solid #cfdca8', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px' }}>
            <span style={{ flex: 1 }}>↩ กู้ข้อความค้างจากรอบก่อนกลับมาให้แล้ว หน้าปิด/รีเฟรชไปตอนกำลังรอ AI</span>
            <button onClick={() => this.setState({ draftRestored: false })} style={{ border: 'none', background: 'transparent', color: '#7a8a5a', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        )}
        <textarea value={S.addText} onChange={(e) => this.setState({ addText: e.target.value })} rows={11} placeholder={'วางคำหรือข้อความที่นี่…\nเว้นบรรทัดใหม่ หรือคั่นด้วยจุลภาค ( , ) เพื่อแยกหลายคำ\nประโยคยาว ๆ AI จะช่วยแยกวลีย่อยที่น่าเก็บให้เอง'} style={{ width: '100%', padding: '16px 18px', border: '1px solid #d8c7a2', borderRadius: '12px', background: 'var(--surface,#fffdf6)', lineHeight: 1.9, fontSize: '17px', color: '#3a2f28', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(120,90,50,.06)' }} />

        {(() => {
          const prov = this.eff('aiProvider', 'basic');
          const cur = PROVIDERS[prov] || PROVIDERS.basic;
          const selModel = this.eff('aiModel:' + prov, '') || cur.model || '';
          const selStyle = { padding: '8px 11px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#4a4034', fontSize: '13.5px', cursor: 'pointer', outline: 'none' };
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginTop: '14px' }}>
              <span style={{ fontSize: '13px', color: '#8a7d6d' }}>ตัว AI</span>
              <BrandIcon name={prov} size={19} />
              <select value={prov} onChange={(e) => this.setUi('aiProvider', e.target.value)()} style={selStyle}>
                {PROVIDER_ORDER.map((k) => PROVIDERS[k] ? <option key={k} value={k}>{PROVIDERS[k].label}{PROVIDERS[k].tag ? ' · ' + PROVIDERS[k].tag : ''}</option> : null)}
              </select>
              {Array.isArray(cur.models) && cur.models.length ? (
                <select value={selModel} onChange={(e) => this.setUi('aiModel:' + prov, e.target.value)()} style={selStyle}>
                  {cur.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : null}
              {cur.keyUrl ? <a href={cur.keyUrl} target="_blank" rel="noopener noreferrer" title={'เปิดเว็บขอกุญแจของ ' + cur.label} style={{ fontSize: '12.5px', color: '#5a7040', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #cbdcb8', borderRadius: '8px', padding: '7px 10px', background: '#eef3dc' }}>🔗 ขอกุญแจ</a> : null}
            </div>
          );
        })()}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '14px' }}>
          <span style={{ fontSize: '13px', color: '#8a7d6d' }}>{lineHint}</span>
          <div style={{ flex: 1 }} />
          <button onClick={this.pasteClipboard} style={{ padding: '11px 18px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}><span style={{ fontSize: '16px' }}>📋</span> วาง</button>
          <button onClick={this.process} style={{ padding: '11px 22px', border: 'none', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 2px 8px rgba(111,78,55,.3)' }}><span style={{ fontSize: '17px' }}>✎</span> ให้ AI ช่วยจัด</button>
        </div>

        {(() => {
          const open = S.promptOpen, unlock = S.promptUnlock;
          const taStyle = (locked) => ({ width: '100%', padding: '12px 13px', borderRadius: '10px', border: '1px solid #ddcba4', background: locked ? '#f4efe3' : 'var(--surface,#fffdf6)', color: locked ? '#6a6053' : '#4a4034', fontSize: '12px', lineHeight: 1.55, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', outline: 'none', resize: 'vertical', cursor: locked ? 'default' : 'text' });
          return (
            <div style={{ marginTop: '28px', padding: '18px 20px', background: 'var(--panel,#f7f0e0)', border: '1px solid #e4d5b4', borderRadius: '14px' }}>
              <div onClick={() => this.setState({ promptOpen: !open })} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexWrap: 'wrap' }}>
                <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '18px' }}>คำสั่ง AI (prompt)</div>
                <span style={{ fontSize: '12.5px', color: '#8a7d6d' }}>คำสั่งที่บอก AI ว่าให้จัดคำอย่างไร</span>
                <div style={{ flex: 1 }} />
                <span style={{ color: '#8a7d6d', fontSize: '15px', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
              </div>
              {open ? (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => this.setState({ promptUnlock: !unlock })} style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: unlock ? '#9c6b3f' : 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{unlock ? '🔓 กำลังแก้ไข — กดเพื่อล็อก' : '🔒 เปิดแก้ไข'}</button>
                    {unlock ? <button onClick={() => this.setUi('aiPromptEn', '')()} style={{ padding: '7px 13px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'transparent', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>คืนค่าเริ่มต้น</button> : null}
                    <span style={{ fontSize: '12px', color: '#a89a86' }}>{unlock ? 'แก้กรอบอังกฤษได้แล้ว' : 'ล็อกอยู่ กันเผลอลบ'}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#5c5044', margin: '0 0 5px' }}>English — ส่งให้ AI จริง (แก้ที่กรอบนี้)</div>
                  <textarea value={this.eff('aiPromptEn', '') || DEFAULT_PROMPT_EN} readOnly={!unlock} onChange={(e) => this.setUi('aiPromptEn', e.target.value)()} rows={12} style={taStyle(!unlock)} />
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#5c5044', margin: '16px 0 5px' }}>ไทย — ไว้อ่านเข้าใจ (ไม่ได้ส่งให้ AI)</div>
                  <textarea value={DEFAULT_PROMPT_TH} readOnly rows={12} style={taStyle(true)} />
                  <div style={{ fontSize: '11.5px', color: '#a89a86', marginTop: '8px' }}>ส่งเฉพาะภาษาอังกฤษให้ AI (ตอบแม่นสุด) · หมวดและข้อความระบบเติมให้อัตโนมัติ · ใช้กับตัว AI จริง ไม่ใช่ "พื้นฐาน"</div>
                </div>
              ) : null}
            </div>
          );
        })()}

        <div style={{ marginTop: '20px', padding: '24px 26px', background: 'var(--panel,#f7f0e0)', border: '1px solid #e4d5b4', borderRadius: '14px' }}>
          <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '18px', marginBottom: '14px' }}>AI จะทำงานให้ตามลำดับนี้</div>
          {howSteps.map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '9px 0' }}>
              <span style={{ flex: 'none', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent,#9c3b2b)', color: '#fbf3e2', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: '14px' }}>{s.n}</span>
              <div><div style={{ fontWeight: 600, color: '#4a3f35' }}>{s.t}</div><div style={{ fontSize: '14px', color: '#8a7d6d' }}>{s.d}</div></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  renderProcessing(accent) {
    const S = this.state;
    const sec = S.procElapsed || 0;
    const elapsed = sec < 60 ? sec + ' วินาที' : Math.floor(sec / 60) + ' นาที ' + (sec % 60) + ' วินาที';
    return (
      // เต็มจอ ทึบ กันเผลอคลิก/ปิดหน้าระหว่างรอ
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(48,38,30,.72)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', zIndex: 90, padding: '20px', animation: 'wbfade .2s ease' }}>
        <div style={{ background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '20px', padding: '38px 40px 30px', textAlign: 'center', boxShadow: '0 24px 70px rgba(40,30,22,.5)', width: 'min(430px,94vw)' }}>
          <div style={{ width: '54px', height: '54px', border: '4px solid #e6d4b0', borderTopColor: accent, borderRadius: '50%', margin: '0 auto 22px', animation: 'wbspin 1s linear infinite' }} />
          <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '22px', fontWeight: 600, color: '#3a2f28', marginBottom: '6px' }}>AI กำลังจัดคำให้</div>
          <div style={{ color: '#8a7d6d', fontSize: '15px', minHeight: '22px', marginBottom: '18px' }}>{this.procText}</div>

          {/* ตัวนับวินาที + เจ้า/รุ่นที่ใช้ */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', color: '#6f6252', background: '#f2e9d6', border: '1px solid #e4d8bd', borderRadius: '20px', padding: '5px 13px' }}>⏱ ใช้เวลา {elapsed}</span>
            {S.procProvider ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6f6252', background: '#f2e9d6', border: '1px solid #e4d8bd', borderRadius: '20px', padding: '5px 13px' }}><BrandIcon name={S.procProviderKey} size={15} />{S.procProvider}{S.procModel ? ' · ' + S.procModel : ''}</span> : null}
          </div>

          {/* เตือนห้ามปิด/รีเฟรช */}
          <div style={{ fontSize: '13.5px', color: '#8a5a1e', background: '#fdf2dc', border: '1px solid #f0d9a8', borderRadius: '11px', padding: '11px 14px', lineHeight: 1.6, marginBottom: '20px', textAlign: 'left' }}>
            <b>อย่าปิดหรือรีเฟรชหน้านี้ระหว่างรอ</b><br />
            บางรุ่นใช้เวลาสักครู่ ข้อความถูกเซฟไว้แล้ว หากหลุดจริง แคลร์จะกู้กลับมาให้อัตโนมัติ
          </div>

          <button onClick={this.cancelProcess} style={{ padding: '10px 24px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#8a7160', fontSize: '14.5px', cursor: 'pointer' }}>ยกเลิกการจัดคำ</button>
        </div>
      </div>
    );
  }

  // ============ REVIEW ============
  renderReview(getCat, monoMode, spell, effLayout) {
    const ST = this.state;
    if (ST.review.length === 0) {
      return (
        <section style={{ maxWidth: '100%', margin: '0 auto', animation: 'wbfade .35s ease' }}>
          <div style={{ textAlign: 'center', padding: '90px 20px' }}>
            <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '30px', color: '#c3b48f' }}>ยังไม่มีคำรอตรวจทาน</div>
            <p style={{ color: '#8a7d6d', margin: '8px 0 22px' }}>ไปที่หน้า “เพิ่มคำ” วางข้อความ แล้วให้ AI ช่วยจัดก่อน</p>
            <button onClick={this.onNav('add')} style={{ padding: '12px 22px', border: 'none', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>＋ ไปเพิ่มคำ</button>
          </div>
        </section>
      );
    }
    // ===== ช่อคำ =====  จอแสดงทีละช่อ → ทุกมุมมองข้างล่างมองเห็นเฉพาะคำในช่อที่เปิดอยู่ (S.review ถูกย่อขอบเขตไว้แล้ว)
    const batches = this.batchList();
    const activeId = this.activeBatchId();
    const activeMeta = batches.find((b) => b.id === activeId) || { no: 1, ai: '', novel: '', count: 0 };
    const S = { ...ST, review: ST.review.filter((r) => (r.batch || 'b_legacy') === activeId) };
    // คำซ้ำข้ามช่อ — คำเดียวกันโผล่ในช่ออื่นที่ยังไม่บันทึก (คนละ AI อาจให้หมวด/ความหมายไม่เหมือนกัน)
    const otherBatchText = new Map();
    ST.review.forEach((r) => {
      if ((r.batch || 'b_legacy') === activeId) return;
      const t = (r.text || '').trim();
      if (t && !otherBatchText.has(t)) otherBatchText.set(t, r);
    });
    const crossBadge = (r) => {
      const other = otherBatchText.get((r.text || '').trim());
      if (!other) return null;
      return <span onClick={() => this.setBatch(other.batch || 'b_legacy')} title="คำนี้มีในช่ออื่นด้วย กดเพื่อไปดูใบนั้น" style={{ flex: 'none', fontSize: '11px', fontWeight: 700, color: '#5f4c80', background: '#efe9f7', border: '1px solid #c6bcda', padding: '2px 9px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer' }}>↺ ซ้ำกับช่อที่ {WordBankApp.thNum(other.batchNo || 1)}</span>;
    };
    const crossItems = S.review.filter((r) => otherBatchText.has((r.text || '').trim()));
    // ลบคำซ้ำข้ามช่อ = ลบใบที่อยู่ในช่อนี้ (ใบในช่อก่อนหน้ายังอยู่)
    const removeCrossDup = () => {
      const ids = new Set(crossItems.map((r) => r.id));
      this.askConfirm({ title: 'ลบคำซ้ำข้ามช่อ', msg: 'ลบคำในช่อนี้ที่ซ้ำกับช่ออื่น ' + ids.size + ' คำ (ใบในช่อก่อนหน้ายังอยู่)', okLabel: 'ลบคำซ้ำ', danger: true, onOk: () => { this.setState((s) => ({ review: s.review.filter((r) => !ids.has(r.id)) }), this.persistReview); this.flash('ลบคำซ้ำข้ามช่อ ' + ids.size + ' คำ'); } });
    };
    const reviewCount = S.review.length;
    const libTexts = new Set(S.library.map((w) => (w.text || '').trim())); // คำที่มีในคลังแล้ว → เตือนซ้ำ
    // คำที่ AI สกัดออกมาจากประโยค (มีโน้ต "แยกจากประโยค") → โชว์ป้าย ✂
    const cutMark = (r) => (r.notes || []).some((n) => /แยกจากประโยค/.test(n))
      ? <span title="สกัดออกมาจากประโยค" style={{ flex: 'none', fontSize: '11px', fontWeight: 700, color: '#fff', background: '#c6892b', border: '1px solid #a56f18', padding: '2px 9px', borderRadius: '20px', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(198,137,43,.4)' }}>✂ แยกจากประโยค</span>
      : null;
    const dupBadge = (r) => libTexts.has((r.text || '').trim())
      ? <span title="คำนี้มีในคลังแล้ว จะถูกข้ามตอนบันทึก" style={{ flex: 'none', fontSize: '11px', fontWeight: 700, color: '#fff', background: '#e01e1e', border: '1px solid #b81414', padding: '2px 9px', borderRadius: '20px', whiteSpace: 'nowrap', animation: 'wbalert 1.05s ease-in-out infinite' }}>⚠ มีในคลังแล้ว</span>
      : null;
    // คอลัมน์สถานะในตาราง — ค่าจัดเรียง: ซ้ำ(0) < สกัดจากประโยค(1) < ปกติ(2)
    const statusVal = (r) => libTexts.has((r.text || '').trim()) ? 0 : ((r.notes || []).some((n) => /แยกจากประโยค/.test(n)) ? 1 : 2);
    const statusCell = (r) => <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>{cutMark(r)}{dupBadge(r)}{crossBadge(r)}</div>;
    // ไฮไลต์คำที่สกัด (word) ในประโยคตั้งต้น (source) — โชว์ให้เห็นว่าดึงมาจากตรงไหน
    const srcHighlight = (source, word) => {
      const s = String(source || ''), w = String(word || '').trim();
      const i = w ? s.indexOf(w) : -1;
      if (i < 0) return s;
      return <>{s.slice(0, i)}<mark style={{ background: '#fde3a0', color: '#7a4e12', padding: '0 3px', borderRadius: '4px', fontWeight: 700 }}>{s.slice(i, i + w.length)}</mark>{s.slice(i + w.length)}</>;
    };
    // ไฮไลต์ "หลายคำ" ในประโยคเดียว (การ์ดประโยคตั้งต้น → เน้นทุกคำที่ถูกดึงออกไป)
    const highlightWords = (sentence, words) => {
      const s = String(sentence || '');
      const uniq = [...new Set((words || []).map((w) => String(w).trim()).filter(Boolean))];
      const ranges = [];
      uniq.forEach((w) => { let from = 0, i; while ((i = s.indexOf(w, from)) >= 0) { ranges.push([i, i + w.length]); from = i + w.length; } });
      if (!ranges.length) return s;
      ranges.sort((a, b) => a[0] - b[0]);
      const merged = [ranges[0].slice()];
      for (let k = 1; k < ranges.length; k++) { const last = merged[merged.length - 1]; if (ranges[k][0] <= last[1]) last[1] = Math.max(last[1], ranges[k][1]); else merged.push(ranges[k].slice()); }
      const out = []; let pos = 0;
      merged.forEach(([a, b], idx) => { if (a > pos) out.push(<span key={'t' + idx}>{s.slice(pos, a)}</span>); out.push(<mark key={'m' + idx} style={{ background: '#fde3a0', color: '#7a4e12', padding: '0 3px', borderRadius: '4px', fontWeight: 700 }}>{s.slice(a, b)}</mark>); pos = b; });
      if (pos < s.length) out.push(<span key="end">{s.slice(pos)}</span>);
      return <>{out}</>;
    };
    // แผนที่: ประโยคตั้งต้น (source) → คำที่ AI ดึงออกไปจากมัน (ไว้โชว์บนการ์ดประโยคตั้งต้น)
    const pulledFrom = new Map();
    S.review.forEach((r) => { const src = (r.source || '').trim(); if (src) { if (!pulledFrom.has(src)) pulledFrom.set(src, []); pulledFrom.get(src).push(r.text); } });
    // ตัวช่วยกลาง — แสดงคำหลัก: ถ้าเป็นประโยคตั้งต้นที่มีคำถูกดึง → ไฮไลต์คำนั้น (กดเพื่อแก้ถ้า editable)
    // ใช้ทุกมุมมอง (การ์ด/ตาราง/คอลัมน์/แบบคลังคำ) จะได้เหมือนกันหมด
    const renderWord = (r, baseStyle, editable) => {
      const pulled = pulledFrom.get((r.text || '').trim());
      const has = pulled && pulled.length;
      if (has && S.editCard !== r.id) {
        return <div onClick={editable ? () => this.setState({ editCard: r.id }) : undefined} title={editable ? 'กดเพื่อแก้คำ' : undefined} style={{ ...baseStyle, cursor: editable ? 'text' : 'inherit', whiteSpace: 'normal' }}>{highlightWords(r.text, pulled)}</div>;
      }
      if (!editable) return <span style={baseStyle}>{r.text}</span>;
      // ดึง borderBottom ออกจาก baseStyle ก่อน แล้วใส่ทีหลัง 'border:none' → เส้นประไม่ถูกลบ
      // (ถ้าปล่อยไว้ใน spread ตำแหน่ง key จะอยู่ก่อน border:none แล้วโดนลบ)
      const { borderBottom: bb, ...rest } = baseStyle;
      return <input value={r.text} autoFocus={!!(has && S.editCard === r.id)} onBlur={has ? () => this.setState({ editCard: null }) : undefined} onChange={(e) => this.updateReview(r.id, { text: e.target.value })} style={{ ...rest, border: 'none', background: 'transparent', outline: 'none', borderBottom: bb || 'none' }} />;
    };
    const pulledBadge = (r) => { const p = pulledFrom.get((r.text || '').trim()); return p && p.length ? <span style={{ fontSize: '11px', color: '#a8843f', fontWeight: 600, whiteSpace: 'nowrap' }}>✂ ดึงออกไป {p.length} คำ</span> : null; };
    // คำซ้ำ — นับเฉพาะที่ "แสดงในมุมมองปัจจุบัน" (จับกลุ่มประโยคโชว์แค่ประโยคที่แบ่ง + คำที่แยก)
    const visibleReview = effLayout === 'sources'
      ? S.review.filter((r) => (r.source || '').trim() || pulledFrom.has((r.text || '').trim()))
      : S.review;
    const dupItems = visibleReview.filter((r) => libTexts.has((r.text || '').trim()));
    const dupCount = dupItems.length;
    // จานสีไฮไลต์หลายสี — คนละสีต่อคำที่แบ่ง (ใช้ในมุมมองจับกลุ่มประโยคแบบใหม่)
    // สีตามลำดับคำในประโยค: คำแรก = เหลือง (เหมือนไฮไลต์หน้าอื่น) · คำที่ 2/3/4 = สีอื่น
    const HLP = [
      { bg: '#fde3a0', bd: '#d9a94a' }, { bg: '#cfe8d6', bd: '#7bbd97' }, { bg: '#d3e3f7', bd: '#84aede' },
      { bg: '#ecd9f2', bd: '#bd93cf' }, { bg: '#f9d9de', bd: '#e197a3' }, { bg: '#d6ecec', bd: '#7fbdbd' },
    ];
    const highlightColored = (sentence, words, offset = 0) => {
      const s = String(sentence || '');
      const ranges = [];
      words.forEach((w, wi) => { const ww = String(w || '').trim(); if (!ww) return; let from = 0, i; while ((i = s.indexOf(ww, from)) >= 0) { ranges.push({ a: i, b: i + ww.length, ci: wi }); from = i + ww.length; } });
      if (!ranges.length) return s;
      ranges.sort((x, y) => x.a - y.a);
      const out = []; let pos = 0;
      ranges.forEach((rg, idx) => {
        if (rg.a < pos) return; // ซ้อนกัน → ข้าม
        if (rg.a > pos) out.push(<span key={'t' + idx}>{s.slice(pos, rg.a)}</span>);
        const c = HLP[(offset + rg.ci) % HLP.length];
        out.push(<mark key={'m' + idx} style={{ background: c.bg, color: '#4a3320', padding: '0 3px', borderRadius: '4px', fontWeight: 700, boxShadow: 'inset 0 0 0 1.5px ' + c.bd }}>{s.slice(rg.a, rg.b)}</mark>);
        pos = rg.b;
      });
      if (pos < s.length) out.push(<span key="end">{s.slice(pos)}</span>);
      return <>{out}</>;
    };
    const spellCount = S.review.filter((r) => r.original && r.original !== r.text).length;
    const newCatCount = S.categories.filter((c) => c.proposed).length;
    const extractedCount = S.review.filter((r) => (r.source || '').trim()).length; // คำที่ AI สกัดเพิ่มจากประโยค (นอกเหนือจากที่พิมพ์เข้ามา)
    const selCount = S.review.filter((r) => r.selected).length;
    const allSelected = reviewCount > 0 && selCount === reviewCount;
    const catOptions = S.categories.map((c) => ({ id: c.id, n: c.n, badgeLabel: c.k + '  ' + c.n }));
    const layoutSeg = (on) => ({ padding: '7px 15px', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', background: on ? 'var(--surface,#fffdf6)' : 'transparent', color: on ? '#3a2f28' : '#8a7d6d', fontWeight: on ? 600 : 400, boxShadow: on ? '0 1px 3px rgba(120,90,50,.15)' : 'none' });

    const catSelect = (r) => {
      const cat = getCat(r.category);
      return (
        <select value={r.category} title={cat.n} onChange={(e) => this.updateReview(r.id, { category: e.target.value, proposedNew: false })} style={pill(cat, monoMode)}>
          {catOptions.map((c) => <option key={c.id} value={c.id}>{c.badgeLabel}</option>)}
        </select>
      );
    };
    const KINDS3 = [['word', 'คำ'], ['phrase', 'วลี'], ['sentence', 'ประโยค']];
    const kindSelect = (r) => (
      <select value={KINDS3.some(([v]) => v === r.kind) ? r.kind : 'word'} onChange={(e) => this.updateReview(r.id, { kind: e.target.value })} title="ชนิด (กดเปลี่ยนได้)"
        style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '20px', border: '1px solid #ddcba4', background: '#f0e8d4', color: '#7a6a4f', cursor: 'pointer', fontWeight: 600 }}>
        {KINDS3.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );

    // การเรียง (ใช้ร่วมกันการ์ด+ตาราง ผ่าน state reviewSort)
    const rs = S.reviewSort;
    const sortedReview = rs
      ? S.review.slice().sort((a, b) => {
          let c;
          if (rs.key === 'status') c = statusVal(a) - statusVal(b);
          else {
            const gv = (r) => rs.key === 'cat' ? (getCat(r.category).n || '') : rs.key === 'kind' ? (r.kind || '') : (r.text || '');
            c = gv(a).localeCompare(gv(b), 'th');
          }
          return rs.dir === 'asc' ? c : -c;
        })
      : S.review;
    const sortH = (key, label) => (
      <span onClick={() => this.toggleReviewSort(key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        {label}{rs && rs.key === key ? (rs.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </span>
    );
    const cardSortOpts = [['', 'ตามที่ AI แยก'], ['text:asc', 'คำ/วลี ก-ฮ'], ['text:desc', 'คำ/วลี ฮ-ก'], ['cat:asc', 'ตามหมวด'], ['kind:asc', 'ตามชนิด'], ['status:asc', 'ตามสถานะ']];
    const cardsView = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#8a7d6d', cursor: 'pointer' }}>
            <input type="checkbox" checked={allSelected} onChange={this.selectAll} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)' }} />เลือกทั้งหมด
          </label>
          <span style={{ fontSize: '13px', color: '#8a7d6d', marginLeft: 'auto' }}>เรียงตาม</span>
          <select value={rs ? rs.key + ':' + rs.dir : ''} onChange={(e) => { const v = e.target.value; if (!v) { this.setState({ reviewSort: null }); } else { const [key, dir] = v.split(':'); this.setState({ reviewSort: { key, dir } }); } }} style={{ padding: '7px 11px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#4a4034', fontSize: '13.5px', cursor: 'pointer', outline: 'none' }}>
            {cardSortOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
          {sortedReview.map((r) => {
            const hasSpell = !!r.original && r.original !== r.text;
            const cardStyle = { background: hasSpell && spell === 'highlight' ? '#fbf1ee' : 'var(--surface,#fffdf6)', border: '1px solid ' + (r.proposedNew ? '#cbdcb8' : (hasSpell && spell === 'highlight' ? '#ecc9bd' : '#e6dabf')), borderRadius: '13px', padding: '16px 17px', boxShadow: '0 1px 2px rgba(120,90,50,.05)', display: 'flex', flexDirection: 'column' };
            const spellBoxStyle = { fontSize: '12.5px', marginBottom: '8px', padding: '6px 9px', borderRadius: '7px', background: spell === 'highlight' ? 'rgba(156,59,43,.08)' : '#f3e9d6', lineHeight: 1.4 };
            return (
              <div key={r.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" checked={r.selected} onChange={() => this.toggleSel(r.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
                  {kindSelect(r)}
                  {catSelect(r)}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => this.removeReview(r.id)} title="ลบคำนี้" style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>
                {/* จองพื้นที่ป้ายเสมอ (แม้ไม่มีป้าย) → ตัวคำอยู่ระดับเดียวกันทุกการ์ด */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', minHeight: '25px', marginBottom: '9px' }}>{cutMark(r)}{dupBadge(r)}{crossBadge(r)}</div>
                {hasSpell && (
                  <div style={spellBoxStyle}>
                    {spell === 'strikethrough' && (<><span style={{ color: '#b58175', textDecoration: 'line-through', textDecorationColor: '#cf7a63' }}>{r.original}</span><span style={{ color: 'var(--accent,#9c3b2b)' }}> → แก้เป็น</span></>)}
                    {spell === 'label' && (<><span style={{ background: 'var(--accent,#9c3b2b)', color: '#fbf3e2', padding: '1px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600 }}>สะกดใหม่</span><span style={{ color: '#a58a80', marginLeft: '7px' }}>จากเดิม: {r.original}</span></>)}
                    {spell === 'highlight' && (<><span style={{ color: 'var(--accent,#9c3b2b)', fontWeight: 600 }}>✎ แก้สะกดแล้ว</span><span style={{ color: '#a58a80', marginLeft: '7px' }}>เดิม: {r.original}</span></>)}
                  </div>
                )}
                {renderWord(r, { width: '100%', fontFamily: "var(--font-trirong),serif", fontSize: '19px', fontWeight: 500, color: '#33291f', borderBottom: '1px dashed #ddcba4', padding: '2px 0 6px', lineHeight: 1.5, minHeight: '31px', boxSizing: 'border-box' }, true)}
                {/* ความหมายอยู่ชิดใต้คำหลักเสมอ → ตรงกันทุกการ์ด (ป้าย ✂/↳ ไปอยู่ล่าง) */}
                <input value={r.meaning} onChange={(e) => this.updateReview(r.id, { meaning: e.target.value })} placeholder="＋ เพิ่มความหมาย (ไม่บังคับ)" style={{ width: '100%', fontSize: '14px', color: '#6f6252', border: 'none', background: 'transparent', padding: '8px 0 2px', outline: 'none' }} />
                {pulledBadge(r) ? <div style={{ marginTop: '7px' }}>{pulledBadge(r)}</div> : null}
                {r.source ? <div style={{ fontSize: '12.5px', color: '#9a8c76', marginTop: '7px', lineHeight: 1.55, fontFamily: "var(--font-trirong),serif" }}><span style={{ color: '#bcac8f' }}>↳ จาก:</span> {srcHighlight(r.source, r.text)}</div> : null}
                {(() => {
                  // ซ่อนโน้ต "✂ แยกจากประโยค" เพราะโชว์เป็นป้ายทองด้านบนแล้ว (กันซ้ำ)
                  const vn = (r.notes || []).filter((n) => !/แยกจากประโยค/.test(n));
                  return vn.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '9px' }}>
                      {vn.map((note, i) => <span key={i} style={{ fontSize: '11px', color: '#9a8c76', background: '#f0e8d4', border: '1px solid #e4d8bd', padding: '2px 8px', borderRadius: '5px' }}>{note}</span>)}
                    </div>
                  ) : null;
                })()}
                {/* หมวดย่อย ชิดล่างสุดของการ์ดเสมอ (marginTop auto ดันลง) → ตรงกันทุกการ์ด */}
                {r.subpath ? <div style={{ fontSize: '12px', color: '#9a8c76', marginTop: 'auto', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#bcac8f' }}>↳</span> หมวดย่อย: {r.subpath}</div> : null}
              </div>
            );
          })}
        </div>
      </>
    );

    const tableView = (
      <div style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '34px 1.35fr 128px 180px 1fr 36px', gap: '12px', padding: '12px 16px', background: '#f0e6cd', borderBottom: '1px solid #e0d0ac', fontSize: '12px', fontWeight: 600, color: '#8a7d6d', letterSpacing: '.4px' }}>
          <input type="checkbox" checked={allSelected} onChange={this.selectAll} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
          {sortH('text', 'คำ / วลี')}{sortH('status', 'สถานะ')}{sortH('cat', 'หมวด')}<span>ความหมาย</span><span></span>
        </div>
        {sortedReview.map((r) => {
          const hasSpell = !!r.original && r.original !== r.text;
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '34px 1.35fr 128px 180px 1fr 36px', gap: '12px', padding: '8px 16px', borderBottom: '1px solid #f0e6cd', alignItems: 'start', background: r.selected ? '#faf4e6' : 'transparent' }}>
              <input type="checkbox" checked={r.selected} onChange={() => this.toggleSel(r.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer', marginTop: '9px' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {kindSelect(r)}
                  {renderWord(r, { flex: 1, fontFamily: "var(--font-trirong),serif", fontSize: '17px', fontWeight: 500, color: '#33291f', padding: '5px 0', lineHeight: 1.4 }, true)}
                </div>
                {pulledBadge(r) ? <div style={{ marginTop: '3px' }}>{pulledBadge(r)}</div> : null}
                {hasSpell && <div style={{ fontSize: '12px', color: 'var(--accent,#9c3b2b)' }}>✎ เดิม: {r.original}</div>}
                {r.subpath ? <div style={{ fontSize: '12px', color: '#9a8c76' }}>↳ {r.subpath}</div> : null}
              </div>
              <div style={{ paddingTop: '6px' }}>{statusCell(r)}</div>
              {catSelect(r)}
              <input value={r.meaning} onChange={(e) => this.updateReview(r.id, { meaning: e.target.value })} placeholder="＋ ความหมาย" style={{ width: '100%', fontSize: '14px', color: '#6f6252', border: 'none', background: 'transparent', outline: 'none', padding: '7px 0' }} />
              <button onClick={() => this.removeReview(r.id)} style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '17px', cursor: 'pointer', paddingTop: '6px' }}>✕</button>
            </div>
          );
        })}
      </div>
    );

    const columnsView = (
      <>
        <p style={{ fontSize: '13px', color: '#8a7d6d', margin: '0 0 12px' }}>ลากคำไปวางในหมวดที่ต้องการได้เลย · กด ✕ เพื่อลบ · ทุกหมวดเรียงแนวนอนแถวเดียว</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + S.categories.length + ',minmax(158px,1fr))', gap: '12px', alignItems: 'start', overflowX: 'auto', width: '100vw', marginLeft: 'calc(-50vw + 50%)', padding: '0 24px 6px' }}>
          {S.categories.map((c) => {
            const items = S.review.filter((r) => r.category === c.id);
            return (
              <div key={c.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (this._drag) { this.updateReview(this._drag, { category: c.id, proposedNew: false }); this._drag = null; } }} style={{ background: '#f6eed9', border: '1px dashed ' + rgba(c.c, 0.5), borderRadius: '12px', padding: '13px 12px', minHeight: '78px', opacity: items.length ? 1 : 0.62 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '11px' }}>
                  <span style={badge(c, monoMode)}>{c.k}</span>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#4a3f35', flex: 1, lineHeight: 1.25 }}>{c.n}</span>
                  <span style={{ fontSize: '12px', color: '#a99b83' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '30px' }}>
                  {items.map((r) => {
                    const hasSpell = !!r.original && r.original !== r.text;
                    return (
                      <div key={r.id} draggable onDragStart={(e) => { this._drag = r.id; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }} style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px 10px', background: 'var(--surface,#fffdf6)', border: '1px solid ' + rgba(c.c, 0.35), borderLeft: '3px solid ' + c.c, borderRadius: '8px', cursor: 'grab', boxShadow: '0 1px 2px rgba(120,90,50,.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          {hasSpell && <span title="แก้สะกดแล้ว" style={{ flex: 'none', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent,#9c3b2b)' }} />}
                          {renderWord(r, { flex: 1, fontFamily: "var(--font-trirong),serif", fontSize: '15px', color: '#33291f' }, false)}
                          <button onClick={() => this.removeReview(r.id)} style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                        </div>
                        {r.subpath ? <div style={{ fontSize: '11px', color: '#9a8c76' }}>↳ {r.subpath}</div> : null}
                        {cutMark(r) ? <div>{cutMark(r)}</div> : null}
                        {dupBadge(r) ? <div>{dupBadge(r)}</div> : null}
                        {crossBadge(r) ? <div>{crossBadge(r)}</div> : null}
                        {pulledBadge(r) ? <div>{pulledBadge(r)}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );

    // มุมมองที่ 4 — จับกลุ่มคำที่สกัดไว้ใต้ประโยคต้นทาง (เห็นว่าแต่ละคำงอกมาจากประโยคไหน)
    const rowInput = (r) => renderWord(r, { flex: 1, fontFamily: "var(--font-trirong),serif", fontSize: '16px', fontWeight: 500, color: '#33291f', borderBottom: '1px dashed #e0d0ac', padding: '4px 0', minWidth: '80px' }, true);
    const delBtn = (r) => <button onClick={() => this.removeReview(r.id)} title="ลบคำนี้" style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>;
    const sourcesView = (() => {
      const groups = new Map(); // ประโยคต้นทาง → คำที่แบ่งออกมา (เฉพาะที่มีการแบ่ง)
      S.review.forEach((r) => { const src = (r.source || '').trim(); if (src) { if (!groups.has(src)) groups.set(src, []); groups.get(src).push(r); } });
      const groupArr = [...groups.entries()];
      return (
        <>
          <p style={{ fontSize: '13px', color: '#8a7d6d', margin: '0 0 16px' }}>เฉพาะประโยคที่ AI แบ่งคำออกมา · ประโยคตั้งต้น (ซ้าย) ไฮไลต์คำที่แบ่งคนละสี ชี้ไปที่คำที่แยกได้ (ขวา) สีตรงกัน</p>
          {groupArr.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#a99b83', background: '#f9f4e7', border: '1px dashed #ddcba4', borderRadius: '12px' }}>รอบนี้ AI ไม่ได้แบ่งคำจากประโยคยาว (คำที่เข้ามาเป็นคำเดี่ยว/วลี อยู่แล้ว)</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groupArr.map(([src, children], gi) => {
              const parent = S.review.find((r) => (r.text || '').trim() === src && !(r.source || '').trim());
              const childTexts = children.map((c) => c.text);
              return (
                <div key={src} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* การ์ดประโยคตั้งต้น (ซ้าย) */}
                  <div style={{ flex: '1 1 320px', minWidth: '260px', background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '13px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(120,90,50,.05)' }}>
                    {parent && <div style={{ display: 'flex', gap: '8px', marginBottom: '9px', flexWrap: 'wrap', alignItems: 'center' }}>{kindSelect(parent)}{catSelect(parent)}{dupBadge(parent)}{crossBadge(parent)}</div>}
                    <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '18px', color: '#33291f', lineHeight: 1.75 }}>{highlightColored(src, childTexts)}</div>
                  </div>
                  {/* ลูกศรชี้ */}
                  <div style={{ flex: 'none', padding: '0 12px', color: '#c9a050', fontSize: '28px', fontWeight: 700 }}>→</div>
                  {/* การ์ดคำที่แยกได้ (ขวา) สีตรงกับไฮไลต์ในประโยค */}
                  <div style={{ flex: '1 1 230px', minWidth: '210px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {children.map((r, wi) => {
                      const c = HLP[wi % HLP.length];
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 11px', background: 'var(--surface,#fffdf6)', border: '1px solid #e6dabf', borderLeft: '4px solid ' + c.bd, borderRadius: '9px' }}>
                          {kindSelect(r)}
                          {rowInput(r)}
                          {catSelect(r)}
                          {dupBadge(r)}
                          {crossBadge(r)}
                          {delBtn(r)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    })();

    // มุมมองที่ 5 — แบบคลังคำ: จัดคำตามหมวด → หมวดย่อย เป็นต้นไม้ยุบขยายเหมือนหน้าคลังคำ
    const treeView = (
      <>
        <p style={{ fontSize: '13px', color: '#8a7d6d', margin: '0 0 14px' }}>คำจัดเข้าหมวดและหมวดย่อยแบบเดียวกับหน้าคลังคำ · กดหัวหมวดเพื่อยุบหรือขยาย</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {S.categories.map((c) => {
            const items = S.review.filter((r) => r.category === c.id);
            if (!items.length) return null;
            const catCollapsed = S.treeCollapsed['c:' + c.id];
            const bySub = new Map(); // จัดกลุ่มตามหมวดย่อย (subpath)
            items.forEach((r) => {
              const sp = (r.subpath || '').trim() || '— ไม่ระบุหมวดย่อย —';
              if (!bySub.has(sp)) bySub.set(sp, []);
              bySub.get(sp).push(r);
            });
            return (
              <div key={c.id} style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
                <div onClick={() => this.toggleTree('c:' + c.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', cursor: 'pointer', background: rgba(c.c, 0.13), borderBottom: catCollapsed ? 'none' : '1px solid #eaddc0' }}>
                  <span style={{ color: '#b08a4a', fontSize: '13px', flex: 'none' }}>{catCollapsed ? '▸' : '▾'}</span>
                  <span style={badge(c, monoMode)}>{c.k}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '15px', color: '#4a3f35' }}>{c.n}</span>
                  <span style={{ fontSize: '12.5px', color: '#a99b83', flex: 'none' }}>{items.length} คำ</span>
                </div>
                {!catCollapsed && (
                  <div style={{ padding: '6px 12px 12px' }}>
                    {[...bySub.entries()].map(([sp, subItems]) => (
                      <div key={sp} style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '12.5px', color: '#8a7d6d', fontWeight: 600, padding: '4px 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#bcac8f', flex: 'none' }}>↳</span>{sp}<span style={{ color: '#c3b48f', fontWeight: 400 }}>· {subItems.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', paddingLeft: '15px' }}>
                          {subItems.map((r) => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '7px 10px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '8px' }}>
                              {kindSelect(r)}
                              {rowInput(r)}
                              {cutMark(r)}
                              {dupBadge(r)}
                              {crossBadge(r)}
                              {pulledBadge(r)}
                              {delBtn(r)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );

    return (
      <section style={{ maxWidth: '1200px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>ตรวจทาน</h1>
          <span style={{ color: '#8a7d6d', paddingBottom: '10px' }}>จากเรื่อง <b style={{ color: '#5c5044' }}>{activeMeta.novel || S.reviewNovel}</b></span>
          {batches.length > 1 && <span style={{ color: '#a99b83', paddingBottom: '11px', fontSize: '13.5px' }}>· มี {batches.length} ช่อ รวม {ST.review.length} คำ</span>}
        </div>

        {/* แถบสถิติ + คำอธิบาย อยู่นอกก้อนตรึง (เลื่อนหายไปได้ ไม่กินพื้นที่จอ) */}
        <div id="wb-stats-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '14px 0 8px' }}>
          <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#f0e6cd', border: '1px solid #e0d0ac', fontSize: '13px', color: '#6f6252' }}>พบ <b>{reviewCount}</b> คำ</span>
          <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#f5e4dd', border: '1px solid #e6c3b7', fontSize: '13px', color: 'var(--accent,#9c3b2b)' }}>✎ แก้สะกด <b>{spellCount}</b></span>
          <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#e9efe1', border: '1px solid #cbdcb8', fontSize: '13px', color: '#5a7040' }}>✦ หมวดใหม่ <b>{newCatCount}</b></span>
          {/* ปุ่มจัดการหมวด โผล่เฉพาะตอน AI เสนอหมวดใหม่ (ไว้รวมหมวดที่ซ้ำซ้อนเข้าหมวดเดิม) */}
          {newCatCount > 0 && <button onClick={this.openCats} title="แก้ชื่อหมวด รวมหมวดที่ซ้ำซ้อนเข้าด้วยกัน เพิ่มหรือลบหมวด" style={{ padding: '6px 13px', borderRadius: '20px', background: '#f7f0e0', border: '1px dashed #b8cba0', fontSize: '13px', color: '#5a7040', cursor: 'pointer' }}>⚙ จัดการหมวด</button>}
          {extractedCount > 0 && <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#fbeecb', border: '1px solid #ecd39a', fontSize: '13px', color: '#8a5a1e' }}>พิมพ์เข้า <b>{reviewCount - extractedCount}</b> + ✂ สกัดเพิ่ม <b>{extractedCount}</b></span>}
          {activeMeta.ai ? <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#eef0f5', border: '1px solid #cfd4e0', fontSize: '13px', color: '#5d6478' }}>{activeMeta.ai}{activeMeta.at ? ' · ' + new Date(activeMeta.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : ''}</span> : null}
        </div>
        <p style={{ fontSize: '14px', color: '#8a7d6d', margin: '0 0 6px' }}>ค่าเริ่มต้นคือยืนยันตามที่ AI แยกให้ — แก้ตัวคำ เปลี่ยนหมวด ลากย้าย หรือเลือกหลายคำจัดการพร้อมกันได้ตามใจ</p>

        {/* แท็บช่อ + แถบเครื่องมือ = ตรึงติดกันเป็นก้อนเดียว (สองอย่างนี้กดบ่อยสุด เลื่อนดูคำล่าง ๆ ก็ยังกดได้) */}
        <div style={{ position: 'sticky', top: '69px', zIndex: 16, background: 'var(--paper,#e7dbc0)' }}>
        {batches.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '2px solid #ddcba4', paddingTop: '10px' }}>
            {batches.map((b) => {
              const on = b.id === activeId;
              return (
                <button key={b.id} onClick={() => this.setBatch(b.id)} style={{ border: '1px solid #ddcba4', borderBottom: 'none', borderRadius: '10px 10px 0 0', background: on ? 'var(--surface,#fffdf6)' : '#efe4cc', color: on ? '#33291f' : '#8a7d6d', fontWeight: on ? 700 : 400, padding: on ? '8px 16px 11px' : '8px 16px 9px', cursor: 'pointer', textAlign: 'left', position: 'relative', top: '2px', boxShadow: on ? 'inset 0 -3px 0 #c9a050' : 'none', fontSize: '14px', lineHeight: 1.25 }}>
                  ช่อที่ {WordBankApp.thNum(b.no)}
                  <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 400, color: '#a08f74' }}>{b.count} คำ{b.novel ? ' · ' + b.novel : ''}</span>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper,#e7dbc0)', padding: '11px 0 12px', marginBottom: '4px' }}>
          <div style={{ display: 'inline-flex', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
            {[['cards', 'การ์ด'], ['table', 'ตาราง'], ['columns', 'คอลัมน์'], ['sources', '✂ จับกลุ่มประโยค'], ['tree', '📖 แบบคลังคำ']].map(([k, label]) => (
              <button key={k} onClick={this.setUi('reviewLayout', k)} style={layoutSeg(effLayout === k)}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={this.exportReview} title="ส่งออกผลตรวจทานเป็นไฟล์ .txt ไว้เทียบ AI แต่ละเจ้า" style={{ padding: '9px 15px', border: '1px solid #cbdcb8', borderRadius: '9px', background: '#eef3dc', color: '#5a7040', fontSize: '14px', cursor: 'pointer' }}>⬇ ส่งออก</button>
          {dupCount > 0 && <button onClick={() => this.removeDuplicates(dupItems.map((r) => r.id))} style={{ padding: '9px 16px', border: '1px solid #b81414', borderRadius: '9px', background: '#e01e1e', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', animation: 'wbalert 1.05s ease-in-out infinite' }}>⚠ ลบซ้ำกับคลัง ({dupCount})</button>}
          {crossItems.length > 0 && <button onClick={removeCrossDup} title="คำในช่อนี้ที่ไปซ้ำกับช่ออื่นที่ยังไม่บันทึก" style={{ padding: '9px 16px', border: '1px solid #b3a4cc', borderRadius: '9px', background: '#efe9f7', color: '#5f4c80', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>↺ ลบซ้ำข้ามช่อ ({crossItems.length})</button>}
          {batches.length > 1 && <button onClick={() => this.deleteBatch(activeMeta)} style={{ padding: '9px 15px', border: '1px solid #e6c3b7', borderRadius: '9px', background: '#fbeae6', color: 'var(--accent,#9c3b2b)', fontSize: '14px', cursor: 'pointer' }}>ลบทั้งช่อ</button>}
          <button onClick={this.save} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(111,78,55,.28)' }}>✓ บันทึก{batches.length > 1 ? 'ช่อนี้' : ''}เข้าคลัง ({reviewCount})</button>
        </div>
        </div>

        {selCount > 0 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '11px 16px', marginBottom: '16px', background: '#efe7f0', border: '1px solid #d6c4d9', borderRadius: '10px', animation: 'wbfade .2s ease' }}>
            <b style={{ color: '#6a4a72' }}>เลือก {selCount} คำ</b>
            <span style={{ color: '#8a7d6d', fontSize: '14px' }}>ย้ายไปหมวด:</span>
            <select onChange={this.bulkMove} defaultValue="" style={{ padding: '7px 11px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#3a2f28' }}>
              <option value="">— เลือกหมวด —</option>
              {catOptions.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={this.bulkDelete} style={{ padding: '7px 13px', border: '1px solid #e6c3b7', borderRadius: '8px', background: '#fff', color: 'var(--accent,#9c3b2b)', fontSize: '14px', cursor: 'pointer' }}>ลบที่เลือก</button>
            <button onClick={this.clearSel} style={{ padding: '7px 13px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#6a4a72', fontSize: '14px', cursor: 'pointer' }}>ล้างการเลือก</button>
          </div>
        )}

        {effLayout === 'cards' && cardsView}
        {effLayout === 'table' && tableView}
        {effLayout === 'columns' && columnsView}
        {effLayout === 'sources' && sourcesView}
        {effLayout === 'tree' && treeView}
      </section>
    );
  }

  // ============ ประวัติการใช้ AI ============
  renderAiLog() {
    const S = this.state;
    const sum = S.aiSummary;
    const p2 = (n) => String(n).padStart(2, '0');
    const fmtTH = (iso) => { // เวลาไทย (+7) พ.ศ.
      if (!iso) return '';
      const t = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
      return t.getUTCDate() + '/' + (t.getUTCMonth() + 1) + '/' + (t.getUTCFullYear() + 543) + ' ' + p2(t.getUTCHours()) + ':' + p2(t.getUTCMinutes());
    };
    const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
    const fmtCost = (c) => Number(c) > 0 ? '$' + Number(c).toFixed(Number(c) < 0.01 ? 5 : 4) : 'ฟรี';
    const logs = S.aiLogFilter === 'all' ? S.aiLogs : S.aiLogs.filter((l) => l.provider === S.aiLogFilter);
    const statCard = (label, value) => (
      <div style={{ flex: '1 1 150px', background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '12px', padding: '13px 16px' }}>
        <div style={{ fontSize: '12px', color: '#8a7d6d', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '21px', fontWeight: 600, color: '#4a3f35' }}>{value}</div>
      </div>
    );
    const btn = (on) => ({ padding: '6px 13px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: '1px solid ' + (on ? 'var(--primary,#6f4e37)' : '#ddcba4'), background: on ? 'var(--primary,#6f4e37)' : 'var(--panel,#f7f0e0)', color: on ? '#fbf3e2' : '#6f6252' });
    const cols = '128px 1.4fr 1.5fr 96px 92px 70px';
    return (
      <section style={{ maxWidth: '1100px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>ประวัติการใช้ AI</h1>
          <div style={{ flex: 1 }} />
          <button onClick={this.loadAiLogs} style={{ padding: '9px 16px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '14px', cursor: 'pointer' }}>↻ รีเฟรช</button>
        </div>
        <p style={{ fontSize: '14px', color: '#8a7d6d', margin: '10px 0 20px' }}>บันทึกทุกครั้งที่เรียก AI จัดคำ — เจ้าไหน รุ่นอะไร ใช้ token เท่าไหร่ กี่วินาที และค่าใช้จ่ายประมาณ (ราคาประเมิน ไม่ใช่ยอดจริง)</p>

        {S.aiLogLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#a99b83' }}>กำลังโหลด…</div>}

        {sum && sum.totalCalls === 0 && !S.aiLogLoading && (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: '#a99b83' }}>
            <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '28px', color: '#c3b48f' }}>ยังไม่มีประวัติ</div>
            <p>ลองไปหน้า “เพิ่มคำ” เลือก AI แล้วจัดคำสักครั้ง</p>
          </div>
        )}

        {sum && sum.totalCalls > 0 && (
          <>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {statCard('เรียกทั้งหมด', fmtNum(sum.totalCalls) + ' ครั้ง')}
              {statCard('token รวม', fmtNum(sum.totalTokens))}
              {statCard('ค่าใช้จ่ายประมาณ', fmtCost(sum.totalCost))}
              {statCard('พลาด', fmtNum(sum.totalErrors) + ' ครั้ง')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: '10px', marginBottom: '22px' }}>
              {sum.byProvider.slice().sort((a, b) => b.calls - a.calls).map((b) => (
                <div key={b.provider} style={{ background: 'var(--surface,#fffdf6)', border: '1px solid #e6dabf', borderRadius: '12px', padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
                    <BrandIcon name={b.provider} size={18} />
                    <b style={{ color: '#4a3f35', flex: 1 }}>{b.label}</b>
                    <span style={{ fontSize: '12.5px', color: '#a99b83' }}>{b.calls} ครั้ง</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6f6252', lineHeight: 1.7 }}>
                    <div>token: <b>{fmtNum(b.tokensIn + b.tokensOut)}</b> · ค่าใช้จ่าย: <b>{fmtCost(b.cost)}</b></div>
                    <div>แยกได้ {fmtNum(b.items)} คำ · บันทึก {fmtNum(b.saved)} คำ{b.errors ? ' · พลาด ' + b.errors : ''}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button onClick={() => this.setState({ aiLogFilter: 'all' })} style={btn(S.aiLogFilter === 'all')}>ทั้งหมด</button>
              {sum.byProvider.map((b) => <button key={b.provider} onClick={() => this.setState({ aiLogFilter: b.provider })} style={btn(S.aiLogFilter === b.provider)}>{b.label}</button>)}
            </div>

            <div style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', padding: '11px 16px', background: '#f0e6cd', borderBottom: '1px solid #e0d0ac', fontSize: '12px', fontWeight: 600, color: '#8a7d6d' }}>
                <span>เวลา</span><span>เจ้า / รุ่น</span><span>คำ (เข้า→แยก→บันทึก)</span><span>token</span><span>ค่าใช้จ่าย</span><span>ผล</span>
              </div>
              <div style={{ maxHeight: '540px', overflowY: 'auto' }}>
                {logs.map((l) => (
                  <div key={l.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', padding: '10px 16px', borderBottom: '1px solid #f0e6cd', alignItems: 'center', fontSize: '13px', color: '#5c5044' }}>
                    <span style={{ color: '#8a7d6d', fontSize: '12px' }}>{fmtTH(l.created_at)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <BrandIcon name={l.provider} size={15} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.model || l.provider_label}</span>
                    </span>
                    <span style={{ color: '#6f6252' }}>{fmtNum(l.input_chars)} ตัวอักษร → {fmtNum(l.item_count)} คำ{l.saved_count ? ' → บันทึก ' + fmtNum(l.saved_count) : ''}{l.skipped_count ? ' (ซ้ำ ' + l.skipped_count + ')' : ''}</span>
                    <span>{l.tokens_in || l.tokens_out ? fmtNum((l.tokens_in || 0) + (l.tokens_out || 0)) : '—'}</span>
                    <span>{fmtCost(l.cost_usd)}</span>
                    <span>{l.status === 'error'
                      ? <span title={l.error || ''} style={{ color: '#fff', background: '#e01e1e', borderRadius: '20px', padding: '2px 9px', fontSize: '11.5px', fontWeight: 600 }}>พลาด</span>
                      : <span style={{ color: '#5a7040', background: '#e9efe1', border: '1px solid #cbdcb8', borderRadius: '20px', padding: '2px 9px', fontSize: '11.5px' }}>สำเร็จ</span>}</span>
                  </div>
                ))}
                {logs.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a99b83' }}>ไม่มีรายการในตัวกรองนี้</div>}
              </div>
            </div>
          </>
        )}
      </section>
    );
  }

  // ============ เกี่ยวกับ ============
  // หน้าแนะนำตัวเว็บ — โทนกระดาษวรรณกรรม ใช้ฟอนต์ลายมือให้มากที่สุดเท่าที่ยังอ่านง่าย
  renderAbout() {
    const S = this.state;
    const HAND = "var(--font-charmonman),cursive";  // ลายมือ
    const SERIF = "var(--font-trirong),serif";      // ค่าที่ต้องอ่านชัด
    const ink = '#33291f', faint = '#8a7d6d', line = '#e0d0ac';

    const card = { background: 'var(--surface,#fffdf6)', border: '1px solid ' + line, borderRadius: '14px', padding: '24px 26px 26px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(120,90,50,.06)' };
    // หัวข้อบล็อก: เลขไทยในวงกลมหมึก + ชื่อหัวข้อลายมือ (แพตเทิร์นเดียวกับกล่องขั้นตอนในหน้าเพิ่มคำ)
    const head = (num, title) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <span style={{ flex: 'none', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent,#9c3b2b)', color: '#fbf3e2', display: 'grid', placeItems: 'center', fontSize: '15px', fontFamily: SERIF, fontWeight: 600 }}>{num}</span>
        <span style={{ fontFamily: HAND, fontSize: '25px', color: ink, lineHeight: 1.1, paddingTop: '6px' }}>{title}</span>
        <span style={{ flex: 1, height: '1px', borderTop: '1px dashed #ddcba4', marginTop: '4px' }} />
      </div>
    );
    // แถวข้อมูล ค่าซ้าย-ขวา
    const row = (label, value, last) => (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '9px 0', borderBottom: last ? 'none' : '1px dashed #eadfc6' }}>
        <span style={{ fontSize: '14.5px', color: faint }}>{label}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: SERIF, fontSize: '16px', fontWeight: 600, color: ink }}>{value}</span>
      </div>
    );
    // ตัวเลขสถิติ ตัวใหญ่ลายมือ
    const stat = (n, label) => (
      <div style={{ flex: '1 1 120px', textAlign: 'center', padding: '14px 10px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '11px' }}>
        <div style={{ fontFamily: HAND, fontSize: '38px', lineHeight: 1, color: 'var(--accent,#9c3b2b)' }}>{n}</div>
        <div style={{ fontSize: '13.5px', color: faint, marginTop: '7px' }}>{label}</div>
      </div>
    );

    const batches = this.batchList();
    // หมวดย่อยเก็บเป็น "เส้นทาง" คั่นด้วย / เช่น "การเคลื่อนที่ / การเดิน"
    // → นับ 2 แบบ: กลุ่มชั้นแรก (ตัวเลขที่คนเข้าใจว่าเป็นหมวดย่อย) และแขนงเต็มทั้งเส้นทาง
    const paths = S.library.map((w) => (w.subpath || '').trim()).filter(Boolean);
    const branchCount = new Set(paths).size;
    const subCount = new Set(paths.map((p) => p.split(' / ')[0].trim())).size;
    const techs = [
      { k: 'nextjs', n: 'Next.js 15', d: 'โครงเว็บ' },
      { k: 'react', n: 'React 19', d: 'หน้าจอ' },
      { k: 'supabase', n: 'Supabase', d: 'ฐานข้อมูล' },
      { k: 'cloudflare', n: 'Cloudflare', d: 'ที่วางเว็บ' },
    ];
    // ชิปเทคโนโลยี (หน้าตาเดียวกันทุกตัว) — Claude Code ใช้ชิปแบบเดียวกัน แต่วางกลางแถวล่างของตัวเอง
    const techChip = (t) => (
      <div key={t.k} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '22px' }}>
        <BrandIcon name={t.k} size={16} />
        <span style={{ fontSize: '14px', color: ink }}>{t.n}</span>
        <span style={{ fontSize: '12px', color: '#b3a488' }}>{t.d}</span>
      </div>
    );

    return (
      <section style={{ maxWidth: '780px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        {/* หัวหน้า */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontFamily: HAND, fontWeight: 700, fontSize: 'clamp(38px,5vw,52px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.15 }}>เกี่ยวกับคลังคำ</h1>
          <p style={{ fontFamily: HAND, fontSize: '20px', color: '#b09a72', margin: '6px 0 0' }}>ห้องเก็บถ้อยคำงามของนักเขียน</p>
          <p style={{ fontSize: '14.5px', color: faint, margin: '12px auto 0', maxWidth: '520px', lineHeight: 1.7 }}>
            เว็บส่วนตัวไว้เก็บคำ วลี และประโยคสวยงามที่เจอระหว่างอ่านนิยาย ให้ AI ช่วยแก้คำสะกด สกัดคำเด่นออกจากประโยคยาว แล้วจัดเข้าหมวดหมู่ให้พร้อมหยิบไปใช้เขียนงานของตัวเอง
          </p>
        </div>

        {/* ๑ ผู้พัฒนา */}
        <div style={card}>
          {head('๑', 'ผู้เขียนและผู้พัฒนา')}
          <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
            <div style={{ fontFamily: HAND, fontSize: '34px', color: ink, lineHeight: 1.2 }}>สิรวิชญ์ เผ่าผา</div>
            <div style={{ fontSize: '14px', color: faint, marginTop: '4px' }}>เก็บคำเอง เขียนเอง และทำเว็บนี้ขึ้นมาเอง</div>
            <a href="mailto:siravitphoapha9928@hotmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '15px', padding: '9px 20px', borderRadius: '22px', background: '#f6eed9', border: '1px solid ' + line, color: '#6f5a3e', fontSize: '14.5px', textDecoration: 'none' }}>
              ✉ siravitphoapha9928@hotmail.com
            </a>
          </div>
        </div>

        {/* ๒ ข้อมูลแอป */}
        <div style={card}>
          {head('๒', 'ข้อมูลแอป')}
          {row('เวอร์ชันปัจจุบัน', VERSION)}
          {row('เผยแพร่ครั้งแรก', '๑๗ กรกฎาคม ๒๕๖๙')}
          {row('อัปเดตล่าสุด', '๑๙ กรกฎาคม ๒๕๖๙', true)}
        </div>

        {/* ๓ คลังคำตอนนี้ */}
        <div style={card}>
          {head('๓', 'คลังคำตอนนี้')}
          <div style={{ display: 'flex', gap: '11px', flexWrap: 'wrap' }}>
            {stat(S.library.length, 'คำในคลัง')}
            {stat(S.categories.length, 'หมวดใหญ่')}
            {stat(subCount, 'กลุ่มหมวดย่อย')}
            {/* คลังตั้งต้นยังไม่ได้แยกเรื่อง → ถ้ายังไม่มีเรื่องเลย โชว์จำนวนคำรอตรวจทานแทน จะได้ไม่ขึ้นเลข 0 เปล่า ๆ */}
            {S.novels.length > 0 ? stat(S.novels.length, 'เรื่องที่เก็บมา') : stat(S.review.length, 'คำรอตรวจทาน')}
          </div>
          {S.review.length > 0 && (
            <div style={{ marginTop: '13px', padding: '11px 15px', background: '#fbeecb', border: '1px solid #ecd39a', borderRadius: '10px', fontSize: '14px', color: '#8a5a1e' }}>
              ยังมีคำรอตรวจทานอยู่ <b>{S.review.length}</b> คำ ใน <b>{batches.length}</b> ช่อ
            </div>
          )}
          <p style={{ fontSize: '14.5px', color: faint, lineHeight: 1.75, margin: '16px 0 0' }}>
            คลังตั้งต้น ๖๗๙ คำ มาจากสมุดคำศัพท์จริงที่สะสมไว้ระหว่างอ่านนิยาย นำเข้ามาทั้งเล่มพร้อมหมวดย่อยเดิม แล้วค่อย ๆ เก็บเพิ่มทีละรอบผ่านหน้าเพิ่มคำ
            <br />หมวดย่อย {subCount} กลุ่ม แตกลึกลงไปอีกรวมเป็น {branchCount} แขนง ทุกคำในคลังมีหมวดย่อยกำกับครบ
          </p>
        </div>

        {/* ๔ AI ที่รองรับ */}
        <div style={card}>
          {head('๔', 'ตัวช่วยจัดคำ')}
          <p style={{ fontSize: '14.5px', color: faint, lineHeight: 1.75, margin: '0 0 16px' }}>
            สลับตัว AI ได้ตามใจในหน้าเพิ่มคำ กุญแจของแต่ละเจ้าเก็บอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่หลุดมาถึงเบราว์เซอร์
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '9px' }}>
            {PROVIDER_ORDER.map((k) => {
              const p = PROVIDERS[k];
              if (!p) return null;
              const ready = !!S.aiReady[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '10px' }}>
                  <BrandIcon name={k} size={19} />
                  <span title={p.label} style={{ flex: 1, fontSize: '14.5px', color: ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                  <span style={{ flex: 'none', fontSize: '11.5px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', whiteSpace: 'nowrap', background: ready ? '#e9efe1' : '#f0e8d4', border: '1px solid ' + (ready ? '#cbdcb8' : '#e4d8bd'), color: ready ? '#5a7040' : '#a2937b' }}>
                    {ready ? 'พร้อมใช้' : 'ยังไม่ต่อกุญแจ'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ๕ ข้อมูลเก็บที่ไหน (แยกจากบล็อกเทคโนโลยี — คนละเรื่องกัน) */}
        <div style={card}>
          {head('๕', 'ข้อมูลเก็บที่ไหน')}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '13px 15px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '11px' }}>
            <BrandIcon name="supabase" size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 600, color: ink }}>Supabase</div>
              <div style={{ fontSize: '13.5px', color: faint, lineHeight: 1.65, marginTop: '2px' }}>
                ฐานข้อมูล PostgreSQL บนคลาวด์ · เปิดเครื่องไหนก็เห็นคลังเดียวกัน · ทุกตารางล็อกไว้ให้เข้าถึงได้เฉพาะฝั่งเซิร์ฟเวอร์
              </div>
            </div>
          </div>
        </div>

        {/* ๖ สร้างด้วยเทคโนโลยี */}
        <div style={card}>
          {head('๖', 'สร้างด้วยเทคโนโลยี')}
          <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
            {techs.map(techChip)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', paddingTop: '18px', borderTop: '1px dashed #ddcba4' }}>
            {techChip({ k: 'claude', n: 'Claude Code', d: 'ผู้ช่วยเขียนโค้ด' })}
          </div>
        </div>

        <p style={{ fontFamily: HAND, fontSize: '21px', color: '#b09a72', textAlign: 'center', margin: '26px 0 0' }}>
          “เก็บคำงาม ไว้แต่งเรื่องของเราเอง”
        </p>
      </section>
    );
  }

  // ============ LIBRARY ============
  renderLibrary(getCat, monoMode, accent) {
    const S = this.state;
    const dupMap = {}; S.library.forEach((x) => { dupMap[x.text] = (dupMap[x.text] || 0) + 1; });
    const dupTotal = Object.keys(dupMap).filter((t) => dupMap[t] > 1 && t.length <= 24).length;
    const ql = S.q.trim().toLowerCase();
    const matchQN = (w) => (S.filterNovel === 'all' || w.novel === S.filterNovel) && (!ql || w.text.toLowerCase().includes(ql) || (w.meaning || '').toLowerCase().includes(ql));
    const ctxLib = S.library.filter(matchQN);
    let filtered = ctxLib.filter((w) => (S.filterCat === 'all' || w.category === S.filterCat) && (S.filterKind === 'all' || w.kind === S.filterKind));
    if (S.exactFilter) filtered = filtered.filter((w) => w.text === S.exactFilter);
    if (S.dupOnly) filtered = filtered.filter((w) => (dupMap[w.text] || 0) > 1 && w.text.length <= 24);
    const sortFn = S.sort === 'az' ? (a, b) => a.text.localeCompare(b.text, 'th') : S.sort === 'old' ? (a, b) => a.date - b.date : (a, b) => b.date - a.date;
    filtered = filtered.slice().sort(sortFn);

    const cardMode = this.eff('cardStyle', 'classic');
    const cardSize = this.eff('cardSize', 'm');
    const SZ = ({ s: { min: 168, w: 16.5, lw: 19 }, m: { min: 228, w: 19, lw: 22 }, l: { min: 302, w: 23, lw: 27 } })[cardSize] || { min: 228, w: 19, lw: 22 };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(' + SZ.min + 'px,1fr))', gap: '12px', marginBottom: '8px' };
    const wordFont = this.eff('wordFont', 'trirong');
    const FF = ({ trirong: "var(--font-trirong),serif", sarabun: "var(--font-sarabun),sans-serif", maitree: "var(--font-maitree),serif", chonburi: "var(--font-chonburi),serif" })[wordFont] || "var(--font-trirong),serif";
    const isCards = S.libView === 'cards', isList = S.libView === 'list';

    const seg = (on) => ({ padding: '7px 15px', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', background: on ? 'var(--surface,#fffdf6)' : 'transparent', color: on ? '#3a2f28' : '#8a7d6d', fontWeight: on ? 600 : 400, boxShadow: on ? '0 1px 3px rgba(120,90,50,.15)' : 'none' });

    const novelFilterOpts = [{ v: 'all', label: 'ทุกเรื่อง' }].concat([...new Set(S.library.map((w) => w.novel).filter(Boolean))].map((n) => ({ v: n, label: n })));
    const catChipStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '20px', fontSize: '13.5px', cursor: 'pointer', border: '1px solid ' + (active ? 'var(--primary,#6f4e37)' : '#ddcba4'), background: active ? 'var(--primary,#6f4e37)' : 'var(--panel,#f7f0e0)', color: active ? '#fbf3e2' : '#6f6252', fontWeight: active ? 600 : 400 });

    // หมวดที่จะแสดง (ตามตัวกรอง) พร้อมคำที่ผ่านตัวกรองแล้ว
    const visCats = (S.filterCat === 'all' ? S.categories : S.categories.filter((c) => c.id === S.filterCat))
      .map((c) => ({ cat: c, items: filtered.filter((w) => w.category === c.id) }))
      .filter((g) => g.items.length > 0);
    const anyResults = visCats.length > 0;
    const allCatKeys = visCats.map((g) => 'g-' + g.cat.id);
    const navStyle = 'tabs'; // ใช้แบนเนอร์บนเสมอ (เอา sidebar ออกแล้ว)

    const renderCard = (w) => {
      const cat = getCat(w.category);
      const isDup = (dupMap[w.text] || 0) > 1 && w.text.length <= 24;
      const bar = monoMode ? '#c9b78f' : cat.c, dupB = rgba(accent, 0.55), dupBg = rgba(accent, 0.08);
      const baseCard = { background: isDup ? dupBg : 'var(--surface,#fffdf6)', border: '1px solid ' + (isDup ? dupB : '#e6dabf'), borderRadius: '12px', position: 'relative', overflow: 'hidden' };
      const confirming = S.confirmId === w.id;
      const footer = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#b0a184' }}>
          {w.kind ? <span style={{ flex: 'none', fontSize: '10.5px', fontWeight: 600, color: '#8a7150', background: '#efe4cc', padding: '1px 7px', borderRadius: '20px' }}>{ { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' }[w.kind] || w.kind }</span> : null}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✦ {w.novel}</span>
          {isDup && <button onClick={() => this.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' })} style={{ border: '1px solid ' + rgba(accent, 0.5), background: rgba(accent, 0.1), color: 'var(--accent,#9c3b2b)', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', cursor: 'pointer', flex: 'none' }}>ซ้ำ ×{dupMap[w.text]}</button>}
          {confirming ? (
            <>
              <span style={{ color: 'var(--accent,#9c3b2b)' }}>ลบคำนี้</span>
              <button onClick={this.doDelete(w.id)} style={{ border: 'none', background: 'transparent', color: 'var(--accent,#9c3b2b)', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>ยืนยัน</button>
              <button onClick={this.cancelDelete} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '12px' }}>ยกเลิก</button>
            </>
          ) : (
            <>
              <button onClick={this.openEdit(w)} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '12px' }}>แก้ไข</button>
              <button onClick={this.askDelete(w.id)} style={{ border: 'none', background: 'transparent', color: '#c1a98f', cursor: 'pointer', fontSize: '12px' }}>ลบ</button>
            </>
          )}
        </div>
      );
      if (cardMode === 'literary') {
        return (
          <div key={w.id} style={{ ...baseCard, padding: '20px 18px 15px' }}>
            <span style={{ position: 'absolute', top: '-8px', left: '9px', fontFamily: 'Georgia,serif', fontSize: '64px', lineHeight: 1, color: rgba(accent, 0.15), zIndex: 0 }}>“</span>
            <div style={{ fontFamily: FF, fontSize: SZ.lw + 'px', fontWeight: 500, color: '#33291f', lineHeight: 1.3, textWrap: 'pretty', position: 'relative', zIndex: 1 }}>{w.text}</div>
            {w.meaning && w.meaning.trim() && <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#8a7d6d', marginTop: '8px', lineHeight: 1.5 }}>{w.meaning}</div>}
            {footer}
          </div>
        );
      }
      if (cardMode === 'index') {
        return (
          <div key={w.id} style={{ ...baseCard, padding: '0 15px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 -15px 11px', padding: '6px 15px', background: monoMode ? '#efe4cc' : rgba(cat.c, 0.16), color: monoMode ? '#5c5044' : shade(cat.c), borderBottom: '1px solid ' + (isDup ? dupB : '#ecdcbf'), fontSize: '12px', fontWeight: 600 }}>{cat.k}  {cat.n}</div>
            <div style={{ fontFamily: FF, fontSize: SZ.w + 'px', fontWeight: 500, color: '#33291f', lineHeight: 1.35, textWrap: 'pretty', paddingBottom: '8px', borderBottom: '1px dashed #e0d0ac' }}>{w.text}</div>
            {w.meaning && w.meaning.trim() && <div style={{ fontSize: '13.5px', color: '#8a7d6d', marginTop: '8px', lineHeight: 1.4 }}>{w.meaning}</div>}
            {footer}
          </div>
        );
      }
      return (
        <div key={w.id} style={{ ...baseCard, padding: '14px 15px', borderLeft: '3px solid ' + (isDup ? dupB : bar) }}>
          <div style={{ fontFamily: FF, fontSize: SZ.w + 'px', fontWeight: 500, color: '#33291f', lineHeight: 1.35, textWrap: 'pretty' }}>{w.text}</div>
          {w.meaning && w.meaning.trim() && <div style={{ fontSize: '13.5px', color: '#8a7d6d', marginTop: '5px', lineHeight: 1.4 }}>{w.meaning}</div>}
          {footer}
        </div>
      );
    };

    const renderRow = (w) => {
      const cat = getCat(w.category);
      const isDup = (dupMap[w.text] || 0) > 1 && w.text.length <= 24;
      const confirming = S.confirmId === w.id;
      return (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 15px', borderBottom: '1px solid #f0e6cd', background: isDup ? rgba(accent, 0.08) : 'var(--surface,#fffdf6)' }}>
          <span style={dot(cat, monoMode)} />
          <span style={{ fontFamily: "var(--font-trirong),serif", fontSize: '17px', color: '#33291f', flex: 'none' }}>{w.text}</span>
          {w.meaning && w.meaning.trim() && <span style={{ fontSize: '14px', color: '#a0937d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {w.meaning}</span>}
          <span style={{ flex: 1 }} />
          {isDup && <button onClick={() => this.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' })} style={{ border: '1px solid ' + rgba(accent, 0.5), background: rgba(accent, 0.1), color: 'var(--accent,#9c3b2b)', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', cursor: 'pointer', flex: 'none' }}>ซ้ำ ×{dupMap[w.text]}</button>}
          <span style={{ fontSize: '12px', color: '#b0a184', whiteSpace: 'nowrap' }}>✦ {w.novel}</span>
          {confirming ? (
            <>
              <button onClick={this.doDelete(w.id)} style={{ border: 'none', background: 'transparent', color: 'var(--accent,#9c3b2b)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>ยืนยันลบ</button>
              <button onClick={this.cancelDelete} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '13px' }}>ยกเลิก</button>
            </>
          ) : (
            <>
              <button onClick={this.openEdit(w)} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '13px' }}>แก้ไข</button>
              <button onClick={this.askDelete(w.id)} style={{ border: 'none', background: 'transparent', color: '#c1a98f', cursor: 'pointer', fontSize: '13px' }}>ลบ</button>
            </>
          )}
        </div>
      );
    };

    const chev = (collapsed) => (
      <span style={{ display: 'inline-block', width: '16px', color: '#b0a184', fontSize: '11px', transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>▼</span>
    );

    // เรนเดอร์กลุ่มย่อยแบบซ้อนชั้น (recursive)
    const renderLevel = (cat, items, orderNodes, segIndex, keyPrefix, depth) => {
      const bySeg = new Map(); const direct = [];
      items.forEach((w) => {
        const segs = (w.subpath || '').split(' / ').filter(Boolean);
        if (segs.length > segIndex && segs[segIndex]) { const nm = segs[segIndex]; if (!bySeg.has(nm)) bySeg.set(nm, []); bySeg.get(nm).push(w); }
        else direct.push(w);
      });
      const ordered = (orderNodes || []).map((n) => n.name).filter((nm) => bySeg.has(nm));
      const names = [...ordered, ...[...bySeg.keys()].filter((nm) => !ordered.includes(nm))];
      const headSize = [19, 16.5, 15][depth] || 15;
      const neutral = ['#4a3f35', '#5c4c3a', '#6a5a48'][depth] || '#6a5a48';
      const nameColor = monoMode ? neutral : shade(cat.c);
      const enSize = [13, 12.5, 12][depth] || 12;
      const tint = [0.13, 0.08, 0.05][depth] != null ? [0.13, 0.08, 0.05][depth] : 0.05;
      const bw = [4, 3, 2][depth] || 2;
      const pad = ['9px 14px', '8px 13px', '6px 12px'][depth] || '6px 12px';
      const bandStyle = {
        display: 'flex', alignItems: 'center', gap: '10px', margin: (depth === 0 ? '14px' : '12px') + ' 0 4px', padding: pad,
        background: monoMode ? ['#efe4cc', '#f2ead7', '#f6f0e2'][depth] : rgba(cat.c, tint),
        border: '1px solid ' + (monoMode ? '#e0d0ac' : rgba(cat.c, Math.max(0.16, 0.3 - depth * 0.06))),
        borderLeft: bw + 'px solid ' + (monoMode ? '#c9b78f' : cat.c),
        borderRadius: '9px', cursor: 'pointer', userSelect: 'none',
      };
      return (
        <div>
          {direct.length > 0 && (
            isCards ? <div style={gridStyle}>{direct.map(renderCard)}</div>
              : <div style={{ border: '1px solid #e6dabf', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>{direct.map(renderRow)}</div>
          )}
          {names.map((nm, i) => {
            const childItems = bySeg.get(nm);
            const node = (orderNodes || []).find((n) => n.name === nm);
            const key = keyPrefix + '-' + i;
            const isCol = !!S.collapsed[key];
            return (
              <div key={key} id={key} style={{ margin: '2px 0 10px', paddingLeft: depth > 0 ? '15px' : 0, borderLeft: depth > 0 ? '1px solid #ece0c6' : 'none', scrollMarginTop: '80px' }}>
                <div onClick={this.toggleCollapse(key)} style={bandStyle}>
                  {chev(isCol)}
                  <span style={{ fontFamily: "var(--font-trirong),serif", fontSize: headSize + 'px', fontWeight: depth < 2 ? 700 : 600, color: nameColor }}>{nm}</span>
                  {node && node.en && <span style={{ fontSize: enSize + 'px', fontStyle: 'italic', color: monoMode ? '#8a7d6d' : '#ab9a80', letterSpacing: '.2px' }}>{node.en}</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: '12.5px', color: '#a99b83', whiteSpace: 'nowrap' }}>{childItems.length} คำ</span>
                </div>
                {node && node.desc && <div style={{ fontSize: '12.5px', color: '#a1937d', fontStyle: 'italic', margin: '0 0 8px', paddingLeft: '16px' }}>{node.desc}</div>}
                {!isCol && renderLevel(cat, childItems, node ? node.children : [], segIndex + 1, key, depth + 1)}
              </div>
            );
          })}
        </div>
      );
    };

    // สารบัญฝั่งซ้าย
    const tocTop = navStyle === 'tabs' ? 74 : 16;
    const toc = (
      <aside style={{ width: '236px', flex: 'none', position: 'sticky', top: tocTop + 'px', alignSelf: 'flex-start', maxHeight: 'calc(100vh - ' + (tocTop + 20) + 'px)', overflow: 'auto', paddingRight: '6px' }}>
        <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '19px', color: 'var(--accent,#9c3b2b)', margin: '0 0 10px' }}>สารบัญ</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button onClick={this.collapseAll(allCatKeys)} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddcba4', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer' }}>ยุบทั้งหมด</button>
          <button onClick={this.expandAll} style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddcba4', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer' }}>ขยายทั้งหมด</button>
        </div>
        {visCats.map((g) => {
          const catKey = 'g-' + g.cat.id;
          const l1 = (SUBTREE[g.cat.id] || []).map((n, i) => ({ n, key: catKey + '-' + i })).filter(({ n }) => g.items.some((w) => (w.subpath || '').split(' / ')[0] === n.name));
          return (
            <div key={g.cat.id} style={{ marginBottom: '4px' }}>
              <div onClick={this.jumpTo(catKey, [catKey])} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 4px', cursor: 'pointer', borderRadius: '6px' }}>
                <span style={badge(g.cat, monoMode)}>{g.cat.k}</span>
                <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: '#4a3f35', lineHeight: 1.2 }}>{g.cat.n}</span>
                <span style={{ fontSize: '11px', color: '#b8aa8e' }}>{g.items.length}</span>
              </div>
              <div style={{ paddingLeft: '30px' }}>
                {l1.map(({ n, key }) => (
                  <div key={key} onClick={this.jumpTo(key, [catKey, key])} style={{ fontSize: '12.5px', color: '#8a7d6d', padding: '3px 4px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</div>
                ))}
              </div>
            </div>
          );
        })}
      </aside>
    );

    return (
      <section style={{ maxWidth: '100%', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: '0 0 8px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>คลังคำของฉัน</h1>
        <p style={{ color: '#6f6252', margin: '0 0 24px' }}><b style={{ color: '#4a3f35' }}>{S.library.length}</b> คำ ใน {new Set(S.library.map((w) => w.category)).size} หมวด จาก {new Set(S.library.map((w) => w.novel)).size} เรื่อง</p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '420px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b0a184', fontSize: '16px' }}>⌕</span>
            <input value={S.q} onChange={this.onQ} placeholder="ค้นหาคำ วลี หรือความหมาย…" style={{ width: '100%', padding: '11px 14px 11px 38px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
          </div>
          <select value={S.filterNovel} onChange={this.onFilterNovel} style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>{novelFilterOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
          <select value={S.filterKind} onChange={(e) => this.setState({ filterKind: e.target.value })} title="กรองตามชนิด" style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>
            <option value="all">ทุกชนิด</option><option value="word">คำ</option><option value="phrase">วลี</option><option value="sentence">ประโยค</option>
          </select>
          <select value={S.sort} onChange={this.onSort} style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>
            <option value="recent">ล่าสุดก่อน</option><option value="old">เก่าก่อน</option><option value="az">ก - ฮ</option>
          </select>
          <div style={{ display: 'inline-flex', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
            {[['cards', 'การ์ด'], ['list', 'รายการ']].map(([k, label]) => <button key={k} onClick={this.setLibView(k)} style={seg(S.libView === k)}>{label}</button>)}
          </div>
          {isCards && (
            <div style={{ display: 'inline-flex', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
              {[['s', 'เล็ก'], ['m', 'กลาง'], ['l', 'ใหญ่']].map(([k, label]) => <button key={k} onClick={this.setUi('cardSize', k)} style={seg(cardSize === k)}>{label}</button>)}
            </div>
          )}
          {isCards && (
            <div style={{ display: 'inline-flex', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
              {[['trirong', 'ไทรรงค์', "var(--font-trirong),serif"], ['sarabun', 'สารบรรณ', "var(--font-sarabun),sans-serif"], ['maitree', 'ไมตรี', "var(--font-maitree),serif"], ['chonburi', 'ชลบุรี', "var(--font-chonburi),serif"]].map(([k, label, ff]) => <button key={k} onClick={this.setUi('wordFont', k)} style={{ ...seg(wordFont === k), fontFamily: ff, fontSize: '14px' }}>{label}</button>)}
            </div>
          )}
        </div>

        {(dupTotal > 0 || S.exactFilter) && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
            {dupTotal > 0 && <button onClick={this.toggleDupOnly} style={{ padding: '6px 13px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: '1px solid ' + rgba(accent, 0.5), background: S.dupOnly ? 'var(--accent,#9c3b2b)' : rgba(accent, 0.08), color: S.dupOnly ? '#fbf3e2' : 'var(--accent,#9c3b2b)', fontWeight: 600 }}>⚑ ดูเฉพาะคำซ้ำ ({dupTotal})</button>}
            {S.exactFilter && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: rgba(accent, 0.1), border: '1px solid ' + rgba(accent, 0.4), fontSize: '13px', color: 'var(--accent,#9c3b2b)' }}>กรองคำ: “{S.exactFilter}” <button onClick={this.clearExact} style={{ border: 'none', background: 'transparent', color: 'var(--accent,#9c3b2b)', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>✕</button></span>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '26px' }}>
          <button onClick={this.setFilterCat('all')} style={catChipStyle(S.filterCat === 'all')}>ทั้งหมด <span style={{ opacity: 0.6 }}>{ctxLib.length}</span></button>
          {S.categories.map((c) => {
            const cnt = ctxLib.filter((w) => w.category === c.id).length;
            if (!cnt) return null;
            return <button key={c.id} onClick={this.setFilterCat(c.id)} style={catChipStyle(S.filterCat === c.id)}><span style={dot(c, monoMode)} />{c.n} <span style={{ opacity: 0.6 }}>{cnt}</span></button>;
          })}
        </div>

        {!anyResults && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a99b83' }}>
            <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '26px' }}>ไม่พบคำที่ค้นหา</div>
            <p style={{ color: '#8a7d6d' }}>ลองเปลี่ยนคำค้น หรือล้างตัวกรองดู</p>
          </div>
        )}

        {anyResults && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {toc}
            <div style={{ flex: 1, minWidth: 0 }}>
              {visCats.map((g) => {
                const catKey = 'g-' + g.cat.id;
                const isCol = !!S.collapsed[catKey];
                const cm = CATMETA[g.cat.id] || {};
                const bigBadge = { ...badge(g.cat, monoMode), width: '36px', height: '36px', fontSize: '17px' };
                return (
                  <div key={g.cat.id} id={catKey} style={{ marginBottom: '30px', scrollMarginTop: (tocTop + 6) + 'px' }}>
                    <div onClick={this.toggleCollapse(catKey)} style={{ cursor: 'pointer', userSelect: 'none', padding: '13px 16px', background: monoMode ? '#f2ead7' : rgba(g.cat.c, 0.13), border: '1px solid ' + (monoMode ? '#ddcba4' : rgba(g.cat.c, 0.32)), borderLeft: '5px solid ' + (monoMode ? '#c9b78f' : g.cat.c), borderRadius: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                        {chev(isCol)}
                        <span style={bigBadge}>{g.cat.k}</span>
                        <h2 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 700, fontSize: '24px', margin: 0, color: '#33291f', lineHeight: 1.15 }}>{g.cat.n}</h2>
                        {cm.en && <span style={{ fontSize: '13.5px', fontStyle: 'italic', color: monoMode ? '#8a7d6d' : shade(g.cat.c), letterSpacing: '.3px' }}>{cm.en}</span>}
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: '13px', color: '#8a7d6d', whiteSpace: 'nowrap' }}>{g.items.length} คำ</span>
                      </div>
                      {cm.desc && <div style={{ fontSize: '13.5px', color: '#8a7d6d', margin: '6px 0 0', paddingLeft: '31px', textWrap: 'pretty' }}>{cm.desc}</div>}
                    </div>
                    {!isCol && renderLevel(g.cat, g.items, SUBTREE[g.cat.id] || [], 0, catKey, 0)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  // ============ EDIT MODAL ============
  renderEditModal() {
    const ed = this.state.editing || {};
    return (
      <div onClick={this.cancelEdit} style={{ position: 'fixed', inset: 0, background: 'rgba(58,47,40,.4)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 70, padding: '20px', animation: 'wbfade .2s ease' }}>
        <div onClick={this.stop} style={{ background: 'var(--panel,#f7f0e0)', border: '1px solid #e0d0ac', borderRadius: '16px', padding: '28px', width: 'min(460px,100%)', boxShadow: '0 20px 60px rgba(58,47,40,.3)' }}>
          <h3 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '22px', margin: '0 0 18px' }}>แก้ไขคำ</h3>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>คำ / วลี</label>
          <input value={ed.text || ''} onChange={this.onEditField('text')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#33291f', fontFamily: "var(--font-trirong),serif", fontSize: '18px', outline: 'none', marginBottom: '14px' }} />
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>ความหมาย (ไม่บังคับ)</label>
          <input value={ed.meaning || ''} onChange={this.onEditField('meaning')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none', marginBottom: '14px' }} />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>หมวด</label>
              <select value={ed.category || 'c0'} onChange={this.onEditField('category')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>{this.state.categories.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}</select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>จากเรื่อง</label>
              <input list="wb-novels" value={ed.novel || ''} onChange={this.onEditField('novel')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <button onClick={this.deleteFromEdit} style={{ padding: '10px 15px', border: '1px solid #e6c3b7', borderRadius: '9px', background: '#faf1ee', color: 'var(--accent,#9c3b2b)', cursor: 'pointer' }}>ลบคำนี้</button>
            <div style={{ flex: 1 }} />
            <button onClick={this.cancelEdit} style={{ padding: '10px 16px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', cursor: 'pointer' }}>ยกเลิก</button>
            <button onClick={this.saveEdit} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>บันทึก</button>
          </div>
        </div>
      </div>
    );
  }

  // ============ CATEGORY MODAL ============
  renderCatModal(monoMode) {
    const S = this.state;
    return (
      <div onClick={this.closeCats} style={{ position: 'fixed', inset: 0, background: 'rgba(58,47,40,.4)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 70, padding: '20px', animation: 'wbfade .2s ease' }}>
        <div onClick={this.stop} style={{ background: 'var(--panel,#f7f0e0)', border: '1px solid #e0d0ac', borderRadius: '16px', padding: '28px', width: 'min(560px,100%)', maxHeight: '86vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(58,47,40,.3)' }}>
          <h3 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '22px', margin: '0 0 4px' }}>จัดการหมวด</h3>
          <p style={{ color: '#8a7d6d', fontSize: '14px', margin: '0 0 18px' }}>แก้ชื่อหมวด รวมหมวดเข้าด้วยกัน หรือเพิ่มหมวดใหม่</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {S.categories.map((c) => {
              const cnt = this.catCount(c.id);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={badge(c, monoMode)}>{c.k}</span>
                  <input value={c.n} onChange={this.renameCat(c.id)} style={{ flex: 1, padding: '8px 11px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
                  <span style={{ fontSize: '12px', color: '#a99b83', width: '54px', textAlign: 'right' }}>{cnt} คำ</span>
                  <button onClick={this.removeCat(c.id)} title="ลบหมวด (ต้องไม่มีคำ)" style={{ border: 'none', background: 'transparent', color: cnt > 0 ? '#d8cbb0' : '#c98878', cursor: cnt > 0 ? 'not-allowed' : 'pointer', fontSize: '15px' }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '16px', background: '#efe7f0', border: '1px solid #d6c4d9', borderRadius: '11px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, color: '#6a4a72', marginBottom: '10px', fontSize: '14px' }}>รวมหมวด</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select value={S.mergeFrom} onChange={this.onMergeFrom} style={{ flex: 1, minWidth: '130px', padding: '8px 10px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#3a2f28' }}><option value="">— จากหมวด —</option>{S.categories.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}</select>
              <span style={{ color: '#8a7d6d' }}>→</span>
              <select value={S.mergeTo} onChange={this.onMergeTo} style={{ flex: 1, minWidth: '130px', padding: '8px 10px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#3a2f28' }}><option value="">— ไปหมวด —</option>{S.categories.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}</select>
              <button onClick={this.merge} style={{ padding: '8px 15px', border: 'none', borderRadius: '8px', background: '#6a4a72', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>รวม</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={S.newCatName} onChange={this.onNewCatName} placeholder="ชื่อหมวดใหม่…" style={{ flex: 1, padding: '9px 12px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
            <button onClick={this.addCat} style={{ padding: '9px 16px', border: '1px solid #cbdcb8', borderRadius: '8px', background: '#e9efe1', color: '#5a7040', fontWeight: 600, cursor: 'pointer' }}>＋ เพิ่มหมวด</button>
          </div>
          <div style={{ textAlign: 'right', marginTop: '20px' }}><button onClick={this.closeCats} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>เสร็จสิ้น</button></div>
        </div>
      </div>
    );
  }

  // ============ SETTINGS DRAWER ============
  renderSettings(monoMode, navStyle, spell, effLayout, accent, primary, paper) {
    const swBtn = (c, on) => ({ width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', background: c, border: on ? '2px solid #3a2f28' : '1px solid rgba(0,0,0,.15)', boxShadow: on ? '0 0 0 3px rgba(58,47,40,.16)' : '0 1px 2px rgba(0,0,0,.08)', outline: 'none', padding: 0 });
    const segBtn = (on) => ({ padding: '7px 13px', border: 'none', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer', background: on ? 'var(--primary,#6f4e37)' : 'transparent', color: on ? '#fbf3e2' : '#6f6252', fontWeight: on ? 600 : 400 });
    const cardMode = this.eff('cardStyle', 'classic');
    const aiProv = this.eff('aiProvider', 'basic');
    const aiBtn = (on) => ({ display: 'flex', alignItems: 'center', gap: '7px', textAlign: 'left', padding: '9px 11px', borderRadius: '9px', cursor: 'pointer', fontSize: '13.5px', border: on ? '1.5px solid var(--primary,#6f4e37)' : '1px solid #ddcba4', background: on ? '#f3ead9' : 'var(--surface,#fffdf6)', color: '#4a4034', fontWeight: on ? 600 : 400 });
    const tagStyle = { fontSize: '10.5px', padding: '1px 6px', borderRadius: '20px', background: '#efe4cc', color: '#8a7150', fontWeight: 600, whiteSpace: 'nowrap' };
    const swatchRow = (key, list, cur) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '11px', marginBottom: '22px' }}>
        {list.map((c) => <button key={c} onClick={this.setUi(key, c)} style={swBtn(c, (cur || '').toLowerCase() === c.toLowerCase())} />)}
      </div>
    );
    const segRow = (label, key, cur, opts, styleExtra) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ width: '120px', fontSize: '14px', color: '#5c5044' }}>{label}</span>
        <div style={{ display: 'inline-flex', background: 'var(--surface,#fffdf6)', border: '1px solid #ddcba4', borderRadius: '9px', padding: '3px' }}>
          {opts.map((o) => <button key={o[0]} onClick={this.setUi(key, o[0])} style={{ ...segBtn(cur === o[0]), ...(styleExtra ? styleExtra(o) : {}) }}>{o[1]}</button>)}
        </div>
      </div>
    );
    return (
      <div onClick={this.closeSettings} style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 75 }}>
        <div onClick={this.stop} style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(360px,90vw)', background: 'var(--panel,#f7f0e0)', borderLeft: '1px solid #e0d0ac', padding: '24px 24px 40px', overflow: 'auto', boxShadow: '-8px 0 34px rgba(58,47,40,.22)', animation: 'wbslide .28s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 4px' }}><h3 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '22px', margin: 0, flex: 1 }}>ตั้งค่าการแสดงผล</h3><button onClick={this.closeSettings} title="ปิด" style={{ border: 'none', background: 'transparent', color: '#8a7d6d', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button></div>
          <p style={{ color: '#8a7d6d', fontSize: '13.5px', margin: '0 0 20px' }}>ปรับสีและรูปแบบได้เอง ระบบจะจำค่าไว้ให้</p>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#5c5044', marginBottom: '11px' }}>สีกระดาษ (ถนอมสายตา)</div>
          {swatchRow('paper', ['#f2e8d2', '#faf9de', '#fff2e2', '#fde6e0', '#e3edcd', '#c7edcc', '#cce8cf', '#dce2f1', '#e9ebfe', '#eaeaef'], paper)}
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#5c5044', marginBottom: '11px' }}>สีหลัก (โลโก้ / ไฮไลต์)</div>
          {swatchRow('accent', ['#9c3b2b', '#3f6f66', '#3a5a8c', '#8a5a2b', '#7a3b63'], accent)}
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#5c5044', marginBottom: '11px' }}>สีปุ่ม</div>
          {swatchRow('primary', ['#6f4e37', '#33564a', '#2f4668', '#6f4522', '#552a4a'], primary)}
          <div style={{ height: '1px', background: '#e0d0ac', margin: '2px 0 20px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {segRow('แบบการ์ดคำ', 'cardStyle', cardMode, [['classic', 'คลาสสิก'], ['literary', 'วรรณกรรม'], ['index', 'การ์ดดัชนี']])}
            {segRow('หน้าตรวจทาน', 'reviewLayout', effLayout, [['cards', 'การ์ด'], ['table', 'ตาราง'], ['columns', 'คอลัมน์']])}
            {segRow('คำแก้สะกด', 'spellDisplay', spell, [['highlight', 'ไฮไลต์'], ['strikethrough', 'ขีดฆ่า'], ['label', 'ป้าย']])}
            {segRow('สีหมวด', 'categoryColor', monoMode ? 'mono' : 'soft', [['soft', 'มีสี'], ['mono', 'ขาว-ดำ']])}
          </div>
          <div style={{ height: '1px', background: '#e0d0ac', margin: '22px 0 18px' }} />
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#5c5044', marginBottom: '4px' }}>ตัว AI ที่ใช้จัดคำ</div>
          <p style={{ color: '#8a7d6d', fontSize: '12.5px', margin: '0 0 12px', lineHeight: 1.5 }}>เลือกตัวช่วยจัดคำในหน้าเพิ่มคำ · เจ้าที่ไม่ใช่ "พื้นฐาน" ต้องตั้งกุญแจ (API key) ในไฟล์ .env.local ก่อน</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {PROVIDER_ORDER.map((k) => {
              const p = PROVIDERS[k]; if (!p) return null;
              return (
                <button key={k} onClick={this.setUi('aiProvider', k)} style={aiBtn(aiProv === k)}>
                  <BrandIcon name={k} size={17} />
                  <span style={{ flex: 1 }}>{p.label}</span>
                  {p.tag ? <span style={tagStyle}>{p.tag}</span> : null}
                </button>
              );
            })}
          </div>
          {(() => {
            const cur = PROVIDERS[aiProv];
            if (!cur || !Array.isArray(cur.models) || !cur.models.length) return null;
            const sel = this.eff('aiModel:' + aiProv, '') || cur.model;
            return (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12.5px', color: '#5c5044', marginBottom: '6px' }}>รุ่นของ {cur.label}</div>
                <select value={sel} onChange={(e) => this.setUi('aiModel:' + aiProv, e.target.value)()}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: '9px', border: '1px solid #ddcba4', background: 'var(--surface,#fffdf6)', color: '#4a4034', fontSize: '13.5px', cursor: 'pointer' }}>
                  {cur.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            );
          })()}
          {(() => {
            // ปุ่มลิงก์ไปขอกุญแจ (API key) ของเจ้าที่เลือก — เปิดเว็บผู้ให้บริการในแท็บใหม่
            const cur = PROVIDERS[aiProv];
            return cur && cur.keyUrl ? (
              <a href={cur.keyUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: '14px', padding: '9px 14px', border: '1px solid #cbdcb8', borderRadius: '9px', background: '#eef3dc', color: '#5a7040', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>🔗 ไปขอกุญแจ (API key) ของ {cur.label}</a>
            ) : null;
          })()}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}><button onClick={this.resetSettings} style={{ padding: '9px 15px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', cursor: 'pointer' }}>คืนค่าเริ่มต้น</button><div style={{ flex: 1 }} /><button onClick={this.closeSettings} style={{ padding: '10px 22px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>เสร็จสิ้น</button></div>
        </div>
      </div>
    );
  }
}
