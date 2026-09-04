<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Tvoji testovi lažu. Mi to dokazujemo.

**Verification Trust Engine za QA.** Mjölnir audita test suite-ove i CI
pipeline-ove, izvještava ocjenjivački rezultat i pokazuje tačno gdje se
povjerenje lomi.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | Bosanski

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Jesu li tvoji testovi dostojni povjerenja?**

[Vidi ga na djelu](#-vidi-ga-na-djelu) ·
[Brzi početak](#-brzi-početak) ·
[Šta provjerava](#-šta-mjölnir-provjerava) ·
[Bodovanje](#kako-radi-bodovanje) ·
[CI](#-ci-integracija) · [Konfiguracija](#konfiguracija) ·
[Dokumentacija](#-dokumentacija)

</div>

---

## 🎬 Vidi ga na djelu

<p align="center">
  <img src="assets/readme/demo.svg" alt="Kompletan --verbose izvještaj Mjölnira nad demo repoom: WORTHINESS 75/100 NEEDS WORK, dijagnostika po kategorijama, lista FIX THIS FIRST i svaki nalaz sa ID-om pravila i brojem linije kroz CI, Playwright, test higijenu i Python pravila" width="900" />
</p>

<sub>Cjelokupan izlaz `npx mjolnir-qa ./examples/demo-repo --verbose`,
renderiran od pravog reportera — ništa skraćeno. Regenerira se preko
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
obara CI ako artefakt odskoči od onoga što alat ispisuje.</sub>

**Šta se upravo desilo:**

1. Mjölnir je pronašao Playwright specifikacije, svoju konfiguraciju,
   CI workflow i Python test fajl — četiri jezika/formata, jedan prolaz.
2. Pronašao je dokaze koji slabe povjerenje u suite — `continue-on-error`
   koji maskira job, `|| true` koji guta exit kod, tvrdi sleepovi,
   krhki selektor, ugrađene staging URL-ove, `networkidle` čekanje.
3. Svaki je pretvorio u konkretan nalaz s ID-om pravila, lokacijom i
   fixom — i u jedan rezultat na koji možeš gate-ovati PR.

### Jedan nalaz izbliza

Pokreni `mjolnir explain QA-CI-001` na prvom nalaženom iznad i dobiješ:

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

To je jedinica vrijednosti: ne sitnica stila, nego mjesto gdje ti CI
poručuje da je nešto prošlo, a nije prošlo.

---

## ⚡ Brzi početak

Pokreni ga nad repoom za kompletan izvještaj i ocjenjivački rezultat:

```bash
npx mjolnir-qa@latest
```

**U CI je proizvod jedna komanda.** Skenira samo ono što je grana
dotakla i izlazi s ne-nula kodom kod novih problema:

```bash
npx mjolnir-qa@latest --scope changed
```

Ubaci to kao check u PR — `mjolnir ci install` piše workflow — i
gotovo. Sve ostalo je opciono.

| Komanda                             | Šta radi                                                |
| ----------------------------------- | ------------------------------------------------------- |
| `mjolnir`                           | Sken cijelog repoa + ocjenjivački rezultat              |
| `mjolnir --scope changed`           | Samo ono što je tvoja grana unijela — CI oblik          |
| `mjolnir ci install`                | Generiše savjetodavni PR workflow                       |
| `mjolnir explain QA-CI-001`         | Šta / zašto / fix + izmjerena FP stopa za jedno pravilo |
| `mjolnir rules --unmeasured`        | Pravila koja rade pretpostavkom, a ne mjerenjem         |
| `mjolnir --json` / `--format sarif` | Mašinski čitljivo / GitHub Code Scanning                |
| `mjolnir --strict`                  | Pokreće i pravila quarantine tier-a (veći rizik FP)     |

<details>
<summary><strong>Kad je nešto flaky</strong></summary>

| Komanda                             | Šta radi                                                 |
| ----------------------------------- | -------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Stvarni podaci runova → presude `TRUE-FLAKE`, `FLAKY.md` |
| `mjolnir triage ./test-results/`    | Prijedlog karantene iz historije izvršavanja             |
| `mjolnir pw-report ./test-results/` | Sažetak Playwright runa — retry / flake / najsporiji     |
| `mjolnir doctor:playwright`         | Dubinski skan samo Playwright + Selector Health Score    |

</details>

<details>
<summary><strong>Povremeno / izvještaji</strong></summary>

| Komanda                         | Šta radi                                          |
| ------------------------------- | ------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Sigurne automatske popravke s dokazom             |
| `mjolnir baseline` / `diff`     | Snimak nalaza, pa izvještaj samo novih/pogoršanih |
| `mjolnir impact --since <ref>`  | Šta se promijenilo od ranijeg commita             |
| `mjolnir debt`                  | Registarr testnog duga s modelom troška           |
| `mjolnir handover`              | Karta onboardingu suite-a za novog QA             |
| `mjolnir stats`                 | Lokalni ukupni brojači viđenih fixova             |
| `mjolnir badge`                 | shields.io endpoint JSON + snippet                |
| `mjolnir rules --md`            | Potpuni katalog pravila (JSON ili Markdown)       |
| `mjolnir doctor`                | Samoaudit Mjölnirove vlastite baze pravila        |
| `mjolnir create-rule <ID>`      | Scafholduje novo pravilo + fixture                |
| `mjolnir --format mermaid`      | Dijagram test arhitekture za PR komentar          |

</details>

Instaliraj globalno umjesto `npx` ako preferiraš: `npm i -g mjolnir-qa`.
Zahtijeva Node.js ≥ 22.18. Radi na Windows, macOS i Linux.

---

## 👥 Za koga je ovo?

- **QA / SDET** koji drže e2e ili integracioni suite i trebaju dokaz da
  suite stvarno zaslužuje zeleni check koji proizvodi.
- **Platform / DevEx timovi** odgovorni za CI integritet i release
  gateove — ljudi kojima je stalo da `continue-on-error` nikad ne
  preboji crveni pipeline u zeleni u tišini.
- **OSS maintaineri** koji žele jeftin, uvijek uključen verifikacioni
  gate koji radi lokalno i u CI bez mrežnih poziva.

---

## 🔨 Šta Mjölnir provjerava

|     |                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Ocjenjivački rezultat** — jedan broj, transparentna tabela odbitaka, bez crne kutije                                |
| 🎭  | **Selector Health Score** — ocjenjuje tvoje Playwright locatore, ne samo prolaznost                                   |
| 🔬  | **Runtime forenzika** — čita stvarne Playwright/JUnit podatke runova i hvata `TRUE-FLAKE`, ne samo statičke nagađanja |
| 🚨  | **Pravila CI integriteta** — hvata `continue-on-error`, `\|\| true` i druge trikove lažno zelenog                     |
| 🐍  | **Sva četiri Playwright bindinga** — TypeScript, Python, Java, C#/.NET — plus pytest, JUnit/TestNG i CI workflowi     |
| 🔒  | **Local-first** — nula mrežnih poziva pri skeniranju, nula telemetrije, radi u sekundama                              |

### Pravila

Svako pravilo dolazi s must-fire **i** must-not-fire fixtureima.
Pravilo koje okida na svojoj negativnoj fixture ne može se isporučiti —
to je vatrozid lažnih pozitiva.

<details>
<summary><strong>Test higijena</strong></summary>

| ID          | Pravilo                                              | Severity |
| ----------- | ---------------------------------------------------- | -------- |
| QA-TEST-001 | Commitiran fokusirani test (`.only`, `fit`)          | error    |
| QA-TEST-002 | Preskočen test bez opravdanja                        | error    |
| QA-TEST-002 | Preskočen test s evidentiranim opravdanjem           | warning  |
| QA-TEST-003 | Test bez asercija                                    | error    |
| QA-TEST-004 | Tvrdi sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Zloupotreba retrya koja krije flakiness              | warning  |
| QA-TEST-010 | Prazno tijelo testa                                  | error    |

</details>

<details>
<summary><strong>Kvalitet testova</strong></summary>

| ID           | Pravilo                       | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | Verifikacija samo mockovima   | info     |
| QA-TQUAL-002 | Tautološka asercija           | error    |
| QA-TQUAL-009 | Asercija neawaitanog promisea | error    |
| QA-TQUAL-011 | Komentarisani testovi         | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Pravilo                                    | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-PW-002 | Asercija lokatora bez awaita               | error    |
| QA-PW-003 | `page.pause()` / `test.only()` commitirani | error    |
| QA-PW-004 | Krhki CSS/XPath selektori                  | warning  |
| QA-PW-005 | Poslovna logika unutar `page.evaluate()`   | info     |
| QA-PW-114 | Legacy element handleovi (`page.$`)        | info     |
| QA-PW-118 | `networkidle` čekanja (flaky po dizajnu)   | info     |
| QA-PW-123 | Ugrađeni URL-ovi okruženja                 | warning  |

</details>

<details>
<summary><strong>CI integritet</strong></summary>

| ID        | Pravilo                                                         | Severity |
| --------- | --------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` maskira padove                              | error    |
| QA-CI-002 | `\|\| true` guta exit kodove                                    | error    |
| QA-CI-005 | Izvještaj se troši ali nikad ne generira                        | error    |
| QA-CI-007 | Retry omotači oko testova                                       | warning  |
| QA-CI-008 | Uvijek uspješan step maskira padove                             | error    |
| QA-CI-009 | Exit kod testa se ne propagira (`\|` bez pipefail, `;` lanci)   | error    |
| QA-CI-010 | Testovi preskaču se gdje moraju blokirati (skip-on-PR guardovi) | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Pravilo                                    | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-PY-002 | Preskočen test (`skip`, nestrogi `xfail`)  | warning  |
| QA-PY-003 | Test funkcija bez asercija                 | error    |
| QA-PY-005 | `time.sleep()` u testovima                 | warning  |
| QA-PY-006 | Prazno tijelo testa (`pass`)               | info     |
| QA-PY-010 | Ovisnost o slučajnosti/vremenu bez freezea | info     |
| QA-PY-012 | Tautološka asercija                        | error    |

Ukupno 20 Python pravila (QA-PY-001…012 pytest higijena + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Pravilo                                   | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-JV-101 | Onemogućen test (`@Disabled`)             | warning  |
| QA-JV-102 | Tvrdi sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Test metoda bez asercija                  | error    |
| QA-JV-105 | Tvrdi sleep Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Krhki selektor umjesto role lokatora      | warning  |
| QA-JV-108 | Ugrađeni URL okruženja u testu            | info     |
| QA-JV-111 | Pokrivni mock `page.route("**")`          | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Pravilo                                      | Severity |
| --------- | -------------------------------------------- | -------- |
| QA-CS-101 | Preskočen test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Tvrdi sleep (`Thread.Sleep` / `Task.Delay`)  | warning  |
| QA-CS-103 | Test metoda bez asercija                     | error    |
| QA-CS-105 | Tvrdi sleep `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | Krhki selektor umjesto role lokatora         | warning  |
| QA-CS-108 | Ugrađeni URL okruženja u testu               | info     |
| QA-CS-111 | Pokrivni mock `page.RouteAsync("**")`        | info     |

</details>

> Potpuni živi katalog — svako pravilo s tierom, confidence, rizikom
> lažnih pozitiva i dostupnošću autofixa — generira se iz registra:
>
> ```bash
> mjolnir rules --md
> ```
>
> Stranice po pravilu žive u [`docs/rules/`](docs/rules/).

### Koliko je od ovoga izmjereno

**74 od 99 pravila nose stopu lažnih pozitiva izmjerenu nad stvarnim
OSS kodom** (≥ 10 ručno klasificiranih nalaza svako; vidi
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Ostalih 19 izlazi na autorovoj
procjeni. Podnožje svakog skana kaže koliko od _okinutih_ pravila je
izmjereno; `mjolnir rules --unmeasured` izlista neizmjerena; stranica
`mjolnir explain` svakog pravila navodi njen status. Objavljujemo stopu
čak i kad je ružna — QA-CS-103 se audita na 95 % i u karanteni je radi
toga. Rast tog 78 je neprekidni rad projekta.

### Tierovi pravila i jezična zrelost

Svako pravilo je `core`, `extended` ili `quarantine`, dodijeljeno prema
njegovoj **izmjerenij** stopi lažnih pozitiva:

| Tier         | Značenje                                 | Zadani skan | `--strict` |
| ------------ | ---------------------------------------- | :---------: | :--------: |
| `core`       | ≤ 10 % izmjerena FP                      |     ✅      |     ✅     |
| `extended`   | ≤ 30 % izmjerena FP                      |     ✅      |     ✅     |
| `quarantine` | iznad 30 %, ili još neizmjereno (n < 10) |     ❌      |     ✅     |

| Jezik           | Adapter        | Pokrivenost danas                                         |
| --------------- | -------------- | --------------------------------------------------------- |
| TypeScript / JS | AST kompajlera | najšira, najviše mjerena — pretežno `core`/`extended`     |
| Python / pytest | Regex sloj     | široka, auditrana na korpusu — pretežno `core`/`extended` |
| Java            | Regex sloj     | novija — pretežno `extended`/`quarantine`                 |
| C# / .NET       | Regex sloj     | novija — pretežno `extended`/`quarantine`                 |

TypeScript i Python imaju najširu izmjerenu pokrivenost. Java i C# su
isporučeni, dokumentirani i ostaju izvan glavnog broja dok se prava
korisnička suite (ne vlastiti testovi binding biblioteke) ne audita.

---

## Kako radi bodovanje

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Terminalni izlaz Mjölnira — WORTHINESS 75/100 NEEDS WORK, dijagnostika po kategorijama i lista FIX THIS FIRST" width="820" />
</p>

<sub>Regenerira se preko `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
obara CI ako artefakt odskoči od onoga što reporter stvarno ispisuje.</sub>

Bodovanje je transparentno: **error −8, warning −3, info −1**, pa
normalizirano izloženošću suite-a (odbitci po deklaraciji testa).
Odbitci ponderirani dokazima znače da slabi signali koštaju manje.
Terminal pokazuje iste popustljive brojeve koje koristi bodovanje —
bez crne kutije. Puna metoda: [docs/SCORING.md](docs/SCORING.md).

**Presude**

| Score   | Presuda          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Nivoi dokaza** — svaki nalaz nosi jedan; on postavlja težinu nalaza u
bodovanju:

| Nivo | Značenje               | Utjecaj na bodovanje | Primjer                                            |
| ---- | ---------------------- | -------------------- | -------------------------------------------------- |
| E2   | Deterministički defekt | Potpuni odbitak      | Commitirani `.only` — strukturno dokazivo          |
| E1   | Heuristički obrazac    | Polovina odbitka     | Regexom pogođen `sleep()` — jak signal, nije dokaz |
| E0   | Zapažanje              | Nula (samo info)     | Prijavljeno ali nikad ne gate-uje CI niti odbija   |

Većina pravila je **E1**. Slogan „we prove it" odnosi se na ovaj
sistem: E2 nalazi su strukturni dokaz; E1 nalazi su ispravno
pozicionirana upozorenja, ne formalni dokazi.

Prazan repo boduje `null`, nikad lažnih 100 — vidi
[Model povjerenja](#model-povjerenja).

---

## 🎭 Selector Health Score

Vodeća metrika za Playwright suiteove — koliko su otporni tvoji
lokatori:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Role-bazirani lokatori osvajaju pun bodovni rezultat. CSS lanac klasa i
XPath tone rezultat — lome se na svakom DOM refactoru ne govoreći ti
koje ponašanje je regresiralo.

---

## 🔬 Runtime dokazi

Statička detekcija flakinessa je nagađanje. Mjölnir čita **stvarne
podatke izvršavanja** — Playwright JSON izvještaje i JUnit XML od
bilo kojeg runnera:

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

Test koji prolazi tek od pokušaja ≥ 2 nije prolazni test — to je
sretan test. Označava se kao `TRUE-FLAKE` bez obzira na konačni zeleni
check.

---

## ⚡ Mjölnir nije još jedan linter

Linteri ti kažu prati li kod pravila. Mjölnir ti kaže može li se tvojoj
verifikaciji vjerovati.

|                                                           | ESLint / SonarQube | Coverage alati | Ručni review | **Mjölnir** |
| --------------------------------------------------------- | :----------------: | :------------: | :----------: | :---------: |
| CI workflow integritet (`continue-on-error`, `\|\| true`) |         ❌         |       ❌       |   rijetko    |     ✅      |
| Unakrsno-jezično (TS, Python, Java, C#) iz jednog alata   |         ❌         |       ❌       |      ❌      |     ✅      |
| Ocjenjuje otpornost Playwright lokatora (Selector Health) |         ❌         |       ❌       |   rijetko    |     ✅      |
| Označava testove bez pravih asercija                      |   ✅ (plugin)\*    |       ❌       |   ponekad    |     ✅      |
| Hvata tvrde sleepove (`waitForTimeout`, `time.sleep`)     |   ✅ (plugin)\*    |       ❌       |   ponekad    |     ✅      |
| Radi u sekundama, nula mrežnih poziva pri skeniranju      |         ✅         |       ✅       |      —       |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) i `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) pokrivaju ovo za svoje
frameworkove.

**Runtime analiza** je odvojena kategorija od statičkog lintanja:

|                                                     | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| --------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Čita stvarne podatke runova za presude `TRUE-FLAKE` |       djelimično\*        |   djelimično (tag)    |          ✅           |
| Izvještaj flaky triaže iz historije izvršavanja     |            ❌             |          ✅           |          ✅           |
| Integrira se sa statičkim ocjenjivačkim rezultatom  |            ❌             |          ❌           |          ✅           |

\*Playwright interno prati retryje ali ne proizvodi samostalan izvještaj
flakinessa s oznakama presuda.

---

## 🤖 Zašto ne koristiti samo AI code review?

Drugi problem, drugi sloj. AI review može primijetiti sumnjivu promjenu
testa u diffu; ne dokazuje da je verifikacioni sistem kao cjelina
dostojan povjerenja — i vidi samo diff koji mu pokažeš.

|                                          |  AI code review (Copilot i sl.)  |           **Mjölnir**           |
| ---------------------------------------- | :------------------------------: | :-----------------------------: |
| Trošak po skanu                          | Tokeni (raste s veličinom diffa) | **Nula** (lokalno, instalirano) |
| Vidi cijeli suite + sve CI konfiguracije |    Samo PR diff koji pokažeš     |       **Sve, svaki put**        |
| Deterministički (isti ulaz → isti izlaz) |      ❌ (nedeterministički)      |             **✅**              |
| Hvata obrasce dormantne mjesecima        |     Samo ako je u kontekstu      |  **✅** (skenira sve fajlove)   |
| Pamti nalaze između runova               | ❌ (nema memorije između sesija) |    **✅** (baseline + diff)     |
| Radi bez ljudskog okidača                |       Treba PR ili prompt        |   **✅** (CI hook, 3 sekunde)   |

**Koristi oba.** AI hvata nijansu, namjeru i dizajnerske mane koje
nijedan regex ne nađe. Mjölnir hvata strukturne obrasce koje AI
zaobilazi jer izgledaju „namjerno" — commitirani `.only`, progutani
exit kod, `continue-on-error` na test jobu. To nisu bugovi koji trebaju
razmišljanje; to su činjenice koje trebaju skeniranje.

---

## 🤖 CI integracija

Jedna komanda generira PR workflow — po defaultu savjetodavan, nikad
blokirajući:

```bash
mjolnir ci install
```

Ili ga poveži nativno u GitHub Code Scanning preko SARIF-a:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Editor i pipeline postavka za SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Pokrivenost promijenjenog opsega

`--scope changed` pripisuje nalazima linije dodane u tvojoj grani naspram
merge-base s `main`. Pokriva test fajlove (`*.spec.*`, `*.test.*`) plus
GitHub workflow fajlove i Playwright konfiguracije u diffu. Kad se
merge-base ne može razriješiti — shallow clone, detached HEAD, non-git
cilj, drugi zadani branch — pošteno degradira: nalazi se vraćaju na
atribuciju po cijelom fajlu i izvještaj to kaže. Prepiši baznu ref s
`--base <ref>`.

---

## Konfiguracija

Mjölnir je zero-config. Opcioni `mjolnir.config.json` (ili
`.mjolnir.json`) u korijenu repoa podešava severity, gating i opseg —
nikad ne mijenja semantiku detekcije.

| Key                 | Tip                                  | Efekat                                                                                                                                                             |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exclude`           | `string[]`                           | Dodatni ignore globovi (gitignore podskup), preko ugrađenih defaulta                                                                                               |
| `gate`              | `"advisory" \| "error" \| "warning"` | Koji severity izlaze s ne-nula kodom (default `error`; `advisory` nikad ne blokira)                                                                                |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Prerangiraje nalaze pravila za tvoj repo                                                                                                                           |
| `ignore`            | `IgnoreEntry[]`                      | Potiskuje nalaze — **`reason` je obavezan**; unosi istječu nakon 90 dana (eksplicitni `expires` datum, ili vrijeme zadnje izmjene config fajla za unose bez njega) |
| `plugins`           | `string[]`                           | Paketi pravila trećih strana (vidi [Model povjerenja](#model-povjerenja))                                                                                          |

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

- **`.mjolnirignore`** — jednostavna gitignore-slična datoteka za
  isključenja putanja, isti dijalekt kao `exclude`. Koristi je za
  mašinski šum; koristi `exclude` kad lista pripadne version kontroli,
  uz ostatak konfiguracije.
- **CLI nadjačavanja** — `--strict` (uključi quarantine pravila),
  `--width <cols>` i `--ascii` / `--no-ascii` (terminalski render),
  `--tone blunt` (oštrije poruke), `--max-duration <sec>` (ograničen
  djelomični skan).
- Potiskivanje pravila i životni ciklus deprecacije:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

`ignore` unosi hrane i samostalnu komandu `mjolnir suppressions`, koja
izlista šta je trenutno potisnuto i kada ističe svaki unos.

---

## 📐 Exit kodovi i ugovori

Zamrznuti — sigurni za gradnju CI logike:

| Exit kod | Značenje                                                                           |
| -------- | ---------------------------------------------------------------------------------- |
| `0`      | Čisto — nema nalaza na ili iznad gatea                                             |
| `1`      | Nalazi na ili iznad gatea                                                          |
| `2`      | Djelimičan skan (potrošen vremenski budžet, nečitljivi fajlovi) — nikad ne blokira |
| `10`     | Greška upotrebe (loš flag, nedostaje cilj)                                         |
| `20`     | Interna greška                                                                     |

JSON/SARIF izvještaj je `schemaVersion: 1`. ID-jevi pravila
(`QA-<FAMILY>-NNN`) su nepromjenjivi jednom isporučeni i nikad se ne
ponovo koriste.

---

## Model povjerenja

- **Local-first** — nula mrežnih poziva tokom skeniranja. Nikad. Nula
  telemetrije.
- **Bez lažnih dokaza** — radije kažemo „nepoznato" nego „verifikovano".
  Prazan repo dobija `score: null`, nikad lažnih 100.
- **Djelimična iskrenost** — ako je analiza prekinuta, izlaz to kaže.
  Nikad „complete" kad nije.
- **FP vatrozid** — detekcija radi na pregledu koda bez komentara i
  stringova (TypeScript pravila koriste AST kompajlera): obrazac unutar
  prosačnog komentara ili doc-primjera-stringa je dokumentacija, ne
  nalaz.
- **Izmjereno, ne tvrđeno** — u glavne tierove ulaze samo pravila sa
  stopom lažnih pozitiva iz stvarnog OSS koda (vidi
  [Koliko je od ovoga izmjereno](#koliko-je-od-ovoga-izmjereno));
  podnožje skana i `mjolnir rules --unmeasured` kažu koje su koje.
- **Povjerenje u pluginove** — pluginovi su npm paketi deklarirani pod
  `"plugins"`. **Nema sandboxa**: plugin kod radi s punim Node
  privilegijama, isti model povjerenja kao ESLint ili Vitest pluginovi.
  Core prefiksi ID-jeva pravila su rezervirani i odbijaju se od
  pluginova radi sprečavanja spoofinga.
- **Eksterna pravila lokalna workspaceu** (folder-bazirana, nula
  mreže) — `mjolnir-rules/` direktorij pored skan cilja učitava
  vlastita pravila: JSON fajlovi deklariraju regex obrasce (nikakav kod
  se ne izvršava), `.mjs`/`.js` moduli eksportuju `rules` (potpuno Node
  povjerenje, kao pluginovi). Eksterna pravila nose iste metadata
  povjerenja kao core; nikad ne mogu ući u core tier (core traži
  izmjerenu FP stopu iz corpus sidecara — deklarirani `tier: "core"`
  se stega na `extended`), poštuju tier limite i provjeravaju se na
  drift: `mjolnir rules --md --external` renderira katalog iz
  učitanih fajlova (provenijencija `external`), a generator matrice
  prima `--external <root>`.

---

## 🏗️ Arhitektura

<details>
<summary>Raširi stablo</summary>

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

- **Pravila su čiste funkcije** — `(SourceFileContext) → Finding[]`,
  bez I/O-a, bez globala. Novi ekosistem = jedan adapter + njegova
  pravila.
- **TypeScript/Playwright koristi AST kompajlera** (ts-morph). Python,
  Java i C# rade na zajedničkom regex sloju s maskiranim komentarima i
  stringovima.
- Tree-sitter WASM AST sloj za Javu i C# postoji i sljedeći je korak
  preciznosti — još nije povezan u sinhroni skan pipeline.

---

## 📚 Dokumentacija

| Dokument                                               | Šta je unutra                                   |
| ------------------------------------------------------ | ----------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalizacija rezultata + ponderiranje dokazima |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Izmjerene stope lažnih pozitiva + metodologija  |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Stanja pravila, potiskivanje, deprecacija       |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF izlaz + editor/CI postavka                |
| [docs/rules/](docs/rules/)                             | Generirani katalog po pravilu                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Dev postavka + workflow doprinosa               |
| [CHANGELOG.md](CHANGELOG.md)                           | Historija izdanja                               |
| [SECURITY.md](SECURITY.md)                             | Prijavljivanje ranjivosti                       |

---

## 📈 Status

**v0.5.x · otvorena beta.** JSON shema i exit kodovi su zamrznuti
ugovori. TypeScript i Python imaju najširu izmjerenu pokrivenost; Java
i C# su noviji — čitaj ih kroz
[tabelu tierova](#tierovi-pravila-i-jezična-zrelost).

---

## 🤝 Doprinos

Nova pravila su najlakši prvi doprinos — jedna komanda scaffolduje
pravilo plus njegove must-fire **i** must-not-fire fixture (generirano
pravilo namjerno pada na fixtureima dok ne implementiraš stvarnu
detekciju — stub se ne može isporučiti):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Potpuni dev setup, komande stalnog gatea i zakoni anti-creep / fixture
vatrozida su u [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Prestani isporučivati testovima kojima ne možeš vjerovati.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Izgradio [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
