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
import { VERSION, thNum, aiModel, shortDate, pathsOf, UI_KEY, REVIEW_KEY, DRAFT_KEY, PAL } from '@/components/helpers';
import { RP, TEST_WORDS } from '@/components/pages/reportShared';

export function renderActions(app) {
  app.renderConfirm = () => {
    const c = app.state.confirm;
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
            {!isAlert && <button onClick={app.closeConfirm} style={{ padding: '10px 18px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#6f6252', fontSize: '14.5px', cursor: 'pointer' }}>ยกเลิก</button>}
            <button onClick={() => { const ok = c.onOk; app.closeConfirm(); if (ok) ok(); }} style={{ padding: isAlert ? '11px 34px' : '10px 22px', border: 'none', borderRadius: '9px', background: c.danger ? 'var(--accent,#9c3b2b)' : 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}>{c.okLabel || 'ยืนยัน'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- lifecycle ----------
  app.renderScrollButtons = () => {
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
        <button onClick={app.toTopSmooth} title="ขึ้นบนสุด" style={btn}>▲</button>
        <button onClick={app.toBottom} title="ลงล่างสุด" style={btn}>▼</button>
      </div>
    );
  }

  // ============ ตัวช่วยกลางของ 2 หน้ารายงาน (ผลทดสอบ AI + ประวัติคำสั่ง) ============
  // ใช้ภาษาภาพเดียวกับหน้าเกี่ยวกับ: การ์ดกระดาษ + เลขไทยในวงกลมหมึก + หัวข้อลายมือ
  // ชุดคำทดสอบมาตรฐาน เวอร์ชัน ๑ — 31 บรรทัด ห้ามแก้โดยพลการ
  // ถ้าจะเปลี่ยนชุดคำ = ขึ้นเวอร์ชัน ๒ และเก็บผลของเวอร์ชันเดิมไว้เทียบ (ผลข้ามเวอร์ชันเทียบตรง ๆ ไม่ได้)
  // คำในชุดนี้เลือกมาให้ครอบคลุมกรณีทดสอบ: ช่องเติมคำ 6 จุด · ตัวอักษรแทนชื่อตัวละคร · คู่ประโยคยาวกับคำเดี่ยวที่ซ้อนกัน 3 คู่ · คำทับศัพท์ · สำนวน · คำจัดหมวดยาก
  app.rpCard = (extra) => ({ background: 'var(--surface,#fffdf6)', border: '1px solid ' + RP.line, borderRadius: '14px', padding: '24px 26px 26px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(120,90,50,.06)', ...extra });
  app.rpHead = (num, title, sub) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <span style={{ width: '30px', height: '30px', flex: '0 0 30px', borderRadius: '50%', background: RP.ink, color: '#fbf3e2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontFamily: RP.serif }}>{num}</span>
      <h3 style={{ margin: 0, fontSize: '21px', fontFamily: RP.hand, color: RP.ink, fontWeight: 400 }}>{title}</h3>
      {sub && <span style={{ fontSize: '13px', color: RP.faint }}>{sub}</span>}
    </div>
  );

  // หัวเรื่องใหญ่ของหน้า — ใช้ทั้ง 2 หน้าให้หน้าตาเป็นชุดเดียวกัน
  app.rpTitle = (glyph, title, sub) => (
    <div style={{ textAlign: 'center', marginBottom: '26px' }}>
      <div style={{ fontSize: '34px', marginBottom: '2px' }}>{glyph}</div>
      <h2 style={{ margin: '0 0 6px', fontSize: '30px', fontFamily: RP.hand, color: RP.ink, fontWeight: 400 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '14px', color: RP.faint }}>{sub}</p>
    </div>
  );

  // กล่องข้อความยาว (ชุดคำทดสอบ / ตัวคำสั่ง) พร้อมปุ่มคัดลอก
  app.rpTextBox = (text, maxH) => (
    <pre style={{ margin: 0, padding: '13px 15px', background: '#fbf7ec', border: '1px solid ' + RP.line, borderRadius: '10px', fontSize: '12.5px', lineHeight: 1.75, color: RP.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: maxH || '300px', overflow: 'auto', fontFamily: 'var(--font-sarabun),sans-serif' }}>{text}</pre>
  );
  app.rpCopyBtn = (text, label, msg) => (
    <button onClick={() => app.copyText(text, msg)} style={{ padding: '5px 13px', border: '1px solid ' + RP.line, borderRadius: '20px', background: '#fbf7ec', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer' }}>📋 {label || 'คัดลอก'}</button>
  );

  // แถบสัดส่วน 3 สี (ตรงกันหมด / กิ่งต่าง / หมวดต่าง) — เห็นภาพรวมก่อนอ่านตาราง
  app.rpBar = (t) => {
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
