# Task report (with images)

The user often follows from a phone (Remote Control). Every finished task that changed something, and every goal
(done or stalled), ends with a report the user can judge without opening the project.

## 1. Images
- **Visual work** (UI, scenes, art, effects): a Play Mode screenshot of every screen touched, taken by you (the
  unity-cli skill's play-mode loop; confirm frames advance first). Take a **before** shot when you start, an **after**
  shot when you finish, same screen and window size. HTML playtests and WebGL builds: browser screenshots.
- **New art:** the PNGs themselves, or one contact sheet of them.
- **Non-visual work** (logic, tools, data): no screenshots; quote test counts and the one line that proves it.
- At most about 10 images, PNG, longest side 1600 px or less. Save them in `production/reports/<date>-<slug>/`.

## 2. Report file
`production/reports/<YYYY-MM-DD>-<slug>.md`, committed with the work:

```markdown
# <task or goal title> (<done | stalled>)
Request: <user's words>
## Result
<2-4 sentences: what changed for the player or the team>
## Images
![Main menu, after](<date>-<slug>/main-menu-after.png)
## Checks
- <item> — <evidence>   (tests: N passed; scan: 0 faults at 4 sizes; build: 38 MB)
## Commits
- <hash> <subject>      (pushed: yes/no)
## Decided alone
- <decision> — <why>    (from the goal Log or the decision log)
## Needs you
- <only what a human must do: taste call, money, publishing, sign-in>
```

## 3. Send it
- Send the images and the report file with the `SendUserFile` tool (status `proactive` when the user did not just
  write; `normal` when replying), in one call, with a one-line caption. Where that tool does not exist, list the
  file paths.
- The closing message, in the user's language: result in two or three sentences, the images, then "Needs you".
  No question unless something is actually waiting on them.
