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

# ชื่ออังกฤษของกิ่ง — ทะเบียนกิ่งมีครบทั้ง 766 กิ่ง
BR_EN = {(b['category_id'], b['path']): b.get('en', '') for b in NEW['branches']}


def path_ens(cid, path):
    """คืนชื่ออังกฤษทีละชั้นของเส้นทางกิ่ง เช่น a / b / c → [en(a), en(a/b), en(a/b/c)]"""
    parts, out, cur = path.split(' / '), [], []
    for p in parts:
        cur.append(p)
        out.append(BR_EN.get((cid, ' / '.join(cur)), ''))
    return out

# พี่กันบอก "แค่เฉพาะไม่กี่คำ" → เอา 3 คำที่ครอบเคสต่างกันพอ
SEEDS = ['อรุณรุ่งที่ท้องฟ้ามืดครึ้มเป็นสีตะกั่วชวนมัวหมองหดหู่', 'เล็ดลอด', 'ล้มระเนระนาด', 'วังเวง']

# 📚 เดโมกรณี "คำเดียวเจอในหลายเรื่อง" (พี่กันขอ 26 ก.ค. 2569)
#    คลังจริงตอนนี้มีนิยายเรื่องเดียว จึงยังไม่มีคำไหนเจอหลายเรื่องให้ดูของจริง
#    เลยสมมติชื่อเรื่องเพิ่มให้ดูภาพ และติดป้าย "ตัวอย่างสมมติ" กำกับไว้ในหน้าจอ ไม่ให้เข้าใจผิดว่าเป็นข้อมูลจริง
DEMO_WORD = 'วังเวง'
DEMO_NOVELS = ['คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ',
               'คินดะอิจิยอดนักสืบ ตอน หมู่บ้านแปดสุสาน',
               'คินดะอิจิยอดนักสืบ ตอน เกาะประตูนรก']

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
        # ens = ชื่ออังกฤษของกิ่งทีละชั้น (ชั้นแรก / ชั้นสอง / ชั้นสาม) — พี่กันสั่งให้โชว์คู่กับชื่อไทย
        'paths': [{'no': CAT[a['category_id']]['no'], 'cat': CAT[a['category_id']]['name_th'],
                   'catEn': CAT[a['category_id']].get('name_en', ''),
                   'path': a['path'], 'ens': path_ens(a['category_id'], a['path']), 'from': 'ใหม่'}
                  for a in (w.get('all_paths') or [])],
        'parents': [s for s in parents(w) if s in seen],
        'kids': [k for k in KIDS.get(t, []) if k in seen],
        'line': w.get('line'),
    }
    if t in OLDBY:
        for o in OLDBY[t]:
            no = int(o['category_id'][1:]) + 1
            n['paths'].append({'no': no, 'cat': CAT.get(f'c{no-1}', {}).get('name_th', ''),
                               'catEn': CAT.get(f'c{no-1}', {}).get('name_en', ''),
                               'path': o.get('subpath') or '',
                               'ens': path_ens(f'c{no-1}', o.get('subpath') or ''), 'from': 'เดิม'})
            nv = o.get('novel') or 'ไม่ระบุเรื่อง'
            if nv not in n['novels']:
                n['novels'].append(nv)
    NODES[t] = n

if DEMO_WORD in NODES:
    NODES[DEMO_WORD]['novels'] = list(DEMO_NOVELS)
    NODES[DEMO_WORD]['demoNovels'] = True

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
:root{
  --panel:#f8f2e4; --surface:#fffdf7; --line:#e2d3b0; --line2:#eadfc6;
  --page:#e9dec6; --ink:#2f251c; --ink2:#5b4f43; --dim:#8a7d6d; --faint:#b3a488;
  --accent:#9c3b2b; --primary:#6f4e37; --chip:#f1e9d6; --chipb:#e4d8bd;
  --danger-bg:#faf1ee; --danger-line:#e6c3b7;
}
@media (prefers-color-scheme:dark){:root{
  --panel:#241d16; --surface:#2c241b; --line:#463a2a; --line2:#3d3325; --page:#15100a;
  --ink:#f3e8d2; --ink2:#cdbfa6; --dim:#9d8e77; --faint:#6f6353;
  --accent:#e8907a; --primary:#c69a6d; --chip:#332b21; --chipb:#453a2c;
  --danger-bg:#3a2620; --danger-line:#6b4034;
}}
:root[data-theme=dark]{
  --panel:#241d16; --surface:#2c241b; --line:#463a2a; --line2:#3d3325; --page:#15100a;
  --ink:#f3e8d2; --ink2:#cdbfa6; --dim:#9d8e77; --faint:#6f6353;
  --accent:#e8907a; --primary:#c69a6d; --chip:#332b21; --chipb:#453a2c;
  --danger-bg:#3a2620; --danger-line:#6b4034;
}
:root[data-theme=light]{
  --panel:#f8f2e4; --surface:#fffdf7; --line:#e2d3b0; --line2:#eadfc6;
  --page:#e9dec6; --ink:#2f251c; --ink2:#5b4f43; --dim:#8a7d6d; --faint:#b3a488;
  --accent:#9c3b2b; --primary:#6f4e37; --chip:#f1e9d6; --chipb:#e4d8bd;
  --danger-bg:#faf1ee; --danger-line:#e6c3b7;
}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font-family:'Trirong',Georgia,serif;
  font-size:16px;line-height:1.78;-webkit-text-size-adjust:100%}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@keyframes pop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
/* ── ลำดับการเข้าเวที: การ์ดคำหลักขึ้นก่อน → ไฮไลต์กวาดสี → ใบไม้เด้ง → เส้นวิ่ง → หมวดและกิ่งเลื่อนเข้า ── */
@keyframes riseIn{from{opacity:0;transform:translateY(16px) scale(.975)}to{opacity:1;transform:none}}
@keyframes dropIn{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
@keyframes popIn{from{opacity:0;transform:translateY(12px) scale(.82)}to{opacity:1;transform:none}}
@keyframes slideIn{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes sweep{from{background-size:0 100%}to{background-size:100% 100%}}
@keyframes badgeIn{from{opacity:0;transform:scale(.6)}60%{transform:scale(1.08)}to{opacity:1;transform:scale(1)}}
@keyframes savePulse{0%{box-shadow:0 0 0 0 rgba(156,59,43,.45)}70%{box-shadow:0 0 0 9px rgba(156,59,43,0)}100%{box-shadow:0 0 0 0 rgba(156,59,43,0)}}
@keyframes keyShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-13deg)}75%{transform:rotate(13deg)}}
/* เปลี่ยนธีมแล้วสีค่อย ๆ ไล่ ไม่กระพริบ */
body,[data-r=modal],[data-r=scene],[data-el=hero],[data-el=tnode],[data-el=catnode],.f,.sd{
  transition:background-color .35s ease,color .35s ease,border-color .25s ease,box-shadow .25s ease,transform .18s ease}
@keyframes dotIn{from{transform:scale(0);opacity:0}to{transform:scale(1)}}
@keyframes shine{from{transform:translateX(-130%) skewX(-18deg)}to{transform:translateX(230%) skewX(-18deg)}}
@keyframes ringOut{from{box-shadow:0 0 0 0 currentColor;opacity:.55}to{box-shadow:0 0 0 14px transparent;opacity:0}}
@keyframes swapOut{to{opacity:0;transform:translateY(10px) scale(.99)}}

/* ── ชี้ค้าง: ทุกชิ้นที่แตะได้ต้องขยับตอบ ── */
[data-el=tnode]{position:relative}
[data-el=tnode]:hover{transform:translateX(6px);box-shadow:-3px 6px 18px -12px rgba(40,28,14,.9)}
[data-el=tnode]:hover>span:first-child{color:var(--accent)}
[data-el=catnode]{cursor:default}
[data-el=catnode]:hover{transform:translateY(-3px) scale(1.035);box-shadow:0 12px 24px -12px rgba(40,28,14,.9),inset 0 1px 0 rgba(255,255,255,.28)}
[data-el=par]:hover{transform:translateY(-3px) scale(1.012);box-shadow:0 10px 22px -14px rgba(40,28,14,.8)}
[data-el=hero]:hover{box-shadow:0 18px 38px -18px rgba(40,28,14,.7)}
.lf{position:relative;overflow:hidden}
.lf::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.42) 50%,transparent 65%);
  transform:translateX(-130%) skewX(-18deg);pointer-events:none}
