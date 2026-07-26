#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างม็อคอัพ "หน้าต่างคำ" → docs/word-web-mockup.html

พี่กันสั่ง 26 ก.ค. 2569 สามรอบ กว่าจะได้โจทย์ที่ตรง
  รอบ 1 "ทำมอคอัพมาก่อน" + "เอา" (ให้มีทางกลับ)
  รอบ 2 "จืดชืดมาก เน้นความเด่นกว่านี้ มีกิ่งไม้"      → ทำเป็นแผนผังกิ่งไม้วาดหมึกเต็มหน้า
  รอบ 3 "เอาตรง ๆ นะ เวอร์ไป"                          → รื้อกลับมาให้เรียบ

🎯 โจทย์จริงจากรอบ 3 (พี่กันเขียนเอง):
   "แค่วลียาว ๆ มีเส้นโยงไปวลีที่แตกออกมา และโยงไปที่หมวด และหมวดนั้นโยงไปที่กิ่งไหน
    มินิมอล แต่สวยงาม และหน้านี้เราคิดว่ามันจะ popup ขึ้นมาตอนกดคำ ๆ นั้น
    ซึ่งมันจะไม่มีแค่รายละเอียด แต่มันจะมีการแก้ไขหมวด กับโน่นนี่ที่เว็บทำไว้อยู่แล้ว
    และมันจะขึ้นแนวนอน และไม่ต้องทำ mockup แบบอลังการแบบนั้น แค่เฉพาะไม่กี่คำ"

→ จึงทำเป็น **ป๊อปอัปแนวนอน** ที่เด้งขึ้นมาตอนกดคำในหน้าคลังคำ แบ่งสองฝั่ง
  ซ้าย = เส้นโยง (วลี → คำที่แตกออกมา → หมวด → กิ่ง) และแก้กิ่งได้ในตัว
  ขวา = ช่องแก้ไขเดิมที่เว็บมีอยู่แล้ว (คำ ความหมาย ชนิด เรื่อง ปุ่มลบ/ยกเลิก/บันทึก)
  สีและช่องกรอกลอกมาจาก components/pages/modals.jsx ของจริง เพื่อให้เห็นภาพตรงกับเว็บ

