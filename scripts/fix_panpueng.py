#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ยุบและเกลาคำ "ปั้นปึ่ง" ในคลังชุดใหม่ — เจ้าของคลังสั่งเอง 31 ก.ค. 2569

    _"ส่วนปั้นปึ่ง เธอรีไรต์อีกรอบเองเลย ว่าจะเอาไว้หมวดหรือกิ่งไหน แก้ได้"_

## ทำไมคำนี้ถึงซ้ำ
เดิมคลังชุดใหม่มี "ปั้นปึ่ง" อยู่ 2 แถว เพราะสะกดต่างกัน จึงไม่ถูกจับว่าซ้ำ
  · แถว 1  เจ้าของวางเป็นวลีตั้งต้นเอง          สะกด "ปั้นปึ่ง" (ถูก)
  · แถว 2  ตัดมาจาก "ท่าทางปั้นปึ่งเย็นชา"      สะกด "ปั้นปึ้ง" (ผิด)
พอแก้สะกดให้ถูกทั้งคู่เมื่อ 31 ก.ค. สองแถวจึงกลายเป็นข้อความเดียวกัน

## ต่างจากกรณี "ผมเผ้า" ตรงไหน
ผมเผ้า ซ้ำ **ข้ามเล่ม** (เสียงกระซิบจากความมืด + คินดะอิจิ) → ต้องคงสองแถวไว้แล้วโยง
เพราะเป็นหลักฐานว่าเจอคำเดียวกันในนิยายคนละเรื่อง
ส่วนปั้นปึ่ง ซ้ำ **ในเล่มเดียวกัน** = คำเดียวกันในเรื่องเดียวกัน เก็บมาสองรอบ
→ ยุบเป็นแถวเดียวได้ โดยเก็บวลีแม่ไว้ครบทั้งสองทาง ไม่มีอะไรหาย

## เกณฑ์ที่ใช้เลือกกิ่ง
พจนานุกรมราชบัณฑิตยสถาน: **ปั้นปึ่ง ก. ทำท่าเย่อหยิ่งไม่พูดจากับใคร**
คำนี้จึงมี 2 ด้านที่ต้องมีกิ่งรองรับ คือ (ก) วางท่าเย่อหยิ่ง (ข) ไม่ยอมพูดด้วย

เข้า 4 กิ่ง
  C06-01-000  หมวด 3 · คำเรียกรวมของกิริยาท่าทาง   ← "วางท่า" โดยไม่ระบุท่าเฉพาะ (ตรงที่สุด)
  C05-17-003  หมวด 3 · การโต้แย้งและปฏิเสธ         ← นิยามกิ่งครอบ "ไม่โต้ตอบ"
  C02-03-001  หมวด 3 · นิ่งเฉย/เย็นชา (สีหน้า)      ← สีหน้าเฉยแข็งที่มาคู่กัน
  H02-01-000  หมวด 8 · หยิ่งยโสอวดดี               ← ท่าทีถือตัวว่าเหนือกว่า

ถอน 2 กิ่ง
  หมวด 3 · เครียด/โกรธ/ไม่พอใจ (สีหน้า)
     ปั้นปึ่งไม่ได้แปลว่าโกรธหรือเครียด คนถือตัวไม่พูดด้วยอาจไม่ได้โกรธเลย = ตีความเกินตัวคำ
  หมวด 8 · เย็นชาไร้ความรู้สึก
     นิยามกิ่งคือ "ไร้อารมณ์ร่วม เฉยชาต่อทุกข์สุขผู้อื่น" ซึ่งหนักกว่าการงอนไม่พูดด้วยมาก
     กิ่งนี้ติดมาเพราะวลีแม่มีคำว่า "เย็นชา" อยู่ในตัว = ลอกกิ่งของวลีตั้งต้น
     ซึ่งขัดกฎข้อ 3ค ของคำสั่ง AI ที่ว่าคำที่สกัดต้องตัดสินจากตัวคำเอง
     🔑 กิ่งนี้ยังอยู่ครบที่ "ท่าทางปั้นปึ่งเย็นชา" ซึ่งเป็นวลีแม่ — ไม่ได้หายไปจากคลัง

