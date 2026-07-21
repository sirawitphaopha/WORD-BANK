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

export function renderAbout(app) {
  const S = app.state;
  const HAND = "var(--font-charmonman),cursive";  // ลายมือ
  const SERIF = "var(--font-trirong),serif";      // ค่าที่ต้องอ่านชัด
  const ink = '#33291f', faint = '#8a7d6d', line = '#e0d0ac';

  const card = { background: 'var(--surface,#fffdf6)', border: '1px solid ' + line, borderRadius: '14px', padding: '24px 26px 26px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(120,90,50,.06)' };
  // หัวข้อบล็อก — เอาวงกลมเลขไทยออก (พี่กัน 2026-07-20b) · ชื่อหัวข้อใช้ "สีแดงน้ำตาล" (สีที่วงกลมเลขเคยเป็น = accent) · num คงพารามิเตอร์ไว้เฉย ๆ ไม่ได้ใช้แล้ว
  const head = (num, title) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
      <span style={{ fontFamily: HAND, fontSize: '25px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.1, paddingTop: '6px' }}>{title}</span>
      <span style={{ flex: 1, height: '1px', borderTop: '1px dashed #ddcba4', marginTop: '4px' }} />
    </div>
  );
  // แถวข้อมูล ค่าซ้าย-ขวา
  const row = (label, value, last) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '9px 0', borderBottom: last ? 'none' : '1px dashed #eadfc6' }}>
      <span style={{ fontSize: '14.5px', color: faint }}>{label}</span>
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: SERIF, fontSize: '16px', fontWeight: 600, color: ink }}>{value}</span>
    </div>
  );
  // ตัวเลขสถิติ ตัวใหญ่ลายมือ
  const stat = (n, label) => (
    <div style={{ flex: '1 1 120px', textAlign: 'center', padding: '14px 10px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '11px' }}>
      <div style={{ fontFamily: HAND, fontSize: '38px', lineHeight: 1, color: 'var(--accent,#9c3b2b)' }}>{n}</div>
      <div style={{ fontSize: '13.5px', color: faint, marginTop: '7px' }}>{label}</div>
    </div>
  );

  const batches = app.batchList();
  // หมวดย่อยเก็บเป็น "เส้นทาง" คั่นด้วย / เช่น "การเคลื่อนที่ / การเดิน"
  // → นับ 2 แบบ: กลุ่มชั้นแรก (ตัวเลขที่คนเข้าใจว่าเป็นหมวดย่อย) และแขนงเต็มทั้งเส้นทาง
  const paths = S.library.map((w) => (w.subpath || '').trim()).filter(Boolean);
  const branchCount = new Set(paths).size;
  const subCount = new Set(paths.map((p) => p.split(' / ')[0].trim())).size;
  // เทคโนโลยีทั้งหมด (รวม Claude Code เข้ามาด้วย พี่กัน 2026-07-20b) — จัด grid 2 คอลัมน์แบบบล็อกชนิด AI
  const allTechs = [
    { k: 'nextjs', n: 'Next.js 15', d: 'โครงเว็บ' },
    { k: 'react', n: 'React 19', d: 'หน้าจอ' },
    { k: 'javascript', n: 'JavaScript', d: 'ภาษาที่ใช้เขียน' },
    { k: 'cloudflare', n: 'Cloudflare', d: 'ที่วางเว็บ' },
    { k: 'supabase', n: 'Supabase', d: 'ฐานข้อมูล' },
    { k: 'claude', n: 'Claude Code', d: 'ผู้ช่วยเขียนโค้ด' },
  ];
  // เซลล์เทคโนโลยี (โครงเดียวกับเซลล์ชนิด AI) — ไอคอน + ชื่อบน + คำไทยล่าง (stack กันคำไทยล้นช่องแคบ = "ย้ำคำไทยที่เกิน")
  const techCell = (t) => (
    <div key={t.k} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '10px' }}>
      <BrandIcon name={t.k} size={19} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: '14px', color: ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.n}</span>
        <span style={{ fontSize: '11.5px', color: '#b3a488', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.d}</span>
      </span>
    </div>
  );

  return (
    <section style={{ maxWidth: '780px', margin: '0 auto', animation: 'wbfade .35s ease' }}>
      {/* หัวหน้า */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontFamily: HAND, fontWeight: 700, fontSize: 'clamp(38px,5vw,52px)', margin: 0, color: 'var(--accent,#9c3b2b)', lineHeight: 1.15 }}>เกี่ยวกับคลังคำ</h1>
        <p style={{ fontFamily: HAND, fontSize: '20px', color: '#b09a72', margin: '6px 0 0' }}>ห้องเก็บถ้อยคำงามของนักเขียน</p>
        <p style={{ fontSize: '14.5px', color: faint, margin: '12px auto 0', maxWidth: '520px', lineHeight: 1.7 }}>
          เว็บส่วนตัวไว้เก็บคำ วลี และประโยคสวยงามที่เจอระหว่างอ่านนิยาย ให้ AI ช่วยแก้คำสะกด สกัดคำเด่นออกจากประโยคยาว แล้วจัดเข้าหมวดหมู่ให้พร้อมหยิบไปใช้เขียนงานของตัวเอง
        </p>
      </div>

      {/* ๑ ผู้พัฒนา */}
      <div style={card}>
        {head('๑', 'ผู้เขียนและผู้พัฒนา')}
        <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
          <div style={{ fontFamily: HAND, fontSize: '34px', color: ink, lineHeight: 1.2 }}>สิรวิชญ์ เผ่าผา</div>
          <div style={{ fontSize: '14px', color: faint, marginTop: '4px' }}>เก็บคำเอง เขียนเอง และทำเว็บนี้ขึ้นมาเอง</div>
          <a href="mailto:siravitphoapha9928@hotmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '15px', padding: '9px 20px', borderRadius: '22px', background: '#f6eed9', border: '1px solid ' + line, color: '#6f5a3e', fontSize: '14.5px', textDecoration: 'none' }}>
            ✉ siravitphoapha9928@hotmail.com
          </a>
        </div>
      </div>

      {/* ๒ ข้อมูลแอป */}
      <div style={card}>
        {head('๒', 'ข้อมูลแอป')}
        {row('เวอร์ชันปัจจุบัน', VERSION)}
        {row('เผยแพร่ครั้งแรก', '๑๗ กรกฎาคม ๒๕๖๙')}
        {row('อัปเดตล่าสุด', '๑๙ กรกฎาคม ๒๕๖๙', true)}
      </div>

      {/* ๓ คลังคำตอนนี้ */}
      <div style={card}>
        {head('๓', 'คลังคำตอนนี้')}
        <div style={{ display: 'flex', gap: '11px', flexWrap: 'wrap' }}>
          {stat(S.library.length, 'คำในคลัง')}
          {stat(S.categories.length, 'หมวดใหญ่')}
          {stat(subCount, 'กลุ่มหมวดย่อย')}
          {/* คลังตั้งต้นยังไม่ได้แยกเรื่อง → ถ้ายังไม่มีเรื่องเลย โชว์จำนวนคำรอตรวจทานแทน จะได้ไม่ขึ้นเลข 0 เปล่า ๆ */}
          {S.novels.length > 0 ? stat(S.novels.length, 'เรื่องที่เก็บมา') : stat(S.review.length, 'คำรอตรวจทาน')}
        </div>
        {S.review.length > 0 && (
          <div style={{ marginTop: '13px', padding: '11px 15px', background: '#fbeecb', border: '1px solid #ecd39a', borderRadius: '10px', fontSize: '14px', color: '#8a5a1e' }}>
            ยังมีคำรอตรวจทานอยู่ <b>{S.review.length}</b> คำ ใน <b>{batches.length}</b> ช่อ
          </div>
        )}
        <p style={{ fontSize: '14.5px', color: faint, lineHeight: 1.75, margin: '16px 0 0' }}>
          คลังตั้งต้น ๖๗๖ คำ มาจากสมุดคำศัพท์จริงที่สะสมไว้ระหว่างอ่านนิยาย นำเข้ามาทั้งเล่มพร้อมหมวดย่อยเดิม แล้วค่อย ๆ เก็บเพิ่มทีละรอบผ่านหน้าเพิ่มคำ
          <br />หมวดย่อย {subCount} กลุ่ม แตกลึกลงไปอีกรวมเป็น {branchCount} แขนง ทุกคำในคลังมีหมวดย่อยกำกับครบ
        </p>
      </div>

      {/* ศัพท์น่ารู้: ช่อ กับ กิ่ง (ย้ายมาจากหน้าผลทดสอบ) */}
      <div style={card}>
        {head('', 'ศัพท์น่ารู้ — “ช่อ” กับ “กิ่ง”')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px' }}>
          <div style={{ padding: '14px 16px', background: '#fbeecb', border: '1px solid #ecd39a', borderRadius: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#8a5a1e', marginBottom: '5px' }}>🌸 ช่อ (batch)</div>
            <div style={{ fontSize: '13.5px', color: faint, lineHeight: 1.75 }}>คำ <b>1 กลุ่ม</b> ที่ได้จากการกดจัดคำ 1 ครั้ง (AI ช่วยจัด 1 รอบ) เหมือน<b>ช่อดอกไม้ 1 ช่อ</b> · แต่ละช่อจำเจ้า/รุ่น AI + วันที่ + นิยาย ของตัวเอง · หน้าตรวจทานเปิดทีละช่อผ่านแท็บ</div>
          </div>
          <div style={{ padding: '14px 16px', background: '#eef3e4', border: '1px solid #cbdcb8', borderRadius: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#4d6136', marginBottom: '5px' }}>🌿 กิ่ง (หมวดย่อย)</div>
            <div style={{ fontSize: '13.5px', color: faint, lineHeight: 1.75 }}><b>ป้ายบอกที่อยู่ของคำ</b> ในต้นไม้หมวด ลึกได้หลายชั้น คั่นด้วย <code style={{ background: '#dfe8d2', padding: '0 4px', borderRadius: '4px' }}>/</code> · <b>1 คำติดได้หลายกิ่ง</b> · กิ่งใหม่ = กิ่งที่ AI คิดขึ้นเอง (ยิ่งน้อยยิ่งดี)</div>
          </div>
        </div>
        <div style={{ marginTop: '14px', padding: '15px 17px', background: 'var(--surface,#fffdf6)', border: '1px dashed ' + line, borderRadius: '12px' }}>
          <div style={{ fontSize: '12.5px', color: faint, marginBottom: '11px' }}>ตัวอย่างจริง — คำว่า “อลหม่าน” ถูกจัดยังไง</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: '19px', fontWeight: 700, color: ink }}>อลหม่าน</span>
            <span style={{ color: faint, fontSize: '18px' }}>→</span>
            <span style={{ fontSize: '12px', color: faint }}>อยู่ใน</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: '#eef0f5', border: '1px solid #d6dae4', fontSize: '13px', color: '#3a4a63' }}>
              <BrandIcon name="gemini" size={15} /> ช่อ ๑๒ · Gemini 3.1 Pro
            </span>
            <span style={{ color: faint, fontSize: '18px' }}>→</span>
            <span style={{ fontSize: '12px', color: faint }}>แตกเป็น 2 กิ่ง</span>
            <span style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {['บรรยากาศ / บรรยากาศทั่วไป', 'อารมณ์ / ปั่นป่วน'].map((g) => (
                <span key={g} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px', borderRadius: '20px', background: '#eef3e4', border: '1px solid #cbdcb8', fontSize: '12.5px', color: '#4d6136' }}>🌿 {g}</span>
              ))}
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: faint, marginTop: '11px' }}>คำเดียว มองได้ 2 มุม (ทั้งบรรยากาศฉาก + อารมณ์คน) เลยติดได้ 2 กิ่ง</div>
        </div>
      </div>

      {/* ๔ AI ที่รองรับ */}
      <div style={card}>
        {head('๔', 'ตัวช่วยจัดคำ')}
        <p style={{ fontSize: '14.5px', color: faint, lineHeight: 1.75, margin: '0 0 16px' }}>
          สลับผู้ช่วย AI ได้ตามใจในหน้าเพิ่มคำ กุญแจของแต่ละเจ้าเก็บอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่หลุดมาถึงเบราว์เซอร์
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '9px' }}>
          {PROVIDER_ORDER.map((k) => {
            const p = PROVIDERS[k];
            if (!p) return null;
            const ready = !!S.aiReady[k];
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '10px' }}>
                <BrandIcon name={k} size={19} />
                <span title={p.label} style={{ flex: 1, fontSize: '14.5px', color: ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                <span style={{ flex: 'none', fontSize: '11.5px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', whiteSpace: 'nowrap', background: ready ? '#e9efe1' : '#f0e8d4', border: '1px solid ' + (ready ? '#cbdcb8' : '#e4d8bd'), color: ready ? '#5a7040' : '#a2937b' }}>
                  {ready ? 'พร้อมใช้' : 'ยังไม่ต่อกุญแจ'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ๕ ข้อมูลเก็บที่ไหน (แยกจากบล็อกเทคโนโลยี — คนละเรื่องกัน) */}
      <div style={card}>
        {head('๕', 'ข้อมูลเก็บที่ไหน')}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '13px 15px', background: '#faf4e6', border: '1px solid #ecdfc2', borderRadius: '11px' }}>
          <BrandIcon name="supabase" size={26} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SERIF, fontSize: '17px', fontWeight: 600, color: ink }}>Supabase</div>
            <div style={{ fontSize: '13.5px', color: faint, lineHeight: 1.65, marginTop: '2px' }}>
              ฐานข้อมูล PostgreSQL บนคลาวด์ · เปิดเครื่องไหนก็เห็นคลังเดียวกัน · ทุกตารางล็อกไว้ให้เข้าถึงได้เฉพาะฝั่งเซิร์ฟเวอร์
            </div>
          </div>
        </div>
      </div>

      {/* สร้างด้วยเทคโนโลยี — grid 2 คอลัมน์แบบบล็อกชนิด AI · รวม Claude Code เข้าไปด้วย (เอาเส้นแบ่งเดิมออก) */}
      <div style={card}>
        {head('๖', 'สร้างด้วยเทคโนโลยี')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '9px' }}>
          {allTechs.map(techCell)}
        </div>
      </div>

      <p style={{ fontFamily: HAND, fontSize: '21px', color: '#b09a72', textAlign: 'center', margin: '26px 0 0' }}>
        “เก็บคำงาม ไว้แต่งเรื่องของเราเอง”
      </p>
    </section>
  );
}
