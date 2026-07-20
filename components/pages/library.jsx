'use client';
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

export function renderLibrary(app, getCat, monoMode, accent) {
  const S = app.state;
  // ---- นับซ้ำแบบใหม่ (พี่กันกำหนด 19 ก.ค. 2569) ----
  // ซ้ำจริง = คำเดียวกัน อยู่ "กิ่งเดียวกัน" มากกว่า 1 อัน → ต้องลบทิ้งอันเกิน
  // คำเดียวกันอยู่คนละกิ่ง = ตั้งใจ ไม่ใช่ซ้ำ → บอกเฉย ๆ ว่าอยู่กี่กิ่ง
  const dupMap = {};      // "คำ|กิ่ง" → จำนวนที่เจอ (เกิน 1 = ซ้ำจริง)
  const branchMap = {};   // คำ → เซ็ตของกิ่งที่คำนั้นไปโผล่
  S.library.forEach((x) => {
    const ps = pathsOf(x);
    (ps.length ? ps : ['—']).forEach((p) => {
      const k = x.text + '|' + p;
      dupMap[k] = (dupMap[k] || 0) + 1;
      if (!branchMap[x.text]) branchMap[x.text] = new Set();
      branchMap[x.text].add(p);
    });
  });
  const dupKeyOf = (w) => w.text + '|' + (pathsOf(w)[0] || '—');
  const isDupWord = (w) => {
    if (w.text.length > 24) return 0;
    return pathsOf(w).reduce((mx, p) => Math.max(mx, dupMap[w.text + '|' + p] || 0), 0);
  };
  const branchesOf = (w) => (branchMap[w.text] ? branchMap[w.text].size : 0);
  const dupTotal = new Set(Object.keys(dupMap).filter((k) => dupMap[k] > 1 && k.split('|')[0].length <= 24).map((k) => k.split('|')[0])).size;
  const ql = S.q.trim().toLowerCase();
  const selNovels = S.filterNovels || [];
  const matchQN = (w) => (selNovels.length === 0 || selNovels.includes(w.novel)) && (!ql || w.text.toLowerCase().includes(ql) || (w.meaning || '').toLowerCase().includes(ql));
  const ctxLib = S.library.filter(matchQN);
  // ช่องเติมคำ = คำใบ้ในวงเล็บเหลี่ยม เช่น "อ้างตัวว่าชื่อ [ชื่อคน]" — อ่านจากตัวคำตรงๆ ไม่ต้องเก็บคอลัมน์เพิ่ม
  const slotsOf = (w) => (String(w.text || '').match(/\[[^\]]+\]/g) || []);
  const matchSlot = (w) => {
    if (S.filterSlot === 'all') return true;
    const ss = slotsOf(w);
    if (S.filterSlot === 'any') return ss.length > 0;
    if (S.filterSlot === 'none') return ss.length === 0;
    return ss.includes(S.filterSlot);
  };
  let filtered = ctxLib.filter((w) => (S.filterCat === 'all' || w.category === S.filterCat) && (S.filterKind === 'all' || w.kind === S.filterKind) && matchSlot(w));
  // ตัวเลือกในดรอปดาวน์สร้างจากคำใบ้ที่มีอยู่จริงในคลัง (ไม่ hardcode) เรียงตามจำนวนที่พบ
  const slotCount = new Map();
  ctxLib.forEach((w) => slotsOf(w).forEach((s) => slotCount.set(s, (slotCount.get(s) || 0) + 1)));
  const slotOpts = [...slotCount.entries()].sort((a, b) => b[1] - a[1]);
  const withSlotCount = ctxLib.filter((w) => slotsOf(w).length > 0).length;
  if (S.exactFilter) filtered = filtered.filter((w) => w.text === S.exactFilter);
  if (S.dupOnly) filtered = filtered.filter((w) => isDupWord(w) > 1);
  const sortFn = S.sort === 'az' ? (a, b) => a.text.localeCompare(b.text, 'th') : S.sort === 'old' ? (a, b) => a.date - b.date : (a, b) => b.date - a.date;
  filtered = filtered.slice().sort(sortFn);

  const cardMode = app.eff('cardStyle', 'classic');
  const cardSize = app.eff('cardSize', 'm');
  const SZ = ({ s: { min: 168, w: 16.5, lw: 19 }, m: { min: 228, w: 19, lw: 22 }, l: { min: 302, w: 23, lw: 27 } })[cardSize] || { min: 228, w: 19, lw: 22 };
  // มือถือ: วางคำเป็นตาราง 3 คอลัมน์ ให้เห็นคำเยอะๆ ไม่ต้องเลื่อนยาว (อ่านซ้าย→ขวาตามปกติ) · จอคอมพิวเตอร์ใช้กริดเดิม
  const gridStyle = S.isMobile
    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(104px,1fr))', gridAutoFlow: 'dense', gap: '7px', marginBottom: '8px', alignItems: 'stretch' }
    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(' + SZ.min + 'px,1fr))', gap: '12px', marginBottom: '8px' };
  const wordFont = app.eff('wordFont', 'trirong');
  // ฟอนต์ไทยดั้งเดิมตัวเล็กกว่ามาตรฐาน ต้องคูณขนาดชดเชย + ใช้ตัวหนาให้อ่านชัด
  const FSCALE = { thsarabun: 1.38, cordia: 1.38 }[wordFont] || 1;
  const FWEIGHT = { thsarabun: 700, cordia: 700 }[wordFont] || 500;
  const fsz = (n) => Math.round(n * FSCALE) + 'px';
  const FF = ({ trirong: "var(--font-trirong),serif", sarabun: "var(--font-sarabun),sans-serif", thsarabun: "var(--font-thsarabun),sans-serif", cordia: "'Cordia New','CordiaUPC','Cordia',var(--font-sarabun),sans-serif", maitree: "var(--font-maitree),serif", chonburi: "var(--font-chonburi),serif" })[wordFont] || "var(--font-trirong),serif";
  // เปลี่ยนฟอนต์คำบนมือถือ — ปุ่ม dropdown แบบเดียวกับ "เลือกนิยาย" (กรอบเท่ากันเป๊ะ) · โชว์ "เลือกฟอนต์" · ฟอนต์ครบ 6 ตัว (พี่กัน 2026-07-20b) · จอคอมยังมีปุ่มฟอนต์ segment 6 ตัวเหมือนเดิม
  const FONTS_ALL = [
    { k: 'trirong', label: 'ไทรรงค์' }, { k: 'sarabun', label: 'สารบรรณ' }, { k: 'thsarabun', label: 'Sarabun New' },
    { k: 'cordia', label: 'Cordia New' }, { k: 'maitree', label: 'ไมตรี' }, { k: 'chonburi', label: 'ชลบุรี' },
  ];
  // มือถือใช้การ์ดกะทัดรัดหลายคอลัมน์เสมอ (มุมมองรายการเป็นแถวกว้างเกินจอแคบ)
  const isCards = S.isMobile ? true : S.libView === 'cards', isList = S.isMobile ? false : S.libView === 'list';

  const seg = (on) => ({ padding: '0 15px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', background: on ? 'var(--surface,#fffdf6)' : 'transparent', color: on ? '#3a2f28' : '#8a7d6d', fontWeight: on ? 600 : 400, boxShadow: on ? '0 1px 3px rgba(120,90,50,.15)' : 'none' });

  // เมนูเลือกนิยาย (เลือกได้หลายเรื่อง — filterNovels เก็บเป็น array · ว่าง = ดูทุกเรื่อง) · ใช้ทั้งมือถือ (แถว 2) และจอคอม (ในแถวตัวกรอง)
  const novelNames = [...new Set(S.library.map((w) => w.novel).filter(Boolean))];
  const novelLabel = selNovels.length === 0 ? 'เลือกนิยาย' : selNovels.length === 1 ? selNovels[0] : 'เลือกนิยาย (' + thNum(selNovels.length) + ')';
  const novelPicker = (full) => (
    <div style={{ position: 'relative', ...(full ? { width: '100%' } : {}) }}>
      <button onClick={app.toggleNovelMenu} title="กรองตามนิยาย เลือกได้หลายเรื่อง" style={{ width: full ? '100%' : 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', padding: '11px 13px', border: '1px solid ' + (selNovels.length ? 'var(--primary,#6f4e37)' : '#d8c7a2'), borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', cursor: 'pointer', fontSize: '14px', fontWeight: selNovels.length ? 600 : 400 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{novelLabel}</span>
        <span style={{ color: '#b0a184', fontSize: '11px', flex: 'none' }}>▾</span>
      </button>
      {S.novelMenuOpen && (
        <>
          <div onClick={app.toggleNovelMenu} style={{ position: 'fixed', inset: 0, zIndex: 44 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%', maxWidth: '320px', zIndex: 45, background: 'var(--surface,#fffdf6)', border: '1px solid #d8c7a2', borderRadius: '10px', boxShadow: '0 12px 30px rgba(58,47,40,.22)', padding: '6px', maxHeight: '300px', overflow: 'auto' }}>
            {novelNames.length === 0 ? <div style={{ padding: '8px 10px', color: '#a99b83', fontSize: '13px' }}>ยังไม่มีนิยาย</div> : novelNames.map((n) => (
              <label key={n} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', fontSize: '13.5px', color: '#3a2f28', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={selNovels.includes(n)} onChange={app.toggleNovel(n)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', flex: 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
              </label>
            ))}
            {selNovels.length > 0 && <button onClick={app.clearNovels} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid #ddcba4', borderRadius: '7px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>ล้าง (ดูทุกเรื่อง)</button>}
          </div>
        </>
      )}
    </div>
  );
  // ปุ่มเลือกฟอนต์ (โครงเดียวกับ novelPicker เป๊ะ → กรอบสูงเท่ากรอบนิยาย ไม่อวบกว่า) · โชว์ "เลือกฟอนต์" · เมนูลิสต์ฟอนต์ 6 ตัว แต่ละอันพรีวิวด้วยฟอนต์จริง
  const fontFam = { trirong: "var(--font-trirong),serif", sarabun: "var(--font-sarabun),sans-serif", thsarabun: "var(--font-thsarabun),sans-serif", cordia: "'Cordia New','CordiaUPC','Cordia',var(--font-sarabun),sans-serif", maitree: "var(--font-maitree),serif", chonburi: "var(--font-chonburi),serif" };
  const fontPicker = () => (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button onClick={app.toggleFontMenu} title="เลือกฟอนต์คำ" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}>
        <span>เลือกฟอนต์</span>
        <span style={{ color: '#b0a184', fontSize: '11px', flex: 'none' }}>▾</span>
      </button>
      {S.fontMenuOpen && (
        <>
          <div onClick={app.toggleFontMenu} style={{ position: 'fixed', inset: 0, zIndex: 44 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '156px', zIndex: 45, background: 'var(--surface,#fffdf6)', border: '1px solid #d8c7a2', borderRadius: '10px', boxShadow: '0 12px 30px rgba(58,47,40,.22)', padding: '6px', maxHeight: '320px', overflow: 'auto' }}>
            {FONTS_ALL.map((f) => (
              <button key={f.k} onClick={() => { app.setUi('wordFont', f.k)(); app.setState({ fontMenuOpen: false }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none', borderRadius: '7px', background: wordFont === f.k ? '#efe4cc' : 'transparent', color: '#3a2f28', cursor: 'pointer', fontFamily: fontFam[f.k], fontSize: '16px', whiteSpace: 'nowrap' }}>{f.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
  const catChipStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '20px', fontSize: '13.5px', cursor: 'pointer', border: '1px solid ' + (active ? 'var(--primary,#6f4e37)' : '#ddcba4'), background: active ? 'var(--primary,#6f4e37)' : 'var(--panel,#f7f0e0)', color: active ? '#fbf3e2' : '#6f6252', fontWeight: active ? 600 : 400 });

  // คำที่ติดหลายกิ่ง → กระจายเป็นหนึ่งชิ้นต่อกิ่ง เพื่อให้โผล่ในต้นไม้ครบทุกกิ่ง
  // (ยังเป็นคำแถวเดียวในฐานข้อมูล ป้าย "ซ้ำ ×N" จึงไม่ขึ้นผิด)
  const spread = (list) => {
    const out = [];
    list.forEach((w) => {
      const ps = pathsOf(w);
      if (ps.length <= 1) { out.push(w); return; }
      ps.forEach((p) => out.push({ ...w, subpath: p }));
    });
    return out;
  };
  // หมวดที่จะแสดง (ตามตัวกรอง) พร้อมคำที่ผ่านตัวกรองแล้ว
  const visCats = (S.filterCat === 'all' ? S.categories : S.categories.filter((c) => c.id === S.filterCat))
    .map((c) => ({ cat: c, items: spread(filtered.filter((w) => w.category === c.id)) }))
    .filter((g) => g.items.length > 0);
  const anyResults = visCats.length > 0;
  const allCatKeys = visCats.map((g) => 'g-' + g.cat.id);
  const navStyle = 'tabs'; // ใช้แบนเนอร์บนเสมอ (เอา sidebar ออกแล้ว)

  const renderCard = (w) => {
    const cat = getCat(w.category);
    const dupN = isDupWord(w), isDup = dupN > 1, nBranch = branchesOf(w);
    const bar = monoMode ? '#c9b78f' : cat.c, dupB = rgba(accent, 0.55), dupBg = rgba(accent, 0.08);
    // มือถือ: การ์ดกะทัดรัด แตะทั้งใบเพื่อดู/แก้ · จัดเป็นหลายคอลัมน์ (masonry) เพื่อคำแน่น เลื่อนน้อย
    if (S.isMobile) {
      // วลียาวกินหลายคอลัมน์ (พี่กัน 2026-07-20b) — กันการ์ดสูงแคบหลายบรรทัด · สั้น=1 · กลาง=2 · ยาว=3 (เต็มแถว) · grid dense อุดช่องว่าง + alignItems stretch ให้สูงเท่ากันในแถวเดียว
      const tlen = (w.text || '').length;
      const span = tlen > 30 ? 3 : tlen > 15 ? 2 : 1;
      return (
        <div key={w.id} onClick={app.openEdit(w)} style={{ gridColumn: 'span ' + span, minHeight: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: isDup ? dupBg : 'var(--surface,#fffdf6)', border: '1px solid ' + (isDup ? dupB : '#e6dabf'), borderLeft: '3px solid ' + (isDup ? dupB : bar), borderRadius: '10px', padding: '7px 9px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontFamily: FF, fontSize: fsz(14.5), fontWeight: FWEIGHT, color: '#33291f', lineHeight: 1.28, wordBreak: 'break-word' }}>{w.text}</div>
          {w.meaning && w.meaning.trim() && <div style={{ fontSize: '11px', color: '#8a7d6d', marginTop: '3px', lineHeight: 1.32, wordBreak: 'break-word' }}>{w.meaning}</div>}
          {(isDup || nBranch > 1) && (
            <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {isDup && <span onClick={(e) => { e.stopPropagation(); app.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' }); }} style={{ border: '1px solid ' + rgba(accent, 0.5), background: rgba(accent, 0.1), color: 'var(--accent,#9c3b2b)', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '5px' }}>⚠ ×{dupN}</span>}
              {!isDup && nBranch > 1 && <span onClick={(e) => { e.stopPropagation(); app.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' }); }} style={{ border: '1px solid #c6bcda', background: '#efe9f7', color: '#5f4c80', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '5px' }}>↺ {thNum(nBranch)} กิ่ง</span>}
            </div>
          )}
        </div>
      );
    }
    const baseCard = { background: isDup ? dupBg : 'var(--surface,#fffdf6)', border: '1px solid ' + (isDup ? dupB : '#e6dabf'), borderRadius: '12px', position: 'relative', overflow: 'hidden' };
    const confirming = S.confirmId === w.id;
    const footer = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#b0a184' }}>
        {w.kind ? <span style={{ flex: 'none', fontSize: '10.5px', fontWeight: 600, color: '#8a7150', background: '#efe4cc', padding: '1px 7px', borderRadius: '20px' }}>{ { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' }[w.kind] || w.kind }</span> : null}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✦ {w.novel}</span>
        {isDup && <button onClick={() => app.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' })} style={{ border: '1px solid ' + rgba(accent, 0.5), background: rgba(accent, 0.1), color: 'var(--accent,#9c3b2b)', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', cursor: 'pointer', flex: 'none' }}>⚠ ซ้ำ ×{dupN}</button>}
        {!isDup && nBranch > 1 && <button title={"คำนี้ติดไว้ " + nBranch + " กิ่ง กดเพื่อดูทุกกิ่ง"} onClick={() => app.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' })} style={{ border: '1px solid #c6bcda', background: '#efe9f7', color: '#5f4c80', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', cursor: 'pointer', flex: 'none' }}>↺ อยู่ {thNum(nBranch)} กิ่ง</button>}
        {confirming ? (
          <>
            <span style={{ color: 'var(--accent,#9c3b2b)' }}>ลบคำนี้</span>
            <button onClick={app.doDelete(w.id)} style={{ border: 'none', background: 'transparent', color: 'var(--accent,#9c3b2b)', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>ยืนยัน</button>
            <button onClick={app.cancelDelete} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '12px' }}>ยกเลิก</button>
          </>
        ) : (
          <>
            <button onClick={app.openEdit(w)} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '12px' }}>แก้ไข</button>
            <button onClick={app.askDelete(w.id)} style={{ border: 'none', background: 'transparent', color: '#c1a98f', cursor: 'pointer', fontSize: '12px' }}>ลบ</button>
          </>
        )}
      </div>
    );
    if (cardMode === 'literary') {
      return (
        <div key={w.id} style={{ ...baseCard, padding: '20px 18px 15px' }}>
          <span style={{ position: 'absolute', top: '-8px', left: '9px', fontFamily: 'Georgia,serif', fontSize: '64px', lineHeight: 1, color: rgba(accent, 0.15), zIndex: 0 }}>“</span>
          <div style={{ fontFamily: FF, fontSize: fsz(SZ.lw), fontWeight: FWEIGHT, color: '#33291f', lineHeight: 1.3, textWrap: 'pretty', position: 'relative', zIndex: 1 }}>{w.text}</div>
          {w.meaning && w.meaning.trim() && <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#8a7d6d', marginTop: '8px', lineHeight: 1.5 }}>{w.meaning}</div>}
          {footer}
        </div>
      );
    }
    if (cardMode === 'index') {
      return (
        <div key={w.id} style={{ ...baseCard, padding: '0 15px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 -15px 11px', padding: '6px 15px', background: monoMode ? '#efe4cc' : rgba(cat.c, 0.16), color: monoMode ? '#5c5044' : shade(cat.c), borderBottom: '1px solid ' + (isDup ? dupB : '#ecdcbf'), fontSize: '12px', fontWeight: 600 }}>{cat.k}  {cat.n}</div>
          <div style={{ fontFamily: FF, fontSize: fsz(SZ.w), fontWeight: FWEIGHT, color: '#33291f', lineHeight: 1.35, textWrap: 'pretty', paddingBottom: '8px', borderBottom: '1px dashed #e0d0ac' }}>{w.text}</div>
          {w.meaning && w.meaning.trim() && <div style={{ fontSize: '13.5px', color: '#8a7d6d', marginTop: '8px', lineHeight: 1.4 }}>{w.meaning}</div>}
          {footer}
        </div>
      );
    }
    return (
      <div key={w.id} style={{ ...baseCard, padding: '14px 15px', borderLeft: '3px solid ' + (isDup ? dupB : bar) }}>
        <div style={{ fontFamily: FF, fontSize: fsz(SZ.w), fontWeight: FWEIGHT, color: '#33291f', lineHeight: 1.35, textWrap: 'pretty' }}>{w.text}</div>
        {w.meaning && w.meaning.trim() && <div style={{ fontSize: '13.5px', color: '#8a7d6d', marginTop: '5px', lineHeight: 1.4 }}>{w.meaning}</div>}
        {footer}
      </div>
    );
  };

  const renderRow = (w) => {
    const cat = getCat(w.category);
    const dupN = isDupWord(w), isDup = dupN > 1, nBranch = branchesOf(w);
    const confirming = S.confirmId === w.id;
    return (
      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 15px', borderBottom: '1px solid #f0e6cd', background: isDup ? rgba(accent, 0.08) : 'var(--surface,#fffdf6)' }}>
        <span style={dot(cat, monoMode)} />
        <span style={{ fontFamily: "var(--font-trirong),serif", fontSize: '17px', color: '#33291f', flex: 'none' }}>{w.text}</span>
        {w.meaning && w.meaning.trim() && <span style={{ fontSize: '14px', color: '#a0937d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {w.meaning}</span>}
        <span style={{ flex: 1 }} />
        {isDup && <button onClick={() => app.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' })} style={{ border: '1px solid ' + rgba(accent, 0.5), background: rgba(accent, 0.1), color: 'var(--accent,#9c3b2b)', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', cursor: 'pointer', flex: 'none' }}>⚠ ซ้ำ ×{dupN}</button>}
        {!isDup && nBranch > 1 && <button title={"คำนี้ติดไว้ " + nBranch + " กิ่ง กดเพื่อดูทุกกิ่ง"} onClick={() => app.setState({ exactFilter: w.text, dupOnly: false, filterCat: 'all' })} style={{ border: '1px solid #c6bcda', background: '#efe9f7', color: '#5f4c80', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', cursor: 'pointer', flex: 'none' }}>↺ อยู่ {thNum(nBranch)} กิ่ง</button>}
        <span style={{ fontSize: '12px', color: '#b0a184', whiteSpace: 'nowrap' }}>✦ {w.novel}</span>
        {confirming ? (
          <>
            <button onClick={app.doDelete(w.id)} style={{ border: 'none', background: 'transparent', color: 'var(--accent,#9c3b2b)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>ยืนยันลบ</button>
            <button onClick={app.cancelDelete} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '13px' }}>ยกเลิก</button>
          </>
        ) : (
          <>
            <button onClick={app.openEdit(w)} style={{ border: 'none', background: 'transparent', color: '#8a7d6d', cursor: 'pointer', fontSize: '13px' }}>แก้ไข</button>
            <button onClick={app.askDelete(w.id)} style={{ border: 'none', background: 'transparent', color: '#c1a98f', cursor: 'pointer', fontSize: '13px' }}>ลบ</button>
          </>
        )}
      </div>
    );
  };

  // ลูกศรยุบ/กางหน้าหัวข้อหมวด — ทำให้เด่นขึ้น (พี่กัน 2026-07-20b): สีน้ำตาลเข้ม primary + ใหญ่ + หนา (เดิมจางเล็ก #b0a184 11px) · ไม่ใส่กรอบหนากันแน่น
  const chev = (collapsed) => (
    <span style={{ display: 'inline-block', width: '16px', color: 'var(--primary,#6f4e37)', fontSize: '13px', fontWeight: 800, transition: 'transform .15s', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>▼</span>
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
              <div onClick={app.toggleCollapse(key)} style={bandStyle}>
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
  // สารบัญต้องหลบใต้แถบค้นหาที่ตรึงอยู่ ไม่งั้นโดนทับ (69 = ความสูงแบนเนอร์ · +10 เว้นช่องไฟ)
  // มือถือ: แถบกรองไม่ตรึง (สูงเกินไป จะบังครึ่งจอ) → หัวข้อหมวดเกาะใต้แบนเนอร์อย่างเดียว
  // แถบค้นหา/ตัวกรองตรึงทั้ง 2 จอแล้ว → หัวข้อหมวด (และสารบัญจอคอม) หลบใต้แถบด้วยความสูงจริงที่วัดไว้ (libStickH)
  const tocTop = navStyle !== 'tabs' ? 16 : (S.bannerH + S.libStickH + 10);
  const toc = (
    <aside style={{ width: '236px', flex: 'none', position: 'sticky', top: tocTop + 'px', alignSelf: 'flex-start', maxHeight: 'calc(100vh - ' + (tocTop + 20) + 'px)', overflow: 'auto', paddingRight: '6px' }}>
      <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '19px', color: 'var(--accent,#9c3b2b)', margin: '0 0 10px' }}>สารบัญ</div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={app.collapseAll(allCatKeys)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '7px 8px', border: '1px solid #ddcba4', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#5c5044', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '19px', height: '19px', borderRadius: '6px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '9px', flex: 'none', boxShadow: '0 1px 2px rgba(90,60,30,.25)' }}>▲</span>
          ยุบทั้งหมด
        </button>
        <button onClick={app.expandAll} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '7px 8px', border: '1px solid #ddcba4', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#5c5044', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '19px', height: '19px', borderRadius: '6px', background: 'var(--accent,#9c3b2b)', color: '#fbf3e2', fontSize: '9px', flex: 'none', boxShadow: '0 1px 2px rgba(90,60,30,.25)' }}>▼</span>
          ขยายทั้งหมด
        </button>
      </div>
      {visCats.map((g) => {
        const catKey = 'g-' + g.cat.id;
        // สารบัญกิ่งชั้นแรก — เรียงตามโครงตั้งต้นก่อน แล้วต่อท้ายด้วยกิ่งใหม่ที่ยังไม่มีในโครง
        // (ต้องรวมกิ่งใหม่ ไม่งั้นกิ่งที่พี่กัน/AI สร้างเองจะไม่โผล่ในสารบัญ)
        const l1Names = (SUBTREE[g.cat.id] || []).map((n) => n.name);
        const usedNames = [...new Set(g.items.map((w) => (w.subpath || '').split(' / ')[0]).filter(Boolean))];
        const l1 = [...l1Names.filter((nm) => usedNames.includes(nm)), ...usedNames.filter((nm) => !l1Names.includes(nm))]
          .map((nm, i) => ({ n: { name: nm }, key: catKey + '-' + i }));
        return (
          <div key={g.cat.id} style={{ marginBottom: '4px' }}>
            <div onClick={app.jumpTo(catKey, [catKey])} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 4px', cursor: 'pointer', borderRadius: '6px' }}>
              <span style={badge(g.cat, monoMode)}>{g.cat.k}</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600, color: '#4a3f35', lineHeight: 1.2 }}>{g.cat.n}</span>
              <span style={{ fontSize: '11px', color: '#b8aa8e' }}>{g.items.length}</span>
            </div>
            <div style={{ paddingLeft: '30px' }}>
              {l1.map(({ n, key }) => (
                <div key={key} onClick={app.jumpTo(key, [catKey, key])} style={{ fontSize: '12.5px', color: '#8a7d6d', padding: '3px 4px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</div>
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

      {/* แถบค้นหา/ตัวกรอง + ชิปหมวด = ตรึงเป็นก้อนเดียว (กดบ่อยสุด เลื่อนดูคำล่าง ๆ ก็ยังกรองได้) */}
      <div ref={app._libStickRef} style={{ position: 'sticky', top: S.bannerH + 'px', zIndex: 16, background: 'var(--paper,#e7dbc0)', paddingTop: '4px' }}>
      {S.isMobile ? (
        /* ===== มือถือ: แถบตรึง 3 แถวชิดๆ (พี่กันกำหนด) — กันแบนเนอร์ตรึงสูงเกินจนบังคำ =====
           แถว 1 ค้นหา+ชนิดวลี+เรียง · แถว 2 เลือกนิยาย (หลายเรื่อง) · แถว 3 เลือกหมวดวลี */
        <>
          <div style={{ display: 'flex', gap: '7px', alignItems: 'center', marginBottom: '7px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#b0a184', fontSize: '15px' }}>⌕</span>
              <input value={S.q} onChange={app.onQ} placeholder="ค้นหา…" style={{ width: '100%', padding: '10px 8px 10px 30px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none', fontSize: '14px' }} />
            </div>
            <select value={S.filterKind} onChange={(e) => app.setState({ filterKind: e.target.value })} title="กรองตามชนิด" style={{ flex: 'none', padding: '10px 5px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', fontSize: '13px' }}>
              <option value="all">ชนิดวลี</option><option value="word">คำ</option><option value="phrase">วลี</option><option value="sentence">ประโยค</option>
            </select>
            <select value={S.sort} onChange={app.onSort} title="เรียงลำดับ" style={{ flex: 'none', padding: '10px 5px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', fontSize: '13px' }}>
              <option value="recent">เรียง</option><option value="old">เก่าก่อน</option><option value="az">ก - ฮ</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '7px', marginBottom: '7px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>{novelPicker(true)}</div>
            {fontPicker()}
          </div>
          <select value={S.filterCat} onChange={(e) => app.setFilterCat(e.target.value)()} style={{ width: '100%', marginBottom: '12px', padding: '11px 13px', border: '1px solid ' + (S.filterCat === 'all' ? '#d8c7a2' : 'var(--primary,#6f4e37)'), borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', fontSize: '14px', fontWeight: 600, outline: 'none' }}>
            <option value="all">เลือกหมวดวลี ({ctxLib.length})</option>
            {S.categories.map((c) => {
              const cnt = ctxLib.filter((w) => w.category === c.id).length;
              if (!cnt) return null;
              return <option key={c.id} value={c.id}>{c.n} ({cnt})</option>;
            })}
          </select>
        </>
      ) : (
        /* ===== จอคอม: แถวตัวกรองเดียว (flex-wrap) เหมือนเดิม — เปลี่ยนแค่ นิยาย=เลือกหลายเรื่อง + ชื่อ ชนิดวลี/เรียง ===== */
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '420px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b0a184', fontSize: '16px' }}>⌕</span>
            <input value={S.q} onChange={app.onQ} placeholder="ค้นหาคำ วลี หรือความหมาย…" style={{ width: '100%', padding: '11px 14px 11px 38px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
          </div>
          {novelPicker(false)}
          <select value={S.filterKind} onChange={(e) => app.setState({ filterKind: e.target.value })} title="กรองตามชนิด" style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>
            <option value="all">ชนิดวลี</option><option value="word">คำ</option><option value="phrase">วลี</option><option value="sentence">ประโยค</option>
          </select>
          {/* กรองตามช่องเติมคำ — โผล่เฉพาะตอนในคลังมีคำที่มีช่องเติมจริง */}
          {withSlotCount > 0 && (
            <select value={S.filterSlot} onChange={(e) => app.setState({ filterSlot: e.target.value })} title="กรองตามช่องเติมคำ เช่น [ชื่อคน]" style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>
              <option value="all">ช่องเติมคำ: ทั้งหมด</option>
              <option value="any">มีช่องเติมคำ ({withSlotCount})</option>
              <option value="none">ไม่มีช่องเติมคำ</option>
              {slotOpts.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
            </select>
          )}
          <select value={S.sort} onChange={app.onSort} title="เรียงลำดับ" style={{ padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>
            <option value="recent">เรียง</option><option value="old">เก่าก่อน</option><option value="az">ก - ฮ</option>
          </select>
          {!S.isMobile && (
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
              {[['cards', 'การ์ด'], ['list', 'รายการ']].map(([k, label]) => <button key={k} onClick={app.setLibView(k)} style={seg(S.libView === k)}>{label}</button>)}
            </div>
          )}
          {isCards && !S.isMobile && (
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
              {[['s', 'เล็ก'], ['m', 'กลาง'], ['l', 'ใหญ่']].map(([k, label]) => <button key={k} onClick={app.setUi('cardSize', k)} style={seg(cardSize === k)}>{label}</button>)}
            </div>
          )}
          {isCards && !S.isMobile && (
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
              {[['trirong', 'ไทรรงค์', "var(--font-trirong),serif"], ['sarabun', 'สารบรรณ', "var(--font-sarabun),sans-serif"], ['thsarabun', 'สารบรรณราชการ', "var(--font-thsarabun),sans-serif"], ['cordia', 'คอร์เดีย', "'Cordia New','CordiaUPC','Cordia',var(--font-sarabun),sans-serif"], ['maitree', 'ไมตรี', "var(--font-maitree),serif"], ['chonburi', 'ชลบุรี', "var(--font-chonburi),serif"]].map(([k, label, ff]) => <button key={k} onClick={app.setUi('wordFont', k)} style={{ ...seg(wordFont === k), fontFamily: ff, fontSize: ({ trirong: 14, sarabun: 16, thsarabun: 23, cordia: 19, maitree: 14, chonburi: 15 })[k] + 'px', fontWeight: (k === 'thsarabun' || k === 'cordia') ? 700 : undefined }}>{label}</button>)}
            </div>
          )}
        </div>
      )}

      {(dupTotal > 0 || S.exactFilter) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          {dupTotal > 0 && <button onClick={app.toggleDupOnly} style={{ padding: '6px 13px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: '1px solid ' + rgba(accent, 0.5), background: S.dupOnly ? 'var(--accent,#9c3b2b)' : rgba(accent, 0.08), color: S.dupOnly ? '#fbf3e2' : 'var(--accent,#9c3b2b)', fontWeight: 600 }}>⚑ ดูเฉพาะคำซ้ำ ({dupTotal})</button>}
          {S.exactFilter && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: rgba(accent, 0.1), border: '1px solid ' + rgba(accent, 0.4), fontSize: '13px', color: 'var(--accent,#9c3b2b)' }}>กรองคำ: “{S.exactFilter}” <button onClick={app.clearExact} style={{ border: 'none', background: 'transparent', color: 'var(--accent,#9c3b2b)', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>✕</button></span>}
        </div>
      )}

      {/* จอคอม: ชิปหมวดสีเรียงเหมือนเดิมทุก pixel (มือถือย้ายไปเป็นดรอปดาวน์ "เลือกหมวดวลี" แถว 3 ในแถบตรึงด้านบนแล้ว) */}
      {!S.isMobile && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '26px' }}>
          <button onClick={app.setFilterCat('all')} style={catChipStyle(S.filterCat === 'all')}>ทั้งหมด <span style={{ opacity: 0.6 }}>{ctxLib.length}</span></button>
          {S.categories.map((c) => {
            const cnt = ctxLib.filter((w) => w.category === c.id).length;
            if (!cnt) return null;
            return <button key={c.id} onClick={app.setFilterCat(c.id)} style={catChipStyle(S.filterCat === c.id)}><span style={dot(c, monoMode)} />{c.n} <span style={{ opacity: 0.6 }}>{cnt}</span></button>;
          })}
        </div>
      )}
      </div>

      {/* มือถือไม่มีสารบัญข้าง → ยกปุ่มยุบ/กางทุกหมวดมาไว้ตรงนี้แทน */}
      {S.isMobile && anyResults && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={app.collapseAll(allCatKeys)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 8px', border: '1px solid #ddcba4', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#5c5044', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '7px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '10px', flex: 'none', boxShadow: '0 1px 2px rgba(90,60,30,.25)' }}>▲</span>
            ยุบทุกหมวด
          </button>
          <button onClick={app.expandAll} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 8px', border: '1px solid #ddcba4', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#5c5044', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '7px', background: 'var(--accent,#9c3b2b)', color: '#fbf3e2', fontSize: '10px', flex: 'none', boxShadow: '0 1px 2px rgba(90,60,30,.25)' }}>▼</span>
            กางทุกหมวด
          </button>
        </div>
      )}

      {!anyResults && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a99b83' }}>
          <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '26px' }}>ไม่พบคำที่ค้นหา</div>
          <p style={{ color: '#8a7d6d' }}>ลองเปลี่ยนคำค้น หรือล้างตัวกรองดู</p>
        </div>
      )}

      {anyResults && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {!S.isMobile && toc}
          <div style={{ flex: 1, minWidth: 0 }}>
            {visCats.map((g) => {
              const catKey = 'g-' + g.cat.id;
              const isCol = !!S.collapsed[catKey];
              const cm = CATMETA[g.cat.id] || {};
              const mob = S.isMobile;
              const bigBadge = { ...badge(g.cat, monoMode), width: mob ? '26px' : '36px', height: mob ? '26px' : '36px', fontSize: mob ? '13px' : '17px' };
              return (
                <div key={g.cat.id} id={catKey} style={{ marginBottom: mob ? '20px' : '30px', scrollMarginTop: (tocTop + 6) + 'px' }}>
                  {/* หัวข้อหมวดตรึงไว้ระหว่างเลื่อนอ่านหมวดนั้น พอเลื่อนถึงหมวดถัดไป หัวข้อใหม่จะดันหัวข้อเก่าออกแล้วค้างแทน
                      (sticky ทำงานในขอบเขตกล่องหมวดของตัวเอง จึงเปลี่ยนหัวตามหมวดอัตโนมัติ) · พื้นทึบกันคำด้านหลังทะลุ
                      มือถือ: หัวข้อกะทัดรัด (ตัวเล็ก · ซ่อนชื่ออังกฤษ+คำบรรยาย) กันหัวข้อตรึงสูงจนบังคำ */}
                  <div onClick={app.toggleCollapse(catKey)} style={{ position: 'sticky', top: tocTop + 'px', zIndex: 12, cursor: 'pointer', userSelect: 'none', padding: mob ? '9px 12px' : '13px 16px', background: monoMode ? '#f2ead7' : mix(g.cat.c, '#fffdf6', 0.88), border: '1px solid ' + (monoMode ? '#ddcba4' : rgba(g.cat.c, 0.32)), borderLeft: '5px solid ' + (monoMode ? '#c9b78f' : g.cat.c), borderRadius: '12px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(120,90,50,.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: mob ? '8px' : '11px' }}>
                      {chev(isCol)}
                      <span style={bigBadge}>{g.cat.k}</span>
                      <h2 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 700, fontSize: mob ? '17px' : '24px', margin: 0, color: '#33291f', lineHeight: 1.15 }}>{g.cat.n}</h2>
                      {cm.en && !mob && <span style={{ fontSize: '13.5px', fontStyle: 'italic', color: monoMode ? '#8a7d6d' : shade(g.cat.c), letterSpacing: '.3px' }}>{cm.en}</span>}
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: mob ? '12px' : '13px', color: '#8a7d6d', whiteSpace: 'nowrap' }}>{g.items.length} คำ</span>
                    </div>
                    {cm.desc && !mob && <div style={{ fontSize: '13.5px', color: '#8a7d6d', margin: '6px 0 0', paddingLeft: '31px', textWrap: 'pretty' }}>{cm.desc}</div>}
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
