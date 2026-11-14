---
name: ui-resolution-check
description: Deep UI check across screen sizes and aspect ratios - every screen of the game captured at each size, faults listed, nothing fixed. Run ONLY when the user asks for it by name or asks to check every resolution, aspect ratio, screen size or responsive layout. Normal UI work and every other task are checked on the standard 16:9 screen only.
---

# UI resolution check (on demand)

Normal UI work is done and checked on the game's standard screen: 16:9 landscape (9:16 for a portrait game), the
Canvas reference resolution (`CLAUDE.md`, "Autonomy", "UI on one screen"). This skill is the only place other sizes
are checked, and it runs only when the user orders it. It is an audit: **find, do not fix** (`CLAUDE.md`, "Audit and
QA").

## 1. Sizes
Unless the user names others:

| Name | Size | Why |
|---|---|---|
| `16x9` | the reference size (e.g. 1920x1080) | baseline |
| `16x9-small` | 960x540 | small embedded browser frame |
| `16x10` | 1280x800 | laptops |
| `4x3` | 1024x768 | tall window |
| `21x9` | 2560x1080 | ultrawide |
| `9x16` | 1080x1920 | phones, only if the game supports portrait or mobile |

## 2. Run
1. List the screens to visit (title, home, every popup, gameplay HUD, results) and how to reach each one with
   `Tools/playmode.mjs` steps (`click:`, `show:`, `scene:`, `eval:`). Write them once to
   `production/qa/resolution-steps.txt`, one step per line, each screen step named (`home=snap`, `shop=click:Btn Shop`).
2. For each size: set the Game view to it, then one run: `node Tools/playmode.mjs --steps production/qa/resolution-steps.txt
   --size <WxH> --out production/qa/resolution-<date>/<size name>`. The Game view size is set with a static Editor method
   of the game (reflection on `UnityEditor.GameViewSizes` to add and select a fixed size), called with `eval:`; add it
   to the game's Editor code the first time and reuse it after. One Play Mode session per size, never one per screen.
3. Look at each screenshot once. A fault is: something cut off or outside the screen, overlapping elements, text that
   overflows or becomes unreadable, a button too small to tap (under about 44 px at that size), a stretched or
   letterboxed image that should fill, empty bands.

## 3. Result
- `production/qa/resolution-<date>.md`, in the user's language: one table row per fault (screen, size, what is wrong,
  screenshot path), ranked blocker / major / minor, then the screens and sizes that passed.
- One contact sheet per size (all screens side by side) sent with `SendUserFile`, plus the file.
- No fixes in this skill. The user picks what to fix; each fix is then its own task, checked at the size that failed
  and on the standard 16:9 screen.
