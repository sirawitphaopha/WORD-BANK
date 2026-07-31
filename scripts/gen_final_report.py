#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รายงานสรุปงานทบทวนคลังคำทั้ง 2,814 รายการ — ฉบับที่เจ้าของคลังตื่นมาอ่าน

เขียน 2 ไฟล์คู่กันเสมอตามกฎของโปรเจกต์
    docs/m2-sense/FINAL-REPORT.md    ฉบับ md (เอาไปให้ผู้ช่วยเจ้าอื่นอ่านต่อได้)
    docs/m2-sense/FINAL-REPORT.html  ฉบับอ่านบนมือถือ (ธีมกระดาษชุดเดียวกับรายงานอื่น)

เนื้อหาเรียงตามสิ่งที่เจ้าของสั่งไว้ก่อนไปนอน 31 ก.ค. 2569
    "กิ่งที่เสนอก็ลิสมาเดี่ยวเราเคาะเเละคุยทีหลัง หรือเจอคำผิดก็ลิสมา เจออะไรก็ลิสมา"

ใช้: python3 scripts/gen_final_report.py
"""
import json, os, sys, glob, html, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
P = lambda *a: os.path.join(ROOT, *a)
from gen_newwords_review_html import CSS          # ธีมกระดาษชุดเดียวกับหน้ารายงานอื่น

TOTAL = 2814


def lv(path):
    """ใส่เลขชั้นในวงเล็บทุกชั้น ตามกฎที่เจ้าของตั้งไว้ 27 ก.ค."""
    return '/'.join('%s(%d)' % (s.strip(), i + 1) for i, s in enumerate(path.split(' / ')))


def load():
    res = json.load(open(P('docs/m2-sense/round2/result.json'), encoding='utf-8'))
    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    raw = {}
    for f in sorted(glob.glob(P('docs/m2-sense/round2/sense*.jsonl'))
                    + glob.glob(P('docs/m2-sense/round2/part1/sense*.jsonl'))):
        for line in open(f, encoding='utf-8'):
            if line.strip():
                r = json.loads(line)
                raw.setdefault(r['id'], r)
    notes = []
    for f in sorted(glob.glob(P('docs/m2-sense/round3/recheck*notes.md'))):
        notes.append((os.path.basename(f), open(f, encoding='utf-8').read()))
    recheck = []
    for f in sorted(glob.glob(P('docs/m2-sense/round3/recheck-out.jsonl'))
                    + glob.glob(P('docs/m2-sense/round3/recheck?-out.jsonl'))):
        for line in open(f, encoding='utf-8'):
            if line.strip():
                try:
                    recheck.append(json.loads(line))
                except Exception:
                    pass
    return res, bd, raw, notes, recheck


def build():
    res, bd, raw, notes, recheck = load()
    NO = {c['id']: c['no'] for c in bd['categories']}
    CN = {c['id']: c['name_th'] for c in bd['categories']}
    BY = {b['code']: b for b in bd['branches'] if b.get('code')}
    cat = lambda c: 'หมวด %s %s' % (NO.get(c, '?'), CN.get(c, c))

    words = res['words']
    done = len(raw)
    npaths = sum(len(w.get('all_paths') or []) for w in words)
    nmean = sum(len(w.get('meanings') or []) for w in words)
    multi = sum(1 for w in words if len(w.get('meanings') or []) > 1)
    cross = sum(1 for w in words if len({p['category_id'] for p in (w.get('all_paths') or [])}) > 1)
    nomean = sum(1 for w in words if not (w.get('meanings') or []))
    suspects = [(i, r) for i, r in sorted(raw.items()) if r.get('suspect')]
    proposed = res.get('new_branches_proposed') or []

    L = ['# คลังคำ — รายงานสรุปงานทบทวนทั้งคลัง', '',
         '> เขียนอัตโนมัติจาก `scripts/gen_final_report.py` · %s' % res['meta'].get('status', ''), '',
         '> 🛑 **ยังไม่มีอะไรถูกเขียนลงคลังจริง และยังไม่ได้อัปขึ้นฐานข้อมูล** — รอเจ้าของคลังเคาะก่อน', '']

    # ── ๑ ตัวเลขรวม ──
    L += ['## ๑ · ตัวเลขรวม', '',
          '| | จำนวน |', '|---|---|',
          '| รายการที่ทบทวนแล้ว | **%d จาก %d (%.0f%%)** |' % (done, TOTAL, 100 * done / TOTAL),
          '| แถวคำในผลลัพธ์ | %d |' % len(words),
          '| เส้นกิ่งรวม | %d (เฉลี่ย %.2f เส้นต่อรายการ) |' % (npaths, npaths / max(1, len(words))),
          '| ช่องความหมายรวม | %d (เฉลี่ย %.2f) |' % (nmean, nmean / max(1, len(words))),
          '| รายการที่ตีความได้หลายทาง | %d |' % multi,
          '| รายการที่ติดกิ่งข้ามหมวด | %d |' % cross,
          '| รายการที่ยังไม่มีความหมาย | %d |' % nomean, '']

    # ── ๒ กิ่งใหม่ที่ผู้ช่วยเสนอ (รอเคาะ) ──
    L += ['## ๒ · กิ่งใหม่ที่ผู้ช่วยเสนอ — รอเจ้าของเคาะ', '']
    if proposed:
        L += ['> **%d กิ่ง** · ยังไม่ได้เพิ่มเข้าคลัง เอามาวางไว้ให้เคาะทีเดียว' % len(proposed), '']
        for q in proposed:
            c = q.get('c') or q.get('category_id')
            p = q.get('p') or q.get('th') or ''
            L += ['### %s › %s' % (cat(c), lv(p)), '']
            if q.get('def') or q.get('definition'):
                L += ['_%s_' % (q.get('def') or q.get('definition')), '']
            if q.get('en'):
                L += ['ชื่ออังกฤษที่เสนอ: `%s`' % q['en'], '']
            if q.get('words'):
                L += ['**คำที่จะมาลง %d คำ**' % len(q['words']), '']
                L += ['- %s' % w for w in q['words']] + ['']
            if q.get('why'):
                L += ['🗨 _%s_' % q['why'], '']
    else:
        L += ['> ไม่มีกิ่งใหม่ที่ยังค้างรอเคาะ', '']

    # ── ๓ คำที่สงสัยว่าสะกดผิด ──
    L += ['## ๓ · คำที่สงสัยว่าสะกดผิด — รอเจ้าของเคาะ', '']
    if suspects:
        L += ['> **%d คำ** · ผู้ช่วยไม่ได้แก้ให้ คงข้อความไว้ตามเดิม แล้วเสนอคำที่คิดว่าใช่' % len(suspects), '',
              '| เลขรายการ | คำในคลัง | ผู้ช่วยว่าน่าจะเป็น |', '|---|---|---|']
        for i, r in suspects:
            s = r['suspect']
            s = s if isinstance(s, str) else json.dumps(s, ensure_ascii=False)
            L.append('| %d | **%s** | %s |' % (i, r['w'], s))
        L += ['', '🔴 **ห้ามแก้ตามทันที** — บทเรียน 31 ก.ค.: ทั้งผู้ช่วยและผู้ตรวจอีกเจ้าเสนอผิดได้ฝ่ายละคำ',
              'ทุกคำต้องค้นพจนานุกรมราชบัณฑิตยสถานยืนยันก่อนเสมอ · คำที่ยืนยันแล้วว่าถูกอยู่แล้วอยู่ใน `scripts/spellfix.py`', '']
    else:
        L += ['> ไม่มีคำที่ติดธงสงสัย', '']

    # ── ๔ ผลรอบตรวจซ้ำ 400 รายการเทียบกิ่งใหม่ ──
    L += ['## ๔ · รอบตรวจซ้ำ 400 รายการเทียบกิ่งใหม่ 12 กิ่ง', '',
          '> 400 รายการแรกถูกทบทวนไป **ก่อน** กิ่งใหม่ 12 กิ่งจะเข้าคลัง ผู้ช่วยรอบนั้นจึงเลือกไม่ได้',
          '> รอบนี้เอากลับมาไล่ใหม่ว่ามีรายการไหนควรเข้ากิ่งใหม่บ้าง **เพิ่มได้อย่างเดียว ห้ามถอน**', '']
    if recheck:
        cnt = collections.Counter(c for r in recheck for c in (r.get('add') or []))
        L += ['**เติมกิ่งให้ %d รายการ · รวม %d เส้น**' % (len(recheck), sum(cnt.values())), '',
              '| รหัสกิ่ง | หมวด | กิ่ง | คำที่เข้ามา |', '|---|---|---|---|']
        for c, n in cnt.most_common():
            b = BY.get(c)
            L.append('| `%s` | %s | %s | %d |' % (c, cat(b['category_id']) if b else '?',
                                                  b['path'].split(' / ')[-1] if b else '?', n))
        L += ['']
    else:
        L += ['> ไม่มีรายการไหนเข้ากิ่งใหม่ — แปลว่าการจัดกิ่งรอบแรกครอบคลุมอยู่แล้ว', '']

    for name, body in notes:
        if body.strip():
            L += ['---', '', '### 📝 บันทึกของผู้ช่วยรอบตรวจซ้ำ — `%s`' % name, '', body.strip(), '']

    # ── ๕ ไฟล์ที่เกี่ยวข้อง ──
    L += ['## ๕ · ไฟล์ที่เปิดอ่านต่อได้', '',
          '| ไฟล์ | คืออะไร |', '|---|---|',
          '| `docs/m2-sense/round2/0-all-2814.md` / `.html` | **รายการทั้ง 2,814 รายการไฟล์เดียว** เรียงตามเลขรายการ |',
          '| `docs/m2-sense/round2/result.json` | ผลลัพธ์รูปแบบพร้อมขึ้นฐานข้อมูล |',
          '| `docs/m2-sense/round2/1-summary.md` | สรุปผลแยกรายคลัง |',
          '| `docs/m2-sense/round2/2-added-branches.md` | กิ่งที่เพิ่ม แยกตามหมวด → กิ่ง |',
          '| `docs/m2-sense/round2/3-dropped-branches.md` | กิ่งที่ผู้ช่วยขอถอน พร้อมเหตุผลรายเส้น |',
          '| `docs/m2-sense/round2/4-meanings.md` | ความหมายทุกรายการ |',
          '| `docs/branches-clean.md` | โครงกิ่งล้วน 798 กิ่ง ไม่มีคำ |',
          '| `docs/branch-codes.json` | ทะเบียนรหัสประจำกิ่งถาวร |', '']
    return '\n'.join(L), res


def to_html(md):
    """แปลง md เป็นหน้าอ่าน — รองรับหัวข้อ ตาราง รายการ และย่อหน้าอ้างอิง"""
    out, tbl = [], []

    def flush():
        if not tbl:
            return
        rows = [r for r in tbl if not set(r.replace('|', '').strip()) <= set('-: ')]
        cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
        h = '<div class="tw"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (
            ''.join('<th>%s</th>' % inline(c) for c in cells[0]),
            ''.join('<tr>%s</tr>' % ''.join('<td data-l="%s">%s</td>' % (html.escape(cells[0][i]) if i < len(cells[0]) else '', inline(c))
                                            for i, c in enumerate(r)) for r in cells[1:]))
        out.append(h); tbl.clear()

    def inline(t):
        t = html.escape(t)
        for a, b, tag in (('**', '**', 'b'), ('`', '`', 'code'), ('_', '_', 'i')):
            while t.count(a) >= 2:
                t = t.replace(a, '<%s>' % tag, 1).replace(b, '</%s>' % tag, 1)
        return t

    for line in md.split('\n'):
        s = line.rstrip()
        if s.startswith('|'):
            tbl.append(s); continue
        flush()
        if not s.strip():
            continue
        if s.startswith('### '):
            out.append('<h3>%s</h3>' % inline(s[4:]))
        elif s.startswith('## '):
            out.append('<h2>%s</h2>' % inline(s[3:]))
        elif s.startswith('# '):
            out.append('<h1>%s</h1>' % inline(s[2:]))
        elif s.startswith('> '):
            out.append('<blockquote>%s</blockquote>' % inline(s[2:]))
        elif s.startswith('- '):
            out.append('<div class="li">%s</div>' % inline(s[2:]))
        else:
            out.append('<p>%s</p>' % inline(s))
    flush()
    return ('<!doctype html><html lang="th"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>คลังคำ — รายงานสรุปงานทบทวนทั้งคลัง</title><style>%s\n'
            '.tw{overflow-x:auto;margin:14px 0}.li{margin:4px 0 4px 18px}'
            'blockquote{border-left:4px solid var(--accent,#9c3b2b);margin:12px 0;padding:8px 14px;background:#faf4e6}'
            '@media(max-width:700px){.tw table,.tw tbody,.tw tr,.tw td{display:block;width:auto}'
            '.tw thead{display:none}.tw tr{border:1px solid #e6d9bd;border-radius:10px;margin:8px 0;padding:6px}'
            '.tw td::before{content:attr(data-l) " ";font-weight:700;color:#8a7d6d}}'
            '</style></head><body><div class="wrap">%s</div></body></html>'
            % (CSS, '\n'.join(out)))


def main():
    md, res = build()
    open(P('docs/m2-sense/FINAL-REPORT.md'), 'w', encoding='utf-8').write(md)
    open(P('docs/m2-sense/FINAL-REPORT.html'), 'w', encoding='utf-8').write(to_html(md))
    print('เขียน docs/m2-sense/FINAL-REPORT.md + .html')
    print('   ', res['meta'].get('status'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
