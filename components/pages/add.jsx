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

export function renderAdd(app) {
  const S = app.state;
  const lc = S.addText.split('\n').filter((l) => l.trim()).length;
  // นับ "คำ/วลี" = จำนวนบรรทัดที่มีข้อความ (แต่ละบรรทัด = 1 คำ/วลีที่จะส่งให้ AI) · ว่าง = 0 คำ/วลี · ย้ายไปโชว์ข้างป้าย "ข้อความที่เก็บมา"
  const countHint = lc + ' คำ/วลี';
  const novelChips = S.novels.slice(0, 5);
  const howSteps = [
    { n: '๑', t: 'แก้คำสะกดผิดก่อนเป็นอันดับแรก', d: 'เช่น “หายสายสูญ” → “หายสาบสูญ”, “ระแวกบ้าน” → “ละแวกบ้าน”' },
    { n: '๒', t: 'แยกวลีย่อยที่น่าเก็บออกจากประโยคยาว', d: 'ไม่โยนทั้งประโยคเป็นก้อนเดียว แต่หยิบเฉพาะคำงาม ๆ' },
    { n: '๓', t: 'จัดเข้าหมวด โดยยึดหมวดเดิมก่อน', d: 'ถ้าไม่มีหมวดที่เหมาะ จะเสนอหมวดใหม่ให้พิจารณา' },
  ];
  return (
    <section style={{ maxWidth: '1040px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
      <h1 style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: 'clamp(34px,4.4vw,48px)', margin: '0 0 8px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.1, textAlign: S.isMobile ? 'center' : undefined }}>เพิ่มคำเข้าคลัง</h1>
      <p style={{ fontSize: '17px', color: '#6f6252', maxWidth: '620px', margin: S.isMobile ? '0 auto 30px' : '0 0 30px', textWrap: 'pretty', textAlign: S.isMobile ? 'center' : undefined }}>วางข้อความที่เก็บมาจากการอ่าน จะเป็นคำเดี่ยว วลี หรือทั้งประโยคปนกันก็ได้ แล้วให้ AI ช่วยแก้คำสะกด แยกวลีย่อย และจัดเข้าหมวดให้อัตโนมัติ</p>

      <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#5c5044', margin: '0 0 8px' }}>เรื่อง / นิยายที่คำชุดนี้มาจาก</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', maxWidth: '620px' }}>
        <input list="wb-novels" value={S.novelInput} onChange={(e) => app.setState({ novelInput: e.target.value })} placeholder="พิมพ์ชื่อเรื่องใหม่ หรือเลือกจากที่มี" style={{ flex: 1, minWidth: '240px', padding: '12px 14px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none' }} />
        {S.novels.length > 0 && (
          <select value="" onChange={(e) => { if (e.target.value) app.setState({ novelInput: e.target.value }); }} style={{ padding: '12px 12px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--surface,#fffdf6)', color: '#3a2f28', outline: 'none', cursor: 'pointer', maxWidth: '200px' }}>
            <option value="">▾ เลือกเรื่องที่มี</option>
            {S.novels.map((nv) => <option key={nv} value={nv}>{nv}</option>)}
          </select>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', margin: '12px 0 26px' }}>
        {novelChips.map((c) => (
          <button key={c} onClick={() => app.setState({ novelInput: c })} style={{ padding: '5px 12px', border: '1px solid #ddcba4', borderRadius: '20px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>{c}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '0 0 8px' }}>
        <label style={{ fontWeight: 600, fontSize: '14px', color: '#5c5044' }}>ข้อความที่เก็บมา</label>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '13px', color: '#8a7d6d', whiteSpace: 'nowrap' }}>{countHint}</span>
      </div>
      {S.draftRestored && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#5a6a3a', background: '#eef3dc', border: '1px solid #cfdca8', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px' }}>
          <span style={{ flex: 1 }}>↩ กู้ข้อความค้างจากรอบก่อนกลับมาให้แล้ว หน้าปิด/รีเฟรชไปตอนกำลังรอ AI</span>
          <button onClick={() => app.setState({ draftRestored: false })} style={{ border: 'none', background: 'transparent', color: '#7a8a5a', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
      )}
      <textarea value={S.addText} onChange={(e) => app.setState({ addText: e.target.value })} rows={11} placeholder={S.isMobile ? 'วางคำหรือข้อความที่นี่…\nขึ้นบรรทัดใหม่ หรือคั่นด้วย ( , )\nประโยคยาว AI ช่วยแยกวลีให้เอง' : 'วางคำหรือข้อความที่นี่…\nเว้นบรรทัดใหม่ หรือคั่นด้วยจุลภาค ( , ) เพื่อแยกหลายคำ\nประโยคยาว ๆ AI จะช่วยแยกวลีย่อยที่น่าเก็บให้เอง'} style={{ width: '100%', padding: '16px 18px', border: '1px solid #d8c7a2', borderRadius: '12px', background: 'var(--surface,#fffdf6)', lineHeight: 1.9, fontSize: '17px', color: '#3a2f28', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(120,90,50,.06)' }} />

      {(() => {
        const prov = app.eff('aiProvider', 'basic');
        const cur = PROVIDERS[prov] || PROVIDERS.basic;
        const selModel = app.eff('aiModel:' + prov, '') || cur.model || '';
        const selStyle = { padding: '8px 11px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'var(--surface,#fffdf6)', color: '#4a4034', fontSize: '13.5px', cursor: 'pointer', outline: 'none' };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginTop: '14px' }}>
            <span style={{ fontSize: '13px', color: '#8a7d6d' }}>ผู้ช่วย AI</span>
            <BrandIcon name={prov} size={19} />
            {/* มือถือ: แถว 1 = ป้าย+โลโก้+ช่องเลือกเจ้า (flex:1 หดพอดีจอ) + ปุ่ม "api key" (อยู่แถวเดียวกับช่องเลือกเจ้า ตามที่พี่กันสั่ง) →
                ขึ้นบรรทัดใหม่ (ตัวเว้นบรรทัด flexBasis:100%) → แถว 2 = ช่องเลือกรุ่น (flex:1 = ยาวเต็มแถวคนเดียว โชว์ชื่อรุ่นเต็ม ไม่ต้องหด) →
                · จอคอมไม่ใส่ตัวเว้นบรรทัด (guard S.isMobile) ใช้ flex-wrap แถวเดียว ปุ่ม api key อยู่ท้ายสุดเหมือนเดิม */}
            <select value={prov} onChange={(e) => app.setUi('aiProvider', e.target.value)()} style={{ ...selStyle, ...(S.isMobile ? { flex: 1, minWidth: 0 } : {}) }}>
              {PROVIDER_ORDER.map((k) => PROVIDERS[k] ? <option key={k} value={k}>{PROVIDERS[k].label}{PROVIDERS[k].tag ? ' · ' + PROVIDERS[k].tag : ''}</option> : null)}
            </select>
            {S.isMobile && cur.keyUrl ? <a href={cur.keyUrl} target="_blank" rel="noopener noreferrer" title={'เปิดเว็บขอ API key ของ ' + cur.label} style={{ fontSize: '12.5px', color: '#5a7040', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #cbdcb8', borderRadius: '8px', padding: '7px 10px', background: '#eef3dc', flex: 'none' }}>🔗 api key</a> : null}
            {S.isMobile ? <div style={{ flexBasis: '100%', height: 0 }} /> : null}
            {Array.isArray(cur.models) && cur.models.length ? (
              <select value={selModel} onChange={(e) => app.setUi('aiModel:' + prov, e.target.value)()} style={{ ...selStyle, ...(S.isMobile ? { flex: 1, minWidth: 0 } : {}) }}>
                {cur.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : null}
            {!S.isMobile && cur.keyUrl ? <a href={cur.keyUrl} target="_blank" rel="noopener noreferrer" title={'เปิดเว็บขอ API key ของ ' + cur.label} style={{ fontSize: '12.5px', color: '#5a7040', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #cbdcb8', borderRadius: '8px', padding: '7px 10px', background: '#eef3dc' }}>🔗 api key</a> : null}
          </div>
        );
      })()}
      {/* มือถือ: ปุ่มใหญ่เต็มความกว้าง จัดกลาง (วางบน · ให้ AI ช่วยจัด = ปุ่มหลักใหญ่สุดล่าง เหมือนปุ่มตกลง) · จอคอม: 2 ปุ่มชิดขวาเหมือนเดิม */}
      <div style={S.isMobile
        ? { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', alignItems: 'stretch' }
        : { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '14px', justifyContent: 'flex-end' }}>
        <button onClick={app.pasteClipboard} style={S.isMobile
          ? { width: '100%', padding: '15px', border: '1px solid #d8c7a2', borderRadius: '12px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '17px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
          : { padding: '11px 18px', border: '1px solid #d8c7a2', borderRadius: '10px', background: 'var(--panel,#f7f0e0)', color: '#6f6252', fontSize: '15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}><span style={{ fontSize: S.isMobile ? '19px' : '16px' }}>📋</span> วาง</button>
        <button onClick={app.process} style={S.isMobile
          ? { width: '100%', padding: '19px', border: 'none', borderRadius: '14px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '20px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 14px rgba(111,78,55,.34)' }
          : { padding: '11px 22px', border: 'none', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 2px 8px rgba(111,78,55,.3)' }}><span style={{ fontSize: S.isMobile ? '23px' : '17px' }}>✎</span> ให้ AI ช่วยจัด</button>
      </div>

      {(() => {
        const open = S.promptOpen, unlock = S.promptUnlock;
        // ปุ่มคัดลอกคำสั่ง แยกกรอบอังกฤษ/ไทย (เอาไปวางในแชต AI เจ้าอื่น หรือเก็บสำรองก่อนแก้)
        const copyPromptBtn = (label, text) => (
          <button onClick={(e) => { e.stopPropagation(); app.copyText(text, 'คัดลอกคำสั่ง' + label + 'แล้ว'); }}
            title={'คัดลอกคำสั่งฉบับ' + label + 'ทั้งหมด'}
            style={{ padding: '5px 12px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'var(--surface,#fffdf6)', color: '#6f6252', fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 คัดลอก</button>
        );
        const taStyle = (locked) => ({ width: '100%', padding: '12px 13px', borderRadius: '10px', border: '1px solid #ddcba4', background: locked ? '#f4efe3' : 'var(--surface,#fffdf6)', color: locked ? '#6a6053' : '#4a4034', fontSize: '12px', lineHeight: 1.55, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', outline: 'none', resize: 'vertical', cursor: locked ? 'default' : 'text' });
        return (
          <div style={{ marginTop: '28px', padding: '18px 20px', background: 'var(--panel,#f7f0e0)', border: '1px solid #e4d5b4', borderRadius: '14px' }}>
            <div onClick={() => app.setState({ promptOpen: !open })} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '18px' }}>คำสั่ง AI (prompt)</div>
              <span style={{ fontSize: '12.5px', color: '#8a7d6d' }}>คำสั่งที่บอก AI ว่าให้จัดคำอย่างไร</span>
              <div style={{ flex: 1 }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '15px', flex: 'none', boxShadow: '0 2px 5px rgba(90,60,30,.3)' }}>
                <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', lineHeight: 1 }}>▸</span>
              </span>
            </div>
            {open ? (
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => app.setState({ promptUnlock: !unlock })} style={{ padding: '7px 14px', border: 'none', borderRadius: '8px', background: unlock ? '#9c6b3f' : 'var(--primary,#6f4e37)', color: '#fbf3e2', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{unlock ? '🔓 กำลังแก้ไข — กดเพื่อล็อก' : '🔒 เปิดแก้ไข'}</button>
                  {unlock ? <button onClick={() => app.setUi('aiPromptEn', '')()} style={{ padding: '7px 13px', border: '1px solid #d8c7a2', borderRadius: '8px', background: 'transparent', color: '#6f6252', fontSize: '13px', cursor: 'pointer' }}>คืนค่าเริ่มต้น</button> : null}
                  <span style={{ fontSize: '12px', color: '#a89a86' }}>{unlock ? 'แก้กรอบอังกฤษได้แล้ว' : 'ล็อกอยู่ กันเผลอลบ'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 5px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#5c5044' }}>English — ส่งให้ AI จริง (แก้ที่กรอบนี้)</div>
                  <div style={{ flex: 1 }} />
                  {copyPromptBtn('อังกฤษ', app.eff('aiPromptEn', '') || DEFAULT_PROMPT_EN)}
                </div>
                <textarea value={app.eff('aiPromptEn', '') || DEFAULT_PROMPT_EN} readOnly={!unlock} onChange={(e) => app.setUi('aiPromptEn', e.target.value)()} rows={12} style={taStyle(!unlock)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 5px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#5c5044' }}>ไทย — ไว้อ่านเข้าใจ (ไม่ได้ส่งให้ AI)</div>
                  <div style={{ flex: 1 }} />
                  {copyPromptBtn('ไทย', DEFAULT_PROMPT_TH)}
                </div>
                <textarea value={DEFAULT_PROMPT_TH} readOnly rows={12} style={taStyle(true)} />
                <div style={{ fontSize: '11.5px', color: '#a89a86', marginTop: '8px' }}>ส่งเฉพาะภาษาอังกฤษให้ AI (ตอบแม่นสุด) · หมวดและข้อความระบบเติมให้อัตโนมัติ · ใช้กับผู้ช่วย AI จริง ไม่ใช่ "พื้นฐาน"</div>
              </div>
            ) : null}
          </div>
        );
      })()}

      <div style={{ marginTop: '20px', padding: '24px 26px', background: 'var(--panel,#f7f0e0)', border: '1px solid #e4d5b4', borderRadius: '14px' }}>
        <div style={{ fontFamily: "var(--font-trirong),serif", fontWeight: 600, fontSize: '18px', marginBottom: '14px' }}>AI จะทำงานให้ตามลำดับนี้</div>
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

export function renderProcessing(app, accent) {
  const S = app.state;
  const sec = S.procElapsed || 0;
  const elapsed = sec < 60 ? sec + ' วินาที' : Math.floor(sec / 60) + ' นาที ' + (sec % 60) + ' วินาที';
  return (
    // เต็มจอ ทึบ กันเผลอคลิก/ปิดหน้าระหว่างรอ
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(48,38,30,.72)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', zIndex: 90, padding: '20px', animation: 'wbfade .2s ease' }}>
      <div style={{ background: 'var(--surface,#fffdf6)', border: '1px solid #e0d0ac', borderRadius: '20px', padding: '38px 40px 30px', textAlign: 'center', boxShadow: '0 24px 70px rgba(40,30,22,.5)', width: 'min(430px,94vw)' }}>
        <div style={{ width: '54px', height: '54px', border: '4px solid #e6d4b0', borderTopColor: accent, borderRadius: '50%', margin: '0 auto 22px', animation: 'wbspin 1s linear infinite' }} />
        <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '22px', fontWeight: 600, color: '#3a2f28', marginBottom: '6px' }}>AI กำลังจัดคำให้</div>
        <div style={{ color: '#8a7d6d', fontSize: '15px', minHeight: '22px', marginBottom: '18px' }}>{app.procText}</div>

        {/* ตัวนับวินาที + เจ้า/รุ่นที่ใช้ */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: '#6f6252', background: '#f2e9d6', border: '1px solid #e4d8bd', borderRadius: '20px', padding: '5px 13px' }}>⏱ ใช้เวลา {elapsed}</span>
          {S.procProvider ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6f6252', background: '#f2e9d6', border: '1px solid #e4d8bd', borderRadius: '20px', padding: '5px 13px' }}><BrandIcon name={S.procProviderKey} size={15} />{S.procProvider}{S.procModel ? ' · ' + S.procModel : ''}</span> : null}
        </div>

        {/* เตือนห้ามปิด/รีเฟรช */}
        <div style={{ fontSize: '13.5px', color: '#8a5a1e', background: '#fdf2dc', border: '1px solid #f0d9a8', borderRadius: '11px', padding: '11px 14px', lineHeight: 1.6, marginBottom: '20px', textAlign: 'left' }}>
          <b>อย่าปิดหรือรีเฟรชหน้านี้ระหว่างรอ</b><br />
          บางรุ่นใช้เวลาสักครู่ ข้อความถูกเซฟไว้แล้ว หากหลุดจริง ระบบจะกู้กลับมาให้อัตโนมัติ
        </div>

        <button onClick={app.cancelProcess} style={{ padding: '10px 24px', border: '1px solid #d8c7a2', borderRadius: '9px', background: 'transparent', color: '#8a7160', fontSize: '14.5px', cursor: 'pointer' }}>ยกเลิกการจัดคำ</button>
      </div>
    </div>
  );
}
