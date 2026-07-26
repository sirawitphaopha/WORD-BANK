#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
สร้าง "โจทย์" ให้เอเจนต์ตรวจกิ่ง + สกัดคำ ของคลังเดิมทีละหมวด

ใช้:  python3 scripts/gen_oldwords_task.py 8
      python3 scripts/gen_oldwords_task.py 3 --group "สายตาและการมอง"

อ่าน
  docs/branches-data.json      คำเดิม 682 + โครงกิ่ง 766 + นิยามกิ่ง
  docs/newwords-branches.json  ไว้นับคำคลังชุดใหม่ต่อกิ่ง + ดึงคำตัวอย่าง
  lib/prompt.js                กฎจริงที่เว็บใช้ (คัดฉบับไทยมาแปะเต็ม ไม่ย่อ)

เขียนลง docs/oldwords/catN/
  in.jsonl      1 บรรทัด = 1 คำเดิม (สิ่งที่เอเจนต์ต้องพิจารณา)
  BRANCHES.md   รายชื่อกิ่งทั้ง 766 พร้อมนิยาม + ป้ายจำนวนคำ 2 คลัง
  TASK.md       คำสั่งงานเต็ม (กฎ prompt + กฎเหล็ก + รูปแบบคำตอบ)

🔑 รหัสคำ (wid) คำนวณจาก (หมวด + ตัวคำ) — ตรวจแล้วว่าไม่ซ้ำเลยใน 682 แถว
   ห้ามใช้เลขลำดับ เพราะ branches-data.json ถูกสร้างใหม่ทุกครั้งที่รัน gen_branches.py
   ลำดับเลื่อนได้ งานที่พี่กันเคาะไว้จะเลื่อนไปคนละคำ
