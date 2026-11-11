---
name: studio-setup
description: Sets up this machine for the game studio in one pass - local/ layer, tools, every sign-in (Git, GitHub, Unity, Vercel, Codex, AGY) and Codex Asset Studio - with bash studio-setup.sh. Use right after the workspace is cloned, when the user says "set up the game studio" or "triển khai game studio", or when a tool or sign-in stopped working.
---

# Studio setup

Drive `bash studio-setup.sh` (workspace root) until its check prints `All set.`. Details per part: `docs/setup.md`.
Talk to the user in their language. Do the work yourself; the user only decides and signs in.

## 0. Where you are
- The workspace root must be the folder Claude Code started in (it has `studio-setup.sh` and `template/`). If you
  just cloned it from somewhere else, tell the user to start Claude Code again in that folder and type
  `/studio-setup`, then stop.
- Run `bash studio-setup.sh` and show the result as a short table (part, state, what is left).

## 1. Choose the parts
Required for every user: `git`, `node`, `python`, `unity`. Ask which optional parts they want, one question,
several answers (the check shows which already work):
- `github`: GitHub CLI, for each game's private repo (`publish-game.sh`).
- `vercel`: test URLs for playtests and WebGL builds (`deploy-test.sh`).
- `assetstudio` + `codex`: Codex Asset Studio makes the game art (needs a ChatGPT plan with image generation).
- `agy`: Antigravity CLI drafts Asset Studio's image prompts; without it Codex drafts them.
- `pixelorama`: only for pixel-art games.
Save the answer: `bash studio-setup.sh --choose <ids>`. Without `local/`, run `bash studio-doctor.sh --init`
first (it makes `local/` and turns on the commit hook).

## 2. Install what is missing
List every missing tool with its install command and ask once for approval (installs accept the package's terms).
Then run `bash studio-setup.sh --install <id>` for each, one at a time. When it prints that PATH changed, tell the
user to restart Claude Code in this folder and run `/studio-setup` again; the check picks up where it stopped.
- `--install` exits 3 for tools that are not in a package manager (Unity CLI, AGY, Pixelorama): give the user its
  printed steps (look up the current official download page if they ask) and wait until they say it is done.
- `unity-editor` downloads several GB: say so before you start it, and run it in the background.

## 3. Sign in, one service at a time
Order: `git` → `github` → `unity` → `vercel` → `codex` → `agy` (skip the ones not chosen or already ok).
Sign-ins are interactive, so they cannot run in your own shell. For each one:
1. Say what will open (a browser page, a code to confirm, or for `git` two questions: name and email).
2. Ask the user to run it in the Claude Code prompt: `! bash studio-setup.sh --login <id>`. In the desktop app you
   may start it in the user's Terminal panel instead and wait for their answer.
3. When they say it is done, run `bash studio-setup.sh` and confirm that row is `ok` before the next one.
Never type a password, token or code for them, and never ask them to paste one into the chat.
- Unity license: if the check says no active license, the user adds one in Unity Hub → Preferences → Licenses.
- Vercel: after the sign-in, run `vercel teams ls` and ask which scope to use; write it as `vercelScope` in
  `local/studio.config.json`.

## 4. Codex Asset Studio (if chosen)
1. Ask where it should live (default: next to the workspace). `bash studio-setup.sh --asset-studio [folder]` clones
   it, installs its Python packages and runs its doctor. If the doctor fails, fix what it lists and run it again.
2. Ask before `bash studio-setup.sh --autostart`: it adds a file to the Windows Startup folder so the worker
   starts at every sign-in, and starts it now.
3. Offer `bash studio-setup.sh --smoke`: one real image job, which uses the user's image quota. Run it only on yes.
4. Prompt drafting: with `agy` signed in, the worker drafts with AGY and falls back to Codex (`auto`). A game can pick
   per project (`defaults.prompt_provider` in `design/art/asset-studio-project.json`) or per job
   (`--prompt-provider`): `Assets/Integration/AssetStudio.md` in the template.

## 5. Finish
Run `bash studio-setup.sh` and `bash studio-doctor.sh`, show both summaries, and say what is still open and why
(a part the user skipped, a sign-in they will do later). Next step for a first game: `bash new-concept.sh <slug>`
(`docs/game-lifecycle.md`).
