#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง JSON ของคลังเดิมที่พร้อมขึ้น Supabase → docs/oldwords-branches.json

ใช้: python3 scripts/gen_oldwords_json.py

🔑 ทำไมต้องมีไฟล์นี้แยกจาก `docs/branches-data.json`
   `branches-data.json` สร้างจาก `gen_branches.py` ซึ่งอ่านได้แค่ไฟล์ `catN-redesign.md`
   จึงมีแค่ **คำ · หมวด · กิ่ง · ความหมาย** — ไม่มีที่เก็บ "เส้นเชื่อม" ที่ระบบใยแมงมุมต้องใช้
   ไฟล์นี้เอาข้อมูล 3 ทางมาประกอบกัน:
     ① branches-data.json      = คำกับกิ่งที่เป็นความจริงตอนนี้ (ต้นทางเดียวของโครง)
     ② final.json              = เส้นเชื่อม คำที่สกัด ↔ วลีแม่ (จากรอบที่พี่กันคัดเอง)
     ③ merged.jsonl            = เส้นเชื่อมของวลีเดิมที่ได้กิ่งเพิ่ม
   **ไม่แก้ `branches-data.json`** เพราะเป็นไฟล์ปลายทางที่ถูกสร้างใหม่ทุกครั้งที่รัน gen_branches

📐 schema ตรงกับ `docs/newwords-branches.json` ทุกช่อง เพื่อให้รวม 2 คลังได้ตรง ๆ ตอนอัปจริง
   ต่างกันแค่ `novel` = null (คลังเดิมเก็บสะสมจากหลายเรื่อง ไม่ได้บันทึกว่าเรื่องไหน)

แมปกับตารางจริง: text/meaning/kind/category_id/subpath/subpaths/novel → `wb_words`
                 source → ยังไม่มีคอลัมน์ใน wb_words (รอ scripts/014_word_web.sql)
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from spellfix import fix                       # คำที่แก้สะกดหลังลงคลัง
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('docs/oldwords-branches.json')

BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
FIN = json.load(open(P('docs/oldwords/picked/final.json'), encoding='utf-8'))
MERGED = [json.loads(l) for l in open(P('docs/oldwords/extract/merged.jsonl'), encoding='utf-8') if l.strip()]
BASE = json.load(open(P('docs/oldwords/baseline-branches-data.json'), encoding='utf-8'))


def kind_of(t):
    """ชนิดคำ — เกณฑ์เดียวกับที่ใช้กับคลังชุดใหม่"""
    if ' ' in t.strip() and len(t) > 30:
        return 'sentence'
    return 'word' if len(t) <= 12 else 'phrase'


