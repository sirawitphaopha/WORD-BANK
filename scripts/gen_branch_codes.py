#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ออกรหัสประจำกิ่งให้ทุกกิ่งในคลัง — ทะเบียนถาวร รหัสห้ามเลื่อนตลอดกาล

รูปแบบรหัส (เจ้าของคลังออกแบบเอง 31 ก.ค. 2569):

    A01-00-000   กิ่งระดับ 1 (กิ่งหลัก)
    A01-01-000   กิ่งระดับ 2 (กิ่งย่อย)
    A01-01-001   กิ่งระดับ 3 (กิ่งแขนง)

    ตัวอักษรหน้า = หมวด (A = หมวด 1 · B = หมวด 2 ...) เผื่อขยายเป็น 2 ตัวอักษรได้ถึง 702 หมวด
    ช่องที่ไม่ได้ลงลึกถึง = เติมศูนย์ ("00" / "000") แปลว่ากิ่งนั้นคือตัวจบของสายในชั้นนั้น
    รหัสยาวเท่ากันทุกอัน → เรียงข้อความแล้วได้ลำดับต้นไม้ทันที ไม่ต้องแปลงอะไร

🔒 กฎเหล็กของไฟล์นี้ — รหัสต้องไม่เลื่อนเด็ดขาด
   บทเรียนที่โปรเจกต์นี้เจ็บมาแล้ว 2 รอบ (`wid` และ `picked_from`):
   **อะไรที่ผูกด้วยลำดับ จะพังทันทีที่ไฟล์ถูกสร้างใหม่**
   ที่นี่จึงยึด (หมวด, เส้นทางกิ่ง) เป็นกุญแจ ไม่ใช่ลำดับในไฟล์
   - กิ่งที่เคยมีรหัสแล้ว → คืนรหัสเดิมเป๊ะเสมอ ไม่ว่าลำดับในไฟล์จะเปลี่ยนไปแค่ไหน
   - กิ่งใหม่ → ได้เลขต่อท้ายกลุ่มของตัวเอง (ไม่แทรกกลาง ไม่ดันของเดิม)
   - กิ่งที่หายไปจากคลัง → เก็บไว้ในทะเบียนเป็น retired **ห้ามเอาเลขไปใช้ซ้ำ**
     เพราะอาจมีข้อมูลเก่าที่ยังอ้างเลขนั้นอยู่

⚠️ เปลี่ยนชื่อกิ่ง = เส้นทางเปลี่ยน = ระบบจะมองว่าเป็นกิ่งใหม่แล้วออกรหัสใหม่ให้
   ถ้าตั้งใจเปลี่ยนชื่อ (ไม่ใช่สร้างกิ่งใหม่จริง) ต้องใส่คู่ชื่อเก่า→ใหม่ในตาราง RENAME ด้านล่าง
   ไม่งั้นรหัสเดิมจะกลายเป็น retired แล้วคำที่ผูกรหัสไว้จะเคว้ง

ใช้:
    python3 scripts/gen_branch_codes.py            ดูผลอย่างเดียว ไม่เขียนไฟล์
    python3 scripts/gen_branch_codes.py --write    เขียนทะเบียนจริง
