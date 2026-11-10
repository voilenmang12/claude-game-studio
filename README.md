# Claude Game Studio

A workspace for making many small Unity 2D games with Claude Code, one template shared by all of them, and rules
that move improvements both ways: from the template to the games, and from the games back to the template.

> **Fork notice.** `template/` is a fork of
> [Claude Code Game Studios](https://github.com/donchitos/claude-code-game-studios) by Donchitos (MIT), taken at
> `v1.3.0` (commit `abc0de7`, first forked at `v1.2.0`). The 49 agents, 78 skills, hooks, rules, genre sheets and
> docs in `template/.claude/` come from there. [`FORK.md`](FORK.md) lists every upstream file that changed, was removed or was added.

## What is here

```
claude-game-studio/            the workspace; game folders are created next to template/
├─ CLAUDE.md                   workspace rules (template upkeep, versions, requests)
├─ local.example/              your own layer, copied to local/ (ignored): rules, config, overlay, Unity base
├─ studio-doctor.sh            set up local/, check the workspace before an update
├─ FORK.md                     what was taken from CCGS and what changed
├─ template/                   the studio template applied to every game
│  ├─ .claude/                 CCGS agents, skills, hooks, rules, docs (+ art-assets rule, game-ui-design skill)
│  ├─ CLAUDE.md, project.yaml  CCGS config, already set up for Unity 6.6 URP 2D
│  ├─ Assets/Editor/Art/       Pixelorama and raster import rules
│  ├─ Assets/Integration/      PixelArt.md, UIPrompting.md, UIPopupStandard.md
│  ├─ Tools/                   Pixelorama export, asset connector client, UI kit drawing and contrast check
│  ├─ design/template-requests/README.md   how a game asks for a template change
│  └─ TEMPLATE_VERSION, TEMPLATE_CHANGELOG.md
├─ tools/pixelorama-mcp/       Pixelorama MCP extension + dependency-free server
├─ tools/hooks/pre-commit      keeps private content out of commits to this repo
├─ docs/                       game-lifecycle.md, git-rules.md, test-deploys.md, local-layer.md
├─ concept-kit/                what a concept folder gets on top of the CCGS layer
├─ new-concept.sh              start a concept: brief, GDD, HTML playtest, name lock
├─ new-game.sh                 apply the template and a locked concept to a new Unity project
├─ publish-game.sh             create the game's own private GitHub repo and push
├─ deploy-test.sh              put a playtest or WebGL build on Vercel and print the test URL
├─ sync-template.sh            port the template's shared files to an existing game
├─ list-template-requests.sh   list the template requests of every game
└─ licenses/                   upstream licenses (CCGS, pixelorama-mcp, game-ui-design)
```

The template is the **studio layer only**: no Unity `Assets/` content besides the Editor import scripts, no
`Packages/` or `ProjectSettings/`, and no paid Asset Store plugins. You bring the Unity project: one per game from
Unity Hub, or one base project in `local/project/` that every new game is copied from.

## Make it yours, keep it updatable

Never edit the workspace files for your own needs. Put your rules, platform, accounts, plugins and base project
in `local/` (ignored by this repo, its own private repo if you like), and a new version is a plain `git merge`.

```bash
bash studio-doctor.sh --init     # once: local/ from local.example/, commit hook on
bash studio-doctor.sh --fetch    # before an update: your changed files, newer versions
```

What goes where, and how games get it: [`docs/local-layer.md`](docs/local-layer.md).

## Requirements

- Claude Code; Git and bash (Git Bash on Windows); Node 20 or later; Python 3 with Pillow for `ui-kit-check.py`.
- Unity 6000.6.7f1 (Unity 6.6), a 2D URP project, with the `com.unity.nuget.newtonsoft-json` package.
- Optional: [Pixelorama](https://orama-interactive.itch.io/pixelorama) 1.2.x for pixel art;
  [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio) for generated art (see below);
  [Vercel CLI](https://vercel.com/docs/cli) for test deploys.

## From idea to game

[`docs/game-lifecycle.md`](docs/game-lifecycle.md) has the stages; each one ends at a gate the user passes.

| Stage | Command or skill | Gate |
|---|---|---|
| Idea | `concepts/BACKLOG.md` | pick one |
| Brief, GDD draft | `bash new-concept.sh <slug>`, then `/prototype` in `concepts/<slug>/` | core loop approved |
| HTML playtest | `/prototype` builds `prototypes/<slug>/`; play (on a phone: `bash deploy-test.sh <folder>`), change, log sessions | PROCEED, PIVOT or KILL |
| GDD v1.0, name lock | `design/production-gdd.md`, `design/name-lock.md` | name locked |
| Game project | Unity Hub project (or `local/project/`), then `bash new-game.sh <Code>-<Name> --concept <slug>` | opens in Unity |
| GitHub repo | `bash publish-game.sh <Code>-<Name>` (private) | repo created |
| Production | `/start` in the game folder, then CCGS epics and stories | per milestone |

Start Claude Code **in the concept or game folder** (hooks, rules and `.mcp.json` load only from where `claude`
starts). Concepts are local git repos with no remote; each game is its own repository. Both are ignored by this
repo. Git rules: [`docs/git-rules.md`](docs/git-rules.md).

## The two-way rules

**Template → games (versions).** `template/TEMPLATE_VERSION` holds the version (`1.00`, `1.01` … `2.00`).
`template/TEMPLATE_CHANGELOG.md` has one entry per version with its **Port** steps. Each game keeps the version it
is synced to and a copy of the changelog. Porting is `bash sync-template.sh <Game>` plus the entry's manual steps,
ending with the commit `chore: sync template vX.YY`.

**Games → template (requests).** A game never edits the template. When a game produces something every game should
have (a fix in a template file, a tool, a rule, a better standard), it files a ticket `TR-<game code>-<NNN>` in its
own `design/template-requests/` with a fixed form. `bash list-template-requests.sh --open` lists open tickets; the
user accepts or rejects each one; the decision goes in the changelog's "Template requests" table. A changelog line
that comes from a ticket ends with its ID, and each release lists the tickets it closes under **Requests**.

Details: [`CLAUDE.md`](CLAUDE.md), [`template/TEMPLATE_CHANGELOG.md`](template/TEMPLATE_CHANGELOG.md),
[`template/design/template-requests/README.md`](template/design/template-requests/README.md).

## Test deploys: Vercel

`bash deploy-test.sh <folder>` puts an HTML playtest or a Unity WebGL build on Vercel and prints `TEST_URL=<url>`,
so a build can be played on a phone, or from a phone when Claude Code runs under Remote Control. It deploys a
temporary copy with the headers a Brotli or gzip Unity build needs, and writes nothing into the folder. Deploys are
previews that only the signed-in Vercel account can open; `--prod` gives a public stable URL. Sign in once with
`vercel login` (or `VERCEL_TOKEN`). Details: [`docs/test-deploys.md`](docs/test-deploys.md).

## Generated art: Codex Asset Studio

Detailed art (characters, items, painted UI) comes from [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio), the asset connector these games
use. It is a separate repo: a local REST service on `http://127.0.0.1:3941` whose worker drafts the prompt, makes
the image with Codex ImageGen and exports a game-ready PNG (pixel grid recovery, raster, animation sheets, UI 9-slice).
`template/Tools/pixel-asset.mjs` is its client; Claude never makes the image itself.

```bash
git clone https://github.com/voilenmang12/codex-asset-studio.git
cd codex-asset-studio
node asset-connector/setup.mjs doctor        # checks Codex CLI sign-in and the Python packages
node asset-connector/server.mjs --worker     # keep it running; a second terminal: node asset-connector/setup.mjs smoke
```

Its README lists the requirements (Node 20.11+, Python 3.10+, Codex CLI signed in with ChatGPT). In a game:
fill `design/art/pixel-asset-project.json`, run `node Tools/pixel-asset.mjs init` once, then `submit`, `status` and
`pull` (`template/Assets/Integration/PixelArt.md`, section 6). Jobs use the worker account's image quota. When the
connector sets `ASSET_API_TOKEN`, give each game a project token through the same variable; keep it out of git.

## Licenses

This repo: MIT ([`LICENSE`](LICENSE)). Upstream parts keep their licenses: Claude Code Game Studios (MIT),
pixelorama-mcp (MIT), the `game-ui-design` skill (Apache-2.0); copies in [`licenses/`](licenses/).
