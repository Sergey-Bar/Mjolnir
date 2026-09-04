<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Testene dine lyver til deg. Vi beviser det.

**Verification Trust Engine for QA.** Mjölnir auditor testsuiter og
CI-pipelines, rapporterer en verdighetsscore og viser nøyaktig hvor
tilliten bryter sammen.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | Norsk | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Er testene dine verd tillit?**

[Se det virke](#-se-det-virke) ·
[Rask start](#-rask-start) ·
[Hva den sjekker](#-hva-mjölnir-sjekker) ·
[Scoring](#slik-fungerer-scoren) ·
[CI](#-ci-integrasjon) · [Konfigurasjon](#konfigurasjon) ·
[Dokumentasjon](#-dokumentasjon)

</div>

---

## 🎬 Se det virke

<p align="center">
  <img src="assets/readme/demo.svg" alt="Mjölnirs komplette --verbose-rapport over et demo-repo: WORTHINESS 75/100 NEEDS WORK, en oppdeling av diagnostikk etter kategori, en FIX THIS FIRST-liste og hvert funn med regel-ID og linjenummer på tvers av CI-, Playwright-, testhygiene- og Python-regler" width="900" />
</p>

<sub>Det komplette `npx mjolnir-qa ./examples/demo-repo --verbose`-resultatet,
renderet av den ekte reporteren — ingenting klippet vekk. Regenereres
med `npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
får CI til å feile hvis artefakten avviker fra det verktøyet skriver
ut.</sub>

**Hva som nettopp skjedde:**

1. Mjölnir oppdaget Playwright-specs, konfigurasjonen, CI-workflowen og
   en Python-testfil — fire språk/formater, ett gjennomløp.
2. Den fant beviser som svekker tilliten til suiten — en
   `continue-on-error` som maskerer en jobb, en `|| true` som svelger en
   exit-kode, harde sleeps, en skjør selector, hardkodede staging-URLer,
   en `networkidle`-ventetid.
3. Den gjorde hvert av dem til et konkret funn med regel-ID, plassering
   og fiks — og til én score du kan gate en PR på.

### Ett funn på nært hold

Kjør `mjolnir explain QA-CI-001` på det første funnet over, og du får:

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

Det er verdiens enhet: ikke en stilprikke, men et sted der CI-en din
forteller deg at noe besto, selv om det ikke gjorde det.

---

## ⚡ Rask start

Kjør den mot et repo for en full rapport og en verdighetsscore:

```bash
npx mjolnir-qa@latest
```

**I CI er produktet én kommando.** Den skanner bare det branchen rørte
og avslutter med ikke-null ved nye problemer:

```bash
npx mjolnir-qa@latest --scope changed
```

Legg det inn som en PR-sjekk — `mjolnir ci install` skriver workflowen —
og du er ferdig. Alt annet er valgfritt.

| Kommando                            | Hva den gjør                                        |
| ----------------------------------- | --------------------------------------------------- |
| `mjolnir`                           | Skann av hele repoet + verdighetsscore              |
| `mjolnir --scope changed`           | Bare det branchen din innførte — CI-formen          |
| `mjolnir ci install`                | Genererer den rådgivende PR-workflowen              |
| `mjolnir explain QA-CI-001`         | Hva / hvorfor / fiks + målt FP-rate for én regel    |
| `mjolnir rules --unmeasured`        | Reglene som kjører på antagelse, ikke måling        |
| `mjolnir --json` / `--format sarif` | Maskinlesbart / GitHub Code Scanning                |
| `mjolnir --strict`                  | Kjør også quarantine-tier-regler (høyere FP-risiko) |

<details>
<summary><strong>Når noe er flaky</strong></summary>

| Kommando                            | Hva den gjør                                            |
| ----------------------------------- | ------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Ekte kjøringsdata → `TRUE-FLAKE`-dommer, `FLAKY.md`     |
| `mjolnir triage ./test-results/`    | Karanteneforslag fra utførelseshistorikken              |
| `mjolnir pw-report ./test-results/` | Playwright-runoversikt — retries / flakes / de tregeste |
| `mjolnir doctor:playwright`         | Dypskann kun Playwright + Selector Health Score         |

</details>

<details>
<summary><strong>Av og til / rapporter</strong></summary>

| Kommando                        | Hva den gjør                                             |
| ------------------------------- | -------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Trygge autofikser med bevis                              |
| `mjolnir baseline` / `diff`     | Øyeblikksbilde av funn, rapporter så bare nye/forverrede |
| `mjolnir impact --since <ref>`  | Hva som endret seg siden et tidligere commit             |
| `mjolnir debt`                  | Testgjeldsregister med en kostnadsmodell                 |
| `mjolnir handover`              | Onboarding-kart over suiten for ny QA                    |
| `mjolnir stats`                 | Lokale all-time-tellere av sette fikser                  |
| `mjolnir badge`                 | shields.io-endepunkt-JSON + snippet                      |
| `mjolnir rules --md`            | Fullstendig regelkatalog (JSON eller Markdown)           |
| `mjolnir doctor`                | Selvaudit av Mjölnirs egen regelbase                     |
| `mjolnir create-rule <ID>`      | Scaffold en ny regel + fixtures                          |
| `mjolnir --format mermaid`      | Testarkitekturdiagram til en PR-kommentar                |

</details>

Installer globalt i stedet for `npx` hvis du foretrekker det:
`npm i -g mjolnir-qa`. Krever Node.js ≥ 22.18. Fungerer på Windows,
macOS og Linux.

---

## 👥 Hvem er det for?

- **QA / SDET** som eier en e2e- eller integrasjonssuite og trenger
  bevis for at suiten faktisk fortjener den grønne haken den
  produserer.
- **Plattform-/DevEx-team** som har ansvar for CI-integritet og
  release gates — folket som bryr seg om at en `continue-on-error`
  aldri stille maler en rød pipeline grønn.
- **OSS-maintainere** som vil ha en billig, alltid på verifikasjonsgate
  som kjører lokalt og i CI uten nettverkskall.

---

## 🔨 Hva Mjölnir sjekker

|     |                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Verdighetsscore** — ett tall, transparent fradragstabell, ingen black box                                                  |
| 🎭  | **Selector Health Score** — vurderer Playwright-locatorene dine, ikke bare pass rate                                         |
| 🔬  | **Runtime-forundersøkelse** — leser ekte Playwright/JUnit-kjøringsdata og fanger `TRUE-FLAKE`, ikke bare statiske gjetninger |
| 🚨  | **CI-integritetsregler** — fanger `continue-on-error`, `\|\| true` og andre falskgrønne triks                                |
| 🐍  | **Alle fire Playwright-bindings** — TypeScript, Python, Java, C#/.NET — pluss pytest, JUnit/TestNG og CI-workflows           |
| 🔒  | **Local-first** — null nettverkskall under skanning, null telemetri, kjører på sekunder                                      |

### Reglene

Hver regel leveres med både must-fire- **og** must-not-fire-fixtures.
En regel som utløses på sin egen negative fixture, kan ikke skipes —
det er false-positive-brannmuren.

<details>
<summary><strong>Testhygiene</strong></summary>

| ID          | Regel                                                | Severity |
| ----------- | ---------------------------------------------------- | -------- |
| QA-TEST-001 | Commitet fokusert test (`.only`, `fit`)              | error    |
| QA-TEST-002 | Hoppet over test uten begrunnelse                    | error    |
| QA-TEST-002 | Hoppet over test med registrert begrunnelse          | warning  |
| QA-TEST-003 | Test uten assertions                                 | error    |
| QA-TEST-004 | Hardt sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Retry-misbruk som skjuler flakiness                  | warning  |
| QA-TEST-010 | Tomt testkropp                                       | error    |

</details>

<details>
<summary><strong>Testkvalitet</strong></summary>

| ID           | Regel                           | Severity |
| ------------ | ------------------------------- | -------- |
| QA-TQUAL-001 | Kun-mock-verifisering           | info     |
| QA-TQUAL-002 | Tautologisk assertion           | error    |
| QA-TQUAL-009 | Assertion på promise uten await | error    |
| QA-TQUAL-011 | Utkommenterte tester            | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Regel                                    | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | Locator-assertion uten await             | error    |
| QA-PW-003 | `page.pause()` / `test.only()` commitet  | error    |
| QA-PW-004 | Skjøre CSS/XPath-selektorer              | warning  |
| QA-PW-005 | Forretningslogikk i `page.evaluate()`    | info     |
| QA-PW-114 | Legacy element handles (`page.$`)        | info     |
| QA-PW-118 | `networkidle`-ventetid (flaky by design) | info     |
| QA-PW-123 | Hardkodede miljø-URLer                   | warning  |

</details>

<details>
<summary><strong>CI-integritet</strong></summary>

| ID        | Regel                                                              | Severity |
| --------- | ------------------------------------------------------------------ | -------- |
| QA-CI-001 | `continue-on-error` maskerer feil                                  | error    |
| QA-CI-002 | `\|\| true` svelger exit-koder                                     | error    |
| QA-CI-005 | Rapport forbrukes, men genereres aldri                             | error    |
| QA-CI-007 | Retry-wrappers rundt tester                                        | warning  |
| QA-CI-008 | Alltid-vellykket step maskerer feil                                | error    |
| QA-CI-009 | Testens exit-kode propageres ikke (`\|` uten pipefail, `;`-kjeder) | error    |
| QA-CI-010 | Tester hoppes over der de må blokkere (skip-on-PR-guards)          | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Regel                                          | Severity |
| --------- | ---------------------------------------------- | -------- |
| QA-PY-002 | Hoppet over test (`skip`, ikke-strikt `xfail`) | warning  |
| QA-PY-003 | Testfunksjon uten assertions                   | error    |
| QA-PY-005 | `time.sleep()` i tester                        | warning  |
| QA-PY-006 | Tomt testkropp (`pass`)                        | info     |
| QA-PY-010 | Tilfeldighets-/tidsavhengighet uten freeze     | info     |
| QA-PY-012 | Tautologisk assertion                          | error    |

20 Python-regler totalt (QA-PY-001…012 pytest-hygiene + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Regel                                     | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-JV-101 | Deaktivert test (`@Disabled`)             | warning  |
| QA-JV-102 | Hardt sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Testmetode uten assertions                | error    |
| QA-JV-105 | Playwright hardt sleep `waitForTimeout()` | warning  |
| QA-JV-106 | Skjør selector i stedet for role-locator  | warning  |
| QA-JV-108 | Hardkodet miljø-URL i test                | info     |
| QA-JV-111 | Blanket-mock `page.route("**")`           | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Regel                                          | Severity |
| --------- | ---------------------------------------------- | -------- |
| QA-CS-101 | Hoppet over test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Hardt sleep (`Thread.Sleep` / `Task.Delay`)    | warning  |
| QA-CS-103 | Testmetode uten assertions                     | error    |
| QA-CS-105 | Hardt sleep `WaitForTimeoutAsync()`            | warning  |
| QA-CS-106 | Skjør selector i stedet for role-locator       | warning  |
| QA-CS-108 | Hardkodet miljø-URL i test                     | info     |
| QA-CS-111 | Blanket-mock `page.RouteAsync("**")`           | info     |

</details>

> Den fulle, levende katalogen — hver regel med tier, confidence,
> false-positive-risiko og autofix-tilgjengelighet — genereres fra
> registret:
>
> ```bash
> mjolnir rules --md
> ```
>
> Sider per regel ligger under [`docs/rules/`](docs/rules/).

### Hvor mye er målt

**74 av 99 regler bærer en false-positive-rate målt mot ekte OSS-kode**
(≥ 10 håndklassifiserte funn hver; se
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). De andre 19 skiper på
forfatterens estimat. Hver skann-fotnote forteller hvor mange av de
_utløste_ reglene som er målt; `mjolnir rules --unmeasured` lister de
umålte; hver regels `mjolnir explain`-side angir statusen. Vi publiserer
raten selv når den er stygg — QA-CS-103 auditeres til 95 % og er satt i
karantene for det. Å få de 78 til å vokse er prosjektets fortsatte
arbeid.

### Regel-tiers og språkmodenhet

Hver regel er `core`, `extended` eller `quarantine`, tildelt ut fra sin
**målte** false-positive-rate:

| Tier         | Betydning                                | Standardskann | `--strict` |
| ------------ | ---------------------------------------- | :-----------: | :--------: |
| `core`       | ≤ 10 % målt FP                           |      ✅       |     ✅     |
| `extended`   | ≤ 30 % målt FP                           |      ✅       |     ✅     |
| `quarantine` | over 30 %, eller ennå ikke målt (n < 10) |      ❌       |     ✅     |

| Språk           | Adapter        | Dekning i dag                                    |
| --------------- | -------------- | ------------------------------------------------ |
| TypeScript / JS | Kompilator-AST | bredeste, mest målte — mest `core`/`extended`    |
| Python / pytest | Regex-lag      | bredt, corpus-auditeret — mest `core`/`extended` |
| Java            | Regex-lag      | nyere — mest `extended`/`quarantine`             |
| C# / .NET       | Regex-lag      | nyere — mest `extended`/`quarantine`             |

TypeScript og Python har den bredeste målte dekningen. Java og C# er
skipet, dokumentert og holdes utenfor overskriftstallet til en ekte
forbrukersuite (ikke et binding-biblioteks egne tester) er auditeret.

---

## Slik fungerer scoren

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir-terminalutskrift — WORTHINESS 75/100 NEEDS WORK, en oppdeling av diagnostikk etter kategori og en FIX THIS FIRST-liste" width="820" />
</p>

<sub>Regenereres med `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
får CI til å feile hvis artefakten avviker fra det reporteren faktisk
skriver ut.</sub>

Scoren er transparent: **error −8, warning −3, info −1**, deretter
normalisert etter suitens eksponering (fradrag per testdeklarasjon).
Bevisvektede fradrag betyr at svake signaler koster mindre. Terminalen
viser de samme diskonterte tallene scoren bruker — ingen black box.
Full metode: [docs/SCORING.md](docs/SCORING.md).

**Dommer**

| Score   | Domme            |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Bevisnivåer** — hvert funn bærer ett; det setter funnets vekt i
scoren:

| Nivå | Betydning             | Score-effekt    | Eksempel                                            |
| ---- | --------------------- | --------------- | --------------------------------------------------- |
| E2   | Deterministisk defekt | Fullt fradrag   | Commitet `.only` — strukturelt bevisbart            |
| E1   | Heuristisk mønster    | Halvt fradrag   | Regex-truffet `sleep()` — sterkt signal, ikke bevis |
| E0   | Observasjon           | Null (kun info) | Rapportert, men gater aldri CI eller trekker fra    |

De fleste regler er **E1**. Slagordet «we prove it» viser til dette
systemet: E2-funn er strukturelt bevis; E1-funn er korrekt plasserte
advarsler, ikke formelle beviser.

Et tomt repo scorer `null`, aldri en falsk 100 — se
[Tillitsmodellen](#tillitsmodellen).

---

## 🎭 Selector Health Score

Hovedmetrikken for Playwright-suiter — hvor robuste locatorene dine er:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Rollebaserte locators får full score. CSS-klassekjeder og XPath senker
scoren — de brekker ved enhver DOM-refaktor uten å fortelle deg hvilken
atferd som har regressert.

---

## 🔬 Runtime-bevis

Statisk flakiness-deteksjon er gjetting. Mjölnir leser **ekte
kjøringsdata** — Playwright JSON-rapporter og JUnit-XML fra enhver
runner:

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

En test som bare består fra forsøk ≥ 2, er ikke en bestått test — det
er en heldig test. Den merkes `TRUE-FLAKE` uansett den endelige grønne
haken.

---

## ⚡ Mjölnir er ikke enda en linter

Lintere forteller deg om koden følger regler. Mjölnir forteller deg om
verifiseringen din kan stoles på.

|                                                                | ESLint / SonarQube | Coverage-verktøy | Manuell review | **Mjölnir** |
| -------------------------------------------------------------- | :----------------: | :--------------: | :------------: | :---------: |
| CI-workflow-integritet (`continue-on-error`, `\|\| true`)      |         ❌         |        ❌        |    sjelden     |     ✅      |
| Tverrspråklig (TS, Python, Java, C#) fra ett verktøy           |         ❌         |        ❌        |       ❌       |     ✅      |
| Vurderer robustheten til Playwright-locators (Selector Health) |         ❌         |        ❌        |    sjelden     |     ✅      |
| Markerer tester uten ekte assertions                           |   ✅ (plugin)\*    |        ❌        |   av og til    |     ✅      |
| Fanger harde sleeps (`waitForTimeout`, `time.sleep`)           |   ✅ (plugin)\*    |        ❌        |   av og til    |     ✅      |
| Kjører på sekunder, null nettverkskall under skanning          |         ✅         |        ✅        |       —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) og `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) dekker dette for sine
respektive rammeverk.

**Runtime-analyse** er en egen kategori ved siden av statisk linting:

|                                                 | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ----------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Leser ekte kjøringsdata til `TRUE-FLAKE`-dommer |         delvis\*          |     delvis (tag)      |          ✅           |
| Flaky-triage-rapport fra utførelseshistorikken  |            ❌             |          ✅           |          ✅           |
| Integrerer med den statiske verdighetsscoren    |            ❌             |          ❌           |          ✅           |

\*Playwright sporer retries internt, men produserer ikke en selvstendig
flakiness-rapport med dommeetiketter.

---

## 🤖 Hvorfor ikke bare bruke AI-kodereview?

Annet problem, annet lag. AI-review kan spotte en mistenkelig
testendring i en diff; det beviser ikke at verifiseringssystemet som
helhet er troverdig — og det ser bare diffen du viser det.

|                                             |      AI-kodereview (Copilot m.fl.)      |         **Mjölnir**          |
| ------------------------------------------- | :-------------------------------------: | :--------------------------: |
| Kostnad per skann                           |  Tokens (skalerer med diffstørrelsen)   | **Null** (lokal, installert) |
| Ser hele suiten + alle CI-konfigs           |         Bare PR-diffen du viser         |      **Alt, hver gang**      |
| Deterministisk (samme input → samme output) |        ❌ (ikke-deterministisk)         |            **✅**            |
| Fanger mønstre som har sovet i måneder      |      Bare hvis det er i konteksten      | **✅** (skanner alle filer)  |
| Husker funn mellom kjøringer                | ❌ (ingen hukommelse på tvers av økter) |   **✅** (baseline + diff)   |
| Kjører uten menneskelig utløser             |        Krever en PR eller prompt        | **✅** (CI-hook, 3 sekunder) |

**Bruk begge.** AI fanger nyanse, intensjon og designfeil ingen regex
kan finne. Mjölnir fanger de strukturelle mønstrene AI overser fordi de
ser «intensjonelle» ut — et commitet `.only`, en oppslukt exit-kode, en
`continue-on-error` på et testjobb. Det er ikke bugs som krever
resonnering; det er fakta som krever skanning.

---

## 🤖 CI-integrasjon

Én kommando genererer en PR-workflow — rådgivende som standard, aldri
blokkerende:

```bash
mjolnir ci install
```

Eller koble den nativt inn i GitHub Code Scanning via SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Editor- og pipeline-oppsett for SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Changed-scope-dekning

`--scope changed` tilskriver funn de linjene branchen din la til
i forhold til merge-base med `main`. Den dekker testfiler (`*.spec.*`,
`*.test.*`) pluss GitHub-workflowfiler og Playwright-konfigurasjoner i
diffen. Når merge-base ikke kan resolve — shallow clone, detached HEAD,
ikke-git-mål, annen default-branch — degraderer den ærlig: funn faller
tilbake til hel-fil-attribuering, og rapporten sier det. Overskriv
base-ref med `--base <ref>`.

---

## Konfigurasjon

Mjölnir er zero-config. En valgfri `mjolnir.config.json` (eller
`.mjolnir.json`) i roten av repoet fininnstiller severity, gating og
scope — den endrer aldri deteksjonssemantikken.

| Key                 | Type                                 | Effekt                                                                                                                                                                     |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Ekstra ignore-globs (gitignore-delmengde), oppå de innebygde defaultene                                                                                                    |
| `gate`              | `"advisory" \| "error" \| "warning"` | Hvilke severities som avslutter med ikke-null (default `error`; `advisory` blokkerer aldri)                                                                                |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Omrangerer en regels funn for repoet ditt                                                                                                                                  |
| `ignore`            | `IgnoreEntry[]`                      | Undertrykker funn — **`reason` er påkrevd**; oppføringer utløper etter 90 dager (en eksplisitt `expires`-dato, eller config-filens last-modified-tid for oppføringer uten) |
| `plugins`           | `string[]`                           | Regelpakker fra tredjepart (se [Tillitsmodellen](#tillitsmodellen))                                                                                                        |

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

- **`.mjolnirignore`** — en enkel gitignore-lignende fil for
  sti-ekskluderinger, samme dialekt som `exclude`. Bruk den for
  maskinspesifikk støy; bruk `exclude` når listen hører hjemme i
  versjonskontroll sammen med resten av konfigurasjonen.
- **CLI-overrides** — `--strict` (inkluder karantèneregler),
  `--width <cols>` og `--ascii` / `--no-ascii` (terminalrendering),
  `--tone blunt` (hardere meldinger), `--max-duration <sec>`
  (begrenset delvis skanning).
- Regelundertrykkelse og deprecation-levetid:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

`ignore`-oppføringer driver også den selvstendige kommandoen
`mjolnir suppressions`, som lister hva som er undertrykket nå, og når
hver oppføring utløper.

---

## 📐 Exit-koder & kontrakter

Frosne — trygge å bygge CI-logikk på:

| Exit-kode | Betydning                                                                   |
| --------- | --------------------------------------------------------------------------- |
| `0`       | Rent — ingen funn på eller over gaten                                       |
| `1`       | Funn på eller over gaten                                                    |
| `2`       | Delvis skanning (tidsbudsjett brukt opp, ulesebare filer) — blokkerer aldri |
| `10`      | Bruksfeil (ugyldig flagg, manglende mål)                                    |
| `20`      | Intern feil                                                                 |

JSON/SARIF-rapporten er `schemaVersion: 1`. Regel-IDer
(`QA-<FAMILY>-NNN`) er uforanderlige én gang skipet og gjenbrukes
aldri.

---

## Tillitsmodellen

- **Local-first** — null nettverkskall under skanning. Ever. Null
  telemetri.
- **Ingen falsk bevis** — vi sier heller «ukjent» enn «verifisert». Et
  tomt repo får `score: null`, aldri en falsk 100.
- **Delvis ærlighet** — hvis analysen ble avkortet, sier utdataene det.
  Aldri «complete» når det ikke er tilfelle.
- **FP-brannmur** — deteksjon kjører på et kommentar-/streng-fritt view
  av koden (TypeScript-regler bruker kompilator-AST): et mønster inne i
  en prosakommentar eller en doc-eksempelstreng er dokumentasjon, ikke
  et funn.
- **Målt, ikke påstått** — bare regler med en false-positive-rate fra
  ekte OSS-kode skiper i overskriftstierne (se
  [Hvor mye er målt](#hvor-mye-er-målt)); skann-fotnoten og
  `mjolnir rules --unmeasured` forteller deg hvilke som er hva.
- **Plugin-tillit** — plugins er npm-pakker deklarert under
  `"plugins"`. Det er **ingen sandbox**: plugin-kode kjører med fulle
  Node-privilegier, samme tillitsmodell som ESLint- eller
  Vitest-plugins. Core regel-ID-prefiks er reservert og avvises fra
  plugins mot spoofing.
- **Workspace-lokale eksterne regler** (mappebaserte, null nettverk) —
  en `mjolnir-rules/`-mappe ved siden av skannemålet loader
  tilpassede regler: JSON-filer deklarerer regex-mønstre (ingen kode
  eksekveres), `.mjs`/`.js`-moduler eksporterer `rules` (full
  Node-tillit, som plugins). Eksterne regler bærer samme
  trust-metadata som core; de kan aldri skipe i core-tieren (core
  krever en målt FP-rate fra corpus-sidecaren — en deklarert
  `tier: "core"` klemmes til `extended`), adlyder tier-grenser og
  sjekkes for drift: `mjolnir rules --md --external` renderer
  katalogen fra de lastede filene (proveniens `external`), og
  matrisegeneratoren aksepterer `--external <root>`.

---

## 🏗️ Arkitektur

<details>
<summary>Utvid treet</summary>

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

- **Regler er rene funksjoner** — `(SourceFileContext) → Finding[]`,
  ingen I/O, ingen globals. Nye økosystem = én adapter + dens regler.
- **TypeScript/Playwright bruker kompilator-AST** (ts-morph). Python,
  Java og C# kjører på et delt regex-lag med maskerte kommentar/strenger.
- Et tree-sitter WASM AST-lag for Java og C# finnes og er neste
  presisjonssteg — det er ennå ikke koblet på den synkrone
  skanne-pipelinen.

---

## 📚 Dokumentasjon

| Dokument                                               | Hva som er i det                            |
| ------------------------------------------------------ | ------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Score-normalisering + bevisvektning         |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Målte false-positive-rater + metode         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Regeltilstander, undertrykking, deprecation |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-utdata + editor/CI-oppsett            |
| [docs/rules/](docs/rules/)                             | Generert katalog per regel                  |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Dev-oppsett + bidragsflyt                   |
| [CHANGELOG.md](CHANGELOG.md)                           | Utgivelseshistorikk                         |
| [SECURITY.md](SECURITY.md)                             | Sårbarhetsrapportering                      |

---

## 📈 Status

**v0.5.x · åpen beta.** JSON-skjemaet og exit-kodene er frosne
kontrakter. TypeScript og Python har den bredeste målte dekningen; Java
og C# er nyere — les dem gjennom
[tiers-tabellen](#regel-tiers-og-språkmodenhet).

---

## 🤝 Bidra

Nye regler er den enkleste første bidraget — én kommando scaffolder
regelen pluss dens must-fire- **og** must-not-fire-fixtures (den
genererte regelen feiler bevisst fixturene sine til du implementerer
ekte deteksjon — en stub kan ikke skipes):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Full dev-oppsett, standing-gate-kommandoene og anti-creep- /
fixture-brannmur-lovene er i [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Slutt å skipe tester du ikke kan stole på.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Bygget av [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
