# Vendored typefaces

All three faces are licensed under the SIL Open Font License 1.1, which
permits bundling and redistribution with this repository.

| Family     | Files                | Upstream                                                  | Licence     |
| ---------- | -------------------- | --------------------------------------------------------- | ----------- |
| Geist      | `geist-*.woff2`      | [vercel/geist-font](https://github.com/vercel/geist-font) | SIL OFL 1.1 |
| Geist Mono | `geist-mono-*.woff2` | [vercel/geist-font](https://github.com/vercel/geist-font) | SIL OFL 1.1 |
| Cinzel     | `cinzel-*.woff2`     | [NDISCOVER/Cinzel](https://github.com/NDISCOVER/Cinzel)   | SIL OFL 1.1 |

The `.woff2` files are the Latin and Latin-Extended subsets as served by
Google Fonts, fetched by `npm run brand:fonts` and pinned by sha256 in
[`fonts.lock.json`](fonts.lock.json). The build never touches the
network: `npm run brand:fonts -- --check` re-verifies the committed bytes
against that manifest offline, and that is what CI runs.

The full OFL text for Geist and Geist Mono is vendored beside the TTFs
the SVG and video pipelines use, at
[`assets/video/fonts/GeistMono-LICENSE.txt`](../../../assets/video/fonts/GeistMono-LICENSE.txt)
and
[`assets/readme/fonts/Geist-LICENSE.txt`](../../../assets/readme/fonts/Geist-LICENSE.txt).
