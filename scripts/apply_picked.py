#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เขียนคำที่พี่กันคัดกลับเข้า docs/catN-*-redesign.md

ใช้:  python3 scripts/apply_picked.py          ดูผลอย่างเดียว (ไม่แตะไฟล์)
      python3 scripts/apply_picked.py --write  เขียนจริง

🛡 กฎเหล็กของสคริปต์นี้
   1. **ต่อท้ายอย่างเดียว** — ห้ามลบ ห้ามแก้ ห้ามเรียงบรรทัดเดิมใหม่
      แตะบรรทัดเดิมได้ทางเดียวคือ "เติมคำต่อท้ายบรรทัดคำ" ด้วย ' · '
   2. **คำต้องเป็นชิปในบรรทัดคำเสมอ ห้ามเขียนลงบรรทัด 🗨**
      (บทเรียน 26 ก.ค. — เคยเขียนคำไว้ในบรรทัดหมายเหตุ แล้วตัวสร้างไฟล์รวมข้ามทั้งบรรทัด คำหายเงียบ 11 คำ)
   3. **ป้ายต้องเป็นตัวที่ gen_branches.py รู้จัก** (MARKS) ไม่งั้นป้ายจะติดเข้าไปในตัวคำ
      ✳️ = คำแตกจากวลี (วลีเดิมอยู่ครบ) · ⚡ = ติดหลายกิ่ง
   4. ความหมายเขียนแบบ "คำ (ความหมาย)" เว้นวรรค ตามกฎวงเล็บของโปรเจกต์
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
WRITE = '--write' in sys.argv

FILES = {
    'c0': 'docs/cat1-redesign.md', 'c1': 'docs/cat2-redesign.md',
    'c2': 'docs/cat3-redesign.md', 'c3': 'docs/cat4-redesign.md',
    'c4': 'docs/cat5-redesign.md', 'c5': 'docs/cat6-redesign.md',
    'c6': 'docs/cat7-loanwords-redesign.md', 'c7': 'docs/cat8-redesign.md',
    'c9': 'docs/cat10-objects-redesign.md', 'c10': 'docs/cat11-status-redesign.md',
    'c11': 'docs/cat12-belief-redesign.md', 'c12': 'docs/cat13-language-redesign.md',
    'c13': 'docs/cat14-law-redesign.md', 'c14': 'docs/cat15-narration-redesign.md',
}

RE_LAK = re.compile(r'^###\s*(?:[🆕⚡🔄🚩🌟✳️]\s*)*🌲\s*กิ่งหลัก\s*[๐-๙\d]+\s*·\s*(.+?)\s*$')
RE_YOY = re.compile(r'^-\s*(?:[🆕⚡🔄🚩🌟✳️➕🔗]\s*)*🌿\s*\*\*(.+?)\*\*\s*(?:[🆕⚡🔄🚩🌟✳️➕🔗]\s*)*—\s*_(.*?)_(?:\s*\[[^\]]*\])*\s*$')
RE_KHAENG = re.compile(r'^-\s*(?:[🆕⚡🔄🚩🌟✳️➕🔗]\s*)*🍃\s*\*\*(.+?)\*\*\s*(?:[🆕⚡🔄🚩🌟✳️➕🔗]\s*)*—\s*_(.*?)_(?:\s*\[[^\]]*\])*\s*$')


def split_name_en(s):
    m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', s.strip())
    return m.group(1).strip() if m else s.strip()


def strip_trail_marks(s):
    return re.sub(r'[\s🆕🌟🔄🚩]+$', '', s).strip()


def scan(path):
    """แกะโครงกิ่งจากไฟล์ md → {เส้นทางกิ่ง: {'head':บรรทัดหัวกิ่ง,'words':[บรรทัดคำ],'indent':n}}"""
    lines = open(P(path), encoding='utf-8').read().split('\n')
    tree, order = {}, []
    in_tree = False
    lak = yoy = khaeng = None
    cur = None
    for i, l in enumerate(lines):
        s = l.strip()
        if s.startswith('## 🌳'):
            in_tree = True
            continue
        if RE_LAK.match(s):
            in_tree = True
        if in_tree and re.match(r'^##\s', l) and not l.startswith('###'):
            in_tree = False
        if not in_tree or not s:
            continue

        m = RE_LAK.match(s)
        if m:
            lak = split_name_en(strip_trail_marks(re.sub(r'\s*_\([^)]*\)_\s*$', '', m.group(1))))
            yoy = khaeng = None
            cur = tree.setdefault(lak, {'head': i, 'words': [], 'indent': 0})
            order.append(lak)
            continue
        m = RE_KHAENG.match(s)
        if m and l.startswith('  '):
            base = yoy or lak
            khaeng = base + ' / ' + split_name_en(m.group(1))
            cur = tree.setdefault(khaeng, {'head': i, 'words': [], 'indent': len(l) - len(l.lstrip()) + 2})
            order.append(khaeng)
            continue
        m = RE_YOY.match(s)
        if m:
            yoy = lak + ' / ' + split_name_en(m.group(1))
            khaeng = None
            cur = tree.setdefault(yoy, {'head': i, 'words': [], 'indent': len(l) - len(l.lstrip()) + 2})
            order.append(yoy)
            continue
        if s.startswith('🗨') or s[0] in '->|#':
            continue
        if cur is not None:
            cur['words'].append(i)                      # บรรทัดคำของกิ่งที่กำลังเปิดอยู่
    return lines, tree


