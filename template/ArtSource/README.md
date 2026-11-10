# ArtSource

Source art files (`.pxo` from Pixelorama, plus `.png`/`.svg` originals) live here, outside `Assets/` so Unity does not import them.

- Connector jobs provide the finished PNG at `export_path`. Use `pixelorama_project_path` to retrieve the editable source if needed.
- Export: `bash Tools/export-pixelorama.sh` writes `Assets/Art/<same path>.png` + `.json`.
- Keep Pixelorama's default spritesheet layout (Columns, 1 line, all frames).
- One tag per animation; tag names become clip names.
- Every asset gets a row in `design/asset-ledger.csv`.

Full guide: `Assets/Integration/PixelArt.md`.