ใช้:  python3 scripts/fix_panpueng.py            ดูผลอย่างเดียว
      python3 scripts/fix_panpueng.py --write    เขียนไฟล์จริง
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
TARGET = 'ปั้นปึ่ง'
MEANING = 'วางท่าเย่อหยิ่ง ไม่ยอมพูดจาด้วย'

KEEP = [
    ('c2', 'ท่าทางและภาพรวมร่างกาย / คำเรียกรวมของกิริยาท่าทาง'),
    ('c2', 'การสื่อสารและพฤติกรรมทางสังคม / การด่า/ตำหนิ/ขัดแย้ง / การโต้แย้งและปฏิเสธ'),
    ('c2', 'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / นิ่งเฉย/เย็นชา'),
    ('c7', 'ความหยิ่งและการถ่อมตน / หยิ่งยโสอวดดี'),
]


def main():
    write = '--write' in sys.argv
    f = P('docs/newwords-branches.json')
    d = json.load(open(f, encoding='utf-8'))

    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    BR = {(b['category_id'], b['path']): b for b in bd['branches']}
    HAS_CHILD = {(b['category_id'], b['path']) for b in bd['branches']
                 if any(o['path'].startswith(b['path'] + ' / ') and o['category_id'] == b['category_id']
                        for o in bd['branches'])}
    NO = {c['id']: c['no'] for c in bd['categories']}

    # ── ด่านก่อนแตะ: กิ่งที่จะใส่ต้องมีจริง และต้องเป็นกิ่งที่ลงคำได้ ──
    for k in KEEP:
        if k not in BR:
            print('🔴 ไม่มีกิ่งนี้ในคลัง: %s' % (k,)); return 1
        if k in HAS_CHILD:
            print('🔴 กิ่งนี้เป็นหัวข้อ มีกิ่งลูก ห้ามลงคำ: %s' % (k,)); return 1

    rows = [w for w in d['words'] if w['text'] == TARGET]
    if len(rows) < 2:
        print('ไม่มีอะไรให้ยุบ — เจอ %d แถว' % len(rows)); return 0

    print('ก่อนแก้ — %d แถว' % len(rows))
    for w in rows:
        print('  · ที่มา: %s' % (w.get('source') or 'วลีตั้งต้นเอง'))
        for p in (w.get('all_paths') or []):
            print('      หมวด %-3s %s' % (NO.get(p['category_id'], '?'), p['path']))

    # ── ยุบเป็นแถวเดียว: เก็บวลีแม่ทุกทาง ──
    keep = rows[0]
    parents = []
    for w in rows:
        for s in ([w['source']] if w.get('source') else []) + list(w.get('picked_from') or []):
            if s and s not in parents:
                parents.append(s)
    keep['source'] = parents[0] if parents else None
    keep['picked_from'] = parents[1:]
    keep['meaning'] = MEANING
    keep['all_paths'] = [{'category_id': c, 'path': p} for c, p in KEEP]
    keep['subpaths'] = [p for c, p in KEEP if c == keep['category_id']]
    keep['subpath'] = keep['subpaths'][0] if keep['subpaths'] else None
    d['words'] = [w for w in d['words'] if not (w['text'] == TARGET and w is not keep)]

    print('\nหลังแก้ — 1 แถว')
    print('  ความหมาย: %s' % keep['meaning'])
    print('  วลีแม่ %d: %s' % (len(parents), ' · '.join(parents) or '—'))
    for c, p in KEEP:
        print('      หมวด %-3s %-58s %s' % (NO.get(c, '?'), p, BR[(c, p)].get('code')))

    if write:
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('\nเขียน docs/newwords-branches.json (%d คำ)' % len(d['words']))
        print('อย่าลืมสร้าง docs/newwords-branches.md ใหม่ให้ตรงกัน')
    else:
        print('\n(ดูผลอย่างเดียว — ใส่ --write เพื่อเขียนไฟล์จริง)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
