#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""แยกตระกูลรอยยิ้มเป็น 3 ทาง + เปิดกิ่งการรับรู้ผิดให้ครบทุกประสาทสัมผัส
เจ้าของคลังสั่งเอง 3 ส.ค. 2569 — _"สามกิ่งยิ้ม โอเคร แก้และสร้างเลย"_ · _"5.2 ตามเธอเลย"_

สคริปต์นี้แก้เฉพาะ **คลังชุดใหม่** (docs/newwords-branches.json) ซึ่งเป็นไฟล์ที่
สร้างใหม่ไม่ได้แล้ว (ไฟล์โจทย์ต้นทาง out*.jsonl ไม่ได้เก็บในเรพ) จึงต้องแก้ตรง ๆ
ส่วนคลังเดิมแก้ที่ docs/catN-*-redesign.md แล้วรันตัวสร้างตามลำดับปกติ

═══════════════════════════════════════════════════════════════════════
เรื่องที่ 1 · แยกยิ้มบวก / ยิ้มฝืน / ยิ้มลบ
═══════════════════════════════════════════════════════════════════════
เจ้าของคลังชี้เองว่า _"ปัญหาคือชื่อกิ่ง รอยยิ้มและความยินดี เราเอาออกเพราะมันมีคำว่า
ยินดี แต่ถ้ากิ่งนี้เขียนแค่รอยยิ้ม มันจะเข้า"_

ข้อจำกัดที่เจอตอนเปิดของจริง: กิ่งรอยยิ้มอยู่ชั้น 3 แล้ว = ชั้นลึกสุดที่คลังอนุญาต
จึงแตกกิ่งลูกใต้มันไม่ได้ ต้องแยกเป็น **กิ่งพี่น้องระดับเดียวกัน**

และกิ่งยิ้มลบมีอยู่แล้วโดยไม่มีใครเห็น เพราะชื่อไม่มีคำว่า "ยิ้ม"
  C02-03-007 "สีหน้าเยาะเย้ยและดูถูก" เก็บ แสยะยิ้ม · แสยะยิ้มแฝงพิษสงร้ายกาจ
             · ยิ้มแฝงเลศนัยเป็นเชิงดูแคลนผู้อื่น อยู่แล้ว

  C02-03-005  รอยยิ้มและความยินดี      → รอยยิ้มจากอารมณ์ดี          (บวก)
  C02-03-007  สีหน้าเยาะเย้ยและดูถูก   → รอยยิ้มเย้ยหยันและสีหน้าดูถูก (ลบ)
  C02-03-010  🆕 รอยยิ้มฝืนและกลบเกลื่อน                              (กลาง)

ย้ายคำเดียว: **ยิ้มฝืด ๆ** จากกิ่งบวก → กิ่งกลาง
เพราะไม่ใช่ยินดีและไม่ใช่เย้ยหยัน มันคือยิ้มเพื่อกลบอารมณ์จริง

═══════════════════════════════════════════════════════════════════════
เรื่องที่ 2 · ประสาทหลอนกับประสาทสัมผัส (ข้อ 5.2)
═══════════════════════════════════════════════════════════════════════
คลังมีบ้านของ "การรับรู้ผิด" ให้ตาแล้ว (C01-04-000) และให้หูแล้ว (D04-01-000)
แต่จมูก ลิ้น และผิวหนัง ไม่มี

  E13-01-000  อาการคันและสัมผัสบนผิว → สัมผัสบนผิวและความรู้สึกที่ผุดขึ้นเอง
              (ไม่ขยับคำสักคำ แค่ให้ชื่อกับนิยามตรงกับของที่อยู่ข้างในอยู่แล้ว —
               ไต่ยุบยิบ · คันยุบยิบ · รู้สึกเย็นสันหลังวาบอย่างบอกไม่ถูก
               ล้วนเป็นสัมผัสที่ผุดขึ้นเองโดยไม่มีสิ่งเร้าจริงบนผิว)
  E13-05-000  🆕 การรับกลิ่นและรสที่ผิดไป — ตั้งเผื่อ ยังไม่มีคำมาลง

