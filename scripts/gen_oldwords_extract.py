#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
โต๊ะคัดคำของ "คลังเดิม 682 คำ" — ลากนิ้วสกัดคำเองทั้งก้อน

ใช้:  python3 scripts/gen_oldwords_extract.py [ไฟล์ fragment สำหรับ Artifact]

🔑 วิธีทำ: **ยกไฟล์ docs/newwords-picker.html มาทั้งไฟล์ แล้วเปลี่ยนแค่ 3 อย่าง**
   ① ก้อนข้อมูล DATA  ② คีย์ที่เก็บ (กันทับงานของโต๊ะเดิม)  ③ หัวเรื่อง
   ไม่แตะ CSS ไม่แตะ JS สักบรรทัด — ตัวนั้นผ่านคำติของพี่กันมา 6 รอบจนลงตัวแล้ว
   (ลากทีละตัวอักษร · ป๊อปกระจกเงา · หมายเหตุ 2 ระดับ · ระบบกันงานหาย 3 ชั้น)

รูปแบบ DATA ที่ไฟล์นั้นกิน:
   {"total_lines":N,
    "lines":[{"n":ลำดับ,"t":"ตัวคำ"}, ...],
    "props":{"ลำดับ":{"line":ลำดับ,"src":"ตัวคำ","words":[{"w":"คำที่เสนอ","cat":เลขหมวด}]}}}