.lf:hover::after{animation:shine .6s ease}
.edt{transition:transform .16s ease,color .16s ease}
.edt:hover{transform:scale(1.28) rotate(90deg)}
button.sd.edt:hover{transform:translateY(-2px) scale(1.03) rotate(0)}
#seeds button:hover{color:var(--accent);letter-spacing:.03em}
#lock:hover{transform:translateY(-2px)}
#lock:hover span{display:inline-block;animation:keyShake .5s ease}
#save:not([disabled]):hover{transform:translateY(-2px) scale(1.03)}
#save:not([disabled]):active{transform:translateY(0) scale(.98)}
[data-el=map]{transition:opacity .18s ease,transform .18s ease}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media(max-width:900px){
  [data-el=map]{grid-template-columns:1fr!important;grid-template-areas:'hero' 'left' 'right'!important}
  [data-r=side2]{border-left:none!important;border-top:1px solid var(--line)!important}
  [data-r=behind],[data-r=veil]{display:none!important}
  [data-r=scene]{padding:0!important;border:none!important;background:none!important}
}
@media(max-width:560px){
  [data-r=catrow]{grid-template-columns:1fr!important;gap:9px!important}
  [data-r=catwrap]{padding-left:16px!important}
}
.sd:hover{border-color:var(--primary)!important;color:var(--ink)!important}
.lf:hover{filter:brightness(1.06)}
.f{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);
  color:var(--ink);font-family:inherit;font-size:14.5px;outline:none;margin-bottom:12px;
  transition:border-color .15s,background .15s,padding .15s;-webkit-appearance:none;appearance:none}
select.f{background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);
  background-position:calc(100% - 16px) 55%,calc(100% - 11px) 55%;background-size:5px 5px,5px 5px;background-repeat:no-repeat}
.f:focus{border-color:var(--primary)}
/* 🔒 ล็อกอยู่ = อ่านอย่างเดียว แต่ยังเป็นช่องพื้นขาวเหมือนเดิม
   (พี่กันสั่ง "ต้องการให้ช่องกรอกยังเป็นสีขาว เพราะแบบนั้นสีมันกลืนกับฉากหลังหมด ไม่มีอะไรเด่นเลย")
   บอกว่าล็อกอยู่ด้วยเส้นขอบประจาง ๆ แทน ไม่ใช่ทำให้ช่องหายไปกับพื้น */
body[data-lock=on] .f{background:var(--surface);border-style:dashed;border-color:var(--line2);cursor:default;opacity:1;color:var(--ink)}
body[data-lock=on] select.f{background-image:none}
body[data-lock=on] .edt{display:none!important}
#save[disabled]{background:var(--chip);color:var(--faint);cursor:not-allowed}
#save:not([disabled]){background:var(--primary);color:#fbf3e2;cursor:pointer}
#save:not([disabled]):hover{background:var(--accent)}
</style>

<div style="max-width:1180px;margin:0 auto;padding:30px 20px 60px">

  <div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap">
    <div style="min-width:0">
      <div style="font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--faint)">ม็อคอัพ · คลังคำ</div>
      <h1 style="font-size:27px;font-weight:700;margin:2px 0 0;line-height:1.3;letter-spacing:.01em">หน้าต่างคำ</h1>
    </div>
    <p style="margin:0;color:var(--dim);font-size:13.5px;line-height:1.7;flex:1;min-width:220px;max-width:520px">ป๊อปอัปที่เด้งขึ้นมาตอนกดคำในหน้าคลังคำ — ฝั่งซ้ายคือผังเส้นโยงทั้งคลัง ฝั่งขวาคือช่องแก้ไขเดิมของเว็บ</p>
    <button class="sd" id="tog" style="border:1px solid var(--line);background:var(--panel);color:var(--ink2);font-family:inherit;font-size:12.5px;cursor:pointer;padding:6px 14px;border-radius:20px;line-height:1.5">โหมดกลางคืน</button>
  </div>

  <div style="display:flex;align-items:center;gap:8px;margin:22px 0 0">
    <div style="height:1px;flex:1;background:var(--line)"></div>
    <div style="font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--faint);white-space:nowrap">ตัวอย่างจากคลังจริง</div>
    <div style="height:1px;flex:1;background:var(--line)"></div>
  </div>

  <div id="seeds" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:14px 0 0"></div>

  <div data-r="scene" style="position:relative;margin:22px 0 0;padding:30px 26px;background:var(--page);border:1px solid var(--line2);border-radius:16px;overflow:hidden">
    <div data-r="behind" style="position:absolute;inset:0;padding:18px 20px;filter:blur(1.8px);opacity:.5;pointer-events:none;user-select:none">
      <div style="font-size:13px;color:var(--dim);margin-bottom:10px">คลังคำ · หมวด 1 บรรยากาศ แสง สี และสถานที่</div>
      <div id="behind" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px"></div>
    </div>
    <div data-r="veil" style="position:absolute;inset:0;background:rgba(48,38,26,.4);backdrop-filter:blur(2.5px)"></div>

    <div data-r="modal" style="position:relative;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 30px 80px -24px rgba(38,26,12,.5),0 2px 0 rgba(255,255,255,.5) inset;animation:pop .28s ease">
      <div data-el="map" id="map" style="position:relative;display:grid;grid-template-columns:1fr 1fr;grid-template-areas:'hero hero' 'left right'">
        <svg data-el="svg" id="svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:0"></svg>
        <div id="heroArea" style="grid-area:hero;position:relative;z-index:1;padding:20px 24px 0;min-width:0"></div>
        <div style="grid-area:left;position:relative;min-width:0;padding:18px 24px 26px">
          <div data-r="catwrap" id="cats" style="position:relative;z-index:1;display:flex;flex-direction:column;gap:18px"></div>
        </div>
        <div data-r="side2" id="side2" style="grid-area:right;position:relative;padding:18px 22px 26px;border-left:1px solid var(--line);min-width:0"></div>
      </div>
    </div>
  </div>

  <div id="foot" style="margin:20px 0 0;padding-top:14px;border-top:1px solid var(--line2);color:var(--faint);font-size:12.5px;line-height:1.85"></div>
</div>

<script>
const D = __DATA__, N = D.nodes, F = D.facts;
const PAL = ['#8f6b4a','#5f7f92','#a86a79','#6f8a56','#7c6a99','#3f7d6c','#96603a'];
const KIND = { word: 'คำ', phrase: 'วลี', sentence: 'ประโยค' };
const CATS = ['1 บรรยากาศ แสง สี และสถานที่','2 รูปลักษณ์และลักษณะบุคคล','3 กริยา ท่าทาง และการเคลื่อนไหว',
  '4 เสียง','5 สภาวะภายใน','6 คำปรุงแต่งและคำอเนกประสงค์','15 บทบรรยายและภาพรวมฉาก'];
