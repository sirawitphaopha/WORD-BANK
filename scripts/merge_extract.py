#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวมผลสกัดคำ+กิ่ง ของคลังเดิมจากทุกไฟล์ out*.jsonl → docs/oldwords/extract/merged.jsonl

ใช้: python3 scripts/merge_extract.py

🔑 หลักการรวม = **รวมกัน (union) ไม่ใช่ให้ใครชนะ**
   วลีเดียวกันอาจถูกพิจารณาโดยหลายฝ่าย (เอเจนต์ครึ่งแรก · ครึ่งหลัง · แคลร์ทำเอง 12 คำที่กู้คืน)
   ทุกฝ่ายเสนอของที่ถูกต้อง → เอามารวมกันแล้วตัดซ้ำ
   ตรงกับกฎเหล็กของงานนี้: **เพิ่มได้ ลดไม่ได้**

🔴 บทเรียน 26 ก.ค.: ยึด "ตัวข้อความ" เป็นกุญแจหลักเสมอ เลขบรรทัด n เป็นแค่ตัวช่วย
   (เคยแก้ in.jsonl ระหว่างเอเจนต์กำลังใช้ 654 → 666 วลี เลข n เลื่อนยกแผง)
"""
import json, glob, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
P = lambda *a: os.path.join(ROOT, *a)
from spellfix import fix                  # ผลดิบเขียนรูปก่อนแก้สะกด แมปให้ตรงคลังปัจจุบัน
IN = P('docs/oldwords/extract/in.jsonl')
OUT = P('docs/oldwords/extract/merged.jsonl')


def main():
    rows = [json.loads(l) for l in open(IN, encoding='utf-8') if l.strip()]
    BYT = {r['t']: r for r in rows}

    # acc[ตัวข้อความ] = {'ex': {คำ: {'meaning':..,'paths':[..]}}, 'add': {(c,p): why}, 'src': set(ไฟล์)}
    acc = {}
    lost = []
    for f in sorted(glob.glob(P('docs/oldwords/extract/out*.jsonl'))):
        who = os.path.basename(f)
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            t = fix(r.get('t'))
            if t not in BYT:                      # ข้อความไม่ตรงคลัง = ทิ้งไว้ให้คนดู ไม่เงียบ
                lost.append((who, r.get('n'), t))
                continue
            a = acc.setdefault(t, {'ex': {}, 'add': {}, 'src': set()})
            a['src'].add(who)
            for e in (r.get('ex') or []):
                w = fix((e.get('w') or '').strip())
                if not w:
                    continue
                cur = a['ex'].setdefault(w, {'meaning': None, 'paths': {}})
                if e.get('meaning') and not cur['meaning']:
                    cur['meaning'] = e['meaning']
                for p in (e.get('paths') or []):
                    k = (p.get('c'), p.get('p'))
                    if k[0] and k[1]:
                        cur['paths'].setdefault(k, p.get('why'))
            for x in (r.get('add') or []):
                k = (x.get('c'), x.get('p'))
                if k[0] and k[1] and k not in a['add']:
                    a['add'][k] = x.get('why')

    merged, stat = [], collections.Counter()
    for r in rows:                                # เรียงตามไฟล์โจทย์ปัจจุบัน = เลข n ตรงเสมอ
        a = acc.get(r['t'])
        if not a:
            continue
        ex = [{'w': w, 'meaning': v['meaning'],
               'paths': [{'c': c, 'p': p, 'why': why} for (c, p), why in v['paths'].items()]}
              for w, v in a['ex'].items()]
        add = [{'c': c, 'p': p, 'why': why} for (c, p), why in a['add'].items()]
        merged.append({'n': r['n'], 't': r['t'], 'ex': ex, 'add': add,
                       'src': sorted(a['src'])})
        stat['rows'] += 1
        stat['ex'] += len(ex)
        stat['add'] += len(add)
        if len(a['src']) > 1:
            stat['overlap'] += 1

    with open(OUT, 'w', encoding='utf-8') as fh:
        for m in merged:
            fh.write(json.dumps(m, ensure_ascii=False) + '\n')

    print('เขียน %s' % OUT)
    print('  วลีที่มีข้อเสนอ %d จาก %d บรรทัดในคลัง' % (stat['rows'], len(rows)))
    print('  คำสกัด %d · กิ่งเพิ่ม %d' % (stat['ex'], stat['add']))
    print('  วลีที่หลายฝ่ายทำซ้อนกัน %d (รวมเป็นแถวเดียว ไม่ทิ้งของใคร)' % stat['overlap'])
    if lost:
        print('  ⚠️ ข้อความไม่ตรงคลัง %d รายการ:' % len(lost))
        for who, n, t in lost[:10]:
            print('     %s บรรทัด %s · %r' % (who, n, t))


if __name__ == '__main__':
    main()
