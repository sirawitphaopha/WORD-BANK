#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างม็อคอัพ "ใยของคำ" → docs/word-web-mockup.html

พี่กันสั่ง 26 ก.ค. 2569
  รอบแรก: "ทำมอคอัพมาก่อน" + "เอา" (ให้มีทางกลับ กดวลีใหญ่แล้วเห็นลูกทุกตัว)
  รอบสอง: "มันดูมองยากมาก เน้นความเด่นกว่านี้ และมีความโยงกันสวยงามกว่านี้ มีกิ่งไม้
           ให้คิดซะว่าเธอคือนักออกแบบที่เก่งกาจ ไปรีใหม่มา เพราะมันจืดชืดมาก"
  → รื้อใหม่ทั้งหมด จากการ์ดเรียงกันเป็นคอลัมน์ เปลี่ยนเป็น "แผนผังกิ่งไม้วาดหมึก"
    คำอยู่กลางในตราวงกลม แล้วแตกกิ่งจริง ๆ ออกไปหาวลีแม่ คำลูก กิ่งหมวด และนิยาย
    มีใยแมงมุมสีทองสานระหว่างปลายกิ่ง ตรงกับคำสองคำที่พี่กันใช้เอง คือ แมงมุม กับ กิ่งไม้

🔑 ข้อมูลทุกอย่างดึงจากไฟล์คลังจริง ไม่แต่งขึ้นเอง
   docs/newwords-branches.json = คลังคำชุดใหม่ 1,891 คำ (คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ)
   docs/library-export.json    = คลังคำเดิม 680 คำ (สแนปช็อตจากฐานข้อมูล)

🔤 ฟอนต์ฝังในไฟล์เป็น data URI (scripts/fonts/*.woff2 · Trirong + Charmonman · สัญญาอนุญาต OFL)
   เพราะหน้าเว็บที่พี่กันเปิดอ่านดึงฟอนต์จากภายนอกไม่ได้ ถ้าไม่ฝังจะตกไปใช้ฟอนต์ระบบแล้วหน้าตาเพี้ยน

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
OLD_CAT_NO = {f'c{i}': i + 1 for i in range(15)}


def parents(w):
    """วลีแม่ทั้งหมดของคำหนึ่ง — ตัดซ้ำ (11 คำมีวลีเดิมโผล่ทั้งช่อง source และ picked_from)"""
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

SEEDS = [
    'เล็ดลอด',                                                   # แตกจาก 2 วลีคนละความหมาย + อยู่ 2 หมวด
    'อรุณรุ่งที่ท้องฟ้ามืดครึ้มเป็นสีตะกั่วชวนมัวหมองหดหู่',       # วลีแม่ที่แตกออกเป็น 7 คำ (ทางกลับ)
    'ล้มระเนระนาด',                                              # เคสรวม 2 คลัง
    'สะพรึง',                                                     # เก็บมาเอง ไม่ได้แตกมาจากวลีไหน
    'วังเวง', 'หนาวสะท้าน', 'วางมาด', 'บิดเบี้ยว', 'แกรกๆ',
]

seen, frontier = set(), list(SEEDS)
for _ in range(3):
    nxt = []
    for t in frontier:
        if t in seen or t not in W:
            continue
        seen.add(t)
        nxt += parents(W[t]) + KIDS.get(t, [])
    frontier = nxt
for t in list(seen):
    if t not in W:
        continue
    for par in parents(W[t]):
        seen.add(par)
        for sib in KIDS.get(par, []):
            seen.add(sib)
seen = {t for t in seen if t in W}

NODES = {}
for t in sorted(seen):
    w = W[t]
    node = {
        'kind': w.get('kind') or 'word',
        'meaning': w.get('meaning') or '',
        'novels': [w['novel']] if w.get('novel') else [],
        'paths': [{'no': CAT[a['category_id']]['no'], 'cat': CAT[a['category_id']]['name_th'], 'path': a['path']}
                  for a in (w.get('all_paths') or [])],
        'parents': [s for s in parents(w) if s in seen],
        'kids': [k for k in KIDS.get(t, []) if k in seen],
        'line': w.get('line'), 'note': w.get('owner_note') or '',
        'loan': w.get('loanword_en') or '', 'own': bool(w.get('by_owner')),
    }
    if t in OLDBY:
        node['old'] = [{'no': OLD_CAT_NO.get(o['category_id'], 0), 'path': o.get('subpath') or '',
                        'novel': o.get('novel') or 'ไม่ระบุเรื่อง'} for o in OLDBY[t]]
        for o in node['old']:
            if o['novel'] not in node['novels']:
                node['novels'].append(o['novel'])
    NODES[t] = node

oldc = collections.Counter(o['text'] for o in OLD)
dup_old = [t for t, n in oldc.items() if n > 1]
FACTS = {
    'oldRows': len(OLD), 'dupOld': len(dup_old), 'dupRows': sum(oldc[t] for t in dup_old),
    'crossOld': sum(1 for t in dup_old if len({o['category_id'] for o in OLDBY[t]}) > 1),
    'overlap': sum(1 for t in W if t in OLDBY), 'newWords': len(NEW['words']),
    'multiParent': sum(1 for w in NEW['words'] if len(parents(w)) > 1),
    'multiCat': sum(1 for w in NEW['words'] if len({a['category_id'] for a in (w.get('all_paths') or [])}) > 1),
}

DATA = json.dumps({'nodes': NODES, 'facts': FACTS}, ensure_ascii=False, separators=(',', ':'))

# ---------- ฟอนต์ฝังในไฟล์ ----------
FACE = []
for fam, wt, sub, rng in [
    ('Charmonman', 700, 'thai', 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC'),
    ('Charmonman', 700, 'latin', 'U+0000-00FF,U+2000-206F,U+2122,U+2212'),
    ('Trirong', 400, 'thai', 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC'),
    ('Trirong', 400, 'latin', 'U+0000-00FF,U+2000-206F,U+2122,U+2212'),
    ('Trirong', 700, 'thai', 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC'),
    ('Trirong', 700, 'latin', 'U+0000-00FF,U+2000-206F,U+2122,U+2212'),
]:
    fn = p(f'scripts/fonts/{fam}-{wt}-{sub}.woff2')
    b64 = base64.b64encode(open(fn, 'rb').read()).decode()
    FACE.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;"
                "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (fam, wt, b64, rng))
FONTCSS = '\n'.join(FACE)

TITLE = 'ใยของคำ · ม็อคอัพหน้าต่างคำ'

BODY = r'''<style>
__FONTS__

/* ─────────────────────────────────────────────────────────────
   ใยของคำ — แผนผังกิ่งไม้วาดหมึกบนกระดาษต้นฉบับ
   สี: กระดาษเก่า / หมึกซีเปีย / ทองปิด / แดงชาด / เขียวมอสส์
   ตัวอักษร: ไตรรงค์ (เนื้อความ) · ชาญมั่น (หัวเรื่อง ใช้อย่างจำกัด)
   ───────────────────────────────────────────────────────────── */
:root{
  --vellum:#efe3c6; --vellum2:#e6d7b4; --slip:#faf3e0;
  --ink:#2f251c; --ink2:#5a4b3a; --faint:#8d7c62;
  --gold:#b0862e; --gold2:#d8b45c; --blood:#8c2f22; --moss:#4e6b45;
  --rule:#cbb488; --shadow:rgba(58,40,20,.16);
}
@media (prefers-color-scheme:dark){:root{
  --vellum:#17120e; --vellum2:#1f1811; --slip:#241c14;
  --ink:#efe0c0; --ink2:#cbb896; --faint:#9d8b6e;
  --gold:#d9a441; --gold2:#f0cd7e; --blood:#e2917a; --moss:#8fb37e;
  --rule:#4a3c29; --shadow:rgba(0,0,0,.5);
}}
:root[data-theme=dark]{
  --vellum:#17120e; --vellum2:#1f1811; --slip:#241c14;
  --ink:#efe0c0; --ink2:#cbb896; --faint:#9d8b6e;
  --gold:#d9a441; --gold2:#f0cd7e; --blood:#e2917a; --moss:#8fb37e;
  --rule:#4a3c29; --shadow:rgba(0,0,0,.5);
}
:root[data-theme=light]{
  --vellum:#efe3c6; --vellum2:#e6d7b4; --slip:#faf3e0;
  --ink:#2f251c; --ink2:#5a4b3a; --faint:#8d7c62;
  --gold:#b0862e; --gold2:#d8b45c; --blood:#8c2f22; --moss:#4e6b45;
  --rule:#cbb488; --shadow:rgba(58,40,20,.16);
}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--blood);outline-offset:3px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}

