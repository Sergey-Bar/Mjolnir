<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. 테스트는 무엇이 통과했는지 알려줍니다. Mjölnir는 무엇을 믿을 수 있는지 알려줍니다." width="100%" />

<br />

Mjölnir는 실패할 수 없는 테스트와 빨간색이 될 수 없는 파이프라인을 찾아낸 뒤,<br />
결과를 어디까지 믿을 수 있는지 모든 항목에 증거를 붙여 점수로 매깁니다.

<br />

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![downloads](https://img.shields.io/npm/dm/mjolnir-qa.svg?style=flat-square&color=1F6F7C&labelColor=0A1119)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0A1119)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Sergey-Bar/Mjolnir?style=flat-square&color=1F6F7C&labelColor=0A1119&label=coverage)](https://codecov.io/gh/Sergey-Bar/Mjolnir)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Sergey-Bar/Mjolnir/badge)](https://scorecard.dev/viewer/?uri=github.com/Sergey-Bar/Mjolnir)
[![license](https://img.shields.io/badge/license-MIT-1F6F7C.svg?style=flat-square&labelColor=0A1119)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-1F6F7C.svg?style=flat-square&labelColor=0A1119)](https://nodejs.org)

```bash
npx mjolnir-qa@3.0.0
```

[실제 동작 보기](#실제-동작-보기) · [빠른 시작](#빠른-시작) · [무엇을 찾는가](#mjölnir가-찾는-것) · [점수](#신뢰도-점수) · [증거](#증거-모델) · [실행 포렌식](#런타임-포렌식) · [CI](#ci-무결성) · [에이전트](#ai-에이전트) · [보안](#신뢰와-보안) · [한계](#mjölnir가-알려줄-수-없는-것) · [문서](#문서)

<details>
<summary>다른 언어로 읽기 — 22개 번역</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | 한국어 | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-26.

<!-- Source hash: `de04dfb1677b` -->

</details>

</div>

<br />

## Release status (English canonical)

The published line is `3.0.0`; this working tree is the `4.0.0`
candidate. `3.0.0` must not be republished or retagged. The M26–M50 program is
tracked in
[`docs/ROADMAP.yaml`](docs/ROADMAP.yaml); provisional capability contracts
are not automatically enabled or certified. Repository-owned checks pass, but
Trust certification remains `NOT_CERTIFIED` until the protected holdout,
real-world, platform/consumer, remote-workflow, support-matrix, and corpus
evidence gates pass. Run `npm run m26:readiness` before treating any candidate
as releasable. This document does not publish a tag or authorize a release.

> Machine-assisted canonical text. Translate this block before treating it as localized copy.

## 초록색 체크는 주장일 뿐, 증명이 아닙니다

초록색 체크는 파이프라인이 실패하지 않았다는 뜻입니다. 테스트가 실행되었다거나, 테스트가 실패할 수 있었다는 뜻은 아닙니다. 다음은 모두 초록색으로 통과합니다.

- 900개가 아니라 3개의 테스트만 실행한, 커밋된 `.only`
- 게이트 역할을 해야 할 job에 붙은 `continue-on-error: true`
- 테스트 명령 뒤에 붙은 `|| true`
- 아무것도 단언하지 않거나 본문이 비어 있는 테스트
- 진짜 실패를 운 좋은 통과로 바꿔 버리는 재시도 래퍼
- workflow가 업로드하지만 한 번도 생성된 적 없는 리포트
- 경쟁 상태를 겨우 붙잡고 있는 고정 sleep

이 중 어느 것도 파이프라인을 빨간색으로 만들지 않고, 리뷰에서는 모두 의도된 것처럼 보입니다. 그래서 살아남습니다. Mjölnir가 실제 사례를 읽는 모습입니다.

<p align="center">
  <img src="assets/readme/scan.svg" alt="데모 저장소의 CI workflow를 한 줄씩 읽은 것입니다. Mjölnir는 각 발견 사항을 보고한 줄에 표시하고, 규칙, 무엇이 잘못되었는지, 증거 수준, 측정된 오탐률을 함께 보여줍니다." width="800" />
</p>

<sub>데모 스캔이 이 workflow에 대해 보고한 모든 발견 사항을 보고된 줄에 표시했습니다. `npm run docs:readme-brand`가 [`demo-report.json`](assets/readme/demo-report.json)에서 생성하며, CI에서 변경되지 않도록 고정됩니다.</sub>

**엄격 모드.** 가장 공격적인 탐지 — `.only`, `continue-on-error`, 빈 테스트, 재시도 남용 — 는 격리 티어에 있습니다. `--strict`에서만 실행되며 `info` 심각도로 제한됩니다: 플래그를 지정하지만 절대 게이트를 닫지 않습니다. 기본 스캔(`--strict` 없는 `npx mjolnir-qa@3.0.0`)은 핵심 및 확장 규칙만 다룹니다. 자문 레이어도 원할 때 `--strict`를 추가하세요.

Mjölnir는 테스트 스위트와 CI workflow, 그리고 있다면 실제 실행 리포트를 읽습니다. 테스트를 실행하지 않고, 의존성을 설치하지 않으며, 스캔하는 코드를 실행하지도 않습니다. 증거가 없을 때는 확신을 지어내는 대신 그렇다고 말합니다.

| 상황                                         | Mjölnir의 보고                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| 테스트 선언을 찾을 수 없음                   | 점수 `null`, **UNKNOWN**으로 표시됩니다. 지어낸 100점은 절대 없습니다. |
| 기준선이나 비교할 수 있는 리비전이 없음      | **UNKNOWN**, 이유를 명시합니다. 0점으로 가정하는 일은 절대 없습니다.   |
| 스캔이 중단됨 (시간 예산, 읽을 수 없는 파일) | **PARTIAL**, 종료 코드 `2`. 깨끗한 결과로 표시되지 않습니다.           |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Mjölnir의 동작 방식. 테스트 스위트와 CI 파이프라인을 정적으로 읽고, 실제 실행 리포트가 있으면 그것도 읽습니다. 각 발견 사항에 증거 수준과 신뢰 수준으로 가중치를 매기며, L3부터 L5까지는 실제 실행만 도달할 수 있습니다. 결과로 발견 사항, 신뢰도 점수, 그리고 고정된 종료 코드 기반의 CI 게이트를 만들어 냅니다. 에이전트 루프에서는 AI가 수정을 작성하고 Mjölnir가 다시 스캔해 그것을 증명합니다." width="880" />
</p>

<sub>이 페이지를 위해 구성했고 1:1 크기로 보여줍니다. `npm run docs:readme-brand`로 생성되며 CI에서 변경되지 않도록 고정됩니다. 점수, 개수, 규칙 ID는 [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json), 규칙 레지스트리에서 가져오며 손으로 입력하지 않습니다. 같은 그림의 포스터 버전: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## 실제 동작 보기

CI workflow가 있는 작은 Playwright 스위트인 [`examples/demo-repo`](examples/demo-repo)를 실제로 스캔한 결과입니다. 점수는 여기서 깎였습니다.

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir의 감점 내역: WORTHINESS 80/100 WORTHY, 카테고리별 점수, 심각도별 감점 상자, 그리고 FIX THIS FIRST 목록" width="520" />
</p>

<sub>`npm run docs:hero`가 실제 스캔으로 생성하며 CI에서 변경되지 않도록 고정됩니다. 같은 스캔의 전체 `--verbose` 리포트는 [`demo.svg`](assets/readme/demo.svg)입니다 (`npm run docs:demo`).</sub>

<details>
<summary><strong>영상으로 보기</strong> — 스캔, 스캔이 출력하는 수정, 그리고 그 수정을 증명하는 재스캔</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="데모 녹화의 한 프레임: 터미널 창에서 npx mjolnir-qa@3.0.0가 데모 저장소를 스캔하는 모습" width="900" />
  </a>
</p>

<sub>`npm run docs:video`가 실제 스캔으로부터 프레임 단위로 렌더링했으며, 화면 녹화가 아닙니다. 프레임을 선택하면 [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4)가 열립니다.</sub>

</details>

### 발견 사항 하나 자세히 보기

모든 발견 사항은 네 가지 질문에 답합니다. 어디에 있는지, Mjölnir가 얼마나 확신하는지, 그 규칙이 얼마나 자주 틀리는지, 그리고 어떻게 고치는지.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="데모 스캔의 첫 번째 발견 사항을 터미널이 출력하는 그대로 보여주고, 네 부분을 표시했습니다: 위치, 확신 정도, 규칙이 틀리는 빈도, 그리고 수정 방법." width="100%" />
</p>

`mjolnir explain QA-CI-001`은 규칙의 신뢰 기록 전체를 출력합니다. 측정된 오탐률과 그 비율로 얻은 등급도 포함됩니다.

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

이것이 가치의 단위입니다. CI가 얻지 못한 통과를 보고하는 한 지점.

<br />

## 빠른 시작

```bash
npx mjolnir-qa@3.0.0
```

현재 디렉터리를 스캔하고 Trust Report를 출력합니다. 무엇을 찾았는지, 어디까지 믿을 수 있는지, 그 이유, 그리고 다음에 할 일. 게이트 이상에서 아무것도 발견되지 않으면 `0`으로 종료합니다.

CI에서는 브랜치가 도입한 부분만 스캔하세요. 그래야 레거시 스위트가 첫 pull request를 뒤덮지 않습니다.

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

`mjolnir ci install`은 이를 GitHub Actions workflow로 작성하며, 메이저 태그 `v3`에 고정된 [action](https://github.com/Sergey-Bar/Mjolnir#readme)을 사용합니다 (`--no-action`을 쓰면 일반 `npx`). 차단해야 한다고 결정하기 전까지는 권고 모드로 유지됩니다.

| 명령                                          | 하는 일                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `mjolnir`                                     | Trust Report: 판정, 확신도, 다음 조치           |
| `mjolnir --scope changed`                     | 브랜치가 도입한 부분만 (CI용 형태)              |
| `mjolnir ci install`                          | 권고용 PR workflow 생성 (action 기반)           |
| `mjolnir business-case`                       | ROI estimate: projected savings per finding     |
| `mjolnir release-report`                      | Release readiness: GO, CONDITIONAL GO, or NO-GO |
| `mjolnir release-trust`                       | 12-dimension release assurance verdict          |
| `mjolnir report`                              | Generate a Playwright-compatible report         |
| `mjolnir trend`                               | Record, show, or diff local quality snapshots   |
| `mjolnir policy`                              | Initialize, validate, or check policy gates     |
| `mjolnir quarantine`                          | Review deterministic proposals (prototype)      |
| `mjolnir analyze --cross-file`                | Bounded cross-file analysis                     |
| `mjolnir ci-adapter github .`                 | Generate CI templates for supported providers   |
| `mjolnir dashboard`                           | Generate a self-contained quality dashboard     |
| `mjolnir exec-report`                         | Executive KPIs and recommendations (advisory)   |
| `mjolnir enterprise`                          | Self-hosted templates (prototype)               |
| `mjolnir maturity`                            | Assess maturity or display maturity levels      |
| `mjolnir mutation tests/mutation-report.json` | Analyze mutation reports; never promotes trust  |
| `mjolnir mcp`                                 | Read-only MCP tools over stdio                  |
| `mjolnir explain QA-CI-001`                   | 무엇이, 왜, 어떻게 고치는지와 측정된 FP 비율    |
| `mjolnir why src/a.spec.ts:42`                | 바로 이 줄이 표시된 이유. 차단하지 않습니다.    |
| `mjolnir forensics ./test-results/`           | 실제 실행에서 얻은 런타임 증거                  |
| `mjolnir trust-report`                        | 독립형 Trust Artifact (md + json)               |
| `mjolnir handoff`                             | 코딩 에이전트를 위한 수정 계획                  |
| `mjolnir --json` / `--format sarif`           | 기계가 읽을 수 있는 출력, GitHub Code Scanning  |
| `mjolnir --format codequality`                | GitLab Code Quality 리포트 (MR 위젯 아티팩트)   |
| `mjolnir --strict`                            | quarantine 등급 규칙도 실행 (FP 위험이 더 높음) |

<details>
<summary><strong>그 밖의 모든 명령</strong> — 불안정한 테스트 분류, 리포트, 거버넌스</summary>

<br />

| 명령                                | 하는 일                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| `mjolnir --classic`                 | Trust Report 이전의 점수 배너 화면                              |
| `mjolnir explain verdict`           | 저장된 스캔의 판정이 왜 그렇게 나왔는지                         |
| `mjolnir triage ./test-results/`    | 안내형 분류. 모든 행이 다음 조치로 끝납니다.                    |
| `mjolnir pw-report ./test-results/` | Playwright 실행 요약: 재시도, 불안정한 테스트, 가장 느린 테스트 |
| `mjolnir doctor:playwright`         | Playwright 전용 심층 스캔과 Selector Health Score               |
| `mjolnir fix --dry-run` / `fix`     | 안전한 자동 수정. 각 수정은 재스캔으로 적용되었음을 증명합니다  |
| `mjolnir baseline` / `diff`         | 발견 사항의 스냅숏을 만든 뒤 새롭거나 악화된 것만 보고          |
| `mjolnir impact --since <ref>`      | 커밋이 도입하고 해결한 것                                       |
| `mjolnir summary`                   | 리포트로부터 CI 주석과 step 요약 생성                           |
| `mjolnir pr-comment`                | 범위를 한정한 PR 댓글 (Markdown)                                |
| `mjolnir debt`                      | 비용 모델을 포함한 테스트 부채 목록                             |
| `mjolnir handover`                  | 새 QA 엔지니어를 위한 스위트 온보딩 지도                        |
| `mjolnir init`                      | 프레임워크를 감지하고 설정 체크리스트 출력                      |
| `mjolnir suppressions`              | 억제된 발견 사항 목록 (거버넌스용)                              |
| `mjolnir rules --unmeasured`        | 측정이 아니라 가정으로 동작하는 규칙                            |
| `mjolnir rules --md`                | 전체 규칙 카탈로그 (JSON 또는 Markdown)                         |
| `mjolnir doctor`                    | Mjölnir 자체 규칙 기반에 대한 자체 감사                         |
| `mjolnir create-rule <ID>`          | 새 규칙과 그 fixture의 뼈대 생성                                |
| `mjolnir stats`                     | 지금까지 본 수정의 로컬 누적 카운터                             |
| `mjolnir badge`                     | shields.io 엔드포인트 JSON과 스니펫                             |
| `mjolnir --cache`                   | 로컬 판정 캐시를 이용한 증분 재스캔                             |
| `mjolnir --format mermaid`          | PR 댓글용 테스트 아키텍처 다이어그램                            |

`mjolnir help <command>`는 어떤 명령이든 사용법, 예시, 다음 단계를 출력합니다.

</details>

Windows, macOS 또는 Linux에서 **Node.js ≥ 22.18**이 필요합니다. 전역 설치를 원하시나요? `npm i -g mjolnir-qa`. 이 최소 버전은 빌드 도구 체인에서 옵니다 (tsdown이 이를 대상으로 하고 릴리스 파이프라인이 이에 대해 스모크 테스트를 합니다). 런타임 의존성은 그 이상을 요구하지 않습니다.

<br />

## Mjölnir가 찾는 것

<p align="center">
  <img src="assets/readme/stack.svg" alt="사용 중인 스택과 함께 동작합니다: 규칙이 다루는 언어, 테스트 프레임워크, CI 시스템 (규칙 레지스트리 기준)." width="100%" />
</p>

네 가지 계열(테스트 위생, 테스트 품질, Playwright, CI 무결성)에 걸친 **79개 규칙**이 TypeScript와 JavaScript, Python, Java, C#, GitHub Actions YAML을 다룹니다. Playwright의 네 가지 바인딩 모두와 pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest, Mocha를 지원하며, Cypress와 Selenium은 입문 수준으로 지원합니다. 형태를 보여주기 위해 그중 아홉 개를 소개합니다.

| ID           | 규칙                                                            | 심각도  | 등급       |
| ------------ | --------------------------------------------------------------- | ------- | ---------- |
| QA-CI-001    | `continue-on-error`가 실패하는 검증 게이트를 가림               | error   | quarantine |
| QA-CI-009    | 테스트 종료 코드가 전달되지 않음 (pipefail 없는 `\|`, `;` 체인) | error   | extended   |
| QA-TEST-001  | 포커스된 테스트가 커밋됨 (`.only`, `fit`)                       | error   | quarantine |
| QA-TEST-003  | 단언이 없는 테스트                                              | error   | quarantine |
| QA-TQUAL-009 | await하지 않은 promise 단언                                     | error   | quarantine |
| QA-PW-002    | await하지 않은 locator 단언                                     | error   | core       |
| QA-PW-004    | 깨지기 쉬운 CSS/XPath 선택자                                    | warning | quarantine |
| QA-PY-002    | 건너뛴 테스트 (`skip`, 엄격하지 않은 `xfail`)                   | warning | core       |
| QA-CS-103    | 단언이 없는 테스트 메서드                                       | error   | core       |

전체 카탈로그는 레지스트리에서 생성되며 손으로 관리하지 않습니다: `mjolnir rules --md`, [`docs/rules/`](docs/rules/), 또는 [검사 항목 가이드](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>이 README에 나오는 모든 규칙</strong>을 한 표에</summary>

<br />

> `quarantine` 규칙은 `--strict`에서만 실행되며 절대 차단하지 않습니다 (info로 상한이 걸립니다). 표시된 심각도는 작성자가 정한 값입니다.

| ID           | 계열       | 규칙                                                        | 심각도  | 등급       |
| ------------ | ---------- | ----------------------------------------------------------- | ------- | ---------- |
| QA-TEST-001  | 위생       | 포커스된 테스트가 커밋됨 (`.only`, `fit`)                   | error   | quarantine |
| QA-TEST-002  | 위생       | 건너뛴 테스트. 추적되는 이유가 없으면 `error`로 격상됩니다. | warning | quarantine |
| QA-TEST-003  | 위생       | 단언이 없는 테스트                                          | error   | quarantine |
| QA-TEST-004  | 위생       | 고정 sleep (`waitForTimeout`, `sleep()`, `delay()`)         | warning | extended   |
| QA-TEST-006  | 위생       | 불안정성을 숨기는 재시도 남용                               | warning | quarantine |
| QA-TEST-010  | 위생       | 빈 테스트 본문                                              | error   | quarantine |
| QA-TQUAL-002 | 품질       | 동어반복적 단언                                             | error   | quarantine |
| QA-TQUAL-009 | 품질       | await하지 않은 promise 단언                                 | error   | quarantine |
| QA-TQUAL-011 | 품질       | 주석 처리된 테스트                                          | warning | extended   |
| QA-PW-002    | Playwright | await하지 않은 locator 단언                                 | error   | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()`가 커밋됨                     | error   | core       |
| QA-PW-004    | Playwright | 깨지기 쉬운 CSS/XPath 선택자                                | warning | quarantine |
| QA-PW-123    | Playwright | 하드코딩된 환경 URL                                         | warning | quarantine |
| QA-PW-140    | Playwright | `maxDiffPixelRatio` 없는 스크린숏                           | warning | core       |
| QA-CI-001    | CI         | `continue-on-error`가 실패하는 게이트를 가림                | error   | quarantine |
| QA-CI-002    | CI         | `\|\| true`가 종료 코드를 삼킴                              | error   | extended   |
| QA-CI-005    | CI         | 리포트를 사용하지만 생성하지 않음                           | error   | quarantine |
| QA-CI-007    | CI         | 테스트를 감싸는 재시도 래퍼                                 | warning | extended   |
| QA-CI-008    | CI         | 항상 성공하는 step이 실패를 가림                            | error   | quarantine |
| QA-CI-009    | CI         | 종료 코드가 전달되지 않음 (pipefail 없는 `\|`, `;` 체인)    | error   | extended   |
| QA-CI-010    | CI         | 차단해야 할 곳에서 테스트를 건너뜀                          | error   | quarantine |
| QA-PY-002    | Python     | 건너뛴 테스트 (`skip`, 엄격하지 않은 `xfail`)               | warning | core       |
| QA-PY-003    | Python     | 단언이 없는 테스트 함수                                     | error   | quarantine |
| QA-PY-005    | Python     | 테스트 안의 `time.sleep()`                                  | warning | extended   |
| QA-PY-012    | Python     | 동어반복적 단언                                             | error   | quarantine |
| QA-JV-101    | Java       | 비활성화된 테스트 (`@Disabled`)                             | warning | core       |
| QA-JV-102    | Java       | 고정 sleep (`Thread.sleep()`)                               | warning | extended   |
| QA-JV-103    | Java       | 단언이 없는 테스트 메서드                                   | error   | extended   |
| QA-JV-105    | Java       | Playwright `waitForTimeout()` 고정 sleep                    | warning | core       |
| QA-JV-106    | Java       | 역할 기반 locator 대신 깨지기 쉬운 선택자                   | warning | quarantine |
| QA-CS-101    | C#         | 건너뛴 테스트 (`[Ignore]`, `[Fact(Skip=)]`)                 | warning | core       |
| QA-CS-102    | C#         | 고정 sleep (`Thread.Sleep` / `Task.Delay`)                  | warning | core       |
| QA-CS-103    | C#         | 단언이 없는 테스트 메서드                                   | error   | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` 고정 sleep                          | warning | extended   |
| QA-CS-106    | C#         | 역할 기반 locator 대신 깨지기 쉬운 선택자                   | warning | quarantine |

Python에는 QA-PY-001…012 (pytest 위생)와 QA-PY-101…108 (Python용 Playwright)도 있습니다. Cypress와 Selenium에는 각각 세 개 규칙으로 된 입문 세트가 있습니다.

</details>

모든 규칙은 must-fire **그리고** must-not-fire fixture와 함께 배포되며, 자신의 음성 fixture에서 발동하는 규칙은 배포될 수 없습니다. 이것이 오탐 방화벽입니다. `mjolnir doctor`가 이 저장소의 CI에서 이를 강제합니다.

### Selector Health Score

`mjolnir doctor:playwright`는 각 locator가 요소를 찾는 방식으로 등급을 매깁니다. 사용자처럼 찾는지 (역할, 레이블, 텍스트), 명시적 계약을 통하는지 (`data-testid`), 아니면 구조적 우연에 기대는지 (CSS 체인, XPath). 파일마다 0에서 100 사이의 점수를 받습니다.

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

이 점수는 **정확성이 아니라 복원력**을 측정합니다. `.btn.btn-primary > div:nth-child(2)`는 오늘 통과하고, 누군가 마크업을 건드리기 전까지 계속 통과합니다. 낮은 점수는 테스트가 망가졌다고 주장하지 않으며, 아무도 유지하겠다고 약속하지 않은 마크업에 의존한다는 뜻일 뿐입니다.

<br />

## 신뢰도 점수

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="0부터 100까지의 신뢰도 척도와 모든 점수를 훑는 표시기: 50 미만 UNWORTHY, 50~79 NEEDS WORK, 80~99 WORTHY, 100 FORGED" width="720" />
</p>

<sub>0부터 100까지의 모든 점수를 실제 `deriveScoreState`로 배치했습니다. `npm run docs:gauge`로 생성되며 CI에서 변경되지 않도록 고정됩니다.</sub>

| 점수      | 판정                                    |
| --------- | --------------------------------------- |
| `0 – 49`  | **UNWORTHY**                            |
| `50 – 79` | **NEEDS WORK**                          |
| `80 – 99` | **WORTHY**                              |
| `100`     | **FORGED**                              |
| `null`    | **UNKNOWN**: 테스트 선언을 찾을 수 없음 |

**계산 방식.** 심각도가 기본 감점을 정하고 (`error −8`, `warning −3`, `info −1`) 증거 수준이 이를 할인합니다. E2는 전액, E1은 절반 (내림), E0는 감점 없음. 합계는 스위트 규모로 정규화되며, 파일당이 아니라 테스트 선언당 감점입니다. 터미널은 점수에 쓰인 것과 같은 할인된 숫자를 출력하며, 숨겨진 두 번째 모델은 없습니다. 자세한 내용: [docs/SCORING.md](docs/SCORING.md)와 [점수 가이드](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**100점이 의미하지 않는 것.** 소프트웨어가 올바르다는 뜻도, 스위트가 충분하다는 뜻도, 제품에 결함이 없다는 뜻도 아닙니다. 의미하는 것은 하나뿐입니다. **이 스캔과 이 증거 모델에서 Mjölnir가 평가한 규칙 중 어느 것도 감점을 만들지 않았다는 것.**

<br />

## 증거 모델

모든 발견 사항에는 두 개의 라벨이 붙습니다. Mjölnir가 얼마나 확신하는지, 그리고 그 발견 사항이 어디까지 확인되었는지. 이것이 패턴을 보고하는 도구와 릴리스 게이트로 삼을 수 있는 도구의 차이입니다.

**얼마나 확실한가 — 증거 수준.**

| 수준   | 이름          | 의미                                                 | 감점 |
| ------ | ------------- | ---------------------------------------------------- | ---- |
| **E2** | 결정론적 증명 | 작성된 코드 그대로에 결함이 존재함                   | 전액 |
| **E1** | 패턴 증거     | 결함과 강하게 연결된 패턴이 일치함                   | 절반 |
| **E0** | 관찰          | 알아둘 가치가 있음. 무언가 잘못되었다는 주장은 아님. | 없음 |

탐지의 확신도는 증명의 강도가 아닙니다. 규칙은 찾던 것과 일치했다고 확신하면서도 여전히 휴리스틱을 보고 있을 수 있습니다. E1 발견 사항은 읽고 판단하기 위한 것이지 맹목적으로 적용하기 위한 것이 아니며, 그 경계는 터미널, JSON, 에이전트 인계 자료의 발견 사항에 모두 표시됩니다.

**어디까지 확인했는가 — 신뢰 수준.** 대부분의 발견 사항은 코드를 읽어서 나옵니다. 실제 테스트 실행 리포트를 Mjölnir에 주면 코드가 실제로 실행되었는지 확인할 수 있습니다.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="L0부터 L5까지의 신뢰 사다리. L0~L2는 코드를 읽어서 얻고, L3~L5는 실제 실행 리포트가 필요하며, 사다리의 끊긴 부분으로 표시됩니다." width="100%" />
</p>

| 수준   | 쉽게 말하면        | 필요한 것                                              |
| ------ | ------------------ | ------------------------------------------------------ |
| **L0** | 기록됨             | 코드 읽기                                              |
| **L1** | 문제로 보임        | 코드 읽기: 패턴이 일치함                               |
| **L2** | 코드에서 증명됨    | 코드 읽기: 결함이 구조적임                             |
| **L3** | 파일이 실행됨      | 실행 리포트가 발견 사항의 파일이 실행되었음을 보여줌   |
| **L4** | 테스트가 실행됨    | 실행 리포트가 발견 사항의 테스트가 실행되었음을 보여줌 |
| **L5** | 실행 결과가 일치함 | 실행 자체의 결과가 결함 유형을 확인함                  |

정적 스캔은 L2에서 멈춥니다. 실제 실행 리포트 (Playwright JSON, Jest 또는 Vitest JSON, JUnit XML)만이 발견 사항을 L3 이상으로 올릴 수 있으므로, 실행되는 모습이 한 번도 확인되지 않은 발견 사항은 실행되었다고 주장할 수 없습니다. 정의: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### 이 중 얼마나 측정되었는가

**79개 규칙 중 74개는 실제 OSS 코드로 측정한 오탐률을 갖고 있습니다** (규칙마다 손으로 분류한 발견 사항 10개 이상. [docs/FP-AUDIT.md](docs/FP-AUDIT.md) 참고). 나머지 5개는 작성자의 추정치로 배포되며, `mjolnir explain`에서 규칙별로 그 사실을 밝힙니다. `mjolnir rules --unmeasured`가 이를 나열하고, 모든 스캔의 하단에는 실제로 _발동한_ 규칙 중 몇 개가 측정되었는지 보고합니다.

비율은 나쁠 때도 공개합니다. QA-TEST-001 (커밋된 `.only`)은 실제 저장소 감사 결과가 나빠서 quarantine에 있습니다. QA-PW-141을 포함한 모든 규칙의 최신 수치는 감사 문서에 있습니다.

### 규칙 신뢰 등급

등급은 의견이 아니라 측정된 오탐률을 따릅니다.

| 등급           | 측정된 FP                       | 동작                                         |
| -------------- | ------------------------------- | -------------------------------------------- |
| **core**       | ≤ 10%                           | 기본 리포트, 차단함                          |
| **extended**   | ≤ 30%                           | 기본 리포트, 낮은 확신도                     |
| **quarantine** | > 30% 또는 명시적으로 선언된 것 | `--strict`에서만, info로 상한, 차단하지 않음 |
| _측정 안 됨_   | n < 10                          | 측정되기 전까지 core로 승격할 수 없음        |

FP 밴드는 티어를 강등할 수만 있습니다 — 명시적으로 `quarantine`에 선언된 규칙을 거기서 승격시키지는 않습니다. 명시적으로 quarantine에 놓인 규칙은 측정된 FP율과 관계없이 quarantine에 머뭅니다.

승격, 강등, 언어별 성숙도: [규칙 생명 주기](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### 왜 이것은 린터가 아닌가

린터는 코드가 규칙을 따르는지 알려줍니다. Mjölnir는 검증을 믿을 수 있는지 알려줍니다.

|                                                       | 린터 (ESLint, SonarQube) | 커버리지 도구 | AI 코드 리뷰 | **Mjölnir**  |
| ----------------------------------------------------- | :----------------------: | :-----------: | :----------: | :----------: |
| 제품 코드가 아니라 **검증 시스템**에 점수를 매김      |          아니요          |    아니요     |    아니요    |      예      |
| CI workflow 무결성 (`continue-on-error`, `\|\| true`) |          아니요          |    아니요     |    diff만    |      예      |
| Playwright locator의 복원력 평가 (Selector Health)    |          아니요          |    아니요     |    아니요    |      예      |
| 실제 실행 데이터를 읽어 `TRUE-FLAKE` 판정             |          아니요          |    아니요     |    아니요    |      예      |
| 규칙별 측정 오탐률 공개                               |          아니요          |    아니요     |    아니요    |      예      |
| 단언이 없는 테스트 표시                               |           예\*           |    아니요     |     가끔     |      예      |
| 고정 sleep 탐지 (`waitForTimeout`, `time.sleep`)      |           예\*           |    아니요     |     가끔     |      예      |
| 결정론적 (같은 입력, 같은 출력)                       |            예            |      예       |    아니요    |      예      |
| 스캔당 비용                                           |           무료           |     무료      |     토큰     | **0** (로컬) |

<sub>\*`eslint-plugin-jest`와 `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`), 그리고 SonarQube 자체의 단언 규칙이 다룹니다. 각 열은 테스트 스위트 검증의 기본 동작을 설명하며, 플러그인, 유료 요금제, 사용자 정의 규칙에 따라 일부 답이 달라집니다. 이것은 포지셔닝 요약이지 벤치마크가 아닙니다.</sub>

AI 리뷰도 함께 쓰세요. AI 리뷰는 어떤 패턴으로도 찾을 수 없는 뉘앙스, 의도, 설계 결함을 잡아냅니다. Mjölnir는 AI 리뷰가 의도된 것처럼 보여서 놓치는 것을 잡습니다: 커밋된 `.only`, 삼켜진 종료 코드, 테스트 job에 붙은 `continue-on-error`. 이런 것에는 추론이 아니라 스캔이 필요합니다.

<br />

## 런타임 포렌식

정적 분석은 한 번도 실행되지 않은 코드에 대해 추론합니다. 포렌식은 실제로 일어난 일을 읽습니다: 어떤 러너든 Playwright JSON, Jest JSON, Vitest JSON, JUnit XML.

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

`TRUE-FLAKE`는 테스트가 재시도되었다는 뜻이 아닙니다. 테스트가 **적어도 한 번의 시도에서 실패한 뒤 초록색으로 끝났다**는 뜻입니다. 운 좋은 통과이며, 최종 체크가 무엇을 말하든 표시됩니다. `mjolnir triage`는 그 이력을 격리 제안으로 바꾸고, `mjolnir pw-report`는 실행을 요약합니다. 발견 사항을 신뢰 수준 L3 이상으로 올리는 것도 바로 이 실행 리포트입니다.

<br />

## CI 무결성

테스트는 통과하는데 그것을 둘러싼 파이프라인은 실패할 수 없는 경우가 있습니다. Mjölnir는 workflow도 읽습니다: `continue-on-error`, `|| true`, 전달되지 않는 종료 코드, 항상 성공하는 step, 사용되지만 생성되지 않는 리포트, 그리고 차단해야 할 이벤트에서 건너뛰는 게이트. 각 발견 사항은 job, step, 줄을 지목하며 자체 증거 수준을 가집니다.

PR workflow를 생성합니다 (기본은 권고 모드):

```bash
mjolnir ci install
```

또는 이미 있는 workflow에 Marketplace action을 추가합니다:

```yaml
- uses: Sergey-Bar/Mjolnir@v3
  with:
    scope: changed
    fail-on: error
```

메이저 라인을 따라가려면 `@v3`을, 재현 가능한 게이트를 원하면 정확한 태그 (`@v0.5.32`)를 고정하세요. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md)는 Marketplace, Smithery, MCP 레지스트리를 다룹니다.

발견 사항을 GitHub Code Scanning에 올리려면 SARIF를 업로드하세요 (workflow 또는 job 범위에서 `security-events: write` 필요):

```yaml
- run: npx mjolnir-qa@3.0.0 --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

GitLab에서는 `--format codequality`가 MR 위젯과 diff 주석이 읽는 Code Quality 리포트를 작성합니다 ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). 에디터와 파이프라인 설정: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### 변경 범위 귀속

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

발견 사항은 **merge-base** 기준으로 측정해 브랜치가 추가한 줄에 귀속됩니다. 범위는 전체 스캔이 찾는 것과 같은 파일 집합 (TS/JS spec과 어댑터 설정, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`)에 커밋되지 않은 변경과 추적되지 않은 변경을 더한 것이라, 커밋하기 전에도 동작합니다. 기준은 `main → master → origin/main → origin/master → origin/HEAD` 순서로 결정되며, `--base <ref>`로 바꿀 수 있습니다.

merge-base를 결정할 수 없으면 (얕은 클론, detached HEAD, git 밖의 대상) 발견 사항은 파일 전체 귀속으로 대체되며 **리포트가 그 사실을 알립니다.** 조용한 대체는 바로 이 도구가 잡아내려고 존재하는 종류의 결함이기 때문입니다.

<br />

## AI 에이전트

발견 사항은 무언가가 그에 따라 행동할 때만 가치가 있습니다.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI가 수정을 작성하고, Mjölnir가 그것을 검증합니다.** 증명은 재스캔에서 나오며, 에이전트 스스로의 성공 보고에서 나오지 않습니다.

| 명령              | 에이전트가 받는 것                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | stdio 기반 [MCP](https://modelcontextprotocol.io) 서버. `scan`, `explain`, `diff`가 호출 가능한 도구가 됩니다.                                          |
| `mjolnir handoff` | 저장된 `--json` 리포트가 결정론적인 Markdown 계획이 됩니다: 무엇이 탐지되었는지, 발견 사항별 증거 경계, 바뀌면 **안 되는** 것, 검증 방법.               |
| `mjolnir install` | 저장소에 이미 있는 에이전트 설정 위치 (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`)에 작성해, 에이전트가 완료했다고 말하기 전에 다시 스캔하게 합니다. |

자체 CLI가 있는 클라이언트에 추가하기:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@3.0.0 mcp
```

또는 `mcpServers` 블록을 받는 모든 클라이언트에:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@3.0.0", "mcp"] }
  }
}
```

**편의보다 가드레일이 더 중요합니다.** 인계 자료의 모든 발견 사항에는 경계가 붙어 있습니다. **E2**는 _결정론적: 위치를 확인하고 수정을 적용하세요_ 라고 말합니다. **E1**은 _확인 필요: 관찰만으로는 결함이 증명되지 않습니다_ 라고 말합니다. E1을 맹목적으로 고치거나, 규칙을 억제하거나, 점수를 올리려고 규칙을 수정하는 에이전트는 바로 이 도구가 잡아내려는 일을 하는 것이므로, 인계 자료는 프롬프트 안에서 발견 사항 바로 옆에 그렇게 적어 둡니다.

<br />

## 신뢰와 보안

**로컬 우선, 텔레메트리 없음.** 네트워크를 쓸 수 있는 API (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket)는 `src/` 어디에도 없으며, 하나라도 나타나면 [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts)가 빌드를 실패시킵니다. `eval`과 `new Function`도 금지합니다. 신뢰할 수 없는 코드를 스캔해도 그 코드를 실행하지 않습니다. 정적 분석은 소스 텍스트를 읽고, 포렌식은 이미 디스크에 있는 리포트 파일을 파싱합니다.

주의할 점 두 가지: `npx` 자체는 무엇이든 실행되기 전에 패키지를 내려받으며, 이 보장은 `src/`에 적용될 뿐 서드파티 플러그인에는 적용되지 않습니다.

**플러그인은 샌드박스에서 실행되지 않습니다.** JS 플러그인 (`mjolnir-rules/*.mjs`, 또는 `"plugins"` 아래 나열된 npm 패키지)은 Node의 모든 권한으로 실행되며, ESLint나 Vitest 플러그인과 같은 신뢰 모델입니다. 로드는 **스캔마다** 명시적으로 켜야 합니다. `--enable-plugins` (또는 `MJOLNIR_ENABLE_PLUGINS=1`)가 없으면 소스가 절대 로드되지 않고, stderr의 알림이 건너뛴 항목을 나열합니다. JSON 규칙 매니페스트는 코드를 실행하지 않으며, 코어 규칙 ID 접두사는 예약되어 있어 플러그인이 코어 규칙을 사칭할 수 없습니다. 취약점은 [SECURITY.md](SECURITY.md)로 신고해 주세요.

**자기 자신에게도 실행됩니다.** 검증 신뢰 엔진은 스스로 검증 가능하지 않으면 설 자리가 없습니다. 모든 CI 실행은 같은 실행에서 만든 빌드로 이 저장소를 스캔합니다. 게이트는 error 심각도의 발견 사항이 하나라도 있으면 실패하고, **부분** 스캔이나 **충돌한 규칙**이 있어도 실패합니다. 아무것도 보고하지 않는 잘린 자체 스캔이야말로 이 프로젝트가 잡아내려는 가짜 초록색이기 때문입니다. `mjolnir doctor`는 같은 실행에서 규칙 기반을 다시 감사하며 (fixture 방화벽, 등급의 정직성, core 등급 상한), 결과가 INCONCLUSIVE인 검사는 실패한 검사와 똑같이 실패합니다. 두 리포트 모두 빌드 아티팩트로 업로드됩니다.

### 종료 코드와 기계 계약

고정되어 있으므로 이를 바탕으로 CI 로직을 만들 수 있습니다.

| 종료 코드 | 의미                                                          |
| --------- | ------------------------------------------------------------- |
| `0`       | 깨끗함: 게이트 이상의 발견 사항 없음                          |
| `1`       | 게이트 이상의 발견 사항 있음                                  |
| `2`       | 부분 스캔 (시간 예산 초과, 읽을 수 없는 파일). 차단하지 않음. |
| `10`      | 사용 오류 (잘못된 플래그, 대상 누락)                          |
| `20`      | 내부 오류                                                     |

`2`는 의도적으로 `0`과 구분됩니다. 끝나지 않은 스캔은 아무것도 찾지 못한 것이 아니라, 아직 다 찾지 못한 것입니다.

기계가 소비하는 모든 것 (MCP 도구 결과, `--json`, SARIF 2.1)은 버전이 있고 **추가만 허용되는** 스키마 (`schemaVersion: 1`, `contractVersion: 1`)를 따르는 하나의 표준 결과에서 나오므로, 어떤 소비자도 렌더링된 텍스트에서 의미를 다시 조립할 필요가 없습니다. [기계 계약](docs/machine-contract.md)을 참고하세요. 규칙 ID (`QA-<FAMILY>-NNN`)는 배포된 뒤에는 바뀌지 않으며 재사용되지 않습니다.

<br />

## Mjölnir가 알려줄 수 없는 것

- **테스트를 실행하지 않습니다.** 깨끗한 스캔이 통과하는 스위트를 뜻하지는 않습니다.
- **단언이 _틀렸다_ 는 것은 알려줄 수 없습니다.** `expect(total).toBe(41)`은 건강해 보입니다. Mjölnir가 찾는 것은 _실패할 수 없는_ 테스트와 _빨간색이 될 수 없는_ 파이프라인이지, 엉뚱한 것을 확인하는 테스트가 아닙니다.
- **비즈니스 정확성을 증명하지 않습니다.** 여기 있는 어떤 것도 제품이 요구 사항대로 동작한다고 말하지 않습니다.
- **100점이 좋은 스위트의 증거는 아닙니다.** 스위트가 실제 위험을 다루는지는 다른 질문이며, 이 도구는 그 질문에 답하지 않습니다.
- **79개 규칙 중 5개는 추정치로 배포됩니다**. 측정된 비율이 아닙니다. 각 규칙은 자신의 발견 사항에 그 사실을 밝힙니다.
- **E1은 E2가 아닙니다.** 휴리스틱 발견 사항은 읽을 가치가 있지만 맹목적으로 적용할 가치는 없습니다.
- **빈 저장소는 `null`점을 받으며, 절대 100점이 아닙니다.**
- **테스트 선언이 없는 `*.spec.ts` 파일은 커버리지로 치지 않습니다.** spec 파일에 import나 타입만 있는 (`it`/`test` 호출이 0개인) 저장소는 100점이 아니라 `null`점을 받습니다.

<br />

## 문서

전체 문서 사이트는 <https://sergey-bar.github.io/Mjolnir/>에 있습니다.

| 문서                                                   | 내용                                              |
| ------------------------------------------------------ | ------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | 점수 정규화와 증거 가중치                         |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | 표준 용어집: 개념 하나에 단어 하나                |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 측정된 오탐률과 측정 방법                         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | 규칙 상태, 등급, 억제, 지원 중단                  |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver 정책, 고정된 인터페이스, 지원 중단 주기    |
| [docs/machine-contract.md](docs/machine-contract.md)   | 기계가 읽을 수 있는 표준 결과                     |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 출력과 에디터 또는 CI 설정                  |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code Quality 리포트, MR 설정 예시, 게이트 |
| [docs/rules/](docs/rules/)                             | 규칙별로 생성된 카탈로그                          |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 개발 환경 설정과 기여 절차                        |
| [SUPPORT.md](SUPPORT.md)                               | 질문, 신고, 도움을 받을 수 있는 곳                |
| [SECURITY.md](SECURITY.md)                             | 취약점 신고                                       |
| [CHANGELOG.md](CHANGELOG.md)                           | 릴리스 이력                                       |

### 상태

**버전 1.** JSON 스키마와 종료 코드는 고정된 계약입니다. TypeScript와 Python이 가장 넓은 측정 범위를 갖습니다. Java와 C#은 비교적 새로우니 [성숙도 표](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle)와 함께 보세요. 앞으로의 계획 (지어낸 날짜 없음): [공개 로드맵](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### 기여하기

새 규칙은 가장 쉬운 첫 기여입니다. 명령 하나로 must-fire **그리고** must-not-fire fixture와 함께 규칙의 뼈대가 만들어집니다. 생성된 규칙은 실제 탐지 로직이 작성될 때까지 일부러 자신의 fixture에서 실패합니다. 배포된 빈 껍데기는 아무도 측정하지 않은 규칙이기 때문입니다.

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

개발 환경 설정, 상시 게이트 명령, anti-creep 법칙과 fixture 방화벽 법칙은 [CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="여러분의 저장소에서 실행해 보세요." width="100%" />

```bash
npx mjolnir-qa@3.0.0
```

[가이드 읽기](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [문서 사이트](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

테스트가 통과했는지 묻지 마세요.<br />
그 테스트가 믿을 만하다는 것을 증거가 증명하는지 물으세요.

<sub>제작: [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · MIT 라이선스</sub>

</div>