"""
import json, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
BASE = P('docs/newwords-picker.html')


def build():
    # 🔑 ยึด docs/oldwords/extract/in.jsonl เป็นแหล่งเดียว
    #    เพราะนั่นคือไฟล์ที่ผู้ช่วยอ่านไปทำงาน เลขบรรทัด n จึงตรงกันทั้งสองฝั่ง
    #    (ถ้าไปสร้างรายการเองใหม่จาก branches-data.json ลำดับจะเลื่อน แล้วคำที่เสนอจะไปเกาะผิดวลี)
    rows = [json.loads(l) for l in open(P('docs/oldwords/extract/in.jsonl'), encoding='utf-8')
            if l.strip()]
    seen = {r['t']: r.get('cat', []) for r in rows}

    # คำที่ผู้ช่วยเสนอไว้ เอามาเป็นชิปให้กดเลือก
    # ถ้ารวมผลแล้ว (merge_extract.py) ใช้ฉบับรวม — วลีที่หลายฝ่ายทำซ้อนกันถูกยุบเป็นแถวเดียวแล้ว
    merged = P('docs/oldwords/extract/merged.jsonl')
    files = [merged] if os.path.exists(merged) else sorted(glob.glob(P('docs/oldwords/*/out*.jsonl')))

    # 🔑 คำที่มีในคลังเดิมอยู่แล้ว ไม่เอามาเป็นชิปให้พี่กันสกัดซ้ำ
    #    (เช่น `กรีดร้องโหยหวน` ที่ซ้อนอยู่ใน `กรีดร้องโหยหวนด้วยเสียงแหลมสูงราวกับ…`)
    #    ของพวกนี้เป็น "เส้นเชื่อมย้อนหลัง" ไม่ใช่คำใหม่ — เก็บไว้ใน merged.jsonl ให้ตัวเขียนกลับใช้
    have = {w['text'] for w in json.load(open(P('docs/branches-data.json'), encoding='utf-8'))['words']}

    prop, dropped = {}, 0
    for f in files:
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            txt = r.get('text') or r.get('t') or ''
            for e in (r.get('extract') or r.get('ex') or []):
                w = (e.get('w') or '').strip()
                if not w:
                    continue
                if w in have:
                    dropped += 1
                    continue
                cat = None
                for p in (e.get('paths') or []):
                    c = p.get('c')
                    if c:
                        cat = int(c[1:]) + 1
                        break
                prop.setdefault(txt, {})[w] = cat

    L, props = [], {}
    for r in rows:
        i, t = r['n'], r['t']
        L.append({'n': i, 't': t})
        ws = prop.get(t)
        if ws:
            props[str(i)] = {'line': i, 'src': t,
                             'words': [{'w': w, 'cat': c} for w, c in ws.items()]}
    return {'total_lines': len(L), 'lines': L, 'props': props}, seen, dropped


def main():
    D, seen, dropped = build()
    src = open(BASE, encoding='utf-8').read()

    # ① เปลี่ยนก้อนข้อมูล — หาบรรทัด const DATA = {...}; แล้วแทนทั้งบรรทัด
    m = re.search(r'const DATA\s*=\s*', src)
    if not m:
        raise SystemExit('หา const DATA ในไฟล์ต้นแบบไม่เจอ')
    i = src.index('{', m.end())
    depth, j = 0, i
    while j < len(src):
        if src[j] == '{':
            depth += 1
        elif src[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    src = src[:i] + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + src[j + 1:]

    # ② คีย์ที่เก็บคนละอันกับโต๊ะเดิม — ไม่งั้นเปิดไฟล์ใหม่แล้วทับงานคลังชุดใหม่ที่พี่กันคัดไว้
    src = src.replace("const KEY='wordbank:extract-pick:v1'", "const KEY='wordbank:oldextract:v1'")
    src = src.replace('__wbpick__', '__wboldx__')

    # ③ หัวเรื่อง + คำอธิบาย
    src = src.replace('โต๊ะคัดคำ · เลือกคำที่สกัดจากคลังคำชุดใหม่',
                      'โต๊ะคัดคำ · คลังเดิม 682 คำ')
    src = re.sub(r'(<h1[^>]*>)[^<]*(</h1>)', r'\1โต๊ะคัดคำ · คลังเดิม\2', src, count=1)

    # ④ ตัวกรองเริ่มต้น: ของเดิมเปิดมาที่ "มีคำเสนอ" เพราะคลังชุดใหม่มีคำเสนอเกือบทุกบรรทัด
    #    แต่คลังเดิมยังไม่ได้ให้ผู้ช่วยสกัด จึงมีคำเสนอแค่ไม่กี่บรรทัด เปิดมาจะเห็นแทบว่าง
    #    → เปลี่ยนเป็นเปิดมาเห็นทุกวลี (ยังกดสลับกลับไปดูเฉพาะที่มีคำเสนอได้เหมือนเดิม)
    src = src.replace("let filter='prop'", "let filter='all'")
    src = re.sub(r'(data-f="prop"[^>]*?)aria-pressed="true"', r'\1aria-pressed="false"', src)
    src = re.sub(r'(data-f="all"[^>]*?)aria-pressed="false"', r'\1aria-pressed="true"', src)

    out = P('docs/oldwords-extract.html')
    open(out, 'w', encoding='utf-8').write(src)
    if len(sys.argv) > 1:
        # fragment สำหรับ Artifact = ตัดเปลือก doctype/html/head ออก
        body = src
        b = body.find('<body>')
        if b >= 0:
            body = body[b + 6:]
        body = body.replace('</body>', '').replace('</html>', '')
        open(sys.argv[1], 'w', encoding='utf-8').write(body)

    dup = sum(1 for v in seen.values() if len(v) > 1)
    ln = [len(x['t']) for x in D['lines']]
    print('เขียน %s' % out)
    print('  วลีให้ลาก %d บรรทัด (จาก 682 แถว · %d คำอยู่ 2 หมวดรวมเป็นบรรทัดเดียว)'
          % (D['total_lines'], dup))
    print('  ยาวสุด %d ตัวอักษร · เกิน 20 = %d · เกิน 15 = %d'
          % (max(ln), sum(1 for x in ln if x > 20), sum(1 for x in ln if x > 15)))
    print('  วลีที่มีคำเสนอไว้แล้ว %d บรรทัด' % len(D['props']))
    print('  คำที่ไม่เอามาเป็นชิปเพราะมีในคลังเดิมอยู่แล้ว %d (เก็บเป็นเส้นเชื่อมใน merged.jsonl)' % dropped)


if __name__ == '__main__':
    main()
