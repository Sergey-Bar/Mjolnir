<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### আপনার টেস্টগুলো আপনাকে মিথ্যা বলছে। আমরা তা প্রমাণ করি।

**QA-এর জন্য Verification Trust Engine।** Mjölnir টেস্ট সুইট ও CI
পাইপলাইন অডিট করে, একটি নির্ভরযোগ্যতা স্কোর রিপোর্ট করে এবং ঠিক কোথায়
আস্থা ভাঙছে তা দেখায়।

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | বাংলা | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**আপনার টেস্টগুলো কি আস্থার যোগ্য?**

[কাজে দেখুন](#-কাজে-দেখুন) ·
[দ্রুত শুরু](#-দ্রুত-শুরু) ·
[কী পরীক্ষা করে](#-mjölnir-কী-পরীক্ষা-করে) ·
[স্কোরিং](#স্কোর-কীভাবে-কাজ-করে) ·
[CI](#-ci-ইন্টিগ্রেশন) · [কনফিগারেশন](#কনফিগারেশন) ·
[ডকুমেন্টেশন](#-ডকুমেন্টেশন)

</div>

---

## 🎬 কাজে দেখুন

<p align="center">
  <img src="assets/readme/demo.svg" alt="ডেমো রিপোর উপর Mjölnir-এর সম্পূর্ণ --verbose রিপোর্ট: WORTHINESS 75/100 NEEDS WORK, বিভাগভিত্তিক ডায়াগনস্টিক ভাঙানো, FIX THIS FIRST তালিকা এবং প্রতিটি finding-এ rule ID ও লাইন নম্বর — CI, Playwright, টেস্ট-হাইজিন ও Python রুল জুড়ে" width="900" />
</p>

<sub>`npx mjolnir-qa ./examples/demo-repo --verbose`-এর পূর্ণ আউটপুট,
আসল reporter থেকে রেন্ডার করা — কিছুই কাটা নয়। `npm run docs:demo`
দিয়ে আবার তৈরি হয়;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
টেস্টটি টুল যা প্রিন্ট করে সে থেকে সরে গেলে CI ব্যর্থ করে।</sub>

**এইমাত্র কী ঘটল:**

1. Mjölnir Playwright spec-গুলো, তার কনফিগ, CI workflow ও একটি Python
   টেস্ট ফাইল আবিষ্কার করল — চার ভাষা/ফরম্যাট, এক পাসে।
2. সুইটের ওপর আস্থা দুর্বল করে এমন প্রমাণ পেল — একটি job ঢেকে রাখা
   `continue-on-error`, একটি exit code গিলে ফেলা `|| true`, কড়া sleep,
   ভঙ্গুর selector, hardcode করা staging URL, `networkidle` wait।
3. প্রতিটিকে বানাল একটি সুনির্দিষ্ট finding — rule ID, অবস্থান ও ফিক্স
   সহ — এবং একটি একক স্কোর, যার উপর আপনি PR gate করতে পারেন।

### একটি finding, কাছ থেকে

উপরের প্রথম finding-এর জন্য `mjolnir explain QA-CI-001` চালান, এবং
পাবেন:

```text
▚▞ QA-CI-001 — continue-on-error masks a failing verification gate

Severity:    error
Confidence:  high
Evidence:    E2
Measured FP: not yet measured — this rule ships on assumption (see docs/FP-AUDIT.md)

WHAT WAS FOUND (real detector output, not a mockup)
  Job `security-scan` runs a verification gate under `continue-on-error: true`.

WHY IT MATTERS
  This job can fail every day and CI will still show green. The checkmark
  on this workflow cannot be trusted.

HOW TO FIX
  Remove continue-on-error, or scope it to individual non-blocking steps only.
```

এটাই মূল্যের একক: স্টাইলের খোঁচা নয়, বরং সেই জায়গা যেখানে আপনার CI
বলছে কিছু পাস হয়েছে — অথচ হয়নি।

---

## ⚡ দ্রুত শুরু

একটি রিপোর বিরুদ্ধে চালান — সম্পূর্ণ রিপোর্ট ও নির্ভরযোগ্যতা স্কোরের
জন্য:

```bash
npx mjolnir-qa@latest
```

**CI-তে পণ্যটি একটি মাত্র কমান্ড।** শুধু branch যা স্পর্শ করেছে তা
স্ক্যান করে এবং নতুন সমস্যায় অশূন্য কোডে বের হয়:

```bash
npx mjolnir-qa@latest --scope changed
```

এটি একটি PR check-এ ফেলে দিন — `mjolnir ci install` workflow লিখে দেয় —
এবং শেষ। বাকি সব ঐচ্ছিক।

| কমান্ড                              | এটি কী করে                                          |
| ----------------------------------- | --------------------------------------------------- |
| `mjolnir`                           | পূর্ণ-রিপো স্ক্যান + নির্ভরযোগ্যতা স্কোর            |
| `mjolnir --scope changed`           | শুধু আপনার branch যা আনল — CI রূপ                   |
| `mjolnir ci install`                | উপদেশমূলক PR workflow তৈরি করে                      |
| `mjolnir explain QA-CI-001`         | কী / কেন / ফিক্স + একটি রুলের জন্য পরিমাপকৃত FP হার |
| `mjolnir rules --unmeasured`        | পরিমাপ নয়, অনুমানের ভিত্তিতে চলা রুলগুলো           |
| `mjolnir --json` / `--format sarif` | মেশিন-পাঠযোগ্য / GitHub Code Scanning               |
| `mjolnir --strict`                  | quarantine টিয়ারের রুলও চালায় (উচ্চতর FP ঝুঁকি)   |

<details>
<summary><strong>কিছু flaky হলে</strong></summary>

| কমান্ড                              | এটি কী করে                                              |
| ----------------------------------- | ------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | প্রকৃত রান-ডেটা → `TRUE-FLAKE` রায়, `FLAKY.md`         |
| `mjolnir triage ./test-results/`    | এক্সিকিউশন ইতিহাস থেকে কোয়ারেন্টাইন প্রস্তাব           |
| `mjolnir pw-report ./test-results/` | Playwright রান-সারসংক্ষেপ — retry / flake / সবচেয়ে ধীর |
| `mjolnir doctor:playwright`         | শুধু-Playwright গভীর স্ক্যান + Selector Health Score    |

</details>

<details>
<summary><strong>মাঝে মাঝে / রিপোর্ট</strong></summary>

| কমান্ড                          | এটি কী করে                                           |
| ------------------------------- | ---------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | প্রমাণসহ নিরাপদ অটো-ফিক্স                            |
| `mjolnir baseline` / `diff`     | finding স্ন্যাপশট, পরে শুধু নতুন/নাজুক হওয়া রিপোর্ট |
| `mjolnir impact --since <ref>`  | আগের কমিটের পর কী বদলেছে                             |
| `mjolnir debt`                  | খরচের মডেলসহ টেস্ট-ঋণ রেজিস্টার                      |
| `mjolnir handover`              | নতুন QA-র জন্য সুইটের অনবোর্ডিং ম্যাপ                |
| `mjolnir stats`                 | দেখা ফিক্সগুলোর লোকাল সর্বকালের গণনা                 |
| `mjolnir badge`                 | shields.io endpoint JSON + snippet                   |
| `mjolnir rules --md`            | সম্পূর্ণ রুল ক্যাটালগ (JSON বা Markdown)             |
| `mjolnir doctor`                | Mjölnir-এর নিজের রুল বেসের আত্ম-অডিট                 |
| `mjolnir create-rule <ID>`      | নতুন রুল + ফিক্সচার স্কাফোল্ড                        |
| `mjolnir --format mermaid`      | PR কমেন্টের জন্য টেস্ট-আর্কিটেকচার ডায়াগ্রাম        |

</details>

চাইলে `npx`-এর বদলে গ্লোবালি ইনস্টল করুন: `npm i -g mjolnir-qa`।
Node.js ≥ 22.18 প্রয়োজন। Windows, macOS ও Linux-এ চলে।

---

## 👥 এটা কাদের জন্য?

- **QA / SDET** — e2e বা ইন্টিগ্রেশন সুইটের মালিক, যাদের প্রমাণ দরকার
  যে সুইট সত্যিই সেই সবুজ টিক দাগের যোগ্য, যা সে তৈরি করে।
- **Platform / DevEx টিম** — CI অখণ্ডতা ও release gate-এর দায়িত্বে
  থাকা মানুষ, যারা চান না `continue-on-error` কখনো চুপচাপ লাল
  পাইপলাইনকে সবুজ করে ফেলুক।
- **OSS maintainers** — যারা সস্তা, সবসময় চালু একটি যাচাই-গেট চান,
  যা লোকালি ও CI-তে শূন্য নেটওয়ার্ক কলে চলে।

---

## 🔨 Mjölnir কী পরীক্ষা করে

|     |                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **নির্ভরযোগ্যতা স্কোর** — একটি সংখ্যা, স্বচ্ছ বাদ টেবিল, কোনো কালো বাক্স নয়                                     |
| 🎭  | **Selector Health Score** — শুধু আপনার পাস-রেট নয়, আপনার Playwright locator-এর গ্রেড দেয়                       |
| 🔬  | **রানটাইম ফরেনসিক** — আসল Playwright/JUnit রান-ডেটা পড়ে `TRUE-FLAKE` ধরে, শুধু স্ট্যাটিক জল্পনা নয়             |
| 🚨  | **CI-অখণ্ডতার রুল** — `continue-on-error`, `\|\| true` ও অন্যান্য মিথ্যা-সবুজ কৌশল ধরে                           |
| 🐍  | **চারটি Playwright বাইন্ডিং-ই** — TypeScript, Python, Java, C#/.NET — এর সাথে pytest, JUnit/TestNG ও CI workflow |
| 🔒  | **Local-first** — স্ক্যানের সময় শূন্য নেটওয়ার্ক কল, শূন্য টেলিমেট্রি, সেকেন্ডে চলে                             |

### রুলগুলো

প্রতিটি রুল must-fire **এবং** must-not-fire ফিক্সচারসহ আসে। যে রুল
তার নিজের নেগেটিভ ফিক্সচারে ফায়ার করে সে শিপ করতে পারে না — এটাই
false-positive ফায়ারওয়াল।

<details>
<summary><strong>টেস্ট হাইজিন</strong></summary>

| ID          | রুল                                                 | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | ফোকাসড টেস্ট কমিট করা (`.only`, `fit`)              | error    |
| QA-TEST-002 | কোনো কারণ ছাড়া বাদ দেওয়া টেস্ট                    | error    |
| QA-TEST-002 | সংরক্ষিত কারণসহ বাদ দেওয়া টেস্ট                    | warning  |
| QA-TEST-003 | assertion-বিহীন টেস্ট                               | error    |
| QA-TEST-004 | কড়া sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | flakiness লুকানো retry-অপব্যবহার                    | warning  |
| QA-TEST-010 | খালি টেস্ট বডি                                      | error    |

</details>

<details>
<summary><strong>টেস্ট কোয়ালিটি</strong></summary>

| ID           | রুল                           | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | শুধু mock-ভিত্তিক যাচাই       | info     |
| QA-TQUAL-002 | টাটলজিক্যাল assertion         | error    |
| QA-TQUAL-009 | await-বিহীন promise assertion | error    |
| QA-TQUAL-011 | কমেন্ট-আউট করা টেস্ট          | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | রুল                                     | Severity |
| --------- | --------------------------------------- | -------- |
| QA-PW-002 | await-বিহীন locator assertion           | error    |
| QA-PW-003 | কমিট করা `page.pause()` / `test.only()` | error    |
| QA-PW-004 | ভঙ্গুর CSS/XPath selector               | warning  |
| QA-PW-005 | `page.evaluate()`-এর ভিতরে বিজনেস লজিক  | info     |
| QA-PW-114 | লিগেসি element handle (`page.$`)        | info     |
| QA-PW-118 | `networkidle` wait (flaky by design)    | info     |
| QA-PW-123 | hardcode করা পরিবেশ URL                 | warning  |

</details>

<details>
<summary><strong>CI অখণ্ডতা</strong></summary>

| ID        | রুল                                                                 | Severity |
| --------- | ------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` ব্যর্থতা ঢেকে রাখে                              | error    |
| QA-CI-002 | `\|\| true` exit code গিলে ফেলে                                     | error    |
| QA-CI-005 | রিপোর্ট ব্যবহৃত হয় কিন্তু কখনো তৈরিই হয় না                        | error    |
| QA-CI-007 | টেস্টের চারপাশে retry-র‍্যাপার                                      | warning  |
| QA-CI-008 | সর্বদা-সফল step ব্যর্থতা ঢেকে রাখে                                  | error    |
| QA-CI-009 | টেস্টের exit code প্রচারিত হয় না (`\|` pipefail ছাড়া, `;` চেইন)   | error    |
| QA-CI-010 | যেখানে ব্লক করা চাই সেখানেই টেস্ট বাদ দেওয়া হয় (skip-on-PR guard) | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | রুল                                             | Severity |
| --------- | ----------------------------------------------- | -------- |
| QA-PY-002 | বাদ দেওয়া টেস্ট (`skip`, কঠোর-নয় এমন `xfail`) | warning  |
| QA-PY-003 | assertion-বিহীন টেস্ট ফাংশন                     | error    |
| QA-PY-005 | টেস্টে `time.sleep()`                           | warning  |
| QA-PY-006 | খালি টেস্ট বডি (`pass`)                         | info     |
| QA-PY-010 | freeze ছাড়া এলোমেলো/সময় নির্ভরতা              | info     |
| QA-PY-012 | টাটলজিক্যাল assertion                           | error    |

মোট ২০টি Python রুল (QA-PY-001…012 pytest হাইজিন + QA-PY-101…108 Playwright-Python)।

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | রুল                                      | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | নিষ্ক্রিয় টেস্ট (`@Disabled`)           | warning  |
| QA-JV-102 | কড়া sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | assertion-বিহীন টেস্ট মেথড               | error    |
| QA-JV-105 | Playwright কড়া sleep `waitForTimeout()` | warning  |
| QA-JV-106 | role locator-এর বদলে ভঙ্গুর selector     | warning  |
| QA-JV-108 | টেস্টে hardcode করা পরিবেশ URL           | info     |
| QA-JV-111 | ছাতা-মক `page.route("**")`               | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | রুল                                            | Severity |
| --------- | ---------------------------------------------- | -------- |
| QA-CS-101 | বাদ দেওয়া টেস্ট (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | কড়া sleep (`Thread.Sleep` / `Task.Delay`)     | warning  |
| QA-CS-103 | assertion-বিহীন টেস্ট মেথড                     | error    |
| QA-CS-105 | কড়া sleep `WaitForTimeoutAsync()`             | warning  |
| QA-CS-106 | role locator-এর বদলে ভঙ্গুর selector           | warning  |
| QA-CS-108 | টেস্টে hardcode করা পরিবেশ URL                 | info     |
| QA-CS-111 | ছাতা-মক `page.RouteAsync("**")`                | info     |

</details>

> সম্পূর্ণ লাইভ ক্যাটালগ — প্রতিটি রুল tier, confidence, false-positive
> ঝুঁকি ও autofix উপলব্ধতাসহ — registry থেকে তৈরি হয়:
>
> ```bash
> mjolnir rules --md
> ```
>
> প্রতি-রুল পেজগুলো [`docs/rules/`](docs/rules/)-এর অধীনে।

### এর মধ্যে কতটা পরিমাপ করা হয়েছে

**৯৯টি রুলের ৭৪টি বাস্তব OSS কোডের বিরুদ্ধে পরিমাপকৃত false-positive
হার বহন করে** (প্রতিটিতে ≥ ১০টি হাতে-শ্রেণিবদ্ধ finding; দেখুন
[docs/FP-AUDIT.md](docs/FP-AUDIT.md))। বাকি ১৯টি লেখকের অনুমানে শিপ হয়।
প্রতিটি স্ক্যানের ফুটার বলে দেয় _ফায়ার_ করা রুলগুলোর কতগুলো পরিমাপকৃত;
`mjolnir rules --unmeasured` যেগুলো নয় তা তালিকাভুক্ত করে; প্রতিটি রুলের
`mjolnir explain` পেজ তার অবস্থা জানায়। আমরা হারটি প্রকাশ করি — এমনকি
কুৎসিত হলেও — QA-CS-103 ৯৫%-এ অডিট হয় এবং এজন্যই কোয়ারেন্টাইনে। সেই
৭৮ বাড়ানোই প্রজেক্টের চলমান কাজ।

### রুল টিয়ার ও ভাষা-পরিপক্বতা

প্রতিটি রুল `core`, `extended` বা `quarantine`, তার **পরিমাপকৃত**
false-positive হার অনুযায়ী নির্ধারিত:

| Tier         | অর্থ                                | ডিফল্ট স্ক্যান | `--strict` |
| ------------ | ----------------------------------- | :------------: | :--------: |
| `core`       | ≤ ১০ % পরিমাপকৃত FP                 |       ✅       |     ✅     |
| `extended`   | ≤ ৩০ % পরিমাপকৃত FP                 |       ✅       |     ✅     |
| `quarantine` | এর বেশি, বা এখনো অপরিমাপিত (n < ১০) |       ❌       |     ✅     |

| ভাষা            | Adapter       | আজকের কভারেজ                                          |
| --------------- | ------------- | ----------------------------------------------------- |
| TypeScript / JS | কম্পাইলার AST | ব্যাপকতম, সর্বাধিক পরিমাপকৃত — মূলত `core`/`extended` |
| Python / pytest | regex স্তর    | ব্যাপক, corpus-অডিটেড — মূলত `core`/`extended`        |
| Java            | regex স্তর    | নতুন — মূলত `extended`/`quarantine`                   |
| C# / .NET       | regex স্তর    | নতুন — মূলত `extended`/`quarantine`                   |

TypeScript ও Python-এর পরিমাপকৃত কভারেজ সবচেয়ে ব্যাপক। Java ও C# শিপ
হয়েছে, ডকুমেন্টেড, এবং আসল কনজিউমার সুইট (বাইন্ডিং লাইব্রেরির নিজের
টেস্ট নয়) অডিট হওয়া পর্যন্ত হেডলাইন সংখ্যার বাইরে থাকে।

---

## স্কোর কীভাবে কাজ করে

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir-এর টার্মিনাল আউটপুট — WORTHINESS 75/100 NEEDS WORK, বিভাগভিত্তিক ডায়াগনস্টিক ভাঙানো ও FIX THIS FIRST তালিকা" width="820" />
</p>

<sub>`npm run docs:hero` দিয়ে আবার তৈরি হয়;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
টেস্টটি reporter যা সত্যিই প্রিন্ট করে সে থেকে সরে গেলে CI ব্যর্থ করে।</sub>

স্কোর স্বচ্ছ: **error −8, warning −3, info −1**, পরে সুইট-এক্সপোজার দিয়ে
নরমালাইজ (প্রতি টেস্ট ডিক্লারেশনে বাদ)। প্রমাণ-ভিত্তিক বাদ মানে দুর্বল
সিগন্যালের দাম কম। টার্মিনাল সেই একই ডিসকাউন্টেড সংখ্যা দেখায় যা স্কোর
ব্যবহার করে — কোনো কালো বাক্স নয়। পূর্ণ পদ্ধতি:
[docs/SCORING.md](docs/SCORING.md)।

**রায়**

| Score   | রায়             |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**প্রমাণ স্তর** — প্রতিটি finding একটি বহন করে; এটি স্কোরে finding-এর
ওজন নির্ধারণ করে:

| স্তর | অর্থ                 | স্কোরে প্রভাব     | উদাহরণ                                                |
| ---- | -------------------- | ----------------- | ----------------------------------------------------- |
| E2   | নির্ধারণী ত্রুটি     | পূর্ণ বাদ         | কমিট করা `.only` — কাঠামোগতভাবে প্রমাণযোগ্য           |
| E1   | হিউরিস্টিক প্যাটার্ন | অর্ধেক বাদ        | regex-এ ধরা `sleep()` — জোরালো সংকেত, প্রমাণ নয়      |
| E0   | পর্যবেক্ষণ           | শূন্য (শুধু info) | রিপোর্ট হয় কিন্তু কখনো CI gate করে না বা বাদ দেয় না |

বেশিরভাগ রুল **E1**। «we prove it» স্লোগানটি এই ব্যবস্থাকে বোঝায়: E2
finding কাঠামোগত প্রমাণ; E1 finding সঠিকভাবে স্থাপিত সতর্কতা, আনুষ্ঠানিক
প্রমাণ নয়।

খালি রিপো `null` স্কোর পায়, কখনোই নকল ১০০ নয় — দেখুন
[আস্থার মডেল](#আস্থার-মডেল)।

---

## 🎭 Selector Health Score

Playwright সুইটের হেডলাইন মেট্রিক — আপনার locator কতটা টেকসই:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

role-ভিত্তিক locator পূর্ণ স্কোর পায়। CSS class চেইন ও XPath স্কোর
ডুবিয়ে দেয় — যেকোনো DOM refactor-এ ভেঙে পড়ে, বলে না কোন আচরণ
নষ্ট হলো।

---

## 🔬 রানটাইম প্রমাণ

স্ট্যাটিক flakiness সনাক্তকরণ হলো আন্দাজ। Mjölnir **প্রকৃত এক্সিকিউশন
ডেটা** পড়ে — যেকোনো রানারের Playwright JSON রিপোর্ট ও JUnit XML:

```bash
mjolnir forensics ./test-results/
```

```text
▚▞ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

প্রথম থেকে attempt ≥ 2-তে পাস করা টেস্ট পাস করা টেস্ট নয় — সেটি ভাগ্যবান
টেস্ট। চূড়ান্ত সবুজ টিক নির্বিশেষে এটি `TRUE-FLAKE` চিহ্নিত হয়।

---

## ⚡ Mjölnir আরেকটি linter নয়

Linter বলে কোড রুল মানে কি না। Mjölnir বলে আপনার যাচাই-ব্যবস্থার ওপর
আস্থা রাখা যায় কি না।

|                                                                  | ESLint / SonarQube | Coverage টুল | ম্যানুয়াল রিভিউ | **Mjölnir** |
| ---------------------------------------------------------------- | :----------------: | :----------: | :--------------: | :---------: |
| CI workflow অখণ্ডতা (`continue-on-error`, `\|\| true`)           |         ❌         |      ❌      |       বিরল       |     ✅      |
| ক্রস-ভাষা (TS, Python, Java, C#) এক টুল থেকে                     |         ❌         |      ❌      |        ❌        |     ✅      |
| Playwright locator-এর স্থিতিস্থাপকতা গ্রেড করে (Selector Health) |         ❌         |      ❌      |       বিরল       |     ✅      |
| আসল assertion-বিহীন টেস্ট চিহ্নিত করে                            |   ✅ (প্লাগইন)\*   |      ❌      |    কখনো কখনো     |     ✅      |
| কড়া sleep ধরে (`waitForTimeout`, `time.sleep`)                  |   ✅ (প্লাগইন)\*   |      ❌      |    কখনো কখনো     |     ✅      |
| সেকেন্ডে চলে, স্ক্যানের সময় শূন্য নেটওয়ার্ক কল                 |         ✅         |      ✅      |        —         |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) ও `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) নিজ নিজ ফ্রেমওয়ার্কের জন্য এগুলো
কভার করে।

**রানটাইম বিশ্লেষণ** স্ট্যাটিক লিন্টিং থেকে আলাদা বিভাগ:

|                                               | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| --------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| `TRUE-FLAKE` রায়ের জন্য আসল রান-ডেটা পড়ে    |          আংশিক\*          |      আংশিক (tag)      |          ✅           |
| এক্সিকিউশন ইতিহাস থেকে flaky-ট্রায়াজ রিপোর্ট |            ❌             |          ✅           |          ✅           |
| স্ট্যাটিক নির্ভরযোগ্যতা স্কোরের সাথে সংযুক্ত  |            ❌             |          ❌           |          ✅           |

\*Playwright ভেতরে ভেতরে retry ট্র্যাক করে কিন্তু রায়-লেবেলসহ স্বতন্ত্র
flakiness রিপোর্ট তৈরি করে না।

---

## 🤖 শুধু AI কোড রিভিউ ব্যবহার করলেই তো হয়?

ভিন্ন সমস্যা, ভিন্ন স্তর। AI রিভিউ diff-এ সন্দেহজনক টেস্ট-পরিবর্তন ধরতে
পারে; এটি প্রমাণ করে না যে যাচাই-ব্যবস্থা সমগ্রভাবে আস্থার যোগ্য — এবং
এটি কেবল আপনি দেখানো diff-ই দেখে।

|                                    |  AI কোড রিভিউ (Copilot ইত্যাদি)  |          **Mjölnir**          |
| ---------------------------------- | :------------------------------: | :---------------------------: |
| প্রতি স্ক্যানে খরচ                 |   Token (diff-এর আকারে বাড়ে)    | **শূন্য** (লোকাল, ইনস্টল করা) |
| পুরো সুইট + সব CI কনফিগ দেখে       |    শুধু আপনার দেখানো PR diff     |     **সবকিছু, প্রতিবার**      |
| নির্ধারণী (একই ইনপুট → একই আউটপুট) |         ❌ (অনির্ধারণী)          |            **✅**             |
| মাসের পর মাস সুপ্ত প্যাটার্ন ধরে   |       শুধু কনটেক্সটে থাকলে       | **✅** (সব ফাইল স্ক্যান করে)  |
| রানের মাঝে finding মনে রাখে        | ❌ (সেশনের মাঝে কোনো স্মৃতি নেই) |   **✅** (baseline + diff)    |
| মানুষের ট্রিগার ছাড়াই চলে         |        PR বা prompt দরকার        |  **✅** (CI হুক, ৩ সেকেন্ড)   |

**দুটোই ব্যবহার করুন।** AI সূক্ষ্মতা, অভিপ্রায় ও এমন ডিজাইন-ত্রুটি ধরে
যা কোনো regex খুঁজে পায় না। Mjölnir সেই কাঠামোগত প্যাটার্ন ধরে যা AI
«ইচ্ছাকৃত» মনে হওয়ায় এড়িয়ে যায় — কমিট করা `.only`, গিলে ফেলা exit
code, টেস্ট job-এ `continue-on-error`। এগুলো ভাবনার প্রয়োজন এমন বাগ
নয়; স্ক্যানের প্রয়োজন এমন সত্য।

---

## 🤖 CI ইন্টিগ্রেশন

এক কমান্ডে PR workflow তৈরি হয় — ডিফল্টে উপদেশমূলক, কখনো ব্লক করে না:

```bash
mjolnir ci install
```

অথবা SARIF দিয়ে GitHub Code Scanning-এ নেটিভভাবে যুক্ত করুন:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

SARIF-এর জন্য এডিটর ও পাইপলাইন সেটআপ:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)।

### Changed-scope কভারেজ

`--scope changed` finding-গুলোকে সেই লাইনগুলোতে দায়ী করে যা আপনার branch
`main`-এর সাথে merge-base-এর বিপরীতে যোগ করেছে। এটি টেস্ট ফাইল
(`*.spec.*`, `*.test.*`) এবং diff-এর GitHub workflow ফাইল ও Playwright
কনফিগ কভার করে। merge-base সমাধান না হলে — shallow clone, detached HEAD,
git-বিহীন টার্গেট, ভিন্ন ডিফল্ট branch — এটি সৎভাবে অবনমিত হয়: finding
সম্পূর্ণ-ফাইল দায়ীত্বে ফিরে যায় এবং রিপোর্ট তা বলে। বেস ref
`--base <ref>` দিয়ে ওভাররাইড করুন।

---

## কনফিগারেশন

Mjölnir zero-config। রিপো রুটে ঐচ্ছিক `mjolnir.config.json` (বা
`.mjolnir.json`) severity, gating ও scope মেরামত করে — ডিটেকশন
সেমান্টিক্স কখনো বদলায় না।

| Key                 | টাইপ                                 | প্রভাব                                                                                                                                             |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | অতিরিক্ত ignore glob (gitignore উপসেট), বিল্ট-ইন ডিফল্টের উপরে                                                                                     |
| `gate`              | `"advisory" \| "error" \| "warning"` | কোন severity অশূন্য কোডে বের হবে (ডিফল্ট `error`; `advisory` কখনো ব্লক করে না)                                                                     |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | আপনার রিপোর জন্য একটি রুলের finding পুনঃস্থাপন করে                                                                                                 |
| `ignore`            | `IgnoreEntry[]`                      | finding দমন করে — **`reason` আবশ্যক**; এন্ট্রি ৯০ দিন পরে মেয়াদোত্তীর্ণ হয় (স্পষ্ট `expires` তারিখ, বা না-থাকলে কনফিগ ফাইলের last-modified সময়) |
| `plugins`           | `string[]`                           | তৃতীয় পক্ষের রুল প্যাকেজ (দেখুন [আস্থার মডেল](#আস্থার-মডেল))                                                                                      |

```json
{
  "gate": "error",
  "exclude": ["legacy/**"],
  "severityOverrides": { "QA-PW-118": "warning" },
  "ignore": [
    {
      "ruleId": "QA-TEST-004",
      "files": ["e2e/legacy-login.spec.ts"],
      "reason": "Third-party widget needs a settle delay; tracked in JIRA-4821",
      "expires": "2026-12-31"
    }
  ]
}
```

- **`.mjolnirignore`** — পাথ বর্জনের জন্য সাধারণ gitignore-স্টাইল ফাইল,
  `exclude`-এর একই ভাষা। মেশিন-ব্যাপী নয়েজের জন্য এটি; `exclude` ব্যবহার
  করুন যখন তালিকাটি version control-এ, বাকি কনফিগের পাশে থাকবে।
- **CLI ওভাররাইড** — `--strict` (quarantine রুল অন্তর্ভুক্ত),
  `--width <cols>` ও `--ascii` / `--no-ascii` (টার্মিনাল রেন্ডারিং),
  `--tone blunt` (আরও সোজাসাপ্টা বার্তা), `--max-duration <sec>`
  (সীমিত আংশিক স্ক্যান)।
- রুল দমন ও deprecation জীবনচক্র: [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)।

`ignore` এন্ট্রি স্বতন্ত্র `mjolnir suppressions` কমান্ডকেও চালিত করে,
যা বর্তমানে দমন করা বিষয়গুলো ও প্রতিটি এন্ট্রির মেয়াদ তালিকাভুক্ত করে।

---

## 📐 এক্সিট কোড ও চুক্তি

ফ্রিজ করা — ওপরে CI লজিক বানানো নিরাপদ:

| এক্সিট কোড | অর্থ                                                              |
| ---------- | ----------------------------------------------------------------- |
| `0`        | পরিষ্কার — গেটে বা তার উপরে কোনো finding নেই                      |
| `1`        | গেটে বা তার উপরে finding                                          |
| `2`        | আংশিক স্ক্যান (সময়-বাজেট শেষ, অপঠনযোগ্য ফাইল) — কখনো ব্লক করে না |
| `10`       | ব্যবহার-ত্রুটি (ভুল ফ্ল্যাগ, টার্গেট অনুপস্থিত)                   |
| `20`       | অভ্যন্তরীণ ত্রুটি                                                 |

JSON/SARIF রিপোর্ট `schemaVersion: 1`। রুল ID (`QA-<FAMILY>-NNN`)
শিপ হওয়ার পর অপরিবর্তনীয় এবং কখনো পুনরায় ব্যবহার করা হয় না।

---

## আস্থার মডেল

- **Local-first** — স্ক্যানের সময় শূন্য নেটওয়ার্ক কল। কখনোই নয়।
  শূন্য টেলিমেট্রি।
- **মিথ্যা প্রমাণ নেই** — «যাচাই হয়েছে» বলার চেয়ে «অজানা» বলা পছন্দ।
  খালি রিপো `score: null` পায়, নকল ১০০ নয়।
- **আংশিক সততা** — বিশ্লেষণ কাটা পড়লে আউটপুট তা বলে। সত্যি না হলে
  কখনো «complete» নয়।
- **FP ফায়ারওয়াল** — ডিটেকশন চলে কমেন্ট/স্ট্রিং-মুক্ত কোড-ভিউতে
  (TypeScript রুল কম্পাইলার AST ব্যবহার করে): গদ্য কমেন্টের ভিতরের বা
  ডক-উদাহরণ স্ট্রিংয়ের প্যাটার্ন ডকুমেন্টেশন, finding নয়।
- **পরিমাপকৃত, দাবিকৃত নয়** — শুধু যে রুলের বাস্তব OSS কোড থেকে
  false-positive হার আছে তা হেডলাইন টিয়ারে শিপ হয় (দেখুন
  [এর মধ্যে কতটা পরিমাপ করা হয়েছে](#এর-মধ্যে-কতটা-পরিমাপ-করা-হয়েছে));
  স্ক্যান ফুটার ও `mjolnir rules --unmeasured` কোনটি কী তা বলে।
- **প্লাগইন-আস্থা** — প্লাগইন হলো `"plugins"`-এর অধীনে ঘোষিত npm
  প্যাকেজ। **কোনো sandbox নেই**: প্লাগইন কোড পূর্ণ Node বিশেষাধিকারে
  চলে, ESLint বা Vitest প্লাগইনের একই আস্থার মডেল। core রুল-ID প্রিফিক্স
  সংরক্ষিত এবং জালিয়াতি রোধে প্লাগইন থেকে প্রত্যাখ্যাত।
- **Workspace-লোকাল বাহ্যিক রুল** (ফোল্ডার-ভিত্তিক, শূন্য নেটওয়ার্ক) —
  স্ক্যান টার্গেটের পাশে একটি `mjolnir-rules/` ডিরেক্টরি কাস্টম রুল লোড
  করে: JSON ফাইল regex প্যাটার্ন ঘোষণা করে (কোনো কোড চালানো হয় না),
  `.mjs`/`.js` মডিউল `rules` export করে (পূর্ণ Node আস্থা, প্লাগইনের
  মতো)। বাহ্যিক রুল core-এর একই trust মেটাডেটা বহন করে; কখনোই core
  টিয়ারে শিপ হতে পারে না (core-এর জন্য corpus sidecar থেকে পরিমাপকৃত FP
  হার দরকার — ঘোষিত `tier: "core"` `extended`-এ নিচু হয়ে যায়), tier
  সীমা মানে এবং ড্রিফট-চেক হয়: `mjolnir rules --md --external` লোড
  করা ফাইল থেকে ক্যাটালগ রেন্ডার করে (প্রোভেন্যান্স `external`), এবং
  ম্যাট্রিক্স জেনারেটর `--external <root>` গ্রহণ করে।

---

## 🏗️ আর্কিটেকচার

<details>
<summary>ট্রি প্রসারিত করুন</summary>

```
mjolnir/
├── src/
│   ├── engine/          # LanguageAdapter interface + rule runner
│   ├── adapters/        # typescript · python · java · csharp · github-actions
│   ├── rules/           # rules across 8 families + the measured-FP table
│   ├── playwright/      # Selector Health Score engine
│   ├── discovery/       # workspace, frameworks, ignore resolution
│   ├── scope/           # git merge-base changed-scope engine
│   ├── scorer/          # transparent deduction table + prioritization
│   ├── reporter/        # terminal · JSON · SARIF 2.1 · Mermaid
│   ├── forensics/       # run-data ingestion · flake verdicts · triage
│   ├── config/          # mjolnir.config.json + suppressions
│   ├── plugins/         # third-party rule loading (no sandbox)
│   └── commands/        # every subcommand
└── tests/
    ├── fixtures/        # must-fire / must-not-fire per rule
    └── golden/          # frozen score regression locks
```

</details>

- **রুলগুলো বিশুদ্ধ ফাংশন** — `(SourceFileContext) → Finding[]`, I/O নেই,
  গ্লোবাল নেই। নতুন ইকোসিস্টেম = এক অ্যাডাপ্টার + তার রুল।
- **TypeScript/Playwright কম্পাইলার AST ব্যবহার করে** (ts-morph)।
  Python, Java ও C# মাস্কড কমেন্ট/স্ট্রিং-সহ যৌথ regex স্তরে চলে।
- Java ও C#-এর জন্য tree-sitter WASM AST স্তর বিদ্যমান এবং পরবর্তী
  নির্ভুলতার পদক্ষেপ — এখনো সিনক্রোনাস স্ক্যান পাইপলাইনে যুক্ত নয়।

---

## 📚 ডকুমেন্টেশন

| ডকুমেন্ট                                               | এর মধ্যে কী আছে                       |
| ------------------------------------------------------ | ------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | স্কোর নরমালাইজেশন + প্রমাণ-ওয়েটিং    |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | পরিমাপকৃত false-positive হার + পদ্ধতি |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | রুল অবস্থা, দমন, deprecation          |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF আউটপুট + এডিটর/CI সেটআপ         |
| [docs/rules/](docs/rules/)                             | তৈরি করা প্রতি-রুল ক্যাটালগ           |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | ডেভ সেটআপ + অবদানের ধারা              |
| [CHANGELOG.md](CHANGELOG.md)                           | রিলিজ ইতিহাস                          |
| [SECURITY.md](SECURITY.md)                             | দুর্বলতা রিপোর্টিং                    |

---

## 📈 অবস্থা

**v0.5.x · ওপেন বিটা।** JSON schema ও এক্সিট কোড হিমশীতল চুক্তি।
TypeScript ও Python-এর পরিমাপকৃত কভারেজ ব্যাপকতম; Java ও C# নতুন —
[টিয়ার টেবিল](#রুল-টিয়ার-ও-ভাষা-পরিপক্বতা) দিয়ে পড়ুন।

---

## 🤝 অবদান

নতুন রুলই সবচেয়ে সহজ প্রথম অবদান — এক কমান্ডে রুল ও তার must-fire **এবং**
must-not-fire ফিক্সচার স্কাফোল্ড হয় (তৈরি রুলটি ইচ্ছাকৃতভাবে ফিক্সচারে
ব্যর্থ হয় যতক্ষণ না আপনি আসল ডিটেকশন লেখেন — stub শিপ হতে পারে না):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

সম্পূর্ণ ডেভ সেটআপ, standing-gate কমান্ড ও anti-creep / ফিক্সচার-ফায়ারওয়াল
আইন [CONTRIBUTING.md](CONTRIBUTING.md)-এ।

---

<div align="center">

**যে টেস্টে আস্থা রাখতে পারেন না, সেগুলো শিপ করা বন্ধ করুন।**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

নির্মাণ করেছেন [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