const BEHIND = ['แสงสลัวราง','ม่านหมอก','ฟ้าสาง','เงาทาบ','ลมโชย','ครึ้มฟ้าครึ้มฝน','แดดจ้า','สนธยา','อรุณรุ่ง','มืดตึดตื๋อ','ละอองฝน','แสงเรือง'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ไล่สีหมวด: น้ำตาลเข้มอิ่ม → จางลง (หมวดที่มีกิ่งเยอะที่สุดเข้มที่สุด) */
const ramp = (i, n) => `oklch(${(34 + (n > 1 ? i * (17 / (n - 1)) : 0)).toFixed(1)}% ${Math.max(0.018, 0.062 - i * 0.011).toFixed(3)} 58)`;
/* ไล่สีจากหมวดตั้งต้น (เข้ม) ลงไปทีละชั้นจนถึงหมวดย่อย (จาง) — depth ลบ = เข้มกว่าฐาน */
const tint = (base, depth, alpha) => {
  const m = /oklch\(([\d.]+)%\s*([\d.]+)\s*([\d.]+)\)/.exec(base);
  if (!m) return base;
  const L = +m[1], C = +m[2], H = +m[3];
  const L2 = Math.max(8, Math.min(78, L + depth * 8)).toFixed(1), C2 = Math.max(0.024, C - depth * 0.006).toFixed(3);
  return alpha != null ? `oklch(${L2}% ${C2} ${H} / ${alpha})` : `oklch(${L2}% ${C2} ${H})`;
};

let cur = null, stack = [], theme = null, animKey = null, drawSig = '', animAt = 0;
/* 🔒 ล็อกไว้ก่อนเสมอ — พี่กันสั่ง "การจะแก้คำ ต้องยากกว่านี้ ไม่ใช่เอาเมาส์ไปกดแล้วพิมพ์ได้เลย เสี่ยงพังมาก"
   ปลดล็อกแล้วถึงจะพิมพ์ได้ · ปุ่มบันทึกยังกดไม่ได้จนกว่าจะมีอะไรเปลี่ยนจริง */
let locked = true, snap = null;
const HEAD = 'font-size:17px;font-weight:700;color:var(--ink);letter-spacing:.01em;white-space:nowrap;line-height:1.5';

document.getElementById('behind').innerHTML = BEHIND.map(b =>
  `<div style="background:var(--surface);border:1px solid var(--line2);border-left:3px solid var(--faint);border-radius:9px;padding:9px 10px;font-size:14px;color:var(--ink2);min-height:42px">${esc(b)}</div>`).join('');

/* ระบายสีคำสกัดลงในวลี — คำที่ซ้อนในคำยาวกว่าระบายทับกันไม่ได้ จึงคืน used กลับไปด้วย */
function paint(sentence, words) {
  const hit = [];
  words.forEach((w, i) => {
    let f = 0, at;
    while (w && (at = sentence.indexOf(w, f)) !== -1) { hit.push({ a: at, b: at + w.length, i }); f = at + w.length; }
  });
  hit.sort((x, y) => x.a - y.a || (y.b - y.a) - (x.b - x.a));
  let out = '', c0 = 0; const used = new Set();
  for (const h of hit) {
    if (h.a < c0) continue;
    out += esc(sentence.slice(c0, h.a));
    const c = PAL[h.i % PAL.length], ord = used.size;
    used.add(h.i);
    /* ไฮไลต์ + เส้นใต้รวมเป็นภาพพื้นชิ้นเดียว แล้วกวาดจากซ้ายไปขวา ตัวอักษรยังอ่านได้ตลอดระหว่างกวาด */
    out += `<span data-m="${h.i}" style="background-image:linear-gradient(to top,${c} 0 2px,${c}2e 2px 100%);`
      + 'background-repeat:no-repeat;background-size:0 100%;border-radius:3px;padding:1px 2px;'
      + `-webkit-box-decoration-break:clone;box-decoration-break:clone;`
      + `animation:sweep .5s cubic-bezier(.22,.8,.3,1) ${(0.16 + ord * 0.075).toFixed(2)}s forwards">`
      + esc(sentence.slice(h.a, h.b)) + '</span>';
    c0 = h.b;
  }
  return { html: out + esc(sentence.slice(c0)), used };
}

/* เรียงคำสกัดตามลำดับที่ปรากฏในวลี — ไม่ให้เส้นไขว้กันเอง */
function order(sentence, kids) {
  return kids.map(w => ({ w, at: sentence.indexOf(w), len: w.length }))
    .sort((a, b) => a.at - b.at || b.len - a.len).map(x => x.w);
}

/* แตกเส้นทางกิ่ง (a / b / c) เป็นชั้น ๆ — ชั้นที่ซ้ำกันยุบรวมเป็นก้อนเดียว */
function tree(list, no, c) {
  const root = { kids: new Map() };
  list.forEach(x => {
    let cu = root;
    x.path.split(' / ').forEach((p, i, arr) => {
      if (!cu.kids.has(p)) cu.kids.set(p, { name: p, en: (x.ens || [])[i] || '', kids: new Map(), leaf: null });
      cu = cu.kids.get(p);
      if (i === arr.length - 1) cu.leaf = x;
    });
  });
  const rows = [];
  const walk = (node, depth, pid) => {
    [...node.kids.values()].forEach((k, i) => {
      const id = pid ? pid + '.' + i : no + '.' + i;
      const isLeaf = !!k.leaf, old = isLeaf && k.leaf.from === 'เดิม';
      /* สามโทนตายตัว: เข้ม = หมวด+ชั้นแรก · กลาง = ชั้นถัดไป · จางสุด = ปลายกิ่ง */
      const tone = isLeaf ? 2 : (depth === 0 ? 0 : 1);
      const toneColor = tint(c, [0, 4, 8][tone]), toneBg = isLeaf ? 'var(--surface)' : tint(c, [1, 5][tone], [.16, .11][tone]);
      rows.push({
        id, p: pid || '', name: k.name, en: k.en || '', isLeaf,
        tail: old ? 'จากคลังเดิม' : '',
        tailStyle: `font-size:10.5px;color:var(--faint);flex:none;line-height:1.9;${old ? '' : 'letter-spacing:.02em'}`,
        textStyle: isLeaf
          ? 'flex:1;min-width:0;font-size:13.5px;line-height:1.65;color:var(--ink)'
          : 'flex:1;min-width:0;font-size:12.5px;line-height:1.5;color:var(--ink);font-weight:600',
        style: `display:flex;gap:9px;align-items:${isLeaf ? 'flex-start' : 'center'};margin-left:${depth * 22}px;`
          + `background:${old ? 'none' : toneBg};border-width:1px;border-style:${old ? 'dashed' : 'solid'};`
          + `border-color:var(--line2);border-left-width:4px;border-left-style:${old ? 'dashed' : 'solid'};`
          + `border-left-color:${toneColor};border-radius:0 11px 11px 0;padding:${isLeaf ? '7px 11px' : '6px 13px'};min-width:0`
      });
      walk(k, depth + 1, id);
    });
  };
  walk(root, 0, '');
  return rows;
}

/* อ่านค่าทุกช่องออกมาเป็นสตริงเดียว ไว้เทียบว่ามีอะไรเปลี่ยนไปจริงหรือยัง */
function readFields() {
  return [...document.querySelectorAll('#side2 .f')].map(el => el.value).join('');
}
/* ปุ่มบันทึกกดได้ต่อเมื่อ ปลดล็อกแล้ว และมีการแก้ไขจริงอย่างน้อยหนึ่งจุด */
function refreshSave() {
  const s = document.getElementById('save'); if (!s) return;
  const changed = !locked && readFields() !== snap;
  const was = s.disabled;
  s.disabled = !changed;
  if (was && changed) { s.style.animation = 'none'; s.offsetWidth; s.style.animation = 'savePulse .7s ease'; }
  s.title = changed ? '' : (locked ? 'ปลดล็อกก่อนจึงจะแก้ไขได้' : 'ยังไม่มีการแก้ไข');
}
function applyLock() {
  document.body.dataset.lock = locked ? 'on' : 'off';
  document.querySelectorAll('#side2 input.f').forEach(el => { el.readOnly = locked; });
  document.querySelectorAll('#side2 select.f').forEach(el => { el.disabled = locked; });
  const b = document.getElementById('lock'), hint = document.getElementById('lockhint');
  if (b) {
    b.innerHTML = locked ? '<span>🔒</span> ปลดล็อกเพื่อแก้ไข' : '<span>🔓</span> กำลังแก้ไข · กดเพื่อล็อก';
    b.style.borderColor = locked ? 'var(--line)' : 'var(--accent)';
    b.style.color = locked ? 'var(--ink2)' : 'var(--accent)';
  }
  if (hint) hint.textContent = locked
    ? 'ตอนนี้อ่านอย่างเดียว กันเผลอพิมพ์ทับ — กดปลดล็อกก่อนจึงจะแก้ไขได้'
    : 'แก้ไขได้แล้ว — ปุ่มลบกิ่งและปุ่มเพิ่มในผังฝั่งซ้ายเปิดใช้งานพร้อมกัน';
  refreshSave();
}

function render(t) {
  const n = N[t];
  const isSrc = n.kids.length > 0;
  const kids = isSrc ? order(t, n.kids) : [];
  const pt = isSrc ? paint(t, kids) : { html: esc(t), used: new Set() };
  const byCat = new Map();
  n.paths.forEach(x => { if (!byCat.has(x.no)) byCat.set(x.no, { cat: x.cat, catEn: x.catEn || '', list: [] }); byCat.get(x.no).list.push(x); });

  /* ── หัวผัง + วลีแม่ + คำหลัก + คำสกัด ── */
  const h = [];
  h.push('<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
    + `<div style="${HEAD}">ผังเส้นโยง</div>`
    + '<div style="height:1px;flex:1;background:var(--line)"></div>'
    + (stack.length ? '<button class="sd" id="back" style="border:1px solid var(--line);background:var(--surface);color:var(--ink2);font-family:inherit;font-size:12px;padding:3px 12px;border-radius:16px;cursor:pointer;white-space:nowrap">‹ ย้อนกลับ</button>' : '')
    + '</div>');

  if (n.parents.length) h.push('<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:9px;margin-bottom:26px">'
    + '<div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--faint);background:var(--panel);padding:0 9px;border-radius:10px">แตกมาจาก</div>'
    + n.parents.map(p => `<button class="sd" data-el="par" data-go="${esc(p)}" style="background:var(--surface);border:1px solid var(--line2);border-radius:12px;padding:9px 15px;font-family:inherit;font-size:14.5px;line-height:1.7;color:var(--ink);cursor:pointer;max-width:min(540px,100%);text-align:left;animation:dropIn .45s cubic-bezier(.2,.8,.25,1) both">${paint(p, [t]).html}</button>`).join('')
    + '</div>');

  h.push('<div data-el="hero" style="overflow:hidden;position:relative;z-index:1;background:var(--surface);border:2px solid var(--primary);border-radius:15px;padding:16px 24px 15px;box-shadow:0 14px 30px -18px rgba(40,28,14,.6);width:100%;text-align:center;margin-bottom:78px;animation:riseIn .5s cubic-bezier(.2,.8,.25,1) both">'
    + `<span style="display:inline-block;font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:#fdf6e8;background:var(--accent);border-radius:12px;padding:2px 11px;margin-bottom:9px;line-height:1.9;animation:badgeIn .42s cubic-bezier(.2,.9,.3,1) .28s both">${n.parents.length ? 'คำที่กำลังดู' : 'วลีตั้งต้น'}</span>`
    + `<div style="font-size:clamp(22px,2.6vw,32px);font-weight:700;line-height:1.55;color:var(--ink);word-break:break-word">${pt.html}</div>`
    + '<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.5) 50%,transparent 62%);animation:shine 1s ease .45s 1 both"></div>' + `<div style="font-size:12px;color:var(--dim);margin-top:8px;letter-spacing:.02em">`
    + [KIND[n.kind] || 'คำ', `เกาะอยู่ ${n.paths.length} กิ่ง ใน ${byCat.size} หมวด`]
        .concat(n.novels.length > 1 ? [`เจอใน ${n.novels.length} เรื่อง`] : []).join(' · ') + '</div>'
    + (n.meaning ? `<div style="font-size:13.5px;color:var(--ink2);margin-top:6px;padding-top:7px;border-top:1px solid var(--line2);display:inline-block">${esc(n.meaning)}</div>` : '')
    + '</div>');

  if (isSrc) h.push('<div style="position:relative;z-index:1;display:flex;gap:12px;align-items:flex-start;margin-bottom:26px">'
    + '<div style="font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--faint);white-space:nowrap;padding-top:9px">แตกออกเป็น</div>'
    + '<div style="display:flex;gap:26px 9px;flex-wrap:wrap;justify-content:center;flex:1">'
    + kids.map((k, i) => `<button class="lf" data-el="leaf" data-k="${i}" data-go="${esc(k)}" style="border:none;border-radius:20px;padding:6px 16px;font-family:inherit;font-size:15px;color:#fffaf0;cursor:pointer;line-height:1.6;background:${PAL[i % PAL.length]};box-shadow:0 6px 14px -8px rgba(40,28,14,.75),inset 0 1px 0 rgba(255,255,255,.22);opacity:${pt.used.has(i) ? 1 : .62};animation:popIn .42s cubic-bezier(.2,.85,.3,1) ${(0.42 + i * 0.06).toFixed(2)}s both">${esc(k)}</button>`).join('')
    + '</div></div>');
  document.getElementById('heroArea').innerHTML = h.join('');

  /* ── หมวดและกิ่ง: เรียงตามจำนวนกิ่งมากไปน้อย แล้วไล่สีเข้ม → จาง ── */
  const cats = [...byCat.entries()].sort((x, y) => y[1].list.length - x[1].list.length || x[0] - y[0]);
  /* ── จากนิยาย: ให้ที่อยู่เป็นของตัวเองในผัง เด่นพอ ๆ กับหมวด และรองรับหลายเรื่อง ── */
  /* 🔑 ใช้โครงเดียวกับหมวดเป๊ะ (catrow/catnode/tnode) เส้นจะได้ตรงเหมือนกัน
     พี่กันสั่ง "จากนิยาย ไม่เอาเส้นโค้ง เอาตรงไปเลยเหมือนหมวด" → เลิกวาดเส้นแยกของตัวเอง */
  const novelBlock = '<div data-r="catrow" data-el="catrow" style="display:grid;grid-template-columns:auto 1fr;gap:34px;align-items:start">'
    + '<div data-el="catnode" data-c="nv" data-col="var(--accent)" style="align-self:start;background:var(--accent);color:#fff6ec;border-radius:11px;padding:8px 14px;white-space:nowrap;box-shadow:0 7px 16px -10px rgba(40,28,14,.8),inset 0 1px 0 rgba(255,255,255,.2);animation:slideIn .45s cubic-bezier(.2,.8,.25,1) .46s both">'
    + '<div style="font-size:13px;font-weight:700;letter-spacing:.04em">จากนิยาย</div>'
    + `<div style="font-size:11px;font-weight:400;opacity:.92;line-height:1.5">Source Novels · ${n.novels.length} เรื่อง</div>` + (n.demoNovels ? '<div style="font-size:10px;letter-spacing:.06em;margin-top:5px;padding-top:5px;border-top:1px solid rgba(255,255,255,.3);opacity:.95">ตัวอย่างสมมติ</div>' : '') + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:5px;padding-top:2px;min-width:0">'
    + n.novels.map((v, i) => `<div data-el="tnode" data-id="nv.${i}" data-p="" style="display:flex;gap:9px;align-items:flex-start;background:var(--surface);border:1px solid var(--line2);border-left:4px solid var(--accent);border-radius:0 11px 11px 0;padding:7px 11px;min-width:0;animation:slideIn .4s cubic-bezier(.2,.8,.25,1) ${(0.52 + i * 0.055).toFixed(2)}s both">`
      + `<span style="flex:1;min-width:0;font-size:13.5px;line-height:1.65;color:var(--ink)">${esc(v)}</span>`
      + '<button class="edt" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:12px;padding:0 2px;font-family:inherit;line-height:1.9;flex:none">✕</button></div>').join('')
    + '<button class="sd edt" style="align-self:flex-start;font-size:11.5px;padding:3px 12px;border-radius:20px;border:1px dashed var(--line);background:none;color:var(--dim);cursor:pointer;font-family:inherit;line-height:1.7">＋ เพิ่มเรื่องที่เจอคำนี้</button>'
    + '</div></div>';

  document.getElementById('cats').innerHTML = novelBlock + cats.map(([no, g], i) => {
    const col = ramp(i, cats.length);
    return `<div data-r="catrow" data-el="catrow" style="display:grid;grid-template-columns:auto 1fr;gap:34px;align-items:start">`
      + `<div data-el="catnode" data-c="${no}" data-col="${col}" style="align-self:start;background:${col};color:#fffaf0;border-radius:11px;padding:8px 14px;white-space:nowrap;box-shadow:0 7px 16px -10px rgba(40,28,14,.8),inset 0 1px 0 rgba(255,255,255,.2);animation:slideIn .45s cubic-bezier(.2,.8,.25,1) ${(0.54 + i * 0.1).toFixed(2)}s both">`
      + `<div style="font-size:13px;font-weight:700;letter-spacing:.04em">หมวด ${no}</div>`
      + `<div style="font-size:11px;font-weight:400;opacity:.9;white-space:normal;max-width:158px;line-height:1.5">${esc(g.cat)}`
      + (g.catEn ? `<br><span style="opacity:.9;letter-spacing:.03em">${esc(g.catEn)}</span>` : '') + '</div></div>'
      + '<div style="display:flex;flex-direction:column;gap:11px;padding-top:2px;min-width:0">'
      + tree(g.list, no, col).map((b, j) =>
        `<div data-el="tnode" data-id="${b.id}" data-p="${b.p}" style="${b.style};animation:slideIn .4s cubic-bezier(.2,.8,.25,1) ${(0.6 + i * 0.1 + j * 0.055).toFixed(2)}s both">`
        + `<span style="${b.textStyle}">${esc(b.name)}`
        + (b.en ? `<span style="display:block;font-size:11px;font-weight:400;color:var(--ink2);opacity:.82;letter-spacing:.03em;line-height:1.5">${esc(b.en)}</span>` : '')
        + '</span>'
        + `<span style="${b.tailStyle}">${esc(b.tail)}</span>`
        + (b.isLeaf ? '<button class="edt" style="border:none;background:none;color:var(--faint);cursor:pointer;font-size:12px;padding:0 2px;font-family:inherit;line-height:1.9;flex:none">✕</button>' : '')
        + '</div>').join('')
      + '<button class="sd edt" style="align-self:flex-start;font-size:11.5px;padding:3px 12px;border-radius:20px;border:1px dashed var(--line);background:none;color:var(--dim);cursor:pointer;font-family:inherit;line-height:1.7">＋ เพิ่มกิ่งในหมวดนี้</button>'
      + '</div></div>';
  }).join('')
    + '<button class="sd edt" style="align-self:flex-start;font-size:12.5px;border:none;background:none;color:var(--primary);cursor:pointer;font-family:inherit;padding:0;border-bottom:1px solid var(--line)">＋ เพิ่มหมวด</button>';

  /* ── ฝั่งแก้ไข ── */
  const lab = s => `<label style="display:block;font-size:11px;letter-spacing:.08em;font-weight:600;color:var(--ink2);margin:0 0 5px">${s}</label>`;
  const sec = s => `<div style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--faint);margin:18px 0 10px;padding-top:14px;border-top:1px solid var(--line2)">${s}</div>`;
  document.getElementById('side2').innerHTML =
    '<div style="animation:fadeIn .5s ease .35s both">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">'
    + `<div style="${HEAD}">แก้ไข</div>`
    + '<div style="height:1px;flex:1;background:var(--line)"></div>'
    + '<button id="lock" class="sd" style="border:1px solid var(--line);background:var(--surface);color:var(--ink2);font-family:inherit;font-size:12px;padding:4px 13px;border-radius:16px;cursor:pointer;white-space:nowrap"></button></div>'
    + '<div id="lockhint" style="font-size:11.5px;color:var(--faint);line-height:1.7;margin-bottom:14px"></div>'
    + '<div style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--faint);margin-bottom:10px">ข้อมูลคำ</div>'
    + lab('คำ / วลี') + `<input class="f" data-k="text" value="${esc(t)}">`
    + lab('ความหมาย (ไม่บังคับ)') + `<input class="f" data-k="meaning" value="${esc(n.meaning)}" placeholder="ยังไม่ได้ใส่">`
    + sec('หมวดหมู่')
    + lab('ชนิด') + '<select class="f" data-k="kind">'
      + Object.keys(KIND).map(k => `<option${k === n.kind ? ' selected' : ''}>${KIND[k]}</option>`).join('') + '</select>'
    + lab('หมวดหลัก') + '<select class="f" data-k="cat">'
      + CATS.map(c => `<option${+c.split(' ')[0] === n.paths[0].no ? ' selected' : ''}>หมวด ${esc(c)}</option>`).join('') + '</select>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line2);flex-wrap:wrap">'
    + '<span class="edt" style="font-size:12.5px;color:var(--accent);border-bottom:1px solid var(--danger-line);cursor:pointer">ลบคำนี้</span>'
    + '<span style="flex:1"></span>'
    + '<button id="cancel" class="sd" style="padding:9px 15px;border-radius:10px;font-family:inherit;font-size:14px;cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--ink2)">ยกเลิก</button>'
    + '<button id="save" style="padding:9px 22px;border-radius:10px;font-family:inherit;font-size:14px;border:none;font-weight:600">บันทึก</button></div></div>';

  /* แอนิเมชันที่ค้างปลายทางไว้จะทับ transform ตอนชี้ค้าง พอวิ่งจบต้องล้างทิ้ง ชิ้นนั้นถึงจะขยับตอนชี้ได้ */
  /* 🔴 ล้างเฉพาะชิ้นที่ต้องขยับตอนชี้ค้างเท่านั้น
     ห้ามล้างของไฮไลต์ในวลี เพราะแอนิเมชันกวาดสีค้างสถานะปลายทางไว้ ล้างแล้วสีไฮไลต์หายเกลี้ยง (เจอจริงตอนเทส) */
  document.querySelectorAll('[data-el=leaf],[data-el=catnode],[data-el=tnode],[data-el=par],[data-el=hero]').forEach(el =>
    el.addEventListener('animationend', e => { if (e.target === el) el.style.animation = ''; }, { once: true }));

  snap = readFields();
  applyLock();
  document.querySelectorAll('#side2 .f').forEach(el => el.addEventListener('input', refreshSave));
  document.getElementById('lock').onclick = () => { locked = !locked; applyLock(); };
  document.getElementById('cancel').onclick = () => { locked = true; render(cur); };
  document.querySelectorAll('#seeds button').forEach(b =>
    b.style.cssText = seedStyle(b.dataset.sp === t));
  const bk = document.getElementById('back');
  if (bk) bk.onclick = () => { const s = stack.pop(); if (s) swap(s); };
  requestAnimationFrame(draw);
}

/* ลากเส้นโยง — ท่อร่วมมุมฉาก: เส้นตั้งฉากลงมารวมที่รางเดียวแล้วแยกเข้าปลายทาง ไม่มีเส้นไขว้ */
function draw() {
  const map = document.querySelector('[data-el=map]'), svg = document.querySelector('[data-el=svg]');
  if (!map || !svg) return;
  const R = map.getBoundingClientRect();
  /* 🔴 วัดตำแหน่งด้วย offsetLeft/offsetTop ไม่ใช่ getBoundingClientRect
     เหตุผล: การ์ดทุกใบมีแอนิเมชันลอยขึ้น (translateY + scale) ตอนเปิดหน้า
     getBoundingClientRect จะบวกการขยับนั้นเข้ามาด้วย = วัดได้คนละค่าทุกเสี้ยววินาที
     ทำให้ draw() เห็นว่า "ตำแหน่งเปลี่ยน" แล้ววาดเส้นใหม่ซ้ำ ๆ เส้นที่กำลังงอกจึงถูกรีเซ็ตกลางคัน
     offsetLeft/offsetTop เป็นค่าจากการจัดหน้าล้วน ไม่นับ transform → นิ่งตั้งแต่วินาทีแรก */
  const off = el => {
    let x = 0, y = 0, n = el;
    while (n && n !== map) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (!n) { const b = el.getBoundingClientRect(); return { x: b.left - R.left, y: b.top - R.top }; }
    return { x, y };
  };
  const rel = el => { const p = off(el); return { x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight }; };
  /* คำที่ระบายสีในวลีเป็นข้อความไหลบรรทัด ไม่ใช่กล่อง — ถ้าคำนั้นตกบรรทัด ต้องเอาชิ้นแรกเท่านั้น
     ตำแหน่งใช้ offset (ไม่นับ transform ของการ์ดวลีที่กำลังลอยขึ้น) ส่วนความกว้างเอาจากชิ้นแรกจริง */
  const relMark = el => {
    const b = el.getClientRects()[0] || el.getBoundingClientRect(), p = off(el);
    /* การ์ดวลีตอนลอยขึ้นถูกย่อไว้เล็กน้อย (scale .975 → 1) ความกว้างที่วัดได้จึงเล็กกว่าจริงนิดหน่อย
       และค่อย ๆ ขยายทุกเฟรม = เส้นขยับทีละเศษพิกเซล ทำให้ระบบเข้าใจผิดว่าเลย์เอาต์เปลี่ยน
       หารกลับด้วยอัตราย่อของการ์ด ณ ขณะนั้น ค่าที่ได้จึงคงที่ตั้งแต่เฟรมแรก */
    const card = el.closest('[data-el=hero],[data-el=par]');
    const s = card && card.offsetWidth ? card.getBoundingClientRect().width / card.offsetWidth : 1;
    return { x: p.x, y: p.y, w: b.width / (s || 1), h: b.height / (s || 1) };
  };
  const f = v => (+v).toFixed(1);
  const V = (x, y1, y2) => `M${f(x)} ${f(y1)}L${f(x)} ${f(y2)}`;
  const H = (y, x1, x2) => `M${f(x1)} ${f(y)}L${f(x2)} ${f(y)}`;
  /* เส้นหักมุมฉากตามชุดจุด มุมโค้งรัศมีเล็ก */
  const poly = pts => {
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const ux = Math.sign(p.x - a.x), uy = Math.sign(p.y - a.y);
      const vx = Math.sign(b.x - p.x), vy = Math.sign(b.y - p.y);
      if (ux === vx && uy === vy) continue;
      const r = Math.max(0, Math.min(9, Math.hypot(p.x - a.x, p.y - a.y) / 2, Math.hypot(b.x - p.x, b.y - p.y) / 2));
      d += `L${f(p.x - ux * r)} ${f(p.y - uy * r)}Q${f(p.x)} ${f(p.y)} ${f(p.x + vx * r)} ${f(p.y + vy * r)}`;
    }
    const e = pts[pts.length - 1];
    return d + `L${f(e.x)} ${f(e.y)}`;
  };
  const orth = (x1, y1, x2, y2, my) =>
    Math.abs(x2 - x1) < 2 ? V(x1, y1, y2) : poly([{ x: x1, y: y1 }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: y2 }]);
  /* ลงแล้วเลี้ยวออกขวา */
  const elbow = (x1, y1, x2, y2) => {
    const r = Math.max(2, Math.min(9, Math.abs(y2 - y1), Math.abs(x2 - x1)));
    return `M${f(x1)} ${f(y1)}L${f(x1)} ${f(y2 - r)}Q${f(x1)} ${f(y2)} ${f(x1 + r)} ${f(y2)}L${f(x2)} ${f(y2)}`;
  };
  const P = [], dots = [];
  const hero = map.querySelector('[data-el=hero]');
  if (hero) {
    const hb = rel(hero), hbot = hb.y + hb.h;
    [...map.querySelectorAll('[data-el=par]')].forEach(el => {
      const b = rel(el), pbot = b.y + b.h;
      P.push([orth(b.x + b.w / 2, pbot, hb.x + hb.w / 2, hb.y, pbot + (hb.y - pbot) * .5), 'var(--primary)', 1.7, .5, 0]);
    });
    const marks = [...hero.querySelectorAll('[data-m]')];
    const leaves = [...map.querySelectorAll('[data-el=leaf]')];
    if (leaves.length) {
      /* จับชิปเป็นแถวตามตำแหน่งจริง — แต่ละเส้นได้รางเป็นของตัวเอง ไม่วิ่งทับกัน
         เรียงราง: เส้นที่ต้องวิ่งไกลจากกลางการ์ดอยู่รางบน เส้นสั้นอยู่รางล่าง ได้รูปพัดคลี่ */
      const boxes = leaves.map(el => ({ el, b: rel(el) })), rows = [];
      boxes.forEach(o => {
        const r = rows.find(r => Math.abs(r.top - o.b.y) < 6);
        if (r) { r.items.push(o); r.bot = Math.max(r.bot, o.b.y + o.b.h); }
        else rows.push({ top: o.b.y, bot: o.b.y + o.b.h, items: [o] });
      });
      rows.sort((x, y) => x.top - y.top);
      const mapW = map.clientWidth;
      const spineL = Math.max(5, Math.min(...boxes.map(o => o.b.x)) - 14);
      const spineR = Math.min(mapW - 5, Math.max(...boxes.map(o => o.b.x + o.b.w)) + 14);
      const roomL = Math.min(...boxes.map(o => o.b.x)) - spineL >= 10;
      const roomR = spineR - Math.max(...boxes.map(o => o.b.x + o.b.w)) >= 10;
      const hc = hb.x + hb.w / 2;
      let prev = hbot;
      rows.forEach(r => {
        const gap = r.top - prev;
        r.band = [prev + gap * (rows.length > 1 ? .22 : .3), prev + gap * .82];
        prev = r.bot;
        r.conns = [];
        r.items.forEach(o => {
          const i = +o.el.dataset.k, txt = o.el.textContent;
          let m = marks.find(x => +x.dataset.m === i), dash = 0;
          if (!m) { m = marks.find(x => x.textContent.includes(txt)); dash = 1; }
          if (!m) return;
          const a = relMark(m);
          r.conns.push({
            k: i,
            sx: Math.min(Math.max(a.x + a.w / 2, hb.x + 10), hb.x + hb.w - 10),
            cx: o.b.x + o.b.w / 2, top: o.b.y, c: PAL[i % PAL.length], dash
          });
        });
        const nn = r.conns.length;
        [...r.conns].sort((p, q) => Math.abs(q.cx - hc) - Math.abs(p.cx - hc))
          .forEach((o, k) => { o.lane = r.band[0] + (nn > 1 ? k * (r.band[1] - r.band[0]) / (nn - 1) : 0); });
      });
      rows.forEach((r, ri) => r.conns.forEach((o, k) => {
        /* ชิปที่ตกไปแถวถัด ๆ ไป เลี้ยวลงข้างที่ใกล้ชิปเป้าหมายที่สุด (และมีที่ว่างพอ) */
        const right = roomR && (o.cx > hc || !roomL);
        const spine = right ? spineR - k * 3.5 : spineL + k * 3.5;
        const y0 = rows[0].band[0] - 5 - k * 3.5;
        const pts = ri === 0
          ? [{ x: o.sx, y: hbot }, { x: o.sx, y: o.lane }, { x: o.cx, y: o.lane }, { x: o.cx, y: o.top }]
          : [{ x: o.sx, y: hbot }, { x: o.sx, y: y0 }, { x: spine, y: y0 },
             { x: spine, y: o.lane }, { x: o.cx, y: o.lane }, { x: o.cx, y: o.top }];
        P.push([poly(pts), o.c, o.dash ? 1.3 : 1.9, o.dash ? .55 : .95, o.dash, o.k]);
        dots.push([o.sx, hbot, o.c, 2.4, .9, P.length - 1, 0]);
      }));
    }
    /* ลำต้นของหมวด: เส้นตั้งเส้นเดียวจากใต้การ์ด แตกข้อศอกเข้าแต่ละหมวด */
    const nodes = [...map.querySelectorAll('[data-el=catnode]')];
    if (nodes.length) {
      const trunk = Math.max(6, hb.x + 15);
      const stop = rel(nodes[nodes.length - 1]);
      P.push([V(trunk, hbot, stop.y + 17), 'var(--line)', 1.6, 1, 0]);
      dots.push([trunk, hbot, 'var(--primary)', 3, .45, P.length - 1, 0]);
      nodes.forEach(node => {
        const a = rel(node), c = node.dataset.col || 'var(--primary)';
        P.push([elbow(trunk, Math.max(hbot, a.y - 10), a.x, a.y + 17), c, 1.8, .9, 0, null, node.dataset.c]);
      });
    }
  }
  /* ในแต่ละหมวด: รางตั้งหนึ่งรางต่อหนึ่งชั้น แตกเส้นสั้นเข้าลูกของชั้นนั้น */
  map.querySelectorAll('[data-el=catrow]').forEach(row => {
    const node = row.querySelector('[data-el=catnode]'); if (!node) return;
    const a = rel(node), c = node.dataset.col || 'var(--primary)';
    const nodes = [...row.querySelectorAll('[data-el=tnode]')].map(el => ({ b: rel(el), id: el.dataset.id, p: el.dataset.p }));
    if (!nodes.length) return;
    const anchor = o => o.b.y + Math.min(o.b.h / 2, 15);
    const byId = new Map(nodes.map(o => [o.id, o])), groups = new Map();
    nodes.forEach(o => { const k = o.p || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
    groups.forEach((kids, pid) => {
      const par = byId.get(pid);
      const gd = kids[0].id.split('.').length - 2, gc = tint(c, gd + 1);
      let railX, startY, deep = !!par;
      if (par) { railX = par.b.x + 11; startY = par.b.y + par.b.h - 1; }
      else if (kids[0].b.y > a.y + a.h - 4) { railX = a.x + 20; startY = a.y + a.h; }
      else { railX = a.x + a.w + 15; startY = a.y + 17; P.push([H(startY, a.x + a.w, railX), gc, 1.6, .7, 0, null, node.dataset.c]); }
      P.push([V(railX, startY, anchor(kids[kids.length - 1])), gc, deep ? 1.2 : 1.4, deep ? .5 : .6, 0, null, node.dataset.c]);
      kids.forEach(o => {
        const y = anchor(o);
        P.push([H(y, railX, o.b.x), gc, deep ? 1.2 : 1.4, deep ? .55 : .65, 0, null, node.dataset.c]);
        dots.push([o.b.x, y, gc, deep ? 1.7 : 2, .7, P.length - 1, 1]);
      });
    });
  });
  /* 🔴 ต้นเหตุที่เส้น "ไม่งอก" — draw() ถูกเรียกซ้ำหลายรอบตอนเปิดหน้า (0 · 150 · 500 · 1200 มิลลิวินาที
     เผื่อฟอนต์โหลดช้าแล้วเลย์เอาต์ขยับ) รอบหลัง ๆ วาด SVG ทับใหม่โดยไม่ใส่แอนิเมชัน
     เส้นที่กำลังงอกอยู่จึงถูกแทนที่ด้วยเส้นเต็มทันที คนดูเลยเห็นแต่เส้นค้าง ไม่เคยเห็นตอนงอกเลย
     แก้: ถ้าตำแหน่งทุกชิ้นเหมือนเดิมเป๊ะ ไม่ต้องวาดใหม่ ปล่อยให้เส้นงอกต่อจนจบ */
  const sig = map.clientWidth + 'x' + map.clientHeight + '|' + cur + '|'
    + P.map(x => x[0]).join('') + '|' + dots.map(d => f(d[0]) + ',' + f(d[1])).join(';');
  if (sig !== drawSig || !svg.childNodes.length) {
    drawSig = sig;
    svg.setAttribute('viewBox', `0 0 ${map.clientWidth} ${map.clientHeight}`);
    const seq = i => 0.3 + i * .055;
    /* 🪡 เส้นประต้องงอก "เป็นเส้นประตั้งแต่แรก" ไม่ใช่งอกทึบแล้วแวบเป็นประตอนจบ (พี่กันสั่ง)
       ทำด้วยหน้ากาก (mask): เส้นประวาดเต็มเส้นไว้ตั้งแต่ต้น แต่ถูกหน้ากากบังไว้หมด
       แล้วค่อยเปิดหน้ากากไล่จากต้นเส้นไปปลายเส้น → ตาเห็นขีดประโผล่ทีละขีดตามแนวเส้น
       (ใช้กลไกงอกเดิมกับ "เส้นในหน้ากาก" แทนตัวเส้นจริง)
       ⚠️ ต้องตั้ง maskUnits="userSpaceOnUse" พร้อมกรอบเต็มผัง — ค่าตั้งต้นอิงกรอบของรูป
       ซึ่งเส้นตรงมีความสูงเป็นศูนย์ หน้ากากจะแบนจนบังหมดทั้งเส้น */
    let defs = '';
    const MW = map.clientWidth, MH = map.clientHeight;
    const body = P.map(([d, c, w, o, dash, lk, grp], i) => {
      let extra = ' data-anim="1"';
      if (dash) {
        defs += `<mask id="mk${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}">`
          + `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w + 6}" stroke-linejoin="round" stroke-linecap="round"`
          + ` data-anim="1" style="animation-delay:${seq(i).toFixed(2)}s"/></mask>`;
        extra = ` stroke-dasharray="4 5" mask="url(#mk${i})"`;
      }
      return `<path id="ln${i}" d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="${o}"`
        + (lk != null ? ` data-leaf="${lk}"` : '') + (grp != null ? ` data-cat="${grp}"` : '')
        + `${extra} style="animation-delay:${seq(i).toFixed(2)}s"/>`;
    }).join('')
      /* จุดต่อของแต่ละเส้นผุดขึ้นตรงจังหวะที่เส้นนั้นงอกมาถึงพอดี
         (จุดต้นทางผุดตอนเส้นเริ่มออก · จุดปลายทางผุดตอนเส้นงอกจนสุด) ไม่ใช่ผุดพร้อมกันหมด */
      + dots.map(([x, y, c, r, o, pi, end]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${c}" opacity="${o}"`
        + ` style="transform-box:fill-box;transform-origin:center;animation:dotIn .34s cubic-bezier(.2,.9,.3,1) ${(seq(pi || 0) + (end ? 1 : .1)).toFixed(2)}s both"/>`).join('');
    svg.innerHTML = (defs ? `<defs>${defs}</defs>` : '') + body;
    /* เก็บกวาดเส้นยาวศูนย์ — เกิดตอนกิ่งชั้นนั้นมีลูกตัวเดียวและอยู่ระดับเดียวกับราง วาดไปก็มองไม่เห็น
       (เส้นในหน้ากากมีรูปเดียวกับเส้นจริง จึงถูกเก็บกวาดไปพร้อมกัน ไม่มีหน้ากากค้างเปล่า) */
    svg.querySelectorAll('path').forEach(q => { if (q.getTotalLength() < 2) q.remove(); });
    /* วาดเส้นแบบไล่ทีละเส้นเฉพาะตอนเปลี่ยนคำ — ถ้าวาดใหม่เพราะเลย์เอาต์ขยับ ให้ขึ้นเต็มเส้นทันที
       ใช้ transition ไม่ใช่ animation เพื่อให้จบที่ dashoffset 0 เสมอ แม้ถูกขัดกลางทาง */
    /* งอกใหม่ถ้า (ก) เพิ่งเปลี่ยนคำ หรือ (ข) เลย์เอาต์เพิ่งขยับระหว่างที่เส้นยังงอกไม่จบ
       ข้อ (ข) สำคัญมากตอนเปิดหน้าครั้งแรก — ฟอนต์โหลดเสร็จราว 150 มิลลิวินาที เลย์เอาต์ขยับ
       ต้องวาดใหม่ ถ้าไม่ให้งอกซ้ำ เส้นจะเด้งเต็มทันทีตั้งแต่ยังไม่ทันเห็นว่ามันงอก */
    const fresh = animKey !== cur || performance.now() - animAt < 2200;
    if (animKey !== cur) { animKey = cur; animAt = performance.now(); }
    if (fresh) svg.querySelectorAll('path[data-anim]').forEach(q => {
      const L = q.getTotalLength().toFixed(0), d = q.style.animationDelay || '0s';
      q.style.strokeDasharray = L; q.style.strokeDashoffset = L;
      q.getBoundingClientRect();
      q.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.22,.9,.28,1) ${d}`;
      q.style.strokeDashoffset = '0';
    });
  }

  /* ชี้ค้างที่ใบไม้คำสกัด = คำนั้นในวลีสว่างขึ้น และเส้นที่โยงถึงกันหนาขึ้นพร้อมกัน
     ทำให้เห็นทันทีว่าคำนี้มาจากช่วงไหนของวลี โดยไม่ต้องไล่สายตาตามเส้น */
  map.querySelectorAll('[data-el=leaf]').forEach(el => {
    const i = el.dataset.k;
    /* ค้นเส้นตอนชี้จริง ไม่เก็บไว้ล่วงหน้า เพราะ draw() วาดเส้นใหม่ได้หลายรอบ (ตอนย่อจอ ตอนฟอนต์โหลดเสร็จ)
       ถ้าเก็บไว้จะชี้ไปที่เส้นเก่าที่ถูกลบไปแล้ว แล้วไฮไลต์ไม่ขึ้น */
    const set = on => {
      el.style.transform = on ? 'translateY(-3px) scale(1.05)' : '';
      el.style.boxShadow = on ? '0 10px 20px -8px rgba(40,28,14,.8),inset 0 1px 0 rgba(255,255,255,.3)' : '';
      const mark = document.querySelector(`[data-m="${i}"]`);
      if (mark) { mark.style.transition = 'filter .2s'; mark.style.filter = on ? 'saturate(1.6) brightness(.95)' : ''; }
      document.querySelectorAll(`#svg [data-leaf="${i}"]`).forEach(p => {
        p.style.strokeWidth = on ? '3.4' : ''; p.style.opacity = on ? '1' : '';
      });
    };
    /* ใช้ onmouseenter (แทนที่ของเดิม) ไม่ใช่ addEventListener ไม่งั้นตัวฟังซ้อนกันทุกครั้งที่วาดใหม่ */
    el.onmouseenter = () => set(1);
    el.onmouseleave = () => set(0);
    el.onfocus = () => set(1);
    el.onblur = () => set(0);
  });

  /* ชี้ค้างที่ป้ายหมวด = กิ่งทั้งหมดของหมวดนั้นสว่างขึ้น พร้อมรางที่โยงถึงกันหนาขึ้น
     หมวดอื่นหรี่ลง เห็นขอบเขตของหมวดนั้นทันทีโดยไม่ต้องกวาดสายตา */
  map.querySelectorAll('[data-el=catnode]').forEach(node => {
    const row = node.closest('[data-el=catrow]'), no = node.dataset.c;
    const set = on => {
      map.querySelectorAll('[data-el=catrow]').forEach(r => {
        r.style.transition = 'opacity .22s ease';
        r.style.opacity = on && r !== row ? '.42' : '';
      });
      row.querySelectorAll('[data-el=tnode]').forEach(b => {
        b.style.boxShadow = on ? '-3px 6px 18px -12px rgba(40,28,14,.9)' : '';
        b.style.borderLeftWidth = on ? '7px' : '';
      });
      if (no) svg.querySelectorAll(`[data-cat="${no}"]`).forEach(p => {
        p.style.strokeWidth = on ? String(+p.getAttribute('stroke-width') + 1.4) : '';
        p.style.opacity = on ? '1' : '';
      });
    };
    node.onmouseenter = () => set(1);
    node.onmouseleave = () => set(0);
  });
}

