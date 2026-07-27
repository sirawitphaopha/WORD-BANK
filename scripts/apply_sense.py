#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เขียนผลรอบนิยาม (M2) กลับเข้า docs/catN-*-redesign.md

ใช้:  python3 scripts/apply_sense.py          ดูผลอย่างเดียว
      python3 scripts/apply_sense.py --write  เขียนจริง

ทำ 3 อย่าง
  ① เพิ่มชิปคำเข้ากิ่งใหม่ (ต่อท้ายบรรทัดคำ — เหมือน apply_picked.py)
  ② **ถอนชิปคำออกจากกิ่งที่ไม่ควรอยู่** ← ของใหม่ ตัวเขียนเดิมทำไม่ได้
  ③ เติมความหมายให้คำที่ตีความได้หลายทาง

🛡 กฎเหล็กของการถอนชิป
   - **แตะเฉพาะชิปของคำที่ระบุเท่านั้น ชิปอื่นในบรรทัดเดียวกันห้ามขยับแม้แต่ตัวเดียว**
   - ถอนแล้วบรรทัดต้องยังอ่านได้ (ไม่มี ' · ' ค้างหัวหรือท้าย ไม่มี ' ·  · ' ซ้อน)
   - ถ้าถอนจนบรรทัดว่าง = ลบทั้งบรรทัด (กิ่งนั้นกลับไปเป็นกิ่งว่าง)
   - ถอนได้เฉพาะคำที่อยู่ในรายการ drop เท่านั้น ห้ามเดาเอง
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from apply_picked import FILES, scan, P          # ใช้ตัวแกะโครงตัวเดียวกัน

WRITE = '--write' in sys.argv
D = lambda *a: P('docs/oldwords/sense', *a)
MARKS = '⚡✳️🔗➕🆕🔄🚚🌟🚩'


def bare(tok):
    """ตัดป้าย หมายเหตุ _(...)_ และความหมาย (X) ออก เหลือแต่ตัวคำ"""
    t = re.sub(r'_\([^)]*\)_', '', tok)
    t = re.sub(r'\s*\([^)]*\)\s*$', '', t)
    return re.sub(r'[%s\s]' % MARKS, '', t)


def split_chips(line):
    """แยกบรรทัดคำเป็นชิป โดยกัน ' · ' ที่อยู่ในหมายเหตุ _(...)_ ไม่ให้ถูกตัด"""
    prot = re.sub(r'_\([^)]*\)_', lambda m: m.group(0).replace(' · ', ' \x00 '), line)
    return [c.replace(' \x00 ', ' · ') for c in prot.split(' · ')]


def main():
    diff = json.load(open(D('diff.json'), encoding='utf-8'))
    sense = {}
    for f in ('sense1.jsonl', 'sense2.jsonl'):
        if os.path.exists(D(f)):
            for line in open(D(f), encoding='utf-8'):
                if line.strip():
                    r = json.loads(line)
                    sense[r['w']] = r

    add = collections.defaultdict(list)      # (cid, path) → [คำ]
    for w, c, p in diff['add']:
        add[(c, p)].append(w)
    drop = collections.defaultdict(set)      # (cid, path) → {คำ}
    for w, c, p in diff['drop']:
        drop[(c, p)].add(w)
    newmn = set(diff['new_meaning'])

    stat = collections.Counter()
    missed = []
    for cid in sorted(FILES):
        path = FILES[cid]
        if not os.path.exists(P(path)):
            continue
        want_add = {k: v for k, v in add.items() if k[0] == cid}
        want_drop = {k: v for k, v in drop.items() if k[0] == cid}
        if not want_add and not want_drop and not newmn:
            continue

        lines, tree = scan(path)
        touched = False

        # ---------- ② ถอนชิป (ทำก่อน เพราะเลขบรรทัดยังไม่ขยับ) ----------
        for (c, p), words in want_drop.items():
            if p not in tree:
                missed.append(('ถอนไม่ได้ ไม่เจอกิ่ง', p, ' · '.join(words)))
                continue
            for li in list(tree[p]['words']):
                chips = split_chips(lines[li])
                kept = [ch for ch in chips if bare(ch) not in words]
                if len(kept) == len(chips):
                    continue
                stat['drop'] += len(chips) - len(kept)
                touched = True
                if kept:
                    indent = lines[li][:len(lines[li]) - len(lines[li].lstrip())]
                    lines[li] = indent + ' · '.join(x.strip() for x in kept)
                else:
                    lines[li] = '\x01ลบบรรทัดนี้'        # ทำเครื่องหมายไว้ ลบทีเดียวตอนท้าย

        # ---------- ③ เติมความหมายให้ชิปที่มีอยู่แล้ว ----------
        for p, node in tree.items():
            for li in node['words']:
                if lines[li].startswith('\x01'):
                    continue
                chips = split_chips(lines[li])
                out, ch4 = [], False
                for ch in chips:
                    w = bare(ch)
                    if w in newmn and '(' not in ch:
                        mn = (sense.get(w, {}).get('meaning') or '').strip()
                        mn = re.sub(r'\s*[()]\s*', ' ', mn).strip()   # กันวงเล็บซ้อน
                        if mn:
                            ch = ch.rstrip() + ' (%s)' % mn
                            ch4 = True
                            stat['meaning'] += 1
                    out.append(ch)
                if ch4:
                    indent = lines[li][:len(lines[li]) - len(lines[li].lstrip())]
                    lines[li] = indent + ' · '.join(x.strip() for x in out)
                    touched = True

        # ---------- ① เพิ่มชิปเข้ากิ่งใหม่ ----------
        for (c, p), words in want_add.items():
            if p not in tree:
                missed.append(('เพิ่มไม่ได้ ไม่เจอกิ่ง', p, ' · '.join(words)))
                continue
            node = tree[p]
            exist = set()
            for li in node['words']:
                if not lines[li].startswith('\x01'):
                    exist |= {bare(ch) for ch in split_chips(lines[li])}
            fresh = []
            for w in words:
                if w in exist:
                    continue
                chip = '⚡' + w
                mn = (sense.get(w, {}).get('meaning') or '').strip()
                if w in newmn and mn:
                    chip += ' (%s)' % re.sub(r'\s*[()]\s*', ' ', mn).strip()
                fresh.append(chip)
            if not fresh:
                continue
            live = [li for li in node['words'] if not lines[li].startswith('\x01')]
            if live:
                lines[live[-1]] = lines[live[-1]].rstrip() + ' · ' + ' · '.join(fresh)
            else:
                j = node['head'] + 1
                while j < len(lines) and lines[j].strip().startswith('🗨'):
                    j += 1
                lines.insert(j, ' ' * node['indent'] + ' · '.join(fresh))
                for v in tree.values():
                    if v['head'] >= j:
                        v['head'] += 1
                    v['words'] = [x + 1 if x >= j else x for x in v['words']]
                node['words'] = [j]
            stat['add'] += len(fresh)
            touched = True

        lines = [l for l in lines if not l.startswith('\x01')]
        if WRITE and touched:
            open(P(path), 'w', encoding='utf-8').write('\n'.join(lines))

    print('%s เพิ่มชิป %d · **ถอนชิป %d** · เติมความหมาย %d'
          % ('[เขียนจริง]' if WRITE else '[ดูผลอย่างเดียว]',
             stat['add'], stat['drop'], stat['meaning']))
    if missed:
        print('🔴 ทำไม่ได้ %d จุด' % len(missed))
        for m in missed[:15]:
            print('   🔴 %s · %s · %s' % m)
    return 1 if missed else 0


if __name__ == '__main__':
    raise SystemExit(main())
