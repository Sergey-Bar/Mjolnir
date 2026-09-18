<div align="center">

<img src="assets/readme/hero.svg" alt="QA Doctor. Tests sagen dir, was bestanden hat. QA Doctor sagt dir, worauf du dich verlassen kannst." width="100%" />

<br />

QA Doctor findet Tests, die nicht fehlschlagen können, und Pipelines, die nie rot werden können,<br />
und bewertet dann, wie weit dem Ergebnis zu trauen ist – mit der Evidenz für jeden Punkt.

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

[So sieht es aus](#so-sieht-es-aus) · [Schnellstart](#schnellstart) · [Was es findet](#was-mjölnir-findet) · [Score](#der-worthiness-score) · [Evidenz](#das-evidenzmodell) · [Forensik](#laufzeit-forensik) · [CI](#ci-integrität) · [Agenten](#ki-agenten) · [Sicherheit](#vertrauen-und-sicherheit) · [Grenzen](#was-mjölnir-dir-nicht-sagen-kann) · [Doku](#dokumentation)

<details>
<summary>In einer anderen Sprache lesen – 22 Übersetzungen</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | Deutsch | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Ein grüner Haken ist eine Behauptung, kein Beweis

Ein grüner Haken bedeutet, dass die Pipeline nicht fehlgeschlagen ist. Er bedeutet nicht, dass die Tests gelaufen sind oder dass sie hätten fehlschlagen können. Jeder dieser Fälle geht grün durch:

- ein committetes `.only`, das 3 statt 900 Tests ausgeführt hat
- `continue-on-error: true` auf dem Job, der eigentlich blockieren sollte
- `|| true` nach dem Testbefehl
- ein Test, der nichts prüft oder einen leeren Rumpf hat
- ein Retry-Wrapper, der einen echten Fehlschlag in einen Glückstreffer verwandelt
- ein Report, den der Workflow hochlädt, aber nie erzeugt hat
- ein hartes Sleep, das eine Race Condition zusammenhält

Keiner davon färbt die Pipeline rot, und jeder wirkt im Review beabsichtigt. Genau deshalb überleben sie. Hier liest QA Doctor einen echten Workflow:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Der CI-Workflow des Demo-Repositorys, Zeile für Zeile gelesen. QA Doctor markiert jeden Befund in der gemeldeten Zeile, mit seiner Regel, dem Problem, seinem Evidenzlevel und seiner gemessenen Falsch-Positiv-Rate." width="800" />
</p>

<sub>Jeder Befund, den der Demo-Scan für diesen Workflow gemeldet hat, in der gemeldeten Zeile. Erzeugt mit `npm run docs:readme-brand` aus [`demo-report.json`](assets/readme/demo-report.json) und in der CI gegen Abweichungen gesichert.</sub>

**Strenger Modus.** Die aggressivsten Erkennungen — `.only`, `continue-on-error`, leere Tests, Retry-Missbrauch — leben in der Quarantäne-Stufe. Sie laufen nur unter `--strict` und sind auf `info`-Schweregrad begrenzt: sie kennzeichnen, blocken aber nie. Der Standardscan (`npx mjolnir-qa@latest` ohne `--strict`) deckt nur Kern- und erweiterte Regeln ab. Fügen Sie `--strict` hinzu, wenn Sie auch die Beratungsebene wollen.

QA Doctor liest die Testsuite, die CI-Workflows und, falls vorhanden, den Report eines echten Laufs. Es führt deine Tests nicht aus, installiert keine Abhängigkeiten und führt den gescannten Code nicht aus. Und wenn es keine Evidenz hat, sagt es das, statt Zuversicht zu erfinden:

| Situation                                        | Was QA Doctor meldet                                             |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Keine Testdeklarationen gefunden                 | Score `null`, angezeigt als **UNKNOWN**. Nie eine erfundene 100. |
| Keine Baseline oder vergleichbare Revision       | **UNKNOWN**, mit benanntem Grund. Nie eine angenommene 0.        |
| Scan abgebrochen (Zeitbudget, unlesbare Dateien) | **PARTIAL**, Exit `2`. Nie als sauber dargestellt.               |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="So funktioniert QA Doctor. Es liest die Testsuite und die CI-Pipeline statisch sowie den Report eines echten Laufs, wenn es einen gibt. Es gewichtet jeden Befund nach Evidenzlevel und Vertrauensstufe, wobei nur ein echter Lauf L3 bis L5 erreichen kann, und liefert Befunde, einen Worthiness-Score und ein CI-Gate mit eingefrorenen Exit-Codes. In der Agentenschleife schreibt die KI den Fix und QA Doctor scannt erneut, um ihn zu beweisen." width="880" />
</p>

<sub>Für diese Seite gestaltet und in 1:1 gezeigt. Erzeugt mit `npm run docs:readme-brand` und in der CI gegen Abweichungen gesichert; Score, Zahlen und Regel-ID stammen aus [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) und der Regel-Registry, nie von Hand getippt. Dasselbe Bild als Poster: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## So sieht es aus

Ein echter Scan von [`examples/demo-repo`](examples/demo-repo), einer kleinen Playwright-Suite mit CI-Workflow. Hier sind seine Punkte geblieben:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnirs Abzugsaufschlüsselung: WORTHINESS 80/100 WORTHY, der Score nach Kategorie, die Abzugsbox nach Schweregrad und eine FIX THIS FIRST-Liste" width="520" />
</p>

<sub>Erzeugt mit `npm run docs:hero` aus einem echten Scan und in der CI gegen Abweichungen gesichert. Der vollständige `--verbose`-Report desselben Scans ist [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Ansehen</strong> – ein Scan, der Fix, den er ausgibt, und der erneute Scan, der ihn beweist</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Ein Frame der Demo-Aufnahme: npx mjolnir-qa@latest scannt das Demo-Repository in einem Terminalfenster" width="900" />
  </a>
</p>

<sub>Frame für Frame aus einem echten Scan gerendert mit `npm run docs:video`; nie per Bildschirmaufnahme. Wähle den Frame, um [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4) zu öffnen.</sub>

</details>

### Ein Befund aus der Nähe

Jeder Befund beantwortet vier Fragen: wo er ist, wie sicher QA Doctor ist, wie oft die Regel falsch liegt und wie man ihn behebt.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Der erste Befund des Demo-Scans, genau so, wie das Terminal ihn ausgibt, mit seinen vier markierten Teilen: wo, wie sicher, wie oft die Regel falsch liegt, und der Fix." width="100%" />
</p>

`mjolnir explain QA-CI-001` gibt die gesamte Vertrauensakte einer Regel aus, einschließlich ihrer gemessenen Falsch-Positiv-Rate und der Stufe, die ihr diese Rate eingebracht hat:

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

Das ist die Werteinheit: eine Stelle, an der die CI ein Bestehen meldet, das sie nicht verdient hat.

<br />

## Schnellstart

```bash
npx mjolnir-qa@latest
```

Es scannt das aktuelle Verzeichnis und gibt den Trust Report aus: was es gefunden hat, wie weit du dem trauen kannst, warum und was als Nächstes zu tun ist. Es endet mit `0`, wenn nichts auf oder über dem Gate gefunden wurde.

Scanne in der CI nur, was der Branch eingeführt hat, damit eine Legacy-Suite deinen ersten Pull Request nicht ertränkt:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` schreibt das als GitHub-Actions-Workflow, mit der [Action](https://github.com/Sergey-Bar/Mjolnir#readme), gepinnt auf das Major-Tag `v1` (oder schlichtes `npx` mit `--no-action`). Er bleibt beratend, bis du entscheidest, dass er blockieren soll.

| Befehl                              | Was er tut                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| `mjolnir`                           | Trust Report: Urteil, Konfidenz, nächster Schritt              |
| `mjolnir --scope changed`           | Nur was dein Branch eingeführt hat (die CI-Form)               |
| `mjolnir ci install`                | Beratenden PR-Workflow erzeugen (Action-basiert)               |
| `mjolnir explain QA-CI-001`         | Was, warum und Fix, plus die gemessene FP-Rate                 |
| `mjolnir why src/a.spec.ts:42`      | Warum genau diese Zeile markiert wurde. Blockiert nie.         |
| `mjolnir forensics ./test-results/` | Laufzeit-Evidenz aus einem echten Lauf                         |
| `mjolnir trust-report`              | Eigenständiges Trust-Artefakt (md + json)                      |
| `mjolnir handoff`                   | Behebungsplan für einen Coding-Agenten                         |
| `mjolnir --json` / `--format sarif` | Maschinenlesbare Ausgabe, GitHub Code Scanning                 |
| `mjolnir --format codequality`      | GitLab-Code-Quality-Report (MR-Widget-Artefakt)                |
| `mjolnir --strict`                  | Auch Regeln der Stufe quarantine ausführen (höheres FP-Risiko) |

<details>
<summary><strong>Alle weiteren Befehle</strong> – Flake-Triage, Reporting, Governance</summary>

<br />

| Befehl                              | Was er tut                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Das Score-Banner aus der Zeit vor dem Trust Report                               |
| `mjolnir explain verdict`           | Warum das Urteil des gespeicherten Scans so ist, wie es ist                      |
| `mjolnir triage ./test-results/`    | Geführte Triage. Jede Zeile endet mit einem nächsten Schritt.                    |
| `mjolnir pw-report ./test-results/` | Playwright-Laufzusammenfassung: Retries, Flakes, langsamste Tests                |
| `mjolnir doctor:playwright`         | Tiefenscan nur für Playwright plus Selector Health Score                         |
| `mjolnir fix --dry-run` / `fix`     | Sichere Auto-Fixes, jeder erneut gescannt, um zu beweisen, dass er gegriffen hat |
| `mjolnir baseline` / `diff`         | Befunde als Snapshot sichern, dann nur neue oder schlimmere melden               |
| `mjolnir impact --since <ref>`      | Was ein Commit eingeführt und behoben hat                                        |
| `mjolnir summary`                   | CI-Annotationen und eine Step-Zusammenfassung aus einem Report                   |
| `mjolnir pr-comment`                | Ein auf den PR zugeschnittener Kommentar, als Markdown                           |
| `mjolnir debt`                      | Testschulden-Register mit Kostenmodell                                           |
| `mjolnir handover`                  | Einarbeitungskarte der Suite für neue QA-Engineers                               |
| `mjolnir init`                      | Frameworks erkennen, Setup-Checkliste ausgeben                                   |
| `mjolnir suppressions`              | Unterdrückte Befunde auflisten, für die Governance                               |
| `mjolnir rules --unmeasured`        | Die Regeln, die auf Annahme statt Messung laufen                                 |
| `mjolnir rules --md`                | Vollständiger Regelkatalog (JSON oder Markdown)                                  |
| `mjolnir doctor`                    | Selbstaudit von Mjölnirs eigener Regelbasis                                      |
| `mjolnir create-rule <ID>`          | Gerüst für eine neue Regel und ihre Fixtures                                     |
| `mjolnir stats`                     | Lokale Zähler aller jemals gesehenen Fixes                                       |
| `mjolnir badge`                     | shields.io-Endpoint-JSON und Snippet                                             |
| `mjolnir --cache`                   | Inkrementelle Re-Scans über einen lokalen Urteils-Cache                          |
| `mjolnir --format mermaid`          | Testarchitektur-Diagramm für einen PR-Kommentar                                  |

`mjolnir help <command>` gibt für jeden davon Verwendung, Beispiele und den nächsten Schritt aus.

</details>

Benötigt **Node.js ≥ 22.18** unter Windows, macOS oder Linux. Lieber global installieren? `npm i -g mjolnir-qa`. Die Untergrenze kommt von der Build-Toolchain (tsdown zielt darauf, und die Release-Pipeline macht Smoke-Tests dagegen); die Laufzeitabhängigkeiten brauchen nicht mehr.

<br />

## Was QA Doctor findet

<p align="center">
  <img src="assets/readme/stack.svg" alt="Funktioniert mit deinem Stack: die Sprachen, Test-Frameworks und CI-Systeme, die seine Regeln abdecken, aus der Regel-Registry." width="100%" />
</p>

**79 Regeln** in vier Familien – Testhygiene, Testqualität, Playwright und CI-Integrität – für TypeScript und JavaScript, Python, Java, C# und GitHub-Actions-YAML. Sie decken Playwright in allen vier Bindings ab, dazu pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest und Mocha, mit Einstiegsabdeckung für Cypress und Selenium. Neun davon, um die Form zu zeigen:

| ID           | Regel                                                                | Schweregrad | Stufe      |
| ------------ | -------------------------------------------------------------------- | ----------- | ---------- |
| QA-CI-001    | `continue-on-error` maskiert ein fehlschlagendes Verifikations-Gate  | error       | quarantine |
| QA-CI-009    | Test-Exit-Code nicht weitergereicht (`\|` ohne pipefail, `;`-Ketten) | error       | extended   |
| QA-TEST-001  | Fokussierter Test committet (`.only`, `fit`)                         | error       | quarantine |
| QA-TEST-003  | Test ohne Assertions                                                 | error       | quarantine |
| QA-TQUAL-009 | Promise-Assertion ohne await                                         | error       | quarantine |
| QA-PW-002    | Locator-Assertion ohne await                                         | error       | core       |
| QA-PW-004    | Fragile CSS/XPath-Selektoren                                         | warning     | quarantine |
| QA-PY-002    | Übersprungener Test (`skip`, nicht-striktes `xfail`)                 | warning     | core       |
| QA-CS-103    | Testmethode ohne Assertions                                          | error       | core       |

Der vollständige Katalog wird aus der Registry erzeugt, nie von Hand gepflegt: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) oder der [What-it-checks-Leitfaden](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Jede in diesem README genannte Regel</strong>, in einer Tabelle</summary>

<br />

> `quarantine`-Regeln laufen nur unter `--strict` und blockieren nie (sie sind auf info begrenzt). Der gezeigte Schweregrad ist der vom Autor festgelegte.

| ID           | Familie    | Regel                                                                | Schweregrad | Stufe      |
| ------------ | ---------- | -------------------------------------------------------------------- | ----------- | ---------- |
| QA-TEST-001  | Hygiene    | Fokussierter Test committet (`.only`, `fit`)                         | error       | quarantine |
| QA-TEST-002  | Hygiene    | Übersprungener Test. Eskaliert ohne nachverfolgten Grund zu `error`. | warning     | quarantine |
| QA-TEST-003  | Hygiene    | Test ohne Assertions                                                 | error       | quarantine |
| QA-TEST-004  | Hygiene    | Hartes Sleep (`waitForTimeout`, `sleep()`, `delay()`)                | warning     | extended   |
| QA-TEST-006  | Hygiene    | Retry-Missbrauch, der Flakiness verbirgt                             | warning     | quarantine |
| QA-TEST-010  | Hygiene    | Leerer Testrumpf                                                     | error       | quarantine |
| QA-TQUAL-002 | Qualität   | Tautologische Assertion                                              | error       | quarantine |
| QA-TQUAL-009 | Qualität   | Promise-Assertion ohne await                                         | error       | quarantine |
| QA-TQUAL-011 | Qualität   | Auskommentierte Tests                                                | warning     | extended   |
| QA-PW-002    | Playwright | Locator-Assertion ohne await                                         | error       | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` committet                             | error       | core       |
| QA-PW-004    | Playwright | Fragile CSS/XPath-Selektoren                                         | warning     | quarantine |
| QA-PW-123    | Playwright | Fest codierte Umgebungs-URLs                                         | warning     | quarantine |
| QA-PW-140    | Playwright | Screenshot ohne `maxDiffPixelRatio`                                  | warning     | core       |
| QA-CI-001    | CI         | `continue-on-error` maskiert ein fehlschlagendes Gate                | error       | quarantine |
| QA-CI-002    | CI         | `\|\| true` verschluckt Exit-Codes                                   | error       | extended   |
| QA-CI-005    | CI         | Report verwendet, aber nie erzeugt                                   | error       | quarantine |
| QA-CI-007    | CI         | Retry-Wrapper um Tests                                               | warning     | extended   |
| QA-CI-008    | CI         | Immer erfolgreicher Step maskiert Fehlschläge                        | error       | quarantine |
| QA-CI-009    | CI         | Exit-Code nicht weitergereicht (`\|` ohne pipefail, `;`-Ketten)      | error       | extended   |
| QA-CI-010    | CI         | Tests übersprungen, wo sie blockieren müssen                         | error       | quarantine |
| QA-PY-002    | Python     | Übersprungener Test (`skip`, nicht-striktes `xfail`)                 | warning     | core       |
| QA-PY-003    | Python     | Testfunktion ohne Assertions                                         | error       | quarantine |
| QA-PY-005    | Python     | `time.sleep()` in Tests                                              | warning     | extended   |
| QA-PY-012    | Python     | Tautologische Assertion                                              | error       | quarantine |
| QA-JV-101    | Java       | Deaktivierter Test (`@Disabled`)                                     | warning     | core       |
| QA-JV-102    | Java       | Hartes Sleep (`Thread.sleep()`)                                      | warning     | extended   |
| QA-JV-103    | Java       | Testmethode ohne Assertions                                          | error       | extended   |
| QA-JV-105    | Java       | Playwright-`waitForTimeout()` als hartes Sleep                       | warning     | core       |
| QA-JV-106    | Java       | Fragiler Selektor statt Role-Locator                                 | warning     | quarantine |
| QA-CS-101    | C#         | Übersprungener Test (`[Ignore]`, `[Fact(Skip=)]`)                    | warning     | core       |
| QA-CS-102    | C#         | Hartes Sleep (`Thread.Sleep` / `Task.Delay`)                         | warning     | core       |
| QA-CS-103    | C#         | Testmethode ohne Assertions                                          | error       | core       |
| QA-CS-105    | C#         | `WaitForTimeoutAsync()` als hartes Sleep                             | warning     | extended   |
| QA-CS-106    | C#         | Fragiler Selektor statt Role-Locator                                 | warning     | quarantine |

Python bringt außerdem QA-PY-001…012 (pytest-Hygiene) und QA-PY-101…108 (Playwright für Python) mit. Cypress und Selenium haben Einstiegssets mit je drei Regeln.

</details>

Jede Regel wird mit einem Must-fire- **und** einem Must-not-fire-Fixture ausgeliefert, und eine Regel, die auf ihrem eigenen Negativ-Fixture anschlägt, kann nicht ausgeliefert werden. Das ist die Falsch-Positiv-Firewall; `mjolnir doctor` erzwingt sie in der eigenen CI dieses Repositorys.

### Selector Health Score

`mjolnir doctor:playwright` bewertet jeden Locator danach, wie er ein Element findet: so wie ein Nutzer (Rolle, Label, Text), über einen expliziten Vertrag (`data-testid`) oder über einen strukturellen Zufall (CSS-Ketten, XPath). Jede Datei bekommt einen Score von 0 bis 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Das misst **Robustheit, nicht Korrektheit**. `.btn.btn-primary > div:nth-child(2)` besteht heute und besteht weiter, bis jemand das Markup anfasst. Ein niedriger Score behauptet nie, der Test sei kaputt, nur dass er von Markup abhängt, dessen Erhalt niemand versprochen hat.

<br />

## Der Worthiness-Score

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="Die Worthiness-Skala von 0 bis 100, mit einer Markierung, die jeden Score durchläuft: UNWORTHY unter 50, NEEDS WORK von 50 bis 79, WORTHY von 80 bis 99, FORGED bei 100" width="720" />
</p>

<sub>Jeder Score von 0 bis 100, platziert vom echten `deriveScoreState`. Erzeugt mit `npm run docs:gauge` und in der CI gegen Abweichungen gesichert.</sub>

| Score     | Urteil                                        |
| --------- | --------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                  |
| `50 – 79` | **NEEDS WORK**                                |
| `80 – 99` | **WORTHY**                                    |
| `100`     | **FORGED**                                    |
| `null`    | **UNKNOWN**: keine Testdeklarationen gefunden |

**Wie er berechnet wird.** Der Schweregrad legt einen Grundabzug fest (`error −8`, `warning −3`, `info −1`), und das Evidenzlevel rabattiert ihn: E2 zählt voll, E1 halb (abgerundet), E0 gar nicht. Die Summe wird nach der Exposition der Suite normalisiert, also Abzüge pro Testdeklaration statt pro Datei. Das Terminal gibt dieselben rabattierten Zahlen aus, die der Score verwendet hat; es gibt kein verstecktes zweites Modell. Details: [docs/SCORING.md](docs/SCORING.md) und der [Scoring-Leitfaden](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Was 100 nicht bedeutet.** Es bedeutet nicht, dass die Software korrekt, die Suite ausreichend oder das Produkt fehlerfrei ist. Es bedeutet genau eines: **keine der von QA Doctor ausgewerteten Regeln hat unter diesem Scan und diesem Evidenzmodell einen Abzug erzeugt.**

<br />

## Das Evidenzmodell

Jeder Befund trägt zwei Labels: wie sicher QA Doctor ist und wie weit der Befund geprüft wurde. Das ist der Unterschied zwischen einem Tool, das Muster meldet, und einem Tool, an dem du ein Release festmachen kannst.

**Wie sicher – das Evidenzlevel.**

| Level  | Name                     | Bedeutet                                                        | Abzug |
| ------ | ------------------------ | --------------------------------------------------------------- | ----- |
| **E2** | Deterministischer Beweis | Der Defekt steckt im Code, so wie er geschrieben ist            | Voll  |
| **E1** | Musterevidenz            | Ein Muster, das eng mit dem Defekt verbunden ist, hat gegriffen | Halb  |
| **E0** | Beobachtung              | Gut zu wissen. Keine Behauptung, dass etwas falsch ist.         | Null  |

Konfidenz in einer Erkennung ist nicht die Stärke des Beweises. Eine Regel kann sicher sein, gefunden zu haben, wonach sie gesucht hat, und trotzdem auf eine Heuristik blicken. E1-Befunde sind dazu da, gelesen und beurteilt zu werden, nie blind angewendet, und diese Grenze ist auf dem Befund vermerkt – im Terminal, im JSON und in der Agenten-Übergabe.

**Wie weit geprüft – die Vertrauensstufe.** Die meisten Befunde entstehen durch das Lesen deines Codes. Gib QA Doctor den Report eines echten Testlaufs, und es kann bestätigen, dass der Code tatsächlich gelaufen ist.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="Die Vertrauensleiter von L0 bis L5. L0 bis L2 entstehen durch das Lesen des Codes; L3 bis L5 brauchen einen echten Laufreport, markiert durch eine Lücke in der Leiter." width="100%" />
</p>

| Level  | In einfachen Worten        | Was es braucht                                                    |
| ------ | -------------------------- | ----------------------------------------------------------------- |
| **L0** | Notiert                    | Den Code lesen                                                    |
| **L1** | Sieht nach dem Problem aus | Den Code lesen: ein Muster hat gegriffen                          |
| **L2** | Im Code bewiesen           | Den Code lesen: der Defekt ist strukturell                        |
| **L3** | Die Datei lief             | Ein Laufreport zeigt, dass die Datei des Befunds ausgeführt wurde |
| **L4** | Der Test lief              | Ein Laufreport zeigt, dass der Test des Befunds ausgeführt wurde  |
| **L5** | Der Lauf stimmt zu         | Das Ergebnis des Laufs selbst bestätigt die Defektklasse          |

Ein statischer Scan endet bei L2. Nur ein echter Laufreport (Playwright JSON, Jest oder Vitest JSON, JUnit XML) kann einen Befund auf L3 oder höher heben, sodass ein Befund, der nie beim Laufen gesehen wurde, das auch nie behaupten kann. Definitionen: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Wie viel davon gemessen ist

**74 von 79 Regeln haben eine gegen echten OSS-Code gemessene Falsch-Positiv-Rate** (mindestens 10 von Hand klassifizierte Befunde je Regel; siehe [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Die übrigen 5 laufen auf der Schätzung des Autors und sagen das Regel für Regel in `mjolnir explain`. `mjolnir rules --unmeasured` listet sie auf, und jede Scan-Fußzeile meldet, wie viele der tatsächlich _ausgelösten_ Regeln gemessen sind.

Raten bleiben öffentlich, auch wenn sie schlecht sind. QA-TEST-001 (ein committetes `.only`) schneidet auf echten Repositorys schlecht ab und sitzt deshalb in quarantine. Die aktuelle Zahl für jede Regel, QA-PW-141 eingeschlossen, steht im Audit.

### Vertrauensstufen

Die Stufen folgen der gemessenen Falsch-Positiv-Rate, nicht einer Meinung:

| Stufe          | Gemessene FP                   | Verhalten                                        |
| -------------- | ------------------------------ | ------------------------------------------------ |
| **core**       | ≤ 10%                          | Standardreport, blockiert                        |
| **extended**   | ≤ 30%                          | Standardreport, geringere Konfidenz              |
| **quarantine** | > 30% oder explizit deklariert | Nur `--strict`, auf info begrenzt, blockiert nie |
| _ungemessen_   | n < 10                         | Kann erst nach Messung zu core befördert werden  |

FP-Bänder können nur herabstufen — sie befördern eine Regel nie aus `quarantine` heraus, wenn sie dort explizit deklariert wurde. Eine explizit unter Quarantäne gestellte Regel bleibt in quarantine, unabhängig von ihrer gemessenen FP-Rate.

Beförderung, Herabstufung und Reife pro Sprache: [Regel-Lebenszyklus](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Warum das kein Linter ist

Linter sagen dir, ob Code Regeln befolgt. QA Doctor sagt dir, ob deiner Verifikation zu trauen ist.

|                                                                   | Linter (ESLint, SonarQube) | Coverage-Tools | KI-Code-Review |  **QA Doctor**   |
| ----------------------------------------------------------------- | :------------------------: | :------------: | :------------: | :--------------: |
| Bewertet das **Verifikationssystem**, nicht den Produktcode       |            Nein            |      Nein      |      Nein      |        Ja        |
| Integrität von CI-Workflows (`continue-on-error`, `\|\| true`)    |            Nein            |      Nein      |  nur den Diff  |        Ja        |
| Bewertet die Robustheit von Playwright-Locators (Selector Health) |            Nein            |      Nein      |      Nein      |        Ja        |
| Liest echte Laufdaten für `TRUE-FLAKE`-Urteile                    |            Nein            |      Nein      |      Nein      |        Ja        |
| Veröffentlicht eine gemessene Falsch-Positiv-Rate pro Regel       |            Nein            |      Nein      |      Nein      |        Ja        |
| Markiert Tests ohne Assertions                                    |            Ja\*            |      Nein      |    manchmal    |        Ja        |
| Findet harte Sleeps (`waitForTimeout`, `time.sleep`)              |            Ja\*            |      Nein      |    manchmal    |        Ja        |
| Deterministisch (gleiche Eingabe, gleiche Ausgabe)                |             Ja             |       Ja       |      Nein      |        Ja        |
| Kosten pro Scan                                                   |         kostenlos          |   kostenlos    |     Tokens     | **null** (lokal) |

<sub>\*Abgedeckt durch `eslint-plugin-jest` und `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) sowie durch SonarQubes eigene Assertion-Regeln. Die Spalten beschreiben das Standardverhalten bei der Verifikation von Testsuiten; Plugins, bezahlte Stufen und eigene Regeln ändern manche Antworten. Das ist eine Positionierungsübersicht, kein Benchmark.</sub>

Nutze auch KI-Review. Es erkennt Nuancen, Absicht und Designfehler, die kein Muster findet. QA Doctor findet, was KI-Review übersieht, weil es beabsichtigt aussieht: ein committetes `.only`, ein verschluckter Exit-Code, ein `continue-on-error` auf einem Test-Job. Dafür braucht es Scannen, nicht Schlussfolgern.

<br />

## Laufzeit-Forensik

Statische Analyse argumentiert über Code, der nie gelaufen ist. Die Forensik liest, was tatsächlich passiert ist: Playwright JSON, Jest JSON, Vitest JSON und JUnit XML von jedem Runner.

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

`TRUE-FLAKE` bedeutet nicht, dass der Test wiederholt wurde. Es bedeutet, dass der Test **mindestens einen Versuch nicht bestanden und dann grün geendet hat**: ein Glückstreffer, markiert unabhängig davon, was der letzte Haken sagt. `mjolnir triage` macht aus diesem Verlauf einen Quarantäne-Vorschlag, und `mjolnir pw-report` fasst einen Lauf zusammen. Dieselben Laufreports sind es, die Befunde auf die Vertrauensstufen L3 und höher heben.

<br />

## CI-Integrität

Ein Test kann bestehen, während die Pipeline um ihn herum nicht fehlschlagen kann. QA Doctor liest auch die Workflows: `continue-on-error`, `|| true`, Exit-Codes, die nie weitergereicht werden, immer erfolgreiche Steps, Reports, die verwendet, aber nie erzeugt werden, und Gates, die bei genau den Events übersprungen werden, die blockieren sollten. Jeder Befund nennt Job, Step und Zeile und trägt sein eigenes Evidenzlevel.

Erzeuge den PR-Workflow, standardmäßig beratend:

```bash
mjolnir ci install
```

Oder füge die Marketplace-Action zu einem bestehenden Workflow hinzu:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Pinne `@v1`, um der Major-Linie zu folgen, oder ein exaktes Tag (`@v0.5.32`) für ein reproduzierbares Gate. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) behandelt den Marketplace, Smithery und die MCP-Registries.

Um Befunde in GitHub Code Scanning zu bringen, lade SARIF hoch (erfordert `security-events: write` auf Workflow- oder Job-Ebene):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

Auf GitLab schreibt `--format codequality` den Code-Quality-Report, den das MR-Widget und die Diff-Annotationen lesen ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Editor- und Pipeline-Einrichtung: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Zuordnung im Changed-Scope

```bash
npx mjolnir-qa@latest --scope changed
```

Befunde werden den Zeilen zugeordnet, die dein Branch hinzugefügt hat, gemessen gegen die **merge-base**. Der Scope ist dieselbe Dateimenge, die ein vollständiger Scan findet (TS/JS-Specs und Adapter-Konfigurationen, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), plus nicht committete und nicht verfolgte Änderungen, sodass es schon vor dem Commit funktioniert. Die Basis wird aufgelöst als `main → master → origin/main → origin/master → origin/HEAD`; überschreibe sie mit `--base <ref>`.

Wenn die merge-base nicht aufgelöst werden kann (ein Shallow Clone, ein Detached HEAD, ein Ziel außerhalb von git), fallen die Befunde auf eine Zuordnung zur ganzen Datei zurück, **und der Report sagt das.** Ein stiller Fallback wäre genau die Art von Defekt, die dieses Tool finden soll.

<br />

## KI-Agenten

Befunde sind nur etwas wert, wenn etwas auf sie reagiert.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**Die KI schreibt den Fix. QA Doctor verifiziert ihn.** Der Beweis kommt vom erneuten Scan, nie vom Erfolgsbericht des Agenten selbst.

| Befehl            | Was der Agent bekommt                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mjolnir mcp`     | Ein [MCP](https://modelcontextprotocol.io)-Server über stdio. `scan`, `explain` und `diff` werden zu aufrufbaren Tools.                                                                    |
| `mjolnir handoff` | Ein gespeicherter `--json`-Report wird zu einem deterministischen Markdown-Plan: was erkannt wurde, die Evidenzgrenze pro Befund, was sich **nicht** ändern darf, wie zu verifizieren ist. |
| `mjolnir install` | Schreibt in die Agenten-Oberflächen, die dein Repo bereits hat (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`), damit der Agent erneut scannt, bevor er behauptet, fertig zu sein.         |

Füge es einem Client hinzu, der eine eigene CLI mitbringt:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Oder jedem Client, der einen `mcpServers`-Block akzeptiert:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**Die Leitplanke zählt mehr als die Bequemlichkeit.** Jeder Befund in einer Übergabe trägt seine Grenze. **E2** sagt _deterministisch: Stelle prüfen und den Fix anwenden_. **E1** sagt _BESTÄTIGUNG ERFORDERLICH: die Beobachtung allein beweist den Defekt nicht_. Ein Agent, der E1 blind behebt, eine Regel unterdrückt oder eine Regel ändert, um den Score zu heben, tut genau das, was dieses Tool finden soll – deshalb sagt die Übergabe das im Prompt, direkt neben dem Befund.

<br />

## Vertrauen und Sicherheit

**Local-first, null Telemetrie.** Keine netzwerkfähige API (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) existiert irgendwo in `src/`, und [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) lässt den Build fehlschlagen, sobald eine auftaucht. Es verbietet auch `eval` und `new Function`. Das Scannen nicht vertrauenswürdigen Codes führt ihn nie aus: Die statische Analyse liest Quelltext, und die Forensik parst Reportdateien, die bereits auf der Platte liegen.

Zwei Einschränkungen: `npx` selbst lädt das Paket herunter, bevor irgendetwas läuft, und die Garantie gilt für `src/`, nicht für Plugins von Drittanbietern.

**Plugins laufen nicht in einer Sandbox.** JS-Plugins (`mjolnir-rules/*.mjs` oder unter `"plugins"` gelistete npm-Pakete) laufen mit vollen Node-Rechten, dasselbe Vertrauensmodell wie bei ESLint- oder Vitest-Plugins. Sie zu laden ist ein Opt-in **pro Scan**: Ohne `--enable-plugins` (oder `MJOLNIR_ENABLE_PLUGINS=1`) werden ihre Quellen nie geladen, und ein Hinweis auf stderr listet auf, was übersprungen wurde. JSON-Regelmanifeste führen keinen Code aus, und die Präfixe der Core-Regel-IDs sind reserviert, damit sich kein Plugin als eine davon ausgeben kann. Melde Schwachstellen über [SECURITY.md](SECURITY.md).

**Es läuft auf sich selbst.** Eine Verification Trust Engine hat keine Glaubwürdigkeit, wenn sie nicht selbst verifizierbar ist. Jeder CI-Lauf scannt dieses Repository mit dem Build, den derselbe Lauf erzeugt hat. Das Gate schlägt bei jedem Befund mit Schweregrad error fehl, und ebenso bei einem **partiellen** Scan oder einer **abgestürzten Regel**, denn ein abgeschnittener Selbstscan, der nichts meldet, ist genau das falsche Grün, das dieses Projekt finden soll. `mjolnir doctor` prüft die Regelbasis im selben Lauf erneut (Fixture-Firewall, Ehrlichkeit der Stufen, die Obergrenze für core), und eine INCONCLUSIVE-Prüfung schlägt genauso fehl wie eine fehlgeschlagene. Beide Reports werden als Build-Artefakte hochgeladen.

### Exit-Codes und der Maschinenvertrag

Eingefroren, damit du CI-Logik darauf bauen kannst:

| Exit-Code | Bedeutung                                                                |
| --------- | ------------------------------------------------------------------------ |
| `0`       | Sauber: keine Befunde auf oder über dem Gate                             |
| `1`       | Befunde auf oder über dem Gate                                           |
| `2`       | Partieller Scan (Zeitbudget erreicht, unlesbare Dateien). Blockiert nie. |
| `10`      | Bedienfehler (falsches Flag, fehlendes Ziel)                             |
| `20`      | Interner Fehler                                                          |

`2` ist bewusst von `0` verschieden: Ein Scan, der nicht fertig wurde, hat nicht nichts gefunden. Er ist nur mit dem Suchen nicht fertig geworden.

Alles, was eine Maschine konsumiert (MCP-Tool-Ergebnisse, `--json`, SARIF 2.1), stammt aus einem kanonischen Ergebnis unter einem versionierten, **nur additiv erweiterten** Schema (`schemaVersion: 1`, `contractVersion: 1`), sodass kein Konsument Bedeutung aus gerendertem Text rekonstruieren muss. Siehe [den Maschinenvertrag](docs/machine-contract.md). Regel-IDs (`QA-<FAMILY>-NNN`) sind nach der Auslieferung unveränderlich und werden nie wiederverwendet.

<br />

## Was QA Doctor dir nicht sagen kann

- **Es führt deine Tests nicht aus.** Ein sauberer Scan ist keine bestandene Suite.
- **Es kann dir nicht sagen, dass eine Assertion _falsch_ ist.** `expect(total).toBe(41)` sieht gesund aus. QA Doctor findet Tests, die _nicht fehlschlagen können_, und Pipelines, die _nicht rot werden können_, keine Tests, die das Falsche prüfen.
- **Es beweist keine fachliche Korrektheit.** Nichts hier sagt, dass dein Produkt tut, was die Anforderung verlangt hat.
- **Eine 100 ist kein Beweis für eine gute Suite.** Ob deine Suite dein echtes Risiko abdeckt, ist eine andere Frage, und dieses Tool beantwortet sie nicht.
- **5 von 79 Regeln laufen auf einer Schätzung**, nicht auf einer gemessenen Rate. Jede davon sagt das auf ihrem eigenen Befund.
- **E1 ist nicht E2.** Heuristische Befunde sind es wert, gelesen zu werden, nicht, blind angewendet zu werden.
- **Ein leeres Repo bekommt `null`, nie 100.**
- **Eine Datei namens `*.spec.ts` ohne Testdeklarationen zählt nicht als Abdeckung.** Ein Repo, dessen einzige Spec-Dateien Imports oder Typen enthalten (null `it`/`test`-Aufrufe), bekommt `null`, nicht 100.

<br />

## Dokumentation

Die vollständige Doku-Website findest du unter <https://sergey-bar.github.io/Mjolnir/>.

| Dokument                                               | Was drinsteht                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | Score-Normalisierung und Evidenzgewichtung                         |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Kanonisches Vokabular: ein Wort pro Begriff                        |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Gemessene Falsch-Positiv-Raten und die Methode                     |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Regelzustände, Stufen, Unterdrückung, Abkündigung                  |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver-Richtlinie, eingefrorene Schnittstellen, Abkündigungszyklus |
| [docs/machine-contract.md](docs/machine-contract.md)   | Das kanonische maschinenlesbare Ergebnis                           |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-Ausgabe und Editor- oder CI-Einrichtung                      |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code-Quality-Report, MR-Rezept, Gate                       |
| [docs/rules/](docs/rules/)                             | Generierter Katalog pro Regel                                      |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Entwicklungsumgebung und Beitrags-Workflow                         |
| [SUPPORT.md](SUPPORT.md)                               | Wo man fragt, meldet und Hilfe bekommt                             |
| [SECURITY.md](SECURITY.md)                             | Melden von Schwachstellen                                          |
| [CHANGELOG.md](CHANGELOG.md)                           | Versionshistorie                                                   |

### Status

**Version 1.** Das JSON-Schema und die Exit-Codes sind eingefrorene Verträge. TypeScript und Python haben die breiteste gemessene Abdeckung. Java und C# sind neuer; lies sie durch die [Reifetabelle](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Was als Nächstes kommt, ohne erfundene Termine: [die öffentliche Roadmap](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Mitwirken

Neue Regeln sind der einfachste erste Beitrag. Ein Befehl erzeugt das Gerüst der Regel mit ihren Must-fire- **und** Must-not-fire-Fixtures. Die erzeugte Regel besteht ihre eigenen Fixtures absichtlich nicht, bis echte Erkennung geschrieben ist, denn ein ausgelieferter Stub ist eine Regel, die niemand gemessen hat:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Die Entwicklungsumgebung, die Befehle der ständigen Gates sowie die Anti-Creep- und Fixture-Firewall-Gesetze stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Lass es auf dein Repo los." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Zum Leitfaden](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Doku-Website](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Frag nicht, ob die Tests bestanden haben.<br />
Frag, ob die Evidenz beweist, dass sie Vertrauen verdienen.

<sub>Entwickelt von [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · MIT-lizenziert</sub>

</div>
