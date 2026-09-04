<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### 你的测试在对你说谎。我们来证明它。

**面向 QA 的 Verification Trust Engine。** Mjölnir 审计测试套件与 CI
流水线，给出可信度评分，并精确指出信任在哪里断裂。

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | 简体中文 | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**你的测试值得信任吗？**

[看它如何工作](#-看它如何工作) ·
[快速上手](#-快速上手) ·
[它检查什么](#-mjölnir-检查什么) ·
[评分](#评分如何运作) ·
[CI](#-ci-集成) · [配置](#配置) ·
[文档](#-文档)

</div>

---

## 🎬 看它如何工作

<p align="center">
  <img src="assets/readme/demo.svg" alt="Mjölnir 对演示仓库的完整 --verbose 报告：WORTHINESS 75/100 NEEDS WORK，按类目拆分的诊断，FIX THIS FIRST 清单，以及每一条发现附带的规则 ID 与行号——覆盖 CI、Playwright、测试卫生与 Python 规则" width="900" />
</p>

<sub>`npx mjolnir-qa ./examples/demo-repo --verbose` 的完整输出，由真实
reporter 渲染——无任何删减。通过 `npm run docs:demo` 重新生成；
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
会在产物与工具实际打印内容发生偏差时令 CI 失败。</sub>

**刚才发生了什么：**

1. Mjölnir 发现了 Playwright 规格文件、它的配置、CI 工作流和一个
   Python 测试文件——四种语言/格式，一趟扫描。
2. 它找到了削弱对测试套件信任的证据——掩盖任务失败的
   `continue-on-error`、吞掉退出码的 `|| true`、硬性 sleep、脆弱的
   选择器、硬编码的 staging URL、`networkidle` 等待。
3. 它把每一项变成带规则 ID、位置和修复方案的切实发现——以及一个你
   可以用来给 PR 设门的单一分数。

### 近看一条发现

对上面第一条发现运行 `mjolnir explain QA-CI-001`，你会得到：

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

这就是价值的单位：不是风格上的吹毛求疵，而是你的 CI 声称某事通过了、
实则未通过的那个位置。

---

## ⚡ 快速上手

对一个仓库运行它，获得完整报告与可信度评分：

```bash
npx mjolnir-qa@latest
```

**在 CI 中，产品就是一条命令。** 它只扫描分支改动的内容，出现新问题时
以非零码退出：

```bash
npx mjolnir-qa@latest --scope changed
```

把它放进 PR 检查——`mjolnir ci install` 会写好工作流——就完成了。
其余一切都是可选的。

| 命令                                | 作用                                              |
| ----------------------------------- | ------------------------------------------------- |
| `mjolnir`                           | 全仓扫描 + 可信度评分                             |
| `mjolnir --scope changed`           | 只看你分支引入的内容——CI 形态                     |
| `mjolnir ci install`                | 生成建议性的 PR 工作流                            |
| `mjolnir explain QA-CI-001`         | 是什么 / 为什么 / 如何修复 + 单条规则的实测 FP 率 |
| `mjolnir rules --unmeasured`        | 列出按假设而非测量运行的规则                      |
| `mjolnir --json` / `--format sarif` | 机器可读 / GitHub Code Scanning                   |
| `mjolnir --strict`                  | 同时运行隔离层（quarantine）规则（FP 风险更高）   |

<details>
<summary><strong>当某个测试不稳定时</strong></summary>

| 命令                                | 作用                                             |
| ----------------------------------- | ------------------------------------------------ |
| `mjolnir forensics ./test-results/` | 真实运行数据 → `TRUE-FLAKE` 判定，`FLAKY.md`     |
| `mjolnir triage ./test-results/`    | 根据执行历史提出隔离建议                         |
| `mjolnir pw-report ./test-results/` | Playwright 运行摘要——重试 / 不稳定 / 最慢        |
| `mjolnir doctor:playwright`         | 仅 Playwright 的深度扫描 + Selector Health Score |

</details>

<details>
<summary><strong>偶尔使用 / 报告类</strong></summary>

| 命令                            | 作用                                  |
| ------------------------------- | ------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | 带证据的安全自动修复                  |
| `mjolnir baseline` / `diff`     | 先给发现拍快照，之后只报告新增/恶化项 |
| `mjolnir impact --since <ref>`  | 自某个先前的提交以来改变了什么        |
| `mjolnir debt`                  | 带成本模型的测试债登记簿              |
| `mjolnir handover`              | 为新 QA 提供的套件上手地图            |
| `mjolnir stats`                 | 本地统计所见过修复的累计计数          |
| `mjolnir badge`                 | shields.io 端点 JSON + 代码片段       |
| `mjolnir rules --md`            | 完整规则目录（JSON 或 Markdown）      |
| `mjolnir doctor`                | 对 Mjölnir 自身规则库的自审           |
| `mjolnir create-rule <ID>`      | 脚手架生成新规则 + 固定样例           |
| `mjolnir --format mermaid`      | 用于 PR 评论的测试架构图              |

</details>

如果你更偏好，可以全局安装而不是 `npx`：`npm i -g mjolnir-qa`。
要求 Node.js ≥ 22.18。支持 Windows、macOS 和 Linux。

---

## 👥 这为谁而做？

- **QA / SDET**——拥有 e2e 或集成测试套件，需要证据证明套件确实配得上
  它产出的绿色对勾。
- **平台 / DevEx 团队**——负责 CI 完整性与发布门禁；他们关心
  `continue-on-error` 绝不能悄悄把红色流水线涂成绿色。
- **OSS 维护者**——想要一个便宜、常开、可本地和 CI 运行且零网络调用的
  验证门禁。

---

## 🔨 Mjölnir 检查什么

|     |                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------- |
| ⚖️  | **可信度评分**——一个数字、透明的扣分表、没有黑箱                                                        |
| 🎭  | **Selector Health Score**——为你的 Playwright 定位器评级，而不只是通过率                                 |
| 🔬  | **运行时取证**——读取真实的 Playwright/JUnit 运行数据来捕捉 `TRUE-FLAKE`，而不只是静态猜测               |
| 🚨  | **CI 完整性规则**——抓出 `continue-on-error`、`\|\| true` 等假绿花招                                     |
| 🐍  | **全部四种 Playwright 绑定**——TypeScript、Python、Java、C#/.NET——外加 pytest、JUnit/TestNG 和 CI 工作流 |
| 🔒  | **本地优先**——扫描时零网络调用、零遥测、几秒内完成                                                      |

### 规则

每条规则都带有必须触发（must-fire）**和**必须不触发（must-not-fire）的
固定样例。会触发自身负样例的规则不能发布——这就是假阳性防火墙。

<details>
<summary><strong>测试卫生</strong></summary>

| ID          | 规则                                                 | Severity |
| ----------- | ---------------------------------------------------- | -------- |
| QA-TEST-001 | 提交了聚焦测试（`.only`、`fit`）                     | error    |
| QA-TEST-002 | 无正当理由跳过的测试                                 | error    |
| QA-TEST-002 | 有记录理由的跳过测试                                 | warning  |
| QA-TEST-003 | 无断言的测试                                         | error    |
| QA-TEST-004 | 硬性 sleep（`waitForTimeout`、`sleep()`、`delay()`） | warning  |
| QA-TEST-006 | 用重试掩盖不稳定                                     | warning  |
| QA-TEST-010 | 空测试主体                                           | error    |

</details>

<details>
<summary><strong>测试质量</strong></summary>

| ID           | 规则                     | Severity |
| ------------ | ------------------------ | -------- |
| QA-TQUAL-001 | 仅用 mock 验证           | info     |
| QA-TQUAL-002 | 同义反复的断言           | error    |
| QA-TQUAL-009 | 未 await 的 promise 断言 | error    |
| QA-TQUAL-011 | 被注释掉的测试           | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | 规则                                  | Severity |
| --------- | ------------------------------------- | -------- |
| QA-PW-002 | 未 await 的 locator 断言              | error    |
| QA-PW-003 | 提交了 `page.pause()` / `test.only()` | error    |
| QA-PW-004 | 脆弱的 CSS/XPath 选择器               | warning  |
| QA-PW-005 | 在 `page.evaluate()` 中写业务逻辑     | info     |
| QA-PW-114 | 旧式元素句柄（`page.$`）              | info     |
| QA-PW-118 | `networkidle` 等待（天生不稳定）      | info     |
| QA-PW-123 | 硬编码的环境 URL                      | warning  |

</details>

<details>
<summary><strong>CI 完整性</strong></summary>

| ID        | 规则                                               | Severity |
| --------- | -------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` 掩盖失败                       | error    |
| QA-CI-002 | `\|\| true` 吞掉退出码                             | error    |
| QA-CI-005 | 消费报告却从不生成报告                             | error    |
| QA-CI-007 | 包在测试外面的重试包装                             | warning  |
| QA-CI-008 | 永远成功的步骤掩盖失败                             | error    |
| QA-CI-009 | 测试退出码未被传递（`\|` 没有 pipefail、`;` 串联） | error    |
| QA-CI-010 | 在必须拦截的地方跳过测试（skip-on-PR 守卫）        | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | 规则                                 | Severity |
| --------- | ------------------------------------ | -------- |
| QA-PY-002 | 跳过的测试（`skip`、非严格 `xfail`） | warning  |
| QA-PY-003 | 无断言的测试函数                     | error    |
| QA-PY-005 | 测试中的 `time.sleep()`              | warning  |
| QA-PY-006 | 空测试主体（`pass`）                 | info     |
| QA-PY-010 | 未冻结的随机/时间依赖                | info     |
| QA-PY-012 | 同义反复的断言                       | error    |

共 20 条 Python 规则（QA-PY-001…012 pytest 卫生 + QA-PY-101…108 Playwright-Python）。

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | 规则                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | 被禁用的测试（`@Disabled`）              | warning  |
| QA-JV-102 | 硬性 sleep（`Thread.sleep()`）           | warning  |
| QA-JV-103 | 无断言的测试方法                         | error    |
| QA-JV-105 | Playwright 硬性 sleep `waitForTimeout()` | warning  |
| QA-JV-106 | 脆弱选择器取代 role 定位器               | warning  |
| QA-JV-108 | 测试里硬编码的环境 URL                   | info     |
| QA-JV-111 | 全覆盖 mock `page.route("**")`           | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | 规则                                        | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-CS-101 | 跳过的测试（`[Ignore]`、`[Fact(Skip=)]`）   | warning  |
| QA-CS-102 | 硬性 sleep（`Thread.Sleep` / `Task.Delay`） | warning  |
| QA-CS-103 | 无断言的测试方法                            | error    |
| QA-CS-105 | 硬性 sleep `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | 脆弱选择器取代 role 定位器                  | warning  |
| QA-CS-108 | 测试里硬编码的环境 URL                      | info     |
| QA-CS-111 | 全覆盖 mock `page.RouteAsync("**")`         | info     |

</details>

> 完整的实时目录——每条规则的层级、置信度、假阳性风险与自动修复可用性——
> 由注册表生成：
>
> ```bash
> mjolnir rules --md
> ```
>
> 每条规则的页面位于 [`docs/rules/`](docs/rules/)。

### 这些规则中有多少经过测量

**99 条规则中有 74 条携带在真实 OSS 代码上测得的假阳性率**（每条 ≥ 10 个
人工分类的发现；见 [docs/FP-AUDIT.md](docs/FP-AUDIT.md)）。其余 19 条按
作者的估计发布。每次扫描的页脚都会告诉你，_触发过的_ 规则中有多少经过
测量；`mjolnir rules --unmeasured` 列出未测量的；每条规则的
`mjolnir explain` 页面都声明其状态。即使数字难看我们也照样公布——
QA-CS-103 的实测假阳性率是 95%，因此被隔离。把这个 78 扩大，是项目的
持续性工作。

### 规则层级与语言成熟度

每条规则都是 `core`、`extended` 或 `quarantine`，依据其**实测**假阳性率
分配：

| 层级         | 含义                           | 默认扫描 | `--strict` |
| ------------ | ------------------------------ | :------: | :--------: |
| `core`       | 实测 FP ≤ 10 %                 |    ✅    |     ✅     |
| `extended`   | 实测 FP ≤ 30 %                 |    ✅    |     ✅     |
| `quarantine` | 高于 30%，或尚未测量（n < 10） |    ❌    |     ✅     |

| 语言            | 适配器     | 当前覆盖                                     |
| --------------- | ---------- | -------------------------------------------- |
| TypeScript / JS | 编译器 AST | 最广、测量最多——主要为 `core`/`extended`     |
| Python / pytest | 正则层     | 广泛、经语料库审计——主要为 `core`/`extended` |
| Java            | 正则层     | 较新——主要为 `extended`/`quarantine`         |
| C# / .NET       | 正则层     | 较新——主要为 `extended`/`quarantine`         |

TypeScript 与 Python 拥有最广的实测覆盖。Java 与 C# 已发布、有文档，
但在真实的消费方套件（不是绑定库自己的测试）接受审计之前，不进入主打
数字。

---

## 评分如何运作

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir 终端输出——WORTHINESS 75/100 NEEDS WORK，按类目拆分的诊断与 FIX THIS FIRST 清单" width="820" />
</p>

<sub>通过 `npm run docs:hero` 重新生成；
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
会在产物与 reporter 实际打印内容发生偏差时令 CI 失败。</sub>

分数是透明的：**error −8、warning −3、info −1**，然后按套件暴露度
（每条测试声明的扣分）归一化。按证据加权的扣分意味着弱信号代价更低。
终端显示的正是评分所用的同一批折后数字——没有黑箱。完整方法：
[docs/SCORING.md](docs/SCORING.md)。

**判定**

| Score   | 判定             |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**证据等级**——每条发现携带一个；它决定该发现在分数中的权重：

| 等级 | 含义       | 对分数的影响 | 示例                                     |
| ---- | ---------- | ------------ | ---------------------------------------- |
| E2   | 确定性缺陷 | 全额扣分     | 提交了 `.only`——结构上可证明             |
| E1   | 启发式模式 | 一半扣分     | 正则匹配到 `sleep()`——信号强烈，但非证明 |
| E0   | 观察       | 零（仅提示） | 只报告，从不为 CI 设门，也不扣分         |

大多数规则是 **E1**。标语「we prove it」指的就是这套系统：E2 发现是
结构性证明；E1 发现是位置恰当的警告，不是形式化证明。

空仓库的分数是 `null`，绝不是虚假的 100——见
[信任模型](#信任模型)。

---

## 🎭 Selector Health Score

Playwright 套件的头号指标——你的定位器有多抗造：

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

基于角色的定位器拿满。CSS 类链与 XPath 会拖垮分数——它们在任何 DOM
重构时都会断，却不会告诉你是哪个行为回归了。

---

## 🔬 运行时证据

静态不稳定性检测只是猜测。Mjölnir 读取**真实执行数据**——任何 runner
产出的 Playwright JSON 报告和 JUnit XML：

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

只在第 ≥ 2 次尝试才通过的测试不是通过的测试——那是碰运气的测试。无论
最终的绿勾如何，它都会被标记为 `TRUE-FLAKE`。

---

## ⚡ Mjölnir 不是又一个 linter

Linter 告诉你代码是否守规矩。Mjölnir 告诉你你的验证能不能被信任。

|                                                     | ESLint / SonarQube | 覆盖率工具 | 人工评审 | **Mjölnir** |
| --------------------------------------------------- | :----------------: | :--------: | :------: | :---------: |
| CI 工作流完整性（`continue-on-error`、`\|\| true`） |         ❌         |     ❌     |   罕见   |     ✅      |
| 一个工具覆盖多语言（TS、Python、Java、C#）          |         ❌         |     ❌     |    ❌    |     ✅      |
| 为 Playwright 定位器的韧性评级（Selector Health）   |         ❌         |     ❌     |   罕见   |     ✅      |
| 标出没有真实断言的测试                              |    ✅（插件）\*    |     ❌     |   偶尔   |     ✅      |
| 抓出硬性 sleep（`waitForTimeout`、`time.sleep`）    |    ✅（插件）\*    |     ❌     |   偶尔   |     ✅      |
| 几秒内运行、扫描时零网络调用                        |         ✅         |     ✅     |    —     |     ✅      |

\*`eslint-plugin-jest`（`expect-expect`）与
`eslint-plugin-playwright`（`expect-expect`、`no-wait-for-timeout`）
为其各自框架覆盖了这些。

**运行时分析**是与静态 lint 并列的独立类别：

|                                          | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ---------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| 读取真实运行数据以得出 `TRUE-FLAKE` 判定 |          部分\*           |     部分（标签）      |          ✅           |
| 基于执行历史的不稳定分诊报告             |            ❌             |          ✅           |          ✅           |
| 与静态可信度评分集成                     |            ❌             |          ❌           |          ✅           |

\*Playwright 内部跟踪重试，但不会产出带判定标签的独立不稳定报告。

---

## 🤖 为什么不直接用 AI 代码评审？

问题不同、层面不同。AI 评审能在 diff 里发现可疑的测试改动；但它无法
证明整个验证系统值得信任——而且它只看到你展示给它的 diff。

|                               | AI 代码评审（Copilot 等） |        **Mjölnir**        |
| ----------------------------- | :-----------------------: | :-----------------------: |
| 每次扫描成本                  | Token（随 diff 大小增长） |  **零**（本地、已安装）   |
| 看到整个套件 + 所有 CI 配置   |   只有你展示的 PR diff    |     **每次都是全部**      |
| 确定性（相同输入 → 相同输出） |      ❌（非确定性）       |          **✅**           |
| 抓出沉睡数月的模式            |    只在其进入上下文时     |  **✅**（扫描所有文件）   |
| 跨运行记住发现                |   ❌（会话间没有记忆）    | **✅**（baseline + diff） |
| 无人触发也能运行              |     需要 PR 或提示词      |  **✅**（CI 钩子，3 秒）  |

**两者都用。** AI 能捕捉任何正则都找不到的细微差别、意图与设计缺陷。
Mjölnir 捕捉 AI 因其看起来「像是有意为之」而放过的结构模式——提交进
仓库的 `.only`、被吞掉的退出码、测试任务上的 `continue-on-error`。
这些不是需要推理的 bug；它们是需要扫描的事实。

---

## 🤖 CI 集成

一条命令生成 PR 工作流——默认建议性，绝不阻塞：

```bash
mjolnir ci install
```

或者通过 SARIF 原生接入 GitHub Code Scanning：

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

SARIF 的编辑器与流水线配置：[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)。

### 变更范围的覆盖

`--scope changed` 把发现归因于你的分支相对 `main` 合并基新增的行。它
覆盖测试文件（`*.spec.*`、`*.test.*`），以及 diff 中的 GitHub 工作流
文件和 Playwright 配置。当合并基无法解析——浅克隆、detached HEAD、
非 git 目标、默认分支不同——它会诚实地降级：发现回退到整文件归因，
报告会说明这一点。用 `--base <ref>` 覆盖基线引用。

---

## 配置

Mjölnir 是零配置的。仓库根目录下可选的 `mjolnir.config.json`（或
`.mjolnir.json`）可以微调严重级别、门禁与范围——它从不改变检测语义。

| 键                  | 类型                                 | 作用                                                                                                           |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | 额外的忽略 glob（gitignore 子集），叠加在内建默认之上                                                          |
| `gate`              | `"advisory" \| "error" \| "warning"` | 哪些严重级别以非零码退出（默认 `error`；`advisory` 绝不阻塞）                                                  |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | 为你的仓库重新排列某条规则的发现                                                                               |
| `ignore`            | `IgnoreEntry[]`                      | 压制发现——**`reason` 必填**；条目 90 天后过期（显式的 `expires` 日期，或未注明时以配置文件的最后修改时间为准） |
| `plugins`           | `string[]`                           | 第三方规则包（见[信任模型](#信任模型)）                                                                        |

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

- **`.mjolnirignore`**——用于路径排除的纯 gitignore 风格文件，与
  `exclude` 同一语法。机器级的噪音用它；当清单应当随其余配置一起进入
  版本控制时用 `exclude`。
- **CLI 覆盖**——`--strict`（包含隔离层规则）、`--width <cols>` 与
  `--ascii` / `--no-ascii`（终端渲染）、`--tone blunt`（更生硬的措辞）、
  `--max-duration <sec>`（限时部分扫描）。
- 规则压制与弃用生命周期：[docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)。

`ignore` 条目也为独立命令 `mjolnir suppressions` 提供数据，该命令列出
当前被压制的项以及每条的过期时间。

---

## 📐 退出码与契约

冻结——可以放心在其上构建 CI 逻辑：

| 退出码 | 含义                                           |
| ------ | ---------------------------------------------- |
| `0`    | 干净——没有达到或超过门禁的发现                 |
| `1`    | 存在达到或超过门禁的发现                       |
| `2`    | 部分扫描（时间预算用尽、文件不可读）——绝不阻塞 |
| `10`   | 用法错误（错误的标志、缺少目标）               |
| `20`   | 内部错误                                       |

JSON/SARIF 报告为 `schemaVersion: 1`。规则 ID（`QA-<FAMILY>-NNN`）一经
发布即不可变，且绝不复用。

---

## 信任模型

- **本地优先**——扫描期间零网络调用。任何时候都是。零遥测。
- **不做虚假证明**——我们宁可说「未知」也不说「已验证」。空仓库得到
  `score: null`，绝不是虚假的 100。
- **部分诚实**——如果分析被截断，输出会说明。绝不会在未完成时声称
  「complete」。
- **假阳性防火墙**——检测在去除注释/字符串的代码视图上运行
  （TypeScript 规则使用编译器 AST）：出现在散文注释或文档示例字符串中
  的模式是文档，不是发现。
- **测量，而非断言**——只有具有来自真实 OSS 代码的假阳性率的规则才
  进入主打层级（见[这些规则中有多少经过测量](#这些规则中有多少经过测量)）；
  扫描页脚和 `mjolnir rules --unmeasured` 会告诉你哪条是哪条。
- **插件信任**——插件是在 `"plugins"` 下声明的 npm 包。**没有沙箱**：
  插件代码以完整 Node 特权运行，与 ESLint 或 Vitest 插件相同的信任
  模型。核心规则 ID 前缀是保留的，插件若使用将被拒绝以防伪装。
- **工作区本地外部规则**（基于文件夹、零网络）——扫描目标旁的
  `mjolnir-rules/` 目录可加载自定义规则：JSON 文件声明正则模式（不执行
  代码），`.mjs`/`.js` 模块导出 `rules`（完整 Node 信任，同插件）。外部
  规则携带与核心相同的信任元数据；它们绝不能进入核心层级（核心要求
  来自语料库侧文件的实测 FP 率——声明的 `tier: "core"` 会被压到
  `extended`），遵守层级上限，并做漂移检查：`mjolnir rules --md --external`
  从加载的文件渲染目录（来源 `external`），矩阵生成器接受 `--external <root>`。

---

## 🏗️ 架构

<details>
<summary>展开目录树</summary>

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

- **规则是纯函数**——`(SourceFileContext) → Finding[]`，无 I/O，无
  全局状态。增加一个生态 = 一个适配器 + 它的规则。
- **TypeScript/Playwright 使用编译器 AST**（ts-morph）。Python、Java 与
  C# 运行在共享的、屏蔽注释/字符串的正则层上。
- 面向 Java 与 C# 的 tree-sitter WASM AST 层已存在，是下一步的精度
  提升——尚未接入同步扫描管线。

---

## 📚 文档

| 文档                                                   | 内容                        |
| ------------------------------------------------------ | --------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | 分数归一化 + 证据加权       |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 实测假阳性率 + 方法         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | 规则状态、压制、弃用        |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 输出 + 编辑器/CI 配置 |
| [docs/rules/](docs/rules/)                             | 生成的逐规则目录            |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 开发环境 + 贡献流程         |
| [CHANGELOG.md](CHANGELOG.md)                           | 发布历史                    |
| [SECURITY.md](SECURITY.md)                             | 漏洞报告                    |

---

## 📈 状态

**v0.5.x · 公开测试。** JSON 模式与退出码是冻结的契约。TypeScript 与
Python 的实测覆盖最广；Java 与 C# 较新——请通过
[层级表](#规则层级与语言成熟度)阅读。

---

## 🤝 贡献

新规则是最容易迈出的第一步——一条命令即可脚手架出规则及其必须触发
**和**必须不触发的固定样例（生成的规则会故意在样例上失败，直到你实现
真正的检测——占位桩无法发布）：

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

完整的开发环境、常设门禁命令以及防蔓延 / 样例防火墙法则都在
[CONTRIBUTING.md](CONTRIBUTING.md)。

---

<div align="center">

**别再发布你无法信任的测试了。**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

由 [Sergey Bar](https://www.linkedin.com/in/sergeybar/) 构建

</div>
