# -*- coding: utf-8 -*-
# gen_branches.py — สร้างไฟล์ "กิ่งที่เกลาแล้ว" 3 ไฟล์ จากไฟล์ร่าง redesign
#   อ่าน:  docs/cat1..cat6 · cat8 · cat10 · cat11 -redesign.md (หมวดที่เกลาแล้ว)
#   เขียน: docs/branches-clean.md  (โครงกิ่ง + นิยาม + อังกฤษ · ไม่มีคำ · คนอ่าน)
#          docs/branches-data.json (กิ่ง + นิยาม + อังกฤษ + คำ + โยงข้ามหมวด + ยกออก · อัป Supabase)
#          docs/branches-data.md   (เหมือน json แต่ฉบับอ่านทวน)
#   กฎ: คัดชื่อกิ่ง/นิยาม/อังกฤษ verbatim จากต้นฉบับ · ตัด tag/หมายเหตุ(🗨)/อภิปราย/ป้าย(🆕⚡✳️🚚🔄🌟🚩) ออกหมด
#   รหัสหมวด: หมวด N = c(N-1) · หมวด1=c0 ... หมวด9=c8 · หมวด10=c9 · หมวด11(สถานะ)=c10
#   คำโยงเข้า (บ้านหลักหมวดอื่น · เขียน "บ้านหลักหมวด X" ในหมายเหตุ) = ไม่นับเป็นคำบ้านหลักของหมวดนี้ → เก็บใน cross_links แทน
#   รัน: python3 scripts/gen_branches.py   (จาก root ของ repo)
import re, json
from collections import defaultdict

FILES = [("docs/cat1-redesign.md",1,"c0"),
         ("docs/cat2-redesign.md",2,"c1"),
         ("docs/cat3-redesign.md",3,"c2"),
         ("docs/cat4-redesign.md",4,"c3"),
         ("docs/cat5-redesign.md",5,"c4"),
         ("docs/cat6-redesign.md",6,"c5"),
         ("docs/cat8-redesign.md",8,"c7"),
         ("docs/cat10-objects-redesign.md",10,"c9"),
         ("docs/cat11-status-redesign.md",11,"c10")]
CAT  = {1:"หมวด 1",2:"หมวด 2",3:"หมวด 3",4:"หมวด 4",5:"หมวด 5",6:"หมวด 6",8:"หมวด 8",10:"หมวด 10",11:"หมวด 11"}
HOME = {"c0":"หมวด 1","c1":"หมวด 2","c2":"หมวด 3","c3":"หมวด 4","c4":"หมวด 5",
        "c5":"หมวด 6","c7":"หมวด 8","c9":"หมวด 10","c10":"หมวด 11"}
NUM2CODE = {1:'c0',2:'c1',3:'c2',4:'c3',5:'c4',6:'c5',7:'c6',8:'c7',9:'c8',10:'c9',11:'c10'}
GENRE = {'แฟนตาซี','ไซไฟ','อีโรติก','ทริลเลอร์','ทั่วไป','โรแมนซ์','ดราม่า','สยอง','แอ็กชัน'}
MARKS = ['⚡','✳️','🔗','➕','🆕','🔄','🚚','🌿','🌲','🍃','🌟','🚩']

def thai2int(s):
    tbl={'๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9'}
    d=''.join(tbl.get(ch,ch) for ch in s)
    return int(d) if d.isdigit() else None
def home_code_from_note(note):
    # คืนรหัสหมวด "บ้านหลัก" ถ้าหมายเหตุระบุ "บ้านหลักหมวด X" (X = เลข/สถานะ) · ไม่ระบุ = None
    if 'บ้านหลัก' not in note: return None
    m=re.search(r'บ้านหลักหมวด\s*(สถานะ|[๐-๙\d]+)', note)
    if not m: return None
    tok=m.group(1)
    if tok=='สถานะ': return 'c10'
    n=thai2int(tok)
    return NUM2CODE.get(n)

def split_name_en(s):
    m=re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', s.strip())
    return (m.group(1).strip(), m.group(2).strip()) if m else (s.strip(),"")
def strip_notes(line): return re.sub(r'_\([^)]*\)_','',line)
def clean_def(d):
    d=d.replace('**','')
    d=re.sub(r'[🔗⚡↔🆕🌟🌿🍃🌲✳️🚚🔄🔀🚩]','',d)
    return re.sub(r'\s+',' ',d).strip()
def strip_trail_marks(s):
    return re.sub(r'[\s🆕🌟🔄🚩]+$','',s).strip()
