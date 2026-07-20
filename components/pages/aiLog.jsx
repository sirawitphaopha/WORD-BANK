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

export function renderAiLog(app) {
  const S = app.state;
  const sum = S.aiSummary;
  const p2 = (n) => String(n).padStart(2, '0');
  const fmtTH = (iso) => { // เวลาไทย (+7) พ.ศ.
    if (!iso) return '';
    const t = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
    return t.getUTCDate() + '/' + (t.getUTCMonth() + 1) + '/' + (t.getUTCFullYear() + 543) + ' ' + p2(t.getUTCHours()) + ':' + p2(t.getUTCMinutes());
  };
  const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
  const fmtCost = (c) => Number(c) > 0 ? '$' + Number(c).toFixed(Number(c) < 0.01 ? 5 : 4) : 'ฟรี';
  // อัตราแลกเปลี่ยนพื้นฐาน USD→บาท (ค่าคงที่ ไม่ผูกกับอัตราวันนี้) — 35 คือเลขกลมที่ใช้อ้างอิงทั่วไป · แก้จุดเดียวถ้าอยากปรับ
  const USD_THB = 35;
  const fmtBaht = (c) => Number(c) > 0 ? (Number(c) * USD_THB).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท' : 'ฟรี';
  const logs = S.aiLogFilter === 'all' ? S.aiLogs : S.aiLogs.filter((l) => l.provider === S.aiLogFilter);
  const statCard = (label, value, sub) => (
    <div style={{ flex: '1 1 150px', background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '12px', padding: '13px 16px' }}>
      <div style={{ fontSize: '12px', color: '#8a7d6d', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '21px', fontWeight: 600, color: '#4a3f35' }}>{value}</div>
      {sub ? <div style={{ fontSize: '12.5px', color: '#a99b83', marginTop: '3px' }}>{sub}</div> : null}
    </div>
  );
  const btn = (on) => ({ padding: '6px 13px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: '1px solid ' + (on ? 'var(--primary,#6f4e37)' : '#ddcba4'), background: on ? 'var(--primary,#6f4e37)' : 'var(--panel,#f7f0e0)', color: on ? '#fbf3e2' : '#6f6252' });
  const cols = '128px 1.4fr 1.5fr 96px 92px 70px';
  return (
    <section style={{ maxWidth: '1100px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>ประวัติการใช้ AI</h1>
        <div style={{ flex: 1 }} />
        <button onClick={app.loadAiLogs} style={{ padding: '9px 16px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '14px', cursor: 'pointer' }}>↻ รีเฟรช</button>
      </div>
      <p style={{ fontSize: '14px', color: '#8a7d6d', margin: '10px 0 20px' }}>บันทึกทุกครั้งที่เรียก AI จัดคำ — เจ้าไหน รุ่นอะไร ใช้ token เท่าไหร่ กี่วินาที และค่าใช้จ่ายประมาณ (ราคาประเมิน ไม่ใช่ยอดจริง) · คิดเป็นเงินบาทที่อัตราคงที่ {USD_THB.toFixed(2)} บาท/USD</p>

      {S.aiLogLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#a99b83' }}>กำลังโหลด…</div>}

      {sum && sum.totalCalls === 0 && !S.aiLogLoading && (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: '#a99b83' }}>
          <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '28px', color: '#c3b48f' }}>ยังไม่มีประวัติ</div>
          <p>ลองไปหน้า “เพิ่มคำ” เลือก AI แล้วจัดคำสักครั้ง</p>
        </div>
      )}

      {sum && sum.totalCalls > 0 && (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {statCard('เรียกทั้งหมด', fmtNum(sum.totalCalls) + ' ครั้ง')}
            {statCard('token รวม', fmtNum(sum.totalTokens))}
            {statCard('ค่าใช้จ่ายประมาณ', fmtBaht(sum.totalCost), Number(sum.totalCost) > 0 ? fmtCost(sum.totalCost) : '')}
            {statCard('พลาด', fmtNum(sum.totalErrors) + ' ครั้ง')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: '10px', marginBottom: '22px' }}>
            {sum.byProvider.slice().sort((a, b) => b.calls - a.calls).map((b) => (
              <div key={b.provider} style={{ background: 'var(--surface,#fffdf6)', border: '1px solid #e6dabf', borderRadius: '12px', padding: '13px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
                  <BrandIcon name={b.provider} size={18} />
                  <b style={{ color: '#4a3f35', flex: 1 }}>{b.label}</b>
                  <span style={{ fontSize: '12.5px', color: '#a99b83' }}>{b.calls} ครั้ง</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6f6252', lineHeight: 1.7 }}>
                  <div>ค่าใช้จ่าย: <b>{fmtBaht(b.cost)}</b>{Number(b.cost) > 0 ? ' (' + fmtCost(b.cost) + ')' : ''}</div>
                  <div>token: <b>{fmtNum(b.tokensIn + b.tokensOut)}</b></div>
                  <div>แยกได้ {fmtNum(b.items)} คำ · บันทึก {fmtNum(b.saved)} คำ{b.errors ? ' · พลาด ' + b.errors : ''}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button onClick={() => app.setState({ aiLogFilter: 'all' })} style={btn(S.aiLogFilter === 'all')}>ทั้งหมด</button>
            {sum.byProvider.map((b) => <button key={b.provider} onClick={() => app.setState({ aiLogFilter: b.provider })} style={btn(S.aiLogFilter === b.provider)}>{b.label}</button>)}
          </div>

          {S.isMobile ? (
            /* มือถือ: แต่ละครั้งที่เรียก AI = การ์ด 1 ใบ (แทนตาราง 6 คอลัมน์ที่เบียดจอ) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.map((l) => (
                <div key={l.id} style={{ border: '1px solid #e6dabf', borderRadius: '12px', background: 'var(--surface,#fffdf6)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                    <BrandIcon name={l.provider} size={17} />
                    <span style={{ flex: 1, fontWeight: 600, color: '#4a3f35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.model || l.provider_label}</span>
                    {l.status === 'error'
                      ? <span title={l.error || ''} style={{ flex: 'none', color: '#fff', background: '#e01e1e', borderRadius: '20px', padding: '2px 10px', fontSize: '11.5px', fontWeight: 600 }}>พลาด</span>
                      : <span style={{ flex: 'none', color: '#5a7040', background: '#e9efe1', border: '1px solid #cbdcb8', borderRadius: '20px', padding: '2px 10px', fontSize: '11.5px' }}>สำเร็จ</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6f6252', lineHeight: 1.65 }}>{fmtNum(l.input_chars)} ตัวอักษร → {fmtNum(l.item_count)} คำ{l.saved_count ? ' → บันทึก ' + fmtNum(l.saved_count) : ''}{l.skipped_count ? ' (ซ้ำ ' + l.skipped_count + ')' : ''}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', fontSize: '12.5px', color: '#8a7d6d', marginTop: '5px' }}>
                    <span>{fmtTH(l.created_at)}</span>
                    <span>token {l.tokens_in || l.tokens_out ? fmtNum((l.tokens_in || 0) + (l.tokens_out || 0)) : '—'}</span>
                    <span>ค่าใช้จ่าย {fmtCost(l.cost_usd)}{Number(l.cost_usd) > 0 ? ' · ' + fmtBaht(l.cost_usd) : ''}</span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a99b83' }}>ไม่มีรายการในตัวกรองนี้</div>}
            </div>
          ) : (
            <div style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', padding: '11px 16px', background: '#f0e6cd', borderBottom: '1px solid #e0d0ac', fontSize: '12px', fontWeight: 600, color: '#8a7d6d' }}>
                <span>เวลา</span><span>เจ้า / รุ่น</span><span>คำ (เข้า→แยก→บันทึก)</span><span>token</span><span>ค่าใช้จ่าย</span><span>ผล</span>
              </div>
              <div style={{ maxHeight: '540px', overflowY: 'auto' }}>
                {logs.map((l) => (
                  <div key={l.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', padding: '10px 16px', borderBottom: '1px solid #f0e6cd', alignItems: 'center', fontSize: '13px', color: '#5c5044' }}>
                    <span style={{ color: '#8a7d6d', fontSize: '12px' }}>{fmtTH(l.created_at)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <BrandIcon name={l.provider} size={15} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.model || l.provider_label}</span>
                    </span>
                    <span style={{ color: '#6f6252' }}>{fmtNum(l.input_chars)} ตัวอักษร → {fmtNum(l.item_count)} คำ{l.saved_count ? ' → บันทึก ' + fmtNum(l.saved_count) : ''}{l.skipped_count ? ' (ซ้ำ ' + l.skipped_count + ')' : ''}</span>
                    <span>{l.tokens_in || l.tokens_out ? fmtNum((l.tokens_in || 0) + (l.tokens_out || 0)) : '—'}</span>
                    <span>{fmtCost(l.cost_usd)}{Number(l.cost_usd) > 0 ? <span style={{ display: 'block', fontSize: '11px', color: '#a99b83' }}>{fmtBaht(l.cost_usd)}</span> : null}</span>
                    <span>{l.status === 'error'
                      ? <span title={l.error || ''} style={{ color: '#fff', background: '#e01e1e', borderRadius: '20px', padding: '2px 9px', fontSize: '11.5px', fontWeight: 600 }}>พลาด</span>
                      : <span style={{ color: '#5a7040', background: '#e9efe1', border: '1px solid #cbdcb8', borderRadius: '20px', padding: '2px 9px', fontSize: '11.5px' }}>สำเร็จ</span>}</span>
                  </div>
                ))}
                {logs.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a99b83' }}>ไม่มีรายการในตัวกรองนี้</div>}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
