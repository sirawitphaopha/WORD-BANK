#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง docs/cat5-redesign.html จาก docs/cat5-redesign.md (เทมเพลตเดียวกับหมวด 1/2/3/4 · สีม่วงอมชมพูประจำหมวดอารมณ์)"""
import re, html

MD = 'docs/cat5-redesign.md'
OUT = 'docs/cat5-redesign.html'

STYLE = """
:root{
  --paper:#f5efe1; --paper2:#efe6d3; --card:#fbf6ea;
  --ink:#3a2f26; --ink-soft:#6b5d4d; --muted:#948573;
  --rose:#a25689; --rose-deep:#7d3f68; --rose-soft:#d8abca;
  --brick:#9c3b2b; --green:#5a7d4a; --gold:#b07d2a; --blue:#4a6d8a; --violet:#6d5a8a;
  --line:#d9cdb4; --line-soft:#e6dcc7;
  --shadow:0 1px 2px rgba(90,70,45,.06),0 3px 12px rgba(90,70,45,.07);
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#211c17; --paper2:#1a1611; --card:#2a241d;
    --ink:#ece3d5; --ink-soft:#c3b6a2; --muted:#9a8b76;
    --rose:#d79ac2; --rose-deep:#e6b4d5; --rose-soft:#6a4560;
    --brick:#d97a63; --green:#8fb079; --gold:#d3a860; --blue:#84acc8; --violet:#a794c4;
    --line:#3f372c; --line-soft:#332c22;
    --shadow:0 1px 2px rgba(0,0,0,.25),0 3px 14px rgba(0,0,0,.3);
  }
}
:root[data-theme="light"]{
  --paper:#f5efe1; --paper2:#efe6d3; --card:#fbf6ea;
  --ink:#3a2f26; --ink-soft:#6b5d4d; --muted:#948573;
  --rose:#a25689; --rose-deep:#7d3f68; --rose-soft:#d8abca;
  --brick:#9c3b2b; --green:#5a7d4a; --gold:#b07d2a; --blue:#4a6d8a; --violet:#6d5a8a;
  --line:#d9cdb4; --line-soft:#e6dcc7;
}
:root[data-theme="dark"]{
  --paper:#211c17; --paper2:#1a1611; --card:#2a241d;
  --ink:#ece3d5; --ink-soft:#c3b6a2; --muted:#9a8b76;
  --rose:#d79ac2; --rose-deep:#e6b4d5; --rose-soft:#6a4560;
  --brick:#d97a63; --green:#8fb079; --gold:#d3a860; --blue:#84acc8; --violet:#a794c4;
  --line:#3f372c; --line-soft:#332c22;
}
*{box-sizing:border-box}
body{margin:0; background:var(--paper); color:var(--ink);
  font-family:"Sarabun","Noto Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:16px; line-height:1.72; -webkit-font-smoothing:antialiased;
  background-image:radial-gradient(circle at 15% 10%,rgba(162,86,137,.06),transparent 40%),radial-gradient(circle at 85% 80%,rgba(125,63,104,.05),transparent 45%);}
.wrap{max-width:760px; margin:0 auto; padding:22px 18px 90px}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif; text-wrap:balance; line-height:1.25}
.hero{padding:26px 22px; border-radius:16px; position:relative; overflow:hidden;
  background:linear-gradient(150deg,var(--card),var(--paper2)); border:1px solid var(--line); box-shadow:var(--shadow)}
.hero::before{content:""; position:absolute; left:0; top:0; bottom:0; width:6px; background:linear-gradient(var(--rose),var(--rose-deep))}
.eyebrow{font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--rose-deep); font-weight:700; margin:0 0 6px}
.hero h1{margin:0 0 4px; font-size:clamp(27px,6.5vw,38px); color:var(--ink)}
.hero .en{font-family:Georgia,serif; font-style:italic; color:var(--muted); font-size:16px; margin:0 0 14px}
.hero p{margin:0; color:var(--ink-soft); font-size:15px}
.stats{display:flex; flex-wrap:wrap; gap:8px; margin-top:16px}
.stat{background:var(--paper); border:1px solid var(--line); border-radius:11px; padding:8px 13px; min-width:66px}
.stat b{display:block; font-family:Georgia,serif; font-size:22px; color:var(--rose-deep); line-height:1; font-variant-numeric:tabular-nums}
.stat span{font-size:11.5px; color:var(--muted)}
.note{font-size:13.5px; color:var(--ink-soft); background:var(--card); border:1px solid var(--line-soft);
  border-left:3px solid var(--rose); border-radius:10px; padding:11px 14px; margin:16px 0}
.note b{color:var(--rose-deep)}
.note.rule{border-left-color:var(--brick)} .note.rule b{color:var(--brick)}
.legend{display:flex; flex-wrap:wrap; gap:7px; margin:16px 0 4px}
.tag{display:inline-flex; align-items:center; gap:5px; font-size:12.5px; padding:3px 9px; border-radius:20px; font-weight:600; border:1px solid transparent; white-space:nowrap}
.t-new{background:color-mix(in srgb,var(--green) 15%,transparent); color:var(--green); border-color:color-mix(in srgb,var(--green) 35%,transparent)}
.t-multi{background:color-mix(in srgb,var(--gold) 16%,transparent); color:var(--gold); border-color:color-mix(in srgb,var(--gold) 38%,transparent)}
.t-cross{background:color-mix(in srgb,var(--blue) 16%,transparent); color:var(--blue); border-color:color-mix(in srgb,var(--blue) 38%,transparent)}
.t-genre{background:color-mix(in srgb,var(--rose) 14%,transparent); color:var(--rose-deep); border-color:color-mix(in srgb,var(--rose) 34%,transparent); font-size:11px; padding:2px 7px}
h2.sec{font-size:20px; margin:34px 0 12px; padding-bottom:7px; border-bottom:2px solid var(--line); color:var(--ink); display:flex; align-items:center; gap:9px}
details.major{background:var(--card); border:1px solid var(--line); border-radius:13px; margin:11px 0; overflow:hidden; box-shadow:var(--shadow)}
details.major>summary{cursor:pointer; list-style:none; padding:14px 16px; display:flex; align-items:center; gap:11px; font-family:Georgia,serif; font-size:17px; color:var(--ink)}
details.major>summary::-webkit-details-marker{display:none}
.chip-n{flex:none; width:30px; height:30px; border-radius:9px; background:linear-gradient(145deg,var(--rose),var(--rose-deep)); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-family:Georgia,serif; font-size:15px; font-weight:700; box-shadow:0 2px 5px color-mix(in srgb,var(--rose) 40%,transparent)}
details.major>summary .ttl{flex:1; min-width:0}
details.major>summary .ttl .en{display:block; font-size:12.5px; font-style:italic; color:var(--muted); font-family:Georgia,serif; font-weight:400}
details.major>summary .cnt{font-size:12px; color:var(--muted); flex:none}
details.major>summary .arw{flex:none; color:var(--rose); transition:transform .2s; font-size:13px}
details.major[open]>summary .arw{transform:rotate(90deg)}
.body{padding:2px 16px 16px}
.def{font-size:13.5px; color:var(--ink-soft); font-style:italic; border-left:3px solid var(--rose-soft); padding:3px 0 3px 12px; margin:4px 0 12px}
.sub{margin:12px 0 0; padding-left:14px; border-left:2px solid var(--line)}
.sub-h{font-weight:700; font-size:14.5px; color:var(--rose-deep); display:flex; flex-wrap:wrap; align-items:baseline; gap:7px}
.sub-h .en{font-weight:400; font-style:italic; color:var(--muted); font-size:12px; font-family:Georgia,serif}
.sub-d{font-size:13px; color:var(--ink-soft); margin:1px 0 4px}
.hint{font-size:11.5px; color:var(--muted); background:color-mix(in srgb,var(--rose) 6%,transparent); border-radius:6px; padding:3px 9px; margin:3px 0 5px; line-height:1.55}
.hint::before{content:"🗨 "; opacity:.7}
.words{display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 2px}
.w{background:var(--paper); border:1px solid var(--line); border-radius:8px; padding:4px 10px; font-size:14px; color:var(--ink)}
.w.m{border-color:color-mix(in srgb,var(--gold) 50%,var(--line)); box-shadow:inset 3px 0 0 var(--gold)}
.w.x{border-color:color-mix(in srgb,var(--blue) 50%,var(--line)); box-shadow:inset 3px 0 0 var(--blue)}
.w small{color:var(--muted); font-size:11px}
.empty{font-size:12.5px; color:var(--muted); font-style:italic; background:color-mix(in srgb,var(--green) 8%,transparent); border:1px dashed color-mix(in srgb,var(--green) 40%,transparent); border-radius:8px; padding:5px 10px; display:inline-block; margin-top:2px}
table.tb{width:100%; border-collapse:collapse; margin:8px 0; font-size:13px}
table.tb th{text-align:left; color:var(--rose-deep); border-bottom:2px solid var(--line); padding:6px 8px; font-weight:700}
table.tb td{border-bottom:1px solid var(--line-soft); padding:6px 8px; color:var(--ink-soft); vertical-align:top}
.prose{font-size:14.5px; color:var(--ink-soft)}
.disc p{margin:0 0 11px; padding:8px 12px; background:var(--paper); border-left:3px solid color-mix(in srgb,var(--rose-deep) 45%,var(--line)); border-radius:0 8px 8px 0}
.disc p b{color:var(--rose-deep)}
"""

