#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวม "กิ่งใหม่" จากคลังคำชุดใหม่ เข้าไฟล์ต้นฉบับหมวด (docs/catN-*-redesign.md)

พี่กันสั่ง 26 ก.ค. 2569 หลังอ่านลิสต์กิ่งใหม่แล้ว: "เอากิ่งใหม่ทั้งหมด เอาๆๆ" และ "รวมเลย"

🔑 ทำไมต้องรวมที่ไฟล์ต้นฉบับหมวด ไม่ใช่ไปแก้ branches-clean.md ตรง ๆ
   เพราะ branches-clean.md เป็นไฟล์ที่ scripts/gen_branches.py "สร้างขึ้นมา"
   จากไฟล์ต้นฉบับหมวดทั้ง 10 ไฟล์ ถ้าไปแก้ปลายทาง พอใครรัน gen_branches.py อีกครั้ง
   กิ่งใหม่จะหายหมด ต้องเติมที่ต้นทางเท่านั้น

🚨 รวมเฉพาะ "กิ่ง" ไม่เอาคำไปด้วย
   branches-clean.md คือกิ่งล้วนตามกฎเดิมของโปรเจกต์
   ส่วนคำของคลังชุดใหม่ยังอยู่ใน docs/newwords-branches.json แยกต่างหากเหมือนเดิม

วิธีใช้: python3 scripts/merge_newbranches.py [--write]
        ไม่ใส่ --write = ดูผลอย่างเดียว ไม่แก้ไฟล์
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)
WRITE = '--write' in sys.argv

# ไฟล์ต้นฉบับของแต่ละหมวด (ชุดเดียวกับที่ scripts/gen_branches.py อ่าน)
CAT_FILE = {
    'c0': 'docs/cat1-redesign.md',  'c1': 'docs/cat2-redesign.md',
    'c2': 'docs/cat3-redesign.md',  'c3': 'docs/cat4-redesign.md',
    'c4': 'docs/cat5-redesign.md',  'c5': 'docs/cat6-redesign.md',
    'c6': 'docs/cat7-loanwords-redesign.md', 'c7': 'docs/cat8-redesign.md',
    'c9': 'docs/cat10-objects-redesign.md',  'c10': 'docs/cat11-status-redesign.md',
    'c11': 'docs/cat12-belief-redesign.md',  'c12': 'docs/cat13-language-redesign.md',
    'c13': 'docs/cat14-law-redesign.md',     'c14': 'docs/cat15-narration-redesign.md',
}

RE_LAK = re.compile(r'^###\s*(?:🆕\s*)?🌲\s*กิ่งหลัก\s*([\d๐-๙]+)\s*·\s*(.+)$')
RE_YOY = re.compile(r'^-\s*(?:(?:🆕|🔄)\s*)*🌿\s*\*\*(.+?)\*\*')
RE_KHA = re.compile(r'^\s+-\s*(?:(?:🆕|🔄)\s*)*🍃\s*\*\*(.+?)\*\*')
TH_NUM = '๐๑๒๓๔๕๖๗๘๙'


def name_of(head):
    """ตัดชื่ออังกฤษในวงเล็บกับป้ายท้ายออก เหลือชื่อไทยล้วน"""
    h = re.sub(r'\s*_\([^)]*\)_\s*$', '', head)
    h = re.sub(r'[\s🆕🔗⚡✳️🚚🔄🌟⭐🔴🟠🟡]+$', '', h).strip()
    m = re.match(r'^(.+?)\s*\(([^()]*)\)\s*$', h)
    return (m.group(1).strip() if m else h.strip())


def existing_paths(lines):
    """อ่านกิ่งที่มีอยู่แล้วในไฟล์ → คืน dict เส้นทางกิ่ง → เลขบรรทัดสุดท้ายของบล็อกนั้น"""
    out, order = {}, []
    lak = yoy = None
    in_tree = False
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
            lak = name_of(m.group(2)); yoy = None
            out.setdefault(lak, i); order.append((lak, i)); continue
        m = RE_KHA.match(l)
        if m and l.startswith('  ') and yoy:
            k = yoy + ' / ' + name_of(m.group(1))
            out.setdefault(k, i); order.append((k, i)); continue
        m = RE_YOY.match(s)
        if m and lak:
            yoy = lak + ' / ' + name_of(m.group(1))
            out.setdefault(yoy, i); order.append((yoy, i)); continue
    return out, order


