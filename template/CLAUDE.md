# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

> This project was made from the `claude-game-studio` template, a fork of
> Claude Code Game Studios v1.3.0 (see `FORK.md` in the workspace root).

## Technology Stack

- **Engine**: Unity 6000.6.7f1 (Unity 6.6), URP 2D
- **Language**: C#
- **Target**: [TO BE CONFIGURED] (platforms, store or portal)
- **Version Control**: Git with trunk-based development
- **Build System**: Unity CLI (`unity command run_script --file AgentScripts/<X>.cs --entry <X>.<Method>`)
- **Asset Pipeline**: Unity importer; Sprite Atlas for 2D; TextMeshPro

> Engine-specialist agents: use the Unity set (`unity-specialist`, `unity-ui-specialist`,
> `unity-shader-specialist`, `unity-addressables-specialist`). Ignore Godot/Unreal agents.

## Language

- **Reply to the user in the language they write in**, including questions, options, summaries and review results.
- **Everything that ships or lives in the repo is English:** player-facing text, asset and scene names, C#
  identifiers, code comments, log messages, design docs under `design/`, stories and sprint files under
  `production/`, commit messages. Change this rule here if the game ships in other languages.
- When the user describes a mechanic or text in another language, translate it into short, natural game English and
  show the wording in your reply so they can approve it.

## Studio rules

The studio's own rules for every game (platform, build, SDKs, plugins). They come from the workspace's
`local/overlay/` and win over this file; change them there, never in a game:

@.claude/studio-rules.md

## Studio template (read before writing game code)

- **Deleting files.** The CCGS settings deny `rm -rf`. To get rid of a file or folder you made (scratch output,
  screenshots, a replaced asset), move it to `_to_delete/` at the project root, which git ignores, and list it in the report;
  the user empties it by hand. Never move tracked files there to dodge a review: delete those with `git rm`
  in a commit.
- `TEMPLATE_VERSION` — template version this project is synced to; `TEMPLATE_CHANGELOG.md` — what
  each version changed and how to port it. In a game, change both only when porting a template version.
- **Template requests.** When work in a game makes or finds something every game should have (a fix in a
  template-owned file, a reusable tool, a rule learned the hard way, a standard that is wrong), file a ticket in
  `design/template-requests/` by its `README.md` and give the user its ID. A game never edits `template/`. A fix
  to a template-owned file always gets a ticket, or the next port overwrites it.
- **Git.** This repo is the game's own, private GitHub repo (`origin`). Follow the workspace's
  `docs/git-rules.md`: trunk `main`, Conventional Commits with the story ID, the fixed messages (`chore: sync
  template vX.YY`, `docs: template request TR-...`), no force-push, no `--no-verify`, nothing generated or
  secret; commit as you work and push at the end of a task or goal (Autonomy). The concept's design (`design/game-brief.md`,
  `design/production-gdd.md`, `design/playtest-record.md`, `design/name-lock.md`) and its HTML playtest
  (`prototypes/`, the feel reference) came in at the first commit.
- Code root is `Assets/`; there is no `src/`. Tests go in `Assets/Tests/EditMode/` and `Assets/Tests/PlayMode/`.
- The Unity CLI drives the open Editor. Pass `--project-path` when more than one Editor is open. Editor-side helper
  scripts live in `AgentScripts/` and run with `unity command run_script`.
- **Play Mode.** Claude runs it: the unity-cli skill's play-mode loop (`unity command set_autotick`,
  `editor_play`, confirm frames advance, screenshot, `editor_stop`). Judge what you see against the task's criteria;
  the screenshots go in the report. WebGL builds: `/cg-webgl-build` and the browser tools.
