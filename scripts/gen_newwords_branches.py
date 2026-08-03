#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ประกอบผลการจัดคำของ "คลังคำชุดใหม่" → docs/newwords-branches.json + docs/newwords-branches.md

🚨 คลังชุดนี้ **แยกจากคลังเดิม 680 คำ** เด็ดขาด (พี่กันสั่ง 25 ก.ค. 2569)
   - อ่านโครงกิ่งเดิมจาก docs/branches-data.json แบบ "อ่านอย่างเดียว" ไว้เป็นฐานเทียบ
   - **ไม่เขียนทับไฟล์ของคลังเดิมสักไฟล์**

ที่มาของข้อมูล
   - docs/archive/newwords-round/newwords-clean.txt   วลีดิบ 1,329 บรรทัด (คำต้นฉบับ ห้ามแก้ ห้ามยุบ)
   - docs/archive/newwords-round/newwords-picked.md   คำที่พี่กันคัดด้วยเครื่องมือลากนิ้ว 675 แถว
   - ผลการจัดกิ่ง (ไฟล์ jsonl ที่ตัวจัดคำเขียนไว้) + กิ่งใหม่ที่เสนอ

วิธีใช้
   python3 scripts/gen_newwords_branches.py <โฟลเดอร์ที่เก็บ out*.jsonl>
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1] if len(sys.argv) > 1 else '.'

def p(*a): return os.path.join(ROOT, *a)

# ชื่อนิยายต้นทางของคลังชุดนี้ (พี่กันบอกเอง 26 ก.ค. 2569)
# ตรงกับคอลัมน์ novel ในตาราง wb_words และ wb_review
NOVEL = 'คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ'


# ─────────────────────────────────────────────
# คำที่ "เครื่องมือคัดคำตัดผิด" ไม่ใช่คำที่พี่กันตั้งใจเลือก
# ─────────────────────────────────────────────
# ที่มา: ตัวซอยคำไทยของเบราว์เซอร์ในเครื่องมือลากนิ้ว (docs/archive/newwords-round/newwords-picker.html)
# ซอยคำผิด เช่น "ปล่อยก๊ากออกมา" ถูกตัดเป็น ปล่อย|ก๊า|กอ|อก|มา (ไม่มี "ก๊าก" ให้เลือกเลย)
# พี่กันพูดเองตอนเห็นคำพวกนี้ (25 ก.ค. 2569):
#   "4 ข้อนั้น คือระบบเธอกากอ่ะ คิดว่าเราตั้งใจเอาคำพวกนี้ที่ผิดๆมาเหรอ"
# = ยืนยันว่าไม่ใช่คำที่ตั้งใจ → แก้กลับเป็นรูปที่ถูกได้เลย ไม่ต้องถามซ้ำ
# 🚨 ใช้ได้เฉพาะ "คำสกัด" ที่เครื่องมือตัดผิดเท่านั้น — ห้ามใช้แก้วลีดิบเด็ดขาด
CUT_FIX = {
    'ก๊า': 'ก๊าก',            # จากวลี "ปล่อยก๊ากออกมาอย่างสุดกลั้น"
    'หลุบตาลงอ': 'หลุบตาลง',  # จากวลี "หลุบตาลงอย่างเศร้าสร้อย"
}

# ข้อความ 2 บรรทัดที่พี่กันสั่งแก้ในไฟล์คลัง (26 ก.ค.) — ตัวจัดคำทำงานก่อนแก้
# จึงยังถือข้อความรูปเดิมอยู่ · ใส่ไว้เพื่อไม่ให้ตัวตรวจรายงานว่าเป็นปัญหา
SRC_EDITED = {
    '﻿1. สะพรึง': 'สะพรึง',                                  # ตัดเลขลำดับที่ติดมาจากตอนแกะไฟล์
    'สีหน้าของ [คน] ซีดเซียว': 'สีหน้าของ [ชื่อคน] ซีดเซียว',      # ทำวงเล็บให้ตรงกับทั้งไฟล์
    # พี่กันอ่านเจอเอง: "เราว่าไม่น่าจะมีคำว่าฉันละ น่าจะติดมาตอนพูด"
    # ตรวจแล้วมีที่เดียวในไฟล์ และไม่มีวลีอื่นขึ้นต้นด้วยสรรพนามแบบนี้เลย = เศษจากการพูดจริง
    'ฉันละสยองวาบราวถูกน้ำสาดเลยเชียว': 'สยองวาบราวถูกน้ำสาดเลยเชียว',
}

