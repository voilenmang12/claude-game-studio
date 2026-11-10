# UI element prompting rules

Shared rules for making UI art, with the asset connector or with Pixelorama MCP. The per-game values live in
`design/art/ui-prompt-profile.md`: fill that file before the first UI piece. Connector guide: `PixelArt.md`, section 6.
Sections 2 to 9 are for pixel-art games; section 10 covers games with a non-pixel (raster) style.
Popups and buttons are built from one layer stack and one kit: `UIPopupStandard.md` decides what to make; this file
says how to make it.

## 1. How the template builds UI

These facts decide which art a game needs. They were read from the scenes and prefabs on 2026-11-06.

| Fact | Value | Consequence |
|---|---|---|
| Canvas | Screen Space Camera, Scale With Screen Size, Expand | Art must survive non-integer scaling |
| Reference resolution | 900×1600 (portrait) in all four scenes, reference PPU 100 | A landscape game must change it first |
| Frames | 35 Images use one sprite (`Rounded.png`, 96×96, border 24) as Sliced, tinted by `Image.color` | One neutral frame can serve many controls |
| Button states | All 20 buttons use Color Tint | No pressed or disabled art is needed |
| No sprite at all | 18 flat Images: Black Panel, Background, thin fills | These never become jobs |
| Bars | 2 Filled Images with a separate track | A Filled Image ignores 9-slice borders |
| Text | TextMesh Pro, `LiberationSans SDF` only | Text is never part of the art |
| Icons | `Data Sprites` catalog maps a resource enum to a sprite | Register each icon there |

Common sizes in canvas units: modal card 790×1040, small popup 700×600, wide button 630×102, small button 250×86,
buy button 155×70, close 70×70, shop cell 660×156, resource icon 90×90, progress track 620×18.

## 2. The pixel scale S

Choose one **S**, the canvas units per art pixel, and keep it for the whole game. `S = 4` is the default: a 1600×900
reference becomes a 400×225 art-pixel screen.

- **Simple Image:** set the RectTransform to art size × S. A 32 px icon at S 4 is 128×128.
- **Sliced Image:** set `Pixels Per Unit Multiplier = 6.25 / S`, so 1.5625 at S 4.
- The 6.25 is reference PPU 100 ÷ importer PPU 16. Measured in Unity 6.6: at multiplier 1, an 8 px border draws 50 canvas
  units. Recalculate if a game changes either value.
- **Border limit:** border × S × 2 must not exceed the smallest size of that control.
- Expand scaling is not an integer at most window sizes, so some art pixels draw slightly wider. Never rely on a lone 1 px
  line to separate two shapes.

## 3. Pick the tool: Pixelorama MCP or the connector

For pixel games, simple UI pieces are drawn by Claude in Pixelorama through the `pixelorama` MCP server, not sent as
connector jobs. The result is exact: corners mirror to the pixel, straight edges repeat unchanged, the center is one
flat color, and the colors are the profile hex values. It also costs no image quota and leaves an editable `.pxo`.

| Piece | Tool |
|---|---|
| Frame with a flat interior, 1 to 3 flat bands and a stepped or square corner: popup frame, panel, well, card, button, slot, bar track, tab, tooltip | **Pixelorama MCP** |
| Title ribbon or plate (not square, so not a connector job) | **Pixelorama MCP** |
| Button color variants: the same grid with a different palette per role | **Pixelorama MCP** |
| Checkbox, toggle, radio, divider, scroll handle, arrow or caret | **Pixelorama MCP** |
| Glyph icon of at most 4 colors, built from straight lines and diagonals: close, check, plus, minus, arrows, pause, play, menu, lock | **Pixelorama MCP** |
| Icon of a shaded object or material: coin, gem, potion, food, weapon, item | Connector |
| Emblem, badge, ornate or textured frame, a frame with carved corner ornaments | Connector |
| Anything illustrative: portraits, scenes, characters | Connector |

If a "simple" piece needs more than 4 colors or shading that follows a form, it is not simple: use the connector.

**Drawing with Pixelorama MCP** (Pixelorama must be open; guide `PixelArt.md`, section 5):

1. Take size, border and palette from section 5 and the profile. The colors are the profile's hex values.
2. Compute the whole grid in code first and send it as one `draw_pixels` call: one character per palette color, `.` for
   clear. A frame fills the full grid; only its corner notches are clear. Draw one corner and mirror it to the other three
   in the code, so all four match exactly. A glyph icon keeps 1 to 2 clear pixels on each side.
3. `new_project` at the native size, `draw_pixels`, then check it with `get_image` (scaled) and `read_pixels`.
4. `save_project` to `ArtSource/UI/<Kind>/<name>.pxo`, then `bash Tools/export-pixelorama.sh` writes
   `Assets/Art/UI/<Kind>/<name>.png`. Change the `.pxo` and export again; never edit the PNG.
5. Ledger row: source type `claude-mcp`, tool `Pixelorama 1.2.3 + pixelorama-mcp`, license "own work".
6. Review with section 8, then import with section 9 (step 2 onward).

