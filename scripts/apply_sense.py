#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""เขียนผลรอบนิยาม (M2) กลับเข้า docs/catN-*-redesign.md

ใช้:  python3 scripts/apply_sense.py          ดูผลอย่างเดียว
      python3 scripts/apply_sense.py --write  เขียนจริง

ทำ 3 อย่าง
  ① เพิ่มชิปคำเข้ากิ่งใหม่ (ต่อท้ายบรรทัดคำ — เหมือน apply_picked.py)
  ② **ถอนชิปคำออกจากกิ่งที่ไม่ควรอยู่** ← ของใหม่ ตัวเขียนเดิมทำไม่ได้
  ③ เติมความหมายให้คำที่ตีความได้หลายทาง

🛡 กฎเหล็กของการถอนชิป
   - **แตะเฉพาะชิปของคำที่ระบุเท่านั้น ชิปอื่นในบรรทัดเดียวกันห้ามขยับแม้แต่ตัวเดียว**
   - ถอนแล้วบรรทัดต้องยังอ่านได้ (ไม่มี ' · ' ค้างหัวหรือท้าย ไม่มี ' ·  · ' ซ้อน)
   - ถ้าถอนจนบรรทัดว่าง = ลบทั้งบรรทัด (กิ่งนั้นกลับไปเป็นกิ่งว่าง)
   - ถอนได้เฉพาะคำที่อยู่ในรายการ drop เท่านั้น ห้ามเดาเอง
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from apply_picked import FILES, scan, P          # ใช้ตัวแกะโครงตัวเดียวกัน

WRITE = '--write' in sys.argv
R2 = '--round2' in sys.argv
D = lambda *a: P('docs/m2-sense/round2' if R2 else 'docs/m2-sense/raw', *a)
MARKS = '⚡✳️🔗➕🆕🔄🚚🌟🚩'
LOCKED_CATS = ('c6', 'c14')   # 🔒 หมวด 7 คำทับศัพท์ (คู่มือตรวจสะกด) · หมวด 15 บทบรรยาย (พี่กันคัดเอง)


def mn_of(r):
    """ความหมายของ 1 รายการ — ฉบับที่ ๑๑ เป็นรายการ (ยังรับรูปเดิมได้)"""
    xs = r.get('meanings') or ([r['meaning']] if r.get('meaning') else [])
    return ' · '.join(str(x).strip() for x in xs if str(x).strip())


def load_sense():
    """อ่านคำตอบผู้ช่วยทุกก้อน → {คำ: record}"""
    import glob
    out = {}
    for f in sorted(glob.glob(D('sense*.jsonl')) + glob.glob(D('part*', 'sense*.jsonl'))):
        for line in open(f, encoding='utf-8'):
            if line.strip():
                r = json.loads(line)
                out[r['w']] = r
    return out


def bare(tok):
    """ตัดป้าย หมายเหตุ _(...)_ และความหมาย (X) ออก เหลือแต่ตัวคำ"""
    t = re.sub(r'_\([^)]*\)_', '', tok)
    t = re.sub(r'\s*\([^)]*\)\s*$', '', t)
    return re.sub(r'[%s\s]' % MARKS, '', t)


def split_chips(line):
    """แยกบรรทัดคำเป็นชิป โดยกัน ' · ' ที่อยู่ในหมายเหตุ _(...)_ ไม่ให้ถูกตัด"""
    prot = re.sub(r'_\([^)]*\)_', lambda m: m.group(0).replace(' · ', ' \x00 '), line)
    return [c.replace(' \x00 ', ' · ') for c in prot.split(' · ')]


