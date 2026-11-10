// Quick check that Pixelorama + the Pixelorama MCP extension are reachable.
//   node tools/pixelorama-mcp/test-connection.mjs -> prints the open project
//   node tools/pixelorama-mcp/test-connection.mjs --draw -> also draws a 8x8 coin at (0,0)
import { createConnection } from "node:net";

const port = Number(process.env.PIXELORAMA_MCP_PORT ?? 7651);
const draw = process.argv.includes("--draw");
const calls = [{ id: 1, method: "get_project", params: {} }];
if (draw) calls.push({ id: 2, method: "draw_pixels", params: {
  palette: { o: "#5a3a12", y: "#f2c230", h: "#fff2a8" },
  rows: ["..oooo..", ".oyhyyo.", "oyhyyyyo", "oyyyyyyo", "oyyyyyyo", "oyyyyyyo", ".oyyyyo.", "..oooo.."],
  x: 0, y: 0 } });

const socket = createConnection({ host: "127.0.0.1", port });
socket.setEncoding("utf8");
socket.setTimeout(5000, () => { console.error("Timed out: Pixelorama answered nothing."); process.exit(1); });
socket.on("error", (e) => {
  console.error(`Cannot reach Pixelorama on 127.0.0.1:${port} (${e.message}).`);
  console.error("Open Pixelorama and enable Edit > Preferences > Extensions > Pixelorama MCP, then restart Pixelorama.");
  process.exit(1);
});
let buffer = "", left = calls.length;
socket.on("connect", () => { for (const c of calls) socket.write(JSON.stringify(c) + "\n"); });
socket.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const msg = JSON.parse(buffer.slice(0, nl)); buffer = buffer.slice(nl + 1);
    console.log(msg.error ? `ERROR (${msg.id}): ${msg.error}` : `OK (${msg.id}): ${JSON.stringify(msg.result)}`);
    if (--left === 0) { console.log(`Node ${process.version}: connection works.`); socket.end(); process.exit(0); }
  }
});