def clean_word(tok):
    t=re.sub(r'_[^_]*_','',strip_notes(tok)).replace('**','')
    for mk in MARKS: t=t.replace(mk,'')
    t=re.sub(r'\[(?:'+'|'.join(GENRE)+r')\]','',t)
    t=re.sub(r'\s*\([^()]*\)\s*$','',t)
    return t.strip(' ·—-\t').strip()
def is_thai(s): return any('฀'<=ch<='๿' for ch in s)

categories=[]; branches=[]; moved=[]; cross=[]
words={}; word_order=[]

RE_YOY   = re.compile(r'^-\s*(?:(?:🆕|🔄)\s*)*🌿\s*\*\*(.+?)\*\*[^—]*—\s*_(.+?)_')
RE_KHAENG= re.compile(r'^-\s*(?:(?:🆕|🔄)\s*)*🍃\s*\*\*(.+?)\*\*[^—]*—\s*_(.+?)_')
RE_LAK   = re.compile(r'^###\s*🌲\s*กิ่งหลัก\s*[\d๐-๙]+\s*·\s*(.+)$')

for path,no,cid in FILES:
    lines=open(path,encoding='utf-8').read().splitlines()

    # ----- นิยามหมวด -----
    catobj=None
    for l in lines:
        m=re.match(r'^\*\*หมวด\s*\d+\s*·\s*(.+?)\s*\(([^()]*)\)\*\*\s*—\s*_(.+?)_\s*$', l.strip())
        if m:
            catobj={"id":cid,"no":no,"name_th":m.group(1).strip(),"name_en":m.group(2).strip(),"definition":clean_def(m.group(3))}; break
    if catobj is None:   # fallback: H1 (# [ร่างเกลา]หมวด[ใหม่] N · ชื่อ (en)) + นิยามจาก blockquote แรก
        nth=nen=""; dtext=""
        for l in lines:
            h=re.match(r'^#\s+(?:ร่างเกลา)?หมวด(?:ใหม่|\s*[๐-๙\d]+)?\s*·\s*(.+?)\s*\(([^()]+)\)', l)
            if h: nth=h.group(1).strip(); nen=h.group(2).strip(); break
        for l in lines:
            st=l.strip()
            if st.startswith('>') and 'นิยามหมวด' in st:
                dtext=re.sub(r'^>\s*\*\*นิยามหมวด:\*\*\s*','',st); break
        if not dtext:
            for l in lines[1:]:
                if l.strip().startswith('>'): dtext=re.sub(r'^>\s*','',l.strip()); break
        catobj={"id":cid,"no":no,"name_th":nth,"name_en":nen,"definition":clean_def(dtext)}
    categories.append(catobj)

    # ----- โครงกิ่ง + คำ -----
    in_tree=False; expect=False; lak=yoy=khaeng=None
    for l in lines:
        s=l.strip()
        if s.startswith('## 🌳'): in_tree=True; continue
        if RE_LAK.match(s): in_tree=True                    # cat6 ไม่มี ## 🌳 → เริ่มที่ 🌲
        if in_tree and re.match(r'^##\s',l) and not l.startswith('###'): in_tree=False
        if not in_tree or not s: continue
        m=RE_LAK.match(s)
        if m:
            head=re.sub(r'\s*_\([^)]*\)_\s*$','',m.group(1)); head=strip_trail_marks(head)
            nm,en=split_name_en(head)
            lak={"category_id":cid,"path":nm,"en":en,"definition":"","level":"lak"}; branches.append(lak)
            yoy=khaeng=None; expect=True; continue
        if expect and s.startswith('>'):
            d=re.match(r'^>\s*_(.+?)_\s*$',s)
            if d: lak["definition"]=clean_def(d.group(1))
            expect=False; continue
        expect=False
        if s.startswith('🗨'): continue
        m=RE_KHAENG.match(s)
        if m and l.startswith('  '):
            nm,en=split_name_en(m.group(1)); base=(yoy or lak)["path"]
            khaeng={"category_id":cid,"path":base+" / "+nm,"en":en,"definition":clean_def(m.group(2)),"level":"khaeng"}; branches.append(khaeng); continue
        m=RE_YOY.match(s)
        if m:
            nm,en=split_name_en(m.group(1)); yoy={"category_id":cid,"path":lak["path"]+" / "+nm,"en":en,"definition":clean_def(m.group(2)),"level":"yoy"}; branches.append(yoy); khaeng=None; continue
        if s[0] in '->|#': continue
        ab=khaeng or yoy or lak
        if not ab: continue
        # แยก token โดยกัน ' · ' ในหมายเหตุ _(...)_ ไม่ให้ถูก split
        prot=re.sub(r'_\([^)]*\)_', lambda mm:mm.group(0).replace(' · ',' ⋄ '), l)
        for raw in prot.split(' · '):
            tok=raw.replace(' ⋄ ',' · ')
            mn=re.search(r'_\(([^)]*)\)_', tok); note=mn.group(1) if mn else ''
            w=clean_word(tok)
            if not (w and is_thai(w) and len(w)<=60): continue
            hc=home_code_from_note(note)
            if hc and hc!=cid:                       # คำโยงเข้า (บ้านหลักหมวดอื่น) → ไม่นับเป็นคำบ้านหลักหมวดนี้
                key=(w,hc)
                if not any(x['text']==w and x['home']==hc for x in cross):
                    cross.append({"text":w,"home":hc,"links_to":[CAT[no]]})
                continue
            k=(cid,w)
            if k not in words: words[k]=[]; word_order.append(k)
            if ab["path"] not in words[k]: words[k].append(ab["path"])
            # คำบ้านหลักที่ยัง 🔗 โยงออก (หมายเหตุมี "หมวด N"/"โยงหมวด N" แต่ไม่ใช่ "บ้านหลัก") → บันทึกปลายทาง
            if '🔗' in tok:
                tg=['หมวด '+str(thai2int(x)) for x in re.findall(r'หมวด\s*([๐-๙\d]+)', note)]
                tg=[t for t in tg if t!=CAT[no]]
                if tg and not any(x['text']==w and x['home']==cid for x in cross):
                    cross.append({"text":w,"home":cid,"links_to":sorted(set(tg))})

    # ----- คำโยงข้ามหมวด: ตาราง หมวด 2 (c1) แบบเดิม | คำ | กิ่งหลัก ... | ม.N | -----
    if cid=='c1':
        intbl=False
        for l in lines:
            if l.strip().startswith('| คำ | กิ่งหลัก'): intbl=True; continue
            if intbl:
                if not l.strip().startswith('|'): break
                cols=[c.strip() for c in l.strip().strip('|').split('|')]
                if len(cols)>=3 and cols[0]!='คำ' and not set(cols[0])<=set('-: '):
                    tg=['หมวด '+n for n in re.findall(r'ม\.(\d+)', cols[2])]
                    if tg and not any(x['text']==cols[0].strip() and x['home']==cid for x in cross):
                        cross.append({"text":cols[0].strip(),"home":cid,"links_to":tg})

    # ----- คำยกออก (ตาราง 🚚) · ตรวจคอลัมน์ปลายทางจากหัวตาราง -----
    inm=False; destcol=None
    for l in lines:
        st=l.strip()
        if st.startswith('## 🚚'): inm=True; destcol=None; continue
        if not inm: continue
        if st.startswith('|'):
            cols=[c.strip() for c in st.strip('|').split('|')]
            if cols and cols[0]=='คำ':                       # แถวหัวตาราง → หาคอลัมน์ปลายทาง
                destcol=1
                for idx,h in enumerate(cols):
                    if idx>0 and ('ไปหมวด' in h or 'ย้ายไป' in h or ('ไป' in h and 'หมวด' in h)): destcol=idx; break
                continue
            if not cols or not cols[0] or set(cols[0])<=set('-: '): continue   # เส้นคั่น
            if destcol is not None and len(cols)>destcol:
                for w in cols[0].split(' · '):
                    w=re.sub(r'\[[^\]]*\]','',w).strip()
                    if w and w!='คำ': moved.append({"text":w,"from":cid,"to":cols[destcol]})
        elif st.startswith('## ') or st=='---':
            inm=False

