'use client';

export function categoryActions(app) {
  app.openCats = () => app.setState({ modal: 'cats', mergeFrom: '', mergeTo: '' });
  app.closeCats = () => app.setState({ modal: null });
  app.catCount = (id) => { return app.state.library.filter((w) => w.category === id).length + app.state.review.filter((r) => r.category === id).length; }
  app.renameCat = (id) => {
    return (e) => {
      const v = e.target.value;
      app.setState((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, n: v } : c) }));
      clearTimeout(app['_rn' + id]);
      app['_rn' + id] = setTimeout(() => {
        fetch('/api/categories/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_th: v }) }).catch(() => {});
      }, 500);
    };
  }
  app.removeCat = (id) => {
    return async () => {
      if (app.catCount(id) > 0) { app.flash('ย้ายคำออกก่อนถึงจะลบหมวดได้'); return; }
      const prev = app.state.categories;
      app.setState((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
      try {
        const res = await fetch('/api/categories/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      } catch (e) { app.setState({ categories: prev }); app.flash('ลบหมวดไม่สำเร็จ'); }
    };
  }
  app.onMergeFrom = (e) => app.setState({ mergeFrom: e.target.value });
  app.onMergeTo = (e) => app.setState({ mergeTo: e.target.value });
  app.merge = async () => {
    const { mergeFrom, mergeTo } = app.state;
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) { app.flash('เลือกสองหมวดที่ต่างกันก่อน'); return; }
    const prev = { library: app.state.library, categories: app.state.categories, review: app.state.review };
    app.setState((s) => ({
      library: s.library.map((w) => w.category === mergeFrom ? { ...w, category: mergeTo } : w),
      review: s.review.map((r) => r.category === mergeFrom ? { ...r, category: mergeTo } : r),
      categories: s.categories.filter((c) => c.id !== mergeFrom),
      mergeFrom: '', mergeTo: '',
    }), app.persistReview);
    try {
      const res = await fetch('/api/categories/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: mergeFrom, to: mergeTo }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      app.flash('รวมหมวดแล้ว');
    } catch (e) { app.setState(prev); app.flash('รวมหมวดไม่สำเร็จ'); }
  };
  app.onNewCatName = (e) => app.setState({ newCatName: e.target.value });
  app.addCat = async () => {
    const n = app.state.newCatName.trim();
    if (!n) return;
    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_th: n }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      app.setState((s) => ({ categories: [...s.categories, data.category], newCatName: '' }));
      app.flash('เพิ่มหมวดแล้ว');
    } catch (e) { app.flash('เพิ่มหมวดไม่สำเร็จ'); }
  };

  // ---------- library actions ----------
}
