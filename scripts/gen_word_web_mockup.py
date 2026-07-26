#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างม็อคอัพ "หน้าต่างคำแบบใยแมงมุม" → docs/word-web-mockup.html

พี่กันสั่ง 26 ก.ค. 2569 ตอบข้อ 1 ของเรื่องระบบโยงว่า "ทำมอคอัพมาก่อน"
และตอบข้อ 2 ว่า "เอา" (ให้มีทางกลับ = กดวลีใหญ่แล้วเห็นลูกทุกตัว)

🔑 หลักของไฟล์นี้: ข้อมูลในม็อคอัพ **ดึงจากไฟล์คลังจริงทั้งหมด ไม่แต่งขึ้นเอง**
   - docs/newwords-branches.json  = คลังคำชุดใหม่ 1,891 คำ (คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ)
   - docs/library-export.json     = คลังคำเดิม 680 คำ (สแนปช็อตจากฐานข้อมูล)
   ทำให้พิสูจน์ได้ด้วยสคริปต์ว่าทุกคำ/วลี/กิ่งที่โชว์ตรงกับของจริงเป๊ะ

วิธีใช้: python3 scripts/gen_word_web_mockup.py
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)

NEW = json.load(open(p('docs/newwords-branches.json'), encoding='utf-8'))
OLD = json.load(open(p('docs/library-export.json'), encoding='utf-8'))['words']

CAT = {c['id']: c for c in NEW['categories']}
W = {w['text']: w for w in NEW['words']}

# คำในคลังเดิม (ข้อความเดียวกันอาจมีหลายแถว เพราะระบบเดิมให้คำอยู่ได้หมวดเดียว)
OLDBY = collections.defaultdict(list)
for o in OLD:
    OLDBY[o['text']].append(o)
# หมวดของคลังเดิมใช้รหัสชุดเดียวกัน (c0 = หมวด 1) แต่ชื่อกิ่งเป็นของโครงเก่า
OLD_CAT_NO = {f'c{i}': i + 1 for i in range(15)}


def parents(w):
    """วลีแม่ทั้งหมดของคำหนึ่ง — ตัดซ้ำ (เคยมี 11 คำที่วลีเดิมโผล่ทั้ง source และ picked_from)"""
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

# ---------- เลือกชุดตัวอย่าง (คำตั้งต้น + เดินออกไป 2 ขั้น) ----------
SEEDS = [
    'เล็ดลอด',                                                   # แตกจาก 2 วลีคนละความหมาย + อยู่ 2 หมวด
    'อรุณรุ่งที่ท้องฟ้ามืดครึ้มเป็นสีตะกั่วชวนมัวหมองหดหู่',       # วลีแม่ที่แตกออกเป็น 7 คำ (ทางกลับ)
    'ล้มระเนระนาด',                                              # เคสรวม 2 คลัง — คลังเดิมแตกเป็น 2 แถวเพราะข้ามหมวดไม่ได้
    'สะพรึง',                                                     # เก็บมาเอง ไม่ได้แตกมาจากวลีไหน
    'วังเวง', 'หนาวสะท้าน', 'วางมาด', 'บิดเบี้ยว', 'แกรกๆ',
]

seen, frontier = set(), list(SEEDS)
for _ in range(3):                       # เดินออก 3 ขั้น ให้กดวนได้ไม่ตัน
    nxt = []
    for t in frontier:
        if t in seen or t not in W:
            continue
        seen.add(t)
        nxt += parents(W[t]) + KIDS.get(t, [])
    frontier = nxt
# เก็บพี่น้อง (ลูกตัวอื่นของวลีแม่เดียวกัน) ให้ครบ เพื่อไม่ให้กดแล้วเจอลิงก์ตาย
for t in list(seen):
    for par in parents(W.get(t, {'source': None, 'text': t})) if t in W else []:
        for sib in KIDS.get(par, []):
            seen.add(sib)
        seen.add(par)
