<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. הבדיקות אומרות לך מה עבר. Mjölnir אומר לך על מה אפשר לסמוך." width="100%" />

<br />

Mjölnir מוצא בדיקות שלא יכולות להיכשל וצינורות CI שלא יכולים להאדים,<br />
ואז מדרג עד כמה אפשר לסמוך על התוצאה, עם הראיה לכל נקודה.

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

[ראו את זה עובד](#ראו-את-זה-עובד) · [התחלה מהירה](#התחלה-מהירה) · [מה הוא מוצא](#מה-mjölnir-מוצא) · [ציון](#ציון-הראוּיוּת) · [ראיות](#מודל-הראיות) · [ניתוח ריצות](#ניתוח-ריצות-בדיקה) · [CI](#שלמות-ci) · [סוכנים](#סוכני-ai) · [אבטחה](#אמון-ואבטחה) · [מגבלות](#מה-mjölnir-לא-יכול-להגיד-לכם) · [תיעוד](#תיעוד)

<details>
<summary>לקריאה בשפה אחרת — 22 תרגומים</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | עברית | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-26.

<!-- Source hash: `de04dfb1677b` -->

</details>

</div>

<br />

## Release status (English canonical)

The published line is `3.0.0`; this working tree is the `4.0.0-rc.1`
candidate. `3.0.0` must not be republished or retagged. The M26–M50 program is
tracked in
[`docs/ROADMAP.yaml`](docs/ROADMAP.yaml); provisional capability contracts
are not automatically enabled or certified. Repository-owned checks pass, but
Trust certification remains `NOT_CERTIFIED` until the protected holdout,
real-world, platform/consumer, remote-workflow, support-matrix, and corpus
evidence gates pass. Run `npm run m26:readiness` before treating any candidate
as releasable. This document does not publish a tag or authorize a release.

> Machine-assisted canonical text. Translate this block before treating it as localized copy.

## וי ירוק הוא טענה, לא הוכחה

וי ירוק אומר שהצינור לא נכשל. הוא לא אומר שהבדיקות רצו, או שהן יכלו להיכשל. כל אחד מאלה עובר בירוק:

- ‏`.only` שנשאר ב-commit והריץ 3 בדיקות במקום 900
- ‏`continue-on-error: true` על ה-job שהיה אמור לחסום
- ‏`|| true` אחרי פקודת הבדיקות
- בדיקה שלא בודקת כלום, או שגוף הבדיקה שלה ריק
- עטיפת retry שהופכת כישלון אמיתי להצלחה מקרית
- דוח שה-workflow מעלה אבל אף פעם לא יצר
- ‏sleep קבוע שמחזיק מצב מרוץ

אף אחד מהם לא צובע את הצינור באדום, וכל אחד נראה מכוון בסקירת קוד. בגלל זה הם שורדים. הנה Mjölnir קורא מקרה אמיתי:

<p align="center">
  <img src="assets/readme/scan.svg" alt="ה-workflow של ה-CI במאגר ההדגמה, נקרא שורה אחר שורה. Mjölnir מסמן כל ממצא בשורה שדווחה, עם הכלל, מה לא תקין, רמת הראיה ושיעור ה-false positives הנמדד שלו." width="800" />
</p>

<sub>כל ממצא שסריקת ההדגמה דיווחה עבור ה-workflow הזה, בשורה שדווחה. נוצר על ידי `npm run docs:readme-brand` מתוך [`demo-report.json`](assets/readme/demo-report.json) ונעול מפני סטייה ב-CI.</sub>

**מצב קפדני.** הגילויים התוקפניים ביותר — `.only`, `continue-on-error`, בדיקות ריקות, ניצול חוזר לרעה — חיים בשכבה בהסגר. הם פועלים רק תחת `--strict` ומוגבלים לחומרת `info`: הם מסמנים, אף פעם לא חוסמים. הסריקה ברירת המחדל (`npx mjolnir-qa@3.0.0` ללא `--strict`) מכסה רק כללים בסיסיים ומורחבים. הוסף `--strict` כשאתה רוצה גם את שכבת הייעוץ.

Mjölnir קורא את חבילת הבדיקות, את ה-workflows של ה-CI, ואם יש לכם, גם את הדוח של ריצה אמיתית. הוא לא מריץ את הבדיקות שלכם, לא מתקין תלויות ולא מריץ את הקוד שהוא סורק. וכשאין לו ראיות, הוא אומר את זה במקום להמציא ביטחון:

| מצב                                       | מה Mjölnir מדווח                                      |
| ----------------------------------------- | ----------------------------------------------------- |
| לא נמצאו הצהרות בדיקה                     | ציון `null`, מוצג כ-**UNKNOWN**. אף פעם לא 100 מומצא. |
| אין baseline או גרסה ברת השוואה           | **UNKNOWN**, עם הסיבה. אף פעם לא 0 משוער.             |
| הסריקה נקטעה (תקציב זמן, קבצים לא קריאים) | **PARTIAL**, יציאה `2`. אף פעם לא מוצג כנקי.          |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="איך Mjölnir עובד. הוא קורא באופן סטטי את חבילת הבדיקות ואת צינור ה-CI, וגם את הדוח של ריצה אמיתית כשיש כזה. הוא משקלל כל ממצא לפי רמת הראיה ורמת האמון שלו, כשרק ריצה אמיתית יכולה להגיע ל-L3 עד L5, ומפיק ממצאים, ציון ראוּיוּת ושער CI עם קודי יציאה קפואים. בלולאת הסוכן, ה-AI כותב את התיקון ו-Mjölnir סורק שוב כדי להוכיח אותו." width="880" />
</p>

<sub>עוצב עבור הדף הזה ומוצג ביחס 1:1. נוצר על ידי `npm run docs:readme-brand` ונעול מפני סטייה ב-CI; הציון, הספירות ומזהה הכלל מגיעים מ-[`script.demo.json`](assets/video/script.demo.json), מ-[`demo-report.json`](assets/readme/demo-report.json) ומרישום הכללים, ואף פעם לא מוקלדים ידנית. אותה תמונה כפוסטר: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## ראו את זה עובד

סריקה אמיתית של [`examples/demo-repo`](examples/demo-repo), חבילת Playwright קטנה עם workflow של CI. לכאן הלכו הנקודות שלה:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="פירוט הניכויים של Mjölnir: WORTHINESS 80/100 WORTHY, הציון לפי קטגוריה, תיבת הניכויים לפי חומרה ורשימת FIX THIS FIRST" width="520" />
</p>

<sub>נוצר על ידי `npm run docs:hero` מסריקה אמיתית ונעול מפני סטייה ב-CI. דוח ה-`--verbose` המלא של אותה סריקה הוא [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>צפו בזה</strong> — סריקה, התיקון שהיא מדפיסה, והסריקה החוזרת שמוכיחה אותו</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="פריים מהקלטת ההדגמה: npx mjolnir-qa@3.0.0 סורק את מאגר ההדגמה בחלון טרמינל" width="900" />
  </a>
</p>

<sub>רונדר פריים אחר פריים מסריקה אמיתית על ידי `npm run docs:video`; אף פעם לא הוקלט מהמסך. בחרו בפריים כדי לפתוח את [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### ממצא אחד, מקרוב

כל ממצא עונה על ארבע שאלות: איפה הוא, כמה Mjölnir בטוח, באיזו תדירות הכלל טועה, ואיך מתקנים.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="הממצא הראשון של סריקת ההדגמה, בדיוק כפי שהטרמינל מדפיס אותו, עם ארבעת החלקים שלו מסומנים: איפה, כמה בטוח, באיזו תדירות הכלל טועה, והתיקון." width="100%" />
</p>

‏`mjolnir explain QA-CI-001` מדפיס את תיק האמון המלא של כלל, כולל שיעור ה-false positives הנמדד שלו וה-tier שהשיעור הזה זיכה אותו בו:

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

זו יחידת הערך: מקום אחד שבו ה-CI מדווח על הצלחה שהוא לא הרוויח.

<br />

## התחלה מהירה

```bash
npx mjolnir-qa@3.0.0
```

הוא סורק את התיקייה הנוכחית ומדפיס את ה-Trust Report: מה נמצא, עד כמה אפשר לסמוך על זה, למה, ומה לעשות הלאה. הוא יוצא עם `0` כשלא נמצא דבר ברמת השער או מעליה.

ב-CI, סרקו רק את מה שהענף הכניס, כדי שחבילת בדיקות ישנה לא תטביע את ה-pull request הראשון שלכם:

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

‏`mjolnir ci install` כותב את זה כ-workflow של GitHub Actions, עם ה-[action](https://github.com/Sergey-Bar/Mjolnir#readme) מקובע לתגית הראשית `v3` (או `npx` רגיל עם `--no-action`). הוא נשאר מייעץ עד שתחליטו שהוא צריך לחסום.

| פקודה                                         | מה היא עושה                                        |
| --------------------------------------------- | -------------------------------------------------- |
| `mjolnir`                                     | ‏Trust Report: פסק דין, רמת ביטחון, הצעד הבא       |
| `mjolnir --scope changed`                     | רק מה שהענף שלכם הכניס (הצורה ל-CI)                |
| `mjolnir ci install`                          | יוצר את ה-workflow המייעץ ל-PR (מבוסס action)      |
| `mjolnir business-case`                       | ROI estimate: projected savings per finding        |
| `mjolnir release-report`                      | Release readiness: GO, CONDITIONAL GO, or NO-GO    |
| `mjolnir release-trust`                       | 12-dimension release assurance verdict             |
| `mjolnir report`                              | Generate a Playwright-compatible report            |
| `mjolnir trend`                               | Record, show, or diff local quality snapshots      |
| `mjolnir policy`                              | Initialize, validate, or check policy gates        |
| `mjolnir quarantine`                          | Review deterministic proposals (prototype)         |
| `mjolnir analyze --cross-file`                | Bounded cross-file analysis                        |
| `mjolnir ci-adapter github .`                 | Generate CI templates for supported providers      |
| `mjolnir dashboard`                           | Generate a self-contained quality dashboard        |
| `mjolnir exec-report`                         | Executive KPIs and recommendations (advisory)      |
| `mjolnir enterprise`                          | Self-hosted templates (prototype)                  |
| `mjolnir maturity`                            | Assess maturity or display maturity levels         |
| `mjolnir mutation tests/mutation-report.json` | Analyze mutation reports; never promotes trust     |
| `mjolnir mcp`                                 | Read-only MCP tools over stdio                     |
| `mjolnir explain QA-CI-001`                   | מה, למה ואיך מתקנים, וגם שיעור ה-FP הנמדד          |
| `mjolnir why src/a.spec.ts:42`                | למה סומנה בדיוק השורה הזו. אף פעם לא חוסם.         |
| `mjolnir forensics ./test-results/`           | ראיות זמן ריצה מריצה אמיתית                        |
| `mjolnir trust-report`                        | ‏Trust Artifact עצמאי (md + json)                  |
| `mjolnir handoff`                             | תוכנית תיקון לסוכן קוד                             |
| `mjolnir --json` / `--format sarif`           | פלט קריא למכונה, GitHub Code Scanning              |
| `mjolnir --format codequality`                | דוח GitLab Code Quality (ארטיפקט לווידג'ט של ה-MR) |
| `mjolnir --strict`                            | מריץ גם כללים ברמת quarantine (סיכון FP גבוה יותר) |

<details>
<summary><strong>כל שאר הפקודות</strong> — מיון בדיקות לא יציבות, דיווח, ממשל</summary>

<br />

| פקודה                               | מה היא עושה                                                             |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `mjolnir --classic`                 | באנר הציון מלפני ה-Trust Report                                         |
| `mjolnir explain verdict`           | למה פסק הדין של הסריקה השמורה הוא מה שהוא                               |
| `mjolnir triage ./test-results/`    | מיון מודרך. כל שורה מסתיימת בצעד הבא.                                   |
| `mjolnir pw-report ./test-results/` | סיכום ריצת Playwright: ניסיונות חוזרים, בדיקות לא יציבות, האיטיות ביותר |
| `mjolnir doctor:playwright`         | סריקה עמוקה ל-Playwright בלבד, וגם Selector Health Score                |
| `mjolnir fix --dry-run` / `fix`     | תיקונים אוטומטיים בטוחים, כל אחד נסרק מחדש כדי להוכיח שהוא נקלט         |
| `mjolnir baseline` / `diff`         | צילום מצב של הממצאים, ואז דיווח רק על חדשים או מחמירים                  |
| `mjolnir impact --since <ref>`      | מה commit הכניס ומה הוא פתר                                             |
| `mjolnir summary`                   | הערות CI וסיכום step מתוך דוח                                           |
| `mjolnir pr-comment`                | הערת PR ממוקדת, ב-Markdown                                              |
| `mjolnir debt`                      | מרשם חוב בדיקות עם מודל עלויות                                          |
| `mjolnir handover`                  | מפת היכרות עם החבילה למהנדס QA חדש                                      |
| `mjolnir init`                      | מזהה frameworks ומדפיס רשימת הגדרה                                      |
| `mjolnir suppressions`              | מפרט ממצאים מושתקים, לצורכי ממשל                                        |
| `mjolnir rules --unmeasured`        | הכללים שרצים על הנחה ולא על מדידה                                       |
| `mjolnir rules --md`                | קטלוג כללים מלא (JSON או Markdown)                                      |
| `mjolnir doctor`                    | ביקורת עצמית של בסיס הכללים של Mjölnir עצמו                             |
| `mjolnir create-rule <ID>`          | יוצר שלד לכלל חדש ול-fixtures שלו                                       |
| `mjolnir stats`                     | מונים מקומיים של כל התיקונים שנראו אי פעם                               |
| `mjolnir badge`                     | ‏JSON ל-endpoint של shields.io וקטע קוד                                 |
| `mjolnir --cache`                   | סריקות חוזרות אינקרמנטליות בעזרת מטמון פסקי דין מקומי                   |
| `mjolnir --format mermaid`          | דיאגרמת ארכיטקטורת בדיקות להערת PR                                      |

‏`mjolnir help <command>` מדפיס שימוש, דוגמאות והצעד הבא לכל אחת מהן.

</details>

דורש **Node.js ≥ 22.18** על Windows, macOS או Linux. מעדיפים התקנה גלובלית? `npm i -g mjolnir-qa`. הרף הזה מגיע משרשרת הבנייה (tsdown מכוון אליו וצינור השחרור מריץ מולו בדיקות עשן); תלויות זמן הריצה לא צריכות יותר מזה.

<br />

## מה Mjölnir מוצא

<p align="center">
  <img src="assets/readme/stack.svg" alt="עובד עם הסטאק שלכם: השפות, ה-frameworks של הבדיקות ומערכות ה-CI שהכללים שלו מכסים, מתוך רישום הכללים." width="100%" />
</p>

**79 כללים** בארבע משפחות — היגיינת בדיקות, איכות בדיקות, Playwright ושלמות CI — עבור TypeScript ו-JavaScript, Python, Java, C# ו-YAML של GitHub Actions. הם מכסים את Playwright בכל ארבעת ה-bindings, וגם pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest ו-Mocha, עם כיסוי ראשוני ל-Cypress ול-Selenium. תשעה מהם, כדי להראות את הצורה:

| ID           | כלל                                                                  | חומרה   | רמה        |
| ------------ | -------------------------------------------------------------------- | ------- | ---------- |
| QA-CI-001    | ‏`continue-on-error` מסתיר שער אימות שנכשל                           | error   | quarantine |
| QA-CI-009    | קוד היציאה של הבדיקות לא מועבר הלאה (`\|` בלי pipefail, שרשראות `;`) | error   | extended   |
| QA-TEST-001  | בדיקה ממוקדת נשארה ב-commit (`.only`, `fit`)                         | error   | quarantine |
| QA-TEST-003  | בדיקה בלי assertions                                                 | error   | quarantine |
| QA-TQUAL-009 | ‏assertion על promise בלי await                                      | error   | quarantine |
| QA-PW-002    | ‏assertion על locator בלי await                                      | error   | core       |
| QA-PW-004    | סלקטורים שבירים של CSS/XPath                                         | warning | quarantine |
| QA-PY-002    | בדיקה מדולגת (`skip`, `xfail` לא קפדני)                              | warning | core       |
| QA-CS-103    | מתודת בדיקה בלי assertions                                           | error   | core       |

הקטלוג המלא נוצר מהרישום ואף פעם לא מתוחזק ידנית: `mjolnir rules --md`, [`docs/rules/`](docs/rules/), או [המדריך למה שהוא בודק](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>כל כלל שמוזכר ב-README הזה</strong>, בטבלה אחת</summary>

<br />

> כללי `quarantine` רצים רק תחת `--strict` ואף פעם לא חוסמים (הם מוגבלים ל-info). החומרה המוצגת היא החומרה שהמחבר קבע.

| ID           | משפחה      | כלל                                                       | חומרה   | רמה        |
| ------------ | ---------- | --------------------------------------------------------- | ------- | ---------- |
| QA-TEST-001  | היגיינה    | בדיקה ממוקדת נשארה ב-commit (`.only`, `fit`)              | error   | quarantine |
| QA-TEST-002  | היגיינה    | בדיקה מדולגת. עולה ל-`error` בלי סיבה מתועדת.             | warning | quarantine |
| QA-TEST-003  | היגיינה    | בדיקה בלי assertions                                      | error   | quarantine |
| QA-TEST-004  | היגיינה    | ‏sleep קבוע (`waitForTimeout`, `sleep()`, `delay()`)      | warning | extended   |
| QA-TEST-006  | היגיינה    | שימוש לרעה ב-retry שמסתיר חוסר יציבות                     | warning | quarantine |
| QA-TEST-010  | היגיינה    | גוף בדיקה ריק                                             | error   | quarantine |
| QA-TQUAL-002 | איכות      | ‏assertion טאוטולוגי                                      | error   | quarantine |
| QA-TQUAL-009 | איכות      | ‏assertion על promise בלי await                           | error   | quarantine |
| QA-TQUAL-011 | איכות      | בדיקות בהערה                                              | warning | extended   |
| QA-PW-002    | Playwright | ‏assertion על locator בלי await                           | error   | core       |
| QA-PW-003    | Playwright | ‏`page.pause()` / `test.only()` נשארו ב-commit            | error   | core       |
| QA-PW-004    | Playwright | סלקטורים שבירים של CSS/XPath                              | warning | quarantine |
| QA-PW-123    | Playwright | כתובות URL של סביבות מקודדות בקוד                         | warning | quarantine |
| QA-PW-140    | Playwright | צילום מסך בלי `maxDiffPixelRatio`                         | warning | core       |
| QA-CI-001    | CI         | ‏`continue-on-error` מסתיר שער שנכשל                      | error   | quarantine |
| QA-CI-002    | CI         | ‏`\|\| true` בולע קודי יציאה                              | error   | extended   |
| QA-CI-005    | CI         | דוח נצרך אבל אף פעם לא נוצר                               | error   | quarantine |
| QA-CI-007    | CI         | עטיפות retry סביב בדיקות                                  | warning | extended   |
| QA-CI-008    | CI         | ‏step שתמיד מצליח מסתיר כישלונות                          | error   | quarantine |
| QA-CI-009    | CI         | קוד היציאה לא מועבר הלאה (`\|` בלי pipefail, שרשראות `;`) | error   | extended   |
| QA-CI-010    | CI         | בדיקות מדולגות בדיוק איפה שהן חייבות לחסום                | error   | quarantine |
| QA-PY-002    | Python     | בדיקה מדולגת (`skip`, `xfail` לא קפדני)                   | warning | core       |
| QA-PY-003    | Python     | פונקציית בדיקה בלי assertions                             | error   | quarantine |
| QA-PY-005    | Python     | ‏`time.sleep()` בבדיקות                                   | warning | extended   |
| QA-PY-012    | Python     | ‏assertion טאוטולוגי                                      | error   | quarantine |
| QA-JV-101    | Java       | בדיקה מושבתת (`@Disabled`)                                | warning | core       |
| QA-JV-102    | Java       | ‏sleep קבוע (`Thread.sleep()`)                            | warning | extended   |
| QA-JV-103    | Java       | מתודת בדיקה בלי assertions                                | error   | extended   |
| QA-JV-105    | Java       | ‏sleep קבוע עם `waitForTimeout()` של Playwright           | warning | core       |
| QA-JV-106    | Java       | סלקטור שביר במקום locator מבוסס תפקיד                     | warning | quarantine |
| QA-CS-101    | C#         | בדיקה מדולגת (`[Ignore]`, `[Fact(Skip=)]`)                | warning | core       |
| QA-CS-102    | C#         | ‏sleep קבוע (`Thread.Sleep` / `Task.Delay`)               | warning | core       |
| QA-CS-103    | C#         | מתודת בדיקה בלי assertions                                | error   | core       |
| QA-CS-105    | C#         | ‏sleep קבוע עם `WaitForTimeoutAsync()`                    | warning | extended   |
| QA-CS-106    | C#         | סלקטור שביר במקום locator מבוסס תפקיד                     | warning | quarantine |

ל-Python יש גם את QA-PY-001…012 (היגיינת pytest) ואת QA-PY-101…108 (Playwright ל-Python). ל-Cypress ול-Selenium יש ערכות פתיחה של שלושה כללים כל אחת.

</details>

כל כלל יוצא עם fixture של must-fire **וגם** של must-not-fire, וכלל שמופעל על ה-fixture השלילי של עצמו לא יכול לצאת. זה חומת האש נגד false positives; `mjolnir doctor` אוכף אותה ב-CI של המאגר הזה עצמו.

### Selector Health Score

‏`mjolnir doctor:playwright` מדרג כל locator לפי האופן שבו הוא מוצא אלמנט: כמו שמשתמש היה מוצא (תפקיד, תווית, טקסט), דרך חוזה מפורש (`data-testid`), או במקרה מבני (שרשראות CSS, XPath). כל קובץ מקבל ציון מ-0 עד 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

זה מודד **עמידות, לא נכונות**. `.btn.btn-primary > div:nth-child(2)` עובר היום וימשיך לעבור עד שמישהו ייגע ב-markup. ציון נמוך אף פעם לא טוען שהבדיקה שבורה, רק שהיא תלויה ב-markup שאף אחד לא הבטיח לשמור.

<br />

## ציון הראוּיוּת

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="סולם הראוּיוּת מ-0 עד 100, עם סמן שעובר על כל ציון: UNWORTHY מתחת ל-50, NEEDS WORK מ-50 עד 79, WORTHY מ-80 עד 99, FORGED ב-100" width="720" />
</p>

<sub>כל ציון מ-0 עד 100, ממוקם על ידי `deriveScoreState` האמיתי. נוצר על ידי `npm run docs:gauge` ונעול מפני סטייה ב-CI.</sub>

| ציון      | פסק דין                            |
| --------- | ---------------------------------- |
| `0 – 49`  | **UNWORTHY**                       |
| `50 – 79` | **NEEDS WORK**                     |
| `80 – 99` | **WORTHY**                         |
| `100`     | **FORGED**                         |
| `null`    | **UNKNOWN**: לא נמצאו הצהרות בדיקה |

**איך הוא מחושב.** החומרה קובעת ניכוי בסיס (`error −8`, `warning −3`, `info −1`) ורמת הראיה מקטינה אותו: E2 נספר במלואו, E1 בחצי (מעוגל כלפי מטה), E0 בכלל לא. הסכום מנורמל לפי החשיפה של החבילה, כלומר ניכויים לכל הצהרת בדיקה ולא לכל קובץ. הטרמינל מדפיס את אותם מספרים מוקטנים שהציון השתמש בהם; אין מודל שני נסתר. פרטים: [docs/SCORING.md](docs/SCORING.md) ו[מדריך הציון](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**מה 100 לא אומר.** הוא לא אומר שהתוכנה נכונה, שהחבילה מספקת או שהמוצר נקי מתקלות. הוא אומר דבר אחד: **אף אחד מהכללים ש-Mjölnir הפעיל לא הניב ניכוי בסריקה הזו ובמודל הראיות הזה.**

<br />

## מודל הראיות

כל ממצא נושא שתי תוויות: כמה Mjölnir בטוח, ועד כמה הממצא נבדק. זה ההבדל בין כלי שמדווח על דפוסים לבין כלי שאפשר להתנות בו שחרור גרסה.

**כמה בטוח — רמת הראיה.**

| רמה    | שם                | משמעות                              | ניכוי |
| ------ | ----------------- | ----------------------------------- | ----- |
| **E2** | הוכחה דטרמיניסטית | הפגם קיים בקוד כפי שהוא כתוב        | מלא   |
| **E1** | ראיה מדפוס        | נמצאה התאמה לדפוס שקשור בחוזקה לפגם | חצי   |
| **E0** | תצפית             | שווה לדעת. לא טענה שמשהו לא בסדר.   | אפס   |

ביטחון בזיהוי הוא לא חוזק ההוכחה. כלל יכול להיות בטוח שמצא את מה שחיפש ועדיין להסתכל על היוריסטיקה. ממצאי E1 נועדו לקריאה ולשיקול דעת, אף פעם לא ליישום עיוור, והגבול הזה מוטבע על הממצא בטרמינל, ב-JSON ובמסירה לסוכן.

**עד כמה נבדק — רמת האמון.** רוב הממצאים מגיעים מקריאת הקוד שלכם. תנו ל-Mjölnir את הדוח של ריצת בדיקות אמיתית, והוא יוכל לאשר שהקוד באמת רץ.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="סולם האמון מ-L0 עד L5. ‏L0 עד L2 מגיעים מקריאת הקוד; L3 עד L5 דורשים דוח ריצה אמיתי, מה שמסומן בשבר בסולם." width="100%" />
</p>

| רמה    | במילים פשוטות  | מה זה דורש                             |
| ------ | -------------- | -------------------------------------- |
| **L0** | נרשם           | קריאת הקוד                             |
| **L1** | נראה כמו הבעיה | קריאת הקוד: דפוס תאם                   |
| **L2** | הוכח בקוד      | קריאת הקוד: הפגם מבני                  |
| **L3** | הקובץ רץ       | דוח ריצה מראה שהקובץ של הממצא הורץ     |
| **L4** | הבדיקה רצה     | דוח ריצה מראה שהבדיקה של הממצא הורצה   |
| **L5** | הריצה מסכימה   | התוצאה של הריצה עצמה מאשרת את סוג הפגם |

סריקה סטטית נעצרת ב-L2. רק דוח ריצה אמיתי (Playwright JSON, Jest או Vitest JSON, JUnit XML) יכול להעלות ממצא ל-L3 ומעלה, כך שממצא שאף פעם לא נראה רץ לעולם לא יכול לטעון שהוא רץ. הגדרות: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### כמה מזה נמדד

**ל-74 מתוך 79 כללים יש שיעור false positives שנמדד מול קוד OSS אמיתי** (לפחות 10 ממצאים שסווגו ידנית לכל אחד; ראו [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). ‏5 האחרים יוצאים על סמך הערכת המחבר ואומרים את זה, כלל אחר כלל, ב-`mjolnir explain`. `mjolnir rules --unmeasured` מפרט אותם, והתחתית של כל סריקה מדווחת כמה מהכללים ש*הופעלו* בפועל נמדדו.

השיעורים נשארים פומביים גם כשהם גרועים. QA-TEST-001 (‏`.only` שנשאר ב-commit) יוצא רע בביקורת על מאגרים אמיתיים ולכן יושב ב-quarantine. המספר העדכני לכל כלל, כולל QA-PW-141, נמצא בביקורת.

### רמות האמון של הכללים

הרמות נקבעות לפי שיעור ה-false positives הנמדד, לא לפי דעה:

| רמה            | ‏FP נמדד               | התנהגות                                     |
| -------------- | ---------------------- | ------------------------------------------- |
| **core**       | ≤ 10%                  | דוח ברירת מחדל, חוסם                        |
| **extended**   | ≤ 30%                  | דוח ברירת מחדל, ביטחון נמוך יותר            |
| **quarantine** | > 30% או שהוצהר במפורש | רק `--strict`, מוגבל ל-info, אף פעם לא חוסם |
| _לא נמדד_      | n < 10                 | לא יכול לעלות ל-core עד שנמדד               |

רצועות FP יכולות רק להוריד רמה — הן אף פעם לא מקדמות כלל מתוך `quarantine` אם הוא הוצהר שם במפורש. כלל שהוכנס במפורש ל-quarantine נשאר ב-quarantine ללא קשר לשיעור ה-FP הנמדד שלו.

קידום, הורדה ובשלות לפי שפה: [מחזור החיים של הכללים](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### למה זה לא linter

‏Linters אומרים לכם אם הקוד מציית לכללים. Mjölnir אומר לכם אם אפשר לסמוך על האימות שלכם.

|                                                              | ‏Linters ‏(ESLint, SonarQube) | כלי כיסוי | סקירת קוד ב-AI |   **Mjölnir**   |
| ------------------------------------------------------------ | :---------------------------: | :-------: | :------------: | :-------------: |
| מדרג את **מערכת האימות**, לא את קוד המוצר                    |              לא               |    לא     |       לא       |       כן        |
| שלמות ה-workflows של ה-CI (`continue-on-error`, `\|\| true`) |              לא               |    לא     |   רק ה-diff    |       כן        |
| מדרג את עמידות ה-locators של Playwright ‏(Selector Health)   |              לא               |    לא     |       לא       |       כן        |
| קורא נתוני ריצה אמיתיים לפסקי דין `TRUE-FLAKE`               |              לא               |    לא     |       לא       |       כן        |
| מפרסם שיעור false positives נמדד לכל כלל                     |              לא               |    לא     |       לא       |       כן        |
| מסמן בדיקות בלי assertions                                   |             כן\*              |    לא     |     לפעמים     |       כן        |
| תופס sleep קבוע (`waitForTimeout`, `time.sleep`)             |             כן\*              |    לא     |     לפעמים     |       כן        |
| דטרמיניסטי (אותו קלט, אותו פלט)                              |              כן               |    כן     |       לא       |       כן        |
| עלות לסריקה                                                  |             חינם              |   חינם    |     טוקנים     | **אפס** (מקומי) |

<sub>\*מכוסה על ידי `eslint-plugin-jest` ו-`eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) ועל ידי כללי ה-assertions של SonarQube עצמו. העמודות מתארות את התנהגות ברירת המחדל באימות חבילות בדיקות; תוספים, תוכניות בתשלום וכללים מותאמים משנים חלק מהתשובות. זה סיכום מיצוב, לא benchmark.</sub>

השתמשו גם בסקירת AI. היא תופסת ניואנסים, כוונה ופגמי תכנון שאף דפוס לא ימצא. Mjölnir תופס את מה שסקירת AI מפספסת כי זה נראה מכוון: `.only` שנשאר ב-commit, קוד יציאה שנבלע, `continue-on-error` על job של בדיקות. אלה דורשים סריקה, לא הסקה.

<br />

## ניתוח ריצות בדיקה

ניתוח סטטי מסיק מסקנות על קוד שאף פעם לא רץ. ניתוח הריצות קורא את מה שקרה בפועל: Playwright JSON, ‏Jest JSON, ‏Vitest JSON ו-JUnit XML מכל runner.

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

‏`TRUE-FLAKE` לא אומר שהבדיקה הורצה שוב. הוא אומר שהבדיקה **נכשלה בניסיון אחד לפחות ואז הסתיימה בירוק**: הצלחה מקרית, שמסומנת לא משנה מה אומר הווי הסופי. `mjolnir triage` הופך את ההיסטוריה הזו להצעת הסגר, ו-`mjolnir pw-report` מסכם ריצה. אותם דוחות ריצה הם שמעלים ממצאים לרמות האמון L3 ומעלה.

<br />

## שלמות CI

בדיקה יכולה לעבור בזמן שהצינור סביבה לא יכול להיכשל. Mjölnir קורא גם את ה-workflows: `continue-on-error`, `|| true`, קודי יציאה שאף פעם לא מועברים הלאה, steps שתמיד מצליחים, דוחות שנצרכים אבל אף פעם לא נוצרים, ושערים שמדולגים בדיוק באירועים שאמורים לחסום. כל ממצא מציין את ה-job, ה-step והשורה, ונושא רמת ראיה משלו.

צרו את ה-workflow ל-PR, מייעץ כברירת מחדל:

```bash
mjolnir ci install
```

או הוסיפו את ה-action מה-Marketplace ל-workflow שכבר יש לכם:

```yaml
- uses: Sergey-Bar/Mjolnir@v3
  with:
    scope: changed
    fail-on: error
```

קבעו את `@v3` כדי לעקוב אחרי הקו הראשי, או תגית מדויקת (`@v0.5.32`) לשער שניתן לשחזר. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) מכסה את ה-Marketplace, את Smithery ואת רישומי ה-MCP.

כדי להכניס ממצאים ל-GitHub Code Scanning, העלו SARIF (דורש `security-events: write` ברמת workflow או job):

```yaml
- run: npx mjolnir-qa@3.0.0 --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

ב-GitLab, ‏`--format codequality` כותב את דוח ה-Code Quality שהווידג'ט של ה-MR וההערות על ה-diff קוראים ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). הגדרת עורך וצינור: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### ייחוס בהיקף השינויים

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

ממצאים מיוחסים לשורות שהענף שלכם הוסיף, ביחס ל-**merge-base**. ההיקף הוא אותה קבוצת קבצים שסריקה מלאה מגלה (קבצי spec של TS/JS ותצורות adapter, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), וגם שינויים שלא בוצע להם commit ושאינם במעקב, כך שזה עובד עוד לפני ה-commit. הבסיס נקבע בסדר `main → master → origin/main → origin/master → origin/HEAD`; אפשר לדרוס אותו עם `--base <ref>`.

כשאי אפשר לקבוע את ה-merge-base (שכפול רדוד, HEAD מנותק, יעד מחוץ ל-git), הממצאים חוזרים לייחוס לקובץ שלם **והדוח אומר זאת.** נסיגה שקטה הייתה בדיוק סוג הפגם שהכלי הזה קיים כדי לתפוס.

<br />

## סוכני AI

ממצאים שווים משהו רק אם משהו פועל לפיהם.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**ה-AI כותב את התיקון. Mjölnir מאמת אותו.** ההוכחה מגיעה מהסריקה החוזרת, אף פעם לא מהדיווח של הסוכן עצמו על הצלחה.

| פקודה             | מה הסוכן מקבל                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | שרת [MCP](https://modelcontextprotocol.io) מעל stdio. ‏`scan`, `explain` ו-`diff` הופכים לכלים שאפשר לקרוא להם.                    |
| `mjolnir handoff` | דוח `--json` שמור הופך לתוכנית Markdown דטרמיניסטית: מה זוהה, גבול הראיה לכל ממצא, מה **אסור** שישתנה, ואיך מאמתים.                |
| `mjolnir install` | כותב אל משטחי הסוכנים שכבר יש במאגר שלכם (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`), כך שהסוכן סורק שוב לפני שהוא טוען שסיים. |

הוסיפו אותו ללקוח שמגיע עם CLI משלו:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@3.0.0 mcp
```

או לכל לקוח שמקבל בלוק `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@3.0.0", "mcp"] }
  }
}
```

**מעקה הבטיחות חשוב יותר מהנוחות.** כל ממצא במסירה נושא את הגבול שלו. **E2** אומר _דטרמיניסטי: בדקו את המיקום והחילו את התיקון_. **E1** אומר _נדרש אישור: התצפית לבדה לא מוכיחה את הפגם_. סוכן שמתקן E1 בעיוורון, משתיק כלל או עורך כלל כדי להעלות את הציון עושה בדיוק את מה שהכלי הזה קיים כדי לתפוס, ולכן המסירה אומרת זאת בפרומפט, ליד הממצא.

<br />

## אמון ואבטחה

**מקומי קודם כול, אפס טלמטריה.** אין שום API עם יכולת רשת (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) בשום מקום ב-`src/`, ו-[`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) מכשיל את הבנייה אם מופיע כזה. הוא גם אוסר על `eval` ועל `new Function`. סריקת קוד לא מהימן אף פעם לא מריצה אותו: ניתוח סטטי קורא טקסט מקור, וניתוח הריצות מפענח קובצי דוח שכבר קיימים בדיסק.

שתי הסתייגויות: `npx` עצמו מוריד את החבילה לפני שמשהו רץ, והערבות מכסה את `src/`, לא תוספים של צד שלישי.

**תוספים לא רצים בארגז חול.** תוספי JS (`mjolnir-rules/*.mjs`, או חבילות npm שמופיעות תחת `"plugins"`) רצים עם הרשאות Node מלאות, אותו מודל אמון כמו תוספים של ESLint או Vitest. טעינתם דורשת הסכמה מפורשת **בכל סריקה**: בלי `--enable-plugins` (או `MJOLNIR_ENABLE_PLUGINS=1`) המקורות שלהם אף פעם לא נטענים, והודעה ב-stderr מפרטת מה דולג. מניפסטים של כללים ב-JSON לא מריצים קוד, והקידומות של מזהי כללי core שמורות כך שתוסף לא יוכל להתחזות לאחד מהם. דווחו על פרצות דרך [SECURITY.md](SECURITY.md).

**הוא רץ על עצמו.** למנוע אמון באימות אין שום מעמד אם הוא עצמו לא ניתן לאימות. כל ריצת CI סורקת את המאגר הזה עם הבנייה שאותה ריצה הפיקה. השער נכשל על כל ממצא בחומרת error, וגם על סריקה **חלקית** או על **כלל שקרס**, כי סריקה עצמית קטועה שלא מדווחת כלום היא בדיוק הירוק המזויף שהפרויקט הזה קיים כדי לתפוס. `mjolnir doctor` מבקר מחדש את בסיס הכללים באותה ריצה (חומת ה-fixtures, יושרת הרמות, תקרת רמת ה-core), ובדיקה שתוצאתה INCONCLUSIVE נכשלת בדיוק כמו בדיקה שנכשלה. שני הדוחות מועלים כארטיפקטים של הבנייה.

### קודי יציאה וחוזה המכונה

קפואים, כדי שתוכלו לבנות עליהם לוגיקת CI:

| קוד יציאה | משמעות                                                          |
| --------- | --------------------------------------------------------------- |
| `0`       | נקי: אין ממצאים ברמת השער או מעליה                              |
| `1`       | יש ממצאים ברמת השער או מעליה                                    |
| `2`       | סריקה חלקית (תקציב הזמן נגמר, קבצים לא קריאים). אף פעם לא חוסם. |
| `10`      | שגיאת שימוש (דגל שגוי, יעד חסר)                                 |
| `20`      | שגיאה פנימית                                                    |

‏`2` שונה במכוון מ-`0`: סריקה שלא הסתיימה לא "מצאה כלום". היא פשוט לא סיימה לחפש.

כל מה שמכונה צורכת (תוצאות של כלי MCP, ‏`--json`, ‏SARIF 2.1) מגיע מתוצאה קנונית אחת תחת סכמה עם גרסאות, **שמתרחבת רק בהוספה** (`schemaVersion: 1`, `contractVersion: 1`), כך שאף צרכן לא צריך לשחזר משמעות מטקסט מרונדר. ראו [את חוזה המכונה](docs/machine-contract.md). מזהי כללים (`QA-<FAMILY>-NNN`) אינם ניתנים לשינוי אחרי שיצאו ואף פעם לא ממוחזרים.

<br />

## מה Mjölnir לא יכול להגיד לכם

- **הוא לא מריץ את הבדיקות שלכם.** סריקה נקייה היא לא חבילה שעוברת.
- **הוא לא יכול להגיד לכם ש-assertion _שגוי_.** `expect(total).toBe(41)` נראה בריא. Mjölnir מוצא בדיקות ש*לא יכולות להיכשל* וצינורות ש*לא יכולים להאדים*, לא בדיקות שבודקות את הדבר הלא נכון.
- **הוא לא מוכיח נכונות עסקית.** שום דבר כאן לא אומר שהמוצר שלכם עושה את מה שהדרישה ביקשה.
- **‏100 הוא לא הוכחה לחבילה טובה.** האם החבילה שלכם מכסה את הסיכון האמיתי שלכם זו שאלה אחרת, והכלי הזה לא עונה עליה.
- **5 מתוך 79 כללים יוצאים על סמך הערכה**, לא שיעור נמדד. כל אחד מהם אומר זאת על הממצא שלו.
- **‏E1 הוא לא E2.** ממצאים היוריסטיים שווים קריאה, לא יישום עיוור.
- **מאגר ריק מקבל `null`, אף פעם לא 100.**
- **קובץ בשם `*.spec.ts` בלי הצהרות בדיקה לא נחשב כיסוי.** מאגר שקובצי ה-spec היחידים שלו מכילים imports או טיפוסים (אפס קריאות `it`/`test`) מקבל `null`, לא 100.

<br />

## תיעוד

אתר התיעוד המלא נמצא בכתובת <https://sergey-bar.github.io/Mjolnir/>.

| מסמך                                                   | מה יש בו                                          |
| ------------------------------------------------------ | ------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | נרמול הציון ושקלול הראיות                         |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | אוצר מילים קנוני: מילה אחת לכל מושג               |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | שיעורי false positives נמדדים והשיטה              |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | מצבי כללים, רמות, השתקה, הוצאה משימוש             |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | מדיניות semver, ממשקים קפואים, מחזור הוצאה משימוש |
| [docs/machine-contract.md](docs/machine-contract.md)   | התוצאה הקנונית הקריאה למכונה                      |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | פלט SARIF והגדרת עורך או CI                       |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | ‏GitLab: דוח Code Quality, מתכון ל-MR, שער        |
| [docs/rules/](docs/rules/)                             | קטלוג כללים שנוצר אוטומטית                        |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | סביבת פיתוח ותהליך תרומה                          |
| [SUPPORT.md](SUPPORT.md)                               | איפה לשאול, לדווח ולקבל עזרה                      |
| [SECURITY.md](SECURITY.md)                             | דיווח על פרצות                                    |
| [CHANGELOG.md](CHANGELOG.md)                           | היסטוריית גרסאות                                  |

### סטטוס

**גרסה 1.** סכמת ה-JSON וקודי היציאה הם חוזים קפואים. ל-TypeScript ול-Python יש את הכיסוי הנמדד הרחב ביותר. ‏Java ו-C# חדשות יותר; קראו אותן דרך [טבלת הבשלות](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). מה הלאה, בלי תאריכים מומצאים: [מפת הדרכים הפומבית](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### תרומה

כללים חדשים הם התרומה הראשונה הקלה ביותר. פקודה אחת בונה שלד של הכלל עם ה-fixtures שלו, must-fire **וגם** must-not-fire. הכלל שנוצר נכשל בכוונה ב-fixtures של עצמו עד שנכתב זיהוי אמיתי, כי שלד שיוצא לאוויר הוא כלל שאף אחד לא מדד:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

סביבת הפיתוח, פקודות השערים הקבועים וחוקי ה-anti-creep וחומת ה-fixtures נמצאים ב-[CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="הריצו אותו על המאגר שלכם." width="100%" />

```bash
npx mjolnir-qa@3.0.0
```

[לקריאת המדריך](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [אתר התיעוד](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

אל תשאלו אם הבדיקות עברו.<br />
שאלו אם הראיות מוכיחות שמגיע להן אמון.

<sub>נבנה על ידי [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · ברישיון MIT</sub>

</div>
