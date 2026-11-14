# Useful commands

A quick reference: what to type, where, when, and what you get. `/...` commands are skills typed in the Claude Code
chat; `bash ...` scripts are run by Claude when you ask (you do not need to type them). Template v3.01.

## 1. How to hand work to Claude (phrases, not commands)

| You say | Claude does | What you get |
|---|---|---|
| A small change: "make the Play button green" | Size S: edit, recompile, one "after" screenshot, report in the closing message | The fastest path, about 15 tool calls, no report file |
| Another small change in the same session | Does it right there, **no new branch**: on the task branch while it is open, otherwise one commit straight on `main` | No context re-read, no new session |
| "Try ...", "show me first ...", "test first ..." | Works on a `try/<slug>` branch, before and after screenshots at the same size, **not merged** | You see the result before deciding: "keep" merges it, "drop" deletes the branch; `main` is untouched |
| "Try A and B" | Two `try/` branches, one after the other, in the same session | Two options compared without two sessions fighting over one Unity Editor |
| "Run it to the end ...", "do all of ..." | Starts `/run-goal` (below) | You can be away and follow from a phone |

Open a **new session** only for work that runs apart: another topic, other files, no need of the Unity Editor at the
same time (a GDD, an asset plan, docs), or when a session has grown too long. Two sessions in one Unity project share
one Editor and get in each other's way.

## 2. In a game folder (`<Code>-<Name>/`, start Claude there)

| Command | When | Example | What you get |
|---|---|---|---|
| `/run-goal <goal>` | Big multi-step work you want done to the end | `/run-goal build the Shop screen with 3 tabs and a buy button` | A checklist in `goal.md`, each item done, checked and committed, then an illustrated report. The `goal-check` hook keeps it going and ends it when progress stops (no endless loop) |
| `/prototype` | Try an idea or mechanic fast | `/prototype drag-and-drop queue sorting` | A throwaway playable, ending on proceed / pivot / kill |
| `/next-step` | Not sure what to do next | `/next-step` | One clear next step |
| `/ui-resolution-check` | **Only** when you want the UI checked at every size and aspect ratio | `/ui-resolution-check` | Every screen captured at each size, faults listed, nothing fixed. Normal UI work is checked on 16:9 only |
| `/art-bible` | Before making assets, to fix the visual style | `/art-bible` | Assets that share one style (pixel or raster) |
| `/asset-spec` | Specs and prompts per asset | `/asset-spec shop UI` | Specs ready for Asset Studio jobs |
| `/pixel-art` | A pixel-art game that needs drawing or export in Pixelorama | `/pixel-art draw a 16x16 coin icon` | Pixelorama and its MCP turned on, drawn, exported to Unity |
| `/quick-design` | A small rule or balance change | `/quick-design raise the combo reward` | A short spec with no full GDD |
| `/balance-check` | The economy or difficulty feels off | `/balance-check` | Outliers, broken progressions, degenerate strategies |
| `/bug-report` | A bug to record properly | `/bug-report Back does nothing in the Shop` | Repro steps and severity |
| `/smoke-check` | Before a build or QA hand-off | `/smoke-check` | The test suite run and a usable / not usable verdict |
| `/cut` | The game keeps growing and needs to ship | `/cut` | Proposed cuts and a polish list; you pick each cut |
| `/scope-check` | More got built than planned | `/scope-check` | How much it grew and what to cut |
| `/patch-notes` | Shipping an update to players | `/patch-notes` | Player-facing notes from git history |
| `/release-checklist` | Before an upload to a store or portal | `/release-checklist` | Build, metadata and limit checks |
| `/project-settings` | See or change one `project.yaml` setting | `/project-settings automation` | Its value and where it comes from |
| `node Tools/playmode.mjs ...` | Claude runs it to see the game | `node Tools/playmode.mjs home=snap "shop=click:Btn Shop"` | One command: recompile, Play Mode, clicks, screenshots, console errors |
| `audit` step of `playmode.mjs` | After any UI change | `node Tools/playmode.mjs "shop=click:Btn Shop" shop-audit=audit` | Measured layout faults (text cut, pieces off screen or on a frame's rim, overlaps) that a screenshot review misses |

## 3. In a concept folder (`concepts/<slug>/`)

| Command | When | What you get |
|---|---|---|
| `/brainstorm` | Find or choose an idea | Ideas to pick from |
| `/prototype` | The HTML playtest (no engine) | A browser playable, ending on PROCEED / PIVOT / KILL |
| `/design-review` | The GDD has a draft | Gaps and contradictions found before the lock |

## 4. At the workspace root (Claude runs these when you ask)

| Command | When | What you get |
|---|---|---|
| `bash new-concept.sh <slug>` | A new idea | A concept folder: brief, GDD, HTML playtest, name lock |
| `bash new-game.sh <Game> --concept <slug>` | The name is locked and the Unity project exists | Template and concept applied to the Unity project |
| `bash publish-game.sh <Game>` | The game should go to GitHub (private) | The game's own repo |
| `bash deploy-test.sh <folder>` | A test link to send someone | A Vercel test URL (`--prod` only when you ask) |
| `bash sync-template.sh <Game> --dry-run` | How far a game is behind the template | The files that differ; nothing changed |
| `bash list-template-requests.sh --open` | Template change requests from games | The TR tickets waiting for your decision |
| `bash studio-doctor.sh` | Check the workspace before an update | Configuration problems |
| `/studio-setup` | A new machine, a broken tool or sign-in | Every tool and sign-in checked and fixed |

## 5. Built into Claude Code

| Command | When | What you get |
|---|---|---|
| `/compact` | A long, slow session | The context summarized, same session |
| `/clear` | Done, moving to something unrelated | A clean start; a game reads `active.md` again |
| `/resume` | Back to an earlier session | That session reopened |
| `/code-review` | Check code just changed | A list of likely bugs |
