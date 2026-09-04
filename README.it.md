<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### I tuoi test ti mentono. Noi lo dimostriamo.

**Verification Trust Engine per la QA.** Mjölnir audita le suite di test
e le pipeline CI, riporta un punteggio di idoneità e mostra esattamente
dove la fiducia si rompe.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | Italiano | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**I tuoi test sono degni di fiducia?**

[Guardalo in azione](#-guardalo-in-azione) ·
[Avvio rapido](#-avvio-rapido) ·
[Cosa controlla](#-cosa-controlla-mjölnir) ·
[Punteggio](#come-funziona-il-punteggio) ·
[CI](#-integrazione-ci) · [Configurazione](#configurazione) ·
[Documentazione](#-documentazione)

</div>

---

## 🎬 Guardalo in azione

<p align="center">
  <img src="assets/readme/demo.svg" alt="Il report --verbose completo di Mjölnir su un repo demo: WORTHINESS 75/100 NEEDS WORK, un dettaglio delle diagnosti per categoria, una lista FIX THIS FIRST e ogni riscontro con ID di regola e numero di riga attraverso CI, Playwright, igiene dei test e regole Python" width="900" />
</p>

<sub>L'output completo di `npx mjolnir-qa ./examples/demo-repo --verbose`,
renderizzato dal reporter vero — nulla di tagliato. Rigenerato con
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
fa fallire la CI se deriva da ciò che lo strumento stampa.</sub>

**Cosa è appena successo:**

1. Mjölnir ha individuato le spec Playwright, la sua configurazione, il
   workflow CI e un file di test Python — quattro linguaggi/formati, un
   solo passaggio.
2. Ha trovato evidenze che indeboliscono la fiducia nella suite — un
   `continue-on-error` che maschera un job, un `|| true` che ingoia un
   exit code, sleep hardcoded, un selettore fragile, URL di staging
   hardcoded, un'attesa `networkidle`.
3. Di ciascuna ha fatto un riscontro concreto con ID di regola,
   posizione e fix — e un unico punteggio su cui fare gate di una PR.

### Un riscontro da vicino

Esegui `mjolnir explain QA-CI-001` sul primo riscontro qui sopra e
ottieni:

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

Questa è l'unità di valore: non una svista di stile, ma un punto in cui
la tua CI ti dice che qualcosa è passato quando non è passato.

---

## ⚡ Avvio rapido

Eseguilo su un repo per un report completo e un punteggio di idoneità:

```bash
npx mjolnir-qa@latest
```

**In CI il prodotto è un solo comando.** Scansiona solo ciò che il
branch ha toccato ed esce con un codice diverso da zero su problemi
nuovi:

```bash
npx mjolnir-qa@latest --scope changed
```

Metti quello in un check di PR — `mjolnir ci install` scrive il
workflow — e hai finito. Tutto il resto è opzionale.

| Comando                             | Cosa fa                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `mjolnir`                           | Scansione completa del repo + punteggio di idoneità              |
| `mjolnir --scope changed`           | Solo ciò che il tuo branch ha introdotto — la forma CI           |
| `mjolnir ci install`                | Genera il workflow di PR consultivo                              |
| `mjolnir explain QA-CI-001`         | Cosa / perché / fix + tasso di FP misurato di una regola         |
| `mjolnir rules --unmeasured`        | Le regole che girano per assunzione, non per misurazione         |
| `mjolnir --json` / `--format sarif` | Leggibile da macchina / GitHub Code Scanning                     |
| `mjolnir --strict`                  | Esegue anche le regole del tier quarantena (rischio FP più alto) |

<details>
<summary><strong>Quando qualcosa è instabile</strong></summary>

| Comando                             | Cosa fa                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Dati di run reali → verdetti `TRUE-FLAKE`, `FLAKY.md`      |
| `mjolnir triage ./test-results/`    | Proposta di quarantena dalla cronologia di esecuzione      |
| `mjolnir pw-report ./test-results/` | Riepilogo di run Playwright — retry / flake / più lenti    |
| `mjolnir doctor:playwright`         | Scansione profonda solo Playwright + Selector Health Score |

</details>

<details>
<summary><strong>Occasionale / report</strong></summary>

| Comando                         | Cosa fa                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Auto-fix sicuri con prova                                  |
| `mjolnir baseline` / `diff`     | Snapshot dei riscontri, poi riporta solo nuovi/peggiorati  |
| `mjolnir impact --since <ref>`  | Cosa è cambiato da un commit precedente                    |
| `mjolnir debt`                  | Registro del debito di test con un modello di costo        |
| `mjolnir handover`              | Mappa di onboarding della suite per un nuovo QA            |
| `mjolnir stats`                 | Contatori locali storici dei fix visti                     |
| `mjolnir badge`                 | JSON endpoint di shields.io + snippet                      |
| `mjolnir rules --md`            | Catalogo completo delle regole (JSON o Markdown)           |
| `mjolnir doctor`                | Auto-audit della stessa base di regole di Mjölnir          |
| `mjolnir create-rule <ID>`      | Imposta lo scheletro di una nuova regola + fixture         |
| `mjolnir --format mermaid`      | Diagramma dell'architettura dei test per un commento di PR |

</details>

Installalo globalmente invece che con `npx` se preferisci:
`npm i -g mjolnir-qa`. Richiede Node.js ≥ 22.18. Funziona su Windows,
macOS e Linux.

---

## 👥 Per chi è?

- **QA / SDET** che possiedono una suite e2e o di integrazione e
  hanno bisogno di evidenze che la suite meriti davvero la spunta
  verde che produce.
- **Team Piattaforma / DevEx** responsabili dell'integrità CI e dei
  release gate — le persone per cui un `continue-on-error` non deve mai
  trasformare in silenzio una pipeline rossa in verde.
- **Maintainer OSS** che vogliono un gate di verifica economico,
  sempre attivo, che gira in locale e in CI senza chiamate di rete.

---

## 🔨 Cosa controlla Mjölnir

|     |                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Punteggio di idoneità** — un numero, tabella di deduzioni trasparente, nessuna black box                                 |
| 🎭  | **Selector Health Score** — valuta i tuoi locator Playwright, non solo il pass rate                                        |
| 🔬  | **Forensica di runtime** — legge dati di run reali Playwright/JUnit per agganciare `TRUE-FLAKE`, non solo ipotesi statiche |
| 🚨  | **Regole di integrità CI** — becca `continue-on-error`, `\|\| true` e altri trucchi da falso verde                         |
| 🐍  | **Tutti e quattro i binding Playwright** — TypeScript, Python, Java, C#/.NET — più pytest, JUnit/TestNG e workflow CI      |
| 🔒  | **Local-first** — zero chiamate di rete durante la scansione, zero telemetria, gira in secondi                             |

### Le regole

Ogni regola arriva con fixture must-fire **e** must-not-fire. Una
regola che scatta sulla propria fixture negativa non può essere
pubblicata — quello è il firewall dei falsi positivi.

<details>
<summary><strong>Igiene dei test</strong></summary>

| ID          | Regola                                                   | Severity |
| ----------- | -------------------------------------------------------- | -------- |
| QA-TEST-001 | Test focalizzato committato (`.only`, `fit`)             | error    |
| QA-TEST-002 | Test saltato senza giustificazione                       | error    |
| QA-TEST-002 | Test saltato con giustificazione tracciata               | warning  |
| QA-TEST-003 | Test senza asserzioni                                    | error    |
| QA-TEST-004 | Sleep hardcoded (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Abuso di retry che nasconde l'instabilità                | warning  |
| QA-TEST-010 | Corpo del test vuoto                                     | error    |

</details>

<details>
<summary><strong>Qualità dei test</strong></summary>

| ID           | Regla                             | Severity |
| ------------ | --------------------------------- | -------- |
| QA-TQUAL-001 | Verifica solo con mock            | info     |
| QA-TQUAL-002 | Asserzione tautologica            | error    |
| QA-TQUAL-009 | Asserzione di promise senza await | error    |
| QA-TQUAL-011 | Test commentati                   | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Regla                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PW-002 | Asserzione di locator senza await             | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committati     | error    |
| QA-PW-004 | Selettori CSS/XPath fragili                   | warning  |
| QA-PW-005 | Logica di business dentro `page.evaluate()`   | info     |
| QA-PW-114 | Element handle legacy (`page.$`)              | info     |
| QA-PW-118 | Attese `networkidle` (instabili per progetto) | info     |
| QA-PW-123 | URL di ambiente hardcoded                     | warning  |

</details>

<details>
<summary><strong>Integrità CI</strong></summary>

| ID        | Regla                                                              | Severity |
| --------- | ------------------------------------------------------------------ | -------- |
| QA-CI-001 | `continue-on-error` maschera i fallimenti                          | error    |
| QA-CI-002 | `\|\| true` ingoia gli exit code                                   | error    |
| QA-CI-005 | Report consumato ma mai generato                                   | error    |
| QA-CI-007 | Wrapper di retry attorno ai test                                   | warning  |
| QA-CI-008 | Step sempre riuscito maschera i fallimenti                         | error    |
| QA-CI-009 | Exit code del test non propagato (`\|` senza pipefail, catene `;`) | error    |
| QA-CI-010 | Test saltati dove devono bloccare (guardie skip-on-PR)             | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Regla                                      | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-PY-002 | Test saltato (`skip`, `xfail` non strict)  | warning  |
| QA-PY-003 | Funzione di test senza asserzioni          | error    |
| QA-PY-005 | `time.sleep()` nei test                    | warning  |
| QA-PY-006 | Corpo del test vuoto (`pass`)              | info     |
| QA-PY-010 | Dipendenza da casualità/tempo senza freeze | info     |
| QA-PY-012 | Asserzione tautologica                     | error    |

20 regole Python in totale (QA-PY-001…012 igiene pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Regla                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-JV-101 | Test disabilitato (`@Disabled`)               | warning  |
| QA-JV-102 | Sleep hardcoded (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Metodo di test senza asserzioni               | error    |
| QA-JV-105 | Sleep hardcoded Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Selettore fragile invece di un role locator   | warning  |
| QA-JV-108 | URL di ambiente hardcoded nel test            | info     |
| QA-JV-111 | Mock blanket `page.route("**")`               | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Regla                                           | Severity |
| --------- | ----------------------------------------------- | -------- |
| QA-CS-101 | Test saltato (`[Ignore]`, `[Fact(Skip=)]`)      | warning  |
| QA-CS-102 | Sleep hardcoded (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Metodo di test senza asserzioni                 | error    |
| QA-CS-105 | Sleep hardcoded `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | Selettore fragile invece di un role locator     | warning  |
| QA-CS-108 | URL di ambiente hardcoded nel test              | info     |
| QA-CS-111 | Mock blanket `page.RouteAsync("**")`            | info     |

</details>

> Il catalogo live completo — ogni regola con tier, confidence, rischio
> di falso positivo e disponibilità di autofix — è generato dal
> registro:
>
> ```bash
> mjolnir rules --md
> ```
>
> Le pagine per regola vivono in [`docs/rules/`](docs/rules/).

### Quanto è misurato

**74 regole su 99 portano un tasso di falsi positivi misurato su vero
codice OSS** (≥ 10 riscontri classificati a mano ciascuna; vedi
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Le altre 19 escono sulla stima
dell'autore. Ogni footer di scansione dice quante delle regole
_scattate_ sono misurate; `mjolnir rules --unmeasured` elenca quelle
che non lo sono; la pagina `mjolnir explain` di ogni regola dichiara il
suo stato. Pubblichiamo il tasso anche quando è brutto — QA-CS-103 si
audita al 95 % ed è in quarantena per questo. Far crescere quel 78 è il
lavoro continuo del progetto.

### Tier delle regole e maturità per linguaggio

Ogni regola è `core`, `extended` o `quarantine`, assegnato in base al
suo tasso di falsi positivi **misurato**:

| Tier         | Significato                                   | Scansione predefinita | `--strict` |
| ------------ | --------------------------------------------- | :-------------------: | :--------: |
| `core`       | ≤ 10 % di FP misurato                         |          ✅           |     ✅     |
| `extended`   | ≤ 30 % di FP misurato                         |          ✅           |     ✅     |
| `quarantine` | sopra il 30 %, o non ancora misurato (n < 10) |          ❌           |     ✅     |

| Linguaggio      | Adattatore          | Copertura oggi                                            |
| --------------- | ------------------- | --------------------------------------------------------- |
| TypeScript / JS | AST del compilatore | la più ampia e misurata — soprattutto `core`/`extended`   |
| Python / pytest | Livello regex       | ampia, auditata su corpus — soprattutto `core`/`extended` |
| Java            | Livello regex       | più recente — soprattutto `extended`/`quarantine`         |
| C# / .NET       | Livello regex       | più recente — soprattutto `extended`/`quarantine`         |

TypeScript e Python hanno la copertura misurata più ampia. Java e C#
sono pubblicati, documentati, e restano fuori dal numero di testa fino
a quando una vera suite consumatrice (non i test della stessa
libreria di binding) non sarà stata auditata.

---

## Come funziona il punteggio

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Output terminale di Mjölnir — WORTHINESS 75/100 NEEDS WORK, un dettaglio delle diagnosti per categoria e una lista FIX THIS FIRST" width="820" />
</p>

<sub>Rigenerato con `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
fa fallire la CI se deriva da ciò che il reporter stampa davvero.</sub>

Il punteggio è trasparente: **error −8, warning −3, info −1**, poi
normalizzato per l'esposizione della suite (deduzioni per dichiarazione
di test). Le deduzioni ponderate per evidenza significano che i segnali
deboli costano meno. Il terminale mostra gli stessi numeri scontati che
usa il punteggio — niente black box. Metodo completo:
[docs/SCORING.md](docs/SCORING.md).

**Verdetti**

| Score   | Verdetto         |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Livelli di evidenza** — ogni riscontro ne porta uno; fissano il peso
del riscontro nel punteggio:

| Livello | Significato            | Impatto sul punteggio | Esempio                                                |
| ------- | ---------------------- | --------------------- | ------------------------------------------------------ |
| E2      | Difetto deterministico | Deduzione piena       | `.only` committato — dimostrabile strutturalmente      |
| E1      | Pattern euristico      | Mezza deduzione       | `sleep()` trovato via regex — segnale forte, non prova |
| E0      | Osservazione           | Zero (solo info)      | Riportato ma non fa mai gate alla CI né deduce         |

La maggior parte delle regole è **E1**. Lo slogan «we prove it» si
riferisce a questo sistema: i riscontri E2 sono prova strutturale; i
riscontri E1 sono avvertimenti correttamente posizionati, non prove
formali.

Un repo vuoto ottiene `null`, mai un falso 100 — vedi
[Modello di fiducia](#modello-di-fiducia).

---

## 🎭 Selector Health Score

La metrica di testa per le suite Playwright — quanto sono resilienti
i tuoi locator:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

I locator basati sui ruoli prendono il punteggio pieno. Le catene di
classi CSS e XPath affossano il punteggio — si rompono a ogni refactor
del DOM senza dirti quale comportamento è regredito.

---

## 🔬 Evidenza di runtime

La rilevazione statica di instabilità è tirare a indovinare. Mjölnir
legge **veri dati di esecuzione** — report JSON Playwright e XML JUnit
da qualsiasi runner:

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

Un test che passa solo dal tentativo ≥ 2 non è un test che passa — è un
test fortunato. Viene marcato `TRUE-FLAKE` a prescindere dalla spunta
verde finale.

---

## ⚡ Mjölnir non è un linter in più

I linter ti dicono se il codice segue le regole. Mjölnir ti dice se la
tua verifica può essere ritenuta affidabile.

|                                                               | ESLint / SonarQube | Strumenti di coverage | Review manuale | **Mjölnir** |
| ------------------------------------------------------------- | :----------------: | :-------------------: | :------------: | :---------: |
| Integrità dei workflow CI (`continue-on-error`, `\|\| true`)  |         ❌         |          ❌           |   raramente    |     ✅      |
| Cross-linguaggio (TS, Python, Java, C#) da un solo strumento  |         ❌         |          ❌           |       ❌       |     ✅      |
| Valuta la resilienza dei locator Playwright (Selector Health) |         ❌         |          ❌           |   raramente    |     ✅      |
| Segnala test senza vere asserzioni                            |   ✅ (plugin)\*    |          ❌           |    a volte     |     ✅      |
| Becca gli sleep hardcoded (`waitForTimeout`, `time.sleep`)    |   ✅ (plugin)\*    |          ❌           |    a volte     |     ✅      |
| Gira in secondi, zero chiamate di rete durante la scansione   |         ✅         |          ✅           |       —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) e `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) coprono questo per i rispettivi
framework.

**L'analisi di runtime** è una categoria a sé rispetto al linting
statico:

|                                                    | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| -------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Legge dati di run reali per verdetti `TRUE-FLAKE`  |        parziale\*         |    parziale (tag)     |          ✅           |
| Report di triage dell'instabilità dalla cronologia |            ❌             |          ✅           |          ✅           |
| Si integra con il punteggio di idoneità statico    |            ❌             |          ❌           |          ✅           |

\*Playwright traccia i retry internamente ma non produce un report di
instabilità autonomo con etichette di verdetto.

---

## 🤖 Perché non usare semplicemente la code review con IA?

Problema diverso, livello diverso. Una review IA può beccare una
modifica sospetta a un test in un diff; non dimostra che il sistema di
verifica nel suo insieme sia affidabile — e vede solo il diff che gli
mostri.

|                                               |      Code review IA (Copilot, ecc.)      |           **Mjölnir**           |
| --------------------------------------------- | :--------------------------------------: | :-----------------------------: |
| Costo per scansione                           | Token (scala con la dimensione del diff) |  **Zero** (locale, installato)  |
| Vede tutta la suite + tutte le config CI      |      Solo il diff di PR che mostri       |      **Tutto, ogni volta**      |
| Deterministico (stesso input → stesso output) |         ❌ (non deterministico)          |             **✅**              |
| Becca pattern dormienti da mesi               |          Solo se è nel contesto          | **✅** (scansiona tutti i file) |
| Ricorda i riscontri tra le esecuzioni         |    ❌ (nessuna memoria tra sessioni)     |    **✅** (baseline + diff)     |
| Gira senza innesco umano                      |         Serve una PR o un prompt         |   **✅** (hook CI, 3 secondi)   |

**Usali entrambi.** L'IA becca la sfumatura, l'intento e i difetti di
design che nessuna regex trova. Mjölnir becca i pattern strutturali che
l'IA trascura perché sembrano "intenzionali" — un `.only` committato,
un exit code ingoiato, un `continue-on-error` su un job di test. Non
sono bug che richiedono ragionamento; sono fatti che richiedono
scansione.

---

## 🤖 Integrazione CI

Un comando genera un workflow di PR — consultivo per impostazione
predefinita, mai bloccante:

```bash
mjolnir ci install
```

Oppure collegalo nativamente a GitHub Code Scanning via SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Setup per editor e pipeline per SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Copertura del perimetro modificato

`--scope changed` attribuisce i riscontri alle righe aggiunte nel tuo
branch rispetto al merge-base con `main`. Copre i file di test
(`*.spec.*`, `*.test.*`) più i file di workflow GitHub e le
configurazioni Playwright nel diff. Quando il merge-base non si può
risolvere — clone shallow, HEAD detached, target non git, branch
predefinito diverso — degrada onestamente: i riscontri tornano a
un'attribuzione per intero file e il report lo dice. Sovrascrivi la ref
di base con `--base <ref>`.

---

## Configurazione

Mjölnir è zero-config. Un `mjolnir.config.json` opzionale (o
`.mjolnir.json`) alla radice del repo regola severità, gating e
perimetro — non cambia mai la semantica di rilevamento.

| Key                 | Tipo                                 | Effetto                                                                                                                                                                     |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Glob di ignore aggiuntivi (sottoinsieme gitignore), sopra i default integrati                                                                                               |
| `gate`              | `"advisory" \| "error" \| "warning"` | Quali severità escono con codice diverso da zero (predefinito `error`; `advisory` non blocca mai)                                                                           |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Riordina i riscontri di una regola per il tuo repo                                                                                                                          |
| `ignore`            | `IgnoreEntry[]`                      | Sopprime riscontri — **`reason` è obbligatorio**; le voci scadono dopo 90 giorni (una data `expires` esplicita, o la data di modifica del file di config per le voci senza) |
| `plugins`           | `string[]`                           | Pacchetti di regole di terze parti (vedi [Modello di fiducia](#modello-di-fiducia))                                                                                         |

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

- **`.mjolnirignore`** — un file semplice in stile gitignore per le
  esclusioni di percorsi, stesso dialetto di `exclude`. Usalo per il
  rumore specifico della macchina; usa `exclude` quando la lista
  appartiene al version control, accanto al resto della configurazione.
- **Override CLI** — `--strict` (includere le regole in quarantena),
  `--width <cols>` e `--ascii` / `--no-ascii` (rendering terminale),
  `--tone blunt` (messaggi più secchi), `--max-duration <sec>` (scansione
  parziale limitata).
- Soppressione delle regole e ciclo di vita delle deprecazioni:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

Le voci `ignore` alimentano anche il comando autonomo
`mjolnir suppressions`, che elenca ciò che è attualmente soppresso e
quando scade ogni voce.

---

## 📐 Exit code & contratti

Congelati — sicuri su cui costruire logica CI:

| Exit code | Significato                                                                      |
| --------- | -------------------------------------------------------------------------------- |
| `0`       | Pulito — nessun riscontro a o sopra il gate                                      |
| `1`       | Riscontri a o sopra il gate                                                      |
| `2`       | Scansione parziale (budget di tempo esaurito, file illeggibili) — non blocca mai |
| `10`      | Errore d'uso (flag errato, target mancante)                                      |
| `20`      | Errore interno                                                                   |

Il report JSON/SARIF è `schemaVersion: 1`. Gli ID di regola
(`QA-<FAMILY>-NNN`) sono immutabili una volta pubblicati e mai
riusati.

---

## Modello di fiducia

- **Local-first** — zero chiamate di rete durante la scansione. Mai.
  Zero telemetria.
- **Nessuna prova falsa** — preferiamo dire "sconosciuto" che
  "verificato". Un repo vuoto riceve `score: null`, mai un falso 100.
- **Onestà parziale** — se l'analisi è stata troncata, l'output lo dice.
  Mai "complete" quando non lo è.
- **Firewall FP** — il rilevamento gira su una vista del codice senza
  commenti/stringhe (le regole TypeScript usano l'AST del compilatore):
  un pattern dentro un commento di prosa o una stringa di esempio di
  documentazione è documentazione, non un riscontro.
- **Misurato, non affermato** — solo le regole con un tasso di falsi
  positivi da vero codice OSS escono nei tier di testa (vedi
  [Quanto è misurato](#quanto-è-misurato)); il footer della scansione e
  `mjolnir rules --unmeasured` ti dicono quale è quale.
- **Fiducia nei plugin** — i plugin sono pacchetti npm dichiarati sotto
  `"plugins"`. **Non c'è sandbox**: il codice del plugin gira con tutti
  i privilegi Node, lo stesso modello di fiducia dei plugin ESLint o
  Vitest. I prefissi di ID delle regole core sono riservati e rifiutati
  dai plugin per evitare spoofing.
- **Regole esterne locali al workspace** (basate su cartella, zero
  rete) — una directory `mjolnir-rules/` accanto al target della
  scansione carica regole personalizzate: i file JSON dichiarano
  pattern regex (nessun codice eseguito), i moduli `.mjs`/`.js`
  esportano `rules` (fiducia Node piena, come i plugin). Le regole
  esterne portano gli stessi metadati di fiducia del core; non possono
  mai uscire nel tier core (core richiede un tasso di FP misurato dal
  sidecar corpus — un `tier: "core"` dichiarato viene limitato a
  `extended`), obbediscono ai tetti di tier e sono controllate contro
  la deriva: `mjolnir rules --md --external` renderizza il catalogo dai
  file caricati (provenienza `external`), e il generatore di matrice
  accetta `--external <root>`.

---

## 🏗️ Architettura

<details>
<summary>Espandi l'albero</summary>

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

- **Le regole sono funzioni pure** —
  `(SourceFileContext) → Finding[]`, niente I/O, niente globali.
  Aggiungere un ecosistema = un adattatore + le sue regole.
- **TypeScript/Playwright usa l'AST del compilatore** (ts-morph).
  Python, Java e C# girano su un livello regex condiviso con
  commenti/stringhe mascherati.
- Un livello AST tree-sitter WASM per Java e C# esiste ed è il
  prossimo passo di precisione — non è ancora cablato nella pipeline
  di scansione sincrona.

---

## 📚 Documentazione

| Documento                                              | Cosa contiene                                              |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalizzazione del punteggio + ponderazione dell'evidenza |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Tassi di falsi positivi misurati + metodo                  |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Stati delle regole, soppressione, deprecazione             |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Output SARIF + setup editor/CI                             |
| [docs/rules/](docs/rules/)                             | Catalogo generato per regola                               |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Setup dev + workflow di contribuzione                      |
| [CHANGELOG.md](CHANGELOG.md)                           | Cronologia delle release                                   |
| [SECURITY.md](SECURITY.md)                             | Segnalazione vulnerabilità                                 |

---

## 📈 Stato

**v0.5.x · beta aperta.** Lo schema JSON e gli exit code sono contratti
congelati. TypeScript e Python hanno la copertura misurata più ampia;
Java e C# sono più recenti — leggili attraverso la
[tabella dei tier](#tier-delle-regole-e-maturità-per-linguaggio).

---

## 🤝 Contribuire

Le nuove regole sono il primo contributo più semplice — un comando
imposta lo scheletro della regola più le sue fixture must-fire **e**
must-not-fire (la regola generata fallisce apposta le fixture finché
non implementi il rilevamento vero — uno stub non può uscire):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Setup dev completo, i comandi della barriera permanente e le leggi
anti-creep / firewall delle fixture sono in
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Smetti di pubblicare test di cui non ti puoi fidare.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Costruito da [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
