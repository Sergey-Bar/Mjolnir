<div align="center">

<img src="assets/readme/hero.svg" alt="QA Doctor。測試告訴你什麼通過了。QA Doctor 告訴你什麼值得信任。" width="100%" />

<br />

QA Doctor 找出不可能失敗的測試和不可能變紅的流水線，<br />
再評估結果可信到什麼程度，每一分都附有證據。

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

[實際效果](#實際效果) · [快速開始](#快速開始) · [能發現什麼](#qa-doctor-能發現什麼) · [評分](#可信度評分) · [證據](#證據模型) · [執行鑑識](#執行時鑑識) · [CI](#ci-完整性) · [代理](#ai-代理) · [安全](#信任與安全) · [局限](#qa-doctor-無法告訴你的事) · [文件](#文件)

<details>
<summary>閱讀其他語言版本 — 22 種譯文</summary>

[English](README.md) | [简体中文](README.zh.md) | 繁體中文 | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## 綠色勾號是一種聲明，而不是證明

綠色勾號只說明流水線沒有失敗。它並不說明測試真的執行了，也不說明它們有可能失敗。以下每一種情況都會顯示為綠色：

- 提交進儲存庫的 `.only`，只執行了 3 個測試而不是 900 個
- 本應攔截的 job 上寫著 `continue-on-error: true`
- 測試指令後面的 `|| true`
- 什麼都不斷言、或者測試本體為空的測試
- 把真實失敗變成僥倖通過的重試包裝
- workflow 上傳了、卻從未產生過的報告
- 靠固定 sleep 勉強撐住的競態條件

它們都不會讓流水線變紅，而且在審查中每一個看起來都像是刻意為之。所以它們才能存活下來。以下是 QA Doctor 讀取一個真實案例：

<p align="center">
  <img src="assets/readme/scan.svg" alt="示範儲存庫的 CI workflow，逐行讀取。QA Doctor 在回報的那一行標出每一項發現，附上它的規則、問題所在、證據等級以及實測誤報率。" width="800" />
</p>

<sub>示範掃描為此 workflow 回報的每一項發現，都標在回報的那一行。由 `npm run docs:readme-brand` 根據 [`demo-report.json`](assets/readme/demo-report.json) 產生，並在 CI 中鎖定以防漂移。</sub>

**嚴格模式。** 最激進的偵測——`.only`、`continue-on-error`、空測試、濫用重試——位於隔離層。它們僅在 `--strict` 下執行，且限定為 `info` 嚴重性：只標記，從不攔截。預設掃描（不帶 `--strict` 的 `npx qa-doctor-cli@latest`）僅涵蓋核心和擴充規則。需要諮詢層時，加上 `--strict`。

QA Doctor 讀取測試套件、CI workflow，以及（如果有的話）一次真實執行的報告。它不會執行你的測試，不會安裝你的相依套件，也不會執行它掃描的程式碼。當它沒有證據時，它會直說，而不是捏造信心：

| 情況                                       | QA Doctor 的回報                                      |
| ------------------------------------------ | ----------------------------------------------------- |
| 找不到測試宣告                             | 評分為 `null`，顯示為 **UNKNOWN**。絕不捏造一個 100。 |
| 沒有基準線或可比較的版本                   | **UNKNOWN**，並寫明原因。絕不假定為 0。               |
| 掃描中途終止（時間預算用盡、檔案無法讀取） | **PARTIAL**，結束碼 `2`。絕不呈現為乾淨結果。         |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="QA Doctor 的運作方式。它以靜態方式讀取測試套件和 CI 流水線，在有真實執行報告時也會讀取該報告。它依證據等級和信任等級為每項發現加權，其中只有真實執行才能達到 L3 到 L5，最終產出發現、可信度評分，以及基於凍結結束碼的 CI 關卡。在代理循環中，AI 撰寫修正，QA Doctor 重新掃描來證明它。" width="880" />
</p>

<sub>為本頁面設計並以 1:1 顯示。由 `npm run docs:readme-brand` 產生，並在 CI 中鎖定以防漂移；評分、計數和規則 ID 來自 [`script.demo.json`](assets/video/script.demo.json)、[`demo-report.json`](assets/readme/demo-report.json) 和規則登錄表，從不手動輸入。同一張圖的海報版本：[`architecture.svg`](assets/readme/architecture.svg)。</sub>

<br />

## 實際效果

對 [`examples/demo-repo`](examples/demo-repo) 的一次真實掃描，這是一個附帶 CI workflow 的小型 Playwright 套件。它的分數都扣在了這裡：

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="QA Doctor 的扣分明細：WORTHINESS 80/100 WORTHY、依類別的評分、依嚴重程度的扣分框，以及 FIX THIS FIRST 清單" width="520" />
</p>

<sub>由 `npm run docs:hero` 根據一次真實掃描產生，並在 CI 中鎖定以防漂移。同一次掃描的完整 `--verbose` 報告是 [`demo.svg`](assets/readme/demo.svg)（`npm run docs:demo`）。</sub>

<details>
<summary><strong>觀看示範</strong> — 一次掃描、它給出的修正，以及證明修正有效的重新掃描</summary>

<br />

<p align="center">
  <a href="assets/video/qa-doctor-demo.mp4">
    <img src="assets/video/qa-doctor-demo-poster.png" alt="示範錄影中的一格：npx qa-doctor-cli@latest 在終端機視窗中掃描示範儲存庫" width="900" />
  </a>
</p>

<sub>由 `npm run docs:video` 根據一次真實掃描逐格算繪；從不錄製螢幕。點選畫面即可開啟 [`qa-doctor-demo.mp4`](assets/video/qa-doctor-demo.mp4)。</sub>

</details>

### 近看一項發現

每一項發現都回答四個問題：它在哪裡、QA Doctor 有多確定、這條規則多常出錯，以及如何修正。

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="示範掃描的第一項發現，與終端機印出的完全一致，並標出它的四個部分：位置、確定程度、規則的出錯頻率，以及修正方式。" width="100%" />
</p>

`qa-doctor explain QA-CI-001` 會印出一條規則完整的信任檔案，包括它的實測誤報率，以及該誤報率為它贏得的等級：

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

這就是價值的基本單位：CI 回報了一次它並未贏得的通過。

<br />

## 快速開始

```bash
npx qa-doctor-cli@latest
```

它掃描目前的目錄並印出 Trust Report：發現了什麼、你能在多大程度上信任它、原因，以及下一步該做什麼。當關卡及以上級別沒有任何發現時，它以 `0` 結束。

在 CI 中，只掃描分支引入的內容，這樣舊有的測試套件就不會淹沒你的第一個 pull request：

```bash
npx qa-doctor-cli@latest --scope changed
```

`qa-doctor ci install` 會把它寫成一個 GitHub Actions workflow，使用固定在 `v1` 主版本標籤上的 [action](https://github.com/Sergey-Bar/qa-doctor#readme)（或使用 `--no-action` 改用一般的 `npx`）。在你決定讓它攔截之前，它始終只是建議性的。

| 指令                                  | 作用                                          |
| ------------------------------------- | --------------------------------------------- |
| `qa-doctor`                           | Trust Report：結論、信心程度、下一步行動      |
| `qa-doctor --scope changed`           | 只檢查你的分支引入的內容（CI 用法）           |
| `qa-doctor ci install`                | 產生建議性的 PR workflow（基於 action）       |
| `qa-doctor explain QA-CI-001`         | 是什麼、為什麼、怎麼修，外加實測 FP 率        |
| `qa-doctor why src/a.spec.ts:42`      | 解釋這一行為什麼被標記。從不攔截。            |
| `qa-doctor forensics ./test-results/` | 來自真實執行的執行時證據                      |
| `qa-doctor trust-report`              | 自成一體的 Trust Artifact（md + json）        |
| `qa-doctor handoff`                   | 給程式代理的修正計畫                          |
| `qa-doctor --json` / `--format sarif` | 機器可讀的輸出，GitHub Code Scanning          |
| `qa-doctor --format codequality`      | GitLab Code Quality 報告（MR 元件使用的產物） |
| `qa-doctor --strict`                  | 同時執行 quarantine 等級的規則（FP 風險較高） |

<details>
<summary><strong>其他所有指令</strong> — 不穩定測試分類、報告、治理</summary>

<br />

| 指令                                  | 作用                                                     |
| ------------------------------------- | -------------------------------------------------------- |
| `qa-doctor --classic`                 | Trust Report 之前的評分橫幅樣式                          |
| `qa-doctor explain verdict`           | 解釋已儲存掃描的結論為何如此                             |
| `qa-doctor triage ./test-results/`    | 引導式分類。每一列都以下一步行動作結。                   |
| `qa-doctor pw-report ./test-results/` | Playwright 執行摘要：重試、不穩定測試、最慢的測試        |
| `qa-doctor doctor:playwright`         | 僅針對 Playwright 的深度掃描，外加 Selector Health Score |
| `qa-doctor fix --dry-run` / `fix`     | 安全的自動修正，每一項都會重新掃描以證明修正生效         |
| `qa-doctor baseline` / `diff`         | 為發現建立快照，之後只回報新增或惡化的                   |
| `qa-doctor impact --since <ref>`      | 某次提交引入並解決了什麼                                 |
| `qa-doctor summary`                   | 根據報告產生 CI 註記和 step 摘要                         |
| `qa-doctor pr-comment`                | 限定範圍的 PR 留言，Markdown 格式                        |
| `qa-doctor debt`                      | 附成本模型的測試債務登記表                               |
| `qa-doctor handover`                  | 為新 QA 工程師準備的測試套件入門地圖                     |
| `qa-doctor init`                      | 偵測框架，印出設定檢查清單                               |
| `qa-doctor suppressions`              | 列出被抑制的發現，用於治理                               |
| `qa-doctor rules --unmeasured`        | 基於假設而非量測運作的規則                               |
| `qa-doctor rules --md`                | 完整規則目錄（JSON 或 Markdown）                         |
| `qa-doctor doctor`                    | 對 QA Doctor 自身規則庫的自我稽核                        |
| `qa-doctor create-rule <ID>`          | 為新規則及其 fixtures 產生骨架                           |
| `qa-doctor stats`                     | 本機記錄的歷來修正計數                                   |
| `qa-doctor badge`                     | shields.io 端點 JSON 與程式碼片段                        |
| `qa-doctor --cache`                   | 借助本機結論快取進行增量重新掃描                         |
| `qa-doctor --format mermaid`          | 用於 PR 留言的測試架構圖                                 |

`qa-doctor help <command>` 會印出其中任一指令的用法、範例和下一步。

</details>

需要 Windows、macOS 或 Linux 上的 **Node.js ≥ 22.18**。想全域安裝？`npm i -g qa-doctor-cli`。這個最低版本來自建置工具鏈（tsdown 以它為目標，發佈流水線也針對它做冒煙測試）；執行時相依套件對版本沒有更高要求。

<br />

## QA Doctor 能發現什麼

<p align="center">
  <img src="assets/readme/stack.svg" alt="適用你的技術堆疊：規則所涵蓋的語言、測試框架和 CI 系統，資料來自規則登錄表。" width="100%" />
</p>

**79 條規則**，分為四個類別：測試衛生、測試品質、Playwright 和 CI 完整性，涵蓋 TypeScript 與 JavaScript、Python、Java、C# 以及 GitHub Actions YAML。它們涵蓋 Playwright 的全部四種語言繫結，以及 pytest、JUnit、TestNG、NUnit、xUnit、MSTest、Jest、Vitest 和 Mocha，並為 Cypress 和 Selenium 提供入門級涵蓋。以下列出其中九條，以呈現大致樣貌：

| ID           | 規則                                               | 嚴重程度 | 等級       |
| ------------ | -------------------------------------------------- | -------- | ---------- |
| QA-CI-001    | `continue-on-error` 掩蓋了失敗的驗證關卡           | error    | quarantine |
| QA-CI-009    | 測試結束碼未傳遞（`\|` 未啟用 pipefail、`;` 串接） | error    | extended   |
| QA-TEST-001  | 提交了聚焦測試（`.only`、`fit`）                   | error    | quarantine |
| QA-TEST-003  | 沒有斷言的測試                                     | error    | quarantine |
| QA-TQUAL-009 | 未 await 的 promise 斷言                           | error    | quarantine |
| QA-PW-002    | 未 await 的 locator 斷言                           | error    | core       |
| QA-PW-004    | 脆弱的 CSS/XPath 選擇器                            | warning  | quarantine |
| QA-PY-002    | 被略過的測試（`skip`、非嚴格的 `xfail`）           | warning  | core       |
| QA-CS-103    | 沒有斷言的測試方法                                 | error    | core       |

完整目錄由登錄表自動產生，從不手動維護：`qa-doctor rules --md`、[`docs/rules/`](docs/rules/)，或 [檢查項目指南](https://sergey-bar.github.io/qa-doctor/guide/what-it-checks)。

<details>
<summary><strong>本 README 中提到的所有規則</strong>，彙整在一張表裡</summary>

<br />

> `quarantine` 規則只在 `--strict` 下執行，且從不攔截（其等級上限為 info）。表中顯示的是作者設定的嚴重程度。

| ID           | 類別       | 規則                                             | 嚴重程度 | 等級       |
| ------------ | ---------- | ------------------------------------------------ | -------- | ---------- |
| QA-TEST-001  | 衛生       | 提交了聚焦測試（`.only`、`fit`）                 | error    | quarantine |
| QA-TEST-002  | 衛生       | 被略過的測試。沒有可追蹤的原因時升級為 `error`。 | warning  | quarantine |
| QA-TEST-003  | 衛生       | 沒有斷言的測試                                   | error    | quarantine |
| QA-TEST-004  | 衛生       | 硬等待（`waitForTimeout`、`sleep()`、`delay()`） | warning  | extended   |
| QA-TEST-006  | 衛生       | 濫用重試來掩蓋不穩定性                           | warning  | quarantine |
| QA-TEST-010  | 衛生       | 空的測試本體                                     | error    | quarantine |
| QA-TQUAL-002 | 品質       | 同義反覆的斷言                                   | error    | quarantine |
| QA-TQUAL-009 | 品質       | 未 await 的 promise 斷言                         | error    | quarantine |
| QA-TQUAL-011 | 品質       | 被註解掉的測試                                   | warning  | extended   |
| QA-PW-002    | Playwright | 未 await 的 locator 斷言                         | error    | core       |
| QA-PW-003    | Playwright | 提交了 `page.pause()` / `test.only()`            | error    | core       |
| QA-PW-004    | Playwright | 脆弱的 CSS/XPath 選擇器                          | warning  | quarantine |
| QA-PW-123    | Playwright | 寫死的環境 URL                                   | warning  | quarantine |
| QA-PW-140    | Playwright | 未設定 `maxDiffPixelRatio` 的截圖                | warning  | core       |
| QA-CI-001    | CI         | `continue-on-error` 掩蓋了失敗的關卡             | error    | quarantine |
| QA-CI-002    | CI         | `\|\| true` 吞掉結束碼                           | error    | extended   |
| QA-CI-005    | CI         | 報告被使用卻從未產生                             | error    | quarantine |
| QA-CI-007    | CI         | 包住測試的重試包裝                               | warning  | extended   |
| QA-CI-008    | CI         | 總是成功的 step 掩蓋了失敗                       | error    | quarantine |
| QA-CI-009    | CI         | 結束碼未傳遞（`\|` 未啟用 pipefail、`;` 串接）   | error    | extended   |
| QA-CI-010    | CI         | 在必須攔截的地方略過了測試                       | error    | quarantine |
| QA-PY-002    | Python     | 被略過的測試（`skip`、非嚴格的 `xfail`）         | warning  | core       |
| QA-PY-003    | Python     | 沒有斷言的測試函式                               | error    | quarantine |
| QA-PY-005    | Python     | 測試中的 `time.sleep()`                          | warning  | extended   |
| QA-PY-012    | Python     | 同義反覆的斷言                                   | error    | quarantine |
| QA-JV-101    | Java       | 被停用的測試（`@Disabled`）                      | warning  | core       |
| QA-JV-102    | Java       | 硬等待（`Thread.sleep()`）                       | warning  | extended   |
| QA-JV-103    | Java       | 沒有斷言的測試方法                               | error    | extended   |
| QA-JV-105    | Java       | Playwright `waitForTimeout()` 硬等待             | warning  | core       |
| QA-JV-106    | Java       | 使用脆弱選擇器而非基於角色的 locator             | warning  | quarantine |
| QA-CS-101    | C#         | 被略過的測試（`[Ignore]`、`[Fact(Skip=)]`）      | warning  | core       |
| QA-CS-102    | C#         | 硬等待（`Thread.Sleep` / `Task.Delay`）          | warning  | core       |
| QA-CS-103    | C#         | 沒有斷言的測試方法                               | error    | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` 硬等待                   | warning  | extended   |
| QA-CS-106    | C#         | 使用脆弱選擇器而非基於角色的 locator             | warning  | quarantine |

Python 另外提供 QA-PY-001…012（pytest 衛生）和 QA-PY-101…108（Python 版 Playwright）。Cypress 和 Selenium 各有一套三條規則的入門集。

</details>

每條規則都附帶 must-fire **和** must-not-fire 兩類 fixture，在自己的負向 fixture 上觸發的規則不能發佈。這就是誤報防火牆；`qa-doctor doctor` 在本儲存庫自己的 CI 中強制執行它。

### Selector Health Score

`qa-doctor doctor:playwright` 依每個 locator 找到元素的方式為其評分：像使用者那樣尋找（角色、標籤、文字）、透過明確的契約（`data-testid`），還是仰賴結構上的偶然（CSS 串接、XPath）。每個檔案得到 0 到 100 的分數：

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

這衡量的是**韌性，而非正確性**。`.btn.btn-primary > div:nth-child(2)` 今天能通過，並會一直通過，直到有人改動標記結構。低分從不聲稱測試壞了，只說明它依賴於沒有人承諾保留的標記結構。

<br />

## 可信度評分

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="0 到 100 的可信度刻度，指針掃過每一個分數：低於 50 為 UNWORTHY，50 到 79 為 NEEDS WORK，80 到 99 為 WORTHY，100 為 FORGED" width="720" />
</p>

<sub>0 到 100 的每一個分數，都由真實的 `deriveScoreState` 定位。由 `npm run docs:gauge` 產生，並在 CI 中鎖定以防漂移。</sub>

| 評分      | 結論                        |
| --------- | --------------------------- |
| `0 – 49`  | **UNWORTHY**                |
| `50 – 79` | **NEEDS WORK**              |
| `80 – 99` | **WORTHY**                  |
| `100`     | **FORGED**                  |
| `null`    | **UNKNOWN**：找不到測試宣告 |

**計算方式**。嚴重程度決定基礎扣分（`error −8`、`warning −3`、`info −1`），證據等級再對其打折：E2 全額扣分，E1 扣一半（無條件捨去），E0 不扣分。總扣分依套件規模正規化，也就是以每個測試宣告計算，而不是以檔案計算。終端機印出的就是評分所用的同一組折後數字；不存在隱藏的第二套模型。詳情：[docs/SCORING.md](docs/SCORING.md) 和 [評分指南](https://sergey-bar.github.io/qa-doctor/guide/scoring)。

**100 分不代表什麼**。它不代表軟體是正確的，不代表測試套件是充分的，也不代表產品沒有缺陷。它只代表一件事：**在本次掃描和這套證據模型下，QA Doctor 評估的規則都沒有產生扣分。**

<br />

## 證據模型

每一項發現都帶有兩個標籤：QA Doctor 有多確定，以及這項發現被查證到什麼程度。這正是只會回報模式的工具，與可以用來把關發佈的工具之間的差別。

**有多確定 — 證據等級。**

| 等級   | 名稱       | 含義                           | 扣分 |
| ------ | ---------- | ------------------------------ | ---- |
| **E2** | 確定性證明 | 缺陷就存在於程式碼現有的寫法中 | 全額 |
| **E1** | 模式證據   | 比對到與缺陷高度相關的模式     | 一半 |
| **E0** | 觀察       | 值得知道。並不聲稱有任何問題。 | 零   |

偵測的信心程度不等於證明的強度。一條規則可以確定自己比對到了要找的東西，但它看到的仍可能只是啟發式結果。E1 發現是用來閱讀和判斷的，絕不能盲目套用；這條界線會標註在終端機、JSON 以及交給代理的交接內容中的每一項發現上。

**查證到什麼程度 — 信任等級**。大多數發現來自閱讀你的程式碼。把一次真實測試執行的報告交給 QA Doctor，它就能確認程式碼確實執行過。

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="從 L0 到 L5 的信任階梯。L0 到 L2 來自閱讀程式碼；L3 到 L5 需要真實的執行報告，階梯上的斷口標示了這一點。" width="100%" />
</p>

| 等級   | 白話解釋           | 所需條件                           |
| ------ | ------------------ | ---------------------------------- |
| **L0** | 已記錄             | 閱讀程式碼                         |
| **L1** | 看起來像是問題     | 閱讀程式碼：比對到模式             |
| **L2** | 在程式碼中得到證明 | 閱讀程式碼：缺陷是結構性的         |
| **L3** | 檔案執行過         | 執行報告顯示發現所在的檔案被執行過 |
| **L4** | 測試執行過         | 執行報告顯示發現所在的測試被執行過 |
| **L5** | 執行結果吻合       | 執行本身的結果證實了該缺陷類別     |

靜態掃描止步於 L2。只有真實的執行報告（Playwright JSON、Jest 或 Vitest JSON、JUnit XML）才能把發現提升到 L3 或更高，因此從未被觀察到執行過的發現，永遠不能聲稱它執行過。定義：[docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)。

### 其中有多少經過實測

**79 條規則中有 74 條的誤報率是在真實開源程式碼上測得的**（每條至少 10 個人工分類的發現；見 [docs/FP-AUDIT.md](docs/FP-AUDIT.md)）。其餘 5 條基於作者的估計發佈，並在 `qa-doctor explain` 中逐條註明。`qa-doctor rules --unmeasured` 會列出它們，每次掃描的頁尾也會回報實際*觸發*的規則中有多少經過實測。

即使誤報率很差也照樣公開。QA-TEST-001（提交進儲存庫的 `.only`）在真實儲存庫上的稽核結果很差，因此被放在 quarantine。每條規則（包括 QA-PW-141）的最新數字都在稽核報告裡。

### 規則信任等級

等級由實測誤報率決定，而不是憑主觀判斷：

| 等級           | 實測 FP            | 行為                                          |
| -------------- | ------------------ | --------------------------------------------- |
| **core**       | ≤ 10%              | 預設報告，會攔截                              |
| **extended**   | ≤ 30%              | 預設報告，信心較低                            |
| **quarantine** | > 30% 或被明確宣告 | 僅在 `--strict` 下執行，上限為 info，從不攔截 |
| _未實測_       | n < 10             | 實測之前不能晉升為 core                       |

FP 帶只能降級一個層級 — 如果規則被明確宣告在 `quarantine` 中，它們永遠不會將其提升出去。被明確置於 quarantine 的規則無論其測量的 FP 率如何都保持在 quarantine 中。

晉升、降級以及各語言的成熟度：[規則生命週期](https://sergey-bar.github.io/qa-doctor/reference/rule-lifecycle)。

### 為什麼這不是 linter

Linter 告訴你程式碼是否遵循規則。QA Doctor 告訴你你的驗證是否值得信任。

|                                                        | Linter（ESLint、SonarQube） | 覆蓋率工具 | AI 程式碼審查 |   **QA Doctor**    |
| ------------------------------------------------------ | :-------------------------: | :--------: | :-----------: | :----------------: |
| 評估的是**驗證體系**，而不是產品程式碼                 |             否              |     否     |      否       |         是         |
| CI workflow 完整性（`continue-on-error`、`\|\| true`） |             否              |     否     |   僅限 diff   |         是         |
| 評估 Playwright locator 的韌性（Selector Health）      |             否              |     否     |      否       |         是         |
| 讀取真實執行資料得出 `TRUE-FLAKE` 結論                 |             否              |     否     |      否       |         是         |
| 公布每條規則的實測誤報率                               |             否              |     否     |      否       |         是         |
| 標記沒有斷言的測試                                     |            是\*             |     否     |     有時      |         是         |
| 捕捉硬等待（`waitForTimeout`、`time.sleep`）           |            是\*             |     否     |     有時      |         是         |
| 確定性（相同輸入，相同輸出）                           |             是              |     是     |      否       |         是         |
| 每次掃描的成本                                         |            免費             |    免費    |     token     | **零**（本機執行） |

<sub>\*由 `eslint-plugin-jest` 和 `eslint-plugin-playwright`（`expect-expect`、`no-wait-for-timeout`）以及 SonarQube 內建的斷言規則涵蓋。各欄描述的是驗證測試套件時的預設行為；外掛、付費方案和自訂規則會改變其中部分答案。這是一份定位概覽，而不是基準測試。</sub>

也請使用 AI 審查。它能捕捉到任何模式都發現不了的細微差異、意圖和設計缺陷。而 QA Doctor 能捕捉到 AI 審查因為看起來是刻意為之而忽略的東西：提交進儲存庫的 `.only`、被吞掉的結束碼、測試 job 上的 `continue-on-error`。這些需要的是掃描，而不是推理。

<br />

## 執行時鑑識

靜態分析是對從未執行過的程式碼進行推理。鑑識讀取的是實際發生的事情：來自任何執行器的 Playwright JSON、Jest JSON、Vitest JSON 和 JUnit XML。

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

`TRUE-FLAKE` 並不是說測試被重試過。它的意思是該測試**至少有一次嘗試失敗，隨後以綠色結束**：這是一次僥倖通過，無論最終的勾號怎麼顯示都會被標記出來。`qa-doctor triage` 會把這段歷史轉換成隔離建議，`qa-doctor pw-report` 則彙整一次執行。正是這些執行報告，把發現提升到 L3 及以上的信任等級。

<br />

## CI 完整性

測試可以通過，而包住它的流水線卻不可能失敗。QA Doctor 同樣讀取 workflow：`continue-on-error`、`|| true`、從不傳遞的結束碼、總是成功的 step、被使用卻從未產生的報告，以及恰恰在應當攔截的事件上被略過的關卡。每一項發現都會指明 job、step 和行號，並帶有自己的證據等級。

產生 PR workflow，預設為建議性的：

```bash
qa-doctor ci install
```

或者把 Marketplace 上的 action 加到你現有的 workflow 中：

```yaml
- uses: Sergey-Bar/qa-doctor@v1
  with:
    scope: changed
    fail-on: error
```

固定 `@v1` 以跟隨主版本線，或固定一個確切的標籤（`@v0.5.32`）以獲得可重現的關卡。[docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) 介紹了 Marketplace、Smithery 和各個 MCP 登錄表。

要把發現送進 GitHub Code Scanning，上傳 SARIF（需要在 workflow 或 job 範圍內設定 `security-events: write`）：

```yaml
- run: npx qa-doctor-cli@latest --format sarif > qa-doctor.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: qa-doctor.sarif
```

在 GitLab 上，`--format codequality` 會寫出 MR 元件和 diff 註記所讀取的 Code Quality 報告（[docs/GITLAB-CI.md](docs/GITLAB-CI.md)）。編輯器和流水線設定：[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)。

### 變更範圍歸因

```bash
npx qa-doctor-cli@latest --scope changed
```

發現會歸因到你的分支新增的行，以 **merge-base** 為基準計算。範圍與完整掃描發現的檔案集合相同（TS/JS spec 和轉接器設定、`test_*.py`、`*Test.java`、`*Tests.cs`、`.github/workflows/*.yml`），再加上未提交和未追蹤的變更，所以在你提交之前就能使用。基準依 `main → master → origin/main → origin/master → origin/HEAD` 的順序解析；可以用 `--base <ref>` 覆寫。

當無法解析 merge-base 時（淺層複製、分離的 HEAD、不在 git 中的目標），發現會退回到以整個檔案歸因，**而且報告會明確說明這一點**。無聲的退回正是這個工具要捕捉的那類缺陷。

<br />

## AI 代理

只有當某個東西據此採取行動時，發現才有價值。

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI 撰寫修正。QA Doctor 驗證它**。證明來自重新掃描，而絕不是代理自己回報的成功。

| 指令                | 代理得到什麼                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `qa-doctor mcp`     | 一個基於 stdio 的 [MCP](https://modelcontextprotocol.io) 伺服器。`scan`、`explain` 和 `diff` 都成為可呼叫的工具。                |
| `qa-doctor handoff` | 儲存下來的 `--json` 報告會變成一份確定性的 Markdown 計畫：偵測到了什麼、每項發現的證據界線、哪些東西**不能**改動，以及如何驗證。 |
| `qa-doctor install` | 寫入你的儲存庫中已有的代理設定位置（`.claude/`、`.cursor/`、`.kilo/`、`AGENTS.md`），這樣代理在聲稱完成之前會重新掃描。          |

加入自帶 CLI 的用戶端：

```bash
claude mcp add qa-doctor -- npx -y qa-doctor-cli@latest mcp
```

或者加入任何接受 `mcpServers` 設定區塊的用戶端：

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

**護欄比便利更重要**。交接中的每一項發現都帶有它的界線。**E2** 表示 _確定性：檢查位置並套用修正_。**E1** 表示 _需要確認：僅憑觀察不能證明缺陷_。一個盲目修正 E1、抑制規則或修改規則來拉高分數的代理，所做的正是這個工具要捕捉的事情，因此交接內容會在提示詞中、緊鄰這項發現寫明這一點。

<br />

## 信任與安全

**本機優先，零遙測**。`src/` 中任何地方都不存在具備網路能力的 API（`fetch`、`http`、`https`、`net`、`dns`、`dgram`、WebSocket），一旦出現，[`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) 就會讓建置失敗。它同樣禁止 `eval` 和 `new Function`。掃描不受信任的程式碼時從不執行它：靜態分析讀取原始碼文字，鑑識解析磁碟上已存在的報告檔案。

兩點說明：`npx` 本身會在任何程式碼執行之前下載套件；而這項保證涵蓋的是 `src/`，不包括第三方外掛。

**外掛不在沙箱中執行**。JS 外掛（`qa-doctor-rules/*.mjs`，或在 `"plugins"` 下列出的 npm 套件）以完整的 Node 權限執行，與 ESLint 或 Vitest 外掛的信任模型相同。載入它們需要**在每次掃描時**明確啟用：沒有 `--enable-plugins`（或 `QA_DOCTOR_ENABLE_PLUGINS=1`）時，它們的原始碼永遠不會被載入，stderr 上的提示會列出被略過的內容。JSON 規則清單不執行任何程式碼，核心規則 ID 前綴是保留的，因此外掛無法冒充核心規則。請透過 [SECURITY.md](SECURITY.md) 回報漏洞。

**它會檢查自己**。一個驗證信任引擎，只有自身可被驗證才站得住腳。每次 CI 執行都會用同一次執行產出的建置來掃描本儲存庫。只要出現任何 error 等級的發現，關卡就會失敗；遇到**部分**掃描或**當掉的規則**時同樣失敗，因為一次被截斷、什麼都沒回報的自我掃描，正是這個專案要捕捉的虛假綠燈。`qa-doctor doctor` 會在同一次執行中重新稽核規則庫（fixture 防火牆、等級的誠實性、core 等級上限），結果為 INCONCLUSIVE 的檢查與失敗的檢查同樣判定為失敗。兩份報告都會作為建置產物上傳。

### 結束碼與機器契約

已凍結，你可以放心地在其上建立 CI 邏輯：

| 結束碼 | 含義                                               |
| ------ | -------------------------------------------------- |
| `0`    | 乾淨：關卡及以上級別沒有發現                       |
| `1`    | 關卡及以上級別存在發現                             |
| `2`    | 部分掃描（時間預算用盡、檔案無法讀取）。從不攔截。 |
| `10`   | 用法錯誤（參數錯誤、缺少目標）                     |
| `20`   | 內部錯誤                                           |

`2` 被刻意區別於 `0`：一次沒有完成的掃描並不是「什麼都沒發現」，它只是還沒找完。

機器使用的一切（MCP 工具結果、`--json`、SARIF 2.1）都來自同一個標準結果，遵循帶版本號且**只做增量擴充**的 schema（`schemaVersion: 1`、`contractVersion: 1`），因此任何使用者都無需從算繪後的文字中重建含義。參見 [機器契約](docs/machine-contract.md)。規則 ID（`QA-<FAMILY>-NNN`）一經發佈即不可更改，也絕不重複使用。

<br />

## QA Doctor 無法告訴你的事

- **它不會執行你的測試**。掃描乾淨不等於測試套件通過。
- **它無法告訴你某個斷言是*錯誤的***。`expect(total).toBe(41)` 看起來很健康。QA Doctor 找的是*不可能失敗*的測試和*不可能變紅*的流水線，而不是檢查了錯誤內容的測試。
- **它不能證明業務正確性**。這裡沒有任何東西能說明你的產品做到了需求的要求。
- **100 分不能證明測試套件好**。你的套件是否涵蓋了真實風險是另一個問題，這個工具不回答它。
- **79 條規則中有 5 條基於估計發佈**，而不是實測的誤報率。每一條都會在自己的發現中註明。
- **E1 不是 E2**。啟發式發現值得閱讀，但不值得盲目套用。
- **空儲存庫的得分是 `null`，絕不是 100。**
- **名為 `*.spec.ts` 卻沒有測試宣告的檔案不算涵蓋**。如果一個儲存庫僅有的 spec 檔案裡只有匯入或型別（`it`/`test` 呼叫為零），它的得分是 `null`，而不是 100。

<br />

## 文件

完整的文件網站位於 <https://sergey-bar.github.io/qa-doctor/>。

| 文件                                                   | 內容                                         |
| ------------------------------------------------------ | -------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | 評分正規化與證據加權                         |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | 標準術語表：一個概念一個詞                   |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 實測誤報率及量測方法                         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | 規則狀態、等級、抑制與淘汰                   |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver 政策、凍結的介面、淘汰週期            |
| [docs/machine-contract.md](docs/machine-contract.md)   | 標準的機器可讀結果                           |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 輸出以及編輯器或 CI 設定               |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab：Code Quality 報告、MR 設定範例、關卡 |
| [docs/rules/](docs/rules/)                             | 自動產生的逐條規則目錄                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 開發環境建置與貢獻流程                       |
| [SUPPORT.md](SUPPORT.md)                               | 在哪裡提問、回報問題和取得協助               |
| [SECURITY.md](SECURITY.md)                             | 漏洞回報                                     |
| [CHANGELOG.md](CHANGELOG.md)                           | 版本歷史                                     |

### 狀態

**版本 1**。JSON schema 和結束碼是凍結的契約。TypeScript 和 Python 擁有最廣的實測涵蓋。Java 和 C# 較新；請參照 [成熟度表](https://sergey-bar.github.io/qa-doctor/reference/rule-lifecycle) 來理解它們。接下來的計畫，不捏造日期：[公開路線圖](https://sergey-bar.github.io/qa-doctor/reference/roadmap)。

### 參與貢獻

新規則是最容易上手的第一份貢獻。一條指令就能為規則產生骨架，連同它的 must-fire **和** must-not-fire fixture。產生的規則在寫出真正的偵測邏輯之前，會刻意在自己的 fixture 上失敗，因為一個被發佈出去的空殼，就是一條沒人量測過的規則：

```bash
qa-doctor create-rule QA-PW-140 --title "Screenshot without diff bound"
```

開發環境建置、常駐關卡指令，以及 anti-creep 和 fixture 防火牆兩條法則，都在 [CONTRIBUTING.md](CONTRIBUTING.md) 中。

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="在你的儲存庫上執行它。" width="100%" />

```bash
npx qa-doctor-cli@latest
```

[閱讀指南](https://sergey-bar.github.io/qa-doctor/guide/getting-started) · [文件網站](https://sergey-bar.github.io/qa-doctor/) · [npm](https://www.npmjs.com/package/qa-doctor-cli)

<br />

別問測試是否通過了。<br />
要問證據能否證明它們值得信任。

<sub>由 [Sergey Bar](https://www.linkedin.com/in/sergeybar/) 打造 · MIT 授權</sub>

</div>
