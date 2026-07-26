#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ด่านตรวจผลสกัดคำ+กิ่ง ของคลังเดิม (รูปแบบ docs/oldwords/extract/out*.jsonl)

ใช้: python3 scripts/check_extract.py
🔴 ด่านที่สำคัญที่สุด = คำสกัดต้องเป็นท่อนต่อเนื่องของวลีเดิมจริง
   จับกรณีเอเจนต์ประกอบคำขึ้นเองจากคนละท่อน (เคยเกิดจริง)
"""
import json, glob, os, sys, collections
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *a: os.path.join(ROOT,*a)
COMB=set('ัิีึืุู่้๊๋์็ําะๆฯ'); LEAD=set('เแโใไ')
MAXP=4; MAXD=2

bd=json.load(open(P('docs/branches-data.json'),encoding='utf-8'))
valid={(b['category_id'],b['path']) for b in bd['branches']}
cats={c['id']:c['name_th'] for c in bd['categories']}
cur={w['text'] for w in bd['words']}
nw={w['text'] for w in json.load(open(P('docs/newwords-branches.json'),encoding='utf-8'))['words']}
# 🔴 บทเรียน 26 ก.ค.: เคยแก้ in.jsonl ระหว่างที่เอเจนต์กำลังใช้อยู่ (654 → 666 วลี)
# เลขบรรทัด n ของผลที่เอเจนต์ส่งกลับจึงเลื่อนไม่ตรงกับไฟล์ใหม่ ตัวตรวจฟ้อง "คำเดิมถูกแก้" ยกแผง
# → ยึด "ตัวข้อความ" เป็นกุญแจหลักเสมอ เลข n เป็นแค่ตัวช่วย และรีแมปให้ใหม่ตอนรวมผล
_rows=[json.loads(l) for l in open(P('docs/oldwords/extract/in.jsonl'),encoding='utf-8') if l.strip()]
inp={r['n']:r for r in _rows}
BYT={r['t']:r for r in _rows}

declared=set()
for f in sorted(glob.glob(P('docs/oldwords/extract/newbr*.json'))):
    try:
        for b in json.load(open(f,encoding='utf-8')):
            if b.get('c') and b.get('p'): declared.add((b['c'],b['p']))
    except Exception: pass

red=[];yellow=[];seen=collections.Counter();stat=collections.Counter()
# ถ้ารวมผลแล้ว (merge_extract.py) ให้ตรวจฉบับรวม — วลีที่หลายฝ่ายทำซ้อนกันถูกยุบเป็นแถวเดียวแล้ว
FILES=[P('docs/oldwords/extract/merged.jsonl')] if os.path.exists(P('docs/oldwords/extract/merged.jsonl')) \
      else sorted(glob.glob(P('docs/oldwords/extract/out*.jsonl')))
for f in FILES:
    who=os.path.basename(f)
    for ln,line in enumerate(open(f,encoding='utf-8'),1):
        if not line.strip(): continue
        try: r=json.loads(line)
        except Exception as e: red.append((who,'-','R0 JSON เสีย',str(e))); continue
        n=r.get('n'); t=r.get('t')
        stat['rows']+=1
        src=BYT.get(t)                       # ยึดตัวข้อความเป็นหลัก ไม่ยึดเลขบรรทัด
        if src is None:
            red.append((who,n,'R2 วลีนี้ไม่มีในคลัง (ข้อความถูกแก้)',repr(t))); continue
        seen[src['n']]+=1
        r['n']=src['n']                       # รีแมปเลขให้ตรงไฟล์ปัจจุบัน
        for e in (r.get('ex') or []):
            w=(e.get('w') or '').strip(); stat['ex']+=1
            if not w: red.append((who,n,'R3 คำสกัดว่าง','')); continue
            if w not in r['t']: red.append((who,n,'R3 ไม่ใช่ท่อนต่อเนื่อง','%r ⊄ %r'%(w,r['t']))); continue
            if w[0] in COMB: red.append((who,n,'R4 ขึ้นต้นสระ/วรรณยุกต์ลอย',w))
            if w[-1] in LEAD: red.append((who,n,'R4 ค้างสระหน้า',w))
            if w==r['t']: red.append((who,n,'R5 เท่ากับวลีเดิม',w))
            if w.count('[')!=w.count(']'): red.append((who,n,'R6 วงเล็บเหลี่ยมขาด',w))
            if w in cur: yellow.append((who,n,'Y1 มีในคลังเดิมแล้ว',w))
            elif w in nw: yellow.append((who,n,'Y1 มีในคลังชุดใหม่แล้ว',w))
            ps=e.get('paths') or []
            if not ps: red.append((who,n,'R7 คำสกัดไม่มีกิ่ง',w))
            if len(ps)>MAXP: yellow.append((who,n,'Y7 กิ่งเกิน %d'%MAXP,w))
            for p in ps: chk(who,n,p,'คำสกัด %r'%w) if False else None
            for p in ps:
                c,pp=p.get('c'),p.get('p')
                if (c,pp) not in valid and (c,pp) not in declared: red.append((who,n,'R7 กิ่งลอย','%s|%s'%(c,pp)))
                elif pp.count(' / ')>MAXD: red.append((who,n,'R8 ลึกเกิน 3 ชั้น',pp))
                elif c in cats and pp.split(' / ')[0]==cats[c]: red.append((who,n,'R9 ขึ้นต้นชื่อหมวด',pp))
        for a in (r.get('add') or []):
            stat['add']+=1
            c,pp=a.get('c'),a.get('p')
            if not c or not pp: red.append((who,n,'R7 กิ่งเพิ่มไม่ครบช่อง',str(a))); continue
            if (c,pp) not in valid and (c,pp) not in declared: red.append((who,n,'R7 กิ่งลอย (add)','%s|%s'%(c,pp)))
            elif pp.count(' / ')>MAXD: red.append((who,n,'R8 ลึกเกิน (add)',pp))
            elif c in cats and pp.split(' / ')[0]==cats[c]: red.append((who,n,'R9 ขึ้นต้นชื่อหมวด (add)',pp))
dup=[n for n,c in seen.items() if c>1]
if dup: red.append(('-','-','R1 บรรทัดซ้ำข้ามไฟล์',str(dup[:10])))
print('วลีที่มีข้อเสนอ %d · คำสกัด %d · กิ่งเพิ่ม %d'%(stat['rows'],stat['ex'],stat['add']))
print('🔴 ด่านแดง %d · 🟡 ด่านเหลือง %d'%(len(red),len(yellow)))
for x in red[:20]: print('   🔴',x[0],'บรรทัด',x[1],'·',x[2],'·',x[3])
if len(red)>20: print('   … อีก',len(red)-20)
yc=collections.Counter(y[2] for y in yellow)
for k,v in yc.most_common(): print('   🟡',k,v)
sys.exit(1 if red else 0)