seen = {t for t in seen if t in W}

NODES = {}
for t in sorted(seen):
    w = W[t]
    paths = []
    for a in (w.get('all_paths') or []):
        c = CAT[a['category_id']]
        paths.append({'no': c['no'], 'cat': c['name_th'], 'path': a['path']})
    node = {
        'kind': w.get('kind') or 'word',
        'meaning': w.get('meaning') or '',
        'novels': [w['novel']] if w.get('novel') else [],
        'paths': paths,
        'parents': [s for s in parents(w) if s in seen],
        'kids': [k for k in KIDS.get(t, []) if k in seen],
        'line': w.get('line'),
        'note': w.get('owner_note') or '',
        'loan': w.get('loanword_en') or '',
        'own': bool(w.get('by_owner')),
    }
    # ถ้าคำนี้มีอยู่ในคลังเดิมด้วย = ตอนรวม 2 คลังจะชนกัน
    if t in OLDBY:
        node['old'] = [{'no': OLD_CAT_NO.get(o['category_id'], 0),
                        'path': o.get('subpath') or '',
                        'novel': o.get('novel') or 'ไม่ระบุเรื่อง'} for o in OLDBY[t]]
        for o in node['old']:
            if o['novel'] not in node['novels']:
                node['novels'].append(o['novel'])
    NODES[t] = node

# ---------- ตัวเลขจริงไว้โชว์ในการ์ด "ทำไมต้องมีระบบนี้" ----------
oldc = collections.Counter(o['text'] for o in OLD)
dup_old = [t for t, n in oldc.items() if n > 1]
cross_old = sum(1 for t in dup_old if len({o['category_id'] for o in OLDBY[t]}) > 1)
overlap = sum(1 for t in W if t in OLDBY)
multi_parent = sum(1 for w in NEW['words'] if len(parents(w)) > 1)
multi_cat = sum(1 for w in NEW['words']
                if len({a['category_id'] for a in (w.get('all_paths') or [])}) > 1)

FACTS = {
    'oldRows': len(OLD), 'dupOld': len(dup_old), 'dupRows': sum(oldc[t] for t in dup_old),
    'crossOld': cross_old, 'overlap': overlap,
    'newWords': len(NEW['words']), 'multiParent': multi_parent, 'multiCat': multi_cat,
    'branches': len(NEW['branches']), 'cats': len(NEW['categories']),
}

DATA = json.dumps({'nodes': NODES, 'seeds': SEEDS, 'facts': FACTS}, ensure_ascii=False, separators=(',', ':'))

TITLE = 'ม็อคอัพ · หน้าต่างคำแบบใยแมงมุม'

