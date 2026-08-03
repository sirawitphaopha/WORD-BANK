#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวมคลังทั้งสองเล่มเป็นชุดเดียว → docs/final/ — เจ้าของคลังสั่งเอง 3 ส.ค. 2569

    _"เราสร้างโฟลเด้อที่ เป็นอันสุดท้ายดีไหม จะได้แก้ที่นี่ที่เดียว
      ที่มันจะพร้อมเอาขึ้นดาต้าเบส"_

## ปัญหาที่โฟลเดอร์นี้แก้
ก่อนหน้านี้ "คำ" กระจายอยู่ 2 ไฟล์ที่คนละรูปแบบกัน
  · คลังเดิม (เสียงกระซิบจากความมืด)  → อยู่ในชิปของ docs/catN-*-redesign.md
  · คลังชุดใหม่ (คินดะอิจิยอดนักสืบฯ)  → อยู่ใน docs/newwords-branches.json
แก้อะไรทีต้องไล่ทั้งสองที่ และไม่มีไฟล์ไหนที่เอาขึ้นฐานข้อมูลได้ตรง ๆ

## แบ่งหน้าที่กันชัด ๆ (สำคัญ อ่านก่อนแก้อะไร)
| จะแก้อะไร | แก้ที่ไหน |
|---|---|
| **โครงกิ่ง** — ชื่อกิ่ง · นิยาม · ชื่ออังกฤษ · เพิ่ม/ลดกิ่ง | `docs/catN-*-redesign.md` เท่านั้น |
| **ตัวคำ** — คำ · ความหมาย · คำอยู่กิ่งไหน · ชื่อเรื่อง | ไฟล์ในโฟลเดอร์นี้ |

🔒 เหตุผลที่โครงกิ่งยังอยู่ที่ไฟล์หมวด — ไฟล์พวกนั้นเก็บ **เหตุผลของทุกกิ่ง**
   (ใครเสนอ · ทำไมถึงตั้ง · เคยแย้งอะไรกัน) ซึ่งเป็นของที่หายแล้วหาคืนไม่ได้
   และทะเบียนรหัสกิ่งก็ผูกกับไฟล์พวกนั้น ถ้าย้ายมารวมที่นี่รหัสจะเลื่อนทั้งคลัง

## คำซ้ำข้ามเล่ม — ไม่ยุบ
คำเดียวกันที่เจอในนิยายคนละเรื่อง = **คงไว้เป็นแถวเดียว แต่เก็บชื่อเรื่องเป็นรายการ**
ตามที่เจ้าของคลังเคาะไว้เรื่อง `ผมเผ้า` และ `อึกอัก` — โยง ไม่ใช่ลบ
กิ่งและความหมายของทั้งสองฝั่งต้องอยู่ครบ ห้ามให้ฝั่งไหนหาย

ใช้:  python3 scripts/gen_final.py
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('docs/final')

NOVEL_OLD = 'เสียงกระซิบจากความมืด'
NOVEL_NEW = 'คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ'


def lv(path):
    """ใส่เลขชั้นในวงเล็บทุกชั้น ตามกฎที่เจ้าของคลังตั้งไว้ 27 ก.ค."""
    return '/'.join('%s(%d)' % (s, i + 1) for i, s in enumerate(path.split(' / ')))


