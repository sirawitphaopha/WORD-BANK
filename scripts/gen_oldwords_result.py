#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สรุปผลรอบเกลาคลังเดิม → docs/archive/oldwords-round/oldwords-result.md + .html (ให้พี่กันอ่าน)

ใช้: python3 scripts/gen_oldwords_result.py

🔑 ยก CSS ของหน้ารายงานเดิมมาใช้ทั้งชุด (import จาก gen_newwords_review_html.py)
   ไม่เขียนธีมใหม่ ตามกฎ "ของที่ทำไว้ดีแล้ว ห้ามสร้างใหม่"
   ต่างกันแค่รอบนี้เป็น **หน้าอ่านอย่างเดียว** ไม่มีปุ่มเคาะ (คำลงคลังไปแล้ว)
"""
import json, os, sys, collections, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
P = lambda *a: os.path.join(ROOT, *a)
e = html.escape

from gen_newwords_review_html import CSS          # ธีมกระดาษชุดเดียวกับหน้ารายงานอื่น
from spellfix import fix                          # คำที่แก้สะกดหลังลงคลัง

FIN = json.load(open(P('docs/oldwords/picked/final.json'), encoding='utf-8'))
BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
MERGED = [json.loads(l) for l in open(P('docs/oldwords/extract/merged.jsonl'), encoding='utf-8') if l.strip()]
BASE = json.load(open(P('docs/oldwords/baseline-branches-data.json'), encoding='utf-8'))

CATS = {c['id']: c for c in BD['categories']}
NO = {c['id']: c['no'] for c in BD['categories']}
cname = lambda cid: 'หมวด %s %s' % (NO.get(cid, '?'), CATS[cid]['name_th'] if cid in CATS else cid)

# คำใหม่ที่ลงคลัง (in_old=False) แยกตาม หมวด → กิ่ง
newc = [r for r in FIN['words'] if not r['in_old']]
tree = collections.defaultdict(lambda: collections.defaultdict(list))
for r in newc:
    for p in r['paths']:
        tree[p['c']][p['p']].append(r)

# กิ่งเพิ่มให้วลีเดิม (ก้อน add) — นับเฉพาะที่ลงจริง
now = collections.defaultdict(set)
for w in BD['words']:
    for p in (w.get('subpaths') or []):
        now[w['text']].add((w['category_id'], p))
was = collections.defaultdict(set)
for w in BASE['words']:
    for p in (w.get('subpaths') or []):
        was[fix(w['text'])].add((w['category_id'], p))
addtree = collections.defaultdict(lambda: collections.defaultdict(list))
for r in MERGED:
    for a in r['add']:
        k = (a['c'], a['p'])
        if k in now[r['t']] and k not in was[r['t']]:
            addtree[a['c']][a['p']].append(r['t'])

linkback = [r for r in FIN['words'] if r['in_old']]
multisrc = [r for r in FIN['words'] if len(r['from']) > 1]
nnew = sum(len(v) for c in tree.values() for v in c.values())
nadd = sum(len(v) for c in addtree.values() for v in c.values())
EMPTY = ['c10', 'c11', 'c12', 'c13', 'c14']       # 5 หมวดที่เดิมมี 0 คำจากคลังเดิม


def md():
    o = ['# ผลรอบเกลาคลังเดิม — คำที่พี่กันคัดเอง 490 รายการ', '',
         '> สร้างอัตโนมัติจาก `scripts/gen_oldwords_result.py` · อย่าแก้มือ', '',
         '## ๑ · สรุปตัวเลข', '',
         '| | ก่อน | หลัง |', '|---|---|---|',
         '| คำในคลังเดิม | %d | **%d** |' % (len(BASE['words']), len(BD['words'])),
         '| เส้นเชื่อม คำ ↔ กิ่ง | %d | **%d** |'
         % (sum(len(v) for v in was.values()), sum(len(v) for v in now.values())),
         '| กิ่ง | %d | %d (เท่าเดิม) |' % (len(BASE['branches']), len(BD['branches'])), '',
         '- **คำใหม่ที่เข้าคลัง %d คำ** (ชิปที่เขียนลงไฟล์หมวด %d ชิป)' % (len(newc), nnew),
         '- **กิ่งที่วลีเดิมติดเพิ่ม %d เส้น** — เอาวลีเดิมไปเป็นชิปในกิ่งใหม่ด้วย ไม่ใช่ย้าย ชิปที่กิ่งบ้านเดิมอยู่ครบ' % nadd,
         '- คำที่มีในคลังอยู่แล้ว %d คำ → เก็บเป็น**เส้นเชื่อมย้อนหลัง** ไม่เพิ่มซ้ำ' % len(linkback),
         '- คำที่ตัดมาจากหลายวลี %d คำ → เก็บเส้นเชื่อมครบทุกเส้น' % len(multisrc), '',
         '## ๒ · หมวดที่เดิมมี 0 คำจากคลังเดิม ตอนนี้มีคำแล้ว', '',
         '| หมวด | คำที่เข้ามา |', '|---|---|']
    for cid in EMPTY:
        n = sum(1 for w in BD['words'] if w['category_id'] == cid)
        if n:
            o.append('| %s | %d |' % (cname(cid), n))
    o += ['', '## ๓ · คำใหม่ทั้งหมด แยกตามหมวดและกิ่ง', '']
    for cid in sorted(tree, key=lambda c: NO.get(c, 99)):
        o.append('### %s' % cname(cid))
        for path in sorted(tree[cid]):
            ws = tree[cid][path]
            chips = ' · '.join(
                w['w'] + (' _(%s)_' % w['meaning'] if w.get('meaning') else '') for w in ws)
            o.append('- **%s** — %s' % (path, chips))
        o.append('')
    o += ['## ๔ · กิ่งที่วลีเดิมติดเพิ่ม แยกตามหมวดและกิ่ง', '',
          '> วลีพวกนี้**ยังอยู่กิ่งบ้านเดิมครบทุกกิ่ง** ตรงนี้คือกิ่งที่ติดเพิ่มเข้าไปเท่านั้น', '']
    for cid in sorted(addtree, key=lambda c: NO.get(c, 99)):
        o.append('### %s' % cname(cid))
        for path in sorted(addtree[cid]):
            o.append('- **%s** — %s' % (path, ' · '.join(addtree[cid][path])))
        o.append('')
    o += ['## ๕ · เส้นเชื่อมย้อนหลัง (คำที่มีในคลังอยู่แล้ว)', '',
          '> ไม่ได้เพิ่มเป็นคำใหม่ แต่บันทึกไว้ว่า "คำนี้เคยตัดมาจากวลีไหน" ไว้ใช้ตอนทำระบบใยแมงมุม', '',
          '| คำ | ตัดมาจากวลี |', '|---|---|']
    for r in sorted(linkback, key=lambda r: r['w']):
        o.append('| %s | %s |' % (r['w'], ' · '.join(f['phrase'] for f in r['from'])))
    o += ['', '## ๖ · คำที่ตัดมาจากหลายวลี', '',
          '| คำ | จำนวนวลีแม่ | วลี |', '|---|---|---|']
    for r in sorted(multisrc, key=lambda r: -len(r['from'])):
        o.append('| %s | %d | %s |' % (r['w'], len(r['from']),
                                       ' · '.join(f['phrase'][:34] for f in r['from'])))
    return '\n'.join(o) + '\n'


def page():
    st = ''.join('<div class=stat><b>%s</b><br>%s</div>' % (a, b) for a, b in [
        ('%d → %d' % (len(BASE['words']), len(BD['words'])), 'คำในคลังเดิม'),
        (len(newc), 'คำใหม่ที่เข้าคลัง'),
        (nadd, 'กิ่งที่วลีเดิมติดเพิ่ม'),
        (len(linkback), 'เส้นเชื่อมย้อนหลัง'),
        (len(BD['branches']), 'กิ่ง (เท่าเดิม)'),
    ])
    rows = ''.join('<tr><td>%s</td><td><b>%d</b></td></tr>' % (e(cname(c)),
                   sum(1 for w in BD['words'] if w['category_id'] == c))
                   for c in EMPTY if any(w['category_id'] == c for w in BD['words']))

    def block(t, title, note=''):
        s = ['<h2>%s</h2>' % e(title)]
        if note:
            s.append('<p class=quote>%s</p>' % e(note))
        for cid in sorted(t, key=lambda c: NO.get(c, 99)):
            n = sum(len(v) for v in t[cid].values())
            s.append('<details class=card><summary><b>%s</b> <span class=dim>· %d</span></summary>'
                     % (e(cname(cid)), n))
            for path in sorted(t[cid]):
                items = t[cid][path]
                chips = ' · '.join(
                    (e(x['w']) + (' <span class=dim>(%s)</span>' % e(x['meaning']) if x.get('meaning') else ''))
                    if isinstance(x, dict) else e(x) for x in items)
                s.append('<div class=sec><span class=h>%s</span>%s</div>' % (e(path), chips))
            s.append('</details>')
        return ''.join(s)

    return f"""<title>ผลรอบเกลาคลังเดิม · คำที่คัดเอง 490 รายการ</title>
