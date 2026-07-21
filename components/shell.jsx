'use client';
import React from 'react';
import { rgba, mix } from '@/lib/colors';
import { renderAdd, renderProcessing } from '@/components/pages/add';
import { renderReview } from '@/components/pages/review';
import { renderLibrary } from '@/components/pages/library';
import { renderAiLog } from '@/components/pages/aiLog';
import { renderAiTest } from '@/components/pages/aiTest';
import { renderPromptLog } from '@/components/pages/promptLog';
import { renderAbout } from '@/components/pages/about';
import { renderEditModal, renderCatModal, renderSettings } from '@/components/pages/modals';

export function renderShell(app) {
  const S = app.state;
  const monoMode = app.eff('categoryColor', 'soft') === 'mono';
  const accent = app.eff('accent', '#9c3b2b');
  const primary = app.eff('primary', '#6f4e37');
  const paper = app.eff('paper', '#f2e8d2');
  const navStyle = 'tabs'; // ใช้แบนเนอร์บนเสมอ (เอา sidebar ออกแล้ว)
  const spell = app.eff('spellDisplay', 'highlight');
  const effLayout = app.eff('reviewLayout', 'cards');
  const rootStyle = {
    minHeight: '100vh', color: '#3a2f28',
    background: 'linear-gradient(' + mix(paper, '#ffffff', 0.32) + ',' + paper + ')',
    fontFamily: "var(--font-sarabun),system-ui,sans-serif", fontSize: '16px', lineHeight: '1.55',
    '--accent': accent, '--primary': primary, '--paper': paper,
    '--surface': mix(paper, '#ffffff', 0.7), '--panel': mix(paper, '#ffffff', 0.48),
  };
  const catMap = {}; S.categories.forEach((c) => { catMap[c.id] = c; });
  const getCat = (id) => catMap[id] || { id, n: 'อื่น ๆ', c: '#8a8175', k: '•' };

  if (S.loading) {
    return (
      <div style={rootStyle}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '46px', height: '46px', border: '4px solid #e6d4b0', borderTopColor: accent, borderRadius: '50%', margin: '0 auto 16px', animation: 'wbspin 1s linear infinite' }} />
            <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '26px', color: accent }}>คลังคำ</div>
            <div style={{ color: '#8a7d6d', marginTop: '4px' }}>กำลังเปิดคลัง…</div>
          </div>
        </div>
      </div>
    );
  }
  if (S.loadError) {
    return (
      <div style={rootStyle}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '20px' }}>
          <div style={{ textAlign: 'center', maxWidth: '440px' }}>
            <div style={{ fontFamily: "var(--font-trirong),serif", fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>เปิดคลังไม่สำเร็จ</div>
            <p style={{ color: '#8a7d6d' }}>ยังเชื่อมต่อฐานข้อมูลไม่ได้ ตรวจค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ .env.local แล้วเปิดใหม่อีกครั้ง</p>
            <p style={{ color: '#c1a98f', fontSize: '13px', marginTop: '10px' }}>{S.loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  // ----- nav -----
  const navBtn = (active, side) => {
    const base = side
      ? { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', border: 'none', borderRadius: '9px', fontSize: '15.5px', cursor: 'pointer', textAlign: 'left', fontFamily: "var(--font-sarabun),sans-serif" }
      : { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', border: 'none', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: "var(--font-sarabun),sans-serif", transition: 'all .15s' };
    if (active) return { ...base, background: 'var(--primary,#6f4e37)', color: '#fbf3e2', fontWeight: 600, boxShadow: side ? 'none' : '0 3px 10px rgba(111,78,55,.3)' };
    return { ...base, background: side ? 'transparent' : 'rgba(255,255,255,.35)', color: '#7a6a52' };
  };
  const navItems = [['add', 'เพิ่มคำ', 0], ['review', 'ตรวจทาน', S.review.length], ['library', 'คลังคำ', S.library.length], ['ailog', 'ประวัติ & สถิติ', 0], ['aitest', 'ผลทดสอบ AI', 0], ['prompts', 'ประวัติคำสั่ง', 0], ['about', 'เกี่ยวกับ', 0]].map(([id, label, badgeN]) => ({ id, label, active: S.page === id, badgeN }));
  const badgeStyle = (active) => ({ marginLeft: '2px', fontSize: '12px', fontWeight: 700, minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', display: 'inline-grid', placeItems: 'center', background: active ? 'rgba(255,255,255,.22)' : '#e2d3b0', color: active ? '#fbf3e2' : '#8a7159' });

  const isAdd = S.page === 'add', isReview = S.page === 'review', isLibrary = S.page === 'library', isAiLog = S.page === 'ailog', isAbout = S.page === 'about';
  const isAiTest = S.page === 'aitest', isPrompts = S.page === 'prompts';

  return (
    <div style={rootStyle}>
      <datalist id="wb-novels">{S.novels.map((nv) => <option key={nv} value={nv} />)}</datalist>
      {/* รายชื่อกิ่งหมวดย่อยที่มีอยู่ — ช่วยเติมคำตอนพิมพ์เพิ่มกิ่งเอง */}
      <datalist id="wb-paths">{[...app.knownPaths()].slice(0, 800).map((p) => <option key={p} value={p} />)}</datalist>

      {/* ปุ่มตั้งค่าลอยมุมขวาบน — เฉพาะจอคอมพิวเตอร์ (บนมือถือย้ายเข้าเมนู ☰ กันทับปุ่มเมนู) */}
      {!S.isMobile && (
        <button onClick={app.openSettings} title="ตั้งค่าการแสดงผล" style={{ position: 'fixed', top: '16px', right: '18px', zIndex: 55, padding: '9px 18px', borderRadius: '20px', border: '1px solid #d8c7a2', background: 'var(--surface,#fffdf6)', color: 'var(--primary,#6f4e37)', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,90,50,.16)' }}>ตั้งค่า</button>
      )}

      {/* ===== แบนเนอร์จอคอมพิวเตอร์ (แถบแท็บ 7 หน้า) — เหมือนเดิมทุกอย่าง ===== */}
      {navStyle === 'tabs' && !S.isMobile && (
        <header ref={app._bannerRef} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '13px clamp(20px,3vw,40px)', background: 'linear-gradient(180deg, rgba(255,255,255,.4), var(--panel,#f7f0e0))', borderBottom: '1px solid ' + rgba(primary, 0.16), boxShadow: '0 3px 16px rgba(120,90,50,.07)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 20 }}>
          <div onClick={app.onNav('add')} title="กลับหน้าแรก" style={{ display: 'flex', alignItems: 'flex-end', gap: '9px', cursor: 'pointer' }}>
            <span style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: '34px', color: 'var(--accent,#9c3b2b)', lineHeight: 1, marginTop: '8px' }}>คลังคำ</span>
            <span style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '20px', color: '#b09a72', fontWeight: 400 }}>Word&nbsp;Bank</span>
          </div>
          <span style={{ width: '1px', height: '28px', background: rgba(primary, 0.22) }} />
          <nav style={{ display: 'flex', gap: '7px' }}>
            {navItems.map((n) => (
              <button key={n.id} onClick={app.onNav(n.id)} style={navBtn(n.active, false)}>
                <span>{n.label}</span>{n.badgeN > 0 && <span style={badgeStyle(n.active)}>{n.badgeN}</span>}
              </button>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <span className="wb-quote" style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '17px', color: '#b3a488', whiteSpace: 'nowrap', paddingRight: '112px' }}>“เก็บคำงาม ไว้แต่งเรื่องของเราเอง”</span>
        </header>
      )}

      {/* ===== แบนเนอร์มือถือ — โลโก้ + ปุ่ม ☰ (แตะแล้วเมนูเด้งลงมา) ===== */}
      {navStyle === 'tabs' && S.isMobile && (
        <>
          <header ref={app._bannerRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px clamp(14px,4vw,20px)', background: 'linear-gradient(180deg, rgba(255,255,255,.55), var(--panel,#f7f0e0))', borderBottom: '1px solid ' + rgba(primary, 0.16), boxShadow: '0 3px 16px rgba(120,90,50,.07)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 40 }}>
            <div onClick={() => { app.setState({ menuOpen: false }); app.onNav('add')(); }} title="กลับหน้าแรก" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <span style={{ fontFamily: "var(--font-charmonman),cursive", fontWeight: 700, fontSize: '27px', color: 'var(--accent,#9c3b2b)', lineHeight: 1 }}>คลังคำ</span>
              <span style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '16px', color: '#b09a72' }}>Word&nbsp;Bank</span>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => app.setState((s) => ({ menuOpen: !s.menuOpen }))} title="เมนู" aria-label="เมนู" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '11px', border: '1px solid #d8c7a2', background: S.menuOpen ? 'var(--primary,#6f4e37)' : 'var(--surface,#fffdf6)', color: S.menuOpen ? '#fbf3e2' : 'var(--primary,#6f4e37)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>{S.menuOpen ? '✕' : '☰'}</button>
          </header>
          {S.menuOpen && (
            <div onClick={() => app.setState({ menuOpen: false })} style={{ position: 'fixed', inset: 0, top: S.bannerH + 'px', background: 'rgba(58,47,40,.32)', zIndex: 35, animation: 'wbfade .16s ease' }}>
              <nav onClick={app.stop} style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 12px 14px', background: 'var(--panel,#f7f0e0)', borderBottom: '1px solid #e0d0ac', boxShadow: '0 12px 28px rgba(58,47,40,.22)', animation: 'wbdrop .2s ease' }}>
                {navItems.map((n) => (
                  <button key={n.id} onClick={() => { app.setState({ menuOpen: false }); app.onNav(n.id)(); }} style={navBtn(n.active, true)}>
                    <span style={{ flex: 1 }}>{n.label}</span>{n.badgeN > 0 && <span style={badgeStyle(n.active)}>{n.badgeN}</span>}
                  </button>
                ))}
                <div style={{ height: '1px', background: '#e0d0ac', margin: '5px 4px' }} />
                <button onClick={() => { app.setState({ menuOpen: false }); app.openSettings(); }} style={navBtn(false, true)}>
                  <span style={{ flex: 1 }}>⚙ ตั้งค่าการแสดงผล</span>
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      {/* ลบความสูงแบนเนอร์ออกจากพื้นที่เนื้อหา ไม่งั้นหน้าสูงเกินจอ 69px เสมอ = เลื่อนได้ทั้งที่ข้อมูลไม่เต็มจอ */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - ' + S.bannerH + 'px)' }}>
        <main style={{ flex: 1, minWidth: 0, padding: '40px clamp(16px,2.5vw,40px) 72px' }}>
          {isAdd && renderAdd(app)}
          {isReview && renderReview(app, getCat, monoMode, spell, effLayout)}
          {isLibrary && renderLibrary(app, getCat, monoMode, accent)}
          {isAiLog && renderAiLog(app)}
          {isAiTest && renderAiTest(app)}
          {isPrompts && renderPromptLog(app)}
          {isAbout && renderAbout(app)}
        </main>
      </div>

      {/* กรอบล่างสุด (footer) — โผล่ทุกหน้า ทั้งมือถือและจอคอม · ธีมกระดาษวรรณกรรม จัดกลาง */}
      <footer style={{ borderTop: '1px solid #e0d0ac', background: 'var(--panel,#f7f0e0)', padding: '30px clamp(16px,2.5vw,40px)', textAlign: 'center' }}>
        <div style={{ fontFamily: "var(--font-charmonman),cursive", fontSize: '24px', color: 'var(--accent,#9c3b2b)', lineHeight: 1.15 }}>คลังคำ <span style={{ fontFamily: "var(--font-trirong),serif", fontSize: '15px', color: '#a89a86', fontStyle: 'italic' }}>Word Bank</span></div>
        <div style={{ fontSize: '13.5px', color: '#8a7d6d', margin: '8px 0 12px' }}>เก็บคำงาม ไว้แต่งเรื่องของเราเอง</div>
        <div style={{ fontSize: '12px', color: '#b0a184' }}>© ๒๕๖๙ · คลังคำ (Word Bank) · สร้างด้วยความรักในภาษาไทย 🤍</div>
      </footer>

      {S.processing && renderProcessing(app, accent)}
      {S.modal === 'edit' && renderEditModal(app)}
      {S.modal === 'cats' && renderCatModal(app, monoMode)}
      {S.modal === 'settings' && renderSettings(app, monoMode, navStyle, spell, effLayout, accent, primary, paper)}
      {app.renderConfirm()}
      {app.renderScrollButtons()}
      {S.toast && (
        <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#3a2f28', color: '#fbf3e2', padding: '13px 26px', borderRadius: '24px', fontSize: '15px', zIndex: 80, boxShadow: '0 8px 24px rgba(58,47,40,.35)', animation: 'wbtoast .28s ease' }}>{S.toast}</div>
      )}
    </div>
  );
}
