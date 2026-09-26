<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Tester forteller deg hva som besto. Mjölnir forteller deg hva du kan stole på." width="100%" />

<br />

Mjölnir finner tester som ikke kan feile og pipelines som ikke kan bli røde,<br />
og vurderer deretter hvor langt resultatet er til å stole på, med beviset for hvert poeng.

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

[Se det i aksjon](#se-det-i-aksjon) · [Kom raskt i gang](#kom-raskt-i-gang) · [Hva det finner](#hva-mjölnir-finner) · [Score](#worthiness-scoren) · [Evidens](#evidensmodellen) · [Kjøringsanalyse](#kjøringsanalyse) · [CI](#ci-integritet) · [Agenter](#ai-agenter) · [Sikkerhet](#tillit-og-sikkerhet) · [Begrensninger](#hva-mjölnir-ikke-kan-fortelle-deg) · [Dokumentasjon](#dokumentasjon)

<details>
<summary>Les på et annet språk — 22 oversettelser</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | Norsk | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

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

## En grønn hake er en påstand, ikke et bevis

En grønn hake betyr at pipelinen ikke feilet. Den betyr ikke at testene kjørte, eller at de kunne ha feilet. Hver eneste av disse går grønt gjennom:

- en committet `.only` som kjørte 3 tester i stedet for 900
- `continue-on-error: true` på jobben som skulle ha blokkert
- `|| true` etter testkommandoen
- en test som ikke sjekker noe, eller som har en tom kropp
- en retry-wrapper som gjør en reell feil om til en heldig bestått
- en rapport som workflowen laster opp, men aldri har generert
- en fast sleep som holder sammen en race condition

Ingen av dem gjør pipelinen rød, og hver av dem ser tilsiktet ut i review. Derfor overlever de. Her leser Mjölnir et ekte eksempel:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Demo-repositoriets CI-workflow, lest linje for linje. Mjölnir markerer hvert funn på linjen det ble rapportert, med regelen, hva som er galt, evidensnivået og den målte falsk-positiv-raten." width="800" />
</p>

<sub>Hvert funn demoskanningen rapporterte for denne workflowen, på linjen det ble rapportert. Generert av `npm run docs:readme-brand` fra [`demo-report.json`](assets/readme/demo-report.json) og låst mot avvik i CI.</sub>

**Streng modus.** De mest aggressive deteksjonene — `.only`, `continue-on-error`, tomme tester, misbruk av omkjøringer — lever i karantenenivået. De kjører bare under `--strict` og er begrenset til `info`-alvorlighetsgrad: de flagger, de blokkerer aldri. Standardskanningen (`npx mjolnir-qa@3.0.0` uten `--strict`) dekker bare kjerne- og utvidede regler. Legg til `--strict` når du også vil ha rådgivningslaget.

Mjölnir leser testsuiten, CI-workflowene og, hvis du har en, rapporten fra en ekte kjøring. Det kjører ikke testene dine, installerer ikke avhengighetene dine og kjører ikke koden det skanner. Og når det mangler evidens, sier det det i stedet for å finne på tillit:

| Situasjon                                        | Hva Mjölnir rapporterer                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| Ingen testdeklarasjoner funnet                   | Score `null`, vist som **UNKNOWN**. Aldri en oppdiktet 100. |
| Ingen baseline eller sammenlignbar revisjon      | **UNKNOWN**, med årsaken oppgitt. Aldri en antatt 0.        |
| Skanning avbrutt (tidsbudsjett, uleselige filer) | **PARTIAL**, exit `2`. Aldri presentert som ren.            |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Slik fungerer Mjölnir. Det leser testsuiten og CI-pipelinen statisk, og rapporten fra en ekte kjøring når det finnes en. Det vekter hvert funn etter evidensnivå og tillitsnivå, der bare en ekte kjøring kan nå L3 til L5, og gir funn, en worthiness-score og en CI-gate med fryste exitkoder. I agentløkken skriver AI rettelsen, og Mjölnir skanner på nytt for å bevise den." width="880" />
</p>

<sub>Komponert for denne siden og vist i 1:1. Generert av `npm run docs:readme-brand` og låst mot avvik i CI; score, antall og regel-ID kommer fra [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) og regelregisteret, aldri skrevet inn for hånd. Samme bilde som plakat: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Se det i aksjon

En ekte skanning av [`examples/demo-repo`](examples/demo-repo), en liten Playwright-suite med en CI-workflow. Her er hvor poengene ble av:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnirs oversikt over trekk: WORTHINESS 80/100 WORTHY, scoren per kategori, trekkboksen per alvorlighetsgrad og en FIX THIS FIRST-liste" width="520" />
</p>

<sub>Generert av `npm run docs:hero` fra en ekte skanning og låst mot avvik i CI. Den fullstendige `--verbose`-rapporten fra samme skanning er [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Se det</strong> — en skanning, rettelsen den skriver ut, og den nye skanningen som beviser den</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Et bilde fra demoopptaket: npx mjolnir-qa@3.0.0 skanner demo-repositoriet i et terminalvindu" width="900" />
  </a>
</p>

<sub>Rendret bilde for bilde fra en ekte skanning av `npm run docs:video`; aldri tatt opp fra skjermen. Velg bildet for å åpne [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Ett funn på nært hold

Hvert funn svarer på fire spørsmål: hvor det er, hvor sikker Mjölnir er, hvor ofte regelen tar feil, og hvordan det rettes.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Det første funnet fra demoskanningen, nøyaktig slik terminalen skriver det ut, med de fire delene markert: hvor, hvor sikkert, hvor ofte regelen tar feil, og rettelsen." width="100%" />
</p>

`mjolnir explain QA-CI-001` skriver ut en regels fullstendige tillitsprofil, inkludert den målte falsk-positiv-raten og nivået den raten har gitt den:

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

Det er verdienheten: ett sted der CI rapporterer en bestått den ikke har gjort seg fortjent til.

<br />

## Kom raskt i gang

```bash
npx mjolnir-qa@3.0.0
```

Det skanner gjeldende mappe og skriver ut Trust Report: hva det fant, hvor langt du kan stole på det, hvorfor, og hva du bør gjøre videre. Det avslutter med `0` når ingenting på eller over gaten ble funnet.

I CI bør du bare skanne det grenen har introdusert, så en eldre testsuite ikke drukner din første pull request:

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

`mjolnir ci install` skriver det som en GitHub Actions-workflow med [action-en](https://github.com/Sergey-Bar/Mjolnir#readme) festet til major-taggen `v3` (eller vanlig `npx` med `--no-action`). Den forblir rådgivende til du bestemmer at den skal blokkere.

| Kommando                                      | Hva den gjør                                               |
| --------------------------------------------- | ---------------------------------------------------------- |
| `mjolnir`                                     | Trust Report: dom, sikkerhet, neste handling               |
| `mjolnir --scope changed`                     | Bare det grenen din har introdusert (CI-formen)            |
| `mjolnir ci install`                          | Generer den rådgivende PR-workflowen (action-basert)       |
| `mjolnir business-case`                       | ROI estimate: projected savings per finding                |
| `mjolnir release-report`                      | Release readiness: GO, CONDITIONAL GO, or NO-GO            |
| `mjolnir release-trust`                       | 12-dimension release assurance verdict                     |
| `mjolnir report`                              | Generate a Playwright-compatible report                    |
| `mjolnir trend`                               | Record, show, or diff local quality snapshots              |
| `mjolnir policy`                              | Initialize, validate, or check policy gates                |
| `mjolnir quarantine`                          | Review deterministic proposals (prototype)                 |
| `mjolnir analyze --cross-file`                | Bounded cross-file analysis                                |
| `mjolnir ci-adapter github .`                 | Generate CI templates for supported providers              |
| `mjolnir dashboard`                           | Generate a self-contained quality dashboard                |
| `mjolnir exec-report`                         | Executive KPIs and recommendations (advisory)              |
| `mjolnir enterprise`                          | Self-hosted templates (prototype)                          |
| `mjolnir maturity`                            | Assess maturity or display maturity levels                 |
| `mjolnir mutation tests/mutation-report.json` | Analyze mutation reports; never promotes trust             |
| `mjolnir mcp`                                 | Read-only MCP tools over stdio                             |
| `mjolnir explain QA-CI-001`                   | Hva, hvorfor og rettelse, pluss den målte FP-raten         |
| `mjolnir why src/a.spec.ts:42`                | Hvorfor akkurat denne linjen ble markert. Blokkerer aldri. |
| `mjolnir forensics ./test-results/`           | Kjøringsevidens fra en ekte kjøring                        |
| `mjolnir trust-report`                        | Selvstendig Trust-artefakt (md + json)                     |
| `mjolnir handoff`                             | Utbedringsplan for en kodeagent                            |
| `mjolnir --json` / `--format sarif`           | Maskinlesbar utdata, GitHub Code Scanning                  |
| `mjolnir --format codequality`                | GitLab Code Quality-rapport (MR-widget-artefakt)           |
| `mjolnir --strict`                            | Kjør også regler på quarantine-nivå (høyere FP-risiko)     |

<details>
<summary><strong>Alle andre kommandoer</strong> — triage av ustabile tester, rapportering, styring</summary>

<br />

| Kommando                            | Hva den gjør                                                              |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Scorebanneret fra før Trust Report                                        |
| `mjolnir explain verdict`           | Hvorfor dommen for den lagrede skanningen er som den er                   |
| `mjolnir triage ./test-results/`    | Veiledet triage. Hver rad slutter med en neste handling.                  |
| `mjolnir pw-report ./test-results/` | Oppsummering av Playwright-kjøring: retries, ustabile tester, de tregeste |
| `mjolnir doctor:playwright`         | Dypskanning bare for Playwright pluss Selector Health Score               |
| `mjolnir fix --dry-run` / `fix`     | Trygge autorettelser, hver skannet på nytt for å bevise at den virket     |
| `mjolnir baseline` / `diff`         | Ta et øyeblikksbilde av funn, og rapporter deretter bare nye eller verre  |
| `mjolnir impact --since <ref>`      | Hva en commit introduserte og løste                                       |
| `mjolnir summary`                   | CI-annotasjoner og en step-oppsummering fra en rapport                    |
| `mjolnir pr-comment`                | En avgrenset PR-kommentar, som Markdown                                   |
| `mjolnir debt`                      | Register over testgjeld med en kostnadsmodell                             |
| `mjolnir handover`                  | Introduksjonskart over suiten for en ny QA-ingeniør                       |
| `mjolnir init`                      | Oppdag rammeverk, skriv ut en sjekkliste for oppsett                      |
| `mjolnir suppressions`              | List undertrykte funn, for styring                                        |
| `mjolnir rules --unmeasured`        | Reglene som kjører på antakelser, ikke målinger                           |
| `mjolnir rules --md`                | Fullstendig regelkatalog (JSON eller Markdown)                            |
| `mjolnir doctor`                    | Selvrevisjon av Mjölnirs egen regelbase                                   |
| `mjolnir create-rule <ID>`          | Lag skjelettet til en ny regel og dens fixtures                           |
| `mjolnir stats`                     | Lokale tellere over alle rettelser som noen gang er sett                  |
| `mjolnir badge`                     | shields.io-endepunkt-JSON og snutt                                        |
| `mjolnir --cache`                   | Inkrementelle nye skanninger via en lokal hurtigbuffer for dommer         |
| `mjolnir --format mermaid`          | Diagram over testarkitekturen for en PR-kommentar                         |

`mjolnir help <command>` skriver ut bruk, eksempler og neste steg for hver av dem.

</details>

Krever **Node.js ≥ 22.18** på Windows, macOS eller Linux. Foretrekker du en global installasjon? `npm i -g mjolnir-qa`. Minstekravet kommer fra byggeverktøykjeden (tsdown sikter mot det, og release-pipelinen røyktester mot det); kjøretidsavhengighetene trenger ikke mer enn det.

<br />

## Hva Mjölnir finner

<p align="center">
  <img src="assets/readme/stack.svg" alt="Fungerer med stacken din: språkene, testrammeverkene og CI-systemene reglene dekker, fra regelregisteret." width="100%" />
</p>

**79 regler** i fire familier — testhygiene, testkvalitet, Playwright og CI-integritet — på tvers av TypeScript og JavaScript, Python, Java, C# og GitHub Actions-YAML. De dekker Playwright i alle fire bindings, pluss pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest og Mocha, med startdekning for Cypress og Selenium. Ni av dem, for å vise formen:

| ID           | Regel                                                                  | Alvorlighetsgrad | Nivå       |
| ------------ | ---------------------------------------------------------------------- | ---------------- | ---------- |
| QA-CI-001    | `continue-on-error` skjuler en feilende verifiseringsgate              | error            | quarantine |
| QA-CI-009    | Testens exitkode videreformidles ikke (`\|` uten pipefail, `;`-kjeder) | error            | extended   |
| QA-TEST-001  | Fokusert test committet (`.only`, `fit`)                               | error            | quarantine |
| QA-TEST-003  | Test uten assertions                                                   | error            | quarantine |
| QA-TQUAL-009 | Promise-assertion uten await                                           | error            | quarantine |
| QA-PW-002    | Locator-assertion uten await                                           | error            | core       |
| QA-PW-004    | Skjøre CSS/XPath-selektorer                                            | warning          | quarantine |
| QA-PY-002    | Hoppet over test (`skip`, ikke-streng `xfail`)                         | warning          | core       |
| QA-CS-103    | Testmetode uten assertions                                             | error            | core       |

Den fullstendige katalogen genereres fra registeret, aldri vedlikeholdt for hånd: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) eller [veiledningen om hva det sjekker](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Alle regler nevnt i denne README-en</strong>, i én tabell</summary>

<br />

> `quarantine`-regler kjører bare under `--strict` og blokkerer aldri (de er begrenset til info). Alvorlighetsgraden som vises, er forfatterens.

| ID           | Familie    | Regel                                                               | Alvorlighetsgrad | Nivå       |
| ------------ | ---------- | ------------------------------------------------------------------- | ---------------- | ---------- |
| QA-TEST-001  | Hygiene    | Fokusert test committet (`.only`, `fit`)                            | error            | quarantine |
| QA-TEST-002  | Hygiene    | Hoppet over test. Eskalerer til `error` uten en sporet begrunnelse. | warning          | quarantine |
| QA-TEST-003  | Hygiene    | Test uten assertions                                                | error            | quarantine |
| QA-TEST-004  | Hygiene    | Fast sleep (`waitForTimeout`, `sleep()`, `delay()`)                 | warning          | extended   |
| QA-TEST-006  | Hygiene    | Misbruk av retries som skjuler ustabilitet                          | warning          | quarantine |
| QA-TEST-010  | Hygiene    | Tom testkropp                                                       | error            | quarantine |
| QA-TQUAL-002 | Kvalitet   | Tautologisk assertion                                               | error            | quarantine |
| QA-TQUAL-009 | Kvalitet   | Promise-assertion uten await                                        | error            | quarantine |
| QA-TQUAL-011 | Kvalitet   | Utkommenterte tester                                                | warning          | extended   |
| QA-PW-002    | Playwright | Locator-assertion uten await                                        | error            | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` committet                            | error            | core       |
| QA-PW-004    | Playwright | Skjøre CSS/XPath-selektorer                                         | warning          | quarantine |
| QA-PW-123    | Playwright | Hardkodede miljø-URL-er                                             | warning          | quarantine |
| QA-PW-140    | Playwright | Skjermbilde uten `maxDiffPixelRatio`                                | warning          | core       |
| QA-CI-001    | CI         | `continue-on-error` skjuler en feilende gate                        | error            | quarantine |
| QA-CI-002    | CI         | `\|\| true` svelger exitkoder                                       | error            | extended   |
| QA-CI-005    | CI         | Rapport brukt, men aldri generert                                   | error            | quarantine |
| QA-CI-007    | CI         | Retry-wrappere rundt tester                                         | warning          | extended   |
| QA-CI-008    | CI         | Step som alltid lykkes, skjuler feil                                | error            | quarantine |
| QA-CI-009    | CI         | Exitkode videreformidles ikke (`\|` uten pipefail, `;`-kjeder)      | error            | extended   |
| QA-CI-010    | CI         | Tester hoppet over der de må blokkere                               | error            | quarantine |
| QA-PY-002    | Python     | Hoppet over test (`skip`, ikke-streng `xfail`)                      | warning          | core       |
| QA-PY-003    | Python     | Testfunksjon uten assertions                                        | error            | quarantine |
| QA-PY-005    | Python     | `time.sleep()` i tester                                             | warning          | extended   |
| QA-PY-012    | Python     | Tautologisk assertion                                               | error            | quarantine |
| QA-JV-101    | Java       | Deaktivert test (`@Disabled`)                                       | warning          | core       |
| QA-JV-102    | Java       | Fast sleep (`Thread.sleep()`)                                       | warning          | extended   |
| QA-JV-103    | Java       | Testmetode uten assertions                                          | error            | extended   |
| QA-JV-105    | Java       | Fast sleep med Playwright `waitForTimeout()`                        | warning          | core       |
| QA-JV-106    | Java       | Skjør selektor i stedet for rollebasert locator                     | warning          | quarantine |
| QA-CS-101    | C#         | Hoppet over test (`[Ignore]`, `[Fact(Skip=)]`)                      | warning          | core       |
| QA-CS-102    | C#         | Fast sleep (`Thread.Sleep` / `Task.Delay`)                          | warning          | core       |
| QA-CS-103    | C#         | Testmetode uten assertions                                          | error            | core       |
| QA-CS-105    | C#         | Fast sleep med `WaitForTimeoutAsync()`                              | warning          | extended   |
| QA-CS-106    | C#         | Skjør selektor i stedet for rollebasert locator                     | warning          | quarantine |

Python har i tillegg QA-PY-001…012 (pytest-hygiene) og QA-PY-101…108 (Playwright for Python). Cypress og Selenium har startsett på tre regler hver.

</details>

Hver regel leveres med en must-fire- **og** en must-not-fire-fixture, og en regel som slår ut på sin egen negative fixture, kan ikke leveres. Det er brannmuren mot falske positiver; `mjolnir doctor` håndhever den i dette repositoriets egen CI.

### Selector Health Score

`mjolnir doctor:playwright` vurderer hver locator etter hvordan den finner et element: slik en bruker ville gjort (rolle, etikett, tekst), via en eksplisitt kontrakt (`data-testid`), eller ved et strukturelt tilfelle (CSS-kjeder, XPath). Hver fil får en score fra 0 til 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Dette måler **robusthet, ikke korrekthet**. `.btn.btn-primary > div:nth-child(2)` består i dag og fortsetter å bestå til noen rører markupen. En lav score påstår aldri at testen er ødelagt, bare at den avhenger av markup ingen har lovet å beholde.

<br />

## Worthiness-scoren

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="Worthiness-skalaen fra 0 til 100, med en markør som går gjennom hver score: UNWORTHY under 50, NEEDS WORK fra 50 til 79, WORTHY fra 80 til 99, FORGED ved 100" width="720" />
</p>

<sub>Hver score fra 0 til 100, plassert av den ekte `deriveScoreState`. Generert av `npm run docs:gauge` og låst mot avvik i CI.</sub>

| Score     | Dom                                         |
| --------- | ------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                |
| `50 – 79` | **NEEDS WORK**                              |
| `80 – 99` | **WORTHY**                                  |
| `100`     | **FORGED**                                  |
| `null`    | **UNKNOWN**: ingen testdeklarasjoner funnet |

**Slik beregnes den.** Alvorlighetsgraden setter et grunntrekk (`error −8`, `warning −3`, `info −1`), og evidensnivået reduserer det: E2 teller fullt, E1 halvt (rundet ned), E0 ingenting. Summen normaliseres etter suitens eksponering, altså trekk per testdeklarasjon i stedet for per fil. Terminalen skriver ut de samme reduserte tallene som scoren brukte; det finnes ingen skjult modell nummer to. Detaljer: [docs/SCORING.md](docs/SCORING.md) og [scoringsveiledningen](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Hva 100 ikke betyr.** Det betyr ikke at programvaren er korrekt, at suiten er tilstrekkelig, eller at produktet er feilfritt. Det betyr én ting: **ingen av Mjölnirs evaluerte regler ga et trekk under denne skanningen og denne evidensmodellen.**

<br />

## Evidensmodellen

Hvert funn har to etiketter: hvor sikker Mjölnir er, og hvor langt funnet er sjekket. Det er forskjellen mellom et verktøy som rapporterer mønstre og et verktøy du kan la en release avhenge av.

**Hvor sikkert — evidensnivået.**

| Nivå   | Navn                 | Betyr                                                | Trekk |
| ------ | -------------------- | ---------------------------------------------------- | ----- |
| **E2** | Deterministisk bevis | Defekten finnes i koden slik den er skrevet          | Fullt |
| **E1** | Mønsterevidens       | Et mønster som er sterkt knyttet til defekten, traff | Halvt |
| **E0** | Observasjon          | Verdt å vite. Ikke en påstand om at noe er galt.     | Null  |

Sikkerhet i en deteksjon er ikke styrken i beviset. En regel kan være sikker på at den fant det den lette etter, og likevel se på en heuristikk. E1-funn er der for å bli lest og vurdert, aldri brukt i blinde, og den grensen står på funnet i terminalen, i JSON-en og i overleveringen til agenten.

**Hvor langt det er sjekket — tillitsnivået.** De fleste funn kommer fra å lese koden din. Gi Mjölnir rapporten fra en ekte testkjøring, så kan det bekrefte at koden faktisk kjørte.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="Tillitsstigen fra L0 til L5. L0 til L2 kommer fra å lese koden; L3 til L5 krever en ekte kjøringsrapport, markert med et brudd i stigen." width="100%" />
</p>

| Nivå   | Med vanlige ord      | Hva det krever                                     |
| ------ | -------------------- | -------------------------------------------------- |
| **L0** | Notert               | Å lese koden                                       |
| **L1** | Ser ut som problemet | Å lese koden: et mønster traff                     |
| **L2** | Bevist i koden       | Å lese koden: defekten er strukturell              |
| **L3** | Filen kjørte         | En kjøringsrapport viser at funnets fil ble kjørt  |
| **L4** | Testen kjørte        | En kjøringsrapport viser at funnets test ble kjørt |
| **L5** | Kjøringen er enig    | Kjøringens eget resultat bekrefter defektklassen   |

En statisk skanning stopper ved L2. Bare en ekte kjøringsrapport (Playwright JSON, Jest eller Vitest JSON, JUnit XML) kan løfte et funn til L3 eller høyere, så et funn som aldri er sett kjøre, kan aldri påstå at det gjorde det. Definisjoner: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Hvor mye av dette som er målt

**74 av 79 regler har en falsk-positiv-rate målt mot ekte OSS-kode** (minst 10 håndklassifiserte funn hver; se [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). De andre 5 bygger på forfatterens anslag og sier det, regel for regel, i `mjolnir explain`. `mjolnir rules --unmeasured` lister dem, og bunnteksten i hver skanning oppgir hvor mange av reglene som faktisk _slo ut_, som er målt.

Ratene forblir offentlige også når de er dårlige. QA-TEST-001 (en committet `.only`) kommer dårlig ut av revisjonen på ekte repositorier og sitter derfor i quarantine. Det aktuelle tallet for hver regel, inkludert QA-PW-141, står i revisjonen.

### Tillitsnivåer

Nivåene følger den målte falsk-positiv-raten, ikke meninger:

| Nivå           | Målt FP                        | Oppførsel                                            |
| -------------- | ------------------------------ | ---------------------------------------------------- |
| **core**       | ≤ 10%                          | Standardrapport, blokkerer                           |
| **extended**   | ≤ 30%                          | Standardrapport, lavere sikkerhet                    |
| **quarantine** | > 30% eller eksplisitt erklært | Bare `--strict`, begrenset til info, blokkerer aldri |
| _ikke målt_    | n < 10                         | Kan ikke forfremmes til core før den er målt         |

FP-bånd kan bare degradere et nivå — de forfremmer aldri en regel ut av `quarantine` hvis den var eksplisitt erklært der. En eksplisitt karantenesatt regel forblir i quarantine uavhengig av dens målte FP-rate.

Forfremmelse, degradering og modenhet per språk: [reglenes livssyklus](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Hvorfor dette ikke er en linter

Lintere forteller deg om koden følger regler. Mjölnir forteller deg om verifiseringen din er til å stole på.

|                                                                | Lintere (ESLint, SonarQube) | Dekningsverktøy | AI-kodegjennomgang |    **Mjölnir**    |
| -------------------------------------------------------------- | :-------------------------: | :-------------: | :----------------: | :---------------: |
| Scorer **verifiseringssystemet**, ikke produktkoden            |             Nei             |       Nei       |        Nei         |        Ja         |
| Integritet i CI-workflows (`continue-on-error`, `\|\| true`)   |             Nei             |       Nei       |    bare diffen     |        Ja         |
| Vurderer robustheten til Playwright-locators (Selector Health) |             Nei             |       Nei       |        Nei         |        Ja         |
| Leser ekte kjøringsdata for `TRUE-FLAKE`-dommer                |             Nei             |       Nei       |        Nei         |        Ja         |
| Publiserer en målt falsk-positiv-rate per regel                |             Nei             |       Nei       |        Nei         |        Ja         |
| Markerer tester uten assertions                                |            Ja\*             |       Nei       |    noen ganger     |        Ja         |
| Fanger faste sleeps (`waitForTimeout`, `time.sleep`)           |            Ja\*             |       Nei       |    noen ganger     |        Ja         |
| Deterministisk (samme input, samme output)                     |             Ja              |       Ja        |        Nei         |        Ja         |
| Kostnad per skanning                                           |           gratis            |     gratis      |       tokens       | **null** (lokalt) |

<sub>\*Dekket av `eslint-plugin-jest` og `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) og av SonarQubes egne assertion-regler. Kolonnene beskriver standardoppførselen for verifisering av testsuiter; plugins, betalte planer og egne regler endrer noen svar. Dette er en posisjoneringsoversikt, ikke en benchmark.</sub>

Bruk AI-gjennomgang også. Den fanger nyanser, intensjon og designfeil som ingen mønstre kan finne. Mjölnir fanger det AI-gjennomgangen overser fordi det ser tilsiktet ut: en committet `.only`, en svelget exitkode, en `continue-on-error` på en testjobb. Slikt krever skanning, ikke resonnering.

<br />

## Kjøringsanalyse

Statisk analyse resonnerer om kode som aldri har kjørt. Kjøringsanalysen leser hva som faktisk skjedde: Playwright JSON, Jest JSON, Vitest JSON og JUnit XML fra hvilken som helst runner.

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

`TRUE-FLAKE` betyr ikke at testen ble kjørt på nytt. Det betyr at testen **feilet minst ett forsøk og deretter endte grønt**: en heldig bestått, markert uansett hva den endelige haken sier. `mjolnir triage` gjør den historikken om til et karanteneforslag, og `mjolnir pw-report` oppsummerer en kjøring. Det er de samme kjøringsrapportene som løfter funn til tillitsnivå L3 og høyere.

<br />

## CI-integritet

En test kan bestå mens pipelinen rundt den ikke kan feile. Mjölnir leser også workflowene: `continue-on-error`, `|| true`, exitkoder som aldri videreformidles, steps som alltid lykkes, rapporter som brukes, men aldri genereres, og gates som hoppes over ved nettopp de hendelsene som burde blokkere. Hvert funn oppgir jobb, step og linje, og har sitt eget evidensnivå.

Generer PR-workflowen, rådgivende som standard:

```bash
mjolnir ci install
```

Eller legg Marketplace-action-en til en workflow du allerede har:

```yaml
- uses: Sergey-Bar/Mjolnir@v3
  with:
    scope: changed
    fail-on: error
```

Fest `@v3` for å følge major-linjen, eller en eksakt tagg (`@v0.5.32`) for en reproduserbar gate. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) dekker Marketplace, Smithery og MCP-registrene.

For å få funn inn i GitHub Code Scanning, last opp SARIF (krever `security-events: write` på workflow- eller job-nivå):

```yaml
- run: npx mjolnir-qa@3.0.0 --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

På GitLab skriver `--format codequality` Code Quality-rapporten som MR-widgeten og diff-annotasjonene leser ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Oppsett av editor og pipeline: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Tilordning i endret omfang

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

Funn tilordnes linjene grenen din har lagt til, målt mot **merge-base**. Omfanget er det samme filsettet en full skanning finner (TS/JS-specs og adapterkonfigurasjoner, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), pluss ikke-committede og usporede endringer, så det fungerer før du committer. Basen løses i rekkefølgen `main → master → origin/main → origin/master → origin/HEAD`; overstyr den med `--base <ref>`.

Når merge-base ikke kan løses (en shallow clone, et detached HEAD, et mål utenfor git), faller funnene tilbake til tilordning for hele filen, **og rapporten sier det.** En stille fallback ville vært nøyaktig den typen defekt dette verktøyet finnes for å fange.

<br />

## AI-agenter

Funn er bare verdt noe hvis noe handler på dem.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI skriver rettelsen. Mjölnir verifiserer den.** Beviset kommer fra den nye skanningen, aldri fra agentens egen melding om suksess.

| Kommando          | Hva agenten får                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | En [MCP](https://modelcontextprotocol.io)-server over stdio. `scan`, `explain` og `diff` blir kallbare verktøy.                                                               |
| `mjolnir handoff` | En lagret `--json`-rapport blir en deterministisk Markdown-plan: hva som ble oppdaget, evidensgrensen for hvert funn, hva som **ikke** må endres, og hvordan det verifiseres. |
| `mjolnir install` | Skriver inn i agentflatene repoet ditt allerede har (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`), slik at agenten skanner på nytt før den påstår at den er ferdig.         |

Legg det til i en klient som har sin egen CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@3.0.0 mcp
```

Eller i en hvilken som helst klient som tar en `mcpServers`-blokk:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@3.0.0", "mcp"] }
  }
}
```

**Rekkverket betyr mer enn bekvemmeligheten.** Hvert funn i en overlevering bærer sin grense. **E2** sier _deterministisk: sjekk plasseringen og bruk rettelsen_. **E1** sier _KREVER BEKREFTELSE: observasjonen alene beviser ikke defekten_. En agent som retter E1 i blinde, undertrykker en regel eller redigerer en regel for å heve scoren, gjør nøyaktig det dette verktøyet finnes for å fange, så overleveringen sier det i prompten, rett ved siden av funnet.

<br />

## Tillit og sikkerhet

**Local-first, null telemetri.** Det finnes ingen nettverkskapabel API (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) noe sted i `src/`, og [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) får bygget til å feile hvis en dukker opp. Den forbyr også `eval` og `new Function`. Å skanne kode du ikke stoler på, kjører den aldri: statisk analyse leser kildetekst, og kjøringsanalysen parser rapportfiler som allerede ligger på disken.

To forbehold: `npx` henter selv pakken før noe kjører, og garantien dekker `src/`, ikke tredjeparts plugins.

**Plugins kjører ikke i en sandkasse.** JS-plugins (`mjolnir-rules/*.mjs`, eller npm-pakker oppført under `"plugins"`) kjører med fulle Node-rettigheter, samme tillitsmodell som ESLint- eller Vitest-plugins. Å laste dem er et aktivt valg **per skanning**: uten `--enable-plugins` (eller `MJOLNIR_ENABLE_PLUGINS=1`) lastes kildene deres aldri, og en melding på stderr lister hva som ble hoppet over. JSON-regelmanifester kjører ingen kode, og prefiksene for core-regel-ID-er er reservert, slik at et plugin ikke kan utgi seg for å være en av dem. Rapporter sårbarheter via [SECURITY.md](SECURITY.md).

**Det kjører på seg selv.** En verification trust engine har ingen troverdighet med mindre den selv kan verifiseres. Hver CI-kjøring skanner dette repositoriet med bygget den samme kjøringen produserte. Gaten feiler ved ethvert funn med alvorlighetsgrad error, og også ved en **delvis** skanning eller en **regel som krasjet**, fordi en avkortet selvskanning som ikke rapporterer noe, er nøyaktig det falske grønne dette prosjektet finnes for å fange. `mjolnir doctor` reviderer regelbasen på nytt i samme kjøring (fixture-brannmur, ærlige nivåer, taket for core-nivået), og en INCONCLUSIVE-sjekk feiler akkurat som en feilende sjekk. Begge rapportene lastes opp som byggeartefakter.

### Exitkoder og maskinkontrakten

Fryst, så du kan bygge CI-logikk på dem:

| Exitkode | Betydning                                                                   |
| -------- | --------------------------------------------------------------------------- |
| `0`      | Ren: ingen funn på eller over gaten                                         |
| `1`      | Funn på eller over gaten                                                    |
| `2`      | Delvis skanning (tidsbudsjett brukt opp, uleselige filer). Blokkerer aldri. |
| `10`     | Brukerfeil (feil flagg, manglende mål)                                      |
| `20`     | Intern feil                                                                 |

`2` er bevisst forskjellig fra `0`: en skanning som ikke ble ferdig, har ikke funnet ingenting. Den er bare ikke ferdig med å lete.

Alt en maskin bruker (MCP-verktøyresultater, `--json`, SARIF 2.1), kommer fra ett kanonisk resultat under et versjonert, **bare additivt** skjema (`schemaVersion: 1`, `contractVersion: 1`), så ingen forbruker trenger å gjenskape betydningen fra rendret tekst. Se [maskinkontrakten](docs/machine-contract.md). Regel-ID-er (`QA-<FAMILY>-NNN`) kan ikke endres etter at de er levert, og gjenbrukes aldri.

<br />

## Hva Mjölnir ikke kan fortelle deg

- **Det kjører ikke testene dine.** En ren skanning er ikke en bestått suite.
- **Det kan ikke fortelle deg at en assertion er _feil_.** `expect(total).toBe(41)` ser sunn ut. Mjölnir finner tester som _ikke kan feile_ og pipelines som _ikke kan bli røde_, ikke tester som sjekker feil ting.
- **Det beviser ikke forretningsmessig korrekthet.** Ingenting her sier at produktet ditt gjør det kravet ba om.
- **100 er ikke bevis på en god suite.** Om suiten din dekker den reelle risikoen din, er et annet spørsmål, og det svarer ikke dette verktøyet på.
- **5 av 79 regler bygger på et anslag**, ikke en målt rate. Hver av dem sier det på sitt eget funn.
- **E1 er ikke E2.** Heuristiske funn er verdt å lese, ikke verdt å bruke i blinde.
- **Et tomt repo får `null`, aldri 100.**
- **En fil som heter `*.spec.ts` uten testdeklarasjoner, teller ikke som dekning.** Et repo der de eneste spec-filene inneholder imports eller typer (null `it`/`test`-kall), får `null`, ikke 100.

<br />

## Dokumentasjon

Det fullstendige dokumentasjonsnettstedet finner du på <https://sergey-bar.github.io/Mjolnir/>.

| Dokument                                               | Hva det inneholder                               |
| ------------------------------------------------------ | ------------------------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalisering av scoren og vekting av evidens    |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Kanonisk ordforråd: ett ord per begrep           |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Målte falsk-positiv-rater og metoden             |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Regeltilstander, nivåer, undertrykking, utfasing |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver-policy, fryste flater, utfasingssyklus    |
| [docs/machine-contract.md](docs/machine-contract.md)   | Det kanoniske maskinlesbare resultatet           |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-utdata og oppsett av editor eller CI       |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code Quality-rapport, MR-oppskrift, gate |
| [docs/rules/](docs/rules/)                             | Generert katalog per regel                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Utviklingsmiljø og bidragsflyt                   |
| [SUPPORT.md](SUPPORT.md)                               | Hvor du kan spørre, rapportere og få hjelp       |
| [SECURITY.md](SECURITY.md)                             | Rapportering av sårbarheter                      |
| [CHANGELOG.md](CHANGELOG.md)                           | Versjonshistorikk                                |

### Status

**Versjon 1.** JSON-skjemaet og exitkodene er fryste kontrakter. TypeScript og Python har den bredeste målte dekningen. Java og C# er nyere; les dem gjennom [modenhetstabellen](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Hva som kommer videre, uten oppdiktede datoer: [det offentlige veikartet](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Bidra

Nye regler er det enkleste første bidraget. Én kommando lager skjelettet til regelen med must-fire- **og** must-not-fire-fixtures. Den genererte regelen feiler bevisst sine egne fixtures til ekte deteksjon er skrevet, fordi en stubb som blir levert, er en regel ingen har målt:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Utviklingsmiljøet, kommandoene for de faste gatene og anti-creep- og fixture-brannmur-lovene står i [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Kjør det på repoet ditt." width="100%" />

```bash
npx mjolnir-qa@3.0.0
```

[Les veiledningen](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Dokumentasjonsnettsted](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Ikke spør om testene besto.<br />
Spør om evidensen beviser at de fortjener tillit.

<sub>Laget av [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · MIT-lisens</sub>

</div>
