---
name: pixel-art
description: Turns on and runs the optional pixel-art pipeline (Pixelorama, its MCP server, the .pxo to Unity export) for a game whose art style is pixel art. Use when the user picks pixel art (art bible, UI profile), asks for pixel art or Pixelorama, or a pixel asset must be drawn, exported or checked. Not for raster or hand-painted styles, which use the connector's raster pipeline.
---

# Pixel art

Pixelorama is **optional**. A game needs it only when its art style is pixel art. Until this skill turns it on, the
game declares no `pixelorama` MCP server and nothing asks for Pixelorama.

## 1. Confirm the style

Read the art style from `design/art/ui-prompt-profile.md` ("Art style" row) and the art bible
(`design/art-bible.md` or the file `/art-bible` wrote). Then:

- **Pixel art** already recorded: go to step 2.
- **Not decided**: ask the user whether the game is pixel art. Record the answer in the profile's "Art style" row
  (`pixel` or `raster`) before going on. If there is no art bible yet, suggest `/art-bible` first.
- **Raster** (or any non-pixel style): stop. Say that this game uses the connector's raster pipeline
  (`Assets/Integration/UIPrompting.md` section 10, `Assets/ArtRaster/`), and run `node Tools/pixel-art.mjs disable`
  if `.mcp.json` still declares `pixelorama`.

## 2. Turn it on

```bash
node Tools/pixel-art.mjs enable
```

It writes the `pixelorama` server into the game's `.mcp.json` (path to the workspace's `tools/pixelorama-mcp/`) and
lists what is still missing. Do what the "To do" list says:

- `npm ci --omit=dev --prefix <workspace>/tools/pixelorama-mcp/server`: run it yourself.
- Pixelorama 1.2.x with the `PixMcpBridge` extension: the user installs it once per machine and opens it
  (`tools/pixelorama-mcp/README.md` in the workspace). Ask, then run `node Tools/pixel-art.mjs status` again.
- Then the user restarts Claude Code in the game folder so the server loads; `/mcp` shows `pixelorama`.

Commit `.mcp.json` and the profile row when the user asks for a commit: `chore: turn on the pixel-art pipeline`.

## 3. Work

The rules are in `Assets/Integration/PixelArt.md` (read it before drawing or importing) and
`.claude/rules/art-assets.md`:

- Sources in `ArtSource/*.pxo`; `bash Tools/export-pixelorama.sh` writes `Assets/Art/<same path>.png` + `.json`;
  `Assets/Editor/Art/PixelArtImporter.cs` slices and animates them in Unity.
- Draw small assets (icons, items, tiles, recolors, simple UI pieces) live in Pixelorama through the MCP tools, then
  `save_project` to `ArtSource/`. Which UI piece is drawn and which goes to the connector: `UIPrompting.md` section 3.
- The popup kit: `node Tools/ui-kit-template.mjs` (colors in `design/art/ui-kit-palette.json`).
- Detailed assets (characters, scenes) still come from the asset connector (`PixelArt.md` section 6).
- Every asset gets its row in `design/asset-ledger.csv` in the same change.

## 4. Turn it off

When the game changes to a non-pixel style: `node Tools/pixel-art.mjs disable`, set the profile row to `raster`, and
move on with the raster pipeline. Existing `.pxo` sources and exports stay until the user decides what to keep.
