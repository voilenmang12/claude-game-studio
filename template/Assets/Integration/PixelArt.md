# Pixel art: Pixelorama → Unity

The default house style is pixel art drawn in Pixelorama (tested with v1.2.3). This file covers how art gets into
Unity and how Claude draws alongside you.

## 1. Layout

```
ArtSource/                 .pxo sources (committed to git, NOT inside Assets/)
  Characters/hero.pxo
  Items/coin.pxo
Assets/Art/                exports that Unity imports (commit the .meta files too)
  Characters/hero.png      one-row sprite sheet
  Characters/hero.json     Pixelorama data (frame size, tags, fps, durations)
  Characters/hero_Idle.anim   AnimationClip per tag
design/asset-ledger.csv    license ledger: one row per asset
```

A path under `ArtSource/` keeps the same path under `Assets/Art/`.

## 2. Drawing in Pixelorama

- Load the game's palette (art bible) before drawing; use **Indexed mode** so colors do not drift.
- Animation: each move is a **tag** (Idle, Run, Jump…). The tag name becomes the clip name: `hero_Idle.anim`.
- Timing: the project FPS and each frame's duration are kept in the clip.
- **Do not change the spritesheet layout in the Export dialog** (keep Columns, 1 line, All frames). The importer only
  reads one-row sheets; any other layout fails with a clear error.
- Frame sizes come from the art bible (for example 16×16 items, 32×32 characters).

## 3. Export

Git Bash at the project root:

```bash
bash Tools/export-pixelorama.sh            # only .pxo files changed since the last export
bash Tools/export-pixelorama.sh --force    # export everything again
bash Tools/export-pixelorama.sh ArtSource/Characters/hero.pxo
```

The script calls Pixelorama's CLI (`--headless --quit -- <file> --export --spritesheet --output <png> --json`).
Pixelorama installed somewhere else: `export PIXELORAMA_EXE="/c/path/Pixelorama.exe"`.

## 4. Unity import (`Assets/Editor/Art/PixelArtImporter.cs`)

Every PNG in `Assets/Art/`:

| Setting | Value |
|---|---|
| Texture Type | Sprite |
| Filter | Point |
| Compression | None (small pixel art; the build compresses it) |
| Mipmaps | Off |
| Pixels Per Unit | `PixelArtImporter.PixelsPerUnit`, set **once** from the art bible (default 16) |

A PNG with a `.json` of the same name **and 2 or more frames or any tag** is sliced into `<name>_0`, `<name>_1`…
(pivot bottom-center), with one looping clip per tag (no tags → a clip named `All`). Exporting again keeps the sprite
IDs, so scene and prefab references survive. Menu **Tools → Art → Reimport Pixelorama Sheets** runs it on everything.
A file with one frame and no tags (UI, static icons) is one Single sprite and keeps its 9-slice border.

Camera: add a **Pixel Perfect Camera** (URP 2D) with Assets PPU = PixelsPerUnit when the game needs exact pixels.

## 5. Claude draws in Pixelorama (pixelorama-mcp)

Upstream: https://github.com/CyberIce2077/pixelorama-mcp (MIT). Claude draws with a character grid and a palette in
the open file; you watch the canvas and can undo with Ctrl+Z. Good for icons, items, tiles, recolors and short
animations. Not for detailed characters (pixels and rectangles only, no brush or selection).

The workspace ships the extension and a dependency-free server in `tools/pixelorama-mcp/`, and every game's
`.mcp.json` points to it. One-time setup per machine:

1. Pixelorama → Edit → Preferences → Extensions → **Add Extension** → pick `tools/pixelorama-mcp/PixeloramaMCP.zip`
   → enable **Pixelorama MCP** → restart Pixelorama.
2. Start Claude Code in the game folder and accept the `pixelorama` server when asked (`/mcp` to check).

Each time: open Pixelorama first, then ask Claude.

Suggested loop: Claude draws or edits → `save_project` to `ArtSource/...pxo` → `bash Tools/export-pixelorama.sh` →
Unity imports.

Simple pixel UI (flat frames, buttons, slots, bars, line icons such as X, arrows, plus) is drawn this way instead of
connector jobs: exact pixels, symmetric corners, no quota. Tool choice and drawing steps: `UIPrompting.md`, section 3.

## 6. Generated assets (asset connector)

Detailed assets come from [Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio), a separate repo: a local service that takes jobs over
REST (default `http://127.0.0.1:3941`, `PIXEL_ASSET_API` to change it) and whose worker makes the image with Codex
ImageGen. Set it up from its README (`node asset-connector/setup.mjs doctor`, then
`node asset-connector/server.mjs --worker`), and set `PIXEL_ASSET_CONNECTOR_DIR` to its `asset-connector` folder
so error hints show the right path. When it requires a token, put the project token in `ASSET_API_TOKEN`. Register the project once with `POST /v1/projects` and the
master prompt from the art bible, and keep the returned `project_id`.

1. Send `POST /v1/projects/{project_id}/jobs` and keep the returned `id`. Example body:
   `{"request":{"asset":"Common iron sword, grip at the bottom, tip pointing straight up","asset_type":"item","view":"front view","rarity":"common"}}`.
   A brief states the camera angle in `view` and the facing of the object or character in `asset`: the connector has
   no default for either. Write the game's convention (for example weapon direction in the inventory) into the art
   bible so every job matches.
2. Poll `GET /v1/jobs/{id}` until `status: "done"`. On `failed`, read `error`.
3. Take the PNG from `export_path`, a file path on the machine that runs the connector.

UI elements (frames, buttons, icons) have their own rules: read `Assets/Integration/UIPrompting.md` and fill
`design/art/ui-prompt-profile.md` before the first job. A PNG without a matching `.json` imports as one Single sprite,
pivot center, no alpha slicing.

`Tools/pixel-asset.mjs` is an optional CLI. `status` shows the PNG path; `pull <job-id>` copies the PNG into
`Assets/Art/` and writes the ledger row. `caps` prints the connector API version (this client uses API 1.x, tested
with 1.2.0).

**Non-pixel styles (connector API 1.2):** add `--pipeline raster`, or set `"pipeline": "raster"` in
`design/art/pixel-asset-project.json` for an all-raster game. Raster images can be rectangular (`--width`,
`--height`, 8 to 2048 px), `--background opaque` for full-bleed images, `--style` for the material. `pull` copies into
`Assets/ArtRaster/`, imported by `Assets/Editor/Art/RasterArtImporter.cs` (PPU 100, bilinear, compressed);
`Assets/Art/` stays pixel only. Raster UI: `UIPrompting.md`, section 10.

**Style references:** `--ref <job-id>` (a finished job of the same project) or `--ref path/to/image.png` (at most
8 MiB, 2048 px) keeps the same style; `--no-ref` drops the project's default reference.

## 7. Outside sources and the license ledger

- Every asset added to the game (drawn by you, by Claude, generated, Kenney, purchased) gets one row in
  `design/asset-ledger.csv`.
- Only licenses that allow commercial use (CC0, CC-BY with credit, purchased royalty-free, paid AI plans with
  commercial rights). No NC licenses, no output from free AI tiers that forbid commercial use.
- Outside assets must be recolored to the game's palette and fitted to its sizes before use. Portals reject
  unmodified packs as asset flips.