def esc(s): return html.escape(s, quote=False)

# แปลง marker/tag ในสตริงคำ → span
GENRE = ['แฟนตาซี','ไซไฟ','อีโรติก','ทริลเลอร์','ดราม่า','ทั่วไป','สยอง','โรแมนซ์']
def render_tags(s):
    out=''
    for g in GENRE:
        if '['+g+']' in s:
            out+=f'<span class="tag t-genre">{g}</span>'
            s=s.replace('['+g+']','')
    return s, out

def render_word(tok):
    """คำ 1 ตัว → <span class=w>  · จับ ⚡(multi) 🔗(cross) + small note"""
    tok=tok.strip()
    if not tok: return ''
    cls='w'
    if '⚡' in tok: cls+=' m'
    if '🔗' in tok: cls+=' x'
    # ดึงหมายเหตุในวงเล็บ _(...)_ ออกมาเป็น small
    note=''
    m=re.search(r'_\(([^_]+)\)_', tok)
    if m:
        note=' <small>('+esc(m.group(1))+')</small>'
        tok=tok[:m.start()]+tok[m.end():]
    tok=tok.replace('⚡','').replace('🔗','').strip(' ·')
    tok=re.sub(r'\s+',' ',tok)
    return f'<span class="{cls}">{esc(tok)}{note}</span>'