body{margin:0;background:var(--vellum);color:var(--ink);
  font-family:'Trirong',Georgia,serif;font-size:17px;line-height:1.8;-webkit-text-size-adjust:100%}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
  background:radial-gradient(circle at 18% 12%,rgba(255,255,255,.35),transparent 46%),
             radial-gradient(circle at 82% 78%,rgba(120,88,40,.13),transparent 52%)}
.page{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:34px 20px 110px}

/* ── หัวเรื่อง ── */
.masthead{text-align:center;margin-bottom:26px}
.eyebrow{font-size:11.5px;letter-spacing:.34em;text-transform:uppercase;color:var(--faint);
  display:flex;align-items:center;gap:14px;justify-content:center;margin-bottom:10px}
.eyebrow::before,.eyebrow::after{content:'';height:1px;width:min(90px,14vw);background:var(--rule)}
@media(max-width:520px){.eyebrow{letter-spacing:.2em;gap:9px}.eyebrow::before,.eyebrow::after{width:22px}}
h1{font-family:'Charmonman',cursive;font-weight:700;font-size:clamp(38px,7vw,68px);
  color:var(--blood);margin:0;line-height:1.15;text-wrap:balance}
.deck{margin:8px auto 0;max-width:60ch;color:var(--ink2);font-size:15.5px;text-wrap:balance}

/* ── ปุ่มเลือกตัวอย่าง ── */
.specimens{display:flex;gap:0;flex-wrap:wrap;justify-content:center;margin:22px 0 6px;
  border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:4px 0}
.sp{background:none;border:none;border-right:1px solid var(--rule);cursor:pointer;font-family:'Trirong',serif;
  color:var(--ink2);padding:9px 18px;text-align:center;line-height:1.45;transition:color .2s}
.sp:last-child{border-right:none}
.sp b{display:block;font-size:16px;font-weight:700}
.sp span{display:block;font-size:11.5px;color:var(--faint);letter-spacing:.02em}
.sp:hover{color:var(--blood)}
.sp[aria-pressed=true]{color:var(--blood)}
.sp[aria-pressed=true] b{position:relative}
.sp[aria-pressed=true] b::after{content:'';position:absolute;left:0;right:0;bottom:-3px;height:2px;background:var(--blood)}

