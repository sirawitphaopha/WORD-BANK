#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เขียน "ที่อยู่ของกิ่ง" ให้ครบเส้น — จุดเดียวของทั้งโปรเจกต์

🚨 กฎที่เจ้าของคลังตั้งเอง 1 ส.ค. 2569
    _"การเขียนว่าวลีไหนอยู่กิ่งไหน เธอแม่งเขียนแค่กิ่งต่ำสุด แล้วเราจะรู้ไหมว่ากิ่งระดับ 1 คืออะไร หมวดไหน
      ตั้งเป็นกฎ ถ้าจะพูดว่าวลีนี้อยู่กิ่งไหน เขียนมาเลยให้ครบ หมวด กิ่ง1 กิ่ง 2 กิ่ง 3 และมีเครื่องหมายชี้มา"_
    _"มาเขียนว่า D05-01-000 · C02-01-001 โอ้โห กูจะเข้าใจสินะ ว่ามันชื่อกิ่งอะไร
      ไอ้รหัสบ้านี้ใส่เป็นวงเล็บ และต้องมีชื่อกิ่งแท้ ๆ ด้วย เราเป็น AI เหรอ เราจำได้หมดใช่ไหมทั้งหลายร้อยกิ่ง"_

✅ รูปแบบที่ถูก (ใช้ทุกที่ ทั้ง md · html · แชท)
    หมวด 3 กริยา ท่าทาง และการเคลื่อนไหว › สายตาและการมอง(1) › การเห็นผิดและภาพลวงตา(2)  [C01-04-000]

❌ รูปแบบที่ห้ามใช้เด็ดขาด
    C01-04-000                       ← รหัสลอย ไม่มีใครจำได้
    การเห็นผิดและภาพลวงตา              ← กิ่งชั้นล่างสุดลอย ไม่รู้ว่าหมวดไหน
    สายตาและการมอง / การเห็นผิดฯ       ← ไม่มีหมวด ไม่มีเลขชั้น ไม่มีรหัส

วิธีใช้ในสคริปต์อื่น
    from branchpath import BranchBook
    bb = BranchBook()
    bb.line(code='C01-04-000')                    # เขียนจากรหัส
    bb.line(cat='c2', path='สายตาและการมอง / ...')  # เขียนจากหมวด+เส้นทาง
    bb.line(code='C01-04-000', arrow='→ ')        # เติมหัวลูกศรข้างหน้า

ดูจากบรรทัดคำสั่ง
    python3 scripts/branchpath.py C01-04-000 D05-01-000
    python3 scripts/branchpath.py --word "โอ๊ก"      ค้นว่าคำนี้อยู่กิ่งไหนบ้าง
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)


class BranchBook:
    def __init__(self, path=None):
        d = json.load(open(path or P('docs/branches-data.json'), encoding='utf-8'))
        self.cats = {c['id']: (c['no'], c['name_th']) for c in d['categories']}
        self.by_code = {b['code']: b for b in d['branches'] if b.get('code')}
        self.by_path = {(b['category_id'], b['path']): b for b in d['branches']}
        self.branches = d['branches']

    def get(self, code=None, cat=None, path=None):
        if code:
            return self.by_code.get(code)
        return self.by_path.get((cat, path))

    def line(self, code=None, cat=None, path=None, arrow='', with_code=True, with_level=True):
        """คืนที่อยู่ของกิ่งแบบเต็มเส้น พร้อมหมวด เลขชั้น และรหัสในวงเล็บเหลี่ยม"""
        b = self.get(code, cat, path)
        if not b:
            return '%s❓ ไม่พบกิ่ง %s' % (arrow, code or path or '')
        no, nm = self.cats[b['category_id']]
        parts = b['path'].split(' / ')
        if with_level:
            parts = ['%s(%d)' % (p, i + 1) for i, p in enumerate(parts)]
        s = '%sหมวด %s %s › %s' % (arrow, no, nm, ' › '.join(parts))
        if with_code:
            s += '  [%s]' % (b.get('code') or 'ยังไม่มีรหัส')
        return s

    def en(self, code=None, cat=None, path=None):
        b = self.get(code, cat, path)
        return (b or {}).get('en')

    def definition(self, code=None, cat=None, path=None):
        b = self.get(code, cat, path)
        return (b or {}).get('definition')

    def is_heading(self, code=None, cat=None, path=None):
        """กิ่งหัวข้อ = มีกิ่งลูก → ลงคำไม่ได้"""
        b = self.get(code, cat, path)
        if not b:
            return False
        return any(o['category_id'] == b['category_id'] and o['path'].startswith(b['path'] + ' / ')
                   for o in self.branches)


def main():
    bb = BranchBook()
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 0
    if args[0] == '--word':
        res = json.load(open(P('docs/m2-sense/round2/result.json'), encoding='utf-8'))
        target = args[1]
        for w in res['words']:
            if w['text'] == target:
                print('「%s」  เล่ม: %s' % (w['text'], w.get('novel') or '—'))
                for m in (w.get('meanings') or []):
                    print('   ความหมาย ·', m)
                for p in (w.get('all_paths') or []):
                    print(bb.line(cat=p['category_id'], path=p['path'], arrow='   → '))
        return 0
    for a in args:
        print(bb.line(code=a))
        print('     อังกฤษ:', bb.en(code=a), '· นิยาม:', bb.definition(code=a))
    return 0


if __name__ == '__main__':
    sys.exit(main())
