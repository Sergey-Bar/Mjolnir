# Skill budgets, measured

Calibration for the token budget in `SKILL.md`. A sibling file because it is a
lookup table: an author needs the current numbers when deciding whether a new
skill is too long, not on every read.

## The measured tree

| Skill | Lines | Words |
| --- | --- | --- |
| `rule-author` | 160 | 1222 |
| `skill-author` | 166 | 1222 |
| `surface-law` | 104 | 830 |
| `skill-supply-chain` | 112 | 824 |
| `verification-before-completion` | 91 | 785 |
| `change-gate` | 96 | 781 |
| `evidence` | 95 | 721 |
| `prose-honesty` | 85 | 654 (+ `patterns.md`, 397) |

The ceiling for a procedure is **1300 words**, and it is stated here rather
than in `SKILL.md` for a structural reason: this skill documents its own budget,
so a figure written into its body counts toward the number it sets. Move the
figure one file over and the self-reference disappears — and the two binding
skills, `rule-author` and `skill-author`, both land at 1222 with the headroom to
spare.

1250 was tried first and turned out to be unanswerable: both binding skills
landed on 1222, and calling that either in or out of budget is a judgement call,
which is what a ceiling exists to avoid. "~1200", the upstream figure this
started from, was worse — it was broken by all eight new skills on the first
pass, which makes it a target nobody measured rather than a target anybody met.

## Measure it yourself

Do not trust this table. It goes stale the way `.mjolnirignore` went stale, and
a stale budget is a budget nobody is enforcing:

```
npx tsx -e "const fs=require('fs');for(const s of fs.readdirSync('.claude/skills').sort()){const p='.claude/skills/'+s+'/SKILL.md';if(!fs.existsSync(p))continue;const t=fs.readFileSync(p,'utf8');console.log(String(t.split(/\s+/).filter(Boolean).length).padStart(5),'words ',String(t.split(/\r?\n/).length).padStart(4),'lines  ',s)}"
```

If a skill is over budget, the fix is a sibling file, not a shorter sentence.
Cutting prose out of a procedure to hit a number produces a procedure nobody
follows, which is the outcome the budget was invented to prevent.

## Why the upstream 500-word figure was wrong here

It came from `obra/superpowers`, which assumes a skill fires often enough that
context is the dominant cost. In this tree the eight new skills are repo
procedures that fire rarely and carry facts extracted from gate source and
26 KB of lifecycle documentation — reaching for the source costs more than the
line costs.

That is a reason, not a licence. Which is why the ceiling carries the
instruction to raise it in the open: the move from 500 to 1200 is recorded here
and in `SKILL.md`, so the next author sees that the number moved, when, and
against what measurement. A ceiling that moves silently is the arithmetic of
law 0's `baselineCore` edit — the arithmetic reads zero and the law reads as
satisfied.