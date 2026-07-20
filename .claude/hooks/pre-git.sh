#!/usr/bin/env bash
# PreToolUse hook (กรองด้วย if: Bash(git *)) — เด้งเช็คลิสต์ก่อน git commit / git push
# เตือนตรงจังหวะอันตราย: push ก่อนได้อนุญาต / ลืมอัปเดตเอกสาร / commit สั้นเกิน / ไม่ขึ้น main
set -euo pipefail
cmd="$(cat | jq -r '.tool_input.command // ""' 2>/dev/null || echo '')"
note=""
case "$cmd" in
  *"git push"*)
    note="🛑 ก่อน git push เช็คให้ครบ: (1) พี่กันพิมพ์คำว่า \"push/พุช\" ตรง ๆ จริงหรือยัง — ถ้ายัง อย่า push (\"เอาขึ้น main\" ไม่นับ) (2) เอาขึ้น main เท่านั้น ทีเดียวจบ ห้าม push ค้างบน branch อื่น (3) อัปเดต CLAUDE.md + README ก่อน commit แล้วหรือยัง (4) push เสร็จต้องเขียน docs/SESSION-วันที่ แล้ว push ตามทันที" ;;
  *"git commit"*)
    note="📝 ก่อน git commit เช็ค: (1) อัปเดต CLAUDE.md + README ให้ตรงงานก่อนแล้วหรือยัง (แก้เอกสารก่อน commit เสมอ) (2) commit message ละเอียดที่สุด file-by-file + เหตุผลรายฟังก์ชัน ไทย+อังกฤษ ไม่จำกัดคำ (ยาว A4 ได้) มีหัวข้อ เป้าหมาย/ที่ทำ/ไฟล์/ต่อไป จบด้วย Co-Authored-By:" ;;
  *)
    exit 0 ;;
esac
jq -n --arg ctx "$note" '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$ctx}}'