lines=open(MD,encoding='utf-8').read().split('\n')
majors=[]  # {num,th,en,new,def,subs:[{th,en,def,tags,words:[],hint}]}
cur=None; cursub=None
i=0
in_major_section=False
while i < len(lines):
    ln=lines[i]; s=ln.strip()
    # หยุดแกะกิ่งเมื่อจบ section โครงกิ่ง (เจอ "## " ที่ไม่ใช่ ### กิ่ง หลังมีกิ่งแล้ว) — กัน generator ไล่ดูดข้อความอภิปราย/ตาราง มาเป็น "คำ"
    if s.startswith('## ') and majors:
        break
    m=re.match(r'### 🌲 กิ่งหลัก (\S+) · (.+?) \(([^)]+)\)(\s*🆕)?\s*$', s)
    if m:
        cur={'num':m.group(1),'th':m.group(2).strip(),'en':m.group(3).strip(),'new':bool(m.group(4)),'def':'','subs':[]}
        majors.append(cur); cursub=None; in_major_section=True; i+=1; continue
    if s.startswith('### กลุ่ม') or s.startswith('---'):
        in_major_section=False if s.startswith('---') else in_major_section
    if cur is None: i+=1; continue
    # นิยามกิ่งหลัก
    if s.startswith('> _') and not cur['def']:
        cur['def']=re.sub(r'^> _|_$','',s).strip('_'); i+=1; continue
    # กิ่งย่อย
    mm=re.match(r'- 🌿 \*\*(.+?) \(([^)]+)\)\*\* — _(.+?)_(.*)$', s)
    if mm:
        rest,tagshtml=render_tags(mm.group(4))
        cursub={'th':mm.group(1).strip(),'en':mm.group(2).strip(),'def':mm.group(3).strip(),'tags':tagshtml,'words':[],'hint':''}
        cur['subs'].append(cursub); i+=1; continue
    # หมายเหตุ standalone (🗨) — ผูกกับกิ่งย่อยล่าสุด
    if s.startswith('🗨'):
        h=re.sub(r'^🗨\s*_|_$','',s).strip('_')
        if cursub is not None: cursub['hint']=(cursub['hint']+' '+h).strip()
        i+=1; continue
    # บรรทัดคำ (อยู่ใต้กิ่งย่อย · ขึ้นด้วยช่องว่าง+ตัวอักษร ไม่ใช่ marker)
    if cursub is not None and s and not s.startswith(('-','>','#','|','🗨','[','🔗 คำ','🚚','📊','🗣','🔬','🔜','**')):
        # แยก hint inline _(🗨 ...)_ ออกก่อน
        hint_inline=''
        mh=re.search(r'_\(🗨([^_]+)\)_', s)
        if mh:
            hint_inline=mh.group(1).strip()
            s=s[:mh.start()]+s[mh.end():]
        # ป้องกัน " · " ที่อยู่ในวงเล็บ note _(...)_ ไม่ให้ถูก split เป็นคำแยก
        s_prot=re.sub(r'_\([^)]*\)_', lambda m:m.group(0).replace(' · ',' ⋄ '), s)
        toks=[t.replace(' ⋄ ',' · ') for t in s_prot.split(' · ') if t.strip()]
        for t in toks:
            w=render_word(t)
            if w: cursub['words'].append(w)
        if hint_inline:
            cursub['hint']=(cursub['hint']+' '+hint_inline).strip()
        i+=1; continue
    i+=1

