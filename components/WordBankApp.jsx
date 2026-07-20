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
import { VERSION, thNum, aiModel, shortDate, pathsOf } from '@/components/helpers';
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
    // โทนป๊อป 3 แบบ: info=เขียว (แจ้งให้ทราบ) · warn=เหลืองอำพัน (ระบบแก้ให้แล้วแต่ควรรู้ไว้) · ไม่ระบุ=แดงกระพริบ (ล้มเหลว)
    const info = c.tone === 'info';
    const warn = c.tone === 'warn';
    const soft = info || warn; // 2 โทนนี้ไม่กระพริบ
    const cTone = { border: info ? '#cbdcb8' : warn ? '#ecd39a' : '#e8b4a8', bg: info ? '#e9efe1' : warn ? '#fbeecb' : '#fbe7e2', text: info ? '#4f6b3c' : warn ? '#8a5a1e' : '#9c3b2b' };
    return (
      <div style={{ position: 'fixed', inset: 0, background: isAlert ? 'rgba(48,30,26,.55)' : 'rgba(58,47,40,.42)', zIndex: 95, display: 'grid', placeItems: 'center', padding: '20px', animation: 'wbfade .18s ease' }}>
        <div style={{ background: 'var(--surface,#fffdf6)', border: '1px solid ' + (isAlert ? cTone.border : '#e0d0ac'), borderRadius: '16px', padding: isAlert ? '32px 30px 26px' : '26px 28px', width: 'min(' + (isAlert ? '460' : '410') + 'px,92vw)', boxShadow: '0 24px 64px rgba(58,47,40,.32)', textAlign: isAlert ? 'center' : 'left' }}>
          {isAlert && <div style={{ width: '66px', height: '66px', margin: '0 auto 16px', borderRadius: '50%', background: cTone.bg, display: 'grid', placeItems: 'center', fontSize: '34px', animation: soft ? 'none' : 'wbalert 1.1s ease-in-out infinite' }}>{c.icon || '⚠'}</div>}
          <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: isAlert ? '23px' : '20px', color: isAlert ? cTone.text : '#33291f', marginBottom: c.msg ? '10px' : '20px' }}>{c.title}</div>
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
  setBatch = (id) => this.setState((s) => ({ activeBatch: id, review: s.review.map((r) => r.selected ? { ...r, selected: false } : r) }));
  // ลบทั้งช่อ (ผ่านป๊อปยืนยัน) — ขอบเขตชัด ไม่ใช่ปุ่มทิ้งทั้งหมดแบบเดิม
  deleteBatch = (b) => {
    this.askConfirm({
      title: 'ลบทั้งช่อที่ ' + thNum(b.no), danger: true, okLabel: 'ลบทั้งช่อ',
      msg: 'นำคำในช่อนี้ทั้ง ' + b.count + ' คำ ออกจากรายการตรวจทาน ช่ออื่นไม่กระทบ',
      onOk: () => this.setState((s) => {
        const rest = s.review.filter((r) => (r.batch || 'b_legacy') !== b.id);
        return { review: rest, activeBatch: this.activeBatchId(rest, '') };
      }, () => { this.persistReviewNow(); this.flash('ลบช่อที่ ' + thNum(b.no) + ' แล้ว'); }),
    });
  };

  // คัดลอกข้อความลงคลิปบอร์ด — มีทางสำรองเผื่อเบราว์เซอร์ไม่อนุญาต clipboard API
  copyText = (text, okMsg) => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        this.flash(okMsg || 'คัดลอกแล้ว');
      } catch (e) { this.flash('คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วกด Ctrl+C'); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => this.flash(okMsg || 'คัดลอกแล้ว')).catch(fallback);
      } else fallback();
    } catch (e) { fallback(); }
  };

  // ---------- helpers ----------
  flash(msg) { this.setState({ toast: msg }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: '' }), 2400); }
  stop = (e) => { e.stopPropagation(); };
  // เปลี่ยนหน้า = เด้งขึ้นบนสุดเสมอ (ไม่ค้างตำแหน่งที่เลื่อนไว้จากหน้าก่อน)
  toTop = () => { try { window.scrollTo(0, 0); } catch (e) {} };
  onNav = (p) => () => { this.setState({ page: p, confirmId: null }, this.toTop); if (p === 'ailog') this.loadAiLogs(); };
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
  // สลับมุมมอง = เนื้อหาเปลี่ยนทั้งหน้า → เด้งขึ้นบนสุดเหมือนตอนเปลี่ยนหน้า
  setUiTop = (key, val) => () => { const ui = { ...this.state.ui, [key]: val }; this.setState({ ui }, () => { this.persistUi(); this.toTop(); }); };
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
    // ตั้งข้อมูลช่อไว้ล่วงหน้า ส่งไปกับคำขอ — เซิร์ฟเวอร์จะเขียนผลลงคลาวด์ทันทีที่ AI ตอบ
    // (ปิด/รีเฟรชหน้าระหว่างรอ ผลที่จ่ายเงินไปแล้วก็ไม่หาย) · รู้เลขช่อตั้งแต่แรกจึงยกเลิกได้ตรงช่อ
    const prevAll = this.normBatches(this.state.review);
    const bMeta = {
      id: 'b_' + Date.now().toString(36),
      no: prevAll.reduce((mx, r) => Math.max(mx, r.batchNo || 1), 0) + 1,
      at: Date.now(),
      ai: modelName || (base.label || provider), // เก็บชื่อรุ่นล้วน (ไม่ซ้ำชื่อเจ้า) · ไม่มีรุ่น (พื้นฐาน) เก็บชื่อเจ้า
      novel: this.state.novelInput.trim() || 'ไม่ระบุเรื่อง',
      startPos: prevAll.length,
    };
    this._pendingBatch = bMeta;
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
      const prevReview = this.normBatches(this.state.review);
      const bId = bMeta.id, bNo = bMeta.no, bAt = bMeta.at, bAi = bMeta.ai, bNovel = bMeta.novel;
      let n = 0;
      const fresh = (data.items || []).map((it) => {
        n++;
        const cat = it.category_id || nameToId[it.proposed_category] || 'c8';
        return { id: 'r_' + bAt.toString(36) + '_' + n + '_' + Math.random().toString(36).slice(2, 6), text: it.text, original: it.original, kind: it.kind || '', subpath: (it.subcategories && it.subcategories[0]) || it.subcategory || '', subpaths: Array.isArray(it.subcategories) ? it.subcategories : (it.subcategory ? [it.subcategory] : []), category: cat, proposedNew: !!it.proposed_category, meaning: it.meaning || '', reason: it.reason || '', selected: false, notes: it.notes || [], source: it.source || '', batch: bId, batchNo: bNo, batchAt: bAt, batchAi: bAi, novel: bNovel };
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
          this.toTop();
          this.persistReviewNow(); // ช่อใหม่ = ส่งขึ้นคลาวด์ทันที ห้ามรอ debounce (เคยหายเพราะรีเฟรชแทรกกลางคัน)
          // มีคำค้างจากช่อก่อน → แจ้งอย่างเดียวว่าตอนนี้มีกี่ช่อ ช่อละกี่คำ (ไม่ถามให้เลือก คำเก่าอยู่ครบเสมอ)
          if (prevReview.length) {
            const list = this.batchList(review);
            const lines = list.map((b) => '• ช่อที่ ' + thNum(b.no) + (b.novel ? ' · ' + b.novel : '') + '  —  ' + b.count + ' คำ');
            this.askConfirm({
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
            setTimeout(() => this.askConfirm({
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
      // เซิร์ฟเวอร์อาจเขียนช่อนี้ลงคลาวด์ไปแล้ว (มันเขียนทันทีที่ AI ตอบ) → สั่งลบช่อนั้นทิ้งให้ตรงกัน
      const b = this._pendingBatch;
      if (b && b.id) {
        fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removeBatch', batch: b.id }) }).catch(() => {});
      }
      this._pendingBatch = null;
      this.setState({ processing: false });
      this.flash('ยกเลิกการจัดคำแล้ว');
    } });
  };
  get procText() { return ['กำลังตรวจและแก้คำสะกด…', 'กำลังแยกวลีย่อยที่น่าเก็บ…', 'กำลังจัดเข้าหมวดหมู่…'][this.state.procStep] || ''; }

  // ---------- review actions (transient) ----------
  // now = true → ส่งขึ้นคลาวด์ทันที (ใช้กับทุก "การกด" เช่น เปลี่ยนหมวด เพิ่ม/ลบกิ่ง)
  // ปล่อยหน่วง 0.5 วิ เฉพาะการ "พิมพ์" (ตัวคำ/ความหมาย) เท่านั้น กันยิงถี่ทุกตัวอักษร
  // เหตุผล: เบราว์เซอร์หน่วงตัวจับเวลาในแท็บที่ไม่ได้โฟกัส การกดแล้วรอ 0.5 วิ จึงค้างได้นาน
  updateReview(id, patch, now) {
    this.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, ...patch } : r) }), now ? this.persistReviewNow : this.persistReview);
  }
  toggleSel(id) { this.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, selected: !r.selected } : r) })); }
  // เลือกทั้งหมด = เฉพาะคำในช่อที่เปิดอยู่
  selectAll = (e) => { const v = e.target.checked; const bid = this.activeBatchId(); this.setState((s) => ({ review: s.review.map((r) => (r.batch || 'b_legacy') === bid ? { ...r, selected: v } : r) })); };
  removeReview(id) { this.askConfirm({ title: 'ลบคำนี้', msg: 'นำคำนี้ออกจากรายการตรวจทาน', okLabel: 'ลบ', danger: true, onOk: () => this._removeReview(id) }); }
  _removeReview(id) { this.setState((s) => ({ review: s.review.filter((r) => r.id !== id) }), this.persistReviewNow); }
  bulkMove = (e) => { const cid = e.target.value; if (!cid) return; this.setState((s) => ({ review: s.review.map((r) => r.selected ? { ...r, category: cid, proposedNew: false, selected: false } : r) }), this.persistReviewNow); e.target.value = ''; this.flash('ย้ายหมวดแล้ว'); };
  bulkDelete = () => { const n = this.state.review.filter((r) => r.selected).length; if (!n) return; this.askConfirm({ title: 'ลบที่เลือก', msg: 'นำคำที่เลือก ' + n + ' คำ ออกจากรายการตรวจทาน', okLabel: 'ลบ', danger: true, onOk: () => this.setState((s) => ({ review: s.review.filter((r) => !r.selected) }), this.persistReviewNow) }); };
  clearSel = () => this.setState((s) => ({ review: s.review.map((r) => ({ ...r, selected: false })) }));
  discard = () => { if (!this.state.review.length) return; this.askConfirm({ title: 'ทิ้งทั้งหมด', msg: 'ล้างรายการตรวจทานทั้งหมด คำที่ยังไม่บันทึกจะหายไป', okLabel: 'ทิ้งทั้งหมด', danger: true, onOk: () => { this.setState({ review: [], page: 'add' }, this.persistReview); this.flash('ล้างรายการตรวจทานแล้ว'); } }); };
  // ลบคำที่มีในคลังอยู่แล้ว (ซ้ำ) ออกจากหน้าตรวจทานรวดเดียว
  removeDuplicates = (ids) => {
    const lib = new Set(this.state.library.map((w) => (w.text || '').trim()));
    const idSet = ids && ids.length ? new Set(ids) : null; // ถ้าส่ง ids มา = ลบเฉพาะที่แสดงในมุมมองนั้น
    const dups = this.state.review.filter((r) => lib.has((r.text || '').trim()) && (!idSet || idSet.has(r.id)));
    if (!dups.length) { this.flash('ไม่มีคำซ้ำกับคลัง'); return; }
    const dupIds = new Set(dups.map((r) => r.id));
    this.askConfirm({ title: 'ลบคำซ้ำ', msg: 'ลบคำที่มีในคลังแล้ว ' + dups.length + ' คำ ออกจากรายการตรวจทาน', okLabel: 'ลบคำซ้ำ', danger: true, onOk: () => { this.setState((s) => ({ review: s.review.filter((r) => !dupIds.has(r.id)) }), this.persistReviewNow); this.flash('ลบคำซ้ำออก ' + dups.length + ' คำ'); } });
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
      'ช่อที่ ' + thNum(bMeta.no),
      'เรื่อง: ' + (bMeta.novel || S.reviewNovel || '-'),
      'AI: ' + (aiModel(bMeta.ai) || S.procProvider || '-'),
      'วันที่: ' + date,
      'จำนวน: ' + items.length + ' คำ (สกัดจากประโยค ' + extracted + ')',
      '────────────────────────────',
    ];
    items.forEach((r, i) => {
      let l = (i + 1) + '. ' + r.text + '  [' + (r.kind || '-') + ']  หมวด: ' + (catName[r.category] || r.category || '-');
      const rp = pathsOf(r); if (rp.length) l += '  หมวดย่อย: ' + rp.join(' | ');
      if ((r.original || '').trim() && r.original !== r.text) l += '  (ต้นฉบับ: ' + r.original + ')';
      if ((r.meaning || '').trim()) l += '  ความหมาย: ' + r.meaning;
      if ((r.source || '').trim()) l += '  ✂ จาก: ' + r.source;
      lines.push(l);
    });
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tag = (aiModel(bMeta.ai) || S.procModel || S.procProvider || 'ai').replace(/[^\wก-๙.-]/g, '');
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
    this.askConfirm({ title: 'บันทึกช่อที่ ' + thNum(b.no) + ' เข้าคลัง', msg: 'บันทึกคำในช่อนี้ ' + items.length + ' คำ เข้าคลัง (คำที่ซ้ำกับคลังจะถูกข้ามให้อัตโนมัติ)\nช่ออื่นยังอยู่ครบ', okLabel: 'บันทึก', danger: false, onOk: this._save });
  };
  _save = async () => {
    const { categories } = this.state;
    const bid = this.activeBatchId();
    const review = this.batchItems(null, bid);
    if (!review.length) return;
    const reviewNovel = (review[0] && review[0].novel) || this.state.reviewNovel;
    const newCategories = categories.filter((c) => c.proposed).map((c) => ({ id: c.id, name_th: c.n, color: c.c, glyph: c.k }));
    const allWords = review.map((r) => ({ text: r.text.trim(), original_text: r.original || null, meaning: (r.meaning || '').trim(), category_id: r.category, kind: r.kind || null, subpath: pathsOf(r)[0] || null, subpaths: pathsOf(r) })).filter((w) => w.text);
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
      }, () => { this.toTop(); this.persistReview(); });
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
  // ตัวกรองนิยายแบบเลือกได้หลายเรื่อง (filterNovels = array · ว่าง = ดูทุกเรื่อง) — เมนูติ๊กหลายอันได้
  toggleNovelMenu = () => this.setState((s) => ({ novelMenuOpen: !s.novelMenuOpen }));
  toggleNovel = (n) => () => this.setState((s) => { const cur = s.filterNovels || []; return { filterNovels: cur.includes(n) ? cur.filter((x) => x !== n) : cur.concat([n]) }; });
  clearNovels = () => this.setState({ filterNovels: [], novelMenuOpen: false });
  toggleFontMenu = () => this.setState((s) => ({ fontMenuOpen: !s.fontMenuOpen }));
  onSort = (e) => this.setState({ sort: e.target.value });
  setLibView = (v) => () => this.setState({ libView: v }, this.toTop);
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
    const paths = pathsOf(ed);
    const patch = { text: ed.text.trim(), meaning: (ed.meaning || '').trim(), category: ed.category, novel: ed.novel, subpaths: paths, subpath: paths[0] || '' };
    const prev = this.state.library;
    this.setState((s) => ({ library: s.library.map((w) => w.id === ed.id ? { ...w, ...patch } : w), modal: null, editing: null }));
    try {
      const res = await fetch('/api/words/' + ed.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: patch.text, meaning: patch.meaning, category_id: patch.category, novel: patch.novel, subpaths: paths }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.flash('บันทึกการแก้ไขแล้ว');
    } catch (e) { this.setState({ library: prev }); this.flash('บันทึกไม่สำเร็จ'); }
  };
  cancelEdit = () => this.setState({ modal: null, editing: null, editPathDraft: '' });
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
    const navItems = [['add', 'เพิ่มคำ', 0], ['review', 'ตรวจทาน', S.review.length], ['library', 'คลังคำ', S.library.length], ['ailog', 'ประวัติ AI', 0], ['aitest', 'ผลทดสอบ AI', 0], ['prompts', 'ประวัติคำสั่ง', 0], ['about', 'เกี่ยวกับ', 0]].map(([id, label, badgeN]) => ({ id, label, active: S.page === id, badgeN }));
    const badgeStyle = (active) => ({ marginLeft: '2px', fontSize: '12px', fontWeight: 700, minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', display: 'inline-grid', placeItems: 'center', background: active ? 'rgba(255,255,255,.22)' : '#e2d3b0', color: active ? '#fbf3e2' : '#8a7159' });

    const isAdd = S.page === 'add', isReview = S.page === 'review', isLibrary = S.page === 'library', isAiLog = S.page === 'ailog', isAbout = S.page === 'about';
    const isAiTest = S.page === 'aitest', isPrompts = S.page === 'prompts';

    return (
      <div style={rootStyle}>
        <datalist id="wb-novels">{S.novels.map((nv) => <option key={nv} value={nv} />)}</datalist>
        {/* รายชื่อกิ่งหมวดย่อยที่มีอยู่ — ช่วยเติมคำตอนพิมพ์เพิ่มกิ่งเอง */}
        <datalist id="wb-paths">{[...this.knownPaths()].slice(0, 800).map((p) => <option key={p} value={p} />)}</datalist>

        {/* ปุ่มตั้งค่าลอยมุมขวาบน — เฉพาะจอคอมพิวเตอร์ (บนมือถือย้ายเข้าเมนู ☰ กันทับปุ่มเมนู) */}
        {!S.isMobile && (
          <button onClick={this.openSettings} title="ตั้งค่าการแสดงผล" style={{ position: 'fixed', top: '16px', right: '18px', zIndex: 55, padding: '9px 18px', borderRadius: '20px', border: '1px solid #d8c7a2', background: 'var(--surface,#fffdf6)', color: 'var(--primary,#6f4e37)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,90,50,.16)' }}>ตั้งค่า</button>
        )}

        {/* ===== แบนเนอร์จอคอมพิวเตอร์ (แถบแท็บ 7 หน้า) — เหมือนเดิมทุกอย่าง ===== */}
        {navStyle === 'tabs' && !S.isMobile && (
          <header ref={this._bannerRef} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '13px clamp(20px,3vw,40px)', background: 'linear-gradient(180deg, rgba(255,255,255,.4), var(--panel,#f7f0e0))', borderBottom: '1px solid ' + rgba(primary, 0.16), boxShadow: '0 3px 16px rgba(120,90,50,.07)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 20 }}>
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
            <span className="wb-quote" style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '17px', color: '#b3a488', whiteSpace: 'nowrap', paddingRight: '112px' }}>“เก็บคำงาม ไว้แต่งเรื่องของเราเอง”</span>
          </header>
        )}

        {/* ===== แบนเนอร์มือถือ — โลโก้ + ปุ่ม ☰ (แตะแล้วเมนูเด้งลงมา) ===== */}
        {navStyle === 'tabs' && S.isMobile && (
          <>
            <header ref={this._bannerRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px clamp(14px,4vw,20px)', background: 'linear-gradient(180deg, rgba(255,255,255,.55), var(--panel,#f7f0e0))', borderBottom: '1px solid ' + rgba(primary, 0.16), boxShadow: '0 3px 16px rgba(120,90,50,.07)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 40 }}>
              <span style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: '27px', color: 'var(--accent,#9c3b2b)', lineHeight: 1 }}>คลังคำ</span>
              <span style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '16px', color: '#b09a72' }}>Word&nbsp;Bank</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => this.setState((s) => ({ menuOpen: !s.menuOpen }))} title="เมนู" aria-label="เมนู" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '11px', border: '1px solid #d8c7a2', background: S.menuOpen ? 'var(--primary,#6f4e37)' : 'var(--surface,#fffdf6)', color: S.menuOpen ? '#fbf3e2' : 'var(--primary,#6f4e37)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>{S.menuOpen ? '✕' : '☰'}</button>
            </header>
            {S.menuOpen && (
              <div onClick={() => this.setState({ menuOpen: false })} style={{ position: 'fixed', inset: 0, top: S.bannerH + 'px', background: 'rgba(58,47,40,.32)', zIndex: 35, animation: 'wbfade .16s ease' }}>
                <nav onClick={this.stop} style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 12px 14px', background: 'var(--panel,#f7f0e0)', borderBottom: '1px solid #e0d0ac', boxShadow: '0 12px 28px rgba(58,47,40,.22)', animation: 'wbdrop .2s ease' }}>
                  {navItems.map((n) => (
                    <button key={n.id} onClick={() => { this.setState({ menuOpen: false }); this.onNav(n.id)(); }} style={navBtn(n.active, true)}>
                      <span style={{ flex: 1 }}>{n.label}</span>{n.badgeN > 0 && <span style={badgeStyle(n.active)}>{n.badgeN}</span>}
                    </button>
                  ))}
                  <div style={{ height: '1px', background: '#e0d0ac', margin: '5px 4px' }} />
                  <button onClick={() => { this.setState({ menuOpen: false }); this.openSettings(); }} style={navBtn(false, true)}>
                    <span style={{ flex: 1 }}>⚙ ตั้งค่าการแสดงผล</span>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}

        {/* ลบความสูงแบนเนอร์ออกจากพื้นที่เนื้อหา ไม่งั้นหน้าสูงเกินจอ 69px เสมอ = เลื่อนได้ทั้งที่ข้อมูลไม่เต็มจอ */}
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - ' + S.bannerH + 'px)' }}>
          <main style={{ flex: 1, minWidth: 0, padding: '40px clamp(16px,2.5vw,40px) 72px' }}>
            {isAdd && renderAdd(this)}
            {isReview && renderReview(this, getCat, monoMode, spell, effLayout)}
            {isLibrary && renderLibrary(this, getCat, monoMode, accent)}
            {isAiLog && renderAiLog(this)}
            {isAiTest && renderAiTest(this)}
            {isPrompts && renderPromptLog(this)}
            {isAbout && renderAbout(this)}
          </main>
        </div>

        {/* กรอบล่างสุด (footer) — โผล่ทุกหน้า ทั้งมือถือและจอคอม · ธีมกระดาษวรรณกรรม จัดกลาง */}
        <footer style={{ borderTop: '1px solid #e0d0ac', background: 'var(--panel,#f7f0e0)', padding: '30px clamp(16px,2.5vw,40px)', textAlign: 'center' }}>
          <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '24px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.15 }}>คลังคำ <span style={{ fontFamily: "var(--font-trirong),serif", fontSize: '15px', color: '#a89a86', fontStyle: 'italic' }}>Word Bank</span></div>
          <div style={{ fontSize: '13.5px', color: '#8a7d6d', margin: '8px 0 12px' }}>เก็บคำงาม ไว้แต่งเรื่องของเราเอง</div>
          <div style={{ fontSize: '12px', color: '#b0a184' }}>© ๒๕๖๙ · คลังคำ (Word Bank) · สร้างด้วยความรักในภาษาไทย 🤍</div>
        </footer>

        {S.processing && renderProcessing(this, accent)}
        {S.modal === 'edit' && renderEditModal(this)}
        {S.modal === 'cats' && renderCatModal(this, monoMode)}
        {S.modal === 'settings' && renderSettings(this, monoMode, navStyle, spell, effLayout, accent, primary, paper)}
        {this.renderConfirm()}
        {this.renderScrollButtons()}
        {S.toast && (
          <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#3a2f28', color: '#fbf3e2', padding: '13px 26px', borderRadius: '24px', fontSize: '15px', zIndex: 80, boxShadow: '0 8px 24px rgba(58,47,40,.35)', animation: 'wbtoast .28s ease' }}>{S.toast}</div>
        )}
      </div>
    );
  }





  // ============ ปุ่มขึ้นบนสุด / ลงล่างสุด ============
  // ลอยมุมขวาล่างทุกหน้า · โผล่เฉพาะตอนหน้ายาวพอให้เลื่อนจริง (กันปุ่มไร้ประโยชน์เกะกะ)
  toBottom = () => { try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } catch (e) {} };
  toTopSmooth = () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} };
  renderScrollButtons() {
    if (typeof window === 'undefined') return null;
    const canScroll = (document.documentElement.scrollHeight - window.innerHeight) > 300;
    if (!canScroll) return null;
    const btn = {
      width: '42px', height: '42px', borderRadius: '50%', border: '1px solid #ddcba4',
      background: 'var(--surface,#fffdf6)', color: 'var(--primary,#6f4e37)', fontSize: '17px',
      cursor: 'pointer', boxShadow: '0 3px 12px rgba(120,90,50,.22)', display: 'grid', placeItems: 'center',
      lineHeight: 1, padding: 0,
    };
    return (
      <div style={{ position: 'fixed', right: '18px', bottom: '22px', zIndex: 60, display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <button onClick={this.toTopSmooth} title="ขึ้นบนสุด" style={btn}>▲</button>
        <button onClick={this.toBottom} title="ลงล่างสุด" style={btn}>▼</button>
      </div>
    );
  }

  // ============ ตัวช่วยกลางของ 2 หน้ารายงาน (ผลทดสอบ AI + ประวัติคำสั่ง) ============
  // ใช้ภาษาภาพเดียวกับหน้าเกี่ยวกับ: การ์ดกระดาษ + เลขไทยในวงกลมหมึก + หัวข้อลายมือ
  // ชุดคำทดสอบมาตรฐาน เวอร์ชัน ๑ — 31 บรรทัด ห้ามแก้โดยพลการ
  // ถ้าจะเปลี่ยนชุดคำ = ขึ้นเวอร์ชัน ๒ และเก็บผลของเวอร์ชันเดิมไว้เทียบ (ผลข้ามเวอร์ชันเทียบตรง ๆ ไม่ได้)
  // คำในชุดนี้เลือกมาให้ครอบคลุมกรณีทดสอบ: ช่องเติมคำ 6 จุด · ตัวอักษรแทนชื่อตัวละคร · คู่ประโยคยาวกับคำเดี่ยวที่ซ้อนกัน 3 คู่ · คำทับศัพท์ · สำนวน · คำจัดหมวดยาก


  rpCard = (extra) => ({ background: 'var(--surface,#fffdf6)', border: '1px solid ' + RP.line, borderRadius: '14px', padding: '24px 26px 26px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(120,90,50,.06)', ...extra });

  rpHead = (num, title, sub) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <span style={{ width: '30px', height: '30px', flex: '0 0 30px', borderRadius: '50%', background: RP.ink, color: '#fbf3e2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontFamily: RP.serif }}>{num}</span>
      <h3 style={{ margin: 0, fontSize: '21px', fontFamily: RP.hand, color: RP.ink, fontWeight: 400 }}>{title}</h3>
      {sub && <span style={{ fontSize: '13px', color: RP.faint }}>{sub}</span>}
    </div>
  );

  // หัวเรื่องใหญ่ของหน้า — ใช้ทั้ง 2 หน้าให้หน้าตาเป็นชุดเดียวกัน
  rpTitle = (glyph, title, sub) => (
    <div style={{ textAlign: 'center', marginBottom: '26px' }}>
      <div style={{ fontSize: '34px', marginBottom: '2px' }}>{glyph}</div>
      <h2 style={{ margin: '0 0 6px', fontSize: '30px', fontFamily: RP.hand, color: RP.ink, fontWeight: 400 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '14px', color: RP.faint }}>{sub}</p>
    </div>
  );

  // กล่องข้อความยาว (ชุดคำทดสอบ / ตัวคำสั่ง) พร้อมปุ่มคัดลอก
  rpTextBox = (text, maxH) => (
    <pre style={{ margin: 0, padding: '13px 15px', background: '#fbf7ec', border: '1px solid ' + RP.line, borderRadius: '10px', fontSize: '12.5px', lineHeight: 1.75, color: RP.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: maxH || '300px', overflow: 'auto', fontFamily: 'var(--font-sarabun),sans-serif' }}>{text}</pre>
  );

  copyText = (text, msg) => {
    try { navigator.clipboard.writeText(text); this.flash(msg || 'คัดลอกแล้ว'); }
    catch { this.flash('คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วกด Ctrl+C'); }
  };

  rpCopyBtn = (text, label, msg) => (
    <button onClick={() => this.copyText(text, msg)} style={{ padding: '5px 13px', border: '1px solid ' + RP.line, borderRadius: '20px', background: '#fbf7ec', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer' }}>📋 {label || 'คัดลอก'}</button>
  );

  // แถบสัดส่วน 3 สี (ตรงกันหมด / กิ่งต่าง / หมวดต่าง) — เห็นภาพรวมก่อนอ่านตาราง
  rpBar = (t) => {
    const total = t.total - (t.single || 0) || 1;
    const seg = [
      { n: t.full, c: '#7d9a5c', label: 'ตรงกันหมด' },
      { n: t.branch, c: '#d9a63e', label: 'หมวดตรง กิ่งต่าง' },
      { n: t.cat, c: '#c1614c', label: 'หมวดต่างกัน' },
    ];
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', height: '15px', borderRadius: '20px', overflow: 'hidden', border: '1px solid ' + RP.line }}>
          {seg.map((s) => s.n > 0 && <div key={s.label} style={{ width: (s.n / total * 100) + '%', background: s.c }} title={s.label + ' ' + s.n + ' คำ'} />)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '9px', fontSize: '13px' }}>
          {seg.map((s) => (
            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6f6252' }}>
              <i style={{ width: '11px', height: '11px', borderRadius: '3px', background: s.c, display: 'inline-block' }} />
              {s.label} <b style={{ color: RP.ink }}>{s.n}</b> คำ <span style={{ color: RP.faint }}>({Math.round(s.n / total * 100)}%)</span>
            </span>
          ))}
          {t.single > 0 && <span style={{ color: RP.faint, fontSize: '12.5px' }}>· อีก {t.single} คำมีโมเดลเดียวที่สกัดออกมา จึงเทียบกันไม่ได้</span>}
        </div>
      </div>
    );
  };

  // รายงานการทดลอง 2 มุม: (๑) สกัดได้แค่ไหน (๒) จัดกลุ่มตรงกันไหม
  // ข้อมูลทั้งหมดมาจาก lib/aitest.js ซึ่งสร้างด้วย scripts/gen_aitest.mjs (ดึงจากช่อคำจริงใน Supabase)

  // ทำไมต้องมี: คำสั่งมีผลต่อผลลัพธ์มากกว่าตัวโมเดล ถ้าไม่เก็บสำเนา ผลทดสอบเก่าจะอ้างอิงกลับไม่ได้

  // หน้าแนะนำตัวเว็บ — โทนกระดาษวรรณกรรม ใช้ฟอนต์ลายมือให้มากที่สุดเท่าที่ยังอ่านง่าย




}
