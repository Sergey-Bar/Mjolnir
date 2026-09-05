<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### 당신의 테스트는 당신에게 거짓말을 하고 있습니다. 우리가 증명합니다.

**QA를 위한 Verification Trust Engine.** Mjölnir는 테스트 스위트와 CI
파이프라인을 감사하고, 신뢰도 점수를 보고하며, 신뢰가 정확히 어디서
깨지는지 보여줍니다.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | 한국어 | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**당신의 테스트는 신뢰할 만한가요?**

[작동 모습 보기](#-작동-모습-보기) ·
[빠른 시작](#-빠른-시작) ·
[무엇을 검사하는가](#-mjölnir가-검사하는-것) ·
[점수 산정](#점수-산정은-어떻게-작동하는가) ·
[CI](#-ci-통합) · [설정](#설정) ·
[문서](#-문서)

</div>

---

## 🎬 작동 모습 보기

<p align="center">
  <img src="assets/readme/demo.svg" alt="데모 리포지터리에 대한 Mjölnir의 전체 --verbose 보고서: WORTHINESS 75/100 NEEDS WORK, 범주별 진단 내역, FIX THIS FIRST 목록, 그리고 CI·Playwright·테스트 위생·Python 규칙 전반에 걸친 규칙 ID와 줄 번호가 붙은 각 발견" width="900" />
</p>

<sub>`npx mjolnir-qa ./examples/demo-repo --verbose`의 전체 출력을 실제
reporter로 렌더링한 것 — 아무것도 잘라내지 않았습니다. `npm run
docs:demo`로 재생성합니다.
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
은(는) 산출물이 도구가 실제로 출력하는 것과 어긋나면 CI를 떨어뜨립니다.</sub>

**방금 무슨 일이 일어났나:**

1. Mjölnir는 Playwright 스펙, 그 설정, CI 워크플로, Python 테스트
   파일을 발견했습니다 — 네 가지 언어/포맷, 한 번의 패스로.
2. 스위트에 대한 신뢰를 약화시키는 증거를 찾았습니다 — 작업을 가리는
   `continue-on-error`, 종료 코드를 삼키는 `|| true`, 하드 sleep, 취약한
   선택자, 하드코딩된 스테이징 URL, `networkidle` 대기.
3. 각각을 규칙 ID·위치·수정 방법을 갖춘 구체적인 발견으로 — 그리고 PR에
   게이트를 걸 수 있는 단 하나의 점수로 바꾸었습니다.

### 발견 하나, 가까이서

위의 첫 번째 발견에 대해 `mjolnir explain QA-CI-001`을 실행하면:

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

이것이 가치의 단위입니다. 스타일 지적이 아니라, 당신의 CI가 무언가
통과했다고 말하지만 실제로는 통과하지 않은 바로 그 지점입니다.

---

## ⚡ 빠른 시작

완전한 보고서와 신뢰도 점수를 위해 리포지터리에 대해 실행합니다:

```bash
npx mjolnir-qa@latest
```

**CI에서 제품은 한 개의 명령입니다.** 브랜치가 건드린 것만 스캔하고 새
문제가 있으면 0이 아닌 코드로 종료합니다:

```bash
npx mjolnir-qa@latest --scope changed
```

그것을 PR 검사에 넣으세요 — `mjolnir ci install`이 워크플로를 작성합니다 —
끝입니다. 나머지는 모두 선택 사항입니다.

| 명령                                | 무엇을 하는가                                       |
| ----------------------------------- | --------------------------------------------------- |
| `mjolnir`                           | 전체 리포지터리 스캔 + 신뢰도 점수                  |
| `mjolnir --scope changed`           | 당신의 브랜치가 도입한 것만 — CI 형태               |
| `mjolnir ci install`                | 자문형(advisory) PR 워크플로 생성                   |
| `mjolnir explain QA-CI-001`         | 무엇 / 왜 / 수정 방법 + 규칙 하나의 측정된 FP 비율  |
| `mjolnir rules --unmeasured`        | 측정이 아니라 가정으로 작동 중인 규칙들             |
| `mjolnir --json` / `--format sarif` | 기계 판독 가능 / GitHub Code Scanning               |
| `mjolnir --strict`                  | 격리(quarantine) 계층 규칙도 실행 (FP 위험 더 높음) |

<details>
<summary><strong>뭔가 flaky할 때</strong></summary>

| 명령                                | 무엇을 하는가                                          |
| ----------------------------------- | ------------------------------------------------------ |
| `mjolnir forensics ./test-results/` | 실제 실행 데이터 → `TRUE-FLAKE` 판정, `FLAKY.md`       |
| `mjolnir triage ./test-results/`    | 실행 이력으로부터의 격리 제안                          |
| `mjolnir pw-report ./test-results/` | Playwright 실행 요약 — 재시도 / flake / 가장 느린 것들 |
| `mjolnir doctor:playwright`         | Playwright 전용 심층 스캔 + Selector Health Score      |

</details>

<details>
<summary><strong>가끔 / 보고서</strong></summary>

| 명령                            | 무엇을 하는가                                               |
| ------------------------------- | ----------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | 증거가 붙은 안전한 자동 수정                                |
| `mjolnir baseline` / `diff`     | 발견 스냅샷을 찍고, 이후에는 새로 생기거나 악화된 것만 보고 |
| `mjolnir impact --since <ref>`  | 이전 커밋 이후 무엇이 바뀌었는가                            |
| `mjolnir debt`                  | 비용 모델을 갖춘 테스트 부채 대장                           |
| `mjolnir handover`              | 새 QA를 위한 스위트 온보딩 지도                             |
| `mjolnir stats`                 | 지금까지 본 수정의 로컬 누적 카운터                         |
| `mjolnir badge`                 | shields.io 엔드포인트 JSON + 스니펫                         |
| `mjolnir rules --md`            | 전체 규칙 카탈로그 (JSON 또는 Markdown)                     |
| `mjolnir doctor`                | Mjölnir 자체 규칙 베이스의 자체 감사                        |
| `mjolnir create-rule <ID>`      | 새 규칙 + 픽스처 스캐폴딩                                   |
| `mjolnir --format mermaid`      | PR 코멘트용 테스트 아키텍처 다이어그램                      |

</details>

선호한다면 `npx` 대신 전역 설치: `npm i -g mjolnir-qa`. Node.js ≥ 22.18
필요. Windows, macOS, Linux에서 작동합니다.

---

## 👥 누구를 위한 것인가?

- **QA / SDET** — e2e 또는 통합 스위트를 소유하고 있으며, 스위트가
  만들어내는 녹색 체크마크를 정말로 값지게 여길 만하다는 증거가 필요한
  사람들.
- **플랫폼 / DevEx 팀** — CI 무결성과 릴리스 게이트를 책임지는 사람들.
  `continue-on-error`가 붉은 파이프라인을 조용히 녹색으로 칠하지 않기를
  바라는 사람들.
- **OSS 메인테이너** — 로컬과 CI에서, 네트워크 호출 없이 돌아가는
  값싸고 늘 켜져 있는 검증 게이트를 원하는 사람들.

---

## 🔨 Mjölnir가 검사하는 것

|     |                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| ⚖️  | **신뢰도 점수** — 하나의 숫자, 투명한 감점 표, 블랙박스 없음                                                       |
| 🎭  | **Selector Health Score** — 통과율만이 아니라 당신의 Playwright 로케이터를 평가한다                                |
| 🔬  | **런타임 포렌식** — 실제 Playwright/JUnit 실행 데이터를 읽어 `TRUE-FLAKE`를 잡아낸다, 정적 추측만이 아니라         |
| 🚨  | **CI 무결성 규칙** — `continue-on-error`, `\|\| true`, 그 밖의 가짜 녹색 트릭을 잡아낸다                           |
| 🐍  | **네 가지 Playwright 바인딩 모두** — TypeScript, Python, Java, C#/.NET — 게다가 pytest, JUnit/TestNG와 CI 워크플로 |
| 🔒  | **로컬 퍼스트** — 스캔 중 네트워크 호출 제로, 텔레메트리 제로, 몇 초 만에 실행                                     |

### 규칙들

모든 규칙은 must-fire **와** must-not-fire 픽스처를 갖추고 출시됩니다.
자기 자신의 부정 픽스처에서 발화하는 규칙은 출시될 수 없습니다 — 그것이
거짓 양성 방화벽입니다.

<details>
<summary><strong>테스트 위생</strong></summary>

| ID          | 규칙                                                | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | 커밋된 포커스 테스트 (`.only`, `fit`)               | error    |
| QA-TEST-002 | 정당화 없이 건너뛴 테스트                           | error    |
| QA-TEST-002 | 기록된 정당화와 함께 건너뛴 테스트                  | warning  |
| QA-TEST-003 | 어설션이 없는 테스트                                | error    |
| QA-TEST-004 | 하드 sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | flakiness를 숨기는 재시도 남용                      | warning  |
| QA-TEST-010 | 빈 테스트 본문                                      | error    |

</details>

<details>
<summary><strong>테스트 품질</strong></summary>

| ID           | 규칙                          | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | 모크(mock)만으로 검증         | info     |
| QA-TQUAL-002 | 동어반복적 어설션             | error    |
| QA-TQUAL-009 | await되지 않은 promise 어설션 | error    |
| QA-TQUAL-011 | 주석 처리된 테스트            | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | 규칙                                  | Severity |
| --------- | ------------------------------------- | -------- |
| QA-PW-002 | await되지 않은 로케이터 어설션        | error    |
| QA-PW-003 | 커밋된 `page.pause()` / `test.only()` | error    |
| QA-PW-004 | 취약한 CSS/XPath 선택자               | warning  |
| QA-PW-005 | `page.evaluate()` 안의 비즈니스 로직  | info     |
| QA-PW-114 | 레거시 요소 핸들 (`page.$`)           | info     |
| QA-PW-118 | `networkidle` 대기 (설계상 flaky)     | info     |
| QA-PW-123 | 하드코딩된 환경 URL                   | warning  |

</details>

<details>
<summary><strong>CI 무결성</strong></summary>

| ID        | 규칝                                                            | Severity |
| --------- | --------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error`가 실패를 가린다                             | error    |
| QA-CI-002 | `\|\| true`가 종료 코드를 삼킨다                                | error    |
| QA-CI-005 | 보고서는 소비되는데 생성되지는 않는다                           | error    |
| QA-CI-007 | 테스트를 감싸는 재시도 래퍼                                     | warning  |
| QA-CI-008 | 항상 성공하는 단계가 실패를 가린다                              | error    |
| QA-CI-009 | 테스트 종료 코드가 전달되지 않음 (pipefail 없는 `\|`, `;` 연쇄) | error    |
| QA-CI-010 | 반드시 막아야 할 곳에서 테스트를 건너뜀 (skip-on-PR 가드)       | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | 규칙                                   | Severity |
| --------- | -------------------------------------- | -------- |
| QA-PY-002 | 건너뛴 테스트 (`skip`, 비엄격 `xfail`) | warning  |
| QA-PY-003 | 어설션이 없는 테스트 함수              | error    |
| QA-PY-005 | 테스트 안의 `time.sleep()`             | warning  |
| QA-PY-006 | 빈 테스트 본문 (`pass`)                | info     |
| QA-PY-010 | freeze 없는 무작위성/시간 의존         | info     |
| QA-PY-012 | 동어반복적 어설션                      | error    |

총 20개의 Python 규칙 (QA-PY-001…012 pytest 위생 + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | 규칙                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | 비활성화된 테스트 (`@Disabled`)          | warning  |
| QA-JV-102 | 하드 sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | 어설션이 없는 테스트 메서드              | error    |
| QA-JV-105 | Playwright 하드 sleep `waitForTimeout()` | warning  |
| QA-JV-106 | role 로케이터 대신 취약한 선택자         | warning  |
| QA-JV-108 | 테스트에 하드코딩된 환경 URL             | info     |
| QA-JV-111 | 전면 모크 `page.route("**")`             | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | 규칙                                        | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-CS-101 | 건너뛴 테스트 (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | 하드 sleep (`Thread.Sleep` / `Task.Delay`)  | warning  |
| QA-CS-103 | 어설션이 없는 테스트 메서드                 | error    |
| QA-CS-105 | 하드 sleep `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | role 로케이터 대신 취약한 선택자            | warning  |
| QA-CS-108 | 테스트에 하드코딩된 환경 URL                | info     |
| QA-CS-111 | 전면 모크 `page.RouteAsync("**")`           | info     |

</details>

> 완전한 실시간 카탈로그 — 각 규칙의 계층, 신뢰도, 거짓 양성 위험, 자동
> 수정 가능 여부가 함께 — 는 레지스트리에서 생성됩니다:
>
> ```bash
> mjolnir rules --md
> ```
>
> 규칙별 페이지는 [`docs/rules/`](docs/rules/) 아래에 있습니다.

### 이 중 얼마나가 측정되었나

**99개 규칙 중 74개가 실제 OSS 코드에 대해 측정된 거짓 양성 비율을
갖습니다** (각 규칙당 손으로 분류된 발견 ≥ 10건;
[docs/FP-AUDIT.md](docs/FP-AUDIT.md) 참조). 나머지 19개는 저자의 추정으로
출시됩니다. 모든 스캔의 바닥글은 _발화한_ 규칙 중 몇 개가 측정되었는지
말해줍니다; `mjolnir rules --unmeasured`는 측정되지 않은 것들을 나열합니다;
각 규칙의 `mjolnir explain` 페이지는 그 상태를 명시합니다. 수치가 흉해도
우리는 비율을 공개합니다 — QA-CS-103은 95%로 감사되었고 그래서 격리
계층에 있습니다. 그 78을 늘려가는 것이 프로젝트의 지속적인 작업입니다.

### 규칙 계층과 언어 성숙도

모든 규칙은 **측정된** 거짓 양성 비율에 따라 `core`, `extended`,
`quarantine`로 배정됩니다:

| 계층         | 의미                                 | 기본 스캔 | `--strict` |
| ------------ | ------------------------------------ | :-------: | :--------: |
| `core`       | 측정 FP ≤ 10 %                       |    ✅     |     ✅     |
| `extended`   | 측정 FP ≤ 30 %                       |    ✅     |     ✅     |
| `quarantine` | 30 % 초과, 또는 아직 미측정 (n < 10) |    ❌     |     ✅     |

| 언어            | 어댑터       | 현재 커버리지                                       |
| --------------- | ------------ | --------------------------------------------------- |
| TypeScript / JS | 컴파일러 AST | 가장 넓고 가장 많이 측정됨 — 주로 `core`/`extended` |
| Python / pytest | 정규식 계층  | 넓음, 코퍼스 감사됨 — 주로 `core`/`extended`        |
| Java            | 정규식 계층  | 더 최신 — 주로 `extended`/`quarantine`              |
| C# / .NET       | 정규식 계층  | 더 최신 — 주로 `extended`/`quarantine`              |

TypeScript와 Python이 가장 넓은 측정된 커버리지를 갖습니다. Java와 C#은
출시되고 문서화되어 있지만, 실제 소비자 스위트(바인딩 라이브러리 자체의
테스트가 아닌)가 감사될 때까지 헤드라인 숫자에서는 제외됩니다.

---

## 점수 산정은 어떻게 작동하는가

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir 터미널 출력 — WORTHINESS 75/100 NEEDS WORK, 범주별 진단 내역과 FIX THIS FIRST 목록" width="820" />
</p>

<sub>`npm run docs:hero`로 재생성됩니다.
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
은(는) 산출물이 reporter가 실제로 출력하는 것과 어긋나면 CI를 떨어뜨립니다.</sub>

점수는 투명합니다: **error −8, warning −3, info −1**, 그다음 스위트
노출도(테스트 선언당 감점)로 정규화합니다. 증거로 가중된 감점은 약한
신호일수록 덜 잃는다는 뜻입니다. 터미널은 점수가 사용하는 동일한
할인된 숫자를 보여줍니다 — 블랙박스가 없습니다. 전체 방법론:
[docs/SCORING.md](docs/SCORING.md).

**판정**

| Score   | 판정             |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**증거 수준** — 모든 발견은 하나를 갖습니다; 그것이 점수 안에서 발견의
가중치를 정합니다:

| 수준 | 의미          | 점수에 미치는 영향 | 예시                                             |
| ---- | ------------- | ------------------ | ------------------------------------------------ |
| E2   | 결정론적 결함 | 전액 감점          | 커밋된 `.only` — 구조적으로 증명 가능            |
| E1   | 휴리스틱 패턴 | 반액 감점          | 정규식에 걸린 `sleep()` — 강한 신호, 증명은 아님 |
| E0   | 관찰          | 제로 (info만)      | 보고되지만 CI를 게이트하거나 감점하지는 않음     |

대부분의 규칙은 **E1**입니다. "we prove it"라는 슬로건은 이 체계를
가리킵니다: E2 발견은 구조적 증명이고; E1 발견은 올바르게 자리 잡은
경고이지 형식적 증명이 아닙니다.

빈 리포지터리는 `null`을 점수로 받습니다. 가짜 100은 결코 아닙니다 —
[신뢰 모델](#신뢰-모델) 참조.

---

## 🎭 Selector Health Score

Playwright 스위트의 대표 지표 — 당신의 로케이터는 얼마나 튼튼한가:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

역할 기반 로케이터는 만점입니다. CSS 클래스 체인과 XPath는 점수를
가라앉힙니다 — 어떤 동작이 퇴행했는지 알려주지 않은 채 어떤 DOM
리팩터링에서든 부서지기 때문입니다.

---

## 🔬 런타임 증거

정적 flakiness 탐지는 추측입니다. Mjölnir는 **실제 실행 데이터**를
읽습니다 — 어떤 러너의 Playwright JSON 보고서와 JUnit XML이든:

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

2회차 이상 시도에서만 통과하는 테스트는 통과하는 테스트가 아닙니다 —
운이 좋은 테스트입니다. 최종 녹색 체크마크와 무관하게 `TRUE-FLAKE`로
표시됩니다.

---

## ⚡ Mjölnir는 또 하나의 린터가 아닙니다

린터는 코드가 규칙을 따르는지 말해줍니다. Mjölnir는 당신의 검증이
신뢰될 수 있는지 말해줍니다.

|                                                       | ESLint / SonarQube | 커버리지 도구 | 수동 리뷰 | **Mjölnir** |
| ----------------------------------------------------- | :----------------: | :-----------: | :-------: | :---------: |
| CI 워크플로 무결성 (`continue-on-error`, `\|\| true`) |         ❌         |      ❌       |   드묾    |     ✅      |
| 한 도구로 다중 언어 (TS, Python, Java, C#)            |         ❌         |      ❌       |    ❌     |     ✅      |
| Playwright 로케이터 회복탄력성 평가 (Selector Health) |         ❌         |      ❌       |   드묾    |     ✅      |
| 실제 어설션 없는 테스트 표시                          |  ✅ (플러그인)\*   |      ❌       |  때때로   |     ✅      |
| 하드 sleep 탐지 (`waitForTimeout`, `time.sleep`)      |  ✅ (플러그인)\*   |      ❌       |  때때로   |     ✅      |
| 몇 초 만에 실행, 스캔 중 네트워크 호출 제로           |         ✅         |      ✅       |     —     |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`)와 `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`)가 각 프레임워크에 대해 이를
커버합니다.

**런타임 분석**은 정적 린팅과 별개의 범주입니다:

|                                                  | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ------------------------------------------------ | :-----------------------: | :-------------------: | :-------------------: |
| `TRUE-FLAKE` 판정을 위해 실제 실행 데이터를 읽음 |         부분적\*          |     부분적 (tag)      |          ✅           |
| 실행 이력으로부터의 flaky 트리아지 보고서        |            ❌             |          ✅           |          ✅           |
| 정적 신뢰도 점수와 통합                          |            ❌             |          ❌           |          ✅           |

\*Playwright는 재시도를 내부적으로 추적하지만 판정 레이블이 붙은 독립적인
flakiness 보고서를 만들지는 않습니다.

---

## 🤖 왜 그냥 AI 코드 리뷰를 쓰지 않는가?

다른 문제, 다른 계층입니다. AI 리뷰는 diff 속의 의심스러운 테스트 변경을
발견할 수 있습니다; 그러나 검증 시스템 전체가 신뢰할 만하다는 증명은
하지 못합니다 — 그리고 보여주는 diff만 볼 뿐입니다.

|                                  |   AI 코드 리뷰 (Copilot 등)    |        **Mjölnir**        |
| -------------------------------- | :----------------------------: | :-----------------------: |
| 스캔당 비용                      | 토큰 (diff 크기에 비례해 증가) |  **제로** (로컬, 설치됨)  |
| 전체 스위트 + 모든 CI 설정을 봄  |    당신이 보여준 PR diff만     |     **매번 모든 것**      |
| 결정론적 (같은 입력 → 같은 출력) |        ❌ (비결정론적)         |          **✅**           |
| 수개월 잠들어 있던 패턴을 잡음   |      컨텍스트에 있을 때만      | **✅** (모든 파일을 스캔) |
| 실행 사이에 발견을 기억          |     ❌ (세션 간 기억 없음)     | **✅** (baseline + diff)  |
| 사람의 트리거 없이 실행          |     PR이나 프롬프트가 필요     |    **✅** (CI 훅, 3초)    |

**둘 다 사용하세요.** AI는 어떤 정규식도 찾을 수 없는 뉘앙스, 의도,
설계 결함을 잡아냅니다. Mjölnir는 "의도적인" 것처럼 보여서 AI가 놓치는
구조적 패턴을 잡아냅니다 — 커밋된 `.only`, 삼켜진 종료 코드, 테스트
작업의 `continue-on-error`. 이것들은 추론이 필요한 버그가 아니라, 스캔이
필요한 사실입니다.

---

## 🤖 CI 통합

한 명령이 PR 워크플로를 생성합니다 — 기본적으로 자문형이며 결코 막지
않습니다:

```bash
mjolnir ci install
```

또는 SARIF를 통해 GitHub Code Scanning에 네이티브로 연결합니다:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

SARIF의 에디터·파이프라인 설정:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### 변경 범위 커버리지

`--scope changed`는 `main`과의 병합 기준점(merge-base)에 대비해 당신의
브랜치가 추가한 줄에 발견을 귀속시킵니다. 테스트 파일(`*.spec.*`,
`*.test.*`)과 diff 속의 GitHub 워크플로 파일, Playwright 설정을
커버합니다. 병합 기준점을 해석할 수 없을 때 — 얕은 클론, detached HEAD,
git이 아닌 대상, 다른 기본 브랜치 — 정직하게 저하됩니다: 발견은 파일
전체 귀속으로 되돌아가고 보고서는 그렇게 말합니다. 기준 참조는
`--base <ref>`로 재정의할 수 있습니다.

---

## 설정

Mjölnir는 제로 설정입니다. 리포지터리 루트의 선택적 `mjolnir.config.json`
(또는 `.mjolnir.json`)이 심각도, 게이팅, 범위를 조정합니다 — 탐지
의미론은 절대 바꾸지 않습니다.

| 키                  | 유형                                 | 효과                                                                                                                          |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | 추가 무시 glob (gitignore 부분 집합), 내장 기본값 위에 얹음                                                                   |
| `gate`              | `"advisory" \| "error" \| "warning"` | 어떤 심각도가 0이 아닌 코드로 종료하는가 (기본 `error`; `advisory`는 결코 막지 않음)                                          |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | 당신의 리포지터리에 맞춰 규칙의 발견을 재정렬                                                                                 |
| `ignore`            | `IgnoreEntry[]`                      | 발견 억제 — **`reason` 필수**; 항목은 90일 후 만료됩니다 (명시적 `expires` 날짜, 또는 미기재 시 설정 파일의 마지막 수정 시각) |
| `plugins`           | `string[]`                           | 서드파티 규칙 패키지 ([신뢰 모델](#신뢰-모델) 참조)                                                                           |

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

- **`.mjolnirignore`** — 경로 제외를 위한 단순 gitignore 스타일 파일,
  `exclude`와 같은 방언입니다. 기계 단위 노이즈에는 이것을; 목록이 나머지
  설정과 함께 버전 관리에 들어가야 한다면 `exclude`를.
- **CLI 오버라이드** — `--strict` (격리 계층 규칙 포함), `--width <cols>`
  및 `--ascii` / `--no-ascii` (터미널 렌더링), `--tone blunt`
  (더 뻣뻣한 메시지), `--max-duration <sec>` (시간 제한 부분 스캔).
- 규칙 억제와 사용 중단 수명 주기: [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

`ignore` 항목은 독립 명령 `mjolnir suppressions`도 구동합니다. 이 명령은
현재 억제된 항목과 각 항목의 만료 시점을 나열합니다.

---

## 📐 종료 코드와 계약

동결됨 — 그 위에 CI 로직을 세워도 안전합니다:

| 종료 코드 | 의미                                                           |
| --------- | -------------------------------------------------------------- |
| `0`       | 깨끗함 — 게이트 이상의 발견 없음                               |
| `1`       | 게이트 이상의 발견이 있음                                      |
| `2`       | 부분 스캔 (시간 예산 소진, 읽을 수 없는 파일) — 결코 막지 않음 |
| `10`      | 사용 오류 (잘못된 플래그, 대상 누락)                           |
| `20`      | 내부 오류                                                      |

JSON/SARIF 보고서는 `schemaVersion: 1`입니다. 규칙 ID (`QA-<FAMILY>-NNN`)
는 출시 후 불변이며 결코 재사용되지 않습니다.

---

## 신뢰 모델

- **로컬 퍼스트** — 스캔 중 네트워크 호출 제로. 언제나. 텔레메트리
  제로.
- **가짜 증명 없음** — "검증됨"보다 "알 수 없음"이라 말하는 쪽을
  택합니다. 빈 리포지터리는 `score: null`을 받습니다, 가짜 100은 절대
  아닙니다.
- **부분적 정직함** — 분석이 중단되면 출력이 그렇게 말합니다. 그렇지
  않은데 "complete"라고 하는 일은 없습니다.
- **FP 방화벽** — 탐지는 주석/문자열이 제거된 코드 뷰에서 작동합니다
  (TypeScript 규칙은 컴파일러 AST를 사용): 산문 주석 안이나 문서 예제
  문자열 안의 패턴은 문서이지 발견이 아닙니다.
- **측정됨, 단언됨이 아님** — 실제 OSS 코드에서 온 거짓 양성 비율을 가진
  규칙만이 헤드라인 계층에 출시됩니다 ([이 중 얼마나가 측정되었나](#이-중-얼마나가-측정되었나)
  참조); 스캔 바닥글과 `mjolnir rules --unmeasured`가 어느 것이 어느 것인지
  알려줍니다.
- **플러그인 신뢰** — 플러그인은 `"plugins"` 아래 선언된 npm 패키지입니다.
  **샌드박스가 없습니다**: 플러그인 코드는 완전한 Node 권한으로
  실행되며, ESLint나 Vitest 플러그인과 같은 신뢰 모델입니다. 코어 규칙 ID
  접두사는 예약되어 있고 사칭 방지를 위해 플러그인으로부터 거부됩니다.
- **워크스페이스 로컬 외부 규칙** (폴더 기반, 네트워크 제로) — 스캔 대상
  옆의 `mjolnir-rules/` 디렉터리가 사용자 정의 규칙을 로드합니다: JSON
  파일은 정규식 패턴을 선언하고 (코드는 실행되지 않음), `.mjs`/`.js`
  모듈은 `rules`를 내보냅니다 (플러그인과 같은 완전한 Node 신뢰). 외부
  규칙은 코어와 동일한 신뢰 메타데이터를 가집니다; 절대 코어 계층으로
  출시될 수 없습니다 (코어는 코퍼스 사이드카로부터의 측정된 FP 비율을
  요구합니다 — 선언된 `tier: "core"`는 `extended`로 클램프됩니다), 계층
  한도를 준수하며, 드리프트 검사를 받습니다: `mjolnir rules --md --external`은
  로드된 파일로부터 카탈로그를 렌더링하고 (출처 `external`), 매트릭스
  생성기는 `--external <root>`를 받습니다.

---

## 🏗️ 아키텍처

<details>
<summary>트리 펼치기</summary>

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

- **규칙은 순수 함수입니다** — `(SourceFileContext) → Finding[]`, I/O
  없음, 전역 없음. 새로운 에코시스템 = 하나의 어댑터 + 그 규칙들.
- **TypeScript/Playwright는 컴파일러 AST를 사용합니다** (ts-morph).
  Python, Java, C#는 주석/문자열을 마스킹한 공유 정규식 계층 위에서
  실행됩니다.
- Java와 C#을 위한 tree-sitter WASM AST 계층이 존재하며 다음 정밀도
  단계입니다 — 아직 동기 스캔 파이프라인에 연결되지는 않았습니다.

---

## 📚 문서

| 문서                                                   | 내용                           |
| ------------------------------------------------------ | ------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | 점수 정규화 + 증거 가중치      |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | 측정된 거짓 양성 비율 + 방법론 |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | 규칙 상태, 억제, 사용 중단     |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF 출력 + 에디터/CI 설정    |
| [docs/rules/](docs/rules/)                             | 생성된 규칙별 카탈로그         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | 개발 환경 + 기여 흐름          |
| [CHANGELOG.md](CHANGELOG.md)                           | 릴리스 이력                    |
| [SECURITY.md](SECURITY.md)                             | 취약점 보고                    |

---

## 📈 상태

**v0.5.x · 오픈 베타.** JSON 스키마와 종료 코드는 동결된 계약입니다.
TypeScript와 Python이 가장 넓은 측정된 커버리지를 갖고; Java와 C#은 더
새롭습니다 —
[계층 표](#규칙-계층과-언어-성숙도)를 통해 읽어 주세요.

---

## 🤝 기여

새 규칙이 가장 쉬운 첫 기여입니다 — 한 명령으로 규칙과 그 must-fire **와**
must-not-fire 픽스처를 스캐폴드합니다 (생성된 규칙은 실제 탐지를 구현할
때까지 의도적으로 픽스처에서 실패합니다 — 스텁은 출시될 수 없습니다):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

완전한 개발 환경, 상시 게이트 명령들, 안티 크립 / 픽스처 방화벽 법칙은
[CONTRIBUTING.md](CONTRIBUTING.md)에 있습니다.

---

<div align="center">

**신뢰할 수 없는 테스트를 출시하지 마세요.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

[Sergey Bar](https://www.linkedin.com/in/sergeybar/) 제작

</div>
