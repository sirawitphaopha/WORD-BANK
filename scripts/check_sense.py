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
import json, os, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/oldwords/sense', *a)
MAXP, MAXD, MAXM = 4, 2, 60

bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
VALID = {(b['category_id'], b['path']) for b in bd['branches']}
CATS = {c['id']: c['name_th'] for c in bd['categories']}
NO = {c['id']: c['no'] for c in bd['categories']}
TASK = {json.loads(l)['id']: json.loads(l)['w']
        for l in open(D('in.jsonl'), encoding='utf-8') if l.strip()}
BEFORE = json.load(open(D('before.json'), encoding='utf-8'))


def main():
    red, yellow, rows = [], [], {}
    for f in sorted(glob.glob(D('sense*.jsonl'))):
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
            mn = (r.get('meaning') or '').strip() or None
            ps = r.get('paths') or []

            if not senses:
                red.append((who, i, 'R4 ไม่มี senses', w))
            # 🔴 กฎหลักของรอบนี้
            if len(senses) > 1 and not mn:
                red.append((who, i, 'R5 ตีความหลายทางแต่ไม่มีความหมาย', '%s · %d ความหมาย' % (w, len(senses))))
            if mn and len(mn) > MAXM:
                red.append((who, i, 'R6 ความหมายเกิน %d ตัวอักษร' % MAXM, '%s (%d)' % (w, len(mn))))
            if len(senses) == 1 and mn:
                yellow.append((who, i, 'Y1 ตีความทางเดียวแต่ใส่ความหมาย (เกินจำเป็น)', w))

            if not ps:
                red.append((who, i, 'R7 ไม่มีกิ่ง', w))
            if len(ps) > MAXP:
                red.append((who, i, 'R8 เกิน %d กิ่ง' % MAXP, '%s (%d)' % (w, len(ps))))
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

    miss = [i for i in TASK if i not in rows]
    if miss:
        red.append(('-', '-', 'R14 ตอบไม่ครบ', 'ขาด %d คำ เช่น %s' % (len(miss), [TASK[i] for i in miss[:5]])))

    # ---------- เทียบกับกิ่งเดิม ----------
    add, keep, drop = [], [], []
    newmn = []
    for i, r in rows.items():
        w = r['w']
        b = BEFORE.get(w)
        if not b:
            continue
        was = {(p['c'], p['p']) for p in b['paths']}
        now = {(p['c'], p['p']) for p in (r.get('paths') or [])}
        for k in sorted(now - was):
            add.append((w, k))
        for k in sorted(was & now):
            keep.append((w, k))
        for k in sorted(was - now):
            drop.append((w, k))
        if (r.get('meaning') or '').strip() and not b.get('meaning'):
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
    print('  💬 คำที่ได้ความหมายใหม่ %d คำ' % len(newmn))
    percat = collections.Counter(k[0] for _, k in add)
    if percat:
        print('  กิ่งที่เพิ่ม แยกตามหมวด: %s'
              % ' · '.join('หมวด %s %d' % (NO.get(c, c), n) for c, n in sorted(percat.items(), key=lambda x: -x[1])[:8]))
    if drop:
        print('  ตัวอย่างกิ่งที่จะถอน 10 จุดแรก:')
        for w, k in drop[:10]:
            print('     %-18s ⊘ หมวด %s › %s' % (w, NO.get(k[0], k[0]), k[1][:52]))

    json.dump({'add': [[w, c, p] for w, (c, p) in add],
               'keep': [[w, c, p] for w, (c, p) in keep],
               'drop': [[w, c, p] for w, (c, p) in drop],
               'new_meaning': newmn},
              open(D('diff.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('เขียน %s' % D('diff.json'))
    return 1 if red else 0


if __name__ == '__main__':
    raise SystemExit(main())
