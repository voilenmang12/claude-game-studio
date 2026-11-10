# Studio template

The files `new-game.sh` copies into a Unity project. A fork of Claude Code Game Studios v1.2.0 (upstream README:
`docs/CCGS-README.md`; changes: `FORK.md` in the workspace root) plus a pixel art and UI pipeline.

- `CLAUDE.md`, `project.yaml`, `.claude/`: CCGS, set up for Unity 6.6 URP 2D, `modes.rigor: minimal`.
- `Assets/Editor/Art/`, `Assets/Integration/PixelArt.md`: Pixelorama → Unity import.
- `Assets/Integration/UIPrompting.md`, `UIPopupStandard.md`, `design/art/ui-prompt-profile.md`: UI rules.
- `Tools/`: `export-pixelorama.sh`, `pixel-asset.mjs` (asset connector client), `ui-kit-template.mjs`,
  `ui-kit-check.py`.
- `TEMPLATE_VERSION`, `TEMPLATE_CHANGELOG.md`: versions, release and port procedures.
- `design/template-requests/README.md`: how a game asks for a template change.

In a game, this file can be replaced by the game's own README.
