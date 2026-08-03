#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""หน้าแผนที่คลังคำ → docs/final/map.html — เจ้าของคลังขอเอง 3 ส.ค. 2569

    _"สร้างต้นไม้ให้เราดูหน่อย เเละอธิบายแต่ละไฟล์ เราอยากเห้นภาพ"_

หน้าเดียวจบ 3 ส่วน
  ๑ แผนผัง — ของไหลจากไฟล์ไหนไปไฟล์ไหน (mermaid)
  ๒ ไฟล์แต่ละตัวคืออะไร — จัดกลุ่มตาม "บทบาท" ไม่ใช่ตามโฟลเดอร์
      เพราะสิ่งที่ต้องรู้ก่อนแตะไฟล์คือ "แก้ได้ไหม" ไม่ใช่ "อยู่ที่ไหน"
  ๓ ต้นไม้คลังคำ — 14 หมวด → กิ่ง → คำ ทั้ง 2,809 คำ

ใช้:  python3 scripts/gen_map_html.py
"""
import json, os, html, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('docs/final/map.html')
e = lambda s: html.escape(str(s or ''))

# สีประจำหมวด — เลือกให้อยู่ในโทนหมึกบนกระดาษ ไม่ใช่สีจอ
HUE = {1: 28, 2: 344, 3: 8, 4: 220, 5: 288, 6: 152, 7: 44, 8: 262,
       10: 194, 11: 36, 12: 310, 13: 176, 14: 0, 15: 96}

# ── บทบาทของไฟล์ = สิ่งที่ต้องรู้ก่อนแตะ ───────────────────────────────
ROLE = {
    'src':  ('แก้ที่นี่', 'แหล่งความจริง — ที่เดียวที่ควรพิมพ์แก้ด้วยมือ'),
    'gen':  ('ห้ามแก้มือ', 'สร้างอัตโนมัติ — แก้ไปก็หายตอนรันตัวสร้างรอบหน้า'),
    'wait': ('รอเคาะ', 'ผลงานที่ทำเสร็จแล้วแต่ยังไม่ได้เขียนลงคลัง'),
    'lock': ('ห้ามแตะ', 'บันทึกประวัติ — ใช้พิสูจน์ว่าคำไม่หายระหว่างทาง'),
    'old':  ('งานเก่า', 'จบรอบไปแล้ว เก็บไว้เป็นประวัติ'),
    'rule': ('คู่มือ', 'กฎและทะเบียนที่ยังอ่านอยู่'),
}

FILES = [
    ('src', 'docs/catN-*-redesign.md', '14 ไฟล์ · ไฟล์ละหมวด',
     'แหล่งความจริงของ<b>โครงกิ่ง</b>ทั้งคลัง — ชื่อกิ่ง นิยาม ชื่ออังกฤษ และคำของเล่ม '
     '<i>เสียงกระซิบจากความมืด</i> · เก็บ<b>เหตุผลของทุกกิ่ง</b>ไว้ด้วย (ใครเสนอ ทำไมตั้ง เคยแย้งกันเรื่องอะไร) '
     'ซึ่งเป็นของที่หายแล้วหาคืนไม่ได้'),
    ('src', 'docs/newwords-branches.json', 'คลังชุดใหม่',
     'คำของเล่ม <i>คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ</i> 1,889 แถว · '
     'สร้างใหม่ไม่ได้แล้วเพราะไฟล์โจทย์ต้นทางไม่ได้เก็บในเรพ จึงต้องแก้ตรง ๆ ผ่านสคริปต์ที่มีด่านตรวจ'),
    ('gen', 'docs/branches-data.json', 'โครงกิ่งฉบับเครื่องอ่าน',
     'ตัวสร้างอ่าน 14 ไฟล์หมวดแล้วแตกออกมาเป็นข้อมูล — 804 กิ่ง 14 หมวด · '
     'ทุกสคริปต์ที่ต้องรู้ว่า “มีกิ่งอะไรบ้าง” อ่านจากไฟล์นี้'),
    ('gen', 'docs/branches-clean.md<br>docs/branches-data.md', 'โครงกิ่งฉบับคนอ่าน',
     'อันแรกเป็นกิ่งล้วนไม่มีคำ อันหลังมีคำใต้แต่ละกิ่ง'),
    ('gen', 'docs/oldwords-branches.json', 'คลังเดิมฉบับเครื่องอ่าน',
     'คำของเล่มแรกที่แกะออกมาจากชิปในไฟล์หมวด พร้อมเส้นเชื่อมว่าคำไหนตัดมาจากวลีไหน'),
    ('gen', 'docs/final/wordbank.json', '⭐ ตัวที่จะขึ้นฐานข้อมูล',
     'รวมสองเล่มเป็นชุดเดียว 2,809 คำ · แต่ละคำมีหมวด กิ่งทุกเส้นพร้อมรหัส ความหมาย '
     'ชื่อเรื่องที่เจอ และเส้นเชื่อมไปวลีแม่'),
    ('gen', 'docs/final/wordbank.md<br>docs/final/branches.md', 'ฉบับเปิดอ่าน',
     'อันแรกเป็นต้นไม้ หมวด → กิ่ง → คำ · อันหลังเป็นกิ่งล้วน ดูได้ว่ากิ่งไหนยังไม่มีคำ'),
    ('lock', 'docs/branch-codes.json', 'ทะเบียนรหัสกิ่ง',
     'รหัสประจำกิ่งแบบ <code>A01-02-003</code> · <b>รหัสห้ามเลื่อนตลอดกาล</b> — '
     'กิ่งที่เปลี่ยนชื่อยกรหัสเดิมตามไป กิ่งที่หายไปขึ้นชั้นปลดระวางแต่ไม่เอาเลขมาใช้ซ้ำ'),
    ('wait', 'docs/m2-sense/', 'รอบทบทวนทั้งคลัง',
     'ผลทบทวน 2,814 รายการ ที่ผู้ช่วยตัดสินโดย<b>ไม่เห็นวลีตั้งต้น</b> '
     '(เพื่อไม่ให้ลอกกิ่งของวลีแม่มาแปะคำลูก) · <b>ยังไม่ได้เขียนลงคลัง</b> '
     'รอเจ้าของคลังตัดสินว่าจะเอาลงเมื่อไหร่'),
    ('lock', 'docs/oldwords/', 'สำเนาตั้งต้น',
     'สแนปช็อตคลังก่อนเริ่มงานเกลา + บันทึกดิบทุกรอบ · เป็นหลักฐานเดียวที่พิสูจน์ได้ว่าคำเดิมไม่หาย'),
    ('rule', 'RULES.md', 'กฎทั้งหมด',
     'เด้งเข้าความจำอัตโนมัติทุกครั้งที่เปิดงาน · กฎอยู่ที่นี่ที่เดียว'),
    ('rule', 'docs/TODO.md<br>docs/RULE-VIOLATIONS.md<br>docs/word-dedup-design.md<br>docs/grooming-filemap.md<br>docs/AI-MODEL-TEST.md',
     'ทะเบียนและคู่มือ',
     'งานค้าง · ทะเบียนการทำผิดกฎ · แบบร่างระบบใยแมงมุม · แผนที่ไฟล์ตอนเกลาหมวด · ผลทดสอบ AI'),
    ('old', 'docs/archive/', 'งานเก่า 5 กอง',
     'บันทึกท้ายวัน 56 ไฟล์ · รอบเก็บคลังชุดใหม่ · รอบเกลาคลังเดิม · ข้อมูลดิบผลทดสอบ AI · เบ็ดเตล็ด · '
     '<b>ไม่ลบอะไรเลย</b> หลายไฟล์เป็นงานที่เจ้าของคลังลงแรงคัดเอง'),
]

SCRIPTS = [
    ('gen_branches.py', 'อ่าน 14 ไฟล์หมวด → เขียนโครงกิ่ง 3 ไฟล์'),
    ('gen_branch_codes.py', 'ออกรหัสให้กิ่งใหม่ · ยกรหัสเดิมให้กิ่งที่เปลี่ยนชื่อ'),
    ('gen_oldwords_json.py', 'แกะคำเล่มแรกออกจากชิป + ต่อเส้นเชื่อมไปวลีแม่'),
    ('gen_final.py', 'รวมสองเล่ม → docs/final/'),
    ('gen_map_html.py', 'สร้างหน้านี้'),
    ('spellfix.py', 'ทะเบียนคำที่แก้สะกดแล้ว + กฎเว้นวรรคไม้ยมก'),
]

# ── ผังการไหล — วาดเองด้วย CSS ไม่ใช้ไลบรารีวาดผัง ────────────────────
#    เหตุผล: ไลบรารีวาดผังเรนเดอร์เฉพาะตอนขึ้นเว็บ เปิดไฟล์ตรง ๆ จะเห็นเป็นโค้ดดิบ
#    ผังนี้จึงวาดด้วยกล่องกับเส้นธรรมดา ขึ้นเหมือนกันทุกที่ที่เปิด
FLOW = [
    ('src',  ['docs/catN-*-redesign.md<i>14 ไฟล์หมวด · โครงกิ่ง + คำเล่มแรก</i>']),
    ('run',  ['gen_branches.py']),
    ('file', ['branches-data.json<i>804 กิ่ง 14 หมวด</i>']),
    ('run',  ['gen_branch_codes.py']),
    ('file', ['branch-codes.json<i>ทะเบียนรหัส — เติมรหัสกลับเข้าไฟล์บน</i>']),
    ('run',  ['gen_oldwords_json.py']),
    ('pair', ['oldwords-branches.json<i>คำเล่มแรก + เส้นเชื่อมไปวลีแม่</i>',
              'docs/newwords-branches.json<i>คำเล่มสอง · แหล่งความจริง</i>']),
    ('run',  ['gen_final.py']),
    ('out',  ['docs/final/wordbank.json<i>2,809 คำ · รวมสองเล่มแล้ว</i>']),
    ('wait', ['Supabase<i>ยังไม่อัป — รอ 014_word_web.sql</i>']),
]

CSS = '''
:root{
  --paper:#f2ece0; --paper2:#e9e1d1; --card:#fbf7ee; --sunk:#ece4d4;
  --ink:#33291f; --ink2:#5d5040; --muted:#8b7d69;
  --line:#d9cfba; --line2:#e7dfcd;
  --src:#4a7340; --gen:#3d6580; --wait:#a3761d; --lock:#96382a; --old:#8b8172; --rule:#6b5a86;
  --shadow:0 1px 2px rgba(80,62,38,.05),0 4px 14px rgba(80,62,38,.06);
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --serif:Georgia,"Times New Roman",serif;
  --thai:"Sarabun","Noto Sans Thai","Leelawadee UI",system-ui,-apple-system,sans-serif;
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#1c1813; --paper2:#161310; --card:#262019; --sunk:#201b15;
    --ink:#ece2d2; --ink2:#c2b5a0; --muted:#948674;
    --line:#3b332a; --line2:#2e2820;
    --src:#8fbc7e; --gen:#82aecd; --wait:#d7ab55; --lock:#e08871; --old:#a2988a; --rule:#ab97cc;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 4px 16px rgba(0,0,0,.34);
  }
}
:root[data-theme="light"]{
  --paper:#f2ece0; --paper2:#e9e1d1; --card:#fbf7ee; --sunk:#ece4d4;
  --ink:#33291f; --ink2:#5d5040; --muted:#8b7d69;
  --line:#d9cfba; --line2:#e7dfcd;
  --src:#4a7340; --gen:#3d6580; --wait:#a3761d; --lock:#96382a; --old:#8b8172; --rule:#6b5a86;
}
:root[data-theme="dark"]{
  --paper:#1c1813; --paper2:#161310; --card:#262019; --sunk:#201b15;
  --ink:#ece2d2; --ink2:#c2b5a0; --muted:#948674;
  --line:#3b332a; --line2:#2e2820;
  --src:#8fbc7e; --gen:#82aecd; --wait:#d7ab55; --lock:#e08871; --old:#a2988a; --rule:#ab97cc;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--thai);
  font-size:16px;line-height:1.72;-webkit-font-smoothing:antialiased}
.wrap{max-width:940px;margin:0 auto;padding:26px 18px 100px;display:flex;flex-direction:column;gap:38px}
h1,h2,h3{font-family:var(--serif);text-wrap:balance;line-height:1.2;margin:0}
code{font-family:var(--mono);font-size:.86em;background:var(--sunk);padding:1px 5px;border-radius:4px}

/* หัวเรื่อง */
.top{display:flex;flex-direction:column;gap:14px;padding-bottom:26px;border-bottom:2px solid var(--line)}
.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700}
h1{font-size:clamp(28px,5.6vw,40px)}
.lede{color:var(--ink2);font-size:15.5px;max-width:62ch;margin:0}
.stats{display:flex;flex-wrap:wrap;gap:9px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:9px 14px;
  display:flex;flex-direction:column;gap:1px;min-width:88px}
.stat b{font-family:var(--serif);font-size:23px;line-height:1;font-variant-numeric:tabular-nums}
.stat span{font-size:11.5px;color:var(--muted)}

section{display:flex;flex-direction:column;gap:16px}
.sechead{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
  padding-bottom:8px;border-bottom:1px solid var(--line)}
.sechead h2{font-size:22px}
.sechead .n{font-family:var(--thai);font-weight:700;font-size:13px;color:var(--muted);
  border:1px solid var(--line);border-radius:20px;padding:1px 11px}
.sechead p{margin:0;font-size:13.5px;color:var(--muted);flex:1 1 100%}

/* แผนผัง */
.diagram{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:22px 18px;box-shadow:var(--shadow)}
.pipe{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:0}
.node{width:100%;max-width:420px;border-radius:10px;padding:10px 15px;text-align:center;
  font-family:var(--mono);font-size:13px;line-height:1.45;border:1px solid var(--line);background:var(--sunk)}
.node i{display:block;font-family:var(--thai);font-style:normal;font-size:12px;
  color:var(--muted);margin-top:3px}
.node.src{border:2px solid var(--src);background:color-mix(in srgb,var(--src) 9%,var(--card));color:var(--ink)}
.node.file{background:var(--sunk)}
.node.run{max-width:300px;border-radius:22px;border-style:dashed;border-color:var(--gen);
  color:var(--gen);background:transparent;font-weight:700}
.node.out{border:2px solid var(--gen);background:color-mix(in srgb,var(--gen) 11%,var(--card));font-weight:700}
.node.wait{border-style:dashed;border-color:var(--wait);color:var(--wait);background:transparent}
.link{width:2px;height:16px;background:var(--line);flex:none}
.link.dash{background:repeating-linear-gradient(var(--wait) 0 4px,transparent 4px 8px)}
.pair{display:flex;gap:14px;width:100%;max-width:620px;align-items:stretch}
.pair .node{max-width:none;flex:1;display:flex;flex-direction:column;justify-content:center}
@media (max-width:700px){
  .diagram{padding:18px 12px}
  .pair{flex-direction:column;gap:10px}
  .node,.node.run{max-width:none}
}

/* การ์ดไฟล์ */
.legend{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;
  border:1px solid var(--line);border-radius:20px;padding:3px 12px 3px 8px;background:var(--card)}
.dot{width:9px;height:9px;border-radius:50%;flex:none}
.files{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:12px}
.file{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--rl);
  border-radius:10px;padding:13px 15px;display:flex;flex-direction:column;gap:6px;box-shadow:var(--shadow)}
.file .path{font-family:var(--mono);font-size:12.5px;color:var(--rl);font-weight:700;word-break:break-word}
.file .ttl{font-family:var(--serif);font-size:16px}
.file .desc{font-size:13.5px;color:var(--ink2);line-height:1.62}
.file .tag{align-self:flex-start;font-size:11px;font-weight:700;letter-spacing:.04em;
  color:var(--rl);border:1px solid var(--rl);border-radius:4px;padding:0 6px;opacity:.85}

/* ตารางสคริปต์ */
.tblwrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:440px}
th{text-align:left;font-family:var(--serif);font-weight:700;font-size:13px;color:var(--muted);
  padding:9px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:8px 14px;border-bottom:1px solid var(--line2);color:var(--ink2);vertical-align:top}
tr:last-child td{border-bottom:none}
td:first-child{font-family:var(--mono);font-size:12.5px;color:var(--ink);white-space:nowrap}

/* ต้นไม้ */
.tree{display:flex;flex-direction:column;gap:9px}
details.cat{background:var(--card);border:1px solid var(--line);border-radius:12px;
  overflow:hidden;box-shadow:var(--shadow)}
details.cat>summary{cursor:pointer;list-style:none;padding:13px 16px;display:flex;
  align-items:center;gap:12px;background:linear-gradient(90deg,var(--tint),transparent 62%)}
details.cat>summary::-webkit-details-marker{display:none}
details.cat>summary:focus-visible{outline:2px solid var(--hue);outline-offset:-2px}
.catno{flex:none;width:30px;height:30px;border-radius:8px;background:var(--hue);color:#fff;
  display:grid;place-items:center;font-family:var(--serif);font-size:15px;font-weight:700;
  font-variant-numeric:tabular-nums}
.catttl{flex:1;min-width:0;font-family:var(--serif);font-size:16.5px}
.catttl i{display:block;font-size:12px;color:var(--muted);font-family:var(--serif)}
.catcnt{flex:none;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;text-align:right}
.arw{flex:none;color:var(--hue);transition:transform .18s}
details.cat[open]>summary .arw{transform:rotate(90deg)}
.catbody{padding:4px 16px 16px;display:flex;flex-direction:column;gap:11px}
.catdef{font-size:13px;color:var(--ink2);font-style:italic;
  border-left:3px solid var(--hue);padding:2px 0 2px 11px}
.br{display:flex;flex-direction:column;gap:5px;padding-left:calc(var(--d) * 15px)}
.brh{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.brh .name{font-weight:700;font-size:14px}
.brh .code{font-family:var(--mono);font-size:11px;color:var(--muted);
  border:1px solid var(--line);border-radius:4px;padding:0 5px}
.brh .en{font-family:var(--serif);font-style:italic;font-size:12px;color:var(--muted)}
.brh .def{flex:1 1 100%;font-size:12.5px;color:var(--muted);line-height:1.55}
.ws{display:flex;flex-wrap:wrap;gap:5px}
.w{background:var(--sunk);border:1px solid var(--line2);border-radius:7px;
  padding:2px 9px;font-size:13.5px}
.w.two{border-color:var(--hue);box-shadow:inset 2.5px 0 0 var(--hue)}
.empty{font-size:12px;color:var(--muted);font-style:italic}
.note{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--wait);
  border-radius:9px;padding:12px 15px;font-size:13.5px;color:var(--ink2)}
.note b{color:var(--ink)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
'''


def lvl(path):
    return path.count(' / ')


def main():
    src = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    fin = json.load(open(P('docs/final/wordbank.json'), encoding='utf-8'))
    meta = fin['meta']

    # คีย์ด้วย (หมวด, เส้นทาง) ไม่ใช่เส้นทางล้วน — มีกิ่ง 2 เส้นที่ชื่อซ้ำกันข้ามหมวด
    # (สถานที่ · อาหารและเครื่องดื่ม) ถ้าคีย์ด้วยเส้นทางอย่างเดียว คำจะโผล่ผิดหมวด
    inbr = collections.defaultdict(list)
    for w in fin['words']:
        for l in w['branches']:
            inbr[(l['category_id'], l['path'])].append(w)

    L = ['<title>แผนที่คลังคำ</title>',
         '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<style>%s</style>' % CSS, '<div class="wrap">']

    # ── หัวเรื่อง ────────────────────────────────────────────────────
    L.append('<header class="top">')
    L.append('<div class="eyebrow">คลังคำ · Word Bank</div>')
    L.append('<h1>แผนที่คลัง — ของอยู่ที่ไหน ไหลไปทางไหน</h1>')
    L.append('<p class="lede">คลังคำมาจากนิยายสองเล่มที่เก็บคนละรอบ คนละรูปแบบไฟล์ '
             'หน้านี้ตอบสามอย่าง — ไฟล์ไหนแก้ได้ไฟล์ไหนห้ามแตะ · ของไหลจากไหนไปไหน · '
             'และในคลังมีอะไรอยู่บ้างจริง ๆ</p>')
    L.append('<div class="stats">')
    for b, s in [(meta['คำไม่ซ้ำ'], 'คำไม่ซ้ำ'), (meta['เส้นเชื่อมคำ-กิ่ง'], 'เส้นเชื่อมคำ–กิ่ง'),
                 (meta['กิ่งทั้งหมด'], 'กิ่ง'), (meta['หมวด'], 'หมวด'),
                 (meta['คำที่เจอทั้งสองเล่ม'], 'เจอทั้งสองเล่ม'),
                 (meta['คำที่ติดกิ่งข้ามหมวด'], 'ติดกิ่งข้ามหมวด')]:
        L.append('<div class="stat"><b>%s</b><span>%s</span></div>' % ('{:,}'.format(b), e(s)))
    L.append('</div></header>')

    # ── ๑ แผนผัง ────────────────────────────────────────────────────
    L.append('<section><div class="sechead"><span class="n">1</span><h2>ของไหลจากไหนไปไหน</h2>'
             '<p>กล่องมุมมนคือสคริปต์ · กล่องเหลี่ยมคือไฟล์ · เส้นประคือของที่ยังไม่ได้ทำ</p></div>')
    D = ['<div class="diagram"><div class="pipe">']
    for i, (kind, nodes) in enumerate(FLOW):
        if i:
            D.append('<div class="link%s"></div>' % (' dash' if kind == 'wait' else ''))
        if kind == 'pair':
            D.append('<div class="pair">%s</div>' % ''.join(
                '<div class="node %s">%s</div>' % ('file' if j == 0 else 'src', n)
                for j, n in enumerate(nodes)))
        else:
            for n in nodes:
                D.append('<div class="node %s">%s</div>' % (kind, n))
    D.append('</div></div>')
    L.append(''.join(D))
    L.append('<div class="note"><b>อ่านแผนผังนี้ยังไง</b> — ต้นทางมีแค่สองกล่องบนสุด '
             'ที่เหลือเป็นของที่เครื่องสร้างให้ทั้งหมด · เพราะฉะนั้นถ้าจะแก้อะไร '
             'ต้องแก้ที่สองกล่องนั้นเสมอ แก้กลางทางแล้วของจะหายตอนรันรอบหน้า</div>')
    L.append('</section>')

    # ── ๒ ไฟล์ ──────────────────────────────────────────────────────
    L.append('<section><div class="sechead"><span class="n">2</span><h2>ไฟล์แต่ละตัวคืออะไร</h2>'
             '<p>จัดกลุ่มตาม “แก้ได้ไหม” ไม่ใช่ตามโฟลเดอร์ เพราะนั่นคือสิ่งที่ต้องรู้ก่อนแตะ</p></div>')
    L.append('<div class="legend">')
    for k, (short, long) in ROLE.items():
        L.append('<span class="chip" title="%s"><span class="dot" style="background:var(--%s)"></span>%s</span>'
                 % (e(long), k, e(short)))
    L.append('</div><div class="files">')
    for role, path, ttl, desc in FILES:
        L.append('<article class="file" style="--rl:var(--%s)">'
                 '<div class="path">%s</div><div class="ttl">%s</div>'
                 '<div class="desc">%s</div><span class="tag">%s</span></article>'
                 % (role, path, e(ttl), desc, e(ROLE[role][0])))
    L.append('</div>')
    L.append('<div class="tblwrap"><table><thead><tr><th>สคริปต์</th><th>ทำอะไร</th></tr></thead><tbody>')
    for n, d in SCRIPTS:
        L.append('<tr><td>%s</td><td>%s</td></tr>' % (e(n), e(d)))
    L.append('</tbody></table></div></section>')

    # ── ๓ ต้นไม้ ────────────────────────────────────────────────────
    L.append('<section><div class="sechead"><span class="n">3</span><h2>ต้นไม้คลังคำ</h2>'
             '<p>แตะหัวหมวดเพื่อกาง · คำที่มีแถบสีข้างหน้าคือคำที่เจอในนิยายทั้งสองเล่ม · '
             'กิ่งย่อยเยื้องเข้าไปตามชั้น</p></div><div class="tree">')
    for c in src['categories']:
        no = c['no']
        h = HUE.get(no, 30)
        bs = [b for b in src['branches'] if b['category_id'] == c['id']]
        words = {w['text'] for b in bs for w in inbr.get((c['id'], b['path']), [])}
        filled = sum(1 for b in bs if inbr.get((c['id'], b['path'])))
        L.append('<details class="cat" style="--hue:hsl(%d 34%% 42%%);--tint:hsl(%d 40%% 88%% / .5)">' % (h, h))
        L.append('<summary><span class="catno">%d</span>'
                 '<span class="catttl">%s<i>%s</i></span>'
                 '<span class="catcnt">%s คำ<br>%d/%d กิ่งมีคำ</span>'
                 '<span class="arw">▸</span></summary>'
                 % (no, e(c['name_th']), e(c.get('name_en')), '{:,}'.format(len(words)), filled, len(bs)))
        L.append('<div class="catbody">')
        if c.get('definition'):
            L.append('<div class="catdef">%s</div>' % e(c['definition']))
        for b in bs:
            ws = inbr.get((c['id'], b['path']), [])
            L.append('<div class="br" style="--d:%d">' % lvl(b['path']))
            L.append('<div class="brh"><span class="name">%s</span>'
                     '<span class="code">%s</span><span class="en">%s</span>'
                     '<span class="def">%s</span></div>'
                     % (e(b['path'].split(' / ')[-1]), e(b['code']), e(b.get('en')), e(b.get('definition'))))
            if ws:
                L.append('<div class="ws">' + ''.join(
                    '<span class="w%s">%s</span>' % (' two' if len(w['novels']) > 1 else '', e(w['text']))
                    for w in ws) + '</div>')
            else:
                L.append('<div class="empty">ยังไม่มีคำ — ตั้งเผื่อไว้</div>')
            L.append('</div>')
        L.append('</div></details>')
    L.append('</div></section>')

    L.append('</div>')
    open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('เขียน docs/final/map.html · %s คำ · %d กิ่ง · %d หมวด'
          % ('{:,}'.format(meta['คำไม่ซ้ำ']), meta['กิ่งทั้งหมด'], meta['หมวด']))
    print('  ขนาด %.1f KB' % (os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()
