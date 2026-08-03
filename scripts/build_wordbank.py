#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างโฟลเดอร์ `wordbank/` — คลังคำฉบับพร้อมขึ้นฐานข้อมูล

เจ้าของคลังสั่งเอง 3 ส.ค. 2569 หลังพบว่างานที่สั่งไปทั้งหมดไม่เคยถูกเอาลงของจริง

    _"เราให้เธอเตรียมมมมมม ไฟล์ที่จะเอาเข้าโดยไม่ตกหล่น
      ส่วน sql ค่อยจัดการให้เราตอนเราบอกเอาเข้า supabase"_

    _"มันคือจุดหมายปลายทางของสองคลังที่เราทำกันมาเป็นอาทิตย์
      ที่พร้อมเอาเข้าเว็บและ supabase และพร้อมที่จะแก้ไขได้
      โดยที่เธอไม่ต้องไปเปิด doc เก่า ๆ เป็นล้าน"_

## รับของมาจากไหน

| แหล่ง | เอาอะไรมา |
|---|---|
| `docs/m2-sense/round2/result.json` | **ผลทบทวนทั้งคลัง 2,814 รายการ** — ความหมายทุกคำ + กิ่งที่แก้แล้ว |
| `docs/branches-data.json` | โครงกิ่ง 804 กิ่ง พร้อมรหัสถาวรและนิยาม |
| `docs/branch-codes.json` | ทะเบียนรหัสกิ่ง + รหัสที่ปลดระวาง |
| `scripts/spellfix.py` | ทะเบียนคำที่แก้สะกดหลังลงคลังไปแล้ว |
| `scripts/002_seed.sql` | สี · สัญลักษณ์ · ลำดับ ของหมวดเดิม |

🔑 **ผลทบทวนคือฐานหลัก ไม่ใช่ของแถม** — 3,713 ช่องความหมายกับกิ่งที่แก้แล้วทุกเส้น
   เคยนอนอยู่ในไฟล์ผลลัพธ์เฉย ๆ ไม่เคยเข้าคลัง (ทะเบียนผิดกฎครั้งที่ 21)
   ไฟล์ในโฟลเดอร์นี้คือที่ที่มันลงจริง

## รูปแบบที่เขียนออก — JSONL หนึ่งไฟล์ต่อหนึ่งตาราง
บรรทัดละหนึ่งแถว แก้ทีละบรรทัดได้โดยไม่ต้องอ่านทั้งไฟล์
และนำเข้าฐานข้อมูลได้ตรง ๆ โดยไม่ต้องแปลงรูปอีก