/* ── เวทีแผนผัง ── */
.stage{position:relative;margin:16px 0 0;min-height:300px;
  background:linear-gradient(160deg,var(--slip),var(--vellum2));
  border:1px solid var(--rule);border-radius:3px;box-shadow:0 2px 0 var(--rule),0 18px 40px -28px var(--shadow);
  overflow:hidden}
.stage::before,.stage::after{content:'';position:absolute;width:16px;height:16px;border:1px solid var(--gold);opacity:.5}
.stage::before{left:9px;top:9px;border-right:none;border-bottom:none}
.stage::after{right:9px;bottom:9px;border-left:none;border-top:none}
svg.threads{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.nodes{position:absolute;inset:0}
.n{position:absolute;left:0;top:0;visibility:hidden}

/* คำหลัก — ตราวงกลม */
.n.core{text-align:center;cursor:default}
.core .disc{background:var(--slip);border-radius:50%;border:1.5px solid var(--gold);
  box-shadow:0 0 0 7px var(--slip),0 0 0 8px var(--rule),0 0 0 15px var(--slip),
             0 18px 46px -18px var(--shadow);
  display:grid;place-items:center;padding:26px 40px}
.core.plaque .disc{border-radius:4px;padding:20px 28px;box-shadow:0 0 0 7px var(--slip),0 0 0 8px var(--rule),0 16px 40px -18px var(--shadow)}
.core .txt{font-weight:700;color:var(--blood);line-height:1.35;text-wrap:balance}
.core .sub{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--faint);margin-top:6px}

/* วลีแม่ — แผ่นกระดาษเสียบกิ่ง */
.n.parent{width:min(310px,42vw);cursor:pointer}
.parent .slip{background:var(--slip);padding:11px 13px 9px;border-top:2px solid var(--gold);
  box-shadow:2px 3px 0 var(--vellum2),3px 5px 14px -8px var(--shadow);transition:transform .18s}
.parent:hover .slip{transform:translateY(-3px)}
.parent .lab{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--faint);display:block;margin-bottom:3px}
.parent .ptxt{font-size:15px;line-height:1.72;color:var(--ink)}
.parent em{font-style:normal;color:var(--blood);font-weight:700;
  box-shadow:inset 0 -.5em 0 rgba(176,134,46,.24)}

/* คำลูก — ใบไม้ */
.n.kid{cursor:pointer}
.kid .leaf{border-radius:2px 62% 2px 62%;padding:6px 15px 7px;font-size:15.5px;line-height:1.4;
  color:var(--slip);box-shadow:0 6px 14px -9px var(--shadow);transition:transform .18s}
.kid:hover .leaf{transform:scale(1.06) rotate(-1.5deg)}
.kid.dim .leaf{opacity:.55}

/* กิ่งหมวด — ป้ายห้อย */
.n.branch{width:min(268px,40vw)}
.branch .tag{background:var(--slip);border-left:3px solid var(--bc);padding:7px 11px 8px;
  box-shadow:2px 3px 12px -8px var(--shadow)}
/* กิ่งที่มาจากคลังเดิม วาดเป็นเส้นประ ให้เห็นทันทีว่าเป็นของอีกคลังหนึ่ง */
.branch .tag.old{background:none;border:1px dashed var(--rule);border-left:3px dashed var(--bc);box-shadow:none}
.branch .cno{font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--bc)}
.branch .bp{font-size:13.5px;line-height:1.6;color:var(--ink);display:block}
.branch .bs{font-size:10.5px;color:var(--faint);letter-spacing:.04em}

/* นิยาย — ป้ายผูกเชือก */
.n.novel .tg{background:var(--slip);border:1px solid var(--rule);border-radius:2px;padding:5px 11px;
  font-size:13px;color:var(--ink2);box-shadow:0 5px 12px -9px var(--shadow);max-width:min(210px,34vw)}

/* ป้ายกำกับสี่ทิศ */
.axis{position:absolute;font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:var(--faint);
  pointer-events:none;white-space:nowrap}

.grow{animation:grow .6s cubic-bezier(.22,.85,.28,1) backwards}
@keyframes grow{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:scale(1)}}
.fadein{animation:fadein .5s ease backwards}
@keyframes fadein{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}

/* ── บันทึกริมขอบ ── */
.marg{display:grid;grid-template-columns:1fr;gap:0 40px;margin-top:34px}
@media(min-width:900px){.marg{grid-template-columns:1.1fr .9fr}}
.mh{font-family:'Charmonman',cursive;font-weight:700;font-size:23px;color:var(--blood);margin:0 0 4px}
.blk{padding:0 0 20px}
.blk h3{font-size:11.5px;letter-spacing:.26em;text-transform:uppercase;color:var(--faint);
  margin:0 0 8px;font-weight:400;border-bottom:1px solid var(--rule);padding-bottom:5px}
.blk p{margin:0 0 8px;color:var(--ink2);font-size:15.5px}
.q{border-left:2px solid var(--gold);padding:2px 0 2px 14px;color:var(--ink);font-size:16px}
.cmp{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:560px){.cmp{grid-template-columns:1fr 1fr}}
.cmp h4{margin:0 0 6px;font-size:14px;font-weight:700}
.cmp .a h4{color:var(--blood)} .cmp .b h4{color:var(--moss)}
.cmp ul{margin:0;padding-left:16px;font-size:14px;color:var(--ink2);line-height:1.8}
.cmp .a ul{list-style:'✕  '} .cmp .b ul{list-style:'✓  '}

