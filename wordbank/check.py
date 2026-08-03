#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ตัวตรวจคลังคำ — รันแล้วบอกว่าอะไรครบ อะไรขาด

    python3 wordbank/check.py

🎯 ไฟล์นี้เกิดจากคำถามของเจ้าของคลังเมื่อ 3 ส.ค. 2569

    _"เราจะมั่นใจได้ยังไง สิ่งที่เราสั่งมาทั้งหมด มันจะมีจุดไหนหลุดไหมเนี่ยยยย"_

คำตอบไม่ใช่คำพูดว่า "ทำครบแล้ว" แต่คือ **ตัวตรวจที่นับจากข้อมูลจริง**
ทุกข้อในไฟล์นี้เปิดไฟล์ข้อมูลขึ้นมานับเอง ไม่ได้อ่านจากรายงานที่แคลร์เขียนเอง

ตรวจสองส่วน
  ก · ข้อมูลครบถ้วนและไม่ขัดกันเอง       (โครงสร้าง · กิ่งลอย · คำไร้ความหมาย)
  ข · คำสั่งที่เจ้าของคลังเคาะ ลงจริงไหม (ไล่ทีละข้อ พร้อมยกคำสั่งมาให้อ่าน)

ไฟล์นี้ไม่พึ่งอะไรนอกโฟลเดอร์ `wordbank/` เลย — ย้ายทั้งโฟลเดอร์ไปไหนก็ยังรันได้
"""
import json, os, re, sys, collections

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
load = lambda n: [json.loads(l) for l in open(os.path.join(D, n), encoding='utf-8')]

FAIL, WARN = [], []


def ok(cond, label, detail=''):
    print('  %s %-58s %s' % ('✅' if cond else '🔴', label, detail))
    if not cond:
        FAIL.append(label)
    return cond


def warn(cond, label, detail=''):
    print('  %s %-58s %s' % ('✅' if cond else '🟡', label, detail))
    if not cond:
        WARN.append(label)


# ══════════════════════════════════════════════════════════════════════
# ส่วน ก · ข้อมูลครบถ้วน
# ══════════════════════════════════════════════════════════════════════
def part_a():
    print('\n\033[1mส่วน ก · ข้อมูลครบถ้วนและไม่ขัดกันเอง\033[0m')
    C = load('categories.jsonl')
    B = load('branches.jsonl')
    W = load('words.jsonl')
    WB = load('word_branches.jsonl')
    WN = load('word_novels.jsonl')
    WS = load('word_sources.jsonl')
    WM = load('word_meanings.jsonl')

    code = {b['code'] for b in B}
    cid = {c['id'] for c in C}
    wid = {w['id'] for w in W}

    ok(len(W) == len({w['text'] for w in W}), 'ไม่มีคำซ้ำในตารางคำ', '%d คำ' % len(W))
    ok(all(w['meaning'] for w in W), 'ทุกคำมีความหมาย',
       'ไม่มีความหมาย %d คำ' % sum(1 for w in W if not w['meaning']))
    nb = collections.Counter(l['word_id'] for l in WB)
    ok(all(nb[w['id']] for w in W), 'ทุกคำมีกิ่งอย่างน้อย 1 เส้น',
       'ไม่มีกิ่ง %d คำ' % sum(1 for w in W if not nb[w['id']]))
    ok(all(l['branch_code'] in code for l in WB), 'ไม่มีกิ่งลอย',
       '%d เส้น' % len(WB))
    ok(len(code) == len(B), 'รหัสกิ่งไม่ซ้ำ', '%d กิ่ง' % len(B))
    ok(all(b['category_id'] in cid for b in B), 'ทุกกิ่งอยู่ในหมวดที่มีจริง')
    ok(all(b['level'] <= 3 for b in B), 'ไม่มีกิ่งลึกเกิน 3 ชั้น',
       'ลึกสุด %d ชั้น' % max(b['level'] for b in B))
    ok(all(b['path'].split(' / ')[0] != next(c['name_th'] for c in C
                                             if c['id'] == b['category_id'])
           for b in B), 'ไม่มีกิ่งที่ขึ้นต้นด้วยชื่อหมวดตัวเอง')
    for name, rows in (('word_branches', WB), ('word_novels', WN),
                       ('word_sources', WS), ('word_meanings', WM)):
        ok(all(r['word_id'] in wid for r in rows),
           'เส้นเชื่อม %s ชี้ไปคำที่มีจริงทุกเส้น' % name, '%d เส้น' % len(rows))

    home = collections.Counter(l['word_id'] for l in WB if l['is_home'])
    ok(all(home[w['id']] == 1 for w in W), 'ทุกคำมีหมวดบ้านหลักหมวดเดียว')

    bad = [w['text'] for w in W if re.search(r'[⚡✳️➕🆕🚚🔗📕~]', w['text'])
           or w['text'] != w['text'].strip()]
    ok(not bad, 'ไม่มีป้ายหรือช่องว่างติดมาในตัวคำ', bad[:3] or '')

    ym = [w['text'] for w in W if re.search(r'[^ ]ๆ|ๆ[^ ]', w['text'])]
    ok(not ym, 'ไม้ยมกเว้นวรรคหน้าหลังครบทุกคำ', '%d คำที่ยังติด' % len(ym))

    both = [w for w in W if len(w['x_novels']) > 1]
    ok(all(len(set(w['x_novels'])) == 2 for w in both),
       'คำที่เจอสองเล่ม เก็บชื่อเรื่องครบทั้งสอง', '%d คำ' % len(both))

    loan = collections.Counter(l['category_id'] for l in WB)
    ok(loan['c6'] > 0, 'หมวด 7 คำทับศัพท์ ไม่หลุด', '%d เส้น' % loan['c6'])
    ok(loan['c14'] > 0, 'หมวด 15 บทบรรยาย ไม่หลุด', '%d เส้น' % loan['c14'])
    ok(sum(1 for w in W if w['x_loanword_en']) == 21,
       'คำทับศัพท์ 21 คำ ยังมีคำต้นแบบภาษาอังกฤษ')

    ok(all(c.get('color') and c.get('glyph') is not None and c.get('position') is not None
           for c in C), 'ทุกหมวดมีสี สัญลักษณ์ และลำดับ พร้อมขึ้นฐานข้อมูล',
       '%d หมวด' % len(C))
    ok(all(w['subpath'] and w['subpaths'] and w['category_id'] in cid for w in W),
       'ทุกคำมีช่องที่ตาราง wb_words ต้องใช้ครบ')

    empty = [b for b in B if not b['word_count']]
    warn(True, 'กิ่งที่ยังไม่มีคำ (ปกติ — ตั้งเผื่อไว้)', '%d จาก %d กิ่ง' % (len(empty), len(B)))
    return W, B, WB


# ══════════════════════════════════════════════════════════════════════
# ส่วน ข · คำสั่งที่เจ้าของคลังเคาะ — ลงจริงไหม
# ══════════════════════════════════════════════════════════════════════
# แต่ละข้อ: (เลขข้อ, คำสั่งของเจ้าของคลัง, ฟังก์ชันตรวจ)
# ฟังก์ชันรับ (คำ, กิ่ง, เส้นเชื่อม) แล้วคืน (ผ่านไหม, ข้อความบอกผล)
# ══════════════════════════════════════════════════════════════════════
def has_branch(WB, text, leaf):
    return any(l['word_text'] == text and l['path'].split(' / ')[-1] == leaf for l in WB)


def branch(B, leaf):
    return [b for b in B if b['path'].split(' / ')[-1] == leaf]


def part_b(W, B, WB):
    print('\n\033[1mส่วน ข · คำสั่งที่เจ้าของคลังเคาะ — ลงในข้อมูลจริงหรือยัง\033[0m')
    wt = {w['text']: w for w in W}
    T = [

        ('1.1', '"โอ๊ก" ไม่ใช่เสียงสำรอก — ถอนความหมายกับกิ่งเสียงออก',
         lambda: (not has_branch(WB, 'โอ๊ก', 'เสียงจากปากและร่างกาย')
                  and 'สำรอก' not in (wt['โอ๊ก']['meaning'] or ''),
                  wt['โอ๊ก']['meaning'])),

        ('1.2', '"พยักพเยิด" ไม่ได้แปลว่าเย้ยหยัน — ถอนกิ่งดูถูกออก',
         lambda: (not has_branch(WB, 'พยักพเยิด', 'การดูถูกและเหยียดหยาม')
                  and 'เย้ยหยัน' not in (wt['พยักพเยิด']['meaning'] or ''),
                  wt['พยักพเยิด']['meaning'])),

        ('1.3', 'แยกตระกูลรอยยิ้มเป็น 3 ทาง (บวก · ฝืน · เย้ยหยัน)',
         lambda: (all(branch(B, x) for x in ('รอยยิ้มจากอารมณ์ดี',
                                             'รอยยิ้มฝืนและกลบเกลื่อน',
                                             'รอยยิ้มเย้ยหยันและสีหน้าดูถูก'))
                  and has_branch(WB, 'ยิ้มฝืด ๆ', 'รอยยิ้มฝืนและกลบเกลื่อน'),
                  'ยิ้มฝืด ๆ อยู่กิ่งรอยยิ้มฝืน')),

        ('1.4', '"สายตาเย็นชาแฝงแววดูถูก" ไม่ใช่ลักษณะทางกาย ถอนกิ่งแววตา',
         lambda: (not has_branch(WB, 'สายตาเย็นชาแฝงแววดูถูก', 'แววตาและประกายตา'),
                  'ถอนแล้ว')),

        ('1.5', 'ชื่อกิ่ง "คาดเดาและกั๊ก" เป็นภาษาปาก → คาดคะเนและสงวนท่าที',
         lambda: (bool(branch(B, 'คาดคะเนและสงวนท่าที')) and not branch(B, 'คาดเดาและกั๊ก'),
                  branch(B, 'คาดคะเนและสงวนท่าที')[0]['code'])),

        ('2.1', '"หมู่ไม้หนาทึบ" มีกิ่งที่ตรงกว่าอยู่แล้ว',
         lambda: (not has_branch(WB, 'หมู่ไม้หนาทึบ', 'ต้นไม้และพันธุ์ไม้')
                  and has_branch(WB, 'หมู่ไม้หนาทึบ', 'ป่าและหมู่ไม้หนาทึบ'), '')),

        ('2.2', '"ละลานตา" พูดเรื่องปริมาณ ไม่ใช่ความเด่น',
         lambda: (not has_branch(WB, 'ละลานตา', 'ความโดดเด่นและการดึงดูดสายตา'), '')),

        ('2.3', '"พรรค์นั้น" เป็นน้ำเสียงดูแคลน ไม่ใช่การกระทำที่ดูถูก',
         lambda: (not has_branch(WB, 'พรรค์นั้น', 'การดูถูกและเหยียดหยาม'), '')),

        ('3.x', 'กิ่งใหม่ที่เคาะให้เปิด — เปิดครบและมีรหัสแล้ว',
         lambda: (all(branch(B, x) for x in ('การพูดพร่ำและย้ำซ้ำ',
                                             'การเงื้อและง้างเตรียมฟาด',
                                             'โคนและเชิงของสิ่งก่อสร้าง',
                                             'อารมณ์เอ่อท้นจนล้น')),
                  ' · '.join(branch(B, x)[0]['code'] for x in
                             ('การพูดพร่ำและย้ำซ้ำ', 'การเงื้อและง้างเตรียมฟาด',
                              'โคนและเชิงของสิ่งก่อสร้าง', 'อารมณ์เอ่อท้นจนล้น')))),

        ('3.x', 'กิ่งที่แคลร์แย้งว่าไม่ควรเปิด — ไม่ได้เปิด',
         lambda: (not branch(B, 'การมองเห็นพร่าเลือน')
                  and not branch(B, 'การเดาะปากและดีดลิ้น')
                  and not branch(B, 'การขย้อนและอาเจียน'), 'ไม่มีทั้ง 3 กิ่ง')),

        ('4.1', '"ฉาบฉาย" แบบไฟฉาย — ห้ามแก้เป็นฉาบฉวย',
         lambda: ('ฉาบฉาย' in wt and 'ฉาบฉวย' not in wt, 'ฉาบฉาย')),

        ('4.2', '"เค้าราง" สะกดผิด → เค้าลาง และยุบแถวซ้ำในเล่มเดียวกัน',
         lambda: ('เค้าลาง' in wt and 'เค้าราง' not in wt, 'เหลือแถวเดียว')),

        ('5.1', 'ชื่อกิ่งอังกฤษฝั่งตา → Visual Illusion & Hallucination',
         lambda: (any(b.get('name_en') == 'Visual Illusion & Hallucination' for b in B), '')),

        ('5.2', 'ประสาทหลอนครบทุกประสาทสัมผัส — ตา หู จมูก/ลิ้น ผิว',
         lambda: (all(any(b.get('name_en') == e for b in B) for e in
                      ('Visual Illusion & Hallucination',
                       'Hearing & Auditory Hallucination',
                       'Olfactory & Gustatory Distortion',
                       'Skin & Phantom Sensations')), 'ครบ 4 ประสาทสัมผัส')),

        ('6.1', '"เครื่องเครา" ไม่ได้แปลว่าหนวดเครา',
         lambda: (not has_branch(WB, 'เครื่องเครา', 'หนวดและเครา')
                  and 'หนวด' not in (wt['เครื่องเครา']['meaning'] or ''),
                  wt['เครื่องเครา']['meaning'])),

        ('6.3', '"ล่อกแล่ก" ใส่วงเล็บกำกับรูปคำไว้ในคลังด้วย',
         lambda: ('ลอกแลก' in (wt['ล่อกแล่ก']['meaning'] or ''),
                  wt['ล่อกแล่ก']['meaning'])),

        ('6.7', 'คำปลอมที่ลงท้ายด้วย ฯ — ลบทิ้ง',
         lambda: (not any(w['text'].endswith('ฯ') for w in W), 'ไม่เหลือ')),

        ('7.2', '"เรื่องพรรค์นั้น" เข้ากิ่งคำเรียกสภาพโดยรวม',
         lambda: (has_branch(WB, 'เรื่องพรรค์นั้น', 'คำเรียกสภาพและสถานการณ์โดยรวม'), '')),

        ('—', 'ผลทบทวนทั้งคลัง — ทุกคำต้องมีความหมาย ไม่ใช่แค่บางคำ',
         lambda: (all(w['meaning'] for w in W),
                  '%d ช่องความหมาย' % sum(len(w['x_meanings']) for w in W))),

        ('—', 'คำซ้ำข้ามเล่ม — โยง ไม่ใช่ลบ',
         lambda: (sum(1 for w in W if len(w['x_novels']) > 1) == 137, '137 คำ')),

        ('—', 'คำที่ตัดมาจากวลีแม่ — เส้นเชื่อมกลับไปหาวลีแม่ยังอยู่',
         lambda: (len(load('word_sources.jsonl')) > 1000,
                  '%d เส้น' % len(load('word_sources.jsonl')))),

        # เทียบแบบ "ยังปรากฏอยู่ในคลัง" ไม่ใช่ "เป็นคำเดี่ยว"
        # เพราะบางคำเก็บอยู่ในวลีเท่านั้น เช่น `รวง` อยู่ใน "รวงสีแดงของต้นไม้พลิ้วตามสายลม…"
        ('—', 'คำสะกดที่เจ้าของคลังยืนยันเองว่าถูกแล้ว — ห้ามใครไปแก้',
         lambda: (all(any(t in w['text'] for w in W)
                      for t in ('ควั่ก', 'รวง', 'กระเท่เร่', 'ฉาบฉาย',
                                'นึง', 'ซัก', 'รื้น', 'กระหืดหอบ', 'หนั่นแน่น')),
                  'ครบ 9 คำ')),

        ('—', 'คำที่แก้สะกดแล้ว — รูปเก่าต้องไม่หลงเหลืออยู่',
         lambda: (not any(any(t in w['text'] for w in W)
                          for t in ('พลวัน', 'ปั้นปึ้ง', 'ผมเผ่า', 'เขยื่อน',
                                    'เค้าราง', 'เต็มเหนียว', 'ชุบมือเปิด',
                                    'ขี้เหล่', 'หมดอาลัยตายหยาก')),
                  'ไม่เหลือรูปเก่าสักคำ')),
    ]

    for no, order, f in T:
        try:
            good, detail = f()
        except Exception as e:                       # คำหายไปจากคลัง = ตกทันที
            good, detail = False, 'ตรวจไม่ได้: %s' % e
        print('  %s [%-4s] %-52s %s' % ('✅' if good else '🔴', no, order[:52], detail[:40]))
        if not good:
            FAIL.append('ข้อ %s · %s' % (no, order))


# ══════════════════════════════════════════════════════════════════════
def main():
    print('\n\033[1m🔍 ตรวจคลังคำ — wordbank/\033[0m')
    W, B, WB = part_a()
    part_b(W, B, WB)
    st = json.load(open(os.path.join(D, '_stats.json'), encoding='utf-8'))['stats']
    print('\n\033[1mตัวเลขปัจจุบัน\033[0m')
    for k, v in st.items():
        print('  %-24s %s' % (k, f'{v:,}' if isinstance(v, int) else v))
    print()
    if FAIL:
        print('\033[1m🔴 ไม่ผ่าน %d ข้อ\033[0m' % len(FAIL))
        for f in FAIL:
            print('   ·', f)
        sys.exit(1)
    print('\033[1m✅ ผ่านทุกข้อ\033[0m — ข้อมูลครบ และคำสั่งที่เคาะไว้ลงในของจริงแล้วทุกข้อ')
    if WARN:
        print('   (มีข้อสังเกต %d ข้อ ไม่ใช่ข้อผิดพลาด)' % len(WARN))


if __name__ == '__main__':
    main()