# ---------- JSON ----------
cat_nos=[c["no"] for c in categories]
data={"meta":{"source":[f for f,_,_ in FILES],"status":"draft — ยังไม่อัป Supabase","categories":cat_nos,
      "note":"category_id: หมวด N = c(N-1) · หมวด10=c9 · หมวด11(สถานะ)=c10 · path คั่นชั้นด้วย ' / ' · คำโยงเข้าไม่นับเป็นคำบ้านหลัก"},
      "categories":categories,
      "branches":[{"category_id":b["category_id"],"path":b["path"],"en":b["en"],"definition":b["definition"]} for b in branches],
      "words":[{"text":t,"category_id":c,"subpaths":words[(c,t)]} for (c,t) in word_order],
      "cross_links":cross,"moved_out":moved}
open("docs/branches-data.json","w",encoding='utf-8').write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")

CATLIST=", ".join(CAT[c['no']].replace('หมวด ','') for c in categories)
# ---------- clean md (โครงล้วน) ----------
bycat=defaultdict(list)
for b in branches: bycat[b["category_id"]].append(b)
out=[f"# 🌿 รายนามกิ่ง (โครงสะอาด) — หมวด {CATLIST}","",
     "> โครงกิ่งล้วน: **ชื่อไทย (English) — นิยาม** · ไม่มีคำ ไม่มีหมายเหตุ ไม่มี tag",
     "> ที่มา: ไฟล์ redesign · สร้างอัตโนมัติจาก `scripts/gen_branches.py` (อย่าแก้มือ) · เป็นร่าง ยังไม่แตะเว็บ/database/subtree.js"]
