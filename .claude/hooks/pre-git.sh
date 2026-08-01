#!/usr/bin/env bash
# PreToolUse hook (กรองด้วย if: Bash(git *))
#
# 🛑 git push = "บล็อกจริง" ไม่ใช่แค่เตือน (พี่กันสั่ง 25 ก.ค. 2569)
#    เหตุผล: กฎเรื่องห้าม push เขียนไว้ทุกที่แล้ว (CLAUDE.md · SKILL · hook เตือน) แต่แคลร์ยังพลาด
#    พลาดจริง 25 ก.ค.: พี่กันพิมพ์ "พุช" ครั้งเดียว แคลร์ push ไป 7 ครั้ง (เกินมา 6 ครั้ง)
#    เพราะตีความว่าคำสั่งครั้งเดียว = ใบผ่านถาวร
#    → เขียนกฎเพิ่มอีกกี่บรรทัดก็ไม่ช่วย ต้องบล็อกด้วยเครื่องแทน
#
# 🔑 กลไก: ต้องมีตั๋ว .git/PUSH-OK ถึงจะ push ได้ · ตั๋วใช้ได้ครั้งเดียวแล้วถูกลบทันที
#    สร้างตั๋วด้วย: bash .claude/hooks/allow-push.sh
#    สร้างได้เฉพาะตอนพี่กันพิมพ์คำว่า "push / พุช" ตรง ๆ เท่านั้น
#    (1 ครั้งที่พี่กันสั่ง = push ได้ 1 ครั้ง · จะ push อีกต้องให้พี่กันสั่งใหม่)
set -euo pipefail
cmd="$(cat | jq -r '.tool_input.command // ""' 2>/dev/null || echo '')"
note=""

# 🔍 แยกให้ออกว่า "สั่ง push จริง" กับ "ข้อความที่พูดถึง push เฉย ๆ"
#    เทียบเฉพาะคำสั่งที่อยู่ต้นบรรทัด/หลังตัวคั่น ( ; && || | ( ) เท่านั้น
#    🔴 เคยพลาด 25 ก.ค. 2569: ใช้ case *"git push"* แล้วมันไปโดน commit message
#       ที่มีคำว่า "git push" อยู่ในเนื้อความ → commit ถูกบล็อกทั้งที่ไม่ได้ push
is_push=0; is_commit=0
[[ "$cmd" =~ (^|[\;\&\|\(]|&&|\|\|)[[:space:]]*git([[:space:]]+-[^[:space:]]+)*[[:space:]]+push([[:space:]]|$) ]] && is_push=1
[[ "$cmd" =~ (^|[\;\&\|\(]|&&|\|\|)[[:space:]]*git([[:space:]]+-[^[:space:]]+)*[[:space:]]+commit([[:space:]]|$) ]] && is_commit=1

case "1" in
  "$is_push")
    root="$(git rev-parse --git-dir 2>/dev/null || echo .git)"
    ticket="$root/PUSH-OK"
    if [ -f "$ticket" ]; then
      rm -f "$ticket"
      note="✅ ใช้ตั๋ว push ไปแล้ว 1 ใบ (ตั๋วถูกลบแล้ว)
🔁 ยังไม่จบ flow — คำสั่ง push 1 ครั้งของพี่กัน = 4 ขั้น
   1 อัปเดต CLAUDE.md + README → 2 commit → 3 push ขึ้น main → 4 เขียน docs/SESSION-วันที่ แล้ว push ตาม
👉 ถ้ายังไม่ได้ทำขั้น 4: เขียนไฟล์ SESSION → commit → รัน bash .claude/hooks/allow-push.sh ขอตั๋วใบใหม่ → push ทันที
🛑 ห้ามหยุดรอให้พี่กันสั่ง push ซ้ำเพื่อส่งไฟล์ SESSION — ขั้นที่ 4 อยู่ในคำสั่งเดิมแล้ว (กฎ ๓.๖)
   ต้องรอคำสั่งใหม่เฉพาะตอนจะ push ของก้อนใหม่ที่ไม่ใช่ flow นี้"
    else
      jq -n '{
        hookSpecificOutput:{
          hookEventName:"PreToolUse",
          permissionDecision:"deny",
          permissionDecisionReason:"🛑 ห้าม push — ไม่มีตั๋วอนุญาต\n\nกฎ: push ได้เฉพาะตอนพี่กันพิมพ์คำว่า \"push / พุช\" ตรง ๆ เท่านั้น\n\"เอาขึ้น main / ทำต่อ / ทำเลย\" หรือคำสั่ง push ของรอบก่อน ไม่นับ\n\nถ้าพี่กันเพิ่งสั่ง push ในข้อความล่าสุดจริง ๆ ให้รัน:\n  bash .claude/hooks/allow-push.sh\nแล้วค่อย git push (ตั๋วใช้ได้ครั้งเดียว)\n\nถ้าพี่กันยังไม่ได้สั่ง = หยุด commit ไว้เฉย ๆ แล้วบอกพี่กันว่ารออนุญาต"
        }
      }'
      exit 0
    fi ;;
  "$is_commit")
    note="📝 ก่อน git commit เช็ค: (1) อัปเดต CLAUDE.md + README ให้ตรงงานก่อนแล้วหรือยัง (แก้เอกสารก่อน commit เสมอ) (2) commit message ละเอียดที่สุด file-by-file + เหตุผลรายฟังก์ชัน ไทย+อังกฤษ ไม่จำกัดคำ (ยาว A4 ได้) มีหัวข้อ เป้าหมาย/ที่ทำ/ไฟล์/ต่อไป จบด้วย Co-Authored-By: · 🛑 commit ไม่ใช่ push — commit เสร็จห้าม push ต่อเอง" ;;
  *)
    exit 0 ;;
esac
jq -n --arg ctx "$note" '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$ctx}}'