# ─────────────────────────────────────────────
# บทที่พี่กันอ่านแล้วบอกว่า "ไม่เอา" ออกจากหมวด 15 (26 ก.ค. 2569)
# ─────────────────────────────────────────────
# 🔑 เอาออกจาก "หมวด 15" เท่านั้น — คำยังอยู่ในคลังครบ และยังติดกิ่งเนื้อหาจริงของมันเหมือนเดิม
#    ทั้งสิบบทเป็นวลีภาพเดียวจบ ไม่ใช่บทร่ายยาวพรรณนาตามที่พี่กันนิยามไว้
DROP_FROM_NARRATION = {
    'ใบหน้าของ [ชื่อคน] เปล่งปลั่งเป็นประกาย',
    'เสียง [ชื่อคน] หมองหม่นลงกะทันหัน',
    'รูปร่างของ [ชื่อคน] ได้สัดส่วน',
    'ฟันของ [ชื่อคน] กระทบกันกึกๆ',
    'ชายเสื้อเสียดสีกันแผ่วเบา',
    '[ชื่อคน] ครุ่นคิดชั่วขณะ',
    'แก้มของ [ชื่อคน] แดงก่ำ',
    'หัวใจของเขาเต้นโครมคราม',
    'ความหวั่นไหวพลันสงบลง',
    '[ชื่อคน] ทำคอย่น',
}

# ─────────────────────────────────────────────
# กิ่งควบที่พี่กันสั่งเพิ่ม (26 ก.ค. 2569 · ตอบข้อสงสัยข้อ 9 กับ 10)
# ─────────────────────────────────────────────
# ข้อ 10 พี่กันตอบ: "คำทับศัพท์ ก็ต้องควบทั้งสองหมวดได้ ไม่มีข้อห้าม"
#   → คำในหมวด 7 ที่มีความหมายชัดว่าเป็นของ/คน/พืช ให้ติดกิ่งตามความหมายด้วย
# ข้อ 9 พี่กันตอบ: "เย็นชืด สร้างกิ่งรสชาติก็ได้นี่" และ
#   "ง่าม มันง่ามขา ง่ามนิ้ว ง่ามโน้นนี่ มันเหมือนคำที่สื่อถึงลักษณะไหม"
EXTRA_PATHS = {
    # ── คำทับศัพท์ควบหมวดตามความหมาย ──
    'เนกไท':                ['c9|เครื่องแต่งกายและเสื้อผ้า / ประเภทชุดและชิ้นส่วนทั่วไป'],
    'สเวตเตอร์':            ['c9|เครื่องแต่งกายและเสื้อผ้า / ประเภทชุดและชิ้นส่วนทั่วไป'],
    'ฟลูต':                 ['c9|เครื่องมือและอุปกรณ์ / เครื่องดนตรีและอุปกรณ์มหรสพ'],
    'ภาพสเกตช์':            ['c9|เอกสารและสื่อบันทึก'],
    'โพแทสเซียมไซยาไนด์':   ['c9|อาวุธและยุทโธปกรณ์ / ยาพิษและสารอันตราย'],
    'หินแกรนิต':            ['c9|ของมีค่าและทรัพย์สิน / หินและแร่ธาตุ'],
    'ดอกเตอร์':             ['c10|อาชีพและวิชาชีพ / อาชีพเฉพาะทางและวิชาชีพ'],
    'ตัวสฟิงซ์':            ['c11|สิ่งมีชีวิตในตำนาน'],
    'อักษรอัลฟาเบต':        ['c12|ตัวอักษรและระบบเขียน'],
    # ── ข้อ 9 ──
    'เย็นชืด':              ['c9|อาหารและเครื่องดื่ม / รสชาติและสัมผัสของอาหาร'],
    'ง่าม':                 ['c5|รูปทรงและลักษณะทางกายภาพ'],
    'ก้อนกลม':              ['c5|รูปทรงและลักษณะทางกายภาพ'],
    'สังขาร':               ['c11|หลักธรรมและคำสอน'],
    # พี่กันชี้ 26 ก.ค.: "ชักใย นี่กริยาของสัตว์ก็ได้นะ แมงมุม"
    # = ของจริงที่คำเปรียบนี้สื่อถึงคือแมงมุมชักใย ตรงกับกฎคำเปรียบต้องติดกิ่งของจริงด้วย
    'ชักใย':                ['c2|การเคลื่อนไหวของสัตว์ / ท่าทางและการเคลื่อนไหวของสัตว์'],
    'คอยชักใย':             ['c2|การเคลื่อนไหวของสัตว์ / ท่าทางและการเคลื่อนไหวของสัตว์'],
}

