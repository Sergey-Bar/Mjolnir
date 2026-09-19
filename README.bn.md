<div align="center">

<img src="assets/readme/hero.svg" alt="QA Doctor। টেস্ট বলে কী পাস করেছে। QA Doctor বলে কীসে আপনি ভরসা করতে পারেন।" width="100%" />

<br />

QA Doctor এমন টেস্ট খুঁজে বের করে যেগুলো ব্যর্থ হতেই পারে না, আর এমন পাইপলাইন খুঁজে বের করে যেগুলো লাল হতেই পারে না,<br />
তারপর ফলাফল কতটা বিশ্বাসযোগ্য তা স্কোর করে, প্রতিটি পয়েন্টের প্রমাণসহ।

<br />

[![npm](https://img.shields.io/npm/v/qa-doctor-cli.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/qa-doctor-cli)
[![downloads](https://img.shields.io/npm/dm/qa-doctor-cli.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/qa-doctor-cli)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/qa-doctor/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0A1119)](https://github.com/Sergey-Bar/qa-doctor/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Sergey-Bar/qa-doctor?style=flat-square&color=1F6F7C&labelColor=0A1119&label=coverage)](https://codecov.io/gh/Sergey-Bar/qa-doctor)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Sergey-Bar/qa-doctor/badge)](https://scorecard.dev/viewer/?uri=github.com/Sergey-Bar/qa-doctor)
[![license](https://img.shields.io/badge/license-MIT-1F6F7C.svg?style=flat-square&labelColor=0A1119)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-1F6F7C.svg?style=flat-square&labelColor=0A1119)](https://nodejs.org)

```bash
npx qa-doctor-cli@latest
```

[এটি কাজ করতে দেখুন](#এটি-কাজ-করতে-দেখুন) · [দ্রুত শুরু](#দ্রুত-শুরু) · [এটি কী খুঁজে পায়](#qa-doctor-কী-খুঁজে-পায়) · [স্কোর](#বিশ্বাসযোগ্যতা-স্কোর) · [প্রমাণ](#প্রমাণ-মডেল) · [রানটাইম ফরেনসিক্স](#রানটাইম-ফরেনসিক্স) · [CI](#ci-সততা) · [এজেন্ট](#ai-এজেন্ট) · [নিরাপত্তা](#বিশ্বাস-এবং-নিরাপত্তা) · [সীমাবদ্ধতা](#qa-doctor-আপনাকে-যা-বলতে-পারে-না) · [নথি](#নথি)

<details>
<summary>অন্য ভাষায় পড়ুন — ২২টি অনুবাদ</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | বাংলা | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## সবুজ চেক একটি দাবি, প্রমাণ নয়

সবুজ চেকের অর্থ হলো পাইপলাইন ব্যর্থ হয়নি। এর অর্থ এই নয় যে টেস্টগুলো চলেছিল, বা সেগুলো ব্যর্থ হতে পারত। এদের প্রতিটিই সবুজ হয়ে পাস করে:

- কমিট করা `.only` যা ৯০০-এর বদলে ৩টি টেস্ট চালিয়েছে
- যে job-টি গেট হওয়ার কথা ছিল তাতে `continue-on-error: true`
- টেস্ট কমান্ডের পরে `|| true`
- এমন টেস্ট যা কিছুই assert করে না, বা যার বডি খালি
- একটি retry wrapper যা প্রকৃত ব্যর্থতাকে ভাগ্যক্রমে পাস হওয়ায় পরিণত করে
- এমন একটি রিপোর্ট যা workflow আপলোড করে কিন্তু কখনো তৈরি করেনি
- একটি race condition-কে ধরে রাখা একটি স্থির sleep

এদের কোনোটিই পাইপলাইনকে লাল করে না, আর রিভিউতে প্রতিটিই ইচ্ছাকৃত মনে হয়। এই কারণেই এগুলো টিকে থাকে। এখানে QA Doctor একটি বাস্তব উদাহরণ পড়ছে:

<p align="center">
  <img src="assets/readme/scan.svg" alt="ডেমো রিপোজিটরির CI workflow, লাইন ধরে পড়া হয়েছে। QA Doctor প্রতিটি সন্ধান যে লাইনে রিপোর্ট করেছে সেখানেই চিহ্নিত করে, সাথে তার নিয়ম, কী ভুল, তার প্রমাণ স্তর এবং তার পরিমাপ করা false-positive হার।" width="800" />
</p>

<sub>এই workflow-এর জন্য ডেমো স্ক্যান যত সন্ধান রিপোর্ট করেছে, সেগুলো যে লাইনে রিপোর্ট করা হয়েছে সেখানেই। `npm run docs:readme-brand` দ্বারা [`demo-report.json`](assets/readme/demo-report.json) থেকে তৈরি এবং CI-তে বিচ্যুতির বিরুদ্ধে লক করা।</sub>

**কঠোর মোড।** সবচেয়ে আক্রমণাত্মক সনাক্তকরণ — `.only`, `continue-on-error`, ফাঁকা পরীক্ষা, পুনরায় চেষ্টার অপব্যবহার — কোয়ারেন্টাইন স্তরে থাকে। এগুলো শুধু `--strict`-এ চলে এবং `info` তীব্রতায় সীমিত: এগুলো চিহ্নিত করে, কিন্তু কখনো গেট করে না। ডিফল্ট স্ক্যান (`npx qa-doctor-cli@latest` ছাড়া `--strict`) শুধু কোর এবং বর্ধিত নিয়ম কভার করে। পরামর্শমূলক স্তরও চাইলে `--strict` যোগ করুন।

QA Doctor স্যুট, CI workflow, এবং আপনার কাছে থাকলে একটি প্রকৃত রানের রিপোর্ট পড়ে। এটি আপনার টেস্ট চালায় না, আপনার dependency ইনস্টল করে না, বা এটি যে কোড স্ক্যান করে তা চালায় না। আর যখন এর কাছে প্রমাণ নেই, তখন এটি আস্থা বানিয়ে না নিয়ে সেটাই বলে দেয়:

| পরিস্থিতি                                             | QA Doctor যা রিপোর্ট করে                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| কোনো টেস্ট ঘোষণা পাওয়া যায়নি                        | স্কোর `null`, **UNKNOWN** হিসেবে দেখানো হয়। কখনো বানানো ১০০ নয়।  |
| কোনো baseline বা তুলনাযোগ্য রিভিশন নেই                | **UNKNOWN**, কারণসহ। কখনো ধরে নেওয়া ০ নয়।                        |
| স্ক্যান মাঝপথে থেমে গেছে (সময় বাজেট, অপঠনযোগ্য ফাইল) | **PARTIAL**, এক্সিট `2`। কখনো পরিষ্কার হিসেবে উপস্থাপন করা হয় না। |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="QA Doctor কীভাবে কাজ করে। এটি টেস্ট স্যুট এবং CI পাইপলাইন স্ট্যাটিকভাবে পড়ে, এবং যখন থাকে তখন একটি প্রকৃত রানের রিপোর্টও পড়ে। এটি প্রতিটি সন্ধানকে তার প্রমাণ স্তর এবং আস্থা স্তর অনুযায়ী ওজন দেয়, যেখানে শুধু একটি প্রকৃত রান L3 থেকে L5 পর্যন্ত পৌঁছাতে পারে, এবং সন্ধান, একটি test health স্কোর, এবং হিমায়িত এক্সিট কোডের উপর একটি CI গেট তৈরি করে। এজেন্ট লুপে, AI ফিক্স লেখে এবং QA Doctor তা প্রমাণ করতে পুনরায় স্ক্যান করে।" width="880" />
</p>

<sub>এই পৃষ্ঠার জন্য তৈরি এবং ১:১ অনুপাতে দেখানো হয়েছে। `npm run docs:readme-brand` দ্বারা তৈরি এবং CI-তে বিচ্যুতির বিরুদ্ধে লক করা; স্কোর, সংখ্যা এবং নিয়ম ID [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) এবং নিয়ম রেজিস্ট্রি থেকে আসে, কখনো হাতে টাইপ করা হয় না। একই ছবি পোস্টার হিসেবে: [`architecture.svg`](assets/readme/architecture.svg)।</sub>

<br />

## এটি কাজ করতে দেখুন

[`examples/demo-repo`](examples/demo-repo)-এর একটি প্রকৃত স্ক্যান, CI workflow সহ একটি ছোট Playwright স্যুট। এখানেই এর পয়েন্ট গেছে:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="QA Doctor-এর deduction breakdown: TEST HEALTH 80/100 HEALTHY, বিভাগ অনুযায়ী স্কোর, severity অনুযায়ী deduction box, এবং একটি FIX THIS FIRST তালিকা" width="520" />
</p>

<sub>`npm run docs:hero` দ্বারা একটি প্রকৃত স্ক্যান থেকে তৈরি এবং CI-তে বিচ্যুতির বিরুদ্ধে লক করা। একই স্ক্যানের সম্পূর্ণ `--verbose` রিপোর্ট হলো [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`)।</sub>

<details>
<summary><strong>এটি দেখুন</strong> — একটি স্ক্যান, এটি যে ফিক্স প্রিন্ট করে, এবং পুনরায় স্ক্যান যা তা প্রমাণ করে</summary>

<br />

<p align="center">
  <a href="assets/video/qa-doctor-demo.mp4">
    <img src="assets/video/qa-doctor-demo-poster.png" alt="ডেমো রেকর্ডিংয়ের একটি ফ্রেম: একটি টার্মিনাল উইন্ডোতে ডেমো রিপোজিটরি স্ক্যান করছে npx qa-doctor-cli@latest" width="900" />
  </a>
</p>

<sub>`npm run docs:video` দ্বারা একটি প্রকৃত স্ক্যান থেকে ফ্রেম বাই ফ্রেম রেন্ডার করা হয়েছে; কখনো স্ক্রিন-রেকর্ড করা হয়নি। [`qa-doctor-demo.mp4`](assets/video/qa-doctor-demo.mp4) খুলতে ফ্রেমটি নির্বাচন করুন।</sub>

</details>

### একটি সন্ধান, কাছ থেকে

প্রতিটি সন্ধান চারটি প্রশ্নের উত্তর দেয়: এটি কোথায়, QA Doctor কতটা নিশ্চিত, নিয়মটি কত প্রায়ই ভুল হয়, এবং কীভাবে ঠিক করতে হয়।

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="ডেমো স্ক্যানের প্রথম সন্ধান, ঠিক যেভাবে টার্মিনাল এটি প্রিন্ট করে, এর চারটি অংশ চিহ্নিত করা: কোথায়, কতটা নিশ্চিত, নিয়মটি কত প্রায়ই ভুল হয়, এবং ফিক্স।" width="100%" />
</p>

`qa-doctor explain QA-CI-001` একটি নিয়মের সম্পূর্ণ আস্থার রেকর্ড প্রিন্ট করে, যার মধ্যে রয়েছে তার পরিমাপ করা false-positive হার এবং সেই হার যে tier অর্জন করেছে:

```text
  ▍ QA-CI-001 — continue-on-error masks a failing verification gate

Severity:    error
Confidence:  high
Tier:        quarantine
Evidence:    E2
QA impact:   False-green risk (FALSE-GREEN)
Measured FP: 11% (19 hand-classified corpus verdicts)
FP risk:     low (author estimate)
Languages:   yaml
Frameworks:  github-actions, azure-pipelines

WHAT WAS FOUND (real detector output, not a mockup)
  Job `security-scan` runs a verification gate under `continue-on-error: true`.

WHY IT MATTERS
  This job can fail every day and CI will still show green. The checkmark on
  this workflow cannot be trusted.

HOW TO FIX
  Remove continue-on-error, or scope it to individual non-blocking steps only.

  Example from this rule's own must-fire fixture: QA-CI-001/must-fire/masked.yml

WHAT WOULD CHANGE THE VERDICT
  - a run report next to the scan target (qa-doctor.report.json or test-results/)
  corroborating this file lifts its findings to L3–L5
  - a documented suppression (qa-doctor.config.json) lowers the finding count
  without claiming correctness
  - quarantine findings run only under --strict and are advisory (E0) — they can
  never gate CI

NEXT ACTION
  Fix the first occurrence, then re-run: `qa-doctor --scope changed`. Every
  occurrence of this rule is listed in the scan output.

HOW TO VERIFY THE FIX
  Re-run `qa-doctor` on the changed file(s) — this finding should no longer
  appear. `qa-doctor --scope changed` scopes the check to just what you touched.

Docs: qa-doctor rules --md   (full catalog, this rule included)
```

এটিই মূল্যের একক: একটি জায়গা যেখানে CI এমন একটি পাস রিপোর্ট করে যা এটি অর্জন করেনি।

<br />

## দ্রুত শুরু

```bash
npx qa-doctor-cli@latest
```

এটি বর্তমান ডিরেক্টরি স্ক্যান করে এবং Trust Report প্রিন্ট করে: এটি কী পেয়েছে, আপনি কতটা বিশ্বাস করতে পারেন, কেন, এবং পরবর্তীতে কী করতে হবে। গেট বা তার উপরে কিছু না পাওয়া গেলে এটি `0` দিয়ে exit করে।

CI-তে, শুধু ব্রাঞ্চ যা এনেছে তা স্ক্যান করুন, যাতে একটি পুরনো স্যুট আপনার প্রথম pull request-কে ডুবিয়ে না দেয়:

```bash
npx qa-doctor-cli@latest --scope changed
```

`qa-doctor ci install` এটিকে একটি GitHub Actions workflow হিসেবে লেখে, `v1` মেজর ট্যাগে পিন করা [action](https://github.com/Sergey-Bar/qa-doctor#readme) ব্যবহার করে (অথবা `--no-action` সহ সাধারণ `npx`)। এটি ততক্ষণ পরামর্শমূলক থাকে যতক্ষণ না আপনি সিদ্ধান্ত নেন এটি ব্লক করা উচিত।

| কমান্ড                                | এটি কী করে                                             |
| ------------------------------------- | ------------------------------------------------------ |
| `qa-doctor`                           | Trust Report: রায়, আস্থা, পরবর্তী পদক্ষেপ             |
| `qa-doctor --scope changed`           | শুধু আপনার ব্রাঞ্চ যা এনেছে (CI ফর্ম)                  |
| `qa-doctor ci install`                | পরামর্শমূলক PR workflow তৈরি করে (action-ভিত্তিক)      |
| `qa-doctor explain QA-CI-001`         | কী, কেন, এবং ফিক্স, প্লাস পরিমাপ করা FP হার            |
| `qa-doctor why src/a.spec.ts:42`      | ঠিক এই লাইনটি কেন ফ্ল্যাগ করা হয়েছে। কখনো গেট করে না। |
| `qa-doctor forensics ./test-results/` | একটি প্রকৃত রান থেকে রানটাইম প্রমাণ                    |
| `qa-doctor trust-report`              | স্বয়ংসম্পূর্ণ Trust Artifact (md + json)              |
| `qa-doctor handoff`                   | একটি কোডিং এজেন্টের জন্য প্রতিকার পরিকল্পনা            |
| `qa-doctor --json` / `--format sarif` | মেশিন-পাঠযোগ্য আউটপুট, GitHub Code Scanning            |
| `qa-doctor --format codequality`      | GitLab Code Quality রিপোর্ট (MR widget artifact)       |
| `qa-doctor --strict`                  | quarantine-tier নিয়মও চালায় (উচ্চতর FP ঝুঁকি)        |

<details>
<summary><strong>অন্য সব কমান্ড</strong> — flake triage, রিপোর্টিং, গভর্নেন্স</summary>

<br />

| কমান্ড                                | এটি কী করে                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `qa-doctor --classic`                 | Trust Report-পূর্ব স্কোর ব্যানার রেন্ডার                                         |
| `qa-doctor explain verdict`           | সংরক্ষিত স্ক্যানের রায় কেন এমন                                                  |
| `qa-doctor triage ./test-results/`    | গাইডেড triage। প্রতিটি সারি একটি পরবর্তী পদক্ষেপে শেষ হয়।                       |
| `qa-doctor pw-report ./test-results/` | Playwright রান সামারি: retry, flake, সবচেয়ে ধীর                                 |
| `qa-doctor doctor:playwright`         | শুধু Playwright-এর জন্য গভীর স্ক্যান প্লাস Selector Health Score                 |
| `qa-doctor fix --dry-run` / `fix`     | নিরাপদ auto-fix, প্রতিটি পুনরায় স্ক্যান করে প্রমাণ করা হয়েছে যে এটি ঠিক হয়েছে |
| `qa-doctor baseline` / `diff`         | সন্ধানের স্ন্যাপশট নেয়, তারপর শুধু নতুন বা খারাপ রিপোর্ট করে                    |
| `qa-doctor impact --since <ref>`      | একটি কমিট কী এনেছিল এবং সমাধান করেছিল                                            |
| `qa-doctor summary`                   | একটি রিপোর্ট থেকে CI annotation এবং step summary                                 |
| `qa-doctor pr-comment`                | একটি সীমিত-পরিসরের PR মন্তব্য, Markdown হিসেবে                                   |
| `qa-doctor debt`                      | একটি cost model সহ test-debt রেজিস্টার                                           |
| `qa-doctor handover`                  | একজন নতুন QA ইঞ্জিনিয়ারের জন্য স্যুটের onboarding map                           |
| `qa-doctor init`                      | framework detect করে, একটি সেটআপ checklist প্রিন্ট করে                           |
| `qa-doctor suppressions`              | গভর্নেন্সের জন্য দমন করা সন্ধানের তালিকা করে                                     |
| `qa-doctor rules --unmeasured`        | যে নিয়মগুলো অনুমানের উপর চলে, পরিমাপের উপর নয়                                  |
| `qa-doctor rules --md`                | সম্পূর্ণ নিয়ম ক্যাটালগ (JSON বা Markdown)                                       |
| `qa-doctor doctor`                    | QA Doctor-এর নিজের নিয়ম বেসের self-audit                                        |
| `qa-doctor create-rule <ID>`          | একটি নতুন নিয়ম এবং তার fixture-এর জন্য কাঠামো তৈরি করে                          |
| `qa-doctor stats`                     | এখন পর্যন্ত দেখা সব ফিক্সের স্থানীয় সর্বকালীন কাউন্টার                          |
| `qa-doctor badge`                     | shields.io endpoint JSON এবং snippet                                             |
| `qa-doctor --cache`                   | একটি স্থানীয় verdict cache-এর মাধ্যমে incremental re-scan                       |
| `qa-doctor --format mermaid`          | একটি PR মন্তব্যের জন্য test-architecture diagram                                 |

`qa-doctor help <command>` তাদের যেকোনো একটির জন্য ব্যবহার, উদাহরণ, এবং পরবর্তী পদক্ষেপ প্রিন্ট করে।

</details>

Windows, macOS, বা Linux-এ **Node.js ≥ 22.18** প্রয়োজন। গ্লোবাল ইনস্টল পছন্দ করেন? `npm i -g qa-doctor-cli`। এই সর্বনিম্ন সীমা বিল্ড টুলচেইন থেকে আসে (tsdown এটিকে লক্ষ্য করে এবং রিলিজ পাইপলাইন এটির বিরুদ্ধে smoke-test করে); রানটাইম dependency-গুলোর এর চেয়ে বেশি কিছু প্রয়োজন হয় না।

<br />

## QA Doctor কী খুঁজে পায়

<p align="center">
  <img src="assets/readme/stack.svg" alt="আপনার স্ট্যাকের সাথে কাজ করে: এর নিয়মগুলো যে ভাষা, টেস্ট ফ্রেমওয়ার্ক এবং CI সিস্টেম কভার করে, নিয়ম রেজিস্ট্রি থেকে।" width="100%" />
</p>

চারটি পরিবারে **৭৯টি নিয়ম** — test hygiene, test quality, Playwright, এবং CI integrity — TypeScript এবং JavaScript, Python, Java, C#, এবং GitHub Actions YAML জুড়ে। এগুলো Playwright-কে এর চারটি binding-এই কভার করে, সাথে pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest, এবং Mocha, Cypress এবং Selenium-এর জন্য starter কভারেজসহ। তাদের মধ্যে নয়টি, আকৃতি দেখানোর জন্য:

| ID           | নিয়ম                                                             | Severity | Tier       |
| ------------ | ----------------------------------------------------------------- | -------- | ---------- |
| QA-CI-001    | `continue-on-error` একটি ব্যর্থ verification gate-কে মুখোশ পরায়  | error    | quarantine |
| QA-CI-009    | টেস্ট exit code propagate হয় না (pipefail ছাড়া `\|`, `;` chain) | error    | extended   |
| QA-TEST-001  | ফোকাসড টেস্ট কমিট করা হয়েছে (`.only`, `fit`)                     | error    | quarantine |
| QA-TEST-003  | assertion ছাড়া টেস্ট                                             | error    | quarantine |
| QA-TQUAL-009 | await ছাড়া promise assertion                                     | error    | quarantine |
| QA-PW-002    | await ছাড়া locator assertion                                     | error    | core       |
| QA-PW-004    | Brittle CSS/XPath selector                                        | warning  | quarantine |
| QA-PY-002    | স্কিপ করা টেস্ট (`skip`, non-strict `xfail`)                      | warning  | core       |
| QA-CS-103    | assertion ছাড়া টেস্ট মেথড                                        | error    | core       |

সম্পূর্ণ ক্যাটালগ রেজিস্ট্রি থেকে তৈরি হয়, কখনো হাতে রক্ষণাবেক্ষণ করা হয় না: `qa-doctor rules --md`, [`docs/rules/`](docs/rules/), অথবা [what-it-checks গাইড](https://sergey-bar.github.io/qa-doctor/guide/what-it-checks)।

<details>
<summary><strong>এই README-এ উল্লেখিত প্রতিটি নিয়ম</strong>, একটি টেবিলে</summary>

<br />

> `quarantine` নিয়মগুলো শুধু `--strict`-এর অধীনে চলে এবং কখনো গেট করে না (এগুলো info-তে সীমাবদ্ধ)। দেখানো severity হলো লেখক-নির্ধারিত severity।

| ID           | পরিবার     | নিয়ম                                                                | Severity | Tier       |
| ------------ | ---------- | -------------------------------------------------------------------- | -------- | ---------- |
| QA-TEST-001  | Hygiene    | ফোকাসড টেস্ট কমিট করা হয়েছে (`.only`, `fit`)                        | error    | quarantine |
| QA-TEST-002  | Hygiene    | স্কিপ করা টেস্ট। একটি ট্র্যাক করা কারণ ছাড়া `error`-এ escalate হয়। | warning  | quarantine |
| QA-TEST-003  | Hygiene    | assertion ছাড়া টেস্ট                                                | error    | quarantine |
| QA-TEST-004  | Hygiene    | স্থির sleep (`waitForTimeout`, `sleep()`, `delay()`)                 | warning  | extended   |
| QA-TEST-006  | Hygiene    | অস্থিরতা লুকানো retry-এর অপব্যবহার                                   | warning  | quarantine |
| QA-TEST-010  | Hygiene    | খালি টেস্ট বডি                                                       | error    | quarantine |
| QA-TQUAL-002 | Quality    | Tautological assertion                                               | error    | quarantine |
| QA-TQUAL-009 | Quality    | await ছাড়া promise assertion                                        | error    | quarantine |
| QA-TQUAL-011 | Quality    | মন্তব্য করে রাখা টেস্ট                                               | warning  | extended   |
| QA-PW-002    | Playwright | await ছাড়া locator assertion                                        | error    | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` কমিট করা হয়েছে                       | error    | core       |
| QA-PW-004    | Playwright | Brittle CSS/XPath selector                                           | warning  | quarantine |
| QA-PW-123    | Playwright | Hardcoded environment URL                                            | warning  | quarantine |
| QA-PW-140    | Playwright | `maxDiffPixelRatio` ছাড়া স্ক্রিনশট                                  | warning  | core       |
| QA-CI-001    | CI         | `continue-on-error` একটি ব্যর্থ gate-কে মুখোশ পরায়                  | error    | quarantine |
| QA-CI-002    | CI         | `\|\| true` exit code গিলে ফেলে                                      | error    | extended   |
| QA-CI-005    | CI         | রিপোর্ট ব্যবহৃত হয় কিন্তু কখনো তৈরি হয়নি                           | error    | quarantine |
| QA-CI-007    | CI         | টেস্টের চারপাশে retry wrapper                                        | warning  | extended   |
| QA-CI-008    | CI         | সবসময়-সফল step ব্যর্থতা মুখোশ পরায়                                 | error    | quarantine |
| QA-CI-009    | CI         | Exit code propagate হয় না (pipefail ছাড়া `\|`, `;` chain)          | error    | extended   |
| QA-CI-010    | CI         | যেখানে ব্লক করা উচিত সেখানে টেস্ট স্কিপ করা হয়েছে                   | error    | quarantine |
| QA-PY-002    | Python     | স্কিপ করা টেস্ট (`skip`, non-strict `xfail`)                         | warning  | core       |
| QA-PY-003    | Python     | assertion ছাড়া টেস্ট ফাংশন                                          | error    | quarantine |
| QA-PY-005    | Python     | টেস্টে `time.sleep()`                                                | warning  | extended   |
| QA-PY-012    | Python     | Tautological assertion                                               | error    | quarantine |
| QA-JV-101    | Java       | নিষ্ক্রিয় টেস্ট (`@Disabled`)                                       | warning  | core       |
| QA-JV-102    | Java       | স্থির sleep (`Thread.sleep()`)                                       | warning  | extended   |
| QA-JV-103    | Java       | assertion ছাড়া টেস্ট মেথড                                           | error    | extended   |
| QA-JV-105    | Java       | Playwright `waitForTimeout()` স্থির sleep                            | warning  | core       |
| QA-JV-106    | Java       | role locator-এর বদলে brittle selector                                | warning  | quarantine |
| QA-CS-101    | C#         | স্কিপ করা টেস্ট (`[Ignore]`, `[Fact(Skip=)]`)                        | warning  | core       |
| QA-CS-102    | C#         | স্থির sleep (`Thread.Sleep` / `Task.Delay`)                          | warning  | core       |
| QA-CS-103    | C#         | assertion ছাড়া টেস্ট মেথড                                           | error    | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` স্থির sleep                                  | warning  | extended   |
| QA-CS-106    | C#         | role locator-এর বদলে brittle selector                                | warning  | quarantine |

Python-এ QA-PY-001…012 (pytest hygiene) এবং QA-PY-101…108 (Python-এর জন্য Playwright)ও রয়েছে। Cypress এবং Selenium-এর প্রতিটিতে তিনটি নিয়মের starter সেট রয়েছে।

</details>

প্রতিটি নিয়ম একটি must-fire **এবং** একটি must-not-fire fixture সহ শিপ হয়, এবং একটি নিয়ম যা নিজের নেগেটিভ fixture-এ fire করে তা শিপ হতে পারে না। এটিই false-positive firewall; `qa-doctor doctor` এই রিপোজিটরির নিজের CI-তে এটি প্রয়োগ করে।

### Selector Health Score

`qa-doctor doctor:playwright` প্রতিটি locator-কে গ্রেড করে সে কীভাবে একটি এলিমেন্ট খুঁজে পায় তার ভিত্তিতে: একজন ব্যবহারকারী যেভাবে খুঁজবে (role, label, text), একটি explicit contract-এর মাধ্যমে (`data-testid`), অথবা একটি structural accident-এর মাধ্যমে (CSS chain, XPath)। প্রতিটি ফাইল ০ থেকে ১০০-এর একটি স্কোর পায়:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

এটি **resilience পরিমাপ করে, correctness নয়**। `.btn.btn-primary > div:nth-child(2)` আজ পাস করে এবং কেউ markup স্পর্শ না করা পর্যন্ত পাস হতে থাকে। একটি কম স্কোর কখনো দাবি করে না যে টেস্টটি ভাঙা, শুধু বলে যে এটি এমন markup-এর উপর নির্ভরশীল যা রাখার প্রতিশ্রুতি কেউ দেয়নি।

<br />

## বিশ্বাসযোগ্যতা স্কোর

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="০ থেকে ১০০ পর্যন্ত test health স্কেল, প্রতিটি স্কোর অতিক্রম করা একটি মার্কার সহ: ৫০-এর নিচে CRITICAL, ৫০ থেকে ৭৯ NEEDS ATTENTION, ৮০ থেকে ৯৯ HEALTHY, ১০০-এ EXCELLENT" width="720" />
</p>

<sub>০ থেকে ১০০ পর্যন্ত প্রতিটি স্কোর, প্রকৃত `deriveScoreState` দ্বারা স্থাপিত। `npm run docs:gauge` দ্বারা তৈরি এবং CI-তে বিচ্যুতির বিরুদ্ধে লক করা।</sub>

| স্কোর     | রায়                                        |
| --------- | ------------------------------------------- |
| `0 – 49`  | **CRITICAL**                                |
| `50 – 79` | **NEEDS ATTENTION**                         |
| `80 – 99` | **HEALTHY**                                 |
| `100`     | **EXCELLENT**                               |
| `null`    | **UNKNOWN**: কোনো টেস্ট ঘোষণা পাওয়া যায়নি |

**এটি কীভাবে গণনা করা হয়।** Severity একটি base deduction নির্ধারণ করে (`error −8`, `warning −3`, `info −1`) এবং evidence level এতে ছাড় দেয়: E2 পুরো পরিশোধ করে, E1 অর্ধেক (নিচের দিকে রাউন্ড করা), E0 কিছুই না। মোট suite exposure দ্বারা normalize করা হয়, অর্থাৎ প্রতি ফাইলের বদলে প্রতি test declaration-এ deduction। টার্মিনাল একই discounted সংখ্যা প্রিন্ট করে যা স্কোর ব্যবহার করেছে; কোনো লুকানো দ্বিতীয় মডেল নেই। বিস্তারিত: [docs/SCORING.md](docs/SCORING.md) এবং [scoring গাইড](https://sergey-bar.github.io/qa-doctor/guide/scoring)।

**১০০-এর অর্থ কী নয়।** এর অর্থ এই নয় যে সফটওয়্যারটি সঠিক, স্যুটটি পর্যাপ্ত, বা প্রোডাক্টটি ত্রুটিমুক্ত। এর অর্থ একটি জিনিস: **QA Doctor-এর মূল্যায়িত নিয়মগুলোর কোনোটিই এই স্ক্যান এবং এই evidence model-এর অধীনে কোনো deduction তৈরি করেনি।**

<br />

## প্রমাণ মডেল

প্রতিটি সন্ধান দুটি লেবেল বহন করে: QA Doctor কতটা নিশ্চিত, এবং সন্ধানটি কতদূর পরীক্ষা করা হয়েছে। এটিই প্যাটার্ন রিপোর্ট করা একটি টুল এবং একটি রিলিজে যে টুলের উপর গেট করা যায় তার মধ্যে পার্থক্য।

**কতটা নিশ্চিত — evidence level।**

| Level  | Name                | অর্থ                                                     | Deduction |
| ------ | ------------------- | -------------------------------------------------------- | --------- |
| **E2** | Deterministic proof | ত্রুটিটি লেখা কোডে ঠিক সেভাবেই বিদ্যমান                  | Full      |
| **E1** | Pattern evidence    | ত্রুটির সাথে দৃঢ়ভাবে সম্পর্কিত একটি প্যাটার্ন মিলে গেছে | Half      |
| **E0** | Observation         | জানার মতো। কিছু ভুল আছে এমন দাবি নয়।                    | Zero      |

একটি detection-এ আস্থা প্রমাণের শক্তি নয়। একটি নিয়ম নিশ্চিত হতে পারে যে এটি যা খুঁজছিল তার সাথে মিলেছে এবং তবুও একটি heuristic দেখছে। E1 সন্ধান পড়া এবং বিচার করার জন্য, কখনো অন্ধভাবে প্রয়োগ করার জন্য নয়, এবং এই সীমারেখা টার্মিনালে, JSON-এ, এবং এজেন্ট handoff-এ সন্ধানের উপর স্ট্যাম্প করা থাকে।

**কতদূর পরীক্ষা করা হয়েছে — trust level।** বেশিরভাগ সন্ধান আপনার কোড পড়া থেকে আসে। QA Doctor-কে একটি প্রকৃত টেস্ট রানের রিপোর্ট দিন এবং এটি নিশ্চিত করতে পারে যে কোডটি আসলেই চলেছিল।

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="L0 থেকে L5 পর্যন্ত trust ladder। L0 থেকে L2 কোড পড়া থেকে আসে; L3 থেকে L5-এর জন্য একটি প্রকৃত রান রিপোর্ট প্রয়োজন, যা ladder-এ একটি বিরতি দ্বারা চিহ্নিত।" width="100%" />
</p>

| Level  | সহজ ভাষায়           | এর জন্য যা প্রয়োজন                                          |
| ------ | -------------------- | ------------------------------------------------------------ |
| **L0** | Noted                | কোড পড়া                                                     |
| **L1** | সমস্যার মতো দেখাচ্ছে | কোড পড়া: একটি প্যাটার্ন মিলেছে                              |
| **L2** | কোডে প্রমাণিত        | কোড পড়া: ত্রুটিটি structural                                |
| **L3** | ফাইলটি চলেছিল        | একটি রান রিপোর্ট দেখায় যে সন্ধানের ফাইলটি এক্সিকিউট হয়েছে  |
| **L4** | টেস্টটি চলেছিল       | একটি রান রিপোর্ট দেখায় যে সন্ধানের টেস্টটি এক্সিকিউট হয়েছে |
| **L5** | রানটি একমত           | রানের নিজস্ব ফলাফল ত্রুটির ক্লাস নিশ্চিত করে                 |

একটি স্ট্যাটিক স্ক্যান L2-তে থেমে যায়। শুধুমাত্র একটি প্রকৃত রান রিপোর্ট (Playwright JSON, Jest বা Vitest JSON, JUnit XML) একটি সন্ধানকে L3 বা তার উপরে তুলতে পারে, তাই এমন একটি সন্ধান যা কখনো চলতে দেখা যায়নি তা কখনো দাবি করতে পারে না যে এটি চলেছিল। সংজ্ঞা: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)।

### এর কতটা পরিমাপ করা হয়েছে

**৭৯টির মধ্যে ৭৪টি নিয়মের একটি false-positive হার রয়েছে যা প্রকৃত OSS কোডের বিরুদ্ধে পরিমাপ করা হয়েছে** (প্রতিটির জন্য অন্তত ১০টি হাতে-শ্রেণীবদ্ধ সন্ধান; দেখুন [docs/FP-AUDIT.md](docs/FP-AUDIT.md))। অন্য ৫টি লেখকের অনুমানের উপর শিপ হয় এবং `qa-doctor explain`-এ, নিয়ম ধরে ধরে, তা বলে দেয়। `qa-doctor rules --unmeasured` তাদের তালিকাভুক্ত করে, এবং প্রতিটি স্ক্যানের footer রিপোর্ট করে যে আসলে _fire_ হওয়া নিয়মগুলোর কতগুলো পরিমাপ করা হয়েছে।

হারগুলো খারাপ হলেও পাবলিক থাকে। QA-TEST-001 (একটি কমিট করা `.only`) প্রকৃত রিপোজিটরিতে খারাপ অডিট করে এবং তার জন্য quarantine-এ বসে থাকে। QA-PW-141 সহ প্রতিটি নিয়মের লাইভ সংখ্যা audit-এ রয়েছে।

### Trust tier

Tier মতামত নয়, পরিমাপ করা false-positive হার অনুসরণ করে:

| Tier           | Measured FP                 | Behavior                                           |
| -------------- | --------------------------- | -------------------------------------------------- |
| **core**       | ≤ 10%                       | ডিফল্ট রিপোর্ট, গেট করে                            |
| **extended**   | ≤ 30%                       | ডিফল্ট রিপোর্ট, কম আস্থা                           |
| **quarantine** | > 30% অথবা স্পষ্টভাবে ঘোষিত | শুধু `--strict`, info-তে সীমাবদ্ধ, কখনো গেট করে না |
| _unmeasured_   | n < 10                      | পরিমাপ না হওয়া পর্যন্ত core-এ promote করা যায় না |

FP band শুধুমাত্র একটি tier-কে demote করতে পারে — স্পষ্টভাবে ঘোষিত হলে `quarantine` থেকে কখনো কোনো নিয়ম promote করে না। স্পষ্টভাবে quarantine করা নিয়ম পরিমাপ করা FP হার নির্বিশেষে quarantine-এই থাকে।

Promotion, demotion, এবং প্রতি-ভাষা maturity: [rule lifecycle](https://sergey-bar.github.io/qa-doctor/reference/rule-lifecycle)।

### কেন এটি একটি linter নয়

Linter আপনাকে বলে কোড নিয়ম মেনে চলে কিনা। QA Doctor আপনাকে বলে আপনার verification বিশ্বাস করা যায় কিনা।

|                                                           | Linter (ESLint, SonarQube) | Coverage টুল | AI code review |  **QA Doctor**   |
| --------------------------------------------------------- | :------------------------: | :----------: | :------------: | :--------------: |
| প্রোডাক্ট কোড নয়, **verification system**-কে স্কোর করে   |             না             |      না      |       না       |      হ্যাঁ       |
| CI workflow integrity (`continue-on-error`, `\|\| true`)  |             না             |      না      |   শুধু diff    |      হ্যাঁ       |
| Playwright locator resilience গ্রেড করে (Selector Health) |             না             |      না      |       না       |      হ্যাঁ       |
| `TRUE-FLAKE` রায়ের জন্য প্রকৃত রান ডেটা পড়ে             |             না             |      না      |       না       |      হ্যাঁ       |
| প্রতি নিয়মে পরিমাপ করা false-positive হার প্রকাশ করে     |             না             |      না      |       না       |      হ্যাঁ       |
| assertion ছাড়া টেস্ট ফ্ল্যাগ করে                         |          হ্যাঁ\*           |      না      |   কখনো কখনো    |      হ্যাঁ       |
| স্থির sleep ধরে (`waitForTimeout`, `time.sleep`)          |          হ্যাঁ\*           |      না      |   কখনো কখনো    |      হ্যাঁ       |
| Deterministic (একই input, একই output)                     |           হ্যাঁ            |    হ্যাঁ     |       না       |      হ্যাঁ       |
| প্রতি স্ক্যানে খরচ                                        |            ফ্রি            |     ফ্রি     |     token      | **zero** (local) |

<sub>\*`eslint-plugin-jest` এবং `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) এবং SonarQube-এর নিজস্ব assertion নিয়ম দ্বারা কভার করা। কলামগুলো test-suite verification-এর জন্য ডিফল্ট আচরণ বর্ণনা করে; plugin, paid tier, এবং custom নিয়ম কিছু উত্তর পরিবর্তন করে। এটি একটি positioning summary, benchmark নয়।</sub>

AI রিভিউও ব্যবহার করুন। এটি nuance, intent, এবং design flaw ধরে যা কোনো প্যাটার্ন খুঁজে পায় না। QA Doctor তা ধরে যা AI রিভিউ উপেক্ষা করে কারণ এটি ইচ্ছাকৃত মনে হয়: একটি কমিট করা `.only`, একটি গিলে ফেলা exit code, একটি টেস্ট job-এ `continue-on-error`। এগুলোর জন্য reasoning নয়, scanning প্রয়োজন।

<br />

## রানটাইম ফরেনসিক্স

Static analysis এমন কোড নিয়ে reasoning করে যা কখনো চলেনি। Forensics পড়ে আসলে কী ঘটেছিল: যেকোনো runner থেকে Playwright JSON, Jest JSON, Vitest JSON, এবং JUnit XML।

```bash
qa-doctor forensics ./test-results/
```

```text
  ▍ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

`TRUE-FLAKE`-এর অর্থ এই নয় যে টেস্টটি retry হয়েছে। এর অর্থ টেস্টটি **অন্তত একবার ব্যর্থ হয়েছে এবং তারপর সবুজে শেষ হয়েছে**: একটি ভাগ্যবান পাস, শেষ চেকমার্ক যাই বলুক না কেন ফ্ল্যাগ করা হয়। `qa-doctor triage` সেই ইতিহাসকে একটি quarantine প্রস্তাবে পরিণত করে, এবং `qa-doctor pw-report` একটি রান সারসংক্ষেপ করে। একই রান রিপোর্টগুলোই সন্ধানকে trust level L3 এবং তার উপরে তোলে।

<br />

## CI সততা

একটি টেস্ট পাস করতে পারে যখন এর চারপাশের পাইপলাইন ব্যর্থ হতে পারে না। QA Doctor workflow-ও পড়ে: `continue-on-error`, `|| true`, exit code যা কখনো propagate হয় না, সবসময়-সফল step, রিপোর্ট যা consume হয় কিন্তু কখনো তৈরি হয়নি, এবং যে ইভেন্টগুলোতে ব্লক করা উচিত সেখানে স্কিপ করা গেট। প্রতিটি সন্ধান job, step, এবং লাইনের নাম বলে, এবং নিজস্ব evidence level বহন করে।

PR workflow তৈরি করুন, ডিফল্টরূপে পরামর্শমূলক:

```bash
qa-doctor ci install
```

অথবা Marketplace action যোগ করুন একটি workflow-তে যা আপনার ইতিমধ্যে আছে:

```yaml
- uses: Sergey-Bar/qa-doctor@v1
  with:
    scope: changed
    fail-on: error
```

মেজর লাইন অনুসরণ করতে `@v1` পিন করুন, অথবা একটি reproducible gate-এর জন্য একটি সঠিক ট্যাগ (`@v0.5.32`)। [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) Marketplace, Smithery, এবং MCP রেজিস্ট্রি কভার করে।

GitHub Code Scanning-এ সন্ধান রাখতে, SARIF আপলোড করুন (workflow বা job scope-এ `security-events: write` প্রয়োজন):

```yaml
- run: npx qa-doctor-cli@latest --format sarif > qa-doctor.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: qa-doctor.sarif
```

GitLab-এ, `--format codequality` সেই Code Quality রিপোর্ট লেখে যা MR widget এবং diff annotation পড়ে ([docs/GITLAB-CI.md](docs/GITLAB-CI.md))। Editor এবং pipeline সেটআপ: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)।

### Changed-scope attribution

```bash
npx qa-doctor-cli@latest --scope changed
```

সন্ধানগুলো আপনার ব্রাঞ্চ যোগ করা লাইনগুলোতে attribute করা হয়, **merge-base**-এর বিরুদ্ধে পরিমাপ করা। Scope-টি একই ফাইল সেট যা একটি full scan আবিষ্কার করে (TS/JS spec এবং adapter config, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), সাথে uncommitted এবং untracked পরিবর্তন, তাই এটি আপনি কমিট করার আগেই কাজ করে। Base resolve হয় `main → master → origin/main → origin/master → origin/HEAD`; `--base <ref>` দিয়ে override করুন।

যখন merge-base resolve করা যায় না (একটি shallow clone, একটি detached HEAD, git-এর বাইরে একটি target), সন্ধানগুলো whole-file attribution-এ fall back করে **এবং রিপোর্ট তা বলে দেয়।** একটি নীরব fallback ঠিক সেই ধরনের ত্রুটি হবে যা এই টুলটি ধরার জন্য বিদ্যমান।

<br />

## AI এজেন্ট

সন্ধানের মূল্য তখনই যখন কিছু তার উপর কাজ করে।

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI ফিক্স লেখে। QA Doctor তা যাচাই করে।** প্রমাণ আসে পুনরায় স্ক্যান থেকে, কখনো এজেন্টের নিজের সফলতার রিপোর্ট থেকে নয়।

| কমান্ড              | এজেন্ট কী পায়                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `qa-doctor mcp`     | stdio-এর উপর একটি [MCP](https://modelcontextprotocol.io) সার্ভার। `scan`, `explain`, এবং `diff` callable টুলে পরিণত হয়।                                                                   |
| `qa-doctor handoff` | একটি সংরক্ষিত `--json` রিপোর্ট একটি deterministic Markdown পরিকল্পনায় পরিণত হয়: কী শনাক্ত হয়েছে, প্রতি সন্ধানের evidence boundary, কী **পরিবর্তন করা উচিত নয়**, কীভাবে যাচাই করতে হয়। |
| `qa-doctor install` | আপনার রিপোতে ইতিমধ্যে থাকা এজেন্ট সারফেসে লেখে (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) যাতে এজেন্টটি শেষ হয়েছে দাবি করার আগে পুনরায় স্ক্যান করে।                                 |

নিজস্ব CLI সহ একটি ক্লায়েন্টে যোগ করুন:

```bash
claude mcp add qa-doctor -- npx -y qa-doctor-cli@latest mcp
```

অথবা একটি `mcpServers` ব্লক নেয় এমন যেকোনো ক্লায়েন্টে:

```json
{
  "mcpServers": {
    "qa-doctor": {
      "command": "npx",
      "args": ["-y", "qa-doctor-cli@latest", "mcp"]
    }
  }
}
```

**Guardrail সুবিধার চেয়ে বেশি গুরুত্বপূর্ণ।** একটি handoff-এর প্রতিটি সন্ধান তার সীমারেখা বহন করে। **E2** বলে _deterministic: অবস্থান চেক করুন এবং ফিক্স প্রয়োগ করুন_। **E1** বলে _REQUIRES CONFIRMATION: শুধু পর্যবেক্ষণ ত্রুটি প্রমাণ করে না_। একটি এজেন্ট যা E1 অন্ধভাবে ঠিক করে, একটি নিয়ম দমন করে, বা স্কোর বাড়াতে একটি নিয়ম সম্পাদনা করে ঠিক তাই করছে যা এই টুলটি ধরার জন্য বিদ্যমান, তাই handoff প্রম্পটে, সন্ধানের পাশে, তা বলে দেয়।

<br />

## বিশ্বাস এবং নিরাপত্তা

**Local-first, zero telemetry।** কোনো network-capable API (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) `src/`-এর কোথাও বিদ্যমান নেই, এবং [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) যদি একটি দেখা যায় তাহলে বিল্ড ব্যর্থ করে। এটি `eval` এবং `new Function`-ও নিষিদ্ধ করে। অবিশ্বস্ত কোড স্ক্যান করা কখনো তা এক্সিকিউট করে না: static analysis সোর্স টেক্সট পড়ে, এবং forensics ইতিমধ্যে ডিস্কে থাকা রিপোর্ট ফাইল পার্স করে।

দুটি সতর্কতা: `npx` নিজেই কিছু চালানোর আগে প্যাকেজ fetch করে, এবং গ্যারান্টি `src/` কভার করে, third-party plugin নয়।

**Plugin sandboxed নয়।** JS plugin (`qa-doctor-rules/*.mjs`, অথবা `"plugins"`-এর অধীনে তালিকাভুক্ত npm প্যাকেজ) পূর্ণ Node privilege দিয়ে চলে, ESLint বা Vitest plugin-এর মতো একই trust model। এগুলো লোড করা **প্রতি স্ক্যানে** opt-in: `--enable-plugins` (অথবা `QA_DOCTOR_ENABLE_PLUGINS=1`) ছাড়া তাদের সোর্স কখনো লোড হয় না, এবং stderr-এ একটি নোটিশ কী স্কিপ হয়েছে তা তালিকাভুক্ত করে। JSON rule manifest কোনো কোড এক্সিকিউট করে না, এবং core rule-ID prefix সংরক্ষিত যাতে একটি plugin তাদের একটির ভান করতে না পারে। [SECURITY.md](SECURITY.md)-এর মাধ্যমে vulnerability রিপোর্ট করুন।

**এটি নিজের উপরও চলে।** একটি verification trust engine-এর কোনো অবস্থান নেই যদি না এটি নিজেই verifiable হয়। প্রতিটি CI রান এই রিপোজিটরিকে সেই একই রান তৈরি করা বিল্ড দিয়ে স্ক্যান করে। Gate যেকোনো error-severity সন্ধানে ব্যর্থ হয়, এবং একটি **partial** স্ক্যান বা একটি **crashed rule**-এও, কারণ কিছু রিপোর্ট না করা একটি truncated self-scan হলো সেই false green যা এই প্রজেক্ট ধরার জন্য বিদ্যমান। `qa-doctor doctor` একই রানে rule base পুনরায় audit করে (fixture firewall, tier honesty, core-tier cap), এবং একটি INCONCLUSIVE চেক ঠিক একটি ব্যর্থ চেকের মতোই ব্যর্থ হয়। উভয় রিপোর্ট build artifact হিসেবে আপলোড করা হয়।

### Exit code এবং machine contract

হিমায়িত, যাতে আপনি এগুলোর উপর CI logic তৈরি করতে পারেন:

| Exit code | অর্থ                                                                 |
| --------- | -------------------------------------------------------------------- |
| `0`       | পরিষ্কার: gate বা তার উপরে কোনো সন্ধান নেই                           |
| `1`       | Gate বা তার উপরে সন্ধান                                              |
| `2`       | Partial স্ক্যান (time budget শেষ, অপঠনযোগ্য ফাইল)। কখনো ব্লক করে না। |
| `10`      | ব্যবহারের ত্রুটি (খারাপ flag, target অনুপস্থিত)                      |
| `20`      | অভ্যন্তরীণ ত্রুটি                                                    |

`2` ইচ্ছাকৃতভাবে `0` থেকে পৃথক: একটি স্ক্যান যা শেষ হয়নি তা "কিছু পায়নি" এমন নয়। এটি এখনো খোঁজা শেষ করেনি।

একটি মেশিন যা কিছু consume করে (MCP tool result, `--json`, SARIF 2.1) তা একটি versioned, **additive-only** স্কিমা (`schemaVersion: 1`, `contractVersion: 1`)-এর অধীনে একটি canonical ফলাফল থেকে আসে, তাই কোনো consumer-কে rendered টেক্সট থেকে অর্থ পুনর্গঠন করতে হয় না। দেখুন [machine contract](docs/machine-contract.md)। নিয়ম ID (`QA-<FAMILY>-NNN`) একবার শিপ হলে immutable এবং কখনো পুনঃব্যবহার হয় না।

<br />

## QA Doctor আপনাকে যা বলতে পারে না

- **এটি আপনার টেস্ট চালায় না।** একটি পরিষ্কার স্ক্যান একটি পাসিং স্যুট নয়।
- **এটি আপনাকে বলতে পারে না একটি assertion _ভুল_।** `expect(total).toBe(41)` স্বাস্থ্যকর দেখায়। QA Doctor এমন টেস্ট খুঁজে পায় যা _ব্যর্থ হতে পারে না_ এবং পাইপলাইন যা _লাল হতে পারে না_, ভুল জিনিস চেক করা টেস্ট নয়।
- **এটি business correctness প্রমাণ করে না।** এখানে কিছুই বলে না যে আপনার প্রোডাক্ট requirement যা চেয়েছিল তা করে।
- **১০০ একটি ভালো স্যুটের প্রমাণ নয়।** আপনার স্যুট আপনার প্রকৃত ঝুঁকি কভার করে কিনা তা ভিন্ন প্রশ্ন, এবং এই টুলটি তার উত্তর দেয় না।
- **৭৯টির মধ্যে ৫টি নিয়ম একটি অনুমানের উপর শিপ হয়**, পরিমাপ করা হার নয়। প্রতিটি তার নিজের সন্ধানে তা বলে দেয়।
- **E1 E2 নয়।** Heuristic সন্ধান পড়ার যোগ্য, অন্ধভাবে প্রয়োগ করার যোগ্য নয়।
- **একটি খালি রিপো `null` স্কোর পায়, কখনো ১০০ নয়।**
- **টেস্ট ঘোষণা ছাড়া `*.spec.ts` নামের একটি ফাইল coverage হিসেবে গণনা হয় না।** একটি রিপো যার একমাত্র spec ফাইলে import বা type থাকে (শূন্য `it`/`test` কল) `null` স্কোর পায়, ১০০ নয়।

<br />

## নথি

সম্পূর্ণ ডকস সাইট রয়েছে <https://sergey-bar.github.io/qa-doctor/>-এ।

| Document                                               | এতে কী আছে                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | স্কোর normalization এবং evidence weighting                       |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Canonical vocabulary: প্রতি concept-এ এক শব্দ                    |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | পরিমাপ করা false-positive হার এবং পদ্ধতি                         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | নিয়মের অবস্থা, tier, suppression, deprecation                   |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver policy, হিমায়িত সারফেস, deprecation চক্র                 |
| [docs/machine-contract.md](docs/machine-contract.md)   | Canonical মেশিন-পাঠযোগ্য ফলাফল                                   |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF আউটপুট এবং editor বা CI সেটআপ                              |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code Quality রিপোর্ট, MR রেসিপি, gate                    |
| [docs/rules/](docs/rules/)                             | প্রতি নিয়মে তৈরি ক্যাটালগ                                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Dev সেটআপ এবং contribution workflow                              |
| [SUPPORT.md](SUPPORT.md)                               | কোথায় জিজ্ঞাসা করতে হবে, রিপোর্ট করতে হবে, এবং সাহায্য পেতে হবে |
| [SECURITY.md](SECURITY.md)                             | Vulnerability রিপোর্টিং                                          |
| [CHANGELOG.md](CHANGELOG.md)                           | রিলিজ ইতিহাস                                                     |

### Status

**Version 1।** JSON স্কিমা এবং exit code হিমায়িত চুক্তি। TypeScript এবং Python-এর সবচেয়ে বিস্তৃত পরিমাপ করা কভারেজ রয়েছে। Java এবং C# নতুন; [maturity table](https://sergey-bar.github.io/qa-doctor/reference/rule-lifecycle)-এর মাধ্যমে তাদের পড়ুন। এরপর কী আসছে, কোনো বানানো তারিখ ছাড়া: [পাবলিক roadmap](https://sergey-bar.github.io/qa-doctor/reference/roadmap)।

### Contributing

নতুন নিয়ম সবচেয়ে সহজ প্রথম contribution। একটি কমান্ড must-fire **এবং** must-not-fire fixture সহ নিয়মের কাঠামো তৈরি করে। তৈরি হওয়া নিয়মটি ইচ্ছাকৃতভাবে নিজের fixture-এ ব্যর্থ হয় যতক্ষণ না প্রকৃত detection লেখা হয়, কারণ একটি stub যা শিপ হয় তা এমন একটি নিয়ম যা কেউ পরিমাপ করেনি:

```bash
qa-doctor create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Dev সেটআপ, standing-gate কমান্ড, এবং anti-creep এবং fixture-firewall নিয়ম [CONTRIBUTING.md](CONTRIBUTING.md)-এ রয়েছে।

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="আপনার রিপোতে এটি চালান।" width="100%" />

```bash
npx qa-doctor-cli@latest
```

[গাইড পড়ুন](https://sergey-bar.github.io/qa-doctor/guide/getting-started) · [ডকস সাইট](https://sergey-bar.github.io/qa-doctor/) · [npm](https://www.npmjs.com/package/qa-doctor-cli)

<br />

টেস্ট পাস হয়েছে কিনা জিজ্ঞাসা করবেন না।<br />
প্রমাণ কি প্রমাণ করে যে তারা বিশ্বাসের যোগ্য তা জিজ্ঞাসা করুন।

<sub>নির্মিত [Sergey Bar](https://www.linkedin.com/in/sergeybar/) দ্বারা · MIT লাইসেন্সপ্রাপ্ত</sub>

</div>
