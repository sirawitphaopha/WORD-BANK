#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ประกอบผลการจัดคำของ "คลังคำชุดใหม่" → docs/newwords-branches.json + docs/newwords-branches.md

🚨 คลังชุดนี้ **แยกจากคลังเดิม 680 คำ** เด็ดขาด (พี่กันสั่ง 25 ก.ค. 2569)
   - อ่านโครงกิ่งเดิมจาก docs/branches-data.json แบบ "อ่านอย่างเดียว" ไว้เป็นฐานเทียบ
   - **ไม่เขียนทับไฟล์ของคลังเดิมสักไฟล์**

ที่มาของข้อมูล
   - docs/newwords-clean.txt   วลีดิบ 1,329 บรรทัด (คำต้นฉบับ ห้ามแก้ ห้ามยุบ)
   - docs/newwords-picked.md   คำที่พี่กันคัดด้วยเครื่องมือลากนิ้ว 675 แถว
   - ผลการจัดกิ่ง (ไฟล์ jsonl ที่ตัวจัดคำเขียนไว้) + กิ่งใหม่ที่เสนอ

วิธีใช้
   python3 scripts/gen_newwords_branches.py <โฟลเดอร์ที่เก็บ out*.jsonl>
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1] if len(sys.argv) > 1 else '.'

def p(*a): return os.path.join(ROOT, *a)


# ─────────────────────────────────────────────
# 1. อ่านของตั้งต้น
# ─────────────────────────────────────────────
def load_sources():
    raw = []
    for i, line in enumerate(open(p('docs/newwords-clean.txt'), encoding='utf-8'), 1):
        t = line.strip()
        if t:
            raw.append({'text': t, 'line': i})

    picked = []
    for line in open(p('docs/newwords-picked.md'), encoding='utf-8'):
        m = re.match(r'^\|\s*(\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|'
                     r'\s*(ระบบเสนอ|สกัดเอง)\s*\|\s*(.*?)\s*\|$', line.strip())
        if m:
            picked.append({'text': m.group(2).strip(), 'source': m.group(3).strip(),
                           'line': int(m.group(4)), 'origin': m.group(5),
                           'note': m.group(6).strip()})
    return raw, picked


def build_items(raw, picked):
    """รวมวลีดิบ + คำที่คัด แล้วยุบคำซ้ำ (พี่กันสั่ง: คำสกัดที่ซ้ำซ้อนให้ลบออก)

    🚨 ยุบได้เฉพาะ "คำสกัด" — วลีดิบ 1,329 บรรทัดห้ามยุบเด็ดขาด (คำต้นฉบับห้ามหาย)
    """
    items, seen = [], {}
    for r in raw:
        if r['text'] in seen:
            continue
        seen[r['text']] = len(items)
        items.append({'text': r['text'], 'line': r['line'], 'origin': 'raw',
                      'source': None, 'source_others': [], 'by_owner': False, 'note': ''})

    for q in picked:
        t = q['text']
        if t in seen:                                   # ซ้ำ → ยุบเข้าแถวเดิม
            it = items[seen[t]]
            if it['origin'] == 'extract' and q['source'] != it['source'] \
               and q['source'] not in it['source_others']:
                it['source_others'].append(q['source'])
            if q['note'] and q['note'] not in it['note']:
                it['note'] = (it['note'] + ' · ' + q['note']).strip(' ·')
            continue
        seen[t] = len(items)
        items.append({'text': t, 'line': q['line'], 'origin': 'extract',
                      'source': q['source'], 'source_others': [],
                      # คำที่พี่กันคิดขึ้นเองตอนคัด (ไม่ได้เป็นข้อความส่วนหนึ่งของวลีตั้งต้น)
                      # พี่กันสั่งให้เก็บด้วย ห้ามตัดทิ้ง
                      'by_owner': t not in q['source'], 'note': q['note']})
    return items


def load_base():
    """ฐานกิ่ง = กิ่งเดิมจากคลังเก่า + กิ่งใหม่ที่ตั้งไว้ก่อนจัดคำ"""
    old = json.load(open(p('docs/branches-data.json'), encoding='utf-8'))
    sys.path.insert(0, WORK)
    from newbranches import NEW_CATEGORIES, NEW_BRANCHES          # noqa: E402
    cats = {c['id']: dict(c) for c in old['categories']}
    for c in NEW_CATEGORIES:
        cats[c['id']] = dict(c)
    br = {}
    for b in old['branches']:
        br[(b['category_id'], b['path'])] = {'category_id': b['category_id'], 'path': b['path'],
                                             'en': b['en'], 'definition': b['definition'],
                                             'is_new': False}
    for cid, path, en, df in NEW_BRANCHES:
        br.setdefault((cid, path), {'category_id': cid, 'path': path, 'en': en,
                                    'definition': df, 'is_new': True})
    return cats, br


