#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ด่านตรวจผลงานเอเจนต์ก่อนเอาไปสร้างเครื่องมือ

ใช้:  python3 scripts/check_oldwords.py 8

🔴 เหตุผลที่ต้องมีไฟล์นี้ (บทเรียนจริงจากงานคลังชุดใหม่):
   เอเจนต์เคยเสนอคำ `แสงจันทร์สอดส่อง` ทั้งที่วลีจริงคือ `แสงจันทร์จึงสอดส่อง`
   = ประกอบคำขึ้นเองจากคนละท่อน · จับได้เพราะมีด่านตรวจ ไม่ใช่เพราะอ่านเจอ
   ผลเอเจนต์ต้องผ่านเครื่องเสมอ ห้ามลอกมาตรง ๆ

ด่านแดง = ต้องเป็น 0 ถึงจะไปต่อได้   ด่านเหลือง = เตือนให้คนดู ไม่บล็อก
"""
import json, sys, os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

# สระ/วรรณยุกต์ที่ลอยเดี่ยวไม่ได้ — คำที่ขึ้นต้นด้วยตัวพวกนี้ = ตัดกลางตัวอักษร
COMBINING = set('ัิีึืุู่้๊๋์็ําะๆฯ')
LEAD_VOWEL = set('เแโใไ')          # ลงท้ายด้วยตัวพวกนี้ = ค้างสระหน้า
MAX_PATHS = 4                       # กฎ 5ข: ปกติ 1-3 ห้ามเกิน 4
MAX_DEPTH = 2                       # ' / ' ได้ไม่เกิน 2 ตัว = ลึก 3 ชั้น
MAX_MEANING = 60                    # กฎ 5ง
MAX_REASON = 100                    # กฎ 5ค
FIG = ('ราวกับ', 'ดุจ', 'ประหนึ่ง', 'เหมือน', 'คล้าย', 'เยี่ยง', 'ราวกัน', 'ปาน')


def load_base():
    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    nw = json.load(open(P('docs/newwords-branches.json'), encoding='utf-8'))
    cats = {c['id']: c for c in bd['categories']}
    paths = {(b['category_id'], b['path']) for b in bd['branches']}
    old_texts = {w['text'] for w in bd['words']}
    new_texts = {w['text'] for w in nw['words']}
    return cats, paths, old_texts, new_texts


def main():
    if len(sys.argv) < 2:
        raise SystemExit('ใช้: python3 scripts/check_oldwords.py <เลขหมวด> [ชื่อโฟลเดอร์ย่อย]')
    no = int(sys.argv[1])
    folder = sys.argv[2] if len(sys.argv) > 2 else 'cat%d' % no
    d = P('docs/oldwords', folder)
    if not os.path.isdir(d):
        raise SystemExit('ไม่มีโฟลเดอร์ %s' % d)

    cats, base_paths, old_texts, new_texts = load_base()
    inp = [json.loads(l) for l in open(os.path.join(d, 'in.jsonl'), encoding='utf-8') if l.strip()]
    by_i = {r['i']: r for r in inp}
    cat_name = cats[inp[0].get('cid', 'c%d' % (no - 1))]['name_th'] if inp else ''
    cid_self = 'c%d' % (no - 1)
    cat_name = cats[cid_self]['name_th']

    # กิ่งใหม่ที่ประกาศไว้ = ไม่นับเป็นกิ่งลอย
    declared = set()
    for f in sorted(glob.glob(os.path.join(d, 'newbr*.json'))):
        for b in json.load(open(f, encoding='utf-8')):
            declared.add((b['c'], b['p']))

    red, yellow = [], []
    outs = sorted(glob.glob(os.path.join(d, 'out*.jsonl')))
    if not outs:
        raise SystemExit('ยังไม่มีไฟล์ out*.jsonl ในโฟลเดอร์ %s' % d)

    for f in outs:
        who = os.path.basename(f)
        rows = []
        for ln, line in enumerate(open(f, encoding='utf-8'), 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception as e:
                red.append((who, '-', 'R0 อ่าน JSON ไม่ออก', 'บรรทัด %d: %s' % (ln, e)))

        # R1 · คำครบไหม
        got = [r.get('i') for r in rows]
        if sorted(x for x in got if x is not None) != sorted(by_i):
            miss = sorted(set(by_i) - set(got))
            extra = sorted(set(got) - set(by_i))
            dup = sorted({x for x in got if got.count(x) > 1})
            red.append((who, '-', 'R1 คำไม่ครบ',
                        'ขาด %s · เกิน %s · ซ้ำ %s' % (miss[:8], extra[:8], dup[:8])))

        for r in rows:
            i = r.get('i')
            src = by_i.get(i)
            if src is None:
                continue
            t = r.get('text', '')

            # R2 · ตัวคำเดิมต้องตรงต้นฉบับทุกตัวอักษร (กฎเหล็กข้อแรก)
            if t != src['text']:
                red.append((who, i, 'R2 คำเดิมถูกแก้', '%r → %r' % (src['text'], t)))

            # R11 · กิ่งเดิมห้ามหาย — ถอนได้เฉพาะผ่านช่อง doubt
            doubt = r.get('doubt') or []
            gone = [p for p in src['now'] if p in doubt]
            if not r.get('keep') and not doubt:
                yellow.append((who, i, 'Y0 ไม่ยืนยันกิ่งเดิมและไม่ระบุที่สงสัย', src['text']))
            for p in doubt:
                if p not in src['now']:
                    red.append((who, i, 'R11 สงสัยกิ่งที่ไม่ได้มีอยู่', p))

            # ตรวจกิ่งที่เสนอเพิ่ม
            adds = r.get('add') or []
            if len(src['now']) + len(adds) > MAX_PATHS:
                yellow.append((who, i, 'Y7 กิ่งรวมเกิน %d' % MAX_PATHS,
                               '%d เดิม + %d เพิ่ม' % (len(src['now']), len(adds))))
            for a in adds:
                check_path(who, i, a.get('c'), a.get('p'), base_paths, declared,
                           cats, red, 'กิ่งที่เสนอเพิ่ม')

            # ตรวจคำที่สกัด
            for e in (r.get('extract') or []):
                w = (e.get('w') or '').strip()
                if not w:
                    red.append((who, i, 'R3 คำสกัดว่าง', ''))
                    continue
                # R3 · ต้องเป็นท่อนต่อเนื่องของวลีเดิมจริง ← ด่านที่จับการประกอบคำเอง
                # 🔴 ยกเว้นคำที่พี่กันพิมพ์เพิ่มเอง (by_owner / ✍️) — พี่กันคิดคำใหม่จากวลีได้
                #    เคยเกือบพลาด 26 ก.ค.: ด่านนี้ฟ้อง `ขี้ริ้วขี้เหล่` กับ `โหนกนูน` ว่าประกอบคำเอง
                #    ทั้งที่พี่กันเขียนโน้ตกำกับไว้เองแล้วว่า "เพิ่มเอง" ใน docs/SESSION-2026-07-25f.md
                #    เคสเดียวกับ `หยิ่งยโส` ที่แคลร์เคยตีความเองจนโดนท้วง 3 รอบ
                if e.get('by_owner') or e.get('src') == 'own':
                    continue
                if w not in src['text']:
                    red.append((who, i, 'R3 คำสกัดไม่ใช่ท่อนต่อเนื่อง',
                                '%r ไม่อยู่ใน %r' % (w, src['text'])))
                    continue
                # R4 · ห้ามตัดกลางตัวอักษรไทย
                if w[0] in COMBINING:
                    red.append((who, i, 'R4 ขึ้นต้นด้วยสระ/วรรณยุกต์ลอย', w))
                if w[-1] in LEAD_VOWEL:
                    red.append((who, i, 'R4 ลงท้ายค้างสระหน้า', w))
                # R5 · ต้องไม่เท่ากับคำเดิมทั้งดุ้น
                if w == src['text']:
                    red.append((who, i, 'R5 คำสกัดเท่ากับคำเดิม', w))
                # R6 · วงเล็บเหลี่ยมต้องจับคู่ครบ
                if w.count('[') != w.count(']'):
                    red.append((who, i, 'R6 วงเล็บเหลี่ยมขาด', w))
                # Y1 · คำสกัดที่มีอยู่แล้ว ควรติดกิ่งเพิ่มให้ของเดิม ไม่สร้างคำใหม่
                if w in old_texts:
                    yellow.append((who, i, 'Y1 คำสกัดมีในคลังเดิมแล้ว', w))
                elif w in new_texts:
                    yellow.append((who, i, 'Y1 คำสกัดมีในคลังชุดใหม่แล้ว', w))
                ps = e.get('paths') or []
                if not ps:
                    red.append((who, i, 'R7 คำสกัดไม่มีกิ่ง', w))
                if len(ps) > MAX_PATHS:
                    yellow.append((who, i, 'Y7 คำสกัดมีกิ่งเกิน %d' % MAX_PATHS, w))
                for p in ps:
                    check_path(who, i, p.get('c'), p.get('p'), base_paths, declared,
                               cats, red, 'กิ่งของคำสกัด %r' % w)

            # ด่านเหลืองเรื่องความหมาย/เหตุผล/คำเปรียบ/หมวด 15
            mn = r.get('meaning')
            if mn and len(mn) > MAX_MEANING:
                yellow.append((who, i, 'Y3 ความหมายเกิน %d ตัวอักษร' % MAX_MEANING, '%d' % len(mn)))
            rs = r.get('reason')
            if rs and len(rs) > MAX_REASON:
                yellow.append((who, i, 'Y4 เหตุผลเกิน %d ตัวอักษร' % MAX_REASON, '%d' % len(rs)))
            allp = list(src['now']) + [a.get('p', '') for a in adds]
            if any(k in src['text'] for k in FIG) and len(allp) < 2:
                yellow.append((who, i, 'Y2 คำเปรียบได้กิ่งเดียว', src['text']))
            if src['len'] > 30 and not any(a.get('c') == 'c14' for a in adds):
                yellow.append((who, i, 'Y5 คำยาวเกิน 30 แต่ไม่ได้เข้าหมวด 15', src['text'][:30] + '…'))

    # ── รายงาน ────────────────────────────────────────────────
    rep = ['# ผลด่านตรวจ · %s' % folder, '',
           '- ไฟล์ผลงาน: %s' % ', '.join(os.path.basename(f) for f in outs),
           '- คำที่ต้องพิจารณา: %d' % len(inp),
           '- 🔴 ด่านแดง: **%d**  (ต้องเป็น 0 ถึงจะไปต่อได้)' % len(red),
           '- 🟡 ด่านเหลือง: %d  (เตือนให้คนดู ไม่บล็อก)' % len(yellow), '']
    for title, items in (('🔴 ด่านแดง', red), ('🟡 ด่านเหลือง', yellow)):
        if not items:
            continue
        rep += ['## %s' % title, '', '| ไฟล์ | ข้อ | ปัญหา | รายละเอียด |', '|---|---|---|---|']
        for who, i, what, det in items:
            rep.append('| %s | %s | %s | %s |' % (who, i, what, str(det).replace('|', '/')))
        rep.append('')
    open(os.path.join(d, 'report.md'), 'w', encoding='utf-8').write('\n'.join(rep))
    json.dump({'red': red, 'yellow': yellow}, open(os.path.join(d, 'problems.json'), 'w',
              encoding='utf-8'), ensure_ascii=False, indent=1)

    print('ไฟล์ผล: %s' % ', '.join(os.path.basename(f) for f in outs))
    print('🔴 ด่านแดง %d · 🟡 ด่านเหลือง %d' % (len(red), len(yellow)))
    for who, i, what, det in red[:15]:
        print('  🔴 %s ข้อ %s · %s · %s' % (who, i, what, det))
    if len(red) > 15:
        print('  … อีก %d รายการ ดูใน report.md' % (len(red) - 15))
    print('รายงานเต็ม: %s' % os.path.join(d, 'report.md'))
    sys.exit(1 if red else 0)


def check_path(who, i, c, p, base_paths, declared, cats, red, where):
    """ตรวจกิ่ง 1 เส้น: มีจริงไหม · ลึกเกินไหม · ขึ้นต้นด้วยชื่อหมวดตัวเองไหม"""
    if not c or not p:
        red.append((who, i, 'R7 %s ไม่มีรหัสหมวดหรือเส้นทาง' % where, '%r %r' % (c, p)))
        return
    if c not in cats:
        red.append((who, i, 'R7 %s รหัสหมวดไม่รู้จัก' % where, c))
        return
    if (c, p) not in base_paths and (c, p) not in declared:
        red.append((who, i, 'R7 %s เป็นกิ่งลอย (ไม่มีใน 766 กิ่ง และไม่ได้ประกาศเป็นกิ่งใหม่)' % where, '%s | %s' % (c, p)))
    if p.count(' / ') > MAX_DEPTH:
        red.append((who, i, 'R8 %s ลึกเกิน 3 ชั้น' % where, p))
    # R9 · เทียบชั้นแรกแบบตรงตัว ไม่ใช่ startswith
    # 🔴 เหตุผล: หมวด 4 ชื่อ "เสียง" คำเดียว ถ้าใช้ startswith จะจับกิ่งที่ขึ้นต้นด้วย "เสียง" ผิดทั้ง 60 กิ่ง
    if p.split(' / ')[0] == cats[c]['name_th']:
        red.append((who, i, 'R9 %s ขึ้นต้นด้วยชื่อหมวดตัวเอง' % where, p))


if __name__ == '__main__':
    main()
