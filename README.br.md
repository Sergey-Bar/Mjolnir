<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Seus testes estão mentindo para você. Nós provamos.

**Verification Trust Engine para QA.** O Mjölnir audita suítes de testes
e pipelines de CI, reporta uma pontuação de merecimento e mostra
exatamente onde a confiança se quebra.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | Português (Brasil) | [ไทย](README.th.md) | [Türkçe](README.tr.md) | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Seus testes merecem confiança?**

[Veja funcionando](#-veja-funcionando) ·
[Início rápido](#-início-rápido) ·
[O que ele verifica](#-o-que-o-mjölnir-verifica) ·
[Pontuação](#como-a-pontuação-funciona) ·
[CI](#-integração-ci) · [Configuração](#configuração) ·
[Documentação](#-documentação)

</div>

---

## 🎬 Veja funcionando

<p align="center">
  <img src="assets/readme/demo.svg" alt="O relatório --verbose completo do Mjölnir sobre um repo de demonstração: WORTHINESS 75/100 NEEDS WORK, um detalhamento de diagnósticos por categoria, uma lista FIX THIS FIRST e cada finding com o ID da regra e o número da linha através de CI, Playwright, higiene de testes e regras Python" width="900" />
</p>

<sub>A saída completa de `npx mjolnir-qa ./examples/demo-repo --verbose`,
renderizada pelo reporter real — nada cortado. Regenerada com
`npm run docs:demo`;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
faz a CI falhar se ela divergir do que a ferramenta imprime.</sub>

**O que acabou de acontecer:**

1. O Mjölnir descobriu as specs do Playwright, a configuração dele, o
   workflow de CI e um arquivo de teste Python — quatro
   linguagens/formatos, uma única passada.
2. Ele encontrou evidências que enfraquecem a confiança na suíte — um
   `continue-on-error` mascarando um job, um `|| true` engolindo um
   código de saída, sleeps fixos, um seletor frágil, URLs de staging
   fixas no código, uma espera `networkidle`.
3. Ele transformou cada uma em um finding concreto com ID de regra,
   localização e correção — e uma única pontuação sobre a qual você
   pode fazer o gate de uma PR.

### Um finding de perto

Execute `mjolnir explain QA-CI-001` no primeiro finding acima e você
recebe:

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

Essa é a unidade de valor: não um detalhe de estilo, mas um lugar onde
o seu CI diz que algo passou quando não passou.

---

## ⚡ Início rápido

Execute contra um repositório para um relatório completo e uma
pontuação de merecimento:

```bash
npx mjolnir-qa@latest
```

**Em CI, o produto é um comando.** Ele escaneia apenas o que a branch
tocou e sai com código diferente de zero diante de problemas novos:

```bash
npx mjolnir-qa@latest --scope changed
```

Coloque isso em um check de PR — `mjolnir ci install` escreve o
workflow — e pronto. Todo o resto é opcional.

| Comando                             | O que faz                                                    |
| ----------------------------------- | ------------------------------------------------------------ |
| `mjolnir`                           | Escaneio completo do repo + pontuação de merecimento         |
| `mjolnir --scope changed`           | Apenas o que a sua branch introduziu — a forma de CI         |
| `mjolnir ci install`                | Gera o workflow de PR consultivo                             |
| `mjolnir explain QA-CI-001`         | O quê / por quê / correção + taxa de FP medida de uma regra  |
| `mjolnir rules --unmeasured`        | As regras rodando por suposição, não por medição             |
| `mjolnir --json` / `--format sarif` | Legível por máquina / GitHub Code Scanning                   |
| `mjolnir --strict`                  | Também executa regras do tier quarentena (maior risco de FP) |

<details>
<summary><strong>Quando algo está instável</strong></summary>

| Comando                             | O que faz                                                         |
| ----------------------------------- | ----------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Dados reais de execução → vereditos `TRUE-FLAKE`, `FLAKY.md`      |
| `mjolnir triage ./test-results/`    | Proposta de quarentena a partir do histórico de execução          |
| `mjolnir pw-report ./test-results/` | Resumo de execução do Playwright — retries / flakes / mais lentos |
| `mjolnir doctor:playwright`         | Escaneio profundo só do Playwright + Selector Health Score        |

</details>

<details>
<summary><strong>Ocasional / relatórios</strong></summary>

| Comando                         | O que faz                                                  |
| ------------------------------- | ---------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Correções automáticas seguras com prova                    |
| `mjolnir baseline` / `diff`     | Snapshot de findings, depois reporta só novos/piorados     |
| `mjolnir impact --since <ref>`  | O que mudou desde um commit anterior                       |
| `mjolnir debt`                  | Registro de dívida de testes com um modelo de custo        |
| `mjolnir handover`              | Mapa de onboarding da suíte para um novo QA                |
| `mjolnir stats`                 | Contadores locais históricos de correções vistas           |
| `mjolnir badge`                 | JSON de endpoint do shields.io + snippet                   |
| `mjolnir rules --md`            | Catálogo completo de regras (JSON ou Markdown)             |
| `mjolnir doctor`                | Autoauditoria da própria base de regras do Mjölnir         |
| `mjolnir create-rule <ID>`      | Gera o esqueleto de uma nova regra + fixtures              |
| `mjolnir --format mermaid`      | Diagrama de arquitetura de testes para um comentário de PR |

</details>

Instale globalmente em vez de usar `npx` se preferir:
`npm i -g mjolnir-qa`. Requer Node.js ≥ 22.18. Funciona no Windows,
macOS e Linux.

---

## 👥 Para quem é isto?

- **QA / SDET** donos de uma suíte e2e ou de integração que precisam de
  evidências de que a suíte realmente merece o visto verde que produz.
- **Equipes de Plataforma / DevEx** responsáveis pela integridade de CI
  e pelos release gates — as pessoas que se importam que um
  `continue-on-error` nunca torne uma pipeline vermelha verde em
  silêncio.
- **Mantenedores de OSS** que querem um gate de verificação barato,
  sempre ativo, que roda localmente e na CI sem chamadas de rede.

---

## 🔨 O que o Mjölnir verifica

|     |                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------ |
| ⚖️  | **Pontuação de merecimento** — um número, tabela de deduções transparente, sem caixa-preta                                     |
| 🎭  | **Selector Health Score** — avalia seus locators do Playwright, não só sua taxa de aprovação                                   |
| 🔬  | **Forense de runtime** — lê dados reais de execução Playwright/JUnit para detectar `TRUE-FLAKE`, não apenas palpites estáticos |
| 🚨  | **Regras de integridade de CI** — pega `continue-on-error`, `\|\| true` e outros truques de falso verde                        |
| 🐍  | **Todos os quatro bindings do Playwright** — TypeScript, Python, Java, C#/.NET — mais pytest, JUnit/TestNG e workflows de CI   |
| 🔒  | **Local-first** — zero chamadas de rede durante o escaneio, zero telemetria, roda em segundos                                  |

### As regras

Cada regra vem com fixtures must-fire **e** must-not-fire. Uma regra
que dispara na própria fixture negativa não pode ser publicada — esse
é o firewall de falsos positivos.

<details>
<summary><strong>Higiene de testes</strong></summary>

| ID          | Regra                                               | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | Teste focado commitado (`.only`, `fit`)             | error    |
| QA-TEST-002 | Teste pulado sem justificativa                      | error    |
| QA-TEST-002 | Teste pulado com justificativa registrada           | warning  |
| QA-TEST-003 | Teste sem asserções                                 | error    |
| QA-TEST-004 | Sleep fixo (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Abuso de retry escondendo instabilidade             | warning  |
| QA-TEST-010 | Corpo de teste vazio                                | error    |

</details>

<details>
<summary><strong>Qualidade de testes</strong></summary>

| ID           | Regra                         | Severity |
| ------------ | ----------------------------- | -------- |
| QA-TQUAL-001 | Verificação só com mocks      | info     |
| QA-TQUAL-002 | Asserção tautológica          | error    |
| QA-TQUAL-009 | Asserção de promise sem await | error    |
| QA-TQUAL-011 | Testes comentados             | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Regra                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PW-002 | Asserção de locator sem await                 | error    |
| QA-PW-003 | `page.pause()` / `test.only()` commitados     | error    |
| QA-PW-004 | Seletores CSS/XPath frágeis                   | warning  |
| QA-PW-005 | Lógica de negócio dentro de `page.evaluate()` | info     |
| QA-PW-114 | Element handles legados (`page.$`)            | info     |
| QA-PW-118 | Esperas `networkidle` (instáveis por design)  | info     |
| QA-PW-123 | URLs de ambiente fixas no código              | warning  |

</details>

<details>
<summary><strong>Integridade de CI</strong></summary>

| ID        | Regra                                                                   | Severity |
| --------- | ----------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` mascara falhas                                      | error    |
| QA-CI-002 | `\|\| true` engole códigos de saída                                     | error    |
| QA-CI-005 | Relatório consumido mas nunca gerado                                    | error    |
| QA-CI-007 | Wrappers de retry em torno de testes                                    | warning  |
| QA-CI-008 | Step sempre bem-sucedido mascara falhas                                 | error    |
| QA-CI-009 | Código de saída do teste não propagado (`\|` sem pipefail, cadeias `;`) | error    |
| QA-CI-010 | Testes pulados onde devem bloquear (guardas skip-on-PR)                 | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Regra                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PY-002 | Teste pulado (`skip`, `xfail` não estrito)    | warning  |
| QA-PY-003 | Função de teste sem asserções                 | error    |
| QA-PY-005 | `time.sleep()` em testes                      | warning  |
| QA-PY-006 | Corpo de teste vazio (`pass`)                 | info     |
| QA-PY-010 | Dependência de aleatoriedade/tempo sem freeze | info     |
| QA-PY-012 | Asserção tautológica                          | error    |

20 regras Python no total (QA-PY-001…012 higiene pytest + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Regra                                       | Severity |
| --------- | ------------------------------------------- | -------- |
| QA-JV-101 | Teste desabilitado (`@Disabled`)            | warning  |
| QA-JV-102 | Sleep fixo (`Thread.sleep()`)               | warning  |
| QA-JV-103 | Método de teste sem asserções               | error    |
| QA-JV-105 | Sleep fixo do Playwright `waitForTimeout()` | warning  |
| QA-JV-106 | Seletor frágil em vez de role locator       | warning  |
| QA-JV-108 | URL de ambiente fixa no teste               | info     |
| QA-JV-111 | Mock generalizado `page.route("**")`        | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Regra                                      | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-CS-101 | Teste pulado (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Sleep fixo (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Método de teste sem asserções              | error    |
| QA-CS-105 | Sleep fixo `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | Seletor frágil em vez de role locator      | warning  |
| QA-CS-108 | URL de ambiente fixa no teste              | info     |
| QA-CS-111 | Mock generalizado `page.RouteAsync("**")`  | info     |

</details>

> O catálogo completo e vivo — cada regra com tier, confidence, risco de
> falso positivo e disponibilidade de autofix — é gerado a partir do
> registro:
>
> ```bash
> mjolnir rules --md
> ```
>
> As páginas por regra ficam em [`docs/rules/`](docs/rules/).

### Quanto disso é medido

**74 de 99 regras carregam uma taxa de falsos positivos medida contra
código OSS real** (≥ 10 findings classificados à mão cada; veja
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). As outras 19 são publicadas com
a estimativa do autor. O rodapé de cada escaneio diz quantas das regras
_que dispararam_ são medidas; `mjolnir rules --unmeasured` lista as que
não são; a página `mjolnir explain` de cada regra declara seu status.
Publicamos a taxa mesmo quando ela é feia — QA-CS-103 audita em 95 % e
está em quarentena por isso. Fazer esse 78 crescer é o trabalho contínuo
do projeto.

### Tiers de regras e maturidade por linguagem

Cada regra é `core`, `extended` ou `quarantine`, atribuído a partir de
sua taxa de falsos positivos **medida**:

| Tier         | Significado                                 | Escaneio padrão | `--strict` |
| ------------ | ------------------------------------------- | :-------------: | :--------: |
| `core`       | ≤ 10 % de FP medido                         |       ✅        |     ✅     |
| `extended`   | ≤ 30 % de FP medido                         |       ✅        |     ✅     |
| `quarantine` | acima de 30 %, ou ainda não medido (n < 10) |       ❌        |     ✅     |

| Linguagem       | Adaptador         | Cobertura hoje                                                   |
| --------------- | ----------------- | ---------------------------------------------------------------- |
| TypeScript / JS | AST do compilador | a mais ampla, a mais medida — majoritariamente `core`/`extended` |
| Python / pytest | Camada regex      | ampla, auditada em corpus — majoritariamente `core`/`extended`   |
| Java            | Camada regex      | mais novo — majoritariamente `extended`/`quarantine`             |
| C# / .NET       | Camada regex      | mais novo — majoritariamente `extended`/`quarantine`             |

TypeScript e Python têm a cobertura medida mais ampla. Java e C# são
publicados, documentados, e ficam fora do número de destaque até que uma
suíte consumidora real (não os próprios testes de uma biblioteca de
binding) seja auditada.

---

## Como a pontuação funciona

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Saída de terminal do Mjölnir — WORTHINESS 75/100 NEEDS WORK, um detalhamento de diagnósticos por categoria e uma lista FIX THIS FIRST" width="820" />
</p>

<sub>Regenerada com `npm run docs:hero`;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
faz a CI falhar se ela divergir do que o reporter realmente imprime.</sub>

A pontuação é transparente: **error −8, warning −3, info −1**, depois
normalizada pela exposição da suíte (deduções por declaração de teste).
Deduções ponderadas por evidência significam que sinais fracos custam
menos. O terminal mostra os mesmos números descontados que a pontuação
usa — sem caixa-preta. Método completo:
[docs/SCORING.md](docs/SCORING.md).

**Vereditos**

| Score   | Veredito         |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Níveis de evidência** — cada finding carrega um; ele define o peso do
finding na pontuação:

| Nível | Significado            | Impacto na pontuação | Exemplo                                                |
| ----- | ---------------------- | -------------------- | ------------------------------------------------------ |
| E2    | Defeito determinístico | Dedução total        | `.only` commitado — estruturalmente provável           |
| E1    | Padrão heurístico      | Meia dedução         | `sleep()` detectado por regex — sinal forte, não prova |
| E0    | Observação             | Zero (só info)       | Reportado mas nunca faz gate de CI nem deduz           |

A maioria das regras é **E1**. O lema "we prove it" se refere a este
sistema: findings E2 são prova estrutural; findings E1 são avisos
corretamente posicionados, não provas formais.

Um repo vazio pontua `null`, nunca um falso 100 — veja o
[Modelo de confiança](#modelo-de-confiança).

---

## 🎭 Selector Health Score

A métrica de destaque para suítes Playwright — quão resilientes são os
seus locators:

```text
▚ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Locators baseados em role pontuam o máximo. Cadeias de classes CSS e
XPath afundam a pontuação — eles quebram em qualquer refactor do DOM
sem dizer qual comportamento regrediu.

---

## 🔬 Evidência de runtime

Detecção estática de instabilidade é adivinhação. O Mjölnir lê **dados
reais de execução** — relatórios JSON do Playwright e XML do JUnit de
qualquer runner:

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

Um teste que só passa no attempt ≥ 2 não é um teste que passa — é um
teste sortudo. Ele é marcado como `TRUE-FLAKE` independentemente do
visto verde final.

---

## ⚡ O Mjölnir não é mais um linter

Linters dizem se o código segue regras. O Mjölnir diz se a sua
verificação pode ser confiada.

|                                                                   | ESLint / SonarQube | Ferramentas de coverage | Revisão manual | **Mjölnir** |
| ----------------------------------------------------------------- | :----------------: | :---------------------: | :------------: | :---------: |
| Integridade de workflows de CI (`continue-on-error`, `\|\| true`) |         ❌         |           ❌            |   raramente    |     ✅      |
| Multilinguagem (TS, Python, Java, C#) a partir de uma ferramenta  |         ❌         |           ❌            |       ❌       |     ✅      |
| Avalia a resiliência de locators do Playwright (Selector Health)  |         ❌         |           ❌            |   raramente    |     ✅      |
| Sinaliza testes sem asserções reais                               |   ✅ (plugin)\*    |           ❌            |    às vezes    |     ✅      |
| Pega sleeps fixos (`waitForTimeout`, `time.sleep`)                |   ✅ (plugin)\*    |           ❌            |    às vezes    |     ✅      |
| Roda em segundos, zero chamadas de rede durante o escaneio        |         ✅         |           ✅            |       —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) e `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) cobrem isso para seus
respectivos frameworks.

**A análise de runtime** é uma categoria à parte do linting estático:

|                                                        | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| ------------------------------------------------------ | :-----------------------: | :-------------------: | :-------------------: |
| Lê dados reais de execução para vereditos `TRUE-FLAKE` |         parcial\*         |     parcial (tag)     |          ✅           |
| Relatório de triagem de instabilidade do histórico     |            ❌             |          ✅           |          ✅           |
| Integra-se à pontuação de merecimento estática         |            ❌             |          ❌           |          ✅           |

\*O Playwright rastreia retries internamente mas não produz um relatório
de instabilidade autônomo com rótulos de veredito.

---

## 🤖 Por que não usar apenas revisão de código com IA?

Problema diferente, camada diferente. A revisão com IA pode detectar uma
mudança suspeita de teste em um diff; ela não prova que o sistema de
verificação como um todo é confiável — e só vê o diff que você mostra.

|                                              | Revisão de código com IA (Copilot etc.) |             **Mjölnir**             |
| -------------------------------------------- | :-------------------------------------: | :---------------------------------: |
| Custo por escaneio                           |  Tokens (escala com o tamanho do diff)  |     **Zero** (local, instalado)     |
| Vê toda a suíte + todas as configs de CI     |     Só o diff da PR que você mostra     |         **Tudo, toda vez**          |
| Determinístico (mesma entrada → mesma saída) |         ❌ (não determinístico)         |               **✅**                |
| Pega padrões dormentes por meses             |        Só se estiver no contexto        | **✅** (escaneia todos os arquivos) |
| Lembra dos findings entre execuções          |     ❌ (sem memória entre sessões)      |      **✅** (baseline + diff)       |
| Roda sem gatilho humano                      |       Precisa de uma PR ou prompt       |   **✅** (hook de CI, 3 segundos)   |

**Use ambos.** A IA captura nuance, intenção e defeitos de design que
nenhuma regex encontra. O Mjölnir captura os padrões estruturais que a
IA ignora porque parecem "intencionais" — um `.only` commitado, um
código de saída engolido, um `continue-on-error` em um job de teste.
Não são bugs que precisam de raciocínio; são fatos que precisam de
escaneio.

---

## 🤖 Integração CI

Um comando gera um workflow de PR — consultivo por padrão, nunca
bloqueante:

```bash
mjolnir ci install
```

Ou conecte-o nativamente ao GitHub Code Scanning via SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Configuração de editor e pipeline para SARIF:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Cobertura de escopo alterado

`--scope changed` atribui findings às linhas adicionadas na sua branch
em relação ao merge-base com `main`. Ele cobre arquivos de teste
(`*.spec.*`, `*.test.*`) mais arquivos de workflow do GitHub e
configurações do Playwright no diff. Quando o merge-base não pode ser
resolvido — clone raso, HEAD detached, alvo sem git, branch padrão
diferente — ele degrada com honestidade: os findings voltam à
atribuição por arquivo inteiro e o relatório diz isso. Sobrescreva a ref
base com `--base <ref>`.

---

## Configuração

O Mjölnir é zero-config. Um `mjolnir.config.json` opcional (ou
`.mjolnir.json`) na raiz do repo ajusta severidade, gating e escopo —
ele nunca muda a semântica de detecção.

| Key                 | Tipo                                 | Efeito                                                                                                                                                                              |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Globs de ignore adicionais (subconjunto do gitignore), além dos padrões embutidos                                                                                                   |
| `gate`              | `"advisory" \| "error" \| "warning"` | Quais severidades saem com código diferente de zero (padrão `error`; `advisory` nunca bloqueia)                                                                                     |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Reordena os findings de uma regra para o seu repo                                                                                                                                   |
| `ignore`            | `IgnoreEntry[]`                      | Suprime findings — **`reason` é obrigatório**; as entradas expiram após 90 dias (uma data `expires` explícita, ou a data de modificação do arquivo de config para entradas sem ela) |
| `plugins`           | `string[]`                           | Pacotes de regras de terceiros (veja o [Modelo de confiança](#modelo-de-confiança))                                                                                                 |

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

- **`.mjolnirignore`** — um arquivo simples no estilo gitignore para
  exclusões de caminhos, mesmo dialeto do `exclude`. Use-o para ruído
  específico da máquina; use `exclude` quando a lista pertence ao
  controle de versão, junto com o resto da configuração.
- **Overrides de CLI** — `--strict` (incluir regras de quarentena),
  `--width <cols>` e `--ascii` / `--no-ascii` (renderização no
  terminal), `--tone blunt` (mensagens mais secas),
  `--max-duration <sec>` (escaneio parcial limitado).
- Supressão de regras e ciclo de vida de deprecação:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

As entradas `ignore` também alimentam o comando autônomo
`mjolnir suppressions`, que lista o que está suprimido no momento e
quando cada entrada expira.

---

## 📐 Códigos de saída e contratos

Congelados — seguros para construir lógica de CI por cima:

| Código de saída | Significado                                                                         |
| --------------- | ----------------------------------------------------------------------------------- |
| `0`             | Limpo — nenhum finding no nível do gate ou acima                                    |
| `1`             | Findings no nível do gate ou acima                                                  |
| `2`             | Escaneio parcial (orçamento de tempo esgotado, arquivos ilegíveis) — nunca bloqueia |
| `10`            | Erro de uso (flag inválida, alvo ausente)                                           |
| `20`            | Erro interno                                                                        |

O relatório JSON/SARIF é `schemaVersion: 1`. Os IDs de regra
(`QA-<FAMILY>-NNN`) são imutáveis uma vez publicados e nunca reutilizados.

---

## Modelo de confiança

- **Local-first** — zero chamadas de rede durante o escaneio. Nunca.
  Zero telemetria.
- **Nenhuma prova falsa** — preferimos dizer "desconhecido" a
  "verificado". Um repo vazio recebe `score: null`, nunca um falso 100.
- **Honestidade parcial** — se a análise foi interrompida, a saída diz
  isso. Nunca "complete" quando não está.
- **Firewall de FP** — a detecção roda sobre uma visão do código sem
  comentários/strings (as regras TypeScript usam o AST do compilador):
  um padrão dentro de um comentário de prosa ou de uma string de
  exemplo de documentação é documentação, não um finding.
- **Medido, não afirmado** — apenas regras com taxa de falsos positivos
  de código OSS real entram nos tiers de destaque (veja
  [Quanto disso é medido](#quanto-disso-é-medido)); o rodapé do
  escaneio e o `mjolnir rules --unmeasured` dizem qual é qual.
- **Confiança em plugins** — plugins são pacotes npm declarados sob
  `"plugins"`. **Não há sandbox**: o código do plugin roda com todos os
  privilégios do Node, o mesmo modelo de confiança dos plugins ESLint
  ou Vitest. Prefixos de IDs de regras core são reservados e rejeitados
  de plugins para evitar falsificação.
- **Regras externas locais ao workspace** (baseadas em pasta, zero
  rede) — um diretório `mjolnir-rules/` ao lado do alvo do escaneio
  carrega regras personalizadas: arquivos JSON declaram padrões regex
  (nenhum código executado), módulos `.mjs`/`.js` exportam `rules`
  (confiança total do Node, como os plugins). Regras externas carregam
  os mesmos metadados de confiança do core; elas nunca podem entrar no
  tier core (core exige uma taxa de FP medida do sidecar de corpus — um
  `tier: "core"` declarado é limitado a `extended`), obedecem aos tetos
  de tier e são verificadas contra deriva:
  `mjolnir rules --md --external` renderiza o catálogo a partir dos
  arquivos carregados (proveniência `external`), e o gerador de matriz
  aceita `--external <root>`.

---

## 🏗️ Arquitetura

<details>
<summary>Expandir árvore</summary>

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

- **Regras são funções puras** — `(SourceFileContext) → Finding[]`,
  sem I/O, sem globais. Adicionar um ecossistema = um adaptador + suas
  regras.
- **TypeScript/Playwright usa o AST do compilador** (ts-morph). Python,
  Java e C# rodam em uma camada regex compartilhada com
  comentários/strings mascarados.
- Uma camada de AST tree-sitter WASM para Java e C# existe e é o
  próximo passo de precisão — ainda não está ligada ao pipeline de
  escaneio síncrono.

---

## 📚 Documentação

| Documento                                              | O que contém                                         |
| ------------------------------------------------------ | ---------------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Normalização da pontuação + ponderação por evidência |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Taxas de falsos positivos medidas + método           |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Estados de regras, supressão, deprecação             |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | Saída SARIF + configuração de editor/CI              |
| [docs/rules/](docs/rules/)                             | Catálogo gerado por regra                            |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Setup de dev + fluxo de contribuição                 |
| [CHANGELOG.md](CHANGELOG.md)                           | Histórico de releases                                |
| [SECURITY.md](SECURITY.md)                             | Relato de vulnerabilidades                           |

---

## 📈 Status

**v0.5.x · beta aberto.** O schema JSON e os códigos de saída são
contratos congelados. TypeScript e Python têm a cobertura medida mais
ampla; Java e C# são mais novos — leia-os através da
[tabela de tiers](#tiers-de-regras-e-maturidade-por-linguagem).

---

## 🤝 Contribuir

Novas regras são a primeira contribuição mais fácil — um comando gera o
esqueleto da regra mais suas fixtures must-fire **e** must-not-fire (a
regra gerada falha nas fixtures de propósito até você implementar
detecção real — um stub não pode ser publicado):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Setup completo de dev, os comandos do gate permanente e as leis
anti-creep / firewall de fixtures estão no
[CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**Pare de publicar testes em que não pode confiar.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Construído por [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
