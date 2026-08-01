#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างฉบับ HTML อ่านง่ายของไฟล์ที่พี่กันต้องเคาะ (พี่กันขอ 26 ก.ค. 2569)

ออก 2 ไฟล์
  docs/newwords-review-narration.html  บทบรรยาย 80 บท · กดเลือก เอา/ไม่เอา ได้
  docs/newwords-review-branches.html   กิ่งใหม่ 81 กิ่งในหมวดเดิม · กดเลือก เอา/ไม่เอา ได้

🛟 บทเรียนที่ต้องยกมาด้วยทุกครั้ง (25 ก.ค. พี่กันเสียงานเป็นพันคำ):
   - เก็บลงที่เก็บทันทีทุกครั้งที่กด ห้ามรอปุ่มยืนยัน
   - ที่เก็บมี 3 ชั้น (localStorage → sessionStorage → window.name) และต้องอ่านกลับมาเทียบว่าเข้าจริง
   - โชว์สถานะให้เห็นด้วยตา ถ้าเก็บถาวรไม่ได้ต้องขึ้นเตือนตัวแดง

วิธีใช้: python3 scripts/gen_newwords_review_html.py
"""
import json, os, collections, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)

D = json.load(open(p('docs/newwords-branches.json'), encoding='utf-8'))
CATS = {c['id']: c for c in D['categories']}
W = D['words']
NARR = 'c14'
e = html.escape


def cname(cid):
    c = CATS[cid]
    return f"หมวด {c['no']} {c['name_th']}"


CSS = """
/* ธีมกระดาษวรรณกรรมของโปรเจกต์ (ครีม + หมึกน้ำตาล) — ใช้ตัวแปรสีล้วน
   สลับธีมได้ 2 ทาง: ตามเครื่อง (prefers-color-scheme) และตามปุ่มสลับของหน้าเว็บ (data-theme)
   ต้องเขียนทั้ง 3 ชุด ไม่งั้นปุ่มสลับธีมจะสู้ค่าของเครื่องไม่ได้ */
