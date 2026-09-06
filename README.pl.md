<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Twoje testy kłamią. My to dowodzimy.

**Verification Trust Engine dla QA.** Mjölnir audytuje suite testowe i
pipeline'y CI, raportuje wskaźnik wiarygodności i pokazuje dokładnie,
gdzie zaufanie się łamie.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | Polski | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Czy twoje testy zasługują na zaufanie?**

[Zobacz w akcji](#-zobacz-w-akcji) ·
[Szybki start](#-szybki-start) ·
[Co sprawdza](#-co-sprawdza-mjölnir) ·
[Punktacja](#jak-działa-punktacja) ·
[CI](#-integracja-ci) · [Konfiguracja](#konfiguracja) ·
[Dokumentacja](#-dokumentacja)

</div>

---

## 🎬 Zobacz w akcji

<p align="center">
  <img src="assets/readme/demo.svg" alt="Pełny raport --verbose Mjölnir na demo repo: WORTHINESS 75/100 NEEDS WORK, rozbicie diagnostyki wg kategorii, lista FIX THIS FIRST i każde znalezisko z ID reguły i numerem linii — CI, Playwright, higiena testów i reguły Pythona" width="900" />
</p>

<sub>Kompletny wynik `npx mjolnir-qa ./examples/demo-repo --verbose`,
wyrenderowany przez prawdziwy reporter — nic nie ucięto. Regenerowany
przez `npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
wywala CI, jeśli artefakt odjechał od tego, co wypisuje narzędzie.</sub>

**Co właśnie się stało:**

1. Mjölnir znalazł specyfikacje Playwright, swoją konfigurację,
   workflow CI i plik testowy Pythona — cztery języki/formaty, jeden
   przebieg.
2. Znalazł dowody osłabiające zaufanie do suity — `continue-on-error`
   maskujący job, `|| true` połykający kod wyjścia, twarde sleepy,
   kruchy selektor, zaszyte na sztywno URL-e stagingu, czekanie
   `networkidle`.
3. Każdy z nich zamienił w konkretne znalezisko z ID reguły, miejscem
   i fixem — oraz w jedną punktację, na której można gate'ować PR.

### Jedno znalezisko z bliska

Uruchom `mjolnir explain QA-CI-001` na pierwszym znalezisku powyżej, a
otrzymasz:

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

To jest jednostka wartości: nie czepialstwo stylistyczne, lecz miejsce,
gdzie twój CI mówi ci, że coś przeszło, choć nie przeszło.

---

## ⚡ Szybki start

Uruchom na repozytorium — dostaniesz pełny raport i wskaźnik
wiarygodności:

```bash
npx mjolnir-qa@latest
```

**W CI produktem jest jedna komenda.** Skanuje tylko to, czego dotknął
branch, i kończy się kodem niezerowym przy nowych problemach:

```bash
npx mjolnir-qa@latest --scope changed
```

Wrzuć to jako check w PR — `mjolnir ci install` pisze workflow — i
gotowe. Wszystko inne jest opcjonalne.

| Komenda                             | Co robi                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `mjolnir`                           | Skan całego repo + wskaźnik wiarygodności                |
| `mjolnir --scope changed`           | Tylko to, co wprowadził twój branch — wariant CI         |
| `mjolnir ci install`                | Generuje doradczy workflow PR                            |
| `mjolnir explain QA-CI-001`         | Co / dlaczego / fix + zmierzona stopa FP dla reguły      |
| `mjolnir rules --unmeasured`        | Reguły działające na założeniu, nie na pomiarze          |
| `mjolnir --json` / `--format sarif` | Czytelne maszynowo / GitHub Code Scanning                |
| `mjolnir --strict`                  | Uruchamia też reguły tieru quarantine (wyższe ryzyko FP) |

<details>
<summary><strong>Gdy coś jest flaky</strong></summary>

| Komenda                             | Co robi                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Prawdziwe dane przebiegów → werdykty `TRUE-FLAKE`, `FLAKY.md`     |
| `mjolnir triage ./test-results/`    | Propozycja kwarantanny z historii wykonania                       |
| `mjolnir pw-report ./test-results/` | Podsumowanie przebiegu Playwright — retry / flaki / najwolniejsze |
| `mjolnir doctor:playwright`         | Głęboki skan tylko Playwright + Selector Health Score             |

</details>

<details>
<summary><strong>Okazjonalnie / raporty</strong></summary>

| Komenda                         | Co robi                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Bezpieczne autofiksy z dowodem                            |
| `mjolnir baseline` / `diff`     | Migawka znalezisk, potem raport tylko nowych/pogorszonych |
| `mjolnir impact --since <ref>`  | Co się zmieniło od wcześniejszego commita                 |
| `mjolnir debt`                  | Rejestr długu testowego z modelem kosztów                 |
| `mjolnir handover`              | Mapa onboardingu suity dla nowego QA                      |
| `mjolnir stats`                 | Lokalne liczniki wszystkich widzianych fixów              |
| `mjolnir badge`                 | JSON endpointu shields.io + snippet                       |
| `mjolnir rules --md`            | Pełny katalog reguł (JSON albo Markdown)                  |
| `mjolnir doctor`                | Samoaudyt własnej bazy reguł Mjölnir                      |
| `mjolnir create-rule <ID>`      | Szkielet nowej reguły + fixture                           |
| `mjolnir --format mermaid`      | Diagram architektury testów do komentarza PR              |

</details>

Zainstaluj globalnie zamiast `npx`, jeśli wolisz: `npm i -g mjolnir-qa`.
Wymaga Node.js ≥ 22.18. Działa na Windows, macOS i Linux.

---

## 👥 Dla kogo to jest?

- **QA / SDET** posiadający suitę e2e lub integracyjną, którzy
  potrzebują dowodów, że suita naprawdę zasługuje na zielony check,
  jaki wystawia.
- **Zespoły Platform / DevEx** odpowiedzialne za integralność CI i
  release gate'y — ludzie, dla których `continue-on-error` nie może
  nigdy po cichu przemalować czerwonego pipeline'u na zielono.
- **Maintainerzy OSS**, którzy chcą taniego, zawsze włączonego gate'a
  weryfikacyjnego, działającego lokalnie i w CI bez wywołań sieciowych.

---

## 🔨 Co sprawdza Mjölnir

|     |                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Wskaźnik wiarygodności** — jedna liczba, przejrzysta tabela potrąceń, żadna czarna skrzynka                                         |
| 🎭  | **Selector Health Score** — ocenia twoje lokatory Playwright, a nie tylko pass rate                                                   |
| 🔬  | **Kryminalistyka runtime** — czyta prawdziwe dane przebiegów Playwright/JUnit, by złapać `TRUE-FLAKE`, nie tylko statyczne zgadywanki |
| 🚨  | **Reguły integralności CI** — łapie `continue-on-error`, `\|\| true` i inne triki na fałszywą zieleń                                  |
| 🐍  | **Wszystkie cztery bindingi Playwright** — TypeScript, Python, Java, C#/.NET — plus pytest, JUnit/TestNG i workflow CI                |
| 🔒  | **Local-first** — zero wywołań sieciowych podczas skanu, zero telemetrii, działa w sekundy                                            |

### Reguły

Każda reguła jest dostarczana z fixture'ami must-fire **i**
must-not-fire. Reguła, która odpala na własnej negatywnej fixture,
nie może się wydać — to zapora na fałszywe pozytywy.

<details>
<summary><strong>Higiena testów</strong></summary>

| ID          | Reguła                                                | Severity |
| ----------- | ----------------------------------------------------- | -------- |
| QA-TEST-001 | Committowany test z fokusem (`.only`, `fit`)          | error    |
| QA-TEST-002 | Pominięty test bez uzasadnienia                       | error    |
| QA-TEST-002 | Pominięty test z zarejestrowanym uzasadnieniem        | warning  |
| QA-TEST-003 | Test bez asercji                                      | error    |
| QA-TEST-004 | Twardy sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Nadużywanie retry, ukrywające flakiness               | warning  |
| QA-TEST-010 | Puste ciało testu                                     | error    |

</details>

<details>
<summary><strong>Jakość testów</strong></summary>

| ID           | Reguła                        | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | Weryfikacja wyłącznie mockami | info     |
| QA-TQUAL-002 | Asercja tautologiczna         | error    |
| QA-TQUAL-009 | Asercja promise bez await     | error    |
| QA-TQUAL-011 | Zakomentowane testy           | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Reguła                                      | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-PW-002 | Asercja lokatora bez await                  | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committowane | error    |
| QA-PW-004 | Kruche selektory CSS/XPath                  | warning  |
| QA-PW-005 | Logika biznesowa wewnątrz `page.evaluate()` | info     |
| QA-PW-114 | Legacy element handles (`page.$`)           | info     |
| QA-PW-118 | Czekanie `networkidle` (flaky by design)    | info     |
| QA-PW-123 | Zaszyte na sztywno URL-e środowisk          | warning  |

</details>

<details>
<summary><strong>Integralność CI</strong></summary>

| ID        | Reguła                                                             | Severity |
| --------- | ------------------------------------------------------------------ | -------- |
| QA-CI-001 | `continue-on-error` maskuje porażki                                | error    |
| QA-CI-002 | `\|\| true` połyka kody wyjścia                                    | error    |
| QA-CI-005 | Raport konsumowany, ale nigdy nie generowany                       | error    |
| QA-CI-007 | Wrapper'y retry wokół testów                                       | warning  |
| QA-CI-008 | Zawsze udany step maskuje porażki                                  | error    |
| QA-CI-009 | Kod wyjścia testu niepropagowany (`\|` bez pipefail, łańcuchy `;`) | error    |
| QA-CI-010 | Testy pomijane tam, gdzie muszą blokować (strażniki skip-on-PR)    | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Reguła                                     | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-PY-002 | Pominięty test (`skip`, niestrykt `xfail`) | warning  |
| QA-PY-003 | Funkcja testowa bez asercji                | error    |
| QA-PY-005 | `time.sleep()` w testach                   | warning  |
| QA-PY-006 | Puste ciało testu (`pass`)                 | info     |
| QA-PY-010 | Zależność od losowości/czasu bez freeze    | info     |
| QA-PY-012 | Asercja tautologiczna                      | error    |

Łącznie 20 reguł Pythona (QA-PY-001…012 higiena pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Reguła                                     | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-JV-101 | Wyłączony test (`@Disabled`)               | warning  |
| QA-JV-102 | Twardy sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Metoda testowa bez asercji                 | error    |
| QA-JV-105 | Twardy sleep Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Kruchy selektor zamiast role lokatora      | warning  |
| QA-JV-108 | Zaszyty na sztywno URL środowiska w teście | info     |
| QA-JV-111 | Blanketowy mock `page.route("**")`         | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Reguła                                       | Severity |
| --------- | -------------------------------------------- | -------- |
| QA-CS-101 | Pominięty test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Twardy sleep (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Metoda testowa bez asercji                   | error    |
| QA-CS-105 | Twardy sleep `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | Kruchy selektor zamiast role lokatora        | warning  |
| QA-CS-108 | Zaszyty na sztywno URL środowiska w teście   | info     |
| QA-CS-111 | Blanketowy mock `page.RouteAsync("**")`      | info     |

</details>

> Pełny, żywy katalog — każda reguła z tierem, confidence, ryzykiem
> fałszywych pozytywów i dostępnością autofixa — jest generowany z
> rejestru:
>
> ```bash
> mjolnir rules --md
> ```
>
> Strony pojedynczych reguł mieszkają w [`docs/rules/`](docs/rules/).

### Ile z tego jest zmierzone

**74 z 99 reguł niesie stopę fałszywych pozytywów zmierzoną na
prawdziwym kodzie OSS** (≥ 10 ręcznie zaklasyfikowanych znalezisk każda;
zob. [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Pozostałe 19 wychodzi na
oszacowaniu autora. Stopka każdego skanu mówi, ile z _odpalonych_
reguł jest zmierzonych; `mjolnir rules --unmeasured` wypisuje
niezmierzone; strona `mjolnir explain` każdej reguły deklaruje jej
status. Publikujemy stopę, nawet gdy jest brzydka — QA-CS-103 audytuje
się na 95 % i za to trafia do kwarantanny. Powiększanie tej 78-ki to
stale trwająca praca projektu.

### Tiery reguł i dojrzałość językowa

Każda reguła to `core`, `extended` albo `quarantine`, przypisane z jej
**zmierzoną** stopą fałszywych pozytywów:

| Tier         | Znaczenie                                        | Skan domyślny | `--strict` |
| ------------ | ------------------------------------------------ | :-----------: | :--------: |
| `core`       | ≤ 10 % zmierzonych FP                            |      ✅       |     ✅     |
| `extended`   | ≤ 30 % zmierzonych FP                            |      ✅       |     ✅     |
| `quarantine` | powyżej 30 %, albo jeszcze niezmierzone (n < 10) |      ❌       |     ✅     |

| Język           | Adapter         | Pokrycie dziś                                                |
| --------------- | --------------- | ------------------------------------------------------------ |
| TypeScript / JS | AST kompilatora | najszersze, najmocniej mierzone — głównie `core`/`extended`  |
| Python / pytest | Warstwa regex   | szerokie, audytowane na korpusie — głównie `core`/`extended` |
| Java            | Warstwa regex   | nowsze — głównie `extended`/`quarantine`                     |
| C# / .NET       | Warstwa regex   | nowsze — głównie `extended`/`quarantine`                     |

TypeScript i Python mają najszersze zmierzone pokrycie. Java i C#
się wydały, są udokumentowane i pozostają poza nagłówkową liczbą,
aż prawdziwa konsumująca suita (nie własne testy biblioteki bindingu)
zostanie audytowana.

---

## Jak działa punktacja

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Wynik terminala Mjölnir — WORTHINESS 75/100 NEEDS WORK, rozbicie diagnostyki wg kategorii i lista FIX THIS FIRST" width="820" />
</p>

<sub>Regenerowany przez `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
wywala CI, jeśli artefakt odjechał od tego, co reporter naprawdę
wypisuje.</sub>

Punktacja jest przejrzysta: **error −8, warning −3, info −1**, potem
normalizacja o ekspozycję suity (potrącenia na deklarację testu).
Potrącenia ważone dowodami znaczą, że słabe sygnały kosztują mniej.
Terminal pokazuje te same zdyskontowane liczby, których używa
punktacja — żadnej czarnej skrzynki. Pełna metoda:
[docs/SCORING.md](docs/SCORING.md).

**Werdykty**

| Score   | Werdykt          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Poziomy dowodów** — każde znalezisko niesie jeden; ustawia wagę
znaleziska w punktacji:

| Poziom | Znaczenie             | Wpływ na punktację | Przykład                                               |
| ------ | --------------------- | ------------------ | ------------------------------------------------------ |
| E2     | Deterministyczna wada | Pełne potrącenie   | Committowany `.only` — dowodliwe strukturalnie         |
| E1     | Heurystyczny wzorzec  | Połowa potrącenia  | Regex-owo trafiony `sleep()` — mocny sygnał, nie dowód |
| E0     | Obserwacja            | Zero (tylko info)  | Raportowane, ale nigdy nie gate'uje CI i nie potrąca   |

Większość reguł to **E1**. Slogan „we prove it" odnosi się do tego
systemu: znaleziska E2 to dowód strukturalny; znaleziska E1 to
poprawnie pozycjonowane ostrzeżenia, nie formalne dowody.

Puste repo punktuje `null`, nigdy fałszywą setkę — zob.
[Model zaufania](#model-zaufania).

---

## 🎭 Selector Health Score

Flagowa metryka dla suite'ów Playwright — jak odporne są twoje
lokatory:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Lokatory oparte na rolach dostają pełną punktację. Łańcuchy klas CSS i
XPath toną w punktacji — łamią się przy każdym refactorze DOM, nie
mówiąc, które zachowanie zregresowało.

---

## 🔬 Dowody z runtime

Statyczna detekcja flakiness to zgadywanie. Mjölnir czyta **prawdziwe
dane wykonania** — raporty JSON Playwright i XML JUnit z dowolnego
runnera:

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

Test, który przechodzi dopiero od próby ≥ 2, nie jest testem
przechodzącym — to szczęśliwy test. Zostaje oznaczony `TRUE-FLAKE`
niezależnie od finalnego zielonego checka.

---

## ⚡ Mjölnir nie jest kolejnym linterem

Lintery mówią ci, czy kod trzyma się reguł. Mjölnir mówi ci, czy twoja
weryfikacja da się uznać za wiarygodną.

|                                                             | ESLint / SonarQube | Narzędzia coverage | Ręczny review | **Mjölnir** |
| ----------------------------------------------------------- | :----------------: | :----------------: | :-----------: | :---------: |
| Integralność workflow CI (`continue-on-error`, `\|\| true`) |         ❌         |         ❌         |    rzadko     |     ✅      |
| Cross-językowo (TS, Python, Java, C#) z jednego narzędzia   |         ❌         |         ❌         |      ❌       |     ✅      |
| Ocenia odporność lokatorów Playwright (Selector Health)     |         ❌         |         ❌         |    rzadko     |     ✅      |
| Wyłapuje testy bez prawdziwych asercji                      |   ✅ (plugin)\*    |         ❌         |    czasem     |     ✅      |
| Łapie twarde sleepy (`waitForTimeout`, `time.sleep`)        |   ✅ (plugin)\*    |         ❌         |    czasem     |     ✅      |
| Działa w sekundy, zero wywołań sieciowych podczas skanu     |         ✅         |         ✅         |       —       |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) i `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) pokrywają to dla swoich
frameworków.

**Analiza runtime** to osobna kategoria obok statycznego lintowania:

|                                                            | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ---------------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Czyta prawdziwe dane przebiegów dla werdyktów `TRUE-FLAKE` |        częściowo\*        |    częściowo (tag)    |          ✅           |
| Raport triażu flakiness z historii wykonania               |            ❌             |          ✅           |          ✅           |
| Integruje się ze statycznym wskaźnikiem wiarygodności      |            ❌             |          ❌           |          ✅           |

\*Playwright śledzi retry wewnętrznie, ale nie produkuje samodzielnego
raportu flakiness z etykietami werdyktów.

---

## 🤖 Czemu nie użyć po prostu AI code review?

Inny problem, inna warstwa. AI review może dostrzec podejrzaną zmianę
testu w diffie; nie dowodzi, że system weryfikacji jako całość jest
godny zaufania — i widzi tylko diff, który mu pokażesz.

|                                                   |  AI code review (Copilot i in.)   |            **Mjölnir**            |
| ------------------------------------------------- | :-------------------------------: | :-------------------------------: |
| Koszt na skan                                     | Tokeny (rośnie z rozmiarem diffа) | **Zero** (lokalny, zainstalowany) |
| Widzi całą suitę + wszystkie configi CI           | Tylko diff PR, który mu pokażesz  |   **Wszystko, za każdym razem**   |
| Deterministyczny (ten sam input → ten sam output) |     ❌ (niedeterministyczny)      |              **✅**               |
| Łapie wzorce śpiące miesiącami                    |   Tylko jeśli jest w kontekście   | **✅** (skanuje wszystkie pliki)  |
| Pamięta znaleziska między przebiegami             | ❌ (brak pamięci między sesjami)  |     **✅** (baseline + diff)      |
| Działa bez ludzkiego wyzwalacza                   |   Potrzebuje PR-a albo promptu    |    **✅** (hak CI, 3 sekundy)     |

**Używaj obu.** AI łapie niuans, intencję i wady projektowe, których
żaden regex nie znajdzie. Mjölnir łapie strukturalne wzorce, które AI
pomija, bo wyglądają „intencjonalnie" — committowany `.only`,
połknięty kod wyjścia, `continue-on-error` na jobie testowym. To nie
są bugi wymagające rozumowania; to fakty wymagające skanowania.

---

## 🤖 Integracja CI

Jedna komenda generuje workflow PR — domyślnie doradczy, nigdy
blokujący:

```bash
mjolnir ci install
```

Albo podepnij go natywnie pod GitHub Code Scanning przez SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Konfiguracja edytora i pipeline'u dla SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Pokrycie changed-scope

`--scope changed` przypisuje znaleziska liniom dodanym w twoim branchu
względem merge-base z `main`. Pokrywa pliki testowe (`*.spec.*`,
`*.test.*`) plus pliki workflow GitHub i konfiguracje Playwright w
diffie. Gdy merge-base nie da się rozwiązać — shallow clone, detached
HEAD, cel spoza git, inny domyślny branch — degraduje się uczciwie:
znaleziska wracają do atrybucji na cały plik, a raport mówi o tym.
Nadpisz bazową ref przez `--base <ref>`.

---

## Konfiguracja

Mjölnir jest zero-config. Opcjonalny `mjolnir.config.json` (lub
`.mjolnir.json`) w korzeniu repo dostraja severity, gating i scope —
nigdy nie zmienia semantyki detekcji.

| Key                 | Typ                                  | Działanie                                                                                                                                                              |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Dodatkowe globy ignorowania (podzbiór gitignore), na wierzchu wbudowanych domyślnych                                                                                   |
| `gate`              | `"advisory" \| "error" \| "warning"` | Które severity kończą się kodem niezerowym (domyślnie `error`; `advisory` nigdy nie blokuje)                                                                           |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Przerankowuje znaleziska reguły dla twojego repo                                                                                                                       |
| `ignore`            | `IgnoreEntry[]`                      | Wycisza znaleziska — **`reason` jest wymagany**; wpisy wygasają po 90 dniach (jawna data `expires`, albo czas ostatniej modyfikacji pliku konfiga dla wpisów bez niej) |
| `plugins`           | `string[]`                           | Zewnętrzne pakiety reguł (zob. [Model zaufania](#model-zaufania))                                                                                                      |

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

- **`.mjolnirignore`** — prosty plik w stylu gitignore dla wykluczeń
  ścieżek, ten sam dialekt co `exclude`. Użyj go na szum maszynowy; użyj
  `exclude`, gdy lista należy do kontroli wersji, obok reszty configa.
- **Override'y CLI** — `--strict` (dołącz reguły kwarantanny),
  `--width <cols>` i `--ascii` / `--no-ascii` (render terminala),
  `--tone blunt` (ostrejsze komunikaty), `--max-duration <sec>`
  (ograniczony skan częściowy).
- Wyciszanie reguł i cykl życia deprecacji:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

Wpisy `ignore` zasilają też samodzielną komendę `mjolnir suppressions`,
która wypisuje, co jest aktualnie wyciszone i kiedy wygasa każdy wpis.

---

## 📐 Kody wyjścia i kontrakty

Zamrożone — bezpieczna baza do budowania logiki CI:

| Kod wyjścia | Znaczenie                                                                       |
| ----------- | ------------------------------------------------------------------------------- |
| `0`         | Czysto — brak znalezisk na poziomie gate'a lub wyżej                            |
| `1`         | Znaleziska na poziomie gate'a lub wyżej                                         |
| `2`         | Skan częściowy (wyczerpany budżet czasu, nieczytelne pliki) — nigdy nie blokuje |
| `10`        | Błąd użycia (zły flag, brakujący cel)                                           |
| `20`        | Błąd wewnętrzny                                                                 |

Raport JSON/SARIF to `schemaVersion: 1`. ID reguł (`QA-<FAMILY>-NNN`)
są niezmienne po wydaniu i nigdy nie są używane ponownie.

---

## Model zaufania

- **Local-first** — zero wywołań sieciowych podczas skanowania. Nigdy.
  Zero telemetrii.
- **Żadnych fałszywych dowodów** — wolimy powiedzieć „nieznane" niż
  „zweryfikowane". Puste repo dostaje `score: null`, nigdy fałszywej
  setki.
- **Częściowa uczciwość** — jeśli analizę ucięto, wynik to mówi. Nigdy
  „complete", gdy to nieprawda.
- **Zapora FP** — detekcja działa na widoku kodu wolnym od komentarzy i
  stringów (reguły TypeScript używają AST kompilatora): wzorzec w
  komentarzu prozatorskim czy doc- przykładzie-stringu to dokumentacja,
  nie znalezisko.
- **Zmierzone, nie założone** — do tierów nagłówkowych trafiają tylko
  reguły ze stopą fałszywych pozytywów z prawdziwego kodu OSS (zob.
  [Ile z tego jest zmierzone](#ile-z-tego-jest-zmierzone)); stopka
  skanu i `mjolnir rules --unmeasured` powiedzą ci, które które.
- **Zaufanie do pluginów** — pluginy to pakiety npm deklarowane pod
  `"plugins"`. **Nie ma sandboxa**: kod pluginu działa z pełnymi
  uprawnieniami Node, ten sam model zaufania co pluginy ESLint czy
  Vitest. Prefiksy ID reguł core są zarezerwowane i odrzucane od
  pluginów przeciw spoofingowi.
- **Zewnętrzne reguły lokalne wobec workspace'u** (folderowe, zero
  sieci) — katalog `mjolnir-rules/` obok celu skanu ładuje własne
  reguły: pliki JSON deklarują wzorce regex (żaden kod nie jest
  wykonywany), moduły `.mjs`/`.js` eksportują `rules` (pełne zaufanie
  Node, jak pluginy). Zewnętrzne reguły niosą te same metadane zaufania
  co core; nie mogą nigdy wyjść w tierze core (core wymaga zmierzonej
  stopy FP z sidecara korpusu — deklarowane `tier: "core"` jest
  ściągane do `extended`), przestrzegają limitów tierów i są
  sprawdzane na dryft: `mjolnir rules --md --external` renderuje
  katalog z załadowanych plików (pochodzenie `external`), a generator
  macierzy przyjmuje `--external <root>`.

---

## 🏗️ Architektura

<details>
<summary>Rozwiń drzewo</summary>

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

- **Reguły to czyste funkcje** — `(SourceFileContext) → Finding[]`,
  bez I/O, bez globali. Nowy ekosystem = jeden adapter + jego reguły.
- **TypeScript/Playwright używa AST kompilatora** (ts-morph). Python,
  Java i C# działają na wspólnej warstwie regex z maskowaniem
  komentarzy i stringów.
- Warstwa AST tree-sitter WASM dla Javy i C# istnieje i jest
  następnym krokiem precyzji — nie jest jeszcze podpięta do
  synchronicznego pipeline'u skanu.

---

## 📚 Dokumentacja

| Dokument                                               | Co zawiera                                      |
| ------------------------------------------------------ | ----------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalizacja punktacji + ważenie dowodami       |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Zmierzone stopy fałszywych pozytywów + metodyka |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Stany reguł, wyciszanie, deprecacja             |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Wyjście SARIF + konfiguracja edytora/CI         |
| [docs/rules/](docs/rules/)                             | Generowany katalog per reguła                   |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Setup dev + workflow kontrybucji                |
| [CHANGELOG.md](CHANGELOG.md)                           | Historia wydań                                  |
| [SECURITY.md](SECURITY.md)                             | Zgłaszanie podatności                           |

---

## 📈 Status

**v0.5.x · otwarta beta.** Schemat JSON i kody wyjścia to zamrożone
kontrakty. TypeScript i Python mają najszersze zmierzone pokrycie; Java
i C# są nowsze — czytaj o nich przez
[tabelę tierów](#tiery-reguł-i-dojrzałość-językowa).

---

## 🤝 Kontrybucja

Nowe reguły to najłatwiejszy pierwszy wkład — jedna komenda wystawia
szkielet reguły plus jej fixture must-fire **i** must-not-fire
(wygenerowana reguła celowo wypada na fixture'ach, dopóki nie
zaimplementujesz prawdziwej detekcji — stub nie może się wydać):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Pełny setup dev, komendy stałego gate'a oraz prawa anti-creep /
zapory fixture'owej są w [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Przestań wydawać testy, którym nie możesz ufać.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Zbudowane przez [Sergeya Bara](https://www.linkedin.com/in/sergeybar/)

</div>
