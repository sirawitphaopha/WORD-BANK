'use client';
// คลังคำ (Word Bank) — แอปหลัก พอร์ตจากต้นแบบ WordBank.dc.html
// เก็บข้อมูลจริงบน Supabase ผ่าน API (แทน localStorage ในต้นแบบ)
// การตั้งค่าแสดงผล (ui) ยังเก็บใน localStorage
import React from 'react';
import { rgba, mix, shade, badge, pill, dot } from '@/lib/colors';
import { SUBTREE } from '@/lib/subtree';
import { CATMETA } from '@/lib/catmeta';

export const VERSION = '0.1.0.0';
const UI_KEY = 'wordbank:v1:ui';
const REVIEW_KEY = 'wordbank:v1:review';
const PAL = ['#8f6b4a', '#5f7f92', '#a86a79', '#6f8a56', '#7c6a99', '#3f7d6c'];

export default class WordBankApp extends React.Component {
  state = {
    page: 'add', novelInput: '', addText: '',
    library: [], novels: [], categories: [],
    review: [], reviewNovel: '',
    processing: false, procStep: 0,
    q: '', filterCat: 'all', filterNovel: 'all', sort: 'recent', libView: 'cards',
    confirmId: null, toast: '',
    modal: null, ui: {}, exactFilter: '', dupOnly: false, editing: null,
    mergeFrom: '', mergeTo: '', newCatName: '',
    loading: true, loadError: '',
    collapsed: {}, // สถานะยุบกลุ่มในหน้าคลังคำ (key = anchor id)
  };

  // ---------- lifecycle ----------
  async componentDidMount() {
    let ui = {}, review = [], collapsed = {}, hadCollapsed = false;
    try {
      const su = localStorage.getItem(UI_KEY);
      if (su) { const p = JSON.parse(su); if (p && typeof p === 'object') ui = p; }
      const rv = localStorage.getItem(REVIEW_KEY);
      if (rv) { const r = JSON.parse(rv); if (Array.isArray(r) && r.length) review = r; }
      const cl = localStorage.getItem('wordbank:v1:collapsed');
      if (cl) { const p = JSON.parse(cl); if (p && typeof p === 'object') { collapsed = p; hadCollapsed = true; } }
    } catch (e) {}
    this.setState({ ui, review, collapsed });
    try {
      const res = await fetch('/api/bootstrap');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const cats = data.categories || [];
      // ครั้งแรก (ยังไม่เคยตั้งค่ายุบ) → ยุบทุกหมวดไว้ก่อน กันหน้ายาว/หน่วงตอนโหลดคำ 679 ใบ
      let col = this.state.collapsed;
      if (!hadCollapsed) { col = {}; cats.forEach((c) => { col['g-' + c.id] = 1; }); }
      this.setState({ categories: cats, novels: data.novels || [], library: data.words || [], loading: false, collapsed: col });
    } catch (e) {
      this.setState({ loading: false, loadError: e.message || 'โหลดข้อมูลไม่สำเร็จ' });
    }
  }

  persistUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(this.state.ui || {})); } catch (e) {} };
  persistReview = () => { try { localStorage.setItem(REVIEW_KEY, JSON.stringify(this.state.review)); } catch (e) {} };

  // ---------- helpers ----------
  flash(msg) { this.setState({ toast: msg }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: '' }), 2400); }
  stop = (e) => { e.stopPropagation(); };
  onNav = (p) => () => this.setState({ page: p, confirmId: null });
  setUi = (key, val) => () => { const ui = { ...this.state.ui, [key]: val }; this.setState({ ui }, this.persistUi); };
  resetSettings = () => this.setState({ ui: {} }, this.persistUi);
  openSettings = () => this.setState({ modal: 'settings' });
  closeSettings = () => this.setState({ modal: null });

  sample() {
    return 'เงาดำทะมึนกับความมืดสลัว, แสงไฟริบหรี่\nเขาเดินอย่างระมัดระวังทุกฝีก้าว ก้มหน้างุด แล้วเหลียวไปมองข้างหลังด้วยดวงตาเบิกกว้าง\nระแวกบ้านนี้เคยมีคนหายสายสูญไปหลายคน\nเสียงพื้นไม้ลั่นเอี๊ยดอ๊าด\nรู้สึกเสียวสันหลังวาบ, ขนลุกเกรียว\nเขารีบสตาร์ทรถแล้วบึ่งออกไป\nช็อคสุดขีด\nกลิ่นอับชื้นคละคลุ้งไปทั่วห้อง';
  }

  // ---------- process (Add → Review) ----------
  process = async () => {
    const text = this.state.addText.trim();
    if (!text) { this.flash('ยังไม่มีข้อความให้จัด'); return; }
    this.setState({ processing: true, procStep: 0 });
    let i = 0; clearInterval(this._proc);
    this._proc = setInterval(() => { i++; if (i < 3) this.setState({ procStep: i }); }, 560);
    const started = Date.now();
    try {
      const res = await fetch('/api/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, categories: this.state.categories.map((c) => ({ id: c.id, name_th: c.n })) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const proposedCats = [], nameToId = {};
      (data.proposed_categories || []).forEach((pc, idx) => {
        const id = 'c' + Date.now().toString(36) + idx;
        proposedCats.push({ id, n: pc.name_th, en: '', c: PAL[idx % PAL.length], k: '✦', proposed: true });
        nameToId[pc.name_th] = id;
      });
      let n = 0;
      const review = (data.items || []).map((it) => {
        n++;
        const cat = it.category_id || nameToId[it.proposed_category] || 'c8';
        return { id: 'r_' + n + '_' + Math.random().toString(36).slice(2, 6), text: it.text, original: it.original, category: cat, proposedNew: !!it.proposed_category, meaning: '', selected: false, notes: it.notes || [] };
      });
      const categories = proposedCats.length ? [...this.state.categories, ...proposedCats] : this.state.categories;
      const wait = Math.max(0, 1780 - (Date.now() - started));
      setTimeout(() => {
        clearInterval(this._proc);
        this.setState({
          categories, review, processing: false, page: 'review', addText: '',
          reviewNovel: this.state.novelInput.trim() || 'ไม่ระบุเรื่อง',
        }, this.persistReview);
      }, wait);
    } catch (e) {
      clearInterval(this._proc);
      this.setState({ processing: false });
      this.flash('จัดคำไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };
  get procText() { return ['กำลังตรวจและแก้คำสะกด…', 'กำลังแยกวลีย่อยที่น่าเก็บ…', 'กำลังจัดเข้าหมวดหมู่…'][this.state.procStep] || ''; }

  // ---------- review actions (transient) ----------
  updateReview(id, patch) { this.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, ...patch } : r) }), this.persistReview); }
  toggleSel(id) { this.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, selected: !r.selected } : r) })); }
  selectAll = (e) => { const v = e.target.checked; this.setState((s) => ({ review: s.review.map((r) => ({ ...r, selected: v })) })); };
  removeReview(id) { this.setState((s) => ({ review: s.review.filter((r) => r.id !== id) }), this.persistReview); }
  bulkMove = (e) => { const cid = e.target.value; if (!cid) return; this.setState((s) => ({ review: s.review.map((r) => r.selected ? { ...r, category: cid, proposedNew: false, selected: false } : r) }), this.persistReview); e.target.value = ''; this.flash('ย้ายหมวดแล้ว'); };
  bulkDelete = () => { this.setState((s) => ({ review: s.review.filter((r) => !r.selected) }), this.persistReview); };
  clearSel = () => this.setState((s) => ({ review: s.review.map((r) => ({ ...r, selected: false })) }));
  discard = () => { if (!this.state.review.length) return; this.setState({ review: [], page: 'add' }, this.persistReview); this.flash('ล้างรายการตรวจทานแล้ว'); };

  // ---------- save (Review → Library) ----------
  save = async () => {
    const { review, reviewNovel, categories } = this.state;
    if (!review.length) return;
    const newCategories = categories.filter((c) => c.proposed).map((c) => ({ id: c.id, name_th: c.n, color: c.c, glyph: c.k }));
    const words = review.map((r) => ({ text: r.text.trim(), original_text: r.original || null, meaning: (r.meaning || '').trim(), category_id: r.category })).filter((w) => w.text);
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
      this.setState({
        library: [...saved, ...this.state.library],
        categories: this.state.categories.map((c) => c.proposed ? { ...c, proposed: false } : c),
        novels: nv, review: [], page: 'library',
      }, this.persistReview);
      this.flash('บันทึกเข้าคลังแล้ว ' + saved.length + ' คำ');
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
    const navStyle = this.eff('navStyle', 'sidebar');
    const spell = this.eff('spellDisplay', 'highlight');
    const effLayout = this.eff('reviewLayout', 'cards');
    const rootStyle = {
      minHeight: '100vh', color: '#3a2f28',
      background: 'linear-gradient(' + mix(paper, '#ffffff', 0.32) + ',' + paper + ')',
      fontFamily: "'Sarabun',system-ui,sans-serif", fontSize: '16px', lineHeight: '1.55',
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
              <div style={{ fontFamily: "'Charmonman',cursive", fontSize: '26px', color: accent }}>คลังคำ</div>
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
              <div style={{ fontFamily: "'Trirong',serif", fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>เปิดคลังไม่สำเร็จ</div>
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
        ? { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', border: 'none', borderRadius: '9px', fontSize: '15.5px', cursor: 'pointer', textAlign: 'left', fontFamily: "'Sarabun',sans-serif" }
        : { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', border: 'none', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: "'Sarabun',sans-serif", transition: 'all .15s' };
      if (active) return { ...base, background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, boxShadow: side ? 'none' : '0 3px 10px rgba(111,78,55,.3)' };
      return { ...base, background: side ? 'transparent' : 'rgba(255,255,255,.35)', color: '#7a6a52' };
    };
    const navItems = [['add', 'เพิ่มคำ', 0], ['review', 'ตรวจทาน', S.review.length], ['library', 'คลังคำ', S.library.length]].map(([id, label, badgeN]) => ({ id, label, active: S.page === id, badgeN }));
    const badgeStyle = (active) => ({ marginLeft: '2px', fontSize: '12px', fontWeight: 700, minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', display: 'inline-grid', placeItems: 'center', background: active ? 'rgba(255,255,255,.22)' : '#e2d3b0', color: active ? '#fbf3e2' : '#8a7159' });

    const isAdd = S.page === 'add', isReview = S.page === 'review', isLibrary = S.page === 'library';

    return (
      <div style={rootStyle}>
        <datalist id="wb-novels">{S.novels.map((nv) => <option key={nv} value={nv} />)}</datalist>

        <button onClick={this.openSettings} title="ตั้งค่าการแสดงผล" style={{ position: 'fixed', top: '16px', right: '18px', zIndex: 55, padding: '9px 18px', borderRadius: '20px', border: '1px solid #d8c7a2', background: 'var(--surface,#fffdf6)', color: 'var(--primary,#6f4e37)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,90,50,.16)' }}>ตั้งค่า</button>

        {navStyle === 'tabs' && (
          <header style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '13px clamp(20px,3vw,40px)', background: 'linear-gradient(180deg, rgba(255,255,255,.4), var(--panel,#f7f0e0))', borderBottom: '1px solid ' + rgba(primary, 0.16), boxShadow: '0 3px 16px rgba(120,90,50,.07)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}>
              <span style={{ fontFamily: "'Charmonman',cursive", fontWeight: 700, fontSize: '34px', color: 'var(--accent,#9c3b2b)', lineHeight: 1, marginTop: '8px' }}>คลังคำ</span>
              <span style={{ fontFamily: "'Charmonman',cursive", fontSize: '20px', color: '#b09a72', fontWeight: 400 }}>Word&nbsp;Bank</span>
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
            <span style={{ fontFamily: "'Charmonman',cursive", fontSize: '17px', color: '#b3a488', whiteSpace: 'nowrap', paddingRight: '112px' }}>“เก็บคำงาม ไว้แต่งเรื่องของเราเอง”</span>
          </header>
        )}

        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh' }}>
          {navStyle === 'sidebar' && (
            <aside style={{ width: '236px', flex: 'none', padding: '30px 20px', background: 'var(--panel,#f7f0e0)', borderRight: '1px solid #ddcba4', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh' }}>
              <div style={{ padding: '0 8px 6px' }}>
                <div style={{ fontFamily: "'Charmonman',cursive", fontWeight: 700, fontSize: '36px', color: 'var(--accent,#9c3b2b)', lineHeight: 1 }}>คลังคำ</div>
                <div style={{ fontSize: '11px', color: '#8a7d6d', letterSpacing: '2px', marginTop: '2px' }}>WORD&nbsp;BANK</div>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                {navItems.map((n) => (
                  <button key={n.id} onClick={this.onNav(n.id)} style={navBtn(n.active, true)}>
                    <span style={{ flex: 'none', width: '7px', height: '7px', borderRadius: '50%', background: n.active ? '#fbf3e2' : '#cbb98f' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{n.label}</span>
                    {n.badgeN > 0 && <span style={badgeStyle(n.active)}>{n.badgeN}</span>}
                  </button>
                ))}
              </nav>
              <div style={{ marginTop: 'auto', padding: '14px 10px' }}>
                <div style={{ fontFamily: "'Charmonman',cursive", fontSize: '16px', color: '#a99b83', lineHeight: 1.4 }}>“เก็บคำงาม ไว้แต่งเรื่องของเราเอง”</div>
                <div style={{ fontSize: '11px', color: '#bcae94', marginTop: '8px', letterSpacing: '.5px' }}>เวอร์ชัน {VERSION}</div>
              </div>
            </aside>
          )}

          <main style={{ flex: 1, minWidth: 0, padding: '40px clamp(16px,2.5vw,40px) 72px' }}>
            {isAdd && this.renderAdd()}
            {isReview && this.renderReview(getCat, monoMode, spell, effLayout)}
            {isLibrary && this.renderLibrary(getCat, monoMode, accent)}
          </main>
        </div>

        {S.processing && this.renderProcessing(accent)}
        {S.modal === 'edit' && this.renderEditModal()}
        {S.modal === 'cats' && this.renderCatModal(monoMode)}
        {S.modal === 'settings' && this.renderSettings(monoMode, navStyle, spell, effLayout, accent, primary, paper)}
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
        <h1 style={{ fontFamily: "'Charmonman',cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: '0 0 8px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>เพิ่มคำเข้าคลัง</h1>
        <p style={{ fontSize: '17px', color: '#6f6252', maxWidth: '620px', margin: '0 0 30px', textWrap: 'pretty' }}>วางข้อความที่เก็บมาจากการอ่าน จะเป็นคำเดี่ยว วลี หรือทั้งประโยคปนกันก็ได้ แล้วให้ AI ช่วยแก้คำสะกด แยกวลีย่อย และจัดเข้าหมวดให้อัตโนมัติ</p>

        <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#5c5044', margin: '0 0 8px' }}>เรื่อง / นิยายที่คำชุดนี้มาจาก</label>
        <input list="wb-novels" value={S.novelInput} onChange={(e) => this.setState({ novelInput: e.target.value })} placeholder="เช่น ม่านหมอกยามวิกาล" style={{ width: '100%', maxWidth: '420px', padding: '12px 14px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', margin: '12px 0 26px' }}>
          {novelChips.map((c) => (
            <button key={c} onClick={() => this.setState({ novelInput: c })} style={{ padding: '5px 12px', border: '1px solid #ddcba4', borderRadius: '20px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>{c}</button>
          ))}
        </div>

        <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#5c5044', margin: '0 0 8px' }}>ข้อความที่เก็บมา</label>
        <textarea value={S.addText} onChange={(e) => this.setState({ addText: e.target.value })} rows={11} placeholder={'วางคำหรือข้อความที่นี่…\nเว้นบรรทัดใหม่ หรือคั่นด้วยจุลภาค ( , ) เพื่อแยกหลายคำ\nประโยคยาว ๆ AI จะช่วยแยกวลีย่อยที่น่าเก็บให้เอง'} style={{ width: '100%', padding: '16px 18px', border: '1px solid #d8c7a2', borderRadius: '12px', background: 'var(--surface,#fffdf6)', lineHeight: 1.9, fontSize: '17px', color: '#3a2f28', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(120,90,50,.06)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '14px' }}>
          <span style={{ fontSize: '13px', color: '#8a7d6d' }}>{lineHint}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => this.setState({ addText: this.sample(), novelInput: S.novelInput || 'ม่านหมอกยามวิกาล' })} style={{ padding: '11px 18px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '15px', cursor: 'pointer' }}>วางข้อความตัวอย่าง</button>
          <button onClick={this.process} style={{ padding: '11px 22px', border: 'none', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 2px 8px rgba(111,78,55,.3)' }}><span style={{ fontSize: '17px' }}>✎</span> ให้ AI ช่วยจัด</button>
        </div>

        <div style={{ marginTop: '40px', padding: '24px 26px', background: 'var(--panel,#f7f0e0)', border: '1px solid #e4d5b4', borderRadius: '14px' }}>
          <div style={{ fontFamily: "'Trirong',serif", fontWeight: 600, fontSize: '18px', marginBottom: '14px' }}>AI จะทำงานให้ตามลำดับนี้</div>
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
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(58,47,40,.4)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 60, animation: 'wbfade .2s ease' }}>
        <div style={{ background: 'var(--panel,#f7f0e0)', border: '1px solid #e0d0ac', borderRadius: '18px', padding: '40px 48px', textAlign: 'center', boxShadow: '0 20px 60px rgba(58,47,40,.3)', maxWidth: '340px' }}>
          <div style={{ width: '46px', height: '46px', border: '4px solid #e6d4b0', borderTopColor: accent, borderRadius: '50%', margin: '0 auto 20px', animation: 'wbspin 1s linear infinite' }} />
          <div style={{ fontFamily: "'Trirong',serif", fontSize: '20px', fontWeight: 600, color: '#3a2f28', marginBottom: '6px' }}>AI กำลังจัดคำให้</div>
          <div style={{ color: '#8a7d6d', fontSize: '15px', minHeight: '22px' }}>{this.procText}</div>
        </div>
      </div>
    );
  }

  // ============ REVIEW ============
  renderReview(getCat, monoMode, spell, effLayout) {
    const S = this.state;
    if (S.review.length === 0) {
      return (
        <section style={{ maxWidth: '100%', margin: '0 auto', animation: 'wbfade .35s ease' }}>
          <div style={{ textAlign: 'center', padding: '90px 20px' }}>
            <div style={{ fontFamily: "'Charmonman',cursive", fontSize: '30px', color: '#c3b48f' }}>ยังไม่มีคำรอตรวจทาน</div>
            <p style={{ color: '#8a7d6d', margin: '8px 0 22px' }}>ไปที่หน้า “เพิ่มคำ” วางข้อความ แล้วให้ AI ช่วยจัดก่อน</p>
            <button onClick={this.onNav('add')} style={{ padding: '12px 22px', border: 'none', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>＋ ไปเพิ่มคำ</button>
          </div>
        </section>
      );
    }
    const reviewCount = S.review.length;
    const spellCount = S.review.filter((r) => r.original && r.original !== r.text).length;
    const newCatCount = S.categories.filter((c) => c.proposed).length;
    const selCount = S.review.filter((r) => r.selected).length;
    const allSelected = reviewCount > 0 && selCount === reviewCount;
    const catOptions = S.categories.map((c) => ({ id: c.id, n: c.n, badgeLabel: c.k + '  ' + c.n }));
    const layoutSeg = (on) => ({ padding: '7px 15px', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', background: on ? 'var(--surface,#fffdf6)' : 'transparent', color: on ? '#3a2f28' : '#8a7d6d', fontWeight: on ? 600 : 400, boxShadow: on ? '0 1px 3px rgba(120,90,50,.15)' : 'none' });

    const catSelect = (r) => {
      const cat = getCat(r.category);
      return (
        <select value={r.category} onChange={(e) => this.updateReview(r.id, { category: e.target.value, proposedNew: false })} style={pill(cat, monoMode)}>
          {catOptions.map((c) => <option key={c.id} value={c.id}>{c.badgeLabel}</option>)}
        </select>
      );
    };

    const cardsView = (
      <>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#8a7d6d', marginBottom: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={allSelected} onChange={this.selectAll} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)' }} />เลือกทั้งหมด
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
          {S.review.map((r) => {
            const hasSpell = !!r.original && r.original !== r.text;
            const cardStyle = { background: hasSpell && spell === 'highlight' ? '#fbf1ee' : 'var(--surface,#fffdf6)', border: '1px solid ' + (r.proposedNew ? '#cbdcb8' : (hasSpell && spell === 'highlight' ? '#ecc9bd' : '#e6dabf')), borderRadius: '13px', padding: '16px 17px', boxShadow: '0 1px 2px rgba(120,90,50,.05)', display: 'flex', flexDirection: 'column' };
            const spellBoxStyle = { fontSize: '12.5px', marginBottom: '8px', padding: '6px 9px', borderRadius: '7px', background: spell === 'highlight' ? 'rgba(156,59,43,.08)' : '#f3e9d6', lineHeight: 1.4 };
            return (
              <div key={r.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" checked={r.selected} onChange={() => this.toggleSel(r.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
                  {catSelect(r)}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => this.removeReview(r.id)} title="ลบคำนี้" style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>
                {hasSpell && (
                  <div style={spellBoxStyle}>
                    {spell === 'strikethrough' && (<><span style={{ color: '#b58175', textDecoration: 'line-through', textDecorationColor: '#cf7a63' }}>{r.original}</span><span style={{ color: 'var(--accent,#9c3b2b)' }}> → แก้เป็น</span></>)}
                    {spell === 'label' && (<><span style={{ background: 'var(--accent,#9c3b2b)', color: '#fbf3e2', padding: '1px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600 }}>สะกดใหม่</span><span style={{ color: '#a58a80', marginLeft: '7px' }}>จากเดิม: {r.original}</span></>)}
                    {spell === 'highlight' && (<><span style={{ color: 'var(--accent,#9c3b2b)', fontWeight: 600 }}>✎ แก้สะกดแล้ว</span><span style={{ color: '#a58a80', marginLeft: '7px' }}>เดิม: {r.original}</span></>)}
                  </div>
                )}
                <input value={r.text} onChange={(e) => this.updateReview(r.id, { text: e.target.value })} style={{ width: '100%', fontFamily: "'Trirong',serif", fontSize: '19px', fontWeight: 500, color: '#33291f', border: 'none', borderBottom: '1px dashed #ddcba4', background: 'transparent', padding: '2px 0 6px', outline: 'none' }} />
                <input value={r.meaning} onChange={(e) => this.updateReview(r.id, { meaning: e.target.value })} placeholder="＋ เพิ่มความหมาย (ไม่บังคับ)" style={{ width: '100%', fontSize: '14px', color: '#6f6252', border: 'none', background: 'transparent', padding: '8px 0 2px', outline: 'none' }} />
                {(r.notes || []).length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '9px' }}>
                    {r.notes.map((note, i) => <span key={i} style={{ fontSize: '11px', color: '#9a8c76', background: '#f0e8d4', border: '1px solid #e4d8bd', padding: '2px 8px', borderRadius: '5px' }}>{note}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );

    const tableView = (
      <div style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '38px 1.6fr 200px 1.2fr 40px', gap: '12px', padding: '12px 16px', background: '#f0e6cd', borderBottom: '1px solid #e0d0ac', fontSize: '12px', fontWeight: 600, color: '#8a7d6d', letterSpacing: '.4px' }}>
          <input type="checkbox" checked={allSelected} onChange={this.selectAll} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
          <span>คำ / วลี</span><span>หมวด</span><span>ความหมาย</span><span></span>
        </div>
        {S.review.map((r) => {
          const hasSpell = !!r.original && r.original !== r.text;
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '38px 1.6fr 200px 1.2fr 40px', gap: '12px', padding: '8px 16px', borderBottom: '1px solid #f0e6cd', alignItems: 'start', background: r.selected ? '#faf4e6' : 'transparent' }}>
              <input type="checkbox" checked={r.selected} onChange={() => this.toggleSel(r.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer', marginTop: '9px' }} />
              <div>
                <input value={r.text} onChange={(e) => this.updateReview(r.id, { text: e.target.value })} style={{ width: '100%', fontFamily: "'Trirong',serif", fontSize: '17px', fontWeight: 500, color: '#33291f', border: 'none', background: 'transparent', outline: 'none', padding: '5px 0' }} />
                {hasSpell && <div style={{ fontSize: '12px', color: 'var(--accent,#9c3b2b)' }}>✎ เดิม: {r.original}</div>}
              </div>
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
        <p style={{ fontSize: '13px', color: '#8a7d6d', margin: '0 0 12px' }}>ลากคำไปวางในหมวดที่ต้องการได้เลย · กด ✕ เพื่อลบ</p>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '14px', alignItems: 'flex-start' }}>
          {S.categories.map((c) => {
            const items = S.review.filter((r) => r.category === c.id);
            if (!items.length) return null;
            return (
              <div key={c.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (this._drag) { this.updateReview(this._drag, { category: c.id, proposedNew: false }); this._drag = null; } }} style={{ flex: 'none', width: '244px', background: '#f6eed9', border: '1px dashed ' + rgba(c.c, 0.5), borderRadius: '12px', padding: '14px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={badge(c, monoMode)}>{c.k}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#4a3f35', flex: 1, lineHeight: 1.25 }}>{c.n}</span>
                  <span style={{ fontSize: '12px', color: '#a99b83' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '44px' }}>
                  {items.map((r) => {
                    const hasSpell = !!r.original && r.original !== r.text;
                    return (
                      <div key={r.id} draggable onDragStart={(e) => { this._drag = r.id; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', background: 'var(--surface,#fffdf6)', border: '1px solid ' + rgba(c.c, 0.35), borderLeft: '3px solid ' + c.c, borderRadius: '8px', cursor: 'grab', boxShadow: '0 1px 2px rgba(120,90,50,.06)' }}>
                        {hasSpell && <span title="แก้สะกดแล้ว" style={{ flex: 'none', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent,#9c3b2b)' }} />}
                        <span style={{ flex: 1, fontFamily: "'Trirong',serif", fontSize: '15px', color: '#33291f' }}>{r.text}</span>
                        <button onClick={() => this.removeReview(r.id)} style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
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

    return (
      <section style={{ maxWidth: '1200px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Charmonman',cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>ตรวจทาน</h1>
          <span style={{ color: '#8a7d6d', paddingBottom: '10px' }}>จากเรื่อง <b style={{ color: '#5c5044' }}>{S.reviewNovel}</b></span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '16px 0 8px' }}>
          <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#f0e6cd', border: '1px solid #e0d0ac', fontSize: '13px', color: '#6f6252' }}>พบ <b>{reviewCount}</b> คำ</span>
          <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#f5e4dd', border: '1px solid #e6c3b7', fontSize: '13px', color: 'var(--accent,#9c3b2b)' }}>✎ แก้สะกด <b>{spellCount}</b></span>
          <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#e9efe1', border: '1px solid #cbdcb8', fontSize: '13px', color: '#5a7040' }}>✦ หมวดใหม่ <b>{newCatCount}</b></span>
        </div>
        <p style={{ fontSize: '14px', color: '#8a7d6d', margin: '0 0 20px' }}>ค่าเริ่มต้นคือยืนยันตามที่ AI แยกให้ — แก้ตัวคำ เปลี่ยนหมวด ลากย้าย หรือเลือกหลายคำจัดการพร้อมกันได้ตามใจ</p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'inline-flex', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
            {[['cards', 'การ์ด'], ['table', 'ตาราง'], ['columns', 'คอลัมน์']].map(([k, label]) => (
              <button key={k} onClick={this.setUi('reviewLayout', k)} style={layoutSeg(effLayout === k)}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={this.openCats} style={{ padding: '9px 15px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '14px', cursor: 'pointer' }}>⚙ จัดการหมวด</button>
          <button onClick={this.discard} style={{ padding: '9px 15px', border: '1px solid #e6c3b7', borderRadius: '9px', background: '#faf1ee', color: 'var(--accent,#9c3b2b)', fontSize: '14px', cursor: 'pointer' }}>ทิ้งทั้งหมด</button>
          <button onClick={this.save} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(111,78,55,.28)' }}>✓ บันทึกเข้าคลัง ({reviewCount})</button>
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
    let filtered = ctxLib.filter((w) => S.filterCat === 'all' || w.category === S.filterCat);
    if (S.exactFilter) filtered = filtered.filter((w) => w.text === S.exactFilter);
    if (S.dupOnly) filtered = filtered.filter((w) => (dupMap[w.text] || 0) > 1 && w.text.length <= 24);
    const sortFn = S.sort === 'az' ? (a, b) => a.text.localeCompare(b.text, 'th') : S.sort === 'old' ? (a, b) => a.date - b.date : (a, b) => b.date - a.date;
    filtered = filtered.slice().sort(sortFn);

    const cardMode = this.eff('cardStyle', 'classic');
    const cardSize = this.eff('cardSize', 'm');
    const SZ = ({ s: { min: 168, w: 16.5, lw: 19 }, m: { min: 228, w: 19, lw: 22 }, l: { min: 302, w: 23, lw: 27 } })[cardSize] || { min: 228, w: 19, lw: 22 };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(' + SZ.min + 'px,1fr))', gap: '12px', marginBottom: '8px' };
    const wordFont = this.eff('wordFont', 'trirong');
    const FF = ({ trirong: "'Trirong',serif", sarabun: "'Sarabun',sans-serif", maitree: "'Maitree',serif", chonburi: "'Chonburi',serif" })[wordFont] || "'Trirong',serif";
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
    const navStyle = this.eff('navStyle', 'sidebar');

    const renderCard = (w) => {
      const cat = getCat(w.category);
      const isDup = (dupMap[w.text] || 0) > 1 && w.text.length <= 24;
      const bar = monoMode ? '#c9b78f' : cat.c, dupB = rgba(accent, 0.55), dupBg = rgba(accent, 0.08);
      const baseCard = { background: isDup ? dupBg : 'var(--surface,#fffdf6)', border: '1px solid ' + (isDup ? dupB : '#e6dabf'), borderRadius: '12px', position: 'relative', overflow: 'hidden' };
      const confirming = S.confirmId === w.id;
      const footer = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#b0a184' }}>
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
          <span style={{ fontFamily: "'Trirong',serif", fontSize: '17px', color: '#33291f', flex: 'none' }}>{w.text}</span>
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
              <div key={key} id={key} style={{ margin: '2px 0 10px', paddingLeft: depth > 0 ? '15px' : 0, borderLeft: depth > 0 ? '1px solid #ece0c6' : 'none', scrollMarginTop: (this.eff('navStyle', 'sidebar') === 'tabs' ? 80 : 22) + 'px' }}>
                <div onClick={this.toggleCollapse(key)} style={bandStyle}>
                  {chev(isCol)}
                  <span style={{ fontFamily: "'Trirong',serif", fontSize: headSize + 'px', fontWeight: depth < 2 ? 700 : 600, color: nameColor }}>{nm}</span>
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
        <div style={{ fontFamily: "'Charmonman',cursive", fontSize: '19px', color: 'var(--accent,#9c3b2b)', margin: '0 0 10px' }}>สารบัญ</div>
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
        <h1 style={{ fontFamily: "'Charmonman',cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: '0 0 8px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>คลังคำของฉัน</h1>
        <p style={{ color: '#6f6252', margin: '0 0 24px' }}><b style={{ color: '#4a3f35' }}>{S.library.length}</b> คำ ใน {new Set(S.library.map((w) => w.category)).size} หมวด จาก {new Set(S.library.map((w) => w.novel)).size} เรื่อง</p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '420px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b0a184', fontSize: '16px' }}>⌕</span>
            <input value={S.q} onChange={this.onQ} placeholder="ค้นหาคำ วลี หรือความหมาย…" style={{ width: '100%', padding: '11px 14px 11px 38px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
          </div>
          <select value={S.filterNovel} onChange={this.onFilterNovel} style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>{novelFilterOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
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
              {[['trirong', 'ไทรรงค์', "'Trirong',serif"], ['sarabun', 'สารบรรณ', "'Sarabun',sans-serif"], ['maitree', 'ไมตรี', "'Maitree',serif"], ['chonburi', 'ชลบุรี', "'Chonburi',serif"]].map(([k, label, ff]) => <button key={k} onClick={this.setUi('wordFont', k)} style={{ ...seg(wordFont === k), fontFamily: ff, fontSize: '14px' }}>{label}</button>)}
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
            <div style={{ fontFamily: "'Charmonman',cursive", fontSize: '26px' }}>ไม่พบคำที่ค้นหา</div>
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
                        <h2 style={{ fontFamily: "'Trirong',serif", fontWeight: 700, fontSize: '24px', margin: 0, color: '#33291f', lineHeight: 1.15 }}>{g.cat.n}</h2>
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
          <h3 style={{ fontFamily: "'Trirong',serif", fontWeight: 600, fontSize: '22px', margin: '0 0 18px' }}>แก้ไขคำ</h3>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>คำ / วลี</label>
          <input value={ed.text || ''} onChange={this.onEditField('text')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#33291f', fontFamily: "'Trirong',serif", fontSize: '18px', outline: 'none', marginBottom: '14px' }} />
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
          <h3 style={{ fontFamily: "'Trirong',serif", fontWeight: 600, fontSize: '22px', margin: '0 0 4px' }}>จัดการหมวด</h3>
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
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 4px' }}><h3 style={{ fontFamily: "'Trirong',serif", fontWeight: 600, fontSize: '22px', margin: 0, flex: 1 }}>ตั้งค่าการแสดงผล</h3><button onClick={this.closeSettings} title="ปิด" style={{ border: 'none', background: 'transparent', color: '#8a7d6d', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button></div>
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
            {segRow('เมนู', 'navStyle', navStyle, [['sidebar', 'แถบข้าง'], ['tabs', 'แถบบน']])}
            {segRow('หน้าตรวจทาน', 'reviewLayout', effLayout, [['cards', 'การ์ด'], ['table', 'ตาราง'], ['columns', 'คอลัมน์']])}
            {segRow('คำแก้สะกด', 'spellDisplay', spell, [['highlight', 'ไฮไลต์'], ['strikethrough', 'ขีดฆ่า'], ['label', 'ป้าย']])}
            {segRow('สีหมวด', 'categoryColor', monoMode ? 'mono' : 'soft', [['soft', 'มีสี'], ['mono', 'ขาว-ดำ']])}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}><button onClick={this.resetSettings} style={{ padding: '9px 15px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', cursor: 'pointer' }}>คืนค่าเริ่มต้น</button><div style={{ flex: 1 }} /><button onClick={this.closeSettings} style={{ padding: '10px 22px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>เสร็จสิ้น</button></div>
        </div>
      </div>
    );
  }
}
