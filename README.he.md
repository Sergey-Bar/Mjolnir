<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### הבדיקות שלך משקרות לך. אנחנו מוכיחים את זה.

**Verification Trust Engine ל‑QA.** Mjölnir מבקר חבילות בדיקות וצינורות
CI, מדווח ציון הגינות ומציג בדיוק היכן האמון נשבר.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | עברית | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**האם הבדיקות שלך ראויות לאמון?**

[ראו את זה עובד](#-ראו-את-זה-עובד) ·
[התחלה מהירה](#-התחלה-מהירה) ·
[מה הוא בודק](#-מה-mjölnir-בודק) ·
[ניקוד](#איך-הניקוד-עובד) ·
[CI](#-שילוב-ci) · [הגדרות](#הגדרות) ·
[תיעוד](#-תיעוד)

</div>

---

## 🎬 ראו את זה עובד

<p align="center">
  <img src="assets/readme/demo.svg" alt="דוח ה‑--verbose המלא של Mjölnir על repo הדגמה: WORTHINESS 75/100 NEEDS WORK, פירוק אבחונים לפי קטגוריה, רשימת FIX THIS FIRST, וכל ממצא עם מזהה כלל ומספר שורה — על פני CI, Playwright, היגיינת בדיקות וכללי Python" width="900" />
</p>

<sub>פלט המלא של `npx mjolnir-qa ./examples/demo-repo --verbose`,
מוצג מה‑reporter האמיתי — שום דבר לא נחתך. מחדש עם
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
מפיל את ה‑CI אם החומר סוטה ממה שהכלי מדפיס.</sub>

**מה קרה זה עתה:**

1. Mjölnir גילה את ספסים של Playwright, את התצורה שלו, את זרימת ה‑CI
   וקובץ בדיקות Python — ארבע שפות/פורמטים, מעבר אחד.
2. הוא מצא עדויות שמחלישות את האמון בחבילה — `continue-on-error`
   שמסתיר job, `|| true` שבולע exit code, שינה מלאכותית קבועה, selector
   שברירי, כתובות staging מקודדות מראש, המתנת `networkidle`.
3. הפך כל אחת לממצא מוחשי עם מזהה כלל, מיקום ותיקון — ולציון יחיד
   שממנו ניתן להפעיל שער על PR.

### ממצא אחד, מקרוב

הריצו `mjolnir explain QA-CI-001` על הממצא הראשון למעלה ותקבלו:

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

זו יחידת הערך: לא חיסר סטייל, אלא מקום שבו ה‑CI שלך אומר לך שמשהו
עבר — כשהוא לא עבר.

---

## ⚡ התחלה מהירה

הריצו מול repo לדוח מלא ולציון הגינות:

```bash
npx mjolnir-qa@latest
```

**ב‑CI המוצר הוא פקודה אחת.** הוא סורק רק את מה שהענף נגע בו ויוצא
עם קוד שאינו אפס על בעיות חדשות:

```bash
npx mjolnir-qa@latest --scope changed
```

שימו את זה ב‑check של PR — `mjolnir ci install` כותב את ה‑workflow —
וזהו. הכול האחר אופציונלי.

| פקודה                               | מה היא עושה                                       |
| ----------------------------------- | ------------------------------------------------- |
| `mjolnir`                           | סריקת repo מלאה + ציון הגינות                     |
| `mjolnir --scope changed`           | רק מה שהענף שלך הביא — הצורה ל‑CI                 |
| `mjolnir ci install`                | מייצר workflow ייעוצי ל‑PR                        |
| `mjolnir explain QA-CI-001`         | מה / למה / תיקון + שיעור FP מדוד לכלל אחד         |
| `mjolnir rules --unmeasured`        | הכללים שרצים על הנחה, לא על מדידה                 |
| `mjolnir --json` / `--format sarif` | קריא למכונה / GitHub Code Scanning                |
| `mjolnir --strict`                  | מריץ גם כללי tier quarantine (סיכון FP גבוה יותר) |

<details>
<summary><strong>כשמשהו לא יציב (flaky)</strong></summary>

| פקודה                               | מה היא עושה                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | נתוני ריצה אמיתיים → פסקי דין `TRUE-FLAKE`, `FLAKY.md`   |
| `mjolnir triage ./test-results/`    | הצעת הסגר מהיסטוריית הרצות                               |
| `mjolnir pw-report ./test-results/` | סיכום ריצת Playwright — retries / flakes / האיטיים ביותר |
| `mjolnir doctor:playwright`         | סריקה עמוקה ל‑Playwright בלבד + Selector Health Score    |

</details>

<details>
<summary><strong>מדי פעם / דוחות</strong></summary>

| פקודה                           | מה היא עושה                                 |
| ------------------------------- | ------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | תיקונים אוטומטיים בטוחים עם הוכחה           |
| `mjolnir baseline` / `diff`     | צילום ממצאים, ואז דוח רק על חדשים/מוחמרים   |
| `mjolnir impact --since <ref>`  | מה השתנה מאז commit קודם                    |
| `mjolnir debt`                  | מרשם חוב בדיקות עם מודל עלות                |
| `mjolnir handover`              | מפת השתלבות של החבילה ל‑QA חדש              |
| `mjolnir stats`                 | מונים מקומיים של כל התיקונים שנראו          |
| `mjolnir badge`                 | JSON של endpoint shields.io + snippet       |
| `mjolnir rules --md`            | קטלוג כללים מלא (JSON או Markdown)          |
| `mjolnir doctor`                | ביקורת עצמית של בסיס הכללים של Mjölnir עצמו |
| `mjolnir create-rule <ID>`      | שלד של כלל חדש + fixtures                   |
| `mjolnir --format mermaid`      | דיאגרמת ארכיטקטורת בדיקות להערת PR          |

</details>

התקינו גלובלית במקום `npx` אם אתם מעדיפים: `npm i -g mjolnir-qa`.
דורש Node.js ≥ 22.18. עובד על Windows, macOS ו‑Linux.

---

## 👥 למי זה?

- **QA / SDET** שבבעלותם חבילת e2e או אינטגרציה וזקוקים לראיות שהחבילה
  באמת ראויה לסימן הירוק שהיא מייצרת.
- **צוותי Platform / DevEx** האחראים לשלמות CI ולשערי שחרור — האנשים
  שאכפת להם ש‑`continue-on-error` לא יצבע בשקט צינור אדום בירוק.
- **מתחזקי OSS** שרוצים שער אימות זול, תמיד דלוק, שרץ מקומית וב‑CI
  ללא קריאות רשת.

---

## 🔨 מה Mjölnir בודק

|     |                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------ |
| ⚖️  | **ציון הגינות** — מספר אחד, טבלת חיסורים שקופה, ללא קופסה שחורה                                              |
| 🎭  | **Selector Health Score** — מדרג את ה‑locators של Playwright שלך, לא רק את אחוזי ההצלחה                      |
| 🔬  | **פורנזיקת ריצה** — קורא נתוני ריצה אמיתיים של Playwright/JUnit כדי לתפוס `TRUE-FLAKE`, לא רק ניחושים סטטיים |
| 🚨  | **כללי שלמות CI** — תופס `continue-on-error`, `\|\| true` וטריקים אחרים של ירוק מזויף                        |
| 🐍  | **כל ארבעת ה‑Playwright bindings** — TypeScript, Python, Java, C#/.NET — וגם pytest, JUnit/TestNG וזרימות CI |
| 🔒  | **Local-first** — אפס קריאות רשת במהלך הסריקה, אפס טלמטריה, רץ בשניות                                        |

### הכללים

כל כלל מגיע עם fixtures של must-fire **וגם** must-not-fire. כלל שמופעל
על ה‑fixture השלילי של עצמו לא יכול לצאת — זהו מחסום ה‑false positives.

<details>
<summary><strong>היגיינת בדיקות</strong></summary>

| ID          | כלל                                                 | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | בדיקה ממוקדת שבוצע commit לה (`.only`, `fit`)       | error    |
| QA-TEST-002 | בדיקה מדולגת ללא נימוק                              | error    |
| QA-TEST-002 | בדיקה מדולגת עם נימוק מתועד                         | warning  |
| QA-TEST-003 | בדיקה ללא assertions                                | error    |
| QA-TEST-004 | שינה קבועה (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | שימוש לרעה ב‑retry שמסתיר חוסר יציבות               | warning  |
| QA-TEST-010 | גוף בדיקה ריק                                       | error    |

</details>

<details>
<summary><strong>איכות בדיקות</strong></summary>

| ID           | כלל                            | Severity |
| ------------ | ------------------------------ | -------- |
| QA-TQUAL-001 | אימות ב‑mocks בלבד             | info     |
| QA-TQUAL-002 | assertion טאוטולוגי            | error    |
| QA-TQUAL-009 | assertion של promise ללא await | error    |
| QA-TQUAL-011 | בדיקות שהועברו להערה           | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | כלל                                      | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | assertion של locator ללא await           | error    |
| QA-PW-003 | `page.pause()` / `test.only()` עם commit | error    |
| QA-PW-004 | selectors שבירים של CSS/XPath            | warning  |
| QA-PW-005 | לוגיקה עסקית בתוך `page.evaluate()`      | info     |
| QA-PW-114 | element handles ישנים (`page.$`)         | info     |
| QA-PW-118 | המתנות `networkidle` (flaky by design)   | info     |
| QA-PW-123 | כתובות סביבה מקודדות מראש                | warning  |

</details>

<details>
<summary><strong>שלמות CI</strong></summary>

| ID        | כלל                                                            | Severity |
| --------- | -------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` מסתיר כשלים                                | error    |
| QA-CI-002 | `\|\| true` בולע exit codes                                    | error    |
| QA-CI-005 | דוח נצרך אך לעולם לא נוצר                                      | error    |
| QA-CI-007 | עטיפות retry סביב בדיקות                                       | warning  |
| QA-CI-008 | שלב שתמיד מצליח מסתיר כשלים                                    | error    |
| QA-CI-009 | exit code של הבדיקות לא מועבר (`\|` ללא pipefail, שרשראות `;`) | error    |
| QA-CI-010 | בדיקות מדולגות בדיוק שם שהן חייבות לחסום (skip-on-PR guards)   | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | כלל                                     | Severity |
| --------- | --------------------------------------- | -------- |
| QA-PY-002 | בדיקה מדולגת (`skip`, `xfail` לא קפדני) | warning  |
| QA-PY-003 | פונקציית בדיקה ללא assertions           | error    |
| QA-PY-005 | `time.sleep()` בבדיקות                  | warning  |
| QA-PY-006 | גוף בדיקה ריק (`pass`)                  | info     |
| QA-PY-010 | תלות באקראי/זמן ללא freeze              | info     |
| QA-PY-012 | assertion טאוטולוגי                     | error    |

סה״כ 20 כללי Python (QA-PY-001…012 היגיינת pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | כלל                                         | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-JV-101 | בדיקה מושבתת (`@Disabled`)                  | warning  |
| QA-JV-102 | שינה קבועה (`Thread.sleep()`)               | warning  |
| QA-JV-103 | מתודת בדיקה ללא assertions                  | error    |
| QA-JV-105 | שינה קבועה של Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | selector שביר במקום role locator            | warning  |
| QA-JV-108 | כתובת סביבה מקודדת מראש בבדיקה              | info     |
| QA-JV-111 | mock כוללני `page.route("**")`              | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | כלל                                        | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-CS-101 | בדיקה מדולגת (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | שינה קבועה (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | מתודת בדיקה ללא assertions                 | error    |
| QA-CS-105 | שינה קבועה `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | selector שביר במקום role locator           | warning  |
| QA-CS-108 | כתובת סביבה מקודדת מראש בבדיקה             | info     |
| QA-CS-111 | mock כוללני `page.RouteAsync("**")`        | info     |

</details>

> הקטלוג החי המלא — כל כלל עם tier, confidence, סיכון false positive
> וזמינות autofix — נוצר מהרישום:
>
> ```bash
> mjolnir rules --md
> ```
>
> דפים לכל כלל נמצאים ב[`docs/rules/`](docs/rules/).

### כמה מזה נמדד

**74 מתוך 99 כללים נושאים שיעור false positives שנמדד מול קוד OSS אמיתי**
(≥ 10 ממצאים שסווגו ידנית כל אחד; ראו
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). ה‑19 האחרים יוצאים על הערכת
המחבר. התחתית של כל סריקה אומרת כמה מהכללים ש_ירו_ נמדדו;
`mjolnir rules --unmeasured` מפרט את אלה שלא; עמוד `mjolnir explain`
של כל כלל מצהיר על מעמדו. אנחנו מפרסמים את השיעור גם כשהוא מכוער —
QA-CS-103 נבדק ב‑95% ומצוי בהסגר בגין זה. להגדיל את ה‑78 הזה הוא
העבודה המתמשכת של הפרויקט.

### רמות (tiers) של כללים ובשלות לפי שפה

כל כלל הוא `core`, `extended` או `quarantine`, נקבע לפי שיעור ה‑false
positives **הנמדד** שלו:

| Tier         | משמעות                             | סריקת ברירת מחדל | `--strict` |
| ------------ | ---------------------------------- | :--------------: | :--------: |
| `core`       | ≤ 10% FP נמדד                      |        ✅        |     ✅     |
| `extended`   | ≤ 30% FP נמדד                      |        ✅        |     ✅     |
| `quarantine` | מעל 30%, או עדיין לא נמדד (n < 10) |        ❌        |     ✅     |

| שפה             | Adapter     | הכיסוי היום                                    |
| --------------- | ----------- | ---------------------------------------------- |
| TypeScript / JS | AST של מהדר | הרחב, הנמדד ביותר — בעיקר `core`/`extended`    |
| Python / pytest | שכבת regex  | רחב, נבדק מול corpus — בעיקר `core`/`extended` |
| Java            | שכבת regex  | חדש יותר — בעיקר `extended`/`quarantine`       |
| C# / .NET       | שכבת regex  | חדש יותר — בעיקר `extended`/`quarantine`       |

ל‑TypeScript ול‑Python יש את הכיסוי הנמדד הרחב ביותר. Java ו‑C# יצאו,
מתועדים, ומוחזקים מחוץ למספר הכותרת עד שחבילת צרכן אמיתית (לא הבדיקות
של ספריית binding עצמה) תיבדק.

---

## איך הניקוד עובד

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="פלט טרמינל של Mjölnir — WORTHINESS 75/100 NEEDS WORK, פירוק אבחונים לפי קטגוריה ורשימת FIX THIS FIRST" width="820" />
</p>

<sub>מחדש עם `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
מפיל את ה‑CI אם החומר סוטה ממה שה‑reporter מדפיס בפועל.</sub>

הציון שקוף: **error −8, warning −3, info −1**, ואז נרמל לפי החשיפה
של החבילה (חיסורים לכל הצהרת בדיקה). חיסורים המשוקללים לפי ראיות
אומרים שאותות חלשים זולים יותר. הטרמינל מציג את אותם מספרים מהונחים
שהציון משתמש בהם — ללא קופסה שחורה. שיטה מלאה:
[docs/SCORING.md](docs/SCORING.md).

**פסקי דין**

| Score   | פסק דין          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**רמות ראיה** — כל ממצא נושא אחת; היא קובעת את משקל הממצא בציון:

| רמה | משמעות          | השפעה על הציון  | דוגמה                                       |
| --- | --------------- | --------------- | ------------------------------------------- |
| E2  | פגם דטרמיניסטי  | חיסור מלא       | `.only` שבוצע commit — ניתן להוכחה מבנית    |
| E1  | תבנית היוריסטית | חצי חיסור       | `sleep()` שנתפס ב‑regex — אות חזק, לא הוכחה |
| E0  | תצפית           | אפס (info בלבד) | מדווח אך לעולם לא שער ל‑CI ולא מחסר         |

רוב הכללים הם **E1**. הסלוגן «we prove it» מתייחס למערכת הזו: ממצאי E2
הם הוכחה מבנית; ממצאי E1 הם אזהרות ממוקמות היטב, לא הוכחות פורמליות.

repo ריק מקבל `null`, לעולם לא 100 מזויף — ראו
[מודל האמון](#מודל-האמון).

---

## 🎭 Selector Health Score

המדד הראשי לחבילות Playwright — עד כמה ה‑locators שלך עמידים:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Locators מבוססי role מקבלים מלא. שרשראות מחלקות CSS ו‑XPath מטביעים
את הציון — הם נשברים בכל refactor של DOM בלי לומר לך איזו התנהגות
נפגעה.

---

## 🔬 ראיות ריצה

זיהוי חוסר יציבות סטטי הוא ניחוש. Mjölnir קורא **נתוני הרצה אמיתיים** —
דוחות JSON של Playwright ו‑XML של JUnit מכל ראנר:

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

בדיקה שעוברת רק מניסיון ≥ 2 אינה בדיקה שעוברת — זו בדיקה ברת מזל.
היא מסומנת `TRUE-FLAKE` ללא קשר לסימן הירוק הסופי.

---

## ⚡ Mjölnir אינו עוד linter

Linters אומרים לך אם הקוד מציית לכללים. Mjölnir אומר לך אם אפשר לסמוך
על האימות שלך.

|                                                      | ESLint / SonarQube | כלי coverage | סקירה ידנית | **Mjölnir** |
| ---------------------------------------------------- | :----------------: | :----------: | :---------: | :---------: |
| שלמות זרימות CI (`continue-on-error`, `\|\| true`)   |         ❌         |      ❌      |    נדיר     |     ✅      |
| חוצה שפות (TS, Python, Java, C#) מכלי אחד            |         ❌         |      ❌      |     ❌      |     ✅      |
| מדרג עמידות locators של Playwright (Selector Health) |         ❌         |      ❌      |    נדיר     |     ✅      |
| מסמן בדיקות ללא assertions אמיתיים                   |   ✅ (פלאגין)\*    |      ❌      |   לפעמים    |     ✅      |
| תופס שינה קבועה (`waitForTimeout`, `time.sleep`)     |   ✅ (פלאגין)\*    |      ❌      |   לפעמים    |     ✅      |
| רץ בשניות, אפס קריאות רשת בזמן הסריקה                |         ✅         |      ✅      |      —      |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) ו‑`eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) מכסים זאת לפריימוורקים שלהם.

**ניתוח ריצה** הוא קטגוריה נפרדת לצד linting סטטי:

|                                                | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ---------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| קורא נתוני ריצה אמיתיים לפסקי דין `TRUE-FLAKE` |          חלקי\*           |      חלקי (tag)       |          ✅           |
| דוח טריאז לחוסר יציבות מהיסטוריית ריצות        |            ❌             |          ✅           |          ✅           |
| משתלב עם ציון ההגינות הסטטי                    |            ❌             |          ❌           |          ✅           |

\*Playwright עוקב אחר retries בפנים אך אינו מפיק דוח חוסר יציבות
עצמאי עם תוויות פסק דין.

---

## 🤖 למה לא פשוט סקירת קוד של AI?

בעיה אחרת, שכבה אחרת. סקירת AI יכולה לזהות שינוי בדיקה חשוד ב‑diff; היא
אינה מוכיחה שמערכת האימות כולה ראויה לאמון — והיא רואה רק את ה‑diff
שמציגים לה.

|                                  | סקירת קוד AI (Copilot וכד')  |         **Mjölnir**          |
| -------------------------------- | :--------------------------: | :--------------------------: |
| עלות לסריקה                      | Token (מתרחב עם גודל ה‑diff) |    **אפס** (מקומי, מותקן)    |
| רואה את כל החבילה + כל תצורות CI |   רק את ה‑diff שמציגים לו    |      **הכול, בכל פעם**       |
| דטרמיניסטי (אותו קלט → אותו פלט) |      ❌ (לא דטרמיניסטי)      |            **✅**            |
| תופס תבניות שישנות חודשים        |        רק אם הן בהקשר        |  **✅** (סורק את כל הקבצים)  |
| זוכר ממצאים בין ריצות            |  ❌ (אין זיכרון בין הפעלות)  |   **✅** (baseline + diff)   |
| רץ ללא הדק אנושי                 |      דרוש PR או prompt       | **✅** (hook של CI, 3 שניות) |

**השתמשו בשניהם.** AI תופס ניואנס, כוונה ופגמי עיצוב שאין regex
מוצא. Mjölnir תופס את התבניות המבניות ש‑AI מפספס כי הן נראות
«מכוונות» — `.only` שבוצע commit, exit code שנבלע, `continue-on-error`
על job בדיקות. אלה לא באגים שדורשים הסקה; אלה עובדות שדורשות סריקה.

---

## 🤖 שילוב CI

פקודה אחת מייצרת workflow ל‑PR — ייעוצי כברירת מחדל, לעולם לא חוסם:

```bash
mjolnir ci install
```

או חברו אותו ישירות ל‑GitHub Code Scanning דרך SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

הגדרת עורך וצינור ל‑SARIF: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### כיסוי scope ששונה

`--scope changed` מייחס ממצאים לשורות שהענף שלך הוסיף מול merge-base
מול `main`. הוא מכסה קבצי בדיקות (`*.spec.*`, `*.test.*`) וגם קבצי
workflow של GitHub ותצורות Playwright ב‑diff. כאשר ה‑merge-base לא
ניתן לפתרון — shallow clone, detached HEAD, יעד שאינו git, ענף ברירת
מחדל אחר — הוא מדרדר בכנות: הממצאים חוזרים לייחוס לקובץ שלם והדוח אומר
זאת. דריסת ה‑ref הבסיסי עם `--base <ref>`.

---

## הגדרות

Mjölnir הוא zero-config. `mjolnir.config.json` אופציונלי (או
`.mjolnir.json`) בשורש ה‑repo מכוונן חומרה, שערים והיקף — הוא אף פעם
לא משנה סמנטיקת זיהוי.

| Key                 | טיפוס                                | השפעה                                                                                                                           |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | globs התעלמות נוספים (תת‑קבוצה של gitignore), מעל ברירות המחדל המובנות                                                          |
| `gate`              | `"advisory" \| "error" \| "warning"` | אילו רמות חומרה יוצאות עם קוד לא אפס (ברירת מחדל `error`; `advisory` לעולם לא חוסם)                                             |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | מדרג מחדש את ממצאי כלל ל‑repo שלך                                                                                               |
| `ignore`            | `IgnoreEntry[]`                      | מדכא ממצאים — **`reason` נדרש**; רשומות פגות אחרי 90 יום (תאריך `expires` מפורש, או זמן שינוי אחרון של קובץ התצורה לרשומות בלי) |
| `plugins`           | `string[]`                           | חבילות כללים של צד שלישי (ראו [מודל האמון](#מודל-האמון))                                                                        |

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

- **`.mjolnirignore`** — קובץ בסגנון gitignore פשוט להחרגות נתיבים,
  אותה לשון כמו `exclude`. השתמשו בו לרעש של מכונה; השתמשו ב‑`exclude`
  כשהרשימה שייכת לניהול גרסאות לצד שאר התצורה.
- **עקיפות CLI** — `--strict` (לכלול כללי הסגר), `--width <cols>` ו‑
  `--ascii` / `--no-ascii` (רינדור טרמינל), `--tone blunt` (הודעות
  ישירות יותר), `--max-duration <sec>` (סריקה חלקית מוגבלת).
- דיכוי כללים ומחזור חיי הוצאה משימוש: [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

רשומות `ignore` מזינות גם את הפקודה העצמאית `mjolnir suppressions`,
שמפרטת מה נדכא כעת ומתי כל רשומה פגה.

---

## 📐 קודי יציאה וחוזים

קפואים — בטוחים לבניית לוגיקת CI עליהם:

| קוד יציאה | משמעות                                                         |
| --------- | -------------------------------------------------------------- |
| `0`       | נקי — אין ממצאים בשער או מעליו                                 |
| `1`       | ממצאים בשער או מעליו                                           |
| `2`       | סריקה חלקית (נגמר תקציב הזמן, קבצים לא קריאים) — לעולם לא חוסם |
| `10`      | שגיאת שימוש (flag פגום, יעד חסר)                               |
| `20`      | שגיאה פנימית                                                   |

דוח ה‑JSON/SARIF הוא `schemaVersion: 1`. מזהי כללים (`QA-<FAMILY>-NNN`)
אינם משתנים אחרי ההשקה ולעולם אינם נעשים בשימוש חוזר.

---

## מודל האמון

- **Local-first** — אפס קריאות רשת בזמן הסריקה. אף פעם. אפס טלמטריה.
- **אין הוכחה מזויפת** — נעדיף לומר «לא ידוע» מאשר «אומת». repo ריק
  מקבל `score: null`, לעולם לא 100 מזויף.
- **כנות חלקית** — אם הניתוח קוצר, הפלט אומר זאת. לעולם לא «complete»
  כשאינו.
- **מחסום FP** — הזיהוי רץ על תצוגת קוד חסרת הערות/מחרוזות (כללי
  TypeScript משתמשים ב‑AST של המהדר): תבנית בתוך הערת פרוזה או מחרוזת
  דוגמה לתיעוד היא תיעוד, לא ממצא.
- **נמדד, לא נטען** — רק כללים עם שיעור false positives מקוד OSS אמיתי
  יוצאים ב‑tiers הכותרת (ראו [כמה מזה נמדד](#כמה-מזה-נמדד)); תחתית הסריקה
  ו‑`mjolnir rules --unmeasured` אומרים לך מי מי.
- **אמון ב‑plugins** — plugins הם חבילות npm המוצהרות תחת `"plugins"`.
  **אין sandbox**: קוד plugin רץ בהרשאות Node מלאות, אותו מודל אמון
  כמו plugins של ESLint או Vitest. קידומות מזהי כללים core שמורות
  ונדחות מ‑plugins למניעת התחזות.
- **כללים חיצוניים מקומיים ל‑workspace** (מבוססי תיקייה, אפס רשת) —
  תיקיית `mjolnir-rules/` ליד יעד הסריקה טוענת כללים מותאמים: קבצי JSON
  מצהירים תבניות regex (שום קוד לא מורץ), מודולי `.mjs`/`.js` מייצאים
  `rules` (אמון Node מלא, כמו plugins). כללים חיצוניים נושאים את אותם
  metadata של אמון כמו core; הם לעולם לא יכולים לצאת ב‑tier ה‑core
  (core דורש שיעור FP נמדד מה‑sidecar של ה‑corpus — הצהרת
  `tier: "core"` נלחצת ל‑`extended`), מצייתים לתקרות tier ונבדקים
  מול סטייה: `mjolnir rules --md --external` מציג את הקטלוג מהקבצים
  שנטענו (מקור `external`), ומחולל המטריצות מקבל `--external <root>`.

---

## 🏗️ ארכיטקטורה

<details>
<summary>פתח עץ</summary>

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

- **הכללים פונקציות טהורות** — `(SourceFileContext) → Finding[]`,
  ללא I/O, ללא globals. אקוסיסטם חדש = adapter אחד + הכללים שלו.
- **TypeScript/Playwright משתמש ב‑AST של המהדר** (ts-morph). Python,
  Java ו‑C# רצים על שכבת regex משותפת עם מסכה על הערות/מחרוזות.
- שכבת AST של tree-sitter WASM עבור Java ו‑C# קיימת והיא הצעד הבא
  בדיוק — עדיין לא מחוברת לצינור הסריקה הסינכרוני.

---

## 📚 תיעוד

| מסמך                                                   | מה יש בו                             |
| ------------------------------------------------------ | ------------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | נרמול הציון + שקילת ראיות            |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | שיעורי false positives נמדדים + שיטה |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | מצבי כללים, דיכוי, הוצאה משימוש      |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | פלט SARIF + הגדרת עורך/CI            |
| [docs/rules/](docs/rules/)                             | קטלוג שנוצר לכל כלל                  |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | התקנת פיתוח + תהליך תרומה            |
| [CHANGELOG.md](CHANGELOG.md)                           | היסטוריית מהדורות                    |
| [SECURITY.md](SECURITY.md)                             | דיווח פרצות אבטחה                    |

---

## 📈 סטטוס

**v0.5.x · בטא פתוחה.** סכמת ה‑JSON וקודי היציאה הם חוזים קפואים.
ל‑TypeScript ול‑Python את הכיסוי הנמדד הרחב ביותר; Java ו‑C# חדשים
יותר — קראו אותם דרך
[טבלת ה‑tiers](#רמות-tiers-של-כללים-ובשלות-לפי-שפה).

---

## 🤝 תרומה

כללים חדשים הם התרומה הראשונה הקלה ביותר — פקודה אחת בונה שלד של כלל
ואת ה‑fixtures שלו must-fire **וגם** must-not-fire (הכלל הנוצר נכשל
במכוון ב‑fixtures שלו עד שתממשו זיהוי אמיתי — stub לא יכול לצאת):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

התקנת פיתוח מלאה, פקודות השער הקבוע וחוקי ה‑anti-creep / מחסום ה‑fixtures
נמצאים ב[CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**הפסיקו לשחרר בדיקות שאינכם יכולים לסמוך עליהן.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

נבנה על ידי [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
