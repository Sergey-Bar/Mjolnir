<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Deine Tests lügen. Wir beweisen es.

**Verification Trust Engine für QA.** Mjölnir prüft Testsuiten und
CI-Pipelines, meldet einen Würdigkeitswert und zeigt genau, wo Vertrauen
bricht.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | Deutsch | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Sind deine Tests Vertrauen wert?**

[So funktioniert es](#-so-funktioniert-es) ·
[Schnellstart](#-schnellstart) ·
[Was es prüft](#-was-mjölnir-prüft) ·
[Scoring](#so-funktioniert-der-score) ·
[CI](#-ci-integration) · [Konfiguration](#konfiguration) ·
[Dokumentation](#-dokumentation)

</div>

---

## 🎬 So funktioniert es

<p align="center">
  <img src="assets/readme/demo.svg" alt="Mjölnirs voller --verbose-Bericht über ein Demo-Repo: WORTHINESS 75/100 NEEDS WORK, eine Diagnose-Aufschlüsselung nach Kategorien, eine FIX-THIS-FIRST-Liste und jeder Befund mit Regel-ID und Zeilennummer über CI, Playwright, Test-Hygiene und Python-Regeln hinweg" width="900" />
</p>

<sub>Die komplette `npx mjolnir-qa ./examples/demo-repo --verbose`-Ausgabe,
gerendert vom echten Reporter — nichts gekürzt. Neu erzeugt per
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
lässt CI fehlschlagen, wenn es von dem abweicht, was das Tool ausgibt.</sub>

**Was da gerade passiert ist:**

1. Mjölnir fand die Playwright-Specs, seine Konfiguration, den
   CI-Workflow und eine Python-Testdatei — vier Sprachen/Formate, ein
   Durchlauf.
2. Es fand Belege, die das Vertrauen in die Suite schwächen — ein
   `continue-on-error`, das einen Job maskiert, ein `|| true`, das einen
   Exit-Code schluckt, harte Sleeps, einen spröden Selektor,
   hartkodierte Staging-URLs, ein `networkidle`-Warten.
3. Jeden davon machte es zu einem konkreten Befund mit Regel-ID, Ort
   und Fix — und zu einem einzigen Score, an dem man einen PR gate-en
   kann.

### Ein Befund aus der Nähe

Führe `mjolnir explain QA-CI-001` für den ersten Befund oben aus, und du
erhältst:

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

Das ist die Einheit des Werts: kein Stil-Nit, sondern eine Stelle, an
der dein CI etwas als bestanden ausweist, das nicht bestanden ist.

---

## ⚡ Schnellstart

Führe es gegen ein Repo aus — für einen vollen Bericht und einen
Würdigkeitswert:

```bash
npx mjolnir-qa@latest
```

**In CI ist das Produkt ein einziger Befehl.** Er scannt nur, was der
Branch berührt hat, und beendet sich mit einem Wert ungleich null bei
neuen Problemen:

```bash
npx mjolnir-qa@latest --scope changed
```

Wirf das in einen PR-Check — `mjolnir ci install` schreibt den Workflow —
und fertig. Alles andere ist optional.

| Befehl                              | Was er tut                                                |
| ----------------------------------- | --------------------------------------------------------- |
| `mjolnir`                           | Repoweiter Scan + Würdigkeitswert                         |
| `mjolnir --scope changed`           | Nur, was dein Branch eingeführt hat — die CI-Form         |
| `mjolnir ci install`                | Erzeugt den advisorischen PR-Workflow                     |
| `mjolnir explain QA-CI-001`         | Was / warum / Fix + gemessene FP-Rate für eine Regel      |
| `mjolnir rules --unmeasured`        | Die Regeln, die auf Annahme statt Messung laufen          |
| `mjolnir --json` / `--format sarif` | Maschinenlesbar / GitHub Code Scanning                    |
| `mjolnir --strict`                  | Auch Quarantine-Tier-Regeln ausführen (höheres FP-Risiko) |

<details>
<summary><strong>Wenn etwas flaky ist</strong></summary>

| Befehl                              | Was er tut                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Echte Laufdaten → `TRUE-FLAKE`-Urteile, `FLAKY.md`             |
| `mjolnir triage ./test-results/`    | Quarantine-Vorschlag aus der Ausführungshistorie               |
| `mjolnir pw-report ./test-results/` | Playwright-Laufübersicht — Retries / Flakes / langsamste Tests |
| `mjolnir doctor:playwright`         | Playwright-only Tiefenscan + Selector Health Score             |

</details>

<details>
<summary><strong>Gelegentlich / Berichte</strong></summary>

| Befehl                          | Was er tut                                             |
| ------------------------------- | ------------------------------------------------------ |
| `mjolnir fix --dry-run` / `fix` | Sichere Auto-Fixes mit Nachweis                        |
| `mjolnir baseline` / `diff`     | Befunde speichern, dann nur neue/verschlimmerte melden |
| `mjolnir impact --since <ref>`  | Was sich seit einem früheren Commit geändert hat       |
| `mjolnir debt`                  | Test-Debt-Register mit Kostenmodell                    |
| `mjolnir handover`              | Onboarding-Karte der Suite für neue QA-Leute           |
| `mjolnir stats`                 | Lokale All-Time-Zähler der gesehenen Fixes             |
| `mjolnir badge`                 | shields.io-Endpoint-JSON + Snippet                     |
| `mjolnir rules --md`            | Voller Regelkatalog (JSON oder Markdown)               |
| `mjolnir doctor`                | Selbstaudit von Mjölnirs eigener Regelbasis            |
| `mjolnir create-rule <ID>`      | Neuen Regel-Scaffold + Fixtures anlegen                |
| `mjolnir --format mermaid`      | Test-Architekturdiagramm für einen PR-Kommentar        |

</details>

Installiere es global statt per `npx`, wenn du lieber: `npm i -g
mjolnir-qa`. Erfordert Node.js ≥ 22.18. Läuft auf Windows, macOS und
Linux.

---

## 👥 Für wen ist das?

- **QA / SDET**, die eine e2e- oder Integration-Suite besitzen und
  Belege brauchen, dass die Suite den grünen Haken wirklich verdient,
  den sie produziert.
- **Plattform-/DevEx-Teams**, die für CI-Integrität und Release-Gates
  verantwortlich sind — die Leute, denen ein `continue-on-error` nie
  stillschweigend eine rote Pipeline grün färben darf.
- **OSS-Maintainer**, die ein günstiges, immer aktives
  Verifikations-Gate wollen, das lokal und in CI ohne Netzwerkaufrufe
  läuft.

---

## 🔨 Was Mjölnir prüft

|     |                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Würdigkeitswert** — eine Zahl, transparente Abzugstabelle, keine Blackbox                                            |
| 🎭  | **Selector Health Score** — benotet deine Playwright-Locators, nicht nur deine Pass-Rate                               |
| 🔬  | **Runtime-Forensik** — liest echte Playwright/JUnit-Laufdaten und findet `TRUE-FLAKE`, nicht nur statische Vermutungen |
| 🚨  | **CI-Integritätsregeln** — findet `continue-on-error`, `\|\| true` und andere False-Green-Tricks                       |
| 🐍  | **Alle vier Playwright-Bindings** — TypeScript, Python, Java, C#/.NET — plus pytest, JUnit/TestNG und CI-Workflows     |
| 🔒  | **Local-first** — null Netzwerkaufrufe beim Scannen, null Telemetrie, läuft in Sekunden                                |

### Die Regeln

Jede Regel kommt mit Must-Fire- **und** Must-Not-Fire-Fixtures. Eine
Regel, die auf ihrem eigenen Negativ-Fixture auslöst, kann nicht
geshippt werden — das ist die False-Positive-Firewall.

<details>
<summary><strong>Test-Hygiene</strong></summary>

| ID          | Regel                                                 | Severity |
| ----------- | ----------------------------------------------------- | -------- |
| QA-TEST-001 | Committeter Focused Test (`.only`, `fit`)             | error    |
| QA-TEST-002 | Übersprungener Test ohne Begründung                   | error    |
| QA-TEST-002 | Übersprungener Test mit erfasster Begründung          | warning  |
| QA-TEST-003 | Test ohne Assertionen                                 | error    |
| QA-TEST-004 | Harter Sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Retry-Missbrauch, der Flakiness versteckt             | warning  |
| QA-TEST-010 | Leerer Testkörper                                     | error    |

</details>

<details>
<summary><strong>Test-Qualität</strong></summary>

| ID           | Regel                               | Severity |
| ------------ | ----------------------------------- | -------- |
| QA-TQUAL-001 | Nur-Mock-Verifikation               | info     |
| QA-TQUAL-002 | Tautologische Assertion             | error    |
| QA-TQUAL-009 | Nicht abgewartete Promise-Assertion | error    |
| QA-TQUAL-011 | Auskommentierte Tests               | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Regel                                    | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | Nicht abgewartete Locator-Assertion      | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committed | error    |
| QA-PW-004 | Spröde CSS/XPath-Selektoren              | warning  |
| QA-PW-005 | Business-Logik in `page.evaluate()`      | info     |
| QA-PW-114 | Legacy Element Handles (`page.$`)        | info     |
| QA-PW-118 | `networkidle`-Warten (flaky by design)   | info     |
| QA-PW-123 | Hartkodierte Umgebungs-URLs              | warning  |

</details>

<details>
<summary><strong>CI-Integrität</strong></summary>

| ID        | Regel                                                                     | Severity |
| --------- | ------------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` maskiert Fehler                                       | error    |
| QA-CI-002 | `\|\| true` schluckt Exit-Codes                                           | error    |
| QA-CI-005 | Report konsumiert, aber nie erzeugt                                       | error    |
| QA-CI-007 | Retry-Wrapper um Tests                                                    | warning  |
| QA-CI-008 | Immer-erfolgreicher Step maskiert Fehler                                  | error    |
| QA-CI-009 | Test-Exit-Code wird nicht weitergereicht (`\|` ohne pipefail, `;`-Ketten) | error    |
| QA-CI-010 | Tests übersprungen, wo sie blockieren müssen (skip-on-PR-Guards)          | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Regel                                                | Severity |
| --------- | ---------------------------------------------------- | -------- |
| QA-PY-002 | Übersprungener Test (`skip`, nicht-strictes `xfail`) | warning  |
| QA-PY-003 | Testfunktion ohne Assertionen                        | error    |
| QA-PY-005 | `time.sleep()` in Tests                              | warning  |
| QA-PY-006 | Leerer Testkörper (`pass`)                           | info     |
| QA-PY-010 | Zufalls-/Zeitabhängigkeit ohne Freeze                | info     |
| QA-PY-012 | Tautologische Assertion                              | error    |

20 Python-Regeln insgesamt (QA-PY-001…012 pytest-Hygiene + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Regel                                      | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-JV-101 | Deaktivierter Test (`@Disabled`)           | warning  |
| QA-JV-102 | Harter Sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Testmethode ohne Assertionen               | error    |
| QA-JV-105 | Playwright `waitForTimeout()`-harter Sleep | warning  |
| QA-JV-106 | Spröder Selektor statt Role-Locator        | warning  |
| QA-JV-108 | Hartkodierte Umgebungs-URL im Test         | info     |
| QA-JV-111 | Pauschales `page.route("**")`-Mock         | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Regel                                             | Severity |
| --------- | ------------------------------------------------- | -------- |
| QA-CS-101 | Übersprungener Test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Harter Sleep (`Thread.Sleep` / `Task.Delay`)      | warning  |
| QA-CS-103 | Testmethode ohne Assertionen                      | error    |
| QA-CS-105 | `WaitForTimeoutAsync()`-harter Sleep              | warning  |
| QA-CS-106 | Spröder Selektor statt Role-Locator               | warning  |
| QA-CS-108 | Hartkodierte Umgebungs-URL im Test                | info     |
| QA-CS-111 | Pauschales `page.RouteAsync("**")`-Mock           | info     |

</details>

> Der volle Live-Katalog — jede Regel mit Tier, Confidence,
> False-Positive-Risiko und Autofix-Verfügbarkeit — wird aus der
> Registry erzeugt:
>
> ```bash
> mjolnir rules --md
> ```
>
> Pro-Regel-Seiten liegen unter [`docs/rules/`](docs/rules/).

### Wie viel davon gemessen ist

**74 von 99 Regeln tragen eine False-Positive-Rate, gemessen an echtem
OSS-Code** (jeweils ≥ 10 handklassifizierte Befunde; siehe
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Die anderen 19 gehen auf der
Schätzung des Autors. Jeder Scan-Footer sagt dir, wie viele der
_ausgelösten_ Regeln gemessen sind; `mjolnir rules --unmeasured` listet
die nicht gemessenen; die `mjolnir explain`-Seite jeder Regel nennt
ihren Status. Wir veröffentlichen die Rate, selbst wenn sie hässlich
ist — QA-CS-103 auditiert bei 95 % und ist deshalb quarantäniert. Diese
78 zu vergrößern ist die fortlaufende Arbeit des Projekts.

### Regel-Tiers und Sprachreife

Jede Regel ist `core`, `extended` oder `quarantine`, zugewiesen nach
ihrer **gemessenen** False-Positive-Rate:

| Tier         | Bedeutung                                  | Standard-Scan | `--strict` |
| ------------ | ------------------------------------------ | :-----------: | :--------: |
| `core`       | ≤ 10 % gemessene FP                        |      ✅       |     ✅     |
| `extended`   | ≤ 30 % gemessene FP                        |      ✅       |     ✅     |
| `quarantine` | darüber, oder noch nicht gemessen (n < 10) |      ❌       |     ✅     |

| Sprache         | Adapter       | Abdeckung heute                                              |
| --------------- | ------------- | ------------------------------------------------------------ |
| TypeScript / JS | Compiler-AST  | am breitesten, am meisten gemessen — meist `core`/`extended` |
| Python / pytest | Regex-Schicht | breit, corpus-auditiert — meist `core`/`extended`            |
| Java            | Regex-Schicht | neuer — meist `extended`/`quarantine`                        |
| C# / .NET       | Regex-Schicht | neuer — meist `extended`/`quarantine`                        |

TypeScript und Python haben die breiteste gemessene Abdeckung. Java und
C# sind geshippt, dokumentiert und bleiben aus der Schlagzeilen-Zahl
heraus, bis eine echte Consumer-Suite (nicht die eigenen Tests einer
Binding-Library) auditiert wurde.

---

## So funktioniert der Score

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir-Terminalausgabe — WORTHINESS 75/100 NEEDS WORK, eine Diagnose-Aufschlüsselung nach Kategorien und eine FIX-THIS-FIRST-Liste" width="820" />
</p>

<sub>Neu erzeugt per `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
lässt CI fehlschlagen, wenn es von dem abweicht, was der Reporter
wirklich druckt.</sub>

Der Score ist transparent: **error −8, warning −3, info −1**, dann
normalisiert um die Suite-Exposition (Abzüge pro Testdeklaration).
Evidenzgewichtete Abzüge bedeuten: schwache Signale kosten weniger. Das
Terminal zeigt dieselben diskontierten Zahlen, die der Score verwendet —
keine Blackbox. Volle Methode: [docs/SCORING.md](docs/SCORING.md).

**Urteile**

| Score   | Urteil           |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Evidenzlevel** — jeder Befund trägt eines; es setzt das Gewicht des
Befunds im Score:

| Level | Bedeutung                | Score-Auswirkung | Beispiel                                                  |
| ----- | ------------------------ | ---------------- | --------------------------------------------------------- |
| E2    | Deterministischer Defekt | Voller Abzug     | `.only` committed — strukturell beweisbar                 |
| E1    | Heuristisches Muster     | Halbierter Abzug | Regex-getroffenes `sleep()` — starkes Signal, kein Beweis |
| E0    | Beobachtung              | Null (nur Info)  | Gemeldet, gated aber nie CI und zieht nie ab              |

Die meisten Regeln sind **E1**. Der Tagline „we prove it“ bezieht sich
auf dieses System: E2-Befunde sind struktureller Beweis; E1-Befunde
sind korrekt positionierte Warnungen, keine formalen Beweise.

Ein leeres Repo scored `null`, nie eine fake 100 — siehe
[Vertrauensmodell](#vertrauensmodell).

---

## 🎭 Selector Health Score

Die Headline-Metrik für Playwright-Suiten — wie belastbar deine
Locators sind:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Rollenbasierte Locators bekommen die volle Punktzahl.
CSS-Klassenketten und XPath ruiniern den Score — sie brechen bei jedem
DOM-Refactor, ohne dir zu sagen, welches Verhalten regressiert ist.

---

## 🔬 Runtime-Evidenz

Statische Flakiness-Erkennung ist Raten. Mjölnir liest **echte
Ausführungsdaten** — Playwright-JSON-Reports und JUnit-XML von jedem
Runner:

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

Ein Test, der nur ab Versuch ≥ 2 besteht, ist kein bestandener Test —
es ist ein glücklicher Test. Er wird als `TRUE-FLAKE` markiert, egal
wie grün der finale Haken ist.

---

## ⚡ Mjölnir ist kein weiterer Linter

Linter sagen dir, ob Code Regeln folgt. Mjölnir sagt dir, ob deine
Verifikation vertraut werden kann.

|                                                                     | ESLint / SonarQube | Coverage-Tools | Manueller Review | **Mjölnir** |
| ------------------------------------------------------------------- | :----------------: | :------------: | :--------------: | :---------: |
| CI-Workflow-Integrität (`continue-on-error`, `\|\| true`)           |         ❌         |       ❌       |      selten      |     ✅      |
| Cross-Sprache (TS, Python, Java, C#) aus einem Tool                 |         ❌         |       ❌       |        ❌        |     ✅      |
| Benotet die Belastbarkeit von Playwright-Locators (Selector Health) |         ❌         |       ❌       |      selten      |     ✅      |
| Findet Tests ohne echte Assertionen                                 |   ✅ (Plugin)\*    |       ❌       |     manchmal     |     ✅      |
| Findet harte Sleeps (`waitForTimeout`, `time.sleep`)                |   ✅ (Plugin)\*    |       ❌       |     manchmal     |     ✅      |
| Läuft in Sekunden, null Netzwerkaufrufe beim Scannen                |         ✅         |       ✅       |        —         |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) und `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) decken das für die jeweiligen
Frameworks ab.

**Runtime-Analyse** ist eine eigene Kategorie neben dem statischen
Linten:

|                                                   | Playwright Retry Reporter | Allure / ReportPortal | **Mjölnir Forensics** |
| ------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Liest echte Laufdaten für `TRUE-FLAKE`-Urteile    |        teilweise\*        |    teilweise (Tag)    |          ✅           |
| Flaky-Triage-Bericht aus der Ausführungshistorie  |            ❌             |          ✅           |          ✅           |
| Integriert sich in den statischen Würdigkeitswert |            ❌             |          ❌           |          ✅           |

\*Playwright trackt Retries intern, erzeugt aber keinen eigenständigen
Flakiness-Bericht mit Urteil-Labels.

---

## 🤖 Warum nicht einfach KI-Code-Review?

Anderes Problem, andere Schicht. KI-Review kann eine verdächtige
Teständerung in einem Diff erkennen; sie beweist nicht, dass das
Verifikationssystem als Ganzes vertrauenswürdig ist — und sie sieht nur
das Diff, das du ihr zeigst.

|                                                    |   KI-Code-Review (Copilot & co.)   |          **Mjölnir**          |
| -------------------------------------------------- | :--------------------------------: | :---------------------------: |
| Kosten pro Scan                                    |  Tokens (skaliert mit Diff-Größe)  | **Null** (lokal, installiert) |
| Sieht die ganze Suite + alle CI-Konfigs            |   Nur das PR-Diff, das du zeigst   |     **Alles, jedes Mal**      |
| Deterministisch (gleicher Input → gleicher Output) |     ❌ (nicht-deterministisch)     |            **✅**             |
| Findet monatelang schlafende Muster                |   Nur, wenn es im Kontext steht    | **✅** (scannt alle Dateien)  |
| Erinnert sich an Befunde zwischen Läufen           | ❌ (kein Gedächtnis über Sessions) |   **✅** (Baseline + Diff)    |
| Läuft ohne menschlichen Auslöser                   |    Braucht einen PR oder Prompt    | **✅** (CI-Hook, 3 Sekunden)  |

**Benutze beides.** KI findet Nuance, Intent und Designfehler, die
keine Regex findet. Mjölnir findet die strukturellen Muster, die KI
übersieht, weil sie „absichtlich“ aussehen — ein committetes `.only`,
ein geschluckter Exit-Code, ein `continue-on-error` auf einem
Test-Job. Das sind keine Bugs, die Denken brauchen; das sind Fakten,
die Scannen brauchen.

---

## 🤖 CI-Integration

Ein Befehl erzeugt einen PR-Workflow — standardmäßig advisory, nie
blockierend:

```bash
mjolnir ci install
```

Oder binde es nativ in GitHub Code Scanning über SARIF ein:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Editor- und Pipeline-Setup für SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Changed-Scope-Abdeckung

`--scope changed` attribuiert Befunde zu Zeilen, die dein Branch
gegenüber dem Merge-Base mit `main` hinzugefügt hat. Es deckt
Testdateien (`*.spec.*`, `*.test.*`) plus GitHub-Workflow-Dateien und
Playwright-Konfigurationen im Diff ab. Wenn sich das Merge-Base nicht
auflösen lässt — flacher Clone, detached HEAD, Nicht-git-Ziel,
abweichender Default-Branch — degradiert es ehrlich: Befunde fallen auf
Full-File-Attribution zurück, und der Bericht sagt es. Überschreibe die
Base-Ref mit `--base <ref>`.

---

## Konfiguration

Mjölnir ist Zero-Config. Eine optionale `mjolnir.config.json` (oder
`.mjolnir.json`) im Repo-Root stimmt Severity, Gating und Scope ab —
sie ändert nie die Erkennungssemantik.

| Key                 | Typ                                  | Wirkung                                                                                                                                                                                 |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Zusätzliche Ignore-Globs (gitignore-Teilmenge), über den eingebauten Defaults                                                                                                           |
| `gate`              | `"advisory" \| "error" \| "warning"` | Welche Severities mit Wert ungleich null beenden (Default `error`; `advisory` blockiert nie)                                                                                            |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Rangiert die Befunde einer Regel für dein Repo um                                                                                                                                       |
| `ignore`            | `IgnoreEntry[]`                      | Unterdrückt Befunde — **`reason` ist Pflicht**; Einträge laufen nach 90 Tagen ab (ein explizites `expires`-Datum, oder die Last-Modified-Zeit der Config-Datei für Einträge ohne eines) |
| `plugins`           | `string[]`                           | Drittanbieter-Regelpakete (siehe [Vertrauensmodell](#vertrauensmodell))                                                                                                                 |

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

- **`.mjolnirignore`** — eine schlichte gitignore-artige Datei für
  Pfad-Ausschlüsse, gleicher Dialekt wie `exclude`. Nutze sie für
  maschinenweites Rauschen; nutze `exclude`, wenn die Liste in die
  Versionskontrolle gehört, neben dem Rest der Konfiguration.
- **CLI-Overrides** — `--strict` (Quarantine-Regeln einschließen),
  `--width <cols>` und `--ascii` / `--no-ascii` (Terminal-Rendering),
  `--tone blunt` (schärfere Meldungen), `--max-duration <sec>`
  (begrenzter Teil-Scan).
- Regel-Unterdrückung und Deprecation-Lebenszyklus:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

`ignore`-Einträge speisen auch den eigenständigen Befehl
`mjolnir suppressions`, der auflistet, was aktuell unterdrückt ist und
wann jeder Eintrag abläuft.

---

## 📐 Exit-Codes & Verträge

Eingefroren — sicher, um CI-Logik darauf zu bauen:

| Exit-Code | Bedeutung                                                          |
| --------- | ------------------------------------------------------------------ |
| `0`       | Sauber — keine Befunde auf oder über dem Gate                      |
| `1`       | Befunde auf oder über dem Gate                                     |
| `2`       | Teil-Scan (Zeitbudget erreicht, unlesbare Dateien) — blockiert nie |
| `10`      | Verwendungsfehler (bad flag, fehlendes Ziel)                       |
| `20`      | Interner Fehler                                                    |

Der JSON/SARIF-Bericht ist `schemaVersion: 1`. Regel-IDs
(`QA-<FAMILY>-NNN`) sind nach dem Shipment unveränderlich und werden
nie wiederverwendet.

---

## Vertrauensmodell

- **Local-first** — null Netzwerkaufrufe während des Scannens. Nie.
  Null Telemetrie.
- **Kein falscher Beweis** — wir sagen lieber „unbekannt“ als
  „verifiziert“. Ein leeres Repo bekommt `score: null`, nie eine fake 100.
- **Partielle Ehrlichkeit** — wenn die Analyse vorzeitig abgebrochen
  wurde, sagt die Ausgabe es. Nie „complete“, wenn es nicht stimmt.
- **FP-Firewall** — Erkennung läuft auf einer comment-/string-freien
  Sicht des Codes (TypeScript-Regeln nutzen den Compiler-AST): ein
  Muster in einem Prosa-Kommentar oder einem Doc-Beispiel-String ist
  Dokumentation, kein Befund.
- **Gemessen, nicht behauptet** — nur Regeln mit einer
  False-Positive-Rate aus echtem OSS-Code fahren in den
  Headline-Tiers (siehe [Wie viel davon gemessen ist](#wie-viel-davon-gemessen-ist));
  der Scan-Footer und `mjolnir rules --unmeasured` sagen dir, welche
  welche sind.
- **Plugin-Vertrauen** — Plugins sind npm-Pakete, deklariert unter
  `"plugins"`. Es gibt **keine Sandbox**: Plugin-Code läuft mit vollen
  Node-Privilegien, dasselbe Vertrauensmodell wie ESLint- oder
  Vitest-Plugins. Kern-Regel-ID-Präfixe sind reserviert und werden von
  Plugins abgelehnt, um Spoofing zu verhindern.
- **Workspace-lokale externe Regeln** (ordnerbasiert, null Netzwerk) —
  ein `mjolnir-rules/`-Verzeichnis neben dem Scan-Ziel lädt eigene
  Regeln: JSON-Dateien deklarieren Regex-Muster (kein Code wird
  ausgeführt), `.mjs`/`.js`-Module exportieren `rules` (Full-Node-Vertrauen,
  wie Plugins). Externe Regeln tragen dieselben Trust-Metadaten wie
  Core; sie können nie im Core-Tier fahren (Core verlangt eine
  gemessene FP-Rate aus dem Corpus-Sidecar — ein deklariertes
  `tier: "core"` wird auf `extended` geklemmt), gehorchen Tier-Caps und
  sind drift-geprüft: `mjolnir rules --md --external` rendert den
  Katalog aus den geladenen Dateien (Provenienz `external`), und der
  Matrix-Generator akzeptiert `--external <root>`.

---

## 🏗️ Architektur

<details>
<summary>Baum ausklappen</summary>

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

- **Regeln sind reine Funktionen** — `(SourceFileContext) → Finding[]`,
  kein I/O, keine Globals. Ein neues Ökosystem = ein Adapter + seine
  Regeln.
- **TypeScript/Playwright nutzt den Compiler-AST** (ts-morph). Python,
  Java und C# laufen auf einer gemeinsamen comment-/string-maskierten
  Regex-Schicht.
- Eine Tree-sitter-WASM-AST-Schicht für Java und C# existiert und ist
  der nächste Präzisionsschritt — sie ist noch nicht in die synchrone
  Scan-Pipeline verdrahtet.

---

## 📚 Dokumentation

| Dokument                                               | Was drinsteht                             |
| ------------------------------------------------------ | ----------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Score-Normalisierung + Evidenzgewichtung  |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Gemessene False-Positive-Raten + Methode  |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Regelzustände, Unterdrückung, Deprecation |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-Ausgabe + Editor/CI-Setup           |
| [docs/rules/](docs/rules/)                             | Generierter Pro-Regel-Katalog             |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Dev-Setup + Beitrags-Workflow             |
| [CHANGELOG.md](CHANGELOG.md)                           | Release-Historie                          |
| [SECURITY.md](SECURITY.md)                             | Schwachstellenmeldung                     |

---

## 📈 Status

**v0.5.x · offene Beta.** Das JSON-Schema und die Exit-Codes sind
eingefrorene Verträge. TypeScript und Python haben die breiteste
gemessene Abdeckung; Java und C# sind neuer — lies sie durch die
[Tiers-Tabelle](#regel-tiers-und-sprachreife).

---

## 🤝 Mitwirken

Neue Regeln sind der einfachste erste Beitrag — ein Befehl scaffolded
die Regel plus ihre Must-Fire- **und** Must-Not-Fire-Fixtures (die
generierte Regel schlägt absichtlich in ihren Fixtures fehl, bis du
echte Detektion implementierst — ein Stub kann nicht geshippt werden):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Volles Dev-Setup, die Standing-Gate-Befehle und die
Anti-Creep-/Fixture-Firewall-Gesetze stehen in
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Ship keine Tests, denen du nicht vertraust.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Gebaut von [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
