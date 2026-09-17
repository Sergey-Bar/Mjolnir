<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir。测试告诉你什么通过了。Mjölnir 告诉你什么值得信任。" width="100%" />

<br />

Mjölnir 找出不可能失败的测试和不可能变红的流水线，<br />
再评估结果可信到什么程度，每一分都附有证据。

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

[实际效果](#实际效果) · [快速开始](#快速开始) · [能发现什么](#mjölnir-能发现什么) · [评分](#可信度评分) · [证据](#证据模型) · [运行取证](#运行时取证) · [CI](#ci-完整性) · [智能体](#ai-智能体) · [安全](#信任与安全) · [局限](#mjölnir-无法告诉你的事) · [文档](#文档)

<details>
<summary>阅读其他语言版本 — 22 种译文</summary>

[English](README.md) | 简体中文 | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## 绿色对勾是一种声明，而不是证明

绿色对勾只说明流水线没有失败。它并不说明测试真的运行了，也不说明它们有可能失败。下面每一种情况都会显示为绿色：

- 提交进仓库的 `.only`，只运行了 3 个测试而不是 900 个
- 本应拦截的 job 上写着 `continue-on-error: true`
- 测试命令后面的 `|| true`
- 什么都不断言、或者测试体为空的测试
- 把真实失败变成侥幸通过的重试包装
- workflow 上传了、却从未生成过的报告
- 靠固定 sleep 勉强撑住的竞态条件

它们都不会让流水线变红，而且在评审中每一个看起来都像是有意为之。所以它们才能存活下来。下面是 Mjölnir 读取一个真实案例：

<p align="center">
  <img src="assets/readme/scan.svg" alt="演示仓库的 CI workflow，逐行读取。Mjölnir 在报告的行上标出每一条发现，附上它的规则、问题所在、证据等级以及实测误报率。" width="800" />
</p>

<sub>演示扫描为该 workflow 报告的每一条发现，都标在报告的行上。由 `npm run docs:readme-brand` 根据 [`demo-report.json`](assets/readme/demo-report.json) 生成，并在 CI 中锁定以防漂移。</sub>

**严格模式。** 最激进的检测——`.only`、`continue-on-error`、空测试、滥用重试——位于隔离层。它们仅在 `--strict` 下运行，且限定为 `info` 严重级别：只标记，从不拦截。默认扫描（不带 `--strict` 的 `npx mjolnir-qa@latest`）仅覆盖核心和扩展规则。需要咨询层时，加上 `--strict`。

Mjölnir 读取测试套件、CI workflow，以及（如果有的话）一次真实运行的报告。它不会运行你的测试，不会安装你的依赖，也不会执行它扫描的代码。当它没有证据时，它会直说，而不是编造信心：

| 情况                                       | Mjölnir 的报告                                        |
| ------------------------------------------ | ----------------------------------------------------- |
| 未找到测试声明                             | 评分为 `null`，显示为 **UNKNOWN**。绝不编造一个 100。 |
| 没有基线或可比较的版本                     | **UNKNOWN**，并写明原因。绝不假定为 0。               |
| 扫描中途终止（时间预算用尽、文件无法读取） | **PARTIAL**，退出码 `2`。绝不呈现为干净结果。         |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Mjölnir 的工作方式。它静态读取测试套件和 CI 流水线，在有真实运行报告时也会读取该报告。它按证据等级和信任等级为每条发现加权，其中只有真实运行才能达到 L3 到 L5，最终产出发现、可信度评分，以及基于冻结退出码的 CI 门禁。在智能体循环中，AI 编写修复，Mjölnir 重新扫描来证明它。" width="880" />
</p>

<sub>为本页面设计并按 1:1 显示。由 `npm run docs:readme-brand` 生成，并在 CI 中锁定以防漂移；评分、计数和规则 ID 来自 [`script.demo.json`](assets/video/script.demo.json)、[`demo-report.json`](assets/readme/demo-report.json) 和规则注册表，从不手动输入。同一张图的海报版本：[`architecture.svg`](assets/readme/architecture.svg)。</sub>

<br />

## 实际效果

对 [`examples/demo-repo`](examples/demo-repo) 的一次真实扫描，这是一个带 CI workflow 的小型 Playwright 套件。它的分数都扣在了这里：

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir 的扣分明细：WORTHINESS 80/100 WORTHY、按类别的评分、按严重级别的扣分框，以及 FIX THIS FIRST 列表" width="520" />
</p>

<sub>由 `npm run docs:hero` 根据一次真实扫描生成，并在 CI 中锁定以防漂移。同一次扫描的完整 `--verbose` 报告是 [`demo.svg`](assets/readme/demo.svg)（`npm run docs:demo`）。</sub>

<details>
<summary><strong>观看演示</strong> — 一次扫描、它给出的修复，以及证明修复有效的重新扫描</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="演示录像中的一帧：npx mjolnir-qa@latest 在终端窗口中扫描演示仓库" width="900" />
  </a>
</p>

<sub>由 `npm run docs:video` 根据一次真实扫描逐帧渲染；从不录屏。点击画面即可打开 [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4)。</sub>

</details>

### 近看一条发现

每条发现都回答四个问题：它在哪里、Mjölnir 有多确定、这条规则多常出错，以及如何修复。

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="演示扫描的第一条发现，与终端打印的完全一致，标出了它的四个部分：位置、确定程度、规则的出错频率，以及修复方法。" width="100%" />
</p>

`mjolnir explain QA-CI-001` 会打印一条规则完整的信任档案，包括它的实测误报率，以及该误报率为它赢得的等级：

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

这就是价值的基本单位：CI 报告了一次它并未赢得的通过。

<br />

## 快速开始

```bash
npx mjolnir-qa@latest
```

它扫描当前目录并打印 Trust Report：发现了什么、你能在多大程度上信任它、原因，以及下一步该做什么。当门禁及以上级别没有任何发现时，它以 `0` 退出。

在 CI 中，只扫描分支引入的内容，这样遗留的测试套件就不会淹没你的第一个 pull request：

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` 会把它写成一个 GitHub Actions workflow，使用固定在 `v1` 主版本标签上的 [action](https://github.com/Sergey-Bar/Mjolnir#readme)（或使用 `--no-action` 改用普通 `npx`）。在你决定让它拦截之前，它始终只是建议性的。

| 命令                                | 作用                                          |
| ----------------------------------- | --------------------------------------------- |
| `mjolnir`                           | Trust Report：结论、置信度、下一步行动        |
| `mjolnir --scope changed`           | 只检查你的分支引入的内容（CI 用法）           |
| `mjolnir ci install`                | 生成建议性的 PR workflow（基于 action）       |
| `mjolnir explain QA-CI-001`         | 是什么、为什么、怎么修，外加实测 FP 率        |
| `mjolnir why src/a.spec.ts:42`      | 解释这一行为什么被标记。从不拦截。            |
| `mjolnir forensics ./test-results/` | 来自真实运行的运行时证据                      |
| `mjolnir trust-report`              | 自包含的 Trust Artifact（md + json）          |
| `mjolnir handoff`                   | 给编码智能体的修复计划                        |
| `mjolnir --json` / `--format sarif` | 机器可读输出，GitHub Code Scanning            |
| `mjolnir --format codequality`      | GitLab Code Quality 报告（MR 组件所用的产物） |
| `mjolnir --strict`                  | 同时运行 quarantine 级别的规则（FP 风险更高） |

<details>
<summary><strong>其他所有命令</strong> — 不稳定测试分诊、报告、治理</summary>

<br />

| 命令                                | 作用                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| `mjolnir --classic`                 | Trust Report 之前的评分横幅样式                          |
| `mjolnir explain verdict`           | 解释已保存扫描的结论为何如此                             |
| `mjolnir triage ./test-results/`    | 引导式分诊。每一行都以下一步行动结尾。                   |
| `mjolnir pw-report ./test-results/` | Playwright 运行摘要：重试、不稳定测试、最慢的测试        |
| `mjolnir doctor:playwright`         | 仅针对 Playwright 的深度扫描，外加 Selector Health Score |
| `mjolnir fix --dry-run` / `fix`     | 安全的自动修复，每一项都会重新扫描以证明修复生效         |
| `mjolnir baseline` / `diff`         | 为发现建立快照，之后只报告新增或恶化的                   |
| `mjolnir impact --since <ref>`      | 某次提交引入并解决了什么                                 |
| `mjolnir summary`                   | 根据报告生成 CI 注解和 step 摘要                         |
| `mjolnir pr-comment`                | 限定范围的 PR 评论，Markdown 格式                        |
| `mjolnir debt`                      | 带成本模型的测试债务登记表                               |
| `mjolnir handover`                  | 为新 QA 工程师准备的测试套件入门地图                     |
| `mjolnir init`                      | 检测框架，打印设置检查清单                               |
| `mjolnir suppressions`              | 列出被抑制的发现，用于治理                               |
| `mjolnir rules --unmeasured`        | 基于假设而非测量运行的规则                               |
| `mjolnir rules --md`                | 完整规则目录（JSON 或 Markdown）                         |
| `mjolnir doctor`                    | 对 Mjölnir 自身规则库的自我审计                          |
| `mjolnir create-rule <ID>`          | 为新规则及其 fixtures 生成脚手架                         |
| `mjolnir stats`                     | 本地记录的历史修复计数                                   |
| `mjolnir badge`                     | shields.io 端点 JSON 及代码片段                          |
| `mjolnir --cache`                   | 借助本地结论缓存进行增量重新扫描                         |
| `mjolnir --format mermaid`          | 用于 PR 评论的测试架构图                                 |

`mjolnir help <command>` 会打印其中任一命令的用法、示例和下一步。

</details>

需要 Windows、macOS 或 Linux 上的 **Node.js ≥ 22.18**。想全局安装？`npm i -g mjolnir-qa`。这个最低版本来自构建工具链（tsdown 以它为目标，发布流水线也针对它做冒烟测试）；运行时依赖对版本没有更高要求。

<br />

## Mjölnir 能发现什么

<p align="center">
  <img src="assets/readme/stack.svg" alt="适配你的技术栈：规则所覆盖的语言、测试框架和 CI 系统，数据来自规则注册表。" width="100%" />
</p>

**79 条规则**，分为四个类别：测试卫生、测试质量、Playwright 和 CI 完整性，覆盖 TypeScript 与 JavaScript、Python、Java、C# 以及 GitHub Actions YAML。它们覆盖 Playwright 的全部四种语言绑定，以及 pytest、JUnit、TestNG、NUnit、xUnit、MSTest、Jest、Vitest 和 Mocha，并为 Cypress 和 Selenium 提供入门级覆盖。下面列出其中九条，以展示大致样貌：

| ID           | 规则                                             | 严重级别 | 等级       |
| ------------ | ------------------------------------------------ | -------- | ---------- |
| QA-CI-001    | `continue-on-error` 掩盖了失败的验证门禁         | error    | quarantine |
| QA-CI-009    | 测试退出码未传递（`\|` 未启用 pipefail、`;` 链） | error    | extended   |
| QA-TEST-001  | 提交了聚焦测试（`.only`、`fit`）                 | error    | quarantine |
| QA-TEST-003  | 没有断言的测试                                   | error    | quarantine |
| QA-TQUAL-009 | 未 await 的 promise 断言                         | error    | quarantine |
| QA-PW-002    | 未 await 的 locator 断言                         | error    | core       |
| QA-PW-004    | 脆弱的 CSS/XPath 选择器                          | warning  | quarantine |
| QA-PY-002    | 被跳过的测试（`skip`、非严格的 `xfail`）         | warning  | core       |
| QA-CS-103    | 没有断言的测试方法                               | error    | core       |

完整目录由注册表自动生成，从不手工维护：`mjolnir rules --md`、[`docs/rules/`](docs/rules/)，或 [检查项指南](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks)。

<details>
<summary><strong>本 README 中提到的所有规则</strong>，汇总在一张表里</summary>

<br />

> `quarantine` 规则只在 `--strict` 下运行，且从不拦截（其级别上限为 info）。表中显示的是作者设定的严重级别。

| ID           | 类别       | 规则                                             | 严重级别 | 等级       |
| ------------ | ---------- | ------------------------------------------------ | -------- | ---------- |
| QA-TEST-001  | 卫生       | 提交了聚焦测试（`.only`、`fit`）                 | error    | quarantine |
| QA-TEST-002  | 卫生       | 被跳过的测试。没有可追踪的原因时升级为 `error`。 | warning  | quarantine |
| QA-TEST-003  | 卫生       | 没有断言的测试                                   | error    | quarantine |
| QA-TEST-004  | 卫生       | 硬等待（`waitForTimeout`、`sleep()`、`delay()`） | warning  | extended   |
| QA-TEST-006  | 卫生       | 滥用重试来掩盖不稳定性                           | warning  | quarantine |
| QA-TEST-010  | 卫生       | 空的测试体                                       | error    | quarantine |
| QA-TQUAL-002 | 质量       | 同义反复的断言                                   | error    | quarantine |
| QA-TQUAL-009 | 质量       | 未 await 的 promise 断言                         | error    | quarantine |
| QA-TQUAL-011 | 质量       | 被注释掉的测试                                   | warning  | extended   |
| QA-PW-002    | Playwright | 未 await 的 locator 断言                         | error    | core       |
| QA-PW-003    | Playwright | 提交了 `page.pause()` / `test.only()`            | error    | core       |
| QA-PW-004    | Playwright | 脆弱的 CSS/XPath 选择器                          | warning  | quarantine |
| QA-PW-123    | Playwright | 硬编码的环境 URL                                 | warning  | quarantine |
| QA-PW-140    | Playwright | 未设置 `maxDiffPixelRatio` 的截图                | warning  | core       |
| QA-CI-001    | CI         | `continue-on-error` 掩盖了失败的门禁             | error    | quarantine |
| QA-CI-002    | CI         | `\|\| true` 吞掉退出码                           | error    | extended   |
| QA-CI-005    | CI         | 报告被使用却从未生成                             | error    | quarantine |
| QA-CI-007    | CI         | 包裹测试的重试包装                               | warning  | extended   |
| QA-CI-008    | CI         | 总是成功的 step 掩盖了失败                       | error    | quarantine |
| QA-CI-009    | CI         | 退出码未传递（`\|` 未启用 pipefail、`;` 链）     | error    | extended   |
| QA-CI-010    | CI         | 在必须拦截的地方跳过了测试                       | error    | quarantine |
| QA-PY-002    | Python     | 被跳过的测试（`skip`、非严格的 `xfail`）         | warning  | core       |
| QA-PY-003    | Python     | 没有断言的测试函数                               | error    | quarantine |
| QA-PY-005    | Python     | 测试中的 `time.sleep()`                          | warning  | extended   |
| QA-PY-012    | Python     | 同义反复的断言                                   | error    | quarantine |
| QA-JV-101    | Java       | 被禁用的测试（`@Disabled`）                      | warning  | core       |
| QA-JV-102    | Java       | 硬等待（`Thread.sleep()`）                       | warning  | extended   |
| QA-JV-103    | Java       | 没有断言的测试方法                               | error    | extended   |
| QA-JV-105    | Java       | Playwright `waitForTimeout()` 硬等待             | warning  | core       |
| QA-JV-106    | Java       | 使用脆弱选择器而非基于角色的 locator             | warning  | quarantine |
| QA-CS-101    | C#         | 被跳过的测试（`[Ignore]`、`[Fact(Skip=)]`）      | warning  | core       |
| QA-CS-102    | C#         | 硬等待（`Thread.Sleep` / `Task.Delay`）          | warning  | core       |
| QA-CS-103    | C#         | 没有断言的测试方法                               | error    | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` 硬等待                   | warning  | extended   |
| QA-CS-106    | C#         | 使用脆弱选择器而非基于角色的 locator             | warning  | quarantine |

Python 还提供 QA-PY-001…012（pytest 卫生）和 QA-PY-101…108（Python 版 Playwright）。Cypress 和 Selenium 各有一套三条规则的入门集。

</details>

每条规则都附带 must-fire **和** must-not-fire 两类 fixture，在自己的负向 fixture 上触发的规则不能发布。这就是误报防火墙；`mjolnir doctor` 在本仓库自己的 CI 中强制执行它。

### Selector Health Score

`mjolnir doctor:playwright` 根据每个 locator 查找元素的方式为其打分：像用户那样查找（角色、标签、文本）、通过显式契约（`data-testid`），还是依赖结构上的偶然（CSS 链、XPath）。每个文件得到 0 到 100 的分数：

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

这衡量的是**韧性，而非正确性**。`.btn.btn-primary > div:nth-child(2)` 今天能通过，并会一直通过，直到有人改动标记结构。低分从不声称测试坏了，只说明它依赖于没有人承诺保留的标记结构。

<br />

## 可信度评分

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="0 到 100 的可信度刻度，指针扫过每一个分数：低于 50 为 UNWORTHY，50 到 79 为 NEEDS WORK，80 到 99 为 WORTHY，100 为 FORGED" width="720" />
</p>

<sub>0 到 100 的每一个分数，都由真实的 `deriveScoreState` 定位。由 `npm run docs:gauge` 生成，并在 CI 中锁定以防漂移。</sub>

| 评分      | 结论                        |
| --------- | --------------------------- |
| `0 – 49`  | **UNWORTHY**                |
| `50 – 79` | **NEEDS WORK**              |
| `80 – 99` | **WORTHY**                  |
| `100`     | **FORGED**                  |
| `null`    | **UNKNOWN**：未找到测试声明 |

**计算方式**。严重级别决定基础扣分（`error −8`、`warning −3`、`info −1`），证据等级再对其打折：E2 全额扣分，E1 扣一半（向下取整），E0 不扣分。总扣分按套件规模归一化，即按每个测试声明计算，而不是按文件计算。终端打印的就是评分所用的同一组折后数字；不存在隐藏的第二套模型。详情：[docs/SCORING.md](docs/SCORING.md) 和 [评分指南](https://sergey-bar.github.io/Mjolnir/guide/scoring)。

**100 分不代表什么**。它不代表软件是正确的，不代表测试套件是充分的，也不代表产品没有缺陷。它只代表一件事：**在本次扫描和这一证据模型下，Mjölnir 评估的规则都没有产生扣分。**

<br />

## 证据模型

每条发现都带有两个标签：Mjölnir 有多确定，以及这条发现被核实到了什么程度。这正是只会报告模式的工具，与可以用来把关发布的工具之间的区别。

**有多确定 — 证据等级。**

| 等级   | 名称       | 含义                           | 扣分 |
| ------ | ---------- | ------------------------------ | ---- |
| **E2** | 确定性证明 | 缺陷就存在于代码的现有写法中   | 全额 |
| **E1** | 模式证据   | 匹配到与缺陷强相关的模式       | 一半 |
| **E0** | 观察       | 值得了解。并不声称有任何问题。 | 零   |

检测的置信度不等于证明的强度。一条规则可以确定自己匹配到了要找的东西，但它看到的仍可能只是启发式结果。E1 发现是用来阅读和判断的，绝不能盲目套用；这条边界会标注在终端、JSON 以及交给智能体的交接内容中的每条发现上。

**核实到什么程度 — 信任等级**。大多数发现来自阅读你的代码。把一次真实测试运行的报告交给 Mjölnir，它就能确认代码确实运行过。

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="从 L0 到 L5 的信任阶梯。L0 到 L2 来自阅读代码；L3 到 L5 需要真实的运行报告，阶梯上的断口标示了这一点。" width="100%" />
</p>

| 等级   | 通俗解释         | 所需条件                           |
| ------ | ---------------- | ---------------------------------- |
| **L0** | 已记录           | 阅读代码                           |
| **L1** | 看起来像是问题   | 阅读代码：匹配到模式               |
| **L2** | 在代码中得到证明 | 阅读代码：缺陷是结构性的           |
| **L3** | 文件运行过       | 运行报告显示发现所在的文件被执行过 |
| **L4** | 测试运行过       | 运行报告显示发现所在的测试被执行过 |
| **L5** | 运行结果吻合     | 运行自身的结果证实了该缺陷类别     |

静态扫描止步于 L2。只有真实的运行报告（Playwright JSON、Jest 或 Vitest JSON、JUnit XML）才能把发现提升到 L3 或更高，因此从未被观察到运行过的发现，永远不能声称它运行过。定义：[docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)。

### 其中有多少经过实测

**79 条规则中有 74 条的误报率是在真实开源代码上测得的**（每条至少 10 个人工分类的发现；见 [docs/FP-AUDIT.md](docs/FP-AUDIT.md)）。其余 5 条基于作者的估计发布，并在 `mjolnir explain` 中逐条注明。`mjolnir rules --unmeasured` 会列出它们，每次扫描的页脚也会报告实际*触发*的规则中有多少经过实测。

即使误报率很差也照样公开。QA-TEST-001（提交进仓库的 `.only`）在真实仓库上的审计结果很差，因此被放在 quarantine。每条规则（包括 QA-PW-141）的最新数字都在审计报告里。

### 规则信任等级

等级由实测误报率决定，而不是凭主观判断：

| 等级           | 实测 FP            | 行为                                          |
| -------------- | ------------------ | --------------------------------------------- |
| **core**       | ≤ 10%              | 默认报告，会拦截                              |
| **extended**   | ≤ 30%              | 默认报告，置信度较低                          |
| **quarantine** | > 30% 或被明确声明 | 仅在 `--strict` 下运行，上限为 info，从不拦截 |
| _未实测_       | n < 10             | 实测之前不能晋升为 core                       |

FP 带只能降级一个层级 — 如果规则被明确声明在 `quarantine` 中，它们永远不会将其提升出去。被明确置于 quarantine 的规则无论其测量的 FP 率如何都保持在 quarantine 中。

晋升、降级以及各语言的成熟度：[规则生命周期](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle)。

### 为什么这不是一个 linter

Linter 告诉你代码是否遵循规则。Mjölnir 告诉你你的验证是否值得信任。

|                                                        | Linter（ESLint、SonarQube） | 覆盖率工具 | AI 代码评审 |    **Mjölnir**     |
| ------------------------------------------------------ | :-------------------------: | :--------: | :---------: | :----------------: |
| 评估的是**验证体系**，而不是产品代码                   |             否              |     否     |     否      |         是         |
| CI workflow 完整性（`continue-on-error`、`\|\| true`） |             否              |     否     |  仅限 diff  |         是         |
| 评估 Playwright locator 的韧性（Selector Health）      |             否              |     否     |     否      |         是         |
| 读取真实运行数据得出 `TRUE-FLAKE` 结论                 |             否              |     否     |     否      |         是         |
| 公布每条规则的实测误报率                               |             否              |     否     |     否      |         是         |
| 标记没有断言的测试                                     |            是\*             |     否     |    有时     |         是         |
| 捕获硬等待（`waitForTimeout`、`time.sleep`）           |            是\*             |     否     |    有时     |         是         |
| 确定性（相同输入，相同输出）                           |             是              |     是     |     否      |         是         |
| 每次扫描的成本                                         |            免费             |    免费    |    token    | **零**（本地运行） |

<sub>\*由 `eslint-plugin-jest` 和 `eslint-plugin-playwright`（`expect-expect`、`no-wait-for-timeout`）以及 SonarQube 自带的断言规则覆盖。各列描述的是验证测试套件时的默认行为；插件、付费版本和自定义规则会改变其中部分答案。这是一份定位概览，而不是基准测试。</sub>

也请使用 AI 评审。它能捕捉到任何模式都发现不了的细微差别、意图和设计缺陷。而 Mjölnir 能捕捉到 AI 评审因为看起来是有意为之而忽略的东西：提交进仓库的 `.only`、被吞掉的退出码、测试 job 上的 `continue-on-error`。这些需要的是扫描，而不是推理。

<br />

## 运行时取证

静态分析是对从未运行过的代码进行推理。取证读取的是实际发生的事情：来自任意运行器的 Playwright JSON、Jest JSON、Vitest JSON 和 JUnit XML。

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

`TRUE-FLAKE` 并不是说测试被重试过。它的意思是该测试**至少有一次尝试失败，随后以绿色结束**：这是一次侥幸通过，无论最终的对勾怎么显示都会被标记出来。`mjolnir triage` 会把这段历史转换成隔离建议，`mjolnir pw-report` 则汇总一次运行。正是这些运行报告，把发现提升到 L3 及以上的信任等级。

<br />

## CI 完整性

测试可以通过，而包裹它的流水线却不可能失败。Mjölnir 同样读取 workflow：`continue-on-error`、`|| true`、从不传递的退出码、总是成功的 step、被使用却从未生成的报告，以及恰恰在应当拦截的事件上被跳过的门禁。每条发现都会指明 job、step 和行号，并带有自己的证据等级。

生成 PR workflow，默认是建议性的：

```bash
mjolnir ci install
```

或者把 Marketplace 上的 action 加到你现有的 workflow 中：

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

固定 `@v1` 以跟随主版本线，或固定一个确切的标签（`@v0.5.32`）以获得可复现的门禁。[docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) 介绍了 Marketplace、Smithery 和各个 MCP 注册表。

要把发现推送到 GitHub Code Scanning，上传 SARIF（需要在 workflow 或 job 范围内设置 `security-events: write`）：

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

在 GitLab 上，`--format codequality` 会写出 MR 组件和 diff 注解所读取的 Code Quality 报告（[docs/GITLAB-CI.md](docs/GITLAB-CI.md)）。编辑器和流水线设置：[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)。

### 变更范围归因

```bash
npx mjolnir-qa@latest --scope changed
```

发现会归因到你的分支新增的行，以 **merge-base** 为基准计算。范围与完整扫描发现的文件集合相同（TS/JS spec 和适配器配置、`test_*.py`、`*Test.java`、`*Tests.cs`、`.github/workflows/*.yml`），再加上未提交和未跟踪的改动，所以在你提交之前就能使用。基准按 `main → master → origin/main → origin/master → origin/HEAD` 的顺序解析；可以用 `--base <ref>` 覆盖。

当无法解析 merge-base 时（浅克隆、分离的 HEAD、不在 git 中的目标），发现会退回到按整个文件归因，**而且报告会明确说明这一点**。静默退回正是这个工具要捕捉的那类缺陷。

<br />

## AI 智能体

只有当某个东西据此采取行动时，发现才有价值。

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI 编写修复。Mjölnir 验证它**。证明来自重新扫描，而绝不是智能体自己报告的成功。

| 命令              | 智能体得到什么                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | 一个基于 stdio 的 [MCP](https://modelcontextprotocol.io) 服务器。`scan`、`explain` 和 `diff` 都成为可调用的工具。                |
| `mjolnir handoff` | 保存下来的 `--json` 报告会变成一份确定性的 Markdown 计划：检测到了什么、每条发现的证据边界、哪些东西**不能**改动，以及如何验证。 |
| `mjolnir install` | 写入你的仓库中已有的智能体配置位置（`.claude/`、`.cursor/`、`.kilo/`、`AGENTS.md`），这样智能体在声称完成之前会重新扫描。        |

添加到自带 CLI 的客户端：

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

或者添加到任何接受 `mcpServers` 配置块的客户端：

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**护栏比便利更重要**。交接中的每条发现都带有它的边界。**E2** 表示 _确定性：检查位置并应用修复_。**E1** 表示 _需要确认：仅凭观察不能证明缺陷_。一个盲目修复 E1、抑制规则或修改规则来抬高分数的智能体，所做的正是这个工具要捕捉的事情，因此交接内容会在提示词中、紧挨着这条发现写明这一点。

<br />

## 信任与安全

**本地优先，零遥测**。`src/` 中任何地方都不存在具备网络能力的 API（`fetch`、`http`、`https`、`net`、`dns`、`dgram`、WebSocket），一旦出现，[`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) 就会让构建失败。它同样禁止 `eval` 和 `new Function`。扫描不受信任的代码时从不执行它：静态分析读取源代码文本，取证解析磁盘上已存在的报告文件。

两点说明：`npx` 本身会在任何代码运行之前下载软件包；而这项保证覆盖的是 `src/`，不包括第三方插件。

**插件不在沙箱中运行**。JS 插件（`mjolnir-rules/*.mjs`，或在 `"plugins"` 下列出的 npm 包）以完整的 Node 权限运行，与 ESLint 或 Vitest 插件的信任模型相同。加载它们需要**在每次扫描时**显式启用：没有 `--enable-plugins`（或 `MJOLNIR_ENABLE_PLUGINS=1`）时，它们的源码永远不会被加载，stderr 上的提示会列出被跳过的内容。JSON 规则清单不执行任何代码，核心规则 ID 前缀是保留的，因此插件无法冒充核心规则。请通过 [SECURITY.md](SECURITY.md) 报告漏洞。

**它会检查自己**。一个验证信任引擎，只有自身可被验证才有立足之地。每次 CI 运行都会用同一次运行产出的构建来扫描本仓库。只要出现任何 error 级别的发现，门禁就会失败；遇到**部分**扫描或**崩溃的规则**时同样失败，因为一次被截断、什么都没报告的自检，正是这个项目要捕捉的虚假绿色。`mjolnir doctor` 会在同一次运行中重新审计规则库（fixture 防火墙、等级的诚实性、core 等级上限），结果为 INCONCLUSIVE 的检查与失败的检查同样判定为失败。两份报告都会作为构建产物上传。

### 退出码与机器契约

已冻结，你可以放心地在其上构建 CI 逻辑：

| 退出码 | 含义                                               |
| ------ | -------------------------------------------------- |
| `0`    | 干净：门禁及以上级别没有发现                       |
| `1`    | 门禁及以上级别存在发现                             |
| `2`    | 部分扫描（时间预算用尽、文件无法读取）。从不拦截。 |
| `10`   | 用法错误（参数错误、缺少目标）                     |
| `20`   | 内部错误                                           |

`2` 被刻意区别于 `0`：一次没有完成的扫描并不是“什么都没发现”，它只是还没找完。

机器消费的一切（MCP 工具结果、`--json`、SARIF 2.1）都来自同一个规范结果，遵循带版本号且**只做增量扩展**的 schema（`schemaVersion: 1`、`contractVersion: 1`），因此任何消费者都无需从渲染后的文本中重建含义。参见 [机器契约](docs/machine-contract.md)。规则 ID（`QA-<FAMILY>-NNN`）一经发布即不可更改，也绝不复用。

<br />

## Mjölnir 无法告诉你的事

- **它不会运行你的测试**。扫描干净不等于测试套件通过。
- **它无法告诉你某个断言是*错误的***。`expect(total).toBe(41)` 看起来很健康。Mjölnir 找的是*不可能失败*的测试和*不可能变红*的流水线，而不是检查了错误内容的测试。
- **它不能证明业务正确性**。这里没有任何东西能说明你的产品做到了需求的要求。
- **100 分不能证明测试套件好**。你的套件是否覆盖了真实风险是另一个问题，这个工具不回答它。
- **79 条规则中有 5 条基于估计发布**，而不是实测的误报率。每一条都会在自己的发现中注明。
- **E1 不是 E2**。启发式发现值得阅读，但不值得盲目套用。
- **空仓库的得分是 `null`，绝不是 100。**
- **名为 `*.spec.ts` 却没有测试声明的文件不算覆盖**。如果一个仓库仅有的 spec 文件里只有导入或类型（`it`/`test` 调用为零），它的得分是 `null`，而不是 100。

<br />

## 文档

完整文档站点位于 <https://sergey-bar.github.io/Mjolnir/>。

| 文档                                                   | 内容                                         |
| ------------------------------------------------------ | -------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | 评分归一化与证据加权                         |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | 规范术语表：一个概念一个词                   |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 实测误报率及测量方法                         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | 规则状态、等级、抑制与弃用                   |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver 策略、冻结的接口、弃用周期            |
| [docs/machine-contract.md](docs/machine-contract.md)   | 规范的机器可读结果                           |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 输出以及编辑器或 CI 设置               |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab：Code Quality 报告、MR 配置示例、门禁 |
| [docs/rules/](docs/rules/)                             | 自动生成的逐条规则目录                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 开发环境搭建与贡献流程                       |
| [SUPPORT.md](SUPPORT.md)                               | 在哪里提问、报告问题和获取帮助               |
| [SECURITY.md](SECURITY.md)                             | 漏洞报告                                     |
| [CHANGELOG.md](CHANGELOG.md)                           | 版本历史                                     |

### 状态

**版本 1**。JSON schema 和退出码是冻结的契约。TypeScript 和 Python 拥有最广的实测覆盖。Java 和 C# 较新；请参照 [成熟度表](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle) 来理解它们。接下来的计划，不编造日期：[公开路线图](https://sergey-bar.github.io/Mjolnir/reference/roadmap)。

### 参与贡献

新规则是最容易上手的第一份贡献。一条命令就能为规则生成脚手架，连同它的 must-fire **和** must-not-fire fixture。生成的规则在写出真正的检测逻辑之前，会故意在自己的 fixture 上失败，因为一个被发布出去的空壳，就是一条没人测量过的规则：

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

开发环境搭建、常驻门禁命令，以及 anti-creep 和 fixture 防火墙两条法则，都在 [CONTRIBUTING.md](CONTRIBUTING.md) 中。

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="在你的仓库上运行它。" width="100%" />

```bash
npx mjolnir-qa@latest
```

[阅读指南](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [文档站点](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

别问测试是否通过了。<br />
要问证据能否证明它们值得信任。

<sub>由 [Sergey Bar](https://www.linkedin.com/in/sergeybar/) 构建 · MIT 许可</sub>

</div>