"""
import json, os, sys, collections, string

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
REG = P('docs/branch-codes.json')          # ทะเบียนถาวร
SRC = P('docs/branches-data.json')         # กิ่งปัจจุบัน (สร้างจาก gen_branches.py)

# ── ชื่อกิ่งที่เปลี่ยนไป: (หมวด, ชื่อเก่า) → ชื่อใหม่ ────────────────────────
# ใส่ที่นี่ทุกครั้งที่ "เปลี่ยนชื่อกิ่งเดิม" เพื่อให้รหัสตามไปด้วย ไม่ถูกมองเป็นกิ่งใหม่
# (กิ่งลูกที่ห้อยอยู่ใต้กิ่งที่เปลี่ยนชื่อ ระบบจะไล่เปลี่ยนให้เองตามท่อนหน้า)
RENAME = {
    # ('c0', 'ส่วนอาคารและสิ่งปลูกสร้าง'): 'ส่วนประกอบของอาคาร',

    # 3 ส.ค. 2569 · แยกตระกูลรอยยิ้มเป็น 3 ทาง (พี่กันสั่ง "แยกยิ้มบวกกับลบ")
    ('c2', 'รอยยิ้มและความยินดี'): 'รอยยิ้มจากอารมณ์ดี',
    ('c2', 'สีหน้าเยาะเย้ยและดูถูก'): 'รอยยิ้มเย้ยหยันและสีหน้าดูถูก',
    # 3 ส.ค. 2569 · ข้อ 5.2 ประสาทหลอนกับประสาทสัมผัส
    ('c4', 'อาการคันและสัมผัสบนผิว'): 'สัมผัสบนผิวและความรู้สึกที่ผุดขึ้นเอง',
}


def letter(no):
    """เลขหมวด (1-based) → ตัวอักษร: 1=A ... 26=Z · 27=AA ... (เผื่ออนาคตเกิน 26 หมวด)"""
    s = ''
    n = no
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = string.ascii_uppercase[r] + s
    return s


def load_registry():
    if not os.path.exists(REG):
        return {'codes': {}, 'retired': {}}
    d = json.load(open(REG, encoding='utf-8'))
    return {'codes': d.get('codes', {}), 'retired': d.get('retired', {})}


def key(cid, path):
    return '%s\t%s' % (cid, path)


def apply_rename(cid, path):
    """ถ้ากิ่งนี้ (หรือกิ่งแม่ของมัน) ถูกเปลี่ยนชื่อ คืนเส้นทางเดิมก่อนเปลี่ยนชื่อ"""
    segs = path.split(' / ')
    for i in range(len(segs)):
        head = ' / '.join(segs[:i + 1])
        for (rc, old), new in RENAME.items():
            if rc == cid and head == ' / '.join(segs[:i] + [new]):
                return ' / '.join(segs[:i] + [old] + segs[i + 1:])
    return path


def main():
    write = '--write' in sys.argv
    src = json.load(open(SRC, encoding='utf-8'))
    reg = load_registry()
    codes = dict(reg['codes'])
    retired = dict(reg['retired'])

    NO = {c['id']: c['no'] for c in src['categories']}
    CN = {c['id']: c['name_th'] for c in src['categories']}
    by = collections.defaultdict(list)
    for b in src['branches']:
        by[b['category_id']].append(b)

    # เส้นทางกิ่งทั้งหมดที่มีอยู่ตอนนี้ (ใช้เช็คว่ากิ่งไหนมีลูก)
    alive = {(b['category_id'], b['path']) for b in src['branches']}

    # ── ออกรหัส ────────────────────────────────────────────────────────
    # หาเลขสูงสุดที่เคยใช้ในแต่ละกลุ่ม (รวม retired) เพื่อให้กิ่งใหม่ต่อท้ายเสมอ
    used = collections.defaultdict(set)
    for k, c in list(codes.items()) + list(retired.items()):
        cid = k.split('\t')[0]
        a, b2, c3 = c.split('-')          # A01 · 01 · 000
        L = ''.join(ch for ch in a if ch.isalpha())
        n1 = int(''.join(ch for ch in a if ch.isdigit()))
        used[(cid, 'L1')].add(n1)
        if b2 != '00':
            used[(cid, 'L2', n1)].add(int(b2))
        if c3 != '000':
            used[(cid, 'L3', n1, int(b2))].add(int(c3))

    new_codes, stat = {}, collections.Counter()
    # กุญแจชื่อเก่าที่ถูก "ยกรหัสไปให้ชื่อใหม่" แล้ว — ห้ามปลดระวาง ไม่งั้นรหัสเดียวจะอยู่
    # ทั้งฝั่งใช้งานและฝั่งปลดระวางพร้อมกัน แล้วด่านตรวจจะฟ้องว่าชนกันเอง
    # 🔴 รูโหว่นี้ซ่อนอยู่ตั้งแต่วันแรก เพราะตาราง RENAME ยังไม่เคยมีใครใส่ของจริงลงไป
    #    (เจอ 3 ส.ค. 2569 ตอนเปลี่ยนชื่อกิ่งรอยยิ้มและกิ่งสัมผัสบนผิว)
    renamed_from = set()
    # ลำดับที่กิ่งปรากฏในไฟล์ — ใช้กำหนดว่ากิ่งไหนได้เลขก่อน "เฉพาะตอนออกรหัสครั้งแรก"
    # (หลังจากนั้นยึดทะเบียนอย่างเดียว ลำดับในไฟล์เปลี่ยนยังไงรหัสก็ไม่ขยับ)
    order = {(b['category_id'], b['path']): i for i, b in enumerate(src['branches'])}
    for cid in sorted(by, key=lambda x: NO.get(x, 99)):
        L = letter(NO[cid])
        # เรียงความลึกก่อน (กิ่งแม่ต้องได้รหัสก่อนลูกเสมอ) แล้วค่อยเรียงตามลำดับในไฟล์
        for b in sorted(by[cid], key=lambda x: (x['path'].count(' / '),
                                                order.get((x['category_id'], x['path']), 0))):
            path = b['path']
            k = key(cid, path)
            oldk = key(cid, apply_rename(cid, path))
            if k in codes:
                new_codes[k] = codes[k]
                stat['เดิม'] += 1
                continue
            if oldk in codes:                      # กิ่งถูกเปลี่ยนชื่อ → ยกรหัสเดิมมา
                new_codes[k] = codes[oldk]
                renamed_from.add(oldk)
                stat['เปลี่ยนชื่อ'] += 1
                continue
            segs = path.split(' / ')
            if len(segs) == 1:
                n1 = max(used[(cid, 'L1')] or {0}) + 1
                used[(cid, 'L1')].add(n1)
                code = '%s%02d-00-000' % (L, n1)
            else:
                par = ' / '.join(segs[:-1])
                pc = new_codes.get(key(cid, par)) or codes.get(key(cid, par))
                if not pc:
                    print('🔴 กิ่งลอย ไม่มีกิ่งแม่: %s | %s' % (cid, path))
                    return 1
                n1 = int(''.join(ch for ch in pc.split('-')[0] if ch.isdigit()))
                if len(segs) == 2:
                    n2 = max(used[(cid, 'L2', n1)] or {0}) + 1
                    used[(cid, 'L2', n1)].add(n2)
                    code = '%s%02d-%02d-000' % (L, n1, n2)
                else:
                    n2 = int(pc.split('-')[1])
                    n3 = max(used[(cid, 'L3', n1, n2)] or {0}) + 1
                    used[(cid, 'L3', n1, n2)].add(n3)
                    code = '%s%02d-%02d-%03d' % (L, n1, n2, n3)
            new_codes[k] = code
            stat['ใหม่'] += 1

    # กิ่งที่หายไปจากคลัง → ย้ายเข้า retired (ห้ามเอาเลขไปใช้ซ้ำ)
    for k, c in codes.items():
        if k not in new_codes and k not in renamed_from:
            retired[k] = c
            stat['ปลดระวาง'] += 1

    # ── ด่านตรวจ ───────────────────────────────────────────────────────
    dup = [c for c, n in collections.Counter(new_codes.values()).items() if n > 1]
    if dup:
        print('🔴 รหัสซ้ำ %d ตัว: %s' % (len(dup), dup[:5]))
        return 1
    clash = set(new_codes.values()) & set(retired.values())
    if clash:
        print('🔴 รหัสชนกับที่ปลดระวางไปแล้ว: %s' % list(clash)[:5])
        return 1
    for k, c in new_codes.items():
        cid = k.split('\t')[0]
        if not c.startswith(letter(NO[cid])):
            print('🔴 รหัสไม่ตรงหมวด: %s | %s' % (k, c))
            return 1
    moved = [k for k in new_codes if k in codes and codes[k] != new_codes[k]]
    if moved:
        print('🔴 รหัสเดิมถูกเปลี่ยน %d ตัว (ต้องไม่มีเลย): %s' % (len(moved), moved[:3]))
        return 1

    # ── รายงาน ─────────────────────────────────────────────────────────
    print('รหัสทั้งหมด %d กิ่ง · ใหม่ %d · เดิม %d · เปลี่ยนชื่อ %d · ปลดระวาง %d'
          % (len(new_codes), stat['ใหม่'], stat['เดิม'], stat['เปลี่ยนชื่อ'], stat['ปลดระวาง']))
    leaf = sum(1 for k in new_codes
               if not any(p.startswith(k.split('\t')[1] + ' / ') and c == k.split('\t')[0]
                          for c, p in alive))
    print('ลงคำได้ %d กิ่ง · เป็นหัวข้อ %d กิ่ง' % (leaf, len(new_codes) - leaf))

    if not write:
        print('\n(ดูผลอย่างเดียว — ใส่ --write เพื่อเขียนทะเบียนจริง)')
        return 0

    out = {
        'note': 'ทะเบียนรหัสประจำกิ่ง — รหัสห้ามเปลี่ยนตลอดกาล · กิ่งใหม่ต่อท้ายเท่านั้น '
                'ห้ามแทรกกลาง · กิ่งที่เลิกใช้อยู่ใน retired ห้ามเอาเลขไปใช้ซ้ำ',
        'format': 'A01-00-000 = กิ่งระดับ 1 · A01-01-000 = ระดับ 2 · A01-01-001 = ระดับ 3 '
                  '(ช่องที่ไม่ได้ลงลึกถึงเติมศูนย์)',
        'letters': {c['id']: letter(c['no']) for c in sorted(src['categories'], key=lambda x: x['no'])},
        'codes': dict(sorted(new_codes.items(), key=lambda kv: kv[1])),
        'retired': retired,
    }
    json.dump(out, open(REG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('เขียน docs/branch-codes.json แล้ว')
    return 0


if __name__ == '__main__':
    sys.exit(main())
