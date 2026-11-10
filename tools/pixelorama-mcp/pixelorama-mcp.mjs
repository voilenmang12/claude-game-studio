#!/usr/bin/env node
// Dependency-free MCP stdio server for Pixelorama.
// Same tools and wire protocol as github.com/CyberIce2077/pixelorama-mcp v0.1.0 (MIT),
// rewritten without @modelcontextprotocol/sdk / zod so it runs on plain Node 18+.
// Talks to the PixeloramaMCP extension on 127.0.0.1:7651 (one JSON object per line).
import { createConnection } from "node:net";
import { isAbsolute, resolve } from "node:path";

const PORT = Number(process.env.PIXELORAMA_MCP_PORT ?? 7651);
const HOST = "127.0.0.1";
const SERVER_INFO = { name: "pixelorama-mcp", version: "0.1.0-standalone" };

// ---------- connection to the Pixelorama extension ----------
class Connection {
  constructor(host, port) { this.host = host; this.port = port; this.buffer = ""; this.nextId = 1; this.pending = new Map(); }
  async request(method, params = {}, timeoutMs = 15000) {
    const socket = await this.connect();
    const id = this.nextId++;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { this.pending.delete(id); rej(new Error(`${method} timed out after ${timeoutMs} ms`)); }, timeoutMs);
      this.pending.set(id, { res, rej, timer });
      socket.write(JSON.stringify({ id, method, params }) + "\n");
    });
  }
  close() { this.socket?.destroy(); }
  connect() {
    if (this.socket) return Promise.resolve(this.socket);
    this.connecting ??= new Promise((res, rej) => {
      const socket = createConnection({ host: this.host, port: this.port });
      socket.setEncoding("utf8");
      socket.once("connect", () => { this.socket = socket; this.connecting = undefined; res(socket); });
      socket.once("error", (err) => {
        if (this.socket) return;
        this.connecting = undefined;
        rej(new Error(`Cannot reach Pixelorama on ${this.host}:${this.port} (${err.message}). Is Pixelorama open with the Pixelorama MCP extension enabled?`));
      });
      socket.on("data", (chunk) => {
        this.buffer += chunk;
        let nl;
        while ((nl = this.buffer.indexOf("\n")) !== -1) {
          const line = this.buffer.slice(0, nl); this.buffer = this.buffer.slice(nl + 1);
          let msg; try { msg = JSON.parse(line); } catch { continue; }
          const p = msg.id === undefined ? undefined : this.pending.get(msg.id);
          if (!p) continue;
          this.pending.delete(msg.id); clearTimeout(p.timer);
          if (msg.error) p.rej(new Error(msg.error)); else p.res(msg.result);
        }
      });
      socket.on("close", () => {
        if (this.socket !== socket) return;
        this.socket = undefined; this.buffer = "";
        for (const { rej, timer } of this.pending.values()) { clearTimeout(timer); rej(new Error("Connection to Pixelorama closed")); }
        this.pending.clear();
      });
    });
    return this.connecting;
  }
}
const px = new Connection(HOST, PORT);

// ---------- tool definitions ----------
const int = (extra = {}) => ({ type: "integer", ...extra });
const frame = int({ minimum: 0, description: "Frame index, from 0. Defaults to the current frame" });
const layer = int({ minimum: 0, description: "Layer index, 0 is the bottom layer. Defaults to the current layer" });
const color = { type: "string", description: 'Color as #rgb, #rrggbb, #rrggbbaa, a name like "red", or "transparent"' };
const obj = (properties = {}, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });
const abs = (p) => (isAbsolute(p) ? p : resolve(p));
const text = (v) => ({ content: [{ type: "text", text: JSON.stringify(v, null, 2) }] });

