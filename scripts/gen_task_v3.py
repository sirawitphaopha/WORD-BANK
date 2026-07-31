#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้างชุดโจทย์รอบที่ 3 — แบบประหยัด (อังกฤษ + รหัสกิ่ง + ไม่มีนิยาม)

เจ้าของคลังสั่ง 31 ก.ค. 2569: ลดต้นทุนโทเคนโดยไม่ลดความแม่น
  · ส่งชื่อกิ่งเป็นภาษาอังกฤษ (ทุกกิ่งมีชื่ออังกฤษครบอยู่แล้ว)
  · ไม่ส่งนิยาม (นิยามเป็นไทย ถ้าส่งก็เท่ากับส่งไทยอยู่ดี)
  · จัดเป็นต้นไม้ ไม่พิมพ์เส้นทางเต็มซ้ำทุกเส้น
  · ให้ผู้ช่วยตอบเป็น "รหัสกิ่ง" แทนการพิมพ์ชื่อกิ่งเอง

🔑 ผลพลอยได้ที่สำคัญกว่าการประหยัด — ให้เลขเฉพาะกิ่งที่ลงคำได้ (640 กิ่ง)
   กิ่งที่เป็นหัวข้อ (มีกิ่งลูก) ไม่มีเลขให้เลือก → **ผู้ช่วยเลือกผิดกฎไม่ได้เลยโดยโครงสร้าง**
   ไม่ต้องหวังพึ่งว่าผู้ช่วยจะจำกฎ "คำต้องลงกิ่งลึกสุดของสาย" ได้

เขียน:
  docs/m2-sense/round3/BRANCHES.md   รายนามกิ่ง (อังกฤษ + รหัส + ต้นไม้)
  docs/m2-sense/round3/TASK.md       คำสั่งฉบับอังกฤษ (ส่งจริง)
  docs/m2-sense/round3/TASK-TH.md    คำสั่งฉบับไทย (เจ้าของอ่าน — ไม่ได้ส่ง)
  docs/m2-sense/round3/in.jsonl      โจทย์ (id + w เท่านั้น)

ใช้: python3 scripts/gen_task_v3.py [--limit 400]
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/m2-sense/round3', *a)

BD = json.load(open(P('docs/branches-data.json'), encoding='utf-8'))
NO = {c['id']: c['no'] for c in BD['categories']}
CAT_EN = {c['id']: (c.get('name_en') or c['name_th']) for c in BD['categories']}


def build_branches():
    """รายนามกิ่งแบบต้นไม้ · ชื่ออังกฤษ · รหัสเฉพาะกิ่งที่ลงคำได้"""
    by = collections.defaultdict(list)
    for b in BD['branches']:
        by[b['category_id']].append(b)
    L = ['# Branch Index', '',
         'Pick branches ONLY from this list, by CODE.',
         'A line WITH a code = you may assign items to it.',
         'A line WITHOUT a code (ends with `:`) = a heading only. NEVER assign items to it —',
         'its children below are the real choices.', '']
    nleaf = nhead = 0
    for c in sorted(BD['categories'], key=lambda x: x['no']):
        cid = c['id']
        bs = by.get(cid, [])
        if not bs:
            continue
        L.append('## %s  [%s]' % (CAT_EN[cid], cid))
        for b in bs:
            depth = b['path'].count(' / ')
            name = b['en']
            has_child = any(o['path'].startswith(b['path'] + ' / ') for o in bs)
            if has_child:
                L.append('%s%s:' % ('  ' * depth, name))
                nhead += 1
            else:
                L.append('%s%s %s' % ('  ' * depth, b['code'], name))
                nleaf += 1
        L.append('')
    return '\n'.join(L), nleaf, nhead


