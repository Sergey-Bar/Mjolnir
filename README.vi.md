<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Test cho bạn biết cái gì đã qua. Mjölnir cho bạn biết cái gì đáng tin." width="100%" />

<br />

Mjölnir tìm ra những test không thể thất bại và những pipeline không thể chuyển đỏ,<br />
rồi chấm điểm mức độ đáng tin của kết quả, kèm bằng chứng cho từng điểm.

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

[Xem cách hoạt động](#xem-cách-hoạt-động) · [Bắt đầu nhanh](#bắt-đầu-nhanh) · [Phát hiện gì](#mjölnir-phát-hiện-gì) · [Điểm](#điểm-đáng-tin) · [Bằng chứng](#mô-hình-bằng-chứng) · [Phân tích lần chạy](#phân-tích-pháp-chứng-lúc-chạy) · [CI](#tính-toàn-vẹn-ci) · [Tác tử](#tác-tử-ai) · [Bảo mật](#tin-cậy-và-bảo-mật) · [Giới hạn](#những-điều-mjölnir-không-thể-cho-bạn-biết) · [Tài liệu](#tài-liệu)

<details>
<summary>Đọc bằng ngôn ngữ khác — 22 bản dịch</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | Tiếng Việt | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Dấu tích xanh là một lời khẳng định, không phải bằng chứng

Dấu tích xanh nghĩa là pipeline không thất bại. Nó không có nghĩa là test đã chạy, hay test đã có thể thất bại. Mỗi trường hợp dưới đây đều qua với màu xanh:

- một `.only` bị commit khiến chỉ 3 test chạy thay vì 900
- `continue-on-error: true` trên job lẽ ra phải chặn
- `|| true` phía sau lệnh chạy test
- một test không khẳng định gì, hoặc có thân rỗng
- một lớp bọc thử lại biến thất bại thật thành lần qua may mắn
- một báo cáo mà workflow tải lên nhưng chưa từng được tạo ra
- một lệnh sleep cố định đang níu giữ một race condition

Không cái nào khiến pipeline chuyển đỏ, và cái nào trông cũng có vẻ cố ý khi review. Đó là lý do chúng sống sót. Đây là Mjölnir đang đọc một ví dụ thật:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Workflow CI của kho demo, đọc từng dòng. Mjölnir đánh dấu mỗi phát hiện tại dòng nó báo cáo, kèm quy tắc, điều sai, mức bằng chứng và tỷ lệ dương tính giả đã đo." width="800" />
</p>

<sub>Mọi phát hiện mà lần quét demo báo cáo cho workflow này, tại dòng được báo cáo. Được tạo bởi `npm run docs:readme-brand` từ [`demo-report.json`](assets/readme/demo-report.json) và được khóa chống sai lệch trong CI.</sub>

**Chế độ nghiêm ngặt.** Các phát hiện hung hăng nhất — `.only`, `continue-on-error`, kiểm tra trống, lạm dụng thử lại — nằm ở tầng cách ly. Chúng chỉ chạy với `--strict` và bị giới hạn ở mức nghiêm trọng `info`: chúng đánh dấu, không bao giờ chặn. Quét mặc định (`npx mjolnir-qa@latest` không có `--strict`) chỉ bao gồm các quy tắc cốt lõi và mở rộng. Thêm `--strict` khi bạn cũng muốn lớp tư vấn.

Mjölnir đọc bộ test, các workflow CI và, nếu bạn có, báo cáo của một lần chạy thật. Nó không chạy test của bạn, không cài dependency và không thực thi mã mà nó quét. Khi không có bằng chứng, nó nói thẳng như vậy thay vì bịa ra sự tự tin:

| Tình huống                                                | Mjölnir báo cáo gì                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Không tìm thấy khai báo test                              | Điểm `null`, hiển thị là **UNKNOWN**. Không bao giờ là một con số 100 bịa ra. |
| Không có baseline hay phiên bản để so sánh                | **UNKNOWN**, kèm lý do. Không bao giờ giả định là 0.                          |
| Lần quét bị cắt ngang (hết thời gian, tệp không đọc được) | **PARTIAL**, mã thoát `2`. Không bao giờ được trình bày là sạch.              |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Cách Mjölnir hoạt động. Nó đọc tĩnh bộ test và pipeline CI, cùng với báo cáo của một lần chạy thật khi có. Nó cân mỗi phát hiện theo mức bằng chứng và mức tin cậy, trong đó chỉ lần chạy thật mới đạt được L3 đến L5, rồi tạo ra các phát hiện, điểm đáng tin và một cổng CI dựa trên mã thoát đã đóng băng. Trong vòng lặp của tác tử, AI viết bản sửa và Mjölnir quét lại để chứng minh nó." width="880" />
</p>

<sub>Được dựng riêng cho trang này và hiển thị ở tỷ lệ 1:1. Được tạo bởi `npm run docs:readme-brand` và được khóa chống sai lệch trong CI; điểm, số đếm và ID quy tắc đến từ [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) và sổ đăng ký quy tắc, không bao giờ gõ tay. Cùng bức hình ở dạng poster: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Xem cách hoạt động

Một lần quét thật trên [`examples/demo-repo`](examples/demo-repo), một bộ test Playwright nhỏ có workflow CI. Đây là nơi điểm của nó bị trừ:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Bảng phân tích trừ điểm của Mjölnir: WORTHINESS 80/100 WORTHY, điểm theo từng hạng mục, ô trừ điểm theo mức nghiêm trọng và danh sách FIX THIS FIRST" width="520" />
</p>

<sub>Được tạo bởi `npm run docs:hero` từ một lần quét thật và được khóa chống sai lệch trong CI. Báo cáo `--verbose` đầy đủ của cùng lần quét là [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Xem video</strong> — một lần quét, bản sửa mà nó in ra, và lần quét lại chứng minh bản sửa đó</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Một khung hình từ bản ghi demo: npx mjolnir-qa@latest đang quét kho demo trong cửa sổ terminal" width="900" />
  </a>
</p>

<sub>Được dựng từng khung hình từ một lần quét thật bằng `npm run docs:video`; không bao giờ quay màn hình. Chọn khung hình để mở [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Cận cảnh một phát hiện

Mỗi phát hiện trả lời bốn câu hỏi: nó ở đâu, Mjölnir chắc chắn đến mức nào, quy tắc sai thường xuyên đến đâu, và cách sửa.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Phát hiện đầu tiên của lần quét demo, đúng như terminal in ra, với bốn phần được đánh dấu: ở đâu, chắc chắn đến mức nào, quy tắc sai thường xuyên đến đâu, và bản sửa." width="100%" />
</p>

`mjolnir explain QA-CI-001` in ra toàn bộ hồ sơ tin cậy của một quy tắc, gồm cả tỷ lệ dương tính giả đã đo và cấp mà tỷ lệ đó mang lại cho nó:

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

Đó là đơn vị giá trị: một chỗ mà CI báo cáo một lần qua mà nó không xứng đáng có.

<br />

## Bắt đầu nhanh

```bash
npx mjolnir-qa@latest
```

Nó quét thư mục hiện tại và in ra Trust Report: nó tìm thấy gì, bạn có thể tin đến mức nào, vì sao, và bước tiếp theo là gì. Nó thoát với `0` khi không tìm thấy gì ở mức cổng hoặc cao hơn.

Trong CI, chỉ quét những gì nhánh đưa vào, để một bộ test cũ không nhấn chìm pull request đầu tiên của bạn:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` ghi điều đó thành một workflow GitHub Actions, dùng [action](https://github.com/Sergey-Bar/Mjolnir#readme) được ghim vào tag chính `v1` (hoặc `npx` thuần với `--no-action`). Nó chỉ mang tính tư vấn cho đến khi bạn quyết định nó nên chặn.

| Lệnh                                | Chức năng                                              |
| ----------------------------------- | ------------------------------------------------------ |
| `mjolnir`                           | Trust Report: kết luận, độ tin, hành động tiếp theo    |
| `mjolnir --scope changed`           | Chỉ những gì nhánh của bạn đưa vào (dạng dùng cho CI)  |
| `mjolnir ci install`                | Tạo workflow PR mang tính tư vấn (dựa trên action)     |
| `mjolnir explain QA-CI-001`         | Cái gì, vì sao và cách sửa, kèm tỷ lệ FP đã đo         |
| `mjolnir why src/a.spec.ts:42`      | Vì sao chính dòng này bị đánh dấu. Không bao giờ chặn. |
| `mjolnir forensics ./test-results/` | Bằng chứng runtime từ một lần chạy thật                |
| `mjolnir trust-report`              | Trust Artifact độc lập (md + json)                     |
| `mjolnir handoff`                   | Kế hoạch khắc phục cho tác tử lập trình                |
| `mjolnir --json` / `--format sarif` | Đầu ra máy đọc được, GitHub Code Scanning              |
| `mjolnir --format codequality`      | Báo cáo GitLab Code Quality (artifact cho widget MR)   |
| `mjolnir --strict`                  | Chạy cả các quy tắc cấp quarantine (rủi ro FP cao hơn) |

<details>
<summary><strong>Mọi lệnh khác</strong> — phân loại test chập chờn, báo cáo, quản trị</summary>

<br />

| Lệnh                                | Chức năng                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Giao diện banner điểm từ trước khi có Trust Report                          |
| `mjolnir explain verdict`           | Vì sao kết luận của lần quét đã lưu lại như vậy                             |
| `mjolnir triage ./test-results/`    | Phân loại có hướng dẫn. Mỗi hàng kết thúc bằng một hành động tiếp theo.     |
| `mjolnir pw-report ./test-results/` | Tóm tắt lần chạy Playwright: số lần thử lại, test chập chờn, test chậm nhất |
| `mjolnir doctor:playwright`         | Quét sâu chỉ dành cho Playwright kèm Selector Health Score                  |
| `mjolnir fix --dry-run` / `fix`     | Tự động sửa an toàn, mỗi bản sửa được quét lại để chứng minh nó có hiệu lực |
| `mjolnir baseline` / `diff`         | Chụp nhanh các phát hiện, sau đó chỉ báo cáo cái mới hoặc tệ hơn            |
| `mjolnir impact --since <ref>`      | Một commit đã đưa vào và giải quyết những gì                                |
| `mjolnir summary`                   | Chú thích CI và tóm tắt step từ một báo cáo                                 |
| `mjolnir pr-comment`                | Một bình luận PR có phạm vi, dạng Markdown                                  |
| `mjolnir debt`                      | Sổ nợ test kèm mô hình chi phí                                              |
| `mjolnir handover`                  | Bản đồ làm quen bộ test cho kỹ sư QA mới                                    |
| `mjolnir init`                      | Phát hiện framework, in danh sách kiểm tra thiết lập                        |
| `mjolnir suppressions`              | Liệt kê các phát hiện bị chặn, phục vụ quản trị                             |
| `mjolnir rules --unmeasured`        | Những quy tắc chạy dựa trên giả định, không phải đo lường                   |
| `mjolnir rules --md`                | Danh mục quy tắc đầy đủ (JSON hoặc Markdown)                                |
| `mjolnir doctor`                    | Tự kiểm toán cơ sở quy tắc của chính Mjölnir                                |
| `mjolnir create-rule <ID>`          | Tạo khung cho một quy tắc mới và các fixture của nó                         |
| `mjolnir stats`                     | Bộ đếm cục bộ mọi bản sửa từng thấy                                         |
| `mjolnir badge`                     | JSON cho endpoint shields.io và đoạn mã                                     |
| `mjolnir --cache`                   | Quét lại tăng dần qua bộ đệm kết luận cục bộ                                |
| `mjolnir --format mermaid`          | Sơ đồ kiến trúc test cho một bình luận PR                                   |

`mjolnir help <command>` in cách dùng, ví dụ và bước tiếp theo cho bất kỳ lệnh nào.

</details>

Yêu cầu **Node.js ≥ 22.18** trên Windows, macOS hoặc Linux. Muốn cài toàn cục? `npm i -g mjolnir-qa`. Mức tối thiểu này đến từ chuỗi công cụ build (tsdown nhắm tới nó và pipeline phát hành chạy smoke test trên nó); các dependency lúc chạy không cần gì hơn.

<br />

## Mjölnir phát hiện gì

<p align="center">
  <img src="assets/readme/stack.svg" alt="Hoạt động với stack của bạn: các ngôn ngữ, framework test và hệ thống CI mà các quy tắc bao phủ, lấy từ sổ đăng ký quy tắc." width="100%" />
</p>

**79 quy tắc** trong bốn nhóm — vệ sinh test, chất lượng test, Playwright và tính toàn vẹn CI — cho TypeScript và JavaScript, Python, Java, C# và YAML của GitHub Actions. Chúng bao phủ Playwright ở cả bốn binding, cùng pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest và Mocha, với mức hỗ trợ ban đầu cho Cypress và Selenium. Chín quy tắc trong số đó, để bạn hình dung:

| ID           | Quy tắc                                                                    | Mức nghiêm trọng | Cấp        |
| ------------ | -------------------------------------------------------------------------- | ---------------- | ---------- |
| QA-CI-001    | `continue-on-error` che giấu một cổng xác minh đang thất bại               | error            | quarantine |
| QA-CI-009    | Mã thoát của test không được truyền đi (`\|` không có pipefail, chuỗi `;`) | error            | extended   |
| QA-TEST-001  | Commit test bị focus (`.only`, `fit`)                                      | error            | quarantine |
| QA-TEST-003  | Test không có assertion                                                    | error            | quarantine |
| QA-TQUAL-009 | Assertion trên promise không được await                                    | error            | quarantine |
| QA-PW-002    | Assertion trên locator không được await                                    | error            | core       |
| QA-PW-004    | Selector CSS/XPath dễ vỡ                                                   | warning          | quarantine |
| QA-PY-002    | Test bị bỏ qua (`skip`, `xfail` không nghiêm ngặt)                         | warning          | core       |
| QA-CS-103    | Phương thức test không có assertion                                        | error            | core       |

Danh mục đầy đủ được tạo từ sổ đăng ký, không bao giờ duy trì thủ công: `mjolnir rules --md`, [`docs/rules/`](docs/rules/), hoặc [hướng dẫn về những gì nó kiểm tra](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Mọi quy tắc được nhắc đến trong README này</strong>, trong một bảng</summary>

<br />

> Quy tắc `quarantine` chỉ chạy khi có `--strict` và không bao giờ chặn (bị giới hạn ở info). Mức nghiêm trọng hiển thị là mức do tác giả đặt.

| ID           | Nhóm       | Quy tắc                                                            | Mức nghiêm trọng | Cấp        |
| ------------ | ---------- | ------------------------------------------------------------------ | ---------------- | ---------- |
| QA-TEST-001  | Vệ sinh    | Commit test bị focus (`.only`, `fit`)                              | error            | quarantine |
| QA-TEST-002  | Vệ sinh    | Test bị bỏ qua. Nâng lên `error` nếu không có lý do được theo dõi. | warning          | quarantine |
| QA-TEST-003  | Vệ sinh    | Test không có assertion                                            | error            | quarantine |
| QA-TEST-004  | Vệ sinh    | Sleep cố định (`waitForTimeout`, `sleep()`, `delay()`)             | warning          | extended   |
| QA-TEST-006  | Vệ sinh    | Lạm dụng thử lại để che giấu sự chập chờn                          | warning          | quarantine |
| QA-TEST-010  | Vệ sinh    | Thân test rỗng                                                     | error            | quarantine |
| QA-TQUAL-002 | Chất lượng | Assertion hằng đúng                                                | error            | quarantine |
| QA-TQUAL-009 | Chất lượng | Assertion trên promise không được await                            | error            | quarantine |
| QA-TQUAL-011 | Chất lượng | Test bị comment lại                                                | warning          | extended   |
| QA-PW-002    | Playwright | Assertion trên locator không được await                            | error            | core       |
| QA-PW-003    | Playwright | Commit `page.pause()` / `test.only()`                              | error            | core       |
| QA-PW-004    | Playwright | Selector CSS/XPath dễ vỡ                                           | warning          | quarantine |
| QA-PW-123    | Playwright | URL môi trường bị viết cứng                                        | warning          | quarantine |
| QA-PW-140    | Playwright | Chụp màn hình không có `maxDiffPixelRatio`                         | warning          | core       |
| QA-CI-001    | CI         | `continue-on-error` che giấu một cổng đang thất bại                | error            | quarantine |
| QA-CI-002    | CI         | `\|\| true` nuốt mất mã thoát                                      | error            | extended   |
| QA-CI-005    | CI         | Báo cáo được dùng nhưng chưa từng được tạo                         | error            | quarantine |
| QA-CI-007    | CI         | Lớp bọc thử lại quanh test                                         | warning          | extended   |
| QA-CI-008    | CI         | Step luôn thành công che giấu thất bại                             | error            | quarantine |
| QA-CI-009    | CI         | Mã thoát không được truyền đi (`\|` không có pipefail, chuỗi `;`)  | error            | extended   |
| QA-CI-010    | CI         | Test bị bỏ qua ở nơi chúng phải chặn                               | error            | quarantine |
| QA-PY-002    | Python     | Test bị bỏ qua (`skip`, `xfail` không nghiêm ngặt)                 | warning          | core       |
| QA-PY-003    | Python     | Hàm test không có assertion                                        | error            | quarantine |
| QA-PY-005    | Python     | `time.sleep()` trong test                                          | warning          | extended   |
| QA-PY-012    | Python     | Assertion hằng đúng                                                | error            | quarantine |
| QA-JV-101    | Java       | Test bị vô hiệu hóa (`@Disabled`)                                  | warning          | core       |
| QA-JV-102    | Java       | Sleep cố định (`Thread.sleep()`)                                   | warning          | extended   |
| QA-JV-103    | Java       | Phương thức test không có assertion                                | error            | extended   |
| QA-JV-105    | Java       | Sleep cố định bằng `waitForTimeout()` của Playwright               | warning          | core       |
| QA-JV-106    | Java       | Selector dễ vỡ thay vì locator theo vai trò                        | warning          | quarantine |
| QA-CS-101    | C#         | Test bị bỏ qua (`[Ignore]`, `[Fact(Skip=)]`)                       | warning          | core       |
| QA-CS-102    | C#         | Sleep cố định (`Thread.Sleep` / `Task.Delay`)                      | warning          | core       |
| QA-CS-103    | C#         | Phương thức test không có assertion                                | error            | core       |
| QA-CS-105    | C#         | Sleep cố định bằng `WaitForTimeoutAsync()`                         | warning          | extended   |
| QA-CS-106    | C#         | Selector dễ vỡ thay vì locator theo vai trò                        | warning          | quarantine |

Python còn có QA-PY-001…012 (vệ sinh pytest) và QA-PY-101…108 (Playwright cho Python). Cypress và Selenium mỗi bên có một bộ khởi đầu gồm ba quy tắc.

</details>

Mỗi quy tắc được phát hành cùng một fixture must-fire **và** một fixture must-not-fire, và quy tắc nào kích hoạt trên chính fixture âm của nó thì không thể phát hành. Đó là tường lửa chống dương tính giả; `mjolnir doctor` thực thi nó trong CI của chính kho này.

### Selector Health Score

`mjolnir doctor:playwright` chấm điểm mỗi locator theo cách nó tìm phần tử: theo cách người dùng tìm (vai trò, nhãn, văn bản), qua một hợp đồng rõ ràng (`data-testid`), hay nhờ một sự tình cờ về cấu trúc (chuỗi CSS, XPath). Mỗi tệp nhận điểm từ 0 đến 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Điều này đo **độ bền, không phải độ đúng**. `.btn.btn-primary > div:nth-child(2)` qua hôm nay và sẽ tiếp tục qua cho đến khi ai đó động vào markup. Điểm thấp không bao giờ khẳng định test bị hỏng, chỉ nói rằng nó phụ thuộc vào markup mà không ai hứa giữ nguyên.

<br />

## Điểm đáng tin

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="Thang điểm đáng tin từ 0 đến 100, với một con trỏ quét qua mọi mức điểm: UNWORTHY dưới 50, NEEDS WORK từ 50 đến 79, WORTHY từ 80 đến 99, FORGED ở 100" width="720" />
</p>

<sub>Mọi mức điểm từ 0 đến 100, được đặt vị trí bởi `deriveScoreState` thật. Được tạo bởi `npm run docs:gauge` và được khóa chống sai lệch trong CI.</sub>

| Điểm      | Kết luận                                  |
| --------- | ----------------------------------------- |
| `0 – 49`  | **UNWORTHY**                              |
| `50 – 79` | **NEEDS WORK**                            |
| `80 – 99` | **WORTHY**                                |
| `100`     | **FORGED**                                |
| `null`    | **UNKNOWN**: không tìm thấy khai báo test |

**Cách tính.** Mức nghiêm trọng đặt ra mức trừ cơ bản (`error −8`, `warning −3`, `info −1`) và mức bằng chứng chiết khấu nó: E2 trừ đủ, E1 trừ một nửa (làm tròn xuống), E0 không trừ. Tổng được chuẩn hóa theo quy mô bộ test, tức là trừ theo từng khai báo test chứ không theo tệp. Terminal in ra đúng những con số đã chiết khấu mà điểm đã dùng; không có mô hình thứ hai nào ẩn giấu. Chi tiết: [docs/SCORING.md](docs/SCORING.md) và [hướng dẫn chấm điểm](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Điều mà 100 không có nghĩa.** Nó không có nghĩa là phần mềm đúng, bộ test đầy đủ, hay sản phẩm không có lỗi. Nó chỉ có nghĩa một điều: **không quy tắc nào mà Mjölnir đánh giá tạo ra mức trừ điểm trong lần quét này và với mô hình bằng chứng này.**

<br />

## Mô hình bằng chứng

Mỗi phát hiện mang hai nhãn: Mjölnir chắc chắn đến mức nào, và phát hiện đã được kiểm chứng đến đâu. Đó là khác biệt giữa một công cụ báo cáo mẫu và một công cụ bạn có thể dùng làm cổng cho một bản phát hành.

**Chắc chắn đến mức nào — mức bằng chứng.**

| Mức    | Tên                 | Ý nghĩa                                          | Trừ điểm |
| ------ | ------------------- | ------------------------------------------------ | -------- |
| **E2** | Chứng minh tất định | Lỗi hiện diện trong mã đúng như nó được viết     | Đủ       |
| **E1** | Bằng chứng theo mẫu | Một mẫu gắn chặt với lỗi đã khớp                 | Một nửa  |
| **E0** | Quan sát            | Đáng biết. Không phải khẳng định rằng có gì sai. | Không    |

Độ tin trong một lần phát hiện không phải là sức mạnh của chứng minh. Một quy tắc có thể chắc chắn rằng nó đã khớp đúng thứ nó tìm mà vẫn chỉ đang nhìn vào một phép suy đoán. Phát hiện E1 là để đọc và cân nhắc, không bao giờ áp dụng mù quáng, và ranh giới đó được đóng dấu trên phát hiện trong terminal, trong JSON và trong phần bàn giao cho tác tử.

**Đã kiểm chứng đến đâu — mức tin cậy.** Phần lớn phát hiện đến từ việc đọc mã của bạn. Đưa cho Mjölnir báo cáo của một lần chạy test thật và nó có thể xác nhận rằng mã thực sự đã chạy.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="Nấc thang tin cậy từ L0 đến L5. L0 đến L2 đến từ việc đọc mã; L3 đến L5 cần một báo cáo chạy thật, được đánh dấu bằng một chỗ đứt trên nấc thang." width="100%" />
</p>

| Mức    | Nói đơn giản           | Cần gì                                                    |
| ------ | ---------------------- | --------------------------------------------------------- |
| **L0** | Đã ghi nhận            | Đọc mã                                                    |
| **L1** | Trông giống vấn đề     | Đọc mã: một mẫu đã khớp                                   |
| **L2** | Đã chứng minh trong mã | Đọc mã: lỗi mang tính cấu trúc                            |
| **L3** | Tệp đã chạy            | Báo cáo chạy cho thấy tệp của phát hiện đã được thực thi  |
| **L4** | Test đã chạy           | Báo cáo chạy cho thấy test của phát hiện đã được thực thi |
| **L5** | Lần chạy xác nhận      | Chính kết quả của lần chạy xác nhận loại lỗi              |

Quét tĩnh dừng ở L2. Chỉ một báo cáo chạy thật (Playwright JSON, Jest hoặc Vitest JSON, JUnit XML) mới có thể nâng một phát hiện lên L3 hoặc cao hơn, nên một phát hiện chưa từng được thấy chạy sẽ không bao giờ có thể khẳng định là nó đã chạy. Định nghĩa: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Bao nhiêu phần trong số này đã được đo

**74 trên 79 quy tắc có tỷ lệ dương tính giả được đo trên mã OSS thật** (mỗi quy tắc ít nhất 10 phát hiện được phân loại thủ công; xem [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). 5 quy tắc còn lại phát hành dựa trên ước tính của tác giả và nói rõ điều đó, từng quy tắc một, trong `mjolnir explain`. `mjolnir rules --unmeasured` liệt kê chúng, và phần chân của mỗi lần quét cho biết bao nhiêu quy tắc thực sự _đã kích hoạt_ đã được đo.

Các tỷ lệ vẫn công khai kể cả khi chúng tệ. QA-TEST-001 (một `.only` bị commit) cho kết quả kiểm toán kém trên các kho thật và vì thế nằm trong quarantine. Con số hiện tại của mọi quy tắc, kể cả QA-PW-141, nằm trong báo cáo kiểm toán.

### Cấp tin cậy của quy tắc

Các cấp theo tỷ lệ dương tính giả đã đo, không theo ý kiến:

| Cấp            | FP đã đo                         | Hành vi                                                 |
| -------------- | -------------------------------- | ------------------------------------------------------- |
| **core**       | ≤ 10%                            | Báo cáo mặc định, có chặn                               |
| **extended**   | ≤ 30%                            | Báo cáo mặc định, độ tin thấp hơn                       |
| **quarantine** | > 30% hoặc được khai báo rõ ràng | Chỉ với `--strict`, giới hạn ở info, không bao giờ chặn |
| _chưa đo_      | n < 10                           | Không thể nâng lên core cho đến khi được đo             |

Dải FP chỉ có thể hạ cấp một bậc — chúng không bao giờ nâng cấp một quy tắc ra khỏi `quarantine` nếu nó đã được khai báo rõ ràng ở đó. Một quy tắc bị quarantined rõ ràng vẫn ở quarantine bất kể tỷ lệ FP đã đo được.

Nâng cấp, hạ cấp và độ trưởng thành theo ngôn ngữ: [vòng đời quy tắc](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Vì sao đây không phải một linter

Linter cho bạn biết mã có tuân theo quy tắc hay không. Mjölnir cho bạn biết việc xác minh của bạn có đáng tin hay không.

|                                                                  | Linter (ESLint, SonarQube) | Công cụ đo độ phủ | Review mã bằng AI |       **Mjölnir**       |
| ---------------------------------------------------------------- | :------------------------: | :---------------: | :---------------: | :---------------------: |
| Chấm điểm **hệ thống xác minh**, không phải mã sản phẩm          |           Không            |       Không       |       Không       |           Có            |
| Tính toàn vẹn của workflow CI (`continue-on-error`, `\|\| true`) |           Không            |       Không       |   chỉ phần diff   |           Có            |
| Chấm độ bền của locator Playwright (Selector Health)             |           Không            |       Không       |       Không       |           Có            |
| Đọc dữ liệu chạy thật để đưa ra kết luận `TRUE-FLAKE`            |           Không            |       Không       |       Không       |           Có            |
| Công bố tỷ lệ dương tính giả đã đo cho từng quy tắc              |           Không            |       Không       |       Không       |           Có            |
| Đánh dấu test không có assertion                                 |            Có\*            |       Không       |      đôi khi      |           Có            |
| Bắt các sleep cố định (`waitForTimeout`, `time.sleep`)           |            Có\*            |       Không       |      đôi khi      |           Có            |
| Tất định (cùng đầu vào, cùng đầu ra)                             |             Có             |        Có         |       Không       |           Có            |
| Chi phí mỗi lần quét                                             |          miễn phí          |     miễn phí      |       token       | **bằng không** (cục bộ) |

<sub>\*Được bao phủ bởi `eslint-plugin-jest` và `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) và bởi các quy tắc assertion riêng của SonarQube. Các cột mô tả hành vi mặc định khi xác minh bộ test; plugin, gói trả phí và quy tắc tùy chỉnh sẽ làm thay đổi một số câu trả lời. Đây là bản tóm tắt định vị, không phải benchmark.</sub>

Hãy dùng cả review bằng AI. Nó nắm bắt sắc thái, ý định và lỗi thiết kế mà không mẫu nào tìm được. Mjölnir bắt được những gì review bằng AI bỏ sót vì trông có vẻ cố ý: một `.only` bị commit, một mã thoát bị nuốt, một `continue-on-error` trên job test. Những thứ đó cần quét, không cần suy luận.

<br />

## Phân tích pháp chứng lúc chạy

Phân tích tĩnh suy luận về mã chưa từng chạy. Phân tích pháp chứng đọc những gì thực sự đã xảy ra: Playwright JSON, Jest JSON, Vitest JSON và JUnit XML từ bất kỳ runner nào.

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

`TRUE-FLAKE` không có nghĩa là test đã được thử lại. Nó có nghĩa là test **đã thất bại ít nhất một lần thử rồi kết thúc với màu xanh**: một lần qua may mắn, bị đánh dấu bất kể dấu tích cuối cùng nói gì. `mjolnir triage` biến lịch sử đó thành một đề xuất cách ly, và `mjolnir pw-report` tóm tắt một lần chạy. Chính những báo cáo chạy này là thứ nâng phát hiện lên mức tin cậy L3 trở lên.

<br />

## Tính toàn vẹn CI

Một test có thể qua trong khi pipeline bao quanh nó không thể thất bại. Mjölnir cũng đọc các workflow: `continue-on-error`, `|| true`, mã thoát không bao giờ được truyền đi, step luôn thành công, báo cáo được dùng nhưng chưa từng được tạo, và cổng bị bỏ qua đúng ở những sự kiện lẽ ra phải chặn. Mỗi phát hiện nêu tên job, step và dòng, và mang mức bằng chứng riêng.

Tạo workflow PR, mặc định mang tính tư vấn:

```bash
mjolnir ci install
```

Hoặc thêm action trên Marketplace vào một workflow bạn đã có:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Ghim `@v1` để theo dòng phiên bản chính, hoặc một tag chính xác (`@v0.5.32`) để có cổng tái lập được. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) đề cập đến Marketplace, Smithery và các sổ đăng ký MCP.

Để đưa phát hiện vào GitHub Code Scanning, hãy tải lên SARIF (yêu cầu `security-events: write` ở phạm vi workflow hoặc job):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

Trên GitLab, `--format codequality` ghi báo cáo Code Quality mà widget MR và chú thích diff đọc ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Thiết lập trình soạn thảo và pipeline: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Quy trách nhiệm theo phạm vi thay đổi

```bash
npx mjolnir-qa@latest --scope changed
```

Phát hiện được quy về các dòng mà nhánh của bạn đã thêm, đo so với **merge-base**. Phạm vi là cùng tập tệp mà một lần quét đầy đủ phát hiện (spec TS/JS và cấu hình adapter, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), cộng thêm các thay đổi chưa commit và chưa theo dõi, nên nó hoạt động cả trước khi bạn commit. Nhánh gốc được xác định theo thứ tự `main → master → origin/main → origin/master → origin/HEAD`; ghi đè bằng `--base <ref>`.

Khi không xác định được merge-base (clone nông, HEAD tách rời, mục tiêu nằm ngoài git), phát hiện sẽ quay về quy cho toàn bộ tệp **và báo cáo nói rõ điều đó.** Một sự quay về âm thầm sẽ chính là loại lỗi mà công cụ này tồn tại để bắt.

<br />

## Tác tử AI

Phát hiện chỉ có giá trị nếu có thứ gì đó hành động dựa trên chúng.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI viết bản sửa. Mjölnir xác minh nó.** Bằng chứng đến từ lần quét lại, không bao giờ đến từ báo cáo thành công của chính tác tử.

| Lệnh              | Tác tử nhận được gì                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | Một máy chủ [MCP](https://modelcontextprotocol.io) qua stdio. `scan`, `explain` và `diff` trở thành công cụ có thể gọi.                                                             |
| `mjolnir handoff` | Một báo cáo `--json` đã lưu trở thành một kế hoạch Markdown tất định: đã phát hiện gì, ranh giới bằng chứng của từng phát hiện, những gì **không** được thay đổi, và cách xác minh. |
| `mjolnir install` | Ghi vào các vị trí dành cho tác tử mà kho của bạn đã có (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) để tác tử quét lại trước khi khẳng định là đã xong.                         |

Thêm vào một client có CLI riêng:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Hoặc vào bất kỳ client nào nhận khối `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**Lan can bảo vệ quan trọng hơn sự tiện lợi.** Mỗi phát hiện trong phần bàn giao mang ranh giới của nó. **E2** nói _tất định: kiểm tra vị trí và áp dụng bản sửa_. **E1** nói _CẦN XÁC NHẬN: chỉ riêng quan sát không chứng minh được lỗi_. Một tác tử sửa E1 một cách mù quáng, chặn một quy tắc, hoặc sửa một quy tắc để nâng điểm đang làm đúng điều mà công cụ này tồn tại để bắt, nên phần bàn giao nói rõ điều đó trong prompt, ngay cạnh phát hiện.

<br />

## Tin cậy và bảo mật

**Ưu tiên cục bộ, không thu thập dữ liệu sử dụng.** Không có API nào có khả năng truy cập mạng (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) tồn tại ở bất kỳ đâu trong `src/`, và [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) sẽ làm build thất bại nếu có một cái xuất hiện. Nó cũng cấm `eval` và `new Function`. Quét mã không đáng tin không bao giờ thực thi nó: phân tích tĩnh đọc văn bản nguồn, còn phân tích pháp chứng phân tích các tệp báo cáo đã có sẵn trên đĩa.

Hai lưu ý: bản thân `npx` tải gói xuống trước khi bất cứ thứ gì chạy, và cam kết này áp dụng cho `src/`, không bao gồm plugin của bên thứ ba.

**Plugin không chạy trong sandbox.** Plugin JS (`mjolnir-rules/*.mjs`, hoặc các gói npm liệt kê dưới `"plugins"`) chạy với toàn quyền của Node, cùng mô hình tin cậy như plugin của ESLint hay Vitest. Việc tải chúng phải được bật **cho từng lần quét**: không có `--enable-plugins` (hoặc `MJOLNIR_ENABLE_PLUGINS=1`) thì mã nguồn của chúng không bao giờ được tải, và một thông báo trên stderr liệt kê những gì đã bị bỏ qua. Manifest quy tắc dạng JSON không thực thi mã, và các tiền tố ID của quy tắc core được giữ riêng để plugin không thể mạo danh chúng. Báo cáo lỗ hổng qua [SECURITY.md](SECURITY.md).

**Nó tự chạy trên chính mình.** Một công cụ tin cậy xác minh chẳng có chỗ đứng nếu chính nó không thể được xác minh. Mỗi lần chạy CI đều quét kho này bằng bản build mà chính lần chạy đó tạo ra. Cổng thất bại với bất kỳ phát hiện nào ở mức error, và cả khi lần quét là **một phần** hoặc có **quy tắc bị sập**, vì một lần tự quét bị cắt cụt mà không báo cáo gì chính là màu xanh giả mà dự án này tồn tại để bắt. `mjolnir doctor` kiểm toán lại cơ sở quy tắc trong cùng lần chạy (tường lửa fixture, tính trung thực của các cấp, trần của cấp core), và một kiểm tra có kết quả INCONCLUSIVE sẽ thất bại y như một kiểm tra thất bại. Cả hai báo cáo được tải lên dưới dạng artifact của build.

### Mã thoát và hợp đồng máy

Đã đóng băng, nên bạn có thể xây logic CI dựa trên chúng:

| Mã thoát | Ý nghĩa                                                                |
| -------- | ---------------------------------------------------------------------- |
| `0`      | Sạch: không có phát hiện ở mức cổng hoặc cao hơn                       |
| `1`      | Có phát hiện ở mức cổng hoặc cao hơn                                   |
| `2`      | Quét một phần (hết thời gian, tệp không đọc được). Không bao giờ chặn. |
| `10`     | Lỗi sử dụng (cờ sai, thiếu mục tiêu)                                   |
| `20`     | Lỗi nội bộ                                                             |

`2` được cố ý tách biệt khỏi `0`: một lần quét chưa hoàn tất không phải là "không tìm thấy gì". Nó chỉ chưa tìm xong.

Mọi thứ mà máy tiêu thụ (kết quả công cụ MCP, `--json`, SARIF 2.1) đều đến từ một kết quả chuẩn duy nhất theo một schema có phiên bản và **chỉ mở rộng bằng cách bổ sung** (`schemaVersion: 1`, `contractVersion: 1`), nên không bên tiêu thụ nào phải dựng lại ý nghĩa từ văn bản đã hiển thị. Xem [hợp đồng máy](docs/machine-contract.md). ID quy tắc (`QA-<FAMILY>-NNN`) không thể thay đổi sau khi phát hành và không bao giờ được dùng lại.

<br />

## Những điều Mjölnir không thể cho bạn biết

- **Nó không chạy test của bạn.** Một lần quét sạch không phải là một bộ test đang qua.
- **Nó không thể cho bạn biết một assertion là _sai_.** `expect(total).toBe(41)` trông vẫn khỏe mạnh. Mjölnir tìm những test _không thể thất bại_ và những pipeline _không thể chuyển đỏ_, không phải những test kiểm tra sai thứ.
- **Nó không chứng minh tính đúng đắn nghiệp vụ.** Không có gì ở đây nói rằng sản phẩm của bạn làm đúng điều mà yêu cầu đặt ra.
- **Điểm 100 không phải bằng chứng của một bộ test tốt.** Bộ test của bạn có bao phủ rủi ro thực tế hay không là một câu hỏi khác, và công cụ này không trả lời câu hỏi đó.
- **5 trên 79 quy tắc phát hành dựa trên ước tính**, không phải tỷ lệ đã đo. Mỗi quy tắc đều nói rõ điều đó trên phát hiện của chính nó.
- **E1 không phải E2.** Phát hiện theo suy đoán đáng để đọc, không đáng để áp dụng mù quáng.
- **Một kho rỗng nhận điểm `null`, không bao giờ là 100.**
- **Một tệp tên `*.spec.ts` không có khai báo test không được tính là độ phủ.** Một kho mà các tệp spec duy nhất chỉ chứa import hoặc kiểu (không có lời gọi `it`/`test` nào) nhận điểm `null`, không phải 100.

<br />

## Tài liệu

Trang tài liệu đầy đủ ở <https://sergey-bar.github.io/Mjolnir/>.

| Tài liệu                                               | Nội dung                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Chuẩn hóa điểm và trọng số bằng chứng                       |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Bộ từ vựng chuẩn: một từ cho một khái niệm                  |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Tỷ lệ dương tính giả đã đo và phương pháp                   |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Trạng thái quy tắc, cấp, chặn, ngừng hỗ trợ                 |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Chính sách semver, giao diện đóng băng, chu kỳ ngừng hỗ trợ |
| [docs/machine-contract.md](docs/machine-contract.md)   | Kết quả chuẩn mà máy đọc được                               |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Đầu ra SARIF và thiết lập trình soạn thảo hoặc CI           |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: báo cáo Code Quality, công thức cho MR, cổng        |
| [docs/rules/](docs/rules/)                             | Danh mục được tạo cho từng quy tắc                          |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Thiết lập môi trường phát triển và quy trình đóng góp       |
| [SUPPORT.md](SUPPORT.md)                               | Nơi hỏi, báo cáo và nhận trợ giúp                           |
| [SECURITY.md](SECURITY.md)                             | Báo cáo lỗ hổng                                             |
| [CHANGELOG.md](CHANGELOG.md)                           | Lịch sử phát hành                                           |

### Trạng thái

**Phiên bản 1.** Schema JSON và mã thoát là những hợp đồng đã đóng băng. TypeScript và Python có độ phủ đã đo rộng nhất. Java và C# mới hơn; hãy đọc chúng qua [bảng độ trưởng thành](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Những gì sắp tới, không có ngày tháng bịa đặt: [lộ trình công khai](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Đóng góp

Quy tắc mới là đóng góp đầu tiên dễ nhất. Một lệnh duy nhất tạo khung cho quy tắc cùng các fixture must-fire **và** must-not-fire của nó. Quy tắc được tạo cố ý thất bại trên chính các fixture của nó cho đến khi logic phát hiện thật được viết, vì một bản nháp được phát hành là một quy tắc chưa ai đo:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Thiết lập môi trường phát triển, các lệnh cổng thường trực, cùng các luật anti-creep và tường lửa fixture có trong [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Chạy nó trên kho của bạn." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Đọc hướng dẫn](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Trang tài liệu](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Đừng hỏi test có qua hay không.<br />
Hãy hỏi bằng chứng có chứng minh rằng chúng xứng đáng được tin hay không.

<sub>Được xây dựng bởi [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · Giấy phép MIT</sub>

</div>