def block_end(lines, start):
    """หาบรรทัดสุดท้ายของบล็อกกิ่งที่เริ่มที่ start (รวมบรรทัดคำและหมายเหตุใต้มัน)"""
    i = start + 1
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1; continue
        if RE_LAK.match(s) or RE_YOY.match(s) or RE_KHA.match(lines[i]) or re.match(r'^##\s', lines[i]):
            break
        i += 1
    while i > start + 1 and not lines[i - 1].strip():
        i -= 1
    return i


def main():
    D = json.load(open(p('docs/newwords-branches.json'), encoding='utf-8'))
    new = [b for b in D['branches'] if b['is_new']]
    bycat = collections.defaultdict(list)
    for b in new:
        bycat[b['category_id']].append(b)

    total_added = 0
    for cid, brs in sorted(bycat.items()):
        fn = CAT_FILE[cid]
        lines = open(p(fn), encoding='utf-8').read().split('\n')
        have, _ = existing_paths(lines)
        # เรียงจากตื้นไปลึก เพื่อให้กิ่งแม่ถูกใส่ก่อนกิ่งลูกเสมอ
        todo = [b for b in sorted(brs, key=lambda b: (b['path'].count(' / '), b['path']))
                if b['path'] not in have]
        if not todo:
            print(f'{fn}: ครบอยู่แล้ว')
            continue

        # เลขกิ่งหลักถัดไป
        maxno = 0
        for l in lines:
            m = RE_LAK.match(l.strip())
            if m:
                t = m.group(1)
                maxno = max(maxno, int(''.join(str(TH_NUM.index(c)) if c in TH_NUM else c for c in t)))
        thai_style = any(c in TH_NUM for l in lines for m in [RE_LAK.match(l.strip())] if m for c in m.group(1))

        added = 0
        for b in todo:
            depth = b['path'].count(' / ')
            if depth == 0:
                maxno += 1
                num = ''.join(TH_NUM[int(c)] for c in str(maxno)) if thai_style else str(maxno)
                lines += ['', f"### 🌲 กิ่งหลัก {num} · {b['path']} ({b['en']}) 🆕",
                          f"> _{b['definition']}_", '',
                          '🗨 _กิ่งใหม่จากคลังคำชุดใหม่ (คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ) · พี่กันเคาะรับ 26 ก.ค. 2569_']
            else:
                parent = b['path'].rsplit(' / ', 1)[0]
                nm = b['path'].split(' / ')[-1]
                if parent not in have:
                    print(f'   ⚠️ ข้าม (ไม่เจอกิ่งแม่): {b["path"]}')
                    continue
                indent = '  ' * (depth - 1)
                icon = '🌿' if depth == 1 else '🍃'
                at = block_end(lines, have[parent])
                lines.insert(at, f"{indent}- 🆕 {icon} **{nm} ({b['en']})** — _{b['definition']}_")
                # ตำแหน่งบรรทัดของกิ่งอื่นที่อยู่หลังจุดแทรก ต้องเลื่อนตาม
                have = {k: (v + 1 if v >= at else v) for k, v in have.items()}
            have[b['path']] = next(i for i, l in enumerate(lines)
                                   if l.strip().endswith(f"({b['en']})** — _{b['definition']}_")
                                   or l.strip().startswith("### 🌲 กิ่งหลัก")
                                   and b['path'] in l)
            added += 1
        # อ่านตำแหน่งใหม่ทั้งหมดอีกรอบ กันเพี้ยน
        have, _ = existing_paths(lines)
        if WRITE:
            open(p(fn), 'w', encoding='utf-8').write('\n'.join(lines))
        print(f'{fn}: เพิ่ม {added} กิ่ง' + ('' if WRITE else '  (ยังไม่เขียนไฟล์ ใส่ --write เพื่อเขียนจริง)'))
        total_added += added
    print(f'\nรวมเพิ่ม {total_added} กิ่ง')


if __name__ == '__main__':
    main()
