#!/usr/bin/env node
// Draws the popup kit (Assets/Integration/UIPopupStandard.md, section 5) in Pixelorama through the pixelorama-mcp
// server, saves ArtSource/UI/**.pxo, then exports with Tools/export-pixelorama.sh.
// This script belongs to the template; the colors and button roles belong to the game, in
// design/art/ui-kit-palette.json (set it from design/art/ui-prompt-profile.md).
// Pixelorama must be open with the PixMcpBridge extension enabled (tools/pixelorama-mcp/README.md; not needed for --check).
//   node Tools/ui-kit-template.mjs [--only popup_frame,button_primary]
//   node Tools/ui-kit-template.mjs --check      validate the palette file and list the pieces, draw nothing
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The workspace keeps the server in tools/pixelorama-mcp/; the nearest parent folder that has it wins, so this works
// in a game next to tools/ and in a deeper project such as local/project/. PIXELORAMA_MCP_SERVER overrides it.
function findServer() {
  for (let dir = resolve(ROOT, ".."); ; dir = dirname(dir)) {
    const candidate = join(dir, "tools/pixelorama-mcp/pixelorama-mcp.mjs");
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) return resolve(ROOT, "..", "tools/pixelorama-mcp/pixelorama-mcp.mjs");
  }
}
const SERVER = process.env.PIXELORAMA_MCP_SERVER || findServer();

// ---- palette: design/art/ui-kit-palette.json. Fails loudly: a missing layer or a bad color stops the run.
const PALETTE_FILE = join(ROOT, "design/art/ui-kit-palette.json");
const HEX = /^#[0-9a-fA-F]{6}$/;
const LAYERS = {   // layer: color keys it must have (UIPopupStandard.md section 1)
  frame: ["fill", "outline"], panel: ["fill", "outline"], well: ["fill"], card: ["fill", "outline"],
  cardSelected: ["fill", "outline"], title: ["fill", "outline"], close: ["fill", "outline", "glyph"],
};
const OPTIONAL = ["lip", "rim"];
function loadPalette() {
  let data;
  try { data = JSON.parse(readFileSync(PALETTE_FILE, "utf8")); }
  catch (error) { throw new Error(`${PALETTE_FILE}: ${error.message}. Copy the template's file and set the game's colors.`); }
  const color = (where, entry, keys) => {
    if (!entry || typeof entry !== "object") throw new Error(`palette: ${where} is missing`);
    for (const key of keys) if (!HEX.test(entry[key] ?? "")) throw new Error(`palette: ${where}.${key} must be #rrggbb`);
    for (const key of Object.keys(entry)) {
      if (!keys.includes(key) && !OPTIONAL.includes(key)) throw new Error(`palette: ${where}.${key} is not a color key`);
      if (!HEX.test(entry[key])) throw new Error(`palette: ${where}.${key} must be #rrggbb`);
    }
    return entry;
  };
  const layers = Object.fromEntries(Object.entries(LAYERS).map(([name, keys]) => [name, color(name, data[name], keys)]));
  const buttons = data.buttons;
  if (!buttons || typeof buttons !== "object" || !Object.keys(buttons).length) throw new Error("palette: buttons needs at least one role");
  for (const [role, entry] of Object.entries(buttons)) {
    if (!/^[a-z][a-z0-9_]*$/.test(role)) throw new Error(`palette: button role "${role}" must be lowercase letters, digits and _`);
    color(`buttons.${role}`, entry, ["fill", "outline"]);
  }
  for (const key of Object.keys(data)) {
    if (!key.startsWith("_") && key !== "buttons" && !(key in LAYERS)) throw new Error(`palette: unknown key "${key}"`);
  }
  return { ...layers, buttons };
}
const PALETTE = loadPalette();

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
  "Popup/popup_card_selected": { size: [32, 32], rows: plate(32, 32, { r: 4, rim: 1, lip: 2 }), palette: map(PALETTE.cardSelected) },
  "Popup/popup_title":         { size: [64, 24], rows: plate(64, 24, { r: 5, rim: 1, lip: 3 }), palette: map(PALETTE.title) },
  ...Object.fromEntries(Object.entries(PALETTE.buttons).map(([role, p]) => [`Buttons/button_${role}`, button(p)])),
  "Buttons/button_close":      { size: [28, 28], rows: closeButton(28), palette: map(PALETTE.close) },
};

if (process.argv.includes("--check")) {
  console.log(`${PALETTE_FILE}: OK`);
  for (const name of Object.keys(PIECES)) console.log(`  ArtSource/UI/${name}.pxo`);
  process.exit(0);
}

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
  // The server reports a failed command as text starting with an X mark, not always with isError.
  const text = result.content?.[0]?.text ?? "";
  if (result.isError || text.startsWith("❌")) throw new Error(`${name}: ${text}`);
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
    await call("create_canvas", { width: w, height: h, name: name.split("/").pop(), fill_color: "transparent" });
    // One batch per piece: [x, y, "#hex", ...] for every pixel that is not "." (transparent).
    const data = piece.rows.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "." ? [] : [x, y, palette[ch]])));
    await call("draw_pixels_fast", { data });
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
