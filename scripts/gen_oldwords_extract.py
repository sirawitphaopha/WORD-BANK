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
    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    words = bd['words']

    # 🔴 คลังเดิมมี 27 คำที่อยู่ 2 หมวด = 682 แถวแต่ 655 ข้อความ
    # ตรงนี้ให้ 1 บรรทัด = 1 ข้อความ (ไม่ซ้ำ) เพราะโต๊ะคัดคำมองที่ "ตัววลี" ไม่ใช่ที่แถวในฐานข้อมูล
    seen, lines = {}, []
    for w in words:
        t = w['text']
        if t in seen:
            seen[t].append(w['category_id'])
            continue
        seen[t] = [w['category_id']]
        lines.append(t)

    # เรียงยาวก่อน — วลียาวคือที่ที่มีคำงามซ่อนอยู่ ลากได้เยอะกว่า
    lines.sort(key=lambda t: (-len(t), t))

    # คำที่ผู้ช่วยเสนอไว้แล้ว (มีเฉพาะหมวดที่รันไปแล้ว) เอามาเป็นชิปให้กดเลือก
    prop = {}
    for f in sorted(glob.glob(P('docs/oldwords/*/out*.jsonl'))):
        for line in open(f, encoding='utf-8'):
            if not line.strip():
                continue
            r = json.loads(line)
            for e in (r.get('extract') or []):
                w = (e.get('w') or '').strip()
                if not w:
                    continue
                cat = None
                for p in (e.get('paths') or []):
                    c = p.get('c')
                    if c:
                        cat = int(c[1:]) + 1
                        break
                prop.setdefault(r.get('text', ''), {})[w] = cat

    L, props = [], {}
    for i, t in enumerate(lines, 1):
        L.append({'n': i, 't': t})
        ws = prop.get(t)
        if ws:
            props[str(i)] = {'line': i, 'src': t,
                             'words': [{'w': w, 'cat': c} for w, c in ws.items()]}
    return {'total_lines': len(L), 'lines': L, 'props': props}, seen


def main():
    D, seen = build()
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


if __name__ == '__main__':
    main()
