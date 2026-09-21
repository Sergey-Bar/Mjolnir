---
title: False-positive audit
description: Measured false-positive rates for Mjölnir's rules, hand-classified against real OSS code.
editLink: false
lastUpdated: false
---

# False-positive audit

The north-star metric is a false-proof rate near zero. A rule that fires
on code where nothing is actually wrong erodes trust in the whole tool,
so the rules that ship in the headline tiers carry a false-positive rate
**measured against real open-source code**, not an author's guess.

The table below is regenerated from `tests/corpus/verdicts/*.jsonl`; the
raw source is on
[GitHub](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/FP-AUDIT.md).

<!--@include: ../../docs/FP-AUDIT.md{5,}-->