ใช้:  python3 scripts/fix_smile_and_sense.py            ดูผลอย่างเดียว
      python3 scripts/fix_smile_and_sense.py --write    เขียนไฟล์จริง
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

F_NEW = P('docs/newwords-branches.json')
F_SRC = P('docs/branches-data.json')      # แหล่งความจริงของโครงกิ่ง (สร้างจาก catN md)

# เส้นทางเดิม → เส้นทางใหม่ · เทียบทั้งเส้น ไม่ใช่แค่ชื่อท่อนท้าย
#
# 🔑 เทียบด้วย "เส้นทาง" อย่างเดียว ไม่เอาหมวดมาเป็นเงื่อนไข
#    เพราะช่อง subpaths ของคลังชุดใหม่เก็บกิ่งข้ามหมวดไว้ด้วย (771 เส้น)
#    หมวดที่ติดมากับตัวคำจึงไม่ใช่หมวดของกิ่งเสมอไป
#    🔴 เขียนผิดรอบแรกจริง (ใช้หมวดของคำมากรอง) → พลาดไป 4 เส้น เช่น
#       "กระหยิ่มยิ้มย่อง" ที่ตัวคำอยู่หมวด 5 แต่ติดกิ่งรอยยิ้มของหมวด 3 ด้วย
#    มีด่านเช็คด้านล่างว่าเส้นทางที่จะเปลี่ยนต้องไม่ซ้ำข้ามหมวด
RENAME = {
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มและความยินดี':
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มจากอารมณ์ดี',
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / สีหน้าเยาะเย้ยและดูถูก':
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มเย้ยหยันและสีหน้าดูถูก',
    'สภาวะทางกายภายใน / อาการคันและสัมผัสบนผิว':
    'สภาวะทางกายภายใน / สัมผัสบนผิวและความรู้สึกที่ผุดขึ้นเอง',
}
RENAME_CAT = {  # หมวดของแต่ละกิ่ง ใช้เฉพาะตอนเช็คกับโครงกิ่งจริง
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มและความยินดี': 'c2',
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / สีหน้าเยาะเย้ยและดูถูก': 'c2',
    'สภาวะทางกายภายใน / อาการคันและสัมผัสบนผิว': 'c4',
}

# ชื่ออังกฤษที่เปลี่ยนด้วย (เส้นทางไทยไม่เปลี่ยน จึงไม่อยู่ในตาราง RENAME)
EN_ONLY = {
    ('c3', 'การรับรู้และความดังของเสียง / การได้ยินและการหลอนหู'):
           'Hearing & Auditory Hallucination',
}

# ย้ายคำ: (ข้อความคำ, หมวด, เส้นทางต้นทาง หลังเปลี่ยนชื่อแล้ว) → เส้นทางปลายทาง
MOVE = [(
    'ยิ้มฝืด ๆ', 'c2',
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มจากอารมณ์ดี',
    'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มฝืนและกลบเกลื่อน',
)]

# กิ่งใหม่ที่ต้องมีในไฟล์คลังชุดใหม่ด้วย (เพิ่งเปิดที่ catN md ไปแล้ว)
ADD = [
    ('c2', 'การแสดงออกทางใบหน้าและศีรษะ / สีหน้าและอารมณ์บนใบหน้า / รอยยิ้มฝืนและกลบเกลื่อน'),
    ('c4', 'สภาวะทางกายภายใน / การรับกลิ่นและรสที่ผิดไป'),
]

PATH_FIELDS = ('subpath', 'subpaths', 'all_paths')


def rename_path(p):
    """เปลี่ยนชื่อทั้งกิ่งนั้นและกิ่งลูกที่ห้อยอยู่ใต้มัน (เทียบเส้นทางล้วน ไม่ดูหมวด)"""
    for old, new in RENAME.items():
        if p == old:
            return new
        if p.startswith(old + ' / '):
            return new + p[len(old):]
    return p


