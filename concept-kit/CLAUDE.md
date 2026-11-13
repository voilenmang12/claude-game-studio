# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: [CHOOSE: Web / Godot 4 / Unity / Unreal Engine 5]
- **Language**: [CHOOSE: TypeScript / GDScript / C# / C++ / Blueprint]
- **Version Control**: Git with trunk-based development
- **Build System**: [SPECIFY after choosing engine]
- **Asset Pipeline**: [SPECIFY after choosing engine]

> **Note**: Engine-specialist agents exist for Godot, Unity, and Unreal with
> dedicated sub-specialists. Use the set matching your engine.

> This is a **concept folder** made by `new-concept.sh` from the `claude-game-studio` workspace (a fork of Claude
> Code Game Studios v1.3.0). It is not a game project yet: no engine is set on purpose, so `/prototype` builds the
> browser playtest first. The game itself is built later in Unity from the workspace's `template/`.

## Language

- **Reply to the user in the language they write in.** Everything written into this folder is English.
- When the user describes a mechanic or text in another language, translate it into short, natural game English and
  show the wording in your reply so they can approve it.

## Local rules

The workspace user's own rules (`local/RULES.md`, `../../docs/local-layer.md`); they win over this file. Claude Code
asks once per concept to approve this import because it is outside the folder; approve it:

@../../local/RULES.md

## Concept stage (read before anything else)

Guide: `../../docs/game-lifecycle.md` (stages 1 to 5). Git rules: `../../docs/git-rules.md`.

1. **Brief.** `/prototype` (or "make me a game") asks one round of questions and writes `design/game-brief.md`.
2. **GDD draft.** `design/production-gdd.md`, sections 1 to 5 at least, as v0.x. The user approves the core loop
   before the playtest is built.
3. **HTML playtest.** `/prototype` builds `prototypes/<slug>/` from the brief. The user plays it; changes follow
   their play; to play it on a phone, run `bash deploy-test.sh concepts/<slug>/prototypes/<slug>` from the workspace
   root and give the user the URL (`../../docs/test-deploys.md`). Log every play session in `design/playtest-record.md`. The verdict is PROCEED, PIVOT or KILL, and
   only the user gives it.
4. **GDD v1.0.** After PROCEED, finish every section of `design/production-gdd.md` from the brief and the playtest
   record, and set it to v1.0 with the user's approval.
5. **Name lock.** Fill `design/name-lock.md` and get the user's approval of the final name; set `Status: locked`.

Then the game project is made from the workspace root (stage 6): the user creates the Unity project, and
`bash new-game.sh <Code>-<Name> --concept <slug>` copies this folder's design and playtest into it.

- **No engine here.** Never run `/setup-engine`, and never grow the one-shot into a web project: the playtest is the
  feel reference, the game is made in Unity.
- **Git.** This folder has a local git repo with no remote. Commit each accepted playtest iteration (the skill
  offers it) and each approved document version; the skill's tags (`one-shot/<name>`) stay. Never create a GitHub
  repo for a concept and never push it.
- A working title is fine until stage 5. Folder, repo and product names come only from the locked name.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line under this comment is engine-specific,
     and there is none until an engine is set. /setup-engine, the grow's record
     step and /project-settings (engine.name) write
     @docs/engine-reference/<engine>/VERSION.md here for the chosen engine. Skills
     that need the pinned version read that file on demand either way. -->


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

**User-driven collaboration, not autonomous execution.** How much you ask is set by
`modes.automation` in `project.yaml` (`.claude/docs/automation-modes.md`; unset means `collaborative`):

- `collaborative`: every task follows **Question -> Options -> Decision -> Draft -> Approval**;
  ask "May I write this to [filepath]?" before using Write/Edit tools (exempt: `active.md` appends,
  agent memory, a subagent's new file at the path its orchestrating skill named; see
  `.claude/rules/agent-memory.md`); show drafts before requesting approval; multi-file changes
  require explicit approval for the full changeset
- `guided`: ask only for major decisions (`automation-modes.md`, "Major vs Minor"); state the
  recommendation for minor ones and proceed; ask before creating a new file, not before editing one
- `autonomous`: decide, log with `log_decision`, proceed; ask only for `modes.automation_always_ask`
- Every mode: no commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

## Goals, long runs and sessions (keep the context small)

- **Goals (`/goal`).** A goal adds a Stop hook: each time you stop, a model checks the condition against the
  transcript and sends you back to work if it is not met. Before working toward a goal, check that every part of it
  can be shown in the transcript (a test passes, a scan finds no fault, a file exists). A part only the user can do
  (play the game, judge the look, approve a commit, upload to a store) can never be shown: say so in your first reply
  and propose the goal reworded to end at "ready for the user to ...", for the user to set with `/goal <condition>`.
  When only the user's part is left, say once what you need from them and that `/goal clear` stops the checks, then
  end the turn. To a repeated Stop-hook message with nothing new to do, answer in one line and run no tools.
- **Long runs.** Anything that takes more than about two minutes (an asset batch, a build, a test suite, waiting for
  Unity to recompile or import) runs as one background command (`run_in_background`) that works to the end and writes
  a summary; the notification wakes you when it ends. Never wait turn after turn with a polling or sleep script, and
  never sleep in the foreground for more than a few seconds: each extra turn re-reads the whole context.
- **One session per task** (a feature, a fix, a port, an audit, an asset batch). When a task ends, or after the
  second compaction, update `production/session-state/active.md` (done, uncommitted, next step) and tell the user to
  start the next task in a new session (or `/clear`); the new session reads `active.md` first.

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
