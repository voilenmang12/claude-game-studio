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

`--asset-studio [dir]` clones [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio) (default: next
to the workspace), runs the `python -m pip install` lines of its README Quick start and its doctor, and writes
`assetStudioDir`. `--autostart` (Windows) puts `codex-asset-studio.cmd` in your Startup folder, which runs its
`start-on-logon.ps1`, and starts the worker now. `--smoke` makes one real image (uses your image quota).

The worker drafts each image prompt with AGY when it is signed in and falls back to Codex (`auto`); images are always
made by Codex ImageGen. A game chooses per project or per job: `template/Assets/Integration/AssetStudio.md`.