<meta name=viewport content="width=device-width,initial-scale=1">
<style>{CSS}
details.card summary{{cursor:pointer;font-size:16px;list-style:none}}
details.card summary::-webkit-details-marker{{display:none}}
details.card summary::before{{content:'▸ ';color:var(--primary);font-weight:700}}
details.card[open] summary::before{{content:'▾ '}}
table{{width:100%;border-collapse:collapse;font-size:14px;margin:10px 0}}
td,th{{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left}}
.wrap{{padding-bottom:40px}}
</style>
<div class=wrap>
<h1>ผลรอบเกลาคลังเดิม</h1>
<p class=lead>คำที่พี่กันคัดเองจากโต๊ะคัดคำ 490 รายการ · ลงคลังเรียบร้อยแล้ว</p>
<div class=stats>{st}</div>
<p class=quote>คำเดิมไม่หายสักคำ · เส้นเชื่อมเดิมไม่หายสักเส้น · ทุกบรรทัดที่แตะเป็นการต่อท้ายอย่างเดียว</p>
<h2>หมวดที่เดิมมี 0 คำจากคลังเดิม ตอนนี้มีคำแล้ว</h2>
<table><tr><th>หมวด</th><th>คำ</th></tr>{rows}</table>
{block(tree, 'คำใหม่ทั้งหมด แยกตามหมวดและกิ่ง')}
{block(addtree, 'กิ่งที่วลีเดิมติดเพิ่ม', 'วลีพวกนี้ยังอยู่กิ่งบ้านเดิมครบทุกกิ่ง ตรงนี้คือกิ่งที่ติดเพิ่มเข้าไปเท่านั้น')}
<h2>เส้นเชื่อมย้อนหลัง · {len(linkback)} คำ</h2>
<p class=quote>คำที่มีในคลังอยู่แล้ว ไม่ได้เพิ่มซ้ำ แต่บันทึกไว้ว่าเคยตัดมาจากวลีไหน</p>
<table><tr><th>คำ</th><th>ตัดมาจากวลี</th></tr>{''.join(
    '<tr><td><b>%s</b></td><td class=dim>%s</td></tr>' % (e(r['w']), e(' · '.join(f['phrase'] for f in r['from'])))
    for r in sorted(linkback, key=lambda r: r['w']))}</table>
