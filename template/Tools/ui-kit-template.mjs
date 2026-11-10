#!/usr/bin/env node
// Draws the template's neutral popup kit (Assets/Integration/UIPopupStandard.md, section 5) in Pixelorama through
// the pixelorama-mcp server, saves ArtSource/UI/**.pxo, then exports with Tools/export-pixelorama.sh.
// A game copies this file, changes PALETTE (from its ui-prompt-profile.md) and runs it again.
// Pixelorama must be open with the MCP extension enabled.
//   node Tools/ui-kit-template.mjs [--only popup_frame,button_primary]
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The workspace keeps the server in tools/pixelorama-mcp/ next to the game folders; override with PIXELORAMA_MCP_SERVER.
const SERVER = process.env.PIXELORAMA_MCP_SERVER || resolve(ROOT, "..", "tools/pixelorama-mcp/pixelorama-mcp.mjs");

// ---- palette: fill, outline, lip (bottom shade), rim (top light). Placeholder values for the template only.
const PALETTE = {
  frame:    { fill: "#2e8f85", outline: "#10302c", lip: "#1f6b63", rim: "#62c1b5" },
  panel:    { fill: "#f5f4eb", outline: "#1c4440", lip: "#d6d2bd" },
  well:     { fill: "#c8d2c4" },
  card:     { fill: "#fbfaf4", outline: "#1c4440", lip: "#d9d5c2" },
  cardSel:  { fill: "#ffb85c", outline: "#6b3a0c", lip: "#e0943a", rim: "#ffd9a6" },
  title:    { fill: "#e8702e", outline: "#5a2208", lip: "#b84f17", rim: "#ffae7a" },
  primary:  { fill: "#ff9c55", outline: "#5e2a08", lip: "#d9712b", rim: "#ffc89e" },
  secondary:{ fill: "#6cc3b8", outline: "#10302c", lip: "#3f9a8f", rim: "#a9e2da" },
  buy:      { fill: "#ffd04a", outline: "#5e4306", lip: "#d9a520", rim: "#ffe79a" },
  disabled: { fill: "#b9bcb6", outline: "#45483f", lip: "#8f928a", rim: "#d8dad5" },
  close:    { fill: "#e5533d", outline: "#4f140b", lip: "#b23a27", rim: "#f48b78", glyph: "#ffffff" },
};

// ---- shapes. Characters: O outline, R rim, L lip, F fill, X glyph, . clear
// Rounded plate: corner radius r (stepped), 1 px outline, `rim` light rows under the top outline, `lip` rows above the bottom.
function plate(w, h, { r, rim = 0, lip = 0, outline = true }) {
  const inside = (x, y) => {
    const cx = Math.min(x, w - 1 - x), cy = Math.min(y, h - 1 - y);
    if (cx >= r || cy >= r) return true;
    const dx = r - cx - 0.5, dy = r - cy - 0.5;
    return dx * dx + dy * dy <= r * r;
  };
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) { row += "."; continue; }
      const edge = outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx < 0 || ny < 0 || nx >= w || ny >= h || !inside(nx, ny);
      });
      if (edge) row += "O";
      else if (lip && y >= h - (outline ? 1 : 0) - lip) row += "L";
      else if (rim && y < (outline ? 1 : 0) + rim) row += "R";
      else row += "F";
    }
    rows.push(row);
  }
  return rows;
}

// Round close button with a white X (core 3 px wide, so the diagonals read as solid strokes).
function closeButton(n) {
  const rows = plate(n, n, { r: Math.floor(n / 2), rim: 1, lip: 3 });
  const lo = Math.round(n * 0.3), hi = n - 1 - lo, mid = (n - 1) / 2, shift = -1; // X sits a little above center (lip)
  return rows.map((row, y) => [...row].map((ch, x) => {
    if (ch === "." || ch === "O") return ch;
    const gy = y - shift;
    const inX = x >= lo && x <= hi && gy >= lo && gy <= hi && (Math.abs(x - gy) <= 1 || Math.abs(x + gy - 2 * mid) <= 1);
    return inX ? "X" : ch;
  }).join(""));
}

