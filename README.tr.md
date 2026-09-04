<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Testlerin sana yalan söylüyor. Biz kanıtlıyoruz.

**QA için Verification Trust Engine.** Mjölnir test takımlarını ve CI
boru hatlarını denetler, güvenilirlik puanı bildirir ve güvenin tam
olarak nerede kırıldığını gösterir.

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=C9A227&labelColor=0B0F17)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0B0F17)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-C9A227.svg?style=flat-square&labelColor=0B0F17)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-2E8C7F.svg?style=flat-square&labelColor=0B0F17)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh.md) | [繁體中文](README.zht.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Dansk](README.da.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Русский](README.ru.md) | [Norsk](README.no.md) | [Português (Brasil)](README.br.md) | [ไทย](README.th.md) | Türkçe | [Українська](README.uk.md) | [বাংলা](README.bn.md) | [Ελληνικά](README.gr.md) | [Tiếng Việt](README.vi.md) | [עברית](README.he.md) | [العربية](README.ar.md) | [Bosanski](README.bs.md)

> 🤖 Machine-assisted translation. The [English README](README.md) is canonical. Last synced: 2026-09-04.

```bash
npx mjolnir-qa@latest
```

**Testleriniz güvenilmeye değer mi?**

[Nasıl çalıştığını gör](#-nasıl-çalıştığını-gör) ·
[Hızlı başlangıç](#-hızlı-başlangıç) ·
[Neleri kontrol eder](#-mjölnir-neleri-kontrol-eder) ·
[Puanlama](#puanlama-nasıl-çalışır) ·
[CI](#-ci-entegrasyonu) · [Yapılandırma](#yapılandırma) ·
[Belgelendirme](#-belgelendirme)

</div>

---

## 🎬 Nasıl çalıştığını gör

<p align="center">
  <img src="assets/readme/demo.svg" alt="Mjölnir'in demo bir repo üzerindeki eksiksiz --verbose raporu: WORTHINESS 75/100 NEEDS WORK, kategori bazında teşhis dökümü, FIX THIS FIRST listesi ve her bulgu için kural kimliği ile satır numarası — CI, Playwright, test hijyeni ve Python kuralları boyunca" width="900" />
</p>

<sub>`npx mjolnir-qa ./examples/demo-repo --verbose` çıktısının tam hali,
gerçek reporterdan render edildi — hiçbir şey kırpılmadı.
`npm run docs:demo` ile yeniden üretilir;
[`tests/demo-asset-reproducibility.spec.ts`](tests/demo-asset-reproducibility.spec.ts)
dosyası, çıktı aracın bastığından saptarsa CI'ı düşürür.</sub>

**Az önce olanlar:**

1. Mjölnir, Playwright spesifikasyonlarını, kendi yapılandırmasını, CI
   workflow'unu ve bir Python test dosyasını keşfetti — dört
   dil/format, tek geçiş.
2. Takımın güvenini zayıflatan kanıtlar buldu — bir işi maskeden
   geçiren `continue-on-error`, bir exit kodunu yutan `|| true`, katı
   sleep'ler, kırılgan bir seçici, sabitlenmiş staging URL'leri, bir
   `networkidle` beklemesi.
3. Her birini kural kimliği, konum ve düzeltme içeren somut bir bulguya
   — ve bir PR'ı gate'leyebileceğin tek bir puana dönüştürdü.

### Yakın plandan bir bulgu

Yukarıdaki ilk bulgu için `mjolnir explain QA-CI-001` komutunu çalıştırın,
elde edeceğiniz:

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

İşte değer birimi: stil özürü değil, CI'ınızın bir şeyin geçtiğini
söylediği — oysa geçmediği — bir yer.

---

## ⚡ Hızlı başlangıç

Tam rapor ve güvenilirlik puanı için bir repoda çalıştırın:

```bash
npx mjolnir-qa@latest
```

**CI'da ürün tek komuttur.** Yalnızca branch'in dokunduğu şeyi tarar ve
yeni sorunlarda sıfır olmayan kodla çıkar:

```bash
npx mjolnir-qa@latest --scope changed
```

Bunu bir PR kontrolüne koyun — `mjolnir ci install` workflow'u yazar —
ve bitti. Gerisi opsiyoneldir.

| Komut                               | Ne yapar                                                            |
| ----------------------------------- | ------------------------------------------------------------------- |
| `mjolnir`                           | Tüm repo taraması + güvenilirlik puanı                              |
| `mjolnir --scope changed`           | Yalnızca branch'inin getirdikleri — CI biçimi                       |
| `mjolnir ci install`                | Danışmanlık PR workflow'unu üretir                                  |
| `mjolnir explain QA-CI-001`         | Ne / neden / düzeltme + bir kural için ölçülmüş FP oranı            |
| `mjolnir rules --unmeasured`        | Ölçümle değil varsayımla çalışan kurallar                           |
| `mjolnir --json` / `--format sarif` | Makine okunur / GitHub Code Scanning                                |
| `mjolnir --strict`                  | Quarantine katmanı kurallarını da çalıştırır (daha yüksek FP riski) |

<details>
<summary><strong>Bir şey flaky olduğunda</strong></summary>

| Komut                               | Ne yapar                                                        |
| ----------------------------------- | --------------------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Gerçek çalıştırma verileri → `TRUE-FLAKE` hükümleri, `FLAKY.md` |
| `mjolnir triage ./test-results/`    | Yürütme geçmişinden karantina önerisi                           |
| `mjolnir pw-report ./test-results/` | Playwright çalıştırma özeti — retry / flake / en yavaşlar       |
| `mjolnir doctor:playwright`         | Yalnızca Playwright derin tarama + Selector Health Score        |

</details>

<details>
<summary><strong>Nadiren / raporlar</strong></summary>

| Komut                           | Ne yapar                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| `mjolnir fix --dry-run` / `fix` | Kanıtlı, güvenli otomatik düzeltmeler                            |
| `mjolnir baseline` / `diff`     | Bulguların anlık görüntüsü, sonra yalnızca yeni/kötüleşen raporu |
| `mjolnir impact --since <ref>`  | Önceki bir commit'ten bu yana ne değişti                         |
| `mjolnir debt`                  | Maliyet modeliyle test borcu defteri                             |
| `mjolnir handover`              | Yeni QA için takım devralma haritası                             |
| `mjolnir stats`                 | Görülen düzeltmelerin yerel, tüm-zaman sayaçları                 |
| `mjolnir badge`                 | shields.io endpoint JSON'u + snippet                             |
| `mjolnir rules --md`            | Tam kural kataloğu (JSON veya Markdown)                          |
| `mjolnir doctor`                | Mjölnir'in kendi kural tabanının iç denetimi                     |
| `mjolnir create-rule <ID>`      | Yeni kural + fixture iskeleti                                    |
| `mjolnir --format mermaid`      | PR yorumu için test mimarisi diyagramı                           |

</details>

Tercih ediyorsanız `npx` yerine global kurun: `npm i -g mjolnir-qa`.
Node.js ≥ 22.18 gerekir. Windows, macOS ve Linux'ta çalışır.

---

## 👥 Kimin için?

- **QA / SDET** — e2e veya entegrasyon takımına sahip, takımın ürettiği
  yeşil onayın gerçekten hak edildiğine dair kanıt gerektiren kişiler.
- **Platform / DevEx ekipleri** — CI bütünlüğünden ve release
  kapılarından sorumlu; bir `continue-on-error`'ın kırmızı hattı sessizce
  yeşile boyamasını istemeyenler.
- **OSS bakıcıları** — yerel ve CI'da, sıfır ağ çağrısıyla çalışan ucuz,
  her zaman açık bir doğrulama kapısı isteyenler.

---

## 🔨 Mjölnir neleri kontrol eder

|     |                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Güvenilirlik puanı** — tek sayı, şeffaf kesinti tablosu, kara kutu yok                                                        |
| 🎭  | **Selector Health Score** — yalnızca geçiş oranınızı değil, Playwright locator'larınızı not eder                                |
| 🔬  | **Çalışma zamanı adli analizi** — gerçek Playwright/JUnit verilerini okur ve `TRUE-FLAKE` yakalar, yalnızca statik tahmin değil |
| 🚨  | **CI bütünlüğü kuralları** — `continue-on-error`, `\|\| true` ve diğer yanlış-yeşil hilelerini yakalar                          |
| 🐍  | **Dört Playwright bağlamasının hepsi** — TypeScript, Python, Java, C#/.NET — artı pytest, JUnit/TestNG ve CI workflow'ları      |
| 🔒  | **Local-first** — tarama sırasında sıfır ağ çağrısı, sıfır telemetri, saniyeler içinde çalışır                                  |

### Kurallar

Her kural, must-fire **ve** must-not-fire fixture'larıyla gelir.
Kendi negatif fixture'ında tetiklenen bir kural sevk edilemez — bu,
yanlış pozitif duvarıdır.

<details>
<summary><strong>Test hijyeni</strong></summary>

| ID          | Kural                                               | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | Commit edilmiş odaklı test (`.only`, `fit`)         | error    |
| QA-TEST-002 | Gerekçesiz atlanan test                             | error    |
| QA-TEST-002 | Kayıtlı gerekçeyle atlanan test                     | warning  |
| QA-TEST-003 | Assertion içermeyen test                            | error    |
| QA-TEST-004 | Katı sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Flakiness'i gizleyen retry istismarı                | warning  |
| QA-TEST-010 | Boş test gövdesi                                    | error    |

</details>

<details>
<summary><strong>Test kalitesi</strong></summary>

| ID           | Kural                               | Severity |
| ------------ | ----------------------------------- | -------- |
| QA-TQUAL-001 | Yalnızca mock ile doğrulama         | info     |
| QA-TQUAL-002 | Totolojik assertion                 | error    |
| QA-TQUAL-009 | Await edilmemiş promise assertion'ı | error    |
| QA-TQUAL-011 | Yorum satırına çevrilmiş testler    | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Kural                                         | Severity |
| --------- | --------------------------------------------- | -------- |
| QA-PW-002 | Await edilmemiş locator assertion'ı           | error    |
| QA-PW-003 | Commit edilmiş `page.pause()` / `test.only()` | error    |
| QA-PW-004 | Kırılgan CSS/XPath seçicileri                 | warning  |
| QA-PW-005 | `page.evaluate()` içinde iş mantığı           | info     |
| QA-PW-114 | Eski element handle'ları (`page.$`)           | info     |
| QA-PW-118 | `networkidle` beklemeleri (flaky by design)   | info     |
| QA-PW-123 | Sabitlenmiş ortam URL'leri                    | warning  |

</details>

<details>
<summary><strong>CI bütünlüğü</strong></summary>

| ID        | Kural                                                                 | Severity |
| --------- | --------------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` başarısızlıkları maskeler                         | error    |
| QA-CI-002 | `\|\| true` exit kodlarını yutar                                      | error    |
| QA-CI-005 | Rapor tüketilir ama asla üretilmez                                    | error    |
| QA-CI-007 | Testleri saran retry sarmalayıcıları                                  | warning  |
| QA-CI-008 | Hepsi-başarılı adım başarısızlıkları maskeler                         | error    |
| QA-CI-009 | Test exit kodu iletilmez (`\|` pipefail'sız, `;` zincirleri)          | error    |
| QA-CI-010 | Testler, bloklaması gereken yerlerde atlanıyor (skip-on-PR bekçileri) | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Kural                                        | Severity |
| --------- | -------------------------------------------- | -------- |
| QA-PY-002 | Atlanan test (`skip`, katı olmayan `xfail`)  | warning  |
| QA-PY-003 | Assertion içermeyen test fonksiyonu          | error    |
| QA-PY-005 | Testlerde `time.sleep()`                     | warning  |
| QA-PY-006 | Boş test gövdesi (`pass`)                    | info     |
| QA-PY-010 | Freeze olmadan rastgelelik/zaman bağımlılığı | info     |
| QA-PY-012 | Totolojik assertion                          | error    |

Toplam 20 Python kuralı (QA-PY-001…012 pytest hijyeni + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Kural                                    | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | Devre dışı test (`@Disabled`)            | warning  |
| QA-JV-102 | Katı sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Assertion içermeyen test yöntemi         | error    |
| QA-JV-105 | Playwright katı sleep `waitForTimeout()` | warning  |
| QA-JV-106 | Role locator yerine kırılgan seçici      | warning  |
| QA-JV-108 | Testte sabitlenmiş ortam URL'si          | info     |
| QA-JV-111 | Kapsayıcı mock `page.route("**")`        | info     |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Kural                                      | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-CS-101 | Atlanan test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Katı sleep (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Assertion içermeyen test yöntemi           | error    |
| QA-CS-105 | Katı sleep `WaitForTimeoutAsync()`         | warning  |
| QA-CS-106 | Role locator yerine kırılgan seçici        | warning  |
| QA-CS-108 | Testte sabitlenmiş ortam URL'si            | info     |
| QA-CS-111 | Kapsayıcı mock `page.RouteAsync("**")`     | info     |

</details>

> Tam canlı katalog — her kuralın tier'i, güveni, yanlış pozitif riski ve
> autofix kullanılabilirliğiyle — kayıt defterinden üretilir:
>
> ```bash
> mjolnir rules --md
> ```
>
> Kural başına sayfalar [`docs/rules/`](docs/rules/) altındadır.

### Ne kadarı ölçülmüş

**99 kuraldan 74'ü, gerçek OSS koduna karşı ölçülmüş bir yanlış pozitif
oranı taşıyor** (her biri için ≥ 10 elle sınıflandırılmış bulgu; bkz.
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). Diğer 19'u yazarın tahminine göre
yayına giriyor. Her tarama alt bilgisi, _tetiklenen_ kuralların kaçının
ölçüldüğünü söyler; `mjolnir rules --unmeasured` ölçülmeyenleri listeler;
her kuralın `mjolnir explain` sayfası durumunu belirtir. Oranı çirkin
olduğunda bile yayımlarız — QA-CS-103 %95 ile denetleniyor ve bu yüzden
karantinada. O 78'i büyütmek, projenin süregelen işidir.

### Kural katmanları ve dil olgunluğu

Her kural, **ölçülmüş** yanlış pozitif oranına göre atanmış `core`,
`extended` veya `quarantine` olur:

| Tier         | Anlamı                                      | Varsayılan tarama | `--strict` |
| ------------ | ------------------------------------------- | :---------------: | :--------: |
| `core`       | ≤ %10 ölçülmüş FP                           |        ✅         |     ✅     |
| `extended`   | ≤ %30 ölçülmüş FP                           |        ✅         |     ✅     |
| `quarantine` | %30 üzerinde veya henüz ölçülmemiş (n < 10) |        ❌         |     ✅     |

| Dil             | Adaptör       | Bugünkü kapsam                                           |
| --------------- | ------------- | -------------------------------------------------------- |
| TypeScript / JS | Derleyici AST | en geniş, en çok ölçülmüş — çoğunlukla `core`/`extended` |
| Python / pytest | Regex katmanı | geniş, corpus denetimli — çoğunlukla `core`/`extended`   |
| Java            | Regex katmanı | daha yeni — çoğunlukla `extended`/`quarantine`           |
| C# / .NET       | Regex katmanı | daha yeni — çoğunlukla `extended`/`quarantine`           |

TypeScript ve Python en geniş ölçülmüş kapsama sahiptir. Java ve C#
sevk edildi, belgelendi ve gerçek bir tüketici takımı (bir bağlama
kütüphanesinin kendi testleri değil) denetlenene kadar başlık sayısının
dışında kalır.

---

## Puanlama nasıl çalışır

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir terminal çıktısı — WORTHINESS 75/100 NEEDS WORK, kategori bazında teşhis dökümü ve FIX THIS FIRST listesi" width="820" />
</p>

<sub>`npm run docs:hero` ile yeniden üretilir;
[`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts)
dosyası, çıktı reporter'ın gerçekten bastığından saptarsa CI'ı düşürür.</sub>

Puan şeffaftır: **error −8, warning −3, info −1**, ardından takım
maruziyetine göre normalizasyon (test bildirimi başına kesinti).
Kanıtla ağırlıklandırılan kesintiler, zayıf sinyallerin daha az pahalı
olduğu anlamına gelir. Terminal, puanın kullandığı aynı iskontolu
sayıları gösterir — kara kutu yok. Tam yöntem:
[docs/SCORING.md](docs/SCORING.md).

**Hükümler**

| Score   | Hüküm            |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Kanıt düzeyleri** — her bulgu bir tane taşır; bulgunun puan içindeki
ağırlığını belirler:

| Düzey | Anlamı            | Puana etkisi          | Örnek                                                     |
| ----- | ----------------- | --------------------- | --------------------------------------------------------- |
| E2    | Belirleyici kusur | Tam kesinti           | Commit edilmiş `.only` — yapısal olarak kanıtlanabilir    |
| E1    | Sezgisel örüntü   | Yarım kesinti         | Regex ile yakalanan `sleep()` — güçlü sinyal, kanıt değil |
| E0    | Gözlem            | Sıfır (yalnızca info) | Bildirilir ama asla CI'ı gate'lemez ve kesinti yapmaz     |

Kuralların çoğu **E1**'dir. «we prove it» sloganı bu sisteme işaret
eder: E2 bulguları yapısal kanıttır; E1 bulguları doğru konumlanmış
uyarılarıdır, resmî kanıt değildir.

Boş bir repo `null` puanlar — sahte 100 asla; bkz.
[Güven modeli](#güven-modeli).

---

## 🎭 Selector Health Score

Playwright takımları için başlık metriği — locator'larınız ne kadar
dayanıklı:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Rol tabanlı locator'lar tam puan alır. CSS sınıf zincirleri ve XPath
puanı batırır — herhangi bir DOM yeniden düzenlemesinde, hangi davranışın
gerilediğini söylemeden kırılırlar.

---

## 🔬 Çalışma zamanı kanıtı

Statik flakiness tespiti tahminidir. Mjölnir **gerçek yürütme
verilerini** okur — herhangi bir koşucudan Playwright JSON raporları ve
JUnit XML:

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

2. denemeden itibaren geçen test, geçen test değildir — şanslı bir
   testtir. Son yeşil onaydan bağımsız olarak `TRUE-FLAKE` olarak
   işaretlenir.

---

## ⚡ Mjölnir bir linter daha değildir

Linter'lar kodun kurallara uyup uymadığını söyler. Mjölnir, doğrulamanıza
güvenilip güvenilemeyeceğini söyler.

|                                                               | ESLint / SonarQube | Coverage araçları | Manuel inceleme | **Mjölnir** |
| ------------------------------------------------------------- | :----------------: | :---------------: | :-------------: | :---------: |
| CI workflow bütünlüğü (`continue-on-error`, `\|\| true`)      |         ❌         |        ❌         |     nadiren     |     ✅      |
| Tek araçla çapraz dil (TS, Python, Java, C#)                  |         ❌         |        ❌         |       ❌        |     ✅      |
| Playwright locator dayanıklılığını not eder (Selector Health) |         ❌         |        ❌         |     nadiren     |     ✅      |
| Gerçek assertion'ı olmayan testleri işaretler                 |   ✅ (eklenti)\*   |        ❌         |      bazen      |     ✅      |
| Katı sleep'leri yakalar (`waitForTimeout`, `time.sleep`)      |   ✅ (eklenti)\*   |        ❌         |      bazen      |     ✅      |
| Saniyeler içinde çalışır, tarama sırasında sıfır ağ çağrısı   |         ✅         |        ✅         |        —        |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) ve `eslint-plugin-playwright`
(`expect-expect`, `no-wait-for-timeout`) bunları ilgili çerçeveler için
karşılar.

**Çalışma zamanı analizi**, statik linting'in yanı sıra ayrı bir
kategoridir:

|                                                           | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| --------------------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| `TRUE-FLAKE` hükümleri için gerçek çalıştırma verisi okur |         kısmen\*          |     kısmen (tag)      |          ✅           |
| Yürütme geçmişinden flaky triyaj raporu                   |            ❌             |          ✅           |          ✅           |
| Statik güvenilirlik puanıyla bütünleşir                   |            ❌             |          ❌           |          ✅           |

\*Playwright retry'ları içeriden izler ama hüküm etiketli bağımsız bir
flakiness raporu üretmez.

---

## 🤖 Neden yalnızca AI kod incelemesi kullanmayasınız?

Farklı sorun, farklı katman. AI incelemesi bir diff'teki şüpheli test
değişikliğini fark edebilir; doğrulama sisteminin bütünüyle güvenilir
olduğunu kanıtlamaz — ve yalnızca ona gösterdiğiniz diff'i görür.

|                                              |  AI kod incelemesi (Copilot vb.)  |          **Mjölnir**          |
| -------------------------------------------- | :-------------------------------: | :---------------------------: |
| Tarama başına maliyet                        | Token (diff boyutuyla ölçeklenir) |   **Sıfır** (yerel, kurulu)   |
| Tüm takımı + tüm CI yapılandırmalarını görür | Yalnızca gösterdiğiniz PR diff'i  |  **Her şey, her seferinde**   |
| Belirleyici (aynı girdi → aynı çıktı)        |           ❌ (belirsiz)           |            **✅**             |
| Aylardır uyuyan örüntüleri yakalar           |       Yalnızca bağlamdaysa        | **✅** (tüm dosyaları tarar)  |
| Çalıştırmalar arasında bulguları hatırlar    |  ❌ (oturumlar arası bellek yok)  |   **✅** (baseline + diff)    |
| İnsan tetiklemesi olmadan çalışır            |      PR veya prompt gerekir       | **✅** (CI kancası, 3 saniye) |

**İkisini de kullanın.** AI, hiçbir regex'in bulamayacağı nüansı, niyeti
ve tasarım kusurlarını yakalar. Mjölnir, AI'nın «kasıtlı» göründükleri
için gözden kaçırdığı yapısal örüntüleri yakalar — commit edilmiş bir
`.only`, yutulmuş bir exit kodu, test işindeki bir `continue-on-error`.
Bunlar akıl gerektiren hatalar değil; tarama gerektiren olgulardır.

---

## 🤖 CI entegrasyonu

Tek komut bir PR workflow'u üretir — varsayılan olarak danışmanlık,
asla engellemeyen:

```bash
mjolnir ci install
```

Ya da SARIF üzerinden GitHub Code Scanning'e yerel olarak bağlayın:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

SARIF için düzenleyici ve hattan kurulumu:
[docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md).

### Değişen kapsam kapsamı

`--scope changed`, bulguları branch'inizin `main` ile birleştirme
tabanına (merge-base) göre eklediği satırlara atfeder. Test dosyalarını
(`*.spec.*`, `*.test.*`) ve diff'teki GitHub workflow dosyalarını ve
Playwright yapılandırmalarını kapsar. Merge-base çözülemediğinde —
shallow clone, detached HEAD, git dışı hedef, farklı varsayılan branch —
dürüstçe geriler: bulgular tüm dosya atfına döner ve rapor bunu söyler.
Taban referansını `--base <ref>` ile geçersiz kılın.

---

## Yapılandırma

Mjölnir sıfır-yapılandırmadır. Repo kökündeki isteğe bağlı bir
`mjolnir.config.json` (veya `.mjolnir.json`) şiddeti, kapıyı ve kapsamı
ayarlar — algılama anlamını asla değiştirmez.

| Key                 | Tür                                  | Etki                                                                                                                                                                                        |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclude`           | `string[]`                           | Ek ignore glob'ları (gitignore alt kümesi), yerleşik varsayılanların üzerine                                                                                                                |
| `gate`              | `"advisory" \| "error" \| "warning"` | Hangi şiddetlerin sıfır olmayan kodla çıkacağı (varsayılan `error`; `advisory` asla engellemez)                                                                                             |
| `severityOverrides` | `{ "<RULE-ID>": severity }`          | Bir kuralın bulgularını deponuz için yeniden sıralar                                                                                                                                        |
| `ignore`            | `IgnoreEntry[]`                      | Bulguları bastırır — **`reason` zorunludur**; girdiler 90 gün sonra sona erer (açık bir `expires` tarihi, ya da tarihi olmayan girdiler için yapılandırma dosyasının son değişiklik zamanı) |
| `plugins`           | `string[]`                           | Üçüncü taraf kural paketleri (bkz. [Güven modeli](#güven-modeli))                                                                                                                           |

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

- **`.mjolnirignore`** — yol dışlamaları için düz gitignore tarzı bir
  dosya, `exclude` ile aynı diyalekt. Makinaya özgü gürültü için onu
  kullanın; liste sürüm denetimine, diğer yapılandırmanın yanına
  girecekse `exclude` kullanın.
- **CLI geçersiz kılmaları** — `--strict` (karantina kurallarını dahil
  et), `--width <cols>` ve `--ascii` / `--no-ascii` (terminal
  görüntüsü), `--tone blunt` (daha sert mesajlar),
  `--max-duration <sec>` (sınırlı kısmi tarama).
- Kural bastırma ve kullanımdan kaldırma yaşam döngüsü:
  [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md).

`ignore` girdileri ayrıca bağımsız `mjolnir suppressions` komutunu besler;
bu komut şu anda bastırılanları ve her girdinin ne zaman sona ereceğini
listeler.

---

## 📐 Çıkış kodları ve sözleşmeler

Donmuş — üstüne CI mantığı kurmak güvenli:

| Çıkış kodu | Anlamı                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `0`        | Temiz — kapı düzeyinde veya üzerinde bulgu yok                            |
| `1`        | Kapı düzeyinde veya üzerinde bulgular                                     |
| `2`        | Kısmi tarama (zaman bütçesi doldu, okunamayan dosyalar) — asla engellemez |
| `10`       | Kullanım hatası (hatalı bayrak, hedef eksik)                              |
| `20`       | İç hata                                                                   |

JSON/SARIF raporu `schemaVersion: 1`'dir. Kural kimlikleri
(`QA-<FAMILY>-NNN`) sevk edildikten sonra değişmez ve asla yeniden
kullanılmaz.

---

## Güven modeli

- **Local-first** — tarama sırasında sıfır ağ çağrısı. Asla. Sıfır
  telemetri.
- **Yanlış kanıt yok** — «doğrulandı» demek yerine «bilinmiyor» demeyi
  tercih ederiz. Boş repo `score: null` alır, sahte 100 asla.
- **Kısmi dürüstlük** — analiz yarıda kesildiyse çıktı bunu söyler.
  Öyle olmadığında asla «complete» demez.
- **FP duvarı** — algılama, yorumlardan/dizelerden arınmış kod
  görünümü üzerinde çalışır (TypeScript kuralları derleyici AST'sini
  kullanır): düz yazı yorumu içindeki veya doküman örnek dizesindeki bir
  örüntü, dokümantasyondur — bulgu değildir.
- **Ölçülmüş, iddia edilmiş değil** — yalnızca gerçek OSS kodundan
  yanlış pozitif oranı olan kurallar başlık katmanlarına girer (bkz.
  [Ne kadarı ölçülmüş](#ne-kadarı-ölçülmüş)); tarama alt bilgisi ve
  `mjolnir rules --unmeasured` hangisinin ne olduğunu söyler.
- **Eklenti güveni** — eklentiler `"plugins"` altında bildirilen npm
  paketleridir. **Sandbox yok**: eklenti kodu tam Node ayrıcalıklarıyla
  çalışır; ESLint veya Vitest eklentileriyle aynı güven modeli. Çekirdek
  kural kimliği önekleri rezerve edilmiştir ve kimlik taklidini önlemek
  için eklentilerden reddedilir.
- **Workspace-yerel dış kurallar** (klasör tabanlı, sıfır ağ) — tarama
  hedefinin yanındaki bir `mjolnir-rules/` dizini özel kurallar yükler:
  JSON dosyaları regex örüntüleri bildirir (kod yürütülmez),
  `.mjs`/`.js` modülleri `rules` dışa aktarır (tam Node güveni,
  eklentiler gibi). Dış kurallar çekirdekle aynı güven üstverilerini
  taşır; asla çekirdek katmanına giremezler (çekirdek, corpus yan
  dosyasından ölçülmüş bir FP oranı gerektirir — bildirilen
  `tier: "core"`, `extended`'a sıkıştırılır), katman üst sınırlarına
  uyar ve sapma için denetlenir: `mjolnir rules --md --external`,
  kataloğu yüklenen dosyalardan görüntüler (kaynak `external`);
  matris üreteci `--external <root>` kabul eder.

---

## 🏗️ Mimari

<details>
<summary>Ağacı genişlet</summary>

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

- **Kurallar saf fonksiyonlardır** — `(SourceFileContext) → Finding[]`,
  I/O yok, global yok. Yeni bir ekosistem = bir adaptör + onun
  kuralları.
- **TypeScript/Playwright derleyici AST'sini kullanır** (ts-morph).
  Python, Java ve C#, maskeli yorum/dizeli paylaşılan bir regex
  katmanında çalışır.
- Java ve C# için bir tree-sitter WASM AST katmanı mevcuttur ve bir
  sonraki hassasiyet adımıdır — henüz senkron tarama hattına bağlı
  değildir.

---

## 📚 Belgelendirme

| Belge                                                  | İçinde ne var                                   |
| ------------------------------------------------------ | ----------------------------------------------- |
| [docs/SCORING.md](docs/SCORING.md)                     | Puan normalizasyonu + kanıt ağırlıklandırma     |
| [docs/FP-AUDIT.md](docs/FP-AUDIT.md)                   | Ölçülmüş yanlış pozitif oranları + yöntem       |
| [docs/RULE-LIFECYCLE.md](docs/RULE-LIFECYCLE.md)       | Kural durumları, bastırma, kullanımdan kaldırma |
| [docs/SARIF-INTEGRATION.md](docs/SARIF-INTEGRATION.md) | SARIF çıktısı + düzenleyici/CI kurulumu         |
| [docs/rules/](docs/rules/)                             | Üretilmiş kural başına katalog                  |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Geliştirme kurulumu + katkı akışı               |
| [CHANGELOG.md](CHANGELOG.md)                           | Sürüm geçmişi                                   |
| [SECURITY.md](SECURITY.md)                             | Güvenlik açığı bildirimi                        |

---

## 📈 Durum

**v0.5.x · açık beta.** JSON şeması ve çıkış kodları donmuş
sözleşmelerdir. TypeScript ve Python en geniş ölçülmüş kapsama sahiptir;
Java ve C# daha yenidir —
[katman tablosu](#kural-katmanları-ve-dil-olgunluğu) üzerinden okuyun.

---

## 🤝 Katkıda bulunma

Yeni kurallar en kolay ilk katkıdır — tek komut, kuralı plus must-fire
**ve** must-not-fire fixture'larıyla iskeletler (üretilen kural, gerçek
algılama uygulayana dek fixture'larında kasıtlı olarak başarısız olur —
bir stub sevk edilemez):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
```

Tam geliştirme kurulumu, sürekli kapı komutları ve anti-creep /
fixture duvarı yasaları [CONTRIBUTING.md](CONTRIBUTING.md) içindedir.

---

<div align="center">

**Güvenemediğiniz testleri sevk etmeyi bırakın.**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

[Sergey Bar](https://www.linkedin.com/in/sergeybar/) tarafından
oluşturuldu

</div>
