# Template changelog

Every game made from `template/` keeps two files at its root:

- `TEMPLATE_VERSION`: the template version the game is synced to (one line, for example `1.00`).
- `TEMPLATE_CHANGELOG.md`: a copy of this file as it was at that version.

To see what a game is missing, compare its `TEMPLATE_VERSION` with the template's and read the
entries in between. Each entry lists what changed and how to port it.

## Version numbers

`MAJOR.MINOR`, minor always two digits: `1.00`, `1.01` … `1.99`, `2.00`.

- **Minor** (`1.00` → `1.01`): additive or compatible. A game can take it by copying the listed files.
- **Major** (`1.xx` → `2.00`): breaking. A game must run the entry's migration steps (scene, data,
  save format, folder layout or API changes), and some steps may need the user.

Git tags are `v1.00`, `v1.01`, …, one per release commit.

## How to release a version (in `template/`)

1. Commit the work as usual. Add each change under `## Unreleased` below as you go.
2. Test it in a Unity project that has the template applied (compile, plus what the change needs).
3. Rename `## Unreleased` to `## vX.YY (YYYY-MM-DD)`, fill **Port** and **Requests**, add a new empty
   `## Unreleased`, and write the new number into `TEMPLATE_VERSION`.
4. Commit `release: template vX.YY` and tag it: `git tag -a vX.YY -m "Template vX.YY"`.

## How to port a version to a game

1. The game's working tree is clean (commit or stash the game's own work first).
2. Apply each entry after the game's `TEMPLATE_VERSION`, oldest first, by its **Port** steps.
   `bash sync-template.sh <Game> --dry-run` (workspace root) shows which shared files differ.
   Before overwriting a file, diff it: if the game changed it on purpose, merge by hand.
3. Copy `TEMPLATE_CHANGELOG.md`, write the new number into the game's `TEMPLATE_VERSION`, set the game's
   tickets that this version released to `released vX.YY`, and commit `chore: sync template vX.YY` in the game repo.

Entry format: **Added / Changed / Fixed / Removed**, then **Port** (files to copy and steps to run),
then **Breaking** for major versions, then **Requests** (the game tickets the version closes). A line that comes
from a game ticket ends with its ID, for example `(TR-CG01-001)`.

## How a game requests a change

A game never edits `template/`. It files a ticket `TR-<game code>-<NNN>` in its own
`design/template-requests/`, with the form and rules in `design/template-requests/README.md`. The template lists
them with `bash list-template-requests.sh --open` (workspace root), the user approves each accept or reject, and the
table below records the decision. A release names every ticket it closes; porting that version sets the game's
ticket to `released vX.YY`.

## Template requests

| ID | Game | Title | Status | Version or reason |
|---|---|---|---|---|
| (none yet) | | | | |

## Unreleased

(nothing yet)

## v1.03 (2026-11-10)

Minor. The popup kit's colors are a game file; the kit script is the template's again.

**Changed**
- The popup kit's colors moved out of `Tools/ui-kit-template.mjs` into `design/art/ui-kit-palette.json`, a game file.
  The script is template-owned again: it reads the file, fails on a missing layer, a bad color or an unknown key,
  draws one `button_<role>` per entry under `buttons`, and `--check` validates the file without Pixelorama. With the
  template's palette it draws the same 11 pieces as before, pixel for pixel. `UIPopupStandard.md` section 6,
  `ui-prompt-profile.md` and `game-ui-design/SOURCE.md` say where the colors live. `sync-template.sh` copies the
  script again and creates the palette file only when the game has none.

**Port**
- **Before** `sync-template.sh`: if the game changed `PALETTE` in its `Tools/ui-kit-template.mjs`, write those colors
  into `design/art/ui-kit-palette.json` first (template file as the start; `cardSel` is now `cardSelected`; every
  key that is not a layer goes under `buttons`, for example `danger`). Then sync, and run
  `node Tools/ui-kit-template.mjs --check`: the piece list must match the sprites in `Assets/Art/UI/`.

**Requests**
- None.

## v1.02 (2026-11-10)

Minor. The asset connector is named and linked.

**Changed**
- The asset connector is named and linked: [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio) in the workspace `README.md` (setup and
  use), `Assets/Integration/PixelArt.md` section 6, `CLAUDE.md` and `Tools/pixel-asset.mjs` (header and the
  `PIXEL_ASSET_CONNECTOR_DIR` hint).

**Port**
- `bash sync-template.sh <Game>` copies `PixelArt.md` and `pixel-asset.mjs`. In `CLAUDE.md`, replace "the asset
  connector REST API (a separate service)" with the template's line.

**Requests**
- None.

## v1.01 (2026-11-10)

Minor. Claude Code Game Studios v1.3.0 merged, and the road from an idea to a game repo written down.

**Changed**
- CCGS `v1.2.0` → `v1.3.0` ("make me a game"): `/prototype` asks one round of questions from a genre sheet, writes
  `design/game-brief.md`, builds a browser game in `prototypes/<name>/`, checks it, and changes it after play; new
  `/cut`; `/help`, `/settings` and `/changelog` renamed `/next-step`, `/project-settings` and `/write-changelog`
  (the old names still work); new `.claude/genres/` and `.claude/engines/`; hooks that exit cleanly on Windows
  without Git Bash; 28 more read-only permissions in `.claude/settings.json`. Upstream notes:
  `docs/CCGS-CHANGELOG.md`, `docs/CCGS-UPGRADING.md`. `FORK.md` (workspace) records the merge.
