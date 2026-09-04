<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### あなたのテストは嘘をついています。私たちが証明します。

**QA 向け Verification Trust Engine。** Mjölnir はテストスイートと CI
パイプラインを監査し、信頼性スコアを報告し、信頼がどこで壊れているかを
正確に示します。

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | 日本語 | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**あなたのテストは信頼に値しますか？**

[動作を見る](#-動作を見る) ·
[クイックスタート](#-クイックスタート) ·
[何をチェックするか](#-mjölnir-がチェックするもの) ·
[スコアリング](#スコアの仕組み) ·
[CI](#-ci-統合) · [設定](#設定) ·
[ドキュメント](#-ドキュメント)

</div>

---

## 🎬 動作を見る

<p align="center">
  <img src="assets/readme/demo.svg" alt="デモリポジトリに対する Mjölnir の完全な --verbose レポート: WORTHINESS 75/100 NEEDS WORK、カテゴリ別の診断内訳、FIX THIS FIRST リスト、そして CI・Playwright・テスト衛生・Python ルール全体にわたるルール ID と行番号付きの各検出" width="900" />
</p>

<sub>`npx mjolnir-qa ./examples/demo-repo --verbose` の完全な出力を、
本物のレポーターで描画したもの——何ひとつ省いていません。
`npm run docs:demo` で再生成します。
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
は、成果物がツールの出力から逸れたら CI を落とします。</sub>

**いま何が起きたか:**

1. Mjölnir は Playwright のスペック、その設定、CI ワークフロー、
   Python テストファイルを検出しました——4 言語/フォーマットを 1
   パスで。
2. スイートへの信頼を弱める証拠を見つけました——ジョブをマスクする
   `continue-on-error`、終了コードを呑み込む `|| true`、ハードな
   sleep、壊れやすいセレクタ、ハードコードされたステージング URL、
   `networkidle` 待ち。
3. それぞれをルール ID・場所・修正方法を備えた具体的な検出に——そして
   PR にゲートをかけられる単一のスコアに変換しました。

### 検出を 1 つ、クローズアップ

上の最初の検出に対して `mjolnir explain QA-CI-001` を実行すると:

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

これが価値の単位です。スタイルへの指摘ではなく、あなたの CI が
「通った」と告げているのに実際には通っていない箇所です。

---

## ⚡ クイックスタート

リポジトリに対して実行し、完全なレポートと信頼性スコアを得る:

```bash
npx mjolnir-qa@latest
```

**CI では、製品は 1 コマンドです。** ブランチが触ったものだけをスキャン
し、新しい問題があれば非ゼロで終了します:

```bash
npx mjolnir-qa@latest --scope changed
```

それを PR チェックに放り込む——`mjolnir ci install` がワークフローを
書き出します——それだけです。ほかはすべてオプションです。

| コマンド                            | 何をするか                                            |
| ----------------------------------- | ----------------------------------------------------- |
| `mjolnir`                           | リポジトリ全体のスキャン + 信頼性スコア               |
| `mjolnir --scope changed`           | ブランチが導入したものだけ——CI 形態                   |
| `mjolnir ci install`                | アドバイザリな PR ワークフローを生成                  |
| `mjolnir explain QA-CI-001`         | 何 / なぜ / 修正方法 + 1 ルールの実測 FP 率           |
| `mjolnir rules --unmeasured`        | 測定ではなく仮定で動いているルール                    |
| `mjolnir --json` / `--format sarif` | 機械可読 / GitHub Code Scanning                       |
| `mjolnir --strict`                  | 隔離層（quarantine）のルールも実行（FP リスクが高い） |

<details>
<summary><strong>何かが flaky なとき</strong></summary>

| コマンド                            | 何をするか                                            |
| ----------------------------------- | ----------------------------------------------------- |
| `mjolnir forensics ./test-results/` | 実際の実行データ → `TRUE-FLAKE` 判定、`FLAKY.md`      |
| `mjolnir triage ./test-results/`    | 実行履歴からの隔離提案                                |
| `mjolnir pw-report ./test-results/` | Playwright 実行サマリー——リトライ / flake / 最遅      |
| `mjolnir doctor:playwright`         | Playwright 専用の深いスキャン + Selector Health Score |

</details>

<details>
<summary><strong>たまに / レポート系</strong></summary>

| コマンド                        | 何をするか                                            |
| ------------------------------- | ----------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | 証拠付きの安全な自動修正                              |
| `mjolnir baseline` / `diff`     | 検出のスナップショットを取り、以後は新規/悪化のみ報告 |
| `mjolnir impact --since <ref>`  | 以前のコミット以降に何が変わったか                    |
| `mjolnir debt`                  | コストモデル付きのテスト負債台帳                      |
| `mjolnir handover`              | 新しい QA 向けのスイートオンボーディングマップ        |
| `mjolnir stats`                 | これまでに見た修正のローカル累計カウンタ              |
| `mjolnir badge`                 | shields.io エンドポイント JSON + スニペット           |
| `mjolnir rules --md`            | 完全なルールカタログ（JSON または Markdown）          |
| `mjolnir doctor`                | Mjölnir 自身のルールベースの自己監査                  |
| `mjolnir create-rule <ID>`      | 新しいルール + フィクスチャのスキャフォールド         |
| `mjolnir --format mermaid`      | PR コメント用のテストアーキテクチャ図                 |

</details>

お好みなら `npx` の代わりにグローバルインストールを:
`npm i -g mjolnir-qa`。Node.js ≥ 22.18 が必要です。Windows、macOS、
Linux で動作します。

---

## 👥 誰のためのものか

- **QA / SDET** — e2e または統合スイートを所有し、スイートが生成する
  緑のチェックマークが本当に値するものかの証拠を必要としている人。
- **プラットフォーム / DevEx チーム** — CI の完全性とリリースゲートに
  責任を持つ人々。`continue-on-error` が赤いパイプラインを静かに緑に
  塗り替えないことを気にする人々。
- **OSS メンテナ** — ローカルでも CI でも、ネットワーク呼び出しゼロで
  動く安価で常時有効な検証ゲートを求めている人。

---

## 🔨 Mjölnir がチェックするもの

|     |                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **信頼性スコア** — ひとつの数字、透過的な減点テーブル、ブラックボックスなし                                                   |
| 🎭  | **Selector Health Score** — 合格率だけでなく、Playwright ロケータを評価する                                                   |
| 🔬  | **ランタイムフォレンジクス** — 実際の Playwright/JUnit 実行データを読み、静的な推測ではなく `TRUE-FLAKE` を捉える             |
| 🚨  | **CI 完全性ルール** — `continue-on-error`、`\|\| true`、その他の偽グリーンの手口を検出する                                    |
| 🐍  | **4 つの Playwright バインディングすべて** — TypeScript、Python、Java、C#/.NET — さらに pytest、JUnit/TestNG、CI ワークフロー |
| 🔒  | **ローカルファースト** — スキャン中のネットワーク呼び出しゼロ、テレメトリゼロ、数秒で実行                                     |

### ルール

すべてのルールは must-fire **と** must-not-fire のフィクスチャを備えて
出荷されます。自分自身のネガティブフィクスチャで発火するルールは出荷
できません——それが false-positive の防火壁です。

<details>
<summary><strong>テスト衛生</strong></summary>

| ID          | ルール                                                   | Severity |
| ----------- | -------------------------------------------------------- | -------- |
| QA-TEST-001 | コミットされたフォーカステスト（`.only`、`fit`）         | error    |
| QA-TEST-002 | 根拠のないままスキップされたテスト                       | error    |
| QA-TEST-002 | 記録済みの根拠つきでスキップされたテスト                 | warning  |
| QA-TEST-003 | アサーションのないテスト                                 | error    |
| QA-TEST-004 | ハードな sleep（`waitForTimeout`、`sleep()`、`delay()`） | warning  |
| QA-TEST-006 | flakiness を隠すリトライの濫用                           | warning  |
| QA-TEST-010 | 空のテスト本体                                           | error    |

</details>

<details>
<summary><strong>テスト品質</strong></summary>

| ID           | ルール                                  | Severity |
| ------------ | --------------------------------------- | -------- |
| QA-TQUAL-001 | モックのみの検証                        | info     |
| QA-TQUAL-002 | トートロジカルなアサーション            | error    |
| QA-TQUAL-009 | await されていない promise アサーション | error    |
| QA-TQUAL-011 | コメントアウトされたテスト              | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | ルール                                        | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PW-002 | await されていないロケータアサーション        | error    |
| QA-PW-003 | コミットされた `page.pause()` / `test.only()` | error    |
| QA-PW-004 | 脆弱な CSS/XPath セレクタ                     | warning  |
| QA-PW-005 | `page.evaluate()` 内のビジネスロジック        | info     |
| QA-PW-114 | レガシーな要素ハンドル（`page.$`）            | info     |
| QA-PW-118 | `networkidle` 待ち（設計上 flaky）            | info     |
| QA-PW-123 | ハードコードされた環境 URL                    | warning  |

</details>

<details>
<summary><strong>CI 完全性</strong></summary>

| ID        | ルール                                                           | Severity |
| --------- | ---------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` が失敗をマスクする                           | error    |
| QA-CI-002 | `\|\| true` が終了コードを呑み込む                               | error    |
| QA-CI-005 | レポートが消費されるのに生成されない                             | error    |
| QA-CI-007 | テストを包むリトライラッパー                                     | warning  |
| QA-CI-008 | 常に成功するステップが失敗をマスクする                           | error    |
| QA-CI-009 | テストの終了コードが伝播しない（pipefail なしの `\|`、`;` 連結） | error    |
| QA-CI-010 | ブロックすべき場所でテストがスキップされる（skip-on-PR ガード）  | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | ルール                                           | Severity |
| --------- | ------------------------------------------------ | -------- |
| QA-PY-002 | スキップされたテスト（`skip`、非厳格な `xfail`） | warning  |
| QA-PY-003 | アサーションのないテスト関数                     | error    |
| QA-PY-005 | テスト内の `time.sleep()`                        | warning  |
| QA-PY-006 | 空のテスト本体（`pass`）                         | info     |
| QA-PY-010 | freeze なしのランダム/時刻依存                   | info     |
| QA-PY-012 | トートロジカルなアサーション                     | error    |

Python ルールは合計 20 本（QA-PY-001…012 pytest 衛生 + QA-PY-101…108 Playwright-Python）。

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | ルール                                         | Severity |
| --------- | ---------------------------------------------- | -------- |
| QA-JV-101 | 無効化されたテスト（`@Disabled`）              | warning  |
| QA-JV-102 | ハードな sleep（`Thread.sleep()`）             | warning  |
| QA-JV-103 | アサーションのないテストメソッド               | error    |
| QA-JV-105 | Playwright のハードな sleep `waitForTimeout()` | warning  |
| QA-JV-106 | role ロケータの代わりの脆弱なセレクタ          | warning  |
| QA-JV-108 | テストにハードコードされた環境 URL             | info     |
| QA-JV-111 | 全域モック `page.route("**")`                  | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | ルール                                              | Severity |
| --------- | --------------------------------------------------- | -------- |
| QA-CS-101 | スキップされたテスト（`[Ignore]`、`[Fact(Skip=)]`） | warning  |
| QA-CS-102 | ハードな sleep（`Thread.Sleep` / `Task.Delay`）     | warning  |
| QA-CS-103 | アサーションのないテストメソッド                    | error    |
| QA-CS-105 | ハードな sleep `WaitForTimeoutAsync()`              | warning  |
| QA-CS-106 | role ロケータの代わりの脆弱なセレクタ               | warning  |
| QA-CS-108 | テストにハードコードされた環境 URL                  | info     |
| QA-CS-111 | 全域モック `page.RouteAsync("**")`                  | info     |

</details>

> 完全なライブカタログ——各ルールのティア、confidence、false-positive
> リスク、オートフィックス対応状況——はレジストリから生成されます:
>
> ```bash
> mjolnir rules --md
> ```
>
> ルールごとのページは [`docs/rules/`](docs/rules/) にあります。

### どれだけが測定されているか

**99 ルールのうち 74 ルールが、実際の OSS コードに対して測定された
false-positive 率を備えています**（各ルールにつき手作業で分類された
検出 ≥ 10 件。[docs/FP-AUDIT.md](docs/FP-AUDIT.md) 参照）。残り 19 ルール
は作者の推定で出荷されます。すべてのスキャンのフッターは、_発火した_
ルールのうちいくつが測定済みかを教えてくれます。`mjolnir rules --unmeasured`
は未測定のものを列挙します。各ルールの `mjolnir explain` ページはその
状態を明言します。率は醜くても公開します——QA-CS-103 は 95% で監査され、
それゆえ隔離されています。この 78 を増やすことが、プロジェクトの継続的
な仕事です。

### ルールのティアと言語ごとの成熟度

すべてのルールは、**測定された** false-positive 率に基づいて `core`、
`extended`、`quarantine` のいずれかに割り当てられます:

| ティア       | 意味                            | 既定のスキャン | `--strict` |
| ------------ | ------------------------------- | :------------: | :--------: |
| `core`       | 実測 FP ≤ 10 %                  |       ✅       |     ✅     |
| `extended`   | 実測 FP ≤ 30 %                  |       ✅       |     ✅     |
| `quarantine` | 30 % 超、または未測定（n < 10） |       ❌       |     ✅     |

| 言語            | アダプタ       | 現在のカバレッジ                               |
| --------------- | -------------- | ---------------------------------------------- |
| TypeScript / JS | コンパイラ AST | 最も広く、最も測定済み——主に `core`/`extended` |
| Python / pytest | 正規表現層     | 広範、コーパス監査済み——主に `core`/`extended` |
| Java            | 正規表現層     | より新しい——主に `extended`/`quarantine`       |
| C# / .NET       | 正規表現層     | より新しい——主に `extended`/`quarantine`       |

TypeScript と Python が最も広い測定済みカバレッジを持ちます。Java と
C# は出荷済みでドキュメントもあり、実際のコンシューマスイート（バインディング
ライブラリ自身のテストではなく）が監査されるまでは、ヘッドラインの数字から
外れています。

---

## スコアの仕組み

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir のターミナル出力——WORTHINESS 75/100 NEEDS WORK、カテゴリ別の診断内訳と FIX THIS FIRST リスト" width="820" />
</p>

<sub>`npm run docs:hero` で再生成されます。
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
は、成果物がレポーターが実際に印字するものから逸れたら CI を落とします。</sub>

スコアは透過的です: **error −8、warning −3、info −1**、その後スイートの
露出度（テスト宣言あたりの減点）で正規化します。証拠で重みづけされた減点は、
弱いシグナルほど安いことを意味します。ターミナルはスコアが使うのと同じ
割引後の数字を表示します——ブラックボックスはありません。完全な方法論は
[docs/SCORING.md](docs/SCORING.md)。

**判定**

| Score   | 判定             |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**証拠レベル** — すべての検出はいずれかを持ち、スコア内での重みを
決めます:

| レベル | 意味                         | スコアへの影響    | 例                                                          |
| ------ | ---------------------------- | ----------------- | ----------------------------------------------------------- |
| E2     | 決定論的な欠陥               | 全額減点          | コミットされた `.only` — 構造的に証明可能                   |
| E1     | ヒューリスティックなパターン | 半分の減点        | 正規表現で見つかった `sleep()` — 強いシグナル、証明ではない |
| E0     | 観察                         | ゼロ（info のみ） | 報告されるが CI をゲートすることも減点することもない        |

ほとんどのルールは **E1** です。「we prove it」という標語はこの仕組みを
指します: E2 の検出は構造的な証明であり、E1 の検出は適切に位置づけられた
警告であって、形式的な証明ではありません。

空のリポジトリは `null` を返します。偽の 100 を決して返しません —
[信頼モデル](#信頼モデル) 参照。

---

## 🎭 Selector Health Score

Playwright スイート向けの看板指標——あなたのロケータはどれだけ丈夫か:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

ロールベースのロケータは満点です。CSS クラスチェーンと XPath はスコアを
沈めます——どの振る舞いが退行したかを告げずに、あらゆる DOM リファクタで
壊れるからです。

---

## 🔬 ランタイム証拠

静的な flakiness 検出は当てずっぽうです。Mjölnir は**実際の実行データ**を
読みます——あらゆるランナーの Playwright JSON レポートと JUnit XML
です:

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

2 回目以降の試行でしか通らないテストは、通るテストではありません——
運の良いテストです。最終的な緑のチェックマークにかかわらず、
`TRUE-FLAKE` としてフラグが立ちます。

---

## ⚡ Mjölnir はまた別のリンタではありません

リンタはコードがルールに従っているかを教えます。Mjölnir は、あなたの
検証が信頼できるかを教えます。

|                                                             | ESLint / SonarQube | カバレッジツール | 手動レビュー | **Mjölnir** |
| ----------------------------------------------------------- | :----------------: | :--------------: | :----------: | :---------: |
| CI ワークフローの完全性（`continue-on-error`、`\|\| true`） |         ❌         |        ❌        |     まれ     |     ✅      |
| 1 ツールで複数言語（TS、Python、Java、C#）                  |         ❌         |        ❌        |      ❌      |     ✅      |
| Playwright ロケータの耐性を評価（Selector Health）          |         ❌         |        ❌        |     まれ     |     ✅      |
| 実質的なアサーションのないテストを検出                      | ✅（プラグイン）\* |        ❌        |   ときどき   |     ✅      |
| ハードな sleep を検出（`waitForTimeout`、`time.sleep`）     | ✅（プラグイン）\* |        ❌        |   ときどき   |     ✅      |
| 数秒で実行、スキャン中のネットワーク呼び出しゼロ            |         ✅         |        ✅        |      —       |     ✅      |

\*`eslint-plugin-jest`（`expect-expect`）と
`eslint-plugin-playwright`（`expect-expect`、`no-wait-for-timeout`）が
それぞれのフレームワーク向けにこれをカバーしています。

**ランタイム分析**は静的リンティングとは別のカテゴリです:

|                                                 | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ----------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| `TRUE-FLAKE` 判定のために実際の実行データを読む |          一部\*           |     一部（タグ）      |          ✅           |
| 実行履歴からの flaky トリアージレポート         |            ❌             |          ✅           |          ✅           |
| 静的な信頼性スコアと統合                        |            ❌             |          ❌           |          ✅           |

\*Playwright はリトライを内部で追跡しますが、判定ラベルつきの独立した
flakiness レポートは生成しません。

---

## 🤖 なぜ AI コードレビューだけでは足りないのか

問題も層も違います。AI レビューは diff の中の怪しいテスト変更を
見つけられますが、検証システム全体が信頼に値すると証明はできません——
しかも見るのはあなたが見せた diff だけです。

|                                       | AI コードレビュー（Copilot など） |              **Mjölnir**               |
| ------------------------------------- | :-------------------------------: | :------------------------------------: |
| スキャンごとのコスト                  |  トークン（diff サイズで増える）  | **ゼロ**（ローカル、インストール済み） |
| スイート全体 + すべての CI 設定を見る |    あなたが見せた PR diff のみ    |             **毎回すべて**             |
| 決定論的（同じ入力 → 同じ出力）       |         ❌（非決定論的）          |                 **✅**                 |
| 数か月眠っていたパターンを検出        |    コンテキストにある場合のみ     |     **✅**（全ファイルをスキャン）     |
| 実行間で検出を記憶                    |   ❌（セッション間の記憶なし）    |       **✅**（baseline + diff）        |
| 人間のトリガーなしで動く              |     PR またはプロンプトが必要     |       **✅**（CI フック、3 秒）        |

**両方使いましょう。** AI は、どんな正規表現も見つけられないニュアンス、
意図、設計上の欠陥を捉えます。Mjölnir は、「意図的」に見えるがゆえに
AI が見逃す構造的パターンを捉えます——コミットされた `.only`、呑み込まれた
終了コード、テストジョブ上の `continue-on-error`。これらは推論を要する
バグではなく、スキャンを要する事実です。

---

## 🤖 CI 統合

1 コマンドで PR ワークフローを生成します——既定ではアドバイザリ、
決してブロックしません:

```bash
mjolnir ci install
```

または SARIF 経由で GitHub Code Scanning にネイティブに接続します:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

SARIF のエディタ・パイプライン設定:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)。

### changed-scope のカバレッジ

`--scope changed` は、`main` とのマージベースに対してブランチが追加した
行に検出を帰属させます。テストファイル（`*.spec.*`、`*.test.*`）に加え、
diff 内の GitHub ワークフローファイルと Playwright 設定をカバーします。
マージベースを解決できない場合——シャロークローン、detached HEAD、
git 以外のターゲット、既定ブランチの違い——正直に劣化します: 検出は
ファイル全体への帰属に戻り、レポートはその旨を述べます。ベース参照は
`--base <ref>` で上書きできます。

---

## 設定

Mjölnir はゼロ設定です。リポジトリルートの任意の `mjolnir.config.json`
（または `.mjolnir.json`）で重大度、ゲーティング、スコープを調整
できます——検出の意味論は決して変えません。

| キー                | 型                                   | 効果                                                                                                                                          |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | 追加の ignore グロブ（gitignore のサブセット）、内蔵デフォルトの上に重ねる                                                                    |
| `gate`              | `"advisory" \| "error" \| "warning"` | どの重大度が非ゼロで終了するか（既定 `error`; `advisory` は決してブロックしない）                                                             |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | リポジトリに合わせてルールの検出を再ランク付けする                                                                                            |
| `ignore`            | `IgnoreEntry[]`                      | 検出を抑制する — **`reason` が必須**; エントリは 90 日で失効します（明示的な `expires` 日付、または未記入の場合は設定ファイルの最終更新時刻） |
| `plugins`           | `string[]`                           | サードパーティのルールパッケージ（[信頼モデル](#信頼モデル) 参照）                                                                            |

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

- **`.mjolnirignore`** — パス除外のための素朴な gitignore 風ファイル、
  `exclude` と同じ方言です。マシン単位のノイズにはこちらを; リストが
  残りの設定とともにバージョン管理に入るべきなら `exclude` を。
- **CLI 上書き** — `--strict`（隔離層のルールを含める）、`--width <cols>` と
  `--ascii` / `--no-ascii`（ターミナル描画）、`--tone blunt`
  （より直接的なメッセージ）、`--max-duration <sec>`（時間制限つき部分
  スキャン）。
- ルール抑制と非推奨のライフサイクル:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)。

`ignore` エントリは、単独のコマンド `mjolnir suppressions` も駆動します。
これは現在中断されているものと、各エントリの失効時期を一覧表示します。

---

## 📐 終了コードと契約

凍結済み — その上に CI ロジックを構築しても安全です:

| 終了コード | 意味                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `0`        | クリーン — ゲート以上の検出なし                                        |
| `1`        | ゲート以上の検出あり                                                   |
| `2`        | 部分スキャン（時間予算の消尽、読めないファイル）— 決してブロックしない |
| `10`       | 使用方法の誤り（不正なフラグ、ターゲット欠落）                         |
| `20`       | 内部エラー                                                             |

JSON/SARIF レポートは `schemaVersion: 1` です。ルール ID
（`QA-<FAMILY>-NNN`）は出荷後は不変であり、決して再利用されません。

---

## 信頼モデル

- **ローカルファースト** — スキャン中のネットワーク呼び出しゼロ。常に。
  テレメトリゼロ。
- **偽の証明をしない** — 「検証済み」より「不明」と言うことを選びます。
  空のリポジトリは `score: null` を受け取り、偽の 100 は決して返しません。
- **部分的な正直さ** — 分析が中断されたら、出力がその旨を述べます。
  完了していないのに「complete」とは決して言いません。
- **FP 防火壁** — 検出はコメント/文字列を除いたコードビュー上で動作
  します（TypeScript ルールはコンパイラ AST を使用）: 散文コメント内や
  ドキュメント例の文字列にあるパターンはドキュメントであり、検出では
  ありません。
- **測定、断言にあらず** — 実際の OSS コードからの false-positive 率を
  持つルールだけがヘッドラインのティアに出荷されます
  （[どれだけが測定されているか](#どれだけが測定されているか) 参照）。
  スキャンのフッターと `mjolnir rules --unmeasured` がどれがどれかを
  教えます。
- **プラグインの信頼** — プラグインは `"plugins"` の下で宣言された npm
  パッケージです。**サンドボックスはありません**: プラグインコードは
  完全な Node 権限で動作し、ESLint や Vitest のプラグインと同じ信頼
  モデルです。コアルール ID の接頭辞は予約されており、なりすまし防止の
  ためプラグインからは拒否されます。
- **ワークスペースローカルの外部ルール**（フォルダベース、ネットワーク
  ゼロ）— スキャン対象の隣にある `mjolnir-rules/` ディレクトリがカスタム
  ルールを読み込みます: JSON ファイルは正規表現パターンを宣言し（コードは
  実行されません）、`.mjs`/`.js` モジュールは `rules` をエクスポート
  します（プラグインと同じ完全な Node 信頼）。外部ルールはコアと同じ
  信頼メタデータを持ちます; コアティアに出荷されることは決してありません
  （コアにはコーパスサイドカーからの実測 FP 率が必要です — 宣言された
  `tier: "core"` は `extended` にクランプされます）、ティア上限に従い、
  ドリフトの検査を受けます: `mjolnir rules --md --external` は読み込んだ
  ファイルからカタログを描画し（出所 `external`）、マトリクスジェネレータは
  `--external <root>` を受け付けます。

---

## 🏗️ アーキテクチャ

<details>
<summary>ツリーを展開</summary>

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

- **ルールは純粋関数です** — `(SourceFileContext) → Finding[]`、I/O なし、
  グローバルなし。新しいエコシステム = 1 つのアダプタ + そのルール。
- **TypeScript/Playwright はコンパイラ AST を使用します**（ts-morph）。
  Python、Java、C# はコメント/文字列をマスクした共有正規表現層上で動作
  します。
- Java と C# 向けの tree-sitter WASM AST 層は存在し、次の精度ステップ
  ですが、まだ同期スキャンパイプラインには組み込まれていません。

---

## 📚 ドキュメント

| ドキュメント                                           | 内容                                  |
| ------------------------------------------------------ | ------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | スコアの正規化 + 証拠の重み付け       |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 実測 false-positive 率 + 手法         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | ルール状態、抑制、非推奨化            |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 出力 + エディタ/CI 設定         |
| [docs/rules/](docs/rules/)                             | 生成されたルールごとのカタログ        |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 開発環境 + コントリビューションフロー |
| [CHANGELOG.md](CHANGELOG.md)                           | リリース履歴                          |
| [SECURITY.md](SECURITY.md)                             | 脆弱性の報告                          |

---

## 📈 ステータス

**v0.5.x · オープンベータ。** JSON スキーマと終了コードは凍結された契約
です。TypeScript と Python が最も広い実測カバレッジを持ち、Java と C# は
より新しいものです —
[ティア表](#ルールのティアと言語ごとの成熟度) を参照して読んでください。

---

## 🤝 コントリビュート

新しいルールが最も簡単な最初の貢献です — 1 コマンドでルールとその
must-fire **と** must-not-fire フィクスチャをスキャフォールドします
（生成されたルールは、実際の検出を実装するまで意図的にフィクスチャで
失敗します — スタブは出荷できません）:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

完全な開発環境、常設ゲートのコマンド、アンチクリープ / フィクスチャ
防火壁の法則は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

---

<div align="center">

**信頼できないテストをリリースするのはやめましょう。**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

[Sergey Bar](https://www.linkedin.com/in/sergeybar/) によって構築

</div>
