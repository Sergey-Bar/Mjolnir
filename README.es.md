<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Tus tests te mienten. Nosotros lo demostramos.

**Verification Trust Engine para QA.** Mjölnir audita suites de tests y
pipelines de CI, reporta una puntuación de idoneidad y muestra
exactamente dónde se rompe la confianza.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | Español | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**¿Son tus tests dignos de confianza?**

[Míralo en acción](#-míralo-en-acción) ·
[Inicio rápido](#-inicio-rápido) ·
[Qué comprueba](#-qué-comprueba-mjölnir) ·
[Puntuación](#cómo-funciona-la-puntuación) ·
[CI](#-integración-ci) · [Configuración](#configuración) ·
[Documentación](#-documentación)

</div>

---

## 🎬 Míralo en acción

<p align="center">
  <img src="assets/readme/demo.svg" alt="El informe --verbose completo de Mjölnir sobre un repo de demostración: WORTHINESS 75/100 NEEDS WORK, un desglose de diagnósticos por categoría, una lista FIX THIS FIRST y cada hallazgo con su ID de regla y número de línea a través de CI, Playwright, higiene de tests y reglas de Python" width="900" />
</p>

<sub>La salida completa de `npx mjolnir-qa ./examples/demo-repo --verbose`,
renderizada por el reporter real — nada recortado. Regenerada con
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
hace fallar la CI si se desvía de lo que la herramienta imprime.</sub>

**Lo que acaba de pasar:**

1. Mjölnir descubrió los specs de Playwright, su configuración, el
   workflow de CI y un archivo de test de Python — cuatro
   lenguajes/formatos, una sola pasada.
2. Encontró evidencia que debilita la confianza en la suite — un
   `continue-on-error` que enmascara un job, un `|| true` que traga un
   código de salida, sleeps en duro, un selector frágil, URLs de
   staging hardcodeadas, una espera `networkidle`.
3. Convirtió cada uno en un hallazgo concreto con ID de regla,
   ubicación y arreglo — y una única puntuación sobre la que puedes
   hacer gate a una PR.

### Un hallazgo de cerca

Ejecuta `mjolnir explain QA-CI-001` sobre el primer hallazgo de arriba
y obtienes:

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

Esa es la unidad de valor: no un detalle de estilo, sino un lugar donde
tu CI te dice que algo pasó cuando no pasó.

---

## ⚡ Inicio rápido

Ejecútalo contra un repo para un informe completo y una puntuación de
idoneidad:

```bash
npx mjolnir-qa@latest
```

**En CI, el producto es un solo comando.** Escanea solo lo que la
rama tocó y sale con código distinto de cero ante problemas nuevos:

```bash
npx mjolnir-qa@latest --scope changed
```

Suelta eso en un check de PR — `mjolnir ci install` escribe el
workflow — y listo. Todo lo demás es opcional.

| Comando                             | Qué hace                                                           |
| ----------------------------------- | ------------------------------------------------------------------ |
| `mjolnir`                           | Escaneo completo del repo + puntuación de idoneidad                |
| `mjolnir --scope changed`           | Solo lo que introdujo tu rama — la forma de CI                     |
| `mjolnir ci install`                | Genera el workflow de PR asesor                                    |
| `mjolnir explain QA-CI-001`         | Qué / por qué / arreglo + tasa de FP medida de una regla           |
| `mjolnir rules --unmeasured`        | Las reglas que corren por suposición, no por medición              |
| `mjolnir --json` / `--format sarif` | Legible por máquina / GitHub Code Scanning                         |
| `mjolnir --strict`                  | También ejecuta reglas del tier de cuarentena (mayor riesgo de FP) |

<details>
<summary><strong>Cuando algo es inestable</strong></summary>

| Comando                             | Qué hace                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Datos reales de ejecución → veredictos `TRUE-FLAKE`, `FLAKY.md`           |
| `mjolnir triage ./test-results/`    | Propuesta de cuarentena a partir del historial de ejecución               |
| `mjolnir pw-report ./test-results/` | Resumen de ejecución de Playwright — reintentos / inestables / más lentos |
| `mjolnir doctor:playwright`         | Escaneo profundo solo Playwright + Selector Health Score                  |

</details>

<details>
<summary><strong>Ocasional / informes</strong></summary>

| Comando                         | Qué hace                                                    |
| ------------------------------- | ----------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Autocorrevisiones seguras con prueba                        |
| `mjolnir baseline` / `diff`     | Snapshot de hallazgos, luego reporta solo nuevos/empeorados |
| `mjolnir impact --since <ref>`  | Qué cambió desde un commit anterior                         |
| `mjolnir debt`                  | Registro de deuda de tests con un modelo de coste           |
| `mjolnir handover`              | Mapa de onboarding de la suite para QA recién incorporado   |
| `mjolnir stats`                 | Contadores locales de todos los tiempos de arreglos vistos  |
| `mjolnir badge`                 | JSON de endpoint de shields.io + snippet                    |
| `mjolnir rules --md`            | Catálogo completo de reglas (JSON o Markdown)               |
| `mjolnir doctor`                | Autoauditoría de la propia base de reglas de Mjölnir        |
| `mjolnir create-rule <ID>`      | Genera el esqueleto de una regla nueva + fixtures           |
| `mjolnir --format mermaid`      | Diagrama de arquitectura de tests para un comentario de PR  |

</details>

Instálalo globalmente en lugar de `npx` si lo prefieres:
`npm i -g mjolnir-qa`. Requiere Node.js ≥ 22.18. Funciona en Windows,
macOS y Linux.

---

## 👥 ¿Para quién es esto?

- **QA / SDET** dueños de una suite e2e o de integración que necesitan
  evidencia de que la suite realmente merece el visto verde que
  produce.
- **Equipos de Plataforma / DevEx** responsables de la integridad de CI
  y de los release gates — la gente a la que le importa que un
  `continue-on-error` nunca vuelva verde en silencio una pipeline roja.
- **Mantenedores de OSS** que quieren un gate de verificación barato,
  siempre activo, que corra en local y en CI sin llamadas de red.

---

## 🔨 Qué comprueba Mjölnir

|     |                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Puntuación de idoneidad** — un número, tabla de deducciones transparente, sin caja negra                                            |
| 🎭  | **Selector Health Score** — califica tus locators de Playwright, no solo tu tasa de aprobación                                        |
| 🔬  | **Forense de ejecución** — lee datos reales de ejecución de Playwright/JUnit para detectar `TRUE-FLAKE`, no solo conjeturas estáticas |
| 🚨  | **Reglas de integridad de CI** — detecta `continue-on-error`, `\|\| true` y otros trucos de verde falso                               |
| 🐍  | **Los cuatro bindings de Playwright** — TypeScript, Python, Java, C#/.NET — más pytest, JUnit/TestNG y workflows de CI                |
| 🔒  | **Local-first** — cero llamadas de red al escanear, cero telemetría, corre en segundos                                                |

### Las reglas

Cada regla llega con fixtures must-fire **y** must-not-fire. Una regla
que se dispara sobre su propia fixture negativa no puede publicarse —
ese es el cortafuegos de falsos positivos.

<details>
<summary><strong>Higiene de tests</strong></summary>

| ID          | Regla                                                  | Severity |
| ----------- | ------------------------------------------------------ | -------- |
| QA-TEST-001 | Test enfocado committeado (`.only`, `fit`)             | error    |
| QA-TEST-002 | Test saltado sin justificación                         | error    |
| QA-TEST-002 | Test saltado con justificación registrada              | warning  |
| QA-TEST-003 | Test sin aserciones                                    | error    |
| QA-TEST-004 | Sleep en duro (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Abuso de reintentos que esconde inestabilidad          | warning  |
| QA-TEST-010 | Cuerpo de test vacío                                   | error    |

</details>

<details>
<summary><strong>Calidad de tests</strong></summary>

| ID           | Regla                         | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | Verificación solo con mocks   | info     |
| QA-TQUAL-002 | Aserción tautológica          | error    |
| QA-TQUAL-009 | Aserción de promesa sin await | error    |
| QA-TQUAL-011 | Tests comentados              | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Regla                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PW-002 | Aserción de locator sin await                 | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committeados   | error    |
| QA-PW-004 | Selectores CSS/XPath frágiles                 | warning  |
| QA-PW-005 | Lógica de negocio dentro de `page.evaluate()` | info     |
| QA-PW-114 | Element handles heredados (`page.$`)          | info     |
| QA-PW-118 | Esperas `networkidle` (inestables por diseño) | info     |
| QA-PW-123 | URLs de entorno hardcodeadas                  | warning  |

</details>

<details>
<summary><strong>Integridad de CI</strong></summary>

| ID        | Regla                                                                   | Severity |
| --------- | ----------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` enmascara fallos                                    | error    |
| QA-CI-002 | `\|\| true` traga códigos de salida                                     | error    |
| QA-CI-005 | Reporte consumido pero nunca generado                                   | error    |
| QA-CI-007 | Wrappers de reintento alrededor de tests                                | warning  |
| QA-CI-008 | Paso siempre exitoso enmascara fallos                                   | error    |
| QA-CI-009 | Código de salida del test no propagado (`\|` sin pipefail, cadenas `;`) | error    |
| QA-CI-010 | Tests saltados donde deben bloquear (guardas skip-on-PR)                | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Regla                                      | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-PY-002 | Test saltado (`skip`, `xfail` no estricto) | warning  |
| QA-PY-003 | Función de test sin aserciones             | error    |
| QA-PY-005 | `time.sleep()` en tests                    | warning  |
| QA-PY-006 | Cuerpo de test vacío (`pass`)              | info     |
| QA-PY-010 | Dependencia de azar/tiempo sin freeze      | info     |
| QA-PY-012 | Aserción tautológica                       | error    |

20 reglas de Python en total (QA-PY-001…012 higiene pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Regla                                          | Severity |
| --------- | ---------------------------------------------- | -------- |
| QA-JV-101 | Test deshabilitado (`@Disabled`)               | warning  |
| QA-JV-102 | Sleep en duro (`Thread.sleep()`)               | warning  |
| QA-JV-103 | Método de test sin aserciones                  | error    |
| QA-JV-105 | Sleep en duro de Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Selector frágil en vez de role locator         | warning  |
| QA-JV-108 | URL de entorno hardcodeada en el test          | info     |
| QA-JV-111 | Mock en blanquete `page.route("**")`           | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Regla                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-CS-101 | Test saltado (`[Ignore]`, `[Fact(Skip=)]`)    | warning  |
| QA-CS-102 | Sleep en duro (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Método de test sin aserciones                 | error    |
| QA-CS-105 | Sleep en duro `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | Selector frágil en vez de role locator        | warning  |
| QA-CS-108 | URL de entorno hardcodeada en el test         | info     |
| QA-CS-111 | Mock en blanquete `page.RouteAsync("**")`     | info     |

</details>

> El catálogo vivo completo — cada regla con tier, confidence, riesgo de
> falso positivo y disponibilidad de autofix — se genera desde el
> registro:
>
> ```bash
> mjolnir rules --md
> ```
>
> Las páginas por regla viven en [`docs/rules/`](docs/rules/).

### Cuánto está medido

**74 de 99 reglas llevan una tasa de falsos positivos medida contra
código OSS real** (≥ 10 hallazgos clasificados a mano cada una; ver
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Las otras 19 salen sobre la
estimación del autor. Cada pie de escaneo te dice cuántas de las reglas
_que se dispararon_ están medidas; `mjolnir rules --unmeasured` lista
las que no; la página `mjolnir explain` de cada regla declara su
estado. Publicamos la tasa aunque sea fea — QA-CS-103 audita al 95 % y
está en cuarentena por ello. Hacer crecer ese 78 es el trabajo continuo
del proyecto.

### Tiers de reglas y madurez por lenguaje

Cada regla es `core`, `extended` o `quarantine`, asignado según su tasa
de falsos positivos **medida**:

| Tier         | Significación                                 | Escaneo por defecto | `--strict` |
| ------------ | --------------------------------------------- | :-----------------: | :--------: |
| `core`       | ≤ 10 % de FP medido                           |         ✅          |     ✅     |
| `extended`   | ≤ 30 % de FP medido                           |         ✅          |     ✅     |
| `quarantine` | por encima del 30 %, o aún sin medir (n < 10) |         ❌          |     ✅     |

| Lenguaje        | Adaptador          | Cobertura hoy                                                |
| --------------- | ------------------ | ------------------------------------------------------------ |
| TypeScript / JS | AST del compilador | la más amplia y medida — sobre todo `core`/`extended`        |
| Python / pytest | Capa de regex      | amplia, auditada sobre corpus — sobre todo `core`/`extended` |
| Java            | Capa de regex      | más nuevo — sobre todo `extended`/`quarantine`               |
| C# / .NET       | Capa de regex      | más nuevo — sobre todo `extended`/`quarantine`               |

TypeScript y Python tienen la cobertura medida más amplia. Java y C#
están publicados, documentados, y permanecen fuera del número titular
hasta que una suite consumidora real (no los propios tests de una
librería de binding) haya sido auditada.

---

## Cómo funciona la puntuación

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Salida de terminal de Mjölnir — WORTHINESS 75/100 NEEDS WORK, un desglose de diagnósticos por categoría y una lista FIX THIS FIRST" width="820" />
</p>

<sub>Regenerada con `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
hace fallar la CI si se desvía de lo que el reporter realmente imprime.</sub>

La puntuación es transparente: **error −8, warning −3, info −1**, luego
normalizada por la exposición de la suite (deducciones por declaración
de test). Las deducciones ponderadas por evidencia significan que las
señales débiles cuestan menos. La terminal muestra los mismos números
descontados que usa la puntuación — sin caja negra. Método completo:
[docs/SCORING.md](docs/SCORING.md).

**Veredictos**

| Score   | Veredicto        |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Niveles de evidencia** — cada hallazgo lleva uno; fija el peso del
hallazgo en la puntuación:

| Nivel | Significación        | Impacto en la puntuación | Ejemplo                                                 |
| ----- | -------------------- | ------------------------ | ------------------------------------------------------- |
| E2    | Defecto determinista | Deducción completa       | `.only` committeado — estructuralmente demostrable      |
| E1    | Patrón heurístico    | Media deducción          | `sleep()` detectado por regex — señal fuerte, no prueba |
| E0    | Observación          | Cero (solo info)         | Reportado pero nunca hace gate a CI ni deduce           |

La mayoría de las reglas son **E1**. El lema «we prove it» se refiere a
este sistema: los hallazgos E2 son prueba estructural; los hallazgos E1
son advertencias correctamente posicionadas, no pruebas formales.

Un repo vacío puntúa `null`, nunca un falso 100 — ver
[Modelo de confianza](#modelo-de-confianza).

---

## 🎭 Selector Health Score

La métrica titular para suites de Playwright — qué tan resilientes son
tus locators:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Los locators basados en roles obtienen la puntuación completa. Las
cadenas de clases CSS y XPath hunden la puntuación — se rompen con
cualquier refactor del DOM sin decirte qué comportamiento regredijo.

---

## 🔬 Evidencia de ejecución

La detección estática de inestabilidad es adivinar. Mjölnir lee
**datos reales de ejecución** — reportes JSON de Playwright y XML de
JUnit de cualquier runner:

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

Un test que solo pasa en el intento ≥ 2 no es un test que pasa — es un
test con suerte. Se marca `TRUE-FLAKE` sin importar el visto verde
final.

---

## ⚡ Mjölnir no es otro linter

Los linters te dicen si el código sigue reglas. Mjölnir te dice si tu
verificación puede fiarse.

|                                                                     | ESLint / SonarQube | Herramientas de coverage | Revisión manual | **Mjölnir** |
| ------------------------------------------------------------------- | :----------------: | :----------------------: | :-------------: | :---------: |
| Integridad de workflows de CI (`continue-on-error`, `\|\| true`)    |         ❌         |            ❌            |    raramente    |     ✅      |
| Multi-lenguaje (TS, Python, Java, C#) desde una sola herramienta    |         ❌         |            ❌            |       ❌        |     ✅      |
| Califica la resiliencia de locators de Playwright (Selector Health) |         ❌         |            ❌            |    raramente    |     ✅      |
| Marca tests sin aserciones reales                                   |   ✅ (plugin)\*    |            ❌            |     a veces     |     ✅      |
| Detecta sleeps en duro (`waitForTimeout`, `time.sleep`)             |   ✅ (plugin)\*    |            ❌            |     a veces     |     ✅      |
| Corre en segundos, cero llamadas de red al escanear                 |         ✅         |            ✅            |        —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) y `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) cubren esto para sus
frameworks respectivos.

**El análisis de ejecución** es una categoría aparte del linting
estático:

|                                                            | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ---------------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Lee datos reales de ejecución para veredictos `TRUE-FLAKE` |         parcial\*         |     parcial (tag)     |          ✅           |
| Informe de triage de inestabilidad desde el historial      |            ❌             |          ✅           |          ✅           |
| Se integra con la puntuación de idoneidad estática         |            ❌             |          ❌           |          ✅           |

\*Playwright rastrea los reintentos internamente pero no produce un
informe de inestabilidad independiente con etiquetas de veredicto.

---

## 🤖 ¿Por qué no usar simplemente revisión de código con IA?

Problema distinto, capa distinta. Una revisión con IA puede detectar un
cambio de test sospechoso en un diff; no demuestra que el sistema de
verificación en su conjunto sea confiable — y solo ve el diff que le
muestras.

|                                             | Revisión de código con IA (Copilot, etc.) |             **Mjölnir**             |
| ------------------------------------------- | :---------------------------------------: | :---------------------------------: |
| Coste por escaneo                           |  Tokens (escala con el tamaño del diff)   |     **Cero** (local, instalado)     |
| Ve toda la suite + todas las configs de CI  |    Solo el diff de PR que le muestras     |         **Todo, cada vez**          |
| Determinista (misma entrada → misma salida) |           ❌ (no determinista)            |               **✅**                |
| Detecta patrones dormidos durante meses     |        Solo si está en el contexto        | **✅** (escanea todos los archivos) |
| Recuerda hallazgos entre ejecuciones        |      ❌ (sin memoria entre sesiones)      |      **✅** (baseline + diff)       |
| Corre sin disparador humano                 |        Necesita una PR o un prompt        |   **✅** (hook de CI, 3 segundos)   |

**Usa ambos.** La IA capta el matiz, la intención y los defectos de
diseño que ninguna regex encuentra. Mjölnir capta los patrones
estructurales que la IA pasa por alto porque parecen "intencionales" —
un `.only` committeado, un código de salida tragado, un
`continue-on-error` en un job de test. No son bugs que necesiten
razonamiento; son hechos que necesitan escaneo.

---

## 🤖 Integración CI

Un comando genera un workflow de PR — asesor por defecto, nunca
bloqueante:

```bash
mjolnir ci install
```

O conéctalo de forma nativa a GitHub Code Scanning vía SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Configuración para editor y pipeline de SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Cobertura de scope cambiado

`--scope changed` atribuye hallazgos a líneas añadidas en tu rama
frente al merge-base con `main`. Cubre archivos de tests
(`*.spec.*`, `*.test.*`) más archivos de workflow de GitHub y
configuraciones de Playwright en el diff. Cuando el merge-base no puede
resolverse — clone superficial, HEAD detached, objetivo sin git, rama
por defecto distinta — degrada con honestidad: los hallazgos vuelven a
la atribución por archivo completo y el reporte lo dice. Sobrescribe la
ref base con `--base <ref>`.

---

## Configuración

Mjölnir es cero-config. Un `mjolnir.config.json` opcional (o
`.mjolnir.json`) en la raíz del repo ajusta severidad, gating y scope —
nunca cambia la semántica de detección.

| Key                 | Tipo                                 | Efecto                                                                                                                                                                                                 |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exclude`           | `string[]`                           | Globs de ignore adicionales (subconjunto de gitignore), encima de los predeterminados integrados                                                                                                       |
| `gate`              | `"advisory" \| "error" \| "warning"` | Qué severidades salen con código distinto de cero (por defecto `error`; `advisory` nunca bloquea)                                                                                                      |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Reordena los hallazgos de una regla para tu repo                                                                                                                                                       |
| `ignore`            | `IgnoreEntry[]`                      | Suprime hallazgos — **`reason` es obligatorio**; las entradas expiran tras 90 días (una fecha `expires` explícita, o la fecha de última modificación del archivo de config para las entradas sin ella) |
| `plugins`           | `string[]`                           | Paquetes de reglas de terceros (ver [Modelo de confianza](#modelo-de-confianza))                                                                                                                       |

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

- **`.mjolnirignore`** — un archivo sencillo estilo gitignore para
  exclusiones de rutas, mismo dialecto que `exclude`. Úsalo para ruido
  de máquina; usa `exclude` cuando la lista pertenece al control de
  versiones junto con el resto de la configuración.
- **Overrides de CLI** — `--strict` (incluir reglas en cuarentena),
  `--width <cols>` y `--ascii` / `--no-ascii` (renderizado de terminal),
  `--tone blunt` (mensajes más secos), `--max-duration <sec>` (escaneo
  parcial acotado).
- Supresión de reglas y ciclo de vida de deprecación:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

Las entradas `ignore` también alimentan el comando independiente
`mjolnir suppressions`, que lista lo que está suprimido actualmente y
cuándo expira cada entrada.

---

## 📐 Códigos de salida y contratos

Congelados — seguros para construir lógica de CI encima:

| Código de salida | Significado                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `0`              | Limpio — sin hallazgos en o por encima del gate                                     |
| `1`              | Hallazgos en o por encima del gate                                                  |
| `2`              | Escaneo parcial (presupuesto de tiempo agotado, archivos ilegibles) — nunca bloquea |
| `10`             | Error de uso (flag inválido, objetivo faltante)                                     |
| `20`             | Error interno                                                                       |

El reporte JSON/SARIF es `schemaVersion: 1`. Los IDs de reglas
(`QA-<FAMILY>-NNN`) son inmutables una vez publicados y nunca se
reutilizan.

---

## Modelo de confianza

- **Local-first** — cero llamadas de red durante el escaneo. Nunca.
  Cero telemetría.
- **Sin prueba falsa** — preferimos decir "desconocido" a "verificado".
  Un repo vacío recibe `score: null`, nunca un falso 100.
- **Honestidad parcial** — si el análisis se acortó, la salida lo dice.
  Nunca "complete" cuando no lo es.
- **Cortafuegos FP** — la detección corre sobre una vista del código
  sin comentarios ni cadenas (las reglas de TypeScript usan el AST del
  compilador): un patrón dentro de un comentario de prosa o una cadena
  de ejemplo de documentación es documentación, no un hallazgo.
- **Medido, no afirmado** — solo reglas con tasa de falsos positivos de
  código OSS real salen en los tiers titulares (ver
  [Cuánto está medido](#cuánto-está-medido)); el pie del escaneo y
  `mjolnir rules --unmeasured` te dicen cuál es cuál.
- **Confianza en plugins** — los plugins son paquetes npm declarados
  bajo `"plugins"`. **No hay sandbox**: el código del plugin corre con
  todos los privilegios de Node, el mismo modelo de confianza que los
  plugins de ESLint o Vitest. Los prefijos de IDs de reglas core están
  reservados y se rechazan de los plugins para evitar suplantación.
- **Reglas externas locales al workspace** (basadas en carpeta, cero
  red) — un directorio `mjolnir-rules/` junto al objetivo del escaneo
  carga reglas personalizadas: archivos JSON declaran patrones regex
  (sin código ejecutado), los módulos `.mjs`/`.js` exportan `rules`
  (confianza plena de Node, igual que los plugins). Las reglas externas
  llevan los mismos metadatos de confianza que core; nunca pueden
  salir en el tier core (core exige una tasa de FP medida del sidecar
  de corpus — un `tier: "core"` declarado se restringe a `extended`),
  obedecen los topes de tier y se verifican contra la deriva:
  `mjolnir rules --md --external` renderiza el catálogo desde los
  archivos cargados (procedencia `external`), y el generador de matriz
  acepta `--external <root>`.

---

## 🏗️ Arquitectura

<details>
<summary>Desplegar árbol</summary>

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

- **Las reglas son funciones puras** —
  `(SourceFileContext) → Finding[]`, sin I/O, sin globales. Añadir un
  ecosistema = un adaptador + sus reglas.
- **TypeScript/Playwright usa el AST del compilador** (ts-morph).
  Python, Java y C# corren sobre una capa de regex compartida con
  comentarios/cadenas enmascarados.
- Existe una capa de AST tree-sitter WASM para Java y C# y es el
  siguiente paso de precisión — aún no está cableada al pipeline de
  escaneo síncrono.

---

## 📚 Documentación

| Documento                                              | Qué contiene                                               |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalización de la puntuación + ponderación por evidencia |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Tasas de falsos positivos medidas + método                 |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Estados de reglas, supresión, deprecación                  |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Salida SARIF + configuración de editor/CI                  |
| [docs/rules/](docs/rules/)                             | Catálogo generado por regla                                |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Setup de desarrollo + flujo de contribución                |
| [CHANGELOG.md](CHANGELOG.md)                           | Historial de versiones                                     |
| [SECURITY.md](SECURITY.md)                             | Reporte de vulnerabilidades                                |

---

## 📈 Estado

**v0.5.x · beta abierta.** El esquema JSON y los códigos de salida son
contratos congelados. TypeScript y Python tienen la cobertura medida
más amplia; Java y C# son más nuevos — léelos a través de la
[tabla de tiers](#tiers-de-reglas-y-madurez-por-lenguaje).

---

## 🤝 Contribuir

Las reglas nuevas son la contribución inicial más sencilla — un comando
genera el esqueleto de la regla más sus fixtures must-fire **y**
must-not-fire (la regla generada falla sus fixtures intencionalmente
hasta que implementes detección real — un stub no puede publicarse):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

El setup completo de desarrollo, los comandos de la barrera permanente
y las leyes anti-creep / cortafuegos de fixtures están en
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Deja de publicar tests en los que no puedes confiar.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Construido por [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
