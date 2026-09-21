---
title: Rule lifecycle
description: How Mjölnir deprecates or removes a shipped rule whose premise turned out to be wrong.
lastUpdated: false
---

# Rule lifecycle & deprecation policy

This governs **removing or weakening** a rule that has already shipped and
is found to be conceptually wrong — not merely noisy, but wrong: it flags
a pattern that turns out not to indicate a real problem, or its detection
cannot be made honest about its false-positive rate.

It is distinct from the **anti-creep law**, which governs _adding_ to the
rule set (every addition to the launch set requires an equal-size
removal). A tunable false-positive _rate_ is not grounds for deprecation
either — that is ordinary maintenance.

<!--@include: ../../docs/RULE-LIFECYCLE.md{16,}-->