def main():
    diff = json.load(open(D('diff.json'), encoding='utf-8'))
    sense = load_sense()

    # รอบ 2 มีสองคลัง — ฝั่ง md ของ catN คือ "คลังเดิม" เท่านั้น
    src = diff['perbank']['old'] if R2 else diff
    add = collections.defaultdict(list)      # (cid, path) → [คำ]
    for w, c, p in src['add']:
        add[(c, p)].append(w)
    # 🛡 กันคำหาย — ถ้าถอนแล้วคำนั้นจะเหลือ 0 กิ่งในคลังนี้ ให้ยกเลิกการถอนของคำนั้นทั้งชุด
    before = json.load(open(D('before.json'), encoding='utf-8'))
    bypath = collections.defaultdict(set)
    for w, c, p in src['drop']:
        bypath[w].add((c, p))
    guard = []
    for w, gone in bypath.items():
        b = before.get(w, {})
        b = b.get('old', b) if R2 else b
        cur = {(p['c'], p['p']) for p in b.get('paths', [])}
        if cur and not (cur - gone):
            guard.append(w)

    drop = collections.defaultdict(set)      # (cid, path) → {คำ}
    locked = 0
    for w, c, p in src['drop']:
        if c in LOCKED_CATS:                 # 🔒 ห้ามถอดหมวดที่พี่กันคัดเอง
            locked += 1
            continue
        if w not in guard:
            drop[(c, p)].add(w)
    newmn = set(src['newmn'] if R2 else diff['new_meaning'])

    stat = collections.Counter()
    missed = []
    for cid in sorted(FILES):
        path = FILES[cid]
        if not os.path.exists(P(path)):
            continue
        want_add = {k: v for k, v in add.items() if k[0] == cid}
        want_drop = {k: v for k, v in drop.items() if k[0] == cid}
        if not want_add and not want_drop and not newmn:
            continue

        lines, tree = scan(path)
        touched = False

        # ---------- ② ถอนชิป (ทำก่อน เพราะเลขบรรทัดยังไม่ขยับ) ----------
        for (c, p), words in want_drop.items():
            if p not in tree:
                missed.append(('ถอนไม่ได้ ไม่เจอกิ่ง', p, ' · '.join(words)))
                continue
            for li in list(tree[p]['words']):
                chips = split_chips(lines[li])
                kept = [ch for ch in chips if bare(ch) not in words]
                if len(kept) == len(chips):
                    continue
                stat['drop'] += len(chips) - len(kept)
                touched = True
                if kept:
                    indent = lines[li][:len(lines[li]) - len(lines[li].lstrip())]
                    lines[li] = indent + ' · '.join(x.strip() for x in kept)
                else:
                    lines[li] = '\x01ลบบรรทัดนี้'        # ทำเครื่องหมายไว้ ลบทีเดียวตอนท้าย

        # ---------- ③ เติมความหมายให้ชิปที่มีอยู่แล้ว ----------
        for p, node in tree.items():
            for li in node['words']:
                if lines[li].startswith('\x01'):
                    continue
                chips = split_chips(lines[li])
                out, ch4 = [], False
                for ch in chips:
                    w = bare(ch)
                    if w in newmn and '(' not in ch:
                        mn = mn_of(sense.get(w, {}))
                        mn = re.sub(r'\s*[()]\s*', ' ', mn).strip()   # กันวงเล็บซ้อน
                        if mn:
                            ch = ch.rstrip() + ' (%s)' % mn
                            ch4 = True
                            stat['meaning'] += 1
                    out.append(ch)
                if ch4:
                    indent = lines[li][:len(lines[li]) - len(lines[li].lstrip())]
                    lines[li] = indent + ' · '.join(x.strip() for x in out)
                    touched = True

        # ---------- ① เพิ่มชิปเข้ากิ่งใหม่ ----------
        for (c, p), words in want_add.items():
            if p not in tree:
                missed.append(('เพิ่มไม่ได้ ไม่เจอกิ่ง', p, ' · '.join(words)))
                continue
            node = tree[p]
            exist = set()
            for li in node['words']:
                if not lines[li].startswith('\x01'):
                    exist |= {bare(ch) for ch in split_chips(lines[li])}
            fresh = []
            for w in words:
                if w in exist:
                    continue
                chip = '⚡' + w
                mn = mn_of(sense.get(w, {}))
                if w in newmn and mn:
                    chip += ' (%s)' % re.sub(r'\s*[()]\s*', ' ', mn).strip()
                fresh.append(chip)
            if not fresh:
                continue
            live = [li for li in node['words'] if not lines[li].startswith('\x01')]
            if live:
                lines[live[-1]] = lines[live[-1]].rstrip() + ' · ' + ' · '.join(fresh)
            else:
                j = node['head'] + 1
                while j < len(lines) and lines[j].strip().startswith('🗨'):
                    j += 1
                lines.insert(j, ' ' * node['indent'] + ' · '.join(fresh))
                for v in tree.values():
                    if v['head'] >= j:
                        v['head'] += 1
                    v['words'] = [x + 1 if x >= j else x for x in v['words']]
                node['words'] = [j]
            stat['add'] += len(fresh)
            touched = True

        lines = [l for l in lines if not l.startswith('\x01')]
        if WRITE and touched:
            open(P(path), 'w', encoding='utf-8').write('\n'.join(lines))

    print('%s เพิ่มชิป %d · **ถอนชิป %d** · เติมความหมาย %d'
          % ('[เขียนจริง]' if WRITE else '[ดูผลอย่างเดียว]',
             stat['add'], stat['drop'], stat['meaning']))
    if guard:
        print('   🛡 กันไว้ %d คำ (ถ้าถอนหมดจะเหลือ 0 กิ่ง จึงคงกิ่งเดิมไว้): %s'
              % (len(guard), ' · '.join(guard[:8])))
    if missed:
        print('🔴 ทำไม่ได้ %d จุด' % len(missed))
        for m in missed[:15]:
            print('   🔴 %s · %s · %s' % m)
    return 1 if missed else 0



