'use client';
import { thNum, aiModel, pathsOf } from '@/components/helpers';

export function reviewActions(app) {
  app.setBatch = (id) => app.setState((s) => ({ activeBatch: id, review: s.review.map((r) => r.selected ? { ...r, selected: false } : r) }));
  // ช่อที่ "หายไปทั้งช่อ" หลังลบ (มีก่อนลบ แต่ไม่เหลือหลังลบ) → ต้องปักป้าย tombstone กันฟื้นกลับข้ามเครื่อง
  app._goneBatches = (prev, kept) => {
    const k = new Set((kept || []).map((r) => r.batch || 'b_legacy'));
    return [...new Set((prev || []).map((r) => r.batch || 'b_legacy'))].filter((b) => !k.has(b));
  };
  // ลบทั้งช่อ (ผ่านป๊อปยืนยัน) — ขอบเขตชัด ไม่ใช่ปุ่มทิ้งทั้งหมดแบบเดิม
  app.deleteBatch = (b) => {
    app.askConfirm({
      title: 'ลบทั้งช่อที่ ' + thNum(b.no), danger: true, okLabel: 'ลบทั้งช่อ',
      msg: 'นำคำในช่อนี้ทั้ง ' + b.count + ' คำ ออกจากรายการตรวจทาน ช่ออื่นไม่กระทบ',
      onOk: () => {
        // ลบเฉพาะแถวของช่อนี้บนคลาวด์ (remove by ids) แทน replace ทั้งก้อน — กันช่อเด้งกลับตอนลบรัว ๆ
        // ใช้ ids (ไม่ใช่ removeBatch by batch) เพราะช่อเก่า batch อาจเป็น null ใน DB แต่ UI โชว์ b_legacy → by ids ครอบคลุมหมด
        const ids = app.state.review.filter((r) => (r.batch || 'b_legacy') === b.id).map((r) => r.id);
        app.setState((s) => {
          const rest = s.review.filter((r) => (r.batch || 'b_legacy') !== b.id);
          return { review: rest, activeBatch: app.activeBatchId(rest, '') };
        }, () => { app.pushReviewOp({ action: 'remove', ids, deadBatches: [b.id] }); app.flash('ลบช่อที่ ' + thNum(b.no) + ' แล้ว'); });
      },
    });
  };

  // คัดลอกข้อความลงคลิปบอร์ด — มีทางสำรองเผื่อเบราว์เซอร์ไม่อนุญาต clipboard API
  app.updateReview = (id, patch, now) => {
    app.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, ...patch } : r) }), now ? app.persistReviewNow : app.persistReview);
  }
  app.toggleSel = (id) => { app.setState((s) => ({ review: s.review.map((r) => r.id === id ? { ...r, selected: !r.selected } : r) })); }
  // เลือกทั้งหมด = เฉพาะคำในช่อที่เปิดอยู่
  app.selectAll = (e) => { const v = e.target.checked; const bid = app.activeBatchId(); app.setState((s) => ({ review: s.review.map((r) => (r.batch || 'b_legacy') === bid ? { ...r, selected: v } : r) })); };
  app.removeReview = (id) => { app.askConfirm({ title: 'ลบคำนี้', msg: 'นำคำนี้ออกจากรายการตรวจทาน', okLabel: 'ลบ', danger: true, onOk: () => app._removeReview(id) }); }
  app._removeReview = (id) => { const prev = app.state.review; const rest = prev.filter((r) => r.id !== id); app.setState({ review: rest }, () => app.pushReviewOp({ action: 'remove', ids: [id], deadBatches: app._goneBatches(prev, rest) })); }
  app.bulkMove = (e) => { const cid = e.target.value; if (!cid) return; app.setState((s) => ({ review: s.review.map((r) => r.selected ? { ...r, category: cid, proposedNew: false, selected: false } : r) }), app.persistReviewNow); e.target.value = ''; app.flash('ย้ายหมวดแล้ว'); };
  app.bulkDelete = () => { const n = app.state.review.filter((r) => r.selected).length; if (!n) return; app.askConfirm({ title: 'ลบที่เลือก', msg: 'นำคำที่เลือก ' + n + ' คำ ออกจากรายการตรวจทาน', okLabel: 'ลบ', danger: true, onOk: () => { const prev = app.state.review; const ids = prev.filter((r) => r.selected).map((r) => r.id); const rest = prev.filter((r) => !r.selected); app.setState({ review: rest }, () => app.pushReviewOp({ action: 'remove', ids, deadBatches: app._goneBatches(prev, rest) })); } }); };
  app.clearSel = () => app.setState((s) => ({ review: s.review.map((r) => ({ ...r, selected: false })) }));
  app.discard = () => { if (!app.state.review.length) return; app.askConfirm({ title: 'ทิ้งทั้งหมด', msg: 'ล้างรายการตรวจทานทั้งหมด คำที่ยังไม่บันทึกจะหายไป', okLabel: 'ทิ้งทั้งหมด', danger: true, onOk: () => { const batches = [...new Set(app.state.review.map((r) => r.batch || 'b_legacy'))]; app.setState({ review: [], page: 'add' }, () => app.pushReviewOp({ action: 'clear', batches })); app.flash('ล้างรายการตรวจทานแล้ว'); } }); };
  // ลบคำที่มีในคลังอยู่แล้ว (ซ้ำ) ออกจากหน้าตรวจทานรวดเดียว
  app.removeDuplicates = (ids) => {
    const lib = new Set(app.state.library.map((w) => (w.text || '').trim()));
    const idSet = ids && ids.length ? new Set(ids) : null; // ถ้าส่ง ids มา = ลบเฉพาะที่แสดงในมุมมองนั้น
    const dups = app.state.review.filter((r) => lib.has((r.text || '').trim()) && (!idSet || idSet.has(r.id)));
    if (!dups.length) { app.flash('ไม่มีคำซ้ำกับคลัง'); return; }
    const dupIds = new Set(dups.map((r) => r.id));
    app.askConfirm({ title: 'ลบคำซ้ำ', msg: 'ลบคำที่มีในคลังแล้ว ' + dups.length + ' คำ ออกจากรายการตรวจทาน', okLabel: 'ลบคำซ้ำ', danger: true, onOk: () => { const prev = app.state.review; const rest = prev.filter((r) => !dupIds.has(r.id)); app.setState({ review: rest }, () => app.pushReviewOp({ action: 'remove', ids: [...dupIds], deadBatches: app._goneBatches(prev, rest) })); app.flash('ลบคำซ้ำออก ' + dups.length + ' คำ'); } });
  };
  // ส่งออกผลตรวจทานเป็นไฟล์ .txt (ไว้เทียบผลระหว่าง AI แต่ละเจ้า/รุ่น)
  app.exportReview = () => {
    const S = app.state;
    const items = app.batchItems(); // ส่งออกเฉพาะช่อที่เปิดอยู่ (ไว้เทียบผลข้ามช่อ = ข้าม AI)
    if (!items.length) { app.flash('ยังไม่มีคำให้ส่งออก'); return; }
    const bMeta = app.batchList().find((x) => x.id === app.activeBatchId()) || { no: 1, ai: '', novel: '' };
    const catName = {}; S.categories.forEach((c) => { catName[c.id] = c.n; });
    const t = new Date(Date.now() + 7 * 3600 * 1000);
    const p2 = (n) => String(n).padStart(2, '0');
    const date = t.getUTCDate() + '/' + (t.getUTCMonth() + 1) + '/' + (t.getUTCFullYear() + 543) + ' ' + p2(t.getUTCHours()) + ':' + p2(t.getUTCMinutes());
    const extracted = items.filter((r) => (r.source || '').trim()).length;
    const lines = [
      'คลังคำ — ผลตรวจทาน (ไว้เทียบ AI)',
      'ช่อที่ ' + thNum(bMeta.no),
      'เรื่อง: ' + (bMeta.novel || S.reviewNovel || '-'),
      'AI: ' + (aiModel(bMeta.ai) || S.procProvider || '-'),
      'วันที่: ' + date,
      'จำนวน: ' + items.length + ' คำ (สกัดจากประโยค ' + extracted + ')',
      '────────────────────────────',
    ];
    items.forEach((r, i) => {
      let l = (i + 1) + '. ' + r.text + '  [' + (r.kind || '-') + ']  หมวด: ' + (catName[r.category] || r.category || '-');
      const rp = pathsOf(r); if (rp.length) l += '  หมวดย่อย: ' + rp.join(' | ');
      if ((r.original || '').trim() && r.original !== r.text) l += '  (ต้นฉบับ: ' + r.original + ')';
      if ((r.meaning || '').trim()) l += '  ความหมาย: ' + r.meaning;
      if ((r.source || '').trim()) l += '  ✂ จาก: ' + r.source;
      lines.push(l);
    });
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tag = (aiModel(bMeta.ai) || S.procModel || S.procProvider || 'ai').replace(/[^\wก-๙.-]/g, '');
      a.href = url; a.download = 'ตรวจทาน_ช่อ' + bMeta.no + '_' + (bMeta.novel || S.reviewNovel || 'คลังคำ') + '_' + tag + '.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      app.flash('ส่งออกไฟล์แล้ว');
    } catch (e) { app.flash('ส่งออกไม่สำเร็จ'); }
  };

  // ---------- save (Review → Library) ----------
  // บันทึกเฉพาะ "ช่อที่เปิดอยู่" — ช่ออื่นยังค้างรอตรวจทานต่อ
  app.save = () => {
    const items = app.batchItems();
    if (!items.length) return;
    const b = app.batchList().find((x) => x.id === app.activeBatchId()) || { no: 1 };
    app.askConfirm({ title: 'บันทึกช่อที่ ' + thNum(b.no) + ' เข้าคลัง', msg: 'บันทึกคำในช่อนี้ ' + items.length + ' คำ เข้าคลัง (คำที่ซ้ำกับคลังจะถูกข้ามให้อัตโนมัติ)\nช่ออื่นยังอยู่ครบ', okLabel: 'บันทึก', danger: false, onOk: app._save });
  };
  app._save = async () => {
    const { categories } = app.state;
    const bid = app.activeBatchId();
    const review = app.batchItems(null, bid);
    if (!review.length) return;
    const reviewNovel = (review[0] && review[0].novel) || app.state.reviewNovel;
    const newCategories = categories.filter((c) => c.proposed).map((c) => ({ id: c.id, name_th: c.n, color: c.c, glyph: c.k }));
    const allWords = review.map((r) => ({ text: r.text.trim(), original_text: r.original || null, meaning: (r.meaning || '').trim(), category_id: r.category, kind: r.kind || null, subpath: pathsOf(r)[0] || null, subpaths: pathsOf(r) })).filter((w) => w.text);
    // ข้ามคำที่มีในคลังอยู่แล้ว (ข้อความตรงกันเป๊ะ) — ไม่เขียนทับ ไม่สร้างซ้ำ
    const libSet = new Set(app.state.library.map((w) => (w.text || '').trim()));
    const words = allWords.filter((w) => !libSet.has(w.text));
    const skipped = allWords.length - words.length;
    if (!words.length) { app.flash(skipped ? 'ทุกคำมีในคลังอยู่แล้ว ไม่มีคำใหม่ให้บันทึก' : 'ยังไม่มีคำให้บันทึก'); return; }
    const novel = reviewNovel;
    try {
      const res = await fetch('/api/words', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novel, newCategories, words }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const saved = data.words || [];
      const nv = (novel && novel !== 'ไม่ระบุเรื่อง' && !app.state.novels.includes(novel)) ? [novel, ...app.state.novels] : app.state.novels;
      // เอาเฉพาะคำในช่อนี้ออก — ช่ออื่นยังค้างอยู่ ถ้ายังเหลือช่อ อยู่หน้าตรวจทานต่อ
      const rest = app.state.review.filter((r) => (r.batch || 'b_legacy') !== bid);
      app.setState({
        library: [...saved, ...app.state.library],
        categories: app.state.categories.map((c) => c.proposed ? { ...c, proposed: false } : c),
        novels: nv, review: rest,
        activeBatch: app.activeBatchId(rest, ''),
        page: rest.length ? 'review' : 'library',
        // ลบเฉพาะแถวของช่อที่บันทึกออกจากคลาวด์ (remove by ids) แทน replace ทั้งก้อน — กันช่ออื่นเด้ง/ชนกัน
      }, () => { app.toTop(); app.pushReviewOp({ action: 'remove', ids: review.map((r) => r.id), deadBatches: [bid] }); });
      app.flash('บันทึกเข้าคลังแล้ว ' + saved.length + ' คำ' + (skipped ? ' (ข้ามที่มีอยู่แล้ว ' + skipped + ' คำ)' : '') + (rest.length ? ' · ยังเหลืออีก ' + rest.length + ' คำในช่ออื่น' : ''));
      // เติมจำนวนคำที่บันทึกจริง + ข้ามเพราะซ้ำ ลง log ของรอบ AI นี้
      if (app.state.lastAiLogId) {
        fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'saved', id: app.state.lastAiLogId, saved_count: saved.length, skipped_count: skipped }) }).catch(() => {});
        app.setState({ lastAiLogId: null });
      }
    } catch (e) {
      app.flash('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  // ---------- category management ----------
}