# ---- gen HTML ----
def sub_html(sb):
    h=f'<div class="sub"><div class="sub-h">🌿 {esc(sb["th"])} <span class="en">{esc(sb["en"])}</span> {sb["tags"]}</div>'
    h+=f'<div class="sub-d">{esc(sb["def"])}</div>'
    if sb['words']:
        h+='<div class="words">'+''.join(sb['words'])+'</div>'
    else:
        h+='<div class="empty">กิ่งเผื่อ · รอเก็บคำ</div>'
    if sb['hint']:
        h+=f'<div class="hint">{esc(sb["hint"])}</div>'
    return h+'</div>'

def major_html(mj):
    wc=sum(len(sb['words']) for sb in mj['subs'])
    newtag=' <span class="tag t-new">🆕 กิ่งใหม่</span>' if mj['new'] else ''
    cnt=f'{wc} คำ' if wc else 'กิ่งเผื่อ'
    h=f'<details class="major"><summary><span class="chip-n">{esc(mj["num"])}</span>'
    h+=f'<span class="ttl">{esc(mj["th"])}{newtag}<span class="en">{esc(mj["en"])}</span></span>'
    h+=f'<span class="cnt">{cnt}</span><span class="arw">▸</span></summary>'
    h+=f'<div class="body"><div class="def">{esc(mj["def"])}</div>'
    h+=''.join(sub_html(sb) for sb in mj['subs'])
    return h+'</div></details>'

total_words=sum(sum(len(sb['words']) for sb in mj['subs']) for mj in majors)
body='<div class="wrap">'
body+='<div class="hero"><div class="eyebrow">ร่างเกลากิ่งใหม่ · ฉบับสมบูรณ์</div>'
body+='<h1>หมวด ๕ · สภาวะภายใน</h1><div class="en">Internal States</div>'
body+='<p>คำที่บอกสิ่งที่เกิดขึ้น “ข้างใน” ตัวละคร — ทั้งอารมณ์ ความรู้สึกนึกคิด และสัมผัสทางกายที่คนภายนอกมองไม่เห็น · เรียงขั้วบวก (happy) ขึ้นก่อน</p>'
body+='<div class="stats">'
for n,l in [('๑๓','กิ่งหลัก'),('๗๓','คำบ้านหลัก'),('๑๒','โยงข้ามหมวด'),('๑๕','ยกออก'),('๑๐๐','วลีรวม')]:
    body+=f'<div class="stat"><b>{n}</b><span>{l}</span></div>'