Lessons from the pilot, 2026-11-09 (a 32 px button with an 8 px border, and a 16 px close glyph):

- The button passed every frame check: one flat center, identical stretch rows and columns, mirrored, alpha only 0 or 255.
- A diagonal stroke 1 px wide reads as loose dots at 16 px. Diagonal strokes need a core 2 to 3 px wide with a 1 px outline.
- A light gray button (fill `#e4e4ea`, 1 px white top band, 3 px gray bottom band, dark outline) tints well with Color Tint.

## 4. What the connector can and cannot make

Every output is a square PNG. Regular sprites keep a clear margin of 1/16 of the grid on each side. Frames use
`asset_type: ui_9_slice`, which fills the whole grid with zero margin: only the stepped corner notches are clear. The worker
rejects a frame whose center or straight edges are not fully opaque.

| Need | Rule |
|---|---|
| Rectangular panel, button or bar | Square source, then 9-slice |
| Full-screen or opaque background | Not a connector job. Use a flat palette color or a separate background asset |
| Seamless tile or pattern | Not a connector job: the clear edge breaks tiling |
| Logo or anything with words | Set the words in TextMesh Pro. Only a wordless emblem can be a job |
| Dimmer, thin fill, divider | Flat Image with a palette color |
| Pressed, hover, disabled state | Color Tint. Make art only if the shape changes |
| Same style across jobs | The fixed style text in section 6, plus `--ref <job-id>` of an approved piece (connector API 1.2) |
| Magenta in a frame | Avoid colors near `#FF00FF`: the worker removes matte-colored areas connected to the image edge |
| Non-square piece | Not supported. Stretch it with 9-slice or lay out several squares |

## 5. Size, border and color by kind

| Kind | `--size` | Border | `--colors` | Image type | Canvas size |
|---|---|---|---|---|---|
| Panel, card, popup frame, bg | 64 | 12–16 | 5–8 | Sliced | Stretch |
| Button | 32 | 8 | 4–6 | Sliced + Color Tint | Stretch |
| Slot or cell frame | 32 | 8 | 4–6 | Sliced | Stretch |
| Bar track | 32 | 8 | 3–4 | Sliced | Stretch |
| Bar fill | None | None | None | Flat color, scaled or Filled | Stretch |
| Small icon (stat, status) | 24 | None | 6–8 | Simple | size × S |
| Main icon (currency, reward) | 32 | None | 8–12 | Simple | size × S |
| Emblem or badge | 64 | None | 12–16 | Simple | size × S |

- Frames: `--type ui_9_slice --size <32, 64 or 128> --border <px>`. The border applies to all four sides and is the job's `request.slice_border`.
- Icons and emblems: omit `--type`. Usable art is the grid minus 2 × (grid / 16): 28 px at 32, 56 px at 64.
- **Tested with real jobs:** icons at 32. **Not tested:** icons at 16, 24 and 64. Send one job at a new size before a batch.

## 6. Writing the job

`--view` is always `"flat front view"`. `--asset` is three parts in this order, in English:

```
<UI_STYLE from the profile, word for word> <the kind block below> <one subject sentence>
```

Kind blocks, used word for word:

- **Any frame (panel, bg, button, slot, bar track):** `One solid filled panel plate seen straight on. The whole interior is a single flat color: it is a filled plate, not a hollow frame, with no hole, window or cutout. Each straight edge is one uniform band that repeats unchanged, all four corners are identical and mirrored, and the center has nothing on it.`
- **Icon:** `Single UI icon, one object only, centered, large bold silhouette that fills the square and reads at native size. Two or three color clusters per material. One clear highlight.`
- **Emblem:** `Single UI emblem, one symmetrical badge shape, centered, filling the square. No letters or numbers. One focal accent.`

The subject sentence of a frame gives its interior color, band thickness and any corner detail, for example
`Popup panel: light warm gray interior, a medium gray 3 pixel frame band and small mirrored corner brackets.`
A frame that will be tinted uses light gray values.

Every brief must avoid: text, letters, numbers, drop shadows outside the shape, glow, gradients, dithering, noise, perspective,
background scenes, and more than one object.

```bash
node Tools/pixel-asset.mjs submit --name UI/Panels/panel_modal --type ui_9_slice --size 64 --border 16 --colors 8 --view "flat front view" --asset "<UI_STYLE> <Frame block> Popup panel: light warm gray interior, a medium gray 3 pixel frame band."
node Tools/pixel-asset.mjs submit --name UI/Icons/icon_coin --size 32 --colors 10 --view "flat front view" --asset "<UI_STYLE> <Icon block> A gold coin with a star, facing the viewer."
```

Names: `UI/Panels/panel_*`, `UI/Buttons/button_*`, `UI/Slots/slot_*`, `UI/Bars/bar_*`, `UI/Icons/icon_*`, `UI/Emblems/emblem_*`.

### Pilot result, 2026-11-06

Real jobs through connector requirements v9, rendered in Unity at 1600×900, S 4, with the settings in section 2.

