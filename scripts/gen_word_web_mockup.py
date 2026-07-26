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
/* สีชุดเดียวกับเว็บจริง (components/pages/modals.jsx) เพื่อให้ภาพตรงกับของที่ทำไว้แล้ว */
:root{
  --panel:#f7f0e0; --surface:#fffdf6; --line:#e0d0ac; --line2:#e6dabf; --page:#efe6d2;
  --ink:#33291f; --ink2:#5c5044; --dim:#8a7d6d; --faint:#b0a184;
  --accent:#9c3b2b; --primary:#6f4e37;
  --chip:#f0e8d4; --chipb:#e4d8bd; --chipink:#7a6a4f;
  --newbg:#e9efe1; --newb:#cbdcb8; --newink:#5a7040;
}
@media (prefers-color-scheme:dark){:root{
  --panel:#241d16; --surface:#2c241b; --line:#463a2a; --line2:#3d3325; --page:#1a1510;
  --ink:#efe3cd; --ink2:#cdbfa6; --dim:#9d8e77; --faint:#6f6353;
  --accent:#e08c74; --primary:#c69a6d;
  --chip:#332b21; --chipb:#453a2c; --chipink:#c3b393;
  --newbg:#2b3527; --newb:#465239; --newink:#a6c48c;
}}
:root[data-theme=dark]{
  --panel:#241d16; --surface:#2c241b; --line:#463a2a; --line2:#3d3325; --page:#1a1510;
  --ink:#efe3cd; --ink2:#cdbfa6; --dim:#9d8e77; --faint:#6f6353;
  --accent:#e08c74; --primary:#c69a6d;
  --chip:#332b21; --chipb:#453a2c; --chipink:#c3b393;
  --newbg:#2b3527; --newb:#465239; --newink:#a6c48c;
}
:root[data-theme=light]{
  --panel:#f7f0e0; --surface:#fffdf6; --line:#e0d0ac; --line2:#e6dabf; --page:#efe6d2;
  --ink:#33291f; --ink2:#5c5044; --dim:#8a7d6d; --faint:#b0a184;
  --accent:#9c3b2b; --primary:#6f4e37;
  --chip:#f0e8d4; --chipb:#e4d8bd; --chipink:#7a6a4f;
  --newbg:#e9efe1; --newb:#cbdcb8; --newink:#5a7040;
}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
body{margin:0;background:var(--page);color:var(--ink);font-family:'Trirong',Georgia,serif;
  font-size:16px;line-height:1.75;-webkit-text-size-adjust:100%}

.head{max-width:1120px;margin:0 auto;padding:22px 18px 0;display:flex;align-items:flex-end;
  gap:14px;flex-wrap:wrap}
.head h1{font-size:19px;font-weight:600;margin:0;color:var(--ink)}
.head p{margin:0;color:var(--dim);font-size:13.5px;flex:1;min-width:200px}
.head button{border:none;background:none;color:var(--dim);font-family:inherit;font-size:12.5px;
  cursor:pointer;border-bottom:1px solid var(--line);padding:0}
.head button:hover{color:var(--accent)}
.pick{max-width:1120px;margin:12px auto 0;padding:0 18px;display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.pick b{font-size:12.5px;color:var(--dim);font-weight:400}
.pick button{border:none;background:none;font-family:inherit;font-size:14.5px;color:var(--ink2);
  cursor:pointer;padding:2px 0;border-bottom:1.5px solid transparent}
.pick button[aria-pressed=true]{color:var(--accent);border-bottom-color:var(--accent)}

/* ── ฉากหลัง: หน้าคลังคำที่ป๊อปอัปเด้งทับ ── */
.scene{position:relative;max-width:1120px;margin:16px auto 0;padding:18px;min-height:520px;
  background:var(--page);border:1px solid var(--line2);border-radius:14px;overflow:hidden}
.behind{filter:blur(1.4px);opacity:.5;pointer-events:none;user-select:none}
.behind h4{margin:0 0 8px;font-size:14px;color:var(--dim);font-weight:400}
.bgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:7px}
.bcard{background:var(--surface);border:1px solid var(--line2);border-left:3px solid var(--faint);
  border-radius:9px;padding:8px 9px;font-size:14px;color:var(--ink2);min-height:42px}
.veil{position:absolute;inset:0;background:rgba(58,47,40,.34);backdrop-filter:blur(2px)}
:root[data-theme=dark] .veil{background:rgba(10,7,4,.55)}