- `CLAUDE.md`: fork note says v1.3.0; upstream's new engine-import comment; a **Git** bullet pointing to the
  workspace's `docs/git-rules.md`.
- `project.yaml`: `framework.version: 1.3.0`; comments name `/project-settings`.

**Added (workspace, outside `template/`)**
- `docs/game-lifecycle.md`: stages 0 to 8 from idea to production, each with its gate: brief, GDD draft, HTML
  playtest (PROCEED, PIVOT, KILL), GDD v1.0, name lock, game project, private GitHub repo.
- `docs/git-rules.md`: repos and visibility, trunk `main`, commit messages and fixed messages, tags, what never goes
  into a repo, the stage 7 checklist.
- `new-concept.sh` and `concept-kit/`: a concept folder with the CCGS layer and no engine set, the GDD, playtest
  record and name lock forms, and a local git repo with no remote.
- `new-game.sh --concept <slug>`: refuses an unlocked name or a folder that differs from it, and copies the concept's
  design, `prototypes/` and `references/` into the first commit. `--no-concept` for an existing game.
- `publish-game.sh`: creates the game's GitHub repo, private by default, and pushes `main`.
- `sync-template.sh` also carries `.claude/genres`, `.claude/engines` and the CCGS docs.

**Port**
- `bash sync-template.sh <Game>`: takes the CCGS 1.3.0 files. Delete what it lists as `only in game` under
  `studio-tests/` (`sprint/changelog.md`, `utility/help.md`, `utility/settings.md`: renamed upstream).
- `.claude/settings.json`: copy the template's file if the game never edited it; otherwise replace every hook
  `"command"` line and add the new allow rules by hand (`docs/CCGS-UPGRADING.md`, "Merge Carefully").
- `CLAUDE.md`: replace the engine-import comment with the template's, keep the import line, and add the **Git**
  bullet and the fork note version.
- `project.yaml`: `framework.version: 1.3.0`, `last_upgraded`, and the `/project-settings` comment.
- A game already past stage 6 keeps its history; it does not need the concept files. Add `design/name-lock.md`
  with its current names if `publish-game.sh` will be used.

**Requests**
- None.

## v1.00 (2026-11-10)

First public release. Fork of Claude Code Game Studios v1.2.0 (`05ad7c8`); `FORK.md` in the workspace root lists
every upstream file that changed. Taken from a private Unity 2D template at its v1.02 plus later rules, without the
platform-specific layer (portal SDK, web build skills) and without paid Unity plugins.

**Contents**
- CCGS v1.2.0: 49 agents, 74 skills, 18 hooks, 14 rules, docs, `project.yaml` (`modes.rigor: minimal`),
  `studio-tests/`. Upstream README and upgrade guide in `docs/CCGS-README.md` and `docs/CCGS-UPGRADING.md`.
- `/setup-engine unity` already run: Unity 6000.6.7f1 pinned, 6.4 to 6.6 changes in
  `docs/engine-reference/unity/*`, Unity specialists, naming, test command, smoke command through the Unity CLI.
  Target platforms and the build command are left `[TO BE CONFIGURED]`.
- Skill `game-ui-design`, vendored from omer-metin/skills-for-antigravity (Apache-2.0), as a UI review checklist.
- Pixel art pipeline: `ArtSource/` sources, `Tools/export-pixelorama.sh`, `Assets/Editor/Art/PixelArtImporter.cs`
  (PPU 16, Point, uncompressed; sheets with 2+ frames or tags → slices and one clip per tag; one frame → Single sprite),
  `AgentScripts/ValidatePixelArtImport.cs`, Pixelorama MCP through `.mcp.json`, guide `Assets/Integration/PixelArt.md`.
- Asset connector client `Tools/pixel-asset.mjs` (API 1.x: pixel and raster pipelines, `ui_9_slice`, references),
  `Assets/Editor/Art/RasterArtImporter.cs` for `Assets/ArtRaster/`, config `design/art/pixel-asset-project.json`,
  license ledger `design/asset-ledger.csv`, rule `.claude/rules/art-assets.md`.
- UI: `Assets/Integration/UIPrompting.md` (sizes, pixel scale, tool choice, raster UI), per-game
  `design/art/ui-prompt-profile.md`, `Assets/Integration/UIPopupStandard.md` (popup layer stack, shared kit, one
  button shape with baked role colors, contrast minimums), `Tools/ui-kit-template.mjs` (draws the kit through
  Pixelorama MCP), `Tools/ui-kit-check.py` (contrast check).
- Template versioning (this file, `TEMPLATE_VERSION`) and template requests (`design/template-requests/`).
- `.gitignore`: the standard file for every game repo.

**Port**
- New games: `bash new-game.sh <Game>` (workspace root) applies v1.00 to a Unity project.

**Requests**
- None.