TASK_EN = """# Task — Review each item: write its meanings, then assign branches

You are a Thai linguist and literary specialist maintaining a novelist's word bank.

## What you get

- `in.jsonl` — items to review. Each line has ONLY `id` and `w` (the Thai text).
- `BRANCHES.md` — every branch you may choose from, listed by CODE.

**You will NOT see the branches this item currently has, its category, or — if it was
cut out of a longer phrase — that phrase. All of it is hidden on purpose.**
That inheritance is exactly the bug being fixed: extracted words were given the
branches of the phrase they came from, so they ended up in branches unrelated to
what the word itself means.

Judge every item from the text in front of you and nothing else.

## Rule 1 — Meanings first, branches second. Never the other way round.

For each item, list EVERY distinct sense the text can carry, then pick branches to
cover those senses. Do not guess a category first and then justify it.

`เสียว` reads four different ways, so it needs four meanings and lands in five branches:
  · a sharp tingle in the body (เสียวฟัน)     → pain / skin-sensation branches
  · a thrill of danger when seeing something risky → suspense branch
  · sexual arousal                              → desire branch
  · a jolt of fear in the chest                 → fear branch
Had you decided "this is a body word" upfront, three of those four senses would be lost forever.

## Rule 2 — No cap on how many branches

If an item genuinely fits 100 branches, give it 100.
A branch answers "what stories can this word tell", NOT "how many dictionary senses it has".

`โอนเอน` has one dictionary sense (swaying, unsteady) but tells six different stories:
standing unsteadily · drunken walking · a wavering heart · being swayed by others ·
indecision · shadows of leaves swaying. It must get all six.

But do NOT pad the list. Every branch must pass Rule 3. One branch is a fine answer
when only one truly fits.

## Rule 3 — The subject test (decisive)

Look at what the branch NAME is, then ask the matching question:

| Branch name is | Ask |
|---|---|
| a state / action / manner | "Can this text describe that?" — yes = include |
| a thing / body part / object | "IS this text the name of that thing?" — no = EXCLUDE |

`ปรก` means "to drape or hang over from above". It does NOT mean beard, hair, or leaves.
  · `ปรก` alone            → only branches about covering/draping
  · `กิ่งไม้ปรกลงมา`        → subject is กิ่งไม้ (a branch of a tree) → may go in plant branches
  · `หนวดเคราปรกหน้ารุงรัง` → subject is หนวดเครา (beard) → may go in beard branches

Before adding any branch, ask: "does the subject appear inside this text itself?"
If the text names only a state or manner, never guess what the subject might be
and file it under that.

`ง่าม` (a fork/crotch shape) is a shape word — it appears in ง่ามขา, ง่ามนิ้ว and more.
It belongs to shape branches, not to leg or finger branches.

## Rule 4 — Every item must have meanings. Never leave them empty.

- `meanings` is a LIST — one entry per distinct sense.
- One sense = one entry. Four senses = four entries. Never merge them into one sentence.
- **Keep each meaning under 100 Thai characters**, except for long narrative passages,
  which may run longer when needed to carry the whole picture.
- Describe the TEXT, not a scene. (`ยืดคอมองข้ามสิ่งกีดขวาง` ✓ · `ตัวละครกำลังมองหาบางอย่าง` ✗)
- **Write meanings in Thai.**

## Rule 5 — Answer with branch CODES only

- Copy codes exactly from `BRANCHES.md` (e.g. `A01-03-002`).
- Lines without a code are headings — they are not valid answers.
- Every item needs at least one branch.

## Rule 6 — Proposing a new branch

If nothing in the list can hold an item, propose one in `new_paths`:
`{"parent":"A03-02-000","th":"ชื่อกิ่งภาษาไทย","en":"English Name","why":"why nothing existing fits"}`

- `parent` = the code of the branch it should hang under.
- Give both a Thai name and an English name.
- Do NOT invent a code — the owner assigns codes later, after reviewing your proposal.
- Name it broadly enough that other similar words can join it later.
- Usually this is `[]`.

## Spelling doubts

The owner dictates by voice, so a misspelling can arrive looking like a real Thai word.
If you suspect the text is not an actual Thai word, set
`"suspect": "⚠ ไม่แน่ใจว่ามีคำว่า X ในภาษาไทย · น่าจะเป็น Y"` — always propose the word
you think it should be. Otherwise `null`.
(Real case: `พลวัน` was stored, categorised and branched before anyone noticed the
correct word was `พัลวัน`.)

## Never

- 🔒 NEVER change even one character of `w`. It must match the input exactly.
  Suspected misspellings go in `suspect`, nowhere else.
- 🔒 NEVER skip an item or answer the same id twice.
- 🔒 NEVER write a branch name into `paths` — codes only.
- 🔒 NEVER guess which phrase an item was cut from and use that to pick branches.

## Output — write as you go, one item at a time

Write JSONL, one line per item, in the original id order.

🚨 **Append each answer to the output file as soon as you finish that item.**
Do NOT hold answers in memory and write them all at the end.
A previous run was cut off mid-way and every answer that had not been written was lost.
Writing continuously means an interruption costs only the item in progress.

```
{"id":1,"w":"กรอบแกรบ","suspect":null,"meanings":["เสียงเบาแห้งที่เกิดจากของแห้งเสียดสีหรือถูกเหยียบ"],"paths":["D09-01-000"],"new_paths":[]}
```
"""