BODY = '''<style>
:root{
  --bg:#f3ead6; --panel:#f7f0e0; --surface:#fffdf6; --ink:#33291f; --ink2:#5c5044;
  --dim:#8a7d6d; --line:#e0d0ac; --line2:#e6dabf; --accent:#9c3b2b; --primary:#8f6b4a;
  --chip:#f0e8d4; --chipb:#e4d8bd; --ok:#5a7040; --okbg:#e9efe1; --okb:#cbdcb8;
  --warn:#8a6a1f; --warnbg:#f6edd4; --warnb:#e3d2a2;
}
@media (prefers-color-scheme:dark){:root{
  --bg:#221c17; --panel:#2b241d; --surface:#332b23; --ink:#f0e6d4; --ink2:#d8ccb6;
  --dim:#a99a84; --line:#4a3f33; --line2:#443a2f; --accent:#e08b74; --primary:#c9a077;
  --chip:#3a3128; --chipb:#4d4234; --ok:#a9c78a; --okbg:#2f3a29; --okb:#4b5c40;
  --warn:#dcc07a; --warnbg:#3a3324; --warnb:#5a4e33;
}}
:root[data-theme=dark]{
  --bg:#221c17; --panel:#2b241d; --surface:#332b23; --ink:#f0e6d4; --ink2:#d8ccb6;
  --dim:#a99a84; --line:#4a3f33; --line2:#443a2f; --accent:#e08b74; --primary:#c9a077;
  --chip:#3a3128; --chipb:#4d4234; --ok:#a9c78a; --okbg:#2f3a29; --okb:#4b5c40;
  --warn:#dcc07a; --warnbg:#3a3324; --warnb:#5a4e33;
}
:root[data-theme=light]{
  --bg:#f3ead6; --panel:#f7f0e0; --surface:#fffdf6; --ink:#33291f; --ink2:#5c5044;
  --dim:#8a7d6d; --line:#e0d0ac; --line2:#e6dabf; --accent:#9c3b2b; --primary:#8f6b4a;
  --chip:#f0e8d4; --chipb:#e4d8bd; --ok:#5a7040; --okbg:#e9efe1; --okb:#cbdcb8;
  --warn:#8a6a1f; --warnbg:#f6edd4; --warnb:#e3d2a2;
}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:"Sarabun","Leelawadee UI","Noto Sans Thai",system-ui,sans-serif;
  font-size:16px;line-height:1.75;-webkit-text-size-adjust:100%}
.wrap{max-width:840px;margin:0 auto;padding:14px 12px 90px}
@media(min-width:1000px){.wrap{max-width:1120px;padding:26px 22px 90px}
  body{font-size:16.5px}}
h1{font-family:Georgia,"Trirong",serif;font-size:clamp(21px,5.2vw,29px);color:var(--accent);
  margin:0 0 4px;font-weight:700;line-height:1.35}
.sub{color:var(--dim);font-size:13px;margin:0 0 14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin:0 0 13px}
.card h2{font-family:Georgia,serif;font-size:17px;margin:0 0 9px;color:var(--accent);font-weight:700}
.mini{font-size:12.5px;color:var(--dim);line-height:1.7}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px;margin-top:9px}
.fact{background:var(--surface);border:1px solid var(--line2);border-radius:10px;padding:9px 10px}
.fact b{display:block;font-size:20px;color:var(--accent);font-family:Georgia,serif;line-height:1.25;
  font-variant-numeric:tabular-nums}
.fact span{font-size:11.5px;color:var(--dim);display:block;margin-top:1px}
.pickrow{display:flex;gap:7px;flex-wrap:wrap;margin-top:4px}
.pick{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:7px 13px;
  font-size:13.5px;color:var(--ink2);cursor:pointer;font-family:inherit;line-height:1.4;text-align:left}
.pick.on{background:var(--accent);border-color:var(--accent);color:#fff8ee;font-weight:600}
.pick small{display:block;font-size:11px;opacity:.72;font-weight:400}

/* ---------- หน้าต่างคำ ---------- */
.win{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;
  box-shadow:0 6px 22px rgba(58,47,40,.09)}
.wintop{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line);
  background:var(--surface);position:sticky;top:0;z-index:5}
.back{border:1px solid var(--line);background:var(--panel);color:var(--ink2);border-radius:9px;
  padding:5px 11px;font-size:13px;cursor:pointer;font-family:inherit;flex:none}
.back[disabled]{opacity:.32;cursor:default}
.crumb{font-size:11.5px;color:var(--dim);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.winbody{padding:14px 13px 16px}
.hd{font-family:Georgia,"Trirong",serif;font-size:clamp(21px,5.6vw,28px);font-weight:700;
  line-height:1.5;margin:0 0 6px;word-break:break-word}
.badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.bd{font-size:11.5px;padding:2px 9px;border-radius:20px;background:var(--chip);
  border:1px solid var(--chipb);color:var(--ink2)}
.bd.g{background:var(--okbg);border-color:var(--okb);color:var(--ok)}
.bd.w{background:var(--warnbg);border-color:var(--warnb);color:var(--warn)}
.mean{background:var(--surface);border-left:3px solid var(--primary);border-radius:0 9px 9px 0;
  padding:8px 11px;font-size:14px;color:var(--ink2);margin-bottom:13px}

.sec{margin-top:15px}
.sech{display:flex;align-items:baseline;gap:7px;font-size:14px;font-weight:700;color:var(--accent);
  margin-bottom:7px;border-bottom:1px dashed var(--line);padding-bottom:5px}
.sech em{font-style:normal;font-size:11.5px;color:var(--dim);font-weight:400}
.empty{background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:10px 12px;
  font-size:13.5px;color:var(--dim)}

.pcard{background:var(--surface);border:1px solid var(--line2);border-left:3px solid var(--primary);
  border-radius:0 11px 11px 0;padding:10px 12px;margin-bottom:8px;cursor:pointer}
.pcard:active{background:var(--chip)}
.ptxt{font-family:Georgia,"Trirong",serif;font-size:16.5px;line-height:1.8;color:var(--ink);word-break:break-word}
.pgo{font-size:11.5px;color:var(--dim);margin-top:4px}
mark{background:#f6e08a;color:#3a2d16;border-radius:4px;padding:0 2px;font-weight:700}
:root[data-theme=dark] mark,
@media (prefers-color-scheme:dark){mark{color:#241d10}}

.kidrow{display:flex;gap:7px;flex-wrap:wrap}
.kid{border-radius:20px;padding:5px 12px;font-size:14px;cursor:pointer;color:#fff8ee;
  font-family:Georgia,"Trirong",serif;border:none;line-height:1.5}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--chip);border:1px solid var(--chipb);
  border-radius:20px;padding:4px 11px;font-size:13px;color:var(--ink2);margin:0 6px 6px 0}
.brow{background:var(--surface);border:1px solid var(--line2);border-radius:11px;padding:9px 11px;margin-bottom:7px;
  display:flex;gap:9px;align-items:flex-start}
.cno{flex:none;font-size:11px;font-weight:700;border-radius:8px;padding:3px 8px;color:#fff8ee;white-space:nowrap;line-height:1.6}
.bpath{font-size:14px;color:var(--ink);word-break:break-word;line-height:1.65}
.bcat{font-size:11.5px;color:var(--dim);display:block;margin-top:1px}

.cmp{display:grid;grid-template-columns:1fr;gap:9px;margin-top:8px}
@media(min-width:640px){.cmp{grid-template-columns:1fr 1fr}}
.cmpb{border-radius:12px;padding:11px 12px;border:1px solid var(--line2);background:var(--surface)}
.cmpb h3{margin:0 0 7px;font-size:13.5px;font-family:Georgia,serif}
.cmpb.bad h3{color:#a3563f}
.cmpb.good h3{color:var(--ok)}
.cmpb ul{margin:0;padding-left:17px;font-size:13px;color:var(--ink2);line-height:1.85}
.tog{position:fixed;right:11px;bottom:11px;border:1px solid var(--line);background:var(--panel);
  color:var(--ink2);border-radius:22px;padding:8px 14px;font-size:12.5px;cursor:pointer;
  font-family:inherit;box-shadow:0 3px 12px rgba(0,0,0,.13);z-index:20}
.note{font-size:12.5px;color:var(--warn);background:var(--warnbg);border:1px solid var(--warnb);
  border-radius:9px;padding:7px 10px;margin-top:9px}
/* จอคอมพิวเตอร์ — แบ่งหน้าต่างคำเป็นสองคอลัมน์ ให้อ่านครบในหน้าเดียวไม่ต้องเลื่อนยาว */
.cols{display:grid;grid-template-columns:1fr;gap:0}
@media(min-width:1000px){
  .cols{grid-template-columns:1fr 1fr;gap:0 26px;align-items:start}
  .cols>div>.sec:first-child{margin-top:6px}
  .hd{font-size:31px}
  .winbody{padding:18px 20px 22px}
}
</style>

<div class="wrap">
  <h1>ม็อคอัพ · หน้าต่างคำแบบใยแมงมุม</h1>
  <p class="sub">ภาพร่างหน้าจอ ยังไม่ใช่ของจริง — คำ วลี และกิ่งทุกอันในหน้านี้ดึงมาจากคลังจริงทั้งหมด</p>

  <div class="card">
    <h2>ทำไมต้องมีระบบนี้</h2>
    <div class="mini" id="why"></div>
    <div class="facts" id="facts"></div>
  </div>

  <div class="card">
    <h2>เลือกตัวอย่างที่จะดู</h2>
    <div class="pickrow" id="picks"></div>
  </div>

  <div class="win">
    <div class="wintop">
      <button class="back" id="back">‹ ย้อนกลับ</button>
      <div class="crumb" id="crumb"></div>
    </div>
    <div class="winbody" id="body"></div>
  </div>

  <p class="mini" style="margin-top:13px">กดวลีแม่หรือคำลูกในหน้าต่างเพื่อเดินไปตามเส้นใย — เดินได้ทั้งขาไปและขากลับ</p>
</div>
<button class="tog" id="tog">สลับโหมดสว่าง/มืด</button>

<script>
const D = __DATA__;
const N = D.nodes, F = D.facts;
const PAL = ['#8f6b4a','#5f7f92','#a86a79','#6f8a56','#7c6a99','#3f7d6c'];
const CATCOL = ['#6f8a56','#a86a79','#8f6b4a','#5f7f92','#7c6a99','#3f7d6c','#94733c','#4f6f85',
                '#7a6a4f','#9c6b3b','#8a5c72','#5c7a5c','#6b6a92','#8a6a3f','#7d5f4a'];
const catCol = n => CATCOL[(n-1) % CATCOL.length];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* การ์ด "ทำไมต้องมีระบบนี้" — ตัวเลขทั้งหมดนับจากไฟล์คลังจริง */
document.getElementById('why').innerHTML =
  'ตอนนี้เว็บเก็บ "ความเกี่ยวข้อง" เป็นข้อความก๊อปไว้ในตัวคำเอง ไม่ใช่เส้นเชื่อมที่มีตัวตน ผลคือ<br>'
  + '<b>๑</b> คำหนึ่งอยู่ได้หมวดเดียว พอคำสื่อสองหมวดต้องแตกเป็นคำซ้ำสองแถว<br>'
  + '<b>๒</b> ตอนกดบันทึกเข้าคลัง ข้อมูลว่าคำนี้ตัดมาจากประโยคไหนหายทันที เพราะตารางคลังคำไม่มีช่องเก็บ<br>'
  + '<b>๓</b> ตอนเอาคลังเดิมกับคลังชุดใหม่มารวมกัน คำที่ชนกันจะเลือกได้แค่ฝั่งเดียว อีกฝั่งหาย';
document.getElementById('facts').innerHTML = [
  [F.dupOld, 'คำในคลังเดิมถูกแตกเป็น ' + F.dupRows + ' แถว เพราะอยู่ได้หมวดเดียว'],
  [F.overlap, 'คำที่มีทั้งสองคลัง จะชนกันตอนรวม'],
  [F.multiCat, 'คำในคลังชุดใหม่ที่กิ่งอยู่ข้ามหมวด'],
  [F.multiParent, 'คำที่แตกมาจากวลีแม่มากกว่าหนึ่งวลี'],
].map(([n, t]) => '<div class="fact"><b>' + n + '</b><span>' + t + '</span></div>').join('');

/* ปุ่มเลือกตัวอย่าง */
const LABEL = {
  'เล็ดลอด': 'แตกจาก ๒ วลี · อยู่ ๒ หมวด',
  'อรุณรุ่งที่ท้องฟ้ามืดครึ้มเป็นสีตะกั่วชวนมัวหมองหดหู่': 'วลีใหญ่ที่แตกออกเป็น ๗ คำ',
  'ล้มระเนระนาด': 'เคสรวมสองคลัง',
  'สะพรึง': 'เก็บมาเอง ไม่ได้แตกจากไหน',
};
const PICKS = Object.keys(LABEL).filter(t => N[t]);
document.getElementById('picks').innerHTML = PICKS.map(t =>
  '<button class="pick" data-t="' + esc(t) + '">' + esc(t.length > 24 ? t.slice(0, 22) + '…' : t)
  + '<small>' + esc(LABEL[t]) + '</small></button>').join('');

/* ระบายสีคำลูกลงในตัววลีแม่ — แนวเดียวกับที่หน้าตรวจทานใช้อยู่แล้ว */
function paint(sentence, words, single) {
  const hits = [];
  words.forEach((w, i) => {
    let from = 0, at;
    while (w && (at = sentence.indexOf(w, from)) !== -1) { hits.push({ a: at, b: at + w.length, i }); from = at + w.length; }
  });
  hits.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  let out = '', cur = 0; const used = new Set();
  for (const h of hits) {
    if (h.a < cur) continue;                     // คำสั้นที่ซ้อนอยู่ในคำยาว ระบายทับกันไม่ได้
    out += esc(sentence.slice(cur, h.a));
    used.add(h.i);
    const col = single ? null : PAL[h.i % PAL.length];
    out += col
      ? '<span style="background:' + col + '22;border-bottom:2px solid ' + col + ';border-radius:3px;padding:0 1px">' + esc(sentence.slice(h.a, h.b)) + '</span>'
      : '<mark>' + esc(sentence.slice(h.a, h.b)) + '</mark>';
    cur = h.b;
  }
  return { html: out + esc(sentence.slice(cur)), used };
}

const KIND = { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' };
let stack = [];

function render(t) {
  const n = N[t]; if (!n) return;
  const b = [];
  /* กิ่งทั้งหมดของคำนี้ = กิ่งจากคลังชุดใหม่ + กิ่งจากคลังเดิม (ถ้าคำนี้มีอยู่ทั้งสองคลัง) */
  const all = n.paths.map(x => ({ no: x.no, cat: x.cat, path: x.path, from: 'คลังชุดใหม่' }))
    .concat((n.old || []).map(o => ({ no: o.no, cat: '', path: o.path, from: 'คลังเดิม' })));

  /* ---------- หัวคำ ---------- */
  b.push('<div class="hd">' + esc(t) + '</div><div class="badges">');
  b.push('<span class="bd">' + (KIND[n.kind] || 'คำ') + '</span>');
  if (n.parents.length) b.push('<span class="bd g">แตกมาจากวลีอื่น</span>');
  else b.push('<span class="bd">เก็บมาเอง</span>');
  if (all.length > 1) b.push('<span class="bd">อยู่ ' + all.length + ' กิ่ง</span>');
  if (new Set(all.map(x => x.no)).size > 1) b.push('<span class="bd w">ข้ามหมวด</span>');
  if (n.old) b.push('<span class="bd w">มีทั้งสองคลัง</span>');
  if (n.own) b.push('<span class="bd w">เจ้าของคลังพิมพ์เอง</span>');
  if (n.loan) b.push('<span class="bd">คำต้นแบบ ' + esc(n.loan) + '</span>');
  b.push('</div>');
  if (n.meaning) b.push('<div class="mean">' + esc(n.meaning) + '</div>');
  b.push('<div class="cols"><div>');

  /* ---------- ๑ แตกมาจาก ---------- */
  b.push('<div class="sec"><div class="sech">🔗 แตกมาจาก <em>' + (n.parents.length ? n.parents.length + ' วลี · กดเพื่อไปดูวลีเต็ม' : 'ไม่มี') + '</em></div>');
  if (!n.parents.length) {
    b.push('<div class="empty">เก็บมาเอง ไม่ได้แตกมาจากวลีไหน'
      + (n.line ? ' · เก็บไว้ที่บรรทัด ' + n.line + ' ของคลัง' : '') + '</div>');
  } else {
    n.parents.forEach(pt => {
      b.push('<div class="pcard" data-go="' + esc(pt) + '"><div class="ptxt">' + paint(pt, [t], true).html
        + '</div><div class="pgo">กดเพื่อเปิดวลีนี้ ›</div></div>');
    });
  }
  b.push('</div>');

  /* ---------- ๒ แตกออกเป็น (ทางกลับ) ---------- */
  b.push('<div class="sec"><div class="sech">✂ แตกออกเป็น <em>' + (n.kids.length ? n.kids.length + ' คำ' : 'ยังไม่มี') + '</em></div>');
  if (!n.kids.length) {
    b.push('<div class="empty">ยังไม่มีคำไหนถูกแตกออกมาจากคำนี้</div>');
  } else {
    const pt = paint(t, n.kids, false);
    b.push('<div class="pcard" style="cursor:default"><div class="ptxt">' + pt.html + '</div></div>');
    b.push('<div class="kidrow">' + n.kids.map((k, i) =>
      '<button class="kid" data-go="' + esc(k) + '" style="background:' + PAL[i % PAL.length]
      + (pt.used.has(i) ? '' : ';opacity:.66') + '">' + esc(k) + '</button>').join('') + '</div>');
    const nest = n.kids.filter((k, i) => !pt.used.has(i));
    if (nest.length) b.push('<div class="note" style="color:var(--dim);background:var(--surface);border-color:var(--line2)">'
      + 'คำที่จางลงคือคำที่ซ้อนอยู่ในคำลูกตัวอื่น จึงระบายสีทับกันในวลีไม่ได้ ('
      + nest.map(esc).join(' · ') + ') — ยังนับเป็นคำลูกเต็มตัวเหมือนกัน</div>');
  }
  b.push('</div></div><div>');

  /* ---------- ๓ เจอในเรื่อง ---------- */
  b.push('<div class="sec"><div class="sech">📚 เจอในเรื่อง <em>' + n.novels.length + ' เรื่อง</em></div>');
  b.push(n.novels.map(v => '<span class="chip">📖 ' + esc(v) + '</span>').join('') || '<div class="empty">ยังไม่ระบุเรื่อง</div>');
  b.push('</div>');

  /* ---------- ๔ อยู่กิ่ง ---------- */
  b.push('<div class="sec"><div class="sech">🌿 อยู่กิ่ง <em>' + all.length + ' กิ่ง · '
    + new Set(all.map(x => x.no)).size + ' หมวด</em></div>');
  all.forEach(x => {
    b.push('<div class="brow"><span class="cno" style="background:' + catCol(x.no) + '">หมวด ' + x.no + '</span>'
      + '<span class="bpath">' + esc(x.path)
      + '<span class="bcat">' + (x.cat ? esc(x.cat) + ' · ' : '') + x.from + '</span></span></div>');
  });
  b.push('</div>');

  /* ---------- เคสรวมสองคลัง ---------- */
  if (n.old) {
    const oldCats = new Set(n.old.map(o => o.no)), newCats = new Set(n.paths.map(x => x.no));
    b.push('<div class="sec"><div class="sech">🧩 ตอนเอาสองคลังมารวมกัน <em>คำนี้มีอยู่ทั้งสองคลัง</em></div>');
    b.push('<div class="cmp">'
      + '<div class="cmpb bad"><h3>ระบบตอนนี้</h3><ul>'
      + '<li>คลังเดิมเก็บเป็น ' + n.old.length + ' แถวแยกกัน เพราะคำหนึ่งอยู่ได้หมวดเดียว ('
      + [...oldCats].map(x => 'หมวด ' + x).join(' · ') + ')</li>'
      + '<li>คลังชุดใหม่อีก 1 แถว ' + n.paths.length + ' กิ่ง</li>'
      + '<li>ตอนรวมต้องเลือกฝั่งเดียว หรือปล่อยให้ซ้ำกันต่อไป</li></ul></div>'
      + '<div class="cmpb good"><h3>ถ้ามีระบบโยง</h3><ul>'
      + '<li>เหลือคำเดียว</li>'
      + '<li>ติดครบ ' + all.length + ' กิ่ง ข้าม ' + new Set([...oldCats, ...newCats]).size + ' หมวด</li>'
      + '<li>เก็บได้ทั้ง ' + n.novels.length + ' เรื่อง ไม่ต้องทิ้งฝั่งไหน</li></ul></div></div>');
    b.push('</div>');
  }
  if (n.note) b.push('<div class="note">📝 หมายเหตุที่เจ้าของคลังเขียนไว้: ' + esc(n.note) + '</div>');
  b.push('</div></div>');

  document.getElementById('body').innerHTML = b.join('');
  document.getElementById('crumb').textContent = stack.length
    ? stack.slice(-3).map(x => x.length > 12 ? x.slice(0, 11) + '…' : x).join(' › ') + ' › ' + (t.length > 12 ? t.slice(0, 11) + '…' : t)
    : t;
  document.getElementById('back').disabled = !stack.length;
  document.querySelectorAll('.pick').forEach(el => el.classList.toggle('on', el.dataset.t === t));
  window.scrollTo({ top: document.querySelector('.win').offsetTop - 8, behavior: 'smooth' });
}

function go(t, push) {
  if (!N[t]) return;
  if (push && cur) stack.push(cur);
  cur = t; render(t);
}
let cur = null;

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { go(g.dataset.go, true); return; }
  const p = e.target.closest('.pick');
  if (p) { stack = []; go(p.dataset.t, false); return; }
});
document.getElementById('back').onclick = () => { const t = stack.pop(); if (t) { cur = t; render(t); } };
document.getElementById('tog').onclick = () => {
  const r = document.documentElement;
  const now = r.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.dataset.theme = now === 'dark' ? 'light' : 'dark';
};
go(PICKS[0], false);
</script>
'''