def main():
    os.makedirs(OUT, exist_ok=True)
    src = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    new = json.load(open(P('docs/newwords-branches.json'), encoding='utf-8'))
    oldj = json.load(open(P('docs/oldwords-branches.json'), encoding='utf-8'))

    cats = {c['id']: c for c in src['categories']}
    code_of = {b['path']: b['code'] for b in src['branches']}
    cat_of = {b['path']: b['category_id'] for b in src['branches']}
    branches = {b['path']: b for b in src['branches']}

    # ── รวมคำจากทั้งสองเล่ม โดยยึด "ตัวข้อความ" เป็นกุญแจ ──────────────
    # (บทเรียนเดิมของโปรเจกต์: อะไรที่ผูกด้วยลำดับ พังทันทีที่ไฟล์ถูกสร้างใหม่)
    merged = collections.OrderedDict()

    def take(w, novel):
        t = w['text']
        r = merged.setdefault(t, {
            'text': t, 'kind': w.get('kind'), 'novels': [], 'paths': [],
            'meanings': [], 'sources': [], 'picked_from': [],
            'loanword_en': None, 'by_owner': False, 'reason': None,
        })
        if novel and novel not in r['novels']:
            r['novels'].append(novel)
        for p in (w.get('all_paths') or w.get('subpaths') or []):
            pp = p.get('path') if isinstance(p, dict) else p
            if pp and pp not in r['paths']:
                r['paths'].append(pp)
        ms = w.get('meanings') or ([w['meaning']] if w.get('meaning') else [])
        for m in ms:
            if m and m not in r['meanings']:
                r['meanings'].append(m)
        for k in ('source', 'source_others', 'picked_from'):
            v = w.get(k)
            vs = [v] if isinstance(v, str) else (v or [])
            key = 'picked_from' if k == 'picked_from' else 'sources'
            for x in vs:
                if x and x not in r[key]:
                    r[key].append(x)
        if w.get('loanword_en'):
            r['loanword_en'] = w['loanword_en']
        if w.get('by_owner'):
            r['by_owner'] = True
        if w.get('reason') and not r['reason']:
            r['reason'] = w['reason']
        if w.get('kind') and not r['kind']:
            r['kind'] = w['kind']

    for w in oldj['words']:
        take(w, w.get('novel') or NOVEL_OLD)
    for w in new['words']:
        take(w, w.get('novel') or NOVEL_NEW)

    # ── เติมรหัสกิ่ง + หมวด ให้ทุกเส้น ────────────────────────────────
    rows, ghost = [], set()
    for r in merged.values():
        links = []
        for p in r['paths']:
            if p not in code_of:
                ghost.add(p); continue
            links.append({'code': code_of[p], 'category_id': cat_of[p],
                          'category': cats[cat_of[p]]['name_th'], 'path': p})
        if not links:
            continue
        home = links[0]['category_id']
        same = [l['path'] for l in links if l['category_id'] == home]
        rows.append({
            'text': r['text'],
            'kind': r['kind'] or 'phrase',
            'novels': r['novels'],
            'meanings': r['meanings'],
            'meaning': ' · '.join(r['meanings']) or None,
            # ── ช่องที่ตรงกับตาราง wb_words ของจริง ───────────────────
            'category_id': home,
            'subpath': same[0] if same else links[0]['path'],
            'subpaths': same or [links[0]['path']],
            # ── ช่องที่รอ scripts/014_word_web.sql (ระบบใยแมงมุม) ─────
            'branches': links,
            'sources': r['sources'],
            'picked_from': r['picked_from'],
            'loanword_en': r['loanword_en'],
            'by_owner': r['by_owner'],
            'reason': r['reason'],
        })

    assert not ghost, 'กิ่งลอย: %s' % list(ghost)[:3]

    both = [r for r in rows if len(r['novels']) > 1]
    cross = [r for r in rows if len({l['category_id'] for l in r['branches']}) > 1]
    nlink = sum(len(r['branches']) for r in rows)

    meta = {
        'สร้างโดย': 'scripts/gen_final.py',
        'คำไม่ซ้ำ': len(rows),
        'เส้นเชื่อมคำ-กิ่ง': nlink,
        'กิ่งทั้งหมด': len(src['branches']),
        'หมวด': len(src['categories']),
        'คำที่เจอทั้งสองเล่ม': len(both),
        'คำที่ติดกิ่งข้ามหมวด': len(cross),
        'เล่ม': [NOVEL_OLD, NOVEL_NEW],
        'ยังไม่ได้อัปขึ้น Supabase': True,
        'หมายเหตุ': 'โครงกิ่งแก้ที่ docs/catN-*-redesign.md เท่านั้น · ไฟล์นี้เก็บเฉพาะตัวคำ',
    }
    json.dump({'meta': meta,
               'categories': src['categories'],
               'branches': src['branches'],
               'words': rows},
              open(os.path.join(OUT, 'wordbank.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    # ── ฉบับอ่าน: ต้นไม้ หมวด → กิ่ง → คำ ─────────────────────────────
    inbr = collections.defaultdict(list)
    for r in rows:
        for l in r['branches']:
            inbr[l['path']].append(r)
    L = ['# คลังคำ · ฉบับรวมสองเล่ม', '',
         '> สร้างอัตโนมัติจาก `scripts/gen_final.py` — **อย่าแก้ไฟล์นี้ด้วยมือ**', '',
         '| | |', '|---|---|']
    for k, v in meta.items():
        if isinstance(v, list):
            v = ' · '.join(v)
        L.append('| %s | %s |' % (k, v))
    L.append('')
    for c in src['categories']:
        bs = [b for b in src['branches'] if b['category_id'] == c['id']]
        tot = len({r['text'] for b in bs for r in inbr.get(b['path'], [])})
        L += ['', '## หมวด %d · %s (%s) — %d คำ' % (c['no'], c['name_th'], c.get('name_en') or '', tot), '']
        for b in bs:
            ws = inbr.get(b['path'], [])
            if not ws:
                continue
            L.append('- **%s**  `[%s]` — _%s_' % (lv(b['path']), b['code'], b.get('definition') or ''))
            L.append('  ' + ' · '.join(
                w['text'] + (' 📕' if len(w['novels']) > 1 else '') for w in ws))
    open(os.path.join(OUT, 'wordbank.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')

    # ── โครงกิ่งล้วน (ไม่มีคำ) ────────────────────────────────────────
    L = ['# โครงกิ่งทั้งคลัง', '',
         '> สร้างอัตโนมัติ — **แก้ที่ `docs/catN-*-redesign.md` เท่านั้น**', '']
    for c in src['categories']:
        L += ['', '## หมวด %d · %s' % (c['no'], c['name_th']), '']
        for b in src['branches']:
            if b['category_id'] != c['id']:
                continue
            n = len(inbr.get(b['path'], []))
            L.append('- `[%s]` %s — _%s_%s'
                     % (b['code'], lv(b['path']), b.get('definition') or '',
                        '' if n else '  ⬜ ยังไม่มีคำ'))
    open(os.path.join(OUT, 'branches.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')

    for k, v in meta.items():
        print('  %-24s %s' % (k, v))
    print('เขียน docs/final/wordbank.json · wordbank.md · branches.md แล้ว')


if __name__ == '__main__':
    main()
