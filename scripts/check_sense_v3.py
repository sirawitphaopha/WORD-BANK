#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ตรวจคำตอบรอบที่ 3 + แปลงรหัสกิ่งกลับเป็นเส้นทางภาษาไทย

รอบนี้ผู้ช่วยตอบเป็น "รหัสกิ่ง" (A01-03-002) แทนการพิมพ์ชื่อกิ่งเอง
ไฟล์นี้ทำ 2 หน้าที่ในตัวเดียว:
  ① ตรวจว่าคำตอบใช้ได้ไหม (ด่านแดง = ต้องแก้ก่อนไปต่อ · ด่านเหลือง = เตือนให้ดู)
  ② แปลงรหัสกลับเป็นเส้นทางไทย เขียนเป็น out.jsonl ให้ขั้นถัดไปใช้ต่อ

🔑 ข้อดีของการตอบเป็นรหัส — รอบก่อนผู้ช่วยพิมพ์ชื่อกิ่งเองแล้วเขียนไม่ครบชั้น 38 เส้น
   ต้องเขียนโปรแกรมไล่ซ่อม (fix_sense_paths.py) · รอบนี้รหัสพิมพ์ผิดไม่ได้
   ผิดปุ๊บคือหาไม่เจอในทะเบียน จับได้ทันทีที่ด่าน R4

ใช้:
    python3 scripts/check_sense_v3.py            ตรวจอย่างเดียว
    python3 scripts/check_sense_v3.py --write    ตรวจแล้วเขียน out.jsonl ด้วย
