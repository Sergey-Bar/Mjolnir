<div align="center">

<img src="assets/readme/hero.svg" alt="QA Doctor。テストは何が通ったかを教えてくれる。QA Doctor は何を信頼できるかを教えてくれる。" width="100%" />

<br />

QA Doctor は、失敗しようがないテストと赤くなりようがないパイプラインを見つけ出し、<br />
結果をどこまで信頼できるかを、すべての点に証拠を添えてスコアリングします。

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

[動作を見る](#動作を見る) · [クイックスタート](#クイックスタート) · [検出できるもの](#qa-doctor-が検出するもの) · [スコア](#信頼度スコア) · [証拠](#証拠モデル) · [実行フォレンジック](#実行時フォレンジック) · [CI](#ci-の整合性) · [エージェント](#ai-エージェント) · [セキュリティ](#信頼とセキュリティ) · [限界](#qa-doctor-が教えてくれないこと) · [ドキュメント](#ドキュメント)

<details>
<summary>他の言語で読む — 22 の翻訳</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | 日本語 | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## 緑のチェックは主張であって、証明ではない

緑のチェックが意味するのは、パイプラインが失敗しなかったということだけです。テストが実行されたことも、テストが失敗し得たことも意味しません。次のどれもが緑のまま通ります。

- コミットされた `.only` によって、900 件ではなく 3 件のテストしか実行されなかった
- ゲートとなるはずの job に付いた `continue-on-error: true`
- テストコマンドの後ろの `|| true`
- 何もアサートしない、あるいは本体が空のテスト
- 本当の失敗を運のいい成功に変えてしまうリトライのラッパー
- workflow がアップロードしているのに、一度も生成されていないレポート
- 競合状態を固定の sleep でかろうじて支えている箇所

どれもパイプラインを赤くはせず、レビューではどれも意図的に見えます。だからこそ生き残るのです。QA Doctor が実際の例を読むとこうなります。

<p align="center">
  <img src="assets/readme/scan.svg" alt="デモリポジトリの CI workflow を一行ずつ読んだもの。QA Doctor は各検出結果を報告した行に示し、そのルール、何が問題か、証拠レベル、実測の誤検知率を添えます。" width="800" />
</p>

<sub>この workflow についてデモスキャンが報告したすべての検出結果を、報告された行に示しています。`npm run docs:readme-brand` により [`demo-report.json`](assets/readme/demo-report.json) から生成され、CI でずれがないよう固定されています。</sub>

**厳格モード。** 最も攻撃的な検出 — `.only`、`continue-on-error`、空のテスト、リトライの悪用 — は検疫ティアに属します。`--strict` の下でのみ実行され、`info` 重要度に制限されます：フラグを立てますが、決してゲートを閉じません。デフォルトのスキャン（`--strict` なしの `npx qa-doctor-cli@latest`）はコアおよび拡張ルールのみをカバーします。アドバイザリレイヤーも欲しい場合は `--strict` を追加してください。

QA Doctor は、テストスイート、CI workflow、そして手元にあれば実際の実行レポートを読みます。テストを実行することも、依存関係をインストールすることも、スキャン対象のコードを実行することもありません。そして証拠がないときは、確信をでっち上げずにそう伝えます。

| 状況                                                           | QA Doctor の報告内容                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| テスト宣言が見つからない                                       | スコアは `null` で、**UNKNOWN** と表示されます。でっち上げの 100 には決してなりません。 |
| ベースラインや比較可能なリビジョンがない                       | **UNKNOWN** とし、理由を明示します。0 と仮定することは決してありません。                |
| スキャンが途中で打ち切られた（時間制限、読み取れないファイル） | **PARTIAL**、終了コード `2`。クリーンとして提示することは決してありません。             |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="QA Doctor の仕組み。テストスイートと CI パイプラインを静的に読み、実際の実行レポートがあればそれも読みます。各検出結果を証拠レベルと信頼レベルで重み付けし（L3〜L5 に到達できるのは実際の実行だけです）、検出結果、信頼度スコア、そして凍結された終了コードに基づく CI ゲートを出力します。エージェントのループでは、AI が修正を書き、QA Doctor が再スキャンしてそれを証明します。" width="880" />
</p>

<sub>このページのために構成し、等倍で表示しています。`npm run docs:readme-brand` で生成され、CI でずれがないよう固定されています。スコア、件数、ルール ID は [`script.demo.json`](assets/video/script.demo.json)、[`demo-report.json`](assets/readme/demo-report.json)、ルールレジストリから取得されており、手入力されることはありません。同じ図のポスター版：[`architecture.svg`](assets/readme/architecture.svg)。</sub>

<br />

## 動作を見る

CI workflow を持つ小さな Playwright スイート、[`examples/demo-repo`](examples/demo-repo) の実際のスキャンです。点数がどこで失われたかはこちら：

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="QA Doctor の減点内訳：TEST HEALTH 80/100 HEALTHY、カテゴリ別スコア、重大度別の減点ボックス、そして FIX THIS FIRST リスト" width="520" />
</p>

<sub>`npm run docs:hero` により実際のスキャンから生成され、CI でずれがないよう固定されています。同じスキャンの完全な `--verbose` レポートは [`demo.svg`](assets/readme/demo.svg)（`npm run docs:demo`）です。</sub>

<details>
<summary><strong>動画で見る</strong> — スキャン、それが出力する修正、そして修正を証明する再スキャン</summary>

<br />

<p align="center">
  <a href="assets/video/qa-doctor-demo.mp4">
    <img src="assets/video/qa-doctor-demo-poster.png" alt="デモ録画の 1 フレーム：ターミナルウィンドウで npx qa-doctor-cli@latest がデモリポジトリをスキャンしている様子" width="900" />
  </a>
</p>

<sub>`npm run docs:video` により実際のスキャンから 1 フレームずつレンダリングしたもので、画面録画ではありません。フレームを選ぶと [`qa-doctor-demo.mp4`](assets/video/qa-doctor-demo.mp4) が開きます。</sub>

</details>

### ひとつの検出結果を詳しく見る

どの検出結果も 4 つの問いに答えます。どこにあるのか、QA Doctor はどれだけ確信しているのか、そのルールはどれくらいの頻度で誤るのか、そしてどう直すのか。

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="デモスキャンの最初の検出結果を、ターミナルが出力するとおりに示し、4 つの部分に印を付けたもの：場所、確信度、ルールの誤りやすさ、修正方法。" width="100%" />
</p>

`qa-doctor explain QA-CI-001` は、ルールの信頼記録をまるごと出力します。実測の誤検知率と、その率によって得たティアも含まれます。

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

これが価値の単位です。CI が、得てもいない成功を報告している箇所がひとつあるということ。

<br />

## クイックスタート

```bash
npx qa-doctor-cli@latest
```

カレントディレクトリをスキャンし、Trust Report を出力します。何が見つかったか、どこまで信頼できるか、その理由、次に何をすべきか。ゲート以上のものが何も見つからなければ `0` で終了します。

CI では、ブランチが持ち込んだものだけをスキャンしましょう。そうすれば、レガシーなスイートが最初の pull request を埋もれさせることはありません。

```bash
npx qa-doctor-cli@latest --scope changed
```

`qa-doctor ci install` はこれを GitHub Actions の workflow として書き出します。メジャータグ `v1` に固定した [action](https://github.com/Sergey-Bar/qa-doctor#readme) を使います（`--no-action` を付ければ素の `npx`）。ブロックすべきだとあなたが決めるまで、助言的な扱いのままです。

| コマンド                              | 内容                                                              |
| ------------------------------------- | ----------------------------------------------------------------- |
| `qa-doctor`                           | Trust Report：判定、確信度、次のアクション                        |
| `qa-doctor --scope changed`           | ブランチが持ち込んだものだけ（CI 向けの形）                       |
| `qa-doctor ci install`                | 助言的な PR workflow を生成（action ベース）                      |
| `qa-doctor explain QA-CI-001`         | 何が、なぜ、どう直すか、そして実測 FP 率                          |
| `qa-doctor why src/a.spec.ts:42`      | この行がなぜ検出されたのか。ゲートにはなりません。                |
| `qa-doctor forensics ./test-results/` | 実際の実行から得た実行時の証拠                                    |
| `qa-doctor trust-report`              | 自己完結型の Trust Artifact（md + json）                          |
| `qa-doctor handoff`                   | コーディングエージェント向けの修正計画                            |
| `qa-doctor --json` / `--format sarif` | 機械可読な出力、GitHub Code Scanning                              |
| `qa-doctor --format codequality`      | GitLab Code Quality レポート（MR ウィジェット用アーティファクト） |
| `qa-doctor --strict`                  | quarantine ティアのルールも実行（FP リスクは高め）                |

<details>
<summary><strong>その他すべてのコマンド</strong> — 不安定なテストのトリアージ、レポート、ガバナンス</summary>

<br />

| コマンド                              | 内容                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `qa-doctor --classic`                 | Trust Report 以前のスコアバナー表示                                      |
| `qa-doctor explain verdict`           | 保存したスキャンの判定がなぜそうなったのか                               |
| `qa-doctor triage ./test-results/`    | ガイド付きトリアージ。どの行も次のアクションで終わります。               |
| `qa-doctor pw-report ./test-results/` | Playwright の実行サマリー：リトライ、不安定なテスト、最も遅いテスト      |
| `qa-doctor doctor:playwright`         | Playwright 専用の詳細スキャンと Selector Health Score                    |
| `qa-doctor fix --dry-run` / `fix`     | 安全な自動修正。どれも再スキャンで適用を証明します                       |
| `qa-doctor baseline` / `diff`         | 検出結果のスナップショットを取り、以後は新規または悪化したものだけを報告 |
| `qa-doctor impact --since <ref>`      | あるコミットが持ち込んだものと解消したもの                               |
| `qa-doctor summary`                   | レポートから CI アノテーションと step サマリーを生成                     |
| `qa-doctor pr-comment`                | 範囲を絞った PR コメント（Markdown）                                     |
| `qa-doctor debt`                      | コストモデル付きのテスト負債台帳                                         |
| `qa-doctor handover`                  | 新しい QA エンジニア向けのスイートのオンボーディングマップ               |
| `qa-doctor init`                      | フレームワークを検出し、セットアップのチェックリストを出力               |
| `qa-doctor suppressions`              | 抑制された検出結果を一覧表示（ガバナンス用）                             |
| `qa-doctor rules --unmeasured`        | 測定ではなく仮定で動いているルール                                       |
| `qa-doctor rules --md`                | ルールの完全なカタログ（JSON または Markdown）                           |
| `qa-doctor doctor`                    | QA Doctor 自身のルールベースの自己監査                                   |
| `qa-doctor create-rule <ID>`          | 新しいルールとその fixture の雛形を生成                                  |
| `qa-doctor stats`                     | これまでに見た修正のローカル累計カウンター                               |
| `qa-doctor badge`                     | shields.io のエンドポイント JSON とスニペット                            |
| `qa-doctor --cache`                   | ローカルの判定キャッシュによる差分再スキャン                             |
| `qa-doctor --format mermaid`          | PR コメント用のテストアーキテクチャ図                                    |

`qa-doctor help <command>` は、どのコマンドについても使い方、例、次のステップを出力します。

</details>

Windows、macOS、Linux 上で **Node.js ≥ 22.18** が必要です。グローバルにインストールしたい場合は `npm i -g qa-doctor-cli`。この下限はビルドツールチェーンに由来します（tsdown がこれをターゲットにし、リリースパイプラインがこれに対してスモークテストを行います）。実行時の依存関係はそれ以上を必要としません。

<br />

## QA Doctor が検出するもの

<p align="center">
  <img src="assets/readme/stack.svg" alt="あなたのスタックで動きます：ルールがカバーする言語、テストフレームワーク、CI システム（ルールレジストリより）。" width="100%" />
</p>

4 つのファミリー（テストの衛生、テストの品質、Playwright、CI の整合性）にわたる **79 のルール**が、TypeScript と JavaScript、Python、Java、C#、GitHub Actions の YAML を対象とします。Playwright は 4 つのバインディングすべてに対応し、さらに pytest、JUnit、TestNG、NUnit、xUnit、MSTest、Jest、Vitest、Mocha をカバーし、Cypress と Selenium には入門レベルの対応があります。雰囲気をつかむために、そのうち 9 つを示します。

| ID           | ルール                                                                 | 重大度  | ティア     |
| ------------ | ---------------------------------------------------------------------- | ------- | ---------- |
| QA-CI-001    | `continue-on-error` が失敗している検証ゲートを覆い隠している           | error   | quarantine |
| QA-CI-009    | テストの終了コードが伝播されない（pipefail なしの `\|`、`;` での連結） | error   | extended   |
| QA-TEST-001  | フォーカスされたテストがコミットされている（`.only`、`fit`）           | error   | quarantine |
| QA-TEST-003  | アサーションのないテスト                                               | error   | quarantine |
| QA-TQUAL-009 | await されていない promise のアサーション                              | error   | quarantine |
| QA-PW-002    | await されていない locator のアサーション                              | error   | core       |
| QA-PW-004    | 壊れやすい CSS/XPath セレクター                                        | warning | quarantine |
| QA-PY-002    | スキップされたテスト（`skip`、strict でない `xfail`）                  | warning | core       |
| QA-CS-103    | アサーションのないテストメソッド                                       | error   | core       |

完全なカタログはレジストリから生成され、手作業で保守されることはありません：`qa-doctor rules --md`、[`docs/rules/`](docs/rules/)、または [チェック内容ガイド](https://sergey-bar.github.io/qa-doctor/guide/what-it-checks)。

<details>
<summary><strong>この README に登場するすべてのルール</strong>を 1 つの表に</summary>

<br />

> `quarantine` ルールは `--strict` のときだけ実行され、ゲートになることはありません（info が上限）。表示している重大度は作成者が設定したものです。

| ID           | ファミリー | ルール                                                                      | 重大度  | ティア     |
| ------------ | ---------- | --------------------------------------------------------------------------- | ------- | ---------- |
| QA-TEST-001  | 衛生       | フォーカスされたテストがコミットされている（`.only`、`fit`）                | error   | quarantine |
| QA-TEST-002  | 衛生       | スキップされたテスト。追跡された理由がなければ `error` に引き上げられます。 | warning | quarantine |
| QA-TEST-003  | 衛生       | アサーションのないテスト                                                    | error   | quarantine |
| QA-TEST-004  | 衛生       | 固定の sleep（`waitForTimeout`、`sleep()`、`delay()`）                      | warning | extended   |
| QA-TEST-006  | 衛生       | 不安定さを隠すリトライの乱用                                                | warning | quarantine |
| QA-TEST-010  | 衛生       | 空のテスト本体                                                              | error   | quarantine |
| QA-TQUAL-002 | 品質       | トートロジー的なアサーション                                                | error   | quarantine |
| QA-TQUAL-009 | 品質       | await されていない promise のアサーション                                   | error   | quarantine |
| QA-TQUAL-011 | 品質       | コメントアウトされたテスト                                                  | warning | extended   |
| QA-PW-002    | Playwright | await されていない locator のアサーション                                   | error   | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` がコミットされている                         | error   | core       |
| QA-PW-004    | Playwright | 壊れやすい CSS/XPath セレクター                                             | warning | quarantine |
| QA-PW-123    | Playwright | ハードコードされた環境 URL                                                  | warning | quarantine |
| QA-PW-140    | Playwright | `maxDiffPixelRatio` のないスクリーンショット                                | warning | core       |
| QA-CI-001    | CI         | `continue-on-error` が失敗しているゲートを覆い隠している                    | error   | quarantine |
| QA-CI-002    | CI         | `\|\| true` が終了コードを握りつぶす                                        | error   | extended   |
| QA-CI-005    | CI         | レポートが使われているのに生成されていない                                  | error   | quarantine |
| QA-CI-007    | CI         | テストを包むリトライのラッパー                                              | warning | extended   |
| QA-CI-008    | CI         | 常に成功する step が失敗を覆い隠している                                    | error   | quarantine |
| QA-CI-009    | CI         | 終了コードが伝播されない（pipefail なしの `\|`、`;` での連結）              | error   | extended   |
| QA-CI-010    | CI         | ブロックすべき場面でテストがスキップされている                              | error   | quarantine |
| QA-PY-002    | Python     | スキップされたテスト（`skip`、strict でない `xfail`）                       | warning | core       |
| QA-PY-003    | Python     | アサーションのないテスト関数                                                | error   | quarantine |
| QA-PY-005    | Python     | テスト内の `time.sleep()`                                                   | warning | extended   |
| QA-PY-012    | Python     | トートロジー的なアサーション                                                | error   | quarantine |
| QA-JV-101    | Java       | 無効化されたテスト（`@Disabled`）                                           | warning | core       |
| QA-JV-102    | Java       | 固定の sleep（`Thread.sleep()`）                                            | warning | extended   |
| QA-JV-103    | Java       | アサーションのないテストメソッド                                            | error   | extended   |
| QA-JV-105    | Java       | Playwright の `waitForTimeout()` による固定の sleep                         | warning | core       |
| QA-JV-106    | Java       | ロールベースの locator ではなく壊れやすいセレクター                         | warning | quarantine |
| QA-CS-101    | C#         | スキップされたテスト（`[Ignore]`、`[Fact(Skip=)]`）                         | warning | core       |
| QA-CS-102    | C#         | 固定の sleep（`Thread.Sleep` / `Task.Delay`）                               | warning | core       |
| QA-CS-103    | C#         | アサーションのないテストメソッド                                            | error   | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` による固定の sleep                                  | warning | extended   |
| QA-CS-106    | C#         | ロールベースの locator ではなく壊れやすいセレクター                         | warning | quarantine |

Python には QA-PY-001…012（pytest の衛生）と QA-PY-101…108（Python 版 Playwright）もあります。Cypress と Selenium にはそれぞれ 3 つのルールからなるスターターセットがあります。

</details>

どのルールも must-fire **と** must-not-fire の fixture を備えてリリースされ、自分自身のネガティブ fixture で発火するルールはリリースできません。これが誤検知ファイアウォールです。`qa-doctor doctor` がこのリポジトリ自身の CI でそれを強制しています。

### Selector Health Score

`qa-doctor doctor:playwright` は、各 locator が要素をどう見つけるかで評価します。ユーザーと同じ方法か（ロール、ラベル、テキスト）、明示的な契約か（`data-testid`）、構造上の偶然か（CSS の連結、XPath）。各ファイルに 0〜100 のスコアが付きます。

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

これが測るのは**正しさではなく耐久性**です。`.btn.btn-primary > div:nth-child(2)` は今日は通り、誰かがマークアップに触れるまで通り続けます。低いスコアはテストが壊れていると主張するものではなく、誰も維持を約束していないマークアップに依存していることを示すだけです。

<br />

## 信頼度スコア

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="0 から 100 までの信頼度スケール。マーカーがすべてのスコアを走査します：50 未満は CRITICAL、50〜79 は NEEDS ATTENTION、80〜99 は HEALTHY、100 は EXCELLENT" width="720" />
</p>

<sub>0 から 100 までのすべてのスコアを、実際の `deriveScoreState` で配置したもの。`npm run docs:gauge` で生成され、CI でずれがないよう固定されています。</sub>

| スコア    | 判定                                  |
| --------- | ------------------------------------- |
| `0 – 49`  | **CRITICAL**                          |
| `50 – 79` | **NEEDS ATTENTION**                   |
| `80 – 99` | **HEALTHY**                           |
| `100`     | **EXCELLENT**                         |
| `null`    | **UNKNOWN**：テスト宣言が見つからない |

**計算方法**。重大度が基本の減点を決め（`error −8`、`warning −3`、`info −1`）、証拠レベルがそれを割り引きます。E2 は満額、E1 は半分（切り捨て）、E0 はゼロです。合計はスイートの規模で正規化され、ファイル単位ではなくテスト宣言あたりの減点になります。ターミナルに表示されるのは、スコアが使ったのと同じ割引後の数値です。隠れた第二のモデルはありません。詳細：[docs/SCORING.md](docs/SCORING.md) と [スコアリングガイド](https://sergey-bar.github.io/qa-doctor/guide/scoring)。

**100 が意味しないこと**。ソフトウェアが正しいことも、スイートが十分であることも、製品に欠陥がないことも意味しません。意味するのはただひとつ：**このスキャンとこの証拠モデルのもとで、QA Doctor が評価したルールのどれも減点を生まなかった**ということです。

<br />

## 証拠モデル

どの検出結果にも 2 つのラベルが付きます。QA Doctor がどれだけ確信しているか、そしてその検出結果がどこまで確認されたか。これが、パターンを報告するだけのツールと、リリースの判断を委ねられるツールとの違いです。

**どれだけ確かか — 証拠レベル。**

| レベル | 名称               | 意味                                                       | 減点 |
| ------ | ------------------ | ---------------------------------------------------------- | ---- |
| **E2** | 決定論的な証明     | 書かれたとおりのコードに欠陥が存在する                     | 満額 |
| **E1** | パターンによる証拠 | 欠陥と強く結びついたパターンが一致した                     | 半分 |
| **E0** | 観察               | 知っておく価値あり。何かが間違っているという主張ではない。 | ゼロ |

検出の確信度は、証明の強さとは別物です。ルールは探していたものに一致したと確信していても、実際にはヒューリスティックを見ているだけかもしれません。E1 の検出結果は読んで判断するためのものであり、盲目的に適用するものではありません。この境界は、ターミナル、JSON、そしてエージェントへの引き継ぎのすべてで、検出結果に明記されています。

**どこまで確認されたか — 信頼レベル**。ほとんどの検出結果はコードを読むことから得られます。実際のテスト実行のレポートを QA Doctor に渡せば、コードが本当に実行されたことを確認できます。

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="L0 から L5 までの信頼のはしご。L0〜L2 はコードを読むことから得られ、L3〜L5 には実際の実行レポートが必要です。はしごの切れ目がその境目を示しています。" width="100%" />
</p>

| レベル | わかりやすく言うと   | 必要なもの                                                     |
| ------ | -------------------- | -------------------------------------------------------------- |
| **L0** | 記録済み             | コードを読む                                                   |
| **L1** | 問題らしく見える     | コードを読む：パターンが一致                                   |
| **L2** | コードで証明済み     | コードを読む：欠陥は構造的                                     |
| **L3** | ファイルが実行された | 実行レポートが、検出結果のファイルが実行されたことを示している |
| **L4** | テストが実行された   | 実行レポートが、検出結果のテストが実行されたことを示している   |
| **L5** | 実行結果が一致       | 実行自体の結果が欠陥のクラスを裏付けている                     |

静的スキャンは L2 で止まります。検出結果を L3 以上に引き上げられるのは実際の実行レポート（Playwright JSON、Jest または Vitest JSON、JUnit XML）だけです。したがって、実行されている様子が一度も確認されていない検出結果が、実行されたと主張することはありません。定義：[docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)。

### どれだけが実測されているか

**79 のルールのうち 74 は、実際の OSS コードに対して測定した誤検知率を持っています**（それぞれ手作業で分類した検出結果が 10 件以上。[docs/FP-AUDIT.md](docs/FP-AUDIT.md) を参照）。残りの 5 つは作成者の見積もりでリリースされており、`qa-doctor explain` の中でルールごとにそう明記しています。`qa-doctor rules --unmeasured` がそれらを一覧表示し、各スキャンのフッターは、実際に*発火した*ルールのうちいくつが実測済みかを報告します。

率が悪くても公開したままにします。QA-TEST-001（コミットされた `.only`）は実際のリポジトリでの監査結果が悪く、そのため quarantine に置かれています。QA-PW-141 を含む各ルールの最新の数値は監査に載っています。

### ルールの信頼ティア

ティアは意見ではなく、実測の誤検知率に従います。

| ティア         | 実測 FP                            | 動作                                             |
| -------------- | ---------------------------------- | ------------------------------------------------ |
| **core**       | ≤ 10%                              | デフォルトのレポート、ゲートになる               |
| **extended**   | ≤ 30%                              | デフォルトのレポート、確信度は低め               |
| **quarantine** | > 30% または明示的に宣言されたもの | `--strict` のみ、info が上限、ゲートにはならない |
| _未測定_       | n < 10                             | 測定されるまで core に昇格できない               |

FP バンドはティアを降格することしかできません — 明示的に `quarantine` に宣言されたルールをそこから昇格させることはありません。明示的に quarantine に置かれたルールは、測定された FP 率に関係なく quarantine のままです。

昇格、降格、言語ごとの成熟度：[ルールのライフサイクル](https://sergey-bar.github.io/qa-doctor/reference/rule-lifecycle)。

### なぜこれは linter ではないのか

linter は、コードがルールに従っているかを教えてくれます。QA Doctor は、あなたの検証が信頼できるかを教えてくれます。

|                                                          | linter（ESLint、SonarQube） | カバレッジツール | AI コードレビュー |    **QA Doctor**     |
| -------------------------------------------------------- | :-------------------------: | :--------------: | :---------------: | :------------------: |
| 製品コードではなく、**検証の仕組み**をスコアリングする   |           いいえ            |      いいえ      |      いいえ       |         はい         |
| CI workflow の整合性（`continue-on-error`、`\|\| true`） |           いいえ            |      いいえ      |     diff のみ     |         はい         |
| Playwright の locator の耐久性を評価（Selector Health）  |           いいえ            |      いいえ      |      いいえ       |         はい         |
| 実際の実行データを読んで `TRUE-FLAKE` を判定             |           いいえ            |      いいえ      |      いいえ       |         はい         |
| ルールごとの実測誤検知率を公開                           |           いいえ            |      いいえ      |      いいえ       |         はい         |
| アサーションのないテストを検出                           |           はい\*            |      いいえ      |    場合による     |         はい         |
| 固定の sleep を検出（`waitForTimeout`、`time.sleep`）    |           はい\*            |      いいえ      |    場合による     |         はい         |
| 決定論的（同じ入力なら同じ出力）                         |            はい             |       はい       |      いいえ       |         はい         |
| スキャンあたりのコスト                                   |            無料             |       無料       |     トークン      | **ゼロ**（ローカル） |

<sub>\*`eslint-plugin-jest` と `eslint-plugin-playwright`（`expect-expect`、`no-wait-for-timeout`）、および SonarQube 独自のアサーションルールでカバーされます。各列は、テストスイートを検証する際のデフォルトの挙動を示しています。プラグイン、有料プラン、カスタムルールによって一部の答えは変わります。これはポジショニングの概要であって、ベンチマークではありません。</sub>

AI レビューも併用してください。AI レビューは、どんなパターンにも見つけられないニュアンス、意図、設計上の欠陥を捉えます。QA Doctor が捉えるのは、意図的に見えるために AI レビューが見落とすものです：コミットされた `.only`、握りつぶされた終了コード、テストの job に付いた `continue-on-error`。こうしたものに必要なのは推論ではなくスキャンです。

<br />

## 実行時フォレンジック

静的解析は、一度も実行されていないコードについて推論します。フォレンジックは、実際に何が起きたかを読みます：どのランナーのものでも、Playwright JSON、Jest JSON、Vitest JSON、JUnit XML に対応します。

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

`TRUE-FLAKE` は、テストがリトライされたという意味ではありません。そのテストが**少なくとも 1 回の試行で失敗し、その後緑で終わった**という意味です：運による成功であり、最終的なチェックが何を示していても検出されます。`qa-doctor triage` はその履歴を隔離の提案に変え、`qa-doctor pw-report` は実行を要約します。検出結果を信頼レベル L3 以上に引き上げるのも、これと同じ実行レポートです。

<br />

## CI の整合性

テストが通っていても、それを取り巻くパイプラインが失敗しようがない、ということがあります。QA Doctor は workflow も読みます：`continue-on-error`、`|| true`、伝播されない終了コード、常に成功する step、使われているのに生成されないレポート、そしてブロックすべきイベントでスキップされるゲート。各検出結果は job、step、行を示し、それぞれの証拠レベルを持ちます。

PR workflow を生成します（デフォルトは助言的）：

```bash
qa-doctor ci install
```

または、既存の workflow に Marketplace の action を追加します：

```yaml
- uses: Sergey-Bar/qa-doctor@v1
  with:
    scope: changed
    fail-on: error
```

メジャーラインに追従するなら `@v1` を、再現可能なゲートにするなら正確なタグ（`@v0.5.32`）を固定してください。[docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) では Marketplace、Smithery、MCP レジストリについて説明しています。

検出結果を GitHub Code Scanning に送るには、SARIF をアップロードします（workflow または job スコープで `security-events: write` が必要）：

```yaml
- run: npx qa-doctor-cli@latest --format sarif > qa-doctor.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: qa-doctor.sarif
```

GitLab では、`--format codequality` が MR ウィジェットと diff のアノテーションが読む Code Quality レポートを書き出します（[docs/GITLAB-CI.md](docs/GITLAB-CI.md)）。エディターとパイプラインの設定：[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md)。

### 変更範囲への帰属

```bash
npx qa-doctor-cli@latest --scope changed
```

検出結果は、ブランチが追加した行に、**merge-base** を基準として帰属されます。範囲は完全スキャンが見つけるのと同じファイル集合（TS/JS の spec とアダプターの設定、`test_*.py`、`*Test.java`、`*Tests.cs`、`.github/workflows/*.yml`）に、未コミットおよび未追跡の変更を加えたものなので、コミット前でも使えます。ベースは `main → master → origin/main → origin/master → origin/HEAD` の順で解決され、`--base <ref>` で上書きできます。

merge-base を解決できない場合（シャロークローン、detached HEAD、git 外の対象）、検出結果はファイル全体への帰属にフォールバックし、**レポートにもそう明記されます**。黙ってフォールバックすることこそ、このツールが捉えるために存在する種類の欠陥だからです。

<br />

## AI エージェント

検出結果に価値があるのは、何かがそれに基づいて動くときだけです。

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI が修正を書き、QA Doctor がそれを検証します**。証明は再スキャンから得られるのであって、エージェント自身の成功報告から得られるのではありません。

| コマンド            | エージェントが受け取るもの                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa-doctor mcp`     | stdio 経由の [MCP](https://modelcontextprotocol.io) サーバー。`scan`、`explain`、`diff` が呼び出し可能なツールになります。                                        |
| `qa-doctor handoff` | 保存した `--json` レポートが、決定論的な Markdown の計画になります：何が検出されたか、検出結果ごとの証拠の境界、何を変えては**いけない**か、どう検証するか。      |
| `qa-doctor install` | リポジトリに既にあるエージェント用の場所（`.claude/`、`.cursor/`、`.kilo/`、`AGENTS.md`）に書き込み、エージェントが完了を宣言する前に再スキャンするようにします。 |

独自の CLI を持つクライアントに追加する場合：

```bash
claude mcp add qa-doctor -- npx -y qa-doctor-cli@latest mcp
```

または、`mcpServers` ブロックを受け付ける任意のクライアントに：

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

**利便性よりもガードレールが大事です**。引き継ぎに含まれるどの検出結果も、その境界を伴っています。**E2** は _決定論的：場所を確認して修正を適用_ と伝えます。**E1** は _確認が必要：観察だけでは欠陥は証明されない_ と伝えます。E1 を盲目的に直したり、ルールを抑制したり、スコアを上げるためにルールを書き換えたりするエージェントは、まさにこのツールが捉えるために存在することをしているのです。だから引き継ぎは、プロンプトの中で、検出結果のすぐ隣でそう伝えます。

<br />

## 信頼とセキュリティ

**ローカルファースト、テレメトリーゼロ**。ネットワークにアクセスできる API（`fetch`、`http`、`https`、`net`、`dns`、`dgram`、WebSocket）は `src/` のどこにも存在せず、もし現れれば [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) がビルドを失敗させます。`eval` と `new Function` も禁止しています。信頼できないコードをスキャンしても、それを実行することはありません：静的解析はソーステキストを読み、フォレンジックはディスク上に既にあるレポートファイルを解析します。

注意点が 2 つあります：`npx` 自体は何かが実行される前にパッケージを取得します。また、この保証が対象とするのは `src/` であり、サードパーティのプラグインは含みません。

**プラグインはサンドボックス化されていません**。JS プラグイン（`qa-doctor-rules/*.mjs`、または `"plugins"` に列挙された npm パッケージ）は Node の完全な権限で実行されます。ESLint や Vitest のプラグインと同じ信頼モデルです。読み込みは**スキャンごと**のオプトインです：`--enable-plugins`（または `QA_DOCTOR_ENABLE_PLUGINS=1`）がなければ、そのソースは決して読み込まれず、stderr の通知がスキップされたものを一覧表示します。JSON のルールマニフェストはコードを実行せず、コアのルール ID の接頭辞は予約されているため、プラグインがコアのルールになりすますことはできません。脆弱性は [SECURITY.md](SECURITY.md) から報告してください。

**自分自身にも実行します**。検証の信頼エンジンは、それ自体が検証可能でなければ立場がありません。すべての CI 実行は、その同じ実行が生成したビルドでこのリポジトリをスキャンします。ゲートは、重大度 error の検出結果があれば失敗し、**部分的な**スキャンや**クラッシュしたルール**でも失敗します。何も報告しない途中で打ち切られたセルフスキャンこそ、このプロジェクトが捉えるために存在する偽りの緑だからです。`qa-doctor doctor` は同じ実行の中でルールベースを再監査し（fixture ファイアウォール、ティアの誠実さ、core ティアの上限）、INCONCLUSIVE となったチェックは失敗したチェックとまったく同じように失敗します。両方のレポートがビルドのアーティファクトとしてアップロードされます。

### 終了コードとマシン契約

凍結されているので、これを前提に CI のロジックを組めます：

| 終了コード | 意味                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| `0`        | クリーン：ゲート以上の検出結果なし                                             |
| `1`        | ゲート以上の検出結果あり                                                       |
| `2`        | 部分的なスキャン（時間制限に到達、読み取れないファイル）。ブロックはしません。 |
| `10`       | 使い方の誤り（不正なフラグ、対象の指定漏れ）                                   |
| `20`       | 内部エラー                                                                     |

`2` は意図的に `0` と区別されています：終わらなかったスキャンは「何も見つからなかった」のではありません。まだ探し終わっていないのです。

機械が消費するもの（MCP ツールの結果、`--json`、SARIF 2.1）はすべて、バージョン管理された**追加のみ**のスキーマ（`schemaVersion: 1`、`contractVersion: 1`）に基づく単一の正規結果から生成されます。そのため、どの利用者もレンダリングされたテキストから意味を組み立て直す必要はありません。[マシン契約](docs/machine-contract.md) を参照してください。ルール ID（`QA-<FAMILY>-NNN`）は一度リリースされると変更されず、再利用されることもありません。

<br />

## QA Doctor が教えてくれないこと

- **テストは実行しません**。スキャンがクリーンでも、スイートが通るとは限りません。
- **アサーションが*間違っている*ことは教えてくれません**。`expect(total).toBe(41)` は健全に見えます。QA Doctor が見つけるのは*失敗しようがない*テストと*赤くなりようがない*パイプラインであって、間違ったものを確認しているテストではありません。
- **ビジネス上の正しさは証明しません**。ここにあるものは何ひとつ、製品が要件どおりに動くことを示しません。
- **100 は良いスイートの証明ではありません**。スイートが本当のリスクをカバーしているかどうかは別の問いであり、このツールはそれに答えません。
- **79 のルールのうち 5 つは見積もりでリリースされています**。実測値ではありません。それぞれ自分の検出結果にそう明記しています。
- **E1 は E2 ではありません**。ヒューリスティックな検出結果は読む価値はあっても、盲目的に適用する価値はありません。
- **空のリポジトリのスコアは `null` であり、決して 100 にはなりません。**
- **テスト宣言のない `*.spec.ts` という名前のファイルは、カバレッジとして数えられません**。spec ファイルが import や型しか含まない（`it`/`test` の呼び出しがゼロの）リポジトリのスコアは、100 ではなく `null` です。

<br />

## ドキュメント

完全なドキュメントサイトは <https://sergey-bar.github.io/qa-doctor/> にあります。

| 文書                                                   | 内容                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | スコアの正規化と証拠による重み付け                            |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | 正規の用語集：ひとつの概念にひとつの言葉                      |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 実測の誤検知率とその手法                                      |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | ルールの状態、ティア、抑制、非推奨化                          |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver の方針、凍結されたインターフェース、非推奨化のサイクル |
| [docs/machine-contract.md](docs/machine-contract.md)   | 正規の機械可読な結果                                          |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 出力とエディターまたは CI の設定                        |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab：Code Quality レポート、MR のレシピ、ゲート            |
| [docs/rules/](docs/rules/)                             | 生成されたルールごとのカタログ                                |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 開発環境のセットアップとコントリビューションの流れ            |
| [SUPPORT.md](SUPPORT.md)                               | 質問、報告、サポートの窓口                                    |
| [SECURITY.md](SECURITY.md)                             | 脆弱性の報告                                                  |
| [CHANGELOG.md](CHANGELOG.md)                           | リリース履歴                                                  |

### ステータス

**バージョン 1**。JSON スキーマと終了コードは凍結された契約です。TypeScript と Python は最も幅広い実測カバレッジを持っています。Java と C# は比較的新しいので、[成熟度の表](https://sergey-bar.github.io/qa-doctor/reference/rule-lifecycle) と合わせて見てください。今後の予定（日付をでっち上げることはしません）：[公開ロードマップ](https://sergey-bar.github.io/qa-doctor/reference/roadmap)。

### コントリビューション

新しいルールは、最も取り組みやすい最初のコントリビューションです。コマンドひとつで、must-fire **と** must-not-fire の fixture 付きでルールの雛形が作られます。生成されたルールは、実際の検出ロジックが書かれるまで、わざと自分の fixture で失敗します。そのままリリースされたスタブは、誰も測定していないルールだからです。

```bash
qa-doctor create-rule QA-PW-140 --title "Screenshot without diff bound"
```

開発環境のセットアップ、常設ゲートのコマンド、anti-creep と fixture ファイアウォールの法則は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="あなたのリポジトリで試してみてください。" width="100%" />

```bash
npx qa-doctor-cli@latest
```

[ガイドを読む](https://sergey-bar.github.io/qa-doctor/guide/getting-started) · [ドキュメントサイト](https://sergey-bar.github.io/qa-doctor/) · [npm](https://www.npmjs.com/package/qa-doctor-cli)

<br />

テストが通ったかを問うのではなく、<br />
そのテストが信頼に値すると証拠が示しているかを問おう。

<sub>制作：[Sergey Bar](https://www.linkedin.com/in/sergeybar/) · MIT ライセンス</sub>

</div>