"""
import json, sys, os, hashlib, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

# หมวด N = c(N-1) · หมวด 10=c9 · หมวด 11 สถานะ=c10 · 12=c11 · 13=c12 · 14=c13 · 15=c14
CID = lambda n: 'c%d' % (n - 1)


def wid_of(cid, text):
    """รหัสคงที่ผูกกับตัวคำ ไม่ผูกกับลำดับแถว"""
    h = hashlib.sha1((cid + '\x1f' + text).encode('utf-8')).hexdigest()
    return 'w' + h[:10]


def load():
    bd = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
    nw = json.load(open(P('docs/newwords-branches.json'), encoding='utf-8'))
    return bd, nw


def branch_stats(bd, nw):
    """นับคำต่อกิ่ง แยก 2 คลัง + เก็บคำตัวอย่างของคลังชุดใหม่ไว้ให้ดูตอนตัดสินใจ"""
    old, new, sample = {}, {}, {}
    for w in bd['words']:
        for p in w['subpaths']:
            old[(w['category_id'], p)] = old.get((w['category_id'], p), 0) + 1
    for w in nw['words']:
        for a in (w.get('all_paths') or []):
            k = (a['category_id'], a['path'])
            new[k] = new.get(k, 0) + 1
            sample.setdefault(k, [])
            if len(sample[k]) < 5:
                sample[k].append(w['text'])
    return old, new, sample


def thai_rules():
    """คัดกฎฉบับไทยจาก lib/prompt.js มาทั้งก้อน ไม่ย่อ — เอเจนต์ต้องอ่านของจริง"""
    src = open(P('lib/prompt.js'), encoding='utf-8').read()
    m = re.search(r'DEFAULT_PROMPT_TH\s*=\s*`(.*?)`', src, re.S)
    if not m:
        raise SystemExit('หา DEFAULT_PROMPT_TH ใน lib/prompt.js ไม่เจอ')
    return m.group(1).strip()


def main():
    if len(sys.argv) < 2:
        raise SystemExit('ใช้: python3 scripts/gen_oldwords_task.py <เลขหมวด> [--group "ชื่อกิ่งหลัก"]')
    no = int(sys.argv[1])
    cid = CID(no)
    group = None
    if '--group' in sys.argv:
        group = sys.argv[sys.argv.index('--group') + 1]

    bd, nw = load()
    cats = {c['id']: c for c in bd['categories']}
    if cid not in cats:
        raise SystemExit('ไม่มีหมวด %d (%s) ในไฟล์' % (no, cid))
    cat = cats[cid]

    bcount_old, bcount_new, bsample = branch_stats(bd, nw)
    bdef = {(b['category_id'], b['path']): b for b in bd['branches']}

    # คำเดิมของหมวดนี้
    words = [w for w in bd['words'] if w['category_id'] == cid]
    if group:
        words = [w for w in words if any(p.split(' / ')[0] == group for p in w['subpaths'])]
    words.sort(key=lambda w: (-len(w['text']), w['text']))

    # ของที่ต้องรู้เพื่อเตือนในโจทย์
    dup_cat = {}
    for w in bd['words']:
        dup_cat.setdefault(w['text'], set()).add(w['category_id'])
    new_texts = {w['text'] for w in nw['words']}
    old_texts = {w['text'] for w in bd['words']}

    out = P('docs/oldwords', 'cat%d%s' % (no, ('-' + re.sub(r'\W+', '', group)[:12]) if group else ''))
    os.makedirs(out, exist_ok=True)

    # ── in.jsonl ────────────────────────────────────────────────
    with open(os.path.join(out, 'in.jsonl'), 'w', encoding='utf-8') as f:
        for i, w in enumerate(words):
            others = sorted(dup_cat[w['text']] - {cid})
            f.write(json.dumps({
                'i': i,
                'wid': wid_of(cid, w['text']),
                'text': w['text'],
                'len': len(w['text']),
                'now': w['subpaths'],
                'meaning': w.get('meaning'),
                'also_cat': ['หมวด %d' % (int(c[1:]) + 1) for c in others] or None,
                'in_new_bank': w['text'] in new_texts,
                # คำเดิมอื่นที่ซ้อนอยู่ในวลีนี้ — ห้ามเสนอซ้ำเป็นคำใหม่ ให้เก็บเป็นเส้นเชื่อมแทน
                'already_inside': sorted(t for t in old_texts if t != w['text'] and t in w['text']),
            }, ensure_ascii=False) + '\n')

    # ── BRANCHES.md ─────────────────────────────────────────────
    lines = ['# รายชื่อกิ่งทั้งหมด %d กิ่ง · %d หมวด' % (len(bd['branches']), len(bd['categories'])),
             '',
             '> ป้ายท้ายกิ่ง: `[เดิม N]` = มีคำจากคลังเดิม N คำ · `[ใหม่ N]` = มีแต่คำจากคลังชุดใหม่ · `[ว่าง]` = ยังไม่มีคำเลยทั้งสองคลัง',
             '> **กิ่งว่างไม่ใช่กิ่งผิด** — คลังตั้งกิ่งเผื่อไว้ให้ครบทุกแนวนิยาย เลือกกิ่งว่างที่มีอยู่แล้วดีกว่าตั้งกิ่งใหม่ซ้ำซ้อนเสมอ',
             '']
    for c in bd['categories']:
        n2 = int(c['id'][1:]) + 1
        lines.append('## หมวด %d · %s (%s)' % (n2, c['name_th'], c.get('name_en', '')))
        for b in bd['branches']:
            if b['category_id'] != c['id']:
                continue
            k = (b['category_id'], b['path'])
            o, nn = bcount_old.get(k, 0), bcount_new.get(k, 0)
            tag = '[เดิม %d]' % o if o else ('[ใหม่ %d]' % nn if nn else '[ว่าง]')
            depth = b['path'].count(' / ')
            lines.append('%s- `%s` **%s** — _%s_ %s' % (
                '  ' * depth, b['path'], b.get('en', ''), b.get('definition', ''), tag))
            if not o and nn and bsample.get(k):
                lines.append('%s  ตัวอย่างคำชุดใหม่: %s' % ('  ' * depth, ' · '.join(bsample[k])))
        lines.append('')
    open(os.path.join(out, 'BRANCHES.md'), 'w', encoding='utf-8').write('\n'.join(lines))

    # ── TASK.md ─────────────────────────────────────────────────
    task = TASK_TMPL.format(
        no=no, cid=cid, name=cat['name_th'], n=len(words),
        group=('  · เฉพาะกิ่งหลัก "%s"' % group) if group else '',
        rules=thai_rules(),
        catname=cat['name_th'],
    )
    open(os.path.join(out, 'TASK.md'), 'w', encoding='utf-8').write(task)

    print('เขียน %s' % out)
    print('  in.jsonl     %d คำ' % len(words))
    print('  BRANCHES.md  %d กิ่ง' % len(bd['branches']))
    print('  TASK.md')
    ln = [len(w['text']) for w in words]
    if ln:
        print('  ยาวสุด %d ตัวอักษร · เกิน 20 = %d คำ · เกิน 30 = %d คำ'
              % (max(ln), sum(1 for x in ln if x > 20), sum(1 for x in ln if x > 30)))


TASK_TMPL = '''# โจทย์: ตรวจกิ่ง + สกัดคำ — หมวด {no} {name} ({n} คำ){group}

คุณคือ **นักภาษาศาสตร์และผู้เชี่ยวชาญวรรณกรรมไทย** กำลังช่วยนักเขียนนิยายเกลาคลังคำส่วนตัว

คลังนี้เคยจัดคำเข้ากิ่งไปแล้วตอนที่โครงกิ่งยังเป็นชุดเก่า · ตอนนี้โครงกิ่งขยายเป็น **766 กิ่ง 14 หมวด**
แต่คำเดิมยังไม่เคยถูกเอามาเทียบกับกิ่งใหม่เหล่านั้นเลย · งานของคุณคือดูใหม่ทีละคำ

## ไฟล์ที่ต้องอ่าน
- `in.jsonl` — คำที่ต้องพิจารณา บรรทัดละคำ
- `BRANCHES.md` — กิ่งทั้ง 766 พร้อมนิยาม และป้ายบอกว่ากิ่งไหนมีคำอยู่แล้ว/ยังว่าง

## ต้องตอบ 4 อย่างต่อคำ

1. **กิ่งเดิมยังใช่ไหม** (`keep`) — ดูช่อง `now` ถ้าทุกกิ่งยังถูกต้อง ตอบ `true`
2. **กิ่งที่สงสัย** (`doubt`) — กิ่งเดิมที่คิดว่าไม่เข้าแล้ว **ระบบจะไม่ลบให้ แค่ตั้งธงไว้ให้เจ้าของเคาะ**
3. **กิ่งที่ควรเพิ่ม** (`add`) — กิ่งที่คำนี้อยู่ได้อีก โดยเฉพาะกิ่งใหม่ 509 กิ่งที่คลังเดิมยังไม่เคยแตะ
4. **คำที่ควรสกัดออกมา** (`extract`) — คำงามที่ซ่อนอยู่ในวลี พร้อมกิ่งของคำนั้นเอง

---

## 🚨 กฎเหล็ก 3 ข้อ (ผิดข้อไหน = งานทั้งรอบใช้ไม่ได้)

1. **ห้ามลบ ห้ามแก้ ห้ามแทนที่คำต้นฉบับ** — ช่อง `text` ที่ตอบกลับต้องเหมือน `in.jsonl` ทุกตัวอักษร
   การสกัดคำ = **เพิ่มคำใหม่แยกออกมา วลีเดิมต้องอยู่ครบเสมอ**
2. **ห้ามประกอบคำขึ้นเอง** — คำที่สกัดต้องเป็นข้อความ **ต่อเนื่องกัน** ที่ตัดออกมาจากวลีเดิมเท่านั้น
   ❌ ผิด: จาก `แสงจันทร์จึงสอดส่อง` เสนอ `แสงจันทร์สอดส่อง` (หยิบคนละท่อนมาต่อกัน)
   ✅ ถูก: เสนอ `แสงจันทร์` และ `สอดส่อง` แยกกัน
   (เคยเกิดจริงในงานรอบก่อน จับได้ด้วยเครื่องตรวจ)
3. **ห้ามเสนอคำที่มีอยู่แล้ว** — ดูช่อง `already_inside` ถ้าคำนั้นอยู่ในคลังแล้ว **ห้ามใส่ใน `extract`**
   ให้ใส่ใน `add` ของคำนั้นแทน (ติดกิ่งเพิ่มให้ของเดิม ไม่สร้างคำซ้ำ)

## 🌿 กฎกิ่ง
- เส้นทางต้องคัดลอกจาก `BRANCHES.md` **ให้ตรงเป๊ะ** (ตัวคั่น `" / "` เดิม)
- ลึก **1–3 ชั้น** · **ห้ามขึ้นต้นเส้นทางด้วยชื่อหมวดตัวเอง** (หมวดนี้ชื่อ "{catname}")
- ปกติ **1–3 กิ่งต่อคำ ห้ามเกิน 4**
- **คำเปรียบ** (ราวกับ/ดุจ/ประหนึ่ง/เหมือน/คล้าย) ต้องติด **ทั้งกิ่งคำเปรียบ และกิ่งของสิ่งที่มันสื่อถึงจริง ๆ**
- **เลือกกิ่งว่างที่มีอยู่แล้วก่อนเสมอ** — มี 509 กิ่งที่คลังเดิมยังไม่แตะ ตั้งกิ่งใหม่เฉพาะเมื่อไม่มีอะไรรับจริง ๆ
- ตั้งกิ่งใหม่ได้ แต่ต้องเขียนลง `newbrK.json` พร้อมเหตุผล

## 📖 หมวด 15 บทบรรยาย
คำที่ยาวเกิน 30 ตัวอักษรและร่ายยาวหลายภาพ ให้ควบกิ่ง **หมวด 15** ด้วย
**แต่ต้องคงกิ่งเนื้อหาจริงไว้เสมอ** — หมวด 15 เป็น "ชั้นวาง" ไม่ใช่ "ที่กักคำ"
ถ้าอยู่หมวด 15 อย่างเดียว คนค้นคำว่า "ท้องฟ้า" จะไม่มีวันเจอวลีนั้น

---

## 📜 กฎจากคำสั่ง AI ที่เว็บใช้จริง (`lib/prompt.js` ฉบับที่ ๘ · ยกมาเต็ม ห้ามข้าม)

{rules}

---

## รูปแบบคำตอบ

เขียน **`outK.jsonl`** (K = เลขตัวคุณ) บรรทัดละคำ เรียงตาม `i` ครบทุกคำ ห้ามขาด

```json
{{"i":0,"text":"คำเดิมเป๊ะ ๆ","keep":true,"doubt":[],"add":[{{"c":"c4","p":"กิ่ง / กิ่งย่อย","why":"เหตุผลสั้น"}}],"extract":[{{"w":"คำที่สกัด","paths":[{{"c":"c7","p":"กิ่ง / กิ่งย่อย"}}],"meaning":null,"kind":"word"}}],"meaning":"ความหมายไม่เกิน 60 ตัวอักษร","reason":null}}
```

และ **`newbrK.json`** สำหรับกิ่งใหม่ที่ขอตั้ง (ไม่มีก็ใส่ `[]`)

```json
[{{"c":"c7","p":"ชื่อกิ่งไทย","en":"English Name","def":"นิยามสั้น","why":"ทำไมกิ่งเดิม 766 กิ่งรับไม่ได้"}}]
```

- `keep` = `true` เมื่อกิ่งเดิมทุกกิ่งยังถูกต้อง
- `doubt` = รายการเส้นทางกิ่งเดิมที่สงสัย (สตริงตรง ๆ ตามที่อยู่ใน `now`)
- `meaning` เขียนเฉพาะคำที่ควรอธิบาย (คำวรรณกรรม/คำโบราณ/สำนวน) ไม่เกิน 60 ตัวอักษร · คำธรรมดาใส่ `null`
- `reason` เขียนเฉพาะ 4 กรณีที่คุ้ม (อยู่หลายกิ่ง · อาจจัดไปหมวดอื่นได้ · เสนอกิ่งใหม่ · ไม่มั่นใจ) ไม่เกิน 100 ตัวอักษร · นอกนั้น `null`
'''

if __name__ == '__main__':
    main()
