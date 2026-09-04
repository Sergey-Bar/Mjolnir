<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### اختباراتك تكذب عليك. نحن نُثبت ذلك.

**Verification Trust Engine لضمان الجودة.** يراجع Mjölnir أطقم الاختبارات
وخطوط CI، ويُبلّغ عن درجة الجدارة، ويُظهر بدقة أين ينكسر الثقة.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | العربية | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**هل اختباراتك جديرة بالثقة؟**

[شاهده يعمل](#-شاهده-يعمل) ·
[البداية السريعة](#-البداية-السريعة) ·
[ماذا يفحص](#-ماذا-يفحص-mjölnir) ·
[التنقيط](#كيف-يعمل-التنقيط) ·
[CI](#-تكامل-ci) · [الإعداد](#الإعداد) ·
[الوثائق](#-الوثائق)

</div>

---

## 🎬 شاهده يعمل

<p align="center">
  <img src="assets/readme/demo.svg" alt="تقرير --verbose الكامل لـ Mjölnir على مستودع تجريبي: WORTHINESS 75/100 NEEDS WORK، تفصيل تشخيصات بحسب الفئة، قائمة FIX THIS FIRST، وكل اكتشاف مع معرّف القاعدة ورقم السطر — عبر قواعد CI وPlaywright ونظافة الاختبارات وPython" width="900" />
</p>

<sub>الناتج الكامل لـ `npx mjolnir-qa ./examples/demo-repo --verbose`
معروض من المُبلِّغ الحقيقي — لا شيء مقتطع. يُعاد توليده بـ
`npm run docs:demo`؛
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
يُسقط CI إذا انحرفت المخرجات عمّا تطبعه الأداة.</sub>

**ما الذي حدث للتو:**

1. اكتشف Mjölnir مواصفات Playwright وإعداده وسير عمل CI وملف اختبارات
   Python — أربع لغات/صيغ في تمريرة واحدة.
2. وجد أدلة تُضعف الثقة في الطقم — `continue-on-error` يُخفي مهمة، و
   `|| true` يبتلع رمز الخروج، وسبات صارم، ومحدِّد هشّ، وعناوين تجريبية
   مضمّنة، وانتظار `networkidle`.
3. حوّل كلًّا منها إلى اكتشاف ملموس بمعرّف قاعدة وموقع وإصلاح — وإلى
   درجة واحدة يمكنك بوابت PR على أساسها.

### اكتشاف واحد عن قرب

شغّل `mjolnir explain QA-CI-001` على الاكتشاف الأول أعلاه وستحصل على:

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

هذه هي وحدة القيمة: ليست ملاحظة أسلوب، بل مكانٌ يقول لك فيه CI إن شيئًا
ما قدّم — وهو لم يقدّم.

---

## ⚡ البداية السريعة

شغّله على مستودع للحصول على تقرير كامل ودرجة جدارة:

```bash
npx mjolnir-qa@latest
```

**في CI، المنتج أمر واحد.** يفحص فقط ما لمسه الفرع ويخرج برمز غير صفري
عند المشكلات الجديدة:

```bash
npx mjolnir-qa@latest --scope changed
```

ضعه في فحص PR — `mjolnir ci install` يكتب سير العمل — وانتهى الأمر.
كل ما عدا ذلك اختياري.

| الأمر                               | ما يفعله                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `mjolnir`                           | فحص المستودع كاملًا + درجة الجدارة                   |
| `mjolnir --scope changed`           | ما أدخله فرعك فقط — صيغة CI                          |
| `mjolnir ci install`                | يولّد سير عمل PR استشاريًا                           |
| `mjolnir explain QA-CI-001`         | ماذا / لماذا / الإصلاح + معدل FP المقيس لقاعدة واحدة |
| `mjolnir rules --unmeasured`        | القواعد العاملة بالافتراض لا بالقياس                 |
| `mjolnir --json` / `--format sarif` | قابل للقراءة آليًا / GitHub Code Scanning            |
| `mjolnir --strict`                  | يشغّل أيضًا قواعد طبقة الحجر الصحي (خطر FP أعلى)     |

<details>
<summary><strong>عندما يتبدّد استقرار شيء ما</strong></summary>

| الأمر                               | ما يفعله                                                |
| ----------------------------------- | ------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | بيانات تشغيل حقيقية → أحكام `TRUE-FLAKE`، و`FLAKY.md`   |
| `mjolnir triage ./test-results/`    | اقتراح حجر صحي من سجل التنفيذ                           |
| `mjolnir pw-report ./test-results/` | ملخص تشغيل Playwright — المحاولات / المتذبذبات / الأبطأ |
| `mjolnir doctor:playwright`         | فحص عميق لـ Playwright وحده + Selector Health Score     |

</details>

<details>
<summary><strong>عادي / تقارير</strong></summary>

| الأمر                           | ما يفعله                                     |
| ------------------------------- | -------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | إصلاحات تلقائية آمنة مع برهان                |
| `mjolnir baseline` / `diff`     | لقطة للاكتشافات ثم تقرير الجديد/المتدهور فقط |
| `mjolnir impact --since <ref>`  | ما تغيّر منذ إيداع سابق                      |
| `mjolnir debt`                  | سجل دَّين الاختبارات مع نموذج كلفة           |
| `mjolnir handover`              | خريطة تهيئة الطقم لمسؤول جودة جديد           |
| `mjolnir stats`                 | عدّادات محلية تراكمية للإصلاحات المرصودة     |
| `mjolnir badge`                 | JSON لنقطة نهاية shields.io + مقطع كود       |
| `mjolnir rules --md`            | كتالوج القواعد الكامل (JSON أو Markdown)     |
| `mjolnir doctor`                | تدقيق ذاتي لقاعدة قواعد Mjölnir نفسها        |
| `mjolnir create-rule <ID>`      | هيكلة قاعدة جديدة + تجهيزاتها                |
| `mjolnir --format mermaid`      | مخطط معماري للاختبارات لتعليق PR             |

</details>

ثبّته عالميًا بدل `npx` إن فضّلت: `npm i -g mjolnir-qa`.
يتطلب Node.js ≥ 22.18. يعمل على Windows وmacOS وLinux.

---

## 👥 لمن هذا؟

- **QA / SDET** يملكون طقم e2e أو تكامل، ويحتاجون دليلًا على أن الطقم
  يستحق فعليًا علامة النجاح الخضراء التي يُنتجها.
- **فرق Platform / DevEx** المسؤولة عن نزاهة CI وبوابات الإصدار —
  الأشخاص الذين يهتمون ألا يحوّل `continue-on-error` خطًّا أحمر إلى
  أخضر بصمت.
- **مشرفو OSS** يريدون بوابة تحقق رخيصة دائمة التشغيل تعمل محليًا وفي
  CI دون أي نداءات شبكة.

---

## 🔨 ماذا يفحص Mjölnir

|     |                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **درجة الجدارة** — رقم واحد، جدول خصم شفاف، بلا صندوق أسود                                                            |
| 🎭  | **Selector Health Score** — يقيّم محدِّدات Playwright لديك، لا معدل نجاحك فقط                                         |
| 🔬  | **الأدلة الجنائية للتنفيذ** — يقرأ بيانات تشغيل Playwright/JUnit الحقيقية ليلتقط `TRUE-FLAKE`، لا مجرد تخمينات ثابتة  |
| 🚨  | **قواعد نزاهة CI** — يلتقط `continue-on-error` و`\|\| true` وحيل الأخضر الكاذب الأخرى                                 |
| 🐍  | **ترابطات Playwright الأربعة جميعًا** — TypeScript وPython وJava وC#/.NET — إضافة إلى pytest وJUnit/TestNG وأسيرات CI |
| 🔒  | **Local-first** — صفر نداءات شبكة أثناء الفحص، صفر قياس عن بُعد، يجري في ثوانٍ                                        |

### القواعد

كل قاعدة تأتي مع تجهيزات must-fire **و**must-not-fire. القاعدة التي
تنطلق على تجهيزتها السالبة ذاتها لا يمكن أن تُشحن — ذلك هو جدار الإنذارات
الكاذبة.

<details>
<summary><strong>نظافة الاختبارات</strong></summary>

| ID          | القاعدة                                            | Severity |
| ----------- | -------------------------------------------------- | -------- |
| QA-TEST-001 | اختبار مركّز مُودَع (`.only`، `fit`)               | error    |
| QA-TEST-002 | اختبار متجاوز بلا مسوّغ                            | error    |
| QA-TEST-002 | اختبار متجاوز مع مسوّغ مسجَّل                      | warning  |
| QA-TEST-003 | اختبار بلا تأكيدات                                 | error    |
| QA-TEST-004 | سبات صارم (`waitForTimeout`، `sleep()`، `delay()`) | warning  |
| QA-TEST-006 | إساءة استخدام المحاولات تُخفي التذبذب              | warning  |
| QA-TEST-010 | جسد اختبار فارغ                                    | error    |

</details>

<details>
<summary><strong>جودة الاختبارات</strong></summary>

| ID           | القاعدة                   | Severity |
| ------------ | ------------------------- | -------- |
| QA-TQUAL-001 | تحقق بالمحاكاة فقط        | info     |
| QA-TQUAL-002 | تأكيد مُبرهن ذاتيًا       | error    |
| QA-TQUAL-009 | تأكيد وعد بلا await       | error    |
| QA-TQUAL-011 | اختبارات معطَّلة بالتعليق | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | القاعدة                                   | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-PW-002 | تأكيد محدِّد بلا await                    | error    |
| QA-PW-003 | `page.pause()` / `test.only()` مودعة      | error    |
| QA-PW-004 | محدِّدات CSS/XPath هشّة                   | warning  |
| QA-PW-005 | منطق عمل داخل `page.evaluate()`           | info     |
| QA-PW-114 | مقابض عناصر قديمة (`page.$`)              | info     |
| QA-PW-118 | انتظارات `networkidle` (متذبذبة بطبيعتها) | info     |
| QA-PW-123 | عناوين بيئات مضمّنة                       | warning  |

</details>

<details>
<summary><strong>نزاهة CI</strong></summary>

| ID        | القاعدة                                                     | Severity |
| --------- | ----------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` يُخفي الإخفاقات                         | error    |
| QA-CI-002 | `\|\| true` يبتلع رموز الخروج                               | error    |
| QA-CI-005 | تقرير يُستهلك ولا يُولَّد أبدًا                             | error    |
| QA-CI-007 | أغلفة محاولات حول الاختبارات                                | warning  |
| QA-CI-008 | خطوة دائمة النجاح تُخفي الإخفاقات                           | error    |
| QA-CI-009 | رمز خروج الاختبار لا يُمرَّر (`\|` بلا pipefail، سلاسل `;`) | error    |
| QA-CI-010 | اختبارات تُتجاوز حيث يجب أن تحجب (حرّاس skip-on-PR)         | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | القاعدة                                  | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PY-002 | اختبار متجاوز (`skip`، `xfail` غير صارم) | warning  |
| QA-PY-003 | دالة اختبار بلا تأكيدات                  | error    |
| QA-PY-005 | `time.sleep()` في الاختبارات             | warning  |
| QA-PY-006 | جسد اختبار فارغ (`pass`)                 | info     |
| QA-PY-010 | اعتماد على العشوائية/الزمن بلا freeze    | info     |
| QA-PY-012 | تأكيد مُبرهن ذاتيًا                      | error    |

20 قاعدة Python إجمالًا (QA-PY-001…012 نظافة pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | القاعدة                                    | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-JV-101 | اختبار معطَّل (`@Disabled`)                | warning  |
| QA-JV-102 | سبات صارم (`Thread.sleep()`)               | warning  |
| QA-JV-103 | طريقة اختبار بلا تأكيدات                   | error    |
| QA-JV-105 | سبات صارم في Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | محدِّد هشّ بدل role locator                | warning  |
| QA-JV-108 | عنوان بيئة مضمّن في اختبار                 | info     |
| QA-JV-111 | محاكاة شاملة `page.route("**")`            | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | القاعدة                                     | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-CS-101 | اختبار متجاوز (`[Ignore]`، `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | سبات صارم (`Thread.Sleep` / `Task.Delay`)   | warning  |
| QA-CS-103 | طريقة اختبار بلا تأكيدات                    | error    |
| QA-CS-105 | سبات صارم `WaitForTimeoutAsync()`           | warning  |
| QA-CS-106 | محدِّد هشّ بدل role locator                 | warning  |
| QA-CS-108 | عنوان بيئة مضمّن في اختبار                  | info     |
| QA-CS-111 | محاكاة شاملة `page.RouteAsync("**")`        | info     |

</details>

> الكتالوج الحي الكامل — كل قاعدة بطبقتها وثقتها وخطر إنذارها الكاذب
> وتوافر إصلاحها الآلي — يُولَّد من السجل:
>
> ```bash
> mjolnir rules --md
> ```
>
> صفحات كل قاعدة تقع تحت [`docs/rules/`](docs/rules/).

### كم من هذا مقيس

**74 من 99 قاعدة تحمل معدل إنذارات كاذبة مقيسًا على كود OSS حقيقي**
(≥ 10 اكتشافات مصنفة يدويًا لكل منها؛ راجع
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). الـ19 الأخرى تُشحن على تقدير
المؤلف. ذيل كل فحص يخبرك كم من القواعد التي _انطلقت_ مقيسة؛ و
`mjolnir rules --unmeasured` يسرد غير المقيسة؛ وصفحة `mjolnir explain`
لكل قاعدة تُصرّح بحالتها. ننشر المعدل حتى حين يكون قبيحًا — QA-CS-103
يدقّق عند 95% ولذلك هو في الحجر الصحي. تنمية الـ78 تلك هي العمل
المستمر للمشروع.

### طبقات القواعد ونضج اللغات

كل قاعدة هي `core` أو `extended` أو `quarantine`، تُخصَّص وفق معدل
إنذاراتها الكاذبة **المقيس**:

| الطبقة       | المعنى                          | الفحص الافتراضي | `--strict` |
| ------------ | ------------------------------- | :-------------: | :--------: |
| `core`       | ≤ 10% إنذارات مقيسة             |       ✅        |     ✅     |
| `extended`   | ≤ 30% إنذارات مقيسة             |       ✅        |     ✅     |
| `quarantine` | فوق 30%، أو لم يقس بعد (n < 10) |       ❌        |     ✅     |

| اللغة           | المهايئ     | التغطية اليوم                                        |
| --------------- | ----------- | ---------------------------------------------------- |
| TypeScript / JS | AST المترجم | الأوسع والأكثر قياسًا — غالبًا `core`/`extended`     |
| Python / pytest | طبقة regex  | واسعة، مدقَّقة على corpus — غالبًا `core`/`extended` |
| Java            | طبقة regex  | أحدث — غالبًا `extended`/`quarantine`                |
| C# / .NET       | طبقة regex  | أحدث — غالبًا `extended`/`quarantine`                |

TypeScript وPython يمتلكان أوسع تغطية مقيسة. Java وC# مُشحونان وموثَّقان
وتبقيان خارج الرقم الرئيسي حتى يُدقَّق طقم مستهلك حقيقي (لا اختبارات
مكتبة الترابط نفسها).

---

## كيف يعمل التنقيط

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="ناتج الطرفية لـ Mjölnir — WORTHINESS 75/100 NEEDS WORK، تفصيل تشخيصات بحسب الفئة وقائمة FIX THIS FIRST" width="820" />
</p>

<sub>يُعاد توليده بـ `npm run docs:hero`؛
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
يُسقط CI إذا انحرفت المخرجات عمّا يطبعه المُبلِّغ فعليًا.</sub>

الدرجة شفافة: **error −8، warning −3، info −1**، ثم تُطبَّع بمستوى تعرض
الطقم (خصم لكل إعلان اختبار). الخصوم المرجَّحة بالأدلة تعني أن الإشارات
الضعيفة أرخص. تعرض الطرفية الأرقام المخفَّضة نفسها التي تستخدمها الدرجة —
لا صندوق أسود. المنهج الكامل: [docs/SCORING.md](docs/SCORING.md).

**الأحكام**

| Score   | الحكم            |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**مستويات الدليل** — كل اكتشاف يحمل واحدًا؛ وهو يحدد وزن الاكتشاف في
الدرجة:

| المستوى | المعنى       | الأثر على الدرجة | مثال                                              |
| ------- | ------------ | ---------------- | ------------------------------------------------- |
| E2      | عيب حتمي     | خصم كامل         | `.only` مودعة — قابلة للإثبات بنيويًّا            |
| E1      | نمط استدلالي | نصف الخصم        | `sleep()` أعادته regex — إشارة قوية، ليست برهانًا |
| E0      | ملاحظة       | صفر (إخباري فقط) | يُبلَّغ عنه لكنه لا يبوّت CI أبدًا ولا يخصم       |

معظم القواعد **E1**. شعار «we prove it» يشير إلى هذا النظام: اكتشافات
E2 إثبات بنيوي؛ واكتشافات E1 تحذيرات موزونة الموضع، لا براهين رسمية.

المستودع الفارغ يحصد `null`، لا 100 مزوّرة أبدًا — انظر
[نموذج الثقة](#نموذج-الثقة).

---

## 🎭 Selector Health Score

المقياس الرئيسي لأطقم Playwright — ما مدى صمود محدِّداتك:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

المحدِّدات القائمة على الدور تحصد الدرجة الكاملة. سلاسل أصناف CSS وXPath
تبطئ الدرجة — تتحطم مع أي إعادة هيكلة DOM دون إخبارك بأي سلوك ارتدّ.

---

## 🔬 أدلة التنفيذ

الكشف الثابت عن التذبذب مجرد تخمين. يقرأ Mjölnir **بيانات تنفيذ حقيقية** —
تقارير JSON من Playwright وXML من JUnit من أي مشغّل:

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

الاختبار الذي ينجح من المحاولة ≥ 2 فقط ليس اختبارًا ناجحًا — إنه اختبار
محظوظ. يوسم `TRUE-FLAKE` بغضّ النظر عن علامة النجاح الخضراء النهائية.

---

## ⚡ Mjölnir ليس أداة lint أخرى

أدوات lint تخبرك إن كان الكود يتبع القواعد. Mjölnir يخبرك إن كان يمكن
الثقة بتحقّقك.

|                                                      | ESLint / SonarQube | أدوات التغطية | المراجعة اليدوية | **Mjölnir** |
| ---------------------------------------------------- | :----------------: | :-----------: | :--------------: | :---------: |
| نزاهة أسيرات CI (`continue-on-error`، `\|\| true`)   |         ❌         |      ❌       |      نادرًا      |     ✅      |
| عبر اللغات (TS، Python، Java، C#) من أداة واحدة      |         ❌         |      ❌       |        ❌        |     ✅      |
| يقيّم صمود محدِّدات Playwright (Selector Health)     |         ❌         |      ❌       |      نادرًا      |     ✅      |
| يميّز الاختبارات بلا تأكيدات حقيقية                  |    ✅ (إضافة)\*    |      ❌       |     أحيانًا      |     ✅      |
| يلتقط السبات الصارم (`waitForTimeout`، `time.sleep`) |    ✅ (إضافة)\*    |      ❌       |     أحيانًا      |     ✅      |
| يجري في ثوانٍ، صفر نداءات شبكة أثناء الفحص           |         ✅         |      ✅       |        —         |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) و`eslint-plugin-playwright`
(`expect-expect`، `no-wait-for-timeout`) يغطيان ذلك لإطاريهما.

**التحليل التنفيذي** فئة منفصلة عن الـlint الثابت:

|                                              | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| -------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| يقرأ بيانات تشغيل حقيقية لأحكام `TRUE-FLAKE` |         جزئيًّا\*         |     جزئيًّا (tag)     |          ✅           |
| تقرير فرز التذبذب من سجل التنفيذ             |            ❌             |          ✅           |          ✅           |
| يتكامل مع درجة الجدارة الثابتة               |            ❌             |          ❌           |          ✅           |

\*Playwright يتتبع المحاولات داخليًا لكنه لا ينتج تقرير تذبذب مستقلًّا
بملصقات أحكام.

---

## 🤖 لماذا لا تكتفون بمراجعة الكود بالذكاء الاصطناعي؟

مشكلة مختلفة، طبقة مختلفة. المراجعة الآلية قد تلتقط تغيير اختبار مشبوهًا
في فرق؛ لكنها لا تثبت أن نظام التحقق ككل جدير بالثقة — وهي لا ترى إلا
الفرق الذي تريه لها.

|                               | مراجعة بالذكاء الاصطناعي (Copilot وغيره) |         **Mjölnir**         |
| ----------------------------- | :--------------------------------------: | :-------------------------: |
| الكلفة لكل فحص                |         رموز (تتدرج بحجم الفرق)          |   **صفر** (محلي، مثبَّت)    |
| يرى الطقم كله + كل إعدادات CI |           الفرق الذي تريه فقط            |     **كل شيء، كل مرة**      |
| حتمي (مدخل واحد → مخرج واحد)  |              ❌ (غير حتمي)               |           **✅**            |
| يلتقط أنماطًا راقدة أشهرًا    |          فقط إن وردت في السياق           |  **✅** (يفحص كل الملفات)   |
| يتذكر الاكتشافات بين الجولات  |        ❌ (لا ذاكرة عبر الجلسات)         |  **✅** (baseline + diff)   |
| يعمل دون استداء بشري          |            يحتاج PR أو موجهًا            | **✅** (خُطّاف CI، 3 ثوانٍ) |

**استخدم كليهما.** يلتقط الذكاء الاصطناعي الدقائق والقصد وعيوب التصميم
التي لا يعثر عليها أي regex. يلتقط Mjölnir الأنماط البنيوية التي يغفلها
الذكاء الاصطناعي لأنها تبدو «مقصودة» — `.only` مودعة، ورمز خروج مبتلع،
و`continue-on-error` على مهمة اختبار. ليست أخطاء تحتاج تفكيرًا؛ بل حقائق
تحتاج فحصًا.

---

## 🤖 تكامل CI

أمر واحد يولّد سير عمل PR — استشاري افتراضيًا، ولا يحجب أبدًا:

```bash
mjolnir ci install
```

أو اربطه أصلًا في GitHub Code Scanning عبر SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

إعداد المحرر والخط لـ SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### تغطية النطاق المتغيّر

`--scope changed` يسند الاكتشافات إلى الأسطر التي أضافها فرعك مقارنة
بنقطة دمج `main`. يغطي ملفات الاختبار (`*.spec.*`، `*.test.*`) زائد
ملفات أسيرات GitHub وإعدادات Playwright في الفرق. عندما يتعذّر فهم
نقطة الدمج — نسخة سطحية، HEAD منفصل، هدف بلا git، فرع افتراضي مختلف —
يتدهور بصدق: تعود الاكتشافات إلى الإسناد بملف كامل والتقرير يقول ذلك.
استبدل المرجع الأساس بـ `--base <ref>`.

---

## الإعداد

Mjölnir صفر إعداد. ملف `mjolnir.config.json` اختياري (أو `.mjolnir.json`)
في جذر المستودع يضبط الشدة والحجب والنطاق — لا يغيّر دلالات الكشف أبدًا.

| المفتاح             | النوع                                | الأثر                                                                                                                                        |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | أنماط تجاهل إضافية (مجموعة فرعية من gitignore)، فوق الافتراضيات المدمجة                                                                      |
| `gate`              | `"advisory" \| "error" \| "warning"` | أي شدّات تخرج برمز غير صفري (الافتراضي `error`؛ `advisory` لا يحجب أبدًا)                                                                    |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | يعيد ترتيب اكتشافات قاعدة لمستودعك                                                                                                           |
| `ignore`            | `IgnoreEntry[]`                      | يكتم الاكتشافات — **`reason` إلزامي**؛ تنتهي صلاحية المدخلات بعد 90 يومًا (تاريخ `expires` صريح، أو زمن آخر تعديل لملف الإعداد لمن لا يذكره) |
| `plugins`           | `string[]`                           | حزم قواعد من طرف ثالث (انظر [نموذج الثقة](#نموذج-الثقة))                                                                                     |

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

- **`.mjolnirignore`** — ملف بأسلوب gitignore بسيط لاستثناء المسارات،
  بنفس لهجة `exclude`. استخدمه للضجيج الخاص بالجهاز؛ واستخدم `exclude`
  عندما تعود القائمة للتحكم بالإصدارات إلى جانب بقية الإعداد.
- **تجاوزات سطر الأوامر** — `--strict` (تضمين قواعد الحجر الصحي)،
  `--width <cols>` و`--ascii` / `--no-ascii` (عرض الطرفية)،
  `--tone blunt` (رسائل أقسح)، `--max-duration <sec>` (فحص جزئي محدود).
- كتم القواعد ودورة إخراجها من الخدمة:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

مدخلات `ignore` تُغذّي أيضًا الأمر المستقل `mjolnir suppressions` الذي
يسرد ما هو مكتوم الآن ومتى تنتهي صلاحية كل مدخل.

---

## 📐 رموز الخروج والعقود

مجمَّدة — آمنة لبناء منطق CI فوقها:

| رمز الخروج | المعنى                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `0`        | نظيف — لا اكتشافات عند البوابة أو فوقها                                |
| `1`        | اكتشافات عند البوابة أو فوقها                                          |
| `2`        | فحص جزئي (نفدت ميزانية الوقت، ملفات غير قابلة للقراءة) — لا يحجب أبدًا |
| `10`       | خطأ استعمال (راية خاطئة، غياب هدف)                                     |
| `20`       | خطأ داخلي                                                              |

تقرير JSON/SARIF هو `schemaVersion: 1`. معرّفات القواعد
(`QA-<FAMILY>-NNN`) لا تتغير بعد الإطلاق ولا تُعاد استخدامها أبدًا.

---

## نموذج الثقة

- **Local-first** — صفر نداءات شبكة أثناء الفحص. قطعًا. صفر قياس عن بُعد.
- **لا برهان كاذب** — نقول «مجهول» قبل «متحقَّق منه». المستودع الفارغ
  يأخذ `score: null`، لا 100 مزوّرة.
- **صدق جزئي** — إذا قُطع التحليل قَصِرًا، يقول الناتج ذلك. لا «complete»
  أبدًا حين لا يكون.
- **جدار الإنذارات الكاذبة** — يعمل الكشف على رؤية كود خالية من
  التعليقات/النصوص (قواعد TypeScript تستخدم AST المترجم): النمط داخل
  تعليق نثري أو نص مثال توثيقي توثيق، لا اكتشاف.
- **مقيس، لا مُدَّعى** — فقط القواعد ذات معدل إنذارات كاذبة من كود OSS
  حقيقي تُشحن في الطبقات الرئيسية (انظر
  [كم من هذا مقيس](#كم-من-هذا-مقيس))؛ ذيل الفحص و`mjolnir rules --unmeasured`
  يخبرانك أيُّها أي.
- **الثقة بالإضافات** — الإضافات حزم npm معلنة تحت `"plugins"`.
  **لا غرفة رمل**: كود الإضافة يجري بكامل صلاحيات Node، النموذج نفسه
  لإضافات ESLint أو Vitest. بادئات معرّفات القواعد الأساسية محجوزة
  وتُرفض من الإضافات منعًا للانتحال.
- **قواعد خارجية محلية للمساحة** (مجلدية، صفر شبكة) — مجلد
  `mjolnir-rules/` بجوار هدف الفحص يحمّل قواعد مخصصة: ملفات JSON تعلن
  أنماط regex (لا يُنفَّذ كود)، ووحدات `.mjs`/`.js` تصدّر `rules` (ثقة
  Node كاملة، كالإضافات). القواعد الخارجية تحمل البيانات الوصفية للثقة
  نفسها كالأساسية؛ لا يمكنها أبدًا أن تُشحن في الطبقة الأساسية (الأساسية
  تشترط معدل إنذارات مقيسًا من ملف corpus الجانبي — التصريح بـ
  `tier: "core"` يُقصر إلى `extended`)، وتلتزم سقوف الطبقات وتُفحص ضد
  الانحراف: `mjolnir rules --md --external` يعرض الكتالوج من الملفات
  المحمّلة (المصدر `external`)، ومولّد المصفوفة يقبل `--external <root>`.

---

## 🏗️ المعمارية

<details>
<summary>فصّل الشجرة</summary>

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

- **القواعد دوال نقية** — `(SourceFileContext) → Finding[]`، بلا I/O،
  بلا متغيرات عامة. إضافة بيئة جديدة = مهايئ واحد + قواعده.
- **TypeScript/Playwright تستخدم AST المترجم** (ts-morph). Python وJava
  وC# تجري على طبقة regex مشتركة مع إخفاء التعليقات/النصوص.
- طبقة AST من tree-sitter WASM لـ Java وC# موجودة وهي خطوة الدقة التالية —
  لم تُوصَّل بعد إلى خط الفحص المتزامن.

---

## 📚 الوثائق

| المستند                                                | ما فيه                                    |
| ------------------------------------------------------ | ----------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | تطبيع الدرجة + ترجيح الأدلة               |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | معدلات الإنذارات الكاذبة المقيسة + المنهج |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | حالات القواعد، الكتم، الإخراج من الخدمة   |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | ناتج SARIF + إعداد المحرر/CI              |
| [docs/rules/](docs/rules/)                             | كتالوج مولَّد لكل قاعدة                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | تجهيز التطوير + مساهَمة العمل             |
| [CHANGELOG.md](CHANGELOG.md)                           | سجل الإصدارات                             |
| [SECURITY.md](SECURITY.md)                             | الإبلاغ عن الثغرات                        |

---

## 📈 الحالة

**v0.5.x · بيتا مفتوحة.** مخطط JSON ورموز الخروج عقود مجمَّدة. TypeScript
وPython لهما أوسع تغطية مقيسة؛ Java وC# أحدث — اقرأهما عبر
[جدول الطبقات](#طبقات-القواعد-ونضج-اللغات).

---

## 🤝 المساهمة

القواعد الجديدة أسهل مساهمة أولى — أمر واحد يهيكل القاعدة مع تجهيزاتها
must-fire **و**must-not-fire (القاعدة المولَّدة تفشل في تجهيزاتها عمدًا
حتى تنفّذ كشفًا حقيقيًا — الهيكل الفارغ لا يُشحن):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

التجهيز التطويري الكامل، وأوامر البوابة الدائمة، وقوانين منع التوسع /
جدار التجهيزات في [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**كفّوا عن شحن اختبارات لا تثقون بها.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

بُني على يد [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
