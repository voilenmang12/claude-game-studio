# TODO working title: Production GDD

- Version: v0.1 (draft; v1.0 = approved after PROCEED, the baseline the game project starts from)
- Date: YYYY-MM-DD
- Status: draft | approved
- Brief: `design/game-brief.md` · Playtest: `prototypes/<slug>/` · Record: `design/playtest-record.md`

Write player-facing rules, not code. Numbers are starting values for tuning; mark each one `(start)`. Keep the
brief's Keep, Avoid and Out of scope lines true here. Sections 1 to 5 are needed before the HTML playtest is built;
all sections are needed for v1.0.

## 1. Pitch

One sentence a player would understand. Then the genre, the platform and the audience.

## 2. Player experience

- **First action:** what the player does in the first seconds, and what they see and hear.
- **Immediate objective:** the goal of the first session.
- **Skill expression:** what a better player does differently.
- **Replay:** why the next run or level is different.
- **Tone:** look and feel in two lines.

## 3. Controls and UI

| Context | Input and feedback |
|---|---|
| Main play | |
| Menus, pause | |
| Results | |

## 4. Core rules

The rules of the core loop, unambiguous: win, lose, scoring, resources, edge cases that matter to the player.

## 5. Structure and progression

Session or run length, level or wave structure, what persists between sessions, unlocks.

## 6. Content and balance

Content counts for the first release (levels, enemies, items, upgrades) and the starting numbers. A long catalog
can live in `design/content-and-balance.md`, linked here.

## 7. Art and audio direction

Style (pixel or raster, palette, camera, frame sizes), reference images (`references/`), the asset list for the first
release, sound and music. The game's art bible later grows from this section.

## 8. Technical notes (Unity)

Scenes, data the game saves, data-driven values, performance targets, target platforms and their limits (download
size, file count, age rating). Anything the playtest showed is hard to build.

## 9. Release scope

| First release | Later | Cut |
|---|---|---|
| | | |

## 10. Monetization (optional)

Ads, purchases or none, and where they appear. Never inside the core loop's first minute.

## 11. Risks and open questions

Each with what would answer it (a playtest, a prototype, a decision by the user).

## 12. Playtest evidence

What the HTML playtest proved and what it did not (link to the sessions in `design/playtest-record.md`).

## Change log

| Version | Date | Change |
|---|---|---|
| v0.1 | | First draft |
