---
name: ui-demo
description: "Demos a screen before it is built: an SVG mockup the user approves, then two demo pages of the screen in the game's art style made from it, one by Claude and one by AGY, from which the user picks; then splits the picked look into elements, makes each one and builds the screen. Use for a new screen, a HUD, a popup set or a redesign, when the user asks for a UI mockup or demo, or from /team-ui Phase 1d."
argument-hint: "[screen or feature, e.g. shop, battle HUD, settings popup]"
user-invocable: true
model: opus
---

# UI demo: mockup, two demos, then the parts

Five steps, two of them the user's. **The two approvals always wait for the user, whatever `modes.automation`
says** (this skill is exempt, `.claude/docs/automation-modes.md`): end the turn with the question, and with a
tracker project put it in the tracker too (`task.ask` with the options and the default you would take). Never
pass an approval on your own, and never start a later step before its approval.

Everything goes in `production/ui/<screen>/demo/` (`<screen>` in kebab case). The screen is checked on the
standard 16:9 screen (`CLAUDE.md`, "UI on one screen"): 1280×720 for a landscape game, 720×1280 for a portrait one.

## 1. SVG mockup
Read what the screen must do (the GDD's UI section, `design/ux/<screen>.md` when it exists) and the style inputs:
`design/art/ui-prompt-profile.md` (art style row, palette, fonts), the art bible, and the kit in
`Assets/Integration/UIPopupStandard.md`.

Write `mockup.svg`: `viewBox="0 0 1280 720"` (portrait: 720×1280), the layout as boxes in grey tones with a
short label in each, every element a `<g id="<element-id>">` (kebab case, stable: later steps use the same ids),
real text lengths (the longest label the game will show), and the safe margins. Layout only: no art, no style.

Then `elements.md`: one row per element id: kind (panel, button, icon, bar, text, list, card, background),
size and position in canvas units, states (normal, pressed, disabled, selected, empty), its text, and what it
shows from the game state.

Screenshot it: `bash .claude/scripts/page-shot.sh production/ui/<screen>/demo/mockup.svg
production/ui/<screen>/demo/mockup.png --size 1280x720 --wait 200`, look at it, fix what reads wrong, and send
the PNG to the user (`SendUserFile`).

**Approval 1 (the user's):** "Is this layout right?" Options: approve, change (they say what), drop. A change
reworks `mockup.svg` and `elements.md` and asks again.

## 2. Two demos
Write `brief.md` once, for both makers: the approved `mockup.svg` (inline), `elements.md`, the art style (style
row, palette with hex values, fonts, border and corner style, the kit's look, two or three lines from the art
bible), the screen size, and the output rules:
- one self-contained HTML file, the screen drawn at exactly 1280×720 (or 720×1280) with HTML, CSS and inline
  SVG; no external URLs, fonts, scripts or images; nothing outside the screen;
- every element keeps its mockup id as the `id` of its HTML element, and its position and size;
- show the look of every state in `elements.md` that matters to the screen (a pressed and a disabled button when
  there are buttons); text as it will be in the game, in English.

Then, at the same time:
- **Claude:** one `Agent` call (subagent `art-director`, or `general-purpose` when it is not available) with
  `brief.md` inline; it writes `demo-claude.html` and returns only the path.
- **AGY:** `node Tools/agy-html.mjs production/ui/<screen>/demo/brief.md production/ui/<screen>/demo/demo-agy.html`
  (run in the background; it can take minutes). It runs AGY in plan mode with no tools and keeps the HTML it
  prints. No AGY or no sign-in: the script exits 3 and says why. Then that demo is **NOT RUN**, say so by name in
  the report and to the user (`bash studio-setup.sh --login agy` in the workspace fixes it); never write a second
  Claude demo in its place.

Screenshot each demo that exists: `bash .claude/scripts/page-shot.sh <demo>.html <demo>.png --size 1280x720`.
Check each against `elements.md` (every id present, nothing cut or off screen) and note what each does better.
A maker often adds what the brief did not ask for (extra cards, a state toggle, a web font from a URL): name each
addition to the user as "added by <maker>", and keep it out of `parts.md` unless the user takes it in approval 2.
Send both PNGs together, with the mockup, and two or three lines on how they differ.

**Approval 2 (the user's):** "Which demo?" Options: Claude's, AGY's, a mix (they say what from which), revise
(they say what; the chosen maker reworks it). Write the decision in `decision.md` (which demo, what is taken
from the other, the user's words). The chosen demo and its PNG are the look the screen must match.

## 3. Split into parts
From the chosen demo, write `parts.md`: one row per piece of art the screen needs, taken from the demo's
elements: element id, what to make (frame, button set, icon, bar, background), size, borders for 9-slice, states,
and the tool by `Assets/Integration/UIPrompting.md`, section 3 (Pixelorama MCP for small pixel pieces, an Asset
Studio job for detailed ones; raster style: section 10). Reuse a kit piece that already fits
(`UIPopupStandard.md`) instead of a new job, and write which. Text, flat fills and layout are not parts.

## 4. Make each part
One request per part: an Asset Studio job (`Tools/asset-studio.mjs`, `Assets/Integration/AssetStudio.md`) whose
brief quotes the part's row and the chosen demo's look for that element (colors, border, shape), or a Pixelorama
MCP drawing for a small pixel piece. Review each result by `UIPrompting.md`, section 8, against the demo's crop of
that element; redo a piece that does not match, up to three times, then list it under "Needs you". Log every
piece in `design/asset-ledger.csv`.

## 5. Build and compare
Import the parts (`UIPrompting.md`, section 9), build the screen in Unity, and run Play Mode with an audit
(`node Tools/playmode.mjs "<screen>=audit"`, `CLAUDE.md`, "Play Mode"). Put the Play Mode screenshot next to
the chosen demo's PNG and fix what differs (layout, colors, sizes) until it matches or the difference is listed.

## Report
The task report (`.claude/docs/task-report.md`, in the user's language): the mockup, both demos (or which was
NOT RUN and why), the user's two decisions, the parts and how each was made, the final screenshot beside the
demo, and what still differs. With a tracker project, one task per screen: criteria = the five steps, ticked as
they finish (`CLAUDE.md`, "Task tracker").
