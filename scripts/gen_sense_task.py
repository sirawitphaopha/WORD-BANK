#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เตรียมโจทย์ขั้น "นิยาม + จัดกิ่ง" ของ M2 → docs/oldwords/sense/in.jsonl

ใช้: python3 scripts/gen_sense_task.py

🔒 **หัวใจของ M2 — ไฟล์โจทย์มีแค่ "ตัวคำ" เท่านั้น**
   ห้ามใส่ วลีตั้งต้น · กิ่งที่คำนั้นติดอยู่ตอนนี้ · หมวดเดิม
   เพราะทั้งหมดคือบริบทที่ทำให้เกิดปัญหา — ผู้ช่วยเห็นวลีตั้งต้นแล้วลอกกิ่งของมันมาให้คำลูก

   พี่กันจับได้จากคำว่า `เสียว` ที่ตัดมาจาก `เสียวสันหลังวาบด้วยความหวาดกลัว`
   แล้วได้กิ่ง "หวาดกลัวและขวัญผวา" ติดมา ทั้งที่ตัวคำใช้ได้อีก 4 ทาง

ตรวจด้วยเครื่องแล้วพบว่าคำสกัด 49 คำ (12%) ได้กิ่งเหมือนวลีตั้งต้นเป๊ะทุกกิ่ง
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUTDIR = P('docs/oldwords/sense')


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    src = json.load(open(P('docs/oldwords-branches.json'), encoding='utf-8'))
    ws = [w for w in src['words'] if w.get('source')]     # เฉพาะคำที่สกัดมาจากวลี

    rows = []
    for i, w in enumerate(sorted(ws, key=lambda x: x['text']), 1):
        rows.append({'id': i, 'w': w['text']})            # ‼️ มีแค่ 2 ช่อง ห้ามเพิ่ม

    with open(os.path.join(OUTDIR, 'in.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

    # เก็บ "คำตอบเดิม" ไว้ต่างหาก — ใช้ตอนเทียบทีหลังเท่านั้น ห้ามส่งให้ผู้ช่วย
    now = {}
    for w in ws:
        now[w['text']] = {
            'source': w['source'], 'source_others': w.get('source_others') or [],
            'meaning': w.get('meaning'),
            'paths': [{'c': p['category_id'], 'p': p['path']} for p in w.get('all_paths', [])],
        }
    json.dump(now, open(os.path.join(OUTDIR, 'before.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    half = (len(rows) + 1) // 2
    print('เขียน %s/in.jsonl' % OUTDIR)
    print('  คำสกัดที่ต้องทบทวน %d คำ · ในไฟล์โจทย์มีแค่ช่อง id กับ w (ไม่มีวลีตั้งต้น ไม่มีกิ่งเดิม)' % len(rows))
    print('  แบ่งงาน: ก้อน 1 = บรรทัด 1-%d · ก้อน 2 = บรรทัด %d-%d' % (half, half + 1, len(rows)))
    print('  ยังไม่มีความหมาย %d คำ' % sum(1 for w in ws if not w.get('meaning')))


if __name__ == '__main__':
    main()
