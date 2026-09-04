<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Ваши тесты вам лгут. Мы это докажем.

**Verification Trust Engine для QA.** Mjölnir проверяет тест-сьюты и
CI-пайплайны, выдаёт показатель достойности и показывает точно, где
ломается доверие.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | Русский | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Достойны ли доверия ваши тесты?**

[Посмотрите в деле](#-посмотрите-в-деле) ·
[Быстрый старт](#-быстрый-старт) ·
[Что он проверяет](#-что-проверяет-mjölnir) ·
[Скоринг](#как-работает-скор) ·
[CI](#-интеграция-ci) · [Конфигурация](#конфигурация) ·
[Документация](#-документация)

</div>

---

## 🎬 Посмотрите в деле

<p align="center">
  <img src="assets/readme/demo.svg" alt="Полный --verbose-отчёт Mjölnir по демо-репозиторию: WORTHINESS 75/100 NEEDS WORK, разбивка диагностик по категориям, список FIX THIS FIRST и каждая находка с ID правила и номером строки — CI, Playwright, тест-гигиена и Python-правила" width="900" />
</p>

<sub>Полный вывод `npx mjolnir-qa ./examples/demo-repo --verbose`,
отрендеренный настоящим репортером — ничего не урезано. Перегенерируется
командой `npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
роняет CI, если артефакт разошёлся с тем, что печатает инструмент.</sub>

**Что только что произошло:**

1. Mjölnir нашёл Playwright-спеки, его конфигурацию, CI-workflow и
   Python-тестовый файл — четыре языка/формата за один проход.
2. Он нашёл улики, ослабляющие доверие к сьюту — `continue-on-error`
   в маскировке job, `|| true`, глотающий exit-код, жёсткие sleep'ы,
   хрупкий селектор, захардкоженные staging-URL, ожидание
   `networkidle`.
3. Каждую он превратил в конкретную находку с ID правила, местом и
   фиксом — и в единый скор, по которому можно гейтить PR.

### Одна находка вблизи

Запустите `mjolnir explain QA-CI-001` на первой находке выше — и
получите:

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

Вот единица ценности: не придирка к стилю, а место, где ваш CI
сообщает, что что-то прошло, хотя это не так.

---

## ⚡ Быстрый старт

Запустите на репозитории — получите полный отчёт и показатель
достойности:

```bash
npx mjolnir-qa@latest
```

**В CI продукт — одна команда.** Она сканирует только затронутое
веткой и завершается с ненулевым кодом при новых проблемах:

```bash
npx mjolnir-qa@latest --scope changed
```

Встройте это в PR-check — `mjolnir ci install` пишет workflow — и
готово. Всё остальное опционально.

| Команда                             | Что делает                                           |
| ----------------------------------- | ---------------------------------------------------- |
| `mjolnir`                           | Скан всего репо + показатель достойности             |
| `mjolnir --scope changed`           | Только то, что принесла ваша ветка — CI-режим        |
| `mjolnir ci install`                | Генерирует рекомендательный PR-workflow              |
| `mjolnir explain QA-CI-001`         | Что / почему / фикс + измеренный FP-рейт для правила |
| `mjolnir rules --unmeasured`        | Правила, работающие по допущению, а не по измерению  |
| `mjolnir --json` / `--format sarif` | Машинночитаемо / GitHub Code Scanning                |
| `mjolnir --strict`                  | Также правила tier-а quarantine (выше риск FP)       |

<details>
<summary><strong>Когда что-то флакует</strong></summary>

| Команда                             | Что делает                                                    |
| ----------------------------------- | ------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Реальные данные прогонов → вердикты `TRUE-FLAKE`, `FLAKY.md`  |
| `mjolnir triage ./test-results/`    | Предложение карантина из истории выполнения                   |
| `mjolnir pw-report ./test-results/` | Сводка прогона Playwright — ретраи / флейки / самые медленные |
| `mjolnir doctor:playwright`         | Глубокий скан только Playwright + Selector Health Score       |

</details>

<details>
<summary><strong>По случаю / отчёты</strong></summary>

| Команда                         | Что делает                                            |
| ------------------------------- | ----------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Безопасные автофиксы с доказательством                |
| `mjolnir baseline` / `diff`     | Снимок находок, затем отчёт только новых/ухудшившихся |
| `mjolnir impact --since <ref>`  | Что изменилось с момента раннего коммита              |
| `mjolnir debt`                  | Реестр тестового долга с моделью стоимости            |
| `mjolnir handover`              | Карта онбординга сьюта для нового QA                  |
| `mjolnir stats`                 | Локальные накопленные счётчики увиденных фиксов       |
| `mjolnir badge`                 | JSON shields.io-эндпоинта + сниппет                   |
| `mjolnir rules --md`            | Полный каталог правил (JSON или Markdown)             |
| `mjolnir doctor`                | Самоаудит собственной базы правил Mjölnir             |
| `mjolnir create-rule <ID>`      | Скаффолд нового правила + фикстур                     |
| `mjolnir --format mermaid`      | Диаграмма тестовой архитектуры для комментария к PR   |

</details>

Установите глобально вместо `npx`, если так удобнее:
`npm i -g mjolnir-qa`. Требуется Node.js ≥ 22.18. Работает на Windows,
macOS и Linux.

---

## 👥 Для кого это?

- **QA / SDET**, владеющие e2e- или интеграционной сьютой и которым
  нужны доказательства, что сьют действительно заслуживает зелёную
  галочку, которую он выдаёт.
- **Платформенные / DevEx-команды**, отвечающие за целостность CI и
  release-gates — те, для кого `continue-on-error` никогда не должен
  молча перекрашивать красный пайплайн в зелёный.
- **OSS-мейнтейнеры**, которым нужен дешёвый, всегда включённый
  верификационный гейт, работающий локально и в CI без сетевых
  вызовов.

---

## 🔨 Что проверяет Mjölnir

|     |                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Показатель достойности** — одно число, прозрачная таблица вычетов, никакого чёрного ящика                                         |
| 🎭  | **Selector Health Score** — оценивает ваши Playwright-локаторы, а не только pass-rate                                               |
| 🔬  | **Runtime-криминалистика** — читает реальные данные прогонов Playwright/JUnit и ловит `TRUE-FLAKE`, а не только статические догадки |
| 🚨  | **Правила целостности CI** — ловит `continue-on-error`, `\|\| true` и другие трюки с ложным зелёным                                 |
| 🐍  | **Все четыре Playwright-биндинга** — TypeScript, Python, Java, C#/.NET — плюс pytest, JUnit/TestNG и CI-workflows                   |
| 🔒  | **Local-first** — ноль сетевых вызовов при сканировании, ноль телеметрии, работа за секунды                                         |

### Правила

Каждое правило поставляется с must-fire- **и** must-not-fire-фикстурами.
Правило, срабатывающее на собственной негативной фикстуре, не может
выйти — это фаервол ложных срабатываний.

<details>
<summary><strong>Тест-гигиена</strong></summary>

| ID          | Правило                                                | Severity |
| ----------- | ------------------------------------------------------ | -------- |
| QA-TEST-001 | Закоммичен сфокусированный тест (`.only`, `fit`)       | error    |
| QA-TEST-002 | Пропущен тест без обоснования                          | error    |
| QA-TEST-002 | Пропущен тест с учтённым обоснованием                  | warning  |
| QA-TEST-003 | Тест без ассертов                                      | error    |
| QA-TEST-004 | Жёсткий sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Злоупотребление ретраями, скрывающее флакость          | warning  |
| QA-TEST-010 | Пустое тело теста                                      | error    |

</details>

<details>
<summary><strong>Качество тестов</strong></summary>

| ID           | Правило                       | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | Верификация только моками     | info     |
| QA-TQUAL-002 | Тавтологический ассерт        | error    |
| QA-TQUAL-009 | Ассерт не-awaitнутого promise | error    |
| QA-TQUAL-011 | Закомментированные тесты      | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Правило                                     | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-PW-002 | Ассерт локатора без await                   | error    |
| QA-PW-003 | `page.pause()` / `test.only()` в коммите    | error    |
| QA-PW-004 | Хрупкие CSS/XPath-селекторы                 | warning  |
| QA-PW-005 | Бизнес-логика внутри `page.evaluate()`      | info     |
| QA-PW-114 | Легаси element handles (`page.$`)           | info     |
| QA-PW-118 | Ожидания `networkidle` (флаковые by design) | info     |
| QA-PW-123 | Захардкоженные URL окружений                | warning  |

</details>

<details>
<summary><strong>Целостность CI</strong></summary>

| ID        | Правило                                                           | Severity |
| --------- | ----------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` маскирует падения                             | error    |
| QA-CI-002 | `\|\| true` глотает exit-коды                                     | error    |
| QA-CI-005 | Отчёт потребляется, но никогда не генерируется                    | error    |
| QA-CI-007 | Retry-обёртки вокруг тестов                                       | warning  |
| QA-CI-008 | Всегда успешный шаг маскирует падения                             | error    |
| QA-CI-009 | Exit-код теста не прокидывается (`\|` без pipefail, цепочки `;`)  | error    |
| QA-CI-010 | Тесты пропускаются там, где должны блокировать (skip-on-PR-гарды) | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Правило                                       | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PY-002 | Пропущенный тест (`skip`, нестрогий `xfail`)  | warning  |
| QA-PY-003 | Тестовая функция без ассертов                 | error    |
| QA-PY-005 | `time.sleep()` в тестах                       | warning  |
| QA-PY-006 | Пустое тело теста (`pass`)                    | info     |
| QA-PY-010 | Зависимость от случайности/времени без freeze | info     |
| QA-PY-012 | Тавтологический ассерт                        | error    |

Всего 20 Python-правил (QA-PY-001…012 гигиена pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Правило                                     | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-JV-101 | Отключённый тест (`@Disabled`)              | warning  |
| QA-JV-102 | Жёсткий sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Тестовый метод без ассертов                 | error    |
| QA-JV-105 | Жёсткий sleep Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Хрупкий селектор вместо role-локатора       | warning  |
| QA-JV-108 | Захардкоженный URL окружения в тесте        | info     |
| QA-JV-111 | Бланкетный мок `page.route("**")`           | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Правило                                        | Severity |
| --------- | ---------------------------------------------- | -------- |
| QA-CS-101 | Пропущенный тест (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Жёсткий sleep (`Thread.Sleep` / `Task.Delay`)  | warning  |
| QA-CS-103 | Тестовый метод без ассертов                    | error    |
| QA-CS-105 | Жёсткий sleep `WaitForTimeoutAsync()`          | warning  |
| QA-CS-106 | Хрупкий селектор вместо role-локатора          | warning  |
| QA-CS-108 | Захардкоженный URL окружения в тесте           | info     |
| QA-CS-111 | Бланкетный мок `page.RouteAsync("**")`         | info     |

</details>

> Полный живой каталог — каждое правило с tier, confidence, риском
> ложных срабатываний и доступностью автофикса — генерируется из
> реестра:
>
> ```bash
> mjolnir rules --md
> ```
>
> Страницы по правилам лежат в [`docs/rules/`](docs/rules/).

### Сколько из этого измерено

**74 из 99 правил несут ложную положительную частоту, измеренную на
реальном OSS-коде** (по ≥ 10 вручную классифицированных находок на
правило; см. [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Остальные 19
выходят на оценке автора. Футер каждого скана говорит, сколько из
_сработавших_ правил измерены; `mjolnir rules --unmeasured` перечисляет
неизмеренные; страница `mjolnir explain` каждого правила указывает её
статус. Мы публикуем частоту, даже когда она уродлива — QA-CS-103
аудируется на 95 % и за это отправлен в карантин. Увеличивать эти 78 —
постоянная работа проекта.

### Тиры правил и зрелость языков

Каждое правило — `core`, `extended` или `quarantine`, назначенный по
его **измеренной** частоте ложных срабатываний:

| Tier         | Значение                               | Скан по умолчанию | `--strict` |
| ------------ | -------------------------------------- | :---------------: | :--------: |
| `core`       | ≤ 10 % измеренных FP                   |        ✅         |     ✅     |
| `extended`   | ≤ 30 % измеренных FP                   |        ✅         |     ✅     |
| `quarantine` | выше 30 % или ещё не измерено (n < 10) |        ❌         |     ✅     |

| Язык            | Адаптер         | Охват сегодня                                                  |
| --------------- | --------------- | -------------------------------------------------------------- |
| TypeScript / JS | AST компилятора | самый широкий, самый измеренный — в основном `core`/`extended` |
| Python / pytest | Regex-слой      | широкий, проверен корпусом — в основном `core`/`extended`      |
| Java            | Regex-слой      | новее — в основном `extended`/`quarantine`                     |
| C# / .NET       | Regex-слой      | новее — в основном `extended`/`quarantine`                     |

У TypeScript и Python самый широкий измеренный охват. Java и C#
вышли, задокументированы и остаются за пределами головного числа, пока
реальный сьют-потребитель (не собственные тесты биндинг-библиотеки) не
будет проаудирован.

---

## Как работает скор

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Терминальный вывод Mjölnir — WORTHINESS 75/100 NEEDS WORK, разбивка диагностик по категориям и список FIX THIS FIRST" width="820" />
</p>

<sub>Перегенерируется командой `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
роняет CI, если артефакт разошёлся с тем, что печатает репортер.</sub>

Скор прозрачен: **error −8, warning −3, info −1**, затем нормировка на
экспозицию сьюта (вычеты на объявление теста). Вычеты, взвешенные по
уликам, означают, что слабые сигналы стоят дешевле. Терминал показывает
те же со скидкой числа, что использует скор — никакого чёрного ящика.
Полная методика: [docs/SCORING.md](docs/SCORING.md).

**Вердикты**

| Score   | Вердикт          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Уровни улик** — каждая находка несёт один; он задаёт вес находки в
скоре:

| Уровень | Значение                 | Влияние на скор    | Пример                                                           |
| ------- | ------------------------ | ------------------ | ---------------------------------------------------------------- |
| E2      | Детерминированный дефект | Полный вычет       | `.only` в коммите — структурно доказуемо                         |
| E1      | Эвристический паттерн    | Половинный вычет   | Найденный regex'ом `sleep()` — сильный сигнал, не доказательство |
| E0      | Наблюдение               | Ноль (только info) | Репортится, но никогда не гейтит CI и не вычитает                |

Большинство правил — **E1**. Слоган «we prove it» отсылает к этой
системе: находки E2 — структурное доказательство; находки E1 —
корректно позиционированные предупреждения, не формальные доказательства.

Пустой репозиторий получает `null`, никогда фейковую сотню — см.
[Модель доверия](#модель-доверия).

---

## 🎭 Selector Health Score

Главная метрика для Playwright-сьютов — насколько устойчивы ваши
локаторы:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Локаторы на основе ролей получают полный балл. Цепочки CSS-классов и
XPath топят скор — они ломаются на любом DOM-рефакторе, не сообщая,
какое поведение регрессировало.

---

## 🔬 Runtime-улики

Статическое детектирование флакости — гадание. Mjölnir читает **реальные
данные выполнения** — JSON-репорты Playwright и XML JUnit от любого
раннера:

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

Тест, проходящий только с попытки ≥ 2, — не проходящий тест; это
везучий тест. Он помечается `TRUE-FLAKE` независимо от финальной
зелёной галочки.

---

## ⚡ Mjölnir — не ещё один линтер

Линтеры говорят, соответствует ли код правилам. Mjölnir говорит,
можно ли доверять вашей верификации.

|                                                               | ESLint / SonarQube | Coverage-инструменты | Ручное ревью | **Mjölnir** |
| ------------------------------------------------------------- | :----------------: | :------------------: | :----------: | :---------: |
| Целостность CI-workflow (`continue-on-error`, `\|\| true`)    |         ❌         |          ❌          |    редко     |     ✅      |
| Кросс-язык (TS, Python, Java, C#) из одного инструмента       |         ❌         |          ❌          |      ❌      |     ✅      |
| Оценивает устойчивость Playwright-локаторов (Selector Health) |         ❌         |          ❌          |    редко     |     ✅      |
| Помечает тесты без настоящих ассертов                         |   ✅ (плагин)\*    |          ❌          |    иногда    |     ✅      |
| Ловит жёсткие sleep'ы (`waitForTimeout`, `time.sleep`)        |   ✅ (плагин)\*    |          ❌          |    иногда    |     ✅      |
| Работает за секунды, ноль сетевых вызовов при скане           |         ✅         |          ✅          |      —       |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) и `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) покрывают это для своих
фреймворков.

**Runtime-анализ** — отдельная категория рядом со статическим линтингом:

|                                                            | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ---------------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Читает реальные данные прогонов для вердиктов `TRUE-FLAKE` |        частично\*         |    частично (тег)     |          ✅           |
| Отчёт флей-триажа из истории выполнения                    |            ❌             |          ✅           |          ✅           |
| Интегрируется со статическим скором достойности            |            ❌             |          ❌           |          ✅           |

\*Playwright отслеживает ретраи внутри, но не выдаёт самостоятельного
отчёта о флакости с вердиктными метками.

---

## 🤖 Почему бы не использовать просто AI-код-ревью?

Другая проблема, другой слой. AI-ревью может заметить подозрительное
изменение теста в диффе; оно не доказывает, что система верификации в
целом заслуживает доверия — и видит только показанный ему дифф.

|                                             |   AI-код-ревью (Copilot и пр.)   |           **Mjölnir**           |
| ------------------------------------------- | :------------------------------: | :-----------------------------: |
| Цена за скан                                | Токены (растут с размером диффа) | **Ноль** (локально, установлен) |
| Видит весь сьют + все CI-конфиги            |  Только PR-дифф, показанный ему  |       **Всё, каждый раз**       |
| Детерминирован (тот же вход → тот же выход) |      ❌ (недетерминирован)       |             **✅**              |
| Ловит паттерны, дремлющие месяцами          |     Только если в контексте      |  **✅** (сканирует все файлы)   |
| Помнит находки между запусками              |  ❌ (нет памяти между сессиями)  |    **✅** (baseline + diff)     |
| Запускается без человека                    |       Нужен PR или промпт        |   **✅** (CI-хук, 3 секунды)    |

**Используйте оба.** AI ловит нюанс, замысел и дизайнерские изъяны,
которые не найдёт ни один regex. Mjölnir ловит структурные паттерны,
которые AI упускает, потому что те выглядят «намеренными» —
закоммиченный `.only`, проглоченный exit-код, `continue-on-error` на
тестовом job. Это не баги, требующие рассуждений; это факты, требующие
сканирования.

---

## 🤖 Интеграция CI

Одна команда генерирует PR-workflow — по умолчанию рекомендательный,
никогда блокирующий:

```bash
mjolnir ci install
```

Или подключите нативно к GitHub Code Scanning через SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Настройка редактора и пайплайна для SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Охват по изменённому scope

`--scope changed` атрибутирует находки строкам, добавленным в вашей
ветке относительно merge-base с `main`. Он покрывает тестовые файлы
(`*.spec.*`, `*.test.*`), плюс workflow-файлы GitHub и конфигурации
Playwright в диффе. Когда merge-base не разрешается — shallow clone,
detached HEAD, не-git-цель, другой дефолтный ветка — он честно
деградирует: находки возвращаются к атрибуции на весь файл, и отчёт об
этом говорит. Переопределите базовую ref через `--base <ref>`.

---

## Конфигурация

Mjölnir — zero-config. Опциональный `mjolnir.config.json` (или
`.mjolnir.json`) в корне репо подстраивает severity, гейтинг и scope —
он никогда не меняет семантику детекции.

| Key                 | Тип                                  | Действие                                                                                                                                                             |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Дополнительные ignore-глобы (подмножество gitignore), поверх встроенных дефолтов                                                                                     |
| `gate`              | `"advisory" \| "error" \| "warning"` | Какие severity завершают процесс ненулевым кодом (по умолчанию `error`; `advisory` никогда не блокирует)                                                             |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Переранжирует находки правила для вашего репо                                                                                                                        |
| `ignore`            | `IgnoreEntry[]`                      | Подавляет находки — **`reason` обязателен**; записи истекают через 90 дней (явная дата `expires`, либо время последнего изменения файла конфига для записей без неё) |
| `plugins`           | `string[]`                           | Сторонние пакеты правил (см. [Модель доверия](#модель-доверия))                                                                                                      |

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

- **`.mjolnirignore`** — простой файл в стиле gitignore для исключений
  путей, тот же диалект, что `exclude`. Используйте его для
  машинного шума; используйте `exclude`, когда список должен жить в
  версионном контроле вместе с остальной конфигурацией.
- **CLI-переопределения** — `--strict` (включить правила карантина),
  `--width <cols>` и `--ascii` / `--no-ascii` (терминальный рендер),
  `--tone blunt` (более резкие сообщения), `--max-duration <sec>`
  (ограниченный частичный скан).
- Подавление правил и жизненный цикл депрекации:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

Записи `ignore` также питают отдельную команду `mjolnir suppressions`,
которая перечисляет текущие подавления и время истечения каждой записи.

---

## 📐 Коды выхода и контракты

Заморожены — безопасно строить на них CI-логику:

| Код выхода | Значение                                                                          |
| ---------- | --------------------------------------------------------------------------------- |
| `0`        | Чисто — нет находок на уровне гейта или выше                                      |
| `1`        | Находки на уровне гейта или выше                                                  |
| `2`        | Частичный скан (исчерпан бюджет времени, нечитаемые файлы) — никогда не блокирует |
| `10`       | Ошибка использования (плохой флаг, отсутствие цели)                               |
| `20`       | Внутренняя ошибка                                                                 |

JSON/SARIF-отчёт — `schemaVersion: 1`. ID правил
(`QA-<FAMILY>-NNN`) неизменны после выхода и никогда не используются
повторно.

---

## Модель доверия

- **Local-first** — ноль сетевых вызовов во время сканирования. Никогда.
  Ноль телеметрии.
- **Никаких ложных доказательств** — мы скорее скажем «неизвестно», чем
  «проверено». Пустое репо получает `score: null`, никогда фейковую
  сотню.
- **Частичная честность** — если анализ оборван, вывод об этом говорит.
  Никогда «complete», когда это не так.
- **FP-фаервол** — детекция работает на очищенном от комментариев и
  строк представлении кода (правила TypeScript используют AST
  компилятора): паттерн внутри прозаического комментария или
  док-примера-строки — это документация, а не находка.
- **Измерено, а не заявлено** — в головные тиры выходят только правила
  с частотой ложных срабатываний из реального OSS-кода (см.
  [Сколько из этого измерено](#сколько-из-этого-измерено)); футер скана
  и `mjolnir rules --unmeasured` скажут, какие какие.
- **Доверие к плагинам** — плагины — это npm-пакеты, объявленные в
  `"plugins"`. **Песочницы нет**: код плагина работает с полными
  привилегиями Node, та же модель доверия, что у плагинов ESLint или
  Vitest. Префиксы ID основных правил зарезервированы и отвергаются от
  плагинов против подмены.
- **Workspace-локальные внешние правила** (фолдерные, ноль сети) —
  каталог `mjolnir-rules/` рядом с целью скана загружает собственные
  правила: JSON-файлы декларируют regex-паттерны (код не исполняется),
  модули `.mjs`/`.js` экспортируют `rules` (полное доверие Node, как у
  плагинов). Внешние правила несут те же trust-метаданные, что и core;
  они никогда не могут выйти в core-тире (core требует измеренной
  FP-частоты из corpus-сайдкара — заявленный `tier: "core"` зажимается
  до `extended`), соблюдают тировые лимиты и проверяются на дрейф:
  `mjolnir rules --md --external` рендерит каталог из загруженных
  файлов (происхождение `external`), а генератор матрицы принимает
  `--external <root>`.

---

## 🏗️ Архитектура

<details>
<summary>Развернуть дерево</summary>

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

- **Правила — чистые функции** — `(SourceFileContext) → Finding[]`, без
  I/O, без глобалов. Новый экосистем = один адаптер + его правила.
- **TypeScript/Playwright использует AST компилятора** (ts-morph).
  Python, Java и C# работают на общем regex-слое с маскированием
  комментариев и строк.
- Слой tree-sitter WASM AST для Java и C# существует и является
  следующим шагом точности — он ещё не подключён к синхронному
  скан-пайплайну.

---

## 📚 Документация

| Документ                                               | Что внутри                                        |
| ------------------------------------------------------ | ------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Нормировка скора + взвешивание по уликам          |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Измеренные частоты ложных срабатываний + методика |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Состояния правил, подавление, депрекация          |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF-вывод + настройка редактора/CI              |
| [docs/rules/](docs/rules/)                             | Сгенерированный каталог по правилам               |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Dev-сетап + процесс контрибуции                   |
| [CHANGELOG.md](CHANGELOG.md)                           | История релизов                                   |
| [SECURITY.md](SECURITY.md)                             | Сообщение об уязвимостях                          |

---

## 📈 Статус

**v0.5.x · открытая бета.** JSON-схема и коды выхода — замороженные
контракты. TypeScript и Python имеют самый широкий измеренный охват;
Java и C# новее — читайте о них в
[таблице тиров](#тиры-правил-и-зрелость-языков).

---

## 🤝 Участие в проекте

Новые правила — самый простой первый вклад: одна команда скаффолдит
правило и его must-fire- **и** must-not-fire-фикстуры (сгенерированное
правление намеренно падает на фикстурах, пока вы не реализуете реальную
детекцию — стаб не может выйти):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Полный dev-сетап, команды постоянного гейта и законы anti-creep /
фикстурного фаервола — в [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Перестаньте выкатывать тесты, которым нельзя доверять.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Создано [Сергеем Баром](https://www.linkedin.com/in/sergeybar/)

</div>
