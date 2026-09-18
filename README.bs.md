<div align="center">

<img src="assets/readme/hero.svg" alt="QA Doctor. Testovi vam govore šta je prošlo. QA Doctor vam govori čemu možete vjerovati." width="100%" />

<br />

QA Doctor pronalazi testove koji ne mogu pasti i pipelineove koji ne mogu postati crveni,<br />
a zatim ocjenjuje koliko se rezultatu može vjerovati, uz dokaz za svaki bod.

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

[Pogledajte kako radi](#pogledajte-kako-radi) · [Brzi početak](#brzi-početak) · [Šta pronalazi](#šta-mjölnir-pronalazi) · [Ocjena](#ocjena-vrijednosti) · [Dokazi](#model-dokaza) · [Analiza pokretanja](#analiza-pokretanja-testova) · [CI](#integritet-ci-ja) · [Agenti](#ai-agenti) · [Sigurnost](#povjerenje-i-sigurnost) · [Ograničenja](#šta-vam-mjölnir-ne-može-reći) · [Dokumentacija](#dokumentacija)

<details>
<summary>Čitajte na drugom jeziku — 22 prijevoda</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | Bosanski

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-15.

<!-- Source hash: 3541b09e8d04 -->

</details>

</div>

<br />

## Zelena kvačica je tvrdnja, a ne dokaz

Zelena kvačica znači da pipeline nije pao. Ne znači da su se testovi izvršili, niti da su mogli pasti. Svaki od ovih slučajeva prolazi zeleno:

- commitovani `.only` koji je pokrenuo 3 testa umjesto 900
- `continue-on-error: true` na jobu koji je trebao blokirati
- `|| true` nakon naredbe za testove
- test koji ništa ne provjerava ili ima prazno tijelo
- retry omotač koji pravi pad pretvara u sretan prolaz
- izvještaj koji workflow otprema, a nikad ga nije generisao
- fiksni sleep koji drži na okupu race condition

Nijedan od njih ne boji pipeline u crveno, a svaki na reviewu izgleda namjerno. Zato i opstaju. Evo kako QA Doctor čita stvaran primjer:

<p align="center">
  <img src="assets/readme/scan.svg" alt="CI workflow demo repozitorija, pročitan red po red. QA Doctor označava svaki nalaz u redu u kojem ga je prijavio, s pravilom, onim što nije u redu, nivoom dokaza i izmjerenom stopom lažno pozitivnih rezultata." width="800" />
</p>

<sub>Svaki nalaz koji je demo skeniranje prijavilo za ovaj workflow, u redu u kojem je prijavljen. Generisano naredbom `npm run docs:readme-brand` iz [`demo-report.json`](assets/readme/demo-report.json) i zaključano protiv odstupanja u CI-ju.</sub>

**Strogi režim.** Najagresivnija otkrivanja — `.only`, `continue-on-error`, prazni testovi, zloupotreba ponavljanja — žive u karantinskom nivou. Rade samo pod `--strict` i ograničena su na `info` ozbiljnost: označavaju, ali nikada ne blokiraju. Podrazumijevano skeniranje (`npx mjolnir-qa@latest` bez `--strict`) pokriva samo osnovna i proširena pravila. Dodajte `--strict` kada želite i savjetodavni sloj.

QA Doctor čita skup testova, CI workflowe i, ako ga imate, izvještaj stvarnog pokretanja. Ne pokreće vaše testove, ne instalira vaše zavisnosti i ne izvršava kod koji skenira. A kada nema dokaza, to i kaže umjesto da izmišlja pouzdanost:

| Situacija                                                    | Šta QA Doctor prijavljuje                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Nisu pronađene deklaracije testova                           | Ocjena `null`, prikazana kao **UNKNOWN**. Nikad izmišljenih 100. |
| Nema baselinea ni uporedive revizije                         | **UNKNOWN**, uz naveden razlog. Nikad pretpostavljena 0.         |
| Skeniranje prekinuto (vremenski budžet, nečitljive datoteke) | **PARTIAL**, izlaz `2`. Nikad se ne prikazuje kao čisto.         |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Kako QA Doctor radi. Statički čita skup testova i CI pipeline, kao i izvještaj stvarnog pokretanja kada postoji. Svaki nalaz vaga prema nivou dokaza i nivou povjerenja, pri čemu samo stvarno pokretanje može dosegnuti L3 do L5, i daje nalaze, ocjenu vrijednosti i CI kapiju sa zamrznutim izlaznim kodovima. U petlji agenta, AI piše ispravku, a QA Doctor ponovo skenira da je dokaže." width="880" />
</p>

<sub>Napravljeno za ovu stranicu i prikazano u omjeru 1:1. Generisano naredbom `npm run docs:readme-brand` i zaključano protiv odstupanja u CI-ju; ocjena, brojevi i ID pravila dolaze iz [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) i registra pravila, nikad se ne kucaju ručno. Ista slika kao poster: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Pogledajte kako radi

Stvarno skeniranje [`examples/demo-repo`](examples/demo-repo), malog Playwright skupa testova s CI workflowom. Evo gdje su otišli njegovi bodovi:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnirov pregled odbitaka: WORTHINESS 80/100 WORTHY, ocjena po kategoriji, okvir odbitaka po ozbiljnosti i lista FIX THIS FIRST" width="520" />
</p>

<sub>Generisano naredbom `npm run docs:hero` iz stvarnog skeniranja i zaključano protiv odstupanja u CI-ju. Puni `--verbose` izvještaj istog skeniranja je [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Pogledajte</strong> — skeniranje, ispravka koju ispisuje i ponovno skeniranje koje je dokazuje</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Kadar demo snimka: npx mjolnir-qa@latest skenira demo repozitorij u prozoru terminala" width="900" />
  </a>
</p>

<sub>Renderovano kadar po kadar iz stvarnog skeniranja naredbom `npm run docs:video`; nikad snimljeno sa ekrana. Odaberite kadar da otvorite [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Jedan nalaz izbliza

Svaki nalaz odgovara na četiri pitanja: gdje je, koliko je QA Doctor siguran, koliko često pravilo griješi i kako ga ispraviti.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Prvi nalaz demo skeniranja, tačno onako kako ga terminal ispisuje, s označena četiri dijela: gdje, koliko sigurno, koliko često pravilo griješi, i ispravka." width="100%" />
</p>

`mjolnir explain QA-CI-001` ispisuje cijeli zapis povjerenja pravila, uključujući izmjerenu stopu lažno pozitivnih rezultata i nivo koji mu je ta stopa donijela:

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

To je jedinica vrijednosti: jedno mjesto na kojem CI prijavljuje prolaz koji nije zaslužio.

<br />

## Brzi početak

```bash
npx mjolnir-qa@latest
```

Skenira trenutni direktorij i ispisuje Trust Report: šta je pronašao, koliko mu možete vjerovati, zašto i šta dalje uraditi. Završava s `0` kada ništa na nivou kapije ili iznad nije pronađeno.

U CI-ju skenirajte samo ono što je grana uvela, kako stari skup testova ne bi potopio vaš prvi pull request:

```bash
npx mjolnir-qa@latest --scope changed
```

`mjolnir ci install` to zapisuje kao GitHub Actions workflow, koristeći [action](https://github.com/Sergey-Bar/Mjolnir#readme) prikovan za glavni tag `v1` (ili obični `npx` s `--no-action`). Ostaje savjetodavan dok ne odlučite da treba blokirati.

| Naredba                             | Šta radi                                                |
| ----------------------------------- | ------------------------------------------------------- |
| `mjolnir`                           | Trust Report: presuda, pouzdanost, sljedeći korak       |
| `mjolnir --scope changed`           | Samo ono što je vaša grana uvela (CI oblik)             |
| `mjolnir ci install`                | Generiše savjetodavni PR workflow (zasnovan na actionu) |
| `mjolnir explain QA-CI-001`         | Šta, zašto i ispravka, plus izmjerena FP stopa          |
| `mjolnir why src/a.spec.ts:42`      | Zašto je baš ovaj red označen. Nikad ne blokira.        |
| `mjolnir forensics ./test-results/` | Dokazi iz stvarnog pokretanja                           |
| `mjolnir trust-report`              | Samostalni Trust Artifact (md + json)                   |
| `mjolnir handoff`                   | Plan sanacije za agenta za kodiranje                    |
| `mjolnir --json` / `--format sarif` | Mašinski čitljiv izlaz, GitHub Code Scanning            |
| `mjolnir --format codequality`      | GitLab Code Quality izvještaj (artefakt MR widgeta)     |
| `mjolnir --strict`                  | Pokreće i pravila nivoa quarantine (veći FP rizik)      |

<details>
<summary><strong>Sve ostale naredbe</strong> — trijaža nestabilnih testova, izvještavanje, upravljanje</summary>

<br />

| Naredba                             | Šta radi                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `mjolnir --classic`                 | Baner ocjene iz vremena prije Trust Reporta                                    |
| `mjolnir explain verdict`           | Zašto je presuda sačuvanog skeniranja takva kakva jeste                        |
| `mjolnir triage ./test-results/`    | Vođena trijaža. Svaki red završava sljedećim korakom.                          |
| `mjolnir pw-report ./test-results/` | Sažetak Playwright pokretanja: ponavljanja, nestabilni testovi, najsporiji     |
| `mjolnir doctor:playwright`         | Dubinsko skeniranje samo za Playwright plus Selector Health Score              |
| `mjolnir fix --dry-run` / `fix`     | Sigurne automatske ispravke, svaka ponovo skenirana da se dokaže da je uspjela |
| `mjolnir baseline` / `diff`         | Snimak nalaza, a zatim prijava samo novih ili gorih                            |
| `mjolnir impact --since <ref>`      | Šta je commit uveo i riješio                                                   |
| `mjolnir summary`                   | CI anotacije i sažetak koraka iz izvještaja                                    |
| `mjolnir pr-comment`                | Ciljani PR komentar, u Markdownu                                               |
| `mjolnir debt`                      | Registar testnog duga s modelom troškova                                       |
| `mjolnir handover`                  | Mapa skupa testova za novog QA inženjera                                       |
| `mjolnir init`                      | Otkriva frameworke, ispisuje listu za podešavanje                              |
| `mjolnir suppressions`              | Prikazuje utišane nalaze, radi upravljanja                                     |
| `mjolnir rules --unmeasured`        | Pravila koja rade na pretpostavci, a ne na mjerenju                            |
| `mjolnir rules --md`                | Kompletan katalog pravila (JSON ili Markdown)                                  |
| `mjolnir doctor`                    | Samorevizija Mjölnirove vlastite baze pravila                                  |
| `mjolnir create-rule <ID>`          | Pravi kostur novog pravila i njegovih fixturea                                 |
| `mjolnir stats`                     | Lokalni brojači svih viđenih ispravki                                          |
| `mjolnir badge`                     | JSON za shields.io endpoint i isječak koda                                     |
| `mjolnir --cache`                   | Inkrementalna ponovna skeniranja preko lokalnog keša presuda                   |
| `mjolnir --format mermaid`          | Dijagram arhitekture testova za PR komentar                                    |

`mjolnir help <command>` ispisuje upotrebu, primjere i sljedeći korak za svaku od njih.

</details>

Zahtijeva **Node.js ≥ 22.18** na Windowsu, macOS-u ili Linuxu. Više volite globalnu instalaciju? `npm i -g mjolnir-qa`. Minimum dolazi iz lanca alata za build (tsdown cilja na njega, a pipeline izdanja radi smoke testove na njemu); zavisnostima za izvršavanje ne treba više od toga.

<br />

## Šta QA Doctor pronalazi

<p align="center">
  <img src="assets/readme/stack.svg" alt="Radi s vašim stackom: jezici, test frameworci i CI sistemi koje pokrivaju njegova pravila, prema registru pravila." width="100%" />
</p>

**79 pravila** u četiri porodice — higijena testova, kvalitet testova, Playwright i integritet CI-ja — za TypeScript i JavaScript, Python, Javu, C# i GitHub Actions YAML. Pokrivaju Playwright u sva četiri bindinga, plus pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest i Mochu, s početnom pokrivenošću za Cypress i Selenium. Devet od njih, da se vidi oblik:

| ID           | Pravilo                                                              | Ozbiljnost | Nivo       |
| ------------ | -------------------------------------------------------------------- | ---------- | ---------- |
| QA-CI-001    | `continue-on-error` maskira kapiju verifikacije koja pada            | error      | quarantine |
| QA-CI-009    | Izlazni kod testova se ne prosljeđuje (`\|` bez pipefail, `;` lanci) | error      | extended   |
| QA-TEST-001  | Commitovan fokusirani test (`.only`, `fit`)                          | error      | quarantine |
| QA-TEST-003  | Test bez asercija                                                    | error      | quarantine |
| QA-TQUAL-009 | Asercija na promise bez await                                        | error      | quarantine |
| QA-PW-002    | Asercija na lokatoru bez await                                       | error      | core       |
| QA-PW-004    | Krhki CSS/XPath selektori                                            | warning    | quarantine |
| QA-PY-002    | Preskočen test (`skip`, nestriktni `xfail`)                          | warning    | core       |
| QA-CS-103    | Testna metoda bez asercija                                           | error      | core       |

Kompletan katalog se generiše iz registra, nikad se ne održava ručno: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) ili [vodič o tome šta provjerava](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Svako pravilo navedeno u ovom README-u</strong>, u jednoj tabeli</summary>

<br />

> Pravila `quarantine` se pokreću samo uz `--strict` i nikad ne blokiraju (ograničena su na info). Prikazana ozbiljnost je ona koju je odredio autor.

| ID           | Porodica   | Pravilo                                                      | Ozbiljnost | Nivo       |
| ------------ | ---------- | ------------------------------------------------------------ | ---------- | ---------- |
| QA-TEST-001  | Higijena   | Commitovan fokusirani test (`.only`, `fit`)                  | error      | quarantine |
| QA-TEST-002  | Higijena   | Preskočen test. Bez praćenog razloga eskalira na `error`.    | warning    | quarantine |
| QA-TEST-003  | Higijena   | Test bez asercija                                            | error      | quarantine |
| QA-TEST-004  | Higijena   | Fiksni sleep (`waitForTimeout`, `sleep()`, `delay()`)        | warning    | extended   |
| QA-TEST-006  | Higijena   | Zloupotreba ponavljanja koja skriva nestabilnost             | warning    | quarantine |
| QA-TEST-010  | Higijena   | Prazno tijelo testa                                          | error      | quarantine |
| QA-TQUAL-002 | Kvalitet   | Tautološka asercija                                          | error      | quarantine |
| QA-TQUAL-009 | Kvalitet   | Asercija na promise bez await                                | error      | quarantine |
| QA-TQUAL-011 | Kvalitet   | Zakomentarisani testovi                                      | warning    | extended   |
| QA-PW-002    | Playwright | Asercija na lokatoru bez await                               | error      | core       |
| QA-PW-003    | Playwright | Commitovani `page.pause()` / `test.only()`                   | error      | core       |
| QA-PW-004    | Playwright | Krhki CSS/XPath selektori                                    | warning    | quarantine |
| QA-PW-123    | Playwright | Hardkodirani URL-ovi okruženja                               | warning    | quarantine |
| QA-PW-140    | Playwright | Snimak ekrana bez `maxDiffPixelRatio`                        | warning    | core       |
| QA-CI-001    | CI         | `continue-on-error` maskira kapiju koja pada                 | error      | quarantine |
| QA-CI-002    | CI         | `\|\| true` guta izlazne kodove                              | error      | extended   |
| QA-CI-005    | CI         | Izvještaj se koristi, ali se nikad ne generiše               | error      | quarantine |
| QA-CI-007    | CI         | Retry omotači oko testova                                    | warning    | extended   |
| QA-CI-008    | CI         | Korak koji uvijek uspijeva maskira padove                    | error      | quarantine |
| QA-CI-009    | CI         | Izlazni kod se ne prosljeđuje (`\|` bez pipefail, `;` lanci) | error      | extended   |
| QA-CI-010    | CI         | Testovi preskočeni tamo gdje moraju blokirati                | error      | quarantine |
| QA-PY-002    | Python     | Preskočen test (`skip`, nestriktni `xfail`)                  | warning    | core       |
| QA-PY-003    | Python     | Testna funkcija bez asercija                                 | error      | quarantine |
| QA-PY-005    | Python     | `time.sleep()` u testovima                                   | warning    | extended   |
| QA-PY-012    | Python     | Tautološka asercija                                          | error      | quarantine |
| QA-JV-101    | Java       | Onemogućen test (`@Disabled`)                                | warning    | core       |
| QA-JV-102    | Java       | Fiksni sleep (`Thread.sleep()`)                              | warning    | extended   |
| QA-JV-103    | Java       | Testna metoda bez asercija                                   | error      | extended   |
| QA-JV-105    | Java       | Fiksni sleep preko Playwright `waitForTimeout()`             | warning    | core       |
| QA-JV-106    | Java       | Krhki selektor umjesto lokatora zasnovanog na ulozi          | warning    | quarantine |
| QA-CS-101    | C#         | Preskočen test (`[Ignore]`, `[Fact(Skip=)]`)                 | warning    | core       |
| QA-CS-102    | C#         | Fiksni sleep (`Thread.Sleep` / `Task.Delay`)                 | warning    | core       |
| QA-CS-103    | C#         | Testna metoda bez asercija                                   | error      | core       |
| QA-CS-105    | C#         | Fiksni sleep preko `WaitForTimeoutAsync()`                   | warning    | extended   |
| QA-CS-106    | C#         | Krhki selektor umjesto lokatora zasnovanog na ulozi          | warning    | quarantine |

Python dolazi i s pravilima QA-PY-001…012 (higijena pytesta) i QA-PY-101…108 (Playwright za Python). Cypress i Selenium imaju početne skupove od po tri pravila.

</details>

Svako pravilo se isporučuje s must-fire **i** must-not-fire fixtureom, a pravilo koje se okine na vlastitom negativnom fixtureu ne može biti isporučeno. To je zaštitni zid od lažno pozitivnih rezultata; `mjolnir doctor` ga provodi u vlastitom CI-ju ovog repozitorija.

### Selector Health Score

`mjolnir doctor:playwright` ocjenjuje svaki lokator prema tome kako pronalazi element: onako kako bi to uradio korisnik (uloga, oznaka, tekst), preko eksplicitnog ugovora (`data-testid`) ili strukturnom slučajnošću (CSS lanci, XPath). Svaka datoteka dobija ocjenu od 0 do 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Ovo mjeri **otpornost, a ne ispravnost**. `.btn.btn-primary > div:nth-child(2)` prolazi danas i nastavlja prolaziti dok neko ne dirne markup. Niska ocjena nikad ne tvrdi da je test pokvaren, samo da zavisi od markupa koji niko nije obećao sačuvati.

<br />

## Ocjena vrijednosti

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="Skala vrijednosti od 0 do 100, s markerom koji prelazi svaku ocjenu: UNWORTHY ispod 50, NEEDS WORK od 50 do 79, WORTHY od 80 do 99, FORGED na 100" width="720" />
</p>

<sub>Svaka ocjena od 0 do 100, postavljena stvarnim `deriveScoreState`. Generisano naredbom `npm run docs:gauge` i zaključano protiv odstupanja u CI-ju.</sub>

| Ocjena    | Presuda                                         |
| --------- | ----------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                    |
| `50 – 79` | **NEEDS WORK**                                  |
| `80 – 99` | **WORTHY**                                      |
| `100`     | **FORGED**                                      |
| `null`    | **UNKNOWN**: nisu pronađene deklaracije testova |

**Kako se računa.** Ozbiljnost određuje osnovni odbitak (`error −8`, `warning −3`, `info −1`), a nivo dokaza ga umanjuje: E2 se računa u potpunosti, E1 upola (zaokruženo nadolje), E0 nikako. Zbir se normalizuje prema izloženosti skupa testova, odnosno odbici po deklaraciji testa umjesto po datoteci. Terminal ispisuje iste umanjene brojeve koje je ocjena koristila; nema skrivenog drugog modela. Detalji: [docs/SCORING.md](docs/SCORING.md) i [vodič za ocjenjivanje](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Šta 100 ne znači.** Ne znači da je softver ispravan, da je skup testova dovoljan ili da je proizvod bez grešaka. Znači jednu stvar: **nijedno od pravila koja je QA Doctor procijenio nije proizvelo odbitak u ovom skeniranju i ovom modelu dokaza.**

<br />

## Model dokaza

Svaki nalaz nosi dvije oznake: koliko je QA Doctor siguran i koliko je daleko nalaz provjeren. To je razlika između alata koji prijavljuje obrasce i alata od kojeg možete uslovljavati izdanje.

**Koliko sigurno — nivo dokaza.**

| Nivo   | Naziv                 | Znači                                              | Odbitak |
| ------ | --------------------- | -------------------------------------------------- | ------- |
| **E2** | Deterministički dokaz | Defekt je prisutan u kodu onakvom kakav je napisan | Pun     |
| **E1** | Dokaz iz obrasca      | Poklopio se obrazac usko povezan s defektom        | Pola    |
| **E0** | Zapažanje             | Vrijedi znati. Nije tvrdnja da nešto nije u redu.  | Nula    |

Pouzdanost detekcije nije snaga dokaza. Pravilo može biti sigurno da je pronašlo ono što je tražilo, a ipak gledati heuristiku. E1 nalazi su tu da se čitaju i procjenjuju, nikad da se primjenjuju naslijepo, i ta granica je utisnuta na nalaz u terminalu, u JSON-u i u predaji agentu.

**Koliko daleko je provjereno — nivo povjerenja.** Većina nalaza dolazi iz čitanja vašeg koda. Dajte Mjölniru izvještaj stvarnog pokretanja testova i on može potvrditi da se kod zaista izvršio.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="Ljestvica povjerenja od L0 do L5. L0 do L2 dolaze iz čitanja koda; L3 do L5 zahtijevaju izvještaj stvarnog pokretanja, što je označeno prekidom na ljestvici." width="100%" />
</p>

| Nivo   | Jednostavnim riječima | Šta je potrebno                                              |
| ------ | --------------------- | ------------------------------------------------------------ |
| **L0** | Zabilježeno           | Čitanje koda                                                 |
| **L1** | Liči na problem       | Čitanje koda: poklopio se obrazac                            |
| **L2** | Dokazano u kodu       | Čitanje koda: defekt je strukturni                           |
| **L3** | Datoteka se izvršila  | Izvještaj pokretanja pokazuje da je datoteka nalaza izvršena |
| **L4** | Test se izvršio       | Izvještaj pokretanja pokazuje da je test nalaza izvršen      |
| **L5** | Pokretanje se slaže   | Vlastiti rezultat pokretanja potvrđuje klasu defekta         |

Statičko skeniranje staje na L2. Samo izvještaj stvarnog pokretanja (Playwright JSON, Jest ili Vitest JSON, JUnit XML) može podići nalaz na L3 ili više, pa nalaz koji nikad nije viđen u izvršavanju nikad ne može tvrditi da jeste. Definicije: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Koliko je od ovoga izmjereno

**74 od 79 pravila imaju stopu lažno pozitivnih rezultata izmjerenu na stvarnom OSS kodu** (najmanje 10 ručno klasifikovanih nalaza za svako; pogledajte [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Ostalih 5 se isporučuje na autorovoj procjeni i to kaže, pravilo po pravilo, u `mjolnir explain`. `mjolnir rules --unmeasured` ih navodi, a podnožje svakog skeniranja prijavljuje koliko je izmjereno od pravila koja su se zaista _okinula_.

Stope ostaju javne i kada su loše. QA-TEST-001 (commitovani `.only`) loše prolazi reviziju na stvarnim repozitorijima i zato je u quarantine. Aktuelni broj za svako pravilo, uključujući QA-PW-141, nalazi se u reviziji.

### Nivoi povjerenja pravila

Nivoi prate izmjerenu stopu lažno pozitivnih rezultata, a ne mišljenje:

| Nivo           | Izmjereni FP                      | Ponašanje                                             |
| -------------- | --------------------------------- | ----------------------------------------------------- |
| **core**       | ≤ 10%                             | Zadani izvještaj, blokira                             |
| **extended**   | ≤ 30%                             | Zadani izvještaj, niža pouzdanost                     |
| **quarantine** | > 30% ili eksplicitno deklarisano | Samo `--strict`, ograničeno na info, nikad ne blokira |
| _neizmjereno_  | n < 10                            | Ne može se unaprijediti u core dok se ne izmjeri      |

FP opsezi mogu samo degradirati nivo — nikad ne unapređuju pravilo iz `quarantine` ako je tamo eksplicitno deklarisano. Eksplicitno karantinirano pravilo ostaje u quarantine bez obzira na izmjerenu FP stopu.

Unapređenje, degradacija i zrelost po jeziku: [životni ciklus pravila](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Zašto ovo nije linter

Linteri vam govore da li kod poštuje pravila. QA Doctor vam govori može li se vjerovati vašoj verifikaciji.

|                                                                  | Linteri (ESLint, SonarQube) | Alati za pokrivenost | AI pregled koda |   **QA Doctor**    |
| ---------------------------------------------------------------- | :-------------------------: | :------------------: | :-------------: | :----------------: |
| Ocjenjuje **sistem verifikacije**, a ne kod proizvoda            |             Ne              |          Ne          |       Ne        |         Da         |
| Integritet CI workflowa (`continue-on-error`, `\|\| true`)       |             Ne              |          Ne          |    samo diff    |         Da         |
| Ocjenjuje otpornost Playwright lokatora (Selector Health)        |             Ne              |          Ne          |       Ne        |         Da         |
| Čita stvarne podatke pokretanja za `TRUE-FLAKE` presude          |             Ne              |          Ne          |       Ne        |         Da         |
| Objavljuje izmjerenu stopu lažno pozitivnih rezultata po pravilu |             Ne              |          Ne          |       Ne        |         Da         |
| Označava testove bez asercija                                    |            Da\*             |          Ne          |     ponekad     |         Da         |
| Hvata fiksne sleepove (`waitForTimeout`, `time.sleep`)           |            Da\*             |          Ne          |     ponekad     |         Da         |
| Deterministički (isti ulaz, isti izlaz)                          |             Da              |          Da          |       Ne        |         Da         |
| Trošak po skeniranju                                             |          besplatno          |      besplatno       |     tokeni      | **nula** (lokalno) |

<sub>\*Pokriveno s `eslint-plugin-jest` i `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) te vlastitim pravilima za asercije u SonarQubeu. Kolone opisuju zadano ponašanje za verifikaciju skupova testova; dodaci, plaćeni paketi i prilagođena pravila mijenjaju neke odgovore. Ovo je sažetak pozicioniranja, a ne benchmark.</sub>

Koristite i AI pregled. Hvata nijanse, namjeru i greške u dizajnu koje nijedan obrazac ne može pronaći. QA Doctor hvata ono što AI pregled previdi jer izgleda namjerno: commitovani `.only`, progutan izlazni kod, `continue-on-error` na test jobu. Za to treba skeniranje, a ne rasuđivanje.

<br />

## Analiza pokretanja testova

Statička analiza rasuđuje o kodu koji se nikad nije izvršio. Analiza pokretanja čita šta se zaista dogodilo: Playwright JSON, Jest JSON, Vitest JSON i JUnit XML iz bilo kojeg runnera.

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

`TRUE-FLAKE` ne znači da je test ponovljen. Znači da je test **pao barem u jednom pokušaju, a zatim završio zeleno**: sretan prolaz, označen bez obzira na to šta kaže konačna kvačica. `mjolnir triage` tu historiju pretvara u prijedlog karantina, a `mjolnir pw-report` sažima pokretanje. Upravo ti izvještaji pokretanja podižu nalaze na nivoe povjerenja L3 i više.

<br />

## Integritet CI-ja

Test može prolaziti dok pipeline oko njega ne može pasti. QA Doctor čita i workflowe: `continue-on-error`, `|| true`, izlazne kodove koji se nikad ne prosljeđuju, korake koji uvijek uspijevaju, izvještaje koji se koriste, a nikad ne generišu, i kapije preskočene baš na događajima koji bi trebali blokirati. Svaki nalaz navodi job, korak i red, i nosi vlastiti nivo dokaza.

Generišite PR workflow, zadano savjetodavan:

```bash
mjolnir ci install
```

Ili dodajte Marketplace action u workflow koji već imate:

```yaml
- uses: Sergey-Bar/Mjolnir@v1
  with:
    scope: changed
    fail-on: error
```

Prikujte `@v1` da pratite glavnu liniju, ili tačan tag (`@v0.5.32`) za ponovljivu kapiju. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) pokriva Marketplace, Smithery i MCP registre.

Da nalaze stavite u GitHub Code Scanning, otpremite SARIF (potrebno `security-events: write` na nivou workflowa ili joba):

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

Na GitLabu, `--format codequality` zapisuje Code Quality izvještaj koji čitaju MR widget i diff anotacije ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Podešavanje editora i pipelinea: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Pripisivanje u opsegu promjena

```bash
npx mjolnir-qa@latest --scope changed
```

Nalazi se pripisuju redovima koje je vaša grana dodala, mjereno u odnosu na **merge-base**. Opseg je isti skup datoteka koji otkriva puno skeniranje (TS/JS specifikacije i konfiguracije adaptera, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), plus necommitovane i nepraćene promjene, pa radi i prije commita. Baza se razrješava redom `main → master → origin/main → origin/master → origin/HEAD`; zamijenite je s `--base <ref>`.

Kada se merge-base ne može razriješiti (plitki klon, odvojeni HEAD, cilj izvan gita), nalazi se vraćaju na pripisivanje cijeloj datoteci **i izvještaj to kaže.** Tihi prelazak na rezervnu opciju bio bi upravo ona vrsta defekta zbog koje ovaj alat postoji.

<br />

## AI agenti

Nalazi vrijede samo ako nešto na osnovu njih djeluje.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI piše ispravku. QA Doctor je verifikuje.** Dokaz dolazi iz ponovnog skeniranja, nikad iz agentovog vlastitog izvještaja o uspjehu.

| Naredba           | Šta agent dobija                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mjolnir mcp`     | [MCP](https://modelcontextprotocol.io) server preko stdio. `scan`, `explain` i `diff` postaju alati koji se mogu pozvati.                                                |
| `mjolnir handoff` | Sačuvani `--json` izvještaj postaje deterministički Markdown plan: šta je otkriveno, granica dokaza za svaki nalaz, šta se **ne** smije promijeniti i kako verifikovati. |
| `mjolnir install` | Upisuje u agentske površine koje vaš repozitorij već ima (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) kako bi agent ponovo skenirao prije nego što tvrdi da je gotov. |

Dodajte ga klijentu koji ima vlastiti CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@latest mcp
```

Ili bilo kojem klijentu koji prima `mcpServers` blok:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@latest", "mcp"] }
  }
}
```

**Zaštitna ograda je važnija od udobnosti.** Svaki nalaz u predaji nosi svoju granicu. **E2** kaže _deterministički: provjerite lokaciju i primijenite ispravku_. **E1** kaže _POTREBNA POTVRDA: samo zapažanje ne dokazuje defekt_. Agent koji naslijepo ispravlja E1, utišava pravilo ili mijenja pravilo da podigne ocjenu radi upravo ono zbog čega ovaj alat postoji, pa predaja to kaže u promptu, odmah pored nalaza.

<br />

## Povjerenje i sigurnost

**Prvo lokalno, nula telemetrije.** Nijedan API sposoban za mrežu (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) ne postoji nigdje u `src/`, a [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) obara build ako se neki pojavi. Zabranjuje i `eval` i `new Function`. Skeniranje nepouzdanog koda ga nikad ne izvršava: statička analiza čita izvorni tekst, a analiza pokretanja parsira datoteke izvještaja koje već postoje na disku.

Dvije napomene: sam `npx` preuzima paket prije nego što se išta pokrene, a garancija pokriva `src/`, ne dodatke trećih strana.

**Dodaci nisu u sandboxu.** JS dodaci (`mjolnir-rules/*.mjs` ili npm paketi navedeni pod `"plugins"`) rade s punim Node privilegijama, istim modelom povjerenja kao ESLint ili Vitest dodaci. Njihovo učitavanje je izričit izbor **po skeniranju**: bez `--enable-plugins` (ili `MJOLNIR_ENABLE_PLUGINS=1`) njihovi izvori se nikad ne učitavaju, a obavještenje na stderr navodi šta je preskočeno. JSON manifesti pravila ne izvršavaju kod, a prefiksi ID-jeva core pravila su rezervisani kako se nijedan dodatak ne bi mogao lažno predstaviti kao neko od njih. Ranjivosti prijavite preko [SECURITY.md](SECURITY.md).

**Radi na samom sebi.** Motor povjerenja u verifikaciju nema kredibilitet ako sam nije provjerljiv. Svako CI pokretanje skenira ovaj repozitorij buildom koji je proizvelo to isto pokretanje. Kapija pada na svakom nalazu ozbiljnosti error, kao i na **djelimičnom** skeniranju ili **pravilu koje se srušilo**, jer skraćeno samoskeniranje koje ništa ne prijavljuje jeste upravo lažna zelena boja zbog koje ovaj projekat postoji. `mjolnir doctor` u istom pokretanju ponovo revidira bazu pravila (zaštitni zid fixturea, poštenje nivoa, gornja granica nivoa core), a provjera s rezultatom INCONCLUSIVE pada potpuno isto kao neuspjela. Oba izvještaja se otpremaju kao artefakti builda.

### Izlazni kodovi i mašinski ugovor

Zamrznuti, kako biste na njima mogli graditi CI logiku:

| Izlazni kod | Značenje                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------- |
| `0`         | Čisto: nema nalaza na nivou kapije ili iznad                                             |
| `1`         | Nalazi na nivou kapije ili iznad                                                         |
| `2`         | Djelimično skeniranje (istekao vremenski budžet, nečitljive datoteke). Nikad ne blokira. |
| `10`        | Greška u upotrebi (pogrešna zastavica, nedostaje cilj)                                   |
| `20`        | Interna greška                                                                           |

`2` se namjerno razlikuje od `0`: skeniranje koje nije završilo nije "ništa pronašlo". Samo nije završilo s traženjem.

Sve što mašina troši (rezultati MCP alata, `--json`, SARIF 2.1) dolazi iz jednog kanonskog rezultata pod verzionisanom shemom koja se **samo proširuje** (`schemaVersion: 1`, `contractVersion: 1`), tako da nijedan potrošač ne mora rekonstruisati značenje iz renderovanog teksta. Pogledajte [mašinski ugovor](docs/machine-contract.md). ID-jevi pravila (`QA-<FAMILY>-NNN`) su nepromjenjivi nakon isporuke i nikad se ne koriste ponovo.

<br />

## Šta vam QA Doctor ne može reći

- **Ne pokreće vaše testove.** Čisto skeniranje nije skup testova koji prolazi.
- **Ne može vam reći da je asercija _pogrešna_.** `expect(total).toBe(41)` izgleda zdravo. QA Doctor pronalazi testove koji _ne mogu pasti_ i pipelineove koji _ne mogu postati crveni_, a ne testove koji provjeravaju pogrešnu stvar.
- **Ne dokazuje poslovnu ispravnost.** Ništa ovdje ne kaže da vaš proizvod radi ono što je zahtjev tražio.
- **100 nije dokaz dobrog skupa testova.** Da li vaš skup pokriva vaš stvarni rizik je drugo pitanje, a ovaj alat na njega ne odgovara.
- **5 od 79 pravila se isporučuje na procjeni**, a ne na izmjerenoj stopi. Svako od njih to kaže na vlastitom nalazu.
- **E1 nije E2.** Heuristički nalazi vrijede čitanja, ali ne i primjene naslijepo.
- **Prazan repozitorij dobija `null`, nikad 100.**
- **Datoteka nazvana `*.spec.ts` bez deklaracija testova ne računa se kao pokrivenost.** Repozitorij čije jedine spec datoteke sadrže importe ili tipove (nula poziva `it`/`test`) dobija `null`, a ne 100.

<br />

## Dokumentacija

Kompletna stranica dokumentacije nalazi se na <https://sergey-bar.github.io/Mjolnir/>.

| Dokument                                               | Šta sadrži                                             |
| ------------------------------------------------------ | ------------------------------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalizacija ocjene i ponderisanje dokaza             |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Kanonski rječnik: jedna riječ po pojmu                 |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Izmjerene stope lažno pozitivnih rezultata i metoda    |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Stanja pravila, nivoi, utišavanje, povlačenje          |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Semver politika, zamrznute površine, ciklus povlačenja |
| [docs/machine-contract.md](docs/machine-contract.md)   | Kanonski mašinski čitljiv rezultat                     |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF izlaz i podešavanje editora ili CI-ja            |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: Code Quality izvještaj, MR recept, kapija      |
| [docs/rules/](docs/rules/)                             | Generisani katalog po pravilu                          |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Razvojno okruženje i tok doprinosa                     |
| [SUPPORT.md](SUPPORT.md)                               | Gdje pitati, prijaviti i dobiti pomoć                  |
| [SECURITY.md](SECURITY.md)                             | Prijava ranjivosti                                     |
| [CHANGELOG.md](CHANGELOG.md)                           | Historija izdanja                                      |

### Status

**Verzija 1.** JSON shema i izlazni kodovi su zamrznuti ugovori. TypeScript i Python imaju najširu izmjerenu pokrivenost. Java i C# su noviji; čitajte ih kroz [tabelu zrelosti](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Šta slijedi, bez izmišljenih datuma: [javna mapa puta](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Doprinos

Nova pravila su najlakši prvi doprinos. Jedna naredba pravi kostur pravila s njegovim must-fire **i** must-not-fire fixtureima. Generisano pravilo namjerno pada na vlastitim fixtureima dok se ne napiše stvarna detekcija, jer isporučeni kostur jeste pravilo koje niko nije izmjerio:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Razvojno okruženje, naredbe stalnih kapija te zakoni anti-creep i zaštitnog zida fixturea nalaze se u [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Pokrenite ga na svom repozitoriju." width="100%" />

```bash
npx mjolnir-qa@latest
```

[Pročitajte vodič](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Stranica dokumentacije](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Ne pitajte jesu li testovi prošli.<br />
Pitajte dokazuju li dokazi da zaslužuju povjerenje.

<sub>Napravio [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · MIT licenca</sub>

</div>