"""
import json, os, sys, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/m2-sense/round3', *a)

BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
NO = {c['id']: c['no'] for c in BD['categories']}
# รหัส → กิ่ง
BY_CODE = {b['code']: b for b in BD['branches'] if b.get('code')}
# กิ่งที่ "ลงคำได้" (ไม่มีกิ่งลูก) — กิ่งหัวข้อห้ามเลือก
HAS_CHILD = {(b['category_id'], b['path']) for b in BD['branches']
             if any(o['path'].startswith(b['path'] + ' / ') and o['category_id'] == b['category_id']
                    for o in BD['branches'])}
LEAF_CODE = {c for c, b in BY_CODE.items() if (b['category_id'], b['path']) not in HAS_CHILD}
MEANING_CAP = 100          # เกณฑ์ที่เจ้าของเคาะ · ยกเว้นบทบรรยายยาว
NARRATION_LEN = 60         # ข้อความยาวเกินนี้ถือเป็นบทบรรยาย ความหมายยาวเกิน 100 ได้


def load():
    task = {}
    for line in open(D('in.jsonl'), encoding='utf-8'):
        if line.strip():
            r = json.loads(line)
            task[r['id']] = r['w']
    ans, dupes, broken = {}, [], 0
    for f in sorted(glob.glob(D('out*.jsonl')) + glob.glob(D('part*', 'out*.jsonl'))):
        for ln, line in enumerate(open(f, encoding='utf-8'), 1):
            if not line.strip():
                continue
            try:
                r = json.loads(line)
            except Exception:
                broken += 1            # บรรทัดพัง (มักเกิดตอนถูกตัดกลางคัน) — ข้ามไป ไม่ทำให้ทั้งไฟล์ใช้ไม่ได้
                continue
            i = r.get('id')
            if i in ans:
                dupes.append(i)
            else:
                ans[i] = r
    return task, ans, dupes, broken


def main():
    write = '--write' in sys.argv
    if not os.path.exists(D('in.jsonl')):
        print('🔴 ยังไม่มีไฟล์โจทย์ — รัน gen_task_v3.py ก่อน')
        return 1
    task, ans, dupes, broken = load()
    if not ans:
        print('🔴 ยังไม่มีคำตอบ (ไม่พบ out*.jsonl)')
        return 1

    red, yellow = [], []
    A = lambda t, m: red.append('%s %s' % (t, m))
    Y = lambda t, m: yellow.append('%s %s' % (t, m))

    if broken:
        Y('R0', 'บรรทัดที่อ่านไม่ออก %d บรรทัด (มักเกิดตอนถูกตัดกลางคัน) — ข้ามไปแล้ว' % broken)
    if dupes:
        A('R1', 'ตอบซ้ำ id เดิม %d รายการ เช่น %s' % (len(dupes), dupes[:5]))

    extra = [i for i in ans if i not in task]
    if extra:
        A('R2', 'ตอบ id ที่ไม่มีในโจทย์ %d รายการ เช่น %s' % (len(extra), extra[:5]))

    changed = [i for i, r in ans.items() if i in task and r.get('w') != task[i]]
    if changed:
        A('R3', '🔒 แก้ตัวอักษรของข้อความ %d รายการ เช่น id %s' % (len(changed), changed[:3]))
        for i in changed[:3]:
            print('     โจทย์: %s' % task[i])
            print('     ตอบ  : %s' % ans[i].get('w'))

    ghost, headings, nopath = [], [], []
    for i, r in ans.items():
        ps = r.get('paths') or []
        if not ps:
            nopath.append(i)
        for c in ps:
            if c not in BY_CODE:
                ghost.append((i, c))
            elif c not in LEAF_CODE:
                headings.append((i, c))
    if ghost:
        A('R4', 'รหัสกิ่งไม่มีอยู่จริง %d เส้น เช่น %s' % (len(ghost), ghost[:5]))
    if headings:
        A('R5', '🚨 เลือกกิ่งที่เป็นหัวข้อ (มีกิ่งลูก) %d เส้น เช่น %s' % (len(headings), headings[:5]))
    if nopath:
        A('R6', 'ไม่มีกิ่งเลย %d รายการ เช่น %s' % (len(nopath), nopath[:5]))

    nomean = [i for i, r in ans.items() if not (r.get('meanings') or [])]
    if nomean:
        A('R7', 'ไม่มีความหมาย %d รายการ เช่น %s' % (len(nomean), nomean[:5]))
    notlist = [i for i, r in ans.items() if r.get('meanings') and not isinstance(r['meanings'], list)]
    if notlist:
        A('R8', 'ความหมายไม่ได้เป็นรายการ %d รายการ' % len(notlist))

    longm = [(i, len(m)) for i, r in ans.items() for m in (r.get('meanings') or [])
             if len(m) > MEANING_CAP and len(task.get(i, '')) <= NARRATION_LEN]
    if longm:
        Y('R9', 'ความหมายยาวเกิน %d ตัวอักษร %d ช่อง (ไม่ใช่บทบรรยาย) เช่น %s'
          % (MEANING_CAP, len(longm), longm[:3]))

    badnew = []
    for i, r in ans.items():
        for q in (r.get('new_paths') or []):
            if not isinstance(q, dict) or not q.get('th') or not q.get('en') or not q.get('parent'):
                badnew.append((i, q))
            elif q['parent'] not in BY_CODE:
                badnew.append((i, 'parent ไม่มีจริง: %s' % q.get('parent')))
    if badnew:
        A('R10', 'กิ่งใหม่ที่เสนอผิดรูปแบบ %d เส้น เช่น %s' % (len(badnew), badnew[:3]))

    miss = [i for i in task if i not in ans]
    if miss:
        A('R11', 'ตอบไม่ครบ — ขาด %d จาก %d รายการ' % (len(miss), len(task)))

    # ── รายงาน ──
    print('โจทย์ %d รายการ · ตอบมา %d (%.0f%%)' % (len(task), len(ans), 100 * len(ans) / len(task)))
    npaths = sum(len(r.get('paths') or []) for r in ans.values())
    nmean = sum(len(r.get('meanings') or []) for r in ans.values())
    multi = sum(1 for r in ans.values() if len(r.get('meanings') or []) > 1)
    newp = sum(len(r.get('new_paths') or []) for r in ans.values())
    sus = sum(1 for r in ans.values() if r.get('suspect'))
    if ans:
        print('เส้นกิ่ง %d (เฉลี่ย %.2f/รายการ) · ความหมาย %d ช่อง (เฉลี่ย %.2f) · หลายความหมาย %d รายการ'
              % (npaths, npaths / len(ans), nmean, nmean / len(ans), multi))
        print('กิ่งใหม่ที่เสนอ %d เส้น · สงสัยสะกดผิด %d คำ' % (newp, sus))
    print()
    for m in red:
        print('🔴 %s' % m)
    for m in yellow:
        print('🟡 %s' % m)
    if not red:
        print('✅ ด่านแดงผ่านหมด')

    if write:
        if red:
            print('\n🛑 ยังมีด่านแดง ไม่เขียน out.jsonl')
            return 1
        rows = []
        for i in sorted(ans):
            r = ans[i]
            paths = []
            for c in r['paths']:
                b = BY_CODE[c]
                paths.append({'code': c, 'category_id': b['category_id'], 'path': b['path']})
            rows.append({'id': i, 'w': r['w'], 'suspect': r.get('suspect'),
                         'meanings': r.get('meanings') or [], 'paths': paths,
                         'new_paths': r.get('new_paths') or []})
        with open(D('resolved.jsonl'), 'w', encoding='utf-8') as f:
            for x in rows:
                f.write(json.dumps(x, ensure_ascii=False) + '\n')
        print('\nเขียน docs/m2-sense/round3/resolved.jsonl (%d รายการ · แปลงรหัสเป็นเส้นทางไทยแล้ว)' % len(rows))
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main())
