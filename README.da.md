<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Dine tests lyver for dig. Vi beviser det.

**Verification Trust Engine til QA.** Mjölnir auditor testsuiter og
CI-pipelines, rapporterer en værdighedsscore og viser præcis, hvor
tilliden brister.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | Dansk | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Er dine tests værd at stole på?**

[Se det virke](#-se-det-virke) ·
[Hurtig start](#-hurtig-start) ·
[Hvad den tjekker](#-hvad-mjölnir-tjekker) ·
[Scoring](#sådan-fungerer-scoren) ·
[CI](#-ci-integration) · [Konfiguration](#konfiguration) ·
[Dokumentation](#-dokumentation)

</div>

---

## 🎬 Se det virke

<p align="center">
  <img src="assets/readme/demo.svg" alt="Mjölnirs fulde --verbose-rapport over et demo-repo: WORTHINESS 75/100 NEEDS WORK, en opdeling af diagnostik efter kategori, en FIX THIS FIRST-liste og hvert fund med regel-ID og linjenummer på tværs af CI-, Playwright-, testhygiejne- og Python-regler" width="900" />
</p>

<sub>Det komplette `npx mjolnir-qa ./examples/demo-repo --verbose`-output,
renderet af den rigtige reporter — intet klippet væk. Regenereres med
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
får CI til at fejle, hvis artefaktet afviger fra, hvad værktøjet
printer.</sub>

**Hvad der lige er sket:**

1. Mjölnir opdagede Playwright-specs, dens konfiguration,
   CI-workflowet og en Python-testfil — fire sprog/formater, ét
   gennemløb.
2. Den fandt beviser, der svækker tilliden til suiten — en
   `continue-on-error`, der maskerer et job, en `|| true`, der synker
   en exit-kode, hårde sleeps, en skrøbelig selector, hårdkodede
   staging-URL'er, en `networkidle`-venten.
3. Den gjorde hver af dem til et konkret fund med regel-ID, placering
   og fix — og til én score, du kan gate en PR på.

### Ét fund på nært hold

Kør `mjolnir explain QA-CI-001` på det første fund ovenfor, og du får:

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

Det er værdiens enhed: ikke en stilprik, men et sted, hvor dit CI
fortæller dig, at noget bestod, selvom det ikke gjorde.

---

## ⚡ Hurtig start

Kør den mod et repo for en fuld rapport og en værdighedsscore:

```bash
npx mjolnir-qa@latest
```

**I CI er produktet én kommando.** Den scanner kun det, branchen rørte,
og afslutter med ikke-nul ved nye problemer:

```bash
npx mjolnir-qa@latest --scope changed
```

Smid det ind som et PR-check — `mjolnir ci install` skriver workflowet —
og du er færdig. Alt andet er valgfrit.

| Kommando                            | Hvad den gør                                       |
| ----------------------------------- | -------------------------------------------------- |
| `mjolnir`                           | Scanning af hele repoet + værdighedsscore          |
| `mjolnir --scope changed`           | Kun det, din branch introducerede — CI-formen      |
| `mjolnir ci install`                | Genererer den vejledende PR-workflow               |
| `mjolnir explain QA-CI-001`         | Hvad / hvorfor / fix + målt FP-rate for én regel   |
| `mjolnir rules --unmeasured`        | Reglerne, der kører på antagelse, ikke måling      |
| `mjolnir --json` / `--format sarif` | Maskinlæsbart / GitHub Code Scanning               |
| `mjolnir --strict`                  | Kør også quarantine-tier-regler (højere FP-risiko) |

<details>
<summary><strong>Når noget er flaky</strong></summary>

| Kommando                            | Hvad den gør                                              |
| ----------------------------------- | --------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Ægte kørselsdata → `TRUE-FLAKE`-domme, `FLAKY.md`         |
| `mjolnir triage ./test-results/`    | Karantæneforslag fra eksekveringshistorikken              |
| `mjolnir pw-report ./test-results/` | Playwright-runoversigt — retries / flakes / de langsomste |
| `mjolnir doctor:playwright`         | Deep scan kun Playwright + Selector Health Score          |

</details>

<details>
<summary><strong>Lejlighedsvis / rapporter</strong></summary>

| Kommando                        | Hvad den gør                                            |
| ------------------------------- | ------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Sikre autofixes med bevis                               |
| `mjolnir baseline` / `diff`     | Snapshot af fund, rapportér derefter kun nye/forværrede |
| `mjolnir impact --since <ref>`  | Hvad der ændrede sig siden et tidligere commit          |
| `mjolnir debt`                  | Testgældsregister med en kostmodel                      |
| `mjolnir handover`              | Onboarding-kort over suiten til ny QA                   |
| `mjolnir stats`                 | Lokale all-time-tællere af sete fixes                   |
| `mjolnir badge`                 | shields.io-endpoint-JSON + snippet                      |
| `mjolnir rules --md`            | Fuldt regelkatalog (JSON eller Markdown)                |
| `mjolnir doctor`                | Selvundersøgelse af Mjölnirs egen regelbase             |
| `mjolnir create-rule <ID>`      | Scaffold en ny regel + fixtures                         |
| `mjolnir --format mermaid`      | Testarkitekturdiagram til en PR-kommentar               |

</details>

Installér globalt i stedet for `npx`, hvis du foretrækker det:
`npm i -g mjolnir-qa`. Kræver Node.js ≥ 22.18. Virker på Windows, macOS
og Linux.

---

## 👥 Hvem er det til?

- **QA / SDET**, der ejer en e2e- eller integrationsuite og har brug
  for beviser for, at suiten faktisk fortjener den grønne check, den
  producerer.
- **Platform-/DevEx-teams**, der har ansvaret for CI-integritet og
  release gates — folkene, for hvem en `continue-on-error` aldrig må
  male en rød pipeline grøn i stilhed.
- **OSS-maintainere**, der vil have en billig, altid aktiveret
  verifikationsgate, der kører lokalt og i CI uden netværkskald.

---

## 🔨 Hvad Mjölnir tjekker

|     |                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Værdighedsscore** — ét tal, transparent fradragstabel, ingen black box                                            |
| 🎭  | **Selector Health Score** — bedømmer dine Playwright-locators, ikke kun din pass rate                               |
| 🔬  | **Runtime-forundersøgelse** — læser ægte Playwright/JUnit-kørselsdata og fanger `TRUE-FLAKE`, ikke kun statiske gæt |
| 🚨  | **CI-integritetsregler** — fanger `continue-on-error`, `\|\| true` og andre falsk-grønne tricks                     |
| 🐍  | **Alle fire Playwright-bindings** — TypeScript, Python, Java, C#/.NET — plus pytest, JUnit/TestNG og CI-workflows   |
| 🔒  | **Local-first** — nul netværkskald under scanning, nul telemetri, kører på sekunder                                 |

### Reglerne

Hver regel leveres med både must-fire- **og** must-not-fire-fixtures.
En regel, der udløses på sin egen negative fixture, kan ikke skibes —
det er false-positive-firewallen.

<details>
<summary><strong>Testhygiejne</strong></summary>

| ID          | Regel                                                | Severity |
| ----------- | ---------------------------------------------------- | -------- |
| QA-TEST-001 | Committet fokuseret test (`.only`, `fit`)            | error    |
| QA-TEST-002 | Sprunget test uden begrundelse                       | error    |
| QA-TEST-002 | Sprunget test med registreret begrundelse            | warning  |
| QA-TEST-003 | Test uden assertions                                 | error    |
| QA-TEST-004 | Hårdt sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Retry-misbrug, der skjuler flakiness                 | warning  |
| QA-TEST-010 | Tomt testlegeme                                      | error    |

</details>

<details>
<summary><strong>Testkvalitet</strong></summary>

| ID           | Regel                           | Severity |
| ------------ | ------------------------------- | -------- |
| QA-TQUAL-001 | Kun-mock-verifikation           | info     |
| QA-TQUAL-002 | Tautologisk assertion           | error    |
| QA-TQUAL-009 | Assertion på promise uden await | error    |
| QA-TQUAL-011 | Udkommenterede tests            | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Regel                                    | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | Locator-assertion uden await             | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committet | error    |
| QA-PW-004 | Skrøbelige CSS/XPath-selectors           | warning  |
| QA-PW-005 | Forretningslogik i `page.evaluate()`     | info     |
| QA-PW-114 | Legacy element handles (`page.$`)        | info     |
| QA-PW-118 | `networkidle`-venten (flaky by design)   | info     |
| QA-PW-123 | Hårdkodede miljø-URL'er                  | warning  |

</details>

<details>
<summary><strong>CI-integritet</strong></summary>

| ID        | Regel                                                             | Severity |
| --------- | ----------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` maskerer fejl                                 | error    |
| QA-CI-002 | `\|\| true` synker exit-koder                                     | error    |
| QA-CI-005 | Rapport forbruges, men genereres aldrig                           | error    |
| QA-CI-007 | Retry-wrappers omkring tests                                      | warning  |
| QA-CI-008 | Altid-succesfuldt step maskerer fejl                              | error    |
| QA-CI-009 | Testens exit-kode propageres ikke (`\|` uden pipefail, `;`-kæder) | error    |
| QA-CI-010 | Tests sprunget over, hvor de skal blokere (skip-on-PR-guards)     | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Regel                                       | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-PY-002 | Sprunget test (`skip`, ikke-strikt `xfail`) | warning  |
| QA-PY-003 | Testfunktion uden assertions                | error    |
| QA-PY-005 | `time.sleep()` i tests                      | warning  |
| QA-PY-006 | Tomt testlegeme (`pass`)                    | info     |
| QA-PY-010 | Tilfældigheds-/tidsafhængighed uden freeze  | info     |
| QA-PY-012 | Tautologisk assertion                       | error    |

20 Python-regler i alt (QA-PY-001…012 pytest-hygiejne + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Regel                                        | Severity |
| --------- | -------------------------------------------- | -------- |
| QA-JV-101 | Deaktiveret test (`@Disabled`)               | warning  |
| QA-JV-102 | Hårdt sleep (`Thread.sleep()`)               | warning  |
| QA-JV-103 | Testmetode uden assertions                   | error    |
| QA-JV-105 | Playwright hårdt sleep `waitForTimeout()`    | warning  |
| QA-JV-106 | Skrøbelig selector i stedet for role-locator | warning  |
| QA-JV-108 | Hårdkodet miljø-URL i test                   | info     |
| QA-JV-111 | Blanket-mock `page.route("**")`              | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Regel                                        | Severity |
| --------- | -------------------------------------------- | -------- |
| QA-CS-101 | Sprunget test (`[Ignore]`, `[Fact(Skip=)]`)  | warning  |
| QA-CS-102 | Hårdt sleep (`Thread.Sleep` / `Task.Delay`)  | warning  |
| QA-CS-103 | Testmetode uden assertions                   | error    |
| QA-CS-105 | Hårdt sleep `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | Skrøbelig selector i stedet for role-locator | warning  |
| QA-CS-108 | Hårdkodet miljø-URL i test                   | info     |
| QA-CS-111 | Blanket-mock `page.RouteAsync("**")`         | info     |

</details>

> Det fulde, levende katalog — hver regel med tier, confidence,
> false-positive-risiko og autofix-tilgængelighed — genereres fra
> registreren:
>
> ```bash
> mjolnir rules --md
> ```
>
> Sider pr. regel ligger under [`docs/rules/`](docs/rules/).

### Hvor meget er målt

**74 af 99 regler bærer en false-positive-rate målt mod rigtig OSS-kode**
(≥ 10 håndklassificerede fund hver; se
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). De andre 19 skiber på forfatterens
estimat. Hver scan-fodnote fortæller, hvor mange af de _udløste_ regler,
der er målt; `mjolnir rules --unmeasured` lister de uregistrerede; hver
regels `mjolnir explain`-side angiver dens status. Vi offentliggør
raten, selv når den er grim — QA-CS-103 auditeres til 95 % og er sat i
karantæne for det. At få de 78 til at vokse er projektets fortsatte
arbejde.

### Regel-tiers og sproglig modenhed

Hver regel er `core`, `extended` eller `quarantine`, tildelt ud fra sin
**målte** false-positive-rate:

| Tier         | Betydning                                 | Standardscan | `--strict` |
| ------------ | ----------------------------------------- | :----------: | :--------: |
| `core`       | ≤ 10 % målt FP                            |      ✅      |     ✅     |
| `extended`   | ≤ 30 % målt FP                            |      ✅      |     ✅     |
| `quarantine` | over 30 %, eller endnu ikke målt (n < 10) |      ❌      |     ✅     |

| Sprog           | Adapter      | Dækning i dag                                    |
| --------------- | ------------ | ------------------------------------------------ |
| TypeScript / JS | Compiler-AST | bredeste, mest målte — mest `core`/`extended`    |
| Python / pytest | Regex-lag    | bredt, corpus-auditeret — mest `core`/`extended` |
| Java            | Regex-lag    | nyere — mest `extended`/`quarantine`             |
| C# / .NET       | Regex-lag    | nyere — mest `extended`/`quarantine`             |

TypeScript og Python har den bredeste målte dækning. Java og C# er
skibet, dokumenteret og holdes uden for overskriftstallet, indtil en
rigtig forbrugersuite (ikke et binding-biblioteks egne tests) er blevet
auditeret.

---

## Sådan fungerer scoren

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir-terminaloutput — WORTHINESS 75/100 NEEDS WORK, en opdeling af diagnostik efter kategori og en FIX THIS FIRST-liste" width="820" />
</p>

<sub>Regenereres med `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
får CI til at fejle, hvis artefaktet afviger fra, hvad reporteren
faktisk printer.</sub>

Scoren er transparent: **error −8, warning −3, info −1**, derefter
normaliseret efter suitens eksponering (fradrag pr. testdeklaration).
Bevisvægtede fradrag betyder, at svage signaler koster mindre.
Terminalen viser de samme diskonterede tal, som scoren bruger — ingen
black box. Fuld metode: [docs/SCORING.md](docs/SCORING.md).

**Domme**

| Score   | Domme            |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Bevisniveauer** — hvert fund bærer ét; det sætter fundets vægt i
scoren:

| Niveau | Betydning             | Score-effekt   | Eksempel                                           |
| ------ | --------------------- | -------------- | -------------------------------------------------- |
| E2     | Deterministisk defekt | Fuldt fradrag  | Committet `.only` — strukturelt beviseligt         |
| E1     | Heuristisk mønster    | Halvt fradrag  | Regex-fundet `sleep()` — stærkt signal, ikke bevis |
| E0     | Iagttagelse           | Nul (kun info) | Rapporteret, men gater aldrig CI eller trækker fra |

De fleste regler er **E1**. Slagordet „we prove it" henviser til dette
system: E2-fund er strukturelt bevis; E1-fund er korrekt positionerede
advarsler, ikke formelle beviser.

Et tomt repo scorer `null`, aldrig en falsk 100 — se
[Tillidsmodellen](#tillidsmodellen).

---

## 🎭 Selector Health Score

Hovedmetrikken for Playwright-suiter — hvor robuste dine locators er:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Rollebaserede locators får fuld score. CSS-klassekæder og XPath synker
scoren — de brækker ved enhver DOM-refaktor uden at fortælle dig,
hvilken adfærd der er regresseret.

---

## 🔬 Runtime-beviser

Statisk flakiness-detektion er gætteri. Mjölnir læser **ægte
eksekveringsdata** — Playwright JSON-rapporter og JUnit-XML fra enhver
runner:

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

En test, der kun består fra forsøg ≥ 2, er ikke en bestået test — det
er en heldig test. Den markeres `TRUE-FLAKE` uanset den endelige grønne
check.

---

## ⚡ Mjölnir er ikke endnu en linter

Lintere fortæller dig, om koden følger regler. Mjölnir fortæller dig,
om din verifikation kan stoles på.

|                                                           | ESLint / SonarQube | Coverage-værktøjer | Manuelt review | **Mjölnir** |
| --------------------------------------------------------- | :----------------: | :----------------: | :------------: | :---------: |
| CI-workflow-integritet (`continue-on-error`, `\|\| true`) |         ❌         |         ❌         |    sjældent    |     ✅      |
| På tværs af sprog (TS, Python, Java, C#) fra ét værktøj   |         ❌         |         ❌         |       ❌       |     ✅      |
| Bedømmer Playwright-locators robusthed (Selector Health)  |         ❌         |         ❌         |    sjældent    |     ✅      |
| Markerer tests uden rigtige assertions                    |   ✅ (plugin)\*    |         ❌         |  nogle gange   |     ✅      |
| Fanger hårde sleeps (`waitForTimeout`, `time.sleep`)      |   ✅ (plugin)\*    |         ❌         |  nogle gange   |     ✅      |
| Kører på sekunder, nul netværkskald under scanning        |         ✅         |         ✅         |       —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) og `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) dækker dette for deres
respektive frameworks.

**Runtime-analyse** er en separat kategori ud over statisk lintning:

|                                                  | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ------------------------------------------------ | :-----------------------: | :-------------------: | :-------------------: |
| Læser ægte kørselsdata til `TRUE-FLAKE`-domme    |         delvist\*         |     delvist (tag)     |          ✅           |
| Flaky-triage-rapport fra eksekveringshistorikken |            ❌             |          ✅           |          ✅           |
| Integrerer med den statiske værdighedsscore      |            ❌             |          ❌           |          ✅           |

\*Playwright sporer retries internt, men producerer ikke en selvstændig
flakiness-rapport med domme-etiketter.

---

## 🤖 Hvorfor ikke bare bruge AI-kodereview?

Andet problem, andet lag. AI-review kan spotte en mistænkelig
testændring i en diff; det beviser ikke, at verifikationssystemet som
helhed er troværdigt — og det ser kun den diff, du viser det.

|                                             |        AI-kodereview (Copilot m.fl.)        |         **Mjölnir**          |
| ------------------------------------------- | :-----------------------------------------: | :--------------------------: |
| Omkostning pr. scan                         |    Tokens (skalerer med diff-størrelse)     | **Nul** (lokal, installeret) |
| Ser hele suiten + alle CI-konfigs           |          Kun den PR-diff, du viser          |      **Alt, hver gang**      |
| Deterministisk (samme input → samme output) |          ❌ (ikke-deterministisk)           |            **✅**            |
| Fanger mønstre, der har sovet i måneder     |        Kun hvis det er i konteksten         | **✅** (scanner alle filer)  |
| Husker fund mellem kørsler                  | ❌ (ingen hukommelse på tværs af sessioner) |   **✅** (baseline + diff)   |
| Kører uden menneskelig udløser              |          Kræver en PR eller prompt          | **✅** (CI-hook, 3 sekunder) |

**Brug begge.** AI fanger nuance, intention og designfejl, ingen regex
kan finde. Mjölnir fanger de strukturelle mønstre, AI overser, fordi de
ser „intentionelle" ud — et committet `.only`, en opslugt exit-kode,
en `continue-on-error` på et testjob. Det er ikke bugs, der kræver
resonnement; det er fakta, der kræver scanning.

---

## 🤖 CI-integration

Én kommando genererer en PR-workflow — vejledende som standard, aldrig
blokerende:

```bash
mjolnir ci install
```

Eller kobl den native ind i GitHub Code Scanning via SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Editor- og pipeline-opsætning til SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Changed-scope-dækning

`--scope changed` tilskriver fund de linjer, din branch tilføjede i
forhold til merge-base med `main`. Den dækker testfiler (`*.spec.*`,
`*.test.*`) plus GitHub-workflowfiler og Playwright-konfigurationer i
diffen. Når merge-base ikke kan resolve — shallow clone, detached HEAD,
ikke-git-mål, anden default-branch — degraderer den ærligt: fund
falder tilbage til hel-fil-attribuering, og rapporten siger det.
Overskriv base-ref'en med `--base <ref>`.

---

## Konfiguration

Mjölnir er zero-config. En valgfri `mjolnir.config.json` (eller
`.mjolnir.json`) i roden af repoet finjusterer severity, gating og
scope — den ændrer aldrig detektionssemantikken.

| Key                 | Type                                 | Effekt                                                                                                                                                              |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Ekstra ignore-globs (gitignore-undersæt), oven på de indbyggede defaults                                                                                            |
| `gate`              | `"advisory" \| "error" \| "warning"` | Hvilke severities der afslutter med ikke-nul (default `error`; `advisory` blokerer aldrig)                                                                          |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Omrangordner en regels fund for dit repo                                                                                                                            |
| `ignore`            | `IgnoreEntry[]`                      | Undertrykker fund — **`reason` er påkrævet**; indgange udløber efter 90 dage (en eksplicit `expires`-dato, eller config-filens last-modified-tid for indgange uden) |
| `plugins`           | `string[]`                           | Regelpakker fra tredjepart (se [Tillidsmodellen](#tillidsmodellen))                                                                                                 |

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

- **`.mjolnirignore`** — en enkel gitignore-agtig fil til
  sti-udelukkelser, samme dialekt som `exclude`. Brug den til
  maskinspecifikt støj; brug `exclude`, når listen hører til i
  versionsstyring sammen med resten af konfigurationen.
- **CLI-overrides** — `--strict` (inkluder karantæneregler),
  `--width <cols>` og `--ascii` / `--no-ascii` (terminalrendering),
  `--tone blunt` (knugere beskeder), `--max-duration <sec>` (begrænset
  delvis scanning).
- Regelundertrykkelse og deprecation-levetid:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

`ignore`-indgange driver også den selvstændige kommando
`mjolnir suppressions`, som lister, hvad der i øjeblikket er
undertrykket, og hvornår hver indgang udløber.

---

## 📐 Exit-koder & kontrakter

Frosne — trygge at bygge CI-logik på:

| Exit-kode | Betydning                                                            |
| --------- | -------------------------------------------------------------------- |
| `0`       | Rent — ingen fund på eller over gaten                                |
| `1`       | Fund på eller over gaten                                             |
| `2`       | Delvis scanning (tidsbudget ramt, ulæselige filer) — blokerer aldrig |
| `10`      | Brugsfejl (ugyldigt flag, manglende mål)                             |
| `20`      | Intern fejl                                                          |

JSON/SARIF-rapporten er `schemaVersion: 1`. Regel-ID'er
(`QA-<FAMILY>-NNN`) er uforanderlige, når de først er skibet, og
genbruges aldrig.

---

## Tillidsmodellen

- **Local-first** — nul netværkskald under scanning. Ever. Nul
  telemetri.
- **Ingen falsk bevis** — vi siger hellere „ukendt" end „verificeret".
  Et tomt repo får `score: null`, aldrig en falsk 100.
- **Delvis ærlighed** — hvis analysen blev afkortet, siger outputtet
  det. Aldrig „complete", når det ikke er.
- **FP-firewall** — detektion kører på et kommentar-/string-frit view
  af koden (TypeScript-regler bruger compiler-AST): et mønster inde i
  en prosakommentar eller en doc-eksempelstreng er dokumentation, ikke
  et fund.
- **Målt, ikke påstået** — kun regler med en false-positive-rate fra
  rigtig OSS-kode skiber i overskriftstierne (se
  [Hvor meget er målt](#hvor-meget-er-målt)); scan-fodnoten og
  `mjolnir rules --unmeasured` fortæller dig, hvilke der er hvad.
- **Plugin-tillid** — plugins er npm-pakker deklareret under
  `"plugins"`. Der er **ingen sandbox**: plugin-kode kører med fulde
  Node-privilegier, samme tillidsmodel som ESLint- eller
  Vitest-plugins. Core regel-ID-præfikser er reserverede og afvises
  fra plugins mod spoofing.
- **Workspace-lokale eksterne regler** (mappebaserede, nul netværk) —
  en `mjolnir-rules/`-mappe ved siden af scan-målet loader brugerdefinerede
  regler: JSON-filer deklarerer regex-mønstre (ingen kode eksekveres),
  `.mjs`/`.js`-moduler eksporterer `rules` (fuld Node-tillid, som
  plugins). Eksterne regler bærer samme trust-metadata som core; de kan
  aldrig skibe i core-tieren (core kræver en målt FP-rate fra
  corpus-sidecaren — en deklareret `tier: "core"` klemmes til
  `extended`), adlyder tier-grænser og tjekkes for drift:
  `mjolnir rules --md --external` renderer kataloget fra de loadede
  filer (proveniens `external`), og matrixgeneratoren accepterer
  `--external <root>`.

---

## 🏗️ Arkitektur

<details>
<summary>Udvid træet</summary>

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

- **Regler er rene funktioner** — `(SourceFileContext) → Finding[]`,
  ingen I/O, ingen globals. Nyt økosystem = én adapter + dens regler.
- **TypeScript/Playwright bruger compiler-AST** (ts-morph). Python,
  Java og C# kører på et delt regex-lag med maskerede kommentare/strenge.
- Et tree-sitter WASM AST-lag til Java og C# findes og er næste
  præcisionsskridt — det er endnu ikke koblet på den synkrone
  scan-pipeline.

---

## 📚 Dokumentation

| Dokument                                               | Hvad der er i det                           |
| ------------------------------------------------------ | ------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Score-normalisering + bevisvægtning         |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Målte false-positive-rater + metode         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Regeltilstande, undertrykkelse, deprecation |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-output + editor/CI-opsætning          |
| [docs/rules/](docs/rules/)                             | Genereret katalog pr. regel                 |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Dev-opsætning + bidrag workflow             |
| [CHANGELOG.md](CHANGELOG.md)                           | Releasehistorik                             |
| [SECURITY.md](SECURITY.md)                             | Sårbarhedsrapportering                      |

---

## 📈 Status

**v0.5.x · åben beta.** JSON-skemaet og exit-koderne er frosne
kontrakter. TypeScript og Python har den bredeste målte dækning; Java
og C# er nyere — læs dem gennem
[tiers-tabellen](#regel-tiers-og-sproglig-modenhed).

---

## 🤝 Bidrag

Nye regler er den nemmeste første bidrag — én kommando scaffolder
reglen plus dens must-fire- **og** must-not-fire-fixtures (den
genererede regel fejler bevidst dens fixtures, indtil du implementerer
rigtig detektion — en stub kan ikke skibes):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Fuld dev-opsætning, standing-gate-kommandoerne og anti-creep- /
fixture-firewall-lovene er i [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Stop med at skibe tests, du ikke kan stole på.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Bygget af [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