/* ── ป๊อปอัป (แนวนอน) ── */
.modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1000px,calc(100% - 30px));
  background:var(--panel);border:1px solid var(--line);border-radius:16px;
  box-shadow:0 20px 60px rgba(58,47,40,.3);display:grid;grid-template-columns:1.15fr .85fr;
  overflow:hidden;animation:pop .22s ease}
@keyframes pop{from{opacity:0;transform:translate(-50%,-48%)}to{opacity:1;transform:translate(-50%,-50%)}}
@media(max-width:820px){
  .modal{grid-template-columns:1fr;position:static;transform:none;width:auto;animation:none}
  .scene{min-height:0;padding:10px;height:auto!important}
  .behind,.veil{display:none}
}
.side{padding:20px 22px 22px}
.side+.side{border-left:1px solid var(--line)}
@media(max-width:820px){.side+.side{border-left:none;border-top:1px solid var(--line)}}
.cap{font-size:11.5px;letter-spacing:.16em;color:var(--dim);margin:0 0 12px}

/* คำหลักในป๊อปอัป */
.word{font-size:clamp(21px,2.3vw,27px);font-weight:700;line-height:1.5;margin:0 0 3px;color:var(--ink);
  word-break:break-word}
.wsub{font-size:12.5px;color:var(--dim);margin:0 0 16px}

/* ── ต้นไม้เส้นโยง: สันตั้งเส้นเดียว + ซี่นอน ── */
.tree{position:relative;padding-left:19px;margin-top:4px}
.spine{position:absolute;left:0;width:1px;background:var(--line);top:0;height:0}
.rib{position:relative;padding:0 0 14px}
.rib::before{content:'';position:absolute;left:-19px;top:11px;width:14px;height:1px;background:var(--line)}
.rib::after{content:'';position:absolute;left:-21.5px;top:9px;width:5px;height:5px;border-radius:50%;
  background:var(--panel);border:1px solid var(--line)}
.rib.cat::after{background:var(--dot);border-color:var(--dot)}
.rlab{font-size:11.5px;color:var(--dim);letter-spacing:.06em;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap}
.rlab b{color:var(--ink2);font-weight:600;font-size:13px}
.rlab .cn{color:var(--dot);font-weight:700;font-size:12.5px}

/* วลีแม่ */
.par{display:block;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line2);
  border-left:3px solid var(--primary);border-radius:0 8px 8px 0;padding:7px 11px;margin:5px 0 0;
  font-family:inherit;font-size:14.5px;line-height:1.65;color:var(--ink);cursor:pointer}
.par:hover{background:var(--chip)}
.par em{font-style:normal;font-weight:700;color:var(--accent);background:rgba(156,59,43,.1);border-radius:3px}
/* คำลูก */
.kids{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.kid{background:var(--chip);border:1px solid var(--chipb);color:var(--chipink);border-radius:20px;
  padding:3px 12px;font-size:14px;font-family:inherit;cursor:pointer;line-height:1.6}
.kid:hover{border-color:var(--primary);color:var(--ink)}
/* กิ่งใต้หมวด */
.branch{display:flex;align-items:flex-start;gap:6px;margin-top:5px;padding-left:13px;position:relative}
.branch::before{content:'';position:absolute;left:1px;top:11px;width:8px;height:1px;background:var(--line2)}
.bp{flex:1;font-size:13.5px;line-height:1.6;color:var(--ink2)}
.bp .src{font-size:11px;color:var(--faint);margin-left:6px}
.x{border:none;background:none;color:var(--faint);cursor:pointer;font-size:12px;line-height:1.5;
  padding:0 3px;font-family:inherit}
.x:hover{color:var(--accent)}
.addb{margin-top:6px;margin-left:13px;font-size:12px;padding:4px 11px;border-radius:20px;
  border:1px dashed var(--line);background:none;color:var(--dim);cursor:pointer;font-family:inherit}
.addb:hover{color:var(--ink2);border-color:var(--primary)}
.addcat{margin-top:4px;font-size:12.5px;border:none;background:none;color:var(--primary);
  cursor:pointer;font-family:inherit;padding:0}

/* ── ฝั่งขวา: ช่องแก้ไขเดิมของเว็บ ── */
label{display:block;font-size:12.5px;font-weight:600;color:var(--ink2);margin:0 0 5px}
.f{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);
  color:var(--ink);font-family:inherit;font-size:15px;outline:none;margin-bottom:12px}
