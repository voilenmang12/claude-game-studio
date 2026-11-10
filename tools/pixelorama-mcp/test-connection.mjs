// Checks that Pixelorama is running with the PixMcpBridge extension, and that the MCP server starts.
//   node tools/pixelorama-mcp/test-connection.mjs          bridge health + the server's tool list
//   node tools/pixelorama-mcp/test-connection.mjs --draw   also draws an 8x8 coin on a new 8x8 canvas
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BRIDGE = process.env.PIX_MCP_BRIDGE_URL || "http://127.0.0.1:7373";
const draw = process.argv.includes("--draw");

let health;
try {
  health = await (await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(3000) })).json();
} catch (e) {
  console.error(`Cannot reach the Pixelorama bridge at ${BRIDGE} (${e.message}).`);
  console.error("Open Pixelorama; in Edit > Preferences > Extensions, PixMcpBridge must be installed and enabled.");
  process.exit(1);
}
console.log(`bridge: ${JSON.stringify(health)}`);

const child = spawn(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "pixelorama-mcp.mjs")], {
  stdio: ["pipe", "pipe", "inherit"],
});
let buffer = "", nextId = 1;
const waiting = new Map();
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    waiting.get(msg.id)?.(msg); waiting.delete(msg.id);
  }
});
child.on("exit", (code) => { if (code) { console.error(`MCP server exited with code ${code}`); process.exit(1); } });
const rpc = (method, params) => new Promise((ok, fail) => {
  const id = nextId++;
  const timer = setTimeout(() => fail(new Error(`${method}: no answer`)), 15000);
  waiting.set(id, (m) => { clearTimeout(timer); m.error ? fail(new Error(m.error.message)) : ok(m.result); });
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});

try {
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test-connection", version: "1" } });
  const { tools } = await rpc("tools/list", {});
  console.log(`server: ${tools.length} tools`);
  if (draw) {
    const rows = ["..oooo..", ".oyhyyo.", "oyhyyyyo", "oyyyyyyo", "oyyyyyyo", "oyyyyyyo", ".oyyyyo.", "..oooo.."];
    const palette = { o: "#5a3a12", y: "#f2c230", h: "#fff2a8" };
    const data = rows.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "." ? [] : [x, y, palette[ch]])));
    for (const [name, args] of [
      ["create_canvas", { width: 8, height: 8, name: "coin", fill_color: "transparent" }],
      ["draw_pixels_fast", { data }],
    ]) {
      const r = await rpc("tools/call", { name, arguments: args });
      const text = r.content?.[0]?.text ?? "";
      if (r.isError || text.startsWith("❌")) throw new Error(`${name}: ${text}`);
      console.log(`${name}: ${text.split("\n")[0]}`);
    }
  }
  console.log(`Node ${process.version}: connection works.`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  child.kill();
}
