# LEGENDARY ROADMAP — TIER 6 GITHUB STARS PLAYBOOK

> Extracted from Legendary-Roadmap.txt (source of truth). See docs/plans/ for full context.

# TIER 6 — THE GITHUB STARS PLAYBOOK ⭐⭐⭐

## How repos actually get 10k+ stars (deconstructed from trending history)

> STATUS: this entire tier is marketing/community activity, not code — none of it
> is "buildable" in `src/`. One exception: item #34's `create-rule` scaffold is
> ✅ DONE (`src/commands/create-rule.ts`). Everything else (README rewrite, launch
> waves, comparison pages, i18n docs, playground repo) — ⬜ NOT DONE, unstarted.

> Hard truth: stars are NOT a reward for quality. They're a reward for
> **a moment of discovery + instant gratification + shareability**.
> Repos with mediocre code hit 20k stars; brilliant tools die at 200.
> The difference is distribution engineering. Here's the full playbook.

## 31. The Landing Moment — README Is the Product 🔥🔥🔥

80% of visitors decide in 8 seconds. The README must be a landing page:

```markdown
# Mjölnir

### Your tests are lying to you. We prove it.

[ASCII/GIF demo — the scan output IS the hero image]

✓ Finds fake-green CI setups ✓ Kills flaky-test meetings
✓ Speaks Jest/Vitest/Playwright ✓ Zero config, local-first

npx mjolnir@latest
```

Requirements:

- **Hero GIF** (≤10s) showing a real scan catching a real bug — this is
  THE conversion asset. Invest a full day in it.
- One-line value prop, not feature list. "Your tests are lying" >
  "static analysis for test quality".
- Social proof section (even 3 early quotes) once available.
- Comparison table vs alternatives (§21 of MVP plan).
- Stars badge + contributors + Discord link above the fold.

## 32. Launch Choreography (stars come in bursts) 🔥🔥🔥

Stars arrive in spikes from single events. Sequence them:

```text
WAVE 1 — Foundations (before any launch):
  ├─ Show HN: Tuesday–Thursday, 7–9am PT (peak traffic)
  ├─ Same day: r/programming, r/QualityAssurance, r/devops
  └─ Hacker News title formula: "Show HN: [shocking claim] ([language])"
      → "Show HN: Your CI can go green while your tests fail"

WAVE 2 — Echo chamber (48h after HN):
  ├─ dev.to / Medium deep-dive with different content angle
  ├─ X/Twitter thread: the top-5 findings screenshots as story
  └─ LinkedIn (enterprise QAs live there)

WAVE 3 — Community embeds (weeks 2–6):
  ├─ Answer Playwright/Jest/Vitest GitHub issues WITH our tool
  ├─ PR docs links into awesome-testing, awesome-playwright lists
  ├─ Podcast tour: Testing Peers, AB Testing (Brent Jensen), Quality Sense
  └─ Conference CFP: "We removed 400 flaky tests" case study
```

Each wave needs a DIFFERENT content angle — same announcement everywhere
reads as spam and kills momentum.

## 33. Trending Mechanics (game the algorithm honestly) 🔥🔥

GitHub Trending formula ≈ stars/day velocity + unique stargazers:

- **Never buy stars** — detectable, community-destroying
- DO concentrate launches into 24–48h windows (velocity matters)
- DO add "Star this repo if..." CTA in CLI output (one line, tasteful):
  `★ Found this useful? github.com/mjolnir/mjolnir`
- DO create star-worthy MOMENTS: the 10k-star celebration commit,
  contributor wall, milestone changelogs
- Weekly release cadence = weekly reason to reappear in feeds/releases

## 34. Contribution Surface Engineering 🔥🔥

Stars follow contributors; contributors follow easy entry:

- `good-first-issue` labels ALWAYS stocked (rule ideas = perfect first PRs)
- `mjolnir create-rule` scaffold → adding a rule is a 30-min PR
- CONTRIBUTING.md with a 5-minute quickstart for the dev environment
- Publicly credit every contributor (all-contributors spec)
- Monthly "Rule of the Month" — community votes, we implement together

Every contributor is 5–10 stars through their own network.

## 35. The Demo Playground Repo 🔥🔥

Separate public repo: intentionally terrible test suite + CI config.

- README: "This repo fails Mjölnir spectacularly. Fork and scan."
- One-click Codespaces setup — scan without installing anything
- Every marketing post links here instead of the main repo (keeps main
  repo's issues clean, gives skeptics a sandbox)

## 36. Comparison Pages (SEO + positioning) 🔥

Static pages: "Mjölnir vs SonarQube", "vs ESLint plugins", "vs Codecov",
"Best Playwright testing tools 2026". These rank on Google forever and
convert people actively searching for alternatives. Content moat compounds.

## 37. The Number That Sells Itself 🔥

Public counters in README (from opt-in telemetry):

```text
⚡ 1.2M scans run · 🐛 84,000 fake-green setups detected · ⭐ join 8,300 devs
```

Social proof loop: usage → displayed → more usage. Update via Actions
weekly, fully automated.

## 38. Multilingual Docs = Underserved SEO Goldmine 🔥

Chinese, Japanese, Korean, Spanish, Portuguese, Hebrew README translations
(community-contributed, `docs/i18n/`). CN dev communities (Juejin, V2EX)
drive massive star volume and almost nobody localizes for them early.

## 39. Free for Open Source, Forever 🔥

Explicit policy page: OSS repos get everything free, always. Companies
paying for cloud features subsidize it. This policy gets quoted in
every "support OSS" thread = recurring organic exposure.

## 40. Star-Gating Ethics Line ⚠️

What we will NOT do (protects the brand that makes stars sustainable):

- No star-gating features ("star to unlock") — breeds resentment
- No fake activity/bots — one detection ends the project's credibility
- No engagement-bait controversies — QA community is small, memory is long

---

# THE STAR MATH (reality check)

```text
Typical trajectory for legendary dev tools:
  Launch wave (HN front page):     +800–3,000 stars in 48h
  Echo waves + content:            +100–300/week sustained
  Each major release event:        +200–500 spike
  Trending page appearances:       +500–1,000 per appearance
  Year 1 realistic target:         8–15k stars with disciplined execution

Prerequisites before ANY launch wave:
  ✓ Hero GIF + landing-grade README
  ✓ <60s from npx to first wow-moment
  ✓ Demo playground repo live
  ✓ Issue templates + good-first-issues stocked
  ✓ Docs site with 10+ rule pages
  ✗ Never launch before FP-rate is proven low — one HN comment thread
    about false positives kills the entire wave
```

---

# INSERTION INTO ROADMAP

```text
BEFORE LAUNCH (Weeks 9–12 of Sprint Plan):
  ├─ Hero GIF production day              (#31)
  ├─ Demo playground repo                 (#35)
  ├─ Launch choreography doc              (#32 waves pre-written)
  ├─ good-first-issue backlog ×10         (#34)
  └─ Comparison pages draft               (#36)

LAUNCH WEEK:
  └─ Full wave sequence executed          (#32)

POST-LAUNCH ONGOING:
  ├─ Weekly releases + milestone moments  (#33)
  ├─ Multilingual READMEs                 (#38)
  ├─ Usage counters automation            (#37)
  └─ OSS-free policy page                 (#39)
```

# SEVENTH NORTH STAR SENTENCE

7. _"I saw the GIF, ran one command, and it found a real problem in my
   repo in under a minute."_
