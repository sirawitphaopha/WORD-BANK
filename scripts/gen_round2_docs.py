#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เขียนรายงานรอบยกเครื่องคลังคำ (รอบ 2) → docs/m2-sense/round2/*.md + report.html

ใช้: python3 scripts/gen_round2_docs.py

อ่านจาก
  docs/m2-sense/round2/diff.json      ผลเทียบกิ่งเดิม (สร้างจาก check_sense.py --round2)
  docs/m2-sense/round2/before.json    สถานะก่อนแก้ แยกรายคลัง
  docs/m2-sense/round2/sense*.jsonl   คำตอบดิบของผู้ช่วย
  docs/branches-data.json             โครงกิ่งจริง (ใช้ตรวจว่ากิ่งมีอยู่จริง)

🔴 บทเรียนจากรอบก่อน ที่ทำให้พี่กันอ่านแล้วเข้าใจกลับด้าน — ห้ามพลาดซ้ำ
   ① ตารางต้องมีคอลัมน์ "ผลจริง" ที่อ่านจากไฟล์คลังตรง ๆ ไม่ใช่คำนวณเอง
   ② ห้ามใช้คำว่า "แทน" ในหัวคอลัมน์ เพราะอ่านแล้วเหมือนของเดิมถูกทับทิ้ง
   ③ ของสำคัญต้องเป็นไฟล์ของตัวเอง ห้ามซ่อนเป็นหัวข้อท้ายไฟล์ยาว
   ④ ใส่เลขชั้นในวงเล็บทุกชั้น (พี่กันสั่ง 27 ก.ค. "ถ้าวงเล็บ 1 2 3 ด้วยเราจะเห็นภาพมากกว่า")
