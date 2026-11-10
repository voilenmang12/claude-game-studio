# Studio template

The files `new-game.sh` copies into a Unity project. A fork of Claude Code Game Studios v1.2.0 (upstream README:
`docs/CCGS-README.md`; changes: `FORK.md` in the workspace root) plus an art pipeline (connector jobs, optional pixel art in Pixelorama) and UI rules.

- `CLAUDE.md`, `project.yaml`, `.claude/`: CCGS, set up for Unity 6.6 URP 2D, `modes.rigor: minimal`.
- `Assets/Editor/Art/`, `Assets/Integration/PixelArt.md`: import rules (pixel and raster).
- `.claude/skills/pixel-art/`, `Tools/pixel-art.mjs`: turn on Pixelorama and its MCP server for a pixel-art game.
- `Assets/Integration/UIPrompting.md`, `UIPopupStandard.md`, `design/art/ui-prompt-profile.md`: UI rules.
- `Tools/`: `export-pixelorama.sh`, `pixel-asset.mjs` (asset connector client), `ui-kit-template.mjs`,
  `ui-kit-check.py`.
- `TEMPLATE_VERSION`, `TEMPLATE_CHANGELOG.md`: versions, release and port procedures.
- `design/template-requests/README.md`: how a game asks for a template change.

In a game, this file can be replaced by the game's own README.
