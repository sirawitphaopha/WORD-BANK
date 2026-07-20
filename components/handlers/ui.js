'use client';
import { pathsOf } from '@/components/helpers';

export function uiActions(app) {
  app.toggleSrc = (key) => app.setState((s) => ({ srcCollapsed: { ...s.srcCollapsed, [key]: !s.srcCollapsed[key] } }));
  app.toggleTree = (key) => app.setState((s) => ({ treeCollapsed: { ...s.treeCollapsed, [key]: !s.treeCollapsed[key] } }));
  // เรียงตารางตรวจทาน: กดหัวคอลัมน์วน asc → desc → ไม่เรียง
  app.toggleReviewSort = (key) => app.setState((s) => ({ reviewSort: s.reviewSort && s.reviewSort.key === key ? (s.reviewSort.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' } }));

  // ---------- ป๊อปอัปยืนยันกลาง (ใช้ทุกปุ่มที่มี action สำคัญ) ----------
  app.askConfirm = (opts) => app.setState({ confirm: { ...opts } });
  app.closeConfirm = () => app.setState({ confirm: null });
  app.stop = (e) => { e.stopPropagation(); };
  // เปลี่ยนหน้า = เด้งขึ้นบนสุดเสมอ (ไม่ค้างตำแหน่งที่เลื่อนไว้จากหน้าก่อน)
  app.toTop = () => { try { window.scrollTo(0, 0); } catch (e) {} };
  app.onNav = (p) => () => { app.setState({ page: p, confirmId: null }, app.toTop); if (p === 'ailog') app.loadAiLogs(); };
  // โหลดประวัติการใช้ AI (เรียกตอนเข้าหน้า + ปุ่มรีเฟรช)
  app.setUi = (key, val) => () => { const ui = { ...app.state.ui, [key]: val }; app.setState({ ui }, app.persistUi); };
  // สลับมุมมอง = เนื้อหาเปลี่ยนทั้งหน้า → เด้งขึ้นบนสุดเหมือนตอนเปลี่ยนหน้า
  app.setUiTop = (key, val) => () => { const ui = { ...app.state.ui, [key]: val }; app.setState({ ui }, () => { app.persistUi(); app.toTop(); }); };
  app.resetSettings = () => app.setState({ ui: {} }, app.persistUi);
  app.openSettings = () => app.setState({ modal: 'settings' });
  app.closeSettings = () => app.setState({ modal: null });

  // วางข้อความจากคลิปบอร์ด (ที่พี่กันคัดลอกมา) ลงช่องเพิ่มคำเลย
  app.onQ = (e) => app.setState({ q: e.target.value });
  // ตัวกรองนิยายแบบเลือกได้หลายเรื่อง (filterNovels = array · ว่าง = ดูทุกเรื่อง) — เมนูติ๊กหลายอันได้
  app.toggleNovelMenu = () => app.setState((s) => ({ novelMenuOpen: !s.novelMenuOpen }));
  app.toggleNovel = (n) => () => app.setState((s) => { const cur = s.filterNovels || []; return { filterNovels: cur.includes(n) ? cur.filter((x) => x !== n) : cur.concat([n]) }; });
  app.clearNovels = () => app.setState({ filterNovels: [], novelMenuOpen: false });
  app.toggleFontMenu = () => app.setState((s) => ({ fontMenuOpen: !s.fontMenuOpen }));
  app.onSort = (e) => app.setState({ sort: e.target.value });
  app.setLibView = (v) => () => app.setState({ libView: v }, app.toTop);
  app.setFilterCat = (id) => () => app.setState({ filterCat: id });
  app.clearExact = () => app.setState({ exactFilter: '' });
  app.toggleDupOnly = () => app.setState((s) => ({ dupOnly: !s.dupOnly, exactFilter: '' }));

  // ---------- ยุบ/ขยาย + สารบัญ ----------
  app.toggleCollapse = (key) => (e) => { if (e) e.stopPropagation(); app.setState((s) => { const c = { ...s.collapsed }; if (c[key]) delete c[key]; else c[key] = 1; return { collapsed: c }; }, app.persistCollapsed); };
  app.collapseAll = (keys) => () => { const c = {}; keys.forEach((k) => { c[k] = 1; }); app.setState({ collapsed: c }, app.persistCollapsed); };
  app.expandAll = () => app.setState({ collapsed: {} }, app.persistCollapsed);
  app.jumpTo = (id, openKeys) => () => {
    app.setState((s) => { const c = { ...s.collapsed }; (openKeys || []).forEach((k) => delete c[k]); return { collapsed: c }; }, () => {
      requestAnimationFrame(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
  };
  app.askDelete = (id) => { return () => app.setState({ confirmId: id }); }
  app.cancelDelete = () => app.setState({ confirmId: null });
  app.doDelete = (id) => {
    return async () => {
      const prev = app.state.library;
      app.setState((s) => ({ library: s.library.filter((w) => w.id !== id), confirmId: null }));
      try {
        const res = await fetch('/api/words/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        app.flash('ลบคำแล้ว');
      } catch (e) { app.setState({ library: prev }); app.flash('ลบไม่สำเร็จ'); }
    };
  }
  app.openEdit = (w) => { return () => app.setState({ modal: 'edit', editing: { ...w } }); }
  app.onEditField = (f) => { return (e) => app.setState((s) => ({ editing: { ...s.editing, [f]: e.target.value } })); }
  app.saveEdit = async () => {
    const ed = app.state.editing; if (!ed) return;
    const paths = pathsOf(ed);
    const patch = { text: ed.text.trim(), meaning: (ed.meaning || '').trim(), category: ed.category, novel: ed.novel, subpaths: paths, subpath: paths[0] || '' };
    const prev = app.state.library;
    app.setState((s) => ({ library: s.library.map((w) => w.id === ed.id ? { ...w, ...patch } : w), modal: null, editing: null }));
    try {
      const res = await fetch('/api/words/' + ed.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: patch.text, meaning: patch.meaning, category_id: patch.category, novel: patch.novel, subpaths: paths }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      app.flash('บันทึกการแก้ไขแล้ว');
    } catch (e) { app.setState({ library: prev }); app.flash('บันทึกไม่สำเร็จ'); }
  };
  app.cancelEdit = () => app.setState({ modal: null, editing: null, editPathDraft: '' });
  app.deleteFromEdit = async () => {
    const ed = app.state.editing; if (!ed) return;
    const prev = app.state.library;
    app.setState((s) => ({ library: s.library.filter((w) => w.id !== ed.id), modal: null, editing: null }));
    try {
      const res = await fetch('/api/words/' + ed.id, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      app.flash('ลบคำแล้ว');
    } catch (e) { app.setState({ library: prev }); app.flash('ลบไม่สำเร็จ'); }
  };
  app.toBottom = () => { try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } catch (e) {} };
  app.toTopSmooth = () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} };
  app.copyText = (text, msg) => {
    try { navigator.clipboard.writeText(text); app.flash(msg || 'คัดลอกแล้ว'); }
    catch { app.flash('คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วกด Ctrl+C'); }
  };
}