const map = (p) => ({ O: p.outline, R: p.rim ?? p.fill, L: p.lip ?? p.fill, F: p.fill, X: p.glyph ?? p.fill });
const button = (p) => ({ size: [32, 32], rows: plate(32, 32, { r: 5, rim: 1, lip: 3 }), palette: map(p) });

const PIECES = {
  "Popup/popup_frame":         { size: [64, 64], rows: plate(64, 64, { r: 7, rim: 1, lip: 3 }), palette: map(PALETTE.frame) },
  "Popup/popup_panel":         { size: [64, 64], rows: plate(64, 64, { r: 6, lip: 2 }), palette: map(PALETTE.panel) },
  "Popup/popup_well":          { size: [32, 32], rows: plate(32, 32, { r: 4, outline: false }), palette: map(PALETTE.well) },
  "Popup/popup_card":          { size: [32, 32], rows: plate(32, 32, { r: 4, lip: 2 }), palette: map(PALETTE.card) },
  "Popup/popup_card_selected": { size: [32, 32], rows: plate(32, 32, { r: 4, rim: 1, lip: 2 }), palette: map(PALETTE.cardSel) },
  "Popup/popup_title":         { size: [64, 24], rows: plate(64, 24, { r: 5, rim: 1, lip: 3 }), palette: map(PALETTE.title) },
  "Buttons/button_primary":    button(PALETTE.primary),
  "Buttons/button_secondary":  button(PALETTE.secondary),
  "Buttons/button_buy":        button(PALETTE.buy),
  "Buttons/button_disabled":   button(PALETTE.disabled),
  "Buttons/button_close":      { size: [28, 28], rows: closeButton(28), palette: map(PALETTE.close) },
};

// ---- MCP client (newline-delimited JSON-RPC over stdio)
const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "inherit"] });
let buffer = "", nextId = 1;
const waiting = new Map();
child.stdout.on("data", (data) => {
  buffer += data;
  for (let i; (i = buffer.indexOf("\n")) >= 0;) {
    const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    waiting.get(msg.id)?.(msg); waiting.delete(msg.id);
  }
});
const rpc = (method, params) => new Promise((ok, fail) => {
  const id = nextId++;
  waiting.set(id, (m) => (m.error ? fail(new Error(m.error.message)) : ok(m.result)));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});
const call = async (name, args) => {
  const result = await rpc("tools/call", { name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${result.content?.[0]?.text}`);
  return result;
};

const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex > 0 ? process.argv[onlyIndex + 1].split(",") : null;
const sources = [];
try {
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ui-kit", version: "1" } });
  for (const [name, piece] of Object.entries(PIECES)) {
    if (only && !only.includes(name.split("/").pop())) continue;
    const [w, h] = piece.size;
    if (piece.rows.length !== h || piece.rows.some((row) => row.length !== w)) throw new Error(`${name}: grid is not ${w}x${h}`);
    const used = new Set(piece.rows.join("").replaceAll(".", ""));
    const palette = Object.fromEntries([...used].map((ch) => [ch, piece.palette[ch]]));
    await call("new_project", { width: w, height: h, name: name.split("/").pop() });
    await call("draw_pixels", { rows: piece.rows, palette });
    const source = `ArtSource/UI/${name}.pxo`;
    mkdirSync(dirname(join(ROOT, source)), { recursive: true }); // Pixelorama does not create folders
    await call("save_project", { path: join(ROOT, source) });
    sources.push(source);
    console.log(`drew ${source} (${w}x${h}, ${used.size} colors)`);
  }
} finally {
  child.kill();
}
execFileSync("bash", ["Tools/export-pixelorama.sh", "--force", ...sources], { cwd: ROOT, stdio: "inherit" });