/* ── ตัวเลขท้ายเล่ม ── */
.ledger{margin-top:22px;border-top:1px solid var(--rule);padding-top:20px}
.lrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:22px}
.li{border-left:1px solid var(--rule);padding-left:14px}
.li b{display:block;font-size:34px;font-weight:700;color:var(--blood);line-height:1.1;
  font-variant-numeric:tabular-nums;font-family:'Trirong',serif}
.li span{font-size:13px;color:var(--ink2);display:block;margin-top:2px;line-height:1.6}
.foot{margin-top:22px;font-size:13px;color:var(--faint);text-align:center;line-height:1.8}

.tog{border:none;background:none;color:var(--faint);padding:0;font-size:11.5px;cursor:pointer;
  letter-spacing:.24em;text-transform:uppercase;font-family:'Trirong',serif;border-bottom:1px solid var(--rule)}
.tog:hover{color:var(--blood)}
.trail{display:flex;gap:9px;align-items:center;justify-content:flex-end;
  font-size:12px;color:var(--faint);margin:9px 2px 0;min-height:20px}
.trail button{background:none;border:none;color:var(--gold);cursor:pointer;font-family:'Trirong',serif;
  font-size:12px;padding:0;letter-spacing:.08em}
.trail button[disabled]{opacity:.35;cursor:default}
</style>

<div class="page">
  <header class="masthead">
    <div class="eyebrow">ภาพร่างหน้าจอ · ยังไม่ใช่ของจริง</div>
    <h1>ใยของคำ</h1>
    <p class="deck">คำหนึ่งคำไม่ได้อยู่ลำพัง มันแตกมาจากวลี แตกต่อไปเป็นคำอื่น เกาะอยู่หลายกิ่ง และเดินทางมาจากนิยายหลายเรื่อง — หน้านี้คือภาพว่าเว็บจะแสดงเส้นเหล่านั้นอย่างไร</p>
  </header>

  <nav class="specimens" id="sp"></nav>
  <div class="trail"><button class="tog" id="tog">สลับกลางวัน / กลางคืน</button>
    <span style="flex:1"></span><span id="crumb"></span><button id="back">‹ ย้อนกลับ</button></div>

  <section class="stage" id="stage">
    <svg class="threads" id="svg"></svg>
    <div class="nodes" id="nodes"></div>
  </section>

  <section class="marg" id="marg"></section>

  <section class="ledger">
    <div class="lrow" id="ledger"></div>
    <p class="foot" id="foot"></p>
  </section>
</div>

<script>
const D = __DATA__;
const N = D.nodes, F = D.facts;
const LEAF = ['#4e6b45','#7a5a86','#8c5a3c','#3f6b7a','#8c2f22','#5a6b8c','#6b7a3f'];
const CATCOL = ['#5e7a4a','#9a5a63','#8a6a3c','#4d6c86','#6d5f8c','#3f7a6b','#8a6540','#4a6f7a',
                '#7a6a4a','#96603a','#7e4f66','#557a55','#5f5f8a','#8a6a3a','#6f7a45'];
const catCol = n => CATCOL[(n - 1) % CATCOL.length];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' };
const SPEC = {
  'เล็ดลอด': 'แตกจากสองวลี · อยู่สองหมวด',
  'อรุณรุ่งที่ท้องฟ้ามืดครึ้มเป็นสีตะกั่วชวนมัวหมองหดหู่': 'วลีใหญ่ที่แตกออกเจ็ดคำ',
  'ล้มระเนระนาด': 'คำที่มีอยู่ทั้งสองคลัง',
  'สะพรึง': 'เก็บมาเอง ไม่ได้แตกจากไหน',
};