TASK_TH = """# คำสั่งฉบับไทย (ให้เจ้าของคลังอ่าน — ไม่ได้ส่งให้ผู้ช่วย)

> 🔑 ฉบับที่ส่งจริงคือ `TASK.md` ภาษาอังกฤษ · ไฟล์นี้แปลไว้ให้อ่านตรวจว่าสั่งถูกไหม

คุณเป็นนักภาษาศาสตร์และผู้เชี่ยวชาญวรรณกรรมไทย กำลังดูแลคลังคำของนักเขียนนิยาย

## สิ่งที่ได้รับ

- `in.jsonl` — รายการที่ต้องทบทวน แต่ละบรรทัดมีแค่ `id` กับ `w` (ตัวข้อความไทย)
- `BRANCHES.md` — กิ่งทั้งหมดที่เลือกได้ ระบุด้วยรหัส

**คุณจะไม่เห็นกิ่งที่รายการนี้ติดอยู่ตอนนี้ ไม่เห็นหมวดเดิม และถ้าเป็นคำที่ตัดมาจากวลียาว
ก็จะไม่เห็นวลีนั้น — ปิดไว้ทั้งหมดโดยตั้งใจ**
เพราะการสืบทอดกิ่งแบบนั้นคือบั๊กที่กำลังแก้อยู่ คำที่สกัดออกมาถูกยกกิ่งของวลีแม่มาให้
เลยไปกองอยู่ในกิ่งที่ไม่เกี่ยวกับความหมายของตัวคำเลย

ตัดสินทุกรายการจากข้อความที่เห็นตรงหน้าเท่านั้น

## กฎ 1 — เขียนความหมายก่อน แล้วค่อยเลือกกิ่ง ห้ามสลับลำดับ

ไล่ทุกความหมายที่ข้อความนี้สื่อได้ให้ครบก่อน แล้วค่อยเลือกกิ่งให้ครอบคลุมทุกความหมาย
ห้ามเดาหมวดก่อนแล้วค่อยหาเหตุผลมารองรับ

`เสียว` อ่านได้ 4 ทาง จึงต้องมี 4 ความหมาย และลงได้ 5 กิ่ง
  · แปลบวาบที่ผิวหรืออวัยวะ (เสียวฟัน) → กิ่งเจ็บปวด / สัมผัสบนผิว
  · หวาดเสียวระทึกเมื่อเห็นสิ่งล่อแหลม → กิ่งลุ้นระทึก
  · เสียวซ่านเชิงกามารมณ์               → กิ่งราคะ
  · วาบขึ้นในใจเพราะกลัว                 → กิ่งหวาดกลัว
ถ้าตัดสินตั้งแต่แรกว่า "คำนี้เป็นคำทางกาย" อีก 3 ความหมายจะหายไปตลอดกาล

## กฎ 2 — ไม่มีเพดานจำนวนกิ่ง

ถ้ารายการนั้นเข้าได้จริง 100 กิ่ง ก็ต้องให้ครบ 100
กิ่งตอบคำถามว่า "คำนี้เอาไปเล่าเรื่องอะไรได้บ้าง" ไม่ใช่ "มีกี่ความหมายในพจนานุกรม"

`โอนเอน` มีความหมายเดียวในพจนานุกรม (แกว่งไปมาไม่มั่นคง) แต่เล่าได้ 6 เรื่อง
ยืนโอนเอน · เมาแล้วเดินโอนเอน · ใจโอนเอน · โอนเอนตามคำคนอื่น · ตัดสินใจไม่ได้ ·
เงาไม้โอนเอน → ต้องได้ครบ 6

แต่ห้ามยัดกิ่งให้ดูเยอะ ทุกกิ่งต้องผ่านกฎ 3 · ถ้าเข้าได้กิ่งเดียวจริง ๆ กิ่งเดียวก็ถูกแล้ว

## กฎ 3 — กฎดูที่ประธาน (ตัวชี้ขาด)

ดูก่อนว่าชื่อกิ่งเป็นแบบไหน แล้วถามคำถามให้ตรงแบบ

| ชื่อกิ่งเป็น | ต้องถามว่า |
|---|---|
| อาการ / การกระทำ / ลักษณะท่าที | "ข้อความนี้ใช้เล่าอาการนั้นได้ไหม" ได้ = เข้า |
| ชื่อของ / อวัยวะ / สิ่งของ | "ข้อความนี้เป็นชื่อของสิ่งนั้นไหม" ไม่ใช่ = ไม่เข้า |

`ปรก` แปลว่าแผ่ปกคลุมลงมาจากข้างบน ไม่ได้แปลว่าหนวดเครา ไม่ได้แปลว่าผม ไม่ได้แปลว่าใบไม้
  · `ปรก` เดี่ยว ๆ         → เข้าได้แค่กิ่งที่ว่าด้วยการปกคลุม
  · `กิ่งไม้ปรกลงมา`        → ประธานคือกิ่งไม้ → เข้ากิ่งพืชพรรณได้
  · `หนวดเคราปรกหน้ารุงรัง` → ประธานคือหนวดเครา → เข้ากิ่งหนวดและเคราได้

ก่อนใส่กิ่งทุกเส้น ให้ถามว่า "ประธานอยู่ในตัวข้อความนี้เองไหม"
ถ้าข้อความบอกแค่อาการหรือลักษณะ ห้ามเดาว่าประธานน่าจะเป็นอะไรแล้วเอาไปลงกิ่งของสิ่งนั้น

`ง่าม` เป็นคำบอกรูปทรง โผล่ได้ทั้งใน ง่ามขา ง่ามนิ้ว และอื่น ๆ
จึงอยู่กิ่งรูปทรง ไม่ใช่กิ่งขาหรือกิ่งนิ้ว

## กฎ 4 — ทุกรายการต้องมีความหมาย ห้ามเว้นว่าง

- `meanings` เป็น **รายการ** — 1 ช่องต่อ 1 ความหมาย
- 1 ความหมาย = 1 ช่อง · 4 ความหมาย = 4 ช่อง ห้ามยัดรวมเป็นประโยคเดียว
- **ความหมายละไม่เกิน 100 ตัวอักษร** ยกเว้นบทบรรยายยาวที่ต้องยาวได้ตามเนื้อความ
- อธิบาย **ตัวข้อความ** ไม่ใช่เล่าฉาก (`ยืดคอมองข้ามสิ่งกีดขวาง` ✓ · `ตัวละครกำลังมองหาบางอย่าง` ✗)
- **เขียนความหมายเป็นภาษาไทย**

## กฎ 5 — ตอบด้วยรหัสกิ่งเท่านั้น

- คัดลอกรหัสจาก `BRANCHES.md` ให้ตรงตัว (เช่น `A01-03-002`)
- บรรทัดที่ไม่มีรหัสคือหัวข้อ เลือกไม่ได้
- ทุกรายการต้องมีอย่างน้อย 1 กิ่ง

## กฎ 6 — การเสนอกิ่งใหม่

ถ้าไม่มีกิ่งไหนในรายการรับได้เลย ให้เสนอใน `new_paths`
`{"parent":"A03-02-000","th":"ชื่อกิ่งภาษาไทย","en":"English Name","why":"ทำไมของเดิมรับไม่ได้"}`

- `parent` = รหัสของกิ่งที่ควรแขวนอยู่ใต้
- ต้องให้ทั้งชื่อไทยและชื่ออังกฤษ
- **ห้ามคิดรหัสเอง** เจ้าของคลังจะเป็นคนลงรหัสให้ทีหลังหลังพิจารณาแล้ว
- ตั้งชื่อให้กว้างพอที่คำแนวเดียวกันจะมาอยู่ร่วมได้
- ปกติเป็น `[]`

## คำที่สงสัยว่าสะกดผิด

เจ้าของคลังพิมพ์ด้วยเสียง คำผิดจึงมาถึงในรูปที่ดูเหมือนคำไทยจริงได้
ถ้าสงสัยว่าไม่มีคำนี้ในภาษาไทย ให้ใส่
`"suspect": "⚠ ไม่แน่ใจว่ามีคำว่า X ในภาษาไทย · น่าจะเป็น Y"` — **ต้องเสนอคำที่คิดว่าใช่เสมอ**
ถ้าไม่สงสัยให้เป็น `null`
(เคสจริง: `พลวัน` ถูกเก็บ จัดหมวด ติดกิ่งไปเรียบร้อย กว่าจะรู้ว่าคำที่ถูกคือ `พัลวัน`)

## ห้าม

- 🔒 ห้ามแก้ตัวอักษรของ `w` แม้แต่ตัวเดียว ต้องตรงกับโจทย์เป๊ะ
  สงสัยสะกดผิดให้ใช้ช่อง `suspect` เท่านั้น
- 🔒 ห้ามข้ามรายการ ห้ามตอบซ้ำ id เดิม
- 🔒 ห้ามเขียนชื่อกิ่งลงใน `paths` ใส่ได้แต่รหัส
- 🔒 ห้ามเดาว่าข้อความนี้ถูกตัดมาจากวลีอะไร แล้วเอาไปใช้เลือกกิ่ง

## รูปแบบคำตอบ — เขียนไปเรื่อย ๆ ทีละรายการ

ตอบเป็น JSONL บรรทัดละ 1 รายการ เรียงตาม id เดิม

🚨 **ตอบเสร็จรายการไหน เขียนต่อท้ายไฟล์ทันทีรายการนั้น**
ห้ามเก็บคำตอบไว้ในหัวแล้วเขียนทีเดียวตอนจบ
รอบก่อนถูกตัดกลางคัน คำตอบที่ยังไม่ได้เขียนหายหมดทุกบรรทัด
เขียนไปเรื่อย ๆ แปลว่าถ้าถูกตัด เสียแค่รายการที่กำลังทำอยู่รายการเดียว

```
{"id":1,"w":"กรอบแกรบ","suspect":null,"meanings":["เสียงเบาแห้งที่เกิดจากของแห้งเสียดสีหรือถูกเหยียบ"],"paths":["D09-01-000"],"new_paths":[]}
```
"""


