#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง docs/cat11-status-redesign.html จาก docs/cat11-status-redesign.md (เทมเพลตเดียวกับหมวดอื่น · สีทองสัมฤทธิ์ประจำหมวดสถานะ/ยศ)"""
import re, html

MD = 'docs/cat11-status-redesign.md'
OUT = 'docs/cat11-status-redesign.html'

STYLE = """
:root{
  --paper:#f5efe1; --paper2:#efe6d3; --card:#fbf6ea;
  --ink:#3a2f26; --ink-soft:#6b5d4d; --muted:#948573;
  --rose:#a67c2e; --rose-deep:#7d5c1e; --rose-soft:#ddc48a;
  --brick:#9c3b2b; --green:#5a7d4a; --gold:#b07d2a; --blue:#4a6d8a; --violet:#6d5a8a;
  --line:#d9cdb4; --line-soft:#e6dcc7;
  --shadow:0 1px 2px rgba(90,70,45,.06),0 3px 12px rgba(90,70,45,.07);
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#211c17; --paper2:#1a1611; --card:#2a241d;
    --ink:#ece3d5; --ink-soft:#c3b6a2; --muted:#9a8b76;
    --rose:#d8ac5e; --rose-deep:#e6c680; --rose-soft:#5c4826;
    --brick:#d97a63; --green:#8fb079; --gold:#d3a860; --blue:#84acc8; --violet:#a794c4;
    --line:#3f372c; --line-soft:#332c22;
    --shadow:0 1px 2px rgba(0,0,0,.25),0 3px 14px rgba(0,0,0,.3);
  }
}
:root[data-theme="light"]{
  --paper:#f5efe1; --paper2:#efe6d3; --card:#fbf6ea;
  --ink:#3a2f26; --ink-soft:#6b5d4d; --muted:#948573;
  --rose:#a67c2e; --rose-deep:#7d5c1e; --rose-soft:#ddc48a;
  --brick:#9c3b2b; --green:#5a7d4a; --gold:#b07d2a; --blue:#4a6d8a; --violet:#6d5a8a;
  --line:#d9cdb4; --line-soft:#e6dcc7;
}
:root[data-theme="dark"]{
  --paper:#211c17; --paper2:#1a1611; --card:#2a241d;
  --ink:#ece3d5; --ink-soft:#c3b6a2; --muted:#9a8b76;
  --rose:#d8ac5e; --rose-deep:#e6c680; --rose-soft:#5c4826;
  --brick:#d97a63; --green:#8fb079; --gold:#d3a860; --blue:#84acc8; --violet:#a794c4;
  --line:#3f372c; --line-soft:#332c22;
}
*{box-sizing:border-box}
body{margin:0; background:var(--paper); color:var(--ink);
  font-family:"Sarabun","Noto Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:16px; line-height:1.72; -webkit-font-smoothing:antialiased;
  background-image:radial-gradient(circle at 15% 10%,rgba(166,124,46,.06),transparent 40%),radial-gradient(circle at 85% 80%,rgba(125,92,30,.05),transparent 45%);}
.wrap{max-width:760px; margin:0 auto; padding:22px 18px 90px}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif; text-wrap:balance; line-height:1.25}
.hero{padding:26px 22px; border-radius:16px; position:relative; overflow:hidden;
  background:linear-gradient(150deg,var(--card),var(--paper2)); border:1px solid var(--line); box-shadow:var(--shadow)}
.hero::before{content:""; position:absolute; left:0; top:0; bottom:0; width:6px; background:linear-gradient(var(--rose),var(--rose-deep))}
.eyebrow{font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--rose-deep); font-weight:700; margin:0 0 6px}
.hero h1{margin:0 0 4px; font-size:clamp(24px,5.6vw,34px); color:var(--ink)}
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

GENRE = ['แฟนตาซี','ไซไฟ','อีโรติก','ทริลเลอร์','ดราม่า','โรแมนซ์','ทั่วไป','สยอง']
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
majors=[]; cur=None; cursub=None; i=0
while i < len(lines):
    ln=lines[i]; s=ln.strip()
    if s.startswith('## ') and majors:
        break
    m=re.match(r'### 🌲 กิ่งหลัก (\S+) · (.+?) \(([^)]+)\)([\s🆕🚩]*)$', s)
    if m:
        trail=m.group(4)
        cur={'num':m.group(1),'th':m.group(2).strip(),'en':m.group(3).strip(),
             'new':'🆕' in trail,'def':'','subs':[]}
        majors.append(cur); cursub=None; i+=1; continue
    if cur is None: i+=1; continue
    if s.startswith('> _') and not cur['def']:
        cur['def']=re.sub(r'^> _|_$','',s).strip('_'); i+=1; continue
    mm=re.match(r'- 🌿 \*\*(.+?) \(([^)]+)\)\*\* — _(.+?)_(.*)$', s)
    if mm:
        rest,tagshtml=render_tags(mm.group(4))
        cursub={'th':mm.group(1).strip(),'en':mm.group(2).strip(),'def':mm.group(3).strip(),'tags':tagshtml,'words':[],'hint':''}
        cur['subs'].append(cursub); i+=1; continue
    if s.startswith('🗨'):
        h=re.sub(r'^🗨\s*_|_$','',s).strip('_')
        if cursub is not None: cursub['hint']=(cursub['hint']+' '+h).strip()
        i+=1; continue
    if cursub is not None and s and not s.startswith(('-','>','#','|','🗨','[','🔗 คำ','🚚','📊','🗣','🔬','🔜','**')):
        s_prot=re.sub(r'_\([^)]*\)_', lambda m:m.group(0).replace(' · ',' ⋄ '), s)
        toks=[t.replace(' ⋄ ',' · ') for t in s_prot.split(' · ') if t.strip()]
        for t in toks:
            w=render_word(t)
            if w: cursub['words'].append(w)
        i+=1; continue
    i+=1

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
    cnt=f'{wc} คำ' if wc else 'ตั้งเผื่อ'
    h=f'<details class="major"><summary><span class="chip-n">{esc(mj["num"])}</span>'
    h+=f'<span class="ttl">{esc(mj["th"])}{newtag}<span class="en">{esc(mj["en"])}</span></span>'
    h+=f'<span class="cnt">{cnt}</span><span class="arw">▸</span></summary>'
    h+=f'<div class="body"><div class="def">{esc(mj["def"])}</div>'
    h+=''.join(sub_html(sb) for sb in mj['subs'])
    return h+'</div></details>'

total_words=sum(sum(len(sb['words']) for sb in mj['subs']) for mj in majors)
subcount=sum(len(mj['subs']) for mj in majors)
body='<div class="wrap">'
body+='<div class="hero"><div class="eyebrow">ร่างตั้งเผื่อ · Extrinsic</div>'
body+='<h1>หมวดสถานะ บทบาท และชาติตระกูล</h1><div class="en">Status, Role &amp; Social Identity</div>'
body+='<p>ป้ายที่ “สังคมแปะให้” ตัวละคร — เขาคือ “อะไร” ในสายตาสังคม ไม่ใช่ “เป็นคนแบบไหน” ข้างใน · <b>ถอดหัวโขนออกก็หายไป</b> (แม่ทัพลาออกก็ไม่ใช่แม่ทัพ)</p>'
body+='<div class="stats">'
for n,l in [('๘','กิ่งหลัก'),('๑','คำในคลัง'),('๒','โยงเข้า'),(str(subcount) if subcount<10 else '๒๔','กิ่งเผื่อ')]:
    body+=f'<div class="stat"><b>{n}</b><span>{l}</span></div>'
body+='</div></div>'
body+='<div class="legend"><span class="tag t-new">🆕 กิ่งใหม่ (ตั้งเผื่อ)</span><span class="tag t-multi">⚡ คำหลายกิ่ง</span><span class="tag t-cross">🔗 โยงเข้า</span><span class="tag t-genre">แนวนิยาย</span></div>'
body+='<div class="note rule"><b>🚨 ตั้งเผื่อล้วน</b> — คลังจริง <b>ยังไม่มีคำหมวดนี้เลยสักคำ</b> (ดอกเตอร์/นางคณิกา/เหล่าสุจริตชน = คำตัวอย่างจากเจน ไม่ได้อยู่ในคลัง) · โครงนี้ครอบล่วงหน้าทุกแนว รอเก็บคำเข้ามาทีหลัง</div>'
body+='<div class="note"><b>หลอมจาก ๓ ความเห็น</b> — พี่กัน (เจนเสนอแยกหมวดนี้) + เจน (Gemini) + แคลร์ · แยก ๔ แกนที่คนสับสน: อาชีพ(ทำอะไร) · ยศ(ถูกแต่งตั้ง) · ชนชั้น(อยู่ชั้นไหน) · ชาติกำเนิด(เกิดจากตระกูลไหน)</div>'

body+='<h2 class="sec">🌳 โครงกิ่ง (๘ กิ่งหลัก · ตั้งเผื่อ)</h2>'
for mj in majors:
    body+=major_html(mj)

# cross-link table
body+='<h2 class="sec">🔗 คำที่โยงเข้าหมวดนี้ (บ้านหลักอยู่หมวดอื่น)</h2>'
cross=[('เสื่อมเสีย (ชื่อเสียง)','๗ ป้ายศีลธรรม/ชื่อเสียง','หมวด ๖','บ้านหลักหมวด ๖ (จาง/หาย) · ชื่อเสียงมัวหมอง = สถานะสังคม'),
       ('เชื้อไม่ทิ้งแถว','๔ ตระกูลและสายเลือด','หมวด ๖ + ๘','สำนวนตัดสินสันดานผ่านตระกูล — เชื่อมนิสัย + ชาติตระกูล'),
       ('ฆาตกรกระหายเลือด','๗ ป้ายศีลธรรม (ฉายา)','หมวด ๖ + ๘','“ฆาตกร” = บทบาท (สถานะ) + “กระหายเลือด” = นิสัย (๘)')]
body+='<table class="tb"><tr><th>คำ</th><th>กิ่งในหมวดสถานะ</th><th>บ้านหลัก</th><th>เหตุผล</th></tr>'
for a,b,c,d in cross: body+=f'<tr><td>{esc(a)}</td><td>{esc(b)}</td><td>{esc(c)}</td><td>{esc(d)}</td></tr>'
body+='</table>'
body+='<div class="note"><b>ยังไม่มีคำบ้านหลัก</b> — หมวดนี้มีแต่คำโยงเข้า ๓ คำ · คำตัวอย่างในกิ่ง (ดอกเตอร์/นางคณิกา/สุจริตชน) เป็นตัวอย่างตั้งเผื่อ ยังไม่ใช่คำในคลัง</div>'

# discussion
body+='<h2 class="sec">🗣 อภิปราย</h2><div class="prose disc">'
for t in ['<b>✅ รับจากเจน:</b> แนวคิด Character Design แยก “หัวโขน/ป้ายแขวนคอ” (Extrinsic) ออกจาก “เนื้อแท้/ซอฟต์แวร์” (Intrinsic) — คมและใช้ได้จริงในนิยาย',
          '<b>🔧 แคลร์เสนอเพิ่ม (ต่างจากเจน):</b> กิ่ง ๘ “บทบาทนอกกรอบและการสังกัด” — ทาส/เชลย/คนนอกกฎหมาย/สมาชิกสมาคม ไม่มีที่ลง · “คนไร้ราก” (คนพเนจร) เป็น archetype สำคัญ → ตั้งกิ่งรับ',
          '<b>🚩 เส้นที่ต้องระวัง (Extrinsic vs Evaluative):</b> เจนมีแนวโน้มดึงคำ “ตัดสิน” (ดูแคลน/น่าเวทนา/นังตัวดี) เข้ากิ่ง ๗ · แคลร์แย้ง: คำพวกนี้เป็น “อารมณ์ของผู้พูด” (จริงเฉพาะในสายตาคนมอง) ไม่ใช่ “สถานะที่สังคมนิยามร่วมกัน” → คนละธรรมชาติ อย่าดูดเข้ามาหมด · โยงมากิ่ง ๗ เฉพาะคำที่กลายเป็นป้ายติดตัวจริง (ฆาตกรกระหายเลือด)',
          '<b>⚡ multi-branch เยอะเป็นปกติ:</b> ดอกเตอร์ (อาชีพ + คำนำหน้า) · เจ้าขุนมูลนาย (ยศ + ชนชั้น) · ผู้ดีแปดสาแหรก (ชนชั้น + ชาติตระกูล)']:
    body+=f'<p>{t}</p>'
body+='</div>'
body+='</div>'

doc=f'<title>ร่างหมวดสถานะ บทบาท และชาติตระกูล — คลังคำ</title>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>{STYLE}</style>\n{body}\n'
standalone=f'<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>ร่างหมวดสถานะ บทบาท และชาติตระกูล — คลังคำ</title>\n</head>\n<body>\n{doc}</body>\n</html>\n'
open(OUT,'w',encoding='utf-8').write(standalone)
print('เขียน',OUT,'· กิ่งหลัก',len(majors),'· กิ่งย่อย',subcount,'· คำในการ์ด',total_words)
