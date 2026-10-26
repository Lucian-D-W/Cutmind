# Third-party notices

Project-authored material uses `GPL-3.0-only`; see [LICENSE](LICENSE) and
[NOTICE](NOTICE). Third-party components retain their own terms and authorship.
The following direct runtime components and Tauri build helper are recorded at
their locked versions. For MIT OR Apache-2.0 components, the MIT text is retained.

| Component | Locked version | Upstream license | Retained text |
| --- | --- | --- | --- |
| `@floating-ui/react` | 0.27.19 | MIT | [notice](licenses/third-party/floating-ui-react-LICENSE.txt) |
| `@tauri-apps/api` | 2.10.1 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-apps-api-LICENSE.txt) |
| `@tauri-apps/plugin-dialog` | 2.7.0 | MIT OR Apache-2.0 | [notice](licenses/third-party/tauri-apps-plugin-dialog-LICENSE.txt) |
| `@tauri-apps/plugin-fs` | 2.5.0 | MIT OR Apache-2.0 | [notice](licenses/third-party/tauri-apps-plugin-fs-LICENSE.txt) |
| `@tauri-apps/plugin-notification` | 2.3.3 | MIT OR Apache-2.0 | [notice](licenses/third-party/tauri-apps-plugin-notification-LICENSE.txt) |
| `date-fns` | 4.1.0 | MIT | [notice](licenses/third-party/date-fns-LICENSE.txt) |
| `dompurify` | 3.3.3 | (MPL-2.0 OR Apache-2.0) | [notice](licenses/third-party/dompurify-LICENSE.txt) |
| `react` | 19.2.4 | MIT | [notice](licenses/third-party/react-LICENSE.txt) |
| `react-dom` | 19.2.4 | MIT | [notice](licenses/third-party/react-dom-LICENSE.txt) |
| `uuid` | 13.0.0 | MIT | [notice](licenses/third-party/uuid-LICENSE.txt) |
| `zustand` | 5.0.12 | MIT | [notice](licenses/third-party/zustand-LICENSE.txt) |
| `tauri` | 2.10.3 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-LICENSE.txt) |
| `tauri-plugin-opener` | 2.5.3 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-plugin-opener-LICENSE.txt) |
| `tauri-plugin-notification` | 2.3.3 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-plugin-notification-LICENSE.txt) |
| `tauri-plugin-single-instance` | 2.4.1 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-plugin-single-instance-LICENSE.txt) |
| `tauri-plugin-global-shortcut` | 2.3.1 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-plugin-global-shortcut-LICENSE.txt) |
| `tauri-plugin-dialog` | 2.7.0 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-plugin-dialog-LICENSE.txt) |
| `tauri-plugin-fs` | 2.5.0 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-plugin-fs-LICENSE.txt) |
| `tauri-plugin-decorum` | 1.1.1 | MIT | [notice](licenses/third-party/tauri-plugin-decorum-LICENSE.txt) |
| `serde` | 1.0.228 | MIT OR Apache-2.0 | [notice](licenses/third-party/serde-LICENSE.txt) |
| `serde_json` | 1.0.149 | MIT OR Apache-2.0 | [notice](licenses/third-party/serde_json-LICENSE.txt) |
| `font-kit` | 0.14.3 | MIT OR Apache-2.0 | [notice](licenses/third-party/font-kit-LICENSE.txt) |
| `tauri-build` | 2.5.6 | Apache-2.0 OR MIT | [notice](licenses/third-party/tauri-build-LICENSE.txt) |

The JavaScript dialog, filesystem and notification packages supply SPDX notices;
those notices are retained, alongside the full MIT texts for their corresponding
native plugins listed in the table.

These texts were copied from the corresponding upstream package releases. Line
endings were normalized to LF, trailing empty lines removed, and a final newline
retained. License wording is unchanged. No upstream
source code is vendored. This selected table is not a complete inventory of every
transitive or development dependency: the lockfiles record those dependencies,
which retain their own licenses. A future compiled distribution must also retain
the notices required by all components actually distributed in it.

The Rust opener plugin remains installed: it supplies automatic link handling.
Its unused JavaScript wrapper dependency has been removed without removing the
native behavior. System-font selection and `font-kit` also remain in use.

## Artwork and fonts

The author-created brain-and-gate artwork in `src-tauri/icons/` is covered by the
project grant in NOTICE. Alibaba PuHuiTi font binaries retained locally are
separate third-party assets, excluded from the public source snapshot; see
[font notes](fonts/README.md). The project GPL does not relicense those fonts.

## Research

[创作意图参考文献](docs/guides/创作意图参考文献.md) acknowledges intellectual sources.
No paper text or figures are distributed. Citation does not grant redistribution
rights or imply researcher endorsement of this software.
