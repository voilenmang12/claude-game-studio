# Setting up a machine

One script, `studio-setup.sh`, checks and sets up everything the studio uses on a machine; the `/studio-setup`
skill walks you through it with Claude Code. It changes nothing unless you pass an action.

## From nothing to a working studio

1. Make an empty folder, start Claude Code in it and say:
   > Clone https://github.com/voilenmang12/claude-game-studio into this folder and set up the game studio for me.

   Claude clones the workspace (with Git; on Windows `winget install Git.Git` first if it is missing).
2. Start Claude Code again **in that folder** (its rules, hooks and skills load only there) and type `/studio-setup`.
3. Answer its questions: which optional parts you want, approval for the installs, then each sign-in in turn.

## The parts

| Part | Why | Check | Install | Sign in |
|---|---|---|---|---|
| `git` (required) | every repo | Git, commit name and email | `winget Git.Git` | `--login git` asks name and email |
| `node` (required) | the scripts | Node 20.11 or later | `winget OpenJS.NodeJS.LTS` | |
| `python` (required) | `ui-kit-check.py`, Asset Studio | Python 3.10 or later, Pillow | `winget Python.Python.3.12`, `--install pillow` | |
| `unity` (required) | the games | Unity Hub, Unity CLI, sign-in, license, the template's Editor | `winget Unity.UnityHub`; Unity CLI by Unity's instructions; `--install unity-editor` | `unity auth login`; license in Unity Hub |
| `github` | each game's private repo | `gh auth status` | `winget GitHub.cli` | `gh auth login --web`, `gh auth setup-git` |
| `vercel` | test URLs (`deploy-test.sh`) | `vercel whoami`, `vercelScope` | `npm i -g vercel` | `vercel login` |
| `codex` | Asset Studio's image generation | signed in with ChatGPT, `image_generation` listed | `npm i -g @openai/codex` | `codex login` |
| `agy` | Asset Studio's prompt drafting (optional) | `agy models` answers | Antigravity CLI download page | run `agy` once and sign in |
| `assetstudio` | generated art | repo folder, worker on `/health`, start at sign-in | `--asset-studio [dir]`, `--autostart` | |
| `pixelorama` | pixel-art games only | Pixelorama 1.2.x, MCP server packages, bridge on 7373 | download from its GitHub releases; `--install pixelorama-server` | |

`bash studio-setup.sh --choose <ids>` records the optional parts you use as `setup` in `local/studio.config.json`;
the check skips the others.

## Sign-ins

Every service keeps its own sign-in (GitHub, Unity, Vercel, ChatGPT for Codex, Google for AGY), so there is one
sign-in per service, done once per machine and kept by that tool. `--login <id>` waits for your answers, so run it in
your own terminal: in the Claude Code prompt, `! bash studio-setup.sh --login <id>`. Claude never types or reads your
passwords or codes, and none of them is written into a repo.

## Codex Asset Studio

`--asset-studio [dir]` clones [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio) (default:
`codex-asset-studio/` in the workspace root, its own repo, ignored by the workspace repo), runs the `python -m pip install` lines of its README Quick start and its doctor, and writes
`assetStudioDir`. `--autostart` (Windows) puts `codex-asset-studio.cmd` in your Startup folder, which runs its
`start-on-logon.ps1`, and starts the worker now. `--smoke` makes one real image (uses your image quota).

The worker drafts each image prompt with AGY when it is signed in and falls back to Codex (`auto`); images are always
made by Codex ImageGen. A game chooses per project or per job: `template/Assets/Integration/AssetStudio.md`.

**Claude runs and maintains it.** Asset Studio is part of the studio's tooling, not something handed back to the user:
- Run: `bash studio-setup.sh` shows whether the worker answers; `--autostart` starts it. Before a job batch, check
  `GET /health` (`worker.ready`), and read `asset-connector/data/windows-worker.stderr.log` when it is not.
- Update: in `codex-asset-studio/`, with no job active, `git pull --ff-only`, the README's `pip install` lines if
  they changed, `node asset-connector/setup.mjs doctor`, then restart the worker. `--smoke` only when a change
  touches generation or export (it uses image quota).
- Change: its own repo, same git rules (`docs/git-rules.md`: one branch per task, merged and pushed). Generated
  assets and worker data (`assets/`, `asset-connector/data/`) are ignored there and never committed.
- Move: paths are stored absolute (`assetStudioDir`, each game's `output_root` and ledger, the worker's
  `store.json`, the sign-in task, the Codex project trust entry); stop the worker and rewrite all of them.

## Task tracker

[project-task-tracking](https://github.com/voilenmang12/project-task-tracking) ("Nhanh") is a local API and web UI
(`http://127.0.0.1:5173`, loopback only) where the user and the agents share each game's design document, task tree
and progress. `--tracker [dir]` clones it (default: `project-task-tracking/` in the workspace root, its own repo,
ignored by the workspace repo), runs `npm ci` and `npm run build`, installs its skill `nhanh-project-tracking` into
`~/.claude/skills/` and writes `trackerDir`. `--tracker-start` (Windows) puts `project-task-tracking.cmd` in your
Startup folder, which runs `tools/tracker/start-tracker.ps1`, and starts the server now.

A game is tracked when `tracker.project_id` in its `project.yaml` names a project of the tracker (`tracker.actor`
is the label its sessions write as, for example `claude-cg01`); `template/CLAUDE.md`, "Task tracker", says what a
game session records there. Create the project once with `projects.create` (CLI: `node
project-task-tracking/scripts/nhanh.mjs`, envelope in the skill's `references/calls.md`).

**Claude deploys, runs and updates it:**
- Run: `bash studio-setup.sh` shows whether it answers; `--tracker-start` starts it. One server per data directory:
  never start a second one, and never write `.local/` by hand (API or CLI only).
- Data: everything is in `project-task-tracking/.local/` (ignored by its repo, never committed). Copy that folder
  before an update or a move; `workspace.backup.json` is the snapshot before the last write.
- Update: stop the server (the process on port 5173), copy `.local/`, `git pull --ff-only`, `npm ci`,
  `npm test`, `npm run build`, start it again and check `GET /api/health`. A new skill version: move
  `~/.claude/skills/nhanh-project-tracking` away, then `--tracker` again.
- Change: its own repo, same git rules (`docs/git-rules.md`); `npm test` and `npm run build` before each merge.
