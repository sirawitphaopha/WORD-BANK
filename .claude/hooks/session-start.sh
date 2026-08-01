#!/usr/bin/env bash
# SessionStart hook — เด้ง "กฎทั้งหมด" เข้า context ทุกครั้งที่เปิด session
#
# 🔑 เนื้อกฎอยู่ที่ RULES.md ที่รากเรพ — ที่เดียวจบ แก้ที่นั่นที่เดียว
#    (เดิมเนื้อกฎอยู่ rules-core.txt แล้วสั่งให้ไปเปิดอ่าน SKILL.md + CLAUDE.md ต่ออีก 1,772 บรรทัด
#     ผลคือกฎใหม่ตกหล่นเป็นประจำ · พี่กันสั่ง 1 ส.ค. 2569 ให้รวมไว้ที่เดียว)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
msg="$(cat "$ROOT/RULES.md" 2>/dev/null || echo 'เปิดอ่าน RULES.md ที่รากเรพให้จบก่อนลงมือ')"
jq -n --arg ctx "$msg" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