# ─────────────────────────────────────────────
# ซอยกิ่งย่อยเพิ่มตามที่พี่กันสั่ง (26 ก.ค. 2569)
# ─────────────────────────────────────────────
# รูปแบบ: (รหัสหมวด, กิ่งแม่, { ชื่อกิ่งย่อย: [คำที่ลงกิ่งนั้น] })
# คำที่เดิมอยู่ที่ "กิ่งแม่" จะถูกย้ายลงกิ่งย่อยตามรายชื่อ
# คำที่อยู่ได้หลายกิ่งย่อย ใส่ชื่อไว้หลายที่ได้เลย (multi-branch ตามกฎเดิม)
SPLIT = [
    ('c2', 'การกินและการเสพ', {
        'การกินอาหาร': ['กินแกล้ม', 'แทะขนม'],
        'การดื่ม': ['จิบชา', 'เสพสุรา', 'กินแกล้ม'],
        'การเสพของมึนเมาและสารเสพติด': ['เสพสุรา'],
    }),
    ('c2', 'การจัดการสิ่งของและพื้นที่ / การเปิด ปิด และล็อก', {
        'การเปิดและแง้ม': ['แง้มผ้าม่าน', 'แหวกผ้าม่าน', 'แง้ม', 'แหวก'],
        'การปิดและผนึก': ['รูดม่านเข้าหากัน'],
        'การล็อกและปลดล็อก': ['ใส่สลักกุญแจ', 'ลงกลอน', 'ปลดสลัก', 'ถอดสลัก'],
    }),
    ('c2', 'การแต่งกายและการถอดเปลื้อง', {
        'การสวมใส่และจัดชุด': ['สวมสูทเรียบขรึม', 'โกยเนื้อบริเวณหน้าอกให้เข้าที่เข้าทาง'],
        'การถอดและเปลื้องผ้า': ['เปลื้องผ้า'],
    }),
    ('c3', 'คำเลียนเสียง', {
        'เสียงกระทบและแตกหัก': ['โครม', 'โครมคราม', 'กึกๆ', 'สั่นกึกๆ', 'เปรี้ยง'],
        'เสียงเสียดสีและขูดถู': ['แกรกๆ', 'เกาหัวแกรกๆ', 'เกาศีรษะแกรกๆ', 'สวบสาบ',
                                'เสียงชายเสื้อเสียดสีกันสวบสาบดังขึ้น'],
        # 'ก๊า' คือข้อความก่อนแก้คำที่เครื่องมือตัดผิด (ตารางนี้ทำงานก่อน CUT_FIX)
        'เสียงจากปากและร่างกาย': ['เอื๊อก', 'ดังเอื๊อก', 'กลืนน้ำลายดังเอื๊อก', 'ก๊า',
                                 'คิกๆๆ', 'กัดฟันกรอดๆ'],
        'เสียงถี่ซ้ำและแผ่วเบา': ['ต๊อกแต๊ก', 'พิมพ์เสียงต๊อกแต๊กราวลูกเห็บตก', 'หึ่งๆ',
                                 'พั่บๆ', 'กระพือ [สิ่งของ] พั่บๆ'],
        'เสียงฉับพลันและวูบดับ': ['ไฟดับพึ่บ', 'เปรี้ยง'],
    }),
    ('c5', 'น้ำหนัก ระดับ และการเน้นย้ำ / ขนาดและสัดส่วน', {
        'ขนาดใหญ่โต': ['มหึมา', 'ใหญ่โตมโหฬาร', 'มโหฬาร', 'ตั้งตระหง่าน'],
        'ขนาดเล็กและกะทัดรัด': ['ตัวกระจ้อยร่อย', 'กระจ้อยร่อย', 'เล็กกะทัดรัด', 'กะทัดรัด'],
    }),
    ('c9', 'สภาพและความเสียหายของสิ่งของ', {
        'เก่าและทรุดโทรม': ['เก่าคร่ำครึ', 'เก่าปอน', 'คร่ำครึ', 'คร่ำคร่า', 'เก่าคร่ำคร่า',
                           '[สิ่งของ] เก่าคร่ำคร่า', 'ผุแหว่ง', 'ซากรถร้าง'],
        'ยับและเสียรูป': ['ยับยู่ยี่', 'ยู่ยี่', 'ย้วยเสียทรง', 'เสียทรง', 'บิดเบี้ยวผิดรูป',
                         'บิดเบี้ยว', 'ผิดรูป', 'ขยำเป็นก้อนกลม', 'ผ้าขี้ริ้วขาดรุ่งริ่งยับย่น'],
        'ขาดและปริแตก': ['ขาดแควก', 'แตกปริ', 'รอยปริ', 'ขาดผึง', 'รุ่งริ่ง', 'แหว่ง',
                        'ผ้าขี้ริ้วขาดรุ่งริ่งยับย่น'],
        'หักและพังทลาย': ['ง่อนแง่น', 'หักเอียงกระเท่เร่', 'หักกระจุย', 'พังยับเยิน',
                         'ยับเยิน', 'เปราะบาง'],
        'ไหม้และแห้งกรอบ': ['[สิ่งของ] เผาไหม้เกรียมจนแห้งเหี่ยว', 'ไหม้เกรียม', 'แห้งเหี่ยว'],
    }),
]
# กิ่งเดิมที่ถูกแทนที่ด้วยกิ่งย่อยชุดใหม่ — ตัวจัดคำทำงานก่อนซอย จึงยังอ้างชื่อเก่าอยู่
# ย้ายคำจากกิ่งชื่อเก่าไปกิ่งชื่อใหม่ให้ตรงกับที่พี่กันเคาะ
RENAME = {
    ('c2', 'การกินและการเสพ / การดื่มและการเสพของมึนเมา'): 'การกินและการเสพ',
}

