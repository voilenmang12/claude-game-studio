# Popup and button standard

Every popup in every game is built from the same layer stack and one shared UI kit. Colors come from the game's
`design/art/ui-prompt-profile.md`, never from this file. How to make each sprite: `UIPrompting.md` (pixel: section 3
picks Pixelorama MCP or Asset Studio; raster: section 10).

Reference: the shop and journal popups of a shipped casual game (measured 2026-11-09). Its colors are an example of
the contrast pattern only. Never copy a reference game's palette or art.

## 1. The layer stack

Bottom to top. Names are the GameObject names in every popup prefab.

| # | GameObject | Role | Sprite | Look |
|---|---|---|---|---|
| 0 | `Black Panel` | Covers the scene behind | None | `#000000`, alpha 0.70, full-screen stretch. No asset. In Linear color space (the template) it looks lighter than the same alpha in a Gamma project |
| 1 | `BG` | **bg1**, the outer shell | `popup_frame` | Strongest color of the stack, thick dark outline, darker bottom lip, light top rim |
| 2 | `BG 1` | **bg2**, the content surface | `popup_panel` | Light fill, outline, bottom lip. Inset inside bg1 |
| 3 | `BG 2` | **bg3**, a recessed well for lists and scroll views | `popup_well` | Flat fill a step darker than bg2. **No outline, no lip**: it reads as sunken |
| 4 | `Card` | An item inside a well or panel | `popup_card` | Raised like bg2: outline and lip. Selected state: `popup_card_selected` |
| 5 | `Title` | The popup name on a ribbon or plate | `popup_title` | Strong color, dark outline. White label |
| 6 | `Close` | Closes the popup | `button_close` | Round, independent of the button set (section 3). Only on popups the player may dismiss; pause, result and confirm popups close through their buttons |
| 7 | `Button Zone` | Actions | `button_<role>` | The shared button (section 3) |

- `BG` holds the `CanvasGroup` that the popup's open and close animation moves. `BG 1`, `Title` and `Close` are its
  children, so the whole card moves as one. `Black Panel` fades on its own and stays outside `BG`.
- A popup uses layers 2 to 4 only when it needs them. A confirm popup can be `Black Panel` → `BG` → `BG 1` →
  `Title` → buttons. Never skip bg1: every popup has the same shell.
- No other popup frames. A popup that needs something new adds a size, not a sprite. A new layer kind changes this
  standard first.

## 2. Geometry

Values in canvas units at the 900×1600 or 1600×900 reference, with pixel scale S 4 (`UIPrompting.md` section 2). The
template uses these values; a game changes them only in its profile.

| Rule | Template value |
|---|---|
| bg1 size | At most 3 fixed sizes per game. Template: large 792×1040 (settings, shop, pause, result), small 700×600 (confirm, reward) |
| bg2 inset in bg1 | 32 on the left, right and bottom; 64 on the top, so the title overlaps bg2 a little |
| bg3 inset | 24 to 40 from the edge of bg2 |
| Title | Centered on bg1's top edge, half above it. Width bg1 width − 2 × 150. Height 96 (24 art pixels) |
| Close | Center on bg1's top-right corner, moved 20 inward on both axes. 112×112 (28 art pixels), Simple, preserve aspect |
| Buttons | Large 112 high (in popups), small 80 high (in cards). Label inset 16 on the sides and bottom, 8 on top, so the lip stays clear |
| Cards | One size per list. Gap 20 |
| Sliced `Pixels Per Unit Multiplier` | 6.25 / S, so 1.5625 at S 4, on every kit Image |

Pixel games keep every position and size a multiple of S, so art pixels line up.

## 3. Buttons

- **One shape.** Every text button uses one 9-slice structure: the same grid, border, outline thickness, lip and
  highlight. Only the colors change.
- **Two sizes, per game:** large (main action in a popup) and small (secondary or inside a card). Write both in the
  profile. Width can stretch; the height is fixed per size.
- **Colors by role**, set in the profile. Typical roles: `primary` (confirm, continue, play), `secondary` (cancel,
  back, other), `buy` (spend currency, watch an ad), `danger` (delete, reset, quit), `disabled`. A game uses only the roles
  it needs.
- **Baked variants, not tint.** Each role is its own sprite with the same shape: `button_primary`, `button_secondary`,
  and so on. Tinting a neutral sprite also tints the outline and highlight, which loses contrast. Each variant gets an
  outline that is a dark shade of its own fill.
  - Pixel: draw the grid once with Pixelorama MCP and redraw it with each role's palette: the same `rows`, a different
    `palette`. The shapes are then identical by construction.
  - Raster: send the first button as an Asset Studio job and get it approved. Send each other role with `--ref <first job-id>`
    and the same brief with only the colors changed. Reject a variant whose size, border or outline differs.
- **States:** `Button` transition stays Color Tint (normal white, pressed about `#d8d8d8`). Disabled swaps the sprite to
  `button_disabled`, a gray variant, when the game has one; otherwise the Color Tint disabled color.
- **Label:** dark text from the profile when it reaches 4.5:1 on every button fill (the template: `#163b3a`, 5.9:1 or
  more). Otherwise white with a TMP outline material in the outline color. No text inside the sprite.
