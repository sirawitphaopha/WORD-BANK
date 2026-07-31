# Task — Review each item: write its meanings, then assign branches

You are a Thai linguist and literary specialist maintaining a novelist's word bank.

## What you get

- `in.jsonl` — items to review. Each line has ONLY `id` and `w` (the Thai text).
- `BRANCHES.md` — every branch you may choose from, listed by CODE.

**You will NOT see the branches this item currently has, its category, or — if it was
cut out of a longer phrase — that phrase. All of it is hidden on purpose.**
That inheritance is exactly the bug being fixed: extracted words were given the
branches of the phrase they came from, so they ended up in branches unrelated to
what the word itself means.

Judge every item from the text in front of you and nothing else.

## Rule 1 — Meanings first, branches second. Never the other way round.

For each item, list EVERY distinct sense the text can carry, then pick branches to
cover those senses. Do not guess a category first and then justify it.

`เสียว` reads four different ways, so it needs four meanings and lands in five branches:
  · a sharp tingle in the body (เสียวฟัน)     → pain / skin-sensation branches
  · a thrill of danger when seeing something risky → suspense branch
  · sexual arousal                              → desire branch
  · a jolt of fear in the chest                 → fear branch
Had you decided "this is a body word" upfront, three of those four senses would be lost forever.

## Rule 2 — No cap on how many branches

If an item genuinely fits 100 branches, give it 100.
A branch answers "what stories can this word tell", NOT "how many dictionary senses it has".

`โอนเอน` has one dictionary sense (swaying, unsteady) but tells six different stories:
standing unsteadily · drunken walking · a wavering heart · being swayed by others ·
indecision · shadows of leaves swaying. It must get all six.

But do NOT pad the list. Every branch must pass Rule 3. One branch is a fine answer
when only one truly fits.

## Rule 3 — The subject test (decisive)

Look at what the branch NAME is, then ask the matching question:

| Branch name is | Ask |
|---|---|
| a state / action / manner | "Can this text describe that?" — yes = include |
| a thing / body part / object | "IS this text the name of that thing?" — no = EXCLUDE |

`ปรก` means "to drape or hang over from above". It does NOT mean beard, hair, or leaves.
  · `ปรก` alone            → only branches about covering/draping
  · `กิ่งไม้ปรกลงมา`        → subject is กิ่งไม้ (a branch of a tree) → may go in plant branches
  · `หนวดเคราปรกหน้ารุงรัง` → subject is หนวดเครา (beard) → may go in beard branches

Before adding any branch, ask: "does the subject appear inside this text itself?"
If the text names only a state or manner, never guess what the subject might be
and file it under that.

`ง่าม` (a fork/crotch shape) is a shape word — it appears in ง่ามขา, ง่ามนิ้ว and more.
It belongs to shape branches, not to leg or finger branches.

## Rule 4 — Every item must have meanings. Never leave them empty.

- `meanings` is a LIST — one entry per distinct sense.
- One sense = one entry. Four senses = four entries. Never merge them into one sentence.
- **Keep each meaning under 100 Thai characters**, except for long narrative passages,
  which may run longer when needed to carry the whole picture.
- Describe the TEXT, not a scene. (`ยืดคอมองข้ามสิ่งกีดขวาง` ✓ · `ตัวละครกำลังมองหาบางอย่าง` ✗)
- **Write meanings in Thai.**

## Rule 5 — Answer with branch CODES only

- Copy codes exactly from `BRANCHES.md` (e.g. `A01-03-002`).
- Lines without a code are headings — they are not valid answers.
- Every item needs at least one branch.

## Rule 6 — Proposing a new branch

If nothing in the list can hold an item, propose one in `new_paths`:
`{"parent":"A03-02-000","th":"ชื่อกิ่งภาษาไทย","en":"English Name","why":"why nothing existing fits"}`

- `parent` = the code of the branch it should hang under.
- Give both a Thai name and an English name.
- Do NOT invent a code — the owner assigns codes later, after reviewing your proposal.
- Name it broadly enough that other similar words can join it later.
- Usually this is `[]`.

## Spelling doubts

The owner dictates by voice, so a misspelling can arrive looking like a real Thai word.
If you suspect the text is not an actual Thai word, set
`"suspect": "⚠ ไม่แน่ใจว่ามีคำว่า X ในภาษาไทย · น่าจะเป็น Y"` — always propose the word
you think it should be. Otherwise `null`.
(Real case: `พลวัน` was stored, categorised and branched before anyone noticed the
correct word was `พัลวัน`.)

## Never

- 🔒 NEVER change even one character of `w`. It must match the input exactly.
  Suspected misspellings go in `suspect`, nowhere else.
- 🔒 NEVER skip an item or answer the same id twice.
- 🔒 NEVER write a branch name into `paths` — codes only.
- 🔒 NEVER guess which phrase an item was cut from and use that to pick branches.

## Output — write as you go, one item at a time

Write JSONL, one line per item, in the original id order.

🚨 **Append each answer to the output file as soon as you finish that item.**
Do NOT hold answers in memory and write them all at the end.
A previous run was cut off mid-way and every answer that had not been written was lost.
Writing continuously means an interruption costs only the item in progress.

```
{"id":1,"w":"กรอบแกรบ","suspect":null,"meanings":["เสียงเบาแห้งที่เกิดจากของแห้งเสียดสีหรือถูกเหยียบ"],"paths":["D09-01-000"],"new_paths":[]}
```
