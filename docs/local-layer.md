# Your layer: `local/`

The workspace has two owners. **Workspace files** (everything this repo tracks: `CLAUDE.md`, `docs/`, the scripts,
`template/`, `concept-kit/`, `tools/`) come from the public repo and are updated by pulling a new version.
**`local/`** is yours: your rules, your platform, your accounts, your paid plugins, your Unity starting project. The
workspace repo ignores it, so a pull never touches it and a commit never publishes it.

Keep that split and updates stay a plain `git merge` with no conflicts. Change a workspace file for your own needs
and every update conflicts on it.

## Set it up

```bash
git clone https://github.com/voilenmang12/claude-game-studio my-studio
cd my-studio
bash studio-doctor.sh --init        # local/ from local.example/, commit hook on
cd local && git init -b main         # your own repo; private if it holds plugins or personal data
```

If you forked the repo on GitHub instead, add the public repo as `upstream`:
`git remote add upstream https://github.com/voilenmang12/claude-game-studio`.

## What goes where

| Need | Put it in | Used by |
|---|---|---|
| Rules for workspace and concept sessions (your language, your portal, portfolio decisions) | `local/RULES.md` | imported by the workspace `CLAUDE.md` and each concept's `CLAUDE.md` |
| Rules for every game (platform, build, SDKs, plugins) | `local/overlay/.claude/studio-rules.md` | imported by each game's `CLAUDE.md` |
| Your own skills, rules, build scripts for every game | `local/overlay/<same path as in the game>` (for example `.claude/skills/my-build/SKILL.md`) | copied into every game by `new-game.sh` and **every** `sync-template.sh` |
| A different version of a template file in your games | `local/overlay/<its path>` | wins over the template's copy at every sync |
| Files a new game starts with and then owns (`project.yaml` with your build command, `design/art/...`) | `local/seed/<path>` | copied by `new-game.sh`; `sync-template.sh` only creates missing ones |
| A Unity project every game starts from (base code, paid plugins, settings) | `local/project/` (a whole project: `Assets/`, `Packages/`, `ProjectSettings/`) | `new-game.sh` copies it to the new game folder (new product GUID) |
| Machine and account values | `local/studio.config.json`: `vercelScope`, `assetStudioApi`, `assetStudioDir`, `backlog` | `deploy-test.sh`, `template/Tools/asset-studio.mjs` (environment variables still win), `new-concept.sh` (`backlog`: the idea backlog's path from the workspace root, for example `local/docs/backlog.md`, so it is kept in your repo; default `concepts/BACKLOG.md`, in no repo) |
| Words that must never be public | `local/public-denylist.txt` | `tools/hooks/pre-commit` |
| Your notes and decisions | `local/docs/` | you |

Imports resolve relative to the file that holds them. A concept's `@../../local/RULES.md` points outside the
concept folder, so the first Claude Code session in each concept asks once to approve that external import:
approve it, or the local rules do not load there. The workspace and game imports are inside their folders and load
without a prompt.

A new game is built in this order, later wins: `local/project/` (or your Unity Hub project) → `template/` →
`local/seed/` → `local/overlay/`. Each game is still a complete repo of its own: it holds copies, not links.
Files named `_layer.md` are notes about a folder and are never copied.

`local/project/` can be a git repo of its own (for example the base project's existing repo) and a working
Unity project: open it in Unity Hub to work on the base, and keep its template files current with
`bash sync-template.sh local/project`. Version your layer in `local/CHANGELOG.md` (what changed, which workspace
version it was tested with, Port steps); a `LOCAL_VERSION` file in `local/overlay/` tells each game which one it has.

## Commit both sides

```bash
bash studio-commit.sh "feat: <what>"          # commits every repo that changed: workspace, local/, local/project/
bash studio-commit.sh "feat: <what>" --push   # and pushes them
```

It shows each repo's changes first, runs the workspace hook as usual, and stops at the first failure.

## Update to a new version

```bash
bash studio-doctor.sh --fetch        # what changed in your workspace files, and the newer versions
git merge vX.YY                      # or: git pull
```

Then follow the **Port** steps of each new version in `template/TEMPLATE_CHANGELOG.md` for every game
(`bash sync-template.sh <Game>`). If `studio-doctor.sh` lists workspace files you changed, move those changes into
`local/` first and restore the files (`git checkout -- <file>`). A change that every user would want belongs in the
public repo: open an issue or a pull request there.

## Keep private things private

- `tools/hooks/pre-commit` (turned on by `--init`, or `git config core.hooksPath tools/hooks`) refuses a workspace
  commit that adds a file under `local/`, a `.unitypackage`, a secrets file, or a line or file name that matches a
  pattern in `local/public-denylist.txt`.
- `studio-doctor.sh` warns when `local/` is tracked by the workspace repo or when its own remote is public (with `gh`).
- Game repos hold paid plugins once `local/project/` or `local/overlay/` adds them: keep those repos private.
