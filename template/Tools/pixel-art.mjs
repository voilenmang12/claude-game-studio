#!/usr/bin/env node
// Turns the optional pixel-art pipeline (Pixelorama + its MCP server) on or off for this game. The pixel-art skill
// runs it when the game's art style is pixel art (`.claude/skills/pixel-art/SKILL.md`).
//   node Tools/pixel-art.mjs status    what is set up and what is missing (changes nothing)
//   node Tools/pixel-art.mjs enable    add the `pixelorama` server to .mcp.json, then report what is still missing
//   node Tools/pixel-art.mjs disable   remove it from .mcp.json
// .mcp.json belongs to the game; the server lives in the workspace's tools/pixelorama-mcp/ (the nearest parent
// folder that has it), so the path written is relative to this game.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP = join(ROOT, ".mcp.json");
const BRIDGE = process.env.PIX_MCP_BRIDGE_URL || "http://127.0.0.1:7373";
const cmd = process.argv[2] || "status";
if (!["status", "enable", "disable"].includes(cmd)) {
  console.error("usage: node Tools/pixel-art.mjs status | enable | disable");
  process.exit(2);
}

function findTools() {
  for (let dir = resolve(ROOT, ".."); ; dir = dirname(dir)) {
    if (existsSync(join(dir, "tools/pixelorama-mcp/pixelorama-mcp.mjs"))) return join(dir, "tools/pixelorama-mcp");
    if (dirname(dir) === dir) return null;
  }
}
function readMcp() {
  if (!existsSync(MCP)) return { mcpServers: {} };
  const data = JSON.parse(readFileSync(MCP, "utf8"));
  data.mcpServers ??= {};
  return data;
}
function writeMcp(data) {
  writeFileSync(MCP, JSON.stringify(data, null, 2) + "\n");
}

const tools = findTools();
const data = readMcp();

if (cmd === "enable") {
  if (!tools) {
    console.error("No tools/pixelorama-mcp/ in a parent folder: this game must sit inside the studio workspace.");
    process.exit(1);
  }
  const path = relative(ROOT, join(tools, "pixelorama-mcp.mjs")).replaceAll("\\", "/");
  data.mcpServers.pixelorama = { command: "node", args: [path] };
  writeMcp(data);
  console.log(`.mcp.json: pixelorama -> node ${path}`);
} else if (cmd === "disable") {
  if (data.mcpServers.pixelorama) {
    delete data.mcpServers.pixelorama;
    writeMcp(data);
    console.log(".mcp.json: pixelorama removed. Restart Claude Code in this folder.");
  } else {
    console.log(".mcp.json has no pixelorama server; nothing to do.");
  }
  process.exit(0);
}

// status (also after enable)
const missing = [];
const on = Boolean(data.mcpServers.pixelorama);
console.log(`${on ? "ok  " : "off "} .mcp.json declares the pixelorama server`);
if (!on) missing.push("node Tools/pixel-art.mjs enable");
if (!tools) {
  console.log("miss tools/pixelorama-mcp/ in a parent folder (the studio workspace)");
  missing.push("put this game in the studio workspace");
} else if (!existsSync(join(tools, "server/node_modules/@modelcontextprotocol/sdk"))) {
  console.log("miss the server's packages");
  missing.push(`npm ci --omit=dev --prefix "${join(tools, "server")}"`);
} else {
  console.log("ok   server packages installed");
}
let health = null;
try {
  health = await (await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(2000) })).json();
} catch {}
if (health?.status === "ok") {
  console.log(`ok   Pixelorama ${health.pixelorama_version} with ${health.server} ${health.version} at ${BRIDGE}`);
} else {
  console.log(`miss Pixelorama with the PixMcpBridge extension at ${BRIDGE} (the user opens it)`);
  missing.push("the user installs Pixelorama 1.2.x and its PixMcpBridge extension, then opens Pixelorama (tools/pixelorama-mcp/README.md)");
}
if (missing.length) {
  console.log("\nTo do:");
  for (const m of missing) console.log(`  - ${m}`);
} else {
  console.log("\nPixel-art pipeline ready.");
}
if (cmd === "enable") console.log("Restart Claude Code in this folder so it loads the server (check with /mcp).");