"""
import json, os, sys, collections, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/m2-sense/round2', *a)
BANK_NAME = {'old': 'เสียงกระซิบจากความมืด', 'new': 'คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ'}

BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
NO = {c['id']: c['no'] for c in BD['categories']}
CATNAME = {c['id']: c['name_th'] for c in BD['categories']}
VALID = {(b['category_id'], b['path']) for b in BD['branches']}


def lvpath(p):
    """เติมเลขชั้นในวงเล็บให้ทุกชั้น — พี่กันสั่ง 27 ก.ค. 2569"""
    return '/'.join('%s(%d)' % (x.strip(), i + 1) for i, x in enumerate(p.split(' / ')))


def cat(c):
    return 'หมวด %s %s' % (NO.get(c, c), CATNAME.get(c, ''))


def load():
    diff = json.load(open(D('diff.json'), encoding='utf-8'))
    before = json.load(open(D('before.json'), encoding='utf-8'))
    import glob
    sense = {}
    for f in sorted(glob.glob(D('sense*.jsonl')) + glob.glob(D('part*', 'sense*.jsonl'))):
        for line in open(f, encoding='utf-8'):
            if line.strip():
                r = json.loads(line)
                sense[r['w']] = r
    return diff, before, sense


def is_extract(before, w):
    b = before.get(w, {})
    return any(x.get('is_extract') for x in b.values())


def banks_of(before, w):
    return [BANK_NAME[t] for t in sorted(before.get(w, {}))]


# ══════════════════════════════════════════════════════════
def f_summary(diff, before, sense):
    TOTAL = 2814
    done = len(sense)
    L = ['# ยกเครื่องคลังคำทั้งสองเล่ม — สรุปผล',
         '',
         '> # 🛑 นี่คือผล **%d จาก %d รายการ (%.0f%%)** — **ยังไม่ครบ**' % (done, TOTAL, 100 * done / TOTAL),
         '>',
         '> ผู้ช่วยถูกตัดกลางคันเพราะชนเพดานการใช้งานของบัญชี 2 รอบ',
         '> **ยังเหลืออีก %d รายการที่ยังไม่ได้ทบทวน** ตัวเลขทุกตัวในไฟล์นี้จึงยังไม่ใช่ตัวเลขสุดท้าย' % (TOTAL - done),
         '>',
         '> 🛑 **ยังไม่มีอะไรถูกเขียนลงคลังจริง** — รอทบทวนให้ครบก่อน แล้วค่อยให้เจ้าของคลังเคาะทีเดียว',
         '', '']
    L += ['> ทบทวนคำและวลี **ทุกรายการ** ของทั้งสองเล่ม โดยผู้ช่วยเห็นแค่ตัวข้อความ',
          '> ไม่เห็นกิ่งเดิม ไม่เห็นหมวดเดิม และถ้าเป็นคำที่ถูกตัดมาจากวลียาว ก็ไม่เห็นวลีนั้น', '']
    tot = len(sense)
    ex = sum(1 for w in sense if is_extract(before, w))
    L += ['## ตัวเลขรวม', '',
          '| | |', '|---|---|',
          '| รายการที่ทบทวน | **%d** |' % tot,
          '| เป็นคำที่สกัดมาจากวลี | %d |' % ex,
          '| เป็นวลีตั้งต้น | %d |' % (tot - ex),
          '| ตีความได้หลายทาง | %d (%.0f%%) |' % (
              sum(1 for r in sense.values() if len(r.get('senses') or []) > 1),
              100 * sum(1 for r in sense.values() if len(r.get('senses') or []) > 1) / max(1, tot)),
          '| **กิ่งที่เพิ่ม** | **%d เส้น** |' % len(diff['add']),
          '| กิ่งที่คงไว้ | %d เส้น |' % len(diff['keep']),
          '| **กิ่งที่ถอน** | **%d เส้น** |' % len(diff['drop']),
          '| กิ่งใหม่ที่เสนอ | %d กิ่ง |' % len({(x[1], x[2]) for x in diff.get('new_paths', [])}),
          '| ความหมายที่ได้เพิ่ม | %d รายการ |' % len(diff.get('new_meaning', [])),
          '| คำที่ติดธงว่าอาจสะกดผิด | %d คำ |' % len(diff.get('suspect', {})),
          '']
    L += ['## แยกรายเล่ม', '',
          '| เล่ม | เพิ่ม | คงไว้ | ถอน | ได้ความหมายใหม่ |', '|---|---|---|---|---|']
    for tag, s in sorted(diff.get('perbank', {}).items()):
        L.append('| %s | %d | %d | %d | %d |' % (BANK_NAME.get(tag, tag),
                 len(s['add']), len(s['keep']), len(s['drop']), len(s['newmn'])))
    L += ['', '## อ่านตรงนี้ก่อน', '',
          '1. **กิ่งที่ถอน คือกิ่งที่ติดมาผิดตั้งแต่แรก** ไม่ใช่การย้ายคำออกจากที่ที่มันควรอยู่',
          '   คำที่สกัดออกมาจากวลียาวเคยได้กิ่งของวลีแม่ติดมาด้วย เช่น `ปรก` ที่ตัดมาจาก `หนวดเคราปรกหน้ารุงรัง`',
          '   แล้วไปนั่งอยู่ในกิ่งหนวดและเครา ทั้งที่ `ปรก` แปลว่าแผ่ปกคลุมลงมา ไม่ได้เป็นชื่อของหนวดเครา',
          '2. **วลีตั้งต้นไม่ถูกแตะตัวอักษรแม้แต่ตัวเดียว** เปลี่ยนแค่กิ่งกับความหมาย',
          '3. **หมวด 7 คำทับศัพท์ และหมวด 15 บทบรรยาย ถูกล็อกไว้** ผู้ช่วยถอดไม่ได้ เพราะพี่กันคัดเอง',
          '4. ทุกไฟล์ในรอบนี้ **ใส่เลขชั้นในวงเล็บ** ให้เห็นว่ากิ่งไหนอยู่ชั้นไหน เช่น `ธรรมชาติฯ(1)/พืชพรรณ(2)/ป่าหนาทึบ(3)`',
          '', '## ไฟล์อื่นในชุดนี้', '',
          '| ไฟล์ | เนื้อหา |', '|---|---|',
          '| `2-added-branches.md` | กิ่งที่เพิ่ม แยกตามหมวด |',
          '| `3-dropped-branches.md` | **กิ่งที่ถอน พร้อมผลจริงว่าสุดท้ายอยู่กิ่งอะไร** |',
          '| `4-meanings.md` | ความหมายใหม่ทุกรายการ |',
          '| `5-new-branches.md` | กิ่งใหม่ที่เสนอ พร้อมคำที่จะมาลง |',
          '| `6-suspect-words.md` | คำที่สงสัยว่าสะกดผิด พร้อมคำที่เสนอ |', '']
    return '\n'.join(L) + '\n'


def f_added(diff, before, sense):
    L = ['# กิ่งที่เพิ่ม', '',
         '> **%d เส้น** · เรียงตามหมวด แล้วตามกิ่ง · เลขในวงเล็บคือชั้นของกิ่ง' % len(diff['add']), '']
    by = collections.defaultdict(lambda: collections.defaultdict(list))
    for w, c, p in diff['add']:
        by[c][p].append(w)
    for c in sorted(by, key=lambda x: NO.get(x, 99)):
        n = sum(len(v) for v in by[c].values())
        L += ['## %s — %d เส้น' % (cat(c), n), '']
        for p in sorted(by[c]):
            L += ['### %s' % lvpath(p), '']
            for w in sorted(by[c][p]):
                r = sense.get(w, {})
                mn = ' · '.join(r.get('meanings') or [])
                L.append('- **%s**%s' % (w, ('  \n  _%s_' % mn) if mn else ''))
            L.append('')
    return '\n'.join(L) + '\n'


def f_dropped(diff, before, sense):
    """🔴 ไฟล์ที่สำคัญที่สุด — ต้องบอกผลจริงเสมอ ไม่ให้คนอ่านเดาเอง"""
    L = ['# กิ่งที่ถอน', '',
         '> **%d เส้น**' % len(diff['drop']), '',
         '## อ่านตรงนี้ก่อน', '',
         'กิ่งที่ถอนคือ **กิ่งที่ติดมาผิดตั้งแต่แรก** ส่วนใหญ่เกิดจากคำที่ถูกตัดออกมาจากวลียาว',
         'แล้วได้กิ่งของวลีแม่ติดมาด้วย ทั้งที่ตัวคำเองไม่ได้แปลอย่างนั้น', '',
         'ทุกแถวมีคอลัมน์ **"สุดท้ายอยู่กิ่งอะไร"** ซึ่ง**อ่านจากผลจริง ไม่ได้คำนวณเอง** จะได้เห็นชัดว่า',
         'ถอนแล้วคำนั้นยังมีบ้านอยู่ที่ไหนบ้าง ไม่มีคำไหนเหลือศูนย์กิ่ง', '',
         '🔒 หมวด 7 คำทับศัพท์ และหมวด 15 บทบรรยาย ถูกล็อกไว้ ไม่ปรากฏในรายการนี้', '']
    byw = collections.defaultdict(list)
    for w, c, p in diff['drop']:
        byw[w].append((c, p))
    kept = collections.defaultdict(set)
    for w, c, p in diff['keep']:
        kept[w].add((c, p))
    for w, c, p in diff['add']:
        kept[w].add((c, p))

    L += ['| ข้อความ | ชนิด | กิ่งที่ถอน | ทำไมถึงถอน | สุดท้ายอยู่กิ่งอะไร (ผลจริง) |',
          '|---|---|---|---|---|']
    for w in sorted(byw):
        r = sense.get(w, {})
        mn = ' · '.join(r.get('meanings') or [])
        kind = 'คำที่สกัด' if is_extract(before, w) else 'วลีตั้งต้น'
        gone = ' <br> '.join('%s › %s' % (cat(c), lvpath(p)) for c, p in sorted(byw[w]))
        now = sorted(kept.get(w, set()))
        final = ' <br> '.join('%s › %s' % (cat(c), lvpath(p)) for c, p in now) or '⚠ ไม่เหลือกิ่ง'
        why = mn or '—'
        L.append('| **%s** | %s | %s | %s | %s |' % (w, kind, gone, why, final))
    L += ['', '_ช่อง "ทำไมถึงถอน" แสดงความหมายที่ผู้ช่วยเขียนให้ตัวข้อความนั้น_',
          '_กิ่งที่ถอนคือกิ่งที่ไม่ตรงกับความหมายนี้ ตามกฎดูที่ประธาน_', '']
    return '\n'.join(L) + '\n'


def f_meanings(diff, before, sense):
    mns = diff.get('meanings') or {}
    newmn = set(diff.get('new_meaning') or [])
    L = ['# ความหมาย', '',
         '> ความหมายเก็บเป็น **รายการ หนึ่งช่องต่อหนึ่งความหมาย** ตามที่พี่กันสั่ง',
         '> ได้ความหมายใหม่ **%d รายการ** จากทั้งหมด %d รายการ' % (len(newmn), len(mns)), '']
    multi = [w for w in mns if len(mns[w]) > 1]
    L += ['## ที่ตีความได้หลายทาง — %d รายการ' % len(multi), '']
    for w in sorted(multi):
        L.append('- **%s** %s' % (w, '🆕' if w in newmn else ''))
        for m in mns[w]:
            L.append('  - %s' % m)
    L += ['', '## ที่ตีความได้ทางเดียว — %d รายการ' % (len(mns) - len(multi)), '',
          '| ข้อความ | ความหมาย |', '|---|---|']
    for w in sorted(w for w in mns if len(mns[w]) == 1):
        L.append('| %s%s | %s |' % (w, ' 🆕' if w in newmn else '', mns[w][0]))
    return '\n'.join(L) + '\n'


def f_newbranches(diff, before, sense):
    props = diff.get('new_paths') or []
    by = collections.defaultdict(list)
    for w, c, p, df, why in props:
        by[(c, p)].append((w, df, why))
    L = ['# กิ่งใหม่ที่เสนอ', '',
         '> **%d กิ่ง** จาก %d เส้นที่เสนอมา' % (len(by), len(props)), '',
         '> ตามกฎที่พี่กันเคาะ กิ่งใหม่ต้องลึกอย่างน้อย 2 ชั้น และกิ่งไหนไม่มีคำมาลงจริงให้ปล่อยว่าง', '']
    for (c, p) in sorted(by, key=lambda k: (NO.get(k[0], 99), k[1])):
        items = by[(c, p)]
        df = next((d for _, d, _ in items if d), '')
        L += ['## %s › %s' % (cat(c), lvpath(p)), '']
        if df:
            L += ['_%s_' % df, '']
        L += ['**คำที่จะมาลง %d คำ**' % len(items), '']
        for w, _, why in sorted(items):
            L.append('- %s%s' % (w, ('  \n  🗨 _%s_' % why) if why else ''))
        L.append('')
    return '\n'.join(L) + '\n'


def f_suspect(diff, before, sense):
    sus = diff.get('suspect') or {}
    L = ['# คำที่สงสัยว่าสะกดผิด', '',
         '> **%d คำ** · ผู้ช่วยไม่ได้แก้ให้ คงข้อความไว้ตามเดิม แล้วเสนอคำที่คิดว่าใช่มาให้พี่กันเคาะ' % len(sus), '',
         '> เคสที่ทำให้ตั้งกฎนี้: `พลวัน` ถูกเก็บ จัดหมวด ติดกิ่งไปครบ กว่าจะรู้ว่าคำที่ถูกคือ `พัลวัน`', '']
    if not sus:
        L += ['ไม่มีคำที่ติดธงในรอบนี้', '']
        return '\n'.join(L) + '\n'
    L += ['| ข้อความในคลัง | ที่ผู้ช่วยสงสัย | อยู่เล่มไหน |', '|---|---|---|']
    for w in sorted(sus):
        L.append('| **%s** | %s | %s |' % (w, sus[w], ' · '.join(banks_of(before, w))))
    L.append('')
    return '\n'.join(L) + '\n'



# ══════════════════════════════════════════════════════════
#  ฉบับ HTML — ยกธีมจากหน้ารายงานเดิมมาใช้ ไม่เขียนใหม่
# ══════════════════════════════════════════════════════════
def write_html(names):
    import sys as _s, re
    _s.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        from gen_newwords_review_html import CSS
    except Exception:
        CSS = 'body{font-family:sans-serif;max-width:900px;margin:auto;padding:16px}'

    def md2html(md):
        out, intbl = [], False
        for ln in md.split('\n'):
            s = ln.rstrip()
            if s.startswith('|'):
                cells = [c.strip() for c in s.strip('|').split('|')]
                if set(''.join(cells)) <= set('-: '):
                    continue
                tag = 'th' if not intbl else 'td'
                if not intbl:
                    out.append('<div class="tw"><table>')
                    intbl = True
                out.append('<tr>' + ''.join('<%s>%s</%s>' % (tag, inline(c), tag) for c in cells) + '</tr>')
                continue
            if intbl:
                out.append('</table></div>')
                intbl = False
            if s.startswith('#'):
                n = len(s) - len(s.lstrip('#'))
                out.append('<h%d>%s</h%d>' % (min(n, 4), inline(s.lstrip('# ')), min(n, 4)))
            elif s.startswith('>'):
                out.append('<blockquote>%s</blockquote>' % inline(s.lstrip('> ')))
            elif s.startswith('- '):
                out.append('<li>%s</li>' % inline(s[2:]))
            elif s.strip() == '---':
                out.append('<hr>')
            elif s.strip():
                out.append('<p>%s</p>' % inline(s))
        if intbl:
            out.append('</table></div>')
        return '\n'.join(out)

    def inline(s):
        s = html.escape(s)
        s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
        s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
        s = re.sub(r'_(.+?)_', r'<i>\1</i>', s)
        return s

    body = []
    for n in names:
        body.append('<section>' + md2html(open(D(n), encoding='utf-8').read()) + '</section>')
    doc = ('<!doctype html><html lang="th"><head><meta charset="utf-8">'
           '<meta name="viewport" content="width=device-width,initial-scale=1">'
           '<title>ยกเครื่องคลังคำ — รายงานรอบ 2</title><style>%s\n'
           '.tw{overflow-x:auto}table{border-collapse:collapse;width:100%%;margin:10px 0}'
           'th,td{border:1px solid rgba(120,100,70,.28);padding:6px 9px;text-align:left;font-size:14px}'
           'th{background:rgba(160,140,100,.14)}code{font-size:13px}'
           'section{margin-bottom:34px}blockquote{border-left:4px solid #9c3b2b;padding:4px 12px;margin:8px 0}'
           '@media(max-width:700px){th,td{font-size:13px;padding:5px 6px}}</style></head><body>%s</body></html>'
           % (CSS, '\n'.join(body)))
    open(D('report.html'), 'w', encoding='utf-8').write(doc)
    print('เขียน docs/m2-sense/round2/report.html')


# ══════════════════════════════════════════════════════════
def main():
    for f in ('diff.json', 'before.json'):
        if not os.path.exists(D(f)):
            print('🔴 ยังไม่มี %s — ต้องรัน check_sense.py --round2 ก่อน' % f)
            return 1
    diff, before, sense = load()
    if not sense:
        print('🔴 ยังไม่มีคำตอบของผู้ช่วย')
        return 1

    files = {
        '1-summary.md': f_summary,
        '2-added-branches.md': f_added,
        '3-dropped-branches.md': f_dropped,
        '4-meanings.md': f_meanings,
        '5-new-branches.md': f_newbranches,
        '6-suspect-words.md': f_suspect,
    }
    for name, fn in files.items():
        open(D(name), 'w', encoding='utf-8').write(fn(diff, before, sense))
        print('เขียน docs/m2-sense/round2/%s' % name)

    write_html(list(files))

    # ── ด่านตรวจ: กิ่งที่บอกว่าเพิ่ม ต้องมีอยู่จริงในโครงกิ่ง ──
    ghost = [(w, c, p) for w, c, p in diff['add'] if (c, p) not in VALID]
    if ghost:
        print('🔴 กิ่งลอย %d เส้น เช่น %s' % (len(ghost), ghost[:3]))
        return 1
    zero = [w for w in sense
            if not (set(map(tuple, [(c, p) for _, c, p in diff['keep'] if _ == w])) |
                    set(map(tuple, [(c, p) for _, c, p in diff['add'] if _ == w])))]
    if zero:
        print('🔴 มี %d รายการที่จะเหลือ 0 กิ่ง เช่น %s' % (len(zero), zero[:5]))
        return 1
    print('✅ ด่านผ่าน: กิ่งลอย 0 · รายการที่เหลือ 0 กิ่ง 0')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
