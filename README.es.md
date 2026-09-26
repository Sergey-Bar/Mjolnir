<div align="center">

<img src="assets/readme/hero.svg" alt="Mjölnir. Los tests te dicen qué pasó. Mjölnir te dice en qué puedes confiar." width="100%" />

<br />

Mjölnir encuentra tests que no pueden fallar y pipelines que no pueden ponerse en rojo,<br />
y luego puntúa hasta dónde se puede confiar en el resultado, con la evidencia de cada punto.

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

[Míralo en acción](#míralo-en-acción) · [Inicio rápido](#inicio-rápido) · [Qué encuentra](#qué-encuentra-mjölnir) · [Puntuación](#la-puntuación-de-fiabilidad) · [Evidencia](#el-modelo-de-evidencia) · [Forense](#forense-de-ejecución) · [CI](#integridad-de-ci) · [Agentes](#agentes-de-ia) · [Seguridad](#confianza-y-seguridad) · [Límites](#lo-que-mjölnir-no-puede-decirte) · [Docs](#documentación)

<details>
<summary>Léelo en otro idioma: 22 traducciones</summary>

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | Español | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-26.

<!-- Source hash: `de04dfb1677b` -->

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

## Un check verde es una afirmación, no una prueba

Un check verde significa que el pipeline no falló. No significa que los tests se ejecutaran, ni que hubieran podido fallar. Todos estos casos salen en verde:

- un `.only` en un commit que ejecutó 3 tests en lugar de 900
- `continue-on-error: true` en el job que debía bloquear
- `|| true` después del comando de tests
- un test que no verifica nada, o que tiene el cuerpo vacío
- un wrapper de reintentos que convierte un fallo real en un pase con suerte
- un informe que el workflow sube pero que nunca se generó
- un sleep fijo que sostiene una condición de carrera

Ninguno pone el pipeline en rojo, y todos parecen deliberados en la revisión. Por eso sobreviven. Aquí está Mjölnir leyendo uno real:

<p align="center">
  <img src="assets/readme/scan.svg" alt="El workflow de CI del repositorio de demostración, leído línea a línea. Mjölnir marca cada hallazgo en la línea que reportó, con su regla, qué está mal, su nivel de evidencia y su tasa de falsos positivos medida." width="800" />
</p>

<sub>Cada hallazgo que el escaneo de demostración reportó para este workflow, en la línea reportada. Generado con `npm run docs:readme-brand` a partir de [`demo-report.json`](assets/readme/demo-report.json) y bloqueado contra desviaciones en CI.</sub>

**Modo estricto.** Las detecciones más agresivas — `.only`, `continue-on-error`, tests vacíos, abuso de reintentos — viven en la cuarentena. Solo se ejecutan con `--strict` y están limitadas a severidad `info`: señalan, pero nunca bloquean. El escaneo por defecto (`npx mjolnir-qa@3.0.0` sin `--strict`) solo cubre reglas core y extended. Añade `--strict` cuando quieras la capa de asesoramiento también.

Mjölnir lee la suite, los workflows de CI y, si lo tienes, el informe de una ejecución real. No ejecuta tus tests, no instala tus dependencias ni ejecuta el código que escanea. Y cuando no tiene evidencia, lo dice en lugar de inventar confianza:

| Situación                                                        | Qué reporta Mjölnir                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| No se encontraron declaraciones de tests                         | Puntuación `null`, mostrada como **UNKNOWN**. Nunca un 100 inventado. |
| Sin baseline ni revisión comparable                              | **UNKNOWN**, con el motivo indicado. Nunca un 0 supuesto.             |
| Escaneo interrumpido (presupuesto de tiempo, archivos ilegibles) | **PARTIAL**, salida `2`. Nunca presentado como limpio.                |

<p align="center">
  <img src="assets/readme/how-it-works.svg" alt="Cómo funciona Mjölnir. Lee la suite de tests y el pipeline de CI de forma estática, y el informe de una ejecución real cuando lo hay. Pondera cada hallazgo por su nivel de evidencia y su nivel de confianza, donde solo una ejecución real puede alcanzar L3 a L5, y produce hallazgos, una puntuación de fiabilidad y un gate de CI con códigos de salida congelados. En el bucle del agente, la IA escribe la corrección y Mjölnir vuelve a escanear para demostrarla." width="880" />
</p>

<sub>Compuesto para esta página y mostrado a 1:1. Generado con `npm run docs:readme-brand` y bloqueado contra desviaciones en CI; la puntuación, los recuentos y el ID de regla vienen de [`script.demo.json`](assets/video/script.demo.json), [`demo-report.json`](assets/readme/demo-report.json) y el registro de reglas, nunca escritos a mano. La misma imagen como póster: [`architecture.svg`](assets/readme/architecture.svg).</sub>

<br />

## Míralo en acción

Un escaneo real de [`examples/demo-repo`](examples/demo-repo), una pequeña suite de Playwright con un workflow de CI. Aquí es adonde fueron sus puntos:

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="El desglose de deducciones de Mjölnir: WORTHINESS 80/100 WORTHY, la puntuación por categoría, el cuadro de deducciones por severidad y una lista FIX THIS FIRST" width="520" />
</p>

<sub>Generado con `npm run docs:hero` a partir de un escaneo real y bloqueado contra desviaciones en CI. El informe `--verbose` completo del mismo escaneo es [`demo.svg`](assets/readme/demo.svg) (`npm run docs:demo`).</sub>

<details>
<summary><strong>Míralo</strong>: un escaneo, la corrección que imprime y el reescaneo que la demuestra</summary>

<br />

<p align="center">
  <a href="assets/video/mjolnir-demo.mp4">
    <img src="assets/video/mjolnir-demo-poster.png" alt="Un fotograma de la grabación de demostración: npx mjolnir-qa@3.0.0 escaneando el repositorio de demostración en una ventana de terminal" width="900" />
  </a>
</p>

<sub>Renderizado fotograma a fotograma a partir de un escaneo real con `npm run docs:video`; nunca grabado de pantalla. Selecciona el fotograma para abrir [`mjolnir-demo.mp4`](assets/video/mjolnir-demo.mp4).</sub>

</details>

### Un hallazgo, de cerca

Cada hallazgo responde cuatro preguntas: dónde está, qué tan seguro está Mjölnir, con qué frecuencia se equivoca la regla y cómo corregirlo.

<p align="center">
  <img src="assets/readme/finding-anatomy.svg" alt="El primer hallazgo del escaneo de demostración, exactamente como lo imprime el terminal, con sus cuatro partes marcadas: dónde, qué tan seguro, con qué frecuencia se equivoca la regla, y la corrección." width="100%" />
</p>

`mjolnir explain QA-CI-001` imprime el historial de confianza completo de una regla, incluida su tasa de falsos positivos medida y el nivel que esa tasa le otorgó:

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

Esa es la unidad de valor: un lugar donde CI reporta un pase que no se ganó.

<br />

## Inicio rápido

```bash
npx mjolnir-qa@3.0.0
```

Escanea el directorio actual e imprime el Trust Report: qué encontró, hasta dónde puedes confiar en ello, por qué y qué hacer a continuación. Sale con `0` cuando no se encontró nada en el gate o por encima.

En CI, escanea solo lo que introdujo la rama, para que una suite heredada no ahogue tu primer pull request:

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

`mjolnir ci install` lo escribe como un workflow de GitHub Actions, usando la [action](https://github.com/Sergey-Bar/Mjolnir#readme) fijada a la etiqueta mayor `v3` (o `npx` a secas con `--no-action`). Se mantiene consultivo hasta que decidas que debe bloquear.

| Comando                                       | Qué hace                                                             |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `mjolnir`                                     | Trust Report: veredicto, confianza, siguiente acción                 |
| `mjolnir --scope changed`                     | Solo lo que introdujo tu rama (la forma para CI)                     |
| `mjolnir ci install`                          | Genera el workflow consultivo de PR (basado en la action)            |
| `mjolnir business-case`                       | ROI estimate: projected savings per finding                          |
| `mjolnir release-report`                      | Release readiness: GO, CONDITIONAL GO, or NO-GO                      |
| `mjolnir release-trust`                       | 12-dimension release assurance verdict                               |
| `mjolnir report`                              | Generate a Playwright-compatible report                              |
| `mjolnir trend`                               | Record, show, or diff local quality snapshots                        |
| `mjolnir policy`                              | Initialize, validate, or check policy gates                          |
| `mjolnir quarantine`                          | Review deterministic proposals (prototype)                           |
| `mjolnir analyze --cross-file`                | Bounded cross-file analysis                                          |
| `mjolnir ci-adapter github .`                 | Generate CI templates for supported providers                        |
| `mjolnir dashboard`                           | Generate a self-contained quality dashboard                          |
| `mjolnir exec-report`                         | Executive KPIs and recommendations (advisory)                        |
| `mjolnir enterprise`                          | Self-hosted templates (prototype)                                    |
| `mjolnir maturity`                            | Assess maturity or display maturity levels                           |
| `mjolnir mutation tests/mutation-report.json` | Analyze mutation reports; never promotes trust                       |
| `mjolnir mcp`                                 | Read-only MCP tools over stdio                                       |
| `mjolnir explain QA-CI-001`                   | Qué, por qué y cómo corregir, más la tasa de FP medida               |
| `mjolnir why src/a.spec.ts:42`                | Por qué se marcó exactamente esta línea. Nunca bloquea.              |
| `mjolnir forensics ./test-results/`           | Evidencia de ejecución de una ejecución real                         |
| `mjolnir trust-report`                        | Trust Artifact autocontenido (md + json)                             |
| `mjolnir handoff`                             | Plan de remediación para un agente de código                         |
| `mjolnir --json` / `--format sarif`           | Salida legible por máquina, GitHub Code Scanning                     |
| `mjolnir --format codequality`                | Informe de GitLab Code Quality (artefacto del widget de MR)          |
| `mjolnir --strict`                            | Ejecuta también las reglas del nivel quarantine (mayor riesgo de FP) |

<details>
<summary><strong>Todos los demás comandos</strong>: triaje de flakes, informes, gobernanza</summary>

<br />

| Comando                             | Qué hace                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `mjolnir --classic`                 | El banner de puntuación anterior al Trust Report                                    |
| `mjolnir explain verdict`           | Por qué el veredicto del escaneo guardado es el que es                              |
| `mjolnir triage ./test-results/`    | Triaje guiado. Cada fila termina en una siguiente acción.                           |
| `mjolnir pw-report ./test-results/` | Resumen de ejecución de Playwright: reintentos, flakes, los más lentos              |
| `mjolnir doctor:playwright`         | Escaneo profundo solo de Playwright más Selector Health Score                       |
| `mjolnir fix --dry-run` / `fix`     | Correcciones automáticas seguras, cada una reescaneada para demostrar que se aplicó |
| `mjolnir baseline` / `diff`         | Guarda una instantánea de los hallazgos y reporta solo los nuevos o peores          |
| `mjolnir impact --since <ref>`      | Qué introdujo y resolvió un commit                                                  |
| `mjolnir summary`                   | Anotaciones de CI y un resumen del step a partir de un informe                      |
| `mjolnir pr-comment`                | Un comentario de PR acotado, en Markdown                                            |
| `mjolnir debt`                      | Registro de deuda de tests con un modelo de costes                                  |
| `mjolnir handover`                  | Mapa de incorporación de la suite para un nuevo ingeniero de QA                     |
| `mjolnir init`                      | Detecta frameworks e imprime una lista de configuración                             |
| `mjolnir suppressions`              | Lista los hallazgos suprimidos, para gobernanza                                     |
| `mjolnir rules --unmeasured`        | Las reglas que funcionan con suposiciones, no con mediciones                        |
| `mjolnir rules --md`                | Catálogo completo de reglas (JSON o Markdown)                                       |
| `mjolnir doctor`                    | Autoauditoría de la base de reglas de Mjölnir                                       |
| `mjolnir create-rule <ID>`          | Crea el esqueleto de una regla nueva y sus fixtures                                 |
| `mjolnir stats`                     | Contadores locales históricos de las correcciones vistas                            |
| `mjolnir badge`                     | JSON de endpoint de shields.io y fragmento                                          |
| `mjolnir --cache`                   | Reescaneos incrementales mediante una caché local de veredictos                     |
| `mjolnir --format mermaid`          | Diagrama de arquitectura de tests para un comentario de PR                          |

`mjolnir help <command>` imprime el uso, ejemplos y el siguiente paso de cualquiera de ellos.

</details>

Requiere **Node.js ≥ 22.18** en Windows, macOS o Linux. ¿Prefieres una instalación global? `npm i -g mjolnir-qa`. El mínimo viene de la cadena de compilación (tsdown apunta a él y el pipeline de publicación hace pruebas de humo contra él); las dependencias de ejecución no necesitan más.

<br />

## Qué encuentra Mjölnir

<p align="center">
  <img src="assets/readme/stack.svg" alt="Funciona con tu stack: los lenguajes, frameworks de tests y sistemas de CI que cubren sus reglas, según el registro de reglas." width="100%" />
</p>

**79 reglas** en cuatro familias (higiene de tests, calidad de tests, Playwright e integridad de CI) para TypeScript y JavaScript, Python, Java, C# y YAML de GitHub Actions. Cubren Playwright en sus cuatro bindings, además de pytest, JUnit, TestNG, NUnit, xUnit, MSTest, Jest, Vitest y Mocha, con cobertura inicial para Cypress y Selenium. Nueve de ellas, para mostrar la forma:

| ID           | Regla                                                                   | Severidad | Nivel      |
| ------------ | ----------------------------------------------------------------------- | --------- | ---------- |
| QA-CI-001    | `continue-on-error` enmascara un gate de verificación que falla         | error     | quarantine |
| QA-CI-009    | Código de salida de tests no propagado (`\|` sin pipefail, cadenas `;`) | error     | extended   |
| QA-TEST-001  | Test enfocado en un commit (`.only`, `fit`)                             | error     | quarantine |
| QA-TEST-003  | Test sin aserciones                                                     | error     | quarantine |
| QA-TQUAL-009 | Aserción de promesa sin await                                           | error     | quarantine |
| QA-PW-002    | Aserción de locator sin await                                           | error     | core       |
| QA-PW-004    | Selectores CSS/XPath frágiles                                           | warning   | quarantine |
| QA-PY-002    | Test omitido (`skip`, `xfail` no estricto)                              | warning   | core       |
| QA-CS-103    | Método de test sin aserciones                                           | error     | core       |

El catálogo completo se genera a partir del registro, nunca se mantiene a mano: `mjolnir rules --md`, [`docs/rules/`](docs/rules/) o la [guía de qué comprueba](https://sergey-bar.github.io/Mjolnir/guide/what-it-checks).

<details>
<summary><strong>Todas las reglas mencionadas en este README</strong>, en una tabla</summary>

<br />

> Las reglas `quarantine` solo se ejecutan con `--strict` y nunca bloquean (se limitan a info). La severidad mostrada es la definida por el autor.

| ID           | Familia    | Regla                                                          | Severidad | Nivel      |
| ------------ | ---------- | -------------------------------------------------------------- | --------- | ---------- |
| QA-TEST-001  | Higiene    | Test enfocado en un commit (`.only`, `fit`)                    | error     | quarantine |
| QA-TEST-002  | Higiene    | Test omitido. Escala a `error` sin un motivo registrado.       | warning   | quarantine |
| QA-TEST-003  | Higiene    | Test sin aserciones                                            | error     | quarantine |
| QA-TEST-004  | Higiene    | Sleep fijo (`waitForTimeout`, `sleep()`, `delay()`)            | warning   | extended   |
| QA-TEST-006  | Higiene    | Abuso de reintentos que oculta la inestabilidad                | warning   | quarantine |
| QA-TEST-010  | Higiene    | Cuerpo de test vacío                                           | error     | quarantine |
| QA-TQUAL-002 | Calidad    | Aserción tautológica                                           | error     | quarantine |
| QA-TQUAL-009 | Calidad    | Aserción de promesa sin await                                  | error     | quarantine |
| QA-TQUAL-011 | Calidad    | Tests comentados                                               | warning   | extended   |
| QA-PW-002    | Playwright | Aserción de locator sin await                                  | error     | core       |
| QA-PW-003    | Playwright | `page.pause()` / `test.only()` en un commit                    | error     | core       |
| QA-PW-004    | Playwright | Selectores CSS/XPath frágiles                                  | warning   | quarantine |
| QA-PW-123    | Playwright | URLs de entorno fijadas en el código                           | warning   | quarantine |
| QA-PW-140    | Playwright | Captura de pantalla sin `maxDiffPixelRatio`                    | warning   | core       |
| QA-CI-001    | CI         | `continue-on-error` enmascara un gate que falla                | error     | quarantine |
| QA-CI-002    | CI         | `\|\| true` se traga los códigos de salida                     | error     | extended   |
| QA-CI-005    | CI         | Informe consumido pero nunca generado                          | error     | quarantine |
| QA-CI-007    | CI         | Wrappers de reintentos alrededor de los tests                  | warning   | extended   |
| QA-CI-008    | CI         | Un step que siempre tiene éxito enmascara fallos               | error     | quarantine |
| QA-CI-009    | CI         | Código de salida no propagado (`\|` sin pipefail, cadenas `;`) | error     | extended   |
| QA-CI-010    | CI         | Tests omitidos donde deben bloquear                            | error     | quarantine |
| QA-PY-002    | Python     | Test omitido (`skip`, `xfail` no estricto)                     | warning   | core       |
| QA-PY-003    | Python     | Función de test sin aserciones                                 | error     | quarantine |
| QA-PY-005    | Python     | `time.sleep()` en tests                                        | warning   | extended   |
| QA-PY-012    | Python     | Aserción tautológica                                           | error     | quarantine |
| QA-JV-101    | Java       | Test desactivado (`@Disabled`)                                 | warning   | core       |
| QA-JV-102    | Java       | Sleep fijo (`Thread.sleep()`)                                  | warning   | extended   |
| QA-JV-103    | Java       | Método de test sin aserciones                                  | error     | extended   |
| QA-JV-105    | Java       | Sleep fijo con `waitForTimeout()` de Playwright                | warning   | core       |
| QA-JV-106    | Java       | Selector frágil en lugar de un locator por rol                 | warning   | quarantine |
| QA-CS-101    | C#         | Test omitido (`[Ignore]`, `[Fact(Skip=)]`)                     | warning   | core       |
| QA-CS-102    | C#         | Sleep fijo (`Thread.Sleep` / `Task.Delay`)                     | warning   | core       |
| QA-CS-103    | C#         | Método de test sin aserciones                                  | error     | core       |
| QA-CS-105    | C#         | Sleep fijo con `WaitForTimeoutAsync()`                         | warning   | extended   |
| QA-CS-106    | C#         | Selector frágil en lugar de un locator por rol                 | warning   | quarantine |

Python también incluye QA-PY-001…012 (higiene de pytest) y QA-PY-101…108 (Playwright para Python). Cypress y Selenium tienen conjuntos iniciales de tres reglas cada uno.

</details>

Cada regla se publica con un fixture must-fire **y** otro must-not-fire, y una regla que se dispara con su propio fixture negativo no puede publicarse. Ese es el cortafuegos de falsos positivos; `mjolnir doctor` lo impone en la propia CI de este repositorio.

### Selector Health Score

`mjolnir doctor:playwright` califica cada locator según cómo encuentra un elemento: como lo haría un usuario (rol, etiqueta, texto), mediante un contrato explícito (`data-testid`) o por un accidente estructural (cadenas CSS, XPath). Cada archivo obtiene una puntuación de 0 a 100:

```text
  ▍ SELECTOR HEALTH

e2e/login.spec.ts
  [█████████████░░░░░░░]  65 / 100
  role/text: 1 · testid: 0 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0

e2e/checkout.spec.ts
  [██████████████████░░]  88 / 100
  role/text: 4 · testid: 1 · plain-css: 0 · css-chains: 1 ⚠ · xpath: 0
```

Esto mide **resiliencia, no corrección**. `.btn.btn-primary > div:nth-child(2)` pasa hoy y sigue pasando hasta que alguien toca el marcado. Una puntuación baja nunca afirma que el test esté roto, solo que depende de un marcado que nadie prometió mantener.

<br />

## La puntuación de fiabilidad

<p align="center">
  <img src="assets/readme/score-gauge.svg" alt="La escala de fiabilidad de 0 a 100, con un marcador que recorre cada puntuación: UNWORTHY por debajo de 50, NEEDS WORK de 50 a 79, WORTHY de 80 a 99, FORGED en 100" width="720" />
</p>

<sub>Cada puntuación de 0 a 100, situada por el `deriveScoreState` real. Generado con `npm run docs:gauge` y bloqueado contra desviaciones en CI.</sub>

| Puntuación | Veredicto                                             |
| ---------- | ----------------------------------------------------- |
| `0 – 49`   | **UNWORTHY**                                          |
| `50 – 79`  | **NEEDS WORK**                                        |
| `80 – 99`  | **WORTHY**                                            |
| `100`      | **FORGED**                                            |
| `null`     | **UNKNOWN**: no se encontraron declaraciones de tests |

**Cómo se calcula.** La severidad fija una deducción base (`error −8`, `warning −3`, `info −1`) y el nivel de evidencia la descuenta: E2 cuenta completo, E1 la mitad (redondeando hacia abajo), E0 nada. El total se normaliza por la exposición de la suite, es decir, deducciones por declaración de test en lugar de por archivo. El terminal imprime los mismos números descontados que usó la puntuación; no hay un segundo modelo oculto. Detalles: [docs/SCORING.md](docs/SCORING.md) y la [guía de puntuación](https://sergey-bar.github.io/Mjolnir/guide/scoring).

**Lo que 100 no significa.** No significa que el software sea correcto, que la suite sea adecuada o que el producto esté libre de defectos. Significa una sola cosa: **ninguna de las reglas evaluadas por Mjölnir produjo una deducción con este escaneo y este modelo de evidencia.**

<br />

## El modelo de evidencia

Cada hallazgo lleva dos etiquetas: qué tan seguro está Mjölnir y hasta dónde se comprobó el hallazgo. Esa es la diferencia entre una herramienta que reporta patrones y una herramienta en la que puedes basar un release.

**Qué tan seguro: el nivel de evidencia.**

| Nivel  | Nombre              | Significa                                                   | Deducción |
| ------ | ------------------- | ----------------------------------------------------------- | --------- |
| **E2** | Prueba determinista | El defecto está presente en el código tal como está escrito | Completa  |
| **E1** | Evidencia de patrón | Coincidió un patrón fuertemente ligado al defecto           | Mitad     |
| **E0** | Observación         | Vale la pena saberlo. No afirma que algo esté mal.          | Cero      |

La confianza en una detección no es la fuerza de la prueba. Una regla puede estar segura de haber encontrado lo que buscaba y aun así estar mirando una heurística. Los hallazgos E1 están para leerlos y juzgarlos, nunca para aplicarlos a ciegas, y ese límite queda marcado en el hallazgo en el terminal, en el JSON y en el traspaso al agente.

**Hasta dónde se comprobó: el nivel de confianza.** La mayoría de los hallazgos provienen de leer tu código. Dale a Mjölnir el informe de una ejecución real de tests y podrá confirmar que el código realmente se ejecutó.

<p align="center">
  <img src="assets/readme/trust-ladder.svg" alt="La escalera de confianza de L0 a L5. De L0 a L2 provienen de leer el código; de L3 a L5 necesitan el informe de una ejecución real, marcado por una ruptura en la escalera." width="100%" />
</p>

| Nivel  | En palabras sencillas | Qué se necesita                                                        |
| ------ | --------------------- | ---------------------------------------------------------------------- |
| **L0** | Anotado               | Leer el código                                                         |
| **L1** | Parece el problema    | Leer el código: coincidió un patrón                                    |
| **L2** | Probado en el código  | Leer el código: el defecto es estructural                              |
| **L3** | El archivo se ejecutó | Un informe de ejecución muestra que se ejecutó el archivo del hallazgo |
| **L4** | El test se ejecutó    | Un informe de ejecución muestra que se ejecutó el test del hallazgo    |
| **L5** | La ejecución coincide | El propio resultado de la ejecución confirma la clase de defecto       |

Un escaneo estático se detiene en L2. Solo el informe de una ejecución real (Playwright JSON, Jest o Vitest JSON, JUnit XML) puede elevar un hallazgo a L3 o más, de modo que un hallazgo que nunca se vio ejecutarse nunca puede afirmar que se ejecutó. Definiciones: [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md).

### Cuánto de esto está medido

**74 de 79 reglas tienen una tasa de falsos positivos medida contra código OSS real** (al menos 10 hallazgos clasificados a mano cada una; consulta [docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Las otras 5 se publican con la estimación del autor y lo dicen, regla por regla, en `mjolnir explain`. `mjolnir rules --unmeasured` las lista, y el pie de cada escaneo indica cuántas de las reglas que realmente se _dispararon_ están medidas.

Las tasas siguen siendo públicas cuando son malas. QA-TEST-001 (un `.only` en un commit) sale mal en la auditoría sobre repositorios reales y por eso está en quarantine. La cifra actual de cada regla, incluida QA-PW-141, está en la auditoría.

### Niveles de confianza

Los niveles siguen la tasa de falsos positivos medida, no la opinión:

| Nivel          | FP medido                        | Comportamiento                                      |
| -------------- | -------------------------------- | --------------------------------------------------- |
| **core**       | ≤ 10%                            | Informe predeterminado, bloquea                     |
| **extended**   | ≤ 30%                            | Informe predeterminado, menor confianza             |
| **quarantine** | > 30% o explícitamente declarado | Solo con `--strict`, limitado a info, nunca bloquea |
| _sin medir_    | n < 10                           | No puede ascender a core hasta ser medida           |

Las bandas de FP solo pueden degradar un nivel — nunca promueven una regla fuera de `quarantine` si fue declarada explícitamente allí. Una regla explícitamente puesta en quarantine permanece en quarantine sin importar su tasa de FP medida.

Ascensos, descensos y madurez por lenguaje: [ciclo de vida de las reglas](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle).

### Por qué esto no es un linter

Los linters te dicen si el código sigue unas reglas. Mjölnir te dice si se puede confiar en tu verificación.

|                                                                         | Linters (ESLint, SonarQube) | Herramientas de cobertura | Revisión de código con IA |   **Mjölnir**    |
| ----------------------------------------------------------------------- | :-------------------------: | :-----------------------: | :-----------------------: | :--------------: |
| Puntúa el **sistema de verificación**, no el código del producto        |             No              |            No             |            No             |        Sí        |
| Integridad de los workflows de CI (`continue-on-error`, `\|\| true`)    |             No              |            No             |       solo el diff        |        Sí        |
| Califica la resiliencia de los locators de Playwright (Selector Health) |             No              |            No             |            No             |        Sí        |
| Lee datos de ejecución reales para veredictos `TRUE-FLAKE`              |             No              |            No             |            No             |        Sí        |
| Publica una tasa de falsos positivos medida por regla                   |             No              |            No             |            No             |        Sí        |
| Marca tests sin aserciones                                              |            Sí\*             |            No             |          a veces          |        Sí        |
| Detecta sleeps fijos (`waitForTimeout`, `time.sleep`)                   |            Sí\*             |            No             |          a veces          |        Sí        |
| Determinista (misma entrada, misma salida)                              |             Sí              |            Sí             |            No             |        Sí        |
| Coste por escaneo                                                       |           gratis            |          gratis           |          tokens           | **cero** (local) |

<sub>\*Cubierto por `eslint-plugin-jest` y `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) y por las propias reglas de aserción de SonarQube. Las columnas describen el comportamiento predeterminado para la verificación de suites de tests; los plugins, los planes de pago y las reglas personalizadas cambian algunas respuestas. Es un resumen de posicionamiento, no un benchmark.</sub>

Usa también la revisión con IA. Detecta matices, intención y fallos de diseño que ningún patrón puede encontrar. Mjölnir detecta lo que la revisión con IA pasa por alto porque parece intencional: un `.only` en un commit, un código de salida tragado, un `continue-on-error` en un job de tests. Eso requiere escanear, no razonar.

<br />

## Forense de ejecución

El análisis estático razona sobre código que nunca se ejecutó. El análisis forense lee lo que realmente ocurrió: Playwright JSON, Jest JSON, Vitest JSON y JUnit XML de cualquier runner.

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

`TRUE-FLAKE` no significa que el test se reintentó. Significa que el test **falló al menos un intento y luego terminó en verde**: un pase con suerte, marcado diga lo que diga el check final. `mjolnir triage` convierte ese historial en una propuesta de cuarentena, y `mjolnir pw-report` resume una ejecución. Esos mismos informes de ejecución son los que elevan los hallazgos a los niveles de confianza L3 y superiores.

<br />

## Integridad de CI

Un test puede pasar mientras el pipeline que lo rodea no puede fallar. Mjölnir también lee los workflows: `continue-on-error`, `|| true`, códigos de salida que nunca se propagan, steps que siempre tienen éxito, informes consumidos pero nunca generados y gates omitidos justo en los eventos que deberían bloquear. Cada hallazgo nombra el job, el step y la línea, y lleva su propio nivel de evidencia.

Genera el workflow de PR, consultivo por defecto:

```bash
mjolnir ci install
```

O añade la action del Marketplace a un workflow que ya tengas:

```yaml
- uses: Sergey-Bar/Mjolnir@v3
  with:
    scope: changed
    fail-on: error
```

Fija `@v3` para seguir la línea mayor, o una etiqueta exacta (`@v0.5.32`) para un gate reproducible. [docs/DISTRIBUTION-KIT.md](docs/DISTRIBUTION-KIT.md) cubre el Marketplace, Smithery y los registros MCP.

Para llevar los hallazgos a GitHub Code Scanning, sube SARIF (requiere `security-events: write` a nivel de workflow o job):

```yaml
- run: npx mjolnir-qa@3.0.0 --format sarif > mjolnir.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  if: ${{ !cancelled() }}
  with:
    sarif_file: mjolnir.sarif
```

En GitLab, `--format codequality` escribe el informe de Code Quality que leen el widget de MR y las anotaciones del diff ([docs/GITLAB-CI.md](docs/GITLAB-CI.md)). Configuración del editor y del pipeline: [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Atribución por alcance modificado

```bash
npx mjolnir-qa@3.0.0 --scope changed
```

Los hallazgos se atribuyen a las líneas que añadió tu rama, medidas contra el **merge-base**. El alcance es el mismo conjunto de archivos que descubre un escaneo completo (specs TS/JS y configuraciones de adaptadores, `test_*.py`, `*Test.java`, `*Tests.cs`, `.github/workflows/*.yml`), más los cambios sin commit y sin seguimiento, así que funciona antes de hacer commit. La base se resuelve como `main → master → origin/main → origin/master → origin/HEAD`; puedes sobrescribirla con `--base <ref>`.

Cuando el merge-base no puede resolverse (un clon superficial, un HEAD separado, un destino fuera de git), los hallazgos pasan a atribuirse al archivo completo **y el informe lo dice.** Un fallback silencioso sería justo el tipo de defecto que esta herramienta existe para detectar.

<br />

## Agentes de IA

Los hallazgos solo valen algo si algo actúa sobre ellos.

```text
SCAN → EVIDENCE → HANDOFF → AGENT → RE-SCAN → PROOF
```

**La IA escribe la corrección. Mjölnir la verifica.** La prueba viene del reescaneo, nunca del propio informe de éxito del agente.

| Comando           | Qué recibe el agente                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mjolnir mcp`     | Un servidor [MCP](https://modelcontextprotocol.io) sobre stdio. `scan`, `explain` y `diff` se convierten en herramientas invocables.                                                |
| `mjolnir handoff` | Un informe `--json` guardado se convierte en un plan determinista en Markdown: qué se detectó, el límite de evidencia de cada hallazgo, qué **no** debe cambiar y cómo verificarlo. |
| `mjolnir install` | Escribe en las superficies de agente que tu repo ya tiene (`.claude/`, `.cursor/`, `.kilo/`, `AGENTS.md`) para que el agente vuelva a escanear antes de afirmar que ha terminado.   |

Añádelo a un cliente que tenga su propia CLI:

```bash
claude mcp add mjolnir -- npx -y mjolnir-qa@3.0.0 mcp
```

O a cualquier cliente que acepte un bloque `mcpServers`:

```json
{
  "mcpServers": {
    "mjolnir": { "command": "npx", "args": ["-y", "mjolnir-qa@3.0.0", "mcp"] }
  }
}
```

**La salvaguarda importa más que la comodidad.** Cada hallazgo de un traspaso lleva su límite. **E2** dice _determinista: comprueba la ubicación y aplica la corrección_. **E1** dice _REQUIERE CONFIRMACIÓN: la observación por sí sola no demuestra el defecto_. Un agente que corrige E1 a ciegas, suprime una regla o edita una regla para subir la puntuación está haciendo exactamente lo que esta herramienta existe para detectar, así que el traspaso lo dice en el prompt, junto al hallazgo.

<br />

## Confianza y seguridad

**Local primero, cero telemetría.** No existe ninguna API con capacidad de red (`fetch`, `http`, `https`, `net`, `dns`, `dgram`, WebSocket) en ningún lugar de `src/`, y [`privacy-network-isolation.spec.ts`](tests/contract/privacy-network-isolation.spec.ts) hace fallar la compilación si aparece una. También prohíbe `eval` y `new Function`. Escanear código no confiable nunca lo ejecuta: el análisis estático lee texto fuente, y el análisis forense procesa archivos de informe que ya existen en disco.

Dos salvedades: el propio `npx` descarga el paquete antes de que nada se ejecute, y la garantía cubre `src/`, no los plugins de terceros.

**Los plugins no están aislados en un sandbox.** Los plugins JS (`mjolnir-rules/*.mjs`, o paquetes npm listados en `"plugins"`) se ejecutan con todos los privilegios de Node, el mismo modelo de confianza que los plugins de ESLint o Vitest. Cargarlos es opcional **por escaneo**: sin `--enable-plugins` (o `MJOLNIR_ENABLE_PLUGINS=1`) sus fuentes nunca se cargan, y un aviso en stderr lista lo que se omitió. Los manifiestos de reglas JSON no ejecutan código, y los prefijos de ID de las reglas core están reservados para que ningún plugin pueda suplantar una. Reporta vulnerabilidades a través de [SECURITY.md](SECURITY.md).

**Se ejecuta sobre sí mismo.** Un motor de confianza de verificación no tiene credibilidad si no es verificable él mismo. Cada ejecución de CI escanea este repositorio con la build que produjo esa misma ejecución. El gate falla con cualquier hallazgo de severidad error, y también con un escaneo **parcial** o una **regla que se cae**, porque un autoescaneo truncado que no reporta nada es el falso verde que este proyecto existe para detectar. `mjolnir doctor` vuelve a auditar la base de reglas en la misma ejecución (cortafuegos de fixtures, honestidad de los niveles, el límite del nivel core), y una comprobación INCONCLUSIVE falla exactamente igual que una que falla. Ambos informes se suben como artefactos de la build.

### Códigos de salida y el contrato de máquina

Congelados, para que puedas construir lógica de CI sobre ellos:

| Código de salida | Significado                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `0`              | Limpio: ningún hallazgo en el gate o por encima                                     |
| `1`              | Hallazgos en el gate o por encima                                                   |
| `2`              | Escaneo parcial (presupuesto de tiempo agotado, archivos ilegibles). Nunca bloquea. |
| `10`             | Error de uso (flag incorrecto, destino ausente)                                     |
| `20`             | Error interno                                                                       |

`2` es deliberadamente distinto de `0`: un escaneo que no terminó no ha encontrado nada. Simplemente no ha terminado de buscar.

Todo lo que consume una máquina (resultados de herramientas MCP, `--json`, SARIF 2.1) proviene de un único resultado canónico bajo un esquema versionado y **solo aditivo** (`schemaVersion: 1`, `contractVersion: 1`), para que ningún consumidor tenga que reconstruir el significado a partir de texto renderizado. Consulta [el contrato de máquina](docs/machine-contract.md). Los IDs de regla (`QA-<FAMILY>-NNN`) son inmutables una vez publicados y nunca se reutilizan.

<br />

## Lo que Mjölnir no puede decirte

- **No ejecuta tus tests.** Un escaneo limpio no es una suite que pasa.
- **No puede decirte que una aserción es _incorrecta_.** `expect(total).toBe(41)` parece sana. Mjölnir encuentra tests que _no pueden fallar_ y pipelines que _no pueden ponerse en rojo_, no tests que comprueban lo que no deben.
- **No demuestra la corrección de negocio.** Nada aquí dice que tu producto haga lo que pedía el requisito.
- **Un 100 no es prueba de una buena suite.** Si tu suite cubre tu riesgo real es otra pregunta, y esta herramienta no la responde.
- **5 de 79 reglas se publican con una estimación**, no con una tasa medida. Cada una lo dice en su propio hallazgo.
- **E1 no es E2.** Los hallazgos heurísticos merecen leerse, no aplicarse a ciegas.
- **Un repo vacío puntúa `null`, nunca 100.**
- **Un archivo llamado `*.spec.ts` sin declaraciones de tests no cuenta como cobertura.** Un repo cuyos únicos archivos spec contienen imports o tipos (cero llamadas `it`/`test`) puntúa `null`, no 100.

<br />

## Documentación

El sitio completo de documentación está en <https://sergey-bar.github.io/Mjolnir/>.

| Documento                                              | Qué contiene                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalización de la puntuación y ponderación de la evidencia       |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md)             | Vocabulario canónico: una palabra por concepto                     |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Tasas de falsos positivos medidas y el método                      |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Estados de las reglas, niveles, supresión, obsolescencia           |
| [docs/VERSIONING.md](docs/VERSIONING.md)               | Política de semver, superficies congeladas, ciclo de obsolescencia |
| [docs/machine-contract.md](docs/machine-contract.md)   | El resultado canónico legible por máquina                          |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Salida SARIF y configuración del editor o de CI                    |
| [docs/GITLAB-CI.md](docs/GITLAB-CI.md)                 | GitLab: informe de Code Quality, receta de MR, gate                |
| [docs/rules/](docs/rules/)                             | Catálogo generado por regla                                        |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Entorno de desarrollo y flujo de contribución                      |
| [SUPPORT.md](SUPPORT.md)                               | Dónde preguntar, reportar y obtener ayuda                          |
| [SECURITY.md](SECURITY.md)                             | Reporte de vulnerabilidades                                        |
| [CHANGELOG.md](CHANGELOG.md)                           | Historial de versiones                                             |

### Estado

**Versión 1.** El esquema JSON y los códigos de salida son contratos congelados. TypeScript y Python tienen la cobertura medida más amplia. Java y C# son más recientes; léelos a través de la [tabla de madurez](https://sergey-bar.github.io/Mjolnir/reference/rule-lifecycle). Lo que viene después, sin fechas inventadas: [la hoja de ruta pública](https://sergey-bar.github.io/Mjolnir/reference/roadmap).

### Contribuir

Las reglas nuevas son la primera contribución más fácil. Un comando crea el esqueleto de la regla con sus fixtures must-fire **y** must-not-fire. La regla generada falla sus propios fixtures a propósito hasta que se escribe una detección real, porque un stub que se publica es una regla que nadie midió:

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

El entorno de desarrollo, los comandos de los gates permanentes y las leyes anti-creep y del cortafuegos de fixtures están en [CONTRIBUTING.md](CONTRIBUTING.md).

<br />

<div align="center">

<img src="assets/readme/closing.svg" alt="Pruébalo en tu repo." width="100%" />

```bash
npx mjolnir-qa@3.0.0
```

[Lee la guía](https://sergey-bar.github.io/Mjolnir/guide/getting-started) · [Sitio de documentación](https://sergey-bar.github.io/Mjolnir/) · [npm](https://www.npmjs.com/package/mjolnir-qa)

<br />

No preguntes si los tests pasaron.<br />
Pregunta si la evidencia demuestra que merecen confianza.

<sub>Creado por [Sergey Bar](https://www.linkedin.com/in/sergeybar/) · Licencia MIT</sub>

</div>
