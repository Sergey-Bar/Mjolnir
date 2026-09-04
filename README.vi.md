<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Các kiểm thử của bạn đang nói dối bạn. Chúng tôi chứng minh điều đó.

**Verification Trust Engine cho QA.** Mjölnir kiểm toán các suite kiểm
thử và pipeline CI, báo cáo điểm độ đáng tin và chỉ ra chính xác nơi
niềm tin gãy.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | Tiếng Việt | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Các kiểm thử của bạn có đáng tin không?**

[Xem nó hoạt động](#-xem-nó-hoạt-động) ·
[Khởi động nhanh](#-khởi-động-nhanh) ·
[Nó kiểm tra gì](#-mjölnir-kiểm-tra-gì) ·
[Chấm điểm](#cách-thức-chấm-điểm) ·
[CI](#-tích-hợp-ci) · [Cấu hình](#cấu-hình) ·
[Tài liệu](#-tài-liệu)

</div>

---

## 🎬 Xem nó hoạt động

<p align="center">
  <img src="assets/readme/demo.svg" alt="Báo cáo --verbose đầy đủ của Mjölnir trên một repo demo: WORTHINESS 75/100 NEEDS WORK, phân loại chẩn đoán theo nhóm, danh sách FIX THIS FIRST và mỗi finding với rule ID cùng số dòng, trải rộng qua các quy tắc CI, Playwright, vệ sinh kiểm thử và Python" width="900" />
</p>

<sub>Toàn bộ đầu ra `npx mjolnir-qa ./examples/demo-repo --verbose`,
render từ reporter thật — không lược bỏ gì. Tạo lại bằng
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
khiến CI fail nếu sản phẩm lệch khỏi những gì công cụ in ra.</sub>

**Chuyện gì vừa xảy ra:**

1. Mjölnir phát hiện các spec Playwright, config của nó, CI workflow và
   một file kiểm thử Python — bốn ngôn ngữ/định dạng, một lượt chạy.
2. Nó tìm thấy bằng chứng làm suy giảm niềm tin vào suite — một
   `continue-on-error` che giấu job, một `|| true` nuốt exit code,
   sleep cứng, selector giòn, URL staging hardcode, chờ `networkidle`.
3. Nó biến từng cái thành finding cụ thể với rule ID, vị trí và cách
   sửa — và một điểm duy nhất để gate một PR.

### Một finding, nhìn gần

Chạy `mjolnir explain QA-CI-001` trên finding đầu tiên ở trên và bạn nhận
được:

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

Đó là đơn vị giá trị: không phải lỗi phong cách, mà là một nơi CI của
bạn nói rằng điều gì đó đã pass khi thực tế chưa pass.

---

## ⚡ Khởi động nhanh

Chạy trên một repo để có báo cáo đầy đủ và điểm độ đáng tin:

```bash
npx mjolnir-qa@latest
```

**Trong CI, sản phẩm là một lệnh.** Nó chỉ quét những gì branch chạm tới
và thoát khác 0 khi có vấn đề mới:

```bash
npx mjolnir-qa@latest --scope changed
```

Thả cái đó vào một check của PR — `mjolnir ci install` ghi workflow —
và xong. Mọi thứ còn lại là tuỳ chọn.

| Lệnh                                | Nó làm gì                                                  |
| ----------------------------------- | ---------------------------------------------------------- |
| `mjolnir`                           | Quét toàn repo + điểm độ đáng tin                          |
| `mjolnir --scope changed`           | Chỉ những gì branch bạn đưa vào — dạng CI                  |
| `mjolnir ci install`                | Sinh workflow PR kiểu tư vấn                               |
| `mjolnir explain QA-CI-001`         | Gì / tại sao / cách sửa + tỷ lệ FP đo được của một quy tắc |
| `mjolnir rules --unmeasured`        | Các quy tắc chạy bằng giả định, không phải đo đạc          |
| `mjolnir --json` / `--format sarif` | Đọc được bằng máy / GitHub Code Scanning                   |
| `mjolnir --strict`                  | Chạy thêm các quy tắc tier quarantine (rủi ro FP cao hơn)  |

<details>
<summary><strong>Khi có gì đó flaky</strong></summary>

| Lệnh                                | Nó làm gì                                               |
| ----------------------------------- | ------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Dữ liệu chạy thật → phán quyết `TRUE-FLAKE`, `FLAKY.md` |
| `mjolnir triage ./test-results/`    | Đề xuất cách ly từ lịch sử thực thi                     |
| `mjolnir pw-report ./test-results/` | Tóm tắt lần chạy Playwright — retry / flake / chậm nhất |
| `mjolnir doctor:playwright`         | Quét sâu riêng Playwright + Selector Health Score       |

</details>

<details>
<summary><strong>Thỉnh thoảng / báo cáo</strong></summary>

| Lệnh                            | Nó làm gì                                             |
| ------------------------------- | ----------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Sửa tự động an toàn kèm bằng chứng                    |
| `mjolnir baseline` / `diff`     | Chụp lại các finding, rồi chỉ báo cáo cái mới/xấu hơn |
| `mjolnir impact --since <ref>`  | Những gì thay đổi kể từ commit trước đó               |
| `mjolnir debt`                  | Sổ nợ kiểm thử với mô hình chi phí                    |
| `mjolnir handover`              | Bản đồ onboarding suite cho QA mới                    |
| `mjolnir stats`                 | Bộ đếm mọi thời đại cục bộ của các fix đã thấy        |
| `mjolnir badge`                 | JSON endpoint shields.io + snippet                    |
| `mjolnir rules --md`            | Danh mục quy tắc đầy đủ (JSON hoặc Markdown)          |
| `mjolnir doctor`                | Tự kiểm toán chính cơ sở quy tắc của Mjölnir          |
| `mjolnir create-rule <ID>`      | Scaffold quy tắc mới + fixtures                       |
| `mjolnir --format mermaid`      | Sơ đồ kiến trúc kiểm thử cho comment PR               |

</details>

Cài toàn cục thay vì `npx` nếu bạn thích: `npm i -g mjolnir-qa`.
Yêu cầu Node.js ≥ 22.18. Chạy trên Windows, macOS và Linux.

---

## 👥 Dành cho ai?

- **QA / SDET** sở hữu suite e2e hoặc tích hợp, cần bằng chứng rằng
  suite thực sự xứng đáng với dấu xanh nó tạo ra.
- **Nhóm Platform / DevEx** chịu trách nhiệm về tính toàn vẹn CI và các
  release gate — những người không muốn một `continue-on-error` lặng lẽ
  tô đỏ thành xanh cho cả pipeline.
- **Người duy trì OSS** muốn một gate kiểm chứng rẻ, luôn bật, chạy cả
  cục bộ và trong CI với 0 lệnh gọi mạng.

---

## 🔨 Mjölnir kiểm tra gì

|     |                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Điểm độ đáng tin** — một con số, bảng trừ minh bạch, không hộp đen                                           |
| 🎭  | **Selector Health Score** — chấm locator Playwright của bạn, không chỉ tỉ lệ pass                              |
| 🔬  | **Pháp y runtime** — đọc dữ liệu chạy thật của Playwright/JUnit để bắt `TRUE-FLAKE`, không chỉ phỏng đoán tĩnh |
| 🚨  | **Quy tắc toàn vẹn CI** — bắt `continue-on-error`, `\|\| true` và các mẹo xanh giả khác                        |
| 🐍  | **Cả bốn binding Playwright** — TypeScript, Python, Java, C#/.NET — cộng pytest, JUnit/TestNG và CI workflows  |
| 🔒  | **Local-first** — 0 lệnh gọi mạng khi quét, 0 telemetry, chạy trong vài giây                                   |

### Các quy tắc

Mọi quy tắc đều có fixture must-fire **và** must-not-fire. Quy tắc mà
bắn vào chính fixture âm của nó thì không thể ship — đó là bức tường
lửa false positive.

<details>
<summary><strong>Vệ sinh kiểm thử</strong></summary>

| ID          | Quy tắc                                             | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | Kiểm thử tập trung bị commit (`.only`, `fit`)       | error    |
| QA-TEST-002 | Kiểm thử bị bỏ qua mà không có lý do                | error    |
| QA-TEST-002 | Kiểm thử bị bỏ qua có lý do được theo dõi           | warning  |
| QA-TEST-003 | Kiểm thử không có assertion                         | error    |
| QA-TEST-004 | Sleep cứng (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Lạm dụng retry che giấu flakiness                   | warning  |
| QA-TEST-010 | Thân kiểm thử rỗng                                  | error    |

</details>

<details>
<summary><strong>Chất lượng kiểm thử</strong></summary>

| ID           | Quy tắc                                 | Severity |
| ------------ | --------------------------------------- | -------- |
| QA-TQUAL-001 | Xác minh chỉ bằng mock                  | info     |
| QA-TQUAL-002 | Assertion đồng nghĩa lặp (tautological) | error    |
| QA-TQUAL-009 | Assertion của promise không await       | error    |
| QA-TQUAL-011 | Kiểm thử bị comment                     | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Quy tắc                                  | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | Assertion locator không await            | error    |
| QA-PW-003 | `page.pause()` / `test.only()` bị commit | error    |
| QA-PW-004 | Selector CSS/XPath giòn                  | warning  |
| QA-PW-005 | Logic nghiệp vụ trong `page.evaluate()`  | info     |
| QA-PW-114 | Element handle kiểu cũ (`page.$`)        | info     |
| QA-PW-118 | Chờ `networkidle` (flaky by design)      | info     |
| QA-PW-123 | URL môi trường hardcode                  | warning  |

</details>

<details>
<summary><strong>Toàn vẹn CI</strong></summary>

| ID        | Quy tắc                                                                   | Severity |
| --------- | ------------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` che giấu thất bại                                     | error    |
| QA-CI-002 | `\|\| true` nuốt exit code                                                | error    |
| QA-CI-005 | Báo cáo được tiêu thụ nhưng không bao giờ sinh ra                         | error    |
| QA-CI-007 | Wrapper retry quanh kiểm thử                                              | warning  |
| QA-CI-008 | Step luôn thành công che giấu thất bại                                    | error    |
| QA-CI-009 | Exit code của kiểm thử không được truyền (`\|` không pipefail, chuỗi `;`) | error    |
| QA-CI-010 | Kiểm thử bị bỏ qua ở nơi phải chặn (guard skip-on-PR)                     | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Quy tắc                                           | Severity |
| --------- | ------------------------------------------------- | -------- |
| QA-PY-002 | Kiểm thử bị bỏ qua (`skip`, `xfail` không nghiêm) | warning  |
| QA-PY-003 | Hàm kiểm thử không có assertion                   | error    |
| QA-PY-005 | `time.sleep()` trong kiểm thử                     | warning  |
| QA-PY-006 | Thân kiểm thử rỗng (`pass`)                       | info     |
| QA-PY-010 | Phụ thuộc ngẫu nhiên/thời gian mà không freeze    | info     |
| QA-PY-012 | Assertion tautological                            | error    |

Tổng cộng 20 quy tắc Python (QA-PY-001…012 vệ sinh pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Quy tắc                                  | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | Kiểm thử bị tắt (`@Disabled`)            | warning  |
| QA-JV-102 | Sleep cứng (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Phương thức kiểm thử không có assertion  | error    |
| QA-JV-105 | Sleep cứng Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Selector giòn thay vì role locator       | warning  |
| QA-JV-108 | URL môi trường hardcode trong kiểm thử   | info     |
| QA-JV-111 | Mock phủ sóng `page.route("**")`         | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Quy tắc                                          | Severity |
| --------- | ------------------------------------------------ | -------- |
| QA-CS-101 | Kiểm thử bị bỏ qua (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Sleep cứng (`Thread.Sleep` / `Task.Delay`)       | warning  |
| QA-CS-103 | Phương thức kiểm thử không có assertion          | error    |
| QA-CS-105 | Sleep cứng `WaitForTimeoutAsync()`               | warning  |
| QA-CS-106 | Selector giòn thay vì role locator               | warning  |
| QA-CS-108 | URL môi trường hardcode trong kiểm thử           | info     |
| QA-CS-111 | Mock phủ sóng `page.RouteAsync("**")`            | info     |

</details>

> Danh mục sống đầy đủ — mọi quy tắc với tier, confidence, rủi ro false
> positive và khả năng autofix — sinh từ registry:
>
> ```bash
> mjolnir rules --md
> ```
>
> Trang theo từng quy tắc nằm dưới [`docs/rules/`](docs/rules/).

### Bao nhiêu đã được đo

**74 trong 99 quy tắc mang tỷ lệ false positive được đo trên mã OSS
thật** (≥ 10 finding được phân loại tay mỗi quy tắc; xem
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). 19 quy tắc còn lại ra mắt trên
ước lượng của tác giả. Chân mỗi bản quét cho biết bao nhiêu quy tắc
_đã bắn_ được đo; `mjolnir rules --unmeasured` liệt kê những quy tắc
chưa đo; trang `mjolnir explain` của từng quy tắc nêu trạng thái. Chúng
tôi công bố tỷ lệ kể cả khi nó xấu xí — QA-CS-103 kiểm toán ở mức 95 %
và bị cách ly vì thế. Mở rộng con số 78 đó là công việc liên tục của
dự án.

### Tier quy tắc và độ trưởng thành theo ngôn ngữ

Mỗi quy tắc là `core`, `extended` hoặc `quarantine`, phân theo tỷ lệ
false positive **được đo**:

| Tier         | Ý nghĩa                          | Quét mặc định | `--strict` |
| ------------ | -------------------------------- | :-----------: | :--------: |
| `core`       | ≤ 10 % FP đo được                |      ✅       |     ✅     |
| `extended`   | ≤ 30 % FP đo được                |      ✅       |     ✅     |
| `quarantine` | trên 30 %, hoặc chưa đo (n < 10) |      ❌       |     ✅     |

| Ngôn ngữ        | Adapter          | Độ phủ hiện nay                                            |
| --------------- | ---------------- | ---------------------------------------------------------- |
| TypeScript / JS | AST bộ biên dịch | rộng nhất, đo nhiều nhất — chủ yếu `core`/`extended`       |
| Python / pytest | Lớp regex        | rộng, đã kiểm toán trên corpus — chủ yếu `core`/`extended` |
| Java            | Lớp regex        | mới hơn — chủ yếu `extended`/`quarantine`                  |
| C# / .NET       | Lớp regex        | mới hơn — chủ yếu `extended`/`quarantine`                  |

TypeScript và Python có độ phủ đo được rộng nhất. Java và C# đã ship,
có tài liệu và ở ngoài con số tiêu đề cho đến khi một suite người dùng
thật (không phải chính các kiểm thử của thư viện binding) được kiểm
toán.

---

## Cách thức chấm điểm

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Đầu ra terminal của Mjölnir — WORTHINESS 75/100 NEEDS WORK, phân loại chẩn đoán theo nhóm và danh sách FIX THIS FIRST" width="820" />
</p>

<sub>Tạo lại bằng `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
khiến CI fail nếu sản phẩm lệch khỏi những gì reporter thực sự in ra.</sub>

Điểm số minh bạch: **error −8, warning −3, info −1**, sau đó chuẩn hoá
theo độ phơi của suite (trừ trên mỗi khai báo kiểm thử). Các khoản trừ
được cân theo bằng chứng nghĩa là tín hiệu yếu tốn ít hơn. Terminal
hiện những con số đã chiết khấu chính mà điểm số dùng — không hộp đen.
Phương pháp đầy đủ: [docs/SCORING.md](docs/SCORING.md).

**Phán quyết**

| Score   | Phán quyết       |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Mức bằng chứng** — mỗi finding mang một; nó đặt trọng số của finding
trong điểm:

| Mức | Ý nghĩa                     | Tác động điểm    | Ví dụ                                                      |
| --- | --------------------------- | ---------------- | ---------------------------------------------------------- |
| E2  | Lỗi tất yếu (deterministic) | Trừ đủ           | `.only` bị commit — chứng minh được về cấu trúc            |
| E1  | Mẫu heuristic               | Trừ nửa          | `sleep()` khớp regex — tín hiệu mạnh, chưa phải bằng chứng |
| E0  | Quan sát                    | Không (chỉ info) | Được báo nhưng không bao giờ gate CI hay trừ               |

Đa số quy tắc là **E1**. Khẩu hiệu «we prove it» ám chỉ hệ thống này:
finding E2 là bằng chứng cấu trúc; finding E1 là cảnh báo được đặt đúng
vị trí, không phải chứng minh hình thức.

Repo rỗng chấm `null`, không bao giờ 100 giả — xem
[Mô hình niềm tin](#mô-hình-niềm-tin).

---

## 🎭 Selector Health Score

Chỉ số tiêu đề cho suite Playwright — locator của bạn bền bao nhiêu:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Locator dựa trên role nhận điểm tối đa. Chuỗi class CSS và XPath hạ điểm
— chúng vỡ với mọi lần refactor DOM mà không nói cho bạn biết hành vi
nào đã thoái trào.

---

## 🔬 Bằng chứng runtime

Phát hiện flakiness tĩnh là đoán mò. Mjölnir đọc **dữ liệu thực thi
thật** — báo cáo JSON Playwright và XML JUnit từ runner bất kỳ:

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

Một kiểm thử chỉ pass từ lần thử ≥ 2 không phải kiểm thử pass — đó là
kiểm thử may mắn. Nó bị gắn cờ `TRUE-FLAKE` bất kể dấu xanh cuối cùng.

---

## ⚡ Mjölnir không phải một linter nữa

Linter cho bạn biết mã có tuân thủ quy tắc không. Mjölnir cho bạn biết
sự kiểm chứng của bạn có thể được tin không.

|                                                         | ESLint / SonarQube | Công cụ coverage | Review thủ công | **Mjölnir** |
| ------------------------------------------------------- | :----------------: | :--------------: | :-------------: | :---------: |
| Toàn vẹn CI workflow (`continue-on-error`, `\|\| true`) |         ❌         |        ❌        |    hiếm khi     |     ✅      |
| Đa ngôn ngữ (TS, Python, Java, C#) từ một công cụ       |         ❌         |        ❌        |       ❌        |     ✅      |
| Chấm độ bền locator Playwright (Selector Health)        |         ❌         |        ❌        |    hiếm khi     |     ✅      |
| Gắn cờ kiểm thử không có assertion thật                 |   ✅ (plugin)\*    |        ❌        |   thi thoảng    |     ✅      |
| Bắt sleep cứng (`waitForTimeout`, `time.sleep`)         |   ✅ (plugin)\*    |        ❌        |   thi thoảng    |     ✅      |
| Chạy trong vài giây, 0 lệnh gọi mạng khi quét           |         ✅         |        ✅        |        —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) và `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) phủ các điểm đó cho framework
tương ứng.

**Phân tích runtime** là một hạng mục riêng ngoài linting tĩnh:

|                                                   | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Đọc dữ liệu chạy thật cho phán quyết `TRUE-FLAKE` |        một phần\*         |    một phần (tag)     |          ✅           |
| Báo cáo triage flake từ lịch sử thực thi          |            ❌             |          ✅           |          ✅           |
| Tích hợp với điểm độ đáng tin tĩnh                |            ❌             |          ❌           |          ✅           |

\*Playwright theo dõi retry bên trong nhưng không tạo báo cáo flakiness
độc lập với nhãn phán quyết.

---

## 🤖 Tại sao không chỉ dùng AI code review?

Vấn đề khác, tầng khác. AI review có thể phát hiện thay đổi kiểm thử
nghi ngờ trong diff; nó không chứng minh hệ thống kiểm chứng như một
toàn thể đáng tin — và nó chỉ thấy diff bạn cho nó xem.

|                                     |   AI code review (Copilot v.v.)    |        **Mjölnir**        |
| ----------------------------------- | :--------------------------------: | :-----------------------: |
| Chi phí mỗi lần quét                | Token (scale theo kích thước diff) | **Zero** (cục bộ, đã cài) |
| Thấy cả suite + mọi cấu hình CI     |      Chỉ diff PR bạn cho xem       |   **Mọi thứ, mỗi lần**    |
| Tất định (cùng input → cùng output) |        ❌ (không tất định)         |          **✅**           |
| Bắt mẫu nằm im hàng tháng           |     Chỉ khi có trong ngữ cảnh      |  **✅** (quét mọi file)   |
| Nhớ finding giữa các lần chạy       | ❌ (không trí nhớ giữa các phiên)  | **✅** (baseline + diff)  |
| Chạy không cần người kích hoạt      |         Cần PR hoặc prompt         | **✅** (hook CI, 3 giây)  |

**Dùng cả hai.** AI bắt được sắc thái, ý đồ và lỗi thiết kế không regex
nào tìm ra. Mjölnir bắt các mẫu cấu trúc AI bỏ sót vì chúng trông
«có chủ ý» — một `.only` bị commit, exit code bị nuốt, một
`continue-on-error` trên job kiểm thử. Đó không phải bug cần suy luận;
đó là sự thật cần quét.

---

## 🤖 Tích hợp CI

Một lệnh sinh PR workflow — tư vấn mặc định, không bao giờ chặn:

```bash
mjolnir ci install
```

Hoặc nối native vào GitHub Code Scanning qua SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Cấu hình trình soạn thảo và pipeline cho SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Độ phủ phạm vi thay đổi

`--scope changed` gán finding cho các dòng được thêm vào branch của bạn
so với merge-base với `main`. Nó phủ các file kiểm thử (`*.spec.*`,
`*.test.*`) cùng file workflow GitHub và cấu hình Playwright trong
diff. Khi không resolve được merge-base — shallow clone, detached HEAD,
đích không phải git, branch mặc định khác — nó thoái tr honoured: finding
quay về gán cho toàn file và báo cáo nói rõ. Ghi đè ref gốc bằng
`--base <ref>`.

---

## Cấu hình

Mjölnir là zero-config. Một `mjolnir.config.json` tuỳ chọn (hoặc
`.mjolnir.json`) ở gốc repo tinh chỉnh severity, gating và scope —
không bao giờ đổi ngữ nghĩa phát hiện.

| Key                 | Kiểu                                 | Tác dụng                                                                                                                                                 |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Glob bỏ qua bổ sung (tập con gitignore), chồng lên mặc định sẵn có                                                                                       |
| `gate`              | `"advisory" \| "error" \| "warning"` | Severity nào thoát khác 0 (mặc định `error`; `advisory` không bao giờ chặn)                                                                              |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Xếp lại hạng finding của một quy tắc cho repo của bạn                                                                                                    |
| `ignore`            | `IgnoreEntry[]`                      | Nuốt finding — **`reason` bắt buộc**; mục hết hạn sau 90 ngày (ngày `expires` tường minh, hoặc thời gian sửa lần cuối của file config cho mục không ghi) |
| `plugins`           | `string[]`                           | Gói quy tắc bên thứ ba (xem [Mô hình niềm tin](#mô-hình-niềm-tin))                                                                                       |

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

- **`.mjolnirignore`** — một file kiểu gitignore thuần cho loại trừ đường
  dẫn, cùng ngữ pháp với `exclude`. Dùng nó cho nhiễu riêng máy; dùng
  `exclude` khi danh sách thuộc version control cùng phần còn lại của
  cấu hình.
- **CLI overrides** — `--strict` (gồm quy tắc cách ly), `--width <cols>`
  và `--ascii` / `--no-ascii` (render terminal), `--tone blunt`
  (thông điệp khô hơn), `--max-duration <sec>` (quét một phần giới hạn).
- Nuốt quy tắc và vòng đời deprecated: [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

Mục `ignore` cũng nuôi lệnh độc lập `mjolnir suppressions`, liệt kê thứ
đang bị nuốt và từng mục hết hạn khi nào.

---

## 📐 Mã thoát & hợp đồng

Đóng băng — an toàn để xây logic CI trên đó:

| Mã thoát | Ý nghĩa                                                                           |
| -------- | --------------------------------------------------------------------------------- |
| `0`      | Sạch — không finding ở hoặc trên gate                                             |
| `1`      | Có finding ở hoặc trên gate                                                       |
| `2`      | Quét một phần (hết ngân sách thời gian, file không đọc được) — không bao giờ chặn |
| `10`     | Lỗi sử dụng (flag sai, thiếu đích)                                                |
| `20`     | Lỗi nội bộ                                                                        |

Báo cáo JSON/SARIF là `schemaVersion: 1`. Rule ID (`QA-<FAMILY>-NNN`)
bất biến sau khi ra mắt và không bao giờ tái sử dụng.

---

## Mô hình niềm tin

- **Local-first** — 0 lệnh gọi mạng trong lúc quét. Bao giờ vậy. 0
  telemetry.
- **Không bằng chứng giả** — thà nói «chưa biết» hơn là «đã kiểm chứng».
  Repo rỗng nhận `score: null`, không bao giờ 100 giả.
- **Trung thực một phần** — nếu phân tích bị cắt ngắn, đầu ra nói vậy.
  Không bao giờ «complete» khi chưa phải.
- **Tường lửa FP** — phát hiện chạy trên cái nhìn mã không comment/
  chuỗi (quy tắc TypeScript dùng AST bộ biên dịch): một mẫu trong comment
  văn xuôi hoặc chuỗi ví dụ tài liệu là tài liệu, không phải finding.
- **Đã đo, không phải khẳng định** — chỉ quy tắc có tỷ lệ false positive
  từ mã OSS thật mới ra tier tiêu đề (xem
  [Bao nhiêu đã được đo](#bao-nhiêu-đã-được-đo)); chân bản quét và
  `mjolnir rules --unmeasured` cho biết cái nào là cái nào.
- **Niềm tin plugin** — plugin là gói npm khai báo trong `"plugins"`.
  **Không sandbox**: mã plugin chạy với đầy đủ đặc quyền Node, cùng mô
  hình tin cậy như plugin ESLint hay Vitest. Tiền tố rule ID core được
  bảo lưu và từ chối khỏi plugin để chống giả danh.
- **Quy tắc ngoài cục bộ theo workspace** (theo thư mục, 0 mạng) — một
  thư mục `mjolnir-rules/` cạnh đích quét nạp quy tắc riêng: file JSON
  khai báo mẫu regex (không chạy mã), module `.mjs`/`.js` export
  `rules` (tin cậy Node đầy đủ, như plugin). Quy tắc ngoài mang cùng
  metadata tin cậy với core; không bao giờ vào được tier core (core cần
  tỷ lệ FP đo từ sidecar corpus — `tier: "core"` khai báo bị kẹp về
  `extended`), tuân trần tier và được kiểm tra trôi: `mjolnir rules --md
--external` render danh mục từ các file đã nạp (nguồn gốc `external`),
  và bộ sinh ma trận nhận `--external <root>`.

---

## 🏗️ Kiến trúc

<details>
<summary>Mở cây</summary>

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

- **Quy tắc là hàm thuần** — `(SourceFileContext) → Finding[]`, không
  I/O, không biến toàn cục. Thêm một hệ sinh thái = một adapter + quy
  tắc của nó.
- **TypeScript/Playwright dùng AST bộ biên dịch** (ts-morph). Python,
  Java và C# chạy trên lớp regex chung có che comment/chuỗi.
- Lớp AST tree-sitter WASM cho Java và C# đã tồn tại và là bước chính
  xác kế tiếp — chưa được cắm vào pipeline quét đồng bộ.

---

## 📚 Tài liệu

| Tài liệu                                               | Có gì trong đó                             |
| ------------------------------------------------------ | ------------------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | Chuẩn hoá điểm + cân bằng chứng            |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Tỷ lệ false positive đo được + phương pháp |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Trạng thái quy tắc, nuốt, deprecation      |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Đầu ra SARIF + cấu hình editor/CI          |
| [docs/rules/](docs/rules/)                             | Danh mục sinh tự động theo quy tắc         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Cài đặt dev + quy trình đóng góp           |
| [CHANGELOG.md](CHANGELOG.md)                           | Lịch sử phát hành                          |
| [SECURITY.md](SECURITY.md)                             | Báo cáo lỗ hổng                            |

---

## 📈 Tình trạng

**v0.5.x · beta mở.** JSON schema và mã thoát là hợp đồng đóng băng.
TypeScript và Python có độ phủ đo được rộng nhất; Java và C# mới hơn —
đọc qua
[bảng tier](#tier-quy-tắc-và-độ-trưởng-thành-theo-ngôn-ngữ).

---

## 🤝 Đóng góp

Quy tắc mới là đóng góp đầu tiên dễ nhất — một lệnh scaffold quy tắc
cùng fixtures must-fire **và** must-not-fire (quy tắc sinh ra cố ý fail
fixture cho đến khi bạn cài phát hiện thật — stub không thể ship):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Cài đặt dev đầy đủ, các lệnh standing gate và luật anti-creep / tường
lửa fixture nằm trong [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Ngừng ship kiểm thử mà bạn không thể tin.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Xây bởi [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
