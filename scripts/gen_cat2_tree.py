#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง "ส่วนต้นไม้" ของ docs/cat2-redesign.html จาก docs/cat2-redesign.md
ใช้มาร์กอัปเดิมของไฟล์เป๊ะ (details.major / div.sub / div.leaf / div.words / div.hint / div.empty)
แทนที่เฉพาะช่วง <h2 ...🌳...> ถึงก่อน <h2 ...➕...> · ส่วนอื่นของ HTML ไม่แตะ"""
import io, re, html

MD, HTML = 'docs/cat2-redesign.md', 'docs/cat2-redesign.html'
TH = '๐๑๒๓๔๕๖๗๘๙'
def thnum(i): return ''.join(TH[int(c)] for c in str(i))
def esc(t): return html.escape(t, quote=False).replace('&amp;amp;','&amp;')

def md_inline(t):
    """**bold** → <b> · _italic_ → เอาขีดล่างออก · `code` → คงข้อความ"""
    t = esc(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`(.+?)`', r'\1', t)
    t = re.sub(r'_(.+?)_', r'\1', t)
    return t.replace('"','“',1).replace('"','”',1) if False else t

def split_name(txt):
    """'ชื่อไทย (English)' → (ไทย, อังกฤษ)"""
    m = re.match(r'^(.*?)\s*\(([^()]*)\)\s*$', txt.strip())
    return (m.group(1).strip(), m.group(2).strip()) if m else (txt.strip(), '')

def tags_of(line):
    return ' · '.join(re.findall(r'\[([^\]]+)\]', line))

lines = io.open(MD, encoding='utf-8').read().split('\n')
majors, cur, cursub, curleaf = [], None, None, None
in_tree = False
for ln in lines:
    if ln.startswith('### 🌲 กิ่งหลัก'):
        in_tree = True
        m = re.match(r'^### 🌲 กิ่งหลัก\s*(\d+)\s*·\s*(.+?)\s*$', ln)
        raw = re.sub(r'\s*(🆕|🔄|_\(.*?\)_)\s*', ' ', m.group(2)).strip()
        th, en = split_name(raw)
        cur = {'no': int(m.group(1)), 'th': th, 'en': en, 'def': '', 'hints': [], 'subs': []}
        majors.append(cur); cursub = curleaf = None
        continue
    if not in_tree or cur is None: continue
    if ln.startswith('## ') or ln.startswith('---'):
        if majors and ln.startswith('## '): in_tree = False
        continue
    if ln.startswith('> '):
        cur['def'] = md_inline(ln[2:].strip().strip('_')); continue
    m = re.match(r'^(\s*)🗨\s*_(.*)_\s*$', ln)
    if m:
        tgt = curleaf or cursub or cur
        tgt.setdefault('hints', []).append(md_inline(m.group(2))); continue
    m = re.match(r'^-\s+(.*?)\*\*(.+?)\*\*(.*?)(?:—\s*_(.*?)_)?\s*$', ln)
    if m and '🌿' in m.group(1)+m.group(3):
        pre = m.group(1); th, en = split_name(m.group(2))
        cursub = {'new': '🆕' in pre, 'chg': '🔄' in pre, 'th': th, 'en': en,
                  'def': md_inline(m.group(4) or ''), 'tag': tags_of(ln), 'hints': [], 'leaves': [], 'words': []}
        cur['subs'].append(cursub); curleaf = None; continue
    m = re.match(r'^\s+-\s+(.*?)\*\*(.+?)\*\*(.*?)(?:—\s*_(.*?)_)?\s*$', ln)
    if m and '🍃' in m.group(1)+m.group(3):
        pre = m.group(1); th, en = split_name(m.group(2))
        curleaf = {'new': '🆕' in pre, 'th': th, 'en': en, 'def': md_inline(m.group(4) or ''),
                   'tag': tags_of(ln), 'hints': [], 'words': []}
        if cursub is not None: cursub['leaves'].append(curleaf)
        continue
    t = ln.strip()
    if t and not t.startswith(('#','>','-','|','🗨','**')) and cursub is not None:
        tgt = curleaf or cursub
        for w in t.split(' · '):
            w = w.strip()
            if not w: continue
            note = ''
            mm = re.search(r'_\((.*?)\)_\s*$', w)
            if mm: note = mm.group(1); w = w[:mm.start()].strip()
            cls = 'w'
            if w.startswith(('⚡','🔗⚡','🔗','⚡➕')) or '⚡' in w[:3]: cls = 'w m'
            if w.startswith('✳️'): cls = 'w s'
            w = re.sub(r'^[⚡🔗✳️➕\s]+', '', w)
            w = re.sub(r'\*\*|`', '', w)
            if w: tgt['words'].append((cls, esc(w), esc(note)))

def words_html(ws):
    if not ws: return ''
    out = ['<div class="words">']
    for cls, w, note in ws:
        out.append(f'<span class="{cls}">{w}' + (f' <small>{note}</small>' if note else '') + '</span>')
    return ''.join(out) + '</div>'

def hints_html(hs, ind):
    return ''.join(f'\n{ind}<div class="hint">{h}</div>' for h in hs)

buf = [f'  <h2 class="sec"><span class="n">🌳</span> โครงต้นไม้ใหม่ · {len(majors)} กิ่งหลัก · '
       f'{sum(len(m["subs"]) for m in majors)} กิ่งย่อย · {sum(len(s["leaves"]) for m in majors for s in m["subs"])} กิ่งแขนง</h2>',
       '  <p style="font-size:13px;color:var(--muted);margin:0 0 4px">แตะหัวกิ่งเพื่อยุบ/กาง · <b>นิยาม</b>=สะอาด (ขึ้นเว็บ) · <b>🗨</b>=หมายเหตุ (หลังบ้าน)</p>']
for m in majors:
    nw = sum(len(s['words']) for s in m['subs']) + sum(len(l['words']) for s in m['subs'] for l in s['leaves'])
    buf.append(f'\n  <!-- {m["no"]} -->\n  <details class="major" open>')
    buf.append(f'    <summary><span class="chip-n">{thnum(m["no"])}</span><span class="ttl">{esc(m["th"])}'
               f'<span class="en">{esc(m["en"])}</span></span><span class="cnt">{nw} คำ</span><span class="arw">▶</span></summary>')
    buf.append('    <div class="body">')
    if m['def']: buf.append(f'      <p class="def">{m["def"]}</p>')
    for h in m['hints']: buf.append(f'      <div class="hint" style="margin-bottom:8px">{h}</div>')
    for s in m['subs']:
        icon = ('🆕 ' if s['new'] else '') + ('🔄 ' if s['chg'] else '') + '🌿'
        tag = f' <span class="tag t-genre">{esc(s["tag"])}</span>' if s['tag'] else ''
        blk = (f'      <div class="sub"><div class="sub-h">{icon} {esc(s["th"])} <span class="en">{esc(s["en"])}</span>{tag}</div>'
               f'<div class="sub-d">{s["def"]}</div>')
        blk += hints_html(s['hints'], '        ')
        blk += words_html(s['words'])
        if s['leaves']:
            for l in s['leaves']:
                li = ('🆕 ' if l['new'] else '') + '🍃'
                lt = f' <span class="tag t-genre">{esc(l["tag"])}</span>' if l['tag'] else ''
                lb = (f'\n        <div class="leaf"><div class="leaf-h">{li} {esc(l["th"])} <span class="en">{esc(l["en"])}</span>{lt}</div>'
                      f'<div class="leaf-d">{l["def"]}</div>')
                lb += hints_html(l['hints'], '          ')
                lb += words_html(l['words']) or '<div class="empty">รอเก็บคำ</div>'
                lb += '</div>'
                blk += lb
            blk += '\n      </div>'
        else:
            if not s['words']: blk += '<div class="empty">รอเก็บคำ</div>'
            blk += '</div>'
        buf.append(blk)
    buf.append('    </div>\n  </details>')
tree = '\n'.join(buf) + '\n'

h = io.open(HTML, encoding='utf-8').read()
a = h.index('<h2 class="sec"><span class="n">🌳</span>')
b = h.index('<h2 class="sec"><span class="n">➕</span>')
h = h[:a-2] + tree + '\n  ' + h[b:]
io.open(HTML, 'w', encoding='utf-8').write(h)
print(f'OK · กิ่งหลัก {len(majors)} · ย่อย {sum(len(m["subs"]) for m in majors)} · '
      f'แขนง {sum(len(s["leaves"]) for m in majors for s in m["subs"])} · '
      f'คำ {sum(len(s["words"]) for m in majors for s in m["subs"]) + sum(len(l["words"]) for m in majors for s in m["subs"] for l in s["leaves"])}')
