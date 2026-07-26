#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ติด "กิ่งเพิ่ม" ให้วลีเดิมของคลัง (อีกครึ่งของผลรอบสกัดคำ)

ใช้:  python3 scripts/apply_addpaths.py          ดูผลอย่างเดียว
      python3 scripts/apply_addpaths.py --write  เขียนจริง

รอบสกัดคำได้ผลมา 2 ก้อน
  ① `ex`  = คำที่ควรสกัดออกมาใหม่  → พี่กันคัดเอง แล้วลงด้วย apply_picked.py
  ② `add` = **กิ่งที่วลีเดิมควรติดเพิ่ม** → ไฟล์นี้จัดการก้อนนี้

🔑 การติดกิ่งเพิ่ม = เอา "วลีเดิม" ไปเป็นชิปในกิ่งใหม่ด้วย (multi-branch)
   **ไม่ใช่การย้าย** — ชิปที่กิ่งบ้านเดิมอยู่ครบเหมือนเดิมทุกตัว
   ตรงกับกฎเหล็ก: คำที่สื่อได้หลายกิ่ง ให้ติดหลายกิ่ง ไม่ใช่แตกหรือย้าย

🛡 ต่อท้ายอย่างเดียวเหมือน apply_picked.py — ไม่ลบ ไม่แก้บรรทัดเดิม
   ชิปที่เติมติดป้าย ⚡ (ติดหลายกิ่ง) ซึ่งอยู่ใน MARKS ของ gen_branches.py แล้ว
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from apply_picked import FILES, scan, P                      # ใช้ตัวแกะโครงตัวเดียวกัน

WRITE = '--write' in sys.argv
MARK_RE = re.compile(r'[⚡✳️🔗➕🆕🔄🚚🌟🚩\s]')


def bare(tok):
    """ตัดป้าย หมายเหตุ _(...)_ และความหมาย (X) ออก เหลือแต่ตัวคำ"""
    t = re.sub(r'_\([^)]*\)_', '', tok)
    t = re.sub(r'\s*\([^)]*\)\s*$', '', t)
    return MARK_RE.sub('', t)


def main():
    rows = [json.loads(l) for l in open(P('docs/oldwords/extract/merged.jsonl'), encoding='utf-8')
            if l.strip()]
    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    valid = {(b['category_id'], b['path']) for b in bd['branches']}
    # วลี → กิ่งที่มันติดอยู่แล้ว (กันเติมซ้ำที่เดิม)
    now = collections.defaultdict(set)
    for w in bd['words']:
        for p in (w.get('subpaths') or []):
            now[w['text']].add((w['category_id'], p))

    bycat = collections.defaultdict(list)
    skip_have, skip_floating = 0, []
    for r in rows:
        for a in r['add']:
            k = (a['c'], a['p'])
            if k not in valid:
                skip_floating.append((r['t'], a['c'], a['p']))
                continue
            if k in now[r['t']]:
                skip_have += 1                      # ติดอยู่แล้ว ไม่ต้องเติม
                continue
            bycat[a['c']].append((a['p'], r['t'], a.get('why')))

    total, missed, per = 0, [], collections.Counter()
    for cid, items in sorted(bycat.items()):
        path = FILES.get(cid)
        if not path:
            missed += [('ไม่รู้จักหมวด %s' % cid, p, t) for p, t, _ in items]
            continue
        lines, tree = scan(path)
        add = collections.defaultdict(list)
        for p, t, why in items:
            if p not in tree:
                missed.append(('ไม่เจอกิ่งในไฟล์', p, t))
                continue
            add[p].append('⚡' + t)

        for p, chips in add.items():
            node = tree[p]
            exist = set()
            for li in node['words']:
                for tok in lines[li].split(' · '):
                    exist.add(bare(tok))
            fresh, seen = [], set()
            for c in chips:
                b = bare(c)
                if b in exist or b in seen:
                    continue
                seen.add(b)
                fresh.append(c)
            if not fresh:
                continue
            if node['words']:
                li = node['words'][-1]
                lines[li] = lines[li].rstrip() + ' · ' + ' · '.join(fresh)
            else:
                j = node['head'] + 1
                while j < len(lines) and lines[j].strip().startswith('🗨'):
                    j += 1
                lines.insert(j, ' ' * node['indent'] + ' · '.join(fresh))
                for k, v in tree.items():
                    if v['head'] >= j:
                        v['head'] += 1
                    v['words'] = [x + 1 if x >= j else x for x in v['words']]
                tree[p]['words'] = [j]
            total += len(fresh)
            per[cid] += len(fresh)

        if WRITE and add:
            open(P(path), 'w', encoding='utf-8').write('\n'.join(lines))

    cats = {c['id']: c['name_th'] for c in bd['categories']}
    print('%s ติดกิ่งเพิ่มให้วลีเดิม %d ชิป' % ('[เขียนจริง]' if WRITE else '[ดูผลอย่างเดียว]', total))
    for c, n in sorted(per.items(), key=lambda x: -x[1]):
        print('   %-42s %d' % (cats.get(c, c), n))
    print('   ข้ามเพราะติดกิ่งนั้นอยู่แล้ว %d · กิ่งลอย %d' % (skip_have, len(skip_floating)))
    if missed:
        print('🔴 วางไม่ลง %d จุด' % len(missed))
        for m in missed[:15]:
            print('   🔴 %s · %s · %s' % m)
    return 1 if missed else 0


if __name__ == '__main__':
    raise SystemExit(main())
