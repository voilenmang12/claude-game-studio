# UI prompt profile

Per-game values for `Assets/Integration/UIPrompting.md`. Fill every TODO from the art bible before the first UI job.
`sync-template.sh` never overwrites this file in an existing game.

## Layout

| Setting | Value |
|---|---|
| Art style | TODO: pixel or raster (raster: UIPrompting.md section 10; S and multiplier rows below do not apply) |
| Orientation | TODO: landscape or portrait |
| Canvas reference resolution | TODO: the template is 900×1600. Landscape games use 1600×900 |
| Scenes updated to that resolution | TODO: Splash, Loading Scene, Main UI, Gameplay |
| Pixel scale S | 4 |
| Sliced `Pixels Per Unit Multiplier` | 1.5625 (6.25 / S) |
| Smallest and largest window to check | TODO: for example 960×600 and 1920×1080 |
| Popup sizes (bg1), at most 3 | TODO: large, medium, small in canvas units, for example 1400×900, 1000×650, 800×600 |
| Button sizes | TODO: large and small height in canvas units, for example 110 and 86 |

## Style

**UI_STYLE** (one or two sentences, pasted word for word at the start of every UI job):

> TODO: for example "Flat pixel art game UI with crisp hard edges, a 1 pixel dark selective outline and top-left light, in a clean casual fantasy style."

**Font:** TODO: Latin-only font with a commercial license, turned into a TextMesh Pro SDF asset and logged in the ledger.

## Palette

Layer roles follow `Assets/Integration/UIPopupStandard.md`. Fill, outline and lip per raised element; check them with
`python Tools/ui-kit-check.py` (section 4 of the standard).

| Role | Fill | Outline | Lip | Used for |
|---|---|---|---|---|
| bg1 (popup frame) | TODO | TODO | TODO | Outer shell of every popup |
| bg2 (popup panel) | TODO | TODO | TODO | Content surface |
| bg3 (popup well) | TODO | None | None | Recessed list and scroll areas |
| Card | TODO | TODO | TODO | Items in lists |
| Card selected | TODO | TODO | TODO | Selected item |
| Title | TODO | TODO | TODO | Popup name ribbon |
| Button primary | TODO | TODO | TODO | Confirm, continue, play |
| Button secondary | TODO | TODO | TODO | Cancel, back, other |
| Button buy | TODO | TODO | TODO | Spend currency, watch an ad |
| Button danger | TODO | TODO | TODO | Delete, reset, quit |
| Button disabled | TODO | TODO | TODO | Unavailable action |
| Close | TODO | TODO | TODO | Close button and its X |
| Accent | TODO | | | Rewards, highlights |
| Text dark | TODO | | | Body text on bg2, bg3 and cards |
| Text light | `#ffffff` | | | Titles and button labels, with an outline |
| Dimmer | `#000000` at 70% | | | Black Panel |

**Tint plan:** popup layers and buttons are baked colors (one sprite per role). `Image.color` tint only for exceptions
listed here: TODO.

## Element list

Status: `planned`, `queued`, `in review`, `approved`, `in game`.

Tool: `mcp` (Pixelorama MCP, `UIPrompting.md` section 3) or `job` (connector). Job ID is empty for `mcp` pieces.

| Name | Kind | Tool | Size | Colors | Border (L, B, R, T) | Tint | Used in | Job ID | Status |
|---|---|---|---|---|---|---|---|---|---|
| `UI/Popup/popup_frame` | bg1 | mcp | 64 | 5 | 16, 16, 16, 16 | None | Every popup | | planned |
| `UI/Popup/popup_panel` | bg2 | mcp | 64 | 4 | 12, 12, 12, 12 | None | Every popup | | planned |
| `UI/Popup/popup_well` | bg3 | mcp | 32 | 1 | 8, 8, 8, 8 | None | Lists, scroll views | | planned |
| `UI/Popup/popup_card` | Card | mcp | 32 | 4 | 8, 8, 8, 8 | None | List items | | planned |
| `UI/Popup/popup_card_selected` | Card | mcp | 32 | 4 | 8, 8, 8, 8 | None | Selected list item | | planned |
| `UI/Popup/popup_title` | Title | mcp | 64×32 | 4 | 16, 0, 16, 0 | None | Every popup | | planned |
| `UI/Buttons/button_primary` | Button | mcp | 32 | 4 | 8, 10, 8, 8 | None | Main actions | | planned |
| `UI/Buttons/button_secondary` | Button | mcp | 32 | 4 | 8, 10, 8, 8 | None | Other actions | | planned |
| `UI/Buttons/button_close` | Close | mcp | 32 | 4 | None | None | Every popup | | planned |
| TODO `UI/Icons/icon_coin` | Icon | job | 32 | 10 | None | None | Resource item | | planned |
