#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ด่านตรวจผลขั้นนิยาม+จัดกิ่ง (M2) + เทียบกับกิ่งเดิม

ใช้: python3 scripts/check_sense.py

ตรวจ 2 เรื่อง
  ① ผลถูกรูปแบบไหม (ด่านแดง — ต้องเป็น 0 ก่อนไปต่อ)
  ② เทียบกับกิ่งเดิม แล้วแยกเป็น 3 กอง: เพิ่ม · คงไว้ · ถอน

🔴 ด่านที่สำคัญที่สุดของรอบนี้ = "ทุกคำที่ตีความได้หลายทาง ต้องมีความหมาย"
   เพราะนั่นคือกฎที่พี่กันเคาะ และเป็นเหตุผลทั้งหมดที่ทำรอบนี้
"""
import json, os, glob, collections, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
R2 = '--round2' in sys.argv
# รอบ 1 ย้ายไปเป็นบันทึกประวัติที่ docs/m2-sense/raw แล้ว (ห้ามรันทับ) · รอบ 2 ใช้ --round2
DIR = 'docs/m2-sense/round2' if R2 else 'docs/m2-sense/raw'
D = lambda *a: P(DIR, *a)
MAXD, MAXM = 2, 60          # 🌿 ไม่มีเพดานจำนวนกิ่ง (พี่กันสั่ง 27 ก.ค. "ติด 100 ได้ก็ต้องติด")

bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
VALID = {(b['category_id'], b['path']) for b in bd['branches']}
CATS = {c['id']: c['name_th'] for c in bd['categories']}
NO = {c['id']: c['no'] for c in bd['categories']}
TASK = {json.loads(l)['id']: json.loads(l)['w']
        for l in open(D('in.jsonl'), encoding='utf-8') if l.strip()}
BEFORE = json.load(open(D('before.json'), encoding='utf-8'))


def main():
    red, yellow, rows = [], [], {}
    MEANINGS = {}
    for f in sorted(glob.glob(D('sense*.jsonl')) + glob.glob(D('part*', 'sense*.jsonl'))):
        who = os.path.basename(f)
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            try:
                r = json.loads(line)
            except Exception as e:
                red.append((who, '-', 'R0 JSON เสีย', str(e)[:60]))
                continue
            i, w = r.get('id'), (r.get('w') or '').strip()
            if i not in TASK:
                red.append((who, i, 'R1 ไม่มี id นี้ในโจทย์', repr(w)))
                continue
            if w != TASK[i]:
                red.append((who, i, 'R2 ตัวคำไม่ตรงโจทย์', '%r ≠ %r' % (w, TASK[i])))
                continue
            if i in rows:
                red.append((who, i, 'R3 ตอบซ้ำ', w))
                continue

            senses = r.get('senses') or []
            # ฉบับที่ ๑๑ — ความหมายเป็น "รายการ" 1 ช่องต่อ 1 ความหมาย (ยังรับรูปเดิมได้)
            mns = [str(x).strip() for x in (r.get('meanings') or
                   ([r['meaning']] if r.get('meaning') else [])) if str(x).strip()]
            mn = ' · '.join(mns) or None
            ps = r.get('paths') or []

            if not senses:
                red.append((who, i, 'R4 ไม่มี senses', w))
            # 🔴 กฎหลักของรอบนี้
            if R2:
                # คำสั่งฉบับที่ ๑๑ — ความหมายต้องมีทุกรายการ และเป็น "รายการ" ไม่ใช่ก้อนเดียว
                if not mns:
                    red.append((who, i, 'R5 ไม่มีความหมาย', w))
                elif len(senses) > 1 and len(mns) == 1:
                    yellow.append((who, i, 'Y4 ตีความหลายทางแต่เขียนความหมายช่องเดียว',
                                   '%s · %d ความหมาย / 1 ช่อง' % (w, len(senses))))
            elif len(senses) > 1 and not mn:
                red.append((who, i, 'R5 ตีความหลายทางแต่ไม่มีความหมาย', '%s · %d ความหมาย' % (w, len(senses))))
            # 🌿 ฉบับที่ ๑๑ ถอนเพดานความยาวความหมายแล้ว — ด่านนี้เหลือใช้กับรอบ 1 เท่านั้น
            if not R2 and mn and len(mn) > MAXM:
                red.append((who, i, 'R6 ความหมายเกิน %d ตัวอักษร' % MAXM, '%s (%d)' % (w, len(mn))))
            if not R2 and len(senses) == 1 and mn:
                yellow.append((who, i, 'Y1 ตีความทางเดียวแต่ใส่ความหมาย (เกินจำเป็น)', w))
            for np_ in (r.get('new_paths') or []):
                c, pp = np_.get('c'), (np_.get('p') or '')
                if not c or not pp:
                    red.append((who, i, 'R15 กิ่งใหม่ไม่ครบช่อง', str(np_)[:50]))
                    continue
                if (c, pp) in VALID:
                    yellow.append((who, i, 'Y3 เสนอกิ่งใหม่ที่มีอยู่แล้ว', pp))
                elif ' / ' not in pp:
                    red.append((who, i, 'R16ก กิ่งใหม่ตื้นเกิน ต้องลึกอย่างน้อย 2 ชั้น', pp))
                elif pp.count(' / ') > MAXD:
                    red.append((who, i, 'R16 กิ่งใหม่ลึกเกิน 3 ชั้น', pp))
                elif ' / ' in pp and (c, pp.rsplit(' / ', 1)[0]) not in VALID:
                    red.append((who, i, 'R17 กิ่งใหม่ไม่มีกิ่งแม่รองรับ', pp))
                elif c in CATS and pp.split(' / ')[0] == CATS[c]:
                    red.append((who, i, 'R18 กิ่งใหม่ขึ้นต้นด้วยชื่อหมวดตัวเอง', pp))

            if not ps:
                red.append((who, i, 'R7 ไม่มีกิ่ง', w))
            seen = set()
            for p in ps:
                c, pp = p.get('c'), p.get('p')
                if not c or not pp:
                    red.append((who, i, 'R9 กิ่งไม่ครบช่อง', str(p)[:50]))
                    continue
                if (c, pp) in seen:
                    red.append((who, i, 'R10 กิ่งซ้ำในคำเดียวกัน', pp))
                seen.add((c, pp))
                if (c, pp) not in VALID:
                    red.append((who, i, 'R11 กิ่งลอย', '%s|%s' % (c, pp)))
                elif pp.count(' / ') > MAXD:
                    red.append((who, i, 'R12 ลึกเกิน 3 ชั้น', pp))
                # เทียบชั้นแรกแบบตรงตัว ไม่ใช้ startswith (หมวด 4 ชื่อ "เสียง" คำเดียว)
                elif c in CATS and pp.split(' / ')[0] == CATS[c]:
                    red.append((who, i, 'R13 ขึ้นต้นด้วยชื่อหมวดตัวเอง', pp))
            rows[i] = r
            MEANINGS[w] = mns

    miss = [i for i in TASK if i not in rows]
    if miss:
        red.append(('-', '-', 'R14 ตอบไม่ครบ', 'ขาด %d คำ เช่น %s' % (len(miss), [TASK[i] for i in miss[:5]])))

    # ---------- เทียบกับกิ่งเดิม ----------
    add, keep, drop = [], [], []
    newmn = []
    perbank = {}
    for i, r in rows.items():
        w = r['w']
        b = BEFORE.get(w)
        if not b:
            continue
        # รอบ 2 เก็บสถานะแยกรายคลัง {bank: {...}} · รอบ 1 เป็นก้อนเดียว
        banks = b if R2 else {'old': b}
        now = {(p['c'], p['p']) for p in (r.get('paths') or [])}
        union_was, got_mn = set(), False
        for tag, bb in banks.items():
            was = {(p['c'], p['p']) for p in bb['paths']}
            union_was |= was
            s = perbank.setdefault(tag, {'add': [], 'keep': [], 'drop': [], 'newmn': []})
            s['add'] += [[w, c, p] for c, p in sorted(now - was)]
            s['keep'] += [[w, c, p] for c, p in sorted(was & now)]
            s['drop'] += [[w, c, p] for c, p in sorted(was - now)]
            if MEANINGS.get(w) and not bb.get('meaning'):
                s['newmn'].append(w)
                got_mn = True
        for k in sorted(now - union_was):
            add.append((w, k))
        for k in sorted(union_was & now):
            keep.append((w, k))
        for k in sorted(union_was - now):
            drop.append((w, k))
        if got_mn:
            newmn.append(w)

    multi = sum(1 for r in rows.values() if len(r.get('senses') or []) > 1)
    print('ตอบมา %d จาก %d คำ · ตีความหลายทาง %d (%.0f%%)'
          % (len(rows), len(TASK), multi, 100 * multi / max(1, len(rows))))
    print('🔴 ด่านแดง %d · 🟡 ด่านเหลือง %d' % (len(red), len(yellow)))
    for x in red[:25]:
        print('   🔴 ข้อ %s · %s · %s' % (x[1], x[2], x[3]))
    if len(red) > 25:
        print('   … อีก %d' % (len(red) - 25))
    yc = collections.Counter(y[2] for y in yellow)
    for k, v in yc.most_common():
        print('   🟡 %s %d' % (k, v))

    print()
    print('=== เทียบกับกิ่งเดิม ===')
    print('  ➕ กิ่งที่เพิ่ม %d เส้น · ✅ คงไว้ %d · ➖ **ถอน %d**' % (len(add), len(keep), len(drop)))
    for tag, s in sorted(perbank.items()):
        nm = {'old': 'คลังเดิม', 'new': 'คลังชุดใหม่'}.get(tag, tag)
        print('     %s: เพิ่ม %d · คงไว้ %d · ถอน %d · ได้ความหมายใหม่ %d คำ'
              % (nm, len(s['add']), len(s['keep']), len(s['drop']), len(s['newmn'])))
    print('  💬 คำที่ได้ความหมายใหม่ %d คำ' % len(newmn))
    percat = collections.Counter(k[0] for _, k in add)
    if percat:
        print('  กิ่งที่เพิ่ม แยกตามหมวด: %s'
              % ' · '.join('หมวด %s %d' % (NO.get(c, c), n) for c, n in sorted(percat.items(), key=lambda x: -x[1])[:8]))
    if drop:
        print('  ตัวอย่างกิ่งที่จะถอน 10 จุดแรก:')
        for w, k in drop[:10]:
            print('     %-18s ⊘ หมวด %s › %s' % (w, NO.get(k[0], k[0]), k[1][:52]))

    props = []
    for i, r in rows.items():
        for np_ in (r.get('new_paths') or []):
            if np_.get('c') and np_.get('p') and (np_['c'], np_['p']) not in VALID:
                props.append([r['w'], np_['c'], np_['p'], np_.get('def'), np_.get('why')])
    if props:
        print('  🌱 กิ่งใหม่ที่เสนอ %d เส้น (%d กิ่งไม่ซ้ำ)'
              % (len(props), len({(x[1], x[2]) for x in props})))

    json.dump({'add': [[w, c, p] for w, (c, p) in add],
               'keep': [[w, c, p] for w, (c, p) in keep],
               'drop': [[w, c, p] for w, (c, p) in drop],
               'new_paths': props,
               'perbank': perbank,
               'meanings': MEANINGS,

               'senses': {r['w']: (r.get('senses') or []) for r in rows.values()},
               'suspect': {r['w']: r['suspect'] for r in rows.values() if r.get('suspect')},
               'new_meaning': newmn},
              open(D('diff.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('เขียน %s' % D('diff.json'))
    return 1 if red else 0


if __name__ == '__main__':
    raise SystemExit(main())
