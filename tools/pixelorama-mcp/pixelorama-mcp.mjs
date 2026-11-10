#!/usr/bin/env node
// Pixelorama MCP server for every game of the workspace (stdio). Games declare it in .mcp.json as
// ../tools/pixelorama-mcp/pixelorama-mcp.mjs. It starts the vendored Pixelorama-MCP server (server/, abidoo22,
// MIT, see README.md), which talks to the PixMcpBridge extension inside Pixelorama on http://127.0.0.1:7373
// (PIX_MCP_BRIDGE_URL overrides it).
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "server");

if (!existsSync(join(SERVER, "node_modules", "@modelcontextprotocol", "sdk"))) {
  // stdout is the MCP channel: the hint goes to stderr.
  console.error(
    `pixelorama-mcp: the server's packages are not installed. Run once:\n  npm ci --omit=dev --prefix "${SERVER}"`,
  );
  process.exit(1);
}

await import("./server/dist/index.js");
