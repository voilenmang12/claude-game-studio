# Generated assets: Codex Asset Studio

Detailed assets in any art style (characters, items, icons, painted UI, backgrounds, animation sheets) come from
[Codex Asset Studio](https://github.com/voilenmang12/codex-asset-studio), a separate repo: a local service that takes
jobs over REST (default `http://127.0.0.1:3941`, `ASSET_STUDIO_API` to change it) and whose worker makes the image
with Codex ImageGen. Set it up from its README (`node asset-connector/setup.mjs doctor`, then
`node asset-connector/server.mjs --worker`), and set `ASSET_STUDIO_DIR` to its folder (or `assetStudioDir` in the
workspace's `local/studio.config.json`) so error hints show the right path. When it requires a token, put the project
token in `ASSET_API_TOKEN`. Register the project once with `POST /v1/projects` and the master prompt from the art
bible, and keep the returned `project_id`.

1. Send `POST /v1/projects/{project_id}/jobs` and keep the returned `id`. Example body:
   `{"request":{"asset":"Common iron sword, grip at the bottom, tip pointing straight up","asset_type":"item","view":"front view","rarity":"common"}}`.
   A brief states the camera angle in `view` and the facing of the object or character in `asset`: Asset Studio has
   no default for either. Write the game's convention (for example weapon direction in the inventory) into the art
   bible so every job matches.
2. Poll `GET /v1/jobs/{id}` until `status: "done"`. On `failed`, read `error`.
3. Take the PNG from `export_path`, a file path on the machine that runs Asset Studio.

UI elements (frames, buttons, icons) have their own rules: read `Assets/Integration/UIPrompting.md` and fill
`design/art/ui-prompt-profile.md` before the first job. A PNG without a matching `.json` imports as one Single sprite,
pivot center, no alpha slicing.

`Tools/asset-studio.mjs` is an optional CLI with the settings in `design/art/asset-studio-project.json`. `init`
registers the project; `status` shows the PNG path; `pull <job-id>` copies the PNG into `Assets/Art/` and writes the
ledger row. `caps` prints the Asset Studio API version (this client uses API 1.x, tested with 1.2.0).

**Pixel art** is the default pipeline (`"pipeline": "pixel"`): grid recovery and palette, PNGs in `Assets/Art/`
(`Assets/Integration/PixelArt.md` for the import rules).

**Other styles (API 1.2):** add `--pipeline raster`, or set `"pipeline": "raster"` in
`design/art/asset-studio-project.json` for an all-raster game. Raster images can be rectangular (`--width`,
`--height`, 8 to 2048 px), `--background opaque` for full-bleed images, `--style` for the material. `pull` copies into
`Assets/ArtRaster/`, imported by `Assets/Editor/Art/RasterArtImporter.cs` (PPU 100, bilinear, compressed);
`Assets/Art/` stays pixel only. Raster UI: `UIPrompting.md`, section 10.

**Style references:** `--ref <job-id>` (a finished job of the same project) or `--ref path/to/image.png` (at most
8 MiB, 2048 px) keeps the same style; `--no-ref` drops the project's default reference.
