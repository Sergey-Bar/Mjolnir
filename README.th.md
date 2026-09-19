<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir เทสต์บอกคุณว่าอะไรผ่าน Mjölnir บอกคุณว่าอะไรเชื่อถือได้" width="100%" />

<br />

Mjölnir ค้นหาเทสต์ที่ไม่มีวันล้มเหลวและไปป์ไลน์ที่ไม่มีวันเป็นสีแดง<br />
แล้วให้คะแนนว่าผลลัพธ์เชื่อถือได้แค่ไหน พร้อมหลักฐานของทุกคะแนน

<br />

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![downloads](https://img.shields.io/npm/dm/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0A1119)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Sergey-Bar/Mjolnir?style=flat-square&color=1F6F7C&labelColor=0A1119&label=coverage)](https://codecov.io/gh/Sergey-Bar/Mjolnir)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Sergey-Bar/Mjolnir/badge)](https://scorecard.dev/viewer/?uri=github.com/Sergey-Bar/Mjolnir)
[![license](https://img.shields.io/badge/license-MIT-1F6F7C.svg?style=flat-square&labelColor=0A1119)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-1F6F7C.svg?style=flat-square&labelColor=0A1119)](https://nodejs.org)

```bash
npx mjolnir-qa@latest
```

[ดูการทำงานจริง](#ดูการทำงานจริง) · [เริ่มต้นอย่างรวดเร็ว](#เริ่มต้นอย่างรวดเร็ว) · [สิ่งที่ตรวจพบ](#สิ่งที่-mjölnir-ตรวจพบ) · [คะแนน](#คะแนนความน่าเชื่อถือ) · [หลักฐาน](#แบบจำลองหลักฐาน) · [นิติวิเคราะห์การรัน](#นิติวิเคราะห์ขณะรัน) · [CI](#ความสมบูรณ์ของ-ci) · [เอเจนต์](#เอเจนต์-ai) · [ความปลอดภัย](#ความเชื่อถือและความปลอดภัย) · [ข้อจำกัด](#สิ่งที่-mjölnir-บอกคุณไม่ได้) · [เอกสาร](#เอกสารประกอบ)

<details>
<summary>อ่านในภาษาอื่น — 22 ภาษา</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | ไทย | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## เครื่องหมายถูกสีเขียวคือคำกล่าวอ้าง ไม่ใช่ข้อพิสูจน์

เครื่องหมายถูกสีเขียวหมายความว่าไปป์ไลน์ไม่ล้มเหลว ไม่ได้หมายความว่าเทสต์ถูกรันจริง หรือว่าเทสต์มีโอกาสล้มเหลวได้ ทุกกรณีต่อไปนี้ผ่านเป็นสีเขียวทั้งสิ้น:

- `.only` ที่ถูกคอมมิตไว้ ทำให้รันเทสต์เพียง 3 ตัวแทนที่จะเป็น 900 ตัว
- `continue-on-error: true` บน job ที่ควรทำหน้าที่เป็นด่านกั้น
- `|| true` ต่อท้ายคำสั่งรันเทสต์
- เทสต์ที่ไม่ได้ตรวจสอบอะไรเลย หรือมีเนื้อหาว่างเปล่า
- ตัวครอบการรันซ้ำที่เปลี่ยนความล้มเหลวจริงให้กลายเป็นการผ่านแบบฟลุก
- รายงานที่ workflow อัปโหลดแต่ไม่เคยถูกสร้างขึ้นมาจริง
- sleep แบบตายตัวที่ประคอง race condition เอาไว้

ไม่มีข้อใดทำให้ไปป์ไลน์เป็นสีแดง และทุกข้อดูเหมือนตั้งใจเมื่ออยู่ในการรีวิว นั่นคือเหตุผลที่มันรอดมาได้ นี่คือ Mjölnir กำลังอ่านกรณีจริง:

<p align="center">
  <img src="assets/readme/scan.svg" alt="CI workflow ของรีโพสาธิต อ่านทีละบรรทัด Mjölnir ทำเครื่องหมายแต่ละข้อค้นพบที่บรรทัดที่รายงาน พร้อมกฎ สิ่งที่ผิด ระดับหลักฐาน และอัตราผลบวกลวงที่วัดได้" width="800" />
</p>

<sub>ทุกข้อค้นพบที่การสแกนสาธิตรายงานสำหรับ workflow นี้ ณ บรรทัดที่รายงาน สร้างโดย `npm run docs:readme-brand` จาก [`demo-report.json`](assets/readme/demo-report.json) และถูกล็อกไม่ให้คลาดเคลื่อนใน CI</sub>

**โหมดเข้มงวด.** การตรวจจับที่รุนแรงที่สุด — `.only`, `continue-on-error`, การทดสอบว่าง, การใช้ retry ในทางที่ผิด — อยู่ในชั้นกักกัน ทำงานเฉพาะภายใต้ `--strict` และจำกัดที่ความรุนแรง `info`: ตั้งค่าสถานะ แต่ไม่เคยบล็อก การสแกนเริ่มต้น (`npx mjolnir-qa@latest` โดยไม่มี `--strict`) ครอบคลุมเฉพาะกฎหลักและกฎขยาย เพิ่ม `--strict` เมื่อคุณต้องการชั้นที่ปรึกษาด้วย

Mjölnir อ่านชุดเทสต์ CI workflow และรายงานจากการรันจริงหากคุณมี มันไม่รันเทสต์ของคุณ ไม่ติดตั้ง dependency และไม่รันโค้ดที่มันสแกน และเมื่อไม่มีหลักฐาน มันจะบอกตรง ๆ แทนที่จะแต่งความมั่นใจขึ้นมา:

| สถานการณ์                                         | สิ่งที่ Mjölnir รายงาน                                         |
| ------------------------------------------------- | -------------------------------------------------------------- |
| ไม่พบการประกาศเทสต์                               | คะแนน `null` แสดงเป็น **UNKNOWN** ไม่มีวันเป็น 100 ที่แต่งขึ้น |
| ไม่มี baseline หรือรีวิชันที่เปรียบเทียบได้       | **UNKNOWN** พร้อมระบุเหตุผล ไม่มีวันสมมติเป็น 0                |
| การสแกนถูกตัดจบกลางคัน (งบเวลา ไฟล์ที่อ่านไม่ได้) | **PARTIAL** รหัสออก `2` ไม่มีวันแสดงว่าสะอาด                   |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Mjölnir ทำงานอย่างไร มันอ่านชุดเทสต์และไปป์ไลน์ CI แบบสถิต และอ่านรายงานจากการรันจริงเมื่อมี มันถ่วงน้ำหนักทุกข้อค้นพบตามระดับหลักฐานและระดับความเชื่อถือ โดยมีเพียงการรันจริงเท่านั้นที่ไปถึง L3 ถึง L5 ได้ แล้วสร้างข้อค้นพบ คะแนนความน่าเชื่อถือ และด่าน CI ที่ใช้รหัสออกซึ่งถูกตรึงไว้ ในลูปของเอเจนต์ AI เขียนการแก้ไข แล้ว Mjölnir สแกนซ้ำเพื่อพิสูจน์" width="880" />
</p>

<sub>จัดทำขึ้นสำหรับหน้านี้และแสดงในขนาด 1:1 สร้างโดย `npm run docs:readme-brand` และถูกล็อกไม่ให้คลาดเคลื่อนใน CI คะแนน จำนวน และ ID ของกฎมาจาก [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) และทะเบียนกฎ ไม่เคยพิมพ์ด้วยมือ ภาพเดียวกันในแบบโปสเตอร์: [`architecture.svg`](assets/readme/architecture.svg)</sub>

<br />

## ดูการทำงานจริง

การสแกนจริงของ [`examples/demo-repo`](examples/demo-repo) ซึ่งเป็นชุดเทสต์ Playwright ขนาดเล็กที่มี CI workflow คะแนนของมันหายไปตรงนี้:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="รายละเอียดการหักคะแนนของ Mjölnir: WORTHINESS 80/100 WORTHY คะแนนแยกตามหมวดหมู่ กล่องการหักคะแนนตามความรุนแรง และรายการ FIX THIS FIRST" width="520" />
</p>

<sub>สร้างโดย `npm run docs:hero` จากการสแกนจริง และถูกล็อกไม่ให้คลาดเคลื่อนใน CI รายงาน `--verbose` ฉบับเต็มของการสแกนเดียวกันคือ [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`)</sub>

<details>
<summary><strong>ดูวิดีโอ</strong> — การสแกน การแก้ไขที่มันพิมพ์ออกมา และการสแกนซ้ำที่พิสูจน์การแก้ไขนั้น</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="เฟรมหนึ่งจากวิดีโอสาธิต: npx mjolnir-qa@latest กำลังสแกนรีโพสาธิตในหน้าต่างเทอร์มินัล" width="900" />
  </a>
</p>

<sub>เรนเดอร์ทีละเฟรมจากการสแกนจริงด้วย `npm run docs:video` ไม่เคยอัดหน้าจอ เลือกเฟรมเพื่อเปิด [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4)</sub>

</details>

### ข้อค้นพบหนึ่งข้อแบบใกล้ชิด

ทุกข้อค้นพบตอบคำถามสี่ข้อ: อยู่ที่ไหน Mjölnir มั่นใจแค่ไหน กฎนี้ผิดบ่อยแค่ไหน และแก้อย่างไร

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="ข้อค้นพบแรกของการสแกนสาธิต ตรงตามที่เทอร์มินัลพิมพ์ออกมา พร้อมทำเครื่องหมายสี่ส่วน: ตำแหน่ง ความมั่นใจ ความถี่ที่กฎผิด และการแก้ไข" width="100%" />
</p>

`mjolnir explain QA-CI-001` พิมพ์ประวัติความน่าเชื่อถือทั้งหมดของกฎ รวมถึงอัตราผลบวกลวงที่วัดได้และระดับที่อัตรานั้นทำให้กฎได้รับ:

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
  - a run report next to the scan target (mjolnir.report.json or test-results/)
  corroborating this file lifts its findings to L3–L5
  - a documented suppression (mjolnir.config.json) lowers the finding count
  without claiming correctness
  - quarantine findings run only under --strict and are advisory (E0) — they can
  never gate CI

NEXT ACTION
  Fix the first occurrence, then re-run: `mjolnir --scope changed`. Every
  occurrence of this rule is listed in the scan output.

HOW TO VERIFY THE FIX
  Re-run `mjolnir` on the changed file(s) — this finding should no longer
  appear. `mjolnir --scope changed` scopes the check to just what you touched.

Docs: mjolnir rules --md   (full catalog, this rule included)
```

นี่คือหน่วยของคุณค่า: จุดหนึ่งที่ CI รายงานว่าผ่านทั้งที่ไม่ได้ผ่านจริง

<br />

## เริ่มต้นอย่างรวดเร็ว

```bash
npx mjolnir-qa@latest
```

มันสแกนไดเรกทอรีปัจจุบันและพิมพ์ Trust Report: สิ่งที่พบ เชื่อถือได้แค่ไหน เพราะอะไร และควรทำอะไรต่อ มันออกด้วยรหัส `0` เมื่อไม่พบสิ่งใดที่ระดับด่านหรือสูงกว่า

ใน CI ให้สแกนเฉพาะสิ่งที่ branch นำเข้ามา เพื่อไม่ให้ชุดเทสต์เก่าท่วม pull request แรกของคุณ:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` เขียนสิ่งนี้เป็น GitHub Actions workflow โดยใช้ [action](https://github.com/Sergey-Bar/Mjolnir#readme) ที่ปักไว้กับแท็กหลัก `v1` (หรือใช้ `npx` ธรรมดาด้วย `--no-action`) มันจะอยู่ในโหมดให้คำแนะนำจนกว่าคุณจะตัดสินใจให้มันบล็อก

| คำสั่ง                              | สิ่งที่ทำ                                                |
| ----------------------------------- | -------------------------------------------------------- |
| `mjolnir`                           | Trust Report: คำตัดสิน ความมั่นใจ ขั้นตอนถัดไป           |
| `mjolnir --scope changed`           | เฉพาะสิ่งที่ branch ของคุณนำเข้ามา (รูปแบบสำหรับ CI)     |
| `mjolnir ci install`                | สร้าง PR workflow แบบให้คำแนะนำ (ใช้ action)             |
| `mjolnir explain QA-CI-001`         | อะไร ทำไม และวิธีแก้ พร้อมอัตรา FP ที่วัดได้             |
| `mjolnir why src/a.spec.ts:42`      | เหตุผลที่บรรทัดนี้ถูกทำเครื่องหมาย ไม่บล็อกเลย           |
| `mjolnir forensics ./test-results/` | หลักฐานรันไทม์จากการรันจริง                              |
| `mjolnir trust-report`              | Trust Artifact แบบครบในตัว (md + json)                   |
| `mjolnir handoff`                   | แผนการแก้ไขสำหรับเอเจนต์เขียนโค้ด                        |
| `mjolnir --json` / `--format sarif` | ผลลัพธ์ที่เครื่องอ่านได้, GitHub Code Scanning           |
| `mjolnir --format codequality`      | รายงาน GitLab Code Quality (อาร์ติแฟกต์สำหรับวิดเจ็ต MR) |
| `mjolnir --strict`                  | รันกฎระดับ quarantine ด้วย (ความเสี่ยง FP สูงกว่า)       |

<details>
<summary><strong>คำสั่งอื่นทั้งหมด</strong> — คัดแยกเทสต์ไม่เสถียร การรายงาน การกำกับดูแล</summary>

<br />

| คำสั่ง                              | สิ่งที่ทำ                                                             |
| ----------------------------------- | --------------------------------------------------------------------- |
| `mjolnir --classic`                 | แบนเนอร์คะแนนแบบก่อนมี Trust Report                                   |
| `mjolnir explain verdict`           | เหตุผลที่คำตัดสินของการสแกนที่บันทึกไว้เป็นเช่นนั้น                   |
| `mjolnir triage ./test-results/`    | การคัดแยกแบบมีขั้นตอน ทุกแถวจบด้วยขั้นตอนถัดไป                        |
| `mjolnir pw-report ./test-results/` | สรุปการรัน Playwright: การรันซ้ำ เทสต์ไม่เสถียร เทสต์ที่ช้าที่สุด     |
| `mjolnir doctor:playwright`         | สแกนเชิงลึกเฉพาะ Playwright พร้อม Selector Health Score               |
| `mjolnir fix --dry-run` / `fix`     | การแก้ไขอัตโนมัติที่ปลอดภัย แต่ละรายการถูกสแกนซ้ำเพื่อพิสูจน์ว่าได้ผล |
| `mjolnir baseline` / `diff`         | บันทึกสแนปช็อตของข้อค้นพบ แล้วรายงานเฉพาะที่ใหม่หรือแย่ลง             |
| `mjolnir impact --since <ref>`      | สิ่งที่คอมมิตหนึ่งนำเข้ามาและแก้ไขไป                                  |
| `mjolnir summary`                   | คำอธิบายประกอบ CI และสรุป step จากรายงาน                              |
| `mjolnir pr-comment`                | คอมเมนต์ PR ที่จำกัดขอบเขต เป็น Markdown                              |
| `mjolnir debt`                      | ทะเบียนหนี้ทางเทสต์พร้อมแบบจำลองต้นทุน                                |
| `mjolnir handover`                  | แผนที่แนะนำชุดเทสต์สำหรับวิศวกร QA คนใหม่                             |
| `mjolnir init`                      | ตรวจหาเฟรมเวิร์กและพิมพ์รายการตรวจสอบการตั้งค่า                       |
| `mjolnir suppressions`              | แสดงรายการข้อค้นพบที่ถูกระงับ เพื่อการกำกับดูแล                       |
| `mjolnir rules --unmeasured`        | กฎที่ทำงานจากการสันนิษฐาน ไม่ใช่จากการวัด                             |
| `mjolnir rules --md`                | แค็ตตาล็อกกฎฉบับเต็ม (JSON หรือ Markdown)                             |
| `mjolnir doctor`                    | การตรวจสอบตัวเองของฐานกฎของ Mjölnir                                   |
| `mjolnir create-rule <ID>`          | สร้างโครงของกฎใหม่และ fixture ของมัน                                  |
| `mjolnir stats`                     | ตัวนับสะสมในเครื่องของการแก้ไขทั้งหมดที่เคยพบ                         |
| `mjolnir badge`                     | JSON สำหรับ endpoint ของ shields.io และโค้ดตัวอย่าง                   |
| `mjolnir --cache`                   | สแกนซ้ำแบบเพิ่มทีละส่วนผ่านแคชคำตัดสินในเครื่อง                       |
| `mjolnir --format mermaid`          | แผนภาพสถาปัตยกรรมเทสต์สำหรับคอมเมนต์ PR                               |

`mjolnir help <command>` พิมพ์วิธีใช้ ตัวอย่าง และขั้นตอนถัดไปของทุกคำสั่ง

</details>

ต้องใช้ **Node.js ≥ 22.18** บน Windows, macOS หรือ Linux อยากติดตั้งแบบ global หรือไม่? `npm i -g mjolnir-qa` เวอร์ชันขั้นต่ำนี้มาจากชุดเครื่องมือ build (tsdown กำหนดเป้าหมายไว้ที่เวอร์ชันนี้ และไปป์ไลน์รีลีสทำ smoke test กับเวอร์ชันนี้) dependency ตอนรันไม่ต้องการมากกว่านั้น

<br />

## สิ่งที่ Mjölnir ตรวจพบ

<p align="center">
  <img src="assets/readme/stack.svg" alt="ใช้งานได้กับสแตกของคุณ: ภาษา เฟรมเวิร์กเทสต์ และระบบ CI ที่กฎครอบคลุม จากทะเบียนกฎ" width="100%" />
</p>

**79 กฎ** ในสี่ตระกูล ได้แก่ สุขอนามัยของเทสต์ คุณภาพของเทสต์ Playwright และความสมบูรณ์ของ CI ครอบคลุม TypeScript และ JavaScript, Python, Java, C# และ YAML ของ GitHub Actions รองรับ Playwright ครบทั้งสี่ binding รวมถึง pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest และ Mocha พร้อมการรองรับเบื้องต้นสำหรับ Cypress และ Selenium นี่คือเก้ากฎเพื่อให้เห็นภาพ:

| ID           | กฎ                                                                  | ความรุนแรง | ระดับ      |
| ------------ | ------------------------------------------------------------------- | ---------- | ---------- |
| QA-CI-001    | `continue-on-error` ปิดบังด่านตรวจสอบที่ล้มเหลว                     | error      | quarantine |
| QA-CI-009    | รหัสออกของเทสต์ไม่ถูกส่งต่อ (`\|` โดยไม่มี pipefail, สายคำสั่ง `;`) | error      | extended   |
| QA-TEST-001  | คอมมิตเทสต์ที่โฟกัสไว้ (`.only`, `fit`)                             | error      | quarantine |
| QA-TEST-003  | เทสต์ที่ไม่มี assertion                                             | error      | quarantine |
| QA-TQUAL-009 | assertion ของ promise ที่ไม่ได้ await                               | error      | quarantine |
| QA-PW-002    | assertion ของ locator ที่ไม่ได้ await                               | error      | core       |
| QA-PW-004    | selector CSS/XPath ที่เปราะบาง                                      | warning    | quarantine |
| QA-PY-002    | เทสต์ที่ถูกข้าม (`skip`, `xfail` ที่ไม่เข้มงวด)                     | warning    | core       |
| QA-CS-103    | เมธอดเทสต์ที่ไม่มี assertion                                        | error      | core       |

แค็ตตาล็อกฉบับเต็มสร้างจากทะเบียน ไม่เคยดูแลด้วยมือ: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) หรือ [คู่มือสิ่งที่ตรวจสอบ](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks)

<details>
<summary><strong>ทุกกฎที่กล่าวถึงใน README นี้</strong> ในตารางเดียว</summary>

<br />

> กฎ `quarantine` รันเฉพาะภายใต้ `--strict` และไม่บล็อกเลย (ถูกจำกัดไว้ที่ info) ความรุนแรงที่แสดงคือค่าที่ผู้เขียนกำหนด

| ID           | ตระกูล     | กฎ                                                               | ความรุนแรง | ระดับ      |
| ------------ | ---------- | ---------------------------------------------------------------- | ---------- | ---------- |
| QA-TEST-001  | สุขอนามัย  | คอมมิตเทสต์ที่โฟกัสไว้ (`.only`, `fit`)                          | error      | quarantine |
| QA-TEST-002  | สุขอนามัย  | เทสต์ที่ถูกข้าม จะยกระดับเป็น `error` หากไม่มีเหตุผลที่ติดตามได้ | warning    | quarantine |
| QA-TEST-003  | สุขอนามัย  | เทสต์ที่ไม่มี assertion                                          | error      | quarantine |
| QA-TEST-004  | สุขอนามัย  | sleep แบบตายตัว (`waitForTimeout`, `sleep()`, `delay()`)         | warning    | extended   |
| QA-TEST-006  | สุขอนามัย  | การใช้การรันซ้ำอย่างผิดวิธีเพื่อซ่อนความไม่เสถียร                | warning    | quarantine |
| QA-TEST-010  | สุขอนามัย  | เนื้อหาเทสต์ว่างเปล่า                                            | error      | quarantine |
| QA-TQUAL-002 | คุณภาพ     | assertion ที่เป็นจริงเสมอ                                        | error      | quarantine |
| QA-TQUAL-009 | คุณภาพ     | assertion ของ promise ที่ไม่ได้ await                            | error      | quarantine |
| QA-TQUAL-011 | คุณภาพ     | เทสต์ที่ถูกคอมเมนต์ทิ้งไว้                                       | warning    | extended   |
| QA-PW-002    | Playwright | assertion ของ locator ที่ไม่ได้ await                            | error      | core       |
| QA-PW-003    | Playwright | คอมมิต `page.pause()` / `test.only()` ไว้                        | error      | core       |
| QA-PW-004    | Playwright | selector CSS/XPath ที่เปราะบาง                                   | warning    | quarantine |
| QA-PW-123    | Playwright | URL ของสภาพแวดล้อมที่ฝังไว้ในโค้ด                                | warning    | quarantine |
| QA-PW-140    | Playwright | ภาพหน้าจอที่ไม่มี `maxDiffPixelRatio`                            | warning    | core       |
| QA-CI-001    | CI         | `continue-on-error` ปิดบังด่านที่ล้มเหลว                         | error      | quarantine |
| QA-CI-002    | CI         | `\|\| true` กลืนรหัสออก                                          | error      | extended   |
| QA-CI-005    | CI         | รายงานถูกใช้แต่ไม่เคยถูกสร้าง                                    | error      | quarantine |
| QA-CI-007    | CI         | ตัวครอบการรันซ้ำรอบเทสต์                                         | warning    | extended   |
| QA-CI-008    | CI         | step ที่สำเร็จเสมอปิดบังความล้มเหลว                              | error      | quarantine |
| QA-CI-009    | CI         | รหัสออกไม่ถูกส่งต่อ (`\|` โดยไม่มี pipefail, สายคำสั่ง `;`)      | error      | extended   |
| QA-CI-010    | CI         | เทสต์ถูกข้ามในจุดที่ต้องบล็อก                                    | error      | quarantine |
| QA-PY-002    | Python     | เทสต์ที่ถูกข้าม (`skip`, `xfail` ที่ไม่เข้มงวด)                  | warning    | core       |
| QA-PY-003    | Python     | ฟังก์ชันเทสต์ที่ไม่มี assertion                                  | error      | quarantine |
| QA-PY-005    | Python     | `time.sleep()` ในเทสต์                                           | warning    | extended   |
| QA-PY-012    | Python     | assertion ที่เป็นจริงเสมอ                                        | error      | quarantine |
| QA-JV-101    | Java       | เทสต์ที่ถูกปิดใช้งาน (`@Disabled`)                               | warning    | core       |
| QA-JV-102    | Java       | sleep แบบตายตัว (`Thread.sleep()`)                               | warning    | extended   |
| QA-JV-103    | Java       | เมธอดเทสต์ที่ไม่มี assertion                                     | error      | extended   |
| QA-JV-105    | Java       | sleep แบบตายตัวด้วย `waitForTimeout()` ของ Playwright            | warning    | core       |
| QA-JV-106    | Java       | selector ที่เปราะบางแทน locator ตามบทบาท                         | warning    | quarantine |
| QA-CS-101    | C#         | เทสต์ที่ถูกข้าม (`[Ignore]`, `[Fact(Skip=)]`)                    | warning    | core       |
| QA-CS-102    | C#         | sleep แบบตายตัว (`Thread.Sleep` / `Task.Delay`)                  | warning    | core       |
| QA-CS-103    | C#         | เมธอดเทสต์ที่ไม่มี assertion                                     | error      | core       |
| QA-CS-105    | C#         | sleep แบบตายตัวด้วย `WaitForTimeoutAsync()`                      | warning    | extended   |
| QA-CS-106    | C#         | selector ที่เปราะบางแทน locator ตามบทบาท                         | warning    | quarantine |

Python ยังมี QA-PY-001…012 (สุขอนามัยของ pytest) และ QA-PY-101…108 (Playwright สำหรับ Python) Cypress และ Selenium มีชุดเริ่มต้นอย่างละสามกฎ

</details>

ทุกกฎมาพร้อม fixture แบบ must-fire **และ** must-not-fire และกฎที่ทำงานกับ fixture เชิงลบของตัวเองจะไม่สามารถปล่อยได้ นี่คือไฟร์วอลล์กันผลบวกลวง `mjolnir doctor` บังคับใช้สิ่งนี้ใน CI ของรีโพนี้เอง

### Selector Health Score

`mjolnir doctor:playwright` ให้คะแนน locator แต่ละตัวตามวิธีที่มันหาองค์ประกอบ: แบบที่ผู้ใช้หา (บทบาท ป้ายกำกับ ข้อความ) ผ่านสัญญาที่ชัดเจน (`data-testid`) หรือด้วยความบังเอิญเชิงโครงสร้าง (สาย CSS, XPath) แต่ละไฟล์ได้คะแนนตั้งแต่ 0 ถึง 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

สิ่งนี้วัด **ความทนทาน ไม่ใช่ความถูกต้อง** `.btn.btn-primary > div:nth-child(2)` ผ่านในวันนี้ และจะผ่านต่อไปจนกว่าจะมีคนแตะ markup คะแนนต่ำไม่เคยอ้างว่าเทสต์พัง เพียงบอกว่ามันพึ่งพา markup ที่ไม่มีใครสัญญาว่าจะคงไว้

<br />

## คะแนนความน่าเชื่อถือ

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="สเกลความน่าเชื่อถือจาก 0 ถึง 100 พร้อมตัวชี้ที่กวาดผ่านทุกคะแนน: UNWORTHY ต่ำกว่า 50, NEEDS WORK ตั้งแต่ 50 ถึง 79, WORTHY ตั้งแต่ 80 ถึง 99, FORGED ที่ 100" width="720" />
</p>

<sub>ทุกคะแนนตั้งแต่ 0 ถึง 100 วางตำแหน่งโดย `deriveScoreState` ตัวจริง สร้างโดย `npm run docs:gauge` และถูกล็อกไม่ให้คลาดเคลื่อนใน CI</sub>

| คะแนน     | คำตัดสิน                         |
| --------- | -------------------------------- |
| `0 – 49`  | **UNWORTHY**                     |
| `50 – 79` | **NEEDS WORK**                   |
| `80 – 99` | **WORTHY**                       |
| `100`     | **FORGED**                       |
| `null`    | **UNKNOWN**: ไม่พบการประกาศเทสต์ |

**วิธีคำนวณ** ความรุนแรงกำหนดการหักคะแนนพื้นฐาน (`error −8`, `warning −3`, `info −1`) และระดับหลักฐานจะลดทอนมันลง: E2 หักเต็ม E1 หักครึ่ง (ปัดลง) E0 ไม่หักเลย ผลรวมถูกปรับให้เป็นมาตรฐานตามขนาดของชุดเทสต์ คือหักต่อการประกาศเทสต์แต่ละรายการ ไม่ใช่ต่อไฟล์ เทอร์มินัลพิมพ์ตัวเลขที่ลดทอนแล้วชุดเดียวกับที่คะแนนใช้ ไม่มีแบบจำลองที่สองซ่อนอยู่ รายละเอียด: [docs/SCORING.md](docs/SCORING.md) และ [คู่มือการให้คะแนน](https://sergey-bar.github.io/Mjolnir/guide/scoring)

**สิ่งที่ 100 ไม่ได้หมายถึง** ไม่ได้หมายความว่าซอฟต์แวร์ถูกต้อง ชุดเทสต์เพียงพอ หรือผลิตภัณฑ์ไม่มีข้อบกพร่อง มันหมายถึงเพียงสิ่งเดียว: **ไม่มีกฎใดที่ Mjölnir ประเมินทำให้เกิดการหักคะแนนภายใต้การสแกนนี้และแบบจำลองหลักฐานนี้**

<br />

## แบบจำลองหลักฐาน

ทุกข้อค้นพบมีป้ายกำกับสองอย่าง: Mjölnir มั่นใจแค่ไหน และข้อค้นพบถูกตรวจสอบไปไกลแค่ไหน นี่คือความต่างระหว่างเครื่องมือที่รายงานรูปแบบ กับเครื่องมือที่คุณใช้เป็นด่านก่อนปล่อยรีลีสได้

**มั่นใจแค่ไหน — ระดับหลักฐาน**

| ระดับ  | ชื่อ                     | ความหมาย                                     | การหักคะแนน |
| ------ | ------------------------ | -------------------------------------------- | ----------- |
| **E2** | การพิสูจน์แบบกำหนดแน่นอน | ข้อบกพร่องมีอยู่ในโค้ดตามที่เขียนไว้         | เต็ม        |
| **E1** | หลักฐานจากรูปแบบ         | รูปแบบที่ผูกกับข้อบกพร่องอย่างแน่นแฟ้นตรงกัน | ครึ่ง       |
| **E0** | ข้อสังเกต                | ควรรู้ไว้ ไม่ใช่การอ้างว่ามีอะไรผิด          | ศูนย์       |

ความมั่นใจในการตรวจจับไม่ใช่ความแข็งแรงของการพิสูจน์ กฎหนึ่งอาจมั่นใจว่าตรงกับสิ่งที่มองหา แต่ก็ยังอาจกำลังมองฮิวริสติกอยู่ ข้อค้นพบ E1 มีไว้ให้อ่านและใช้วิจารณญาณ ไม่ใช่นำไปใช้อย่างไม่ไตร่ตรอง และขอบเขตนี้ถูกประทับไว้บนข้อค้นพบในเทอร์มินัล ใน JSON และในการส่งต่อให้เอเจนต์

**ตรวจสอบไปไกลแค่ไหน — ระดับความเชื่อถือ** ข้อค้นพบส่วนใหญ่มาจากการอ่านโค้ดของคุณ ให้รายงานจากการรันเทสต์จริงแก่ Mjölnir แล้วมันจะยืนยันได้ว่าโค้ดถูกรันจริง

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="บันไดความเชื่อถือจาก L0 ถึง L5 L0 ถึง L2 มาจากการอ่านโค้ด L3 ถึง L5 ต้องใช้รายงานการรันจริง ซึ่งแสดงด้วยรอยขาดบนบันได" width="100%" />
</p>

| ระดับ  | พูดง่าย ๆ         | สิ่งที่ต้องมี                                |
| ------ | ----------------- | -------------------------------------------- |
| **L0** | บันทึกไว้         | อ่านโค้ด                                     |
| **L1** | ดูเหมือนเป็นปัญหา | อ่านโค้ด: รูปแบบตรงกัน                       |
| **L2** | พิสูจน์แล้วในโค้ด | อ่านโค้ด: ข้อบกพร่องเป็นเชิงโครงสร้าง        |
| **L3** | ไฟล์ถูกรัน        | รายงานการรันแสดงว่าไฟล์ของข้อค้นพบถูกรัน     |
| **L4** | เทสต์ถูกรัน       | รายงานการรันแสดงว่าเทสต์ของข้อค้นพบถูกรัน    |
| **L5** | การรันยืนยัน      | ผลลัพธ์ของการรันเองยืนยันประเภทของข้อบกพร่อง |

การสแกนแบบสถิตหยุดที่ L2 มีเพียงรายงานการรันจริง (Playwright JSON, Jest หรือ Vitest JSON, JUnit XML) เท่านั้นที่ยกข้อค้นพบขึ้นไปถึง L3 หรือสูงกว่าได้ ดังนั้นข้อค้นพบที่ไม่เคยถูกเห็นว่ารันจริงจะอ้างไม่ได้เลยว่ามันถูกรัน นิยาม: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)

### มีการวัดไปมากแค่ไหน

**74 จาก 79 กฎมีอัตราผลบวกลวงที่วัดกับโค้ด OSS จริง** (อย่างน้อย 10 ข้อค้นพบที่จัดประเภทด้วยมือต่อกฎ ดู [docs/FP-AUDIT.md](docs/FP-AUDIT.md)) อีก 5 กฎปล่อยออกมาด้วยค่าประมาณของผู้เขียนและบอกไว้ชัดเจนทีละกฎใน `mjolnir explain` `mjolnir rules --unmeasured` แสดงรายการกฎเหล่านั้น และท้ายการสแกนทุกครั้งจะรายงานว่ามีกฎกี่ข้อในบรรดาที่ _ทำงานจริง_ ที่ผ่านการวัดแล้ว

อัตราต่าง ๆ ยังคงเปิดเผยแม้จะแย่ QA-TEST-001 (`.only` ที่ถูกคอมมิต) ได้ผลตรวจสอบไม่ดีบนรีโพจริงจึงถูกจัดไว้ใน quarantine ตัวเลขล่าสุดของทุกกฎ รวมถึง QA-PW-141 อยู่ในผลการตรวจสอบ

### ระดับความเชื่อถือของกฎ

ระดับเป็นไปตามอัตราผลบวกลวงที่วัดได้ ไม่ใช่ความเห็น:

| ระดับ          | FP ที่วัดได้                   | พฤติกรรม                                      |
| -------------- | ------------------------------ | --------------------------------------------- |
| **core**       | ≤ 10%                          | รายงานค่าเริ่มต้น บล็อกได้                    |
| **extended**   | ≤ 30%                          | รายงานค่าเริ่มต้น ความมั่นใจต่ำกว่า           |
| **quarantine** | > 30% หรือประกาศไว้อย่างชัดเจน | เฉพาะ `--strict` จำกัดไว้ที่ info ไม่บล็อกเลย |
| _ยังไม่ได้วัด_ | n < 10                         | เลื่อนขึ้นเป็น core ไม่ได้จนกว่าจะวัด         |

ช่วง FP สามารถลดระดับ tier ได้เท่านั้น — จะไม่เลื่อนระดับกฎออกจาก `quarantine` หากกฎนั้นถูกประกาศไว้ที่นั่นอย่างชัดเจน กฎที่ถูก quarantined อย่างชัดเจนจะยังคงอยู่ใน quarantine โดยไม่คำนึงถึงอัตรา FP ที่วัดได้

การเลื่อนระดับ การลดระดับ และความพร้อมรายภาษา: [วงจรชีวิตของกฎ](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle)

### ทำไมนี่จึงไม่ใช่ linter

Linter บอกคุณว่าโค้ดทำตามกฎหรือไม่ Mjölnir บอกคุณว่าการตรวจสอบของคุณเชื่อถือได้หรือไม่

|                                                               | Linter (ESLint, SonarQube) | เครื่องมือวัด coverage | รีวิวโค้ดด้วย AI |      **Mjölnir**      |
| ------------------------------------------------------------- | :------------------------: | :--------------------: | :--------------: | :-------------------: |
| ให้คะแนน **ระบบการตรวจสอบ** ไม่ใช่โค้ดผลิตภัณฑ์               |            ไม่             |          ไม่           |       ไม่        |          ใช่          |
| ความสมบูรณ์ของ CI workflow (`continue-on-error`, `\|\| true`) |            ไม่             |          ไม่           |    เฉพาะ diff    |          ใช่          |
| ให้คะแนนความทนทานของ locator ใน Playwright (Selector Health)  |            ไม่             |          ไม่           |       ไม่        |          ใช่          |
| อ่านข้อมูลการรันจริงเพื่อตัดสิน `TRUE-FLAKE`                  |            ไม่             |          ไม่           |       ไม่        |          ใช่          |
| เผยแพร่อัตราผลบวกลวงที่วัดได้ของแต่ละกฎ                       |            ไม่             |          ไม่           |       ไม่        |          ใช่          |
| ทำเครื่องหมายเทสต์ที่ไม่มี assertion                          |           ใช่\*            |          ไม่           |     บางครั้ง     |          ใช่          |
| จับ sleep แบบตายตัว (`waitForTimeout`, `time.sleep`)          |           ใช่\*            |          ไม่           |     บางครั้ง     |          ใช่          |
| กำหนดแน่นอน (อินพุตเดียวกัน เอาต์พุตเดียวกัน)                 |            ใช่             |          ใช่           |       ไม่        |          ใช่          |
| ต้นทุนต่อการสแกน                                              |            ฟรี             |          ฟรี           |      โทเค็น      | **ศูนย์** (ในเครื่อง) |

<sub>\*ครอบคลุมโดย `eslint-plugin-jest` และ `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) และโดยกฎ assertion ของ SonarQube เอง คอลัมน์ต่าง ๆ อธิบายพฤติกรรมเริ่มต้นสำหรับการตรวจสอบชุดเทสต์ ปลั๊กอิน แพ็กเกจแบบเสียเงิน และกฎที่กำหนดเองจะเปลี่ยนบางคำตอบ นี่เป็นบทสรุปการวางตำแหน่ง ไม่ใช่ benchmark</sub>

ใช้การรีวิวด้วย AI ด้วย มันจับรายละเอียดปลีกย่อย เจตนา และข้อบกพร่องด้านการออกแบบที่ไม่มีรูปแบบใดหาเจอ ส่วน Mjölnir จับสิ่งที่การรีวิวด้วย AI มองข้ามเพราะดูเหมือนตั้งใจ: `.only` ที่ถูกคอมมิต รหัสออกที่ถูกกลืน `continue-on-error` บน job เทสต์ สิ่งเหล่านี้ต้องการการสแกน ไม่ใช่การใช้เหตุผล

<br />

## นิติวิเคราะห์ขณะรัน

การวิเคราะห์แบบสถิตให้เหตุผลเกี่ยวกับโค้ดที่ไม่เคยรัน นิติวิเคราะห์อ่านสิ่งที่เกิดขึ้นจริง: Playwright JSON, Jest JSON, Vitest JSON และ JUnit XML จาก runner ใดก็ได้

```bash
mjolnir forensics ./test-results/
```

```text
  ▍ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

`TRUE-FLAKE` ไม่ได้หมายความว่าเทสต์ถูกรันซ้ำ แต่หมายความว่าเทสต์ **ล้มเหลวอย่างน้อยหนึ่งครั้งแล้วจบลงเป็นสีเขียว** คือการผ่านแบบฟลุก ซึ่งจะถูกทำเครื่องหมายไม่ว่าเครื่องหมายถูกสุดท้ายจะบอกอะไร `mjolnir triage` เปลี่ยนประวัตินั้นเป็นข้อเสนอให้กักกัน และ `mjolnir pw-report` สรุปการรัน รายงานการรันชุดเดียวกันนี้คือสิ่งที่ยกข้อค้นพบขึ้นสู่ระดับความเชื่อถือ L3 ขึ้นไป

<br />

## ความสมบูรณ์ของ CI

เทสต์หนึ่งอาจผ่าน ขณะที่ไปป์ไลน์รอบตัวมันไม่มีทางล้มเหลวได้ Mjölnir อ่าน workflow ด้วย: `continue-on-error`, `|| true` รหัสออกที่ไม่เคยถูกส่งต่อ step ที่สำเร็จเสมอ รายงานที่ถูกใช้แต่ไม่เคยถูกสร้าง และด่านที่ถูกข้ามในเหตุการณ์ที่ควรบล็อก แต่ละข้อค้นพบระบุ job, step และบรรทัด พร้อมระดับหลักฐานของตัวเอง

สร้าง PR workflow ซึ่งเป็นแบบให้คำแนะนำโดยค่าเริ่มต้น:

```bash
mjolnir ci install
```

หรือเพิ่ม action จาก Marketplace ลงใน workflow ที่คุณมีอยู่แล้ว:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

ปัก `@v1` เพื่อติดตามสายเวอร์ชันหลัก หรือปักแท็กที่แน่นอน (`@v0.5.32`) เพื่อด่านที่ทำซ้ำได้ [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) ครอบคลุม Marketplace, Smithery และทะเบียน MCP

หากต้องการส่งข้อค้นพบเข้า GitHub Code Scanning ให้อัปโหลด SARIF (ต้องมี `security-events: write` ที่ระดับ workflow หรือ job):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

บน GitLab `--format codequality` เขียนรายงาน Code Quality ที่วิดเจ็ต MR และคำอธิบายประกอบ diff อ่าน ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)) การตั้งค่าเอดิเตอร์และไปป์ไลน์: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)

### การระบุที่มาในขอบเขตที่เปลี่ยนแปลง

```bash
npx mjolnir-qa@latest --scope changed
```

ข้อค้นพบถูกระบุไปยังบรรทัดที่ branch ของคุณเพิ่มเข้ามา โดยวัดเทียบกับ **merge-base** ขอบเขตคือชุดไฟล์เดียวกับที่การสแกนเต็มค้นพบ (spec ของ TS/JS และการตั้งค่า adapter, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`) รวมกับการเปลี่ยนแปลงที่ยังไม่คอมมิตและที่ไม่ได้ติดตาม จึงใช้ได้ตั้งแต่ก่อนคอมมิต ฐานถูกหาตามลำดับ `main → master → origin/main → origin/master → origin/HEAD` และแทนที่ได้ด้วย `--base <ref>`

เมื่อหา merge-base ไม่ได้ (shallow clone, detached HEAD, เป้าหมายอยู่นอก git) ข้อค้นพบจะถอยกลับไปใช้การระบุที่มาทั้งไฟล์ **และรายงานจะบอกไว้** การถอยกลับแบบเงียบ ๆ ก็คือข้อบกพร่องประเภทเดียวกับที่เครื่องมือนี้มีไว้จับ

<br />

## เอเจนต์ AI

ข้อค้นพบจะมีค่าก็ต่อเมื่อมีสิ่งใดลงมือทำตามมัน

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI เขียนการแก้ไข Mjölnir ตรวจสอบมัน** ข้อพิสูจน์มาจากการสแกนซ้ำ ไม่ใช่จากรายงานความสำเร็จของเอเจนต์เอง

| คำสั่ง            | สิ่งที่เอเจนต์ได้รับ                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | เซิร์ฟเวอร์ [MCP](https://modelcontextprotocol.io) ผ่าน stdio `scan`, `explain` และ `diff` กลายเป็นเครื่องมือที่เรียกใช้ได้                          |
| `mjolnir handoff` | รายงาน `--json` ที่บันทึกไว้กลายเป็นแผน Markdown แบบกำหนดแน่นอน: สิ่งที่ตรวจพบ ขอบเขตหลักฐานของแต่ละข้อค้นพบ สิ่งที่ **ห้าม** เปลี่ยน และวิธีตรวจสอบ |
| `mjolnir install` | เขียนลงในพื้นที่สำหรับเอเจนต์ที่รีโพของคุณมีอยู่แล้ว (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) เพื่อให้เอเจนต์สแกนซ้ำก่อนจะบอกว่าทำเสร็จแล้ว   |

เพิ่มลงในไคลเอนต์ที่มี CLI ของตัวเอง:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

หรือในไคลเอนต์ใดก็ได้ที่รับบล็อก `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**ราวกันตกสำคัญกว่าความสะดวก** ทุกข้อค้นพบในการส่งต่อมีขอบเขตของตัวเอง **E2** บอกว่า _กำหนดแน่นอน: ตรวจสอบตำแหน่งแล้วใช้การแก้ไข_ **E1** บอกว่า _ต้องยืนยัน: ข้อสังเกตเพียงอย่างเดียวไม่ได้พิสูจน์ข้อบกพร่อง_ เอเจนต์ที่แก้ E1 อย่างไม่ไตร่ตรอง ระงับกฎ หรือแก้ไขกฎเพื่อดันคะแนน กำลังทำสิ่งที่เครื่องมือนี้มีไว้จับพอดี ดังนั้นการส่งต่อจึงบอกไว้ใน prompt ข้างข้อค้นพบนั้นเลย

<br />

## ความเชื่อถือและความปลอดภัย

**ในเครื่องเป็นหลัก ไม่มีการเก็บข้อมูลการใช้งาน** ไม่มี API ที่เชื่อมต่อเครือข่ายได้ (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) อยู่ที่ใดใน `src/` และ [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) จะทำให้ build ล้มเหลวหากมีสักตัวปรากฏขึ้น มันยังห้าม `eval` และ `new Function` ด้วย การสแกนโค้ดที่ไม่น่าเชื่อถือจะไม่รันโค้ดนั้นเลย: การวิเคราะห์แบบสถิตอ่านข้อความซอร์ส และนิติวิเคราะห์แยกวิเคราะห์ไฟล์รายงานที่มีอยู่บนดิสก์แล้ว

ข้อควรทราบสองข้อ: `npx` เองดาวน์โหลดแพ็กเกจก่อนที่อะไรจะรัน และการรับประกันนี้ครอบคลุม `src/` ไม่รวมปลั๊กอินจากบุคคลที่สาม

**ปลั๊กอินไม่ได้รันใน sandbox** ปลั๊กอิน JS (`mjolnir-rules/*.mjs` หรือแพ็กเกจ npm ที่ระบุไว้ใต้ `"plugins"`) รันด้วยสิทธิ์ Node เต็มรูปแบบ ซึ่งเป็นแบบจำลองความเชื่อถือเดียวกับปลั๊กอินของ ESLint หรือ Vitest การโหลดปลั๊กอินต้องเลือกเปิดเอง **ในทุกการสแกน**: หากไม่มี `--enable-plugins` (หรือ `MJOLNIR_ENABLE_PLUGINS=1`) ซอร์สของปลั๊กอินจะไม่ถูกโหลดเลย และประกาศบน stderr จะแสดงรายการสิ่งที่ถูกข้าม manifest ของกฎที่เป็น JSON ไม่รันโค้ดใด ๆ และคำนำหน้า ID ของกฎ core ถูกสงวนไว้ เพื่อไม่ให้ปลั๊กอินปลอมตัวเป็นกฎเหล่านั้นได้ รายงานช่องโหว่ผ่าน [SECURITY.md](SECURITY.md)

**มันรันกับตัวเอง** เอนจินความเชื่อถือในการตรวจสอบจะไม่มีความน่าเชื่อถือเลย หากตัวมันเองตรวจสอบไม่ได้ ทุกการรัน CI สแกนรีโพนี้ด้วย build ที่การรันเดียวกันนั้นสร้างขึ้น ด่านจะล้มเหลวเมื่อพบข้อค้นพบระดับ error ใด ๆ และเมื่อการสแกนเป็นแบบ **บางส่วน** หรือมี **กฎที่พัง** เพราะการสแกนตัวเองที่ถูกตัดจบและไม่รายงานอะไรเลย ก็คือสีเขียวปลอมที่โปรเจกต์นี้มีไว้จับ `mjolnir doctor` ตรวจสอบฐานกฎซ้ำในการรันเดียวกัน (ไฟร์วอลล์ fixture ความซื่อตรงของระดับ เพดานของระดับ core) และการตรวจที่ได้ผล INCONCLUSIVE จะล้มเหลวเหมือนกับการตรวจที่ล้มเหลวทุกประการ รายงานทั้งสองถูกอัปโหลดเป็นอาร์ติแฟกต์ของ build

### รหัสออกและสัญญาสำหรับเครื่อง

ถูกตรึงไว้ คุณจึงสร้างตรรกะ CI บนมันได้:

| รหัสออก | ความหมาย                                                 |
| ------- | -------------------------------------------------------- |
| `0`     | สะอาด: ไม่มีข้อค้นพบที่ระดับด่านหรือสูงกว่า              |
| `1`     | มีข้อค้นพบที่ระดับด่านหรือสูงกว่า                        |
| `2`     | การสแกนบางส่วน (หมดงบเวลา ไฟล์ที่อ่านไม่ได้) ไม่บล็อกเลย |
| `10`    | ข้อผิดพลาดในการใช้งาน (แฟล็กผิด ไม่ได้ระบุเป้าหมาย)      |
| `20`    | ข้อผิดพลาดภายใน                                          |

`2` ถูกแยกจาก `0` โดยเจตนา: การสแกนที่ยังไม่เสร็จไม่ได้ "ไม่พบอะไรเลย" มันแค่ยังค้นหาไม่เสร็จ

ทุกสิ่งที่เครื่องใช้ (ผลลัพธ์จากเครื่องมือ MCP, `--json`, SARIF 2.1) มาจากผลลัพธ์มาตรฐานเดียวภายใต้ schema ที่มีเวอร์ชันและ **ขยายได้ด้วยการเพิ่มเท่านั้น** (`schemaVersion: 1`, `contractVersion: 1`) จึงไม่มีผู้ใช้รายใดต้องสร้างความหมายขึ้นใหม่จากข้อความที่เรนเดอร์แล้ว ดู [สัญญาสำหรับเครื่อง](docs/machine-contract.md) ID ของกฎ (`QA-<FAMILY>-NNN`) เปลี่ยนไม่ได้เมื่อปล่อยแล้วและไม่ถูกนำกลับมาใช้ซ้ำ

<br />

## สิ่งที่ Mjölnir บอกคุณไม่ได้

- **มันไม่รันเทสต์ของคุณ** การสแกนที่สะอาดไม่ใช่ชุดเทสต์ที่ผ่าน
- **มันบอกไม่ได้ว่า assertion _ผิด_** `expect(total).toBe(41)` ดูปกติดี Mjölnir หาเทสต์ที่ _ล้มเหลวไม่ได้_ และไปป์ไลน์ที่ _เป็นสีแดงไม่ได้_ ไม่ใช่เทสต์ที่ตรวจสอบผิดเรื่อง
- **มันไม่ได้พิสูจน์ความถูกต้องทางธุรกิจ** ไม่มีสิ่งใดในที่นี้บอกว่าผลิตภัณฑ์ของคุณทำตามที่ข้อกำหนดต้องการ
- **100 ไม่ใช่ข้อพิสูจน์ว่าชุดเทสต์ดี** ชุดเทสต์ของคุณครอบคลุมความเสี่ยงจริงหรือไม่เป็นอีกคำถามหนึ่ง และเครื่องมือนี้ไม่ได้ตอบคำถามนั้น
- **5 จาก 79 กฎปล่อยออกมาด้วยค่าประมาณ** ไม่ใช่อัตราที่วัดได้ แต่ละกฎบอกไว้บนข้อค้นพบของตัวเอง
- **E1 ไม่ใช่ E2** ข้อค้นพบเชิงฮิวริสติกควรค่าแก่การอ่าน ไม่ใช่นำไปใช้อย่างไม่ไตร่ตรอง
- **รีโพว่างได้คะแนน `null` ไม่มีวันได้ 100**
- **ไฟล์ชื่อ `*.spec.ts` ที่ไม่มีการประกาศเทสต์ไม่นับเป็น coverage** รีโพที่ไฟล์ spec มีเพียง import หรือ type (ไม่มีการเรียก `it`/`test` เลย) ได้คะแนน `null` ไม่ใช่ 100

<br />

## เอกสารประกอบ

เว็บไซต์เอกสารฉบับเต็มอยู่ที่ <https://sergey-bar.github.io/Mjolnir/>

| เอกสาร                                                 | เนื้อหา                                            |
| ------------------------------------------------------ | -------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | การปรับคะแนนให้เป็นมาตรฐานและการถ่วงน้ำหนักหลักฐาน |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | คำศัพท์มาตรฐาน: หนึ่งคำต่อหนึ่งแนวคิด              |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | อัตราผลบวกลวงที่วัดได้และวิธีการ                   |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | สถานะของกฎ ระดับ การระงับ การเลิกใช้               |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | นโยบาย semver อินเทอร์เฟซที่ถูกตรึง รอบการเลิกใช้  |
| [docs/machine-contract.md](docs/machine-contract.md)   | ผลลัพธ์มาตรฐานที่เครื่องอ่านได้                    |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | เอาต์พุต SARIF และการตั้งค่าเอดิเตอร์หรือ CI       |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: รายงาน Code Quality สูตรสำหรับ MR ด่าน     |
| [docs/rules/](docs/rules/)                             | แค็ตตาล็อกรายกฎที่สร้างอัตโนมัติ                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | การตั้งค่าสำหรับพัฒนาและขั้นตอนการมีส่วนร่วม       |
| [SUPPORT.md](SUPPORT.md)                               | ที่สำหรับถาม รายงาน และขอความช่วยเหลือ             |
| [SECURITY.md](SECURITY.md)                             | การรายงานช่องโหว่                                  |
| [CHANGELOG.md](CHANGELOG.md)                           | ประวัติการออกรุ่น                                  |

### สถานะ

**เวอร์ชัน 1** schema ของ JSON และรหัสออกเป็นสัญญาที่ถูกตรึงไว้ TypeScript และ Python มีการครอบคลุมที่วัดได้กว้างที่สุด Java และ C# ใหม่กว่า ให้อ่านผ่าน [ตารางความพร้อม](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle) สิ่งที่จะมาต่อไป โดยไม่มีวันที่ที่แต่งขึ้น: [แผนงานสาธารณะ](https://sergey-bar.github.io/Mjolnir/reference/roadmap)

### การมีส่วนร่วม

กฎใหม่คือการมีส่วนร่วมครั้งแรกที่ง่ายที่สุด คำสั่งเดียวสร้างโครงของกฎพร้อม fixture แบบ must-fire **และ** must-not-fire กฎที่สร้างขึ้นจะล้มเหลวกับ fixture ของตัวเองโดยเจตนาจนกว่าจะมีการเขียนการตรวจจับจริง เพราะโครงเปล่าที่ถูกปล่อยออกไปคือกฎที่ไม่มีใครวัด:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

การตั้งค่าสำหรับพัฒนา คำสั่งด่านถาวร และกฎ anti-creep กับไฟร์วอลล์ fixture อยู่ใน [CONTRIBUTING.md](CONTRIBUTING.md)

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="ลองรันกับรีโพของคุณ" width="100%" />

```bash
npx mjolnir-qa@latest
```

[อ่านคู่มือ](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [เว็บไซต์เอกสาร](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

อย่าถามว่าเทสต์ผ่านหรือไม่<br />
ให้ถามว่าหลักฐานพิสูจน์ได้หรือไม่ว่าเทสต์เหล่านั้นสมควรได้รับความเชื่อถือ

<sub>สร้างโดย [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · สัญญาอนุญาต MIT</sub>

</div>
