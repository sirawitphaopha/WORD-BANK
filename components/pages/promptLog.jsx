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
import { RP, TEST_WORDS } from '@/components/pages/reportShared';

export function renderPromptLog(app) {
  const R = RP;
  const S = app.state;
  const list = [...PROMPT_LOG].reverse(); // ฉบับใหม่สุดอยู่บน
  const open = S.promptOpen;
  const lang = S.promptLang === 'th' ? 'th' : 'en';
  // เทียบกับฉบับก่อนหน้าเสมอ (ฉบับแรกไม่มีให้เทียบ)
  const prevOf = (v) => PROMPT_LOG.find((p) => p.v === v - 1);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {app.rpTitle('📜', 'ประวัติคำสั่ง AI', 'ทุกฉบับที่เคยใช้ · เก็บไว้เพื่อให้ผลทดสอบย้อนกลับมาอ้างอิงได้')}

      <div style={app.rpCard({ background: '#f7f1e2', borderStyle: 'dashed' })}>
        <p style={{ margin: 0, fontSize: '13.5px', color: '#5f5346', lineHeight: 1.95 }}>
          <b>คำสั่ง (prompt)</b> คือข้อความที่ส่งไปบอก AI ว่าต้องทำอะไรบ้าง — จัดเป็นตัวแปรที่มีผลต่อผลลัพธ์มากกว่าการเลือกตัวโมเดลเสียอีก
          (พิสูจน์แล้วในหน้าผลทดสอบ: โมเดลเดียวกัน เปลี่ยนแค่คำสั่ง ผลเปลี่ยนทุกมิติ)
          <br />หน้านี้เก็บทุกฉบับที่เคยใช้ พร้อมเหตุผลว่าแก้เพราะเจอปัญหาอะไร และผลที่ได้หลังแก้
          <span style={{ color: '#4d6136' }}> บรรทัดพื้นเขียวคือที่เพิ่มเข้ามา</span> <span style={{ color: '#b4503a' }}>บรรทัดพื้นแดงขีดฆ่าคือที่ถูกลบ</span>
        </p>
      </div>

      {list.map((p) => {
        const prev = prevOf(p.v);
        const rows = prev ? diffLines(prev[lang], p[lang]) : [];
        const st = prev ? diffStat(rows) : null;
        const isOpen = open === p.v;
        const isCurrent = p.v === PROMPT_LOG.length;
        return (
          <div key={p.v} style={app.rpCard(isCurrent ? { borderColor: '#cbdcb8', borderWidth: '2px' } : {})}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', flexWrap: 'wrap' }}>
              <span style={{ width: '34px', height: '34px', flex: '0 0 34px', borderRadius: '50%', background: isCurrent ? '#5a7040' : R.ink, color: '#fbf3e2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontFamily: R.serif }}>{isCurrent ? '●' : thNum(p.v)}</span>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '19px', fontFamily: R.hand, color: R.ink, fontWeight: 400 }}>{p.title}</h3>
                  {isCurrent && <span style={{ padding: '2px 10px', borderRadius: '20px', background: '#eef3e4', border: '1px solid #cbdcb8', color: '#4d6136', fontSize: '12px' }}>ใช้อยู่ตอนนี้</span>}
                </div>
                <div style={{ fontSize: '12.5px', color: R.faint, marginTop: '3px' }}>
                  ฉบับที่ {thNum(p.v)} · {p.date}
                  {p.commit ? ' · ' + p.commit : ''}
                  {st ? <span style={{ marginLeft: '8px' }}><b style={{ color: '#4d6136' }}>+{st.add}</b> <b style={{ color: '#b4503a' }}>−{st.del}</b> บรรทัด</span> : null}
                  {p.batches && p.batches.length ? <span style={{ marginLeft: '8px' }}>· ทดสอบในช่อ {p.batches.map((b) => thNum(b)).join(' ')}</span> : null}
                </div>
              </div>
              {p.batches && p.batches.length ? (
                <button onClick={() => app.setState({ page: 'aitest' }, app.toTop)} style={{ padding: '5px 13px', border: '1px solid ' + R.line, borderRadius: '20px', background: '#fbf7ec', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer' }}>🔬 ดูผลทดสอบ</button>
              ) : null}
            </div>

            <div style={{ marginTop: '15px', display: 'grid', gap: '11px' }}>
              {p.changes && p.changes.length > 0 && (
                <div style={{ padding: '13px 15px', background: '#eef3e4', borderRadius: '11px', borderLeft: '4px solid #7d9a5c' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#4d6136', marginBottom: '6px' }}>แก้อะไร</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13.5px', color: '#5f5346', lineHeight: 1.85 }}>
                    {p.changes.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              )}
              {p.why && (
                <div style={{ padding: '13px 15px', background: '#fbf1d8', borderRadius: '11px', borderLeft: '4px solid #d9a63e' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#a8791f', marginBottom: '5px' }}>ทำไมถึงแก้</div>
                  <div style={{ fontSize: '13.5px', color: '#5f5346', lineHeight: 1.85 }}>{p.why}</div>
                </div>
              )}
              {p.effect && (
                <div style={{ padding: '13px 15px', background: '#f0e6cd', borderRadius: '11px', borderLeft: '4px solid #8a7d6d' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#6f6252', marginBottom: '5px' }}>ผลที่ได้</div>
                  <div style={{ fontSize: '13.5px', color: '#5f5346', lineHeight: 1.85 }}>{p.effect}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => app.setState({ promptOpen: isOpen ? null : p.v })}
                style={{ padding: '6px 15px', border: '1px solid ' + R.line, borderRadius: '9px', background: isOpen ? R.ink : '#fbf7ec', color: isOpen ? '#fbf3e2' : '#6f6252', fontSize: '13.5px', cursor: 'pointer' }}>
                {isOpen ? '▾ ปิดข้อความเต็ม' : '▸ ดูข้อความเต็มและจุดที่เปลี่ยน'}
              </button>
              {isOpen && (
                <>
                  {[['en', 'อังกฤษ (ส่งจริง)'], ['th', 'ไทย']].map(([id, label]) => (
                    <button key={id} onClick={() => app.setState({ promptLang: id })}
                      style={{ padding: '6px 14px', border: '1px solid ' + (lang === id ? R.ink : R.line), borderRadius: '9px', background: lang === id ? '#f0e6cd' : '#fbf7ec', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>{label}</button>
                  ))}
                  {app.rpCopyBtn(p[lang], 'คัดลอกคำสั่ง', 'คัดลอกคำสั่งฉบับที่ ' + thNum(p.v) + ' แล้ว')}
                </>
              )}
            </div>

            {isOpen && (
              <div style={{ marginTop: '13px' }}>
                {prev ? (
                  <>
                    <div style={{ fontSize: '13px', color: R.faint, marginBottom: '7px' }}>เทียบกับฉบับที่ {thNum(prev.v)} — ย่อบรรทัดที่ไม่เปลี่ยนให้อัตโนมัติ</div>
                    <div style={{ border: '1px solid ' + R.line, borderRadius: '10px', overflow: 'hidden', fontSize: '12.5px', fontFamily: 'var(--font-sarabun),sans-serif', lineHeight: 1.7 }}>
                      {collapseSame(rows).map((r, i) => {
                        const sty = { padding: '3px 12px 3px 26px', position: 'relative', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderBottom: '1px solid rgba(224,208,172,.4)' };
                        if (r.t === 'add') return <div key={i} style={{ ...sty, background: '#e9f2df', color: '#3d5228' }}><span style={{ position: 'absolute', left: '9px', color: '#7d9a5c', fontWeight: 700 }}>+</span>{r.text || ' '}</div>;
                        if (r.t === 'del') return <div key={i} style={{ ...sty, background: '#f9e6e1', color: '#8e4130', textDecoration: 'line-through', textDecorationColor: 'rgba(180,80,58,.5)' }}><span style={{ position: 'absolute', left: '9px', color: '#c1614c', fontWeight: 700, textDecoration: 'none' }}>−</span>{r.text || ' '}</div>;
                        if (r.t === 'skip') return <div key={i} style={{ ...sty, background: '#f4efe3', color: '#a1937f', fontSize: '11.5px', textAlign: 'center', paddingLeft: '12px' }}>{r.text}</div>;
                        return <div key={i} style={{ ...sty, background: '#fffdf6', color: '#6f6252' }}>{r.text || ' '}</div>;
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', color: R.faint, marginBottom: '7px' }}>ฉบับแรก ไม่มีฉบับก่อนหน้าให้เทียบ</div>
                    {app.rpTextBox(p[lang], '420px')}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