body+='</div></div>'
body+='<div class="legend"><span class="tag t-new">🆕 กิ่งใหม่ (ตั้งเผื่อ)</span><span class="tag t-multi">⚡ คำหลายกิ่ง</span><span class="tag t-cross">🔗 โยงข้ามหมวด</span><span class="tag t-genre">แนวนิยาย</span></div>'
body+='<div class="note"><b>หลอมจาก ๓ ความเห็น</b> — พี่กัน + เจน (Gemini) + แคลร์ · ตอบคำถาม “อารมณ์ vs ความรู้สึก” = ไม่แยกเป็น ๒ กิ่ง แต่ซอยตามขั้วอารมณ์ + แยกภาวะที่ไม่ใช่อารมณ์ (การคิด · กายใน)</div>'

# กลุ่ม ก
body+='<h2 class="sec">กลุ่ม ก · อารมณ์ <span style="font-size:13.5px;font-style:italic;color:var(--muted);font-family:Georgia,serif;font-weight:400">Emotions</span> <span style="font-size:12px;color:var(--muted);font-family:inherit;font-weight:400">· เรียงขั้วบวก → ลบ</span></h2>'
for mj in majors[:11]:
    body+=major_html(mj)
# กลุ่ม ข
body+='<h2 class="sec">กลุ่ม ข · ภาวะที่ไม่ใช่อารมณ์ <span style="font-size:13.5px;font-style:italic;color:var(--muted);font-family:Georgia,serif;font-weight:400">Non-Emotional States</span></h2>'
for mj in majors[11:]:
    body+=major_html(mj)

# cross-link table
body+='<h2 class="sec">🔗 คำโยงข้ามหมวด</h2>'
body+='<div class="note"><b>บ้านหลักหมวด ๓ กิ่ง ๘</b> (ปฏิกิริยาตอบสนองทางกาย) · โยงมาหมวด ๕ เพราะเป็นผลของอารมณ์ · พี่กันเคาะ ๒๔ ก.ค.</div>'
cross=[('ตัวสั่นสะท้าน · สั่นเทา · สั่นระริก','กลัว/ตื่นเต้น','การสั่นและการกระตุก'),
       ('หน้าซีดตัวสั่น','กลัว','การสั่น + เหงื่อ/อุณหภูมิ'),
       ('ขนลุกเกรียว · ขยะแขยงจนขนลุกไปทั้งตัว','กลัว/รังเกียจ','การสั่น/ขนลุก'),
       ('ชุ่มไปด้วยเหงื่อ','กลัว/ร้อนรน','เหงื่อและอุณหภูมิ'),
       ('ตัวเย็นเฉียบ · มือเย็นเฉียบ · รู้สึกเย็นเยียบ','กลัว/ช็อก','เหงื่อและอุณหภูมิ'),
       ('เปลือกตาที่ร้อนผ่าว · ตัวรุมๆ คล้ายมีไข้','เศร้า/ป่วย','เหงื่อและอุณหภูมิ')]
body+='<table class="tb"><tr><th>คำ (๑๒)</th><th>อารมณ์ที่โยง</th><th>กิ่งบ้านหลัก (ม.๓)</th></tr>'
for a,b,c in cross: body+=f'<tr><td>{esc(a)}</td><td>{esc(b)}</td><td>{esc(c)}</td></tr>'
body+='</table>'

