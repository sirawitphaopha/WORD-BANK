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
import { AI_TESTS } from '@/lib/aitest';
import { VERSION, thNum, aiModel, shortDate, pathsOf } from '@/components/helpers';
import { RP, TEST_WORDS } from '@/components/pages/reportShared';

export function renderAiTest(app) {
  const R = RP;
  const S = app.state;
  const vers = AI_TESTS;
  const D = vers.find((v) => v.version === S.testVer) || vers[vers.length - 1];
  const side = S.testSide === 'ext' ? 'extracted' : 'typed';
  const pane = D[side];
  const nameOf = (b) => (D.runs.find((r) => r.batch === b) || {}).ai || ('ช่อ ' + b);
  // ชื่อรุ่นแบบสั้น ใช้เป็นหัวตาราง (ตัดชื่อเจ้าและคำโฆษณาออก)
  const shortOf = (b) => {
    const s = nameOf(b).split('·').map((x) => x.trim());
    return (s[1] || s[0] || '').replace(/\s*·.*$/, '').replace('Gemini ', '').replace('GPT-', 'GPT-');
  };
  const star = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  // คะแนนดาว: ให้จากผลจริง 2 มุม (คำครบ+สกัด / กิ่งใหม่+รูปแบบ+หลายกิ่ง) — เขียนไว้ตายตัวเพราะเป็นการตัดสินของคน ไม่ใช่สูตร
  const SCORE = D.scores || {};
  const NOTE = D.notes || {};
  // แปลงรหัสหมวด (c0-c8) เป็นชื่อไทย จากหมวดจริงในคลัง
  const catName = (id) => (S.categories.find((x) => x.id === id) || {}).n || id || '—';
  const agreeTag = { full: ['ตรงกันหมด', '#7d9a5c', '#eef3e4'], branch: ['กิ่งต่าง', '#a8791f', '#fbf1d8'], cat: ['หมวดต่าง', '#b4503a', '#f7e5e0'], single: ['มีตัวเดียว', '#8a7d6d', '#f2ece0'] };

  // ── เรดาร์ 7 มิติ (แสดงเฉพาะเวอร์ชันที่มีข้อมูล cost/ความหมาย = v2) ──
  const radarRuns = D.runs.filter((r) => r.cost != null && r.meaningScore != null);
  const hasRadar = radarRuns.length > 0;
  const RD_LABELS = ['คำครบ', 'สกัด', 'ความหมาย', 'เหตุผล', 'จัดกลุ่ม', 'ราคาถูก', 'เร็ว'];
  const _costs = radarRuns.map((r) => r.cost), _secs = radarRuns.map((r) => r.sec);
  const minC = Math.min(..._costs, 1), maxC = Math.max(..._costs, 0.001), minS = Math.min(..._secs, 1), maxS = Math.max(..._secs, 1);
  const clamp5 = (x) => Math.max(0.4, Math.min(5, x));
  const dimsOf = (r) => [
    clamp5(r.typed >= 31 ? 5 : r.typed === 30 ? 3.5 : r.typed === 29 ? 2 : 5 - (31 - r.typed) * 1.5),
    clamp5((r.extracted / 20) * 5),
    clamp5(r.meaningScore),
    clamp5(r.reasonScore * 2.5),
    clamp5(5 - (r.newBranchKinds - 1) * 0.5),
    clamp5(maxC === minC ? 5 : 5 - (Math.log(r.cost / minC) / Math.log(maxC / minC)) * 4.6),
    clamp5(maxS === minS ? 5 : 5 - ((r.sec - minS) / (maxS - minS)) * 4.6),
  ];
  const brandOf = (b) => (nameOf(b).toLowerCase().includes('gpt') ? 'gpt' : 'gemini');
  // ชื่อเต็มมีแบรนด์ (เติม "Gemini" กลับ เพราะ shortOf ตัดออก · ฝั่ง GPT มี "GPT-" อยู่แล้ว) — ใช้ในการ์ดเรดาร์
  const fullName = (b) => (brandOf(b) === 'gemini' ? 'Gemini ' : '') + shortOf(b);
  const radarSVG = (vals) => {
    const N = vals.length, cx = 122, cy = 110, R0 = 62;
    const pt = (i, rad) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
    const rings = [1, 2, 3, 4, 5].map((k) => vals.map((_, i) => pt(i, (R0 * k) / 5).join(',')).join(' '));
    const dataPts = vals.map((v, i) => pt(i, (R0 * v) / 5));
    return (
      <svg viewBox="0 0 244 232" width="100%" style={{ maxWidth: '240px', display: 'block', margin: '2px auto 0' }} role="img" aria-label="กราฟเรดาร์คะแนน 7 มิติ">
        {rings.map((p, i) => <polygon key={'g' + i} points={p} fill="none" stroke="#e5d9bf" strokeWidth="1" />)}
        {vals.map((_, i) => { const [x, y] = pt(i, R0); return <line key={'a' + i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5d9bf" strokeWidth="1" />; })}
        <polygon points={dataPts.map((p) => p.join(',')).join(' ')} fill="rgba(156,59,43,.18)" stroke="#9c3b2b" strokeWidth="2" strokeLinejoin="round" />
        {dataPts.map((p, i) => <circle key={'d' + i} cx={p[0]} cy={p[1]} r="2.6" fill="#9c3b2b" />)}
        {vals.map((v, i) => {
          const [lx, ly] = pt(i, R0 + 15);
          const anchor = Math.abs(lx - cx) < 10 ? 'middle' : lx > cx ? 'start' : 'end';
          return (
            <text key={'t' + i} x={lx} y={ly} textAnchor={anchor} style={{ fontSize: '9.3px', fill: '#6f6252' }}>
              <tspan x={lx} dy="-2">{RD_LABELS[i]}</tspan>
              <tspan x={lx} dy="11" style={{ fill: '#9c3b2b', fontWeight: 700 }}>{v.toFixed(1)}</tspan>
            </text>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
      {app.rpTitle('🔬', 'ผลทดสอบโมเดล AI', 'รายงานการทดลอง · ชุดคำมาตรฐาน เวอร์ชัน ' + thNum(D.version) + ' · ช่อ ' + thNum(D.runFrom) + '–' + thNum(D.runTo))}

      {vers.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', margin: '0 0 20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: R.faint }}>เลือกเวอร์ชันผลทดสอบ</span>
          {vers.map((v) => {
            const on = v.version === D.version;
            return (
              <button key={v.version} onClick={() => app.setState({ testSide: 'typed', testVer: v.version })}
                style={{ padding: '7px 16px', border: '1px solid ' + (on ? R.ink : R.line), borderRadius: '9px', background: on ? R.ink : '#fbf7ec', color: on ? '#fbf3e2' : '#6f6252', fontSize: '13.5px', fontWeight: on ? 700 : 400, cursor: 'pointer' }}>
                เวอร์ชัน {thNum(v.version)} <span style={{ opacity: .7 }}>· ช่อ {thNum(v.runFrom)}–{thNum(v.runTo)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ① ทดสอบ 2 มุม — วางไว้บนสุดเพราะเป็นกรอบคิดของทั้งรายงาน */}
      <div style={app.rpCard()}>
        {app.rpHead('๑', 'การทดลองนี้วัด ๒ มุม')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '14px' }}>
          {[['✂', 'มุมที่ ๑ — สกัดได้แค่ไหน', 'AI มองเห็นคำงามครบไหม เก็บคำที่พิมพ์เข้าไปครบไหม และดึงคำเด่นจากประโยคยาวได้กี่คำ', '#8a5a1e', '#fbeecb', '#ecd39a'],
            ['🗂', 'มุมที่ ๒ — จัดกลุ่มตรงกันไหม', 'คำเดียวกัน โมเดลต่างกันจัดเข้าหมวดและกิ่งเหมือนกันหรือไม่ ตรงไหนที่ทุกตัวเห็นพ้อง ตรงไหนที่เห็นต่าง', '#4d6136', '#eef3e4', '#cbdcb8']].map(([g, t, d, col, bg, bd]) => (
            <div key={t} style={{ padding: '15px 17px', background: bg, border: '1px solid ' + bd, borderRadius: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: col, marginBottom: '6px' }}>{g} {t}</div>
              <div style={{ fontSize: '13.5px', color: '#6f6252', lineHeight: 1.75 }}>{d}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '13.5px', color: '#6f6252', lineHeight: 1.9, margin: '15px 0 0', padding: '13px 15px', background: '#f7f1e2', borderRadius: '10px', border: '1px dashed ' + R.line }}>
          <b>สิ่งที่ต้องเข้าใจก่อนอ่านผล</b> — มุมที่ ๒ วัดได้แค่ว่า <b>“ตรงกันไหม”</b> ยังวัดไม่ได้ว่า <b>“ถูกไหม”</b> เพราะยังไม่มีเฉลย
          ถ้าโมเดลทุกตัวจัดผิดเหมือนกันหมด ตัวเลขจะขึ้นว่าตรงกัน 100% ทั้งที่ผิด
          <br />และความเห็นต่างไม่ใช่ข้อบกพร่องเสมอไป — วลีไทยวลีเดียวตีความได้หลายชั้นตามบริบทในเรื่อง ความเห็นต่างจึงเป็น <b>ตัวเลือกให้เจ้าของคลังเลือกเอง</b>
        </p>
      </div>

      {/* ② ตารางสรุปรายรุ่น */}
      <div style={app.rpCard()}>
        {app.rpHead('๒', 'สรุปผลรายรุ่น', 'เรียงตามคะแนน')}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f0e6cd', color: '#8a7d6d', fontSize: '12px' }}>
                {['คะแนน', 'รุ่น', 'ช่อ', 'พิมพ์เข้า', '✂ สกัดเพิ่ม', 'กิ่งใหม่', 'หลายกิ่ง', 'ราคา', 'เวลา', 'หมายเหตุ'].map((h) => (
                  <th key={h} style={{ padding: '9px 11px', textAlign: h === 'รุ่น' || h === 'หมายเหตุ' ? 'left' : 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...D.runs].sort((a, b) => (SCORE[b.batch] || 0) - (SCORE[a.batch] || 0)).map((r) => {
                const lost = 31 - r.typed;
                return (
                  <tr key={r.batch} style={{ borderBottom: '1px solid #efe6d2' }}>
                    <td style={{ padding: '10px 11px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#c9962e', fontSize: '13px', letterSpacing: '1px' }}>{star(SCORE[r.batch] || 0)}</span>
                      <div style={{ fontSize: '12px', color: R.faint }}>{(SCORE[r.batch] || 0).toFixed(1)}</div>
                    </td>
                    <td style={{ padding: '10px 11px', fontWeight: 600, color: R.ink }}>{fullName(r.batch)}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center', color: R.faint }}>{thNum(r.batch)}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center', color: lost ? '#b4503a' : '#4d6136', fontWeight: 700 }}>{r.typed}/31{lost ? ' 🔴' : ''}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center', fontWeight: 700, color: R.ink }}>{r.extracted}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center' }}>{r.newBranchKinds ? <span style={{ color: '#a8791f' }}>{r.newBranchKinds} กิ่ง<span style={{ color: R.faint, fontSize: '12px' }}> / {r.newBranchWords} คำ</span></span> : <span style={{ color: '#4d6136' }}>0</span>}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center', color: r.multiBranch ? R.ink : '#b4503a', fontWeight: r.multiBranch ? 400 : 700 }}>{r.multiBranch}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center', whiteSpace: 'nowrap', color: R.ink }}>{r.cost != null ? '฿' + (r.cost * 35).toFixed(2) : <span style={{ color: R.faint }}>—</span>}</td>
                    <td style={{ padding: '10px 11px', textAlign: 'center', whiteSpace: 'nowrap', color: R.faint }}>{r.sec != null ? r.sec + ' วิ' : '—'}</td>
                    <td style={{ padding: '10px 11px', color: '#6f6252', fontSize: '12.5px', lineHeight: 1.6 }}>{NOTE[r.batch] || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '13px', display: 'grid', gap: '5px', fontSize: '12.5px', color: R.faint, lineHeight: 1.7 }}>
          <span><b>พิมพ์เข้า</b> ต้องได้ 31/31 ทุกรุ่น ถ้าน้อยกว่าแปลว่า AI กลืนคำที่ผู้ใช้พิมพ์เข้ามาหายไปโดยไม่แจ้งเตือน</span>
          <span><b>กิ่งใหม่</b> ยิ่งน้อยยิ่งดี แปลว่าหากิ่งเดิมที่มีอยู่แล้วเจอ · ดูที่ “จำนวนกิ่ง” ไม่ใช่ “จำนวนคำ” (กิ่งเดียวใช้กับหลายคำได้ = ดี)</span>
          <span><b>หลายกิ่ง</b> จำนวนคำที่ได้หมวดย่อยมากกว่า 1 กิ่ง — ตระกูล GPT ได้ 0 ทั้งหมด ทั้งที่คำสั่งเดียวกับ Gemini</span>
        </div>
      </div>

      {/* เรดาร์รายตัว 7 มิติ (เฉพาะ v2 ที่มีข้อมูลครบ) */}
      {hasRadar && (
        <div style={app.rpCard()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>🕸️</span>
            <b style={{ fontSize: '17px', color: '#9c3b2b' }}>คะแนนรายตัว 7 มิติ</b>
            <span style={{ fontSize: '13px', color: R.faint }}>ดาวหลายแฉก — ยิ่งรูปกว้างเต็ม ยิ่งเก่งรอบด้าน</span>
          </div>
          <p style={{ fontSize: '12.5px', color: R.faint, margin: '0 0 14px', lineHeight: 1.7 }}>
            แต่ละแกนคือ 1 ด้าน (0–5 · สูง = ดี): คำครบ · สกัด · ความหมาย · เหตุผล · จัดกลุ่ม(กิ่งสะอาด) · ราคาถูก · เร็ว · <b>ใต้ดาวแต่ละใบมีบทอภิปรายของโมเดลนั้นเลย</b> (บทวิเคราะห์ ชม/ติ ทั้งมุมภาษาและมุมพัฒนา · แถบสีบนบอกเกรด)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,400px),1fr))', gap: '14px', alignItems: 'start' }}>
            {[...radarRuns].sort((a, b) => (SCORE[b.batch] || 0) - (SCORE[a.batch] || 0)).map((r) => {
              const sc = SCORE[r.batch] || 0;
              const bar = sc >= 4 ? '#7d9a5c' : sc >= 3 ? '#c9962e' : '#b4503a';
              return (
                <div key={r.batch} style={{ padding: '14px 16px', background: '#fffdf6', border: '1px solid ' + R.line, borderTop: '4px solid ' + bar, borderRadius: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <BrandIcon name={brandOf(r.batch)} size={17} />
                    <b style={{ fontSize: '15.5px', color: R.ink }}>{fullName(r.batch)}</b>
                    <span style={{ marginLeft: 'auto', color: '#c9962e', fontSize: '13px', letterSpacing: '1px' }}>{star(sc)}</span>
                    <span style={{ fontSize: '12px', color: R.faint }}>{sc.toFixed(1)}</span>
                  </div>
                  {radarSVG(dimsOf(r))}
                  <div style={{ marginTop: '10px', paddingTop: '11px', borderTop: '1px dashed ' + R.line, fontSize: '13.5px', color: '#5f5346', lineHeight: 1.85 }}>{r.discuss}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ③ กิ่งใหม่ที่แต่ละรุ่นสร้าง */}
      <div style={app.rpCard()}>
        {app.rpHead('๓', 'กิ่งใหม่ที่แต่ละรุ่นคิดขึ้นเอง', 'กิ่งที่ยังไม่มีทั้งในคลังคำและในโครงตั้งต้น')}
        <div style={{ display: 'grid', gap: '10px' }}>
          {D.runs.filter((r) => r.newBranches.length).map((r) => (
            <div key={r.batch} style={{ padding: '13px 15px', background: '#fbf7ec', border: '1px solid ' + R.line, borderRadius: '11px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: R.ink, marginBottom: '9px' }}>
                ช่อ {thNum(r.batch)} · {shortOf(r.batch)} <span style={{ color: '#a8791f', fontWeight: 400 }}>— {r.newBranchKinds} กิ่ง ใช้กับ {r.newBranchWords} คำ</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {r.newBranches.map((b) => (
                  <span key={b.path} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 11px', borderRadius: '20px', background: '#eef3e4', border: '1px solid #cbdcb8', fontSize: '12.5px', color: '#4d6136' }}>
                    {b.path}<b style={{ padding: '0 6px', borderRadius: '20px', background: '#e2ebd4', fontSize: '11.5px' }}>{b.n}</b>
                  </span>
                ))}
              </div>
            </div>
          ))}
          {!D.runs.some((r) => r.newBranches.length) && <p style={{ fontSize: '13.5px', color: R.faint, margin: 0 }}>ไม่มีรุ่นไหนสร้างกิ่งใหม่เลยในการทดลองรอบนี้</p>}
        </div>
      </div>

      {/* ④ ตารางเทียบการจัดกลุ่มรายคำ — หัวใจของมุมที่ ๒ */}
      <div style={app.rpCard()}>
        {app.rpHead('๔', 'เทียบการจัดกลุ่มทีละคำ', 'กางครบทุกคำ ไม่ตัดทอน')}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {[['typed', 'คำที่พิมพ์เข้า', D.typed.tally.total], ['ext', 'คำที่ AI สกัดมา', D.extracted.tally.total]].map(([id, label, n]) => {
            const on = (id === 'ext') === (side === 'extracted');
            return (
              <button key={id} onClick={() => app.setState({ testSide: id })}
                style={{ padding: '8px 17px', border: '1px solid ' + (on ? R.ink : R.line), borderRadius: '9px', background: on ? R.ink : '#fbf7ec', color: on ? '#fbf3e2' : '#6f6252', fontSize: '14px', fontWeight: on ? 700 : 400, cursor: 'pointer' }}>
                {label} <span style={{ opacity: .75 }}>{n}</span>
              </button>
            );
          })}
        </div>
        {app.rpBar(pane.tally)}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f0e6cd', color: '#8a7d6d', fontSize: '11.5px' }}>
                <th style={{ padding: '9px 10px', textAlign: 'left', position: 'sticky', left: 0, background: '#f0e6cd', minWidth: '180px' }}>คำ</th>
                <th style={{ padding: '9px 8px' }}>ผล</th>
                {D.runs.map((r) => (
                  <th key={r.batch} style={{ padding: '9px 8px', textAlign: 'left', minWidth: '150px', fontWeight: 600 }}>
                    ช่อ {thNum(r.batch)}<div style={{ fontWeight: 400, color: '#a1937f' }}>{fullName(r.batch)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pane.rows.map((row, i) => {
                const [tagT, tagC, tagBg] = agreeTag[row.agree];
                return (
                  <tr key={row.text + i} style={{ borderBottom: '1px solid #efe6d2', background: i % 2 ? '#fdfaf2' : 'transparent' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 600, color: R.ink, position: 'sticky', left: 0, background: i % 2 ? '#fdfaf2' : 'var(--surface,#fffdf6)', borderRight: '1px solid #efe6d2' }}>{row.text}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '20px', background: tagBg, color: tagC, fontSize: '11.5px', whiteSpace: 'nowrap' }}>{tagT}</span>
                    </td>
                    {D.runs.map((r) => {
                      const cell = row.by[r.batch];
                      if (!cell) return <td key={r.batch} style={{ padding: '9px 8px', color: '#c9bda8', textAlign: 'center' }}>—</td>;
                      // กิ่งยาวมาก แสดงเฉพาะปลายทาง แล้วให้ดูเส้นทางเต็มตอนเอาเมาส์ชี้
                      return (
                        <td key={r.batch} style={{ padding: '9px 8px', color: '#6f6252', lineHeight: 1.55, verticalAlign: 'top' }}>
                          <div style={{ fontSize: '11px', color: '#a1937f' }}>{catName(cell.cat)}</div>
                          {cell.paths.length ? cell.paths.map((p) => (
                            <div key={p} title={p} style={{ marginTop: '2px' }}>{p.split(' / ').pop()}</div>
                          )) : <div style={{ color: '#c9bda8' }}>(ไม่มีกิ่ง)</div>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⑤ ชุดคำทดสอบ + คำสั่งที่ใช้ */}
      <div style={app.rpCard()}>
        {app.rpHead('๕', 'ชุดคำทดสอบและคำสั่งที่ใช้', 'ต้องคงที่ ผลถึงเทียบกันได้')}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <b style={{ fontSize: '14px', color: R.ink }}>ชุดคำมาตรฐาน เวอร์ชัน {thNum(D.version)}</b>
          <span style={{ fontSize: '13px', color: R.faint }}>31 บรรทัด</span>
          {app.rpCopyBtn(TEST_WORDS, 'คัดลอกชุดคำ', 'คัดลอกชุดคำทดสอบแล้ว ไปวางในหน้าเพิ่มคำได้เลย')}
        </div>
        {app.rpTextBox(TEST_WORDS, '260px')}
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '9px', alignItems: 'center' }}>
          <span style={{ fontSize: '13.5px', color: '#6f6252' }}>คำสั่ง (prompt) ที่ใช้ในการทดลองนี้ กดเพื่อดูฉบับเต็ม</span>
          {PROMPT_LOG.filter((p) => p.batches && p.batches.length).map((p) => (
            <button key={p.v} onClick={() => app.setState({ page: 'prompts', promptOpen: p.v }, app.toTop)}
              style={{ padding: '5px 13px', border: '1px solid ' + R.line, borderRadius: '20px', background: '#f7f1e2', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer' }}>
              📜 {p.no} · ช่อ {p.batches.map((b) => thNum(b)).join(' ')} →
            </button>
          ))}
        </div>
      </div>

      {/* ⑥ สิ่งที่ค้นพบ */}
      <div style={app.rpCard()}>
        {app.rpHead('๖', 'สิ่งที่ค้นพบ')}
        <div style={{ display: 'grid', gap: '11px' }}>
          {D.findings.map(([t, d, col, bg]) => (
            <div key={t} style={{ padding: '14px 16px', background: bg, borderRadius: '11px', borderLeft: '4px solid ' + col }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: col, marginBottom: '5px' }}>{t}</div>
              <div style={{ fontSize: '13.5px', color: '#5f5346', lineHeight: 1.85 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ⑦ ข้อจำกัด */}
      <div style={app.rpCard()}>
        {app.rpHead('๗', 'ข้อจำกัดของการทดลองนี้', 'เขียนไว้กันตัวเองเชื่อผลมากเกินจริง')}
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#5f5346', lineHeight: 2 }}>
          {D.limits.map((x, i) => {
            const m = x.split(' — ');
            return <li key={i}>{m.length > 1 ? <><b>{m[0]}</b> — {m.slice(1).join(' — ')}</> : x}</li>;
          })}
        </ol>
      </div>
    </div>
  );
}