🔑 คำ วลี และกิ่งทุกอันดึงจากไฟล์คลังจริง ไม่แต่งขึ้นเอง
วิธีใช้: python3 scripts/gen_word_web_mockup.py [ที่เก็บฉบับสำหรับหน้าเว็บ]
"""
import json, os, sys, base64, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)

NEW = json.load(open(p('docs/newwords-branches.json'), encoding='utf-8'))
OLD = json.load(open(p('docs/library-export.json'), encoding='utf-8'))['words']
CAT = {c['id']: c for c in NEW['categories']}
W = {w['text']: w for w in NEW['words']}
OLDBY = collections.defaultdict(list)
for o in OLD:
    OLDBY[o['text']].append(o)


def parents(w):
    """วลีแม่ทั้งหมด — ตัดซ้ำ (11 คำมีวลีเดิมโผล่ทั้งช่อง source และ picked_from)"""
    out = []
    for s in ([w['source']] if w.get('source') else []) + (w.get('source_others') or []) + (w.get('picked_from') or []):
        if s and s != w['text'] and s not in out:
            out.append(s)
    return out


KIDS = collections.defaultdict(list)
for w in NEW['words']:
    for s in parents(w):
        if w['text'] not in KIDS[s]:
            KIDS[s].append(w['text'])

# พี่กันบอก "แค่เฉพาะไม่กี่คำ" → เอา 3 คำที่ครอบเคสต่างกันพอ
SEEDS = ['อรุณรุ่งที่ท้องฟ้ามืดครึ้มเป็นสีตะกั่วชวนมัวหมองหดหู่', 'เล็ดลอด', 'ล้มระเนระนาด']

seen = set()
for t in SEEDS:
    seen.add(t)
    seen |= set(parents(W[t])) | set(KIDS.get(t, []))
for t in list(seen):
    seen |= set(KIDS.get(t, []))

NODES = {}
for t in sorted(seen):
    w = W[t]
    n = {
        'kind': w.get('kind') or 'word',
        'meaning': w.get('meaning') or '',
        'novels': [w['novel']] if w.get('novel') else [],
        'paths': [{'no': CAT[a['category_id']]['no'], 'cat': CAT[a['category_id']]['name_th'],
                   'path': a['path'], 'from': 'ใหม่'} for a in (w.get('all_paths') or [])],
        'parents': [s for s in parents(w) if s in seen],
        'kids': [k for k in KIDS.get(t, []) if k in seen],
        'line': w.get('line'),
    }
    if t in OLDBY:
        for o in OLDBY[t]:
            no = int(o['category_id'][1:]) + 1
            n['paths'].append({'no': no, 'cat': CAT.get(f'c{no-1}', {}).get('name_th', ''),
                               'path': o.get('subpath') or '', 'from': 'เดิม'})
            nv = o.get('novel') or 'ไม่ระบุเรื่อง'
            if nv not in n['novels']:
                n['novels'].append(nv)
    NODES[t] = n

oldc = collections.Counter(o['text'] for o in OLD)
dup = [t for t, c in oldc.items() if c > 1]
FACTS = {
    'crossOld': sum(1 for t in dup if len({o['category_id'] for o in OLDBY[t]}) > 1),
    'dupRows': sum(oldc[t] for t in dup),
    'overlap': sum(1 for t in W if t in OLDBY),
    'multiCat': sum(1 for w in NEW['words'] if len({a['category_id'] for a in (w.get('all_paths') or [])}) > 1),
}
DATA = json.dumps({'nodes': NODES, 'seeds': SEEDS, 'facts': FACTS}, ensure_ascii=False, separators=(',', ':'))

# ฟอนต์ไตรรงค์ฝังในไฟล์ (เว็บที่พี่กันเปิดอ่านดึงฟอนต์จากภายนอกไม่ได้)
# ใช้ตัวเดียวกับที่หน้าคลังคำของจริงใช้แสดงคำ จะได้เห็นภาพตรงกัน
FACE = []
for wt, sub, rng in [(400, 'thai', 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC'),
                     (400, 'latin', 'U+0000-00FF,U+2000-206F,U+2122,U+2212'),
                     (700, 'thai', 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC'),
                     (700, 'latin', 'U+0000-00FF,U+2000-206F,U+2122,U+2212')]:
    b64 = base64.b64encode(open(p(f'scripts/fonts/Trirong-{wt}-{sub}.woff2'), 'rb').read()).decode()
    FACE.append("@font-face{font-family:'Trirong';font-style:normal;font-weight:%d;font-display:swap;"
                "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (wt, b64, rng))
FONTCSS = '\n'.join(FACE)

TITLE = 'ม็อคอัพ · หน้าต่างคำ'
BODY = r'''<style>
__FONTS__
/* สีชุดเดียวกับเว็บจริง (components/pages/modals.jsx) + จานสีไฮไลต์ชุดเดียวกับหน้าตรวจทาน */
:root{
  --panel:#f7f0e0; --surface:#fffdf6; --line:#e0d0ac; --line2:#e6dabf; --page:#e9dfc7;
  --ink:#2f251c; --ink2:#5c5044; --dim:#8a7d6d; --faint:#b0a184;
  --accent:#9c3b2b; --primary:#6f4e37;
  --chip:#f0e8d4; --chipb:#e4d8bd;
}
@media (prefers-color-scheme:dark){:root{
  --panel:#241d16; --surface:#2c241b; --line:#463a2a; --line2:#3d3325; --page:#161109;
  --ink:#f3e8d2; --ink2:#cdbfa6; --dim:#9d8e77; --faint:#6f6353;
  --accent:#e8907a; --primary:#c69a6d; --chip:#332b21; --chipb:#453a2c;
}}
:root[data-theme=dark]{
  --panel:#241d16; --surface:#2c241b; --line:#463a2a; --line2:#3d3325; --page:#161109;
  --ink:#f3e8d2; --ink2:#cdbfa6; --dim:#9d8e77; --faint:#6f6353;
  --accent:#e8907a; --primary:#c69a6d; --chip:#332b21; --chipb:#453a2c;
}
:root[data-theme=light]{
  --panel:#f7f0e0; --surface:#fffdf6; --line:#e0d0ac; --line2:#e6dabf; --page:#e9dfc7;
  --ink:#2f251c; --ink2:#5c5044; --dim:#8a7d6d; --faint:#b0a184;
  --accent:#9c3b2b; --primary:#6f4e37; --chip:#f0e8d4; --chipb:#e4d8bd;
}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
body{margin:0;background:var(--page);color:var(--ink);font-family:'Trirong',Georgia,serif;
  font-size:16px;line-height:1.75;-webkit-text-size-adjust:100%}

.head{max-width:1200px;margin:0 auto;padding:20px 16px 0;display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}
.head h1{font-size:18px;font-weight:700;margin:0}
.head p{margin:0;color:var(--dim);font-size:13px;flex:1;min-width:190px}
.head button{border:none;background:none;color:var(--dim);font-family:inherit;font-size:12.5px;
  cursor:pointer;border-bottom:1px solid var(--line);padding:0}
.pick{max-width:1200px;margin:10px auto 0;padding:0 16px;display:flex;gap:15px;flex-wrap:wrap;align-items:center}
.pick b{font-size:12.5px;color:var(--dim);font-weight:400}
.pick button{border:none;background:none;font-family:inherit;font-size:14.5px;color:var(--ink2);
  cursor:pointer;padding:2px 0;border-bottom:1.5px solid transparent}
.pick button[aria-pressed=true]{color:var(--accent);border-bottom-color:var(--accent)}

.scene{position:relative;max-width:1200px;margin:14px auto 0;padding:16px;
  background:var(--page);border:1px solid var(--line2);border-radius:14px;overflow:hidden}
.behind{filter:blur(1.6px);opacity:.45;pointer-events:none;user-select:none}
.behind h4{margin:0 0 8px;font-size:13.5px;color:var(--dim);font-weight:400}
.bgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:7px}
.bcard{background:var(--surface);border:1px solid var(--line2);border-left:3px solid var(--faint);
  border-radius:9px;padding:8px 9px;font-size:14px;color:var(--ink2);min-height:40px}
.veil{position:absolute;inset:0;background:rgba(48,38,26,.38);backdrop-filter:blur(2px)}
:root[data-theme=dark] .veil{background:rgba(6,4,2,.6)}

.modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1130px,calc(100% - 26px));
  background:var(--panel);border:1px solid var(--line);border-radius:16px;
  box-shadow:0 24px 70px rgba(40,28,14,.34);display:grid;grid-template-columns:1.42fr .58fr;
  overflow:hidden;animation:pop .22s ease}
@keyframes pop{from{opacity:0;transform:translate(-50%,-47%)}to{opacity:1;transform:translate(-50%,-50%)}}
@media(max-width:900px){
  .modal{grid-template-columns:1fr;position:static;transform:none;width:auto;animation:none}
  .scene{padding:9px;height:auto!important;border:none;background:none}
  .behind,.veil{display:none}
}
.side{padding:18px 20px 20px;min-width:0}
.side+.side{border-left:1px solid var(--line);background:linear-gradient(var(--panel),var(--panel))}
@media(max-width:900px){.side+.side{border-left:none;border-top:1px solid var(--line)}}
.cap{font-size:11px;letter-spacing:.2em;color:var(--dim);margin:0 0 10px;text-transform:uppercase}

/* ── ผังใยความคิด ── */
.map{position:relative}
svg.links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:0}
.map>*{position:relative;z-index:1}
.lk{fill:none;stroke-linecap:round;stroke-dasharray:var(--len);stroke-dashoffset:var(--len);
  animation:draw .55s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}

/* คำหลัก — ต้องเด่นที่สุดในจอ */
.heroWrap{display:flex;justify-content:center;margin-bottom:26px}
.hero{background:var(--surface);border:2px solid var(--primary);border-radius:14px;
  padding:15px 22px;box-shadow:0 10px 26px -14px rgba(40,28,14,.55);max-width:min(560px,100%)}
.hero .eb{font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);
  display:block;margin-bottom:4px}
.hero .tx{font-size:clamp(21px,2.5vw,31px);font-weight:700;line-height:1.55;color:var(--ink);word-break:break-word}
.hero .mt{font-size:12.5px;color:var(--dim);margin-top:5px}
mark{background:var(--c1);color:inherit;border-radius:3px;padding:1px 2px;
  box-shadow:inset 0 -0.14em 0 var(--c2);-webkit-box-decoration-break:clone;box-decoration-break:clone}

/* คำสกัด — ใบไม้สีเดียวกับที่ไฮไลต์ในวลี */
.leaves{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-bottom:24px}
.leaf{border:none;border-radius:20px;padding:5px 15px;font-family:inherit;font-size:15px;
  color:#fffaf0;cursor:pointer;line-height:1.6;box-shadow:0 5px 12px -7px rgba(40,28,14,.7)}
.leaf:hover{transform:translateY(-2px)}
.leaf.dim{opacity:.62}
/* วลีแม่ (ทางกลับ) */
.pars{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;align-items:center}
.par{background:var(--surface);border:1px solid var(--line2);border-radius:10px;padding:8px 13px;
  font-family:inherit;font-size:14.5px;line-height:1.65;color:var(--ink);cursor:pointer;
  max-width:min(520px,100%);text-align:left}
.par:hover{border-color:var(--primary)}

/* หมวด → กิ่ง */
.cats{display:flex;flex-direction:column;gap:14px}
.catrow{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start}
@media(max-width:520px){.catrow{grid-template-columns:1fr;gap:10px}
  .catnode{justify-self:start}.blist{padding-left:14px}}
.catnode{align-self:start;background:var(--cc);color:#fffaf0;border-radius:9px;padding:6px 13px;
  font-size:13.5px;font-weight:700;white-space:nowrap;box-shadow:0 5px 13px -8px rgba(40,28,14,.75)}
.catnode span{display:block;font-size:11px;font-weight:400;opacity:.88;white-space:normal;max-width:150px}
.blist{display:flex;flex-direction:column;gap:6px;padding-top:2px}
.bnode{display:flex;gap:8px;align-items:flex-start;background:var(--surface);
  border:1px solid var(--line2);border-left:3px solid var(--cc);border-radius:0 9px 9px 0;padding:6px 10px}
.bnode.old{background:none;border-style:dashed;border-left-style:dashed}
.bp{flex:1;font-size:13.5px;line-height:1.6;color:var(--ink2)}
.bp .src{font-size:10.5px;color:var(--faint);margin-left:6px}
.x{border:none;background:none;color:var(--faint);cursor:pointer;font-size:12px;padding:0 2px;font-family:inherit}
.x:hover{color:var(--accent)}
.addb{align-self:flex-start;font-size:11.5px;padding:3px 11px;border-radius:20px;border:1px dashed var(--line);
  background:none;color:var(--dim);cursor:pointer;font-family:inherit}
.addcat{margin-top:12px;font-size:12.5px;border:none;background:none;color:var(--primary);
  cursor:pointer;font-family:inherit;padding:0}

/* ฝั่งแก้ไข */
label{display:block;font-size:12px;font-weight:600;color:var(--ink2);margin:0 0 4px}
.f{width:100%;padding:8px 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface);
  color:var(--ink);font-family:inherit;font-size:14.5px;outline:none;margin-bottom:11px}
.two{display:flex;gap:9px}.two>div{flex:1;min-width:0}
.acts{display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap}
.acts .sp{flex:1}
.bt{padding:8px 14px;border-radius:9px;font-family:inherit;font-size:14px;cursor:pointer}
.del{border:1px solid #e6c3b7;background:#faf1ee;color:var(--accent)}
:root[data-theme=dark] .del{border-color:#5c3a30;background:#33231e}
.can{border:1px solid var(--line);background:transparent;color:var(--ink2)}
.ok{border:none;background:var(--primary);color:#fbf3e2;font-weight:600;padding:8px 20px}

.foot{max-width:1200px;margin:14px auto 40px;padding:13px 16px 0;border-top:1px solid var(--line2);
  color:var(--faint);font-size:12.5px;line-height:1.8}
.foot b{color:var(--ink2)}
</style>

<div class="head">
  <h1>หน้าต่างคำ</h1>
  <p>ภาพร่างป๊อปอัปที่เด้งขึ้นมาตอนกดคำในหน้าคลังคำ — ซ้ายคือผังเส้นโยง ขวาคือช่องแก้ไขเดิมของเว็บ</p>
  <button id="tog">สลับกลางวัน / กลางคืน</button>
</div>
<div class="pick"><b>ดูตัวอย่าง</b><span id="pk"></span></div>

<div class="scene">
  <div class="behind">
    <h4>คลังคำ · หมวด 1 บรรยากาศ แสง สี และสถานที่</h4>
    <div class="bgrid" id="bg"></div>
  </div>
  <div class="veil"></div>
  <div class="modal">
    <div class="side">
      <p class="cap">ผังเส้นโยง</p>
      <div class="map" id="map"><svg class="links" id="svg"></svg></div>
    </div>
    <div class="side">
      <p class="cap">แก้ไข</p>
      <div id="form"></div>
    </div>
  </div>
</div>
<p class="foot" id="foot"></p>

<script>
const D = __DATA__, N = D.nodes, F = D.facts;
/* จานสีคำสกัด — ชุดเดียวกับที่หน้าตรวจทานของจริงใช้ไฮไลต์คำที่ AI ดึงจากประโยค */
const PAL = ['#8f6b4a','#5f7f92','#a86a79','#6f8a56','#7c6a99','#3f7d6c','#96603a'];
const CATCOL = ['#5e7a4a','#9a5a63','#8a6a3c','#4d6c86','#6d5f8c','#3f7a6b','#8a6540','#4a6f7a',
                '#7a6a4a','#96603a','#7e4f66','#557a55','#5f5f8a','#8a6a3a','#6f7a45'];
const ccol = n => CATCOL[(n - 1) % CATCOL.length];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' };
const CATS = ['1 บรรยากาศ แสง สี และสถานที่','2 รูปลักษณ์และลักษณะบุคคล','3 กริยา ท่าทาง และการเคลื่อนไหว',
  '4 เสียง','5 สภาวะภายใน','6 คำปรุงแต่งและคำอเนกประสงค์','15 บทบรรยายและภาพรวมฉาก'];

document.getElementById('bg').innerHTML =
  ['แสงสลัวราง','ม่านหมอก','ฟ้าสาง','เงาทาบ','ลมโชย','ครึ้มฟ้าครึ้มฝน','แดดจ้า','สนธยา','อรุณรุ่ง','มืดตึดตื๋อ','ละอองฝน','แสงเรือง']
    .map(t => `<div class="bcard">${t}</div>`).join('');
document.getElementById('pk').innerHTML = D.seeds.map(t =>
  `<button data-sp="${esc(t)}" aria-pressed="false">${esc(t.length > 26 ? t.slice(0, 24) + '…' : t)}</button>`).join(' ');

/* ระบายสีคำสกัดลงในวลี — คำที่ซ้อนอยู่ในคำที่ยาวกว่าจะระบายทับกันไม่ได้ คืน used กลับไปด้วย */
function paint(sentence, words) {
  const hit = [];
  words.forEach((w, i) => {
    let f = 0, at;
    while (w && (at = sentence.indexOf(w, f)) !== -1) { hit.push({ a: at, b: at + w.length, i }); f = at + w.length; }
  });
  hit.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  let out = '', cur = 0; const used = new Set();
  for (const h of hit) {
    if (h.a < cur) continue;
    out += esc(sentence.slice(cur, h.a));
    const c = PAL[h.i % PAL.length];
    used.add(h.i);
    out += `<mark data-m="${h.i}" style="--c1:${c}30;--c2:${c}">${esc(sentence.slice(h.a, h.b))}</mark>`;
    cur = h.b;
  }
  return { html: out + esc(sentence.slice(cur)), used };
}

let cur = null;
function render(t) {
  const n = N[t], map = document.getElementById('map');
  const isSrc = n.kids.length > 0;
  const pt = isSrc ? paint(t, n.kids) : { html: esc(t), used: new Set() };

  const byCat = new Map();
  n.paths.forEach(x => { if (!byCat.has(x.no)) byCat.set(x.no, { cat: x.cat, list: [] }); byCat.get(x.no).list.push(x); });

  const h = [];
  /* วลีแม่ — วางไว้เหนือคำหลัก แล้วลากเส้นลงมา */
  if (n.parents.length) h.push('<div class="pars" id="pars">' + n.parents.map((p, i) => {
    const q = paint(p, [t]);
    return `<button class="par" data-go="${esc(p)}" data-p="${i}">${q.html}</button>`;
  }).join('') + '</div>');

  h.push('<div class="heroWrap"><div class="hero" id="hero">'
    + `<span class="eb">${n.parents.length ? 'คำที่กำลังดู' : 'วลีตั้งต้น'}</span>`
    + `<div class="tx">${pt.html}</div>`
    + `<div class="mt">${KIND[n.kind] || 'คำ'} · เกาะอยู่ ${n.paths.length} กิ่ง ใน ${byCat.size} หมวด`
    + (n.novels.length > 1 ? ` · เจอใน ${n.novels.length} เรื่อง` : '')
    + (n.meaning ? ` · ${esc(n.meaning)}` : '') + '</div></div></div>');

  if (isSrc) h.push('<div class="leaves" id="leaves">' + n.kids.map((k, i) =>
    `<button class="leaf${pt.used.has(i) ? '' : ' dim'}" data-go="${esc(k)}" data-k="${i}"`
    + ` style="background:${PAL[i % PAL.length]}">${esc(k)}</button>`).join('') + '</div>');

  h.push('<div class="cats" id="cats">' + [...byCat.entries()].map(([no, g]) =>
    `<div class="catrow" style="--cc:${ccol(no)}"><div class="catnode" data-c="${no}">หมวด ${no}<span>${esc(g.cat)}</span></div>`
    + '<div class="blist">' + g.list.map(x =>
      `<div class="bnode${x.from === 'เดิม' ? ' old' : ''}" data-b="${no}"><span class="bp">${esc(x.path)}`
      + (x.from === 'เดิม' ? '<span class="src">จากคลังเดิม</span>' : '') + '</span><button class="x">✕</button></div>').join('')
    + '<button class="addb">＋ เพิ่มกิ่งในหมวดนี้</button></div></div>').join('')
    + '</div><button class="addcat">＋ เพิ่มหมวด</button>');

  map.innerHTML = '<svg class="links" id="svg"></svg>' + h.join('');
  document.getElementById('form').innerHTML =
    `<label>คำ / วลี</label><input class="f" value="${esc(t)}">`
    + `<label>ความหมาย (ไม่บังคับ)</label><input class="f" value="${esc(n.meaning)}" placeholder="ยังไม่ได้ใส่">`
    + '<div class="two"><div><label>ชนิด</label><select class="f">'
    + ['word','phrase','sentence'].map(k => `<option${k === n.kind ? ' selected' : ''}>${KIND[k]}</option>`).join('')
    + '</select></div><div><label>หมวดหลัก</label><select class="f">'
    + CATS.map(c => `<option${+c.split(' ')[0] === n.paths[0].no ? ' selected' : ''}>หมวด ${c}</option>`).join('')
    + '</select></div></div><label>จากเรื่อง</label>'
    + n.novels.map(v => `<input class="f" value="${esc(v)}">`).join('')
    + '<div class="acts"><button class="bt del">ลบคำนี้</button><span class="sp"></span>'
    + '<button class="bt can">ยกเลิก</button><button class="bt ok">บันทึก</button></div>';

  requestAnimationFrame(() => wire(t));
  document.querySelectorAll('[data-sp]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sp === t)));
}

/* ลากเส้นโยง — วัดตำแหน่งจริงของแต่ละชิ้นแล้ววาดเส้นโค้งทับ */
function wire(t) {
  const map = document.getElementById('map'), svg = document.getElementById('svg');
  const R = map.getBoundingClientRect();
  const rel = el => { const b = el.getBoundingClientRect(); return { x: b.left - R.left, y: b.top - R.top, w: b.width, h: b.height }; };
  const relMark = el => { const b = el.getClientRects()[0] || el.getBoundingClientRect();
    return { x: b.left - R.left, y: b.top - R.top, w: b.width, h: b.height }; };
  const P = [];
  const curveV = (x1, y1, x2, y2) => { const d = Math.max(18, (y2 - y1) * .45);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}C${x1.toFixed(1)} ${(y1 + d).toFixed(1)} ${x2.toFixed(1)} ${(y2 - d).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  const curveH = (x1, y1, x2, y2) => { const d = Math.max(14, (x2 - x1) * .5);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}C${(x1 + d).toFixed(1)} ${y1.toFixed(1)} ${(x2 - d).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`; };

  const hero = document.getElementById('hero');
  if (hero) {
    const hb = rel(hero);
    /* วลีแม่ → คำหลัก */
    map.querySelectorAll('.par').forEach(el => {
      const b = rel(el);
      P.push([curveV(b.x + b.w / 2, b.y + b.h, hb.x + hb.w / 2, hb.y), 'var(--primary)', 1.8, .55]);
    });
    /* คำที่ไฮไลต์ในวลี → ใบไม้คำสกัด · เส้นสีเดียวกับที่ระบายไว้ในวลี
       คำที่ซ้อนอยู่ในคำยาวกว่า (มืดครึ้ม อยู่ใน ท้องฟ้ามืดครึ้ม) ระบายทับกันไม่ได้
       จึงลากเส้นออกจากคำยาวที่ครอบมันอยู่แทน เป็นเส้นประ — ทุกคำสกัดต้องมีเส้นโยง ไม่มีใครลอย */
    const marks = [...map.querySelectorAll('mark')];
    map.querySelectorAll('.leaf').forEach(leaf => {
      const i = +leaf.dataset.k, txt = leaf.textContent;
      let m = marks.find(x => +x.dataset.m === i), dash = 0;
      if (!m) { m = marks.find(x => x.textContent.includes(txt)); dash = 1; }
      if (!m) return;
      const a = relMark(m), b = rel(leaf);
      P.push([curveV(a.x + a.w / 2, a.y + a.h + 2, b.x + b.w / 2, b.y),
        PAL[i % PAL.length], dash ? 1.4 : 2.2, dash ? .55 : .95, dash]);
    });
    /* คำหลัก → ป้ายหมวด */
    map.querySelectorAll('.catnode').forEach(el => {
      const b = rel(el);
      P.push([curveV(hb.x + Math.min(hb.w / 2, 90), hb.y + hb.h, b.x + Math.min(b.w / 2, 40), b.y), ccol(+el.dataset.c), 2, .8]);
    });
  }
  /* ป้ายหมวด → กิ่งของหมวดนั้น */
  map.querySelectorAll('.catrow').forEach(row => {
    const node = row.querySelector('.catnode'); if (!node) return;
    const a = rel(node);
    row.querySelectorAll('.bnode').forEach(bn => {
      const b = rel(bn);
      /* จอกว้างกิ่งอยู่ขวาของป้ายหมวด ลากเส้นแนวนอน · จอแคบกิ่งตกลงมาอยู่ใต้ป้าย ต้องลากแนวตั้งแทน
         ไม่งั้นเส้นจะกวาดอ้อมไปข้างหลังป้ายหมวด ดูรก */
      const below = b.y > a.y + a.h - 4;
      P.push([below ? curveV(a.x + 22, a.y + a.h, b.x + 16, b.y)
                    : curveH(a.x + a.w, a.y + a.h / 2, b.x, b.y + Math.min(b.h / 2, 16)),
        ccol(+node.dataset.c), 1.6, .75]);
    });
  });

  svg.setAttribute('viewBox', `0 0 ${map.clientWidth} ${map.clientHeight}`);
  svg.innerHTML = P.map(([d, c, w, o, dash], i) =>
    `<path class="lk${dash ? ' dash' : ''}" d="${d}" stroke="${c}" stroke-width="${w}" opacity="${o}"`
    + ` style="animation-delay:${(i * .035).toFixed(2)}s"/>`).join('');
  svg.querySelectorAll('path').forEach(q => {
    const L = q.getTotalLength().toFixed(0);
    if (q.classList.contains('dash')) { q.style.strokeDasharray = '4 5'; q.style.animation = 'none'; }
    else q.style.setProperty('--len', L);
  });

  const sc = document.querySelector('.scene'), md = document.querySelector('.modal');
  sc.style.height = innerWidth > 900 ? Math.max(500, md.offsetHeight + 52) + 'px' : '';
}

function go(t) { if (N[t]) { cur = t; render(t); } }
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
  const s = e.target.closest('[data-sp]'); if (s) return go(s.dataset.sp);
});
document.getElementById('tog').onclick = () => {
  const r = document.documentElement;
  const now = r.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.dataset.theme = now === 'dark' ? 'light' : 'dark';
};
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => cur && render(cur), 160); });
document.getElementById('foot').innerHTML =
  'คำ วลี และกิ่งทุกอันในหน้านี้ดึงมาจากคลังจริง · ตัวเลขที่ทำให้ต้องมีระบบนี้ — '
  + `<b>${F.crossOld}</b> คำในคลังเดิมถูกแตกเป็น ${F.dupRows} แถวเพราะคำหนึ่งอยู่ได้หมวดเดียว · `
  + `<b>${F.overlap}</b> คำมีอยู่ทั้งสองคลัง · <b>${F.multiCat}</b> คำในคลังชุดใหม่เกาะกิ่งข้ามหมวด`;
go(D.seeds[0]);
</script>
'''
body = BODY.replace('__FONTS__', FONTCSS).replace('__DATA__', DATA)
full = ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<title>{TITLE}</title>\n</head>\n<body>\n{body}\n</body>\n</html>\n')
open(p('docs/word-web-mockup.html'), 'w', encoding='utf-8').write(full)
open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/word-web-mockup-page.html', 'w',
     encoding='utf-8').write(f'<title>{TITLE}</title>\n{body}\n')
print(f"OK · docs/word-web-mockup.html · {len(NODES)} คำ · {len(full)/1024:.0f} KB")
