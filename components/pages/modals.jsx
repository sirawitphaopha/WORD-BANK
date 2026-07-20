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

export function renderEditModal(app) {
  const ed = app.state.editing || {};
  const S = app.state; // ช่อง "＋ เพิ่มกิ่ง" อ่าน/เขียน S.editPathDraft — ก่อนหน้านี้ลืมประกาศ S ทำให้หน้าต่างแก้ไขคำพังทั้งจอคอมและมือถือ
  return (
    <div onClick={app.cancelEdit} style={{ position: 'fixed', inset: 0, background: 'rgba(58,47,40,.4)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 70, padding: '20px', animation: 'wbfade .2s ease' }}>
      <div onClick={app.stop} style={{ background: 'var(--panel,#f7f0e0)', border: '1px solid #e0d0ac', borderRadius: '16px', padding: '28px', width: 'min(460px,100%)', boxShadow: '0 20px 60px rgba(58,47,40,.3)' }}>
        <h3 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '22px', margin: '0 0 18px' }}>แก้ไขคำ</h3>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>คำ / วลี</label>
        <input value={ed.text || ''} onChange={app.onEditField('text')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#33291f', fontFamily: "var(--font-trirong),serif", fontSize: '18px', outline: 'none', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>ความหมาย (ไม่บังคับ)</label>
        <input value={ed.meaning || ''} onChange={app.onEditField('meaning')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none', marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>หมวด</label>
            <select value={ed.category || 'c0'} onChange={app.onEditField('category')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28' }}>{app.state.categories.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>จากเรื่อง</label>
            <input list="wb-novels" value={ed.novel || ''} onChange={app.onEditField('novel')} style={{ width: '100%', padding: '11px 13px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
          </div>
        </div>
        {/* หมวดย่อย — คำหนึ่งติดได้หลายกิ่ง เพิ่ม/ลบได้ที่นี่เหมือนหน้าตรวจทาน */}
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5c5044', marginBottom: '6px' }}>หมวดย่อย (ติดได้หลายกิ่ง)</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          {pathsOf(ed).map((p) => {
            const isNew = !app.knownPaths().has(p);
            return (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '3px 4px 3px 10px', borderRadius: '20px', background: isNew ? '#e9efe1' : '#f0e8d4', border: '1px solid ' + (isNew ? '#cbdcb8' : '#e4d8bd'), color: isNew ? '#5a7040' : '#7a6a4f' }}>
                {isNew && <b>✦</b>}{p}
                <button onClick={() => { const next = pathsOf(ed).filter((x) => x !== p); app.setState({ editing: { ...ed, subpaths: next, subpath: next[0] || '' } }); }} style={{ border: 'none', background: 'transparent', color: '#bcac8f', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: '0 3px' }}>✕</button>
              </span>
            );
          })}
          <input list="wb-paths" placeholder="＋ เพิ่มกิ่ง แล้วกด Enter" value={S.editPathDraft || ''}
            onChange={(e) => app.setState({ editPathDraft: e.target.value })}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const v = (S.editPathDraft || '').trim();
              if (!v) return;
              const next = [...new Set([...pathsOf(ed), v])];
              app.setState({ editing: { ...ed, subpaths: next, subpath: next[0] || '' }, editPathDraft: '' });
            }}
            style={{ fontSize: '12px', padding: '6px 11px', borderRadius: '20px', border: '1px dashed #ddcba4', outline: 'none', minWidth: '210px', background: 'var(--surface,#fffdf6)', color: '#4a4034' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <button onClick={app.deleteFromEdit} style={{ padding: '10px 15px', border: '1px solid #e6c3b7', borderRadius: '9px', background: '#faf1ee', color: 'var(--accent,#9c3b2b)', cursor: 'pointer' }}>ลบคำนี้</button>
          <div style={{ flex: 1 }} />
          <button onClick={app.cancelEdit} style={{ padding: '10px 16px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={app.saveEdit} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

export function renderCatModal(app, monoMode) {
  const S = app.state;
  return (
    <div onClick={app.closeCats} style={{ position: 'fixed', inset: 0, background: 'rgba(58,47,40,.4)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 70, padding: '20px', animation: 'wbfade .2s ease' }}>
      <div onClick={app.stop} style={{ background: 'var(--panel,#f7f0e0)', border: '1px solid #e0d0ac', borderRadius: '16px', padding: '28px', width: 'min(560px,100%)', maxHeight: '86vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(58,47,40,.3)' }}>
        <h3 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '22px', margin: '0 0 4px' }}>จัดการหมวด</h3>
        <p style={{ color: '#8a7d6d', fontSize: '14px', margin: '0 0 18px' }}>แก้ชื่อหมวด รวมหมวดเข้าด้วยกัน หรือเพิ่มหมวดใหม่</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {S.categories.map((c) => {
            const cnt = app.catCount(c.id);
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={badge(c, monoMode)}>{c.k}</span>
                <input value={c.n} onChange={app.renameCat(c.id)} style={{ flex: 1, padding: '8px 11px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
                <span style={{ fontSize: '12px', color: '#a99b83', width: '54px', textAlign: 'right' }}>{cnt} คำ</span>
                <button onClick={app.removeCat(c.id)} title="ลบหมวด (ต้องไม่มีคำ)" style={{ border: 'none', background: 'transparent', color: cnt > 0 ? '#d8cbb0' : '#c98878', cursor: cnt > 0 ? 'not-allowed' : 'pointer', fontSize: '15px' }}>✕</button>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '16px', background: '#efe7f0', border: '1px solid #d6c4d9', borderRadius: '11px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 600, color: '#6a4a72', marginBottom: '10px', fontSize: '14px' }}>รวมหมวด</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select value={S.mergeFrom} onChange={app.onMergeFrom} style={{ flex: 1, minWidth: '130px', padding: '8px 10px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#3a2f28' }}><option value="">— จากหมวด —</option>{S.categories.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}</select>
            <span style={{ color: '#8a7d6d' }}>→</span>
            <select value={S.mergeTo} onChange={app.onMergeTo} style={{ flex: 1, minWidth: '130px', padding: '8px 10px', border: '1px solid #cdb9d0', borderRadius: '8px', background: '#fff', color: '#3a2f28' }}><option value="">— ไปหมวด —</option>{S.categories.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}</select>
            <button onClick={app.merge} style={{ padding: '8px 15px', border: 'none', borderRadius: '8px', background: '#6a4a72', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>รวม</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input value={S.newCatName} onChange={app.onNewCatName} placeholder="ชื่อหมวดใหม่…" style={{ flex: 1, padding: '9px 12px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
          <button onClick={app.addCat} style={{ padding: '9px 16px', border: '1px solid #cbdcb8', borderRadius: '8px', background: '#e9efe1', color: '#5a7040', fontWeight: 600, cursor: 'pointer' }}>＋ เพิ่มหมวด</button>
        </div>
        <div style={{ textAlign: 'right', marginTop: '20px' }}><button onClick={app.closeCats} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>เสร็จสิ้น</button></div>
      </div>
    </div>
  );
}

export function renderSettings(app, monoMode, navStyle, spell, effLayout, accent, primary, paper) {
  const swBtn = (c, on) => ({ width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', background: c, border: on ? '2px solid #3a2f28' : '1px solid rgba(0,0,0,.15)', boxShadow: on ? '0 0 0 3px rgba(58,47,40,.16)' : '0 1px 2px rgba(0,0,0,.08)', outline: 'none', padding: 0 });
  const segBtn = (on) => ({ padding: '7px 13px', border: 'none', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer', background: on ? 'var(--primary,#6f4e37)' : 'transparent', color: on ? '#fbf3e2' : '#6f6252', fontWeight: on ? 600 : 400 });
  const cardMode = app.eff('cardStyle', 'classic');
  const aiProv = app.eff('aiProvider', 'basic');
  const aiBtn = (on) => ({ display: 'flex', alignItems: 'center', gap: '7px', textAlign: 'left', padding: '9px 11px', borderRadius: '9px', cursor: 'pointer', fontSize: '13.5px', border: on ? '1.5px solid var(--primary,#6f4e37)' : '1px solid #ddcba4', background: on ? '#f3ead9' : 'var(--surface,#fffdf6)', color: '#4a4034', fontWeight: on ? 600 : 400 });
  const tagStyle = { fontSize: '10.5px', padding: '1px 6px', borderRadius: '20px', background: '#efe4cc', color: '#8a7150', fontWeight: 600, whiteSpace: 'nowrap' };
  const swatchRow = (key, list, cur) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '11px', marginBottom: '22px' }}>
      {list.map((c) => <button key={c} onClick={app.setUi(key, c)} style={swBtn(c, (cur || '').toLowerCase() === c.toLowerCase())} />)}
    </div>
  );
  const segRow = (label, key, cur, opts, styleExtra) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <span style={{ width: '120px', fontSize: '14px', color: '#5c5044' }}>{label}</span>
      <div style={{ display: 'inline-flex', background: 'var(--surface,#fffdf6)', border: '1px solid #ddcba4', borderRadius: '9px', padding: '3px' }}>
        {opts.map((o) => <button key={o[0]} onClick={app.setUi(key, o[0])} style={{ ...segBtn(cur === o[0]), ...(styleExtra ? styleExtra(o) : {}) }}>{o[1]}</button>)}
      </div>
    </div>
  );
  return (
    <div onClick={app.closeSettings} style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 75 }}>
      <div onClick={app.stop} style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(360px,90vw)', background: 'var(--panel,#f7f0e0)', borderLeft: '1px solid #e0d0ac', padding: '24px 24px 40px', overflow: 'auto', boxShadow: '-8px 0 34px rgba(58,47,40,.22)', animation: 'wbslide .28s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 4px' }}><h3 style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '22px', margin: 0, flex: 1 }}>ตั้งค่าการแสดงผล</h3><button onClick={app.closeSettings} title="ปิด" style={{ border: 'none', background: 'transparent', color: '#8a7d6d', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button></div>
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
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#5c5044', marginBottom: '4px' }}>ผู้ช่วย AI ที่ใช้จัดคำ</div>
        <p style={{ color: '#8a7d6d', fontSize: '12.5px', margin: '0 0 12px', lineHeight: 1.5 }}>เลือกตัวช่วยจัดคำในหน้าเพิ่มคำ · เจ้าที่ไม่ใช่ "พื้นฐาน" ต้องตั้งกุญแจ (API key) ในไฟล์ .env.local ก่อน</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {PROVIDER_ORDER.map((k) => {
            const p = PROVIDERS[k]; if (!p) return null;
            return (
              <button key={k} onClick={app.setUi('aiProvider', k)} style={aiBtn(aiProv === k)}>
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
          const sel = app.eff('aiModel:' + aiProv, '') || cur.model;
          return (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12.5px', color: '#5c5044', marginBottom: '6px' }}>รุ่นของ {cur.label}</div>
              <select value={sel} onChange={(e) => app.setUi('aiModel:' + aiProv, e.target.value)()}
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
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}><button onClick={app.resetSettings} style={{ padding: '9px 15px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', cursor: 'pointer' }}>คืนค่าเริ่มต้น</button><div style={{ flex: 1 }} /><button onClick={app.closeSettings} style={{ padding: '10px 22px', border: 'none', borderRadius: '9px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, cursor: 'pointer' }}>เสร็จสิ้น</button></div>
      </div>
    </div>
  );
}
