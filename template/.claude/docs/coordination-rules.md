# Agent Coordination Rules

1. **Vertical Delegation**: Leadership agents delegate to department leads, who
   delegate to specialists. Never skip a tier for complex decisions.
2. **Horizontal Consultation**: Agents at the same tier may consult each other
   but must not make binding decisions outside their domain.
3. **Conflict Resolution**: When two agents disagree, escalate to the shared
   parent. If no shared parent, escalate to `creative-director` for design
   conflicts or `technical-director` for technical conflicts.
4. **Change Propagation**: When a design change affects multiple domains, the
   `producer` agent coordinates the propagation.
5. **No Unilateral Cross-Domain Changes**: An agent must never modify files
   outside its designated directories without explicit delegation.
6. **Read Design Docs by Section**: A brief names the sections an agent needs
   by heading. Find a heading in a GDD, ADR or the art bible with the Grep
   tool (`^#`, content mode) and Read that range with offset and limit; read a doc
   whole only when the task needs all of it, and say why. `validate-read.sh`
   refuses a whole-file read of a doc over 40 KB.
7. **Nothing Goes Upstream**: Never file, open or comment on an issue or pull
   request in an engine, plugin or vendor repository, even when asked. Write a
   draft (`/bug-report` drafts only) and the user submits it.

## Project Boundary

This project is one of several in a workspace: the games, the tools the studio runs (asset worker, task tracker)
and, above them, the workspace with `template/` and its scripts. Each has its own repository and its own session.

8. **Write only inside this project.** A session, and every agent it spawns, changes only the repository it was
   started in. Other projects at the same level and the workspace are read-only: read their files, docs and
   history for reference, copy an idea into this project, and call a tool through its published interface (the
   asset worker's REST API, the tracker's CLI with this project's own id). Never, in another project or the
   workspace: create, edit, move or delete a file; run `git` commands that write (commit, switch, merge, pull,
   push, stash); install or update packages; start, stop or reconfigure its server; or write its data files.
   This holds when the fix is one line, when the other project blocks this one, and when the user is away.
9. **A change elsewhere is a request.** When this project needs another one to change (a bug in a tool, a
   template file, a shared script, something a sibling game has), file a ticket in `design/template-requests/`
   with its `Target:` line (form in that folder's `README.md`), commit it here, and give the user its ID. The
   target project's own session, or the workspace session, makes the change, and it reaches this project as a
   template version or a tool update. Until then work around it inside this project, or put the task under
   "Needs you"; never patch the other project to get unblocked.
10. **What arrives from the workspace.** Template versions (`chore: sync template vX.YY`) and tool updates are
   made by the workspace session. Do not pull, update or re-sync them from here; ask for them with a ticket.

The `project-boundary` hook refuses the plain cases of rule 8 (a Write or Edit, or a writing shell command, aimed
at the workspace outside this project). A refusal is final: file the ticket, never look for another spelling.

## Model Tier Assignment

Read `.claude/docs/model-tiers.md` on demand. It carries the tier table, the
per-skill assignments and the authoring rule.

**Key point:** whether a skill's `model:` is used
depends on how the skill starts. Typed as `/skill-name`: yes, except a `haiku`
pin in auto mode. Started by Claude through the Skill tool: no. Never tell a
user a `haiku` skill saves money; an `opus` skill typed in a Sonnet session
costs more. The agent-side `model:` is a different mechanism, and is applied.

## Subagents vs Agent Teams

This project uses two distinct multi-agent patterns:

### Subagents (current, always active)
Spawned via the `Agent` tool within a single Claude Code session. Used by all
`team-*` skills and orchestration skills. Subagents share the session's
permission context, run sequentially or in parallel within the session, and
return results to the parent.

**When to spawn in parallel**: If two subagents' inputs are independent (neither
needs the other's output to begin), spawn both `Agent` calls simultaneously
rather than waiting. Example: `/review-all-gdds` **Phase 2** (consistency) and
**Phase 3** (design theory) are independent — spawn both at the same time.
Phase 1 loads the GDDs and both depend on it, so it is the one phase here that
must NOT be parallelised.

### Agent Teams (experimental — opt-in)
Multiple independent Claude Code *sessions* coordinated via a shared task list.
Opt-in only — read `.claude/docs/agent-teams.md` on demand before proposing one.

## Parallel Task Protocol

When an orchestration skill spawns multiple independent agents:

1. Issue all independent `Agent` calls before waiting for any result
2. Collect all results before proceeding to dependent phases
3. If any agent is BLOCKED, surface it immediately — do not silently skip
4. Always produce a partial report if some agents complete and others block
