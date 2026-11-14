# Claude Game Studio workspace

Shared context for every game folder below this one. Each game folder has its own `CLAUDE.md` (from
`template/`) with the project rules; those win for anything inside that game. Use a session started here only for
workspace work: a new game, template upkeep, comparing games, triaging template requests.

## Working with the user
- A new machine, a missing tool or a sign-in that stopped working: `/studio-setup` (`bash studio-setup.sh`). Sign-ins
  are interactive: the user runs `! bash studio-setup.sh --login <id>`; never type or ask for their passwords or codes.
- Reply in the user's language, and write everything meant for the user in it (closing messages, recaps, questions,
  captions, task reports). Everything else in the repos is English (code, docs, commits).
- Do the work: run the scripts and the Unity CLI yourself. Ask only for decisions, approval of destructive actions,
  and what only a human can do (store uploads, payments, sign-ins); Claude runs Play Mode itself.
- No commits without the user's instruction.

## Working style (sessions started here)
The same economy as game sessions (`template/CLAUDE.md`, "Autonomy" and "Autonomous runs"), for workspace, `local/`
and `local/project/` work:
- **Size the task** (S / M / L) and check only as much as it needs. S: the edit and one check, reported in the closing
  message. **Stay in scope:** nothing next to the request; extras go on one line under "Left".
- **Read once.** Each file once per task; trust your own edits; Grep the heading of a big doc and read that range.
  Wide searches over many files, games or session logs go to a subagent that returns a summary.
- **No polling, no re-checking.** Anything over about two minutes (a Unity import, a build, a sync over several games)
  runs as one background command; never sleep-loop. Run `git status`, `unity status` or a test once after a batch of
  changes, not between steps when nothing changed.
- **Edit with the Edit tool**, after reading only the range you need (`offset`/`limit`); it keeps CRLF endings.
  No `python - <<` or `sed -i` rewrites for a few changes; a script only for many mechanical edits, keeping each
  file's line endings (most files here are CRLF).
- **Retry cap.** The same failure after three different fixes: stop, say what was tried, move on.
- **One task per session** where possible; an unrelated request is a new session.

## Layout
```
<workspace>/
├─ CLAUDE.md, README.md, FORK.md
├─ local/                     YOUR layer, ignored by this repo (local.example/README.md): rules, config, overlay, Unity base
├─ local.example/             what studio-doctor.sh --init copies to local/
├─ .claude/skills/studio-setup/  /studio-setup: tools, sign-ins, Asset Studio on this machine (docs/setup.md)
├─ studio-setup.sh            bash studio-setup.sh [--choose|--install|--login|--asset-studio|--autostart|--smoke]
├─ studio-doctor.sh           bash studio-doctor.sh [--init] [--fetch]   checks the workspace before an update
├─ studio-commit.sh           bash studio-commit.sh "<msg>" [--push]      commits workspace, local/, local/project/
├─ template/                  studio template; every game gets a copy
├─ tools/pixelorama-mcp/      Pixelorama MCP (PixMcpBridge + server; games point to it with ../tools/...; README)
├─ tools/hooks/pre-commit     refuses workspace commits that match local/public-denylist.txt
├─ docs/                      setup.md, game-lifecycle.md (idea → GitHub repo), git-rules.md, test-deploys.md
├─ concept-kit/               files new-concept.sh adds to a concept (no-engine CCGS config, GDD, playtest, name lock)
├─ new-concept.sh             bash new-concept.sh <slug>       concepts/<slug>/: brief, GDD, HTML playtest, name lock
├─ new-game.sh                bash new-game.sh <Game> --concept <slug>   template + concept into a Unity project
├─ publish-game.sh            bash publish-game.sh <Game>      the game's own private GitHub repo
├─ deploy-test.sh             bash deploy-test.sh <folder> [--prod]      playtest or WebGL build → Vercel test URL
├─ sync-template.sh           bash sync-template.sh <Game> [--dry-run]   port shared template files
├─ list-template-requests.sh  bash list-template-requests.sh [--open]    tickets of every game
├─ licenses/                  upstream licenses
├─ concepts/                  local: BACKLOG.md and one folder per concept, each a local git repo (ignored)
└─ <Game>/                    one folder = one Unity project = one git repo (ignored by this repo)
```
- Start Claude Code **inside a concept or game folder** for that work: CCGS hooks, rules and `.mcp.json` load only from the
  folder where `claude` starts.
- Game codes are the folder prefix (`CG01-Name` → `CG01`); template request IDs use them.

## Your layer: `local/` (`docs/local-layer.md`)
- Workspace files belong to the public repo; `local/` belongs to the user. Never change a workspace file for one
  user's needs (a platform, a language, a plugin, a path): put it in `local/` (`RULES.md`, `studio.config.json`,
  `overlay/`, `seed/`, `project/`). A change every user would want goes into the workspace files.
- Nothing from `local/`, no paid plugin and no personal data is ever committed to the workspace repo.
- A change that touches both sides is one message in each repo: `bash studio-commit.sh "<msg>"`.

@local/RULES.md

## From idea to game (`docs/game-lifecycle.md`)
Stages, each closed by the user: 0 idea (`concepts/BACKLOG.md`) → 1 brief → 2 GDD draft → 3 HTML playtest
(PROCEED, PIVOT or KILL) → 4 GDD v1.0 → 5 name lock → 6 game project → 7 GitHub repo → 8 production.
- Stages 1 to 5 happen in `concepts/<slug>/` (`new-concept.sh`): CCGS with **no engine set**, so `/prototype`
  builds the browser playtest. Never `/setup-engine` there, never grow the playtest into a web project.
- **No Unity project, folder name, repo or product name before the name is locked** (`design/name-lock.md`,
  `Status: locked`). `new-game.sh --concept` refuses an unlocked concept or a folder that differs from the lock.
- The Unity project is created by the user in Unity Hub, in the workspace root, with the locked folder name.
- The GitHub repo comes after the first commit: `publish-game.sh`, private, only when the user asks.

## Git (`docs/git-rules.md`)
- Workspace repo public (workspace files only); concept repos local with no remote; one private GitHub repo per game.
- Trunk `main`; no force-push, no rewriting pushed history, no `--no-verify`. In this workspace and `local/`, commit
  and push only when the user asks (a user's `local/RULES.md` may set otherwise); inside a game or concept, one
  branch per task, merged `--no-ff` into `main`, pushed and deleted at its end without asking (`template/CLAUDE.md`,
  "Autonomy").
- Conventional Commits, plus the fixed messages in `git-rules.md` (start, sync, request, release, GDD, name lock).

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
- **Upstream.** `template/` started as a fork of Claude Code Game Studios `v1.3.0` and is a hard fork since template
  v2.60: CCGS files are edited in place and upstream releases are no longer merged. `FORK.md` keeps the history and
  the license notice; log notable changes to CCGS files in it.
- **Public repo.** This workspace repo is public. Never add paid Asset Store plugins, game content, credentials or
  machine-specific paths to it. Game repos that hold paid plugins stay private.