# กิ่งของคลังเดิมที่พี่กันสั่งให้เปลี่ยนชื่อ (26 ก.ค. 2569)
# พี่กันสั่ง: "แยกแหละ อันนึงส่วนของอาคาร อันนึงอาคาร"
# กิ่งเดิมชื่อกว้าง (มีคำว่าสิ่งปลูกสร้าง) แต่นิยามเก็บแค่ชิ้นส่วนอาคาร
# จึงแยกเป็น 2 กิ่ง: ส่วนประกอบของอาคาร (ชิ้นส่วน) กับ อาคารและสิ่งปลูกสร้าง (ทั้งชิ้น)
PATH_RENAME = {
    ('c0', 'สถานที่ / ส่วนอาคารและสิ่งปลูกสร้าง'): 'สถานที่ / ส่วนประกอบของอาคาร',
    ('c0', 'สถานที่ / สิ่งปลูกสร้างเดี่ยวและงานโครงสร้างกลางแจ้ง'): 'สถานที่ / อาคารและสิ่งปลูกสร้าง',
}

# กิ่งที่ต้องถอดออกจากคำใดคำหนึ่ง
# 'ก้อนกลม' บอกรูปทรง ไม่ได้บอกขนาด → ย้ายไปกิ่งรูปทรงอย่างเดียว
REMOVE_PATHS = {
    'ก้อนกลม': {('c5', 'น้ำหนัก ระดับ และการเน้นย้ำ / ขนาดและสัดส่วน')},
}

# แปลงเป็นตารางค้นเร็ว: (รหัสหมวด, คำ, กิ่งแม่) → [กิ่งย่อยที่ต้องย้ายไป]
SPLIT_MAP = collections.defaultdict(list)
for _cid, _parent, _subs in SPLIT:
    for _name, _words in _subs.items():
        for _w in _words:
            SPLIT_MAP[(_cid, _w, _parent)].append(_parent + ' / ' + _name)
# ให้ชื่อกิ่งเก่าเข้าตารางเดียวกัน โดยแมปไปหากิ่งแม่ที่ซอยใหม่แล้ว
for (_cid, _old), _new_parent in RENAME.items():
    for (_c, _w, _p), _tgt in list(SPLIT_MAP.items()):
        if _c == _cid and _p == _new_parent:
            SPLIT_MAP[(_cid, _w, _old)] = _tgt