ใช้:  python3 scripts/build_wordbank.py
"""
import json, os, re, sys, hashlib, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from spellfix import SPELLFIX, CONFIRMED_OK, fix                   # noqa: E402
# 🔑 คำสั่ง 24 ข้อที่เจ้าของคลังเคาะเมื่อ 3 ส.ค. — ยกตารางมาใช้ตรง ๆ ไม่เขียนซ้ำ
#    (บทเรียนของโปรเจกต์: กฎที่เขียนไว้หลายที่ = ตกหล่นแน่นอน)
from apply_decisions_20260803 import (                              # noqa: E402
    PATH_RENAME, DROP, ADD, MEANING, MEANING_APPEND)

P = lambda *a: os.path.join(ROOT, *a)
OUT = P('wordbank')

NOVEL_OLD = 'เสียงกระซิบจากความมืด'
NOVEL_NEW = 'คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ'

# คำปลอมที่ลบทิ้งแล้ว (ข้อ 6.7 ที่เจ้าของคลังเคาะ) — เกิดจากแคลร์เขียนย่อด้วย ฯ เอง
# แล้วตัวสร้างไฟล์อ่านเป็นคำใหม่ · กิ่งของมันถูกโอนไปให้วลีต้นฉบับแล้ว
FAKE_WORDS = {'ลำแสงสีขาววาววับราวดาบคมกริบฯ'}

# สี · สัญลักษณ์ ของหมวด — 9 หมวดแรกยกมาจาก scripts/002_seed.sql ตรง ๆ
# หมวด 10 ขึ้นไปเป็นหมวดที่ตั้งใหม่ระหว่างเกลาคลัง ยังไม่เคยมีสีในฐานข้อมูล
# เลือกให้เข้าธีมกระดาษวรรณกรรม และไม่ชนกับสีเดิม
CAT_STYLE = {
    'c0':  ('#5f7f92', '๑'),   'c1':  ('#a86a79', '๒'),   'c2':  ('#6f8a56', '๓'),
    'c3':  ('#bd8a3c', '๔'),   'c4':  ('#b0563f', '๕'),   'c5':  ('#7c6a99', '๖'),
    'c6':  ('#3f7d6c', '๗'),   'c7':  ('#9a7636', '๘'),   'c8':  ('#8a8175', '๙'),
    'c9':  ('#8b6f47', '๑๐'),  'c10': ('#a0894a', '๑๑'),  'c11': ('#6b5b95', '๑๒'),
    'c12': ('#4a7a8c', '๑๓'),  'c13': ('#7d6b5d', '๑๔'),  'c14': ('#96745c', '๑๕'),
}

# หมวด 9 ยังไม่ได้เกลา จึงไม่มีในไฟล์โครงกิ่ง แต่มีอยู่ในฐานข้อมูลจริง
# เก็บไว้ในทะเบียนหมวดเพื่อไม่ให้แถวเก่าในฐานข้อมูลกลายเป็นหมวดลอย
CAT_EXTRA = {'id': 'c8', 'no': 9, 'name_th': 'อื่น ๆ', 'name_en': 'Misc',
             'note': 'ยังไม่ได้เกลาโครงกิ่ง · ไม่มีคำในรอบนี้'}


def wid(text):
    """รหัสประจำคำ — คำนวณจากตัวข้อความล้วน

    🔑 ห้ามใช้เลขลำดับเด็ดขาด · ไฟล์ต้นทางถูกสร้างใหม่ทุกครั้งที่รันตัวสร้าง
       ลำดับเลื่อนเมื่อไหร่ เส้นเชื่อมทุกเส้นจะไปเกาะผิดคำ
       (โปรเจกต์นี้เจ็บมาแล้ว 2 รอบ — `wid` รอบเกลาคลังเดิม และ `picked_from`)
    """
    return 'w' + hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]


def jsonl(name, rows):
    p = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    return len(rows)


def lv(path):
    """ใส่เลขชั้นในวงเล็บทุกชั้น — กฎที่เจ้าของคลังตั้งไว้ 27 ก.ค."""
    return '/'.join('%s(%d)' % (s, i + 1) for i, s in enumerate(path.split(' / ')))


def branches_assistants_saw(allpaths):
    """กิ่งที่ผู้ช่วยรอบทบทวน **เคยเห็นในโจทย์** — ใช้แยกว่าเส้นไหนเชื่อผลทบทวนได้

    🔴 นี่คือรูรั่วที่จับได้ 3 ส.ค. และเป็นเหตุผลที่ฟังก์ชันนี้มีอยู่
       รอบทบทวนรันก่อนที่จะมีการซอยกิ่งเพิ่มอีกหลายรอบ
       ผู้ช่วยจึงไม่มีทางเลือกกิ่งที่เพิ่งเปิดทีหลังได้เลยแม้แต่กิ่งเดียว
       ถ้าเชื่อผลทบทวน 100% คำที่เจ้าของคลังจัดลงกิ่งใหม่ไว้แล้วจะหายเกลี้ยง
       (เจอจริง 21 เส้น เช่นกิ่ง *การพูดพร่ำและย้ำซ้ำ* ที่มีคำอยู่ 8 คำ แล้วเหลือ 0)

    ✅ กติกาที่ใช้ตัดสิน
       · กิ่งที่อยู่ในโจทย์  → เชื่อผลทบทวน (ผู้ช่วยชั่งน้ำหนักแล้ว จะเลือกหรือไม่เลือกก็ตาม)
         ตรงกับกฎข้อ ๔ ที่เจ้าของคลังตั้งเอง — _"ต้องลดสิก็ทำผิดมา"_
       · กิ่งที่ไม่เคยอยู่ในโจทย์ → ผู้ช่วยตัดสินไม่ได้ ต้องยกเส้นจากไฟล์คลังจริงมาเติม
    """
    txt = open(P('docs/m2-sense/round2/BRANCHES.md'), encoding='utf-8').read()
    back = {v: k for k, v in PATH_RENAME.items()}      # ชื่อใหม่ → ชื่อตอนอยู่ในโจทย์
    seen = set()
    for p in allpaths:
        q = back.get(p, p)
        if q.split(' / ')[-1] in txt:
            seen.add(p)
    return seen


# ══════════════════════════════════════════════════════════════════════
def main():
    src = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    rev = json.load(open(P('docs/m2-sense/round2/result.json'), encoding='utf-8'))
    codes = json.load(open(P('docs/branch-codes.json'), encoding='utf-8'))

    cats = {c['id']: c for c in src['categories']}
    bmap = {(b['category_id'], b['path']): b for b in src['branches']}

    # ── รวมแถวผลทบทวนเข้าเป็นคำ โดยยึด "ตัวข้อความ" เป็นกุญแจ ────────────
    # คำเดียวกันที่เจอสองเล่ม = สองแถวในผลทบทวน → ยุบเป็นคำเดียว เก็บชื่อเรื่องทั้งสอง
    # (กฎที่เจ้าของคลังเคาะเรื่อง `ผมเผ้า` — โยง ไม่ใช่ลบ)
    W = collections.OrderedDict()
    dropped_fake = 0
    for r in rev['words']:
        raw = r['text']
        if raw in FAKE_WORDS:
            dropped_fake += 1
            continue
        t = fix(raw)                       # แมปรูปคำเก่าในไฟล์ประวัติ → รูปที่ใช้จริงตอนนี้
        w = W.setdefault(t, {
            'text': t, 'original_text': None, 'kind': None, 'novels': [],
            'links': [], 'meanings': [], 'sources': [], 'picked_from': [],
            'loanword_en': None, 'by_owner': False, 'origin': None,
            'suspect': [], 'added': [], 'dropped': [],
        })
        if t != raw and not w['original_text']:
            w['original_text'] = raw       # เก็บรูปเดิมไว้เป็นหลักฐานว่าเคยสะกดแบบไหน
        nv = r.get('novel') or (NOVEL_OLD if r.get('bank') == 'old' else NOVEL_NEW)
        if nv not in w['novels']:
            w['novels'].append(nv)
        for p in r['all_paths']:
            key = (p['category_id'], p['path'])
            if key not in bmap:
                raise SystemExit('🔴 กิ่งลอย: %s / %s' % key)
            if key not in [(l['category_id'], l['path']) for l in w['links']]:
                w['links'].append({'code': bmap[key]['code'],
                                   'category_id': p['category_id'],
                                   'path': p['path']})
        for m in (r.get('meanings') or []):
            if m and m not in w['meanings']:
                w['meanings'].append(m)
        for k, dst in (('source', 'sources'), ('source_others', 'sources'),
                       ('picked_from', 'picked_from')):
            v = r.get(k)
            for x in ([v] if isinstance(v, str) else (v or [])):
                x = fix(x)
                if x and x not in w[dst]:
                    w[dst].append(x)
        for k in ('kind', 'loanword_en', 'origin'):
            if r.get(k) and not w[k]:
                w[k] = r[k]
        if r.get('by_owner'):
            w['by_owner'] = True
        if r.get('suspect'):
            s = r['suspect']
            w['suspect'] += (s if isinstance(s, list) else [s])
        w['added'] += r.get('paths_added_this_round') or []
        w['dropped'] += r.get('paths_dropped_this_round') or []

    # ── ประสานฝั่งที่ผลทบทวนตัดสินไม่ได้ ─────────────────────────────
    filled = merge_new_branches(W, bmap)
    # ── แล้วทับด้วยคำสั่ง 24 ข้อที่เจ้าของคลังเคาะเอง (มาทีหลังสุด ชนะทุกอย่าง) ──
    orders = apply_orders(W, bmap)

    for w in W.values():
        if not w['links']:
            raise SystemExit('🔴 คำไม่มีกิ่ง: %s' % w['text'])

    # ── ตาราง 1 · หมวด ───────────────────────────────────────────────
    used = {l['category_id'] for w in W.values() for l in w['links']}
    crows = []
    for c in sorted(src['categories'], key=lambda x: x['no']):
        col, gly = CAT_STYLE[c['id']]
        crows.append({'id': c['id'], 'no': c['no'], 'name_th': c['name_th'],
                      'name_en': c.get('name_en'), 'color': col, 'glyph': gly,
                      'position': c['no'] - 1, 'proposed': False,
                      'word_count': sum(1 for w in W.values()
                                        if any(l['category_id'] == c['id'] for l in w['links']))})
    e = dict(CAT_EXTRA)
    col, gly = CAT_STYLE[e['id']]
    crows.append({'id': e['id'], 'no': e['no'], 'name_th': e['name_th'],
                  'name_en': e['name_en'], 'color': col, 'glyph': gly,
                  'position': e['no'] - 1, 'proposed': False, 'word_count': 0,
                  'note': e['note']})
    crows.sort(key=lambda r: r['no'])

    # ── ตาราง 2 · กิ่ง ────────────────────────────────────────────────
    incount = collections.Counter()
    for w in W.values():
        for l in w['links']:
            incount[l['code']] += 1
    brows = [{'code': b['code'], 'category_id': b['category_id'], 'path': b['path'],
              'level': b['path'].count(' / ') + 1, 'name_en': b.get('en'),
              'definition': b.get('definition'), 'source': 'groomed',
              'word_count': incount[b['code']]}
             for b in src['branches']]

    # ── ตาราง 3 · นิยาย ───────────────────────────────────────────────
    nrows = [{'title': n, 'word_count': sum(1 for w in W.values() if n in w['novels'])}
             for n in (NOVEL_OLD, NOVEL_NEW)]

    # ── ตาราง 4 · คำ ─────────────────────────────────────────────────
    # ช่องบนสุดตรงกับคอลัมน์ของ wb_words ทุกช่อง — นำเข้าได้ทันที
    wrows = []
    for w in W.values():
        home = w['links'][0]['category_id']
        same = [l['path'] for l in w['links'] if l['category_id'] == home]
        sub = same or [w['links'][0]['path']]
        wrows.append({
            'id': wid(w['text']),
            'text': w['text'],
            'original_text': w['original_text'],
            'meaning': ' · '.join(w['meanings']) or None,
            'category_id': home,
            'kind': w['kind'] or 'phrase',
            'subcategory': sub[0].split(' / ')[0],
            'subpath': sub[0],
            'subpaths': sub,
            'highlight': None,
            'novel': w['novels'][0],
            'reviewed': True,
            'reason': None,
            # ── ช่องเสริม ยังไม่มีคอลัมน์รองรับ รอ scripts/014_word_web.sql ──
            'x_novels': w['novels'],
            'x_branch_codes': [l['code'] for l in w['links']],
            'x_meanings': w['meanings'],
            'x_loanword_en': w['loanword_en'],
            'x_by_owner': w['by_owner'],
            'x_origin': w['origin'],
        })

    # ── ตาราง 5–7 · เส้นเชื่อม (ระบบใยแมงมุม) ────────────────────────
    wb, wn, ws = [], [], []
    for w in W.values():
        i = wid(w['text'])
        for k, l in enumerate(w['links']):
            wb.append({'word_id': i, 'word_text': w['text'], 'branch_code': l['code'],
                       'category_id': l['category_id'], 'path': l['path'],
                       'is_home': k == 0})
        for n in w['novels']:
            wn.append({'word_id': i, 'word_text': w['text'], 'novel': n})
        for kind, arr in (('source', w['sources']), ('picked_from', w['picked_from'])):
            for pt in arr:
                ws.append({'word_id': i, 'word_text': w['text'], 'parent_text': pt,
                           'parent_id': wid(pt) if pt in W else None, 'link_kind': kind})

    # ── ตาราง 8 · ความหมายแยกรายการ ──────────────────────────────────
    wm = [{'word_id': wid(w['text']), 'word_text': w['text'], 'position': k, 'meaning': m}
          for w in W.values() for k, m in enumerate(w['meanings'])]

    n = {
        'categories':    jsonl('data/categories.jsonl', crows),
        'branches':      jsonl('data/branches.jsonl', brows),
        'novels':        jsonl('data/novels.jsonl', nrows),
        'words':         jsonl('data/words.jsonl', wrows),
        'word_branches': jsonl('data/word_branches.jsonl', wb),
        'word_novels':   jsonl('data/word_novels.jsonl', wn),
        'word_sources':  jsonl('data/word_sources.jsonl', ws),
        'word_meanings': jsonl('data/word_meanings.jsonl', wm),
    }

    # ── ทะเบียนที่ต้องขนมาด้วย ────────────────────────────────────────
    os.makedirs(os.path.join(OUT, 'registry'), exist_ok=True)
    json.dump(codes, open(os.path.join(OUT, 'registry/branch-codes.json'), 'w',
                          encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'note': 'คำที่แก้สะกดหลังลงคลังแล้ว · แหล่งจริงคือ scripts/spellfix.py',
               'map': SPELLFIX},
              open(os.path.join(OUT, 'registry/spellfix.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    stats = {
        'คำไม่ซ้ำ': len(wrows),
        'เส้นเชื่อมคำ-กิ่ง': len(wb),
        'ช่องความหมาย': len(wm),
        'คำที่ไม่มีความหมาย': sum(1 for r in wrows if not r['meaning']),
        'คำที่ไม่มีกิ่ง': 0,
        'คำที่เจอทั้งสองเล่ม': sum(1 for w in W.values() if len(w['novels']) > 1),
        'คำที่ติดกิ่งข้ามหมวด': sum(1 for w in W.values()
                                   if len({l['category_id'] for l in w['links']}) > 1),
        'คำที่ตัดมาจากวลีแม่': sum(1 for w in W.values() if w['sources'] or w['picked_from']),
        'เส้นเชื่อมไปวลีแม่': len(ws),
        'กิ่งทั้งหมด': len(brows),
        'กิ่งที่มีคำ': sum(1 for b in brows if b['word_count']),
        'หมวด': len(crows),
    }
    json.dump({'stats': stats, 'rows': n,
               'เล่ม': [NOVEL_OLD, NOVEL_NEW],
               'คำปลอมที่ตัดออก': dropped_fake,
               'เส้นที่เติมเพราะกิ่งเปิดหลังรอบทบทวน': len(filled),
               'คำสั่งที่เจ้าของคลังเคาะแล้วลงจริง': len(orders),
               'สร้างโดย': 'scripts/build_wordbank.py'},
              open(os.path.join(OUT, 'data/_stats.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    write_report(W, cats, bmap, stats, n, filled, orders)
    write_tree(crows, brows, stats)

    for k, v in stats.items():
        print('  %-24s %s' % (k, v))
    print('\nเขียน wordbank/ แล้ว — %d ไฟล์ข้อมูล' % len(n))
    return W, stats


# ══════════════════════════════════════════════════════════════════════
def merge_new_branches(W, bmap):
    """เติมเส้นที่ชี้ไปกิ่งซึ่งเปิดขึ้นหลังรอบทบทวน — ผู้ช่วยไม่มีทางเลือกได้"""
    allp = {p for (_c, p) in bmap}
    seen = branches_assistants_saw(allp)
    fresh = allp - seen
    kids = {p: any(q.startswith(p + ' / ') for q in allp) for p in allp}

    src = []
    for f, novel in ((P('docs/oldwords-branches.json'), NOVEL_OLD),
                     (P('docs/newwords-branches.json'), NOVEL_NEW)):
        src += [(w, novel) for w in json.load(open(f, encoding='utf-8'))['words']]

    added = []
    for w, novel in src:
        t = fix(w['text'])
        if t not in W:
            continue
        rec = W[t]
        have = {(l['category_id'], l['path']) for l in rec['links']}
        for k in ('subpaths', 'all_paths', 'subpath'):
            v = w.get(k)
            for p in ([v] if isinstance(v, str) else (v or [])):
                path = p['path'] if isinstance(p, dict) else p
                if not path or path not in fresh or kids.get(path):
                    continue                       # กิ่งเก่า หรือกิ่งแม่ที่มีลูก → ข้าม
                hit = [key for key in bmap if key[1] == path]
                if len(hit) != 1:
                    continue                       # ชื่อกิ่งซ้ำข้ามหมวด → ไม่เดา
                cid, _ = hit[0]
                if (cid, path) in have:
                    continue
                rec['links'].append({'code': bmap[(cid, path)]['code'],
                                     'category_id': cid, 'path': path})
                have.add((cid, path))
                added.append((t, path))
    return added


def apply_orders(W, bmap):
    """ลงคำสั่งที่เจ้าของคลังเคาะเอง — ทับทุกอย่าง เพราะเป็นคำตัดสินสุดท้าย

    ทำ **เพิ่มก่อนถอน** เสมอ · ถ้าถอนก่อน คำที่มีกิ่งเดียวจะเหลือศูนย์กิ่งกลางคัน
    แล้วด่านกันคำไร้กิ่งจะเด้งทั้งที่ไม่ได้ผิดอะไร (เคยเกิดจริงกับคำ `เครื่องเครา`)
    """
    log = []

    def rec(t):
        return W.get(fix(t))

    for no, t, paths in ADD:
        w = rec(t)
        if not w:
            continue
        have = {l['path'] for l in w['links']}
        for path in paths:
            if path in have:
                continue
            hit = [k for k in bmap if k[1] == path]
            if len(hit) != 1:
                raise SystemExit('🔴 ข้อ %s · กิ่งไม่ชัด: %s' % (no, path))
            cid, _ = hit[0]
            w['links'].append({'code': bmap[(cid, path)]['code'],
                               'category_id': cid, 'path': path})
            log.append((no, t, 'เพิ่มกิ่ง', path))

    for no, t, paths in DROP:
        w = rec(t)
        if not w:
            continue
        keep = [l for l in w['links'] if l['path'] not in paths]
        for l in w['links']:
            if l['path'] in paths:
                log.append((no, t, 'ถอนกิ่ง', l['path']))
        if not keep:
            raise SystemExit('🔴 ข้อ %s · ถอนแล้ว "%s" จะเหลือ 0 กิ่ง' % (no, t))
        w['links'] = keep

    for no, t, meanings in MEANING:
        w = rec(t)
        if w and w['meanings'] != meanings:
            log.append((no, t, 'แก้ความหมาย', ' · '.join(meanings)))
            w['meanings'] = list(meanings)

    for no, t, extra in MEANING_APPEND:
        w = rec(t)
        if w and not any(extra in m for m in w['meanings']):
            w['meanings'].append(extra)
            log.append((no, t, 'ต่อท้ายความหมาย', extra))
    return log


# ══════════════════════════════════════════════════════════════════════
def write_report(W, cats, bmap, stats, n, filled, orders):
    os.makedirs(os.path.join(OUT, 'report'), exist_ok=True)

    # ── คำสั่งที่เจ้าของคลังเคาะ ลงจริงแล้วกี่จุด ────────────────────
    L = ['# ✅ คำสั่งที่เจ้าของคลังเคาะ — ลงในข้อมูลจริงแล้ว', '',
         '> ไฟล์นี้มีไว้ตอบคำถามเดียว: **สิ่งที่สั่งไป ลงจริงหรือยัง**',
         '> รันตรวจซ้ำได้ทุกเมื่อด้วย `python3 wordbank/check.py`', '',
         '## ๑ · คำสั่ง 24 ข้อ (3 ส.ค. 2569)', '',
         '| ข้อ | คำ | ทำอะไร | กิ่ง / ความหมาย |', '|---|---|---|---|']
    for no, t, act, detail in orders:
        L.append('| %s | %s | %s | %s |' % (no, t, act, lv(detail) if ' / ' in detail else detail))
    if not orders:
        L.append('| — | — | ไม่มีอะไรต้องแก้เพิ่ม (ลงครบตั้งแต่ต้นทางแล้ว) | — |')

    L += ['', '---', '',
          '## ๒ · เส้นที่เติมกลับ เพราะกิ่งเปิดหลังรอบทบทวน — %d เส้น' % len(filled), '',
          'ผู้ช่วยรอบทบทวนเห็นรายนามกิ่งชุดหนึ่ง แล้วหลังจากนั้นมีการซอยกิ่งเพิ่มอีกหลายรอบ',
          '**กิ่งที่เปิดทีหลังจึงไม่เคยอยู่ในโจทย์เลย ผู้ช่วยไม่มีทางเลือกได้**',
          'เส้นพวกนี้ยกมาจากไฟล์คลังจริง ไม่ได้ขัดคำตัดสินของใคร', '']
    byb = collections.defaultdict(list)
    for t, p in filled:
        byb[p].append(t)
    if byb:
        L += ['| กิ่ง | คำที่กลับเข้ามา |', '|---|---|']
        for p, ts in sorted(byb.items(), key=lambda x: -len(x[1])):
            L.append('| %s | %s |' % (lv(p), ' · '.join(sorted(set(ts)))))
    open(os.path.join(OUT, 'report/orders-applied.md'), 'w',
         encoding='utf-8').write('\n'.join(L) + '\n')

    add = collections.Counter()
    drop = collections.Counter()
    for w in W.values():
        for p in w['added']:
            add[p if isinstance(p, str) else p.get('path')] += 1
        for p in w['dropped']:
            drop[p if isinstance(p, str) else p.get('path')] += 1

    L = ['# 🔄 รอบทบทวนเปลี่ยนอะไรไปบ้าง', '',
         '> ผลจากการทบทวนคลังทั้งก้อน 2,814 รายการ · เขียนลงคลังแล้วในโฟลเดอร์นี้', '',
         'ผู้ช่วยเห็นแค่ **ตัวคำ** ไม่เห็นวลีตั้งต้น ไม่เห็นกิ่งเดิม ไม่เห็นหมวดเดิม',
         'จึงตัดสินจากตัวคำล้วน ๆ ตามกฎดูที่ประธานที่เจ้าของคลังตั้งไว้', '',
         '| | |', '|---|---|',
         '| กิ่งที่เพิ่ม | %d เส้น |' % sum(add.values()),
         '| กิ่งที่ถอน | %d เส้น |' % sum(drop.values()),
         '| ช่องความหมายที่ได้มา | %d |' % stats['ช่องความหมาย'], '',
         '---', '', '## 🌿 กิ่งที่ได้คำเพิ่มมากที่สุด', '',
         '| กิ่ง | ได้คำเพิ่ม |', '|---|---|']
    for p, c in add.most_common(40):
        L.append('| %s | %d |' % (lv(p) if p else '—', c))
    L += ['', '---', '', '## ✂️ กิ่งที่ถูกถอนคำออกมากที่สุด', '',
          'ส่วนใหญ่คือกิ่งที่คำลูกลอกมาจากวลีแม่ — เช่น `ปรก` ที่ไปกองอยู่ใน *หนวดและเครา*',
          'เพราะตัดมาจาก `หนวดเคราปรกหน้ารุงรัง` ทั้งที่ตัวคำแปลว่าแผ่ปกคลุมลงมา', '',
          '| กิ่ง | ถูกถอนคำ |', '|---|---|']
    for p, c in drop.most_common(40):
        L.append('| %s | %d |' % (lv(p) if p else '—', c))

    # ── คำที่ผู้ช่วยติดธงว่าสงสัย พร้อม "สถานะจริง" ──────────────────
    # 🔴 ห้ามแสดงเป็นรายการค้างลอย ๆ · เกือบทุกคำเคาะไปแล้ว
    #    ถ้าไม่ติดสถานะ จะอ่านเหมือนยังมีงานค้าง แล้วเจ้าของคลังต้องมาไล่เคาะซ้ำ
    sus = [(w['text'], w['suspect']) for w in W.values() if w['suspect']]
    done = [x for x in sus if x[0] in CONFIRMED_OK or x[0] in SPELLFIX.values()]
    todo = [x for x in sus if x not in done]
    L += ['', '---', '', '## ⚠️ คำที่ผู้ช่วยติดธงว่าอาจสะกดผิด — %d คำ' % len(sus), '',
          '**เคลียร์ไปแล้ว %d คำ · ยังรอเคาะ %d คำ**' % (len(done), len(todo)), '',
          '| คำในคลังตอนนี้ | ที่ผู้ช่วยเสนอ | สถานะ |', '|---|---|---|']
    for t, s in sorted(sus):
        if t in SPELLFIX.values():
            st = '✅ แก้แล้วตามที่เสนอ'
        elif t in CONFIRMED_OK:
            st = '✅ เจ้าของคลังยืนยันเองว่าคำนี้ถูก — ห้ามแก้'
        else:
            st = '🔵 รอเคาะ'
        L.append('| %s | %s | %s |' % (t, ' · '.join(str(x) for x in s)[:150], st))
    open(os.path.join(OUT, 'report/changes.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')

    # ── รายงานคำแยกตามหมวด → กิ่ง (ฉบับอ่าน) ─────────────────────────
    inbr = collections.defaultdict(list)
    for w in W.values():
        for l in w['links']:
            inbr[l['code']].append(w)
    L = ['# 📖 คลังคำทั้งหมด แยกตามหมวดและกิ่ง', '',
         '> สร้างอัตโนมัติจาก `scripts/build_wordbank.py` — **อย่าแก้ไฟล์นี้ด้วยมือ**',
         '> แก้ตัวคำที่ `wordbank/data/words.jsonl` · แก้โครงกิ่งที่ `docs/catN-*-redesign.md`', '']
    src = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    for c in sorted(src['categories'], key=lambda x: x['no']):
        bs = [b for b in src['branches'] if b['category_id'] == c['id']]
        tot = len({w['text'] for b in bs for w in inbr.get(b['code'], [])})
        L += ['', '## หมวด %d · %s — %d คำ' % (c['no'], c['name_th'], tot), '']
        for b in bs:
            ws = inbr.get(b['code'], [])
            if not ws:
                continue
            L.append('- `[%s]` **%s** — _%s_' % (b['code'], lv(b['path']), b.get('definition') or ''))
            L.append('  ' + ' · '.join(w['text'] + (' 📕' if len(w['novels']) > 1 else '')
                                       for w in ws))
    open(os.path.join(OUT, 'report/words-by-branch.md'), 'w',
         encoding='utf-8').write('\n'.join(L) + '\n')


def write_tree(crows, brows, stats):
    L = ['คลังคำ (Word Bank) — โครงข้อมูล',
         '=' * 46, '',
         'wordbank/',
         '├── README.md              อ่านก่อน — ไฟล์ไหนขึ้นฐานข้อมูลได้ทันที',
         '├── tree.txt               ไฟล์นี้',
         '├── check.py               ตัวตรวจ — รันแล้วบอกว่าอะไรครบ อะไรขาด',
         '│',
         '├── data/                  ข้อมูลจริง หนึ่งไฟล์ต่อหนึ่งตาราง',
         '│   ├── categories.jsonl        หมวด',
         '│   ├── branches.jsonl          กิ่ง',
         '│   ├── novels.jsonl            นิยาย',
         '│   ├── words.jsonl             คำ  ← ตัวหลัก',
         '│   ├── word_branches.jsonl     เส้น คำ → กิ่ง',
         '│   ├── word_novels.jsonl       เส้น คำ → นิยาย',
         '│   ├── word_sources.jsonl      เส้น คำ → วลีที่ตัดมา',
         '│   ├── word_meanings.jsonl     ความหมาย แยกทีละความหมาย',
         '│   └── _stats.json             ตัวเลขสรุป',
         '│',
         '├── registry/              ทะเบียนที่ต้องขนไปด้วย',
         '│   ├── branch-codes.json       รหัสกิ่งถาวร — รหัสห้ามเลื่อน',
         '│   └── spellfix.json           คำที่แก้สะกดหลังลงคลังแล้ว',
         '│',
         '└── report/                ฉบับอ่าน ไม่ได้เอาขึ้นฐานข้อมูล',
         '    ├── orders-applied.md       คำสั่งที่เคาะไว้ ลงจริงแล้วกี่จุด',
         '    ├── changes.md              รอบทบทวนเปลี่ยนอะไรไปบ้าง',
         '    └── words-by-branch.md      คำทั้งหมด แยกตามหมวดและกิ่ง',
         '', '', 'ข้อมูลเชื่อมกันยังไง', '-' * 46, '',
         '   หมวด (15)',
         '     └── กิ่ง (%d)          ผูกด้วย category_id' % stats['กิ่งทั้งหมด'],
         '           └── คำ (%s)      ผูกด้วย word_branches (คำหนึ่งติดได้หลายกิ่ง)' % f"{stats['คำไม่ซ้ำ']:,}",
         '                 ├── ความหมาย (%s)   word_meanings' % f"{stats['ช่องความหมาย']:,}",
         '                 ├── นิยาย (2)        word_novels',
         '                 └── วลีที่ตัดมา       word_sources',
         '', '', 'ตัวเลขตอนนี้', '-' * 46, '']
    for k, v in stats.items():
        L.append('   %-24s %s' % (k, f'{v:,}' if isinstance(v, int) else v))
    L += ['', '', 'คำต่อหมวด', '-' * 46, '']
    for c in crows:
        L.append('   หมวด %-3d %-42s %s' % (c['no'], c['name_th'], f"{c['word_count']:,}"))
    open(os.path.join(OUT, 'tree.txt'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
