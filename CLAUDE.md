# Claude Game Studio workspace

Shared context for every game folder below this one. Each game folder has its own `CLAUDE.md` (from
`template/`) with the project rules; those win for anything inside that game. Use a session started here only for
workspace work: a new game, template upkeep, comparing games, triaging template requests.

## Working with the user
- Reply in the user's language. Everything in the repos is English (code, docs, commits).
- Do the work: run the scripts and the Unity CLI yourself. Ask only for decisions, approval of destructive actions,
  and what only a human can do (Play Mode testing, store uploads, payments, sign-ins).
- No commits without the user's instruction.

## Layout
```
<workspace>/
├─ CLAUDE.md, README.md, FORK.md
├─ template/                  studio template; every game gets a copy
├─ tools/pixelorama-mcp/      Pixelorama MCP extension + server (games point to it with ../tools/...)
├─ new-game.sh                bash new-game.sh <Game>          apply the template to a Unity project in <Game>/
├─ sync-template.sh           bash sync-template.sh <Game> [--dry-run]   port shared template files
├─ list-template-requests.sh  bash list-template-requests.sh [--open]    tickets of every game
├─ licenses/                  upstream licenses
└─ <Game>/                    one folder = one Unity project = one git repo (ignored by this repo)
```
- Start Claude Code **inside a game folder** for game work: CCGS hooks, rules and `.mcp.json` load only from the
  folder where `claude` starts.
- Game codes are the folder prefix (`CG01-Name` → `CG01`); template request IDs use them.

## The template
- Change shared behaviour in `template/` first, then port it to existing games deliberately.
- **Versions.** `template/TEMPLATE_VERSION` holds the current version (`MAJOR.MINOR`, minor two digits: 1.00, 1.01
  … 2.00); `template/TEMPLATE_CHANGELOG.md` holds one entry per version with **Port** steps, plus the release and
  port procedures. Log every template change under `## Unreleased` as you make it; a release commit is
  `release: template vX.YY`, tagged `vX.YY`. Each game carries its own `TEMPLATE_VERSION` and a changelog copy; a
  port ends with the commit `chore: sync template vX.YY` in the game repo. Minor = additive (copy files); major =
  breaking (migration steps in the entry).
- **Template requests.** Games propose template changes only through tickets `TR-<game code>-<NNN>` in their
  `design/template-requests/` (`template/design/template-requests/README.md`). `bash list-template-requests.sh
  --open` lists the open ones; the user approves each accept or reject; the decision goes in the changelog's
  "Template requests" table, changelog lines from a ticket end with its ID, and each release lists the tickets it
  closes under **Requests**.
- `template/.gitignore` is the **standard gitignore** for every game repo. Change it there and copy it to existing
  games (`sync-template.sh` does); never edit one game's copy alone without a reason written in that commit.
- **Upstream.** `template/` is a fork of Claude Code Game Studios `v1.2.0`. `FORK.md` lists every upstream file we
  changed, removed or added, and how to take a newer upstream release. Keep it current with every change to an
  upstream file.
- **Public repo.** This workspace repo is public. Never add paid Asset Store plugins, game content, credentials or
  machine-specific paths to it. Game repos that hold paid plugins stay private.
