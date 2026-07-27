#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รายงานผลการทดลอง M2 → docs/oldwords-sense-result.md + .html

ใช้: python3 scripts/gen_sense_result.py [ไฟล์ fragment สำหรับ Artifact]

🔑 ยก CSS ของหน้ารายงานเดิมมาใช้ (import จาก gen_newwords_review_html.py)
   ตามกฎ "ของที่ทำไว้ดีแล้ว ห้ามสร้างใหม่"
"""
import json, os, sys, collections, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/oldwords/sense', *a)
e = html.escape

from gen_newwords_review_html import CSS

DIFF = json.load(open(D('diff.json'), encoding='utf-8'))
BEF = json.load(open(D('before.json'), encoding='utf-8'))
BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
NO = {c['id']: c['no'] for c in BD['categories']}
NAME = {c['id']: c['name_th'] for c in BD['categories']}
cname = lambda c: 'หมวด %s %s' % (NO.get(c, '?'), NAME.get(c, c))

SENSE = {}
for f in ('sense1.jsonl', 'sense2.jsonl'):
    for l in open(D(f), encoding='utf-8'):
        if l.strip():
            r = json.loads(l)
            SENSE[r['w']] = r

multi = [r for r in SENSE.values() if len(r.get('senses') or []) > 1]
newmn = DIFF['new_meaning']
add = DIFF['add']
drop = DIFF['drop']
refused = DIFF.get('refused_drop', [])

# คำสกัดที่เคยได้กิ่งเหมือนวลีตั้งต้นเป๊ะ → ตอนนี้เหลือเท่าไหร่
same_before = same_after = 0
allw = {w['text']: w for w in BD['words']}
for w, b in BEF.items():
    src = b.get('source')
    if not src:
        continue
    was = {(p['c'], p['p']) for p in b['paths']}
    par = BEF.get(src)
    pw = allw.get(src)
    pset = ({(pw['category_id'], p) for p in (pw.get('subpaths') or [])} if pw else set())
    if not was or not pset:
        continue
    if was == pset:
        same_before += 1
    now = was | {(c, p) for x, c, p in add if x == w} - {(c, p) for x, c, p in drop if x == w}
    if now == pset:
        same_after += 1


def rows_by_cat(items):
    t = collections.defaultdict(lambda: collections.defaultdict(list))
    for w, c, p in items:
        t[c][p].append(w)
    return t


def md():
    o = ['# ผลการทดลอง M2 — ให้ผู้ช่วยตัดสินคำโดยไม่เห็นวลีตั้งต้น', '',
         '> สร้างอัตโนมัติจาก `scripts/gen_sense_result.py` · อย่าแก้มือ', '',
         '## ๑ · ทำอะไร', '',
         'พี่กันจับได้จากคำว่า **`เสียว`** ว่าคำที่สกัดออกมาถูกยัดกิ่งเดียวกับวลีตั้งต้น',
         'รอบนี้จึงให้ผู้ช่วย **เห็นแค่ตัวคำล้วน ๆ** ไม่เห็นวลีตั้งต้น ไม่เห็นกิ่งเดิม แล้วให้ตัดสินใหม่ทั้งหมด', '',
         '| | |', '|---|---|',
         '| คำที่ทบทวน | %d คำ |' % len(SENSE),
         '| คำที่ตีความได้หลายทาง | **%d คำ (%.0f%%)** |' % (len(multi), 100 * len(multi) / max(1, len(SENSE))),
         '| กิ่งที่เพิ่ม | **%d เส้น** |' % len(add),
         '| กิ่งที่ถอน | %d เส้น |' % len(drop),
         '| คำที่ได้ความหมายใหม่ | **%d คำ** |' % len(newmn), '',
         '## ๒ · ผลที่สำคัญที่สุด — M2 ใช้ "เพิ่ม" ได้ แต่ใช้ "ถอน" ไม่ได้', '',
         'ผู้ช่วยเสนอให้ถอนกิ่งเดิมออก **%d เส้น** แต่แคลร์ตรวจเองแล้ว **ไม่รับ %d เส้น**' % (len(drop) + len(refused), len(refused)),
         '',
         '**เหตุผล** — ผู้ช่วยไม่เห็นวลีตั้งต้น จึงมองไม่เห็นว่ากิ่งเดิมมีที่มาจากไหน',
         'แต่กิ่งเดิมมาจาก**บริบทที่คำนั้นเจอจริง** จึงถูกต้องในตัวมันเอง', '',
         '| คำ | วลีตั้งต้น | กิ่งที่ผู้ช่วยจะถอน |', '|---|---|---|']
    show = [(w, c, p) for w, c, p in refused
            if w in BEF and any(k in BEF[w]['source'] for k in [p.split(' / ')[-1][:4]])][:12]
    if len(show) < 8:
        show = refused[:12]
    for w, c, p in show:
        o.append('| **%s** | %s | %s |' % (w, BEF[w]['source'], p.split(' / ')[-1]))
    o += ['',
          '🔑 **ข้อสรุปที่เอาไปใช้ต่อได้** — การปิดวลีตั้งต้นทำให้เห็นความหมายที่บริบทเคยบัง (ดีมาก)',
          'แต่ก็ทำให้มองไม่เห็นเหตุผลของกิ่งเดิมด้วย · **จึงควรใช้ M2 เพื่อเพิ่มกิ่ง ไม่ใช่แทนที่กิ่ง**',
          'ตรงกับกฎเหล็กของคลังที่มีอยู่แล้ว: *เพิ่มได้ ลดไม่ได้* และ *คำที่สื่อได้หลายกิ่ง ให้ติดหลายกิ่ง ไม่ใช่ย้าย*', '',
          '## ๓ · กิ่งที่ถอนจริง %d เส้น (ปลอดภัย)' % len(drop), '',
          '> ถอนเฉพาะกรณี **ถอนกิ่งแม่ทั้งที่ยังเก็บกิ่งลูกไว้** = ละเอียดขึ้น ไม่มีข้อมูลหาย', '',
          '| คำ | กิ่งแม่ที่ถอน | กิ่งลูกที่เหลือ |', '|---|---|---|']
    for w, c, p in drop:
        kids = [x['p'] for x in SENSE[w]['paths'] if x['c'] == c and x['p'].startswith(p + ' / ')]
        o.append('| %s | %s | %s |' % (w, p, ' · '.join(x.split(' / ')[-1] for x in kids)))

    o += ['', '## ๔ · คำที่ได้ความหมายใหม่ %d คำ' % len(newmn), '',
          '> เกณฑ์ที่พี่กันเคาะ — **ตีความได้ทางเดียว = เว้นได้ · หลายทาง = ต้องมี**', '',
          '| คำ | ความหมายที่ได้ | ตีความได้กี่ทาง |', '|---|---|---|']
    for w in sorted(newmn):
        r = SENSE.get(w, {})
        o.append('| **%s** | %s | %d |' % (w, r.get('meaning') or '—', len(r.get('senses') or [])))

    o += ['', '## ๕ · คำที่ตีความได้หลายทาง — เห็นครบทุกความหมาย', '',
          '> นี่คือหัวใจของรอบนี้ · เดิมคำพวกนี้ถูกจัดตามความหมายเดียวที่วลีตั้งต้นใช้', '']
    for r in sorted(multi, key=lambda x: -len(x['senses']))[:80]:
        o.append('- **%s** — %s' % (r['w'], ' · '.join(r['senses'])))

    o += ['', '## ๖ · ตัวเลขที่เอาไปตัดสินว่าคุ้มเอา M2 เข้าเว็บไหม', '',
          'ในเว็บจริง M2 ต้องยิงถาม AI หลายรอบต่อการจัดคำ 1 ครั้ง = **จ่ายหลายเท่า**',
          'จึงต้องมีตัวเลขว่าได้อะไรกลับมาบ้าง', '',
          '| วัดอะไร | ก่อน | หลัง |', '|---|---|---|',
          '| **คำสกัดที่ได้กิ่งเหมือนวลีตั้งต้นเป๊ะทุกกิ่ง** | %d คำ (%.0f%%) | **%d คำ (%.0f%%)** |'
          % (same_before, 100 * same_before / max(1, len(SENSE)),
             same_after, 100 * same_after / max(1, len(SENSE))),
          '| คำที่ได้ความหมายใหม่ | 0 | **%d คำ** |' % len(newmn),
          '| คำที่ได้กิ่งเพิ่ม | 0 | **%d คำ** (รวม %d เส้น) |' % (len(set(w for w, c, p in add)), len(add)),
          '| กิ่งที่ถอนแล้วถูกจริง | — | %d จาก %d เส้นที่เสนอ |' % (len(drop), len(drop) + len(refused)),
          '',
          '🎯 **อ่านตัวเลขนี้ยังไง** — ปัญหาที่พี่กันจับได้ (คำสกัดลอกกิ่งวลีตั้งต้นมาทั้งดุ้น)',
          '**ลดลงจาก %d คำเหลือ %d คำ = หายไป %.0f%%** ด้วยการปิดวลีตั้งต้นอย่างเดียว ไม่ต้องแก้อะไรอีก'
          % (same_before, same_after, 100 * (same_before - same_after) / max(1, same_before)),
          '',
          '⚠️ **แต่ต้องแลกกับ** — ต้องมีคนตรวจการถอนกิ่งทุกเส้น (รอบนี้เสนอถอน %d เส้น ถูกจริงแค่ %d)'
          % (len(drop) + len(refused), len(drop)),
          'ถ้าเอาเข้าเว็บ **ต้องล็อกให้ M2 เพิ่มกิ่งได้อย่างเดียว ห้ามถอน**', '',
          '## ๗ · กิ่งที่เพิ่ม %d เส้น แยกตามหมวด' % len(add), '']
    t = rows_by_cat(add)
    for cid in sorted(t, key=lambda c: NO.get(c, 99)):
        n = sum(len(v) for v in t[cid].values())
        o.append('### %s · %d เส้น' % (cname(cid), n))
        for path in sorted(t[cid]):
            o.append('- **%s** — %s' % (path, ' · '.join(t[cid][path])))
        o.append('')
    return '\n'.join(o) + '\n'


def page():
    st = ''.join('<div class=stat><b>%s</b><br>%s</div>' % (a, b) for a, b in [
        (len(SENSE), 'คำที่ทบทวน'),
        ('%d' % len(multi), 'ตีความได้หลายทาง'),
        ('+%d' % len(add), 'กิ่งที่เพิ่ม'),
        (len(drop), 'กิ่งที่ถอนจริง'),
        (len(newmn), 'ได้ความหมายใหม่'),
    ])
    t = rows_by_cat(add)
    blocks = []
    for cid in sorted(t, key=lambda c: NO.get(c, 99)):
        n = sum(len(v) for v in t[cid].values())
        s = ['<details class=card><summary><b>%s</b> <span class=dim>· %d เส้น</span></summary>' % (e(cname(cid)), n)]
        for path in sorted(t[cid]):
            s.append('<div class=sec><span class=h>%s</span>%s</div>' % (e(path), e(' · '.join(t[cid][path]))))
        s.append('</details>')
        blocks.append(''.join(s))

    ref = ''.join('<tr><td><b>%s</b></td><td class=dim>%s</td><td>%s</td></tr>'
                  % (e(w), e(BEF[w]['source']), e(p.split(' / ')[-1]))
                  for w, c, p in refused[:40])
    mn = ''.join('<tr><td><b>%s</b></td><td>%s</td><td>%d</td></tr>'
                 % (e(w), e(SENSE.get(w, {}).get('meaning') or '—'), len(SENSE.get(w, {}).get('senses') or []))
                 for w in sorted(newmn))
    ms = ''.join('<div class=sub><b>%s</b> — <span class=dim>%s</span></div>'
                 % (e(r['w']), e(' · '.join(r['senses'])))
                 for r in sorted(multi, key=lambda x: -len(x['senses'])))

    return f"""<title>ผลการทดลอง M2 · ตัดสินคำโดยไม่เห็นวลีตั้งต้น</title>
