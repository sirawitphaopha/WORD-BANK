# TASK — re-check 400 already-reviewed items against 12 NEW branches

12 new branches were added to the taxonomy AFTER these 400 items were reviewed.
The previous reviewer never saw them, so it had to force those items into whatever
nearby branch existed. Your job is to find the items that BELONG in a new branch.

## Files
- `NEWBRANCHES.md`  — the 12 new branches. Each has: code, category, full path, English name, Thai definition.
- `recheck-in.jsonl` — 400 items. Each line: `{"id":…, "w":"…", "meanings":[…]}`
  `w` = the Thai word/phrase. `meanings` = glosses written during the earlier review.

## What to decide, per item
Read `w` and its `meanings`. Then ask, for each of the 12 new branches:
**"Judged on the text itself, does this item belong in that branch?"**

Rule of the subject (decisive test):
- Branch name is a STATE or an ACTION → ask "can this text describe that state/action?" yes = it belongs.
- Branch name is a THING or a BODY PART → ask "IS this text the name of that thing?" no = it does NOT belong.
  Example: `ปรก` (to droop over / cover from above) does NOT belong in a "beard" branch just because
  it appeared in the phrase "หนวดเคราปรกหน้า" — the beard is what gets drooped over, not the meaning of ปรก.

One item may belong to several of the 12. Most items belong to none — that is expected and fine.

## Output — append to `recheck-out.jsonl`, ONE LINE PER MATCH
Only write a line when an item DOES belong to at least one new branch. Skip the rest silently.

```
{"id":1059,"w":"ปล่อยก๊าก","add":["E01-04-000"],"why":"เสียงหัวเราะดังลั่น = ความรู้สึกตื้นตัน? ไม่ใช่ — ตัวอย่างนี้เป็นแค่รูปแบบ"}
```
- `add` = array of NEW branch codes only (must be one of the 12 in NEWBRANCHES.md).
- `why` = one short Thai sentence per decision, saying what in the text puts it there.
- Do NOT change `w`. Do NOT propose other branches. Do NOT remove anything.

## CRITICAL — write as you go
Append to the file every 10 items you finish scanning. Never hold results in memory
and write once at the end: if you get cut off mid-run, everything unwritten is lost.
Create the file on the first write, append afterwards.

## Also report at the end (separate file `recheck-notes.md`)
- any word you suspect is misspelled Thai, with the spelling you think was meant
- any gap you notice where none of the existing branches fit and a NEW branch is needed
  (give Thai name, English name, definition, and which existing branch it should hang under)
