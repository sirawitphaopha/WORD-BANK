#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวมกิ่งเข้ากับคำที่พี่กันคัดไว้ → docs/oldwords/picked/final.json

ใช้: python3 scripts/merge_picked.py

รวม 3 แหล่ง:
 ① docs/oldwords/picked/picked.json      คำที่พี่กันคัด 489 รายการ (363 มีกิ่งแล้ว)
 ② docs/oldwords/picked/paths1.jsonl     กิ่งของ 63 คำแรกที่ยังไม่มีกิ่ง
 ③ docs/oldwords/picked/paths2.jsonl     กิ่งของ 63 คำหลัง
แล้วยุบเป็น "หนึ่งแถวต่อหนึ่งคำ" พร้อมเส้นเชื่อมทุกเส้นไปยังวลีแม่ (ระบบใยแมงมุม)

🔴 FIXES = จุดที่ผู้ตรวจทานทักแล้วแคลร์ตรวจเองซ้ำ **ไม่ได้รับมาทั้งดุ้น**
   รับข้อเสนอ 1 จาก 3 · อีก 2 จุดเลือกถอนกิ่งที่ผิดออกแทน เพราะกิ่งที่เสนอมาแทนไม่ตรงกว่าเดิม
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/oldwords/picked', *a)

# (idx, รหัสหมวดเดิม, เส้นทางเดิม) → None = ถอนออก · (c,p) = แทนที่
FIXES = {
    # ✅ รับข้อเสนอผู้ตรวจ — "ส่องสว่าง" เป็นกริยาให้แสง ไม่ได้บอกระดับความจ้า
    #    ลูกของกิ่งแสงทุกอันระบุระดับหมด (สว่าง/สลัว/วูบวาบ) จึงต้องอยู่ที่กิ่งแม่
    #    และวลีแม่คือ "ส่องสว่างวอมแวม" = แสงริบหรี่ไม่นิ่ง ขัดกับนิยาม "สว่างจ้าและนิ่ง"
    (303, 'c0', 'แสงและเงา / แสง / แสงสว่าง'): ('c0', 'แสงและเงา / แสง'),

    # ❌ ไม่รับข้อเสนอ (ผู้ตรวจเสนอ "สายตาและการมอง / กิริยาประกอบสายตา")
    #    "ข่มตาให้หลับ" ไม่ใช่กิริยาการมอง เป็นการพยายามนอน
    #    กิ่งที่ถูกมีอยู่แล้วในผล = "ง่วงซึมและการหลับ" (นิยาม: ภาวะง่วง เคลิ้ม หรือนอนไม่หลับ)
    #    → ถอนกิ่งอารมณ์ที่ผิดออก ไม่ต้องยัดกิ่งที่สอง
    (222, 'c4', 'การข่มและกลั้นอารมณ์'): None,

    # ❌ ไม่รับข้อเสนอ (ผู้ตรวจเสนอ "ใบหน้าซีดเซียวและทรุดโทรม")
    #    "ผอมเรียว" ไม่ได้แปลว่าทรุดโทรมหรือไร้เลือดฝาด — เป็นรูปหน้าเฉย ๆ อาจเป็นความงามก็ได้
    #    กิ่ง "โครงหน้าและรูปหน้า" ที่มีอยู่แล้วตรงที่สุด → ถอนกิ่งที่กว้างเกิน (ทั้งร่าง) ออก
    (169, 'c1', 'ทรวดทรงและภาพรวมของร่าง / มวลกายและความหนาของร่าง / ผอมบางบอบบาง'): None,
}


