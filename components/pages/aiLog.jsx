'use client';
import React from 'react';
import { BrandIcon } from '@/lib/brandIcons';
import { thNum } from '@/components/helpers';

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
  const hasBatch = !!(sum && sum.hasBatchStats);

  // ----- ไฮไลต์โมเดลเด่น (จาก byModel) -----
  const byModel = (sum && sum.byModel) || [];
  const ok = byModel.filter((m) => m.okCalls > 0);
  const perWord = (m) => (m.extracted > 0 ? (m.cost * USD_THB) / m.extracted : Infinity);
  const avgSec = (m) => (m.okCalls > 0 ? m.durationMs / m.okCalls / 1000 : Infinity);
  const pickMin = (arr, f) => arr.length ? arr.reduce((a, b) => (f(b) < f(a) ? b : a)) : null;
  const pickMax = (arr, f) => arr.length ? arr.reduce((a, b) => (f(b) > f(a) ? b : a)) : null;
  const cheapest = pickMin(ok.filter((m) => m.cost > 0 && m.extracted > 0), perWord);
  const fastest = pickMin(ok, avgSec);
  const topExtract = pickMax(ok, (m) => m.extracted);
  // แพงสุด = ค่าใช้จ่ายรวมมากสุด นับทุกรุ่น (รวมที่เฟล เพราะจ่ายเงินไปแล้วจริง) ให้ตรงกับการ์ดรายรุ่น
  const priciest = pickMax(byModel.filter((m) => m.cost > 0), (m) => m.cost);

  const statCard = (label, value, sub) => (
    <div style={{ flex: '1 1 148px', background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '12px', padding: '13px 16px' }}>
      <div style={{ fontSize: '12px', color: '#8a7d6d', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '21px', fontWeight: 600, color: '#4a3f35' }}>{value}</div>
      {sub ? <div style={{ fontSize: '12.5px', color: '#a99b83', marginTop: '3px' }}>{sub}</div> : null}
    </div>
  );
  const btn = (on) => ({ padding: '6px 13px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: '1px solid ' + (on ? 'var(--primary,#6f4e37)' : '#ddcba4'), background: on ? 'var(--primary,#6f4e37)' : 'var(--panel,#f7f0e0)', color: on ? '#fbf3e2' : '#6f6252' });
  // ป้ายไฮไลต์โมเดลเด่น (icon + คำอธิบาย + โมเดล + ค่า)
  const hi = (glyph, title, m, valTxt, tone) => m ? (
    <div style={{ flex: '1 1 210px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface,#fffdf6)', border: '1px solid ' + tone, borderLeft: '5px solid ' + tone, borderRadius: '12px', padding: '11px 14px' }}>
      <span style={{ fontSize: '22px' }}>{glyph}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '11.5px', color: '#a99b83' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#4a3f35', fontSize: '13.5px' }}>
          <BrandIcon name={m.provider} size={14} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.model}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#8a5a1e' }}>{valTxt}</div>
      </div>
    </div>
  ) : null;

  // แถวบอกสถิติช่อในรายการ (พิมพ์เข้า→สกัด→บันทึก + กิ่งใหม่) — โชว์เฉพาะแถวที่มีข้อมูลช่อ
  const batchBits = (l) => {
    const bits = [];
    if (l.typed_count != null) bits.push('พิมพ์เข้า ' + fmtNum(l.typed_count));
    if (l.extracted_count) bits.push('✂ สกัด ' + fmtNum(l.extracted_count));
    if (l.saved_count) bits.push('✓ บันทึก ' + fmtNum(l.saved_count));
    return bits.join(' · ');
  };

  return (
    <section style={{ maxWidth: '1100px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.1 }}>ประวัติ &amp; สถิติ</h1>
        <div style={{ flex: 1 }} />
        <button onClick={app.loadAiLogs} style={{ padding: '9px 16px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '14px', cursor: 'pointer' }}>↻ รีเฟรช</button>
      </div>
      <p style={{ fontSize: '14px', color: '#8a7d6d', margin: '10px 0 20px' }}>ทุกครั้งที่กดให้ AI จัดคำ = ๑ ช่อ · บันทึกไว้ถาวรแม้คำจะย้ายเข้าคลังแล้ว — เจ้าไหน รุ่นอะไร วันเวลา สำเร็จ/พลาด ใช้ token เท่าไหร่ กี่วินาที ค่าใช้จ่ายประมาณ พิมพ์เข้ากี่คำ สกัดเพิ่มกี่คำ สร้างกิ่งใหม่กี่กิ่ง · คิดเป็นเงินบาทที่อัตราคงที่ {USD_THB.toFixed(2)} บาท/USD</p>

      {S.aiLogLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#a99b83' }}>กำลังโหลด…</div>}

      {sum && sum.totalCalls === 0 && !S.aiLogLoading && (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: '#a99b83' }}>
          <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '28px', color: '#c3b48f' }}>ยังไม่มีประวัติ</div>
          <p>ลองไปหน้า “เพิ่มคำ” เลือก AI แล้วจัดคำสักครั้ง</p>
        </div>
      )}

      {sum && sum.totalCalls > 0 && (
        <>
          {/* การ์ดสรุปยอดรวม */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {statCard('เรียกทั้งหมด', fmtNum(sum.totalCalls) + ' ครั้ง')}
            {statCard('ช่อทั้งหมด', hasBatch ? fmtNum(sum.totalBatches) + ' ช่อ' : '—', hasBatch ? '' : 'เริ่มนับช่อใหม่')}
            {statCard('token รวม', fmtNum(sum.totalTokens))}
            {statCard('สกัดเพิ่มรวม', fmtNum(sum.totalExtracted || 0) + ' คำ')}
            {statCard('บันทึกจริง', fmtNum(sum.totalSaved || 0) + ' คำ')}
            {statCard('กิ่งใหม่รวม', hasBatch ? fmtNum(sum.totalNewBranch) + ' กิ่ง' : '—', hasBatch ? '' : 'เริ่มนับช่อใหม่')}
            {statCard('ค่าใช้จ่ายประมาณ', fmtBaht(sum.totalCost), Number(sum.totalCost) > 0 ? fmtCost(sum.totalCost) : '')}
            {statCard('พลาด', fmtNum(sum.totalErrors) + ' ครั้ง')}
          </div>

          {/* แถบไฮไลต์โมเดลเด่น */}
          {ok.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {hi('🏆', 'คุ้มสุด (บาท/คำสกัด)', cheapest, cheapest ? (perWord(cheapest)).toFixed(2) + ' บาท/คำ' : '', '#7d9a5c')}
              {hi('⚡', 'เร็วสุด (เฉลี่ยต่อช่อ)', fastest, fastest ? avgSec(fastest).toFixed(0) + ' วินาที/ช่อ' : '', '#c9962e')}
              {hi('✂', 'สกัดเยอะสุด', topExtract, topExtract ? fmtNum(topExtract.extracted) + ' คำ' : '', '#6f4e37')}
              {hi('💸', 'แพงสุด (รวม)', priciest, priciest ? fmtBaht(priciest.cost) : '', '#b4503a')}
            </div>
          )}

          {/* การ์ดรายรุ่น (byModel) */}
          {byModel.length > 0 && (
            <>
              <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 700, fontSize: '16px', color: '#5b4a36', margin: '0 0 9px' }}>สรุปรายรุ่น</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: '10px', marginBottom: '22px' }}>
                {byModel.slice().sort((a, b) => b.calls - a.calls).map((m) => (
                  <div key={m.model} style={{ background: 'var(--surface,#fffdf6)', border: '1px solid #e6dabf', borderRadius: '12px', padding: '13px 15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px', minWidth: 0 }}>
                      <BrandIcon name={m.provider} size={18} />
                      <b style={{ color: '#4a3f35', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.model}</b>
                      <span style={{ fontSize: '12.5px', color: '#a99b83' }}>{m.calls} ครั้ง</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6f6252', lineHeight: 1.7 }}>
                      <div>ค่าใช้จ่าย: <b>{fmtBaht(m.cost)}</b>{m.extracted > 0 && m.cost > 0 ? ' · ' + perWord(m).toFixed(2) + ' บาท/คำ' : ''}</div>
                      <div>token: <b>{fmtNum(m.tokensIn + m.tokensOut)}</b>{m.okCalls > 0 ? ' · เฉลี่ย ' + avgSec(m).toFixed(0) + ' วิ/ช่อ' : ''}</div>
                      <div>สกัด {fmtNum(m.extracted)} · บันทึก {fmtNum(m.saved)}{m.errors ? ' · พลาด ' + m.errors : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ตัวกรองรายเจ้า */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button onClick={() => app.setState({ aiLogFilter: 'all' })} style={btn(S.aiLogFilter === 'all')}>ทั้งหมด</button>
            {sum.byProvider.map((b) => <button key={b.provider} onClick={() => app.setState({ aiLogFilter: b.provider })} style={btn(S.aiLogFilter === b.provider)}>{b.label}</button>)}
          </div>

          {S.isMobile ? (
            /* มือถือ: แต่ละช่อ/การเรียก AI = การ์ด 1 ใบ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.map((l) => {
                const focus = l.batch_code && l.batch_code === S.focusLogBatch;
                return (
                <div key={l.id}
                  ref={(el) => { if (el && focus && app._focusScrolled !== l.batch_code) { app._focusScrolled = l.batch_code; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); } }}
                  style={{ border: '1px solid ' + (focus ? '#c9962e' : '#e6dabf'), boxShadow: focus ? '0 0 0 2px #f0dfae' : 'none', borderRadius: '12px', background: 'var(--surface,#fffdf6)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                    <BrandIcon name={l.provider} size={17} />
                    <span style={{ flex: 1, fontWeight: 600, color: '#4a3f35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.model || l.provider_label}</span>
                    {l.batch_no != null && <span style={{ flex: 'none', fontSize: '11.5px', color: '#6f6252', background: '#f0e6cd', border: '1px solid #e0d0ac', borderRadius: '20px', padding: '2px 9px' }}>ช่อ {thNum(l.batch_no)}</span>}
                    {l.status === 'error'
                      ? <span title={l.error || ''} style={{ flex: 'none', color: '#fff', background: '#e01e1e', borderRadius: '20px', padding: '2px 10px', fontSize: '11.5px', fontWeight: 600 }}>พลาด</span>
                      : <span style={{ flex: 'none', color: '#5a7040', background: '#e9efe1', border: '1px solid #cbdcb8', borderRadius: '20px', padding: '2px 10px', fontSize: '11.5px' }}>สำเร็จ</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6f6252', lineHeight: 1.65 }}>{batchBits(l) || (fmtNum(l.input_chars) + ' ตัวอักษร → ' + fmtNum(l.item_count) + ' คำ')}{l.new_branch_count ? ' · ✦ กิ่งใหม่ ' + fmtNum(l.new_branch_count) : ''}{l.restored_count ? ' · 🛟 เติมกลับ ' + fmtNum(l.restored_count) : ''}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', fontSize: '12.5px', color: '#8a7d6d', marginTop: '5px' }}>
                    <span>{fmtTH(l.created_at)}</span>
                    <span>token {l.tokens_in || l.tokens_out ? fmtNum((l.tokens_in || 0) + (l.tokens_out || 0)) : '—'}</span>
                    <span>ค่าใช้จ่าย {fmtCost(l.cost_usd)}{Number(l.cost_usd) > 0 ? ' · ' + fmtBaht(l.cost_usd) : ''}</span>
                  </div>
                </div>
                );
              })}
              {logs.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a99b83' }}>ไม่มีรายการในตัวกรองนี้</div>}
            </div>
          ) : (
            <div style={{ border: '1px solid #e0d0ac', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface,#fffdf6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '108px 58px 1.25fr 1.7fr 82px 88px 60px', gap: '10px', padding: '11px 16px', background: '#f0e6cd', borderBottom: '1px solid #e0d0ac', fontSize: '12px', fontWeight: 600, color: '#8a7d6d' }}>
                <span>เวลา</span><span>ช่อ</span><span>เจ้า / รุ่น</span><span>พิมพ์เข้า→สกัด→บันทึก · กิ่งใหม่</span><span>token</span><span>ค่าใช้จ่าย</span><span>ผล</span>
              </div>
              <div style={{ maxHeight: '540px', overflowY: 'auto' }}>
                {logs.map((l) => {
                  const focus = l.batch_code && l.batch_code === S.focusLogBatch;
                  return (
                  <div key={l.id}
                    ref={(el) => { if (el && focus && app._focusScrolled !== l.batch_code) { app._focusScrolled = l.batch_code; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); } }}
                    style={{ display: 'grid', gridTemplateColumns: '108px 58px 1.25fr 1.7fr 82px 88px 60px', gap: '10px', padding: '10px 16px', borderBottom: '1px solid #f0e6cd', alignItems: 'center', fontSize: '13px', color: '#5c5044', background: focus ? '#fbf3dc' : 'transparent' }}>
                    <span style={{ color: '#8a7d6d', fontSize: '12px' }}>{fmtTH(l.created_at)}</span>
                    <span style={{ fontSize: '12.5px', color: '#6f6252' }}>{l.batch_no != null ? thNum(l.batch_no) : '—'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <BrandIcon name={l.provider} size={15} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.model || l.provider_label}</span>
                    </span>
                    <span style={{ color: '#6f6252', overflow: 'hidden' }}>
                      {batchBits(l) || (fmtNum(l.input_chars) + ' ตัวอักษร → ' + fmtNum(l.item_count) + ' คำ')}
                      {l.new_branch_count ? <span style={{ color: '#5a7040' }}>{' · ✦ ' + fmtNum(l.new_branch_count)}</span> : ''}
                      {l.restored_count ? <span style={{ color: '#8a5a1e' }}>{' · 🛟 ' + fmtNum(l.restored_count)}</span> : ''}
                    </span>
                    <span>{l.tokens_in || l.tokens_out ? fmtNum((l.tokens_in || 0) + (l.tokens_out || 0)) : '—'}</span>
                    <span>{fmtCost(l.cost_usd)}{Number(l.cost_usd) > 0 ? <span style={{ display: 'block', fontSize: '11px', color: '#a99b83' }}>{fmtBaht(l.cost_usd)}</span> : null}</span>
                    <span>{l.status === 'error'
                      ? <span title={l.error || ''} style={{ color: '#fff', background: '#e01e1e', borderRadius: '20px', padding: '2px 9px', fontSize: '11.5px', fontWeight: 600 }}>พลาด</span>
                      : <span style={{ color: '#5a7040', background: '#e9efe1', border: '1px solid #cbdcb8', borderRadius: '20px', padding: '2px 9px', fontSize: '11.5px' }}>สำเร็จ</span>}</span>
                  </div>
                  );
                })}
                {logs.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a99b83' }}>ไม่มีรายการในตัวกรองนี้</div>}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
