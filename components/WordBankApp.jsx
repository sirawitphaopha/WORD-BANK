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
import { PROMPT_LOG } from '@/lib/promptlog';
import { diffLines, diffStat, collapseSame } from '@/lib/promptdiff';
import { AI_TEST } from '@/lib/aitest';
import { renderShell } from '@/components/shell';
import { installHandlers } from '@/components/handlers';
import { VERSION, thNum, aiModel, shortDate, pathsOf, UI_KEY, REVIEW_KEY, DRAFT_KEY } from '@/components/helpers';
import { RP, TEST_WORDS } from '@/components/pages/reportShared';
import { renderAdd, renderProcessing } from '@/components/pages/add';
import { renderReview } from '@/components/pages/review';
import { renderAiLog } from '@/components/pages/aiLog';
import { renderAiTest } from '@/components/pages/aiTest';
import { renderPromptLog } from '@/components/pages/promptLog';
import { renderAbout } from '@/components/pages/about';
import { renderLibrary } from '@/components/pages/library';
import { renderEditModal, renderCatModal, renderSettings } from '@/components/pages/modals';
export { VERSION } from '@/components/helpers';


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
    q: '', filterCat: 'all', filterNovels: [], novelMenuOpen: false, fontMenuOpen: false, filterKind: 'all', filterSlot: 'all', sort: 'recent', libView: 'cards',
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
    stickH: 128,         // ความสูงจริงของก้อนตรึง (แท็บช่อ + แถบเครื่องมือ) — หัวตารางเอาไปคำนวณว่าต้องเกาะที่ตำแหน่งไหน
    addPathFor: null,    // id ของคำที่กำลังพิมพ์เพิ่มหมวดย่อยอยู่
    newBranchOnly: false, // หน้าตรวจทาน: กรองเหลือเฉพาะคำที่มีกิ่งใหม่ (ป้าย ✦ เขียว)
    branchPick: '',       // หน้าตรวจทาน: กดชิปในลิสกิ่งใหม่ = ดูเฉพาะคำที่อยู่กิ่งนั้นกิ่งเดียว
    testSide: 'typed',    // หน้าผลทดสอบ: ดูตารางเทียบของคำที่พิมพ์เข้า ('typed') หรือคำที่ AI สกัด ('ext')
    promptOpen: null,     // หน้าประวัติคำสั่ง: ฉบับที่กางข้อความเต็มอยู่
    promptLang: 'en',     // หน้าประวัติคำสั่ง: ดูฉบับอังกฤษ (ที่ส่งจริง) หรือไทย
    libStickH: 103,      // ความสูงจริงของแถบตรึงหน้าคลังคำ (ค้นหา+ตัวกรอง+ชิปหมวด) — สารบัญเอาไปหลบใต้แถบนี้
    isMobile: false,     // จอเล็ก (มือถือ) — ปรับเลย์เอาต์เฉพาะตอนจริง จอคอมพิวเตอร์เหมือนเดิมทุกอย่าง
    menuOpen: false,     // เมนู ☰ บนมือถือ เปิด/ปิด
    bannerH: 69,         // ความสูงจริงของแบนเนอร์บนสุด (วัดเอง) — แถบตรึงทุกอันเกาะใต้ค่านี้ (เดิม hardcode 69)
  };
  _stickRef = React.createRef();
  _libStickRef = React.createRef();
  _bannerRef = React.createRef();
  constructor(props) { super(props); installHandlers(this); }
  render() { return renderShell(this); }
  // เฝ้าดูความสูงก้อนตรึง (เปลี่ยนเมื่อมี/ไม่มีแท็บช่อ หรือปุ่มล้นบรรทัดตอนจอแคบ)
  watchStick() {
    const el = this._stickRef.current;
    if (el && !this._ro && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => {
        const h = Math.round(el.getBoundingClientRect().height);
        if (h && h !== this.state.stickH) this.setState({ stickH: h });
      });
      this._ro.observe(el);
    } else if (!el && this._ro) {
      this._ro.disconnect(); this._ro = null;
    }
    const el2 = this._libStickRef.current;
    if (el2 && !this._ro2 && typeof ResizeObserver !== 'undefined') {
      this._ro2 = new ResizeObserver(() => {
        const h = Math.round(el2.getBoundingClientRect().height);
        if (h && h !== this.state.libStickH) this.setState({ libStickH: h });
      });
      this._ro2.observe(el2);
    } else if (!el2 && this._ro2) {
      this._ro2.disconnect(); this._ro2 = null;
    }
    // วัดความสูงแบนเนอร์บนสุด — บนมือถือแบนเนอร์สูงไม่เท่าจอคอมพิวเตอร์ (69px) แถบตรึงทุกอันจะได้เกาะพอดี
    const el3 = this._bannerRef.current;
    if (el3 && !this._ro3 && typeof ResizeObserver !== 'undefined') {
      this._ro3 = new ResizeObserver(() => {
        const h = Math.round(el3.getBoundingClientRect().height);
        if (h && h !== this.state.bannerH) this.setState({ bannerH: h });
      });
      this._ro3.observe(el3);
    } else if (!el3 && this._ro3) {
      this._ro3.disconnect(); this._ro3 = null;
    }
  }
  componentDidUpdate() { this.watchStick(); }
  componentWillUnmount() {
    if (this._onUnload && typeof window !== 'undefined') window.removeEventListener('beforeunload', this._onUnload);
    clearInterval(this._proc); clearInterval(this._sec); clearTimeout(this._rvPush);
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._ro2) { this._ro2.disconnect(); this._ro2 = null; }
    if (this._ro3) { this._ro3.disconnect(); this._ro3 = null; }
    if (this._mq && this._onMq) {
      if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMq);
      else if (this._mq.removeListener) this._mq.removeListener(this._onMq);
    }
    this._flushReview(true);
  }
  async componentDidMount() {
    // ปิด/รีเฟรชหน้า → รีบ sync คำตรวจทานที่ค้างขึ้นคลาวด์ก่อน (กันหาย)
    this._onUnload = () => this._flushReview(true);
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', this._onUnload);
    // ตรวจว่าเปิดบนจอเล็ก (มือถือ) ไหม — ปรับ layout เฉพาะจอเล็ก จอกว้างเหมือนเดิมทุกอย่าง · อัปเดตเมื่อหมุน/ย่อจอ
    if (typeof window !== 'undefined' && window.matchMedia) {
      this._mq = window.matchMedia('(max-width: 760px)');
      this._onMq = (e) => this.setState({ isMobile: e.matches, menuOpen: false });
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._onMq);
      else if (this._mq.addListener) this._mq.addListener(this._onMq); // เผื่อเบราว์เซอร์เก่า
      if (this._mq.matches) this.setState({ isMobile: true });
    }
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
      const localReview = this.normBatches(this.state.review);
      // 🚨 ห้ามเอาคลาวด์ทับของในเครื่องดื้อๆ — ถ้า sync รอบก่อนยังไม่ถึงคลาวด์ (ปิดหน้า/รีเฟรชแทรกกลางคัน)
      // ช่อที่ยังอยู่แต่ในเครื่องจะหายถาวร (เคยเกิดจริง 19 ก.ค. 2569 ช่อ 29 คำหาย)
      // → รวมกันแบบรายช่อ: คลาวด์เป็นหลัก + เติมช่อที่มีเฉพาะในเครื่องกลับเข้าไป แล้วดันขึ้นคลาวด์
      const cloudBatches = new Set(cloudReview.map((r) => r.batch || 'b_legacy'));
      const localOnly = localReview.filter((r) => !cloudBatches.has(r.batch || 'b_legacy'));
      const merged = localOnly.length ? [...cloudReview, ...localOnly] : cloudReview;
      if (merged.length) {
        merged.sort((a, b) => (a.batchNo || 1) - (b.batchNo || 1));
        base2.review = merged;
        base2.activeBatch = this.activeBatchId(merged, '');
        base2.reviewNovel = data.reviewNovel || this.state.reviewNovel || 'ไม่ระบุเรื่อง';
        this.setState(base2, () => {
          try { localStorage.setItem(REVIEW_KEY, JSON.stringify(merged)); } catch (e) {}
          // มีช่อที่คลาวด์ยังไม่รู้จัก → รีบดันขึ้นทันที + บอกให้รู้ว่ากู้มาได้
          if (localOnly.length) {
            this.persistReviewNow();
            const n = new Set(localOnly.map((r) => r.batch)).size;
            this.flash('กู้คำที่ยังไม่ได้ขึ้นคลาวด์กลับมา ' + localOnly.length + ' คำ (' + n + ' ช่อ) แล้ว');
          }
        });
      } else {
        this.setState(base2);
      }
    } catch (e) {
      this.setState({ loading: false, loadError: e.message || 'โหลดข้อมูลไม่สำเร็จ' });
    }
  }

  persistUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(this.state.ui || {})); } catch (e) {} };
  // เซฟลงเบราว์เซอร์ (ทันที) + sync ขึ้นคลาวด์ (หน่วง 0.5 วิ กันยิงถี่ตอนพิมพ์)
  // now = true → ส่งขึ้นคลาวด์ทันที ไม่หน่วง (ใช้ตอนสร้างช่อใหม่ = ข้อมูลก้อนใหญ่ที่เสียหายไม่ได้)
  persistReview = (now) => {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(this.state.review)); } catch (e) {}
    this.scheduleReviewPush(now === true);
  };
  persistReviewNow = () => this.persistReview(true);
  scheduleReviewPush = (now) => {
    this._rvPending = { action: 'replace', novel: this.state.reviewNovel, items: this.state.review };
    clearTimeout(this._rvPush);
    if (now) { this._flushReview(false); return; }
    this._rvPush = setTimeout(() => this._flushReview(false), 500);
  };
  // ส่งขึ้นคลาวด์ · ล้มเหลวต้องไม่เงียบ — ลองซ้ำ 1 ครั้ง ถ้ายังไม่ได้ค่อยเตือนผู้ใช้
  // 🚨 keepalive และ sendBeacon จำกัดขนาดไว้ที่ 64KB ถ้าเกินจะล้มเหลวเงียบสนิท
  //    (เคยทำให้ช่อคำหายจริง 19 ก.ค. 2569 ตอนคำรอตรวจโตเกิน ~120 คำ)
  //    → ใช้ได้เฉพาะตอนปิดหน้าและข้อมูลเล็กพอเท่านั้น นอกนั้นยิงแบบปกติเสมอ
  _flushReview = (beacon, _retry) => {
    const payload = this._rvPending;
    if (!payload) return;
    this._rvPending = null; clearTimeout(this._rvPush);
    try {
      const body = JSON.stringify(payload);
      const small = body.length < 60000; // เผื่อขอบไว้ (ลิมิตจริง 64KB)
      if (beacon && small && navigator.sendBeacon) {
        navigator.sendBeacon('/api/review', new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: beacon && small })
        .then((r) => r.json().catch(() => ({})).then((d) => {
          if (!r.ok || d.error) throw new Error(d.error || ('HTTP ' + r.status));
        }))
        .catch(() => {
          if (!_retry) { this._rvPending = payload; setTimeout(() => this._flushReview(false, true), 1200); return; }
          this._rvPending = payload; // เก็บไว้ลองใหม่ตอนมีการแก้ครั้งถัดไป/ปิดหน้า
          this.flash('เก็บคำขึ้นคลาวด์ไม่สำเร็จ คำยังอยู่ในเครื่องนี้ ห้ามล้างข้อมูลเบราว์เซอร์');
        });
    } catch (e) {}
  };

  // ---------- หมวดย่อยหลายกิ่งต่อคำ ----------
  // เก็บเป็นอาร์เรย์ subpaths · subpath (เดี่ยว) = กิ่งหลัก = อันแรก (ให้โค้ด/ไฟล์ส่งออกเดิมใช้ได้)
  // รายชื่อกิ่งที่ "มีอยู่แล้ว" ทั้งหมด = โครงตั้งต้น + กิ่งที่ใช้จริงในคลัง → ไว้เช็คว่ากิ่งไหนเป็นของใหม่
  knownPaths() {
    if (this._knownPathsCache && this._knownPathsLib === this.state.library) return this._knownPathsCache;
    const set = new Set();
    const walk = (nodes, prefix) => (nodes || []).forEach((n) => {
      if (!n || !n.name) return;
      const p = prefix ? prefix + ' / ' + n.name : n.name;
      set.add(p);
      if (n.children && n.children.length) walk(n.children, p);
    });
    Object.keys(SUBTREE).forEach((cid) => walk(SUBTREE[cid], ''));
    this.state.library.forEach((w) => pathsOf(w).forEach((p) => set.add(p)));
    this._knownPathsLib = this.state.library;
    this._knownPathsCache = set;
    return set;
  }
  // แก้กิ่งของคำในหน้าตรวจทาน (เพิ่ม/ลบ) — เขียนทั้ง subpaths และ subpath หลักให้ตรงกันเสมอ
  setReviewPaths(id, paths) {
    const clean = [...new Set((paths || []).map((s) => String(s || '').trim()).filter(Boolean))];
    this.updateReview(id, { subpaths: clean, subpath: clean[0] || '' }, true);
  }
  addReviewPath(r) {
    const v = (this._newPath || '').trim();
    if (!v) return;
    this._newPath = '';
    this.setReviewPaths(r.id, [...pathsOf(r), v]);
    this.setState({ addPathFor: null });
  }

  // ---------- ช่อคำ (batch) ----------
  // ทุกครั้งที่กดจัดคำ = ช่อใหม่ ต่อท้ายของเดิม คำที่ยังไม่บันทึกจึงไม่มีทางถูกทับ
  // หน้าตรวจทานเปิดทีละช่อ (แท็บ) — 3 ช่อ ช่อละ 40 คำ ก็ไม่ต้องเรนเดอร์ 120 การ์ดพร้อมกัน
  // ป้ายชื่อ AI ของช่อ เดิมเก็บเป็น "ชื่อเจ้า · ชื่อรุ่น" (เช่น "GPT · GPT-4.1") ซึ่งซ้ำซ้อน
  // → โชว์เฉพาะชื่อรุ่น (ส่วนหลัง " · ") · ช่อที่ไม่มีรุ่น (เช่น "พื้นฐาน (ในเครื่อง)") โชว์ตามเดิม
  // วันที่แบบสั้น วัน/เดือน/ปี พ.ศ. 2 หลัก เช่น 20/7/69 (2569 → 69)
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
  flash(msg) { this.setState({ toast: msg }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: '' }), 2400); }
  get procText() { return ['กำลังตรวจและแก้คำสะกด…', 'กำลังแยกวลีย่อยที่น่าเก็บ…', 'กำลังจัดเข้าหมวดหมู่…'][this.state.procStep] || ''; }

  // ---------- review actions (transient) ----------
  // now = true → ส่งขึ้นคลาวด์ทันที (ใช้กับทุก "การกด" เช่น เปลี่ยนหมวด เพิ่ม/ลบกิ่ง)
  // ปล่อยหน่วง 0.5 วิ เฉพาะการ "พิมพ์" (ตัวคำ/ความหมาย) เท่านั้น กันยิงถี่ทุกตัวอักษร
  // เหตุผล: เบราว์เซอร์หน่วงตัวจับเวลาในแท็บที่ไม่ได้โฟกัส การกดแล้วรอ 0.5 วิ จึงค้างได้นาน
  persistCollapsed = () => { try { localStorage.setItem('wordbank:v1:collapsed', JSON.stringify(this.state.collapsed)); } catch (e) {} };
  eff(k, d) { const U = this.state.ui || {}; return U[k] != null ? U[k] : d; }

}