| Piece | Grid, border | Result |
|---|---|---|
| Popup panel | 64, 16 | **Pass**: full grid, opaque center, stretch range uniform |
| Plain bg | 64, 12 | **Pass**, same. The band came out brighter than "slightly lighter" asked for |
| Button base, tinted | 32, 8 | **Pass**, same. Tints cleanly |
| Coin icon | 32 | **Pass**: crisp and readable |

- Corner detail is close to mirrored but not pixel-identical. Look at the corners in review. The clear corner notches are symmetric.
- Do not tell the worker about transparency or edge-to-edge framing in a frame brief. It makes an opaque F1 on a `#FF00FF` matte
  and trims it, so the frame block describes only the plate.
- **Not tested:** frames at 128, slots and bar tracks as their own jobs, and a real popup prefab with text.

## 7. Order and quota

Each job uses image-generation quota the moment it is submitted. Pixelorama MCP pieces cost no quota.

1. Pilot one panel, one button and one icon. Have the user approve the look before anything else. Draw the pieces that
   section 3 gives to Pixelorama MCP first: they set the palette and band style the connector briefs must match.
2. Update `UI_STYLE` in the profile if the pilot needs it. Then send the rest of the kit.
3. Reuse before you generate: one neutral frame with several tints beats several colored frames.
4. Failed review: change the brief and send a new job. Do not repaint the PNG. For a stretch-edge defect only, a small fix in
   Pixelorama is allowed if the fixed PNG replaces the one in `Assets/Art/` and the ledger row says so.

## 8. Review before use

Check the job's 8× `preview_path` and the native PNG:

- [ ] Reads at native size, on both a light and a dark background.
- [ ] No text, no second object, no shadow or glow outside the shape.
- [ ] Matches the other UI pieces and the profile palette.
- [ ] Frames: the pixels in the stretch range are identical along each edge, or the stretch will show wobble.
- [ ] Frames: corners are mirrored, and the center is one flat, fully opaque color. Check the alpha value, because a white preview can hide a transparent center.
- [ ] Tintable: looks right multiplied by every planned tint.

## 9. Bringing it into Unity

1. `node Tools/pixel-asset.mjs pull <job-id>` copies the PNG to `Assets/Art/UI/...` and writes the ledger row.
2. Frames only: set the border to the job's `request.slice_border` on all four sides. It survives a reimport.
   ```bash
   unity command eval 'var i=(UnityEditor.TextureImporter)UnityEditor.AssetImporter.GetAtPath("Assets/Art/UI/Panels/panel_modal.png"); i.spriteBorder=new UnityEngine.Vector4(16,16,16,16); i.SaveAndReimport();'
   ```
3. Assign the sprite and set Image type, multiplier and size from section 2. Keep the prefab name and its references.
4. Register resource icons in `Data Sprites`. Put UI sprites in a Sprite Atlas.
5. Look at it at the largest and smallest window sizes in the profile. Keep the screenshot as evidence.

## 10. Games with a raster (non-pixel) style

The connector's raster pipeline makes smooth art: `--pipeline raster`, or `"pipeline": "raster"` in
`design/art/pixel-asset-project.json` for a game that is raster throughout. Rules: connector `RASTER_REQUIREMENTS.md` and
`UI_9_SLICE_RASTER.md`. Pixelorama is not used for a raster game.

- **Import:** `pull` copies to `Assets/ArtRaster/`, handled by `RasterArtImporter` (PPU 100, bilinear, compressed, no
  mipmaps). PPU 100 equals the canvas reference PPU, so at `Pixels Per Unit Multiplier` 1 one source pixel is one canvas unit.
  There is no pixel scale S.
- **Frames:** `--type ui_9_slice --size <128, 256 or 512> --border <px>`. The corner radius stays below 75% of the border.
  Set `Pixels Per Unit Multiplier = source border / wanted border in canvas units`: a 64 px border drawn 32 units wide is 2.
- **Icons:** transparent PNG at about 2× the largest canvas size it is shown at, rounded to a power of two: a 90×90
  resource icon is 256. Width and height may differ (8 to 2048 px).
- **Backgrounds:** `--background opaque --width 1600 --height 900` (the reference resolution). The project default in the
  config is `transparent`, so pass `opaque` for full-bleed art.
- **Briefs:** `--view "flat front view"`, `--style` from the profile's UI_STYLE, the same kind blocks as section 6 minus
  the pixel words, and the same avoid list except that soft shading and gradients are allowed inside the shape.
- **Reference:** `--ref <job-id>` passes an approved piece as the style reference for the next job; this keeps a kit
  consistent better than text alone. `--no-ref` skips the project default reference.
- **Pilot, 2026-11-09:** a 256 px transparent gem icon (clean, soft shading) and a 256 px card frame with a 64 px border
  (one flat center color, stretch rows and columns identical, soft alpha only at the corners). Both imported through
  `RasterArtImporter`; the border set as in section 9. **Not tested:** rendering in a scene, opaque backgrounds, `--ref`.
