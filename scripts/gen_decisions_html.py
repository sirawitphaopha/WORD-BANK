#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างฉบับ HTML ของไฟล์ "เรื่องที่รอพี่กันเคาะ" ให้อ่านบนมือถือได้

ตัว md เขียนด้วยมือที่ `docs/m2-sense/DECISIONS-PENDING.md`
(ต่างจากรายงานอื่นที่สร้างจากข้อมูล เพราะไฟล์นี้เป็นความเห็นและข้อเสนอ ไม่ใช่ผลคำนวณ)
สคริปต์นี้ทำหน้าที่เดียวคือแปลงเป็นหน้าอ่าน โดยใช้ตัวแปลงและธีมชุดเดียวกับรายงานอื่น
→ หน้าตาเหมือนกันทุกไฟล์ ตารางเลื่อนแนวนอนได้ และกลายเป็นการ์ดบนจอแคบ

🔑 กฎ md ↔ HTML คู่กันเสมอ — แก้ md เมื่อไหร่ ต้องรันไฟล์นี้ใหม่ทุกครั้ง

ใช้:  python3 scripts/gen_decisions_html.py
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
P = lambda *a: os.path.join(ROOT, *a)

from gen_final_report import to_html      # ตัวแปลง md→html + ธีมกระดาษชุดเดียวกัน

SRC = P('docs/m2-sense/DECISIONS-PENDING.md')
OUT = P('docs/m2-sense/DECISIONS-PENDING.html')
TITLE = 'คลังคำ — เรื่องที่รอเคาะ'


def main():
    if not os.path.exists(SRC):
        print('🔴 ไม่มีไฟล์ต้นทาง: docs/m2-sense/DECISIONS-PENDING.md')
        return 1
    md = open(SRC, encoding='utf-8').read()
    open(OUT, 'w', encoding='utf-8').write(to_html(md, TITLE))
    print('เขียน docs/m2-sense/DECISIONS-PENDING.html (%d บรรทัดจาก md)' % md.count('\n'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