def main():
    limit = None
    for i, a in enumerate(sys.argv):
        if a == '--limit' and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    os.makedirs(D(), exist_ok=True)

    br, nleaf, nhead = build_branches()
    open(D('BRANCHES.md'), 'w', encoding='utf-8').write(br)
    open(D('TASK.md'), 'w', encoding='utf-8').write(TASK_EN)
    open(D('TASK-TH.md'), 'w', encoding='utf-8').write(TASK_TH)

    # โจทย์ — เอาจาก todo.jsonl (รายการที่ยังไม่ทบทวน) ตามลำดับ id เดิม ไม่สุ่ม
    todo = [json.loads(l) for l in open(P('docs/m2-sense/round2/todo.jsonl'), encoding='utf-8') if l.strip()]
    rows = todo[:limit] if limit else todo
    with open(D('in.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            # 🔒 ปิดตา: มีได้แค่ id กับ w เท่านั้น
            f.write(json.dumps({'id': r['id'], 'w': r['w']}, ensure_ascii=False) + '\n')

    # ── ด่านตรวจไฟล์โจทย์ ──
    bad = [r for r in (json.loads(l) for l in open(D('in.jsonl'), encoding='utf-8'))
           if set(r.keys()) != {'id', 'w'}]
    if bad:
        print('🔴 ไฟล์โจทย์มีช่องเกิน %d บรรทัด' % len(bad))
        return 1

    kb = lambda p: os.path.getsize(D(p)) / 1024
    print('รายนามกิ่ง : %6.1f KB · ลงคำได้ %d กิ่ง (มีรหัส) · หัวข้อ %d กิ่ง (ไม่มีรหัส)'
          % (kb('BRANCHES.md'), nleaf, nhead))
    print('คำสั่งอังกฤษ: %6.1f KB' % kb('TASK.md'))
    print('คำสั่งไทย   : %6.1f KB  (ไม่ได้ส่ง · ให้เจ้าของอ่าน)' % kb('TASK-TH.md'))
    print('โจทย์      : %6.1f KB · %d รายการ (id %d–%d)'
          % (kb('in.jsonl'), len(rows), rows[0]['id'], rows[-1]['id']))
    print()
    old = (os.path.getsize(P('docs/m2-sense/round2/BRANCHES.md'))
           + os.path.getsize(P('docs/m2-sense/round2/TASK.md'))) / 1024
    new = kb('BRANCHES.md') + kb('TASK.md')
    print('ก้อนที่ส่งให้ผู้ช่วยต่อ 1 ตัว: %.1f KB → %.1f KB  (เหลือ %.0f%%)' % (old, new, 100 * new / old))
    return 0


if __name__ == '__main__':
    sys.exit(main())
