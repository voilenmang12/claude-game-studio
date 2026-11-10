# pixelorama-mcp

The Pixelorama MCP server every game uses, vendored from [Pixelorama-MCP](https://github.com/abidoo22/Pixelorama-MCP)
v0.2.1 (commit `56fd8aa`, MIT, see `LICENSE`): 106 tools for drawing, layers, frames, palettes, selections,
tilesets and export, live in the open Pixelorama.

| File | What |
|---|---|
| `PixMcpBridge.pck` | The Pixelorama extension (built upstream, unchanged). It serves `http://127.0.0.1:7373` inside Pixelorama |
| `server/` | The upstream MCP server, built JavaScript (`dist/`) with its `package.json` and lock; packages not included |
| `pixelorama-mcp.mjs` | What games start (`.mcp.json`: `../tools/pixelorama-mcp/pixelorama-mcp.mjs`); it runs `server/` |
| `test-connection.mjs` | Checks the bridge and the server (`--draw` draws a test coin) |

## Set up, once per machine

1. Pixelorama 1.2.x → Edit → Preferences → Extensions → **Add Extension** → pick `PixMcpBridge.pck` from this
   folder → enable it → restart Pixelorama. Remove any older Pixelorama MCP extension (`PixeloramaMCP`): one bridge
   per Pixelorama.
2. Install the server's packages (Node 18 or later):
   ```bash
   npm ci --omit=dev --prefix tools/pixelorama-mcp/server
   ```
3. With Pixelorama open: `node tools/pixelorama-mcp/test-connection.mjs` → `connection works`.

## Use

Open Pixelorama first, then start Claude Code in a game folder and accept the `pixelorama` MCP server (`/mcp`).
Ask for art in words ("draw a 16x16 coin and save it to ArtSource/Items/coin.pxo"); the agent calls the tools.
Scripts can drive it too: `template/Tools/ui-kit-template.mjs` uses `create_canvas`, `draw_pixels_fast` and
`save_project`.

`PIX_MCP_BRIDGE_URL` changes the bridge address, `PIX_MCP_TIMEOUT_MS` the per-call timeout.

## Taking a newer upstream version

In a clone of the upstream repo: `npm ci && npm run build` in `mcp-server/`, then copy `mcp-server/dist/**/*.js`
(without source maps), `package.json`, `package-lock.json` into `server/` and `pixelorama-plugin/PixMcpBridge.pck`
here; note the version and commit above and in the template changelog.