def main():
    data = json.load(open(P('docs/oldwords/picked/final.json'), encoding='utf-8'))
    bycat = collections.defaultdict(list)
    for r in data['words']:
        if r['in_old']:
            continue                                    # คำเดิม = เส้นเชื่อมย้อนหลัง ไม่เขียนซ้ำเข้าต้นไม้
        for p in r['paths']:
            bycat[p['c']].append((p['p'], r))

    total, missed, per = 0, [], collections.Counter()
    for cid, items in sorted(bycat.items()):
        path = FILES.get(cid)
        if not path:
            missed += [('ไม่รู้จักหมวด %s' % cid, p, r['w']) for p, r in items]
            continue
        lines, tree = scan(path)
        add = collections.defaultdict(list)             # เส้นทางกิ่ง → [ชิปคำ]
        for p, r in items:
            if p not in tree:
                missed.append(('ไม่เจอกิ่งในไฟล์', p, r['w']))
                continue
            mark = '✳️' if not r['by_owner'] else '➕'   # ✳️ แตกจากวลี · ➕ พี่กันเพิ่มเอง
            if len(r['paths']) > 1:
                mark += '⚡'
            chip = mark + r['w']
            if r.get('meaning'):
                # 🔴 ความหมายห้ามมีวงเล็บซ้อน — ตัวแกะของ gen_branches.py ใช้ \(([^()]*)\)$
                #    ถ้าซ้อนจะ match ไม่ติด แล้ววงเล็บทั้งก้อนติดเข้าไปในตัวคำ
                #    (เคยเกิดจริง: "พรรค์นั้น (ประเภทแบบนั้น (ภาษาพูด))" กลายเป็นตัวคำทั้งดุ้น)
                mn = re.sub(r'\s*\(\s*', ' ', r['meaning'])
                mn = re.sub(r'\s*\)\s*', ' ', mn).strip()
                chip += ' (%s)' % mn
            add[p].append(chip)

        for p, chips in add.items():
            node = tree[p]
            exist = set()
            for li in node['words']:
                for tok in lines[li].split(' · '):
                    exist.add(re.sub(r'[⚡✳️🔗➕🆕🔄🚚🌟🚩\s]', '', re.sub(r'\s*\([^)]*\)\s*$', '', tok)))
            fresh = [c for c in chips
                     if re.sub(r'[⚡✳️🔗➕🆕🔄🚚🌟🚩\s]', '', re.sub(r'\s*\([^)]*\)\s*$', '', c)) not in exist]
            if not fresh:
                continue
            if node['words']:
                li = node['words'][-1]
                lines[li] = lines[li].rstrip() + ' · ' + ' · '.join(fresh)
            else:
                # กิ่งยังไม่มีบรรทัดคำ → แทรกบรรทัดใหม่ "หลังหัวกิ่งและหลังบรรทัด 🗨 ทั้งหมด"
                j = node['head'] + 1
                while j < len(lines) and lines[j].strip().startswith('🗨'):
                    j += 1
                lines.insert(j, ' ' * node['indent'] + ' · '.join(fresh))
                for k, v in tree.items():               # เลื่อนเลขบรรทัดที่อยู่หลังจุดแทรก
                    if v['head'] >= j:
                        v['head'] += 1
                    v['words'] = [x + 1 if x >= j else x for x in v['words']]
                tree[p]['words'] = [j]
            total += len(fresh)
            per[cid] += len(fresh)

        if WRITE and add:
            open(P(path), 'w', encoding='utf-8').write('\n'.join(lines))

    print('%s เขียนชิปคำ %d ชิ้น' % ('[เขียนจริง]' if WRITE else '[ดูผลอย่างเดียว]', total))
    for c, n in sorted(per.items()):
        print('   %s → %s  %d ชิป' % (c, os.path.basename(FILES[c]), n))
    if missed:
        print('🔴 วางไม่ลง %d จุด' % len(missed))
        for m in missed[:20]:
            print('   🔴 %s · %s · %s' % m)
    return 1 if missed else 0


if __name__ == '__main__':
    raise SystemExit(main())