def main():
    # ① เส้นเชื่อมจากรอบคัดคำ: คำ → วลีแม่ทุกวลี
    links = {r['w']: r for r in FIN['words']}

    # ② คำที่มีอยู่ก่อนรอบนี้ = คำเดิมของคลัง (ไว้ติดป้าย origin)
    was = {fix(w['text']) for w in BASE['words']}

    # ③ วลีเดิมที่ได้กิ่งเพิ่มรอบนี้ (ไว้บันทึกว่ากิ่งไหนเพิ่งติด)
    wasp = collections.defaultdict(set)
    for w in BASE['words']:
        for p in (w.get('subpaths') or []):
            wasp[fix(w['text'])].add((w['category_id'], p))

    # รวมแถวของคำเดียวกันที่กระจายอยู่หลายหมวด → all_paths เส้นเดียวจบ
    byword = collections.OrderedDict()
    for w in BD['words']:
        r = byword.setdefault(w['text'], {'text': w['text'], 'rows': [], 'meaning': None})
        r['rows'].append(w)
        if w.get('meaning') and not r['meaning']:
            r['meaning'] = w['meaning']

    words, stat = [], collections.Counter()
    for text, r in byword.items():
        home = r['rows'][0]                       # หมวดบ้านหลัก = แถวแรกที่ gen_branches ออกให้
        allp = [{'category_id': x['category_id'], 'path': p}
                for x in r['rows'] for p in (x.get('subpaths') or [])]
        lk = links.get(text)
        froms = [f['phrase'] for f in lk['from']] if lk else []
        is_old = text in was

        # คำที่สกัดใหม่รอบนี้ → source = วลีแม่ตัวแรก · ที่เหลือลง source_others
        # คำที่มีอยู่แล้ว → เส้นเชื่อมย้อนหลังลง picked_from (ตัวคำไม่ได้เกิดจากวลีนั้น แต่ถูกตัดมาซ้ำ)
        src, others, picked = None, [], []
        if froms:
            if is_old:
                picked = froms
                stat['linkback'] += 1
            else:
                src, others = froms[0], froms[1:]
                stat['extracted'] += 1
            if len(froms) > 1:
                stat['multi_parent'] += 1

        # กิ่งที่เพิ่งติดรอบนี้ (ของวลีเดิม) — บันทึกไว้ให้ตรวจย้อนได้
        fresh = [{'category_id': c, 'path': p} for c, p in
                 ((x['category_id'], p) for x in r['rows'] for p in (x.get('subpaths') or []))
                 if is_old and (c, p) not in wasp[text]]
        if fresh:
            stat['new_branch_on_old'] += len(fresh)

        words.append({
            'text': text,
            'cut_fixed_from': None,
            'kind': kind_of(text),
            'novel': None,                        # คลังเดิมสะสมจากหลายเรื่อง ไม่ได้บันทึกไว้
            'category_id': home['category_id'],
            'subpath': (home.get('subpaths') or [None])[0],
            'subpaths': home.get('subpaths') or [],
            'all_paths': allp,
            'meaning': r['meaning'],
            'reason': None,
            'source': src,
            'source_others': others,
            'picked_from': picked,
            'by_owner': bool(lk and lk.get('by_owner')),
            'loanword_en': None,
            'origin': 'original' if is_old else 'extract',
            'line': None,
            'owner_note': (lk or {}).get('note'),
            'branches_added_this_round': fresh,
        })
        stat['words'] += 1
        stat['links'] += len(allp)
        if len({p['category_id'] for p in allp}) > 1:
            stat['cross_cat'] += 1

    data = {
        'meta': {
            'source': ['docs/branches-data.json', 'docs/oldwords/picked/final.json',
                       'docs/oldwords/extract/merged.jsonl'],
            'novel': None,
            'status': 'draft — ยังไม่อัป Supabase',
            'note': 'คลังเดิม · schema ตรงกับ docs/newwords-branches.json เพื่อให้รวม 2 คลังได้ตรง ๆ '
                    'ช่อง source/picked_from ยังไม่มีคอลัมน์ใน wb_words รอ scripts/014_word_web.sql',
            'counts': {'words': stat['words'], 'word_branch_links': stat['links'],
                       'branches': len(BD['branches']), 'categories': len(BD['categories'])},
        },
        'categories': BD['categories'],
        'branches': BD['branches'],
        'words': words,
        'cross_links': BD.get('cross_links', []),
        'moved_out': BD.get('moved_out', []),
    }
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print('เขียน %s' % OUT)
    print('  คำไม่ซ้ำ %d · เส้นเชื่อม คำ-กิ่ง %d · กิ่ง %d · หมวด %d'
          % (stat['words'], stat['links'], len(BD['branches']), len(BD['categories'])))
    print('  คำที่ติดข้ามหมวด %d' % stat['cross_cat'])
    print('  มีเส้นเชื่อมไปวลีแม่: คำที่สกัดใหม่ %d · เส้นเชื่อมย้อนหลังของคำเดิม %d · มาจากหลายวลี %d'
          % (stat['extracted'], stat['linkback'], stat['multi_parent']))
    print('  กิ่งที่วลีเดิมเพิ่งติดรอบนี้ %d เส้น' % stat['new_branch_on_old'])


if __name__ == '__main__':
    main()
