# local/: your own layer of the workspace

`local/` holds what is yours: your rules, your platform, your paid plugins, your Unity starting project. The
workspace repo ignores it, so `git pull` from the public repo never touches it, and nothing in it is ever published.
Make it with `bash studio-doctor.sh --init` (it copies this folder), then keep it in a git repo of its own, private
if it holds paid plugins or personal data.

| Path | Read by | What it is |
|---|---|---|
| `RULES.md` | `CLAUDE.md` of the workspace and of every concept (`@local/RULES.md`) | your rules for workspace and concept sessions: language, platform, portfolio decisions |
| `studio.config.json` | `deploy-test.sh`, `template/Tools/pixel-asset.mjs` | machine and account values (Vercel team, asset connector) |
| `public-denylist.txt` | `tools/hooks/pre-commit` | words and patterns that must never reach the public workspace repo |
| `overlay/` | `new-game.sh`, `sync-template.sh` | files laid over `template/` in every game, **every sync**: your rules (`.claude/studio-rules.md`, imported by each game's `CLAUDE.md`), your skills, your build scripts. Same path as in the game. |
| `seed/` | `new-game.sh`, `sync-template.sh` | files a new game starts with that the game then owns (`project.yaml`, `design/art/…`): copied by `new-game.sh`, and by `sync-template.sh` only when the game has none |
| `project/` | `new-game.sh` | optional Unity project every game starts from (your base code, plugins, settings). With it, `new-game.sh` makes the game folder itself; without it, make the project in Unity Hub first |
| `docs/`, anything else | you | your own notes; no script reads them |

Order in a new game: `project/` → `template/` → `seed/` → `overlay/` (later wins). `sync-template.sh` copies the
template's shared files, then `overlay/`, then creates missing `seed/` files.

Rules:
- Never edit a workspace file for your own needs (`CLAUDE.md`, `docs/`, the scripts, `template/`): put it here, or
  `git pull` will conflict. `bash studio-doctor.sh` lists workspace files you changed.
- A change every user would want belongs upstream: open an issue or a pull request on the public repo.
