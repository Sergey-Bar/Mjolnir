<div align="center">

<img src="assets/readme/hero.svg" alt="QA Doctor. I test ti dicono cosa è passato. QA Doctor ti dice di cosa puoi fidarti." width="100%" />

<br />

QA Doctor trova i test che non possono fallire e le pipeline che non possono diventare rosse,<br />
poi valuta fino a che punto ci si può fidare del risultato, con la prova per ogni punto.

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

[Guardalo all'opera](#guardalo-allopera) · [Avvio rapido](#avvio-rapido) · [Cosa trova](#cosa-trova-mjölnir) · [Punteggio](#il-punteggio-di-affidabilità) · [Evidenze](#il-modello-di-evidenza) · [Analisi forense](#analisi-forense-del-runtime) · [CI](#integrità-della-ci) · [Agenti](#agenti-ia) · [Sicurezza](#fiducia-e-sicurezza) · [Limiti](#cosa-mjölnir-non-può-dirti) · [Documentazione](#documentazione)

<details>
<summary>Leggi in un'altra lingua — 22 traduzioni</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | Italiano | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Una spunta verde è un'affermazione, non una prova

Una spunta verde significa che la pipeline non è fallita. Non significa che i test siano stati eseguiti, né che avrebbero potuto fallire. Ognuno di questi casi passa in verde:

- un `.only` committato che ha eseguito 3 test invece di 900
- `continue-on-error: true` sul job che doveva fare da gate
- `|| true` dopo il comando dei test
- un test che non verifica nulla, o con il corpo vuoto
- un wrapper di retry che trasforma un vero fallimento in un passaggio fortunato
- un report che il workflow carica ma che non è mai stato generato
- uno sleep fisso che tiene insieme una race condition

Nessuno di questi fa diventare rossa la pipeline, e ognuno sembra intenzionale in review. Per questo sopravvivono. Ecco QA Doctor che ne legge uno reale:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Il workflow CI del repository demo, letto riga per riga. QA Doctor segnala ogni rilievo alla riga riportata, con la sua regola, cosa non va, il suo livello di evidenza e il suo tasso di falsi positivi misurato." width="800" />
</p>

<sub>Ogni rilievo che la scansione demo ha riportato per questo workflow, alla riga riportata. Generato da `npm run docs:readme-brand` a partire da [`demo-report.json`](assets/readme/demo-report.json) e bloccato contro le derive in CI.</sub>

**Modalità rigorosa.** I rilevamenti più aggressivi — `.only`, `continue-on-error`, test vuoti, abuso di retry — vivono nel livello di quarantena. Funzionano solo con `--strict` e sono limitati alla gravità `info`: segnalano, non bloccano mai. La scansione predefinita (`npx mjolnir-qa@latest` senza `--strict`) copre solo regole core ed extended. Aggiungi `--strict` quando vuoi anche il livello consultivo.

QA Doctor legge la suite, i workflow CI e, se ce l'hai, il report di un'esecuzione reale. Non esegue i tuoi test, non installa le tue dipendenze e non esegue il codice che scansiona. E quando non ha evidenze, lo dice invece di inventarsi fiducia:

| Situazione                                               | Cosa riporta QA Doctor                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Nessuna dichiarazione di test trovata                    | Punteggio `null`, mostrato come **UNKNOWN**. Mai un 100 inventato. |
| Nessuna baseline o revisione confrontabile               | **UNKNOWN**, con il motivo indicato. Mai uno 0 presunto.           |
| Scansione interrotta (budget di tempo, file illeggibili) | **PARTIAL**, uscita `2`. Mai presentata come pulita.               |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Come funziona QA Doctor. Legge staticamente la suite di test e la pipeline CI, e il report di un'esecuzione reale quando c'è. Pesa ogni rilievo in base al livello di evidenza e al livello di fiducia, dove solo un'esecuzione reale può raggiungere da L3 a L5, e produce rilievi, un punteggio di affidabilità e un gate CI con codici di uscita congelati. Nel ciclo dell'agente, l'IA scrive la correzione e QA Doctor riesegue la scansione per dimostrarla." width="880" />
</p>

<sub>Composto per questa pagina e mostrato 1:1. Generato da `npm run docs:readme-brand` e bloccato contro le derive in CI; punteggio, conteggi e ID della regola provengono da [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) e dal registro delle regole, mai digitati a mano. La stessa immagine come poster: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Guardalo all'opera

Una scansione reale di [`examples/demo-repo`](examples/demo-repo), una piccola suite Playwright con un workflow CI. Ecco dove sono finiti i suoi punti:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Il dettaglio delle detrazioni di QA Doctor: WORTHINESS 80/100 WORTHY, il punteggio per categoria, il riquadro delle detrazioni per gravità e una lista FIX THIS FIRST" width="520" />
</p>

<sub>Generato da `npm run docs:hero` a partire da una scansione reale e bloccato contro le derive in CI. Il report `--verbose` completo della stessa scansione è [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Guardalo</strong> — una scansione, la correzione che stampa e la nuova scansione che la dimostra</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Un fotogramma della registrazione demo: npx mjolnir-qa@latest che scansiona il repository demo in una finestra di terminale" width="900" />
  </a>
</p>

<sub>Renderizzato fotogramma per fotogramma da una scansione reale con `npm run docs:video`; mai registrato dallo schermo. Seleziona il fotogramma per aprire [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Un rilievo, da vicino

Ogni rilievo risponde a quattro domande: dove si trova, quanto è sicuro QA Doctor, quanto spesso la regola sbaglia e come correggerlo.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Il primo rilievo della scansione demo, esattamente come lo stampa il terminale, con le sue quattro parti evidenziate: dove, quanto è sicuro, quanto spesso la regola sbaglia, e la correzione." width="100%" />
</p>

`mjolnir explain QA-CI-001` stampa l'intero fascicolo di fiducia di una regola, compreso il suo tasso di falsi positivi misurato e il livello che quel tasso le ha fatto guadagnare:

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

Questa è l'unità di valore: un punto in cui la CI riporta un successo che non si è guadagnata.

<br />

## Avvio rapido

```bash
npx mjolnir-qa@latest
```

Scansiona la directory corrente e stampa il Trust Report: cosa ha trovato, fino a che punto puoi fidarti, perché e cosa fare dopo. Esce con `0` quando non è stato trovato nulla al livello del gate o sopra.

In CI, scansiona solo ciò che il branch ha introdotto, così una suite legacy non sommerge la tua prima pull request:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` lo scrive come workflow GitHub Actions, usando l'[action](https://github.com/Sergey-Bar/Mjolnir#readme) fissata al tag maggiore `v1` (o un semplice `npx` con `--no-action`). Resta consultivo finché non decidi che deve bloccare.

| Comando                             | Cosa fa                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `mjolnir`                           | Trust Report: verdetto, confidenza, prossima azione                    |
| `mjolnir --scope changed`           | Solo ciò che il tuo branch ha introdotto (la forma per la CI)          |
| `mjolnir ci install`                | Genera il workflow consultivo per le PR (basato sull'action)           |
| `mjolnir explain QA-CI-001`         | Cosa, perché e correzione, più il tasso di FP misurato                 |
| `mjolnir why src/a.spec.ts:42`      | Perché proprio questa riga è stata segnalata. Non blocca mai.          |
| `mjolnir forensics ./test-results/` | Evidenze di runtime da un'esecuzione reale                             |
| `mjolnir trust-report`              | Trust Artifact autonomo (md + json)                                    |
| `mjolnir handoff`                   | Piano di correzione per un agente di coding                            |
| `mjolnir --json` / `--format sarif` | Output leggibile dalle macchine, GitHub Code Scanning                  |
| `mjolnir --format codequality`      | Report GitLab Code Quality (artefatto del widget della MR)             |
| `mjolnir --strict`                  | Esegue anche le regole del livello quarantine (rischio di FP più alto) |

<details>
<summary><strong>Tutti gli altri comandi</strong> — triage dei test instabili, report, governance</summary>

<br />

| Comando                             | Cosa fa                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Il banner del punteggio di prima del Trust Report                                       |
| `mjolnir explain verdict`           | Perché il verdetto della scansione salvata è quello che è                               |
| `mjolnir triage ./test-results/`    | Triage guidato. Ogni riga termina con una prossima azione.                              |
| `mjolnir pw-report ./test-results/` | Riepilogo dell'esecuzione Playwright: retry, test instabili, i più lenti                |
| `mjolnir doctor:playwright`         | Scansione approfondita solo Playwright più Selector Health Score                        |
| `mjolnir fix --dry-run` / `fix`     | Correzioni automatiche sicure, ognuna riscansionata per dimostrare che è andata a segno |
| `mjolnir baseline` / `diff`         | Fotografa i rilievi, poi riporta solo quelli nuovi o peggiorati                         |
| `mjolnir impact --since <ref>`      | Cosa ha introdotto e risolto un commit                                                  |
| `mjolnir summary`                   | Annotazioni CI e un riepilogo dello step da un report                                   |
| `mjolnir pr-comment`                | Un commento di PR mirato, in Markdown                                                   |
| `mjolnir debt`                      | Registro del debito di test con un modello di costo                                     |
| `mjolnir handover`                  | Mappa di onboarding della suite per un nuovo ingegnere QA                               |
| `mjolnir init`                      | Rileva i framework, stampa una checklist di configurazione                              |
| `mjolnir suppressions`              | Elenca i rilievi soppressi, per la governance                                           |
| `mjolnir rules --unmeasured`        | Le regole che girano su un'ipotesi, non su una misura                                   |
| `mjolnir rules --md`                | Catalogo completo delle regole (JSON o Markdown)                                        |
| `mjolnir doctor`                    | Autoverifica della base di regole di QA Doctor                                          |
| `mjolnir create-rule <ID>`          | Crea lo scheletro di una nuova regola e delle sue fixture                               |
| `mjolnir stats`                     | Contatori locali complessivi delle correzioni viste                                     |
| `mjolnir badge`                     | JSON dell'endpoint shields.io e snippet                                                 |
| `mjolnir --cache`                   | Riscansioni incrementali tramite una cache locale dei verdetti                          |
| `mjolnir --format mermaid`          | Diagramma dell'architettura dei test per un commento di PR                              |

`mjolnir help <command>` stampa uso, esempi e il passo successivo per ognuno di essi.

</details>

Richiede **Node.js ≥ 22.18** su Windows, macOS o Linux. Preferisci un'installazione globale? `npm i -g mjolnir-qa`. Il requisito minimo viene dalla toolchain di build (tsdown lo ha come target e la pipeline di rilascio esegue smoke test su di esso); le dipendenze di runtime non chiedono di più.

<br />

## Cosa trova QA Doctor

<p align="center">
  <img src="assets/readme/stack.svg" alt="Funziona con il tuo stack: i linguaggi, i framework di test e i sistemi CI coperti dalle sue regole, dal registro delle regole." width="100%" />
</p>

**79 regole** in quattro famiglie — igiene dei test, qualità dei test, Playwright e integrità della CI — per TypeScript e JavaScript, Python, Java, C# e YAML di GitHub Actions. Coprono Playwright in tutti e quattro i binding, oltre a pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest e Mocha, con una copertura iniziale per Cypress e Selenium. Nove di esse, per mostrarne la forma:

| ID           | Regola                                                                    | Gravità | Livello    |
| ------------ | ------------------------------------------------------------------------- | ------- | ---------- |
| QA-CI-001    | `continue-on-error` maschera un gate di verifica che fallisce             | error   | quarantine |
| QA-CI-009    | Codice di uscita dei test non propagato (`\|` senza pipefail, catene `;`) | error   | extended   |
| QA-TEST-001  | Test focalizzato committato (`.only`, `fit`)                              | error   | quarantine |
| QA-TEST-003  | Test senza asserzioni                                                     | error   | quarantine |
| QA-TQUAL-009 | Asserzione su promise senza await                                         | error   | quarantine |
| QA-PW-002    | Asserzione su locator senza await                                         | error   | core       |
| QA-PW-004    | Selettori CSS/XPath fragili                                               | warning | quarantine |
| QA-PY-002    | Test saltato (`skip`, `xfail` non rigoroso)                               | warning | core       |
| QA-CS-103    | Metodo di test senza asserzioni                                           | error   | core       |

Il catalogo completo è generato dal registro, mai mantenuto a mano: `mjolnir rules --md`, [`docs/rules/`](docs/rules/), oppure la [guida a cosa controlla](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Ogni regola citata in questo README</strong>, in un'unica tabella</summary>

<br />

> Le regole `quarantine` girano solo con `--strict` e non bloccano mai (sono limitate a info). La gravità mostrata è quella definita dall'autore.

| ID           | Famiglia   | Regola                                                           | Gravità | Livello    |
| ------------ | ---------- | ---------------------------------------------------------------- | ------- | ---------- |
| QA-TEST-001  | Igiene     | Test focalizzato committato (`.only`, `fit`)                     | error   | quarantine |
| QA-TEST-002  | Igiene     | Test saltato. Sale a `error` senza un motivo tracciato.          | warning | quarantine |
| QA-TEST-003  | Igiene     | Test senza asserzioni                                            | error   | quarantine |
| QA-TEST-004  | Igiene     | Sleep fisso (`waitForTimeout`, `sleep()`, `delay()`)             | warning | extended   |
| QA-TEST-006  | Igiene     | Abuso dei retry che nasconde l'instabilità                       | warning | quarantine |
| QA-TEST-010  | Igiene     | Corpo del test vuoto                                             | error   | quarantine |
| QA-TQUAL-002 | Qualità    | Asserzione tautologica                                           | error   | quarantine |
| QA-TQUAL-009 | Qualità    | Asserzione su promise senza await                                | error   | quarantine |
| QA-TQUAL-011 | Qualità    | Test commentati                                                  | warning | extended   |
| QA-PW-002    | Playwright | Asserzione su locator senza await                                | error   | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` committato                        | error   | core       |
| QA-PW-004    | Playwright | Selettori CSS/XPath fragili                                      | warning | quarantine |
| QA-PW-123    | Playwright | URL di ambiente scritti nel codice                               | warning | quarantine |
| QA-PW-140    | Playwright | Screenshot senza `maxDiffPixelRatio`                             | warning | core       |
| QA-CI-001    | CI         | `continue-on-error` maschera un gate che fallisce                | error   | quarantine |
| QA-CI-002    | CI         | `\|\| true` ingoia i codici di uscita                            | error   | extended   |
| QA-CI-005    | CI         | Report consumato ma mai generato                                 | error   | quarantine |
| QA-CI-007    | CI         | Wrapper di retry attorno ai test                                 | warning | extended   |
| QA-CI-008    | CI         | Step sempre riuscito che maschera i fallimenti                   | error   | quarantine |
| QA-CI-009    | CI         | Codice di uscita non propagato (`\|` senza pipefail, catene `;`) | error   | extended   |
| QA-CI-010    | CI         | Test saltati dove devono bloccare                                | error   | quarantine |
| QA-PY-002    | Python     | Test saltato (`skip`, `xfail` non rigoroso)                      | warning | core       |
| QA-PY-003    | Python     | Funzione di test senza asserzioni                                | error   | quarantine |
| QA-PY-005    | Python     | `time.sleep()` nei test                                          | warning | extended   |
| QA-PY-012    | Python     | Asserzione tautologica                                           | error   | quarantine |
| QA-JV-101    | Java       | Test disabilitato (`@Disabled`)                                  | warning | core       |
| QA-JV-102    | Java       | Sleep fisso (`Thread.sleep()`)                                   | warning | extended   |
| QA-JV-103    | Java       | Metodo di test senza asserzioni                                  | error   | extended   |
| QA-JV-105    | Java       | Sleep fisso con `waitForTimeout()` di Playwright                 | warning | core       |
| QA-JV-106    | Java       | Selettore fragile invece di un locator per ruolo                 | warning | quarantine |
| QA-CS-101    | C#         | Test saltato (`[Ignore]`, `[Fact(Skip=)]`)                       | warning | core       |
| QA-CS-102    | C#         | Sleep fisso (`Thread.Sleep` / `Task.Delay`)                      | warning | core       |
| QA-CS-103    | C#         | Metodo di test senza asserzioni                                  | error   | core       |
| QA-CS-105    | C#         | Sleep fisso con `WaitForTimeoutAsync()`                          | warning | extended   |
| QA-CS-106    | C#         | Selettore fragile invece di un locator per ruolo                 | warning | quarantine |

Python include anche QA-PY-001…012 (igiene pytest) e QA-PY-101…108 (Playwright per Python). Cypress e Selenium hanno set iniziali di tre regole ciascuno.

</details>

Ogni regola viene rilasciata con una fixture must-fire **e** una must-not-fire, e una regola che scatta sulla propria fixture negativa non può essere rilasciata. È il firewall contro i falsi positivi; `mjolnir doctor` lo impone nella CI di questo repository.

### Selector Health Score

`mjolnir doctor:playwright` valuta ogni locator in base a come trova un elemento: come farebbe un utente (ruolo, etichetta, testo), tramite un contratto esplicito (`data-testid`) o per un caso strutturale (catene CSS, XPath). Ogni file riceve un punteggio da 0 a 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Questo misura la **resilienza, non la correttezza**. `.btn.btn-primary > div:nth-child(2)` passa oggi e continua a passare finché qualcuno non tocca il markup. Un punteggio basso non afferma mai che il test è rotto, solo che dipende da un markup che nessuno ha promesso di mantenere.

<br />

## Il punteggio di affidabilità

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="La scala di affidabilità da 0 a 100, con un indicatore che percorre ogni punteggio: UNWORTHY sotto 50, NEEDS WORK da 50 a 79, WORTHY da 80 a 99, FORGED a 100" width="720" />
</p>

<sub>Ogni punteggio da 0 a 100, posizionato dal vero `deriveScoreState`. Generato da `npm run docs:gauge` e bloccato contro le derive in CI.</sub>

| Punteggio | Verdetto                                           |
| --------- | -------------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                       |
| `50 – 79` | **NEEDS WORK**                                     |
| `80 – 99` | **WORTHY**                                         |
| `100`     | **FORGED**                                         |
| `null`    | **UNKNOWN**: nessuna dichiarazione di test trovata |

**Come viene calcolato.** La gravità fissa una detrazione di base (`error −8`, `warning −3`, `info −1`) e il livello di evidenza la sconta: E2 conta per intero, E1 a metà (arrotondato per difetto), E0 per niente. Il totale è normalizzato sull'esposizione della suite, cioè detrazioni per dichiarazione di test anziché per file. Il terminale stampa gli stessi numeri scontati usati dal punteggio; non esiste un secondo modello nascosto. Dettagli: [docs/SCORING.md](docs/SCORING.md) e la [guida al punteggio](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Cosa non significa 100.** Non significa che il software sia corretto, che la suite sia adeguata o che il prodotto sia privo di difetti. Significa una cosa sola: **nessuna delle regole valutate da QA Doctor ha prodotto una detrazione con questa scansione e questo modello di evidenza.**

<br />

## Il modello di evidenza

Ogni rilievo porta due etichette: quanto è sicuro QA Doctor e fino a che punto il rilievo è stato verificato. È la differenza tra uno strumento che segnala pattern e uno strumento su cui puoi basare il via libera a un rilascio.

**Quanto è sicuro — il livello di evidenza.**

| Livello | Nome                 | Significa                                                | Detrazione |
| ------- | -------------------- | -------------------------------------------------------- | ---------- |
| **E2**  | Prova deterministica | Il difetto è presente nel codice così come è scritto     | Piena      |
| **E1**  | Evidenza da pattern  | Ha corrisposto un pattern strettamente legato al difetto | Metà       |
| **E0**  | Osservazione         | Utile da sapere. Non afferma che qualcosa sia sbagliato. | Zero       |

La confidenza in un rilevamento non è la forza della prova. Una regola può essere certa di aver trovato ciò che cercava e star comunque guardando un'euristica. I rilievi E1 servono per essere letti e valutati, mai applicati alla cieca, e questo limite è impresso sul rilievo nel terminale, nel JSON e nel passaggio all'agente.

**Fino a che punto è verificato — il livello di fiducia.** La maggior parte dei rilievi nasce dalla lettura del tuo codice. Dai a QA Doctor il report di un'esecuzione reale dei test e potrà confermare che il codice è stato davvero eseguito.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="La scala di fiducia da L0 a L5. Da L0 a L2 derivano dalla lettura del codice; da L3 a L5 richiedono il report di un'esecuzione reale, segnato da un'interruzione nella scala." width="100%" />
</p>

| Livello | In parole semplici       | Cosa serve                                                              |
| ------- | ------------------------ | ----------------------------------------------------------------------- |
| **L0**  | Annotato                 | Leggere il codice                                                       |
| **L1**  | Sembra il problema       | Leggere il codice: un pattern ha corrisposto                            |
| **L2**  | Dimostrato nel codice    | Leggere il codice: il difetto è strutturale                             |
| **L3**  | Il file è stato eseguito | Un report di esecuzione mostra che il file del rilievo è stato eseguito |
| **L4**  | Il test è stato eseguito | Un report di esecuzione mostra che il test del rilievo è stato eseguito |
| **L5**  | L'esecuzione concorda    | Il risultato stesso dell'esecuzione conferma la classe di difetto       |

Una scansione statica si ferma a L2. Solo il report di un'esecuzione reale (Playwright JSON, Jest o Vitest JSON, JUnit XML) può portare un rilievo a L3 o oltre, così un rilievo che non è mai stato visto in esecuzione non può mai affermare di esserlo stato. Definizioni: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Quanto di tutto questo è misurato

**74 regole su 79 hanno un tasso di falsi positivi misurato su codice OSS reale** (almeno 10 rilievi classificati a mano ciascuna; vedi [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Le altre 5 si basano sulla stima dell'autore e lo dicono, regola per regola, in `mjolnir explain`. `mjolnir rules --unmeasured` le elenca, e il piè di pagina di ogni scansione riporta quante delle regole effettivamente _scattate_ sono misurate.

I tassi restano pubblici anche quando sono cattivi. QA-TEST-001 (un `.only` committato) va male nell'audit sui repository reali e per questo sta in quarantine. Il dato aggiornato di ogni regola, QA-PW-141 compresa, è nell'audit.

### Livelli di fiducia delle regole

I livelli seguono il tasso di falsi positivi misurato, non un'opinione:

| Livello        | FP misurato                       | Comportamento                                        |
| -------------- | --------------------------------- | ---------------------------------------------------- |
| **core**       | ≤ 10%                             | Report predefinito, blocca                           |
| **extended**   | ≤ 30%                             | Report predefinito, confidenza più bassa             |
| **quarantine** | > 30% o esplicitamente dichiarato | Solo con `--strict`, limitato a info, non blocca mai |
| _non misurata_ | n < 10                            | Non può essere promossa a core finché non è misurata |

Le fasce di FP possono solo retrocedere un livello — non promuovono mai una regola fuori da `quarantine` se è stata esplicitamente dichiarata lì. Una regla esplicitamente messa in quarantine rimane in quarantine indipendentemente dal suo tasso di FP misurato.

Promozione, retrocessione e maturità per linguaggio: [ciclo di vita delle regole](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Perché non è un linter

I linter ti dicono se il codice segue delle regole. QA Doctor ti dice se della tua verifica ci si può fidare.

|                                                               | Linter (ESLint, SonarQube) | Strumenti di copertura | Code review con IA |   **QA Doctor**   |
| ------------------------------------------------------------- | :------------------------: | :--------------------: | :----------------: | :---------------: |
| Valuta il **sistema di verifica**, non il codice del prodotto |             No             |           No           |         No         |        Sì         |
| Integrità dei workflow CI (`continue-on-error`, `\|\| true`)  |             No             |           No           |    solo il diff    |        Sì         |
| Valuta la resilienza dei locator Playwright (Selector Health) |             No             |           No           |         No         |        Sì         |
| Legge dati di esecuzione reali per i verdetti `TRUE-FLAKE`    |             No             |           No           |         No         |        Sì         |
| Pubblica un tasso di falsi positivi misurato per regola       |             No             |           No           |         No         |        Sì         |
| Segnala i test senza asserzioni                               |            Sì\*            |           No           |      a volte       |        Sì         |
| Rileva gli sleep fissi (`waitForTimeout`, `time.sleep`)       |            Sì\*            |           No           |      a volte       |        Sì         |
| Deterministico (stesso input, stesso output)                  |             Sì             |           Sì           |         No         |        Sì         |
| Costo per scansione                                           |          gratuito          |        gratuito        |       token        | **zero** (locale) |

<sub>\*Coperto da `eslint-plugin-jest` e `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) e dalle regole sulle asserzioni di SonarQube. Le colonne descrivono il comportamento predefinito per la verifica delle suite di test; plugin, piani a pagamento e regole personalizzate cambiano alcune risposte. È un riepilogo di posizionamento, non un benchmark.</sub>

Usa anche la review con IA. Coglie sfumature, intenzioni e difetti di progettazione che nessun pattern può trovare. QA Doctor coglie ciò che la review con IA trascura perché sembra intenzionale: un `.only` committato, un codice di uscita ingoiato, un `continue-on-error` su un job di test. Per questi serve una scansione, non un ragionamento.

<br />

## Analisi forense del runtime

L'analisi statica ragiona su codice che non è mai stato eseguito. L'analisi forense legge ciò che è successo davvero: Playwright JSON, Jest JSON, Vitest JSON e JUnit XML da qualsiasi runner.

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

`TRUE-FLAKE` non significa che il test è stato ritentato. Significa che il test **ha fallito almeno un tentativo e poi è finito in verde**: un passaggio fortunato, segnalato qualunque cosa dica la spunta finale. `mjolnir triage` trasforma quello storico in una proposta di quarantena, e `mjolnir pw-report` riassume un'esecuzione. Sono proprio questi report di esecuzione a portare i rilievi ai livelli di fiducia L3 e superiori.

<br />

## Integrità della CI

Un test può passare mentre la pipeline intorno a lui non può fallire. QA Doctor legge anche i workflow: `continue-on-error`, `|| true`, codici di uscita che non vengono mai propagati, step sempre riusciti, report consumati ma mai generati e gate saltati proprio negli eventi che dovrebbero bloccare. Ogni rilievo indica il job, lo step e la riga, e porta il proprio livello di evidenza.

Genera il workflow per le PR, consultivo per impostazione predefinita:

```bash
mjolnir ci install
```

Oppure aggiungi l'action del Marketplace a un workflow che hai già:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Fissa `@v1` per seguire la linea maggiore, oppure un tag esatto (`@v0.5.32`) per un gate riproducibile. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) copre il Marketplace, Smithery e i registri MCP.

Per portare i rilievi in GitHub Code Scanning, carica il SARIF (richiede `security-events: write` a livello di workflow o job):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

Su GitLab, `--format codequality` scrive il report Code Quality che leggono il widget della MR e le annotazioni del diff ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Configurazione dell'editor e della pipeline: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Attribuzione sull'ambito modificato

```bash
npx mjolnir-qa@latest --scope changed
```

I rilievi vengono attribuiti alle righe aggiunte dal tuo branch, misurate rispetto alla **merge-base**. L'ambito è lo stesso insieme di file che scopre una scansione completa (spec TS/JS e configurazioni degli adapter, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), più le modifiche non committate e non tracciate, quindi funziona anche prima del commit. La base viene risolta come `main → master → origin/main → origin/master → origin/HEAD`; puoi sovrascriverla con `--base <ref>`.

Quando la merge-base non può essere risolta (un clone superficiale, un HEAD staccato, un target fuori da git), i rilievi ripiegano sull'attribuzione all'intero file **e il report lo dice.** Un ripiego silenzioso sarebbe proprio il tipo di difetto che questo strumento esiste per scovare.

<br />

## Agenti IA

I rilievi valgono qualcosa solo se qualcosa agisce su di essi.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**L'IA scrive la correzione. QA Doctor la verifica.** La prova viene dalla nuova scansione, mai dal resoconto di successo dell'agente stesso.

| Comando           | Cosa riceve l'agente                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | Un server [MCP](https://modelcontextprotocol.io) su stdio. `scan`, `explain` e `diff` diventano strumenti invocabili.                                                            |
| `mjolnir handoff` | Un report `--json` salvato diventa un piano Markdown deterministico: cosa è stato rilevato, il limite di evidenza per ogni rilievo, cosa **non** deve cambiare, come verificare. |
| `mjolnir install` | Scrive nelle superfici per agenti che il tuo repo ha già (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) così l'agente riesegue la scansione prima di dichiarare di aver finito. |

Aggiungilo a un client che ha una propria CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Oppure a qualsiasi client che accetti un blocco `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**Il guardrail conta più della comodità.** Ogni rilievo in un passaggio porta il suo limite. **E2** dice _deterministico: controlla la posizione e applica la correzione_. **E1** dice _RICHIEDE CONFERMA: l'osservazione da sola non dimostra il difetto_. Un agente che corregge un E1 alla cieca, sopprime una regola o modifica una regola per alzare il punteggio sta facendo esattamente ciò che questo strumento esiste per scovare, quindi il passaggio lo dice nel prompt, accanto al rilievo.

<br />

## Fiducia e sicurezza

**Local-first, zero telemetria.** Nessuna API con accesso alla rete (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) esiste da nessuna parte in `src/`, e [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) fa fallire la build se ne compare una. Vieta anche `eval` e `new Function`. Scansionare codice non attendibile non lo esegue mai: l'analisi statica legge il testo sorgente e l'analisi forense interpreta file di report che esistono già su disco.

Due avvertenze: `npx` stesso scarica il pacchetto prima che qualsiasi cosa venga eseguita, e la garanzia copre `src/`, non i plugin di terze parti.

**I plugin non sono in sandbox.** I plugin JS (`mjolnir-rules/*.mjs`, o i pacchetti npm elencati sotto `"plugins"`) girano con tutti i privilegi di Node, lo stesso modello di fiducia dei plugin di ESLint o Vitest. Caricarli è una scelta esplicita **per scansione**: senza `--enable-plugins` (o `MJOLNIR_ENABLE_PLUGINS=1`) i loro sorgenti non vengono mai caricati, e un avviso su stderr elenca cosa è stato saltato. I manifesti di regole JSON non eseguono codice, e i prefissi degli ID delle regole core sono riservati, così nessun plugin può spacciarsi per una di esse. Segnala le vulnerabilità tramite [SECURITY.md](SECURITY.md).

**Gira su se stesso.** Un motore di fiducia della verifica non ha credibilità se non è esso stesso verificabile. Ogni esecuzione della CI scansiona questo repository con la build prodotta da quella stessa esecuzione. Il gate fallisce su qualsiasi rilievo di gravità error, e anche su una scansione **parziale** o su una **regola andata in crash**, perché un'autoscansione troncata che non riporta nulla è proprio il falso verde che questo progetto esiste per scovare. `mjolnir doctor` ri-verifica la base di regole nella stessa esecuzione (firewall delle fixture, onestà dei livelli, tetto del livello core), e un controllo INCONCLUSIVE fallisce esattamente come uno fallito. Entrambi i report vengono caricati come artefatti della build.

### Codici di uscita e contratto macchina

Congelati, così puoi costruirci sopra la logica della CI:

| Codice di uscita | Significato                                                                      |
| ---------------- | -------------------------------------------------------------------------------- |
| `0`              | Pulito: nessun rilievo al livello del gate o sopra                               |
| `1`              | Rilievi al livello del gate o sopra                                              |
| `2`              | Scansione parziale (budget di tempo esaurito, file illeggibili). Non blocca mai. |
| `10`             | Errore d'uso (flag errato, target mancante)                                      |
| `20`             | Errore interno                                                                   |

`2` è volutamente diverso da `0`: una scansione che non è finita non ha trovato «niente». Semplicemente non ha finito di cercare.

Tutto ciò che una macchina consuma (risultati degli strumenti MCP, `--json`, SARIF 2.1) proviene da un unico risultato canonico sotto uno schema versionato e **solo additivo** (`schemaVersion: 1`, `contractVersion: 1`), così nessun consumatore deve ricostruire il significato dal testo renderizzato. Vedi [il contratto macchina](docs/machine-contract.md). Gli ID delle regole (`QA-<FAMILY>-NNN`) sono immutabili una volta rilasciati e non vengono mai riutilizzati.

<br />

## Cosa QA Doctor non può dirti

- **Non esegue i tuoi test.** Una scansione pulita non è una suite che passa.
- **Non può dirti che un'asserzione è _sbagliata_.** `expect(total).toBe(41)` sembra sana. QA Doctor trova i test che _non possono fallire_ e le pipeline che _non possono diventare rosse_, non i test che verificano la cosa sbagliata.
- **Non dimostra la correttezza di business.** Niente qui dice che il tuo prodotto fa ciò che il requisito chiedeva.
- **Un 100 non è la prova di una buona suite.** Se la tua suite copre il tuo rischio reale è un'altra domanda, e questo strumento non vi risponde.
- **5 regole su 79 si basano su una stima**, non su un tasso misurato. Ognuna lo dice sul proprio rilievo.
- **E1 non è E2.** I rilievi euristici meritano di essere letti, non di essere applicati alla cieca.
- **Un repo vuoto ottiene `null`, mai 100.**
- **Un file chiamato `*.spec.ts` senza dichiarazioni di test non conta come copertura.** Un repo i cui unici file spec contengono import o tipi (zero chiamate `it`/`test`) ottiene `null`, non 100.

<br />

## Documentazione

Il sito completo della documentazione è su <https://sergey-bar.github.io/Mjolnir/>.

| Documento                                              | Cosa contiene                                               |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalizzazione del punteggio e ponderazione delle evidenze |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Vocabolario canonico: una parola per concetto               |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Tassi di falsi positivi misurati e il metodo                |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Stati delle regole, livelli, soppressione, deprecazione     |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Politica semver, superfici congelate, ciclo di deprecazione |
| [docs/machine-contract.md](docs/machine-contract.md)   | Il risultato canonico leggibile dalle macchine              |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Output SARIF e configurazione dell'editor o della CI        |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: report Code Quality, ricetta per le MR, gate        |
| [docs/rules/](docs/rules/)                             | Catalogo generato per regola                                |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Ambiente di sviluppo e flusso di contribuzione              |
| [SUPPORT.md](SUPPORT.md)                               | Dove chiedere, segnalare e ottenere aiuto                   |
| [SECURITY.md](SECURITY.md)                             | Segnalazione delle vulnerabilità                            |
| [CHANGELOG.md](CHANGELOG.md)                           | Storico dei rilasci                                         |

### Stato

**Versione 1.** Lo schema JSON e i codici di uscita sono contratti congelati. TypeScript e Python hanno la copertura misurata più ampia. Java e C# sono più recenti; leggili attraverso la [tabella di maturità](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Cosa viene dopo, senza date inventate: [la roadmap pubblica](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Contribuire

Le nuove regole sono il primo contributo più semplice. Un comando crea lo scheletro della regola con le sue fixture must-fire **e** must-not-fire. La regola generata fallisce di proposito le proprie fixture finché non viene scritto un vero rilevamento, perché uno stub rilasciato è una regola che nessuno ha misurato:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

L'ambiente di sviluppo, i comandi dei gate permanenti e le leggi anti-creep e del firewall delle fixture si trovano in [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Provalo sul tuo repo." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Leggi la guida](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Sito della documentazione](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Non chiederti se i test sono passati.<br />
Chiediti se le evidenze dimostrano che meritano fiducia.

<sub>Creato da [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · Licenza MIT</sub>

</div>
