# Pixel art: Pixelorama → Unity

Pixel art, an optional style turned on by the `pixel-art` skill, is drawn in Pixelorama (tested with v1.2.3). This
file covers how it gets into Unity and how Claude draws alongside you. Generated assets in any style come from
Codex Asset Studio: `AssetStudio.md`.

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

Upstream: https://github.com/abidoo22/Pixelorama-MCP v0.2.1 (MIT). Claude draws live in the open Pixelorama
(106 tools: pixels, lines, shapes, fills, layers, frames, animation tags, palettes, selections, dithering, outlines,
tilesets, export); you watch the canvas and can undo with Ctrl+Z. Good for icons, items, tiles, UI pieces, recolors
and short animations. Detailed characters still come from Asset Studio (`AssetStudio.md`).

Pixelorama is optional: only a game whose art style is pixel art uses it. The `pixel-art` skill turns it on
(`node Tools/pixel-art.mjs enable` writes the `pixelorama` server into the game's `.mcp.json`). The workspace ships
the `PixMcpBridge` extension and the server in `tools/pixelorama-mcp/`. One-time setup per machine
(`tools/pixelorama-mcp/README.md`):

1. Pixelorama → Edit → Preferences → Extensions → **Add Extension** → pick `tools/pixelorama-mcp/PixMcpBridge.pck`
   → enable **PixMcpBridge** → restart Pixelorama. One MCP extension per Pixelorama: remove older ones.
2. `npm ci --omit=dev --prefix tools/pixelorama-mcp/server` (workspace root), then
   `node tools/pixelorama-mcp/test-connection.mjs` with Pixelorama open.
3. Start Claude Code in the game folder and accept the `pixelorama` server when asked (`/mcp` to check).

Each time: open Pixelorama first, then ask Claude.

Suggested loop: Claude draws or edits → `save_project` to `ArtSource/...pxo` → `bash Tools/export-pixelorama.sh` →
Unity imports.

Simple pixel UI (flat frames, buttons, slots, bars, line icons such as X, arrows, plus) is drawn this way instead of
Asset Studio jobs: exact pixels, symmetric corners, no quota. Tool choice and drawing steps: `UIPrompting.md`, section 3.

## 6. Outside sources and the license ledger

- Every asset added to the game (drawn by you, by Claude, generated, Kenney, purchased) gets one row in
  `design/asset-ledger.csv`.
- Only licenses that allow commercial use (CC0, CC-BY with credit, purchased royalty-free, paid AI plans with
  commercial rights). No NC licenses, no output from free AI tiers that forbid commercial use.
- Outside assets must be recolored to the game's palette and fitted to its sizes before use. Portals reject
  unmodified packs as asset flips.