:root,:root[data-theme=light]{--paper:#f6f1e4;--card:#fffdf6;--ink:#33291f;--soft:#7a6a52;
      --line:#ddd0b4;--primary:#7b5e3b;--accent:#9c3b2b;--ok:#2f6d43;--mark:#b98a2e}
@media (prefers-color-scheme:dark){:root{--paper:#221d17;--card:#2b251d;--ink:#efe6d5;
      --soft:#b3a68c;--line:#463b2c;--primary:#c9a878;--accent:#e08b76;--ok:#7fc79a;--mark:#e0b878}}
:root[data-theme=dark]{--paper:#221d17;--card:#2b251d;--ink:#efe6d5;--soft:#b3a68c;
      --line:#463b2c;--primary:#c9a878;--accent:#e08b76;--ok:#7fc79a;--mark:#e0b878}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:"Sarabun","TH Sarabun New",system-ui,sans-serif;line-height:1.75;font-size:16px}
.wrap{max-width:960px;margin:0 auto;padding:18px 16px 90px}
h1{font-size:clamp(24px,5vw,34px);margin:.2em 0;color:var(--accent);line-height:1.35}
.lead{color:var(--soft);font-size:14px;margin:0 0 14px}
.quote{border-left:4px solid var(--line);padding:8px 12px;margin:12px 0;color:var(--soft);
  background:var(--card);border-radius:0 10px 10px 0;font-size:14px}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:13px}
.stat b{color:var(--accent);font-size:17px}
.bar{position:sticky;top:0;z-index:20;background:var(--paper);border-bottom:1px solid var(--line);
  margin:0 -16px;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
input[type=search],select{font:inherit;font-size:15px;padding:8px 11px;border:1px solid var(--line);
  border-radius:10px;background:var(--card);color:var(--ink);min-width:0}
input[type=search]{flex:1}
.seg{display:flex;gap:6px;flex-wrap:wrap}
.seg button{font:inherit;font-size:13px;padding:6px 11px;border:1px solid var(--line);
  border-radius:999px;background:var(--card);color:var(--soft);cursor:pointer}
.seg button[aria-pressed=true]{background:var(--primary);color:#fff9ee;border-color:var(--primary)}
.savest{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--soft);white-space:nowrap}
.savest.ok{color:var(--ok);border-color:var(--ok)}
.savest.bad{color:var(--accent);border-color:var(--accent);font-weight:700}
.warn{margin:12px 0;padding:11px 13px;border-radius:12px;font-size:14px;line-height:1.7;
  background:rgba(156,43,35,.1);border:1px solid var(--accent);color:var(--accent)}
.warn[hidden]{display:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 15px;margin:13px 0}
.card.no{opacity:.5}
.card.yes{border-color:var(--ok);border-width:2px}
.num{font-size:13px;color:var(--soft);font-weight:700}
.txt{font-size:clamp(17px,3.6vw,20px);font-weight:600;margin:5px 0 8px;line-height:1.65}
.meta{font-size:12.5px;color:var(--soft);margin-bottom:10px}
.sec{margin:9px 0 0;font-size:14px}
.sec .h{font-weight:700;font-size:13px;color:var(--primary);display:block;margin-bottom:3px}
.path{display:inline-block;background:rgba(123,94,59,.1);border:1px solid var(--line);
  border-radius:8px;padding:1px 8px;margin:2px 4px 2px 0;font-size:13px}
.sub{margin:3px 0 3px 2px;font-size:14px}
.sub b{color:var(--mark)}
.dim{color:var(--soft);font-size:12.5px}
.acts{display:flex;gap:8px;margin-top:12px}
.acts button{flex:1;font:inherit;font-size:15px;padding:9px;border-radius:11px;cursor:pointer;
  border:1px solid var(--line);background:var(--paper);color:var(--soft);font-weight:600}
.acts button[aria-pressed=true].y{background:var(--ok);border-color:var(--ok);color:#fff}
.acts button[aria-pressed=true].n{background:var(--accent);border-color:var(--accent);color:#fff}
.out{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);
  padding:9px 16px;display:flex;gap:9px;align-items:center;font-size:13.5px}
.out button{font:inherit;font-size:14px;padding:8px 14px;border-radius:10px;border:none;
  background:var(--accent);color:#fff;font-weight:700;cursor:pointer}
textarea{width:100%;min-height:150px;font:inherit;font-size:14px;padding:10px;border-radius:10px;
  border:1px solid var(--line);background:var(--card);color:var(--ink)}
dialog{border:none;border-radius:14px;padding:16px;max-width:min(700px,94vw);background:var(--card);color:var(--ink)}
dialog::backdrop{background:rgba(0,0,0,.45)}
.toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:var(--ink);color:var(--paper);
  padding:9px 16px;border-radius:999px;font-size:14px;opacity:0;pointer-events:none;transition:.2s}
.toast.on{opacity:1}
"""

JS = """
/* ---------- ที่เก็บ 3 ชั้น + อ่านกลับมาเทียบ + โชว์สถานะ ----------
   บทเรียน 25 ก.ค. 2569: เก็บเงียบ ๆ แล้วพังโดยไม่มีใครรู้ = ผู้ใช้เสียงานเป็นชั่วโมง */
const STORE=(()=>{
  const probe=o=>{try{const k=KEY+':p';o.setItem(k,'1');const ok=o.getItem(k)==='1';o.removeItem(k);return ok}catch(e){return false}};
  try{if(typeof localStorage!=='undefined'&&probe(localStorage))
    return{durable:true,get:()=>localStorage.getItem(KEY),set:v=>localStorage.setItem(KEY,v)}}catch(e){}
  try{if(typeof sessionStorage!=='undefined'&&probe(sessionStorage))
    return{durable:false,get:()=>sessionStorage.getItem(KEY),set:v=>sessionStorage.setItem(KEY,v)}}catch(e){}
  return{durable:false,
    get:()=>{try{const m=/^__wbrev__(\\{[\\s\\S]*\\})$/.exec(window.name||'');return m?m[1]:null}catch(e){return null}},
    set:v=>{window.name='__wbrev__'+v}};
})();
let pick={};
try{const r=STORE.get();if(r)pick=JSON.parse(r)||{}}catch(e){}
let saveOK=null,savedAt='';
function save(){
  try{const v=JSON.stringify(pick);STORE.set(v);let b=null;try{b=STORE.get()}catch(e){}saveOK=(b===v)}
  catch(e){saveOK=false}
  const d=new Date();savedAt=[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>('0'+x).slice(-2)).join(':');
  paint();
}
const $=s=>document.querySelector(s);
function paint(){
  const el=$('#savest');if(!el)return;
  const n=Object.keys(pick).length;
  if(saveOK===false){el.className='savest bad';el.textContent='⚠ บันทึกไม่ได้ กดส่งออกเก็บไว้'}
  else if(saveOK===true){el.className='savest '+(STORE.durable?'ok':'bad');
    el.textContent=(STORE.durable?'💾 บันทึกแล้ว ':'⚠ เก็บชั่วคราว ')+savedAt+' · เคาะแล้ว '+n}
  else{el.className='savest';el.textContent='เคาะแล้ว '+n}
}
(function(){const w=$('#warn');if(!w)return;if(STORE.durable){w.hidden=true;return}
  w.hidden=false;w.innerHTML='<b>⚠ เครื่องนี้เก็บข้อมูลถาวรไม่ได้</b><br>'+
   'ที่เคาะไว้จะอยู่แค่ในแท็บนี้ รีเฟรชได้ แต่ปิดแท็บแล้วหาย<br>👉 <b>กดปุ่มส่งออกเก็บไว้เป็นระยะ</b>';})();

/* ---------- ตัวกรอง ---------- */
let q='',fState='all',fGroup='';
function apply(){
  let shown=0;
  document.querySelectorAll('.card').forEach(c=>{
    const id=c.dataset.id, st=pick[id]||'';
    c.classList.toggle('yes',st==='y');c.classList.toggle('no',st==='n');
    c.querySelectorAll('.acts button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===st));
    let ok=true;
    if(q&&!c.dataset.s.includes(q))ok=false;
    if(fGroup&&c.dataset.g!==fGroup)ok=false;
    if(fState==='todo'&&st)ok=false;
    if(fState==='y'&&st!=='y')ok=false;
    if(fState==='n'&&st!=='n')ok=false;
    c.hidden=!ok; if(ok)shown++;
  });
  $('#shown').textContent=shown;
}
document.addEventListener('DOMContentLoaded',()=>{
  $('#q').addEventListener('input',ev=>{q=ev.target.value.trim();apply()});
  const g=$('#fgroup'); if(g) g.addEventListener('change',ev=>{fGroup=ev.target.value;apply()});
  document.querySelectorAll('#fstate button').forEach(b=>b.addEventListener('click',()=>{
    fState=b.dataset.f;document.querySelectorAll('#fstate button').forEach(x=>x.setAttribute('aria-pressed',x===b));apply()}));
  document.querySelectorAll('.acts button').forEach(b=>b.addEventListener('click',()=>{
    const c=b.closest('.card'),id=c.dataset.id;
    if(pick[id]===b.dataset.v)delete pick[id];else pick[id]=b.dataset.v;
    save();apply();
  }));
  $('#b-out').addEventListener('click',showOut);
  $('#b-clr').addEventListener('click',()=>{if(confirm('ล้างที่เคาะไว้ทั้งหมด'))
    {pick={};save();apply();toast('ล้างแล้ว')}});
  save();apply();
});
function showOut(){
  const yes=[],no=[];
  document.querySelectorAll('.card').forEach(c=>{
    const st=pick[c.dataset.id];const t=c.dataset.title;
    if(st==='y')yes.push(c.dataset.id+'. '+t);
    if(st==='n')no.push(c.dataset.id+'. '+t);
  });
  const L=['# ผลการเคาะ — '+TITLE,'',
    '## ✕ ไม่เอา ('+no.length+')','',...(no.length?no:['(ไม่มี)']),'',
    '## ✓ เอา ('+yes.length+')','',...(yes.length?yes:['(ไม่มี)'])];
  $('#outtext').value=L.join('\\n');
  $('#dlg').showModal();
}
function copyOut(){const t=$('#outtext');t.select();
  navigator.clipboard.writeText(t.value).then(()=>toast('คัดลอกแล้ว')).catch(()=>toast('กดค้างเพื่อคัดลอก'))}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');
  clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1800)}
"""


def shell(title, key, lead, quote, stats, groups, cards, group_label,
          extra_css='', yes_label='✓ เอา', no_label='✕ ไม่เอา'):
    """โครงหน้าเคาะกลาง — ใช้ซ้ำได้ทุกงานที่ต้องให้เจ้าของคลังกดเลือกทีละใบ

    extra_css / yes_label / no_label เพิ่มทีหลัง (1 ส.ค. 2569) ให้หน้าอื่นยืมไปใช้ได้
    โดยไม่ต้องแก้ของเดิม — ค่าเริ่มต้นตรงกับที่ 2 หน้าแรกใช้อยู่ ผลลัพธ์จึงไม่เปลี่ยน
    """
    gsel = ''
    if groups:
        opts = ''.join(f'<option value="{e(g)}">{e(g)} ({n})</option>' for g, n in groups)
        gsel = f'<select id="fgroup" aria-label="{e(group_label)}"><option value="">{e(group_label)}</option>{opts}</select>'
    return f"""<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<style>{CSS}{extra_css}</style></head><body><div class="wrap">
<h1>{e(title)}</h1>
<p class="lead">{lead}</p>
<div class="quote">{quote}</div>
<div class="warn" id="warn" hidden></div>
<div class="stats">{stats}</div>
<div class="bar">
  <input type="search" id="q" placeholder="ค้นหาข้อความ คำ หรือชื่อกิ่ง" aria-label="ค้นหา">
  {gsel}
  <div class="seg" id="fstate">
    <button data-f="all" aria-pressed="true">ทั้งหมด</button>
    <button data-f="todo" aria-pressed="false">ยังไม่เคาะ</button>
    <button data-f="y" aria-pressed="false">{e(yes_label)}</button>
    <button data-f="n" aria-pressed="false">{e(no_label)}</button>
  </div>
  <span class="savest" id="savest"></span>
</div>
{cards}
</div>
<div class="out">
  <span>แสดง <b id="shown">0</b> รายการ</span>
  <button id="b-clr" style="background:var(--soft)">ล้าง</button>
  <button id="b-out">ส่งออกผลการเคาะ</button>
</div>
<dialog id="dlg"><textarea id="outtext" readonly></textarea>
  <div style="display:flex;gap:8px;margin-top:9px">
    <button onclick="copyOut()" style="flex:1;font:inherit;font-size:15px;padding:9px;border-radius:10px;border:none;background:var(--primary);color:#fff;font-weight:700">คัดลอก</button>
    <button onclick="document.getElementById('dlg').close()" style="flex:1;font:inherit;font-size:15px;padding:9px;border-radius:10px;border:1px solid var(--line);background:var(--paper);color:var(--ink)">ปิด</button>
  </div></dialog>
<div class="toast" id="toast"></div>
<script>const KEY='{key}';const TITLE={json.dumps(title, ensure_ascii=False)};{JS}</script>
</body></html>"""


# ─────────────────────────────────────────────
def narration_html():
    passages = [w for w in W if any(q['category_id'] == NARR for q in w['all_paths'])]
    passages.sort(key=lambda w: -len(w['text']))
    subs = collections.defaultdict(list)
    for w in W:
        for s in ([w['source']] if w.get('source') else []) + w.get('picked_from', []):
            if w not in subs[s]:
                subs[s].append(w)

    gcount = collections.Counter()
    for w in passages:
        for q in w['all_paths']:
            if q['category_id'] == NARR:
                gcount[q['path']] += 1

    cards = []
    for i, w in enumerate(passages, 1):
        own = [q['path'] for q in w['all_paths'] if q['category_id'] == NARR]
        whole = [q for q in w['all_paths'] if q['category_id'] != NARR]
        sw = subs.get(w['text'], [])
        sec = []
        if own:
            sec.append('<div class="sec"><span class="h">📚 กิ่งในหมวด 15</span>'
                       + ''.join(f'<span class="path">{e(x)}</span>' for x in own) + '</div>')
        if whole:
            sec.append('<div class="sec"><span class="h">🏷 ทั้งบทติดกิ่ง</span>'
                       + ''.join(f'<span class="path">{e(cname(q["category_id"]))} → {e(q["path"])}</span>'
                                 for q in whole) + '</div>')
        if sw:
            rows = []
            for s in sw:
                tag = '' if s['origin'] == 'extract' else \
                    f' <span class="dim">(มีเป็นบรรทัดเดี่ยวในคลังอยู่แล้ว บรรทัด {s["line"]})</span>'
                paths = ''.join(f'<span class="path">{e(cname(q["category_id"]))} → {e(q["path"])}</span>'
                                for q in s['all_paths'])
                rows.append(f'<div class="sub"><b>{e(s["text"])}</b>{tag}<br>{paths}</div>')
            sec.append(f'<div class="sec"><span class="h">✂ คำย่อยที่พี่กันตัดจากบทนี้ ({len(sw)} คำ)</span>'
                       + ''.join(rows) + '</div>')
        if w.get('reason'):
            sec.append(f'<div class="sec dim">🗨 {e(w["reason"])}</div>')

        blob = (w['text'] + ' ' + ' '.join(q['path'] for q in w['all_paths'])
                + ' ' + ' '.join(s['text'] for s in sw))
        cards.append(
            f'<div class="card" data-id="{i}" data-g="{e(own[0] if own else "")}" '
            f'data-title="{e(w["text"])}" data-s="{e(blob)}">'
            f'<div class="num">#{i}</div>'
            f'<div class="txt">{e(w["text"])}</div>'
            f'<div class="meta">ยาว {len(w["text"])} ตัวอักษร'
            + (f' · บรรทัด {w["line"]} ในไฟล์คลัง' if w['origin'] == 'raw' else '') + '</div>'
            + ''.join(sec)
            + '<div class="acts"><button class="y" data-v="y" aria-pressed="false">✓ เอา</button>'
              '<button class="n" data-v="n" aria-pressed="false">✕ ไม่เอา</button></div></div>')

    n = [len(x['text']) for x in passages]
    stats = ''.join([
        f'<span class="stat">ทั้งหมด <b>{len(passages)}</b> บท</span>',
        f'<span class="stat">60 ตัวอักษรขึ้นไป <b>{sum(1 for x in n if x >= 60)}</b></span>',
        f'<span class="stat">40–59 <b>{sum(1 for x in n if 40 <= x < 60)}</b></span>',
        f'<span class="stat">25–39 <b>{sum(1 for x in n if 25 <= x < 40)}</b></span>',
        f'<span class="stat">ต่ำกว่า 25 <b>{sum(1 for x in n if x < 25)}</b></span>',
        f'<span class="stat">มีคำย่อย <b>{sum(1 for x in passages if subs.get(x["text"]))}</b> บท</span>',
    ])
    open(p('docs/newwords-review-narration.html'), 'w', encoding='utf-8').write(shell(
        'บทบรรยายหมวด 15 — เคาะว่าอันไหนเอา',
        'wordbank:review-narration:v1',
        'เรียงจากบทยาวสุดไปสั้นสุด · แตะปุ่มใต้การ์ดเพื่อเคาะ · ที่เคาะไว้บันทึกทันทีทุกครั้ง',
        'พี่กันสั่งเอง: <i>"ลิสทั้ง 80 มาให้ที เราจะอ่านว่าอันไหนเอาอันไหนไม่เอา"</i><br>'
        'แต่ละบทโชว์ 3 ชั้น — 📚 อยู่กิ่งไหนในหมวด 15 · 🏷 ทั้งบทติดกิ่งไหน · ✂ คำย่อยข้างในติดกิ่งไหน<br>'
        '<b>บทที่สั้นกว่า 25 ตัวอักษร</b> คือกลุ่มที่น่าสงสัยที่สุดว่าไม่ใช่บทบรรยาย อยู่ท้ายลิสต์',
        stats, sorted(gcount.items(), key=lambda x: -x[1]), ''.join(cards), 'เลือกกิ่งหมวด 15'))
    return len(passages)


def branches_html():
    OLD = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c9', 'c10']
    words_at = collections.defaultdict(list)
    for w in W:
        for q in w['all_paths']:
            words_at[(q['category_id'], q['path'])].append(w)
    new = [b for b in D['branches'] if b['is_new'] and b['category_id'] in OLD]
    new.sort(key=lambda b: (CATS[b['category_id']]['no'], b['path']))

    cards = []
    for i, b in enumerate(new, 1):
        ws = words_at[(b['category_id'], b['path'])]
        parent = b['path'].rsplit(' / ', 1)[0] if ' / ' in b['path'] else '(กิ่งหลักใหม่)'
        name = b['path'].split(' / ')[-1]
        sec = [f'<div class="sec"><span class="h">อยู่ใต้</span>{e(parent)}</div>',
               f'<div class="sec"><span class="h">นิยาม</span>{e(b["definition"])}</div>']
        if b.get('why'):
            sec.append(f'<div class="sec"><span class="h">ทำไมของเดิมรับไม่ได้</span>{e(b["why"])}</div>')
        if ws:
            rows = []
            for w in ws:
                others = [q['path'] for q in w['all_paths']
                          if not (q['category_id'] == b['category_id'] and q['path'] == b['path'])]
                oth = ''.join(f'<span class="path">{e(x)}</span>' for x in others)
                rsn = f'<br><span class="dim">🗨 {e(w["reason"])}</span>' if w.get('reason') else ''
                rows.append(f'<div class="sub"><b>{e(w["text"])}</b><br>{oth}{rsn}</div>')
            sec.append(f'<div class="sec"><span class="h">คำที่ลงกิ่งนี้ ({len(ws)} คำ)</span>'
                       + ''.join(rows) + '</div>')
        else:
            sec.append('<div class="sec dim">⚠️ กิ่งนี้ยังไม่มีคำมาลง (ตั้งเผื่อไว้)</div>')
        blob = name + ' ' + b['en'] + ' ' + b['path'] + ' ' + ' '.join(w['text'] for w in ws)
        cards.append(
            f'<div class="card" data-id="{i}" data-g="{e(cname(b["category_id"]))}" '
            f'data-title="{e(name)}" data-s="{e(blob)}">'
            f'<div class="num">#{i} · {e(cname(b["category_id"]))}</div>'
            f'<div class="txt">{e(name)} <span class="dim">({e(b["en"])})</span></div>'
            + ''.join(sec)
            + '<div class="acts"><button class="y" data-v="y" aria-pressed="false">✓ เอา</button>'
              '<button class="n" data-v="n" aria-pressed="false">✕ ไม่เอา</button></div></div>')

    gc = collections.Counter(cname(b['category_id']) for b in new)
    stats = f'<span class="stat">กิ่งใหม่ <b>{len(new)}</b> กิ่ง</span>' + ''.join(
        f'<span class="stat">{e(k.split(" ")[0])} {e(k.split(" ")[1])} <b>{v}</b></span>'
        for k, v in sorted(gc.items(), key=lambda x: -x[1]))
    open(p('docs/newwords-review-branches.html'), 'w', encoding='utf-8').write(shell(
        'กิ่งใหม่ในหมวดเดิม — เคาะว่ากิ่งไหนเอา',
        'wordbank:review-branches:v1',
        'รวมกิ่งที่เสนอไว้รอบก่อนกับกิ่งที่โผล่ตอนจัดคำจริงไว้ด้วยกัน · แตะปุ่มใต้การ์ดเพื่อเคาะ',
        'พี่กันสั่ง: <i>"48 กิ่งที่เสนอรอบก่อน กับ 16 กิ่งที่โผล่เพิ่ม เอามารวมกันที เราขออ่านซ้ำ '
        'และขอทั้งวลีนั้น กิ่ง หมวด และเหตุผล"</i><br>'
        'ทุกกิ่งมีคำจริงครบทุกคำ พร้อมกิ่งอื่นที่คำนั้นติดด้วย และเหตุผลที่ตัวจัดคำเขียนไว้<br>'
        '🚫 กิ่งของหมวดใหม่ 12/13/14/15 ไม่ได้อยู่ในนี้ อ่านได้ในไฟล์ร่างของแต่ละหมวด',
        stats, sorted(gc.items(), key=lambda x: -x[1]), ''.join(cards), 'เลือกหมวด'))
    return len(new)


if __name__ == '__main__':
    print('บทบรรยาย', narration_html(), '→ docs/newwords-review-narration.html')
    print('กิ่งใหม่', branches_html(), '→ docs/newwords-review-branches.html')
