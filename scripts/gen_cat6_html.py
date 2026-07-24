#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง docs/cat6-redesign.html จาก docs/cat6-redesign.md (เทมเพลตเดียวกับหมวด 1-5 · สีเขียวมรกตประจำหมวดคำปรุงแต่ง)"""
import re, html

MD = 'docs/cat6-redesign.md'
OUT = 'docs/cat6-redesign.html'

STYLE = """
:root{
  --paper:#f4f0e6; --paper2:#ece6d6; --card:#faf6ec;
  --ink:#2f342f; --ink-soft:#565f56; --muted:#8a9184;
  --rose:#2e8b7a; --rose-deep:#1f6b5f; --rose-soft:#a9d4c9;
  --brick:#9c3b2b; --green:#5a7d4a; --gold:#b07d2a; --blue:#4a6d8a; --violet:#6d5a8a;
  --line:#d5cdb8; --line-soft:#e4dcc9;
  --shadow:0 1px 2px rgba(45,70,60,.06),0 3px 12px rgba(45,70,60,.07);
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#181e1b; --paper2:#131815; --card:#212a25;
    --ink:#e4ece5; --ink-soft:#aebaad; --muted:#7f8b80;
    --rose:#4fb8a4; --rose-deep:#74d4bf; --rose-soft:#345a52;
    --brick:#d97a63; --green:#8fb079; --gold:#d3a860; --blue:#84acc8; --violet:#a794c4;
    --line:#333c34; --line-soft:#28302a;
    --shadow:0 1px 2px rgba(0,0,0,.25),0 3px 14px rgba(0,0,0,.3);
  }
}
:root[data-theme="light"]{
  --paper:#f4f0e6; --paper2:#ece6d6; --card:#faf6ec;
  --ink:#2f342f; --ink-soft:#565f56; --muted:#8a9184;
  --rose:#2e8b7a; --rose-deep:#1f6b5f; --rose-soft:#a9d4c9;
  --brick:#9c3b2b; --green:#5a7d4a; --gold:#b07d2a; --blue:#4a6d8a; --violet:#6d5a8a;
  --line:#d5cdb8; --line-soft:#e4dcc9;
}
:root[data-theme="dark"]{
  --paper:#181e1b; --paper2:#131815; --card:#212a25;
  --ink:#e4ece5; --ink-soft:#aebaad; --muted:#7f8b80;
  --rose:#4fb8a4; --rose-deep:#74d4bf; --rose-soft:#345a52;
  --brick:#d97a63; --green:#8fb079; --gold:#d3a860; --blue:#84acc8; --violet:#a794c4;
  --line:#333c34; --line-soft:#28302a;
}
*{box-sizing:border-box}
body{margin:0; background:var(--paper); color:var(--ink);
  font-family:"Sarabun","Noto Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:16px; line-height:1.72; -webkit-font-smoothing:antialiased;
  background-image:radial-gradient(circle at 15% 10%,rgba(46,139,122,.06),transparent 40%),radial-gradient(circle at 85% 80%,rgba(31,107,95,.05),transparent 45%);}
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

GENRE = ['แฟนตาซี','ไซไฟ','อีโรติก','ทริลเลอร์','ดราม่า','ทั่วไป','สยอง','โรแมนซ์']
def render_tags(s):
    out=''
    for g in GENRE:
        if '['+g+']' in s:
            out+=f'<span class="tag t-genre">{g}</span>'
            s=s.replace('['+g+']','')
    return s, out

def render_word(tok):
    tok=tok.strip()
    if not tok: return ''
    cls='w'
    if '⚡' in tok: cls+=' m'
    if '🔗' in tok: cls+=' x'
    note=''
    m=re.search(r'_\(([^_]+)\)_', tok)
    if m:
        note=' <small>('+esc(m.group(1))+')</small>'
        tok=tok[:m.start()]+tok[m.end():]
    tok=tok.replace('⚡','').replace('🔗','').strip(' ·')
    tok=re.sub(r'\s+',' ',tok)
    return f'<span class="{cls}">{esc(tok)}{note}</span>'

lines=open(MD,encoding='utf-8').read().split('\n')
majors=[]; cur=None; cursub=None
i=0
while i < len(lines):
    ln=lines[i]; s=ln.strip()
    if s.startswith('## ') and majors:
        break
    m=re.match(r'### 🌲 กิ่งหลัก (\S+) · (.+?) \(([^)]+)\)[\s🆕🔗]*$', s)
    if m:
        cur={'num':m.group(1),'th':m.group(2).strip(),'en':m.group(3).strip(),'new':('🆕' in s),'def':'','subs':[]}
        majors.append(cur); cursub=None; i+=1; continue
    if cur is None: i+=1; continue
    if s.startswith('> _') and not cur['def']:
        cur['def']=re.sub(r'^> _|_$','',s).strip('_'); i+=1; continue
    mm=re.match(r'- 🌿 \*\*(.+?) \(([^)]+)\)\*\*(\s*🆕)? — _(.+?)_(.*)$', s)
    if mm:
        rest,tagshtml=render_tags(mm.group(5))
        cursub={'th':mm.group(1).strip(),'en':mm.group(2).strip(),'new':bool(mm.group(3)),'def':mm.group(4).strip(),'tags':tagshtml,'words':[],'hint':''}
        cur['subs'].append(cursub); i+=1; continue
    if s.startswith('🗨'):
        h=re.sub(r'^🗨\s*_|_$','',s).strip('_')
        if cursub is not None: cursub['hint']=(cursub['hint']+' ⟢ '+h).strip(' ⟢')
        i+=1; continue
    if cursub is not None and s and not s.startswith(('-','>','#','|','🗨','[','**')):
        s_prot=re.sub(r'_\([^)]*\)_', lambda m:m.group(0).replace(' · ',' ⋄ '), s)
        toks=[t.replace(' ⋄ ',' · ') for t in s_prot.split(' · ') if t.strip()]
        for t in toks:
            w=render_word(t)
            if w: cursub['words'].append(w)
        i+=1; continue
    i+=1

def sub_html(sb):
    newtag=' <span class="tag t-new">🆕</span>' if sb.get('new') else ''
    h=f'<div class="sub"><div class="sub-h">🌿 {esc(sb["th"])}{newtag} <span class="en">{esc(sb["en"])}</span> {sb["tags"]}</div>'
    h+=f'<div class="sub-d">{esc(sb["def"])}</div>'
    if sb['words']:
        h+='<div class="words">'+''.join(sb['words'])+'</div>'
    else:
        h+='<div class="empty">กิ่งเผื่อ · รอเก็บคำ</div>'
    if sb['hint']:
        for seg in sb['hint'].split(' ⟢ '):
            h+=f'<div class="hint">{esc(seg)}</div>'
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
body+='<div class="hero"><div class="eyebrow">ร่างเกลากิ่งใหม่ · จัดตามหน้าที่</div>'
body+='<h1>หมวด ๖ · คำปรุงแต่งและคำอเนกประสงค์</h1><div class="en">Modifiers</div>'
body+='<p>คำที่ไม่ได้ “เป็น” สิ่งของ/กริยา/อารมณ์เอง แต่ใช้ “ปรุงแต่ง” ประโยค — คุมจังหวะ เพิ่มน้ำหนัก เชื่อมความ เปรียบเทียบ หรือชี้สภาพเหตุการณ์ · จัดกิ่งตาม “หน้าที่” ไม่ใช่ “รูปแบบคำ”</p>'
body+='<div class="stats">'
for n,l in [('๗','กิ่งหลัก'),('๗๗','คำต้นฉบับ'),('๒๖','โยงข้ามหมวด'),('๖','กิ่งเผื่อ')]:
    body+=f'<div class="stat"><b>{n}</b><span>{l}</span></div>'
body+='</div></div>'
body+='<div class="legend"><span class="tag t-new">🆕 กิ่งใหม่ (ตั้งเผื่อ)</span><span class="tag t-multi">⚡ คำหลายกิ่ง</span><span class="tag t-cross">🔗 โยงข้ามหมวด</span><span class="tag t-genre">แนวนิยาย</span></div>'
body+='<div class="note"><b>หลอมจาก ๓ ความเห็น</b> — พี่กัน + เจน (Gemini) + แคลร์ (๔ เอเจนต์ช่วยสแกน) · แนวคิดหลัก: หมวด ๖ ค้นด้วย “อยากให้ประโยคทำหน้าที่อะไร” จึงจัดกิ่งตามหน้าที่ (เลิกใช้ “สำนวน” เป็นกิ่งหลัก)</div>'

for mj in majors:
    body+=major_html(mj)

# cross-link table
body+='<h2 class="sec">🔗 คำโยงข้ามหมวด</h2>'
body+='<div class="note"><b>คงบ้านหลักหมวด ๖ + โยงไปหมวดอื่นด้วย</b> · ประเมินแล้วว่าอยู่หลายหมวดจริง (พี่กันย้ำ 24 ก.ค.: คำอยู่หลายหมวดได้ ไม่ยกทิ้ง)</div>'
cross=[('ชะงักกลางคัน','๑ ทันที/ชะงัก','หมวด ๓','คุมจังหวะ (๖) + การหยุดเคลื่อนไหว (๓)'),
       ('ประดังประเด · แผ่ซ่าน · ความกลัวระคนสงสัย','๒ ก่อตัว/แผ่ลาม','หมวด ๕','ตัวปรุงบอกอารมณ์ (๖) + ตัวอารมณ์ (๕)'),
       ('เล็ดลอดสายตา','๒ ก่อตัว/แผ่ลาม','หมวด ๓','การปรากฏเล็ดลอด (๖) + กิ่งลอบมอง (๓ · มีแล้ว)'),
       ('วาบขึ้นมาในใจ · จริงดังคาด','๒/๗','หมวด ๕','ตัวปรุง (๖) + การคิด/ระลึกรู้ (๕ · มีแล้ว)'),
       ('เสื่อมเสีย','๒ จาง/หาย','หมวด ๘','การเสื่อม (๖) + เสื่อมชื่อเสียง (๘)'),
       ('กระหน่ำ · ครึกโครม','๓ รุนแรง/ทวี','หมวด ๓/๔','คำเน้น (๖) + ขยายกริยา/เสียง (๓/๔)'),
       ('อย่างใจจดใจจ่อ','๓ ขับเน้น','หมวด ๕','คำเน้นจดจ่อ (๖) + ภาวะจดจ่อ (๕)'),
       ('ดันทุรัง · ประมาทเลินเล่อ · เหลวไหลไร้สาระ','๓','หมวด ๘','คำขยาย (๖) + รากคือนิสัย (๘)'),
       ('ฆาตกรกระหายเลือด · ตาถั่ว · นิสัยใจคอ','๕ ภาพเปรียบ','หมวด ๘','ภาพเปรียบ/สำนวน (๖) + บรรยายคน/นิสัย (๘)'),
       ('ปากที่อ้ากว้าง · ยัดเยียด · ขนานนามคนร้าย','๕ ภาพเปรียบ','หมวด ๓','ภาพเปรียบ (๖) + ท่าทาง/กริยา (๓)'),
       ('ตวัดหาง 🚚 ยกออก','(หางสัตว์จริง)','หมวด ๓ สัตว์','ไม่ใช่ตัวปรุง → บ้านหมวด ๓ (กิ่งสัตว์) · แยก “ตวัดหางตา” ไปหมวด ๓ (ตา)'),
       ('จับต้นชนปลายไม่ถูก','๗ ที่มา/เบาะแส','หมวด ๕','สำนวน (๖) + ความสับสน (๕)'),
       ('ม่านหมอกความคลุมเครือ','๗ ที่มา/เบาะแส','หมวด ๑','ใช้เชิงเปรียบ (๖) + หมอกจริง/ฉาก (๑)'),
       ('เชื้อไม่ทิ้งแถว','๗ ที่มา/เบาะแส','หมวด ๘','สำนวน (๖) + นิสัยสืบทอด (๘)'),
       ('ติดตรึงอยู่ในใจ · ฝังแน่นอยู่ในใจไม่มีวันเลือนหาย · ลอยคว้างอยู่ในความทรงจำ','๒ คงค้าง','หมวด ๕','สำนวนคงค้าง (๖) + ความทรงจำ (๕ · มีแล้ว)')]
body+='<table class="tb"><tr><th>คำ (๒๖)</th><th>บ้านหลัก (หมวด ๖)</th><th>โยงไป</th><th>ประเมิน (ทำไมอยู่หลายหมวด)</th></tr>'
for a,b,c,d in cross: body+=f'<tr><td>{esc(a)}</td><td>{esc(b)}</td><td>{esc(c)}</td><td>{esc(d)}</td></tr>'
body+='</table>'
body+='<div class="note"><b>🔎 คำที่มีในหมวด ๕ อยู่แล้ว</b> (วาบขึ้นมาในใจ · จริงดังคาด · ติดตรึงอยู่ในใจ · ลอยคว้างอยู่ในความทรงจำ) — ประเมินแล้ว = <b>อยู่ ๒ หมวดจริง</b> (หมวด ๕ การคิด/ความทรงจำ · หมวด ๖ ตัวปรุง/สำนวน) · ลงคลังใส่ทั้ง ๒ หมวดได้ (ระบบรองรับ subpaths หลายกิ่ง)</div>'

# ประเมิน + อภิปราย
body+='<h2 class="sec">🗣 หลอม ๓ ความเห็น + อภิปราย</h2><div class="prose disc">'
for t in ['<b>✅ รับ (มุมวิจารณ์โครง):</b> โครงเดิมปนแกน (เวลา/อารมณ์/รูปแบบคำ/หน้าที่) · ใช้ “สำนวน” เป็นกิ่งหลัก = จัดตามรูปแบบ ไม่ใช่หน้าที่ → คำคนละเรื่องมากอง (กลุ่มสถานการณ์บวม ๒๐ คำ) → แก้เป็นจัดตามหน้าที่ ซอย “สำนวน” เป็น ผลลัพธ์/ที่มา/เคราะห์กรรม/ขอบเขต',
          '<b>✅ รับ (มุมคนเขียนนิยาย):</b> เพิ่มกิ่ง <b>คำเปรียบ/อุปมา</b> (ช่องโหว่ใหญ่สุด — คลังไม่มีคำเปรียบเลย) · ท่าที/ความแน่นอน · ระดับเร่ง-แผ่ว · ลำดับ/เปลี่ยนฉาก — ตั้งเผื่อครอบทุกแนว',
          '<b>🔧 แคลร์ตัดสินตามที่พี่กันสอน:</b> เอเจนต์เสนอ “ยกคำที่ไม่ใช่ตัวปรุงออก” (ฆาตกรกระหายเลือด/ตวัดหาง/นิสัยใจคอ) → พี่กันท้วง: คำอยู่หลายหมวดได้ ห้ามยกทิ้ง → คงทุกคำในหมวด ๖ (กิ่งภาพเปรียบและสำนวนกริยา) + โยงข้ามหมวด · ไม่มีตาราง “ยกออก” · เจนรอบ ๒ เสนอยุบกิ่ง ๘ (ตรึงใจ) → แคลร์รับ ยกเป็นขั้ว “คงอยู่” ใต้กิ่ง ๒ = เหลือ ๗ กิ่งหลัก',
          '<b>ประเมินคำหลายหมวด (หน้าที่แคลร์):</b> ๒๗ คำเนื้อในเป็นอารมณ์/ท่าทาง/นิสัย → ประเมินแล้วอยู่ ๒ หมวดจริง คงบ้านหมวด ๖ + โยง ๑/๓/๔/๕/๘ · คำที่มีในหมวด ๕ อยู่แล้ว (วาบขึ้นมาในใจ ฯลฯ) = multi-branch ลงได้ทั้ง ๒ หมวด',
          '<b>ตวัดหาง (พี่กันชี้):</b> มาจากหางสัตว์ → ตั้งกิ่ง “การเคลื่อนไหวสัตว์” ในหมวด ๓ + แยกคำใหม่ “ตวัดหางตา” (สายตาคน) ไปกิ่งตาหมวด ๓']:
    body+=f'<p>{t}</p>'
body+='</div>'
body+='</div>'

doc=f'<title>ร่างเกลาหมวด 6 · คำปรุงแต่ง — คลังคำ</title>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>{STYLE}</style>\n{body}\n'
standalone=f'<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>ร่างเกลาหมวด 6 · คำปรุงแต่ง — คลังคำ</title>\n</head>\n<body>\n{doc}</body>\n</html>\n'
open(OUT,'w',encoding='utf-8').write(standalone)
print('เขียน',OUT,'· กิ่งหลัก',len(majors),'· คำในการ์ด',total_words)
