<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### 你的測試在對你說謊。我們來證明它。

**為 QA 打造的 Verification Trust Engine。** Mjölnir 審計測試套件與 CI
管線，給出可信度評分，並精確指出信任在哪裡斷裂。

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | 繁體中文 | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**你的測試值得信任嗎？**

[看它如何運作](#-看它如何運作) ·
[快速上手](#-快速上手) ·
[它檢查什麼](#-mjölnir-檢查什麼) ·
[評分](#評分如何運作) ·
[CI](#-ci-整合) · [設定](#設定) ·
[文件](#-文件)

</div>

---

## 🎬 看它如何運作

<p align="center">
  <img src="assets/readme/demo.svg" alt="Mjölnir 對示範倉庫的完整 --verbose 報告：WORTHINESS 75/100 NEEDS WORK，按類別拆解的診斷、FIX THIS FIRST 清單，以及每一項發現附帶的規則 ID 與行號——涵蓋 CI、Playwright、測試衛生與 Python 規則" width="900" />
</p>

<sub>`npx mjolnir-qa ./examples/demo-repo --verbose` 的完整輸出，由真實
reporter 渲染——毫無刪減。以 `npm run docs:demo` 重新產生；
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
會在產物與工具實際印出的內容發生偏移時讓 CI 失敗。</sub>

**剛才發生了什麼：**

1. Mjölnir 發現了 Playwright 規格檔、它的設定、CI 工作流程與一個
   Python 測試檔——四種語言/格式，一趟掃描。
2. 它找到了削弱對測試套件信任的證據——掩蓋工作失敗的
   `continue-on-error`、吞掉結束碼的 `|| true`、硬式 sleep、脆弱的
   選擇器、寫死的 staging URL、`networkidle` 等待。
3. 它把每一項變成帶有規則 ID、位置與修復方式的具體發現——以及一個你
   可以用來為 PR 設門檻的單一分數。

### 近看一項發現

對上面第一項發現執行 `mjolnir explain QA-CI-001`，你會得到：

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

這就是價值的單位：不是風格上的挑剔，而是你的 CI 聲稱某件事通過了、
實際上卻沒通過的那個位置。

---

## ⚡ 快速上手

對一個儲存庫執行它，取得完整報告與可信度評分：

```bash
npx mjolnir-qa@latest
```

**在 CI 中，產品就是一條命令。** 它只掃描分支更動的內容，出現新問題時
以非零碼結束：

```bash
npx mjolnir-qa@latest --scope changed
```

把它放進 PR 檢查——`mjolnir ci install` 會寫好工作流程——就完成了。
其餘一切都是選用的。

| 指令                                | 作用                                              |
| ----------------------------------- | ------------------------------------------------- |
| `mjolnir`                           | 全儲存庫掃描 + 可信度評分                         |
| `mjolnir --scope changed`           | 只看你分支引入的內容——CI 形態                     |
| `mjolnir ci install`                | 產生建議性的 PR 工作流程                          |
| `mjolnir explain QA-CI-001`         | 是什麼 / 為什麼 / 如何修復 + 單一規則的實測 FP 率 |
| `mjolnir rules --unmeasured`        | 列出按假設而非測量運作的規則                      |
| `mjolnir --json` / `--format sarif` | 機器可讀 / GitHub Code Scanning                   |
| `mjolnir --strict`                  | 同時執行隔離層（quarantine）規則（FP 風險較高）   |

<details>
<summary><strong>當某個測試不穩定時</strong></summary>

| 指令                                | 作用                                             |
| ----------------------------------- | ------------------------------------------------ |
| `mjolnir forensics ./test-results/` | 真實執行資料 → `TRUE-FLAKE` 判定，`FLAKY.md`     |
| `mjolnir triage ./test-results/`    | 依執行歷史提出隔離建議                           |
| `mjolnir pw-report ./test-results/` | Playwright 執行摘要——重試 / 不穩定 / 最慢        |
| `mjolnir doctor:playwright`         | 僅 Playwright 的深度掃描 + Selector Health Score |

</details>

<details>
<summary><strong>偶爾使用 / 報告類</strong></summary>

| 指令                            | 作用                                    |
| ------------------------------- | --------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | 帶證據的安全自動修復                    |
| `mjolnir baseline` / `diff`     | 先為發現拍照存證，之後只報告新增/惡化項 |
| `mjolnir impact --since <ref>`  | 自某個先前的提交以來改變了什麼          |
| `mjolnir debt`                  | 帶成本模型的測試債登記簿                |
| `mjolnir handover`              | 為新 QA 提供的套件上手地圖              |
| `mjolnir stats`                 | 本地統計所見過修復的累計計數            |
| `mjolnir badge`                 | shields.io 端點 JSON + 程式碼片段       |
| `mjolnir rules --md`            | 完整規則目錄（JSON 或 Markdown）        |
| `mjolnir doctor`                | 對 Mjölnir 自身規則庫的自審             |
| `mjolnir create-rule <ID>`      | 鷹架產生新規則 + 固定樣本               |
| `mjolnir --format mermaid`      | 用於 PR 留言的測試架構圖                |

</details>

如果你偏好，可以全域安裝而不是 `npx`：`npm i -g mjolnir-qa`。
需要 Node.js ≥ 22.18。支援 Windows、macOS 與 Linux。

---

## 👥 這是為誰而做？

- **QA / SDET**——擁有 e2e 或整合測試套件，需要證據證明套件確實配得上
  它產出的綠色勾勾。
- **平台 / DevEx 團隊**——負責 CI 完整性與發布門檻；他們在乎
  `continue-on-error` 絕不能悄悄把紅色管線塗成綠色。
- **OSS 維護者**——想要一個便宜、常駐開啟、可在本機與 CI 執行且零
  網路呼叫的驗證門檻。

---

## 🔨 Mjölnir 檢查什麼

|     |                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------- |
| ⚖️  | **可信度評分**——一個數字、透明的扣分表、沒有黑箱                                                          |
| 🎭  | **Selector Health Score**——為你的 Playwright 定位器評級，而不只是通過率                                   |
| 🔬  | **執行期鑑識**——讀取真實的 Playwright/JUnit 執行資料來捕捉 `TRUE-FLAKE`，而不只是靜態猜測                 |
| 🚨  | **CI 完整性規則**——抓出 `continue-on-error`、`\|\| true` 等假綠花招                                       |
| 🐍  | **全部四種 Playwright 綁定**——TypeScript、Python、Java、C#/.NET——外加 pytest、JUnit/TestNG 與 CI 工作流程 |
| 🔒  | **本機優先**——掃描時零網路呼叫、零遙測、數秒內完成                                                        |

### 規則

每條規則都帶有必須觸發（must-fire）**與**必須不觸發（must-not-fire）的
固定樣本。會觸發自身負樣本的規則不能發布——這就是假陽性防火牆。

<details>
<summary><strong>測試衛生</strong></summary>

| ID          | 規則                                                 | Severity |
| ----------- | ---------------------------------------------------- | -------- |
| QA-TEST-001 | 提交了聚焦測試（`.only`、`fit`）                     | error    |
| QA-TEST-002 | 無正當理由跳過的測試                                 | error    |
| QA-TEST-002 | 有紀錄理由的跳過測試                                 | warning  |
| QA-TEST-003 | 無斷言的測試                                         | error    |
| QA-TEST-004 | 硬式 sleep（`waitForTimeout`、`sleep()`、`delay()`） | warning  |
| QA-TEST-006 | 用重試掩蓋不穩定                                     | warning  |
| QA-TEST-010 | 空測試主體                                           | error    |

</details>

<details>
<summary><strong>測試品質</strong></summary>

| ID           | 規則                     | Severity |
| ------------ | ------------------------ | -------- |
| QA-TQUAL-001 | 僅用 mock 驗證           | info     |
| QA-TQUAL-002 | 同義反覆的斷言           | error    |
| QA-TQUAL-009 | 未 await 的 promise 斷言 | error    |
| QA-TQUAL-011 | 被註解掉的測試           | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | 規則                                  | Severity |
| --------- | ------------------------------------- | -------- |
| QA-PW-002 | 未 await 的 locator 斷言              | error    |
| QA-PW-003 | 提交了 `page.pause()` / `test.only()` | error    |
| QA-PW-004 | 脆弱的 CSS/XPath 選擇器               | warning  |
| QA-PW-005 | 在 `page.evaluate()` 中寫商業邏輯     | info     |
| QA-PW-114 | 舊式元素控制代碼（`page.$`）          | info     |
| QA-PW-118 | `networkidle` 等待（天生不穩定）      | info     |
| QA-PW-123 | 寫死的環境 URL                        | warning  |

</details>

<details>
<summary><strong>CI 完整性</strong></summary>

| ID        | 規則                                               | Severity |
| --------- | -------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` 掩蓋失敗                       | error    |
| QA-CI-002 | `\|\| true` 吞掉結束碼                             | error    |
| QA-CI-005 | 消費報告卻從不產生報告                             | error    |
| QA-CI-007 | 包在測試外面的重試包裝                             | warning  |
| QA-CI-008 | 永遠成功的步驟掩蓋失敗                             | error    |
| QA-CI-009 | 測試結束碼未被傳遞（`\|` 沒有 pipefail、`;` 串接） | error    |
| QA-CI-010 | 在必須攔截的地方跳過測試（skip-on-PR 防護）        | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | 規則                                 | Severity |
| --------- | ------------------------------------ | -------- |
| QA-PY-002 | 跳過的測試（`skip`、非嚴格 `xfail`） | warning  |
| QA-PY-003 | 無斷言的測試函式                     | error    |
| QA-PY-005 | 測試中的 `time.sleep()`              | warning  |
| QA-PY-006 | 空測試主體（`pass`）                 | info     |
| QA-PY-010 | 未凍結的隨機/時間依賴                | info     |
| QA-PY-012 | 同義反覆的斷言                       | error    |

共 20 條 Python 規則（QA-PY-001…012 pytest 衛生 + QA-PY-101…108 Playwright-Python）。

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | 規則                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | 被停用的測試（`@Disabled`）              | warning  |
| QA-JV-102 | 硬式 sleep（`Thread.sleep()`）           | warning  |
| QA-JV-103 | 無斷言的測試方法                         | error    |
| QA-JV-105 | Playwright 硬式 sleep `waitForTimeout()` | warning  |
| QA-JV-106 | 脆弱選擇器取代 role 定位器               | warning  |
| QA-JV-108 | 測試裡寫死的環境 URL                     | info     |
| QA-JV-111 | 全覆蓋 mock `page.route("**")`           | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | 規則                                        | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-CS-101 | 跳過的測試（`[Ignore]`、`[Fact(Skip=)]`）   | warning  |
| QA-CS-102 | 硬式 sleep（`Thread.Sleep` / `Task.Delay`） | warning  |
| QA-CS-103 | 無斷言的測試方法                            | error    |
| QA-CS-105 | 硬式 sleep `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | 脆弱選擇器取代 role 定位器                  | warning  |
| QA-CS-108 | 測試裡寫死的環境 URL                        | info     |
| QA-CS-111 | 全覆蓋 mock `page.RouteAsync("**")`         | info     |

</details>

> 完整的即時目錄——每條規則的層級、信心度、假陽性風險與自動修復可用性——
> 由註冊表產生：
>
> ```bash
> mjolnir rules --md
> ```
>
> 每條規則的頁面位於 [`docs/rules/`](docs/rules/)。

### 這些規則中有多少經過測量

**99 條規則中有 74 條攜帶在真實 OSS 程式碼上測得的假陽性率**（每條 ≥ 10 個
人工分類的發現；見 [docs/FP-AUDIT.md](docs/FP-AUDIT.md)）。其餘 19 條按
作者的估計發布。每次掃描的頁尾都會告訴你，_觸發過的_ 規則中有多少經過
測量；`mjolnir rules --unmeasured` 列出未測量的；每條規則的
`mjolnir explain` 頁面都聲明其狀態。即使數字難看我們也照樣公布——
QA-CS-103 的實測假陽性率是 95%，因此被隔離。把這個 78 擴大，是專案的
持續性工作。

### 規則層級與語言成熟度

每條規則都是 `core`、`extended` 或 `quarantine`，依據其**實測**假陽性率
分配：

| 層級         | 意義                           | 預設掃描 | `--strict` |
| ------------ | ------------------------------ | :------: | :--------: |
| `core`       | 實測 FP ≤ 10 %                 |    ✅    |     ✅     |
| `extended`   | 實測 FP ≤ 30 %                 |    ✅    |     ✅     |
| `quarantine` | 高於 30%，或尚未測量（n < 10） |    ❌    |     ✅     |

| 語言            | 介接器       | 現行涵蓋                                     |
| --------------- | ------------ | -------------------------------------------- |
| TypeScript / JS | 編譯器 AST   | 最廣、測量最多——主要為 `core`/`extended`     |
| Python / pytest | 正規表達式層 | 廣泛、經語料庫稽核——主要為 `core`/`extended` |
| Java            | 正規表達式層 | 較新——主要為 `extended`/`quarantine`         |
| C# / .NET       | 正規表達式層 | 較新——主要為 `extended`/`quarantine`         |

TypeScript 與 Python 擁有最廣的實測涵蓋。Java 與 C# 已發布、有文件，
但在真實的消費方套件（不是綁定函式庫自己的測試）接受稽核之前，不進入
主打數字。

---

## 評分如何運作

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir 終端機輸出——WORTHINESS 75/100 NEEDS WORK，按類別拆解的診斷與 FIX THIS FIRST 清單" width="820" />
</p>

<sub>以 `npm run docs:hero` 重新產生；
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
會在產物與 reporter 實際印出的內容發生偏移時讓 CI 失敗。</sub>

分數是透明的：**error −8、warning −3、info −1**，然後依套件暴露度
（每筆測試宣告的扣分）正規化。按證據加權的扣分意味著弱訊號代價更低。
終端機顯示的正是評分所用的同一批折後數字——沒有黑箱。完整方法：
[docs/SCORING.md](docs/SCORING.md)。

**判定**

| Score   | 判定             |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**證據等級**——每項發現攜帶一個；它決定該發現在分數中的權重：

| 等級 | 意義       | 對分數的影響 | 範例                                           |
| ---- | ---------- | ------------ | ---------------------------------------------- |
| E2   | 確定性缺陷 | 全額扣分     | 提交了 `.only`——結構上可證明                   |
| E1   | 啟發式模式 | 一半扣分     | 正規表達式匹配到 `sleep()`——訊號強烈，但非證明 |
| E0   | 觀察       | 零（僅提示） | 只報告，從不為 CI 設門檻，也不扣分             |

大多數規則是 **E1**。標語「we prove it」指的就是這套系統：E2 發現是
結構性證明；E1 發現是位置恰當的警告，不是形式化證明。

空儲存庫的分數是 `null`，絕不是虛假的 100——見
[信任模型](#信任模型)。

---

## 🎭 Selector Health Score

Playwright 套件的首要指標——你的定位器有多耐操：

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

基於角色的定位器拿滿分。CSS 類別鏈與 XPath 會拖垮分數——它們在任何 DOM
重構時都會斷，卻不會告訴你是哪個行為回歸了。

---

## 🔬 執行期證據

靜態不穩定偵測只是猜測。Mjölnir 讀取**真實執行資料**——任何 runner
產出的 Playwright JSON 報告與 JUnit XML：

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

只在第 ≥ 2 次嘗試才通過的測試不是通過的測試——那是碰運氣的測試。無論
最終的綠勾如何，它都會被標記為 `TRUE-FLAKE`。

---

## ⚡ Mjölnir 不是又一個 linter

Linter 告訴你程式碼是否守規矩。Mjölnir 告訴你你的驗證能不能被信任。

|                                                       | ESLint / SonarQube | 涵蓋率工具 | 人工審查 | **Mjölnir** |
| ----------------------------------------------------- | :----------------: | :--------: | :------: | :---------: |
| CI 工作流程完整性（`continue-on-error`、`\|\| true`） |         ❌         |     ❌     |   罕見   |     ✅      |
| 一個工具涵蓋多語言（TS、Python、Java、C#）            |         ❌         |     ❌     |    ❌    |     ✅      |
| 為 Playwright 定位器的韌性評級（Selector Health）     |         ❌         |     ❌     |   罕見   |     ✅      |
| 標出沒有真實斷言的測試                                |    ✅（外掛）\*    |     ❌     |   偶爾   |     ✅      |
| 抓出硬式 sleep（`waitForTimeout`、`time.sleep`）      |    ✅（外掛）\*    |     ❌     |   偶爾   |     ✅      |
| 數秒內執行、掃描時零網路呼叫                          |         ✅         |     ✅     |    —     |     ✅      |

\*`eslint-plugin-jest`（`expect-expect`）與
`eslint-plugin-playwright`（`expect-expect`、`no-wait-for-timeout`）
為其各自框架涵蓋了這些。

**執行期分析**是與靜態 lint 並列的獨立類別：

|                                          | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ---------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| 讀取真實執行資料以得出 `TRUE-FLAKE` 判定 |          部分\*           |     部分（標籤）      |          ✅           |
| 基於執行歷史的不穩定分診報告             |            ❌             |          ✅           |          ✅           |
| 與靜態可信度評分整合                     |            ❌             |          ❌           |          ✅           |

\*Playwright 內部追蹤重試，但不會產出帶判定標籤的獨立不穩定報告。

---

## 🤖 為什麼不直接用 AI 程式碼審查？

問題不同、層面不同。AI 審查能在 diff 裡發現可疑的測試改動；但它無法
證明整個驗證系統值得信任——而且它只看到你展示給它的 diff。

|                               | AI 程式碼審查（Copilot 等） |        **Mjölnir**        |
| ----------------------------- | :-------------------------: | :-----------------------: |
| 每次掃描成本                  |  Token（隨 diff 大小成長）  |  **零**（本機、已安裝）   |
| 看到整個套件 + 所有 CI 設定   |    只有你展示的 PR diff     |     **每次都是全部**      |
| 確定性（相同輸入 → 相同輸出） |       ❌（非確定性）        |          **✅**           |
| 抓出沉睡數月的模式            |     只在其進入上下文時      |  **✅**（掃描所有檔案）   |
| 跨執行記住發現                | ❌（工作階段之間沒有記憶）  | **✅**（baseline + diff） |
| 無人觸發也能執行              |      需要 PR 或提示詞       |  **✅**（CI 掛鉤，3 秒）  |

**兩者都用。** AI 能捕捉任何正規表達式都找不到的細微差異、意圖與設計
缺陷。Mjölnir 捕捉 AI 因其看起來「像是有意為之」而放過的結構模式——提交
進倉庫的 `.only`、被吞掉的結束碼、測試工作上的 `continue-on-error`。
這些不是需要推理的 bug；它們是需要掃描的事實。

---

## 🤖 CI 整合

一條命令產生 PR 工作流程——預設建議性，絕不阻塞：

```bash
mjolnir ci install
```

或者透過 SARIF 原生接上 GitHub Code Scanning：

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

SARIF 的編輯器與管線設定：[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)。

### 變更範圍的涵蓋

`--scope changed` 把發現歸因於你的分支相對 `main` 合併基新增的行。它
涵蓋測試檔（`*.spec.*`、`*.test.*`），以及 diff 中的 GitHub 工作流程
檔與 Playwright 設定。當合併基無法解析——淺層複製、detached HEAD、
非 git 目標、預設分支不同——它會誠實地降級：發現回退到整檔歸因，
報告會說明這一點。用 `--base <ref>` 覆寫基準參照。

---

## 設定

Mjölnir 是零設定的。儲存庫根目錄下選用的 `mjolnir.config.json`（或
`.mjolnir.json`）可以微調嚴重度、門檻與範圍——它從不改變偵測語義。

| 鍵                  | 類型                                 | 作用                                                                                                         |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `exclude`           | `string[]`                           | 額外的忽略 glob（gitignore 子集），疊加在內建預設之上                                                        |
| `gate`              | `"advisory" \| "error" \| "warning"` | 哪些嚴重度以非零碼結束（預設 `error`；`advisory` 絕不阻塞）                                                  |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | 為你的儲存庫重新排列某條規則的發現                                                                           |
| `ignore`            | `IgnoreEntry[]`                      | 壓制發現——**`reason` 必填**；條目 90 天後過期（明確的 `expires` 日期，或未註明時以設定檔的最後修改時間為準） |
| `plugins`           | `string[]`                           | 第三方規則套件（見[信任模型](#信任模型)）                                                                    |

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

- **`.mjolnirignore`**——用於路徑排除的純 gitignore 風格檔案，與
  `exclude` 同一語法。機器層級的雜訊用它；當清單應當與其餘設定一起進入
  版本控制時用 `exclude`。
- **CLI 覆寫**——`--strict`（包含隔離層規則）、`--width <cols>` 與
  `--ascii` / `--no-ascii`（終端機渲染）、`--tone blunt`（更生硬的措辭）、
  `--max-duration <sec>`（限時部分掃描）。
- 規則壓制與棄用生命週期：[docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)。

`ignore` 條目也為獨立命令 `mjolnir suppressions` 提供資料，該命令列出
目前被壓制的項目以及每一條的過期時間。

---

## 📐 結束碼與契約

凍結——可以放心在其上建構 CI 邏輯：

| 結束碼 | 意義                                           |
| ------ | ---------------------------------------------- |
| `0`    | 乾淨——沒有達到或超過門檻的發現                 |
| `1`    | 存在達到或超過門檻的發現                       |
| `2`    | 部分掃描（時間預算用盡、檔案不可讀）——絕不阻塞 |
| `10`   | 用法錯誤（錯誤的旗標、缺少目標）               |
| `20`   | 內部錯誤                                       |

JSON/SARIF 報告為 `schemaVersion: 1`。規則 ID（`QA-<FAMILY>-NNN`）一經
發布即不可變，且絕不重複使用。

---

## 信任模型

- **本機優先**——掃描期間零網路呼叫。任何時候都是。零遙測。
- **不做虛假證明**——我們寧可說「未知」也不說「已驗證」。空儲存庫得到
  `score: null`，絕不是虛假的 100。
- **部分誠實**——如果分析被截斷，輸出會說明。絕不會在未完成時聲稱
  「complete」。
- **假陽性防火牆**——偵測在去除註解/字串的程式碼視圖上運行
  （TypeScript 規則使用編譯器 AST）：出現在散文註解或文件範例字串中的
  模式是文件，不是發現。
- **測量，而非斷言**——只有具有來自真實 OSS 程式碼的假陽性率的規則才
  進入主打層級（見[這些規則中有多少經過測量](#這些規則中有多少經過測量)）；
  掃描頁尾與 `mjolnir rules --unmeasured` 會告訴你哪條是哪條。
- **外掛信任**——外掛是在 `"plugins"` 下宣告的 npm 套件。**沒有沙箱**：
  外掛程式碼以完整 Node 權限執行，與 ESLint 或 Vitest 外掛相同的信任
  模型。核心規則 ID 前綴是保留的，外掛若使用將被拒絕以防偽冒。
- **工作區本機外部規則**（基於資料夾、零網路）——掃描目標旁的
  `mjolnir-rules/` 目錄可載入自訂規則：JSON 檔宣告正規表達式模式（不執行
  程式碼），`.mjs`/`.js` 模組匯出 `rules`（完整 Node 信任，同外掛）。外部
  規則攜帶與核心相同的信任中繼資料；它們絕不能進入核心層級（核心要求
  來自語料庫側檔的實測 FP 率——宣告的 `tier: "core"` 會被壓到
  `extended`），遵守層級上限，並做漂移檢查：`mjolnir rules --md --external`
  從載入的檔案渲染目錄（來源 `external`），矩陣產生器接受 `--external <root>`。

---

## 🏗️ 架構

<details>
<summary>展開目錄樹</summary>

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

- **規則是純函式**——`(SourceFileContext) → Finding[]`，無 I/O，無
  全域狀態。增加一個生態系 = 一個介接器 + 它的規則。
- **TypeScript/Playwright 使用編譯器 AST**（ts-morph）。Python、Java 與
  C# 執行在共用的、遮蔽註解/字串的正規表達式層上。
- 針對 Java 與 C# 的 tree-sitter WASM AST 層已存在，是下一步的精度
  提升——尚未接入同步掃描管線。

---

## 📚 文件

| 文件                                                   | 內容                        |
| ------------------------------------------------------ | --------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | 分數正規化 + 證據加權       |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 實測假陽性率 + 方法         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | 規則狀態、壓制、棄用        |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 輸出 + 編輯器/CI 設定 |
| [docs/rules/](docs/rules/)                             | 產生的逐規則目錄            |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 開發環境 + 貢獻流程         |
| [CHANGELOG.md](CHANGELOG.md)                           | 發布歷史                    |
| [SECURITY.md](SECURITY.md)                             | 漏洞回報                    |

---

## 📈 狀態

**v0.5.x · 公開測試。** JSON 結構與結束碼是凍結的契約。TypeScript 與
Python 的實測涵蓋最廣；Java 與 C# 較新——請透過
[層級表](#規則層級與語言成熟度)閱讀。

---

## 🤝 貢獻

新規則是最容易踏出的第一步——一條命令即可鷹架出規則及其必須觸發
**和**必須不觸發的固定樣本（產生的規則會故意在樣本上失敗，直到你實作
真正的偵測——佔位樁無法發布）：

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

完整的開發環境、常設門檻命令以及防蔓延 / 樣本防火牆法則都在
[CONTRIBUTING.md](CONTRIBUTING.md)。

---

<div align="center">

**別再發布你無法信任的測試了。**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

由 [Sergey Bar](https://www.linkedin.com/in/sergeybar/) 建構

</div>