# ══════════════════════════════════════════════════════════════════
#  ฝั่ง "คลังชุดใหม่" — คำอยู่ใน docs/newwords-branches.json ไม่ได้อยู่ใน catN md
#  (ไฟล์โจทย์ out*.jsonl ของรอบจัดคำชุดใหม่ไม่ได้เก็บในเรพ จึงรันตัวสร้างเดิมซ้ำไม่ได้
#   ต้องแก้ที่ json แล้วเขียน md ใหม่ด้วย write_md() ตัวเดิมของมัน)
# ══════════════════════════════════════════════════════════════════
def main_new():
    import gen_newwords_branches as G

    out = json.load(open(P('docs/newwords-branches.json'), encoding='utf-8'))
    diff = json.load(open(D('diff.json'), encoding='utf-8'))
    s = diff['perbank']['new']
    mean = {k: (' · '.join(v) if isinstance(v, list) else v)
            for k, v in (diff.get('meanings') or {}).items()}

    addmap, dropmap = collections.defaultdict(set), collections.defaultdict(set)
    for w, c, p in s['add']:
        addmap[w].add((c, p))
    locked = 0
    for w, c, p in s['drop']:
        if c in LOCKED_CATS:                 # 🔒 ห้ามถอดหมวดที่พี่กันคัดเอง
            locked += 1
            continue
        dropmap[w].add((c, p))

    stat = collections.Counter()
    guard = []
    for wd in out['words']:
        t = wd['text']
        if not (wd.get('origin') == 'extract' or wd.get('source') or wd.get('picked_from')):
            continue                                   # 🔒 วลีตั้งต้นห้ามแตะ
        cur = [(q['category_id'], q['path']) for q in wd['all_paths']]
        new = [x for x in cur if x not in dropmap.get(t, ())]
        for x in sorted(addmap.get(t, ())):
            if x not in new:
                new.append(x)
        if not new:                                    # 🛡 ห้ามเหลือศูนย์กิ่ง
            guard.append(t)
            new = cur
        stat['drop'] += len(cur) - len([x for x in cur if x in new])
        stat['add'] += len([x for x in new if x not in cur])
        if new != cur:
            prim = wd['category_id'] if any(c == wd['category_id'] for c, _ in new) else new[0][0]
            wd['category_id'] = prim
            wd['all_paths'] = [{'category_id': c, 'path': p} for c, p in new]
            wd['subpaths'] = [p for c, p in new if c == prim]
            wd['subpath'] = wd['subpaths'][0]
        if not wd.get('meaning') and mean.get(t):
            wd['meaning'] = mean[t]
            stat['meaning'] += 1

    used = collections.Counter((q['category_id'], q['path'])
                               for w in out['words'] for q in w['all_paths'])
    out['branches'] = [dict(b, word_count=used.get((b['category_id'], b['path']), 0))
                       for b in out['branches']]

    if WRITE:
        json.dump(out, open(P('docs/newwords-branches.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
        G.write_md(out, used)

    print('%s [คลังชุดใหม่] เพิ่มชิป %d · **ถอนชิป %d** · เติมความหมาย %d'
          % ('[เขียนจริง]' if WRITE else '[ดูผลอย่างเดียว]',
             stat['add'], stat['drop'], stat['meaning']))
    if guard:
        print('   🛡 กันไว้ %d คำ (ถ้าถอนหมดจะเหลือ 0 กิ่ง จึงคงกิ่งเดิมไว้): %s'
              % (len(guard), ' · '.join(guard[:8])))
    if locked:
        print('   🔒 ไม่ถอด %d เส้นของหมวด 7 คำทับศัพท์ / หมวด 15 บทบรรยาย (พี่กันคัดเอง)' % locked)
    return 0


if __name__ == '__main__':
    raise SystemExit(main_new() if '--bank=new' in sys.argv else main())