def main():
    pk = json.load(open(D('picked.json'), encoding='utf-8'))
    extra = {}
    for f in ('paths1.jsonl', 'paths2.jsonl'):
        for line in open(D(f), encoding='utf-8'):
            if line.strip():
                r = json.loads(line)
                extra[r['idx']] = r

    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    valid = {(b['category_id'], b['path']) for b in bd['branches']}
    cats = {c['id']: c['name_th'] for c in bd['categories']}
    have_old = {w['text'] for w in bd['words']}

    applied, red = set(), []
    words = {}                       # ตัวคำ → แถวรวม
    for r in pk['picked']:
        idx, w = r['idx'], r['w']
        paths = r.get('paths') or []
        if not paths:
            e = extra.get(idx)
            if e:
                paths = e.get('paths') or []
                if e.get('meaning') and not r.get('meaning'):
                    r['meaning'] = e['meaning']
            else:
                red.append(('R1 ไม่มีกิ่งและหาไม่เจอในผลรอบสอง', idx, w))

        keep = []
        for p in paths:
            k = (idx, p['c'], p['p'])
            if k in FIXES:
                applied.add(k)
                nf = FIXES[k]
                if nf is None:
                    continue                      # ถอนกิ่งที่ผิดออก
                p = {'c': nf[0], 'p': nf[1], 'why': p.get('why')}
            if (p['c'], p['p']) not in valid:
                red.append(('R2 กิ่งลอย', idx, '%s|%s' % (p['c'], p['p'])))
                continue
            keep.append(p)
        if not keep:
            red.append(('R3 คำนี้ไม่เหลือกิ่งเลย', idx, w))

        rec = words.setdefault(w, {'w': w, 'paths': {}, 'from': [], 'meaning': None,
                                   'in_old': w in have_old, 'by_owner': False})
        for p in keep:
            rec['paths'].setdefault((p['c'], p['p']), p.get('why'))
        rec['from'].append({'n': r['n'], 'phrase': r['phrase'], 'src': r['src']})
        if r.get('meaning') and not rec['meaning']:
            rec['meaning'] = r['meaning']
        if r.get('by_owner'):
            rec['by_owner'] = True
        if r.get('note'):
            rec['note'] = r['note']

    for k in FIXES:
        if k not in applied:
            red.append(('R0 แก้ไม่ลง (หาเป้าไม่เจอ)', k[0], '%s|%s' % (k[1], k[2])))

    out = []
    for w, rec in words.items():
        out.append({
            'w': w, 'meaning': rec['meaning'], 'in_old': rec['in_old'],
            'by_owner': rec['by_owner'], 'note': rec.get('note'),
            'paths': [{'c': c, 'p': p, 'why': why} for (c, p), why in rec['paths'].items()],
            'from': rec['from'],
        })
    out.sort(key=lambda r: (r['paths'][0]['c'] if r['paths'] else 'zz', r['w']))

    json.dump({'words': out}, open(D('final.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    newc = [r for r in out if not r['in_old']]
    linkback = [r for r in out if r['in_old']]
    percat = collections.Counter(p['c'] for r in newc for p in r['paths'])
    multi = [r for r in newc if len(r['paths']) > 1]
    multicat = [r for r in newc if len({p['c'] for p in r['paths']}) > 1]
    multisrc = [r for r in out if len(r['from']) > 1]

    print('เขียน %s' % D('final.json'))
    print('  คำไม่ซ้ำทั้งหมด %d · **คำใหม่ %d** · เส้นเชื่อมย้อนหลังของคำเดิม %d'
          % (len(out), len(newc), len(linkback)))
    print('  คำที่ตัดมาจากหลายวลี %d · คำที่ติดหลายกิ่ง %d · **ติดข้ามหมวด %d (%.0f%%)**'
          % (len(multisrc), len(multi), len(multicat), 100 * len(multicat) / max(1, len(newc))))
    print('  กิ่งที่ถูกแตะ %d เส้น ไม่ซ้ำ %d กิ่ง'
          % (sum(len(r['paths']) for r in out),
             len({(p['c'], p['p']) for r in out for p in r['paths']})))
    print('  แก้ตามรอบตรวจทาน %d จุด' % len(applied))
    print('  คำใหม่ต่อหมวด: %s'
          % ' · '.join('%s %d' % (cats[c].split()[0] if c in cats else c, n)
                       for c, n in sorted(percat.items())))
    print('🔴 ด่านแดง %d' % len(red))
    for x in red[:20]:
        print('   🔴 %s · ข้อ %s · %s' % (x[0], x[1], x[2]))
    return 1 if red else 0


if __name__ == '__main__':
    raise SystemExit(main())