const seedStyle = active => 'border:none;background:none;font-family:inherit;font-size:14.5px;cursor:pointer;'
  + 'padding:3px 2px;line-height:1.6;border-bottom:1.5px solid '
  + (active ? 'var(--accent);color:var(--accent)' : 'transparent;color:var(--ink2)');
/* ป้ายกำกับใต้ชื่อตัวอย่าง บอกว่าตัวอย่างนั้นมีไว้โชว์อะไร
   เดิมมีแต่ชื่อคำเปล่า ๆ ทำให้ตัวอย่าง "เจอในหลายเรื่อง" ถูกมองข้ามเพราะต้องกดเข้าไปถึงจะเห็น */
const seedNote = s => {
  const n = N[s]; if (!n) return '';
  const nv = (n.novels || []).length, pa = (n.parents || []).length, kids = (n.kids || []).length;
  const cats = new Set((n.paths || []).map(b => b.no)).size;
  if (nv > 2) return nv + ' เรื่อง';
  if (kids > 2) return 'แตก ' + kids + ' คำ';
  if (pa > 1) return 'มาจาก ' + pa + ' วลี';
  if (cats > 1) return cats + ' หมวด';
  return '';
};
document.getElementById('seeds').innerHTML = D.seeds.map(s => {
  const note = seedNote(s);
  return `<button data-sp="${esc(s)}" style="${seedStyle(false)}">${esc(s.length > 26 ? s.slice(0, 24) + '…' : s)}`
    + (note ? `<span style="display:block;font-size:11px;color:var(--ink3);letter-spacing:.02em;margin-top:1px">${esc(note)}</span>` : '')
    + `</button>`;
}).join('');