for c in categories:
    out.append(""); out.append(f"## {CAT[c['no']]} · {c['name_th']} ({c['name_en']})"); out.append(f"_{c['definition']}_")
    for b in bycat[c["id"]]:
        nm=b["path"].split(" / ")[-1]
        if b["level"]=="lak": out.append(""); out.append(f"### {nm} ({b['en']})"); out.append(f"_{b['definition']}_")
        elif b["level"]=="yoy": out.append(f"- {nm} ({b['en']}) — {b['definition']}")
        else: out.append(f"  - {nm} ({b['en']}) — {b['definition']}")
open("docs/branches-clean.md","w",encoding='utf-8').write("\n".join(out)+"\n")

# ---------- data md (อ่านทวน · มีคำ) ----------
wbp=defaultdict(list)
for w in data["words"]:
    for sp in w["subpaths"]: wbp[(w["category_id"],sp)].append(w["text"])
out=[f"# 🌿 ข้อมูลกิ่ง + คำ ทั้งหมด (อ่านทวน) — หมวด {CATLIST}","",
     "> ฉบับอ่านของ `branches-data.json` · มีครบทั้งกิ่ง นิยาม อังกฤษ และ**คำ** · เป็นข้อมูลดิบ (ไม่มีความเห็น/อภิปราย)",
     "> รหัสหมวด: หมวด N = c(N-1) · หมวด10=c9 · หมวด11(สถานะ)=c10 · เป็นร่าง ยังไม่แตะเว็บ/database"]
for c in categories:
    out.append(""); out.append(f"## {CAT[c['no']]} · {c['name_th']} ({c['name_en']})"); out.append(f"_{c['definition']}_")
    for b in bycat[c["id"]]:
        depth=b["path"].count(" / "); nm=b["path"].split(" / ")[-1]
        if depth==0: out.append(""); out.append(f"### {nm} ({b['en']})"); out.append(f"_{b['definition']}_")
        elif depth==1: out.append(f"- {nm} ({b['en']}) — {b['definition']}")
        else: out.append(f"  - {nm} ({b['en']}) — {b['definition']}")
        ws=wbp.get((c["id"],b["path"]),[])
        if ws: out.append(("    " if depth>=1 else "  ")+f"คำ ({len(ws)}): "+" · ".join(ws))
if cross:
    out.append(""); out.append("## 🔗 คำโยงข้ามหมวด (คงในหมวดบ้าน + โยงไปหมวดอื่น)")
    for x in cross: out.append(f"- {x['text']} ({HOME.get(x['home'],x['home'])}) → "+" · ".join(x["links_to"]))
if moved:
    out.append(""); out.append("## 🚚 คำยกออก (ย้ายออกจากหมวด · ยังไม่ลบ · ไม่นับอยู่ในหมวดต้นทางแล้ว)")
    for x in moved: out.append(f"- {x['text']} ({HOME.get(x['from'],x['from'])}) → {x['to']}")
open("docs/branches-data.md","w",encoding='utf-8').write("\n".join(out)+"\n")

nlak=sum(1 for b in branches if b['level']=='lak')
per=defaultdict(int)
for (c,t) in word_order: per[c]+=1
print(f"OK · {len(categories)} หมวด · {len(branches)} กิ่ง (หลัก {nlak}) · {len(data['words'])} คำ · โยงข้ามหมวด {len(cross)} · ยกออก {len(moved)}")
print("คำต่อหมวด:", {HOME.get(c,c):n for c,n in sorted(per.items())})
