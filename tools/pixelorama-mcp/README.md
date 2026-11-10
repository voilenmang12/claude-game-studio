# pixelorama-mcp (standalone)

- `PixeloramaMCP.zip`: the original Pixelorama extension from https://github.com/CyberIce2077/pixelorama-mcp v0.1.0
  (MIT, see `LICENSE`). Install it into Pixelorama.
- `pixelorama-mcp.mjs`: a rewritten MCP server with no npm dependencies (same 13 tools, same protocol). Runs with plain
  `node`.
- `test-connection.mjs`: checks that Pixelorama is running with the extension enabled.

Every game made from `template/` declares this server in its `.mcp.json` as `../tools/pixelorama-mcp/pixelorama-mcp.mjs`,
so the game folder must sit in the workspace root next to `tools/`.

## Install the extension (once)

1. Open Pixelorama → Edit → Preferences → Extensions → **Add Extension** → pick `PixeloramaMCP.zip` from this folder.
2. Enable **Pixelorama MCP** and restart Pixelorama.

## Use

1. Open Pixelorama first.
2. Start Claude Code in the game folder and accept the `pixelorama` MCP server when asked. Check with `/mcp`.
3. Example: "draw a 16x16 coin in the open file and save it to ArtSource/Items/coin.pxo".

Port: `127.0.0.1:7651` (change with the `PIXELORAMA_MCP_PORT` environment variable).