<meta name=viewport content="width=device-width,initial-scale=1">
<style>{CSS}
details.card summary{{cursor:pointer;font-size:16px;list-style:none}}
details.card summary::-webkit-details-marker{{display:none}}
details.card summary::before{{content:'▸ ';color:var(--primary);font-weight:700}}
details.card[open] summary::before{{content:'▾ '}}
table{{width:100%;border-collapse:collapse;font-size:14px;margin:10px 0}}
td,th{{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}}
.wrap{{padding-bottom:40px}}
</style>
<div class=wrap>
<h1>ผลการทดลอง M2</h1>
<p class=lead>ให้ผู้ช่วยตัดสินคำที่สกัด <b>โดยไม่เห็นวลีตั้งต้น</b> · คลังเดิม {len(SENSE)} คำ</p>
<div class=stats>{st}</div>

<h2>ผลที่สำคัญที่สุด</h2>
<p class=quote><b>M2 ใช้ "เพิ่มกิ่ง" ได้ดีมาก แต่ใช้ "ถอนกิ่ง" ไม่ได้</b><br>
การปิดวลีตั้งต้นทำให้เห็นความหมายที่บริบทเคยบัง — ได้กิ่งเพิ่ม {len(add)} เส้น<br>
แต่ก็ทำให้มองไม่เห็นเหตุผลของกิ่งเดิมด้วย ผู้ช่วยจึงเสนอถอนกิ่งที่ถูกต้องออก {len(refused)} เส้น<br>
ตรงกับกฎเหล็กของคลังที่มีอยู่แล้ว — <i>เพิ่มได้ ลดไม่ได้</i></p>