body = BODY.replace('__DATA__', DATA)

# ๑ ไฟล์ในเรพ = เอกสารเต็มเปิดตรงได้ (กฎโปรเจกต์: Artifact ทุกชิ้นต้องเซฟลงเรพเป็นไฟล์ standalone)
full = ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<title>{TITLE}</title>\n</head>\n<body>\n{body}\n</body>\n</html>\n')
open(p('docs/word-web-mockup.html'), 'w', encoding='utf-8').write(full)

# ๒ ฉบับสำหรับหน้าเว็บที่พี่กันเปิดอ่าน — ตัวระบบครอบ doctype/head/body ให้เอง จึงส่งเฉพาะเนื้อใน
#    เขียนนอกเรพ (ไม่ให้ไฟล์ชั่วคราวไปโผล่ใน git) · ระบุที่เก็บเองได้ทาง argv
import sys
frag = sys.argv[1] if len(sys.argv) > 1 else '/tmp/word-web-mockup-page.html'
open(frag, 'w', encoding='utf-8').write(f'<title>{TITLE}</title>\n{body}\n')

out = full
print(f"OK · เขียน docs/word-web-mockup.html · {len(NODES)} คำในม็อคอัพ · {len(out)/1024:.0f} KB")
print(f"   ตัวเลขจริง: คลังเดิม {FACTS['oldRows']} แถว · ซ้ำเพราะข้ามหมวดไม่ได้ {FACTS['crossOld']} คำ ({FACTS['dupRows']} แถว)")
print(f"   คำที่มีทั้งสองคลัง {FACTS['overlap']} · คำกิ่งข้ามหมวด {FACTS['multiCat']} · คำแตกจากหลายวลี {FACTS['multiParent']}")
