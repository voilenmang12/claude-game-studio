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
  screenshots, a replaced asset), move it to `_to_delete/` at the project root, which git ignores, and tell the
  user; the user empties it by hand. Never move tracked files there to dodge a review: delete those with `git rm`
  in a commit the user asked for.
- `TEMPLATE_VERSION` — template version this project is synced to; `TEMPLATE_CHANGELOG.md` — what
  each version changed and how to port it. In a game, change both only when porting a template version.
- **Template requests.** When work in a game makes or finds something every game should have (a fix in a
  template-owned file, a reusable tool, a rule learned the hard way, a standard that is wrong), file a ticket in
  `design/template-requests/` by its `README.md` and give the user its ID. A game never edits `template/`. A fix
  to a template-owned file always gets a ticket, or the next port overwrites it.
- **Git.** This repo is the game's own, private GitHub repo (`origin`). Follow the workspace's
  `docs/git-rules.md`: trunk `main`, Conventional Commits with the story ID, the fixed messages (`chore: sync
  template vX.YY`, `docs: template request TR-...`), no force-push, no `--no-verify`, nothing generated or
  secret, commit and push only when the user asks. The concept's design (`design/game-brief.md`,
  `design/production-gdd.md`, `design/playtest-record.md`, `design/name-lock.md`) and its HTML playtest
  (`prototypes/`, the feel reference) came in at the first commit.
- Code root is `Assets/`; there is no `src/`. Tests go in `Assets/Tests/EditMode/` and `Assets/Tests/PlayMode/`.
- The Unity CLI drives the open Editor. Pass `--project-path` when more than one Editor is open. Editor-side helper
  scripts live in `AgentScripts/` and run with `unity command run_script`.
- **Play Mode is run by the user.** For CCGS "run and observe", ask the user to play and supply the screenshot.
- **Art style** is the game's choice, made in the art bible (`/art-bible`) and recorded in the "Art style" row of
  `design/art/ui-prompt-profile.md` (`pixel` or `raster`). Ask before producing art when it is not set.
  - **Pixel art** is optional: the `pixel-art` skill turns on Pixelorama and its MCP server for the game
    (`node Tools/pixel-art.mjs enable`) and holds the workflow (`.pxo` sources in `ArtSource/`,
    `bash Tools/export-pixelorama.sh`, `Assets/Integration/PixelArt.md`). Without it the game has no `pixelorama`
    MCP server and needs no Pixelorama.
  - **Raster** (any non-pixel style): connector jobs with the raster pipeline, files in `Assets/ArtRaster/`
    (`UIPrompting.md` section 10).
  Detailed assets in either style use the REST API of [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio) (a separate repo, run locally). Submit a job, wait for `done`, and use the
  PNG at `export_path`. The connector worker generates the image and exports the sprite; never generate it yourself.
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

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

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
