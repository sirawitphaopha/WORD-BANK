#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ซ่อมเส้นทางกิ่งที่ผู้ช่วยเขียนไม่ครบชั้น → เติมชั้นบนให้ครบ

ใช้:  python3 scripts/fix_sense_paths.py          ดูผลอย่างเดียว
      python3 scripts/fix_sense_paths.py --write  เขียนจริง

อาการ: ผู้ช่วยเขียน "ท่านอนและการหยุดนิ่ง / ความแข็งทื่อ..." แต่ของจริงคือ
       "ท่าทางและภาพรวมร่างกาย / ท่านอนและการหยุดนิ่ง / ความแข็งทื่อ..."
       คือลืมใส่ชื่อกิ่งหลักข้างหน้า

🛡 ซ่อมเฉพาะกรณีที่ **หาปลายทางได้อันเดียวเท่านั้น** ถ้ากำกวมปล่อยไว้ให้ด่านตรวจฟ้อง
   ห้ามเดา ห้ามแตะช่องอื่นนอกจาก paths
"""
import json, os, sys, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/m2-sense/round2', *a)
WRITE = '--write' in sys.argv

BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
VALID = {(b['category_id'], b['path']) for b in BD['branches']}
BYCAT = collections.defaultdict(list)
for c, p in VALID:
    BYCAT[c].append(p)


def repair(c, p):
    """คืนเส้นทางเต็มถ้าซ่อมได้อันเดียว · คืน None ถ้าซ่อมไม่ได้"""
    if (c, p) in VALID:
        return p
    cand = [x for x in BYCAT.get(c, []) if x.endswith(' / ' + p)]
    if len(cand) == 1:
        return cand[0]
    # ลองเทียบเฉพาะชั้นสุดท้าย เผื่อผู้ช่วยเขียนชั้นกลางผิด
    last = p.split(' / ')[-1]
    cand = [x for x in BYCAT.get(c, []) if x.split(' / ')[-1] == last]
    return cand[0] if len(cand) == 1 else None


def main():
    fixed = collections.Counter()
    unfixed = []
    for f in sorted(glob.glob(D('sense*.jsonl')) + glob.glob(D('part*', 'sense*.jsonl'))):
        out, touched = [], False
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            for q in (r.get('paths') or []):
                c, p = q.get('c'), q.get('p')
                if not c or not p or (c, p) in VALID:
                    continue
                new = repair(c, p)
                if new:
                    q['p'] = new
                    fixed[(c, p, new)] += 1
                    touched = True
                else:
                    unfixed.append((os.path.basename(f), r.get('id'), c, p))
            out.append(json.dumps(r, ensure_ascii=False))
        if WRITE and touched:
            open(f, 'w', encoding='utf-8').write('\n'.join(out) + '\n')

    print('%s ซ่อมได้ %d เส้น (%d รูปแบบ) · ซ่อมไม่ได้ %d เส้น'
          % ('[เขียนจริง]' if WRITE else '[ดูผลอย่างเดียว]',
             sum(fixed.values()), len(fixed), len(unfixed)))
    for (c, old, new), n in fixed.most_common(12):
        print('   ✅ %-52s → %s  (%d)' % (old[:52], new.split(' / ')[0] + ' / …', n))
    for x in unfixed[:12]:
        print('   🔴 ซ่อมไม่ได้ %s ข้อ %s · %s|%s' % x)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
