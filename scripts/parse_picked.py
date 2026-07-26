#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""แกะผลคัดคำที่พี่กันส่งกลับมา → docs/oldwords/picked/picked.json + ด่านตรวจ

ใช้: python3 scripts/parse_picked.py [ไฟล์ raw]

รูปแบบที่รับ:  N. คำ / วลีตั้งต้น / บรรทัดที่ M / ที่มา [/ หมายเหตุ: ...]

🔑 ยึด "เลขบรรทัด" เป็นกุญแจหาวลีเต็มจาก in.jsonl
   เพราะวลีในรายงานถูกย่อด้วย [...] หรือ ฯ ได้ (เครื่องมือตัดให้สั้นตอนส่งออก)
   แล้วเทียบตัวคำกับ **วลีเต็ม** ไม่ใช่วลีย่อ

🔴 ด่านที่สำคัญที่สุด = คำที่เลือกต้องเป็นท่อนต่อเนื่องของวลีเต็มจริง
   ยกเว้นคำที่พี่กันเขียนหมายเหตุว่า "เพิ่มเอง" (พี่กันคิดคำขึ้นเอง ไม่ได้ตัดจากวลี)
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
RAW = sys.argv[1] if len(sys.argv) > 1 else P('docs/oldwords/picked/raw-2026-07-26.txt')
OUT = P('docs/oldwords/picked/picked.json')

COMB = set('ัิีึืุู่้๊๋์็ําะๆฯ')
LEAD = set('เแโใไ')

# 🔴 คำที่ "ระบบตัดผิด" ไม่ใช่พี่กันตั้งใจเลือก — แก้ให้เลย ไม่ต้องถาม
#    (กฎเดียวกับเคส `ก๊า`→`ก๊าก` และ `หลุบตาลงอ`→`หลุบตาลง` ตอนคลังชุดใหม่
#     พี่กันพูดเอง: "คิดว่าเราตั้งใจเอาคำพวกนี้ที่ผิด ๆ มาเหรอ")
#    `ฯ` = เครื่องหมายย่อความที่ติดมาตอน import ไม่ใช่ส่วนของตัวคำ
CUT_FIX = {
    'คมกริบฯ': ('คมกริบ', 'ฯ คือเครื่องหมายย่อความท้ายวลี ไม่ใช่ส่วนของคำ'),
}

LINE = re.compile(r'^\s*(\d+)\.\s*(.+?)\s*/\s*(.+?)\s*/\s*บรรทัดที่\s*(\d+)\s*/\s*([^/]+?)\s*(?:/\s*หมายเหตุ\s*[:：]\s*(.+?)\s*)?$')


