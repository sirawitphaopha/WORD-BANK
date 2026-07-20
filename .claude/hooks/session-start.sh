#!/usr/bin/env bash
# SessionStart hook — เด้งกฎเหล็ก + สั่งอ่านสกิลเข้า context ทุกครั้งที่เปิด session
# (แก้ต้นเหตุที่ AI เผลอไม่อ่านสกิลก่อนลงมือ) · เนื้อกฎอยู่ไฟล์ rules-core.txt แก้จุดเดียว
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
msg="$(cat "$DIR/rules-core.txt" 2>/dev/null || echo 'อ่าน .claude/skills/*/SKILL.md + CLAUDE.md ให้จบก่อนลงมือ')"
jq -n --arg ctx "$msg" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