<h2>คำที่ตัดมาจากหลายวลี · {len(multisrc)} คำ</h2>
<table><tr><th>คำ</th><th>วลีแม่</th></tr>{''.join(
    '<tr><td><b>%s</b></td><td class=dim>%s</td></tr>' % (e(r['w']), e(' · '.join(f['phrase'][:40] for f in r['from'])))
    for r in sorted(multisrc, key=lambda r: -len(r['from'])))}</table>
</div>"""


def main():
    open(P('docs/archive/oldwords-round/oldwords-result.md'), 'w', encoding='utf-8').write(md())
    body = page()
    open(P('docs/archive/oldwords-round/oldwords-result.html'), 'w', encoding='utf-8').write(
        '<!doctype html><html lang=th><head><meta charset=utf-8>' + body + '</body></html>')
    if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        open(sys.argv[1], 'w', encoding='utf-8').write(body)
    print('เขียน docs/archive/oldwords-round/oldwords-result.md + .html')
    print('  คำใหม่ %d (ชิป %d) · กิ่งที่วลีเดิมติดเพิ่ม %d · เส้นเชื่อมย้อนหลัง %d · มาจากหลายวลี %d'
          % (len(newc), nnew, nadd, len(linkback), len(multisrc)))


if __name__ == '__main__':
    main()
