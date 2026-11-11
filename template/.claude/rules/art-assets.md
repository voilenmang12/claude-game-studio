---
paths:
  - "ArtSource/**"
  - "Assets/Art/**"
  - "Assets/ArtRaster/**"
  - "Assets/Audio/**"
  - "Assets/Resources/**/*.{png,jpg,psd,wav,mp3,ogg}"
  - "design/asset-ledger.csv"
---

# Art and Asset Rules

Guides: `Assets/Integration/AssetStudio.md` (generated assets), `Assets/Integration/PixelArt.md` (import) and, for a pixel-art game, the `pixel-art` skill.
The art style comes from the art bible and the "Art style" row of `design/art/ui-prompt-profile.md`; Pixelorama
is only for a game whose style is pixel art, after the `pixel-art` skill turned it on.

- Source art goes in `ArtSource/`; in a pixel game the `.pxo` sources export to `Assets/Art/` through `bash Tools/export-pixelorama.sh`. Never hand-edit an exported PNG or JSON in `Assets/Art/`: change the `.pxo` and export again.
- Never generate F1 images yourself. Detailed assets go through the Asset Studio worker: submit a job, wait for `done`, and use the PNG at `export_path`. Every brief states the camera angle in `view` and the facing or orientation in `asset`, using the game's art bible convention so assets of one kind match. Each submitted job uses image-generation quota. `node Tools/asset-studio.mjs pull` copies the PNG to `Assets/Art/` and writes the ledger row. To change an Asset Studio PNG, submit a new job or redraw it as a `.pxo`. Guide: `Assets/Integration/AssetStudio.md`.
- UI elements (frames, buttons, icons, emblems) follow `Assets/Integration/UIPrompting.md` with the values in `design/art/ui-prompt-profile.md`. Fill the profile first, pilot three pieces, and get approval before sending the rest of the kit. No text in UI art.
- Popups and buttons follow `Assets/Integration/UIPopupStandard.md`: the fixed layer stack (Black Panel, bg1, bg2, bg3, card, title, close), one shared kit for every popup, one button shape with a baked sprite per color role, and the contrast minimums checked by `python Tools/ui-kit-check.py`.
- In a pixel game, simple UI pieces (flat frames, buttons, slots, bar tracks, toggles, glyph icons of at most 4 colors) are drawn with Pixelorama MCP, not sent to Asset Studio: section 3 of `UIPrompting.md` decides which tool.
- Non-pixel art uses Asset Studio's raster pipeline (`--pipeline raster`) and lives in `Assets/ArtRaster/` (`RasterArtImporter`). Never put raster art in `Assets/Art/`, which forces pixel import settings.
- Every asset you add, generate, draw or import gets a row in `design/asset-ledger.csv` in the same change: path, source type (`self`, `claude-mcp`, `ai-tool`, `cc0`, `purchased`, `commissioned`), source URL or tool, license, plan/tier, author, date, how it was modified. A missing row is an unfinished task.
- Allowed licenses: CC0, CC-BY (credit added to the credits screen), purchased royalty-free, paid AI plans that grant commercial use. Refuse NC, ND, "personal use", unknown licenses, and free AI tiers without commercial rights; tell the user why.
- External assets must be recolored to the game's palette and fitted to its sizes before use. An unmodified pack is an asset flip.
- Use the palette and frame sizes from the game's art bible. If there is no art bible yet, ask the user to run `/art-bible` before producing art.
- Pixel games: do not change `PixelArtImporter.PixelsPerUnit` after the first asset is placed in a scene; keep
  Pixelorama's default spritesheet layout, one tag per animation.
- Content stays within the game's age rating and original: no characters, logos or styles copied from existing games or brands.
