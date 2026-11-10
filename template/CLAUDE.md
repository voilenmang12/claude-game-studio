# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

> This project was made from the `claude-game-studio` template, a fork of
> Claude Code Game Studios v1.2.0 (see `FORK.md` in the workspace root).

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

## Studio template (read before writing game code)

- `TEMPLATE_VERSION` — template version this project is synced to; `TEMPLATE_CHANGELOG.md` — what
  each version changed and how to port it. In a game, change both only when porting a template version.
- **Template requests.** When work in a game makes or finds something every game should have (a fix in a
  template-owned file, a reusable tool, a rule learned the hard way, a standard that is wrong), file a ticket in
  `design/template-requests/` by its `README.md` and give the user its ID. A game never edits `template/`. A fix
  to a template-owned file always gets a ticket, or the next port overwrites it.
- Code root is `Assets/`; there is no `src/`. Tests go in `Assets/Tests/EditMode/` and `Assets/Tests/PlayMode/`.
- The Unity CLI drives the open Editor. Pass `--project-path` when more than one Editor is open. Editor-side helper
  scripts live in `AgentScripts/` and run with `unity command run_script`.
- **Play Mode is run by the user.** For CCGS "run and observe", ask the user to play and supply the screenshot.
- Art is pixel art from Pixelorama: sources in `ArtSource/*.pxo`, export with
  `bash Tools/export-pixelorama.sh`, Unity import rules in `Assets/Editor/Art/PixelArtImporter.cs`.
  Read `Assets/Integration/PixelArt.md` before producing or importing art. When the `pixelorama`
  MCP server is connected, draw small assets (icons, items, tiles, recolors) in the open Pixelorama
  project and save them under `ArtSource/`. Log every asset in `design/asset-ledger.csv`.
  Detailed assets use the asset connector REST API (a separate service). Submit a job, wait for `done`, and use the
  PNG at `export_path`. The connector worker generates the image and exports the sprite; never generate it yourself.
  Non-pixel art uses its raster pipeline and goes to `Assets/ArtRaster/`. Simple pixel UI pieces are
  drawn with Pixelorama MCP instead of a job (`Assets/Integration/UIPrompting.md`, section 3).
  Every popup and button follows `Assets/Integration/UIPopupStandard.md` (layer stack, shared kit, contrast).

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line below is engine-specific. /setup-engine
     rewrites it to @docs/engine-reference/<engine>/VERSION.md for the chosen
     engine, so a Unity or Unreal project stops loading the Godot reference every
     session. It defaults to Godot (the template's example engine); skills that
     need the pinned version read docs/engine-reference/<engine>/VERSION.md on
     demand regardless of this import. -->
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

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

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
