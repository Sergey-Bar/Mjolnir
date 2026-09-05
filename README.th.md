<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### การทดสอบของคุณโกหกคุณ เราพิสูจน์ให้เห็น

**Verification Trust Engine สำหรับ QA** Mjölnir ตรวจสอบชุดทดสอบและ
CI pipelines รายงานคะแนนความน่าเชื่อถือ และแสดงให้เห็นอย่างแม่นยำว่า
ความไว้วางใจพังตรงไหน

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | ไทย | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**การทดสอบของคุณคู่ควรแก่ความไว้วางใจหรือไม่?**

[ดูมันทำงาน](#-ดูมันทำงาน) ·
[เริ่มเร็ว](#-เริ่มเร็ว) ·
[มันตรวจอะไร](#-mjölnir-ตรวจอะไร) ·
[การให้คะแนน](#การให้คะแนนทำงานอย่างไร) ·
[CI](#-การเชื่อมต่อ-ci) · [การตั้งค่า](#การตั้งค่า) ·
[เอกสาร](#-เอกสาร)

</div>

---

## 🎬 ดูมันทำงาน

<p align="center">
  <img src="assets/readme/demo.svg" alt="รายงาน --verbose ฉบับเต็มของ Mjölnir บน demo repo: WORTHINESS 75/100 NEEDS WORK, การแจกแจงการวินิจฉัยตามหมวด, รายการ FIX THIS FIRST และทุก finding พร้อม rule ID และเลขบรรทัด ครอบคลุมกฎ CI, Playwright, สุขอนามัยการทดสอบ และกฎ Python" width="900" />
</p>

<sub>ผลลัพธ์ฉบับเต็มของ `npx mjolnir-qa ./examples/demo-repo --verbose`
เรนเดอร์จาก reporter จริง — ไม่ตัดทอนอะไรเลย สร้างใหม่ด้วย
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
จะทำให้ CI ล้ม หากสินค้าเองเหลื่อมจากสิ่งที่เครื่องมือพิมพ์</sub>

**เกิดอะไรขึ้นเมื่อครู่:**

1. Mjölnir ค้นพบ Playwright specs, config, CI workflow และไฟล์ทดสอบ
   Python — สี่ภาษา/ฟอร์แมต ในหนึ่งรอบ
2. มันพบหลักฐานที่บั่นทอนความไว้วางใจต่อชุดทดสอบ — `continue-on-error`
   ที่ปกปิด job, `|| true` ที่กลืน exit code, hard sleep, selector เปราะ,
   URL staging ฝังตาย, การรอ `networkidle`
3. มันเปลี่ยนแต่ละเรื่องเป็น finding ที่จับต้องได้ พร้อม rule ID,
   ตำแหน่ง และวิธีแก้ — และเป็นคะแนนเดียวที่คุณ gate PR ได้

### Finding หนึ่งชิ้น ระยะชิด

รัน `mjolnir explain QA-CI-001` กับ finding แรกด้านบน แล้วคุณจะได้:

```text
▚ QA-CI-001 — continue-on-error masks a failing verification gate

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

นี่คือหน่วยของคุณค่า: ไม่ใช่เรื่องสไตล์เล็ก ๆ แต่เป็นจุดที่ CI ของคุณ
บอกว่าบางอย่างผ่าน ทั้งที่ไม่ได้ผ่าน

---

## ⚡ เริ่มเร็ว

รันกับ repo เพื่อรายงานฉบับเต็มและคะแนนความน่าเชื่อถือ:

```bash
npx mjolnir-qa@latest
```

**ใน CI ผลิตภัณฑ์คือคำสั่งเดียว** มันสแกนเฉพาะสิ่งที่ branch แตะ
และออกด้วยเลขไม่ใช่ศูนย์เมื่อมีปัญหาใหม่:

```bash
npx mjolnir-qa@latest --scope changed
```

หย่อนลงใน PR check — `mjolnir ci install` เขียน workflow ให้ — แล้วจบ
ส่วนที่เหลือเป็นทางเลือกทั้งหมด

| คำสั่ง                              | มันทำอะไร                                            |
| ----------------------------------- | ---------------------------------------------------- |
| `mjolnir`                           | สแกนทั้ง repo + คะแนนความน่าเชื่อถือ                 |
| `mjolnir --scope changed`           | เฉพาะสิ่งที่ branch คุณแนะนำ — รูปแบบ CI             |
| `mjolnir ci install`                | สร้าง CI workflow แบบที่ปรึกษาสำหรับ PR              |
| `mjolnir explain QA-CI-001`         | อะไร / ทำไม / วิธีแก้ + อัตรา FP ที่วัดได้ของกฎเดียว |
| `mjolnir rules --unmeasured`        | กฎที่ทำงานด้วยข้อสมมติ ไม่ใช่การวัด                  |
| `mjolnir --json` / `--format sarif` | เครื่องอ่านได้ / GitHub Code Scanning                |
| `mjolnir --strict`                  | รันกฎ tier quarantine ด้วย (ความเสี่ยง FP สูงกว่า)   |

<details>
<summary><strong>เมื่ออะไรบางอย่าง flaky</strong></summary>

| คำสั่ง                              | มันทำอะไร                                          |
| ----------------------------------- | -------------------------------------------------- |
| `mjolnir forensics ./test-results/` | ข้อมูลรันจริง → คำพิพากษา `TRUE-FLAKE`, `FLAKY.md` |
| `mjolnir triage ./test-results/`    | ข้อเสนอการกักกันจากประวัติการรัน                   |
| `mjolnir pw-report ./test-results/` | สรุปการรัน Playwright — retry / flake / ช้าสุด     |
| `mjolnir doctor:playwright`         | สแกนลึกเฉพาะ Playwright + Selector Health Score    |

</details>

<details>
<summary><strong>ใช้เป็นครั้งคราว / รายงาน</strong></summary>

| คำสั่ง                          | มันทำอะไร                                             |
| ------------------------------- | ----------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | แก้อัตโนมัติอย่างปลอดภัย พร้อมหลักฐาน                 |
| `mjolnir baseline` / `diff`     | บันทึก snapshot ของ finding แล้วรายงานเฉพาะใหม่/แย่ลง |
| `mjolnir impact --since <ref>`  | อะไรเปลี่ยนไปตั้งแต่ commit ก่อนหน้า                  |
| `mjolnir debt`                  | ทะเบียนหนี้การทดสอบ พร้อมโมเดลต้นทุน                  |
| `mjolnir handover`              | แผนที่ onboarding ชุดทดสอบสำหรับ QA หน้าใหม่          |
| `mjolnir stats`                 | ตัวนับตลอดกาลในเครื่อง ของ fix ที่เคยเห็น             |
| `mjolnir badge`                 | JSON endpoint ของ shields.io + snippet                |
| `mjolnir rules --md`            | แคตตาล็อกกฎเต็มรูปแบบ (JSON หรือ Markdown)            |
| `mjolnir doctor`                | ตรวจตรวามของฐานกฎของ Mjölnir เอง                      |
| `mjolnir create-rule <ID>`      | สร้างโครงกฎใหม่ + fixtures                            |
| `mjolnir --format mermaid`      | แผนภาพสถาปัตยกรรมการทดสอบสำหรับคอมเมนต์ PR            |

</details>

ติดตั้งแบบ global แทน `npx` หากคุณชอบ: `npm i -g mjolnir-qa`
ต้องใช้ Node.js ≥ 22.18 ทำงานบน Windows, macOS และ Linux

---

## 👥 สำหรับใคร?

- **QA / SDET** เจ้าของชุด e2e หรือ integration ที่ต้องการหลักฐานว่า
  ชุดทดสอบสมควรได้เครื่องหมายเขียวที่มันผลิตจริง
- **ทีม Platform / DevEx** ผู้รับผิดชอบความสมบูรณ์ของ CI และ release
  gates — คนที่ใส่ใจว่า `continue-on-error` จะไม่หลอกเปลี่ยน pipeline
  แดงให้เขียวอย่างเงียบ ๆ
- **ผู้ดูแล OSS** ที่อยากได้เกตตรวจสอบที่ถูก เปิดตลอดเวลา รันได้ทั้ง
  ในเครื่องและใน CI โดยไม่มีการเรียกเครือข่าย

---

## 🔨 Mjölnir ตรวจอะไร

|     |                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **คะแนนความน่าเชื่อถือ** — ตัวเลขเดียว ตารางหักโปร่งใส ไม่มีกล่องดำ                                             |
| 🎭  | **Selector Health Score** — ให้เกรด locator ของ Playwright คุณ ไม่ใช่แค่อัตราผ่าน                               |
| 🔬  | **นิติวิทยาศาสตร์ runtime** — อ่านข้อมูลรันจริงของ Playwright/JUnit เพื่อจับ `TRUE-FLAKE` ไม่ใช่แค่เดาแบบสถิต   |
| 🚨  | **กฎความสมบูรณ์ของ CI** — จับ `continue-on-error`, `\|\| true` และเทคนิคเขียวลวงอื่น ๆ                          |
| 🐍  | **ทั้งสี่ Playwright bindings** — TypeScript, Python, Java, C#/.NET — บวก pytest, JUnit/TestNG และ CI workflows |
| 🔒  | **Local-first** — ศูนย์การเรียกเครือข่ายระหว่างสแกน ศูนย์เทเลเมทรี รันเสร็จในไม่กี่วินาที                       |

### กฎทั้งหมด

ทุกกฎมาพร้อม fixture must-fire **และ** must-not-fire กฎที่ยิงบน
fixture ลบของตัวเองจะปล่อยไม่ได้ — นั่นคือกำแพงกัน false positive

<details>
<summary><strong>สุขอนามัยการทดสอบ</strong></summary>

| ID          | กฎ                                                  | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | ทดสอบแบบโฟกัสถูก commit (`.only`, `fit`)            | error    |
| QA-TEST-002 | ข้ามทดสอบโดยไม่มีเหตุผล                             | error    |
| QA-TEST-002 | ข้ามทดสอบโดยมีเหตุผลที่ถูกบันทึก                    | warning  |
| QA-TEST-003 | ทดสอบไม่มี assertion                                | error    |
| QA-TEST-004 | hard sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | ใช้ retry เกินควร ซ่อนความไม่นิ่ง                   | warning  |
| QA-TEST-010 | เนื้อความทดสอบว่าง                                  | error    |

</details>

<details>
<summary><strong>คุณภาพการทดสอบ</strong></summary>

| ID           | กฎ                                     | Severity |
| ------------ | -------------------------------------- | -------- |
| QA-TQUAL-001 | ตรวจยืนยันด้วย mock เท่านั้น           | info     |
| QA-TQUAL-002 | assertion พรรคพวกตัวเอง (tautological) | error    |
| QA-TQUAL-009 | assertion ของ promise ที่ไม่ await     | error    |
| QA-TQUAL-011 | ทดสอบที่ถูกคอมเมนต์ทิ้งไว้             | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | กฎ                                        | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-PW-002 | assertion ของ locator ที่ไม่ await        | error    |
| QA-PW-003 | `page.pause()` / `test.only()` ถูก commit | error    |
| QA-PW-004 | selector CSS/XPath เปราะ                  | warning  |
| QA-PW-005 | ตรรกะธุรกิจใน `page.evaluate()`           | info     |
| QA-PW-114 | element handles รุ่นเก่า (`page.$`)       | info     |
| QA-PW-118 | การรอ `networkidle` (flaky by design)     | info     |
| QA-PW-123 | URL สภาพแวดล้อมฝังตาย                     | warning  |

</details>

<details>
<summary><strong>ความสมบูรณ์ของ CI</strong></summary>

| ID        | กฎ                                                            | Severity |
| --------- | ------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` ปกปิดความล้มเหลว                          | error    |
| QA-CI-002 | `\|\| true` กลืน exit code                                    | error    |
| QA-CI-005 | รายงานถูกใช้แต่ไม่เคยถูกสร้าง                                 | error    |
| QA-CI-007 | ครอบ retry รอบการทดสอบ                                        | warning  |
| QA-CI-008 | step สำเร็จเสมอ ปกปิดความล้มเหลว                              | error    |
| QA-CI-009 | exit code ของทดสอบไม่ถูกส่งต่อ (`\|` ไม่มี pipefail, โซ่ `;`) | error    |
| QA-CI-010 | ข้ามทดสอบในที่ที่ต้องบล็อก (skip-on-PR guards)                | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | กฎ                                        | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-PY-002 | ทดสอบถูกข้าม (`skip`, `xfail` ไม่เข้มงวด) | warning  |
| QA-PY-003 | ฟังก์ชันทดสอบไม่มี assertion              | error    |
| QA-PY-005 | `time.sleep()` ในการทดสอบ                 | warning  |
| QA-PY-006 | เนื้อความทดสอบว่าง (`pass`)               | info     |
| QA-PY-010 | พึ่งพาความสุ่ม/เวลาโดยไม่ freeze          | info     |
| QA-PY-012 | assertion พรรคพวกตัวเอง                   | error    |

กฎ Python รวม 20 ข้อ (QA-PY-001…012 สุขอนามัย pytest + QA-PY-101…108 Playwright-Python)

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | กฎ                                       | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | ทดสอบถูกปิด (`@Disabled`)                | warning  |
| QA-JV-102 | hard sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | วิธีทดสอบไม่มี assertion                 | error    |
| QA-JV-105 | hard sleep Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | selector เปราะแทน role locator           | warning  |
| QA-JV-108 | URL สภาพแวดล้อมฝังตายในทดสอบ             | info     |
| QA-JV-111 | mock ครอบคลุมหมด `page.route("**")`      | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | กฎ                                         | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-CS-101 | ทดสอบถูกข้าม (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | hard sleep (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | วิธีทดสอบไม่มี assertion                   | error    |
| QA-CS-105 | hard sleep `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | selector เปราะแทน role locator             | warning  |
| QA-CS-108 | URL สภาพแวดล้อมฝังตายในทดสอบ               | info     |
| QA-CS-111 | mock ครอบคลุมหมด `page.RouteAsync("**")`   | info     |

</details>

> แคตตาล็อกสดฉบับเต็ม — ทุกกฎพร้อม tier, confidence, ความเสี่ยง false
> positive และความพร้อมของ autofix — สร้างจาก registry:
>
> ```bash
> mjolnir rules --md
> ```
>
> หน้าต่อกฎอยู่ใต้ [`docs/rules/`](docs/rules/)

### วัดไปแล้วเท่าไร

**74 จาก 99 กฎ มีอัตรา false positive ที่วัดกับโค้ด OSS จริง** (อย่างน้อย
10 findings ที่จัดหมวดด้วยมือต่อกฎ; ดู
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)) อีก 19 กฎออกมาบนการประเมินของผู้เขียน
ส่วนท้ายของทุกการสแกนบอกว่ากฎที่ _ยิง_ มีกี่กฎที่วัดแล้ว;
`mjolnir rules --unmeasured` แสดงกฎที่ยังไม่วัด; หน้า `mjolnir explain`
ของทุกกฎระบุสถานะ เราเผยแพร่อัตรานี้แม้มันจะน่าเกลียด — QA-CS-103 ตรวจได้
ที่ 95 % และถูกส่งไปกักกันเพราะเหตุนี้ การทำให้ตัวเลข 78 นั้นโตขึ้นคืองาน
ต่อเนื่องของโปรเจกต์

### Tier ของกฎและความสุกงอมของภาษา

ทุกกฎเป็น `core`, `extended` หรือ `quarantine` กำหนดจากอัตรา false
positive **ที่วัดได้**:

| Tier         | ความหมาย                            | สแกนปกติ | `--strict` |
| ------------ | ----------------------------------- | :------: | :--------: |
| `core`       | ≤ 10 % FP ที่วัดได้                 |    ✅    |     ✅     |
| `extended`   | ≤ 30 % FP ที่วัดได้                 |    ✅    |     ✅     |
| `quarantine` | สูงกว่า 30 % หรือยังไม่วัด (n < 10) |    ❌    |     ✅     |

| ภาษา            | Adapter        | ความครอบคลุมวันนี้                                |
| --------------- | -------------- | ------------------------------------------------- |
| TypeScript / JS | AST คอมไพเลอร์ | กว้างสุด วัดมากสุด — ส่วนใหญ่ `core`/`extended`   |
| Python / pytest | ชั้น regex     | กว้าง ตรวจกับ corpus — ส่วนใหญ่ `core`/`extended` |
| Java            | ชั้น regex     | ใหม่กว่า — ส่วนใหญ่ `extended`/`quarantine`       |
| C# / .NET       | ชั้น regex     | ใหม่กว่า — ส่วนใหญ่ `extended`/`quarantine`       |

TypeScript และ Python มีความครอบคลุมที่วัดได้กว้างที่สุด Java และ C#
ปล่อยแล้ว มีเอกสาร และยังอยู่นอกตัวเลขพาดหัว จนกว่าชุดทดสอบผู้ใช้จริง
(ไม่ใช่ทดสอบของไลบรารี binding เอง) จะถูกตรวจ

---

## การให้คะแนนทำงานอย่างไร

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="ผลลัพธ์ terminal ของ Mjölnir — WORTHINESS 75/100 NEEDS WORK, การแจกแจงการวินิจฉัยตามหมวด และรายการ FIX THIS FIRST" width="820" />
</p>

<sub>สร้างใหม่ด้วย `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
จะทำให้ CI ลม หากสินค้าเองเหลื่อมจากสิ่งที่ reporter พิมพ์จริง</sub>

คะแนนโปร่งใส: **error −8, warning −3, info −1** แล้ว normalize ด้วย
exposure ของชุดทดสอบ (การหักต่อการประกาศทดสอบ) การหักที่ถ่วงน้ำหนักด้วย
หลักฐาน หมายความว่าสัญญาณอ่อนแพงกว่า แสดงผลใน terminal ใช้ตัวเลขที่
ลดแล้วชุดเดียวกับที่คะแนนใช้ — ไม่มีกล่องดำ วิธีเต็ม:
[docs/SCORING.md](docs/SCORING.md)

**คำพิพากษา**

| Score   | คำพิพากษา        |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**ระดับหลักฐาน** — ทุก finding พกระดับหนึ่ง; มันกำหนดน้ำหนักของ finding
ในคะแนน:

| ระดับ | ความหมาย              | ผลต่อคะแนน            | ตัวอย่าง                                              |
| ----- | --------------------- | --------------------- | ----------------------------------------------------- |
| E2    | ข้อบกพร่องเชิงกำหนด   | หักเต็มจำนวน          | commit `.only` — พิสูจน์เชิงโครงสร้างได้              |
| E1    | รูปแบบเชิงเฮิร์ริสติก | หักครึ่งหนึ่ง         | `sleep()` ที่ regex เจอ — สัญญาณแข็งแรง ไม่ใช่หลักฐาน |
| E0    | การสังเกต             | ศูนย์ (info เท่านั้น) | รายงานแต่ไม่ gate CI และไม่หักเลย                     |

กฎส่วนใหญ่เป็น **E1** คำสโลแกน «we prove it» อ้างถึงระบบนี้: finding
E2 คือหลักฐานเชิงโครงสร้าง; finding E1 คือคำเตือนที่วางตำแหน่งถูกต้อง
ไม่ใช่หลักฐานทางการ

repo ว่างจะได้คะแนน `null` ไม่ใช่เลข 100 ปลอม — ดู
[โมเดลความไว้วางใจ](#โมเดลความไว้วางใจ)

---

## 🎭 Selector Health Score

ตัวชี้วัดพาดหัวสำหรับชุด Playwright — locator ของคุณทนทานแค่ไหน:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

locator ที่อิง role ได้คะแนนเต็ม ห่วงโซ่ CSS class และ XPath จมคะแนน —
มันแตกทุกครั้งที่ refactor DOM โดยไม่บอกว่าพฤติกรรมใดถดถอย

---

## 🔬 หลักฐานระดับ runtime

การตรวจจับความไม่นิ่งแบบสถิตคือการเดา Mjölnir อ่าน **ข้อมูลการรันจริง** —
รายงาน JSON ของ Playwright และ XML ของ JUnit จาก runner ใดก็ได้:

```bash
mjolnir forensics ./test-results/
```

```text
▚ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

ทดสอบที่ผ่านเฉพาะตั้งแต่ attempt ≥ 2 ไม่ใช่ทดสอบที่ผ่าน — มันเป็น
ทดสอบที่โชคดี มันถูกติดธง `TRUE-FLAKE` ไม่ว่าเครื่องหมายเขียวสุดท้าย
จะเป็นอย่างไร

---

## ⚡ Mjölnir ไม่ใช่ linter อีกตัว

Linter บอกว่าโค้ดทำตามกฎหรือไม่ Mjölnir บอกว่าการตรวจสอบของคุณ
น่าเชื่อถือหรือไม่

|                                                               | ESLint / SonarQube | เครื่องมือ coverage | รีวิวด้วยมือ | **Mjölnir** |
| ------------------------------------------------------------- | :----------------: | :-----------------: | :----------: | :---------: |
| ความสมบูรณ์ของ CI workflow (`continue-on-error`, `\|\| true`) |         ❌         |         ❌          |   ไม่ค่อย    |     ✅      |
| ข้ามภาษา (TS, Python, Java, C#) จากเครื่องมือเดียว            |         ❌         |         ❌          |      ❌      |     ✅      |
| ให้เกรดความทนทานของ locator Playwright (Selector Health)      |         ❌         |         ❌          |   ไม่ค่อย    |     ✅      |
| ติดธงทดสอบไม่มี assertion จริง                                |  ✅ (ปลั๊กอิน)\*   |         ❌          |   บางครั้ง   |     ✅      |
| จับ hard sleep (`waitForTimeout`, `time.sleep`)               |  ✅ (ปลั๊กอิน)\*   |         ❌          |   บางครั้ง   |     ✅      |
| รันในไม่กี่วินาที ศูนย์การเรียกเครือข่ายระหว่างสแกน           |         ✅         |         ✅          |      —       |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) และ `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) ครอบคลุมสิ่งเหล่านี้ให้ framework
ตามลัพธ์ของมัน

**การวิเคราะห์ runtime** เป็นหมวดหมู่แยกจากการ lint แบบสถิต:

|                                              | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| -------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| อ่านข้อมูลรันจริงเพื่อคำพิพากษา `TRUE-FLAKE` |         บางส่วน\*         |     บางส่วน (tag)     |          ✅           |
| รายงาน triage ความไม่นิ่งจากประวัติการรัน    |            ❌             |          ✅           |          ✅           |
| เชื่อมกับคะแนนความน่าเชื่อถือแบบสถิต         |            ❌             |          ❌           |          ✅           |

\*Playwright ติดตาม retry ภายใน แต่ไม่ผลิตรายงานความไม่นิ่งแบบ
ยืนเดี่ยวพร้อมป้ายคำพิพากษา

---

## 🤖 ทำไมไม่ใช้แค่ AI code review?

ปัญหาต่างกัน ชั้นต่างกัน AI review เห็นการเปลี่ยนทดสอบที่น่าสงสัยใน
diff ได้ แต่มันไม่พิสูจน์ว่าระบบตรวจสอบทั้งหมดน่าไว้วางใจ — และมันเห็น
แค่ diff ที่คุณให้ดู

|                                             | AI code review (Copilot ฯลฯ) |              **Mjölnir**               |
| ------------------------------------------- | :--------------------------: | :------------------------------------: |
| ต้นทุนต่อการสแกน                            |  Tokens (ขยายตามขนาด diff)   | **ศูนย์** (ทำงานในเครื่อง ติดตั้งแล้ว) |
| เห็นทั้งชุดทดสอบ + ทุก config CI            |  เฉพาะ PR diff ที่คุณให้ดู   |         **ทุกอย่าง ทุกครั้ง**          |
| กำหนดตาย (input เดียวกัน → output เดียวกัน) |       ❌ (ไม่กำหนดตาย)       |                 **✅**                 |
| จับรูปแบบที่หลับมาหลายเดือน                 |     เฉพาะถ้าอยู่ในบริบท      |          **✅** (สแกนทุกไฟล์)          |
| จำ finding ข้ามการรัน                       |  ❌ (ไม่มีความจำข้ามเซสชัน)  |        **✅** (baseline + diff)        |
| รันโดยไม่ต้องมีคนสั่ง                       |    ต้องมี PR หรือ prompt     |       **✅** (hook CI, 3 วินาที)       |

**ใช้ทั้งสอง** AI เก็บรายละเอียดปลีกย่อย เจตนา และข้อบกพร่องเชิงออกแบบ
ที่ regex หาไม่เจอ Mjölnir เก็บรูปแบบเชิงโครงสร้างที่ AI มองข้ามเพราะ
มันดู «ตั้งใจ» — `.only` ที่ถูก commit, exit code ที่ถูกกลืน,
`continue-on-error` บน job ทดสอบ นี่ไม่ใช่บั๊กที่ต้องใช้การใคร่ครวญ;
นี่คือข้อเท็จจริงที่ต้องใช้การสแกน

---

## 🤖 การเชื่อมต่อ CI

คำสั่งเดียวสร้าง PR workflow — เป็นแบบที่ปรึกษาโดยดีฟอลต์ ไม่เคยบล็อก:

```bash
mjolnir ci install
```

หรือต่อเข้า GitHub Code Scanning แบบ native ผ่าน SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

การตั้งค่า editor และ pipeline สำหรับ SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)

### ความครอบคลุมแบบ changed scope

`--scope changed` ผูก finding กับบรรทัดที่ branch คุณเพิ่ม เทียบกับ
merge-base กับ `main` ครอบคลุมไฟล์ทดสอบ (`*.spec.*`, `*.test.*`) บวก
ไฟล์ GitHub workflow และ config Playwright ใน diff เมื่อ merge-base
หาค่าไม่ได้ — shallow clone, detached HEAD, เป้าหมายไม่ใช่ git,
default branch ต่างกัน — มันลดรูปอย่างซื่อสัตย์: finding กลับไปผูก
ทั้งไฟล์ และรายงานก็บอก แทนที่ base ref ได้ด้วย `--base <ref>`

---

## การตั้งค่า

Mjölnir เป็น zero-config `mjolnir.config.json` (หรือ `.mjolnir.json`)
ทางเลือกที่ราก repo ปรับ severity, gating และ scope — ไม่เคยเปลี่ยน
ความหมายการตรวจจับ

| Key                 | ชนิด                                 | ผล                                                                                                                                          |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | glob ignore เพิ่มเติม (ส่วนย่อยของ gitignore) บนค่าดีฟอลต์ที่มีให้                                                                          |
| `gate`              | `"advisory" \| "error" \| "warning"` | ความรุนแรงระดับใดที่ออกด้วยเลขไม่ใช่ศูนย์ (ดีฟอลต์ `error`; `advisory` ไม่เคยบล็อก)                                                         |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | จัดลำดับ finding ของกฎใหม่สำหรับ repo ของคุณ                                                                                                |
| `ignore`            | `IgnoreEntry[]`                      | กด finding — **`reason` จำเป็น**; รายการหมดอายุใน 90 วัน (วันที่ `expires` ชัดเจน หรือเวลาแก้ไขล่าสุดของไฟล์ config สำหรับรายการที่ไม่ระบุ) |
| `plugins`           | `string[]`                           | แพ็กเกจกฎบุคคลที่สาม (ดู [โมเดลความไว้วางใจ](#โมเดลความไว้วางใจ))                                                                           |

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

- **`.mjolnirignore`** — ไฟล์สไตล์ gitignore เรียบ ๆ สำหรับยกเว้นพาธ
  ภาษาเดียวกับ `exclude` ใช้มันสำหรับสัญญาณรบกวนเฉพาะเครื่อง; ใช้
  `exclude` เมื่อรายการควรอยู่ใน version control ร่วมกับ config ที่เหลือ
- **CLI overrides** — `--strict` (รวมกฎกักกัน), `--width <cols>` และ
  `--ascii` / `--no-ascii` (เรนเดอร์เทอร์มินัล), `--tone blunt`
  (ข้อความตรงขึ้น), `--max-duration <sec>` (สแกนบางส่วนที่จำกัดเวลา)
- การกดกฎและวงจรชีวิตการเลิกใช้: [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)

รายการ `ignore` ยังหล่อเลี้ยงคำสั่ง `mjolnir suppressions` แบบเดี่ยว
ซึ่งแสดงสิ่งที่ถูกกดอยู่ และเมื่อใดรายการแต่ละรายการหมดอายุ

---

## 📐 รหัสออก & สัญญา

แช่แข็ง — ปลอดภัยที่จะสร้างตรรกะ CI บน:

| รหัสออก | ความหมาย                                              |
| ------- | ----------------------------------------------------- |
| `0`     | สะอาด — ไม่มี finding ที่ระดับเกตหรือสูงกว่า          |
| `1`     | มี finding ที่ระดับเกตหรือสูงกว่า                     |
| `2`     | สแกนบางส่วน (หมดงบเวลา, ไฟล์อ่านไม่ได้) — ไม่เคยบล็อก |
| `10`    | ใช้งานผิด (flag ผิด, ไม่ระบุเป้าหมาย)                 |
| `20`    | ข้อผิดพลาดภายใน                                       |

รายงาน JSON/SARIF คือ `schemaVersion: 1` rule ID (`QA-<FAMILY>-NNN`)
หลังปล่อยแล้วเปลี่ยนไม่ได้ และไม่เคยถูกนำกลับมาใช้

---

## โมเดลความไว้วางใจ

- **Local-first** — ศูนย์การเรียกเครือข่ายระหว่างสแกน เด็ดขาด ศูนย์
  เทเลเมทรี
- **ไม่มีหลักฐานปลอม** — เราพูด «ไม่รู้» มากกว่า «ตรวจแล้ว» repo ว่าง
  ได้ `score: null` ไม่ใช่ 100 ปลอม
- **ความซื่อสัตย์บางส่วน** — ถ้าการวิเคราะห์ถูกตัดสั้น ผลลัพธ์บอก
  ไม่เคย «เสร็จ» เมื่อไม่ได้เสร็จ
- **กำแพง FP** — การตรวจจับทำงานบนมุมมองโค้ดที่ปราศจากคอมเมนต์/สตริง
  (กฎ TypeScript ใช้ AST คอมไพเลอร์): รูปแบบในคอมเมนต์ร้อยเรียงหรือ
  สตริงตัวอย่างเอกสาร คือเอกสาร ไม่ใช่ finding
- **วัด ไม่ใช่อ้าง** — เฉพาะกฎที่มีอัตรา false positive จากโค้ด OSS จริง
  จึงอยู่ใน tier พาดหัว (ดู [วัดไปแล้วเท่าไร](#วัดไปแล้วเท่าไร));
  ส่วนท้ายการสแกนและ `mjolnir rules --unmeasured` บอกว่ากฎไหนสถานะไหน
- **ความไว้วางใจต่อปลั๊กอิน** — ปลั๊กอินคือแพ็กเกจ npm ประกาศใต้
  `"plugins"` **ไม่มี sandbox**: โค้ดปลั๊กอินรันด้วยสิทธิ์ Node เต็ม
  โมเดลความไว้วางใจเดียวกับปลั๊กอิน ESLint หรือ Vitest คำนำหน้า rule ID
  ของ core สงวนไว้และถูกปฏิเสธจากปลั๊กอิน เพื่อกันการอ้างปลอม
- **กฎภายนอกประจำ workspace** (อิงโฟลเดอร์ ศูนย์เครือข่าย) — ไดเรกทอรี
  `mjolnir-rules/` ติดกับเป้าสแกนโหลดกฎกำหนดเอง: ไฟล์ JSON ประกาศรูปแบบ
  regex (ไม่รันโค้ด) โมดูล `.mjs`/`.js` export `rules` (ความไว้วางใจ
  Node เต็ม เหมือนปลั๊กอิน) กฎภายนอกพก trust metadata เดียวกับ core;
  ไม่เคยขึ้นไปใน tier core (core ต้องมีอัตรา FP ที่วัดจาก sidecar
  corpus — `tier: "core"` ที่ประกาศมาถูกบีบลงเหลือ `extended`),
  ทำตามเพดาน tier และถูกตรวจเรื่องเหลื่อมล้ำ: `mjolnir rules --md
--external` เรนเดอร์แคตตาล็อกจากไฟล์ที่โหลด (แหล่งที่มา `external`)
  และตัวสร้างเมทริกซ์รับ `--external <root>`

---

## 🏗️ สถาปัตยกรรม

<details>
<summary>ขยายแผนผัง</summary>

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

- **กฎเป็นฟังก์ชันบริสุทธิ์** — `(SourceFileContext) → Finding[]`,
  ไม่มี I/O ไม่มี global เพิ่มระบบนิเวศใหม่ = หนึ่ง adapter + กฎของมัน
- **TypeScript/Playwright ใช้ AST คอมไพเลอร์** (ts-morph) Python, Java
  และ C# รันบนชั้น regex ร่วมกันที่ปิดบังคอมเมนต์/สตริง
- ชั้น AST tree-sitter WASM สำหรับ Java และ C# มีอยู่และเป็นก้าวความ
  แม่นยำถัดไป — ยังไม่ได้เสียบเข้ากับ pipeline สแกนแบบซิงโครนัส

---

## 📚 เอกสาร

| เอกสาร                                                 | มีอะไรในนั้น                                    |
| ------------------------------------------------------ | ----------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | การ normalize คะแนน + การถ่วงน้ำหนักด้วยหลักฐาน |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | อัตรา false positive ที่วัดได้ + วิธีวัด        |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | สถานะกฎ การกด การเลิกใช้                        |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | ผลลัพธ์ SARIF + การตั้งค่า editor/CI            |
| [docs/rules/](docs/rules/)                             | แคตตาล็อกต่อกฎที่สร้างอัตโนมัติ                 |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | การตั้งค่า dev + ขั้นตอนการร่วมพัฒนา            |
| [CHANGELOG.md](CHANGELOG.md)                           | ประวัติการเผยแพร่                               |
| [SECURITY.md](SECURITY.md)                             | รายงานช่องโหว่                                  |

---

## 📈 สถานะ

**v0.5.x · โอเพนเบตา** JSON schema และรหัสออกเป็นสัญญาแช่แข็ง
TypeScript และ Python มีความครอบคลุมที่วัดได้กว้างสุด; Java และ C#
ใหม่กว่า — อ่านผ่าน
[ตาราง tier](#tier-ของกฎและความสุกงอมของภาษา)

---

## 🤝 ร่วมพัฒนา

กฎใหม่คือรายการแรกที่ง่ายที่สุด — หนึ่งคำสั่งสร้างโครงกฎพร้อม fixture
must-fire **และ** must-not-fire (กฎที่สร้างให้จงใจล้มเหลวบน fixture
จนกว่าคุณจะเขียนการตรวจจับจริง — stub ปล่อยไม่ได้):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

การตั้งค่า dev เต็มรูปแบบ คำสั่ง standing gate และกฎหมาย anti-creep /
กำแพง fixture อยู่ใน [CONTRIBUTING.md](CONTRIBUTING.md)

---

<div align="center">

**หยุดปล่อยการทดสอบที่คุณไว้วางใจไม่ได้**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

สร้างโดย [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