- **Close is not part of the set.** Round, one fixed size, its own sprite with the X drawn in. It sits on bg1's corner
  (section 2) in every popup.
- **Icon buttons** (settings, menu) are a separate round or square sprite family with one size, used outside popups.

## 4. Contrast rules

Every layer above sits visibly above the one below. Measured with CIELAB L* (lightness, 0 to 100) on the sprite's
fill and outline. `python Tools/ui-kit-check.py` measures all of it; every row passed on the reference game.

| Rule | Minimum |
|---|---|
| Fill of each layer vs the layer under it (bg1 → bg2 → bg3 → card) | 10 L* apart |
| Raised element (bg1, bg2, card, title, buttons): outline darker than its fill | 25 L* |
| Selected or active state vs its normal state | 15 L* apart, or a different hue with a light rim |
| Body text vs its surface | 4.5:1 (WCAG) |
| Title and button labels | White with an outline in the element's outline color |

- Values alternate: bg1 is the strongest color, bg2 is light, bg3 is a step darker and less saturated, a card is light
  again. In the reference: bg1 orange L* 75, bg2 cream 93, bg3 tan 80, card cream 92.
- Raised layers have a bottom lip, a darker shade of the fill along the bottom edge only: 1 to 2 art pixels in pixel
  art, about 8% of the height in raster art. Recessed layers have none.
- The Black Panel at 0.70 already separates the popup from the scene; bg1's dark outline does the rest.

## 5. The UI kit

The minimum set every game makes before its first popup, listed in the profile's element list:

| Name | Layer | Pixel size and border | Tool (pixel) |
|---|---|---|---|
| `UI/Popup/popup_frame` | bg1 | 64, border 16 | Pixelorama MCP, or Asset Studio for an ornate frame |
| `UI/Popup/popup_panel` | bg2 | 64, border 12 | Pixelorama MCP |
| `UI/Popup/popup_well` | bg3 | 32, border 8 | Pixelorama MCP |
| `UI/Popup/popup_card`, `popup_card_selected` | card | 32, border 8 | Pixelorama MCP |
| `UI/Popup/popup_title` | title | 64×32, border L and R 16, T and B 0 | Pixelorama MCP (not an Asset Studio job: it is not square) |
| `UI/Buttons/button_<role>` | buttons | 32, border L, R, T 8 and B 10 | Pixelorama MCP, one grid, one palette per role |
| `UI/Buttons/button_close` | close | 24 or 32, Simple | Pixelorama MCP |

Raster games use the same names under `Assets/ArtRaster/UI/...` at the sizes in `UIPrompting.md` section 10.

Order: frame, panel and one button first; run `Tools/ui-kit-check.py` on them; get the user's approval; then the rest.

## 6. Template implementation

| Piece | Where |
|---|---|
| Kit drawing script (shapes, Pixelorama MCP, export) | `Tools/ui-kit-template.mjs`, owned by the template. A game never edits it: it sets its colors and button roles in `design/art/ui-kit-palette.json` and runs it (`--check` validates the file without drawing) |
| Kit sources and sprites | The script writes `ArtSource/UI/{Popup,Buttons}/*.pxo` and exports `Assets/Art/UI/{Popup,Buttons}/*.png` |
| Contrast check | `python Tools/ui-kit-check.py` (section 4) |
| Title text | A TMP material with a white face and an outline in the title's outline color |
| Layout audit | `Assets/Editor/PlayMode/UiAudit.cs`, run in Play Mode with `node Tools/playmode.mjs "<screen>=audit"` (or `audit:1280x720`): text cut or wrapped, pieces off screen, outside their frame or on its rim, text and buttons overlapping, framed panels covering each other. It measures what is drawn (glyphs, opaque pixels, masks, veils), which a screenshot review misses. The game's names go in `ProjectSettings/UiAudit.json` (`decor`, `tooltip`, `popupPrefix`, `veils`, `edgePieces`, `badgeSuffix`, `notFrames`, `tolerance`; see the `Settings` class) |
| Popup prefabs | Project-specific. Build each popup with the section 1 names, and add an Editor check (an AgentScript) that fails when a popup breaks section 1: order, Black Panel color, kit sprites, Close last, Color Tint buttons |

Template kit colors are placeholders: teal frame, cream panel, gray-green well, orange title, orange primary, teal
secondary, yellow buy, gray disabled, red close. A game replaces them in its profile and in `design/art/ui-kit-palette.json`, which is the only file the kit
script reads colors from. A role added there (for example `danger`) becomes one more `button_<role>` sprite.

## 7. Checklist for a new popup

- [ ] Layer names and order as in section 1; only kit sprites; Black Panel `#000000` at 0.70.
- [ ] bg1 is one of the game's fixed sizes; insets as in section 2.
- [ ] Title on the top edge; Close on the top-right corner when the popup can be dismissed.
- [ ] The project's popup check passes, if it has one.
- [ ] Buttons from the shared set at the large or small size; role colors match their function in other popups.
- [ ] Text colors from the profile; `ui-kit-check.py --text` passes for each text color on its surface.
- [ ] `audit` passes on the popup open (`node Tools/playmode.mjs ... "popup=audit"`), on the standard 16:9 screen.
- [ ] Screenshot at the smallest and largest window size in the profile.
