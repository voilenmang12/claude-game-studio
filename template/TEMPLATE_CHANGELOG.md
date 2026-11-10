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
| TR-CG01-001 | CG01 | Ignore `_to_delete/` in the standard .gitignore | released v2.01 | v2.01 |

## Unreleased

(nothing yet)

## v2.03 (2026-11-11)

Minor. Pixel art is optional: Pixelorama and its MCP server are turned on per game by the `pixel-art` skill, only
when the game's art style is pixel art. Released together with v2.02.

**Added**
- The `pixel-art` skill (`.claude/skills/pixel-art/`): confirms the art style, turns on Pixelorama and its MCP
  server for a pixel-art game through `node Tools/pixel-art.mjs enable | disable | status` (writes or removes the
  `pixelorama` server in `.mcp.json`, then lists what is missing: server packages, Pixelorama with PixMcpBridge), and
  holds the pixel workflow. `CLAUDE.md` ("Art style"), `.claude/rules/art-assets.md`, `PixelArt.md` and the UI
  profile's "Art style" row point to it.

**Changed**
- `.mcp.json` is a game file. The template's declares no server; `sync-template.sh` creates it only when a game has
  none and never overwrites it, so a pixel game keeps its `pixelorama` entry. A studio whose games are all pixel art
  puts a `.mcp.json` with the server in `local/seed/`.

**Port**
- Each game: `bash sync-template.sh <Game>` (adds the skill and `Tools/pixel-art.mjs`; `.mcp.json` stays as it is).
  Replace the old "Art is pixel art from Pixelorama" bullet of the game's `CLAUDE.md` with the "Art style" bullet of
  `template/CLAUDE.md`. A game whose style is not pixel art runs `node Tools/pixel-art.mjs disable`.

**Requests**
- None.

## v2.02 (2026-11-11)

Minor. The Pixelorama MCP becomes Pixelorama-MCP 0.2.1: 106 tools instead of 13. Released together with v2.03 (no
tag of its own).

**Changed**
- The Pixelorama MCP is now [Pixelorama-MCP](https://github.com/abidoo22/Pixelorama-MCP) v0.2.1 (MIT, commit
  `56fd8aa`): the `PixMcpBridge` extension (port 7373) and the upstream server. Workspace `tools/pixelorama-mcp/`:
  `PixMcpBridge.pck`, `server/` (built JavaScript, packages installed per machine), `pixelorama-mcp.mjs` (same path
  in `.mcp.json`, now starts the server), `test-connection.mjs` (bridge health, tool list, `--draw`). The old
  `PixeloramaMCP.zip` (0.1.0, port 7651) is gone.
- `Tools/ui-kit-template.mjs` draws with `create_canvas`, `draw_pixels_fast` and `save_project` (the popup kit comes
  out the same, pixel for pixel), and finds `tools/pixelorama-mcp/` in the nearest parent folder.
  `Tools/pixel-asset.mjs` finds `local/studio.config.json` the same way.
- `PixelArt.md` section 5 and `UIPrompting.md` section 3 use the new tools and setup.

**Port**
- Once per machine, for pixel-art games: in Pixelorama → Edit → Preferences → Extensions, remove `PixeloramaMCP`, add
  `tools/pixelorama-mcp/PixMcpBridge.pck`, enable it, restart Pixelorama; then
  `npm ci --omit=dev --prefix tools/pixelorama-mcp/server` and `node tools/pixelorama-mcp/test-connection.mjs`.
- Each game: `bash sync-template.sh <Game>` (copies `Tools/` and the `Assets/Integration` docs). A game script that
  calls the old tools (`new_project`, `draw_pixels` with `rows`, `get_image`, `read_pixels`) moves to the new names.

**Requests**
- None.

## v2.01 (2026-11-11)

Minor. A place for files waiting to be deleted, the idea backlog in your own layer, and game versions in the doctor.

**Added**
- `_to_delete/`: the folder for files waiting to be deleted, since the CCGS settings deny `rm -rf`. `.gitignore`
  ignores it and `CLAUDE.md` ("Studio template", "Deleting files") says how to use it. (TR-CG01-001)
- `studio-doctor.sh` lists every game (and `local/project/`) with its template and local versions, and how to port
  the ones behind.
- `backlog` in `local/studio.config.json`: where `new-concept.sh` keeps the idea backlog (a path from the workspace
  root, for example `local/docs/backlog.md`, so it lives in your own repo). Default `concepts/BACKLOG.md`.

**Port**
- `bash sync-template.sh <Game>` copies `.gitignore`. Copy the "Deleting files" bullet of `template/CLAUDE.md` into
  the game's `CLAUDE.md` (game-owned). A game that added `_to_delete/` to its own `.gitignore` drops that copy; set
  the game's ticket TR-CG01-001 to `released v2.01`. (TR-CG01-001)
- Workspace: add `"backlog": ""` (or your path) to `local/studio.config.json` if you want it; nothing else.

**Requests**
- TR-CG01-001: Ignore `_to_delete/` in the standard .gitignore.