<h2>กิ่งที่ผู้ช่วยจะถอน แต่แคลร์ไม่รับ · {len(refused)} เส้น</h2>
<p class=quote>กิ่งเดิมมาจากบริบทที่คำนั้นเจอจริงในวลีตั้งต้น จึงถูกต้องในตัวมันเอง</p>
<table><tr><th>คำ</th><th>วลีตั้งต้น</th><th>กิ่งที่จะถอน</th></tr>{ref}</table>

<h2>คำที่ได้ความหมายใหม่ · {len(newmn)} คำ</h2>
<p class=quote>เกณฑ์ที่เจ้าของคลังเคาะ — ตีความได้ทางเดียว = เว้นได้ · หลายทาง = ต้องมี</p>
<table><tr><th>คำ</th><th>ความหมาย</th><th>กี่ทาง</th></tr>{mn}</table>

<h2>คำที่ตีความได้หลายทาง · {len(multi)} คำ</h2>
<p class=quote>เดิมคำพวกนี้ถูกจัดตามความหมายเดียวที่วลีตั้งต้นใช้</p>
<div class=card>{ms}</div>

<h2>ตัวเลขที่เอาไปตัดสินว่าคุ้มเอา M2 เข้าเว็บไหม</h2>
<p class=quote>ในเว็บจริง M2 ต้องยิงถาม AI หลายรอบต่อการจัดคำ 1 ครั้ง = จ่ายหลายเท่า จึงต้องรู้ว่าได้อะไรกลับมา</p>
<table><tr><th>วัดอะไร</th><th>ก่อน</th><th>หลัง</th></tr>
<tr><td><b>คำสกัดที่ได้กิ่งเหมือนวลีตั้งต้นเป๊ะทุกกิ่ง</b></td><td>{same_before} คำ</td><td><b>{same_after} คำ</b></td></tr>
<tr><td>คำที่ได้ความหมายใหม่</td><td>0</td><td><b>{len(newmn)} คำ</b></td></tr>
<tr><td>คำที่ได้กิ่งเพิ่ม</td><td>0</td><td><b>{len(set(w for w, c, p in add))} คำ</b> (รวม {len(add)} เส้น)</td></tr>
<tr><td>กิ่งที่ถอนแล้วถูกจริง</td><td>—</td><td>{len(drop)} จาก {len(drop) + len(refused)} เส้นที่เสนอ</td></tr></table>
<p class=quote>ปัญหาที่เจ้าของคลังจับได้ (คำสกัดลอกกิ่งวลีตั้งต้นมาทั้งดุ้น) <b>ลดลงจาก {same_before} คำเหลือ {same_after} คำ
= หายไป {100 * (same_before - same_after) // max(1, same_before)}%</b> ด้วยการปิดวลีตั้งต้นอย่างเดียว<br>
แต่ต้องแลกกับการมีคนตรวจการถอนกิ่งทุกเส้น — <b>ถ้าเอาเข้าเว็บ ต้องล็อกให้เพิ่มกิ่งได้อย่างเดียว ห้ามถอน</b></p>

<h2>กิ่งที่เพิ่ม · {len(add)} เส้น</h2>
{''.join(blocks)}
</div>"""


def main():
    open(P('docs/oldwords-sense-result.md'), 'w', encoding='utf-8').write(md())
    body = page()
    open(P('docs/oldwords-sense-result.html'), 'w', encoding='utf-8').write(
        '<!doctype html><html lang=th><head><meta charset=utf-8>' + body + '</body></html>')
    if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        open(sys.argv[1], 'w', encoding='utf-8').write(body)
    print('เขียน docs/oldwords-sense-result.md + .html')
    print('  ทบทวน %d คำ · ตีความหลายทาง %d · กิ่งเพิ่ม %d · ถอนจริง %d · ไม่รับการถอน %d · ความหมายใหม่ %d'
          % (len(SENSE), len(multi), len(add), len(drop), len(refused), len(newmn)))


if __name__ == '__main__':
    main()
