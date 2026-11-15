# Beginner guide (no code needed)

You make games here by talking to Claude Code in plain language. You never have to write code, type commands or edit
files: Claude does that, runs the game, checks it and reports with screenshots. Your job is to say what you want,
look at the results and make the calls only a person can make. The command list is in
[`commands.md`](commands.md); this page explains how to work with it.

## 1. The three kinds of folder

| Folder | What it is | Start Claude here to... |
|---|---|---|
| The workspace (this repo's root) | The studio: template, scripts, rules | create a concept or game, update the template, look across games |
| `concepts/<slug>/` | One game idea before it is a Unity project: brief, design, browser playtest | shape and test an idea |
| `<Code>-<Name>/` (for example `CG02-StarFarm`) | One Unity game, its own git repo | build, fix and ship that game |

**Always start Claude in the folder of the work.** A game's rules, hooks and tools load only when Claude starts in
that game's folder. A session started in the workspace root cannot run a game properly, and the other way round.

## 2. Starting Claude

- **Desktop app (easiest):** open the Claude app, go to the Code tab, pick the folder (workspace, concept or game),
  start a new session.
- **Terminal:** open a terminal in the folder and type `claude`.

The first time on a new computer, start in the workspace root and type `/studio-setup`: it installs the tools and
walks you through each sign-in.

## 3. How to talk to Claude

Write as you would to a person on your team, in your own language. Claude answers in it; the game itself stays in
English, and Claude shows you the English wording for anything players will read.

| You want | Say something like | What happens |
|---|---|---|
| A small change | "Make the Play button green" | Done in a few minutes; one screenshot in the reply |
| Another small change | "Now make it a bit bigger" | Done in the same session, no new setup |
| To see before deciding | "Try a darker background, show me first" | Made on a side branch with before and after screenshots; say "keep" or "drop" |
| Two options | "Try A and B so I can compare" | Both made, one after the other, with screenshots |
| A big job done unattended | "Run it to the end: build the shop with 3 tabs" (or `/run-goal ...`) | Claude plans a checklist, does and checks every item, and sends a report with images. You can leave and follow from your phone |
| To know where things stand | "What's next?" (or `/next-step`) | One clear next step |
| To undo | "Undo the last change" | Claude reverts it in git; nothing is lost |

Tips:
- **One task per session.** When the topic changes (from the shop screen to the music), start a new session.
- **Be concrete about what "done" looks like**: "the price must fit on one line", "the button stays on screen at
  1280x720".
- **Point at files or images** by dragging them into the chat or typing `@` and the file name.
- **Interrupt** with Esc (terminal) or the stop button (app) if Claude goes the wrong way, then say what you meant.

## 4. From idea to game, step by step

Each step ends with your decision. Claude prepares everything and tells you when it needs you.

| Step | Where to start Claude | Say | You decide |
|---|---|---|---|
| 1. Pick an idea | workspace root | "Show me the idea backlog" or "/brainstorm" | which idea to try |
| 2. Make a concept | workspace root | "Start a concept called star-farm" | - |
| 3. Brief and design | `concepts/star-farm/` | "Make me a game: <your idea>" (or `/prototype`) | approve the brief and the core loop |
| 4. Play the prototype | same | "Put it online so I can play on my phone" | **PROCEED**, **PIVOT** (change it) or **KILL** |
| 5. Final design and name | same | "Finish the GDD and lock the name" | approve the design and the name |
| 6. Unity project | Unity Hub, then workspace root | create the project in Unity Hub with the locked name, then "Set up the game project for star-farm" | it opens in Unity |
| 7. GitHub repo | workspace root | "Publish the game repo" | - (it stays private) |
| 8. Build the game | the game folder | features, fixes, `/run-goal ...` | each milestone |

Details of every stage: [`game-lifecycle.md`](game-lifecycle.md).

## 5. What Claude does by itself, and what it leaves to you

Claude does: write and fix code, make and import art through the studio's tools, run the game in the Unity Editor,
take and judge screenshots, run tests and builds, commit and push the game's private repo, undo its own work.

Only you do (Claude stops and asks, or lists it under "Needs you" in its report):
- sign-ins and passwords (GitHub, Unity, Vercel...): Claude never types them;
- anything that costs money or publishes: store or portal uploads, public links meant to last, payments;
- taste and business calls with no written answer: Claude picks a safe default and tells you, so you can change it.

## 6. Reading the results

- **Small task:** the answer has one screenshot and two or three sentences.
- **Bigger task or goal:** a report file with before/after screenshots, the checks run, the commits and the
  decisions Claude took alone, sent to you as a file. Read "Needs you" first.
- **A "try":** the reply has before and after images and waits for "keep" or "drop".

## 7. When something goes wrong

| Problem | What to do |
|---|---|
| Claude seems lost or repeats itself | Start a new session in the same folder; the game remembers its state in `production/session-state/active.md` |
| The session is long and slow | Type `/compact`, or start a new session |
| You don't like a change | "Undo the last change" or "undo the task about the shop" |
| A tool or sign-in stopped working | In the workspace root: `/studio-setup` |
| The game folder seems out of date with the studio | In the game folder: "Port the latest template version" |
| Claude asks for a password or a payment | Do that step yourself; never paste passwords into the chat |

## 8. Words you will see

| Word | Meaning |
|---|---|
| Session | One conversation with Claude, started in one folder |
| Concept | A game idea being shaped and playtested in the browser, before Unity |
| GDD | Game design document: what the player sees and does |
| Playtest | A quick playable version to test the fun |
| Branch | A side copy of the project where a change is made before it joins the main version |
| Commit / push | Saving a change in the project history / sending it to GitHub |
| Template | The shared starting point and rules every game gets; new versions are ported game by game |
| Play Mode | Running the game inside the Unity Editor; Claude does it with `playmode.mjs` |
| Goal | A big job Claude runs to the end by itself (`/run-goal`) |
