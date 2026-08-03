#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง 2 ไฟล์ที่พี่กันขออ่านเพื่อเคาะ (26 ก.ค. 2569)

1. docs/archive/newwords-round/newwords-review-narration.md
   บทบรรยายทั้งหมดในหมวด 15 · รูปแบบตามที่พี่กันสั่งเอง:
     "บทบรรยายนี้ มีคำย่อยแล้วติดหมวดไหนมั่ง และบททั้งบทติดหมวดหรือกิ่งไหนมั่ง"
   → หมวด 15 ไม่มีกิ่งย่อย · แต่ละบทโชว์ 2 ชั้นคือ ทั้งบทติดกิ่งไหน กับ คำย่อยข้างในติดกิ่งไหน

2. docs/archive/newwords-round/newwords-review-branches.md
   กิ่งใหม่ทั้งหมดที่เพิ่มเข้าหมวดเดิม (หมวด 1–11) พร้อม **คำจริง** และ **เหตุผล**
   พี่กันท้วงว่ารอบก่อนให้แต่ชื่อกิ่ง ไม่มีคำ เลยตัดสินใจไม่ได้

วิธีใช้: python3 scripts/gen_newwords_review.py
"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def p(*a): return os.path.join(ROOT, *a)

D = json.load(open(p('docs/newwords-branches.json'), encoding='utf-8'))
CATS = {c['id']: c for c in D['categories']}
BR = {(b['category_id'], b['path']): b for b in D['branches']}
W = D['words']
NARR = 'c14'                      # หมวด 15 บทบรรยาย


def cname(cid):
    c = CATS[cid]
    return f"หมวด {c['no']} {c['name_th']}"