.two{display:flex;gap:10px}
.two>div{flex:1;min-width:0}
select.f{font-size:14px}
.acts{display:flex;align-items:center;gap:9px;margin-top:6px;flex-wrap:wrap}
.acts .sp{flex:1}
.bt{padding:9px 15px;border-radius:9px;font-family:inherit;font-size:14.5px;cursor:pointer}
.del{border:1px solid #e6c3b7;background:#faf1ee;color:var(--accent)}
:root[data-theme=dark] .del{border-color:#5c3a30;background:#33231e}
.can{border:1px solid var(--line);background:transparent;color:var(--ink2)}
.ok{border:none;background:var(--primary);color:#fbf3e2;font-weight:600;padding:9px 22px}

.note{max-width:1120px;margin:16px auto 0;padding:0 18px;color:var(--dim);font-size:13.5px;line-height:1.85}
.note b{color:var(--ink2)}
.foot{max-width:1120px;margin:14px auto 40px;padding:14px 18px 0;border-top:1px solid var(--line2);
  color:var(--faint);font-size:12.5px;line-height:1.8}
</style>

<div class="head">
  <h1>หน้าต่างคำ</h1>
  <p>ภาพร่างป๊อปอัปที่เด้งขึ้นมาตอนกดคำในหน้าคลังคำ — ซ้ายคือเส้นที่โยงอยู่ ขวาคือช่องแก้ไขเดิมของเว็บ</p>
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
      <p class="cap">เส้นที่โยงอยู่</p>
      <h2 class="word" id="w"></h2>
      <p class="wsub" id="ws"></p>
      <div class="tree" id="tree"><span class="spine" id="spine"></span></div>
    </div>
    <div class="side">
      <p class="cap">แก้ไข</p>
      <div id="form"></div>
    </div>
  </div>
</div>

<p class="note" id="note"></p>
<p class="foot" id="foot"></p>

<script>
const D = __DATA__, N = D.nodes, F = D.facts;
const CATCOL = ['#5e7a4a','#9a5a63','#8a6a3c','#4d6c86','#6d5f8c','#3f7a6b','#8a6540','#4a6f7a',
                '#7a6a4a','#96603a','#7e4f66','#557a55','#5f5f8a','#8a6a3a','#6f7a45'];
const col = n => CATCOL[(n - 1) % CATCOL.length];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' };
const CATS = ['1 บรรยากาศ แสง สี และสถานที่', '2 รูปลักษณ์และลักษณะบุคคล', '3 กริยา ท่าทาง และการเคลื่อนไหว',
  '4 เสียง', '5 สภาวะภายใน', '6 คำปรุงแต่งและคำอเนกประสงค์', '15 บทบรรยายและภาพรวมฉาก'];

document.getElementById('bg').innerHTML =
  ['แสงสลัวราง','ม่านหมอก','ฟ้าสาง','เงาทาบ','ลมโชย','ครึ้มฟ้าครึ้มฝน','แดดจ้า','สนธยา','อรุณรุ่ง','มืดตึดตื๋อ','ละอองฝน','แสงเรือง']
    .map(t => `<div class="bcard">${t}</div>`).join('');

let cur = null, stack = [];
document.getElementById('pk').innerHTML = D.seeds.map(t =>
  `<button data-sp="${esc(t)}" aria-pressed="false">${esc(t.length > 26 ? t.slice(0, 24) + '…' : t)}</button>`).join(' ');

function hi(sentence, word) {
  const i = sentence.indexOf(word);
  return i < 0 ? esc(sentence)
    : esc(sentence.slice(0, i)) + '<em>' + esc(word) + '</em>' + esc(sentence.slice(i + word.length));
}

function render(t) {
  const n = N[t];
  document.getElementById('w').textContent = t;
  document.getElementById('ws').innerHTML =
    `${KIND[n.kind] || 'คำ'} · เกาะอยู่ ${n.paths.length} กิ่ง ใน ${new Set(n.paths.map(x => x.no)).size} หมวด`
    + (n.novels.length > 1 ? ` · เจอใน ${n.novels.length} เรื่อง` : '');

  const r = [];
  if (n.parents.length) r.push(`<div class="rib"><div class="rlab"><b>แตกมาจาก</b><span>${n.parents.length} วลี · กดเพื่อเปิดวลีนั้น</span></div>`
    + n.parents.map(pt => `<button class="par" data-go="${esc(pt)}">${hi(pt, t)}</button>`).join('') + '</div>');
  else r.push(`<div class="rib"><div class="rlab"><b>แตกมาจาก</b><span>ไม่ได้แตกมาจากวลีไหน เก็บมาเอง${n.line ? ' · บรรทัดที่ ' + n.line : ''}</span></div></div>`);

  if (n.kids.length) r.push(`<div class="rib"><div class="rlab"><b>แตกออกเป็น</b><span>${n.kids.length} คำ · กดเพื่อเดินต่อ</span></div>`
    + '<div class="kids">' + n.kids.map(k => `<button class="kid" data-go="${esc(k)}">${esc(k)}</button>`).join('') + '</div></div>');

  const byCat = new Map();
  n.paths.forEach(x => { if (!byCat.has(x.no)) byCat.set(x.no, { cat: x.cat, list: [] }); byCat.get(x.no).list.push(x); });
  [...byCat.entries()].forEach(([no, g]) => {
    r.push(`<div class="rib cat" style="--dot:${col(no)}"><div class="rlab"><span class="cn">หมวด ${no}</span><b>${esc(g.cat)}</b></div>`
      + g.list.map(x => `<div class="branch"><span class="bp">${esc(x.path)}`
        + (x.from === 'เดิม' ? '<span class="src">จากคลังเดิม</span>' : '') + '</span><button class="x">✕</button></div>').join('')
      + '<button class="addb">＋ เพิ่มกิ่งในหมวดนี้</button></div>');
  });
  r.push('<div class="rib"><button class="addcat">＋ เพิ่มหมวด</button></div>');

  const tree = document.getElementById('tree');
  tree.innerHTML = '<span class="spine" id="spine"></span>' + r.join('');
  const ribs = tree.querySelectorAll('.rib');
  if (ribs.length) {
    const top = ribs[0].offsetTop + 11, bot = ribs[ribs.length - 1].offsetTop + 11;
    const sp = document.getElementById('spine');
    sp.style.top = top + 'px'; sp.style.height = Math.max(0, bot - top) + 'px';
  }

  document.getElementById('form').innerHTML =
    `<label>คำ / วลี</label><input class="f" value="${esc(t)}">`
    + `<label>ความหมาย (ไม่บังคับ)</label><input class="f" value="${esc(n.meaning)}" placeholder="ยังไม่ได้ใส่">`
    + '<div class="two"><div><label>ชนิด</label><select class="f">'
    + ['word', 'phrase', 'sentence'].map(k => `<option${k === n.kind ? ' selected' : ''}>${KIND[k]}</option>`).join('')
    + '</select></div><div><label>หมวดหลัก</label><select class="f">'
    + CATS.map(c => `<option${+c.split(' ')[0] === n.paths[0].no ? ' selected' : ''}>หมวด ${c}</option>`).join('')
    + '</select></div></div>'
    + '<label>จากเรื่อง</label>'
    + n.novels.map(v => `<input class="f" value="${esc(v)}">`).join('')
    + '<div class="acts"><button class="bt del">ลบคำนี้</button><span class="sp"></span>'
    + '<button class="bt can">ยกเลิก</button><button class="bt ok">บันทึก</button></div>';

  document.getElementById('note').innerHTML = n.paths.some(x => x.from === 'เดิม')
    ? `คำนี้มีอยู่ทั้งสองคลัง — ตอนนี้คลังเดิมเก็บเป็นคนละแถวเพราะระบบให้คำหนึ่งอยู่ได้หมวดเดียว `
      + `ถ้ามีระบบโยง จะเหลือ<b>คำเดียวที่เกาะครบทุกกิ่ง</b> ไม่ต้องทิ้งฝั่งไหน`
    : 'กดวลีด้านบนหรือคำที่แตกออกมา เพื่อเดินไปตามเส้น — เดินได้ทั้งขาไปและขากลับ';
  document.querySelectorAll('[data-sp]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sp === t)));

  /* ฉากหลังต้องสูงพอครอบป๊อปอัป ไม่งั้นป๊อปอัปจะถูกกรอบฉากตัดหาย (เจอตอนเทสรอบแรก) */
  const sc = document.querySelector('.scene'), md = document.querySelector('.modal');
  if (innerWidth > 820) sc.style.height = Math.max(500, md.offsetHeight + 56) + 'px';
  else sc.style.height = '';
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
document.getElementById('foot').innerHTML =
  `คำ วลี และกิ่งทุกอันในหน้านี้ดึงมาจากคลังจริง · ตัวเลขที่ทำให้ต้องมีระบบนี้ — `
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
