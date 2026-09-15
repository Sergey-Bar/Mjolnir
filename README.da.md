<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Tests fortæller dig, hvad der bestod. Mjölnir fortæller dig, hvad du kan stole på." width="100%" />

<br />

Mjölnir finder tests, der ikke kan fejle, og pipelines, der ikke kan blive røde,<br />
og vurderer derefter, hvor langt resultatet er til at stole på, med beviset for hvert point.

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

[Se det i aktion](#se-det-i-aktion) · [Kom hurtigt i gang](#kom-hurtigt-i-gang) · [Hvad det finder](#hvad-mjölnir-finder) · [Score](#worthiness-scoren) · [Evidens](#evidensmodellen) · [Kørselsanalyse](#kørselsanalyse) · [CI](#ci-integritet) · [Agenter](#ai-agenter) · [Sikkerhed](#tillid-og-sikkerhed) · [Grænser](#hvad-mjölnir-ikke-kan-fortælle-dig) · [Dokumentation](#dokumentation)

<details>
<summary>Læs på et andet sprog — 22 oversættelser</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | Dansk | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Et grønt flueben er en påstand, ikke et bevis

Et grønt flueben betyder, at pipelinen ikke fejlede. Det betyder ikke, at testene kørte, eller at de kunne have fejlet. Hver eneste af disse går grønt igennem:

- en committet `.only`, der kørte 3 tests i stedet for 900
- `continue-on-error: true` på det job, der skulle have blokeret
- `|| true` efter testkommandoen
- en test, der ikke tjekker noget, eller som har en tom krop
- en retry-wrapper, der gør en reel fejl til et heldigt bestået
- en rapport, som workflowet uploader, men aldrig har genereret
- et fast sleep, der holder sammen på en race condition

Ingen af dem gør pipelinen rød, og hver af dem ser tilsigtet ud i review. Det er derfor, de overlever. Her læser Mjölnir et rigtigt eksempel:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Demo-repositoriets CI-workflow, læst linje for linje. Mjölnir markerer hvert fund på den rapporterede linje, med dets regel, hvad der er galt, dets evidensniveau og dets målte falsk-positiv-rate." width="800" />
</p>

<sub>Hvert fund, som demo-scannet rapporterede for dette workflow, på den rapporterede linje. Genereret af `npm run docs:readme-brand` ud fra [`demo-report.json`](assets/readme/demo-report.json) og låst mod afvigelser i CI.</sub>

**Streng tilstand.** De mest aggressive registreringer — `.only`, `continue-on-error`, tomme tests, misbrug af genkørsler — lever i karantænelaget. De kører kun med `--strict` og er begrænset til `info`-alvorlighed: de flagger, de blokerer aldrig. Standardscanningen (`npx mjolnir-qa@latest` uden `--strict`) dækker kun kerne- og udvidede regler. Tilføj `--strict` når du også vil have rådgivningslaget.

Mjölnir læser testsuiten, CI-workflowene og, hvis du har en, rapporten fra en rigtig kørsel. Det kører ikke dine tests, installerer ikke dine afhængigheder og udfører ikke den kode, det scanner. Og når det ikke har evidens, siger det det i stedet for at opfinde tillid:

| Situation                                    | Hvad Mjölnir rapporterer                                    |
| -------------------------------------------- | ----------------------------------------------------------- |
| Ingen testdeklarationer fundet               | Score `null`, vist som **UNKNOWN**. Aldrig et opdigtet 100. |
| Ingen baseline eller sammenlignelig revision | **UNKNOWN**, med årsagen angivet. Aldrig et antaget 0.      |
| Scan afbrudt (tidsbudget, ulæselige filer)   | **PARTIAL**, exit `2`. Aldrig præsenteret som rent.         |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Sådan virker Mjölnir. Det læser testsuiten og CI-pipelinen statisk, og rapporten fra en rigtig kørsel, når der er en. Det vægter hvert fund efter dets evidensniveau og tillidsniveau, hvor kun en rigtig kørsel kan nå L3 til L5, og leverer fund, en worthiness-score og en CI-gate med fastfrosne exitkoder. I agent-loopet skriver AI rettelsen, og Mjölnir scanner igen for at bevise den." width="880" />
</p>

<sub>Komponeret til denne side og vist i 1:1. Genereret af `npm run docs:readme-brand` og låst mod afvigelser i CI; score, antal og regel-ID kommer fra [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) og regelregistret, aldrig tastet ind i hånden. Samme billede som plakat: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Se det i aktion

Et rigtigt scan af [`examples/demo-repo`](examples/demo-repo), en lille Playwright-suite med et CI-workflow. Her er, hvor dens point forsvandt hen:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnirs opgørelse af fradrag: WORTHINESS 75/100 NEEDS WORK, scoren pr. kategori, fradragsboksen pr. alvorlighed og en FIX THIS FIRST-liste" width="520" />
</p>

<sub>Genereret af `npm run docs:hero` ud fra et rigtigt scan og låst mod afvigelser i CI. Den fulde `--verbose`-rapport fra samme scan er [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Se det</strong> — et scan, rettelsen det udskriver, og det nye scan, der beviser den</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Et billede fra demo-optagelsen: npx mjolnir-qa@latest scanner demo-repositoriet i et terminalvindue" width="900" />
  </a>
</p>

<sub>Renderet billede for billede ud fra et rigtigt scan af `npm run docs:video`; aldrig optaget fra skærmen. Vælg billedet for at åbne [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Ét fund helt tæt på

Hvert fund besvarer fire spørgsmål: hvor det er, hvor sikker Mjölnir er, hvor ofte reglen tager fejl, og hvordan det rettes.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Det første fund fra demo-scannet, præcis som terminalen udskriver det, med dets fire dele markeret: hvor, hvor sikkert, hvor ofte reglen tager fejl, og rettelsen." width="100%" />
</p>

`mjolnir explain QA-CI-001` udskriver en regels samlede tillidsprofil, inklusive dens målte falsk-positiv-rate og det niveau, raten har givet den:

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

Det er værdienheden: ét sted, hvor CI rapporterer et bestået, den ikke har gjort sig fortjent til.

<br />

## Kom hurtigt i gang

```bash
npx mjolnir-qa@latest
```

Det scanner den aktuelle mappe og udskriver Trust Report: hvad det fandt, hvor langt du kan stole på det, hvorfor, og hvad du skal gøre nu. Det afslutter med `0`, når intet på eller over gaten blev fundet.

I CI skal du kun scanne det, grenen har tilføjet, så en ældre testsuite ikke drukner din første pull request:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` skriver det som et GitHub Actions-workflow med [action'en](https://github.com/Sergey-Bar/Mjolnir#readme) fastlåst til major-tagget `v1` (eller rent `npx` med `--no-action`). Det forbliver rådgivende, indtil du beslutter, at det skal blokere.

| Kommando                            | Hvad den gør                                              |
| ----------------------------------- | --------------------------------------------------------- |
| `mjolnir`                           | Trust Report: dom, sikkerhed, næste handling              |
| `mjolnir --scope changed`           | Kun det, din gren har tilføjet (CI-formen)                |
| `mjolnir ci install`                | Generér det rådgivende PR-workflow (action-baseret)       |
| `mjolnir explain QA-CI-001`         | Hvad, hvorfor og rettelse, plus den målte FP-rate         |
| `mjolnir why src/a.spec.ts:42`      | Hvorfor netop denne linje blev markeret. Blokerer aldrig. |
| `mjolnir forensics ./test-results/` | Kørselsevidens fra en rigtig kørsel                       |
| `mjolnir trust-report`              | Selvstændigt Trust-artefakt (md + json)                   |
| `mjolnir handoff`                   | Udbedringsplan til en kodeagent                           |
| `mjolnir --json` / `--format sarif` | Maskinlæsbart output, GitHub Code Scanning                |
| `mjolnir --format codequality`      | GitLab Code Quality-rapport (MR-widget-artefakt)          |
| `mjolnir --strict`                  | Kør også regler på quarantine-niveau (højere FP-risiko)   |

<details>
<summary><strong>Alle andre kommandoer</strong> — triage af ustabile tests, rapportering, governance</summary>

<br />

| Kommando                            | Hvad den gør                                                              |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Scorebanneret fra før Trust Report                                        |
| `mjolnir explain verdict`           | Hvorfor dommen for det gemte scan er, som den er                          |
| `mjolnir triage ./test-results/`    | Guidet triage. Hver række ender med en næste handling.                    |
| `mjolnir pw-report ./test-results/` | Opsummering af Playwright-kørsel: retries, ustabile tests, de langsomste  |
| `mjolnir doctor:playwright`         | Dybdescan kun for Playwright plus Selector Health Score                   |
| `mjolnir fix --dry-run` / `fix`     | Sikre autorettelser, hver scannet igen for at bevise, at den virkede      |
| `mjolnir baseline` / `diff`         | Gem et øjebliksbillede af fund, og rapportér derefter kun nye eller værre |
| `mjolnir impact --since <ref>`      | Hvad et commit tilføjede og løste                                         |
| `mjolnir summary`                   | CI-annoteringer og en step-opsummering ud fra en rapport                  |
| `mjolnir pr-comment`                | En afgrænset PR-kommentar, som Markdown                                   |
| `mjolnir debt`                      | Register over testgæld med en omkostningsmodel                            |
| `mjolnir handover`                  | Introduktionskort over suiten til en ny QA-ingeniør                       |
| `mjolnir init`                      | Find frameworks, udskriv en tjekliste til opsætning                       |
| `mjolnir suppressions`              | List undertrykte fund, til governance                                     |
| `mjolnir rules --unmeasured`        | De regler, der kører på antagelser, ikke målinger                         |
| `mjolnir rules --md`                | Fuldt regelkatalog (JSON eller Markdown)                                  |
| `mjolnir doctor`                    | Selvrevision af Mjölnirs egen regelbase                                   |
| `mjolnir create-rule <ID>`          | Opret skelettet til en ny regel og dens fixtures                          |
| `mjolnir stats`                     | Lokale tællere over alle rettelser, der nogensinde er set                 |
| `mjolnir badge`                     | shields.io-endpoint-JSON og snippet                                       |
| `mjolnir --cache`                   | Inkrementelle genscanninger via en lokal cache over domme                 |
| `mjolnir --format mermaid`          | Diagram over testarkitekturen til en PR-kommentar                         |

`mjolnir help <command>` udskriver brug, eksempler og næste skridt for hver af dem.

</details>

Kræver **Node.js ≥ 22.18** på Windows, macOS eller Linux. Foretrækker du en global installation? `npm i -g mjolnir-qa`. Minimumskravet kommer fra build-værktøjskæden (tsdown sigter mod den, og release-pipelinen røgtester mod den); kørselsafhængighederne kræver ikke mere end det.

<br />

## Hvad Mjölnir finder

<p align="center">
  <img src="assets/readme/stack.svg" alt="Virker med din stack: de sprog, testframeworks og CI-systemer, som reglerne dækker, fra regelregistret." width="100%" />
</p>

**79 regler** i fire familier — testhygiejne, testkvalitet, Playwright og CI-integritet — på tværs af TypeScript og JavaScript, Python, Java, C# og GitHub Actions-YAML. De dækker Playwright i alle fire bindings, plus pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest og Mocha, med startdækning for Cypress og Selenium. Ni af dem, så du kan se formen:

| ID           | Regel                                                             | Alvorlighed | Niveau     |
| ------------ | ----------------------------------------------------------------- | ----------- | ---------- |
| QA-CI-001    | `continue-on-error` skjuler en fejlende verifikations-gate        | error       | quarantine |
| QA-CI-009    | Testens exitkode videregives ikke (`\|` uden pipefail, `;`-kæder) | error       | extended   |
| QA-TEST-001  | Fokuseret test committet (`.only`, `fit`)                         | error       | quarantine |
| QA-TEST-003  | Test uden assertions                                              | error       | quarantine |
| QA-TQUAL-009 | Promise-assertion uden await                                      | error       | quarantine |
| QA-PW-002    | Locator-assertion uden await                                      | error       | core       |
| QA-PW-004    | Skrøbelige CSS/XPath-selektorer                                   | warning     | quarantine |
| QA-PY-002    | Sprunget test over (`skip`, ikke-streng `xfail`)                  | warning     | core       |
| QA-CS-103    | Testmetode uden assertions                                        | error       | core       |

Det fulde katalog genereres ud fra registret, aldrig vedligeholdt i hånden: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) eller [guiden til, hvad det tjekker](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Alle regler nævnt i denne README</strong>, i én tabel</summary>

<br />

> `quarantine`-regler kører kun under `--strict` og blokerer aldrig (de er begrænset til info). Den viste alvorlighed er forfatterens.

| ID           | Familie    | Regel                                                                 | Alvorlighed | Niveau     |
| ------------ | ---------- | --------------------------------------------------------------------- | ----------- | ---------- |
| QA-TEST-001  | Hygiejne   | Fokuseret test committet (`.only`, `fit`)                             | error       | quarantine |
| QA-TEST-002  | Hygiejne   | Sprunget test over. Eskalerer til `error` uden en sporet begrundelse. | warning     | quarantine |
| QA-TEST-003  | Hygiejne   | Test uden assertions                                                  | error       | quarantine |
| QA-TEST-004  | Hygiejne   | Fast sleep (`waitForTimeout`, `sleep()`, `delay()`)                   | warning     | extended   |
| QA-TEST-006  | Hygiejne   | Misbrug af retries, der skjuler ustabilitet                           | warning     | quarantine |
| QA-TEST-010  | Hygiejne   | Tom testkrop                                                          | error       | quarantine |
| QA-TQUAL-002 | Kvalitet   | Tautologisk assertion                                                 | error       | quarantine |
| QA-TQUAL-009 | Kvalitet   | Promise-assertion uden await                                          | error       | quarantine |
| QA-TQUAL-011 | Kvalitet   | Udkommenterede tests                                                  | warning     | extended   |
| QA-PW-002    | Playwright | Locator-assertion uden await                                          | error       | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` committet                              | error       | core       |
| QA-PW-004    | Playwright | Skrøbelige CSS/XPath-selektorer                                       | warning     | quarantine |
| QA-PW-123    | Playwright | Hardkodede miljø-URL'er                                               | warning     | quarantine |
| QA-PW-140    | Playwright | Skærmbillede uden `maxDiffPixelRatio`                                 | warning     | core       |
| QA-CI-001    | CI         | `continue-on-error` skjuler en fejlende gate                          | error       | quarantine |
| QA-CI-002    | CI         | `\|\| true` sluger exitkoder                                          | error       | extended   |
| QA-CI-005    | CI         | Rapport brugt, men aldrig genereret                                   | error       | quarantine |
| QA-CI-007    | CI         | Retry-wrappers omkring tests                                          | warning     | extended   |
| QA-CI-008    | CI         | Step, der altid lykkes, skjuler fejl                                  | error       | quarantine |
| QA-CI-009    | CI         | Exitkode videregives ikke (`\|` uden pipefail, `;`-kæder)             | error       | extended   |
| QA-CI-010    | CI         | Tests sprunget over, hvor de skal blokere                             | error       | quarantine |
| QA-PY-002    | Python     | Sprunget test over (`skip`, ikke-streng `xfail`)                      | warning     | core       |
| QA-PY-003    | Python     | Testfunktion uden assertions                                          | error       | quarantine |
| QA-PY-005    | Python     | `time.sleep()` i tests                                                | warning     | extended   |
| QA-PY-012    | Python     | Tautologisk assertion                                                 | error       | quarantine |
| QA-JV-101    | Java       | Deaktiveret test (`@Disabled`)                                        | warning     | core       |
| QA-JV-102    | Java       | Fast sleep (`Thread.sleep()`)                                         | warning     | extended   |
| QA-JV-103    | Java       | Testmetode uden assertions                                            | error       | extended   |
| QA-JV-105    | Java       | Fast sleep med Playwright `waitForTimeout()`                          | warning     | core       |
| QA-JV-106    | Java       | Skrøbelig selektor i stedet for rollebaseret locator                  | warning     | quarantine |
| QA-CS-101    | C#         | Sprunget test over (`[Ignore]`, `[Fact(Skip=)]`)                      | warning     | core       |
| QA-CS-102    | C#         | Fast sleep (`Thread.Sleep` / `Task.Delay`)                            | warning     | core       |
| QA-CS-103    | C#         | Testmetode uden assertions                                            | error       | core       |
| QA-CS-105    | C#         | Fast sleep med `WaitForTimeoutAsync()`                                | warning     | extended   |
| QA-CS-106    | C#         | Skrøbelig selektor i stedet for rollebaseret locator                  | warning     | quarantine |

Python har desuden QA-PY-001…012 (pytest-hygiejne) og QA-PY-101…108 (Playwright til Python). Cypress og Selenium har startsæt på tre regler hver.

</details>

Hver regel leveres med en must-fire- **og** en must-not-fire-fixture, og en regel, der udløses på sin egen negative fixture, kan ikke leveres. Det er firewallen mod falske positiver; `mjolnir doctor` håndhæver den i dette repositories egen CI.

### Selector Health Score

`mjolnir doctor:playwright` bedømmer hver locator efter, hvordan den finder et element: som en bruger ville (rolle, label, tekst), via en eksplicit kontrakt (`data-testid`) eller ved et strukturelt tilfælde (CSS-kæder, XPath). Hver fil får en score fra 0 til 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [█████████████████░░░]  86 / 100
  role/text: 3 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Det måler **robusthed, ikke korrekthed**. `.btn.btn-primary > div:nth-child(2)` består i dag og bliver ved med at bestå, indtil nogen rører ved markuppen. En lav score påstår aldrig, at testen er i stykker, kun at den afhænger af markup, som ingen har lovet at bevare.

<br />

## Worthiness-scoren

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="Worthiness-skalaen fra 0 til 100, med en markør, der gennemløber hver score: UNWORTHY under 50, NEEDS WORK fra 50 til 79, WORTHY fra 80 til 99, FORGED ved 100" width="720" />
</p>

<sub>Hver score fra 0 til 100, placeret af den rigtige `deriveScoreState`. Genereret af `npm run docs:gauge` og låst mod afvigelser i CI.</sub>

| Score     | Dom                                         |
| --------- | ------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                |
| `50 – 79` | **NEEDS WORK**                              |
| `80 – 99` | **WORTHY**                                  |
| `100`     | **FORGED**                                  |
| `null`    | **UNKNOWN**: ingen testdeklarationer fundet |

**Sådan beregnes den.** Alvorligheden fastsætter et grundfradrag (`error −8`, `warning −3`, `info −1`), og evidensniveauet nedskriver det: E2 tæller fuldt, E1 halvt (rundet ned), E0 slet ikke. Summen normaliseres efter suitens eksponering, altså fradrag pr. testdeklaration i stedet for pr. fil. Terminalen udskriver de samme nedskrevne tal, som scoren brugte; der er ingen skjult anden model. Detaljer: [docs/SCORING.md](docs/SCORING.md) og [scoringsguiden](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Hvad 100 ikke betyder.** Det betyder ikke, at softwaren er korrekt, at suiten er tilstrækkelig, eller at produktet er fejlfrit. Det betyder én ting: **ingen af Mjölnirs evaluerede regler gav et fradrag under dette scan og denne evidensmodel.**

<br />

## Evidensmodellen

Hvert fund har to etiketter: hvor sikker Mjölnir er, og hvor langt fundet er blevet tjekket. Det er forskellen på et værktøj, der rapporterer mønstre, og et værktøj, du kan lade en release afhænge af.

**Hvor sikkert — evidensniveauet.**

| Niveau | Navn                 | Betyder                                                  | Fradrag |
| ------ | -------------------- | -------------------------------------------------------- | ------- |
| **E2** | Deterministisk bevis | Defekten findes i koden, som den er skrevet              | Fuldt   |
| **E1** | Mønsterevidens       | Et mønster, der er stærkt knyttet til defekten, matchede | Halvt   |
| **E0** | Observation          | Værd at vide. Ikke en påstand om, at noget er galt.      | Nul     |

Sikkerhed i en detektion er ikke styrken af beviset. En regel kan være sikker på, at den fandt det, den ledte efter, og stadig kigge på en heuristik. E1-fund er der for at blive læst og vurderet, aldrig anvendt i blinde, og den grænse står på fundet i terminalen, i JSON'en og i overdragelsen til agenten.

**Hvor langt det er tjekket — tillidsniveauet.** De fleste fund kommer fra at læse din kode. Giv Mjölnir rapporten fra en rigtig testkørsel, så kan det bekræfte, at koden faktisk kørte.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="Tillidsstigen fra L0 til L5. L0 til L2 kommer fra at læse koden; L3 til L5 kræver en rigtig kørselsrapport, markeret med et brud i stigen." width="100%" />
</p>

| Niveau | Med almindelige ord | Hvad det kræver                                      |
| ------ | ------------------- | ---------------------------------------------------- |
| **L0** | Noteret             | At læse koden                                        |
| **L1** | Ligner problemet    | At læse koden: et mønster matchede                   |
| **L2** | Bevist i koden      | At læse koden: defekten er strukturel                |
| **L3** | Filen kørte         | En kørselsrapport viser, at fundets fil blev udført  |
| **L4** | Testen kørte        | En kørselsrapport viser, at fundets test blev udført |
| **L5** | Kørslen er enig     | Kørslens eget resultat bekræfter defektklassen       |

Et statisk scan stopper ved L2. Kun en rigtig kørselsrapport (Playwright JSON, Jest eller Vitest JSON, JUnit XML) kan løfte et fund til L3 eller højere, så et fund, der aldrig er set køre, aldrig kan påstå, at det gjorde. Definitioner: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Hvor meget af dette er målt

**74 af 79 regler har en falsk-positiv-rate målt mod rigtig OSS-kode** (mindst 10 håndklassificerede fund hver; se [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). De øvrige 5 bygger på forfatterens skøn og siger det, regel for regel, i `mjolnir explain`. `mjolnir rules --unmeasured` lister dem, og hver scanfod angiver, hvor mange af de regler, der faktisk _blev udløst_, der er målt.

Raterne forbliver offentlige, også når de er dårlige. QA-TEST-001 (en committet `.only`) klarer sig dårligt i revisionen på rigtige repositorier og sidder derfor i quarantine. Det aktuelle tal for hver regel, inklusive QA-PW-141, står i revisionen.

### Tillidsniveauer

Niveauerne følger den målte falsk-positiv-rate, ikke holdninger:

| Niveau         | Målt FP                        | Adfærd                                              |
| -------------- | ------------------------------ | --------------------------------------------------- |
| **core**       | ≤ 10%                          | Standardrapport, blokerer                           |
| **extended**   | ≤ 30%                          | Standardrapport, lavere sikkerhed                   |
| **quarantine** | > 30% eller eksplicit erklæret | Kun `--strict`, begrænset til info, blokerer aldrig |
| _ikke målt_    | n < 10                         | Kan ikke forfremmes til core, før den er målt       |

FP-bånd kan kun degradere et niveau — de forfremmer aldrig en regel ud af `quarantine`, hvis den var eksplicit erklæret der. En eksplicit karantænesat regel forbliver i quarantine uanset dens målte FP-rate.

Forfremmelse, degradering og modenhed pr. sprog: [reglernes livscyklus](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Hvorfor det ikke er en linter

Linters fortæller dig, om koden følger regler. Mjölnir fortæller dig, om din verifikation er til at stole på.

|                                                               | Linters (ESLint, SonarQube) | Coverage-værktøjer | AI-kodereview |   **Mjölnir**    |
| ------------------------------------------------------------- | :-------------------------: | :----------------: | :-----------: | :--------------: |
| Scorer **verifikationssystemet**, ikke produktkoden           |             Nej             |        Nej         |      Nej      |        Ja        |
| CI-workflowintegritet (`continue-on-error`, `\|\| true`)      |             Nej             |        Nej         |  kun diffen   |        Ja        |
| Bedømmer robustheden af Playwright-locators (Selector Health) |             Nej             |        Nej         |      Nej      |        Ja        |
| Læser rigtige kørselsdata til `TRUE-FLAKE`-domme              |             Nej             |        Nej         |      Nej      |        Ja        |
| Offentliggør en målt falsk-positiv-rate pr. regel             |             Nej             |        Nej         |      Nej      |        Ja        |
| Markerer tests uden assertions                                |            Ja\*             |        Nej         |  sommetider   |        Ja        |
| Fanger faste sleeps (`waitForTimeout`, `time.sleep`)          |            Ja\*             |        Nej         |  sommetider   |        Ja        |
| Deterministisk (samme input, samme output)                    |             Ja              |         Ja         |      Nej      |        Ja        |
| Pris pr. scan                                                 |           gratis            |       gratis       |    tokens     | **nul** (lokalt) |

<sub>\*Dækket af `eslint-plugin-jest` og `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) og af SonarQubes egne assertion-regler. Kolonnerne beskriver standardadfærden for verifikation af testsuiter; plugins, betalte planer og egne regler ændrer nogle svar. Dette er en positioneringsoversigt, ikke en benchmark.</sub>

Brug også AI-review. Det fanger nuancer, hensigt og designfejl, som intet mønster kan finde. Mjölnir fanger det, AI-review overser, fordi det ser tilsigtet ud: en committet `.only`, en slugt exitkode, en `continue-on-error` på et testjob. Det kræver scanning, ikke ræsonnement.

<br />

## Kørselsanalyse

Statisk analyse ræsonnerer om kode, der aldrig har kørt. Kørselsanalysen læser, hvad der faktisk skete: Playwright JSON, Jest JSON, Vitest JSON og JUnit XML fra enhver runner.

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

`TRUE-FLAKE` betyder ikke, at testen blev prøvet igen. Det betyder, at testen **fejlede mindst ét forsøg og derefter endte grønt**: et heldigt bestået, markeret uanset hvad det endelige flueben siger. `mjolnir triage` gør den historik til et karantæneforslag, og `mjolnir pw-report` opsummerer en kørsel. Det er de samme kørselsrapporter, der løfter fund til tillidsniveau L3 og derover.

<br />

## CI-integritet

En test kan bestå, mens pipelinen omkring den ikke kan fejle. Mjölnir læser også workflowene: `continue-on-error`, `|| true`, exitkoder, der aldrig videregives, steps, der altid lykkes, rapporter, der bruges, men aldrig genereres, og gates, der springes over ved netop de hændelser, der burde blokere. Hvert fund angiver job, step og linje og har sit eget evidensniveau.

Generér PR-workflowet, rådgivende som standard:

```bash
mjolnir ci install
```

Eller tilføj Marketplace-action'en til et workflow, du allerede har:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Fastlås `@v1` for at følge major-linjen, eller et præcist tag (`@v0.5.32`) for en reproducerbar gate. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) dækker Marketplace, Smithery og MCP-registrene.

Upload SARIF for at få fund ind i GitHub Code Scanning (kræver `security-events: write` på workflow- eller job-niveau):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

På GitLab skriver `--format codequality` den Code Quality-rapport, som MR-widgetten og diff-annoteringerne læser ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Opsætning af editor og pipeline: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Tilskrivning i det ændrede scope

```bash
npx mjolnir-qa@latest --scope changed
```

Fund tilskrives de linjer, din gren har tilføjet, målt mod **merge-base**. Scopet er det samme filsæt, som et fuldt scan finder (TS/JS-specs og adapterkonfigurationer, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), plus ucommittede og usporede ændringer, så det virker, før du committer. Basen findes i rækkefølgen `main → master → origin/main → origin/master → origin/HEAD`; tilsidesæt den med `--base <ref>`.

Når merge-base ikke kan findes (en shallow clone, et detached HEAD, et mål uden for git), falder fundene tilbage til tilskrivning til hele filen, **og rapporten siger det.** En tavs fallback ville være præcis den slags defekt, dette værktøj findes for at fange.

<br />

## AI-agenter

Fund er kun noget værd, hvis noget handler på dem.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI skriver rettelsen. Mjölnir verificerer den.** Beviset kommer fra det nye scan, aldrig fra agentens egen melding om succes.

| Kommando          | Hvad agenten får                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | En [MCP](https://modelcontextprotocol.io)-server over stdio. `scan`, `explain` og `diff` bliver til kaldbare værktøjer.                                                            |
| `mjolnir handoff` | En gemt `--json`-rapport bliver til en deterministisk Markdown-plan: hvad der blev fundet, evidensgrænsen for hvert fund, hvad der **ikke** må ændres, og hvordan det verificeres. |
| `mjolnir install` | Skriver ind i de agentflader, dit repo allerede har (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`), så agenten scanner igen, før den påstår, at den er færdig.                    |

Tilføj det til en klient med sin egen CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Eller til enhver klient, der tager en `mcpServers`-blok:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**Rækværket betyder mere end bekvemmeligheden.** Hvert fund i en overdragelse bærer sin grænse. **E2** siger _deterministisk: tjek placeringen, og anvend rettelsen_. **E1** siger _KRÆVER BEKRÆFTELSE: observationen alene beviser ikke defekten_. En agent, der retter E1 i blinde, undertrykker en regel eller redigerer en regel for at hæve scoren, gør præcis det, dette værktøj findes for at fange, så overdragelsen siger det i prompten, lige ved siden af fundet.

<br />

## Tillid og sikkerhed

**Local-first, nul telemetri.** Der findes ingen netværkskapabel API (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) nogen steder i `src/`, og [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) får buildet til at fejle, hvis der dukker en op. Den forbyder også `eval` og `new Function`. At scanne kode, du ikke stoler på, udfører den aldrig: statisk analyse læser kildetekst, og kørselsanalysen parser rapportfiler, der allerede ligger på disken.

To forbehold: `npx` henter selv pakken, før noget kører, og garantien dækker `src/`, ikke tredjeparts-plugins.

**Plugins kører ikke i en sandbox.** JS-plugins (`mjolnir-rules/*.mjs` eller npm-pakker angivet under `"plugins"`) kører med fulde Node-rettigheder, samme tillidsmodel som ESLint- eller Vitest-plugins. At indlæse dem er et tilvalg **pr. scan**: uden `--enable-plugins` (eller `MJOLNIR_ENABLE_PLUGINS=1`) indlæses deres kilder aldrig, og en besked på stderr lister, hvad der blev sprunget over. JSON-regelmanifester udfører ingen kode, og præfikserne for core-regel-ID'er er reserverede, så et plugin ikke kan udgive sig for at være en af dem. Rapportér sårbarheder via [SECURITY.md](SECURITY.md).

**Det kører på sig selv.** En verification trust engine har ingen troværdighed, medmindre den selv kan verificeres. Hver CI-kørsel scanner dette repository med det build, samme kørsel producerede. Gaten fejler ved ethvert fund med alvorligheden error, og også ved et **delvist** scan eller en **regel, der gik ned**, fordi et afkortet selvscan, der ikke rapporterer noget, er præcis den falske grønne farve, dette projekt findes for at fange. `mjolnir doctor` reviderer regelbasen igen i samme kørsel (fixture-firewall, ærlige niveauer, loftet for core-niveauet), og et INCONCLUSIVE-tjek fejler præcis som et fejlende tjek. Begge rapporter uploades som build-artefakter.

### Exitkoder og maskinkontrakten

Fastfrosne, så du kan bygge CI-logik på dem:

| Exitkode | Betydning                                                            |
| -------- | -------------------------------------------------------------------- |
| `0`      | Rent: ingen fund på eller over gaten                                 |
| `1`      | Fund på eller over gaten                                             |
| `2`      | Delvist scan (tidsbudget opbrugt, ulæselige filer). Blokerer aldrig. |
| `10`     | Brugsfejl (forkert flag, manglende mål)                              |
| `20`     | Intern fejl                                                          |

`2` er bevidst forskellig fra `0`: et scan, der ikke blev færdigt, har ikke fundet ingenting. Det er bare ikke færdigt med at lede.

Alt, hvad en maskine forbruger (MCP-værktøjsresultater, `--json`, SARIF 2.1), kommer fra ét kanonisk resultat under et versioneret, **kun additivt** skema (`schemaVersion: 1`, `contractVersion: 1`), så ingen forbruger behøver at genskabe betydningen ud fra renderet tekst. Se [maskinkontrakten](docs/machine-contract.md). Regel-ID'er (`QA-<FAMILY>-NNN`) kan ikke ændres, når de er udgivet, og genbruges aldrig.

<br />

## Hvad Mjölnir ikke kan fortælle dig

- **Det kører ikke dine tests.** Et rent scan er ikke en bestået suite.
- **Det kan ikke fortælle dig, at en assertion er _forkert_.** `expect(total).toBe(41)` ser sund ud. Mjölnir finder tests, der _ikke kan fejle_, og pipelines, der _ikke kan blive røde_, ikke tests, der tjekker det forkerte.
- **Det beviser ikke forretningsmæssig korrekthed.** Intet her siger, at dit produkt gør, hvad kravet bad om.
- **100 er ikke bevis for en god suite.** Om din suite dækker din reelle risiko, er et andet spørgsmål, og det besvarer dette værktøj ikke.
- **5 af 79 regler bygger på et skøn**, ikke en målt rate. Hver af dem siger det på sit eget fund.
- **E1 er ikke E2.** Heuristiske fund er værd at læse, ikke værd at anvende i blinde.
- **Et tomt repo får `null`, aldrig 100.**
- **En fil ved navn `*.spec.ts` uden testdeklarationer tæller ikke som dækning.** Et repo, hvis eneste spec-filer indeholder imports eller typer (nul `it`/`test`-kald), får `null`, ikke 100.

<br />

## Dokumentation

Det fulde dokumentationssite ligger på <https://sergey-bar.github.io/Mjolnir/>.

| Dokument                                               | Hvad det indeholder                                 |
| ------------------------------------------------------ | --------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalisering af scoren og vægtning af evidens      |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Kanonisk ordforråd: ét ord pr. begreb               |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Målte falsk-positiv-rater og metoden                |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Regeltilstande, niveauer, undertrykkelse, udfasning |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver-politik, fastfrosne flader, udfasningscyklus |
| [docs/machine-contract.md](docs/machine-contract.md)   | Det kanoniske maskinlæsbare resultat                |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-output og opsætning af editor eller CI        |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code Quality-rapport, MR-opskrift, gate     |
| [docs/rules/](docs/rules/)                             | Genereret katalog pr. regel                         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Udviklingsmiljø og bidragsproces                    |
| [SUPPORT.md](SUPPORT.md)                               | Hvor du kan spørge, rapportere og få hjælp          |
| [SECURITY.md](SECURITY.md)                             | Rapportering af sårbarheder                         |
| [CHANGELOG.md](CHANGELOG.md)                           | Udgivelseshistorik                                  |

### Status

**Version 1.** JSON-skemaet og exitkoderne er fastfrosne kontrakter. TypeScript og Python har den bredeste målte dækning. Java og C# er nyere; læs dem gennem [modenhedstabellen](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Hvad der kommer næste gang, uden opdigtede datoer: [den offentlige roadmap](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Bidrag

Nye regler er det nemmeste første bidrag. Én kommando opretter skelettet til reglen med dens must-fire- **og** must-not-fire-fixtures. Den genererede regel fejler bevidst sine egne fixtures, indtil der er skrevet rigtig detektion, fordi en stub, der bliver leveret, er en regel, ingen har målt:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Udviklingsmiljøet, kommandoerne til de faste gates samt anti-creep- og fixture-firewall-lovene står i [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Kør det på dit repo." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Læs guiden](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Dokumentationssite](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Spørg ikke, om testene bestod.<br />
Spørg, om evidensen beviser, at de fortjener tillid.

<sub>Bygget af [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · MIT-licens</sub>

</div>
