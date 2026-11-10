# Game lifecycle

From an idea to a game repo on GitHub. Each stage ends at a gate the **user** passes; Claude prepares the work and
asks. A stage is never skipped: no Unity project before the name is locked, no GitHub repo before the project's first
commit. Git rules for every stage: [`git-rules.md`](git-rules.md).

| # | Stage | Where | Output | Gate (user) |
|---|---|---|---|---|
| 0 | Idea | `concepts/BACKLOG.md` | One entry per idea | Pick one to explore |
| 1 | Brief | `concepts/<slug>/` | `design/game-brief.md` | Brief approved |
| 2 | GDD draft | `concepts/<slug>/` | `design/production-gdd.md` v0.x, sections 1–5 | Core loop approved |
| 3 | HTML playtest | `concepts/<slug>/` | `prototypes/<slug>/`, `design/playtest-record.md` | Verdict PROCEED, PIVOT or KILL |
| 4 | GDD v1.0 | `concepts/<slug>/` | `design/production-gdd.md` v1.0 | GDD approved |
| 5 | Name lock | `concepts/<slug>/` | `design/name-lock.md`, `Status: locked` | Name approved |
| 6 | Game project | `<Code>-<Name>/` | Unity project + template + concept files, first commit | Project opens in Unity |
| 7 | GitHub repo | GitHub | Private repo, `main` pushed | Repo created |
| 8 | Production | `<Code>-<Name>/` | CCGS epics, stories, builds | Per milestone |

## 0. Idea

`concepts/BACKLOG.md` (local, not in any repo; `backlog` in `local/studio.config.json` moves it, for example into
`local/docs/`) holds ideas with a status: `new`, `exploring`, `parked` (with the
date and why), `killed`. An entry has a one-line pitch, the core decision the player makes, why it is worth trying,
and the main production risk. A parked idea keeps its entry; it can come back.

## 1. Brief

```bash
bash new-concept.sh star-farm          # concepts/star-farm/, local git repo, first commit
```

The slug is a working title in kebab-case. Start Claude Code in `concepts/<slug>/` and say "make me a game" with the
idea, or run `/prototype`. It asks one round of questions from the genre's sheet and writes `design/game-brief.md`
(In your words, Look and references, First minute, Challenge, Your systems, Keep, Avoid, Out of scope). Images that
shape the look go in `references/`.

The concept folder has **no engine set** on purpose: `/prototype` then builds the browser game first. Never run
`/setup-engine` in a concept.

## 2. GDD draft

Fill `design/production-gdd.md` sections 1 to 5 (pitch, player experience, controls and UI, core rules, structure)
as v0.x, from the brief. Keep it to what a player sees and does. The user approves the core loop before stage 3:
the playtest tests a design, not a guess.

## 3. HTML playtest

`/prototype` builds `prototypes/<slug>/` from the brief: a browser game that opens with a double-click, every tuning
value in `config.js`, checked by a short scripted run before handover. Then:

- The user plays it, on the computer or on a phone: `bash deploy-test.sh concepts/<slug>/prototypes/<slug>` puts it
  on Vercel and prints the URL (`docs/test-deploys.md`). Each change they ask for is one commit, `iteration N: <what>`; the tweak panel (`tune.js`)
  is added when they want to tune numbers themselves.
- Every play session goes in `design/playtest-record.md`: build, who played, device, what was observed, numbers,
  changes asked for. A scripted check is not a session.
- The verdict is the user's: **PROCEED** (go to stage 4), **PIVOT** (change the brief and go back to stage 1 or 2 in
  the same folder), **KILL** (backlog entry `killed`, with why; the folder can be deleted).
- The playtest is the **feel reference** for the Unity game. It is not grown into a web project.

## 4. GDD v1.0

After PROCEED, finish every section of `design/production-gdd.md` from the brief and the playtest record: content
and balance, art and audio direction, technical notes for Unity, release scope, risks, playtest evidence. Numbers are
starting values marked `(start)`. Optionally run `/design-review design/production-gdd.md`. The user approves it as
v1.0: the baseline the game project starts from. Later changes go in the GDD's change log in the game repo.

## 5. Name lock

`design/name-lock.md`: at least three candidates, each searched on the target stores and portals, a quick trademark
screen, and a free GitHub repo name. The user picks one; the Locked block fixes every name the project will use
(product name, game code, folder, repo, application identifier, save key), and `Status: locked`.

Only now does the game get a folder name, a repo or a product name. Until then, the working title is the slug.

## 6. Game project

1. In Unity Hub, create a "Universal 2D" project with Unity 6000.6.7f1, **in the workspace root**, named exactly the
   locked folder name (`CG03-StarFarm`). Skip this when `local/project/` holds your base Unity project:
   `new-game.sh` copies it (`docs/local-layer.md`).
2. From the workspace root:
   ```bash
   bash new-game.sh CG03-StarFarm --concept star-farm
   ```
   It refuses a concept whose name is not locked. It applies `template/`, copies the concept's design files,
   `prototypes/` and `references/`, creates the git repo and commits `chore: start <Game> from template vX.YY`,
   with the concept's last commit in the message.
3. Set the product name, company, application identifier and save key from the Locked block in Unity's Player
   Settings; commit `chore: set product identity`.
4. Start Claude Code in the game folder and run `/start`: it finds the brief and the GDD.

## 7. GitHub repo

```bash
bash publish-game.sh CG03-StarFarm     # repo name from name-lock.md, private
```

It creates the repo with `gh repo create --private`, adds it as `origin` and pushes `main`. A game repo is
**private** by default and must stay private when it holds paid Asset Store plugins. Claude runs it only when the
user asks; the user changes visibility themselves.

## 8. Production

In the game folder: `/art-bible`, `/create-epics`, `/create-stories`, `/dev-story`, `/story-done` (CCGS). The
template's rules apply: versions and ports from the workspace, template requests back to it (`CLAUDE.md`). Test
builds go to Vercel with `bash deploy-test.sh <Code>-<Name>/Builds/WebGL` (`docs/test-deploys.md`), never to players. The
concept folder stays in `concepts/` as the history of the idea; delete it when the user no longer needs it.