def main():
    write = '--write' in sys.argv
    d = json.load(open(F_NEW, encoding='utf-8'))
    src = json.load(open(F_SRC, encoding='utf-8'))

    # ── ด่านก่อนแตะไฟล์ ────────────────────────────────────────────────
    live = {(b['category_id'], b['path']): b for b in src['branches']}
    by_path = collections.defaultdict(set)
    for b in src['branches']:
        by_path[b['path']].add(b['category_id'])
    err = []
    for old, new in RENAME.items():
        cid = RENAME_CAT[old]
        if (cid, new) not in live:
            err.append('เส้นทางใหม่ไม่มีในโครงกิ่งจริง: %s | %s' % (cid, new))
        if (cid, old) in live:
            err.append('เส้นทางเดิมยังอยู่ในโครงกิ่งจริง (แปลว่ายังไม่ได้แก้ md): %s | %s' % (cid, old))
        # เทียบด้วยเส้นทางล้วน จึงต้องมั่นใจว่าเส้นทางนี้ไม่ซ้ำข้ามหมวด
        if len(by_path.get(new, set())) > 1:
            err.append('เส้นทางใหม่ซ้ำข้ามหมวด เปลี่ยนแบบเทียบเส้นทางล้วนไม่ได้: %s' % new)
        for p in list(by_path):
            if p == old or p.startswith(old + ' / '):
                err.append('เส้นทางเดิมยังโผล่ในโครงกิ่งจริง: %s' % p)
    for cid, p in ADD:
        if (cid, p) not in live:
            err.append('กิ่งใหม่ยังไม่มีในโครงกิ่งจริง: %s | %s' % (cid, p))
    for cid, p in EN_ONLY:
        if (cid, p) not in live:
            err.append('กิ่งที่จะเปลี่ยนชื่ออังกฤษไม่มีในโครงกิ่งจริง: %s | %s' % (cid, p))
    for txt, cid, frm, to in MOVE:
        hits = [w for w in d['words'] if w['text'] == txt]
        if len(hits) != 1:
            err.append('คำที่จะย้ายเจอ %d แถว (ต้องเจอ 1): %s' % (len(hits), txt))
        if (cid, to) not in live:
            err.append('กิ่งปลายทางไม่มีในโครงกิ่งจริง: %s | %s' % (cid, to))
    if err:
        for e in err:
            print('🔴', e)
        return 1

    before_words = len(d['words'])
    before_links = sum(len(w.get('all_paths') or []) for w in d['words'])
    before_texts = sorted(w['text'] for w in d['words'])

    # ── 1 · เปลี่ยนชื่อกิ่งในตัวคำ ────────────────────────────────────
    n_field = collections.Counter()
    for w in d['words']:
        cid = w.get('category_id')
        for f in PATH_FIELDS:
            v = w.get(f)
            if isinstance(v, str):
                nv = rename_path(v)
                if nv != v:
                    w[f] = nv
                    n_field[f] += 1
            elif isinstance(v, list):
                for i, p in enumerate(v):
                    if isinstance(p, str):
                        nv = rename_path(p)
                        if nv != p:
                            v[i] = nv
                            n_field[f] += 1
                    elif isinstance(p, dict) and 'path' in p:
                        nv = rename_path(p['path'])
                        if nv != p['path']:
                            p['path'] = nv
                            n_field[f] += 1

    # ── 2 · เปลี่ยนชื่อกิ่งในรายการกิ่ง + เปลี่ยนชื่ออังกฤษ ──────────
    n_br = 0
    for b in d['branches']:
        nv = rename_path(b['path'])
        if nv != b['path']:
            b['path'] = nv
            n_br += 1
        k = (b['category_id'], b['path'])
        if k in live:
            b['en'] = live[k].get('en') or b.get('en')
            b['definition'] = live[k].get('definition') or b.get('definition')

    # ── 3 · เพิ่มกิ่งใหม่ ────────────────────────────────────────────
    have = {(b['category_id'], b['path']) for b in d['branches']}
    n_add = 0
    for cid, p in ADD:
        if (cid, p) in have:
            continue
        s = live[(cid, p)]
        d['branches'].append({'category_id': cid, 'path': p, 'en': s.get('en'),
                              'definition': s.get('definition'), 'is_new': True,
                              'word_count': 0})
        n_add += 1

    # ── 4 · ย้ายคำ ───────────────────────────────────────────────────
    n_move = 0
    for txt, cid, frm, to in MOVE:
        w = [x for x in d['words'] if x['text'] == txt][0]
        for f in PATH_FIELDS:
            v = w.get(f)
            if isinstance(v, str) and v == frm:
                w[f] = to
                n_move += 1
            elif isinstance(v, list):
                for i, p in enumerate(v):
                    if isinstance(p, str) and p == frm:
                        v[i] = to
                        n_move += 1
                    elif isinstance(p, dict) and p.get('path') == frm:
                        p['path'] = to
                        n_move += 1

    # ── 5 · นับคำใหม่ให้ทุกกิ่ง ──────────────────────────────────────
    cnt = collections.Counter()
    for w in d['words']:
        seen = set()
        for p in (w.get('subpaths') or []):
            if isinstance(p, str):
                seen.add((w.get('category_id'), p))
        for p in (w.get('all_paths') or []):
            if isinstance(p, dict):
                seen.add((p.get('category_id', w.get('category_id')), p.get('path')))
            elif isinstance(p, str):
                seen.add((w.get('category_id'), p))
        for k in seen:
            cnt[k] += 1
    for b in d['branches']:
        b['word_count'] = cnt.get((b['category_id'], b['path']), 0)

    # ── ด่านหลังแก้ ──────────────────────────────────────────────────
    err = []
    if len(d['words']) != before_words:
        err.append('จำนวนคำเปลี่ยน %d → %d' % (before_words, len(d['words'])))
    if sorted(w['text'] for w in d['words']) != before_texts:
        err.append('ข้อความของคำถูกแตะ')
    after_links = sum(len(w.get('all_paths') or []) for w in d['words'])
    if after_links != before_links:
        err.append('เส้นกิ่งเปลี่ยน %d → %d' % (before_links, after_links))
    # กิ่งลอย = เส้นทางที่ไม่มีอยู่ในโครงกิ่งจริงแล้ว
    # เทียบด้วย "เส้นทาง" ล้วน เพราะ subpaths เก็บกิ่งข้ามหมวดไว้ด้วย
    # 🔴 รอบแรกเช็คแค่ all_paths → subpaths ที่ตกหล่นเลยรอดด่านไปได้
    alive = {b['path'] for b in src['branches']}
    ghost = set()
    for w in d['words']:
        for f in PATH_FIELDS:
            v = w.get(f)
            vs = [v] if isinstance(v, str) else (v or [])
            for p in vs:
                pp = p.get('path') if isinstance(p, dict) else p
                if pp and pp not in alive:
                    ghost.add((f, pp))
    if ghost:
        err.append('กิ่งลอย %d เส้น เช่น %s' % (len(ghost), sorted(ghost)[:3]))
    if err:
        for e in err:
            print('🔴', e)
        return 1

    print('เปลี่ยนชื่อกิ่งในตัวคำ:', dict(n_field))
    print('เปลี่ยนชื่อกิ่งในรายการกิ่ง: %d · เพิ่มกิ่งใหม่: %d · ย้ายคำ: %d จุด'
          % (n_br, n_add, n_move))
    print('คำ %d (เท่าเดิม) · เส้นกิ่ง %d (เท่าเดิม) · กิ่งลอย 0'
          % (len(d['words']), after_links))
    for cid, p in ADD:
        print('  กิ่งใหม่ %s | %s | คำ %d' % (cid, p, cnt.get((cid, p), 0)))

    if write:
        json.dump(d, open(F_NEW, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('เขียน docs/newwords-branches.json แล้ว')
        print('⚠️ อย่าลืมแก้ docs/newwords-branches.md ให้ตรงกันด้วย (ไฟล์นี้สร้างใหม่ไม่ได้)')
    else:
        print('(ดูผลอย่างเดียว — ใส่ --write เพื่อเขียนไฟล์จริง)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
