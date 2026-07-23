# -*- coding: utf-8 -*-
# gen_branches.py — สร้างไฟล์ "กิ่งที่เกลาแล้ว" 3 ไฟล์ จากไฟล์ร่าง redesign
#   อ่าน:  docs/cat1-redesign.md · docs/cat2-redesign.md · docs/cat10-objects-redesign.md
#   เขียน: docs/branches-clean.md  (โครงกิ่ง + นิยาม + อังกฤษ · ไม่มีคำ · คนอ่าน)
#          docs/branches-data.json (กิ่ง + นิยาม + อังกฤษ + คำ + โยงข้ามหมวด + ยกออก · อัป Supabase)
#          docs/branches-data.md   (เหมือน json แต่ฉบับอ่านทวน)
#   กฎ: คัดชื่อกิ่ง/นิยาม/อังกฤษ verbatim จากต้นฉบับ · ตัด tag/หมายเหตุ(🗨)/อภิปราย/ป้าย(🆕⚡✳️🚚🔄) ออกหมด
#   รหัสหมวด: หมวด 1=c0 · หมวด 2=c1 · หมวด 10=c9
#   รัน: python3 scripts/gen_branches.py   (จาก root ของ repo)
import re, json
from collections import defaultdict

FILES = [("docs/cat1-redesign.md",1,"c0"),("docs/cat2-redesign.md",2,"c1"),("docs/cat10-objects-redesign.md",10,"c9")]
CAT = {1:"หมวด 1",2:"หมวด 2",10:"หมวด 10"}
HOME = {"c0":"หมวด 1","c1":"หมวด 2","c9":"หมวด 10"}

def split_name_en(s):
    m=re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', s.strip())
    return (m.group(1).strip(), m.group(2).strip()) if m else (s.strip(),"")
def strip_notes(line): return re.sub(r'_\([^)]*\)_','',line)
def clean_word(tok):
    t=re.sub(r'_[^_]*_','',strip_notes(tok)).replace('**','')
    for mk in ['⚡','✳️','🔗','➕','🆕','🔄','🚚','🌿','🌲','🍃']: t=t.replace(mk,'')
    return t.strip(' ·—-\t').strip()
def is_thai(s): return any('฀'<=ch<='๿' for ch in s)

categories=[]; branches=[]; moved=[]; cross=[]
words={}; word_order=[]

