#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
สร้าง "โต๊ะเกลาคำ" — เครื่องมือให้พี่กันเคาะกิ่ง + สกัดคำ ของคลังเดิมทีละหมวด

ใช้:  python3 scripts/gen_oldwords_picker.py 8

🔑 ยกโต๊ะคัดคำเดิม (docs/newwords-picker.html) มาทั้งชุด — ห้ามคิดกลไกใหม่
   ตัวนั้นผ่านคำติของพี่กันมา 6 รอบจนลงตัว: ลากนิ้วทีละตัวอักษร · ป๊อปกระจกเงา ·
   หมายเหตุ 2 ระดับ · ระบบกันงานหาย 3 ชั้น
   รอบนี้เปลี่ยน 3 อย่าง: ข้อมูลที่ป้อนเข้า · แถบสถานะกิ่ง 4 สี (ของใหม่) · สร้างจากสคริปต์

อ่าน  docs/oldwords/catN/{in.jsonl, out*.jsonl, newbr*.json}
      docs/branches-data.json · docs/newwords-branches.json
เขียน docs/oldwords-picker-catN.html  (+ fragment สำหรับ Artifact ถ้าใส่ argv[2])
"""
import json, sys, os, glob, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)


def build_data(no, folder):
    d = P('docs/oldwords', folder)
    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    nw = json.load(open(P('docs/newwords-branches.json'), encoding='utf-8'))
    cats = {c['id']: c for c in bd['categories']}
    cid = 'c%d' % (no - 1)

    # นับคำต่อกิ่ง แยก 2 คลัง + เก็บคำตัวอย่างของคลังชุดใหม่
    n_old, n_new, ex_new = {}, {}, {}
    for w in bd['words']:
        for p in w['subpaths']:
            n_old[(w['category_id'], p)] = n_old.get((w['category_id'], p), 0) + 1
    for w in nw['words']:
        for a in (w.get('all_paths') or []):
            k = (a['category_id'], a['path'])
            n_new[k] = n_new.get(k, 0) + 1
            ex_new.setdefault(k, [])
            if len(ex_new[k]) < 6:
                ex_new[k].append(w['text'])

    inp = [json.loads(l) for l in open(os.path.join(d, 'in.jsonl'), encoding='utf-8') if l.strip()]
    by_i = {r['i']: r for r in inp}

    # กิ่งใหม่ที่เอเจนต์ขอตั้ง
    newbr = {}
    for f in sorted(glob.glob(os.path.join(d, 'newbr*.json'))):
        for b in json.load(open(f, encoding='utf-8')):
            newbr.setdefault((b['c'], b['p']), {'c': b['c'], 'p': b['p'], 'en': b.get('en', ''),
                                                'def': b.get('def', ''), 'why': b.get('why', ''), 'votes': 0})
            newbr[(b['c'], b['p'])]['votes'] += 1

    # รวมข้อเสนอจากทุกเอเจนต์ · นับ votes = กี่มุมที่เห็นตรงกัน (ตัวช่วยตัดสินใจของพี่กัน)
    prop_add, prop_ex, prop_doubt, prop_mean = {}, {}, {}, {}
    n_agent = 0
    for f in sorted(glob.glob(os.path.join(d, 'out*.jsonl'))):
        n_agent += 1
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            i = r.get('i')
            if i not in by_i:
                continue
            for a in (r.get('add') or []):
                k = (i, a.get('c'), a.get('p'))
                e = prop_add.setdefault(k, {'c': a.get('c'), 'p': a.get('p'), 'why': '', 'votes': 0})
                e['votes'] += 1
                if a.get('why') and not e['why']:
                    e['why'] = a['why']
            for x in (r.get('extract') or []):
                w = (x.get('w') or '').strip()
                if not w:
                    continue
                k = (i, w)
                e = prop_ex.setdefault(k, {'w': w, 'paths': [], 'meaning': None, 'votes': 0})
                e['votes'] += 1
                if x.get('meaning') and not e['meaning']:
                    e['meaning'] = x['meaning']
                for p in (x.get('paths') or []):
                    kp = '%s|%s' % (p.get('c'), p.get('p'))
                    if kp not in e['paths']:
                        e['paths'].append(kp)
            for p in (r.get('doubt') or []):
                prop_doubt[(i, p)] = prop_doubt.get((i, p), 0) + 1
            if r.get('meaning') and i not in prop_mean:
                prop_mean[i] = r['meaning']

    def bstate(c, p):
        """สถานะกิ่ง 4 แบบ — หัวใจของคำถามพี่กันว่า 'คำที่เพิ่มขึ้นมาจะมีกิ่งใหม่ไหม'"""
        k = (c, p)
        if k in newbr and k not in {(b['category_id'], b['path']) for b in bd['branches']}:
            return 'new', 0, []
        o, nn = n_old.get(k, 0), n_new.get(k, 0)
        if o:
            return 'old', o, []
        if nn:
            return 'newbank', nn, ex_new.get(k, [])
        return 'empty', 0, []

    def pack(c, p, why=''):
        st, n, ex = bstate(c, p)
        nb = newbr.get((c, p))
        return {'k': '%s|%s' % (c, p), 'c': c, 'no': int(c[1:]) + 1,
                'cat': cats[c]['name_th'] if c in cats else c, 'p': p,
                'st': st, 'n': n, 'ex': ex, 'why': why,
                'en': (nb or {}).get('en', ''), 'def': (nb or {}).get('def', '')}

    words = []
    for r in inp:
        i = r['i']
        adds = sorted([v for (ii, _, _), v in prop_add.items() if ii == i],
                      key=lambda x: -x['votes'])
        exs = sorted([v for (ii, _), v in prop_ex.items() if ii == i], key=lambda x: -x['votes'])
        words.append({
            'wid': r['wid'], 'i': i, 't': r['text'], 'len': r['len'],
            'now': [pack(cid, p) for p in r['now']],
            'meaning': r.get('meaning') or prop_mean.get(i),
            'also': r.get('also_cat'), 'in_new': r.get('in_new_bank'),
            'inside': r.get('already_inside') or [],
            'add': [dict(pack(a['c'], a['p'], a.get('why', '')), votes=a['votes']) for a in adds],
            'ex': [{'w': e['w'], 'votes': e['votes'], 'meaning': e['meaning'],
                    'paths': [pack(*k.split('|', 1)) for k in e['paths']]} for e in exs],
            'doubt': [p for (ii, p), _ in prop_doubt.items() if ii == i],
        })

    # กิ่งทั้งหมดไว้ให้ค้นเองในเครื่องมือ
    all_br = []
    for b in bd['branches']:
        st, n, ex = bstate(b['category_id'], b['path'])
        all_br.append({'k': '%s|%s' % (b['category_id'], b['path']), 'c': b['category_id'],
                       'no': int(b['category_id'][1:]) + 1, 'cat': cats[b['category_id']]['name_th'],
                       'p': b['path'], 'en': b.get('en', ''), 'def': b.get('definition', ''),
                       'st': st, 'n': n})

    return {'cat': cid, 'cat_no': no, 'cat_name': cats[cid]['name_th'],
            'n_agent': n_agent, 'words': words, 'branches': all_br,
            'newbr': list(newbr.values()),
            'stat': {'br_total': len(bd['branches']),
                     'br_old': sum(1 for b in all_br if b['st'] == 'old'),
                     'br_newbank': sum(1 for b in all_br if b['st'] == 'newbank'),
                     'br_empty': sum(1 for b in all_br if b['st'] == 'empty')}}


CSS = r'''
:root{--paper:#f4f0e6;--paper2:#eae3d2;--card:#fbf7ee;--card2:#f2ecdd;
 --ink:#2f2a22;--ink-soft:#5b5347;--muted:#8d8471;
 --mark:#6b4a2c;--mark-deep:#4e351d;--mark-soft:#e2d3bd;
 --own:#4a6d4f;--own-deep:#365239;--own-soft:#d5e3d4;
 --brick:#9c3b2b;--gold:#a9782a;--sky:#3d6b86;--sky-soft:#d6e6ee;
 --line:#dbd2bd;--line-soft:#e8e0cd;
 --shadow:0 1px 2px rgba(70,54,32,.06),0 3px 12px rgba(70,54,32,.07)}
@media (prefers-color-scheme:dark){:root{--paper:#1b1814;--paper2:#15120f;--card:#252019;--card2:#2e281f;
 --ink:#eee6d7;--ink-soft:#b8ae9c;--muted:#8b8271;--mark:#c9a06a;--mark-deep:#e0bd8b;--mark-soft:#3d3123;
 --own:#8fb48f;--own-deep:#a8c9a6;--own-soft:#2b3a2c;--brick:#dd8a72;--gold:#d3a860;
 --sky:#8ab4cd;--sky-soft:#25353d;--line:#3a332a;--line-soft:#2e2820;
 --shadow:0 1px 2px rgba(0,0,0,.3),0 3px 14px rgba(0,0,0,.35)}}
:root[data-theme=light]{--paper:#f4f0e6;--paper2:#eae3d2;--card:#fbf7ee;--card2:#f2ecdd;
 --ink:#2f2a22;--ink-soft:#5b5347;--muted:#8d8471;--mark:#6b4a2c;--mark-deep:#4e351d;--mark-soft:#e2d3bd;
 --own:#4a6d4f;--own-deep:#365239;--own-soft:#d5e3d4;--brick:#9c3b2b;--gold:#a9782a;
 --sky:#3d6b86;--sky-soft:#d6e6ee;--line:#dbd2bd;--line-soft:#e8e0cd;
 --shadow:0 1px 2px rgba(70,54,32,.06),0 3px 12px rgba(70,54,32,.07)}
:root[data-theme=dark]{--paper:#1b1814;--paper2:#15120f;--card:#252019;--card2:#2e281f;
 --ink:#eee6d7;--ink-soft:#b8ae9c;--muted:#8b8271;--mark:#c9a06a;--mark-deep:#e0bd8b;--mark-soft:#3d3123;
 --own:#8fb48f;--own-deep:#a8c9a6;--own-soft:#2b3a2c;--brick:#dd8a72;--gold:#d3a860;
 --sky:#8ab4cd;--sky-soft:#25353d;--line:#3a332a;--line-soft:#2e2820;
 --shadow:0 1px 2px rgba(0,0,0,.3),0 3px 14px rgba(0,0,0,.35)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-size:16px;line-height:1.68;
 font-family:"Sarabun","Noto Sans Thai","TH Sarabun New",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:18px 14px 130px}
h1{font-family:Georgia,"Noto Serif Thai",serif;font-size:23px;margin:0;line-height:1.3}
.hero{padding:18px 18px;border-radius:14px;background:linear-gradient(150deg,var(--card),var(--card2));
 border:1px solid var(--line);box-shadow:var(--shadow)}
.sub{color:var(--ink-soft);font-size:14px;margin-top:6px}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.stat{background:var(--paper2);border:1px solid var(--line-soft);border-radius:9px;padding:5px 10px;font-size:13px}
.stat b{color:var(--brick);font-size:15px}
/* แถบเครื่องมือ */
.tools{position:sticky;top:0;z-index:20;background:var(--paper);padding:10px 0 8px;margin-top:14px;
 border-bottom:1px solid var(--line-soft)}
.trow{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
input[type=search],select{font:inherit;font-size:14px;padding:7px 10px;border:1px solid var(--line);
 border-radius:9px;background:var(--card);color:var(--ink);min-width:0}
input[type=search]{flex:1}
.seg{font:inherit;font-size:13px;padding:5px 11px;border:1px solid var(--line);border-radius:20px;
 background:var(--card);color:var(--ink-soft);cursor:pointer}
.seg[aria-pressed=true]{background:var(--mark);border-color:var(--mark);color:#fff}
.savest{font-size:12px;color:var(--own-deep);margin-left:auto;white-space:nowrap}
.savest.bad{color:var(--brick);font-weight:700}
.warnbar{margin-top:8px;padding:9px 11px;border-radius:9px;background:#fdecea;border:1px solid var(--brick);
 color:var(--brick);font-size:13px;font-weight:600}
/* การ์ด 1 คำ */
.row{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 14px 12px;
 margin-top:13px;box-shadow:var(--shadow)}
.row.done{border-color:var(--own);box-shadow:0 0 0 1px var(--own) inset}
.rhead{display:flex;gap:9px;align-items:flex-start}
.num{font-size:12px;color:var(--muted);background:var(--paper2);border-radius:7px;padding:2px 7px;flex:none;margin-top:6px}
.src{font-size:clamp(22px,6vw,27px);line-height:1.95;font-weight:600;color:var(--ink);
 word-break:break-word;touch-action:none;-webkit-user-select:none;user-select:none;flex:1}
.tok{border-radius:3px}
.tok.on{background:var(--mark-soft);box-shadow:0 0 0 1px var(--mark) inset}
.meta{font-size:12.5px;color:var(--muted);margin:3px 0 0 0}
.flag{display:inline-block;font-size:11.5px;padding:1px 7px;border-radius:20px;margin:2px 4px 0 0;
 background:var(--sky-soft);color:var(--sky);border:1px solid var(--sky)}
.sec{margin-top:13px;padding-top:11px;border-top:1px dashed var(--line)}
.sect{font-size:12.5px;color:var(--muted);font-weight:700;letter-spacing:.02em;margin-bottom:7px}
/* แถวกิ่ง */
.br{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:9px;background:var(--paper2);
 margin-bottom:6px;border:1px solid var(--line-soft)}
.br.y{background:var(--own-soft);border-color:var(--own)}
.br.n{opacity:.5}
.brtx{flex:1;min-width:0}
.brp{font-size:14px;font-weight:600;color:var(--ink);word-break:break-word}
.brc{font-size:11.5px;color:var(--muted)}
.brwhy{font-size:12px;color:var(--ink-soft);font-style:italic;margin-top:2px}
.bset{display:flex;gap:5px;flex:none}
.bset button{font:inherit;font-size:12px;padding:4px 9px;border-radius:7px;border:1px solid var(--line);
 background:var(--card);color:var(--ink-soft);cursor:pointer;white-space:nowrap}
.bset button[aria-pressed=true]{background:var(--own);border-color:var(--own);color:#fff}
.bset button.no[aria-pressed=true]{background:var(--brick);border-color:var(--brick)}
/* ป้ายสถานะกิ่ง 4 แบบ — ตอบคำถาม "จะมีกิ่งใหม่ไหม" */
.st{font-size:11px;padding:1px 7px;border-radius:20px;white-space:nowrap;flex:none;font-weight:600}
.st.old{background:var(--own-soft);color:var(--own-deep);border:1px solid var(--own)}
.st.newbank{background:var(--sky-soft);color:var(--sky);border:1px solid var(--sky)}
.st.empty{background:var(--paper2);color:var(--muted);border:1px solid var(--line)}
.st.new{background:#fdf0d5;color:var(--gold);border:1px solid var(--gold)}
.exlist{font-size:12px;color:var(--sky);margin-top:3px;word-break:break-word}
.votes{font-size:11px;color:var(--gold);font-weight:700;margin-left:5px}
/* คำสกัด */
.wrow{display:flex;gap:6px;align-items:center;margin-bottom:5px;flex-wrap:wrap}
.ochip{display:inline-flex;align-items:center;gap:5px;background:var(--own-soft);color:var(--own-deep);
 border:1px solid var(--own);border-radius:20px;padding:3px 5px 3px 11px;font-size:14px;font-weight:600}
.ochip.warn{background:#fdecea;border-color:var(--brick);color:var(--brick)}
.ochipx{border:none;background:none;color:inherit;cursor:pointer;font-size:13px;padding:0 4px;opacity:.65}
.pchip{display:inline-flex;align-items:center;gap:6px;background:var(--paper2);border:1px solid var(--line);
 border-radius:20px;padding:4px 11px;font-size:14px;cursor:pointer;margin:0 5px 5px 0}
.pchip[aria-pressed=true]{background:var(--mark);border-color:var(--mark);color:#fff}
.wnoteinp,.noteinp,.owninp{font:inherit;font-size:13px;padding:5px 9px;border:1px dashed var(--line);
 border-radius:8px;background:var(--card2);color:var(--ink);flex:1;min-width:110px}
.noteinp{width:100%}
.kbbtn,.addb{font:inherit;font-size:12.5px;padding:4px 10px;border-radius:8px;border:1px dashed var(--line);
 background:var(--card);color:var(--ink-soft);cursor:pointer;margin-right:5px}
.selbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:9px;padding:9px;
 border-radius:10px;background:var(--mark-soft);border:1px solid var(--mark)}
.selbar[hidden]{display:none}
.selword{font-size:17px;font-weight:700;color:var(--mark-deep);flex:1;min-width:100%}
.fine{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.finelbl{font-size:11.5px;color:var(--mark-deep);margin-left:5px}
.finebtn{font:inherit;font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--mark);
 background:var(--card);color:var(--mark-deep);cursor:pointer}
.okbtn,.nobtn{font:inherit;font-size:13px;padding:5px 13px;border-radius:8px;cursor:pointer;border:1px solid var(--mark)}
.okbtn{background:var(--mark);color:#fff;margin-left:auto}
.nobtn{background:var(--card);color:var(--mark-deep)}
.doneb{font:inherit;font-size:13px;padding:6px 14px;border-radius:9px;border:1px solid var(--own);
 background:var(--card);color:var(--own-deep);cursor:pointer;margin-top:10px;width:100%;font-weight:600}
.doneb[aria-pressed=true]{background:var(--own);color:#fff}
/* ป๊อปกระจกเงา */
#mag{position:fixed;z-index:90;transform:translate(-50%,-100%);pointer-events:none;
 background:var(--card);border:1px solid var(--mark);border-radius:11px;padding:9px 13px;
 font-size:19px;line-height:1.85;font-weight:600;max-width:min(92vw,560px);box-shadow:0 8px 26px rgba(50,35,15,.3)}
#mag[hidden]{display:none}
.mon{color:var(--mark-deep);background:var(--mark-soft);border-radius:3px}
.mdim{opacity:.34}
/* ท้าย */
.bar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--card);border-top:1px solid var(--line);
 padding:9px 14px;display:flex;gap:8px;align-items:center;box-shadow:0 -2px 14px rgba(60,45,25,.1)}
.bar button{font:inherit;font-size:14px;padding:8px 15px;border-radius:9px;border:1px solid var(--mark);
 background:var(--mark);color:#fff;cursor:pointer;font-weight:600}
.bar button.ghost{background:var(--card);color:var(--ink-soft);border-color:var(--line)}
.prog{font-size:13px;color:var(--ink-soft);margin-right:auto}
dialog{border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);
 max-width:min(94vw,700px);width:100%;padding:16px}
dialog::backdrop{background:rgba(40,30,15,.5)}
textarea{width:100%;min-height:46vh;font:inherit;font-size:13px;padding:11px;border:1px solid var(--line);
 border-radius:10px;background:var(--paper2);color:var(--ink);resize:vertical}
.toast{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:var(--ink);color:var(--paper);
 padding:9px 17px;border-radius:20px;font-size:14px;z-index:99;opacity:0;transition:opacity .2s}
.toast.on{opacity:1}
.empty{text-align:center;color:var(--muted);padding:34px 0}
.hide{display:none!important}
'''


def esc(s):
    return html.escape(str(s or ''), quote=False)


def build_html(D, standalone):
    body = SHELL.replace('__TITLE__', 'โต๊ะเกลาคำ · หมวด %d %s' % (D['cat_no'], esc(D['cat_name']))) \
                .replace('__CATNO__', str(D['cat_no'])) \
                .replace('__CATNAME__', esc(D['cat_name'])) \
                .replace('__NWORD__', str(len(D['words']))) \
                .replace('__NAGENT__', str(D['n_agent'])) \
                .replace('__BROLD__', str(D['stat']['br_old'])) \
                .replace('__BRNEW__', str(D['stat']['br_newbank'])) \
                .replace('__BREMPTY__', str(D['stat']['br_empty'])) \
                .replace('__BRTOTAL__', str(D['stat']['br_total']))
    js = JS.replace('__DATA__', json.dumps(D, ensure_ascii=False, separators=(',', ':')))
    page = '<style>%s</style>\n%s\n<script>%s</script>' % (CSS, body, js)
    if standalone:
        return ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
                '<title>โต๊ะเกลาคำ · หมวด %d %s</title>\n</head>\n<body>\n%s\n</body>\n</html>\n'
                % (D['cat_no'], esc(D['cat_name']), page))
    return page


SHELL = '''
<div class="wrap">
 <div class="hero">
  <h1>โต๊ะเกลาคำ · หมวด __CATNO__ __CATNAME__</h1>
  <div class="sub">คลังเดิม __NWORD__ คำ · ผลจากผู้ช่วย __NAGENT__ มุม · <b>กิ่งเดิมไม่ถูกลบเด็ดขาด</b> กด “สงสัย” = ตั้งธงไว้ให้ดูทีหลังเท่านั้น</div>
  <div class="stats">
   <div class="stat"><b>__BROLD__</b> กิ่งที่มีคำเดิมแล้ว</div>
   <div class="stat"><b>__BRNEW__</b> กิ่งที่มีแต่คำชุดใหม่</div>
   <div class="stat"><b>__BREMPTY__</b> กิ่งว่างสนิท</div>
   <div class="stat">จาก <b>__BRTOTAL__</b> กิ่งทั้งหมด</div>
  </div>
 </div>
 <div class="tools">
  <div class="trow">
   <input type="search" id="q" placeholder="ค้นหาคำ หรือชื่อกิ่ง">
   <button type="button" id="tog" class="seg">โหมดกลางคืน</button>
   <span class="savest" id="savest"></span>
  </div>
  <div class="trow" id="filters" style="margin-top:7px">
   <button type="button" class="seg" data-f="all" aria-pressed="true">ทั้งหมด</button>
   <button type="button" class="seg" data-f="todo" aria-pressed="false">ยังไม่เคาะ</button>
   <button type="button" class="seg" data-f="done" aria-pressed="false">เคาะแล้ว</button>
   <button type="button" class="seg" data-f="hasadd" aria-pressed="false">มีกิ่งเสนอ</button>
   <button type="button" class="seg" data-f="hasex" aria-pressed="false">มีคำสกัด</button>
   <button type="button" class="seg" data-f="new" aria-pressed="false">มีกิ่งใหม่</button>
   <button type="button" class="seg" data-f="long" aria-pressed="false">คำยาว</button>
  </div>
  <div class="warnbar hide" id="storewarn"></div>
 </div>
 <div id="list"></div>
</div>
<div id="mag" hidden></div>
<div class="bar">
 <span class="prog" id="prog"></span>
 <button type="button" class="ghost" id="b-reset">ล้างทั้งหมด</button>
 <button type="button" id="b-export">ส่งออกผล</button>
</div>
<dialog id="dlg-out">
 <b style="font-size:15px">ผลการเคาะ</b>
 <div id="out-sum" style="font-size:13px;color:var(--ink-soft);margin:5px 0 9px"></div>
 <textarea id="out" readonly></textarea>
 <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
  <button type="button" class="seg" id="b-copy">คัดลอก</button>
  <button type="button" class="seg" id="b-dl">บันทึกเป็นไฟล์</button>
  <button type="button" class="seg" id="b-close" style="margin-left:auto">ปิด</button>
 </div>
</dialog>
<div class="toast" id="toast"></div>
'''

JS = r'''
const D=__DATA__;
const $=s=>document.querySelector(s), listEl=$('#list');
const KEY='wordbank:oldwords:v1:'+D.cat;

/* ---------- ที่เก็บ 3 ชั้น (ยกจากโต๊ะคัดคำเดิมทั้งชุด) ----------
   🔴 บทเรียน 25 ก.ค. 2569: พี่กันทำงานไปหลายร้อยคำ พอรีเฟรชแล้วหายหมด
   ต้นเหตุ: พึ่ง localStorage อย่างเดียวแล้วครอบ try/catch เงียบ ๆ
   ถ้าเบราว์เซอร์ห้ามใช้ มันล้มเหลวแบบไม่มีใครรู้ · แก้ 3 ชั้น:
   1) ทดสอบจริงว่าเขียนแล้วอ่านกลับได้ไหม 2) มีที่เก็บสำรอง 3) โชว์สถานะให้เห็นด้วยตา */
const STORE=(()=>{
  const probe=o=>{try{const k=KEY+':probe';o.setItem(k,'1');const ok=o.getItem(k)==='1';o.removeItem(k);return ok;}catch(e){return false;}};
  try{if(typeof localStorage!=='undefined'&&probe(localStorage))
    return{tier:'local',durable:true,get:()=>localStorage.getItem(KEY),set:v=>localStorage.setItem(KEY,v)};}catch(e){}
  try{if(typeof sessionStorage!=='undefined'&&probe(sessionStorage))
    return{tier:'session',durable:false,get:()=>sessionStorage.getItem(KEY),set:v=>sessionStorage.setItem(KEY,v)};}catch(e){}
  return{tier:'winname',durable:false,
    get:()=>{try{const m=/^__wbold__(\{[\s\S]*\})$/.exec(window.name||'');return m?m[1]:null;}catch(e){return null;}},
    set:v=>{window.name='__wbold__'+v;}};
})();

let state={ver:1,cat:D.cat,keep:{},doubt:{},add:{},pick:{},own:{},wpath:{},sel:{},draft:{},note:{},wnote:{},done:{}};
try{const r=STORE.get(); if(r){const o=JSON.parse(r); if(o&&o.cat===D.cat) state=Object.assign(state,o);}}catch(e){}
['keep','doubt','add','pick','own','wpath','sel','draft','note','wnote','done'].forEach(k=>{if(!state[k])state[k]={};});
state.cat=D.cat;

let saveOK=null,savedAt='';
const save=()=>{
  try{const v=JSON.stringify(state);STORE.set(v);let back=null;try{back=STORE.get();}catch(e){}
    saveOK=(back===v);}catch(e){saveOK=false;}
  const d=new Date();
  savedAt=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
  paintSave();
};
let saveT=0;const saveSoon=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{saveT=0;save();},140);};
function paintSave(){
  const e=$('#savest');if(!e)return;
  const n=Object.keys(state.done).length;
  if(saveOK===false){e.className='savest bad';e.textContent='⚠ บันทึกถาวรไม่ได้ · กดส่งออกเก็บไว้บ่อย ๆ';}
  else{e.className='savest';e.textContent=(savedAt?'💾 '+savedAt+' · ':'')+'เคาะแล้ว '+n+'/'+D.words.length;}
  const p=$('#prog');if(p)p.textContent='เคาะแล้ว '+n+' / '+D.words.length+' คำ';
}
if(!STORE.durable){const w=$('#storewarn');w.classList.remove('hide');
  w.textContent='⚠ เบราว์เซอร์นี้เก็บข้อมูลถาวรไม่ได้ — ปิดแท็บแล้วงานจะหาย กดปุ่มส่งออกเก็บไว้บ่อย ๆ';}

/* ---------- ลากนิ้วเลือกคำ (ยกจากโต๊ะคัดคำเดิม · หน่วยเลือก = ตัวอักษร) ----------
   🔤 ตัวซอยคำของเบราว์เซอร์ซอยพลาดได้จริง (ปล่อยก๊าก → ก๊า|ก)
   ถ้าล็อกให้เลือกได้แค่ตามขอบคำ = เลือกคำที่ต้องการไม่ได้ ต้องไปพิมพ์เอง
   ตอนนี้: ลากยังหนึบเข้าขอบคำ แต่ปรับหัว-ท้ายทีละตัวอักษรได้ */
const SEG=(()=>{try{return new Intl.Segmenter('th',{granularity:'word'});}catch(e){return null;}})();
const GSEG=(()=>{try{return new Intl.Segmenter('th',{granularity:'grapheme'});}catch(e){return null;}})();
const TOK={};
function tokensOf(r){
  if(TOK[r.wid])return TOK[r.wid];
  let g;
  try{g=GSEG?[...GSEG.segment(r.t)].map(x=>x.segment):Array.from(r.t);}catch(e){g=Array.from(r.t);}
  const startAt=new Array(g.length).fill(0),endAt=new Array(g.length).fill(g.length-1);
  let bounds=[0];
  try{
    if(SEG){
      /* แผนที่ "ตำแหน่งอักขระดิบ → ลำดับตัวอักษร" ต้องไล่ทีละตัว
         เพราะขอบคำอาจตกกลางกลุ่มสระ/วรรณยุกต์ ใช้ indexOf ตรง ๆ จะได้ -1 */
      const u2g=new Array(r.t.length).fill(0);let ci=0;
      g.forEach((ch,gi)=>{for(let k=0;k<ch.length;k++)u2g[ci+k]=gi;ci+=ch.length;});
      [...SEG.segment(r.t)].forEach(s=>{const gi=u2g[s.index];if(gi>0)bounds.push(gi);});
    }
  }catch(e){}
  bounds.push(g.length);bounds=[...new Set(bounds)].sort((a,b)=>a-b);
  for(let k=0;k<bounds.length-1;k++)for(let i=bounds[k];i<bounds[k+1];i++){startAt[i]=bounds[k];endAt[i]=bounds[k+1]-1;}
  return TOK[r.wid]={g,startAt,endAt};
}
const graphsOf=r=>tokensOf(r).g;
const selText=(r,s)=>{if(!s)return'';const g=graphsOf(r);return g.slice(Math.min(s[0],s[1]),Math.max(s[0],s[1])+1).join('').trim();};
let drag=null;
function paintSel(r,el){
  const s=state.sel[r.wid],lo=s?Math.min(s[0],s[1]):-1,hi=s?Math.max(s[0],s[1]):-2;
  el.querySelectorAll('.tok').forEach(t=>t.classList.toggle('on',+t.dataset.i>=lo&&+t.dataset.i<=hi));
  const bar=el.querySelector('.selbar'),txt=selText(r,s);
  if(txt){bar.hidden=false;bar.querySelector('.selword').textContent=txt;}else bar.hidden=true;
}
function setSel(r,a,b,el){state.sel[r.wid]=[a,b];saveSoon();paintSel(r,el);}
function clearSel(r,el){delete state.sel[r.wid];saveSoon();if(el)paintSel(r,el);}
/* ป๊อปกระจกเงา — ตอนลาก นิ้วบังตัวหนังสือ ป๊อปนี้โชว์วลีเต็มซ้ำให้ดู
   ส่วนที่ลากแล้ว = สว่าง · ที่ยังไม่ถึง = จาง
   🚫 ป๊อปไม่ตามนิ้ว — ล็อกตำแหน่งตั้งแต่จังหวะแรก (เจ้าของสั่ง) */
function showMag(r,el){
  const m=$('#mag'),s=state.sel[r.wid];
  if(!s){m.hidden=true;return;}
  const lo=Math.min(s[0],s[1]),hi=Math.max(s[0],s[1]);
  m.textContent='';
  graphsOf(r).forEach((t,i)=>{const sp=document.createElement('span');sp.className=(i>=lo&&i<=hi)?'mon':'mdim';sp.textContent=t;m.append(sp);});
  m.hidden=false;
  if(drag&&drag.w===r.wid&&drag.mag){m.style.left=drag.mag.left+'px';m.style.top=drag.mag.top+'px';return;}
  const src=el.querySelector('.src');if(!src)return;
  const b=src.getBoundingClientRect(),pad=8,w=m.offsetWidth,h=m.offsetHeight;
  const left=Math.min(Math.max(b.left+b.width/2,w/2+pad),innerWidth-w/2-pad);
  let top=b.top-12; if(top-h<pad)top=h+pad;
  m.style.left=left+'px';m.style.top=top+'px';
  if(drag&&drag.w===r.wid)drag.mag={left,top};
}
addEventListener('pointerup',()=>{drag=null;$('#mag').hidden=true;});
addEventListener('pointercancel',()=>{drag=null;$('#mag').hidden=true;});

/* ---------- 🛟 กันข้อความหาย ---------- */
const wkey=(w,x)=>w+'␟'+x;
function setNote(w,v){if((v||'').trim())state.note[w]=v;else delete state.note[w];saveSoon();}
function setWnote(w,x,v){const k=wkey(w,x);if((v||'').trim())state.wnote[k]=v;else delete state.wnote[k];saveSoon();}
function setDraft(w,v){v=(v||'').replace(/\s+$/,'');if(v)state.draft[w]=v;else delete state.draft[w];saveSoon();}
function addOwn(r,words,el){
  const arr=state.own[r.wid]||(state.own[r.wid]=[]);let added=0;
  words.forEach(x=>{x=String(x).trim();if(!x||arr.includes(x))return;arr.push(x);added++;});
  if(!arr.length)delete state.own[r.wid];
  if(added){save();if(el)redrawOwn(r,el);}
  return added;
}
function commitAll(){
  let n=0;
  listEl.querySelectorAll('.row').forEach(el=>{
    const inp=el.querySelector('.owninp');if(!inp||!inp.value.trim())return;
    const r=BYW[el.dataset.w];if(!r)return;
    n+=addOwn(r,inp.value.split(/[,\n]/),el);inp.value='';setDraft(r.wid,'');
  });
  if(n)save();
  return n;
}
function commitPending(){
  let n=0;
  Object.keys(state.sel).forEach(w=>{
    const r=BYW[w];if(!r){delete state.sel[w];return;}
    const t=selText(r,state.sel[w]);if(!t){delete state.sel[w];return;}
    const el=listEl.querySelector('.row[data-w="'+w+'"]');
    n+=addOwn(r,[t],el);delete state.sel[w];if(el)paintSel(r,el);
  });
  if(n)save();
  return n;
}
const flush=()=>{const n=commitAll();if(n||saveT){clearTimeout(saveT);saveT=0;save();}};
addEventListener('pagehide',flush);addEventListener('beforeunload',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});

/* ---------- วาดการ์ด ---------- */
const BYW={};D.words.forEach(r=>BYW[r.wid]=r);
const ST={old:'มีคำเดิม',newbank:'มีแต่คำชุดใหม่',empty:'กิ่งว่าง',new:'กิ่งใหม่'};
function stChip(b){
  const s=document.createElement('span');s.className='st '+b.st;
  s.textContent=ST[b.st]+(b.n?' '+b.n:'');
  s.title={old:'กิ่งนี้มีคำจากคลังเดิมอยู่แล้ว',
           newbank:'กิ่งนี้ยังไม่มีคำเดิมเลย แต่มีคำจากคลังชุดใหม่อยู่',
           empty:'กิ่งนี้ตั้งเผื่อไว้ ยังไม่มีคำเลยทั้งสองคลัง',
           new:'กิ่งนี้ยังไม่มีในโครง 766 กิ่ง ต้องสร้างใหม่'}[b.st];
  return s;
}
function branchRow(r,b,kind,el){
  const row=document.createElement('div');row.className='br';
  const tx=document.createElement('div');tx.className='brtx';
  const p=document.createElement('div');p.className='brp';p.textContent=b.p;
  const c=document.createElement('div');c.className='brc';
  c.textContent='หมวด '+b.no+' '+b.cat+(b.en?' · '+b.en:'');
  tx.append(p,c);
  if(b.why){const w=document.createElement('div');w.className='brwhy';w.textContent='เหตุผล: '+b.why;tx.append(w);}
  if(b.def&&b.st==='new'){const w=document.createElement('div');w.className='brwhy';w.textContent='นิยาม: '+b.def;tx.append(w);}
  if(b.ex&&b.ex.length){const e=document.createElement('div');e.className='exlist';
    e.textContent='คำในกิ่งนี้: '+b.ex.join(' · ');tx.append(e);}
  row.append(tx,stChip(b));
  if(b.votes>1){const v=document.createElement('span');v.className='votes';v.textContent=b.votes+' มุมเห็นตรงกัน';tx.append(v);}

  const set=document.createElement('div');set.className='bset';
  if(kind==='now'){
    const d=document.createElement('button');d.type='button';d.className='no';d.textContent='สงสัย';
    d.title='ตั้งธงไว้ให้ดูทีหลัง ระบบจะไม่ลบกิ่งนี้ออกจากคำ';
    const on=()=>(state.doubt[r.wid]||[]).includes(b.p);
    d.setAttribute('aria-pressed',String(on()));
    d.onclick=()=>{const a=state.doubt[r.wid]||(state.doubt[r.wid]=[]);
      const i=a.indexOf(b.p); if(i<0)a.push(b.p);else a.splice(i,1);
      if(!a.length)delete state.doubt[r.wid];
      d.setAttribute('aria-pressed',String(on()));row.classList.toggle('n',on());save();};
    row.classList.toggle('n',on());
    set.append(d);
  }else{
    const y=document.createElement('button');y.type='button';y.textContent='เอา';
    const on=()=>(state.add[r.wid]||[]).includes(b.k);
    y.setAttribute('aria-pressed',String(on()));
    row.classList.toggle('y',on());
    y.onclick=()=>{const a=state.add[r.wid]||(state.add[r.wid]=[]);
      const i=a.indexOf(b.k); if(i<0)a.push(b.k);else a.splice(i,1);
      if(!a.length)delete state.add[r.wid];
      y.setAttribute('aria-pressed',String(on()));row.classList.toggle('y',on());save();};
    set.append(y);
  }
  row.append(set);
  return row;
}
function ownChip(r,w,el){
  const row=document.createElement('div');row.className='wrow';
  const s=document.createElement('span');
  s.className='ochip'+(r.t.includes(w)?'':' warn');
  s.title=r.t.includes(w)?'คำที่เก็บไว้':'⚠ คำนี้ไม่ตรงกับข้อความในวลีตั้งต้น';
  const l=document.createElement('span');l.textContent=w;
  const x=document.createElement('button');x.type='button';x.className='ochipx';x.textContent='✕';
  x.setAttribute('aria-label','เอาคำ '+w+' ออก');
  x.onclick=()=>{const a=state.own[r.wid]||[];const i=a.indexOf(w);if(i>=0)a.splice(i,1);
    if(!a.length)delete state.own[r.wid];delete state.wnote[wkey(r.wid,w)];save();redrawOwn(r,el);};
  s.append(l,x);
  const nt=document.createElement('input');nt.type='text';nt.className='wnoteinp';
  nt.placeholder='หมายเหตุของคำนี้';nt.value=state.wnote[wkey(r.wid,w)]||'';
  nt.oninput=()=>setWnote(r.wid,w,nt.value);
  row.append(s,nt);
  return row;
}
function redrawOwn(r,el){
  const box=el.querySelector('.ownbox');if(!box)return;
  box.textContent='';
  (state.own[r.wid]||[]).forEach(w=>box.append(ownChip(r,w,el)));
}
function rowEl(r){
  const el=document.createElement('div');el.className='row'+(state.done[r.wid]?' done':'');
  el.dataset.w=r.wid;
  const head=document.createElement('div');head.className='rhead';
  const num=document.createElement('span');num.className='num';num.textContent=r.i+1;
  const src=document.createElement('div');src.className='src';
  graphsOf(r).forEach((s,i)=>{const sp=document.createElement('span');
    sp.className='tok'+(/^\s+$/.test(s)?' ws':'');sp.dataset.i=i;sp.textContent=s;src.append(sp);});
  src.addEventListener('pointerdown',ev=>{
    const t=ev.target.closest('.tok');if(!t)return;
    ev.preventDefault();                       // กันจอเลื่อนตามนิ้วระหว่างลาก
    const i=+t.dataset.i,T=tokensOf(r);drag={w:r.wid,a:i};
    setSel(r,T.startAt[i],T.endAt[i],el);showMag(r,el);
  });
  src.addEventListener('pointermove',ev=>{
    if(!drag||drag.w!==r.wid)return;ev.preventDefault();
    const u=document.elementFromPoint(ev.clientX,ev.clientY);
    const t=u&&u.closest?u.closest('.tok'):null;
    if(t&&src.contains(t)){const T=tokensOf(r),j=+t.dataset.i;
      setSel(r,T.startAt[Math.min(drag.a,j)],T.endAt[Math.max(drag.a,j)],el);}
    showMag(r,el);
  });
  head.append(num,src);el.append(head);

  const meta=document.createElement('div');meta.className='meta';
  meta.textContent=r.len+' ตัวอักษร'+(r.meaning?' · '+r.meaning:'');
  el.append(meta);
  const flags=document.createElement('div');
  if(r.also)r.also.forEach(c=>{const f=document.createElement('span');f.className='flag';
    f.textContent='คำนี้อยู่ '+c+' ด้วย · เคาะที่นี่ไม่กระทบอีกฝั่ง';flags.append(f);});
  if(r.in_new){const f=document.createElement('span');f.className='flag';
    f.textContent='มีในคลังชุดใหม่แล้ว';flags.append(f);}
  if(r.inside&&r.inside.length){const f=document.createElement('span');f.className='flag';
    f.textContent='คำที่ซ้อนอยู่แล้ว: '+r.inside.join(' · ');flags.append(f);}
  if(flags.children.length)el.append(flags);

  // แถบยืนยันคำที่ลากไว้
  const bar=document.createElement('div');bar.className='selbar';bar.hidden=true;
  const pv=document.createElement('span');pv.className='selword';
  const fine=document.createElement('div');fine.className='fine';
  function nudge(which,step){
    const s=state.sel[r.wid];if(!s)return;
    const g=graphsOf(r);let lo=Math.min(s[0],s[1]),hi=Math.max(s[0],s[1]);
    if(which==='head')lo=Math.max(0,Math.min(hi,lo+step));else hi=Math.min(g.length-1,Math.max(lo,hi+step));
    setSel(r,lo,hi,el);
  }
  [['head',-1,'◀','ขยายหัวคำไปทางซ้าย 1 ตัวอักษร'],['head',1,'▶','หดหัวคำเข้ามา 1 ตัวอักษร'],
   ['tail',-1,'◀','หดท้ายคำเข้ามา 1 ตัวอักษร'],['tail',1,'▶','ขยายท้ายคำไปทางขวา 1 ตัวอักษร']]
  .forEach(([w,st,gl,lab],k)=>{
    if(k===0){const t=document.createElement('span');t.className='finelbl';t.textContent='หัวคำ';fine.append(t);}
    if(k===2){const t=document.createElement('span');t.className='finelbl';t.textContent='ท้ายคำ';fine.append(t);}
    const b=document.createElement('button');b.type='button';b.className='finebtn';b.textContent=gl;
    b.title=lab;b.setAttribute('aria-label',lab);b.onclick=()=>nudge(w,st);fine.append(b);
  });
  const no2=document.createElement('button');no2.type='button';no2.className='nobtn';no2.textContent='ยกเลิก';
  no2.onclick=()=>clearSel(r,el);
  const ok=document.createElement('button');ok.type='button';ok.className='okbtn';ok.textContent='✓ ตกลง';
  ok.onclick=()=>{const t=selText(r,state.sel[r.wid]);if(!t)return;addOwn(r,[t],el);clearSel(r,el);};
  bar.append(pv,fine,no2,ok);el.append(bar);

  // ชั้น 2 · กิ่งบ้านเดิม
  const s1=document.createElement('div');s1.className='sec';
  const t1=document.createElement('div');t1.className='sect';t1.textContent='🌿 กิ่งที่ติดอยู่ตอนนี้ — ยังใช่ไหม';
  s1.append(t1);
  r.now.forEach(b=>s1.append(branchRow(r,b,'now',el)));
  el.append(s1);

  // ชั้น 3 · กิ่งที่เสนอเพิ่ม
  const s2=document.createElement('div');s2.className='sec';
  const t2=document.createElement('div');t2.className='sect';
  t2.textContent='＋ กิ่งที่เสนอเพิ่ม ('+r.add.length+')';
  s2.append(t2);
  if(!r.add.length){const e=document.createElement('div');e.className='brc';e.textContent='ไม่มีข้อเสนอ';s2.append(e);}
  r.add.forEach(b=>s2.append(branchRow(r,b,'add',el)));
  el.append(s2);

  // ชั้น 4 · คำที่สกัด
  const s3=document.createElement('div');s3.className='sec';
  const t3=document.createElement('div');t3.className='sect';t3.textContent='✂ คำที่สกัดออกมา';
  s3.append(t3);
  if(r.ex.length){
    const pk=document.createElement('div');
    r.ex.forEach(e=>{
      const c=document.createElement('button');c.type='button';c.className='pchip';
      const on=()=>(state.pick[r.wid]||[]).includes(e.w);
      c.textContent=e.w+(e.votes>1?' ('+e.votes+' มุม)':'');
      c.title=(e.meaning?e.meaning+' · ':'')+'กิ่ง: '+e.paths.map(p=>'หมวด '+p.no+' '+p.p).join(' | ');
      c.setAttribute('aria-pressed',String(on()));
      c.onclick=()=>{const a=state.pick[r.wid]||(state.pick[r.wid]=[]);
        const i=a.indexOf(e.w);if(i<0)a.push(e.w);else a.splice(i,1);
        if(!a.length)delete state.pick[r.wid];
        c.setAttribute('aria-pressed',String(on()));save();};
      pk.append(c);
    });
    s3.append(pk);
  }else{const e=document.createElement('div');e.className='brc';e.textContent='ระบบไม่ได้เสนอคำสกัด — ลากนิ้วคลุมคำในวลีข้างบนเพื่อเก็บเอง';s3.append(e);}
  const ownbox=document.createElement('div');ownbox.className='ownbox';s3.append(ownbox);
  const addrow=document.createElement('div');addrow.className='wrow';
  const inp=document.createElement('input');inp.type='text';inp.className='owninp';
  inp.placeholder='พิมพ์คำเอง (คั่นด้วย ,)';inp.value=state.draft[r.wid]||'';
  inp.oninput=()=>{setDraft(r.wid,inp.value);
    if(inp.value.includes(',')){const p=inp.value.split(',');const tail=p.pop();
      addOwn(r,p,el);inp.value=tail.replace(/^\s+/,'');setDraft(r.wid,inp.value);}};
  inp.onblur=()=>{if(inp.value.trim()){addOwn(r,[inp.value],el);inp.value='';setDraft(r.wid,'');}};
  const ab=document.createElement('button');ab.type='button';ab.className='addb';ab.textContent='＋ เพิ่ม';
  ab.onclick=()=>{if(inp.value.trim()){addOwn(r,inp.value.split(','),el);inp.value='';setDraft(r.wid,'');}};
  addrow.append(inp,ab);s3.append(addrow);
  el.append(s3);

  // หมายเหตุของทั้งคำ
  const nt=document.createElement('input');nt.type='text';nt.className='noteinp';
  nt.style.marginTop='9px';nt.placeholder='📝 หมายเหตุของคำนี้';nt.value=state.note[r.wid]||'';
  nt.oninput=()=>setNote(r.wid,nt.value);
  el.append(nt);

  const db=document.createElement('button');db.type='button';db.className='doneb';
  db.textContent=state.done[r.wid]?'✓ เคาะแล้ว':'ทำเสร็จคำนี้';
  db.setAttribute('aria-pressed',String(!!state.done[r.wid]));
  db.onclick=()=>{if(state.done[r.wid])delete state.done[r.wid];else state.done[r.wid]=1;
    db.textContent=state.done[r.wid]?'✓ เคาะแล้ว':'ทำเสร็จคำนี้';
    db.setAttribute('aria-pressed',String(!!state.done[r.wid]));
    el.classList.toggle('done',!!state.done[r.wid]);save();};
  el.append(db);

  redrawOwn(r,el);
  paintSel(r,el);
  return el;
}

/* ---------- ตัวกรอง + วาด ---------- */
let filter='all',query='';
function visible(){
  return D.words.filter(r=>{
    if(filter==='todo'&&state.done[r.wid])return false;
    if(filter==='done'&&!state.done[r.wid])return false;
    if(filter==='hasadd'&&!r.add.length)return false;
    if(filter==='hasex'&&!r.ex.length)return false;
    if(filter==='new'&&!r.add.some(b=>b.st==='new'))return false;
    if(filter==='long'&&r.len<=20)return false;
    if(query){
      const hay=[r.t,r.meaning||'',...r.now.map(b=>b.p),...r.add.map(b=>b.p),
                 ...r.ex.map(e=>e.w),state.note[r.wid]||''].join(' ');
      if(!hay.includes(query))return false;
    }
    return true;
  });
}
function render(){
  commitAll();                 // 🛟 กวาดเก็บทุกช่องก่อนล้าง DOM — ห้ามลบบรรทัดนี้เด็ดขาด
  const vis=visible();
  listEl.textContent='';
  if(!vis.length){const e=document.createElement('p');e.className='empty';e.textContent='ไม่พบคำที่ตรงกับเงื่อนไข';listEl.append(e);return;}
  const f=document.createDocumentFragment();
  vis.forEach(r=>f.append(rowEl(r)));
  listEl.append(f);
  paintSave();
}
$('#filters').addEventListener('click',ev=>{
  const b=ev.target.closest('.seg');if(!b)return;
  filter=b.dataset.f;
  [...$('#filters').children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  render();
});
let qt;$('#q').addEventListener('input',ev=>{clearTimeout(qt);qt=setTimeout(()=>{query=ev.target.value.trim();render();},220);});
$('#tog').onclick=()=>{
  const r=document.documentElement;
  const cur=r.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  r.dataset.theme=cur==='dark'?'light':'dark';
  $('#tog').textContent=r.dataset.theme==='dark'?'โหมดกลางวัน':'โหมดกลางคืน';
};

/* ---------- ส่งออก ----------
   🔴 บั๊กของโต๊ะคัดคำเดิม: result() คำนวณช่อง "หมวดที่เสนอ" ไว้ แต่ textOut() เขียนรายชื่อคอลัมน์ด้วยมือ
   แล้วลืมใส่ → ข้อมูลหมวดหายทั้งชุด · รอบนี้แก้เชิงโครงสร้าง = ส่งออกทั้งก้อนข้อมูลด้วย
   ไม่พึ่งการไล่พิมพ์ทีละคอลัมน์ */
function pack(){
  const rows=[];
  D.words.forEach(r=>{
    const add=(state.add[r.wid]||[]),doubt=(state.doubt[r.wid]||[]);
    const pick=(state.pick[r.wid]||[]),own=(state.own[r.wid]||[]);
    if(!add.length&&!doubt.length&&!pick.length&&!own.length&&!state.note[r.wid]&&!state.done[r.wid])return;
    rows.push({wid:r.wid,text:r.t,cat:D.cat,done:state.done[r.wid]?1:0,
      doubt:doubt,add:add,
      ex:[...pick.map(w=>({w,src:'ai',note:state.wnote[wkey(r.wid,w)]||''})),
          ...own.map(w=>({w,src:'own',note:state.wnote[wkey(r.wid,w)]||''}))],
      note:state.note[r.wid]||''});
  });
  return rows;
}
function sum6(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;}return h.toString(16).slice(0,6);}
/* 🔴 ตัวคั่นคอลัมน์ในผลส่งออกใช้ " / " ตามที่เจ้าของเคยสั่ง (แท็บถูกบีบตอนวางในแชท)
   แต่ "เส้นทางกิ่ง" ใช้ " / " เป็นตัวคั่นชั้นอยู่แล้ว → อ่านแล้วแยกไม่ออกว่าอันไหนคอลัมน์
   จึงแปลงตัวคั่นชั้นของกิ่งเป็น " › " เฉพาะตอนแสดงผลให้คนอ่าน (ก้อนข้อมูลยังเก็บของจริงไว้ครบ) */
const showPath=p=>String(p).split(' / ').join(' › ');
const showKey=k=>{const i=k.indexOf('|');return 'หมวด '+(+k.slice(1,i)+1)+' '+showPath(k.slice(i+1));};
function textOut(){
  const rows=pack();
  const nb=D.newbr.filter(b=>D.words.some(r=>(state.add[r.wid]||[]).includes(b.c+'|'+b.p)));
  const L=['# ผลเคาะคลังเดิม · หมวด '+D.cat_no+' '+D.cat_name,
           '# คำในหมวดนี้ '+D.words.length+' · เคาะแล้ว '+Object.keys(state.done).length,''];
  L.push('## ก. กิ่งของคำเดิม');
  let k=0;
  rows.forEach(r=>{
    if(!r.add.length&&!r.doubt.length)return;
    k++;
    const p=[];
    if(r.add.length)p.push('ติดเพิ่ม '+r.add.map(showKey).join(' + '));
    if(r.doubt.length)p.push('สงสัย '+r.doubt.map(showPath).join(' + '));
    L.push(k+'. '+r.text+' / '+p.join(' / ')+(r.note?' / หมายเหตุ: '+r.note:''));
  });
  if(!k)L.push('(ไม่มี)');
  L.push('','## ข. คำที่สกัดใหม่');
  k=0;
  rows.forEach(r=>r.ex.forEach(e=>{k++;
    L.push(k+'. '+e.w+' / จากวลี '+r.text+' / '+(e.src==='ai'?'ระบบเสนอ':'ลากเอง')+(e.note?' / หมายเหตุ: '+e.note:''));}));
  if(!k)L.push('(ไม่มี)');
  if(nb.length){
    L.push('','## ค. กิ่งใหม่ที่รับ');
    nb.forEach((b,i)=>L.push((i+1)+'. หมวด '+(+b.c.slice(1)+1)+' / '+showPath(b.p)+' / '+(b.en||'')+' / '+(b.def||'')));
  }
  const js=JSON.stringify({v:1,cat:D.cat,n:D.words.length,done:Object.keys(state.done).length,rows,nb});
  L.push('','<<<WBJSON');L.push(js);L.push('sum:'+sum6(js));L.push('WBJSON>>>');
  return L.join('\n');
}
$('#b-export').onclick=()=>{
  commitAll();commitPending();   // 🛟 ทั้งคำที่พิมพ์ค้าง และคำที่ลากค้าง ต้องติดไปด้วย
  const rows=pack();
  if(!rows.length){toast('ยังไม่ได้เคาะอะไรเลย');return;}
  const nex=rows.reduce((a,r)=>a+r.ex.length,0);
  $('#out-sum').textContent='คำที่แตะแล้ว '+rows.length+' · คำสกัด '+nex+' · เคาะเสร็จ '+Object.keys(state.done).length+'/'+D.words.length;
  $('#out').value=textOut();
  $('#dlg-out').showModal();
};
$('#b-close').onclick=()=>$('#dlg-out').close();
$('#b-copy').onclick=async()=>{
  const t=$('#out');
  try{await navigator.clipboard.writeText(t.value);toast('คัดลอกแล้ว');}
  catch(e){t.removeAttribute('readonly');t.select();t.setAttribute('readonly','');toast('กดค้างเพื่อคัดลอก');}
};
/* บันทึกเป็นไฟล์ 4 ทางสำรอง — บนมือถือบางเครื่องทางแรกใช้ไม่ได้ */
$('#b-dl').onclick=async()=>{
  const txt=$('#out').value,name='oldwords-picked-cat'+D.cat_no+'.txt';
  try{const f=new File([txt],name,{type:'text/plain'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return;}}catch(e){}
  try{const b=new Blob([txt],{type:'text/plain'}),u=URL.createObjectURL(b);
    const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();
    setTimeout(()=>{a.remove();URL.revokeObjectURL(u);},900);toast('บันทึกไฟล์แล้ว');return;}catch(e){}
  try{const w=open('','_blank');if(w){w.document.write('<pre>'+txt.replace(/</g,'&lt;')+'</pre>');w.document.close();return;}}catch(e){}
  const t=$('#out');t.removeAttribute('readonly');t.select();t.setAttribute('readonly','');toast('กดค้างเพื่อคัดลอก');
};
$('#b-reset').onclick=()=>{
  if(!confirm('ล้างผลการเคาะทั้งหมดของหมวดนี้'))return;
  state={ver:1,cat:D.cat,keep:{},doubt:{},add:{},pick:{},own:{},wpath:{},sel:{},draft:{},note:{},wnote:{},done:{}};
  save();render();toast('ล้างแล้ว');
};
let tt;function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');
  clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),1900);}

render();save();
'''


def main():
    if len(sys.argv) < 2:
        raise SystemExit('ใช้: python3 scripts/gen_oldwords_picker.py <เลขหมวด> [ไฟล์ fragment]')
    no = int(sys.argv[1])
    folder = 'cat%d' % no
    D = build_data(no, folder)
    out = P('docs', 'oldwords-picker-cat%d.html' % no)
    open(out, 'w', encoding='utf-8').write(build_html(D, True))
    if len(sys.argv) > 2:
        open(sys.argv[2], 'w', encoding='utf-8').write(build_html(D, False))
    n_add = sum(len(w['add']) for w in D['words'])
    n_ex = sum(len(w['ex']) for w in D['words'])
    print('เขียน %s' % out)
    print('  คำ %d · ข้อเสนอกิ่ง %d · คำสกัด %d · กิ่งใหม่ %d · จากผู้ช่วย %d มุม'
          % (len(D['words']), n_add, n_ex, len(D['newbr']), D['n_agent']))
    print('  กิ่ง: มีคำเดิม %d · มีแต่คำชุดใหม่ %d · ว่างสนิท %d (จาก %d)'
          % (D['stat']['br_old'], D['stat']['br_newbank'], D['stat']['br_empty'], D['stat']['br_total']))


if __name__ == '__main__':
    main()
