# Fork record

`template/` is a **hard fork** of **Claude Code Game Studios** (CCGS) by Donchitos. Since template v2.60
(2026-11-13) CCGS files are edited in place for autonomous runs and upstream releases are no longer merged; the
tables below are the history up to that point, and "Taking a newer upstream release" is kept only for reference.
Notable later changes to CCGS files are listed under "Hard fork changes".

| | |
|---|---|
| Upstream | https://github.com/donchitos/claude-code-game-studios |
| Current base | tag `v1.3.0`, commit `abc0de79d6ceb0b5d7aa693945849b3937afbe6a` (2026-11-09) |
| First fork point | tag `v1.2.0`, commit `05ad7c8a5b8aa2aa86bbd3439ae7cf7295cac418` (2026-10-19) |
| Upstream license | MIT, copy in `licenses/claude-code-game-studios.txt` |
| Recorded in | `template/project.yaml` (`framework.version: 1.3.0`), `template/docs/CCGS-VERSION.txt` |

Everything else in this repo (the workspace scripts, the game lifecycle and git rules, template versioning, template
requests, the concept kit's own documents, the pixel art and UI pipeline) is new work under this repo's `LICENSE`.

## Merge history

| Date | Upstream | Template | What happened |
|---|---|---|---|
| 2026-11-10 | `v1.2.0` | v1.00 | First fork |
| 2026-11-10 | `v1.2.0` → `v1.3.0` | v1.01 | 401 files taken as they are; 3 test specs renamed with their skills (`help` → `next-step`, `settings` → `project-settings`, `changelog` → `write-changelog`; the old skills stay as shims); `project.yaml` and Unity `VERSION.md` merged with no conflict; `CLAUDE.md` conflict resolved by hand: the fork's Unity stack kept, upstream's new engine-import comment taken with the Unity import line under it |

## Hard fork changes (template v2.60 and later)

| Version | Files | Change |
|---|---|---|
| 2.60 | `CLAUDE.md` (template, `concept-kit/`) | "Collaboration Protocol" replaced by "Autonomy" and "Autonomous runs"; Play Mode run by Claude; commits as it works |
| 2.60 | `project.yaml` (template, `concept-kit/`) | `modes.automation: autonomous` |
| 2.60 | `.claude/settings.json` | `defaultMode: acceptEdits`, all tools allowed (the deny list stays), `goal-check` Stop hook |
| 2.60 | `.claude/hooks/yaml-helper.sh`, `automation-modes.md`, `config-resolution.md`, `effects-map.md` | `automation_always_ask` defaults to none |
| Unreleased | `CLAUDE.md` (template, `concept-kit/`) | branch per task; task size S / M / L; stay in scope; report by size; audit and QA in two passes |
| Unreleased | `.claude/rules/ui-code.md` | fitted to 2D web games: reference resolution, gamepad, localization and colorblind only when the GDD asks |
| Unreleased | `.claude/rules/test-standards.md` | regression tests for logic bugs; visual fixes checked by screenshot |
| 2.60 | added: `.claude/hooks/goal-check.sh`, `goal-check.mjs`, `.claude/skills/run-goal/`, `.claude/docs/task-report.md` | autonomous goals with a deterministic Stop hook; illustrated task reports |

## Upstream files changed in `template/`

Compared with upstream `v1.3.0`, ignoring line endings. Every other upstream file in `template/` is byte-for-byte
upstream.

| File | Change |
|---|---|
| `CLAUDE.md` | Fork note; Technology Stack set to Unity 6.6 URP 2D; Language section (reply in the user's language, repo in English); "Studio rules" section importing
`.claude/studio-rules.md`; "Studio template" section (deleting files through `_to_delete/`, versioning, template requests, git, Unity CLI, art style: optional pixel art through the `pixel-art` skill); Collaboration Protocol follows `modes.automation` (upstream states only the `collaborative` rules); new section "Goals, long runs and sessions"; the engine import line set to Unity |
| `project.yaml` | `modes.rigor: minimal`; engine, specialists, naming and commands written by `/setup-engine unity`; build and run left `[TO BE CONFIGURED]` |
| `.claude/docs/technical-preferences.md` | Engine, input, budgets, naming and specialists from `/setup-engine unity`; platforms left `[TO BE CONFIGURED]` |
| `docs/engine-reference/unity/VERSION.md`, `breaking-changes.md`, `current-best-practices.md`, `deprecated-apis.md` | Pin moved from 6.3 LTS to 6.6 (6000.6.7f1); 6.4, 6.5 and 6.6 changes added under their own headings with sources |
| `.gitignore` | Replaced by the standard game-repo file: Unity + CCGS local state + build output + secrets |
| `README.md` | Upstream README moved, unchanged, to `docs/CCGS-README.md`; `template/README.md` describes the template |
| `UPGRADING.md`, `CHANGELOG.md` | Moved, unchanged, to `docs/CCGS-UPGRADING.md` and `docs/CCGS-CHANGELOG.md` |
| `LICENSE` | Moved, unchanged, to `licenses/claude-code-game-studios.txt` in the workspace root |

## Upstream files removed from `template/`

| File | Why |
|---|---|
| `src/` (`CLAUDE.md`, `.gitkeep`) | Unity compiles only `Assets/`; the code root is `Assets/` |
| `.github/` (issue and PR templates, CODEOWNERS, FUNDING) | Upstream project's own repo files |
| `CONTRIBUTING.md`, `SECURITY.md` | Upstream project's own files |
| `production/session-state/.gitkeep` | `production/session-state/` is gitignored local state |

## Files added to `template/`

| Path | What |
|---|---|
| `TEMPLATE_VERSION`, `TEMPLATE_CHANGELOG.md` | Template versioning, release and port procedures, request table |
| `.claude/studio-rules.md` | Placeholder for the studio's own rules; `local/overlay/` replaces it in games |
| `design/template-requests/README.md` | How a game asks for a template change (ticket form, statuses) |
| `.claude/rules/art-assets.md` | Art, asset job and license ledger rules |
| `.claude/skills/game-ui-design/` | Third-party skill, vendored unchanged from omer-metin/skills-for-antigravity (Apache-2.0, `licenses/skills-for-antigravity-apache-2.0.txt`); `SOURCE.md` has the commit |
| `Assets/Editor/Art/PixelArtImporter.cs`, `RasterArtImporter.cs` | Unity import rules for Pixelorama exports and raster art |
| `Assets/Integration/AssetStudio.md`, `PixelArt.md`, `UIPrompting.md`, `UIPopupStandard.md` | Generated assets, pixel art pipeline, UI prompting and popup standard |
| `AgentScripts/ValidatePixelArtImport.cs` | Editor check of the Pixelorama import |
| `Tools/export-pixelorama.sh`, `asset-studio.mjs`, `ui-kit-template.mjs`, `ui-kit-check.py` | Export, Asset Studio client, UI kit drawing, contrast check |
| `.claude/skills/pixel-art/`, `Tools/pixel-art.mjs` | Optional pixel-art pipeline: turns Pixelorama and its MCP server on or off per game |
| `ArtSource/README.md`, `design/art/*`, `design/asset-ledger.csv` | Art source folder, per-game art config and profile, license ledger |
| `.mcp.json`, `.editorconfig` | Pixelorama MCP server, editor settings |
| `docs/CCGS-README.md`, `docs/CCGS-UPGRADING.md`, `docs/CCGS-CHANGELOG.md`, `docs/CCGS-VERSION.txt` | Upstream docs kept for reference, and the base commit |

## Upstream-derived files outside `template/`

`concept-kit/` is laid over the CCGS layer in each concept folder, so a concept runs CCGS with **no engine set**.

| File | Relation to upstream `v1.3.0` |
|---|---|
| `concept-kit/project.yaml` | Upstream file plus `modes.rigor: minimal` at the end |
| `concept-kit/CLAUDE.md` | Upstream file plus a concept note, a Language section, a "Local rules" section importing `local/RULES.md` and a "Concept stage" section after the stack note; the same Collaboration Protocol and "Goals, long runs and sessions" changes as `template/CLAUDE.md` |
| `concept-kit/.claude/docs/technical-preferences.md` | Upstream file, unchanged (the unconfigured one) |
| `concept-kit/.gitignore` | Upstream file, unchanged (covers web prototypes) |

The other files in `concept-kit/` (`README.md`, `design/production-gdd.md`, `design/playtest-record.md`,
`design/name-lock.md`) are new.

## Taking a newer upstream release

1. Clone upstream next to this repo and fetch the new tag.
2. For each path in `git diff --name-status <current base> <new tag>`:
   - not in the tables above: copy it into `template/` (a rename: remove the old path);
   - in "Upstream files changed": three-way merge (`git merge-file`) with the current base as the base, and keep the
     change described above;
   - moved files: copy the new version to the moved path;
   - `CLAUDE.md`, `project.yaml`, `technical-preferences.md`, `.gitignore`: also update the `concept-kit/` copies
     as the table above says.
3. Check that every upstream file outside the "changed" table is byte-for-byte the new tag (ignoring line endings),
   and that `template/` has no file that is neither upstream nor in "Files added".
4. Follow upstream `UPGRADING.md` for config migrations, update this file (base, merge history, tables),
   `template/docs/CCGS-VERSION.txt` and `framework.version`, and release a template version whose **Port** says what
   games must merge.
