#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ฉบับสำรองของงานที่พี่กันนั่งคัดเอง → docs/archive/oldwords-round/oldwords-picked.md

ใช้: python3 scripts/gen_oldwords_picked_md.py

🛟 **เหตุผลที่ต้องมีไฟล์นี้** — งานที่พี่กันนั่งลากนิ้วคัดเป็นชั่วโมงอยู่แค่ในเครื่องมือ HTML
   ถ้าเบราว์เซอร์ล้างข้อมูลทิ้ง งานหายหมด · เอาลงเรพแล้วไม่หายอีก
   (ทำแบบเดียวกับ `docs/archive/newwords-round/newwords-picked.md` ของคลังชุดใหม่ที่เคยกู้งาน 675 คำไว้)
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

PK = json.load(open(P('docs/oldwords/picked/picked.json'), encoding='utf-8'))
FIN = json.load(open(P('docs/oldwords/picked/final.json'), encoding='utf-8'))
BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
NO = {c['id']: c['no'] for c in BD['categories']}
NAME = {c['id']: c['name_th'] for c in BD['categories']}
cname = lambda c: 'หมวด %s %s' % (NO.get(c, '?'), NAME.get(c, c))

paths = {r['w']: r['paths'] for r in FIN['words']}
rows = PK['picked']
own = [r for r in rows if r['src'] in ('own', 'both')]
sysv = [r for r in rows if r['src'] == 'sys']
noted = [r for r in rows if r.get('note')]
multi = PK['multi_parent']


def main():
    o = ['# คำที่พี่กันคัดเองจากคลังเดิม — %d รายการ' % len(rows), '',
         '> 🛟 **ไฟล์นี้คือฉบับสำรองของงานที่พี่กันนั่งคัดด้วยเครื่องมือลากนิ้ว** (`docs/archive/oldwords-round/oldwords-extract.html`)',
         '> เก็บลงเรพแล้ว **ต่อจากนี้ไม่หายอีก แม้เครื่องมือจะล้างข้อมูลทิ้ง**',
         '> สร้างอัตโนมัติจาก `scripts/gen_oldwords_picked_md.py` · อย่าแก้มือ', '',
         '## สรุป', '',
         '| หัวข้อ | จำนวน |', '|---|---|',
         '| รายการทั้งหมด | %d |' % len(rows),
         '| **พี่กันลากนิ้ว/พิมพ์เอง** | **%d** |' % len(own),
         '| ระบบเสนอแล้วพี่กันติ๊กเลือก | %d |' % len(sysv),
         '| มีหมายเหตุกำกับ | %d |' % len(noted),
         '| คำไม่ซ้ำ | %d |' % len({r['w'] for r in rows}),
         '| คำที่ตัดมาจากมากกว่า 1 วลี | %d |' % len(multi),
         '| วลีตั้งต้นที่ถูกแตะ | %d บรรทัด |' % len({r['n'] for r in rows}), '']

    if noted:
        o += ['## 📝 คำที่พี่กันเขียนหมายเหตุกำกับ', '',
              '| คำ | วลีตั้งต้น | บรรทัด | หมายเหตุของพี่กัน |', '|---|---|---|---|']
        for r in noted:
            o.append('| **%s** | %s | %d | **%s** |' % (r['w'], r['phrase'], r['n'], r['note']))
        o.append('')

    o += ['## ✂️ คำที่พี่กันลากนิ้วสกัดเอง (%d รายการ)' % len(own), '',
          '> คำกลุ่มนี้ระบบไม่ได้เสนอ พี่กันมองเห็นเองแล้วลากออกมาจากวลี', '',
          '| # | คำ | ตัดมาจากวลี | บรรทัด | กิ่งที่ได้ |', '|---|---|---|---|---|']
    for r in own:
        ps = paths.get(r['w']) or []
        pp = ' · '.join('%s › %s' % (cname(p['c']), p['p']) for p in ps) or '—'
        o.append('| %d | **%s** | %s | %d | %s |' % (r['idx'], r['w'], r['phrase'], r['n'], pp))

    o += ['', '## 👆 คำที่ระบบเสนอแล้วพี่กันติ๊กเลือก (%d รายการ)' % len(sysv), '',
          '| # | คำ | ตัดมาจากวลี | บรรทัด | กิ่งที่ได้ |', '|---|---|---|---|---|']
    for r in sysv:
        ps = paths.get(r['w']) or []
        pp = ' · '.join('%s › %s' % (cname(p['c']), p['p']) for p in ps) or '—'
        o.append('| %d | %s | %s | %d | %s |' % (r['idx'], r['w'], r['phrase'], r['n'], pp))

    if multi:
        o += ['', '## 🔗 คำที่ตัดมาจากหลายวลี (%d คำ)' % len(multi), '',
              '> คำเดียวกันแต่พี่กันเจอในวลีคนละอัน — เก็บเส้นเชื่อมไว้ทุกเส้น ไม่นับเป็นคำซ้ำ', '',
              '| คำ | จำนวนวลีแม่ | บรรทัดที่ |', '|---|---|---|']
        for w, ns in sorted(multi.items(), key=lambda x: -len(x[1])):
            o.append('| **%s** | %d | %s |' % (w, len(ns), ' · '.join(str(n) for n in ns)))

    open(P('docs/archive/oldwords-round/oldwords-picked.md'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')
    print('เขียน docs/archive/oldwords-round/oldwords-picked.md')
    print('  ทั้งหมด %d · พี่กันลากเอง %d · ระบบเสนอ %d · มีหมายเหตุ %d · มาจากหลายวลี %d'
          % (len(rows), len(own), len(sysv), len(noted), len(multi)))


if __name__ == '__main__':
    main()