def load_assignments():
    rows = {}
    for k in range(1, 6):
        f = os.path.join(WORK, f'out{k}.jsonl')
        if not os.path.exists(f):
            continue
        for line in open(f, encoding='utf-8'):
            line = line.strip().rstrip(',')
            if not line or line[0] != '{':
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            if 'i' in d:
                rows[int(d['i'])] = d
    extra = []
    for k in range(1, 6):
        f = os.path.join(WORK, f'newbr{k}.json')
        if os.path.exists(f):
            try:
                extra += json.load(open(f, encoding='utf-8'))
            except json.JSONDecodeError:
                pass
    return rows, extra


# ─────────────────────────────────────────────
# 2. ประกอบ + ตรวจ
# ─────────────────────────────────────────────
def main():
    raw, picked = load_sources()
    items = build_items(raw, picked)
    cats, base = load_base()
    rows, extra = load_assignments()

    report = collections.OrderedDict()
    report['วลีดิบ'] = len(raw)
    report['แถวคำที่พี่กันคัด'] = len(picked)
    report['ชิ้นหลังยุบซ้ำ'] = len(items)
    report['ชิ้นที่ตัวจัดคำส่งกลับ'] = len(rows)

    # กิ่งใหม่ที่ตัวจัดคำเสนอเพิ่ม
    for e in extra:
        key = (e.get('c'), e.get('p'))
        if key[0] and key[1] and key not in base:
            base[key] = {'category_id': e['c'], 'path': e['p'], 'en': e.get('en', ''),
                         'definition': e.get('def', ''), 'is_new': True,
                         'why': e.get('why', '')}

    words, problems = [], collections.defaultdict(list)
    for idx, it in enumerate(items):
        d = rows.get(idx)
        if not d:
            problems['ไม่มีผลการจัดกิ่ง'].append(it['text'])
            continue
        if d.get('text', '').strip() != it['text']:
            # ตัวจัดคำแก้ข้อความ = ห้ามเด็ดขาด ใช้ข้อความต้นฉบับเสมอ
            problems['ข้อความไม่ตรงต้นฉบับ'].append((it['text'], d.get('text')))

        paths, seen_p = [], set()
        for q in d.get('paths', []):
            cid, path = q.get('c'), (q.get('p') or '').strip()
            if not cid or not path or cid not in cats:
                problems['กิ่งไม่ถูกต้อง'].append((it['text'], cid, path))
                continue
            if (cid, path) not in base:
                problems['กิ่งลอย (ไม่มีในฐาน)'].append((it['text'], cid, path))
                continue
            if path.count(' / ') > 2:
                problems['ลึกเกิน 3 ชั้น'].append((it['text'], path))
                continue
            k = cid + '|' + path
            if k not in seen_p:
                seen_p.add(k)
                paths.append({'category_id': cid, 'path': path})
        if not paths:
            problems['ไม่มีกิ่งที่ใช้ได้'].append(it['text'])
            continue

        kind = d.get('kind') if d.get('kind') in ('word', 'phrase', 'sentence') else 'phrase'
        loan = d.get('loanword_en') or None
        if any(x['category_id'] == 'c6' for x in paths) and not loan:
            problems['คำทับศัพท์ไม่มีคำอังกฤษ'].append(it['text'])

        words.append({
            'text': it['text'], 'kind': kind,
            'category_id': paths[0]['category_id'],
            'subpath': paths[0]['path'],
            'subpaths': [x['path'] for x in paths],
            'all_paths': paths,
            'meaning': (d.get('meaning') or None),
            'reason': (d.get('reason') or None),
            'source': it['source'], 'source_others': it['source_others'],
            'by_owner': it['by_owner'], 'loanword_en': loan,
            'origin': it['origin'], 'line': it['line'],
            'owner_note': it['note'] or None,
        })

    report['คำที่ผ่านเข้าไฟล์'] = len(words)
    report['กิ่งทั้งหมดในฐาน'] = len(base)
    report['กิ่งใหม่'] = sum(1 for b in base.values() if b['is_new'])

    # กิ่งที่มีคำจริง
    used = collections.Counter()
    for w in words:
        for q in w['all_paths']:
            used[(q['category_id'], q['path'])] += 1
    report['กิ่งที่มีคำลงจริง'] = len(used)

    out = {
        'meta': {
            'source': ['docs/newwords-clean.txt', 'docs/newwords-picked.md'],
            'status': 'draft — ยังไม่อัป Supabase',
            'note': 'คลังคำชุดใหม่ (นิยายสืบสวน) แยกจาก docs/branches-data.json ของคลังเดิม 680 คำ '
                    'ยังไม่รวมกับ docs/branches-clean.md จนกว่าพี่กันจะอ่านกิ่งใหม่แล้วเคาะ',
            'category_code': 'หมวด N = c(N-1) · หมวด 10=c9 · 11=c10 · 12=c11 · 13=c12 · 14=c13 · 15=c14',
            'counts': dict(report),
        },
        'categories': sorted(cats.values(), key=lambda c: c['no']),
        'branches': [dict(b, word_count=used.get((b['category_id'], b['path']), 0))
                     for b in sorted(base.values(), key=lambda b: (b['category_id'], b['path']))],
        'words': words,
    }
    json.dump(out, open(p('docs/newwords-branches.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    write_md(out, used)

    print('=== สรุป ===')
    for k, v in report.items():
        print(f'  {k:<28} {v}')
    if problems:
        print('\n=== จุดที่ต้องดู ===')
        for k, v in problems.items():
            print(f'  {k}: {len(v)}')
            for x in v[:5]:
                print('     ', x)
    json.dump({k: v for k, v in problems.items()},
              open(os.path.join(WORK, 'problems.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


# ─────────────────────────────────────────────
# 3. ไฟล์ฉบับคนอ่าน
# ─────────────────────────────────────────────
def write_md(out, used):
    cats = {c['id']: c for c in out['categories']}
    bycat = collections.defaultdict(list)
    for b in out['branches']:
        bycat[b['category_id']].append(b)
    words_at = collections.defaultdict(list)
    for w in out['words']:
        for q in w['all_paths']:
            words_at[(q['category_id'], q['path'])].append(w)

    L = ['# คลังคำชุดใหม่ — กิ่งและคำ',
         '',
         '> 🚨 **ไฟล์นี้เป็นของ "คลังคำชุดใหม่" (เก็บจากนิยายสืบสวน) แยกจากคลังเดิม 680 คำเด็ดขาด**',
         '> ยังไม่รวมกับ `docs/branches-clean.md` จนกว่าพี่กันจะอ่านกิ่งใหม่แล้วเคาะ',
         '> สร้างอัตโนมัติจาก `scripts/gen_newwords_branches.py` — **อย่าแก้ด้วยมือ**',
         '',
         '**คำเรียกชั้น:** หมวด → กิ่งหลัก 🌲 → กิ่งย่อย 🌿 → กิ่งแขนง 🍃 → คำ',
         '**ป้าย:** 🆕 กิ่งใหม่ · ⚡ คำติดหลายกิ่ง · ✍️ คำที่พี่กันคิดขึ้นเอง · ✂ คำที่สกัดจากวลียาว',
         '']

    c = out['meta']['counts']
    L += ['## 📊 สรุปตัวเลข', '', '| รายการ | จำนวน |', '|---|---|']
    for k, v in c.items():
        L.append(f'| {k} | {v} |')
    L.append('')

    L += ['### คำต่อหมวด', '', '| หมวด | ชื่อ | กิ่งทั้งหมด | กิ่งที่มีคำ | จำนวนคำ |', '|---|---|---|---|---|']
    for cat in out['categories']:
        n = sum(len(words_at[(cat['id'], b['path'])]) for b in bycat[cat['id']])
        hasw = sum(1 for b in bycat[cat['id']] if words_at[(cat['id'], b['path'])])
        L.append(f"| {cat['no']} | {cat['name_th']} | {len(bycat[cat['id']])} | {hasw} | {n} |")
    L += ['', '---', '']

    for cat in out['categories']:
        L.append(f"\n## หมวด {cat['no']} · {cat['name_th']} ({cat['name_en']})")
        L.append(f"> _{cat['definition']}_\n")
        for b in bycat[cat['id']]:
            depth = b['path'].count(' / ')
            icon = ['🌲', '🌿', '🍃'][depth]
            name = b['path'].split(' / ')[-1]
            tag = ' 🆕' if b['is_new'] else ''
            L.append(f"{'  ' * depth}- {icon} **{name}** ({b['en']}){tag} — _{b['definition']}_")
            ws = words_at[(cat['id'], b['path'])]
            if ws:
                chips = []
                for w in ws:
                    s = w['text']
                    if w.get('loanword_en'):
                        s += f" = {w['loanword_en']}"
                    if w['by_owner']:
                        s += ' ✍️'
                    elif w['origin'] == 'extract':
                        s += ' ✂'
                    if len(w['subpaths']) > 1:
                        s += ' ⚡'
                    chips.append(s)
                L.append(f"{'  ' * depth}  · " + ' · '.join(chips))
        L.append('')

    open(p('docs/newwords-branches.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
