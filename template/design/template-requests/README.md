# Template requests

A game may change what every game gets, but only through a ticket in this folder. The game never edits
`template/` itself. The template session reviews the ticket, turns it into a general change, releases it in a
template version, and the changelog names the ticket.

## When to file

File a ticket when work in this game made or found something every game should have:

- **Fix**: a bug in a file that came from the template (anything a `TEMPLATE_CHANGELOG.md` entry lists, plus
  `Assets/Integration/`, `Assets/Editor/`, `AgentScripts/`, `Tools/`, `.claude/`).
- **Tool**: a script, validator, importer, skill or workflow that other games can use unchanged or with settings.
- **Rule**: a limit, pitfall or measured value learned the hard way (an engine quirk, a store or portal check, a
  connector setting that works).
- **Standard**: a template standard that turned out wrong, missing or too strict in a real game.

Must file: every time this game edits a template-owned file to fix a bug. Without a ticket the next port overwrites
the fix, and the other games keep the bug.

Do not file game content: names, story, palette, art, balance numbers. A change to a template-owned file made only
for this game needs no ticket; say why in that commit message.

## ID and file

- ID: `TR-<game code>-<NNN>`. The game code is the folder prefix (`CG01`); `NNN` is the next free number in this
  folder, from `001`. Numbers are never reused, also after a rejection.
- File: `design/template-requests/TR-CG01-001-<short-slug>.md`. One ticket, one change.
- Commit it in the game repo on its own: `docs: template request TR-CG01-001`.
- Tell the user the ticket ID. The template picks it up from the folder (`bash list-template-requests.sh` at the
  workspace root); nothing else is needed.

## Form

```markdown
# TR-CG01-001: <one-line title>

- Game: CG01-MyGame
- Filed: YYYY-MM-DD
- Template version: 1.02 (the game's TEMPLATE_VERSION when filed)
- Type: fix | tool | rule | standard
- Priority: high (breaks or blocks other games) | normal | low
- Status: open

## Problem
What happened in this game, and why other games will hit it too.

## Proposal
What should change in the template: files, sections, new files.

## Evidence
Game commits, paths in this game, validator or test output, screenshots. Say what was checked and what was not.

## Game-specific parts
What must stay out of the template (names, palette, numbers that only fit this game).

## Port impact
Minor (copy files) or major (migration steps), and what an existing game must do to take it.
```

## Statuses

| Status | Meaning |
|---|---|
| `open` | Filed, not reviewed yet |
| `needs-info` | The template needs more evidence; the reason is in the template's table |
| `accepted` | Will be in the next version; the work is under `## Unreleased` in the changelog |
| `rejected` | Not taken; the reason is in the template's table. The game may keep its own copy |
| `released vX.YY` | In template version `vX.YY` |

The template's table, "Template requests" in `TEMPLATE_CHANGELOG.md`, is the authority. The `Status:` line in the
game's file is updated by the port commit that brings that version (`released vX.YY`), or by hand when the ticket is
rejected or needs more information.

## Template side

In `template/` or the workspace root:

1. `bash list-template-requests.sh --open` lists the tickets the template has not finished.
2. Read the ticket and its evidence in the game. The user approves each accept or reject.
3. Add a row to the table in `TEMPLATE_CHANGELOG.md` with the status and, for `needs-info` or `rejected`, the reason.
4. Accepted: make the change in `template/` as a general change (strip the game-specific parts), test it, and end
   each changelog line it adds with the ticket ID, for example `(TR-CG01-001)`.
5. Release: the version entry gets a `**Requests**` line with every ticket it closes, and each table row becomes
   `released vX.YY`.
