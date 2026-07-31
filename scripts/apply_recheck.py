#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เติมกิ่งใหม่ให้ 400 รายการที่ทบทวนไปก่อนกิ่งใหม่จะเข้าคลัง

## ปัญหาที่ไฟล์นี้แก้
กิ่งใหม่ 12 กิ่งเพิ่งเข้าคลัง 31 ก.ค. **หลังจาก** 400 รายการแรกของรอบที่ 3 ถูกทบทวนไปแล้ว
ผู้ช่วยรอบนั้นจึงเลือกกิ่งพวกนี้ไม่ได้เลย ต้องยัดคำลงกิ่งใกล้เคียงแทน
ไฟล์นี้เอาผลจากรอบตรวจซ้ำ (`recheck-out.jsonl`) มาเติมกิ่งที่ขาดกลับเข้าไป

## กฎเหล็ก — เพิ่มได้อย่างเดียว ห้ามถอน
รอบตรวจซ้ำนี้ตอบแค่ว่า "รายการนี้ควรอยู่กิ่งใหม่ไหนเพิ่ม" ไม่ได้ตอบว่ากิ่งเดิมผิด
บทเรียนรอบ M2: ผู้ช่วยที่เห็นแต่ตัวคำ **เสนอถอนกิ่งผิด 84 จาก 88 ครั้ง**
เพราะมองไม่เห็นว่ากิ่งเดิมมีที่มาจากบริบทจริงของคำ → รอบนี้จึงล็อกให้เพิ่มได้อย่างเดียว

ใช้:  python3 scripts/apply_recheck.py            ดูผลอย่างเดียว
      python3 scripts/apply_recheck.py --write    เขียนไฟล์จริง
"""
import json, os, sys, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/m2-sense/round3', *a)


def main():
    write = '--write' in sys.argv
    files = sorted(glob.glob(D('recheck-out.jsonl')) + glob.glob(D('recheck?-out.jsonl')))
    if not files:
        print('🔴 ยังไม่มีไฟล์ผลรอบตรวจซ้ำ')
        return 1

    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    BY = {b['code']: b for b in bd['branches'] if b.get('code')}
    HAS_CHILD = {(b['category_id'], b['path']) for b in bd['branches']
                 if any(o['path'].startswith(b['path'] + ' / ') and o['category_id'] == b['category_id']
                        for o in bd['branches'])}
    NO = {c['id']: c['no'] for c in bd['categories']}

    rows = [json.loads(l) for l in open(D('resolved.jsonl'), encoding='utf-8') if l.strip()]
    byid = {r['id']: r for r in rows}

    adds, bad, skip = collections.Counter(), [], 0
    lines = [(os.path.basename(f), i, l)
             for f in files for i, l in enumerate(open(f, encoding='utf-8'), 1)]
    print('อ่านผลรอบตรวจซ้ำจาก %d ไฟล์: %s' % (len(files), ' · '.join(os.path.basename(f) for f in files)))
    for who, ln, line in lines:
        ln = '%s:%d' % (who, ln)
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except Exception:
            bad.append((ln, 'บรรทัดอ่านไม่ออก')); continue
        t = byid.get(r.get('id'))
        if not t:
            bad.append((ln, 'ไม่มี id %s ในผลที่ทบทวนแล้ว' % r.get('id'))); continue
        if r.get('w') and r['w'] != t['w']:
            bad.append((ln, '🔒 ข้อความไม่ตรง id %s' % r['id'])); continue
        for c in (r.get('add') or []):
            b = BY.get(c)
            if not b:
                bad.append((ln, 'รหัสกิ่งไม่มีจริง %s' % c)); continue
            if (b['category_id'], b['path']) in HAS_CHILD:
                bad.append((ln, '🚨 กิ่งหัวข้อ ห้ามลงคำ %s' % c)); continue
            if any(p['code'] == c for p in t['paths']):
                skip += 1; continue                      # มีอยู่แล้ว ไม่ต้องเติมซ้ำ
            t['paths'].append({'code': c, 'category_id': b['category_id'], 'path': b['path']})
            t.setdefault('recheck_added', []).append(c)
            adds[c] += 1

    print('เติมกิ่งใหม่ %d เส้น ให้ %d รายการ · ข้ามที่มีอยู่แล้ว %d'
          % (sum(adds.values()), sum(1 for r in rows if r.get('recheck_added')), skip))
    for c, n in adds.most_common():
        b = BY[c]
        print('   %-12s %-3s %-46s %d คำ' % (c, 'ม.%s' % NO[b['category_id']],
                                             b['path'].split(' / ')[-1], n))
    if bad:
        print('\n🔴 มีปัญหา %d จุด' % len(bad))
        for x in bad[:10]:
            print('   %s · %s' % x)

    if write:
        if bad:
            print('\n🛑 ยังมีปัญหา ไม่เขียนทับ')
            return 1
        with open(D('resolved.jsonl'), 'w', encoding='utf-8') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
        print('\nเขียน resolved.jsonl ทับแล้ว (%d รายการ)' % len(rows))
    else:
        print('\n(ดูผลอย่างเดียว — ใส่ --write เพื่อเขียนไฟล์จริง)')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