/* เปลี่ยนคำ: ให้ผังเดิมจางออกก่อนสั้น ๆ แล้วผังใหม่ค่อยไล่จังหวะเข้า ตาจะตามทัน ไม่กระตุก */
function swap(t) {
  const map = document.getElementById('map');
  if (!map) { cur = t; locked = true; return render(t); }
  map.style.opacity = '0'; map.style.transform = 'translateY(10px) scale(.995)';
  setTimeout(() => {
    cur = t; locked = true; render(t);
    map.style.opacity = ''; map.style.transform = '';
  }, 175);
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { const t = g.dataset.go; if (N[t] && t !== cur) { stack.push(cur); swap(t); } return; }
  const s = e.target.closest('[data-sp]');
  if (s && s.dataset.sp !== cur) { stack = []; swap(s.dataset.sp); }
});
document.getElementById('tog').onclick = () => {
  const r = document.documentElement;
  theme = (theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark';
  r.dataset.theme = theme;
  document.getElementById('tog').textContent = theme === 'dark' ? 'โหมดกลางวัน' : 'โหมดกลางคืน';
  requestAnimationFrame(draw);
};
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 150); });
if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(draw, 150); }).observe(document.body);
if (document.fonts) document.fonts.ready.then(() => draw());
[0, 150, 500, 1200].forEach(ms => setTimeout(draw, ms));
/* วาดซ้ำอีกรอบตอนฟอนต์ลงตัวจริง เผื่อบางเครื่องรายงาน fonts.ready เร็วกว่าที่จัดหน้าเสร็จ */
setTimeout(draw, 2600);

document.getElementById('foot').textContent =
  `คำ วลี และกิ่งทุกอันในหน้านี้ดึงมาจากคลังจริง · ตัวเลขที่ทำให้ต้องมีระบบนี้ — ${F.crossOld} คำในคลังเดิมถูกแตกเป็น ${F.dupRows} แถวเพราะคำหนึ่งอยู่ได้หมวดเดียว · ${F.overlap} คำมีอยู่ทั้งสองคลัง · ${F.multiCat} คำในคลังชุดใหม่เกาะกิ่งข้ามหมวด`;
cur = D.seeds[0];
render(cur);
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
