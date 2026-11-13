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
- **Git.** This folder has a local git repo with no remote. Each task runs on its own branch and is merged into
  `main` at its end (Autonomy); commit each accepted playtest iteration and each approved document version; the skill's tags (`one-shot/<name>`) stay. Never create a GitHub
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

## Autonomy

CGS games run without the user in the loop: `modes.automation: autonomous` in `project.yaml`
(`.claude/docs/automation-modes.md`), full tool permissions in `.claude/settings.json`. The user may be away and
follow from a phone (Remote Control), so a run never stops to ask.

- **Decide and proceed.** Pick the option that best fits the brief, GDD and art bible, log it (`log_decision`, or
  the goal's Log), continue. No AskUserQuestion; the skills exempt in `automation-modes.md` (`setup-engine`,
  `gate-check`, `hotfix`, `day-one-patch`) still ask.
- **Size the task first, and check only as much as its size needs.** Say the size in one line when you start.
  | Size | Examples | Check | Report |
  |---|---|---|---|
  | **S** | an icon, a color, a text, one value, a small UI fix, one tuning value | reload the playtest, then **one** "after" screenshot of that screen (no "before" unless the request compares them); a logic bug also gets its test | no report file: the image and 2-3 sentences in the closing message |
  | **M** | a feature, several screens, a new asset set | the tests it touches, one screenshot per touched screen | short report (`task-report.md`) |
  | **L** | a goal, `/run-goal`, a rework or an audit | full checks | full report |
  A task that turns out bigger moves up one size and says so. Aim for S in about 15 tool calls.
- **Stay in scope.** Do what was asked, nothing next to it: no checking other screens "while you are there", no
  finishing unrelated work in flight. Anything you notice goes on one line under "Left" in the closing message.
- **Do and check the work yourself:** write and edit files, run the HTML playtest yourself (browser tools),
  look at the screenshots and judge them against the task's written criteria.
- **One task, one branch, closed by you.** Start each task on a new branch from `main` (`task/<slug>`) and commit
  each finished item there (Conventional Commits). At the end, without asking: commit what is left,
  `git switch main`, `git merge --no-ff <branch>` (one merge commit per task, so `git revert -m 1 <merge>` undoes
  it), then delete the branch. Concepts have no remote: never push. Done means a clean tree on `main` and no task
  branch left. Never ask "commit?", "merge?" or "delete the branch?". Never rewrite history or use `--no-verify`.
- **Never alone:** spend money, publish (store or portal upload, a public repo, `vercel --prod`), change accounts,
  sign-ins or credentials, delete outside this repo. Put these under "Needs you" in the report and carry on with the
  rest. A taste or business call with no written answer: choose a reversible default, note it under "Needs you".
- **Report by size** (`.claude/docs/task-report.md`): S in the closing message with its one image; M and L as a
  report file with screenshots, checks, commits and what you decided alone, sent with `SendUserFile`.
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
- **Audit and QA run in two passes, never mixed.** Pass 1, find: one sweep of the playtest, no fixes, ending in a findings list ranked blocker / major / minor, each with its screen or file and one
  image or line of proof (`production/qa/audit-<date>.md`). Pass 2, fix: each finding becomes one goal item, highest
  first, checked as an S task; minors left at the end are listed, not chased. Load the playtest once per
  sweep, not once per finding.
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
