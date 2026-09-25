<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Testy mówią ci, co przeszło. Mjölnir mówi ci, czemu możesz zaufać." width="100%" />

<br />

Mjölnir znajduje testy, które nie mogą zawieść, i pipeline'y, które nie mogą zrobić się czerwone,<br />
a potem ocenia, na ile można ufać wynikowi, podając dowód dla każdego punktu.

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

[Zobacz w działaniu](#zobacz-w-działaniu) · [Szybki start](#szybki-start) · [Co znajduje](#co-znajduje-mjölnir) · [Wynik](#wynik-wiarygodności) · [Dowody](#model-dowodów) · [Analiza przebiegów](#analiza-przebiegów-testów) · [CI](#integralność-ci) · [Agenci](#agenci-ai) · [Bezpieczeństwo](#zaufanie-i-bezpieczeństwo) · [Ograniczenia](#czego-mjölnir-nie-może-ci-powiedzieć) · [Dokumentacja](#dokumentacja)

<details>
<summary>Czytaj w innym języku — 22 tłumaczenia</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | Polski | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-25.

<!-- Source hash: `f3d2a07f2d68` -->

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

## Zielony znacznik to deklaracja, a nie dowód

Zielony znacznik oznacza, że pipeline nie zawiódł. Nie oznacza, że testy się wykonały ani że mogły zawieść. Każdy z tych przypadków przechodzi na zielono:

- zacommitowane `.only`, które uruchomiło 3 testy zamiast 900
- `continue-on-error: true` na jobie, który miał blokować
- `|| true` po poleceniu uruchamiającym testy
- test, który niczego nie sprawdza albo ma puste ciało
- wrapper ponawiający, który zamienia prawdziwą porażkę w szczęśliwe przejście
- raport, który workflow wysyła, choć nigdy go nie wygenerował
- sztywny sleep, który podtrzymuje wyścig

Żaden z nich nie zmienia koloru pipeline'u na czerwony, a każdy w review wygląda na zamierzony. Właśnie dlatego przetrwają. Oto Mjölnir czytający prawdziwy przypadek:

<p align="center">
  <img src="assets/readme/scan.svg" alt="Workflow CI repozytorium demonstracyjnego, czytany wiersz po wierszu. Mjölnir oznacza każde znalezisko w zgłoszonym wierszu, z jego regułą, opisem problemu, poziomem dowodu i zmierzonym odsetkiem fałszywych alarmów." width="800" />
</p>

<sub>Każde znalezisko, które skan demonstracyjny zgłosił dla tego workflow, w zgłoszonym wierszu. Wygenerowane przez `npm run docs:readme-brand` z [`demo-report.json`](assets/readme/demo-report.json) i zabezpieczone w CI przed rozjazdem.</sub>

**Tryb ścisły.** Najbardziej agresywne wykrycia — `.only`, `continue-on-error`, puste testy, nadużywanie ponownych prób — żyją w poziomie kwarantanny. Działają tylko z `--strict` i są ograniczone do ważności `info`: oznaczają, ale nigdy nie blokują. Domyślne skanowanie (`npx mjolnir-qa@3.0.0` bez `--strict`) obejmuje tylko reguły rdzeniowe i rozszerzone. Dodaj `--strict`, gdy chcesz też warstwę doradczą.

Mjölnir czyta zestaw testów, workflow CI oraz, jeśli go masz, raport z prawdziwego przebiegu. Nie uruchamia twoich testów, nie instaluje zależności ani nie wykonuje skanowanego kodu. A gdy nie ma dowodów, mówi to wprost, zamiast wymyślać pewność:

| Sytuacja                                        | Co zgłasza Mjölnir                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| Nie znaleziono deklaracji testów                | Wynik `null`, wyświetlany jako **UNKNOWN**. Nigdy zmyślone 100.    |
| Brak baseline'u lub porównywalnej rewizji       | **UNKNOWN**, z podanym powodem. Nigdy założone 0.                  |
| Skan przerwany (limit czasu, nieczytelne pliki) | **PARTIAL**, kod wyjścia `2`. Nigdy nie przedstawiany jako czysty. |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Jak działa Mjölnir. Czyta statycznie zestaw testów i pipeline CI, a także raport z prawdziwego przebiegu, jeśli istnieje. Waży każde znalezisko według poziomu dowodu i poziomu zaufania, przy czym tylko prawdziwy przebieg może osiągnąć L3–L5, i zwraca znaleziska, wynik wiarygodności oraz bramkę CI z zamrożonymi kodami wyjścia. W pętli agenta AI pisze poprawkę, a Mjölnir skanuje ponownie, aby ją udowodnić." width="880" />
</p>

<sub>Przygotowane dla tej strony i pokazane w skali 1:1. Wygenerowane przez `npm run docs:readme-brand` i zabezpieczone w CI przed rozjazdem; wynik, liczby i ID reguły pochodzą z [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) i rejestru reguł, nigdy nie są wpisywane ręcznie. Ten sam obraz jako plakat: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Zobacz w działaniu

Prawdziwy skan [`examples/demo-repo`](examples/demo-repo), małego zestawu Playwright z workflow CI. Oto, gdzie poszły jego punkty:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Rozbicie potrąceń Mjölnira: WORTHINESS 80/100 WORTHY, wynik według kategorii, ramka potrąceń według ważności i lista FIX THIS FIRST" width="520" />
</p>

<sub>Wygenerowane przez `npm run docs:hero` z prawdziwego skanu i zabezpieczone w CI przed rozjazdem. Pełny raport `--verbose` z tego samego skanu to [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Obejrzyj</strong> — skan, poprawka, którą wypisuje, i ponowny skan, który ją potwierdza</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Klatka nagrania demonstracyjnego: npx mjolnir-qa@3.0.0 skanuje repozytorium demonstracyjne w oknie terminala" width="900" />
  </a>
</p>

<sub>Wyrenderowane klatka po klatce z prawdziwego skanu przez `npm run docs:video`; nigdy nagrywane z ekranu. Wybierz klatkę, aby otworzyć [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Jedno znalezisko z bliska

Każde znalezisko odpowiada na cztery pytania: gdzie jest, jak pewny jest Mjölnir, jak często reguła się myli i jak to naprawić.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="Pierwsze znalezisko ze skanu demonstracyjnego, dokładnie tak, jak wypisuje je terminal, z oznaczonymi czterema częściami: gdzie, jak pewne, jak często reguła się myli, oraz poprawka." width="100%" />
</p>

`mjolnir explain QA-CI-001` wypisuje całą kartotekę zaufania reguły, w tym zmierzony odsetek fałszywych alarmów i poziom, który ten odsetek jej zapewnił:

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

To jest jednostka wartości: jedno miejsce, w którym CI zgłasza przejście, na które nie zasłużyło.

<br />

## Szybki start

```bash
npx mjolnir-qa@3.0.0
```

Skanuje bieżący katalog i wypisuje Trust Report: co znalazł, na ile możesz temu ufać, dlaczego i co zrobić dalej. Kończy się kodem `0`, gdy nie znaleziono niczego na poziomie bramki lub powyżej.

W CI skanuj tylko to, co wprowadziła gałąź, aby stary zestaw testów nie zatopił twojego pierwszego pull requesta:

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

`mjolnir ci install` zapisuje to jako workflow GitHub Actions, używając [akcji](https://github.com/Sergey-Bar/Mjolnir#readme) przypiętej do głównego tagu `v3` (albo zwykłego `npx` z `--no-action`). Pozostaje doradczy, dopóki nie zdecydujesz, że ma blokować.

| Polecenie                                     | Co robi                                                     |
| --------------------------------------------- | ----------------------------------------------------------- |
| `mjolnir`                                     | Trust Report: werdykt, pewność, następny krok               |
| `mjolnir --scope changed`                     | Tylko to, co wprowadziła twoja gałąź (forma dla CI)         |
| `mjolnir ci install`                          | Generuje doradczy workflow dla PR (oparty na akcji)         |
| `mjolnir business-case`                       | ROI estimate: projected savings per finding                 |
| `mjolnir release-report`                      | Release readiness: GO, CONDITIONAL GO, or NO-GO             |
| `mjolnir release-trust`                       | 12-dimension release assurance verdict                      |
| `mjolnir report`                              | Generate a Playwright-compatible report                     |
| `mjolnir trend`                               | Record, show, or diff local quality snapshots               |
| `mjolnir policy`                              | Initialize, validate, or check policy gates                 |
| `mjolnir quarantine`                          | Review deterministic proposals (prototype)                  |
| `mjolnir analyze --cross-file`                | Bounded cross-file analysis                                 |
| `mjolnir ci-adapter github .`                 | Generate CI templates for supported providers               |
| `mjolnir dashboard`                           | Generate a self-contained quality dashboard                 |
| `mjolnir exec-report`                         | Executive KPIs and recommendations (advisory)               |
| `mjolnir enterprise`                          | Self-hosted templates (prototype)                           |
| `mjolnir maturity`                            | Assess maturity or display maturity levels                  |
| `mjolnir mutation tests/mutation-report.json` | Analyze mutation reports; never promotes trust              |
| `mjolnir mcp`                                 | Read-only MCP tools over stdio                              |
| `mjolnir explain QA-CI-001`                   | Co, dlaczego i jak naprawić, plus zmierzony odsetek FP      |
| `mjolnir why src/a.spec.ts:42`                | Dlaczego oznaczono dokładnie ten wiersz. Nigdy nie blokuje. |
| `mjolnir forensics ./test-results/`           | Dowody z prawdziwego przebiegu                              |
| `mjolnir trust-report`                        | Samodzielny Trust Artifact (md + json)                      |
| `mjolnir handoff`                             | Plan naprawy dla agenta kodującego                          |
| `mjolnir --json` / `--format sarif`           | Wyjście czytelne maszynowo, GitHub Code Scanning            |
| `mjolnir --format codequality`                | Raport GitLab Code Quality (artefakt widżetu MR)            |
| `mjolnir --strict`                            | Uruchamia też reguły poziomu quarantine (wyższe ryzyko FP)  |

<details>
<summary><strong>Wszystkie pozostałe polecenia</strong> — triaż niestabilnych testów, raportowanie, nadzór</summary>

<br />

| Polecenie                           | Co robi                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `mjolnir --classic`                 | Baner wyniku sprzed Trust Reportu                                                       |
| `mjolnir explain verdict`           | Dlaczego werdykt zapisanego skanu jest taki, a nie inny                                 |
| `mjolnir triage ./test-results/`    | Prowadzony triaż. Każdy wiersz kończy się następnym krokiem.                            |
| `mjolnir pw-report ./test-results/` | Podsumowanie przebiegu Playwright: ponowienia, niestabilne testy, najwolniejsze         |
| `mjolnir doctor:playwright`         | Głęboki skan tylko dla Playwright plus Selector Health Score                            |
| `mjolnir fix --dry-run` / `fix`     | Bezpieczne automatyczne poprawki, każda ponownie skanowana, by udowodnić, że zadziałała |
| `mjolnir baseline` / `diff`         | Zapisuje stan znalezisk, a potem zgłasza tylko nowe lub gorsze                          |
| `mjolnir impact --since <ref>`      | Co commit wprowadził i rozwiązał                                                        |
| `mjolnir summary`                   | Adnotacje CI i podsumowanie kroku na podstawie raportu                                  |
| `mjolnir pr-comment`                | Komentarz do PR o ograniczonym zakresie, w Markdown                                     |
| `mjolnir debt`                      | Rejestr długu testowego z modelem kosztów                                               |
| `mjolnir handover`                  | Mapa wdrożeniowa zestawu dla nowego inżyniera QA                                        |
| `mjolnir init`                      | Wykrywa frameworki, wypisuje listę kontrolną konfiguracji                               |
| `mjolnir suppressions`              | Wyświetla wyciszone znaleziska, na potrzeby nadzoru                                     |
| `mjolnir rules --unmeasured`        | Reguły działające na założeniu, a nie na pomiarze                                       |
| `mjolnir rules --md`                | Pełny katalog reguł (JSON lub Markdown)                                                 |
| `mjolnir doctor`                    | Autoaudyt własnej bazy reguł Mjölnira                                                   |
| `mjolnir create-rule <ID>`          | Tworzy szkielet nowej reguły i jej fixture'ów                                           |
| `mjolnir stats`                     | Lokalne liczniki wszystkich widzianych poprawek                                         |
| `mjolnir badge`                     | JSON endpointu shields.io i fragment kodu                                               |
| `mjolnir --cache`                   | Przyrostowe ponowne skany dzięki lokalnej pamięci podręcznej werdyktów                  |
| `mjolnir --format mermaid`          | Diagram architektury testów do komentarza w PR                                          |

`mjolnir help <command>` wypisuje sposób użycia, przykłady i następny krok dla każdego z nich.

</details>

Wymaga **Node.js ≥ 22.18** w systemie Windows, macOS lub Linux. Wolisz instalację globalną? `npm i -g mjolnir-qa`. Minimalna wersja wynika z łańcucha budowania (tsdown ją obsługuje, a pipeline wydań wykonuje na niej testy dymne); zależności uruchomieniowe nie potrzebują nic więcej.

<br />

## Co znajduje Mjölnir

<p align="center">
  <img src="assets/readme/stack.svg" alt="Działa z twoim stosem: języki, frameworki testowe i systemy CI objęte jego regułami, według rejestru reguł." width="100%" />
</p>

**79 reguł** w czterech rodzinach — higiena testów, jakość testów, Playwright i integralność CI — dla TypeScript i JavaScript, Pythona, Javy, C# oraz YAML GitHub Actions. Obejmują Playwright we wszystkich czterech bindingach, a także pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest i Mocha, z początkowym wsparciem dla Cypress i Selenium. Dziewięć z nich, aby pokazać, jak to wygląda:

| ID           | Reguła                                                             | Ważność | Poziom     |
| ------------ | ------------------------------------------------------------------ | ------- | ---------- |
| QA-CI-001    | `continue-on-error` maskuje zawodzącą bramkę weryfikacji           | error   | quarantine |
| QA-CI-009    | Kod wyjścia testów nieprzekazany (`\|` bez pipefail, łańcuchy `;`) | error   | extended   |
| QA-TEST-001  | Zacommitowany test z fokusem (`.only`, `fit`)                      | error   | quarantine |
| QA-TEST-003  | Test bez asercji                                                   | error   | quarantine |
| QA-TQUAL-009 | Asercja na promise bez await                                       | error   | quarantine |
| QA-PW-002    | Asercja na lokatorze bez await                                     | error   | core       |
| QA-PW-004    | Kruche selektory CSS/XPath                                         | warning | quarantine |
| QA-PY-002    | Pominięty test (`skip`, nieścisły `xfail`)                         | warning | core       |
| QA-CS-103    | Metoda testowa bez asercji                                         | error   | core       |

Pełny katalog jest generowany z rejestru, nigdy nie jest utrzymywany ręcznie: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) albo [przewodnik po tym, co sprawdza](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Każda reguła wymieniona w tym README</strong>, w jednej tabeli</summary>

<br />

> Reguły `quarantine` działają tylko z `--strict` i nigdy nie blokują (są ograniczone do info). Pokazana ważność to ważność nadana przez autora.

| ID           | Rodzina    | Reguła                                                      | Ważność | Poziom     |
| ------------ | ---------- | ----------------------------------------------------------- | ------- | ---------- |
| QA-TEST-001  | Higiena    | Zacommitowany test z fokusem (`.only`, `fit`)               | error   | quarantine |
| QA-TEST-002  | Higiena    | Pominięty test. Bez śledzonego powodu eskaluje do `error`.  | warning | quarantine |
| QA-TEST-003  | Higiena    | Test bez asercji                                            | error   | quarantine |
| QA-TEST-004  | Higiena    | Sztywny sleep (`waitForTimeout`, `sleep()`, `delay()`)      | warning | extended   |
| QA-TEST-006  | Higiena    | Nadużywanie ponowień, które ukrywa niestabilność            | warning | quarantine |
| QA-TEST-010  | Higiena    | Puste ciało testu                                           | error   | quarantine |
| QA-TQUAL-002 | Jakość     | Asercja tautologiczna                                       | error   | quarantine |
| QA-TQUAL-009 | Jakość     | Asercja na promise bez await                                | error   | quarantine |
| QA-TQUAL-011 | Jakość     | Zakomentowane testy                                         | warning | extended   |
| QA-PW-002    | Playwright | Asercja na lokatorze bez await                              | error   | core       |
| QA-PW-003    | Playwright | Zacommitowane `page.pause()` / `test.only()`                | error   | core       |
| QA-PW-004    | Playwright | Kruche selektory CSS/XPath                                  | warning | quarantine |
| QA-PW-123    | Playwright | Zakodowane na sztywno adresy URL środowisk                  | warning | quarantine |
| QA-PW-140    | Playwright | Zrzut ekranu bez `maxDiffPixelRatio`                        | warning | core       |
| QA-CI-001    | CI         | `continue-on-error` maskuje zawodzącą bramkę                | error   | quarantine |
| QA-CI-002    | CI         | `\|\| true` połyka kody wyjścia                             | error   | extended   |
| QA-CI-005    | CI         | Raport używany, ale nigdy niegenerowany                     | error   | quarantine |
| QA-CI-007    | CI         | Wrappery ponawiające wokół testów                           | warning | extended   |
| QA-CI-008    | CI         | Krok, który zawsze się udaje, maskuje porażki               | error   | quarantine |
| QA-CI-009    | CI         | Kod wyjścia nieprzekazany (`\|` bez pipefail, łańcuchy `;`) | error   | extended   |
| QA-CI-010    | CI         | Testy pomijane tam, gdzie muszą blokować                    | error   | quarantine |
| QA-PY-002    | Python     | Pominięty test (`skip`, nieścisły `xfail`)                  | warning | core       |
| QA-PY-003    | Python     | Funkcja testowa bez asercji                                 | error   | quarantine |
| QA-PY-005    | Python     | `time.sleep()` w testach                                    | warning | extended   |
| QA-PY-012    | Python     | Asercja tautologiczna                                       | error   | quarantine |
| QA-JV-101    | Java       | Wyłączony test (`@Disabled`)                                | warning | core       |
| QA-JV-102    | Java       | Sztywny sleep (`Thread.sleep()`)                            | warning | extended   |
| QA-JV-103    | Java       | Metoda testowa bez asercji                                  | error   | extended   |
| QA-JV-105    | Java       | Sztywny sleep przez `waitForTimeout()` w Playwright         | warning | core       |
| QA-JV-106    | Java       | Kruchy selektor zamiast lokatora opartego na roli           | warning | quarantine |
| QA-CS-101    | C#         | Pominięty test (`[Ignore]`, `[Fact(Skip=)]`)                | warning | core       |
| QA-CS-102    | C#         | Sztywny sleep (`Thread.Sleep` / `Task.Delay`)               | warning | core       |
| QA-CS-103    | C#         | Metoda testowa bez asercji                                  | error   | core       |
| QA-CS-105    | C#         | Sztywny sleep przez `WaitForTimeoutAsync()`                 | warning | extended   |
| QA-CS-106    | C#         | Kruchy selektor zamiast lokatora opartego na roli           | warning | quarantine |

Python ma też reguły QA-PY-001…012 (higiena pytest) i QA-PY-101…108 (Playwright dla Pythona). Cypress i Selenium mają zestawy startowe po trzy reguły.

</details>

Każda reguła trafia do wydania z fixture'em must-fire **i** must-not-fire, a reguła, która odpala na własnym negatywnym fixture'ze, nie może zostać wydana. To zapora przed fałszywymi alarmami; `mjolnir doctor` egzekwuje ją we własnym CI tego repozytorium.

### Selector Health Score

`mjolnir doctor:playwright` ocenia każdy lokator według tego, jak znajduje element: tak jak zrobiłby to użytkownik (rola, etykieta, tekst), przez jawny kontrakt (`data-testid`) lub przez przypadek strukturalny (łańcuchy CSS, XPath). Każdy plik dostaje wynik od 0 do 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

To mierzy **odporność, a nie poprawność**. `.btn.btn-primary > div:nth-child(2)` przechodzi dziś i będzie przechodzić, dopóki ktoś nie ruszy znaczników. Niski wynik nigdy nie twierdzi, że test jest zepsuty, tylko że zależy od znaczników, których nikt nie obiecał zachować.

<br />

## Wynik wiarygodności

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="Skala wiarygodności od 0 do 100, ze znacznikiem przechodzącym przez każdy wynik: UNWORTHY poniżej 50, NEEDS WORK od 50 do 79, WORTHY od 80 do 99, FORGED przy 100" width="720" />
</p>

<sub>Każdy wynik od 0 do 100, umieszczony przez prawdziwe `deriveScoreState`. Wygenerowane przez `npm run docs:gauge` i zabezpieczone w CI przed rozjazdem.</sub>

| Wynik     | Werdykt                                       |
| --------- | --------------------------------------------- |
| `0 – 49`  | **UNWORTHY**                                  |
| `50 – 79` | **NEEDS WORK**                                |
| `80 – 99` | **WORTHY**                                    |
| `100`     | **FORGED**                                    |
| `null`    | **UNKNOWN**: nie znaleziono deklaracji testów |

**Jak jest liczony.** Ważność ustala potrącenie bazowe (`error −8`, `warning −3`, `info −1`), a poziom dowodu je obniża: E2 liczy się w całości, E1 w połowie (zaokrąglając w dół), E0 wcale. Suma jest normalizowana względem ekspozycji zestawu, czyli potrąceń na deklarację testu, a nie na plik. Terminal wypisuje te same obniżone liczby, których użył wynik; nie ma ukrytego drugiego modelu. Szczegóły: [docs/SCORING.md](docs/SCORING.md) i [przewodnik po wyniku](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Czego 100 nie oznacza.** Nie oznacza, że oprogramowanie jest poprawne, zestaw testów wystarczający, a produkt wolny od defektów. Oznacza jedno: **żadna z reguł ocenionych przez Mjölnira nie dała potrącenia w tym skanie i przy tym modelu dowodów.**

<br />

## Model dowodów

Każde znalezisko ma dwie etykiety: jak pewny jest Mjölnir i jak daleko znalezisko zostało sprawdzone. To różnica między narzędziem, które zgłasza wzorce, a narzędziem, od którego możesz uzależnić wydanie.

**Jak pewne — poziom dowodu.**

| Poziom | Nazwa                  | Znaczenie                                          | Potrącenie |
| ------ | ---------------------- | -------------------------------------------------- | ---------- |
| **E2** | Dowód deterministyczny | Defekt jest obecny w kodzie w obecnej postaci      | Pełne      |
| **E1** | Dowód ze wzorca        | Dopasował się wzorzec silnie związany z defektem   | Połowa     |
| **E0** | Obserwacja             | Warto wiedzieć. Nie twierdzi, że coś jest nie tak. | Zero       |

Pewność wykrycia to nie siła dowodu. Reguła może być pewna, że dopasowała to, czego szukała, a mimo to patrzeć na heurystykę. Znaleziska E1 są po to, by je czytać i oceniać, nigdy stosować na ślepo, a ta granica jest odciśnięta na znalezisku w terminalu, w JSON i w przekazaniu dla agenta.

**Jak daleko sprawdzone — poziom zaufania.** Większość znalezisk pochodzi z czytania twojego kodu. Daj Mjölnirowi raport z prawdziwego przebiegu testów, a potwierdzi, że kod naprawdę się wykonał.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="Drabina zaufania od L0 do L5. L0–L2 pochodzą z czytania kodu; L3–L5 wymagają raportu z prawdziwego przebiegu, co zaznacza przerwa w drabinie." width="100%" />
</p>

| Poziom | Po ludzku            | Czego wymaga                                                    |
| ------ | -------------------- | --------------------------------------------------------------- |
| **L0** | Odnotowane           | Czytanie kodu                                                   |
| **L1** | Wygląda na problem   | Czytanie kodu: dopasował się wzorzec                            |
| **L2** | Udowodnione w kodzie | Czytanie kodu: defekt jest strukturalny                         |
| **L3** | Plik się wykonał     | Raport z przebiegu pokazuje, że plik znaleziska został wykonany |
| **L4** | Test się wykonał     | Raport z przebiegu pokazuje, że test znaleziska został wykonany |
| **L5** | Przebieg się zgadza  | Sam wynik przebiegu potwierdza klasę defektu                    |

Skan statyczny kończy się na L2. Tylko raport z prawdziwego przebiegu (Playwright JSON, Jest lub Vitest JSON, JUnit XML) może podnieść znalezisko do L3 lub wyżej, więc znalezisko, którego nigdy nie widziano w działaniu, nigdy nie może twierdzić, że działało. Definicje: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Ile z tego jest zmierzone

**74 z 79 reguł ma odsetek fałszywych alarmów zmierzony na prawdziwym kodzie OSS** (co najmniej 10 ręcznie sklasyfikowanych znalezisk każda; zobacz [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Pozostałe 5 opiera się na szacunku autora i mówi to, reguła po regule, w `mjolnir explain`. `mjolnir rules --unmeasured` je wypisuje, a stopka każdego skanu podaje, ile z reguł, które faktycznie _odpaliły_, jest zmierzonych.

Odsetki pozostają publiczne, także gdy są złe. QA-TEST-001 (zacommitowane `.only`) wypada słabo w audycie na prawdziwych repozytoriach i dlatego siedzi w quarantine. Aktualna liczba dla każdej reguły, łącznie z QA-PW-141, jest w audycie.

### Poziomy zaufania reguł

Poziomy wynikają ze zmierzonego odsetka fałszywych alarmów, nie z opinii:

| Poziom         | Zmierzone FP                   | Zachowanie                                                |
| -------------- | ------------------------------ | --------------------------------------------------------- |
| **core**       | ≤ 10%                          | Raport domyślny, blokuje                                  |
| **extended**   | ≤ 30%                          | Raport domyślny, niższa pewność                           |
| **quarantine** | > 30% lub jawnie zadeklarowane | Tylko `--strict`, ograniczone do info, nigdy nie blokuje  |
| _niezmierzona_ | n < 10                         | Nie może awansować do core, dopóki nie zostanie zmierzona |

Pasma FP mogą tylko obniżyć poziom — nigdy nie promują reguły z `quarantine`, jeśli została tam jawnie zadeklarowana. Jawna reguła w quarantine pozostaje w quarantine niezależnie od zmierzonego wskaźnika FP.

Awans, degradacja i dojrzałość według języka: [cykl życia reguł](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Dlaczego to nie jest linter

Lintery mówią ci, czy kod przestrzega reguł. Mjölnir mówi ci, czy twojej weryfikacji można ufać.

|                                                                  | Lintery (ESLint, SonarQube) | Narzędzia pokrycia | Code review z AI |     **Mjölnir**     |
| ---------------------------------------------------------------- | :-------------------------: | :----------------: | :--------------: | :-----------------: |
| Ocenia **system weryfikacji**, a nie kod produktu                |             Nie             |        Nie         |       Nie        |         Tak         |
| Integralność workflow CI (`continue-on-error`, `\|\| true`)      |             Nie             |        Nie         |    tylko diff    |         Tak         |
| Ocenia odporność lokatorów Playwright (Selector Health)          |             Nie             |        Nie         |       Nie        |         Tak         |
| Czyta prawdziwe dane z przebiegów dla werdyktów `TRUE-FLAKE`     |             Nie             |        Nie         |       Nie        |         Tak         |
| Publikuje zmierzony odsetek fałszywych alarmów dla każdej reguły |             Nie             |        Nie         |       Nie        |         Tak         |
| Oznacza testy bez asercji                                        |            Tak\*            |        Nie         |      czasem      |         Tak         |
| Wyłapuje sztywne sleepy (`waitForTimeout`, `time.sleep`)         |            Tak\*            |        Nie         |      czasem      |         Tak         |
| Deterministyczny (to samo wejście, to samo wyjście)              |             Tak             |        Tak         |       Nie        |         Tak         |
| Koszt skanu                                                      |          za darmo           |      za darmo      |      tokeny      | **zero** (lokalnie) |

<sub>\*Pokryte przez `eslint-plugin-jest` i `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) oraz przez własne reguły asercji SonarQube. Kolumny opisują domyślne zachowanie przy weryfikacji zestawów testów; wtyczki, płatne plany i własne reguły zmieniają niektóre odpowiedzi. To podsumowanie pozycjonowania, a nie benchmark.</sub>

Korzystaj też z review z AI. Wychwytuje niuanse, intencje i wady projektowe, których żaden wzorzec nie znajdzie. Mjölnir wychwytuje to, co review z AI przeoczy, bo wygląda na zamierzone: zacommitowane `.only`, połknięty kod wyjścia, `continue-on-error` na jobie testowym. To wymaga skanowania, nie rozumowania.

<br />

## Analiza przebiegów testów

Analiza statyczna rozumuje o kodzie, który nigdy się nie wykonał. Analiza przebiegów czyta to, co faktycznie się stało: Playwright JSON, Jest JSON, Vitest JSON i JUnit XML z dowolnego runnera.

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

`TRUE-FLAKE` nie oznacza, że test był ponawiany. Oznacza, że test **zawiódł przynajmniej jedną próbę, a potem zakończył się na zielono**: szczęśliwe przejście, oznaczone bez względu na to, co mówi końcowy znacznik. `mjolnir triage` zamienia tę historię w propozycję kwarantanny, a `mjolnir pw-report` podsumowuje przebieg. To te same raporty z przebiegów podnoszą znaleziska do poziomów zaufania L3 i wyżej.

<br />

## Integralność CI

Test może przechodzić, podczas gdy pipeline wokół niego nie może zawieść. Mjölnir czyta też workflow: `continue-on-error`, `|| true`, kody wyjścia, które nigdy się nie propagują, kroki zawsze kończące się sukcesem, raporty używane, ale nigdy niegenerowane, oraz bramki pomijane przy zdarzeniach, które powinny blokować. Każde znalezisko wskazuje job, krok i wiersz oraz ma własny poziom dowodu.

Wygeneruj workflow dla PR, domyślnie doradczy:

```bash
mjolnir ci install
```

Albo dodaj akcję z Marketplace do workflow, który już masz:

```yaml
- uses: Sergey-Bar/Mjolnir@v3
  with:
    scope: changed
    fail-on: error
```

Przypnij `@v3`, aby podążać za główną linią, albo dokładny tag (`@v0.5.32`) dla powtarzalnej bramki. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) opisuje Marketplace, Smithery i rejestry MCP.

Aby umieścić znaleziska w GitHub Code Scanning, wyślij SARIF (wymaga `security-events: write` na poziomie workflow lub job):

```yaml
- run: npx mjolnir-qa@3.0.0 --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

W GitLab `--format codequality` zapisuje raport Code Quality, który czytają widżet MR i adnotacje diffu ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Konfiguracja edytora i pipeline'u: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Przypisanie w zakresie zmian

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

Znaleziska są przypisywane do wierszy dodanych przez twoją gałąź, liczonych względem **merge-base**. Zakres to ten sam zbiór plików, który odkrywa pełny skan (specyfikacje TS/JS i konfiguracje adapterów, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), plus niezacommitowane i nieśledzone zmiany, więc działa jeszcze przed commitem. Baza jest rozwiązywana w kolejności `main → master → origin/main → origin/master → origin/HEAD`; możesz ją nadpisać przez `--base <ref>`.

Gdy merge-base nie da się rozwiązać (płytki klon, odłączony HEAD, cel poza git), znaleziska wracają do przypisania do całego pliku **i raport to mówi.** Ciche przejście na tryb awaryjny byłoby dokładnie tym rodzajem defektu, dla którego wykrywania istnieje to narzędzie.

<br />

## Agenci AI

Znaleziska są coś warte tylko wtedy, gdy coś na nie reaguje.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**AI pisze poprawkę. Mjölnir ją weryfikuje.** Dowód pochodzi z ponownego skanu, nigdy z własnego raportu agenta o sukcesie.

| Polecenie         | Co dostaje agent                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | Serwer [MCP](https://modelcontextprotocol.io) przez stdio. `scan`, `explain` i `diff` stają się narzędziami do wywołania.                                                    |
| `mjolnir handoff` | Zapisany raport `--json` staje się deterministycznym planem w Markdown: co wykryto, granica dowodu dla każdego znaleziska, co **nie** może się zmienić, jak to zweryfikować. |
| `mjolnir install` | Zapisuje w miejscach dla agentów, które twoje repo już ma (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`), aby agent skanował ponownie, zanim oświadczy, że skończył.        |

Dodaj go do klienta, który ma własne CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@3.0.0 mcp
```

Albo do dowolnego klienta, który przyjmuje blok `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@3.0.0", "mcp"] }
  }
}
```

**Zabezpieczenie jest ważniejsze niż wygoda.** Każde znalezisko w przekazaniu niesie swoją granicę. **E2** mówi _deterministyczne: sprawdź lokalizację i zastosuj poprawkę_. **E1** mówi _WYMAGA POTWIERDZENIA: sama obserwacja nie dowodzi defektu_. Agent, który na ślepo naprawia E1, wycisza regułę albo edytuje regułę, by podnieść wynik, robi dokładnie to, dla czego wykrywania istnieje to narzędzie, więc przekazanie mówi to w prompcie, obok znaleziska.

<br />

## Zaufanie i bezpieczeństwo

**Najpierw lokalnie, zero telemetrii.** W `src/` nie ma nigdzie żadnego API zdolnego do komunikacji sieciowej (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket), a [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) przerywa build, jeśli któreś się pojawi. Zakazuje też `eval` i `new Function`. Skanowanie niezaufanego kodu nigdy go nie wykonuje: analiza statyczna czyta tekst źródłowy, a analiza przebiegów parsuje pliki raportów, które już są na dysku.

Dwa zastrzeżenia: samo `npx` pobiera pakiet, zanim cokolwiek się uruchomi, a gwarancja obejmuje `src/`, nie wtyczki firm trzecich.

**Wtyczki nie działają w piaskownicy.** Wtyczki JS (`mjolnir-rules/*.mjs` lub pakiety npm wymienione w `"plugins"`) działają z pełnymi uprawnieniami Node, w tym samym modelu zaufania co wtyczki ESLint czy Vitest. Ich ładowanie wymaga świadomej zgody **dla każdego skanu**: bez `--enable-plugins` (lub `MJOLNIR_ENABLE_PLUGINS=1`) ich źródła nigdy nie są ładowane, a komunikat na stderr wymienia, co pominięto. Manifesty reguł w JSON nie wykonują kodu, a prefiksy ID reguł core są zarezerwowane, aby żadna wtyczka nie mogła się pod nie podszyć. Zgłaszaj podatności przez [SECURITY.md](SECURITY.md).

**Działa na sobie samym.** Silnik zaufania do weryfikacji nie ma wiarygodności, jeśli sam nie jest weryfikowalny. Każdy przebieg CI skanuje to repozytorium buildem wytworzonym w tym samym przebiegu. Bramka zawodzi przy każdym znalezisku o ważności error, a także przy **częściowym** skanie lub **regule, która się wysypała**, bo ucięty autoskan, który niczego nie zgłasza, to właśnie fałszywa zieleń, dla której wykrywania istnieje ten projekt. `mjolnir doctor` w tym samym przebiegu ponownie audytuje bazę reguł (zapora fixture'ów, uczciwość poziomów, limit poziomu core), a kontrola z wynikiem INCONCLUSIVE zawodzi dokładnie tak jak nieudana. Oba raporty są wysyłane jako artefakty buildu.

### Kody wyjścia i kontrakt maszynowy

Zamrożone, więc możesz budować na nich logikę CI:

| Kod wyjścia | Znaczenie                                                                        |
| ----------- | -------------------------------------------------------------------------------- |
| `0`         | Czysto: brak znalezisk na poziomie bramki lub powyżej                            |
| `1`         | Znaleziska na poziomie bramki lub powyżej                                        |
| `2`         | Częściowy skan (przekroczony limit czasu, nieczytelne pliki). Nigdy nie blokuje. |
| `10`        | Błąd użycia (zła flaga, brak celu)                                               |
| `20`        | Błąd wewnętrzny                                                                  |

`2` celowo różni się od `0`: skan, który się nie zakończył, nie znalazł „niczego”. On po prostu nie skończył szukać.

Wszystko, co konsumuje maszyna (wyniki narzędzi MCP, `--json`, SARIF 2.1), pochodzi z jednego kanonicznego wyniku w wersjonowanym schemacie, **rozszerzanym wyłącznie addytywnie** (`schemaVersion: 1`, `contractVersion: 1`), więc żaden konsument nie musi odtwarzać znaczenia z wyrenderowanego tekstu. Zobacz [kontrakt maszynowy](docs/machine-contract.md). ID reguł (`QA-<FAMILY>-NNN`) są niezmienne po wydaniu i nigdy nie są używane ponownie.

<br />

## Czego Mjölnir nie może ci powiedzieć

- **Nie uruchamia twoich testów.** Czysty skan to nie przechodzący zestaw testów.
- **Nie powie ci, że asercja jest _błędna_.** `expect(total).toBe(41)` wygląda zdrowo. Mjölnir znajduje testy, które _nie mogą zawieść_, i pipeline'y, które _nie mogą zrobić się czerwone_, a nie testy, które sprawdzają niewłaściwą rzecz.
- **Nie dowodzi poprawności biznesowej.** Nic tutaj nie mówi, że twój produkt robi to, czego wymagało wymaganie.
- **100 nie jest dowodem dobrego zestawu testów.** To, czy twój zestaw pokrywa realne ryzyko, to inne pytanie, a to narzędzie na nie nie odpowiada.
- **5 z 79 reguł opiera się na szacunku**, a nie na zmierzonym odsetku. Każda z nich mówi to na własnym znalezisku.
- **E1 to nie E2.** Znaleziska heurystyczne warto czytać, ale nie warto stosować na ślepo.
- **Puste repo dostaje `null`, nigdy 100.**
- **Plik o nazwie `*.spec.ts` bez deklaracji testów nie liczy się jako pokrycie.** Repo, którego jedyne pliki spec zawierają importy lub typy (zero wywołań `it`/`test`), dostaje `null`, a nie 100.

<br />

## Dokumentacja

Pełna strona dokumentacji jest pod adresem <https://sergey-bar.github.io/Mjolnir/>.

| Dokument                                               | Co zawiera                                            |
| ------------------------------------------------------ | ----------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalizacja wyniku i ważenie dowodów                 |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Kanoniczne słownictwo: jedno słowo na pojęcie         |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Zmierzone odsetki fałszywych alarmów i metoda         |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Stany reguł, poziomy, wyciszanie, wycofywanie         |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Zasady semver, zamrożone interfejsy, cykl wycofywania |
| [docs/machine-contract.md](docs/machine-contract.md)   | Kanoniczny wynik czytelny maszynowo                   |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Wyjście SARIF i konfiguracja edytora lub CI           |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: raport Code Quality, przepis na MR, bramka    |
| [docs/rules/](docs/rules/)                             | Generowany katalog reguł                              |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Środowisko deweloperskie i proces kontrybucji         |
| [SUPPORT.md](SUPPORT.md)                               | Gdzie pytać, zgłaszać i szukać pomocy                 |
| [SECURITY.md](SECURITY.md)                             | Zgłaszanie podatności                                 |
| [CHANGELOG.md](CHANGELOG.md)                           | Historia wydań                                        |

### Status

**Wersja 1.** Schemat JSON i kody wyjścia są zamrożonymi kontraktami. TypeScript i Python mają najszersze zmierzone pokrycie. Java i C# są nowsze; czytaj je przez [tabelę dojrzałości](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Co dalej, bez wymyślonych dat: [publiczna mapa drogowa](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Współtworzenie

Nowe reguły to najłatwiejszy pierwszy wkład. Jedno polecenie tworzy szkielet reguły z jej fixture'ami must-fire **i** must-not-fire. Wygenerowana reguła celowo nie przechodzi własnych fixture'ów, dopóki nie zostanie napisane prawdziwe wykrywanie, bo wydany szkielet to reguła, której nikt nie zmierzył:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Środowisko deweloperskie, polecenia stałych bramek oraz prawa anti-creep i zapory fixture'ów są opisane w [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Uruchom go na swoim repo." width="100%" />

```bash
npx mjolnir-qa@3.0.0
```

[Przeczytaj przewodnik](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Strona dokumentacji](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

Nie pytaj, czy testy przeszły.<br />
Zapytaj, czy dowody potwierdzają, że zasługują na zaufanie.

<sub>Stworzone przez [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · Licencja MIT</sub>

</div>