- **Art style** is the game's choice, made in the art bible (`/art-bible`) and recorded in the "Art style" row of
  `design/art/ui-prompt-profile.md` (`pixel` or `raster`). When it is not set, choose it from the brief, record it and say so in the report.
  - **Pixel art** is optional: the `pixel-art` skill turns on Pixelorama and its MCP server for the game
    (`node Tools/pixel-art.mjs enable`) and holds the workflow (`.pxo` sources in `ArtSource/`,
    `bash Tools/export-pixelorama.sh`, `Assets/Integration/PixelArt.md`). Without it the game has no `pixelorama`
    MCP server and needs no Pixelorama.
  - **Raster** (any non-pixel style): Asset Studio jobs with the raster pipeline, files in `Assets/ArtRaster/`
    (`UIPrompting.md` section 10).
  Detailed assets in either style use the REST API of [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio) (a separate repo, run locally; `Assets/Integration/AssetStudio.md`). Submit a job, wait for `done`, and use the
  PNG at `export_path`. The Asset Studio worker generates the image and exports the sprite; never generate it yourself.
  Log every asset in `design/asset-ledger.csv`. Every popup and button follows
  `Assets/Integration/UIPopupStandard.md` (layer stack, shared kit, contrast).

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line under this comment is engine-specific,
     and there is none until an engine is set. /setup-engine, the grow's record
     step and /project-settings (engine.name) write
     @docs/engine-reference/<engine>/VERSION.md here for the chosen engine. Skills
     that need the pinned version read that file on demand either way. -->
@docs/engine-reference/unity/VERSION.md


## Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Autonomy

CGS games run without the user in the loop: `modes.automation: autonomous` in `project.yaml`
(`.claude/docs/automation-modes.md`), full tool permissions in `.claude/settings.json`. The user may be away and
follow from a phone (Remote Control), so a run never stops to ask.

- **Decide and proceed.** Pick the option that best fits the brief, GDD and art bible, log it (`log_decision`, or
  the goal's Log), continue. No AskUserQuestion; the skills exempt in `automation-modes.md` (`setup-engine`,
  `gate-check`, `hotfix`, `day-one-patch`) still ask.
- **Do and check the work yourself:** write and edit files, run tests, builds and Play Mode (Studio template,
  "Play Mode"), look at the screenshots and judge them against the task's written criteria.
- **Commit as you go:** one Conventional Commit per finished item on the current branch; push the game's own private
  repo at the end of a task or goal. Never force-push, rewrite pushed history or use `--no-verify`.
- **Never alone:** spend money, publish (store or portal upload, a public repo, `vercel --prod`), change accounts,
  sign-ins or credentials, delete outside this repo. Put these under "Needs you" in the report and carry on with the
  rest. A taste or business call with no written answer: choose a reversible default, note it under "Needs you".
- **Report every task with images** (`.claude/docs/task-report.md`): screenshots before and after, checks, commits,
  what you decided alone; sent to the user with `SendUserFile`.
- A project that sets `collaborative` or `guided` follows those modes in `automation-modes.md` instead.
- Started outside this file's folder? Warn first: hooks, permissions and the goal check load only when Claude Code
  starts here.

## Autonomous runs (keep the context small)

- **Goals: `/run-goal <what>`.** It writes `production/session-state/goal.md` (a checklist where every item names
  its check), works through it and reports. The `goal-check` Stop hook keeps the run going while items are open and
  goal.md keeps changing; it has no model judge, so it never loops: a stop with no new tick or Log line ends the
  goal as `stalled`, and so does reaching `Max nudges`. Prefer it to the built-in `/goal`, whose model judge
  re-checks the whole transcript at every stop. If a built-in `/goal` is set, mirror it into goal.md, end each turn
  with a short "Goal status" block (every item and its evidence), and if part of it can never be shown say once
  that `/goal clear` stops it.
- **Read once.** Read a file once per task and trust your own edits; for big docs Grep the heading and read that
  range (`md-section.sh`). Wide searches and audits over many files go to a subagent that returns a summary. Keep
  progress in goal.md and `production/session-state/active.md`; after a compaction read those two, not the history.
- **No polling, no re-checking.** Anything over about two minutes (asset batch, build, test suite, Unity import or
  recompile) runs as one background command (`run_in_background`) and its notification wakes you. Never wait turn
  after turn or sleep in the foreground beyond a few seconds. Run a check once after a batch of changes, not after
  each edit; do not repeat `git status` or `unity status` between steps when nothing changed.
- **Retry cap.** The same failure three times with three different fixes: mark the item `[~]` with the reason, move
  on, and list it in the report. Never repeat an identical command hoping for a different result.
- **Sessions.** One goal or task per session. Before ending, update `active.md` (done, open, next step); the next
  session starts from it.

> **First session?** Say "make me a game" (`/prototype`), or run `/start` to begin
> the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