# moved table
body+='<h2 class="sec">🚚 คำยกออกจากหมวด ๕</h2>'
body+='<div class="note rule"><b>ไม่ใช่สภาวะภายในชั่วขณะ</b> แต่เป็นลักษณะนิสัย · การตัดสินสิ่งอื่น · หรือคำ "น่า..." ที่ขยายสิ่งภายนอก · พี่กันเคาะ + รับข้อเสนอเจนรอบ ๒</div>'
moved=[('เจียมเนื้อเจียมตัว · สงบเสงี่ยม · บริสุทธิ์ผุดผ่อง','การวางตัว/นิสัยประจำ','๘ บุคลิกภาพ'),
       ('ดูแคลน · นังตัวดี','ตัดสินดูถูกผู้อื่น','๘ บุคลิกภาพ'),
       ('น่าเวทนา · น่าสมเพช · น่าอนาถ','ประเมินว่าผู้อื่นน่าสงสาร','๘ บุคลิกภาพ'),
       ('แปลกพิกล · เหลวไหลไร้สาระ · โหดเหี้ยมเลือดเย็นน่าเกลียดน่ากลัว','ตัดสินลักษณะสิ่งอื่น','๘ บุคลิกภาพ'),
       ('น่าคลื่นเหียน · น่ารักน่าเอ็นดู','🆕 คำ "น่า..." = ขยาย/ตัดสินสิ่งภายนอก ไม่ใช่ภาวะในตน (เจนเสนอ)','๘ บุคลิกภาพ'),
       ('เหี้ยมโหด','🆕 ดุร้ายลงมือทำร้าย เอียงเป็นสันดาน/นิสัยมากกว่าอารมณ์ชั่วขณะ (พี่กันเคาะ · เจนทัก)','๘ บุคลิกภาพ'),
       ('น่ารื่นรมย์','🆕 บรรยายบรรยากาศ/มู้ดของสถานที่ (เจนเสนอ)','๑ บรรยากาศ')]
body+='<table class="tb"><tr><th>คำ (๑๕)</th><th>ทำไมยก</th><th>ไปหมวด</th></tr>'
for a,b,c in moved: body+=f'<tr><td>{esc(a)}</td><td>{esc(b)}</td><td>{esc(c)}</td></tr>'
body+='</table>'

# ประเมินเจน + อภิปราย
body+='<h2 class="sec">🗣 ประเมินข้อเสนอเจน + อภิปราย</h2><div class="prose disc">'
for t in ['<b>✅ รับจากเจน:</b> ชื่อหมวด “สภาวะภายใน” · จับ ⚡ทับซ้อนหมวด ๓ (เฉียบมาก) · แยกการคิดเป็นกิ่งหลัก · ๕ กิ่งเผื่อครอบทุกแนว (NC/ทริลเลอร์/ดราม่า)',
          '<b>🔧 แคลร์แย้ง/ปรับ:</b> เจนรวมสุข+รัก → แคลร์แยก (รักต่ออนุกรมกับตัณหา) · เจนยัด “สงบเสงี่ยม/เจียมเนื้อ” ใต้สุข → แคลร์ชี้ว่าเป็นนิสัย → ยกหมวด ๘ · เจน “ย้ายคำเห็นได้ไปหมวด ๓ ให้หมด” → แคลร์แย้ง โยงข้ามหมวดดีกว่าย้ายขาด',
          '<b>ทำไมเรียงบวกก่อน:</b> พี่กันกำหนด — เปิดคลังมาเจออารมณ์ดี ๆ ก่อน แล้วไล่ลงขั้วลบ → ประหลาดใจเป็นสะพาน → จบด้วยว่างเปล่า/ชา',
          '<b>ทำไมแยกกายใน/กายนอก:</b> เกณฑ์ “คนอื่นเห็นได้ไหม” — เห็นได้ (สั่น/ขนลุก/เหงื่อ) = บ้านหมวด ๓ · เห็นไม่ได้ (เจ็บ/เหนื่อย/วิงเวียน) = บ้านหมวด ๕']:
    body+=f'<p>{t}</p>'
body+='</div>'
body+='</div>'

doc=f'<title>ร่างเกลาหมวด 5 · สภาวะภายใน — คลังคำ</title>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>{STYLE}</style>\n{body}\n'
# standalone version (มี doctype ครบ เปิดตรงได้)
standalone=f'<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>ร่างเกลาหมวด 5 · สภาวะภายใน — คลังคำ</title>\n</head>\n<body>\n{doc}</body>\n</html>\n'
open(OUT,'w',encoding='utf-8').write(standalone)
print('เขียน',OUT,'· กิ่งหลัก',len(majors),'· คำในการ์ด',total_words)