/* ══ กิ่งเรียว: เส้นโค้งที่หนาตรงโคนแล้วค่อยเรียวไปหาปลาย ══ */
function taper(x1, y1, cx, cy, x2, y2, w1, w2) {
  const S = 30, L = [], R = [];
  for (let i = 0; i <= S; i++) {
    const t = i / S, m = 1 - t;
    const x = m * m * x1 + 2 * m * t * cx + t * t * x2, y = m * m * y1 + 2 * m * t * cy + t * t * y2;
    const dx = 2 * m * (cx - x1) + 2 * t * (x2 - cx), dy = 2 * m * (cy - y1) + 2 * t * (y2 - cy);
    const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const w = (w1 + (w2 - w1) * (t * t * (3 - 2 * t))) / 2;
    L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w]);
  }
  const f = a => a.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
  return 'M' + f(L) + 'L' + f(R.reverse()) + 'Z';
}
/* ใบเล็กเกาะกิ่ง */
function leafAt(x, y, ang, len, side) {
  const a = ang + side * 0.85, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const mx = (x + ex) / 2, my = (y + ey) / 2, w = len * 0.42;
  const px = -Math.sin(a) * w, py = Math.cos(a) * w;
  return `M${x.toFixed(1)} ${y.toFixed(1)}Q${(mx + px).toFixed(1)} ${(my + py).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
       + `Q${(mx - px).toFixed(1)} ${(my - py).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Z`;
}
function ptOn(x1, y1, cx, cy, x2, y2, t) {
  const m = 1 - t;
  return [m * m * x1 + 2 * m * t * cx + t * t * x2, m * m * y1 + 2 * m * t * cy + t * t * y2];
}
function angOn(x1, y1, cx, cy, x2, y2, t) {
  const m = 1 - t;
  return Math.atan2(2 * m * (cy - y1) + 2 * t * (y2 - cy), 2 * m * (cx - x1) + 2 * t * (x2 - cx));
}
/* จุดที่เส้นจากศูนย์กลางตัดขอบกล่องของโหนด — ให้กิ่งไปจรดขอบพอดี */
function edge(cx, cy, b) {
  const dx = b.x - cx, dy = b.y - cy, hw = b.w / 2 + 4, hh = b.h / 2 + 4;
  const s = Math.min(hw / (Math.abs(dx) || 1e-6), hh / (Math.abs(dy) || 1e-6));
  return [b.x - dx * s, b.y - dy * s];
}

let cur = null, stack = [];
const stage = document.getElementById('stage'), svg = document.getElementById('svg'), holder = document.getElementById('nodes');

document.getElementById('sp').innerHTML = Object.keys(SPEC).filter(t => N[t]).map(t =>
  `<button class="sp" data-sp="${esc(t)}" aria-pressed="false"><b>${esc(t.length > 20 ? t.slice(0, 18) + '…' : t)}</b><span>${esc(SPEC[t])}</span></button>`).join('');

function build(t) {
  const n = N[t];
  const all = n.paths.map(x => ({ no: x.no, cat: x.cat, path: x.path, from: 'คลังชุดใหม่' }))
    .concat((n.old || []).map(o => ({ no: o.no, cat: '', path: o.path, from: 'คลังเดิม' })));
  const wide = stage.clientWidth >= 860;
  const long = t.length > 22;

  /* ---- สร้างโหนด ---- */
  const el = [];
  const mk = (cls, html, extra) => {
    const d = document.createElement('div');
    d.className = 'n ' + cls; d.innerHTML = html;
    if (extra) Object.assign(d.dataset, extra);
    holder.appendChild(d); el.push(d); return d;
  };
  holder.innerHTML = ''; svg.innerHTML = '';

  const core = mk('core' + (long ? ' plaque' : ''),
    `<div class="disc"><div class="txt" style="font-size:${long ? 'clamp(20px,2.3vw,28px)' : 'clamp(32px,4.4vw,58px)'}">${esc(t)}</div>`
    + `<div class="sub">${KIND[n.kind] || 'คำ'}</div></div>`);
  if (long) core.querySelector('.disc').style.maxWidth = wide ? '430px' : '84vw';

  const pEls = n.parents.slice(0, 3).map(pt => mk('parent',
    `<div class="slip"><span class="lab">แตกมาจาก</span><div class="ptxt">${hi(pt, t)}</div></div>`, { go: pt }));
  const kEls = n.kids.map((k, i) => mk('kid',
    `<div class="leaf" style="background:${LEAF[i % LEAF.length]}">${esc(k)}</div>`, { go: k }));
  const bEls = all.map(x => { const d = mk('branch',
    `<div class="tag${x.from === 'คลังเดิม' ? ' old' : ''}" style="--bc:${catCol(x.no)}"><span class="cno">หมวด ${x.no}</span>`
    + `<span class="bp">${esc(x.path)}</span><span class="bs">${x.from}</span></div>`); return d; });
  const vEls = n.novels.map(v => mk('novel', `<div class="tg">${esc(v)}</div>`));

  /* ---- วัดขนาดจริงก่อนวางตำแหน่ง ---- */
  const box = d => ({ el: d, w: d.offsetWidth, h: d.offsetHeight, x: 0, y: 0 });
  const C = box(core), P = pEls.map(box), K = kEls.map(box), B = bEls.map(box), V = vEls.map(box);

  /* ---- วางตำแหน่ง ----
     แบ่งเวทีเป็น 4 เขตไม่ทับกัน: บน=วลีแม่ · ขวา=กิ่งหมวด · ล่าง=คำลูก · ซ้าย=นิยาย
     คำนวณด้วยพิกัดลอย ๆ ก่อน แล้วค่อยวัดขอบบน-ล่างจริง เลื่อนทั้งผังให้พอดีเวที
     (ทำแบบนี้เพื่อไม่ให้เหลือที่ว่างเปล่าใต้ผัง เวลาคำไหนไม่มีคำลูก) */
  const Wd = stage.clientWidth;
  const rowsOf = (list, maxW, gap) => {
    const out = []; let row = [], rw = 0;
    list.forEach(b => {
      if (row.length && rw + gap + b.w > maxW) { out.push(row); row = []; rw = 0; }
      row.push(b); rw += (rw ? gap : 0) + b.w;
    });
    if (row.length) out.push(row);
    return out;
  };
  let zoneL = 0, zoneR = Wd, coreX = Wd / 2;

  if (wide) {
    const Rw = B.length ? Math.max(...B.map(b => b.w)) + 52 : 0;   // เขตขวาสำหรับกิ่งหมวด
    const Lw = V.length ? Math.max(...V.map(b => b.w)) + 62 : 0;   // เขตซ้ายสำหรับนิยาย
    zoneL = Lw + 20; zoneR = Wd - Rw - 20; coreX = (zoneL + zoneR) / 2;
    const zoneW = zoneR - zoneL;

    /* วลีแม่กางได้เต็มความกว้างเวที เพราะแถบบนไม่มีอะไรแย่งที่ — กางออกแล้วกิ่งเป็นรูปตัววี ดูมีชีวิต */
    let py = 0, pBottom = 0;
    const pr = rowsOf(P, Wd - 48, 44);
    pr.forEach(row => {
      const tot = row.reduce((s, b) => s + b.w + 44, 0) - 44;
      const hh = Math.max(...row.map(b => b.h));
      const gap = row.length > 1 ? Math.min(120, (Wd - 48 - tot) / (row.length - 1)) : 0;
      let x = Wd / 2 - (tot + gap * (row.length - 1)) / 2;
      row.forEach(b => { b.x = x + b.w / 2; b.y = py + hh / 2; x += b.w + 44 + gap; });
      py += hh + 18;
    });
    pBottom = pr.length ? py - 18 : 0;

    /* ตราคำจัดกึ่งกลางเทียบกับเสาที่สูงที่สุด (กิ่งหมวด/นิยาย) ไม่งั้นคำจะลอยอยู่บนสุดแล้วเหลือที่ว่างข้างล่าง */
    const bTot = B.reduce((s, b) => s + b.h + 18, 0) - 18;
    const vTot = V.reduce((s, b) => s + b.h + 14, 0) - 14;
    const sideH = Math.max(0, bTot, vTot);
    C.x = coreX;
    C.y = pBottom + (pr.length ? 84 : 34) + Math.max(C.h, sideH) / 2;

    let ky = C.y + C.h / 2 + 72;
    rowsOf(K, zoneW, 22).forEach(row => {
      const tot = row.reduce((s, b) => s + b.w + 22, 0) - 22;
      const hh = Math.max(...row.map(b => b.h));
      let x = coreX - tot / 2;
      row.forEach(b => { b.x = x + b.w / 2; b.y = ky + hh / 2; x += b.w + 22; });
      ky += hh + 22;
    });

    /* เขตขวา/ซ้ายจัดกึ่งกลางกับตราคำ แต่ห้ามขึ้นไปชนแถบวลีแม่ */
    let by = Math.max(C.y - bTot / 2, pBottom + (pr.length ? 28 : 0));
    B.forEach(b => { b.x = Math.min(Wd - 24 - b.w / 2, zoneR + 26 + b.w / 2); b.y = by + b.h / 2; by += b.h + 18; });
    let vy = Math.max(C.y - vTot / 2, pBottom + (pr.length ? 28 : 0));
    V.forEach(b => { b.x = Math.max(24 + b.w / 2, zoneL - 26 - b.w / 2); b.y = vy + b.h / 2; vy += b.h + 14; });
  } else {
    let y = 0;
    P.forEach(b => { b.x = Wd / 2; b.y = y + b.h / 2; y += b.h + 24; });
    C.x = Wd / 2; C.y = y + (P.length ? 30 : 10) + C.h / 2; y = C.y + C.h / 2 + 40;
    B.forEach(b => { b.x = Wd / 2; b.y = y + b.h / 2; y += b.h + 16; });
    y += 20;
    rowsOf(K, Wd - 34, 14).forEach(row => {
      const tot = row.reduce((s, b) => s + b.w + 14, 0) - 14;
      const hh = Math.max(...row.map(b => b.h));
      let x = Wd / 2 - tot / 2;
      row.forEach(b => { b.x = x + b.w / 2; b.y = y + hh / 2; x += b.w + 14; });
      y += hh + 14;
    });
    y += 12;
    V.forEach(b => { b.x = Wd / 2; b.y = y + b.h / 2; y += b.h + 12; });
  }

  /* เลื่อนทั้งผังลงมาให้ขอบบนเว้นระยะพอดี แล้วตัดความสูงเวทีตามของจริง */
  const ALL = [C, ...P, ...K, ...B, ...V];
  const padT = wide ? 46 : 30, padB = wide ? 40 : 30;
  const minY = Math.min(...ALL.map(b => b.y - b.h / 2));
  ALL.forEach(b => { b.y += padT - minY; });
  const H = Math.max(...ALL.map(b => b.y + b.h / 2)) + padB;
  stage.style.height = H + 'px';

  const place = (b, i) => {
    b.el.style.left = (b.x - b.w / 2) + 'px'; b.el.style.top = (b.y - b.h / 2) + 'px';
    b.el.style.visibility = 'visible'; b.el.style.animationDelay = (0.16 + i * 0.045) + 's';
    b.el.classList.add('fadein');
  };
  C.el.style.left = (C.x - C.w / 2) + 'px'; C.el.style.top = (C.y - C.h / 2) + 'px';
  C.el.style.visibility = 'visible'; C.el.classList.add('grow');
  [...P, ...B, ...K, ...V].forEach(place);

  /* ---- วาดกิ่ง ---- */
  const NS = 'http://www.w3.org/2000/svg';
  const add = (d, fill, cls, delay, stroke) => {
    const q = document.createElementNS(NS, 'path');
    q.setAttribute('d', d);
    q.setAttribute('fill', fill || 'none');
    if (stroke) { q.setAttribute('stroke', stroke.c); q.setAttribute('stroke-width', stroke.w); if (stroke.da) q.setAttribute('stroke-dasharray', stroke.da); }
    if (cls) q.setAttribute('class', cls);
    q.style.transformOrigin = C.x + 'px ' + C.y + 'px';
    q.style.animationDelay = delay + 's';
    svg.appendChild(q); return q;
  };
  const limb = (b, w1, w2, col, bow, delay, leaves) => {
    const [ex, ey] = edge(C.x, C.y, b);
    const mx = (C.x + ex) / 2, my = (C.y + ey) / 2;
    const dx = ex - C.x, dy = ey - C.y, l = Math.hypot(dx, dy) || 1;
    const cx = mx - dy / l * bow, cy = my + dx / l * bow;
    add(taper(C.x, C.y, cx, cy, ex, ey, w1, w2), col, 'grow', delay);
    if (leaves) for (let i = 0; i < leaves; i++) {
      const t = 0.42 + i * (0.42 / leaves);
      const [lx, ly] = ptOn(C.x, C.y, cx, cy, ex, ey, t);
      add(leafAt(lx, ly, angOn(C.x, C.y, cx, cy, ex, ey, t), 13 - i * 2, i % 2 ? 1 : -1), col, 'grow', delay + 0.08);
    }
    return [ex, ey];
  };
  const ink = getComputedStyle(document.body).getPropertyValue('--ink').trim();
  const gold = getComputedStyle(document.body).getPropertyValue('--gold').trim();
  const tips = [];
  P.forEach((b, i) => tips.push(limb(b, 24, 4, ink, (i - (P.length - 1) / 2) * 30, 0.05 + i * 0.06, 3)));
  B.forEach((b, i) => tips.push(limb(b, 15, 3, catCol(all[i].no), 22 + i * 11, 0.14 + i * 0.05, 2)));
  K.forEach((b, i) => tips.push(limb(b, 10, 2, LEAF[i % LEAF.length], (i % 2 ? 1 : -1) * (16 + i * 6), 0.2 + i * 0.04, 2)));
  V.forEach((b, i) => {
    const [ex, ey] = edge(C.x, C.y, b);
    add(`M${C.x} ${C.y}Q${(C.x + ex) / 2} ${(C.y + ey) / 2 - 22} ${ex} ${ey}`, null, 'grow', 0.24 + i * 0.05, { c: gold, w: 1.1, da: '5 5' });
    tips.push([ex, ey]);
  });

  /* ---- ใยแมงมุมสานระหว่างปลายกิ่ง ---- */
  const sorted = tips.map(([x, y]) => ({ x, y, a: Math.atan2(y - C.y, x - C.x), r: Math.hypot(x - C.x, y - C.y) }))
    .sort((p, q) => p.a - q.a);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (b.a - a.a > 2.3) continue;
    for (const f of [0.66, 0.9]) {
      const ax = C.x + (a.x - C.x) * f, ay = C.y + (a.y - C.y) * f;
      const bx = C.x + (b.x - C.x) * f, by = C.y + (b.y - C.y) * f;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const k = 0.82;
      add(`M${ax.toFixed(1)} ${ay.toFixed(1)}Q${(C.x + (mx - C.x) * k).toFixed(1)} ${(C.y + (my - C.y) * k).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`,
        null, 'grow', 0.4 + i * 0.03, { c: gold, w: 0.9 });
    }
  }
  /* วงแหวนรอบตราคำ */
  const rr = Math.max(C.w, C.h) / 2 + 16;
  add(`M${C.x - rr} ${C.y}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0`, null, 'grow', 0.34, { c: gold, w: 0.8, da: '2 7' });

  /* ---- ป้ายกำกับทิศ (วางในช่องว่างของแต่ละเขต ไม่ทับโหนด) ---- */
  const axis = (txt, x, y, mode) => {
    const d = document.createElement('div'); d.className = 'axis'; d.textContent = txt;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.transform = mode === 'r' ? 'translateX(-100%)' : mode === 'c' ? 'translateX(-50%)' : '';
    holder.appendChild(d);
  };
  if (wide) {
    if (P.length) axis('รากที่มา', coreX, Math.min(...P.map(b => b.y - b.h / 2)) - 22, 'c');
    if (B.length) axis('กิ่งที่คำนี้เกาะอยู่', Wd - 26, Math.min(...B.map(b => b.y - b.h / 2)) - 22, 'r');
    if (K.length) axis('คำที่แตกออกไป', coreX, Math.max(...K.map(b => b.y + b.h / 2)) + 12, 'c');
    if (V.length) axis('จากนิยาย', 26, Math.min(...V.map(b => b.y - b.h / 2)) - 22);
  }

  /* ---- บันทึกริมขอบ ---- */
  const m = [];
  m.push('<div>');
  m.push(`<p class="mh">${esc(t)}</p>`);
  if (n.meaning) m.push(`<div class="blk"><h3>ความหมาย</h3><p class="q">${esc(n.meaning)}</p></div>`);
  m.push('<div class="blk"><h3>เส้นที่โยงอยู่</h3><p>'
    + (n.parents.length
      ? `แตกมาจาก <b>${n.parents.length} วลี</b> — กดแผ่นกระดาษด้านบนเพื่อเปิดวลีนั้น`
      : `<b>เก็บมาเอง</b> ไม่ได้แตกมาจากวลีไหน${n.line ? ` · อยู่บรรทัดที่ ${n.line} ของคลัง` : ''}`)
    + (n.kids.length ? ` · แตกต่อไปเป็น <b>${n.kids.length} คำ</b> กดใบไม้เพื่อเดินต่อ` : ' · ยังไม่มีคำไหนแตกออกมาจากคำนี้')
    + `<br>เกาะอยู่ <b>${all.length} กิ่ง</b> ข้าม <b>${new Set(all.map(x => x.no)).size} หมวด</b>`
    + ` · เจอใน <b>${n.novels.length} เรื่อง</b></p>`);
  if (n.note) m.push(`<p>📝 หมายเหตุที่เจ้าของคลังเขียนไว้: <b>${esc(n.note)}</b></p>`);
  if (n.loan) m.push(`<p>คำต้นแบบภาษาอังกฤษ: <b>${esc(n.loan)}</b></p>`);
  m.push('</div></div><div>');
  if (n.old) {
    const oc = new Set(n.old.map(o => o.no)), nc = new Set(n.paths.map(x => x.no));
    m.push('<div class="blk"><h3>ตอนเอาสองคลังมารวมกัน</h3><div class="cmp">'
      + '<div class="a"><h4>ระบบตอนนี้</h4><ul>'
      + `<li>คลังเดิมเก็บเป็น ${n.old.length} แถวแยกกัน เพราะคำหนึ่งอยู่ได้หมวดเดียว (${[...oc].map(x => 'หมวด ' + x).join(' · ')})</li>`
      + `<li>คลังชุดใหม่อีกหนึ่งแถว ${n.paths.length} กิ่ง</li>`
      + '<li>ตอนรวมต้องเลือกฝั่งเดียว หรือปล่อยให้ซ้ำกันต่อไป</li></ul></div>'
      + '<div class="b"><h4>ถ้ามีระบบโยง</h4><ul><li>เหลือคำเดียว</li>'
      + `<li>เกาะครบ ${all.length} กิ่ง ข้าม ${new Set([...oc, ...nc]).size} หมวด</li>`
      + `<li>เก็บได้ทั้ง ${n.novels.length} เรื่อง ไม่ต้องทิ้งฝั่งไหน</li></ul></div></div></div>`);
  } else {
    m.push('<div class="blk"><h3>อ่านแผนผังอย่างไร</h3>'
      + '<p><b>แผ่นกระดาษด้านบน</b> คือวลีที่คำนี้ถูกตัดออกมา กดแล้วกระโดดไปดูวลีเต็มได้ '
      + '<b>ใบไม้ด้านล่าง</b> คือคำที่ถูกตัดออกไปจากคำนี้ กดแล้วเดินต่อได้เหมือนกัน '
      + '<b>ป้ายด้านขวา</b> คือกิ่งที่คำนี้เกาะอยู่ สีต่างกันคือคนละหมวด '
      + 'และ<b>เส้นทองที่สานอยู่ระหว่างปลายกิ่ง</b> คือใยที่ทำให้เดินจากจุดไหนไปจุดไหนก็ได้</p></div>');
  }
  m.push('</div>');
  document.getElementById('marg').innerHTML = m.join('');

  document.getElementById('crumb').textContent = stack.length
    ? stack.slice(-2).map(s => s.length > 14 ? s.slice(0, 13) + '…' : s).join(' › ') : '';
  document.getElementById('back').disabled = !stack.length;
  document.querySelectorAll('.sp').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sp === t)));
}

function hi(sentence, word) {
  const i = sentence.indexOf(word);
  if (i < 0) return esc(sentence);
  return esc(sentence.slice(0, i)) + '<em>' + esc(word) + '</em>' + esc(sentence.slice(i + word.length));
}

function go(t, push) {
  if (!N[t]) return;
  if (push && cur) stack.push(cur);
  cur = t; build(t);
}

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { go(g.dataset.go, true); return; }
  const s = e.target.closest('[data-sp]');
  if (s) { stack = []; go(s.dataset.sp, false); }
});
document.getElementById('back').onclick = () => { const t = stack.pop(); if (t) { cur = t; build(t); } };
document.getElementById('tog').onclick = () => {
  const r = document.documentElement;
  const now = r.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.dataset.theme = now === 'dark' ? 'light' : 'dark';
  if (cur) build(cur);
};
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => cur && build(cur), 180); });

document.getElementById('ledger').innerHTML = [
  [F.crossOld, `คำในคลังเดิมถูกแตกเป็น ${F.dupRows} แถว เพราะระบบให้คำหนึ่งอยู่ได้หมวดเดียว`],
  [F.overlap, 'คำที่มีอยู่ทั้งสองคลัง จะชนกันตอนเอามารวม'],
  [F.multiCat, 'คำในคลังชุดใหม่ที่เกาะกิ่งข้ามหมวด'],
  [F.multiParent, 'คำที่แตกมาจากวลีแม่มากกว่าหนึ่งวลี'],
].map(([n, t]) => `<div class="li"><b>${n}</b><span>${t}</span></div>`).join('');
document.getElementById('foot').textContent =
  `คำ วลี และกิ่งทุกอันในหน้านี้ดึงมาจากคลังจริง — คลังเดิม ${F.oldRows} แถว และคลังชุดใหม่ ${F.newWords} คำ`;

go(Object.keys(SPEC)[0], false);
</script>
'''

body = BODY.replace('__FONTS__', FONTCSS).replace('__DATA__', DATA)

full = ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f'<title>{TITLE}</title>\n</head>\n<body>\n{body}\n</body>\n</html>\n')
open(p('docs/word-web-mockup.html'), 'w', encoding='utf-8').write(full)

frag = sys.argv[1] if len(sys.argv) > 1 else '/tmp/word-web-mockup-page.html'
open(frag, 'w', encoding='utf-8').write(f'<title>{TITLE}</title>\n{body}\n')

print(f"OK · docs/word-web-mockup.html · {len(NODES)} คำ · {len(full)/1024:.0f} KB (ฟอนต์ฝัง {len(FONTCSS)/1024:.0f} KB)")
print(f"   ตัวเลขจริง: คลังเดิม {FACTS['oldRows']} แถว · ซ้ำเพราะข้ามหมวดไม่ได้ {FACTS['crossOld']} คำ ({FACTS['dupRows']} แถว)")
print(f"   มีทั้งสองคลัง {FACTS['overlap']} · กิ่งข้ามหมวด {FACTS['multiCat']} · แตกจากหลายวลี {FACTS['multiParent']}")