# ─────────────────────────────────────────────
# 1. บทบรรยายหมวด 15
# ─────────────────────────────────────────────
def narration():
    passages = [w for w in W if any(q['category_id'] == NARR for q in w['all_paths'])]
    passages.sort(key=lambda w: -len(w['text']))

    # คำย่อยที่พี่กันตัดออกมาจากบทนั้น
    # 🔑 ต้องดู 2 ช่อง ไม่ใช่ช่องเดียว (พี่กันจับได้ 26 ก.ค. ว่าโชว์คำย่อยไม่ครบ)
    #    source      = คำสกัดที่เป็นคำใหม่ ไม่เคยมีเป็นบรรทัดเดี่ยว
    #    picked_from = คำที่มีเป็นบรรทัดเดี่ยวในคลังอยู่แล้ว แต่พี่กันก็ตัดจากบทนี้ด้วย
    subs = collections.defaultdict(list)
    for w in W:
        for s in ([w['source']] if w.get('source') else []) + w.get('picked_from', []):
            if w not in subs[s]:
                subs[s].append(w)

    L = ['# 📖 บทบรรยายในหมวด 15 — ลิสต์ให้พี่กันเคาะว่าอันไหนเอา อันไหนไม่เอา',
         '',
         f'> ทั้งหมด **{len(passages)} บท** · เรียงจากยาวสุดไปสั้นสุด',
         '> พี่กันสั่งเอง: _"ลิสทั้ง 80 มาให้ที เราจะอ่านว่าอันไหนเอาอันไหนไม่เอา"_',
         '>',
         '> **รูปแบบตามที่พี่กันกำหนด** — แต่ละบทโชว์ 3 ชั้น:',
         '> 📚 **อยู่กิ่งไหนในหมวด 15** · 🏷 **ทั้งบทติดกิ่งไหนในหมวดอื่น** · ✂ **คำย่อยข้างในติดกิ่งไหน**',
         '>',
         '> _(พี่กันดูไฟล์ร่างหมวด 15 แล้วบอกว่า "ตั้งกิ่งหลักไว้ก็ดีนะ ไม่เอาออกละ" → กิ่งหลัก 6 อันอยู่ครบ)_',
         '>',
         '> ตอบกลับเป็นเลขข้อได้เลย เช่น "ไม่เอา 12 19 33"',
         '']

    L += ['## เกณฑ์ที่ใช้คัดเข้ามา', '',
          'พี่กันบอกว่า _"ยาวแค่ไหน ก็ยาวๆ และใช่ มันจะไม่มาแบบประธานและกิริยา '
          'มันจะมาเป็นร่ายยาวพรรณนาเลย"_',
          '', 'ตอนคัดใช้เกณฑ์ว่าเป็น **ข้อความที่ร่ายยาวพรรณนา ประกอบหลายภาพเข้าด้วยกัน** '
          'ไม่ใช่คำหรือวลีที่จบในภาพเดียว', '']

    n = [len(x['text']) for x in passages]
    L += ['| ความยาว | จำนวนบท |', '|---|---|',
          f'| 60 ตัวอักษรขึ้นไป | {sum(1 for x in n if x >= 60)} |',
          f'| 40–59 | {sum(1 for x in n if 40 <= x < 60)} |',
          f'| 25–39 | {sum(1 for x in n if 25 <= x < 40)} |',
          f'| ต่ำกว่า 25 | {sum(1 for x in n if x < 25)} |', '',
          '🗨 _บทที่สั้นกว่า 25 ตัวอักษรคือกลุ่มที่น่าสงสัยที่สุดว่าจะไม่ใช่บทบรรยาย '
          'พี่กันดูกลุ่มท้าย ๆ ของลิสต์เป็นพิเศษได้_', '', '---', '']

    for i, w in enumerate(passages, 1):
        L.append(f'### {i}. {w["text"]}')
        L.append('')
        L.append(f'> ยาว {len(w["text"])} ตัวอักษร'
                 + (f' · บรรทัด {w["line"]} ในไฟล์คลัง' if w['origin'] == 'raw' else ''))
        L.append('')
        # กิ่งหลักในหมวด 15 เอง — พี่กันดูไฟล์ร่างแล้วบอกว่า "ตั้งกิ่งหลักไว้ก็ดีนะ ไม่เอาออกละ"
        own = [q['path'] for q in w['all_paths'] if q['category_id'] == NARR]
        if own:
            L.append(f'📚 **กิ่งในหมวด 15:** {" · ".join(own)}')
            L.append('')
        whole = [q for q in w['all_paths'] if q['category_id'] != NARR]
        if whole:
            L.append('🏷 **ทั้งบทติดกิ่ง**')
            for q in whole:
                L.append(f'- {cname(q["category_id"])} → `{q["path"]}`')
        else:
            L.append('🏷 **ทั้งบทติดกิ่ง** — ⚠️ ยังไม่มีกิ่งเนื้อหาจริง มีแต่หมวด 15')
        sw = subs.get(w['text'], [])
        if sw:
            L.append('')
            L.append(f'✂ **คำย่อยที่พี่กันตัดจากบทนี้ ({len(sw)} คำ)**')
            for s in sw:
                paths = ' · '.join(f'{cname(q["category_id"])} → `{q["path"]}`'
                                   for q in s['all_paths'])
                tag = '' if s['origin'] == 'extract' else f' _(มีเป็นบรรทัดเดี่ยวในคลังอยู่แล้ว บรรทัด {s["line"]})_'
                L.append(f'- **{s["text"]}**{tag} — {paths}')
        if w.get('reason'):
            L.append('')
            L.append(f'🗨 _{w["reason"]}_')
        L.append('')

    open(p('docs/archive/newwords-round/newwords-review-narration.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    return len(passages)


# ─────────────────────────────────────────────
# 2. กิ่งใหม่ในหมวดเดิม พร้อมคำจริงและเหตุผล
# ─────────────────────────────────────────────
def branches():
    OLD_CATS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c9', 'c10']
    words_at = collections.defaultdict(list)
    for w in W:
        for q in w['all_paths']:
            words_at[(q['category_id'], q['path'])].append(w)

    new = [b for b in D['branches'] if b['is_new'] and b['category_id'] in OLD_CATS]
    new.sort(key=lambda b: (CATS[b['category_id']]['no'], b['path']))

    L = ['# 🌿 กิ่งใหม่ที่เพิ่มเข้าหมวดเดิม — ลิสต์ให้พี่กันเคาะ',
         '',
         f'> ทั้งหมด **{len(new)} กิ่ง** (รวมกิ่งที่เสนอไว้รอบก่อน กับกิ่งที่โผล่ตอนจัดคำจริงเข้าด้วยกันแล้ว)',
         '> พี่กันสั่ง: _"48 กิ่งที่เสนอรอบก่อน กับ 16 กิ่งที่โผล่เพิ่ม เอามารวมกันที เราขออ่านซ้ำ '
         'และขอทั้งวลีนั้น กิ่ง หมวด และเหตุผล เราจะอ่าน เพราะข้อ 4 เธอเอามาแค่ชื่อกิ่ง แต่ไม่มีคำ '
         'เราเลยตัดสินใจไม่ได้"_',
         '>',
         '> **ตอบเป็นเลขข้อได้เลย** เช่น "ไม่เอา 7 15" หรือ "เอาหมด"',
         '>',
         '> 🚫 กิ่งของหมวดใหม่ 12/13/14/15 ไม่ได้อยู่ในลิสต์นี้ — อ่านได้ในไฟล์ร่างของแต่ละหมวด',
         '']

    bycat = collections.Counter(b['category_id'] for b in new)
    L += ['## กิ่งใหม่ต่อหมวด', '', '| หมวด | กิ่งใหม่ |', '|---|---|']
    for cid in OLD_CATS:
        if bycat[cid]:
            L.append(f'| {cname(cid)} | {bycat[cid]} |')
    L += ['', '---', '']

    i = 0
    cur = None
    for b in new:
        if b['category_id'] != cur:
            cur = b['category_id']
            L.append(f'\n## {cname(cur)}\n')
        i += 1
        ws = words_at[(b['category_id'], b['path'])]
        parent = b['path'].rsplit(' / ', 1)[0] if ' / ' in b['path'] else '(กิ่งหลักใหม่)'
        name = b['path'].split(' / ')[-1]
        L.append(f'### {i}. {name} ({b["en"]})')
        L.append('')
        L.append(f'- **อยู่ใต้:** {parent}')
        L.append(f'- **นิยาม:** {b["definition"]}')
        L.append(f'- **คำที่ลงกิ่งนี้:** {len(ws)} คำ')
        if b.get('why'):
            L.append(f'- **ทำไมของเดิมรับไม่ได้:** {b["why"]}')
        L.append('')
        if ws:
            L.append('| คำ / วลี | กิ่งอื่นที่คำนี้ติดด้วย | เหตุผลที่ตัวจัดคำเขียนไว้ |')
            L.append('|---|---|---|')
            for w in ws:
                others = [q['path'] for q in w['all_paths']
                          if not (q['category_id'] == b['category_id'] and q['path'] == b['path'])]
                oth = ' · '.join(others) if others else '—'
                rsn = (w.get('reason') or '—').replace('|', '/')
                txt = w['text'].replace('|', '/')
                L.append(f'| {txt} | {oth} | {rsn} |')
        else:
            L.append('⚠️ **กิ่งนี้ยังไม่มีคำมาลง** (ตั้งเผื่อไว้)')
        L.append('')

    open(p('docs/archive/newwords-round/newwords-review-branches.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    return len(new)


if __name__ == '__main__':
    a = narration()
    b = branches()
    print(f'บทบรรยาย {a} บท → docs/archive/newwords-round/newwords-review-narration.md')
    print(f'กิ่งใหม่ในหมวดเดิม {b} กิ่ง → docs/archive/newwords-round/newwords-review-branches.md')