for path,no,cid in FILES:
    lines=open(path,encoding='utf-8').read().splitlines()
    for l in lines:
        m=re.match(r'^\*\*หมวด\s*\d+\s*·\s*(.+?)\s*\(([^()]*)\)\*\*\s*—\s*_(.+?)_\s*$', l.strip())
        if m:
            categories.append({"id":cid,"no":no,"name_th":m.group(1).strip(),"name_en":m.group(2).strip(),"definition":m.group(3).strip()}); break

    in_tree=False; expect=False; lak=yoy=khaeng=None
    for l in lines:
        s=l.strip()
        if s.startswith('## 🌳'): in_tree=True; continue
        if in_tree and re.match(r'^##\s',l) and not l.startswith('###'): in_tree=False
        if not in_tree or not s: continue
        m=re.match(r'^###\s*🌲\s*กิ่งหลัก\s*\d+\s*·\s*(.+)$', s)
        if m:
            head=re.sub(r'\s*_\([^)]*\)_\s*$','',m.group(1)).strip(); nm,en=split_name_en(head)
            lak={"category_id":cid,"path":nm,"en":en,"definition":"","level":"lak"}; branches.append(lak); yoy=khaeng=None; expect=True; continue
        if expect and s.startswith('>'):
            d=re.match(r'^>\s*_(.+?)_\s*$',s)
            if d: lak["definition"]=d.group(1).strip()
            expect=False; continue
        expect=False
        if s.startswith('🗨'): continue
        m=re.match(r'^-\s*(?:(?:🆕|🔄)\s*)*🍃\s*\*\*(.+?)\*\*\s*—\s*_(.+?)_\s*$', s)
        if m and l.startswith('  '):
            nm,en=split_name_en(m.group(1)); khaeng={"category_id":cid,"path":yoy["path"]+" / "+nm,"en":en,"definition":m.group(2).strip(),"level":"khaeng"}; branches.append(khaeng); continue
        m=re.match(r'^-\s*(?:(?:🆕|🔄)\s*)*🌿\s*\*\*(.+?)\*\*\s*—\s*_(.+?)_\s*$', s)
        if m:
            nm,en=split_name_en(m.group(1)); yoy={"category_id":cid,"path":lak["path"]+" / "+nm,"en":en,"definition":m.group(2).strip(),"level":"yoy"}; branches.append(yoy); khaeng=None; continue
        if s[0] in '->|#': continue
        ab=khaeng or yoy or lak
        if not ab: continue
        for tok in strip_notes(l).split(' · '):
            w=clean_word(tok)
            if w and is_thai(w) and len(w)<=60:
                k=(cid,w)
                if k not in words: words[k]=[]; word_order.append(k)
                if ab["path"] not in words[k]: words[k].append(ab["path"])

    # โยงข้ามหมวด (ตารางในไฟล์ cat2)
    if cid=='c1':
        intbl=False
        for l in lines:
            if l.strip().startswith('| คำ | กิ่งหลัก'): intbl=True; continue
            if intbl:
                if not l.strip().startswith('|'): break
                cols=[c.strip() for c in l.strip().strip('|').split('|')]
                if len(cols)>=3 and cols[0]!='คำ' and not set(cols[0])<=set('-: '):
                    tg=['หมวด '+n for n in re.findall(r'ม\.(\d+)', cols[2])]
                    if tg: cross.append({"text":cols[0].strip(),"home":cid,"links_to":tg})
    # ยกออก (ตาราง 🚚)
    inm=False
    for l in lines:
        if l.startswith('## 🚚'): inm=True; continue
        if inm:
            if l.strip().startswith('## ') or l.strip()=='---': break
            if l.strip().startswith('|'):
                cols=[c.strip() for c in l.strip().strip('|').split('|')]
                if len(cols)>=2 and cols[0]!='คำ' and not set(cols[0])<=set('-: '):
                    for w in cols[0].split(' · '):
                        w=w.strip()
                        if w: moved.append({"text":w,"from":cid,"to":cols[1]})

# ---------- JSON ----------
data={"meta":{"source":[f for f,_,_ in FILES],"status":"draft — ยังไม่อัป Supabase","categories":[1,2,10],
      "note":"category_id: หมวด1=c0 · หมวด2=c1 · หมวด10=c9 · path คั่นชั้นด้วย ' / '"},
      "categories":categories,
      "branches":[{"category_id":b["category_id"],"path":b["path"],"en":b["en"],"definition":b["definition"]} for b in branches],
      "words":[{"text":t,"category_id":c,"subpaths":words[(c,t)]} for (c,t) in word_order],
      "cross_links":cross,"moved_out":moved}
open("docs/branches-data.json","w",encoding='utf-8').write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")

# ---------- clean md (โครงล้วน) ----------
bycat=defaultdict(list)
for b in branches: bycat[b["category_id"]].append(b)
out=["# 🌿 รายนามกิ่ง (โครงสะอาด) — หมวด 1, 2, 10","",
     "> โครงกิ่งล้วน: **ชื่อไทย (English) — นิยาม** · ไม่มีคำ ไม่มีหมายเหตุ ไม่มี tag",
     "> ที่มา: `cat1/cat2/cat10-redesign.md` · เป็นร่าง ยังไม่แตะเว็บ/database/subtree.js"]
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
out=["# 🌿 ข้อมูลกิ่ง + คำ ทั้งหมด (อ่านทวน) — หมวด 1, 2, 10","",
     "> ฉบับอ่านของ `branches-data.json` · มีครบทั้งกิ่ง นิยาม อังกฤษ และ**คำ** · เป็นข้อมูลดิบ (ไม่มีความเห็น/อภิปราย)",
     "> รหัสหมวด: หมวด 1=c0 · หมวด 2=c1 · หมวด 10=c9 · เป็นร่าง ยังไม่แตะเว็บ/database"]
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
print(f"OK · {len(categories)} หมวด · {len(branches)} กิ่ง (หลัก {nlak}) · {len(data['words'])} คำ · โยงข้ามหมวด {len(cross)} · ยกออก {len(moved)}")
