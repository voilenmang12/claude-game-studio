# Fork record

`template/` is a fork of **Claude Code Game Studios** (CCGS) by Donchitos:

| | |
|---|---|
| Upstream | https://github.com/donchitos/claude-code-game-studios |
| Fork point | tag `v1.2.0`, commit `05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418` (2026-10-19) |
| Upstream license | MIT, copy in `licenses/claude-code-game-studios.txt` |
| Recorded in | `template/project.yaml` (`framework.version: 1.2.0`), `template/docs/CCGS-VERSION.txt` |
| Upstream releases after the fork point | `v1.3.0` exists upstream and is **not** merged |

Everything else in this repo (the workspace scripts, template versioning, template requests, the pixel art and UI
pipeline) is new work under this repo's `LICENSE`.

## Upstream files changed in `template/`

Compared with upstream `v1.2.0`, ignoring line endings. Every other upstream file in `template/` is byte-for-byte
upstream.

| File | Change |
|---|---|
| `CLAUDE.md` | Technology Stack set to Unity 6.6 URP 2D; Language section (reply in the user's language, repo in English); new "Studio template" section (versioning, template requests, Unity CLI, art pipeline); engine reference import points to Unity |
| `project.yaml` | `modes.rigor: minimal`; engine, specialists, naming and commands written by `/setup-engine unity`; build and run left `[TO BE CONFIGURED]` |
| `.claude/docs/technical-preferences.md` | Engine, input, budgets, naming and specialists from `/setup-engine unity`; platforms left `[TO BE CONFIGURED]` |
| `docs/engine-reference/unity/VERSION.md`, `breaking-changes.md`, `current-best-practices.md`, `deprecated-apis.md` | Pin moved from 6.3 LTS to 6.6 (6000.6.7f1); 6.4, 6.5 and 6.6 changes added under their own headings with sources |
| `.gitignore` | Replaced by the standard game-repo file: Unity + CCGS local state + build output + secrets |
| `README.md` | Upstream README moved, unchanged, to `docs/CCGS-README.md`; `template/README.md` describes the template |
| `UPGRADING.md` | Moved to `docs/CCGS-UPGRADING.md` (unchanged) |
| `LICENSE` | Moved to `licenses/claude-code-game-studios.txt` in the workspace root (unchanged) |

## Upstream files removed from `template/`

| File | Why |
|---|---|
| `src/` (`CLAUDE.md`, `.gitkeep`) | Unity compiles only `Assets/`; the code root is `Assets/` |
| `.github/` (issue and PR templates, CODEOWNERS, FUNDING) | Upstream project's own repo files |
| `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` | Upstream project's own files; the template keeps `TEMPLATE_CHANGELOG.md` |
| `production/session-state/.gitkeep` | `production/session-state/` is gitignored local state |

## Files added to `template/`

| Path | What |
|---|---|
| `TEMPLATE_VERSION`, `TEMPLATE_CHANGELOG.md` | Template versioning, release and port procedures, request table |
| `design/template-requests/README.md` | How a game asks for a template change (ticket form, statuses) |
| `.claude/rules/art-assets.md` | Art, asset job and license ledger rules |
| `.claude/skills/game-ui-design/` | Third-party skill, vendored unchanged from omer-metin/skills-for-antigravity (Apache-2.0, `licenses/skills-for-antigravity-apache-2.0.txt`); `SOURCE.md` has the commit |
| `Assets/Editor/Art/PixelArtImporter.cs`, `RasterArtImporter.cs` | Unity import rules for Pixelorama exports and raster art |
| `Assets/Integration/PixelArt.md`, `UIPrompting.md`, `UIPopupStandard.md` | Art pipeline, UI prompting and popup standard |
| `AgentScripts/ValidatePixelArtImport.cs` | Editor check of the Pixelorama import |
| `Tools/export-pixelorama.sh`, `pixel-asset.mjs`, `ui-kit-template.mjs`, `ui-kit-check.py` | Export, asset connector client, UI kit drawing, contrast check |
| `ArtSource/README.md`, `design/art/*`, `design/asset-ledger.csv` | Art source folder, per-game art config and profile, license ledger |
| `.mcp.json`, `.editorconfig`, `.gitattributes` | Pixelorama MCP server, editor and line-ending settings |
| `docs/CCGS-README.md`, `docs/CCGS-UPGRADING.md`, `docs/CCGS-VERSION.txt` | Upstream docs kept for reference, and the fork point |

## Taking a newer upstream release

1. Clone upstream and check out the new tag next to this repo.
2. Diff upstream `v1.2.0` against the new tag. For each changed file:
   - not in the tables above: copy it into `template/`;
   - in "Upstream files changed": merge by hand, keeping the change described above;
   - removed upstream: remove it from `template/` unless a table above says it is ours.
3. Follow upstream `UPGRADING.md` for config migrations (`project.yaml`).
4. Update this file (fork point, tables), `template/docs/CCGS-VERSION.txt` and `framework.version` in
   `template/project.yaml`, and release a template version whose **Port** says what games must merge.
