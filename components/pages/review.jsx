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

export function renderReview(app, getCat, monoMode, spell, effLayout) {
  const ST = app.state;
  // มือถือ: มุมมองตาราง/คอลัมน์เป็นแบบหลายคอลัมน์กว้าง ไม่เหมาะจอแคบ → ใช้การ์ดแทน
  if (ST.isMobile && (effLayout === 'table' || effLayout === 'columns')) effLayout = 'cards';
  if (ST.review.length === 0) {
    return (
      <section style={{ maxWidth: '100%', margin: '0 auto', animation: 'wbfade .35s ease' }}>
        <div style={{ textAlign: 'center', padding: '90px 20px' }}>
          <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '30px', color: '#c3b48f' }}>ยังไม่มีคำรอตรวจทาน</div>
          <p style={{ color: '#8a7d6d', margin: '8px 0 22px' }}>ไปที่หน้า “เพิ่มคำ” วางข้อความ แล้วให้ AI ช่วยจัดก่อน</p>
          <button onClick={app.onNav('add')} style={{ padding: '12px 22px', border: 'none', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>＋ ไปเพิ่มคำ</button>
        </div>
      </section>
    );
  }
  // ===== ช่อคำ =====  จอแสดงทีละช่อ → ทุกมุมมองข้างล่างมองเห็นเฉพาะคำในช่อที่เปิดอยู่ (S.review ถูกย่อขอบเขตไว้แล้ว)
  const batches = app.batchList();
  const activeId = app.activeBatchId();
  const activeMeta = batches.find((b) => b.id === activeId) || { no: 1, ai: '', novel: '', count: 0 };
  const batchScoped = ST.review.filter((r) => (r.batch || 'b_legacy') === activeId);
  // ตัวกรอง "เฉพาะกิ่งใหม่" — เหลือแต่คำที่มีกิ่งซึ่งยังไม่มีในคลัง (ป้าย ✦ เขียว) ไว้ตรวจอนุมัติทีเดียว
  const knownForFilter = app.knownPaths();
  const hasNewBranch = (r) => pathsOf(r).some((p) => !knownForFilter.has(p));
  const newBranchCount = batchScoped.filter(hasNewBranch).length; // จำนวน "คำ" ที่มีกิ่งใหม่
  // จำนวน "กิ่ง" ที่ไม่ซ้ำกันจริง ๆ — คนละตัวเลขกับจำนวนคำ (กิ่งเดียวใช้กับหลายคำได้)
  // ต้องแยกให้ชัด เพราะเวลาเทส AI ใช้ตัวเลขนี้ตัดสินว่าโมเดลประดิษฐ์กิ่งมั่วแค่ไหน
  // เก็บเป็น map "ชื่อกิ่ง → จำนวนคำที่ใช้กิ่งนั้น" เพื่อโชว์เป็นลิสให้เห็นครบโดยไม่ต้องกดเข้าไปนับเอง
  const newBranchMap = new Map();
  batchScoped.forEach((r) => pathsOf(r).forEach((p) => { if (!knownForFilter.has(p)) newBranchMap.set(p, (newBranchMap.get(p) || 0) + 1); }));
  const newBranchList = [...newBranchMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'));
  const newBranchNames = new Set(newBranchMap.keys());
  const newBranchKinds = newBranchMap.size;
  // เลือกดูเฉพาะกิ่งเดียว (กดชิปในลิส) — ถ้ากิ่งนั้นหายไปแล้วให้ตกกลับเป็นดูทุกกิ่งใหม่
  const pick = ST.branchPick && newBranchMap.has(ST.branchPick) ? ST.branchPick : '';
  const scopedReview = pick ? batchScoped.filter((r) => pathsOf(r).includes(pick))
    : ST.newBranchOnly ? batchScoped.filter(hasNewBranch) : batchScoped;
  const S = { ...ST, review: scopedReview };
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
    return <span onClick={() => app.setBatch(other.batch || 'b_legacy')} title="คำนี้มีในช่ออื่นด้วย กดเพื่อไปดูใบนั้น" style={{ flex: 'none', fontSize: '11px', fontWeight: 700, color: '#5f4c80', background: '#efe9f7', border: '1px solid #c6bcda', padding: '2px 9px', borderRadius: '20px', whiteSpace: 'nowrap', cursor: 'pointer' }}>↺ ซ้ำกับช่อที่ {thNum(other.batchNo || 1)}</span>;
  };
  const crossItems = S.review.filter((r) => otherBatchText.has((r.text || '').trim()));
  // ลบคำซ้ำข้ามช่อ = ลบใบที่อยู่ในช่อนี้ (ใบในช่อก่อนหน้ายังอยู่)
  const removeCrossDup = () => {
    const ids = new Set(crossItems.map((r) => r.id));
    app.askConfirm({ title: 'ลบคำซ้ำข้ามช่อ', msg: 'ลบคำในช่อนี้ที่ซ้ำกับช่ออื่น ' + ids.size + ' คำ (ใบในช่อก่อนหน้ายังอยู่)', okLabel: 'ลบคำซ้ำ', danger: true, onOk: () => { app.setState((s) => ({ review: s.review.filter((r) => !ids.has(r.id)) }), app.persistReviewNow); app.flash('ลบคำซ้ำข้ามช่อ ' + ids.size + ' คำ'); } });
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
  const statusCell = (r) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>{cutMark(r)}{dupBadge(r)}{crossBadge(r)}</div>;
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
      return <div onClick={editable ? () => app.setState({ editCard: r.id }) : undefined} title={editable ? 'กดเพื่อแก้คำ' : undefined} style={{ ...baseStyle, cursor: editable ? 'text' : 'inherit', whiteSpace: 'normal' }}>{highlightWords(r.text, pulled)}</div>;
    }
    if (!editable) return <span style={baseStyle}>{r.text}</span>;
    // ดึง borderBottom ออกจาก baseStyle ก่อน แล้วใส่ทีหลัง 'border:none' → เส้นประไม่ถูกลบ
    // (ถ้าปล่อยไว้ใน spread ตำแหน่ง key จะอยู่ก่อน border:none แล้วโดนลบ)
    const { borderBottom: bb, ...rest } = baseStyle;
    return <input value={r.text} autoFocus={!!(has && S.editCard === r.id)} onBlur={has ? () => app.setState({ editCard: null }) : undefined} onChange={(e) => app.updateReview(r.id, { text: e.target.value })} style={{ ...rest, border: 'none', background: 'transparent', outline: 'none', borderBottom: bb || 'none' }} />;
  };
  // ---- ป้ายหมวดย่อย (หลายกิ่งต่อคำ) — ตัวกลางตัวเดียว ใช้ทุกมุมมอง ----
  // กิ่งที่ยังไม่มีในคลัง/โครงตั้งต้น = กิ่งใหม่ที่ AI เสนอ → ติดป้าย ✦ ให้เห็นชัด
  const known = app.knownPaths();
  const pathTags = (r, size) => {
    const paths = pathsOf(r);
    const small = size === 'sm';
    const adding = S.addPathFor === r.id;
    return (
      <div style={{ display: 'flex', gap: small ? '4px' : '5px', flexWrap: 'wrap', alignItems: 'center', marginTop: small ? '0' : '6px' }}>
        {paths.map((p) => {
          const isNew = !known.has(p);
          // ในตาราง/คอลัมน์ที่ช่องแคบ โชว์เฉพาะชั้นสุดท้ายของเส้นทาง (ชี้เมาส์ดูเต็ม) จะได้ไม่ล้นแถว
          const label = small && p.includes(' / ') ? '… ' + p.split(' / ').pop() : p;
          return (
            <span key={p} title={(isNew ? '✦ กิ่งใหม่ที่ยังไม่มีในคลัง — ' : '') + p} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: small ? '11px' : '11.5px', padding: small ? '1px 3px 1px 8px' : '2px 4px 2px 9px', borderRadius: '20px', background: isNew ? '#e9efe1' : '#f0e8d4', border: '1px solid ' + (isNew ? '#cbdcb8' : '#e4d8bd'), color: isNew ? '#5a7040' : '#8a7d6d', maxWidth: '100%' }}>
              {isNew && <span style={{ fontWeight: 700 }}>✦</span>}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: small ? '124px' : '230px' }}>{label}</span>
              <button onClick={() => app.setReviewPaths(r.id, paths.filter((x) => x !== p))} title="เอากิ่งนี้ออก" style={{ border: 'none', background: 'transparent', color: '#bcac8f', cursor: 'pointer', fontSize: small ? '12px' : '13px', lineHeight: 1, padding: '0 2px' }}>✕</button>
            </span>
          );
        })}
        {adding ? (
          <input autoFocus defaultValue="" list="wb-paths" placeholder="พิมพ์เส้นทาง เช่น แสงและเงา / เงา"
            onChange={(e) => { app._newPath = e.target.value; }}
            onKeyDown={(e) => { if (e.key === 'Enter') app.addReviewPath(r); if (e.key === 'Escape') app.setState({ addPathFor: null }); }}
            onBlur={() => app.addReviewPath(r)}
            style={{ fontSize: '11.5px', padding: '3px 9px', borderRadius: '20px', border: '1px dashed #b8a06a', outline: 'none', minWidth: small ? '150px' : '190px', background: 'var(--surface,#fffdf6)', color: '#4a4034' }} />
        ) : (
          // ช่องแคบ (ตาราง/คอลัมน์) ใช้ปุ่ม ＋ ตัวเดียว จะได้อยู่บรรทัดเดียวกับป้าย ไม่ดันแถวให้สูงไม่เท่ากัน
          <button onClick={() => { app._newPath = ''; app.setState({ addPathFor: r.id }); }} title="เพิ่มหมวดย่อยอีกกิ่ง"
            style={{ fontSize: small ? '12px' : '11.5px', padding: small ? '0 7px' : '2px 10px', borderRadius: '20px', border: '1px dashed #ddcba4', background: 'transparent', color: '#a99b83', cursor: 'pointer', lineHeight: small ? '19px' : 'normal', flex: 'none' }}>{small ? '＋' : '＋ หมวดย่อย'}</button>
        )}
      </div>
    );
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

  // full = ยืดเต็มความกว้างคอลัมน์ (ใช้ในตาราง เพื่อให้ทุกแถวขอบตรงกัน ไม่กว้างสั้นตามชื่อหมวด)
  const catSelect = (r, full) => {
    const cat = getCat(r.category);
    return (
      <select value={r.category} title={cat.n} onChange={(e) => app.updateReview(r.id, { category: e.target.value, proposedNew: false }, true)} style={{ ...pill(cat, monoMode), ...(full ? { width: '100%', boxSizing: 'border-box' } : null) }}>
        {catOptions.map((c) => <option key={c.id} value={c.id}>{c.badgeLabel}</option>)}
      </select>
    );
  };
  const KINDS3 = [['word', 'คำ'], ['phrase', 'วลี'], ['sentence', 'ประโยค']];
  const kindSelect = (r) => (
    <select value={KINDS3.some(([v]) => v === r.kind) ? r.kind : 'word'} onChange={(e) => app.updateReview(r.id, { kind: e.target.value }, true)} title="ชนิด (กดเปลี่ยนได้)"
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
          const gv = (r) => rs.key === 'cat' ? (getCat(r.category).n || '')
            : rs.key === 'kind' ? (r.kind || '')
            : rs.key === 'subpath' ? (pathsOf(r)[0] || 'ฮฮฮ') // ไม่มีกิ่ง = ไปท้ายสุด
            : (r.text || '');
          c = gv(a).localeCompare(gv(b), 'th');
        }
        return rs.dir === 'asc' ? c : -c;
      })
    : S.review;
  const sortH = (key, label) => (
    <span onClick={() => app.toggleReviewSort(key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{rs && rs.key === key ? (rs.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
    </span>
  );
  const cardSortOpts = [['', 'ตามที่ AI แยก'], ['text:asc', 'คำ/วลี ก-ฮ'], ['text:desc', 'คำ/วลี ฮ-ก'], ['cat:asc', 'ตามหมวด'], ['kind:asc', 'ตามชนิด'], ['status:asc', 'ตามสถานะ']];
  const cardsView = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#8a7d6d', cursor: 'pointer' }}>
          <input type="checkbox" checked={allSelected} onChange={app.selectAll} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)' }} />เลือกทั้งหมด
        </label>
        <span style={{ fontSize: '13px', color: '#8a7d6d', marginLeft: 'auto' }}>เรียงตาม</span>
        <select value={rs ? rs.key + ':' + rs.dir : ''} onChange={(e) => { const v = e.target.value; if (!v) { app.setState({ reviewSort: null }); } else { const [key, dir] = v.split(':'); app.setState({ reviewSort: { key, dir } }); } }} style={{ padding: '7px 11px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#4a4034', fontSize: '13.5px', cursor: 'pointer', outline: 'none' }}>
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
                <input type="checkbox" checked={r.selected} onChange={() => app.toggleSel(r.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
                {kindSelect(r)}
                {catSelect(r)}
                <div style={{ flex: 1 }} />
                <button onClick={() => app.removeReview(r.id)} title="ลบคำนี้" style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
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
              <input value={r.meaning} onChange={(e) => app.updateReview(r.id, { meaning: e.target.value })} placeholder="＋ เพิ่มความหมาย (ไม่บังคับ)" style={{ width: '100%', fontSize: '14px', color: '#6f6252', border: 'none', background: 'transparent', padding: '8px 0 2px', outline: 'none' }} />
              {/* เหตุผลที่ AI เขียนกำกับ — มีเฉพาะคำที่กำกวม อยู่หลายกิ่ง หรือเสนอกิ่งใหม่
                  ช่วยให้ตัดสินใจได้เร็วว่าจะเอาตามที่ AI จัด หรือย้ายเอง (ผลทดสอบพบว่าโมเดลจัดตรงกันแค่ 29%) */}
              {r.reason ? (
                <div style={{ marginTop: '8px', padding: '8px 11px', background: '#f7f1e2', borderLeft: '3px solid #d9c9a4', borderRadius: '0 8px 8px 0', fontSize: '12.5px', color: '#7a6c58', lineHeight: 1.65 }}>
                  <span style={{ color: '#b0a084' }}>💭 </span>{r.reason}
                </div>
              ) : null}
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
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>{pathTags(r)}</div>
            </div>
          );
        })}
      </div>
    </>
  );

  // กรอบนอกห้ามใส่ overflow:hidden เพราะจะทำให้หัวตารางตรึงไม่ติด (กลายเป็น scroll container ของตัวเอง)
  const tableView = (
    <div style={{ border: '1px solid #e0d0ac', borderRadius: '12px', background: 'var(--surface,#fffdf6)' }}>
      {/* หัวตารางตรึงต่อใต้ก้อนแท็บ+แถบเครื่องมือพอดี (69px = แบนเนอร์ + ความสูงจริงของก้อนตรึงที่วัดมา) */}
      <div style={{ position: 'sticky', top: (S.bannerH + S.stickH) + 'px', zIndex: 14, display: 'grid', gridTemplateColumns: '34px minmax(0,1.25fr) 120px 165px minmax(0,1.05fr) minmax(0,1fr) 34px', gap: '12px', padding: '12px 16px', background: '#f0e6cd', borderBottom: '1px solid #e0d0ac', borderRadius: '11px 11px 0 0', fontSize: '12px', fontWeight: 600, color: '#8a7d6d', letterSpacing: '.4px' }}>
        <input type="checkbox" checked={allSelected} onChange={app.selectAll} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
        {sortH('text', 'คำ / วลี')}{sortH('status', 'สถานะ')}{sortH('cat', 'หมวด')}{sortH('subpath', 'หมวดย่อย')}<span>ความหมาย</span><span></span>
      </div>
      {sortedReview.map((r) => {
        const hasSpell = !!r.original && r.original !== r.text;
        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1.25fr) 120px 165px minmax(0,1.05fr) minmax(0,1fr) 34px', gap: '12px', padding: '9px 16px', borderBottom: '1px solid #f0e6cd', alignItems: 'center', minHeight: '52px', background: r.selected ? '#faf4e6' : 'transparent' }}>
            <input type="checkbox" checked={r.selected} onChange={() => app.toggleSel(r.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary,#6f4e37)', cursor: 'pointer' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {kindSelect(r)}
                {renderWord(r, { flex: 1, fontFamily: "var(--font-trirong),serif", fontSize: '17px', fontWeight: 500, color: '#33291f', padding: '5px 0', lineHeight: 1.4 }, true)}
              </div>
              {pulledBadge(r) ? <div style={{ marginTop: '3px' }}>{pulledBadge(r)}</div> : null}
              {hasSpell && <div style={{ fontSize: '12px', color: 'var(--accent,#9c3b2b)' }}>✎ เดิม: {r.original}</div>}
            </div>
            <div>{statusCell(r)}</div>
            {catSelect(r, true)}
            <div style={{ paddingTop: '2px' }}>{pathTags(r, 'sm')}</div>
            <input value={r.meaning} onChange={(e) => app.updateReview(r.id, { meaning: e.target.value })} placeholder="＋ ความหมาย" style={{ width: '100%', fontSize: '14px', color: '#6f6252', border: 'none', background: 'transparent', outline: 'none', padding: '7px 0' }} />
            <button onClick={() => app.removeReview(r.id)} style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '17px', cursor: 'pointer', paddingTop: '6px' }}>✕</button>
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
            <div key={c.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (app._drag) { app.updateReview(app._drag, { category: c.id, proposedNew: false }); app._drag = null; } }} style={{ background: '#f6eed9', border: '1px dashed ' + rgba(c.c, 0.5), borderRadius: '12px', padding: '13px 12px', minHeight: '78px', opacity: items.length ? 1 : 0.62 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '11px' }}>
                <span style={badge(c, monoMode)}>{c.k}</span>
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#4a3f35', flex: 1, lineHeight: 1.25 }}>{c.n}</span>
                <span style={{ fontSize: '12px', color: '#a99b83' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '30px' }}>
                {items.map((r) => {
                  const hasSpell = !!r.original && r.original !== r.text;
                  return (
                    <div key={r.id} draggable onDragStart={(e) => { app._drag = r.id; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }} style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px 10px', background: 'var(--surface,#fffdf6)', border: '1px solid ' + rgba(c.c, 0.35), borderLeft: '3px solid ' + c.c, borderRadius: '8px', cursor: 'grab', boxShadow: '0 1px 2px rgba(120,90,50,.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {hasSpell && <span title="แก้สะกดแล้ว" style={{ flex: 'none', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent,#9c3b2b)' }} />}
                        {renderWord(r, { flex: 1, fontFamily: "var(--font-trirong),serif", fontSize: '15px', color: '#33291f' }, false)}
                        <button onClick={() => app.removeReview(r.id)} style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                      </div>
                      {pathTags(r, 'sm')}
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
  const delBtn = (r) => <button onClick={() => app.removeReview(r.id)} title="ลบคำนี้" style={{ border: 'none', background: 'transparent', color: '#bcac8f', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>;
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
                        <div style={{ flexBasis: '100%' }}>{pathTags(r, 'sm')}</div>
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
          // จัดกลุ่มตามหมวดย่อย — คำที่ติดหลายกิ่งจะโผล่ในทุกกิ่งที่ติดไว้
          const bySub = new Map();
          items.forEach((r) => {
            const ps = pathsOf(r);
            (ps.length ? ps : ['— ไม่ระบุหมวดย่อย —']).forEach((sp) => {
              if (!bySub.has(sp)) bySub.set(sp, []);
              bySub.get(sp).push(r);
            });
          });
          return (
            <div key={c.id} style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
              <div onClick={() => app.toggleTree('c:' + c.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', cursor: 'pointer', background: rgba(c.c, 0.13), borderBottom: catCollapsed ? 'none' : '1px solid #eaddc0' }}>
                <span style={{ color: 'var(--primary,#6f4e37)', fontSize: '13px', fontWeight: 800, flex: 'none' }}>{catCollapsed ? '▸' : '▾'}</span>
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
                            {/* โชว์กิ่งทั้งหมดของคำนี้ (เห็นว่ามันไปโผล่กิ่งอื่นด้วยไหม) + เพิ่ม/ลบได้ที่นี่เลย */}
                            <div style={{ flexBasis: '100%' }}>{pathTags(r, 'sm')}</div>
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
        {newCatCount > 0 && <button onClick={app.openCats} title="แก้ชื่อหมวด รวมหมวดที่ซ้ำซ้อนเข้าด้วยกัน เพิ่มหรือลบหมวด" aria-label="จัดการหมวด" style={{ padding: '6px 13px', borderRadius: '20px', background: '#f7f0e0', border: '1px dashed #b8cba0', fontSize: '13px', color: '#5a7040', cursor: 'pointer' }}>{S.isMobile ? '⚙' : '⚙ จัดการหมวด'}</button>}
        {extractedCount > 0 && <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#fbeecb', border: '1px solid #ecd39a', fontSize: '13px', color: '#8a5a1e' }}>พิมพ์เข้า <b>{reviewCount - extractedCount}</b> + ✂ สกัดเพิ่ม <b>{extractedCount}</b></span>}
        {activeMeta.ai ? <span style={{ padding: '6px 13px', borderRadius: '20px', background: '#eef0f5', border: '1px solid #cfd4e0', fontSize: '13px', color: '#5d6478' }}>{aiModel(activeMeta.ai)}{activeMeta.at ? ' · ' + shortDate(activeMeta.at) : ''}</span> : null}
      </div>
      {/* ลิสกิ่งใหม่ — แสดงชื่อกิ่งครบทุกกิ่งตรง ๆ ไม่ต้องเอาเมาส์ชี้หรือกดเข้าไปนับเอง
          สำคัญตอนเทส AI: ต้องเห็นว่าโมเดล "สร้างกี่กิ่ง" (ไม่ใช่กี่คำ) และตั้งชื่อกิ่งว่าอะไรบ้าง */}
      {newBranchKinds > 0 && (
        <div style={{ margin: '0 0 10px', padding: '11px 14px', background: '#eef3e4', border: '1px solid #cbdcb8', borderRadius: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '9px' }}>
            <b style={{ fontSize: '14px', color: '#4d6136' }}>✦ กิ่งใหม่ที่ AI เสนอในช่อนี้</b>
            <span style={{ fontSize: '13px', color: '#5a7040' }}>{newBranchKinds} กิ่ง · ใช้กับ {newBranchCount} คำ</span>
            {pick && <button onClick={() => app.setState({ branchPick: '' }, app.toTop)} style={{ marginLeft: 'auto', padding: '4px 12px', border: '1px solid #cbdcb8', borderRadius: '20px', background: '#fbf7ec', color: '#5a7040', fontSize: '12.5px', cursor: 'pointer' }}>ดูทุกคำในช่อ</button>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {newBranchList.map(([p, n]) => {
              const on = pick === p;
              return (
                <button key={p} onClick={() => app.setState({ branchPick: on ? '' : p, newBranchOnly: false }, app.toTop)}
                  title={on ? 'กดอีกครั้งเพื่อเลิกกรอง' : 'ดูเฉพาะคำที่อยู่ในกิ่งนี้'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderRadius: '20px', background: on ? '#5a7040' : '#fbf7ec', border: '1px solid ' + (on ? '#4d6136' : '#cbdcb8'), color: on ? '#f4f7ec' : '#4d6136', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}>
                  <span>{p}</span>
                  <span style={{ padding: '0 7px', borderRadius: '20px', background: on ? 'rgba(255,255,255,.22)' : '#e2ebd4', fontSize: '11.5px', fontWeight: 700 }}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p style={{ fontSize: '14px', color: '#8a7d6d', margin: '0 0 6px' }}>ค่าเริ่มต้นคือยืนยันตามที่ AI แยกให้ — แก้ตัวคำ เปลี่ยนหมวด ลากย้าย หรือเลือกหลายคำจัดการพร้อมกันได้ตามใจ</p>

      {/* แท็บช่อ + แถบเครื่องมือ = ตรึงติดกันเป็นก้อนเดียว (สองอย่างนี้กดบ่อยสุด เลื่อนดูคำล่าง ๆ ก็ยังกดได้) */}
      <div ref={app._stickRef} style={{ position: 'sticky', top: S.bannerH + 'px', zIndex: 16, background: 'var(--paper,#e7dbc0)' }}>
      {batches.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '2px solid #ddcba4', paddingTop: '10px' }}>
          {batches.map((b) => {
            const on = b.id === activeId;
            return (
              <button key={b.id} onClick={() => app.setBatch(b.id)} style={{ border: '1px solid #ddcba4', borderBottom: 'none', borderRadius: '10px 10px 0 0', background: on ? 'var(--surface,#fffdf6)' : '#efe4cc', color: on ? '#33291f' : '#8a7d6d', fontWeight: on ? 700 : 400, padding: on ? '8px 16px 11px' : '8px 16px 9px', cursor: 'pointer', textAlign: 'left', position: 'relative', top: '2px', boxShadow: on ? 'inset 0 -3px 0 #c9a050' : 'none', fontSize: '14px', lineHeight: 1.25 }}>
                ช่อที่ {thNum(b.no)}
                <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 400, color: '#a08f74' }}>{b.count} คำ{b.novel ? ' · ' + b.novel : ''}</span>
              </button>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper,#e7dbc0)', padding: '11px 0 12px', marginBottom: '4px' }}>
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', background: '#efe4cc', border: '1px solid #ddcba4', borderRadius: '10px', padding: '3px' }}>
          {[['cards', 'การ์ด', '▦'], ['table', 'ตาราง', 'ตาราง'], ['columns', 'คอลัมน์', 'คอลัมน์'], ['sources', '✂ จับกลุ่มประโยค', '✂'], ['tree', '📖 แบบคลังคำ', '📖']].filter(([k]) => !(ST.isMobile && (k === 'table' || k === 'columns'))).map(([k, label, mlabel]) => (
            <button key={k} onClick={app.setUiTop('reviewLayout', k)} title={label} aria-label={label} style={layoutSeg(effLayout === k)}>{ST.isMobile ? mlabel : label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={app.exportReview} title="ส่งออกผลตรวจทานเป็นไฟล์ .txt ไว้เทียบ AI แต่ละเจ้า" aria-label="ส่งออก" style={{ padding: '9px 15px', border: '1px solid #cbdcb8', borderRadius: '9px', background: '#eef3dc', color: '#5a7040', fontSize: '14px', cursor: 'pointer' }}>{ST.isMobile ? '⬇' : '⬇ ส่งออก'}</button>
        {dupCount > 0 && <button onClick={() => app.removeDuplicates(dupItems.map((r) => r.id))} title={'ลบคำที่ซ้ำกับคลัง ' + dupCount + ' คำ'} aria-label={'ลบซ้ำกับคลัง ' + dupCount + ' คำ'} style={{ padding: '9px 16px', border: '1px solid #b81414', borderRadius: '9px', background: '#e01e1e', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', animation: 'wbalert 1.05s ease-in-out infinite' }}>{ST.isMobile ? '⚠ ' + dupCount : '⚠ ลบซ้ำกับคลัง (' + dupCount + ')'}</button>}
        {(newBranchCount > 0 || ST.newBranchOnly) && (
          <button onClick={() => app.setState({ newBranchOnly: !ST.newBranchOnly, branchPick: '' }, app.toTop)}
            title={'ดูเฉพาะคำที่มีหมวดย่อยกิ่งใหม่ที่ยังไม่มีในคลัง\n\nกิ่งใหม่ ' + newBranchKinds + ' กิ่ง ใช้กับ ' + newBranchCount + ' คำ\n' + [...newBranchNames].map((p) => '· ' + p).join('\n')}
            aria-label={'เฉพาะกิ่งใหม่ ' + newBranchKinds + ' กิ่ง ' + newBranchCount + ' คำ'}
            style={{ padding: '9px 15px', border: '1px solid ' + (ST.newBranchOnly ? '#5a7040' : '#cbdcb8'), borderRadius: '9px', background: ST.newBranchOnly ? '#5a7040' : '#eef3dc', color: ST.newBranchOnly ? '#fbf3e2' : '#5a7040', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {ST.isMobile ? '✦ ' + newBranchKinds : '✦ เฉพาะกิ่งใหม่ ' + newBranchKinds + ' กิ่ง · ' + newBranchCount + ' คำ'}
          </button>
        )}
        {crossItems.length > 0 && <button onClick={removeCrossDup} title={'ลบคำในช่อนี้ที่ไปซ้ำกับช่ออื่นที่ยังไม่บันทึก ' + crossItems.length + ' คำ'} aria-label={'ลบซ้ำข้ามช่อ ' + crossItems.length + ' คำ'} style={{ padding: '9px 16px', border: '1px solid #b3a4cc', borderRadius: '9px', background: '#efe9f7', color: '#5f4c80', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{ST.isMobile ? '↺ ' + crossItems.length : '↺ ลบซ้ำข้ามช่อ (' + crossItems.length + ')'}</button>}
        {batches.length > 1 && <button onClick={() => app.deleteBatch(activeMeta)} title="ลบทั้งช่อ" aria-label="ลบทั้งช่อ" style={{ padding: '9px 15px', border: '1px solid #e6c3b7', borderRadius: '9px', background: '#fbeae6', color: 'var(--accent,#9c3b2b)', fontSize: '14px', cursor: 'pointer' }}>{ST.isMobile ? '🗑' : 'ลบทั้งช่อ'}</button>}
        <button onClick={app.save} title="บันทึกคำในช่อนี้เข้าคลัง" style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(111,78,55,.28)' }}>{ST.isMobile ? '✓ บันทึก (' + reviewCount + ')' : '✓ บันทึก' + (batches.length > 1 ? 'ช่อนี้' : '') + 'เข้าคลัง (' + reviewCount + ')'}</button>
      </div>
      </div>

      {selCount > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '11px 16px', marginBottom: '16px', background: '#efe7f0', border: '1px solid #d6c4d9', borderRadius: '10px', animation: 'wbfade .2s ease' }}>
          <b style={{ color: '#6a4a72' }}>เลือก {selCount} คำ</b>
          <span style={{ color: '#8a7d6d', fontSize: '14px' }}>ย้ายไปหมวด:</span>
          <select onChange={app.bulkMove} defaultValue="" style={{ padding: '7px 11px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#3a2f28' }}>
            <option value="">— เลือกหมวด —</option>
            {catOptions.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={app.bulkDelete} style={{ padding: '7px 13px', border: '1px solid #e6c3b7', borderRadius: '8px', background: '#fff', color: 'var(--accent,#9c3b2b)', fontSize: '14px', cursor: 'pointer' }}>ลบที่เลือก</button>
          <button onClick={app.clearSel} style={{ padding: '7px 13px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#6a4a72', fontSize: '14px', cursor: 'pointer' }}>ล้างการเลือก</button>
        </div>
      )}

      {effLayout === 'cards' && cardsView}
      {effLayout === 'table' && (S.isMobile ? <div style={{ overflowX: 'auto' }}>{tableView}</div> : tableView)}
      {effLayout === 'columns' && columnsView}
      {effLayout === 'sources' && sourcesView}
      {effLayout === 'tree' && treeView}
    </section>
  );
}