# ─────────────────────────────────────────────
# 1. อ่านของตั้งต้น
# ─────────────────────────────────────────────
def load_sources():
    raw = []
    for i, line in enumerate(open(p('docs/archive/newwords-round/newwords-clean.txt'), encoding='utf-8'), 1):
        t = line.strip()
        if t:
            raw.append({'text': t, 'line': i})

    picked = []
    for line in open(p('docs/archive/newwords-round/newwords-picked.md'), encoding='utf-8'):
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
                      'source': None, 'source_others': [], 'picked_from': [],
                      'by_owner': False, 'note': ''})

    for q in picked:
        t = q['text']
        if t in seen:                                   # ซ้ำ → ยุบเข้าแถวเดิม
            it = items[seen[t]]
            # 🔑 เก็บ "เส้นเชื่อม" ไว้เสมอว่าพี่กันตัดคำนี้ออกมาจากวลีไหนบ้าง
            #    (พี่กันจับได้ 26 ก.ค.: บทบรรยายบทหนึ่งพี่กันตัดไว้ 4 คำ แต่ไฟล์โชว์คำเดียว
            #     เพราะอีก 3 คำมีเป็นบรรทัดเดี่ยวในคลังอยู่แล้ว พอยุบซ้ำแล้วเส้นเชื่อมหายไปด้วย
            #     คำไม่ได้หายจากคลัง แต่ข้อมูลว่ามาจากบทไหนหายไป)
            if q['source'] != it['text'] and q['source'] not in it['picked_from']:
                it['picked_from'].append(q['source'])
            if it['origin'] == 'extract' and q['source'] != it['source'] \
               and q['source'] not in it['source_others']:
                it['source_others'].append(q['source'])
            if q['note'] and q['note'] not in it['note']:
                it['note'] = (it['note'] + ' · ' + q['note']).strip(' ·')
            continue
        seen[t] = len(items)
        items.append({'text': t, 'line': q['line'], 'origin': 'extract',
                      'source': q['source'], 'source_others': [], 'picked_from': [],
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
        got = d.get('text', '').strip()
        if got != it['text'] and SRC_EDITED.get(got) != it['text']:
            # ตัวจัดคำแก้ข้อความ = ห้ามเด็ดขาด ใช้ข้อความต้นฉบับเสมอ
            problems['ข้อความไม่ตรงต้นฉบับ'].append((it['text'], d.get('text')))

        extra = [{'c': x.split('|')[0], 'p': x.split('|')[1]}
                 for x in EXTRA_PATHS.get(it['text'], [])]
        drop_narr = it['text'] in DROP_FROM_NARRATION
        # ซอยกิ่งย่อยตามที่พี่กันสั่ง: คำที่อยู่กิ่งแม่ ให้ย้ายลงกิ่งย่อยที่ตรงกับมัน
        base_paths = []
        for q in list(d.get('paths', [])) + extra:
            # กิ่งที่ถูกเปลี่ยนชื่อ (รวมกิ่งลูกที่ห้อยอยู่ใต้มัน)
            for (rc, ro), rn in PATH_RENAME.items():
                if q.get('c') == rc and (q.get('p') == ro or q.get('p', '').startswith(ro + ' / ')):
                    q = {'c': rc, 'p': rn + q['p'][len(ro):]}
            subs = SPLIT_MAP.get((q.get('c'), it['text'], q.get('p')))
            if subs:
                base_paths += [{'c': q['c'], 'p': s} for s in subs]
            else:
                base_paths.append(q)

        paths, seen_p = [], set()
        rm = REMOVE_PATHS.get(it['text'], set())
        for q in base_paths:
            if drop_narr and q.get('c') == 'c14':
                continue
            if (q.get('c'), q.get('p')) in rm:
                continue
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

        text = it['text']
        cut_fixed = None
        if it['origin'] == 'extract' and text in CUT_FIX:
            cut_fixed, text = text, CUT_FIX[text]

        words.append({
            'text': text, 'cut_fixed_from': cut_fixed, 'kind': kind, 'novel': NOVEL,
            'category_id': paths[0]['category_id'],
            'subpath': paths[0]['path'],
            'subpaths': [x['path'] for x in paths],
            'all_paths': paths,
            'meaning': (d.get('meaning') or None),
            'reason': (d.get('reason') or None),
            'source': it['source'], 'source_others': it['source_others'],
            'picked_from': it.get('picked_from', []),
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
            'source': ['docs/archive/newwords-round/newwords-clean.txt', 'docs/archive/newwords-round/newwords-picked.md'],
            'novel': NOVEL,
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