const tools = [
  { name: "get_project", description: "Describe the project open in Pixelorama: size, frames, layers and the current cel.",
    inputSchema: obj(), run: async () => text(await px.request("get_project")) },
  { name: "new_project", description: "Create a new, empty project in a new tab and switch to it.",
    inputSchema: obj({ width: int({ minimum: 1, maximum: 4096 }), height: int({ minimum: 1, maximum: 4096 }), name: { type: "string" } }, ["width", "height"]),
    run: async (a) => text(await px.request("new_project", a)) },
  { name: "open_file", description: "Open a .pxo project or an image (png, jpg, webp, bmp, tga) in a new tab.",
    inputSchema: obj({ path: { type: "string", description: "Path to the file" } }, ["path"]),
    run: async (a) => text(await px.request("open_file", { path: abs(a.path) })) },
  { name: "draw_pixels",
    description: "Draw pixels from a character grid. Each string in rows is one row of pixels; each character is looked up " +
      "in palette. Characters that are not in the palette (such as '.') leave the pixel unchanged, so map a " +
      'character to "transparent" to erase. Example: palette {"o": "#e8a33d", "d": "#7a4a12"}, rows [".oo.", "oddo", ".oo."]. ' +
      "The whole call is one undo step in Pixelorama.",
    inputSchema: obj({
      rows: { type: "array", items: { type: "string" }, minItems: 1 },
      palette: { type: "object", additionalProperties: { type: "string" }, description: "Single character -> color" },
      x: int({ default: 0, description: "Left edge of the grid on the canvas" }),
      y: int({ default: 0, description: "Top edge of the grid on the canvas" }),
      frame, layer,
    }, ["rows", "palette"]),
    run: async (a) => {
      for (const k of Object.keys(a.palette ?? {})) if ([...k].length !== 1) throw new Error(`Palette key "${k}" must be a single character`);
      return text(await px.request("draw_pixels", { x: 0, y: 0, ...a }));
    } },
  { name: "fill_rect", description: "Fill a rectangle with one color. Leave out the position and size to fill the whole canvas.",
    inputSchema: obj({ color, x: int(), y: int(), width: int({ minimum: 1 }), height: int({ minimum: 1 }), frame, layer }, ["color"]),
    run: async (a) => text(await px.request("fill_rect", a)) },
  { name: "clear_cel", description: "Erase every pixel of one cel (a layer in a frame).",
    inputSchema: obj({ frame, layer }),
    run: async (a) => text(await px.request("fill_rect", { ...a, color: "transparent" })) },
  { name: "read_pixels",
    description: "Read pixels of one cel as a character grid with a palette, in the same format draw_pixels takes. '.' is transparent. At most 16384 pixels per call.",
    inputSchema: obj({ x: int({ minimum: 0 }), y: int({ minimum: 0 }), width: int({ minimum: 1 }), height: int({ minimum: 1 }), frame, layer }),
    run: async (a) => text(await px.request("read_pixels", a)) },
  { name: "get_image", description: "Show a frame with all visible layers blended, scaled up with nearest-neighbour so pixels stay sharp.",
    inputSchema: obj({ frame, scale: int({ minimum: 1, maximum: 64, description: "Zoom factor. Defaults to about 512 px on the long side" }) }),
    run: async (a) => { const img = await px.request("get_image", a); return { content: [{ type: "image", data: img.png, mimeType: "image/png" }] }; } },
  { name: "add_layer", description: "Add a pixel layer. By default it goes on top of all layers.",
    inputSchema: obj({ name: { type: "string" }, above: int({ minimum: 0, description: "Index of the layer to put the new one above" }) }),
    run: async (a) => text(await px.request("add_layer", a)) },
  { name: "add_frame", description: "Add an empty frame. By default it goes after the last frame.",
    inputSchema: obj({ after: int({ minimum: 0, description: "Index of the frame to insert after" }) }),
    run: async (a) => text(await px.request("add_frame", a)) },
  { name: "select_cel", description: "Make a frame/layer the current one in Pixelorama.",
    inputSchema: obj({ frame, layer }),
    run: async (a) => text(await px.request("select_cel", a)) },
  { name: "save_project", description: "Save the current project as a .pxo file. Without a path it saves to where it was last saved.",
    inputSchema: obj({ path: { type: "string", description: "Where to save, ending in .pxo" } }),
    run: async (a) => text(await px.request("save_project", a.path ? { path: abs(a.path) } : {})) },
  { name: "export_png",
    description: "Export the current frame, or all frames as a horizontal sprite sheet, to a PNG file. Layers are blended the same way Pixelorama shows them.",
    inputSchema: obj({ path: { type: "string", description: "Where to write the file, ending in .png" }, frame,
      all_frames: { type: "boolean", default: false }, scale: int({ minimum: 1, maximum: 64, default: 1 }) }, ["path"]),
    run: async ({ path, ...rest }) => text(await px.request("export_png", { all_frames: false, scale: 1, ...rest, path: abs(path) })) },
];
const byName = new Map(tools.map((t) => [t.name, t]));

// ---------- MCP over stdio (newline-delimited JSON-RPC 2.0) ----------
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
const reply = (id, result) => send({ id, result });
const fail = (id, code, message) => send({ id, error: { code, message } });

async function handle(msg) {
  const { id, method, params = {} } = msg;
  const isRequest = id !== undefined && id !== null;
  try {
    switch (method) {
      case "initialize":
        return reply(id, { protocolVersion: params.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: SERVER_INFO });
      case "ping":
        return reply(id, {});
      case "tools/list":
        return reply(id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
      case "tools/call": {
        const tool = byName.get(params.name);
        if (!tool) return fail(id, -32602, `Unknown tool: ${params.name}`);
        try { return reply(id, await tool.run(params.arguments ?? {})); }
        catch (e) { return reply(id, { content: [{ type: "text", text: String(e?.message ?? e) }], isError: true }); }
      }
      default:
        if (method?.startsWith("notifications/")) return;
        if (isRequest) return fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    if (isRequest) fail(id, -32603, String(e?.message ?? e));
  }
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
  let nl;
  while ((nl = input.indexOf("\n")) !== -1) {
    const line = input.slice(0, nl).trim(); input = input.slice(nl + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { fail(null, -32700, "Parse error"); continue; }
    if (Array.isArray(msg)) msg.forEach(handle); else handle(msg);
  }
});
const shutdown = () => { px.close(); process.exit(0); };
process.stdin.on("end", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
