#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ย้ายคำตอบรอบที่ 3 เข้าไปรวมกับรอบที่ 2 เพื่อให้รายงานรวมนับครบทุกรายการ

รอบที่ 3 เปลี่ยนรูปแบบคำตอบเพื่อประหยัดโทเคน (ตอบเป็น "รหัสกิ่ง" ไม่ใช่ชื่อกิ่ง
และรวมช่อง senses เข้ากับ meanings) ตัวสร้างรายงานเดิมจึงอ่านไม่ออก
ไฟล์นี้แปลงกลับให้อยู่ในรูปเดียวกับรอบที่ 2 แล้ววางไว้ในโฟลเดอร์รอบที่ 2

    รอบ 3  {"id","w","meanings",  "paths":[{"code","category_id","path"}]}
    รอบ 2  {"id","w","senses","meanings","paths":[{"c","p","why"}]}

🔑 senses ของรอบที่ 3 = จำนวนช่องใน meanings
   เพราะรอบนี้สั่งให้ "หนึ่งความหมายต่อหนึ่งช่อง" ตั้งแต่ต้น จึงไม่ต้องมีช่องแยกอีก

🔑 why เป็น null ทั้งหมด — รอบที่ 3 ตัดช่องเหตุผลรายเส้นออกเพื่อประหยัดโทเคน
   (เหตุผลที่แท้จริงอ่านได้จากความหมายที่เขียนไว้แล้ว)

ใช้:  python3 scripts/merge_round3.py            ดูผลอย่างเดียว
      python3 scripts/merge_round3.py --write    เขียนไฟล์จริง
"""
import json, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
SRC = P('docs/m2-sense/round3')
OUT = P('docs/m2-sense/round2/sense-r3.jsonl')   # ชื่อขึ้นต้น sense* เพื่อให้ตัวสร้างรายงานเดิมเก็บไปเอง


def main():
    write = '--write' in sys.argv
    files = sorted(glob.glob(os.path.join(SRC, 'resolved*.jsonl')))
    if not files:
        print('🔴 ยังไม่มีไฟล์ resolved — รัน check_sense_v3.py --write ก่อน')
        return 1

    rows, seen = [], set()
    for f in files:
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            if r['id'] in seen:            # กันตอบซ้ำข้ามไฟล์
                continue
            seen.add(r['id'])
            mns = r.get('meanings') or []
            rows.append({
                'id': r['id'],
                'w': r['w'],
                'suspect': r.get('suspect'),
                'senses': list(mns),       # หนึ่งความหมาย = หนึ่งบริบท (รอบนี้รวมช่องแล้ว)
                'meanings': mns,
                'paths': [{'c': p['category_id'], 'p': p['path'], 'why': None}
                          for p in (r.get('paths') or [])],
                'new_paths': r.get('new_paths') or [],
            })

    rows.sort(key=lambda x: x['id'])
    npaths = sum(len(r['paths']) for r in rows)
    print('แปลง %d รายการ · เส้นกิ่ง %d (เฉลี่ย %.2f) · ความหมาย %d ช่อง'
          % (len(rows), npaths, npaths / max(1, len(rows)), sum(len(r['meanings']) for r in rows)))

    if write:
        with open(OUT, 'w', encoding='utf-8') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
        print('เขียน docs/m2-sense/round2/sense-r3.jsonl')
        print('ต่อไป: python3 scripts/check_sense.py --round2  แล้ว  python3 scripts/gen_round2_docs.py')
    else:
        print('\n(ดูผลอย่างเดียว — ใส่ --write เพื่อเขียนไฟล์จริง)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