## v2.00 (2026-11-11)

Major. The workspace gets a second owner: `local/`, the user's own layer. Workspace files stay exactly as published,
so a new version is a plain `git merge`; everything one user needs (rules, platform, accounts, paid plugins, a base
Unity project) lives in `local/`, which the workspace repo ignores. Games get the user's layer on every sync.

**Added**
- `local/` (`docs/local-layer.md`), made from `local.example/` by `bash studio-doctor.sh --init`:
  - `local/RULES.md`, imported by the workspace `CLAUDE.md` and by each concept's `CLAUDE.md`.
  - `local/overlay/`: files laid over `template/` in every game by `new-game.sh` and **every** `sync-template.sh`;
    an overlay file wins over the template's file at the same path.
  - `local/seed/`: files a new game starts with and then owns; `sync-template.sh` only creates missing ones.
  - `local/project/`: an optional Unity project every game starts from. `new-game.sh` copies it to the new game
    folder (generated and per-user folders left out, new product GUID), then the template replaces its template files.
    It can be a repo and a working Unity project of its own: `bash sync-template.sh local/project`.
  - `local/studio.config.json`: `vercelScope` (`deploy-test.sh`), `pixelAssetApi` and `pixelAssetConnectorDir`
    (`Tools/pixel-asset.mjs`); environment variables still win.
  - `local/public-denylist.txt`, `local/CHANGELOG.md`, `local/.gitignore` (ignores `project/`). Files named
    `_layer.md` are folder notes and are never copied.
- `.claude/studio-rules.md`, imported by `CLAUDE.md` (new "Studio rules" section): the studio's rules for every
  game; a placeholder until `local/overlay/.claude/studio-rules.md` replaces it.
- `studio-doctor.sh`: `--init` makes `local/` and turns on the commit hook; plain run checks `local/`, the workspace
  files you changed (they would conflict on the next pull), the hook and the upstream remote; `--fetch` lists newer
  versions.
- `studio-commit.sh "<message>" [--push]`: one change, committed in every studio repo it touched (workspace,
  `local/`, `local/project/`).
- `tools/hooks/pre-commit`: refuses workspace commits that add a file under `local/`, a `.unitypackage`, a secrets
  file, or a line or file name matching `local/public-denylist.txt`.

**Changed**
- `new-game.sh`: makes the game folder itself from `local/project/` when there is one, applies `local/seed/` and
  `local/overlay/` after the template, and sets the product name from the name lock.
- `sync-template.sh`: copies `local/overlay/` after the template's shared files (no false "update" for a path the
  overlay owns) and creates missing `local/seed/` files; `.claude/studio-rules.md` is a game file.
- `deploy-test.sh` and `Tools/pixel-asset.mjs` read `local/studio.config.json`.

**Breaking**
- Rules and values you had written into workspace files must move into `local/` before you merge, or the merge
  conflicts. `bash studio-doctor.sh` lists the files you changed.
- Each game's `CLAUDE.md` (game-owned) needs the "Studio rules" section with the `@.claude/studio-rules.md` import.

**Port**
- Workspace, once: `bash studio-doctor.sh --init`, move your own changes to workspace files into `local/` and restore
  the files (`git checkout -- <file>`), then `git merge v2.00`. Fill `local/RULES.md`, `local/studio.config.json`,
  `local/public-denylist.txt`; make `local/` a private repo of its own.
- Each game: `bash sync-template.sh <Game>`; copy the "Studio rules" section from `template/CLAUDE.md` into the
  game's `CLAUDE.md` (above "Studio template"); then the Port steps of `local/CHANGELOG.md` for your layer.

**Requests**
- None.

## v1.04 (2026-11-10)

Minor. Playtests and WebGL builds can be put on Vercel for testing, on a phone too.

**Added**
- Workspace `deploy-test.sh <folder> [--prod] [--dry-run]`: puts a concept's HTML playtest
  (`concepts/<slug>/prototypes/<name>/`) or a Unity WebGL build (`<Game>/Builds/WebGL/`) on Vercel and prints
  `TEST_URL=<url>`, so the user can play it on a phone, also when Claude Code runs under Remote Control. It deploys a
  temporary copy with the `Content-Encoding` and `Content-Type` headers a Brotli or gzip Unity build needs, and
  writes nothing into the folder. Deploys are previews only the signed-in Vercel account can open (a new project's
  first deploy too); `--prod` gives the public stable URL, only when the user asks. It never starts a Vercel sign-in
  itself. Setup and rules: `docs/test-deploys.md`; the lifecycle (stages 3 and 8), the git rules, the concept kit,
  `CLAUDE.md` and `README.md` point to it.
- `.gitignore` ignores `.vercel/`.

**Port**
- Copy `.gitignore` (`sync-template.sh` does it). `deploy-test.sh` is a workspace script: nothing to copy into games.
- Once per machine: `npm i -g vercel`, then the user runs `vercel login` (or sets `VERCEL_TOKEN`).

**Requests**
- None.

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
