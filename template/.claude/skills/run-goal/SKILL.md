---
name: run-goal
description: Runs a goal autonomously to the end on its own branch - turns the request into a checklist of checkable items in production/session-state/goal.md, works through it without asking the user (plays the game, judges by written criteria and screenshots, commits), and finishes with an illustrated report. A Stop hook (goal-check, no model judge) keeps it going and stops it when no progress is made. Use when the user gives a goal, says "run this to the end", "làm hết", or asks for unattended work.
---

# Run a goal

The user may be away (Remote Control). Do not ask questions during the run; decide, log, continue.

## 1. Write the goal (one turn, no questions)
Create `production/session-state/goal.md`:

```markdown
# <short goal title>
Status: active
Started: <YYYY-MM-DD HH:MM>
Max nudges: 40
Request: <the user's words, verbatim>

## Done when
<one paragraph: what is true at the end, in checkable terms>

## Checklist
- [ ] <item> — check: <how it is shown: test name, scan, screenshot of <screen>, file, commit>
...

## Needs the user (does not block)
- <taste, money, publishing, sign-ins; empty if none>

## Log
- <time> started
```

- 3 to 15 items, in build order, each small enough for one commit. Every item names its **check**: something you can
  run or capture yourself (EditMode/PlayMode test, Unity CLI scan, Play Mode screenshot compared with the criteria,
  build size, a file that exists). A subjective wish ("looks better") becomes concrete criteria (contrast ratio,
  nothing outside its frame at 4 window sizes, matches `UIPopupStandard.md`) plus before/after screenshots.
- Anything only a human can do goes under "Needs the user", never in the checklist.
- If the built-in `/goal` is also active, its condition is judged by a model: end every turn with a short
  "Goal status" block (each checklist item, ticked or not, with its evidence) so it can confirm. If part of its
  condition can never be shown, say once that `/goal clear` stops it; this checklist carries the work.

## 2. Work loop
For the first open item:
1. Do it. Read only what the item needs (Grep, section reads); do not re-read files you already have.
2. Run its check once. Visual items: Play Mode screenshot (the unity-cli skill's play-mode loop: `set_autotick`,
   `editor_play`, confirm frames advance, screenshot, `editor_stop`), saved under `production/reports/<goal-slug>/`.
3. Pass: tick it `- [x] <item> — evidence: <result or path>`, commit (`feat|fix|...: <item>`, body
   `Goal: <title>`), add a Log line. Fail: fix and re-check; after 3 different attempts mark
   `- [~] <item> — <why>`, add a Log line, move on.
4. Long work (asset batch, build, test suite) runs in the background; work on another item or end the turn and
   continue when it finishes.

The Stop hook nudges you to the next item each time you stop with open items, and only while goal.md keeps
changing: a stop with no tick and no Log line ends the goal as `stalled`.

## 3. Finish
When every item is `[x]` or `[~]`: run the full check once (tests, scan, the main screens), close the branch
(`CLAUDE.md`, "Autonomy": merge `--no-ff` into `main`, push `main`, delete the branch), set `Status: done`, then write and send the report (`.claude/docs/task-report.md`). A stalled goal gets the
same report with what is left and why.