def main():
    rows = [json.loads(l) for l in open(P('docs/oldwords/extract/in.jsonl'), encoding='utf-8') if l.strip()]
    byn = {r['n']: r for r in rows}

    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    have_old = {w['text'] for w in bd['words']}
    have_new = {w['text'] for w in json.load(open(P('docs/newwords-branches.json'), encoding='utf-8'))['words']}

    # กิ่งที่ผู้ช่วยเสนอไว้แล้ว (จาก merged.jsonl) — คีย์ (เลขบรรทัด, ตัวคำ)
    sug = {}
    for line in open(P('docs/oldwords/extract/merged.jsonl'), encoding='utf-8'):
        if not line.strip():
            continue
        r = json.loads(line)
        for e in (r.get('ex') or []):
            sug[(r['n'], e['w'])] = e

    picked, red, yellow = [], [], []
    for ln, line in enumerate(open(RAW, encoding='utf-8'), 1):
        s = line.rstrip('\n')
        if not s.strip() or s.lstrip().startswith('#'):
            continue
        m = LINE.match(s)
        if not m:
            red.append(('R0 อ่านบรรทัดไม่ออก', ln, s[:70]))
            continue
        idx, word, shown, n, src, note = m.group(1), m.group(2), m.group(3), int(m.group(4)), m.group(5), m.group(6)
        idx = int(idx)
        by_owner = bool(note and 'เพิ่มเอง' in note)
        fix = CUT_FIX.get(word)
        if fix:
            yellow.append(('Y6 แก้คำที่ระบบตัดผิด', idx, '%s → %s (%s)' % (word, fix[0], fix[1])))
            word = fix[0]

        row = byn.get(n)
        if row is None:
            red.append(('R1 ไม่มีบรรทัดนี้ในคลัง', idx, 'บรรทัดที่ %d' % n))
            continue
        full = row['t']

        # วลีย่อในรายงานต้องเป็นของบรรทัดนั้นจริง — เทียบด้วยหัววลี (ตัดที่ [...] หรือ ฯ)
        head = re.split(r'\s*\[\.\.\.\]|ฯ\s*$', shown)[0].strip()
        if head and head not in full:
            yellow.append(('Y0 วลีในรายงานไม่ตรงบรรทัด', idx, '%r vs %r' % (shown[:30], full[:30])))

        rec = {'idx': idx, 'w': word, 'n': n, 'src': 'own' if 'สกัดเอง' in src else 'sys',
               'phrase': full, 'by_owner': by_owner}
        if note:
            rec['note'] = note

        if by_owner:
            yellow.append(('Y5 พี่กันคิดคำเอง (ไม่ต้องเป็นท่อนของวลี)', idx, word))
        elif word not in full:
            red.append(('R2 ไม่ใช่ท่อนต่อเนื่องของวลี', idx, '%r ⊄ %r' % (word, full)))
            continue
        else:
            if word[0] in COMB:
                red.append(('R3 ขึ้นต้นสระ/วรรณยุกต์ลอย', idx, word))
            if word[-1] in LEAD:
                red.append(('R3 ค้างสระหน้า', idx, word))
            if word == full:
                yellow.append(('Y2 เท่ากับวลีเดิมทั้งดุ้น', idx, word))
        if word.count('[') != word.count(']'):
            red.append(('R4 วงเล็บเหลี่ยมขาด', idx, word))
        if 'ฯ' in word:
            red.append(('R5 มีอักขระย่อ ฯ ติดมาในตัวคำ', idx, word))

        if word in have_old:
            rec['in_old'] = True
            yellow.append(('Y3 มีในคลังเดิมแล้ว', idx, word))
        if word in have_new:
            rec['in_new'] = True

        e = sug.get((n, word))
        if e:
            rec['paths'] = e.get('paths') or []
            if e.get('meaning'):
                rec['meaning'] = e['meaning']
        picked.append(rec)

    # ยุบคำซ้ำ: คำเดียวกัน + บรรทัดเดียวกัน = ซ้ำจริง (เช่น ระบบเสนอ + สกัดเอง ตัวเดียวกัน)
    seen, uniq, dupes = {}, [], []
    for r in picked:
        k = (r['n'], r['w'])
        if k in seen:
            dupes.append(r)
            if r['src'] == 'own':
                seen[k]['src'] = 'both'
            continue
        seen[k] = r
        uniq.append(r)

    # คำเดียวกันจากคนละวลี = เส้นเชื่อมหลายเส้น ไม่ใช่คำซ้ำ (ระบบใยแมงมุม)
    byword = collections.defaultdict(list)
    for r in uniq:
        byword[r['w']].append(r['n'])
    multi = {w: ns for w, ns in byword.items() if len(ns) > 1}

    json.dump({'picked': uniq, 'multi_parent': multi},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    need = [r for r in uniq if not r.get('paths')]
    print('อ่านได้ %d รายการ · ยุบซ้ำในบรรทัดเดียวกัน %d → เหลือ %d' % (len(picked), len(dupes), len(uniq)))
    print('  คำไม่ซ้ำ %d · คำที่มาจากหลายวลี %d (เส้นเชื่อมหลายเส้น ไม่ใช่คำซ้ำ)'
          % (len(byword), len(multi)))
    print('  มีกิ่งที่ผู้ช่วยเสนอไว้แล้ว %d · **ยังไม่มีกิ่ง %d**' % (len(uniq) - len(need), len(need)))
    print('  มีในคลังเดิมอยู่แล้ว %d (= เส้นเชื่อมย้อนหลัง ไม่ใช่คำใหม่)'
          % sum(1 for r in uniq if r.get('in_old')))
    print('  มีในคลังชุดใหม่แล้ว %d' % sum(1 for r in uniq if r.get('in_new')))
    print('🔴 ด่านแดง %d · 🟡 ด่านเหลือง %d' % (len(red), len(yellow)))
    for x in red[:25]:
        print('   🔴 ข้อ %s · %s · %s' % (x[1], x[0], x[2]))
    if len(red) > 25:
        print('   … อีก %d' % (len(red) - 25))
    yc = collections.Counter(y[0] for y in yellow)
    for k, v in yc.most_common():
        print('   🟡 %s %d' % (k, v))
    for y in yellow:
        if y[0].startswith('Y0'):
            print('      ↳ ข้อ %s · %s' % (y[1], y[2]))
    print('เขียน %s' % OUT)
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main())
