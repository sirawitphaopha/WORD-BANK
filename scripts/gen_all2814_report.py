#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวมทั้ง 2,814 รายการของรอบยกเครื่องคลังคำ (M2 รอบ 2) เป็นไฟล์เดียว อ่านง่าย

แสดงครบทุกรายการเรียงตามลำดับ id เดิม (docs/m2-sense/round2/in.jsonl)
บอกชัดว่ารายการไหน "ทบทวนแล้ว" (มีความหมาย+กิ่งครบ) รายการไหน "ยังไม่ทบทวน"

อ่าน:
  docs/m2-sense/round2/in.jsonl     โจทย์เต็ม 2,814 รายการ (id + w)
  docs/m2-sense/round2/before.json  บอกว่าแต่ละคำอยู่คลังไหนบ้าง (old/new)
  docs/m2-sense/round2/result.json  ผลที่ทบทวนแล้ว 1,512 แถว (1,440 รายการ)

เขียน:
  docs/m2-sense/round2/0-all-2814.md
  docs/m2-sense/round2/0-all-2814.html
"""
import json, os, html, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
D = lambda *a: P('docs/m2-sense/round2', *a)
BANK_NAME = {'old': 'เสียงกระซิบจากความมืด', 'new': 'คินดะอิจิยอดนักสืบ ตอน บทเพลงปีศาจ'}


def lv(seg, idx):
    """ใส่เลขชั้นในวงเล็บ — กฎที่พี่กันสั่ง 27 ก.ค. 2569 ('ถ้าวงเล็บ 1 2 3 ด้วยเราจะเห็นภาพมากกว่า')
    รูปแบบเดียวกับ lvpath() ใน gen_round2_docs.py"""
    return '%s(%d)' % (seg.strip(), idx)


def group_paths(all_paths):
    """ยุบท่อนต้นของกิ่งที่ซ้ำกันให้เหลือครั้งเดียว — กันคำที่ติดหลายกิ่งแล้วท่อนต้นเหมือนกัน
    ถูกพิมพ์เต็มเส้นทางซ้ำ ๆ จนอ่านแล้วดูเหมือนเขียนซ้ำ (พี่กันจับได้ 28 ก.ค.)
    ใส่เลขชั้นในวงเล็บทุกชั้น ตามตำแหน่งจริงในเส้นทางเต็ม (ไม่ใช่นับใหม่หลังยุบ)

    all_paths: [{'category_id':.., 'path':'A / B / C'}, ...]
    จัดกลุ่มตามหมวดก่อนเสมอ (ห้ามยุบข้ามหมวด เพราะคำติดหลายกิ่งข้ามหมวดได้ปกติ ~58%
    ของรายการ และ segment แรกอาจชื่อชนกันโดยบังเอิญคนละหมวด)
    ภายในหมวดเดียวกัน หาท่อนต้นที่ทุกเส้นเหมือนกันเป๊ะ แล้วโชว์ครั้งเดียว ตามด้วย "→"
    และส่วนที่เหลือของแต่ละเส้นคั่นด้วย " · " — ถ้าไม่มีท่อนต้นร่วมกันเลย โชว์เต็มเส้นทางแยกกันตามเดิม
    """
    groups = collections.OrderedDict()
    for p in all_paths:
        groups.setdefault(p['category_id'], []).append(p['path'])
    out = []
    for _, paths in groups.items():
        uniq = []
        for p in paths:
            if p not in uniq:
                uniq.append(p)
        segs = [p.split(' / ') for p in uniq]
        if len(uniq) == 1:
            s = segs[0]
            out.append('/'.join(lv(x, i + 1) for i, x in enumerate(s)))
            continue
        minlen = min(len(s) for s in segs)
        common = []
        for i in range(minlen):
            if len({s[i] for s in segs}) == 1:
                common.append(segs[0][i])
            else:
                break
        if common and len(common) < minlen:
            common_txt = '/'.join(lv(x, i + 1) for i, x in enumerate(common))
            base = len(common)
            tails, seen = [], set()
            for s in segs:
                tail = s[base:]
                t = '/'.join(lv(x, base + 1 + j) for j, x in enumerate(tail))
                if t not in seen:
                    seen.add(t)
                    tails.append(t)
            out.append('%s → %s' % (common_txt, ' · '.join(tails)))
        else:
            for s in segs:
                out.append('/'.join(lv(x, i + 1) for i, x in enumerate(s)))
    return out


def kind_label(e):
    """บอกว่ารายการนี้เป็น "วลีตั้งต้น" หรือ "คำที่สกัด" — พี่กันถาม 28 ก.ค. ว่า "แล้วไหนคำสกัด"
    (ศัพท์ตามที่พี่กันเลือกเอง — ดู CLAUDE.md: วลีตั้งต้น = บรรทัดที่พิมพ์เข้าไปเอง ·
    คำที่สกัด = คำที่ตัดออกมาจากวลีตั้งต้นอีกที)"""
    if e.get('origin') != 'extract':
        return 'วลีตั้งต้น'
    parts = ['คำที่สกัด']
    if e.get('source'):
        parts.append('(ตัดมาจาก: %s)' % e['source'])
    if e.get('source_others'):
        parts.append('· ตัดมาจากวลีอื่นด้วย: %s' % ' · '.join(e['source_others']))
    if e.get('picked_from'):
        parts.append('· เส้นเชื่อมย้อนหลัง (มีอยู่แล้วในคลัง ตัดมาจาก): %s' % ' · '.join(e['picked_from']))
    return ' '.join(parts)


def load():
    rows = [json.loads(l) for l in open(D('in.jsonl'), encoding='utf-8') if l.strip()]
    before = json.load(open(D('before.json'), encoding='utf-8'))
    result = json.load(open(D('result.json'), encoding='utf-8'))
    done = collections.defaultdict(list)  # text -> [row, row]
    for w in result['words']:
        done[w['text']].append(w)
    return rows, before, done, result['meta']


def build(rows, before, done):
    """คืนลิสต์รายการเรียงตาม id พร้อมสถานะ"""
    out = []
    for r in rows:
        text = r['w']
        banks = list(before.get(text, {}).keys())
        entries = done.get(text)
        out.append({'id': r['id'], 'text': text, 'banks': banks, 'entries': entries})
    return out


def f_md(items, meta):
    done_n = sum(1 for x in items if x['entries'])
    pend_n = len(items) - done_n
    lines = []
    lines.append('# รายการทั้งหมด 2,814 รายการ — M2 รอบ 2 ยกเครื่องคลังคำ\n')
    lines.append('> 🛑 **ทบทวนแล้ว %d รายการ (%.0f%%) · ยังไม่ทบทวนอีก %d รายการ**\n'
                  % (done_n, 100 * done_n / len(items), pend_n))
    lines.append('> เรียงตามเลขลำดับเดิม (id) ไม่เปลี่ยนแม้ทบทวนไม่ครบ · '
                  'แถวที่ยังไม่ทบทวนจะไม่มีความหมาย/กิ่งให้ดู เพราะยังไม่ได้ส่งให้ผู้ช่วยอ่าน\n')
    lines.append('---\n')
    for x in items:
        bank_label = ' · '.join(BANK_NAME.get(b, b) for b in x['banks']) or '?'
        if x['entries']:
            lines.append('### %d. ✅ %s' % (x['id'], x['text']))
            for e in x['entries']:
                lines.append('**[%s]**' % BANK_NAME.get(e['bank'], e['bank']))
                lines.append('- ชนิด: ' + kind_label(e))
                lines.append('- ความหมาย:')
                for m in (e.get('meanings') or ['—']):
                    lines.append('  - **%s**' % m)
                allp = e.get('all_paths') or []
                if allp:
                    grp = group_paths(allp)
                    if len(grp) == 1:
                        lines.append('- กิ่ง (%d): %s' % (len(allp), grp[0]))
                    else:
                        lines.append('- กิ่ง (%d):' % len(allp))
                        for g in grp:
                            lines.append('  - %s' % g)
                else:
                    lines.append('- กิ่ง: —')
                lines.append('')
        else:
            lines.append('### %d. ⏳ %s' % (x['id'], x['text']))
            lines.append('เล่ม: %s · **ยังไม่ทบทวน**\n' % bank_label)
    return '\n'.join(lines)


CSS = """
:root{--bg:#f7f1e3;--ink:#33291f;--sub:#7a6a52;--line:#d8c9a8;--card:#fffdf6;--accent:#9c3b2b;--ok:#3d7a3d;--pend:#b0824a}
@media(prefers-color-scheme:dark){:root{--bg:#1c1812;--ink:#eee2c8;--sub:#b0a184;--line:#4a4030;--card:#241f16;--accent:#e0806a;--ok:#7fbf7f;--pend:#e0b878}}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:'Sarabun',sans-serif;margin:0;padding:16px;line-height:1.6}
h1{font-size:clamp(20px,4vw,28px);color:var(--accent)}
.banner{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:16px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:5}
.filters input,.filters select{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font-family:inherit}
.filters input{flex:1;min-width:160px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:10px}
.card.pend{opacity:.7}
.hd{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}
.wid{font-size:12px;color:var(--sub)}
.txt{font-weight:700;font-size:17px}
.st{font-size:12px;padding:2px 8px;border-radius:999px}
.st.ok{background:rgba(61,122,61,.15);color:var(--ok)}
.st.pend{background:rgba(176,130,74,.18);color:var(--pend)}
.bank{font-size:12px;color:var(--sub);margin-top:2px}
.entry{margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
.lbl{font-size:12px;color:var(--sub)}
.kind{font-size:13px;color:var(--sub);margin:4px 0 2px}
.mean{margin:2px 0}
.mean ul{margin:2px 0 4px 20px;padding:0}
.mean li{margin:3px 0;font-weight:700;color:var(--accent)}
.paths{font-size:13px;color:var(--sub)}
.paths ul{margin:2px 0 0 20px;padding:0}
.paths li{margin:2px 0}
#count{font-size:13px;color:var(--sub);margin-bottom:8px}
"""

JS = """
function filt(){
  var q=document.getElementById('q').value.trim();
  var st=document.getElementById('st').value;
  var cards=document.querySelectorAll('.card');
  var n=0;
  cards.forEach(function(c){
    var ok=true;
    if(q && c.dataset.text.indexOf(q)===-1) ok=false;
    if(st!=='all' && c.dataset.status!==st) ok=false;
    c.style.display = ok?'':'none';
    if(ok) n++;
  });
  document.getElementById('count').textContent='แสดง '+n+' จาก '+cards.length+' รายการ';
}
document.getElementById('q').addEventListener('input',filt);
document.getElementById('st').addEventListener('change',filt);
"""


def f_html(items, meta):
    done_n = sum(1 for x in items if x['entries'])
    pend_n = len(items) - done_n
    parts = []
    parts.append('<title>รายการทั้งหมด 2,814 รายการ — M2 รอบ 2</title>')
    parts.append('<style>%s</style>' % CSS)
    parts.append('<h1>รายการทั้งหมด 2,814 รายการ — M2 รอบ 2 ยกเครื่องคลังคำ</h1>')
    parts.append('<div class="banner">🛑 ทบทวนแล้ว <b>%d</b> รายการ (%.0f%%) · ยังไม่ทบทวนอีก <b>%d</b> รายการ<br>'
                  'เรียงตามเลขลำดับเดิม ไม่เปลี่ยนแม้ทบทวนไม่ครบ</div>'
                  % (done_n, 100 * done_n / len(items), pend_n))
    parts.append('<div class="filters">'
                  '<input id="q" placeholder="ค้นหาคำ...">'
                  '<select id="st"><option value="all">ทุกสถานะ</option>'
                  '<option value="ok">ทบทวนแล้ว</option><option value="pend">ยังไม่ทบทวน</option></select>'
                  '</div>')
    parts.append('<div id="count"></div>')
    for x in items:
        e = html.escape
        bank_label = ' · '.join(BANK_NAME.get(b, b) for b in x['banks']) or '?'
        if x['entries']:
            body = []
            for en in x['entries']:
                allp = en.get('all_paths') or []
                disp = group_paths(allp)
                mean_li = ''.join('<li>%s</li>' % e(m) for m in (en.get('meanings') or ['—']))
                if len(disp) <= 1:
                    paths_html = e(disp[0]) if disp else '—'
                else:
                    paths_html = '<ul>%s</ul>' % ''.join('<li>%s</li>' % e(g) for g in disp)
                body.append('<div class="entry"><span class="lbl">[%s]</span>'
                             '<div class="kind">%s</div>'
                             '<div class="mean"><span class="lbl">ความหมาย:</span><ul>%s</ul></div>'
                             '<div class="paths"><span class="lbl">กิ่ง (%d):</span> %s</div></div>'
                             % (e(BANK_NAME.get(en['bank'], en['bank'])),
                                e(kind_label(en)), mean_li,
                                len(allp), paths_html if allp else '—'))
            parts.append('<div class="card" data-text="%s" data-status="ok">'
                          '<div class="hd"><span class="wid">#%d</span><span class="txt">%s</span>'
                          '<span class="st ok">ทบทวนแล้ว</span></div>%s</div>'
                          % (e(x['text']), x['id'], e(x['text']), ''.join(body)))
        else:
            parts.append('<div class="card pend" data-text="%s" data-status="pend">'
                          '<div class="hd"><span class="wid">#%d</span><span class="txt">%s</span>'
                          '<span class="st pend">ยังไม่ทบทวน</span></div>'
                          '<div class="bank">เล่ม: %s</div></div>'
                          % (e(x['text']), x['id'], e(x['text']), e(bank_label)))
    parts.append('<script>%s</script>' % JS)
    return '\n'.join(parts)


def main():
    rows, before, done, meta = load()
    items = build(rows, before, done)
    assert len(items) == 2814, 'ต้องมี 2,814 รายการ ได้ %d' % len(items)

    md = f_md(items, meta)
    open(D('0-all-2814.md'), 'w', encoding='utf-8').write(md)
    print('เขียน docs/m2-sense/round2/0-all-2814.md (%d รายการ)' % len(items))

    body = f_html(items, meta)
    full = '<!doctype html><html lang="th"><head><meta charset="utf-8">' \
           '<meta name="viewport" content="width=device-width,initial-scale=1">' \
           + body + '</head><body>%s</body></html>'
    # body ที่ประกอบมามีทั้ง head-tags กับ body content ปนกัน แยกให้ถูกที่
    head = '<title>รายการทั้งหมด 2,814 รายการ — M2 รอบ 2</title><style>%s</style>' % CSS
    rest = body.split('</style>', 1)[1]
    full = ('<!doctype html><html lang="th"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            + head + '</head><body>' + rest + '</body></html>')
    open(D('0-all-2814.html'), 'w', encoding='utf-8').write(full)
    print('เขียน docs/m2-sense/round2/0-all-2814.html')

    done_n = sum(1 for x in items if x['entries'])
    print('ทบทวนแล้ว %d จาก %d (%.0f%%)' % (done_n, len(items), 100 * done_n / len(items)))


if __name__ == '__main__':
    main()
